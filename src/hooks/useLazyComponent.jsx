import { useState, useEffect, useRef } from 'react';

// Hook para lazy loading de componentes - OPTIMIZACIÓN BUNDLE SIZE ⚡
export const useLazyComponent = (importFunction, dependencies = []) => {
  const [Component, setComponent] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const loadComponent = async () => {
    if (Component || isLoading) return;

    setIsLoading(true);
    setError(null);

    try {
      const module = await importFunction();
      
      if (isMountedRef.current) {
        setComponent(() => module.default || module);
      }
    } catch (err) {
      console.error('Error loading component:', err);
      if (isMountedRef.current) {
        setError(err);
      }
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  };

  // Auto-cargar cuando se necesiten las dependencias
  useEffect(() => {
    const shouldLoad = dependencies.some(dep => Boolean(dep)); // Cualquier valor truthy
    if (shouldLoad) {
      loadComponent();
    }
  }, dependencies);

  return {
    Component,
    isLoading,
    error,
    loadComponent
  };
};

// Componente de fallback para lazy loading
export const LazyFallback = ({ message = 'Cargando...', className = '' }) => (
  <div className={`flex items-center justify-center p-8 ${className}`}>
    <div className="flex items-center space-x-3">
      <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
      <span className="text-gray-600 font-medium">{message}</span>
    </div>
  </div>
);

export default useLazyComponent; 