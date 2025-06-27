import React, { useState, useEffect } from 'react';
import Modal from '../common/Modal';
import Icon from '../common/Icon';
import { useApp } from '../../context/AppContext';
import { useToast } from '../../hooks/useToast';

const AdminModal = ({ isOpen, onClose }) => {
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
  
  useEffect(() => {
    if (isOpen) {
      setView(currentUser?.role === 'admin' ? 'actions' : 'no_access');
    }
  }, [isOpen, currentUser]);
  
  const adminOptions = [
    { 
      id: 'proposals', 
      title: 'Propuestas de Cambios', 
      description: pendingProposalsCount > 0 ? `${pendingProposalsCount} pendientes` : 'Ver cambios propuestos', 
      icon: 'checkSquare', 
      badge: pendingProposalsCount, 
      action: () => setView('proposals') 
    },
    { 
      id: 'users', 
      title: 'Gestión de Usuarios', 
      description: 'Administrar publicadores', 
      icon: 'users', 
      action: () => setView('users') 
    },
    { 
      id: 'territories', 
      title: 'Gestión de Territorios', 
      description: 'Administrar territorios', 
      icon: 'map', 
      action: () => setView('territories') 
    },
    { 
      id: 'stats', 
      title: 'Estadísticas Avanzadas', 
      description: 'Análisis detallado del trabajo', 
      icon: 'activity', 
      action: () => setView('stats') 
    }
  ];
  
  const handleApprove = async (proposal) => {
    try {
      await handleApproveProposal(proposal.id);
      showToast('Propuesta aprobada', 'success');
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
      showToast('Propuesta rechazada', 'info');
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
          <div className="flex-1 flex items-center justify-center p-8">
            <div className="text-center">
              <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Icon name="shield" size={40} className="text-red-500" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Acceso Denegado</h3>
              <p className="text-gray-600">No tienes los permisos para acceder aquí.</p>
            </div>
          </div>
        );
      
      case 'actions':
        return (
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {adminOptions.map(option => (
                <button 
                  key={option.id} 
                  onClick={option.action} 
                  className="relative p-6 bg-white border-2 border-gray-200 rounded-lg text-left transition-all hover:border-gray-400 hover:shadow-md group"
                >
                  {option.badge > 0 && (
                    <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-6 h-6 flex items-center justify-center font-bold animate-pulse">
                      {option.badge}
                    </span>
                  )}
                  <div className="flex items-start">
                    <div className="w-12 h-12 rounded-lg flex items-center justify-center mr-4 bg-gray-100 text-gray-600">
                      <Icon name={option.icon} size={24} />
                    </div>
                    <div className="flex-1">
                      <h4 className="text-lg font-semibold text-gray-900 mb-1">{option.title}</h4>
                      <p className="text-sm text-gray-600">{option.description}</p>
                    </div>
                    <Icon name="chevronRight" size={20} className="text-gray-400 mt-1 transition-transform group-hover:translate-x-1" />
                  </div>
                </button>
              ))}
            </div>
          </div>
        );
      
      case 'proposals':
        const pendingProposals = proposals.filter(p => p.status === 'pending');
        
        return (
          <div className="p-6">
            <div className="flex items-center mb-6">
              <button onClick={() => setView('actions')} className="p-2 rounded-full hover:bg-gray-100">
                <Icon name="arrowLeft" size={20} />
              </button>
              <h3 className="text-xl font-bold text-gray-900 ml-2">Propuestas Pendientes</h3>
            </div>
            
            {pendingProposals.length === 0 ? (
              <div className="text-center py-12">
                <Icon name="checkCircle" size={48} className="mx-auto mb-4 text-green-500" />
                <p className="text-gray-600">No hay propuestas pendientes</p>
              </div>
            ) : (
              <div className="space-y-4">
                {pendingProposals.map(proposal => {
                  const territory = territories.find(t => t.id === proposal.territoryId);
                  
                  return (
                    <div key={proposal.id} className="bg-white rounded-lg shadow-md p-4 border border-gray-200">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h4 className="font-semibold text-gray-900">
                            {proposal.type === 'new' ? 'Nueva Dirección' : 'Editar Dirección'}
                          </h4>
                          <p className="text-sm text-gray-600">Por {proposal.proposedByName}</p>
                        </div>
                        <span className="px-2 py-1 text-xs rounded-full font-medium bg-yellow-100 text-yellow-800">
                          Pendiente
                        </span>
                      </div>
                      
                      <div className="mb-3">
                        <p className="text-sm text-gray-700">
                          <span className="font-medium">Territorio:</span> {territory?.name || 'Desconocido'}
                        </p>
                        {proposal.reason && (
                          <p className="text-sm text-gray-700 mt-1">
                            <span className="font-medium">Razón:</span> {proposal.reason}
                          </p>
                        )}
                      </div>
                      
                      <div className="flex justify-end space-x-2 mt-4 pt-3 border-t">
                        <button
                          onClick={() => setSelectedProposal(proposal)}
                          className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200"
                        >
                          Rechazar
                        </button>
                        <button
                          onClick={() => handleApprove(proposal)}
                          className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700"
                        >
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
        return (
          <div className="p-6">
            <div className="flex items-center mb-6">
              <button onClick={() => setView('actions')} className="p-2 rounded-full hover:bg-gray-100">
                <Icon name="arrowLeft" size={20} />
              </button>
              <h3 className="text-xl font-bold text-gray-900 ml-2">Gestión de Usuarios</h3>
            </div>
            <div className="space-y-4">
              {users.map(user => (
                <div key={user.id} className="bg-white rounded-lg shadow p-4 border border-gray-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-semibold text-gray-900">{user.name}</h4>
                      <p className="text-sm text-gray-600">
                        Código: {user.accessCode} • Rol: {user.role === 'admin' ? 'Administrador' : 'Publicador'}
                      </p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button className="p-2 text-gray-600 hover:bg-gray-100 rounded">
                        <Icon name="edit" size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      
      case 'territories':
        return (
          <div className="p-6">
            <div className="flex items-center mb-6">
              <button onClick={() => setView('actions')} className="p-2 rounded-full hover:bg-gray-100">
                <Icon name="arrowLeft" size={20} />
              </button>
              <h3 className="text-xl font-bold text-gray-900 ml-2">Gestión de Territorios</h3>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {territories.map(territory => (
                <div key={territory.id} className="bg-white rounded-lg shadow p-4 border border-gray-200">
                  <h4 className="font-semibold text-gray-900">{territory.name}</h4>
                  <p className="text-sm text-gray-600 mt-1">
                    Estado: <span className={`font-medium ${
                      territory.status === 'Disponible' ? 'text-green-600' : 
                      territory.status === 'En uso' ? 'text-yellow-600' : 'text-gray-600'
                    }`}>{territory.status}</span>
                  </p>
                  {territory.assignedTo && (
                    <p className="text-xs text-gray-500 mt-1">Asignado a: {territory.assignedTo}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        );
      
      case 'stats':
        const totalAddresses = addresses.length;
        const visitedAddresses = addresses.filter(a => a.isVisited).length;
        const completionRate = totalAddresses > 0 ? (visitedAddresses / totalAddresses * 100).toFixed(1) : 0;
        
        return (
          <div className="p-6">
            <div className="flex items-center mb-6">
              <button onClick={() => setView('actions')} className="p-2 rounded-full hover:bg-gray-100">
                <Icon name="arrowLeft" size={20} />
              </button>
              <h3 className="text-xl font-bold text-gray-900 ml-2">Estadísticas Avanzadas</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
                <p className="text-sm text-gray-600">Total Territorios</p>
                <p className="text-3xl font-bold text-gray-900">{territories.length}</p>
              </div>
              <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
                <p className="text-sm text-gray-600">Total Direcciones</p>
                <p className="text-3xl font-bold text-gray-900">{totalAddresses}</p>
              </div>
              <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
                <p className="text-sm text-gray-600">Progreso General</p>
                <p className="text-3xl font-bold text-green-600">{completionRate}%</p>
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
              <h4 className="font-semibold text-gray-900 mb-4">Estado de Territorios</h4>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Disponibles</span>
                  <span className="font-medium">{territories.filter(t => t.status === 'Disponible').length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">En uso</span>
                  <span className="font-medium">{territories.filter(t => t.status === 'En uso').length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Terminados</span>
                  <span className="font-medium">{territories.filter(t => t.status === 'Terminado').length}</span>
                </div>
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
        size="lg"
      >
        <div className="flex flex-col h-full">
          <div className="bg-gray-50 border-b border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-800">Panel de Administrador</h2>
              <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-lg transition-colors">
                <Icon name="x" size={20} className="text-gray-600" />
              </button>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
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
    </>
  );
};

export default AdminModal; 