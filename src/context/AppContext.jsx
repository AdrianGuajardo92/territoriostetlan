import React, { createContext, useState, useEffect, useContext, useCallback } from 'react';
import { db } from '../config/firebase';
import { 
  collection, 
  doc, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  onSnapshot,
  query,
  where,
  orderBy,
  serverTimestamp,
  getDoc
} from 'firebase/firestore';
import { useToast } from '../hooks/useToast';

const AppContext = createContext();

// Función de diagnóstico para verificar Firebase
export const testFirebaseConnection = async () => {
  console.log('=== TEST DIRECTO DE FIREBASE ===');
  try {
    // Test 1: Verificar conexión con users (la colección correcta)
    console.log('Test 1: Intentando leer colección users...');
    const usersSnapshot = await getDocs(collection(db, 'users'));
    console.log('Users encontrados:', usersSnapshot.size);
    usersSnapshot.forEach(doc => {
      const userData = doc.data();
      console.log('User:', doc.id, {
        name: userData.name,
        accessCode: userData.accessCode,
        role: userData.role
      });
    });

    // Test 2: Verificar conexión con territories
    console.log('\nTest 2: Intentando leer colección territories...');
    const territoriesSnapshot = await getDocs(collection(db, 'territories'));
    console.log('Territories encontrados:', territoriesSnapshot.size);
    
    // Test 3: Verificar estructura de datos
    console.log('\nTest 3: Verificando estructura de datos...');
    const sampleUser = usersSnapshot.docs[0]?.data();
    if (sampleUser) {
      console.log('Muestra de usuario:', sampleUser);
    }
    
    // Test 4: Verificar integridad de datos
    const usersWithNames = usersSnapshot.docs.filter(doc => 
      doc.data().name && doc.data().accessCode
    ).length;
    console.log(`\nUsuarios con datos completos: ${usersWithNames}/${usersSnapshot.size}`);

    return {
      usersCount: usersSnapshot.size,
      usersWithCompleteData: usersWithNames,
      territoriesCount: territoriesSnapshot.size,
      success: true
    };
  } catch (error) {
    console.error('ERROR EN TEST DE FIREBASE:', error);
    console.error('Código de error:', error.code);
    console.error('Mensaje:', error.message);
    return {
      error: error.message,
      code: error.code,
      success: false
    };
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
  const [currentUser, setCurrentUser] = useState(null);
  const [territories, setTerritories] = useState([]);
  const [addresses, setAddresses] = useState([]);
  const [territoriesWithCount, setTerritoriesWithCount] = useState([]);
  const [publishers, setPublishers] = useState([]);
  const [users, setUsers] = useState([]);
  const [proposals, setProposals] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [authLoading, setAuthLoading] = useState(true);
  const { showToast } = useToast();

  const CURRENT_VERSION = '2.7.1';

  // Auth functions
  useEffect(() => {
    // Verificar si hay un usuario guardado en localStorage
    const savedUser = localStorage.getItem('currentUser');
    if (savedUser) {
      try {
        const userData = JSON.parse(savedUser);
        setCurrentUser(userData);
      } catch (error) {
        console.error('Error parsing saved user:', error);
        localStorage.removeItem('currentUser');
      }
    }
    
    // Limpiar cualquier estado de navegación anterior de Google Maps (ya no se usa)
    const navigationState = localStorage.getItem('appNavigationState');
    if (navigationState) {
      localStorage.removeItem('appNavigationState');
    }
    
    setAuthLoading(false);
  }, []);

  const login = async (accessCode, password) => {
    try {
      // Buscar usuario por código de acceso
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('accessCode', '==', accessCode.trim().toLowerCase()));
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        return { success: false, error: 'Código de acceso incorrecto' };
      }
      
      // Verificar contraseña
      const userDoc = querySnapshot.docs[0];
      const userData = userDoc.data();
      
      if (userData.password !== password) {
        return { success: false, error: 'Contraseña incorrecta' };
      }
      // Establecer usuario actual
      setCurrentUser({
        id: userDoc.id,
        name: userData.name,
        accessCode: userData.accessCode,
        role: userData.role || 'user',
        ...userData
      });
      
      // Guardar en localStorage
      localStorage.setItem('currentUser', JSON.stringify({
        id: userDoc.id,
        name: userData.name,
        accessCode: userData.accessCode,
        role: userData.role || 'user'
      }));
      
      return { success: true };
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error: 'Error al conectar con el servidor' };
    }
  };

  const logout = async () => {
    try {
      // Limpiar usuario de localStorage
      localStorage.removeItem('currentUser');
      setCurrentUser(null);
      
      // Limpiar estado
      setTerritories([]);
      setAddresses([]);
      setTerritoriesWithCount([]);
      setPublishers([]);
      setUsers([]);
      setProposals([]);
      
      // Redirigir a login
      window.location.hash = '';
      window.location.reload();
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const updatePassword = async (newPassword) => {
    try {
      if (!currentUser || !currentUser.id) {
        return { success: false, error: 'No hay usuario autenticado' };
      }
      
      // Actualizar contraseña en Firestore
      await updateDoc(doc(db, 'users', currentUser.id), {
        password: newPassword,
        updatedAt: serverTimestamp()
      });
      
      return { success: true };
    } catch (error) {
      console.error('Password update error:', error);
      return { success: false, error: 'Error al actualizar contraseña' };
    }
  };

  // Load data
  useEffect(() => {
    if (!currentUser) {
      return;
    }

    const loadData = async () => {
      setIsLoading(true);
      try {
        // Sistema de datos funcionando correctamente

        // Load territories
        const unsubscribeTerritories = onSnapshot(
          collection(db, 'territories'),
          (snapshot) => {
            const territoriesData = snapshot.docs.map(doc => ({
              id: doc.id,
              ...doc.data()
            }));
            setTerritories(territoriesData);
          },
          (error) => {
            console.error('Error loading territories:', error);
            showToast('Error al cargar territorios', 'error');
          }
        );

        // Load addresses
        const unsubscribeAddresses = onSnapshot(
          collection(db, 'addresses'),
          (snapshot) => {
            const addressesData = snapshot.docs.map(doc => ({
              id: doc.id,
              ...doc.data()
            }));
            setAddresses(addressesData);
          }
        );

        // Load users (que son los publicadores/hermanos)
        const unsubscribePublishers = onSnapshot(
          collection(db, 'users'),
          (snapshot) => {
            const publishersData = snapshot.docs.map(doc => ({
              id: doc.id,
              ...doc.data()
            }));
            
            // Filtrar solo usuarios activos si es necesario
            const activeUsers = publishersData.filter(user => 
              user.name && user.accessCode // Asegurar que tengan los campos básicos
            );
            
            setPublishers(activeUsers);
            
            if (activeUsers.length === 0) {
              showToast('⚠️ No hay usuarios disponibles para asignar', 'warning');
            }
          },
          (error) => {
            console.error('Error loading users:', error);
            showToast('Error al cargar la lista de usuarios', 'error');
          }
        );

        // Load users (admin only)
        let unsubscribeUsers = null;
        if (currentUser.role === 'admin') {
          unsubscribeUsers = onSnapshot(
            collection(db, 'users'),
            (snapshot) => {
              const usersData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
              }));
              setUsers(usersData);
            }
          );
        }

        // Load proposals
        const proposalsQuery = currentUser.role === 'admin' 
          ? collection(db, 'proposals')
          : query(collection(db, 'proposals'), where('proposedBy', '==', currentUser.id));
          
        const unsubscribeProposals = onSnapshot(
          proposalsQuery,
          (snapshot) => {
            const proposalsData = snapshot.docs.map(doc => ({
              id: doc.id,
              ...doc.data()
            }));
            setProposals(proposalsData);
          }
        );

        setIsLoading(false);

        return () => {
          unsubscribeTerritories();
          unsubscribeAddresses();
          unsubscribePublishers();
          if (unsubscribeUsers) unsubscribeUsers();
          unsubscribeProposals();
        };
      } catch (error) {
        console.error('Error loading data:', error);
        setIsLoading(false);
      }
    };

    loadData();
  }, [currentUser]);

  // Calcular addressCount cuando cambien territorios o direcciones
  useEffect(() => {
    if (territories.length > 0 && addresses.length >= 0) {
      // Crear un mapa de conteo de direcciones por territorio
      const addressCountMap = addresses.reduce((acc, address) => {
        if (address.territoryId) {
          acc[address.territoryId] = (acc[address.territoryId] || 0) + 1;
        }
        return acc;
      }, {});

      // Combinar territorios con su conteo de direcciones
      const territoriesWithAddressCount = territories.map(territory => ({
        ...territory,
        addressCount: addressCountMap[territory.id] || 0
      }));

      setTerritoriesWithCount(territoriesWithAddressCount);
    } else {
      setTerritoriesWithCount(territories);
    }
  }, [territories, addresses]);

  // Territory functions
  const handleAssignTerritory = async (territoryId, publisherName) => {
    try {
      // Buscar el ID del usuario basado en el nombre
      const publisher = publishers.find(p => p.name === publisherName);
      const publisherId = publisher?.id || null;
      
      await updateDoc(doc(db, 'territories', territoryId), {
        status: 'En uso',
        assignedTo: publisherName,
        assignedToId: publisherId, // Guardar también el ID del usuario
        assignedDate: serverTimestamp(), // Para mostrar en las tarjetas
        assignedAt: serverTimestamp() // Campo alternativo
      });
      
      // Notificación removida - se maneja desde el modal
    } catch (error) {
      console.error('Error assigning territory:', error);
      showToast('Error al asignar territorio', 'error');
      throw error;
    }
  };

  const handleReturnTerritory = async (territoryId) => {
    try {
      // Actualizar el territorio
      await updateDoc(doc(db, 'territories', territoryId), {
        status: 'Disponible',
        assignedTo: '',
        assignedAt: null,
        returnedAt: serverTimestamp()
      });

      // Resetear todas las direcciones del territorio
      const addressesQuery = query(
        collection(db, 'addresses'),
        where('territoryId', '==', territoryId)
      );
      const addressesSnapshot = await getDocs(addressesQuery);

      // Marcar todas las direcciones como no visitadas
      const resetPromises = addressesSnapshot.docs.map(addressDoc => 
        updateDoc(addressDoc.ref, { 
          isVisited: false,
          lastUpdated: serverTimestamp()
        })
      );
      await Promise.all(resetPromises);

      showToast('Territorio devuelto correctamente', 'success');
    } catch (error) {
      console.error('Error returning territory:', error);
      showToast('Error al devolver territorio', 'error');
      throw error;
    }
  };

  const handleCompleteTerritory = async (territoryId) => {
    try {
      const territory = territoriesWithCount.find(t => t.id === territoryId);
      if (!territory) throw new Error('Territorio no encontrado');

      // Guardar tanto el ID como el nombre del usuario que completa
      await updateDoc(doc(db, 'territories', territoryId), {
        status: 'Completado',
        completedBy: currentUser.name, // Nombre para compatibilidad con datos antiguos
        completedById: currentUser.id, // ID del usuario para búsquedas correctas
        terminadoPor: currentUser.name, // Para compatibilidad con datos antiguos
        completedDate: serverTimestamp(),
        terminadoDate: serverTimestamp(), // Para compatibilidad con datos antiguos
        lastWorked: serverTimestamp()
      });
      
      showToast('Territorio marcado como completado', 'success');
    } catch (error) {
      console.error('Error completing territory:', error);
      showToast('Error al completar territorio', 'error');
      throw error;
    }
  };

  // Advanced Address functions - Sistema completo de direcciones
  const handleToggleAddressStatus = async (addressId, currentStatus) => {
    const newVisitedStatus = !currentStatus;
    
    try {
      const addressRef = doc(db, 'addresses', addressId);
      await updateDoc(addressRef, {
        isVisited: newVisitedStatus,
        lastUpdated: serverTimestamp()
      });

      if (!newVisitedStatus) {
        return;
      }

      // Obtener territoryId desde el estado local o desde Firebase
      let territoryId;
      const addressDoc = addresses.find(a => a.id === addressId);
      
      if (addressDoc && addressDoc.territoryId) {
        territoryId = addressDoc.territoryId;
      } else {
        // Si no está en el estado local, consultarlo desde Firebase
        const addressSnapshot = await getDoc(addressRef);
        if (!addressSnapshot.exists()) {
          console.error("No se pudo encontrar la dirección en Firebase.");
          return;
        }
        territoryId = addressSnapshot.data().territoryId;
      }
      
      if (!territoryId) {
        console.error("No se pudo determinar el territoryId.");
        return;
      }

      // Consultar DIRECTAMENTE desde Firebase todas las direcciones del territorio
      const territoryAddressesQuery = query(
        collection(db, 'addresses'),
        where('territoryId', '==', territoryId)
      );
      const territoryAddressesSnapshot = await getDocs(territoryAddressesQuery);
      
      // Verificar si TODAS las direcciones están visitadas
      const allAddresses = territoryAddressesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      const allVisited = allAddresses.length > 0 && 
                        allAddresses.every(addr => addr.isVisited === true);

      if (allVisited) {
        const territoryRef = doc(db, 'territories', territoryId);
        const territoryDoc = await getDoc(territoryRef);

        if (territoryDoc.exists() && territoryDoc.data().status === 'En uso') {
          const territoryData = territoryDoc.data();
          const completedBy = territoryData.assignedTo || currentUser.name;

          await updateDoc(territoryRef, {
            status: 'Completado',
            assignedTo: null,
            assignedDate: null,
            completedDate: serverTimestamp(),
            completedBy: completedBy,
            lastWorked: serverTimestamp()
          });
          
          // Agregar registro al historial
          await addDoc(collection(db, 'territoryHistory'), {
            territoryId: territoryId,
            territoryName: territoryData.name,
            assignedTo: completedBy,
            status: 'Completado',
            completedDate: serverTimestamp(),
            assignedDate: territoryData.assignedDate || serverTimestamp()
          });

          // Sin notificación - solo feedback visual
        }
      }
    } catch (error) {
      console.error("Error en handleToggleAddressStatus:", error);
      showToast('Error al actualizar estado de dirección.', 'error');
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
      
      showToast(`Reiniciando territorio ${territoryName}...`, 'info');

      const territoryRef = doc(db, 'territories', territoryId);
      const addressesQuery = query(
        collection(db, 'addresses'),
        where('territoryId', '==', territoryId)
      );
      const addressesSnapshot = await getDocs(addressesQuery);

      // Actualizar territorio
      await updateDoc(territoryRef, {
        status: 'Disponible',
        assignedTo: null,
        assignedDate: null,
        completedDate: null,
        completedBy: null
      });

      // Actualizar todas las direcciones
      const batch = [];
      addressesSnapshot.docs.forEach(addressDoc => {
        batch.push(
          updateDoc(addressDoc.ref, { isVisited: false })
        );
      });
      await Promise.all(batch);
      
      // Agregar al historial
      await addDoc(collection(db, 'territoryHistory'), {
        territoryId: territoryId,
        territoryName: territoryName,
        status: 'Reiniciado (Admin)',
        assignedDate: serverTimestamp(),
        assignedTo: currentUser.name
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

      // Obtener todos los territorios y direcciones
      const territoriesSnapshot = await getDocs(collection(db, 'territories'));
      const addressesSnapshot = await getDocs(collection(db, 'addresses'));

      const batchPromises = [];
      const BATCH_SIZE = 400; // Mantener bajo el límite de Firestore

      // Resetear territorios en lotes
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

      // Resetear direcciones en lotes
      for (let i = 0; i < addressesSnapshot.docs.length; i += BATCH_SIZE) {
        const batch = addressesSnapshot.docs.slice(i, i + BATCH_SIZE);
        const updates = batch.map(doc => 
          updateDoc(doc.ref, { isVisited: false })
        );
        batchPromises.push(Promise.all(updates));
      }

      await Promise.all(batchPromises);

      // Agregar registro al historial
      await addDoc(collection(db, 'territoryHistory'), {
        status: 'Reinicio General',
        assignedDate: serverTimestamp(),
        assignedTo: currentUser.name
      });

      showToast('¡Reinicio completado! Todos los territorios y direcciones han sido restaurados.', 'success');
    } catch (error) {
      console.error("Error durante el reinicio total:", error);
      showToast('Ocurrió un error durante el reinicio. Por favor, revisa la consola.', 'error');
      throw error;
    }
  };

  // Address functions (mantener las existentes)
  const handleAddNewAddress = async (territoryId, addressData) => {
    try {
      // Función auxiliar para geocodificar automáticamente
      const geocodeAddress = async (addressText) => {
        if (!addressText || !addressText.trim()) return null;
        
        try {
          // Agregar "Guadalajara, Jalisco, México" para mejorar precisión
          const fullAddress = `${addressText.trim()}, Guadalajara, Jalisco, México`;
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
            return {
              lat: parseFloat(result.lat),
              lng: parseFloat(result.lon)
            };
          }
        } catch (error) {
          console.warn('Error geocodificando dirección:', error);
        }
        
        return null;
      };

      // Crear los datos de la dirección
      const newAddressData = {
        ...addressData,
        territoryId,
        isVisited: false,
        createdAt: serverTimestamp(),
        createdBy: currentUser.id,
        lastUpdated: serverTimestamp()
      };

      // Si no tiene coordenadas y tiene dirección, intentar geocodificar automáticamente
      if (!addressData.latitude && !addressData.longitude && addressData.address) {
        try {
          const coords = await geocodeAddress(addressData.address);
          if (coords) {
            newAddressData.latitude = coords.lat;
            newAddressData.longitude = coords.lng;
            console.log(`✅ Coordenadas obtenidas automáticamente para: ${addressData.address}`);
          }
        } catch (error) {
          console.warn('No se pudieron obtener coordenadas automáticamente:', error);
          // Continuar sin coordenadas - la dirección se agregará de todas formas
        }
      }

      // Guardar en Firebase
      await addDoc(collection(db, 'addresses'), newAddressData);
      
      // Mostrar mensaje apropiado según si se obtuvieron coordenadas
      if (newAddressData.latitude && newAddressData.longitude) {
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
        updatedBy: currentUser.id
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

  // Proposal functions
  const handleProposeAddressChange = async (addressId, changes, reason) => {
    try {
      await addDoc(collection(db, 'proposals'), {
        type: 'edit',
        addressId,
        territoryId: addresses.find(a => a.id === addressId)?.territoryId,
        changes,
        reason,
        status: 'pending',
        proposedBy: currentUser.id,
        proposedByName: currentUser.name,
        createdAt: serverTimestamp()
      });
      showToast('Propuesta enviada para revisión', 'success');
    } catch (error) {
      console.error('Error creating proposal:', error);
      showToast('Error al crear propuesta', 'error');
      throw error;
    }
  };

  const handleProposeNewAddress = async (territoryId, addressData, reason) => {
    try {
      await addDoc(collection(db, 'proposals'), {
        type: 'new',
        territoryId,
        addressData,
        reason,
        status: 'pending',
        proposedBy: currentUser.id,
        proposedByName: currentUser.name,
        createdAt: serverTimestamp()
      });
      showToast('Propuesta de nueva dirección enviada', 'success');
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
        approvedBy: currentUser.id,
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
        rejectedBy: currentUser.id,
        rejectedAt: serverTimestamp()
      });
      showToast('Propuesta rechazada', 'success');
    } catch (error) {
      console.error('Error rejecting proposal:', error);
      showToast('Error al rechazar propuesta', 'error');
      throw error;
    }
  };

  const value = {
    // State
    currentUser,
    territories: territoriesWithCount, // Usar territorios con addressCount
    addresses,
    publishers,
    users,
    proposals,
    isLoading,
    authLoading,
    CURRENT_VERSION,
    
    // Auth functions
    login,
    logout,
    updatePassword,
    
    // Territory functions
    handleAssignTerritory,
    handleReturnTerritory,
    handleCompleteTerritory,
    
    // Advanced Address functions - Sistema completo de direcciones
    handleToggleAddressStatus,
    handleResetSingleTerritory,
    handleResetAllTerritories,
    
    // Address functions
    handleAddNewAddress,
    handleUpdateAddress,
    handleDeleteAddress,
    
    // Proposal functions
    handleProposeAddressChange,
    handleProposeNewAddress,
    handleApproveProposal,
    handleRejectProposal
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export default AppContext; 