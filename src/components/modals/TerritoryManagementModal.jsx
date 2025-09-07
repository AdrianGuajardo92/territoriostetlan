import React, { useState, useMemo } from 'react';
import ReactDOM from 'react-dom';
import Icon from '../common/Icon';
import ConfirmDialog from '../common/ConfirmDialog';
import { useApp } from '../../context/AppContext';
import { useToast } from '../../hooks/useToast';

const TerritoryManagementModal = ({ isOpen, onClose }) => {
  
  const { territories, users, releaseTerritories } = useApp();
  const { showToast } = useToast();
  const [selectedTerritories, setSelectedTerritories] = useState(new Set());
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [isReleasing, setIsReleasing] = useState(false);
  const [filter, setFilter] = useState('all'); // 'all', 'assigned', 'free'
  const [searchTerm, setSearchTerm] = useState('');

  // Filtrar territorios según el filtro y búsqueda
  const filteredTerritories = useMemo(() => {
    let filtered = [...territories];
    
    // Aplicar filtro de estado
    if (filter === 'assigned') {
      filtered = filtered.filter(t => t.assignedTo);
    } else if (filter === 'free') {
      filtered = filtered.filter(t => !t.assignedTo);
    }
    
    // Aplicar búsqueda
    if (searchTerm) {
      filtered = filtered.filter(t => 
        t.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    // Ordenar por número de territorio
    return filtered.sort((a, b) => {
      const numA = parseInt(a.name.match(/\d+/)?.[0] || 0);
      const numB = parseInt(b.name.match(/\d+/)?.[0] || 0);
      return numA - numB;
    });
  }, [territories, filter, searchTerm]);

  // Contar territorios por estado
  const assignedCount = territories.filter(t => t.assignedTo).length;
  const freeCount = territories.filter(t => !t.assignedTo).length;

  // Toggle selección de un territorio
  const toggleSelection = (territoryId) => {
    const newSet = new Set(selectedTerritories);
    if (newSet.has(territoryId)) {
      newSet.delete(territoryId);
    } else {
      newSet.add(territoryId);
    }
    setSelectedTerritories(newSet);
  };

  // Seleccionar todos los territorios visibles
  const selectAll = () => {
    const allIds = new Set(filteredTerritories.map(t => t.id));
    setSelectedTerritories(allIds);
  };

  // Deseleccionar todos
  const deselectAll = () => {
    setSelectedTerritories(new Set());
  };

  // Manejar liberación de territorios
  const handleReleaseTerritories = async () => {
    if (selectedTerritories.size === 0) {
      showToast('Por favor selecciona al menos un territorio', 'error');
      return;
    }

    setShowConfirmDialog(true);
  };

  // Confirmar liberación
  const confirmRelease = async () => {
    setIsReleasing(true);
    try {
      const territoryIds = Array.from(selectedTerritories);
      await releaseTerritories(territoryIds);
      
      showToast(
        `${territoryIds.length} territorio${territoryIds.length > 1 ? 's' : ''} liberado${territoryIds.length > 1 ? 's' : ''} exitosamente`,
        'success'
      );
      
      setSelectedTerritories(new Set());
      setShowConfirmDialog(false);
    } catch (error) {
      console.error('Error liberando territorios:', error);
      showToast('Error al liberar territorios', 'error');
    } finally {
      setIsReleasing(false);
    }
  };

  // Obtener información del usuario asignado
  const getAssignedUser = (userId) => {
    return users.find(u => u.id === userId);
  };

  // Calcular territorios seleccionados que están asignados
  const selectedAssignedCount = Array.from(selectedTerritories).filter(id => {
    const territory = territories.find(t => t.id === id);
    return territory?.assignedTo;
  }).length;

  // Renderizado condicional después de todos los hooks
  if (!isOpen) return null;
  
  // Usar ReactDOM.createPortal para renderizar en el body
  return ReactDOM.createPortal(
    <div className="fixed inset-0" style={{ zIndex: 999999 }}>
      {/* Overlay */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal de pantalla completa */}
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className="bg-white w-full h-full max-w-6xl max-h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden">
          {/* Header del modal */}
          <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-6 flex-shrink-0">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold flex items-center gap-3">
                  <Icon name="map" className="text-3xl" />
                  Gestión de Territorios
                </h2>
                <p className="text-indigo-100 mt-1">
                  Administra y libera territorios de forma masiva
                </p>
              </div>
              <button
                onClick={onClose}
                className="w-10 h-10 bg-white/20 hover:bg-white/30 rounded-lg flex items-center justify-center transition-colors"
              >
                <Icon name="x" className="text-2xl" />
              </button>
            </div>
          </div>

          {/* Barra de herramientas */}
          <div className="bg-gray-50 p-4 border-b border-gray-200 flex-shrink-0">
            <div className="flex flex-col sm:flex-row gap-4">
              {/* Controles de filtro */}
              <div className="flex gap-2">
                <button
                  onClick={() => setFilter('all')}
                  className={`px-4 py-2 rounded-lg font-medium transition-all ${
                    filter === 'all'
                      ? 'bg-blue-600 text-white shadow-lg'
                      : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'
                  }`}
                >
                  <Icon name="list" className="inline mr-2" size={16} />
                  Todos ({territories.length})
                </button>
                <button
                  onClick={() => setFilter('assigned')}
                  className={`px-4 py-2 rounded-lg font-medium transition-all ${
                    filter === 'assigned'
                      ? 'bg-orange-600 text-white shadow-lg'
                      : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'
                  }`}
                >
                  <Icon name="user" className="inline mr-2" size={16} />
                  Asignados ({assignedCount})
                </button>
                <button
                  onClick={() => setFilter('free')}
                  className={`px-4 py-2 rounded-lg font-medium transition-all ${
                    filter === 'free'
                      ? 'bg-green-600 text-white shadow-lg'
                      : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'
                  }`}
                >
                  <Icon name="mapPin" className="inline mr-2" size={16} />
                  Libres ({freeCount})
                </button>
              </div>

              {/* Buscador */}
              <div className="flex-1 max-w-md">
                <div className="relative">
                  <Icon name="search" className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Buscar territorio..."
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Botones de acción */}
              <div className="flex gap-2">
                <button
                  onClick={selectAll}
                  className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <Icon name="checkCircle" className="inline mr-2" size={16} />
                  Seleccionar Todos
                </button>
                <button
                  onClick={deselectAll}
                  className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  disabled={selectedTerritories.size === 0}
                >
                  <Icon name="x" className="inline mr-2" size={16} />
                  Limpiar
                </button>
              </div>
            </div>

            {/* Información de selección */}
            {selectedTerritories.size > 0 && (
              <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-center justify-between">
                <p className="text-blue-800">
                  <Icon name="info" className="inline mr-2" />
                  <strong>{selectedTerritories.size}</strong> territorio{selectedTerritories.size > 1 ? 's' : ''} seleccionado{selectedTerritories.size > 1 ? 's' : ''}
                  {selectedAssignedCount > 0 && (
                    <span className="ml-2 text-orange-700">
                      ({selectedAssignedCount} asignado{selectedAssignedCount > 1 ? 's' : ''})
                    </span>
                  )}
                </p>
                <button
                  onClick={handleReleaseTerritories}
                  disabled={selectedAssignedCount === 0}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
                    selectedAssignedCount > 0
                      ? 'bg-red-600 text-white hover:bg-red-700'
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  <Icon name="unlock" />
                  Liberar Seleccionados
                </button>
              </div>
            )}
          </div>

          {/* Lista de territorios */}
          <div className="flex-1 overflow-y-auto p-6">
            {filteredTerritories.length === 0 ? (
              <div className="text-center py-12">
                <Icon name="map" className="text-6xl text-gray-300 mb-4" />
                <p className="text-gray-500 text-lg">No se encontraron territorios</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredTerritories.map(territory => {
                  const isSelected = selectedTerritories.has(territory.id);
                  const assignedUser = territory.assignedTo ? getAssignedUser(territory.assignedTo) : null;
                  
                  
                  return (
                    <div
                      key={territory.id}
                      onClick={() => toggleSelection(territory.id)}
                      className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                        isSelected
                          ? 'border-indigo-500 bg-indigo-50'
                          : 'border-gray-200 bg-white hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          {/* Checkbox */}
                          <div className={`w-6 h-6 rounded border-2 flex items-center justify-center transition-colors ${
                            isSelected
                              ? 'bg-indigo-600 border-indigo-600'
                              : 'bg-white border-gray-300'
                          }`}>
                            {isSelected && (
                              <Icon name="check" className="text-white text-sm" />
                            )}
                          </div>
                          
                          {/* Número de territorio */}
                          <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg ${
                            territory.status === 'Completado'
                              ? 'bg-blue-100 text-blue-600'
                              : territory.assignedTo
                                ? 'bg-orange-100 text-orange-600'
                                : 'bg-green-100 text-green-600'
                          }`}>
                            {territory.name.match(/\d+/)?.[0] || '?'}
                          </div>
                        </div>
                        
                        {/* Badge de estado */}
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          territory.status === 'Completado'
                            ? 'bg-blue-100 text-blue-700'
                            : territory.assignedTo
                              ? 'bg-orange-100 text-orange-700'
                              : 'bg-green-100 text-green-700'
                        }`}>
                          {territory.status || (territory.assignedTo ? 'Asignado' : 'Libre')}
                        </span>
                      </div>
                      
                      <div>
                        <h4 className="font-bold text-gray-900 mb-1">{territory.name}</h4>
                        {assignedUser && (
                          <div className="text-sm text-gray-600">
                            <Icon name="user" className="inline mr-1" size={14} />
                            {assignedUser.name}
                            <span className="text-gray-400 ml-1">
                              (@{assignedUser.accessCode})
                            </span>
                          </div>
                        )}
                        {/* Mostrar fechas según el estado */}
                        {territory.status === 'Completado' && (territory.completedDate || territory.lastCompletedDate) ? (
                          <div className="text-xs text-green-600 mt-1">
                            <Icon name="checkCircle" className="inline mr-1" size={12} />
                            Terminado el: {(() => {
                              const date = territory.completedDate || territory.lastCompletedDate;
                              // Convertir Timestamp de Firebase a Date
                              const jsDate = date?.toDate ? date.toDate() : new Date(date);
                              return jsDate.toLocaleDateString('es-MX', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric'
                              });
                            })()}
                          </div>
                        ) : territory.assignedTo && territory.assignedDate ? (
                          <div className="text-xs text-gray-500 mt-1">
                            <Icon name="calendar" className="inline mr-1" size={12} />
                            Asignado el: {(() => {
                              // Convertir Timestamp de Firebase a Date
                              const jsDate = territory.assignedDate?.toDate ? 
                                territory.assignedDate.toDate() : 
                                new Date(territory.assignedDate);
                              return jsDate.toLocaleDateString('es-MX', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric'
                              });
                            })()}
                            {/* Calcular días transcurridos */}
                            <span className="text-orange-600 ml-2">
                              ({(() => {
                                const jsDate = territory.assignedDate?.toDate ? 
                                  territory.assignedDate.toDate() : 
                                  new Date(territory.assignedDate);
                                return Math.floor((new Date() - jsDate) / (1000 * 60 * 60 * 24));
                              })()} días)
                            </span>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer con información */}
          <div className="bg-gray-50 p-4 border-t border-gray-200 flex-shrink-0">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-600">
                <Icon name="info" className="inline mr-1" />
                Mostrando {filteredTerritories.length} de {territories.length} territorios
              </p>
              <p className="text-sm text-gray-600">
                Solo puedes liberar territorios que estén asignados
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Modal de confirmación */}
      <ConfirmDialog
        isOpen={showConfirmDialog}
        onClose={() => setShowConfirmDialog(false)}
        onConfirm={confirmRelease}
        title="Confirmar Liberación de Territorios"
        message={`¿Estás seguro de que deseas liberar ${selectedAssignedCount} territorio${selectedAssignedCount > 1 ? 's' : ''}? Esta acción los desasignará de los publicadores actuales y los marcará como disponibles.`}
        confirmText={isReleasing ? "Liberando..." : "Sí, Liberar"}
        cancelText="Cancelar"
        confirmButtonClass="bg-red-600 hover:bg-red-700"
        isLoading={isReleasing}
      />
    </div>,
    document.body
  );
};

export default TerritoryManagementModal;