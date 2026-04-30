import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  Bug,
  ChevronDown,
  Clipboard,
  Download,
  GripVertical,
  Info,
  ListFilter,
  Search,
  Terminal,
  Trash2,
  X,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import {
  clearDebugEntries,
  getDebugEntries,
  subscribeToDebugEntries,
} from '../../utils/debugConsoleStore';

const FILTERS = [
  {
    id: 'all',
    label: 'Todo',
    icon: ListFilter,
    active: 'bg-[#d4af37]/15 text-[#d4af37] ring-1 ring-[#d4af37]/25',
    badge: 'bg-[#d4af37]/15 text-[#d4af37]',
  },
  {
    id: 'error',
    label: 'Errores',
    icon: AlertCircle,
    active: 'bg-red-500/[0.10] text-red-300 ring-1 ring-red-500/25',
    badge: 'bg-red-500/15 text-red-200',
  },
  {
    id: 'warn',
    label: 'Avisos',
    icon: AlertTriangle,
    active: 'bg-yellow-500/[0.10] text-yellow-200 ring-1 ring-yellow-500/25',
    badge: 'bg-yellow-500/15 text-yellow-100',
  },
  {
    id: 'log',
    label: 'Logs',
    icon: Terminal,
    active: 'bg-emerald-500/[0.10] text-emerald-200 ring-1 ring-emerald-500/25',
    badge: 'bg-emerald-500/15 text-emerald-100',
  },
];

const SHORTCUT_HELP = 'Mac: Cmd + Shift + D | Windows: Ctrl + Shift + D';
const DEFAULT_PANEL_WIDTH = 460;
const EXPANDED_PANEL_WIDTH = 720;
const MAX_PANEL_WIDTH = 960;
const MIN_PANEL_WIDTH = 320;
const PANEL_VIEWPORT_GAP = 12;
const PANEL_WIDTH_STEP = 24;
const COMPACT_FILTER_WIDTH = 390;
const PANEL_TRANSITION_MS = 320;

const getPanelBounds = () => {
  if (typeof window === 'undefined') {
    return { min: MIN_PANEL_WIDTH, max: MAX_PANEL_WIDTH };
  }

  const viewportMax = Math.max(280, window.innerWidth - PANEL_VIEWPORT_GAP);
  const max = Math.min(MAX_PANEL_WIDTH, viewportMax);
  return {
    min: Math.min(MIN_PANEL_WIDTH, max),
    max,
  };
};

const clampPanelWidth = (width) => {
  const { min, max } = getPanelBounds();
  return Math.min(Math.max(width, min), max);
};

const LEVEL_CONFIG = {
  error: {
    label: 'ERROR',
    icon: AlertTriangle,
    dot: 'bg-red-400',
    text: 'text-red-300',
    border: 'border-red-500/20',
    bg: 'bg-red-500/[0.06]',
  },
  warn: {
    label: 'WARN',
    icon: AlertTriangle,
    dot: 'bg-yellow-300',
    text: 'text-yellow-200',
    border: 'border-yellow-500/20',
    bg: 'bg-yellow-500/[0.06]',
  },
  info: {
    label: 'INFO',
    icon: Info,
    dot: 'bg-blue-300',
    text: 'text-blue-200',
    border: 'border-blue-500/20',
    bg: 'bg-blue-500/[0.06]',
  },
  debug: {
    label: 'DEBUG',
    icon: Terminal,
    dot: 'bg-purple-300',
    text: 'text-purple-200',
    border: 'border-purple-500/20',
    bg: 'bg-purple-500/[0.06]',
  },
  log: {
    label: 'LOG',
    icon: Terminal,
    dot: 'bg-emerald-300',
    text: 'text-emerald-200',
    border: 'border-emerald-500/20',
    bg: 'bg-emerald-500/[0.06]',
  },
};

