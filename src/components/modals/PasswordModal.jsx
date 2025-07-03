import React, { useState, useEffect } from 'react';

const PasswordModal = ({ isOpen, onClose }) => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPasswords, setShowPasswords] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // Bloquear scroll del body cuando el modal está abierto
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  // Calcular fortaleza de contraseña
  const getPasswordStrength = (password) => {
    if (!password) return { level: 0, text: '', color: 'gray' };
    
    let score = 0;
    if (password.length >= 6) score++;
    if (password.length >= 8) score++;
    if (/[a-z]/.test(password)) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;
    
    if (score <= 2) return { level: score, text: 'Débil', color: 'red' };
    if (score <= 3) return { level: score, text: 'Regular', color: 'yellow' };
    if (score <= 4) return { level: score, text: 'Buena', color: 'blue' };
    return { level: score, text: 'Excelente', color: 'green' };
  };

  const passwordStrength = getPasswordStrength(newPassword);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!currentPassword || !newPassword || !confirmPassword) {
      setError('Por favor completa todos los campos');
      return;
    }
    
    if (newPassword !== confirmPassword) {
      setError('Las contraseñas no coinciden');
      return;
    }
    
    if (newPassword.length < 6) {
      setError('La nueva contraseña debe tener al menos 6 caracteres');
      return;
    }
    
    setIsLoading(true);
    setError('');
    
    try {
      // Simular cambio de contraseña
      await new Promise(resolve => setTimeout(resolve, 2000));
      setSuccess(true);
      setTimeout(() => {
        onClose();
        setSuccess(false);
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      }, 2000);
    } catch (err) {
      setError('Error al cambiar la contraseña. Intenta nuevamente.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      {/* MODAL PRINCIPAL - 100% OPTIMIZADO PARA MÓVILES */}
      <div className="bg-white rounded-2xl w-full max-w-md max-h-[90vh] flex flex-col shadow-2xl">
        
        {/* HEADER FIXO */}
        <div className="flex-shrink-0 bg-gradient-to-r from-blue-500 to-indigo-600 text-white p-6 rounded-t-2xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-white bg-opacity-20 rounded-xl flex items-center justify-center mr-4">
                <i className="fas fa-shield-alt text-2xl"></i>
              </div>
              <div>
                <h2 className="text-xl font-bold">Cambiar Contraseña</h2>
                <p className="text-blue-100 text-sm">Actualiza tu contraseña de seguridad</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-10 h-10 bg-white bg-opacity-20 rounded-xl flex items-center justify-center hover:bg-opacity-30 transition-all"
            >
              <i className="fas fa-times"></i>
            </button>
          </div>
        </div>

        {/* CONTENIDO SCROLLEABLE */}
        <div className="flex-1 overflow-y-auto p-6">
          {success ? (
            <div className="text-center py-8">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <i className="fas fa-check text-3xl text-green-600"></i>
              </div>
              <h3 className="text-xl font-bold text-gray-800 mb-2">¡Contraseña Actualizada!</h3>
              <p className="text-gray-600">Tu contraseña ha sido cambiada exitosamente.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              
              {/* Contraseña actual */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-3">
                  <i className="fas fa-lock mr-2 text-gray-500"></i>
                  Contraseña Actual
                </label>
                <div className="relative">
                  <input
                    type={showPasswords ? "text" : "password"}
                    value={currentPassword}
                    onChange={(e) => {
                      setCurrentPassword(e.target.value);
                      setError('');
                    }}
                    className="w-full px-4 py-4 pl-12 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all duration-300 bg-white"
                    placeholder="Ingresa tu contraseña actual"
                    autoComplete="current-password"
                    disabled={isLoading}
                  />
                  <i className="fas fa-shield-alt absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"></i>
                </div>
              </div>
              
              {/* Nueva contraseña */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-3">
                  <i className="fas fa-key mr-2 text-gray-500"></i>
                  Nueva Contraseña
                </label>
                <div className="relative">
                  <input
                    type={showPasswords ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => {
                      setNewPassword(e.target.value);
                      setError('');
                    }}
                    className="w-full px-4 py-4 pl-12 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all duration-300 bg-white"
                    placeholder="Mínimo 6 caracteres"
                    autoComplete="new-password"
                    disabled={isLoading}
                  />
                  <i className="fas fa-plus-circle absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"></i>
                </div>
                
                {/* Indicador de fortaleza */}
                {newPassword && (
                  <div className="mt-3 p-3 bg-gray-50 rounded-xl">
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
                          passwordStrength.color === 'red' ? 'bg-red-500' :
                          passwordStrength.color === 'yellow' ? 'bg-yellow-500' :
                          passwordStrength.color === 'blue' ? 'bg-blue-500' :
                          'bg-green-500'
                        }`}
                        style={{ width: `${(passwordStrength.level / 6) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                )}
              </div>
              
              {/* Confirmar contraseña */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-3">
                  <i className="fas fa-check-double mr-2 text-gray-500"></i>
                  Confirmar Nueva Contraseña
                </label>
                <div className="relative">
                  <input
                    type={showPasswords ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value);
                      setError('');
                    }}
                    className={`w-full px-4 py-4 pl-12 border-2 rounded-xl focus:ring-4 transition-all duration-300 bg-white ${
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
                      : 'text-gray-400'
                  }`}></i>
                </div>
              </div>
              
              {/* Toggle mostrar contraseñas */}
              <div className="bg-gray-50 rounded-xl p-4">
                <label className="flex items-center cursor-pointer">
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
                  <span className="ml-4 text-sm font-medium text-gray-700">
                    <i className={`fas ${showPasswords ? 'fa-eye-slash' : 'fa-eye'} mr-2`}></i>
                    {showPasswords ? 'Ocultar contraseñas' : 'Mostrar contraseñas'}
                  </span>
                </label>
              </div>
              
              {/* Error */}
              {error && (
                <div className="bg-red-50 border-2 border-red-200 text-red-800 p-4 rounded-xl">
                  <div className="flex items-center">
                    <i className="fas fa-exclamation-triangle mr-3"></i>
                    <span className="font-medium">{error}</span>
                  </div>
                </div>
              )}
            </form>
          )}
        </div>

        {/* FOOTER CON BOTONES - SIEMPRE VISIBLES */}
        {!success && (
          <div className="flex-shrink-0 bg-gray-50 border-t border-gray-200 p-4 rounded-b-2xl">
            <div className="flex gap-3">
              <button
                type="button"
                onClick={onClose}
                disabled={isLoading}
                className="flex-1 px-6 py-4 border-2 border-gray-300 rounded-xl text-gray-700 hover:bg-gray-100 hover:border-gray-400 transition-all duration-300 font-medium disabled:opacity-50"
              >
                <i className="fas fa-times mr-2"></i>
                Cancelar
              </button>
              <button
                onClick={handleSubmit}
                disabled={isLoading || !currentPassword || !newPassword || !confirmPassword || newPassword !== confirmPassword}
                className="flex-1 px-6 py-4 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl hover:from-blue-600 hover:to-indigo-700 disabled:from-gray-400 disabled:to-gray-500 transition-all duration-300 font-medium flex items-center justify-center"
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