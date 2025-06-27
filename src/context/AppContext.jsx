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
  const [publishers, setPublishers] = useState([]);
  const [users, setUsers] = useState([]);
  const [proposals, setProposals] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [authLoading, setAuthLoading] = useState(true);
  const { showToast } = useToast();

  const CURRENT_VERSION = '1.0.1';

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
    setAuthLoading(false);
  }, []);

  const login = async (accessCode, password) => {
    console.log('Intentando login con código:', accessCode);
    try {
      // Buscar usuario por código de acceso
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('accessCode', '==', accessCode.trim().toLowerCase()));
      console.log('Buscando usuario en Firebase...');
      const querySnapshot = await getDocs(q);
      
      console.log('Resultados encontrados:', querySnapshot.size);
      
      if (querySnapshot.empty) {
        console.log('No se encontró usuario con ese código');
        return { success: false, error: 'Código de acceso incorrecto' };
      }
      
      // Verificar contraseña
      const userDoc = querySnapshot.docs[0];
      const userData = userDoc.data();
      console.log('Usuario encontrado:', userData.name);
      
      if (userData.password !== password) {
        console.log('Contraseña incorrecta');
        return { success: false, error: 'Contraseña incorrecta' };
      }
      
      console.log('Login exitoso');
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
      console.error('Error detallado de login:', error);
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
    if (!currentUser) return;

    const loadData = async () => {
      setIsLoading(true);
      try {
        // Load territories
        const unsubscribeTerritories = onSnapshot(
          collection(db, 'territories'),
          (snapshot) => {
            const territoriesData = snapshot.docs.map(doc => ({
              id: doc.id,
              ...doc.data()
            }));
            setTerritories(territoriesData);
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

        // Load publishers
        const unsubscribePublishers = onSnapshot(
          collection(db, 'publishers'),
          (snapshot) => {
            const publishersData = snapshot.docs.map(doc => ({
              id: doc.id,
              ...doc.data()
            }));
            setPublishers(publishersData);
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

  // Territory functions
  const handleAssignTerritory = async (territoryId, publisherName) => {
    try {
      await updateDoc(doc(db, 'territories', territoryId), {
        status: 'En uso',
        assignedTo: publisherName,
        assignedAt: serverTimestamp()
      });
      showToast('Territorio asignado correctamente', 'success');
    } catch (error) {
      console.error('Error assigning territory:', error);
      showToast('Error al asignar territorio', 'error');
      throw error;
    }
  };

  const handleReturnTerritory = async (territoryId) => {
    try {
      await updateDoc(doc(db, 'territories', territoryId), {
        status: 'Disponible',
        assignedTo: '',
        assignedAt: null,
        returnedAt: serverTimestamp()
      });
      showToast('Territorio devuelto correctamente', 'success');
    } catch (error) {
      console.error('Error returning territory:', error);
      showToast('Error al devolver territorio', 'error');
      throw error;
    }
  };

  // Address functions
  const handleAddNewAddress = async (territoryId, addressData) => {
    try {
      await addDoc(collection(db, 'addresses'), {
        ...addressData,
        territoryId,
        createdAt: serverTimestamp(),
        createdBy: currentUser.id
      });
      showToast('Dirección agregada correctamente', 'success');
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
    territories,
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