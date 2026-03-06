import React, { useState, useEffect } from 'react';
import Modal from '../common/Modal';
import { useToast } from '../../hooks/useToast';

const InstallModal = ({ isOpen, onClose }) => {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isInstalling, setIsInstalling] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [canInstall, setCanInstall] = useState(false);
  const { showToast } = useToast();

  useEffect(() => {
    // Detectar si ya está instalada
    const checkIfInstalled = () => {
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
      const isInWebAppiOS = window.navigator.standalone === true;
      const isInstalled = isStandalone || isInWebAppiOS;
      setIsInstalled(isInstalled);
    };

    checkIfInstalled();

    // Escuchar evento de instalación
    const handleBeforeInstallPrompt = (e) => {

      e.preventDefault();
      setDeferredPrompt(e);
      setCanInstall(true);
    };

    // Escuchar cuando se instala
    const handleAppInstalled = () => {
      
      setIsInstalled(true);
      setCanInstall(false);
      setDeferredPrompt(null);
      showToast('¡App instalada exitosamente! 🎉', 'success');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, [showToast]);

  const handleInstall = async () => {
    if (!deferredPrompt) {
      showToast('La instalación no está disponible en este momento', 'warning');
      return;
    }

    setIsInstalling(true);

    try {
      // Mostrar el prompt de instalación
      const result = await deferredPrompt.prompt();


      // Esperar la decisión del usuario
      const choiceResult = await deferredPrompt.userChoice;

      if (choiceResult.outcome === 'accepted') {
        showToast('¡Instalando aplicación...! 📱', 'success');
        // La instalación se completará automáticamente
        setTimeout(() => {
          onClose();
        }, 2000);
      } else {
        showToast('Instalación cancelada', 'info');
      }

      // Limpiar el prompt
      setDeferredPrompt(null);
      setCanInstall(false);
    } catch (error) {
      console.error('Error durante la instalación:', error);
      showToast('Error durante la instalación', 'error');
    } finally {
      setIsInstalling(false);
    }
  };

  const getDeviceInstructions = () => {
    const userAgent = navigator.userAgent.toLowerCase();
    
    if (userAgent.includes('iphone') || userAgent.includes('ipad')) {
      return {
        device: 'iOS',
        icon: 'fab fa-apple',
        steps: [
          'Toca el botón de compartir ⬆️ en Safari',
          'Selecciona "Agregar a pantalla de inicio"',
          'Toca "Agregar" en la esquina superior derecha'
        ]
      };
    } else if (userAgent.includes('android')) {
      return {
        device: 'Android',
        icon: 'fab fa-android',
        steps: [
          'Toca el menú ⋮ en Chrome',
          'Selecciona "Agregar a pantalla de inicio"',
          'Toca "Agregar" para confirmar'
        ]
      };
    } else {
      return {
        device: 'Escritorio',
        icon: 'fas fa-desktop',
        steps: [
          'Busca el ícono de instalación en la barra de direcciones',
          'Haz clic en "Instalar" cuando aparezca',
          'Confirma la instalación en el diálogo'
        ]
      };
    }
  };

  const deviceInfo = getDeviceInstructions();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] bg-white">
      <div className="flex flex-col h-screen overflow-hidden">
        {/* 🎨 HEADER ELEGANTE */}
        <div className="flex-shrink-0 bg-gradient-to-r from-indigo-600 to-purple-700 text-white p-6 shadow-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-white/20 to-white/10 rounded-xl flex items-center justify-center shadow-lg">
                <i className="fas fa-download text-2xl text-white"></i>
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white mb-1">Instalar Aplicación</h2>
                <p className="text-indigo-100 text-sm">Acceso rápido desde tu pantalla de inicio</p>
              </div>
            </div>
            
            <button 
              onClick={onClose}
              className="p-3 rounded-xl transition-all transform hover:scale-105 group bg-white/10 hover:bg-white/20"
            >
              <i className="fas fa-times text-white text-xl group-hover:rotate-90 transition-transform"></i>
            </button>
          </div>
        </div>

        {/* 📱 CONTENIDO PRINCIPAL */}
        <div className="flex-1 overflow-y-auto p-6 bg-gradient-to-br from-gray-50 via-white to-indigo-50">
          {isInstalled ? (
            /* 🎉 YA ESTÁ INSTALADA */
            <div className="text-center py-16">
              <div className="relative w-32 h-32 mx-auto mb-8">
                <div className="w-32 h-32 bg-gradient-to-br from-green-100 to-emerald-100 rounded-full flex items-center justify-center shadow-2xl border-4 border-green-200 animate-pulse">
                  <i className="fas fa-check-circle text-6xl text-green-500"></i>
                </div>
                <div className="absolute -top-3 -right-3 w-12 h-12 bg-gradient-to-r from-green-500 to-emerald-600 rounded-full flex items-center justify-center shadow-lg animate-bounce">
                  <i className="fas fa-mobile-alt text-white text-xl"></i>
                </div>
              </div>
              
              <h3 className="text-3xl font-bold text-gray-900 mb-4">¡Ya está instalada! 🎉</h3>
              <p className="text-gray-600 text-lg leading-relaxed mb-8">
                La aplicación ya está instalada en tu dispositivo y funcionando como una app nativa.
              </p>
              
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-2xl p-6 border-2 border-green-200 max-w-md mx-auto">
                <div className="flex items-center justify-center mb-4">
                  <div className="w-12 h-12 bg-green-500 rounded-xl flex items-center justify-center mr-3">
                    <i className="fas fa-rocket text-white text-xl"></i>
                  </div>
                  <h4 className="text-lg font-semibold text-green-900">¡Perfecto!</h4>
                </div>
                <p className="text-green-800 text-sm leading-relaxed">
                  Puedes encontrar la app en tu pantalla de inicio y usarla sin conexión.
                </p>
              </div>
            </div>
          ) : canInstall ? (
            /* 🚀 INSTALACIÓN AUTOMÁTICA DISPONIBLE */
            <div className="text-center py-12">
              <div className="relative w-32 h-32 mx-auto mb-8">
                <div className="w-32 h-32 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-full flex items-center justify-center shadow-2xl border-4 border-indigo-200">
                  <i className="fas fa-mobile-alt text-6xl text-indigo-600"></i>
                </div>
                <div className="absolute -top-3 -right-3 w-12 h-12 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full flex items-center justify-center shadow-lg">
                  <i className="fas fa-download text-white text-xl"></i>
                </div>
              </div>
              
              <h3 className="text-3xl font-bold text-gray-900 mb-4">¡Instalar es súper fácil! 📱</h3>
              <p className="text-gray-600 text-lg leading-relaxed mb-8">
                Un solo clic y tendrás la app en tu teléfono como cualquier otra aplicación.
              </p>

              {/* BOTÓN GIGANTE DE INSTALACIÓN */}
              <button
                onClick={handleInstall}
                disabled={isInstalling}
                className="w-full max-w-md mx-auto bg-gradient-to-r from-indigo-500 to-purple-600 text-white py-6 px-8 rounded-2xl font-bold text-xl shadow-2xl hover:from-indigo-600 hover:to-purple-700 transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:transform-none flex items-center justify-center gap-4 mb-8"
              >
                {isInstalling ? (
                  <>
                    <div className="w-8 h-8 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
                    Instalando...
                  </>
                ) : (
                  <>
                    <i className="fas fa-download text-3xl"></i>
                    Instalar App
                  </>
                )}
              </button>

              {/* BENEFICIOS */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-4xl mx-auto">
                <div className="bg-white rounded-xl p-4 shadow-lg border border-indigo-100">
                  <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-cyan-600 rounded-xl flex items-center justify-center mx-auto mb-3">
                    <i className="fas fa-bolt text-white text-xl"></i>
                  </div>
                  <h4 className="font-bold text-gray-900 mb-2">Súper Rápida</h4>
                  <p className="text-gray-600 text-sm">Carga instantánea desde tu pantalla de inicio</p>
                </div>

                <div className="bg-white rounded-xl p-4 shadow-lg border border-indigo-100">
                  <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl flex items-center justify-center mx-auto mb-3">
                    <i className="fas fa-wifi-slash text-white text-xl"></i>
                  </div>
                  <h4 className="font-bold text-gray-900 mb-2">Sin Internet</h4>
                  <p className="text-gray-600 text-sm">Funciona aunque no tengas conexión</p>
                </div>

                <div className="bg-white rounded-xl p-4 shadow-lg border border-indigo-100">
                  <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-600 rounded-xl flex items-center justify-center mx-auto mb-3">
                    <i className="fas fa-mobile-alt text-white text-xl"></i>
                  </div>
                  <h4 className="font-bold text-gray-900 mb-2">Como App Nativa</h4>
                  <p className="text-gray-600 text-sm">Se ve y funciona como una app normal</p>
                </div>
              </div>
            </div>
          ) : (
            /* 📋 INSTRUCCIONES MANUALES */
            <div className="max-w-2xl mx-auto">
              <div className="text-center mb-8">
                <div className="w-24 h-24 bg-gradient-to-br from-orange-100 to-red-100 rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl">
                  <i className={`${deviceInfo.icon} text-4xl text-orange-600`}></i>
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-4">Instalar en {deviceInfo.device}</h3>
                <p className="text-gray-600 leading-relaxed">
                  Sigue estos pasos para agregar la app a tu pantalla de inicio:
                </p>
              </div>

              {/* PASOS DE INSTALACIÓN */}
              <div className="space-y-4 mb-8">
                {deviceInfo.steps.map((step, index) => (
                  <div key={index} className="bg-white rounded-xl p-4 shadow-lg border border-orange-100 flex items-center gap-4">
                    <div className="w-10 h-10 bg-gradient-to-r from-orange-500 to-red-600 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0">
                      {index + 1}
                    </div>
                    <p className="text-gray-800 font-medium">{step}</p>
                  </div>
                ))}
              </div>

              {/* NOTA INFORMATIVA */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-6 border-2 border-blue-200">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
                    <i className="fas fa-info text-white text-sm"></i>
                  </div>
                  <h4 className="text-lg font-bold text-blue-800">¿No ves la opción?</h4>
                </div>
                <p className="text-blue-700 text-sm leading-relaxed">
                  Asegúrate de estar usando el navegador web de tu dispositivo (Safari en iOS, Chrome en Android). 
                  La opción aparecerá automáticamente cuando la app esté lista para instalarse.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default InstallModal; 