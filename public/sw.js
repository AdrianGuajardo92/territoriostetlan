// Service Worker OFFLINE-FIRST CON ACTUALIZACIONES INTELIGENTES - Territorios LS v1.0.3
const VERSION = 'v1.0.3';
const DYNAMIC_CACHE = `dynamic-${VERSION}`;
const STATIC_CACHE = `static-${VERSION}`;

// Archivos críticos que siempre deben estar en cache
const CRITICAL_FILES = [
  '/',
  '/index.html',
  '/version.json',
  '/manifest.json'
];

// 1️⃣ INSTALACIÓN: Cache de archivos críticos
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then(cache => {
        return cache.addAll(CRITICAL_FILES);
      })
      .then(() => {
        self.skipWaiting(); // Activarse inmediatamente
      })
      .catch(error => {
        console.log('SW: Error en instalación:', error);
      })
  );
});

// 2️⃣ ACTIVACIÓN: Limpiar caches antiguos y tomar control
self.addEventListener('activate', event => {
  event.waitUntil(
    Promise.all([
      // Tomar control de todos los clientes
      self.clients.claim(),
      // Eliminar caches de versiones anteriores
      caches.keys().then(cacheNames => {
        return Promise.all(
          cacheNames
            .filter(name => !name.includes(VERSION))
            .map(name => {
              console.log('SW: Eliminando cache antiguo:', name);
              return caches.delete(name);
            })
        );
      })
    ]).then(() => {
      // Notificar a los clientes sobre la nueva versión
      self.clients.matchAll().then(clients => {
        clients.forEach(client => client.postMessage({ 
          type: 'SW_ACTIVATED', 
          version: VERSION,
          timestamp: Date.now()
        }));
      });
    }).catch(error => {
      console.log('SW: Error en activación:', error);
    })
  );
});

// 3️⃣ FETCH: Estrategia inteligente según el tipo de recurso
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // Ignorar peticiones problemáticas
  if (url.protocol.startsWith('chrome-extension') || 
      url.href.includes('firestore') || 
      url.href.includes('firebase') ||
      request.method !== 'GET') {
    return;
  }

  // Estrategia especial para version.json - siempre ir a la red
  if (url.pathname === '/version.json') {
    event.respondWith(
      fetch(request)
        .then(response => {
          // Cache la respuesta por 1 minuto
          const responseClone = response.clone();
          caches.open(DYNAMIC_CACHE).then(cache => {
            cache.put(request, responseClone);
          });
          return response;
        })
        .catch(() => {
          // Si falla la red, intentar cache
          return caches.match(request);
        })
    );
    return;
  }

  // Para archivos críticos: Cache First
  if (CRITICAL_FILES.includes(url.pathname)) {
    event.respondWith(
      caches.match(request)
        .then(cachedResponse => {
          if (cachedResponse) {
            // Verificar si hay actualización en background
            fetch(request).then(networkResponse => {
              if (networkResponse.ok) {
                const responseClone = networkResponse.clone();
                caches.open(STATIC_CACHE).then(cache => {
                  cache.put(request, responseClone);
                });
              }
            });
            return cachedResponse;
          }
          return fetch(request);
        })
    );
    return;
  }

  // Para otros recursos: Network First con fallback a cache
  event.respondWith(
    fetch(request)
      .then(networkResponse => {
        if (networkResponse.ok) {
          const responseClone = networkResponse.clone();
          caches.open(DYNAMIC_CACHE).then(cache => {
            cache.put(request, responseClone);
          });
        }
        return networkResponse;
      })
      .catch(() => {
        return caches.match(request).then(cachedResponse => {
          if (cachedResponse) {
            return cachedResponse;
          }
          
          // Página offline para navegación
          if (request.destination === 'document') {
            return new Response(`
              <!DOCTYPE html>
              <html>
              <head>
                <title>Sin conexión - Territorios LS</title>
                <meta charset="utf-8">
                <meta name="viewport" content="width=device-width, initial-scale=1">
                <style>
                  body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
                  .offline { color: #666; }
                </style>
              </head>
              <body>
                <div class="offline">
                  <h1>📱 Territorios LS</h1>
                  <h2>Sin conexión a internet</h2>
                  <p>La aplicación funcionará cuando recuperes la conexión.</p>
                  <button onclick="window.location.reload()">Reintentar</button>
                </div>
              </body>
              </html>
            `, {
              headers: { 'Content-Type': 'text/html' }
            });
          }
          return new Response('Sin conexión', { status: 503 });
        });
      })
  );
});

// 4️⃣ COMUNICACIÓN: Mensajes desde la app
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'GET_VERSION') {
    event.ports[0].postMessage({ version: VERSION });
  }
});

// 5️⃣ MANEJO DE ERRORES
self.addEventListener('error', event => {
  // Error silencioso en producción
});

self.addEventListener('unhandledrejection', event => {
  // Promise rechazada silenciosa en producción
  event.preventDefault();
});