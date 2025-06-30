import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import TerritoryCard from '../components/territories/TerritoryCard';
import TerritoryFilters from '../components/territories/TerritoryFilters';
import SkeletonCard from '../components/common/SkeletonCard';
import Icon from '../components/common/Icon';

const TerritoriesView = ({ onSelectTerritory, onOpenMenu }) => {
  const { territories, currentUser, proposals, isLoading, publishers } = useApp();
  const [filterStatus, setFilterStatus] = useState('all');
  const [sortBy, setSortBy] = useState('name');
  const [updateAvailable, setUpdateAvailable] = useState(false);

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

  return (
    <div className="min-h-screen pb-24 sm:pb-8" style={{ backgroundColor: '#F5F5F5' }}>
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
        <TerritoryFilters
          filterStatus={filterStatus}
          setFilterStatus={setFilterStatus}
          stats={stats}
          userHasAssignedTerritories={userHasAssignedTerritories}
        />
      </header>



      {/* Contenido principal */}
      <main className="px-4 sm:px-6 lg:px-8 mt-3">
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {[...Array(10)].map((_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : filteredAndSortedTerritories.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {filteredAndSortedTerritories.map(t => (
              <TerritoryCard 
                key={t.id} 
                territory={t} 
                onSelect={onSelectTerritory} 
              />
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
                onClick={() => setFilterStatus('all')} 
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