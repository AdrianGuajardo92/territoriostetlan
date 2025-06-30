import React, { useEffect } from 'react';
import Icon from './Icon';

const Modal = ({ 
  isOpen, 
  onClose, 
  title, 
  children, 
  size = 'md', // sm, md, lg, xl, 2xl, full
  showCloseButton = true,
  closeOnBackdrop = true,
  closeOnEscape = true 
}) => {
  // Manejar tecla Escape
  useEffect(() => {
    if (!isOpen || !closeOnEscape) return;
    
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose, closeOnEscape]);

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
    full: 'w-full h-full max-w-none'
  };

  // Configuración especial para modal full screen
  const isFullScreen = size === 'full';

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 transition-opacity animate-fade-in"
        onClick={closeOnBackdrop ? onClose : undefined}
      />
      
      {/* Modal */}
      <div className={`fixed inset-0 z-50 ${isFullScreen ? '' : 'flex items-center justify-center p-4'} pointer-events-none`}>
        <div className={`
          bg-white shadow-2xl w-full transform transition-all animate-bounce-in pointer-events-auto
          ${isFullScreen 
            ? 'h-full w-full rounded-none' 
            : `${sizeClasses[size]} rounded-3xl max-h-[85vh] sm:max-h-[90vh]`
          } 
          flex flex-col
        `}>
          {/* Header - Solo para modales no full screen o con título explícito */}
          {(title || showCloseButton) && !isFullScreen && (
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              {title && (
                <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
              )}
              {showCloseButton && (
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors ml-auto"
                  aria-label="Cerrar"
                >
                  <Icon name="x" size={20} className="text-gray-500" />
                </button>
              )}
            </div>
          )}
          
          {/* Content */}
          <div className={`flex-1 ${isFullScreen ? 'h-full' : 'overflow-hidden'}`}>
            {children}
          </div>
        </div>
      </div>
    </>
  );
};

export default Modal; 