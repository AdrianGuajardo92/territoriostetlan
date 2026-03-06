import React, { useState, useEffect, useRef } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { ToastProvider, useToast } from './hooks/useToast';
import './utils/errorLogger'; // Inicializar el sistema de captura de errores
import LoginView from './components/auth/LoginView';
import BootScreen from './components/common/BootScreen';
import MobileMenu from './components/common/MobileMenu';
import { markBoot } from './utils/bootMetrics';
// import { UpdateNotification } from './components/common/UpdateNotification'; // 🔧 TEMPORALMENTE DESACTIVADO

// 🚀 PÁGINAS LAZY - CODE SPLITTING MÍTICO 100% ⚡
import { 
  LazyTerritoriesView,
  LazyTerritoryDetailView,
  LazyMyProposalsView,
  LazyMyStudiesAndRevisitsView,
  preloadPrimaryViews
} from './components/modals/LazyModals';

// CORRECCIÓN: Usar wrappers lazy optimizados en lugar de lazy imports ⚡
import { LazyPasswordModal as PasswordModal } from './components/modals/LazyModals';

// Importar modales lazy optimizados
import {
  LazyStatsModal,
  LazyAdminModal,
  LazySearchModal,
  LazyInstallModal,
  LazyUpdatesModal
} from './components/modals/LazyModals';



