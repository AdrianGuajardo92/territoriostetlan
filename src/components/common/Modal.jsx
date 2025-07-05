import React, { useEffect } from 'react';
import Icon from './Icon';
import { useModalHistory } from '../../hooks/useModalHistory';

const Modal = ({ 
  isOpen, 
  onClose, 
  title, 
  children, 
  size = 'md', // sm, md, lg, xl, 2xl, full
  showCloseButton = true,
  closeOnBackdrop = true,
  closeOnEscape = true,
  modalId = 'modal' // ID único para identificar el modal en el historial
}) => {
  // Hook para manejar historial del navegador consistentemente
  const { closeModal } = useModalHistory(isOpen, onClose, modalId);

  // Función que maneja el cierre (usa closeModal para consistencia pero mantiene onClose como fallback)
  const handleClose = closeModal || onClose;

  // Manejar tecla Escape
  useEffect(() => {
    if (!isOpen || !closeOnEscape) return;
    
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        handleClose();
      }
    };
    
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, handleClose, closeOnEscape]);

  // Prevenir scroll del body cuando el modal está abierto
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
    '2xl': 'max-w-6xl',
    full: 'w-full h-full max-w-none',
    // Opción B: Pantalla completa en móviles, más grande en desktop
    'responsive-large': 'w-full h-full max-w-none sm:max-w-5xl sm:max-h-[90vh] sm:h-auto'
  };

  // Configuración especial para modal full screen
  const isFullScreen = size === 'full';
  const isResponsiveLarge = size === 'responsive-large';

  return (
    <>
      {/* Backdrop con animación suave */}
      <div 
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9998] transition-opacity modal-backdrop"
        onClick={closeOnBackdrop ? handleClose : undefined}
      />
      
      {/* Modal con animación Fade + Scale */}
      <div className={`fixed inset-0 z-[9999] ${isFullScreen ? '' : isResponsiveLarge ? 'p-0 sm:flex sm:items-center sm:justify-center sm:p-4' : 'flex items-center justify-center p-4'} pointer-events-none`}>
        <div className={`
          bg-white shadow-2xl w-full transform pointer-events-auto modal-fade-scale
          ${isFullScreen 
            ? 'h-full w-full rounded-none' 
            : isResponsiveLarge 
              ? 'h-full w-full rounded-none sm:rounded-3xl sm:max-h-[90vh] sm:h-auto sm:max-w-5xl'
              : `${sizeClasses[size]} rounded-3xl max-h-[85vh] sm:max-h-[90vh]`
          } 
          flex flex-col
        `}>
          {/* Header - Solo para modales no full screen o con título explícito */}
          {(title || showCloseButton) && !isFullScreen && !isResponsiveLarge && (
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              {title && (
                <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
              )}
              {showCloseButton && (
                <button
                  onClick={handleClose}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors ml-auto"
                  aria-label="Cerrar"
                >
                  <Icon name="x" size={20} className="text-gray-500" />
                </button>
              )}
            </div>
          )}
          
          {/* Content */}
          <div className={`flex-1 ${isFullScreen || isResponsiveLarge ? 'h-full' : 'overflow-hidden'}`}>
            {children}
          </div>
        </div>
      </div>
    </>
  );
};

export default Modal; 