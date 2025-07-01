import React, { useState, useEffect } from 'react';
import Modal from '../common/Modal';
import Icon from '../common/Icon';
import { useApp } from '../../context/AppContext';
import { useToast } from '../../hooks/useToast';
import StatsModal from './StatsModal'; // Importar el componente completo de estadísticas

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
      id: 'territories', 
      title: 'Gestión de Territorios', 
      description: 'Administrar territorios', 
      icon: 'fas fa-map-marked-alt', 
      color: 'green',
      action: () => setView('territories') 
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

            {/* Grid de opciones elegantes */}
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
        const pendingProposals = proposals.filter(p => p.status === 'pending');
        
        return (
          <div className="space-y-6">
            {/* Header de la sección */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-r from-orange-500 to-amber-600 rounded-xl flex items-center justify-center shadow-lg">
                  <i className="fas fa-clipboard-check text-white text-xl"></i>
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-gray-800">Propuestas Pendientes</h3>
                  <p className="text-gray-600 text-sm">
                    {pendingProposals.length > 0 
                      ? `${pendingProposals.length} propuesta${pendingProposals.length !== 1 ? 's' : ''} esperando revisión`
                      : 'Todas las propuestas han sido revisadas'
                    }
                  </p>
                </div>
              </div>
              
              {/* Badge contador */}
              {pendingProposals.length > 0 && (
                <div className="bg-gradient-to-r from-amber-500 to-orange-500 text-white px-4 py-2 rounded-2xl shadow-lg">
                  <span className="font-bold text-lg">{pendingProposals.length}</span>
                </div>
              )}
            </div>
            
            {pendingProposals.length === 0 ? (
              /* Estado vacío elegante */
              <div className="flex items-center justify-center py-16">
                <div className="text-center max-w-md">
                  <div className="w-24 h-24 bg-gradient-to-br from-green-100 to-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl">
                    <i className="fas fa-check-circle text-4xl text-green-500"></i>
                  </div>
                  <h4 className="text-2xl font-bold text-gray-800 mb-3">¡Todo al día!</h4>
                  <p className="text-gray-600 leading-relaxed">
                    No hay propuestas pendientes de revisión. Todas las solicitudes han sido procesadas.
                  </p>
                </div>
              </div>
            ) : (
              /* Lista de propuestas con información completa */
              <div className="space-y-6">
                {pendingProposals.map(proposal => {
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
                        
                        <div className="bg-gradient-to-r from-yellow-100 to-amber-100 px-3 py-2 rounded-xl border border-yellow-200">
                          <span className="text-xs font-bold text-yellow-800 flex items-center">
                            <i className="fas fa-clock mr-1.5"></i>
                            Pendiente
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
                      
                      {/* Botones de acción elegantes */}
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
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      
      case 'users':
        const adminUsers = users.filter(u => u.role === 'admin');
        const publisherUsers = users.filter(u => u.role !== 'admin');
        
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
              
              {/* Badge contador */}
              <div className="bg-gradient-to-r from-blue-500 to-indigo-500 text-white px-4 py-2 rounded-2xl shadow-lg">
                <span className="font-bold text-lg">{users.length}</span>
              </div>
            </div>

            {/* Sección de Administradores */}
            {adminUsers.length > 0 && (
              <div>
                <div className="flex items-center mb-4">
                  <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-violet-600 rounded-lg flex items-center justify-center mr-3">
                    <i className="fas fa-crown text-white text-sm"></i>
                  </div>
                  <h4 className="text-lg font-bold text-gray-800">Administradores</h4>
                  <span className="ml-2 bg-purple-100 text-purple-800 px-2 py-1 rounded-full text-xs font-medium">
                    {adminUsers.length}
                  </span>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
                  {adminUsers.map(user => (
                    <div key={user.id} className="bg-gradient-to-br from-purple-50 to-violet-100 rounded-2xl shadow-lg p-6 border-2 border-purple-200 hover:shadow-xl hover:scale-[1.02] transition-all duration-300">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="w-14 h-14 bg-gradient-to-r from-purple-500 to-violet-600 rounded-2xl flex items-center justify-center shadow-lg">
                            <i className="fas fa-user-shield text-white text-xl"></i>
                          </div>
                          <div>
                            <h4 className="text-lg font-bold text-gray-900">{user.name}</h4>
                            <p className="text-sm text-purple-700 font-medium flex items-center">
                              <i className="fas fa-key mr-2"></i>
                              {user.accessCode}
                            </p>
                            <div className="flex items-center mt-1">
                              <span className="bg-gradient-to-r from-purple-600 to-violet-600 text-white px-3 py-1 rounded-full text-xs font-bold">
                                ADMINISTRADOR
                              </span>
                            </div>
                          </div>
                        </div>
                        <button className="p-3 text-purple-600 hover:bg-purple-100 rounded-xl transition-colors">
                          <i className="fas fa-edit text-lg"></i>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Sección de Publicadores */}
            <div>
              <div className="flex items-center mb-4">
                <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center mr-3">
                  <i className="fas fa-users text-white text-sm"></i>
                </div>
                <h4 className="text-lg font-bold text-gray-800">Publicadores</h4>
                <span className="ml-2 bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs font-medium">
                  {publisherUsers.length}
                </span>
              </div>
              
              {publisherUsers.length === 0 ? (
                <div className="flex items-center justify-center py-12">
                  <div className="text-center max-w-md">
                    <div className="w-20 h-20 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                      <i className="fas fa-user-plus text-3xl text-blue-500"></i>
                    </div>
                    <h4 className="text-xl font-bold text-gray-800 mb-2">No hay publicadores</h4>
                    <p className="text-gray-600">Aún no se han registrado publicadores en el sistema.</p>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {publisherUsers.map(user => (
                    <div key={user.id} className="bg-gradient-to-br from-blue-50 to-indigo-100 rounded-2xl shadow-lg p-6 border-2 border-blue-200 hover:shadow-xl hover:scale-[1.02] transition-all duration-300">
                      <div className="text-center">
                        <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                          <i className="fas fa-user text-white text-2xl"></i>
                        </div>
                        <h4 className="text-lg font-bold text-gray-900 mb-2">{user.name}</h4>
                        <p className="text-sm text-blue-700 font-medium flex items-center justify-center mb-3">
                          <i className="fas fa-key mr-2"></i>
                          {user.accessCode}
                        </p>
                        <div className="flex items-center justify-center mb-4">
                          <span className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-3 py-1 rounded-full text-xs font-bold">
                            PUBLICADOR
                          </span>
                        </div>
                        <button className="w-full py-2 px-4 bg-white/70 hover:bg-white border border-blue-200 text-blue-700 rounded-xl transition-colors font-medium flex items-center justify-center gap-2">
                          <i className="fas fa-edit"></i>
                          Editar
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        );
      
      case 'territories':
        const availableTerritories = territories.filter(t => t.status === 'Disponible');
        const inUseTerritories = territories.filter(t => t.status === 'En uso');
        const completedTerritories = territories.filter(t => t.status === 'Completado' || t.status === 'Terminado');
        
        // Función para obtener configuración de colores por estado
        const getStatusConfig = (status) => {
          switch (status) {
            case 'Disponible':
              return {
                bg: 'from-green-50 to-emerald-100',
                iconBg: 'bg-green-500',
                text: 'text-green-700',
                border: 'border-green-200',
                badge: 'bg-green-500'
              };
            case 'En uso':
              return {
                bg: 'from-yellow-50 to-amber-100',
                iconBg: 'bg-yellow-500',
                text: 'text-yellow-700',
                border: 'border-yellow-200',
                badge: 'bg-yellow-500'
              };
            default: // Completado/Terminado
              return {
                bg: 'from-gray-50 to-slate-100',
                iconBg: 'bg-gray-500',
                text: 'text-gray-700',
                border: 'border-gray-200',
                badge: 'bg-gray-500'
              };
          }
        };
        
        return (
          <div className="space-y-6">
            {/* Header de la sección */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg">
                  <i className="fas fa-map-marked-alt text-white text-xl"></i>
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-gray-800">Gestión de Territorios</h3>
                  <p className="text-gray-600 text-sm">
                    {territories.length} territorio{territories.length !== 1 ? 's' : ''} en total
                  </p>
                </div>
              </div>
              
              {/* Badge contador */}
              <div className="bg-gradient-to-r from-green-500 to-emerald-500 text-white px-4 py-2 rounded-2xl shadow-lg">
                <span className="font-bold text-lg">{territories.length}</span>
              </div>
            </div>

            {/* Estadísticas rápidas */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-gradient-to-br from-green-50 to-emerald-100 rounded-2xl p-4 border-2 border-green-200">
                <div className="flex items-center">
                  <div className="w-10 h-10 bg-green-500 rounded-xl flex items-center justify-center mr-3">
                    <i className="fas fa-check-circle text-white"></i>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-green-700">{availableTerritories.length}</p>
                    <p className="text-sm text-green-600 font-medium">Disponibles</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-gradient-to-br from-yellow-50 to-amber-100 rounded-2xl p-4 border-2 border-yellow-200">
                <div className="flex items-center">
                  <div className="w-10 h-10 bg-yellow-500 rounded-xl flex items-center justify-center mr-3">
                    <i className="fas fa-clock text-white"></i>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-yellow-700">{inUseTerritories.length}</p>
                    <p className="text-sm text-yellow-600 font-medium">En Uso</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-gradient-to-br from-gray-50 to-slate-100 rounded-2xl p-4 border-2 border-gray-200">
                <div className="flex items-center">
                  <div className="w-10 h-10 bg-gray-500 rounded-xl flex items-center justify-center mr-3">
                    <i className="fas fa-flag text-white"></i>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-700">{completedTerritories.length}</p>
                    <p className="text-sm text-gray-600 font-medium">Completados</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Lista de territorios elegante */}
            {territories.length === 0 ? (
              <div className="flex items-center justify-center py-16">
                <div className="text-center max-w-md">
                  <div className="w-24 h-24 bg-gradient-to-br from-green-100 to-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl">
                    <i className="fas fa-map-plus text-4xl text-green-500"></i>
                  </div>
                  <h4 className="text-2xl font-bold text-gray-800 mb-3">No hay territorios</h4>
                  <p className="text-gray-600 leading-relaxed">
                    Aún no se han configurado territorios en el sistema.
                  </p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {territories.map(territory => {
                  const config = getStatusConfig(territory.status);
                  const addressesCount = addresses.filter(a => a.territoryId === territory.id).length;
                  const visitedCount = addresses.filter(a => a.territoryId === territory.id && a.isVisited).length;
                  const progress = addressesCount > 0 ? Math.round((visitedCount / addressesCount) * 100) : 0;
                  
                  return (
                    <div key={territory.id} className={`bg-gradient-to-br ${config.bg} rounded-2xl shadow-lg p-6 border-2 ${config.border} hover:shadow-xl hover:scale-[1.02] transition-all duration-300`}>
                      {/* Header del territorio */}
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-12 h-12 ${config.iconBg} rounded-xl flex items-center justify-center shadow-lg`}>
                            <i className="fas fa-map text-white text-lg"></i>
                          </div>
                          <div>
                            <h4 className="text-lg font-bold text-gray-900">{territory.name}</h4>
                            <div className={`inline-flex items-center px-2 py-1 rounded-lg text-xs font-bold ${config.badge} text-white`}>
                              <i className={`fas ${territory.status === 'Disponible' ? 'fa-check' : territory.status === 'En uso' ? 'fa-clock' : 'fa-flag'} mr-1`}></i>
                              {territory.status}
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      {/* Información del territorio */}
                      <div className="space-y-3">
                        {/* Progreso */}
                        <div>
                          <div className="flex justify-between text-sm font-medium text-gray-700 mb-1">
                            <span>Progreso</span>
                            <span>{progress}%</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div 
                              className={`h-2 rounded-full transition-all duration-500 ${config.badge}`}
                              style={{ width: `${progress}%` }}
                            ></div>
                          </div>
                          <p className="text-xs text-gray-600 mt-1">
                            {visitedCount} de {addressesCount} direcciones
                          </p>
                        </div>
                        
                        {/* Asignación */}
                        {territory.assignedTo ? (
                          <div className="bg-white/70 rounded-lg p-3 border border-white/50">
                            <p className="text-sm font-medium text-gray-700 flex items-center">
                              <i className="fas fa-user mr-2 text-gray-500"></i>
                              Asignado a: <span className="ml-1 font-bold">{territory.assignedTo}</span>
                            </p>
                          </div>
                        ) : (
                          <div className="bg-white/70 rounded-lg p-3 border border-white/50">
                            <p className="text-sm text-gray-600 flex items-center">
                              <i className="fas fa-user-slash mr-2 text-gray-400"></i>
                              Sin asignar
                            </p>
                          </div>
                        )}
                      </div>
                      
                      {/* Botón de acción */}
                      <button className="w-full mt-4 py-2 px-4 bg-white/70 hover:bg-white border border-white/50 text-gray-700 rounded-xl transition-colors font-medium flex items-center justify-center gap-2">
                        <i className="fas fa-edit"></i>
                        Gestionar
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
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
                Rechazar con Razón
              </button>
            </div>
          </div>
        </Modal>
      )}
      
      {/* Modal de Estadísticas Completas */}
      {showStatsModal && (
        <StatsModal 
          isOpen={showStatsModal} 
          onClose={() => setShowStatsModal(false)} 
        />
      )}
    </>
  );
};

export default AdminModal; 