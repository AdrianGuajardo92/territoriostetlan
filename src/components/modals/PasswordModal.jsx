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
      
      // 🔒 BLOQUEAR SCROLL DEL BODY
      const scrollY = window.scrollY;
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = '100%';
      document.body.style.overflow = 'hidden';
    } else {
      // 🔓 RESTAURAR SCROLL DEL BODY
      const scrollY = document.body.style.top;
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.width = '';
      document.body.style.overflow = '';
      if (scrollY) {
        window.scrollTo(0, parseInt(scrollY || '0') * -1);
      }
    }
    
    // Cleanup al desmontar
    return () => {
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.width = '';
      document.body.style.overflow = '';
    };
  }, [isOpen]);
  
  // Manejar el bloqueo de eventos de scroll/wheel
  useEffect(() => {
    if (!isOpen) return;
    
    const handleWheel = (e) => {
      const scrollContainer = e.target.closest('.scroll-container');
      if (!scrollContainer) {
        e.preventDefault();
        return;
      }
      
      const { scrollTop, scrollHeight, clientHeight } = scrollContainer;
      const isAtTop = scrollTop === 0;
      const isAtBottom = scrollTop + clientHeight >= scrollHeight;
      
      if ((isAtTop && e.deltaY < 0) || (isAtBottom && e.deltaY > 0)) {
        e.preventDefault();
      }
    };
    
    const handleTouchMove = (e) => {
      if (!e.target.closest('.scroll-container')) {
        e.preventDefault();
      }
    };
    
    // Agregar listeners no-pasivos
    document.addEventListener('wheel', handleWheel, { passive: false });
    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    
    return () => {
      document.removeEventListener('wheel', handleWheel);
      document.removeEventListener('touchmove', handleTouchMove);
    };
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
      
      // Verificar si la función devolvió un resultado válido
      if (result && result.success) {
        setSuccess(true);
        showToast('¡Contraseña cambiada exitosamente!', 'success');
        
        // Cerrar modal después de 2 segundos
        setTimeout(() => {
          onClose();
        }, 2000);
      } else if (result && result.error) {
        setError(result.error);
      } else {
        // Si updatePassword no devuelve nada, asumimos que fue exitoso
        setSuccess(true);
        showToast('¡Contraseña cambiada exitosamente!', 'success');
        
        // Cerrar modal después de 2 segundos
        setTimeout(() => {
          onClose();
        }, 2000);
      }
    } catch (error) {
      console.error('Error al cambiar contraseña:', error);
      setError('Error al cambiar la contraseña. Intenta de nuevo.');
    } finally {
      setIsLoading(false);
    }
  };

  // Función para verificar fortaleza de la contraseña
  const getPasswordStrength = (password) => {
    if (!password) return { level: 0, text: '', color: '' };
    
    let score = 0;
    if (password.length >= 6) score++;
    if (password.length >= 8) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;
    
    if (score <= 1) return { level: 1, text: 'Débil', color: 'red' };
    if (score <= 2) return { level: 2, text: 'Regular', color: 'yellow' };
    if (score <= 3) return { level: 3, text: 'Buena', color: 'blue' };
    return { level: 4, text: 'Excelente', color: 'green' };
  };

  const passwordStrength = getPasswordStrength(newPassword);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-[9999] bg-white" 
      style={{ 
        touchAction: 'none',
        overscrollBehavior: 'contain',
        isolation: 'isolate'
      }}
    >
      <div className="flex flex-col h-screen overflow-hidden bg-gradient-to-br from-gray-50 via-white to-blue-50">
        {/* 🎨 HEADER ELEGANTE CON GRADIENTE */}
        <div className="flex-shrink-0 bg-gradient-to-r from-slate-700 to-gray-800 text-white p-6 shadow-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-indigo-500 rounded-xl flex items-center justify-center shadow-lg">
                <i className="fas fa-shield-alt text-2xl text-white"></i>
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white mb-1">Cambiar Contraseña</h2>
                <p className="text-gray-300 text-sm">Actualiza tus credenciales de seguridad</p>
              </div>
            </div>
            
            <button 
              onClick={onClose}
              className="p-3 rounded-xl transition-all transform hover:scale-105 group"
              style={{ backgroundColor: '#34495e' }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#3a526b'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#34495e'}
            >
              <Icon name="x" size={20} className="text-white group-hover:rotate-90 transition-transform" />
            </button>
          </div>
        </div>
        
        {/* 📱 CONTENIDO SCROLLEABLE */}
        <div 
          className="flex-1 overflow-y-auto p-6 scroll-container" 
          style={{ 
            WebkitOverflowScrolling: 'touch',
            scrollBehavior: 'smooth',
            touchAction: 'pan-y'
          }}
        >
          {success ? (
            /* 🎉 VISTA DE ÉXITO ESPECTACULAR */
            <div className="text-center py-12">
              <div className="relative w-32 h-32 mx-auto mb-8">
                <div className="w-32 h-32 bg-gradient-to-br from-green-100 to-emerald-100 rounded-full flex items-center justify-center shadow-2xl border-4 border-green-200 animate-pulse">
                  <i className="fas fa-check-circle text-6xl text-green-500"></i>
                </div>
                <div className="absolute -top-3 -right-3 w-12 h-12 bg-gradient-to-r from-green-500 to-emerald-600 rounded-full flex items-center justify-center shadow-lg animate-bounce">
                  <i className="fas fa-shield-alt text-white text-xl"></i>
                </div>
              </div>
              
              <h3 className="text-3xl font-bold text-gray-900 mb-4">¡Contraseña Actualizada!</h3>
              <p className="text-gray-600 text-lg leading-relaxed mb-8">
                Tu contraseña ha sido cambiada exitosamente. Tu cuenta ahora está más segura.
              </p>
              
              {/* Card informativa de éxito */}
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-2xl p-6 border-2 border-green-200 max-w-md mx-auto">
                <div className="flex items-center justify-center mb-4">
                  <div className="w-12 h-12 bg-green-500 rounded-xl flex items-center justify-center mr-3">
                    <i className="fas fa-lock text-white text-xl"></i>
                  </div>
                  <h4 className="text-lg font-semibold text-green-900">Seguridad Mejorada</h4>
                </div>
                <p className="text-green-800 text-sm leading-relaxed">
                  Recuerda mantener tu nueva contraseña en un lugar seguro y no compartirla con nadie.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-8">
              {/* 👤 INFO DEL USUARIO ELEGANTE */}
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-6 border-2 border-blue-200 shadow-lg">
                <div className="flex items-center">
                  <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center mr-4 shadow-lg">
                    <i className="fas fa-user text-2xl text-white"></i>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-blue-900 mb-1">{currentUser?.name}</h3>
                    <p className="text-blue-600 text-sm flex items-center">
                      <i className="fas fa-shield-alt mr-2"></i>
                      Actualización de credenciales de seguridad
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                    <i className="fas fa-key text-blue-600 text-lg"></i>
                  </div>
                </div>
              </div>

              {/* 🔐 FORMULARIO ELEGANTE */}
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Campo de usuario oculto para accesibilidad */}
                <input
                  type="text"
                  name="username"
                  value={currentUser?.name || ''}
                  autoComplete="username"
                  style={{ display: 'none' }}
                  readOnly
                  tabIndex={-1}
                />
                
                {/* Contraseña actual */}
                <div className="space-y-2">
                  <label className="block text-sm font-bold text-gray-700 mb-3">
                    <i className="fas fa-lock mr-2 text-gray-500"></i>
                    Contraseña Actual
                  </label>
                  <div className="relative group">
                    <input
                      type={showPasswords ? "text" : "password"}
                      value={currentPassword}
                      onChange={(e) => {
                        setCurrentPassword(e.target.value);
                        setError('');
                      }}
                      className="w-full px-4 py-4 pl-12 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all duration-300 bg-white shadow-md group-hover:shadow-lg"
                      placeholder="Ingresa tu contraseña actual"
                      autoComplete="current-password"
                      disabled={isLoading}
                    />
                    <i className="fas fa-shield-alt absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors"></i>
                  </div>
                </div>
                
                {/* Nueva contraseña */}
                <div className="space-y-2">
                  <label className="block text-sm font-bold text-gray-700 mb-3">
                    <i className="fas fa-key mr-2 text-gray-500"></i>
                    Nueva Contraseña
                  </label>
                  <div className="relative group">
                    <input
                      type={showPasswords ? "text" : "password"}
                      value={newPassword}
                      onChange={(e) => {
                        setNewPassword(e.target.value);
                        setError('');
                      }}
                      className="w-full px-4 py-4 pl-12 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all duration-300 bg-white shadow-md group-hover:shadow-lg"
                      placeholder="Mínimo 6 caracteres"
                      autoComplete="new-password"
                      disabled={isLoading}
                    />
                    <i className="fas fa-plus-circle absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors"></i>
                  </div>
                  
                  {/* Indicador de fortaleza de contraseña */}
                  {newPassword && (
                    <div className="mt-3 p-3 bg-gray-50 rounded-xl border border-gray-200">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-700">Fortaleza:</span>
                        <span className={`text-sm font-bold ${
                          passwordStrength.color === 'red' ? 'text-red-600' :
                          passwordStrength.color === 'yellow' ? 'text-yellow-600' :
                          passwordStrength.color === 'blue' ? 'text-blue-600' :
                          'text-green-600'
                        }`}>
                          {passwordStrength.text}
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full transition-all duration-500 ${
                            passwordStrength.color === 'red' ? 'bg-gradient-to-r from-red-400 to-red-600' :
                            passwordStrength.color === 'yellow' ? 'bg-gradient-to-r from-yellow-400 to-yellow-600' :
                            passwordStrength.color === 'blue' ? 'bg-gradient-to-r from-blue-400 to-blue-600' :
                            'bg-gradient-to-r from-green-400 to-green-600'
                          }`}
                          style={{ width: `${(passwordStrength.level / 4) * 100}%` }}
                        ></div>
                      </div>
                    </div>
                  )}
                </div>
                
                {/* Confirmar contraseña */}
                <div className="space-y-2">
                  <label className="block text-sm font-bold text-gray-700 mb-3">
                    <i className="fas fa-check-double mr-2 text-gray-500"></i>
                    Confirmar Nueva Contraseña
                  </label>
                  <div className="relative group">
                    <input
                      type={showPasswords ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => {
                        setConfirmPassword(e.target.value);
                        setError('');
                      }}
                      className={`w-full px-4 py-4 pl-12 border-2 rounded-xl focus:ring-4 transition-all duration-300 bg-white shadow-md group-hover:shadow-lg ${
                        confirmPassword && newPassword === confirmPassword 
                          ? 'border-green-300 focus:ring-green-100 focus:border-green-500' 
                          : 'border-gray-200 focus:ring-blue-100 focus:border-blue-500'
                      }`}
                      placeholder="Repite la nueva contraseña"
                      autoComplete="new-password"
                      disabled={isLoading}
                    />
                    <i className={`fas fa-check-circle absolute left-4 top-1/2 -translate-y-1/2 transition-colors ${
                      confirmPassword && newPassword === confirmPassword 
                        ? 'text-green-500' 
                        : 'text-gray-400 group-focus-within:text-blue-500'
                    }`}></i>
                    
                    {/* Indicador de coincidencia */}
                    {confirmPassword && (
                      <div className={`absolute right-4 top-1/2 -translate-y-1/2 ${
                        newPassword === confirmPassword ? 'text-green-500' : 'text-red-500'
                      }`}>
                        <i className={`fas ${newPassword === confirmPassword ? 'fa-check' : 'fa-times'}`}></i>
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Toggle mostrar contraseñas */}
                <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                  <label className="flex items-center cursor-pointer group">
                    <div className="relative">
                      <input
                        type="checkbox"
                        checked={showPasswords}
                        onChange={(e) => setShowPasswords(e.target.checked)}
                        className="sr-only"
                      />
                      <div className={`w-12 h-6 rounded-full transition-colors duration-300 ${
                        showPasswords ? 'bg-blue-500' : 'bg-gray-300'
                      }`}>
                        <div className={`w-5 h-5 bg-white rounded-full shadow-md transform transition-transform duration-300 ${
                          showPasswords ? 'translate-x-6' : 'translate-x-0.5'
                        } translate-y-0.5`}></div>
                      </div>
                    </div>
                    <span className="ml-4 text-sm font-medium text-gray-700 group-hover:text-gray-900 transition-colors">
                      <i className={`fas ${showPasswords ? 'fa-eye-slash' : 'fa-eye'} mr-2`}></i>
                      {showPasswords ? 'Ocultar contraseñas' : 'Mostrar contraseñas'}
                    </span>
                  </label>
                </div>
                
                {/* Error elegante */}
                {error && (
                  <div className="bg-gradient-to-r from-red-50 to-pink-50 border-2 border-red-200 text-red-800 p-4 rounded-xl shadow-lg">
                    <div className="flex items-center">
                      <div className="w-8 h-8 bg-red-500 rounded-lg flex items-center justify-center mr-3 flex-shrink-0">
                        <i className="fas fa-exclamation-triangle text-white text-sm"></i>
                      </div>
                      <div>
                        <h4 className="font-bold text-red-900 mb-1">Error de validación</h4>
                        <p className="text-sm">{error}</p>
                      </div>
                    </div>
                  </div>
                )}
              </form>
            </div>
          )}
        </div>
        
        {/* 🎯 FOOTER CON BOTONES ELEGANTES */}
        {!success && (
          <div className="flex-shrink-0 bg-gradient-to-r from-gray-50 to-white border-t border-gray-200 px-6 py-4 shadow-lg">
            <div className="flex flex-col sm:flex-row justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                disabled={isLoading}
                className="px-6 py-3 border-2 border-gray-300 rounded-xl text-gray-700 hover:bg-gray-100 hover:border-gray-400 transition-all duration-300 font-medium shadow-md hover:shadow-lg transform hover:scale-105 disabled:opacity-50"
              >
                <i className="fas fa-times mr-2"></i>
                Cancelar
              </button>
              <button
                onClick={handleSubmit}
                disabled={isLoading || !currentPassword || !newPassword || !confirmPassword || newPassword !== confirmPassword}
                className="px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl hover:from-blue-600 hover:to-indigo-700 disabled:from-gray-400 disabled:to-gray-500 transition-all duration-300 font-medium shadow-lg hover:shadow-xl transform hover:scale-105 disabled:transform-none flex items-center justify-center"
              >
                {isLoading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                    Cambiando...
                  </>
                ) : (
                  <>
                    <i className="fas fa-shield-alt mr-2"></i>
                    Cambiar Contraseña
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PasswordModal; 