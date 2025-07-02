import React, { createContext, useContext, useState, useCallback } from 'react';

// Contexto simple
const ToastContext = createContext(null);

// Hook simplificado
export const useToast = () => {
  const context = useContext(ToastContext);
  
  if (!context) {
    // Fallback simple que siempre funciona
    return {
      showToast: (message, type = 'info') => {
        console.log(`[Toast] ${type.toUpperCase()}: ${message}`);
      },
      removeToast: () => {}
    };
  }
  
  return context;
};

// Provider ultra-simple
export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const showToast = useCallback((message, type = 'info') => {
    const id = Date.now();
    const newToast = { id, message, type };
    
    setToasts(prev => [...prev.slice(-2), newToast]);
    
    // Auto-remover después de 3 segundos
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3000);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast, removeToast }}>
      {children}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </ToastContext.Provider>
  );
};

// Contenedor simple
const ToastContainer = ({ toasts, onRemove }) => {
  if (!toasts || toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2">
      {toasts.map(toast => (
        <ToastItem key={toast.id} toast={toast} onRemove={onRemove} />
      ))}
    </div>
  );
};

// Toast individual
const ToastItem = ({ toast, onRemove }) => {
  const { id, message, type } = toast;

  const getStyles = () => {
    switch (type) {
      case 'success': return 'bg-green-500';
      case 'error': return 'bg-red-500';
      case 'warning': return 'bg-yellow-500';
      default: return 'bg-blue-500';
    }
  };

  return (
    <div className={`${getStyles()} text-white px-4 py-3 rounded-lg shadow-lg flex items-center justify-between min-w-[300px]`}>
      <span className="text-sm">{message}</span>
      <button
        onClick={() => onRemove(id)}
        className="ml-4 text-white/80 hover:text-white"
      >
        ×
      </button>
    </div>
  );
}; 