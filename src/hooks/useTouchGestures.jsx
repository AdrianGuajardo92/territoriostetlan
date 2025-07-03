import { useState, useEffect, useRef, useCallback } from 'react';

// FASE 3: Hook para Touch Gestures Premium ⚡
export const useTouchGestures = (element, options = {}) => {
  const [gesture, setGesture] = useState(null);
  const touchStartRef = useRef(null);
  const touchEndRef = useRef(null);
  const longPressTimerRef = useRef(null);

  const defaultOptions = {
    swipeThreshold: 50,
    longPressDelay: 500,
    preventDefault: true,
    enableSwipe: true,
    enableLongPress: true,
    enableDoubleTap: true,
    ...options
  };

  // Función segura para prevenir default si está habilitado
  const safePreventDefault = useCallback((e) => {
    if (defaultOptions.preventDefault && e.preventDefault) {
      e.preventDefault();
    }
  }, [defaultOptions.preventDefault]);

  // Touch Start - SEGURO
  const handleTouchStart = useCallback((e) => {
    if (!e.touches || e.touches.length === 0) return;

    const touch = e.touches[0];
    touchStartRef.current = {
      x: touch.clientX,
      y: touch.clientY,
      time: Date.now()
    };

    // Long press timer
    if (defaultOptions.enableLongPress) {
      longPressTimerRef.current = setTimeout(() => {
        setGesture({
          type: 'longpress',
          startX: touchStartRef.current.x,
          startY: touchStartRef.current.y
        });
        
        // Vibración táctil suave si está disponible
        if (navigator.vibrate) {
          navigator.vibrate(50);
        }
      }, defaultOptions.longPressDelay);
    }
  }, [defaultOptions.enableLongPress, defaultOptions.longPressDelay]);

  // Touch Move - SEGURO
  const handleTouchMove = useCallback((e) => {
    if (!touchStartRef.current) return;

    // Cancelar long press si se mueve
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }

    safePreventDefault(e);
  }, [safePreventDefault]);

  // Touch End - SEGURO
  const handleTouchEnd = useCallback((e) => {
    if (!touchStartRef.current) return;

    // Limpiar long press timer
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }

    if (!e.changedTouches || e.changedTouches.length === 0) return;

    const touch = e.changedTouches[0];
    touchEndRef.current = {
      x: touch.clientX,
      y: touch.clientY,
      time: Date.now()
    };

    const deltaX = touchEndRef.current.x - touchStartRef.current.x;
    const deltaY = touchEndRef.current.y - touchStartRef.current.y;
    const deltaTime = touchEndRef.current.time - touchStartRef.current.time;

    // Detectar swipe si está habilitado
    if (defaultOptions.enableSwipe) {
      const absX = Math.abs(deltaX);
      const absY = Math.abs(deltaY);

      if (absX > defaultOptions.swipeThreshold || absY > defaultOptions.swipeThreshold) {
        let direction;
        if (absX > absY) {
          direction = deltaX > 0 ? 'right' : 'left';
        } else {
          direction = deltaY > 0 ? 'down' : 'up';
        }

        setGesture({
          type: 'swipe',
          direction,
          deltaX,
          deltaY,
          velocity: Math.sqrt(deltaX * deltaX + deltaY * deltaY) / deltaTime
        });

        // Feedback táctil muy sutil
        if (navigator.vibrate) {
          navigator.vibrate(20);
        }
      }
    }

    // Detectar tap simple
    if (Math.abs(deltaX) < 10 && Math.abs(deltaY) < 10 && deltaTime < 300) {
      setGesture({
        type: 'tap',
        x: touchEndRef.current.x,
        y: touchEndRef.current.y
      });
    }

    // Reset
    touchStartRef.current = null;
    touchEndRef.current = null;
  }, [defaultOptions.enableSwipe, defaultOptions.swipeThreshold]);

  // Agregar event listeners de forma segura
  useEffect(() => {
    const target = element?.current || element;
    if (!target) return;

    const options = { passive: true };
    
    target.addEventListener('touchstart', handleTouchStart, options);
    target.addEventListener('touchmove', handleTouchMove, options);
    target.addEventListener('touchend', handleTouchEnd, options);

    return () => {
      target.removeEventListener('touchstart', handleTouchStart, options);
      target.removeEventListener('touchmove', handleTouchMove, options);
      target.removeEventListener('touchend', handleTouchEnd, options);
      
      // Limpiar timer si existe
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
      }
    };
  }, [element, handleTouchStart, handleTouchMove, handleTouchEnd]);

  // Función para limpiar gesture después de usar
  const clearGesture = useCallback(() => {
    setGesture(null);
  }, []);

  return {
    gesture,
    clearGesture
  };
};

// Hook simplificado para swipe en listas
export const useSwipeNavigation = (onSwipeLeft, onSwipeRight, options = {}) => {
  const elementRef = useRef(null);
  const { gesture, clearGesture } = useTouchGestures(elementRef, {
    enableLongPress: false,
    enableDoubleTap: false,
    swipeThreshold: 60,
    ...options
  });

  useEffect(() => {
    if (gesture?.type === 'swipe') {
      if (gesture.direction === 'left' && onSwipeLeft) {
        onSwipeLeft();
      } else if (gesture.direction === 'right' && onSwipeRight) {
        onSwipeRight();
      }
      clearGesture();
    }
  }, [gesture, onSwipeLeft, onSwipeRight, clearGesture]);

  return elementRef;
};

export default useTouchGestures; 