const formatTime = (time) => {
  try {
    return new Date(time).toLocaleTimeString('es-MX', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  } catch {
    return '';
  }
};

const formatEntryForText = (entry) => [
  `[${formatTime(entry.time)}] ${entry.level.toUpperCase()} ${entry.source || ''}`,
  entry.route ? `Ruta: ${entry.route}` : '',
  entry.message || '(sin mensaje)',
].filter(Boolean).join('\n');

const copyText = async (text) => {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.setAttribute('readonly', '');
  textarea.style.position = 'fixed';
  textarea.style.left = '-9999px';
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand('copy');
  textarea.remove();
};

export default function DebugPanel() {
  const { currentUser: usuarioActual, users: usuarios } = useApp();
  const [entries, setEntries] = useState(() => getDebugEntries());
  const [open, setOpen] = useState(false);
  const [panelRendered, setPanelRendered] = useState(false);
  const [panelVisible, setPanelVisible] = useState(false);
  const [panelWidth, setPanelWidth] = useState(DEFAULT_PANEL_WIDTH);
  const [isResizing, setIsResizing] = useState(false);
  const [filter, setFilter] = useState('all');
  const [query, setQuery] = useState('');
  const [copyStatus, setCopyStatus] = useState('');
  const listRef = useRef(null);
  const panelBounds = getPanelBounds();
  const visiblePanelWidth = clampPanelWidth(panelWidth);
  const panelIsWide = visiblePanelWidth >= (DEFAULT_PANEL_WIDTH + EXPANDED_PANEL_WIDTH) / 2;
  const filtersAreCompact = visiblePanelWidth < COMPACT_FILTER_WIDTH;

  const usuarioEnSistema = useMemo(() => {
    const idActual = usuarioActual?.id;
    return usuarios?.find((usuario) => usuario?.id === idActual);
  }, [usuarioActual?.id, usuarios]);

  const isAdmin = usuarioEnSistema?.role === 'admin' || usuarioActual?.role === 'admin';

  useEffect(() => subscribeToDebugEntries(setEntries), []);

  useEffect(() => {
    const handleKeyDown = (event) => {
      const key = event.key?.toLowerCase();
      const usesPrimaryModifier = event.metaKey || event.ctrlKey;

      if (!isAdmin || key !== 'd' || !event.shiftKey || !usesPrimaryModifier) return;

      event.preventDefault();
      setOpen((current) => !current);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isAdmin]);

  useEffect(() => {
    if (open) {
      setPanelRendered(true);
      const animationFrame = window.requestAnimationFrame(() => setPanelVisible(true));
      return () => window.cancelAnimationFrame(animationFrame);
    }

    setPanelVisible(false);
    const closeTimer = window.setTimeout(() => setPanelRendered(false), PANEL_TRANSITION_MS);
    return () => window.clearTimeout(closeTimer);
  }, [open]);

  useEffect(() => {
    if (!open || !listRef.current) return;
    listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [entries.length, open, filter, query]);

  useEffect(() => {
    const handleWindowResize = () => {
      setPanelWidth((current) => clampPanelWidth(current));
    };

    window.addEventListener('resize', handleWindowResize);
    return () => window.removeEventListener('resize', handleWindowResize);
  }, []);

  useEffect(() => {
    if (!isResizing) return undefined;

    const originalCursor = document.body.style.cursor;
    const originalUserSelect = document.body.style.userSelect;
    document.body.style.cursor = 'ew-resize';
    document.body.style.userSelect = 'none';

    return () => {
      document.body.style.cursor = originalCursor;
      document.body.style.userSelect = originalUserSelect;
    };
  }, [isResizing]);

  const counts = useMemo(() => {
    return entries.reduce((acc, entry) => {
      acc.all += 1;
      if (entry.level === 'error') acc.error += 1;
      if (entry.level === 'warn') acc.warn += 1;
      if (['log', 'info', 'debug'].includes(entry.level)) acc.log += 1;
      return acc;
    }, { all: 0, error: 0, warn: 0, log: 0 });
  }, [entries]);

  const filteredEntries = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return entries.filter((entry) => {
      const matchesFilter =
        filter === 'all' ||
        entry.level === filter ||
        (filter === 'log' && ['log', 'info', 'debug'].includes(entry.level));

      if (!matchesFilter) return false;
      if (!normalizedQuery) return true;

      return [
        entry.message,
        entry.route,
        entry.source,
        entry.level,
      ].filter(Boolean).some((value) => String(value).toLowerCase().includes(normalizedQuery));
    });
  }, [entries, filter, query]);

  const userRole = usuarioEnSistema?.role || usuarioActual?.role || 'Sin rol';
  const route = typeof window !== 'undefined'
    ? `${window.location.pathname}${window.location.search}`
    : '';

  const handleResizeStart = useCallback((event) => {
    if (event.button !== undefined && event.button !== 0) return;

    event.preventDefault();
    event.currentTarget.setPointerCapture?.(event.pointerId);
    setIsResizing(true);
  }, []);

  const handleResizeMove = useCallback((event) => {
    if (!isResizing) return;

    event.preventDefault();
    setPanelWidth(clampPanelWidth(event.clientX));
  }, [isResizing]);

  const handleResizeEnd = useCallback((event) => {
    if (event.currentTarget.hasPointerCapture?.(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    setIsResizing(false);
  }, []);

  const handleResizeKeyDown = useCallback((event) => {
    const resizeBy = event.shiftKey ? PANEL_WIDTH_STEP * 3 : PANEL_WIDTH_STEP;

    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      setPanelWidth((current) => clampPanelWidth(current - resizeBy));
    }

    if (event.key === 'ArrowRight') {
      event.preventDefault();
      setPanelWidth((current) => clampPanelWidth(current + resizeBy));
    }

    if (event.key === 'Home') {
      event.preventDefault();
      setPanelWidth(panelBounds.min);
    }

    if (event.key === 'End') {
      event.preventDefault();
      setPanelWidth(panelBounds.max);
    }
  }, [panelBounds.max, panelBounds.min]);

  const handleTogglePanelWidth = () => {
    setPanelWidth((current) => clampPanelWidth(
      current >= (DEFAULT_PANEL_WIDTH + EXPANDED_PANEL_WIDTH) / 2
        ? DEFAULT_PANEL_WIDTH
        : EXPANDED_PANEL_WIDTH
    ));
  };

  const handleCopy = async () => {
    const text = filteredEntries.map(formatEntryForText).join('\n\n');
    await copyText(text || 'Sin registros');
    setCopyStatus('Copiado');
    window.setTimeout(() => setCopyStatus(''), 1200);
  };

  const handleDownload = () => {
    const payload = JSON.stringify({
      exportedAt: new Date().toISOString(),
      user: usuarioActual?.name || usuarioActual?.accessCode || null,
      role: userRole,
      route,
      entries: filteredEntries,
    }, null, 2);
    const blob = new Blob([payload], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `debug-console-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  if (!isAdmin) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className={`fixed bottom-4 left-4 z-[90] flex h-10 w-10 items-center justify-center rounded-full border shadow-[0_8px_24px_rgba(0,0,0,0.35)] backdrop-blur transition-all duration-200 ${
          open
            ? 'border-[#d4af37]/50 bg-[#d4af37]/15 text-[#d4af37]'
            : 'border-white/10 bg-[#0c0c0e]/95 text-white/55 hover:border-white/20 hover:bg-white/[0.06] hover:text-white/80'
        } group`}
        title={`Consola de depuración - ${SHORTCUT_HELP}`}
        aria-label="Abrir consola de depuración"
      >
        <Bug size={18} />
        <span className="pointer-events-none absolute bottom-0 left-12 w-[238px] rounded-md border border-white/[0.10] bg-[#0c0c0e]/98 px-3 py-2 text-left text-[11px] leading-relaxed text-white/70 opacity-0 shadow-[0_10px_28px_rgba(0,0,0,0.45)] backdrop-blur transition-opacity duration-150 group-hover:opacity-100 group-focus-visible:opacity-100">
          <span className="block font-medium text-white/85">Abrir consola</span>
          <span className="block text-white/50">Mac: Cmd + Shift + D</span>
          <span className="block text-white/50">Windows: Ctrl + Shift + D</span>
        </span>
        {counts.error > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold leading-none text-white">
            {counts.error > 9 ? '9+' : counts.error}
          </span>
        )}
      </button>

      {panelRendered && (
        <section
          className={`fixed bottom-0 left-0 top-0 z-[80] h-[100dvh] max-w-[calc(100vw-12px)] transform-gpu overflow-visible border-r border-white/[0.08] bg-[#0c0c0e]/98 text-white backdrop-blur-xl sm:rounded-r-lg ${
            panelVisible
              ? 'translate-x-0 opacity-100 shadow-[24px_0_80px_rgba(0,0,0,0.55)]'
              : 'pointer-events-none -translate-x-full opacity-0 shadow-none'
          } ${
            isResizing
              ? 'transition-none'
              : 'transition-[width,transform,opacity,box-shadow] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]'
          }`}
          style={{ width: `${visiblePanelWidth}px` }}
          aria-label="Consola de depuración"
          aria-hidden={!panelVisible}
        >
          <div className="flex h-full min-h-0 flex-col overflow-hidden sm:rounded-r-lg">
            <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-white/[0.08] bg-white/[0.04] px-3 py-3 sm:px-4">
              <div className="flex min-w-[160px] flex-1 items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[#d4af37]/25 bg-[#d4af37]/10 text-[#d4af37]">
                  <Terminal size={18} />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h2 className="truncate text-sm font-semibold text-white">Consola de depuración</h2>
                  </div>
                  <div className="mt-0.5 flex max-w-full items-center gap-2 overflow-hidden text-[11px] text-white/40">
                    <span className="truncate">{userRole}</span>
                    <span className="h-1 w-1 shrink-0 rounded-full bg-white/20" />
                    <span className="truncate">{route || '/'}</span>
                  </div>
                </div>
              </div>

              <div className="ml-auto flex shrink-0 items-center gap-1">
                <span className="mr-2 hidden text-xs text-white/45 sm:inline">{copyStatus}</span>
                <button
                  type="button"
                  onClick={handleCopy}
                  className="flex h-8 w-8 items-center justify-center rounded-md text-white/45 transition hover:bg-white/[0.06] hover:text-white/80"
                  title="Copiar registros"
                  aria-label="Copiar registros"
                >
                  <Clipboard size={16} />
                </button>
                <button
                  type="button"
                  onClick={handleDownload}
                  className="flex h-8 w-8 items-center justify-center rounded-md text-white/45 transition hover:bg-white/[0.06] hover:text-white/80"
                  title="Descargar registros"
                  aria-label="Descargar registros"
                >
                  <Download size={16} />
                </button>
                <button
                  type="button"
                  onClick={clearDebugEntries}
                  className="flex h-8 w-8 items-center justify-center rounded-md text-white/45 transition hover:bg-white/[0.06] hover:text-red-300"
                  title="Limpiar registros"
                  aria-label="Limpiar registros"
                >
                  <Trash2 size={16} />
                </button>
                <button
                  type="button"
                  onClick={handleTogglePanelWidth}
                  className="flex h-8 w-8 items-center justify-center rounded-md text-white/45 transition hover:bg-white/[0.06] hover:text-white/80"
                  title={panelIsWide ? 'Reducir panel' : 'Expandir panel'}
                  aria-label={panelIsWide ? 'Reducir panel' : 'Expandir panel'}
                >
                  <ChevronDown size={16} className={panelIsWide ? 'rotate-180 transition-transform' : 'transition-transform'} />
                </button>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="flex h-8 w-8 items-center justify-center rounded-md text-white/45 transition hover:bg-white/[0.06] hover:text-white/80"
                  title="Cerrar"
                  aria-label="Cerrar"
                >
                  <X size={17} />
                </button>
              </div>
            </div>

            <div className="flex shrink-0 flex-col gap-2 border-b border-white/[0.06] bg-[#0c0c0e] px-3 py-2">
              <div className="grid min-w-0 grid-cols-4 gap-1">
                {FILTERS.map((option) => {
                  const Icon = option.icon;
                  const active = filter === option.id;

                  return (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => setFilter(option.id)}
                      className={`flex h-8 min-w-0 items-center justify-center rounded-md text-[11px] font-medium transition sm:text-xs ${
                        filtersAreCompact ? 'gap-1.5 px-1' : 'gap-1 px-1'
                      } ${
                        active
                          ? option.active
                          : 'text-white/45 hover:bg-white/[0.05] hover:text-white/75'
                      }`}
                      title={option.label}
                      aria-label={`${option.label}: ${counts[option.id]}`}
                    >
                      {filtersAreCompact && (
                        <Icon size={15} strokeWidth={1.9} className="shrink-0" aria-hidden="true" />
                      )}
                      <span className={filtersAreCompact ? 'sr-only' : 'min-w-0 truncate'}>
                        {option.label}
                      </span>
                      <span className={`min-w-[18px] shrink-0 rounded-full px-1 py-0.5 text-center text-[10px] leading-none ${
                        active ? option.badge : 'bg-white/[0.06] text-white/35'
                      }`}>
                        {counts[option.id]}
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="flex items-center gap-2">
                <Search size={15} className="shrink-0 text-white/30" />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Buscar"
                  className="h-8 min-w-0 flex-1 rounded-md border border-white/[0.08] bg-white/[0.05] px-3 text-xs text-white/80 outline-none transition placeholder:text-white/25 focus:border-[#d4af37]/45"
                />
              </div>
            </div>

            <div ref={listRef} className="min-h-0 flex-1 overflow-auto bg-[#070708] p-3 pb-16">
              {filteredEntries.length === 0 ? (
                <div className="flex h-full min-h-[180px] items-center justify-center rounded-md border border-dashed border-white/[0.08] text-sm text-white/35">
                  Sin registros
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredEntries.map((entry) => {
                    const config = LEVEL_CONFIG[entry.level] || LEVEL_CONFIG.log;
                    const Icon = config.icon;

                    return (
                      <article
                        key={entry.id}
                        className={`rounded-md border ${config.border} ${config.bg} px-3 py-2.5`}
                      >
                        <div className="mb-2 flex min-w-0 items-center gap-2 text-[11px]">
                          <span className={`h-2 w-2 shrink-0 rounded-full ${config.dot}`} />
                          <Icon size={13} className={config.text} />
                          <span className={`shrink-0 font-semibold ${config.text}`}>{config.label}</span>
                          <span className="shrink-0 text-white/30">{formatTime(entry.time)}</span>
                          <span className="truncate text-white/25">{entry.source}</span>
                          {entry.route && (
                            <>
                              <span className="h-1 w-1 shrink-0 rounded-full bg-white/15" />
                              <span className="truncate text-white/30">{entry.route}</span>
                            </>
                          )}
                        </div>
                        <pre className="max-h-48 overflow-auto whitespace-pre-wrap break-words font-mono text-[11px] leading-relaxed text-white/75">
                          {entry.message || '(sin mensaje)'}
                        </pre>
                      </article>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
          <div
            role="separator"
            aria-label="Ajustar ancho de la consola"
            aria-orientation="vertical"
            aria-valuemin={Math.round(panelBounds.min)}
            aria-valuemax={Math.round(panelBounds.max)}
            aria-valuenow={Math.round(visiblePanelWidth)}
            tabIndex={0}
            title="Arrastrar para ajustar ancho"
            onPointerDown={handleResizeStart}
            onPointerMove={handleResizeMove}
            onPointerUp={handleResizeEnd}
            onPointerCancel={handleResizeEnd}
            onKeyDown={handleResizeKeyDown}
            className={`group absolute -right-1 top-0 flex h-full w-3 cursor-ew-resize touch-none items-center justify-center outline-none ${
              isResizing ? 'text-[#d4af37]' : 'text-white/30'
            }`}
          >
            <span className={`flex h-20 w-5 items-center justify-center rounded-full border shadow-[0_8px_24px_rgba(0,0,0,0.35)] backdrop-blur transition ${
              isResizing
                ? 'border-[#d4af37]/45 bg-[#d4af37]/15'
                : 'border-white/[0.10] bg-[#0c0c0e]/95 group-hover:border-[#d4af37]/35 group-hover:bg-white/[0.06] group-focus-visible:border-[#d4af37]/45 group-focus-visible:bg-white/[0.06]'
            }`}>
              <GripVertical size={14} aria-hidden="true" />
            </span>
          </div>
        </section>
      )}
    </>
  );
}
