import React, { useState, useMemo, useCallback } from 'react';
import Modal from '../common/Modal';
import Icon from '../common/Icon';
import AddressCard from '../addresses/AddressCard';
import { useApp } from '../../context/AppContext';
import { smartSearch } from '../../utils/helpers';

const SearchModal = ({ isOpen, onClose, onNavigateToTerritory, modalId = 'search-modal' }) => {
  const { territories, addresses, currentUser, adminEditMode } = useApp();
  const [searchTerm, setSearchTerm] = useState('');

  // Búsqueda inteligente sin acentos en direcciones y notas
  const searchResults = useMemo(() => {
    if (!searchTerm.trim()) return [];

    const results = addresses.filter(address => {
      // Buscar en dirección
      const matchesAddress = smartSearch(searchTerm, address.address);
      
      // Buscar en notas
      const matchesNotes = address.notes && smartSearch(searchTerm, address.notes);
      
      // Buscar en referencia
      const matchesReference = address.referencia && smartSearch(searchTerm, address.referencia);

      return matchesAddress || matchesNotes || matchesReference;
    }).map(address => {
      // Agregar información del territorio
      const territory = territories.find(t => t.id === address.territoryId);
      return {
        ...address,
        territory,
        territoryName: territory ? territory.name : `Territorio ${address.territoryId}`
      };
    });

    return results;
  }, [searchTerm, addresses, territories]);

  // Navegar al territorio y destacar la dirección
  const handleNavigateToAddress = useCallback((address) => {
    if (onNavigateToTerritory && address.territory) {
      // Cerrar el modal
      onClose();
      
      // Navegar al territorio con la dirección destacada
      onNavigateToTerritory(address.territory, address.id);
    }
  }, [onNavigateToTerritory, onClose]);

  // Limpiar búsqueda
  const handleClearSearch = useCallback(() => {
    setSearchTerm('');
  }, []);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title=""
      size="full" // Pantalla completa
      modalId={modalId}
    >
      <div className="h-full flex flex-col bg-gray-50">
        {/* Header del buscador */}
        <div className="bg-white shadow-sm border-b px-4 py-4 flex-shrink-0">
          <div className="flex items-center gap-4">
            {/* Botón cerrar */}
            <button
              onClick={onClose}
              className="p-2 rounded-full hover:bg-gray-100 transition-colors"
              title="Cerrar búsqueda"
            >
              <Icon name="x" size={24} className="text-gray-600" />
            </button>

            {/* Barra de búsqueda */}
            <div className="flex-1 relative">
              <Icon 
                name="search" 
                size={20} 
                className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" 
              />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-12 py-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg placeholder-gray-500"
                placeholder="Buscar dirección o nota..."
                autoFocus
              />
              {searchTerm && (
                <button
                  onClick={handleClearSearch}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 p-1 rounded-full hover:bg-gray-100 transition-colors"
                  title="Limpiar búsqueda"
                >
                  <Icon name="x" size={18} className="text-gray-500" />
                </button>
              )}
            </div>
          </div>

          {/* Estadísticas de búsqueda */}
          {searchTerm && (
            <div className="mt-3 flex items-center justify-between">
              <p className="text-sm text-gray-600">
                {searchResults.length > 0 
                  ? `${searchResults.length} dirección${searchResults.length !== 1 ? 'es' : ''} encontrada${searchResults.length !== 1 ? 's' : ''}`
                  : 'No se encontraron direcciones'
                }
              </p>
              {searchResults.length > 0 && (
                <p className="text-xs text-gray-500">
                  Toca una tarjeta para ir al territorio
                </p>
              )}
            </div>
          )}
        </div>

        {/* Contenido principal */}
        <div className="flex-1 overflow-y-auto">
          {!searchTerm ? (
            // Estado inicial - sin búsqueda
            <div className="flex items-center justify-center h-full px-4">
              <div className="text-center max-w-md">
                <div className="w-24 h-24 mx-auto mb-6 bg-blue-100 rounded-full flex items-center justify-center">
                  <Icon name="search" size={40} className="text-blue-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-800 mb-3">
                  Buscar en todos los territorios
                </h3>
                <p className="text-gray-600 mb-4">
                  Escribe el nombre de una calle, dirección o alguna nota para encontrar rápidamente la dirección que buscas.
                </p>
                <div className="bg-blue-50 rounded-lg p-4 text-left">
                  <h4 className="font-medium text-blue-800 mb-2">💡 Búsqueda inteligente:</h4>
                  <ul className="text-sm text-blue-700 space-y-1">
                    <li>• Busca sin acentos (calle vs callé)</li>
                    <li>• Encuentra notas de las direcciones</li>
                    <li>• Busca en todos los territorios</li>
                    <li>• Toca una tarjeta para ir al territorio</li>
                  </ul>
                </div>
              </div>
            </div>
          ) : searchResults.length === 0 ? (
            // Sin resultados
            <div className="flex items-center justify-center h-full px-4">
              <div className="text-center">
                <div className="w-20 h-20 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                  <Icon name="searchX" size={32} className="text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-700 mb-2">
                  No se encontraron direcciones
                </h3>
                <p className="text-gray-500 mb-4">
                  No hay direcciones que coincidan con "{searchTerm}"
                </p>
                <button
                  onClick={handleClearSearch}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Limpiar búsqueda
                </button>
              </div>
            </div>
          ) : (
            // Resultados encontrados
            <div className="p-4 space-y-4">
              {searchResults.map((address) => {
                // Determinar permisos para esta dirección
                const isAssignedToMe = address.territory?.status === 'En uso' && 
                                     address.territory?.assignedTo === currentUser?.name;
                const isAdmin = currentUser?.role === 'admin';

                return (
                  <div 
                    key={address.id} 
                    className="relative cursor-pointer transform transition-all hover:scale-[1.01]"
                    onClick={() => handleNavigateToAddress(address)}
                  >
                    <AddressCard
                      address={address}
                      viewMode="grid-full"
                      isAdmin={isAdmin}
                      isAssignedToMe={isAssignedToMe}
                      adminEditMode={adminEditMode}
                      // Funciones deshabilitadas para el buscador
                      onEdit={null}
                      onNavigate={null}
                      onUpdate={null}
                      territories={territories}
                    />
                    
                    {/* Overlay para indicar que es clickeable */}
                    <div className="absolute inset-0 bg-blue-600/0 hover:bg-blue-600/5 rounded-2xl transition-all pointer-events-none" />
                    
                    {/* Indicador de territorio */}
                    <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full shadow-sm">
                      <span className="text-xs font-medium text-gray-700">
                        📍 {address.territoryName}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer informativo */}
        {searchTerm && searchResults.length > 0 && (
          <div className="bg-white border-t px-4 py-3 flex-shrink-0">
            <div className="flex items-center justify-center">
              <div className="bg-blue-50 rounded-lg px-4 py-2">
                <p className="text-sm text-blue-700 font-medium">
                  <Icon name="info" size={16} className="inline mr-2" />
                  Toca cualquier tarjeta para ir directamente al territorio
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};

export default SearchModal; 