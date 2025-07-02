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
      collectSystemData();
    }
  }, [isOpen]);

  const collectSystemData = async () => {
    setIsLoading(true);
    
    try {
      const data = {
        performance: await getPerformanceData(),
        errors: getErrorLogs(),
        browser: getBrowserInfo(),
        storage: await getStorageInfo(),
        network: await getNetworkInfo(),
        cache: await getCacheInfo(),
        serviceWorker: await getServiceWorkerInfo()
      };
      
      setSystemData(data);
    } catch (error) {
      console.error('Error recolectando datos del sistema:', error);
      showToast('Error al recolectar datos del sistema', 'error');
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
        const registration = await navigator.serviceWorker.getRegistration();
        sw.registered = !!registration;
        
        if (registration) {
          sw.state = registration.active?.state || 'unknown';
          sw.scriptURL = registration.active?.scriptURL || 'unknown';
          sw.scope = registration.scope;
        }
        
        sw.controller = !!navigator.serviceWorker.controller;
      } catch (e) {
        sw.error = e.message;
      }
    } else {
      sw.supported = false;
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

  const tabs = [
    { id: 'overview', label: 'Resumen', icon: 'chart-bar' },
    { id: 'performance', label: 'Rendimiento', icon: 'tachometer-alt' },
    { id: 'errors', label: 'Errores', icon: 'exclamation-triangle' },
    { id: 'browser', label: 'Navegador', icon: 'globe' },
    { id: 'storage', label: 'Almacenamiento', icon: 'database' },
    { id: 'network', label: 'Red', icon: 'wifi' }
  ];

  if (!isOpen) return null;

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      title="📊 Reportes del Sistema"
      size="xl"
      modalId={modalId}
    >
      {/* CORRECCIÓN: Estructura con scroll optimizada */}
      <div className="flex flex-col h-full max-h-[85vh]">
        {/* Header con acciones - FIJO */}
        <div className="flex-shrink-0 pb-4 border-b border-gray-200">
          <div className="flex justify-between items-center mb-4">
            <div className="flex space-x-2">
              <button
                onClick={collectSystemData}
                disabled={isLoading}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
              >
                <i className={`fas fa-sync-alt ${isLoading ? 'animate-spin' : ''}`}></i>
                {isLoading ? 'Actualizando...' : 'Actualizar'}
              </button>
              
              <button
                onClick={exportReport}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
              >
                <i className="fas fa-download"></i>
                Exportar
              </button>
              
              <button
                onClick={clearLogs}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center gap-2"
              >
                <i className="fas fa-trash"></i>
                Limpiar Logs
              </button>
            </div>
            
            <div className="text-sm text-gray-500">
              Última actualización: {new Date().toLocaleTimeString()}
            </div>
          </div>

          {/* Tabs - FIJO */}
          <nav className="flex space-x-8 overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap flex items-center gap-2 ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <i className={`fas fa-${tab.icon}`}></i>
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Content con SCROLL */}
        <div className="flex-1 overflow-y-auto pt-6 min-h-0">
          <div className="pr-2"> {/* Padding para el scrollbar */}
            {isLoading ? (
              <div className="flex items-center justify-center h-64">
                <div className="text-center">
                  <i className="fas fa-spinner fa-spin text-4xl text-blue-600 mb-4"></i>
                  <p className="text-gray-600">Recolectando datos del sistema...</p>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                {activeTab === 'overview' && <OverviewTab data={systemData} />}
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
    </Modal>
  );
};

