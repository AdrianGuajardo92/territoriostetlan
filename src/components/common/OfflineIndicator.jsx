// 📴 INDICADOR DE ESTADO OFFLINE/ONLINE
// Muestra el estado de conectividad y sincronización al usuario

import React, { useState } from 'react';
import Icon from './Icon';
import { useApp } from '../../context/AppContext';

const OfflineIndicator = () => {
  const { offlineSync } = useApp();
  const [showDetails, setShowDetails] = useState(false);

  // Si no está inicializado, no mostrar nada
  if (!offlineSync?.isInitialized) return null;

  const { isOnline, syncStatus, canWorkOffline } = offlineSync;

  // Determinar el color y estado del indicador
  const getIndicatorState = () => {
    if (!isOnline && canWorkOffline) {
      return {
        color: 'bg-amber-500',
        icon: 'wifiOff',
        text: 'Offline',
        description: 'Trabajando sin conexión'
      };
    }
    
    if (isOnline && syncStatus.isLoading) {
      return {
        color: 'bg-blue-500',
        icon: 'refresh',
        text: 'Sincronizando',
        description: 'Actualizando datos'
      };
    }
    
    if (isOnline && syncStatus.pendingOps > 0) {
      return {
        color: 'bg-orange-500',
        icon: 'upload',
        text: `${syncStatus.pendingOps} pendientes`,
        description: 'Cambios esperando sincronización'
      };
    }
    
    if (isOnline) {
      return {
        color: 'bg-green-500',
        icon: 'wifi',
        text: 'Online',
        description: 'Conectado y sincronizado'
      };
    }
    
    // Offline sin capacidad de trabajo offline
    return {
      color: 'bg-red-500',
      icon: 'wifiOff',
      text: 'Sin conexión',
      description: 'No se pueden realizar cambios'
    };
  };

  const indicatorState = getIndicatorState();

  const formatLastSync = (lastSync) => {
    if (!lastSync) return 'Nunca';
    
    const now = new Date();
    const diff = now - lastSync;
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (minutes < 1) return 'Hace un momento';
    if (minutes < 60) return `Hace ${minutes}m`;
    if (hours < 24) return `Hace ${hours}h`;
    return `Hace ${days}d`;
  };

  return (
    <div className="fixed top-4 left-4 z-40">
      {/* Indicador principal */}
      <div 
        className={`
          ${indicatorState.color} text-white px-3 py-2 rounded-lg shadow-lg
          flex items-center space-x-2 cursor-pointer
          transition-all duration-200 hover:shadow-xl
          ${syncStatus.isLoading ? 'animate-pulse' : ''}
        `}
        onClick={() => setShowDetails(!showDetails)}
      >
        <Icon 
          name={indicatorState.icon} 
          size={16} 
          className={`${syncStatus.isLoading ? 'animate-spin' : ''}`}
        />
        <span className="text-sm font-medium">{indicatorState.text}</span>
      </div>
      
      {/* Panel de detalles */}
      {showDetails && (
        <>
          {/* Backdrop para cerrar */}
          <div 
            className="fixed inset-0 z-30" 
            onClick={() => setShowDetails(false)}
          />
          
          {/* Panel de información */}
          <div className="absolute top-12 left-0 w-72 bg-white rounded-lg shadow-xl border border-gray-200 z-40 overflow-hidden">
            {/* Header */}
            <div className={`${indicatorState.color} text-white px-4 py-3`}>
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">Estado de Conexión</h3>
                <button 
                  onClick={() => setShowDetails(false)}
                  className="hover:bg-white/20 rounded p-1 transition-colors"
                >
                  <Icon name="x" size={16} />
                </button>
              </div>
              <p className="text-sm opacity-90 mt-1">{indicatorState.description}</p>
            </div>
            
            {/* Contenido */}
            <div className="p-4 space-y-3">
              {/* Estado de conexión */}
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Conexión a Internet</span>
                <div className="flex items-center space-x-2">
                  <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-500' : 'bg-red-500'}`} />
                  <span className="text-sm font-medium">{isOnline ? 'Conectado' : 'Desconectado'}</span>
                </div>
              </div>
              
              {/* Capacidad offline */}
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Modo Offline</span>
                <div className="flex items-center space-x-2">
                  <div className={`w-2 h-2 rounded-full ${canWorkOffline ? 'bg-green-500' : 'bg-gray-300'}`} />
                  <span className="text-sm font-medium">{canWorkOffline ? 'Disponible' : 'No disponible'}</span>
                </div>
              </div>
              
              {/* Operaciones pendientes */}
              {syncStatus.pendingOps > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Cambios pendientes</span>
                  <span className="text-sm font-medium text-orange-600">{syncStatus.pendingOps}</span>
                </div>
              )}
              
              {/* Última sincronización */}
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Última sincronización</span>
                <span className="text-sm font-medium">{formatLastSync(syncStatus.lastSync)}</span>
              </div>
              
              {/* Botón de sincronización manual */}
              {isOnline && (
                <div className="pt-2 border-t border-gray-100">
                  <button
                    onClick={() => {
                      offlineSync.forceSync();
                      setShowDetails(false);
                    }}
                    disabled={syncStatus.isLoading}
                    className={`
                      w-full px-3 py-2 rounded-lg text-sm font-medium
                      transition-colors flex items-center justify-center space-x-2
                      ${syncStatus.isLoading 
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                        : 'bg-blue-600 text-white hover:bg-blue-700'
                      }
                    `}
                  >
                    <Icon 
                      name="refresh" 
                      size={14} 
                      className={syncStatus.isLoading ? 'animate-spin' : ''} 
                    />
                    <span>{syncStatus.isLoading ? 'Sincronizando...' : 'Sincronizar Ahora'}</span>
                  </button>
                </div>
              )}
              
              {/* Mensaje de trabajo offline */}
              {!isOnline && canWorkOffline && (
                <div className="pt-2 border-t border-gray-100">
                  <div className="flex items-start space-x-2 p-3 bg-amber-50 rounded-lg">
                    <Icon name="info" size={16} className="text-amber-600 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-amber-800">Modo Offline Activo</p>
                      <p className="text-xs text-amber-700 mt-1">
                        Tus cambios se guardarán localmente y se sincronizarán cuando vuelva la conexión.
                      </p>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Error si hay */}
              {syncStatus.error && (
                <div className="pt-2 border-t border-gray-100">
                  <div className="flex items-start space-x-2 p-3 bg-red-50 rounded-lg">
                    <Icon name="alertCircle" size={16} className="text-red-600 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-red-800">Error de Sincronización</p>
                      <p className="text-xs text-red-700 mt-1">{syncStatus.error}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default OfflineIndicator; 