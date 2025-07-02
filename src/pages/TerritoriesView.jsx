import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import TerritoryCard from '../components/territories/TerritoryCard';
import TerritoryFilters from '../components/territories/TerritoryFilters';
import SkeletonCard from '../components/common/SkeletonCard';
import Icon from '../components/common/Icon';
import { useTouchGestures } from '../hooks/useTouchGestures';
import { usePremiumFeedback } from '../hooks/usePremiumFeedback';

const TerritoriesView = ({ onSelectTerritory, onOpenMenu }) => {
  const { territories, currentUser, proposals, isLoading, publishers } = useApp();
  const [filterStatus, setFilterStatus] = useState('all');
  const [sortBy, setSortBy] = useState('name');
  const [updateAvailable, setUpdateAvailable] = useState(false);
  
  // OPTIMIZACIÓN FASE 2: Refs para scroll performance ⚡
  const containerRef = useRef(null);
  const [visibleCards, setVisibleCards] = useState(new Set());
  
  // FASE 3: Premium feedback y gestures ⚡
  const { swipeFeedback } = usePremiumFeedback();

  // Calcular contadores
  const pendingProposalsCount = useMemo(() => {
    return currentUser?.role === 'admin' 
      ? proposals.filter(p => p.status === 'pending').length 
      : 0;
  }, [proposals, currentUser]);

  const userNotificationsCount = useMemo(() => {
    if (currentUser?.role === 'admin') return 0;
    return proposals.filter(p => 
      p.proposedBy === currentUser?.uid && 
      (p.status === 'approved' || p.status === 'rejected')
    ).length;
  }, [proposals, currentUser]);

  // Filtrar y ordenar territorios
  const filteredAndSortedTerritories = useMemo(() => {
    let filtered = territories;

    // Aplicar filtro de estado
    if (filterStatus !== 'all') {
      filtered = territories.filter(t => {
        if (filterStatus === 'disponible') return t.status === 'Disponible';
        if (filterStatus === 'en uso') return t.status === 'En uso';
        if (filterStatus === 'completado') return t.status === 'Completado' || t.status === 'Terminado';
        return true;
      });
    }

    // Ordenar
    const sorted = [...filtered].sort((a, b) => {
      // Si está filtrando "en uso", priorizar los míos
      if (filterStatus === 'en uso') {
        const isAMine = a.assignedTo === currentUser.name;
        const isBMine = b.assignedTo === currentUser.name;
        if (isAMine && !isBMine) return -1;
        if (!isAMine && isBMine) return 1;
      }

      // Ordenamiento normal
      if (sortBy === 'name') {
        return a.name.localeCompare(b.name, undefined, { numeric: true });
      }
      if (sortBy === 'status') {
        const statusOrder = { 'En uso': 1, 'Disponible': 2, 'Completado': 3 };
        return (statusOrder[a.status] || 4) - (statusOrder[b.status] || 4);
      }
      return 0;
    });

    return sorted;
  }, [territories, filterStatus, sortBy, currentUser?.name]);

  // Estadísticas
  const stats = useMemo(() => ({
    total: territories.length,
    available: territories.filter(t => t.status === 'Disponible').length,
    inUse: territories.filter(t => t.status === 'En uso').length,
    completed: territories.filter(t => t.status === 'Completado' || t.status === 'Terminado').length,
  }), [territories]);

  const userHasAssignedTerritories = useMemo(() => {
    return territories.some(t => t.status === 'En uso' && t.assignedTo === currentUser?.name);
  }, [territories, currentUser?.name]);
  
  // OPTIMIZACIÓN: Memoizar handlers para evitar re-renders ⚡
  const handleFilterChange = useCallback((newFilter) => {
    setFilterStatus(newFilter);
  }, []);
  
  const handleSortChange = useCallback((newSort) => {
    setSortBy(newSort);
  }, []);
  
  const handleClearFilters = useCallback(() => {
    setFilterStatus('all');
  }, []);
  
  // OPTIMIZACIÓN: Crear handlers memoizados para territorios ⚡
  const createTerritorySelectHandler = useCallback((territory) => {
    return () => onSelectTerritory(territory);
  }, [onSelectTerritory]);

  // FASE 3: Swipe navigation para filtros ⚡
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

  // 📱 FASE 2: Aplicar gestos táctiles al container principal
  const touchGestures = useTouchGestures({
    onSwipeLeft: handleSwipeLeft,
    onSwipeRight: handleSwipeRight,
    swipeThreshold: 80 // Más alto para evitar conflictos con scroll
  });

  // OPTIMIZACIÓN: Intersection Observer para lazy loading ⚡
  useEffect(() => {
    if (!containerRef.current) return;
    
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          const cardId = entry.target.dataset.territoryId;
          if (entry.isIntersecting) {
            setVisibleCards(prev => new Set([...prev, cardId]));
          }
        });
      },
      {
        root: null,
        rootMargin: '50px', // Precargar 50px antes de que sea visible
        threshold: 0.1
      }
    );
    
    const cards = containerRef.current.querySelectorAll('[data-territory-id]');
    cards.forEach(card => observer.observe(card));
    
    return () => observer.disconnect();
  }, [filteredAndSortedTerritories]);

  return (
    <div 
      ref={touchGestures.ref}
      className="min-h-screen pb-24 sm:pb-8" 
      style={{ backgroundColor: '#F5F5F5' }}
    >
      {/* Header */}
      <header className="shadow-md sticky top-0 z-30">
        <div className="px-4 pt-2 pb-2 flex justify-between items-center" style={{ backgroundColor: '#2C3E50' }}>
          <h1 className="text-2xl font-bold" style={{ color: '#FFFFFF' }}>
            Territorios
          </h1>
          <button 
            onClick={onOpenMenu} 
            className="relative p-3 rounded-xl shadow-md transition-all duration-200" 
            style={{ 
              backgroundColor: '#34495e',
              minWidth: '40px',
              minHeight: '40px'
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#3a526b'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#34495e'}
            aria-label="Abrir menú"
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
                  : currentUser?.role === 'admin' ? pendingProposalsCount : userNotificationsCount}
              </span>
            )}
          </button>
        </div>
        
        {/* Filtros */}
        <div className="relative">
          <TerritoryFilters
            filterStatus={filterStatus}
            setFilterStatus={handleFilterChange}
            stats={stats}
            userHasAssignedTerritories={userHasAssignedTerritories}
          />
          
          {/* FASE 3: Indicador sutil de swipe navigation */}
          <div className="absolute bottom-1 left-1/2 transform -translate-x-1/2 opacity-30">
            <div className="flex items-center space-x-1 text-xs text-gray-500">
              <Icon name="chevronLeft" size={12} />
              <span className="hidden sm:inline">Desliza</span>
              <Icon name="chevronRight" size={12} />
            </div>
          </div>
        </div>
      </header>



      {/* Contenido principal */}
      <main className="px-4 sm:px-6 lg:px-8 mt-3">
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {[...Array(10)].map((_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : filteredAndSortedTerritories.length > 0 ? (
          <div 
            ref={containerRef}
            className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 territory-list"
            style={{
              // OPTIMIZACIÓN: CSS para scroll performance ⚡
              contain: 'layout style paint',
              willChange: 'scroll-position',
              transform: 'translateZ(0)' // Forza GPU acceleration
            }}
          >
            {filteredAndSortedTerritories.map(t => (
              <div
                key={t.id}
                data-territory-id={t.id}
                className="territory-card"
                style={{
                  // OPTIMIZACIÓN: Cada tarjeta optimizada ⚡
                  contain: 'layout',
                  willChange: 'transform'
                }}
              >
                <TerritoryCard 
                  territory={t} 
                  onSelect={createTerritorySelectHandler(t)} 
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
    </div>
  );
};

export default TerritoriesView; 