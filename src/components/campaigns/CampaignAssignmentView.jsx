import React, { useState, useEffect } from 'react';
import Icon from '../common/Icon';
import { useApp } from '../../context/AppContext';

const CampaignAssignmentView = () => {
  const { campaigns, currentUser, addresses, territories } = useApp();
  const [activeCampaign, setActiveCampaign] = useState(null);
  const [userAssignments, setUserAssignments] = useState([]);
  const [expandedAddresses, setExpandedAddresses] = useState(false);

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
            territoryName: territory?.name || 'Sin territorio'
          };
        }).filter(Boolean) || [];
        
        setUserAssignments(assignedAddresses);
      }
    }
  }, [campaigns, currentUser, addresses, territories]);

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

      {/* Lista de direcciones asignadas */}
      <div className="bg-white rounded-xl shadow-md">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-gray-900">
              Mis Direcciones Asignadas
            </h3>
            <button
              onClick={() => setExpandedAddresses(!expandedAddresses)}
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-colors flex items-center gap-2"
            >
              <Icon name={expandedAddresses ? 'chevronUp' : 'chevronDown'} />
              {expandedAddresses ? 'Contraer' : 'Expandir'}
            </button>
          </div>
        </div>

        <div className="p-6">
          {expandedAddresses ? (
            // Vista expandida - todas las direcciones
            <div className="space-y-4">
              {userAssignments.map((address, index) => (
                <div 
                  key={address.id} 
                  className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg p-4 border border-purple-200"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="inline-flex items-center px-2.5 py-1 bg-purple-600 text-white rounded-full text-xs font-bold">
                          #{index + 1}
                        </span>
                        <span className="inline-flex items-center px-2.5 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                          Territorio {address.territoryName}
                        </span>
                      </div>
                      <p className="text-gray-900 font-medium">{address.address}</p>
                      {address.notes && (
                        <p className="text-sm text-gray-600 mt-2 italic">
                          Nota: {address.notes}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => {
                        // Aquí podrías agregar funcionalidad para marcar como visitada
                        console.log('Marcar como visitada:', address.id);
                      }}
                      className="p-2 hover:bg-white/50 rounded-lg transition-colors"
                      title="Marcar como visitada"
                    >
                      <Icon name="checkCircle" className="text-gray-400 hover:text-green-600" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            // Vista compacta - resumen
            <div className="space-y-3">
              {userAssignments.slice(0, 3).map((address, index) => (
                <div 
                  key={address.id} 
                  className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg"
                >
                  <span className="inline-flex items-center justify-center w-8 h-8 bg-purple-600 text-white rounded-full text-sm font-bold">
                    {index + 1}
                  </span>
                  <div className="flex-1">
                    <p className="text-sm text-gray-900 line-clamp-1">{address.address}</p>
                    <p className="text-xs text-gray-500">Territorio {address.territoryName}</p>
                  </div>
                </div>
              ))}
              
              {userAssignments.length > 3 && (
                <div className="text-center pt-2">
                  <p className="text-sm text-gray-600">
                    y {userAssignments.length - 3} direcciones más...
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Botón de exportar/imprimir */}
          <div className="mt-6 pt-6 border-t border-gray-200">
            <button
              onClick={() => {
                // Crear contenido para exportar
                const content = userAssignments.map((addr, idx) => 
                  `${idx + 1}. ${addr.address} (Territorio ${addr.territoryName})`
                ).join('\n');
                
                // Crear blob y descargar
                const blob = new Blob([`CAMPAÑA: ${activeCampaign.name}\n\nMIS DIRECCIONES ASIGNADAS:\n\n${content}`], 
                  { type: 'text/plain' }
                );
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `mis_direcciones_campaña_${new Date().toISOString().split('T')[0]}.txt`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
              }}
              className="w-full px-4 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg font-medium hover:shadow-lg transition-all flex items-center justify-center gap-2"
            >
              <Icon name="download" />
              Descargar Lista para Imprimir
            </button>
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
              <li>Puedes descargar la lista para imprimirla o consultarla sin conexión.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CampaignAssignmentView;