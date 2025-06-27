import React from 'react';
import Icon from '../common/Icon';

const TerritoryDetailHeader = ({
  territory,
  stats,
  onBack,
  isAdmin,
  isProcessing,
  onAssign,
  onReturn,
  onAddAddress,
  isAssignedToMe,
  sortControls,
  viewControls,
  onOpenMapModal
}) => {
  return (
    <header className="bg-slate-100 sticky top-0 z-20 border-b border-slate-200">
      {/* Barra superior con botón de volver y acciones principales */}
      <div className="px-4 pt-4 pb-3">
        <div className="flex items-center justify-between">
          <button 
            onClick={onBack} 
            className="w-10 h-10 flex items-center justify-center rounded-full bg-white hover:bg-gray-100 transition-all shadow-sm border border-gray-200 hover:shadow-md"
            aria-label="Volver a territorios"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-gray-700">
              <path d="m15 18-6-6 6-6"/>
            </svg>
          </button>
          
          <div className="flex items-center space-x-2">
            <button 
              onClick={onAddAddress}
              disabled={isProcessing}
              className="px-3 py-1.5 text-xs font-bold text-white bg-green-600 rounded-full hover:bg-green-700 disabled:bg-green-400 transition-all flex items-center shadow-sm"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="mr-1.5">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                <circle cx="12" cy="10" r="3"/>
              </svg>
              Agregar dirección
            </button>
            
            {/* Botones solo para administradores */}
            {isAdmin && (
              <>
                {territory.status !== 'Terminado' && (
                  <button 
                    onClick={onAssign}
                    disabled={isProcessing}
                    className="px-3 py-1.5 text-xs font-bold text-white bg-blue-600 rounded-full hover:bg-blue-700 disabled:bg-blue-400 transition-all flex items-center shadow-sm"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1.5">
                      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                      <circle cx="9" cy="7" r="4"/>
                      <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                      <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                    </svg>
                    {territory.status === 'En uso' ? 'Reasignar' : 'Asignar'}
                  </button>
                )}
                
                {territory.status === 'En uso' && (
                  <button 
                    onClick={onReturn}
                    disabled={isProcessing}
                    className="p-2 text-slate-500 bg-slate-200 rounded-full hover:bg-slate-300 disabled:opacity-50 transition-colors"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
                      <path d="M3 3v5h5"/>
                    </svg>
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      <div className="px-4 pb-4 flex items-center justify-between gap-4">
        <div className="flex-1 min-w-0">
          <h2 
            className="text-xl font-bold text-slate-800 truncate cursor-pointer hover:text-indigo-600 transition-colors flex items-center group"
            onClick={() => onOpenMapModal()}
            title="Ver mapa del territorio"
          >
            <Icon name="map" size={20} className="mr-2 text-slate-500 group-hover:text-indigo-500" />
            {territory.name}
          </h2>
          <p className="text-sm text-slate-500">{stats.visited} de {stats.total} trabajadas</p>
        </div>

        <div className="flex items-center flex-shrink-0 space-x-2">
          {sortControls.sortOrder !== 'alpha' ? (
            <button 
              onClick={sortControls.onResetSort} 
              className="p-2.5 text-red-500 bg-white rounded-lg shadow-sm border border-red-200 hover:bg-red-50 transition-all"
              title="Restaurar orden original"
            >
              <Icon name="x" size={18} />
            </button>
          ) : (
            <button 
              onClick={sortControls.onSortByDistance} 
              disabled={sortControls.isLocating}
              className="p-2.5 text-slate-500 bg-white rounded-lg shadow-sm border border-slate-200 hover:border-blue-300 disabled:opacity-50 transition-all"
              title="Ordenar por proximidad"
            >
              {sortControls.isLocating 
                ? <div className="animate-spin w-[18px] h-[18px] border-2 border-slate-400 border-t-transparent rounded-full"></div>
                : <Icon name="navigation" size={18} />
              }
            </button>
          )}
          
          <button 
            onClick={sortControls.onOptimizedRoute} 
            disabled={sortControls.isCalculatingRoute}
            className={`p-2.5 rounded-lg shadow-sm border transition-all relative ${
              sortControls.sortOrder === 'optimized' 
              ? 'bg-green-600 text-white border-green-700 shadow-lg' 
              : 'bg-red-600 text-white hover:bg-red-700 border-red-700'
            }`}
            title={sortControls.sortOrder === 'optimized' ? 'Desactivar ruta optimizada' : 'Activar ruta optimizada'}
          >
            {sortControls.isCalculatingRoute 
              ? <div className="animate-spin w-[18px] h-[18px] border-2 border-current border-t-transparent rounded-full"></div>
              : <Icon name="activity" size={18} />
            }
            {sortControls.sortOrder === 'optimized' && !sortControls.isCalculatingRoute && (
              <span className="absolute -top-1 -right-1 w-3 h-3 bg-yellow-400 rounded-full animate-pulse"></span>
            )}
          </button>
          
          <div className="flex items-center space-x-1 p-1 rounded-lg bg-slate-200">
            <button 
              onClick={() => viewControls.setViewMode('grid-full')} 
              className={`p-1.5 rounded-md ${viewControls.viewMode === 'grid-full' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'} transition-colors`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2"></rect>
              </svg>
            </button>
            <button 
              onClick={() => viewControls.setViewMode('list')} 
              className={`p-1.5 rounded-md ${viewControls.viewMode === 'list' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'} transition-colors`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="8" y1="6" x2="21" y2="6"></line>
                <line x1="8" y1="12" x2="21" y2="12"></line>
                <line x1="8" y1="18" x2="21" y2="18"></line>
                <line x1="3" y1="6" x2="3.01" y2="6"></line>
                <line x1="3" y1="12" x2="3.01" y2="12"></line>
                <line x1="3" y1="18" x2="3.01" y2="18"></line>
              </svg>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default TerritoryDetailHeader; 