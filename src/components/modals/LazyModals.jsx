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
  LazyProposalsModal,
  LazyMapModal,
  LazyAddressFormModal,
  LazyUserManagementModal,
  LazyPasswordModal
}; 