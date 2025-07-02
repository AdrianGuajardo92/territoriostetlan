import React, { useState, useEffect } from 'react';
import { useTouchGestures } from '../../hooks/useTouchGestures';
import { DeviceDetector } from '../../utils/mobileOptimizer';
import Icon from './Icon';

// 📱 FASE 2: Navegación móvil optimizada con gestos
const MobileNavigation = ({ 
  currentView, 
  onNavigate, 
  onBack, 
  title, 
  showBack = false,
  actions = [] 
}) => {
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const deviceInfo = DeviceDetector.getDeviceInfo();

  // 👆 Configurar gestos táctiles
  const touchGestures = useTouchGestures({
    onSwipeRight: () => {
      if (showBack && onBack) {
        onBack();
      }
    },
    onSwipeDown: () => {
      setIsVisible(true);
    },
    onSwipeUp: () => {
      setIsVisible(false);
    },
    swipeThreshold: 30
  });

  // 📱 Auto-hide en scroll (solo móviles)
  useEffect(() => {
    if (!deviceInfo.isMobile) return;

    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      const scrollingDown = currentScrollY > lastScrollY;
      const scrolledEnough = Math.abs(currentScrollY - lastScrollY) > 10;

      if (scrolledEnough) {
        setIsVisible(!scrollingDown || currentScrollY < 100);
      }

      setLastScrollY(currentScrollY);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollY, deviceInfo.isMobile]);

  // 🎯 Estilos adaptativos
  const getNavigationStyles = () => {
    const baseStyles = `
      fixed top-0 left-0 right-0 z-50 
      bg-white/95 backdrop-blur-md border-b border-gray-200
      transition-transform duration-300 ease-out
    `;

    const visibilityStyles = isVisible 
      ? 'transform translate-y-0' 
      : 'transform -translate-y-full';

    // Ajustes específicos para iOS
    const iosStyles = deviceInfo.isIOS 
      ? 'pt-safe-area-inset-top' 
      : '';

    return `${baseStyles} ${visibilityStyles} ${iosStyles}`;
  };

  return (
    <nav 
      ref={touchGestures.ref}
      className={getNavigationStyles()}
      style={{
        height: deviceInfo.isIOS ? '88px' : '64px', // Altura adaptativa
        paddingTop: deviceInfo.isIOS ? 'env(safe-area-inset-top)' : '0'
      }}
    >
      <div className="flex items-center justify-between h-16 px-4">
        {/* 👈 Botón de retroceso */}
        {showBack && (
          <button
            onClick={onBack}
            className="flex items-center justify-center w-10 h-10 rounded-full 
                     bg-gray-100 hover:bg-gray-200 active:bg-gray-300
                     transition-colors duration-150 touch-manipulation"
            style={{ 
              minWidth: '44px', 
              minHeight: '44px' // Tamaño mínimo para touch
            }}
          >
            <Icon name="chevronLeft" size={20} className="text-gray-700" />
          </button>
        )}

        {/* 📱 Título adaptativo */}
        <div className="flex-1 mx-4">
          <h1 className="text-lg font-semibold text-gray-900 text-center truncate">
            {title}
          </h1>
          
          {/* 📊 Indicador de conectividad */}
          <div className="flex items-center justify-center mt-1">
            <ConnectionIndicator />
          </div>
        </div>

        {/* ⚡ Acciones rápidas */}
        <div className="flex items-center space-x-2">
          {actions.map((action, index) => (
            <button
              key={index}
              onClick={action.onPress}
              className="flex items-center justify-center w-10 h-10 rounded-full
                       bg-blue-500 hover:bg-blue-600 active:bg-blue-700
                       text-white transition-colors duration-150 touch-manipulation"
              style={{ 
                minWidth: '44px', 
                minHeight: '44px'
              }}
            >
              <Icon name={action.icon} size={20} />
            </button>
          ))}
        </div>
      </div>

      {/* 📱 Indicador de gestos (solo primera vez) */}
      <GestureHint visible={showBack} />
    </nav>
  );
};

// 📡 Indicador de conectividad móvil
const ConnectionIndicator = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [connectionType, setConnectionType] = useState('unknown');

  useEffect(() => {
    const updateOnlineStatus = () => setIsOnline(navigator.onLine);
    const updateConnectionType = () => {
      const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
      if (connection) {
        setConnectionType(connection.effectiveType || 'unknown');
      }
    };

    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);
    
    if (navigator.connection) {
      navigator.connection.addEventListener('change', updateConnectionType);
    }

    updateConnectionType();

    return () => {
      window.removeEventListener('online', updateOnlineStatus);
      window.removeEventListener('offline', updateOnlineStatus);
      if (navigator.connection) {
        navigator.connection.removeEventListener('change', updateConnectionType);
      }
    };
  }, []);

  const getConnectionColor = () => {
    if (!isOnline) return 'bg-red-500';
    switch (connectionType) {
      case 'slow-2g':
      case '2g': return 'bg-red-400';
      case '3g': return 'bg-yellow-400';
      case '4g': return 'bg-green-400';
      default: return 'bg-green-500';
    }
  };

  return (
    <div className="flex items-center space-x-1">
      <div 
        className={`w-2 h-2 rounded-full ${getConnectionColor()}`}
        title={isOnline ? `Conectado (${connectionType})` : 'Sin conexión'}
      />
      {!isOnline && (
        <span className="text-xs text-red-600 font-medium">
          Offline
        </span>
      )}
    </div>
  );
};

// 💡 Hint de gestos para nuevos usuarios
const GestureHint = ({ visible }) => {
  const [showHint, setShowHint] = useState(false);

  useEffect(() => {
    const hasSeenHint = localStorage.getItem('mobileGestureHint');
    if (!hasSeenHint && visible) {
      setShowHint(true);
      // Auto-hide después de 3 segundos
      setTimeout(() => {
        setShowHint(false);
        localStorage.setItem('mobileGestureHint', 'true');
      }, 3000);
    }
  }, [visible]);

  if (!showHint) return null;

  return (
    <div className="absolute top-full left-4 right-4 mt-2 p-3 
                   bg-blue-50 border border-blue-200 rounded-lg
                   animate-fade-in">
      <div className="flex items-center space-x-2">
        <Icon name="hand" size={16} className="text-blue-600" />
        <span className="text-sm text-blue-700">
          Desliza hacia la derecha para volver
        </span>
      </div>
    </div>
  );
};

export default MobileNavigation; 