import React, { useState, useEffect } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { ToastProvider } from './hooks/useToast';
import LoginView from './components/auth/LoginView';
import MobileMenu from './components/common/MobileMenu';
import TerritoriesView from './pages/TerritoriesView';
import TerritoryDetailView from './pages/TerritoryDetailView';
import LoadingSpinner from './components/common/LoadingSpinner';

// CORRECCIÓN: Usar wrappers lazy optimizados en lugar de lazy imports ⚡
import SearchModal from './components/modals/SearchModal';
import PasswordModal from './components/modals/PasswordModal';
import UpdatesModal from './components/modals/UpdatesModal';
import InstallModal from './components/modals/InstallModal';

// Importar modales lazy optimizados
import { 
  LazyStatsModal, 
  LazyAdminModal, 
  LazyReportsModal, 
  LazyProposalsModal 
} from './components/modals/LazyModals';



function AppContent() {
  const { currentUser, authLoading, proposals, logout, territories, adminEditMode, handleToggleAdminMode } = useApp();
  const [selectedTerritory, setSelectedTerritory] = useState(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [activeModal, setActiveModal] = useState(null);
  const [updateAvailable, setUpdateAvailable] = useState(false);
  
  // OPTIMIZACIÓN: Font loading state para optimizar FOUT ⚡
  const [fontsLoaded, setFontsLoaded] = useState(false);

  // OPTIMIZACIÓN: Detectar cuando Inter font se carga para aplicar clase
  useEffect(() => {
    if (typeof document !== 'undefined') {
      const checkInterFont = () => {
        if (document.fonts && document.fonts.check('1em Inter')) {
          setFontsLoaded(true);
          // Aplicar clase font-inter al body cuando esté cargada
          document.body.classList.add('font-inter');
        } else {
          // Reintentar en 100ms
          setTimeout(checkInterFont, 100);
        }
      };
      
      // Iniciar verificación cuando el documento esté listo
      if (document.readyState === 'complete') {
        checkInterFont();
      } else {
        window.addEventListener('load', checkInterFont);
      }
      
      // Timeout de seguridad - aplicar clase después de 3 segundos
      const fallbackTimeout = setTimeout(() => {
        if (!fontsLoaded) {
          setFontsLoaded(true);
          document.body.classList.add('font-inter');
        }
      }, 3000);
      
      return () => {
        window.removeEventListener('load', checkInterFont);
        clearTimeout(fallbackTimeout);
      };
    }
  }, [fontsLoaded]);

  // Restaurar territorio desde sessionStorage si la app se recargó
  useEffect(() => {
    if (currentUser && territories.length > 0 && !selectedTerritory) {
      const lastTerritoryId = sessionStorage.getItem('lastTerritoryId');
      const navigationTimestamp = sessionStorage.getItem('navigationTimestamp');
      
      if (lastTerritoryId && navigationTimestamp) {
        const timeDiff = Date.now() - parseInt(navigationTimestamp);
        // Si han pasado menos de 5 minutos, restaurar el territorio
        if (timeDiff < 5 * 60 * 1000) {
          const territory = territories.find(t => t.id === lastTerritoryId);
          if (territory) {
            setSelectedTerritory(territory);
            // Limpiar sessionStorage después de restaurar
            sessionStorage.removeItem('lastTerritoryId');
            sessionStorage.removeItem('navigationTimestamp');
          }
        } else {
          // Si ha pasado mucho tiempo, limpiar sessionStorage
          sessionStorage.removeItem('lastTerritoryId');
          sessionStorage.removeItem('navigationTimestamp');
        }
      }
    }
  }, [currentUser, territories, selectedTerritory]);

  // Manejar el botón físico de volver
  useEffect(() => {
    const handlePopState = (event) => {
      console.log('🔄 PopState detectado:', {
        selectedTerritory: !!selectedTerritory,
        activeModal,
        isMenuOpen,
        state: event.state
      });

      // PRIORIDAD 1: Si hay territorio seleccionado, volver a lista
      if (selectedTerritory) {
        console.log('✅ Cerrando territorio, volviendo a lista');
        setSelectedTerritory(null);
        event.preventDefault();
        return;
      }

      // PRIORIDAD 2: Si hay modal activo, cerrarlo
      if (activeModal) {
        console.log('✅ Cerrando modal:', activeModal);
        setActiveModal(null);
        event.preventDefault();
        return;
      }

      // PRIORIDAD 3: Si hay menú abierto, cerrarlo
      if (isMenuOpen) {
        console.log('✅ Cerrando menú');
        setIsMenuOpen(false);
        event.preventDefault();
        return;
      }

      // PRIORIDAD 4: Verificar el estado del historial para determinar acción
      const currentState = event.state;
      
      // Si tenemos un estado específico de la app, manejarlo
      if (currentState && currentState.app === 'territorios') {
        if (currentState.level === 'territory') {
          console.log('✅ Estado del historial: volviendo de territorio');
          return; // Permitir navegación normal
        }
        if (currentState.level === 'menu') {
          console.log('✅ Estado del historial: volviendo de menú');
          return; // Permitir navegación normal
        }
        if (currentState.level === 'main') {
          console.log('✅ Estado del historial: en pantalla principal');
          return; // Permitir navegación normal
        }
      }

      // PRIORIDAD 5: Solo mostrar confirmación si realmente estamos en la pantalla principal
      // y no hay nada abierto y el usuario está tratando de salir de la app
      console.log('⚠️ Usuario intentando salir de la app');
      event.preventDefault();
      
      const shouldExit = window.confirm('¿Quieres salir de la aplicación?');
      if (shouldExit) {
        // Cerrar ventana o ir a la página anterior del navegador
        if (window.history.length > 1) {
          window.history.back();
        } else {
          window.close();
        }
      } else {
        // Si no quiere salir, mantener en la misma página
        window.history.pushState({ app: 'territorios', level: 'main' }, '', window.location.href);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [activeModal, isMenuOpen, selectedTerritory]);

  // Menu items configuration
  const menuItems = [
    {
      id: 'search',
      text: 'Buscar',
      icon: 'search',
      modal: 'search',
      description: 'Buscar en todos los territorios'
    },
    {
      id: 'stats',
      text: 'Estadísticas',
      icon: 'barChart',
      modal: 'stats',
      description: 'Ver progreso y métricas'
    },
    {
      id: 'reports',
      text: 'Reportes',
      icon: 'fileText',
      modal: 'reports',
      description: 'Generar informes detallados'
    },
    {
      id: 'myProposals',
      text: 'Mis Propuestas',
      icon: 'edit',
      modal: 'proposals',
      hasBadge: true,
      badgeCount: proposals.filter(p => p.status === 'pending').length,
      description: 'Ver tus cambios propuestos'
    },
    {
      id: 'admin',
      text: 'Administración',
      icon: 'settings',
      modal: 'admin',
      hasBadge: currentUser?.role === 'admin',
      badgeCount: currentUser?.role === 'admin' ? 
        proposals.filter(p => p.status === 'pending').length : 0,
      description: 'Panel de control completo'
    },
    {
      id: 'password',
      text: 'Cambiar Contraseña',
      icon: 'key',
      modal: 'password',
      description: 'Actualizar credenciales'
    },
    {
      id: 'updates',
      text: 'Actualizaciones',
      icon: 'download',
      modal: 'updates',
      hasBadge: updateAvailable,
      badgeText: updateAvailable ? '!' : null,
      description: updateAvailable ? '¡Nueva versión disponible!' : 'Verificar nuevas versiones'
    },
    {
      id: 'install',
      text: 'Instalar App',
      icon: 'smartphone',
      modal: 'install',
      description: 'Acceso directo en tu dispositivo'
    },
    {
      id: 'logout',
      text: 'Cerrar Sesión',
      icon: 'logOut',
      isLogout: true
    }
  ];

  // Filtrar items según el rol
  const filteredMenuItems = menuItems.filter(item => {
    if (item.id === 'admin' && currentUser?.role !== 'admin') return false;
    if (item.id === 'myProposals' && currentUser?.role === 'admin') return false;
    return true;
  });

  const handleOpenModal = (modalId) => {
    setActiveModal(modalId);
    // El historial ahora lo maneja automáticamente useModalHistory
  };

  const handleCloseModal = () => {
    setActiveModal(null);
    // El historial ahora lo maneja automáticamente useModalHistory
  };

  const handleSelectTerritory = (territory, addressIdToHighlight = null) => {
    setSelectedTerritory({...territory, highlightedAddressId: addressIdToHighlight});
    // Agregar entrada específica al historial para el territorio
    window.history.pushState({ 
      app: 'territorios', 
      level: 'territory', 
      territory: territory.id,
      highlightedAddressId: addressIdToHighlight
    }, '', window.location.href);
  };

  const handleBackFromTerritory = () => {
    setSelectedTerritory(null);
    // Si el estado actual es un territorio, navegar hacia atrás
    if (window.history.state?.level === 'territory') {
      window.history.back();
    }
  };

  // Manejar apertura del menú con historial
  const handleOpenMenu = () => {
    setIsMenuOpen(true);
    // Agregar entrada al historial para el menú
    window.history.pushState({ 
      app: 'territorios', 
      level: 'menu' 
    }, '', window.location.href);
  };

  // Manejar cierre del menú
  const handleCloseMenu = () => {
    setIsMenuOpen(false);
    // Si el estado actual es menú, navegar hacia atrás
    if (window.history.state?.level === 'menu') {
      window.history.back();
    }
  };



  if (authLoading) {
    return <LoadingSpinner fullScreen />;
  }

  if (!currentUser) {
    return <LoginView />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Indicador de desarrollo */}
      {process.env.NODE_ENV === 'development' && (
        <div className="fixed top-0 left-0 right-0 bg-green-500 text-white text-center py-1 text-xs z-50">
          MODO DESARROLLO - Los cambios no afectan producción
        </div>
      )}

      {/* Vista principal */}
      {selectedTerritory ? (
        <TerritoryDetailView
          territory={selectedTerritory}
          onBack={handleBackFromTerritory}
        />
      ) : (
        <TerritoriesView
          onSelectTerritory={handleSelectTerritory}
          onOpenMenu={handleOpenMenu}
        />
      )}

      {/* Menú móvil */}
      <MobileMenu
        isOpen={isMenuOpen}
        onClose={handleCloseMenu}
        menuItems={filteredMenuItems}
        activeItem={activeModal}
        onOpenModal={handleOpenModal}
        handleLogout={logout}
      />

      {/* CORRECCIÓN: Modales sin Suspense - Ya optimizados ⚡ */}
      {activeModal === 'search' && (
        <SearchModal 
          isOpen 
          onClose={handleCloseModal} 
          onNavigateToTerritory={handleSelectTerritory}
          modalId="search-modal" 
        />
      )}
      {activeModal === 'stats' && (
        <LazyStatsModal isOpen onClose={handleCloseModal} modalId="stats-modal" />
      )}
      {activeModal === 'reports' && (
        <LazyReportsModal isOpen onClose={handleCloseModal} modalId="reports-modal" />
      )}
      {activeModal === 'admin' && currentUser?.role === 'admin' && (
        <LazyAdminModal isOpen onClose={handleCloseModal} modalId="admin-modal" />
      )}
      {activeModal === 'proposals' && currentUser?.role !== 'admin' && (
        <LazyProposalsModal isOpen onClose={handleCloseModal} modalId="proposals-modal" />
      )}
      {activeModal === 'password' && (
        <PasswordModal isOpen onClose={handleCloseModal} modalId="password-modal" />
      )}
      {activeModal === 'updates' && (
        <UpdatesModal isOpen onClose={handleCloseModal} modalId="updates-modal" />
      )}
      {activeModal === 'install' && (
        <InstallModal isOpen onClose={handleCloseModal} modalId="install-modal" />
      )}
    </div>
  );
}

function App() {
  return (
    <ToastProvider>
      <AppProvider>
        <AppContent />
      </AppProvider>
    </ToastProvider>
  );
}

export default App; 