import { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import Icon from '../common/Icon';

const UserListModal = ({ 
  isOpen, 
  onClose,
  userType = 'all' // 'admin', 'publisher', 'all'
}) => {
  const { users, currentUser } = useApp();
  const [searchTerm, setSearchTerm] = useState('');

  // Resetear búsqueda al cerrar
  useEffect(() => {
    if (!isOpen) {
      setSearchTerm('');
    }
  }, [isOpen]);

  // Filtrar usuarios según el tipo
  const getFilteredUsers = () => {
    let filteredUsers = [...users];
    
    // Filtrar por tipo de usuario
    if (userType === 'admin') {
      filteredUsers = filteredUsers.filter(u => u.role === 'admin');
    } else if (userType === 'publisher') {
      filteredUsers = filteredUsers.filter(u => u.role !== 'admin');
    }
    
    // Filtrar por búsqueda
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filteredUsers = filteredUsers.filter(user => 
        user.name?.toLowerCase().includes(term) ||
        user.accessCode?.toLowerCase().includes(term)
      );
    }
    
    return filteredUsers;
  };

  const filteredUsers = getFilteredUsers();
  const totalUsers = userType === 'admin' 
    ? users.filter(u => u.role === 'admin').length
    : userType === 'publisher'
    ? users.filter(u => u.role !== 'admin').length
    : users.length;

  // Título del modal según el tipo
  const getModalTitle = () => {
    if (userType === 'admin') return 'Administradores';
    if (userType === 'publisher') return 'Publicadores';
    return 'Todos los Usuarios';
  };

  // Color del tema según el tipo
  const getThemeColors = () => {
    if (userType === 'admin') {
      return {
        header: 'from-purple-600 to-violet-700',
        icon: 'from-purple-500 to-violet-600',
        badge: 'from-purple-600 to-violet-600',
        cardBg: 'from-purple-50 to-violet-100',
        borderColor: 'border-purple-200'
      };
    }
    return {
      header: 'from-blue-600 to-indigo-700',
      icon: 'from-blue-500 to-indigo-600',
      badge: 'from-blue-500 to-indigo-600',
      cardBg: 'from-blue-50 to-indigo-100',
      borderColor: 'border-blue-200'
    };
  };

  const theme = getThemeColors();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-white z-[9999]" style={{ zIndex: 9999 }}>
      {/* Header fijo */}
      <div className={`bg-gradient-to-r ${theme.header} text-white shadow-lg`}>
        <div className="px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className={`w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm`}>
                <Icon 
                  name={userType === 'admin' ? 'shield' : 'users'} 
                  className="text-2xl text-white" 
                />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold">{getModalTitle()}</h1>
                <p className="text-white/80 text-sm">
                  {totalUsers} {totalUsers === 1 ? 'usuario' : 'usuarios'} en total
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-10 h-10 bg-white/20 hover:bg-white/30 rounded-xl flex items-center justify-center transition-colors backdrop-blur-sm"
            >
              <Icon name="x" className="text-xl text-white" />
            </button>
          </div>
          
          {/* Barra de búsqueda en el header */}
          <div className="relative">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={`🔍 Buscar ${getModalTitle().toLowerCase()}...`}
              className="w-full px-4 py-3 pl-12 pr-12 bg-white/90 backdrop-blur-sm text-gray-800 rounded-xl placeholder-gray-500 focus:bg-white focus:ring-2 focus:ring-white/50 transition-all"
              autoFocus
            />
            <Icon 
              name="search" 
              className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-500 text-lg"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 p-1.5 hover:bg-gray-200 rounded-lg transition-colors"
              >
                <Icon name="x" className="text-gray-600 text-lg" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Contenido scrolleable */}
      <div className="h-[calc(100vh-180px)] overflow-y-auto bg-gray-50">
        <div className="px-4 sm:px-6 py-6">
          {/* Indicador de resultados */}
          {searchTerm && (
            <div className="mb-4 px-4 py-3 bg-blue-50 border border-blue-200 rounded-xl">
              <p className="text-sm text-blue-700 font-medium">
                {filteredUsers.length === 0 ? (
                  <>No se encontraron usuarios que coincidan con "<span className="font-bold">{searchTerm}</span>"</>
                ) : (
                  <>
                    Mostrando <span className="font-bold">{filteredUsers.length}</span> de {totalUsers} usuarios
                    {filteredUsers.length !== totalUsers && <> que coinciden con "<span className="font-bold">{searchTerm}</span>"</>}
                  </>
                )}
              </p>
            </div>
          )}

          {/* Lista de usuarios o mensaje vacío */}
          {filteredUsers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="w-24 h-24 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center mb-6 shadow-lg">
                <Icon name="users" className="text-4xl text-gray-400" />
              </div>
              <h3 className="text-2xl font-bold text-gray-800 mb-2">
                {searchTerm ? 'Sin resultados' : 'No hay usuarios'}
              </h3>
              <p className="text-gray-600 text-center max-w-md">
                {searchTerm 
                  ? `No se encontraron ${getModalTitle().toLowerCase()} que coincidan con tu búsqueda.`
                  : `Aún no hay ${getModalTitle().toLowerCase()} registrados en el sistema.`
                }
              </p>
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="mt-6 px-6 py-3 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition-colors font-medium"
                >
                  Limpiar búsqueda
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredUsers.map(user => {
                const isCurrentUser = user.id === currentUser?.id;
                const isAdmin = user.role === 'admin';
                
                // Estilos específicos para cada rol cuando se muestra la vista "all"
                const cardStyles = userType === 'all' 
                  ? (isAdmin 
                    ? {
                        cardBg: 'from-purple-50 to-violet-100',
                        borderColor: 'border-purple-300',
                        iconBg: 'from-purple-500 to-violet-600',
                        badge: 'from-purple-600 to-violet-600',
                        shadowColor: 'shadow-purple-200',
                        ringColor: 'ring-purple-400'
                      }
                    : {
                        cardBg: 'from-blue-50 to-indigo-100',
                        borderColor: 'border-blue-200',
                        iconBg: 'from-blue-500 to-indigo-600',
                        badge: 'from-blue-500 to-indigo-600',
                        shadowColor: 'shadow-blue-100',
                        ringColor: 'ring-blue-400'
                      })
                  : {
                      cardBg: theme.cardBg,
                      borderColor: theme.borderColor,
                      iconBg: theme.icon,
                      badge: theme.badge,
                      shadowColor: '',
                      ringColor: ''
                    };
                
                return (
                  <div 
                    key={user.id} 
                    className={`
                      bg-gradient-to-br ${cardStyles.cardBg} 
                      rounded-2xl shadow-md hover:shadow-xl 
                      transition-all duration-300 p-5 
                      border-2 ${cardStyles.borderColor} 
                      relative overflow-hidden
                      ${userType === 'all' && isAdmin ? 'ring-2 ring-purple-300 ring-opacity-50' : ''}
                      ${userType === 'all' ? (isAdmin ? 'hover:scale-105' : 'hover:scale-[1.02]') : 'hover:scale-[1.02]'}
                    `}
                  >
                    {/* Badge de rol con estrella para admin */}
                    <div className="absolute top-2 right-2">
                      <span className={`inline-flex items-center gap-1 bg-gradient-to-r ${cardStyles.badge} text-white px-3 py-1 rounded-full text-xs font-bold shadow-lg`}>
                        {isAdmin && <Icon name="star" className="text-xs" />}
                        {isAdmin ? 'ADMIN' : 'PUBLICADOR'}
                      </span>
                    </div>
                    
                    {/* Avatar/Icono con efectos mejorados */}
                    <div className="flex justify-center mb-4">
                      <div className={`
                        w-16 h-16 bg-gradient-to-r ${cardStyles.iconBg} 
                        rounded-full flex items-center justify-center shadow-lg
                        ${userType === 'all' && isAdmin ? 'animate-pulse' : ''}
                      `}>
                        <Icon 
                          name={isAdmin ? 'shield' : 'user'} 
                          className="text-white text-2xl" 
                        />
                      </div>
                    </div>
                    
                    {/* Información del usuario */}
                    <div className="text-center">
                      <h3 className="text-lg font-bold text-gray-900 mb-1">
                        {user.name}
                      </h3>
                      <p className="text-sm text-gray-600 font-medium mb-3">
                        @{user.accessCode}
                      </p>
                      
                      {/* Indicador si es el usuario actual */}
                      {isCurrentUser && (
                        <div className="inline-flex items-center gap-1 bg-green-100 text-green-800 px-3 py-1 rounded-full text-xs font-medium">
                          <Icon name="user" className="text-xs" />
                          <span>Tú</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default UserListModal;