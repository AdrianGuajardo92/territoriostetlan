import React, { useState, useMemo, useCallback } from 'react';
import Modal from '../common/Modal';
import Icon from '../common/Icon';
import { useApp } from '../../context/AppContext';
import { smartSearch } from '../../utils/helpers';

// Componente específico para tarjetas de búsqueda
const SearchAddressCard = ({ address, onClick }) => {
  const [isNavigatingLocal, setIsNavigatingLocal] = useState(false);

  // Configuración de colores elegante y neutral
  const config = {
    bgGradient: 'from-slate-50 via-blue-50 to-indigo-50',
    borderColor: 'border-slate-200',
    hoverBorder: 'hover:border-blue-300',
    hoverShadow: 'hover:shadow-blue-100/50',
    accentColor: '#3b82f6', // blue-500
    iconColor: 'text-blue-600',
    iconBg: 'bg-blue-100',
    titleColor: 'text-slate-800',
    subtitleColor: 'text-slate-600',
    navButtons: 'bg-blue-50 border-blue-200',
    navActive: 'bg-blue-600 text-white hover:bg-blue-700'
  };

  // Componente para mostrar el icono de género
  const GenderTag = ({ gender }) => {
    const styleConfig = {
      'Hombre': { icon: 'fa-person', color: 'text-blue-600' },
      'Mujer': { icon: 'fa-person-dress', color: 'text-pink-600' },
      'Pareja': { icon: 'fa-user-group', color: 'text-purple-600' },
      'Desconocido': { icon: 'fa-ban', color: 'text-gray-500' }
    };
    const genderConfig = styleConfig[gender] || styleConfig['Desconocido'];
    return <i className={`fas ${genderConfig.icon} ${genderConfig.color} text-lg`}></i>;
  };

  // Componente para mostrar la distancia
  const DistanceTag = ({ distance }) => {
    if (distance == null || distance === Infinity) return null;
    const formattedDistance = distance < 1 ? `${Math.round(distance * 1000)} m` : `${distance.toFixed(1)} km`;
    return (
      <span className="ml-2 inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800">
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="mr-1.5">
          <polygon points="3 11 22 2 13 21 11 13 3 11"></polygon>
        </svg>
        {formattedDistance}
      </span>
    );
  };

  // Funciones de navegación
  const getNavigationUrl = (mode) => {
    let lat, lng;
    
    if (address.latitude && address.longitude) {
      lat = address.latitude;
      lng = address.longitude;
    } else if (address.coords && Array.isArray(address.coords) && address.coords.length >= 2) {
      [lat, lng] = address.coords;
    } else if (address.mapUrl && address.mapUrl.trim() !== '') {
      const mapUrlMatch = address.mapUrl.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
      if (mapUrlMatch) {
        lat = parseFloat(mapUrlMatch[1]);
        lng = parseFloat(mapUrlMatch[2]);
      }
    }
    
    if (lat && lng) {
      switch (mode) {
        case 'driving':
          return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving`;
        case 'walking':
          return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=walking`;
        case 'transit':
          return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=transit`;
        default:
          return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
      }
    }
    
    const encodedAddress = encodeURIComponent(address.address);
    switch (mode) {
      case 'driving':
        return `https://www.google.com/maps/dir/?api=1&destination=${encodedAddress}&travelmode=driving`;
      case 'walking':
        return `https://www.google.com/maps/dir/?api=1&destination=${encodedAddress}&travelmode=walking`;
      case 'transit':
        return `https://www.google.com/maps/dir/?api=1&destination=${encodedAddress}&travelmode=transit`;
      default:
        return `https://www.google.com/maps/search/?api=1&query=${encodedAddress}`;
    }
  };

  const handleNavClick = (e, url) => {
    e.stopPropagation(); // Evitar que se active el onClick del contenedor
    window.open(url, '_blank', 'noopener,noreferrer');
    setIsNavigatingLocal(true);
    setTimeout(() => setIsNavigatingLocal(false), 3000);
  };

  const drivingUrl = getNavigationUrl('driving');
  const walkingUrl = getNavigationUrl('walking');
  const transitUrl = getNavigationUrl('transit');

  return (
    <div 
      id={`address-card-${address.id}`}
      className={`
        group relative cursor-pointer
        bg-gradient-to-br ${config.bgGradient}
        border-2 ${config.borderColor} ${config.hoverBorder}
        rounded-2xl overflow-hidden
        shadow-lg ${config.hoverShadow}
        hover:shadow-2xl hover:scale-[1.02]
        transition-all duration-300 ease-out
        ${isNavigatingLocal ? 'ring-4 ring-blue-400 ring-opacity-75 animate-pulse scale-105' : ''}
      `}
      onClick={onClick}
    >
      {/* Encabezado elegante */}
      <div className="relative px-6 py-4 bg-white/70 backdrop-blur-sm border-b border-white/40">
        <div className="flex items-center justify-between gap-4">
          {/* Icono y dirección principal */}
          <div className="flex items-center space-x-4 flex-1 min-w-0">
            <div className={`${config.iconBg} p-3 rounded-xl shadow-sm backdrop-blur-sm border border-white/20`}>
              <i className={`fas fa-house text-xl ${config.iconColor}`}></i>
            </div>
            <div className="flex-1 min-w-0">
              <h3 className={`text-xl font-bold truncate ${config.titleColor}`}>
                {address.address}
              </h3>
              <div className="flex items-center space-x-2 mt-1">
                <GenderTag gender={address.gender} />
                <DistanceTag distance={address.distance} />
                {/* Territorio integrado elegantemente */}
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">
                  <i className="fas fa-map mr-1.5"></i>
                  {address.territoryName}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Contenido principal */}
      <div className="px-6 py-5 space-y-4">
        {/* Badges de estado especial */}
        {(address.isRevisita || address.isEstudio) && (
          <div className="flex gap-2 flex-wrap">
            {address.isRevisita && address.revisitaBy && (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-purple-100 text-purple-800 border border-purple-200">
                <i className="fas fa-bookmark mr-1.5"></i>
                Revisita: {address.revisitaBy}
              </span>
            )}
            {address.isEstudio && address.estudioBy && (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-indigo-100 text-indigo-800 border border-indigo-200">
                <i className="fas fa-book-open mr-1.5"></i>
                Estudio: {address.estudioBy}
              </span>
            )}
          </div>
        )}

        {/* Notas si existen */}
        {address.notes && (
          <div className="flex items-start p-4 bg-amber-50 rounded-xl border border-amber-200">
            <i className="fas fa-info-circle text-amber-500 mr-3 mt-0.5 flex-shrink-0"></i>
            <p className="text-amber-800 text-sm italic flex-1">{address.notes}</p>
          </div>
        )}

        {/* Referencia si existe */}
        {address.referencia && (
          <div className="flex items-start p-3 bg-slate-50 rounded-lg border border-slate-200">
            <i className="fas fa-map-pin text-slate-500 mr-2 mt-0.5 flex-shrink-0 text-sm"></i>
            <p className="text-slate-700 text-sm">{address.referencia}</p>
          </div>
        )}

        {/* Navegación con Google Maps */}
        <div className="flex items-center justify-center">
          <div className={`flex items-center rounded-xl p-2 ${config.navButtons} border shadow-sm backdrop-blur-sm`}>
            <button
              onClick={(e) => handleNavClick(e, drivingUrl)}
              className={`px-4 py-2 rounded-lg ${config.navActive} transition-all transform hover:scale-105 shadow-sm`}
              title="Navegar en coche"
            >
              <i className="fas fa-car text-lg"></i>
            </button>
            <div className="w-px h-5 mx-2 bg-blue-300"></div>
            <button
              onClick={(e) => handleNavClick(e, walkingUrl)}
              className={`px-4 py-2 rounded-lg ${config.navActive} transition-all transform hover:scale-105 shadow-sm`}
              title="Navegar a pie"
            >
              <i className="fas fa-person-walking text-lg"></i>
            </button>
            <div className="w-px h-5 mx-2 bg-blue-300"></div>
            <button
              onClick={(e) => handleNavClick(e, transitUrl)}
              className={`px-4 py-2 rounded-lg ${config.navActive} transition-all transform hover:scale-105 shadow-sm`}
              title="Navegar en transporte público"
            >
              <i className="fas fa-bus text-lg"></i>
            </button>
          </div>
        </div>
      </div>

      {/* Barra de acento inferior elegante */}
      <div 
        className="h-1 w-full bg-gradient-to-r opacity-75 group-hover:opacity-100 transition-opacity"
        style={{
          backgroundImage: `linear-gradient(to right, ${config.accentColor}, ${config.accentColor}dd)`
        }}
      />

      {/* Overlay sutil para click */}
      <div className="absolute inset-0 bg-blue-600/0 hover:bg-blue-600/5 rounded-2xl transition-all pointer-events-none" />
    </div>
  );
};

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
      <div className="h-full flex flex-col bg-gradient-to-br from-slate-50 to-blue-50">
        {/* Header del buscador */}
        <div className="bg-white/90 backdrop-blur-md shadow-sm border-b border-white/40 px-4 py-4 flex-shrink-0">
          <div className="flex items-center gap-4">
            {/* Botón cerrar */}
            <button
              onClick={onClose}
              className="p-2 rounded-full hover:bg-slate-100 transition-colors"
              title="Cerrar búsqueda"
            >
              <Icon name="x" size={24} className="text-slate-600" />
            </button>

            {/* Barra de búsqueda */}
            <div className="flex-1 relative">
              <Icon 
                name="search" 
                size={20} 
                className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400" 
              />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-12 py-4 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg placeholder-slate-500 bg-white/80 backdrop-blur-sm"
                placeholder="Buscar dirección o nota..."
                autoFocus
              />
              {searchTerm && (
                <button
                  onClick={handleClearSearch}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 p-1 rounded-full hover:bg-slate-100 transition-colors"
                  title="Limpiar búsqueda"
                >
                  <Icon name="x" size={18} className="text-slate-500" />
                </button>
              )}
            </div>
          </div>

          {/* Estadísticas de búsqueda */}
          {searchTerm && (
            <div className="mt-3 flex items-center justify-between">
              <p className="text-sm text-slate-600">
                {searchResults.length > 0 
                  ? `${searchResults.length} dirección${searchResults.length !== 1 ? 'es' : ''} encontrada${searchResults.length !== 1 ? 's' : ''}`
                  : 'No se encontraron direcciones'
                }
              </p>
              {searchResults.length > 0 && (
                <p className="text-xs text-slate-500">
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
                <h3 className="text-xl font-semibold text-slate-800 mb-3">
                  Buscar en todos los territorios
                </h3>
                <p className="text-slate-600 mb-4">
                  Escribe el nombre de una calle, dirección o alguna nota para encontrar rápidamente la dirección que buscas.
                </p>
                <div className="bg-blue-50 rounded-lg p-4 text-left border border-blue-200">
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
                <div className="w-20 h-20 mx-auto mb-4 bg-slate-100 rounded-full flex items-center justify-center">
                  <Icon name="searchX" size={32} className="text-slate-400" />
                </div>
                <h3 className="text-lg font-medium text-slate-700 mb-2">
                  No se encontraron direcciones
                </h3>
                <p className="text-slate-500 mb-4">
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
              {searchResults.map((address) => (
                <SearchAddressCard
                  key={address.id}
                  address={address}
                  onClick={() => handleNavigateToAddress(address)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Footer informativo */}
        {searchTerm && searchResults.length > 0 && (
          <div className="bg-white/90 backdrop-blur-md border-t border-white/40 px-4 py-3 flex-shrink-0">
            <div className="flex items-center justify-center">
              <div className="bg-blue-50 rounded-lg px-4 py-2 border border-blue-200">
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