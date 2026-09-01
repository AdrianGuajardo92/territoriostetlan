import React, { memo, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import ReactDOM from 'react-dom';
import Icon from '../common/Icon';
import { useToast } from '../../hooks/useToast';
import { useBackHandler } from '../../hooks/useBackHandler';
import useLocationTracking from '../../hooks/useLocationTracking';
import { optimizeRoute } from '../../utils/routeOptimizer';
import {
  CAMPAIGN_PROGRESS_STATUSES,
  getCampaignProgressMeta
} from '../../utils/campaignUtils';
import { extractCoordinatesFromUrl } from '../../utils/territoryHelpers';
import { getDisplayAddress, getFullAddress } from '../../utils/helpers';

const getCampaignTypeIcon = (type) => {
  const normalized = String(type || '').toLowerCase();
  if (normalized === 'conmemoracion' || normalized === 'conmemoración') return 'wine';
  if (normalized === 'especial') return 'bookmark';
  return 'building';
};

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
    getFullAddress(snapshot, getDisplayAddress(snapshot, '')),
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

  const encodedAddress = encodeURIComponent(getFullAddress(snapshot, getDisplayAddress(snapshot, '')));
  return `https://www.google.com/maps/dir/?api=1&destination=${encodedAddress}&travelmode=${mode}`;
};

const getMarkerColor = (assignment) => (
  getEffectiveAssignmentStatus(assignment) === CAMPAIGN_PROGRESS_STATUSES.COMPLETED
    ? '#10b981'
    : '#f59e0b'
);

const SELECTED_MARKER_ACCENT = '#2563eb';
const MARKER_SIZE = 36;
const MARKER_PIN_TAIL = 10;
const MARKER_SHADOW = '0 8px 20px rgba(15, 23, 42, 0.28)';
const MAP_PANEL_TRANSITION_MS = 280;

const getAssignmentMarkerLabel = (assignment, visibleIndex, sortOrder) => (
  sortOrder === 'optimized' && assignment.routeOrder
    ? assignment.routeOrder
    : visibleIndex
);

const buildMarkerCircleInlineStyle = (color, isSelected) => [
  `background-color: ${color}`,
  'color: white',
  `width: ${MARKER_SIZE}px`,
  `height: ${MARKER_SIZE}px`,
  'border-radius: 9999px',
  'display: flex',
  'align-items: center',
  'justify-content: center',
  'font-weight: 700',
  'font-size: 15px',
  `border: ${isSelected ? 4 : 3}px solid ${isSelected ? SELECTED_MARKER_ACCENT : 'white'}`,
  `box-shadow: ${MARKER_SHADOW}`,
].join('; ');

const buildCampaignMarkerIconHtml = (displayNumber, color, isSelected) => {
  const pinTail = isSelected
    ? `<div style="
        width: 0;
        height: 0;
        margin-top: -2px;
        border-left: 7px solid transparent;
        border-right: 7px solid transparent;
        border-top: ${MARKER_PIN_TAIL}px solid ${color};
      "></div>`
    : `<div style="
        width: 0;
        height: 0;
        margin-top: -2px;
        border-left: 7px solid transparent;
        border-right: 7px solid transparent;
        border-top: ${MARKER_PIN_TAIL}px solid transparent;
      "></div>`;

  return `
    <div style="display:flex;flex-direction:column;align-items:center;width:${MARKER_SIZE}px;">
      <div style="${buildMarkerCircleInlineStyle(color, isSelected)}">${displayNumber}</div>
      ${pinTail}
    </div>
  `;
};

const createCampaignMarkerIcon = (L, { displayNumber, color, isSelected }) => {
  const height = MARKER_SIZE + MARKER_PIN_TAIL;
  const anchorY = height;

  return L.divIcon({
    html: buildCampaignMarkerIconHtml(displayNumber, color, isSelected),
    iconSize: [MARKER_SIZE, height],
    iconAnchor: [MARKER_SIZE / 2, anchorY],
    className: `campaign-map-marker${isSelected ? ' campaign-map-marker--selected' : ''}`,
  });
};

