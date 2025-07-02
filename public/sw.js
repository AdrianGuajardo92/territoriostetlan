// Service Worker OFFLINE-FIRST SIN WARNINGS - Territorios LS v2.25.14
const VERSION = 'v2.25.14';
const DYNAMIC_CACHE = `dynamic-${VERSION}`;

console.log(`🚀 Service Worker ${VERSION} iniciando...`);

// 1️⃣ INSTALACIÓN: Simple y sin errores
self.addEventListener('install', event => {
  console.log(`🔧 SW ${VERSION}: Instalando...`);
  console.log(`✅ SW ${VERSION}: Instalación completada - Sin pre-cache`);
  self.skipWaiting(); // Activarse inmediatamente
});

// 2️⃣ ACTIVACIÓN: Limpiar caches antiguos y tomar control
self.addEventListener('activate', event => {
  console.log(`🎯 SW ${VERSION}: Activando...`);
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
              console.log(`🗑️ SW ${VERSION}: Eliminando cache antiguo: ${name}`);
              return caches.delete(name);
            })
        );
      })
    ]).then(() => {
      console.log(`✅ SW ${VERSION}: ¡Activado y controlando!`);
      // Notificar a los clientes
      self.clients.matchAll().then(clients => {
        clients.forEach(client => client.postMessage({ 
          type: 'SW_ACTIVATED', 
          version: VERSION 
        }));
      });
    }).catch(error => {
      console.error(`❌ SW ${VERSION}: Error en activación:`, error);
    })
  );
});

// 3️⃣ FETCH: Cache dinámico - Cache First para offline
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

  // Estrategia: Cache First con fallback a red
  event.respondWith(
    caches.match(request)
      .then(cachedResponse => {
        // Si está en cache, devolverlo inmediatamente
        if (cachedResponse) {
          return cachedResponse;
        }

        // Si no está en cache, ir a la red
        return fetch(request)
          .then(networkResponse => {
            // Si la respuesta es válida, guardarla en cache
            if (networkResponse.ok) {
              const responseClone = networkResponse.clone();
              caches.open(DYNAMIC_CACHE).then(cache => {
                cache.put(request, responseClone);
              });
            }
            return networkResponse;
          })
          .catch(() => {
            // Si falla la red y es una navegación, mostrar página offline
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
            // Para otros recursos, devolver error
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
  console.error('❌ SW: Error global:', event.error);
});

self.addEventListener('unhandledrejection', event => {
  console.error('❌ SW: Promise rechazada:', event.reason);
  event.preventDefault();
});

console.log(`✅ Service Worker ${VERSION} cargado - LIMPIO Y SIN WARNINGS`);