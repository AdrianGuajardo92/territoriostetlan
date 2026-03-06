import React, { useEffect, useRef } from 'react';
import { markBoot } from '../../utils/bootMetrics';

const PHASE_LABELS = {
  auth: 'Verificando sesion',
  territories: 'Cargando territorios',
  addresses: 'Cargando territorios',
  campaigns: 'Cargando campañas',
  secondary: 'Sincronizando datos',
  ready: 'Abriendo aplicacion',
  error: 'Error al iniciar'
};

const PHASE_HINTS = {
  auth: 'Validando tu sesion guardada.',
  territories: 'Preparando la lista principal de territorios.',
  addresses: 'Preparando direcciones y detalle base.',
  campaigns: 'Preparando campañas e invitaciones.',
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
    <div
      className="min-h-screen text-white flex items-center justify-center px-6"
      style={{ background: 'linear-gradient(135deg, #334155 0%, #1e293b 100%)' }}
    >
      <div className="text-center max-w-[300px]">
        <div className="mx-auto mb-5 w-20 h-20 rounded-[20px] border border-white/20 bg-white/15 backdrop-blur-[10px] flex items-center justify-center">
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

        <h1 className="text-[28px] font-bold tracking-tight leading-tight">
          Estación Tetlán Señas
        </h1>
        <p className="mt-2 text-base text-white/90">Gestión de Territorios</p>

        <div className="mt-8">
          {phase === 'error' ? (
            <div className="mx-auto mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-red-500/15 text-red-200">
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
            <div className="mx-auto mb-4 h-10 w-10 rounded-full border-[3px] border-white/30 border-t-white animate-spin" />
          )}

          <p className="mt-3 text-sm text-white/60">{resolvedSubtitle}</p>

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