function AppContent() {
  const { 
    currentUser, 
    authLoading, 
    bootstrap,
    territoriesLoading,
    addressesLoading,
    interactiveReady,
    secondaryDataLoading,
    logout, 
    territories, 
    retryBootstrap,
    userNotificationsCount, // ✅ NUEVO: Contador de notificaciones del usuario
    pendingProposalsCount // ✅ NUEVO: Contador de propuestas pendientes para admin
  } = useApp();
  const { showToast } = useToast();
  const hasMarkedTerritoriesPaintRef = useRef(false);
  const [selectedTerritory, setSelectedTerritory] = useState(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [activeModal, setActiveModal] = useState(null);
  const [showMyProposals, setShowMyProposals] = useState(false);
  const [showMyStudiesAndRevisits, setShowMyStudiesAndRevisits] = useState(false);
  const [primaryViewsReady, setPrimaryViewsReady] = useState(false);
  
  // OPTIMIZACIÓN: Font loading state para optimizar FOUT ⚡
  const [fontsLoaded, setFontsLoaded] = useState(false);
  
  // Detectar si la aplicación está instalada
  const [isAppInstalled, setIsAppInstalled] = useState(
    () => window.matchMedia('(display-mode: standalone)').matches
  );



  // 🔧 TEMPORALMENTE DESACTIVADO PARA TESTING
  // Sistema de Service Worker ESTABLE - Sin bucles
  // useEffect(() => {
  //   if ('serviceWorker' in navigator) {
  //     const registerSW = async () => {
  //       try {
    
          
  //         const registration = await navigator.serviceWorker.register('/sw.js', {
  //           scope: '/',
  //           updateViaCache: 'none'
  //         });
          
          
          
  //         // Solo escuchar updatefound, sin forzar actualizaciones
  //         registration.addEventListener('updatefound', () => {
  //           const newWorker = registration.installing;
            
            
  //           newWorker.addEventListener('statechange', () => {
  //             if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
  //               console.log('✨ SW: Nueva versión lista');
  //               showToast('Nueva versión disponible. Recarga para actualizar.', 'info', { duration: 10000 });
  //             }
  //           });
  //         });
          
  //       } catch (error) {
  //         console.error('❌ SW: Error en registro:', error);
  //       }
  //     };

  //     // Registrar solo una vez cuando la página esté cargada
  //     if (document.readyState === 'complete') {
  //     registerSW();
  //     } else {
  //       window.addEventListener('load', registerSW, { once: true });
  //     }
  //   }
  // }, [showToast]);

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

  // Detectar cambios en el estado de instalación de la app
  useEffect(() => {
    const mediaQuery = window.matchMedia('(display-mode: standalone)');
    const handleChange = () => setIsAppInstalled(mediaQuery.matches);
    
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

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
      // PRIORIDAD 1: Si hay vista de revisitas y estudios abierta, volver a lista
      if (showMyStudiesAndRevisits) {
        setShowMyStudiesAndRevisits(false);
        event.preventDefault();
        return;
      }

      // PRIORIDAD 2: Si hay vista de propuestas abierta, volver a lista
      if (showMyProposals) {
        setShowMyProposals(false);
        event.preventDefault();
        return;
      }

      // PRIORIDAD 3: Si hay territorio seleccionado, volver a lista
      if (selectedTerritory) {
        setSelectedTerritory(null);
        event.preventDefault();
        return;
      }

      // PRIORIDAD 4: Si hay modal activo, cerrarlo
      if (activeModal) {
        setActiveModal(null);
        event.preventDefault();
        return;
      }

      // PRIORIDAD 5: Si hay menú abierto, cerrarlo
      if (isMenuOpen) {
        setIsMenuOpen(false);
        event.preventDefault();
        return;
      }

      // PRIORIDAD 6: Si hay modal de editar dirección abierto en territorio, cerrarlo
      if (selectedTerritory && window.history.state?.modalType === 'edit-address-modal') {
        // Simular el cierre del modal de editar dirección
        const closeEvent = new CustomEvent('closeAddressFormModal');
        window.dispatchEvent(closeEvent);
        event.preventDefault();
        return;
      }

      // PRIORIDAD 7: Verificar el estado del historial para determinar acción
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

      // PRIORIDAD 8: Si hay historial disponible, permitir navegación normal  
      if (window.history.length > 1) {
        return; // Permitir navegación normal hacia atrás
      }

      // PRIORIDAD 9: Solo mostrar confirmación si realmente no hay a dónde volver
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
  }, [activeModal, isMenuOpen, selectedTerritory, showMyProposals, showMyStudiesAndRevisits]);

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
      id: 'myStudiesAndRevisits',
      text: 'Mis Revisitas y Estudios',
      icon: 'bookmark',
      view: 'studiesAndRevisits',
      description: 'Ver tus asignaciones confirmadas'
    },
    {
      id: 'myProposals',
      text: 'Mis Propuestas',
      icon: 'edit',
      view: 'proposals',
      hasBadge: userNotificationsCount > 0,
      badgeCount: userNotificationsCount,
      description: 'Ver tus cambios propuestos'
    },
    {
      id: 'admin',
      text: 'Administración',
      icon: 'settings',
      modal: 'admin',
      hasBadge: currentUser?.role === 'admin' && pendingProposalsCount > 0,
      badgeCount: pendingProposalsCount,
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

  // Filtrar items según el rol y estado de instalación
  const filteredMenuItems = menuItems.filter(item => {
    if (item.id === 'admin' && currentUser?.role !== 'admin') return false;
    if (item.id === 'myProposals' && currentUser?.role === 'admin') return false;
    // Permitir "Mis Revisitas y Estudios" para todos los usuarios (incluyendo admin)
    if (item.adminOnly && currentUser?.role !== 'admin') return false; // Filtrar items solo para admin
    // Ocultar botón de instalación si la app ya está instalada
    if (item.id === 'install' && isAppInstalled) return false;
    return true;
  });

  const handleOpenModal = (modalId) => {
    // CERRAR EL MENÚ cuando se abre cualquier modal
    if (isMenuOpen) {
      setIsMenuOpen(false);
    }
    
    // Manejar navegación a vistas especiales
    if (modalId === 'proposals') {
      handleOpenMyProposals();
      return;
    }
    
    if (modalId === 'studiesAndRevisits') {
      handleOpenMyStudiesAndRevisits();
      return;
    }
    
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

  const handleOpenMyProposals = () => {
    setShowMyProposals(true);
    
    // ✅ NUEVO: Marcar propuestas como leídas usando la función del contexto
    // (Esto se maneja automáticamente en MyProposalsView.jsx)
    
    // Agregar entrada específica al historial
    window.history.pushState({ 
      app: 'territorios', 
      level: 'proposals'
    }, '', window.location.href);
  };

  const handleBackFromMyProposals = () => {
    setShowMyProposals(false);
    // Si el estado actual es propuestas, navegar hacia atrás
    if (window.history.state?.level === 'proposals') {
      window.history.back();
    }
  };

  const handleOpenMyStudiesAndRevisits = () => {
    setShowMyStudiesAndRevisits(true);
    
    // Agregar entrada específica al historial
    window.history.pushState({ 
      app: 'territorios', 
      level: 'studiesAndRevisits'
    }, '', window.location.href);
  };

  const handleBackFromMyStudiesAndRevisits = () => {
    setShowMyStudiesAndRevisits(false);
    // Si el estado actual es estudios y revisitas, navegar hacia atrás
    if (window.history.state?.level === 'studiesAndRevisits') {
      window.history.back();
    }
  };

  // Manejar apertura del menú
  const handleOpenMenu = () => {
    setIsMenuOpen(true);
    window.history.pushState({
      app: 'territorios',
      level: 'menu'
    }, '', window.location.href);
  };

  // Manejar cierre del menú
  const handleCloseMenu = () => {
    setIsMenuOpen(false);
    if (window.history.state?.level === 'menu') {
      window.history.back();
    }
  };

  useEffect(() => {
    if (!currentUser) {
      hasMarkedTerritoriesPaintRef.current = false;
      return;
    }

    if (interactiveReady && primaryViewsReady && !hasMarkedTerritoriesPaintRef.current) {
      hasMarkedTerritoriesPaintRef.current = true;
      window.requestAnimationFrame(() => {
        markBoot('boot:territories-painted');
      });
    }
  }, [currentUser, interactiveReady, primaryViewsReady]);

  useEffect(() => {
    let isActive = true;

    if (!currentUser?.id) {
      setPrimaryViewsReady(false);
      return () => {
        isActive = false;
      };
    }

    setPrimaryViewsReady(false);

    preloadPrimaryViews()
      .then(() => {
        if (isActive) {
          setPrimaryViewsReady(true);
        }
      })
      .catch((error) => {
        console.error('[preload:primary-views]', error);
        if (isActive) {
          setPrimaryViewsReady(true);
        }
      });

    return () => {
      isActive = false;
    };
  }, [currentUser?.id]);

  const hasCriticalBootstrapError =
    bootstrap.phase === 'error' &&
    ['auth', 'territories', 'addresses'].includes(bootstrap.error?.scope);

  const shouldShowBootScreen =
    authLoading ||
    (currentUser && (!interactiveReady || !primaryViewsReady)) ||
    (hasCriticalBootstrapError && (!currentUser || territories.length === 0));

  const bootPhase =
    hasCriticalBootstrapError
      ? 'error'
      : currentUser
        ? 'territories'
        : bootstrap.phase;

  const bootSubtitle =
    hasCriticalBootstrapError
      ? bootstrap.error?.message
      : currentUser
        ? (
          addressesLoading
            ? 'Preparando territorios, direcciones y detalle base.'
            : 'Preparando la vista principal para entrar sin esperas.'
        )
        : null;

  if (shouldShowBootScreen) {
    return (
      <BootScreen
        phase={bootPhase}
        error={bootstrap.error}
        subtitle={bootSubtitle}
        onRetry={retryBootstrap}
      />
    );
  }

  if (!currentUser) {
    return <LoginView />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {bootstrap.error && currentUser && (
        <div className="sticky top-0 z-40 px-4 pt-3">
          <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-amber-900 shadow-sm">
            <div>
              <p className="text-sm font-semibold">Carga parcial</p>
              <p className="text-xs sm:text-sm">{bootstrap.error.message}</p>
            </div>
            <button
              type="button"
              onClick={retryBootstrap}
              className="shrink-0 rounded-xl bg-amber-900 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-amber-950"
            >
              Reintentar
            </button>
          </div>
        </div>
      )}

      {/* Sistema de Actualizaciones Automáticas */}
      {/* <UpdateNotification /> */} {/* 🔧 TEMPORALMENTE DESACTIVADO PARA TESTING */}

      {/* Vista principal */}
      {showMyStudiesAndRevisits ? (
        <LazyMyStudiesAndRevisitsView
          onBack={handleBackFromMyStudiesAndRevisits}
        />
      ) : showMyProposals ? (
        <LazyMyProposalsView
          onBack={handleBackFromMyProposals}
        />
      ) : selectedTerritory ? (
        <LazyTerritoryDetailView
          territory={selectedTerritory}
          onBack={handleBackFromTerritory}
        />
      ) : (
        <LazyTerritoriesView
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
        <LazySearchModal 
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
        <LazyUpdatesModal isOpen onClose={handleCloseModal} modalId="updates-modal" />
      )}
      {activeModal === 'install' && (
        <LazyInstallModal isOpen onClose={handleCloseModal} modalId="install-modal" />
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
