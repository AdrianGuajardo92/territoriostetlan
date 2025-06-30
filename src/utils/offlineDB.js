// 🗄️ BASE DE DATOS OFFLINE COMPLETA - IndexedDB con Dexie
// Permite trabajar 100% sin internet y sincronizar después

import Dexie from 'dexie';

// Configuración de la base de datos offline
class TerritoriosOfflineDB extends Dexie {
  constructor() {
    super('TerritoriosOfflineDB');
    
    this.version(1).stores({
      // Territorios - Replica completa de Firebase
      territories: '++id, name, status, assignedTo, assignedDate, completedDate, completedBy, lastWorked, addressCount, createdAt, updatedAt',
      
      // Direcciones - Replica completa de Firebase  
      addresses: '++id, territoryId, address, notes, isVisited, gender, revisitaBy, estudioBy, latitude, longitude, createdAt, updatedAt, lastUpdated, createdBy, isRevisita, isEstudio',
      
      // Usuarios - Para funcionamiento offline
      users: '++id, name, email, role, createdAt, updatedAt',
      
      // Propuestas - Para enviar cuando haya conexión
      proposals: '++id, type, addressId, territoryId, proposedBy, proposedByName, status, changes, reason, createdAt, syncStatus',
      
      // Historial de territorios - Para estadísticas offline
      territoryHistory: '++id, territoryId, territoryName, assignedTo, status, assignedDate, completedDate, createdAt',
      
      // Cola de sincronización - Operaciones pendientes
      syncQueue: '++id, operation, collection, docId, data, timestamp, retryCount, lastError',
      
      // Metadatos - Control de sincronización
      syncMetadata: 'key, value, lastSync, version'
    });

    // Hooks para debugging
    this.territories.hook('creating', (primKey, obj, trans) => {
      console.log('📄 Creando territorio offline:', obj.name);
    });

    this.addresses.hook('creating', (primKey, obj, trans) => {
      console.log('🏠 Creando dirección offline:', obj.address);
    });
  }
}

// Instancia única de la base de datos
export const offlineDB = new TerritoriosOfflineDB();

// 🔄 SISTEMA DE SINCRONIZACIÓN
export class OfflineSyncManager {
  constructor(db, firebaseContext) {
    this.db = db;
    this.firebase = firebaseContext;
    this.isOnline = navigator.onLine;
    this.syncInProgress = false;
    
    // Listeners para conectividad
    this.setupConnectivityListeners();
  }

  setupConnectivityListeners() {
    window.addEventListener('online', () => {
      console.log('🌐 Conexión restaurada - iniciando sincronización');
      this.isOnline = true;
      this.startSync();
    });

    window.addEventListener('offline', () => {
      console.log('📴 Sin conexión - modo offline activado');
      this.isOnline = false;
    });
  }

  // ✅ SINCRONIZACIÓN COMPLETA
  async startSync() {
    if (this.syncInProgress || !this.isOnline) return;
    
    console.log('🔄 Iniciando sincronización completa...');
    this.syncInProgress = true;

    try {
      // 1. Sincronizar cola de operaciones pendientes
      await this.syncPendingOperations();
      
      // 2. Sincronizar datos desde Firebase
      await this.syncFromFirebase();
      
      // 3. Actualizar metadatos de sincronización
      await this.updateSyncMetadata();
      
      console.log('✅ Sincronización completa exitosa');
    } catch (error) {
      console.error('❌ Error en sincronización:', error);
    } finally {
      this.syncInProgress = false;
    }
  }

  // 📤 SINCRONIZAR OPERACIONES PENDIENTES
  async syncPendingOperations() {
    const pendingOps = await this.db.syncQueue.orderBy('timestamp').toArray();
    
    console.log(`📤 Sincronizando ${pendingOps.length} operaciones pendientes`);
    
    for (const op of pendingOps) {
      try {
        await this.executePendingOperation(op);
        await this.db.syncQueue.delete(op.id);
        console.log('✅ Operación sincronizada:', op.operation);
      } catch (error) {
        console.error('❌ Error sincronizando operación:', error);
        
        // Incrementar contador de reintentos
        await this.db.syncQueue.update(op.id, {
          retryCount: (op.retryCount || 0) + 1,
          lastError: error.message
        });
        
        // Si ha fallado muchas veces, marcar como error permanente
        if ((op.retryCount || 0) >= 3) {
          console.error('🚫 Operación marcada como error permanente:', op);
        }
      }
    }
  }

  // 🎯 EJECUTAR OPERACIÓN PENDIENTE
  async executePendingOperation(op) {
    switch (op.operation) {
      case 'CREATE_ADDRESS':
        return await this.firebase.handleAddNewAddress(op.data.territoryId, op.data);
        
      case 'UPDATE_ADDRESS':
        return await this.firebase.handleUpdateAddress(op.docId, op.data);
        
      case 'DELETE_ADDRESS':
        return await this.firebase.handleDeleteAddress(op.docId);
        
      case 'TOGGLE_ADDRESS_STATUS':
        return await this.firebase.handleToggleAddressStatus(op.docId, op.data.currentStatus);
        
      case 'ASSIGN_TERRITORY':
        return await this.firebase.handleAssignTerritory(op.docId, op.data.publisherName);
        
      case 'RETURN_TERRITORY':
        return await this.firebase.handleReturnTerritory(op.docId);
        
      case 'COMPLETE_TERRITORY':
        return await this.firebase.handleCompleteTerritory(op.docId);
        
      case 'CREATE_PROPOSAL':
        return await this.firebase.handleProposeAddressChange(op.data.addressId, op.data.changes, op.data.reason);
        
      default:
        throw new Error(`Operación desconocida: ${op.operation}`);
    }
  }

