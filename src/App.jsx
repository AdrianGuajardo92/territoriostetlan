import React, { useState, useEffect, lazy, Suspense } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { ToastProvider } from './hooks/useToast';
import LoginView from './components/auth/LoginView';
import MobileMenu from './components/common/MobileMenu';
import TerritoriesView from './pages/TerritoriesView';
import TerritoryDetailView from './pages/TerritoryDetailView';
import LoadingSpinner from './components/common/LoadingSpinner';

// Lazy load de componentes pesados
const SearchModal = lazy(() => import('./components/modals/SearchModal'));
const StatsModal = lazy(() => import('./components/modals/StatsModal'));
const ReportsModal = lazy(() => import('./components/modals/ReportsModal'));
const AdminModal = lazy(() => import('./components/modals/AdminModal'));
const ProposalsModal = lazy(() => import('./components/modals/ProposalsModal'));
const PasswordModal = lazy(() => import('./components/modals/PasswordModal'));
const UpdatesModal = lazy(() => import('./components/modals/UpdatesModal'));
const InstallModal = lazy(() => import('./components/modals/InstallModal'));

// Importar Firestore temporalmente para debug
import { db } from './config/firebase';
import { collection, getDocs, addDoc } from 'firebase/firestore';

function AppContent() {
  const { currentUser, authLoading, proposals, logout, territories, adminEditMode, handleToggleAdminMode } = useApp();
  const [selectedTerritory, setSelectedTerritory] = useState(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [activeModal, setActiveModal] = useState(null);
  const [updateAvailable, setUpdateAvailable] = useState(false);

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
      // Para pantalla principal - solo cerrar componentes abiertos
      if (selectedTerritory) {
        // Si hay territorio seleccionado, volver a lista
        setSelectedTerritory(null);
        return;
      }

      if (activeModal) {
        // Los modales ahora se manejan automáticamente con useModalHistory
        // Solo resetear el estado local
        setActiveModal(null);
        return;
      }

      if (isMenuOpen) {
        // Si hay menú abierto, cerrarlo
        setIsMenuOpen(false);
        return;
      }

      // Si está en pantalla principal sin nada abierto, mostrar confirmación de salida
      const shouldExit = window.confirm('¿Quieres salir de la aplicación?');
      if (shouldExit) {
        window.close();
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

  const handleSelectTerritory = (territory) => {
    setSelectedTerritory(territory);
    // Agregar entrada específica al historial para el territorio
    window.history.pushState({ 
      app: 'territorios', 
      level: 'territory', 
      territory: territory.id 
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

  // Función temporal para verificar usuarios
  const checkUsers = async () => {
    try {
      console.log('Verificando usuarios en la base de datos...');
      const usersSnapshot = await getDocs(collection(db, 'users'));
      console.log('Total de usuarios:', usersSnapshot.size);
      
      if (usersSnapshot.empty) {
        console.log('⚠️ No hay usuarios en la base de datos');
        alert('No hay usuarios en la base de datos. Necesitas crear usuarios en Firebase.');
      } else {
        usersSnapshot.forEach(doc => {
          const data = doc.data();
          console.log('Usuario encontrado:', {
            id: doc.id,
            name: data.name,
            accessCode: data.accessCode,
            role: data.role,
            hasPassword: !!data.password
          });
        });
      }
    } catch (error) {
      console.error('Error al verificar usuarios:', error);
      alert('Error al conectar con Firebase. Verifica la consola.');
    }
  };

  // Función para crear usuario de prueba
  const createTestUser = async () => {
    if (!confirm('¿Crear un usuario de prueba admin1/admin123?')) return;
    
    try {
      const { addDoc } = await import('firebase/firestore');
      const userRef = await addDoc(collection(db, 'users'), {
        name: 'Administrador',
        accessCode: 'admin1',
        password: 'admin123',
        role: 'admin',
        createdAt: new Date().toISOString()
      });
      
      console.log('Usuario de prueba creado con ID:', userRef.id);
      alert('Usuario de prueba creado!\n\nCódigo: admin1\nContraseña: admin123');
    } catch (error) {
      console.error('Error al crear usuario:', error);
      alert('Error al crear usuario. Verifica la consola.');
    }
  };

  if (authLoading) {
    return <LoadingSpinner fullScreen />;
  }

  if (!currentUser) {
    return (
      <>
        <LoginView />
        <div className="fixed bottom-4 right-4 flex flex-col gap-2 z-50">
          <button
            onClick={checkUsers}
            className="bg-red-600 text-white px-4 py-2 rounded-lg shadow-lg hover:bg-red-700"
          >
            🔍 Verificar Usuarios en DB
          </button>
          <button
            onClick={createTestUser}
            className="bg-green-600 text-white px-4 py-2 rounded-lg shadow-lg hover:bg-green-700"
          >
            ➕ Crear Usuario de Prueba
          </button>
        </div>
      </>
    );
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

      {/* Modales */}
      <Suspense fallback={<div>Cargando...</div>}>
        {activeModal === 'search' && (
          <SearchModal isOpen onClose={handleCloseModal} modalId="search-modal" />
        )}
        {activeModal === 'stats' && (
          <StatsModal isOpen onClose={handleCloseModal} modalId="stats-modal" />
        )}
        {activeModal === 'reports' && (
          <ReportsModal isOpen onClose={handleCloseModal} modalId="reports-modal" />
        )}
        {activeModal === 'admin' && currentUser?.role === 'admin' && (
          <AdminModal isOpen onClose={handleCloseModal} modalId="admin-modal" />
        )}
        {activeModal === 'proposals' && currentUser?.role !== 'admin' && (
          <ProposalsModal isOpen onClose={handleCloseModal} modalId="proposals-modal" />
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
      </Suspense>
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