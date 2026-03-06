import React, { useEffect, useRef } from 'react';
import { markBoot } from '../../utils/bootMetrics';

const PHASE_LABELS = {
  auth: 'Verificando sesion',
  territories: 'Cargando territorios',
  addresses: 'Cargando territorios',
  secondary: 'Sincronizando datos',
  ready: 'Abriendo aplicacion',
  error: 'Error al iniciar'
};

const PHASE_HINTS = {
  auth: 'Validando tu sesion guardada.',
  territories: 'Preparando la lista principal de territorios.',
  addresses: 'Preparando direcciones y detalle base.',
  secondary: 'Cargando usuarios, propuestas e historial.',
  ready: 'Todo esta listo.',
  error: 'No se pudo completar el arranque.'
};

const BootScreen = ({
  phase = 'auth',
  error = null,
  onRetry = null,
  subtitle = null,
  announceMount = true
}) => {
  const hasAnnouncedMountRef = useRef(false);

  useEffect(() => {
    if (!announceMount) {
      return;
    }

    if (hasAnnouncedMountRef.current) {
      return;
    }

    hasAnnouncedMountRef.current = true;
    markBoot('boot:react-mounted');
    window.dispatchEvent(new Event('boot-screen-mounted'));
  }, []);

  const title = PHASE_LABELS[phase] || PHASE_LABELS.auth;
  const resolvedSubtitle = subtitle || error?.message || PHASE_HINTS[phase] || PHASE_HINTS.auth;
  const showRetry = phase === 'error' && typeof onRetry === 'function';

  return (
    <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center px-6">
      <div className="w-full max-w-sm text-center">
        <div className="mx-auto mb-6 w-20 h-20 rounded-3xl border border-white/20 bg-white/10 backdrop-blur-md flex items-center justify-center shadow-2xl">
          <svg
            width="40"
            height="40"
            viewBox="0 0 24 24"
            fill="none"
            stroke="white"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0 1 18 0z" />
            <circle cx="12" cy="10" r="3" />
          </svg>
        </div>

        <h1 className="text-3xl font-bold tracking-tight">Estacion Tetlan Senas</h1>
        <p className="mt-2 text-base text-white/80">Gestion de Territorios</p>

        <div className="mt-10 rounded-3xl border border-white/10 bg-white/5 backdrop-blur-md px-6 py-7 shadow-2xl">
          {phase === 'error' ? (
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-500/15 text-red-200">
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            </div>
          ) : (
            <div className="mx-auto mb-4 h-12 w-12 rounded-full border-[3px] border-white/25 border-t-white animate-spin" />
          )}

          <p className="text-lg font-semibold">{title}</p>
          <p className="mt-2 text-sm leading-6 text-white/75">{resolvedSubtitle}</p>

          {showRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="mt-6 inline-flex min-w-[150px] items-center justify-center rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-slate-900 shadow-lg transition-transform duration-200 hover:scale-[1.02]"
            >
              Reintentar
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default BootScreen;
