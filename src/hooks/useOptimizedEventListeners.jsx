import { useEffect, useRef, useCallback } from 'react';

/**
 * Hook optimizado para manejar event listeners con debounce y cleanup automático
 * 🚀 PASO 15: Optimización de rendimiento
 */
export const useOptimizedEventListeners = () => {
  const listenersRef = useRef(new Map());
  const timeoutsRef = useRef(new Map());

  // Función para agregar listener con debounce opcional
  const addListener = useCallback((element, event, handler, options = {}) => {
    const { debounce = 0, passive = true } = options;
    const key = `${event}-${element}`;

    // Remover listener anterior si existe
    removeListener(element, event);

    let optimizedHandler = handler;
    
    // Aplicar debounce si se especifica
    if (debounce > 0) {
      optimizedHandler = (...args) => {
        const timeoutKey = `${key}-timeout`;
        
        // Limpiar timeout anterior
        if (timeoutsRef.current.has(timeoutKey)) {
          clearTimeout(timeoutsRef.current.get(timeoutKey));
        }
        
        // Crear nuevo timeout
        const timeoutId = setTimeout(() => {
          handler(...args);
          timeoutsRef.current.delete(timeoutKey);
        }, debounce);
        
        timeoutsRef.current.set(timeoutKey, timeoutId);
      };
    }

    // Agregar listener
    element.addEventListener(event, optimizedHandler, { passive });
    listenersRef.current.set(key, { element, event, handler: optimizedHandler });
  }, []);

  // Función para remover listener específico
  const removeListener = useCallback((element, event) => {
    const key = `${event}-${element}`;
    const listener = listenersRef.current.get(key);
    
    if (listener) {
      element.removeEventListener(event, listener.handler);
      listenersRef.current.delete(key);
    }
  }, []);

  // Función para limpiar todos los listeners
  const removeAllListeners = useCallback(() => {
    // Limpiar timeouts
    timeoutsRef.current.forEach(timeoutId => clearTimeout(timeoutId));
    timeoutsRef.current.clear();
    
    // Limpiar listeners
    listenersRef.current.forEach(({ element, event, handler }) => {
      element.removeEventListener(event, handler);
    });
    listenersRef.current.clear();
  }, []);

  // Cleanup automático al desmontar
  useEffect(() => {
    return removeAllListeners;
  }, [removeAllListeners]);

  return {
    addListener,
    removeListener,
    removeAllListeners
  };
};

// OPTIMIZACIÓN: Hook para Intersection Observer ⚡
export const useIntersectionObserver = (options = {}) => {
  const observerRef = useRef(null);
  const elementsRef = useRef(new Map());

  const defaultOptions = {
    root: null,
    rootMargin: '50px',
    threshold: 0.1,
    ...options
  };

  const observe = useCallback((element, callback) => {
    if (!element || typeof callback !== 'function') return;

    // Crear observer si no existe
    if (!observerRef.current) {
      observerRef.current = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          const callback = elementsRef.current.get(entry.target);
          if (callback) {
            callback(entry);
          }
        });
      }, defaultOptions);
    }

    // Agregar elemento al observer
    elementsRef.current.set(element, callback);
    observerRef.current.observe(element);

    // Retornar función de cleanup
    return () => {
      if (observerRef.current) {
        observerRef.current.unobserve(element);
        elementsRef.current.delete(element);
      }
    };
  }, [defaultOptions]);

  const disconnect = useCallback(() => {
    if (observerRef.current) {
      observerRef.current.disconnect();
      elementsRef.current.clear();
    }
  }, []);

  // Cleanup automático
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return {
    observe,
    disconnect
  };
};

// OPTIMIZACIÓN: Hook para Resize Observer ⚡
export const useResizeObserver = (callback, debounceMs = 100) => {
  const observerRef = useRef(null);
  const timeoutRef = useRef(null);
  const elementsRef = useRef(new Set());

  const debouncedCallback = useCallback((entries) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      if (typeof callback === 'function') {
        callback(entries);
      }
    }, debounceMs);
  }, [callback, debounceMs]);

  const observe = useCallback((element) => {
    if (!element) return;

    // Crear observer si no existe
    if (!observerRef.current) {
      observerRef.current = new ResizeObserver(debouncedCallback);
    }

    // Agregar elemento
    elementsRef.current.add(element);
    observerRef.current.observe(element);

    // Retornar función de cleanup
    return () => {
      if (observerRef.current) {
        observerRef.current.unobserve(element);
        elementsRef.current.delete(element);
      }
    };
  }, [debouncedCallback]);

  const disconnect = useCallback(() => {
    if (observerRef.current) {
      observerRef.current.disconnect();
      elementsRef.current.clear();
    }
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
  }, []);

  // Cleanup automático
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return {
    observe,
    disconnect
  };
};

export default useOptimizedEventListeners; 