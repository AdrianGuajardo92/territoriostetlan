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
  getDocs
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { useToast } from '../hooks/useToast';

const AppContext = createContext();

export const testFirebaseConnection = async () => {
  try {
    const testQuery = query(collection(db, 'territories'), orderBy('name'), where('name', '!=', null));
    await getDocs(testQuery);
    console.log('✅ Conexión Firebase exitosa');
    return true;
  } catch (error) {
    console.error('❌ Error de conexión Firebase:', error);
    if (error.code === 'failed-precondition') {
      console.log('ℹ️ Índices de Firestore aún creándose...');
    }
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
  const [isLoading, setIsLoading] = useState(true);
  const [authLoading, setAuthLoading] = useState(true);
  const [adminEditMode, setAdminEditMode] = useState(false);

  // Referencias para cleanup
  const unsubscribesRef = useRef([]);
  const { showToast } = useToast();

  const CURRENT_VERSION = '2.7.1';
  
  // 🔐 AUTH FUNCTIONS - SISTEMA PERSONALIZADO CON CÓDIGOS DE ACCESO
  const login = async (accessCode, password) => {
    try {
      console.log('🔐 Intentando login con código:', accessCode);
      
      // Buscar usuario por código de acceso en Firestore
      const usersQuery = query(
        collection(db, 'users'), 
        where('accessCode', '==', accessCode)
      );
      
      const querySnapshot = await getDocs(usersQuery);
      
      if (querySnapshot.empty) {
        console.log('❌ Código de acceso no encontrado');
        return { 
          success: false, 
          error: 'Código de acceso incorrecto' 
        };
      }

      const userDoc = querySnapshot.docs[0];
      const userData = userDoc.data();
      
      console.log('👤 Usuario encontrado:', {
        name: userData.name,
        role: userData.role,
        hasPassword: !!userData.password
      });

      // Validar contraseña
      if (!userData.password || userData.password !== password) {
        console.log('❌ Contraseña incorrecta');
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

      console.log('✅ Login exitoso:', user.name);
      
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
      console.log('🚪 Cerrando sesión...');
      
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
      
      console.log('✅ Sesión cerrada correctamente');
    } catch (error) {
      console.error('❌ Error en logout:', error);
      throw error;
    }
  };

  const updatePassword = async (newPassword) => {
    try {
      if (!currentUser) throw new Error('No hay usuario autenticado');
      
      // Actualizar contraseña en Firestore
      await updateDoc(doc(db, 'users', currentUser.id), {
        password: newPassword,
        lastPasswordUpdate: serverTimestamp()
      });
      
      console.log('✅ Contraseña actualizada correctamente');
    } catch (error) {
      console.error('❌ Error updating password:', error);
      throw error;
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

      await addDoc(collection(db, 'addresses'), newData);
      
      if (newData.latitude && newData.longitude) {
        showToast('Dirección agregada con ubicación en el mapa', 'success');
    } else {
        showToast('Dirección agregada correctamente', 'success');
      }
      
    } catch (error) {
      console.error('Error adding address:', error);
      showToast('Error al agregar dirección', 'error');
      throw error;
    }
  };

  const handleUpdateAddress = async (addressId, updates) => {
    try {
      await updateDoc(doc(db, 'addresses', addressId), {
        ...updates,
        updatedAt: serverTimestamp(),
        updatedBy: currentUser?.id || 'unknown'
      });
      showToast('Dirección actualizada correctamente', 'success');
    } catch (error) {
      console.error('Error updating address:', error);
      showToast('Error al actualizar dirección', 'error');
      throw error;
    }
  };

  const handleDeleteAddress = async (addressId) => {
    try {
      await deleteDoc(doc(db, 'addresses', addressId));
      showToast('Dirección eliminada correctamente', 'success');
    } catch (error) {
      console.error('Error deleting address:', error);
      showToast('Error al eliminar dirección', 'error');
      throw error;
    }
  };

  // 🔄 SYNC FUNCTIONS (declarar ANTES de handleToggleAddressStatus)
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
      
      if (allVisited && currentStatus === 'En uso') {
        const completedBy = territoryData.assignedTo || currentUser?.name || 'Usuario';

        await updateDoc(territoryRef, {
          status: 'Completado',
          assignedTo: null,
          assignedDate: null,
          completedDate: serverTimestamp(),
          completedBy: completedBy,
          lastWorked: serverTimestamp()
        });
        
        await addDoc(collection(db, 'territoryHistory'), {
          territoryId: territoryId,
          territoryName: territoryData.name,
          assignedTo: completedBy,
          status: 'Completado Automáticamente',
          completedDate: serverTimestamp(),
          assignedDate: territoryData.assignedDate || serverTimestamp()
        });

        showToast(`🎉 ${territoryData.name} completado automáticamente`, 'success', 3000);
      } 
      else if (hasUnvisited && (currentStatus === 'Completado' || currentStatus === 'Terminado')) {
        let newAssignee = currentUser?.name || 'Usuario';
        
        if (territoryData.assignedTo && 
            territoryData.assignedTo !== currentUser?.name && 
            currentUser?.role === 'admin') {
          newAssignee = territoryData.assignedTo;
        }

        await updateDoc(territoryRef, {
          status: 'En uso',
          assignedTo: newAssignee,
          assignedDate: serverTimestamp(),
          completedDate: null,
          completedBy: null,
          lastWorked: serverTimestamp()
        });
        
        await addDoc(collection(db, 'territoryHistory'), {
          territoryId: territoryId,
          territoryName: territoryData.name,
          assignedTo: newAssignee,
          status: newAssignee === currentUser?.name ? 'Reactivado por desmarcación' : 'Reactivado - asignación mantenida',
          assignedDate: serverTimestamp(),
          previousStatus: currentStatus,
          reactivatedBy: currentUser?.name || 'Usuario',
          reason: `Dirección desmarcada por ${currentUser?.name || 'Usuario'}`
        });

        const message = newAssignee === currentUser?.name 
          ? `📍 ${territoryData.name} reasignado a ${currentUser?.name}`
          : `📍 ${territoryData.name} reactivado - sigue asignado a ${newAssignee}`;
        
        showToast(message, 'info', 3000);
      }
      
    } catch (error) {
      console.error("Error en syncTerritoryStatus:", error);
      showToast('Error al sincronizar estado del territorio', 'error');
    }
  };

  const handleToggleAddressStatus = useCallback(async (addressId, currentStatus) => {
    try {
      const newVisitedStatus = !currentStatus;
      
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
      showToast('Error al actualizar estado de dirección.', 'error');
      throw error;
    }
  }, [addresses, currentUser]);

  // 🏢 TERRITORY FUNCTIONS  
  const handleAssignTerritory = async (territoryId, publisherName) => {
    try {
      // Verificar si es reasignación
      const territory = territories.find(t => t.id === territoryId);
      const isReassignment = territory?.status === 'En uso' && territory?.assignedTo && territory.assignedTo !== publisherName;
      
      await updateDoc(doc(db, 'territories', territoryId), {
        status: 'En uso',
        assignedTo: publisherName,
        assignedDate: serverTimestamp(),
        lastWorked: serverTimestamp()
      });

      await addDoc(collection(db, 'territoryHistory'), {
        territoryId,
        territoryName: territory?.name || 'Desconocido',
        assignedTo: publisherName,
        status: isReassignment ? 'Reasignado' : 'Asignado',
        assignedDate: serverTimestamp()
      });

      const territoryName = territory?.name || territoryId;
      const message = isReassignment 
        ? `Territorio ${territoryName} reasignado a ${publisherName}`
        : `Territorio ${territoryName} asignado a ${publisherName}`;
      showToast(message, 'success');
    } catch (error) {
      console.error('Error assigning territory:', error);
      showToast('Error al asignar territorio', 'error');
      throw error;
    }
  };

  const handleReturnTerritory = async (territoryId) => {
    try {
      const territory = territories.find(t => t.id === territoryId);
      
      await updateDoc(doc(db, 'territories', territoryId), {
        status: 'Disponible',
        assignedTo: null,
        assignedDate: null,
        lastWorked: serverTimestamp()
      });

      if (territory) {
        await addDoc(collection(db, 'territoryHistory'), {
          territoryId,
          territoryName: territory.name,
          assignedTo: territory.assignedTo,
          status: 'Devuelto',
          assignedDate: serverTimestamp()
        });
      }

      showToast(`Territorio ${territory?.name || territoryId} devuelto`, 'success');
    } catch (error) {
      console.error('Error returning territory:', error);
      showToast('Error al devolver territorio', 'error');
      throw error;
    }
  };

  const handleCompleteTerritory = async (territoryId) => {
    try {
      const territory = territories.find(t => t.id === territoryId);
      
      await updateDoc(doc(db, 'territories', territoryId), {
        status: 'Completado',
        completedDate: serverTimestamp(),
        completedBy: currentUser?.name || 'Usuario',
        lastWorked: serverTimestamp()
      });

      if (territory) {
        await addDoc(collection(db, 'territoryHistory'), {
          territoryId,
          territoryName: territory.name,
          assignedTo: territory.assignedTo,
          status: 'Completado',
          completedDate: serverTimestamp(),
          assignedDate: territory.assignedDate || serverTimestamp()
        });
      }

      showToast(`Territorio ${territory?.name || territoryId} completado`, 'success');
    } catch (error) {
      console.error('Error completing territory:', error);
      showToast('Error al completar territorio', 'error');
      throw error;
    }
  };

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
        await handleUpdateAddress(proposal.addressId, proposal.changes);
      } else if (proposal.type === 'new') {
        await handleAddNewAddress(proposal.territoryId, proposal.addressData);
      }

      await updateDoc(doc(db, 'proposals', proposalId), {
        status: 'approved',
        approvedBy: currentUser?.id || 'unknown',
        approvedAt: serverTimestamp()
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
        rejectedBy: currentUser?.id || 'unknown',
        rejectedAt: serverTimestamp()
      });
      showToast('Propuesta rechazada', 'success');
    } catch (error) {
      console.error('Error rejecting proposal:', error);
      showToast('Error al rechazar propuesta', 'error');
      throw error;
    }
  };

  // 🛠️ ADMIN FUNCTIONS
  const handleToggleAdminMode = useCallback(() => {
    setAdminEditMode(prev => !prev);
  }, []);

  const resetAdminModeQuietly = useCallback(() => {
    setAdminEditMode(false);
  }, []);

  const handleResetSingleTerritory = async (territoryId) => {
    try {
      const territoryDoc = await getDoc(doc(db, 'territories', territoryId));
      if (!territoryDoc.exists()) {
        showToast('Error: No se encontró el territorio.', 'error');
        return;
      }
      const territoryName = territoryDoc.data().name;
      
      showToast(`Reiniciando territorio ${territoryName}...`, 'info');

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
      
      await addDoc(collection(db, 'territoryHistory'), {
        territoryId: territoryId,
        territoryName: territoryName,
        status: 'Reiniciado (Admin)',
        assignedDate: serverTimestamp(),
        assignedTo: currentUser?.name || 'Admin'
      });

      showToast(`Territorio ${territoryName} ha sido reiniciado.`, 'success');
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

      await addDoc(collection(db, 'territoryHistory'), {
        status: 'Reinicio General',
        assignedDate: serverTimestamp(),
        assignedTo: currentUser?.name || 'Admin'
      });

      showToast('¡Reinicio completado! Todos los territorios y direcciones han sido restaurados.', 'success');
    } catch (error) {
      console.error("Error durante el reinicio total:", error);
      showToast('Ocurrió un error durante el reinicio. Por favor, revisa la consola.', 'error');
      throw error;
    }
  };

  // 🚀 INICIALIZACIÓN Y GESTIÓN DE AUTENTICACIÓN PERSONALIZADA
  useEffect(() => {
    const initializeAuth = async () => {
      console.log('🔄 Inicializando autenticación...');
      setAuthLoading(true);
      
      try {
        // Intentar restaurar sesión desde sessionStorage
        const savedUser = sessionStorage.getItem('currentUser');
        
        if (savedUser) {
          const userData = JSON.parse(savedUser);
          console.log('👤 Restaurando sesión para:', userData.name);
          
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
            console.log('✅ Sesión restaurada exitosamente');
          } else {
            console.log('⚠️ Usuario no existe, limpiando sesión');
            sessionStorage.removeItem('currentUser');
            setCurrentUser(null);
          }
        } else {
          console.log('ℹ️ No hay sesión guardada');
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

        // Suscripción a propuestas (solo para admins)
        let unsubProposals = () => {};
        if (currentUser.role === 'admin') {
          const proposalsQuery = query(collection(db, 'proposals'), orderBy('createdAt', 'desc'));
          unsubProposals = onSnapshot(proposalsQuery, (snapshot) => {
            const proposalsData = snapshot.docs.map(doc => ({
              id: doc.id,
              ...doc.data()
            }));
            setProposals(proposalsData);
          });
        }

        // Guardar funciones de cleanup
        unsubscribesRef.current = [unsubTerritories, unsubAddresses, unsubUsers, unsubProposals];
        
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

  // 📊 CALCULAR TERRITORIOS CON CONTEO DE DIRECCIONES
  const territoriesWithCount = useMemo(() => {
    return territories.map(territory => {
      const territoryAddresses = addresses.filter(addr => addr.territoryId === territory.id);
      return {
        ...territory,
        addressCount: territoryAddresses.length,
        visitedCount: territoryAddresses.filter(addr => addr.isVisited).length
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
    isLoading,
    authLoading,
    CURRENT_VERSION,
    adminEditMode,
    
    // Auth functions
    login,
    logout,
    updatePassword,
    
    // Territory functions
    handleAssignTerritory,
    handleReturnTerritory,
    handleCompleteTerritory,
    
    // Address functions
    handleToggleAddressStatus,
    handleResetSingleTerritory,
    handleResetAllTerritories,
    handleAddNewAddress,
    handleUpdateAddress,
    handleDeleteAddress,
    
    // Proposal functions
    handleProposeAddressChange,
    handleProposeNewAddress,
    handleApproveProposal,
    handleRejectProposal,

    // Admin functions
    handleToggleAdminMode,
    resetAdminModeQuietly,
    
    // Sync functions
    syncTerritoryStatus
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export default AppContext; 