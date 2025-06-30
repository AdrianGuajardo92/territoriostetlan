import React, { memo, useMemo, useCallback } from 'react';
import Icon from '../common/Icon';
import { formatRelativeTime } from '../../utils/helpers';

// OPTIMIZACIÓN FASE 2: TerritoryCard memoizada para evitar re-renders ⚡
const TerritoryCard = memo(({ territory, onSelect }) => {
  // OPTIMIZACIÓN: Memoizar normalización de estado ⚡
  const normalizedStatus = useMemo(() => 
    territory.status === 'Terminado' ? 'Completado' : territory.status, 
    [territory.status]
  );
  
  // OPTIMIZACIÓN: Memoizar configuración de estado (estático) ⚡
  const statusConfig = useMemo(() => ({
    'Disponible': {
      // Colores principales
      bgGradient: 'from-emerald-50 to-green-50',
      borderColor: 'border-emerald-300',
      accentColor: '#10b981', // emerald-500
      statusBg: 'bg-emerald-100',
      statusText: 'text-emerald-700',
      statusDot: 'bg-emerald-500',
      // Badge para nombres
      badgeBg: 'bg-emerald-500',
      badgeText: 'text-white',
      // Badge de direcciones
      addressBadgeBg: 'bg-emerald-100/90',
      addressBadgeIcon: 'text-emerald-600',
      addressBadgeText: 'text-emerald-700',
      // Hover
      hoverBorder: 'hover:border-emerald-400',
      hoverShadow: 'hover:shadow-emerald-200/30',
      // Icono principal
      mainIcon: 'mapPin',
      iconBg: 'bg-emerald-100',
      iconColor: 'text-emerald-600'
    },
    'En uso': {
      bgGradient: 'from-amber-50 to-yellow-50',
      borderColor: 'border-amber-300',
      accentColor: '#f59e0b', // amber-500
      statusBg: 'bg-amber-100',
      statusText: 'text-amber-700',
      statusDot: 'bg-amber-500',
      badgeBg: 'bg-amber-500',
      badgeText: 'text-white',
      // Badge de direcciones
      addressBadgeBg: 'bg-amber-100/90',
      addressBadgeIcon: 'text-amber-600',
      addressBadgeText: 'text-amber-700',
      hoverBorder: 'hover:border-amber-400',
      hoverShadow: 'hover:shadow-amber-200/30',
      mainIcon: 'clock',
      iconBg: 'bg-amber-100',
      iconColor: 'text-amber-600'
    },
    'Completado': {
      bgGradient: 'from-rose-50 to-pink-50',
      borderColor: 'border-rose-300',
      accentColor: '#f43f5e', // rose-500
      statusBg: 'bg-rose-100',
      statusText: 'text-rose-700',
      statusDot: 'bg-rose-500',
      badgeBg: 'bg-rose-500',
      badgeText: 'text-white',
      // Badge de direcciones
      addressBadgeBg: 'bg-rose-100/90',
      addressBadgeIcon: 'text-rose-600',
      addressBadgeText: 'text-rose-700',
      hoverBorder: 'hover:border-rose-400',
      hoverShadow: 'hover:shadow-rose-200/30',
      mainIcon: 'checkCircle',
      iconBg: 'bg-rose-100',
      iconColor: 'text-rose-600'
    }
  }), []); // Configuración estática, sin dependencias

  // OPTIMIZACIÓN: Memoizar configuración actual ⚡
  const config = useMemo(() => 
    statusConfig[normalizedStatus] || statusConfig['Disponible'], 
    [statusConfig, normalizedStatus]
  );

  // OPTIMIZACIÓN: Memoizar persona responsable ⚡
  const responsiblePerson = useMemo(() => {
    if (normalizedStatus === 'Completado') {
      return territory.completedBy || territory.terminadoPor || territory.assignedTo || 'No especificado';
    } else if (normalizedStatus === 'En uso') {
      return territory.assignedTo;
    }
    return null;
  }, [normalizedStatus, territory.completedBy, territory.terminadoPor, territory.assignedTo]);

  // OPTIMIZACIÓN: Memoizar fecha relevante ⚡
  const relevantDate = useMemo(() => {
    if (normalizedStatus === 'Completado') {
      return territory.completedDate || territory.terminadoDate || territory.lastWorked;
    } else if (normalizedStatus === 'En uso') {
      return territory.assignedDate;
    }
    return territory.lastWorked;
  }, [normalizedStatus, territory.completedDate, territory.terminadoDate, territory.lastWorked, territory.assignedDate]);

  // OPTIMIZACIÓN: Memoizar handler de click ⚡
  const handleClick = useCallback(() => {
    onSelect(territory);
  }, [onSelect, territory]);

  return (
    <div
      onClick={handleClick}
      className={`
        relative group cursor-pointer
        bg-gradient-to-br ${config.bgGradient}
        border-2 ${config.borderColor} ${config.hoverBorder}
        rounded-2xl overflow-hidden
        shadow-lg ${config.hoverShadow}
        hover:shadow-2xl hover:scale-[1.01] 
        active:scale-[0.99]
        transition-all duration-300 ease-out
        touch-feedback btn-premium animate-premium-fade-scale micro-interact glow-effect
        p-0
      `}
    >
      {/* Encabezado con gradiente */}
      <div className="relative px-4 py-3 bg-white/60 backdrop-blur-sm border-b border-gray-100">
        <div className="flex items-center justify-between gap-2">
          {/* Nombre del territorio con icono */}
          <div className="flex items-center space-x-3 flex-1 min-w-0">
            <div className={`${config.iconBg} p-2 rounded-xl shadow-sm group-hover:shadow-md transition-shadow`}>
              <Icon 
                name={config.mainIcon} 
                size={20} 
                className={config.iconColor}
              />
            </div>
            <h3 className="text-lg font-bold text-gray-800 truncate flex-1">
              {territory.name}
            </h3>
          </div>
          
          {/* Badge de direcciones */}
          {territory.addressCount !== undefined && territory.addressCount > 0 && (
            <div className={`${config.addressBadgeBg} px-2.5 py-1 rounded-full flex items-center space-x-1 shadow-sm`}>
              <Icon 
                name="home" 
                size={14} 
                className={config.addressBadgeIcon}
              />
              <span className={`text-xs font-medium ${config.addressBadgeText}`}>
                {territory.addressCount}
              </span>
            </div>
          )}
          
          {/* Estado badge compacto */}
          <div className={`${config.statusBg} px-3 py-1 rounded-full flex items-center space-x-1.5 shadow-sm`}>
            <div className={`w-2 h-2 rounded-full ${config.statusDot} ${normalizedStatus === 'En uso' ? 'animate-pulse' : ''}`}></div>
            <span className={`text-xs font-medium ${config.statusText}`}>
              {normalizedStatus === 'En uso' ? 'Predicando' : normalizedStatus}
            </span>
          </div>
        </div>
      </div>

      {/* Contenido principal */}
      <div className="px-4 py-3 space-y-2">
        {/* Persona responsable */}
        {responsiblePerson && (
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 flex-1 min-w-0">
              <Icon 
                name="user" 
                size={16} 
                className="text-gray-400 flex-shrink-0"
              />
              <span className="text-sm text-gray-600 truncate">
                {normalizedStatus === 'Completado' ? 'Completado por' : 'Asignado a'}:
              </span>
            </div>
            <span className={`${config.badgeBg} ${config.badgeText} px-3 py-1 rounded-full text-sm font-medium ml-2 shadow-sm`}>
              {responsiblePerson}
            </span>
          </div>
        )}

        {/* Fecha relevante - SOLO para territorios NO disponibles */}
        {relevantDate && normalizedStatus !== 'Disponible' && (
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Icon 
                name="calendar" 
                size={16} 
                className="text-gray-400"
              />
              <span className="text-sm text-gray-600">
                {normalizedStatus === 'Completado' ? 'Completado' : 
                 normalizedStatus === 'En uso' ? 'Asignado' : 
                 'Última vez'}:
              </span>
            </div>
            <span className="text-sm font-medium text-gray-700">
              {formatRelativeTime(relevantDate)}
            </span>
          </div>
        )}



        {/* Call to action para territorio disponible - TODOS los disponibles */}
        {normalizedStatus === 'Disponible' && (
          <div className="pt-2 mt-2 border-t border-gray-100">
            <p className="text-xs text-center text-emerald-600 font-medium">
              ¡Listo para asignar!
            </p>
          </div>
        )}
      </div>

      {/* Barra de acento inferior con animación */}
      <div 
        className="h-1 w-full bg-gradient-to-r opacity-75 group-hover:opacity-100 transition-opacity"
        style={{
          backgroundImage: `linear-gradient(to right, ${config.accentColor}, ${config.accentColor}dd)`
        }}
      />

      {/* Overlay sutil en hover */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

      {/* Icono de flecha en hover (más sutil) */}
      <div className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-70 transition-all duration-300 transform translate-x-2 group-hover:translate-x-0">
        <div className="bg-white/90 backdrop-blur-sm rounded-full p-1.5 shadow-md">
          <Icon 
            name="chevronRight" 
            size={16} 
            className="text-gray-600"
          />
        </div>
      </div>
    </div>
  );
});

// OPTIMIZACIÓN: Display name para React DevTools ⚡
TerritoryCard.displayName = 'TerritoryCard';

export default TerritoryCard; 