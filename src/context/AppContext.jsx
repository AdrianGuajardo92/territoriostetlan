import React, { createContext, useState, useEffect, useContext, useCallback, useMemo, useRef } from 'react';
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
  const [adminEditMode, setAdminEditMode] = useState(false);
  const { showToast } = useToast();
  
  // OPTIMIZACIÓN FASE 2: Refs para evitar re-renders ⚡
  const unsubscribersRef = useRef([]);
  const currentUserRef = useRef(currentUser);

  const CURRENT_VERSION = '2.7.1';
  
  // OPTIMIZACIÓN: Actualizar ref cuando cambie currentUser ⚡
  useEffect(() => {
    currentUserRef.current = currentUser;
  }, [currentUser]);

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

  // OPTIMIZACIÓN: Memoizar funciones críticas ⚡
  const login = useCallback(async (accessCode, password) => {
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
  }, []); // No dependencies needed

  const logout = useCallback(async () => {
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
  }, []); // No dependencies needed

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

  // OPTIMIZACIÓN FASE 2: Event listeners consolidados ⚡
  useEffect(() => {
    if (!currentUser) {
      // Limpiar unsubscribers anteriores si hay
      unsubscribersRef.current.forEach(unsub => unsub());
      unsubscribersRef.current = [];
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

        // OPTIMIZACIÓN: Almacenar unsubscribers en ref ⚡
        unsubscribersRef.current = [
          unsubscribeTerritories,
          unsubscribeAddresses,
          unsubscribePublishers,
          ...(unsubscribeUsers ? [unsubscribeUsers] : []),
          unsubscribeProposals
        ];

        setIsLoading(false);

        return () => {
          // Usar ref para cleanup más eficiente
          unsubscribersRef.current.forEach(unsub => unsub());
          unsubscribersRef.current = [];
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
      // Actualizar el territorio - LIMPIEZA COMPLETA del estado
      await updateDoc(doc(db, 'territories', territoryId), {
        status: 'Disponible',
        assignedTo: '',
        assignedAt: null,
        assignedDate: null, // Limpiar campo alternativo
        returnedAt: serverTimestamp(),
        // Limpiar TODOS los campos de completado para que vuelva al estado predeterminado
        completedBy: null,
        completedById: null,
        completedDate: null,
        terminadoPor: null, // Para compatibilidad con datos antiguos
        terminadoDate: null, // Para compatibilidad con datos antiguos
        lastWorked: null
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

      showToast('Territorio devuelto y limpiado correctamente', 'success');
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

  // OPTIMIZACIÓN: Advanced Address functions memoizadas ⚡
  const handleToggleAddressStatus = useCallback(async (addressId, currentStatus) => {
    const newVisitedStatus = !currentStatus;
    
    try {
      const addressRef = doc(db, 'addresses', addressId);
      await updateDoc(addressRef, {
        isVisited: newVisitedStatus,
        lastUpdated: serverTimestamp()
      });

      // Obtener territoryId SIEMPRE (tanto para marcar como para desmarcar)
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

      // ✅ SINCRONIZACIÓN AUTOMÁTICA: Verificar estado del territorio SIEMPRE
      await syncTerritoryStatus(territoryId, newVisitedStatus);

    } catch (error) {
      console.error("Error en handleToggleAddressStatus:", error);
      showToast('Error al actualizar estado de dirección.', 'error');
      throw error;
    }
  }, [addresses, currentUser, showToast]); // Dependencies para useCallback

  // ✅ NUEVA FUNCIÓN: Sincronizar estado del territorio con sus direcciones
  const syncTerritoryStatus = async (territoryId, triggeredByVisited) => {
    try {
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
      
      if (allAddresses.length === 0) return; // No hay direcciones
      
      const allVisited = allAddresses.every(addr => addr.isVisited === true);
      const hasUnvisited = allAddresses.some(addr => addr.isVisited === false);
      
      // Obtener estado actual del territorio
      const territoryRef = doc(db, 'territories', territoryId);
      const territoryDoc = await getDoc(territoryRef);
      
      if (!territoryDoc.exists()) return;
      
      const territoryData = territoryDoc.data();
      const currentStatus = territoryData.status;
      
      // ✅ LÓGICA DE SINCRONIZACIÓN BIDIRECCIONAL
      
      if (allVisited && currentStatus === 'En uso') {
        // CASO 1: Todas visitadas + territorio en uso → COMPLETAR
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
          status: 'Completado Automáticamente',
          completedDate: serverTimestamp(),
          assignedDate: territoryData.assignedDate || serverTimestamp()
        });

        showToast(`🎉 ${territoryData.name} completado automáticamente`, 'success', 3000);
      } 
      else if (hasUnvisited && (currentStatus === 'Completado' || currentStatus === 'Terminado')) {
        // CASO 2: Hay pendientes + territorio completado → REACTIVAR
        
        // Determinar a quién asignar:
        // - Si hay un assignedTo previo válido Y no es admin, mantenerlo
        // - Si no hay assignedTo o es admin, asignar al usuario actual
        let newAssignee = currentUser.name;
        
        if (territoryData.assignedTo && 
            territoryData.assignedTo !== currentUser.name && 
            currentUser.role === 'admin') {
          // El admin está desmarcando pero había otro usuario asignado
          // Mantener la asignación original
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
        
        // Agregar registro al historial
        await addDoc(collection(db, 'territoryHistory'), {
          territoryId: territoryId,
          territoryName: territoryData.name,
          assignedTo: newAssignee,
          status: newAssignee === currentUser.name ? 'Reactivado por desmarcación' : 'Reactivado - asignación mantenida',
          assignedDate: serverTimestamp(),
          previousStatus: currentStatus,
          reactivatedBy: currentUser.name,
          reason: `Dirección desmarcada por ${currentUser.name}`
        });

        const message = newAssignee === currentUser.name 
          ? `📍 ${territoryData.name} reasignado a ${currentUser.name}`
          : `📍 ${territoryData.name} reactivado - sigue asignado a ${newAssignee}`;
        
        showToast(message, 'info', 3000);
      }
      
    } catch (error) {
      console.error("Error en syncTerritoryStatus:", error);
      showToast('Error al sincronizar estado del territorio', 'error');
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

      // Priorizar coordenadas exactas proporcionadas por el usuario
      if (addressData.latitude && addressData.longitude) {
        // Ya tenemos coordenadas exactas - usarlas directamente
        newAddressData.latitude = addressData.latitude;
        newAddressData.longitude = addressData.longitude;
        console.log(`✅ Usando coordenadas exactas proporcionadas: ${addressData.latitude}, ${addressData.longitude}`);
      } else if (addressData.address) {
        // Solo geocodificar si NO hay coordenadas exactas proporcionadas
        try {
          const coords = await geocodeAddress(addressData.address);
          if (coords) {
            newAddressData.latitude = coords.lat;
            newAddressData.longitude = coords.lng;
            console.log(`✅ Coordenadas obtenidas por geocodificación para: ${addressData.address}`);
          }
        } catch (error) {
          console.warn('No se pudieron obtener coordenadas por geocodificación:', error);
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
      
      // 🎯 MENSAJE AMABLE Y CORDIAL - UNA SOLA NOTIFICACIÓN ⭐
      showToast('¡Gracias por tu propuesta! 😊 Se ha enviado para revisión y te notificaremos cuando sea evaluada. Tu colaboración es muy valiosa.', 'success', 4000);
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
      
      // 🎯 MENSAJE AMABLE Y CORDIAL - UNA SOLA NOTIFICACIÓN ⭐
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

  // Admin edit mode functions
  const handleToggleAdminMode = useCallback(() => {
    setAdminEditMode(prev => !prev);
    // Sin notificaciones - el indicador visual es suficiente
  }, []);

  // Función para resetear modo admin sin notificaciones (para auto-reset)
  const resetAdminModeQuietly = useCallback(() => {
    setAdminEditMode(false);
  }, []);

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
    adminEditMode,
    
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
    handleRejectProposal,

    // Admin edit mode functions
    handleToggleAdminMode,
    resetAdminModeQuietly
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export default AppContext; 