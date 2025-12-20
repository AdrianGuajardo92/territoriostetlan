import React, { useState, useEffect } from 'react';
import Modal from '../common/Modal';
import Icon from '../common/Icon';
import ActionTypeBadge, { getActionType } from '../common/ActionTypeBadge';
import { useApp } from '../../context/AppContext';
import { useToast } from '../../hooks/useToast';
import { LazyStatsModal } from './LazyModals'; // CORRECCIÓN: Usar lazy loading para stats
import { LazyUserManagementModal as UserManagementModal } from './LazyModals';
import UserListModal from './UserListModal';
import ExportAddressesModal from './ExportAddressesModal';
import CampaignModal from './CampaignModal';
import TerritoryManagementModal from './TerritoryManagementModal';
import ArchivedAddressesPortal from '../admin/ArchivedAddressesPortal';

const AdminModal = (props = {}) => {
  const { isOpen = false, onClose = () => {} } = props;
  const {
    currentUser,
    territories,
    addresses,
    proposals,
    users,
    handleApproveProposal,
    handleRejectProposal,
    handleDeleteProposal,
    handleDeleteProposalsByStatus
  } = useApp();
  
  const pendingProposalsCount = proposals.filter(p => p.status === 'pending').length;
  
  const { showToast } = useToast();
  const [view, setView] = useState('actions');
  const [showArchivedAddresses, setShowArchivedAddresses] = useState(false);
  const [selectedProposal, setSelectedProposal] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [showStatsModal, setShowStatsModal] = useState(false); // Estado para las estadísticas completas
  const [showUserManagement, setShowUserManagement] = useState(false); // Estado para el modal de gestión de usuarios
  const [proposalFilter, setProposalFilter] = useState('pending'); // Filtro para propuestas: all, pending, approved, rejected
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null); // Estado para confirmación de eliminación
  
  // Estados para acordeón de usuarios (ahora usaremos modales)
  const [expandedAdmins, setExpandedAdmins] = useState(false);
  const [expandedPublishers, setExpandedPublishers] = useState(false);
  
  // Estados para los nuevos modales de lista de usuarios
  const [showAdminListModal, setShowAdminListModal] = useState(false);
  const [showPublisherListModal, setShowPublisherListModal] = useState(false);
  const [showAllUsersModal, setShowAllUsersModal] = useState(false);
  
  // Estado para el modal de exportación de direcciones
  const [showExportAddressesModal, setShowExportAddressesModal] = useState(false);
  
  // Estado para el modal de campañas
  const [showCampaignModal, setShowCampaignModal] = useState(false);
  
  // Estado para el modal de gestión de territorios
  const [showTerritoryManagementModal, setShowTerritoryManagementModal] = useState(false);

  // Función helper para formatear valores en propuestas
  const formatValue = (value) => {
    if (value === undefined || value === null || value === '') return 'Sin valor';
    if (typeof value === 'boolean') return value ? 'Sí' : 'No';
    return String(value);
  };

  // Etiquetas para los campos de propuestas (solo campos relevantes para el admin)
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
  // Compara proposal.changes con currentAddress y devuelve solo los campos que realmente cambiaron
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

  useEffect(() => {
    if (isOpen) {
      setView(currentUser?.role === 'admin' ? 'actions' : 'no_access');
      // Resetear el estado de ArchivedAddresses cuando se abre AdminModal
      setShowArchivedAddresses(false);
    }
    // else {
    //   // Resetear todos los modales cuando se cierre AdminModal
    //   setShowTerritoryManagementModal(false);
    //   setShowCampaignModal(false);
    //   setShowUserManagement(false);
    //   setShowStatsModal(false);
    //   setShowExportAddressesModal(false);
    // }
  }, [isOpen, currentUser]);

  // Funciones de backup
  const handleBackupAddressesAndTerritories = async () => {
    try {
      const backupData = {
        version: '1.0',
        timestamp: new Date().toISOString(),
        type: 'addresses_territories',
        data: {
          territories: territories,
          addresses: addresses
        }
      };
      
      const dataStr = JSON.stringify(backupData, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `backup_direcciones_territorios_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      showToast('Backup de direcciones y territorios descargado', 'success');
    } catch (error) {
      console.error('Error creando backup:', error);
      showToast('Error al crear backup', 'error');
    }
  };

  // Función para mostrar el modal de selección de formato de exportación
  const handleBackupAddressesOnly = () => {
    setShowExportAddressesModal(true);
  };

  // Función para exportar direcciones completas
  const handleExportAddressesComplete = async () => {
    try {
      // Ordenar direcciones por número de territorio (ascendente)
      const sortedAddresses = [...addresses].sort((a, b) => {
        // Extraer el número del territorio
        const getTerritoryNumber = (territoryId) => {
          const match = territoryId?.match(/\d+/);
          return match ? parseInt(match[0]) : 0;
        };
        
        const numA = getTerritoryNumber(a.territoryId);
        const numB = getTerritoryNumber(b.territoryId);
        
        return numA - numB;
      });

      const backupData = {
        version: '1.0',
        timestamp: new Date().toISOString(),
        type: 'addresses_only',
        totalAddresses: sortedAddresses.length,
        data: {
          addresses: sortedAddresses
        }
      };
      
      const dataStr = JSON.stringify(backupData, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `backup_solo_direcciones_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      showToast(`Backup completo de ${sortedAddresses.length} direcciones descargado (ordenado por territorio)`, 'success');
    } catch (error) {
      console.error('Error creando backup completo de direcciones:', error);
      showToast('Error al crear backup completo de direcciones', 'error');
    }
  };

  // Función para exportar direcciones simplificadas (solo territorio y dirección)
  const handleExportAddressesSimplified = async () => {
    try {
      // Ordenar direcciones por número de territorio (ascendente)
      const sortedAddresses = [...addresses].sort((a, b) => {
        // Extraer el número del territorio
        const getTerritoryNumber = (territoryId) => {
          const match = territoryId?.match(/\d+/);
          return match ? parseInt(match[0]) : 0;
        };
        
        const numA = getTerritoryNumber(a.territoryId);
        const numB = getTerritoryNumber(b.territoryId);
        
        return numA - numB;
      });

      // Crear versión simplificada con solo territorio y dirección
      const simplifiedAddresses = sortedAddresses.map(addr => ({
        territorio: addr.territoryId?.replace(/territorio/i, 'Territorio ') || 'Sin territorio',
        direccion: addr.address || 'Sin dirección'
      }));

      const backupData = {
        version: '1.0',
        timestamp: new Date().toISOString(),
        type: 'addresses_simplified',
        totalAddresses: simplifiedAddresses.length,
        data: {
          addresses: simplifiedAddresses
        }
      };
      
      const dataStr = JSON.stringify(backupData, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `direcciones_campanas_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      showToast(`Lista simplificada de ${simplifiedAddresses.length} direcciones descargada (para campañas)`, 'success');
    } catch (error) {
      console.error('Error creando lista simplificada de direcciones:', error);
      showToast('Error al crear lista simplificada de direcciones', 'error');
    }
  };

  const handleBackupGeneral = async () => {
    try {
      const backupData = {
        version: '1.0',
        timestamp: new Date().toISOString(),
        type: 'complete',
        data: {
          territories: territories,
          addresses: addresses,
          users: users,
          proposals: proposals
        }
      };
      
      const dataStr = JSON.stringify(backupData, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `backup_completo_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      showToast('Backup completo descargado', 'success');
    } catch (error) {
      console.error('Error creando backup completo:', error);
      showToast('Error al crear backup completo', 'error');
    }
  };

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
      id: 'campaigns',
      title: 'Gestión de Campañas',
      description: 'Campañas especiales',
      icon: 'fas fa-flag',
      color: 'purple',
      action: () => setShowCampaignModal(true)
    },
    {
      id: 'territories',
      title: 'Gestión de Territorios',
      description: 'Liberar y administrar territorios',
      icon: 'fas fa-map-marked-alt',
      color: 'indigo',
      action: () => setShowTerritoryManagementModal(true)
    },
    {
      id: 'backup',
      title: 'Respaldo de Datos',
      description: 'Crear backups del sistema',
      icon: 'fas fa-download',
      color: 'green',
      action: () => setView('backup')
    },
    {
      id: 'archived',
      title: 'Direcciones Archivadas',
      description: 'Ver historial de direcciones eliminadas',
      icon: 'fas fa-archive',
      color: 'gray',
      action: () => {
        setShowArchivedAddresses(!showArchivedAddresses);
      }
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
      await handleDeleteProposalsByStatus(status); // Sin userId para admins = elimina todas
      setShowDeleteConfirm(null);
    } catch (error) {
      console.error('Error deleting proposals:', error);
    }
  };

  const openDeleteConfirm = (type, data) => {
    setShowDeleteConfirm({ type, ...data });
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
          gray: {
            bg: 'from-gray-50 to-gray-100',
            iconBg: 'bg-gray-500',
            text: 'text-gray-600',
            accent: 'border-gray-200',
            hover: 'hover:shadow-gray-100/50'
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
        
        // Configuración de filtros con colores tenues
        const filterOptions = [
          {
            id: 'pending',
            label: 'Pendientes',
            count: pendingCount,
            icon: 'fas fa-clock',
            activeClass: 'bg-amber-100 text-amber-800 border-amber-200',
            iconColor: 'text-amber-600'
          },
          {
            id: 'approved',
            label: 'Aprobadas',
            count: approvedCount,
            icon: 'fas fa-check',
            activeClass: 'bg-emerald-100 text-emerald-800 border-emerald-200',
            iconColor: 'text-emerald-600'
          },
          {
            id: 'rejected',
            label: 'Rechazadas',
            count: rejectedCount,
            icon: 'fas fa-times',
            activeClass: 'bg-red-100 text-red-800 border-red-200',
            iconColor: 'text-red-600'
          }
        ];

        const activeFilter = filterOptions.find(f => f.id === proposalFilter);
        
        return (
          <div
            className="space-y-5 rounded-[20px] p-6"
            style={{
              background: 'linear-gradient(165deg, #0D1B2A 0%, #1B263B 50%, #0D1B2A 100%)',
              boxShadow: '0 25px 60px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.08)'
            }}
          >
            {/* Header Silver Navy */}
            <div className="flex items-center gap-3">
              <div
                className="w-2 h-2 rounded-full"
                style={{
                  background: '#A8B2C1',
                  boxShadow: '0 0 12px rgba(168,178,193,0.4)'
                }}
              />
              <div>
                <h3 className="text-xl font-semibold" style={{ color: '#FFFFFF' }}>
                  Historial de Propuestas
                </h3>
                <p className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>
                  {filteredProposals.length} {proposalFilter === 'pending' ? 'pendientes' : proposalFilter === 'approved' ? 'aprobadas' : 'rechazadas'}
                </p>
              </div>
            </div>

            {/* Filtros Silver Navy */}
            <div
              className="rounded-xl p-1.5"
              style={{ background: 'rgba(255,255,255,0.03)' }}
            >
              <div className="grid grid-cols-3 gap-2">
                {filterOptions.map(filter => {
                  const isActive = proposalFilter === filter.id;
                  const colorStyles = {
                    pending: { bg: 'rgba(251,191,36,0.1)', border: 'rgba(251,191,36,0.3)', text: '#FBBF24' },
                    approved: { bg: 'rgba(52,211,153,0.1)', border: 'rgba(52,211,153,0.3)', text: '#34D399' },
                    rejected: { bg: 'rgba(248,113,113,0.1)', border: 'rgba(248,113,113,0.3)', text: '#F87171' }
                  };
                  const colors = colorStyles[filter.id];

                  return (
                    <button
                      key={filter.id}
                      onClick={() => setProposalFilter(filter.id)}
                      className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-all min-h-[44px]"
                      style={{
                        background: isActive ? colors.bg : 'transparent',
                        border: isActive ? `1px solid ${colors.border}` : '1px solid transparent',
                        color: isActive ? colors.text : 'rgba(255,255,255,0.5)'
                      }}
                      title={filter.label}
                    >
                      <i className={`${filter.icon} text-xs`}></i>
                      <span className="font-semibold">{filter.count || 0}</span>
                    </button>
                  );
                })}
              </div>

              {/* Botón limpiar todo para propuestas aprobadas/rechazadas */}
              {(proposalFilter === 'approved' || proposalFilter === 'rejected') && filteredProposals.length > 0 && (
                <div className="mt-3 pt-3" style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                  <button
                    onClick={() => openDeleteConfirm('bulk', { status: proposalFilter })}
                    className="w-full px-3 py-2 rounded-lg font-medium text-xs transition-all flex items-center justify-center gap-2"
                    style={{
                      background: 'rgba(255,255,255,0.05)',
                      color: 'rgba(255,255,255,0.6)',
                      border: '1px solid rgba(255,255,255,0.1)'
                    }}
                  >
                    <i className="fas fa-broom text-xs"></i>
                    <span>Limpiar {proposalFilter === 'approved' ? 'aprobadas' : 'rechazadas'}</span>
                  </button>
                </div>
              )}
            </div>
            
            {filteredProposals.length === 0 ? (
              /* Estado vacío Silver Navy */
              <div className="flex items-center justify-center py-12">
                <div className="text-center max-w-sm">
                  <div
                    className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
                    style={{
                      background: 'linear-gradient(135deg, rgba(52,211,153,0.15), rgba(52,211,153,0.05))',
                      border: '1px solid rgba(52,211,153,0.3)'
                    }}
                  >
                    <i className="fas fa-check text-2xl" style={{ color: '#34D399' }}></i>
                  </div>
                  <h4 className="text-lg font-semibold mb-2" style={{ color: '#FFFFFF' }}>
                    {proposalFilter === 'pending' ? '¡Todo al día!' :
                     proposalFilter === 'approved' ? 'Sin aprobadas' :
                     'Sin rechazadas'
                    }
                  </h4>
                  <p className="text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>
                    {proposalFilter === 'pending' ? 'No hay propuestas pendientes de revisión.' :
                     proposalFilter === 'approved' ? 'No hay propuestas aprobadas.' :
                     'No hay propuestas rechazadas.'
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

                  // Colores del estado para la tarjeta
                  const statusStyles = {
                    pending: { bg: 'rgba(251,191,36,0.1)', border: 'rgba(251,191,36,0.3)', text: '#FBBF24' },
                    approved: { bg: 'rgba(52,211,153,0.1)', border: 'rgba(52,211,153,0.3)', text: '#34D399' },
                    rejected: { bg: 'rgba(248,113,113,0.1)', border: 'rgba(248,113,113,0.3)', text: '#F87171' }
                  };
                  const statusColor = statusStyles[proposal.status] || statusStyles.pending;

                  return (
                    <div
                      key={proposal.id}
                      className="rounded-2xl p-5 sm:p-6 transition-all duration-300"
                      style={{
                        background: 'rgba(255,255,255,0.03)',
                        border: '1px solid rgba(255,255,255,0.05)'
                      }}
                    >
                      {/* Header de la propuesta Silver Navy */}
                      <div className="flex items-start justify-between mb-5">
                        <div className="flex items-start gap-3 sm:gap-4 flex-1">
                          <div
                            className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center flex-shrink-0"
                            style={{ background: 'linear-gradient(135deg, #A8B2C1, #8892A0)' }}
                          >
                            <i className={`fas ${proposal.type === 'new' ? 'fa-plus' : proposal.type === 'delete' ? 'fa-trash' : 'fa-edit'} text-sm`} style={{ color: '#0D1B2A' }}></i>
                          </div>
                          <div className="w-full">
                            {/* Header con nombre y fecha */}
                            <div className="flex items-center justify-between mb-2">
                              <h4 className="text-base sm:text-lg font-semibold flex-1 mr-3 truncate" style={{ color: '#FFFFFF' }}>
                                {proposal.proposedByName}
                              </h4>
                              <p className="text-xs flex items-center flex-shrink-0" style={{ color: 'rgba(255,255,255,0.4)' }}>
                                <span className="hidden sm:inline">
                                  {proposal.createdAt?.toDate ? proposal.createdAt.toDate().toLocaleDateString('es-MX') : 'Fecha no disponible'}
                                </span>
                                <span className="sm:hidden">
                                  {proposal.createdAt?.toDate ? proposal.createdAt.toDate().toLocaleDateString('es-MX', { month: 'short', day: 'numeric' }) : 'Sin fecha'}
                                </span>
                              </p>
                            </div>
                            <div className="flex items-center justify-between gap-2">
                              <span
                                className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium"
                                style={{
                                  background: 'rgba(168,178,193,0.1)',
                                  border: '1px solid rgba(168,178,193,0.2)',
                                  color: '#A8B2C1'
                                }}
                              >
                                Territorio {territory?.name?.replace(/territorio\s*/i, '') || proposal.territoryId}
                              </span>
                              <span
                                className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold uppercase tracking-wide"
                                style={{
                                  background: statusColor.bg,
                                  border: `1px solid ${statusColor.border}`,
                                  color: statusColor.text,
                                  letterSpacing: '0.5px'
                                }}
                              >
                                {proposal.status === 'pending' ? 'Pendiente' :
                                 proposal.status === 'approved' ? 'Aprobada' :
                                 'Rechazada'}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Línea divisoria */}
                      <div
                        className="mb-5"
                        style={{
                          height: '1px',
                          background: 'linear-gradient(90deg, transparent, rgba(168,178,193,0.25), transparent)'
                        }}
                      />


                      {/* Contenido Silver Navy */}
                      <div className="space-y-4">
                        <div className="space-y-3">
                          {/* Para propuestas nuevas - mostrar datos principales */}
                          {proposal.type === 'new' && proposal.addressData && (
                            <>
                              {/* 1. DIRECCIÓN NUEVA */}
                              <div
                                className="rounded-xl p-4"
                                style={{
                                  background: 'rgba(255,255,255,0.02)',
                                  borderLeft: '2px solid #A8B2C1'
                                }}
                              >
                                <p className="text-xs font-medium uppercase tracking-wider mb-2" style={{ color: 'rgba(255,255,255,0.4)', letterSpacing: '1px' }}>
                                  📍 Nueva dirección
                                </p>
                                <p className="text-sm break-words" style={{ color: '#FFFFFF' }}>
                                  {proposal.addressData.address || 'No especificada'}
                                </p>
                              </div>

                              {/* 2. REVISITA */}
                              {proposal.addressData.isRevisita && proposal.addressData.revisitaBy && (
                                <div
                                  className="rounded-xl p-4"
                                  style={{
                                    background: 'rgba(255,255,255,0.02)',
                                    borderLeft: '2px solid #A8B2C1'
                                  }}
                                >
                                  <p className="text-xs font-medium uppercase tracking-wider mb-2" style={{ color: 'rgba(255,255,255,0.4)', letterSpacing: '1px' }}>
                                    📖 Revisita
                                  </p>
                                  <p className="text-sm break-words" style={{ color: 'rgba(255,255,255,0.8)' }}>
                                    {proposal.addressData.revisitaBy}
                                  </p>
                                </div>
                              )}

                              {/* 3. ESTUDIO */}
                              {proposal.addressData.isEstudio && proposal.addressData.estudioBy && (
                                <div
                                  className="rounded-xl p-4"
                                  style={{
                                    background: 'rgba(255,255,255,0.02)',
                                    borderLeft: '2px solid #A8B2C1'
                                  }}
                                >
                                  <p className="text-xs font-medium uppercase tracking-wider mb-2" style={{ color: 'rgba(255,255,255,0.4)', letterSpacing: '1px' }}>
                                    📚 Estudio
                                  </p>
                                  <p className="text-sm break-words" style={{ color: 'rgba(255,255,255,0.8)' }}>
                                    {proposal.addressData.estudioBy}
                                  </p>
                                </div>
                              )}

                              {/* 4. GÉNERO */}
                              {proposal.addressData.gender && (
                                <div
                                  className="rounded-xl p-4"
                                  style={{
                                    background: 'rgba(255,255,255,0.02)',
                                    borderLeft: '2px solid #A8B2C1'
                                  }}
                                >
                                  <p className="text-xs font-medium uppercase tracking-wider mb-2" style={{ color: 'rgba(255,255,255,0.4)', letterSpacing: '1px' }}>
                                    👥 Género
                                  </p>
                                  <p className="text-sm break-words" style={{ color: 'rgba(255,255,255,0.8)' }}>
                                    {proposal.addressData.gender}
                                  </p>
                                </div>
                              )}

                              {/* 5. NOTAS */}
                              {proposal.addressData.notes && (
                                <div
                                  className="rounded-xl p-4"
                                  style={{
                                    background: 'rgba(255,255,255,0.02)',
                                    borderLeft: '2px solid #A8B2C1'
                                  }}
                                >
                                  <p className="text-xs font-medium uppercase tracking-wider mb-2" style={{ color: 'rgba(255,255,255,0.4)', letterSpacing: '1px' }}>
                                    📝 Notas
                                  </p>
                                  <p className="text-sm italic break-words" style={{ color: 'rgba(255,255,255,0.7)' }}>
                                    "{proposal.addressData.notes}"
                                  </p>
                                </div>
                              )}

                              {/* Razón del cambio */}
                              {proposal.reason && (
                                <div
                                  className="rounded-xl p-4"
                                  style={{
                                    background: 'rgba(168,178,193,0.03)',
                                    borderLeft: '2px solid #A8B2C1'
                                  }}
                                >
                                  <p className="text-xs font-medium uppercase tracking-wider mb-2" style={{ color: 'rgba(255,255,255,0.4)', letterSpacing: '1px' }}>
                                    Motivo
                                  </p>
                                  <p className="text-sm italic break-words" style={{ color: 'rgba(255,255,255,0.7)' }}>
                                    "{proposal.reason}"
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
                                  <div
                                    className="rounded-xl p-4"
                                    style={{
                                      background: 'rgba(255,255,255,0.02)',
                                      borderLeft: '2px solid rgba(255,255,255,0.2)'
                                    }}
                                  >
                                    <p className="text-sm italic" style={{ color: 'rgba(255,255,255,0.5)' }}>
                                      No se detectaron cambios significativos en esta propuesta.
                                    </p>
                                  </div>
                                  {proposal.reason && (
                                    <div
                                      className="rounded-xl p-4"
                                      style={{
                                        background: 'rgba(168,178,193,0.03)',
                                        borderLeft: '2px solid #A8B2C1'
                                      }}
                                    >
                                      <p className="text-xs font-medium uppercase tracking-wider mb-2" style={{ color: 'rgba(255,255,255,0.4)', letterSpacing: '1px' }}>
                                        Motivo
                                      </p>
                                      <p className="text-sm italic break-words" style={{ color: 'rgba(255,255,255,0.7)' }}>
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
                                  const valorAnterior = currentAddress ? currentAddress[campo] : undefined;
                                  const etiqueta = fieldLabels[campo] || campo;

                                  return (
                                    <div
                                      key={campo}
                                      className="rounded-xl p-4"
                                      style={{
                                        background: 'rgba(255,255,255,0.02)',
                                        borderLeft: '2px solid #A8B2C1'
                                      }}
                                    >
                                      <p className="text-xs font-medium uppercase tracking-wider mb-3" style={{ color: 'rgba(255,255,255,0.4)', letterSpacing: '1px' }}>
                                        {etiqueta}
                                      </p>
                                      <div className="flex items-center gap-3">
                                        <div className="flex-1">
                                          <p className="text-xs mb-1" style={{ color: 'rgba(255,255,255,0.35)' }}>Antes</p>
                                          <p
                                            className="text-sm break-words"
                                            style={{
                                              color: 'rgba(255,255,255,0.5)',
                                              textDecoration: 'line-through',
                                              textDecorationColor: 'rgba(248,113,113,0.5)'
                                            }}
                                          >
                                            {formatValue(valorAnterior)}
                                          </p>
                                        </div>
                                        <div
                                          className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
                                          style={{ background: 'linear-gradient(135deg, #A8B2C1, #8892A0)' }}
                                        >
                                          <span style={{ color: '#0D1B2A', fontSize: '12px' }}>→</span>
                                        </div>
                                        <div className="flex-1">
                                          <p className="text-xs mb-1" style={{ color: 'rgba(255,255,255,0.35)' }}>Después</p>
                                          <p className="text-sm font-medium break-words" style={{ color: '#FFFFFF' }}>
                                            {formatValue(valorNuevo)}
                                          </p>
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })}

                                {/* Razón del cambio */}
                                {proposal.reason && (
                                  <div
                                    className="rounded-xl p-4"
                                    style={{
                                      background: 'rgba(168,178,193,0.03)',
                                      borderLeft: '2px solid #A8B2C1'
                                    }}
                                  >
                                    <p className="text-xs font-medium uppercase tracking-wider mb-2" style={{ color: 'rgba(255,255,255,0.4)', letterSpacing: '1px' }}>
                                      Motivo
                                    </p>
                                    <p className="text-sm italic break-words" style={{ color: 'rgba(255,255,255,0.7)' }}>
                                      "{proposal.reason}"
                                    </p>
                                  </div>
                                )}
                              </>
                            );
                          })()}

                          {/* Para propuestas de eliminación */}
                          {proposal.type === 'delete' && (
                            <>
                              <div
                                className="rounded-xl p-4"
                                style={{
                                  background: 'rgba(248,113,113,0.05)',
                                  borderLeft: '2px solid rgba(248,113,113,0.5)'
                                }}
                              >
                                <p className="text-xs font-semibold uppercase tracking-wider mb-3 flex items-center" style={{ color: '#F87171', letterSpacing: '1px' }}>
                                  <i className="fas fa-exclamation-triangle mr-2"></i>
                                  Solicitud de eliminación
                                </p>
                                {proposal.addressInfo && (
                                  <div className="space-y-2 text-sm">
                                    {proposal.addressInfo.address && (
                                      <p style={{ color: 'rgba(255,255,255,0.8)' }}>
                                        <span style={{ color: 'rgba(255,255,255,0.5)' }}>Dirección:</span> {proposal.addressInfo.address}
                                      </p>
                                    )}
                                    {proposal.addressInfo.name && (
                                      <p style={{ color: 'rgba(255,255,255,0.8)' }}>
                                        <span style={{ color: 'rgba(255,255,255,0.5)' }}>Nombre:</span> {proposal.addressInfo.name}
                                      </p>
                                    )}
                                    {proposal.addressInfo.phone && (
                                      <p style={{ color: 'rgba(255,255,255,0.8)' }}>
                                        <span style={{ color: 'rgba(255,255,255,0.5)' }}>Teléfono:</span> {proposal.addressInfo.phone}
                                      </p>
                                    )}
                                  </div>
                                )}
                              </div>

                              {proposal.reason && (
                                <div
                                  className="rounded-xl p-4"
                                  style={{
                                    background: 'rgba(168,178,193,0.03)',
                                    borderLeft: '2px solid #A8B2C1'
                                  }}
                                >
                                  <p className="text-xs font-medium uppercase tracking-wider mb-2" style={{ color: 'rgba(255,255,255,0.4)', letterSpacing: '1px' }}>
                                    Razón de eliminación
                                  </p>
                                  <p className="text-sm italic break-words" style={{ color: 'rgba(255,255,255,0.7)' }}>
                                    "{proposal.reason}"
                                  </p>
                                </div>
                              )}
                            </>
                          )}
                          </div>
                        </div>

                      {/* Información de procesamiento Silver Navy */}
                      {proposal.status !== 'pending' && (
                        <div
                          className="rounded-xl p-4 mt-4"
                          style={{
                            background: 'rgba(255,255,255,0.02)',
                            border: '1px solid rgba(255,255,255,0.05)'
                          }}
                        >
                          <h6 className="font-semibold mb-3 flex items-center text-sm" style={{ color: proposal.status === 'approved' ? '#34D399' : '#F87171' }}>
                            <i className={`${
                              proposal.status === 'approved' ? 'fas fa-check-circle' : 'fas fa-times-circle'
                            } mr-2`}></i>
                            {proposal.status === 'approved' ? 'Propuesta Aprobada' : 'Propuesta Rechazada'}
                          </h6>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                            <div>
                              <p style={{ color: 'rgba(255,255,255,0.4)' }}>
                                {proposal.status === 'approved' ? 'Aprobada por:' : 'Rechazada por:'}
                              </p>
                              <p style={{ color: '#FFFFFF' }}>
                                {proposal.approvedBy || proposal.rejectedBy || 'Administrador'}
                              </p>
                            </div>
                            <div>
                              <p style={{ color: 'rgba(255,255,255,0.4)' }}>Fecha:</p>
                              <p style={{ color: '#FFFFFF' }}>
                                {(proposal.approvedAt || proposal.rejectedAt)?.toDate
                                  ? (proposal.approvedAt || proposal.rejectedAt).toDate().toLocaleDateString('es-MX')
                                  : 'Fecha no disponible'
                                }
                              </p>
                            </div>
                          </div>
                          {proposal.status === 'rejected' && proposal.rejectionReason && (
                            <div className="mt-3 pt-3" style={{ borderTop: '1px solid rgba(248,113,113,0.2)' }}>
                              <p className="text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>
                                Razón del rechazo:
                              </p>
                              <p className="text-sm mt-1 italic" style={{ color: '#F87171' }}>
                                "{proposal.rejectionReason}"
                              </p>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Botones de acción Silver Navy */}
                      <div className="mt-5 pt-4" style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                        {proposal.status === 'pending' ? (
                          /* Botones para propuestas pendientes */
                          <div className="flex flex-col sm:flex-row justify-end gap-3">
                            <button
                              onClick={() => setSelectedProposal(proposal)}
                              className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl transition-all font-medium w-full sm:w-auto"
                              style={{
                                background: 'transparent',
                                border: '1px solid rgba(239,68,68,0.4)',
                                color: '#EF4444'
                              }}
                            >
                              <i className="fas fa-times"></i>
                              <span>Rechazar</span>
                            </button>
                            <button
                              onClick={() => handleApprove(proposal)}
                              className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl transition-all font-semibold w-full sm:w-auto"
                              style={{
                                background: 'linear-gradient(135deg, #A8B2C1 0%, #8892A0 100%)',
                                color: '#0D1B2A',
                                boxShadow: '0 8px 24px rgba(168,178,193,0.25)'
                              }}
                            >
                              <i className="fas fa-check"></i>
                              <span>Aprobar</span>
                            </button>
                          </div>
                        ) : (
                          /* Botón eliminar para propuestas aprobadas/rechazadas */
                          <div className="flex justify-end">
                            <button
                              onClick={() => openDeleteConfirm('single', { id: proposal.id })}
                              className="flex items-center gap-2 px-4 py-2 rounded-lg transition-all"
                              style={{
                                background: 'transparent',
                                border: '1px solid rgba(255,255,255,0.1)',
                                color: 'rgba(255,255,255,0.5)'
                              }}
                              title="Eliminar propuesta"
                            >
                              <i className="fas fa-trash text-sm"></i>
                              <span className="text-sm">Eliminar</span>
                            </button>
                          </div>
                        )}
                      </div>
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
            {/* Header de la sección - Simplificado sin icono decorativo */}
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-2xl font-bold text-gray-800">Gestión de Usuarios</h3>
                <p className="text-gray-600 text-sm mt-1">
                  {users.length} usuario{users.length !== 1 ? 's' : ''} registrado{users.length !== 1 ? 's' : ''} en el sistema
                </p>
              </div>
              
              {/* Botón para abrir gestión completa */}
              <button
                onClick={() => setShowUserManagement(true)}
                className="w-12 h-12 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl hover:from-green-600 hover:to-emerald-700 transition-all transform hover:scale-110 shadow-lg flex items-center justify-center"
                title="Gestión Completa de Usuarios"
              >
                <i className="fas fa-user-cog text-xl"></i>
              </button>
            </div>

            {/* Vista con acordeones expandibles */}
            <div className="space-y-6">
              {/* Acordeón Administradores */}
              <div className="bg-gradient-to-br from-purple-50 to-violet-100 rounded-2xl shadow-lg border-2 border-purple-200 overflow-hidden">
                <button
                  onClick={() => setShowAdminListModal(true)}
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
                      <i className="fas fa-arrow-right text-purple-600"></i>
                    </div>
                  </div>
                </button>
                
              </div>

              {/* Acordeón Publicadores */}
              <div className="bg-gradient-to-br from-blue-50 to-indigo-100 rounded-2xl shadow-lg border-2 border-blue-200 overflow-hidden">
                <button
                  onClick={() => setShowPublisherListModal(true)}
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
                      <i className="fas fa-arrow-right text-blue-600"></i>
                    </div>
                  </div>
                </button>
                
              </div>

              {/* Card Total - Ahora clickeable */}
              <button
                onClick={() => setShowAllUsersModal(true)}
                className="w-full text-left bg-gradient-to-br from-green-50 to-emerald-100 rounded-2xl shadow-lg p-6 border-2 border-green-200 hover:shadow-xl transition-all duration-300 hover:scale-[1.02] cursor-pointer"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg">
                    <i className="fas fa-users-cog text-white text-xl"></i>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-bold">
                      {users.length}
                    </span>
                    <i className="fas fa-arrow-right text-green-600"></i>
                  </div>
                </div>
                <h4 className="text-xl font-bold text-green-800 mb-2">Total Usuarios</h4>
                <p className="text-green-600 text-sm">Registrados en el sistema • Click para ver todos</p>
              </button>
            </div>

            {/* Mensaje informativo mejorado */}
            <div className="relative overflow-hidden bg-gradient-to-br from-indigo-50 via-blue-50 to-purple-50 rounded-3xl shadow-lg border border-indigo-200/50 backdrop-blur-sm">
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-blue-400/10 to-transparent rounded-full -mr-16 -mt-16"></div>
              <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-purple-400/10 to-transparent rounded-full -ml-12 -mb-12"></div>
              
              <div className="relative p-6">
                <div className="flex items-start gap-4 mb-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg flex-shrink-0">
                    <i className="fas fa-user-cog text-white text-lg"></i>
                  </div>
                  <div className="flex-1">
                    <h5 className="text-xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent mb-2">
                      Gestión Completa de Usuarios
                    </h5>
                    <p className="text-gray-700 leading-relaxed">
                      Para crear, editar, eliminar o resetear la contraseña de un usuario, haz clic en el 
                      <span className="inline-flex items-center gap-1 mx-2 px-2 py-1 bg-green-100 text-green-700 rounded-lg font-medium">
                        <i className="fas fa-user-cog text-xs"></i>
                        ícono
                      </span>
                      ubicado en la parte superior.
                    </p>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
                  <div className="flex items-center gap-2 px-3 py-2 bg-white/70 rounded-xl border border-indigo-200/50 backdrop-blur-sm">
                    <i className="fas fa-plus-circle text-green-600"></i>
                    <span className="text-sm font-medium text-gray-700">Crear</span>
                  </div>
                  <div className="flex items-center gap-2 px-3 py-2 bg-white/70 rounded-xl border border-blue-200/50 backdrop-blur-sm">
                    <i className="fas fa-edit text-blue-600"></i>
                    <span className="text-sm font-medium text-gray-700">Editar</span>
                  </div>
                  <div className="flex items-center gap-2 px-3 py-2 bg-white/70 rounded-xl border border-yellow-200/50 backdrop-blur-sm">
                    <i className="fas fa-key text-yellow-600"></i>
                    <span className="text-sm font-medium text-gray-700">Resetear</span>
                  </div>
                  <div className="flex items-center gap-2 px-3 py-2 bg-white/70 rounded-xl border border-red-200/50 backdrop-blur-sm">
                    <i className="fas fa-trash text-red-600"></i>
                    <span className="text-sm font-medium text-gray-700">Eliminar</span>
                  </div>
                </div>
              </div>
            </div>


          </div>
        );
      
      case 'backup':
        return (
          <div className="space-y-8">
            {/* Header de la sección */}
            <div className="text-center">
              <div className="w-20 h-20 bg-gradient-to-r from-green-500 to-emerald-600 rounded-3xl flex items-center justify-center mx-auto mb-4 shadow-xl">
                <i className="fas fa-download text-3xl text-white"></i>
              </div>
              <h3 className="text-2xl font-bold text-gray-800 mb-2">Respaldo de Datos</h3>
              <p className="text-gray-600 max-w-md mx-auto">Crea copias de seguridad de la información del sistema</p>
            </div>

            {/* Opciones de backup */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Backup Direcciones y Territorios */}
              <div className="bg-gradient-to-br from-blue-50 to-indigo-100 border-2 border-blue-200 rounded-3xl p-6 hover:shadow-2xl hover:scale-[1.02] transition-all duration-300">
                <div className="flex items-start mb-4">
                  <div className="w-16 h-16 bg-blue-500 rounded-2xl flex items-center justify-center mr-4 shadow-lg">
                    <i className="fas fa-map-marked-alt text-2xl text-white"></i>
                  </div>
                  <div className="flex-1">
                    <h4 className="text-xl font-bold text-gray-900 mb-2">Direcciones y Territorios</h4>
                    <p className="text-sm text-gray-600 leading-relaxed mb-4">
                      Exporta únicamente los datos de territorios y direcciones. Ideal para respaldos específicos.
                    </p>
                    <div className="flex flex-wrap gap-2 mb-4">
                      <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-xs font-medium">
                        📍 {addresses.length} direcciones
                      </span>
                      <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-xs font-medium">
                        🗺️ {territories.length} territorios
                      </span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={handleBackupAddressesAndTerritories}
                  className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl hover:from-blue-600 hover:to-indigo-700 transition-all transform hover:scale-105 font-medium shadow-lg"
                >
                  <i className="fas fa-download"></i>
                  <span>Descargar Backup</span>
                </button>
              </div>

              {/* Nuevo: Backup Solo Direcciones */}
              <div className="bg-gradient-to-br from-purple-50 to-pink-100 border-2 border-purple-200 rounded-3xl p-6 hover:shadow-2xl hover:scale-[1.02] transition-all duration-300">
                <div className="flex items-start mb-4">
                  <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-pink-600 rounded-2xl flex items-center justify-center mr-4 shadow-lg">
                    <i className="fas fa-home text-2xl text-white"></i>
                  </div>
                  <div className="flex-1">
                    <h4 className="text-xl font-bold text-gray-900 mb-2">Solo Direcciones</h4>
                    <p className="text-sm text-gray-600 leading-relaxed mb-4">
                      Exporta exclusivamente las direcciones. Ideal para campañas especiales y asignaciones.
                    </p>
                    <div className="flex flex-wrap gap-2 mb-4">
                      <span className="bg-purple-100 text-purple-800 px-3 py-1 rounded-full text-xs font-medium">
                        📍 {addresses.length} direcciones
                      </span>
                      <span className="bg-pink-100 text-pink-800 px-3 py-1 rounded-full text-xs font-medium">
                        🎯 Para campañas
                      </span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={handleBackupAddressesOnly}
                  className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-600 text-white rounded-xl hover:from-purple-600 hover:to-pink-700 transition-all transform hover:scale-105 font-medium shadow-lg"
                >
                  <i className="fas fa-download"></i>
                  <span>Exportar Solo Direcciones</span>
                </button>
              </div>

              {/* Backup General */}
              <div className="bg-gradient-to-br from-green-50 to-emerald-100 border-2 border-green-200 rounded-3xl p-6 hover:shadow-2xl hover:scale-[1.02] transition-all duration-300">
                <div className="flex items-start mb-4">
                  <div className="w-16 h-16 bg-green-500 rounded-2xl flex items-center justify-center mr-4 shadow-lg">
                    <i className="fas fa-database text-2xl text-white"></i>
                  </div>
                  <div className="flex-1">
                    <h4 className="text-xl font-bold text-gray-900 mb-2">Backup Completo</h4>
                    <p className="text-sm text-gray-600 leading-relaxed mb-4">
                      Exporta todos los datos del sistema incluyendo usuarios y propuestas. Respaldo total.
                    </p>
                    <div className="flex flex-wrap gap-2 mb-4">
                      <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-xs font-medium">
                        📍 {addresses.length} direcciones
                      </span>
                      <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-xs font-medium">
                        🗺️ {territories.length} territorios
                      </span>
                      <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-xs font-medium">
                        👥 {users.length} usuarios
                      </span>
                      <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-xs font-medium">
                        📝 {proposals.length} propuestas
                      </span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={handleBackupGeneral}
                  className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl hover:from-green-600 hover:to-emerald-700 transition-all transform hover:scale-105 font-medium shadow-lg"
                >
                  <i className="fas fa-download"></i>
                  <span>Descargar Backup Completo</span>
                </button>
              </div>
            </div>

            {/* Información adicional */}
            <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-2xl p-6 border-2 border-amber-200">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-8 h-8 bg-amber-500 rounded-lg flex items-center justify-center">
                  <i className="fas fa-info-circle text-white text-sm"></i>
                </div>
                <h5 className="text-lg font-bold text-amber-900">Información Importante</h5>
              </div>
              <div className="space-y-2 text-amber-800 text-sm">
                <p>• Los backups se descargan en formato JSON con fecha actual</p>
                <p>• Guarda los archivos en un lugar seguro y accesible</p>
                <p>• Los backups incluyen toda la información hasta el momento de la descarga</p>
                <p>• Recomendamos hacer backups regulares para mantener la información segura</p>
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
      

      
      {/* Modal de Gestión de Usuarios */}
      {showUserManagement && (
        <UserManagementModal
          isOpen={showUserManagement}
          onClose={() => setShowUserManagement(false)}
        />
      )}

      {/* Modal de confirmación para eliminar propuestas */}
      {showDeleteConfirm && (
        <Modal isOpen={true} onClose={() => setShowDeleteConfirm(null)} size="sm">
          <div className="p-6">
            {/* Header */}
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
                <i className="fas fa-trash text-red-600 text-lg"></i>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  {showDeleteConfirm.type === 'single' ? 'Eliminar Propuesta' : 'Limpiar Propuestas'}
                </h3>
                <p className="text-red-600 text-sm">Esta acción no se puede deshacer</p>
              </div>
            </div>

            {/* Contenido */}
            <p className="text-gray-700 mb-6">
              {showDeleteConfirm.type === 'single' 
                ? '¿Estás seguro de que deseas eliminar esta propuesta permanentemente?'
                : `¿Estás seguro de que deseas eliminar TODAS las propuestas ${showDeleteConfirm.status === 'approved' ? 'aprobadas' : 'rechazadas'} del sistema?`
              }
            </p>

            {showDeleteConfirm.type === 'bulk' && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-6">
                <p className="text-red-800 text-sm font-medium">
                  Se eliminarán {proposals.filter(p => p.status === showDeleteConfirm.status).length} propuesta{proposals.filter(p => p.status === showDeleteConfirm.status).length > 1 ? 's' : ''} permanentemente
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
        </Modal>
      )}

      {/* Modal de Direcciones Archivadas */}
      {showArchivedAddresses && (
        <ArchivedAddressesPortal onClose={() => setShowArchivedAddresses(false)} />
      )}

      {/* Modal de Lista de Administradores */}
      <UserListModal
        isOpen={showAdminListModal}
        onClose={() => setShowAdminListModal(false)}
        userType="admin"
      />

      {/* Modal de Lista de Publicadores */}
      <UserListModal
        isOpen={showPublisherListModal}
        onClose={() => setShowPublisherListModal(false)}
        userType="publisher"
      />

      {/* Modal de Todos los Usuarios */}
      <UserListModal
        isOpen={showAllUsersModal}
        onClose={() => setShowAllUsersModal(false)}
        userType="all"
      />

      {/* Modal de Exportación de Direcciones */}
      <ExportAddressesModal
        isOpen={showExportAddressesModal}
        onClose={() => setShowExportAddressesModal(false)}
        onExportComplete={handleExportAddressesComplete}
        onExportSimplified={handleExportAddressesSimplified}
      />

      {/* Modal de Gestión de Campañas */}
      <CampaignModal
        isOpen={showCampaignModal}
        onClose={() => setShowCampaignModal(false)}
      />
      
      {/* Modal de Gestión de Territorios */}
      <TerritoryManagementModal 
        isOpen={showTerritoryManagementModal}
        onClose={() => setShowTerritoryManagementModal(false)}
      />
    </>
  );
};

export default AdminModal; 