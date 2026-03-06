import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Icon from '../common/Icon';
import { useToast } from '../../hooks/useToast';
import { useLocationTracking } from '../../hooks/useLocationTracking';
import { optimizeRoute } from '../../utils/routeOptimizer';
import {
  CAMPAIGN_PROGRESS_STATUSES,
  formatCampaignDate,
  formatCampaignTypeLabel,
  getCampaignProgressMeta
} from '../../utils/campaignUtils';

const GUADALAJARA_CENTER = { lat: 20.6597, lng: -103.3496 };
const BASE_TILE_LAYERS = [
  {
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    options: {
      attribution: '© OpenStreetMap',
      maxZoom: 19
    }
  },
  {
    url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
    options: {
      attribution: '© OpenStreetMap © CARTO',
      maxZoom: 20
    }
  }
];

const normalizeCoordinates = (latLike, lngLike) => {
  const lat = Number(latLike);
  const lng = Number(lngLike);

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return null;
  }

  return { lat, lng };
};

const getEffectiveAssignmentStatus = (assignment) => (
  assignment?.status === CAMPAIGN_PROGRESS_STATUSES.COMPLETED
    ? CAMPAIGN_PROGRESS_STATUSES.COMPLETED
    : CAMPAIGN_PROGRESS_STATUSES.IN_PROGRESS
);

const extractCoordinatesFromUrl = (url) => {
  if (!url) return null;

  const patterns = [
    /@(-?\d+\.?\d*),(-?\d+\.?\d*)/,
    /[?&]q=(-?\d+\.?\d*),(-?\d+\.?\d*)/,
    /ll=(-?\d+\.?\d*),(-?\d+\.?\d*)/,
    /q=(-?\d+\.?\d*),(-?\d+\.?\d*)/,
    /!3d(-?\d+\.?\d*)!4d(-?\d+\.?\d*)/,
    /place\/.*@(-?\d+\.?\d*),(-?\d+\.?\d*)/,
    /dir\/[^/]+\/(-?\d+\.?\d*),(-?\d+\.?\d*)/
  ];

  for (const pattern of patterns) {
    const match = String(url).match(pattern);
    if (match) {
      return normalizeCoordinates(match[1], match[2]);
    }
  }

  return null;
};

const getSnapshotCoordinates = (snapshot = {}) => {
  const directCoordinates = normalizeCoordinates(snapshot.latitude, snapshot.longitude);
  if (directCoordinates) {
    return directCoordinates;
  }

  if (Array.isArray(snapshot.coords) && snapshot.coords.length >= 2) {
    const [lat, lng] = snapshot.coords;
    const pairCoordinates = normalizeCoordinates(lat, lng);
    if (pairCoordinates) {
      return pairCoordinates;
    }
  }

  return extractCoordinatesFromUrl(snapshot.mapUrl);
};

const buildGeocodeQuery = (snapshot = {}) => (
  [
    snapshot.address,
    snapshot.territoryName,
    'Guadalajara',
    'Jalisco',
    'Mexico'
  ]
    .filter(Boolean)
    .join(', ')
);

const resolveCoordinatesFromSnapshot = async (snapshot = {}, signal) => {
  const query = buildGeocodeQuery(snapshot);
  if (!query) return null;

  const response = await fetch(
    `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1&addressdetails=1`,
    {
      signal,
      headers: {
        'Accept-Language': 'es',
        'User-Agent': 'TerritoriosApp/1.0'
      }
    }
  );

  if (!response.ok) {
    throw new Error('No se pudo geocodificar la direccion.');
  }

  const results = await response.json();
  if (!Array.isArray(results) || results.length === 0) {
    return null;
  }

  return normalizeCoordinates(results[0].lat, results[0].lon);
};

const getNavigationUrl = (snapshot = {}, mode = 'driving') => {
  const coordinates = getSnapshotCoordinates(snapshot);
  if (coordinates) {
    return `https://www.google.com/maps/dir/?api=1&destination=${coordinates.lat},${coordinates.lng}&travelmode=${mode}`;
  }

  const encodedAddress = encodeURIComponent(snapshot.address || '');
  return `https://www.google.com/maps/dir/?api=1&destination=${encodedAddress}&travelmode=${mode}`;
};

