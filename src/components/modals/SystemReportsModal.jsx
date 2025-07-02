import React, { useState, useEffect } from 'react';
import Modal from '../common/Modal';
import { useToast } from '../../hooks/useToast';

const SystemReportsModal = ({ isOpen, onClose, modalId }) => {
  const { showToast } = useToast();
  const [systemData, setSystemData] = useState({
    performance: {},
    errors: [],
    browser: {},
    storage: {},
    network: {},
    cache: {},
    serviceWorker: {}
  });
  const [activeTab, setActiveTab] = useState('overview');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (isOpen) {
      // Recolectar datos inmediatamente sin esperas complejas
      collectSystemData();
      
      // 🔒 BLOQUEAR SCROLL DEL BODY
      document.body.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.width = '100%';
      document.body.style.height = '100%';
    } else {
      // 🔓 RESTAURAR SCROLL DEL BODY
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.width = '';
      document.body.style.height = '';
    }

    // Cleanup al desmontar
    return () => {
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.width = '';
      document.body.style.height = '';
    };
  }, [isOpen]);

  const collectSystemData = async () => {
    setIsLoading(true);
    
    try {
      console.log('🔄 Iniciando recolección de datos del sistema...');
      
      // Recolectar datos con timeouts individuales para evitar colgadas
      const dataPromises = {
        performance: Promise.race([
          getPerformanceData(),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout performance')), 3000))
        ]),
        errors: Promise.resolve(getErrorLogs()), // Síncrono
        browser: Promise.resolve(getBrowserInfo()), // Síncrono
        storage: Promise.race([
          getStorageInfo(),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout storage')), 3000))
        ]),
        network: Promise.race([
          getNetworkInfo(),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout network')), 5000))
        ]),
        cache: Promise.race([
          getCacheInfo(),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout cache')), 3000))
        ]),
        serviceWorker: Promise.race([
          getServiceWorkerInfo(),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout serviceWorker')), 500))
        ])
      };
      
      // Resolver todas las promesas con manejo de errores individual
      const results = await Promise.allSettled([
        dataPromises.performance,
        dataPromises.errors,
        dataPromises.browser,
        dataPromises.storage,
        dataPromises.network,
        dataPromises.cache,
        dataPromises.serviceWorker
      ]);
      
      const data = {
        performance: results[0].status === 'fulfilled' ? results[0].value : { error: 'Timeout' },
        errors: results[1].status === 'fulfilled' ? results[1].value : [],
        browser: results[2].status === 'fulfilled' ? results[2].value : { error: 'Error' },
        storage: results[3].status === 'fulfilled' ? results[3].value : { error: 'Timeout' },
        network: results[4].status === 'fulfilled' ? results[4].value : { error: 'Timeout' },
        cache: results[5].status === 'fulfilled' ? results[5].value : { error: 'Timeout' },
        serviceWorker: results[6].status === 'fulfilled' ? results[6].value : { error: 'Timeout', supported: false }
      };
      
      console.log('✅ Recolección completada:', data);
      setSystemData(data);
    } catch (error) {
      console.error('❌ Error recolectando datos del sistema:', error);
      showToast('Error al recolectar datos del sistema', 'error');
      
      // Datos de fallback para evitar pantalla en blanco
      setSystemData({
        performance: { error: 'Error de carga' },
        errors: [],
        browser: { error: 'Error de carga' },
        storage: { error: 'Error de carga' },
        network: { error: 'Error de carga' },
        cache: { error: 'Error de carga' },
        serviceWorker: { error: 'Error de carga', supported: false }
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getPerformanceData = async () => {
    const navigation = performance.getEntriesByType('navigation')[0];
    const paint = performance.getEntriesByType('paint');
    
    return {
      loadTime: navigation ? Math.round(navigation.loadEventEnd - navigation.loadEventStart) : 0,
      domContentLoaded: navigation ? Math.round(navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart) : 0,
      firstPaint: paint.find(p => p.name === 'first-paint')?.startTime || 0,
      firstContentfulPaint: paint.find(p => p.name === 'first-contentful-paint')?.startTime || 0,
      memoryUsage: navigator.deviceMemory || 'Desconocido',
      connection: navigator.connection ? {
        effectiveType: navigator.connection.effectiveType,
        downlink: navigator.connection.downlink,
        rtt: navigator.connection.rtt
      } : null
    };
  };

  const getErrorLogs = () => {
    const errors = JSON.parse(localStorage.getItem('app_errors') || '[]');
    return errors.slice(-10); // Últimos 10 errores
  };

  const getBrowserInfo = () => {
    const ua = navigator.userAgent;
    return {
      userAgent: ua,
      browser: getBrowserName(ua),
      version: getBrowserVersion(ua),
      platform: navigator.platform,
      language: navigator.language,
      cookiesEnabled: navigator.cookieEnabled,
      onLine: navigator.onLine,
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight
      },
      screen: {
        width: screen.width,
        height: screen.height,
        colorDepth: screen.colorDepth
      }
    };
  };

  const getStorageInfo = async () => {
    const storage = {};
    
    // Local Storage
    try {
      const localStorageSize = new Blob(Object.values(localStorage)).size;
      storage.localStorage = {
        available: true,
        size: localStorageSize,
        items: Object.keys(localStorage).length
      };
    } catch (e) {
      storage.localStorage = { available: false, error: e.message };
    }

    // Session Storage
    try {
      const sessionStorageSize = new Blob(Object.values(sessionStorage)).size;
      storage.sessionStorage = {
        available: true,
        size: sessionStorageSize,
        items: Object.keys(sessionStorage).length
      };
    } catch (e) {
      storage.sessionStorage = { available: false, error: e.message };
    }

    // IndexedDB
    if ('indexedDB' in window) {
      try {
        const estimate = await navigator.storage?.estimate();
        storage.indexedDB = {
          available: true,
          quota: estimate?.quota || 'Desconocido',
          usage: estimate?.usage || 'Desconocido'
        };
      } catch (e) {
        storage.indexedDB = { available: false, error: e.message };
      }
    } else {
      storage.indexedDB = { available: false };
    }

    return storage;
  };

  const getNetworkInfo = async () => {
    const network = {
      online: navigator.onLine,
      connection: navigator.connection || null
    };

    // Test de conectividad
    try {
      const start = Date.now();
      const response = await fetch('/version.json?t=' + Date.now(), { 
        cache: 'no-store',
        signal: AbortSignal.timeout(5000)
      });
      const end = Date.now();
      
      network.serverTest = {
        success: response.ok,
        responseTime: end - start,
        status: response.status
      };
    } catch (error) {
      network.serverTest = {
        success: false,
        error: error.message
      };
    }

    return network;
  };

  const getCacheInfo = async () => {
    const cache = {};

    if ('caches' in window) {
      try {
        const cacheNames = await caches.keys();
        cache.available = true;
        cache.caches = cacheNames.length;
        cache.names = cacheNames;
      } catch (e) {
        cache.available = false;
        cache.error = e.message;
      }
    } else {
      cache.available = false;
    }

    return cache;
  };

  const getServiceWorkerInfo = async () => {
    const sw = {};

    if ('serviceWorker' in navigator) {
      sw.supported = true;
      
      try {
        // MÉTODO 1: Verificar controlador activo (más confiable)
        const hasController = !!navigator.serviceWorker.controller;
        
        if (hasController) {
          // SW ACTIVO Y CONTROLANDO
          sw.registered = true;
          sw.status = 'Activo y Controlando';
          sw.state = 'activated';
          sw.controller = true;
          sw.communication = 'Funcional';
          sw.scriptURL = navigator.serviceWorker.controller.scriptURL;
          sw.scope = navigator.serviceWorker.controller.scope || '/';
          
          // Test de comunicación
          try {
            const messageChannel = new MessageChannel();
            navigator.serviceWorker.controller.postMessage(
              { type: 'PING' }, 
              [messageChannel.port2]
            );
            
            const response = await new Promise((resolve, reject) => {
              const timeout = setTimeout(() => reject(new Error('Timeout')), 1000);
              messageChannel.port1.onmessage = (event) => {
                clearTimeout(timeout);
                resolve(event.data);
              };
            });
            
            if (response.type === 'PONG') {
              sw.communication = 'Funcional';
              sw.version = response.version || 'v2.25.10';
            }
          } catch (commError) {
            sw.communication = 'Sin respuesta';
          }
          
        } else {
          // NO HAY CONTROLADOR - Verificar registros
          const registrations = await navigator.serviceWorker.getRegistrations();
          
          if (registrations.length > 0) {
            const registration = registrations[0];
            sw.registered = true;
            sw.scope = registration.scope;
            
            if (registration.installing) {
              sw.status = 'Instalando';
              sw.state = 'installing';
              sw.scriptURL = registration.installing.scriptURL;
            } else if (registration.waiting) {
              sw.status = 'Esperando Activación';
              sw.state = 'waiting';
              sw.scriptURL = registration.waiting.scriptURL;
            } else if (registration.active) {
              sw.status = 'Registrado sin Control';
              sw.state = 'activated';
              sw.scriptURL = registration.active.scriptURL;
            } else {
              sw.status = 'Registro Vacío';
              sw.state = 'none';
              sw.scriptURL = 'N/A';
            }
            
            sw.controller = false;
            sw.communication = 'Sin controlador';
          } else {
            // NO HAY REGISTROS
            sw.registered = false;
            sw.status = 'No registrado';
            sw.state = 'unregistered';
            sw.controller = false;
            sw.communication = 'Sin controlador';
            sw.scriptURL = 'N/A';
            sw.scope = 'N/A';
          }
        }
        
        // Información adicional
        sw.version = sw.version || 'v2.25.10';
        sw.updateViaCache = 'none';
        
      } catch (e) {
        console.error('Error obteniendo info SW:', e);
        sw.error = e.message;
        sw.status = 'Error: ' + e.message;
        sw.registered = false;
        sw.controller = false;
        sw.communication = 'Error';
        sw.version = 'v2.25.10';
      }
    } else {
      sw.supported = false;
      sw.status = 'No soportado por navegador';
      sw.registered = false;
      sw.controller = false;
      sw.communication = 'No soportado';
      sw.version = 'N/A';
    }

    return sw;
  };

  const getBrowserName = (userAgent) => {
    if (userAgent.includes('Chrome')) return 'Chrome';
    if (userAgent.includes('Firefox')) return 'Firefox';
    if (userAgent.includes('Safari')) return 'Safari';
    if (userAgent.includes('Edge')) return 'Edge';
    if (userAgent.includes('Opera')) return 'Opera';
    return 'Desconocido';
  };

  const getBrowserVersion = (userAgent) => {
    const match = userAgent.match(/(Chrome|Firefox|Safari|Edge|Opera)\/(\d+)/);
    return match ? match[2] : 'Desconocido';
  };

  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const exportReport = () => {
    const report = {
      timestamp: new Date().toISOString(),
      url: window.location.href,
      ...systemData
    };
    
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `system-report-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    
    showToast('Reporte exportado correctamente', 'success');
  };

  const clearLogs = () => {
    localStorage.removeItem('app_errors');
    showToast('Logs eliminados', 'success');
    collectSystemData();
  };

  // Función para limpiar caché y recargar aplicación
  const handleClearCache = () => {
    if ('caches' in window) {
      caches.keys().then(cacheNames => {
        Promise.all(cacheNames.map(cacheName => caches.delete(cacheName)))
          .then(() => {
            showToast('Caché limpiado correctamente', 'success');
            setTimeout(() => window.location.reload(), 1500);
          });
      });
    } else {
      showToast('Recargando aplicación...', 'info');
      setTimeout(() => window.location.reload(), 1000);
    }
  };

  const tabs = [
    { id: 'overview', label: 'Resumen', icon: 'chart-bar', color: 'indigo', description: 'Vista general del sistema' },
    { id: 'serviceWorker', label: 'Service Worker', icon: 'cogs', color: 'emerald', description: 'Estado del SW' },
    { id: 'performance', label: 'Rendimiento', icon: 'tachometer-alt', color: 'blue', description: 'Métricas de velocidad' },
    { id: 'errors', label: 'Errores', icon: 'exclamation-triangle', color: 'red', description: 'Logs de errores' },
    { id: 'browser', label: 'Navegador', icon: 'globe', color: 'purple', description: 'Info del navegador' },
    { id: 'storage', label: 'Almacenamiento', icon: 'database', color: 'green', description: 'Uso de memoria' },
    { id: 'network', label: 'Red', icon: 'wifi', color: 'cyan', description: 'Estado de conexión' }
  ];

  if (!isOpen) return null;

  // Configuración de colores para tabs
  const getTabColorConfig = (color) => {
    const configs = {
      indigo: { bg: 'from-indigo-500 to-purple-600', text: 'text-indigo-600', border: 'border-indigo-500' },
      blue: { bg: 'from-blue-500 to-cyan-600', text: 'text-blue-600', border: 'border-blue-500' },
      red: { bg: 'from-red-500 to-pink-600', text: 'text-red-600', border: 'border-red-500' },
      purple: { bg: 'from-purple-500 to-indigo-600', text: 'text-purple-600', border: 'border-purple-500' },
      green: { bg: 'from-green-500 to-emerald-600', text: 'text-green-600', border: 'border-green-500' },
      emerald: { bg: 'from-emerald-500 to-green-600', text: 'text-emerald-600', border: 'border-emerald-500' },
      cyan: { bg: 'from-cyan-500 to-blue-600', text: 'text-cyan-600', border: 'border-cyan-500' }
    };
    return configs[color] || configs.indigo;
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-[9999] bg-white" 
      style={{ 
        touchAction: 'none',
        overscrollBehavior: 'contain'
      }}
      onTouchMove={(e) => {
        // Solo permitir scroll dentro del contenedor de contenido
        if (!e.target.closest('.scroll-container')) {
          e.preventDefault();
        }
      }}
    >
      <div className="flex flex-col h-screen overflow-hidden">
        {/* 🎨 HEADER MÓVIL NATIVO - FIJO */}
        <div className="flex-shrink-0 bg-gradient-to-r from-slate-700 to-gray-800 text-white p-4 shadow-lg sticky top-0 z-10">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-indigo-400 to-purple-500 rounded-xl flex items-center justify-center shadow-lg">
                <i className="fas fa-chart-line text-lg text-white"></i>
              </div>
              <div>
                <h2 className="text-xl font-bold">Reportes del Sistema</h2>
                <p className="text-gray-300 text-xs">Diagnóstico técnico</p>
              </div>
            </div>
            
            {/* BOTÓN CERRAR MÓVIL */}
            <button
              onClick={onClose}
              className="w-10 h-10 bg-white/10 hover:bg-white/20 rounded-xl flex items-center justify-center transition-colors duration-200"
            >
              <i className="fas fa-times text-white text-lg"></i>
            </button>
          </div>

          {/* 🔧 ACCIONES MÓVILES */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={collectSystemData}
              disabled={isLoading}
              className="flex-1 min-w-0 px-3 py-2 bg-gradient-to-r from-blue-500 to-cyan-600 text-white rounded-lg hover:from-blue-600 hover:to-cyan-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-medium shadow-lg transition-all duration-200"
            >
              <i className={`fas fa-sync-alt ${isLoading ? 'animate-spin' : ''}`}></i>
              <span className="text-sm">{isLoading ? 'Actualizando...' : 'Actualizar'}</span>
            </button>
            
            <button
              onClick={exportReport}
              className="flex-1 min-w-0 px-3 py-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg hover:from-green-600 hover:to-emerald-700 flex items-center justify-center gap-2 font-medium shadow-lg transition-all duration-200"
            >
              <i className="fas fa-download"></i>
              <span className="text-sm">Exportar</span>
            </button>
            
            <button
              onClick={clearLogs}
              className="flex-1 min-w-0 px-3 py-2 bg-gradient-to-r from-red-500 to-pink-600 text-white rounded-lg hover:from-red-600 hover:to-pink-700 flex items-center justify-center gap-2 font-medium shadow-lg transition-all duration-200"
            >
              <i className="fas fa-trash"></i>
              <span className="text-sm">Limpiar</span>
            </button>
            
            <button
              onClick={handleClearCache}
              className="flex-1 min-w-0 px-3 py-2 bg-gradient-to-r from-purple-500 to-indigo-600 text-white rounded-lg hover:from-purple-600 hover:to-indigo-700 flex items-center justify-center gap-2 font-medium shadow-lg transition-all duration-200"
            >
              <i className="fas fa-broom"></i>
              <span className="text-sm">Limpiar Caché</span>
            </button>
          </div>
        </div>

        {/* 📱 NAVEGACIÓN DE TABS MÓVIL - FIJA */}
        <div className="flex-shrink-0 px-4 py-2 bg-white sticky top-0 z-10 shadow-sm">
          <div className="bg-gray-50 rounded-xl p-2">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
              {tabs.map((tab) => {
                const config = getTabColorConfig(tab.color);
                const isActive = activeTab === tab.id;
                
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`relative p-3 rounded-xl transition-all duration-300 group ${
                      isActive 
                        ? `bg-gradient-to-r ${config.bg} text-white shadow-lg scale-105` 
                        : 'bg-white text-gray-600 hover:bg-gray-100 hover:text-gray-800 hover:scale-102'
                    }`}
                  >
                    <div className="flex flex-col items-center gap-2">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                        isActive ? 'bg-white/20' : 'bg-gray-100 group-hover:bg-gray-200'
                      }`}>
                        <i className={`fas fa-${tab.icon} ${isActive ? 'text-white' : config.text}`}></i>
                      </div>
                      <div className="text-center">
                        <div className={`text-xs font-bold ${isActive ? 'text-white' : 'text-gray-700'}`}>
                          {tab.label}
                        </div>
                        <div className={`text-xs mt-1 ${
                          isActive ? 'text-white/80' : 'text-gray-500'
                        }`}>
                          {tab.description}
                        </div>
                      </div>
                    </div>
                    
                    {/* Indicador activo */}
                    {isActive && (
                      <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-white rounded-full shadow-lg"></div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* 📊 CONTENIDO CON SCROLL MÓVIL - SCROLLEABLE */}
        <div 
          className="flex-1 overflow-y-auto overscroll-contain scroll-container" 
          style={{ 
            WebkitOverflowScrolling: 'touch',
            scrollBehavior: 'smooth',
            touchAction: 'pan-y'
          }}
        >
          <div className="p-4 pb-8">
            {isLoading ? (
              <div className="flex items-center justify-center min-h-[50vh]">
                <div className="text-center">
                  <div className="w-16 h-16 bg-gradient-to-br from-indigo-400 to-purple-500 rounded-full flex items-center justify-center mx-auto mb-4 shadow-xl">
                    <i className="fas fa-spinner fa-spin text-2xl text-white"></i>
                  </div>
                  <h3 className="text-lg font-bold text-gray-800 mb-2">Analizando Sistema</h3>
                  <p className="text-gray-600 text-sm">Recolectando datos técnicos...</p>
                  <div className="mt-3 w-32 h-1.5 bg-gray-200 rounded-full mx-auto overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full animate-pulse"></div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {activeTab === 'overview' && <OverviewTab data={systemData} />}
                {activeTab === 'serviceWorker' && <ServiceWorkerTab data={systemData.serviceWorker} />}
                {activeTab === 'performance' && <PerformanceTab data={systemData.performance} />}
                {activeTab === 'errors' && <ErrorsTab data={systemData.errors} />}
                {activeTab === 'browser' && <BrowserTab data={systemData.browser} />}
                {activeTab === 'storage' && <StorageTab data={systemData.storage} formatBytes={formatBytes} />}
                {activeTab === 'network' && <NetworkTab data={systemData.network} />}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// 🎨 COMPONENTES DE TABS REDISEÑADOS - MÓVIL FIRST
const OverviewTab = ({ data }) => {
  const metrics = [
    {
      title: 'Rendimiento',
      value: `${data.performance?.loadTime || 0}ms`,
      subtitle: 'Tiempo de carga',
      icon: 'tachometer-alt',
      gradient: 'from-blue-500 to-cyan-600',
      bgGradient: 'from-blue-50 to-cyan-50',
      textColor: 'text-blue-700',
      status: data.performance?.loadTime < 1000 ? 'excellent' : data.performance?.loadTime < 3000 ? 'good' : 'warning'
    },
    {
      title: 'Service Worker',
      value: data.serviceWorker?.status || 'Verificando...',
      subtitle: data.serviceWorker?.communication || 'Estado desconocido',
      icon: 'cogs',
      gradient: data.serviceWorker?.registered ? 'from-green-500 to-emerald-600' : 'from-red-500 to-pink-600',
      bgGradient: data.serviceWorker?.registered ? 'from-green-50 to-emerald-50' : 'from-red-50 to-pink-50',
      textColor: data.serviceWorker?.registered ? 'text-green-700' : 'text-red-700',
      status: data.serviceWorker?.registered ? 'excellent' : 'error'
    },
    {
      title: 'Errores',
      value: data.errors?.length || 0,
      subtitle: 'Registrados en logs',
      icon: 'exclamation-triangle',
      gradient: data.errors?.length === 0 ? 'from-green-500 to-emerald-600' : 'from-yellow-500 to-orange-600',
      bgGradient: data.errors?.length === 0 ? 'from-green-50 to-emerald-50' : 'from-yellow-50 to-orange-50',
      textColor: data.errors?.length === 0 ? 'text-green-700' : 'text-yellow-700',
      status: data.errors?.length === 0 ? 'excellent' : data.errors?.length < 5 ? 'warning' : 'error'
    },
    {
      title: 'Navegador',
      value: data.browser?.browser || 'Desconocido',
      subtitle: `Versión ${data.browser?.version || 'N/A'}`,
      icon: 'globe',
      gradient: 'from-purple-500 to-indigo-600',
      bgGradient: 'from-purple-50 to-indigo-50',
      textColor: 'text-purple-700',
      status: 'info'
    },
    {
      title: 'Conexión',
      value: data.network?.online ? 'Online' : 'Offline',
      subtitle: data.network?.connection?.effectiveType || 'Tipo desconocido',
      icon: 'wifi',
      gradient: data.network?.online ? 'from-indigo-500 to-blue-600' : 'from-gray-500 to-slate-600',
      bgGradient: data.network?.online ? 'from-indigo-50 to-blue-50' : 'from-gray-50 to-slate-50',
      textColor: data.network?.online ? 'text-indigo-700' : 'text-gray-700',
      status: data.network?.online ? 'excellent' : 'error'
    },
    {
      title: 'Cache',
      value: `${data.cache?.caches || 0}`,
      subtitle: 'Caches disponibles',
      icon: 'database',
      gradient: 'from-gray-500 to-slate-600',
      bgGradient: 'from-gray-50 to-slate-50',
      textColor: 'text-gray-700',
      status: 'info'
    }
  ];

  const getStatusIcon = (status) => {
    switch (status) {
      case 'excellent': return 'fas fa-check-circle text-green-500';
      case 'good': return 'fas fa-thumbs-up text-blue-500';
      case 'warning': return 'fas fa-exclamation-triangle text-yellow-500';
      case 'error': return 'fas fa-times-circle text-red-500';
      default: return 'fas fa-info-circle text-gray-500';
    }
  };

  return (
    <div className="space-y-4">
      {/* 🏆 ESTADO GENERAL DEL SISTEMA */}
      <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl p-4 text-white shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-2xl font-bold mb-2">Estado General</h3>
            <p className="text-indigo-100">Sistema funcionando correctamente</p>
          </div>
          <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center">
            <i className="fas fa-heartbeat text-3xl text-white"></i>
          </div>
        </div>
        
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
          <div className="text-center">
            <div className="text-2xl font-bold">{data.performance?.loadTime < 1000 ? '✅' : '⚠️'}</div>
            <div className="text-sm text-indigo-100">Velocidad</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold">{data.serviceWorker?.registered ? '✅' : '❌'}</div>
            <div className="text-sm text-indigo-100">SW</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold">{data.errors?.length === 0 ? '✅' : '⚠️'}</div>
            <div className="text-sm text-indigo-100">Errores</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold">{data.network?.online ? '✅' : '❌'}</div>
            <div className="text-sm text-indigo-100">Red</div>
          </div>
        </div>
      </div>

      {/* 📊 MÉTRICAS DETALLADAS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {metrics.map((metric, index) => (
          <div key={index} className={`bg-gradient-to-br ${metric.bgGradient} rounded-xl p-4 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 border border-white/50`}>
            <div className="flex items-start justify-between mb-4">
              <div className={`w-12 h-12 bg-gradient-to-r ${metric.gradient} rounded-xl flex items-center justify-center shadow-lg`}>
                <i className={`fas fa-${metric.icon} text-white text-lg`}></i>
              </div>
              <i className={getStatusIcon(metric.status)}></i>
            </div>
            
            <div>
              <h4 className={`font-bold text-lg ${metric.textColor} mb-1`}>{metric.title}</h4>
              <p className={`text-2xl font-bold ${metric.textColor} mb-2`}>{metric.value}</p>
              <p className="text-sm text-gray-600">{metric.subtitle}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const PerformanceTab = ({ data }) => {
  const getPerformanceStatus = (value, thresholds) => {
    if (value <= thresholds.excellent) return { status: 'excellent', color: 'text-green-600', bg: 'bg-green-100' };
    if (value <= thresholds.good) return { status: 'good', color: 'text-blue-600', bg: 'bg-blue-100' };
    if (value <= thresholds.fair) return { status: 'fair', color: 'text-yellow-600', bg: 'bg-yellow-100' };
    return { status: 'poor', color: 'text-red-600', bg: 'bg-red-100' };
  };

  const loadTimeStatus = getPerformanceStatus(data.loadTime || 0, { excellent: 1000, good: 3000, fair: 5000 });
  const fcpStatus = getPerformanceStatus(data.firstContentfulPaint || 0, { excellent: 1800, good: 3000, fair: 4000 });

  return (
    <div className="space-y-4">
      {/* 🚀 RESUMEN DE RENDIMIENTO */}
      <div className="bg-gradient-to-r from-blue-500 to-cyan-600 rounded-2xl p-4 text-white shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-2xl font-bold mb-2">Análisis de Rendimiento</h3>
            <p className="text-blue-100">Métricas de velocidad y optimización</p>
          </div>
          <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center">
            <i className="fas fa-rocket text-3xl text-white"></i>
          </div>
        </div>
        
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6">
          <div className="text-center">
            <div className="text-2xl font-bold">{loadTimeStatus.status === 'excellent' ? '🚀' : loadTimeStatus.status === 'good' ? '⚡' : '⚠️'}</div>
            <div className="text-sm text-blue-100">Carga</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold">{fcpStatus.status === 'excellent' ? '🎨' : fcpStatus.status === 'good' ? '🖼️' : '🐌'}</div>
            <div className="text-sm text-blue-100">Pintura</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold">{data.memoryUsage ? '💾' : '❓'}</div>
            <div className="text-sm text-blue-100">Memoria</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold">{data.connection ? '📡' : '❓'}</div>
            <div className="text-sm text-blue-100">Red</div>
          </div>
        </div>
      </div>

      {/* ⏱️ MÉTRICAS DE TIEMPO */}
      <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-2xl p-4 border border-blue-200 shadow-lg">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-cyan-600 rounded-xl flex items-center justify-center shadow-lg">
            <i className="fas fa-clock text-white text-sm"></i>
          </div>
          <div>
            <h3 className="text-lg font-bold text-blue-900">Tiempos de Carga</h3>
            <p className="text-blue-600 text-xs">Métricas de velocidad</p>
          </div>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-white rounded-xl p-4 shadow-md">
            <div className="flex justify-between items-center mb-2">
              <span className="text-gray-700 font-medium">Tiempo Total</span>
              <span className={`px-2 py-1 rounded-lg text-xs font-bold ${loadTimeStatus.bg} ${loadTimeStatus.color}`}>
                {loadTimeStatus.status.toUpperCase()}
              </span>
            </div>
            <div className="text-2xl font-bold text-gray-900 mb-1">{data.loadTime || 0}ms</div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className={`h-2 rounded-full bg-gradient-to-r ${loadTimeStatus.status === 'excellent' ? 'from-green-400 to-green-600' : loadTimeStatus.status === 'good' ? 'from-blue-400 to-blue-600' : 'from-yellow-400 to-yellow-600'}`}
                style={{ width: `${Math.min((data.loadTime || 0) / 50, 100)}%` }}
              ></div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl p-4 shadow-md">
            <div className="flex justify-between items-center mb-2">
              <span className="text-gray-700 font-medium">DOM Content Loaded</span>
              <i className="fas fa-code text-gray-500"></i>
            </div>
            <div className="text-2xl font-bold text-gray-900">{data.domContentLoaded || 0}ms</div>
          </div>
          
          <div className="bg-white rounded-xl p-4 shadow-md">
            <div className="flex justify-between items-center mb-2">
              <span className="text-gray-700 font-medium">First Paint</span>
              <i className="fas fa-paint-brush text-gray-500"></i>
            </div>
            <div className="text-2xl font-bold text-gray-900">{Math.round(data.firstPaint || 0)}ms</div>
          </div>
          
          <div className="bg-white rounded-xl p-4 shadow-md">
            <div className="flex justify-between items-center mb-2">
              <span className="text-gray-700 font-medium">First Contentful Paint</span>
              <span className={`px-2 py-1 rounded-lg text-xs font-bold ${fcpStatus.bg} ${fcpStatus.color}`}>
                {fcpStatus.status.toUpperCase()}
              </span>
            </div>
            <div className="text-2xl font-bold text-gray-900">{Math.round(data.firstContentfulPaint || 0)}ms</div>
            <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
              <div 
                className={`h-2 rounded-full bg-gradient-to-r ${fcpStatus.status === 'excellent' ? 'from-green-400 to-green-600' : fcpStatus.status === 'good' ? 'from-blue-400 to-blue-600' : 'from-yellow-400 to-yellow-600'}`}
                style={{ width: `${Math.min((data.firstContentfulPaint || 0) / 40, 100)}%` }}
              ></div>
            </div>
          </div>
        </div>
      </div>

      {/* 💾 RECURSOS DEL SISTEMA */}
      <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-6 border border-green-200 shadow-lg">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg">
            <i className="fas fa-microchip text-white text-lg"></i>
          </div>
          <div>
            <h3 className="text-xl font-bold text-green-900">Recursos del Sistema</h3>
            <p className="text-green-600 text-sm">Memoria y conectividad disponible</p>
          </div>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="bg-white rounded-xl p-4 shadow-md">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-700 font-medium">Memoria</span>
              <i className="fas fa-memory text-gray-500"></i>
            </div>
            <div className="text-2xl font-bold text-gray-900">{data.memoryUsage || 'N/A'}</div>
            <div className="text-sm text-gray-600">GB disponibles</div>
          </div>
          
          {data.connection && (
            <>
              <div className="bg-white rounded-xl p-4 shadow-md">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-700 font-medium">Tipo de Red</span>
                  <i className="fas fa-signal text-gray-500"></i>
                </div>
                <div className="text-2xl font-bold text-gray-900">{data.connection.effectiveType}</div>
                <div className="text-sm text-gray-600">Tipo efectivo</div>
              </div>
              
              <div className="bg-white rounded-xl p-4 shadow-md">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-700 font-medium">Velocidad</span>
                  <i className="fas fa-download text-gray-500"></i>
                </div>
                <div className="text-2xl font-bold text-gray-900">{data.connection.downlink}</div>
                <div className="text-sm text-gray-600">Mbps de descarga</div>
              </div>
              
              <div className="bg-white rounded-xl p-4 shadow-md">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-700 font-medium">Latencia</span>
                  <i className="fas fa-clock text-gray-500"></i>
                </div>
                <div className="text-2xl font-bold text-gray-900">{data.connection.rtt}</div>
                <div className="text-sm text-gray-600">ms de respuesta</div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

const ErrorsTab = ({ data }) => {
  const errorsByType = data ? data.reduce((acc, error) => {
    const type = error.type || 'Error genérico';
    acc[type] = (acc[type] || 0) + 1;
    return acc;
  }, {}) : {};

  return (
    <div className="space-y-6">
      {data && data.length > 0 ? (
        <>
          {/* 📊 RESUMEN DE ERRORES */}
          <div className="bg-gradient-to-r from-red-500 to-pink-600 rounded-2xl p-6 text-white shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-2xl font-bold mb-2">Registro de Errores</h3>
                <p className="text-red-100">{data.length} error{data.length !== 1 ? 'es' : ''} detectado{data.length !== 1 ? 's' : ''}</p>
              </div>
              <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center">
                <i className="fas fa-bug text-3xl text-white"></i>
              </div>
            </div>
            
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6">
              <div className="text-center">
                <div className="text-2xl font-bold">{data.length}</div>
                <div className="text-sm text-red-100">Total</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">{Object.keys(errorsByType).length}</div>
                <div className="text-sm text-red-100">Tipos</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">{data.filter(e => e.timestamp && new Date(e.timestamp) > new Date(Date.now() - 24*60*60*1000)).length}</div>
                <div className="text-sm text-red-100">Hoy</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">{data.length > 10 ? '🚨' : data.length > 5 ? '⚠️' : '✅'}</div>
                <div className="text-sm text-red-100">Estado</div>
              </div>
            </div>
          </div>

          {/* 📈 ESTADÍSTICAS POR TIPO */}
          {Object.keys(errorsByType).length > 0 && (
            <div className="bg-gradient-to-br from-red-50 to-pink-50 rounded-2xl p-6 border border-red-200 shadow-lg">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-gradient-to-r from-red-500 to-pink-600 rounded-xl flex items-center justify-center shadow-lg">
                  <i className="fas fa-chart-bar text-white text-lg"></i>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-red-900">Tipos de Errores</h3>
                  <p className="text-red-600 text-sm">Distribución por categoría</p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {Object.entries(errorsByType).map(([type, count]) => (
                  <div key={type} className="bg-white rounded-xl p-4 shadow-md">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-gray-700 font-medium truncate">{type}</span>
                      <span className="bg-red-100 text-red-700 px-2 py-1 rounded-lg text-xs font-bold">
                        {count}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="h-2 rounded-full bg-gradient-to-r from-red-400 to-pink-500"
                        style={{ width: `${(count / data.length) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 🔍 LISTA DETALLADA DE ERRORES */}
          <div className="space-y-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 bg-gradient-to-r from-red-500 to-pink-600 rounded-lg flex items-center justify-center">
                <i className="fas fa-list text-white text-sm"></i>
              </div>
              <h3 className="text-lg font-bold text-gray-900">Errores Detallados</h3>
            </div>
            
            {data.map((error, index) => (
              <div key={index} className="bg-white rounded-2xl shadow-lg border border-red-100 overflow-hidden hover:shadow-xl transition-shadow duration-300">
                <div className="bg-gradient-to-r from-red-500 to-pink-600 p-4">
                  <div className="flex items-start justify-between text-white">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                        <i className="fas fa-exclamation-triangle text-lg"></i>
                      </div>
                      <div>
                        <h4 className="font-bold text-lg">{error.type || 'Error'}</h4>
                        <p className="text-red-100 text-sm">{error.timestamp || 'Fecha desconocida'}</p>
                      </div>
                    </div>
                    <span className="bg-white/20 px-3 py-1 rounded-lg text-xs font-bold">
                      #{index + 1}
                    </span>
                  </div>
                </div>
                
                <div className="p-6">
                  <div className="mb-4">
                    <h5 className="font-semibold text-gray-900 mb-2">Mensaje:</h5>
                    <p className="text-gray-700 bg-gray-50 p-3 rounded-lg break-words">
                      {error.message || 'Sin mensaje específico'}
                    </p>
                  </div>
                  
                  {error.stack && (
                    <details className="group">
                      <summary className="cursor-pointer text-red-600 hover:text-red-800 font-medium flex items-center gap-2 p-2 bg-red-50 rounded-lg transition-colors">
                        <i className="fas fa-code text-sm"></i>
                        <span>Ver Stack Trace</span>
                        <i className="fas fa-chevron-down text-xs group-open:rotate-180 transition-transform"></i>
                      </summary>
                      <div className="mt-3 bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto">
                        <pre className="text-xs leading-relaxed max-h-60 overflow-y-auto">
                          {error.stack}
                        </pre>
                      </div>
                    </details>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      ) : (
        <div className="flex items-center justify-center py-16">
          <div className="text-center max-w-md">
            <div className="w-24 h-24 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-2xl">
              <i className="fas fa-check-circle text-4xl text-white"></i>
            </div>
            <h3 className="text-2xl font-bold text-gray-800 mb-3">¡Sistema Limpio!</h3>
            <p className="text-gray-600 leading-relaxed">
              No se han detectado errores en el sistema. 
              <br />
              Todo funciona correctamente.
            </p>
            <div className="mt-6 flex justify-center">
              <div className="bg-green-100 text-green-700 px-4 py-2 rounded-full text-sm font-medium">
                <i className="fas fa-shield-alt mr-2"></i>
                Estado: Excelente
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const BrowserTab = ({ data }) => (
  <div className="space-y-6">
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div className="bg-white p-4 rounded-lg border">
        <h3 className="font-semibold mb-3 flex items-center gap-2">
          <i className="fas fa-globe text-blue-600"></i>
          Información del Navegador
        </h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span>Navegador:</span>
            <span className="font-mono">{data.browser}</span>
          </div>
          <div className="flex justify-between">
            <span>Versión:</span>
            <span className="font-mono">{data.version}</span>
          </div>
          <div className="flex justify-between">
            <span>Plataforma:</span>
            <span className="font-mono">{data.platform}</span>
          </div>
          <div className="flex justify-between">
            <span>Idioma:</span>
            <span className="font-mono">{data.language}</span>
          </div>
          <div className="flex justify-between">
            <span>Cookies:</span>
            <span className={`font-mono ${data.cookiesEnabled ? 'text-green-600' : 'text-red-600'}`}>
              {data.cookiesEnabled ? 'Habilitadas' : 'Deshabilitadas'}
            </span>
          </div>
          <div className="flex justify-between">
            <span>Estado:</span>
            <span className={`font-mono ${data.onLine ? 'text-green-600' : 'text-red-600'}`}>
              {data.onLine ? 'Online' : 'Offline'}
            </span>
          </div>
        </div>
      </div>
      
      <div className="bg-white p-4 rounded-lg border">
        <h3 className="font-semibold mb-3 flex items-center gap-2">
          <i className="fas fa-desktop text-purple-600"></i>
          Pantalla y Viewport
        </h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span>Viewport:</span>
            <span className="font-mono">{data.viewport?.width}x{data.viewport?.height}</span>
          </div>
          <div className="flex justify-between">
            <span>Pantalla:</span>
            <span className="font-mono">{data.screen?.width}x{data.screen?.height}</span>
          </div>
          <div className="flex justify-between">
            <span>Profundidad de color:</span>
            <span className="font-mono">{data.screen?.colorDepth} bits</span>
          </div>
        </div>
      </div>
    </div>
    
    {/* User Agent en sección separada para mejor visualización */}
    <div className="bg-white p-4 rounded-lg border">
      <h3 className="font-semibold mb-3 flex items-center gap-2">
        <i className="fas fa-code text-gray-600"></i>
        User Agent
      </h3>
      <div className="bg-gray-50 p-3 rounded text-xs font-mono break-all max-h-32 overflow-y-auto">
        {data.userAgent || 'No disponible'}
      </div>
    </div>
  </div>
);

const StorageTab = ({ data, formatBytes }) => (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
    <div className="bg-white p-4 rounded-lg border">
      <h3 className="font-semibold mb-3 flex items-center gap-2">
        <i className="fas fa-save text-blue-600"></i>
        Local Storage
      </h3>
      {data.localStorage?.available ? (
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span>Estado:</span>
            <span className="text-green-600">Disponible</span>
          </div>
          <div className="flex justify-between">
            <span>Tamaño:</span>
            <span className="font-mono">{formatBytes(data.localStorage.size)}</span>
          </div>
          <div className="flex justify-between">
            <span>Elementos:</span>
            <span className="font-mono">{data.localStorage.items}</span>
          </div>
        </div>
      ) : (
        <div className="text-red-600 text-sm">
          <p>No disponible</p>
          {data.localStorage?.error && <p className="text-xs mt-1">{data.localStorage.error}</p>}
        </div>
      )}
    </div>
    
    <div className="bg-white p-4 rounded-lg border">
      <h3 className="font-semibold mb-3 flex items-center gap-2">
        <i className="fas fa-clock text-yellow-600"></i>
        Session Storage
      </h3>
      {data.sessionStorage?.available ? (
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span>Estado:</span>
            <span className="text-green-600">Disponible</span>
          </div>
          <div className="flex justify-between">
            <span>Tamaño:</span>
            <span className="font-mono">{formatBytes(data.sessionStorage.size)}</span>
          </div>
          <div className="flex justify-between">
            <span>Elementos:</span>
            <span className="font-mono">{data.sessionStorage.items}</span>
          </div>
        </div>
      ) : (
        <div className="text-red-600 text-sm">
          <p>No disponible</p>
          {data.sessionStorage?.error && <p className="text-xs mt-1">{data.sessionStorage.error}</p>}
        </div>
      )}
    </div>
    
    <div className="bg-white p-4 rounded-lg border">
      <h3 className="font-semibold mb-3 flex items-center gap-2">
        <i className="fas fa-database text-green-600"></i>
        IndexedDB
      </h3>
      {data.indexedDB?.available ? (
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span>Estado:</span>
            <span className="text-green-600">Disponible</span>
          </div>
          <div className="flex justify-between">
            <span>Cuota:</span>
            <span className="font-mono">{formatBytes(data.indexedDB.quota)}</span>
          </div>
          <div className="flex justify-between">
            <span>Usado:</span>
            <span className="font-mono">{formatBytes(data.indexedDB.usage)}</span>
          </div>
        </div>
      ) : (
        <div className="text-red-600 text-sm">
          <p>No disponible</p>
          {data.indexedDB?.error && <p className="text-xs mt-1">{data.indexedDB.error}</p>}
        </div>
      )}
    </div>
  </div>
);

const NetworkTab = ({ data }) => (
  <div className="space-y-6">
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div className="bg-white p-4 rounded-lg border">
        <h3 className="font-semibold mb-3 flex items-center gap-2">
          <i className="fas fa-wifi text-blue-600"></i>
          Estado de Conexión
        </h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span>Estado:</span>
            <span className={`font-mono ${data.online ? 'text-green-600' : 'text-red-600'}`}>
              {data.online ? 'Online' : 'Offline'}
            </span>
          </div>
          {data.connection && (
            <>
              <div className="flex justify-between">
                <span>Tipo efectivo:</span>
                <span className="font-mono">{data.connection.effectiveType}</span>
              </div>
              <div className="flex justify-between">
                <span>Velocidad:</span>
                <span className="font-mono">{data.connection.downlink} Mbps</span>
              </div>
              <div className="flex justify-between">
                <span>RTT:</span>
                <span className="font-mono">{data.connection.rtt} ms</span>
              </div>
            </>
          )}
        </div>
      </div>
      
      <div className="bg-white p-4 rounded-lg border">
        <h3 className="font-semibold mb-3 flex items-center gap-2">
          <i className="fas fa-server text-green-600"></i>
          Test de Servidor
        </h3>
        {data.serverTest ? (
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span>Estado:</span>
              <span className={`font-mono ${data.serverTest.success ? 'text-green-600' : 'text-red-600'}`}>
                {data.serverTest.success ? 'Conectado' : 'Error'}
              </span>
            </div>
            {data.serverTest.success ? (
              <>
                <div className="flex justify-between">
                  <span>Tiempo de respuesta:</span>
                  <span className="font-mono">{data.serverTest.responseTime}ms</span>
                </div>
                <div className="flex justify-between">
                  <span>Código de estado:</span>
                  <span className="font-mono">{data.serverTest.status}</span>
                </div>
              </>
            ) : (
              <div className="text-red-600 text-xs">
                {data.serverTest.error}
              </div>
            )}
          </div>
        ) : (
          <div className="text-gray-600 text-sm">Realizando test...</div>
        )}
      </div>
    </div>
  </div>
);

// 🔧 NUEVA PESTAÑA DE SERVICE WORKER
const ServiceWorkerTab = ({ data }) => (
  <div className="space-y-4">
    <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-100">
      <div className="flex items-center gap-3 mb-6">
        <div className={`w-12 h-12 bg-gradient-to-br rounded-xl flex items-center justify-center shadow-lg ${
          data?.registered ? 'from-emerald-400 to-green-500' : 'from-red-400 to-pink-500'
        }`}>
          <i className="fas fa-cogs text-xl text-white"></i>
        </div>
        <div>
          <h3 className="text-lg font-bold text-gray-800">Service Worker</h3>
          <p className="text-gray-600 text-sm">Estado y funcionalidad PWA</p>
        </div>
      </div>

      {/* Estado Principal */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <span className="font-medium text-gray-700">Estado</span>
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${
              data?.registered ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
            }`}>
              {data?.status || 'Desconocido'}
            </span>
          </div>
        </div>

        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <span className="font-medium text-gray-700">Comunicación</span>
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${
              data?.communication === 'Funcional' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
            }`}>
              {data?.communication || 'Sin probar'}
            </span>
          </div>
        </div>
      </div>

      {/* Información Detallada */}
      {data?.registered && (
        <div className="space-y-4">
          <h4 className="font-semibold text-gray-800 flex items-center gap-2">
            <i className="fas fa-info-circle text-blue-500"></i>
            Información Técnica
          </h4>
          
          <div className="grid grid-cols-1 gap-3">
            {data.scriptURL && (
              <div className="bg-blue-50 rounded-lg p-4">
                <div className="flex flex-col gap-1">
                  <span className="font-medium text-blue-800">Script URL</span>
                  <span className="text-blue-700 text-sm font-mono break-all">{data.scriptURL}</span>
                </div>
              </div>
            )}

            {data.scope && (
              <div className="bg-purple-50 rounded-lg p-4">
                <div className="flex flex-col gap-1">
                  <span className="font-medium text-purple-800">Scope</span>
                  <span className="text-purple-700 text-sm font-mono">{data.scope}</span>
                </div>
              </div>
            )}

            {data.version && (
              <div className="bg-emerald-50 rounded-lg p-4">
                <div className="flex flex-col gap-1">
                  <span className="font-medium text-emerald-800">Versión</span>
                  <span className="text-emerald-700 text-sm font-mono">{data.version}</span>
                </div>
              </div>
            )}

            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <span className="font-medium text-gray-700">Controlador Activo</span>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                  data.controller ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                }`}>
                  {data.controller ? 'Sí' : 'No'}
                </span>
              </div>
            </div>

            {data.updateViaCache && (
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-gray-700">Estrategia de Cache</span>
                  <span className="text-gray-600 text-sm">{data.updateViaCache}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Soporte del Navegador */}
      <div className="mt-6 p-4 bg-gray-50 rounded-lg">
        <div className="flex items-center justify-between">
          <span className="font-medium text-gray-700">Soporte del Navegador</span>
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${
            data?.supported ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
          }`}>
            {data?.supported ? 'Soportado' : 'No soportado'}
          </span>
        </div>
      </div>

      {/* Errores */}
      {data?.error && (
        <div className="mt-4 p-4 bg-red-50 rounded-lg border border-red-200">
          <div className="flex items-center gap-2">
            <i className="fas fa-exclamation-triangle text-red-500"></i>
            <span className="font-medium text-red-800">Error Detectado</span>
          </div>
          <p className="text-red-700 text-sm mt-1 font-mono">{data.error}</p>
        </div>
      )}

      {/* Acciones */}
      <div className="mt-6 flex flex-wrap gap-3">
        <button 
          onClick={async () => {
            console.log('🔄 Refrescando información del Service Worker...');
            
            try {
              // Recolectar solo datos del SW con timeout corto
              const swData = await getServiceWorkerInfo();
              
              // Actualizar solo la pestaña de SW
              setSystemData(prev => ({
                ...prev,
                serviceWorker: swData
              }));
              
              console.log('✅ Información SW actualizada:', swData);
            } catch (error) {
              console.error('❌ Error actualizando SW:', error);
            }
          }}
          className="px-4 py-2 bg-gradient-to-r from-blue-500 to-cyan-600 text-white rounded-lg hover:from-blue-600 hover:to-cyan-700 transition-all duration-200 flex items-center gap-2"
        >
          <i className="fas fa-sync-alt"></i>
          Refrescar SW
        </button>
        
        <button 
          onClick={async () => {
            try {
              if ('serviceWorker' in navigator) {
                console.log('🔄 REGISTRO MANUAL del Service Worker v2.25.10...');
                
                // PASO 1: Limpiar TODO completamente
                const registrations = await navigator.serviceWorker.getRegistrations();
                for (const registration of registrations) {
                  console.log('🗑️ Desregistrando:', registration.scope);
                  await registration.unregister();
                }
                
                // PASO 2: Limpiar caches
                const cacheNames = await caches.keys();
                for (const cacheName of cacheNames) {
                  console.log('🧹 Eliminando cache:', cacheName);
                  await caches.delete(cacheName);
                }
                
                console.log('✅ Limpieza completa terminada');
                
                // PASO 3: Esperar un momento
                await new Promise(resolve => setTimeout(resolve, 1000));
                
                // PASO 4: Registrar SW limpio
                console.log('🚀 Registrando SW limpio...');
                const registration = await navigator.serviceWorker.register('/sw.js', { 
                  scope: '/',
                  updateViaCache: 'none' 
                });
                
                console.log('✅ SW registrado exitosamente:', registration.scope);
                
                // PASO 5: Esperar activación y recargar
                registration.addEventListener('updatefound', () => {
                  const newWorker = registration.installing;
                  newWorker.addEventListener('statechange', () => {
                    if (newWorker.state === 'activated') {
                      console.log('✅ SW activado, recargando...');
                      setTimeout(() => window.location.reload(), 1000);
                    }
                  });
                });
                
                // Si ya está activo, recargar directamente
                if (registration.active) {
                  setTimeout(() => window.location.reload(), 2000);
                }
              }
            } catch (error) {
              console.error('❌ Error en registro manual:', error);
              alert('Error en registro: ' + error.message);
            }
          }}
          className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-green-600 text-white rounded-lg hover:from-emerald-600 hover:to-green-700 transition-all duration-200 flex items-center gap-2"
        >
          <i className="fas fa-rocket"></i>
          Registro Manual
        </button>
        
        <button 
          onClick={() => {
            if ('serviceWorker' in navigator) {
              navigator.serviceWorker.register('/sw.js', { updateViaCache: 'none' })
                .then(() => window.location.reload())
                .catch(console.error);
            }
          }}
          className="px-4 py-2 bg-gradient-to-r from-blue-500 to-cyan-600 text-white rounded-lg hover:from-blue-600 hover:to-cyan-700 transition-all duration-200 flex items-center gap-2"
        >
          <i className="fas fa-sync-alt"></i>
          Reinstalar SW
        </button>
        
        <button 
          onClick={async () => {
            try {
              if ('serviceWorker' in navigator) {
                console.log('🗑️ DESACTIVANDO completamente Service Worker...');
                
                // Desregistrar todos los SW
                const registrations = await navigator.serviceWorker.getRegistrations();
                for (const registration of registrations) {
                  console.log('🗑️ Desregistrando SW:', registration.scope);
                  await registration.unregister();
                }
                
                // Limpiar todos los caches
                const cacheNames = await caches.keys();
                for (const cacheName of cacheNames) {
                  console.log('🧹 Eliminando cache:', cacheName);
                  await caches.delete(cacheName);
                }
                
                console.log('✅ Service Worker completamente DESACTIVADO');
                alert('Service Worker desactivado. La página se recargará.');
                
                setTimeout(() => window.location.reload(), 1000);
              }
            } catch (error) {
              console.error('❌ Error desactivando SW:', error);
              alert('Error: ' + error.message);
            }
          }}
          className="px-4 py-2 bg-gradient-to-r from-red-500 to-pink-600 text-white rounded-lg hover:from-red-600 hover:to-pink-700 transition-all duration-200 flex items-center gap-2"
        >
          <i className="fas fa-power-off"></i>
          DESACTIVAR SW
        </button>
        
        <button 
          onClick={() => {
            collectSystemData();
          }}
          className="px-4 py-2 bg-gradient-to-r from-purple-500 to-indigo-600 text-white rounded-lg hover:from-purple-600 hover:to-indigo-700 transition-all duration-200 flex items-center gap-2"
        >
          <i className="fas fa-refresh"></i>
          Actualizar Datos
        </button>
      </div>
    </div>
  </div>
);

export default SystemReportsModal; 