import { beforeEach, describe, expect, it } from 'vitest';
import {
  REMEMBER_ME_KEY,
  REMEMBER_USER_KEY,
  SESSION_ABSOLUTE_TIMEOUT_MS,
  SESSION_IDLE_TIMEOUT_MS,
  SESSION_STORAGE_KEY,
  clearSession,
  getRememberedAccessCode,
  isSessionExpired,
  readSession,
  restoreSession,
  saveSession
} from './sessionManager.js';

const createMemoryStorage = () => {
  const store = new Map();

  return {
    getItem: (key) => (store.has(key) ? store.get(key) : null),
    setItem: (key, value) => {
      store.set(String(key), String(value));
    },
    removeItem: (key) => {
      store.delete(String(key));
    },
    clear: () => {
      store.clear();
    }
  };
};

const user = {
  id: 'user-1',
  accessCode: 'adrian1',
  name: 'Adrián',
  role: 'admin',
  password: 'secreta'
};

describe('sessionManager remember-me', () => {
  beforeEach(() => {
    globalThis.localStorage = createMemoryStorage();
    globalThis.sessionStorage = createMemoryStorage();
  });

  it('persiste la sesión en localStorage y no caduca si se recuerda al usuario', () => {
    const envelope = saveSession(user, { persistUntilLogout: true });
    const stored = JSON.parse(localStorage.getItem(SESSION_STORAGE_KEY));

    expect(envelope.persistUntilLogout).toBe(true);
    expect(stored.user.id).toBe('user-1');
    expect(stored.user.password).toBeUndefined();
    expect(sessionStorage.getItem(SESSION_STORAGE_KEY)).toBeNull();
    expect(getRememberedAccessCode()).toBe('adrian1');
    expect(isSessionExpired({
      ...stored,
      lastActivityAt: Date.now() - SESSION_IDLE_TIMEOUT_MS * 2,
      expiresAt: Date.now() - 1000
    })).toBe(false);
    expect(readSession()?.user.accessCode).toBe('adrian1');
  });

  it('deja la sesión solo en la pestaña si no se recuerda al usuario', () => {
    saveSession(user, { persistUntilLogout: false });

    expect(localStorage.getItem(SESSION_STORAGE_KEY)).toBeNull();
    expect(sessionStorage.getItem(SESSION_STORAGE_KEY)).toBeTruthy();
    expect(localStorage.getItem(REMEMBER_ME_KEY)).toBeNull();
    expect(getRememberedAccessCode()).toBe('');
    expect(readSession()?.user.id).toBe('user-1');
  });

  it('caduca una sesión de pestaña por inactividad o vencimiento absoluto', () => {
    const now = Date.now();

    expect(isSessionExpired({
      user: { id: 'user-1' },
      persistUntilLogout: false,
      lastActivityAt: now - SESSION_IDLE_TIMEOUT_MS - 1,
      expiresAt: now + SESSION_ABSOLUTE_TIMEOUT_MS
    }, now)).toBe(true);

    expect(isSessionExpired({
      user: { id: 'user-1' },
      persistUntilLogout: false,
      lastActivityAt: now,
      expiresAt: now - 1
    }, now)).toBe(true);
  });

  it('borra la sesión al cerrar, pero conserva el usuario recordado', () => {
    saveSession(user, { persistUntilLogout: true });
    clearSession();

    expect(readSession()).toBeNull();
    expect(localStorage.getItem(SESSION_STORAGE_KEY)).toBeNull();
    expect(sessionStorage.getItem(SESSION_STORAGE_KEY)).toBeNull();
    expect(getRememberedAccessCode()).toBe('adrian1');
  });

  it('restaura una sesión recordada después de limpiar el almacenamiento', () => {
    const backup = (() => {
      saveSession(user, { persistUntilLogout: true });
      return localStorage.getItem(SESSION_STORAGE_KEY);
    })();

    localStorage.clear();
    sessionStorage.clear();

    expect(restoreSession(backup)).toBe(true);
    expect(readSession()?.persistUntilLogout).toBe(true);
    expect(getRememberedAccessCode()).toBe('adrian1');
  });
});
