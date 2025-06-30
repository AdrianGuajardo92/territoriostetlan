import { useState, useEffect, useRef } from 'react';
import { useToast } from '../../hooks/useToast';
import Icon from '../common/Icon';

const TerritoryMapModal = ({ isOpen, onClose, territory, addresses, isAssignedToMe, isAdmin, onEditAddress, sortState, onOptimizedRoute, onResetSort, onToggleAddressStatus }) => {
    const mapRef = useRef(null);
    const mapInstanceRef = useRef(null);
    const [mapError, setMapError] = useState(false);
    const [isMapReady, setIsMapReady] = useState(false);
    const [selectedAddress, setSelectedAddress] = useState(null);
    const [selectedAddressIndex, setSelectedAddressIndex] = useState(null);
    const [showQuickAction, setShowQuickAction] = useState(false);
    const [showRouteListModal, setShowRouteListModal] = useState(false);
    const { showToast } = useToast();
    const markersRef = useRef({});
    const routeLineRef = useRef(null);
    
    // Sincronizar dirección seleccionada con cambios en la lista
    useEffect(() => {
        if (selectedAddress) {
            const updatedSelectedAddress = addresses.find(a => a.id === selectedAddress.id);
            if (updatedSelectedAddress) {
                setSelectedAddress(updatedSelectedAddress);
            }
        }
    }, [addresses, selectedAddress?.id]);
    
    // Función para obtener el color basado en el estado de la dirección (igual que las tarjetas)
    const getAddressColor = (address) => {
        if (address.isVisited) return '#ef4444'; // Rojo - Visitada
        return '#22c55e'; // Verde - Pendiente
    };
    
    // Función para obtener coordenadas robusta
    const getCoordinates = (address) => {
        // Prioridad 1: latitude/longitude directo
        if (address.latitude && address.longitude) {
            return { lat: address.latitude, lng: address.longitude };
        }
        
        // Prioridad 2: extraer de mapUrl
        if (address.mapUrl) {
            const coords = extractCoordinatesFromUrl(address.mapUrl);
            if (coords) return coords;
        }
        
        // Prioridad 3: array coords
        if (address.coords && Array.isArray(address.coords) && address.coords.length >= 2) {
            return { lat: address.coords[0], lng: address.coords[1] };
        }
        
        return null;
    };
    
    const extractCoordinatesFromUrl = (url) => {
        if (!url) return null;
        const patterns = [
            /@(-?\d+\.?\d*),(-?\d+\.?\d*)/,
            /ll=(-?\d+\.?\d*),(-?\d+\.?\d*)/,
            /q=(-?\d+\.?\d*),(-?\d+\.?\d*)/,
            /!3d(-?\d+\.?\d*)!4d(-?\d+\.?\d*)/
        ];
        
        for (const pattern of patterns) {
            const match = url.match(pattern);
            if (match) {
                return {
                    lat: parseFloat(match[1]),
                    lng: parseFloat(match[2])
                };
            }
        }
        return null;
    };
    
    // Función para marcar como visitado desde el mapa
    const handleQuickToggleVisited = async (address) => {
        try {
            const updatedAddress = {
                ...address,
                isVisited: !address.isVisited,
                lastUpdated: new Date()
            };
            
            await onToggleAddressStatus(address.id, updatedAddress);
            
            // Actualizar inmediatamente la dirección seleccionada
            setSelectedAddress(updatedAddress);
            
            // Forzar actualización de marcadores
            setTimeout(() => {
                if (mapInstanceRef.current && isMapReady) {
                    const updatedAddresses = addresses.map(addr => 
                        addr.id === address.id ? updatedAddress : addr
                    );
                    updateMapMarkers(updatedAddresses);
                }
            }, 100);
            
            setShowQuickAction(false);
        } catch (error) {
            console.error('Error al actualizar dirección:', error);
            showToast('Error al actualizar la dirección', 'error');
        }
    };
    
    // Función para navegar a una dirección individual
    const handleNavigateToAddress = (address, mode = 'driving') => {
        const coords = getCoordinates(address);
        if (!coords) {
            showToast('No hay coordenadas disponibles para esta dirección', 'warning');
            return;
        }
        
        const url = `https://www.google.com/maps/dir/?api=1&destination=${coords.lat},${coords.lng}&travelmode=${mode}`;
        window.open(url, '_blank', 'noopener,noreferrer');
    };

    // Función para navegación integrada (mantener para el panel de acción rápida)
    const handleNavigate = (address, mode = 'driving') => {
        const coords = getCoordinates(address);
        let url = '';
        
        if (coords) {
            // Usar coordenadas con modo específico (sin auto-inicio)
            switch (mode) {
                case 'driving':
                    url = `https://www.google.com/maps/dir/?api=1&destination=${coords.lat},${coords.lng}&travelmode=driving`;
                    break;
                case 'walking':
                    url = `https://www.google.com/maps/dir/?api=1&destination=${coords.lat},${coords.lng}&travelmode=walking`;
                    break;
                case 'transit':
                    url = `https://www.google.com/maps/dir/?api=1&destination=${coords.lat},${coords.lng}&travelmode=transit`;
                    break;
                default:
                    url = `https://www.google.com/maps/search/?api=1&query=${coords.lat},${coords.lng}`;
            }
        } else {
            // Fallback usando dirección en texto con modo específico (sin auto-inicio)
            const encodedAddress = encodeURIComponent(address.address);
            switch (mode) {
                case 'driving':
                    url = `https://www.google.com/maps/dir/?api=1&destination=${encodedAddress}&travelmode=driving`;
                    break;
                case 'walking':
                    url = `https://www.google.com/maps/dir/?api=1&destination=${encodedAddress}&travelmode=walking`;
                    break;
                case 'transit':
                    url = `https://www.google.com/maps/dir/?api=1&destination=${encodedAddress}&travelmode=transit`;
                    break;
                default:
                    url = `https://www.google.com/maps/search/?api=1&query=${encodedAddress}`;
            }
        }
        
        // Guardar el estado actual en sessionStorage antes de navegar
        if (window.sessionStorage && territory) {
            sessionStorage.setItem('lastTerritoryId', territory.id);
            sessionStorage.setItem('navigationTimestamp', Date.now().toString());
        }
        
        // Prevenir que el modal se cierre al regresar de Google Maps
        window.open(url, '_blank', 'noopener,noreferrer');
    };
    
    const updateMapMarkers = (addressesToShow) => {
        if (!mapInstanceRef.current) return;
        
        // Limpiar marcadores existentes
        Object.values(markersRef.current).forEach(marker => {
            mapInstanceRef.current.removeLayer(marker);
        });
        markersRef.current = {};
        
        const markersGroup = L.featureGroup();
        let validMarkersCount = 0;
        
        addressesToShow.forEach((address, index) => {
            const coords = getCoordinates(address);
            if (!coords) return;
            
            validMarkersCount++;
            const displayNumber = sortState.sortOrder === 'optimized' && address.routeOrder ? address.routeOrder : validMarkersCount;
            const color = getAddressColor(address);
            
            // Marcador circular con número siempre visible
            const markerHtml = `
                <div style="
                    background-color: ${color}; 
                    color: white; 
                    width: 36px; 
                    height: 36px; 
                    border-radius: 50%; 
                    display: flex; 
                    align-items: center; 
                    justify-content: center; 
                    font-weight: bold; 
                    font-size: 16px; 
                    border: 3px solid white; 
                    box-shadow: 0 3px 8px rgba(0,0,0,0.4); 
                    cursor: pointer;
                    transition: all 0.2s ease;
                    animation: markerPulse 0.6s ease-out;
                " class="map-marker">
                    ${displayNumber}
                </div>`;
            
            const customIcon = L.divIcon({ 
                html: markerHtml, 
                iconSize: [36, 36], 
                className: 'custom-marker-new',
                iconAnchor: [18, 18]
            });
            
            const marker = L.marker([coords.lat, coords.lng], { icon: customIcon });
            
            // Click en marcador - Mostrar panel de acción rápida
            marker.on('click', () => {
                const currentAddressState = addresses.find(a => a.id === address.id);
                setSelectedAddress(currentAddressState || address);
                setSelectedAddressIndex(index);
                setShowQuickAction(true);
            });
            
            markersRef.current[address.id] = marker;
            markersGroup.addLayer(marker);
        });
        
        if(Object.keys(markersRef.current).length > 0) {
            markersGroup.addTo(mapInstanceRef.current);
            
            // Auto-ajustar vista para incluir todos los marcadores
            try {
                const markerBounds = markersGroup.getBounds();
                if (markerBounds.isValid()) {
                    mapInstanceRef.current.fitBounds(markerBounds, { 
                        padding: [20, 20],
                        maxZoom: 17 // Evitar zoom excesivo para una sola dirección
                    });
                }
            } catch (error) {
                console.warn('Error ajustando vista del mapa:', error);
            }
        }

        // Marcador de ubicación del usuario si existe
        if (sortState.userLocation && mapInstanceRef.current) {
            const userIcon = L.divIcon({
                html: `<div style="
                    background-color: #3b82f6; 
                    width: 24px; 
                    height: 24px; 
                    border-radius: 50%; 
                    border: 3px solid white; 
                    box-shadow: 0 2px 8px rgba(0,0,0,0.4); 
                    position: relative;
                ">
                    <div style="
                        position: absolute; 
                        top: 50%; 
                        left: 50%; 
                        transform: translate(-50%, -50%); 
                        width: 8px; 
                        height: 8px; 
                        background-color: white; 
                        border-radius: 50%;
                    "></div>
                </div>`,
                iconSize: [24, 24],
                className: 'user-location-marker'
            });
            
            L.marker([sortState.userLocation.lat, sortState.userLocation.lng], { icon: userIcon })
                .addTo(mapInstanceRef.current)
                .bindPopup('Tu ubicación');
        }
    };
    
    const drawRouteLine = (orderedList) => {
        if (!mapInstanceRef.current) return;

        // Limpiar línea de ruta anterior
        if (routeLineRef.current) {
            mapInstanceRef.current.removeLayer(routeLineRef.current);
            routeLineRef.current = null;
        }
        
        const routeCoords = [];
        
        // Añadir ubicación del usuario si existe
        if (sortState.userLocation) {
            routeCoords.push([sortState.userLocation.lat, sortState.userLocation.lng]);
        }
        
        // Añadir coordenadas de las direcciones en orden
        orderedList.forEach(address => {
            const coords = getCoordinates(address);
            if (coords) {
                routeCoords.push([coords.lat, coords.lng]);
            }
        });
        
        // Dibujar línea de ruta si hay al menos 2 puntos
        if (routeCoords.length > 1) {
            routeLineRef.current = L.polyline(routeCoords, { 
                color: '#4f46e5', 
                weight: 3, 
                opacity: 0.7, 
                dashArray: '10, 10', 
                lineJoin: 'round',
                lineCap: 'round'
            }).addTo(mapInstanceRef.current);
            
            // Añadir tooltip con información de la ruta
            const addressCount = orderedList.filter(addr => getCoordinates(addr)).length;
            routeLineRef.current.bindTooltip(
                `Ruta optimizada: ${addressCount} direcciones`, 
                { permanent: false, direction: 'center' }
            );
        }
    };
    
    useEffect(() => {
        if (!isOpen) return;

        const initializeMap = () => {
            if (!mapRef.current || mapInstanceRef.current) return;
            
            try {
                const addressesWithCoords = addresses.filter(addr => getCoordinates(addr));
                if (addressesWithCoords.length === 0) {
                    setMapError(true);
                    return;
                }
                
                // Configuración súper optimizada para móviles (máximo rendimiento)
                const map = L.map(mapRef.current, {
                    zoomControl: true,
                    attributionControl: true,
                    // Optimizaciones máximas para fluidez
                    preferCanvas: true,
                    zoomSnap: 0.1,
                    zoomDelta: 0.5,
                    wheelPxPerZoomLevel: 60,
                    maxBoundsViscosity: 0.8,
                    // Configuraciones adicionales para fluidez
                    inertia: true,
                    inertiaDeceleration: 3000,
                    inertiaMaxSpeed: Infinity,
                    zoomAnimation: true,
                    zoomAnimationThreshold: 4,
                    fadeAnimation: true,
                    markerZoomAnimation: true,
                    // Optimizaciones de touch
                    touchZoom: true,
                    bounceAtZoomLimits: false
                });
                
                // Capa de tiles súper optimizada
                L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { 
                    attribution: '© OpenStreetMap', 
                    maxZoom: 19,
                    minZoom: 10,
                    // Optimizaciones máximas de carga
                    updateWhenIdle: false,
                    updateWhenZooming: true,
                    keepBuffer: 4,
                    maxNativeZoom: 18,
                    detectRetina: true
                }).addTo(map);
                
                mapInstanceRef.current = map;
                setIsMapReady(true);
                
            } catch (error) {
                console.error('Error al inicializar el mapa:', error);
                setMapError(true);
            }
        };

        const checkLeaflet = () => {
            if (typeof L !== 'undefined') {
                initializeMap();
            } else {
                setTimeout(() => typeof L !== 'undefined' ? initializeMap() : setMapError(true), 1000);
            }
        };
        
        // Prevenir scroll del body cuando el modal está abierto
        document.body.classList.add('map-modal-open');
        
        checkLeaflet();
        
        return () => {
            // Restaurar scroll del body al cerrar el modal
            document.body.classList.remove('map-modal-open');
            
            if (mapInstanceRef.current) {
                mapInstanceRef.current.remove();
                mapInstanceRef.current = null;
            }
            setIsMapReady(false);
            setMapError(false);
            setSelectedAddress(null);
            setShowQuickAction(false);
            setShowRouteListModal(false);
        };
    }, [isOpen]);
    
    useEffect(() => {
        if (!isOpen || !isMapReady || !mapInstanceRef.current) return;
        
        updateMapMarkers(addresses);

        if (sortState.sortOrder === 'optimized') {
            drawRouteLine(addresses);
        } else {
            if (routeLineRef.current) {
                mapInstanceRef.current.removeLayer(routeLineRef.current);
                routeLineRef.current = null;
            }
        }
        
        const addressesWithCoords = addresses.filter(addr => getCoordinates(addr));
        if (addressesWithCoords.length > 0) {
             const markerBounds = L.featureGroup(Object.values(markersRef.current)).getBounds();
             if(markerBounds.isValid()) {
                // Padding optimizado para móvil
                const padding = window.innerWidth < 640 ? [30, 30] : [50, 50];
                mapInstanceRef.current.fitBounds(markerBounds, { padding });
             }
        }

        // Invalidar tamaño para garantizar renderizado correcto - OPTIMIZADO
        setTimeout(() => mapInstanceRef.current && mapInstanceRef.current.invalidateSize(), 100);

    }, [isOpen, isMapReady, addresses, sortState]);
    
    // Listener para mantener el modal abierto al regresar de Google Maps
    useEffect(() => {
        if (!isOpen) return;

        const handleVisibilityChange = () => {
            // Cuando la ventana vuelve a tener foco, aseguramos que el modal permanezca abierto
            if (!document.hidden) {
                // El modal ya está abierto, no necesitamos hacer nada más
                // Esto previene que se cierre automáticamente
            }
        };

        const handleFocus = () => {
            // Cuando la ventana recibe foco, invalidamos el tamaño del mapa
            // para asegurar que se renderice correctamente
            if (mapInstanceRef.current && isMapReady) {
                setTimeout(() => {
                    mapInstanceRef.current.invalidateSize();
                }, 100);
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        window.addEventListener('focus', handleFocus);

        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            window.removeEventListener('focus', handleFocus);
        };
    }, [isOpen, isMapReady]);
    
    // Control del scroll del body cuando el modal está abierto
    useEffect(() => {
        if (isOpen) {
            // Guardar el scroll actual
            const scrollY = window.scrollY;
            
            // Deshabilitar scroll del body
            document.body.style.position = 'fixed';
            document.body.style.top = `-${scrollY}px`;
            document.body.style.width = '100%';
            document.body.style.overflow = 'hidden';
            
            return () => {
                // Restaurar scroll del body
                document.body.style.position = '';
                document.body.style.top = '';
                document.body.style.width = '';
                document.body.style.overflow = '';
                window.scrollTo(0, scrollY);
            };
        }
    }, [isOpen]);
    
    if (!isOpen) return null;
    
    return (
        <div className="fixed inset-0 z-[70] bg-white flex flex-col">
            {/* Header minimalista optimizado para móvil */}
            <div className="bg-gray-50 border-b border-gray-200 px-3 sm:px-4 py-3">
                <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center">
                        <button 
                            onClick={onClose} 
                            className="p-2 hover:bg-gray-200 rounded-full transition-colors mr-2" 
                            aria-label="Cerrar mapa"
                        >
                            <Icon name="arrowLeft" size={20} className="text-gray-600" />
                        </button>
                        <div className="flex items-center">
                            <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center mr-2">
                                <Icon name="map" size={16} className="text-indigo-600" />
                            </div>
                            <div>
                                <h2 className="text-base font-semibold text-gray-800">{territory.name}</h2>
                                <p className="text-xs text-gray-600">
                                    {addresses.length} direcciones • Toca un marcador
                                </p>
                            </div>
                        </div>
                    </div>
                    <button 
                        onClick={onClose} 
                        className="p-2 hover:bg-gray-200 rounded-lg transition-colors sm:hidden"
                    >
                        <Icon name="x" size={18} className="text-gray-600" />
                    </button>
                </div>
                
                {/* Controles optimizados */}
                <div className="flex items-center justify-end space-x-2">
                    {sortState.sortOrder !== 'alpha' && (
                        <button 
                            onClick={onResetSort} 
                            className="px-3 py-1.5 text-xs text-red-600 bg-white rounded-lg shadow-sm border border-red-200 hover:bg-red-50 transition-all"
                            title="Orden original"
                        >
                            <Icon name="x" size={14} className="mr-1" />
                            Original
                        </button>
                    )}
                    
                    <button 
                        onClick={onOptimizedRoute} 
                        disabled={sortState.isCalculatingRoute} 
                        className={`px-3 py-1.5 text-xs rounded-lg shadow-sm border transition-all ${
                            sortState.sortOrder === 'optimized' 
                                ? 'bg-green-600 text-white border-green-700' 
                                : 'bg-white text-green-600 border-green-200 hover:bg-green-50'
                        }`}
                        title="Ruta optimizada"
                    >
                        {sortState.isCalculatingRoute ? (
                            <div className="animate-spin w-3 h-3 border border-current border-t-transparent rounded-full"></div>
                        ) : (
                            <>
                                <Icon name="activity" size={14} className="mr-1" />
                                Ruta
                            </>
                        )}
                    </button>
                    
                    {/* Botón para ver lista de ruta - solo visible cuando hay ruta optimizada */}
                    {sortState.sortOrder === 'optimized' && (
                        <button 
                            onClick={() => setShowRouteListModal(true)}
                            className="px-3 py-1.5 text-xs bg-blue-600 text-white rounded-lg shadow-sm border border-blue-700 hover:bg-blue-700 transition-all" 
                            title="Ver lista de ruta optimizada"
                        >
                            <Icon name="list" size={14} className="mr-1" />
                            Ver Ruta
                        </button>
                    )}
                </div>
            </div>
            
            {/* Mapa principal */}
            <div className="flex-1 relative bg-gray-100" style={{ touchAction: 'none', overflow: 'hidden' }}>
                {mapError ? (
                    <div className="absolute inset-0 flex items-center justify-center text-center p-4">
                        <div>
                            <Icon name="mapOff" size={48} className="text-gray-400 mx-auto mb-4" />
                            <p className="text-gray-600 font-medium">No se pudo cargar el mapa</p>
                            <p className="text-gray-500 text-sm">No hay direcciones con ubicación GPS</p>
                        </div>
                    </div>
                ) : (
                    <>
                        {!isMapReady && (
                            <div className="absolute inset-0 flex items-center justify-center bg-white z-10">
                                <div className="text-center">
                                    <div className="animate-spin w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full mx-auto"></div>
                                    <p className="text-gray-600 mt-4 text-sm">Cargando mapa...</p>
                                </div>
                            </div>
                        )}
                        <div ref={mapRef} className="w-full h-full" style={{ touchAction: 'manipulation' }} />
                    </>
                )}
            </div>
            
            {/* Panel de acción rápida - Rediseñado más compacto y profesional */}
            {showQuickAction && selectedAddress && (
                <div className="absolute bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg animate-slide-up z-20">
                    <div className="px-3 py-2">
                        {/* Header del panel - Más compacto */}
                        <div className="flex items-center justify-between mb-1.5">
                            <div className="flex items-center">
                                <div 
                                    className="w-5 h-5 rounded-full mr-2 flex items-center justify-center text-white text-xs font-bold"
                                    style={{ backgroundColor: getAddressColor(selectedAddress) }}
                                >
                                    {selectedAddressIndex !== null ? selectedAddressIndex + 1 : ''}
                                </div>
                                <div>
                                    <h3 className="font-semibold text-gray-800 text-sm leading-tight">
                                        {selectedAddress.address}
                                    </h3>
                                    <p className="text-xs text-gray-500">
                                        {selectedAddress.isVisited ? 'Visitada' : 'Pendiente'}
                                        {selectedAddress.gender && selectedAddress.gender !== 'Desconocido' && 
                                            ` • ${selectedAddress.gender}`
                                        }
                                    </p>
                                </div>
                            </div>
                            <button 
                                onClick={() => setShowQuickAction(false)}
                                className="p-1 hover:bg-gray-100 rounded-full transition-colors"
                            >
                                <Icon name="x" size={16} className="text-gray-400" />
                            </button>
                        </div>
                        
                        {/* Notas si existen - Más compacto */}
                        {selectedAddress.notes && (
                            <div className="mb-1.5 p-1.5 bg-blue-50 border border-blue-200 rounded-md">
                                <p className="text-xs text-blue-700">
                                    <Icon name="info" size={12} className="inline mr-1" />
                                    {selectedAddress.notes}
                                </p>
                            </div>
                        )}
                        
                        {/* Botones de acción - Rediseño con mejores proporciones */}
                        <div className="flex gap-2 mb-1.5">
                            {/* Botón principal - Marcar completado/pendiente */}
                            <button
                                onClick={() => handleQuickToggleVisited(selectedAddress)}
                                className={`flex-1 p-3 rounded-lg font-medium text-sm transition-all flex items-center justify-center ${
                                    selectedAddress.isVisited
                                        ? 'bg-slate-600 hover:bg-slate-700 text-white'
                                        : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                                }`}
                            >
                                <Icon 
                                    name={selectedAddress.isVisited ? 'refresh' : 'checkCircle'} 
                                    size={18} 
                                    className="mr-2" 
                                />
                                {selectedAddress.isVisited ? 'Desmarcar' : 'Completado'}
                            </button>
                            
                            {/* Navegación - Color gris temático unificado */}
                            <div className="flex gap-2">
                                <button
                                    onClick={() => handleNavigate(selectedAddress, 'driving')}
                                    className="p-3 bg-slate-500 hover:bg-slate-600 text-white rounded-lg transition-colors min-w-[48px] flex items-center justify-center"
                                    title="Navegar en carro"
                                >
                                    <i className="fas fa-car text-lg"></i>
                                </button>
                                <button
                                    onClick={() => handleNavigate(selectedAddress, 'walking')}
                                    className="p-3 bg-slate-500 hover:bg-slate-600 text-white rounded-lg transition-colors min-w-[48px] flex items-center justify-center"
                                    title="Navegar caminando"
                                >
                                    <i className="fas fa-person-walking text-lg"></i>
                                </button>
                                <button
                                    onClick={() => handleNavigate(selectedAddress, 'transit')}
                                    className="p-3 bg-slate-500 hover:bg-slate-600 text-white rounded-lg transition-colors min-w-[48px] flex items-center justify-center"
                                    title="Transporte público"
                                >
                                    <i className="fas fa-bus text-lg"></i>
                                </button>
                            </div>
                        </div>
                        
                        {/* Botón para editar dirección - Más sutil */}
                        {(isAssignedToMe || isAdmin) && (
                            <button
                                onClick={() => {
                                    onEditAddress(selectedAddress);
                                    onClose();
                                }}
                                className="w-full p-1.5 bg-gray-50 text-gray-600 rounded-md hover:bg-gray-100 transition-colors text-sm border border-gray-200"
                            >
                                <Icon name="edit" size={14} className="mr-2" />
                                Editar dirección
                            </button>
                        )}
                    </div>
                </div>
            )}
            
            {/* Leyenda minimalista y compacta */}
            <div className="bg-white border-t border-gray-200 px-4 py-1.5">
                <div className="flex items-center justify-center space-x-4 text-xs text-gray-600">
                    <div className="flex items-center">
                        <div className="w-2.5 h-2.5 bg-green-500 rounded-full mr-1"></div>
                        <span>Pendiente</span>
                    </div>
                    <div className="flex items-center">
                        <div className="w-2.5 h-2.5 bg-red-500 rounded-full mr-1"></div>
                        <span>Visitada</span>
                    </div>
                    {sortState.userLocation && (
                        <div className="flex items-center">
                            <div className="w-2.5 h-2.5 bg-blue-600 rounded-full mr-1 relative">
                                <div className="absolute inset-0.5 bg-white rounded-full"></div>
                            </div>
                            <span>Tu ubicación</span>
                        </div>
                    )}
                </div>
            </div>
            
            {/* Modal de Lista de Ruta */}
            {showRouteListModal && (
                <div 
                    className="fixed inset-0 z-[80] bg-black/50 flex items-center justify-center p-4"
                    onClick={(e) => {
                        if (e.target === e.currentTarget) {
                            setShowRouteListModal(false);
                        }
                    }}
                >
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-md max-h-[80vh] overflow-hidden">
                        {/* Header */}
                        <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center">
                                    <Icon name="route" size={20} className="mr-2" />
                                    <div>
                                        <h3 className="font-semibold">Ruta Optimizada</h3>
                                        <p className="text-xs opacity-90">
                                            {addresses.length} direcciones ordenadas
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setShowRouteListModal(false)}
                                    className="p-1 hover:bg-white/20 rounded-full transition-colors"
                                >
                                    <Icon name="x" size={18} />
                                </button>
                            </div>
                        </div>
                        
                        {/* Lista de direcciones */}
                        <div className="overflow-y-auto max-h-[calc(80vh-120px)]">
                            {/* Punto de partida */}
                            {sortState.userLocation && (
                                <div className="p-3 border-b border-gray-100 bg-green-50">
                                    <div className="flex items-center">
                                        <div className="w-8 h-8 bg-green-600 text-white rounded-full flex items-center justify-center mr-3 font-bold text-sm">
                                            📍
                                        </div>
                                        <div className="flex-1">
                                            <p className="font-medium text-green-800">Punto de partida</p>
                                            <p className="text-xs text-green-600">Tu ubicación actual</p>
                                        </div>
                                    </div>
                                </div>
                            )}
                            
                            {/* Direcciones ordenadas */}
                            {addresses.map((address, index) => {
                                const coords = getCoordinates(address);
                                const routeNumber = sortState.sortOrder === 'optimized' && address.routeOrder ? 
                                    address.routeOrder : index + 1;
                                
                                return (
                                    <div key={address.id} className="p-3 border-b border-gray-100 hover:bg-gray-50">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center flex-1">
                                                <div className={`w-8 h-8 rounded-full flex items-center justify-center mr-3 font-bold text-sm text-white ${
                                                    address.isVisited ? 'bg-red-500' : 'bg-blue-600'
                                                }`}>
                                                    {routeNumber}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="font-medium text-gray-900 truncate">
                                                        {address.address}
                                                    </p>
                                                    <div className="flex items-center space-x-2 text-xs text-gray-500">
                                                        <span className={
                                                            address.isVisited ? 'text-red-600' : 'text-green-600'
                                                        }>
                                                            {address.isVisited ? 'Visitada' : 'Pendiente'}
                                                        </span>
                                                        {address.gender && address.gender !== 'Desconocido' && (
                                                            <span>• {address.gender}</span>
                                                        )}
                                                    </div>
                                                    {address.notes && (
                                                        <p className="text-xs text-blue-600 mt-1 truncate">
                                                            💬 {address.notes}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                            
                                            {/* Botones de navegación */}
                                            <div className="flex space-x-1 ml-2">
                                                {coords && (
                                                    <>
                                                        <button
                                                            onClick={() => handleNavigateToAddress(address, 'driving')}
                                                            className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                                                            title="Navegar en carro"
                                                        >
                                                            <i className="fas fa-car text-xs"></i>
                                                        </button>
                                                        <button
                                                            onClick={() => handleNavigateToAddress(address, 'walking')}
                                                            className="p-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                                                            title="Navegar caminando"
                                                        >
                                                            <i className="fas fa-person-walking text-xs"></i>
                                                        </button>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                        
                        {/* Footer con estadísticas */}
                        <div className="p-4 bg-gray-50 border-t">
                            <div className="flex justify-between items-center text-sm text-gray-600">
                                <span>Total: {addresses.length} direcciones</span>
                                <span className="flex items-center">
                                    <span className="w-2 h-2 bg-blue-600 rounded-full mr-1"></span>
                                    {addresses.filter(a => !a.isVisited).length} pendientes
                                    <span className="w-2 h-2 bg-red-500 rounded-full ml-3 mr-1"></span>
                                    {addresses.filter(a => a.isVisited).length} visitadas
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TerritoryMapModal; 