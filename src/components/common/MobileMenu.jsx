import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import Icon from './Icon';

const MobileMenu = ({ isOpen, onClose, menuItems, activeItem, onOpenModal, handleLogout }) => {
  const { currentUser, CURRENT_VERSION } = useApp();
  const [hoveredItem, setHoveredItem] = useState(null);
  
  // Iconos específicos para cada item con colores sutiles
  const menuIcons = {
    search: { icon: 'search', color: 'text-gray-600' },
    stats: { icon: 'barChart', color: 'text-gray-600' },
    reports: { icon: 'fileText', color: 'text-gray-600' },
    myProposals: { icon: 'edit', color: 'text-gray-600' },
    admin: { icon: 'settings', color: 'text-gray-600' },
    password: { icon: 'key', color: 'text-gray-600' },
    install: { icon: 'smartphone', color: 'text-gray-600' },
    updates: { icon: 'download', color: 'text-gray-600' },
    logout: { icon: 'logOut', color: 'text-red-600' }
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
        className={`fixed inset-y-0 right-0 w-full max-w-sm bg-white shadow-2xl z-50 transition-all duration-300 ease-out transform ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="h-full flex flex-col" style={{ touchAction: 'pan-y' }}>
          {/* Header minimalista */}
          <div className="bg-gray-900 p-6 flex-shrink-0">
            <button 
              onClick={onClose} 
              className="absolute top-6 right-6 p-2 text-gray-400 hover:text-white transition-colors duration-200"
            >
              <Icon name="x" size={24} />
            </button>
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 bg-gray-800 rounded-2xl flex items-center justify-center">
                <Icon name="user" size={28} className="text-gray-300" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">{currentUser ? currentUser.name : 'Usuario'}</h3>
                <span className="inline-flex items-center text-sm text-gray-400">
                  <Icon name={currentUser?.role === 'admin' ? 'shield' : 'users'} size={14} className="mr-1.5" />
                  {currentUser?.role === 'admin' ? 'Administrador' : 'Publicador'}
                </span>
              </div>
            </div>
          </div>
          
          {/* Contenido del menú */}
          <div className="flex-1 overflow-y-auto bg-gray-50" style={{ overscrollBehavior: 'contain', WebkitOverflowScrolling: 'touch' }}>
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
                            onOpenModal(item.id);
                            if (item.action) { 
                              item.action(); 
                              onClose(); 
                            } else if (item.isLogout) { 
                              handleLogout(); 
                              onClose(); 
                            } 
                          }} 
                          onMouseEnter={() => setHoveredItem(item.id)}
                          onMouseLeave={() => setHoveredItem(null)}
                          className={`group flex items-center px-4 py-3 rounded-xl transition-all duration-200 ${
                            isActive 
                              ? 'bg-gray-900 text-white' 
                              : isHovered
                                ? 'bg-gray-100'
                                : 'hover:bg-gray-100'
                          }`}
                        >
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center mr-3 transition-colors duration-200 ${
                            isActive
                              ? 'bg-gray-800' 
                              : 'bg-white'
                          }`}>
                            <Icon 
                              name={iconConfig.icon} 
                              size={20} 
                              className={`transition-colors duration-200 ${
                                isActive 
                                  ? 'text-gray-300' 
                                  : isLogout
                                    ? 'text-red-600'
                                    : iconConfig.color
                              }`}
                            />
                            {item.hasBadge && (item.badgeCount > 0 || item.badgeText) && (
                              <span className="absolute -top-1 -right-1 bg-red-600 text-white text-xs rounded-full flex items-center justify-center font-medium min-w-[20px] h-5 px-1 shadow-sm">
                                {item.badgeCount || item.badgeText}
                              </span>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className={`font-medium text-sm transition-colors duration-200 ${
                              isActive ? 'text-white' : isLogout ? 'text-red-600' : 'text-gray-900'
                            }`}>
                              {item.text}
                            </p>
                            {item.description && (
                              <p className={`text-xs mt-0.5 transition-colors duration-200 ${
                                isActive ? 'text-gray-300' : 'text-gray-500'
                              }`}>{item.description}</p>
                            )}
                          </div>
                          <Icon 
                            name="chevronRight" 
                            size={16} 
                            className={`flex-shrink-0 transition-all duration-200 ${
                              isActive 
                                ? 'text-gray-400 transform translate-x-0.5' 
                                : 'text-gray-300'
                            }`} 
                          />
                        </a>
                      </li>
                    );
                  })}
                </ul>
              </nav>
              
              {/* Separador */}
              <div className="my-6 h-px bg-gray-200"></div>
              
              {/* Footer del menú */}
              <div className="px-4 pb-6">
                <div className="bg-white border border-gray-200 rounded-xl p-4 text-center">
                  <Icon name="mapPin" size={24} className="text-gray-400 mx-auto mb-2" />
                  <p className="text-sm font-medium text-gray-700">Gestor de Territorios</p>
                  <p className="text-xs text-gray-500 mt-0.5">Versión {CURRENT_VERSION}</p>
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