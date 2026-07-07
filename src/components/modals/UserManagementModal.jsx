import { useState, useEffect, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { useToast } from '../../hooks/useToast';
import { useBackHandler } from '../../hooks/useBackHandler';
import Icon from '../common/Icon';
import ConfirmDialog from '../common/ConfirmDialog';
import { isPioneerUser } from '../../config/congregationPioneers';

const UserManagementModal = ({
  isOpen,
  onClose,
  modalId = 'user-management-modal'
}) => {
  // Este modal no usa <Modal>; registramos raíz + sub-dialogs aquí.
  useBackHandler({ isOpen, onClose, id: modalId });
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
  const [copiedCredentialsUserId, setCopiedCredentialsUserId] = useState(null);
  const copyFeedbackTimeoutRef = useRef(null);

  useBackHandler({ isOpen: showDeleteConfirm, onClose: () => setShowDeleteConfirm(false), id: `${modalId}-delete-confirm` });
  useBackHandler({ isOpen: showPasswordReset, onClose: () => setShowPasswordReset(false), id: `${modalId}-password-reset` });
  useBackHandler({
    isOpen: isOpen && activeView !== 'list',
    onClose: () => setActiveView('list'),
    id: `${modalId}-form-view`
  });

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
      setCopiedCredentialsUserId(null);
      setSearchTerm(''); // Resetear búsqueda
    }
  }, [isOpen]);

  useEffect(() => {
    return () => {
      if (copyFeedbackTimeoutRef.current) {
        clearTimeout(copyFeedbackTimeoutRef.current);
      }
    };
  }, []);

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

  // Lista única ordenada por nombre, con filtro de búsqueda
  const sortedUsers = [...users].sort((a, b) =>
    (a.name || '').localeCompare(b.name || '', 'es')
  );
  const filteredUsers = filterUsers(sortedUsers);

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

  const buildCredentialsMessage = (user) => [
    'Accesos para Estación Tetlán Señas Territorios',
    '',
    `Nombre: ${user.name || 'Sin nombre'}`,
    `Usuario: ${user.accessCode || 'Sin usuario'}`,
    `Contraseña: ${user.password || 'Sin contraseña registrada'}`
  ].join('\n');

  const copyTextToClipboard = async (text) => {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return;
    }

    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.setAttribute('readonly', '');
    textArea.style.position = 'fixed';
    textArea.style.opacity = '0';
    document.body.appendChild(textArea);
    textArea.select();

    const copied = document.execCommand('copy');
    document.body.removeChild(textArea);

    if (!copied) {
      throw new Error('Clipboard fallback failed');
    }
  };

  const handleCopyCredentials = async (user) => {
    if (!user?.password) {
      showToast('Este usuario no tiene contraseña registrada', 'error');
      return;
    }

    try {
      await copyTextToClipboard(buildCredentialsMessage(user));
      setCopiedCredentialsUserId(user.id);
      showToast(`Credenciales de ${user.name || user.accessCode} copiadas`, 'success');

      if (copyFeedbackTimeoutRef.current) {
        clearTimeout(copyFeedbackTimeoutRef.current);
      }
      copyFeedbackTimeoutRef.current = setTimeout(() => {
        setCopiedCredentialsUserId(null);
      }, 2200);
    } catch (error) {
      console.error('Error copiando credenciales:', error);
      showToast('No se pudieron copiar las credenciales', 'error');
    }
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

  const renderUserCard = (user) => {
    const isAdmin = user.role === 'admin';
    const isPioneer = isPioneerUser(user);
    const isCurrentUser = user.id === currentUser?.id;
    const hasPassword = Boolean(user.password);
    const credentialsCopied = copiedCredentialsUserId === user.id;

    return (
      <div key={user.id} className="bg-white rounded-xl border border-slate-200 p-4 hover:shadow-sm transition-shadow">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center flex-shrink-0">
            <Icon name="user" className="text-slate-500" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="text-base font-semibold text-slate-900 truncate">{user.name}</h4>
              {isCurrentUser && (
                <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-xs font-medium">Tú</span>
              )}
              {isAdmin && (
                <span className="px-2 py-0.5 rounded text-xs font-medium bg-slate-800 text-white">
                  Administrador
                </span>
              )}
              {isPioneer && (
                <span className="px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-700">
                  Precursor
                </span>
              )}
              {!isAdmin && (
                <span className="px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-700">
                  Publicador
                </span>
              )}
            </div>
            <p className="text-sm text-slate-500 font-mono mt-1 truncate">{user.accessCode}</p>
            {hasPassword && (
              <p className="text-xs text-slate-400 font-mono mt-0.5 truncate">{user.password}</p>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-slate-100">
          <button
            onClick={() => handleCopyCredentials(user)}
            disabled={!hasPassword}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              credentialsCopied
                ? 'bg-emerald-600 text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200 disabled:opacity-40 disabled:cursor-not-allowed'
            }`}
            title="Copiar credenciales"
          >
            <Icon name={credentialsCopied ? 'checkCircle' : 'copy'} className="w-3.5 h-3.5" />
            <span>{credentialsCopied ? 'Copiado' : 'Copiar'}</span>
          </button>
          <button
            onClick={() => handleEdit(user)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
          >
            <Icon name="edit" className="w-3.5 h-3.5" />
            <span>Editar</span>
          </button>
          <button
            onClick={() => handlePasswordResetClick(user)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-amber-50 text-amber-700 hover:bg-amber-100 transition-colors"
          >
            <Icon name="key" className="w-3.5 h-3.5" />
            <span>Reset</span>
          </button>
          {!isCurrentUser && (
            <button
              onClick={() => handleDeleteClick(user)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
            >
              <Icon name="trash" className="w-3.5 h-3.5" />
              <span>Eliminar</span>
            </button>
          )}
        </div>
      </div>
    );
  };

  const renderListView = () => (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="relative flex-1">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por nombre o usuario..."
            className="w-full px-4 py-2.5 pl-10 pr-10 bg-white border border-slate-200 rounded-xl focus:border-slate-400 focus:ring-1 focus:ring-slate-200 transition-all text-slate-700 placeholder-slate-400 text-sm"
          />
          <Icon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <Icon name="x" className="text-slate-500" />
            </button>
          )}
        </div>
        <button
          onClick={() => setActiveView('create')}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-colors font-medium text-sm whitespace-nowrap"
        >
          <Icon name="userPlus" />
          <span>Nuevo usuario</span>
        </button>
      </div>

      {searchTerm && filteredUsers.length === 0 ? (
        <div className="text-center py-10">
          <p className="text-slate-500 text-sm">
            Sin resultados para &ldquo;{searchTerm}&rdquo;
          </p>
          <button
            onClick={() => setSearchTerm('')}
            className="mt-3 px-4 py-2 text-sm text-slate-600 hover:text-slate-800 transition-colors"
          >
            Limpiar búsqueda
          </button>
        </div>
      ) : filteredUsers.length === 0 ? (
        <p className="text-slate-400 text-sm py-4 text-center">No hay usuarios registrados.</p>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {filteredUsers.map((user) => renderUserCard(user))}
        </div>
      )}
    </div>
  );

  const renderFormView = () => (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button
          onClick={() => setActiveView('list')}
          className="w-9 h-9 bg-slate-100 hover:bg-slate-200 rounded-lg flex items-center justify-center transition-colors"
        >
          <Icon name="arrowLeft" className="text-slate-600" />
        </button>
        <h3 className="text-lg font-semibold text-slate-800">
          {activeView === 'create' ? 'Nuevo usuario' : `Editar: ${selectedUser?.name}`}
        </h3>
      </div>

      <form onSubmit={handleFormSubmit} className="bg-white rounded-xl border border-slate-200 p-4 sm:p-6 space-y-4">
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

        <div className="flex flex-col sm:flex-row sm:justify-end gap-3 pt-4 border-t border-slate-200">
          <button
            type="button"
            onClick={() => setActiveView('list')}
            className="px-4 py-2.5 border border-slate-200 bg-white text-slate-700 rounded-lg hover:bg-slate-50 transition-colors font-medium order-2 sm:order-1"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={isProcessing}
            className="px-4 py-2.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 order-1 sm:order-2"
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
      <div className="fixed inset-0 bg-white z-[9999] flex flex-col" style={{ zIndex: 9999 }}>
        {/* Header fijo */}
        <div className="bg-gradient-to-r from-slate-700 to-slate-800 text-white shadow-lg flex-shrink-0">
          <div className="px-4 sm:px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                <Icon name="users-cog" className="text-2xl text-white" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold">Gestión completa</h1>
                <p className="text-white/80 text-sm">
                  {users.length} usuario{users.length !== 1 ? 's' : ''}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2.5 rounded-xl transition-all hover:scale-105 bg-white/20 hover:bg-white/30 backdrop-blur-sm"
            >
              <i className="fas fa-arrow-left text-white text-lg"></i>
            </button>
          </div>
        </div>

        {/* Contenido scrolleable */}
        <div className="flex-1 overflow-y-auto bg-slate-50 min-h-0">
          <div className="px-4 sm:px-6 py-6">
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
