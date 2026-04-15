import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { useBackHandler } from '../hooks/useBackHandler';
import ActionTypeBadge, { getActionType } from '../components/common/ActionTypeBadge';
import { formatRelativeTime } from '../utils/helpers';

// Función helper para formatear valores en propuestas
const formatValue = (value) => {
  if (value === undefined || value === null || value === '') return 'Sin valor';
  if (typeof value === 'boolean') return value ? 'Sí' : 'No';
  return String(value);
};

// Etiquetas para los campos de propuestas (solo campos relevantes)
const fieldLabels = {
  address: '📍 Dirección',
  phone: '📞 Teléfono',
  name: '👤 Nombre',
  notes: '📝 Notas',
  gender: '👥 Género',
  isRevisita: '📖 Es Revisita',
  revisitaBy: '📖 Revisita por',
  isEstudio: '📚 Es Estudio',
  estudioBy: '📚 Estudio por',
  isVisited: '✅ Visitada',
  isPhoneOnly: '📱 Solo Teléfono',
  latitude: '🌐 Latitud',
  longitude: '🌐 Longitud',
  mapUrl: '🗺️ URL del Mapa'
};

// Función para filtrar cambios reales (respaldo para propuestas legacy)
const getDisplayChanges = (changes, currentAddress) => {
  if (!changes || !currentAddress) return changes || {};

  // Campos booleanos que deben tratar undefined/null/false como equivalentes
  const camposBooleanos = ['isEstudio', 'isRevisita', 'isVisited', 'isPhoneOnly'];

  // Normalizar valores para comparación correcta
  const normalizeValue = (value, fieldName) => {
    // Para campos booleanos, normalizar valores "vacíos/falsos" a false
    if (camposBooleanos.includes(fieldName)) {
      if (value === undefined || value === null || value === '' ||
          value === false || value === 'No' || value === 'Sin valor') {
        return false;
      }
      return true;
    }

    // Para otros campos, normalizar valores vacíos a null
    if (value === undefined || value === null || value === '' || value === 'Sin valor') {
      return null;
    }

    // Strings: limpiar espacios
    if (typeof value === 'string') {
      return value.trim();
    }

    // Objetos: convertir a JSON para comparación
    if (typeof value === 'object') {
      return JSON.stringify(value);
    }

    return value;
  };

  const filteredChanges = {};
  const camposRelevantes = Object.keys(fieldLabels);

  Object.entries(changes).forEach(([campo, valorNuevo]) => {
    // Solo mostrar campos que están en fieldLabels (ignorar técnicos)
    if (!camposRelevantes.includes(campo)) return;

    const valorAnterior = currentAddress[campo];
    const normalizedAnterior = normalizeValue(valorAnterior, campo);
    const normalizedNuevo = normalizeValue(valorNuevo, campo);

    // Solo incluir si realmente cambió
    if (normalizedAnterior !== normalizedNuevo) {
      filteredChanges[campo] = valorNuevo;
    }
  });

  return filteredChanges;
};

