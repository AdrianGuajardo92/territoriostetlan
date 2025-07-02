import React, { useState, useEffect } from 'react';
import Modal from '../common/Modal';
import Icon from '../common/Icon';
import { useApp } from '../../context/AppContext';
import { useToast } from '../../hooks/useToast';
import { LazyStatsModal, LazyReportsModal } from './LazyModals'; // CORRECCIÓN: Usar lazy loading para ambos
import UserManagementModal from './UserManagementModal';

const AdminModal = (props = {}) => {
  const { isOpen = false, onClose = () => {} } = props;
  const { 
    currentUser, 
    territories,
    addresses,
    proposals,
    users,
    handleApproveProposal,
    handleRejectProposal
  } = useApp();
  
  const pendingProposalsCount = proposals.filter(p => p.status === 'pending').length;
  
  const { showToast } = useToast();
  const [view, setView] = useState('actions');
  const [selectedProposal, setSelectedProposal] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [showStatsModal, setShowStatsModal] = useState(false); // Estado para las estadísticas completas
  const [showReportsModal, setShowReportsModal] = useState(false); // Estado para el modal de reportes
  const [showUserManagement, setShowUserManagement] = useState(false); // Estado para el modal de gestión de usuarios
  const [proposalFilter, setProposalFilter] = useState('pending'); // Filtro para propuestas: all, pending, approved, rejected
  
  // Estados para acordeón de usuarios
  const [expandedAdmins, setExpandedAdmins] = useState(false);
  const [expandedPublishers, setExpandedPublishers] = useState(false);
  
  useEffect(() => {
    if (isOpen) {
      setView(currentUser?.role === 'admin' ? 'actions' : 'no_access');
    }
  }, [isOpen, currentUser]);
  
  // Configuración de opciones del administrador con diseño elegante
  const adminOptions = [
    { 
      id: 'proposals', 
      title: 'Propuestas de Cambios', 
      description: pendingProposalsCount > 0 ? `${pendingProposalsCount} pendientes` : 'Ver cambios propuestos', 
      icon: 'fas fa-clipboard-check', 
      badge: pendingProposalsCount, 
      color: 'orange',
      action: () => setView('proposals') 
    },
    { 
      id: 'users', 
      title: 'Gestión de Usuarios', 
      description: 'Administrar publicadores', 
      icon: 'fas fa-users-cog', 
      color: 'blue',
      action: () => setView('users') 
    },
    { 
      id: 'reports', 
      title: 'Reportes del Sistema', 
      description: 'Generar informes detallados y exportaciones', 
      icon: 'fas fa-file-alt', 
      color: 'indigo',
      action: () => setShowReportsModal(true) 
    },
    { 
      id: 'stats', 
      title: 'Estadísticas Completas', 
      description: 'Análisis detallado con filtros y exportación', 
      icon: 'fas fa-chart-line', 
      color: 'purple',
      action: () => setShowStatsModal(true) 
    }
  ];
  
  const handleApprove = async (proposal) => {
    try {
      await handleApproveProposal(proposal.id);
      // Notificación eliminada - ya se muestra en handleApproveProposal
    } catch (error) {
      showToast('Error al aprobar propuesta', 'error');
    }
  };
  
  const handleReject = async () => {
    if (!selectedProposal || !rejectReason.trim()) {
      showToast('Por favor escribe una razón', 'warning');
      return;
    }
    
    try {
      await handleRejectProposal(selectedProposal.id, rejectReason);
      // Notificación eliminada - ya se muestra en handleRejectProposal
      setSelectedProposal(null);
      setRejectReason('');
    } catch (error) {
      showToast('Error al rechazar propuesta', 'error');
    }
  };
  
  const renderContent = () => {
    switch (view) {
      case 'no_access':
        return (
          <div className="flex items-center justify-center min-h-[60vh] p-8">
            <div className="text-center max-w-md">
              {/* Ícono elegante */}
              <div className="relative w-32 h-32 mx-auto mb-8">
                <div className="w-32 h-32 bg-gradient-to-br from-red-100 to-pink-100 rounded-full flex items-center justify-center shadow-2xl border-4 border-red-200">
                  <i className="fas fa-shield-alt text-5xl text-red-500"></i>
                </div>
                <div className="absolute -top-2 -right-2 w-12 h-12 bg-gradient-to-r from-red-500 to-pink-500 rounded-full flex items-center justify-center shadow-lg">
                  <i className="fas fa-exclamation text-white text-xl"></i>
                </div>
              </div>
              
              {/* Título y descripción */}
              <h3 className="text-3xl font-bold text-gray-900 mb-4">Acceso Restringido</h3>
              <p className="text-gray-600 text-lg leading-relaxed mb-8">
                Esta sección está reservada únicamente para administradores autorizados del sistema.
              </p>
              
              {/* Card informativa */}
              <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-2xl p-6 border-2 border-amber-200">
                <div className="flex items-center justify-center mb-4">
                  <div className="w-12 h-12 bg-amber-500 rounded-xl flex items-center justify-center mr-3">
                    <i className="fas fa-info-circle text-white text-xl"></i>
                  </div>
                  <h4 className="text-lg font-semibold text-amber-900">¿Necesitas acceso?</h4>
                </div>
                <p className="text-amber-800 text-sm leading-relaxed">
                  Si crees que deberías tener acceso a esta sección, contacta con un administrador del sistema para que revise tus permisos.
                </p>
              </div>
            </div>
          </div>
        );
      
      case 'actions':
        // Configuración de colores para cada opción
        const colorConfig = {
          orange: { 
            bg: 'from-orange-50 to-amber-100', 
            iconBg: 'bg-orange-500', 
            text: 'text-orange-600',
            accent: 'border-orange-200',
            hover: 'hover:shadow-orange-100/50'
          },
          blue: { 
            bg: 'from-blue-50 to-indigo-100', 
            iconBg: 'bg-blue-500', 
            text: 'text-blue-600',
            accent: 'border-blue-200',
            hover: 'hover:shadow-blue-100/50'
          },
          green: { 
            bg: 'from-green-50 to-emerald-100', 
            iconBg: 'bg-green-500', 
            text: 'text-green-600',
            accent: 'border-green-200',
            hover: 'hover:shadow-green-100/50'
          },
          indigo: { 
            bg: 'from-indigo-50 to-blue-100', 
            iconBg: 'bg-indigo-500', 
            text: 'text-indigo-600',
            accent: 'border-indigo-200',
            hover: 'hover:shadow-indigo-100/50'
          },
          purple: { 
            bg: 'from-purple-50 to-violet-100', 
            iconBg: 'bg-purple-500', 
            text: 'text-purple-600',
            accent: 'border-purple-200',
            hover: 'hover:shadow-purple-100/50'
          }
        };

        return (
          <div className="space-y-8">
            {/* Título de bienvenida */}
            <div className="text-center">
              <div className="w-20 h-20 bg-gradient-to-r from-slate-600 to-gray-700 rounded-3xl flex items-center justify-center mx-auto mb-4 shadow-xl">
                <i className="fas fa-tools text-3xl text-white"></i>
              </div>
              <h3 className="text-2xl font-bold text-gray-800 mb-2">Centro de Administración</h3>
              <p className="text-gray-600 max-w-md mx-auto">Gestiona todos los aspectos del sistema desde este panel central</p>
            </div>

            {/* Grid de opciones elegantes - Perfecto 2x2 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {adminOptions.map(option => {
                const config = colorConfig[option.color] || colorConfig.blue;
                
                return (
                <button 
                  key={option.id} 
                  onClick={option.action} 
                    className={`
                      relative p-6 bg-gradient-to-br ${config.bg} 
                      border-2 ${config.accent} rounded-3xl text-left 
                      transition-all duration-300 ease-out
                      hover:shadow-2xl ${config.hover} hover:scale-[1.02]
                      transform backdrop-blur-sm border-white/20 group
                    `}
                  >
                    {/* Badge de notificación elegante */}
                  {option.badge > 0 && (
                      <div className="absolute -top-3 -right-3 bg-gradient-to-r from-red-500 to-pink-500 text-white text-sm rounded-2xl w-8 h-8 flex items-center justify-center font-bold animate-pulse shadow-lg">
                      {option.badge}
                      </div>
                  )}
                    
                  <div className="flex items-start">
                      {/* Ícono elegante */}
                      <div className={`w-16 h-16 ${config.iconBg} rounded-2xl flex items-center justify-center mr-4 shadow-lg transform group-hover:scale-110 transition-transform`}>
                        <i className={`${option.icon} text-2xl text-white`}></i>
                      </div>
                      
                      {/* Contenido */}
                      <div className="flex-1 min-w-0">
                        <h4 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-gray-800 transition-colors">{option.title}</h4>
                        <p className="text-sm text-gray-600 leading-relaxed">{option.description}</p>
                      </div>
                      
                      {/* Flecha elegante */}
                      <div className="ml-2 mt-2">
                        <i className="fas fa-arrow-right text-gray-400 group-hover:text-gray-600 group-hover:translate-x-1 transition-all"></i>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
            
            {/* Footer informativo */}
            <div className="bg-gradient-to-r from-slate-100 to-gray-100 rounded-2xl p-6 border border-slate-200">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-slate-600 rounded-xl flex items-center justify-center mr-4">
                  <i className="fas fa-info-circle text-white text-lg"></i>
                </div>
                <div>
                  <h4 className="font-semibold text-slate-800 mb-1">Acceso Exclusivo</h4>
                  <p className="text-sm text-slate-600">Solo los administradores pueden acceder a estas funciones avanzadas</p>
                    </div>
                  </div>
            </div>
          </div>
        );
      
      case 'proposals':
        // Filtrar propuestas según el filtro seleccionado
        const getFilteredProposals = () => {
          switch (proposalFilter) {
            case 'pending':
              return proposals.filter(p => p.status === 'pending');
            case 'approved':
              return proposals.filter(p => p.status === 'approved');
            case 'rejected':
              return proposals.filter(p => p.status === 'rejected');
            default:
              return proposals.filter(p => p.status === 'pending');
          }
        };

        const filteredProposals = getFilteredProposals();
        const pendingCount = proposals.filter(p => p.status === 'pending').length;
        const approvedCount = proposals.filter(p => p.status === 'approved').length;
        const rejectedCount = proposals.filter(p => p.status === 'rejected').length;
        
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

        const activeFilter = filterOptions.find(f => f.id === proposalFilter);
        
        return (
          <div className="space-y-6">
            {/* Header de la sección */}
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 bg-gradient-to-r from-orange-500 to-amber-600 rounded-xl flex items-center justify-center shadow-lg">
                <i className="fas fa-clipboard-list text-white text-xl"></i>
              </div>
              <div>
                <h3 className="text-2xl font-bold text-gray-800">Historial de Propuestas</h3>
                <p className="text-gray-600 text-sm">
                  {filteredProposals.length > 0 
                    ? `${filteredProposals.length} propuesta${filteredProposals.length !== 1 ? 's' : ''} ${
                        proposalFilter === 'pending' ? 'pendientes' :
                        proposalFilter === 'approved' ? 'aprobadas' :
                        'rechazadas'
                      }`
                    : `No hay propuestas ${
                        proposalFilter === 'pending' ? 'pendientes' :
                        proposalFilter === 'approved' ? 'aprobadas' :
                        'rechazadas'
                      }`
                  }
                </p>
              </div>
            </div>

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
            
            {filteredProposals.length === 0 ? (
              /* Estado vacío elegante según filtro */
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
                    {proposalFilter === 'pending' ? '¡Todo al día!' :
                     proposalFilter === 'approved' ? 'Sin propuestas aprobadas' :
                     'Sin propuestas rechazadas'
                    }
                  </h4>
                  <p className="text-gray-600 leading-relaxed">
                    {proposalFilter === 'pending' ? 'No hay propuestas pendientes de revisión. Todas las solicitudes han sido procesadas.' :
                     proposalFilter === 'approved' ? 'Aún no se han aprobado propuestas de direcciones.' :
                     'No hay propuestas rechazadas registradas.'
                    }
                  </p>
                </div>
              </div>
            ) : (
              /* Lista de propuestas con información completa */
              <div className="space-y-6">
                {filteredProposals.map(proposal => {
                  const territory = territories.find(t => t.id === proposal.territoryId);
                  const currentAddress = proposal.type === 'edit' 
                    ? addresses.find(a => a.id === proposal.addressId) 
                    : null;
                  
                  return (
                    <div key={proposal.id} className="bg-gradient-to-br from-white to-orange-50/30 rounded-2xl shadow-lg p-6 border-2 border-orange-100 hover:shadow-xl transition-all duration-300">
                      {/* Header de la propuesta */}
                      <div className="flex items-start justify-between mb-6">
                        <div className="flex items-start gap-4">
                          <div className="w-12 h-12 bg-gradient-to-r from-orange-400 to-amber-500 rounded-xl flex items-center justify-center shadow-md">
                            <i className={`fas ${proposal.type === 'new' ? 'fa-plus' : 'fa-edit'} text-white`}></i>
                          </div>
                        <div>
                            <h4 className="text-xl font-bold text-gray-900 mb-1">
                            {proposal.type === 'new' ? 'Nueva Dirección' : 'Editar Dirección'}
                          </h4>
                            <p className="text-sm text-gray-600 flex items-center">
                              <i className="fas fa-user mr-2 text-gray-400"></i>
                              Propuesta por <span className="font-medium ml-1">{proposal.proposedByName}</span>
                            </p>
                            <p className="text-xs text-gray-500 flex items-center mt-1">
                              <i className="fas fa-clock mr-2"></i>
                              {proposal.createdAt?.toDate ? proposal.createdAt.toDate().toLocaleDateString('es-MX') : 'Fecha no disponible'}
                            </p>
                          </div>
                        </div>
                        
                        {/* Estado dinámico de la propuesta */}
                        <div className={`px-3 py-2 rounded-xl border ${
                          proposal.status === 'pending' 
                            ? 'bg-gradient-to-r from-yellow-100 to-amber-100 border-yellow-200' :
                          proposal.status === 'approved'
                            ? 'bg-gradient-to-r from-green-100 to-emerald-100 border-green-200' :
                            'bg-gradient-to-r from-red-100 to-pink-100 border-red-200'
                        }`}>
                          <span className={`text-xs font-bold flex items-center ${
                            proposal.status === 'pending' ? 'text-yellow-800' :
                            proposal.status === 'approved' ? 'text-green-800' :
                            'text-red-800'
                          }`}>
                            <i className={`${
                              proposal.status === 'pending' ? 'fas fa-clock' :
                              proposal.status === 'approved' ? 'fas fa-check' :
                              'fas fa-times'
                            } mr-1.5`}></i>
                            {proposal.status === 'pending' ? 'Pendiente' :
                             proposal.status === 'approved' ? 'Aprobada' :
                             'Rechazada'}
                        </span>
                        </div>
                      </div>
                      
                      {/* Información del territorio */}
                      <div className="bg-blue-50/50 rounded-xl p-4 mb-4 border border-blue-200/50">
                        <p className="text-sm font-semibold text-blue-800 flex items-center">
                          <i className="fas fa-map-marked-alt mr-2"></i>
                          Territorio: {territory?.name || 'Desconocido'}
                        </p>
                      </div>

                      {/* Contenido detallado según el tipo */}
                      {proposal.type === 'new' && proposal.addressData && (
                        <div className="space-y-4">
                          <h5 className="text-lg font-bold text-gray-800 flex items-center">
                            <i className="fas fa-home mr-2 text-green-600"></i>
                            Datos de la Nueva Dirección:
                          </h5>
                          
                          <div className="bg-green-50/70 rounded-xl p-4 border border-green-200/50">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {/* Dirección */}
                              <div className="md:col-span-2">
                                <p className="text-sm font-medium text-gray-700">
                                  <i className="fas fa-map-marker-alt mr-2 text-green-600"></i>
                                  <span className="font-semibold">Dirección:</span>
                                </p>
                                <p className="text-sm text-gray-800 ml-6 bg-white p-2 rounded-lg mt-1">
                                  {proposal.addressData.address || 'No especificada'}
                                </p>
                              </div>

                              {/* Género */}
                              {proposal.addressData.gender && (
                                <div>
                                  <p className="text-sm font-medium text-gray-700">
                                    <i className="fas fa-venus-mars mr-2 text-green-600"></i>
                                    <span className="font-semibold">Género:</span>
                                  </p>
                                  <p className="text-sm text-gray-800 ml-6">{proposal.addressData.gender}</p>
                                </div>
                              )}

                              {/* Referencia */}
                              {proposal.addressData.referencia && (
                                <div>
                                  <p className="text-sm font-medium text-gray-700">
                                    <i className="fas fa-compass mr-2 text-green-600"></i>
                                    <span className="font-semibold">Referencia:</span>
                                  </p>
                                  <p className="text-sm text-gray-800 ml-6">{proposal.addressData.referencia}</p>
                                </div>
                              )}

                              {/* Notas */}
                              {proposal.addressData.notes && (
                                <div className="md:col-span-2">
                                  <p className="text-sm font-medium text-gray-700">
                                    <i className="fas fa-sticky-note mr-2 text-green-600"></i>
                                    <span className="font-semibold">Notas:</span>
                                  </p>
                                  <p className="text-sm text-gray-800 ml-6 bg-white p-2 rounded-lg mt-1">
                                    {proposal.addressData.notes}
                                  </p>
                                </div>
                              )}

                              {/* Coordenadas */}
                              {(proposal.addressData.latitude && proposal.addressData.longitude) && (
                                <div className="md:col-span-2">
                                  <p className="text-sm font-medium text-gray-700">
                                    <i className="fas fa-crosshairs mr-2 text-green-600"></i>
                                    <span className="font-semibold">Coordenadas:</span>
                                  </p>
                                  <p className="text-sm text-gray-800 ml-6">
                                    Lat: {proposal.addressData.latitude}, Lng: {proposal.addressData.longitude}
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      )}

                      {proposal.type === 'edit' && proposal.changes && currentAddress && (
                        <div className="space-y-4">
                          <h5 className="text-lg font-bold text-gray-800 flex items-center">
                            <i className="fas fa-edit mr-2 text-blue-600"></i>
                            Cambios Propuestos:
                          </h5>
                          
                          {/* Dirección actual */}
                          <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                            <h6 className="font-semibold text-gray-700 mb-2 flex items-center">
                              <i className="fas fa-info-circle mr-2 text-gray-500"></i>
                              Dirección Actual:
                            </h6>
                            <p className="text-sm text-gray-800 bg-white p-2 rounded-lg">
                              {currentAddress.address}
                            </p>
                          </div>

                          {/* Cambios propuestos */}
                          <div className="bg-blue-50/70 rounded-xl p-4 border border-blue-200/50">
                            <h6 className="font-semibold text-blue-800 mb-3 flex items-center">
                              <i className="fas fa-arrow-right mr-2"></i>
                              Cambios Solicitados:
                            </h6>
                            <div className="space-y-3">
                              {Object.entries(proposal.changes).map(([field, newValue]) => {
                                const currentValue = currentAddress[field];
                                const fieldLabels = {
                                  'address': 'Dirección',
                                  'gender': 'Género',
                                  'referencia': 'Referencia',
                                  'notes': 'Notas',
                                  'latitude': 'Latitud',
                                  'longitude': 'Longitud'
                                };
                                
                                return (
                                  <div key={field} className="bg-white rounded-lg p-3 border border-blue-200">
                                    <p className="text-sm font-semibold text-blue-800 mb-2">
                                      {fieldLabels[field] || field}:
                                    </p>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                      <div>
                                        <p className="text-xs text-gray-500 mb-1">Actual:</p>
                                        <p className="text-sm text-gray-700 bg-red-50 p-2 rounded border-l-4 border-red-400">
                                          {currentValue || 'Sin valor'}
                                        </p>
                                      </div>
                                      <div>
                                        <p className="text-xs text-gray-500 mb-1">Propuesto:</p>
                                        <p className="text-sm text-gray-800 bg-green-50 p-2 rounded border-l-4 border-green-400">
                                          {newValue || 'Sin valor'}
                                        </p>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Razón del publicador */}
                        {proposal.reason && (
                        <div className="bg-amber-50/70 rounded-xl p-4 border border-amber-200/50 mt-4">
                          <h6 className="font-semibold text-amber-800 mb-2 flex items-center">
                            <i className="fas fa-comment-alt mr-2"></i>
                            Razón del Publicador:
                          </h6>
                          <p className="text-sm text-amber-900 bg-white p-3 rounded-lg border border-amber-200">
                            "{proposal.reason}"
                          </p>
                        </div>
                      )}

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
                                  {(proposal.approvedAt || proposal.rejectedAt)?.toDate 
                                    ? (proposal.approvedAt || proposal.rejectedAt).toDate().toLocaleDateString('es-MX')
                                    : 'Fecha no disponible'
                                  }
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
                      
                      {/* Botones de acción solo para propuestas pendientes */}
                      {proposal.status === 'pending' && (
                        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-orange-200">
                        <button
                          onClick={() => setSelectedProposal(proposal)}
                            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-red-100 to-pink-100 text-red-700 rounded-xl hover:from-red-200 hover:to-pink-200 transition-all transform hover:scale-105 font-medium shadow-md border border-red-200"
                        >
                            <i className="fas fa-times"></i>
                          Rechazar
                        </button>
                        <button
                          onClick={() => handleApprove(proposal)}
                            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl hover:from-green-600 hover:to-emerald-700 transition-all transform hover:scale-105 font-medium shadow-md"
                        >
                            <i className="fas fa-check"></i>
                          Aprobar
                        </button>
                      </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      
      case 'users':
        return (
          <div className="space-y-6">
            {/* Header de la sección */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
                  <i className="fas fa-users-cog text-white text-xl"></i>
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-gray-800">Gestión de Usuarios</h3>
                  <p className="text-gray-600 text-sm">
                    {users.length} usuario{users.length !== 1 ? 's' : ''} registrado{users.length !== 1 ? 's' : ''} en el sistema
                  </p>
                </div>
              </div>
              
              {/* Botón para abrir gestión completa */}
              <button
                onClick={() => setShowUserManagement(true)}
                className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl hover:from-green-600 hover:to-emerald-700 transition-all transform hover:scale-105 font-medium shadow-lg"
              >
                <i className="fas fa-cogs"></i>
                Gestión Completa
              </button>
            </div>

            {/* Vista con acordeones expandibles */}
            <div className="space-y-6">
              {/* Acordeón Administradores */}
              <div className="bg-gradient-to-br from-purple-50 to-violet-100 rounded-2xl shadow-lg border-2 border-purple-200 overflow-hidden">
                <button
                  onClick={() => setExpandedAdmins(!expandedAdmins)}
                  className="w-full p-6 text-left hover:bg-purple-100/50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-violet-600 rounded-xl flex items-center justify-center shadow-lg">
                        <i className="fas fa-crown text-white text-xl"></i>
                      </div>
                      <div>
                        <h4 className="text-xl font-bold text-purple-800">Administradores</h4>
                        <p className="text-purple-600 text-sm">Usuarios con permisos completos</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="bg-purple-100 text-purple-800 px-3 py-1 rounded-full text-sm font-bold">
                        {users.filter(u => u.role === 'admin').length}
                      </span>
                      <i className={`fas fa-chevron-${expandedAdmins ? 'up' : 'down'} text-purple-600 transition-transform`}></i>
                    </div>
                  </div>
                </button>
                
                {expandedAdmins && (
                  <div className="px-6 pb-6 border-t border-purple-200/50">
                    <div className="mt-4 space-y-3">
                      {users.filter(u => u.role === 'admin').map(admin => (
                        <div key={admin.id} className="bg-white/70 rounded-xl p-4 border border-purple-200/50 flex items-center justify-between hover:bg-white transition-colors">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-purple-500 rounded-lg flex items-center justify-center">
                              <i className="fas fa-user-shield text-white text-sm"></i>
                            </div>
                            <div>
                              <h5 className="font-bold text-gray-900">{admin.name}</h5>
                              <p className="text-sm text-gray-600">@{admin.accessCode}</p>
                            </div>
                          </div>
                          {admin.id === currentUser?.id && (
                            <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-medium">
                              Tú
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Acordeón Publicadores */}
              <div className="bg-gradient-to-br from-blue-50 to-indigo-100 rounded-2xl shadow-lg border-2 border-blue-200 overflow-hidden">
                <button
                  onClick={() => setExpandedPublishers(!expandedPublishers)}
                  className="w-full p-6 text-left hover:bg-blue-100/50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
                        <i className="fas fa-users text-white text-xl"></i>
                      </div>
                      <div>
                        <h4 className="text-xl font-bold text-blue-800">Publicadores</h4>
                        <p className="text-blue-600 text-sm">Usuarios estándar del sistema</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-bold">
                        {users.filter(u => u.role !== 'admin').length}
                      </span>
                      <i className={`fas fa-chevron-${expandedPublishers ? 'up' : 'down'} text-blue-600 transition-transform`}></i>
                    </div>
                  </div>
                </button>
                
                {expandedPublishers && (
                  <div className="px-6 pb-6 border-t border-blue-200/50">
                    <div className="mt-4 space-y-3 max-h-64 overflow-y-auto">
                      {users.filter(u => u.role !== 'admin').length === 0 ? (
                        <div className="text-center py-8">
                          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                            <i className="fas fa-users text-blue-500 text-xl"></i>
                          </div>
                          <p className="text-gray-600">No hay publicadores registrados</p>
                        </div>
                      ) : (
                        users.filter(u => u.role !== 'admin').map(publisher => (
                          <div key={publisher.id} className="bg-white/70 rounded-xl p-4 border border-blue-200/50 flex items-center justify-between hover:bg-white transition-colors">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
                                <i className="fas fa-user text-white text-sm"></i>
                              </div>
                              <div>
                                <h5 className="font-bold text-gray-900">{publisher.name}</h5>
                                <p className="text-sm text-gray-600">@{publisher.accessCode}</p>
                              </div>
                            </div>
                            {publisher.id === currentUser?.id && (
                              <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-medium">
                                Tú
                              </span>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Card Total (sin acordeón) */}
              <div className="bg-gradient-to-br from-green-50 to-emerald-100 rounded-2xl shadow-lg p-6 border-2 border-green-200">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg">
                    <i className="fas fa-users-cog text-white text-xl"></i>
                  </div>
                  <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-bold">
                    {users.length}
                  </span>
                </div>
                <h4 className="text-xl font-bold text-green-800 mb-2">Total Usuarios</h4>
                <p className="text-green-600 text-sm">Registrados en el sistema</p>
              </div>
            </div>

            {/* Mensaje informativo */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-6 border border-blue-200">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
                  <i className="fas fa-info text-white text-sm"></i>
                </div>
                <h5 className="text-lg font-bold text-blue-800">Gestión Completa de Usuarios</h5>
              </div>
              <p className="text-blue-700 mb-4">
                Para crear, editar, eliminar usuarios o resetear contraseñas, utiliza el botón "Gestión Completa" arriba.
              </p>
              <div className="flex flex-wrap gap-2">
                <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-xs font-medium">
                  ✅ Crear usuarios
                </span>
                <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-xs font-medium">
                  ✅ Editar información
                </span>
                <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-xs font-medium">
                  ✅ Resetear contraseñas
                </span>
                <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-xs font-medium">
                  ✅ Eliminar usuarios
                </span>
              </div>
            </div>


          </div>
        );
      


      
      default:
        return <div className="p-6 text-center">Vista no reconocida</div>;
    }
  };

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title=""
        size="full"
      >
        <div className="h-full flex flex-col bg-gradient-to-br from-slate-50 via-white to-gray-50">
          {/* Header elegante con temática consistente */}
          <div className="shadow-xl px-4 py-6 flex-shrink-0" style={{ backgroundColor: '#2C3E50' }}>
            <div className="flex items-center justify-between">
              {/* Título con ícono */}
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center backdrop-blur-sm">
                  <i className="fas fa-user-shield text-2xl text-white"></i>
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">Panel de Administrador</h2>
                  <p className="text-white/70 text-sm">Gestión completa del sistema</p>
                </div>
              </div>
              
              {/* Botón cerrar elegante */}
              <button 
                onClick={onClose}
                className="p-3 rounded-xl transition-all transform hover:scale-105 group"
                style={{ backgroundColor: '#34495e' }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#3a526b'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#34495e'}
              >
                <Icon name="x" size={20} className="text-white group-hover:rotate-90 transition-transform" />
              </button>
            </div>
            
            {/* Breadcrumb elegante */}
            {view !== 'actions' && view !== 'no_access' && (
              <div className="mt-4 flex items-center">
                <button 
                  onClick={() => setView('actions')} 
                  className="flex items-center gap-2 px-4 py-2 bg-white/10 text-white/90 rounded-xl hover:bg-white/20 transition-all transform hover:scale-105 backdrop-blur-sm"
                >
                  <i className="fas fa-arrow-left"></i>
                  <span className="font-medium">Volver al Panel</span>
                </button>
              </div>
            )}
          </div>
          
          {/* Contenido scrolleable con diseño elegante */}
          <div className="flex-1 overflow-y-auto min-h-0 p-4 sm:p-6" style={{ maxHeight: 'calc(100vh - 140px)' }}>
            {renderContent()}
          </div>
        </div>
      </Modal>
      
      {/* Modal para rechazar propuesta */}
      {selectedProposal && (
        <Modal isOpen={true} onClose={() => setSelectedProposal(null)} size="sm">
          <div className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Razón del Rechazo</h3>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows="4"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
              placeholder="Explica por qué se rechaza esta propuesta..."
              autoFocus
            />
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => {
                  setSelectedProposal(null);
                  setRejectReason('');
                }}
                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleReject}
                disabled={!rejectReason.trim()}
                className="px-4 py-2 text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:bg-red-400"
              >
                Rechazar
              </button>
            </div>
          </div>
        </Modal>
      )}
      
      {/* Modal de Estadísticas Completas */}
            {showStatsModal && (
        <LazyStatsModal
          isOpen={showStatsModal}
          onClose={() => setShowStatsModal(false)}
        />
      )}
      
      {/* Modal de Reportes */}
      {showReportsModal && (
        <LazyReportsModal 
          isOpen={showReportsModal} 
          onClose={() => setShowReportsModal(false)} 
          modalId="admin-reports-modal"
        />
      )}
      
      {/* Modal de Gestión de Usuarios */}
      {showUserManagement && (
        <UserManagementModal
          isOpen={showUserManagement}
          onClose={() => setShowUserManagement(false)}
          modalId="user-management-modal"
        />
      )}
    </>
  );
};

export default AdminModal; 