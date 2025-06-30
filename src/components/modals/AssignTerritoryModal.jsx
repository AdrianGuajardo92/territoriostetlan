import React, { useState, useMemo } from 'react';
import Modal from '../common/Modal';
import { useApp } from '../../context/AppContext';
import { useToast } from '../../hooks/useToast';

const AssignTerritoryModal = ({
  isOpen,
  onClose,
  onAssign,
  currentAssignee = '',
  territoryName = '',
  modalId = 'assign-territory-modal' // ID único para el historial
}) => {
  const { publishers } = useApp();
  const { showToast } = useToast();
  const [selectedPublisher, setSelectedPublisher] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // Función para normalizar texto (quitar acentos)
  const normalizeText = (text) => {
    return text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, ''); // Quita acentos
  };

  // Filtrar y ordenar publicadores con búsqueda inteligente
  const filteredAndSortedPublishers = useMemo(() => {
    const normalizedSearch = normalizeText(searchTerm);
    
    return publishers
      .filter(publisher => {
        if (!publisher.name) return false;
        const normalizedName = normalizeText(publisher.name);
        return normalizedName.includes(normalizedSearch);
      })
      .sort((a, b) => a.name.localeCompare(b.name, 'es', { 
        sensitivity: 'base',
        numeric: true 
      }));
  }, [publishers, searchTerm]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedPublisher) return;

    setIsProcessing(true);
    try {
      await onAssign(selectedPublisher);
      
      // Mostrar notificación de éxito
      showToast(
        `¡Territorio asignado exitosamente a ${selectedPublisher}!`, 
        'success', 
        2000
      );
      
      // Limpiar y cerrar modal
      setSelectedPublisher('');
      setSearchTerm('');
      onClose();
    } catch (error) {
      // Mostrar notificación de error
      showToast(
        'Error al asignar el territorio. Intenta nuevamente.', 
        'error', 
        2000
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClose = () => {
    if (!isProcessing) {
      setSelectedPublisher('');
      setSearchTerm('');
      onClose();
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title=""
      size="md"
      showCloseButton={false}
      closeOnBackdrop={!isProcessing}
      closeOnEscape={!isProcessing}
      modalId={modalId}
    >
      <div className="flex flex-col h-full">
        {/* Header personalizado con botón cerrar */}
        <div className="px-4 py-2.5 flex-shrink-0" style={{ backgroundColor: '#2C3E50' }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              <div className="p-1.5 rounded-lg shadow-md" style={{ backgroundColor: '#34495e' }}>
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                  <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
              </div>
              <div>
                <h2 className="text-base font-bold text-white">Asignar Territorio</h2>
                <p className="text-white/70 text-xs">{territoryName}</p>
              </div>
            </div>
            
            {/* Botón cerrar personalizado */}
            <button
              onClick={handleClose}
              disabled={isProcessing}
              className="p-1.5 hover:bg-white/10 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="Cerrar"
            >
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          {currentAssignee && (
            <div className="mt-2 p-2 rounded-lg" style={{ backgroundColor: '#34495e' }}>
              <div className="flex items-center space-x-2">
                <div className="bg-yellow-500 p-0.5 rounded-full">
                  <svg className="w-2.5 h-2.5 text-yellow-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <p className="text-xs text-white/80">Actualmente asignado a:</p>
                  <p className="text-white font-semibold text-xs">{currentAssignee}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Barra de búsqueda */}
        <div className="px-4 py-2 flex-shrink-0" style={{ backgroundColor: '#546E7A' }}>
          <div className="relative">
            <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
              <svg className="w-3.5 h-3.5 text-white/70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-9 py-2 bg-white/90 border-0 rounded-lg focus:bg-white focus:ring-2 focus:ring-white/50 transition-all placeholder-gray-500 text-gray-700 text-sm"
              placeholder="Buscar publicador..."
              disabled={isProcessing}
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Contenido principal con scroll optimizado */}
        <div className="flex-1 flex flex-col min-h-0 bg-gray-50">
          <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0">
            {/* Lista de publicadores con scroll garantizado */}
            <div className="px-4 py-2 flex-1">
              <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                <div className="overflow-y-auto" style={{ height: '280px' }}>
                  {filteredAndSortedPublishers.length === 0 ? (
                    <div className="text-center py-6">
                      <div className="bg-gray-100 w-10 h-10 rounded-full flex items-center justify-center mx-auto mb-2">
                        <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                      </div>
                      <p className="text-gray-500 font-medium text-sm">No se encontraron publicadores</p>
                      <p className="text-xs text-gray-400 mt-1">Intenta con otro término</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-100">
                      {filteredAndSortedPublishers.map((publisher, index) => (
                        <label
                          key={publisher.id}
                          className={`flex items-center p-2.5 cursor-pointer transition-all duration-200 ${
                            selectedPublisher === publisher.name 
                              ? 'bg-gray-100 border-l-4 border-blue-500' 
                              : 'hover:bg-gray-50'
                          }`}
                        >
                          <div className="relative">
                            <input
                              type="radio"
                              name="publisher"
                              value={publisher.name}
                              checked={selectedPublisher === publisher.name}
                              onChange={(e) => setSelectedPublisher(e.target.value)}
                              className="w-3.5 h-3.5 border-2 border-gray-300 focus:ring-2 focus:ring-blue-200 transition-all"
                              style={{ 
                                accentColor: selectedPublisher === publisher.name ? '#2C3E50' : undefined 
                              }}
                              disabled={isProcessing}
                            />
                          </div>
                          
                          <div className="ml-2.5 flex-1 min-w-0">
                            <div className="flex items-center space-x-2.5">
                              <div 
                                className="w-7 h-7 rounded-full flex items-center justify-center text-white font-bold text-xs"
                                style={{ backgroundColor: '#2C3E50' }}
                              >
                                {publisher.name?.charAt(0)?.toUpperCase()}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p 
                                  className="font-semibold text-sm truncate"
                                  style={{ color: '#2C3E50' }}
                                >
                                  {publisher.name}
                                </p>
                                {publisher.phone && (
                                  <div className="flex items-center space-x-1 mt-0.5">
                                    <svg className="w-2.5 h-2.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                    </svg>
                                    <span className="text-xs text-gray-500 truncate">{publisher.phone}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                          
                          <div className="ml-2 flex flex-col items-end space-y-1">
                            {publisher.hasActiveTerritory && (
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 border border-yellow-200">
                                <svg className="w-2 h-2 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                Activo
                              </span>
                            )}
                            {selectedPublisher === publisher.name && (
                              <span 
                                className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium text-white"
                                style={{ backgroundColor: '#2C3E50' }}
                              >
                                <svg className="w-2 h-2 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                                Seleccionado
                              </span>
                            )}
                          </div>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Botones de acción compactos */}
            <div className="px-4 py-2.5 bg-white border-t border-gray-200 flex-shrink-0">
              <div className="flex flex-col space-y-2">
                <button
                  type="submit"
                  className={`w-full py-2.5 px-4 rounded-lg font-semibold text-sm transition-all ${
                    selectedPublisher && !isProcessing
                      ? 'text-white shadow-md hover:shadow-lg active:scale-95'
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  }`}
                  style={{ 
                    backgroundColor: selectedPublisher && !isProcessing ? '#2C3E50' : undefined,
                    ':hover': { backgroundColor: selectedPublisher && !isProcessing ? '#34495e' : undefined }
                  }}
                  onMouseEnter={(e) => {
                    if (selectedPublisher && !isProcessing) {
                      e.target.style.backgroundColor = '#34495e';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (selectedPublisher && !isProcessing) {
                      e.target.style.backgroundColor = '#2C3E50';
                    }
                  }}
                  disabled={!selectedPublisher || isProcessing}
                >
                  {isProcessing ? (
                    <span className="flex items-center justify-center">
                      <div className="relative">
                        <div className="w-5 h-5 border-3 border-white/30 rounded-full animate-spin"></div>
                        <div className="absolute top-0 left-0 w-5 h-5 border-3 border-white border-t-transparent rounded-full animate-spin"></div>
                      </div>
                      <span className="ml-2">Asignando territorio...</span>
                    </span>
                  ) : (
                    <span className="flex items-center justify-center">
                      <svg className="w-3.5 h-3.5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Asignar territorio
                    </span>
                  )}
                </button>
                
                <button
                  type="button"
                  onClick={handleClose}
                  className="w-full py-2.5 px-4 border-2 border-gray-300 text-gray-600 rounded-lg hover:bg-gray-50 hover:border-gray-400 transition-all font-semibold text-sm active:scale-95"
                  disabled={isProcessing}
                >
                  Cancelar
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </Modal>
  );
};

export default AssignTerritoryModal; 