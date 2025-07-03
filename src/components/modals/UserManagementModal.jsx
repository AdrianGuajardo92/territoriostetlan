import { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { useToast } from '../../hooks/useToast';
import { useModalHistory } from '../../hooks/useModalHistory';
import Icon from '../common/Icon';
import ConfirmDialog from '../common/ConfirmDialog';

const UserManagementModal = ({ 
  isOpen, 
  onClose, 
  modalId = 'user-management-modal' 
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
  const { closeModal } = useModalHistory(isOpen, onClose, modalId);

  // Estados del modal
  const [activeView, setActiveView] = useState('list'); // 'list', 'create', 'edit'
  const [selectedUser, setSelectedUser] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  
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
    }
  }, [isOpen]);

  // Separar usuarios por rol
  const adminUsers = users.filter(u => u.role === 'admin');
  const publisherUsers = users.filter(u => u.role !== 'admin');

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
    const cardBg = isAdmin ? 'from-purple-50 to-violet-100' : 'from-blue-50 to-indigo-100';
    const iconBg = isAdmin ? 'from-purple-500 to-violet-600' : 'from-blue-500 to-indigo-600';
    const borderColor = isAdmin ? 'border-purple-200' : 'border-blue-200';
    const badgeColor = isAdmin ? 'from-purple-600 to-violet-600' : 'from-blue-500 to-indigo-600';
    
    return (
      <div key={user.id} className={`bg-gradient-to-br ${cardBg} rounded-2xl shadow-lg p-4 border-2 ${borderColor} hover:shadow-xl transition-all duration-300`}>
        {/* Header de la tarjeta - Optimizado para móvil */}
        <div className="flex items-start gap-3 mb-4">
          <div className={`w-12 h-12 bg-gradient-to-r ${iconBg} rounded-xl flex items-center justify-center shadow-lg flex-shrink-0`}>
            <Icon name={isAdmin ? "shield" : "user"} className="text-white text-lg" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h4 className="text-base font-bold text-gray-900 truncate">
                {user.name}
              </h4>
              {isCurrentUser && (
                <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap">
                  Tú
                </span>
              )}
            </div>
            <p className="text-sm text-gray-600 font-medium flex items-center mb-2">
              <Icon name="user" className="mr-1 text-xs" />
              <span className="truncate">{user.accessCode}</span>
            </p>
            <span className={`inline-block bg-gradient-to-r ${badgeColor} text-white px-2 py-1 rounded-full text-xs font-bold`}>
              {isAdmin ? 'ADMIN' : 'PUBLICADOR'}
            </span>
          </div>
        </div>

        {/* Botones de acción - Optimizado para móvil */}
        <div className="flex gap-1.5">
          <button
            onClick={() => handleEdit(user)}
            className="flex-1 flex items-center justify-center gap-1 py-2.5 px-2 bg-white/70 hover:bg-white border border-gray-200 text-gray-700 rounded-lg transition-colors text-sm font-medium"
          >
            <Icon name="edit" className="text-sm" />
            <span className="hidden sm:inline">Editar</span>
          </button>
          <button
            onClick={() => handlePasswordResetClick(user)}
            className="flex-1 flex items-center justify-center gap-1 py-2.5 px-2 bg-yellow-100 hover:bg-yellow-200 border border-yellow-200 text-yellow-700 rounded-lg transition-colors text-sm font-medium"
          >
            <Icon name="key" className="text-sm" />
            <span className="hidden sm:inline">Reset</span>
          </button>
          {!isCurrentUser && (
            <button
              onClick={() => handleDeleteClick(user)}
              className="flex items-center justify-center py-2.5 px-3 bg-red-100 hover:bg-red-200 border border-red-200 text-red-700 rounded-lg transition-colors text-sm font-medium"
            >
              <Icon name="trash" className="text-sm" />
            </button>
          )}
        </div>
      </div>
    );
  };

  const renderListView = () => (
    <div className="space-y-6">
      {/* Header - Optimizado para móvil */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
            <Icon name="users-cog" className="text-white text-lg sm:text-xl" />
          </div>
          <div>
            <h3 className="text-xl sm:text-2xl font-bold text-gray-800">Gestión de Usuarios</h3>
            <p className="text-gray-600 text-sm">
              {users.length} usuario{users.length !== 1 ? 's' : ''} registrado{users.length !== 1 ? 's' : ''} en el sistema
            </p>
          </div>
        </div>
        
        <button
          onClick={() => setActiveView('create')}
          className="flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl hover:from-green-600 hover:to-emerald-700 transition-all font-medium shadow-lg w-full sm:w-auto"
        >
          <Icon name="plus" className="text-lg" />
          <span>Nuevo Usuario</span>
        </button>
      </div>

      {/* Sección de Administradores */}
      {adminUsers.length > 0 && (
        <div>
          <div className="flex items-center mb-4">
            <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-violet-600 rounded-lg flex items-center justify-center mr-3">
              <Icon name="shield" className="text-white text-sm" />
            </div>
            <h4 className="text-lg font-bold text-gray-800">Administradores</h4>
            <span className="ml-2 bg-purple-100 text-purple-800 px-2 py-1 rounded-full text-xs font-medium">
              {adminUsers.length}
            </span>
          </div>
          
          <div className="grid grid-cols-1 gap-3 mb-8">
            {adminUsers.map(user => renderUserCard(user, true))}
          </div>
        </div>
      )}

      {/* Sección de Publicadores */}
      <div>
        <div className="flex items-center mb-4">
          <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center mr-3">
            <Icon name="users" className="text-white text-sm" />
          </div>
          <h4 className="text-lg font-bold text-gray-800">Publicadores</h4>
          <span className="ml-2 bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs font-medium">
            {publisherUsers.length}
          </span>
        </div>
        
        {publisherUsers.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center max-w-md">
              <div className="w-20 h-20 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                <Icon name="user" className="text-3xl text-blue-500" />
              </div>
              <h4 className="text-xl font-bold text-gray-800 mb-2">No hay publicadores</h4>
              <p className="text-gray-600">Aún no se han registrado publicadores en el sistema.</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3">
            {publisherUsers.map(user => renderUserCard(user, false))}
          </div>
        )}
      </div>
    </div>
  );

  const renderFormView = () => (
    <div className="space-y-6">
      {/* Header - Optimizado para móvil */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => setActiveView('list')}
          className="w-8 h-8 sm:w-10 sm:h-10 bg-gray-100 hover:bg-gray-200 rounded-xl flex items-center justify-center transition-colors"
        >
          <Icon name="arrowLeft" className="text-gray-600 text-sm sm:text-base" />
        </button>
        <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg">
          <Icon name={activeView === 'create' ? 'plus' : 'edit'} className="text-white text-lg sm:text-xl" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-lg sm:text-2xl font-bold text-gray-800 truncate">
            {activeView === 'create' ? 'Crear Nuevo Usuario' : 'Editar Usuario'}
          </h3>
          <p className="text-gray-600 text-sm truncate">
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

        {/* Botones - Optimizado para móvil */}
        <div className="flex flex-col sm:flex-row sm:justify-end gap-3 sm:gap-4 pt-4 sm:pt-6 border-t border-gray-200">
          <button
            type="button"
            onClick={() => setActiveView('list')}
            className="px-4 py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors font-medium order-2 sm:order-1"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={isProcessing}
            className="px-4 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl hover:from-green-600 hover:to-emerald-700 transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 order-1 sm:order-2"
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
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="bg-gradient-to-br from-gray-50 to-white rounded-3xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden">
          {/* Header del modal - Optimizado para móvil */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white p-4 sm:p-6 flex items-center justify-between">
            <div className="flex items-center gap-2 sm:gap-3">
              <Icon name="users-cog" className="text-xl sm:text-2xl" />
              <h2 className="text-lg sm:text-2xl font-bold">Gestión de Usuarios</h2>
            </div>
            <button
              onClick={closeModal}
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
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-60 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-gradient-to-r from-yellow-500 to-orange-600 rounded-xl flex items-center justify-center">
                  <Icon name="key" className="text-white text-xl" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-800">Resetear Contraseña</h3>
                  <p className="text-gray-600 text-sm">Usuario: {userToResetPassword?.name}</p>
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
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-yellow-500 focus:border-transparent transition-all"
                  placeholder="Ingresa la nueva contraseña"
                  required
                />
              </div>

              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowPasswordReset(false)}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleConfirmPasswordReset}
                  disabled={!newPassword.trim() || isProcessing}
                  className="px-4 py-2 bg-gradient-to-r from-yellow-500 to-orange-600 text-white rounded-xl hover:from-yellow-600 hover:to-orange-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
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