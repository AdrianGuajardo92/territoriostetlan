import React, { useEffect, useState, useCallback, useRef } from 'react';
import Icon from './Icon';
import { useBackHandler } from '../../hooks/useBackHandler';

const ANIM_DURATION = 250; // ms - duración de la animación de salida

const Modal = ({
  isOpen,
  onClose,
  title,
  children,
  size = 'md',
  showCloseButton = true,
  closeOnBackdrop = true,
  closeOnEscape = true,
  modalId = 'modal',
  animation = 'fade-scale'
}) => {
  // shouldRender: controla si el DOM del modal existe
  // closing: controla la clase de animación de salida
  const [shouldRender, setShouldRender] = useState(false);
  const [closing, setClosing] = useState(false);
  const closingTimerRef = useRef(null);

  useBackHandler({ isOpen, onClose, id: modalId });
  const handleClose = onClose;

  // Detectar cambios en isOpen para animar entrada/salida
  useEffect(() => {
    if (isOpen) {
      // Abrir: montar inmediatamente
      setShouldRender(true);
      setClosing(false);
      if (closingTimerRef.current) {
        clearTimeout(closingTimerRef.current);
        closingTimerRef.current = null;
      }
    } else if (shouldRender && !closing) {
      // Cerrar: activar animación de salida, luego desmontar
      setClosing(true);
      closingTimerRef.current = setTimeout(() => {
        setClosing(false);
        setShouldRender(false);
        closingTimerRef.current = null;
      }, ANIM_DURATION);
    }
  }, [isOpen]); // Solo depende de isOpen

  // Cleanup del timer al desmontar
  useEffect(() => {
    return () => {
      if (closingTimerRef.current) {
        clearTimeout(closingTimerRef.current);
      }
    };
  }, []);

  // Manejar tecla Escape
  useEffect(() => {
    if (!shouldRender || !closeOnEscape) return;

    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        handleClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [shouldRender, handleClose, closeOnEscape]);

  // Prevenir scroll del body
  useEffect(() => {
    if (shouldRender) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [shouldRender]);

  // No renderizar si no debemos
  if (!shouldRender) return null;

  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
    '2xl': 'max-w-6xl',
    full: 'w-full h-full max-w-none',
    'responsive-large': 'w-full h-full max-w-none sm:max-w-5xl sm:max-h-[90vh] sm:h-auto'
  };

  const isFullScreen = size === 'full';
  const isResponsiveLarge = size === 'responsive-large';

  // Clase de animación: entrada o salida
  const getAnimationClass = () => {
    if (animation === 'slide-left') {
      return closing ? 'modal-slide-left-exit' : 'modal-slide-left';
    }
    return closing ? 'modal-fade-scale-exit' : 'modal-fade-scale';
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black/50 backdrop-blur-sm z-[9998] ${closing ? 'modal-backdrop-exit' : 'modal-backdrop'}`}
        onClick={closeOnBackdrop ? handleClose : undefined}
      />

      {/* Modal */}
      <div className={`fixed inset-0 z-[9999] ${isFullScreen ? '' : isResponsiveLarge ? 'p-0 sm:flex sm:items-center sm:justify-center sm:p-4' : 'flex items-center justify-center p-4'} pointer-events-none`}>
        <div className={`
          bg-white shadow-2xl w-full transform pointer-events-auto ${getAnimationClass()}
          ${isFullScreen
            ? 'h-full w-full rounded-none'
            : isResponsiveLarge
              ? 'h-full w-full rounded-none sm:rounded-3xl sm:max-h-[90vh] sm:h-auto sm:max-w-5xl overflow-hidden'
              : `${sizeClasses[size]} rounded-3xl max-h-[85vh] sm:max-h-[90vh] overflow-hidden`
          }
          flex flex-col
        `}>
          {/* Header */}
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
