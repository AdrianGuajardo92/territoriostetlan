import { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { useToast } from '../../hooks/useToast';
import Icon from '../common/Icon';
import ConfirmDialog from '../common/ConfirmDialog';

const UserManagementModal = ({ 
  isOpen, 
  onClose
}) => {
  const { 
    users, 
    handleCreateUser, 
    handleUpdateUser, 
    handleDeleteUser, 
    handleResetUserPassword,
    currentUser 
  } = useApp();
  const { showToast } = useToast();

  // Estados del modal
  const [activeView, setActiveView] = useState('list'); // 'list', 'create', 'edit'
  const [selectedUser, setSelectedUser] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [searchTerm, setSearchTerm] = useState(''); // Estado para búsqueda
  
  // Estados de confirmación
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showPasswordReset, setShowPasswordReset] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);
  const [userToResetPassword, setUserToResetPassword] = useState(null);

  // Estados del formulario
  const [formData, setFormData] = useState({
    name: '',
    accessCode: '',
    password: '',
    role: 'user'
  });

  const [newPassword, setNewPassword] = useState('');

  // Resetear estados al cerrar
  useEffect(() => {
    if (!isOpen) {
      setActiveView('list');
      setSelectedUser(null);
      setFormData({ name: '', accessCode: '', password: '', role: 'user' });
      setNewPassword('');
      setShowDeleteConfirm(false);
      setShowPasswordReset(false);
      setUserToDelete(null);
      setUserToResetPassword(null);
      setSearchTerm(''); // Resetear búsqueda
    }
  }, [isOpen]);

  // Función de filtrado de usuarios por búsqueda
  const filterUsers = (userList) => {
    if (!searchTerm.trim()) return userList;
    
    const term = searchTerm.toLowerCase().trim();
    return userList.filter(user => {
      return (
        user.name?.toLowerCase().includes(term) ||
        user.accessCode?.toLowerCase().includes(term)
      );
    });
  };

  // Separar usuarios por rol y aplicar filtro de búsqueda
  const allAdminUsers = users.filter(u => u.role === 'admin');
  const allPublisherUsers = users.filter(u => u.role !== 'admin');
  
  const adminUsers = filterUsers(allAdminUsers);
  const publisherUsers = filterUsers(allPublisherUsers);
  
  // Calcular totales para mostrar resultados de búsqueda
  const totalFiltered = adminUsers.length + publisherUsers.length;
  const totalUsers = allAdminUsers.length + allPublisherUsers.length;

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (isProcessing) return;

    // Validaciones
    if (!formData.name.trim()) {
      showToast('El nombre es requerido', 'error');
      return;
    }
    if (!formData.accessCode.trim()) {
      showToast('El usuario es requerido', 'error');
      return;
    }
    if (activeView === 'create' && !formData.password.trim()) {
      showToast('La contraseña es requerida', 'error');
      return;
    }

    setIsProcessing(true);
    try {
      if (activeView === 'create') {
        await handleCreateUser(formData);
      } else if (activeView === 'edit' && selectedUser) {
        const updates = {
          name: formData.name,
          accessCode: formData.accessCode,
          role: formData.role
        };
        // Solo incluir contraseña si se especificó una nueva
        if (formData.password.trim()) {
          updates.password = formData.password;
        }
        await handleUpdateUser(selectedUser.id, updates);
      }
      
      // Volver a la lista
      setActiveView('list');
      setSelectedUser(null);
      setFormData({ name: '', accessCode: '', password: '', role: 'user' });
    } catch (error) {
      // El error ya se maneja en las funciones del contexto
    } finally {
      setIsProcessing(false);
    }
  };

  const handleEdit = (user) => {
    setSelectedUser(user);
    setFormData({
      name: user.name,
      accessCode: user.accessCode,
      password: '', // No mostrar contraseña actual
      role: user.role || 'user'
    });
    setActiveView('edit');
  };

  const handleDeleteClick = (user) => {
    console.log('🗑️ Abriendo diálogo de confirmación para eliminar:', user.name);
    setUserToDelete(user);
    setShowDeleteConfirm(true);
  };

  const handleConfirmDelete = async () => {
    if (!userToDelete || isProcessing) return;
    
    setIsProcessing(true);
    try {
      await handleDeleteUser(userToDelete.id);
      setShowDeleteConfirm(false);
      setUserToDelete(null);
    } catch (error) {
      // El error ya se maneja en la función del contexto
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePasswordResetClick = (user) => {
    setUserToResetPassword(user);
    setNewPassword('');
    setShowPasswordReset(true);
  };

  const handleConfirmPasswordReset = async () => {
    if (!userToResetPassword || !newPassword.trim() || isProcessing) return;
    
    setIsProcessing(true);
    try {
      await handleResetUserPassword(userToResetPassword.id, newPassword.trim());
      setShowPasswordReset(false);
      setUserToResetPassword(null);
      setNewPassword('');
    } catch (error) {
      // El error ya se maneja en la función del contexto
    } finally {
      setIsProcessing(false);
    }
  };

  const renderUserCard = (user, isAdmin = false) => {
    const isCurrentUser = user.id === currentUser?.id;

    return (
      <div key={user.id} className="bg-white rounded-xl shadow-sm p-4 border border-gray-200 hover:shadow-md transition-all duration-200">
        {/* Header de la tarjeta */}
        <div className="flex items-start gap-3 mb-4">
          <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center flex-shrink-0">
            <Icon name="user" className="text-gray-600 text-lg" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h4 className="text-base font-semibold text-gray-900 truncate">
                {user.name}
              </h4>
              {isCurrentUser && (
                <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded text-xs font-medium whitespace-nowrap">
                  Tú
                </span>
              )}
            </div>
            <p className="text-sm text-gray-500 flex items-center mb-2">
              <Icon name="user" className="mr-1 text-xs" />
              <span className="truncate">{user.accessCode}</span>
            </p>
            <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
              isAdmin ? 'bg-slate-800 text-white' : 'bg-blue-100 text-blue-700'
            }`}>
              {isAdmin ? 'Admin' : 'Publicador'}
            </span>
          </div>
        </div>

        {/* Botones de acción - Estilo Outline/Ghost */}
        <div className="flex gap-2 border-t border-gray-100 pt-3 mt-3">
          <button
            onClick={() => handleEdit(user)}
            className="flex-1 flex items-center justify-center gap-2 py-2 px-3 border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 rounded-lg transition-colors text-sm font-medium"
          >
            <Icon name="edit" className="w-4 h-4" />
            <span>Editar</span>
          </button>
          <button
            onClick={() => handlePasswordResetClick(user)}
            className="flex-1 flex items-center justify-center gap-2 py-2 px-3 border border-amber-300 bg-white text-amber-700 hover:bg-amber-50 rounded-lg transition-colors text-sm font-medium"
          >
            <Icon name="key" className="w-4 h-4" />
            <span>Reset</span>
          </button>
          {!isCurrentUser && (
            <button
              onClick={() => handleDeleteClick(user)}
              className="flex items-center justify-center py-2 px-3 border border-red-300 bg-white text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            >
              <Icon name="trash" className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    );
  };

  const renderListView = () => (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gray-100 rounded-xl flex items-center justify-center">
            <Icon name="users-cog" className="text-gray-600 text-lg sm:text-xl" />
          </div>
          <div>
            <h3 className="text-xl sm:text-2xl font-semibold text-gray-800">Gestión de Usuarios</h3>
            <p className="text-gray-500 text-sm">
              {users.length} usuario{users.length !== 1 ? 's' : ''} registrado{users.length !== 1 ? 's' : ''} en el sistema
            </p>
          </div>
        </div>

        <button
          onClick={() => setActiveView('create')}
          className="flex items-center justify-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium w-full sm:w-auto"
        >
          <Icon name="userPlus" className="text-lg" />
          <span>Nuevo Usuario</span>
        </button>
      </div>

      {/* Barra de búsqueda */}
      <div className="relative">
        <div className="relative">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="🔍 Buscar por nombre o usuario..."
            className="w-full px-4 py-3 pl-12 pr-12 bg-white border-2 border-gray-300 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all text-gray-700 placeholder-gray-400"
          />
          <Icon 
            name="search" 
            className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 text-lg"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 p-1 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <Icon name="x" className="text-gray-500 text-lg" />
            </button>
          )}
        </div>
        
        {/* Indicador de resultados de búsqueda */}
        {searchTerm && (
          <div className="mt-2 px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-700 font-medium">
              {totalFiltered === 0 ? (
                <>No se encontraron usuarios que coincidan con "<span className="font-bold">{searchTerm}</span>"</>
              ) : (
                <>
                  Mostrando <span className="font-bold">{totalFiltered}</span> de {totalUsers} usuarios
                  {totalFiltered !== totalUsers && <> que coinciden con "<span className="font-bold">{searchTerm}</span>"</>}
                </>
              )}
            </p>
          </div>
        )}
      </div>

      {/* Mensaje cuando no hay resultados de búsqueda */}
      {searchTerm && totalFiltered === 0 && (
        <div className="flex flex-col items-center justify-center py-12">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
            <Icon name="search" className="text-2xl text-gray-400" />
          </div>
          <h4 className="text-lg font-semibold text-gray-800 mb-2">Sin resultados</h4>
          <p className="text-gray-500 text-center">
            No se encontraron usuarios que coincidan con "<span className="font-medium">{searchTerm}</span>"
          </p>
          <button
            onClick={() => setSearchTerm('')}
            className="mt-4 px-4 py-2 border border-gray-300 bg-white text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Limpiar búsqueda
          </button>
        </div>
      )}

      {/* Sección de Administradores */}
      {(totalFiltered > 0 || !searchTerm) && adminUsers.length > 0 && (
        <div>
          <div className="flex items-center mb-4">
            <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center mr-3">
              <Icon name="shield" className="text-gray-600 text-sm" />
            </div>
            <h4 className="text-lg font-semibold text-gray-800">Administradores</h4>
            <span className="ml-2 bg-gray-100 text-gray-600 px-2 py-0.5 rounded text-xs font-medium">
              {adminUsers.length}
            </span>
          </div>
          
          <div className="grid grid-cols-1 gap-3 mb-8">
            {adminUsers.map(user => renderUserCard(user, true))}
          </div>
        </div>
      )}

      {/* Sección de Publicadores */}
      {(totalFiltered > 0 || !searchTerm) && (
        <div>
        <div className="flex items-center mb-4">
          <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center mr-3">
            <Icon name="users" className="text-gray-600 text-sm" />
          </div>
          <h4 className="text-lg font-semibold text-gray-800">Publicadores</h4>
          <span className="ml-2 bg-gray-100 text-gray-600 px-2 py-0.5 rounded text-xs font-medium">
            {publisherUsers.length}
          </span>
        </div>
        
        {publisherUsers.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center max-w-md">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Icon name="user" className="text-2xl text-gray-400" />
              </div>
              <h4 className="text-lg font-semibold text-gray-800 mb-2">No hay publicadores</h4>
              <p className="text-gray-500">Aún no se han registrado publicadores en el sistema.</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3">
            {publisherUsers.map(user => renderUserCard(user, false))}
          </div>
        )}
      </div>
      )}
    </div>
  );

  const renderFormView = () => (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => setActiveView('list')}
          className="w-8 h-8 sm:w-10 sm:h-10 bg-gray-100 hover:bg-gray-200 rounded-lg flex items-center justify-center transition-colors"
        >
          <Icon name="arrowLeft" className="text-gray-600 text-sm sm:text-base" />
        </button>
        <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gray-100 rounded-lg flex items-center justify-center">
          <Icon name={activeView === 'create' ? 'plus' : 'edit'} className="text-gray-600 text-lg sm:text-xl" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-lg sm:text-2xl font-semibold text-gray-800 truncate">
            {activeView === 'create' ? 'Crear Nuevo Usuario' : 'Editar Usuario'}
          </h3>
          <p className="text-gray-500 text-sm truncate">
            {activeView === 'create'
              ? 'Completa los datos para crear un nuevo usuario'
              : `Editando: ${selectedUser?.name}`
            }
          </p>
        </div>
      </div>

      {/* Formulario - Optimizado para móvil */}
      <form onSubmit={handleFormSubmit} className="bg-white rounded-2xl shadow-lg p-4 sm:p-6 space-y-4 sm:space-y-6">
        <div className="grid grid-cols-1 gap-4 sm:gap-6">
          {/* Nombre */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Icon name="user" className="inline mr-2" />
              Nombre Completo
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              placeholder="Ej: Juan Pérez"
              required
            />
          </div>

          {/* Usuario */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Icon name="user" className="inline mr-2" />
              Usuario
            </label>
            <input
              type="text"
              value={formData.accessCode}
              onChange={(e) => setFormData(prev => ({ ...prev, accessCode: e.target.value }))}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              placeholder="Ej: juan.perez"
              required
            />
          </div>

          {/* Contraseña */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Icon name="lock" className="inline mr-2" />
              Contraseña {activeView === 'edit' && '(dejar vacío para mantener actual)'}
            </label>
            <input
              type="password"
              value={formData.password}
              onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              placeholder={activeView === 'create' ? 'Contraseña segura' : 'Nueva contraseña (opcional)'}
              required={activeView === 'create'}
            />
          </div>

          {/* Rol */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Icon name="shield" className="inline mr-2" />
              Rol del Usuario
            </label>
            <select
              value={formData.role}
              onChange={(e) => setFormData(prev => ({ ...prev, role: e.target.value }))}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            >
              <option value="user">Publicador</option>
              <option value="admin">Administrador</option>
            </select>
          </div>
        </div>

        {/* Botones */}
        <div className="flex flex-col sm:flex-row sm:justify-end gap-3 pt-4 sm:pt-6 border-t border-gray-200">
          <button
            type="button"
            onClick={() => setActiveView('list')}
            className="px-4 py-2.5 border border-gray-300 bg-white text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium order-2 sm:order-1"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={isProcessing}
            className="px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 order-1 sm:order-2"
          >
            {isProcessing ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Procesando...
              </>
            ) : (
              <>
                <Icon name={activeView === 'create' ? 'plus' : 'save'} />
                {activeView === 'create' ? 'Crear Usuario' : 'Guardar Cambios'}
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[9999] flex items-center justify-center p-4" style={{ zIndex: 9999 }}>
        <div className="bg-gradient-to-br from-gray-50 to-white rounded-3xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden" style={{ position: 'relative', zIndex: 10000 }}>
          {/* Header del modal - Optimizado para móvil */}
          <div className="bg-blue-600 text-white p-4 sm:p-6 flex items-center justify-between">
            <div className="flex items-center gap-2 sm:gap-3">
              <Icon name="users-cog" className="text-xl sm:text-2xl" />
              <h2 className="text-lg sm:text-2xl font-bold">Gestión de Usuarios</h2>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 sm:w-10 sm:h-10 bg-white/20 hover:bg-white/30 rounded-xl flex items-center justify-center transition-colors"
            >
              <Icon name="times" className="text-lg sm:text-xl" />
            </button>
          </div>

          {/* Contenido - Optimizado para móvil */}
          <div className="p-4 sm:p-6 max-h-[calc(90vh-100px)] overflow-y-auto">
            {activeView === 'list' ? renderListView() : renderFormView()}
          </div>
        </div>
      </div>

      {/* Modal de confirmación para eliminar */}
      <ConfirmDialog
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleConfirmDelete}
        title="¿Eliminar usuario?"
        message={`¿Estás seguro de que quieres eliminar a "${userToDelete?.name}"? Esta acción no se puede deshacer.`}
        confirmText="Sí, eliminar"
        cancelText="Cancelar"
        type="danger"
        isProcessing={isProcessing}
      />

      {/* Modal para resetear contraseña */}
      {showPasswordReset && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[10001] flex items-center justify-center p-4" style={{ zIndex: 10001 }}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-amber-100 rounded-lg flex items-center justify-center">
                  <Icon name="key" className="text-amber-600 text-xl" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-800">Resetear Contraseña</h3>
                  <p className="text-gray-500 text-sm">Usuario: {userToResetPassword?.name}</p>
                </div>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nueva Contraseña
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all"
                  placeholder="Ingresa la nueva contraseña"
                  required
                />
              </div>

              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowPasswordReset(false)}
                  className="px-4 py-2.5 border border-gray-300 bg-white text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleConfirmPasswordReset}
                  disabled={!newPassword.trim() || isProcessing}
                  className="px-4 py-2.5 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isProcessing ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Actualizando...
                    </>
                  ) : (
                    <>
                      <Icon name="save" />
                      Actualizar
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default UserManagementModal; 