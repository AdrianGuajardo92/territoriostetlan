import React, { useState, useEffect } from 'react';
import Icon from '../common/Icon';
import AddressCard from '../addresses/AddressCard';
import { useApp } from '../../context/AppContext';

const CampaignAssignmentView = () => {
  const { campaigns, currentUser, addresses, territories, updateCampaignProgress } = useApp();
  const [activeCampaign, setActiveCampaign] = useState(null);
  const [userAssignments, setUserAssignments] = useState([]);
  const [completedAddresses, setCompletedAddresses] = useState(new Set()); // Track de direcciones completadas

  useEffect(() => {
    // Encontrar campañas activas
    const activeCampaigns = campaigns.filter(c => c.status === 'active');
    
    if (activeCampaigns.length > 0) {
      // Tomar la más reciente
      const campaign = activeCampaigns[0];
      setActiveCampaign(campaign);
      
      // Encontrar asignaciones del usuario actual
      const userAssignment = campaign.assignments?.find(a => a.userId === currentUser?.id);
      if (userAssignment) {
        // Obtener detalles de las direcciones asignadas
        const assignedAddresses = userAssignment.addressIds?.map(addressId => {
          const address = addresses.find(a => a.id === addressId);
          const territory = territories.find(t => t.id === address?.territoryId);
          return {
            ...address,
            territoryName: territory?.name || 'Sin territorio',
            territoryNumber: parseInt(territory?.name?.match(/\d+/)?.[0] || 0)
          };
        }).filter(Boolean) || [];
        
        // ORDENAR por número de territorio de forma ascendente
        const sortedAddresses = assignedAddresses.sort((a, b) => {
          return a.territoryNumber - b.territoryNumber;
        });
        
        setUserAssignments(sortedAddresses);
        
        // Cargar el progreso guardado
        if (userAssignment.completedAddresses) {
          setCompletedAddresses(new Set(userAssignment.completedAddresses));
        }
      }
    }
  }, [campaigns, currentUser, addresses, territories]);

  // Función para marcar/desmarcar una dirección como completada
  const toggleAddressCompleted = async (addressId) => {
    const newSet = new Set(completedAddresses);
    if (newSet.has(addressId)) {
      newSet.delete(addressId);
    } else {
      newSet.add(addressId);
    }
    
    setCompletedAddresses(newSet);
    
    // Guardar el progreso en Firebase
    if (activeCampaign && currentUser) {
      await updateCampaignProgress(
        activeCampaign.id, 
        currentUser.id, 
        Array.from(newSet)
      );
    }
  };

  // Si no hay campaña activa
  if (!activeCampaign) {
    return (
      <div className="bg-white rounded-xl shadow-md p-6">
        <div className="text-center py-8">
          <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Icon name="flag" className="text-3xl text-gray-400" />
          </div>
          <h3 className="text-lg font-bold text-gray-900 mb-2">No hay campañas activas</h3>
          <p className="text-gray-600">
            Cuando el administrador inicie una campaña especial, verás tus asignaciones aquí.
          </p>
        </div>
      </div>
    );
  }

  // Si hay campaña pero no asignaciones para este usuario
  if (userAssignments.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-md p-6">
        <div className="text-center py-8">
          <div className="w-20 h-20 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Icon name="alertCircle" className="text-3xl text-yellow-600" />
          </div>
          <h3 className="text-lg font-bold text-gray-900 mb-2">Sin asignaciones</h3>
          <p className="text-gray-600">
            No tienes direcciones asignadas en la campaña actual.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header de campaña activa */}
      <div className="bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl p-6 text-white shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Icon name="flag" className="text-2xl" />
              <h2 className="text-2xl font-bold">Campaña Especial Activa</h2>
            </div>
            <h3 className="text-xl font-semibold opacity-90">{activeCampaign.name}</h3>
            {activeCampaign.description && (
              <p className="text-white/80 mt-2">{activeCampaign.description}</p>
            )}
          </div>
          <div className="text-right">
            <div className="bg-white/20 backdrop-blur-sm rounded-lg px-4 py-2">
              <p className="text-3xl font-bold">{userAssignments.length}</p>
              <p className="text-sm opacity-90">
                {userAssignments.length === 1 ? 'dirección' : 'direcciones'}
              </p>
            </div>
          </div>
        </div>

        {/* Fechas de la campaña */}
        {(activeCampaign.startDate || activeCampaign.endDate) && (
          <div className="flex items-center gap-4 pt-4 border-t border-white/20">
            <div className="flex items-center gap-2">
              <Icon name="calendar" className="text-white/80" />
              <span className="text-sm">
                {activeCampaign.startDate && 
                  new Date(activeCampaign.startDate).toLocaleDateString('es-MX')
                }
                {activeCampaign.endDate && 
                  ` - ${new Date(activeCampaign.endDate).toLocaleDateString('es-MX')}`
                }
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Lista de direcciones asignadas - SIEMPRE EXPANDIDA */}
      <div className="bg-white rounded-xl shadow-md">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-gray-900">
                Mis Direcciones Asignadas (Ordenadas por Territorio)
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                Total: {userAssignments.length} {userAssignments.length === 1 ? 'dirección' : 'direcciones'}
              </p>
            </div>
            {completedAddresses.size > 0 && (
              <div className="text-right">
                <p className="text-sm text-gray-600">Progreso</p>
                <p className="text-lg font-bold text-green-600">
                  {completedAddresses.size} / {userAssignments.length}
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="p-6">
          {/* Mostrar SIEMPRE todas las tarjetas expandidas */}
          <div className="space-y-3">
            {userAssignments.map((address, index) => {
              const isCompleted = completedAddresses.has(address.id);
              return (
                <div 
                  key={address.id} 
                  className="relative cursor-pointer"
                  onClick={() => toggleAddressCompleted(address.id)}
                >
                  {/* Badge con el número de la dirección */}
                  <div className="absolute -top-2 -left-2 z-10">
                    <span className={`inline-flex items-center justify-center w-8 h-8 ${isCompleted ? 'bg-rose-600' : 'bg-purple-600'} text-white rounded-full text-sm font-bold shadow-lg transition-colors`}>
                      {isCompleted ? '✓' : index + 1}
                    </span>
                  </div>
                  {/* Tarjeta de dirección con todas las funcionalidades */}
                  <AddressCard 
                    address={{
                      ...address,
                      isVisited: isCompleted  // Pasar el estado de completado como visitado para cambiar el color
                    }}
                    viewMode="navigation-only"
                    showActions={false}
                    hideStatusBadge={true}  // Ocultar badge de "Pendiente"
                    showFullAddress={true}   // Mostrar dirección completa sin truncar
                    // No pasamos customBadge para eliminar el badge de territorio
                  />
                </div>
              );
            })}
          </div>

        </div>
      </div>

      {/* Información adicional */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <Icon name="info" className="text-blue-500 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-blue-800">
            <p className="font-medium mb-1">Información importante:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Estas direcciones han sido asignadas específicamente para ti en esta campaña especial.</li>
              <li>Por favor, visita las direcciones en el orden que consideres más conveniente.</li>
              <li>Haz clic en una tarjeta para marcarla como completada.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CampaignAssignmentView;