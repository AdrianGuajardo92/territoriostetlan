import React, { useState, useMemo, useCallback, useRef } from 'react';
import { useApp } from '../context/AppContext';
import TerritoryCard from '../components/territories/TerritoryCard';
import TerritoryFilters from '../components/territories/TerritoryFilters';
import SkeletonCard from '../components/common/SkeletonCard';
import Icon from '../components/common/Icon';
import ConfirmDialog from '../components/common/ConfirmDialog';
import { useBackHandler } from '../hooks/useBackHandler';
import { useBodyScrollLock } from '../hooks/useBodyScrollLock';
import { useSwipeNavigation } from '../hooks/useTouchGestures';
import { usePremiumFeedback } from '../hooks/usePremiumFeedback';
import { useIsDesktop } from '../hooks/useMediaQuery';
import { getDisplayAddress, getFullAddress, smartSearch } from '../utils/helpers';
import {
  LazyGeneralMapModal as GeneralMapModal,
  LazyAssignTerritoryModal as AssignTerritoryModal,
  LazyQuickProposalModal as QuickProposalModal
} from '../components/modals/LazyModals';
const normalizeTerritoryStatus = (status) => (
  status === 'Terminado' ? 'Completado' :
  status === 'Available' ? 'Disponible' :
  status
);

const toTimestamp = (date) => {
  if (!date) return null;
  const d = date.toDate ? date.toDate() : new Date(date);
  const time = d.getTime();
  return Number.isFinite(time) ? time : null;
};

const getCompletedTimestamp = (territory) =>
  toTimestamp(territory.completedDate ?? territory.terminadoDate ?? territory.lastWorked);

const getAssignedTimestamp = (territory) =>
  toTimestamp(territory.assignedDate);

