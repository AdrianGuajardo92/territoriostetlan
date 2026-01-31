import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useToast } from '../../hooks/useToast';
import Icon from '../common/Icon';

const TerritoryMapModal = ({
  isOpen,
  onClose,
  territory,
  addresses,
  isAssignedToMe,
  isAdmin,
  adminEditMode = false, // ✅ NUEVA PROP PARA MODO ADMINISTRADOR
  onEditAddress,
  sortState,
  onOptimizedRoute,
  onResetSort,
  onToggleAddressStatus,
  onForceLocationUpdate, // ✅ NUEVA PROP PARA FORZAR ACTUALIZACIÓN DE UBICACIÓN
  modalId = 'territory-map-modal' // ID único para el historial
}) => {
    
    const mapRef = useRef(null);
    const mapInstanceRef = useRef(null);
    const [mapError, setMapError] = useState(false);
    const [isMapReady, setIsMapReady] = useState(false);
    const [selectedAddress, setSelectedAddress] = useState(null);
    const [selectedAddressIndex, setSelectedAddressIndex] = useState(null);
    const [showQuickAction, setShowQuickAction] = useState(false);
    const { showToast } = useToast();
    const markersRef = useRef({});
    const routeLineRef = useRef(null);
    
    // OPTIMIZACIÓN: Memoizar coordenadas para evitar recálculos ⚡
    const addressesWithCoords = useMemo(() => {
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

        // Paso 1: Obtener direcciones con coordenadas válidas
        let addressesWithValidCoords = addresses.map(address => ({
            ...address,
            coordinates: getCoordinates(address)
        })).filter(addr => addr.coordinates);

        // Paso 2: REORDENAR SI LA RUTA ESTÁ OPTIMIZADA
        if (sortState.sortOrder === 'optimized' && sortState.optimizedRoute) {
            // Crear un mapa para acceso rápido por ID
            const addressMap = new Map(addressesWithValidCoords.map(addr => [addr.id, addr]));
            
            // Reordenar según la ruta optimizada y añadir routeOrder
            addressesWithValidCoords = sortState.optimizedRoute
                .map(routeItem => addressMap.get(routeItem.id))
                .filter(Boolean) // Filtrar items no encontrados
                .map((address, index) => ({
                    ...address,
                    routeOrder: index + 1 // Añadir número de orden para los marcadores
                }));
        }

        return addressesWithValidCoords;
    }, [addresses, sortState.sortOrder, sortState.optimizedRoute]);

    // Hash para detectar cambios reales en marcadores - PREVIENE RE-RENDERS
    const markersHash = useMemo(() => {
        return addressesWithCoords.map(addr => 
            `${addr.id}-${addr.isVisited}-${addr.coordinates.lat}-${addr.coordinates.lng}-${sortState.sortOrder === 'optimized' ? addr.routeOrder || 0 : 0}`
        ).join('|');
    }, [addressesWithCoords, sortState.sortOrder, sortState.optimizedRoute]);

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
    const getAddressColor = useCallback((address) => {
        // Prioridad 1: Morado para revisitas o estudios (independiente del estado de visitado)
        if ((address.isRevisita && address.revisitaBy) || (address.isEstudio && address.estudioBy)) {
            return '#9333ea'; // Morado - purple-600
        }
        
        // Prioridad 2: Estado normal de visitado/pendiente
        if (address.isVisited) return '#ef4444'; // Rojo - Visitada
        return '#22c55e'; // Verde - Pendiente
    }, []);
    
    // Función para obtener coordenadas - OPTIMIZADA
    const getCoordinates = useCallback((address) => {
        // Buscar en el array memoizado
        const addressWithCoords = addressesWithCoords.find(a => a.id === address.id);
        return addressWithCoords?.coordinates || null;
    }, [addressesWithCoords]);
    
    // OPTIMIZACIÓN: UpdateMapMarkers inteligente - Solo actualiza lo que ha cambiado ⚡
    // MOVIDO ANTES DE handleQuickToggleVisited para resolver error de inicialización
    const updateMapMarkers = useCallback((addressesToShow, forceUpdate = false) => {
        if (!mapInstanceRef.current) return;
        
        const currentAddressIds = new Set(addressesToShow.map(a => a.id));
        const existingMarkerIds = new Set(Object.keys(markersRef.current));
        
        // Eliminar marcadores que ya no existen
        existingMarkerIds.forEach(id => {
            if (!currentAddressIds.has(id)) {
                mapInstanceRef.current.removeLayer(markersRef.current[id]);
                delete markersRef.current[id];
            }
        });
        
        const markersGroup = L.featureGroup();
        let validMarkersCount = 0;
        let needsFitBounds = false;
        
        addressesToShow.forEach((address, index) => {
            const coords = getCoordinates(address);
            if (!coords) return;
            
            validMarkersCount++;
            const displayNumber = sortState.sortOrder === 'optimized' && address.routeOrder ? address.routeOrder : validMarkersCount;
            const color = getAddressColor(address);
            
            const existingMarker = markersRef.current[address.id];
            
            // Solo recrear marcador si no existe o ha cambiado
            if (!existingMarker || forceUpdate) {
                // Eliminar marcador existente si existe
                if (existingMarker) {
                    mapInstanceRef.current.removeLayer(existingMarker);
                }
                
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
                marker.addTo(mapInstanceRef.current);
                needsFitBounds = true;
            }
            
            markersGroup.addLayer(markersRef.current[address.id]);
        });
        
        // Solo ajustar vista si hay nuevos marcadores o se fuerza
        if (needsFitBounds || forceUpdate) {
            if(Object.keys(markersRef.current).length > 0) {
                try {
                    const markerBounds = markersGroup.getBounds();
                    if (markerBounds.isValid()) {
                        mapInstanceRef.current.fitBounds(markerBounds, { 
                            padding: [20, 20],
                            maxZoom: 17 // Evitar zoom excesivo para una sola dirección
                        });
                    }
                } catch (error) {
                    // Error ajustando vista del mapa - ignorar silenciosamente
                }
            }
        }

        // ✅ MARCADOR DE UBICACIÓN DEL USUARIO - PIN ESTILO GOOGLE MAPS
        if (sortState.userLocation && mapInstanceRef.current && !mapInstanceRef.current._userLocationMarker) {
            const userIcon = L.divIcon({
                html: `<div style="
                    position: relative;
                    width: 32px;
                    height: 44px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    transform: translateY(-44px);
                ">
                    <!-- PIN CON FORMA DE GOTA ESTILO GOOGLE MAPS -->
                    <i class="fas fa-map-marker-alt" style="
                        font-size: 40px;
                        color: #dc2626;
                        text-shadow: 
                            -2px -2px 0 #000,
                            2px -2px 0 #000,
                            -2px 2px 0 #000,
                            2px 2px 0 #000;
                        filter: drop-shadow(0 4px 8px rgba(0,0,0,0.3));
                    "></i>
                    <!-- CÍRCULO INTERIOR BLANCO -->
                    <div style="
                        position: absolute;
                        top: 6px;
                        left: 50%;
                        transform: translateX(-50%);
                        width: 16px;
                        height: 16px;
                        background-color: white;
                        border-radius: 50%;
                        border: 1px solid #000;
                    "></div>
                    <!-- ANIMACIÓN DE PULSO -->
                    <div style="
                        position: absolute;
                        top: 50%;
                        left: 50%;
                        transform: translate(-50%, -50%);
                        width: 60px;
                        height: 60px;
                        background-color: rgba(220, 38, 38, 0.2);
                        border-radius: 50%;
                        animation: userLocationPulse 2s infinite;
                    "></div>
                </div>
                <style>
                    @keyframes userLocationPulse {
                        0% { transform: translate(-50%, -50%) scale(0.5); opacity: 1; }
                        100% { transform: translate(-50%, -50%) scale(1.5); opacity: 0; }
                    }
                </style>`,
                iconSize: [32, 44],
                iconAnchor: [16, 44], // Anclar en la punta del pin
                className: 'user-location-pin'
            });
            
            const userMarker = L.marker([sortState.userLocation.lat, sortState.userLocation.lng], { icon: userIcon })
                .addTo(mapInstanceRef.current)
                .bindPopup(`
                    <div style="text-align: center; font-weight: bold; color: #dc2626;">
                        📍 Tu ubicación actual
                    </div>
                `);
            
            // Marcar para no recrear
            mapInstanceRef.current._userLocationMarker = userMarker;
            
    
        }
    }, [getCoordinates, getAddressColor, sortState.sortOrder, sortState.userLocation, addresses]);
    
    // OPTIMIZACIÓN: HandleQuickToggleVisited sin re-renders innecesarios ⚡
    const handleQuickToggleVisited = useCallback(async (address) => {
        try {
            const updatedAddress = {
                ...address,
                isVisited: !address.isVisited,
                lastUpdated: new Date()
            };
            
            // ACTUALIZACIÓN INSTANTÁNEA DEL MARCADOR - ANTES DE ESPERAR LA RESPUESTA ⚡
            if (markersRef.current[address.id] && mapInstanceRef.current) {
                const coords = getCoordinates(address);
                if (coords) {
                    // Obtener el número del marcador actual
                    const currentAddressIndex = addressesWithCoords.findIndex(a => a.id === address.id);
                    const validMarkersCount = addressesWithCoords.slice(0, currentAddressIndex + 1).length;
                    const displayNumber = sortState.sortOrder === 'optimized' && address.routeOrder 
                        ? address.routeOrder 
                        : validMarkersCount;
                    
                    // Color actualizado basado en el nuevo estado
                    const newColor = getAddressColor(updatedAddress);
                    
                    // Crear nuevo marcador con estado actualizado
                    const markerHtml = `
                        <div style="
                            background-color: ${newColor}; 
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
                            animation: markerUpdate 0.4s ease-out;
                        " class="map-marker">
                            ${displayNumber}
                        </div>`;
                    
                    const customIcon = L.divIcon({ 
                        html: markerHtml, 
                        iconSize: [36, 36], 
                        className: 'custom-marker-updated',
                        iconAnchor: [18, 18]
                    });
                    
                    // Remover marcador anterior
                    mapInstanceRef.current.removeLayer(markersRef.current[address.id]);
                    
                    // Crear nuevo marcador con estado actualizado
                    const newMarker = L.marker([coords.lat, coords.lng], { icon: customIcon });
                    
                    // Re-añadir event listener
                    newMarker.on('click', () => {
                        // Usar el estado actualizado optimísticamente
                        setSelectedAddress(updatedAddress);
                        const newIndex = addressesWithCoords.findIndex(a => a.id === address.id);
                        setSelectedAddressIndex(newIndex);
                        setShowQuickAction(true);
                    });
                    
                    // Añadir al mapa y actualizar referencia
                    newMarker.addTo(mapInstanceRef.current);
                    markersRef.current[address.id] = newMarker;
                }
            }
            
            // Actualizar inmediatamente la dirección seleccionada con estado optimista
            setSelectedAddress(updatedAddress);
            
            // CORRECCIÓN: Ejecutar la actualización del backend con parámetros correctos ⚡
            // Solo pasar los campos que cambiaron para el toggle
            const toggleData = {
                isVisited: updatedAddress.isVisited,
                lastUpdated: updatedAddress.lastUpdated
            };
            await onToggleAddressStatus(address.id, toggleData);
            
            // MEJORA UX: Mantener el panel abierto con feedback visual mejorado ⚡
            // En lugar de cerrar inmediatamente, mantener abierto para más acciones
            // setShowQuickAction(false); // ❌ Comentado - mantener abierto
            
            // ✅ Feedback visual temporal de éxito
            showToast(
                updatedAddress.isVisited ? 'Dirección marcada como visitada' : 'Dirección marcada como pendiente', 
                'success',
                2000 // Toast breve para no interferir
            );
            
        } catch (error) {
            // Error al actualizar dirección
            showToast('Error al actualizar la dirección', 'error');
            
            // En caso de error, revertir el estado optimista
            if (markersRef.current[address.id] && mapInstanceRef.current) {
                // Forzar actualización completa de marcadores para revertir cambio visual
                updateMapMarkers(addressesWithCoords, true);
            }
            
            // Revertir dirección seleccionada al estado original
            setSelectedAddress(address);
        }
    }, [onToggleAddressStatus, showToast, getCoordinates, addressesWithCoords, sortState.sortOrder, updateMapMarkers]);
    
    // OPTIMIZACIÓN: HandleNavigate SÚPER MEJORADA - Igual que AddressCard ⚡
    const getNavigationUrl = useCallback((address, mode) => {
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
    }, []);

    const handleNavigate = useCallback((address, mode = 'driving') => {
        // Generar URL optimizada
        const url = getNavigationUrl(address, mode);
        
        // Guardar el estado actual en sessionStorage antes de navegar
        if (window.sessionStorage && territory) {
            sessionStorage.setItem('lastTerritoryId', territory.id);
            sessionStorage.setItem('navigationTimestamp', Date.now().toString());
        }
        
        // Abrir en nueva ventana/pestaña
        window.open(url, '_blank', 'noopener,noreferrer');
        
        // Feedback visual en toast
        const modeText = {
            'driving': 'en coche',
            'walking': 'a pie', 
            'transit': 'en transporte público'
        };
        
        showToast(`Navegando ${modeText[mode] || 'al destino'}`, 'success', 2000);
    }, [getNavigationUrl, territory, showToast]);
    
    // OPTIMIZACIÓN: DrawRouteLine memoizada - Solo recalcula cuando cambia la ruta ⚡
    const routeCoordinates = useMemo(() => {
        if (sortState.sortOrder !== 'optimized') return null;
        
        const routeCoords = [];
        
        // Añadir ubicación del usuario si existe
        if (sortState.userLocation) {
            routeCoords.push([sortState.userLocation.lat, sortState.userLocation.lng]);
        }
        
        // ✅ SOLO DIRECCIONES PENDIENTES (no visitadas) para la línea de ruta
        const pendingAddresses = addressesWithCoords.filter(address => !address.isVisited);
        
        // Añadir coordenadas de las direcciones pendientes en orden
        pendingAddresses.forEach(address => {
            if (address.coordinates) {
                routeCoords.push([address.coordinates.lat, address.coordinates.lng]);
            }
        });
        
        return routeCoords.length > 1 ? routeCoords : null;
    }, [sortState.sortOrder, sortState.userLocation, addressesWithCoords]);

    const drawRouteLine = useCallback(() => {
        if (!mapInstanceRef.current) return;

        // Limpiar línea de ruta anterior
        if (routeLineRef.current) {
            mapInstanceRef.current.removeLayer(routeLineRef.current);
            routeLineRef.current = null;
        }
        
        // Dibujar línea de ruta si hay coordenadas
        if (routeCoordinates) {
            routeLineRef.current = L.polyline(routeCoordinates, { 
                color: '#4f46e5', 
                weight: 3, 
                opacity: 0.7, 
                dashArray: '10, 10', 
                lineJoin: 'round',
                lineCap: 'round'
            }).addTo(mapInstanceRef.current);
            
            // Añadir tooltip con información de la ruta (solo direcciones pendientes)
            const pendingCount = routeCoordinates.length - (sortState.userLocation ? 1 : 0);
            routeLineRef.current.bindTooltip(
                `Ruta optimizada: ${pendingCount} direcciones pendientes`, 
                { permanent: false, direction: 'center' }
            );
        }
    }, [routeCoordinates, sortState.userLocation]);
    
    useEffect(() => {
        if (!isOpen) return;

        const initializeMap = () => {
            if (!mapRef.current) {
                setMapError(true);
                return;
            }

            if (mapInstanceRef.current) {
                return;
            }

            try {
                if (addressesWithCoords.length === 0) {
                    setMapError(true);
                    return;
                }
                
                // Verificar que L.map está disponible antes de usar
                if (typeof L.map !== 'function') {
                    throw new Error('L.map no es una función válida');
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
                
                // Verificar que el mapa se creó correctamente
                if (!map) {
                    throw new Error('Failed to create Leaflet map instance');
                }
                
                // Capa de tiles súper optimizada
                const tileLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { 
                    attribution: '© OpenStreetMap', 
                    maxZoom: 19,
                    minZoom: 10,
                    // Optimizaciones máximas de carga
                    updateWhenIdle: false,
                    updateWhenZooming: true,
                    keepBuffer: 4,
                    maxNativeZoom: 18,
                    detectRetina: true
                });
                
                tileLayer.addTo(map);
                
                // Verificar que todo se configuró correctamente
                mapInstanceRef.current = map;
                setIsMapReady(true);

            } catch (error) {
                setMapError(true);
            }
        };

        const checkLeaflet = async () => {
            try {
                // Lazy loading robusto de Leaflet
                if (typeof L === 'undefined' || !window.leafletJSLoaded) {
                    // Verificar que las funciones de carga existen
                    if (typeof window.loadLeafletCSS !== 'function' || typeof window.loadLeafletJS !== 'function') {
                        throw new Error('Funciones de carga de Leaflet no están disponibles');
                    }

                    await Promise.all([
                        window.loadLeafletCSS(),
                        window.loadLeafletJS()
                    ]);

                    // Esperar un poco más para que Leaflet se inicialice completamente
                    await new Promise(resolve => setTimeout(resolve, 200));
                }

                // Verificación más robusta de Leaflet
                if (typeof L !== 'undefined' && L.map && typeof L.map === 'function' && L.marker && L.divIcon) {
                    initializeMap();
                } else {
                    setMapError(true);
                }
            } catch (error) {
                setMapError(true);
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
        };
    }, [isOpen]);
    
    // OPTIMIZACIÓN: UseEffect inteligente - Solo cuando realmente cambien los marcadores ⚡
    useEffect(() => {
        if (!isOpen || !isMapReady || !mapInstanceRef.current) return;
        
        updateMapMarkers(addressesWithCoords);

        // Invalidar tamaño para garantizar renderizado correcto - OPTIMIZADO
        setTimeout(() => mapInstanceRef.current && mapInstanceRef.current.invalidateSize(), 100);

    }, [isOpen, isMapReady, markersHash, updateMapMarkers, addressesWithCoords, sortState.sortOrder]);

    // UseEffect separado para la línea de ruta - más eficiente
    useEffect(() => {
        if (!isOpen || !isMapReady || !mapInstanceRef.current) return;
        
        // Pequeño delay para asegurar que los marcadores se actualicen primero
        const updateTimer = setTimeout(() => {
            if (sortState.sortOrder === 'optimized') {
                // Limpiar línea anterior primero
                if (routeLineRef.current) {
                    mapInstanceRef.current.removeLayer(routeLineRef.current);
                    routeLineRef.current = null;
                }
                // Dibujar nueva línea
                drawRouteLine();
            } else {
                if (routeLineRef.current) {
                    mapInstanceRef.current.removeLayer(routeLineRef.current);
                    routeLineRef.current = null;
                }
            }
        }, 100);
        
        return () => clearTimeout(updateTimer);
    }, [isOpen, isMapReady, sortState.sortOrder, drawRouteLine, routeCoordinates]);

    // ✅ TRACKING: UseEffect para actualizar marcador de ubicación del usuario dinámicamente
    useEffect(() => {
        if (!isOpen || !isMapReady || !mapInstanceRef.current) return;
        if (!sortState.userLocation) return;

        const userMarker = mapInstanceRef.current._userLocationMarker;

        if (userMarker) {
            // Actualizar posición sin recrear el marcador
            userMarker.setLatLng([
                sortState.userLocation.lat,
                sortState.userLocation.lng
            ]);
        }
    }, [isOpen, isMapReady, sortState.userLocation]);

    // ✅ TRACKING: UseEffect para actualizar línea de ruta con nueva ubicación
    useEffect(() => {
        if (!isOpen || !isMapReady || !mapInstanceRef.current) return;
        if (sortState.sortOrder !== 'optimized' || !sortState.userLocation) return;

        if (routeLineRef.current) {
            const currentLatLngs = routeLineRef.current.getLatLngs();
            if (currentLatLngs.length > 0) {
                // Actualizar el primer punto (ubicación del usuario)
                currentLatLngs[0] = L.latLng(
                    sortState.userLocation.lat,
                    sortState.userLocation.lng
                );
                routeLineRef.current.setLatLngs(currentLatLngs);
            }
        }
    }, [isOpen, isMapReady, sortState.userLocation, sortState.sortOrder]);

    // NUEVO: UseEffect específico para actualizar marcadores cuando cambia la ruta - SOLUCIÓN DEFINITIVA
    useEffect(() => {
        if (!isOpen || !isMapReady || !mapInstanceRef.current) return;
        

        
        const forceUpdateMarkers = () => {
            if (sortState.sortOrder === 'optimized' && sortState.optimizedRoute && sortState.optimizedRoute.length > 0) {
        
                
                // Limpiar todos los marcadores existentes PRIMERO
                Object.values(markersRef.current).forEach(marker => {
                    if (mapInstanceRef.current) {
                        mapInstanceRef.current.removeLayer(marker);
                    }
                });
                markersRef.current = {};
                
                // Crear marcadores con orden optimizado
                const addressMap = new Map(addresses.map(addr => [addr.id, addr]));
                const reorderedAddresses = sortState.optimizedRoute
                    .map(routeItem => addressMap.get(routeItem.id))
                    .filter(Boolean)
                    .map((address, index) => ({
                        ...address,
                        routeOrder: index + 1,
                        coordinates: address.latitude && address.longitude 
                            ? { lat: address.latitude, lng: address.longitude }
                            : address.coords && Array.isArray(address.coords) && address.coords.length >= 2
                                ? { lat: address.coords[0], lng: address.coords[1] }
                                : null
                    })).filter(addr => addr.coordinates);
                
    
                
                // SOLUCIÓN DIRECTA: Crear marcadores manualmente uno por uno
                reorderedAddresses.forEach((address, index) => {
                    const coords = address.coordinates;
                    if (!coords) return;
                    
                    const displayNumber = address.routeOrder || (index + 1);
                    const color = address.isVisited ? '#ef4444' : '#22c55e';
                    

                    
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
                            animation: markerPulse 0.6s ease-out;
                        ">
                            ${displayNumber}
                        </div>`;
                    
                    const customIcon = L.divIcon({ 
                        html: markerHtml, 
                        iconSize: [36, 36], 
                        className: 'custom-marker-optimized',
                        iconAnchor: [18, 18]
                    });
                    
                    const marker = L.marker([coords.lat, coords.lng], { icon: customIcon });
                    
                    marker.on('click', () => {
                        setSelectedAddress(address);
                        setSelectedAddressIndex(index);
                        setShowQuickAction(true);
                    });
                    
                    marker.addTo(mapInstanceRef.current);
                    markersRef.current[address.id] = marker;
                });
                

                
            } else if (sortState.sortOrder === 'alpha') {
                
                // Limpiar todos los marcadores existentes PRIMERO
                Object.values(markersRef.current).forEach(marker => {
                    if (mapInstanceRef.current) {
                        mapInstanceRef.current.removeLayer(marker);
                    }
                });
                markersRef.current = {};
                
                // Orden original - recrear marcadores sin routeOrder
                const originalAddresses = addresses.map(address => ({
                    ...address,
                    coordinates: address.latitude && address.longitude 
                        ? { lat: address.latitude, lng: address.longitude }
                        : address.coords && Array.isArray(address.coords) && address.coords.length >= 2
                            ? { lat: address.coords[0], lng: address.coords[1] }
                            : null
                })).filter(addr => addr.coordinates);
                
                // SOLUCIÓN DIRECTA: Crear marcadores manualmente uno por uno  
                originalAddresses.forEach((address, index) => {
                    const coords = address.coordinates;
                    if (!coords) return;
                    
                    const displayNumber = index + 1; // Orden secuencial original
                    const color = address.isVisited ? '#ef4444' : '#22c55e';
                    

                    
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
                        ">
                            ${displayNumber}
                        </div>`;
                    
                    const customIcon = L.divIcon({ 
                        html: markerHtml, 
                        iconSize: [36, 36], 
                        className: 'custom-marker-original',
                        iconAnchor: [18, 18]
                    });
                    
                    const marker = L.marker([coords.lat, coords.lng], { icon: customIcon });
                    
                    marker.on('click', () => {
                        setSelectedAddress(address);
                        setSelectedAddressIndex(index);
                        setShowQuickAction(true);
                    });
                    
                    marker.addTo(mapInstanceRef.current);
                    markersRef.current[address.id] = marker;
                });
                

            }
        };

        // Ejecutar inmediatamente
        forceUpdateMarkers();
        
    }, [isOpen, isMapReady, sortState.sortOrder, sortState.optimizedRoute, addresses, updateMapMarkers]);
    
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
            {/* Botón de cerrar flotante prominente - SOLO EN DESKTOP */}
            <button 
                onClick={onClose} 
                className="hidden sm:flex absolute top-4 right-4 z-30 p-3 hover:bg-red-100 rounded-full transition-colors bg-white shadow-lg border border-gray-200 items-center justify-center"
                aria-label="Cerrar mapa"
            >
                <Icon name="x" size={24} className="text-red-600" />
            </button>
            
            {/* Header minimalista optimizado para móvil */}
            <div className="bg-gray-50 border-b border-gray-200 px-3 sm:px-4 py-3">
                <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center">
                        <button 
                            onClick={onClose} 
                            className="p-3 hover:bg-red-100 rounded-full transition-colors mr-3 bg-white shadow-sm border border-gray-200" 
                            aria-label="Cerrar mapa"
                        >
                            <Icon name="arrowLeft" size={24} className="text-red-600" />
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
                        className="p-3 hover:bg-red-100 rounded-lg transition-colors sm:hidden bg-white shadow-sm border border-gray-200"
                    >
                        <Icon name="x" size={22} className="text-red-600" />
                    </button>
                </div>
                
                {/* Controles de ruta optimizada - Simplificado */}
                <div className="mt-3">
                    {/* Botón único que cambia según el estado */}
                    <button 
                        onClick={() => {
                            if (sortState.sortOrder === 'optimized') {
                                // Si ya está activa, desactivar (resetear)
                                onResetSort();
                            } else {
                                // Si no está activa, crear ruta optimizada
                                onOptimizedRoute();
                            }
                        }}
                        onDoubleClick={() => {
                            // Doble clic de emergencia para desbloquear si está atascado
                            if (sortState.isCalculatingRoute && sortState.forceReset) {
                                sortState.forceReset();
                            }
                        }}
                        disabled={sortState.isCalculatingRoute} 
                        className={`w-full relative px-6 py-3 text-base font-semibold rounded-xl shadow-lg border-2 transition-all transform hover:scale-105 ${
                            sortState.sortOrder === 'optimized' 
                                ? 'bg-gradient-to-r from-green-600 to-emerald-600 text-white border-green-700 shadow-green-200' 
                                : 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white border-blue-700 shadow-blue-200 hover:from-blue-700 hover:to-indigo-700'
                        } ${sortState.isCalculatingRoute ? 'cursor-wait opacity-75' : 'hover:shadow-xl'}`}
                        title={
                            sortState.isCalculatingRoute 
                                ? 'Calculando ruta optimizada... (doble clic para resetear si está atascado)' 
                                : sortState.sortOrder === 'optimized' 
                                    ? 'Desactivar ruta optimizada' 
                                    : 'Crear ruta optimizada para visitar direcciones en el orden más eficiente'
                        }
                    >
                        {sortState.isCalculatingRoute ? (
                            <div className="flex items-center justify-center">
                                <div className="animate-spin w-5 h-5 border-2 border-current border-t-transparent rounded-full mr-3"></div>
                                <span>Calculando Ruta...</span>
                            </div>
                        ) : (
                            <div className="flex items-center justify-center">
                                <Icon name="activity" size={20} className="mr-3" />
                                <span>
                                    {sortState.sortOrder === 'optimized' ? 'Ruta Optimizada Activa' : 'Crear Ruta Optimizada'}
                                </span>
                                {sortState.sortOrder === 'optimized' && (
                                    <Icon name="checkCircle" size={18} className="ml-2 text-green-200" />
                                )}
                            </div>
                        )}
                        {sortState.sortOrder === 'optimized' && !sortState.isCalculatingRoute && (
                            <span className="absolute -top-2 -right-2 w-3 h-3 bg-yellow-400 rounded-full animate-pulse shadow-lg"></span>
                        )}
                    </button>
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
                        
                        {/* ✅ TRACKING: Panel de controles de ubicación con indicador GPS */}
                        <div className="absolute bottom-4 right-4 z-20 flex flex-col items-end gap-2">
                            {/* Indicador de estado GPS - Solo visible cuando está obteniendo o hay error */}
                            {sortState.sortOrder === 'optimized' && (sortState.gpsStatus === 'acquiring' || sortState.gpsStatus === 'error') && (
                                <div
                                    className={`px-3 py-1.5 rounded-full text-xs font-medium shadow-lg border flex items-center gap-1.5 transition-all ${
                                        sortState.gpsStatus === 'acquiring'
                                            ? 'bg-yellow-100 text-yellow-700 border-yellow-300 animate-pulse'
                                            : 'bg-red-100 text-red-700 border-red-300'
                                    }`}
                                >
                                    <div
                                        className={`w-2 h-2 rounded-full ${
                                            sortState.gpsStatus === 'acquiring'
                                                ? 'bg-yellow-500 animate-ping'
                                                : 'bg-red-500'
                                        }`}
                                    />
                                    <span>
                                        {sortState.gpsStatus === 'acquiring'
                                            ? 'Obteniendo GPS...'
                                            : 'Error GPS'}
                                    </span>
                                </div>
                            )}

                            {/* Contenedor de botones */}
                            <div className="flex flex-col gap-2">
                                {/* Botón de actualización forzada - Solo visible con ruta optimizada */}
                                {sortState.sortOrder === 'optimized' && onForceLocationUpdate && (
                                    <button
                                        onClick={() => {
                                            onForceLocationUpdate()
                                                .then(() => showToast('Ubicación actualizada', 'success'))
                                                .catch(() => showToast('Error al actualizar ubicación', 'error'));
                                        }}
                                        className="w-12 h-12 bg-blue-600 hover:bg-blue-700 rounded-full shadow-lg border-2 border-white transition-all duration-200 flex items-center justify-center group"
                                        title="Actualizar mi ubicación"
                                    >
                                        <Icon
                                            name="crosshair"
                                            size={22}
                                            className="text-white group-hover:scale-110 transition-transform"
                                        />
                                    </button>
                                )}

                                {/* Botón de centrar en ubicación */}
                                <button
                                    onClick={() => {
                                        if (sortState.userLocation && mapInstanceRef.current) {
                                            mapInstanceRef.current.setView(
                                                [sortState.userLocation.lat, sortState.userLocation.lng],
                                                16,
                                                { animate: true, duration: 1 }
                                            );
                                            showToast('Centrando en tu ubicación', 'info');
                                        } else {
                                            showToast('Ubicación no disponible', 'warning');
                                        }
                                    }}
                                    className="w-12 h-12 bg-white rounded-full shadow-lg border border-gray-200 hover:shadow-2xl transition-all duration-200 flex items-center justify-center group"
                                    title="Centrar en mi ubicación"
                                >
                                    <Icon
                                        name="mapPin"
                                        size={26}
                                        className="text-blue-600 group-hover:text-blue-700 transition-colors drop-shadow-md"
                                    />
                                </button>
                            </div>
                        </div>
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
                            {/* Botón principal - Marcar completado/pendiente - SOLO SI TIENE PERMISOS */}
                            {(isAssignedToMe || (isAdmin && adminEditMode)) ? (
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
                            ) : (
                                <div className="flex-1 p-3 rounded-lg font-medium text-sm bg-gray-100 text-gray-500 flex items-center justify-center border border-gray-200">
                                    <Icon name="lock" size={18} className="mr-2" />
                                    {isAdmin ? 'Activa el modo administrador para marcar' : 'Solo el asignado puede marcar'}
                                </div>
                            )}
                            
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
                        {(isAssignedToMe || (isAdmin && adminEditMode)) && (
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
        </div>
    );
};

export default TerritoryMapModal; 