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
import { optimizeRoute, getCurrentLocation, calculateRouteStats, extractCoordinatesFromMapUrl } from '../utils/routeOptimizer';

const TerritoryDetailView = ({ territory, onBack }) => {
  const { 
    addresses, 
    currentUser, 
    handleReturnTerritory, 
    handleAssignTerritory, 
    handleUpdateAddress, 
    handleDeleteAddress, 
    handleProposeAddressChange, 
    handleProposeNewAddress, 
    handleAddNewAddress 
  } = useApp();
  
  const { showToast } = useToast();
  
  // Estados
  const [navigatingAddressId, setNavigatingAddressId] = useState(null);
  const [isNavigatingHighlightActive, setIsNavigatingHighlightActive] = useState(false);
  const [showConfirmReturn, setShowConfirmReturn] = useState(false);
  const [viewMode, setViewMode] = useState('grid-full');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingAddress, setEditingAddress] = useState(null);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [isMapModalOpen, setIsMapModalOpen] = useState(false);
  const [sortState, setSortState] = useState({
    sortOrder: 'alpha',
    userLocation: null,
    isLocating: false,
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
    
    if (sortState.sortOrder === 'distance' && sortState.userLocation) {
      return allTerritoryAddresses.map(address => { 
        const coords = address.latitude && address.longitude 
          ? { lat: address.latitude, lng: address.longitude } 
          : extractCoordinatesFromMapUrl(address.mapUrl);
        const distance = coords ? getDistance(sortState.userLocation.lat, sortState.userLocation.lng, coords.lat, coords.lng) : Infinity;
        return { ...address, distance, hasCoordinates: !!coords };
      }).sort((a, b) => { 
        if(a.hasCoordinates && !b.hasCoordinates) return -1;
        if(!a.hasCoordinates && b.hasCoordinates) return 1;
        return a.distance - b.distance;
      });
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

  const getDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

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
        if (currentUser.role === 'admin' || isAssignedToMe) {
          await handleAddNewAddress(territory.id, formData);
          showToast('Dirección agregada correctamente.', 'success');
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

  const handleSortByDistance = async () => {
    setSortState(prev => ({ ...prev, isLocating: true }));
    try {
      const position = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        });
      });
      
      setSortState(prev => ({
        ...prev,
        sortOrder: 'distance',
        userLocation: {
          lat: position.coords.latitude,
          lng: position.coords.longitude
        },
        isLocating: false,
        optimizedRoute: null
      }));
      showToast('Direcciones ordenadas por distancia', 'success');
    } catch (error) {
      showToast('No se pudo obtener tu ubicación', 'error');
      setSortState(prev => ({ ...prev, isLocating: false }));
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
          showToast('Usando tu ubicación actual como punto de partida', 'info');
        } catch (error) {
          console.log('No se pudo obtener ubicación, optimizando sin punto de partida');
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
        const message = stats.addressesWithCoords > 0 
          ? `Ruta optimizada: ${stats.totalDistance} km, ~${stats.estimatedTime} minutos. ${stats.addressesWithCoords} de ${stats.totalAddresses} direcciones con ubicación.`
          : 'No hay suficientes direcciones con ubicación para optimizar la ruta.';
          
        showToast(message, stats.addressesWithCoords > 0 ? 'success' : 'warning');
        
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
      userLocation: null,
      isLocating: false,
      optimizedRoute: null,
      isCalculatingRoute: false
    });
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
        onAddAddress={openAddModal}
        isAssignedToMe={isAssignedToMe}
        sortControls={{
          sortOrder: sortState.sortOrder,
          isLocating: sortState.isLocating,
          isCalculatingRoute: sortState.isCalculatingRoute,
          onSortByDistance: handleSortByDistance,
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
                onUpdate={handleUpdateAddress}
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
          territoryName={territory.name}
          addresses={territoryAddresses}
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
    </div>
  );
};

export default TerritoryDetailView; 