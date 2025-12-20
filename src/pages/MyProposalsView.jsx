import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import ActionTypeBadge, { getActionType } from '../components/common/ActionTypeBadge';

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
  estudioBy: '📚 Estudio por'
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
      // ✅ MEJORA: Ejecutar inmediatamente al montar el componente
      console.log('📱 Marcando propuestas como leídas al entrar a MyProposalsView');
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

                return (
                  <div 
                    key={proposal.id} 
                    className="bg-white rounded-2xl shadow-sm p-4 sm:p-6 border border-gray-200 hover:shadow-md transition-all duration-300"
                  >
                    {/* Header de la propuesta - Optimizado para móvil */}
                    <div className="flex items-start justify-between mb-4 sm:mb-6">
                      <div className="flex items-start gap-3 sm:gap-4 flex-1">
                        <div className="w-10 h-10 sm:w-12 sm:h-12 bg-slate-600 rounded-xl flex items-center justify-center shadow-sm flex-shrink-0">
                          <i className={`fas ${proposal.type === 'new' ? 'fa-plus' : proposal.type === 'delete' ? 'fa-trash' : 'fa-edit'} text-white text-sm sm:text-base`}></i>
                        </div>

                        <div className="w-full">
                          {/* Header con formato aprobado */}
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2 flex-1 mr-3">
                              <ActionTypeBadge actionType={getActionType(proposal)} size="md" />
                            </div>
                            <p className="text-xs text-gray-500 flex items-center flex-shrink-0">
                              <i className="fas fa-calendar mr-1"></i>
                              <span className="hidden sm:inline">
                                {formatDate(proposal.createdAt)}
                              </span>
                              <span className="sm:hidden">
                                {formatDateMobile(proposal.createdAt)}
                              </span>
                            </p>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700">
                              🏷️ Territorio {territory?.name?.replace(/territorio\s*/i, '') || proposal.territoryId}
                            </span>
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ml-2 bg-slate-100 text-slate-700">
                              {proposal.status === 'pending' ? '⏳ Pendiente' :
                               proposal.status === 'approved' ? '✅ Aprobada' :
                               '❌ Rechazada'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Contenido con barras verdes individuales */}
                    <div className="space-y-3">
                      {/* Dirección - Siempre primero (excepto para delete que tiene su propia sección) */}
                      {proposal.type !== 'delete' && (
                        <div className="bg-gray-50 rounded-lg p-3 border-l-4 border-slate-300">
                          <p className="text-sm font-semibold text-gray-700 mb-2">
                            📍 Dirección:
                          </p>
                          <p className="text-sm text-gray-800 break-words">
                            {proposal.type === 'new'
                              ? (proposal.addressData?.address || proposal.address)
                              : (proposal.currentData?.address || proposal.changes?.address || 'Dirección no disponible')
                            }
                          </p>
                        </div>
                      )}

                      {/* Para propuestas nuevas */}
                      {proposal.type === 'new' && proposal.addressData && (
                        <>
                          {/* Revisita - Formato como notas */}
                          {proposal.addressData.isRevisita && proposal.addressData.revisitaBy && (
                            <div className="bg-gray-50 p-3 rounded-lg border-l-4 border-slate-300">
                              <p className="text-sm font-semibold text-slate-700 mb-1">📖 Revisita:</p>
                              <p className="text-sm text-gray-800 break-words">
                                {proposal.addressData.revisitaBy}
                              </p>
                            </div>
                          )}
                          
                          {/* Estudio - Formato como notas */}
                          {proposal.addressData.isEstudio && proposal.addressData.estudioBy && (
                            <div className="bg-gray-50 p-3 rounded-lg border-l-4 border-slate-300">
                              <p className="text-sm font-semibold text-slate-700 mb-1">📚 Estudio:</p>
                              <p className="text-sm text-gray-800 break-words">
                                {proposal.addressData.estudioBy}
                              </p>
                            </div>
                          )}
                          
                          {/* Género - Formato como notas */}
                          {proposal.addressData.gender && (
                            <div className="bg-gray-50 p-3 rounded-lg border-l-4 border-slate-300">
                              <p className="text-sm font-semibold text-slate-700 mb-1">👥 Género:</p>
                              <p className="text-sm text-gray-800 break-words">
                                {proposal.addressData.gender}
                              </p>
                            </div>
                          )}
                          
                          {/* Notas */}
                          {proposal.addressData.notes && (
                            <div className="bg-gray-50 p-3 rounded-lg border-l-4 border-slate-300">
                              <p className="text-sm font-semibold text-slate-700 mb-1">📝 Notas:</p>
                              <p className="text-sm text-gray-800 italic break-words">
                                "{proposal.addressData.notes}"
                              </p>
                            </div>
                          )}
                        </>
                      )}

                      {/* Para ediciones - Filtrar y mostrar solo campos que realmente cambiaron */}
                      {proposal.type === 'edit' && proposal.changes && (() => {
                        // Usar getDisplayChanges para filtrar propuestas legacy
                        const displayChanges = getDisplayChanges(proposal.changes, currentAddress);
                        const changesEntries = Object.entries(displayChanges);

                        // Si no hay cambios reales después del filtrado
                        if (changesEntries.length === 0) {
                          return (
                            <>
                              <div className="bg-gray-50 rounded-lg p-4 border-l-4 border-gray-300">
                                <p className="text-sm text-gray-600 italic">
                                  No se detectaron cambios significativos en esta propuesta.
                                </p>
                              </div>
                              {/* Razón del cambio - Siempre mostrar si existe */}
                              {proposal.reason && (
                                <div className="bg-gray-50 p-3 rounded-lg border-l-4 border-slate-300">
                                  <p className="text-sm font-semibold text-slate-700 mb-1">💬 Razón del cambio:</p>
                                  <p className="text-sm text-gray-800 italic break-words">
                                    "{proposal.reason}"
                                  </p>
                                </div>
                              )}
                            </>
                          );
                        }

                        return (
                          <>
                            {changesEntries.map(([campo, valorNuevo]) => {
                              const etiqueta = fieldLabels[campo] || campo;
                              return (
                                <div key={campo} className="bg-gray-50 p-3 rounded-lg border-l-4 border-slate-300">
                                  <p className="text-sm font-semibold text-slate-700 mb-1">{etiqueta}:</p>
                                  <p className="text-sm text-gray-800 break-words">
                                    {formatValue(valorNuevo)}
                                  </p>
                                </div>
                              );
                            })}
                          </>
                        );
                      })()}

                      {/* Para propuestas de eliminación */}
                      {proposal.type === 'delete' && proposal.addressInfo && (
                        <div className="bg-gray-50 rounded-lg p-4 border-l-4 border-slate-400">
                          <p className="text-sm font-bold text-slate-800 mb-3 flex items-center">
                            <i className="fas fa-exclamation-triangle mr-2"></i>
                            SOLICITUD DE ELIMINACIÓN
                          </p>
                          <div className="space-y-2 text-sm">
                            {proposal.addressInfo.address && (
                              <p className="text-gray-800">
                                <span className="font-medium text-gray-600">Dirección:</span> {proposal.addressInfo.address}
                              </p>
                            )}
                            {proposal.addressInfo.name && (
                              <p className="text-gray-800">
                                <span className="font-medium text-gray-600">Nombre:</span> {proposal.addressInfo.name}
                              </p>
                            )}
                            {proposal.addressInfo.phone && (
                              <p className="text-gray-800">
                                <span className="font-medium text-gray-600">Teléfono:</span> {proposal.addressInfo.phone}
                              </p>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Razón del cambio */}
                      {proposal.reason && (
                        <div className="bg-gray-50 p-3 rounded-lg border-l-4 border-slate-300">
                          <p className="text-sm font-semibold text-slate-700 mb-1">
                            💬 {proposal.type === 'delete' ? 'Razón de eliminación:' : 'Razón del cambio:'}
                          </p>
                          <p className="text-sm text-gray-800 italic break-words">
                            "{proposal.reason}"
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Información de procesamiento para propuestas aprobadas/rechazadas */}
                    {proposal.status !== 'pending' && (
                      <div className="rounded-xl p-4 border mt-4 bg-gray-50 border-gray-200">
                        <div className="flex items-start justify-between">
                          <h6 className="font-semibold mb-2 flex items-center text-slate-800">
                            <i className={`${
                              proposal.status === 'approved' ? 'fas fa-check-circle' : 'fas fa-times-circle'
                            } mr-2`}></i>
                            {proposal.status === 'approved' ? 'Propuesta Aprobada' : 'Propuesta Rechazada'}
                          </h6>
                          
                          {/* Botón eliminar individual */}
                          <button
                            onClick={() => openDeleteConfirm('single', { id: proposal.id })}
                            className="p-2 rounded-lg text-gray-500 hover:text-red-600 hover:bg-red-50 transition-all"
                            title="Eliminar propuesta"
                          >
                            <i className="fas fa-trash text-sm"></i>
                          </button>
                        </div>
                        
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