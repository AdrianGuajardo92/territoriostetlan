import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
// import { useAppUpdates } from '../../hooks/useAppUpdates'; // 🔇 ELIMINADO: Ya no necesitamos actualizaciones manuales
import Icon from './Icon';

const MobileMenu = ({ isOpen, onClose, menuItems, activeItem, onOpenModal, handleLogout }) => {
  const { currentUser, CURRENT_VERSION } = useApp();
  // const { checkForUpdates, isChecking } = useAppUpdates(); // 🔇 ELIMINADO
  const [hoveredItem, setHoveredItem] = useState(null);
  
  // Configuración de colores vibrantes para cada item del menú
  const menuColors = {
    search: { 
      bg: 'from-blue-500 to-indigo-600', 
      hover: 'from-blue-600 to-indigo-700',
      glow: 'shadow-blue-500/30'
    },
    myProposals: { 
      bg: 'from-amber-500 to-orange-600', 
      hover: 'from-amber-600 to-orange-700',
      glow: 'shadow-amber-500/30'
    },
    admin: { 
      bg: 'from-rose-500 to-pink-600', 
      hover: 'from-rose-600 to-pink-700',
      glow: 'shadow-rose-500/30'
    },
    password: { 
      bg: 'from-slate-500 to-slate-700', 
      hover: 'from-slate-600 to-slate-800',
      glow: 'shadow-slate-500/30'
    },
    systemReports: { 
      bg: 'from-emerald-500 to-teal-600', 
      hover: 'from-emerald-600 to-teal-700',
      glow: 'shadow-emerald-500/30'
    },
    install: { 
      bg: 'from-violet-500 to-purple-600', 
      hover: 'from-violet-600 to-purple-700',
      glow: 'shadow-violet-500/30'
    },
    logout: { 
      bg: 'from-red-500 to-rose-600', 
      hover: 'from-red-600 to-rose-700',
      glow: 'shadow-red-500/30'
    }
  };
  
  return (
    <>
            {/* Overlay con blur elegante */}
      <div 
        className={`fixed inset-0 bg-black/40 backdrop-blur-md z-40 ${
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        style={{
          transition: 'opacity 2s ease-in-out',
          touchAction: 'none'
        }} 
        onClick={() => {
          const urlParams = new URLSearchParams(window.location.hash.split('?')[1] || '');
          const hasModal = urlParams.get('modal');
          if (!hasModal) {
            onClose();
          }
        }}
      />
      
      {/* Panel del menú con fondo gris claro elegante */}
      <div 
        data-menu-panel="true"
        className={`fixed inset-y-0 right-0 z-50 ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
        style={{
          width: '75%',
          maxWidth: '320px',
          transition: 'transform 2s ease-in-out',
          willChange: 'transform'
        }}
      >
        <div className="h-full flex flex-col bg-gray-100 shadow-2xl rounded-l-2xl">
          <div className="relative h-full flex flex-col" style={{ touchAction: 'pan-y' }}>
            {/* Header con estilo consistente de modales */}
            <div className="flex-shrink-0 shadow-xl rounded-tl-2xl" style={{ backgroundColor: '#2C3E50' }}>
              <div className="flex items-center justify-between p-6">
                {/* Título con ícono */}
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center backdrop-blur-sm">
                    <Icon name="user" size={24} className="text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white">
                      {currentUser ? currentUser.name : 'Usuario'}
                    </h3>
                    <span className="inline-flex items-center text-sm text-white/70">
                      <Icon name={currentUser?.role === 'admin' ? 'shield' : 'users'} size={14} className="mr-1.5" />
                      {currentUser?.role === 'admin' ? 'Administrador' : 'Publicador'}
                    </span>
                  </div>
                </div>
                
                {/* Botón cerrar elegante */}
                <button 
                  onClick={onClose}
                  className="p-3 rounded-xl transition-all transform hover:scale-105 group"
                  style={{ backgroundColor: '#34495e' }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#3a526b'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#34495e'}
                >
                  <Icon name="x" size={20} className="text-white group-hover:rotate-90 transition-transform" />
                </button>
              </div>
            </div>
            
            {/* Contenido del menú */}
            <div className="flex-1 overflow-y-auto p-4" style={{ overscrollBehavior: 'contain', WebkitOverflowScrolling: 'touch' }}>
              <nav>
                <ul className="space-y-3">
                  {menuItems.filter(item => !(item.id === 'myProposals' && currentUser?.role === 'admin')).map((item, index) => {
                    const isActive = activeItem === item.id;
                    const isHovered = hoveredItem === item.id;
                    const colorConfig = menuColors[item.id] || menuColors.search;
                    const isLogout = item.id === 'logout';
                    
                    return (
                      <li 
                        key={item.id}
                        className={`transition-all duration-500 ease-out ${
                          isOpen ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-4'
                        }`}
                        style={{
                          transitionDelay: isOpen ? `${index * 100}ms` : '0ms'
                        }}
                      >
                        <a 
                          href="#" 
                                                      onClick={(e) => {
                              e.preventDefault();
                              
                              
                              if (item.action) {
                                console.log('⚡ Executing action function');
                                item.action();
                                if (item.isUpdateAction) {
                                  // No cerrar menú si es actualización
                                } else {
                                  onClose(); 
                                }
                              } else if (item.isLogout) {
                                console.log('🚪 Logout clicked');
                                handleLogout();
                                onClose(); 
                              } else {
                                const modalId = item.view || item.modal || item.id;
                
              
                                onOpenModal(modalId);
                              }
                            }} 
                          onMouseEnter={() => setHoveredItem(item.id)}
                          onMouseLeave={() => setHoveredItem(null)}
                          className={`group flex items-center p-4 rounded-2xl transition-all duration-300 transform hover:scale-[1.02] relative overflow-hidden ${
                            isActive ? 'shadow-xl' : 'hover:shadow-lg'
                          }`}
                          style={{
                            background: isActive || isHovered 
                              ? `linear-gradient(135deg, var(--tw-gradient-stops))` 
                              : 'rgba(255, 255, 255, 0.8)',
                            backdropFilter: 'blur(10px)',
                            border: '1px solid rgba(0, 0, 0, 0.1)',
                            minHeight: '70px'
                          }}
                        >
                          {/* Efecto de brillo en hover */}
                          {(isActive || isHovered) && (
                            <div 
                              className={`absolute inset-0 bg-gradient-to-r ${colorConfig.bg} opacity-90 rounded-2xl`}
                              style={{ zIndex: -1 }}
                            />
                          )}
                          
                          {/* Indicador lateral para item activo */}
                          {isActive && (
                            <div className="absolute left-0 top-3 bottom-3 w-1 bg-white rounded-r-full shadow-lg"></div>
                          )}
                          
                          {/* Contenedor del icono con efectos */}
                          <div className={`relative w-12 h-12 rounded-xl flex items-center justify-center mr-4 transition-all duration-300 ${
                            item.isUpdateAction ? 'bg-gradient-to-r from-blue-500 to-purple-600' :
                            item.isLoading ? 'bg-gradient-to-r from-gray-400 to-gray-500' : 
                            (isActive || isHovered) ? 'bg-white/20 backdrop-blur-sm' : 'bg-gray-200'
                          } ${colorConfig.glow} shadow-lg`}>
                            {item.isLoading ? (
                              <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                            ) : (
                                                <Icon 
                    name={item.id === 'systemReports' ? 'barChart' : item.icon} 
                                size={22} 
                                className={`transition-all duration-300 ${
                                  isActive || isHovered ? 'text-white scale-110' : 'text-gray-600'
                                }`}
                              />
                            )}
                            
                            {/* Badge con animación */}
                            {item.hasBadge && (item.badgeCount > 0 || item.badgeText) && !item.isLoading && (
                              <span className={`absolute -top-2 -right-2 text-xs rounded-full flex items-center justify-center font-bold min-w-[22px] h-6 px-2 shadow-lg animate-bounce ${
                                item.isUpdateAction ? 'bg-white text-blue-600' : 'bg-red-500 text-white border-2 border-white'
                              }`}>
                                {item.badgeCount || item.badgeText}
                              </span>
                            )}
                          </div>
                          
                          {/* Contenido del texto */}
                          <div className="flex-1 min-w-0">
                            <p className={`font-semibold text-base transition-all duration-300 whitespace-nowrap ${
                              isActive || isHovered ? 'text-white' : 'text-gray-800'
                            }`}>
                              {item.text}
                              {item.isUpdateAction && (
                                <span className="ml-2 text-xs bg-white/30 px-2 py-1 rounded-full animate-pulse">¡Nuevo!</span>
                              )}
                            </p>
                            {item.description && (
                              <p className={`text-sm mt-1 transition-all duration-300 whitespace-nowrap overflow-hidden text-ellipsis ${
                                isActive || isHovered ? 'text-white/80' : 'text-gray-600'
                              }`}>
                                {item.description}
                              </p>
                            )}
                          </div>
                          
                          {/* Flecha indicadora */}
                          <Icon 
                            name="chevronRight" 
                            size={18} 
                            className={`flex-shrink-0 transition-all duration-300 ${
                              isActive || isHovered 
                                ? 'text-white transform translate-x-1 scale-110' 
                                : 'text-gray-500'
                            }`}
                          />
                          
                          {/* Efecto de partículas en hover */}
                          {isHovered && (
                            <div className="absolute inset-0 pointer-events-none">
                              <div className="absolute top-2 right-4 w-1 h-1 bg-white rounded-full animate-ping"></div>
                              <div className="absolute bottom-3 left-8 w-1 h-1 bg-white/60 rounded-full animate-ping" style={{ animationDelay: '0.5s' }}></div>
                              <div className="absolute top-1/2 right-8 w-0.5 h-0.5 bg-white/40 rounded-full animate-ping" style={{ animationDelay: '1s' }}></div>
                            </div>
                          )}
                        </a>
                      </li>
                    );
                  })}
                </ul>
              </nav>
              
              {/* Separador elegante */}
              <div className="my-8 h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent"></div>
              
              {/* Footer del menú */}
              <div className="px-2 pb-6">
                <div className="relative rounded-2xl p-4 text-center overflow-hidden bg-white/80 backdrop-blur-sm border border-gray-200 shadow-lg">
                  <div className="absolute inset-0 bg-gradient-to-br from-gray-50/50 to-gray-100/50"></div>
                  <div className="relative">
                    <Icon name="mapPin" size={28} className="text-gray-600 mx-auto mb-3" />
                    <p className="text-base font-bold text-gray-800">Gestor de Territorios</p>
                    <p className="text-sm text-gray-600 mt-1">Versión {CURRENT_VERSION}</p>
                    <div className="mt-2 h-1 bg-gradient-to-r from-gray-300 to-gray-400 rounded-full"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Estilos simplificados */}
      <style dangerouslySetInnerHTML={{__html: `
        /* Efectos de glassmorphism */
        [data-menu-panel="true"] {
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
        }
        
        /* Hover suave para elementos del menú */
        .group:hover {
          transform: scale(1.02);
          transition: transform 0.2s ease-out;
        }
      `}} />
    </>
  );
};

export default MobileMenu; 