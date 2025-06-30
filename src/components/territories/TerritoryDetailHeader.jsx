import React, { useState, useRef, useEffect } from 'react';

const TerritoryDetailHeader = ({
  territory,
  stats,
  onBack,
  isAdmin,
  isProcessing,
  onAssign,
  onReturn,
  onComplete,
  onAddAddress,
  isAssignedToMe,
  sortControls,
  viewControls,
  onOpenMapModal
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isAdminMenuOpen, setIsAdminMenuOpen] = useState(false);
  const menuRef = useRef(null);
  const adminMenuRef = useRef(null);
  
  // Normalizar el estado para manejar "Terminado" como "Completado"
  const normalizedStatus = territory.status === 'Terminado' ? 'Completado' : territory.status;

  // Cerrar menús al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsMenuOpen(false);
      }
      if (adminMenuRef.current && !adminMenuRef.current.contains(event.target)) {
        setIsAdminMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleMenu = () => setIsMenuOpen(!isMenuOpen);
  const toggleAdminMenu = () => setIsAdminMenuOpen(!isAdminMenuOpen);

  // Función para manejar el botón contextual de admin
  const handleAdminButtonClick = () => {
    if (normalizedStatus === 'Disponible') {
      // Territorio disponible - asignar directamente
      onAssign();
    } else if (normalizedStatus === 'En uso') {
      // Territorio en uso - mostrar opciones
      toggleAdminMenu();
    }
  };

  return (
    <header className="shadow-md sticky top-0 z-30">
      {/* Barra principal - esenciales + botón admin */}
      <div className="px-4 pt-2 pb-2 flex justify-between items-center" style={{ backgroundColor: '#2C3E50' }}>
        {/* Lado izquierdo - Botón volver y título */}
        <div className="flex items-center space-x-3">
          <button 
            onClick={onBack} 
            className="p-2 rounded-xl shadow-md transition-all duration-200" 
            style={{ 
              backgroundColor: '#34495e',
              minWidth: '36px',
              minHeight: '36px'
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#3a526b'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#34495e'}
            aria-label="Volver a territorios"
          >
            <svg className="w-4 h-4" fill="none" stroke="#FFFFFF" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 18l-6-6 6-6" />
            </svg>
          </button>
          
          <div>
            <h1 className="text-xl font-bold text-white">
              {territory.name}
            </h1>
            <p className="text-xs text-white/70">
              {stats.visited} de {stats.total} visitadas
            </p>
          </div>
        </div>
        
        {/* Lado derecho - Botón admin + agregar + menú */}
        <div className="flex items-center space-x-2">
          {/* Botón contextual de administración */}
          {isAdmin && normalizedStatus !== 'Completado' && (
            <div className="relative" ref={adminMenuRef}>
              <button 
                onClick={handleAdminButtonClick}
                disabled={isProcessing}
                className="p-2 rounded-xl shadow-md transition-all duration-200" 
                style={{ 
                  backgroundColor: normalizedStatus === 'Disponible' ? '#546E7A' : '#607D8B',
                  minWidth: '36px',
                  minHeight: '36px'
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = normalizedStatus === 'Disponible' ? '#607D8B' : '#6C7B7F'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = normalizedStatus === 'Disponible' ? '#546E7A' : '#607D8B'}
                title={normalizedStatus === 'Disponible' ? 'Asignar territorio' : 'Opciones de territorio'}
              >
                {normalizedStatus === 'Disponible' ? (
                  <svg className="w-4 h-4" fill="none" stroke="#FFFFFF" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="#FFFFFF" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                  </svg>
                )}
              </button>

              {/* Mini-menú para territorios en uso */}
              {isAdminMenuOpen && normalizedStatus === 'En uso' && (
                <div className="absolute right-0 mt-2 w-52 bg-white rounded-xl shadow-lg border border-gray-200 py-3 z-50">
                  {/* Reasignar a otro */}
                  <div className="px-3 mb-2">
                    <button 
                      onClick={() => {
                        onAssign();
                        setIsAdminMenuOpen(false);
                      }}
                      disabled={isProcessing}
                      className="w-full p-3 rounded-lg border border-gray-200 hover:border-gray-300 transition-all duration-200 disabled:opacity-50"
                      style={{ backgroundColor: '#f8fafc' }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f1f5f9'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#f8fafc'}
                    >
                      <div className="flex items-center space-x-3">
                        <div className="p-2 rounded-lg" style={{ backgroundColor: '#2C3E50' }}>
                          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                            <circle cx="9" cy="7" r="4" />
                            <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                          </svg>
                        </div>
                        <div className="text-left flex-1">
                          <p className="font-semibold text-sm" style={{ color: '#2C3E50' }}>Reasignar</p>
                          <p className="text-xs text-gray-500">A otro publicador</p>
                        </div>
                        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </button>
                  </div>

                  {/* Devolver territorio */}
                  <div className="px-3 mb-2">
                    <button 
                      onClick={() => {
                        onReturn();
                        setIsAdminMenuOpen(false);
                      }}
                      disabled={isProcessing}
                      className="w-full p-3 rounded-lg border border-gray-200 hover:border-gray-300 transition-all duration-200 disabled:opacity-50"
                      style={{ backgroundColor: '#f8fafc' }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f1f5f9'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#f8fafc'}
                    >
                      <div className="flex items-center space-x-3">
                        <div className="p-2 rounded-lg" style={{ backgroundColor: '#546E7A' }}>
                          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3v5h5" />
                          </svg>
                        </div>
                        <div className="text-left flex-1">
                          <p className="font-semibold text-sm" style={{ color: '#2C3E50' }}>Devolver</p>
                          <p className="text-xs text-gray-500">Liberar territorio</p>
                        </div>
                        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </button>
                  </div>

                  {/* Marcar como completado */}
                  <div className="px-3">
                    <button 
                      onClick={() => {
                        onComplete();
                        setIsAdminMenuOpen(false);
                      }}
                      disabled={isProcessing}
                      className="w-full p-3 rounded-lg border border-gray-200 hover:border-gray-300 transition-all duration-200 disabled:opacity-50"
                      style={{ backgroundColor: '#f8fafc' }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f1f5f9'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#f8fafc'}
                    >
                      <div className="flex items-center space-x-3">
                        <div className="p-2 rounded-lg" style={{ backgroundColor: '#546E7A' }}>
                          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                        <div className="text-left flex-1">
                          <p className="font-semibold text-sm" style={{ color: '#2C3E50' }}>Completar</p>
                          <p className="text-xs text-gray-500">Marcar terminado</p>
                        </div>
                        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Botón agregar dirección */}
          <button 
            onClick={onAddAddress}
            disabled={isProcessing}
            className="p-2 rounded-xl shadow-md transition-all duration-200" 
            style={{ 
              backgroundColor: '#546E7A',
              minWidth: '36px',
              minHeight: '36px'
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#607D8B'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#546E7A'}
            title="Agregar dirección"
          >
            <svg className="w-4 h-4" fill="none" stroke="#FFFFFF" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
            </svg>
          </button>
          
          {/* Menú desplegable (solo vista y ordenamiento) */}
          <div className="relative" ref={menuRef}>
            <button 
              onClick={toggleMenu}
              className="p-2 rounded-xl shadow-md transition-all duration-200" 
              style={{ 
                backgroundColor: '#34495e',
                minWidth: '36px',
                minHeight: '36px'
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#3a526b'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#34495e'}
              title="Más opciones"
            >
              <svg className="w-4 h-4" fill="none" stroke="#FFFFFF" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="1"></circle>
                <circle cx="12" cy="5" r="1"></circle>
                <circle cx="12" cy="19" r="1"></circle>
              </svg>
            </button>

            {/* Menú desplegable simplificado */}
            {isMenuOpen && (
              <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-lg border border-gray-200 py-2 z-50">
                {/* Controles de vista */}
                <div className="px-3 py-2 border-b border-gray-100">
                  <p className="text-xs font-medium text-gray-500 mb-2">Vista</p>
                  <div className="flex items-center space-x-2">
                    <button 
                      onClick={() => {
                        viewControls.setViewMode('grid-full');
                        setIsMenuOpen(false);
                      }}
                      className={`flex-1 p-2 rounded-lg text-sm font-medium transition-all ${
                        viewControls.viewMode === 'grid-full' 
                        ? 'bg-blue-100 text-blue-700' 
                        : 'text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      <svg className="w-4 h-4 mx-auto mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <rect x="3" y="3" width="7" height="7" rx="1"></rect>
                        <rect x="14" y="3" width="7" height="7" rx="1"></rect>
                        <rect x="14" y="14" width="7" height="7" rx="1"></rect>
                        <rect x="3" y="14" width="7" height="7" rx="1"></rect>
                      </svg>
                      <span className="block">Tarjetas</span>
                    </button>
                    <button 
                      onClick={() => {
                        viewControls.setViewMode('list');
                        setIsMenuOpen(false);
                      }}
                      className={`flex-1 p-2 rounded-lg text-sm font-medium transition-all ${
                        viewControls.viewMode === 'list' 
                        ? 'bg-blue-100 text-blue-700' 
                        : 'text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      <svg className="w-4 h-4 mx-auto mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <line x1="8" y1="6" x2="21" y2="6"></line>
                        <line x1="8" y1="12" x2="21" y2="12"></line>
                        <line x1="8" y1="18" x2="21" y2="18"></line>
                        <line x1="3" y1="6" x2="3.01" y2="6"></line>
                        <line x1="3" y1="12" x2="3.01" y2="12"></line>
                        <line x1="3" y1="18" x2="3.01" y2="18"></line>
                      </svg>
                      <span className="block">Lista</span>
                    </button>
                  </div>
                </div>

                {/* Ordenamiento */}
                <div className="px-3 py-2">
                  <p className="text-xs font-medium text-gray-500 mb-2">Ordenamiento</p>
                  
                  {sortControls.sortOrder !== 'alpha' && (
                    <button 
                      onClick={() => {
                        sortControls.onResetSort();
                        setIsMenuOpen(false);
                      }}
                      className="w-full flex items-center px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg"
                    >
                      <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                      <span>Restaurar orden original</span>
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Barra de funciones útiles - solo 3 elementos */}
      <div className="px-4 py-2" style={{ backgroundColor: '#546E7A' }}>
        <div className="flex items-center justify-between">
          {/* Estado del territorio */}
          <div className="flex items-center space-x-3">
            <div className={`px-3 py-1 rounded-lg flex items-center space-x-2 ${
              normalizedStatus === 'Disponible' ? 'bg-emerald-500/90' :
              normalizedStatus === 'En uso' ? 'bg-amber-500/90' :
              'bg-rose-500/90'
            }`}>
              <div className={`w-2 h-2 rounded-full bg-white ${normalizedStatus === 'En uso' ? 'animate-pulse' : ''}`}></div>
              <span className="text-white text-sm font-medium">
                {normalizedStatus === 'En uso' ? 'Predicando' : normalizedStatus}
              </span>
            </div>
            
            {stats.pending > 0 && (
              <div className="bg-white/20 px-2 py-1 rounded-lg">
                <span className="text-white/90 text-xs font-medium">
                  {stats.pending} pendientes
                </span>
              </div>
            )}
          </div>

          {/* Solo funciones útiles visibles */}
          <div className="flex items-center space-x-2">
            {/* Ruta optimizada */}
            <button 
              onClick={sortControls.onOptimizedRoute} 
              disabled={sortControls.isCalculatingRoute}
              className={`relative p-2 rounded-lg transition-all duration-200 ${
                sortControls.sortOrder === 'optimized' 
                ? 'bg-emerald-500/90 scale-105' 
                : 'bg-white/20 hover:bg-white/30'
              }`}
              title={sortControls.sortOrder === 'optimized' ? 'Desactivar ruta optimizada' : 'Activar ruta optimizada'}
            >
              {sortControls.isCalculatingRoute ? (
                <div className="animate-spin w-4 h-4 border-2 border-current border-t-transparent rounded-full"></div>
              ) : (
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              )}
              {sortControls.sortOrder === 'optimized' && !sortControls.isCalculatingRoute && (
                <span className="absolute -top-1 -right-1 w-3 h-3 bg-yellow-400 rounded-full animate-pulse"></span>
              )}
            </button>
            
            {/* Ver mapa */}
            <button 
              onClick={onOpenMapModal}
              className="p-2 rounded-lg bg-white/20 hover:bg-white/30 transition-all duration-200"
              title="Ver mapa del territorio"
            >
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default TerritoryDetailHeader; 