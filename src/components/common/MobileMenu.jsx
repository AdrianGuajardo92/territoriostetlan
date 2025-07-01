import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import Icon from './Icon';

const MobileMenu = ({ isOpen, onClose, menuItems, activeItem, onOpenModal, handleLogout }) => {
  const { currentUser, CURRENT_VERSION } = useApp();
  const [hoveredItem, setHoveredItem] = useState(null);
  
  // Iconos específicos para cada item - todos en escala de grises
  const menuIcons = {
    search: { icon: 'search' },
    stats: { icon: 'barChart' },
    reports: { icon: 'fileText' },
    myProposals: { icon: 'edit' },
    admin: { icon: 'settings' },
    password: { icon: 'key' },
    install: { icon: 'smartphone' },
    updates: { icon: 'download' },
    logout: { icon: 'logOut' }
  };
  
  return (
    <>
      <div 
        className={`fixed inset-0 bg-black/50 backdrop-blur-sm z-40 transition-all duration-300 ${
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`} 
        onClick={() => {
          const urlParams = new URLSearchParams(window.location.hash.split('?')[1] || '');
          const hasModal = urlParams.get('modal');
          if (!hasModal) {
            onClose();
          }
        }}
        style={{ touchAction: 'none' }}
      />
      
      <div 
        data-menu-panel="true"
        className={`fixed inset-y-0 right-0 w-full max-w-sm shadow-2xl z-50 transition-all duration-300 ease-out transform ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
        style={{ backgroundColor: '#2C2C2C' }}
      >
        <div className="h-full flex flex-col" style={{ touchAction: 'pan-y' }}>
          {/* Header minimalista con escala de grises */}
          <div className="p-6 flex-shrink-0" style={{ backgroundColor: '#1F1F1F' }}>
            <button 
              onClick={onClose} 
              className="absolute top-6 right-6 p-2 transition-colors duration-200"
              style={{ color: '#B0B0B0' }}
              onMouseEnter={(e) => e.currentTarget.style.color = '#FFFFFF'}
              onMouseLeave={(e) => e.currentTarget.style.color = '#B0B0B0'}
            >
              <Icon name="x" size={24} />
            </button>
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ backgroundColor: '#353535' }}>
                <Icon name="user" size={28} style={{ color: '#D0D0D0' }} />
              </div>
              <div>
                <h3 className="text-lg font-semibold" style={{ color: '#FFFFFF' }}>{currentUser ? currentUser.name : 'Usuario'}</h3>
                <span className="inline-flex items-center text-sm" style={{ color: '#A0A0A0' }}>
                  <Icon name={currentUser?.role === 'admin' ? 'shield' : 'users'} size={14} className="mr-1.5" />
                  {currentUser?.role === 'admin' ? 'Administrador' : 'Publicador'}
                </span>
              </div>
            </div>
          </div>
          
          {/* Contenido del menú */}
          <div className="flex-1 overflow-y-auto" style={{ backgroundColor: '#2C2C2C', overscrollBehavior: 'contain', WebkitOverflowScrolling: 'touch' }}>
            <div className="p-4">
              <nav>
                <ul className="space-y-2">
                  {menuItems.filter(item => !(item.id === 'myProposals' && currentUser?.role === 'admin')).map((item, index) => {
                    const isActive = activeItem === item.id;
                    const isHovered = hoveredItem === item.id;
                    const iconConfig = menuIcons[item.id] || menuIcons.search;
                    const isLogout = item.id === 'logout';
                    
                    return (
                      <li 
                        key={item.id}
                        style={{
                          animation: isOpen ? `fadeIn ${0.2 + index * 0.03}s ease-out` : 'none'
                        }}
                      >
                        <a 
                          href="#" 
                          onClick={(e) => { 
                            e.preventDefault(); 
                            
                            // ✨ Manejo especial para actualizaciones
                            if (item.action) { 
                              item.action(); 
                              if (item.isUpdateAction) {
                                // No cerrar menú si es actualización (se recargará la página)
                              } else {
                                onClose(); 
                              }
                            } else if (item.isLogout) { 
                              handleLogout(); 
                              onClose(); 
                            } else {
                              onOpenModal(item.id);
                            }
                          }} 
                          onMouseEnter={() => setHoveredItem(item.id)}
                          onMouseLeave={() => setHoveredItem(null)}
                          className="group flex items-center px-4 py-4 rounded-xl transition-all duration-200 relative"
                          style={{
                            backgroundColor: isActive ? '#4A4A4A' : (isHovered ? '#3A3A3A' : 'transparent'),
                            minHeight: '60px' // Área táctil más grande para móvil
                          }}
                        >
                          {/* Indicador de página activa */}
                          {isActive && (
                            <div className="absolute left-0 top-2 bottom-2 w-1 rounded-r-full" style={{ backgroundColor: '#EAEAEA' }}></div>
                          )}
                          
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center mr-3 transition-colors duration-200 ${
                            item.isUpdateAction ? 'bg-gradient-to-r from-blue-500 to-purple-600' :
                            item.isLoading ? 'bg-gradient-to-r from-gray-400 to-gray-500' : ''
                          }`}
                            style={{
                              backgroundColor: item.isUpdateAction ? undefined : 
                                               item.isLoading ? undefined :
                                               isActive ? '#595959' : '#3A3A3A'
                            }}
                          >
                            {item.isLoading ? (
                              // ✨ Spinner de carga elegante
                              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                            ) : (
                              <Icon 
                                name={iconConfig.icon} 
                                size={20} 
                                style={{ 
                                  color: item.isUpdateAction ? '#FFFFFF' :
                                         isActive ? '#FFFFFF' : 
                                         (isLogout ? '#F87171' : '#D0D0D0')
                                }}
                              />
                            )}
                            {item.hasBadge && (item.badgeCount > 0 || item.badgeText) && !item.isLoading && (
                              <span className={`absolute -top-1 -right-1 text-xs rounded-full flex items-center justify-center font-medium min-w-[20px] h-5 px-1 shadow-sm ${
                                item.isUpdateAction ? 'bg-white text-blue-600 animate-pulse' : 'bg-red-600 text-white'
                              }`}>
                                {item.badgeCount || item.badgeText}
                              </span>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className={`font-medium text-sm transition-colors duration-200 ${
                              item.isUpdateAction ? 'text-white font-bold' : ''
                            }`}
                              style={{ 
                                color: item.isUpdateAction ? '#FFFFFF' :
                                       isActive ? '#FFFFFF' : 
                                       (isLogout ? '#F87171' : '#EAEAEA')
                              }}
                            >
                              {item.text}
                              {item.isUpdateAction && (
                                <span className="ml-2 text-xs bg-white/20 px-2 py-0.5 rounded-full">¡Nuevo!</span>
                              )}
                            </p>
                            {item.description && (
                              <p className={`text-xs mt-0.5 transition-colors duration-200 ${
                                item.isUpdateAction ? 'text-blue-100' : ''
                              }`}
                                style={{ 
                                  color: item.isUpdateAction ? '#E0E7FF' :
                                         isActive ? '#D0D0D0' : '#A0A0A0'
                                }}
                              >{item.description}</p>
                            )}
                          </div>
                          <Icon 
                            name="chevronRight" 
                            size={16} 
                            className="flex-shrink-0 transition-all duration-200"
                            style={{ 
                              color: isActive ? '#FFFFFF' : '#808080',
                              transform: isActive ? 'translateX(2px)' : 'none'
                            }}
                          />
                        </a>
                      </li>
                    );
                  })}
                </ul>
              </nav>
              
              {/* Separador */}
              <div className="my-6 h-px" style={{ backgroundColor: '#404040' }}></div>
              
              {/* Footer del menú */}
              <div className="px-4 pb-6">
                <div className="rounded-xl p-4 text-center" style={{ backgroundColor: '#3A3A3A', border: '1px solid #4A4A4A' }}>
                  <Icon name="mapPin" size={24} style={{ color: '#A0A0A0' }} className="mx-auto mb-2" />
                  <p className="text-sm font-medium" style={{ color: '#D0D0D0' }}>Gestor de Territorios</p>
                  <p className="text-xs mt-0.5" style={{ color: '#808080' }}>Versión {CURRENT_VERSION}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Estilos de animación */}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}} />
    </>
  );
};

export default MobileMenu; 