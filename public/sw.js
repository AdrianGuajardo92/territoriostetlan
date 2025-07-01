// Service Worker Simplificado para Móviles - Territorios LS
const CACHE_NAME = 'territorio-ls-v2.15.3-simple';
const RUNTIME_CACHE = 'territorio-runtime-v2.15.3-simple';

// Recursos críticos básicos
const CRITICAL_RESOURCES = [
  '/',
  '/index.html',
  '/manifest.json'
];

// Recursos que nunca deben cachearse
const NEVER_CACHE = [
  '/version.json',
  'version.json'
];

// Instalación simple
self.addEventListener('install', event => {
  console.log('[SW Simple] Instalando...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[SW Simple] Cacheando recursos críticos...');
        return cache.addAll(CRITICAL_RESOURCES.map(url => 
          new Request(url, { cache: 'reload' })
        ));
      })
      .then(() => {
        console.log('[SW Simple] Instalación completa');
        return self.skipWaiting();
      })
      .catch(error => {
        console.error('[SW Simple] Error en instalación:', error);
      })
  );
});

// Activación simple
self.addEventListener('activate', event => {
  console.log('[SW Simple] Activando...');
  
  event.waitUntil(
    caches.keys()
      .then(cacheNames => {
        return Promise.all(
          cacheNames
            .filter(cacheName => {
              return cacheName !== CACHE_NAME && 
                     cacheName !== RUNTIME_CACHE &&
                     cacheName.includes('territorio-ls');
            })
            .map(cacheName => {
              console.log('[SW Simple] Eliminando cache antiguo:', cacheName);
              return caches.delete(cacheName);
            })
        );
      })
      .then(() => {
        console.log('[SW Simple] Activado y tomando control');
        return self.clients.claim();
      })
  );
});

// Estrategia de fetch simplificada
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
  
  // Estrategia cache-first simple para recursos de la app
  if (url.origin === location.origin) {
    event.respondWith(
      caches.match(request)
        .then(cachedResponse => {
          if (cachedResponse) {
            return cachedResponse;
          }
          
          return fetch(request)
            .then(response => {
              if (response.status === 200) {
                const responseToCache = response.clone();
                caches.open(RUNTIME_CACHE)
                  .then(cache => cache.put(request, responseToCache));
              }
              return response;
            })
            .catch(() => {
              // Fallback para navegación
              if (request.mode === 'navigate') {
                return caches.match('/index.html');
              }
              return new Response('Network error', { status: 503 });
            });
        })
    );
  }
});

// Manejar mensajes básicos
self.addEventListener('message', event => {
  if (event.data?.type === 'SKIP_WAITING') {
    console.log('[SW Simple] Recibido SKIP_WAITING');
    self.skipWaiting();
  }
  
  if (event.data?.type === 'CLEAR_CACHE') {
    console.log('[SW Simple] Limpiando cache...');
    caches.keys().then(cacheNames => {
      Promise.all(cacheNames.map(cacheName => caches.delete(cacheName)))
        .then(() => {
          event.ports[0]?.postMessage({ success: true });
        });
    });
  }
});

console.log('[SW Simple] Service Worker simplificado cargado');