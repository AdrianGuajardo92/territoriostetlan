import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { useApp } from '../context/AppContext';
import { useToast } from '../hooks/useToast';
import TerritoryDetailHeader from '../components/territories/TerritoryDetailHeader';
import AddressCard from '../components/addresses/AddressCard';
import { LazyAddressFormModal as AddressFormModal } from '../components/modals/LazyModals';
import { LazyAssignTerritoryModal as AssignTerritoryModal } from '../components/modals/LazyModals';
import { LazyMapModal as MapModal } from '../components/modals/LazyModals';
import ConfirmDialog from '../components/common/ConfirmDialog';
import Icon from '../components/common/Icon';
import { optimizeRoute, getCurrentLocation, calculateRouteStats } from '../utils/routeOptimizer';

// 🔄 PASO 11: Funciones helper para asignaciones múltiples
const normalizeAssignedTo = (assignedTo) => {
  if (!assignedTo) return [];
  if (Array.isArray(assignedTo)) return assignedTo;
  return [assignedTo];
};

const getAssignedNames = (assignedTo) => {
  const normalized = normalizeAssignedTo(assignedTo);
  return normalized.filter(name => name && name.trim() !== '');
};

const isUserAssigned = (assignedTo, userName) => {
  if (!userName) return false;
  const names = getAssignedNames(assignedTo);
  return names.includes(userName);
};

const formatTeamNames = (names, isMobile = false) => {
  if (names.length === 0) return '';
  if (names.length === 1) return names[0];
  
  if (isMobile && names.length > 1) {
    const firstNames = names.map(name => name.split(' ')[0]);
    if (firstNames.length === 2) return `${firstNames[0]} y ${firstNames[1]}`;
    return `${firstNames.slice(0, -1).join(', ')} y ${firstNames[firstNames.length - 1]}`;
  }
  
  if (names.length === 2) return `${names[0]} y ${names[1]}`;
  return `${names.slice(0, -1).join(', ')} y ${names[names.length - 1]}`;
};

