const STORAGE_KEY = 'territoriostetlan:navigation-state:v1';
const MAX_STATE_AGE_MS = 12 * 60 * 60 * 1000;

const APP_VIEWS = new Set([
  'territories',
  'territory',
  'campaigns',
  'proposals',
  'studiesAndRevisits',
  'modal'
]);

const MODAL_IDS = new Set([
  'admin',
  'install',
  'password',
  'search',
  'updates'
]);

const ADMIN_VIEWS = new Set([
  'actions',
  'backup',
  'no_access',
  'proposals',
  'users'
]);

const ADMIN_CHILD_MODALS = new Set([
  'admin-list',
  'archived-addresses',
  'export-addresses',
  'pioneer-list',
  'publisher-list',
  'stats',
  'territory-management',
  'user-management'
]);

const getStorage = () => {
  if (typeof window === 'undefined') return null;

  try {
    return window.sessionStorage || null;
  } catch {
    return null;
  }
};

const normalizeAdminState = (admin) => {
  if (!admin || typeof admin !== 'object') return null;

  const view = ADMIN_VIEWS.has(admin.view) ? admin.view : 'actions';
  const childModal = ADMIN_CHILD_MODALS.has(admin.childModal)
    ? admin.childModal
    : null;

  return { view, childModal };
};

const normalizeNavigationState = (state) => {
  if (!state || typeof state !== 'object') return null;

  const appView = APP_VIEWS.has(state.appView) ? state.appView : null;
  if (!appView || appView === 'territories') return null;

  const updatedAt = Number(state.updatedAt || 0);
  if (!Number.isFinite(updatedAt) || Date.now() - updatedAt > MAX_STATE_AGE_MS) {
    return null;
  }

  if (appView === 'modal') {
    const modalId = MODAL_IDS.has(state.modalId) ? state.modalId : null;
    if (!modalId) return null;

    return {
      appView,
      modalId,
      admin: modalId === 'admin' ? normalizeAdminState(state.admin) : null,
      updatedAt
    };
  }

  if (appView === 'territory') {
    const territoryId = typeof state.territoryId === 'string' ? state.territoryId : null;
    if (!territoryId) return null;

    return {
      appView,
      territoryId,
      highlightedAddressId: typeof state.highlightedAddressId === 'string'
        ? state.highlightedAddressId
        : null,
      updatedAt
    };
  }

  return { appView, updatedAt };
};

export const readNavigationState = () => {
  const storage = getStorage();
  if (!storage) return null;

  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return normalizeNavigationState(parsed);
  } catch {
    storage.removeItem(STORAGE_KEY);
    return null;
  }
};

export const saveNavigationState = (state) => {
  const storage = getStorage();
  if (!storage) return;

  if (!state || state.appView === 'territories') {
    storage.removeItem(STORAGE_KEY);
    return;
  }

  const normalized = normalizeNavigationState({
    ...state,
    updatedAt: Date.now()
  });

  if (!normalized) {
    storage.removeItem(STORAGE_KEY);
    return;
  }

  storage.setItem(STORAGE_KEY, JSON.stringify(normalized));
};

export const clearNavigationState = () => {
  const storage = getStorage();
  if (storage) {
    storage.removeItem(STORAGE_KEY);
  }
};
