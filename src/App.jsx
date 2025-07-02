import React, { useState, useEffect } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { ToastProvider, useToast } from './hooks/useToast';
import './utils/errorLogger'; // Inicializar el sistema de captura de errores
import LoginView from './components/auth/LoginView';
import MobileMenu from './components/common/MobileMenu';
import TerritoriesView from './pages/TerritoriesView';
import TerritoryDetailView from './pages/TerritoryDetailView';
import MyProposalsView from './pages/MyProposalsView';
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
  LazyReportsModal
} from './components/modals/LazyModals';
import SystemReportsModal from './components/modals/SystemReportsModal';



function AppContent() {
  const { currentUser, authLoading, proposals, logout, territories, adminEditMode, handleToggleAdminMode } = useApp();
  const { showToast } = useToast();
  const [selectedTerritory, setSelectedTerritory] = useState(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [activeModal, setActiveModal] = useState(null);
  const [showMyProposals, setShowMyProposals] = useState(false);
  
  // OPTIMIZACIÓN: Font loading state para optimizar FOUT ⚡
  const [fontsLoaded, setFontsLoaded] = useState(false);

  // Sistema de notificaciones para propuestas
  const getUnseenProposalsCount = () => {
    if (!currentUser || currentUser.role === 'admin') return 0;
    
    const userProposals = proposals.filter(p => 
      p.proposedBy === currentUser.id || p.proposedByName === currentUser.name
    );
    const lastViewedTimestamp = localStorage.getItem(`lastProposalsView_${currentUser.id}`);
    
    if (!lastViewedTimestamp) return userProposals.length;
    
    const lastViewed = new Date(lastViewedTimestamp);
    return userProposals.filter(p => {
      const proposalDate = p.createdAt?.toDate?.() || new Date(p.createdAt);
      return proposalDate > lastViewed;
    }).length;
  };

  // Sistema de Service Worker ESTABLE - Sin bucles
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      const registerSW = async () => {
        try {
          console.log('🚀 Registrando Service Worker v2.25.12...');
          
          const registration = await navigator.serviceWorker.register('/sw.js', {
            scope: '/',
            updateViaCache: 'none'
          });
          
          console.log('✅ SW registrado correctamente:', registration.scope);
          
          // Solo escuchar updatefound, sin forzar actualizaciones
          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;
            console.log('🔄 SW: Nueva versión detectada');
            
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                console.log('✨ SW: Nueva versión lista');
                showToast('Nueva versión disponible. Recarga para actualizar.', 'info', { duration: 10000 });
              }
            });
          });
          
        } catch (error) {
          console.error('❌ SW: Error en registro:', error);
        }
      };

      // Registrar solo una vez cuando la página esté cargada
      if (document.readyState === 'complete') {
      registerSW();
      } else {
        window.addEventListener('load', registerSW, { once: true });
      }
    }
  }, [showToast]);

  // Función simplificada para limpiar cache
  const handleClearCache = () => {
    if ('caches' in window) {
      caches.keys().then(cacheNames => {
        Promise.all(cacheNames.map(cacheName => caches.delete(cacheName)))
          .then(() => {
            showToast('Cache limpiado correctamente', 'success');
            setTimeout(() => window.location.reload(), 1000);
          });
      });
    } else {
      window.location.reload();
    }
  };

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
        state: event.state,
        currentURL: window.location.href
      });

      // PRIORIDAD 1: Si hay vista de propuestas abierta, volver a lista
      if (showMyProposals) {
        console.log('✅ Cerrando mis propuestas, volviendo a lista');
        setShowMyProposals(false);
        event.preventDefault();
        return;
      }

      // PRIORIDAD 2: Si hay territorio seleccionado, volver a lista
      if (selectedTerritory) {
        console.log('✅ Cerrando territorio, volviendo a lista');
        setSelectedTerritory(null);
        event.preventDefault();
        return;
      }

      // PRIORIDAD 3: Si hay modal activo, cerrarlo
      if (activeModal) {
        console.log(`🔙 Botón físico de volver - Cerrando modal: ${activeModal}`);
        setActiveModal(null);
        event.preventDefault();
        return;
      }

      // PRIORIDAD 4: Si hay menú abierto, cerrarlo
      if (isMenuOpen) {
        console.log('✅ Cerrando menú');
        setIsMenuOpen(false);
        event.preventDefault();
        return;
      }

      // PRIORIDAD 5: Verificar el estado del historial para determinar acción
      const currentState = event.state;
      
      // Si tenemos un estado específico de la app, manejarlo
      if (currentState && currentState.app === 'territorios') {
        if (currentState.level === 'territory') {
          return; // Permitir navegación normal
        }
        if (currentState.level === 'proposals') {
          return; // Permitir navegación normal
        }
        if (currentState.level === 'menu') {
          return; // Permitir navegación normal
        }
        if (currentState.level === 'main') {
          return; // Permitir navegación normal
        }
      }

      // PRIORIDAD 6: Si hay historial disponible, permitir navegación normal  
      if (window.history.length > 1) {
        return; // Permitir navegación normal hacia atrás
      }

      // PRIORIDAD 7: Solo mostrar confirmación si realmente no hay a dónde volver
      event.preventDefault();
      
      const shouldExit = window.confirm('¿Quieres salir de la aplicación?');
      if (shouldExit) {
        // Cerrar ventana
        window.close();
      } else {
        // Si no quiere salir, mantener en la misma página
        window.history.pushState({ app: 'territorios', level: 'main' }, '', window.location.href);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [activeModal, isMenuOpen, selectedTerritory, showMyProposals]);

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
      id: 'myProposals',
      text: 'Mis Propuestas',
      icon: 'edit',
      view: 'proposals',
      hasBadge: true,
      badgeCount: getUnseenProposalsCount(),
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
      id: 'systemReports',
      text: 'Reportes del Sistema',
      icon: 'chart-line',
      modal: 'systemReports',
      description: 'Ver métricas técnicas y diagnósticos'
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
    if (item.adminOnly && currentUser?.role !== 'admin') return false; // Filtrar items solo para admin
    return true;
  });

  const handleOpenModal = (modalId) => {
    // 🔍 LOGS DE DEBUG DETALLADOS
    console.log('🚀 handleOpenModal called with:', modalId);
    console.log('🔍 Menu item clicked, modalId type:', typeof modalId);
    console.log('📋 All available menu items:', filteredMenuItems.map(item => ({ id: item.id, view: item.view, modal: item.modal })));
    
    // CERRAR EL MENÚ cuando se abre cualquier modal
    if (isMenuOpen) {
      console.log('🔐 Cerrando menú...');
      setIsMenuOpen(false);
    }
    
    // Manejar navegación a vistas especiales
    if (modalId === 'proposals') {
      console.log('✅ Detectado modalId "proposals", ejecutando handleOpenMyProposals...');
      handleOpenMyProposals();
      return;
    }
    
    console.log('🎯 Setting activeModal to:', modalId);
    setActiveModal(modalId);
    // El historial ahora lo maneja automáticamente useModalHistory
  };

  const handleCloseModal = () => {
    console.log('🔙 handleCloseModal called');
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

  const handleOpenMyProposals = () => {
    console.log('🎉 handleOpenMyProposals ejecutándose...');
    console.log('👤 Current user:', currentUser?.name, currentUser?.id);
    console.log('📊 Show my proposals state before:', showMyProposals);
    
    setShowMyProposals(true);
    
    console.log('📊 Show my proposals state after:', true);
    
    // Marcar como visto al abrir
    if (currentUser) {
      const key = `lastProposalsView_${currentUser.id}`;
      const timestamp = new Date().toISOString();
      localStorage.setItem(key, timestamp);
      console.log('💾 Saved to localStorage:', key, timestamp);
    }
    // Agregar entrada específica al historial
    window.history.pushState({ 
      app: 'territorios', 
      level: 'proposals'
    }, '', window.location.href);
    console.log('📈 History state pushed');
  };

  const handleBackFromMyProposals = () => {
    setShowMyProposals(false);
    // Si el estado actual es propuestas, navegar hacia atrás
    if (window.history.state?.level === 'proposals') {
      window.history.back();
    }
  };

  // Manejar apertura del menú
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

  // 🔍 DEBUG LOG - Estado de renderizado
  console.log('🖼️ App render state:', {
    showMyProposals,
    selectedTerritory: !!selectedTerritory,
    activeModal,
    isMenuOpen
  });

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Indicador de desarrollo */}
      {process.env.NODE_ENV === 'development' && (
        <div className="fixed top-0 left-0 right-0 bg-green-500 text-white text-center py-1 text-xs z-50">
          MODO DESARROLLO - Los cambios no afectan producción
        </div>
      )}

      {/* Vista principal */}
      {showMyProposals ? (
        <>
          {console.log('✅ Rendering MyProposalsView')}
          <MyProposalsView
            onBack={handleBackFromMyProposals}
          />
        </>
      ) : selectedTerritory ? (
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

      {activeModal === 'admin' && currentUser?.role === 'admin' && (
        <LazyAdminModal isOpen onClose={handleCloseModal} modalId="admin-modal" />
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
      {activeModal === 'systemReports' && (
        <SystemReportsModal isOpen onClose={handleCloseModal} modalId="system-reports-modal" />
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