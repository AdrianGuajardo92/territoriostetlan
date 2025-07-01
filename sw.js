// Service Worker Agresivo para Gestor de Territorios LS con Auto-Update
// La versión se actualizará dinámicamente basándose en version.json
let CACHE_NAME = 'territorio-ls-v2.14.0';
let RUNTIME_CACHE = 'territorio-runtime-v2.14.0';
let CURRENT_VERSION = '2.14.0';

// Función para actualizar la versión del cache con detección de cambios
async function updateCacheVersion() {
  try {
    const response = await fetch('/version.json?t=' + Date.now(), {
      cache: 'no-store',
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache'
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      const newVersion = data.version;
      
      // Detectar si hay nueva versión
      if (CURRENT_VERSION !== newVersion) {
        console.log('[SW] 🎉 Nueva versión detectada:', CURRENT_VERSION, '→', newVersion);
        
        // Actualizar variables globales
        const oldCacheName = CACHE_NAME;
        const oldRuntimeCache = RUNTIME_CACHE;
        
        CURRENT_VERSION = newVersion;
        CACHE_NAME = `territorio-ls-v${newVersion}`;
        RUNTIME_CACHE = `territorio-runtime-v${newVersion}`;
        
        // Limpiar caches antiguos inmediatamente
        await cleanOldCaches([oldCacheName, oldRuntimeCache]);
        
        // Notificar a todos los clientes sobre la actualización
        await notifyClientsOfUpdate(newVersion);
        
        console.log('[SW] ✅ Actualización completada a versión:', newVersion);
        return true; // Indica que hubo actualización
      } else {
        console.log('[SW] Versión actual:', CURRENT_VERSION);
        return false; // No hubo cambios
      }
    }
  } catch (error) {
    console.log('[SW] Error obteniendo versión:', error);
    return false;
  }
}

// Función para limpiar caches antiguos
async function cleanOldCaches(excludeCaches = []) {
  try {
    const cacheNames = await caches.keys();
    const currentCaches = [CACHE_NAME, RUNTIME_CACHE];
    
    const cachesToDelete = cacheNames.filter(cacheName => 
      !currentCaches.includes(cacheName) && !excludeCaches.includes(cacheName)
    );
    
    await Promise.all(
      cachesToDelete.map(cacheName => {
        console.log('[SW] 🗑️ Eliminando cache antiguo:', cacheName);
        return caches.delete(cacheName);
      })
    );
    
    console.log('[SW] ✅ Limpieza de cache completada');
  } catch (error) {
    console.error('[SW] Error limpiando caches:', error);
  }
}

// Función para notificar clientes sobre actualización
async function notifyClientsOfUpdate(newVersion) {
  try {
    const clients = await self.clients.matchAll({ includeUncontrolled: true });
    
    clients.forEach(client => {
      client.postMessage({
        type: 'UPDATE_AVAILABLE',
        version: newVersion,
        timestamp: Date.now()
      });
    });
    
    console.log('[SW] 📢 Notificados', clients.length, 'clientes sobre actualización');
  } catch (error) {
    console.error('[SW] Error notificando clientes:', error);
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

// Verificación periódica de actualizaciones (cada 5 minutos)
function startPeriodicUpdateCheck() {
  setInterval(async () => {
    console.log('[SW] 🔍 Verificando actualizaciones...');
    const hasUpdate = await updateCacheVersion();
    
    if (hasUpdate) {
      // Si hay actualización, también triggear una limpieza extra
      await cleanOldCaches();
    }
  }, 5 * 60 * 1000); // 5 minutos
}

// Verificación al activar el SW
self.addEventListener('activate', event => {
  console.log('[SW] Activando Service Worker...');
  
  event.waitUntil(
    Promise.all([
      // Actualizar versión al activar
      updateCacheVersion(),
      // Limpiar caches antiguos
      caches.keys().then(cacheNames => {
        return Promise.all(
          cacheNames
            .filter(cacheName => cacheName !== CACHE_NAME && cacheName !== RUNTIME_CACHE)
            .map(cacheName => {
              console.log('[SW] Eliminando cache antiguo:', cacheName);
              return caches.delete(cacheName);
            })
        );
      })
    ]).then(() => {
      console.log('[SW] Service Worker activado, tomando control...');
      // Iniciar verificación periódica
      startPeriodicUpdateCheck();
      return self.clients.claim(); // Tomar control inmediatamente
    })
  );
});

// Manejar mensajes del cliente con nuevas funcionalidades
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    console.log('[SW] Recibido mensaje SKIP_WAITING');
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'CHECK_UPDATE') {
    console.log('[SW] 🔍 Verificación manual de actualización solicitada');
    updateCacheVersion().then(hasUpdate => {
      event.ports[0]?.postMessage({ 
        hasUpdate, 
        currentVersion: CURRENT_VERSION 
      });
    });
  }
  
  if (event.data && event.data.type === 'FORCE_UPDATE') {
    console.log('[SW] 🔄 Recarga forzada solicitada');
    // Limpiar TODO el cache
    caches.keys().then(cacheNames => {
      Promise.all(cacheNames.map(cacheName => caches.delete(cacheName)))
        .then(() => {
          console.log('[SW] Cache limpiado para recarga forzada');
          event.ports[0]?.postMessage({ success: true });
          
          // Notificar a todos los clientes para que se recarguen
          self.clients.matchAll().then(clients => {
            clients.forEach(client => {
              client.postMessage({
                type: 'FORCE_RELOAD',
                timestamp: Date.now()
              });
            });
          });
        });
    });
  }
  
  if (event.data && event.data.type === 'CLEAR_CACHE') {
    console.log('[SW] Limpiando todo el cache...');
    caches.keys().then(cacheNames => {
      Promise.all(cacheNames.map(cacheName => caches.delete(cacheName)))
        .then(() => {
          console.log('[SW] Cache limpiado completamente');
          event.ports[0]?.postMessage({ success: true });
        });
    });
  }
});

console.log('[SW] Service Worker Agresivo cargado');