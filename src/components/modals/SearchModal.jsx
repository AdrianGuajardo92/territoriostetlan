import React, { useState, useMemo } from 'react';
import Modal from '../common/Modal';
import Icon from '../common/Icon';
import { useApp } from '../../context/AppContext';

const SearchModal = ({ isOpen, onClose }) => {
  const { territories, addresses } = useApp();
  const [searchTerm, setSearchTerm] = useState('');
  const [searchType, setSearchType] = useState('all'); // all, territories, addresses

  // Realizar búsqueda
  const searchResults = useMemo(() => {
    if (!searchTerm.trim()) return { territories: [], addresses: [] };

    const term = searchTerm.toLowerCase();
    
    const matchedTerritories = searchType !== 'addresses' 
      ? territories.filter(t => 
          t.name.toLowerCase().includes(term) ||
          t.status.toLowerCase().includes(term) ||
          (t.assignedTo && t.assignedTo.toLowerCase().includes(term))
        )
      : [];

    const matchedAddresses = searchType !== 'territories'
      ? addresses.filter(a => 
          a.address.toLowerCase().includes(term) ||
          (a.referencia && a.referencia.toLowerCase().includes(term)) ||
          (a.phone && a.phone.includes(term)) ||
          (a.name && a.name.toLowerCase().includes(term)) ||
          (a.notes && a.notes.toLowerCase().includes(term))
        ).map(addr => ({
          ...addr,
          territory: territories.find(t => t.id === addr.territoryId)
        }))
      : [];

    return { territories: matchedTerritories, addresses: matchedAddresses };
  }, [searchTerm, searchType, territories, addresses]);

  const totalResults = searchResults.territories.length + searchResults.addresses.length;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Buscar en Territorios"
      size="lg"
    >
      <div className="p-6">
        {/* Barra de búsqueda */}
        <div className="mb-6">
          <div className="relative">
            <Icon 
              name="search" 
              size={20} 
              className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" 
            />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-lg"
              placeholder="Buscar dirección, teléfono, nombre..."
              autoFocus
            />
          </div>

          {/* Filtros de tipo */}
          <div className="flex items-center space-x-4 mt-4">
            <label className="flex items-center">
              <input
                type="radio"
                name="searchType"
                value="all"
                checked={searchType === 'all'}
                onChange={(e) => setSearchType(e.target.value)}
                className="w-4 h-4 text-purple-600 border-gray-300 focus:ring-purple-500"
              />
              <span className="ml-2 text-sm text-gray-700">Todos</span>
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                name="searchType"
                value="territories"
                checked={searchType === 'territories'}
                onChange={(e) => setSearchType(e.target.value)}
                className="w-4 h-4 text-purple-600 border-gray-300 focus:ring-purple-500"
              />
              <span className="ml-2 text-sm text-gray-700">Solo territorios</span>
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                name="searchType"
                value="addresses"
                checked={searchType === 'addresses'}
                onChange={(e) => setSearchType(e.target.value)}
                className="w-4 h-4 text-purple-600 border-gray-300 focus:ring-purple-500"
              />
              <span className="ml-2 text-sm text-gray-700">Solo direcciones</span>
            </label>
          </div>
        </div>

        {/* Resultados */}
        <div className="max-h-96 overflow-y-auto">
          {searchTerm && totalResults === 0 ? (
            <div className="text-center py-12">
              <Icon name="searchX" size={48} className="mx-auto mb-4 text-gray-300" />
              <p className="text-gray-500">No se encontraron resultados para "{searchTerm}"</p>
            </div>
          ) : (
            <>
              {/* Territorios encontrados */}
              {searchResults.territories.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center">
                    <Icon name="map" size={16} className="mr-2" />
                    Territorios ({searchResults.territories.length})
                  </h3>
                  <div className="space-y-2">
                    {searchResults.territories.map(territory => (
                      <div
                        key={territory.id}
                        className="p-3 bg-purple-50 border border-purple-200 rounded-lg hover:bg-purple-100 transition-colors cursor-pointer"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-medium text-gray-900">{territory.name}</h4>
                            <p className="text-sm text-gray-600">
                              Estado: {territory.status}
                              {territory.assignedTo && ` • Asignado a: ${territory.assignedTo}`}
                            </p>
                          </div>
                          <Icon name="chevronRight" size={20} className="text-gray-400" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Direcciones encontradas */}
              {searchResults.addresses.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center">
                    <Icon name="home" size={16} className="mr-2" />
                    Direcciones ({searchResults.addresses.length})
                  </h3>
                  <div className="space-y-2">
                    {searchResults.addresses.map(address => (
                      <div
                        key={address.id}
                        className="p-3 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors cursor-pointer"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h4 className="font-medium text-gray-900">{address.address}</h4>
                            {address.referencia && (
                              <p className="text-sm text-gray-600">{address.referencia}</p>
                            )}
                            <p className="text-xs text-gray-500 mt-1">
                              Territorio: {address.territory?.name || 'Desconocido'}
                            </p>
                          </div>
                          <div className="flex items-center space-x-2">
                            {address.isVisited && (
                              <span className="text-green-600">
                                <Icon name="checkCircle" size={16} />
                              </span>
                            )}
                            <Icon name="chevronRight" size={20} className="text-gray-400" />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer con estadísticas */}
        {searchTerm && totalResults > 0 && (
          <div className="mt-6 pt-4 border-t border-gray-200 text-center">
            <p className="text-sm text-gray-600">
              {totalResults} resultado{totalResults !== 1 ? 's' : ''} encontrado{totalResults !== 1 ? 's' : ''}
            </p>
          </div>
        )}
      </div>
    </Modal>
  );
};

export default SearchModal; 