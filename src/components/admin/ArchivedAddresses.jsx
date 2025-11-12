import React, { useState, useMemo, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { Archive, Search, RotateCcw, Trash2, Calendar, User, MapPin, Phone, FileText, X, AlertTriangle } from 'lucide-react';
import { getArchivedAddresses, formatArchivedAddress } from '../../utils/softDelete';

const ArchivedAddresses = ({ onClose }) => {
  const { addresses, territories, showToast, currentUser, handleRestoreAddress, handleDeleteAddress } = useApp();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTerritory, setSelectedTerritory] = useState('all');
  const [showConfirmDialog, setShowConfirmDialog] = useState(null);
  const [isRestoring, setIsRestoring] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    console.log('🎯 === COMPONENTE ArchivedAddresses MONTADO ===');
    console.log('📊 Total direcciones recibidas:', addresses.length);
    console.log('👤 Usuario actual:', currentUser?.name);

    // Verificar primeras direcciones
    if (addresses.length > 0) {
      console.log('🔍 Verificando primeras 3 direcciones:');
      addresses.slice(0, 3).forEach((addr, i) => {
        console.log(`  ${i + 1}. ID: ${addr.id}, deleted: ${addr.deleted}`);
      });
    }

    // Animación de entrada
    setIsVisible(true);
    return () => {
      console.log('❌ === COMPONENTE ArchivedAddresses DESMONTADO ===');
      setIsVisible(false);
    };
  }, []);

  // Obtener solo las direcciones archivadas
  const archivedAddresses = useMemo(() => {
    console.log('🔍 === BUSCANDO DIRECCIONES ARCHIVADAS ===');
    console.log('📊 Total direcciones en estado:', addresses.length);

    const archived = getArchivedAddresses(addresses);

    console.log('🗄️ Direcciones archivadas encontradas:', archived.length);

    if (archived.length > 0) {
      console.log('📋 Detalle de direcciones archivadas:');
      archived.forEach((addr, index) => {
        console.log(`  ${index + 1}. ID: ${addr.id}`);
        console.log(`     - Dirección: ${addr.address}`);
        console.log(`     - Territorio: ${addr.territoryId}`);
        console.log(`     - Eliminado por: ${addr.deletedByName}`);
        console.log(`     - Fecha eliminación: ${addr.deletedAt}`);
        console.log(`     - deleted flag: ${addr.deleted}`);
      });
    } else {
      console.log('⚠️ No se encontraron direcciones archivadas');
    }

    return archived;
  }, [addresses]);

  // Filtrar direcciones archivadas según búsqueda y territorio
  const filteredAddresses = useMemo(() => {
    return archivedAddresses.filter(addr => {
      const formatted = formatArchivedAddress(addr);
      const searchLower = searchTerm.toLowerCase();

      // Filtro de búsqueda
      const matchesSearch = !searchTerm ||
        formatted.address.toLowerCase().includes(searchLower) ||
        formatted.name.toLowerCase().includes(searchLower) ||
        formatted.phone.includes(searchTerm) ||
        formatted.notes.toLowerCase().includes(searchLower) ||
        formatted.deletedByName.toLowerCase().includes(searchLower);

      // Filtro de territorio
      const matchesTerritory = selectedTerritory === 'all' ||
        formatted.territoryId === selectedTerritory;

      return matchesSearch && matchesTerritory;
    });
  }, [archivedAddresses, searchTerm, selectedTerritory]);

  // Estadísticas
  const stats = useMemo(() => {
    const total = archivedAddresses.length;
    const thisMonth = archivedAddresses.filter(addr => {
      const deletedDate = addr.deletedAt?.toDate?.() || new Date(0);
      const now = new Date();
      return deletedDate.getMonth() === now.getMonth() &&
             deletedDate.getFullYear() === now.getFullYear();
    }).length;

    const byTerritory = {};
    archivedAddresses.forEach(addr => {
      const territoryId = addr.territoryId || 'Sin territorio';
      byTerritory[territoryId] = (byTerritory[territoryId] || 0) + 1;
    });

    return { total, thisMonth, byTerritory };
  }, [archivedAddresses]);

  // Manejar restauración de dirección
  const handleRestore = async (addressId) => {
    setIsRestoring(true);
    try {
      await handleRestoreAddress(addressId);
      setShowConfirmDialog(null);
    } catch (error) {
      console.error('Error al restaurar dirección:', error);
    } finally {
      setIsRestoring(false);
    }
  };

  // Manejar eliminación permanente
  const handlePermanentDelete = async (addressId) => {
    setIsDeleting(true);
    try {
      await handleDeleteAddress(addressId, { permanentDelete: true });
      setShowConfirmDialog(null);
    } catch (error) {
      console.error('Error al eliminar permanentemente:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  // Formatear fecha
  const formatDate = (timestamp) => {
    if (!timestamp) return 'Fecha desconocida';
    const date = timestamp.toDate?.() || new Date(timestamp);
    return new Intl.DateTimeFormat('es-MX', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  // Obtener nombre del territorio
  const getTerritoryName = (territoryId) => {
    const territory = territories.find(t => t.id === territoryId);
    return territory?.name || territoryId || 'Sin territorio';
  };

  return (
    <div
      data-archived-modal="true"
      className={`fixed inset-0 bg-white z-[100] flex flex-col transition-all duration-300 ${
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
      }`}
      style={{
        zIndex: 999999,
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0
      }}>
      <div className="bg-white w-full h-full flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-gray-700 to-gray-900 text-white p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Archive className="w-8 h-8" />
              <div>
                <h2 className="text-2xl font-bold">Direcciones Archivadas</h2>
                <p className="text-gray-300 text-sm mt-1">
                  Historial completo de direcciones eliminadas
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
              aria-label="Cerrar"
            >
              <X className="w-5 h-5" />
              <span className="font-medium">Cerrar</span>
            </button>
          </div>
        </div>

        {/* Estadísticas */}
        <div className="bg-gray-50 px-6 py-4 border-b">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-7xl mx-auto">
            <div className="bg-white rounded-lg p-3 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-500 text-sm">Total Archivadas</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
                </div>
                <Archive className="w-8 h-8 text-gray-400" />
              </div>
            </div>
            <div className="bg-white rounded-lg p-3 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-500 text-sm">Este Mes</p>
                  <p className="text-2xl font-bold text-blue-600">{stats.thisMonth}</p>
                </div>
                <Calendar className="w-8 h-8 text-blue-400" />
              </div>
            </div>
            <div className="bg-white rounded-lg p-3 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-500 text-sm">Territorios Afectados</p>
                  <p className="text-2xl font-bold text-green-600">
                    {Object.keys(stats.byTerritory).length}
                  </p>
                </div>
                <MapPin className="w-8 h-8 text-green-400" />
              </div>
            </div>
          </div>
        </div>

        {/* Filtros */}
        <div className="px-6 py-4 border-b bg-white shadow-sm">
          <div className="flex flex-col md:flex-row gap-4 max-w-7xl mx-auto">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Buscar por dirección, nombre, teléfono o notas..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
            <select
              value={selectedTerritory}
              onChange={(e) => setSelectedTerritory(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">Todos los territorios</option>
              {territories.map(territory => (
                <option key={territory.id} value={territory.id}>
                  {territory.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Lista de direcciones archivadas */}
        <div className="flex-1 overflow-y-auto px-6 py-4 bg-gray-50">
          {filteredAddresses.length === 0 ? (
            <div className="text-center py-12">
              <Archive className="w-16 h-16 mx-auto text-gray-300 mb-4" />
              <p className="text-gray-500 text-lg">
                {searchTerm || selectedTerritory !== 'all'
                  ? 'No se encontraron direcciones archivadas con estos filtros'
                  : 'No hay direcciones archivadas'}
              </p>
            </div>
          ) : (
            <div className="grid gap-4 max-w-7xl mx-auto">
              {filteredAddresses.map((address) => {
                const formatted = formatArchivedAddress(address);

                return (
                  <div
                    key={address.id}
                    className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                  >
                    <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                      {/* Información de la dirección */}
                      <div className="flex-1">
                        <div className="flex items-start gap-3">
                          <MapPin className="w-5 h-5 text-gray-400 mt-1 flex-shrink-0" />
                          <div className="flex-1">
                            <h3 className="font-semibold text-gray-900">
                              {formatted.address}
                            </h3>
                            <p className="text-sm text-gray-500 mt-1">
                              Territorio: {getTerritoryName(formatted.territoryId)}
                            </p>

                            {/* Detalles adicionales */}
                            <div className="mt-3 space-y-1">
                              {formatted.name && (
                                <div className="flex items-center gap-2 text-sm text-gray-600">
                                  <User className="w-4 h-4" />
                                  <span>{formatted.name}</span>
                                  {formatted.gender && (
                                    <span className="text-gray-400">• {formatted.gender}</span>
                                  )}
                                </div>
                              )}
                              {formatted.phone && (
                                <div className="flex items-center gap-2 text-sm text-gray-600">
                                  <Phone className="w-4 h-4" />
                                  <span>{formatted.phone}</span>
                                </div>
                              )}
                              {formatted.notes && (
                                <div className="flex items-start gap-2 text-sm text-gray-600">
                                  <FileText className="w-4 h-4 mt-0.5" />
                                  <span className="line-clamp-2">{formatted.notes}</span>
                                </div>
                              )}
                            </div>

                            {/* Información de eliminación */}
                            <div className="mt-3 p-2 bg-red-50 rounded-lg">
                              <div className="flex items-center gap-2 text-sm text-red-700">
                                <Trash2 className="w-4 h-4" />
                                <span className="font-medium">Archivada:</span>
                                <span>{formatDate(address.deletedAt)}</span>
                              </div>
                              <div className="mt-1 text-sm text-red-600">
                                Por: {formatted.deletedByName}
                                {formatted.deletedReason && formatted.deletedReason !== 'Eliminado por administrador' && (
                                  <span className="block mt-1 text-xs">
                                    Razón: {formatted.deletedReason}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Acciones */}
                      <div className="flex gap-2">
                        <button
                          onClick={() => setShowConfirmDialog({
                            type: 'restore',
                            addressId: address.id,
                            address: formatted.address
                          })}
                          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                          title="Restaurar dirección"
                        >
                          <RotateCcw className="w-4 h-4" />
                          <span className="hidden sm:inline">Restaurar</span>
                        </button>
                        <button
                          onClick={() => setShowConfirmDialog({
                            type: 'delete',
                            addressId: address.id,
                            address: formatted.address
                          })}
                          className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                          title="Eliminar permanentemente"
                        >
                          <Trash2 className="w-4 h-4" />
                          <span className="hidden sm:inline">Eliminar</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Diálogo de confirmación */}
        {showConfirmDialog && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[110] p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className={`p-3 rounded-full ${
                  showConfirmDialog.type === 'restore'
                    ? 'bg-green-100'
                    : 'bg-red-100'
                }`}>
                  {showConfirmDialog.type === 'restore' ? (
                    <RotateCcw className="w-6 h-6 text-green-600" />
                  ) : (
                    <AlertTriangle className="w-6 h-6 text-red-600" />
                  )}
                </div>
                <h3 className="text-lg font-semibold">
                  {showConfirmDialog.type === 'restore'
                    ? 'Restaurar Dirección'
                    : 'Eliminar Permanentemente'}
                </h3>
              </div>

              <p className="text-gray-600 mb-2">
                {showConfirmDialog.type === 'restore'
                  ? '¿Estás seguro de que deseas restaurar esta dirección?'
                  : '⚠️ Esta acción NO se puede deshacer. La dirección se eliminará permanentemente.'}
              </p>

              <div className="p-3 bg-gray-50 rounded-lg mb-6">
                <p className="text-sm font-medium text-gray-700">Dirección:</p>
                <p className="text-sm text-gray-600">{showConfirmDialog.address}</p>
              </div>

              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setShowConfirmDialog(null)}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                  disabled={isRestoring || isDeleting}
                >
                  Cancelar
                </button>
                <button
                  onClick={() => {
                    if (showConfirmDialog.type === 'restore') {
                      handleRestore(showConfirmDialog.addressId);
                    } else {
                      handlePermanentDelete(showConfirmDialog.addressId);
                    }
                  }}
                  disabled={isRestoring || isDeleting}
                  className={`px-4 py-2 text-white rounded-lg transition-colors disabled:opacity-50 ${
                    showConfirmDialog.type === 'restore'
                      ? 'bg-green-600 hover:bg-green-700'
                      : 'bg-red-600 hover:bg-red-700'
                  }`}
                >
                  {isRestoring && 'Restaurando...'}
                  {isDeleting && 'Eliminando...'}
                  {!isRestoring && !isDeleting && (
                    showConfirmDialog.type === 'restore' ? 'Restaurar' : 'Eliminar Permanentemente'
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ArchivedAddresses;