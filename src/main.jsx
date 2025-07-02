import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

// 🚀 REGISTRO DEL SERVICE WORKER
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((registration) => {
        console.log('✅ Service Worker registrado exitosamente:', registration.scope);
        
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
                // Nueva versión disponible
                console.log('🔄 Nueva versión del Service Worker disponible');
                
                // Notificar a la aplicación
                window.dispatchEvent(new CustomEvent('sw-update-available', {
                  detail: { registration }
                }));
              }
            });
          }
        });
      })
      .catch((error) => {
        console.error('❌ Error registrando Service Worker:', error);
      });
  });
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
) 