const getMarkerColor = (assignment) => (
  getEffectiveAssignmentStatus(assignment) === CAMPAIGN_PROGRESS_STATUSES.COMPLETED
    ? '#10b981'
    : '#f59e0b'
);

const CampaignAssignmentsMapModal = ({
  isOpen,
  onClose,
  campaign,
  assignments = [],
  onStatusChange,
  isProcessing = false
}) => {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef({});
  const routeLineRef = useRef(null);
  const userMarkerRef = useRef(null);
  const tileLayerRef = useRef(null);
  const tileLayerIndexRef = useRef(0);
  const tileLoadStatsRef = useRef({ loaded: 0, errors: 0 });
  const { showToast } = useToast();
  const [isMapReady, setIsMapReady] = useState(false);
  const [mapError, setMapError] = useState(false);
  const [selectedAssignmentId, setSelectedAssignmentId] = useState(null);
  const [resolvedCoordinatesById, setResolvedCoordinatesById] = useState({});
  const [isResolvingCoordinates, setIsResolvingCoordinates] = useState(false);
  const [sortState, setSortState] = useState({
    sortOrder: 'default',
    optimizedRoute: [],
    isCalculatingRoute: false,
    userLocation: null
  });
  const {
    location: trackingLocation,
    forceUpdate: forceLocationUpdate,
    startTracking,
    stopTracking
  } = useLocationTracking();

  const rawAssignmentsWithMeta = useMemo(() => assignments.map((assignment) => {
    const snapshot = assignment.addressSnapshot || {};
    return {
      ...assignment,
      snapshot,
      effectiveStatus: getEffectiveAssignmentStatus(assignment),
      coordinates: getSnapshotCoordinates(snapshot)
    };
  }), [assignments]);

  const assignmentsWithMeta = useMemo(
    () => rawAssignmentsWithMeta.map((assignment) => ({
      ...assignment,
      coordinates: assignment.coordinates || resolvedCoordinatesById[assignment.id] || null
    })),
    [rawAssignmentsWithMeta, resolvedCoordinatesById]
  );

  const assignmentsWithCoords = useMemo(
    () => assignmentsWithMeta.filter((assignment) => assignment.coordinates),
    [assignmentsWithMeta]
  );

  const routeCandidates = useMemo(
    () => assignmentsWithCoords.filter((assignment) => assignment.effectiveStatus === CAMPAIGN_PROGRESS_STATUSES.IN_PROGRESS),
    [assignmentsWithCoords]
  );

  const assignmentMap = useMemo(
    () => assignmentsWithMeta.reduce((accumulator, assignment) => {
      accumulator[assignment.id] = assignment;
      return accumulator;
    }, {}),
    [assignmentsWithMeta]
  );

  const displayedAssignments = useMemo(() => {
    if (sortState.sortOrder !== 'optimized' || sortState.optimizedRoute.length === 0) {
      return assignmentsWithMeta;
    }

    const orderMap = new Map(sortState.optimizedRoute.map((item, index) => [item.id, item.routeOrder || index + 1]));

    return [...assignmentsWithMeta]
      .sort((assignmentA, assignmentB) => {
        const orderA = orderMap.get(assignmentA.id) ?? Number.MAX_SAFE_INTEGER;
        const orderB = orderMap.get(assignmentB.id) ?? Number.MAX_SAFE_INTEGER;
        if (orderA !== orderB) return orderA - orderB;

        const territoryA = assignmentA.snapshot?.territoryName || '';
        const territoryB = assignmentB.snapshot?.territoryName || '';
        const territoryDiff = territoryA.localeCompare(territoryB, 'es', { numeric: true });
        if (territoryDiff !== 0) return territoryDiff;

        return String(assignmentA.snapshot?.address || '').localeCompare(String(assignmentB.snapshot?.address || ''), 'es', { numeric: true });
      })
      .map((assignment) => ({
        ...assignment,
        routeOrder: orderMap.get(assignment.id) || null
      }));
  }, [assignmentsWithMeta, sortState.optimizedRoute, sortState.sortOrder]);

  const selectedAssignment = useMemo(
    () => displayedAssignments.find((assignment) => assignment.id === selectedAssignmentId) || null,
    [displayedAssignments, selectedAssignmentId]
  );

  const assignmentsMissingCoordinates = useMemo(
    () => rawAssignmentsWithMeta.filter((assignment) => !assignment.coordinates),
    [rawAssignmentsWithMeta]
  );

  useEffect(() => {
    if (!isOpen) return;

    if (!selectedAssignmentId && displayedAssignments.length > 0) {
      setSelectedAssignmentId(displayedAssignments[0].id);
    }

    if (selectedAssignmentId && !displayedAssignments.some((assignment) => assignment.id === selectedAssignmentId)) {
      setSelectedAssignmentId(displayedAssignments[0]?.id || null);
    }
  }, [displayedAssignments, isOpen, selectedAssignmentId]);

  useEffect(() => {
    if (!isOpen) return undefined;

    if (sortState.sortOrder === 'optimized') {
      startTracking();
    } else {
      stopTracking();
    }

    return () => stopTracking();
  }, [isOpen, sortState.sortOrder, startTracking, stopTracking]);

  useEffect(() => {
    if (trackingLocation && sortState.sortOrder === 'optimized') {
      setSortState((previous) => ({
        ...previous,
        userLocation: trackingLocation
      }));
    }
  }, [sortState.sortOrder, trackingLocation]);

  useEffect(() => {
    if (!isOpen) return undefined;

    const pendingAssignments = assignmentsMissingCoordinates.filter(
      (assignment) => assignment.snapshot?.address && !resolvedCoordinatesById[assignment.id]
    );

    if (pendingAssignments.length === 0) {
      setIsResolvingCoordinates(false);
      return undefined;
    }

    let isCancelled = false;
    const controller = new AbortController();

    const resolveAllCoordinates = async () => {
      setIsResolvingCoordinates(true);
      const nextCoordinates = {};

      for (const assignment of pendingAssignments) {
        try {
          const coordinates = await resolveCoordinatesFromSnapshot(assignment.snapshot, controller.signal);
          if (coordinates) {
            nextCoordinates[assignment.id] = coordinates;
          }
        } catch (error) {
          if (error.name === 'AbortError') {
            return;
          }
        }
      }

      if (!isCancelled && Object.keys(nextCoordinates).length > 0) {
        setResolvedCoordinatesById((previous) => ({
          ...previous,
          ...nextCoordinates
        }));
      }

      if (!isCancelled) {
        setIsResolvingCoordinates(false);
      }
    };

    resolveAllCoordinates();

    return () => {
      isCancelled = true;
      controller.abort();
    };
  }, [assignmentsMissingCoordinates, isOpen, resolvedCoordinatesById]);

  const clearMapArtifacts = useCallback(() => {
    if (!mapInstanceRef.current || typeof window.L === 'undefined') return;

    Object.values(markersRef.current).forEach((marker) => {
      mapInstanceRef.current.removeLayer(marker);
    });
    markersRef.current = {};

    if (routeLineRef.current) {
      mapInstanceRef.current.removeLayer(routeLineRef.current);
      routeLineRef.current = null;
    }

    if (userMarkerRef.current) {
      mapInstanceRef.current.removeLayer(userMarkerRef.current);
      userMarkerRef.current = null;
    }
  }, []);

  const refreshMapLayout = useCallback(() => {
    if (!mapInstanceRef.current) return;

    mapInstanceRef.current.invalidateSize();
    tileLayerRef.current?.redraw?.();

    const allBoundsPoints = [
      ...assignmentsWithCoords.map((assignment) => [assignment.coordinates.lat, assignment.coordinates.lng]),
      ...(sortState.userLocation ? [[sortState.userLocation.lat, sortState.userLocation.lng]] : [])
    ];

    if (allBoundsPoints.length === 0) {
      mapInstanceRef.current.setView([GUADALAJARA_CENTER.lat, GUADALAJARA_CENTER.lng], 12, {
        animate: false
      });
      return;
    }

    if (typeof window.L === 'undefined') return;

    const bounds = window.L.latLngBounds(allBoundsPoints);
    if (bounds.isValid()) {
      mapInstanceRef.current.fitBounds(bounds, {
        padding: [34, 34],
        maxZoom: assignmentsWithCoords.length > 1 ? 16 : 17
      });
    }
  }, [assignmentsWithCoords, sortState.userLocation]);

  const handleResetSort = useCallback(() => {
    setSortState((previous) => ({
      ...previous,
      sortOrder: 'default',
      optimizedRoute: [],
      isCalculatingRoute: false
    }));
  }, []);

  const handleOptimizeRoute = useCallback(async () => {
    if (routeCandidates.length < 2) {
      showToast('Necesitas al menos 2 direcciones en progreso con ubicacion para optimizar la ruta.', 'info');
      return;
    }

    setSortState((previous) => ({
      ...previous,
      isCalculatingRoute: true
    }));

    try {
      let userLocation = sortState.userLocation;

      if (!userLocation) {
        try {
          userLocation = await forceLocationUpdate();
        } catch (error) {
          userLocation = null;
        }
      }

      const optimizedAssignments = await optimizeRoute(
        routeCandidates.map((assignment) => ({
          id: assignment.id,
          address: assignment.snapshot.address,
          latitude: assignment.coordinates?.lat,
          longitude: assignment.coordinates?.lng,
          mapUrl: assignment.snapshot.mapUrl || '',
          coords: assignment.coordinates ? [assignment.coordinates.lat, assignment.coordinates.lng] : null
        })),
        userLocation || undefined
      );

      setSortState((previous) => ({
        ...previous,
        sortOrder: 'optimized',
        optimizedRoute: optimizedAssignments.map((assignment, index) => ({
          id: assignment.id,
          routeOrder: assignment.routeOrder || index + 1
        })),
        isCalculatingRoute: false,
        userLocation: userLocation || previous.userLocation
      }));

      showToast('Ruta optimizada lista.', 'success', 2000);
    } catch (error) {
      setSortState((previous) => ({
        ...previous,
        isCalculatingRoute: false
      }));
      showToast('No se pudo optimizar la ruta.', 'error');
    }
  }, [forceLocationUpdate, routeCandidates, showToast, sortState.userLocation]);

  useEffect(() => {
    if (!isOpen) return undefined;

    const initializeMap = () => {
      if (!mapRef.current || !window.L) {
        setMapError(true);
        return;
      }

      if (mapInstanceRef.current) {
        return;
      }

      const L = window.L;
      const center = assignmentsWithCoords[0]?.coordinates || GUADALAJARA_CENTER;

      const map = L.map(mapRef.current, {
        zoomControl: true,
        attributionControl: true,
        preferCanvas: true,
        scrollWheelZoom: true,
        doubleClickZoom: true,
        touchZoom: true,
        dragging: true
      }).setView([center.lat, center.lng], assignmentsWithCoords.length > 1 ? 14 : 12);

      const mountTileLayer = (layerIndex = 0) => {
        tileLayerIndexRef.current = layerIndex;
        tileLoadStatsRef.current = { loaded: 0, errors: 0 };

        const tileConfig = BASE_TILE_LAYERS[layerIndex] || BASE_TILE_LAYERS[0];
        const tileLayer = L.tileLayer(tileConfig.url, tileConfig.options);

        tileLayer.on('tileload', () => {
          tileLoadStatsRef.current.loaded += 1;
          setMapError(false);
        });

        tileLayer.on('tileerror', () => {
          tileLoadStatsRef.current.errors += 1;
          const { loaded, errors } = tileLoadStatsRef.current;

          if (loaded === 0 && errors >= 4 && layerIndex < BASE_TILE_LAYERS.length - 1 && mapInstanceRef.current) {
            mapInstanceRef.current.removeLayer(tileLayer);
            mountTileLayer(layerIndex + 1);
            return;
          }

          if (loaded === 0 && errors >= 8) {
            setMapError(true);
          }
        });

        tileLayerRef.current = tileLayer;
        tileLayer.addTo(map);
      };

      mountTileLayer();

      mapInstanceRef.current = map;
      setIsMapReady(true);
      setMapError(false);
    };

    const loadMap = async () => {
      try {
        if (typeof window.L === 'undefined' || !window.leafletJSLoaded) {
          if (typeof window.loadLeafletCSS !== 'function' || typeof window.loadLeafletJS !== 'function') {
            throw new Error('Leaflet loader unavailable');
          }

          await Promise.all([
            window.loadLeafletCSS(),
            window.loadLeafletJS()
          ]);

          await new Promise((resolve) => setTimeout(resolve, 200));
        }

        initializeMap();
      } catch (error) {
        setMapError(true);
      }
    };

    loadMap();

    return () => {
      clearMapArtifacts();
      if (tileLayerRef.current && mapInstanceRef.current) {
        mapInstanceRef.current.removeLayer(tileLayerRef.current);
        tileLayerRef.current = null;
      }
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
      setIsMapReady(false);
      setMapError(false);
      setSortState({
        sortOrder: 'default',
        optimizedRoute: [],
        isCalculatingRoute: false,
        userLocation: null
      });
    };
  }, [clearMapArtifacts, isOpen]);

  useEffect(() => {
    if (isOpen) return;

    setResolvedCoordinatesById({});
    setIsResolvingCoordinates(false);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return undefined;

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
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !isMapReady || !mapInstanceRef.current || typeof window.L === 'undefined') return;

    const L = window.L;
    clearMapArtifacts();

    const markersGroup = L.featureGroup();
    let visibleIndex = 0;

    displayedAssignments.forEach((assignment) => {
      if (!assignment.coordinates) return;

      visibleIndex += 1;
      const displayNumber = sortState.sortOrder === 'optimized' && assignment.routeOrder
        ? assignment.routeOrder
        : visibleIndex;
      const color = getMarkerColor(assignment);

      const marker = L.marker([assignment.coordinates.lat, assignment.coordinates.lng], {
        icon: L.divIcon({
          html: `
            <div style="
              background-color: ${color};
              color: white;
              width: 36px;
              height: 36px;
              border-radius: 9999px;
              display: flex;
              align-items: center;
              justify-content: center;
              font-weight: 700;
              font-size: 15px;
              border: 3px solid white;
              box-shadow: 0 8px 20px rgba(15, 23, 42, 0.28);
            ">
              ${displayNumber}
            </div>
          `,
          iconSize: [36, 36],
          iconAnchor: [18, 18],
          className: 'campaign-map-marker'
        })
      });

      marker.on('click', () => {
        setSelectedAssignmentId(assignment.id);
      });

      marker.addTo(mapInstanceRef.current);
      markersRef.current[assignment.id] = marker;
      markersGroup.addLayer(marker);
    });

    if (sortState.userLocation) {
      userMarkerRef.current = L.marker([sortState.userLocation.lat, sortState.userLocation.lng], {
        icon: L.divIcon({
          html: `
            <div style="position: relative; width: 22px; height: 22px;">
              <div style="
                position: absolute;
                inset: 0;
                border-radius: 9999px;
                background: rgba(37, 99, 235, 0.22);
                animation: campaign-user-pulse 2s infinite;
              "></div>
              <div style="
                position: absolute;
                top: 50%;
                left: 50%;
                width: 14px;
                height: 14px;
                transform: translate(-50%, -50%);
                border-radius: 9999px;
                background: #2563eb;
                border: 3px solid white;
                box-shadow: 0 4px 12px rgba(37, 99, 235, 0.32);
              "></div>
            </div>
          `,
          iconSize: [22, 22],
          iconAnchor: [11, 11],
          className: 'campaign-user-location-marker'
        })
      }).addTo(mapInstanceRef.current);
    }

    if (sortState.sortOrder === 'optimized' && sortState.optimizedRoute.length > 1) {
      const routeCoordinates = sortState.optimizedRoute
        .map((item) => assignmentMap[item.id])
        .filter(Boolean)
        .map((assignment) => assignment.coordinates)
        .filter(Boolean)
        .map((coordinates) => [coordinates.lat, coordinates.lng]);

      if (sortState.userLocation) {
        routeCoordinates.unshift([sortState.userLocation.lat, sortState.userLocation.lng]);
      }

      if (routeCoordinates.length > 1) {
        routeLineRef.current = L.polyline(routeCoordinates, {
          color: '#2563eb',
          weight: 4,
          opacity: 0.82,
          dashArray: '8, 8'
        }).addTo(mapInstanceRef.current);
      }
    }

    refreshMapLayout();

    [80, 220, 500].forEach((delay) => {
      window.setTimeout(() => {
        refreshMapLayout();
      }, delay);
    });
  }, [assignmentMap, clearMapArtifacts, displayedAssignments, isMapReady, isOpen, refreshMapLayout, sortState.optimizedRoute, sortState.sortOrder, sortState.userLocation]);

  useEffect(() => {
    if (!isOpen || !isMapReady) return undefined;

    const refreshOnFocus = () => {
      window.setTimeout(() => {
        refreshMapLayout();
      }, 120);
    };

    const refreshOnResize = () => {
      refreshMapLayout();
    };

    document.addEventListener('visibilitychange', refreshOnFocus);
    window.addEventListener('focus', refreshOnFocus);
    window.addEventListener('resize', refreshOnResize);
    window.addEventListener('orientationchange', refreshOnResize);

    return () => {
      document.removeEventListener('visibilitychange', refreshOnFocus);
      window.removeEventListener('focus', refreshOnFocus);
      window.removeEventListener('resize', refreshOnResize);
      window.removeEventListener('orientationchange', refreshOnResize);
    };
  }, [isMapReady, isOpen, refreshMapLayout]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[80] bg-white flex flex-col">
      <style>
        {`
          @keyframes campaign-user-pulse {
            0% { transform: scale(0.65); opacity: 1; }
            100% { transform: scale(1.8); opacity: 0; }
          }
        `}
      </style>

      <div className="border-b border-slate-200 bg-slate-50 px-3 py-3 sm:px-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <button
              onClick={onClose}
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white shadow-sm transition-colors hover:bg-slate-100"
              aria-label="Cerrar mapa"
            >
              <Icon name="arrowLeft" size={22} className="text-red-600" />
            </button>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600">
                  <Icon name="map" size={18} />
                </div>
                <div className="min-w-0">
                  <h2 className="truncate text-xl font-bold text-slate-900">{campaign?.name || 'Mapa de invitaciones'}</h2>
                  <p className="truncate text-sm text-slate-600">
                    {assignments.length} direcciones asignadas
                    {campaign ? ` • ${formatCampaignTypeLabel(campaign.type)} • ${formatCampaignDate(campaign.eventDate)}` : ''}
                  </p>
                </div>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="hidden rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-red-600 shadow-sm transition-colors hover:bg-red-50 sm:inline-flex"
          >
            Cerrar
          </button>
        </div>

        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            onClick={sortState.sortOrder === 'optimized' ? handleResetSort : handleOptimizeRoute}
            disabled={sortState.isCalculatingRoute || routeCandidates.length < 2}
            className={`inline-flex items-center justify-center rounded-2xl px-4 py-3 text-sm font-bold text-white shadow-sm transition-all disabled:cursor-not-allowed disabled:opacity-60 ${
              sortState.sortOrder === 'optimized'
                ? 'bg-emerald-600 hover:bg-emerald-700'
                : 'bg-indigo-600 hover:bg-indigo-700'
            }`}
          >
            <Icon name="activity" size={18} className="mr-2" />
            {sortState.isCalculatingRoute
              ? 'Calculando ruta...'
              : sortState.sortOrder === 'optimized'
                ? 'Quitar ruta optimizada'
                : 'Crear ruta optimizada'}
          </button>
        </div>
      </div>

      <div className="relative flex-1 bg-slate-100">
        {!isMapReady && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/90">
            <div className="rounded-3xl bg-white px-8 py-7 shadow-lg">
              <div className="flex items-center gap-4">
                <div className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent"></div>
                <p className="text-lg text-slate-700">Cargando mapa interactivo...</p>
              </div>
            </div>
          </div>
        )}

        <div ref={mapRef} className="h-full w-full" />

        {mapError && (
          <div className="absolute inset-x-4 top-4 z-20 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800 shadow-sm">
            Hubo un problema cargando el mapa base. Se intentara refrescar automaticamente.
          </div>
        )}

        {isResolvingCoordinates && assignmentsMissingCoordinates.length > 0 && (
          <div className="absolute inset-x-4 top-20 z-20 rounded-2xl border border-blue-200 bg-white/95 px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm">
            Buscando ubicacion para {assignmentsMissingCoordinates.length} direccion{assignmentsMissingCoordinates.length !== 1 ? 'es' : ''}...
          </div>
        )}

        {!isResolvingCoordinates && assignmentsWithCoords.length === 0 && (
          <div className="absolute inset-x-4 top-20 z-20 rounded-2xl border border-slate-200 bg-white/95 px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm">
            No se encontraron coordenadas exactas. El mapa sigue centrado para que puedas ubicar visualmente la zona.
          </div>
        )}

        <div className="absolute bottom-4 right-4 z-20 flex flex-col gap-2">
          {sortState.sortOrder === 'optimized' && (
            <button
              type="button"
              onClick={() => {
                forceLocationUpdate()
                  .then(() => showToast('Ubicacion actualizada.', 'success', 2000))
                  .catch(() => showToast('No se pudo actualizar tu ubicacion.', 'error'));
              }}
              className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-600 text-white shadow-lg transition-colors hover:bg-blue-700"
              title="Actualizar mi ubicacion"
            >
              <Icon name="crosshair" size={20} />
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              if (!sortState.userLocation || !mapInstanceRef.current) {
                showToast('Tu ubicacion no esta disponible.', 'info');
                return;
              }

              mapInstanceRef.current.setView(
                [sortState.userLocation.lat, sortState.userLocation.lng],
                16,
                { animate: true, duration: 1 }
              );
            }}
            className="flex h-12 w-12 items-center justify-center rounded-full border border-slate-200 bg-white text-blue-600 shadow-lg transition-colors hover:bg-slate-50"
            title="Centrar en mi ubicacion"
          >
            <Icon name="mapPin" size={20} />
          </button>
        </div>
      </div>

      {selectedAssignment && (
        <div className="border-t border-slate-200 bg-white px-4 py-3 shadow-[0_-10px_30px_rgba(15,23,42,0.08)]">
          <div className="min-w-0">
            <div className="mb-2 flex items-center gap-2">
              <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-bold ${getCampaignProgressMeta(selectedAssignment.effectiveStatus).badgeClass}`}>
                {getCampaignProgressMeta(selectedAssignment.effectiveStatus).label}
              </span>
              <span className="text-xs font-semibold text-slate-500">
                {selectedAssignment.snapshot.territoryName || 'Territorio'}
              </span>
            </div>
            <h3 className="truncate text-base font-bold text-slate-900">{selectedAssignment.snapshot.address || 'Direccion sin dato'}</h3>
            {selectedAssignment.snapshot.notes && (
              <p className="mt-2 text-sm text-slate-600">{selectedAssignment.snapshot.notes}</p>
            )}
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => onStatusChange(selectedAssignment.id, CAMPAIGN_PROGRESS_STATUSES.IN_PROGRESS)}
              disabled={isProcessing || selectedAssignment.effectiveStatus === CAMPAIGN_PROGRESS_STATUSES.IN_PROGRESS}
              className={`rounded-2xl border px-4 py-3 text-sm font-bold transition-all disabled:opacity-60 ${
                selectedAssignment.effectiveStatus === CAMPAIGN_PROGRESS_STATUSES.IN_PROGRESS
                  ? 'border-amber-600 bg-amber-500 text-white'
                  : 'border-slate-200 bg-white text-slate-700 hover:border-amber-400'
              }`}
            >
              En progreso
            </button>
            <button
              type="button"
              onClick={() => onStatusChange(selectedAssignment.id, CAMPAIGN_PROGRESS_STATUSES.COMPLETED)}
              disabled={isProcessing || selectedAssignment.effectiveStatus === CAMPAIGN_PROGRESS_STATUSES.COMPLETED}
              className={`rounded-2xl border px-4 py-3 text-sm font-bold transition-all disabled:opacity-60 ${
                selectedAssignment.effectiveStatus === CAMPAIGN_PROGRESS_STATUSES.COMPLETED
                  ? 'border-emerald-700 bg-emerald-600 text-white'
                  : 'border-slate-200 bg-white text-slate-700 hover:border-emerald-400'
              }`}
            >
              Completada
            </button>
          </div>

          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <a
              href={getNavigationUrl(selectedAssignment.snapshot)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex flex-1 items-center justify-center rounded-2xl bg-slate-800 px-4 py-3 text-sm font-bold text-white transition-colors hover:bg-slate-900"
            >
              <Icon name="navigation" size={18} className="mr-2" />
              Abrir en Google Maps
            </a>
          </div>
        </div>
      )}

      <div className="border-t border-slate-200 bg-white px-4 py-2">
        <div className="flex flex-wrap items-center justify-center gap-4 text-xs text-slate-600">
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-amber-500"></span>
            <span>En progreso</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500"></span>
            <span>Completada</span>
          </div>
          {sortState.userLocation && (
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-blue-600"></span>
              <span>Tu ubicacion</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CampaignAssignmentsMapModal;