const MyProposalsView = ({ onBack }) => {
  const {
    currentUser,
    proposals,
    territories,
    addresses, // ✅ NUEVO: Para filtrar propuestas legacy
    handleDeleteProposal,
    handleDeleteProposalsByStatus,
    markProposalsAsRead,
    userNotificationsCount // ✅ NUEVO: Contador de notificaciones
  } = useApp();
  const [proposalFilter, setProposalFilter] = useState('pending');
  const [showInstructions, setShowInstructions] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null); // { type: 'single', id: 'xxx' } o { type: 'bulk', status: 'approved' }

  // Overlays custom (no usan <Modal>); registrar en el back stack.
  useBackHandler({ isOpen: showInstructions, onClose: () => setShowInstructions(false), id: 'my-proposals-instructions' });
  useBackHandler({ isOpen: !!showDeleteConfirm, onClose: () => setShowDeleteConfirm(null), id: 'my-proposals-delete-confirm' });

  // Filtrar propuestas del usuario actual
  const userProposals = proposals.filter(p => 
    p.proposedBy === currentUser?.id || p.proposedByName === currentUser?.name
  );

  // Contadores por estado
  const pendingCount = userProposals.filter(p => p.status === 'pending').length;
  const approvedCount = userProposals.filter(p => p.status === 'approved').length;
  const rejectedCount = userProposals.filter(p => p.status === 'rejected').length;

  // ✅ NUEVO: Marcar propuestas como leídas cuando se abre la vista
  useEffect(() => {
    if (currentUser && currentUser.role !== 'admin') {
      markProposalsAsRead();
    }
  }, [currentUser?.id]); // ✅ MEJORA: Ejecutar cuando cambie el usuario actual

  // Configuración de filtros con diseño mejorado
  const filterOptions = [
    { 
      id: 'pending', 
      label: 'Pendientes', 
      count: pendingCount,
      color: 'bg-yellow-100 text-yellow-800',
      activeColor: 'bg-yellow-500 text-white',
      icon: '⏳'
    },
    { 
      id: 'approved', 
      label: 'Aprobadas', 
      count: approvedCount,
      color: 'bg-green-100 text-green-800',
      activeColor: 'bg-green-500 text-white',
      icon: '✅'
    },
    { 
      id: 'rejected', 
      label: 'Rechazadas', 
      count: rejectedCount,
      color: 'bg-red-100 text-red-800',
      activeColor: 'bg-red-500 text-white',
      icon: '❌'
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

  // Función para formatear fecha compacta en móvil
  const formatDateMobile = (date) => {
    if (!date) return 'Sin fecha';
    if (date.toDate) {
      return date.toDate().toLocaleDateString('es-MX', { month: 'short', day: 'numeric' });
    }
    return new Date(date).toLocaleDateString('es-MX', { month: 'short', day: 'numeric' });
  };

  // Funciones para manejar eliminación de propuestas
  const handleDeleteSingle = async (proposalId) => {
    try {
      await handleDeleteProposal(proposalId);
      setShowDeleteConfirm(null);
    } catch (error) {
      console.error('Error deleting proposal:', error);
    }
  };

  const handleDeleteBulk = async (status) => {
    try {
      await handleDeleteProposalsByStatus(status, currentUser?.id);
      setShowDeleteConfirm(null);
    } catch (error) {
      console.error('Error deleting proposals:', error);
    }
  };

  const openDeleteConfirm = (type, data) => {
    setShowDeleteConfirm({ type, ...data });
  };

  // Componente de notificación bonita
  const InstructionsNotification = () => {
    if (!showInstructions) return null;

    return (
      <div 
        className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn"
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            setShowInstructions(false);
          }
        }}
      >
        <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-gray-100 overflow-hidden transform transition-all duration-300 animate-slideInUp">
          {/* Header elegante y discreto */}
          <div className="bg-gradient-to-r from-slate-700 to-slate-800 px-6 py-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center animate-pulse">
                  <i className="fas fa-info-circle text-white text-xl"></i>
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-white">Guía de Propuestas</h3>
                  <p className="text-slate-200 text-sm">Instrucciones paso a paso</p>
                </div>
              </div>
              <button
                onClick={() => setShowInstructions(false)}
                className="w-9 h-9 bg-white/10 rounded-full flex items-center justify-center hover:bg-white/20 transition-all transform hover:scale-105"
              >
                <i className="fas fa-times text-white text-sm"></i>
              </button>
            </div>
          </div>

          {/* Contenido profesional */}
          <div className="p-6">
            <div className="mb-6">
              <h4 className="text-lg font-semibold text-gray-800 mb-2">¿Cómo crear una propuesta?</h4>
              <p className="text-gray-600 text-sm leading-relaxed">
                Sigue estos pasos para enviar una propuesta de cambio al administrador:
              </p>
            </div>

            <div className="space-y-3">
              {[
                { number: '1', text: 'Navegar a cualquier territorio', icon: 'map-marked-alt' },
                { number: '2', text: 'Localizar una dirección existente', icon: 'search-location' },
                { number: '3', text: 'Hacer clic en el botón "Editar"', icon: 'edit' },
                { number: '4', text: 'Modificar los datos necesarios', icon: 'pen' },
                { number: '5', text: 'Guardar los cambios realizados', icon: 'save' }
              ].map((step, index) => (
                <div 
                  key={index} 
                  className="flex items-center gap-4 p-4 rounded-lg bg-gray-50 border border-gray-200 hover:shadow-sm transition-all duration-200 animate-slideInLeft"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <div className="flex items-center justify-center w-8 h-8 bg-slate-600 text-white rounded-full text-sm font-semibold flex-shrink-0">
                    {step.number}
                  </div>
                  <div className="flex items-center gap-3 flex-1">
                    <i className={`fas fa-${step.icon} text-slate-500 text-sm`}></i>
                    <span className="text-gray-700 font-medium text-sm">{step.text}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Nota final profesional */}
            <div className="mt-6 p-4 bg-slate-50 border border-slate-200 rounded-lg">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-slate-600 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <i className="fas fa-check text-white text-xs"></i>
                </div>
                <div>
                  <h5 className="font-semibold text-slate-800 text-sm mb-1">Resultado</h5>
                  <p className="text-slate-600 text-xs leading-relaxed">
                    Tu propuesta se enviará automáticamente al administrador para su revisión y aparecerá listada en esta sección.
                  </p>
                </div>
              </div>
            </div>

            {/* Botón de cierre profesional */}
            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setShowInstructions(false)}
                className="px-6 py-3 bg-slate-700 hover:bg-slate-800 text-white rounded-lg font-medium transition-all transform hover:scale-105 shadow-sm hover:shadow-md text-sm"
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header con botón de regreso */}
      <div className="shadow-xl px-4 py-6 flex-shrink-0" style={{ backgroundColor: '#2C3E50' }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center backdrop-blur-sm hover:bg-white/20 transition-all"
            >
              <i className="fas fa-arrow-left text-white"></i>
            </button>
            <div>
              <h1 className="text-xl font-bold text-white flex items-center gap-2">
                Mis Propuestas
                {userNotificationsCount > 0 && (
                  <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full font-bold animate-pulse">
                    {userNotificationsCount}
                  </span>
                )}
              </h1>
              <p className="text-white/70 text-sm">
                {userProposals.length} propuesta{userProposals.length !== 1 ? 's' : ''} realizadas
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-md mx-auto p-4 space-y-6">
        {/* Filtros mejorados con contadores */}
        <div className="bg-white rounded-2xl p-4 shadow-lg border border-gray-200">
          <div className="grid grid-cols-3 gap-3">
            {filterOptions.map(filter => (
              <button
                key={filter.id}
                onClick={() => setProposalFilter(filter.id)}
                className={`
                  relative px-3 py-3 rounded-xl text-center transition-all duration-200 transform hover:scale-105 flex flex-col items-center gap-2
                  ${proposalFilter === filter.id 
                    ? filter.activeColor + ' shadow-lg' 
                    : filter.color + ' hover:shadow-md'
                  }
                `}
              >
                {/* Ícono */}
                <span className="text-lg">{filter.icon}</span>
                
                {/* Contador */}
                <span className="text-sm font-bold">
                  {filter.count || 0}
                </span>
                
                {/* Label solo en desktop */}
                <span className="text-xs font-medium hidden sm:block">
                  {filter.label}
                </span>
              </button>
            ))}
          </div>
          
          {/* Botón limpiar todo para propuestas aprobadas/rechazadas */}
          {(proposalFilter === 'approved' || proposalFilter === 'rejected') && filteredProposals.length > 0 && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <button
                onClick={() => openDeleteConfirm('bulk', { status: proposalFilter })}
                className="w-full px-4 py-2 rounded-lg font-medium text-sm transition-all transform hover:scale-105 flex items-center justify-center gap-2 bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-300"
              >
                <i className="fas fa-broom text-sm"></i>
                <span>Limpiar todas las {proposalFilter === 'approved' ? 'aprobadas' : 'rechazadas'}</span>
              </button>
            </div>
          )}
        </div>

        {/* Lista de propuestas o estado vacío */}
        {filteredProposals.length === 0 ? (
          /* Estado vacío elegante */
          <>
            <div className="flex items-center justify-center py-16">
              <div className="text-center max-w-md">
                <div className="w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm bg-slate-100">
                  <span className="text-4xl">
                    {proposalFilter === 'pending' ? '⏳' :
                     proposalFilter === 'approved' ? '✅' :
                     '❌'}
                  </span>
                </div>
                <h4 className="text-2xl font-bold text-gray-800 mb-3">
                  {proposalFilter === 'pending' ? 'Sin propuestas pendientes' :
                   proposalFilter === 'approved' ? 'Sin propuestas aprobadas' :
                   'Sin propuestas rechazadas'
                  }
                </h4>
                <p className="text-gray-600 leading-relaxed">
                  {proposalFilter === 'pending' ? 
                    'Para crear una propuesta, edita una dirección existente en cualquier territorio. Los cambios se enviarán al administrador para su aprobación.' :
                   proposalFilter === 'approved' ? 'Ninguna de tus propuestas ha sido aprobada aún.' :
                   'Ninguna de tus propuestas ha sido rechazada.'
                  }
                </p>
                {proposalFilter === 'pending' && (
                  <div className="mt-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
                    <div className="flex items-start gap-2 mb-3">
                      <i className="fas fa-info-circle text-slate-600 mt-0.5 text-sm"></i>
                      <p className="text-sm text-slate-700">
                        <strong>Nota:</strong> Las propuestas se crean cuando modificas direcciones existentes, no cuando agregas nuevas direcciones.
                      </p>
                    </div>
                    <button
                      onClick={() => setShowInstructions(true)}
                      className="w-full mt-3 px-4 py-3 bg-slate-700 hover:bg-slate-800 text-white rounded-lg font-medium transition-all transform hover:scale-105 shadow-sm hover:shadow-md text-sm"
                    >
                      <i className="fas fa-info-circle mr-2"></i>
                      ¿Cómo crear una propuesta?
                    </button>
                  </div>
                )}
              </div>
            </div>
          </>
        ) : (
          /* Lista de propuestas con nuevo diseño */
          <>
            <div className="space-y-4">
              {filteredProposals.map(proposal => {
                const territory = territories.find(t => t.id === proposal.territoryId);
                const currentAddress = proposal.type === 'edit'
                  ? addresses.find(a => a.id === proposal.addressId)
                  : null;

                const typeConfig = {
                  new: { icon: 'fa-house', color: 'from-emerald-500 to-green-600' },
                  delete: { icon: 'fa-trash', color: 'from-red-500 to-rose-600' },
                  edit: { icon: 'fa-edit', color: 'from-blue-500 to-indigo-600' }
                };
                const typeStyle = typeConfig[proposal.type] || typeConfig.edit;

                const statusBadge = {
                  pending: { bg: 'bg-amber-100', text: 'text-amber-700', label: 'Pendiente' },
                  approved: { bg: 'bg-emerald-100', text: 'text-emerald-700', label: 'Aprobada' },
                  rejected: { bg: 'bg-red-100', text: 'text-red-700', label: 'Rechazada' }
                };
                const badge = statusBadge[proposal.status] || statusBadge.pending;

                return (
                  <div
                    key={proposal.id}
                    className="bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow overflow-hidden"
                  >
                    {/* Header */}
                    <div className="px-5 pt-5 pb-4 border-b border-gray-100">
                      <div className="flex items-start gap-3">
                        <div className={`w-11 h-11 bg-gradient-to-br ${typeStyle.color} rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm`}>
                          <i className={`fas ${typeStyle.icon} text-white text-sm`}></i>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 min-w-0">
                            <ActionTypeBadge actionType={getActionType(proposal)} size="sm" />
                          </div>
                          <div className="flex items-center gap-2 text-xs text-gray-500 mt-1.5 flex-wrap">
                            {proposal.territoryId ? (
                              <span className="inline-flex items-center gap-1 font-medium text-gray-600">
                                <i className="fas fa-map-marker-alt text-[10px] text-gray-400"></i>
                                T-{territory?.name?.replace(/territorio\s*/i, '') || proposal.territoryId}
                              </span>
                            ) : proposal.status === 'approved' && proposal.assignedTerritoryId ? (
                              <span className="inline-flex items-center gap-1 font-medium text-emerald-600">
                                <i className="fas fa-map-marker-alt text-[10px]"></i>
                                Asignada a {territories.find(t => t.id === proposal.assignedTerritoryId)?.name || proposal.assignedTerritoryId}
                              </span>
                            ) : (
                              <span className="inline-flex items-center text-[10px] font-bold uppercase tracking-wider text-orange-700 bg-orange-50 border border-orange-200 px-2 py-0.5 rounded">
                                Nueva dirección
                              </span>
                            )}
                            <span className="text-gray-300">·</span>
                            <span className="inline-flex items-center gap-1 text-gray-500">
                              <i className="far fa-clock text-[10px]"></i>
                              {formatRelativeTime(proposal.createdAt) || 'Sin fecha'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Cuerpo */}
                    <div className="px-5 py-4 space-y-4">
                      {/* Propuestas nuevas */}
                      {proposal.type === 'new' && proposal.addressData && (
                        <>
                          {/* Dirección — Hero */}
                          <div>
                            <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-500 mb-1.5">Dirección propuesta</p>
                            <p className="text-base font-semibold text-gray-900 break-words leading-snug">
                              {proposal.addressData.address || proposal.address || 'No especificada'}
                            </p>
                            {proposal.addressData.entreCalles && (
                              <p className="text-xs text-gray-600 mt-2">
                                <span className="text-gray-400">Entre calles:</span>{' '}
                                <span className="text-gray-700">{proposal.addressData.entreCalles}</span>
                              </p>
                            )}
                          </div>

                          {/* Atributos cortos en grid */}
                          {(proposal.addressData.gender ||
                            (proposal.addressData.isRevisita && proposal.addressData.revisitaBy) ||
                            (proposal.addressData.isEstudio && proposal.addressData.estudioBy)) && (
                            <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                              {proposal.addressData.gender && (
                                <div>
                                  <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">Género</p>
                                  <p className="text-sm text-gray-900 mt-0.5">{proposal.addressData.gender}</p>
                                </div>
                              )}
                              {proposal.addressData.isRevisita && proposal.addressData.revisitaBy && (
                                <div>
                                  <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">Revisita</p>
                                  <p className="text-sm text-gray-900 mt-0.5">{proposal.addressData.revisitaBy}</p>
                                </div>
                              )}
                              {proposal.addressData.isEstudio && proposal.addressData.estudioBy && (
                                <div>
                                  <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">Estudio</p>
                                  <p className="text-sm text-gray-900 mt-0.5">{proposal.addressData.estudioBy}</p>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Notas */}
                          {proposal.addressData.notes && (
                            <div className="border-l-2 border-gray-300 pl-3">
                              <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-500 mb-1">Notas</p>
                              <p className="text-sm text-gray-700 italic leading-relaxed">{proposal.addressData.notes}</p>
                            </div>
                          )}

                          {/* Ubicación */}
                          {(proposal.addressData.mapUrl || proposal.addressData.latitude) && (
                            <div>
                              <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-500 mb-1.5">Ubicación</p>
                              {proposal.addressData.mapUrl && (
                                <a
                                  href={proposal.addressData.mapUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-800 underline break-all"
                                >
                                  <i className="fas fa-external-link-alt text-[10px]"></i>
                                  Abrir en Google Maps
                                </a>
                              )}
                              {proposal.addressData.latitude && proposal.addressData.longitude && (
                                <p className="text-xs text-gray-500 mt-1 font-mono">
                                  {proposal.addressData.latitude}, {proposal.addressData.longitude}
                                </p>
                              )}
                            </div>
                          )}
                        </>
                      )}

                      {/* Para ediciones */}
                      {proposal.type === 'edit' && proposal.changes && (() => {
                        const displayChanges = getDisplayChanges(proposal.changes, currentAddress);
                        const changesEntries = Object.entries(displayChanges);

                        if (changesEntries.length === 0) {
                          return <p className="text-sm italic text-gray-400">No se detectaron cambios significativos en esta propuesta.</p>;
                        }

                        return (
                          <div>
                            <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-500 mb-2">Cambios propuestos</p>
                            <div className="space-y-2.5">
                              {changesEntries.map(([campo, valorNuevo]) => {
                                const etiqueta = fieldLabels[campo] || campo;
                                return (
                                  <div key={campo}>
                                    <p className="text-xs text-gray-500 mb-0.5">{etiqueta}</p>
                                    <p className="text-sm text-gray-900 font-medium break-words">{formatValue(valorNuevo)}</p>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })()}

                      {/* Para eliminaciones */}
                      {proposal.type === 'delete' && proposal.addressInfo && (
                        <div>
                          <p className="text-[11px] font-semibold uppercase tracking-wider text-red-600 mb-2 flex items-center gap-1.5">
                            <i className="fas fa-exclamation-triangle text-xs"></i>
                            Solicitud de eliminación
                          </p>
                          <div className="space-y-1.5 text-sm">
                            {proposal.addressInfo.address && (
                              <p><span className="text-gray-400">Dirección:</span> <span className="text-gray-900 font-medium">{proposal.addressInfo.address}</span></p>
                            )}
                            {proposal.addressInfo.name && (
                              <p><span className="text-gray-400">Nombre:</span> <span className="text-gray-900">{proposal.addressInfo.name}</span></p>
                            )}
                            {proposal.addressInfo.phone && (
                              <p><span className="text-gray-400">Teléfono:</span> <span className="text-gray-900">{proposal.addressInfo.phone}</span></p>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Motivo — solo si hay uno real (no para propuestas rápidas) */}
                      {proposal.reason && !proposal.isQuickProposal && proposal.reason !== 'Propuesta rápida desde botón flotante' && (
                        <div className="border-l-2 border-amber-400 pl-3">
                          <p className="text-[11px] font-semibold uppercase tracking-wider text-amber-600 mb-1">
                            {proposal.type === 'delete' ? 'Razón de eliminación' : 'Motivo'}
                          </p>
                          <p className="text-sm text-gray-700 italic leading-relaxed">{proposal.reason}</p>
                        </div>
                      )}
                    </div>

                    {/* Info de procesamiento */}
                    {proposal.status !== 'pending' && (
                      <div className="px-5 py-3 border-t border-gray-100 bg-gray-50/40">
                        <div className={`flex items-center gap-2 mb-2 ${proposal.status === 'approved' ? 'text-emerald-700' : 'text-red-700'}`}>
                          <i className={`fas ${proposal.status === 'approved' ? 'fa-check-circle' : 'fa-times-circle'} text-sm`}></i>
                          <span className="font-semibold text-sm">{proposal.status === 'approved' ? 'Aprobada' : 'Rechazada'}</span>
                        </div>
                        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                          <div>
                            <p className="text-gray-400">Por</p>
                            <p className="text-gray-800 font-medium">{proposal.approvedBy || proposal.rejectedBy || 'Administrador'}</p>
                          </div>
                          <div>
                            <p className="text-gray-400">Fecha</p>
                            <p className="text-gray-800 font-medium">{formatDate(proposal.approvedAt || proposal.rejectedAt)}</p>
                          </div>
                        </div>
                        {proposal.status === 'rejected' && proposal.rejectionReason && (
                          <div className="mt-3 border-l-2 border-red-300 pl-3">
                            <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-500 mb-0.5">Razón del rechazo</p>
                            <p className="text-sm text-red-600 italic leading-relaxed">{proposal.rejectionReason}</p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Footer — botón eliminar para propuestas ya procesadas */}
                    {proposal.status !== 'pending' && (
                      <div className="px-5 pt-3 pb-5 border-t border-gray-100">
                        <div className="flex justify-end">
                          <button
                            onClick={() => openDeleteConfirm('single', { id: proposal.id })}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                            title="Eliminar propuesta"
                          >
                            <i className="fas fa-trash text-[10px]"></i>
                            <span>Eliminar</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Componente de notificación bonita */}
      <InstructionsNotification />

      {/* Modal de confirmación para eliminar */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-gray-200 overflow-hidden">
            {/* Header */}
            <div className="bg-slate-700 px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                  <i className="fas fa-trash text-white text-lg"></i>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">
                    {showDeleteConfirm.type === 'single' ? 'Eliminar Propuesta' : 'Limpiar Propuestas'}
                  </h3>
                  <p className="text-red-100 text-sm">Esta acción no se puede deshacer</p>
                </div>
              </div>
            </div>

            {/* Contenido */}
            <div className="p-6">
              <p className="text-gray-700 mb-6">
                {showDeleteConfirm.type === 'single' 
                  ? '¿Estás seguro de que deseas eliminar esta propuesta permanentemente?'
                  : `¿Estás seguro de que deseas eliminar TODAS las propuestas ${showDeleteConfirm.status === 'approved' ? 'aprobadas' : 'rechazadas'}?`
                }
              </p>

              {showDeleteConfirm.type === 'bulk' && (
                <div className="bg-slate-100 border border-slate-300 rounded-lg p-3 mb-6">
                  <p className="text-slate-800 text-sm font-medium">
                    Se eliminarán {filteredProposals.length} propuesta{filteredProposals.length > 1 ? 's' : ''} permanentemente
                  </p>
                </div>
              )}

              {/* Botones */}
              <div className="flex gap-3">
                <button
                  onClick={() => setShowDeleteConfirm(null)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-all font-medium"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => {
                    if (showDeleteConfirm.type === 'single') {
                      handleDeleteSingle(showDeleteConfirm.id);
                    } else {
                      handleDeleteBulk(showDeleteConfirm.status);
                    }
                  }}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-all font-medium"
                >
                  {showDeleteConfirm.type === 'single' ? 'Sí, eliminar' : 'Sí, limpiar todas'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Estilos de animaciones discretas */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        
        @keyframes slideInUp {
          from { 
            opacity: 0;
            transform: translateY(20px) scale(0.98);
          }
          to { 
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        
        @keyframes slideInLeft {
          from { 
            opacity: 0;
            transform: translateX(-15px);
          }
          to { 
            opacity: 1;
            transform: translateX(0);
          }
        }
        
        .animate-fadeIn {
          animation: fadeIn 0.25s ease-out;
        }
        
        .animate-slideInUp {
          animation: slideInUp 0.35s ease-out;
        }
        
        .animate-slideInLeft {
          animation: slideInLeft 0.4s ease-out forwards;
          opacity: 0;
        }
      `}</style>
    </div>
  );
};

export default MyProposalsView;