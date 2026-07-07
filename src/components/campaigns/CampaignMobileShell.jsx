import React from 'react';
import ReactDOM from 'react-dom';
import Icon from '../common/Icon';
import { useBackHandler } from '../../hooks/useBackHandler';
import { useBodyScrollLock } from '../../hooks/useBodyScrollLock';

export const CampaignStepShell = ({
  isOpen,
  title,
  subtitle,
  stepLabel,
  onBack,
  backHandlerId,
  children,
  footer
}) => {
  useBackHandler({ isOpen, onClose: onBack, id: backHandlerId });
  useBodyScrollLock(isOpen);

  if (!isOpen) return null;

  return ReactDOM.createPortal(
    <div className="fixed inset-0 z-[100] flex h-[100dvh] max-h-[100dvh] w-full flex-col bg-gray-50">
      <div
        className="flex-shrink-0 px-4 pb-3 shadow-xl"
        style={{
          backgroundColor: '#2C3E50',
          paddingTop: 'max(0.75rem, env(safe-area-inset-top, 0px))'
        }}
      >
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/10 backdrop-blur-sm transition-all hover:bg-white/20"
            aria-label="Volver"
          >
            <Icon name="arrowLeft" size={18} className="text-white" />
          </button>
          <div className="min-w-0 flex-1">
            {stepLabel && (
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-white/70">{stepLabel}</p>
            )}
            <h2 className="truncate text-lg font-bold text-white">{title}</h2>
            {subtitle && <p className="truncate text-sm text-white/70">{subtitle}</p>}
          </div>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto overscroll-contain">
          <div className="space-y-4 p-4 pb-6">
            {children}
          </div>
        </div>

        {footer && (
          <div
            className="flex-shrink-0 border-t border-slate-200 bg-white px-4 py-3 shadow-[0_-4px_20px_rgba(0,0,0,0.08)]"
            style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom, 12px))' }}
          >
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
};

export const CampaignHubStepCard = ({
  stepNumber,
  title,
  summary,
  icon,
  onClick,
  disabled = false,
  isComplete = false,
  isSuggested = false
}) => {
  const borderClass = isSuggested
    ? 'border-slate-400 ring-2 ring-slate-100'
    : 'border-slate-200';

  const iconClass = isComplete
    ? 'bg-slate-700 text-white ring-slate-600'
    : 'bg-slate-100 text-slate-600 ring-slate-200/80';

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`flex w-full items-start gap-3 rounded-[24px] border bg-white p-4 text-left shadow-sm transition-all hover:border-slate-300 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50 ${borderClass}`}
    >
      <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl shadow-sm ring-1 ${iconClass}`}>
        {isComplete ? (
          <Icon name="check" size={18} />
        ) : (
          <Icon name={icon} size={18} />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-slate-600">
            Paso {stepNumber}
          </span>
          {isSuggested && (
            <span className="rounded-full bg-slate-200 px-2.5 py-0.5 text-[11px] font-bold text-slate-700">
              Siguiente
            </span>
          )}
        </div>
        <p className="mt-1 text-base font-bold text-slate-900">{title}</p>
        {summary && <p className="mt-1 text-sm text-slate-500">{summary}</p>}
      </div>
      <Icon name="chevronRight" size={18} className="mt-2 shrink-0 text-slate-400" />
    </button>
  );
};

export const CampaignStepper = ({ steps }) => (
  <div className="flex items-center gap-2">
    {steps.map((step, index) => (
      <React.Fragment key={step.id}>
        <div className="flex min-w-0 flex-1 flex-col items-center gap-1">
          <div
            className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${
              step.complete
                ? 'bg-slate-700 text-white'
                : step.current
                  ? 'bg-slate-800 text-white'
                  : 'bg-slate-200 text-slate-500'
            }`}
          >
            {step.complete ? <Icon name="check" size={14} /> : step.id}
          </div>
          <span className={`truncate text-[10px] font-semibold ${step.current ? 'text-slate-800' : 'text-slate-400'}`}>
            {step.label}
          </span>
        </div>
        {index < steps.length - 1 && (
          <div className={`mb-4 h-0.5 flex-1 ${step.complete ? 'bg-slate-400' : 'bg-slate-200'}`} />
        )}
      </React.Fragment>
    ))}
  </div>
);
