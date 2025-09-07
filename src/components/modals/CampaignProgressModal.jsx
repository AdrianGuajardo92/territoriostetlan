import React, { useState } from 'react';
import Icon from '../common/Icon';
import TransferAddressModal from './TransferAddressModal';
import { useApp } from '../../context/AppContext';

const CampaignProgressModal = ({ campaign, isOpen, onClose }) => {
  const { users, addresses, currentUser } = useApp();
  const [transferModal, setTransferModal] = useState({
    isOpen: false,
    address: null,
    currentAssignment: null
  });
  
  if (!isOpen || !campaign) return null;

  // Verificar si el usuario es admin
  const isAdmin = currentUser?.role === 'admin';

  // Calcular estadísticas generales
  const totalAddresses = campaign.assignments?.reduce((sum, a) => sum + a.addressCount, 0) || 0;
  const completedAddresses = campaign.assignments?.reduce((sum, a) => sum + (a.completedCount || 0), 0) || 0;
  const progressPercentage = totalAddresses > 0 ? Math.round((completedAddresses / totalAddresses) * 100) : 0;

  // Ordenar asignaciones alfabéticamente por nombre de usuario
  const sortedAssignments = [...(campaign.assignments || [])].sort((a, b) => {
    const userA = users.find(u => u.id === a.userId);
    const userB = users.find(u => u.id === b.userId);
    const nameA = userA?.name || '';
    const nameB = userB?.name || '';
    return nameA.localeCompare(nameB, 'es', { numeric: true });
  });

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Overlay */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal de pantalla completa */}
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className="bg-white w-full h-full max-w-7xl max-h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden">
          {/* Header del modal */}
          <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white p-6 flex-shrink-0">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold flex items-center gap-3">
                  <Icon name="activity" className="text-3xl" />
                  Progreso en Tiempo Real - {campaign.name}
                </h2>
                <p className="text-white/80 mt-1">Monitoreo de la campaña especial</p>
              </div>
              <button
                onClick={onClose}
                className="w-10 h-10 bg-white/20 hover:bg-white/30 rounded-lg flex items-center justify-center transition-colors"
              >
                <Icon name="x" className="text-2xl" />
              </button>
            </div>
          </div>

          {/* Contenido scrolleable */}
          <div className="flex-1 overflow-y-auto p-6">
            {/* Resumen General con Barra de Progreso */}
            <div className="mb-8 p-6 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border border-green-200">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h4 className="text-lg font-bold text-gray-900">Direcciones Completadas</h4>
                  <p className="text-4xl font-bold text-green-600 mt-2">
                    {completedAddresses} / {totalAddresses}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-5xl font-bold text-green-600">{progressPercentage}%</p>
                  <p className="text-sm text-gray-600 mt-1">Progreso Total</p>
                </div>
              </div>
              
              {/* Barra de Progreso Grande */}
              <div className="w-full bg-gray-200 rounded-full h-6 overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-green-500 to-emerald-500 rounded-full transition-all duration-500 ease-out flex items-center justify-center"
                  style={{ width: `${progressPercentage}%` }}
                >
                  {progressPercentage > 10 && (
                    <span className="text-white text-sm font-bold">{progressPercentage}%</span>
                  )}
                </div>
              </div>
              
              {progressPercentage === 100 && (
                <div className="mt-4 text-center">
                  <p className="text-green-700 font-bold text-xl">🎉 ¡Campaña Completada al 100%! 🎉</p>
                </div>
              )}
            </div>
            
            {/* Lista Detallada de Participantes (Ordenada Alfabéticamente) */}
            <div>
              <h3 className="text-xl font-bold text-gray-900 mb-4">
                Detalle por Participante (Orden Alfabético)
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {sortedAssignments.map((assignment, index) => {
                  const user = users.find(u => u.id === assignment.userId);
                  const completedCount = assignment.completedCount || 0;
                  const totalCount = assignment.addressCount || 0;
                  const userProgress = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
                  const isCompleted = completedCount === totalCount;
                  
                  return (
                    <div 
                      key={index} 
                      className={`p-4 rounded-xl border-2 ${
                        isCompleted 
                          ? 'bg-green-50 border-green-300' 
                          : 'bg-white border-gray-200'
                      } transition-all duration-300 hover:shadow-lg`}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                            isCompleted ? 'bg-green-500' : 'bg-blue-500'
                          }`}>
                            {isCompleted ? (
                              <Icon name="check" className="text-white text-xl" />
                            ) : (
                              <span className="text-white font-bold">{user?.name?.charAt(0) || 'U'}</span>
                            )}
                          </div>
                          <div>
                            <p className="font-bold text-gray-900 text-lg">{user?.name || 'Usuario'}</p>
                            <p className="text-sm text-gray-600">@{user?.accessCode}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className={`text-2xl font-bold ${
                            isCompleted ? 'text-green-600' : 'text-gray-900'
                          }`}>
                            {completedCount}/{totalCount}
                          </p>
                          <p className="text-sm text-gray-600">{userProgress}%</p>
                        </div>
                      </div>
                      
                      {/* Barra de progreso individual */}
                      <div className="w-full bg-gray-200 rounded-full h-3 mb-3">
                        <div 
                          className={`h-full rounded-full transition-all duration-500 ${
                            isCompleted 
                              ? 'bg-gradient-to-r from-green-500 to-emerald-500' 
                              : 'bg-gradient-to-r from-blue-500 to-indigo-500'
                          }`}
                          style={{ width: `${userProgress}%` }}
                        />
                      </div>
                      
                      {/* Lista expandible de direcciones */}
                      {assignment.addressIds && (
                        <details className="mt-3">
                          <summary className="cursor-pointer text-sm text-gray-600 hover:text-gray-900 font-medium">
                            Ver direcciones asignadas ({assignment.addressIds.length})
                          </summary>
                          <div className="mt-3 space-y-2 max-h-48 overflow-y-auto">
                            {assignment.addressIds.map((addressId, addrIndex) => {
                              const address = addresses.find(a => a.id === addressId);
                              const isAddressCompleted = assignment.completedAddresses?.includes(addressId);
                              return (
                                <div 
                                  key={addrIndex} 
                                  className={`text-sm p-2 rounded-lg flex items-center gap-2 ${
                                    isAddressCompleted 
                                      ? 'bg-green-100 text-green-700' 
                                      : 'bg-gray-100 text-gray-600'
                                  } ${isAdmin ? 'cursor-pointer hover:shadow-md transition-all' : ''}`}
                                  onClick={() => {
                                    if (isAdmin && address) {
                                      setTransferModal({
                                        isOpen: true,
                                        address: address,
                                        currentAssignment: assignment
                                      });
                                    }
                                  }}
                                  title={isAdmin ? 'Click para transferir esta dirección' : ''}
                                >
                                  <span className={`w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center ${
                                    isAddressCompleted ? 'bg-green-500' : 'bg-gray-300'
                                  }`}>
                                    {isAddressCompleted && (
                                      <Icon name="check" className="text-white text-xs" />
                                    )}
                                  </span>
                                  <span className="flex-1">{address?.address || addressId}</span>
                                  {isAdmin && (
                                    <Icon name="share" className="text-gray-400 hover:text-blue-500 transition-colors" size={16} />
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </details>
                      )}
                      
                      {isCompleted && (
                        <div className="mt-3 text-center">
                          <span className="text-green-600 font-bold text-sm">✅ Completado</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Footer con información adicional */}
          <div className="bg-gray-50 p-4 border-t border-gray-200 flex-shrink-0">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-600">
                <Icon name="info" className="inline mr-1" />
                Los datos se actualizan en tiempo real
              </p>
              <p className="text-sm text-gray-600">
                Última actualización: Ahora mismo
              </p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Modal de Transferencia */}
      <TransferAddressModal
        isOpen={transferModal.isOpen}
        onClose={() => setTransferModal({ isOpen: false, address: null, currentAssignment: null })}
        address={transferModal.address}
        currentAssignment={transferModal.currentAssignment}
        campaignId={campaign?.id}
      />
    </div>
  );
};

export default CampaignProgressModal;