import React, { useState, useRef, useEffect } from 'react';
import { usePremiumFeedback } from '../../hooks/usePremiumFeedback';

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
  onOpenMapModal,
  adminEditMode = false,
  onToggleAdminMode
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isAdminMenuOpen, setIsAdminMenuOpen] = useState(false);
  const menuRef = useRef(null);
  const adminMenuRef = useRef(null);
  
  // FASE 3: Premium feedback ⚡
  const { tapFeedback, successFeedback } = usePremiumFeedback();
  
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
    } else if (normalizedStatus === 'En uso' || (normalizedStatus === 'Completado' && adminEditMode)) {
      // Territorio en uso o completado (en modo admin) - mostrar opciones
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
            onClick={(e) => {
              tapFeedback(e.currentTarget);
              onBack();
            }} 
            className="p-2 rounded-xl shadow-md transition-all duration-200 touch-feedback btn-premium" 
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
          {isAdmin && (normalizedStatus !== 'Completado' || adminEditMode) && (
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

              {/* Mini-menú para territorios en uso o completados (en modo admin) */}
              {isAdminMenuOpen && (normalizedStatus === 'En uso' || (normalizedStatus === 'Completado' && adminEditMode)) && (
                <div className="absolute right-0 mt-2 w-52 bg-white rounded-xl shadow-lg border border-gray-200 py-3 z-50">
                  {/* Reasignar a otro - Solo para territorios en uso */}
                  {normalizedStatus === 'En uso' && (
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
                  )}

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

                  {/* Marcar como completado - Solo para territorios en uso */}
                  {normalizedStatus === 'En uso' && (
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
                          <p className="font-semibold text-sm" style={{ color: '#2C3E50' }}>Territorio completado</p>
                          <p className="text-xs text-gray-500">Marcar como terminado</p>
                        </div>
                        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </button>
                  </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Botón agregar dirección */}
          <button 
            onClick={(e) => {
              successFeedback(e.currentTarget);
              onAddAddress();
            }}
            disabled={isProcessing}
            className="p-2 rounded-xl shadow-md transition-all duration-200 touch-feedback btn-premium" 
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

            {/* ✨ MENÚ REDISEÑADO DISCRETO Y ELEGANTE */}
            {isMenuOpen && (
              <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden z-50">
                {/* Header discreto */}
                <div className="bg-gray-50 px-4 py-3 border-b border-gray-100">
                  <h3 className="text-gray-900 font-semibold text-sm flex items-center">
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4" />
                    </svg>
                    Opciones
                  </h3>
                </div>

                {/* 🛡️ MODO ADMINISTRADOR - PRIORITARIO Y DESTACADO */}
                {isAdmin && (
                  <div className="p-3 border-b border-gray-100">
                    <div className="flex items-center mb-3">
                      <div className="w-6 h-6 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
                        <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                        </svg>
                      </div>
                      <span className="text-sm font-semibold text-gray-800">Administración</span>
                      {adminEditMode && (
                        <div className="ml-2 px-2 py-1 bg-orange-100 text-orange-700 text-xs font-medium rounded-full">
                          ACTIVO
                        </div>
                      )}
                    </div>
                    
                    <button 
                      onClick={() => {
                        onToggleAdminMode?.();
                        setIsMenuOpen(false);
                      }}
                      className={`w-full flex items-center justify-between p-3 rounded-xl transition-all border-2 ${
                        adminEditMode 
                          ? 'bg-gradient-to-r from-orange-50 to-amber-50 border-orange-300 text-orange-800 shadow-sm' 
                          : 'border-blue-200 text-gray-700 hover:bg-blue-50 hover:border-blue-300'
                      }`}
                    >
                      <div className="flex items-center">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center mr-3 ${
                          adminEditMode ? 'bg-orange-200' : 'bg-blue-100'
                        }`}>
                          <svg className={`w-5 h-5 ${
                            adminEditMode ? 'text-orange-700' : 'text-blue-600'
                          }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </div>
                        <div className="text-left">
                          <p className="text-sm font-medium">
                            {adminEditMode ? 'Desactivar Modo Admin' : 'Activar Modo Admin'}
                          </p>
                          <p className={`text-xs ${
                            adminEditMode ? 'text-orange-600' : 'text-gray-500'
                          }`}>
                            {adminEditMode ? 'Toca para salir del modo edición' : 'Habilitar controles avanzados'}
                          </p>
                        </div>
                      </div>
                      <svg className={`w-5 h-5 ${
                        adminEditMode ? 'text-orange-500' : 'text-blue-500'
                      }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  </div>
                )}

                {/* 👁️ VISTA - Secundario */}
                <div className="p-3">
                  <div className="flex items-center mb-2">
                    <svg className="w-4 h-4 mr-2 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                    <span className="text-sm font-medium text-gray-700">Vista</span>
                  </div>
                  
                  <div className="flex gap-2">
                    <button 
                      onClick={() => {
                        viewControls.setViewMode('grid-full');
                        setIsMenuOpen(false);
                      }}
                      className={`flex-1 p-2 rounded-lg text-xs transition-all ${
                        viewControls.viewMode === 'grid-full' 
                        ? 'bg-gray-100 text-gray-800 font-medium' 
                        : 'text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      <svg className="w-4 h-4 mx-auto mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <rect x="3" y="3" width="7" height="7" rx="1"></rect>
                        <rect x="14" y="3" width="7" height="7" rx="1"></rect>
                        <rect x="14" y="14" width="7" height="7" rx="1"></rect>
                        <rect x="3" y="14" width="7" height="7" rx="1"></rect>
                      </svg>
                      Tarjetas
                    </button>
                    
                    <button 
                      onClick={() => {
                        viewControls.setViewMode('list');
                        setIsMenuOpen(false);
                      }}
                      className={`flex-1 p-2 rounded-lg text-xs transition-all ${
                        viewControls.viewMode === 'list' 
                        ? 'bg-gray-100 text-gray-800 font-medium' 
                        : 'text-gray-600 hover:bg-gray-50'
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
                      Lista
                    </button>
                  </div>
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
            
            {/* Indicador de modo administrador activo */}
            {isAdmin && adminEditMode && (
              <div className="bg-orange-500/90 px-3 py-1 rounded-lg flex items-center space-x-2 animate-pulse">
                <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                <span className="text-white text-sm font-bold">MODO ADMIN</span>
              </div>
            )}
          </div>

          {/* Solo funciones útiles visibles */}
          <div className="flex items-center space-x-2">
            {/* Ruta optimizada - BOTÓN INTELIGENTE TOGGLE */}
            <button 
              onClick={() => {
                if (sortControls.sortOrder === 'optimized') {
                  // Si ya está activa, desactivar (resetear)
                  sortControls.onResetSort();
                } else {
                  // Si no está activa, crear ruta optimizada
                  sortControls.onOptimizedRoute();
                }
              }}
              onDoubleClick={() => {
                // Doble clic de emergencia para desbloquear si está atascado
                if (sortControls.isCalculatingRoute && sortControls.forceReset) {
                  sortControls.forceReset();
                }
              }}
              disabled={sortControls.isCalculatingRoute}
              className={`relative p-2 rounded-lg transition-all duration-200 ${
                sortControls.sortOrder === 'optimized' 
                ? 'bg-emerald-500/90 scale-105' 
                : 'bg-white/20 hover:bg-white/30'
              } ${sortControls.isCalculatingRoute ? 'cursor-wait' : ''}`}
              title={
                sortControls.isCalculatingRoute 
                  ? 'Calculando ruta... (doble clic para resetear si está atascado)' 
                  : sortControls.sortOrder === 'optimized' 
                    ? 'Desactivar ruta optimizada' 
                    : 'Crear ruta optimizada'
              }
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