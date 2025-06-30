import { useEffect, useRef } from 'react';

/**
 * Hook personalizado para manejar el historial del navegador en modales
 * Versión de emergencia que prioriza el funcionamiento normal de los modales
 */
export const useModalHistory = (isOpen, onClose, modalId = 'modal') => {
  const hasAddedHistoryRef = useRef(false);

  useEffect(() => {
    if (isOpen) {
      // Solo agregar al historial si no se ha hecho antes
      if (!hasAddedHistoryRef.current) {
        try {
          window.history.pushState({ modalOpen: true, modalId }, '', window.location.href);
          hasAddedHistoryRef.current = true;
          console.log(`📱 Modal abierto: ${modalId}`);
        } catch (error) {
          console.warn('Error agregando al historial:', error);
        }
      }

      // Listener para el botón de volver
      const handlePopState = () => {
        try {
          console.log(`📱 Botón volver presionado - Cerrando modal: ${modalId}`);
          onClose();
        } catch (error) {
          console.error('Error cerrando modal:', error);
        }
      };

      window.addEventListener('popstate', handlePopState);

      return () => {
        window.removeEventListener('popstate', handlePopState);
      };
    } else {
      // Resetear cuando se cierra el modal
      hasAddedHistoryRef.current = false;
    }
  }, [isOpen, onClose, modalId]);

  // VERSIÓN DE EMERGENCIA: Retornar directamente onClose para compatibilidad total
  const closeModal = onClose;

  return { closeModal };
};

export default useModalHistory; 