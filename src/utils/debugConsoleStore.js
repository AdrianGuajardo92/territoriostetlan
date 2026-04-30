const MAX_ENTRIES = 350;
const STORE_KEY = '__APP_DEBUG_CONSOLE__';
const ORIGINAL_CONSOLE_KEY = '__APP_DEBUG_ORIGINAL_CONSOLE__';
const DEBUG_CONSOLE_ENABLED = import.meta.env.DEV;

const nowIso = () => new Date().toISOString();

const getRouteSnapshot = () => {
  if (typeof window === 'undefined') return '';
  return `${window.location.pathname}${window.location.search}${window.location.hash}`;
};

const stringifyValue = (value, seen = new WeakSet()) => {
  if (typeof value === 'bigint') return `${value.toString()}n`;

  if (value instanceof Error) {
    return {
      name: value.name,
      message: value.message,
      stack: value.stack,
      code: value.code,
    };
  }

  if (value instanceof Date) return value.toISOString();

  if (typeof Element !== 'undefined' && value instanceof Element) {
    const tag = value.tagName?.toLowerCase() || 'element';
    const id = value.id ? `#${value.id}` : '';
    const classes = value.classList?.length
      ? `.${Array.from(value.classList).slice(0, 4).join('.')}`
      : '';
    return `<${tag}${id}${classes}>`;
  }

  if (value === null || typeof value !== 'object') return value;

  if (seen.has(value)) return '[Circular]';
  seen.add(value);

  if (Array.isArray(value)) {
    return value.slice(0, 50).map((item) => stringifyValue(item, seen));
  }

  const output = {};
  Object.keys(value).slice(0, 80).forEach((key) => {
    try {
      output[key] = stringifyValue(value[key], seen);
    } catch {
      output[key] = '[Unreadable]';
    }
  });

  return output;
};

const formatArg = (arg) => {
  if (arg instanceof Error) {
    return arg.stack || `${arg.name}: ${arg.message}`;
  }

  if (typeof arg === 'string') return arg;
  if (typeof arg === 'undefined') return 'undefined';
  if (typeof arg === 'function') return `[Function ${arg.name || 'anonymous'}]`;
  if (typeof arg === 'symbol') return String(arg);

  try {
    const normalized = stringifyValue(arg);
    if (typeof normalized === 'object' && normalized !== null) {
      return JSON.stringify(normalized, null, 2);
    }
    return String(normalized);
  } catch {
    return String(arg);
  }
};

const createStore = () => {
  let entries = [];
  const listeners = new Set();

  const notify = () => {
    const snapshot = entries;
    listeners.forEach((listener) => listener(snapshot));
  };

  const addEntry = (level, args, source = 'console') => {
    const normalizedArgs = Array.from(args || []);
    const message = normalizedArgs.map(formatArg).join(' ');
    const entry = {
      id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      level,
      source,
      time: nowIso(),
      route: getRouteSnapshot(),
      message: message.length > 12000 ? `${message.slice(0, 12000)}...` : message,
      raw: normalizedArgs.map((arg) => {
        try {
          return stringifyValue(arg);
        } catch {
          return '[Unreadable]';
        }
      }),
    };

    entries = [...entries.slice(-(MAX_ENTRIES - 1)), entry];
    notify();
    return entry;
  };

  const clear = () => {
    entries = [];
    notify();
  };

  const subscribe = (listener) => {
    listeners.add(listener);
    listener(entries);
    return () => listeners.delete(listener);
  };

  return {
    addEntry,
    clear,
    getEntries: () => entries,
    subscribe,
    maxEntries: MAX_ENTRIES,
  };
};

const installConsolePatch = (store) => {
  if (typeof window === 'undefined') return;
  if (window[ORIGINAL_CONSOLE_KEY]) return;

  const originalConsole = {
    log: console.log.bind(console),
    info: console.info.bind(console),
    warn: console.warn.bind(console),
    error: console.error.bind(console),
    debug: console.debug.bind(console),
  };

  window[ORIGINAL_CONSOLE_KEY] = originalConsole;

  Object.keys(originalConsole).forEach((level) => {
    console[level] = (...args) => {
      store.addEntry(level, args, 'console');
      return originalConsole[level](...args);
    };
  });

  window.addEventListener('error', (event) => {
    store.addEntry('error', [
      event.error || event.message || 'Error de ventana',
      {
        filename: event.filename,
        line: event.lineno,
        column: event.colno,
      },
    ], 'window');
  });

  window.addEventListener('unhandledrejection', (event) => {
    store.addEntry('error', [
      event.reason || 'Promesa rechazada sin manejar',
    ], 'unhandledrejection');
  });
};

const getDebugConsoleStore = () => {
  if (!DEBUG_CONSOLE_ENABLED) {
    return createStore();
  }

  if (typeof window === 'undefined') {
    return createStore();
  }

  if (!window[STORE_KEY]) {
    window[STORE_KEY] = createStore();
    installConsolePatch(window[STORE_KEY]);
  }

  return window[STORE_KEY];
};

export const debugConsoleStore = getDebugConsoleStore();

export const addDebugEntry = (level, args, source) => debugConsoleStore.addEntry(level, args, source);
export const clearDebugEntries = () => debugConsoleStore.clear();
export const getDebugEntries = () => debugConsoleStore.getEntries();
export const subscribeToDebugEntries = (listener) => debugConsoleStore.subscribe(listener);
