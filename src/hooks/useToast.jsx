import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

// Contexto simple y robusto
const ToastContext = createContext(undefined);

// Hook principal con fallback completo
export const useToast = () => {
  try {
    const context = useContext(ToastContext);
    if (context === undefined) {
      // Fallback seguro sin throw
      console.warn('useToast: No ToastProvider encontrado, usando fallback');
      return {
        showToast: (message, type = 'info') => {
          console.log(`[Toast Fallback] ${type.toUpperCase()}: ${message}`);
        },
        removeToast: () => {}
      };
    }
    return context;
  } catch (error) {
    console.error('Error en useToast:', error);
    // Fallback de emergencia
    return {
      showToast: (message, type = 'info') => {
        console.log(`[Toast Emergency] ${type.toUpperCase()}: ${message}`);
      },
      removeToast: () => {}
    };
  }
};

// Provider ultra-simplificado
export const ToastProvider = ({ children }) => {
  // Estado inicial vacío
  const [toasts, setToasts] = useState([]);

  // Función para mostrar toast
  const showToast = useCallback((message, type = 'info', duration = 3000) => {
    if (!message) return;
    
    try {
      const id = `toast_${Date.now()}_${Math.random()}`;
      const newToast = {
        id,
        message: String(message),
        type: String(type),
        createdAt: Date.now()
      };

      // Actualizar estado de forma segura
      setToasts(currentToasts => {
        const validToasts = Array.isArray(currentToasts) ? currentToasts : [];
        const filteredToasts = validToasts.slice(-2); // Máximo 3 toasts
        return [...filteredToasts, newToast];
      });

      // Auto-remover
      setTimeout(() => {
        setToasts(currentToasts => {
          const validToasts = Array.isArray(currentToasts) ? currentToasts : [];
          return validToasts.filter(t => t.id !== id);
        });
      }, duration);

    } catch (error) {
      console.error('Error en showToast:', error);
      // Fallback a console
      console.log(`[Toast Error Fallback] ${type}: ${message}`);
    }
  }, []);

  // Función para remover toast
  const removeToast = useCallback((id) => {
    try {
      setToasts(currentToasts => {
        const validToasts = Array.isArray(currentToasts) ? currentToasts : [];
        return validToasts.filter(t => t.id !== id);
      });
    } catch (error) {
      console.error('Error en removeToast:', error);
    }
  }, []);

  // Valor del contexto
  const contextValue = {
    showToast,
    removeToast
  };

  return (
    <ToastContext.Provider value={contextValue}>
      {children}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </ToastContext.Provider>
  );
};

// Contenedor de toasts
const ToastContainer = ({ toasts, onRemove }) => {
  const validToasts = Array.isArray(toasts) ? toasts : [];

  if (validToasts.length === 0) {
    return null;
  }

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2 pointer-events-none">
      {validToasts.map(toast => (
        <ToastItem
          key={toast.id}
          toast={toast}
          onRemove={onRemove}
        />
      ))}
    </div>
  );
};

// Componente individual de toast
const ToastItem = ({ toast, onRemove }) => {
  const { id, message, type } = toast;

  // Auto-remover después de mostrar
  useEffect(() => {
    const timer = setTimeout(() => {
      if (onRemove) {
        onRemove(id);
      }
    }, 3000);

    return () => clearTimeout(timer);
  }, [id, onRemove]);

  // Configuración de estilos por tipo
  const getStyles = (toastType) => {
    switch (toastType) {
      case 'success':
        return {
          bg: 'bg-green-500',
          icon: '✓'
        };
      case 'error':
        return {
          bg: 'bg-red-500',
          icon: '✕'
        };
      case 'warning':
        return {
          bg: 'bg-yellow-500',
          icon: '⚠'
        };
      default:
        return {
          bg: 'bg-blue-500',
          icon: 'ℹ'
        };
    }
  };

  const styles = getStyles(type);

  return (
    <div className={`${styles.bg} text-white px-4 py-3 rounded-lg shadow-lg flex items-center space-x-3 min-w-[300px] max-w-md pointer-events-auto animate-slide-in-from-right`}>
      <span className="text-lg font-bold">{styles.icon}</span>
      <span className="flex-1 text-sm font-medium">{message}</span>
      <button
        onClick={() => onRemove(id)}
        className="text-white/80 hover:text-white text-lg leading-none"
        type="button"
        aria-label="Cerrar"
      >
        ×
      </button>
    </div>
  );
}; 