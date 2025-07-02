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

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="bg-gradient-to-br from-gray-50 to-white rounded-3xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden">
          {/* Header del modal */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white p-6 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Icon name="users-cog" className="text-2xl" />
              <h2 className="text-2xl font-bold">Gestión de Usuarios</h2>
            </div>
            <button
              onClick={closeModal}
              className="w-10 h-10 bg-white/20 hover:bg-white/30 rounded-xl flex items-center justify-center transition-colors"
            >
              <Icon name="times" className="text-xl" />
            </button>
          </div>

          {/* Contenido */}
          <div className="p-6 max-h-[calc(90vh-100px)] overflow-y-auto">
            <div className="text-center py-16">
              <div className="w-24 h-24 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl">
                <Icon name="tools" className="text-4xl text-blue-500" />
              </div>
              <h3 className="text-2xl font-bold text-gray-800 mb-4">Funcionalidad en Desarrollo</h3>
              <p className="text-gray-600 max-w-md mx-auto leading-relaxed">
                La gestión completa de usuarios estará disponible próximamente. Por ahora puedes ver el resumen de usuarios en el panel principal.
              </p>
              <div className="mt-8 space-y-4">
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-200">
                  <h4 className="font-semibold text-blue-800 mb-2">Funciones Próximas:</h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full">✨ Crear usuarios</span>
                    <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full">✨ Editar información</span>
                    <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full">✨ Resetear contraseñas</span>
                    <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full">✨ Eliminar usuarios</span>
                  </div>
                </div>
                <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-4 border border-green-200">
                  <p className="text-green-800 font-medium">
                    📊 Actualmente: {adminUsers.length} administradores y {publisherUsers.length} publicadores registrados
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal de confirmación para eliminar */}
      <ConfirmDialog
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={() => {}}
        title="¿Eliminar usuario?"
        message="Esta función estará disponible próximamente."
        confirmText="Entendido"
        cancelText="Cerrar"
        type="info"
      />
    </>
  );
};

export default UserManagementModal; 