const TerritoryDetailView = ({ territory, onBack }) => {
  const { 
    addresses, 
    currentUser, 
    handleToggleAddressStatus,
    handleUpdateAddress,
    handleAddNewAddress,
    handleDeleteAddress,
    handleAssignTerritory,
    handleReturnTerritory,
    handleCompleteTerritory,
    handleProposeAddressChange,
    handleProposeNewAddress,
    adminEditMode,
    handleToggleAdminMode,
    resetAdminModeQuietly
  } = useApp();
  
  const { showToast, toast } = useToast();
  
  // Estados
  const [navigatingAddressId, setNavigatingAddressId] = useState(null);
  const [isNavigatingHighlightActive, setIsNavigatingHighlightActive] = useState(false);
  const [showConfirmReturn, setShowConfirmReturn] = useState(false);
  const [showConfirmComplete, setShowConfirmComplete] = useState(false);
  const [viewMode, setViewMode] = useState('grid-full');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingAddress, setEditingAddress] = useState(null);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [isMapModalOpen, setIsMapModalOpen] = useState(false);
  const [sortState, setSortState] = useState({
    sortOrder: 'alpha',
    optimizedRoute: null,
    userLocation: null, // ✅ INCLUIR UBICACIÓN DEL USUARIO EN ESTADO INICIAL
    isCalculatingRoute: false
  });

  const highlightTimerRef = useRef(null);
  const adminModeRef = useRef(adminEditMode);

  // Asegurar que el estado de cálculos esté limpio al montar el componente
  useEffect(() => {
    setSortState(prev => ({
      ...prev,
      isCalculatingRoute: false
    }));
  }, []);

  // Manejar highlight cuando se navega desde el buscador - SIN PARPADEO
  useEffect(() => {
    if (territory.highlightedAddressId) {
      // Activar highlight para la dirección específica - SIN PARPADEO
      setNavigatingAddressId(territory.highlightedAddressId);
      setIsNavigatingHighlightActive(true);
      
      // Scroll hacia la dirección destacada después de un pequeño delay
      setTimeout(() => {
        const addressElement = document.getElementById(`address-card-${territory.highlightedAddressId}`);
        if (addressElement) {
          addressElement.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'center' 
          });
        }
      }, 500);
      
      // Auto-desactivar highlight después de 8 segundos (reducido)
      const timer = setTimeout(() => {
        setIsNavigatingHighlightActive(false);
        setNavigatingAddressId(null);
      }, 8000);
      
      highlightTimerRef.current = timer;
      
      // Limpiar timer al desmontar o cambiar territorio
      return () => {
        if (timer) clearTimeout(timer);
      };
    }
  }, [territory.highlightedAddressId]);

  // Actualizar la referencia cuando cambie el modo admin
  useEffect(() => {
    adminModeRef.current = adminEditMode;
  }, [adminEditMode]);

  // Resetear modo admin al salir del territorio - SIN NOTIFICACIÓN ADICIONAL
  useEffect(() => {
    return () => {
      // Solo resetear silenciosamente si el modo admin está activo al salir
      if (adminModeRef.current && resetAdminModeQuietly) {
        resetAdminModeQuietly();
      }
    };
  }, [resetAdminModeQuietly]);

  // Referencias para event handlers - EVITA RE-SUSCRIPCIONES
  const modalStatesRef = useRef();
  const navigationStateRef = useRef();
  
  // Actualizar refs sin causar re-renders
  modalStatesRef.current = {
    isFormModalOpen,
    isAssignModalOpen, 
    isMapModalOpen,
    showConfirmReturn,
    showConfirmComplete,
    setIsFormModalOpen,
    setIsAssignModalOpen,
    setIsMapModalOpen,
    setShowConfirmReturn,
    setShowConfirmComplete,
    setEditingAddress
  };
  
  navigationStateRef.current = {
    navigatingAddressId,
    setIsNavigatingHighlightActive,
    setNavigatingAddressId
  };

  // EVENT LISTENERS CONSOLIDADOS - OPTIMIZADO ⚡
  useEffect(() => {
    // Handler para botón físico de volver - USA REF para evitar re-suscripciones
    const handleTerritoryPopState = (event) => {
      const modalStates = modalStatesRef.current;
      if (!modalStates) return;
      
      console.log('🏠 TerritoryDetailView - PopState detectado:', {
        hasFormModal: modalStates.isFormModalOpen,
        hasAssignModal: modalStates.isAssignModalOpen,
        hasMapModal: modalStates.isMapModalOpen,
        hasConfirmReturn: modalStates.showConfirmReturn,
        hasConfirmComplete: modalStates.showConfirmComplete
      });
      
      // Solo manejar si hay modales abiertos en el territorio
      // Si no hay modales, dejar que el listener de App.jsx maneje la navegación
      const hasAnyModalOpen = modalStates.isFormModalOpen || 
                              modalStates.isAssignModalOpen || 
                              modalStates.isMapModalOpen || 
                              modalStates.showConfirmReturn || 
                              modalStates.showConfirmComplete;
      
      if (!hasAnyModalOpen) {
        return; // Permitir que App.jsx maneje la navegación hacia la lista de territorios
      }
      
      // Si hay modales abiertos, cerrarlos y prevenir navegación adicional
      event.preventDefault();
      event.stopPropagation();
      
      if (modalStates.isFormModalOpen) {
        modalStates.setIsFormModalOpen(false);
        modalStates.setEditingAddress(null);
      } else if (modalStates.isAssignModalOpen) {
        modalStates.setIsAssignModalOpen(false);
      } else if (modalStates.isMapModalOpen) {
        modalStates.setIsMapModalOpen(false);
      } else if (modalStates.showConfirmReturn) {
        modalStates.setShowConfirmReturn(false);
      } else if (modalStates.showConfirmComplete) {
        modalStates.setShowConfirmComplete(false);
      }
    };

    // Handler para cambio de visibilidad - USA REF para evitar re-suscripciones  
    const handleVisibilityChange = () => {
      const navState = navigationStateRef.current;
      if (!navState) return;
      
      if (document.visibilityState === 'visible' && navState.navigatingAddressId) {
        navState.setIsNavigatingHighlightActive(true);
        // Usar timeout actualizado del scope global
        if (highlightTimerRef.current) clearTimeout(highlightTimerRef.current);
        highlightTimerRef.current = setTimeout(() => {
          navState.setIsNavigatingHighlightActive(false);
          navState.setNavigatingAddressId(null);
        }, 20000);
      } else {
        if (highlightTimerRef.current) clearTimeout(highlightTimerRef.current);
      }
    };

    // SUSCRIPCIÓN ÚNICA - No se re-suscribe a menos que el componente se desmonte
    window.addEventListener('popstate', handleTerritoryPopState);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // CLEANUP CENTRALIZADO
    return () => {
      window.removeEventListener('popstate', handleTerritoryPopState);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      // Limpiar timer si existe
      if (highlightTimerRef.current) {
        clearTimeout(highlightTimerRef.current);
        highlightTimerRef.current = null;
      }
    };
  }, []); // ✅ Sin dependencias - solo se ejecuta al montar/desmontar

  // Hash simple y confiable para direcciones del territorio - PREVIENE BUGS
  const territoryAddressesHash = useMemo(() => {
    // IMPORTANTE: Excluir direcciones archivadas (deleted: true)
    const territoryAddrs = addresses.filter(a => a.territoryId === territory.id && !a.deleted);
    // Crear hash simple y estable: count + IDs ordenados + estados visitados
    const idsHash = territoryAddrs.map(a => a.id).sort().join(',');
    const visitedHash = territoryAddrs.map(a => `${a.id}:${a.isVisited ? '1' : '0'}`).sort().join(',');
    const addressHash = territoryAddrs.map(a => `${a.id}:${a.address}`).sort().join(',');
    return `${territoryAddrs.length}|${idsHash}|${visitedHash}|${addressHash}`;
  }, [addresses, territory.id]);

  // Obtener direcciones del territorio - OPTIMIZADO Y SEGURO
  const territoryAddresses = useMemo(() => {
    // IMPORTANTE: Excluir direcciones archivadas (deleted: true)
    const allTerritoryAddresses = addresses.filter(a => a.territoryId === territory.id && !a.deleted);

    if (sortState.sortOrder === 'optimized' && sortState.optimizedRoute) {
      const liveAddressesMap = new Map(
        allTerritoryAddresses.map(addr => [addr.id, addr])
      );

      // ✅ DIRECCIONES PENDIENTES OPTIMIZADAS (con routeOrder)
      const orderedPendingAddresses = sortState.optimizedRoute.map((staleRouteAddress, index) => {
        const liveAddress = liveAddressesMap.get(staleRouteAddress.id);
        if (liveAddress && !liveAddress.isVisited) { // Solo si sigue siendo pendiente
          liveAddressesMap.delete(staleRouteAddress.id);
          return { 
            ...liveAddress, 
            routeOrder: index + 1,
            distance: staleRouteAddress.distance // Preservar la distancia calculada
          };
        }
        return null;
      }).filter(Boolean);

      // ✅ DIRECCIONES VISITADAS (al final, sin routeOrder)
      const visitedAddresses = allTerritoryAddresses.filter(addr => addr.isVisited);
      
      // ✅ DIRECCIONES RESTANTES (pendientes que no estaban en la optimización)
      const remainingPendingAddresses = Array.from(liveAddressesMap.values()).filter(addr => !addr.isVisited);

      return [...orderedPendingAddresses, ...remainingPendingAddresses, ...visitedAddresses];
    }
    
    return [...allTerritoryAddresses].sort((a, b) => 
      a.address.localeCompare(b.address, undefined, { numeric: true })
    );
  }, [
    // ✅ Dependencias seguras - no se ejecutan filtros en cada render
    territoryAddressesHash,
    sortState.sortOrder,
    sortState.optimizedRoute
  ]);

  // Estadísticas - OPTIMIZADO Y SEGURO
  const stats = useMemo(() => {
    const allAddresses = addresses.filter(a => a.territoryId === territory.id);
    const visitedCount = allAddresses.filter(a => a.isVisited).length;
    const totalCount = allAddresses.length;
    return { 
      visited: visitedCount, 
      total: totalCount, 
      pending: totalCount - visitedCount 
    };
  }, [
    // ✅ Reutiliza el hash ya calculado - más eficiente y seguro
    territoryAddressesHash
  ]);

  // 🔄 PASO 11: Verificar si el territorio está asignado al usuario (incluyendo equipos)
  const isAssignedToMe = territory.status === 'En uso' && isUserAssigned(territory.assignedTo, currentUser?.name);
  const isAdmin = currentUser.role === 'admin';
  
  // 🔄 PASO 11: Información del equipo asignado
  const assignedTeamInfo = useMemo(() => {
    if (!territory.assignedTo) return null;
    
    const names = getAssignedNames(territory.assignedTo);
    const isTeam = names.length > 1;
    const isMobile = window.innerWidth < 640;
    
    return {
      names,
      isTeam,
      count: names.length,
      displayName: formatTeamNames(names, isMobile),
      fullDisplayName: formatTeamNames(names, false)
    };
  }, [territory.assignedTo]);

  // Manejo de navegación - MOVIDO ARRIBA CON MEMOIZACIÓN
  const stopNavigatingHighlight = useCallback(() => {
    if (highlightTimerRef.current) clearTimeout(highlightTimerRef.current);
    setIsNavigatingHighlightActive(false);
    setNavigatingAddressId(null);
  }, []);



  // Funciones auxiliares

  // Manejadores
  const handleReturn = async () => {
    setIsProcessing(true);
    try {
      await handleReturnTerritory(territory.id);
      onBack();
    } catch (error) {
      showToast('Error al devolver territorio', 'error');
    } finally {
      setIsProcessing(false);
      setShowConfirmReturn(false);
    }
  };

  const handleComplete = async () => {
    setIsProcessing(true);
    try {
      await handleCompleteTerritory(territory.id);
      // Notificación eliminada - ya se muestra en handleCompleteTerritory
      onBack();
    } catch (error) {
      showToast('Error al completar territorio', 'error');
    } finally {
      setIsProcessing(false);
      setShowConfirmComplete(false);
    }
  };

  const handleAssignToPublisher = async (publisherName) => {
    setIsProcessing(true);
    try {
      await handleAssignTerritory(territory.id, publisherName);
      setIsAssignModalOpen(false);
      onBack();
    } catch (error) {
      showToast('Error al asignar territorio', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  // OPTIMIZACIÓN: Funciones memoizadas para evitar re-renders de AddressCard ⚡
  const openEditModal = useCallback((address) => {
    setEditingAddress(address);
    setIsFormModalOpen(true);
    // Actualizar el historial para indicar que hay un modal de editar dirección abierto
    window.history.pushState({ 
      app: 'territorios', 
      level: 'territory', 
      territory: territory.id,
      modalType: 'edit-address-modal'
    }, '', window.location.href);
  }, [territory.id]);

  const openAddModal = useCallback(() => {
    setEditingAddress(null);
    setIsFormModalOpen(true);
  }, []);

  const handleNavigationStart = useCallback((addressId) => {
    if (highlightTimerRef.current) clearTimeout(highlightTimerRef.current);
    setNavigatingAddressId(addressId);
  }, []);

  const handleOpenAssignModal = useCallback(() => {
    setIsAssignModalOpen(true);
  }, []);

  const handleOpenMapModal = useCallback(() => {
    setIsMapModalOpen(true);
  }, []);

  const handleShowConfirmReturn = useCallback(() => {
    setShowConfirmReturn(true);
  }, []);

  const handleShowConfirmComplete = useCallback(() => {
    setShowConfirmComplete(true);
  }, []);

  const handleSaveAddress = async (formData, changeReason = '') => {
    setIsProcessing(true);
    try {
      if (!formData.isRevisita) formData.revisitaBy = '';
      if (!formData.isEstudio) formData.estudioBy = '';
      
      if (editingAddress) {
        if (currentUser.role === 'admin') {
          // Usar showSuccessToast: false para evitar notificación duplicada
          await handleUpdateAddress(editingAddress.id, formData, { showSuccessToast: false });
          showToast('Dirección actualizada.', 'success');
        } else {
          await handleProposeAddressChange(editingAddress.id, formData, changeReason);
        }
      } else {
        // ❌ ELIMINADO: Notificación innecesaria de coordenadas (los admins ya saben que se obtienen automáticamente)
        // if (!formData.latitude && !formData.longitude && formData.address) {
        //   showToast('Obteniendo coordenadas automáticamente...', 'info', 3000);
        // }
        
        if (currentUser.role === 'admin' || isAssignedToMe) {
          await handleAddNewAddress(territory.id, formData);
        } else {
          await handleProposeNewAddress(territory.id, formData, changeReason);
        }
      }
      setIsFormModalOpen(false);
      setEditingAddress(null);
    } catch (error) {
      showToast('Error al guardar', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeleteAddressAndClose = async (addressId) => {
    setIsProcessing(true);
    try {
      // Usar showSuccessToast: false para evitar notificación duplicada
      await handleDeleteAddress(addressId, { showSuccessToast: false });
      showToast('Dirección eliminada correctamente.', 'success');
      setIsFormModalOpen(false);
      setEditingAddress(null);
    } catch (error) {
      showToast('Error al eliminar la dirección.', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleOptimizedRoute = useCallback(async () => {
    if (!navigator.geolocation) {
      showToast('Geolocalización no disponible en este dispositivo', 'error');
      return;
    }

    setSortState(prev => ({ ...prev, isCalculatingRoute: true }));

    try {
      const position = await new Promise((resolve, reject) => {
        const timeoutId = setTimeout(() => {
          reject({ code: 3, message: 'Timeout' });
        }, 15000); // 15 segundos timeout

        navigator.geolocation.getCurrentPosition(
          (pos) => {
            clearTimeout(timeoutId);
            resolve(pos);
          },
          (err) => {
            clearTimeout(timeoutId);
            reject(err);
          },
          {
            enableHighAccuracy: true,
            timeout: 12000,
            maximumAge: 300000
          }
        );
      });

      const userLocation = {
        lat: position.coords.latitude,
        lng: position.coords.longitude
      };

      // ✅ FILTRAR DIRECCIONES VISITADAS - Solo optimizar las pendientes
      const pendingAddresses = territoryAddresses.filter(address => !address.isVisited);
      
      if (pendingAddresses.length === 0) {
        showToast('No hay direcciones pendientes para optimizar', 'info');
        setSortState(prev => ({ ...prev, isCalculatingRoute: false }));
        return;
      }

      const optimizedAddresses = await optimizeRoute(pendingAddresses, userLocation);

      setSortState({
        sortOrder: 'optimized',
        optimizedRoute: optimizedAddresses,
        userLocation: userLocation, // ✅ GUARDAR UBICACIÓN DEL USUARIO
        isCalculatingRoute: false
      });

      showToast('Ruta optimizada creada exitosamente', 'success');
    } catch (error) {
      console.error('Error optimizando ruta:', error);
      
      // SIEMPRE resetear el estado, sin importar el tipo de error
      setSortState(prev => ({ 
        ...prev, 
        isCalculatingRoute: false 
      }));
      
      if (error.code === 1) {
        showToast('Permisos de ubicación denegados. Revisa la configuración de tu navegador.', 'error');
      } else if (error.code === 2) {
        showToast('No se pudo obtener tu ubicación. Intenta nuevamente.', 'error');
      } else if (error.code === 3) {
        showToast('Tiempo de espera agotado obteniendo ubicación.', 'error');
      } else {
        showToast('Error al crear la ruta optimizada', 'error');
      }
    }
  }, [territoryAddresses, showToast]);

  const handleResetSort = () => {
    setSortState({
      sortOrder: 'alpha',
      optimizedRoute: null,
      userLocation: null, // ✅ LIMPIAR UBICACIÓN DEL USUARIO
      isCalculatingRoute: false
    });
  };

  // Función de emergencia para desbloquear el botón si está atascado
  const forceResetRouteState = useCallback(() => {
    setSortState(prev => ({
      ...prev,
      isCalculatingRoute: false
    }));
    showToast('Estado de ruta reseteado', 'info');
  }, [showToast]);



  // OPTIMIZACIÓN: handleUpdateAddressSilent memoizada - Clave para MapModal ⚡
  const handleUpdateAddressSilent = useCallback(async (addressId, updatedData) => {
    try {
      const address = addresses.find(a => a.id === addressId);
      
      // Si es solo un cambio de estado visitado (toggle), usar la función específica
      if (address && 'isVisited' in updatedData && Object.keys(updatedData).length <= 2) { // <= 2 por isVisited y lastUpdated
        // handleToggleAddressStatus espera el estado ACTUAL para togglearlo
        await handleToggleAddressStatus(addressId, address.isVisited);
      } else {
        // Para otros cambios (edición completa de datos), usar la función de actualización completa
        await handleUpdateAddress(addressId, updatedData);
      }
    } catch (error) {
      console.error('Error updating address:', error);
      showToast('Error al actualizar dirección', 'error');
      throw error;
    }
  }, [addresses, handleToggleAddressStatus, handleUpdateAddress, showToast]);

  // Manejar el cierre del modal de editar dirección desde el botón físico de volver
  useEffect(() => {
    const handleCloseAddressFormModal = () => {
      if (isFormModalOpen) {
        setIsFormModalOpen(false);
        setEditingAddress(null);
        // Limpiar el estado del historial al cerrar el modal
        if (window.history.state?.modalType === 'edit-address-modal') {
          window.history.back();
        }
      }
    };

    window.addEventListener('closeAddressFormModal', handleCloseAddressFormModal);
    return () => window.removeEventListener('closeAddressFormModal', handleCloseAddressFormModal);
  }, [isFormModalOpen]);

  // OPTIMIZACIÓN: Handlers específicos memoizados ⚡
  const createEditHandler = useCallback((address) => () => openEditModal(address), [openEditModal]);
  const createNavigateHandler = useCallback((addressId) => () => handleNavigationStart(addressId), [handleNavigationStart]);

  return (
    <div className="min-h-screen bg-slate-100 pb-4">
      <TerritoryDetailHeader
        territory={territory}
        stats={stats}
        onBack={onBack}
        isAdmin={currentUser.role === 'admin'}
        isProcessing={isProcessing}
        onAssign={handleOpenAssignModal}
        onReturn={handleShowConfirmReturn}
        onComplete={handleShowConfirmComplete}
        onAddAddress={openAddModal}
        isAssignedToMe={isAssignedToMe}
        assignedTeamInfo={assignedTeamInfo} // 🔄 PASO 11: Pasar información del equipo
        sortControls={{
          sortOrder: sortState.sortOrder,
          isCalculatingRoute: sortState.isCalculatingRoute,
          onOptimizedRoute: handleOptimizedRoute,
          onResetSort: handleResetSort,
          forceReset: forceResetRouteState
        }}
        viewControls={{
          viewMode,
          setViewMode
        }}
        onOpenMapModal={handleOpenMapModal}
        adminEditMode={adminEditMode}
        onToggleAdminMode={handleToggleAdminMode}
      />

      {/* Lista de direcciones */}
      <main className="px-4 py-4">
        {territoryAddresses.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl shadow-sm">
            <Icon name="home" size={48} className="mx-auto mb-4 text-gray-300" />
            <p className="text-gray-500 font-medium text-lg mb-4">
              No hay direcciones registradas
            </p>
            <button
              onClick={openAddModal}
              className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transform hover:scale-[1.02] transition-all"
            >
              Agregar primera dirección
            </button>
          </div>
        ) : (
          <div className={`
            ${viewMode === 'grid-full' ? 'grid grid-cols-1 gap-4' : ''}
            ${viewMode === 'list' ? 'space-y-2' : ''}
          `}>
            {territoryAddresses.map((address) => (
              <AddressCard
                key={address.id}
                address={address}
                viewMode={viewMode}
                isAdmin={isAdmin}
                isAssignedToMe={isAssignedToMe}
                onEdit={createEditHandler(address)}
                onNavigate={createNavigateHandler(address.id)}
                isNavigating={navigatingAddressId === address.id && isNavigatingHighlightActive}
                onUpdate={handleUpdateAddressSilent}
                showToast={showToast}
              />
            ))}
          </div>
        )}
      </main>

      {/* Modales */}
      {isFormModalOpen && (
        <AddressFormModal
          isOpen={isFormModalOpen}
          onClose={() => {
            setIsFormModalOpen(false);
            setEditingAddress(null);
            // Limpiar el estado del historial al cerrar el modal
            if (window.history.state?.modalType === 'edit-address-modal') {
              window.history.back();
            }
          }}
          address={editingAddress}
          territoryId={territory.id}
          onSave={handleSaveAddress}
          onDelete={isAdmin && editingAddress ? handleDeleteAddressAndClose : null}
          isProcessing={isProcessing}
          modalId={editingAddress ? 'edit-address-modal' : 'add-address-modal'}
        />
      )}

      {isAssignModalOpen && (
        <AssignTerritoryModal
          isOpen={isAssignModalOpen}
          onClose={() => setIsAssignModalOpen(false)}
          onAssign={handleAssignToPublisher}
          currentAssignee={territory.assignedTo}
          territoryName={territory.name}
          modalId="assign-territory-modal"
        />
      )}

      {isMapModalOpen && (
        <MapModal
          isOpen={isMapModalOpen}
          onClose={() => {
            console.log('🗺️ Cerrando modal del mapa - permaneciendo en territorio');
            setIsMapModalOpen(false);
          }}
          territory={territory}
          addresses={territoryAddresses}
          isAssignedToMe={isAssignedToMe}
          isAdmin={isAdmin}
          adminEditMode={adminEditMode} // ✅ PASAR MODO ADMINISTRADOR AL MAPA
          onEditAddress={openEditModal}
          sortState={sortState}
          onOptimizedRoute={handleOptimizedRoute}
          onResetSort={handleResetSort}
          onToggleAddressStatus={handleUpdateAddressSilent}
          modalId="territory-map-modal"
        />
      )}

      {showConfirmReturn && (
        <ConfirmDialog
          isOpen={showConfirmReturn}
          onClose={() => setShowConfirmReturn(false)}
          onConfirm={handleReturn}
          title="¿Devolver territorio?"
          message={`¿Estás seguro de que quieres devolver el territorio "${territory.name}"?`}
          confirmText="Sí, devolver"
          cancelText="Cancelar"
          type="warning"
          modalId="confirm-return-territory"
        />
      )}

      {showConfirmComplete && (
        <ConfirmDialog
          isOpen={showConfirmComplete}
          onClose={() => setShowConfirmComplete(false)}
          onConfirm={handleComplete}
          title="¿Marcar como completado?"
          message={`¿Estás seguro de que quieres marcar el territorio "${territory.name}" como completado?`}
          confirmText="Sí, completar"
          cancelText="Cancelar"
          type="success"
          modalId="confirm-complete-territory"
        />
      )}
    </div>
  );
};

export default TerritoryDetailView; 