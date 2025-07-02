import { useState, useEffect, useRef, useCallback } from 'react';

// 📱 FASE 2: Hook para gestos táctiles optimizados
export const useTouchGestures = (options = {}) => {
  const {
    onSwipeLeft = null,
    onSwipeRight = null,
    onSwipeUp = null,
    onSwipeDown = null,
    onTap = null,
    onDoubleTap = null,
    onLongPress = null,
    swipeThreshold = 50,
    longPressDelay = 500,
    doubleTapDelay = 300
  } = options;

  const [touchState, setTouchState] = useState({
    isPressed: false,
    startX: 0,
    startY: 0,
    currentX: 0,
    currentY: 0,
    deltaX: 0,
    deltaY: 0,
    startTime: 0,
    lastTap: 0
  });

  const longPressTimer = useRef(null);
  const elementRef = useRef(null);

  // 🎯 Optimización: Usar passive listeners para mejor performance
  const handleTouchStart = useCallback((e) => {
    const touch = e.touches[0];
    const now = Date.now();
    
    setTouchState(prev => ({
      ...prev,
      isPressed: true,
      startX: touch.clientX,
      startY: touch.clientY,
      currentX: touch.clientX,
      currentY: touch.clientY,
      deltaX: 0,
      deltaY: 0,
      startTime: now
    }));

    // 🔥 Long press detection
    if (onLongPress) {
      longPressTimer.current = setTimeout(() => {
        onLongPress(e, {
          x: touch.clientX,
          y: touch.clientY
        });
      }, longPressDelay);
    }
  }, [onLongPress, longPressDelay]);

  const handleTouchMove = useCallback((e) => {
    if (!touchState.isPressed) return;

    const touch = e.touches[0];
    const deltaX = touch.clientX - touchState.startX;
    const deltaY = touch.clientY - touchState.startY;

    setTouchState(prev => ({
      ...prev,
      currentX: touch.clientX,
      currentY: touch.clientY,
      deltaX,
      deltaY
    }));

    // 🚫 Cancelar long press si se mueve mucho
    if (Math.abs(deltaX) > 10 || Math.abs(deltaY) > 10) {
      if (longPressTimer.current) {
        clearTimeout(longPressTimer.current);
        longPressTimer.current = null;
      }
    }
  }, [touchState.isPressed, touchState.startX, touchState.startY]);

  const handleTouchEnd = useCallback((e) => {
    if (!touchState.isPressed) return;

    const now = Date.now();
    const timeDiff = now - touchState.startTime;
    const { deltaX, deltaY } = touchState;

    // 🧹 Limpiar long press timer
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }

    setTouchState(prev => ({
      ...prev,
      isPressed: false,
      deltaX: 0,
      deltaY: 0
    }));

    // 🎯 Detectar tipo de gesto
    const isSwipe = Math.abs(deltaX) > swipeThreshold || Math.abs(deltaY) > swipeThreshold;
    const isTap = !isSwipe && timeDiff < 300;

    if (isSwipe) {
      // 👆 Swipe gestures
      if (Math.abs(deltaX) > Math.abs(deltaY)) {
        // Swipe horizontal
        if (deltaX > 0 && onSwipeRight) {
          onSwipeRight(e, { deltaX, deltaY, timeDiff });
        } else if (deltaX < 0 && onSwipeLeft) {
          onSwipeLeft(e, { deltaX, deltaY, timeDiff });
        }
      } else {
        // Swipe vertical
        if (deltaY > 0 && onSwipeDown) {
          onSwipeDown(e, { deltaX, deltaY, timeDiff });
        } else if (deltaY < 0 && onSwipeUp) {
          onSwipeUp(e, { deltaX, deltaY, timeDiff });
        }
      }
    } else if (isTap) {
      // 👆 Tap gestures
      const timeSinceLastTap = now - touchState.lastTap;
      
      if (timeSinceLastTap < doubleTapDelay && onDoubleTap) {
        // Double tap
        onDoubleTap(e, {
          x: touchState.currentX,
          y: touchState.currentY
        });
        setTouchState(prev => ({ ...prev, lastTap: 0 }));
      } else {
        // Single tap
        if (onTap) {
          onTap(e, {
            x: touchState.currentX,
            y: touchState.currentY
          });
        }
        setTouchState(prev => ({ ...prev, lastTap: now }));
      }
    }
  }, [touchState, swipeThreshold, doubleTapDelay, onSwipeLeft, onSwipeRight, onSwipeUp, onSwipeDown, onTap, onDoubleTap]);

  // 🎯 Configurar event listeners optimizados
  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    // 🚀 Passive listeners para mejor performance en móviles
    const options = { passive: false };
    
    element.addEventListener('touchstart', handleTouchStart, options);
    element.addEventListener('touchmove', handleTouchMove, options);
    element.addEventListener('touchend', handleTouchEnd, options);

    return () => {
      element.removeEventListener('touchstart', handleTouchStart);
      element.removeEventListener('touchmove', handleTouchMove);
      element.removeEventListener('touchend', handleTouchEnd);
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd]);

  return {
    ref: elementRef,
    touchState,
    isPressed: touchState.isPressed,
    deltaX: touchState.deltaX,
    deltaY: touchState.deltaY
  };
};

export default useTouchGestures; 