export const normalizeAssignedTo = (assignedTo) => {
  if (!assignedTo) return [];
  if (Array.isArray(assignedTo)) return assignedTo;
  return [assignedTo];
};

export const getAssignedNames = (assignedTo) => {
  const normalized = normalizeAssignedTo(assignedTo);
  return normalized.filter(name => name && name.trim() !== '');
};

export const isUserAssigned = (assignedTo, userName) => {
  if (!userName) return false;
  const names = getAssignedNames(assignedTo);
  return names.includes(userName);
};

export const formatTeamNames = (names, isMobile = false) => {
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

export const extractCoordinatesFromUrl = (url) => {
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
      const lat = parseFloat(match[1]);
      const lng = parseFloat(match[2]);
      if (Number.isFinite(lat) && Number.isFinite(lng)) {
        return { lat, lng };
      }
    }
  }

  return null;
};
