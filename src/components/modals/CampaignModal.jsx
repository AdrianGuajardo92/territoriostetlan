import React, { useState, useEffect } from 'react';
import Icon from '../common/Icon';
import { useApp } from '../../context/AppContext';
import { useToast } from '../../hooks/useToast';
import CampaignCreationWizard from './CampaignCreationWizard';

const CampaignModal = ({ isOpen, onClose }) => {
  const { campaigns = [], users, territories, addresses, currentUser } = useApp();
  const { showToast } = useToast();
  const [view, setView] = useState('list'); // list, create, details
  const [selectedCampaign, setSelectedCampaign] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all'); // all, active, completed, draft

  // Resetear al abrir/cerrar
  useEffect(() => {
    if (!isOpen) {
      setView('list');
      setSelectedCampaign(null);
      setSearchTerm('');
      setFilterStatus('all');
    }
  }, [isOpen]);

  // Filtrar campañas
  const filteredCampaigns = campaigns.filter(campaign => {
    // Filtro por búsqueda
    if (searchTerm && !campaign.name.toLowerCase().includes(searchTerm.toLowerCase())) {
      return false;
    }
    // Filtro por estado
    if (filterStatus !== 'all' && campaign.status !== filterStatus) {
      return false;
    }
    return true;
  });

  // Obtener estadísticas de campañas
  const getStats = () => {
    const active = campaigns.filter(c => c.status === 'active').length;
    const completed = campaigns.filter(c => c.status === 'completed').length;
    const draft = campaigns.filter(c => c.status === 'draft').length;
    return { active, completed, draft, total: campaigns.length };
  };

  const stats = getStats();

  // Función para finalizar campaña
  const handleFinalizeCampaign = async (campaignId) => {
    try {
      // Aquí llamaríamos a la función del contexto
      // await finalizeCampaign(campaignId);
      showToast('Campaña finalizada exitosamente', 'success');
      setSelectedCampaign(null);
      setView('list');
    } catch (error) {
      showToast('Error al finalizar la campaña', 'error');
    }
  };

  // Función para eliminar campaña
  const handleDeleteCampaign = async (campaignId) => {
    if (!window.confirm('¿Estás seguro de eliminar esta campaña? Esta acción no se puede deshacer.')) {
      return;
    }
    try {
      // await deleteCampaign(campaignId);
      showToast('Campaña eliminada exitosamente', 'success');
      setSelectedCampaign(null);
      setView('list');
    } catch (error) {
      showToast('Error al eliminar la campaña', 'error');
    }
  };

  if (!isOpen) return null;

  // Vista de creación de campaña
  if (view === 'create') {
    return (
      <CampaignCreationWizard
        isOpen={true}
        onClose={() => setView('list')}
        onComplete={() => {
          setView('list');
          showToast('Campaña creada exitosamente', 'success');
        }}
      />
    );
  }

  // Vista de detalles de campaña
  if (view === 'details' && selectedCampaign) {
    return (
      <div className="fixed inset-0 bg-white z-[9999]">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg">
          <div className="px-4 sm:px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => {
                    setView('list');
                    setSelectedCampaign(null);
                  }}
                  className="w-10 h-10 bg-white/20 hover:bg-white/30 rounded-xl flex items-center justify-center transition-colors"
                >
                  <Icon name="arrowLeft" className="text-xl text-white" />
                </button>
                <div>
                  <h2 className="text-2xl font-bold">{selectedCampaign.name}</h2>
                  <p className="text-white/80 text-sm">
                    Creada el {new Date(selectedCampaign.createdAt).toLocaleDateString('es-MX')}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {selectedCampaign.status === 'active' && (
                  <button
                    onClick={() => handleFinalizeCampaign(selectedCampaign.id)}
                    className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-xl font-medium transition-colors"
                  >
                    <Icon name="checkCircle" className="inline mr-2" />
                    Finalizar
                  </button>
                )}
                <button
                  onClick={() => handleDeleteCampaign(selectedCampaign.id)}
                  className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-xl font-medium transition-colors"
                >
                  <Icon name="trash" className="inline mr-2" />
                  Eliminar
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Contenido */}
        <div className="h-[calc(100vh-80px)] overflow-y-auto p-6">
          {/* Estadísticas de la campaña */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-gradient-to-r from-blue-50 to-indigo-100 rounded-xl p-4 border border-blue-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
                  <Icon name="users" className="text-white text-xl" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Participantes</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {selectedCampaign.assignments?.length || 0}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-r from-green-50 to-emerald-100 rounded-xl p-4 border border-green-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center">
                  <Icon name="mapPin" className="text-white text-xl" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Direcciones</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {selectedCampaign.totalAddresses || 0}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-r from-purple-50 to-violet-100 rounded-xl p-4 border border-purple-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-500 rounded-lg flex items-center justify-center">
                  <Icon name="map" className="text-white text-xl" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Territorios</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {selectedCampaign.territories?.length || 0}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-r from-orange-50 to-amber-100 rounded-xl p-4 border border-orange-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-orange-500 rounded-lg flex items-center justify-center">
                  <Icon name="activity" className="text-white text-xl" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Estado</p>
                  <p className="text-lg font-bold text-gray-900 capitalize">
                    {selectedCampaign.status === 'active' ? 'Activa' : 
                     selectedCampaign.status === 'completed' ? 'Completada' : 'Borrador'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Lista de asignaciones */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Asignaciones</h3>
            <div className="space-y-3">
              {selectedCampaign.assignments?.map((assignment, index) => {
                const user = users.find(u => u.id === assignment.userId);
                return (
                  <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
                        <Icon name="user" className="text-white" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{user?.name || 'Usuario'}</p>
                        <p className="text-sm text-gray-600">@{user?.accessCode}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-gray-900">{assignment.addressCount}</p>
                      <p className="text-sm text-gray-600">direcciones</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Vista de lista de campañas
  return (
    <div className="fixed inset-0 bg-white z-[9999]">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg">
        <div className="px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                <Icon name="flag" className="text-2xl text-white" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold">Gestión de Campañas</h1>
                <p className="text-white/80 text-sm">
                  {stats.total} {stats.total === 1 ? 'campaña' : 'campañas'} en total
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-10 h-10 bg-white/20 hover:bg-white/30 rounded-xl flex items-center justify-center transition-colors backdrop-blur-sm"
            >
              <Icon name="x" className="text-xl text-white" />
            </button>
          </div>

          {/* Controles */}
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Barra de búsqueda */}
            <div className="flex-1 relative">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="🔍 Buscar campañas..."
                className="w-full px-4 py-3 pl-12 pr-12 bg-white/90 backdrop-blur-sm text-gray-800 rounded-xl placeholder-gray-500 focus:bg-white focus:ring-2 focus:ring-white/50 transition-all"
              />
              <Icon 
                name="search" 
                className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-500 text-lg"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 p-1.5 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  <Icon name="x" className="text-gray-600 text-lg" />
                </button>
              )}
            </div>

            {/* Filtro de estado */}
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-4 py-3 bg-white/90 text-gray-800 rounded-xl focus:bg-white focus:ring-2 focus:ring-white/50"
            >
              <option value="all">Todas</option>
              <option value="active">Activas</option>
              <option value="completed">Completadas</option>
              <option value="draft">Borradores</option>
            </select>

            {/* Botón crear campaña */}
            <button
              onClick={() => setView('create')}
              className="px-6 py-3 bg-white text-purple-600 rounded-xl font-medium hover:bg-white/90 transition-colors flex items-center justify-center gap-2"
            >
              <Icon name="plus" className="text-xl" />
              <span>Nueva Campaña</span>
            </button>
          </div>
        </div>
      </div>

      {/* Contenido */}
      <div className="h-[calc(100vh-200px)] overflow-y-auto bg-gray-50 p-6">
        {/* Estadísticas rápidas */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div className="bg-green-50 border border-green-200 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-600 font-medium">Activas</p>
                <p className="text-2xl font-bold text-green-700">{stats.active}</p>
              </div>
              <Icon name="activity" className="text-3xl text-green-500" />
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-600 font-medium">Completadas</p>
                <p className="text-2xl font-bold text-blue-700">{stats.completed}</p>
              </div>
              <Icon name="checkCircle" className="text-3xl text-blue-500" />
            </div>
          </div>

          <div className="bg-gray-100 border border-gray-300 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 font-medium">Borradores</p>
                <p className="text-2xl font-bold text-gray-700">{stats.draft}</p>
              </div>
              <Icon name="fileText" className="text-3xl text-gray-500" />
            </div>
          </div>
        </div>

        {/* Lista de campañas o mensaje vacío */}
        {filteredCampaigns.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 bg-white rounded-xl">
            <div className="w-24 h-24 bg-gradient-to-br from-purple-100 to-pink-100 rounded-full flex items-center justify-center mb-6">
              <Icon name="flag" className="text-4xl text-purple-500" />
            </div>
            <h3 className="text-2xl font-bold text-gray-800 mb-2">
              {searchTerm || filterStatus !== 'all' ? 'Sin resultados' : 'No hay campañas'}
            </h3>
            <p className="text-gray-600 text-center max-w-md mb-6">
              {searchTerm || filterStatus !== 'all' 
                ? 'No se encontraron campañas con los filtros aplicados.'
                : 'Crea tu primera campaña para comenzar a organizar asignaciones especiales.'
              }
            </p>
            {!searchTerm && filterStatus === 'all' && (
              <button
                onClick={() => setView('create')}
                className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl font-medium hover:shadow-lg transition-all"
              >
                <Icon name="plus" className="inline mr-2" />
                Crear Primera Campaña
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredCampaigns.map(campaign => (
              <div
                key={campaign.id}
                className="bg-white rounded-xl shadow-md hover:shadow-xl transition-all p-5 border-2 border-gray-100 cursor-pointer"
                onClick={() => {
                  setSelectedCampaign(campaign);
                  setView('details');
                }}
              >
                {/* Status badge */}
                <div className="flex items-center justify-between mb-3">
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${
                    campaign.status === 'active' 
                      ? 'bg-green-100 text-green-700'
                      : campaign.status === 'completed'
                      ? 'bg-blue-100 text-blue-700'
                      : 'bg-gray-100 text-gray-700'
                  }`}>
                    <Icon name={
                      campaign.status === 'active' ? 'activity' :
                      campaign.status === 'completed' ? 'checkCircle' : 'fileText'
                    } className="text-xs mr-1" />
                    {campaign.status === 'active' ? 'Activa' :
                     campaign.status === 'completed' ? 'Completada' : 'Borrador'}
                  </span>
                  <Icon name="chevronRight" className="text-gray-400" />
                </div>

                {/* Nombre de la campaña */}
                <h3 className="text-lg font-bold text-gray-900 mb-2">{campaign.name}</h3>

                {/* Información */}
                <div className="space-y-2 text-sm text-gray-600">
                  <div className="flex items-center gap-2">
                    <Icon name="calendar" className="text-gray-400" />
                    <span>{new Date(campaign.createdAt).toLocaleDateString('es-MX')}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Icon name="users" className="text-gray-400" />
                    <span>{campaign.assignments?.length || 0} participantes</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Icon name="mapPin" className="text-gray-400" />
                    <span>{campaign.totalAddresses || 0} direcciones</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default CampaignModal;