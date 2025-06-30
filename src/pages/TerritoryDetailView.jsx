import React, { useState, useMemo, useRef, useEffect } from 'react';
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
    handleReturnTerritory, 
    handleCompleteTerritory,
    handleAssignTerritory, 
    handleUpdateAddress, 
    handleDeleteAddress, 
    handleProposeAddressChange, 
    handleProposeNewAddress, 
    handleAddNewAddress,
    handleToggleAddressStatus
  } = useApp();
  
  const { showToast } = useToast();
  
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

  // Obtener direcciones del territorio
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
          return { ...liveAddress, routeOrder: index + 1 };
        }
        return null;
      }).filter(Boolean);

      const remainingAddresses = Array.from(liveAddressesMap.values());
      return [...orderedAddresses, ...remainingAddresses];
    }
    
    return [...allTerritoryAddresses].sort((a, b) => 
      a.address.localeCompare(b.address, undefined, { numeric: true })
    );
  }, [addresses, territory.id, sortState]);

  // Estadísticas
  const stats = useMemo(() => {
    const allAddresses = addresses.filter(a => a.territoryId === territory.id);
    const visitedCount = allAddresses.filter(a => a.isVisited).length;
    const totalCount = allAddresses.length;
    return { 
      visited: visitedCount, 
      total: totalCount, 
      pending: totalCount - visitedCount 
    };
  }, [addresses, territory.id]);

  const isAssignedToMe = territory.status === 'En uso' && territory.assignedTo === currentUser.name;
  const isAdmin = currentUser.role === 'admin';

  // Manejo de navegación
  const handleNavigationStart = (addressId) => {
    if (highlightTimerRef.current) clearTimeout(highlightTimerRef.current);
    setNavigatingAddressId(addressId);
  };

  const stopNavigatingHighlight = () => {
    if (highlightTimerRef.current) clearTimeout(highlightTimerRef.current);
    setIsNavigatingHighlightActive(false);
    setNavigatingAddressId(null);
  };

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && navigatingAddressId) {
        setIsNavigatingHighlightActive(true);
        highlightTimerRef.current = setTimeout(() => {
          setIsNavigatingHighlightActive(false);
          setNavigatingAddressId(null);
        }, 20000);
      } else {
        if (highlightTimerRef.current) clearTimeout(highlightTimerRef.current);
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (highlightTimerRef.current) clearTimeout(highlightTimerRef.current);
    };
  }, [navigatingAddressId]);

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

  const openEditModal = (address) => {
    setEditingAddress(address);
    setIsFormModalOpen(true);
  };

  const openAddModal = () => {
    setEditingAddress(null);
    setIsFormModalOpen(true);
  };

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

  const handleOptimizedRoute = async () => {
    if (sortState.sortOrder === 'optimized') {
      setSortState(prev => ({ ...prev, sortOrder: 'alpha', optimizedRoute: null }));
      showToast('Ruta optimizada desactivada', 'info');
    } else {
      setSortState(prev => ({ ...prev, isCalculatingRoute: true }));
      
      try {
        // Intentar obtener ubicación del usuario
        let userLocation = null;
        try {
          userLocation = await getCurrentLocation();
          showToast('✅ Ubicación obtenida. La primera dirección será la más cercana a ti.', 'info', 4000);
        } catch (error) {
          console.log('No se pudo obtener ubicación, optimizando sin punto de partida');
          showToast('⚠️ No se pudo obtener tu ubicación. Optimizando sin punto de partida específico.', 'warning', 4000);
        }
        
        // Optimizar la ruta
        const optimizedRoute = await optimizeRoute(territoryAddresses, userLocation);
        
        // Calcular estadísticas de la ruta
        const stats = calculateRouteStats(optimizedRoute);
        
        setSortState(prev => ({ 
          ...prev, 
          sortOrder: 'optimized',
          isCalculatingRoute: false,
          optimizedRoute: optimizedRoute,
          userLocation: userLocation
        }));
        
        // Mostrar información de la ruta optimizada
        let message = '';
        if (stats.addressesWithCoords > 0) {
          const locationText = userLocation 
            ? `🎯 Ruta desde tu ubicación: ${stats.totalDistance} km, ~${stats.estimatedTime} min.`
            : `🗺️ Ruta optimizada: ${stats.totalDistance} km, ~${stats.estimatedTime} min.`;
          message = `${locationText} (${stats.addressesWithCoords} de ${stats.totalAddresses} direcciones con ubicación)`;
        } else {
          message = 'No hay suficientes direcciones con ubicación para optimizar la ruta.';
        }
          
        showToast(message, stats.addressesWithCoords > 0 ? 'success' : 'warning', 6000);
        
      } catch (error) {
        console.error('Error optimizando ruta:', error);
        setSortState(prev => ({ ...prev, isCalculatingRoute: false }));
        showToast('Error al optimizar la ruta', 'error');
      }
    }
  };

  const handleResetSort = () => {
    setSortState({
      sortOrder: 'alpha',
      optimizedRoute: null,
      isCalculatingRoute: false
    });
  };

  // Función para abrir la ruta completa en Google Maps - VERSIÓN INTELIGENTE
  const handleOpenCompleteRoute = async () => {
    try {
      showToast('🔍 Calculando la ruta más eficiente...', 'info', 3000);

      // PASO 1: Siempre intentar obtener la ubicación del usuario
      let userLocation = null;
      try {
        userLocation = await getCurrentLocation();
        showToast('📍 Ubicación obtenida. Calculando ruta desde tu posición...', 'info', 2000);
      } catch (error) {
        console.log('No se pudo obtener ubicación del usuario');
        showToast('⚠️ Sin ubicación GPS. Optimizando ruta sin punto de partida...', 'warning', 2000);
      }

      // PASO 2: Decidir qué direcciones usar
      let addressesToOptimize;
      let useExistingOptimization = false;

      if (sortState.sortOrder === 'optimized' && sortState.optimizedRoute && sortState.optimizedRoute.length > 0) {
        // Ya hay una ruta optimizada activa - usarla
        addressesToOptimize = sortState.optimizedRoute;
        useExistingOptimization = true;
        console.log('🔄 Usando ruta optimizada existente');
      } else {
        // No hay ruta optimizada - usar direcciones originales y optimizar automáticamente
        addressesToOptimize = territoryAddresses;
        useExistingOptimization = false;
        console.log('🧮 Calculando nueva ruta optimizada para Google Maps');
      }

      if (addressesToOptimize.length === 0) {
        showToast('❌ No hay direcciones disponibles para crear la ruta', 'warning');
        return;
      }

      // PASO 3: Si no hay optimización existente, calcular la mejor ruta automáticamente
      let finalAddresses;
      if (!useExistingOptimization) {
        // Calcular ruta optimizada específicamente para Google Maps
        finalAddresses = await optimizeRoute(addressesToOptimize, userLocation);
        console.log('✅ Ruta optimizada calculada automáticamente');
      } else {
        finalAddresses = addressesToOptimize;
      }

      // PASO 4: Verificar que tengamos direcciones válidas
      const addressesWithCoords = finalAddresses.filter(addr => {
        return (addr.latitude && addr.longitude) || 
               (addr.mapUrl && addr.mapUrl.includes('google.com/maps'));
      });

      if (addressesWithCoords.length === 0) {
        showToast('❌ No hay direcciones con coordenadas válidas para crear la ruta', 'error');
        return;
      }

      // PASO 5: La función de Google Maps completa fue eliminada
      // En su lugar, ahora usamos el modal de lista de ruta en el mapa
      showToast('💡 Usa el mapa del territorio → botón "Ver Ruta" para navegar direcciones individuales', 'info', 5000);
      
      // Log para debugging
      console.log('🎯 Ruta preparada:', {
        totalAddresses: finalAddresses.length,
        addressesWithCoords: addressesWithCoords.length,
        userLocation: !!userLocation,
        wasOptimized: !useExistingOptimization,
        note: 'Usar modal de lista en el mapa para navegación individual'
      });
    } catch (error) {
      console.error('❌ Error abriendo ruta completa:', error);
      showToast('Error al calcular la ruta. Intenta de nuevo.', 'error');
    }
  };

  // Función personalizada para actualizar estado sin notificación
  const handleUpdateAddressSilent = async (addressId, updatedData) => {
    try {
      const address = addresses.find(a => a.id === addressId);
      if (address && 'isVisited' in updatedData) {
        // Para cambios de estado visitado, usar la función sin notificación
        await handleToggleAddressStatus(addressId, address.isVisited);
      } else {
        // Para otros cambios (edición de datos), usar la función normal con notificación
        await handleUpdateAddress(addressId, updatedData);
      }
    } catch (error) {
      console.error('Error updating address:', error);
      showToast('Error al actualizar dirección', 'error');
      throw error;
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 pb-4">
      <TerritoryDetailHeader
        territory={territory}
        stats={stats}
        onBack={onBack}
        isAdmin={isAdmin}
        isProcessing={isProcessing}
        onAssign={() => setIsAssignModalOpen(true)}
        onReturn={() => setShowConfirmReturn(true)}
        onComplete={() => setShowConfirmComplete(true)}
        onAddAddress={openAddModal}
        isAssignedToMe={isAssignedToMe}
        sortControls={{
          sortOrder: sortState.sortOrder,
          isCalculatingRoute: sortState.isCalculatingRoute,
          onOptimizedRoute: handleOptimizedRoute,
          onResetSort: handleResetSort
        }}
        viewControls={{
          viewMode,
          setViewMode
        }}
        onOpenMapModal={() => setIsMapModalOpen(true)}
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
                onEdit={() => openEditModal(address)}
                onNavigate={() => handleNavigationStart(address.id)}
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
        />
      )}

      {isAssignModalOpen && (
        <AssignTerritoryModal
          isOpen={isAssignModalOpen}
          onClose={() => setIsAssignModalOpen(false)}
          onAssign={handleAssignToPublisher}
          currentAssignee={territory.assignedTo}
          territoryName={territory.name}
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
        />
      )}
    </div>
  );
};

export default TerritoryDetailView; 