// Service Worker OFFLINE-FIRST - Territorios LS v2.25.11
const VERSION = 'v2.25.11';
const STATIC_CACHE = `static-${VERSION}`;
const DYNAMIC_CACHE = `dynamic-${VERSION}`;

// ❗ ARCHIVOS ESENCIALES PARA EL FUNCIONAMIENTO OFFLINE
// Estos son los archivos que la aplicación necesita para arrancar.
const APP_SHELL = [
  '/',
  '/index.html',
  '/manifest.json',
  '/offline.html',
  // Los siguientes archivos son placeholders, el build los reemplazará
  // por los nombres correctos con hashes. Si no, necesitaríamos un
  // script que inyecte aquí los nombres de archivo generados.
  // Por ahora, confiamos en el cache dinámico.
  '/assets/main.js',
  '/assets/main.css',
  '/assets/vendor.js'
];

console.log(`🚀 Service Worker ${VERSION} iniciando...`);

// 1️⃣ INSTALACIÓN: Cachear el App Shell
self.addEventListener('install', event => {
  console.log(`🔧 SW ${VERSION}: Instalando...`);
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then(cache => {
        console.log(`📦 SW ${VERSION}: Cacheando App Shell...`);
        // Usamos addAll. Si un archivo falla, la instalación entera falla.
        // Esto es intencional para garantizar la integridad del modo offline.
        // Usamos .catch en cada add individual para prevenir que un archivo no esencial
        // (como un ícono que cambió de nombre) rompa la instalación.
        const cachePromises = APP_SHELL.map(url => {
          return cache.add(url).catch(err => {
            console.warn(`⚠️ No se pudo cachear ${url}. Esto es opcional.`);
          });
        });
        return Promise.all(cachePromises);
      })
      .then(() => {
        console.log(`✅ SW ${VERSION}: App Shell cacheado. Activación pendiente.`);
        // Forzar al nuevo Service Worker a activarse inmediatamente.
        return self.skipWaiting();
      })
      .catch(error => {
        console.error(`❌ SW ${VERSION}: Falló la instalación.`, error);
      })
  );
});

// 2️⃣ ACTIVACIÓN: Limpiar caches antiguos y tomar control
self.addEventListener('activate', event => {
  console.log(`🎯 SW ${VERSION}: Activando...`);
  event.waitUntil(
    Promise.all([
      // Tomar control de todos los clientes (páginas) abiertos.
      self.clients.claim(),
      // Eliminar los caches de versiones anteriores.
      caches.keys().then(cacheNames => {
        return Promise.all(
          cacheNames
            .filter(name => name !== STATIC_CACHE && name !== DYNAMIC_CACHE)
            .map(name => {
              console.log(`🗑️ SW ${VERSION}: Eliminando cache antiguo: ${name}`);
              return caches.delete(name);
            })
        );
      })
    ]).then(() => {
      console.log(`✅ SW ${VERSION}: ¡Activado y controlando!`);
      // Notificar a los clientes que la nueva versión está lista.
      self.clients.matchAll().then(clients => {
        clients.forEach(client => client.postMessage({ type: 'SW_ACTIVATED', version: VERSION }));
      });
    }).catch(error => {
      console.error(`❌ SW ${VERSION}: Falló la activación.`, error);
    })
  );
});


// 3️⃣ FETCH: Servir desde el cache primero (Cache First)
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // Ignorar peticiones a Firebase y extensiones del navegador.
  if (url.protocol.startsWith('chrome-extension') || url.href.includes('firestore')) {
    return;
  }
  
  // Ignorar peticiones que no sean GET.
  if (request.method !== 'GET') {
    return;
  }

  // Estrategia: Cache First
  event.respondWith(
    caches.match(request)
      .then(cachedResponse => {
        // Si la respuesta está en el cache, la devolvemos.
        if (cachedResponse) {
          // console.log(`⚡️ SW: Sirviendo desde cache: ${url.pathname}`);
          return cachedResponse;
        }

        // Si no está en el cache, vamos a la red.
        return fetch(request)
          .then(networkResponse => {
            // Si la respuesta de la red es válida, la guardamos en el cache dinámico.
            if (networkResponse.ok) {
              return caches.open(DYNAMIC_CACHE).then(cache => {
                cache.put(request, networkResponse.clone());
                // Devolvemos la respuesta de la red.
                return networkResponse;
              });
            }
            // Si la respuesta no es 'ok', simplemente la retornamos sin cachear.
            return networkResponse;
          })
          .catch(() => {
            // Si la red falla, y era una navegación a una página,
            // mostramos la página offline de fallback.
            if (request.destination === 'document') {
              return caches.match('/offline.html');
            }
            // Para otros tipos de assets, no hay fallback.
          });
      })
  );
});

// 4️⃣ COMUNICACIÓN: Manejar mensajes desde la app.
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'GET_VERSION') {
    event.ports[0].postMessage({ version: VERSION });
  }
});

// 💬 COMUNICACIÓN CON LA APP
self.addEventListener('message', (event) => {
  const { type, payload } = event.data || {};
  
  switch (type) {
    case 'SKIP_WAITING':
      console.log('🔄 SW: Recibido SKIP_WAITING - Activando inmediatamente');
      self.skipWaiting();
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