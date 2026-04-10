import React, { useState, useEffect, useRef } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { CampaignProvider, useCampaigns } from './context/CampaignContext';
import { ToastProvider, useToast } from './hooks/useToast';
import './utils/errorLogger'; // Inicializar el sistema de captura de errores
import LoginView from './components/auth/LoginView';
import BootScreen from './components/common/BootScreen';
import MobileMenu from './components/common/MobileMenu';
import { markBoot } from './utils/bootMetrics';

// ðŸš€ PÃGINAS LAZY - CODE SPLITTING MÃTICO 100% âš¡
import { 
  LazyTerritoriesView,
  LazyTerritoryDetailView,
  LazyMyProposalsView,
  LazyMyStudiesAndRevisitsView,
  LazyCampaignsView,
  preloadPrimaryViews
} from './components/modals/LazyModals';

// CORRECCIÃ“N: Usar wrappers lazy optimizados en lugar de lazy imports âš¡
import { LazyPasswordModal as PasswordModal } from './components/modals/LazyModals';

// Importar modales lazy optimizados
import {
  LazyStatsModal,
  LazyAdminModal,
  LazySearchModal,
  LazyInstallModal,
  LazyUpdatesModal
} from './components/modals/LazyModals';
import { CAMPAIGN_PROGRESS_STATUSES } from './utils/campaignUtils';
import DevClickToSource from './components/common/DevClickToSource';



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
    userNotificationsCount, // âœ… NUEVO: Contador de notificaciones del usuario
    pendingProposalsCount // âœ… NUEVO: Contador de propuestas pendientes para admin
  } = useApp();
  const {
    activeCampaign,
    activeCampaignAssignments,
    myPendingCampaignAssignmentsCount
  } = useCampaigns();
  const { showToast } = useToast();
  const hasMarkedTerritoriesPaintRef = useRef(false);
  const [selectedTerritory, setSelectedTerritory] = useState(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [activeModal, setActiveModal] = useState(null);
  const [showCampaigns, setShowCampaigns] = useState(false);
  const [showMyProposals, setShowMyProposals] = useState(false);
  const [showMyStudiesAndRevisits, setShowMyStudiesAndRevisits] = useState(false);
  const [primaryViewsReady, setPrimaryViewsReady] = useState(false);
  
  // OPTIMIZACIÃ“N: Font loading state para optimizar FOUT âš¡
  const [fontsLoaded, setFontsLoaded] = useState(false);
  
  // Detectar si la aplicaciÃ³n estÃ¡ instalada
  const [isAppInstalled, setIsAppInstalled] = useState(
    () => window.matchMedia('(display-mode: standalone)').matches
  );

  const activeCampaignCompletedCount = activeCampaignAssignments.filter(
    (assignment) => assignment.status === CAMPAIGN_PROGRESS_STATUSES.COMPLETED
  ).length;
  const activeCampaignProgressLabel = activeCampaign
    ? `${activeCampaign.name} · ${activeCampaignCompletedCount}/${activeCampaignAssignments.length || 0} completadas`
    : 'Sin campaña activa';

  // FunciÃ³n simplificada para limpiar cache
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

  // Detectar cambios en el estado de instalaciÃ³n de la app
  useEffect(() => {
    const mediaQuery = window.matchMedia('(display-mode: standalone)');
    const handleChange = () => setIsAppInstalled(mediaQuery.matches);
    
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  // OPTIMIZACIÃ“N: Detectar cuando Inter font se carga para aplicar clase
  useEffect(() => {
    if (typeof document !== 'undefined') {
      const checkInterFont = () => {
        if (document.fonts && document.fonts.check('1em Inter')) {
          setFontsLoaded(true);
          // Aplicar clase font-inter al body cuando estÃ© cargada
          document.body.classList.add('font-inter');
        } else {
          // Reintentar en 100ms
          setTimeout(checkInterFont, 100);
        }
      };
      
      // Iniciar verificaciÃ³n cuando el documento estÃ© listo
      if (document.readyState === 'complete') {
        checkInterFont();
      } else {
        window.addEventListener('load', checkInterFont);
      }
      
      // Timeout de seguridad - aplicar clase despuÃ©s de 3 segundos
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

  // Restaurar territorio desde sessionStorage si la app se recargÃ³
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
            // Limpiar sessionStorage despuÃ©s de restaurar
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

  // Manejar el botÃ³n fÃ­sico de volver
  useEffect(() => {
    const handlePopState = (event) => {
      if (showCampaigns) {
        setShowCampaigns(false);
        event.preventDefault();
        return;
      }

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

      // PRIORIDAD 5: Si hay menÃº abierto, cerrarlo
      if (isMenuOpen) {
        setIsMenuOpen(false);
        event.preventDefault();
        return;
      }

      // PRIORIDAD 6: Si hay modal de editar direcciÃ³n abierto en territorio, cerrarlo
      if (selectedTerritory && window.history.state?.modalType === 'edit-address-modal') {
        // Simular el cierre del modal de editar direcciÃ³n
        const closeEvent = new CustomEvent('closeAddressFormModal');
        window.dispatchEvent(closeEvent);
        event.preventDefault();
        return;
      }

      // PRIORIDAD 7: Verificar el estado del historial para determinar acciÃ³n
      const currentState = event.state;
      
      // Si tenemos un estado especÃ­fico de la app, manejarlo
      if (currentState && currentState.app === 'territorios') {
        if (currentState.level === 'territory') {
          return; // Permitir navegaciÃ³n normal
        }
        if (currentState.level === 'proposals') {
          return; // Permitir navegaciÃ³n normal
        }
        if (currentState.level === 'menu') {
          return; // Permitir navegaciÃ³n normal
        }
        if (currentState.level === 'main') {
          return; // Permitir navegaciÃ³n normal
        }
      }

      // PRIORIDAD 8: Si hay historial disponible, permitir navegaciÃ³n normal  
      if (window.history.length > 1) {
        return; // Permitir navegaciÃ³n normal hacia atrÃ¡s
      }

      // PRIORIDAD 9: Solo mostrar confirmaciÃ³n si realmente no hay a dÃ³nde volver
      event.preventDefault();
      
      const shouldExit = window.confirm('\u00bfQuieres salir de la aplicaci\u00f3n?');
      if (shouldExit) {
        // Cerrar ventana
        window.close();
      } else {
        // Si no quiere salir, mantener en la misma pÃ¡gina
        window.history.pushState({ app: 'territorios', level: 'main' }, '', window.location.href);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [activeModal, isMenuOpen, selectedTerritory, showCampaigns, showMyProposals, showMyStudiesAndRevisits]);

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
      id: 'campaigns',
      text: 'Campa\u00f1as e Invitaciones',
      icon: 'mail',
      view: 'campaigns',
      hasBadge: !!activeCampaign && myPendingCampaignAssignmentsCount > 0,
      badgeCount: myPendingCampaignAssignmentsCount,
      description: activeCampaign
        ? `Activa: ${activeCampaignProgressLabel}`
        : (currentUser?.role === 'admin'
          ? 'Administrar campañas y revisar el avance'
          : 'Ver tus direcciones asignadas')
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
      text: 'Administraci\u00f3n',
      icon: 'settings',
      modal: 'admin',
      hasBadge: currentUser?.role === 'admin' && pendingProposalsCount > 0,
      badgeCount: pendingProposalsCount,
      description: 'Panel de control completo'
    },
    {
      id: 'password',
      text: 'Cambiar Contrase\u00f1a',
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
      text: 'Cerrar Sesi\u00f3n',
      icon: 'logOut',
      isLogout: true
    }
  ];

  // Filtrar items segÃºn el rol y estado de instalaciÃ³n
  const filteredMenuItems = menuItems.filter(item => {
    if (item.id === 'admin' && currentUser?.role !== 'admin') return false;
    if (item.id === 'myProposals' && currentUser?.role === 'admin') return false;
    // Permitir "Mis Revisitas y Estudios" para todos los usuarios (incluyendo admin)
    if (item.adminOnly && currentUser?.role !== 'admin') return false; // Filtrar items solo para admin
    // Ocultar botÃ³n de instalaciÃ³n si la app ya estÃ¡ instalada
    if (item.id === 'install' && isAppInstalled) return false;
    return true;
  });

  const handleOpenModal = (modalId) => {
    // CERRAR EL MENÃš cuando se abre cualquier modal
    if (isMenuOpen) {
      setIsMenuOpen(false);
    }
    
    // Manejar navegaciÃ³n a vistas especiales
    if (modalId === 'campaigns') {
      handleOpenCampaigns();
      return;
    }

    if (modalId === 'proposals') {
      handleOpenMyProposals();
      return;
    }
    
    if (modalId === 'studiesAndRevisits') {
      handleOpenMyStudiesAndRevisits();
      return;
    }
    
    setActiveModal(modalId);
    // El historial ahora lo maneja automÃ¡ticamente useModalHistory
  };

  const handleCloseModal = () => {
    setActiveModal(null);
    // El historial ahora lo maneja automÃ¡ticamente useModalHistory
  };

  const handleSelectTerritory = (territory, addressIdToHighlight = null) => {
    setSelectedTerritory({...territory, highlightedAddressId: addressIdToHighlight});
    // Agregar entrada especÃ­fica al historial para el territorio
    window.history.pushState({ 
      app: 'territorios', 
      level: 'territory', 
      territory: territory.id,
      highlightedAddressId: addressIdToHighlight
    }, '', window.location.href);
  };

  const handleBackFromTerritory = () => {
    setSelectedTerritory(null);
    // Si el estado actual es un territorio, navegar hacia atrÃ¡s
    if (window.history.state?.level === 'territory') {
      window.history.back();
    }
  };

  const handleOpenMyProposals = () => {
    setShowMyProposals(true);
    
    // âœ… NUEVO: Marcar propuestas como leÃ­das usando la funciÃ³n del contexto
    // (Esto se maneja automÃ¡ticamente en MyProposalsView.jsx)
    
    // Agregar entrada especÃ­fica al historial
    window.history.pushState({ 
      app: 'territorios', 
      level: 'proposals'
    }, '', window.location.href);
  };

  const handleBackFromMyProposals = () => {
    setShowMyProposals(false);
    // Si el estado actual es propuestas, navegar hacia atrÃ¡s
    if (window.history.state?.level === 'proposals') {
      window.history.back();
    }
  };

  const handleOpenCampaigns = () => {
    setShowCampaigns(true);

    window.history.pushState({
      app: 'territorios',
      level: 'campaigns'
    }, '', window.location.href);
  };

  const handleBackFromCampaigns = () => {
    setShowCampaigns(false);
    if (window.history.state?.level === 'campaigns') {
      window.history.back();
    }
  };

  const handleOpenMyStudiesAndRevisits = () => {
    setShowMyStudiesAndRevisits(true);
    
    // Agregar entrada especÃ­fica al historial
    window.history.pushState({ 
      app: 'territorios', 
      level: 'studiesAndRevisits'
    }, '', window.location.href);
  };

  const handleBackFromMyStudiesAndRevisits = () => {
    setShowMyStudiesAndRevisits(false);
    // Si el estado actual es estudios y revisitas, navegar hacia atrÃ¡s
    if (window.history.state?.level === 'studiesAndRevisits') {
      window.history.back();
    }
  };

  // Manejar apertura del menÃº
  const handleOpenMenu = () => {
    setIsMenuOpen(true);
    window.history.pushState({
      app: 'territorios',
      level: 'menu'
    }, '', window.location.href);
  };

  // Manejar cierre del menÃº
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

      {/* Vista principal */}
      {showCampaigns ? (
        <LazyCampaignsView
          onBack={handleBackFromCampaigns}
        />
      ) : showMyStudiesAndRevisits ? (
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

      {/* MenÃº mÃ³vil */}
      <MobileMenu
        isOpen={isMenuOpen}
        onClose={handleCloseMenu}
        menuItems={filteredMenuItems}
        activeItem={activeModal}
        onOpenModal={handleOpenModal}
        handleLogout={logout}
      />

      {/* CORRECCIÃ“N: Modales sin Suspense - Ya optimizados âš¡ */}
      {activeModal === 'search' && (
        <LazySearchModal 
          isOpen 
          onClose={handleCloseModal} 
          onNavigateToTerritory={handleSelectTerritory}
          modalId="search-modal" 
        />
      )}

      {activeModal === 'admin' && currentUser?.role === 'admin' && (
        <LazyAdminModal
          isOpen
          onClose={handleCloseModal}
          modalId="admin-modal"
        />
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
        <CampaignProvider>
          <AppContent />
          <DevClickToSource />
        </CampaignProvider>
      </AppProvider>
    </ToastProvider>
  );
}

export default App; 

