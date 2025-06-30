import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { useApp } from '../context/AppContext';
import { useToast } from '../hooks/useToast';
import TerritoryDetailHeader from '../components/territories/TerritoryDetailHeader';
import AddressCard from '../components/addresses/AddressCard';
import AddressFormModal from '../components/modals/AddressFormModal';
import AssignTerritoryModal from '../components/modals/AssignTerritoryModal';
import MapModal from '../components/modals/MapModal';
import ConfirmDialog from '../components/common/ConfirmDialog';
import Icon from '../components/common/Icon';
import { optimizeRoute, getCurrentLocation, calculateRouteStats } from '../utils/routeOptimizer';

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
      
      // Los modales ahora se manejan automáticamente con useModalHistory
      // Solo resetear estados locales cuando sea necesario
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
    const territoryAddrs = addresses.filter(a => a.territoryId === territory.id);
    // Crear hash simple y estable: count + IDs ordenados + estados visitados
    const idsHash = territoryAddrs.map(a => a.id).sort().join(',');
    const visitedHash = territoryAddrs.map(a => `${a.id}:${a.isVisited ? '1' : '0'}`).sort().join(',');
    const addressHash = territoryAddrs.map(a => `${a.id}:${a.address}`).sort().join(',');
    return `${territoryAddrs.length}|${idsHash}|${visitedHash}|${addressHash}`;
  }, [addresses, territory.id]);

  // Obtener direcciones del territorio - OPTIMIZADO Y SEGURO
  const territoryAddresses = useMemo(() => {
    const allTerritoryAddresses = addresses.filter(a => a.territoryId === territory.id);

    if (sortState.sortOrder === 'optimized' && sortState.optimizedRoute) {
      const liveAddressesMap = new Map(
        allTerritoryAddresses.map(addr => [addr.id, addr])
      );

      const orderedAddresses = sortState.optimizedRoute.map((staleRouteAddress, index) => {
        const liveAddress = liveAddressesMap.get(staleRouteAddress.id);
        if (liveAddress) {
          liveAddressesMap.delete(staleRouteAddress.id);
          return { 
            ...liveAddress, 
            routeOrder: index + 1,
            distance: staleRouteAddress.distance // Preservar la distancia calculada
          };
        }
        return null;
      }).filter(Boolean);

      const remainingAddresses = Array.from(liveAddressesMap.values());
      return [...orderedAddresses, ...remainingAddresses];
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

  const isAssignedToMe = territory.status === 'En uso' && territory.assignedTo === currentUser.name;
  const isAdmin = currentUser.role === 'admin';

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
      showToast('Territorio marcado como completado', 'success');
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
  }, []);

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
          await handleUpdateAddress(editingAddress.id, formData);
          showToast('Dirección actualizada.', 'success');
        } else {
          await handleProposeAddressChange(editingAddress.id, formData, changeReason);
          showToast('Propuesta enviada para revisión.', 'info');
        }
      } else {
        // Para nuevas direcciones, mostrar feedback de geocodificación
        if (!formData.latitude && !formData.longitude && formData.address) {
          showToast('Obteniendo coordenadas automáticamente...', 'info', 3000);
        }
        
        if (currentUser.role === 'admin' || isAssignedToMe) {
          await handleAddNewAddress(territory.id, formData);
          // El mensaje de éxito se maneja en handleAddNewAddress
        } else {
          await handleProposeNewAddress(territory.id, formData, changeReason);
          showToast('Propuesta de nueva dirección enviada.', 'info');
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
      await handleDeleteAddress(addressId);
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

      const optimizedAddresses = await optimizeRoute(territoryAddresses, userLocation);

      setSortState({
        sortOrder: 'optimized',
        optimizedRoute: optimizedAddresses,
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
          onClose={() => setIsMapModalOpen(false)}
          territory={territory}
          addresses={territoryAddresses}
          isAssignedToMe={isAssignedToMe}
          isAdmin={isAdmin}
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