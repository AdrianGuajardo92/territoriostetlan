import React, { useState, useEffect } from 'react';
import Modal from '../common/Modal';
import Icon from '../common/Icon';
import { useApp } from '../../context/AppContext';
import { useToast } from '../../hooks/useToast';

const PasswordModal = ({ isOpen, onClose }) => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showPasswords, setShowPasswords] = useState(false);
  
  const { currentUser, updatePassword } = useApp();
  const { showToast } = useToast();
  
  // Resetear cuando se abre/cierra
  useEffect(() => {
    if (isOpen) {
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setError('');
      setSuccess(false);
      setShowPasswords(false);
    }
  }, [isOpen]);
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validaciones
    if (!currentPassword || !newPassword || !confirmPassword) {
      setError('Todos los campos son obligatorios');
      return;
    }
    
    if (newPassword.length < 6) {
      setError('La nueva contraseña debe tener al menos 6 caracteres');
      return;
    }
    
    if (newPassword !== confirmPassword) {
      setError('Las contraseñas nuevas no coinciden');
      return;
    }
    
    if (currentPassword === newPassword) {
      setError('La nueva contraseña debe ser diferente a la actual');
      return;
    }
    
    setIsLoading(true);
    setError('');
    
    try {
      // Verificar contraseña actual
      if (currentUser.password !== currentPassword) {
        setError('La contraseña actual es incorrecta');
        setIsLoading(false);
        return;
      }
      
      // Actualizar contraseña
      const result = await updatePassword(newPassword);
      
      if (result.success) {
        setSuccess(true);
        showToast('¡Contraseña cambiada exitosamente!', 'success');
        
        // Cerrar modal después de 2 segundos
        setTimeout(() => {
          onClose();
        }, 2000);
      } else {
        setError(result.error || 'Error al cambiar la contraseña');
      }
    } catch (error) {
      console.error('Error al cambiar contraseña:', error);
      setError('Error al cambiar la contraseña. Intenta de nuevo.');
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="" size="sm">
      <div className="flex flex-col h-full">
        {/* Header minimalista */}
        <div className="bg-gray-50 border-b border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-800">Cambiar Contraseña</h2>
            <button 
              onClick={onClose}
              className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
            >
              <Icon name="x" size={20} className="text-gray-600" />
            </button>
          </div>
        </div>
        
        {/* Contenido */}
        <div className="flex-1 p-6">
          {success ? (
            <div className="text-center py-12">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Icon name="checkCircle" size={40} className="text-green-500" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                ¡Contraseña actualizada!
              </h3>
              <p className="text-gray-600">Tu contraseña ha sido cambiada exitosamente.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Info del usuario */}
              <div className="bg-gray-50 rounded-lg p-4 mb-6">
                <div className="flex items-center">
                  <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center mr-3">
                    <Icon name="user" size={24} className="text-gray-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">{currentUser?.name}</p>
                    <p className="text-sm text-gray-500">Cambio de credenciales</p>
                  </div>
                </div>
              </div>
              
              {/* Contraseña actual */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Contraseña actual
                </label>
                <div className="relative">
                  <input
                    type={showPasswords ? "text" : "password"}
                    value={currentPassword}
                    onChange={(e) => {
                      setCurrentPassword(e.target.value);
                      setError('');
                    }}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-800 focus:border-transparent transition-colors"
                    placeholder="Ingresa tu contraseña actual"
                    disabled={isLoading}
                  />
                  <Icon 
                    name="lock" 
                    size={20} 
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
                  />
                </div>
              </div>
              
              {/* Nueva contraseña */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nueva contraseña
                </label>
                <div className="relative">
                  <input
                    type={showPasswords ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => {
                      setNewPassword(e.target.value);
                      setError('');
                    }}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-800 focus:border-transparent transition-colors"
                    placeholder="Mínimo 6 caracteres"
                    disabled={isLoading}
                  />
                  <Icon 
                    name="key" 
                    size={20} 
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
                  />
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  La contraseña debe tener al menos 6 caracteres
                </p>
              </div>
              
              {/* Confirmar contraseña */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Confirmar nueva contraseña
                </label>
                <div className="relative">
                  <input
                    type={showPasswords ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value);
                      setError('');
                    }}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-800 focus:border-transparent transition-colors"
                    placeholder="Repite la nueva contraseña"
                    disabled={isLoading}
                  />
                  <Icon 
                    name="checkCircle" 
                    size={20} 
                    className={`absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none transition-colors ${
                      confirmPassword && newPassword === confirmPassword 
                        ? 'text-green-500' 
                        : 'text-gray-400'
                    }`}
                  />
                </div>
              </div>
              
              {/* Mostrar/ocultar contraseñas */}
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="showPasswords"
                  checked={showPasswords}
                  onChange={(e) => setShowPasswords(e.target.checked)}
                  className="w-4 h-4 text-gray-800 border-gray-300 rounded focus:ring-gray-800"
                />
                <label htmlFor="showPasswords" className="ml-2 text-sm text-gray-600 cursor-pointer">
                  Mostrar contraseñas
                </label>
              </div>
              
              {/* Error */}
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-lg text-sm flex items-center">
                  <Icon name="alertCircle" size={16} className="mr-2 flex-shrink-0" />
                  {error}
                </div>
              )}
            </form>
          )}
        </div>
        
        {/* Footer con botones */}
        {!success && (
          <div className="bg-gray-50 border-t border-gray-200 px-6 py-4">
            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={onClose}
                disabled={isLoading}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSubmit}
                disabled={isLoading || !currentPassword || !newPassword || !confirmPassword}
                className="px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-900 disabled:bg-gray-400 transition-colors flex items-center"
              >
                {isLoading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                    </svg>
                    Cambiando...
                  </>
                ) : (
                  <>
                    <Icon name="shield" size={16} className="mr-2" />
                    Cambiar contraseña
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};

export default PasswordModal; 