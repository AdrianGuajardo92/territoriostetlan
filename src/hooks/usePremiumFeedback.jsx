import { useCallback } from 'react';

// FASE 3: Hook para Feedback Premium ⚡
export const usePremiumFeedback = () => {
  
  // Vibración háptica segura
  const hapticFeedback = useCallback((pattern = 'light') => {
    if (!navigator.vibrate) return;
    
    const patterns = {
      light: 20,
      medium: 50,
      heavy: 100,
      success: [50, 50, 50],
      error: [100, 50, 100],
      warning: [50, 100, 50],
      notification: [25, 25, 25, 25]
    };
    
    const vibrationPattern = patterns[pattern] || patterns.light;
    
    try {
      navigator.vibrate(vibrationPattern);
    } catch (error) {
      // Silencioso si no es compatible
      console.debug('Haptic feedback not supported:', error);
    }
  }, []);

  // Feedback visual premium
  const visualFeedback = useCallback((element, type = 'success') => {
    if (!element) return;

    const effects = {
      success: 'animate-micro-bounce',
      error: 'animate-pulse',
      loading: 'animate-micro-pulse',
      tap: 'animate-premium-fade-scale'
    };

    const className = effects[type] || effects.tap;
    
    // Agregar clase temporalmente
    element.classList.add(className);
    
    // Remover después de la animación
    setTimeout(() => {
      element.classList.remove(className);
    }, 500);
  }, []);

  // Sonido feedback opcional (muy sutil)
  const audioFeedback = useCallback((type = 'tap') => {
    // Solo crear sonidos si el usuario interactúa y tiene audio habilitado
    if (typeof Audio === 'undefined') return;
    
    try {
      // Frecuencias muy sutiles
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      // Configuración según tipo
      const configs = {
        tap: { frequency: 800, duration: 50, volume: 0.05 },
        success: { frequency: 600, duration: 100, volume: 0.08 },
        error: { frequency: 300, duration: 150, volume: 0.1 },
        swipe: { frequency: 1000, duration: 30, volume: 0.03 }
      };
      
      const config = configs[type] || configs.tap;
      
      oscillator.frequency.setValueAtTime(config.frequency, audioContext.currentTime);
      oscillator.type = 'sine';
      
      gainNode.gain.setValueAtTime(0, audioContext.currentTime);
      gainNode.gain.linearRampToValueAtTime(config.volume, audioContext.currentTime + 0.01);
      gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + config.duration / 1000);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + config.duration / 1000);
      
    } catch (error) {
      // Silencioso si no es compatible
      console.debug('Audio feedback not supported:', error);
    }
  }, []);

  // Feedback combinado para diferentes acciones
  const feedback = useCallback((type, options = {}) => {
    const { haptic = true, visual = false, audio = false, element = null } = options;
    
    if (haptic) {
      hapticFeedback(type);
    }
    
    if (visual && element) {
      visualFeedback(element, type);
    }
    
    if (audio) {
      audioFeedback(type);
    }
  }, [hapticFeedback, visualFeedback, audioFeedback]);

  // Shortcuts para acciones comunes
  const tapFeedback = useCallback((element) => {
    feedback('tap', { haptic: true, visual: true, element });
  }, [feedback]);

  const successFeedback = useCallback((element) => {
    feedback('success', { haptic: true, visual: true, audio: true, element });
  }, [feedback]);

  const errorFeedback = useCallback((element) => {
    feedback('error', { haptic: true, visual: true, audio: true, element });
  }, [feedback]);

  const swipeFeedback = useCallback(() => {
    feedback('swipe', { haptic: true, audio: false });
  }, [feedback]);

  return {
    feedback,
    hapticFeedback,
    visualFeedback,
    audioFeedback,
    tapFeedback,
    successFeedback,
    errorFeedback,
    swipeFeedback
  };
};

export default usePremiumFeedback; 