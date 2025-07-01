// Service Worker Ultra-Simplificado para Móviles - Territorios LS
const CACHE_NAME = 'territorio-ls-v2.15.5-ultra-simple';
const RUNTIME_CACHE = 'territorio-runtime-v2.15.5-ultra-simple';

// Solo recursos básicos que sabemos que existen
const CRITICAL_RESOURCES = [
  '/',
  '/index.html'
];

// Recursos que nunca deben cachearse
const NEVER_CACHE = [
  '/version.json',
  'version.json'
];

// Instalación ultra-simple y tolerante a errores
self.addEventListener('install', event => {
  console.log('[SW Ultra-Simple] Instalando...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[SW Ultra-Simple] Intentando cachear recursos básicos...');
        // Cachear cada recurso individualmente para evitar que uno falle todos
        const cachePromises = CRITICAL_RESOURCES.map(url => 
          cache.add(new Request(url, { cache: 'reload' }))
            .catch(error => {
              console.log(`[SW Ultra-Simple] No se pudo cachear ${url}:`, error);
              // No fallar si un recurso no se puede cachear
              return Promise.resolve();
            })
        );
        
        return Promise.all(cachePromises);
      })
      .then(() => {
        console.log('[SW Ultra-Simple] Instalación completa');
        return self.skipWaiting();
      })
      .catch(error => {
        console.log('[SW Ultra-Simple] Error en instalación (continuando):', error);
        // Continuar aunque haya errores
        return self.skipWaiting();
      })
  );
});

// Activación simple
self.addEventListener('activate', event => {
  console.log('[SW Ultra-Simple] Activando...');
  
  event.waitUntil(
    caches.keys()
      .then(cacheNames => {
        const deletePromises = cacheNames
          .filter(cacheName => {
            return cacheName !== CACHE_NAME && 
                   cacheName !== RUNTIME_CACHE &&
                   cacheName.includes('territorio-ls');
          })
          .map(cacheName => {
            console.log('[SW Ultra-Simple] Eliminando cache antiguo:', cacheName);
            return caches.delete(cacheName).catch(() => {
              // Ignorar errores al eliminar cache
              console.log('[SW Ultra-Simple] No se pudo eliminar cache:', cacheName);
            });
          });
        
        return Promise.all(deletePromises);
      })
      .then(() => {
        console.log('[SW Ultra-Simple] Activado y tomando control');
        return self.clients.claim();
      })
      .catch(error => {
        console.log('[SW Ultra-Simple] Error en activación (continuando):', error);
        return self.clients.claim();
      })
  );
});

// Estrategia de fetch ultra-simplificada
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Ignorar extensiones y URLs irrelevantes
  if (url.protocol === 'chrome-extension:' || 
      url.hostname === 'localhost' ||
      request.method !== 'GET') {
    return;
  }
  
  // Nunca cachear version.json y similar
  if (NEVER_CACHE.some(path => request.url.includes(path))) {
    event.respondWith(
      fetch(request, { cache: 'no-store' })
        .catch(() => new Response('{"version":"0.0.0"}', {
          headers: { 'Content-Type': 'application/json' }
        }))
    );
    return;
  }
  
  // Para recursos de la app, estrategia network-first simple
  if (url.origin === location.origin) {
    event.respondWith(
      fetch(request)
        .then(response => {
          // Si la respuesta es exitosa, intentar cachear (pero no fallar si no se puede)
          if (response && response.status === 200) {
            const responseToCache = response.clone();
            caches.open(RUNTIME_CACHE)
              .then(cache => cache.put(request, responseToCache))
              .catch(() => {
                // Ignorar errores de cache
                console.log('[SW Ultra-Simple] No se pudo cachear:', request.url);
              });
          }
          return response;
        })
        .catch(() => {
          // Si falla la red, intentar buscar en cache
          return caches.match(request)
            .then(cachedResponse => {
              if (cachedResponse) {
                console.log('[SW Ultra-Simple] Sirviendo desde cache:', request.url);
                return cachedResponse;
              }
              
              // Si es navegación y no hay cache, servir index
              if (request.mode === 'navigate') {
                return caches.match('/index.html')
                  .then(indexResponse => indexResponse || new Response('App no disponible offline', { status: 503 }));
              }
              
              return new Response('Recurso no disponible', { status: 503 });
            });
        })
    );
  }
});

// Manejar mensajes básicos
self.addEventListener('message', event => {
  if (event.data?.type === 'SKIP_WAITING') {
    console.log('[SW Ultra-Simple] Recibido SKIP_WAITING');
    self.skipWaiting();
  }
  
  if (event.data?.type === 'CLEAR_CACHE') {
    console.log('[SW Ultra-Simple] Limpiando cache...');
    caches.keys()
      .then(cacheNames => {
        const deletePromises = cacheNames.map(cacheName => 
          caches.delete(cacheName).catch(() => {
            console.log('[SW Ultra-Simple] No se pudo eliminar:', cacheName);
          })
        );
        return Promise.all(deletePromises);
      })
      .then(() => {
        event.ports[0]?.postMessage({ success: true });
      })
      .catch(() => {
        event.ports[0]?.postMessage({ success: false });
      });
  }
});

console.log('[SW Ultra-Simple] Service Worker ultra-simplificado cargado');