const CampaignAssignmentsMapModal = ({
  isOpen,
  onClose,
  campaign,
  assignments = [],
  onStatusChange,
  isProcessing = false,
  modalId = 'campaign-assignments-map-modal',
  participantName = ''
}) => {
  // Este modal no usa <Modal>; se registra solo.
  useBackHandler({ isOpen, onClose, id: modalId });

  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef({});
  const routeLineRef = useRef(null);
  const userMarkerRef = useRef(null);
  const tileLayerRef = useRef(null);
  const tileLayerIndexRef = useRef(0);
  const tileLoadStatsRef = useRef({ loaded: 0, errors: 0 });
  const prevSelectedAssignmentIdRef = useRef(null);
  const mapOpenLayoutAppliedRef = useRef(false);
  const prevMarkerStructureKeyRef = useRef('');
  const assignmentsWithCoordsRef = useRef([]);
  const [shouldRender, setShouldRender] = useState(isOpen);
  const sortStateRef = useRef({
    sortOrder: 'default',
    optimizedRoute: [],
    isCalculatingRoute: false,
    userLocation: null
  });
  const autoSelectedForOpenRef = useRef(false);
  const { showToast } = useToast();
  const [isMapReady, setIsMapReady] = useState(false);
  const [mapInstanceEpoch, setMapInstanceEpoch] = useState(0);
  const [showMapSpinner, setShowMapSpinner] = useState(false);
  const [mapError, setMapError] = useState(false);
  const [selectedAssignmentId, setSelectedAssignmentId] = useState(null);
  const [statusOverrides, setStatusOverrides] = useState({});
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
  const isExiting = !isOpen && shouldRender;

  useEffect(() => {
    if (isOpen) {
      setShouldRender(true);
      return undefined;
    }

    if (!shouldRender) return undefined;

    const timer = window.setTimeout(() => {
      setShouldRender(false);
    }, MAP_PANEL_TRANSITION_MS);

    return () => window.clearTimeout(timer);
  }, [isOpen, shouldRender]);

  const assignmentsWithResolvedStatus = useMemo(() => (
    assignments.map((assignment) => ({
      ...assignment,
      status: statusOverrides[assignment.id] ?? assignment.status
    }))
  ), [assignments, statusOverrides]);

  const rawAssignmentsWithMeta = useMemo(() => assignmentsWithResolvedStatus.map((assignment) => {
    const snapshot = assignment.addressSnapshot || {};
    return {
      ...assignment,
      snapshot,
      effectiveStatus: getEffectiveAssignmentStatus(assignment),
      coordinates: getSnapshotCoordinates(snapshot)
    };
  }), [assignmentsWithResolvedStatus]);

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

  assignmentsWithCoordsRef.current = assignmentsWithCoords;
  sortStateRef.current = sortState;

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

  const markerStructureSignature = useMemo(() => {
    const assignmentPart = displayedAssignments
      .filter((assignment) => assignment.coordinates)
      .map((assignment) => `${assignment.id}:${assignment.coordinates.lat},${assignment.coordinates.lng}`)
      .join('|');
    const routePart = sortState.optimizedRoute.map((item) => item.id).join(',');
    const userPart = sortState.userLocation
      ? `${sortState.userLocation.lat},${sortState.userLocation.lng}`
      : '';
    return `${sortState.sortOrder}|${assignmentPart}|${routePart}|${userPart}`;
  }, [displayedAssignments, sortState.optimizedRoute, sortState.sortOrder, sortState.userLocation]);

  const markerAppearanceSignature = useMemo(() => (
    displayedAssignments.map((assignment) => (
      `${assignment.id}:${assignment.effectiveStatus}:${assignment.id === selectedAssignmentId ? 1 : 0}`
    )).join('|')
  ), [displayedAssignments, selectedAssignmentId]);

  const selectedAssignment = useMemo(
    () => displayedAssignments.find((assignment) => assignment.id === selectedAssignmentId) || null,
    [displayedAssignments, selectedAssignmentId]
  );

  const assignmentsMissingCoordinates = useMemo(
    () => rawAssignmentsWithMeta.filter((assignment) => !assignment.coordinates),
    [rawAssignmentsWithMeta]
  );

  useEffect(() => {
    if (!isOpen || isMapReady) {
      setShowMapSpinner(false);
      return undefined;
    }

    const timer = window.setTimeout(() => {
      setShowMapSpinner(true);
    }, 180);

    return () => window.clearTimeout(timer);
  }, [isMapReady, isOpen]);

  useLayoutEffect(() => {
    if (!shouldRender) {
      setSelectedAssignmentId(null);
      prevSelectedAssignmentIdRef.current = null;
      autoSelectedForOpenRef.current = false;
      mapOpenLayoutAppliedRef.current = false;
      return;
    }

    if (!isOpen) return;

    if (displayedAssignments.length === 0) return;

    const selectedStillVisible = selectedAssignmentId
      && displayedAssignments.some((item) => item.id === selectedAssignmentId);

    if (selectedStillVisible) return;

    const firstId = displayedAssignments[0].id;
    autoSelectedForOpenRef.current = true;
    setSelectedAssignmentId(firstId);
    prevSelectedAssignmentIdRef.current = firstId;
  }, [displayedAssignments, isOpen, selectedAssignmentId, shouldRender]);

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

  const destroyMapInstance = useCallback(() => {
    clearMapArtifacts();

    if (tileLayerRef.current && mapInstanceRef.current) {
      mapInstanceRef.current.removeLayer(tileLayerRef.current);
      tileLayerRef.current = null;
    }

    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    mapOpenLayoutAppliedRef.current = false;
    prevMarkerStructureKeyRef.current = '';
    setIsMapReady(false);
    setMapError(false);
    setSortState({
      sortOrder: 'default',
      optimizedRoute: [],
      isCalculatingRoute: false,
      userLocation: null
    });
    setMapInstanceEpoch((epoch) => epoch + 1);
  }, [clearMapArtifacts]);

  useEffect(() => {
    if (shouldRender) return undefined;
    destroyMapInstance();
    return undefined;
  }, [destroyMapInstance, shouldRender]);

  const refreshMapLayout = useCallback((options = {}) => {
    const { fitToMarkers = true } = options;
    if (!mapInstanceRef.current) return;

    const coords = assignmentsWithCoordsRef.current;
    const userLocation = sortStateRef.current.userLocation;

    mapInstanceRef.current.invalidateSize();
    tileLayerRef.current?.redraw?.();

    if (!fitToMarkers || mapOpenLayoutAppliedRef.current) {
      return;
    }

    const allBoundsPoints = [
      ...coords.map((assignment) => [assignment.coordinates.lat, assignment.coordinates.lng]),
      ...(userLocation ? [[userLocation.lat, userLocation.lng]] : [])
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
      mapOpenLayoutAppliedRef.current = true;
      mapInstanceRef.current.fitBounds(bounds, {
        padding: [34, 34],
        maxZoom: coords.length > 1 ? 16 : 17,
        animate: false,
      });
    }
  }, []);

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
          address: getDisplayAddress(assignment.snapshot, ''),
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

    let disposed = false;

    const initializeMap = () => {
      if (disposed) return;

      if (!mapRef.current || !window.L) {
        setMapError(true);
        return;
      }

      if (mapInstanceRef.current) {
        if (!isMapReady) {
          setIsMapReady(true);
        }
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

      if (disposed) {
        map.remove();
        return;
      }

      const mountTileLayer = (layerIndex = 0) => {
        tileLayerIndexRef.current = layerIndex;
        tileLoadStatsRef.current = { loaded: 0, errors: 0 };

        const tileConfig = BASE_TILE_LAYERS[layerIndex] || BASE_TILE_LAYERS[0];
        const tileLayer = L.tileLayer(tileConfig.url, tileConfig.options);

        tileLayer.on('tileload', () => {
          tileLoadStatsRef.current.loaded += 1;
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
        }

        await new Promise((resolve) => {
          window.requestAnimationFrame(() => {
            window.requestAnimationFrame(resolve);
          });
        });

        if (disposed) return;
        initializeMap();
      } catch (error) {
        if (!disposed) {
          setMapError(true);
        }
      }
    };

    loadMap();

    return () => {
      disposed = true;
    };
  }, [assignmentsWithCoords, isOpen]);

  useEffect(() => {
    if (shouldRender) return;

    setResolvedCoordinatesById({});
    setIsResolvingCoordinates(false);
    setStatusOverrides({});
  }, [shouldRender]);

  useEffect(() => {
    setStatusOverrides((previous) => {
      if (Object.keys(previous).length === 0) return previous;

      const next = { ...previous };
      let changed = false;

      assignments.forEach((assignment) => {
        if (next[assignment.id] !== undefined && assignment.status === next[assignment.id]) {
          delete next[assignment.id];
          changed = true;
        }
      });

      return changed ? next : previous;
    });
  }, [assignments]);

  const handleAssignmentStatusChange = useCallback(async (assignmentId, status) => {
    setStatusOverrides((previous) => ({
      ...previous,
      [assignmentId]: status
    }));

    try {
      await onStatusChange(assignmentId, status);
    } catch (error) {
      setStatusOverrides((previous) => {
        if (previous[assignmentId] === undefined) return previous;
        const next = { ...previous };
        delete next[assignmentId];
        return next;
      });
      throw error;
    }
  }, [onStatusChange]);

  useEffect(() => {
    if (!shouldRender) return undefined;

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
  }, [shouldRender]);

  useEffect(() => {
    if (!isOpen || !isMapReady || !mapInstanceRef.current || typeof window.L === 'undefined') return;

    const rebuildKey = `${mapInstanceEpoch}|${markerStructureSignature}`;
    if (prevMarkerStructureKeyRef.current === rebuildKey) {
      return;
    }
    prevMarkerStructureKeyRef.current = rebuildKey;

    const L = window.L;
    clearMapArtifacts();

    const markersGroup = L.featureGroup();
    let visibleIndex = 0;

    const activeSelectionId = prevSelectedAssignmentIdRef.current ?? selectedAssignmentId;

    displayedAssignments.forEach((assignment) => {
      if (!assignment.coordinates) return;

      visibleIndex += 1;
      const displayNumber = getAssignmentMarkerLabel(assignment, visibleIndex, sortState.sortOrder);
      const color = getMarkerColor(assignment);
      const isSelected = assignment.id === activeSelectionId;

      const marker = L.marker([assignment.coordinates.lat, assignment.coordinates.lng], {
        icon: createCampaignMarkerIcon(L, { displayNumber, color, isSelected }),
        zIndexOffset: isSelected ? 1000 : 0,
      });

      const tooltipParts = [
        assignment.assignedUserName,
        assignment.snapshot?.territoryName,
        getDisplayAddress(assignment.snapshot, '')
      ].filter(Boolean);

      if (tooltipParts.length > 0) {
        marker.bindTooltip(tooltipParts.join(' · '), {
          direction: 'top',
          offset: [0, -10]
        });
      }

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

    refreshMapLayout({ fitToMarkers: true });

    prevSelectedAssignmentIdRef.current = activeSelectionId;
  }, [markerStructureSignature, clearMapArtifacts, isMapReady, isOpen, mapInstanceEpoch, refreshMapLayout]);

  useEffect(() => {
    if (!isOpen || !isMapReady || typeof window.L === 'undefined') return;

    const L = window.L;
    let visibleIndex = 0;

    displayedAssignments.forEach((assignment) => {
      if (!assignment.coordinates) return;

      const marker = markersRef.current[assignment.id];
      if (!marker) return;

      visibleIndex += 1;
      const displayNumber = getAssignmentMarkerLabel(assignment, visibleIndex, sortState.sortOrder);
      const color = getMarkerColor(assignment);
      const isSelected = assignment.id === selectedAssignmentId;

      marker.setIcon(createCampaignMarkerIcon(L, { displayNumber, color, isSelected }));
      marker.setZIndexOffset(isSelected ? 1000 : 0);
    });

    prevSelectedAssignmentIdRef.current = selectedAssignmentId;
  }, [markerAppearanceSignature, isMapReady, isOpen, sortState.sortOrder]);

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

  if (!shouldRender) return null;

  return ReactDOM.createPortal(
    <div className={`fixed inset-0 z-[110] flex flex-col bg-white ${isExiting ? 'campaign-map-panel-exit' : 'campaign-map-panel-enter'}`}>
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
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white text-slate-700 shadow-sm ring-1 ring-slate-200">
                <Icon name={getCampaignTypeIcon(campaign?.type)} size={18} />
              </div>
              <div className="min-w-0">
                <h2 className="truncate text-xl font-bold text-slate-900">{campaign?.name || 'Mapa de invitaciones'}</h2>
                {participantName ? (
                  <p className="truncate text-sm font-semibold text-slate-500">{participantName}</p>
                ) : null}
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
        {!isMapReady && showMapSpinner && (
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
            <h3 className="truncate text-base font-bold text-slate-900">{getDisplayAddress(selectedAssignment.snapshot)}</h3>
            {selectedAssignment.assignedUserName ? (
              <p className="mt-1 truncate text-sm font-semibold text-indigo-700">
                {selectedAssignment.assignedUserName}
              </p>
            ) : null}
            {selectedAssignment.snapshot.notes && (
              <p className="mt-2 text-sm text-slate-600">{selectedAssignment.snapshot.notes}</p>
            )}
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => handleAssignmentStatusChange(
                selectedAssignment.id,
                CAMPAIGN_PROGRESS_STATUSES.IN_PROGRESS
              )}
              disabled={isProcessing}
              aria-pressed={selectedAssignment.effectiveStatus === CAMPAIGN_PROGRESS_STATUSES.IN_PROGRESS}
              className={`rounded-2xl border px-4 py-3 text-sm font-bold transition-all ${
                isProcessing ? 'disabled:cursor-not-allowed disabled:opacity-60' : ''
              } ${
                selectedAssignment.effectiveStatus === CAMPAIGN_PROGRESS_STATUSES.IN_PROGRESS
                  ? 'border-amber-600 bg-amber-500 text-white shadow-sm'
                  : 'border-slate-200 bg-white text-slate-700 hover:border-amber-400'
              }`}
            >
              En progreso
            </button>
            <button
              type="button"
              onClick={() => handleAssignmentStatusChange(
                selectedAssignment.id,
                CAMPAIGN_PROGRESS_STATUSES.COMPLETED
              )}
              disabled={isProcessing}
              aria-pressed={selectedAssignment.effectiveStatus === CAMPAIGN_PROGRESS_STATUSES.COMPLETED}
              className={`rounded-2xl border px-4 py-3 text-sm font-bold transition-all ${
                isProcessing ? 'disabled:cursor-not-allowed disabled:opacity-60' : ''
              } ${
                selectedAssignment.effectiveStatus === CAMPAIGN_PROGRESS_STATUSES.COMPLETED
                  ? 'border-emerald-700 bg-emerald-600 text-white shadow-sm'
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
    </div>,
    document.body
  );
};

const campaignAssignmentsSignature = (items = []) => (
  items.map((assignment) => (
    `${assignment.id}:${assignment.status}:${assignment.assignedUserId || ''}:${assignment.snapshot?.latitude ?? ''}:${assignment.snapshot?.longitude ?? ''}`
  )).join('|')
);

export default memo(CampaignAssignmentsMapModal, (prevProps, nextProps) => {
  if (prevProps.isOpen !== nextProps.isOpen) return false;
  if (!nextProps.isOpen) return true;
  if (prevProps.participantName !== nextProps.participantName) return false;
  if (prevProps.isProcessing !== nextProps.isProcessing) return false;
  if (prevProps.campaign?.id !== nextProps.campaign?.id) return false;
  if (campaignAssignmentsSignature(prevProps.assignments) !== campaignAssignmentsSignature(nextProps.assignments)) {
    return false;
  }
  return true;
});
