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
  const { Component, isLoading, error } = useLazyComponent(
    () => import('./AdminModal'),
    [isOpen]
  );

  if (!isOpen) return null;
  
  if (error) {
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
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6">
          <LazyFallback message="Cargando panel admin..." />
        </div>
      </div>
    );
  }

  return <Component isOpen={isOpen} {...props} />;
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

// Lazy MapModal - MUY PESADO (56KB) - PRIORIDAD #1 ⚡
export const LazyMapModal = ({ isOpen, ...props }) => {
  const { Component, isLoading, error } = useLazyComponent(
    () => import('./MapModal'),
    [isOpen] // Solo cargar cuando se abra
  );

  if (!isOpen) return null;
  
  if (error) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 max-w-md">
          <p className="text-red-600">Error al cargar mapa</p>
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
          <LazyFallback message="Cargando mapa interactivo..." />
        </div>
      </div>
    );
  }

  return <Component isOpen={isOpen} {...props} />;
};

// Lazy AddressFormModal - PESADO (24KB) - PRIORIDAD #2 ⚡
export const LazyAddressFormModal = ({ isOpen, ...props }) => {
  const { Component, isLoading, error } = useLazyComponent(
    () => import('./AddressFormModal'),
    [isOpen] // Solo cargar cuando se abra
  );

  if (!isOpen) return null;
  
  if (error) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 max-w-md">
          <p className="text-red-600">Error al cargar formulario</p>
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
          <LazyFallback message="Cargando formulario..." />
        </div>
      </div>
    );
  }

  return <Component isOpen={isOpen} {...props} />;
};

// Lazy UserManagementModal - PESADO (22KB) - PRIORIDAD #3 ⚡
export const LazyUserManagementModal = ({ isOpen, ...props }) => {
  const { Component, isLoading, error } = useLazyComponent(
    () => import('./UserManagementModal'),
    [isOpen] // Solo cargar cuando se abra
  );

  if (!isOpen) return null;
  
  if (error) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 max-w-md">
          <p className="text-red-600">Error al cargar gestión de usuarios</p>
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
          <LazyFallback message="Cargando gestión de usuarios..." />
        </div>
      </div>
    );
  }

  return <Component isOpen={isOpen} {...props} />;
};

// Lazy PasswordModal - PESADO (21KB) - PRIORIDAD #4 ⚡
export const LazyPasswordModal = ({ isOpen, ...props }) => {
  const { Component, isLoading, error } = useLazyComponent(
    () => import('./PasswordModal'),
    [isOpen] // Solo cargar cuando se abra
  );

  if (!isOpen) return null;
  
  if (error) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 max-w-md">
          <p className="text-red-600">Error al cargar configuración de contraseña</p>
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
          <LazyFallback message="Cargando configuración..." />
        </div>
      </div>
    );
  }

  return <Component isOpen={isOpen} {...props} />;
};

// Lazy SystemReportsModal - ¡EL MÁS PESADO! (64KB) - PRIORIDAD #5 ⚡
export const LazySystemReportsModal = ({ isOpen, ...props }) => {
  const { Component, isLoading, error } = useLazyComponent(
    () => import('./SystemReportsModal'),
    [isOpen] // Solo cargar cuando se abra
  );

  if (!isOpen) return null;
  
  if (error) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 max-w-md">
          <p className="text-red-600">Error al cargar reportes del sistema</p>
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
          <LazyFallback message="Cargando reportes del sistema..." />
        </div>
      </div>
    );
  }

  return <Component isOpen={isOpen} {...props} />;
};

// Lazy SearchModal - MEDIANO PERO IMPORTANTE (19KB) - PRIORIDAD #6 ⚡
export const LazySearchModal = ({ isOpen, ...props }) => {
  const { Component, isLoading, error } = useLazyComponent(
    () => import('./SearchModal'),
    [isOpen] // Solo cargar cuando se abra
  );

  if (!isOpen) return null;
  
  if (error) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 max-w-md">
          <p className="text-red-600">Error al cargar búsqueda</p>
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
          <LazyFallback message="Cargando búsqueda..." />
        </div>
      </div>
    );
  }

  return <Component isOpen={isOpen} {...props} />;
};

// Lazy AssignTerritoryModal - MEDIANO HACIA 95% (16KB) - PRIORIDAD #7 ⚡
export const LazyAssignTerritoryModal = ({ isOpen, ...props }) => {
  const { Component, isLoading, error } = useLazyComponent(
    () => import('./AssignTerritoryModal'),
    [isOpen] // Solo cargar cuando se abra
  );

  if (!isOpen) return null;
  
  if (error) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 max-w-md">
          <p className="text-red-600">Error al cargar asignación</p>
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
          <LazyFallback message="Cargando asignación..." />
        </div>
      </div>
    );
  }

  return <Component isOpen={isOpen} {...props} />;
};

