import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useApp } from '../../context/AppContext';
import { useToast } from '../../hooks/useToast';
import Icon from '../common/Icon';
import MarkerClusterGroup from 'react-leaflet-cluster';

const GeneralMapModal = ({ isOpen, onClose }) => {
    const { territories, addresses, currentUser, isAdmin, adminEditMode } = useApp();
    const mapRef = useRef(null);
    const mapInstanceRef = useRef(null);
    const [mapError, setMapError] = useState(false);
    const [isMapReady, setIsMapReady] = useState(false);
    const [selectedAddress, setSelectedAddress] = useState(null);
    const [selectedTerritory, setSelectedTerritory] = useState(null);
    const [showQuickAction, setShowQuickAction] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const { showToast } = useToast();
    const markersRef = useRef({});
    const selectedMarkerRef = useRef(null);

    // Estados para geolocalización
    const [userLocation, setUserLocation] = useState(null);
    const [isLocating, setIsLocating] = useState(false);
    const [locationError, setLocationError] = useState(null);
    const userMarkerRef = useRef(null);

    // Estado para filtro de territorio por ID
    const [selectedTerritoryId, setSelectedTerritoryId] = useState(null);
    const [showTerritoryDropdown, setShowTerritoryDropdown] = useState(false);

    // Coordenadas del centro de Guadalajara, Jalisco, México
    const GUADALAJARA_CENTER = { lat: 20.6597, lng: -103.3496 };
    const DEFAULT_ZOOM = 12;

    // Paleta de colores para territorios (15 colores distintos y vibrantes)
    const TERRITORY_COLORS = [
        '#ef4444', // Rojo
        '#3b82f6', // Azul
        '#10b981', // Verde
        '#f59e0b', // Ámbar
        '#8b5cf6', // Violeta
        '#ec4899', // Rosa
        '#14b8a6', // Teal
        '#f97316', // Naranja
        '#6366f1', // Índigo
        '#84cc16', // Lima
        '#06b6d4', // Cian
        '#a855f7', // Púrpura
        '#eab308', // Amarillo
        '#64748b', // Pizarra
        '#dc2626', // Rojo oscuro
    ];

    // Memoizar asignación de colores a territorios
    const territoryColorMap = useMemo(() => {
        const colorMap = new Map();
        territories.forEach((territory, index) => {
            colorMap.set(territory.id, TERRITORY_COLORS[index % TERRITORY_COLORS.length]);
        });
        return colorMap;
    }, [territories]);

    // Función para extraer coordenadas de diferentes formatos
    const extractCoordinatesFromUrl = useCallback((url) => {
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
    }, []);

    const getCoordinates = useCallback((address) => {
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
    }, [extractCoordinatesFromUrl]);

    // Preparar direcciones con coordenadas y territorio
    const addressesWithData = useMemo(() => {
        return addresses
            // IMPORTANTE: Excluir direcciones archivadas (deleted: true)
            .filter(address => !address.deleted)
            .map(address => {
                const coordinates = getCoordinates(address);
                const territory = territories.find(t => t.id === address.territoryId);

                if (!coordinates || !territory) return null;

                return {
                    ...address,
                    coordinates,
                    territory,
                    territoryColor: territoryColorMap.get(address.territoryId) || TERRITORY_COLORS[0]
                };
            })
            .filter(Boolean);
    }, [addresses, territories, getCoordinates, territoryColorMap]);

    // Filtrar direcciones según estado de territorio y búsqueda
    const filteredAddresses = useMemo(() => {
        let result = addressesWithData;

        // Filtro 1: Por territorio específico (ID)
        if (selectedTerritoryId) {
            result = result.filter(address => address.territoryId === selectedTerritoryId);
        }

        // Filtro 2: Por búsqueda
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            result = result.filter(address => {
                return (
                    address.address?.toLowerCase().includes(query) ||
                    address.name?.toLowerCase().includes(query) ||
                    address.notes?.toLowerCase().includes(query) ||
                    address.phone?.toLowerCase().includes(query) ||
                    address.territory.name?.toLowerCase().includes(query) ||
                    address.gender?.toLowerCase().includes(query)
                );
            });
        }

        return result;
    }, [addressesWithData, selectedTerritoryId, searchQuery]);

    // Función para obtener el color basado en el ESTADO DEL TERRITORIO o TIPO DE DIRECCIÓN
    const getAddressColor = useCallback((address) => {
        // PRIORIDAD: Verificar si es revisita o estudio - usar morado
        if (address.isRevisita || address.isEstudio) {
            return '#8b5cf6'; // Morado - Revisitas y Estudios
        }

        // Obtener el estado del territorio
        const territoryStatus = address.territory?.status;

        // Colores según el estado del territorio:
        // Verde = Disponible
        // Amarillo = En uso (tomado)
        // Rojo = Completado/Terminado

        if (territoryStatus === 'Disponible') {
            return '#22c55e'; // Verde - Territorio disponible
        } else if (territoryStatus === 'En uso') {
            return '#eab308'; // Amarillo - Territorio tomado/en uso
        } else if (territoryStatus === 'Completado' || territoryStatus === 'Terminado') {
            return '#ef4444'; // Rojo - Territorio completado
        }

        // Fallback por si no hay estado
        return '#94a3b8'; // Gris
    }, []);

    // Función para obtener color de fondo tenue según estado del territorio
    const getBackgroundColor = useCallback((territoryStatus) => {
        if (territoryStatus === 'Disponible') {
            return 'rgba(34, 197, 94, 0.25)'; // Verde más visible
        } else if (territoryStatus === 'En uso') {
            return 'rgba(234, 179, 8, 0.25)'; // Amarillo más visible
        } else if (territoryStatus === 'Completado' || territoryStatus === 'Terminado') {
            return 'rgba(239, 68, 68, 0.25)'; // Rojo más visible
        }
        return 'rgba(255, 255, 255, 1)'; // Blanco por defecto
    }, []);

    // Función de navegación
    const getNavigationUrl = useCallback((address, mode) => {
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
    }, []);

    const handleNavigate = useCallback((address, mode = 'driving') => {
        const url = getNavigationUrl(address, mode);
        window.open(url, '_blank', 'noopener,noreferrer');

        const modeText = {
            'driving': 'en coche',
            'walking': 'a pie',
            'transit': 'en transporte público'
        };

        showToast(`Navegando ${modeText[mode] || 'al destino'}`, 'success', 2000);
    }, [getNavigationUrl, showToast]);

    // Función para compartir la ubicación
    const handleShare = useCallback(async (address) => {
        let lat, lng;

        // Obtener coordenadas
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

        const googleMapsUrl = lat && lng
            ? `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`
            : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address.address)}`;

        const shareData = {
            title: `${address.territory?.name || 'Territorio'} - ${address.address}`,
            text: `📍 ${address.address}\n🏘️ ${address.territory?.name || 'Territorio'}\n${address.name ? `👤 ${address.name}\n` : ''}${address.phone ? `📞 ${address.phone}\n` : ''}`,
            url: googleMapsUrl
        };

        try {
            // Verificar si el navegador soporta Web Share API
            if (navigator.share) {
                await navigator.share(shareData);
                showToast('Ubicación compartida exitosamente', 'success', 2000);
            } else {
                // Fallback: copiar al portapapeles
                const textToShare = `${shareData.text}\n🔗 ${shareData.url}`;
                await navigator.clipboard.writeText(textToShare);
                showToast('Enlace copiado al portapapeles', 'success', 2000);
            }
        } catch (error) {
            if (error.name !== 'AbortError') {
                showToast('No se pudo compartir la ubicación', 'error', 2000);
            }
        }
    }, [showToast]);

    // Función para obtener la ubicación actual del usuario
    const getUserLocation = useCallback(() => {
        if (!navigator.geolocation) {
            setLocationError('Geolocalización no soportada');
            showToast('Tu navegador no soporta geolocalización', 'error');
            return;
        }

        setIsLocating(true);
        setLocationError(null);

        navigator.geolocation.getCurrentPosition(
            (position) => {
                const { latitude, longitude, accuracy } = position.coords;
                setUserLocation({ lat: latitude, lng: longitude, accuracy });
                setIsLocating(false);
                showToast('Ubicación encontrada', 'success', 2000);

                // Centrar mapa en la ubicación del usuario
                if (mapInstanceRef.current) {
                    mapInstanceRef.current.setView([latitude, longitude], 15, {
                        animate: true,
                        duration: 1
                    });
                }
            },
            (error) => {
                setIsLocating(false);
                let errorMessage = 'No se pudo obtener tu ubicación';

                switch (error.code) {
                    case error.PERMISSION_DENIED:
                        errorMessage = 'Permiso de ubicación denegado. Por favor, activa los permisos en tu navegador.';
                        break;
                    case error.POSITION_UNAVAILABLE:
                        errorMessage = 'Ubicación no disponible';
                        break;
                    case error.TIMEOUT:
                        errorMessage = 'Tiempo de espera agotado';
                        break;
                }

                setLocationError(errorMessage);
                showToast(errorMessage, 'error', 4000);
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 30000
            }
        );
    }, [showToast]);

    // Función para actualizar el marcador de ubicación del usuario
    const updateUserLocationMarker = useCallback(() => {
        if (!mapInstanceRef.current || !userLocation) return;

        // Remover marcador anterior si existe
        if (userMarkerRef.current) {
            mapInstanceRef.current.removeLayer(userMarkerRef.current);
            userMarkerRef.current = null;
        }

        // Crear marcador de ubicación del usuario con diseño distintivo
        const userMarkerHtml = `
            <div class="user-location-marker" style="position: relative; width: 40px; height: 40px;">
                <div class="pulse-ring" style="
                    position: absolute;
                    width: 40px;
                    height: 40px;
                    border-radius: 50%;
                    background-color: rgba(59, 130, 246, 0.3);
                    animation: pulse-ring 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
                "></div>
                <div class="user-dot" style="
                    position: absolute;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%);
                    width: 16px;
                    height: 16px;
                    background-color: #3b82f6;
                    border: 3px solid white;
                    border-radius: 50%;
                    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
                    z-index: 2;
                "></div>
            </div>
        `;

        const userIcon = L.divIcon({
            html: userMarkerHtml,
            iconSize: [40, 40],
            className: 'user-location-icon',
            iconAnchor: [20, 20]
        });

        const userMarker = L.marker(
            [userLocation.lat, userLocation.lng],
            { icon: userIcon, zIndexOffset: 1000 }
        );

        // Agregar tooltip
        userMarker.bindTooltip('Tu ubicación', {
            permanent: false,
            direction: 'top',
            offset: [0, -20]
        });

        userMarker.addTo(mapInstanceRef.current);
        userMarkerRef.current = userMarker;
    }, [userLocation]);

    // Función para limpiar el resaltado del marcador
    const clearMarkerHighlight = useCallback(() => {
        if (selectedMarkerRef.current) {
            // Resetear zIndexOffset de Leaflet
            selectedMarkerRef.current.setZIndexOffset(0);

            const markerElement = selectedMarkerRef.current.getElement();
            if (markerElement) {
                const markerDiv = markerElement.querySelector('.map-marker');
                if (markerDiv) {
                    // Obtener el color original
                    const originalColor = markerDiv.getAttribute('data-original-color');

                    markerDiv.removeAttribute('data-selected');
                    markerDiv.style.transform = 'scale(1)';

                    // Restaurar colores originales
                    if (originalColor) {
                        markerDiv.style.backgroundColor = originalColor;
                        markerDiv.style.color = 'white';
                    }

                    markerDiv.style.boxShadow = '0 3px 8px rgba(0,0,0,0.4)';
                    markerDiv.style.border = '3px solid white';
                    markerDiv.style.zIndex = '1';
                    markerDiv.style.animation = '';
                    markerElement.style.zIndex = '';
                }
            }
            selectedMarkerRef.current = null;
        }
    }, []);

    // Actualizar marcadores en el mapa
    const updateMapMarkers = useCallback(() => {
        if (!mapInstanceRef.current) return;

        // Limpiar marcadores anteriores
        Object.values(markersRef.current).forEach(marker => {
            mapInstanceRef.current.removeLayer(marker);
        });
        markersRef.current = {};

        // Crear grupo de clustering
        const markers = filteredAddresses.map((address, index) => {
            const coords = address.coordinates;
            if (!coords) return null;

            const color = getAddressColor(address);

            // Extraer el número del territorio (ej: "Territorio 1" -> "1")
            const territoryNumber = address.territory.name.match(/\d+/)?.[0] || '?';

            // Crear marcador con icono personalizado mostrando el número del territorio
            const markerHtml = `
                <div class="map-marker-container" style="position: relative; width: 32px; height: 32px;">
                    <div class="map-marker" data-marker-id="${address.id}" data-original-color="${color}" style="
                        background-color: ${color};
                        color: white;
                        width: 32px;
                        height: 32px;
                        border-radius: 50%;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        font-weight: bold;
                        font-size: 14px;
                        border: 3px solid white;
                        box-shadow: 0 3px 8px rgba(0,0,0,0.4);
                        cursor: pointer;
                        transition: all 0.3s ease;
                    ">
                        ${territoryNumber}
                    </div>
                </div>`;

            const customIcon = L.divIcon({
                html: markerHtml,
                iconSize: [32, 32],
                className: 'custom-marker-general',
                iconAnchor: [16, 16]
            });

            const marker = L.marker([coords.lat, coords.lng], { icon: customIcon });

            // Click en marcador
            marker.on('click', () => {
                // Remover resaltado del marcador anterior
                if (selectedMarkerRef.current) {
                    // Resetear zIndexOffset del marcador anterior
                    selectedMarkerRef.current.setZIndexOffset(0);

                    const prevMarkerElement = selectedMarkerRef.current.getElement();
                    if (prevMarkerElement) {
                        const prevMarkerDiv = prevMarkerElement.querySelector('.map-marker');
                        if (prevMarkerDiv) {
                            // Obtener el color original del marcador anterior
                            const prevColor = prevMarkerDiv.getAttribute('data-original-color');

                            prevMarkerDiv.removeAttribute('data-selected');
                            prevMarkerDiv.style.transform = 'scale(1)';

                            // Restaurar colores originales
                            if (prevColor) {
                                prevMarkerDiv.style.backgroundColor = prevColor;
                                prevMarkerDiv.style.color = 'white';
                            }

                            prevMarkerDiv.style.boxShadow = '0 3px 8px rgba(0,0,0,0.4)';
                            prevMarkerDiv.style.border = '3px solid white';
                            prevMarkerDiv.style.zIndex = '1';
                            prevMarkerDiv.style.animation = '';
                        }
                    }
                }

                // Resaltar el marcador seleccionado - DOBLE CÍRCULO
                const markerElement = marker.getElement();
                if (markerElement) {
                    const markerDiv = markerElement.querySelector('.map-marker');

                    if (markerDiv) {
                        // Marcar como seleccionado con data attribute
                        markerDiv.setAttribute('data-selected', 'true');

                        // Aumentar ligeramente el tamaño para mejor visibilidad
                        markerDiv.style.transform = 'scale(1.3)';

                        // INVERTIR COLORES del círculo interior: fondo blanco, texto del color del territorio
                        markerDiv.style.backgroundColor = 'white';
                        markerDiv.style.color = color;

                        // Borde grueso del color del territorio
                        markerDiv.style.border = `4px solid ${color}`;

                        markerDiv.style.zIndex = '10000';
                        markerElement.style.zIndex = '10000';

                        // CRÍTICO: Usar setZIndexOffset de Leaflet para forzar que esté encima
                        marker.setZIndexOffset(10000);

                        // CREAR CÍRCULO EXTERIOR (anillo) - MUY VISIBLE
                        const doubleCircleEffect = `
                            0 0 0 6px white,
                            0 0 0 10px ${color},
                            0 0 0 14px white,
                            0 0 25px ${color},
                            0 0 40px ${color},
                            0 4px 15px rgba(0,0,0,0.5)
                        `;
                        markerDiv.style.boxShadow = doubleCircleEffect;

                        // Animación de pulso en el anillo exterior
                        markerDiv.style.animation = 'pulse-marker 1.5s ease-in-out infinite';
                    }
                }

                selectedMarkerRef.current = marker;
                setSelectedAddress(address);
                setSelectedTerritory(address.territory);
                setShowQuickAction(true);

                // Centrar en el marcador SIN cambiar el zoom
                mapInstanceRef.current.panTo([coords.lat, coords.lng], {
                    animate: true,
                    duration: 0.5
                });
            });

            markersRef.current[address.id] = marker;
            marker.addTo(mapInstanceRef.current);

            return marker;
        }).filter(Boolean);

        // Ajustar vista si hay marcadores filtrados
        if (markers.length > 0 && searchQuery.trim()) {
            const group = L.featureGroup(markers);
            const bounds = group.getBounds();
            if (bounds.isValid()) {
                mapInstanceRef.current.fitBounds(bounds, {
                    padding: [50, 50],
                    maxZoom: 15
                });
            }
        }
    }, [filteredAddresses, getAddressColor, searchQuery]);

    // Inicializar mapa
    useEffect(() => {
        if (!isOpen) return;

        const initializeMap = () => {
            if (!mapRef.current) {
                setMapError(true);
                return;
            }

            if (mapInstanceRef.current) return;

            try {
                if (typeof L.map !== 'function') {
                    throw new Error('L.map no es una función válida');
                }

                // Crear mapa centrado en Guadalajara con zoom ULTRA fluido
                const map = L.map(mapRef.current, {
                    zoomControl: true,
                    attributionControl: true,
                    preferCanvas: true,

                    // Zoom super fluido - OPTIMIZADO PARA VELOCIDAD
                    zoomSnap: 1,                   // ⚡ Incrementos enteros = más rápido
                    zoomDelta: 1,                  // Cambio de zoom por cada scroll
                    wheelPxPerZoomLevel: 60,       // ⚡ Más píxeles = menos eventos
                    wheelDebounceTime: 50,         // ⚡ Más debounce = menos lag

                    // CRÍTICO: Sin animaciones = ZOOM INSTANTÁNEO
                    zoomAnimation: false,          // ⚡ SIN animación = instantáneo
                    fadeAnimation: false,          // ⚡ Sin fade
                    markerZoomAnimation: false,    // ⚡ Sin animación de marcadores
                    zoomAnimationThreshold: 99,    // ⚡ Nunca animar

                    // Pan/arrastre optimizado
                    inertia: false,                // ⚡ Sin inercia = más control
                    trackResize: true,
                    worldCopyJump: false,

                    // Touch optimizado
                    touchZoom: true,               // ⚡ Touch zoom simple
                    scrollWheelZoom: true,
                    doubleClickZoom: 'center',     // ⚡ Centrar en doble click
                    boxZoom: true,

                    // Drag (arrastre) optimizado
                    dragging: true,
                    tap: true,
                    tapTolerance: 15,

                    // Sin límites molestos
                    bounceAtZoomLimits: false,
                    maxBoundsViscosity: 0.0
                }).setView([GUADALAJARA_CENTER.lat, GUADALAJARA_CENTER.lng], DEFAULT_ZOOM);

                if (!map) {
                    throw new Error('Failed to create Leaflet map instance');
                }

                // Capa de tiles optimizada para carga rápida
                const tileLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                    attribution: '© OpenStreetMap',
                    maxZoom: 19,
                    minZoom: 10,

                    // Optimización de carga para zoom fluido
                    updateWhenIdle: false,        // Actualizar mientras se mueve
                    updateWhenZooming: false,     // NO actualizar durante zoom = más rápido
                    updateInterval: 100,          // Actualizar cada 100ms
                    keepBuffer: 2,                // Menos buffer = más rápido
                    maxNativeZoom: 18,
                    detectRetina: true,

                    // Crossorigin para evitar errores CORS
                    crossOrigin: true
                });

                tileLayer.addTo(map);

                mapInstanceRef.current = map;
                setIsMapReady(true);

            } catch (error) {
                console.error('Error al inicializar el mapa:', error);
                setMapError(true);
            }
        };

        const checkLeaflet = async () => {
            try {
                if (typeof L === 'undefined' || !window.leafletJSLoaded) {

                    if (typeof window.loadLeafletCSS !== 'function' || typeof window.loadLeafletJS !== 'function') {
                        throw new Error('Funciones de carga de Leaflet no están disponibles');
                    }

                    await Promise.all([
                        window.loadLeafletCSS(),
                        window.loadLeafletJS()
                    ]);

                    await new Promise(resolve => setTimeout(resolve, 200));
                }

                if (typeof L !== 'undefined' && L.map && typeof L.map === 'function') {
                    initializeMap();
                } else {
                    console.error('Leaflet no se cargó correctamente');
                    setMapError(true);
                }
            } catch (error) {
                console.error('Error cargando Leaflet:', error);
                setMapError(true);
            }
        };

        document.body.classList.add('map-modal-open');
        checkLeaflet();

        return () => {
            document.body.classList.remove('map-modal-open');

            if (mapInstanceRef.current) {
                mapInstanceRef.current.remove();
                mapInstanceRef.current = null;
            }
            setIsMapReady(false);
            setMapError(false);
            setSelectedAddress(null);
            setSelectedTerritory(null);
            setShowQuickAction(false);
        };
    }, [isOpen]);

    // Actualizar marcadores cuando cambian los filtros
    useEffect(() => {
        if (!isOpen || !isMapReady || !mapInstanceRef.current) return;

        updateMapMarkers();

        setTimeout(() => {
            if (mapInstanceRef.current) {
                mapInstanceRef.current.invalidateSize();
            }
        }, 100);
    }, [isOpen, isMapReady, updateMapMarkers]);

    // Actualizar marcador de ubicación del usuario
    useEffect(() => {
        if (!isOpen || !isMapReady || !mapInstanceRef.current) return;

        updateUserLocationMarker();
    }, [isOpen, isMapReady, userLocation, updateUserLocationMarker]);

    // Obtener ubicación automáticamente al abrir el mapa
    useEffect(() => {
        if (!isOpen || !isMapReady || !mapInstanceRef.current) return;

        // Llamar a getUserLocation solo una vez cuando el mapa esté listo
        getUserLocation();
    }, [isMapReady, getUserLocation]); // Solo cuando el mapa esté listo

    // Control del scroll del body
    useEffect(() => {
        if (isOpen) {
            const scrollY = window.scrollY;
            document.body.style.position = 'fixed';
            document.body.style.top = `-${scrollY}px`;
            document.body.style.width = '100%';
            document.body.style.overflow = 'hidden';

            return () => {
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
            {/* Estilos CSS para animaciones */}
            <style>{`
                @keyframes pulse-marker {
                    0%, 100% {
                        opacity: 1;
                    }
                    50% {
                        opacity: 0.7;
                    }
                }

                @keyframes pulse-ring {
                    0% {
                        transform: scale(0.8);
                        opacity: 1;
                    }
                    50% {
                        transform: scale(1.2);
                        opacity: 0.6;
                    }
                    100% {
                        transform: scale(0.8);
                        opacity: 1;
                    }
                }

                /* Asegurar que los marcadores tengan transiciones suaves */
                .map-marker {
                    transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1),
                                box-shadow 0.2s ease,
                                border 0.2s ease !important;
                }

                /* Forzar visibilidad del marcador seleccionado */
                .map-marker[data-selected="true"] {
                    z-index: 10000 !important;
                    position: relative !important;
                }

                /* Asegurar que los marcadores no se oculten */
                .leaflet-marker-icon {
                    z-index: auto !important;
                }

                /* Marker container con z-index alto */
                .custom-marker-general {
                    z-index: auto !important;
                }
            `}</style>

            {/* Header */}
            <div className="text-white px-4 py-4 shadow-lg" style={{ backgroundColor: '#2C3E50' }}>
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center">
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-white/20 rounded-full transition-colors mr-3"
                            aria-label="Cerrar mapa"
                        >
                            <Icon name="arrowLeft" size={24} />
                        </button>
                        <div>
                            <h2 className="text-xl font-bold">Mapa General de Guadalajara</h2>
                            <p className="text-sm text-gray-300">
                                {filteredAddresses.length} de {addressesWithData.length} direcciones
                            </p>
                        </div>
                    </div>

                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-white/20 rounded-full transition-colors"
                    >
                        <Icon name="x" size={24} />
                    </button>
                </div>

                {/* Buscador universal */}
                <div className="relative">
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Buscar por dirección"
                        className="w-full px-4 py-3 pl-12 pr-10 rounded-xl text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-white/50"
                    />
                    <Icon
                        name="search"
                        size={20}
                        className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400"
                    />
                    {searchQuery && (
                        <button
                            onClick={() => setSearchQuery('')}
                            className="absolute right-3 top-1/2 transform -translate-y-1/2 p-1 hover:bg-gray-200 rounded-full transition-colors"
                        >
                            <Icon name="x" size={16} className="text-gray-500" />
                        </button>
                    )}
                </div>
            </div>

            {/* Mapa */}
            <div className="flex-1 relative bg-gray-100" style={{ touchAction: 'none', overflow: 'hidden' }}>
                {mapError ? (
                    <div className="absolute inset-0 flex items-center justify-center text-center p-4">
                        <div>
                            <Icon name="mapOff" size={48} className="text-gray-400 mx-auto mb-4" />
                            <p className="text-gray-600 font-medium">No se pudo cargar el mapa</p>
                            <p className="text-gray-500 text-sm">Intenta recargar la página</p>
                        </div>
                    </div>
                ) : (
                    <>
                        {!isMapReady && (
                            <div className="absolute inset-0 flex items-center justify-center bg-white z-10">
                                <div className="text-center">
                                    <div className="animate-spin w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full mx-auto"></div>
                                    <p className="text-gray-600 mt-4 text-sm">Cargando mapa de Guadalajara...</p>
                                </div>
                            </div>
                        )}
                        <div
                            ref={mapRef}
                            className="w-full h-full"
                            style={{
                                touchAction: 'manipulation',
                                // Aceleración por hardware para zoom ultra fluido
                                transform: 'translateZ(0)',
                                willChange: 'transform',
                                backfaceVisibility: 'hidden',
                                perspective: 1000
                            }}
                        />

                        {/* Dropdown de filtro discreto (top-left) */}
                        <div className="absolute top-4 left-4 z-20">
                            <div className="relative">
                                <button
                                    onClick={() => setShowTerritoryDropdown(!showTerritoryDropdown)}
                                    className={`w-10 h-10 bg-white rounded-lg shadow-md border border-gray-200 hover:shadow-lg transition-all duration-200 flex items-center justify-center ${
                                        selectedTerritoryId ? 'border-[#2C3E50]' : ''
                                    }`}
                                    style={selectedTerritoryId ? { backgroundColor: '#2C3E50' } : {}}
                                    title={selectedTerritoryId ? `Territorio ${territories.find(t => t.id === selectedTerritoryId)?.name.match(/\d+/)?.[0]}` : 'Filtrar'}
                                >
                                    {selectedTerritoryId ? (
                                        <span className="text-sm font-bold text-white">
                                            {territories.find(t => t.id === selectedTerritoryId)?.name.match(/\d+/)?.[0]}
                                        </span>
                                    ) : (
                                        <Icon name="filter" size={18} className="text-gray-600" />
                                    )}
                                </button>

                                {/* Dropdown panel compacto */}
                                {showTerritoryDropdown && (
                                        <div className="absolute top-full left-0 mt-2 bg-white rounded-2xl shadow-2xl border border-gray-100 w-32 overflow-hidden z-20 backdrop-blur-sm" style={{ maxHeight: 'calc(100vh - 200px)' }}>
                                            {/* Header elegante con color de la app */}
                                            <div className="px-4 py-3 flex items-center justify-between" style={{ background: 'linear-gradient(135deg, #2C3E50 0%, #34495e 100%)' }}>
                                                <div className="flex items-center gap-1.5">
                                                    <div className="w-6 h-6 bg-white/20 rounded-lg flex items-center justify-center backdrop-blur-sm">
                                                        <Icon name="map" size={12} className="text-white" />
                                                    </div>
                                                    <span className="text-xs font-semibold text-white">Terr.</span>
                                                </div>
                                                {selectedTerritoryId && (
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setSelectedTerritoryId(null);
                                                        }}
                                                        className="w-5 h-5 bg-white/20 hover:bg-white/30 rounded-md flex items-center justify-center transition-colors backdrop-blur-sm"
                                                        title="Limpiar filtro"
                                                    >
                                                        <Icon name="x" size={12} className="text-white" />
                                                    </button>
                                                )}
                                            </div>

                                            {/* Lista elegante con badges */}
                                            <div className="overflow-y-auto p-2 space-y-1.5" style={{ maxHeight: 'calc(100vh - 260px)' }}>
                                                {territories
                                                    .sort((a, b) => {
                                                        const numA = parseInt(a.name.match(/\d+/)?.[0] || '0');
                                                        const numB = parseInt(b.name.match(/\d+/)?.[0] || '0');
                                                        return numA - numB;
                                                    })
                                                    .map(territory => {
                                                        const isSelected = selectedTerritoryId === territory.id;
                                                        const territoryNumber = territory.name.match(/\d+/)?.[0] || '?';

                                                        return (
                                                            <button
                                                                key={territory.id}
                                                                onClick={() => {
                                                                    // Toggle: si ya está seleccionado, quitar filtro; si no, seleccionar
                                                                    if (isSelected) {
                                                                        setSelectedTerritoryId(null);
                                                                    } else {
                                                                        setSelectedTerritoryId(territory.id);
                                                                    }
                                                                    setShowTerritoryDropdown(false);
                                                                }}
                                                                className={`w-full rounded-xl transition-all duration-200 transform hover:scale-105 ${
                                                                    isSelected ? 'shadow-lg' : ''
                                                                }`}
                                                            >
                                                                <div
                                                                    className="flex items-center justify-center p-3 rounded-xl"
                                                                    style={isSelected
                                                                        ? { background: 'linear-gradient(135deg, #2C3E50 0%, #34495e 100%)' }
                                                                        : {}
                                                                    }
                                                                >
                                                                    <div className={`flex items-center justify-center p-3 rounded-xl w-full ${
                                                                        !isSelected ? 'bg-gradient-to-br from-gray-50 to-gray-100 hover:from-gray-100 hover:to-gray-200' : ''
                                                                    }`}>
                                                                        <div className="flex items-center gap-2">
                                                                            {/* Ícono de casa sin fondo */}
                                                                            <Icon
                                                                                name="home"
                                                                                size={16}
                                                                                style={isSelected ? { color: 'white' } : { color: '#2C3E50' }}
                                                                            />
                                                                            {/* Número grande */}
                                                                            <span className={`text-base font-bold ${
                                                                                isSelected ? 'text-white' : 'text-gray-800'
                                                                            }`}>
                                                                                {territoryNumber}
                                                                            </span>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </button>
                                                        );
                                                    })}
                                            </div>
                                        </div>
                                )}
                            </div>
                        </div>

                        {/* Botón flotante de ubicación (bottom-right) */}
                        <div className="absolute bottom-4 right-4 z-20">
                            <button
                                onClick={getUserLocation}
                                disabled={isLocating}
                                className={`w-12 h-12 bg-white rounded-full shadow-lg border border-gray-200 hover:shadow-xl transition-all duration-200 flex items-center justify-center group ${
                                    isLocating ? 'opacity-50 cursor-not-allowed' : ''
                                } ${userLocation ? 'bg-blue-50 border-blue-300' : ''}`}
                                title="Mi ubicación"
                            >
                                {isLocating ? (
                                    <div className="animate-spin w-6 h-6 border-3 border-blue-600 border-t-transparent rounded-full"></div>
                                ) : (
                                    <Icon
                                        name="crosshair"
                                        size={24}
                                        className={`transition-colors ${
                                            userLocation ? 'text-blue-600' : 'text-gray-600 group-hover:text-blue-600'
                                        }`}
                                    />
                                )}
                            </button>
                        </div>
                    </>
                )}
            </div>

            {/* Panel de acción rápida */}
            {showQuickAction && selectedAddress && selectedTerritory && (
                <div className="absolute bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg animate-slide-up z-20">
                    <div className="px-4 py-3">
                        {/* Header del panel */}
                        <div className="flex items-start justify-between mb-2">
                            <div className="flex items-start flex-1 mr-2">
                                <div
                                    className="w-6 h-6 rounded-full mr-3 flex items-center justify-center flex-shrink-0"
                                    style={{ backgroundColor: getAddressColor(selectedAddress) }}
                                >
                                    {selectedTerritory.status === 'Disponible' ? (
                                        <i className="fas fa-check text-white text-xs"></i>
                                    ) : selectedTerritory.status === 'En uso' ? (
                                        <i className="fas fa-user text-white text-xs"></i>
                                    ) : (
                                        <i className="fas fa-times text-white text-xs"></i>
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h3 className="font-bold text-gray-900 text-sm leading-tight inline">
                                        {selectedAddress.address}
                                        <button
                                            onClick={() => handleShare(selectedAddress)}
                                            className="inline-flex items-center justify-center ml-2 p-1 hover:bg-indigo-50 rounded-full transition-colors align-middle"
                                            title="Compartir ubicación"
                                        >
                                            <Icon name="share" size={14} className="text-indigo-600" />
                                        </button>
                                    </h3>
                                    <p className="text-xs text-gray-600 mt-0.5">
                                        <span className="font-semibold">{selectedTerritory.name}</span>
                                        {selectedAddress.name && ` • ${selectedAddress.name}`}
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => {
                                    setShowQuickAction(false);
                                    clearMarkerHighlight();
                                }}
                                className="p-2 hover:bg-gray-100 rounded-full transition-colors flex-shrink-0"
                            >
                                <Icon name="x" size={18} className="text-gray-400" />
                            </button>
                        </div>

                        {/* Información adicional */}
                        <div className="mb-3 space-y-1">
                            {selectedAddress.phone && (
                                <p className="text-sm text-gray-700">
                                    <Icon name="phone" size={14} className="inline mr-2 text-gray-500" />
                                    {selectedAddress.phone}
                                </p>
                            )}
                            {selectedAddress.gender && selectedAddress.gender !== 'Desconocido' && (
                                <p className="text-sm text-gray-700">
                                    <Icon name="user" size={14} className="inline mr-2 text-gray-500" />
                                    {selectedAddress.gender}
                                </p>
                            )}
                            {selectedAddress.notes && (
                                <div className="p-2 bg-blue-50 border border-blue-200 rounded-md">
                                    <p className="text-xs text-blue-700">
                                        <Icon name="info" size={12} className="inline mr-1" />
                                        {selectedAddress.notes}
                                    </p>
                                </div>
                            )}
                            <div className="flex items-center flex-wrap gap-2 text-xs">
                                {/* Estado del territorio con ícono */}
                                <span className={`px-2 py-1 rounded-full font-semibold flex items-center gap-1 ${
                                    selectedTerritory.status === 'Disponible'
                                        ? 'bg-green-100 text-green-700'
                                        : selectedTerritory.status === 'En uso'
                                        ? 'bg-yellow-100 text-yellow-700'
                                        : 'bg-red-100 text-red-700'
                                }`}>
                                    {selectedTerritory.status === 'Disponible' ? (
                                        <i className="fas fa-check-circle"></i>
                                    ) : selectedTerritory.status === 'En uso' ? (
                                        <i className="fas fa-user"></i>
                                    ) : (
                                        <i className="fas fa-times-circle"></i>
                                    )}
                                    <span>{selectedTerritory.status}</span>
                                </span>
                                {selectedAddress.isRevisita && (
                                    <span className="px-2 py-1 rounded-full bg-purple-100 text-purple-700 font-medium flex items-center gap-1">
                                        <i className="fas fa-redo"></i>
                                        <span>Revisita {selectedAddress.revisitaBy && `• ${selectedAddress.revisitaBy}`}</span>
                                    </span>
                                )}
                                {selectedAddress.isEstudio && (
                                    <span className="px-2 py-1 rounded-full bg-purple-100 text-purple-700 font-medium flex items-center gap-1">
                                        <i className="fas fa-book"></i>
                                        <span>Estudio {selectedAddress.estudioBy && `• ${selectedAddress.estudioBy}`}</span>
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Botones de navegación */}
                        <div className="flex gap-2 w-full">
                            <button
                                onClick={() => handleNavigate(selectedAddress, 'driving')}
                                className="flex-1 p-3 bg-slate-500 hover:bg-slate-600 text-white rounded-lg transition-colors flex items-center justify-center"
                                title="Navegar en carro"
                            >
                                <i className="fas fa-car text-lg"></i>
                            </button>
                            <button
                                onClick={() => handleNavigate(selectedAddress, 'walking')}
                                className="flex-1 p-3 bg-slate-500 hover:bg-slate-600 text-white rounded-lg transition-colors flex items-center justify-center"
                                title="Navegar caminando"
                            >
                                <i className="fas fa-person-walking text-lg"></i>
                            </button>
                            <button
                                onClick={() => handleNavigate(selectedAddress, 'transit')}
                                className="flex-1 p-3 bg-slate-500 hover:bg-slate-600 text-white rounded-lg transition-colors flex items-center justify-center"
                                title="Transporte público"
                            >
                                <i className="fas fa-bus text-lg"></i>
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default GeneralMapModal;
