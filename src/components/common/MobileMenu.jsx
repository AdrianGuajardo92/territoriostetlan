import React, { useEffect, useState } from 'react';
import { useApp } from '../../context/AppContext';
import Icon from './Icon';

const MobileMenu = ({ isOpen, onClose, menuItems, activeItem, onOpenModal, handleLogout }) => {
  const { currentUser, CURRENT_VERSION } = useApp();
  const [hoveredItem, setHoveredItem] = useState(null);

  // Bloquear scroll del body cuando el menú está abierto
  useEffect(() => {
    if (isOpen) {
      const scrollY = window.scrollY;
      document.body.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = '100%';
    } else {
      const scrollY = document.body.style.top;
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.width = '';
      if (scrollY) {
        window.scrollTo(0, parseInt(scrollY || '0') * -1);
      }
    }
    return () => {
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.width = '';
    };
  }, [isOpen]);

  // Filtrar items: separar logout del resto
  const filteredItems = menuItems.filter(
    item => !(item.id === 'myProposals' && currentUser?.role === 'admin') && item.id !== 'logout'
  );
  const logoutItem = menuItems.find(item => item.id === 'logout');

  return (
    <>
      {/* Overlay */}
      <div
        className="mobile-menu-overlay fixed inset-0 z-40"
        style={{
          backgroundColor: 'rgba(0, 0, 0, 0.4)',
          backdropFilter: 'blur(2px)',
          opacity: isOpen ? 1 : 0,
          pointerEvents: isOpen ? 'auto' : 'none',
          touchAction: 'none',
        }}
        onClick={() => {
          const urlParams = new URLSearchParams(window.location.hash.split('?')[1] || '');
          const hasModal = urlParams.get('modal');
          if (!hasModal) {
            onClose();
          }
        }}
        onTouchMove={(e) => e.preventDefault()}
      />

      {/* Panel del menú */}
      <div
        data-menu-panel="true"
        className="mobile-menu-panel fixed inset-y-0 right-0 z-50"
        style={{
          width: '80%',
          maxWidth: '320px',
          transform: isOpen ? 'translateX(0)' : 'translateX(100%)',
        }}
      >
        <div className="h-full flex flex-col bg-slate-100 shadow-2xl">

          {/* Header - de borde a borde */}
          <div className="p-5 bg-slate-700">
            <div className="flex items-center gap-4">
              {/* Avatar */}
              <div className="w-14 h-14 rounded-2xl bg-slate-600 flex items-center justify-center border-2 border-slate-500">
                <Icon name="user" size={28} className="text-slate-300" />
              </div>
              <div className="flex-1">
                <h2 className="text-white font-semibold text-lg">
                  {currentUser ? currentUser.name : 'Usuario'}
                </h2>
                <p className="text-slate-400 text-sm">
                  {currentUser?.role === 'admin' ? 'Administrador' : 'Publicador'}
                </p>
              </div>
              {/* Botón cerrar */}
              <button
                onClick={onClose}
                className="w-9 h-9 rounded-xl bg-slate-600 hover:bg-slate-500 flex items-center justify-center transition-all"
              >
                <Icon name="x" size={20} className="text-slate-300" />
              </button>
            </div>
          </div>

          {/* Menu Items como cards */}
          <nav className="flex-1 px-3 pb-3 space-y-2 overflow-auto">
            {filteredItems.map((item, index) => {
              const isHovered = hoveredItem === index;

              return (
                <button
                  key={item.id}
                  onMouseEnter={() => setHoveredItem(index)}
                  onMouseLeave={() => setHoveredItem(null)}
                  onTouchStart={() => setHoveredItem(index)}
                  onTouchEnd={() => setHoveredItem(null)}
                  onClick={() => {
                    if (item.action) {
                      item.action();
                      if (!item.isUpdateAction) {
                        onClose();
                      }
                    } else {
                      const modalId = item.view || item.modal || item.id;
                      onOpenModal(modalId);
                    }
                  }}
                  className={`w-full p-4 rounded-2xl text-left transition-all duration-200 bg-white shadow-sm ${
                    isHovered ? 'shadow-md scale-[1.02]' : 'hover:shadow'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    {/* Icono con fondo cuadrado redondeado */}
                    <div className="relative">
                      <div className={`w-11 h-11 rounded-xl flex items-center justify-center transition-all duration-200 ${
                        isHovered ? 'bg-slate-700 text-white' : 'bg-slate-100 text-slate-500'
                      }`}>
                        <Icon
                          name={item.icon}
                          size={20}
                          className={isHovered ? 'text-white' : 'text-slate-500'}
                        />
                      </div>
                      {/* Badge */}
                      {item.hasBadge && (item.badgeCount > 0 || item.badgeText) && (
                        <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 text-[10px] font-semibold bg-red-500 text-white rounded-full flex items-center justify-center shadow-sm">
                          {item.badgeCount || item.badgeText}
                        </span>
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-sm text-slate-700">{item.text}</p>
                      {item.description && (
                        <p className="text-slate-400 text-xs mt-0.5">{item.description}</p>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}

            {/* Logout como card separada */}
            {logoutItem && (
              <button
                onClick={() => {
                  handleLogout();
                  onClose();
                }}
                className="w-full p-4 rounded-2xl text-left transition-all duration-200 bg-white shadow-sm hover:shadow-md hover:bg-red-50 group"
              >
                <div className="flex items-center gap-4">
                  <div className="w-11 h-11 rounded-xl bg-red-100 group-hover:bg-red-500 flex items-center justify-center transition-all">
                    <Icon name="logOut" size={20} className="text-red-500 group-hover:text-white" />
                  </div>
                  <p className="text-red-500 font-medium text-sm">Cerrar Sesión</p>
                </div>
              </button>
            )}
          </nav>

          {/* Footer como card */}
          <div className="mx-3 mb-3 p-4 bg-white rounded-2xl text-center shadow-sm">
            <Icon name="mapPin" size={20} className="text-slate-400 mx-auto mb-1" />
            <p className="text-slate-500 text-sm font-medium">Gestor de Territorios</p>
            <p className="text-slate-400 text-xs">v{CURRENT_VERSION}</p>
          </div>
        </div>
      </div>
    </>
  );
};

export default MobileMenu;
