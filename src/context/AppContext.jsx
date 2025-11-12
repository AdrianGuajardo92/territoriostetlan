import React, { createContext, useContext, useState, useEffect, useRef, useMemo, useCallback } from 'react';
// Firebase Auth no necesario - usamos sistema personalizado
import { 
  collection, 
  query, 
  onSnapshot, 
  doc, 
  updateDoc, 
  addDoc, 
  deleteDoc, 
  serverTimestamp, 
  where,
  orderBy,
  getDoc,
  getDocs,
  writeBatch
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { useToast } from '../hooks/useToast';

const AppContext = createContext();

export const testFirebaseConnection = async () => {
  try {
    const testQuery = query(collection(db, 'territories'), orderBy('name'), where('name', '!=', null));
    await getDocs(testQuery);
  
    return true;
  } catch (error) {
    console.error('❌ Error de conexión Firebase:', error);
    return false;
  }
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within AppProvider');
  }
  return context;
};

export const AppProvider = ({ children }) => {
  // Estados principales
  const [currentUser, setCurrentUser] = useState(null);
  const [territories, setTerritories] = useState([]);
  const [addresses, setAddresses] = useState([]);
  const [publishers, setPublishers] = useState([]);
  const [users, setUsers] = useState([]);
  const [proposals, setProposals] = useState([]);
  const [territoryHistory, setTerritoryHistory] = useState([]); // Agregar estado para historial
  const [campaigns, setCampaigns] = useState([]); // Estado para campañas especiales
  const [isLoading, setIsLoading] = useState(true);
  const [authLoading, setAuthLoading] = useState(true);
  const [adminEditMode, setAdminEditMode] = useState(false);

  // ✅ NUEVO: Estados para notificaciones
  const [userNotificationsCount, setUserNotificationsCount] = useState(0);
  const [pendingProposalsCount, setPendingProposalsCount] = useState(0);

  // Referencias para cleanup
  const unsubscribesRef = useRef([]);
  
  // CORRECCIÓN: Mover useToast DENTRO del componente
  const { showToast } = useToast();

  // Estado para la versión dinámica
  const [appVersion, setAppVersion] = useState('2.15.3'); // Valor por defecto limpio sin logs
  
  // 📋 Cargar versión desde version.json
  const loadAppVersion = async () => {
    try {
      const response = await fetch('/version.json?t=' + Date.now(), {
        cache: 'no-cache',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        }
      });
      
      if (response.ok) {
        const versionData = await response.json();
        setAppVersion(versionData.version);
        
        // Forzar actualización del título de la página
        if (typeof document !== 'undefined') {
          document.title = `Territorios - ${versionData.version}`;
        }
      }
    } catch (error) {
      // Silenciosamente usar la versión por defecto si hay error
      // No mostrar error en consola para mantenerla limpia
    }
  };
  
  // 🔐 AUTH FUNCTIONS - SISTEMA PERSONALIZADO CON CÓDIGOS DE ACCESO
  const login = async (accessCode, password) => {
    try {
  
      
      // Buscar usuario por código de acceso en Firestore
      const usersQuery = query(
        collection(db, 'users'), 
        where('accessCode', '==', accessCode)
      );
      
      const querySnapshot = await getDocs(usersQuery);

      if (querySnapshot.empty) {
        return {
          success: false,
          error: 'Código de acceso incorrecto'
        };
      }

      const userDoc = querySnapshot.docs[0];
      const userData = userDoc.data();

      // Validar contraseña
      if (!userData.password || userData.password !== password) {
        return {
          success: false,
          error: 'Contraseña incorrecta'
        };
      }

      // Login exitoso - crear sesión personalizada
      const user = {
        id: userDoc.id,
        accessCode: userData.accessCode,
        name: userData.name,
        role: userData.role || 'user',
        ...userData
      };

      
      
      // Guardar usuario en sessionStorage para persistencia
      sessionStorage.setItem('currentUser', JSON.stringify(user));
      
      setCurrentUser(user);
      setAuthLoading(false);
      
      return { 
        success: true, 
        user 
      };

    } catch (error) {
      console.error('❌ Error en login:', error);
      return { 
        success: false, 
        error: 'Error de conexión. Verifica tu internet.' 
      };
    }
  };

  const logout = async () => {
    try {
      // Limpiar listeners de Firebase
      unsubscribesRef.current.forEach(unsubscribe => {
        if (typeof unsubscribe === 'function') {
          unsubscribe();
        }
      });
      unsubscribesRef.current = [];
      
      // Limpiar sessionStorage
      sessionStorage.removeItem('currentUser');
      
      // Resetear estados
      setCurrentUser(null);
      setTerritories([]);
      setAddresses([]);
      setPublishers([]);
      setUsers([]);
      setProposals([]);
      setAdminEditMode(false);
      

    } catch (error) {
      console.error('❌ Error en logout:', error);
      throw error;
    }
  };

  const updatePassword = async (newPassword) => {
    try {
      if (!currentUser) {
        return { success: false, error: 'No hay usuario autenticado' };
      }
      
      // Actualizar contraseña en Firestore
      await updateDoc(doc(db, 'users', currentUser.id), {
        password: newPassword,
        lastPasswordUpdate: serverTimestamp()
      });
      
      // Actualizar también el estado local del usuario
      setCurrentUser(prev => ({
        ...prev,
        password: newPassword
      }));
      
      return { success: true };
    } catch (error) {
      console.error('Error updating password:', error);
      return { success: false, error: error.message || 'Error al actualizar contraseña' };
    }
  };

  // 🏠 ADDRESS FUNCTIONS
  const handleAddNewAddress = async (territoryId, addressData) => {
    try {
      const newData = {
        ...addressData,
        territoryId,
        isVisited: false,
        createdAt: serverTimestamp(),
        createdBy: currentUser?.id || 'unknown',
        lastUpdated: serverTimestamp()
      };

      // Geocodificación automática si hay dirección pero no coordenadas
      if (addressData.address && !addressData.latitude && !addressData.longitude) {
        try {
          const fullAddress = `${addressData.address.trim()}, Guadalajara, Jalisco, México`;
          const encodedAddress = encodeURIComponent(fullAddress);
          
          const response = await fetch(
            `https://nominatim.openstreetmap.org/search?q=${encodedAddress}&format=json&limit=1&addressdetails=1`,
            {
              headers: {
                'Accept-Language': 'es',
                'User-Agent': 'TerritoriosApp/1.0'
              }
            }
          );
          
          const data = await response.json();
          
          if (data && data.length > 0) {
            const result = data[0];
            newData.latitude = parseFloat(result.lat);
            newData.longitude = parseFloat(result.lon);
          }
        } catch (geoError) {
          console.warn('Error geocodificando dirección:', geoError);
        }
      } else if (addressData.latitude && addressData.longitude) {
        newData.latitude = addressData.latitude;
        newData.longitude = addressData.longitude;
      }

      // 🚀 ACTUALIZACIÓN OPTIMISTA: Generar ID temporal y agregar inmediatamente al estado local
      const tempId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const optimisticAddress = {
        ...newData,
        id: tempId,
        createdAt: new Date(),
        lastUpdated: new Date()
      };

      setAddresses(prevAddresses => [...prevAddresses, optimisticAddress]);

      // Luego guardar en Firebase
      const docRef = await addDoc(collection(db, 'addresses'), newData);
      
      // 🔄 ACTUALIZAR con el ID real de Firebase
      setAddresses(prevAddresses => 
        prevAddresses.map(addr => 
          addr.id === tempId 
            ? { ...addr, id: docRef.id }
            : addr
        )
      );
      
      if (newData.latitude && newData.longitude) {
        showToast('Dirección agregada con ubicación en el mapa', 'success');
      } else {
        showToast('Dirección agregada correctamente', 'success');
      }
      
    } catch (error) {
      console.error('Error adding address:', error);
      
      // 🔄 REVERTIR CAMBIOS OPTIMISTAS en caso de error
      // Eliminar la dirección temporal del estado local
      setAddresses(prevAddresses => 
        prevAddresses.filter(addr => !addr.id.startsWith('temp_'))
      );
      
      showToast('Error al agregar dirección', 'error');
      throw error;
    }
  };

  const handleUpdateAddress = async (addressId, updates, options = {}) => {
    const { showSuccessToast = true } = options;
    
    try {
      // 🚀 ACTUALIZACIÓN OPTIMISTA: Actualizar inmediatamente el estado local
      setAddresses(prevAddresses => 
        prevAddresses.map(addr => 
          addr.id === addressId 
            ? { ...addr, ...updates, updatedAt: new Date() }
            : addr
        )
      );

      // Luego actualizar Firebase
      await updateDoc(doc(db, 'addresses', addressId), {
        ...updates,
        updatedAt: serverTimestamp(),
        updatedBy: currentUser?.id || 'unknown'
      });
      
      if (showSuccessToast) {
        showToast('Dirección actualizada correctamente', 'success');
      }
    } catch (error) {
      console.error('Error updating address:', error);
      
      // 🔄 REVERTIR CAMBIOS OPTIMISTAS en caso de error
      // El listener de Firebase se encargará de restaurar el estado correcto
      showToast('Error al actualizar dirección', 'error');
      throw error;
    }
  };

  const handleDeleteAddress = async (addressId, options = {}) => {
    const { showSuccessToast = true, permanentDelete = false } = options;

    try {
      if (permanentDelete) {
        // Eliminación permanente (solo para direcciones ya archivadas)
        await deleteDoc(doc(db, 'addresses', addressId));
        if (showSuccessToast) {
          showToast('Dirección eliminada permanentemente', 'success');
        }
      } else {
        // Soft delete - marcar como eliminada en lugar de borrar
        const address = addresses.find(addr => addr.id === addressId);
        await updateDoc(doc(db, 'addresses', addressId), {
          deleted: true,
          deletedAt: serverTimestamp(),
          deletedBy: currentUser?.id || 'unknown',
          deletedByName: currentUser?.name || 'Sistema',
          deletedReason: 'Eliminado por usuario',
          // Preservar datos originales
          originalData: {
            ...address,
            address: address?.address,
            territoryId: address?.territoryId,
            name: address?.name || '',
            phone: address?.phone || '',
            notes: address?.notes || '',
            gender: address?.gender || '',
            isVisited: address?.isVisited || false,
            isRevisita: address?.isRevisita || false,
            isEstudio: address?.isEstudio || false,
            coords: address?.coords || null
          }
        });

        if (showSuccessToast) {
          showToast('Dirección archivada correctamente', 'success');
        }
      }
    } catch (error) {
      console.error('Error deleting address:', error);
      showToast('Error al eliminar dirección', 'error');
      throw error;
    }
  };

  // Función para restaurar direcciones archivadas
  const handleRestoreAddress = async (addressId) => {
    try {
      await updateDoc(doc(db, 'addresses', addressId), {
        deleted: false,
        deletedAt: null,
        deletedBy: null,
        deletedByName: null,
        deletedReason: null,
        restoredAt: serverTimestamp(),
        restoredBy: currentUser?.id || 'admin',
        originalData: null
      });
      showToast('Dirección restaurada correctamente', 'success');
    } catch (error) {
      console.error('Error restoring address:', error);
      showToast('Error al restaurar dirección', 'error');
      throw error;
    }
  };

  // 🔄 SYNC FUNCTIONS (declarar ANTES de handleToggleAddressStatus)
  // 🔄 PASO 3: Modificada para manejar asignaciones múltiples
  const syncTerritoryStatus = async (territoryId, triggeredByVisited) => {
    try {
      const territoryAddressesQuery = query(
        collection(db, 'addresses'),
        where('territoryId', '==', territoryId)
      );
      const territoryAddressesSnapshot = await getDocs(territoryAddressesQuery);
      
      const allAddresses = territoryAddressesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      if (allAddresses.length === 0) return;
      
      const allVisited = allAddresses.every(addr => addr.isVisited === true);
      const hasUnvisited = allAddresses.some(addr => addr.isVisited === false);
      
      const territoryRef = doc(db, 'territories', territoryId);
      const territoryDoc = await getDoc(territoryRef);
      
      if (!territoryDoc.exists()) return;
      
      const territoryData = territoryDoc.data();
      const currentStatus = territoryData.status;
      
      // 🔄 PASO 3: Usar helpers para manejar asignaciones múltiples
      const assignedNames = getAssignedNames(territoryData.assignedTo);
      const currentUserAssigned = isUserAssigned(territoryData.assignedTo, currentUser?.name);
      
      if (allVisited && currentStatus === 'En uso') {
        // 🔄 PASO 3: Completado por equipo - usar primer nombre o usuario actual
        const completedByName = currentUserAssigned 
          ? currentUser?.name 
          : assignedNames.length > 0 
            ? assignedNames[0] 
            : currentUser?.name || 'Usuario';

        await updateDoc(territoryRef, {
          status: 'Completado',
          assignedTo: territoryData.assignedTo, // ✅ MANTENER ASIGNACIÓN ORIGINAL COMPLETA
          completedDate: serverTimestamp(),
          completedBy: completedByName,
          lastWorked: serverTimestamp()
        });
        
        // 🔄 PASO 3: Historial con información de equipo
        await addDoc(collection(db, 'territoryHistory'), {
          territoryId: territoryId,
          territoryName: territoryData.name,
          assignedTo: territoryData.assignedTo, // Valor original
          assignedNames: assignedNames, // Array para reportes
          completedBy: completedByName,
          assignmentType: assignedNames.length > 1 ? 'multiple' : 'single',
          status: 'Completado Automáticamente',
          completedDate: serverTimestamp(),
          assignedDate: territoryData.assignedDate || serverTimestamp()
        });

        showToast(`🎉 ${territoryData.name} completado automáticamente`, 'success', 3000);
      } 
      else if (hasUnvisited && (currentStatus === 'Completado' || currentStatus === 'Terminado')) {
        // 🔄 PASO 3: Reactivación - mantener equipo original si admin, sino asignar a usuario actual
        let newAssignee;
        
        if (currentUser?.role === 'admin' && assignedNames.length > 0) {
          // Admin: mantener asignación original (equipo completo)
          newAssignee = territoryData.assignedTo;
        } else {
          // Usuario normal: asignar solo a él
          newAssignee = currentUser?.name || 'Usuario';
        }

        await updateDoc(territoryRef, {
          status: 'En uso',
          assignedTo: newAssignee,
          assignedDate: serverTimestamp(),
          completedDate: null,
          completedBy: null,
          lastWorked: serverTimestamp()
        });
        
        // 🔄 PASO 3: Historial con información de reactivación
        const newAssignedNames = getAssignedNames(newAssignee);
        await addDoc(collection(db, 'territoryHistory'), {
          territoryId: territoryId,
          territoryName: territoryData.name,
          assignedTo: newAssignee,
          assignedNames: newAssignedNames,
          assignmentType: newAssignedNames.length > 1 ? 'multiple' : 'single',
          status: currentUser?.role === 'admin' && assignedNames.length > 0 
            ? 'Reactivado - asignación mantenida' 
            : 'Reactivado por desmarcación',
          assignedDate: serverTimestamp(),
          previousStatus: currentStatus,
          reactivatedBy: currentUser?.name || 'Usuario',
          reason: `Dirección desmarcada por ${currentUser?.name || 'Usuario'}`
        });

        // 🔄 PASO 3: Mensaje con nombres formateados
        const territoryDisplayName = territoryData.name.toLowerCase().startsWith('territorio') 
          ? territoryData.name 
          : territoryData.name;
        
        const formattedNewNames = newAssignedNames.length === 1 
          ? newAssignedNames[0]
          : newAssignedNames.length === 2 
            ? `${newAssignedNames[0]} y ${newAssignedNames[1]}`
            : `${newAssignedNames[0]}, ${newAssignedNames[1]} y ${newAssignedNames[2]}`;
          
        const message = currentUser?.role === 'admin' && assignedNames.length > 0
          ? `📍 ${territoryDisplayName} reactivado - sigue asignado a ${formattedNewNames}`
          : `📍 ${territoryDisplayName} reasignado a ${formattedNewNames}`;
        
        showToast(message, 'info');
      }
      
      
    } catch (error) {
      console.error("Error en syncTerritoryStatus:", error);
      showToast('Error al sincronizar estado del territorio', 'error');
    }
  };

  const handleToggleAddressStatus = useCallback(async (addressId, currentStatus) => {
    try {
      const newVisitedStatus = !currentStatus;
      
      // 🚀 ACTUALIZACIÓN OPTIMISTA: Actualizar inmediatamente el estado local
      setAddresses(prevAddresses => 
        prevAddresses.map(addr => 
          addr.id === addressId 
            ? { ...addr, isVisited: newVisitedStatus, lastUpdated: new Date() }
            : addr
        )
      );
      
      // Luego actualizar Firebase
      const addressRef = doc(db, 'addresses', addressId);
      await updateDoc(addressRef, {
        isVisited: newVisitedStatus,
        lastUpdated: serverTimestamp()
      });

      // Obtener territoryId para sincronización
      let territoryId;
      const addressDoc = addresses.find(a => a.id === addressId);
      
      if (addressDoc && addressDoc.territoryId) {
        territoryId = addressDoc.territoryId;
      } else {
        const addressSnapshot = await getDoc(addressRef);
        if (addressSnapshot.exists()) {
          territoryId = addressSnapshot.data().territoryId;
        }
      }
      
      if (territoryId) {
        await syncTerritoryStatus(territoryId, newVisitedStatus);
      }

    } catch (error) {
      console.error("Error en handleToggleAddressStatus:", error);
      
      // 🔄 REVERTIR CAMBIOS OPTIMISTAS en caso de error
      setAddresses(prevAddresses => 
        prevAddresses.map(addr => 
          addr.id === addressId 
            ? { ...addr, isVisited: currentStatus, lastUpdated: new Date() }
            : addr
        )
      );
      
      showToast('Error al actualizar estado de dirección.', 'error');
      throw error;
    }
  }, [addresses, currentUser]);

  // 🏢 TERRITORY FUNCTIONS  
  // 🔄 PASO 2: Modificada para soportar asignaciones múltiples
  const handleAssignTerritory = useCallback(async (territoryId, assignedTo) => {
    // 🔄 PASO 2: Normalizar entrada - puede ser string o array
    const normalizedAssignedTo = normalizeAssignedTo(assignedTo);
    const assignedNames = getAssignedNames(normalizedAssignedTo);
    
    // Validación: debe haber al menos 1 nombre válido
    if (assignedNames.length === 0) {
      showToast('Error: Debe asignar al menos una persona', 'error');
      return;
    }
    
    // Validación: máximo 3 personas
    if (assignedNames.length > 3) {
      showToast('Error: Máximo 3 personas por territorio', 'error');
      return;
    }
    
    // Prevenir doble llamada con debouncing
    const callKey = `assign_${territoryId}_${assignedNames.join('_')}`;
    if (window.assignmentInProgress && window.assignmentInProgress.has(callKey)) {
      return;
    }
    
    // Marcar como en progreso
    if (!window.assignmentInProgress) window.assignmentInProgress = new Set();
    window.assignmentInProgress.add(callKey);
    
    try {
      // Verificar si es reasignación
      const territory = territories.find(t => t.id === territoryId);
      const currentAssigned = getAssignedNames(territory?.assignedTo);
      const isReassignment = territory?.status === 'En uso' && currentAssigned.length > 0;
      
      // 🔄 PASO 2: Guardar como array si son múltiples, string si es uno solo (compatibilidad)
      const assignedToSave = assignedNames.length === 1 ? assignedNames[0] : assignedNames;
      
      await updateDoc(doc(db, 'territories', territoryId), {
        status: 'En uso',
        assignedTo: assignedToSave,
        assignedDate: serverTimestamp(),
        lastWorked: serverTimestamp()
      });

      // 🔄 PASO 2: Historial con información de equipo
      await addDoc(collection(db, 'territoryHistory'), {
        territoryId,
        territoryName: territory?.name || 'Desconocido',
        assignedTo: assignedToSave,
        assignedNames: assignedNames, // Agregar array para reportes
        assignmentType: assignedNames.length > 1 ? 'multiple' : 'single',
        status: isReassignment ? 'Reasignado' : 'Asignado',
        assignedDate: serverTimestamp()
      });

      // 🔄 PASO 2: Mensaje con nombres formateados
      const territoryName = territory?.name || territoryId;
      const displayName = territoryName.toLowerCase().startsWith('territorio') 
        ? territoryName 
        : `Territorio ${territoryName}`;
      
      const formattedNames = assignedNames.length === 1 
        ? assignedNames[0]
        : assignedNames.length === 2 
          ? `${assignedNames[0]} y ${assignedNames[1]}`
          : `${assignedNames[0]}, ${assignedNames[1]} y ${assignedNames[2]}`;
        
      const message = isReassignment 
        ? `${displayName} reasignado a ${formattedNames}`
        : `${displayName} asignado a ${formattedNames}`;
      showToast(message, 'success');
    } catch (error) {
      console.error('Error assigning territory:', error);
      showToast('Error al asignar territorio', 'error');
      throw error;
    } finally {
      // Limpiar después de 2 segundos para permitir nuevas asignaciones
      setTimeout(() => {
        window.assignmentInProgress?.delete(callKey);
      }, 2000);
    }
  }, [territories]);

  // 🔄 PASO 3: Modificada para manejar asignaciones múltiples
  const handleReturnTerritory = useCallback(async (territoryId) => {
    // Prevenir doble llamada con debouncing
    const callKey = `return_${territoryId}`;
    if (window.returnInProgress && window.returnInProgress.has(callKey)) {
      return;
    }
    
    // Marcar como en progreso
    if (!window.returnInProgress) window.returnInProgress = new Set();
    window.returnInProgress.add(callKey);
    
    try {
      const territory = territories.find(t => t.id === territoryId);
      // 🔄 PASO 3: Obtener nombres asignados usando helper
      const assignedNames = getAssignedNames(territory?.assignedTo);
      
      // 🔄 DESMARCAR TODAS LAS DIRECCIONES DEL TERRITORIO
      const addressesQuery = query(
        collection(db, 'addresses'),
        where('territoryId', '==', territoryId)
      );
      const addressesSnapshot = await getDocs(addressesQuery);
      
      // Actualizar territorio y direcciones en paralelo
      const territoryUpdate = updateDoc(doc(db, 'territories', territoryId), {
        status: 'Disponible',
        assignedTo: null,
        assignedDate: null,
        lastWorked: serverTimestamp()
      });

      // Desmarcar todas las direcciones
      const addressUpdates = addressesSnapshot.docs.map(addressDoc => 
        updateDoc(addressDoc.ref, { isVisited: false })
      );

      // Ejecutar todas las actualizaciones en paralelo
      await Promise.all([territoryUpdate, ...addressUpdates]);

      // 🔄 PASO 3: Historial con información de equipo
      if (territory) {
        await addDoc(collection(db, 'territoryHistory'), {
          territoryId,
          territoryName: territory.name,
          assignedTo: territory.assignedTo, // Guardar valor original
          assignedNames: assignedNames, // Array para reportes
          returnedBy: currentUser?.name || 'Usuario', // Quien devolvió
          assignmentType: assignedNames.length > 1 ? 'multiple' : 'single',
          status: 'Devuelto',
          assignedDate: serverTimestamp()
        });
      }

      // 🔄 PASO 3: Mensaje con nombres formateados
      const territoryName = territory?.name || territoryId;
      const displayName = territoryName.toLowerCase().startsWith('territorio') 
        ? territoryName 
        : `Territorio ${territoryName}`;
      
      const formattedNames = assignedNames.length === 0 
        ? 'territorio'
        : assignedNames.length === 1 
          ? assignedNames[0]
          : assignedNames.length === 2 
            ? `${assignedNames[0]} y ${assignedNames[1]}`
            : `${assignedNames[0]}, ${assignedNames[1]} y ${assignedNames[2]}`;
        
      const message = assignedNames.length === 0 
        ? `${displayName} devuelto y direcciones desmarcadas`
        : `${displayName} devuelto por ${formattedNames} y direcciones desmarcadas`;
        
      showToast(message, 'success');
    } catch (error) {
      console.error('Error returning territory:', error);
      showToast('Error al devolver territorio', 'error');
      throw error;
    } finally {
      // Limpiar después de 2 segundos
      setTimeout(() => {
        window.returnInProgress?.delete(callKey);
      }, 2000);
    }
  }, [territories, currentUser]);

  // Función para liberar múltiples territorios (para gestión masiva)
  const releaseTerritories = useCallback(async (territoryIds) => {
    try {
      const batch = writeBatch(db);
      let releasedCount = 0;
      
      for (const territoryId of territoryIds) {
        const territory = territories.find(t => t.id === territoryId);
        
        // Solo liberar si está asignado
        if (territory?.assignedTo) {
          // Actualizar territorio
          const territoryRef = doc(db, 'territories', territoryId);
          batch.update(territoryRef, {
            assignedTo: null,
            status: 'Disponible',
            lastAssignedDate: null,
            updatedAt: serverTimestamp()
          });
          
          // Desmarcar todas las direcciones del territorio
          const addresses = await getDocs(
            query(collection(db, 'addresses'), where('territoryId', '==', territoryId))
          );
          
          addresses.forEach(doc => {
            batch.update(doc.ref, {
              isVisited: false,
              visitDetails: null,
              updatedAt: serverTimestamp()
            });
          });
          
          releasedCount++;
        }
      }
      
      if (releasedCount > 0) {
        await batch.commit();
        return releasedCount;
      }
      
      return 0;
    } catch (error) {
      console.error('Error liberando territorios:', error);
      throw error;
    }
  }, [territories]);

  const handleCompleteTerritory = useCallback(async (territoryId) => {
    // Prevenir doble llamada con debouncing
    const callKey = `complete_${territoryId}`;
    if (window.completeInProgress && window.completeInProgress.has(callKey)) {
      return;
    }
    
    // Marcar como en progreso
    if (!window.completeInProgress) window.completeInProgress = new Set();
    window.completeInProgress.add(callKey);
    
    try {
      const territory = territories.find(t => t.id === territoryId);
      
      // 🔄 MANTENER TODO EL EQUIPO: Conservar exactamente los mismos nombres asignados al completar
      // Sin importar quién haga clic en "Completado", mantener la asignación original
      

      
      await updateDoc(doc(db, 'territories', territoryId), {
        status: 'Completado',
        assignedTo: territory?.assignedTo, // ✅ MANTENER ASIGNACIÓN ORIGINAL COMPLETA
        completedDate: serverTimestamp(),
        completedBy: currentUser?.name || 'Usuario',
        lastWorked: serverTimestamp()
      });
      


      if (territory) {
        // 🔄 PASO 4: Usar helpers para manejar equipos en historial
        const assignedNames = getAssignedNames(territory.assignedTo);
        const isTeam = assignedNames.length > 1;
        
        await addDoc(collection(db, 'territoryHistory'), {
          territoryId,
          territoryName: territory.name,
          assignedTo: territory.assignedTo, // Mantener formato original
          assignedNames, // ✅ NUEVO: Array de nombres para mejor procesamiento
          assignmentType: isTeam ? 'team' : 'individual', // ✅ NUEVO: Tipo de asignación
          status: 'Completado',
          completedDate: serverTimestamp(),
          completedBy: currentUser?.name || 'Usuario',
          assignedDate: territory.assignedDate || serverTimestamp()
        });
      }

      // Evitar duplicación de "Territorio" en el nombre
      const territoryName = territory?.name || territoryId;
      const displayName = territoryName.toLowerCase().startsWith('territorio') 
        ? territoryName 
        : `Territorio ${territoryName}`;
        
      showToast(`${displayName} completado`, 'success');
    } catch (error) {
      console.error('Error completing territory:', error);
      showToast('Error al completar territorio', 'error');
      throw error;
    } finally {
      // Limpiar después de 2 segundos
      setTimeout(() => {
        window.completeInProgress?.delete(callKey);
      }, 2000);
    }
  }, [territories, currentUser]);

  // 📝 PROPOSAL FUNCTIONS
  const handleProposeAddressChange = async (addressId, changes, reason) => {
    try {
      const proposalData = {
        type: 'edit',
        addressId,
        territoryId: addresses.find(a => a.id === addressId)?.territoryId,
        changes,
        reason,
        status: 'pending',
        proposedBy: currentUser?.id || 'unknown',
        proposedByName: currentUser?.name || 'Usuario',
        createdAt: serverTimestamp()
      };

      await addDoc(collection(db, 'proposals'), proposalData);
      
      showToast('¡Gracias por tu propuesta! 😊 Se ha enviado para revisión y te notificaremos cuando sea evaluada. Tu colaboración es muy valiosa.', 'success', 4000);
    } catch (error) {
      console.error('Error creating proposal:', error);
      showToast('Error al crear propuesta', 'error');
      throw error;
    }
  };

  const handleProposeNewAddress = async (territoryId, addressData, reason) => {
    try {
      const proposalData = {
        type: 'new',
        territoryId,
        addressData,
        reason,
        status: 'pending',
        proposedBy: currentUser?.id || 'unknown',
        proposedByName: currentUser?.name || 'Usuario',
        createdAt: serverTimestamp()
      };

      await addDoc(collection(db, 'proposals'), proposalData);
      
      showToast('¡Muchas gracias! 🙏 Tu propuesta de nueva dirección se ha enviado para revisión. La evaluaremos pronto y te informaremos del resultado.', 'success', 4000);
    } catch (error) {
      console.error('Error creating proposal:', error);
      showToast('Error al crear propuesta', 'error');
      throw error;
    }
  };

  const handleApproveProposal = async (proposalId) => {
    try {
      const proposal = proposals.find(p => p.id === proposalId);
      if (!proposal) return;

      if (proposal.type === 'edit') {
        // Usar showSuccessToast: false para evitar notificación duplicada
        await handleUpdateAddress(proposal.addressId, proposal.changes, { showSuccessToast: false });
      } else if (proposal.type === 'new') {
        await handleAddNewAddress(proposal.territoryId, proposal.addressData);
      }

      await updateDoc(doc(db, 'proposals', proposalId), {
        status: 'approved',
        approvedBy: currentUser?.name || 'Administrador',
        approvedAt: serverTimestamp(),
        notificationRead: false // ✅ Marcar como no leída para que aparezca notificación
      });

      showToast('Propuesta aprobada', 'success');
    } catch (error) {
      console.error('Error approving proposal:', error);
      showToast('Error al aprobar propuesta', 'error');
      throw error;
    }
  };

  const handleRejectProposal = async (proposalId, reason) => {
    try {
      await updateDoc(doc(db, 'proposals', proposalId), {
        status: 'rejected',
        rejectionReason: reason,
        rejectedBy: currentUser?.name || 'Administrador',
        rejectedAt: serverTimestamp(),
        notificationRead: false // ✅ Marcar como no leída para que aparezca notificación
      });
      showToast('Propuesta rechazada', 'success');
    } catch (error) {
      console.error('Error rejecting proposal:', error);
      showToast('Error al rechazar propuesta', 'error');
      throw error;
    }
  };

  // 🗑️ FUNCTIONS FOR DELETING PROPOSALS
  const handleDeleteProposal = async (proposalId) => {
    try {
      await deleteDoc(doc(db, 'proposals', proposalId));
      showToast('Propuesta eliminada', 'success');
    } catch (error) {
      console.error('Error deleting proposal:', error);
      showToast('Error al eliminar propuesta', 'error');
      throw error;
    }
  };

  const handleDeleteProposalsByStatus = async (status, userId = null) => {
    try {
      const proposalsToDelete = proposals.filter(p => {
        if (status && p.status !== status) return false;
        if (userId && p.proposedBy !== userId) return false;
        return true;
      });

      const batch = writeBatch(db);
      proposalsToDelete.forEach(proposal => {
        const proposalRef = doc(db, 'proposals', proposal.id);
        batch.delete(proposalRef);
      });

      await batch.commit();
      showToast(`${proposalsToDelete.length} propuestas eliminadas`, 'success');
    } catch (error) {
      console.error('Error eliminando propuestas:', error);
      showToast('Error eliminando propuestas', 'error');
    }
  };

  // ✅ NUEVO: Funciones para manejar notificaciones
  const markProposalsAsRead = async () => {
    if (!currentUser || currentUser.role === 'admin') return;
    
    try {
      const unreadProposals = proposals.filter(p =>
        p.proposedBy === currentUser.id &&
        ['approved', 'rejected'].includes(p.status) &&
        !p.notificationRead
      );

      if (unreadProposals.length === 0) {
        return;
      }

      // ✅ MEJORA: Actualizar estado local inmediatamente
      setProposals(prevProposals => 
        prevProposals.map(proposal => 
          unreadProposals.some(unread => unread.id === proposal.id)
            ? { ...proposal, notificationRead: true }
            : proposal
        )
      );

      // ✅ MEJORA: Actualizar contador inmediatamente
      setUserNotificationsCount(0);

      const batch = writeBatch(db);
      unreadProposals.forEach(proposal => {
        const proposalRef = doc(db, 'proposals', proposal.id);
        batch.update(proposalRef, { notificationRead: true });
      });

      await batch.commit();
    } catch (error) {
      console.error('Error marcando propuestas como leídas:', error);
      // ✅ MEJORA: Revertir cambios locales si hay error
      showToast('Error al marcar notificaciones como leídas', 'error');
    }
  };

  const getUnreadProposalsCount = useCallback(() => {
    if (!currentUser || currentUser.role === 'admin') return 0;
    
    return proposals.filter(p => 
      p.proposedBy === currentUser.id && 
      ['approved', 'rejected'].includes(p.status) && 
      !p.notificationRead
    ).length;
  }, [proposals, currentUser]);

  const getPendingProposalsCount = useCallback(() => {
    if (!currentUser || currentUser.role !== 'admin') return 0;
    
    return proposals.filter(p => p.status === 'pending').length;
  }, [proposals, currentUser]);

  // 🛠️ ADMIN FUNCTIONS
  const handleToggleAdminMode = useCallback(() => {
    setAdminEditMode(prev => !prev);
  }, []);

  const resetAdminModeQuietly = useCallback(() => {
    setAdminEditMode(false);
  }, []);

  // 👥 USER MANAGEMENT FUNCTIONS
  const handleCreateUser = async (userData) => {
    try {
      // Validar que no exista ya un usuario con el mismo código de acceso
      const existingUserQuery = query(
        collection(db, 'users'),
        where('accessCode', '==', userData.accessCode)
      );
      const existingUserSnapshot = await getDocs(existingUserQuery);
      
      if (!existingUserSnapshot.empty) {
        throw new Error('Ya existe un usuario con este nombre de usuario');
      }

      const newUserData = {
        name: userData.name,
        accessCode: userData.accessCode,
        password: userData.password,
        role: userData.role || 'user',
        createdAt: serverTimestamp(),
        createdBy: currentUser?.id || 'admin',
        lastPasswordUpdate: serverTimestamp()
      };

      await addDoc(collection(db, 'users'), newUserData);
      showToast(`Usuario ${userData.name} creado exitosamente`, 'success');
    } catch (error) {
      console.error('Error creating user:', error);
      showToast(error.message || 'Error al crear usuario', 'error');
      throw error;
    }
  };

  const handleUpdateUser = async (userId, updates) => {
    try {
              // Si se está actualizando el usuario, validar que no exista
      if (updates.accessCode) {
        const existingUserQuery = query(
          collection(db, 'users'),
          where('accessCode', '==', updates.accessCode)
        );
        const existingUserSnapshot = await getDocs(existingUserQuery);
        
        // Verificar que no sea el mismo usuario
        const existingUser = existingUserSnapshot.docs.find(doc => doc.id !== userId);
        if (existingUser) {
          throw new Error('Ya existe otro usuario con este nombre de usuario');
        }
      }

      const updateData = {
        ...updates,
        updatedAt: serverTimestamp(),
        updatedBy: currentUser?.id || 'admin'
      };

      await updateDoc(doc(db, 'users', userId), updateData);
      showToast('Usuario actualizado exitosamente', 'success');
    } catch (error) {
      console.error('Error updating user:', error);
      showToast(error.message || 'Error al actualizar usuario', 'error');
      throw error;
    }
  };

  const handleDeleteUser = async (userId) => {
    try {
      // Verificar que no sea el usuario actual
      if (userId === currentUser?.id) {
        throw new Error('No puedes eliminar tu propio usuario');
      }

      // 🔄 PASO 4: Verificar si el usuario tiene territorios asignados (incluyendo equipos)
      const userToDelete = users.find(u => u.id === userId);
      if (userToDelete) {
        const assignedTerritories = territories.filter(t => {
          // Usar helper para verificar si el usuario está asignado (individual o en equipo)
          return isUserAssigned(t.assignedTo, userToDelete.name);
        });
        
        if (assignedTerritories.length > 0) {
          throw new Error(`No se puede eliminar: ${userToDelete.name} tiene ${assignedTerritories.length} territorio(s) asignado(s)`);
        }
      }

      await deleteDoc(doc(db, 'users', userId));
      showToast('Usuario eliminado exitosamente', 'success');
    } catch (error) {
      console.error('Error deleting user:', error);
      showToast(error.message || 'Error al eliminar usuario', 'error');
      throw error;
    }
  };

  const handleResetUserPassword = async (userId, newPassword) => {
    try {
      await updateDoc(doc(db, 'users', userId), {
        password: newPassword,
        lastPasswordUpdate: serverTimestamp(),
        passwordResetBy: currentUser?.id || 'admin'
      });
      showToast('Contraseña actualizada exitosamente', 'success');
    } catch (error) {
      console.error('Error resetting password:', error);
      showToast('Error al actualizar contraseña', 'error');
      throw error;
    }
  };

  // 🎯 CAMPAIGN MANAGEMENT FUNCTIONS
  const createCampaign = async (campaignData) => {
    try {
      const campaignRef = await addDoc(collection(db, 'campaigns'), {
        ...campaignData,
        createdAt: serverTimestamp(),
        createdBy: currentUser?.id
      });
      
      showToast('Campaña creada exitosamente', 'success');
      return campaignRef.id;
    } catch (error) {
      console.error('Error creating campaign:', error);
      showToast('Error al crear la campaña', 'error');
      throw error;
    }
  };

  const updateCampaign = async (campaignId, updates) => {
    try {
      await updateDoc(doc(db, 'campaigns', campaignId), {
        ...updates,
        updatedAt: serverTimestamp(),
        updatedBy: currentUser?.id
      });
      
      showToast('Campaña actualizada exitosamente', 'success');
    } catch (error) {
      console.error('Error updating campaign:', error);
      showToast('Error al actualizar la campaña', 'error');
      throw error;
    }
  };

  const deleteCampaign = async (campaignId) => {
    try {
      await deleteDoc(doc(db, 'campaigns', campaignId));
      showToast('Campaña eliminada exitosamente', 'success');
    } catch (error) {
      console.error('Error deleting campaign:', error);
      showToast('Error al eliminar la campaña', 'error');
      throw error;
    }
  };

  const finalizeCampaign = async (campaignId) => {
    try {
      await updateDoc(doc(db, 'campaigns', campaignId), {
        status: 'completada',
        completedAt: serverTimestamp(),
        completedBy: currentUser?.id
      });
      
      showToast('Campaña finalizada exitosamente', 'success');
    } catch (error) {
      console.error('Error finalizing campaign:', error);
      showToast('Error al finalizar la campaña', 'error');
      throw error;
    }
  };

  const getCampaignAssignments = (campaignId) => {
    const campaign = campaigns.find(c => c.id === campaignId);
    if (!campaign) return [];
    
    const userId = currentUser?.id;
    if (!userId) return [];
    
    // Si es admin, ver todas las asignaciones
    if (currentUser?.role === 'admin') {
      return campaign.assignments || [];
    }
    
    // Si es publicador, ver solo sus asignaciones
    const userAssignment = campaign.assignments?.find(a => a.userId === userId);
    return userAssignment ? [userAssignment] : [];
  };

  // Nueva función para actualizar el progreso de una campaña
  const updateCampaignProgress = async (campaignId, userId, completedAddresses) => {
    try {
      const campaign = campaigns.find(c => c.id === campaignId);
      if (!campaign) return;

      // Actualizar las asignaciones con el progreso
      const updatedAssignments = campaign.assignments.map(assignment => {
        if (assignment.userId === userId) {
          return {
            ...assignment,
            completedAddresses: completedAddresses,
            completedCount: completedAddresses.length
          };
        }
        return assignment;
      });

      // Actualizar en Firebase
      await updateDoc(doc(db, 'campaigns', campaignId), {
        assignments: updatedAssignments,
        lastUpdated: serverTimestamp()
      });

    } catch (error) {
      console.error('Error updating campaign progress:', error);
      throw error;
    }
  };

  // Nueva función para transferir una dirección entre usuarios en una campaña
  const transferCampaignAddress = async (campaignId, addressId, fromUserId, toUserId) => {
    try {
      const campaign = campaigns.find(c => c.id === campaignId);
      if (!campaign) {
        throw new Error('Campaña no encontrada');
      }
      
      if (!campaign.assignments) {
        throw new Error('La campaña no tiene asignaciones');
      }

      // Clonar las asignaciones para evitar mutaciones
      let updatedAssignments = [...campaign.assignments];
      
      // Encontrar y actualizar la asignación del usuario origen
      const fromUserIndex = updatedAssignments.findIndex(a => a.userId === fromUserId);
      if (fromUserIndex === -1) {
        throw new Error('Usuario origen no encontrado en las asignaciones');
      }
      
      // Verificar que la dirección existe en el usuario origen
      const fromAssignment = updatedAssignments[fromUserIndex];
      if (!fromAssignment.addressIds.includes(addressId)) {
        throw new Error('La dirección no está asignada al usuario origen');
      }
      
      // Remover la dirección del usuario origen
      const updatedFromAddressIds = fromAssignment.addressIds.filter(id => id !== addressId);
      const updatedFromCompleted = (fromAssignment.completedAddresses || []).filter(id => id !== addressId);
      
      updatedAssignments[fromUserIndex] = {
        ...fromAssignment,
        addressIds: updatedFromAddressIds,
        addressCount: updatedFromAddressIds.length,
        completedAddresses: updatedFromCompleted,
        completedCount: updatedFromCompleted.length
      };
      
      // Encontrar o crear la asignación del usuario destino
      const toUserIndex = updatedAssignments.findIndex(a => a.userId === toUserId);
      
      if (toUserIndex !== -1) {
        // Usuario destino ya tiene asignaciones
        const toAssignment = updatedAssignments[toUserIndex];
        const updatedToAddressIds = [...toAssignment.addressIds, addressId];
        
        updatedAssignments[toUserIndex] = {
          ...toAssignment,
          addressIds: updatedToAddressIds,
          addressCount: updatedToAddressIds.length
        };
      } else {
        // Usuario destino no tiene asignaciones, crear nueva
        const toUser = users.find(u => u.id === toUserId);
        if (!toUser) {
          throw new Error('Usuario destino no encontrado');
        }
        
        updatedAssignments.push({
          userId: toUserId,
          userName: toUser.name,
          addressIds: [addressId],
          addressCount: 1,
          completedAddresses: [],
          completedCount: 0
        });
      }

      // Actualizar en Firebase
      await updateDoc(doc(db, 'campaigns', campaignId), {
        assignments: updatedAssignments,
        lastUpdated: serverTimestamp()
      });

      showToast('Dirección transferida exitosamente', 'success');
      return true;
    } catch (error) {
      console.error('Error detallado en transferCampaignAddress:', error);
      showToast(`Error al transferir: ${error.message}`, 'error');
      throw error;
    }
  };

  const handleResetSingleTerritory = async (territoryId) => {
    try {
      const territoryDoc = await getDoc(doc(db, 'territories', territoryId));
      if (!territoryDoc.exists()) {
        showToast('Error: No se encontró el territorio.', 'error');
        return;
      }
      const territoryData = territoryDoc.data();
      const territoryName = territoryData.name;
      
      // Evitar duplicación de "Territorio" en el nombre para la notificación de progreso
      const displayName = territoryName.toLowerCase().startsWith('territorio') 
        ? territoryName 
        : `Territorio ${territoryName}`;
      
      showToast(`Reiniciando ${displayName.toLowerCase()}...`, 'info');

      const territoryRef = doc(db, 'territories', territoryId);
      const addressesQuery = query(
        collection(db, 'addresses'),
        where('territoryId', '==', territoryId)
      );
      const addressesSnapshot = await getDocs(addressesQuery);

      await updateDoc(territoryRef, {
        status: 'Disponible',
        assignedTo: null,
        assignedDate: null,
        completedDate: null,
        completedBy: null
      });

      const batch = [];
      addressesSnapshot.docs.forEach(addressDoc => {
        batch.push(
          updateDoc(addressDoc.ref, { isVisited: false })
        );
      });
      await Promise.all(batch);
      
      // 🔄 PASO 4: Mejorar logging con información de equipos
      const previousAssignedNames = getAssignedNames(territoryData.assignedTo);
      const wasTeam = previousAssignedNames.length > 1;
      
      await addDoc(collection(db, 'territoryHistory'), {
        territoryId: territoryId,
        territoryName: territoryName,
        previousAssignedTo: territoryData.assignedTo, // ✅ NUEVO: Guardar asignación anterior
        previousAssignedNames, // ✅ NUEVO: Array de nombres anteriores
        previousAssignmentType: wasTeam ? 'team' : 'individual', // ✅ NUEVO: Tipo anterior
        status: 'Reiniciado (Admin)',
        assignedDate: serverTimestamp(),
        assignedTo: currentUser?.name || 'Admin'
      });

      showToast(`${displayName} ha sido reiniciado.`, 'success');
    } catch (error) {
      console.error("Error al reiniciar el territorio:", error);
      showToast('Ocurrió un error al reiniciar el territorio.', 'error');
      throw error;
    }
  };

  const handleResetAllTerritories = async () => {
    try {
      showToast('Iniciando reinicio completo...', 'info', 10000);

      const territoriesSnapshot = await getDocs(collection(db, 'territories'));
      const addressesSnapshot = await getDocs(collection(db, 'addresses'));

      const batchPromises = [];
      const BATCH_SIZE = 400;

      for (let i = 0; i < territoriesSnapshot.docs.length; i += BATCH_SIZE) {
        const batch = territoriesSnapshot.docs.slice(i, i + BATCH_SIZE);
        const updates = batch.map(doc => 
          updateDoc(doc.ref, {
            status: 'Disponible',
            assignedTo: null,
            assignedDate: null,
            completedDate: null,
            completedBy: null
          })
        );
        batchPromises.push(Promise.all(updates));
      }

      for (let i = 0; i < addressesSnapshot.docs.length; i += BATCH_SIZE) {
        const batch = addressesSnapshot.docs.slice(i, i + BATCH_SIZE);
        const updates = batch.map(doc => 
          updateDoc(doc.ref, { isVisited: false })
        );
        batchPromises.push(Promise.all(updates));
      }

      await Promise.all(batchPromises);

      // 🔄 PASO 4: Mejorar logging del reinicio general
      await addDoc(collection(db, 'territoryHistory'), {
        status: 'Reinicio General',
        assignedDate: serverTimestamp(),
        assignedTo: currentUser?.name || 'Admin',
        resetBy: currentUser?.name || 'Admin', // ✅ NUEVO: Quién hizo el reinicio
        resetType: 'general' // ✅ NUEVO: Tipo de reinicio
      });

      showToast('¡Reinicio completado! Todos los territorios y direcciones han sido restaurados.', 'success');
    } catch (error) {
      console.error("Error durante el reinicio total:", error);
      showToast('Ocurrió un error durante el reinicio. Por favor, revisa la consola.', 'error');
      throw error;
    }
  };

  // 🔄 PASO 1: Funciones helper para asignaciones múltiples (MEMOIZADAS)
  const normalizeAssignedTo = useCallback((assignedTo) => {
    if (!assignedTo) return [];
    if (Array.isArray(assignedTo)) return assignedTo;
    return [assignedTo];
  }, []);

  const getAssignedNames = useCallback((assignedTo) => {
    const normalized = normalizeAssignedTo(assignedTo);
    return normalized.filter(name => name && name.trim() !== '');
  }, [normalizeAssignedTo]);

  const isUserAssigned = useCallback((assignedTo, userName) => {
    if (!userName) return false;
    const names = getAssignedNames(assignedTo);
    return names.includes(userName);
  }, [getAssignedNames]);

  // 📋 Cargar versión al iniciar la aplicación
  useEffect(() => {
    loadAppVersion();
    
    // COMENTADO TEMPORALMENTE: Esto puede causar recargas infinitas
    // const versionInterval = setInterval(() => {
    //   console.log('⏰ DEBUG - Recargando versión...');
    //   loadAppVersion();
    // }, 30000);
    
    // return () => clearInterval(versionInterval);
  }, []); // Solo se ejecuta una vez al montar

  // 🚀 INICIALIZACIÓN Y GESTIÓN DE AUTENTICACIÓN PERSONALIZADA
  useEffect(() => {
    const initializeAuth = async () => {
  
      setAuthLoading(true);
      
      try {
        // Intentar restaurar sesión desde sessionStorage
        const savedUser = sessionStorage.getItem('currentUser');
        
        if (savedUser) {
          const userData = JSON.parse(savedUser);

          // Verificar que el usuario aún existe en Firestore
          const userDoc = await getDoc(doc(db, 'users', userData.id));
          
          if (userDoc.exists()) {
            const freshUserData = userDoc.data();
            const user = {
              id: userDoc.id,
              accessCode: freshUserData.accessCode,
              name: freshUserData.name,
              role: freshUserData.role || 'user',
              ...freshUserData
            };
            
            setCurrentUser(user);

          } else {
            sessionStorage.removeItem('currentUser');
            setCurrentUser(null);
          }
        } else {
          setCurrentUser(null);
          }
        } catch (error) {
        console.error('❌ Error inicializando autenticación:', error);
        sessionStorage.removeItem('currentUser');
        setCurrentUser(null);
      }
      
      setAuthLoading(false);
    };

    initializeAuth();
  }, []);

  // 📊 SUSCRIPCIONES A DATOS DE FIREBASE
  useEffect(() => {
    if (!currentUser) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    
    const loadData = async () => {
      try {
        // Suscripción a territorios
        const territoriesQuery = query(collection(db, 'territories'), orderBy('name'));
        const unsubTerritories = onSnapshot(territoriesQuery, (snapshot) => {
          const territoriesData = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
          setTerritories(territoriesData);
        });

        // Suscripción a direcciones
        const addressesQuery = query(collection(db, 'addresses'), orderBy('address'));
        const unsubAddresses = onSnapshot(addressesQuery, (snapshot) => {
          const addressesData = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
          setAddresses(addressesData);
        });

        // Suscripción a usuarios
        const usersQuery = query(collection(db, 'users'), orderBy('name'));
        const unsubUsers = onSnapshot(usersQuery, (snapshot) => {
          const usersData = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
          setUsers(usersData);
          setPublishers(usersData);
        });

        // Suscripción a propuestas
        let unsubProposals = () => {};
        if (currentUser.role === 'admin') {
          // Admins ven todas las propuestas
          const proposalsQuery = query(collection(db, 'proposals'), orderBy('createdAt', 'desc'));
          unsubProposals = onSnapshot(proposalsQuery, (snapshot) => {
            const proposalsData = snapshot.docs.map(doc => ({
              id: doc.id,
              ...doc.data()
            }));
            setProposals(proposalsData);
          });
        } else {
          // Usuarios normales solo ven sus propias propuestas
          const userProposalsQuery = query(
            collection(db, 'proposals'), 
            where('proposedBy', '==', currentUser.id)
          );
          unsubProposals = onSnapshot(userProposalsQuery, (snapshot) => {
            const proposalsData = snapshot.docs.map(doc => ({
              id: doc.id,
              ...doc.data()
            }));
            // Ordenar en el cliente por fecha de creación
            proposalsData.sort((a, b) => {
              const dateA = a.createdAt?.toDate?.() || new Date(a.createdAt || 0);
              const dateB = b.createdAt?.toDate?.() || new Date(b.createdAt || 0);
              return dateB - dateA; // Más reciente primero
            });
            setProposals(proposalsData);
          });
        }

        // Suscripción al historial de territorios
        const historyQuery = query(collection(db, 'territoryHistory'), orderBy('assignedDate', 'desc'));
        const unsubHistory = onSnapshot(historyQuery, (snapshot) => {
          const historyData = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
          setTerritoryHistory(historyData);
        });

        // Suscripción a campañas
        const campaignsQuery = query(collection(db, 'campaigns'), orderBy('createdAt', 'desc'));
        const unsubCampaigns = onSnapshot(campaignsQuery, (snapshot) => {
          const campaignsData = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
          setCampaigns(campaignsData);
        });

        // Guardar funciones de cleanup
        unsubscribesRef.current = [unsubTerritories, unsubAddresses, unsubUsers, unsubProposals, unsubHistory, unsubCampaigns];
        
        setIsLoading(false);
      } catch (error) {
        console.error('Error cargando datos:', error);
        setIsLoading(false);
        showToast('Error cargando datos', 'error');
      }
    };

    loadData();

    // Cleanup al desmontar
    return () => {
      unsubscribesRef.current.forEach(unsubscribe => {
        if (typeof unsubscribe === 'function') {
          unsubscribe();
        }
      });
      unsubscribesRef.current = [];
    };
  }, [currentUser]);

  // ✅ NUEVO: Actualizar contadores de notificaciones
  useEffect(() => {
    if (!currentUser) {
      setUserNotificationsCount(0);
      setPendingProposalsCount(0);
      return;
    }

    // Actualizar contador de notificaciones para usuarios normales
    if (currentUser.role !== 'admin') {
      const unreadCount = getUnreadProposalsCount();
      setUserNotificationsCount(unreadCount);
    }

    // Actualizar contador de propuestas pendientes para admins
    if (currentUser.role === 'admin') {
      const pendingCount = getPendingProposalsCount();
      setPendingProposalsCount(pendingCount);
    }
  }, [proposals, currentUser, getUnreadProposalsCount, getPendingProposalsCount]);

  // 📊 CALCULAR TERRITORIOS CON CONTEO DE DIRECCIONES (OPTIMIZADO)
  const territoriesWithCount = useMemo(() => {
    // 🚀 PASO 15: Crear mapa de direcciones por territorio para mejor rendimiento
    const addressesByTerritory = addresses.reduce((acc, addr) => {
      if (!acc[addr.territoryId]) {
        acc[addr.territoryId] = { total: 0, visited: 0 };
      }
      acc[addr.territoryId].total++;
      if (addr.isVisited) {
        acc[addr.territoryId].visited++;
      }
      return acc;
    }, {});

    return territories.map(territory => {
      const counts = addressesByTerritory[territory.id] || { total: 0, visited: 0 };
      return {
        ...territory,
        addressCount: counts.total,
        visitedCount: counts.visited
      };
    });
  }, [territories, addresses]);

  const value = {
    // State
    currentUser,
    territories: territoriesWithCount,
    addresses,
    publishers,
    users,
    proposals,
    territoryHistory, // Agregar territoryHistory al contexto
    campaigns, // Campañas especiales
    isLoading,
    authLoading,
    CURRENT_VERSION: appVersion, // Ahora es dinámico desde version.json
    adminEditMode,
    
    // ✅ NUEVO: Estados de notificaciones
    userNotificationsCount,
    pendingProposalsCount,
    
    // Auth functions
    login,
    logout,
    updatePassword,
    
    // Territory functions
    handleAssignTerritory,
    handleReturnTerritory,
    handleCompleteTerritory,
    releaseTerritories,
    
    // Address functions
    handleToggleAddressStatus,
    handleResetSingleTerritory,
    handleResetAllTerritories,
    handleAddNewAddress,
    handleUpdateAddress,
    handleDeleteAddress,
    handleRestoreAddress,

    // Proposal functions
    handleProposeAddressChange,
    handleProposeNewAddress,
    handleApproveProposal,
    handleRejectProposal,
    handleDeleteProposal,
    handleDeleteProposalsByStatus,

    // Admin functions
    handleToggleAdminMode,
    resetAdminModeQuietly,
    
    // User management functions
    handleCreateUser,
    handleUpdateUser,
    handleDeleteUser,
    handleResetUserPassword,
    
    // Sync functions
    syncTerritoryStatus,
    
    // Toast function
    showToast,

    // ✅ NUEVO: Funciones para manejar notificaciones
    markProposalsAsRead,
    getUnreadProposalsCount,
    getPendingProposalsCount,
    
    // Campaign functions
    createCampaign,
    updateCampaign,
    deleteCampaign,
    finalizeCampaign,
    getCampaignAssignments,
    updateCampaignProgress,
    transferCampaignAddress
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export default AppContext; 