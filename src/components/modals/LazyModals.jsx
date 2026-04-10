import React from 'react';
import { useLazyComponent, LazyFallback } from '../../hooks/useLazyComponent';
import BootScreen from '../common/BootScreen';

const createPreloadableLoader = (importer) => {
  let loadPromise = null;
  let loadedComponent = null;

  const load = () => {
    if (loadedComponent) {
      return Promise.resolve(loadedComponent);
    }

    if (!loadPromise) {
      loadPromise = importer().then((module) => {
        loadedComponent = module.default || module;
        return loadedComponent;
      });
    }

    return loadPromise;
  };

  load.getLoadedComponent = () => loadedComponent;

  return load;
};

const loadTerritoriesView = createPreloadableLoader(() => import('../../pages/TerritoriesView'));
const loadTerritoryDetailView = createPreloadableLoader(() => import('../../pages/TerritoryDetailView'));

export const preloadTerritoriesView = () => loadTerritoriesView();
export const preloadTerritoryDetailView = () => loadTerritoryDetailView();
export const preloadPrimaryViews = () => Promise.all([
  preloadTerritoriesView(),
  preloadTerritoryDetailView()
]);

// Preload del AddressFormModal para evitar parpadeo al abrir
export const preloadAddressFormModal = () => import('./AddressFormModal');

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

// Lazy GeneralMapModal - PESADO y no crítico para la carga inicial
export const LazyCampaignAssignmentsMapModal = ({ isOpen, ...props }) => {
  const { Component, isLoading, error } = useLazyComponent(
    () => import('./CampaignAssignmentsMapModal'),
    [isOpen]
  );

  if (!isOpen) return null;

  if (error) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 max-w-md">
          <p className="text-red-600">Error al cargar mapa de invitaciones</p>
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
          <LazyFallback message="Cargando mapa de invitaciones..." />
        </div>
      </div>
    );
  }

  return <Component isOpen={isOpen} {...props} />;
};

export const LazyGeneralMapModal = ({ isOpen, ...props }) => {
  const { Component, isLoading, error } = useLazyComponent(
    () => import('./GeneralMapModal'),
    [isOpen]
  );

  if (!isOpen) return null;

  if (error) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 max-w-md">
          <p className="text-red-600">Error al cargar mapa general</p>
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
          <LazyFallback message="Cargando mapa general..." />
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
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[9999]">
        <div className="bg-white rounded-2xl p-6 max-w-md shadow-2xl">
          <p className="text-red-600">Error al cargar formulario</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg"
          >
            Recargar
          </button>
        </div>
      </div>
    );
  }

  if (isLoading || !Component) {
    // Fallback transparente - sin backdrop propio para evitar parpadeo
    // El Modal real pondrá su propio backdrop cuando cargue
    return (
      <div className="fixed inset-0 z-[9999] flex items-center justify-center pointer-events-none">
        <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-6 shadow-xl pointer-events-auto">
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

// Lazy S13ReportModal - Reporte de Asignación de Territorio
export const LazyS13ReportModal = ({ isOpen, ...props }) => {
  const { Component, isLoading, error } = useLazyComponent(
    () => import('./S13ReportModal'),
    [isOpen]
  );

  if (!isOpen) return null;

  if (error) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 max-w-md">
          <p className="text-red-600">Error al cargar reporte S-13</p>
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
          <LazyFallback message="Cargando reporte S-13..." />
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
  const preloadedComponent = loadTerritoryDetailView.getLoadedComponent();
  const { Component, isLoading, error } = useLazyComponent(
    loadTerritoryDetailView,
    [true] // Cargar inmediatamente
  );
  const ResolvedComponent = Component || preloadedComponent;
  
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

  if (isLoading || !ResolvedComponent) {
    return (
      <div className="fixed inset-0 z-50">
        <BootScreen
          phase="territories"
          subtitle="Preparando el detalle del territorio."
          announceMount={false}
        />
      </div>
    );
  }

  return <ResolvedComponent {...props} />;
};

// Lazy TerritoriesView - MEDIANO (10KB) - PRIORIDAD MÍTICA #3 ⚡
export const LazyTerritoriesView = ({ ...props }) => {
  const preloadedComponent = loadTerritoriesView.getLoadedComponent();
  const { Component, isLoading, error } = useLazyComponent(
    loadTerritoriesView,
    [true] // Cargar inmediatamente
  );
  const ResolvedComponent = Component || preloadedComponent;
  
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

  if (isLoading || !ResolvedComponent) {
    return (
      <div className="fixed inset-0 z-50">
        <BootScreen
          phase="territories"
          subtitle="Preparando la vista principal de territorios."
          announceMount={false}
        />
      </div>
    );
  }

  return <ResolvedComponent {...props} />;
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

export const LazyCampaignsView = ({ ...props }) => {
  const { Component, isLoading, error } = useLazyComponent(
    () => import('../../pages/CampaignsView'),
    [true]
  );

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-lg p-8 max-w-md shadow-lg">
          <p className="text-red-600 text-center mb-4">Error al cargar Campañas e Invitaciones</p>
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
      <div className="fixed inset-0 z-50">
        <BootScreen
          phase="campaigns"
          subtitle="Preparando campañas e invitaciones."
          announceMount={false}
        />
      </div>
    );
  }

  return <Component {...props} />;
};

export default {
  LazyStatsModal,
  LazyAdminModal,
  LazyS13ReportModal,
  LazyMapModal,
  LazyCampaignAssignmentsMapModal,
  LazyGeneralMapModal,
  LazyAddressFormModal,
  LazyUserManagementModal,
  LazyPasswordModal,
  LazySearchModal,
  LazyAssignTerritoryModal,
  LazyInstallModal,
  LazyUpdatesModal,
  LazyMyProposalsView,
  LazyTerritoryDetailView,
  LazyTerritoriesView,
  LazyCampaignsView,
  LazyMyStudiesAndRevisitsView
}; 
