export const SESSION_STORAGE_KEY = 'appSession';
export const LEGACY_SESSION_KEY = 'currentUser';
export const REMEMBER_USER_KEY = 'rememberedUser';
export const REMEMBER_ME_KEY = 'rememberMe';
export const SESSION_IDLE_TIMEOUT_MS = 12 * 60 * 60 * 1000;
export const SESSION_ABSOLUTE_TIMEOUT_MS = 7 * 24 * 60 * 60 * 1000;

const SESSION_VERSION = 1;

export const sanitizeSessionUser = (user) => {
  if (!user || typeof user !== 'object') return null;

  const { password, ...safeUser } = user;
  return safeUser;
};

const createSessionEnvelope = (user, existingEnvelope = null, options = {}) => {
  const now = Date.now();
  const loginAt = existingEnvelope?.loginAt || now;
  const persistUntilLogout = options.persistUntilLogout
    ?? existingEnvelope?.persistUntilLogout === true;

  return {
    user: sanitizeSessionUser(user),
    loginAt,
    lastActivityAt: now,
    expiresAt: persistUntilLogout
      ? null
      : (existingEnvelope?.expiresAt || (loginAt + SESSION_ABSOLUTE_TIMEOUT_MS)),
    persistUntilLogout,
    version: SESSION_VERSION
  };
};

const migrateLegacyUser = (user) => createSessionEnvelope(user);

export const parseSession = (raw) => {
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw);

    if (parsed?.user?.id) {
      return parsed;
    }

    if (parsed?.id) {
      return migrateLegacyUser(parsed);
    }

    return null;
  } catch {
    return null;
  }
};

export const isSessionExpired = (session, now = Date.now()) => {
  if (!session?.user?.id) return true;
  if (session.persistUntilLogout) return false;
  if (session.expiresAt && now > session.expiresAt) return true;
  if (now - session.lastActivityAt > SESSION_IDLE_TIMEOUT_MS) return true;
  return false;
};

const writeSessionEnvelope = (envelope) => {
  if (!envelope?.user?.id) return;

  const raw = JSON.stringify(envelope);

  if (envelope.persistUntilLogout) {
    localStorage.setItem(SESSION_STORAGE_KEY, raw);
    sessionStorage.removeItem(SESSION_STORAGE_KEY);
  } else {
    sessionStorage.setItem(SESSION_STORAGE_KEY, raw);
    localStorage.removeItem(SESSION_STORAGE_KEY);
  }

  sessionStorage.removeItem(LEGACY_SESSION_KEY);
};

const readRawSession = () => (
  localStorage.getItem(SESSION_STORAGE_KEY)
  || sessionStorage.getItem(SESSION_STORAGE_KEY)
  || sessionStorage.getItem(LEGACY_SESSION_KEY)
);

const hydrateEnvelope = (envelope, { fromPersistentStorage = false } = {}) => {
  if (!envelope) return null;

  if (envelope.persistUntilLogout == null && fromPersistentStorage) {
    envelope.persistUntilLogout = true;
  }

  return envelope;
};

const readStoredEnvelope = () => {
  const localRaw = localStorage.getItem(SESSION_STORAGE_KEY);
  if (localRaw) {
    return hydrateEnvelope(parseSession(localRaw), { fromPersistentStorage: true });
  }

  const tabRaw = sessionStorage.getItem(SESSION_STORAGE_KEY);
  if (tabRaw) {
    return hydrateEnvelope(parseSession(tabRaw));
  }

  const legacyRaw = sessionStorage.getItem(LEGACY_SESSION_KEY);
  if (!legacyRaw) return null;

  const migrated = parseSession(legacyRaw);
  if (migrated) {
    writeSessionEnvelope(migrated);
  }

  return migrated;
};

export const readSession = ({ includeExpired = false } = {}) => {
  const envelope = readStoredEnvelope();
  if (!envelope) return null;
  if (!includeExpired && isSessionExpired(envelope)) return null;
  return envelope;
};

export const saveSession = (user, { persistUntilLogout = false } = {}) => {
  const envelope = createSessionEnvelope(user, null, { persistUntilLogout });
  writeSessionEnvelope(envelope);

  if (persistUntilLogout && user?.accessCode) {
    localStorage.setItem(REMEMBER_USER_KEY, user.accessCode);
    localStorage.setItem(REMEMBER_ME_KEY, 'true');
  } else {
    localStorage.removeItem(REMEMBER_USER_KEY);
    localStorage.removeItem(REMEMBER_ME_KEY);
  }

  return envelope;
};

export const refreshSessionUser = (user) => {
  const existingEnvelope = readStoredEnvelope();
  const envelope = createSessionEnvelope(user, existingEnvelope);
  writeSessionEnvelope(envelope);
  return envelope;
};

export const touchSession = () => {
  const envelope = readStoredEnvelope();
  if (!envelope || isSessionExpired(envelope)) return false;

  envelope.lastActivityAt = Date.now();
  writeSessionEnvelope(envelope);
  return true;
};

export const clearSession = () => {
  localStorage.removeItem(SESSION_STORAGE_KEY);
  sessionStorage.removeItem(SESSION_STORAGE_KEY);
  sessionStorage.removeItem(LEGACY_SESSION_KEY);
};

export const getRememberedAccessCode = () => {
  if (localStorage.getItem(REMEMBER_ME_KEY) !== 'true') return '';
  return localStorage.getItem(REMEMBER_USER_KEY) || '';
};

export const getSessionUser = () => readSession()?.user || null;

export const backupSession = () => {
  const session = readSession();
  if (!session) return null;
  return readRawSession();
};

export const restoreSession = (backupRaw) => {
  if (!backupRaw) return false;

  const envelope = parseSession(backupRaw);
  if (!envelope || isSessionExpired(envelope)) return false;

  writeSessionEnvelope(envelope);

  if (envelope.persistUntilLogout && envelope.user?.accessCode) {
    localStorage.setItem(REMEMBER_USER_KEY, envelope.user.accessCode);
    localStorage.setItem(REMEMBER_ME_KEY, 'true');
  }

  return true;
};

export const isTransientAuthError = (error) => {
  const code = error?.code || '';

  return (
    code === 'bootstrap/auth-timeout'
    || code === 'unavailable'
    || code === 'deadline-exceeded'
    || code === 'cancelled'
    || code === 'network-request-failed'
    || code === 'resource-exhausted'
  );
};
