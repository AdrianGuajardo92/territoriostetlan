import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

// 🚀 REGISTRO AGRESIVO DEL SERVICE WORKER
const registerServiceWorker = async () => {
  if (!('serviceWorker' in navigator)) {
    console.warn('❌ Service Worker no soportado en este navegador');
    return;
  }

  try {
    console.log('🔄 Iniciando registro del Service Worker...');
    
    // Desregistrar cualquier SW anterior
    const registrations = await navigator.serviceWorker.getRegistrations();
    for (const registration of registrations) {
      console.log('🗑️ Desregistrando SW anterior:', registration.scope);
      await registration.unregister();
    }
    
    // Registrar nuevo SW con opciones específicas
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/',
      updateViaCache: 'none' // Forzar verificación de actualizaciones
    });
    
    console.log('✅ Service Worker registrado exitosamente:', registration.scope);
    console.log('📊 Estado del registro:', registration);
    
    // Esperar a que se active
    if (registration.installing) {
      console.log('⏳ Service Worker instalando...');
      await new Promise((resolve) => {
        registration.installing.addEventListener('statechange', (e) => {
          console.log('🔄 Cambio de estado SW:', e.target.state);
          if (e.target.state === 'activated') {
            resolve();
          }
        });
      });
    }
    
    if (registration.waiting) {
      console.log('⏳ Service Worker esperando activación...');
      registration.waiting.postMessage({ type: 'SKIP_WAITING' });
      // Esperar a que se active
      await new Promise((resolve) => {
        navigator.serviceWorker.addEventListener('controllerchange', resolve, { once: true });
        setTimeout(resolve, 3000); // Timeout de seguridad
      });
    }
    
    if (registration.active) {
      console.log('✅ Service Worker activo:', registration.active.state);
    }
    
    // Verificar que el controlador esté disponible
    if (!navigator.serviceWorker.controller) {
      console.log('⚠️ No hay controlador, forzando reload...');
      setTimeout(() => window.location.reload(), 2000);
    } else {
      console.log('✅ Controlador SW disponible:', navigator.serviceWorker.controller.scriptURL);
    }
    
    // Verificar si hay una versión más nueva del SW disponible
    setTimeout(async () => {
      try {
                 const currentVersion = 'v2.25.6'; // Versión actual esperada
        
        // Obtener versión del SW actual
        if (navigator.serviceWorker.controller) {
          const messageChannel = new MessageChannel();
          navigator.serviceWorker.controller.postMessage({
            type: 'GET_VERSION'
          }, [messageChannel.port2]);
          
          const response = await new Promise((resolve, reject) => {
            messageChannel.port1.onmessage = (event) => resolve(event.data);
            setTimeout(() => reject(new Error('Timeout')), 2000);
          });
          
          const swVersion = response.version || 'unknown';
          console.log('🔍 Versión SW actual:', swVersion, '| Versión esperada:', currentVersion);
          
          // Si las versiones no coinciden, forzar actualización
          if (!swVersion.includes('2.25.6')) {
            console.log('🔄 Versión SW obsoleta, forzando actualización...');
            registration.update();
            
            // Esperar un poco y recargar para aplicar la nueva versión
            setTimeout(() => {
              console.log('🔄 Recargando para aplicar nueva versión SW...');
              window.location.reload();
            }, 3000);
          }
        }
      } catch (error) {
        console.log('⚠️ Error verificando versión SW:', error.message);
      }
    }, 2000);
    
    // Verificar actualizaciones cada 5 minutos
    setInterval(() => {
      registration.update();
    }, 5 * 60 * 1000);
    
    // Escuchar actualizaciones
    registration.addEventListener('updatefound', () => {
      const newWorker = registration.installing;
      if (newWorker) {
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            console.log('🔄 Nueva versión del Service Worker disponible');
            window.dispatchEvent(new CustomEvent('sw-update-available', {
              detail: { registration }
            }));
          }
        });
      }
    });
    
    // Hacer disponible globalmente para debugging
    window.swRegistration = registration;
    
  } catch (error) {
    console.error('❌ Error registrando Service Worker:', error);
  }
};

// Registrar inmediatamente Y en load
registerServiceWorker();
window.addEventListener('load', registerServiceWorker);

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
) 