// Service Worker DEFINITIVO - Territorios LS v2.25.9
const VERSION = 'v2.25.9';
const CACHE_NAME = `territorios-tetlan-${VERSION}`;

console.log(`🚀 Service Worker ${VERSION} iniciando...`);

// ✅ INSTALACIÓN GARANTIZADA - NUNCA FALLA
self.addEventListener('install', (event) => {
  console.log(`🔧 SW ${VERSION}: Instalando...`);
  
  event.waitUntil(
    Promise.resolve()
      .then(() => {
        console.log(`✅ SW ${VERSION}: Instalación completada`);
        // NO usar skipWaiting aquí - causa el bucle
        // return self.skipWaiting();
      })
      .catch(error => {
        console.error('❌ SW: Error en instalación:', error);
      })
  );
});

// ✅ ACTIVACIÓN CONTROLADA
self.addEventListener('activate', (event) => {
  console.log(`🎯 SW ${VERSION}: Activando...`);
  
  event.waitUntil(
    Promise.all([
      // Limpiar caches antiguos
      caches.keys().then(cacheNames => {
        return Promise.all(
          cacheNames
            .filter(cacheName => cacheName !== CACHE_NAME)
            .map(cacheName => {
              console.log(`🗑️ SW: Eliminando cache antiguo: ${cacheName}`);
              return caches.delete(cacheName);
            })
        );
      })
    ])
    .then(() => {
      console.log(`✅ SW ${VERSION}: Limpieza completada`);
      
      // Solo hacer claim si realmente somos el worker activo
      if (self.registration.active === self) {
        return self.clients.claim().then(() => {
          console.log(`🎯 SW ${VERSION}: ACTIVADO Y CONTROLANDO`);
          
          // Notificar a todos los clientes UNA SOLA VEZ
          return self.clients.matchAll().then(clients => {
            clients.forEach(client => {
              client.postMessage({
                type: 'SW_ACTIVATED',
                version: VERSION,
                timestamp: Date.now()
              });
            });
          });
        });
      } else {
        console.log(`⏳ SW ${VERSION}: Esperando ser el worker activo`);
      }
    })
    .catch(error => {
      console.error('❌ SW: Error en activación:', error);
      // No hacer claim si hay error
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
  
  // Para todo lo demás: Network First con fallback
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
          if (cachedResponse) {
            return cachedResponse;
          }
          // Si es una navegación y no hay cache, devolver página offline
          if (request.destination === 'document') {
            return caches.match('/offline.html').then(offlinePage => {
              return offlinePage || new Response('Offline', { status: 503 });
            });
          }
          // Para otros recursos, devolver error
          return new Response('Network Error', { status: 503 });
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

// 🎯 EVENTOS DE CICLO DE VIDA ADICIONALES
self.addEventListener('controllerchange', () => {
  console.log('🔄 SW: Controller cambió');
});

self.addEventListener('error', (event) => {
  console.error('❌ SW: Error global:', event.error);
});

self.addEventListener('unhandledrejection', (event) => {
  console.error('❌ SW: Promise rechazada:', event.reason);
  // Prevenir que el error se propague y cause problemas
  event.preventDefault();
});

console.log(`✅ Service Worker ${VERSION} cargado correctamente - REGISTRO GARANTIZADO`);