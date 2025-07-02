// Service Worker ULTRA SIMPLE - Territorios LS v2.25.10
const VERSION = 'v2.25.10';
const CACHE_NAME = `territorios-tetlan-${VERSION}`;

console.log(`🚀 Service Worker ${VERSION} iniciando...`);

// ✅ INSTALACIÓN SIMPLE - TOMA CONTROL INMEDIATO
self.addEventListener('install', (event) => {
  console.log(`🔧 SW ${VERSION}: Instalando...`);
  console.log(`✅ SW ${VERSION}: Instalación completada - Tomando control inmediato`);
  self.skipWaiting(); // Activarse inmediatamente
});

// ✅ ACTIVACIÓN SIMPLE - SIN VERIFICACIONES COMPLEJAS
self.addEventListener('activate', (event) => {
  console.log(`🎯 SW ${VERSION}: Activando...`);
  
  event.waitUntil(
    // Limpiar caches antiguos y tomar control
    caches.keys()
      .then(cacheNames => {
        return Promise.all(
          cacheNames
            .filter(cacheName => cacheName !== CACHE_NAME)
            .map(cacheName => {
              console.log(`🗑️ SW: Eliminando cache antiguo: ${cacheName}`);
              return caches.delete(cacheName);
            })
        );
      })
      .then(() => {
        console.log(`✅ SW ${VERSION}: Limpieza completada`);
        return self.clients.claim(); // Tomar control sin verificaciones
      })
      .then(() => {
        console.log(`🎯 SW ${VERSION}: ACTIVADO Y CONTROLANDO - LISTO`);
        
        // Notificar a todos los clientes
        return self.clients.matchAll().then(clients => {
          clients.forEach(client => {
            client.postMessage({
              type: 'SW_ACTIVATED',
              version: VERSION,
              timestamp: Date.now()
            });
          });
        });
      })
      .catch(error => {
        console.error('❌ SW: Error en activación:', error);
        // Aún así, intentar tomar control
        return self.clients.claim();
      })
  );
});

// 📡 MANEJO DE PETICIONES - ULTRA SIMPLE
self.addEventListener('fetch', (event) => {
  const request = event.request;
  
  // Solo interceptar GET requests
  if (request.method !== 'GET') {
    return;
  }
  
  // Ignorar URLs problemáticas
  const excludedPatterns = [
    'chrome-extension:',
    'moz-extension:',
    'firebase',
    'firestore',
    '/api/',
    'hot-update'
  ];
  
  if (excludedPatterns.some(pattern => request.url.includes(pattern))) {
    return;
  }
  
  // Para todo lo demás: Network First simple
  event.respondWith(
    fetch(request)
      .then(response => {
        // Si la respuesta es válida, cacheamos opcionalmente
        if (response.ok && response.status === 200) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(request, responseClone);
          }).catch(() => {
            // Ignorar errores de cache
          });
        }
        return response;
      })
      .catch(() => {
        // En caso de error de red, intentar desde cache
        return caches.match(request).then(cachedResponse => {
          return cachedResponse || new Response('Network Error', { status: 503 });
        });
      })
  );
});

// 💬 COMUNICACIÓN CON LA APP
self.addEventListener('message', (event) => {
  const { type, payload } = event.data || {};
  
  switch (type) {
    case 'SKIP_WAITING':
      console.log('🔄 SW: Recibido SKIP_WAITING - Activando inmediatamente');
      self.skipWaiting();
      break;
      
    case 'GET_VERSION':
      console.log('📋 SW: Enviando versión');
      event.ports[0]?.postMessage({
        version: VERSION,
        status: 'active',
        timestamp: Date.now()
      });
      break;
      
    case 'CLEAR_CACHE':
      console.log('🧹 SW: Limpiando cache');
      caches.keys().then(cacheNames => {
        return Promise.all(cacheNames.map(name => caches.delete(name)));
      }).then(() => {
        event.ports[0]?.postMessage({ success: true });
      }).catch(error => {
        event.ports[0]?.postMessage({ success: false, error: error.message });
      });
      break;
      
    case 'PING':
      console.log('🏓 SW: Respondiendo PING');
      event.ports[0]?.postMessage({ 
        type: 'PONG', 
        version: VERSION,
        timestamp: Date.now()
      });
      break;
      
    default:
      console.log('❓ SW: Mensaje desconocido:', type);
  }
});

// 🔔 NOTIFICACIÓN DE ACTUALIZACIÓN
self.addEventListener('message', (event) => {
  if (event.data?.type === 'CHECK_UPDATE') {
    fetch('/version.json?t=' + Date.now())
      .then(response => response.json())
      .then(data => {
        const hasUpdate = data.version !== VERSION;
        event.ports[0]?.postMessage({ hasUpdate, currentVersion: VERSION, latestVersion: data.version });
      })
      .catch(error => {
        event.ports[0]?.postMessage({ hasUpdate: false, error: error.message });
      });
  }
});

// 🎯 MANEJO DE ERRORES
self.addEventListener('error', (event) => {
  console.error('❌ SW: Error global:', event.error);
});

self.addEventListener('unhandledrejection', (event) => {
  console.error('❌ SW: Promise rechazada:', event.reason);
  event.preventDefault();
});

console.log(`✅ Service Worker ${VERSION} cargado correctamente - SIMPLE Y FUNCIONAL`);