import React, { memo, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { useToast } from '../../hooks/useToast';
import Icon from '../common/Icon';

// 🔄 PASO 12: Funciones helper para asignaciones múltiples
const normalizeAssignedTo = (assignedTo) => {
  if (!assignedTo) return [];
  if (Array.isArray(assignedTo)) return assignedTo;
  return [assignedTo];
};

const getAssignedNames = (assignedTo) => {
  const normalized = normalizeAssignedTo(assignedTo);
  return normalized.filter(name => name && name.trim() !== '');
};

const isUserAssigned = (assignedTo, userName) => {
  if (!userName) return false;
  const names = getAssignedNames(assignedTo);
  return names.includes(userName);
};

const formatTeamNames = (names, isMobile = false) => {
  if (names.length === 0) return '';
  if (names.length === 1) return names[0];
  
  if (isMobile && names.length > 1) {
    const firstNames = names.map(name => name.split(' ')[0]);
    if (firstNames.length === 2) return `${firstNames[0]} y ${firstNames[1]}`;
    return `${firstNames.slice(0, -1).join(', ')} y ${firstNames[firstNames.length - 1]}`;
  }
  
  if (names.length === 2) return `${names[0]} y ${names[1]}`;
  return `${names.slice(0, -1).join(', ')} y ${names[names.length - 1]}`;
};

const AddressCard = memo(({ 
    address, 
    viewMode = 'grid-full', 
    isAdmin = false, 
    isAssignedToMe = false, 
    adminEditMode = false,
    onEdit = null, 
    onNavigate = null, 
    isNavigating = false, 
    onUpdate = null,
    showToast = null,
    onUnmark = null,
    territories = [],
    showActions = true,
    customBadge = null,
    hideStatusBadge = false,
    showFullAddress = false
}) => {
    const { 
        handleToggleAddressStatus, 
        currentUser, 
        territories: contextTerritories,
        adminEditMode: globalAdminEditMode,
        handleToggleAdminMode
    } = useApp();
    
    const [isProcessing, setIsProcessing] = useState(false);
    const [isNavigatingLocal, setIsNavigatingLocal] = useState(false);

    // Configuración de colores según el estado (visitado/no visitado)
    const statusConfig = {
        visited: {
            // Gradientes principales  
            bgGradient: 'from-rose-50 to-pink-50',
            headerGradient: 'from-rose-500 via-pink-500 to-red-500',
            borderColor: 'border-rose-300',
            accentColor: '#f43f5e', // rose-500
            // Botones y elementos
            primaryButton: 'bg-rose-600 hover:bg-rose-700 text-white shadow-rose-200',
            secondaryButton: 'bg-rose-100 text-rose-700 hover:bg-rose-200 border-rose-200',
            // Iconos y badges
            iconColor: 'text-rose-600',
            iconBg: 'bg-rose-100',
            badgeBg: 'bg-rose-100 text-rose-700 border-rose-200',
            // Textos
            titleColor: 'text-rose-800',
            subtitleColor: 'text-rose-600',
            // Efectos
            hoverBorder: 'hover:border-rose-400',
            hoverShadow: 'hover:shadow-rose-200/30',
            // Navegación
            navButtons: 'bg-rose-50 border-rose-200',
            navActive: 'bg-rose-600 text-white hover:bg-rose-700'
        },
        notVisited: {
            bgGradient: 'from-emerald-50 to-green-50',
            headerGradient: 'from-emerald-500 via-green-500 to-teal-500',
            borderColor: 'border-emerald-300',
            accentColor: '#10b981', // emerald-500
            primaryButton: 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-200',
            secondaryButton: 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200 border-emerald-200',
            iconColor: 'text-emerald-600',
            iconBg: 'bg-emerald-100',
            badgeBg: 'bg-emerald-100 text-emerald-700 border-emerald-200',
            titleColor: 'text-emerald-800',
            subtitleColor: 'text-emerald-600',
            hoverBorder: 'hover:border-emerald-400',
            hoverShadow: 'hover:shadow-emerald-200/30',
            navButtons: 'bg-emerald-50 border-emerald-200',
            navActive: 'bg-emerald-600 text-white hover:bg-emerald-700'
        }
    };

    const config = statusConfig[address.isVisited ? 'visited' : 'notVisited'];
    
    // 🔄 PASO 12: Obtener información del territorio y equipo PRIMERO
    const territory = contextTerritories.find(t => t.id === address.territoryId);
    const territoryName = territory ? territory.name : `Territorio ${address.territoryId}`;
    const territoryAssignedTo = territory?.assignedTo;
    const isUserInTeam = territoryAssignedTo && isUserAssigned(territoryAssignedTo, currentUser?.name);
    
    // 🔄 PASO 12: Información del equipo asignado
    const teamInfo = territory?.assignedTo ? {
      names: getAssignedNames(territoryAssignedTo),
      isTeam: getAssignedNames(territoryAssignedTo).length > 1,
      displayName: formatTeamNames(getAssignedNames(territoryAssignedTo), window.innerWidth < 640)
    } : null;
    
    // ✅ TODOS los usuarios pueden editar direcciones:
    // - Admins: Edición directa 
    // - Publicadores: Envío de propuestas para revisión
    const isEditEnabled = true;
    
    // 🔄 PASO 12: Permisos estrictos para marcar/desmarcar direcciones (con soporte para equipos)
    const canToggleStatus = isUserInTeam || (isAdmin && globalAdminEditMode);
    
    // Highlight elegante sin parpadeo - CONTRASTE AZUL SUTIL
    const navigatingClass = (isNavigating || isNavigatingLocal) ? 'ring-4 ring-blue-500 ring-opacity-50 bg-blue-50/50 scale-[1.02] shadow-2xl' : '';

    // Funciones de navegación inteligente
    const getNavigationUrl = (mode) => {
        let lat, lng;
        
        // Prioridad 1: Coordenadas latitude/longitude
        if (address.latitude && address.longitude) {
            lat = address.latitude;
            lng = address.longitude;
        }
        // Prioridad 2: Array coords
        else if (address.coords && Array.isArray(address.coords) && address.coords.length >= 2) {
            [lat, lng] = address.coords;
        }
        // Prioridad 3: Intentar extraer coordenadas del mapUrl
        else if (address.mapUrl && address.mapUrl.trim() !== '') {
            const mapUrlMatch = address.mapUrl.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
            if (mapUrlMatch) {
                lat = parseFloat(mapUrlMatch[1]);
                lng = parseFloat(mapUrlMatch[2]);
            }
        }
        
        // Si tenemos coordenadas, usar navegación con modo específico (sin auto-inicio)
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
        
        // Fallback: Usar dirección de texto con modo específico (sin auto-inicio)
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

    const drivingUrl = getNavigationUrl('driving');
    const walkingUrl = getNavigationUrl('walking');
    const transitUrl = getNavigationUrl('transit');

    // Componente para mostrar el icono de género (usando FontAwesome)
    const GenderTag = ({ gender, colorClass = '' }) => {
        const styleConfig = {
            'Hombre':      { icon: 'fa-person', color: 'text-blue-600' },
            'Mujer':       { icon: 'fa-person-dress', color: 'text-pink-600' }, 
            'Pareja':      { icon: 'fa-user-group', color: 'text-purple-600' },
            'Desconocido': { icon: 'fa-ban', color: 'text-gray-500' }
        };
        const config = styleConfig[gender] || styleConfig['Desconocido'];
        return <i className={`fas ${config.icon} ${colorClass || config.color} text-lg`}></i>;
    };

    // Componente para mostrar la distancia
    const DistanceTag = ({ distance }) => {
        if (distance == null || distance === Infinity) { return null; }
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

    // Componente de botones de navegación (usando FontAwesome)
    const NavigationButtons = ({ a_styles, div_styles, button_styles }) => (
        <div className={`flex items-center rounded-xl p-1 ${a_styles}`}>
            <button
                onClick={(e) => handleNavClick(e, drivingUrl)}
                className={`px-3 py-2 rounded-lg ${button_styles} transition-all transform hover:scale-105`} 
                title="Navegar en coche"
            >
                <i className="fas fa-car text-lg"></i>
            </button>
            <div className={`w-px h-4 mx-1 ${div_styles}`}></div>
            <button
                onClick={(e) => handleNavClick(e, walkingUrl)}
                className={`px-3 py-2 rounded-lg ${button_styles} transition-all transform hover:scale-105`} 
                title="Navegar a pie"
            >
                <i className="fas fa-person-walking text-lg"></i>
            </button>
            <div className={`w-px h-4 mx-1 ${div_styles}`}></div>
            <button
                onClick={(e) => handleNavClick(e, transitUrl)}
                className={`px-3 py-2 rounded-lg ${button_styles} transition-all transform hover:scale-105`} 
                title="Navegar en transporte público"
            >
                <i className="fas fa-bus text-lg"></i>
            </button>
        </div>
    );

    // Manejadores
    const handleToggleStatus = async () => {
        if (isProcessing) return;
        
        setIsProcessing(true);
        try {
            // Usar la función onUpdate que viene como prop en lugar de la del contexto
            if (onUpdate) {
                // CORRECCIÓN: Para toggle de estado, pasar solo los campos necesarios
                const updatedData = {
                    isVisited: !address.isVisited,
                    lastUpdated: new Date()
                };
                await onUpdate(address.id, updatedData);
            } else {
                // Fallback a la función del contexto si no se proporciona onUpdate
                // CORRECCIÓN: Pasar el estado ACTUAL, no el opuesto
                await handleToggleAddressStatus(address.id, address.isVisited);
            }
            
            // Sin notificación de éxito - solo feedback visual
        } catch (error) {
            console.error('Error al cambiar estado:', error);
            if (showToast) {
                showToast('Error al cambiar el estado de la dirección', 'error');
            }
        } finally {
            setIsProcessing(false);
        }
    };

    const handleEditClick = () => {
        if (onEdit) onEdit(address);
    };

    const handleUnmarkClick = () => {
        if (onUnmark) onUnmark(address.id);
    };

    const handleNavClick = (e, url) => {
        // Prevenir comportamiento por defecto si existe
        if (e) e.preventDefault();
        
        // Guardar el estado actual en sessionStorage antes de navegar
        // Esto permitirá restaurar la ubicación si la app se recarga
        if (window.sessionStorage) {
            sessionStorage.setItem('lastTerritoryId', address.territoryId);
            sessionStorage.setItem('navigationTimestamp', Date.now().toString());
        }
        
        // Abrir en nueva ventana/pestaña
        window.open(url, '_blank', 'noopener,noreferrer');
        
        // Solo activar el estado local de navegación para feedback visual
        setIsNavigatingLocal(true);
        setTimeout(() => setIsNavigatingLocal(false), 3000);
    };

    // 🔄 PASO 12: Variables ya declaradas arriba - eliminadas para evitar duplicación
    
    // VISTA DE LISTA COMPACTA
    if (viewMode === 'list') {
        return (
            <div 
                id={`address-card-${address.id}`}
                className={`
                    group relative
                    bg-gradient-to-r ${config.bgGradient}
                    border-2 ${config.borderColor} ${config.hoverBorder}
                    rounded-xl overflow-hidden
                    shadow-md ${config.hoverShadow}
                    hover:shadow-xl hover:scale-[1.02]
                    transition-all duration-300 ease-out
                    ${navigatingClass}
                `}>
                {/* Contenido principal */}
                <div className="p-4">
                    <div className="flex items-center justify-between gap-3">
                        {/* Información principal */}
                        <div className="flex items-center space-x-3 flex-1 min-w-0">
                            {/* Icono de estado */}
                            <div className={`${config.iconBg} p-2 rounded-lg shadow-sm`}>
                                {address.isVisited ? (
                                    <Icon name="checkCircle" size={18} className={config.iconColor} />
                                ) : (
                                    <i className={`fas fa-house text-lg ${config.iconColor}`}></i>
                                )}
                            </div>
                            
                            {/* Dirección y género */}
                            <div className="flex-1 min-w-0">
                                <div className="flex items-start space-x-2">
                                    <h3 className={`font-bold text-base break-words ${config.titleColor}`} style={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}>
                                        {address.address}
                                    </h3>
                                    <GenderTag gender={address.gender} />
                                    <DistanceTag distance={address.distance} />
                                </div>
                                
                                {/* Badges en línea */}
                                <div className="flex gap-2 mt-1 flex-wrap">
                                    {address.isRevisita && address.revisitaBy && (
                                        <span className="text-xs font-bold text-purple-600">
                                            <i className="fas fa-bookmark mr-1"></i>
                                            Revisita: {address.revisitaBy}
                                        </span>
                                    )}
                                    {address.isEstudio && address.estudioBy && (
                                        <span className="text-xs font-bold text-purple-600">
                                            <i className="fas fa-book-open mr-1"></i>
                                            Estudio: {address.estudioBy}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Botones de navegación compactos */}
                        <NavigationButtons 
                            a_styles={`${config.navButtons} border shadow-sm backdrop-blur-sm`}
                            div_styles="bg-gray-300"
                            button_styles={`${config.navActive} shadow-sm`}
                        />

                        {/* Botón de estado - solo mostrar si showActions es true y no es navigation-only */}
                        {showActions && viewMode !== 'navigation-only' && (
                            <button
                                onClick={handleToggleStatus}
                                disabled={isProcessing || !canToggleStatus}
                                className={`
                                    px-4 py-2 rounded-lg font-medium text-sm
                                    ${canToggleStatus ? config.primaryButton : 'bg-gray-300 text-gray-500 cursor-not-allowed'}
                                    disabled:opacity-50 disabled:cursor-not-allowed
                                    transition-all transform hover:scale-105 active:scale-95
                                    shadow-lg hover:shadow-xl
                                `}
                                title={!canToggleStatus ? (teamInfo && teamInfo.isTeam ? `Solo el equipo (${teamInfo.displayName}) puede marcar/desmarcar` : 'Sin permisos para marcar/desmarcar') : ''}
                            >
                                {isProcessing ? 'Procesando...' : address.isVisited ? 'Desmarcar' : 'Completado'}
                            </button>
                        )}
                    </div>
                </div>

                {/* Barra de acento inferior */}
                <div 
                    className="h-1 w-full bg-gradient-to-r opacity-75 group-hover:opacity-100 transition-opacity"
                    style={{
                        backgroundImage: `linear-gradient(to right, ${config.accentColor}, ${config.accentColor}dd)`
                    }}
                />

                {/* Botón discreto de liberar - abajo a la derecha (modo lista) */}
                {onUnmark && (
                    <button 
                        onClick={handleUnmarkClick} 
                        className="absolute bottom-2 right-2 w-7 h-7 bg-gray-400/80 hover:bg-red-500 text-white rounded-full flex items-center justify-center transition-all duration-200 hover:scale-110 shadow-sm hover:shadow-md opacity-70 hover:opacity-100" 
                        title="Liberar asignación"
                    >
                        <i className="fas fa-trash text-xs"></i>
                    </button>
                )}
            </div>
        );
    }

    // VISTA DE TARJETA COMPLETA
    return (
        <div 
            id={`address-card-${address.id}`}
            className={`
                group relative cursor-default
                bg-gradient-to-br ${config.bgGradient}
                border-2 ${config.borderColor} ${config.hoverBorder}
                rounded-2xl overflow-hidden
                shadow-lg ${config.hoverShadow}
                hover:shadow-2xl hover:scale-[1.01]
                transition-all duration-300 ease-out
                ${navigatingClass}
            `}>
            {/* Encabezado con gradiente */}
            <div className="relative px-4 py-3 bg-white/60 backdrop-blur-sm border-b border-white/40">
                <div className="flex items-center justify-between gap-3">
                    {/* Icono principal y dirección */}
                    <div className="flex items-center space-x-3 flex-1 min-w-0">
                        <div className={`${config.iconBg} p-3 rounded-xl shadow-sm backdrop-blur-sm border border-white/20 group-hover:shadow-md transition-shadow`}>
                            {address.isVisited ? (
                                <Icon name="checkCircle" size={24} className={config.iconColor} />
                            ) : (
                                <i className={`fas fa-house text-xl ${config.iconColor}`}></i>
                            )}
                        </div>
                        <div className="flex-1 min-w-0">
                            <h3 className={`text-lg font-bold break-words ${config.titleColor}`} style={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}>
                                {address.address}
                            </h3>
                            <div className="flex items-center space-x-2 mt-1">
                                <GenderTag gender={address.gender} />
                                <DistanceTag distance={address.distance} />
                            </div>
                        </div>
                    </div>

                    {/* Estado badge o badge personalizado */}
                    {customBadge ? (
                        customBadge
                    ) : !hideStatusBadge ? (
                        <div className={`${config.badgeBg} px-3 py-1.5 rounded-full flex items-center space-x-2 shadow-sm border`}>
                            <div 
                                className={`w-2 h-2 rounded-full ${address.isVisited ? '' : 'animate-pulse'}`}
                                style={{backgroundColor: config.accentColor}}
                            ></div>
                            <span className="text-sm font-medium">
                                {address.isVisited ? 'Visitada' : 'Pendiente'}
                            </span>
                        </div>
                    ) : null}
                </div>
            </div>

            {/* Contenido principal */}
            <div className="px-4 py-4 space-y-4">
                {address.isVisited ? (
                    // VISTA VISITADA
                    <div className="space-y-4">
                        {/* Badges de estado */}
                        <div className="space-y-2 mb-2">
                            {address.isRevisita && address.revisitaBy && (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-100 text-purple-800">
                                    <i className="fas fa-bookmark mr-1.5"></i>
                                    Revisita: {address.revisitaBy}
                                </span>
                            )}
                            {address.isEstudio && address.estudioBy && (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-100 text-purple-800">
                                    <i className="fas fa-book-open mr-1.5"></i>
                                    Estudio: {address.estudioBy}
                                </span>
                            )}
                            {address.territoryName && (
                                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-800">
                                    <i className="fas fa-map mr-1.5"></i>
                                    {address.territoryName}
                                </span>
                            )}
                        </div>

                        {/* Notas */}
                        {address.notes && (
                            <div className="flex items-start p-3 bg-red-50 rounded-lg text-sm italic">
                                <i className="fas fa-info-circle text-red-400 mr-2 mt-0.5"></i>
                                <p className="text-red-800">{address.notes}</p>
                            </div>
                        )}

                        {/* Navegación y acciones */}
                        <div className={`flex items-center ${showActions && viewMode !== 'navigation-only' ? 'justify-between' : 'justify-center'}`}>
                            <NavigationButtons 
                                a_styles="bg-red-50 border-red-200 border shadow-sm"
                                div_styles="bg-red-300"
                                button_styles="bg-red-600 text-white hover:bg-red-700 shadow-sm"
                            />
                            
                            {showActions && viewMode !== 'navigation-only' && (
                                <div className="flex items-center space-x-2">
                                    {/* Botón principal de Desmarcar */}
                                    <button
                                        onClick={handleToggleStatus}
                                        disabled={isProcessing || !canToggleStatus}
                                        className={`
                                            px-4 py-2 rounded-xl font-semibold text-sm
                                            ${canToggleStatus ? config.primaryButton : 'bg-gray-300 text-gray-500 cursor-not-allowed'}
                                            disabled:opacity-50 disabled:cursor-not-allowed
                                            transition-all transform hover:scale-105 active:scale-95
                                            shadow-lg hover:shadow-xl
                                        `}
                                        title={!canToggleStatus ? (teamInfo && teamInfo.isTeam ? `Solo el equipo (${teamInfo.displayName}) puede marcar/desmarcar` : 'Sin permisos para marcar/desmarcar') : ''}
                                    >
                                        {isProcessing ? 'Procesando...' : address.isVisited ? 'Desmarcar' : 'Completado'}
                                    </button>
                                    
                                    {/* Botones de acción secundarios */}
                                    <div className="flex items-center space-x-2">
                                        {isEditEnabled && (
                                            <button 
                                                onClick={handleEditClick} 
                                                className="p-2 rounded-full text-red-600 hover:bg-red-100 transition-colors" 
                                                title={isAdmin ? "Editar dirección" : "Proponer cambio"}
                                            >
                                                <i className="fas fa-pen-to-square text-sm"></i>
                                            </button>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                ) : (
                    // VISTA NO VISITADA
                    <div className="space-y-4">
                        {/* Badges de estado */}
                        <div className="space-y-2 mb-2">
                            {address.isRevisita && address.revisitaBy && (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-100 text-purple-800">
                                    <i className="fas fa-bookmark mr-1.5"></i>
                                    Revisita: {address.revisitaBy}
                                </span>
                            )}
                            {address.isEstudio && address.estudioBy && (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-100 text-purple-800">
                                    <i className="fas fa-book-open mr-1.5"></i>
                                    Estudio: {address.estudioBy}
                                </span>
                            )}
                            {address.territoryName && (
                                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-800">
                                    <i className="fas fa-map mr-1.5"></i>
                                    {address.territoryName}
                                </span>
                            )}
                        </div>

                        {/* Notas */}
                        {address.notes && (
                            <div className="flex items-start p-3 bg-green-50 rounded-lg text-sm italic">
                                <i className="fas fa-info-circle text-green-400 mr-2 mt-0.5"></i>
                                <p className="text-green-800">{address.notes}</p>
                            </div>
                        )}

                        {/* Navegación y acciones */}
                        <div className={`flex items-center ${showActions && viewMode !== 'navigation-only' ? 'justify-between' : 'justify-center'}`}>
                            <NavigationButtons 
                                a_styles="bg-emerald-50 border-emerald-200 border shadow-sm"
                                div_styles="bg-emerald-300"
                                button_styles="bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm"
                            />
                            
                            {showActions && viewMode !== 'navigation-only' && (
                                <div className="flex items-center space-x-2">
                                    <button
                                        onClick={handleToggleStatus}
                                        disabled={isProcessing || !canToggleStatus}
                                        className={`
                                            px-4 py-2 rounded-xl font-semibold text-sm
                                            ${canToggleStatus ? config.primaryButton : 'bg-gray-300 text-gray-500 cursor-not-allowed'}
                                            disabled:opacity-50 disabled:cursor-not-allowed
                                            transition-all transform hover:scale-105 active:scale-95
                                            shadow-lg hover:shadow-xl
                                        `}
                                        title={!canToggleStatus ? (teamInfo && teamInfo.isTeam ? `Solo el equipo (${teamInfo.displayName}) puede marcar/desmarcar` : 'Sin permisos para marcar/desmarcar') : ''}
                                    >
                                        {isProcessing ? 'Procesando...' : address.isVisited ? 'Desmarcar' : 'Completado'}
                                    </button>
                                    
                                    <div className="flex items-center space-x-2">
                                        {isEditEnabled && (
                                            <button 
                                                onClick={handleEditClick} 
                                                className="p-2 rounded-full text-green-600 hover:bg-green-100 transition-colors" 
                                                title={isAdmin ? "Editar dirección" : "Proponer cambio"}
                                            >
                                                <i className="fas fa-pen-to-square text-sm"></i>
                                            </button>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
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

            {/* Botón discreto de liberar - abajo a la derecha */}
            {onUnmark && (
                <button 
                    onClick={handleUnmarkClick} 
                    className="absolute bottom-3 right-3 w-8 h-8 bg-gray-400/80 hover:bg-red-500 text-white rounded-full flex items-center justify-center transition-all duration-200 hover:scale-110 shadow-sm hover:shadow-md opacity-70 hover:opacity-100" 
                    title="Liberar asignación"
                >
                    <i className="fas fa-trash text-xs"></i>
                </button>
            )}

            {/* Overlay sutil en hover */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
        </div>
    );
});

export default AddressCard; 