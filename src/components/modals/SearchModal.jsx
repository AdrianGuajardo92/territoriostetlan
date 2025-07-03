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
        ${isNavigatingLocal ? 'ring-4 ring-blue-500 ring-opacity-50 bg-blue-50/50 scale-[1.02] shadow-2xl' : ''}
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

  // Navegar al territorio y destacar la dirección - CORREGIDO
  const handleNavigateToAddress = useCallback((address) => {
    if (onNavigateToTerritory && address.territory) {
      // PRIMERO: Navegar al territorio directamente
      onNavigateToTerritory(address.territory, address.id);
      
      // SEGUNDO: Cerrar el modal SIN interferir con el historial
      setTimeout(() => {
        onClose();
      }, 50); // Delay mínimo para evitar conflictos de estado
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
      modalId={null} // Deshabilitar useModalHistory para evitar conflictos
    >
      <div className="h-full flex flex-col bg-gradient-to-br from-indigo-50 via-white to-blue-50">
        {/* Header del buscador con temática consistente */}
        <div className="shadow-lg px-4 py-6 flex-shrink-0" style={{ backgroundColor: '#2C3E50' }}>
          <div className="flex items-center gap-4">
            {/* Botón de volver - Flechita hacia atrás */}
            <button
              onClick={onClose}
              className="p-3 rounded-xl transition-colors group flex-shrink-0"
              style={{ backgroundColor: '#34495e' }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#3a526b'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#34495e'}
              title="Volver"
            >
              <Icon name="arrowLeft" size={24} className="text-white transition-colors" />
            </button>

            {/* Barra de búsqueda rediseñada */}
            <div className="flex-1 relative">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-4 pr-12 py-4 border-2 border-gray-300 rounded-2xl focus:ring-2 focus:ring-white focus:border-white text-lg placeholder-gray-400 bg-white shadow-lg transition-all"
                placeholder="Buscar dirección o nota..."
                autoFocus
              />
              
              {/* X siempre visible del lado derecho */}
              <button
                onClick={handleClearSearch}
                className="absolute right-4 top-1/2 transform -translate-y-1/2 p-2 rounded-full hover:bg-gray-100 transition-colors"
                title="Limpiar búsqueda"
              >
                <Icon name="x" size={18} className="text-gray-500" />
              </button>
            </div>
          </div>

          {/* Estadísticas de búsqueda */}
          {searchTerm && (
            <div className="mt-4 flex items-center justify-between">
              <p className="text-sm text-white/90 font-medium">
                {searchResults.length > 0 
                  ? `${searchResults.length} dirección${searchResults.length !== 1 ? 'es' : ''} encontrada${searchResults.length !== 1 ? 's' : ''}`
                  : 'No se encontraron direcciones'
                }
              </p>
              {searchResults.length > 0 && (
                <p className="text-xs text-white/70 font-medium">
                  Toca una tarjeta para ir al territorio
                </p>
              )}
            </div>
          )}
        </div>

        {/* Contenido principal */}
        <div className="flex-1 overflow-y-auto">
          {!searchTerm ? (
            // Estado inicial - sin búsqueda MEJORADO
            <div className="flex items-center justify-center h-full px-6">
              <div className="text-center max-w-md">
                <div className="w-32 h-32 mx-auto mb-8 bg-gradient-to-br from-blue-100 to-indigo-200 rounded-full flex items-center justify-center shadow-lg">
                  <i className="fas fa-home text-4xl text-blue-600"></i>
                </div>
                <h3 className="text-2xl font-bold text-slate-800 mb-4">
                  Buscar direcciones
                </h3>
                <p className="text-slate-600 mb-6 leading-relaxed">
                  Encuentra rápidamente cualquier dirección escribiendo el nombre de una calle o alguna nota específica.
                </p>
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-6 border border-blue-200 shadow-sm">
                  <h4 className="font-semibold text-blue-800 mb-3 flex items-center">
                    <i className="fas fa-lightbulb mr-2"></i>
                    Consejos de búsqueda:
                  </h4>
                  <ul className="text-sm text-blue-700 space-y-2 text-left">
                    <li className="flex items-center">
                      <i className="fas fa-check-circle mr-2 text-green-500"></i>
                      Busca sin preocuparte por los acentos
                    </li>
                    <li className="flex items-center">
                      <i className="fas fa-check-circle mr-2 text-green-500"></i>
                      Encuentra direcciones por notas
                    </li>
                    <li className="flex items-center">
                      <i className="fas fa-check-circle mr-2 text-green-500"></i>
                      Busca en todos los territorios
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          ) : searchResults.length === 0 ? (
            // Sin resultados MEJORADO
            <div className="flex items-center justify-center h-full px-4">
              <div className="text-center">
                <div className="w-24 h-24 mx-auto mb-6 bg-slate-100 rounded-full flex items-center justify-center">
                  <Icon name="searchX" size={36} className="text-slate-400" />
                </div>
                <h3 className="text-xl font-semibold text-slate-700 mb-3">
                  No se encontraron direcciones
                </h3>
                <p className="text-slate-500 mb-6">
                  No hay direcciones que coincidan con <span className="font-medium">"{searchTerm}"</span>
                </p>
                <button
                  onClick={handleClearSearch}
                  className="px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl hover:from-blue-600 hover:to-indigo-700 transition-all transform hover:scale-105 shadow-lg"
                >
                  Limpiar búsqueda
                </button>
              </div>
            </div>
          ) : (
            // Resultados encontrados - MEJORAR NAVEGACIÓN
            <div className="p-4 space-y-4">
              {searchResults.map((address) => (
                <div
                  key={address.id}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleNavigateToAddress(address);
                  }}
                >
                  <SearchAddressCard
                    address={address}
                    onClick={() => {}} // Función vacía para evitar doble click
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer informativo mejorado */}
        {searchTerm && searchResults.length > 0 && (
          <div className="bg-white/95 backdrop-blur-xl border-t border-indigo-100 px-4 py-4 flex-shrink-0">
            <div className="flex items-center justify-center">
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl px-6 py-3 border border-blue-200">
                <p className="text-sm text-blue-700 font-medium flex items-center">
                  <Icon name="info" size={16} className="mr-2" />
                  Toca cualquier tarjeta para navegar al territorio
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