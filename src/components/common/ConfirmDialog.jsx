import React from 'react';
import Icon from './Icon';
import { useModalHistory } from '../../hooks/useModalHistory';

const ConfirmDialog = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  type = 'warning', // warning, danger, info, success
  modalId = 'confirm-dialog' // ID único para el historial
}) => {
  // Hook para manejar historial del navegador consistentemente
  const { closeModal } = useModalHistory(isOpen, onClose, modalId);

  if (!isOpen) return null;

  const typeConfig = {
    warning: {
      icon: 'alertCircle',
      iconColor: 'text-yellow-500',
      iconBg: 'bg-yellow-100',
      confirmButton: 'bg-yellow-600 hover:bg-yellow-700'
    },
    danger: {
      icon: 'alertCircle',
      iconColor: 'text-red-500',
      iconBg: 'bg-red-100',
      confirmButton: 'bg-red-600 hover:bg-red-700'
    },
    info: {
      icon: 'info',
      iconColor: 'text-blue-500',
      iconBg: 'bg-blue-100',
      confirmButton: 'bg-blue-600 hover:bg-blue-700'
    },
    success: {
      icon: 'checkCircle',
      iconColor: 'text-green-500',
      iconBg: 'bg-green-100',
      confirmButton: 'bg-green-600 hover:bg-green-700'
    }
  };

  const config = typeConfig[type] || typeConfig.warning;

  const handleConfirm = () => {
    onConfirm();
    closeModal();
  };

  return (
    <>
      {/* Backdrop con animación suave */}
      <div 
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 modal-backdrop"
        onClick={closeModal}
      />
      
      {/* Dialog con animación Fade + Scale */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full transform pointer-events-auto modal-fade-scale">
          <div className="p-6">
            {/* Icon */}
            <div className={`w-12 h-12 ${config.iconBg} rounded-full flex items-center justify-center mx-auto mb-4`}>
              <Icon name={config.icon} size={24} className={config.iconColor} />
            </div>
            
            {/* Content */}
            <h3 className="text-lg font-semibold text-gray-900 text-center mb-2">
              {title}
            </h3>
            <p className="text-gray-600 text-center mb-6">
              {message}
            </p>
            
            {/* Actions */}
            <div className="flex space-x-3">
              <button
                onClick={closeModal}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
              >
                {cancelText}
              </button>
              <button
                onClick={handleConfirm}
                className={`flex-1 px-4 py-2 ${config.confirmButton} text-white rounded-lg transition-colors font-medium shadow-sm`}
              >
                {confirmText}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default ConfirmDialog; 