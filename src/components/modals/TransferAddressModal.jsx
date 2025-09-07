import React, { useState, useEffect } from 'react';
import Icon from '../common/Icon';
import { useApp } from '../../context/AppContext';
import { useToast } from '../../hooks/useToast';

const TransferAddressModal = ({ isOpen, onClose, address, currentAssignment, campaignId }) => {
  const { users, transferCampaignAddress } = useApp();
  const { showToast } = useToast();
  const [selectedUserId, setSelectedUserId] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [isTransferring, setIsTransferring] = useState(false);

  // Resetear al abrir/cerrar
  useEffect(() => {
    if (!isOpen) {
      setSelectedUserId('');
      setSearchTerm('');
      setIsTransferring(false);
    }
  }, [isOpen]);

  if (!isOpen || !address || !currentAssignment) return null;

  // Filtrar usuarios disponibles (todos excepto el actual)
  const availableUsers = users.filter(u => {
    if (u.id === currentAssignment.userId) return false; // Excluir usuario actual
    if (!searchTerm) return true;
    return u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
           u.accessCode.toLowerCase().includes(searchTerm.toLowerCase());
  });

  // Usuario actual
  const currentUser = users.find(u => u.id === currentAssignment.userId);
  const selectedUser = users.find(u => u.id === selectedUserId);

  const handleTransfer = async () => {
    if (!selectedUserId) {
      showToast('Por favor selecciona un usuario destino', 'error');
      return;
    }

    if (!campaignId || !address?.id || !currentAssignment?.userId) {
      showToast('Faltan datos necesarios para la transferencia', 'error');
      console.error('Datos faltantes:', { campaignId, addressId: address?.id, fromUserId: currentAssignment?.userId });
      return;
    }

    setIsTransferring(true);
    try {
      const result = await transferCampaignAddress(
        campaignId,
        address.id,
        currentAssignment.userId,
        selectedUserId
      );
      
      if (result) {
        showToast(
          `Dirección transferida exitosamente de ${currentUser?.name} a ${selectedUser?.name}`,
          'success'
        );
        onClose();
      }
    } catch (error) {
      console.error('Error al transferir dirección:', error);
      showToast(error.message || 'Error al transferir la dirección', 'error');
    } finally {
      setIsTransferring(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] overflow-hidden">
      {/* Overlay */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-6 rounded-t-2xl">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <Icon name="share" className="text-2xl" />
                  Transferir Dirección
                </h2>
                <p className="text-blue-100 text-sm mt-1">
                  Reasignar esta dirección a otro participante
                </p>
              </div>
              <button
                onClick={onClose}
                className="w-8 h-8 bg-white/20 hover:bg-white/30 rounded-lg flex items-center justify-center transition-colors"
              >
                <Icon name="x" />
              </button>
            </div>
          </div>

          {/* Contenido */}
          <div className="p-6">
            {/* Dirección a transferir */}
            <div className="bg-gray-50 rounded-xl p-4 mb-6">
              <p className="text-sm text-gray-600 mb-1">Dirección a transferir:</p>
              <p className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <Icon name="mapPin" className="text-gray-500" />
                {address.address}
              </p>
            </div>

            {/* Usuario actual */}
            <div className="mb-6">
              <p className="text-sm text-gray-600 mb-2">Actualmente asignada a:</p>
              <div className="flex items-center gap-3 p-3 bg-red-50 rounded-lg border border-red-200">
                <div className="w-10 h-10 bg-red-500 rounded-full flex items-center justify-center">
                  <Icon name="user" className="text-white" />
                </div>
                <div>
                  <p className="font-bold text-gray-900">{currentUser?.name || 'Usuario'}</p>
                  <p className="text-sm text-gray-600">@{currentUser?.accessCode}</p>
                </div>
              </div>
            </div>

            {/* Selección de nuevo usuario */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Transferir a:
              </label>
              
              {/* Buscador */}
              <div className="relative mb-3">
                <Icon name="search" className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Buscar participante..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Lista de usuarios */}
              <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-lg">
                {availableUsers.length === 0 ? (
                  <p className="text-center text-gray-500 py-4">
                    No se encontraron usuarios
                  </p>
                ) : (
                  availableUsers.map(user => (
                    <button
                      key={user.id}
                      onClick={() => setSelectedUserId(user.id)}
                      className={`w-full p-3 text-left hover:bg-gray-50 flex items-center justify-between border-b last:border-b-0 transition-colors ${
                        selectedUserId === user.id ? 'bg-blue-50' : ''
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          selectedUserId === user.id ? 'bg-blue-500' : 'bg-gray-400'
                        }`}>
                          <Icon name="user" className="text-white" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{user.name}</p>
                          <p className="text-sm text-gray-600">@{user.accessCode}</p>
                        </div>
                      </div>
                      {selectedUserId === user.id && (
                        <Icon name="check" className="text-blue-500" />
                      )}
                    </button>
                  ))
                )}
              </div>

              {/* Usuario seleccionado */}
              {selectedUser && (
                <div className="mt-3 p-3 bg-green-50 rounded-lg border border-green-200">
                  <p className="text-sm text-gray-600 mb-1">Nueva asignación para:</p>
                  <div className="flex items-center gap-2">
                    <Icon name="checkCircle" className="text-green-500" />
                    <span className="font-bold text-gray-900">{selectedUser.name}</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Footer con acciones */}
          <div className="bg-gray-50 px-6 py-4 rounded-b-2xl flex justify-end gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              disabled={isTransferring}
            >
              Cancelar
            </button>
            <button
              onClick={handleTransfer}
              disabled={!selectedUserId || isTransferring}
              className={`px-4 py-2 text-white rounded-lg font-medium transition-colors flex items-center gap-2 ${
                !selectedUserId || isTransferring
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700'
              }`}
            >
              {isTransferring ? (
                <>
                  <Icon name="refresh" className="animate-spin" />
                  Transfiriendo...
                </>
              ) : (
                <>
                  <Icon name="share" />
                  Confirmar Transferencia
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TransferAddressModal;