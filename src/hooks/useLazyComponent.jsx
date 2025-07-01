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
    console.log('🔍 [DEBUG] loadComponent called:', { hasComponent: !!Component, isLoading });
    if (Component || isLoading) {
      console.log('🔍 [DEBUG] loadComponent early return - already loaded or loading');
      return;
    }

    console.log('🔍 [DEBUG] Starting component load...');
    setIsLoading(true);
    setError(null);

    try {
      console.log('🔍 [DEBUG] Calling importFunction...');
      const module = await importFunction();
      console.log('🔍 [DEBUG] Import successful:', { module, default: !!module.default });
      
      if (isMountedRef.current) {
        console.log('🔍 [DEBUG] Setting component (mounted)');
        setComponent(() => module.default || module);
      } else {
        console.log('🔍 [DEBUG] Component unmounted, not setting');
      }
    } catch (err) {
      console.error('🔍 [DEBUG] Error loading component:', err);
      if (isMountedRef.current) {
        setError(err);
      }
    } finally {
      if (isMountedRef.current) {
        console.log('🔍 [DEBUG] Setting isLoading to false');
        setIsLoading(false);
      }
    }
  };

  // Auto-cargar cuando se necesiten las dependencias
  useEffect(() => {
    console.log('🔍 [DEBUG] useLazyComponent useEffect:', { dependencies });
    const shouldLoad = dependencies.some(dep => Boolean(dep)); // Cualquier valor truthy
    console.log('🔍 [DEBUG] shouldLoad:', shouldLoad);
    if (shouldLoad) {
      console.log('🔍 [DEBUG] Calling loadComponent from useEffect');
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