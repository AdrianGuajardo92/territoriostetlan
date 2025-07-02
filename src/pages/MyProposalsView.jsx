import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';

const MyProposalsView = ({ onBack }) => {
  const { currentUser, proposals, territories } = useApp();
  const [proposalFilter, setProposalFilter] = useState('pending');

  // Filtrar propuestas del usuario actual
  const userProposals = proposals.filter(p => p.proposedBy === currentUser?.email);

  // Contadores por estado
  const pendingCount = userProposals.filter(p => p.status === 'pending').length;
  const approvedCount = userProposals.filter(p => p.status === 'approved').length;
  const rejectedCount = userProposals.filter(p => p.status === 'rejected').length;

  // Configuración de filtros con contadores
  const filterOptions = [
    { 
      id: 'pending', 
      label: 'Pendientes', 
      count: pendingCount,
      color: 'bg-yellow-100 text-yellow-800',
      activeColor: 'bg-yellow-500 text-white',
      icon: 'fas fa-clock'
    },
    { 
      id: 'approved', 
      label: 'Aprobadas', 
      count: approvedCount,
      color: 'bg-green-100 text-green-800',
      activeColor: 'bg-green-500 text-white',
      icon: 'fas fa-check'
    },
    { 
      id: 'rejected', 
      label: 'Rechazadas', 
      count: rejectedCount,
      color: 'bg-red-100 text-red-800',
      activeColor: 'bg-red-500 text-white',
      icon: 'fas fa-times'
    }
  ];

  // Filtrar propuestas según el filtro seleccionado
  const getFilteredProposals = () => {
    return userProposals.filter(p => p.status === proposalFilter);
  };

  const filteredProposals = getFilteredProposals();

  // Función para formatear fecha
  const formatDate = (date) => {
    if (!date) return 'Fecha no disponible';
    if (date.toDate) {
      return date.toDate().toLocaleDateString('es-MX');
    }
    return new Date(date).toLocaleDateString('es-MX');
  };

  // Función para formatear fecha corta para móvil
  const formatDateShort = (date) => {
    if (!date) return 'Sin fecha';
    if (date.toDate) {
      return date.toDate().toLocaleDateString('es-MX', { month: 'short', day: 'numeric' });
    }
    return new Date(date).toLocaleDateString('es-MX', { month: 'short', day: 'numeric' });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header con botón de regreso */}
      <div className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-md mx-auto px-4 py-3">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors"
            >
              <i className="fas fa-arrow-left text-gray-600"></i>
            </button>
            <div>
              <h1 className="text-xl font-bold text-gray-800">Mis Propuestas</h1>
              <p className="text-sm text-gray-600">
                {userProposals.length} propuesta{userProposals.length !== 1 ? 's' : ''} realizadas
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-md mx-auto p-4 space-y-6">
        {/* Filtros optimizados para móvil */}
        <div className="bg-white rounded-xl p-4 shadow-lg border border-gray-200">
          <div className="grid grid-cols-3 gap-3">
            {filterOptions.map(filter => (
              <button
                key={filter.id}
                onClick={() => setProposalFilter(filter.id)}
                className={`
                  relative px-3 py-3 rounded-xl text-center transition-all duration-200 transform hover:scale-105 flex flex-col items-center gap-2
                  ${proposalFilter === filter.id 
                    ? `${filter.activeColor} shadow-lg` 
                    : `${filter.color} hover:shadow-md border border-gray-200`
                  }
                `}
              >
                <i className={`${filter.icon} text-lg`}></i>
                <div className="flex flex-col items-center">
                  <span className="text-xs font-medium">{filter.label}</span>
                  <span className="text-lg font-bold">{filter.count || 0}</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Lista de propuestas o estado vacío */}
        {filteredProposals.length === 0 ? (
          <div className="flex items-center justify-center py-16">
            <div className="text-center max-w-md">
              <div className={`w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl ${
                proposalFilter === 'pending' ? 'bg-gradient-to-br from-yellow-100 to-amber-100' :
                proposalFilter === 'approved' ? 'bg-gradient-to-br from-green-100 to-emerald-100' :
                'bg-gradient-to-br from-red-100 to-pink-100'
              }`}>
                <i className={`text-4xl ${
                  proposalFilter === 'pending' ? 'fas fa-clock text-yellow-500' :
                  proposalFilter === 'approved' ? 'fas fa-check text-green-500' :
                  'fas fa-times text-red-500'
                }`}></i>
              </div>
              <h4 className="text-2xl font-bold text-gray-800 mb-3">
                {proposalFilter === 'pending' ? 'Sin propuestas pendientes' :
                 proposalFilter === 'approved' ? 'Sin propuestas aprobadas' :
                 'Sin propuestas rechazadas'
                }
              </h4>
              <p className="text-gray-600 leading-relaxed">
                {proposalFilter === 'pending' ? 'Aún no has enviado propuestas para revisión.' :
                 proposalFilter === 'approved' ? 'Ninguna de tus propuestas ha sido aprobada aún.' :
                 'Ninguna de tus propuestas ha sido rechazada.'
                }
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredProposals.map(proposal => {
              const territory = territories.find(t => t.id === proposal.territoryId);
              
              return (
                <div 
                  key={proposal.id} 
                  className="bg-gradient-to-br from-white to-orange-50/30 rounded-2xl shadow-lg p-4 sm:p-6 border-2 border-orange-100 hover:shadow-xl transition-all duration-300"
                >
                  {/* Header de la propuesta - Optimizado para móvil */}
                  <div className="flex items-start justify-between mb-4 sm:mb-6">
                    <div className="flex items-start gap-3 sm:gap-4 flex-1">
                      <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-r from-orange-400 to-amber-500 rounded-xl flex items-center justify-center shadow-md flex-shrink-0">
                        <i className={`fas ${proposal.type === 'new' ? 'fa-plus' : 'fa-edit'} text-white text-sm sm:text-base`}></i>
                      </div>
                      <div className="w-full">
                        {/* Header limpio sin etiqueta duplicada */}
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="text-lg sm:text-xl font-bold text-gray-900 flex-1 mr-3 truncate">
                            📝 {proposal.type === 'new' ? 'Nueva Dirección' : 'Editar Dirección'}
                          </h4>
                          <p className="text-xs text-gray-500 flex items-center flex-shrink-0">
                            <i className="fas fa-calendar mr-1"></i>
                            <span className="hidden sm:inline">
                              {formatDate(proposal.createdAt)}
                            </span>
                            <span className="sm:hidden">
                              {formatDateShort(proposal.createdAt)}
                            </span>
                          </p>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800">
                            🏷️ Territorio {territory?.name?.replace(/territorio\s*/i, '') || proposal.territoryId}
                          </span>
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ml-2 ${
                            proposal.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                            proposal.status === 'approved' ? 'bg-green-100 text-green-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {proposal.status === 'pending' ? '⏳ Pendiente' :
                             proposal.status === 'approved' ? '✅ Aprobada' :
                             '❌ Rechazada'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Contenido con formato de barras verdes */}
                  <div className="space-y-4">
                    <h5 className="text-lg font-bold text-gray-800 flex items-center">
                      <i className="fas fa-edit mr-2 text-blue-600"></i>
                      🔄 TUS CAMBIOS PROPUESTOS:
                    </h5>
                    
                    <div className="space-y-3">
                      {/* Para propuestas nuevas */}
                      {proposal.type === 'new' && proposal.addressData && (
                        <>
                          {/* Dirección nueva */}
                          <div className="bg-white rounded-lg p-3 border-l-4 border-green-400">
                            <p className="text-sm font-semibold text-gray-700 mb-2">
                              📍 Nueva dirección:
                            </p>
                            <p className="text-sm text-gray-800 break-words">
                              {proposal.addressData.address || 'No especificada'}
                            </p>
                          </div>
                          
                          {/* Revisita - Formato como notas */}
                          {proposal.addressData.isRevisita && proposal.addressData.revisitaBy && (
                            <div className="bg-green-50 p-3 rounded-lg border-l-4 border-green-400">
                              <p className="text-sm font-semibold text-green-700 mb-1">📖 Revisita:</p>
                              <p className="text-sm text-gray-800 break-words">
                                {proposal.addressData.revisitaBy}
                              </p>
                            </div>
                          )}
                          
                          {/* Estudio - Formato como notas */}
                          {proposal.addressData.isEstudio && proposal.addressData.estudioBy && (
                            <div className="bg-green-50 p-3 rounded-lg border-l-4 border-green-400">
                              <p className="text-sm font-semibold text-green-700 mb-1">📚 Estudio:</p>
                              <p className="text-sm text-gray-800 break-words">
                                {proposal.addressData.estudioBy}
                              </p>
                            </div>
                          )}
                          
                          {/* Género - Formato como notas */}
                          {proposal.addressData.gender && (
                            <div className="bg-green-50 p-3 rounded-lg border-l-4 border-green-400">
                              <p className="text-sm font-semibold text-green-700 mb-1">👥 Género:</p>
                              <p className="text-sm text-gray-800 break-words">
                                {proposal.addressData.gender}
                              </p>
                            </div>
                          )}
                          
                          {/* Notas */}
                          {proposal.addressData.notes && (
                            <div className="bg-green-50 p-3 rounded-lg border-l-4 border-green-400">
                              <p className="text-sm font-semibold text-green-700 mb-1">📝 Notas:</p>
                              <p className="text-sm text-gray-800 italic break-words">
                                "{proposal.addressData.notes}"
                              </p>
                            </div>
                          )}
                        </>
                      )}
                      
                      {/* Para ediciones */}
                      {proposal.type === 'edit' && proposal.changes && (
                        <>
                          {/* Dirección - si hay cambio */}
                          {proposal.changes.address && (
                            <div className="bg-white rounded-lg p-3 border-l-4 border-green-400">
                              <p className="text-sm font-semibold text-gray-700 mb-2">📍 Dirección:</p>
                              <div className="space-y-2">
                                <p className="text-xs text-gray-500">Antes:</p>
                                <p className="text-sm text-gray-700 bg-red-50 p-2 rounded border-l-4 border-red-400 break-words">
                                  {proposal.currentData?.address || 'Sin valor'}
                                </p>
                                <p className="text-xs text-gray-500">Después:</p>
                                <p className="text-sm text-gray-800 bg-green-50 p-2 rounded border-l-4 border-green-400 break-words">
                                  {proposal.changes.address || 'Sin valor'}
                                </p>
                              </div>
                            </div>
                          )}
                          
                          {/* Revisita - Formato como notas */}
                          {proposal.changes.isRevisita && (
                            <div className="bg-green-50 p-3 rounded-lg border-l-4 border-green-400">
                              <p className="text-sm font-semibold text-green-700 mb-1">📖 Revisita:</p>
                              <p className="text-sm text-gray-800 break-words">
                                {proposal.changes.revisitaBy || ''}
                              </p>
                            </div>
                          )}
                          
                          {/* Estudio - Formato como notas */}
                          {proposal.changes.isEstudio && (
                            <div className="bg-green-50 p-3 rounded-lg border-l-4 border-green-400">
                              <p className="text-sm font-semibold text-green-700 mb-1">📚 Estudio:</p>
                              <p className="text-sm text-gray-800 break-words">
                                {proposal.changes.estudioBy || ''}
                              </p>
                            </div>
                          )}
                          
                          {/* Género - Formato como notas */}
                          {proposal.changes.gender && (
                            <div className="bg-green-50 p-3 rounded-lg border-l-4 border-green-400">
                              <p className="text-sm font-semibold text-green-700 mb-1">👥 Género:</p>
                              <p className="text-sm text-gray-800 break-words">
                                {proposal.changes.gender}
                              </p>
                            </div>
                          )}
                          
                          {/* Notas */}
                          {proposal.changes.notes && (
                            <div className="bg-green-50 p-3 rounded-lg border-l-4 border-green-400">
                              <p className="text-sm font-semibold text-green-700 mb-1">📝 Notas:</p>
                              <p className="text-sm text-gray-800 italic break-words">
                                "{proposal.changes.notes}"
                              </p>
                            </div>
                          )}
                        </>
                      )}
                      
                      {/* Razón del cambio */}
                      {proposal.reason && (
                        <div className="bg-green-50 p-3 rounded-lg border-l-4 border-green-400">
                          <p className="text-sm font-semibold text-green-700 mb-1">💬 Tu razón:</p>
                          <p className="text-sm text-gray-800 italic break-words">
                            "{proposal.reason}"
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Información de procesamiento para propuestas aprobadas/rechazadas */}
                  {proposal.status !== 'pending' && (
                    <div className={`rounded-xl p-4 border mt-4 ${
                      proposal.status === 'approved' 
                        ? 'bg-green-50/70 border-green-200/50' 
                        : 'bg-red-50/70 border-red-200/50'
                    }`}>
                      <h6 className={`font-semibold mb-2 flex items-center ${
                        proposal.status === 'approved' ? 'text-green-800' : 'text-red-800'
                      }`}>
                        <i className={`${
                          proposal.status === 'approved' ? 'fas fa-check-circle' : 'fas fa-times-circle'
                        } mr-2`}></i>
                        {proposal.status === 'approved' ? 'Propuesta Aprobada' : 'Propuesta Rechazada'}
                      </h6>
                      <div className="bg-white p-3 rounded-lg border border-opacity-50">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                          <div>
                            <p className="text-gray-600">
                              <span className="font-medium">Procesada por:</span>
                            </p>
                            <p className="text-gray-800">
                              {proposal.approvedBy || proposal.rejectedBy || 'Administrador'}
                            </p>
                          </div>
                          <div>
                            <p className="text-gray-600">
                              <span className="font-medium">Fecha:</span>
                            </p>
                            <p className="text-gray-800">
                              {formatDate(proposal.approvedAt || proposal.rejectedAt)}
                            </p>
                          </div>
                        </div>
                        {proposal.status === 'rejected' && proposal.rejectionReason && (
                          <div className="mt-3 pt-3 border-t border-red-200">
                            <p className="text-gray-600 text-sm">
                              <span className="font-medium">Razón del rechazo:</span>
                            </p>
                            <p className="text-red-800 text-sm mt-1 italic">
                              "{proposal.rejectionReason}"
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default MyProposalsView;