// Componentes de tabs
const OverviewTab = ({ data }) => (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
    <div className="bg-blue-50 p-4 rounded-lg">
      <div className="flex items-center gap-3">
        <i className="fas fa-tachometer-alt text-blue-600 text-xl"></i>
        <div>
          <h3 className="font-semibold text-blue-900">Rendimiento</h3>
          <p className="text-blue-700">{data.performance?.loadTime || 0}ms de carga</p>
        </div>
      </div>
    </div>
    
    <div className="bg-green-50 p-4 rounded-lg">
      <div className="flex items-center gap-3">
        <i className="fas fa-check-circle text-green-600 text-xl"></i>
        <div>
          <h3 className="font-semibold text-green-900">Service Worker</h3>
          <p className="text-green-700">{data.serviceWorker?.registered ? 'Activo' : 'Inactivo'}</p>
        </div>
      </div>
    </div>
    
    <div className="bg-yellow-50 p-4 rounded-lg">
      <div className="flex items-center gap-3">
        <i className="fas fa-exclamation-triangle text-yellow-600 text-xl"></i>
        <div>
          <h3 className="font-semibold text-yellow-900">Errores</h3>
          <p className="text-yellow-700">{data.errors?.length || 0} registrados</p>
        </div>
      </div>
    </div>
    
    <div className="bg-purple-50 p-4 rounded-lg">
      <div className="flex items-center gap-3">
        <i className="fas fa-globe text-purple-600 text-xl"></i>
        <div>
          <h3 className="font-semibold text-purple-900">Navegador</h3>
          <p className="text-purple-700">{data.browser?.browser || 'Desconocido'}</p>
        </div>
      </div>
    </div>
    
    <div className="bg-indigo-50 p-4 rounded-lg">
      <div className="flex items-center gap-3">
        <i className="fas fa-wifi text-indigo-600 text-xl"></i>
        <div>
          <h3 className="font-semibold text-indigo-900">Conexión</h3>
          <p className="text-indigo-700">{data.network?.online ? 'Online' : 'Offline'}</p>
        </div>
      </div>
    </div>
    
    <div className="bg-gray-50 p-4 rounded-lg">
      <div className="flex items-center gap-3">
        <i className="fas fa-database text-gray-600 text-xl"></i>
        <div>
          <h3 className="font-semibold text-gray-900">Cache</h3>
          <p className="text-gray-700">{data.cache?.caches || 0} caches</p>
        </div>
      </div>
    </div>
  </div>
);

const PerformanceTab = ({ data }) => (
  <div className="space-y-6">
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div className="bg-white p-4 rounded-lg border">
        <h3 className="font-semibold mb-3 flex items-center gap-2">
          <i className="fas fa-clock text-blue-600"></i>
          Tiempos de Carga
        </h3>
        <div className="space-y-2">
          <div className="flex justify-between">
            <span>Tiempo total:</span>
            <span className="font-mono">{data.loadTime || 0}ms</span>
          </div>
          <div className="flex justify-between">
            <span>DOM Content Loaded:</span>
            <span className="font-mono">{data.domContentLoaded || 0}ms</span>
          </div>
          <div className="flex justify-between">
            <span>First Paint:</span>
            <span className="font-mono">{Math.round(data.firstPaint || 0)}ms</span>
          </div>
          <div className="flex justify-between">
            <span>First Contentful Paint:</span>
            <span className="font-mono">{Math.round(data.firstContentfulPaint || 0)}ms</span>
          </div>
        </div>
      </div>
      
      <div className="bg-white p-4 rounded-lg border">
        <h3 className="font-semibold mb-3 flex items-center gap-2">
          <i className="fas fa-memory text-green-600"></i>
          Recursos del Sistema
        </h3>
        <div className="space-y-2">
          <div className="flex justify-between">
            <span>Memoria del dispositivo:</span>
            <span className="font-mono">{data.memoryUsage}GB</span>
          </div>
          {data.connection && (
            <>
              <div className="flex justify-between">
                <span>Tipo de conexión:</span>
                <span className="font-mono">{data.connection.effectiveType}</span>
              </div>
              <div className="flex justify-between">
                <span>Velocidad de descarga:</span>
                <span className="font-mono">{data.connection.downlink}Mbps</span>
              </div>
              <div className="flex justify-between">
                <span>Latencia:</span>
                <span className="font-mono">{data.connection.rtt}ms</span>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  </div>
);

const ErrorsTab = ({ data }) => (
  <div className="space-y-4">
    {data && data.length > 0 ? (
      data.map((error, index) => (
        <div key={index} className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <i className="fas fa-exclamation-circle text-red-600 mt-1 flex-shrink-0"></i>
            <div className="flex-1 min-w-0">
              <div className="flex justify-between items-start mb-2">
                <h4 className="font-semibold text-red-900 truncate">{error.type || 'Error'}</h4>
                <span className="text-sm text-red-600 flex-shrink-0 ml-2">{error.timestamp}</span>
              </div>
              <p className="text-red-800 mb-2 break-words">{error.message}</p>
              {error.stack && (
                <details className="text-sm">
                  <summary className="cursor-pointer text-red-700 hover:text-red-900">
                    Ver stack trace
                  </summary>
                  <pre className="mt-2 p-2 bg-red-100 rounded text-xs overflow-x-auto max-h-40 overflow-y-auto">
                    {error.stack}
                  </pre>
                </details>
              )}
            </div>
          </div>
        </div>
      ))
    ) : (
      <div className="text-center py-8">
        <i className="fas fa-check-circle text-green-600 text-4xl mb-4"></i>
        <p className="text-gray-600">No hay errores registrados</p>
      </div>
    )}
  </div>
);

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

export default SystemReportsModal; 