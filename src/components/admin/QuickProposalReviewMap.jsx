import React, { useEffect, useRef, useState, useMemo } from 'react';

const GUADALAJARA_CENTER = { lat: 20.6597, lng: -103.3496 };

const getCoordsFromAddress = (address) => {
  if (address.latitude && address.longitude) {
    return { lat: address.latitude, lng: address.longitude };
  }
  if (address.coords && Array.isArray(address.coords) && address.coords.length >= 2) {
    return { lat: address.coords[0], lng: address.coords[1] };
  }
  return null;
};

const extractTerritoryNumber = (name) => {
  if (!name) return '?';
  const match = String(name).match(/\d+/);
  return match ? match[0] : String(name).charAt(0).toUpperCase();
};

const QuickProposalReviewMap = ({
  latitude,
  longitude,
  onLocationChange,
  addresses = [],
  territories = [],
  highlightedTerritoryId = null
}) => {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const pinMarkerRef = useRef(null);
  const territoryLabelsRef = useRef([]);
  const [leafletReady, setLeafletReady] = useState(false);
  const [mapReady, setMapReady] = useState(false);
  const [loadError, setLoadError] = useState(null);

  // Calcula centroides por territorio (promedio de coords de sus direcciones)
  const territoryCentroids = useMemo(() => {
    const byTerritory = new Map();
    addresses.forEach(addr => {
      const coords = getCoordsFromAddress(addr);
      if (!coords || !addr.territoryId) return;
      if (!byTerritory.has(addr.territoryId)) {
        byTerritory.set(addr.territoryId, { sumLat: 0, sumLng: 0, count: 0 });
      }
      const entry = byTerritory.get(addr.territoryId);
      entry.sumLat += coords.lat;
      entry.sumLng += coords.lng;
      entry.count += 1;
    });
    const result = [];
    byTerritory.forEach((entry, territoryId) => {
      const territory = territories.find(t => t.id === territoryId);
      if (!territory) return;
      result.push({
        territoryId,
        name: territory.name,
        number: extractTerritoryNumber(territory.name),
        lat: entry.sumLat / entry.count,
        lng: entry.sumLng / entry.count,
        count: entry.count
      });
    });
    return result;
  }, [addresses, territories]);

  // Carga lazy de Leaflet
  useEffect(() => {
    let cancelled = false;
    const loadLeaflet = async () => {
      try {
        if (window.loadLeafletCSS) await window.loadLeafletCSS();
        if (window.loadLeafletJS) await window.loadLeafletJS();
        if (!cancelled && window.L) setLeafletReady(true);
      } catch (err) {
        if (!cancelled) setLoadError(err?.message || 'No se pudo cargar el mapa');
      }
    };
    loadLeaflet();
    return () => { cancelled = true; };
  }, []);

  // Inicializar mapa (solo una vez cuando leaflet carga)
  useEffect(() => {
    if (!leafletReady || !mapContainerRef.current || mapInstanceRef.current) return;

    const L = window.L;
    const hasCoords = latitude !== null && longitude !== null && !Number.isNaN(latitude) && !Number.isNaN(longitude);
    const center = hasCoords ? [latitude, longitude] : [GUADALAJARA_CENTER.lat, GUADALAJARA_CENTER.lng];

    const map = L.map(mapContainerRef.current, {
      center,
      zoom: hasCoords ? 16 : 13,
      zoomControl: true,
      attributionControl: false
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19
    }).addTo(map);

    map.on('click', (e) => {
      if (onLocationChange) onLocationChange(e.latlng.lat, e.latlng.lng);
    });

    mapInstanceRef.current = map;
    setMapReady(true);

    // Forzar recálculo de tamaño tras el montaje (por si está en un contenedor con scroll/flex)
    setTimeout(() => map.invalidateSize(), 100);

    return () => {
      map.remove();
      mapInstanceRef.current = null;
      pinMarkerRef.current = null;
      territoryLabelsRef.current = [];
      setMapReady(false);
    };
  }, [leafletReady]);

  // Etiquetas de territorio en el centroide
  useEffect(() => {
    if (!mapReady || !mapInstanceRef.current) return;
    const L = window.L;
    const map = mapInstanceRef.current;

    territoryLabelsRef.current.forEach(m => map.removeLayer(m));
    territoryLabelsRef.current = [];

    territoryCentroids.forEach(c => {
      const isHighlighted = highlightedTerritoryId && c.territoryId === highlightedTerritoryId;
      const bg = isHighlighted ? '#f97316' : '#2C3E50';
      const color = '#ffffff';
      const size = isHighlighted ? 34 : 28;
      const fontSize = isHighlighted ? 13 : 12;
      const opacity = isHighlighted ? 1 : 0.88;
      const icon = L.divIcon({
        className: 'territory-number-label',
        html: `<div style="
          width:${size}px;height:${size}px;
          background:${bg};color:${color};
          border:2px solid white;border-radius:50%;
          display:flex;align-items:center;justify-content:center;
          font-weight:700;font-size:${fontSize}px;
          box-shadow:0 2px 5px rgba(0,0,0,0.4);
          opacity:${opacity};
          font-family:system-ui,-apple-system,sans-serif;
        ">${c.number}</div>`,
        iconSize: [size, size],
        iconAnchor: [size / 2, size / 2]
      });
      const marker = L.marker([c.lat, c.lng], { icon, interactive: true });
      marker.bindTooltip(`${c.name} · ${c.count} direcciones`, {
        direction: 'top',
        offset: [0, -size / 2]
      });
      marker.addTo(map);
      territoryLabelsRef.current.push(marker);
    });
  }, [mapReady, territoryCentroids, highlightedTerritoryId]);

  // Pin arrastrable de la propuesta
  useEffect(() => {
    if (!mapReady || !mapInstanceRef.current) return;
    const L = window.L;
    const map = mapInstanceRef.current;

    const hasCoords = latitude !== null && longitude !== null && !Number.isNaN(latitude) && !Number.isNaN(longitude);

    if (!hasCoords) {
      if (pinMarkerRef.current) {
        map.removeLayer(pinMarkerRef.current);
        pinMarkerRef.current = null;
      }
      return;
    }

    const pinIcon = L.divIcon({
      className: 'quick-proposal-pin',
      html: `<div style="position:relative;">
        <div style="width:28px;height:28px;background:#f97316;border:3px solid white;border-radius:50% 50% 50% 0;transform:rotate(-45deg);box-shadow:0 2px 6px rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;">
          <div style="width:8px;height:8px;background:white;border-radius:50%;transform:rotate(45deg);"></div>
        </div>
      </div>`,
      iconSize: [28, 28],
      iconAnchor: [14, 28]
    });

    if (pinMarkerRef.current) {
      pinMarkerRef.current.setLatLng([latitude, longitude]);
    } else {
      const marker = L.marker([latitude, longitude], {
        icon: pinIcon,
        draggable: true,
        zIndexOffset: 1000
      });
      marker.on('dragend', (e) => {
        const pos = e.target.getLatLng();
        if (onLocationChange) onLocationChange(pos.lat, pos.lng);
      });
      marker.addTo(map);
      pinMarkerRef.current = marker;
    }

    map.setView([latitude, longitude], Math.max(map.getZoom(), 15), { animate: true });
    // Por si el contenedor cambió de tamaño
    setTimeout(() => map.invalidateSize(), 50);
  }, [mapReady, latitude, longitude]);

  if (loadError) {
    return (
      <div className="w-full h-56 bg-gray-100 rounded-lg flex items-center justify-center text-sm text-gray-500">
        <i className="fas fa-exclamation-triangle mr-2 text-amber-500"></i>
        Error al cargar el mapa: {loadError}
      </div>
    );
  }

  return (
    <div className="w-full relative">
      <div
        ref={mapContainerRef}
        className="w-full h-56 rounded-lg border-2 border-gray-200 overflow-hidden"
        style={{ background: '#e5e7eb' }}
      />
      {!leafletReady && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100/80 rounded-lg">
          <div className="text-sm text-gray-500">
            <i className="fas fa-spinner fa-spin mr-2"></i>
            Cargando mapa…
          </div>
        </div>
      )}
      {leafletReady && latitude === null && (
        <div className="absolute bottom-2 left-2 right-2 bg-white/95 backdrop-blur-sm rounded px-2 py-1.5 text-xs text-gray-600 shadow-sm pointer-events-none">
          <i className="fas fa-hand-pointer mr-1 text-orange-500"></i>
          Toca en el mapa o escribe coordenadas para ubicar la propuesta
        </div>
      )}
    </div>
  );
};

export default QuickProposalReviewMap;
