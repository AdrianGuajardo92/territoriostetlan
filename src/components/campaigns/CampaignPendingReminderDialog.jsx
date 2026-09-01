import React from 'react';
import Icon from '../common/Icon';
import { useBodyScrollLock } from '../../hooks/useBodyScrollLock';
import { useBackHandler } from '../../hooks/useBackHandler';

const RING_SIZE = 124;
const RING_STROKE = 10;
const RING_RADIUS = (RING_SIZE - RING_STROKE) / 2;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

const ProgressRing = ({ pendingCount, completedCount }) => {
  const total = pendingCount + completedCount;
  const completedRatio = total > 0 ? completedCount / total : 0;
  const completedLength = RING_CIRCUMFERENCE * completedRatio;
  const pendingLength = RING_CIRCUMFERENCE - completedLength;

  return (
    <div className="relative h-[124px] w-[124px] shrink-0">
      <svg
        width={RING_SIZE}
        height={RING_SIZE}
        viewBox={`0 0 ${RING_SIZE} ${RING_SIZE}`}
        className="-rotate-90"
        aria-hidden="true"
      >
        <circle
          cx={RING_SIZE / 2}
          cy={RING_SIZE / 2}
          r={RING_RADIUS}
          fill="none"
          stroke="#e2e8f0"
          strokeWidth={RING_STROKE}
        />
        {completedLength > 0 && (
          <circle
            cx={RING_SIZE / 2}
            cy={RING_SIZE / 2}
            r={RING_RADIUS}
            fill="none"
            stroke="#10b981"
            strokeWidth={RING_STROKE}
            strokeLinecap="round"
            strokeDasharray={`${completedLength} ${RING_CIRCUMFERENCE}`}
          />
        )}
        {pendingLength > 0 && (
          <circle
            cx={RING_SIZE / 2}
            cy={RING_SIZE / 2}
            r={RING_RADIUS}
            fill="none"
            stroke="#f59e0b"
            strokeWidth={RING_STROKE}
            strokeLinecap="round"
            strokeDasharray={`${pendingLength} ${RING_CIRCUMFERENCE}`}
            strokeDashoffset={-completedLength}
          />
        )}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <p className="text-3xl font-bold tabular-nums leading-none text-slate-900">{pendingCount}</p>
        <p className="mt-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
          {pendingCount === 1 ? 'pendiente' : 'pendientes'}
        </p>
      </div>
    </div>
  );
};

const CampaignPendingReminderDialog = ({
  isOpen,
  onClose,
  onConfirm,
  campaignName = 'Campaña activa',
  pendingCount = 0,
  completedCount = 0
}) => {
  useBodyScrollLock(isOpen);
  useBackHandler({ isOpen, onClose, id: 'app-campaign-pending-reminder' });

  if (!isOpen) return null;

  const total = pendingCount + completedCount;

  return (
    <>
      <div
        className="modal-backdrop fixed inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
        style={{ zIndex: 10002 }}
      />

      <div className="fixed inset-0 flex items-center justify-center p-4" style={{ zIndex: 10003 }}>
        <div className="modal-fade-scale pointer-events-auto w-full max-w-md overflow-hidden rounded-[28px] bg-white shadow-2xl">
          <div className="flex items-start gap-3 px-5 py-4" style={{ backgroundColor: '#2C3E50' }}>
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/10 text-white">
              <Icon name="mail" size={20} />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-white/60">
                Campaña activa
              </p>
              <h3 className="mt-0.5 text-base font-bold leading-snug text-white">
                {campaignName}
              </h3>
            </div>
          </div>

          <div className="px-5 py-5">
            <div className="flex items-center gap-4">
              <ProgressRing pendingCount={pendingCount} completedCount={completedCount} />
              <div className="min-w-0 flex-1 space-y-2.5">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                    <span className="text-sm font-semibold text-slate-700">Completadas</span>
                  </div>
                  <span className="text-sm font-bold tabular-nums text-slate-900">{completedCount}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
                    <span className="text-sm font-semibold text-slate-700">Pendientes</span>
                  </div>
                  <span className="text-sm font-bold tabular-nums text-slate-900">{pendingCount}</span>
                </div>
                <p className="text-xs font-medium text-slate-400">
                  {completedCount} de {total} {total === 1 ? 'dirección' : 'direcciones'}
                </p>
              </div>
            </div>

            <div className="mt-5 space-y-2">
              <button
                type="button"
                onClick={onConfirm}
                className="flex w-full items-center justify-center rounded-2xl bg-emerald-600 px-4 py-3.5 text-sm font-bold text-white transition-colors hover:bg-emerald-700"
              >
                Ver mis direcciones
              </button>
              <button
                type="button"
                onClick={onClose}
                className="flex w-full items-center justify-center rounded-2xl px-4 py-2.5 text-sm font-semibold text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-700"
              >
                Ahora no
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default CampaignPendingReminderDialog;
