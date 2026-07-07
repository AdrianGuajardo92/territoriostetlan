import { useState, useEffect, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { useBackHandler } from '../../hooks/useBackHandler';
import { useToast } from '../../hooks/useToast';
import Icon from '../common/Icon';
import { filterPioneerUsers, isPioneerUser } from '../../config/congregationPioneers';
import { copiarAlPortapapeles } from '../../utils/clipboard';

const UserListModal = ({
  isOpen,
  onClose,
  userType = 'all', // 'admin', 'publisher', 'pioneer', 'all'
  modalId
}) => {
  // Este modal no usa <Modal>; registramos directamente. El modalId se deriva
  // del userType cuando no viene del padre, para que los 3 usos coexistan.
  useBackHandler({ isOpen, onClose, id: modalId || `user-list-${userType}-modal` });

  const { users, currentUser } = useApp();
  const { showToast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [pioneersCopied, setPioneersCopied] = useState(false);
  const copyFeedbackTimeoutRef = useRef(null);

  // Resetear búsqueda al cerrar
  useEffect(() => {
    if (!isOpen) {
      setSearchTerm('');
      setPioneersCopied(false);
    }
  }, [isOpen]);

  useEffect(() => {
    return () => {
      if (copyFeedbackTimeoutRef.current) {
        clearTimeout(copyFeedbackTimeoutRef.current);
      }
    };
  }, []);

  const getAllPioneersSorted = () =>
    filterPioneerUsers(users)
      .slice()
      .sort((a, b) => (a.name || '').localeCompare(b.name || '', 'es'));

  const handleCopyPioneersList = async () => {
    const allPioneers = getAllPioneersSorted();

    if (allPioneers.length === 0) {
      showToast('No hay precursores para copiar', 'error');
      return;
    }

    const text = allPioneers
      .map((user, index) => `${index + 1}. ${user.name || 'Sin nombre'}`)
      .join('\n');

    try {
      const copied = await copiarAlPortapapeles(text);
      setPioneersCopied(true);
      showToast(
        copied
          ? `Lista de ${allPioneers.length} precursores copiada`
          : 'Revisa el texto en el diálogo para copiar manualmente',
        copied ? 'success' : 'info'
      );

      if (copyFeedbackTimeoutRef.current) {
        clearTimeout(copyFeedbackTimeoutRef.current);
      }
      copyFeedbackTimeoutRef.current = setTimeout(() => {
        setPioneersCopied(false);
      }, 2200);
    } catch (error) {
      console.error('Error copiando lista de precursores:', error);
      showToast('No se pudo copiar la lista de precursores', 'error');
    }
  };

  // Filtrar usuarios según el tipo
  const getFilteredUsers = () => {
    let filteredUsers = [...users];
    
    // Filtrar por tipo de usuario
    if (userType === 'admin') {
      filteredUsers = filteredUsers.filter(u => u.role === 'admin');
    } else if (userType === 'pioneer') {
      filteredUsers = filterPioneerUsers(filteredUsers);
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
    : userType === 'pioneer'
    ? filterPioneerUsers(users).length
    : users.length;

  // Título del modal según el tipo
  const getModalTitle = () => {
    if (userType === 'admin') return 'Administradores';
    if (userType === 'publisher') return 'Publicadores';
    if (userType === 'pioneer') return 'Precursores regulares';
    return 'Todos los Usuarios';
  };

  const getModalSubtitle = () => {
    if (userType === 'pioneer') {
      return 'Lista informativa de precursores regulares';
    }
    if (userType === 'publisher') {
      return 'Todos los publicadores de la congregación';
    }
    return null;
  };

  const getHeaderGradient = () => {
    if (userType === 'admin') return 'from-purple-600 to-violet-700';
    if (userType === 'pioneer') return 'from-slate-600 to-gray-700';
    return 'from-blue-600 to-indigo-700';
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-white z-[9999]" style={{ zIndex: 9999 }}>
      {/* Header fijo */}
      <div className={`bg-gradient-to-r ${getHeaderGradient()} text-white shadow-lg`}>
        <div className="px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className={`w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm`}>
                <Icon 
                  name={userType === 'admin' ? 'shield' : userType === 'pioneer' ? 'star' : 'users'} 
                  className="text-2xl text-white" 
                />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold">{getModalTitle()}</h1>
                <p className="text-white/80 text-sm">
                  {getModalSubtitle() ? (
                    <>{getModalSubtitle()} · {totalUsers} {totalUsers === 1 ? 'usuario' : 'usuarios'}</>
                  ) : (
                    <>{totalUsers} {totalUsers === 1 ? 'usuario' : 'usuarios'} en total</>
                  )}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {userType === 'pioneer' && (
                <button
                  type="button"
                  onClick={handleCopyPioneersList}
                  aria-label="Copiar lista de precursores"
                  className="min-h-[44px] min-w-[44px] p-2.5 rounded-xl transition-all hover:scale-105 bg-white/20 hover:bg-white/30 backdrop-blur-sm flex items-center justify-center"
                >
                  <Icon
                    name={pioneersCopied ? 'checkCircle' : 'copy'}
                    className="text-white text-lg"
                  />
                </button>
              )}
              <button
                type="button"
                onClick={onClose}
                aria-label="Volver"
                className="min-h-[44px] min-w-[44px] p-2.5 rounded-xl transition-all hover:scale-105 bg-white/20 hover:bg-white/30 backdrop-blur-sm flex items-center justify-center"
              >
                <i className="fas fa-arrow-left text-white text-lg"></i>
              </button>
            </div>
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
                const isPioneer = isPioneerUser(user);
                const showRoleBadges = userType === 'publisher';

                return (
                  <div
                    key={user.id}
                    className="bg-white rounded-2xl shadow-sm hover:shadow-md transition-shadow p-5 border border-slate-200"
                  >
                    <div className="flex justify-center mb-4">
                      <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center">
                        <Icon name="user" className="text-slate-600 text-2xl" />
                      </div>
                    </div>

                    <div className="text-center">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {user.name}
                      </h3>

                      <div className="mt-2 flex flex-wrap items-center justify-center gap-1.5">
                        {isCurrentUser && (
                          <span className="inline-flex items-center bg-slate-100 text-slate-700 px-3 py-1 rounded-full text-xs font-medium">
                            Tú
                          </span>
                        )}
                        {showRoleBadges && isAdmin && (
                          <span className="px-2 py-0.5 rounded text-xs font-medium bg-slate-800 text-white">
                            Administrador
                          </span>
                        )}
                        {showRoleBadges && isPioneer && (
                          <span className="px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-700">
                            Precursor
                          </span>
                        )}
                      </div>
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