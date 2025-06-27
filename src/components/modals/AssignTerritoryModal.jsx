import React, { useState } from 'react';
import Modal from '../common/Modal';
import Icon from '../common/Icon';
import { useApp } from '../../context/AppContext';

const AssignTerritoryModal = ({
  isOpen,
  onClose,
  onAssign,
  currentAssignee,
  territoryName
}) => {
  const { publishers } = useApp();
  const [selectedPublisher, setSelectedPublisher] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // Filtrar publicadores basado en la búsqueda
  const filteredPublishers = publishers.filter(publisher =>
    publisher.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedPublisher) return;

    setIsProcessing(true);
    try {
      await onAssign(selectedPublisher);
    } catch (error) {
      // El error se maneja en el componente padre
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Asignar Territorio: ${territoryName}`}
      size="md"
      closeOnBackdrop={!isProcessing}
      closeOnEscape={!isProcessing}
    >
      <form onSubmit={handleSubmit} className="p-6">
        {currentAssignee && (
          <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800">
              <Icon name="info" size={16} className="inline mr-1" />
              Actualmente asignado a: <strong>{currentAssignee}</strong>
            </p>
          </div>
        )}

        {/* Búsqueda de publicadores */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Buscar publicador
          </label>
          <div className="relative">
            <Icon 
              name="search" 
              size={20} 
              className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" 
            />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              placeholder="Buscar por nombre..."
              disabled={isProcessing}
            />
          </div>
        </div>

        {/* Lista de publicadores */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Seleccionar publicador
          </label>
          <div className="max-h-64 overflow-y-auto border border-gray-200 rounded-lg">
            {filteredPublishers.length === 0 ? (
              <p className="text-center text-gray-500 py-8">
                No se encontraron publicadores
              </p>
            ) : (
              <div className="divide-y divide-gray-200">
                {filteredPublishers.map((publisher) => (
                  <label
                    key={publisher.id}
                    className={`flex items-center p-3 hover:bg-gray-50 cursor-pointer transition-colors ${
                      selectedPublisher === publisher.name ? 'bg-purple-50' : ''
                    }`}
                  >
                    <input
                      type="radio"
                      name="publisher"
                      value={publisher.name}
                      checked={selectedPublisher === publisher.name}
                      onChange={(e) => setSelectedPublisher(e.target.value)}
                      className="w-4 h-4 text-purple-600 border-gray-300 focus:ring-purple-500"
                      disabled={isProcessing}
                    />
                    <div className="ml-3 flex-1">
                      <p className="font-medium text-gray-900">{publisher.name}</p>
                      {publisher.phone && (
                        <p className="text-sm text-gray-500">
                          <Icon name="phone" size={12} className="inline mr-1" />
                          {publisher.phone}
                        </p>
                      )}
                    </div>
                    {publisher.hasActiveTerritory && (
                      <span className="ml-2 px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-800 rounded-full">
                        Tiene territorio activo
                      </span>
                    )}
                  </label>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Acciones */}
        <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
            disabled={isProcessing}
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:shadow-lg transform hover:scale-[1.02] transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={!selectedPublisher || isProcessing}
          >
            {isProcessing ? (
              <span className="flex items-center">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                Asignando...
              </span>
            ) : (
              'Asignar territorio'
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default AssignTerritoryModal; 