// Lazy InstallModal - MEDIANO HACIA 95% (13KB) - PRIORIDAD #8 ⚡
export const LazyInstallModal = ({ isOpen, ...props }) => {
  const { Component, isLoading, error } = useLazyComponent(
    () => import('./InstallModal'),
    [isOpen] // Solo cargar cuando se abra
  );

  if (!isOpen) return null;
  
  if (error) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 max-w-md">
          <p className="text-red-600">Error al cargar instalación</p>
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
          <LazyFallback message="Cargando instalación..." />
        </div>
      </div>
    );
  }

  return <Component isOpen={isOpen} {...props} />;
};

// Lazy UpdatesModal - PEQUEÑO PERO FINAL AL 95% (3.8KB) - PRIORIDAD #9 ⚡
export const LazyUpdatesModal = ({ isOpen, ...props }) => {
  const { Component, isLoading, error } = useLazyComponent(
    () => import('./UpdatesModal'),
    [isOpen] // Solo cargar cuando se abra
  );

  if (!isOpen) return null;
  
  if (error) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 max-w-md">
          <p className="text-red-600">Error al cargar actualizaciones</p>
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
          <LazyFallback message="Cargando actualizaciones..." />
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

// ========================================
// 🚀 CODE SPLITTING DE PÁGINAS - NIVEL MÍTICO 100%
// ========================================

// Lazy MyProposalsView - ¡EL MÁS PESADO! (31KB) - PRIORIDAD MÍTICA #1 ⚡
export const LazyMyProposalsView = ({ ...props }) => {
  const { Component, isLoading, error } = useLazyComponent(
    () => import('../../pages/MyProposalsView'),
    [true] // Cargar inmediatamente
  );
  
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-lg p-8 max-w-md shadow-lg">
          <p className="text-red-600 text-center mb-4">Error al cargar Mis Propuestas</p>
          <button 
            onClick={() => window.location.reload()}
            className="w-full px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
          >
            Recargar página
          </button>
        </div>
      </div>
    );
  }

  if (isLoading || !Component) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-lg p-8 shadow-lg">
          <LazyFallback message="Cargando Mis Propuestas..." />
        </div>
      </div>
    );
  }

  return <Component {...props} />;
};

// Lazy TerritoryDetailView - PESADO (25KB) - PRIORIDAD MÍTICA #2 ⚡
export const LazyTerritoryDetailView = ({ ...props }) => {
  const { Component, isLoading, error } = useLazyComponent(
    () => import('../../pages/TerritoryDetailView'),
    [true] // Cargar inmediatamente
  );
  
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-lg p-8 max-w-md shadow-lg">
          <p className="text-red-600 text-center mb-4">Error al cargar Detalle del Territorio</p>
          <button 
            onClick={() => window.location.reload()}
            className="w-full px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
          >
            Recargar página
          </button>
        </div>
      </div>
    );
  }

  if (isLoading || !Component) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-lg p-8 shadow-lg">
          <LazyFallback message="Cargando Detalle del Territorio..." />
        </div>
      </div>
    );
  }

  return <Component {...props} />;
};

// Lazy TerritoriesView - MEDIANO (10KB) - PRIORIDAD MÍTICA #3 ⚡
export const LazyTerritoriesView = ({ ...props }) => {
  const { Component, isLoading, error } = useLazyComponent(
    () => import('../../pages/TerritoriesView'),
    [true] // Cargar inmediatamente
  );
  
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-lg p-8 max-w-md shadow-lg">
          <p className="text-red-600 text-center mb-4">Error al cargar Territorios</p>
          <button 
            onClick={() => window.location.reload()}
            className="w-full px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
          >
            Recargar página
          </button>
        </div>
      </div>
    );
  }

  if (isLoading || !Component) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-lg p-8 shadow-lg">
          <LazyFallback message="Cargando Territorios..." />
        </div>
      </div>
    );
  }

  return <Component {...props} />;
};

// Lazy MyStudiesAndRevisitsView - MEDIANO (9.2KB) - PRIORIDAD MÍTICA #4 ⚡
export const LazyMyStudiesAndRevisitsView = ({ ...props }) => {
  const { Component, isLoading, error } = useLazyComponent(
    () => import('../../pages/MyStudiesAndRevisitsView'),
    [true] // Cargar inmediatamente
  );
  
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-lg p-8 max-w-md shadow-lg">
          <p className="text-red-600 text-center mb-4">Error al cargar Mis Estudios y Revisitas</p>
          <button 
            onClick={() => window.location.reload()}
            className="w-full px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
          >
            Recargar página
          </button>
        </div>
      </div>
    );
  }

  if (isLoading || !Component) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-lg p-8 shadow-lg">
          <LazyFallback message="Cargando Mis Estudios y Revisitas..." />
        </div>
      </div>
    );
  }

  return <Component {...props} />;
};

export default {
  LazyStatsModal,
  LazyAdminModal,
  LazyReportsModal,
  LazyProposalsModal,
  LazyMapModal,
  LazyAddressFormModal,
  LazyUserManagementModal,
  LazyPasswordModal,
  LazySystemReportsModal,
  LazySearchModal,
  LazyAssignTerritoryModal,
  LazyInstallModal,
  LazyUpdatesModal,
  LazyMyProposalsView,
  LazyTerritoryDetailView,
  LazyTerritoriesView,
  LazyMyStudiesAndRevisitsView
}; 