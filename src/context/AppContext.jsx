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
  const [territoryHistory, setTerritoryHistory] = useState([]); // Agregar estado para historial
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
      } else {
        console.error('❌ DEBUG - Error al cargar version.json:', response.status);
      }
    } catch (error) {
      console.error('❌ DEBUG - Error cargando versión:', error);
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
    const { showSuccessToast = true } = options;
    
    try {
      await deleteDoc(doc(db, 'addresses', addressId));
      if (showSuccessToast) {
        showToast('Dirección eliminada correctamente', 'success');
      }
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

        // Evitar duplicación de "Territorio" en el nombre
        const territoryDisplayName = territoryData.name.toLowerCase().startsWith('territorio') 
          ? territoryData.name 
          : territoryData.name;
          
        const message = newAssignee === currentUser?.name 
          ? `📍 ${territoryDisplayName} reasignado a ${currentUser?.name}`
          : `📍 ${territoryDisplayName} reactivado - sigue asignado a ${newAssignee}`;
        
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
  const handleAssignTerritory = useCallback(async (territoryId, publisherName) => {
    // Prevenir doble llamada con debouncing
    const callKey = `assign_${territoryId}_${publisherName}`;
    if (window.assignmentInProgress && window.assignmentInProgress.has(callKey)) {
      console.log('🚫 Llamada duplicada prevenida:', callKey);
      return;
    }
    
    // Marcar como en progreso
    if (!window.assignmentInProgress) window.assignmentInProgress = new Set();
    window.assignmentInProgress.add(callKey);
    
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

      // Evitar duplicación de "Territorio" en el nombre
      const territoryName = territory?.name || territoryId;
      const displayName = territoryName.toLowerCase().startsWith('territorio') 
        ? territoryName 
        : `Territorio ${territoryName}`;
        
      const message = isReassignment 
        ? `${displayName} reasignado a ${publisherName}`
        : `${displayName} asignado a ${publisherName}`;
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

  const handleReturnTerritory = useCallback(async (territoryId) => {
    // Prevenir doble llamada con debouncing
    const callKey = `return_${territoryId}`;
    if (window.returnInProgress && window.returnInProgress.has(callKey)) {
      console.log('🚫 Llamada duplicada prevenida:', callKey);
      return;
    }
    
    // Marcar como en progreso
    if (!window.returnInProgress) window.returnInProgress = new Set();
    window.returnInProgress.add(callKey);
    
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

      // Evitar duplicación de "Territorio" en el nombre
      const territoryName = territory?.name || territoryId;
      const displayName = territoryName.toLowerCase().startsWith('territorio') 
        ? territoryName 
        : `Territorio ${territoryName}`;
        
      showToast(`${displayName} devuelto`, 'success');
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
  }, [territories]);

  const handleCompleteTerritory = useCallback(async (territoryId) => {
    // Prevenir doble llamada con debouncing
    const callKey = `complete_${territoryId}`;
    if (window.completeInProgress && window.completeInProgress.has(callKey)) {
      console.log('🚫 Llamada duplicada prevenida:', callKey);
      return;
    }
    
    // Marcar como en progreso
    if (!window.completeInProgress) window.completeInProgress = new Set();
    window.completeInProgress.add(callKey);
    
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
        approvedBy: currentUser?.id || 'unknown',
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
        rejectedBy: currentUser?.id || 'unknown',
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

      const batch = db.batch();
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
      console.log('🔍 Buscando propuestas no leídas para:', currentUser.id);
      
      const unreadProposals = proposals.filter(p => 
        p.proposedBy === currentUser.id && 
        ['approved', 'rejected'].includes(p.status) && 
        !p.notificationRead
      );

      console.log('📊 Propuestas no leídas encontradas:', unreadProposals.length);

      if (unreadProposals.length === 0) {
        console.log('✅ No hay propuestas no leídas para marcar');
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
      console.log('✅ Contador de notificaciones actualizado a 0');

      const batch = writeBatch(db);
      unreadProposals.forEach(proposal => {
        const proposalRef = doc(db, 'proposals', proposal.id);
        batch.update(proposalRef, { notificationRead: true });
      });

      await batch.commit();
      console.log(`📱 Marcadas ${unreadProposals.length} propuestas como leídas en Firebase`);
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

      // Verificar si el usuario tiene territorios asignados
      const userToDelete = users.find(u => u.id === userId);
      if (userToDelete) {
        const assignedTerritories = territories.filter(t => t.assignedTo === userToDelete.name);
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

  const handleResetSingleTerritory = async (territoryId) => {
    try {
      const territoryDoc = await getDoc(doc(db, 'territories', territoryId));
      if (!territoryDoc.exists()) {
        showToast('Error: No se encontró el territorio.', 'error');
        return;
      }
      const territoryName = territoryDoc.data().name;
      
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
      
      await addDoc(collection(db, 'territoryHistory'), {
        territoryId: territoryId,
        territoryName: territoryName,
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

  // 📋 Cargar versión al iniciar la aplicación
  useEffect(() => {
    loadAppVersion();
    
    // Cargar versión cada 30 segundos para asegurar actualización
    const versionInterval = setInterval(() => {
      console.log('⏰ DEBUG - Recargando versión...');
      loadAppVersion();
    }, 30000);
    
    return () => clearInterval(versionInterval);
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

        // Guardar funciones de cleanup
        unsubscribesRef.current = [unsubTerritories, unsubAddresses, unsubUsers, unsubProposals, unsubHistory];
        
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
    territoryHistory, // Agregar territoryHistory al contexto
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
    getPendingProposalsCount
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export { AppContext };
export default AppContext; 