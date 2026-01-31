import React, { memo, useMemo, useCallback } from 'react';
import Icon from '../common/Icon';
import { formatRelativeTime } from '../../utils/helpers';

// 🔄 PASO 9: Funciones helper para asignaciones múltiples
const normalizeAssignedTo = (assignedTo) => {
  if (!assignedTo) return [];
  if (Array.isArray(assignedTo)) return assignedTo;
  return [assignedTo];
};

const getAssignedNames = (assignedTo) => {
  const normalized = normalizeAssignedTo(assignedTo);
  return normalized.filter(name => name && name.trim() !== '');
};

const formatTeamNames = (names, isMobile = false) => {
  if (names.length === 0) return '';
  if (names.length === 1) return names[0];
  
  // 🔄 MEJORA: Lógica de abreviación inteligente
  if (names.length === 2) {
    // Para 2 personas: Nombre + inicial del apellido (ej: "Adrian G. y Fabiola G.")
    const abbreviatedNames = names.map(name => {
      const parts = name.trim().split(' ');
      if (parts.length >= 2) {
        const firstName = parts[0];
        const lastNameInitial = parts[1].charAt(0).toUpperCase();
        return `${firstName} ${lastNameInitial}.`;
      }
      return parts[0]; // Si solo tiene un nombre
    });
    return `${abbreviatedNames[0]} y ${abbreviatedNames[1]}`;
  }
  
  // Para 3+ personas: usar abreviación (solo primeros nombres)
  if (names.length >= 3) {
    const firstNames = names.map(name => name.split(' ')[0]); // Solo primeros nombres
    return `${firstNames.slice(0, -1).join(', ')} y ${firstNames[firstNames.length - 1]}`;
  }
  
  // Fallback (no debería llegar aquí)
  return names.join(', ');
};

// Helper para extraer el número del territorio
const extractTerritoryNumber = (name) => {
  if (!name) return '?';
  // Buscar números en el nombre (ej: "Territorio 6" → "6", "T-14" → "14")
  const match = name.match(/\d+/);
  return match ? match[0] : name.charAt(0).toUpperCase();
};

// OPTIMIZACIÓN FASE 2: TerritoryCard memoizada para evitar re-renders ⚡
const TerritoryCard = memo(({ territory, onSelect }) => {
  // 🔄 PASO 15: Memoizar detectores de estado para evitar recálculos
  const isMobile = useMemo(() => {
    return window.innerWidth < 640; // sm breakpoint
  }, []); // Solo calcular una vez, no depender de window resize

  // OPTIMIZACIÓN: Memoizar normalización de estado ⚡
  const normalizedStatus = useMemo(() => 
    territory.status === 'Terminado' ? 'Completado' : 
    territory.status === 'Available' ? 'Disponible' : 
    territory.status, 
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

  // 🔄 PASO 15: Memoizar persona responsable con soporte para equipos ⚡
  const responsibleInfo = useMemo(() => {
    let assignedTo = null;
    let isTeam = false;
    
    // ✅ CORREGIDO: Para territorios completados, usar assignedTo (todo el equipo)
    // Si assignedTo es null/undefined (territorios completados antes del cambio), usar completedBy como fallback
    if (normalizedStatus === 'Completado') {
      if (territory.assignedTo && territory.assignedTo !== null) {
        assignedTo = territory.assignedTo; // Usar equipo completo (territorios nuevos)
      } else {
        assignedTo = territory.completedBy || territory.terminadoPor || 'No especificado'; // Fallback para territorios antiguos
      }
    } else if (normalizedStatus === 'En uso') {
      assignedTo = territory.assignedTo;
    }
    
    if (assignedTo) {
      const names = getAssignedNames(assignedTo);
      isTeam = names.length > 1;
      return {
        displayName: formatTeamNames(names, isMobile),
        fullDisplayName: formatTeamNames(names, false), // Siempre formato completo para tooltip
        names: names,
        isTeam: isTeam,
        count: names.length
      };
    }
    
    return null;
  }, [normalizedStatus, territory.completedBy, territory.terminadoPor, territory.assignedTo, isMobile]);

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
      `}
    >
      {/* Layout de dos columnas */}
      <div className="flex">
        {/* Columna izquierda - Número del territorio */}
        <div className={`${config.iconBg} flex items-center justify-center px-4 py-4 min-w-[70px]`}>
          <span className={`text-3xl font-bold ${config.iconColor}`}>
            {extractTerritoryNumber(territory.name)}
          </span>
        </div>

        {/* Columna derecha - Contenido */}
        <div className="flex-1 flex flex-col">
          {/* Header con badges */}
          <div className="px-3 py-2 bg-white/40 border-b border-gray-100/50">
            <div className="flex items-center justify-between gap-2">
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

              {/* Estado badge */}
              <div className={`${config.statusBg} px-3 py-1 rounded-full flex items-center space-x-1.5 shadow-sm ml-auto`}>
                <div className={`w-2 h-2 rounded-full ${config.statusDot} ${normalizedStatus === 'En uso' ? 'animate-pulse' : ''}`}></div>
                <span className={`text-xs font-medium ${config.statusText}`}>
                  {normalizedStatus === 'En uso' ? 'Predicando' : normalizedStatus}
                </span>
              </div>
            </div>
          </div>

          {/* Contenido principal */}
          <div className="px-3 py-2 space-y-1.5 flex-1">
            {/* Persona responsable */}
            {responsibleInfo && (
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-1.5 min-w-0">
                  <Icon
                    name="user"
                    size={14}
                    className="text-gray-400 flex-shrink-0"
                  />
                  <span className="text-xs text-gray-500">
                    {normalizedStatus === 'Completado' ? 'Por' : 'Asignado'}:
                  </span>
                </div>

                <span
                  className={`${config.badgeBg} ${config.badgeText} px-2.5 py-0.5 rounded-full text-xs font-medium shadow-sm truncate max-w-[140px]`}
                  title={responsibleInfo.isTeam && isMobile ? responsibleInfo.fullDisplayName : undefined}
                >
                  {responsibleInfo.displayName}
                </span>
              </div>
            )}

            {/* Fecha relevante */}
            {relevantDate && normalizedStatus !== 'Disponible' && (
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-1.5">
                  <Icon
                    name="calendar"
                    size={14}
                    className="text-gray-400"
                  />
                  <span className="text-xs text-gray-500">
                    {normalizedStatus === 'Completado' ? 'Fecha' : 'Desde'}:
                  </span>
                </div>
                <span className="text-xs font-medium text-gray-600">
                  {formatRelativeTime(relevantDate)}
                </span>
              </div>
            )}

            {/* Call to action para territorio disponible */}
            {normalizedStatus === 'Disponible' && (
              <div className="pt-1">
                <p className="text-xs text-center text-emerald-600 font-medium">
                  ¡Listo para asignar!
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Barra de acento inferior */}
      <div
        className="h-1 w-full bg-gradient-to-r opacity-75 group-hover:opacity-100 transition-opacity"
        style={{
          backgroundImage: `linear-gradient(to right, ${config.accentColor}, ${config.accentColor}dd)`
        }}
      />

      {/* Overlay sutil en hover */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

      {/* Icono de flecha en hover */}
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