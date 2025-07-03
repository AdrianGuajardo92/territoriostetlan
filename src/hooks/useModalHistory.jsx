import { useEffect, useRef } from 'react';

/**
 * Hook personalizado para manejar el historial del navegador en modales
 * Versión mejorada que previene navegación hacia atrás en la aplicación
 */
export const useModalHistory = (isOpen, onClose, modalId = 'modal') => {
  const hasAddedHistoryRef = useRef(false);
  const isClosingRef = useRef(false);

  useEffect(() => {
    if (isOpen) {
      // Solo agregar al historial si no se ha hecho antes
      if (!hasAddedHistoryRef.current) {
        try {
          // Agregar entrada al historial para el modal
          window.history.pushState({ 
            modalOpen: true, 
            modalId,
            timestamp: Date.now()
          }, '', window.location.href);
          hasAddedHistoryRef.current = true;
          console.log(`📱 Modal abierto: ${modalId}`);
        } catch (error) {
          console.warn('Error agregando al historial:', error);
        }
      }

      // Listener para el botón de volver
      const handlePopState = (event) => {
        // Prevenir que se ejecute múltiples veces
        if (isClosingRef.current) {
          return;
        }

        try {
          console.log(`📱 Botón volver presionado - Cerrando modal: ${modalId}`);
          isClosingRef.current = true;
          
          // Cerrar el modal
          onClose();
          
          // Prevenir navegación hacia atrás en la aplicación
          event.preventDefault();
          event.stopPropagation();
          
          // Resetear el flag después de un breve delay
          setTimeout(() => {
            isClosingRef.current = false;
          }, 100);
          
        } catch (error) {
          console.error('Error cerrando modal:', error);
          isClosingRef.current = false;
        }
      };

      window.addEventListener('popstate', handlePopState);

      return () => {
        window.removeEventListener('popstate', handlePopState);
      };
    } else {
      // Resetear cuando se cierra el modal
      hasAddedHistoryRef.current = false;
      isClosingRef.current = false;
    }
  }, [isOpen, onClose, modalId]);

  // Función para cerrar el modal que maneja el historial correctamente
  const closeModal = () => {
    if (hasAddedHistoryRef.current) {
      // Si agregamos una entrada al historial, navegar hacia atrás para removerla
      try {
        window.history.back();
      } catch (error) {
        console.warn('Error navegando hacia atrás:', error);
        // Fallback: cerrar directamente
        onClose();
      }
    } else {
      // Si no agregamos entrada al historial, cerrar directamente
      onClose();
    }
  };

  return { closeModal };
};

export default useModalHistory; 