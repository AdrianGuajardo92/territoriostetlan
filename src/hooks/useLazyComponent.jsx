import { useState, useEffect } from 'react';

// Hook simplificado para lazy loading - SIN refs complejas ⚡
export const useLazyComponent = (importFunction, dependencies = []) => {
  const [Component, setComponent] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Auto-cargar cuando se necesiten las dependencias
  useEffect(() => {
    console.log('🔍 [DEBUG] useLazyComponent useEffect:', { dependencies });
    const shouldLoad = dependencies.some(dep => Boolean(dep));
    console.log('🔍 [DEBUG] shouldLoad:', shouldLoad);
    
    if (shouldLoad && !Component && !isLoading) {
      console.log('🔍 [DEBUG] Starting component load...');
      setIsLoading(true);
      setError(null);

      importFunction()
        .then(module => {
          console.log('🔍 [DEBUG] Import successful:', { module, default: !!module.default });
          const ComponentToSet = module.default || module;
          console.log('🔍 [DEBUG] Component to set:', { 
            type: typeof ComponentToSet, 
            name: ComponentToSet?.name || 'unknown',
            isFunction: typeof ComponentToSet === 'function'
          });
          setComponent(() => ComponentToSet);
          setIsLoading(false);
          console.log('🔍 [DEBUG] Component set successfully');
        })
        .catch(err => {
          console.error('🔍 [DEBUG] Error loading component:', err);
          setError(err);
          setIsLoading(false);
        });
    }
  }, dependencies);

  return {
    Component,
    isLoading,
    error
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