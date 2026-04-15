import React, { useState, useMemo, useCallback } from 'react';
import { useApp } from '../context/AppContext';
import TerritoryCard from '../components/territories/TerritoryCard';
import TerritoryFilters from '../components/territories/TerritoryFilters';
import SkeletonCard from '../components/common/SkeletonCard';
import Icon from '../components/common/Icon';
import { useSwipeNavigation } from '../hooks/useTouchGestures';
import { usePremiumFeedback } from '../hooks/usePremiumFeedback';
import {
  LazyGeneralMapModal as GeneralMapModal,
  LazyQuickProposalModal as QuickProposalModal
} from '../components/modals/LazyModals';
import { isUserAssigned } from '../utils/territoryHelpers';

const TerritoriesView = ({ onSelectTerritory, onOpenMenu }) => {
  const {
    territories,
    currentUser,
    isLoading,
    userNotificationsCount,
    pendingProposalsCount
  } = useApp();
  const [filterStatus, setFilterStatus] = useState('all');
  const [isGeneralMapOpen, setIsGeneralMapOpen] = useState(false);
  const [isQuickProposalOpen, setIsQuickProposalOpen] = useState(false);
  const [updateAvailable, setUpdateAvailable] = useState(false);

  const { swipeFeedback } = usePremiumFeedback();

  const filteredAndSortedTerritories = useMemo(() => {
    let filtered = territories;

    if (filterStatus !== 'all') {
      filtered = filtered.filter((territory) => {
        if (filterStatus === 'disponible') return territory.status === 'Disponible';
        if (filterStatus === 'en uso') return territory.status === 'En uso';
        if (filterStatus === 'completado') {
          return territory.status === 'Completado' || territory.status === 'Terminado';
        }
        return true;
      });
    }

    return [...filtered].sort((territoryA, territoryB) => {
      if (filterStatus === 'en uso') {
        const isAMine = isUserAssigned(territoryA.assignedTo, currentUser?.name);
        const isBMine = isUserAssigned(territoryB.assignedTo, currentUser?.name);

        if (isAMine && !isBMine) return -1;
        if (!isAMine && isBMine) return 1;
      }

      return territoryA.name.localeCompare(territoryB.name, undefined, {
        numeric: true
      });
    });
  }, [territories, filterStatus, currentUser?.name]);

  const stats = useMemo(() => ({
    total: territories.length,
    available: territories.filter((territory) => territory.status === 'Disponible').length,
    inUse: territories.filter((territory) => territory.status === 'En uso').length,
    completed: territories.filter((territory) => (
      territory.status === 'Completado' || territory.status === 'Terminado'
    )).length
  }), [territories]);

  const handleFilterChange = useCallback((newFilter) => {
    setFilterStatus(newFilter);
  }, []);

  const handleClearFilters = useCallback(() => {
    setFilterStatus('all');
  }, []);

  const createTerritorySelectHandler = useCallback((territory) => {
    return () => onSelectTerritory(territory);
  }, [onSelectTerritory]);

  const handleSwipeLeft = useCallback(() => {
    swipeFeedback();
    const filters = ['all', 'disponible', 'en uso', 'completado'];
    const currentIndex = filters.indexOf(filterStatus);
    const nextIndex = (currentIndex + 1) % filters.length;
    handleFilterChange(filters[nextIndex]);
  }, [filterStatus, handleFilterChange, swipeFeedback]);

  const handleSwipeRight = useCallback(() => {
    swipeFeedback();
    const filters = ['all', 'disponible', 'en uso', 'completado'];
    const currentIndex = filters.indexOf(filterStatus);
    const nextIndex = currentIndex === 0 ? filters.length - 1 : currentIndex - 1;
    handleFilterChange(filters[nextIndex]);
  }, [filterStatus, handleFilterChange, swipeFeedback]);

  const swipeNavRef = useSwipeNavigation(
    isGeneralMapOpen ? null : handleSwipeLeft,
    isGeneralMapOpen ? null : handleSwipeRight,
    {
      swipeThreshold: 80
    }
  );

  return (
    <div
      ref={swipeNavRef}
      className="min-h-screen pb-24 sm:pb-8"
      style={{ backgroundColor: '#F5F5F5' }}
    >
      <header className="shadow-md sticky top-0 z-30">
        <div className="px-4 pt-2 pb-2 flex justify-between items-center" style={{ backgroundColor: '#2C3E50' }}>
          <div className="flex items-center space-x-3">
            <h1 className="text-2xl font-bold" style={{ color: '#FFFFFF' }}>
              Territorios
            </h1>

            <button
              onClick={() => {
                setIsGeneralMapOpen(true);
              }}
              className="p-2 rounded-xl shadow-md transition-all duration-200"
              style={{
                backgroundColor: '#34495e',
                minWidth: '36px',
                minHeight: '36px'
              }}
              onMouseEnter={(event) => {
                event.currentTarget.style.backgroundColor = '#3a526b';
              }}
              onMouseLeave={(event) => {
                event.currentTarget.style.backgroundColor = '#34495e';
              }}
              aria-label="Ver mapa general de Guadalajara"
              title="Mapa General de Guadalajara"
            >
              <Icon name="map" size={20} style={{ color: '#FFFFFF' }} />
            </button>
          </div>

          <button
            onClick={onOpenMenu}
            className="relative p-3 rounded-xl shadow-md transition-all duration-200"
            style={{
              backgroundColor: '#34495e',
              minWidth: '40px',
              minHeight: '40px'
            }}
            onMouseEnter={(event) => {
              event.currentTarget.style.backgroundColor = '#3a526b';
            }}
            onMouseLeave={(event) => {
              event.currentTarget.style.backgroundColor = '#34495e';
            }}
                    aria-label={'Abrir men\u00fa'}
          >
            <svg className="w-5 h-5" fill="none" stroke="#FFFFFF" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
            {((currentUser?.role === 'admin' && pendingProposalsCount > 0) ||
              (currentUser?.role !== 'admin' && userNotificationsCount > 0) ||
              updateAvailable) && (
              <span className="absolute -top-2 -right-2 min-w-[20px] h-5 px-1 bg-red-600 text-white text-xs rounded-full flex items-center justify-center font-medium shadow-sm">
                {updateAvailable && !((currentUser?.role === 'admin' && pendingProposalsCount > 0) ||
                  (currentUser?.role !== 'admin' && userNotificationsCount > 0))
                  ? '!'
                  : currentUser?.role === 'admin'
                    ? pendingProposalsCount
                    : userNotificationsCount}
              </span>
            )}
          </button>
        </div>

        <div className="relative">
          <TerritoryFilters
            filterStatus={filterStatus}
            setFilterStatus={handleFilterChange}
            stats={stats}
          />

          <div className="absolute bottom-1 left-1/2 transform -translate-x-1/2 opacity-30">
            <div className="flex items-center space-x-1 text-xs text-gray-500">
              <Icon name="chevronLeft" size={12} />
              <span className="hidden sm:inline">Desliza</span>
              <Icon name="chevronRight" size={12} />
            </div>
          </div>
        </div>
      </header>

      <main className="px-4 sm:px-6 lg:px-8 mt-3">
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {[...Array(10)].map((_, index) => <SkeletonCard key={index} />)}
          </div>
        ) : filteredAndSortedTerritories.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 territory-list">
            {filteredAndSortedTerritories.map((territory) => (
              <div
                key={territory.id}
                data-territory-id={territory.id}
                className="territory-card"
              >
                <TerritoryCard
                  territory={territory}
                  onSelect={createTerritorySelectHandler(territory)}
                />
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <Icon name="mapPin" size={48} className="mx-auto mb-4 text-gray-300" />
            <p className="text-gray-500 font-medium text-lg">
              {filterStatus !== 'all'
                ? 'No se encontraron territorios con los filtros aplicados'
                : 'No hay territorios registrados'}
            </p>
            {filterStatus !== 'all' && (
              <button
                onClick={handleClearFilters}
                className="mt-4 text-indigo-600 hover:text-indigo-700 font-medium"
              >
                Limpiar filtros
              </button>
            )}
          </div>
        )}
      </main>

      <GeneralMapModal
        isOpen={isGeneralMapOpen}
        onClose={() => {
          setIsGeneralMapOpen(false);
        }}
      />

      {/* FAB: Propuesta rápida de dirección */}
      {currentUser && (
        <button
          onClick={() => setIsQuickProposalOpen(true)}
          className="fixed bottom-6 right-6 z-30 w-12 h-12 rounded-full text-white shadow-lg hover:shadow-xl transform hover:scale-110 active:scale-95 transition-all flex items-center justify-center"
          style={{
            background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)'
          }}
          aria-label="Proponer nueva dirección"
          title="Me acordé de una dirección"
        >
          <i className="fas fa-plus text-base"></i>
        </button>
      )}

      <QuickProposalModal
        isOpen={isQuickProposalOpen}
        onClose={() => setIsQuickProposalOpen(false)}
      />
    </div>
  );
};

export default TerritoriesView;