  // 📥 SINCRONIZAR DESDE FIREBASE
  async syncFromFirebase() {
    console.log('📥 Sincronizando datos desde Firebase');
    
    try {
      // Obtener timestamp de última sincronización
      const lastSync = await this.getLastSyncTimestamp();
      
      // Sincronizar territorios
      const territories = await this.firebase.getTerritories();
      await this.db.territories.clear();
      await this.db.territories.bulkAdd(territories);
      
      // Sincronizar direcciones
      const addresses = await this.firebase.getAddresses();
      await this.db.addresses.clear();
      await this.db.addresses.bulkAdd(addresses);
      
      // Sincronizar usuarios
      const users = await this.firebase.getUsers();
      await this.db.users.clear();
      await this.db.users.bulkAdd(users);
      
      console.log('✅ Datos sincronizados desde Firebase');
    } catch (error) {
      console.error('❌ Error sincronizando desde Firebase:', error);
      throw error;
    }
  }

  // 🕒 OBTENER TIMESTAMP DE ÚLTIMA SINCRONIZACIÓN
  async getLastSyncTimestamp() {
    const metadata = await this.db.syncMetadata.get('lastFullSync');
    return metadata?.value || 0;
  }

  // 📝 ACTUALIZAR METADATOS DE SINCRONIZACIÓN
  async updateSyncMetadata() {
    const now = Date.now();
    await this.db.syncMetadata.put({
      key: 'lastFullSync',
      value: now,
      lastSync: new Date(),
      version: '1.0.0'
    });
  }

  // 📝 AGREGAR OPERACIÓN A LA COLA
  async addToSyncQueue(operation, collection, docId, data) {
    console.log(`📝 Agregando a cola: ${operation}`);
    
    return await this.db.syncQueue.add({
      operation,
      collection,
      docId,
      data,
      timestamp: Date.now(),
      retryCount: 0,
      lastError: null
    });
  }

  // 📊 OBTENER ESTADÍSTICAS DE SINCRONIZACIÓN
  async getSyncStats() {
    const pendingOps = await this.db.syncQueue.count();
    const lastSync = await this.getLastSyncTimestamp();
    const territories = await this.db.territories.count();
    const addresses = await this.db.addresses.count();
    
    return {
      pendingOps,
      lastSync: lastSync ? new Date(lastSync) : null,
      territories,
      addresses,
      isOnline: this.isOnline,
      syncInProgress: this.syncInProgress
    };
  }
}

// 🎯 FUNCIONES DE UTILIDAD PARA DATOS OFFLINE

// Obtener todos los territorios offline
export const getOfflineTerritories = async () => {
  return await offlineDB.territories.orderBy('name').toArray();
};

// Obtener direcciones de un territorio offline
export const getOfflineAddresses = async (territoryId) => {
  return await offlineDB.addresses.where('territoryId').equals(territoryId).toArray();
};

// Obtener todas las direcciones offline
export const getAllOfflineAddresses = async () => {
  return await offlineDB.addresses.toArray();
};

// Guardar territorio offline
export const saveOfflineTerritory = async (territory) => {
  return await offlineDB.territories.put(territory);
};

// Guardar dirección offline
export const saveOfflineAddress = async (address) => {
  return await offlineDB.addresses.put(address);
};

// Eliminar dirección offline
export const deleteOfflineAddress = async (addressId) => {
  return await offlineDB.addresses.delete(addressId);
};

// Buscar direcciones offline
export const searchOfflineAddresses = async (query) => {
  const addresses = await offlineDB.addresses.toArray();
  return addresses.filter(addr => 
    addr.address.toLowerCase().includes(query.toLowerCase()) ||
    (addr.notes && addr.notes.toLowerCase().includes(query.toLowerCase()))
  );
};

// Obtener estadísticas offline
export const getOfflineStats = async () => {
  const territories = await offlineDB.territories.toArray();
  const addresses = await offlineDB.addresses.toArray();
  
  const totalTerritories = territories.length;
  const assignedTerritories = territories.filter(t => t.status === 'En uso').length;
  const completedTerritories = territories.filter(t => t.status === 'Completado').length;
  
  const totalAddresses = addresses.length;
  const visitedAddresses = addresses.filter(a => a.isVisited).length;
  
  return {
    territories: {
      total: totalTerritories,
      assigned: assignedTerritories,
      completed: completedTerritories,
      available: totalTerritories - assignedTerritories - completedTerritories
    },
    addresses: {
      total: totalAddresses,
      visited: visitedAddresses,
      pending: totalAddresses - visitedAddresses
    }
  };
};

// 🧹 FUNCIONES DE MANTENIMIENTO

// Limpiar datos antiguos
export const cleanupOfflineData = async (daysOld = 30) => {
  const cutoffDate = Date.now() - (daysOld * 24 * 60 * 60 * 1000);
  
  // Limpiar operaciones de sincronización muy antiguas
  await offlineDB.syncQueue.where('timestamp').below(cutoffDate).delete();
  
  // Limpiar historial muy antiguo
  await offlineDB.territoryHistory.where('createdAt').below(new Date(cutoffDate)).delete();
  
  console.log(`🧹 Datos offline limpiados (más de ${daysOld} días)`);
};

// Obtener tamaño de la base de datos
export const getOfflineDBSize = async () => {
  try {
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      const estimate = await navigator.storage.estimate();
      return {
        used: estimate.usage,
        available: estimate.quota,
        usedMB: Math.round((estimate.usage / 1024 / 1024) * 100) / 100,
        availableMB: Math.round((estimate.quota / 1024 / 1024) * 100) / 100
      };
    }
  } catch (error) {
    console.error('Error obteniendo tamaño de DB:', error);
  }
  return null;
};

console.log('🗄️ Sistema de base de datos offline inicializado'); 