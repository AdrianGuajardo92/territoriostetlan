// 🌐 HOOK PARA GESTIÓN OFFLINE/ONLINE COMPLETA
// Detecta conectividad, sincroniza automáticamente y gestiona datos offline

import { useState, useEffect, useRef, useCallback } from 'react';
import { offlineDB, OfflineSyncManager } from '../utils/offlineDB';

export const useOfflineSync = (firebaseContext, showToast) => {
  // Estados principales
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isInitialized, setIsInitialized] = useState(false);
  const [syncStatus, setSyncStatus] = useState({
    isLoading: false,
    lastSync: null,
    pendingOps: 0,
    error: null
  });

  // Referencias para gestión de sync
  const syncManagerRef = useRef(null);
  const initRetryTimeoutRef = useRef(null);

  // 🔄 INICIALIZAR SISTEMA OFFLINE
  const initializeOfflineSystem = useCallback(async () => {
    try {
      console.log('🚀 Inicializando sistema offline...');
      
      // Limpiar timeout previo si existe
      if (initRetryTimeoutRef.current) {
        clearTimeout(initRetryTimeoutRef.current);
      }

      // Verificar si la DB está disponible
      await offlineDB.open();
      console.log('✅ Base de datos offline abierta');

      // Crear manager de sincronización
      if (firebaseContext && !syncManagerRef.current) {
        syncManagerRef.current = new OfflineSyncManager(offlineDB, firebaseContext);
        console.log('✅ Manager de sincronización creado');
      }

      // Si hay conexión, sincronizar inmediatamente
      if (isOnline && syncManagerRef.current) {
        await syncManagerRef.current.startSync();
        showToast && showToast('📱 Datos sincronizados para uso offline', 'success', 3000);
      }

      // Actualizar estado
      await updateSyncStatus();
      setIsInitialized(true);

      console.log('🎉 Sistema offline inicializado correctamente');
    } catch (error) {
      console.error('❌ Error inicializando sistema offline:', error);
      
      // Reintentar en 5 segundos
      initRetryTimeoutRef.current = setTimeout(() => {
        console.log('🔄 Reintentando inicialización offline...');
        initializeOfflineSystem();
      }, 5000);
    }
  }, [firebaseContext, isOnline, showToast]);

  // 📊 ACTUALIZAR ESTADÍSTICAS DE SINCRONIZACIÓN
  const updateSyncStatus = useCallback(async () => {
    if (!syncManagerRef.current) return;

    try {
      const stats = await syncManagerRef.current.getSyncStats();
      setSyncStatus(prev => ({
        ...prev,
        lastSync: stats.lastSync,
        pendingOps: stats.pendingOps,
        error: null
      }));
    } catch (error) {
      console.error('Error actualizando estado de sync:', error);
      setSyncStatus(prev => ({ ...prev, error: error.message }));
    }
  }, []);

  // 🔄 FORZAR SINCRONIZACIÓN MANUAL
  const forcSync = useCallback(async () => {
    if (!syncManagerRef.current || !isOnline) {
      showToast && showToast('Sin conexión - no se puede sincronizar', 'warning');
      return false;
    }

    try {
      setSyncStatus(prev => ({ ...prev, isLoading: true, error: null }));
      
      await syncManagerRef.current.startSync();
      await updateSyncStatus();
      
      showToast && showToast('✅ Sincronización manual completada', 'success');
      return true;
    } catch (error) {
      console.error('Error en sincronización manual:', error);
      setSyncStatus(prev => ({ ...prev, error: error.message }));
      showToast && showToast('Error en sincronización manual', 'error');
      return false;
    } finally {
      setSyncStatus(prev => ({ ...prev, isLoading: false }));
    }
  }, [isOnline, showToast, updateSyncStatus]);

  // 📝 AGREGAR OPERACIÓN A LA COLA (para uso offline)
  const addToSyncQueue = useCallback(async (operation, collection, docId, data) => {
    if (!syncManagerRef.current) {
      console.error('Sync manager no está inicializado');
      return false;
    }

    try {
      await syncManagerRef.current.addToSyncQueue(operation, collection, docId, data);
      await updateSyncStatus();
      
      if (!isOnline) {
        showToast && showToast('💾 Cambio guardado offline - se sincronizará cuando haya conexión', 'info', 4000);
      }
      
      return true;
    } catch (error) {
      console.error('Error agregando a cola de sync:', error);
      showToast && showToast('Error guardando cambio offline', 'error');
      return false;
    }
  }, [isOnline, showToast, updateSyncStatus]);

  // 🌐 LISTENERS DE CONECTIVIDAD
  useEffect(() => {
    const handleOnline = () => {
      console.log('🌐 Conexión detectada');
      setIsOnline(true);
      
      // Sincronizar automáticamente cuando se recupere la conexión
      if (syncManagerRef.current) {
        setTimeout(() => {
          syncManagerRef.current.startSync();
          showToast && showToast('🌐 Conexión restaurada - sincronizando...', 'info', 3000);
        }, 1000); // Pequeña pausa para estabilizar conexión
      }
    };

    const handleOffline = () => {
      console.log('📴 Sin conexión detectada');
      setIsOnline(false);
      showToast && showToast('📴 Sin conexión - trabajando offline', 'warning', 3000);
    };

    // Agregar listeners
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Cleanup
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      if (initRetryTimeoutRef.current) {
        clearTimeout(initRetryTimeoutRef.current);
      }
    };
  }, [showToast]);

  // 🚀 INICIALIZACIÓN AL MONTAR EL COMPONENTE
  useEffect(() => {
    if (firebaseContext && !isInitialized) {
      initializeOfflineSystem();
    }
  }, [firebaseContext, isInitialized, initializeOfflineSystem]);

  // 🔄 ACTUALIZAR ESTADÍSTICAS PERIÓDICAMENTE
  useEffect(() => {
    if (!isInitialized) return;

    const interval = setInterval(updateSyncStatus, 30000); // Cada 30 segundos
    return () => clearInterval(interval);
  }, [isInitialized, updateSyncStatus]);

  // 📊 FUNCIONES DE DATOS OFFLINE
  const offlineHelpers = {
    // Obtener territorios desde offline DB
    getTerritories: async () => {
      try {
        return await offlineDB.territories.orderBy('name').toArray();
      } catch (error) {
        console.error('Error obteniendo territorios offline:', error);
        return [];
      }
    },

    // Obtener direcciones desde offline DB
    getAddresses: async (territoryId = null) => {
      try {
        if (territoryId) {
          return await offlineDB.addresses.where('territoryId').equals(territoryId).toArray();
        }
        return await offlineDB.addresses.toArray();
      } catch (error) {
        console.error('Error obteniendo direcciones offline:', error);
        return [];
      }
    },

    // Buscar direcciones offline
    searchAddresses: async (query) => {
      try {
        const addresses = await offlineDB.addresses.toArray();
        return addresses.filter(addr => 
          addr.address.toLowerCase().includes(query.toLowerCase()) ||
          (addr.notes && addr.notes.toLowerCase().includes(query.toLowerCase()))
        );
      } catch (error) {
        console.error('Error buscando direcciones offline:', error);
        return [];
      }
    },

    // Obtener estadísticas offline
    getStats: async () => {
      try {
        const territories = await offlineDB.territories.toArray();
        const addresses = await offlineDB.addresses.toArray();
        
        return {
          territories: {
            total: territories.length,
            assigned: territories.filter(t => t.status === 'En uso').length,
            completed: territories.filter(t => t.status === 'Completado').length,
            available: territories.filter(t => t.status === 'Disponible').length
          },
          addresses: {
            total: addresses.length,
            visited: addresses.filter(a => a.isVisited).length,
            pending: addresses.filter(a => !a.isVisited).length
          }
        };
      } catch (error) {
        console.error('Error obteniendo estadísticas offline:', error);
        return null;
      }
    },

    // Limpiar datos antiguos
    cleanup: async (daysOld = 30) => {
      try {
        const cutoffDate = Date.now() - (daysOld * 24 * 60 * 60 * 1000);
        
        // Limpiar operaciones muy antiguas
        await offlineDB.syncQueue.where('timestamp').below(cutoffDate).delete();
        
        // Limpiar historial muy antiguo
        await offlineDB.territoryHistory.where('createdAt').below(new Date(cutoffDate)).delete();
        
        console.log(`🧹 Datos offline limpiados (${daysOld} días)`);
        showToast && showToast('🧹 Datos offline limpiados', 'success');
      } catch (error) {
        console.error('Error limpiando datos offline:', error);
        showToast && showToast('Error limpiando datos offline', 'error');
      }
    }
  };

  return {
    // Estados
    isOnline,
    isInitialized,
    syncStatus,
    
    // Funciones de control
    forceSync: forcSync,
    addToSyncQueue,
    
    // Helpers para datos offline
    offline: offlineHelpers,
    
    // Información del sistema
    canWorkOffline: isInitialized,
    hasInternet: isOnline,
    syncManager: syncManagerRef.current
  };
};

export default useOfflineSync; 