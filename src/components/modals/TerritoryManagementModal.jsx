import React, { useState, useMemo } from 'react';
import ReactDOM from 'react-dom';
import Icon from '../common/Icon';
import ConfirmDialog from '../common/ConfirmDialog';
import { useApp } from '../../context/AppContext';
import { useToast } from '../../hooks/useToast';

const TerritoryManagementModal = ({ isOpen, onClose }) => {

  const { territories, users, releaseTerritories, assignTerritory } = useApp();
  const { showToast } = useToast();
  const [selectedTerritories, setSelectedTerritories] = useState(new Set());
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [isReleasing, setIsReleasing] = useState(false);
  const [isAssigning, setIsAssigning] = useState(false);
  const [selectedUser, setSelectedUser] = useState('');
  const [filter, setFilter] = useState('all'); // 'all', 'assigned', 'free'
  const [searchTerm, setSearchTerm] = useState('');

  // Obtener el estado del territorio
  const getTerritoryStatus = (territory) => {
    if (territory.status === 'Completado') return 'Completado';
    if (territory.assignedTo) return 'En uso';
    return 'Disponible';
  };

  // Configuración de colores por estado
  const statusConfig = {
    'Disponible': {
      bg: 'bg-emerald-100',
      border: 'border-emerald-400',
      borderSelected: 'border-emerald-600',
      text: 'text-emerald-700',
      accent: '#10b981'
    },
    'En uso': {
      bg: 'bg-amber-100',
      border: 'border-amber-400',
      borderSelected: 'border-amber-600',
      text: 'text-amber-700',
      accent: '#f59e0b'
    },
    'Completado': {
      bg: 'bg-rose-100',
      border: 'border-rose-400',
      borderSelected: 'border-rose-600',
      text: 'text-rose-700',
      accent: '#f43f5e'
    }
  };

  // Normalizar assignedTo a array de nombres
  const getAssignedNames = (assignedTo) => {
    if (!assignedTo) return [];
    if (Array.isArray(assignedTo)) return assignedTo.filter(n => n && n.trim());
    return [assignedTo];
  };

  // Calcular días desde una fecha
  const formatDaysSince = (date) => {
    if (!date) return null;
    const jsDate = date?.toDate ? date.toDate() : new Date(date);
    const days = Math.floor((new Date() - jsDate) / (1000 * 60 * 60 * 24));
    const isAlert = days >= 15; // Alerta a partir de 15 días
    const text = `${days} día${days !== 1 ? 's' : ''}`;
    return { days, text, isAlert };
  };

  // Abreviar nombre
  const abbreviateName = (fullName) => {
    if (!fullName) return '';
    const parts = fullName.trim().split(' ');
    if (parts.length <= 1) return fullName;
    return `${parts[0]} ${parts[1][0]}.`;
  };

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

  // Manejar asignación de territorios
  const handleAssignTerritories = () => {
    if (selectedTerritories.size === 0) {
      showToast('Por favor selecciona al menos un territorio', 'error');
      return;
    }
    setShowAssignModal(true);
  };

  // Confirmar asignación
  const confirmAssign = async () => {
    if (!selectedUser) {
      showToast('Por favor selecciona un publicador', 'error');
      return;
    }

    setIsAssigning(true);
    try {
      const territoryIds = Array.from(selectedTerritories);

      // Asignar cada territorio al usuario seleccionado
      for (const territoryId of territoryIds) {
        await assignTerritory(territoryId, selectedUser);
      }

      showToast(
        `${territoryIds.length} territorio${territoryIds.length > 1 ? 's' : ''} asignado${territoryIds.length > 1 ? 's' : ''} exitosamente`,
        'success'
      );

      setSelectedTerritories(new Set());
      setShowAssignModal(false);
      setSelectedUser('');
    } catch (error) {
      console.error('Error asignando territorios:', error);
      showToast('Error al asignar territorios', 'error');
    } finally {
      setIsAssigning(false);
    }
  };

  // Calcular territorios seleccionados que están asignados
  const selectedAssignedCount = Array.from(selectedTerritories).filter(id => {
    const territory = territories.find(t => t.id === id);
    return territory?.assignedTo;
  }).length;

  // Calcular territorios seleccionados que están libres
  const selectedFreeCount = Array.from(selectedTerritories).filter(id => {
    const territory = territories.find(t => t.id === id);
    return !territory?.assignedTo;
  }).length;

  // Renderizado condicional después de todos los hooks
  if (!isOpen) return null;

  // Usar ReactDOM.createPortal para renderizar en el body
  return ReactDOM.createPortal(
    <div className="fixed inset-0 bg-gray-100" style={{ zIndex: 999999 }}>
      {/* Modal de pantalla completa */}
      <div className="w-full h-full flex flex-col overflow-hidden">

        {/* Header compacto */}
        <div className="bg-gradient-to-r from-slate-700 to-slate-900 text-white p-4 flex-shrink-0 shadow-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Icon name="map" className="text-2xl" />
              <div>
                <h2 className="text-xl font-bold">Gestión de Territorios</h2>
                <p className="text-slate-300 text-sm">Selecciona territorios para gestionar</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
            >
              <Icon name="x" className="text-xl" />
            </button>
          </div>
        </div>

        {/* Barra de filtros y búsqueda */}
        <div className="bg-white p-3 border-b border-gray-200 flex-shrink-0">
          <div className="flex flex-wrap items-center gap-2">
            {/* Filtros de estado */}
            <div className="flex gap-1">
              <button
                onClick={() => setFilter('all')}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                  filter === 'all'
                    ? 'bg-slate-700 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                Todos ({territories.length})
              </button>
              <button
                onClick={() => setFilter('assigned')}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                  filter === 'assigned'
                    ? 'bg-amber-500 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                En uso ({assignedCount})
              </button>
              <button
                onClick={() => setFilter('free')}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                  filter === 'free'
                    ? 'bg-emerald-500 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                Libres ({freeCount})
              </button>
            </div>

            {/* Buscador */}
            <div className="flex-1 min-w-[150px] max-w-xs">
              <div className="relative">
                <Icon name="search" size={16} className="absolute left-2.5 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Buscar..."
                  className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Botones de selección rápida */}
            <div className="flex gap-1 ml-auto">
              <button
                onClick={selectAll}
                className="px-3 py-1.5 text-sm bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Seleccionar todo
              </button>
              {selectedTerritories.size > 0 && (
                <button
                  onClick={deselectAll}
                  className="px-3 py-1.5 text-sm bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Limpiar
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Grid de territorios */}
        <div className="flex-1 overflow-y-auto p-4" style={{ paddingBottom: selectedTerritories.size > 0 ? '100px' : '16px' }}>
          {filteredTerritories.length === 0 ? (
            <div className="text-center py-12">
              <Icon name="map" className="text-6xl text-gray-300 mb-4 mx-auto" />
              <p className="text-gray-500 text-lg">No se encontraron territorios</p>
            </div>
          ) : (
            <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 gap-3">
              {filteredTerritories.map(territory => {
                const isSelected = selectedTerritories.has(territory.id);
                const status = getTerritoryStatus(territory);
                const config = statusConfig[status];
                const territoryNumber = territory.name.match(/\d+/)?.[0] || '?';

                // Obtener nombres asignados (puede ser string o array)
                const assignedNames = getAssignedNames(territory.assignedTo);
                const assignedDisplayName = assignedNames.length > 0
                  ? (assignedNames.length === 1
                    ? abbreviateName(assignedNames[0])
                    : `${abbreviateName(assignedNames[0])} +${assignedNames.length - 1}`)
                  : null;
                const daysSince = formatDaysSince(territory.assignedDate);
                const hasAssignmentInfo = status === 'En uso' && assignedNames.length > 0;

                return (
                  <div
                    key={territory.id}
                    onClick={() => toggleSelection(territory.id)}
                    className={`
                      relative rounded-xl cursor-pointer transition-all duration-200
                      flex flex-col items-center justify-center
                      border-2 ${isSelected ? `${config.borderSelected} border-4 shadow-lg scale-105` : config.border}
                      ${config.bg}
                      hover:shadow-md hover:scale-102
                      ${hasAssignmentInfo ? 'py-2' : 'aspect-square'}
                    `}
                    style={{ minWidth: '70px', minHeight: hasAssignmentInfo ? '90px' : '70px' }}
                  >
                    {/* Número de territorio */}
                    <span className={`text-2xl font-bold ${config.text}`}>
                      {territoryNumber}
                    </span>

                    {/* Info de asignación para territorios en uso */}
                    {hasAssignmentInfo && (
                      <div className="flex flex-col items-center mt-1">
                        <span className="text-xs font-medium text-gray-700 truncate max-w-[70px]">
                          {assignedDisplayName}
                        </span>
                        {daysSince && (
                          <span className={`text-xs flex items-center gap-0.5 ${
                            daysSince.isAlert ? 'text-red-600 font-bold' : 'text-gray-500'
                          }`}>
                            {daysSince.text}
                            {daysSince.isAlert && (
                              <Icon name="alertTriangle" size={10} className="text-red-600" />
                            )}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Indicador de check cuando está seleccionado */}
                    {isSelected && (
                      <div
                        className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-white shadow-md flex items-center justify-center"
                        style={{ backgroundColor: config.accent }}
                      >
                        <Icon name="check" className="text-white text-sm" size={14} />
                      </div>
                    )}

                    {/* Indicador pequeño de estado (solo para disponibles) */}
                    {!hasAssignmentInfo && (
                      <div
                        className="absolute bottom-1 left-1/2 transform -translate-x-1/2 w-2 h-2 rounded-full"
                        style={{ backgroundColor: config.accent }}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Leyenda de colores */}
        <div className="bg-white border-t border-gray-200 px-4 py-2 flex-shrink-0">
          <div className="flex justify-center gap-6 text-xs text-gray-600">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full bg-emerald-400"></div>
              <span>Disponible</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full bg-amber-400"></div>
              <span>En uso</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full bg-rose-400"></div>
              <span>Completado</span>
            </div>
          </div>
        </div>

        {/* Barra de acciones flotante - Rediseño responsive */}
        {selectedTerritories.size > 0 && (
          <div
            className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg px-4 py-3"
            style={{ zIndex: 1000000, boxShadow: '0 -4px 20px rgba(0,0,0,0.1)' }}
          >
            <div className="max-w-4xl mx-auto flex flex-col gap-3">
              {/* Contador de selección */}
              <div className="flex items-center justify-center gap-2 text-gray-700">
                <Icon name="checkCircle" className="text-emerald-500" size={18} />
                <span className="font-medium">
                  {selectedTerritories.size} seleccionado{selectedTerritories.size > 1 ? 's' : ''}
                </span>
              </div>

              {/* Botones de acción */}
              <div className="flex gap-3">
                {/* Botón Cancelar */}
                <button
                  onClick={deselectAll}
                  className="flex-1 py-3 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-medium transition-colors text-center"
                >
                  Cancelar
                </button>

                {/* Botón Marcar Disponible (solo si hay asignados) */}
                {selectedAssignedCount > 0 && (
                  <button
                    onClick={handleReleaseTerritories}
                    className="flex-1 py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
                  >
                    <Icon name="unlock" size={18} />
                    <span>Disponible</span>
                  </button>
                )}

                {/* Botón Asignar (solo si hay libres) */}
                {selectedFreeCount > 0 && (
                  <button
                    onClick={handleAssignTerritories}
                    className="flex-1 py-3 px-4 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
                  >
                    <Icon name="userPlus" size={18} />
                    <span>Asignar</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Modal de confirmación para liberar */}
        <ConfirmDialog
          isOpen={showConfirmDialog}
          onClose={() => setShowConfirmDialog(false)}
          onConfirm={confirmRelease}
          title="Confirmar Liberación"
          message={`¿Liberar ${selectedAssignedCount} territorio${selectedAssignedCount > 1 ? 's' : ''}? Se marcarán como disponibles.`}
          confirmText={isReleasing ? "Liberando..." : "Sí, Liberar"}
          cancelText="Cancelar"
          confirmButtonClass="bg-emerald-600 hover:bg-emerald-700"
          isLoading={isReleasing}
        />

        {/* Modal para asignar territorios */}
        {showAssignModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4" style={{ zIndex: 1000001 }}>
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Icon name="userPlus" className="text-amber-600" />
                Asignar Territorios
              </h3>

              <p className="text-gray-600 mb-4">
                Selecciona un publicador para asignarle {selectedFreeCount} territorio{selectedFreeCount > 1 ? 's' : ''}.
              </p>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Publicador
                </label>
                <select
                  value={selectedUser}
                  onChange={(e) => setSelectedUser(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                >
                  <option value="">Selecciona un publicador...</option>
                  {users.filter(u => !u.isAdmin).map(user => (
                    <option key={user.id} value={user.id}>
                      {user.name} (@{user.accessCode})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowAssignModal(false);
                    setSelectedUser('');
                  }}
                  className="flex-1 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={confirmAssign}
                  disabled={!selectedUser || isAssigning}
                  className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 ${
                    selectedUser && !isAssigning
                      ? 'bg-amber-600 hover:bg-amber-700 text-white'
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  {isAssigning ? (
                    <>
                      <Icon name="loader" className="animate-spin" size={18} />
                      Asignando...
                    </>
                  ) : (
                    <>
                      <Icon name="check" size={18} />
                      Asignar
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
};

export default TerritoryManagementModal;
