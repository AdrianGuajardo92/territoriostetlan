// Funciones de utilidad para formatear fechas y texto

export const formatDate = (date, options = {}) => {
    if (!date) return 'N/A';
    const d = date.toDate ? date.toDate() : new Date(date);
    
    if (isNaN(d.getTime())) return 'Fecha inválida';
    
    const defaultOptions = {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        ...options
    };
    
    return d.toLocaleDateString('es-MX', defaultOptions);
};

export const formatShortDate = (date) => {
    return formatDate(date, {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    });
};

export const formatRelativeTime = (date) => {
    if (!date) return null;
    const d = date.toDate ? date.toDate() : new Date(date);
    if (isNaN(d.getTime())) return 'Fecha inválida';
    
    const now = new Date();
    const diff = now - d;
    
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    // Usar solo formato de días
    if (days === 0) {
        return 'Hoy';
    } else if (days === 1) {
        return 'Ayer';
    } else {
        return `Hace ${days} días`;
    }
};

export const normalizeText = (text) => {
    if (!text) return '';
    return text
        .toString()
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9\s]/g, '')
        .trim();
};

export const isCoordinateLikeAddress = (value = '') => {
  const text = String(value || '').trim();
  if (!text) return false;

  const dmsPattern = /^-?\d{1,3}(?:\.\d+)?°(?:\s*\d{1,2}(?:\.\d+)?['′])?(?:\s*\d{1,2}(?:\.\d+)?["″])?\s*[NS]?\s+-?\d{1,3}(?:\.\d+)?°(?:\s*\d{1,2}(?:\.\d+)?['′])?(?:\s*\d{1,2}(?:\.\d+)?["″])?\s*[EW]?$/i;
  const decimalPairPattern = /^-?\d{1,3}(?:\.\d+)?\s*,\s*-?\d{1,3}(?:\.\d+)?$/;

  return dmsPattern.test(text) || decimalPairPattern.test(text);
};

const getAddressRawText = (address, { preferFull = false } = {}) => {
  if (typeof address === 'string') return address;

  if (preferFull) {
    return address?.fullAddress || address?.street || address?.address;
  }

  return address?.street || address?.address || address?.fullAddress;
};

export const getFullAddress = (address, fallback = 'Dirección sin dato') => {
  const text = String(getAddressRawText(address, { preferFull: true }) || '').trim();

  if (!text || isCoordinateLikeAddress(text)) {
    return fallback;
  }

  return text;
};

const hasExplicitAddressNumber = (text = '') => (
  /(?:^|\s)#\s*[0-9]+[a-z]?(?:[-/][a-z0-9]+)?\b/i.test(text)
  || /\b(?:no|num|núm|numero|número)\.?\s*[0-9]+[a-z]?(?:[-/][a-z0-9]+)?\b/i.test(text)
);

const normalizeStreetAndNumber = (value = '') => {
  const text = String(value || '').replace(/\s+/g, ' ').trim();
  if (!text) return '';

  const withNormalizedMarker = text
    .replace(/\b(?:no|num|núm|numero|número)\.?\s*#?\s*/gi, '#')
    .replace(/\s*#\s*/g, ' #')
    .trim();

  if (/^(?:calle|c\.?|avenida|av\.?)\s+[0-9]+[a-z]?$/i.test(withNormalizedMarker)) {
    return withNormalizedMarker;
  }

  const markedMatch = withNormalizedMarker.match(/^(.+?)\s+#([0-9]+[a-z]?(?:[-/][a-z0-9]+)?)(.*)$/i);
  if (markedMatch) {
    const [, street, number, suffix = ''] = markedMatch;
    return `${street.trim()} #${number}${suffix.trim() ? ` ${suffix.trim()}` : ''}`;
  }

  const trailingNumberMatch = withNormalizedMarker.match(
    /^(.+?)\s+([0-9]+[a-z]?(?:[-/][a-z0-9]+)?)(\s+(?:int(?:erior)?\.?|depto\.?|departamento|apt(?:o)?\.?|casa|local)\s*[a-z0-9-]+.*)?$/i
  );

  if (trailingNumberMatch) {
    const [, street, number, suffix = ''] = trailingNumberMatch;
    return `${street.trim()} #${number}${suffix.trim() ? ` ${suffix.trim()}` : ''}`;
  }

  return withNormalizedMarker;
};

const getStreetAddressLine = (text = '') => {
  const normalized = String(text || '')
    .replace(/\s+/g, ' ')
    .replace(/\s*,\s*/g, ', ')
    .trim();

  if (!normalized) return '';

  const segments = normalized.split(',').map(segment => segment.trim()).filter(Boolean);
  if (segments.length === 0) return normalized;

  let streetLine = segments[0];
  const secondSegmentLooksLikeNumber = segments[1]
    && /^(?:#|no\.?|num\.?|núm\.?|numero|número)?\s*[0-9]+[a-z]?(?:[-/][a-z0-9]+)?$/i.test(segments[1]);

  if (!hasExplicitAddressNumber(streetLine) && secondSegmentLooksLikeNumber) {
    streetLine = `${streetLine} ${segments[1]}`;
  }

  return streetLine.replace(/\s+\d{5}\b.*$/, '').trim();
};

export const getDisplayAddress = (address, fallback = 'Dirección sin dato') => {
  const text = String(getAddressRawText(address) || '').trim();

  if (!text || isCoordinateLikeAddress(text)) {
    return fallback;
  }

  const streetLine = getStreetAddressLine(text);
  const displayAddress = normalizeStreetAndNumber(streetLine);

  return displayAddress || fallback;
};

/** Separa calle y número de una dirección ya normalizada (p. ej. "C. X #4418"). */
export const splitDisplayAddress = (displayAddress = '') => {
  const text = String(displayAddress || '').trim();
  if (!text) return { street: '', number: '' };

  const markedMatch = text.match(/^(.+?)\s+#([0-9]+[a-z]?(?:[-/][a-z0-9]+)?)(.*)$/i);
  if (markedMatch) {
    const [, street, num, suffix = ''] = markedMatch;
    const number = `#${num}${suffix.trim() ? ` ${suffix.trim()}` : ''}`;
    return { street: street.trim(), number };
  }

  return { street: text, number: '' };
};

/** Texto corto de la dirección afectada según el tipo de propuesta. */
export const getProposalAddressDisplay = (proposal, currentAddress, fallback = 'Sin dirección') => {
  if (!proposal) return fallback;

  let raw;
  if (proposal.type === 'new') {
    raw = proposal.addressData?.address ?? proposal.address;
  } else if (proposal.type === 'edit') {
    raw = currentAddress?.address;
  } else if (proposal.type === 'delete') {
    raw = proposal.addressInfo?.address;
  }

  return getDisplayAddress(raw, fallback);
};

// Función para quitar acentos de texto para búsqueda inteligente
export const removeAccents = (text) => {
  if (!text) return '';
  
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Quitar diacríticos
    .replace(/[ñ]/g, 'n')
    .replace(/[ç]/g, 'c');
};

// Función de búsqueda inteligente que ignora acentos
export const smartSearch = (searchTerm, targetText) => {
  if (!searchTerm || !targetText) return false;
  
  const cleanSearchTerm = removeAccents(searchTerm.trim());
  const cleanTargetText = removeAccents(targetText);
  
  return cleanTargetText.includes(cleanSearchTerm);
};

const MALE_FIRST_NAMES_ENDING_IN_A = new Set([
  'joshua',
  'nikola',
  'mustafa',
  'abdulla',
  'garcia'
]);

const FEMALE_FIRST_NAMES_NOT_ENDING_IN_A = new Set([
  'ruth',
  'mercedes',
  'beatriz',
  'ines',
  'raquel',
  'elisabet',
  'elizabeth',
  'liz',
  'mary',
  'margaret',
  'susy',
  'susi',
  'sol',
  // Congregación: nombres femeninos que no terminan en -a
  'alison',
  'april',
  'gritzel',
  'grizel',
  'leilany',
  'marisol',
  'montserrat',
  'nahomy',
]);

/** Sufijos típicos de nombres femeninos en español (p. ej. Leilany, Nahomy). */
const FEMININE_NAME_SUFFIXES = ['any', 'iny', 'omy', 'ely'];

/**
 * Infiere género a partir del primer nombre (heurística simple en español).
 * Devuelve 'Hombre', 'Mujer' o null si no se puede determinar.
 */
export const inferGenderFromName = (name = '') => {
  const firstName = normalizeText(name).split(/\s+/).filter(Boolean)[0];
  if (!firstName) return null;

  if (FEMALE_FIRST_NAMES_NOT_ENDING_IN_A.has(firstName)) {
    return 'Mujer';
  }

  if (firstName.endsWith('a') && !MALE_FIRST_NAMES_ENDING_IN_A.has(firstName)) {
    return 'Mujer';
  }

  if (FEMININE_NAME_SUFFIXES.some((suffix) => firstName.endsWith(suffix))) {
    return 'Mujer';
  }

  if (firstName.endsWith('o') || firstName.endsWith('os') || firstName.endsWith('el')) {
    return 'Hombre';
  }

  return 'Hombre';
};

/**
 * Género de un usuario/publicador: campo explícito si existe, si no inferencia por nombre.
 */
export const getUserGender = (userOrName) => {
  const explicitGender = typeof userOrName === 'object'
    ? userOrName?.gender
    : null;

  if (explicitGender && explicitGender !== 'Desconocido') {
    return explicitGender;
  }

  const name = typeof userOrName === 'string'
    ? userOrName
    : userOrName?.name || userOrName?.userNameSnapshot;

  return inferGenderFromName(name);
};
