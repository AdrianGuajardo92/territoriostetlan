import React from 'react';
import Icon from './Icon';

const ConfirmDialog = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  type = 'warning' // warning, danger, info
}) => {
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
    }
  };

  const config = typeConfig[type] || typeConfig.warning;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 transition-opacity"
        onClick={onClose}
      />
      
      {/* Dialog */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full transform transition-all animate-bounce-in">
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
                onClick={onClose}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
              >
                {cancelText}
              </button>
              <button
                onClick={() => {
                  onConfirm();
                  onClose();
                }}
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