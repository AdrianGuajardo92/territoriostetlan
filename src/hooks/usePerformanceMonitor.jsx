import { useEffect, useRef } from 'react';

// FASE 3: Hook para monitorear performance ⚡
export const usePerformanceMonitor = (componentName, enabled = false) => {
  const renderCountRef = useRef(0);
  const lastRenderTimeRef = useRef(Date.now());

  useEffect(() => {
    if (!enabled || process.env.NODE_ENV === 'production') return;

    renderCountRef.current += 1;
    const now = Date.now();
    const timeSinceLastRender = now - lastRenderTimeRef.current;
    lastRenderTimeRef.current = now;

    // Solo logear si hay re-renders frecuentes (posible problema)
    if (renderCountRef.current > 1 && timeSinceLastRender < 100) {
      console.debug(`⚡ ${componentName}: Render #${renderCountRef.current} (${timeSinceLastRender}ms ago)`);
    }

    // Resetear contador cada 10 segundos
    const resetTimer = setTimeout(() => {
      renderCountRef.current = 0;
    }, 10000);

    return () => clearTimeout(resetTimer);
  });

  return {
    renderCount: renderCountRef.current
  };
};

// Hook para medir tiempo de operaciones
export const usePerformanceTimer = (enabled = false) => {
  const timersRef = useRef(new Map());

  const startTimer = (label) => {
    if (!enabled || process.env.NODE_ENV === 'production') return;
    timersRef.current.set(label, performance.now());
  };

  const endTimer = (label) => {
    if (!enabled || process.env.NODE_ENV === 'production') return;
    
    const startTime = timersRef.current.get(label);
    if (startTime) {
      const duration = performance.now() - startTime;
      if (duration > 16) { // Solo logear si toma más de 16ms (60fps)
        console.debug(`⏱️ ${label}: ${duration.toFixed(2)}ms`);
      }
      timersRef.current.delete(label);
    }
  };

  return { startTimer, endTimer };
};

export default usePerformanceMonitor; 