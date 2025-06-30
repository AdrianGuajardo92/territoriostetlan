/**
 * Sistema de Feedback Háptico para mejorar la experiencia táctil
 */

export const HapticFeedback = {
  // Éxito suave
  success: () => {
    if (navigator.vibrate) {
      navigator.vibrate([50]);
    }
  },
  
  // Error/Advertencia
  error: () => {
    if (navigator.vibrate) {
      navigator.vibrate([100, 50, 100]);
    }
  },
  
  // Acción completada
  completion: () => {
    if (navigator.vibrate) {
      navigator.vibrate([30, 20, 30, 20, 50]);
    }
  },
  
  // Click/Tap ligero
  tap: () => {
    if (navigator.vibrate) {
      navigator.vibrate([10]);
    }
  },

  // Navegación iniciada
  navigation: () => {
    if (navigator.vibrate) {
      navigator.vibrate([25, 15, 25]);
    }
  }
};

export default HapticFeedback; 