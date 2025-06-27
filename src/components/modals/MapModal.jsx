import React, { useState, useEffect } from 'react';
import Modal from '../common/Modal';
import Icon from '../common/Icon';
import { calculateRouteStats } from '../../utils/routeOptimizer';

const MapModal = ({
  isOpen,
  onClose,
  territoryName,
  addresses
}) => {
  const [selectedAddress, setSelectedAddress] = useState(null);
  const [routeStats, setRouteStats] = useState(null);

  // Filtrar solo direcciones con mapUrl
  const addressesWithMap = addresses.filter(addr => addr.mapUrl);
  
  // Calcular estadísticas de la ruta cuando cambian las direcciones
  useEffect(() => {
    if (addresses.length > 0) {
      const stats = calculateRouteStats(addresses);
      setRouteStats(stats);
    }
  }, [addresses]);

  const handleNavigate = (address) => {
    if (address.mapUrl) {
      window.open(address.mapUrl, '_blank');
    }
  };

  const handleNavigateAll = () => {
    // Crear una URL de Google Maps con múltiples destinos
    const baseUrl = 'https://www.google.com/maps/dir/';
    
    // Si hay un orden de ruta (routeOrder), ordenar por ese campo
    const orderedAddresses = [...addressesWithMap].sort((a, b) => {
      if (a.routeOrder && b.routeOrder) {
        return a.routeOrder - b.routeOrder;
      }
      return 0;
    });
    
    const destinations = orderedAddresses
      .map(addr => encodeURIComponent(addr.address))
      .join('/');
    
    window.open(baseUrl + destinations, '_blank');
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Mapa del Territorio: ${territoryName}`}
      size="xl"
    >
      <div className="p-6">
        {/* Información del territorio */}
        <div className="mb-6 p-4 bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900">
                {territoryName}
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                {addressesWithMap.length} direcciones con ubicación
              </p>
              {routeStats && routeStats.validSegments > 0 && (
                <div className="mt-2 text-sm text-gray-700">
                  <div className="flex items-center space-x-4">
                    <span className="flex items-center">
                      <Icon name="activity" size={14} className="mr-1 text-purple-600" />
                      {routeStats.totalDistance} km
                    </span>
                    <span className="flex items-center">
                      <Icon name="clock" size={14} className="mr-1 text-purple-600" />
                      ~{routeStats.estimatedTime} min
                    </span>
                  </div>
                </div>
              )}
            </div>
            {addressesWithMap.length > 1 && (
              <button
                onClick={handleNavigateAll}
                className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:shadow-lg transform hover:scale-[1.02] transition-all font-medium text-sm flex items-center ml-4"
              >
                <Icon name="mapPin" size={16} className="mr-2" />
                Ver ruta completa
              </button>
            )}
          </div>
        </div>

        {/* Lista de direcciones con mapa */}
        {addressesWithMap.length === 0 ? (
          <div className="text-center py-12">
            <Icon name="mapOff" size={48} className="mx-auto mb-4 text-gray-300" />
            <p className="text-gray-500 font-medium">
              No hay direcciones con ubicación en este territorio
            </p>
          </div>
        ) : (
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {addresses.filter(addr => addr.mapUrl).map((address, index) => (
              <div
                key={address.id}
                className={`p-4 rounded-lg border-2 transition-all cursor-pointer ${
                  selectedAddress?.id === address.id
                    ? 'border-purple-500 bg-purple-50'
                    : 'border-gray-200 hover:border-purple-300 hover:bg-gray-50'
                }`}
                onClick={() => setSelectedAddress(address)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center">
                      <span className={`flex-shrink-0 w-8 h-8 text-white rounded-full flex items-center justify-center text-sm font-bold mr-3 ${
                        address.routeOrder ? 'bg-red-500' : 'bg-purple-600'
                      }`}>
                        {address.routeOrder || index + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-gray-900 truncate">
                          {address.address}
                        </h4>
                        {address.referencia && (
                          <p className="text-sm text-gray-600 truncate">
                            {address.referencia}
                          </p>
                        )}
                      </div>
                    </div>
                    
                    {/* Estados */}
                    <div className="flex items-center space-x-2 mt-2 ml-11">
                      {address.isVisited && (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          <Icon name="check" size={12} className="mr-1" />
                          Visitada
                        </span>
                      )}
                      {address.isRevisita && (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                          <Icon name="refresh" size={12} className="mr-1" />
                          Revisita
                        </span>
                      )}
                      {address.isEstudio && (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          <Icon name="book" size={12} className="mr-1" />
                          Estudio
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleNavigate(address);
                    }}
                    className="ml-3 p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    title="Abrir en Google Maps"
                  >
                    <Icon name="externalLink" size={20} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Mapa embebido (simulado) */}
        {selectedAddress && (
          <div className="mt-6 p-4 bg-gray-100 rounded-lg">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-medium text-gray-900">
                Vista previa: {selectedAddress.address}
              </h4>
              <button
                onClick={() => handleNavigate(selectedAddress)}
                className="text-blue-600 hover:text-blue-700 font-medium text-sm"
              >
                Abrir en Google Maps →
              </button>
            </div>
            <div className="bg-gray-200 rounded-lg h-64 flex items-center justify-center">
              <div className="text-center">
                <Icon name="map" size={48} className="mx-auto mb-3 text-gray-400" />
                <p className="text-gray-500">
                  Haz clic en "Abrir en Google Maps" para ver la ubicación
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Acciones */}
        <div className="flex justify-end mt-6 pt-4 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
          >
            Cerrar
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default MapModal; 