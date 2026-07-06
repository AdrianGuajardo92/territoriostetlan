export const SESSION_STORAGE_KEY = 'appSession';
export const LEGACY_SESSION_KEY = 'currentUser';
export const SESSION_IDLE_TIMEOUT_MS = 12 * 60 * 60 * 1000;
export const SESSION_ABSOLUTE_TIMEOUT_MS = 7 * 24 * 60 * 60 * 1000;

const SESSION_VERSION = 1;

export const sanitizeSessionUser = (user) => {
  if (!user || typeof user !== 'object') return null;

  const { password, ...safeUser } = user;
  return safeUser;
};

const createSessionEnvelope = (user, existingEnvelope = null) => {
  const now = Date.now();
  const loginAt = existingEnvelope?.loginAt || now;

  return {
    user: sanitizeSessionUser(user),
    loginAt,
    lastActivityAt: now,
    expiresAt: existingEnvelope?.expiresAt || (loginAt + SESSION_ABSOLUTE_TIMEOUT_MS),
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
  if (now > session.expiresAt) return true;
  if (now - session.lastActivityAt > SESSION_IDLE_TIMEOUT_MS) return true;
  return false;
};

const writeSessionEnvelope = (envelope) => {
  if (!envelope?.user?.id) return;

  localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(envelope));
  sessionStorage.removeItem(LEGACY_SESSION_KEY);
};

const readStoredEnvelope = () => {
  const localRaw = localStorage.getItem(SESSION_STORAGE_KEY);
  if (localRaw) {
    return parseSession(localRaw);
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

export const saveSession = (user) => {
  const envelope = createSessionEnvelope(user);
  writeSessionEnvelope(envelope);
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
  sessionStorage.removeItem(LEGACY_SESSION_KEY);
};

export const getSessionUser = () => readSession()?.user || null;

export const backupSession = () => {
  const session = readSession();
  if (!session) return null;
  return localStorage.getItem(SESSION_STORAGE_KEY);
};

export const restoreSession = (backupRaw) => {
  if (!backupRaw) return false;

  const envelope = parseSession(backupRaw);
  if (!envelope || isSessionExpired(envelope)) return false;

  writeSessionEnvelope(envelope);
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
