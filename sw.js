// Service Worker Agresivo para Gestor de Territorios LS
// La versión se actualizará dinámicamente basándose en version.json
let CACHE_NAME = 'territorio-ls-v2.7.2';
let RUNTIME_CACHE = 'territorio-runtime-v2.7.2';

// Función para actualizar la versión del cache
async function updateCacheVersion() {
  try {
    const response = await fetch('/version.json');
    if (response.ok) {
      const data = await response.json();
      CACHE_NAME = `territorio-ls-v${data.version}`;
      RUNTIME_CACHE = `territorio-runtime-v${data.version}`;
      console.log('[SW] Versión del cache actualizada a:', data.version);
    }
  } catch (error) {
    console.log('[SW] Error obteniendo versión:', error);
  }
}

// Recursos críticos que SIEMPRE deben estar en cache
const CRITICAL_RESOURCES = [
  '/',
  '/index.html',
  '/manifest.json',
  '/offline.html' // Crear esta página como fallback
];

// Archivos que NUNCA deben cachearse
const NEVER_CACHE = [
  '/version.json',
  'version.json'
];

// URLs externas importantes para cachear (solo las que funcionan con CORS)
const EXTERNAL_RESOURCES = [
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
  'https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&display=swap',
  'https://rsms.me/inter/inter.css',
  // Recursos de Leaflet para mapas
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
];

// Instalación: Cachear todo agresivamente
self.addEventListener('install', event => {
  console.log('[SW] Instalando Service Worker Agresivo...');
  
  event.waitUntil(
    updateCacheVersion()
      .then(() => caches.open(CACHE_NAME))
      .then(cache => {
        // Cachear recursos críticos
        console.log('[SW] Cacheando recursos críticos...');
        const criticalPromises = CRITICAL_RESOURCES.map(url => 
          cache.add(url).catch(err => console.log(`[SW] Error cacheando ${url}:`, err))
        );
        
        // Cachear recursos externos
        console.log('[SW] Cacheando recursos externos...');
        const externalPromises = EXTERNAL_RESOURCES.map(url =>
          fetch(url, { mode: 'cors' })
            .then(response => {
              if (response.ok) {
                return cache.put(url, response);
              }
            })
            .catch(err => console.log(`[SW] Error cacheando recurso externo ${url}:`, err))
        );
        
        return Promise.all([...criticalPromises, ...externalPromises]);
      })
      .then(() => {
        console.log('[SW] Instalación completa, activando inmediatamente...');
        return self.skipWaiting(); // Activar inmediatamente
      })
  );
});

// Activación: Limpiar caches antiguos
self.addEventListener('activate', event => {
  console.log('[SW] Activando Service Worker...');
  
  event.waitUntil(
    caches.keys()
      .then(cacheNames => {
        return Promise.all(
          cacheNames
            .filter(cacheName => cacheName !== CACHE_NAME && cacheName !== RUNTIME_CACHE)
            .map(cacheName => {
              console.log('[SW] Eliminando cache antiguo:', cacheName);
              return caches.delete(cacheName);
            })
        );
      })
      .then(() => {
        console.log('[SW] Service Worker activado, tomando control...');
        return self.clients.claim(); // Tomar control inmediatamente
      })
  );
});

