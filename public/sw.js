// Service Worker Ultra-Simplificado para Móviles - Territorios LS
const CACHE_NAME = 'territorios-tetlan-v2.25.0';
const STATIC_CACHE = 'static-v2.25.0';
const DYNAMIC_CACHE = 'dynamic-v2.25.0';

// Archivos estáticos para cachear
const STATIC_FILES = [
  '/',
  '/index.html',
  '/manifest.json',
  '/version.json',
  '/offline.html'
];

// URLs que NO deben ser cacheadas
const EXCLUDED_URLS = [
  '/api/',
  'chrome-extension://',
  'moz-extension://',
  'firebase',
  'firestore'
];

// 🚀 INSTALACIÓN DEL SERVICE WORKER
self.addEventListener('install', (event) => {
  console.log('🔧 Service Worker: Instalando...');
  
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then(cache => {
        console.log('📦 Service Worker: Cacheando archivos estáticos');
        return cache.addAll(STATIC_FILES);
      })
      .then(() => {
        console.log('✅ Service Worker: Instalación completada');
        return self.skipWaiting();
      })
      .catch(error => {
        console.error('❌ Service Worker: Error en instalación:', error);
      })
  );
});

// 🔄 ACTIVACIÓN DEL SERVICE WORKER
self.addEventListener('activate', (event) => {
  console.log('🎯 Service Worker: Activando...');
  
  event.waitUntil(
    Promise.all([
      // Limpiar caches antiguos
      caches.keys().then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => {
            if (cacheName !== STATIC_CACHE && cacheName !== DYNAMIC_CACHE) {
              console.log('🗑️ Service Worker: Eliminando cache antiguo:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      }),
      // Tomar control de todas las páginas
      self.clients.claim()
    ]).then(() => {
      console.log('✅ Service Worker: Activación completada');
    })
  );
});

// 📡 INTERCEPTAR PETICIONES DE RED
self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);
  
  // Ignorar URLs excluidas
  if (EXCLUDED_URLS.some(excluded => request.url.includes(excluded))) {
    return;
  }
  
  // Ignorar peticiones que no sean GET
  if (request.method !== 'GET') {
    return;
  }
  
  event.respondWith(
    handleFetchRequest(request)
  );
});

// 🎯 MANEJAR PETICIONES
async function handleFetchRequest(request) {
  const url = new URL(request.url);
  
  try {
    // Para archivos estáticos: Cache First
    if (STATIC_FILES.some(file => url.pathname === file || url.pathname.endsWith(file))) {
      return await cacheFirst(request);
    }
    
    // Para version.json: Network First (siempre actualizado)
    if (url.pathname.includes('version.json')) {
      return await networkFirst(request);
    }
    
    // Para otros recursos: Network First con fallback
    return await networkFirst(request);
    
  } catch (error) {
    console.error('❌ Service Worker: Error en fetch:', error);
    
    // Fallback a página offline si es una navegación
    if (request.destination === 'document') {
      return caches.match('/offline.html');
    }
    
    // Para otros recursos, devolver respuesta vacía
    return new Response('', { status: 408, statusText: 'Request Timeout' });
  }
}

// 📦 ESTRATEGIA CACHE FIRST
async function cacheFirst(request) {
  const cachedResponse = await caches.match(request);
  
  if (cachedResponse) {
    return cachedResponse;
  }
  
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      const cache = await caches.open(STATIC_CACHE);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    throw error;
  }
}

// 🌐 ESTRATEGIA NETWORK FIRST
async function networkFirst(request) {
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    const cachedResponse = await caches.match(request);
    
    if (cachedResponse) {
      return cachedResponse;
    }
    
    throw error;
  }
}

// 💬 MENSAJES DESDE LA APLICACIÓN
self.addEventListener('message', (event) => {
  const { type, payload } = event.data;
  
  switch (type) {
    case 'SKIP_WAITING':
      self.skipWaiting();
      break;
      
    case 'GET_VERSION':
      event.ports[0].postMessage({
        version: CACHE_NAME,
        status: 'active'
      });
      break;
      
    case 'CLEAR_CACHE':
      clearAllCaches().then(() => {
        event.ports[0].postMessage({ success: true });
      });
      break;
      
    case 'UPDATE_CACHE':
      updateCache().then(() => {
        event.ports[0].postMessage({ success: true });
      });
      break;
  }
});

// 🗑️ LIMPIAR TODOS LOS CACHES
async function clearAllCaches() {
  const cacheNames = await caches.keys();
  await Promise.all(
    cacheNames.map(cacheName => caches.delete(cacheName))
  );
  console.log('🧹 Service Worker: Todos los caches eliminados');
}

// 🔄 ACTUALIZAR CACHE
async function updateCache() {
  const cache = await caches.open(STATIC_CACHE);
  await cache.addAll(STATIC_FILES);
  console.log('🔄 Service Worker: Cache actualizado');
}

// 📊 NOTIFICACIÓN DE ACTUALIZACIÓN
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'CHECK_UPDATE') {
    // Verificar si hay una nueva versión disponible
    checkForUpdates().then(hasUpdate => {
      event.ports[0].postMessage({ hasUpdate });
    });
  }
});

// 🔍 VERIFICAR ACTUALIZACIONES
async function checkForUpdates() {
  try {
    const response = await fetch('/version.json?t=' + Date.now());
    const data = await response.json();
    
    return data.version !== CACHE_NAME.split('-v')[1];
  } catch (error) {
    console.error('❌ Service Worker: Error verificando actualizaciones:', error);
    return false;
  }
}

console.log('🚀 Service Worker v2.25.0 cargado correctamente');