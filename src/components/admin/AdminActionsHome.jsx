import React from 'react';
import Icon from '../common/Icon';

const AdminActionsHome = ({ options = [] }) => (
  <div className="mx-auto w-full max-w-[1184px] pb-8">
    <header className="border-b border-[#DCE3EA] pb-3">
      <h3 className="break-words text-[25px] font-bold leading-[1.2] tracking-tight text-[#233344] sm:text-[33px]">
        Centro de Administración
      </h3>
      <p className="mt-2.5 text-sm leading-5 text-[#697887] sm:text-base sm:leading-6">
        Gestiona todos los aspectos del sistema desde este panel central
      </p>
    </header>

    <div className="mt-5 grid grid-cols-1 gap-x-6 gap-y-3 sm:mt-6 sm:grid-cols-2 sm:gap-y-5">
      {options.map((option) => (
        <button
          key={option.id}
          type="button"
          onClick={option.action}
          className="group grid min-h-[112px] w-full min-w-0 grid-cols-[42px_minmax(0,1fr)_16px] items-start gap-x-3.5 rounded-2xl border border-[#DCE3EA] bg-white px-4 py-5 text-left shadow-[0_2px_12px_rgba(34,55,74,0.04)] transition-colors hover:border-[#B9C7D3] hover:bg-[#FBFCFD] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#22374A] focus-visible:ring-offset-2 focus-visible:ring-offset-[#F4F6F9] active:bg-[#F5F8FA] sm:grid-cols-[50px_minmax(0,1fr)_20px] sm:items-center sm:gap-x-5 sm:p-6"
        >
          <span className="flex h-[42px] w-[42px] items-center justify-center rounded-xl bg-[#ECF1F6] text-[#22374A] sm:h-[50px] sm:w-[50px]" aria-hidden="true">
            <Icon name={option.icon} size={26} strokeWidth={1.7} className="h-6 w-6 sm:h-[26px] sm:w-[26px]" />
          </span>

          <span className="min-w-0">
            <span className="flex items-start gap-2">
              <span className="min-w-0 flex-1 break-words text-base font-semibold leading-5 text-[#233344] sm:text-[19px] sm:leading-6">
                {option.title}
              </span>
              {option.badge > 0 && (
                <span
                  className="inline-flex min-h-[22px] min-w-[22px] shrink-0 items-center justify-center rounded-full bg-[#22374A] px-1.5 text-xs font-semibold leading-none text-white"
                  aria-label={`${option.badge} pendientes`}
                >
                  {option.badge}
                </span>
              )}
            </span>
            <span className="mt-1.5 block break-words text-[13px] leading-[18px] text-[#697887] sm:mt-2 sm:text-sm sm:leading-5">
              {option.description}
            </span>
          </span>

          <Icon name="arrowRight" size={20} strokeWidth={1.8} className="h-4 w-4 self-center text-[#95A3B0] group-hover:text-[#697887] sm:h-5 sm:w-5" aria-hidden="true" />
        </button>
      ))}
    </div>
  </div>
);

export default AdminActionsHome;