// Estrategia de Fetch: Cache First con fallback agresivo
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Ignorar extensiones del navegador y otras URLs no relevantes
  if (url.protocol === 'chrome-extension:' || url.hostname === 'localhost' && url.port === '3000') {
    return;
  }
  
  // IMPORTANTE: Nunca cachear version.json
  if (NEVER_CACHE.some(path => request.url.includes(path))) {
    console.log('[SW] Bypassing cache for:', request.url);
    event.respondWith(
      fetch(request, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      }).catch(error => {
        console.error('[SW] Error fetching version.json:', error);
        return new Response(JSON.stringify({
          version: "0.0.0",
          error: "No se pudo verificar actualizaciones"
        }), {
          headers: { 'Content-Type': 'application/json' }
        });
      })
    );
    return;
  }
  
  // Para peticiones GET
  if (request.method === 'GET') {
    event.respondWith(
      caches.match(request)
        .then(cachedResponse => {
          if (cachedResponse) {
            console.log('[SW] Sirviendo desde cache:', request.url);
            
            // Actualizar el cache en background para recursos externos
            if (EXTERNAL_RESOURCES.includes(request.url) || request.url.includes('firebaseapp.com')) {
              fetchAndCache(request);
            }
            
            return cachedResponse;
          }
          
          console.log('[SW] No está en cache, buscando en red:', request.url);
          
          // Si no está en cache, buscar en la red
          return fetch(request)
            .then(response => {
              // Solo cachear respuestas exitosas
              if (!response || response.status !== 200 || response.type !== 'basic') {
                // Para recursos externos importantes, intentar cachear aunque no sea 'basic'
                if (EXTERNAL_RESOURCES.includes(request.url) && response.status === 200) {
                  const responseToCache = response.clone();
                  caches.open(RUNTIME_CACHE).then(cache => {
                    cache.put(request, responseToCache);
                  });
                }
                return response;
              }
              
              // Cachear la respuesta
              const responseToCache = response.clone();
              caches.open(RUNTIME_CACHE)
                .then(cache => {
                  cache.put(request, responseToCache);
                  console.log('[SW] Recurso cacheado:', request.url);
                });
              
              return response;
            })
            .catch(error => {
              console.error('[SW] Error al buscar en red:', error);
              
              // Si falla la red, buscar cualquier versión en cache
              return caches.match(request, { ignoreSearch: true })
                .then(cachedResponse => {
                  if (cachedResponse) {
                    console.log('[SW] Sirviendo versión alternativa desde cache');
                    return cachedResponse;
                  }
                  
                  // Si es una navegación, mostrar página offline
                  if (request.mode === 'navigate') {
                    return caches.match('/offline.html')
                      .then(response => response || createOfflineResponse());
                  }
                  
                  // Para otros recursos, devolver respuesta de error
                  return createErrorResponse();
                });
            });
        })
    );
  }
});

// Función auxiliar para actualizar cache en background
function fetchAndCache(request) {
  fetch(request)
    .then(response => {
      if (response && response.status === 200) {
        const responseToCache = response.clone();
        caches.open(RUNTIME_CACHE).then(cache => {
          cache.put(request, responseToCache);
          console.log('[SW] Actualizado en background:', request.url);
        });
      }
    })
    .catch(err => console.log('[SW] Error actualizando en background:', err));
}

// Crear respuesta offline de emergencia
function createOfflineResponse() {
  const html = `
    <!DOCTYPE html>
    <html lang="es">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Sin Conexión - Gestor de Territorios</title>
        <style>
            body {
                font-family: -apple-system, sans-serif;
                display: flex;
                align-items: center;
                justify-content: center;
                height: 100vh;
                margin: 0;
                background: #f3f4f6;
            }
            .container {
                text-align: center;
                padding: 2rem;
            }
            .icon {
                width: 80px;
                height: 80px;
                margin: 0 auto 1rem;
                background: #e5e7eb;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
            }
            h1 {
                color: #374151;
                margin: 0 0 0.5rem;
            }
            p {
                color: #6b7280;
                margin: 0 0 2rem;
            }
            button {
                background: #4f46e5;
                color: white;
                border: none;
                padding: 0.75rem 2rem;
                border-radius: 0.5rem;
                font-size: 1rem;
                cursor: pointer;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="icon">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#6b7280" stroke-width="2">
                    <path d="M22.61 16.95A5 5 0 0 0 18 10h-1.26a8 8 0 0 0-7.05-6M5 5a8 8 0 0 0 4 15h9a5 5 0 0 0 1.7-.3"/>
                    <line x1="1" y1="1" x2="23" y2="23"/>
                </svg>
            </div>
            <h1>Sin Conexión</h1>
            <p>No se puede cargar la aplicación sin conexión a internet.</p>
            <button onclick="location.reload()">Reintentar</button>
        </div>
    </body>
    </html>
  `;
  
  return new Response(html, {
    headers: { 'Content-Type': 'text/html' }
  });
}

// Crear respuesta de error genérica
function createErrorResponse() {
  return new Response('Error de red', {
    status: 503,
    statusText: 'Service Unavailable'
  });
}

// Manejar mensajes del cliente
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    console.log('[SW] Recibido mensaje SKIP_WAITING');
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'CLEAR_CACHE') {
    console.log('[SW] Limpiando todo el cache...');
    caches.keys().then(cacheNames => {
      Promise.all(cacheNames.map(cacheName => caches.delete(cacheName)))
        .then(() => {
          console.log('[SW] Cache limpiado completamente');
          event.ports[0].postMessage({ success: true });
        });
    });
  }
});

console.log('[SW] Service Worker Agresivo cargado');