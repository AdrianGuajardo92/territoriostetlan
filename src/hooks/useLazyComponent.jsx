import { useState, useEffect } from 'react';

// Hook simplificado para lazy loading - SIN refs complejas ⚡
export const useLazyComponent = (importFunction, dependencies = []) => {
  const [Component, setComponent] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Auto-cargar cuando se necesiten las dependencias
  useEffect(() => {
    const shouldLoad = dependencies.some(dep => Boolean(dep));
    
    if (shouldLoad && !Component && !isLoading) {
      setIsLoading(true);
      setError(null);

      importFunction()
        .then(module => {
          const ComponentToSet = module.default || module;
          setComponent(() => ComponentToSet);
          setIsLoading(false);
        })
        .catch(err => {
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