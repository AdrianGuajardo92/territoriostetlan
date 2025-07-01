import React, { useState, useEffect } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { ToastProvider, useToast } from './hooks/useToast';
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



function AppContent() {
  const { currentUser, authLoading, proposals, logout, territories, adminEditMode, handleToggleAdminMode } = useApp();
  const { showToast } = useToast();
  const [selectedTerritory, setSelectedTerritory] = useState(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [activeModal, setActiveModal] = useState(null);
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [showMyProposals, setShowMyProposals] = useState(false);
  const [updateVersion, setUpdateVersion] = useState(null);
  
  // OPTIMIZACIÓN: Font loading state para optimizar FOUT ⚡
  const [fontsLoaded, setFontsLoaded] = useState(false);

  // Sistema de notificaciones para propuestas
  const getUnseenProposalsCount = () => {
    if (!currentUser || currentUser.role === 'admin') return 0;
    
    const userProposals = proposals.filter(p => p.submittedBy === currentUser.email);
    const lastViewedTimestamp = localStorage.getItem(`lastProposalsView_${currentUser.email}`);
    
    if (!lastViewedTimestamp) {
      // Primera vez que accede, mostrar todas las procesadas
      return userProposals.filter(p => p.status !== 'pending').length;
    }
    
    const lastViewed = new Date(lastViewedTimestamp);
    
    // Contar propuestas procesadas después de la última visita
    return userProposals.filter(p => {
      if (p.status === 'pending') return false;
      
      const processedAt = p.approvedAt || p.rejectedAt;
      if (!processedAt) return false;
      
      const processedDate = processedAt.toDate ? processedAt.toDate() : new Date(processedAt);
      return processedDate > lastViewed;
    }).length;
  };

  // Sistema de Service Worker y actualizaciones automáticas MEJORADO
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      const registerSW = async () => {
        try {
          console.log('🔧 Registrando Service Worker...');
          const registration = await navigator.serviceWorker.register('/sw.js');
          
          console.log('✅ Service Worker registrado:', registration);

          // Escuchar mensajes del service worker
          const handleSWMessage = (event) => {
            if (event.data?.type === 'UPDATE_AVAILABLE') {
              console.log('🎉 Nueva versión disponible:', event.data.version);
              setUpdateAvailable(true);
              setUpdateVersion(event.data.version);
              
              // Toast notification inmediata y elegante
              showUpdateNotification(event.data.version);
            }
            
            if (event.data?.type === 'FORCE_RELOAD') {
              console.log('🔄 Recarga forzada solicitada por SW');
              window.location.reload();
            }
          };

          navigator.serviceWorker.addEventListener('message', handleSWMessage);
          
          // ✨ VERIFICACIÓN INMEDIATA al cargar la app
          console.log('🔍 Verificando actualizaciones al iniciar...');
          setTimeout(() => checkForUpdates(), 2000);

          // ✨ VERIFICACIÓN más frecuente cada 2 minutos (en lugar de 10)
          setInterval(checkForUpdates, 2 * 60 * 1000);
          
        } catch (error) {
          console.error('❌ Error registrando Service Worker:', error);
        }
      };

      registerSW();
    }
  }, []);

  // ✨ Función para mostrar notificación de actualización elegante
  const showUpdateNotification = (version) => {
    // Crear toast personalizado más prominente
    const toast = document.createElement('div');
    toast.className = 'fixed top-4 left-4 right-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white p-4 rounded-xl shadow-2xl z-50 transform transition-all duration-500 translate-y-[-100px]';
    toast.innerHTML = `
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
            <i class="fas fa-download text-white"></i>
          </div>
          <div>
            <div class="font-bold text-lg">¡Nueva versión disponible!</div>
            <div class="text-blue-100 text-sm">Versión ${version} - Actualiza para obtener las mejoras</div>
          </div>
        </div>
        <button onclick="this.parentElement.parentElement.remove()" class="text-white/80 hover:text-white">
          <i class="fas fa-times"></i>
        </button>
      </div>
      <div class="mt-3 flex gap-2">
        <button onclick="window.updateApp()" class="bg-white text-blue-600 px-4 py-2 rounded-lg font-medium hover:bg-blue-50 transition-colors">
          Actualizar Ahora
        </button>
        <button onclick="this.parentElement.parentElement.remove()" class="bg-white/20 text-white px-4 py-2 rounded-lg font-medium hover:bg-white/30 transition-colors">
          Más Tarde
        </button>
      </div>
    `;
    
    document.body.appendChild(toast);
    
    // Animación de entrada
    setTimeout(() => {
      toast.style.transform = 'translateY(0)';
    }, 100);
    
    // Auto-quitar después de 10 segundos si no interactúa
    setTimeout(() => {
      if (toast.parentElement) {
        toast.style.transform = 'translateY(-100px)';
        setTimeout(() => toast.remove(), 500);
      }
    }, 10000);
    
    // Hacer función global para el botón
    window.updateApp = handleForceUpdate;
  };

  // ✨ Función mejorada para verificar actualizaciones con feedback
  const [isCheckingUpdates, setIsCheckingUpdates] = useState(false);
  
  const checkForUpdates = async (showFeedback = false) => {
    if (!('serviceWorker' in navigator) || !navigator.serviceWorker.controller) {
      if (showFeedback) {
        showToast('Service Worker no disponible', 'error');
      }
      return false;
    }

    if (showFeedback) {
      setIsCheckingUpdates(true);
      showToast('🔍 Buscando actualizaciones...', 'info');
    }

    try {
      const channel = new MessageChannel();
      
      const updatePromise = new Promise((resolve) => {
        channel.port1.onmessage = (event) => {
          if (event.data.hasUpdate) {
            console.log('🎉 Actualización detectada:', event.data.currentVersion);
            setUpdateAvailable(true);
            setUpdateVersion(event.data.currentVersion);
            
            if (showFeedback) {
              showUpdateNotification(event.data.currentVersion);
            }
            resolve(true);
          } else {
            if (showFeedback) {
              showToast('✅ Ya tienes la versión más reciente', 'success');
            }
            resolve(false);
          }
        };
      });
      
      navigator.serviceWorker.controller.postMessage(
        { type: 'CHECK_UPDATE' }, 
        [channel.port2]
      );

      // Timeout de 10 segundos
      const timeoutPromise = new Promise((resolve) => {
        setTimeout(() => {
          if (showFeedback) {
            showToast('⏰ Verificación tardó demasiado, intenta más tarde', 'warning');
          }
          resolve(false);
        }, 10000);
      });

      const result = await Promise.race([updatePromise, timeoutPromise]);
      return result;
      
    } catch (error) {
      console.error('Error verificando actualizaciones:', error);
      if (showFeedback) {
        showToast('❌ Error verificando actualizaciones', 'error');
      }
      return false;
    } finally {
      if (showFeedback) {
        setIsCheckingUpdates(false);
      }
    }
  };

  // Función para forzar actualización
  const handleForceUpdate = () => {
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      const channel = new MessageChannel();
      
      channel.port1.onmessage = (event) => {
        if (event.data.success) {
          console.log('🔄 Cache limpiado, recargando...');
          window.location.reload();
        }
      };
      
      navigator.serviceWorker.controller.postMessage(
        { type: 'FORCE_UPDATE' }, 
        [channel.port2]
      );
    } else {
      // Fallback si no hay service worker
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
      id: 'updates',
      text: updateAvailable ? `¡Actualizar a v${updateVersion}!` : 'Buscar Actualizaciones',
      icon: updateAvailable ? 'download' : 'sync-alt',
      modal: updateAvailable ? null : 'updates',
      hasBadge: updateAvailable,
      badgeText: updateAvailable ? '!' : null,
      description: updateAvailable 
        ? `Nueva versión ${updateVersion} lista para instalar` 
        : isCheckingUpdates 
          ? 'Verificando actualizaciones...' 
          : 'Buscar nuevas versiones disponibles',
      action: updateAvailable ? handleForceUpdate : (() => checkForUpdates(true)),
      isLoading: isCheckingUpdates,
      isUpdateAction: updateAvailable
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
    // CERRAR EL MENÚ cuando se abre cualquier modal
    if (isMenuOpen) {
      setIsMenuOpen(false);
    }
    
    // Manejar navegación a vistas especiales
    if (modalId === 'proposals') {
      handleOpenMyProposals();
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
    // Marcar como visto al abrir
    if (currentUser) {
      localStorage.setItem(`lastProposalsView_${currentUser.email}`, new Date().toISOString());
    }
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

  // ✨ Manejar apertura del menú con verificación automática de actualizaciones
  const handleOpenMenu = () => {
    setIsMenuOpen(true);
    
    // ✨ VERIFICAR ACTUALIZACIONES al abrir el menú (verificación inmediata)
    console.log('🔍 Verificando actualizaciones al abrir menú...');
    setTimeout(() => checkForUpdates(false), 500); // Sin mostrar feedback para que sea transparente
    
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
      {showMyProposals ? (
        <MyProposalsView
          onBack={handleBackFromMyProposals}
        />
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