const TerritoriesView = ({ onSelectTerritory, onOpenMenu, menuBadgeCount = 0 }) => {
  const {
    territories,
    addresses,
    currentUser,
    isLoading,
    handleAssignTerritory,
    handleReturnTerritory,
    handleCompleteTerritory
  } = useApp();
  const isDesktop = useIsDesktop();
  const [filterStatus, setFilterStatus] = useState('all');
  const [addressSearchTerm, setAddressSearchTerm] = useState('');
  const [isGeneralMapOpen, setIsGeneralMapOpen] = useState(false);
  const [isQuickProposalOpen, setIsQuickProposalOpen] = useState(false);
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [quickActionsTerritoryId, setQuickActionsTerritoryId] = useState(null);
  const [assignTerritoryId, setAssignTerritoryId] = useState(null);
  const [releaseTerritoryId, setReleaseTerritoryId] = useState(null);
  const [completeTerritoryId, setCompleteTerritoryId] = useState(null);
  const [isAdminActionProcessing, setIsAdminActionProcessing] = useState(false);
  const quickActionActivationRef = useRef(0);

  const { swipeFeedback } = usePremiumFeedback();
  const isAdmin = currentUser?.role === 'admin';

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
        const timeA = getAssignedTimestamp(territoryA);
        const timeB = getAssignedTimestamp(territoryB);

        if (timeA != null && timeB != null && timeA !== timeB) {
          return timeA - timeB;
        }
        if (timeA != null && timeB == null) return -1;
        if (timeA == null && timeB != null) return 1;
      }

      if (filterStatus === 'completado') {
        const timeA = getCompletedTimestamp(territoryA);
        const timeB = getCompletedTimestamp(territoryB);

        if (timeA != null && timeB != null && timeA !== timeB) {
          return timeA - timeB;
        }
        if (timeA != null && timeB == null) return -1;
        if (timeA == null && timeB != null) return 1;
      }

      return territoryA.name.localeCompare(territoryB.name, undefined, {
        numeric: true
      });
    });
  }, [territories, filterStatus]);

  const isSearchingAddresses = Boolean(addressSearchTerm.trim());

  const addressSearchResults = useMemo(() => {
    if (!isSearchingAddresses) return [];

    return addresses.filter((address) => {
      const matchesAddress = smartSearch(
        addressSearchTerm,
        `${getDisplayAddress(address, '')} ${getFullAddress(address, '')}`
      );
      const matchesNotes = address.notes && smartSearch(addressSearchTerm, address.notes);
      const matchesReference = address.referencia && smartSearch(addressSearchTerm, address.referencia);

      return matchesAddress || matchesNotes || matchesReference;
    }).map((address) => {
      const territory = territories.find((item) => item.id === address.territoryId);

      return {
        ...address,
        territory,
        territoryName: territory ? territory.name : `Territorio ${address.territoryId}`
      };
    });
  }, [addressSearchTerm, addresses, isSearchingAddresses, territories]);

  const stats = useMemo(() => ({
    total: territories.length,
    available: territories.filter((territory) => territory.status === 'Disponible').length,
    inUse: territories.filter((territory) => territory.status === 'En uso').length,
    completed: territories.filter((territory) => (
      territory.status === 'Completado' || territory.status === 'Terminado'
    )).length
  }), [territories]);

  const quickActionsTerritory = useMemo(() => (
    quickActionsTerritoryId
      ? territories.find((territory) => territory.id === quickActionsTerritoryId) || null
      : null
  ), [quickActionsTerritoryId, territories]);

  const assignTerritory = useMemo(() => (
    assignTerritoryId
      ? territories.find((territory) => territory.id === assignTerritoryId) || null
      : null
  ), [assignTerritoryId, territories]);

  const releaseTerritory = useMemo(() => (
    releaseTerritoryId
      ? territories.find((territory) => territory.id === releaseTerritoryId) || null
      : null
  ), [releaseTerritoryId, territories]);

  const completeTerritory = useMemo(() => (
    completeTerritoryId
      ? territories.find((territory) => territory.id === completeTerritoryId) || null
      : null
  ), [completeTerritoryId, territories]);

  const isAdminOverlayOpen = Boolean(
    quickActionsTerritory ||
    assignTerritory ||
    releaseTerritory ||
    completeTerritory
  );

  useBodyScrollLock(isAdminOverlayOpen);

  const handleFilterChange = useCallback((newFilter) => {
    setFilterStatus(newFilter);
  }, []);

  const handleClearFilters = useCallback(() => {
    setFilterStatus('all');
  }, []);

  const handleClearAddressSearch = useCallback(() => {
    setAddressSearchTerm('');
  }, []);

  const handleNavigateToSearchResult = useCallback((address) => {
    if (!address.territory) return;
    onSelectTerritory(address.territory, address.id);
  }, [onSelectTerritory]);

  const createTerritorySelectHandler = useCallback((territory) => {
    return () => onSelectTerritory(territory);
  }, [onSelectTerritory]);

  const handleOpenAdminQuickActions = useCallback((territory) => {
    if (!isAdmin) return;
    setQuickActionsTerritoryId(territory.id);
  }, [isAdmin]);

  const handleCloseAdminQuickActions = useCallback(() => {
    setQuickActionsTerritoryId(null);
  }, []);

  const handleOpenAssignFromQuickActions = useCallback((territory) => {
    setQuickActionsTerritoryId(null);
    setAssignTerritoryId(territory.id);
  }, []);

  const handleOpenReleaseConfirm = useCallback((territory) => {
    setQuickActionsTerritoryId(null);
    setReleaseTerritoryId(territory.id);
  }, []);

  const handleOpenCompleteConfirm = useCallback((territory) => {
    setQuickActionsTerritoryId(null);
    setCompleteTerritoryId(territory.id);
  }, []);

  const runQuickAction = useCallback((action) => {
    const now = Date.now();
    if (now - quickActionActivationRef.current < 450) return;

    quickActionActivationRef.current = now;
    action();
  }, []);

  const handleQuickActionPointerUp = useCallback((event, action) => {
    if (event.pointerType === 'mouse') return;

    if (event.cancelable) {
      event.preventDefault();
    }
    event.stopPropagation();
    runQuickAction(action);
  }, [runQuickAction]);

  const handleQuickActionClick = useCallback((event, action) => {
    const now = Date.now();
    if (now - quickActionActivationRef.current < 450) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }

    runQuickAction(action);
  }, [runQuickAction]);

  const handleAssignToPublisher = useCallback(async (publisherName) => {
    if (!assignTerritory) return;
    await handleAssignTerritory(assignTerritory.id, publisherName);
    setAssignTerritoryId(null);
  }, [assignTerritory, handleAssignTerritory]);

  const handleConfirmRelease = useCallback(async () => {
    const territoryId = releaseTerritory?.id;
    if (!territoryId) return;

    setReleaseTerritoryId(null);
    setIsAdminActionProcessing(true);
    try {
      await handleReturnTerritory(territoryId);
    } finally {
      setIsAdminActionProcessing(false);
    }
  }, [handleReturnTerritory, releaseTerritory]);

  const handleConfirmComplete = useCallback(async () => {
    const territoryId = completeTerritory?.id;
    if (!territoryId) return;

    setCompleteTerritoryId(null);
    setIsAdminActionProcessing(true);
    try {
      await handleCompleteTerritory(territoryId);
    } finally {
      setIsAdminActionProcessing(false);
    }
  }, [completeTerritory, handleCompleteTerritory]);

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

  useBackHandler({
    isOpen: !!quickActionsTerritory,
    onClose: handleCloseAdminQuickActions,
    id: 'territory-admin-quick-actions'
  });

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
        <div className="px-4 pt-2 pb-2 flex justify-between items-center gap-3" style={{ backgroundColor: '#2C3E50' }}>
          <div className="flex items-center space-x-3 flex-shrink-0">
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

          {isDesktop && (
            <div className="flex-1 max-w-lg mx-1 relative min-w-0">
              <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-white/60">
                <Icon name="search" size={16} />
              </div>
              <input
                type="search"
                value={addressSearchTerm}
                onChange={(event) => setAddressSearchTerm(event.target.value)}
                placeholder="Buscar calle, número o nota..."
                aria-label="Buscar direcciones"
                className="w-full rounded-xl border border-white/20 bg-white/95 py-2 pl-9 pr-9 text-sm text-slate-800 placeholder:text-slate-400 shadow-sm focus:border-white focus:outline-none focus:ring-2 focus:ring-white/40"
              />
              {addressSearchTerm && (
                <button
                  type="button"
                  onClick={handleClearAddressSearch}
                  aria-label="Limpiar búsqueda"
                  className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100"
                >
                  <Icon name="x" size={14} />
                </button>
              )}
            </div>
          )}

          <button
            onClick={onOpenMenu}
            className="relative flex-shrink-0 p-3 rounded-xl shadow-md transition-all duration-200"
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
            {(menuBadgeCount > 0 || updateAvailable) && (
              <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 text-[10px] font-semibold bg-red-500 text-white rounded-full flex items-center justify-center shadow-sm">
                {menuBadgeCount > 0 ? menuBadgeCount : '!'}
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
          <div className="grid grid-cols-1 sm:grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-4">
            {[...Array(10)].map((_, index) => <SkeletonCard key={index} />)}
          </div>
        ) : isSearchingAddresses ? (
          addressSearchResults.length > 0 ? (
            <div className="space-y-3">
              <p className="text-sm font-medium text-slate-600">
                {addressSearchResults.length} dirección{addressSearchResults.length !== 1 ? 'es' : ''} encontrada{addressSearchResults.length !== 1 ? 's' : ''}
              </p>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                {addressSearchResults.map((address) => (
                  <button
                    key={address.id}
                    type="button"
                    onClick={() => handleNavigateToSearchResult(address)}
                    disabled={!address.territory}
                    className="w-full rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition-all hover:border-blue-300 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <div className="flex items-start gap-3">
                      <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-600">
                        <Icon name="mapPin" size={18} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-base font-semibold text-slate-900">
                          {getDisplayAddress(address)}
                        </p>
                        <p className="mt-1 inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700">
                          <Icon name="map" size={12} className="mr-1.5" />
                          {address.territoryName}
                        </p>
                        {address.notes && (
                          <p className="mt-2 line-clamp-2 text-sm text-slate-500 italic">
                            {address.notes}
                          </p>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center py-16">
              <Icon name="searchX" size={48} className="mx-auto mb-4 text-gray-300" />
              <p className="text-gray-500 font-medium text-lg">
                No se encontraron direcciones para &quot;{addressSearchTerm}&quot;
              </p>
              <button
                onClick={handleClearAddressSearch}
                className="mt-4 text-indigo-600 hover:text-indigo-700 font-medium"
              >
                Limpiar búsqueda
              </button>
            </div>
          )
        ) : filteredAndSortedTerritories.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-4 territory-list">
            {filteredAndSortedTerritories.map((territory) => (
              <div
                key={territory.id}
                data-territory-id={territory.id}
                className="territory-card h-full"
              >
                <TerritoryCard
                  territory={territory}
                  onSelect={createTerritorySelectHandler(territory)}
                  canUseAdminActions={isAdmin}
                  onAdminQuickActions={handleOpenAdminQuickActions}
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

      {quickActionsTerritory && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
          data-touch-gesture-ignore="true"
        >
          <button
            type="button"
            className="absolute inset-0 z-0 bg-black/40"
            onClick={handleCloseAdminQuickActions}
            aria-label="Cerrar opciones de administrador"
          />

          <div className="relative z-10 w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl p-4 sm:p-5">
            <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-gray-200 sm:hidden" />

            <div className="flex items-start justify-between gap-3 mb-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Opciones de administrador
                </p>
                <h2 className="text-xl font-bold text-slate-900">
                  {quickActionsTerritory.name}
                </h2>
              </div>

              <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                normalizeTerritoryStatus(quickActionsTerritory.status) === 'Disponible'
                  ? 'bg-emerald-100 text-emerald-700'
                  : normalizeTerritoryStatus(quickActionsTerritory.status) === 'En uso'
                    ? 'bg-amber-100 text-amber-700'
                    : 'bg-rose-100 text-rose-700'
              }`}>
                {normalizeTerritoryStatus(quickActionsTerritory.status) === 'En uso'
                  ? 'Predicando'
                  : normalizeTerritoryStatus(quickActionsTerritory.status)}
              </span>
            </div>

            <div className="space-y-2">
              <button
                type="button"
                onPointerUp={(event) => handleQuickActionPointerUp(event, () => {
                  handleCloseAdminQuickActions();
                  onSelectTerritory(quickActionsTerritory);
                })}
                onClick={(event) => handleQuickActionClick(event, () => {
                  handleCloseAdminQuickActions();
                  onSelectTerritory(quickActionsTerritory);
                })}
                className="w-full p-3 rounded-2xl bg-slate-50 hover:bg-slate-100 border border-slate-200 flex items-center gap-3 text-left transition-colors"
              >
                <span className="w-10 h-10 rounded-xl bg-slate-800 text-white flex items-center justify-center">
                  <Icon name="map" size={18} />
                </span>
                <span>
                  <span className="block font-semibold text-slate-900">Abrir territorio</span>
                  <span className="block text-sm text-slate-500">Ver direcciones y detalles</span>
                </span>
              </button>

              <button
                type="button"
                onPointerUp={(event) => handleQuickActionPointerUp(event, () => {
                  handleOpenAssignFromQuickActions(quickActionsTerritory);
                })}
                onClick={(event) => handleQuickActionClick(event, () => {
                  handleOpenAssignFromQuickActions(quickActionsTerritory);
                })}
                className="w-full p-3 rounded-2xl bg-amber-50 hover:bg-amber-100 border border-amber-200 flex items-center gap-3 text-left transition-colors"
              >
                <span className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center">
                  <Icon name="userPlus" size={18} />
                </span>
                <span>
                  <span className="block font-semibold text-slate-900">
                    {normalizeTerritoryStatus(quickActionsTerritory.status) === 'Disponible'
                      ? 'Asignar publicador'
                      : 'Cambiar publicador'}
                  </span>
                  <span className="block text-sm text-slate-500">Seleccionar una persona o equipo</span>
                </span>
              </button>

              {normalizeTerritoryStatus(quickActionsTerritory.status) !== 'Disponible' && (
                <button
                  type="button"
                  onPointerUp={(event) => handleQuickActionPointerUp(event, () => {
                    handleOpenReleaseConfirm(quickActionsTerritory);
                  })}
                  onClick={(event) => handleQuickActionClick(event, () => {
                    handleOpenReleaseConfirm(quickActionsTerritory);
                  })}
                  className="w-full p-3 rounded-2xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 flex items-center gap-3 text-left transition-colors"
                >
                  <span className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center">
                    <Icon name="unlock" size={18} />
                  </span>
                  <span>
                    <span className="block font-semibold text-slate-900">Marcar disponible</span>
                    <span className="block text-sm text-slate-500">Liberar y desmarcar visitas</span>
                  </span>
                </button>
              )}

              {normalizeTerritoryStatus(quickActionsTerritory.status) === 'En uso' && (
                <button
                  type="button"
                  onPointerUp={(event) => handleQuickActionPointerUp(event, () => {
                    handleOpenCompleteConfirm(quickActionsTerritory);
                  })}
                  onClick={(event) => handleQuickActionClick(event, () => {
                    handleOpenCompleteConfirm(quickActionsTerritory);
                  })}
                  className="w-full p-3 rounded-2xl bg-rose-50 hover:bg-rose-100 border border-rose-200 flex items-center gap-3 text-left transition-colors"
                >
                  <span className="w-10 h-10 rounded-xl bg-rose-500 text-white flex items-center justify-center">
                    <Icon name="checkCircle" size={18} />
                  </span>
                  <span>
                    <span className="block font-semibold text-slate-900">Marcar completado</span>
                    <span className="block text-sm text-slate-500">Registrar que ya se terminó</span>
                  </span>
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={handleCloseAdminQuickActions}
              className="mt-4 w-full py-3 rounded-2xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold transition-colors"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      <AssignTerritoryModal
        isOpen={!!assignTerritory}
        onClose={() => setAssignTerritoryId(null)}
        onAssign={handleAssignToPublisher}
        currentAssignee={assignTerritory?.assignedTo}
        territoryName={assignTerritory?.name || ''}
        modalId="quick-assign-territory-modal"
      />

      <ConfirmDialog
        isOpen={!!releaseTerritory}
        onClose={() => setReleaseTerritoryId(null)}
        onConfirm={handleConfirmRelease}
        title="Marcar como disponible"
        message={`¿Liberar ${releaseTerritory?.name || 'este territorio'}? Se desmarcarán sus direcciones visitadas.`}
        confirmText="Sí, marcar disponible"
        cancelText="Cancelar"
        type="success"
        isProcessing={isAdminActionProcessing}
        processingText="Marcando..."
        dialogId="territory-admin-release-confirm"
      />

      <ConfirmDialog
        isOpen={!!completeTerritory}
        onClose={() => setCompleteTerritoryId(null)}
        onConfirm={handleConfirmComplete}
        title="Marcar como completado"
        message={`¿Marcar ${completeTerritory?.name || 'este territorio'} como completado?`}
        confirmText="Sí, completar"
        cancelText="Cancelar"
        type="warning"
        isProcessing={isAdminActionProcessing}
        processingText="Completando..."
        dialogId="territory-admin-complete-confirm"
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
