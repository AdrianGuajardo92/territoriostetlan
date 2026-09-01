/**
 * Precursores regulares de la congregación (lista informativa, sin campo en Firestore).
 * Nombres en el formato corto usado en la app (users.name).
 * Fuente: Registros JW.org — Estación Tetlán señas, jul 2026.
 */
export const PIONEER_NAMES = [
  'Andrea Alcázar',
  'Cristina Ávila',
  'Mauricio Chávez',
  'Rosaura Chávez',
  'Nahomy Estrada',
  'Karina González',
  'Alison González',
  'Fabiola Guajardo',
  'Luis Hernández',
  'Greta Hernández', // JW: Greta Lizzete Placencia Santana — users.name en Firestore
  'Gabriela Silva', // JW: Gabriela Abigail López García (casada de Silva) — users.name en Firestore
  'Sophia Macias', // JW: Ana Sophia Macías Rodríguez — users.name en Firestore (sin acento)
  'Verónica Martínez', // JW: Olga Verónica Martínez Flores
  'Martha Martínez', // JW: Martha María Auxilio Martínez Martínez — users.name usa "Martha" con h
  'Martín Martínez',
  'Gabriela Martínez',
  'Adrián Merino',
  'Carlos Ramos',
  'Gloria Romero',
];

export const normalizePersonName = (name) => {
  if (!name || typeof name !== 'string') return '';
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ');
};

const PIONEER_NAMES_NORMALIZED = new Set(PIONEER_NAMES.map(normalizePersonName));

export const isPioneerName = (name) => PIONEER_NAMES_NORMALIZED.has(normalizePersonName(name));

export const isPioneerUser = (user) => Boolean(user?.name && isPioneerName(user.name));

export const filterPioneerUsers = (users = []) =>
  users
    .filter(isPioneerUser)
    .sort((a, b) => (a.name || '').localeCompare(b.name || '', 'es'));
