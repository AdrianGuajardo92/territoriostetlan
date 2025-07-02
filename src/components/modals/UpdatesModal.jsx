import React, { useState } from 'react';
import Modal from '../common/Modal';
import { useToast } from '../../hooks/useToast';

const UpdatesModal = ({ isOpen, onClose }) => {
  const [isLoading, setIsLoading] = useState(false);
  const { showToast } = useToast();

  const handleRefreshSW = async () => {
    setIsLoading(true);
    try {
      // Limpiar todo el cache
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map(name => caches.delete(name)));
      }
      
      // Desregistrar todos los service workers
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        await Promise.all(registrations.map(reg => reg.unregister()));
      }
      
      // Limpiar sessionStorage y localStorage
      sessionStorage.clear();
      localStorage.clear();
      
      showToast('Cache limpiado. Recargando...', 'success');
      setTimeout(() => {
        window.location.reload(true);
      }, 1000);
    } catch (error) {
      console.error('Error limpiando cache:', error);
      showToast('Error al limpiar cache', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleForceUpdate = async () => {
    setIsLoading(true);
    try {
      console.log('🚀 Forzando actualización completa...');
      
      // 1. Limpiar TODO el cache
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        console.log('🗑️ Limpiando caches:', cacheNames);
        await Promise.all(cacheNames.map(name => caches.delete(name)));
      }
      
      // 2. Desregistrar TODOS los service workers
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        console.log('🔧 Desregistrando SWs:', registrations.length);
        await Promise.all(registrations.map(reg => reg.unregister()));
      }
      
      // 3. Limpiar almacenamiento local (excepto datos de sesión críticos)
      const currentUser = sessionStorage.getItem('currentUser');
      sessionStorage.clear();
      localStorage.clear();
      if (currentUser) {
        sessionStorage.setItem('currentUser', currentUser);
      }
      
      // 4. Forzar recarga completa con timestamp
      showToast('✨ Actualizando a la última versión...', 'success');
      setTimeout(() => {
        window.location.href = window.location.origin + '?v=' + Date.now();
      }, 1000);
      
    } catch (error) {
      console.error('❌ Error forzando actualización:', error);
      showToast('Error al actualizar', 'error');
      setIsLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Actualizaciones"
      size="md"
    >
      <div className="p-6">
        <p className="text-gray-600">Verificación de actualizaciones en desarrollo...</p>
        {/* Botón de forzar actualización */}
        <button
          onClick={handleForceUpdate}
          disabled={isLoading}
          className="w-full py-3 px-4 bg-gradient-to-r from-red-500 to-pink-600 text-white rounded-xl font-semibold hover:from-red-600 hover:to-pink-700 transition-all duration-200 transform hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <span className="flex items-center justify-center">
              <i className="fas fa-spinner fa-spin mr-2"></i>
              Actualizando...
            </span>
          ) : (
            <span className="flex items-center justify-center">
              <i className="fas fa-sync-alt mr-2"></i>
              Forzar Actualización Completa
            </span>
          )}
        </button>
      </div>
    </Modal>
  );
};

export default UpdatesModal; 