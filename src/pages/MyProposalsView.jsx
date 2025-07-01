import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';

const MyProposalsView = ({ onBack }) => {
  const { currentUser, proposals } = useApp();
  const [proposalFilter, setProposalFilter] = useState('pending');
  const [selectedProposal, setSelectedProposal] = useState(null);

  // Filtrar propuestas del usuario actual
  const userProposals = proposals.filter(p => p.submittedBy === currentUser?.email);

  // Contadores por estado
  const pendingCount = userProposals.filter(p => p.status === 'pending').length;
  const approvedCount = userProposals.filter(p => p.status === 'approved').length;
  const rejectedCount = userProposals.filter(p => p.status === 'rejected').length;

  // Configuración de filtros - Solo 3 filtros esenciales
  const filterOptions = [
    { 
      id: 'pending', 
      label: 'Pendientes', 
      count: pendingCount,
      color: 'from-amber-500 to-orange-500',
      icon: 'fas fa-clock'
    },
    { 
      id: 'approved', 
      label: 'Aprobadas', 
      count: approvedCount,
      color: 'from-green-500 to-emerald-600',
      icon: 'fas fa-check'
    },
    { 
      id: 'rejected', 
      label: 'Rechazadas', 
      count: rejectedCount,
      color: 'from-red-500 to-pink-600',
      icon: 'fas fa-times'
    }
  ];

  // Filtrar propuestas según el filtro seleccionado
  const getFilteredProposals = () => {
    switch (proposalFilter) {
      case 'pending':
        return userProposals.filter(p => p.status === 'pending');
      case 'approved':
        return userProposals.filter(p => p.status === 'approved');
      case 'rejected':
        return userProposals.filter(p => p.status === 'rejected');
      default:
        return userProposals.filter(p => p.status === 'pending');
    }
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

  // Modal de detalles
  const ProposalDetailModal = ({ proposal, onClose }) => {
    if (!proposal) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
          {/* Header del modal */}
          <div className="sticky top-0 bg-white border-b border-gray-200 p-4 rounded-t-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold text-gray-800">Detalles Completos</h3>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200"
              >
                <i className="fas fa-times text-gray-600"></i>
              </button>
            </div>
          </div>

          {/* Contenido del modal */}
          <div className="p-4 space-y-4">
            {/* Tipo y estado */}
            <div className={`p-4 rounded-xl border ${
              proposal.status === 'pending' ? 'bg-amber-50 border-amber-200' :
              proposal.status === 'approved' ? 'bg-green-50 border-green-200' :
              'bg-red-50 border-red-200'
            }`}>
              <div className="flex items-center justify-between">
                <span className="font-semibold text-gray-800">
                  {proposal.type === 'new' ? '📝 Nueva Dirección' : '✏️ Editar Dirección'}
                </span>
                <span className={`px-3 py-1 rounded-full text-sm font-bold ${
                  proposal.status === 'pending' ? 'bg-amber-200 text-amber-800' :
                  proposal.status === 'approved' ? 'bg-green-200 text-green-800' :
                  'bg-red-200 text-red-800'
                }`}>
                  {proposal.status === 'pending' ? 'PENDIENTE' :
                   proposal.status === 'approved' ? 'APROBADA' : 'RECHAZADA'}
                </span>
              </div>
            </div>

            {/* Información de la propuesta */}
            <div className="bg-gray-50 p-4 rounded-xl">
              <h4 className="font-semibold text-gray-800 mb-3">Información Propuesta:</h4>
              
              {proposal.type === 'new' ? (
                <div className="space-y-2 text-sm">
                  <p><span className="font-medium">📍 Dirección:</span> {proposal.address}</p>
                  <p><span className="font-medium">👤 Género:</span> {proposal.gender}</p>
                  {proposal.reference && (
                    <p><span className="font-medium">📋 Referencia:</span> {proposal.reference}</p>
                  )}
                  {proposal.notes && (
                    <p><span className="font-medium">📝 Notas:</span> {proposal.notes}</p>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  {/* Comparativa para ediciones */}
                  <div className="text-sm">
                    <p className="font-medium mb-2">Cambios propuestos:</p>
                    {Object.keys(proposal.changes || {}).map(field => (
                      <div key={field} className="mb-2">
                        <p className="text-gray-600 capitalize">{field}:</p>
                        <div className="flex flex-col gap-1 ml-2">
                          <span className="text-red-600">Actual: {proposal.currentData?.[field] || 'N/A'}</span>
                          <span className="text-green-600">Propuesto: {proposal.changes[field]}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Razón del publicador */}
            {proposal.reason && (
              <div className="bg-blue-50 p-4 rounded-xl border border-blue-200">
                <h4 className="font-semibold text-blue-800 mb-2">💬 Tu razón:</h4>
                <p className="text-sm text-blue-900 italic">"{proposal.reason}"</p>
              </div>
            )}

            {/* Información de procesamiento */}
            {proposal.status !== 'pending' && (
              <div className={`p-4 rounded-xl border ${
                proposal.status === 'approved' 
                  ? 'bg-green-50 border-green-200' 
                  : 'bg-red-50 border-red-200'
              }`}>
                <h4 className={`font-semibold mb-3 flex items-center ${
                  proposal.status === 'approved' ? 'text-green-800' : 'text-red-800'
                }`}>
                  <i className={`${
                    proposal.status === 'approved' ? 'fas fa-check-circle' : 'fas fa-times-circle'
                  } mr-2`}></i>
                  {proposal.status === 'approved' ? 'Aprobada por:' : 'Rechazada por:'}
                </h4>
                
                <div className="space-y-2 text-sm">
                  <p><span className="font-medium">👤 Administrador:</span> {proposal.approvedBy || proposal.rejectedBy || 'Admin'}</p>
                  <p><span className="font-medium">📅 Fecha:</span> {formatDate(proposal.approvedAt || proposal.rejectedAt)}</p>
                  
                  {proposal.status === 'rejected' && proposal.rejectionReason && (
                    <div className="mt-3 pt-3 border-t border-red-200">
                      <p className="font-medium text-red-800 mb-1">💬 Razón del rechazo:</p>
                      <p className="text-red-900 italic">"{proposal.rejectionReason}"</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Fecha de envío */}
            <div className="bg-gray-50 p-3 rounded-xl text-center">
              <p className="text-sm text-gray-600">
                <span className="font-medium">📅 Enviada el:</span> {formatDate(proposal.createdAt)}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
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
        {/* Filtros distribuidos a lo ancho completo de la pantalla */}
        <div className="bg-white rounded-xl p-3 shadow-lg border border-gray-200">
          <div className="grid grid-cols-3 gap-2">
            {filterOptions.map(filter => (
              <button
                key={filter.id}
                onClick={() => setProposalFilter(filter.id)}
                className={`
                  relative px-2 py-2.5 rounded-lg text-center transition-all duration-200 transform hover:scale-105 flex flex-col items-center gap-1
                  ${proposalFilter === filter.id 
                    ? `bg-gradient-to-r ${filter.color} text-white shadow-md` 
                    : 'bg-gray-50 text-gray-700 hover:bg-gray-100 border border-gray-200'
                  }
                `}
                title={`${filter.label} (${filter.count})`}
              >
                {/* Ícono siempre visible */}
                <i className={`${filter.icon} text-lg`}></i>
                
                {/* Contador siempre visible */}
                <span className={`text-xs font-bold ${
                  proposalFilter === filter.id 
                    ? 'text-white' 
                    : 'text-gray-600'
                }`}>
                  {filter.count || 0}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Lista de propuestas o estado vacío */}
        {filteredProposals.length === 0 ? (
          /* Estado vacío según filtro */
          <div className="flex items-center justify-center py-16">
            <div className="text-center max-w-md">
              <div className={`w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl ${
                proposalFilter === 'pending' ? 'bg-gradient-to-br from-green-100 to-emerald-100' :
                proposalFilter === 'approved' ? 'bg-gradient-to-br from-blue-100 to-indigo-100' :
                'bg-gradient-to-br from-red-100 to-pink-100'
              }`}>
                <i className={`text-4xl ${
                  proposalFilter === 'pending' ? 'fas fa-check-circle text-green-500' :
                  proposalFilter === 'approved' ? 'fas fa-check-double text-blue-500' :
                  'fas fa-times-circle text-red-500'
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
          /* Lista de propuestas */
          <div className="space-y-4">
            {filteredProposals.map(proposal => (
              <div 
                key={proposal.id} 
                className="bg-white rounded-xl p-4 shadow-lg border border-gray-200 space-y-3"
              >
                {/* Header de la propuesta */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">
                      {proposal.type === 'new' ? '📝' : '✏️'}
                    </span>
                    <span className="font-semibold text-gray-800">
                      {proposal.type === 'new' ? 'Nueva Dirección' : 'Editar Dirección'}
                    </span>
                  </div>
                  
                  {/* Estado con colores */}
                  <div className={`px-2 py-1 rounded-lg text-xs font-bold ${
                    proposal.status === 'pending' 
                      ? 'bg-amber-100 text-amber-800' :
                    proposal.status === 'approved'
                      ? 'bg-green-100 text-green-800' :
                      'bg-red-100 text-red-800'
                  }`}>
                    {proposal.status === 'pending' ? 'PENDIENTE 🕐' :
                     proposal.status === 'approved' ? 'APROBADA ✅' :
                     'RECHAZADA ❌'}
                  </div>
                </div>

                {/* Dirección */}
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-sm">
                    <span className="font-medium text-gray-600">📍 Dirección:</span>
                  </p>
                  <p className="text-gray-800 font-medium">
                    {proposal.type === 'new' ? proposal.address : proposal.currentData?.address || 'Dirección no disponible'}
                  </p>
                </div>

                {/* Fecha de envío */}
                <div className="text-xs text-gray-500">
                  📅 Enviada: {formatDate(proposal.createdAt)}
                </div>

                {/* Información de procesamiento agrupada */}
                {proposal.status !== 'pending' && (
                  <div className={`p-3 rounded-lg border ${
                    proposal.status === 'approved' 
                      ? 'bg-green-50 border-green-200' 
                      : 'bg-red-50 border-red-200'
                  }`}>
                    <div className={`font-semibold text-sm mb-2 ${
                      proposal.status === 'approved' ? 'text-green-800' : 'text-red-800'
                    }`}>
                      {proposal.status === 'approved' 
                        ? `✅ Aprobada por ${proposal.approvedBy || 'Admin'}` 
                        : `🚫 Rechazada por ${proposal.rejectedBy || 'Admin'}`
                      }
                    </div>
                    
                    {proposal.status === 'rejected' && proposal.rejectionReason && (
                      <div className="text-sm text-red-800 mb-2">
                        💬 "{proposal.rejectionReason}"
                      </div>
                    )}
                    
                    <div className="text-xs text-gray-600">
                      📅 {formatDate(proposal.approvedAt || proposal.rejectedAt)}
                    </div>
                  </div>
                )}

                {/* Estado pendiente */}
                {proposal.status === 'pending' && (
                  <div className="bg-amber-50 p-3 rounded-lg border border-amber-200">
                    <div className="text-sm text-amber-800">
                      ⏳ En espera de revisión
                    </div>
                  </div>
                )}

                {/* Botón de detalles */}
                <button
                  onClick={() => setSelectedProposal(proposal)}
                  className="w-full mt-3 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-lg font-medium hover:from-blue-600 hover:to-indigo-700 transition-all"
                >
                  Ver Detalles Completos
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal de detalles */}
      {selectedProposal && (
        <ProposalDetailModal 
          proposal={selectedProposal} 
          onClose={() => setSelectedProposal(null)} 
        />
      )}
    </div>
  );
};

export default MyProposalsView;