import React from 'react';
import { useLazyComponent, LazyFallback } from '../../hooks/useLazyComponent';

// OPTIMIZACIÓN: Lazy Loading para modales no críticos ⚡
// Estos modales no se cargan hasta que realmente se necesiten

// Lazy StatsModal - NO crítico para carga inicial
export const LazyStatsModal = ({ isOpen, ...props }) => {
  const { Component, isLoading, error } = useLazyComponent(
    () => import('./StatsModal'),
    [isOpen] // Solo cargar cuando se abra
  );

  if (!isOpen) return null;
  
  if (error) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 max-w-md">
          <p className="text-red-600">Error al cargar estadísticas</p>
          <button 
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded"
          >
            Recargar
          </button>
        </div>
      </div>
    );
  }

  if (isLoading || !Component) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6">
          <LazyFallback message="Cargando estadísticas..." />
        </div>
      </div>
    );
  }

  return <Component isOpen={isOpen} {...props} />;
};

// Lazy AdminModal - NO crítico para carga inicial
export const LazyAdminModal = ({ isOpen, ...props }) => {
  console.log('🔍 [DEBUG] LazyAdminModal render:', { isOpen, props });
  
  const { Component, isLoading, error } = useLazyComponent(
    () => {
      console.log('🔍 [DEBUG] Iniciando import dinámico de AdminModal');
      return import('./AdminModal');
    },
    [isOpen]
  );

  console.log('🔍 [DEBUG] LazyAdminModal state:', { Component: !!Component, isLoading, error });

  if (!isOpen) {
    console.log('🔍 [DEBUG] AdminModal no está abierto, retornando null');
    return null;
  }
  
  if (error) {
    console.log('🔍 [DEBUG] AdminModal error:', error);
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 max-w-md">
          <p className="text-red-600">Error al cargar panel admin</p>
          <button 
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded"
          >
            Recargar
          </button>
        </div>
      </div>
    );
  }

  if (isLoading || !Component) {
    console.log('🔍 [DEBUG] AdminModal cargando...', { isLoading, hasComponent: !!Component });
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6">
          <LazyFallback message="Cargando panel admin..." />
          <div className="mt-2 text-xs text-gray-500">
            Debug: isLoading={String(isLoading)}, hasComponent={String(!!Component)}
          </div>
        </div>
      </div>
    );
  }

  console.log('🔍 [DEBUG] AdminModal listo para renderizar');
  console.log('🔍 [DEBUG] Props que se van a pasar:', { isOpen, ...props });
  return <Component isOpen={isOpen} onClose={props.onClose} {...props} />;
};

// Lazy ReportsModal - NO crítico para carga inicial
export const LazyReportsModal = ({ isOpen, ...props }) => {
  const { Component, isLoading, error } = useLazyComponent(
    () => import('./ReportsModal'),
    [isOpen]
  );

  if (!isOpen) return null;
  
  if (error) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 max-w-md">
          <p className="text-red-600">Error al cargar reportes</p>
          <button 
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded"
          >
            Recargar
          </button>
        </div>
      </div>
    );
  }

  if (isLoading || !Component) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6">
          <LazyFallback message="Cargando reportes..." />
        </div>
      </div>
    );
  }

  return <Component isOpen={isOpen} {...props} />;
};

// Lazy ProposalsModal - NO crítico para carga inicial
export const LazyProposalsModal = ({ isOpen, ...props }) => {
  const { Component, isLoading, error } = useLazyComponent(
    () => import('./ProposalsModal'),
    [isOpen]
  );

  if (!isOpen) return null;
  
  if (error) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 max-w-md">
          <p className="text-red-600">Error al cargar propuestas</p>
          <button 
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded"
          >
            Recargar
          </button>
        </div>
      </div>
    );
  }

  if (isLoading || !Component) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6">
          <LazyFallback message="Cargando propuestas..." />
        </div>
      </div>
    );
  }

  return <Component isOpen={isOpen} {...props} />;
};

export default {
  LazyStatsModal,
  LazyAdminModal,
  LazyReportsModal,
  LazyProposalsModal
}; 