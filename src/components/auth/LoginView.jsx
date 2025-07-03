import React, { useState, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import Icon from '../common/Icon';

const LoginView = () => {
  const { login } = useApp();
  const [formData, setFormData] = useState({ accessCode: '', password: '' });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const accessCodeRef = useRef(null);
  const passwordRef = useRef(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.accessCode || !formData.password) {
      setError('Por favor completa todos los campos');
      return;
    }

    setIsLoading(true);
    setError('');

    const result = await login(formData.accessCode, formData.password);
    
    if (!result.success) {
      setError(result.error || 'Error al iniciar sesión');
      setIsLoading(false);
      if (result.error === 'Código de acceso incorrecto') {
        setFormData({ accessCode: '', password: '' });
        accessCodeRef.current?.focus();
      } else if (result.error === 'Contraseña incorrecta') {
        setFormData({ ...formData, password: '' });
        passwordRef.current?.focus();
      }
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      {/* Patrón de fondo sutil */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute inset-0" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%239CA3AF' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }}></div>
      </div>

      <div className="relative w-full max-w-md">
        {/* Logo y título */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gray-900 rounded-2xl shadow-xl mb-4">
            <Icon name="mapPin" size={40} className="text-white" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900">
            Territorios
          </h1>
          <p className="text-gray-600 mt-2">Ingresa con tu usuario y contraseña</p>
        </div>

        {/* Formulario */}
        <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl flex items-center space-x-2 animate-shake">
                <Icon name="alertCircle" size={20} />
                <span className="text-sm">{error}</span>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Usuario
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none z-10">
                  <div className="bg-gray-100 rounded-full p-1.5 flex items-center justify-center">
                    <Icon name="user" size={16} className="text-gray-700" />
                  </div>
                </div>
                <input
                  ref={accessCodeRef}
                  type="text"
                  value={formData.accessCode}
                  onChange={(e) => setFormData({ ...formData, accessCode: e.target.value })}
                  className="w-full pl-12 pr-3 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-gray-900 focus:border-transparent transition-all placeholder:text-gray-400 bg-white"
                  placeholder="Ej: juan1"
                  autoComplete="username"
                  autoCapitalize="off"
                  autoCorrect="off"
                  spellCheck="false"
                  disabled={isLoading}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Contraseña
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none z-10">
                  <div className="bg-gray-100 rounded-full p-1.5 flex items-center justify-center">
                    <Icon name="lock" size={16} className="text-gray-700" />
                  </div>
                </div>
                <input
                  ref={passwordRef}
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full pl-12 pr-12 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-gray-900 focus:border-transparent transition-all placeholder:text-gray-400 bg-white"
                  placeholder="Ingresa tu contraseña..."
                  autoComplete="current-password"
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center hover:bg-gray-50 rounded-r-xl transition-colors z-10"
                >
                  <div className="bg-gray-100 hover:bg-gray-200 rounded-full p-1.5 flex items-center justify-center transition-colors">
                    <Icon 
                      name={showPassword ? 'eyeOff' : 'eye'} 
                      size={16} 
                      className="text-gray-700 hover:text-gray-900 transition-colors"
                    />
                  </div>
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-gray-900 hover:bg-gray-800 text-white py-3 rounded-xl font-medium shadow-md hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <div className="flex items-center justify-center space-x-2">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Verificando...</span>
                </div>
              ) : (
                'Entrar'
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-500">
              Si olvidaste tu contraseña o no puedes acceder, contacta al administrador
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-sm text-gray-500">
          <p>© 2025 Estación Tetlán Señas</p>
        </div>
      </div>

      {/* Estilos de animación */}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes shake {
          0%, 100% {
            transform: translateX(0);
          }
          10%, 30%, 50%, 70%, 90% {
            transform: translateX(-2px);
          }
          20%, 40%, 60%, 80% {
            transform: translateX(2px);
          }
        }
        .animate-shake {
          animation: shake 0.5s;
        }
      `}} />
    </div>
  );
};

export default LoginView; 