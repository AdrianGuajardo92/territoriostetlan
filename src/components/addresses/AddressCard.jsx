import React, { useState } from 'react';
import Icon from '../common/Icon';

const AddressCard = ({
  address,
  viewMode,
  isAdmin,
  isAssignedToMe,
  onEdit,
  onNavigate,
  isNavigating,
  onUpdate,
  showToast
}) => {
  const [isUpdating, setIsUpdating] = useState(false);

  const handleToggleVisited = async () => {
    if (!isAdmin && !isAssignedToMe) return;
    
    setIsUpdating(true);
    try {
      await onUpdate(address.id, { isVisited: !address.isVisited });
      showToast(
        address.isVisited ? 'Marcada como no visitada' : 'Marcada como visitada',
        'success'
      );
    } catch (error) {
      showToast('Error al actualizar', 'error');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleNavigate = () => {
    if (address.mapUrl) {
      window.open(address.mapUrl, '_blank');
      onNavigate();
    } else {
      showToast('No hay ubicación disponible', 'warning');
    }
  };

  const getStatusColor = () => {
    if (address.isVisited) return 'bg-green-100 border-green-300';
    if (address.isRevisita) return 'bg-yellow-100 border-yellow-300';
    if (address.isEstudio) return 'bg-blue-100 border-blue-300';
    return 'bg-white border-gray-200';
  };

  const getStatusIcon = () => {
    if (address.isVisited) return { name: 'check', color: 'text-green-600' };
    if (address.isRevisita) return { name: 'refresh', color: 'text-yellow-600' };
    if (address.isEstudio) return { name: 'book', color: 'text-blue-600' };
    return { name: 'home', color: 'text-gray-400' };
  };

  const statusIcon = getStatusIcon();

  if (viewMode === 'list') {
    return (
      <div className={`
        flex items-center p-3 rounded-lg border transition-all
        ${getStatusColor()}
        ${isNavigating ? 'ring-4 ring-blue-400 animate-pulse' : ''}
        ${(isAdmin || isAssignedToMe) ? 'hover:shadow-md cursor-pointer' : ''}
      `}>
        <button
          onClick={handleToggleVisited}
          disabled={!isAdmin && !isAssignedToMe || isUpdating}
          className={`
            mr-3 p-2 rounded-lg transition-all
            ${address.isVisited 
              ? 'bg-green-500 text-white' 
              : 'bg-gray-200 text-gray-500 hover:bg-gray-300'
            }
            ${(!isAdmin && !isAssignedToMe) ? 'cursor-not-allowed opacity-50' : ''}
          `}
        >
          <Icon name="check" size={16} />
        </button>

        <div className="flex-1 min-w-0">
          <p className="font-medium text-gray-900 truncate">{address.address}</p>
          <div className="flex items-center space-x-4 text-xs text-gray-500">
            {address.referencia && (
              <span className="truncate">{address.referencia}</span>
            )}
            {address.phone && (
              <span className="flex items-center">
                <Icon name="phone" size={12} className="mr-1" />
                {address.phone}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center space-x-2 ml-2">
          {address.mapUrl && (
            <button
              onClick={handleNavigate}
              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              title="Navegar"
            >
              <Icon name="navigation" size={16} />
            </button>
          )}
          {(isAdmin || isAssignedToMe) && (
            <button
              onClick={onEdit}
              className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              title="Editar"
            >
              <Icon name="edit" size={16} />
            </button>
          )}
        </div>
      </div>
    );
  }

  // Vista de tarjeta (grid)
  return (
    <div className={`
      relative overflow-hidden rounded-xl border-2 p-4 transition-all
      ${getStatusColor()}
      ${isNavigating ? 'ring-4 ring-blue-400 animate-pulse shadow-xl' : 'shadow-sm hover:shadow-lg'}
      ${(isAdmin || isAssignedToMe) ? 'cursor-pointer' : ''}
    `}>
      {/* Indicador de ruta optimizada */}
      {address.routeOrder && (
        <div className="absolute top-2 left-2 w-8 h-8 bg-red-500 text-white rounded-full flex items-center justify-center font-bold text-sm shadow-lg">
          {address.routeOrder}
        </div>
      )}

      {/* Header de la tarjeta */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0 pr-2">
          <h3 className="font-semibold text-gray-900 text-base leading-tight">
            {address.address}
          </h3>
          {address.referencia && (
            <p className="text-sm text-gray-600 mt-1">{address.referencia}</p>
          )}
        </div>
        <Icon 
          name={statusIcon.name} 
          size={24} 
          className={`flex-shrink-0 ${statusIcon.color}`} 
        />
      </div>

      {/* Información de contacto */}
      <div className="space-y-2 mb-3">
        {address.phone && (
          <div className="flex items-center text-sm text-gray-600">
            <Icon name="phone" size={14} className="mr-2 text-gray-400" />
            <span>{address.phone}</span>
          </div>
        )}
        {address.notes && (
          <div className="flex items-start text-sm text-gray-600">
            <Icon name="messageSquare" size={14} className="mr-2 mt-0.5 text-gray-400 flex-shrink-0" />
            <span className="line-clamp-2">{address.notes}</span>
          </div>
        )}
      </div>

      {/* Estados especiales */}
      <div className="flex flex-wrap gap-2 mb-3">
        {address.isRevisita && (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-200 text-yellow-800">
            <Icon name="refresh" size={12} className="mr-1" />
            Revisita{address.revisitaBy && `: ${address.revisitaBy}`}
          </span>
        )}
        {address.isEstudio && (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-200 text-blue-800">
            <Icon name="book" size={12} className="mr-1" />
            Estudio{address.estudioBy && `: ${address.estudioBy}`}
          </span>
        )}
        {address.isPhoneOnly && (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-200 text-purple-800">
            <Icon name="phone" size={12} className="mr-1" />
            Solo teléfono
          </span>
        )}
      </div>

      {/* Acciones */}
      <div className="flex items-center justify-between pt-3 border-t border-gray-200">
        <button
          onClick={handleToggleVisited}
          disabled={(!isAdmin && !isAssignedToMe) || isUpdating}
          className={`
            flex items-center px-3 py-1.5 rounded-lg text-sm font-medium transition-all
            ${address.isVisited 
              ? 'bg-green-500 text-white hover:bg-green-600' 
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }
            ${(!isAdmin && !isAssignedToMe) ? 'cursor-not-allowed opacity-50' : ''}
            ${isUpdating ? 'opacity-50' : ''}
          `}
        >
          <Icon name="check" size={14} className="mr-1.5" />
          {address.isVisited ? 'Visitada' : 'Marcar visitada'}
        </button>

        <div className="flex items-center space-x-2">
          {address.mapUrl && (
            <button
              onClick={handleNavigate}
              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              title="Navegar a dirección"
            >
              <Icon name="navigation" size={18} />
            </button>
          )}
          {(isAdmin || isAssignedToMe) && (
            <button
              onClick={onEdit}
              className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              title="Editar dirección"
            >
              <Icon name="edit" size={18} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default AddressCard; 