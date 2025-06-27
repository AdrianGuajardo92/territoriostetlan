import React from 'react';
import Icon from '../common/Icon';

const TerritoryCard = ({ territory, onSelect }) => {
  const statusConfig = {
    'Disponible': {
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200',
      textColor: 'text-green-700',
      iconColor: 'text-green-500',
      hoverBg: 'hover:bg-green-100',
      shadowHover: 'hover:shadow-green-200/50'
    },
    'En uso': {
      bgColor: 'bg-yellow-50',
      borderColor: 'border-yellow-200',
      textColor: 'text-yellow-700',
      iconColor: 'text-yellow-500',
      hoverBg: 'hover:bg-yellow-100',
      shadowHover: 'hover:shadow-yellow-200/50'
    },
    'Terminado': {
      bgColor: 'bg-red-50',
      borderColor: 'border-red-200',
      textColor: 'text-red-700',
      iconColor: 'text-red-500',
      hoverBg: 'hover:bg-red-100',
      shadowHover: 'hover:shadow-red-200/50'
    }
  };

  const config = statusConfig[territory.status] || statusConfig['Disponible'];

  const getStatusIcon = (status) => {
    switch (status) {
      case 'Disponible':
        return 'mapPin';
      case 'En uso':
        return 'user';
      case 'Terminado':
        return 'check';
      default:
        return 'help';
    }
  };

  return (
    <div
      onClick={() => onSelect(territory)}
      className={`
        group relative overflow-hidden rounded-2xl border-2 p-6 
        transition-all duration-300 cursor-pointer
        ${config.bgColor} ${config.borderColor} ${config.hoverBg}
        shadow-md hover:shadow-xl hover:scale-[1.02] active:scale-[0.98]
        ${config.shadowHover}
      `}
    >
      {/* Efecto de gradiente en hover */}
      <div className="absolute inset-0 bg-gradient-to-br from-transparent to-black/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
      
      {/* Contenido de la tarjeta */}
      <div className="relative z-10">
        <div className="flex items-start justify-between mb-4">
          <h3 className="text-2xl font-bold text-gray-800 group-hover:text-gray-900 transition-colors">
            {territory.name}
          </h3>
          <div className={`p-2 rounded-lg ${config.bgColor} group-hover:scale-110 transition-transform`}>
            <Icon 
              name={getStatusIcon(territory.status)} 
              size={20} 
              className={config.iconColor}
            />
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Estado:</span>
            <span className={`font-semibold ${config.textColor}`}>
              {territory.status}
            </span>
          </div>

          {territory.status === 'En uso' && territory.assignedTo && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Asignado a:</span>
              <span className="font-medium text-gray-800 truncate max-w-[150px]">
                {territory.assignedTo}
              </span>
            </div>
          )}

          {territory.lastWorked && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Última vez:</span>
              <span className="text-sm text-gray-700">
                {new Date(territory.lastWorked.seconds * 1000).toLocaleDateString('es-MX')}
              </span>
            </div>
          )}
        </div>

        {/* Indicador visual del estado */}
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="flex items-center space-x-2">
            <div className={`w-3 h-3 rounded-full ${
              territory.status === 'Disponible' ? 'bg-green-500' :
              territory.status === 'En uso' ? 'bg-yellow-500 animate-pulse' :
              'bg-red-500'
            }`}></div>
            <span className="text-xs text-gray-500">
              {territory.status === 'Disponible' ? 'Listo para trabajar' :
               territory.status === 'En uso' ? 'En progreso' :
               'Completado'}
            </span>
          </div>
        </div>

        {/* Flecha indicadora */}
        <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-x-2 group-hover:translate-x-0">
          <Icon 
            name="arrowRight" 
            size={24} 
            className="text-gray-400"
          />
        </div>
      </div>
    </div>
  );
};

export default TerritoryCard; 