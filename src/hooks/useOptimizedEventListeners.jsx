import { useEffect, useRef, useCallback } from 'react';

// OPTIMIZACIÓN FASE 2: Hook para event listeners consolidados ⚡
export const useOptimizedEventListeners = (eventListeners = []) => {
  const listenersRef = useRef([]);
  const cleanupRef = useRef([]);

  // Función para agregar event listener optimizado
  const addListener = useCallback((element, event, handler, options = {}) => {
    if (!element || typeof handler !== 'function') return;

    // Verificar si ya existe para evitar duplicados
    const existingIndex = listenersRef.current.findIndex(
      listener => listener.element === element && listener.event === event
    );

    if (existingIndex !== -1) {
      // Remover el anterior si existe
      const existing = listenersRef.current[existingIndex];
      existing.element.removeEventListener(existing.event, existing.handler, existing.options);
      listenersRef.current.splice(existingIndex, 1);
    }

    // Agregar el nuevo listener
    const optimizedOptions = {
      passive: true, // Optimización por defecto para mejor performance
      capture: false,
      ...options
    };

    element.addEventListener(event, handler, optimizedOptions);

    // Guardar referencia para cleanup
    listenersRef.current.push({
      element,
      event,
      handler,
      options: optimizedOptions
    });

    // Retornar función de cleanup individual
    return () => {
      element.removeEventListener(event, handler, optimizedOptions);
      const index = listenersRef.current.findIndex(
        listener => listener.element === element && 
                   listener.event === event && 
                   listener.handler === handler
      );
      if (index !== -1) {
        listenersRef.current.splice(index, 1);
      }
    };
  }, []);

  // Función para remover todos los listeners
  const removeAllListeners = useCallback(() => {
    listenersRef.current.forEach(({ element, event, handler, options }) => {
      if (element && element.removeEventListener) {
        element.removeEventListener(event, handler, options);
      }
    });
    listenersRef.current = [];
  }, []);

  // Cleanup automático al desmontar
  useEffect(() => {
    return () => {
      removeAllListeners();
    };
  }, [removeAllListeners]);

  return {
    addListener,
    removeAllListeners,
    activeListeners: listenersRef.current.length
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