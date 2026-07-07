import { getDisplayAddress, getFullAddress } from './helpers';

const buildUrlWithMode = (destination, mode, useCoords = false) => {
  const base = useCoords
    ? `https://www.google.com/maps/dir/?api=1&destination=${destination}`
    : `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}`;

  switch (mode) {
    case 'driving':
      return `${base}&travelmode=driving`;
    case 'walking':
      return `${base}&travelmode=walking`;
    case 'transit':
      return `${base}&travelmode=transit`;
    default:
      return useCoords
        ? `https://www.google.com/maps/search/?api=1&query=${destination}`
        : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(destination)}`;
  }
};

const resolveCoordinates = (addressOrSnapshot = {}) => {
  if (Number.isFinite(addressOrSnapshot.latitude) && Number.isFinite(addressOrSnapshot.longitude)) {
    return { lat: addressOrSnapshot.latitude, lng: addressOrSnapshot.longitude };
  }

  if (Array.isArray(addressOrSnapshot.coords) && addressOrSnapshot.coords.length >= 2) {
    const [lat, lng] = addressOrSnapshot.coords;
    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      return { lat, lng };
    }
  }

  if (addressOrSnapshot.mapUrl && String(addressOrSnapshot.mapUrl).trim() !== '') {
    const mapUrlMatch = String(addressOrSnapshot.mapUrl).match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
    if (mapUrlMatch) {
      return {
        lat: parseFloat(mapUrlMatch[1]),
        lng: parseFloat(mapUrlMatch[2])
      };
    }
  }

  return null;
};

export const getAddressNavigationUrl = (addressOrSnapshot = {}, mode = 'driving') => {
  const coords = resolveCoordinates(addressOrSnapshot);

  if (coords) {
    const destination = `${coords.lat},${coords.lng}`;
    return buildUrlWithMode(destination, mode, true);
  }

  const displayAddress = getDisplayAddress(addressOrSnapshot);
  const fullAddress = getFullAddress(addressOrSnapshot, displayAddress);
  if (!fullAddress) return '';

  return buildUrlWithMode(fullAddress, mode, false);
};

export const getAddressNavigationUrls = (addressOrSnapshot = {}) => ({
  driving: getAddressNavigationUrl(addressOrSnapshot, 'driving'),
  walking: getAddressNavigationUrl(addressOrSnapshot, 'walking'),
  transit: getAddressNavigationUrl(addressOrSnapshot, 'transit')
});
