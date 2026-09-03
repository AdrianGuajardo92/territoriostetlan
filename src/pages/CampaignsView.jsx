import React, { memo, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import ConfirmDialog from '../components/common/ConfirmDialog';
import Icon from '../components/common/Icon';
import Modal from '../components/common/Modal';
import { useApp } from '../context/AppContext';
import { useBackHandler } from '../hooks/useBackHandler';
import { useToast } from '../hooks/useToast';
import { useCampaigns } from '../context/CampaignContext';
import {
  CAMPAIGN_PROGRESS_STATUSES,
  CAMPAIGN_STATUSES,
  formatCampaignDate,
  formatCampaignDateRange,
  formatCampaignSchedule,
  formatCampaignTypeLabel,
  normalizeCampaignDateRange,
  toCampaignDateKey,
  getCampaignProgressMeta,
  calculateCampaignTargets,
  getEligibleCampaignAddresses,
  getCampaignCandidateAddresses,
  groupAssignmentsByTerritory,
  getCampaignAddressDrift,
  sortCampaignSourceAddresses,
  countPreservedAssignmentsByUser,
  buildDistributionTargetsFromAssignments,
  resolveDistributionTargets,
  buildDistributionAssignmentFingerprint,
  buildDistributionTargetFingerprint,
  formatCampaignDistributionWhatsAppText,
  resolveCampaignHistorySummary
} from '../utils/campaignUtils';
import {
  clearDistributionDraft,
  loadDistributionDraft,
  saveDistributionDraft
} from '../utils/campaignDistributionDrafts';
import { copiarAlPortapapeles } from '../utils/clipboard';
import { LazyCampaignAssignmentsMapModal } from '../components/modals/LazyModals';
import { getDisplayAddress, getFullAddress, getUserGender } from '../utils/helpers';
import { getAddressNavigationUrls } from '../utils/addressNavigationUrls';
import { ADDRESS_CARD_THEMES } from '../utils/addressCardThemes';
import AddressNavigationButtons from '../components/common/AddressNavigationButtons';
import { applyDefaultCampaignAssignment, resolveCampaignAssignment } from '../config/campaignAssignmentRules';
import {
  canParticipantReceiveCampaignAddress,
  isRestrictedCampaignAddress
} from '../config/campaignAddressRestrictions';
import { isPioneerName, isPioneerUser } from '../config/congregationPioneers';
import { getRegionalAssembly2026ProgramUrl } from '../config/campaignProgramLinks';
import { useIsDesktop } from '../hooks/useMediaQuery';
import {
  CampaignHubStepCard,
  CampaignStepper,
  CampaignStepShell
} from '../components/campaigns/CampaignMobileShell';

const DEFAULT_CAMPAIGN_FORM = {
  name: '',
  type: 'asamblea',
  eventDate: '',
  eventEndDate: ''
};

const PUBLISHER_FILTER_OPTIONS = [
  { id: CAMPAIGN_PROGRESS_STATUSES.IN_PROGRESS, label: 'Pendientes' },
  { id: CAMPAIGN_PROGRESS_STATUSES.COMPLETED, label: 'Completadas' }
];

const getPublisherFilterLabel = (optionId, count, fallbackLabel) => {
  if (optionId === CAMPAIGN_PROGRESS_STATUSES.IN_PROGRESS) {
    return count === 1 ? 'Pendiente' : 'Pendientes';
  }
  return fallbackLabel;
};

const CAMPAIGN_TYPE_OPTIONS = [
  { value: 'asamblea', label: 'Asamblea', icon: 'building' },
  { value: 'conmemoracion', label: 'Conmemoraci\u00f3n', icon: 'wine' },
  { value: 'especial', label: 'Campaña especial', icon: 'bookmark' }
];

const getCampaignTypeIcon = (type) => {
  const option = CAMPAIGN_TYPE_OPTIONS.find((item) => item.value === type);
  return option?.icon || CAMPAIGN_TYPE_OPTIONS[0].icon;
};

const PARTICIPANT_ASSIGNMENT_MODES = [
  { id: '1', label: '1' },
  { id: '2', label: '2' },
  { id: '3', label: '3' },
  { id: '4', label: '4' },
  { id: 'excluded', label: 'Excluido' }
];

const SegmentedToggle = ({ value, onChange, options, disabled = false, className = '' }) => {
  const activeIndex = Math.max(0, options.findIndex((option) => option.id === value));
  const containerRef = useRef(null);
  const tabRefs = useRef([]);
  const [pillStyle, setPillStyle] = useState({ left: 0, width: 0, ready: false });

  const updatePillPosition = useCallback(() => {
    const container = containerRef.current;
    const activeTab = tabRefs.current[activeIndex];
    if (!container || !activeTab) return;

    const containerRect = container.getBoundingClientRect();
    const tabRect = activeTab.getBoundingClientRect();

    setPillStyle({
      left: tabRect.left - containerRect.left,
      width: tabRect.width,
      ready: true
    });
  }, [activeIndex]);

  useLayoutEffect(() => {
    updatePillPosition();
  }, [updatePillPosition, options]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return undefined;

    const observer = new ResizeObserver(updatePillPosition);
    observer.observe(container);
    tabRefs.current.forEach((tab) => {
      if (tab) observer.observe(tab);
    });

    return () => observer.disconnect();
  }, [updatePillPosition, options.length]);

  return (
    <div
      ref={containerRef}
      className={`relative flex rounded-full border border-slate-200 bg-slate-100 p-1 ${className}`}
      role="tablist"
      aria-label="Filtro de participantes"
    >
      <span
        aria-hidden="true"
        className="pointer-events-none absolute bottom-1 top-1 rounded-full bg-white shadow-sm ring-1 ring-indigo-100 transition-[left,width,opacity] duration-200 ease-out"
        style={{
          left: pillStyle.left,
          width: pillStyle.width,
          opacity: pillStyle.ready ? 1 : 0
        }}
      />
      {options.map((option, index) => {
        const isActive = value === option.id;

        return (
          <button
            key={option.id}
            ref={(element) => {
              tabRefs.current[index] = element;
            }}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(option.id)}
            disabled={disabled}
            className={`relative z-10 flex min-h-[36px] flex-1 items-center justify-between gap-2 rounded-full px-3 py-1.5 text-xs font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
              isActive ? 'text-indigo-700' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span className="truncate">{option.label}</span>
            {option.count != null && (
              <span className="shrink-0 tabular-nums">{option.count}</span>
            )}
          </button>
        );
      })}
    </div>
  );
};

const CampaignTypeSelect = ({ value, onChange, disabled = false }) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);
  const selectedOption = CAMPAIGN_TYPE_OPTIONS.find((option) => option.value === value) || CAMPAIGN_TYPE_OPTIONS[0];

  useEffect(() => {
    if (!isOpen) return undefined;

    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen]);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        id="campaign-type-select"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-labelledby="campaign-type-label"
        disabled={disabled}
        onClick={() => !disabled && setIsOpen((previous) => !previous)}
        className="flex w-full items-center justify-between gap-2 rounded-2xl border border-gray-300 bg-white px-4 py-3 text-left focus:border-slate-500 focus:outline-none disabled:cursor-not-allowed disabled:opacity-60"
      >
        <span className="flex min-w-0 items-center gap-2.5">
          <Icon name={selectedOption.icon} size={18} className="shrink-0 text-slate-600" />
          <span className="truncate">{selectedOption.label}</span>
        </span>
        <Icon
          name="chevronDown"
          size={16}
          className={`shrink-0 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {isOpen && (
        <ul
          role="listbox"
          aria-labelledby="campaign-type-label"
          onMouseDown={(event) => event.stopPropagation()}
          onClick={(event) => event.stopPropagation()}
          className="absolute z-20 mt-1 w-full overflow-hidden rounded-2xl border border-gray-300 bg-white shadow-lg"
        >
          {CAMPAIGN_TYPE_OPTIONS.map((option) => {
            const isSelected = option.value === value;

            return (
              <li key={option.value} role="presentation">
                <button
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    onChange(option.value);
                    setIsOpen(false);
                  }}
                  className={`flex w-full items-center gap-2.5 px-4 py-3 text-left transition-colors ${
                    isSelected ? 'bg-slate-100 text-slate-900' : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <Icon name={option.icon} size={18} className="shrink-0 text-slate-600" />
                  <span>{option.label}</span>
                  {isSelected && (
                    <Icon name="check" size={16} className="ml-auto shrink-0 text-slate-600" />
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};

const WEEKDAY_LABELS = ['d', 'l', 'm', 'm', 'j', 'v', 's'];

const buildCalendarDays = (visibleMonth) => {
  const year = visibleMonth.getFullYear();
  const month = visibleMonth.getMonth();
  const firstDay = new Date(year, month, 1);
  const startOffset = firstDay.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const days = [];

  for (let index = 0; index < startOffset; index += 1) {
    const date = new Date(year, month, index - startOffset + 1);
    days.push({ key: toCampaignDateKey(date), date, inMonth: false });
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    const date = new Date(year, month, day);
    days.push({ key: toCampaignDateKey(date), date, inMonth: true });
  }

  while (days.length % 7 !== 0) {
    const last = days[days.length - 1].date;
    const date = new Date(last.getFullYear(), last.getMonth(), last.getDate() + 1);
    days.push({ key: toCampaignDateKey(date), date, inMonth: false });
  }

  return days;
};

const CampaignDateRangePicker = ({
  startDate,
  endDate,
  onChange,
  disabled = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [pendingStart, setPendingStart] = useState('');
  const [hoveredDay, setHoveredDay] = useState('');
  const containerRef = useRef(null);
  const initialMonth = startDate || toCampaignDateKey(new Date());
  const [visibleMonth, setVisibleMonth] = useState(() => {
    const [year, month] = (initialMonth || toCampaignDateKey(new Date())).split('-').map(Number);
    return new Date(year, month - 1, 1);
  });

  useBackHandler({
    isOpen,
    onClose: () => setIsOpen(false),
    id: 'campaigns-date-range-picker'
  });

  useEffect(() => {
    if (!isOpen) {
      setPendingStart('');
      setHoveredDay('');
    }
  }, [isOpen]);

  const range = normalizeCampaignDateRange(startDate, endDate);
  const selectingEnd = Boolean(pendingStart);
  const previewRange = selectingEnd
    ? normalizeCampaignDateRange(pendingStart, hoveredDay || pendingStart)
    : range;
  const rangeStart = previewRange.eventDate;
  const rangeEnd = previewRange.eventEndDate;
  const calendarDays = useMemo(() => buildCalendarDays(visibleMonth), [visibleMonth]);
  const todayKey = toCampaignDateKey(new Date());
  const displayLabel = selectingEnd
    ? (hoveredDay
      ? formatCampaignDateRange(previewRange.eventDate, previewRange.eventEndDate)
      : `${formatCampaignDate(pendingStart)} → elige el fin`)
    : range.eventDate
      ? formatCampaignDateRange(range.eventDate, range.eventEndDate)
      : 'Elige inicio y fin';

  const handleSelectDay = (event, dayKey) => {
    event.preventDefault();
    event.stopPropagation();
    if (disabled) return;

    if (!pendingStart) {
      setPendingStart(dayKey);
      setHoveredDay(dayKey);
      return;
    }

    const nextRange = normalizeCampaignDateRange(pendingStart, dayKey);
    onChange(nextRange);
    setPendingStart('');
    setIsOpen(false);
  };

  const monthLabel = visibleMonth.toLocaleDateString('es-MX', {
    month: 'long',
    year: 'numeric'
  });

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        disabled={disabled}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        onClick={() => !disabled && setIsOpen((previous) => !previous)}
        className="flex w-full items-center gap-3 rounded-2xl border border-gray-300 bg-white py-3 pl-3 pr-4 text-left focus:border-slate-500 focus:outline-none disabled:cursor-not-allowed disabled:opacity-60"
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-sky-100 text-sky-700">
          <Icon name="calendar" size={16} />
        </span>
        <span className={`min-w-0 truncate ${range.eventDate ? 'text-slate-900' : 'text-slate-400'}`}>
          {displayLabel}
        </span>
      </button>

      {isOpen && (
        <div
          role="dialog"
          aria-label="Calendario de la campaña"
          onMouseDown={(event) => event.stopPropagation()}
          onClick={(event) => event.stopPropagation()}
          className="absolute z-30 mt-1 w-full rounded-2xl border border-gray-300 bg-white p-3 shadow-lg"
        >
          <div className="mb-2 flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => setVisibleMonth((current) => new Date(current.getFullYear(), current.getMonth() - 1, 1))}
              className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-600 hover:bg-slate-100"
              aria-label="Mes anterior"
            >
              <Icon name="chevronLeft" size={18} />
            </button>
            <p className="text-sm font-bold capitalize text-slate-800">{monthLabel}</p>
            <button
              type="button"
              onClick={() => setVisibleMonth((current) => new Date(current.getFullYear(), current.getMonth() + 1, 1))}
              className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-600 hover:bg-slate-100"
              aria-label="Mes siguiente"
            >
              <Icon name="chevronRight" size={18} />
            </button>
          </div>

          <p className="mb-2 text-xs text-slate-500">
            {selectingEnd ? 'Ahora elige el día en que termina.' : 'Primero elige el día en que empieza.'}
          </p>

          <div className="grid grid-cols-7 gap-y-1 text-center text-[11px] font-semibold uppercase text-slate-400">
            {WEEKDAY_LABELS.map((label, index) => (
              <span key={`${label}-${index}`}>{label}</span>
            ))}
          </div>

          <div className="mt-1 grid grid-cols-7">
            {calendarDays.map((day) => {
              const isStart = day.key === rangeStart;
              const isEnd = Boolean(rangeEnd) && day.key === rangeEnd;
              const inRange = Boolean(rangeStart && rangeEnd)
                && day.key >= rangeStart
                && day.key <= rangeEnd;
              const isEdge = isStart || isEnd;

              return (
                <button
                  key={day.key}
                  type="button"
                  onPointerEnter={() => {
                    if (pendingStart) setHoveredDay(day.key);
                  }}
                  onPointerMove={() => {
                    if (pendingStart && hoveredDay !== day.key) setHoveredDay(day.key);
                  }}
                  onClick={(event) => handleSelectDay(event, day.key)}
                  className={`relative flex h-10 items-center justify-center text-sm ${
                    inRange && !isEdge ? 'bg-slate-100' : ''
                  } ${isStart && rangeEnd && rangeStart !== rangeEnd ? 'rounded-l-full bg-slate-100' : ''} ${
                    isEnd && rangeStart !== rangeEnd ? 'rounded-r-full bg-slate-100' : ''
                  }`}
                >
                  <span
                    className={`flex h-8 w-8 items-center justify-center rounded-full ${
                      isEdge
                        ? 'bg-[#2C3E50] font-bold text-white'
                        : day.key === todayKey
                          ? 'font-bold text-sky-700 ring-1 ring-sky-200'
                          : day.inMonth
                            ? 'text-slate-800'
                            : 'text-slate-300'
                    }`}
                  >
                    {day.date.getDate()}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

const getPublisherAssignmentStatus = (assignment) => (
  assignment?.status === CAMPAIGN_PROGRESS_STATUSES.COMPLETED
    ? CAMPAIGN_PROGRESS_STATUSES.COMPLETED
    : CAMPAIGN_PROGRESS_STATUSES.IN_PROGRESS
);

const getPublisherAssignmentMapHref = (snapshot = {}) => {
  if (snapshot.mapUrl) return snapshot.mapUrl;

  if (Number.isFinite(snapshot.latitude) && Number.isFinite(snapshot.longitude)) {
    return `https://www.google.com/maps/dir/?api=1&destination=${snapshot.latitude},${snapshot.longitude}`;
  }

  if (Array.isArray(snapshot.coords) && snapshot.coords.length >= 2) {
    const [lat, lng] = snapshot.coords;
    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
    }
  }

  const fullAddress = getFullAddress(snapshot, '');
  if (fullAddress) {
    return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(fullAddress)}`;
  }

  return '';
};

const normalizeSearchText = (value = '') => String(value || '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .trim();

const getParticipantAssignmentMode = (participant) => {
  const resolved = resolveCampaignAssignment(participant);

  if (resolved.isEnabled === false) return 'excluded';

  const weight = Number(resolved.capacityWeight) || 1;
  const rawLimit = resolved.hardLimit;

  if (rawLimit === '' || rawLimit === null || rawLimit === undefined) {
    return weight === 1 ? 'auto' : 'advanced';
  }

  const limitNum = Number(rawLimit);
  if (!Number.isFinite(limitNum)) return 'auto';

  if (weight === 1 && [1, 2, 3, 4].includes(limitNum)) {
    return String(limitNum);
  }

  return 'advanced';
};

const getParticipantPreviewBadge = (participant, assignedCount) => {
  const mode = getParticipantAssignmentMode(participant);

  if (mode === 'excluded') {
    return { label: 'Excluido', className: 'bg-slate-100 text-slate-600 border-slate-200' };
  }

  if (mode === 'advanced') {
    const countLabel = assignedCount != null ? ` · ${assignedCount} dir.` : '';
    return { label: `Avanzado${countLabel}`, className: 'bg-violet-50 text-violet-700 border-violet-200' };
  }

  if (['1', '2', '3', '4'].includes(mode)) {
    const count = Number(mode);
    return {
      label: count === 1 ? '1 dirección' : `${count} direcciones`,
      className: 'bg-sky-50 text-sky-700 border-sky-200'
    };
  }

  const countSuffix = assignedCount != null
    ? (assignedCount === 1 ? ' · 1 dir.' : ` · ${assignedCount} dir.`)
    : '';

  return {
    label: `Automático${countSuffix}`,
    className: 'bg-emerald-50 text-emerald-700 border-emerald-200'
  };
};

const SectionCard = ({
  title,
  subtitle,
  children,
  rightSlot = null,
  icon = null,
  eyebrow = null,
  tone = 'slate',
  headerVariant = 'default',
  isCollapsed: isCollapsedProp = false,
  collapsible = false,
  isExpanded = true,
  onToggle = null,
  summaryLabel = null,
  sectionId = null,
  allowContentOverflow = false
}) => {
  const toneClasses = {
    slate: 'from-slate-50 via-white to-white',
    indigo: 'from-indigo-50 via-white to-white',
    emerald: 'from-emerald-50 via-white to-white',
    amber: 'from-amber-50 via-white to-white'
  };

  const isDarkHeader = headerVariant === 'dark';
  const isCollapsed = collapsible ? !isExpanded : isCollapsedProp;

  const handleHeaderKeyDown = (event) => {
    if (!collapsible || !onToggle) return;
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onToggle();
    }
  };

  const stopTogglePropagation = (event) => {
    event.stopPropagation();
  };

  const headerClassName = isDarkHeader
    ? `px-4 py-3 shadow-xl ${isCollapsed ? '' : 'border-b border-white/10'}${collapsible ? ' cursor-pointer select-none transition-colors duration-300 hover:bg-[#34495e]' : ''}`
    : `bg-gradient-to-r px-5 ${isCollapsed ? 'py-3' : 'py-4'} ${toneClasses[tone] || toneClasses.slate} ${isCollapsed ? '' : 'border-b border-slate-100'}${collapsible ? ' cursor-pointer select-none transition-[padding,background-color] duration-300 hover:from-slate-100/60' : ''}`;

  return (
    <section className={`${allowContentOverflow ? 'overflow-visible' : 'overflow-hidden'} rounded-[30px] border border-slate-200 bg-white shadow-sm`}>
      <div
        className={headerClassName}
        style={isDarkHeader ? { backgroundColor: '#2C3E50' } : undefined}
        {...(collapsible ? {
          role: 'button',
          tabIndex: 0,
          onClick: onToggle,
          onKeyDown: handleHeaderKeyDown,
          'aria-expanded': isExpanded,
          'aria-controls': sectionId || undefined
        } : {})}
      >
        <div className={`flex justify-between gap-3 ${isCollapsed ? 'items-center' : 'items-start'}`}>
          <div className="flex min-w-0 items-start gap-3">
            {icon && (
              <div className={`flex shrink-0 items-center justify-center shadow-sm ${isDarkHeader ? 'bg-white/10 text-white ring-1 ring-white/20' : 'bg-white text-slate-700 ring-1 ring-slate-200'} ${isCollapsed ? 'h-10 w-10 rounded-xl' : 'h-11 w-11 rounded-2xl'}`}>
                <Icon name={icon} size={18} />
              </div>
            )}
            <div className="min-w-0">
              {eyebrow && (
                <p className={`text-xs font-bold uppercase tracking-[0.18em] ${isDarkHeader ? 'text-white/60' : 'text-slate-500'}`}>
                  {eyebrow}
                </p>
              )}
              <h2 className={`${isCollapsed ? 'mt-0 text-base' : 'mt-1 text-lg'} font-bold ${isDarkHeader ? 'text-white' : 'text-gray-900'}`}>{title}</h2>
              {!isCollapsed && subtitle && (
                <p className={`mt-1 text-sm ${isDarkHeader ? 'text-white/70' : 'text-gray-500'}`}>{subtitle}</p>
              )}
            </div>
          </div>
          {(rightSlot || collapsible || summaryLabel) && (
            <div className={`flex shrink-0 items-center gap-2 ${isCollapsed ? '' : 'pt-0.5'}`}>
              {summaryLabel && isCollapsed && (
                <span className={`hidden text-xs font-semibold lg:inline ${isDarkHeader ? 'text-white/60' : 'text-slate-500'}`}>
                  {summaryLabel}
                </span>
              )}
              {rightSlot && (
                <div onClick={stopTogglePropagation} onKeyDown={stopTogglePropagation}>
                  {rightSlot}
                </div>
              )}
              {collapsible && (
                <Icon
                  name="chevronRight"
                  size={18}
                  className={`shrink-0 transition-transform duration-300 ease-out ${isDarkHeader ? 'text-white/60' : 'text-slate-400'} ${isExpanded ? 'rotate-90' : ''}`}
                />
              )}
            </div>
          )}
        </div>
      </div>
      {children !== null && children !== undefined && children !== false && (
        <div
          id={sectionId || undefined}
          aria-hidden={collapsible ? !isExpanded : undefined}
          className={collapsible
            ? `grid transition-[grid-template-rows,opacity] duration-300 ease-in-out ${isExpanded ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`
            : ''}
        >
          <div
            className={collapsible ? 'min-h-0 overflow-hidden' : ''}
            inert={collapsible && !isExpanded ? '' : undefined}
          >
            <div className="p-5">{children}</div>
          </div>
        </div>
      )}
    </section>
  );
};

const EmptyState = ({ icon = 'mail', title, description, variant = 'card' }) => {
  if (variant === 'centered') {
    return (
      <div className="mx-auto max-w-sm px-6 text-center">
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100/80">
          <Icon name={icon} size={28} className="text-slate-400" />
        </div>
        <h3 className="mb-2 text-lg font-semibold text-slate-800">{title}</h3>
        <p className="text-sm leading-relaxed text-slate-500">{description}</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-3xl border border-dashed border-gray-300 p-10 text-center shadow-sm">
      <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
        <Icon name={icon} size={28} className="text-slate-500" />
      </div>
      <h3 className="text-lg font-bold text-gray-900 mb-2">{title}</h3>
      <p className="text-sm text-gray-600 max-w-md mx-auto">{description}</p>
    </div>
  );
};

const shouldAnimateAssignmentExit = (status, publisherFilter) => {
  const completingFromPending = (
    status === CAMPAIGN_PROGRESS_STATUSES.COMPLETED
    && publisherFilter === CAMPAIGN_PROGRESS_STATUSES.IN_PROGRESS
  );
  const reopeningFromCompleted = (
    status === CAMPAIGN_PROGRESS_STATUSES.IN_PROGRESS
    && publisherFilter === CAMPAIGN_PROGRESS_STATUSES.COMPLETED
  );
  return completingFromPending || reopeningFromCompleted;
};

const pinExitingAssignmentInGroups = (groupedAssignments, overlay) => {
  if (!overlay?.assignment) return groupedAssignments;

  const { assignment, territoryId, index } = overlay;
  const stillVisible = groupedAssignments.some((group) =>
    group.assignments.some((item) => item.id === assignment.id)
  );
  if (stillVisible) return groupedAssignments;

  const territoryName = assignment.addressSnapshot?.territoryName || assignment.territoryName || 'Territorio';
  const nextGroups = groupedAssignments.map((group) => ({
    ...group,
    assignments: [...group.assignments]
  }));

  let targetGroup = nextGroups.find((group) => group.territoryId === territoryId);
  if (!targetGroup) {
    targetGroup = { territoryId, territoryName, assignments: [] };
    nextGroups.push(targetGroup);
    nextGroups.sort((a, b) => {
      const territoryDiff = (a.territoryName || '').localeCompare(b.territoryName || '', 'es', { numeric: true });
      if (territoryDiff !== 0) return territoryDiff;
      return (a.territoryId || '').localeCompare(b.territoryId || '', 'es', { numeric: true });
    });
  }

  const insertAt = index >= 0 && index <= targetGroup.assignments.length
    ? index
    : targetGroup.assignments.length;
  targetGroup.assignments.splice(insertAt, 0, assignment);
  return nextGroups;
};

const PublisherAssignmentCard = memo(({
  assignment,
  onStatusChange,
  isProcessing = false,
  isExiting = false,
  isExitLocked = false,
  preserveCompletedTheme = false,
  statusResolver = getPublisherAssignmentStatus
}) => {
  const displayStatus = statusResolver(assignment);
  const isCompleted = displayStatus === CAMPAIGN_PROGRESS_STATUSES.COMPLETED;
  const config = isCompleted ? ADDRESS_CARD_THEMES.completed : ADDRESS_CARD_THEMES.inProgress;
  const snapshot = assignment.addressSnapshot || {};
  const displayAddress = getDisplayAddress(snapshot);
  const navigationUrls = getAddressNavigationUrls(snapshot);
  const actionLabel = isCompleted ? 'Invitación entregada' : 'Marcar como entregada';
  const nextStatus = isCompleted
    ? CAMPAIGN_PROGRESS_STATUSES.IN_PROGRESS
    : CAMPAIGN_PROGRESS_STATUSES.COMPLETED;

  const showProcessingLabel = isProcessing && !isExiting && !isExitLocked;
  const buttonDisabled = isProcessing || isExiting || isExitLocked;
  const desktopActionButtonTheme = isCompleted
    ? 'sm:bg-green-600 sm:hover:bg-green-700 sm:text-white'
    : 'sm:bg-slate-700 sm:hover:bg-slate-800 sm:text-white';

  return (
    <div
      id={`campaign-assignment-card-${assignment.id}`}
      className={`
        group relative cursor-default assignment-card-exit-target
        bg-gradient-to-br ${config.bgGradient}
        border-2 ${config.borderColor} ${config.hoverBorder}
        rounded-2xl overflow-hidden
        shadow-lg ${config.hoverShadow}
        ${isExiting
          ? (preserveCompletedTheme ? 'assignment-card--exiting-left' : 'assignment-card--exiting')
          : 'hover:shadow-2xl'}
        ${isExitLocked && !isExiting ? 'pointer-events-none' : ''}
      `}
    >
      <div className="relative px-4 py-3 bg-white/60 backdrop-blur-sm border-b border-white/40">
        <div className="flex items-center gap-3">
          <div className={`${config.iconBg} p-3 rounded-xl shadow-sm backdrop-blur-sm border border-white/20 group-hover:shadow-md transition-shadow`}>
            {isCompleted ? (
              <Icon name="checkCircle" size={24} className={config.iconColor} />
            ) : (
              <i className={`fas fa-house text-xl ${config.iconColor}`} />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h4
              className={`text-lg font-bold break-words ${config.titleColor}`}
              style={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}
            >
              {displayAddress}
            </h4>
          </div>
        </div>
      </div>

      <div className="px-4 py-4 space-y-4">
        {(snapshot.phone || snapshot.notes) && (
          <div className={`flex items-start p-3 ${config.notesBg} rounded-lg text-sm`}>
            <i className={`fas fa-info-circle ${config.notesIcon} mr-2 mt-0.5`} />
            <div className="space-y-1">
              {snapshot.phone ? (
                <p className={config.notesText}>
                  <span className="font-semibold">Teléfono:</span> {snapshot.phone}
                </p>
              ) : null}
              {snapshot.notes ? (
                <p className={`${config.notesText} italic`}>{snapshot.notes}</p>
              ) : null}
            </div>
          </div>
        )}

        <div className="flex items-center justify-between gap-3">
          <AddressNavigationButtons
            urls={navigationUrls}
            containerClassName={`${config.visitedNavButtons}`}
            dividerClassName={config.visitedNavDivider}
            buttonClassName={config.visitedNavActive}
            territoryId={snapshot.territoryId}
          />

          <button
            type="button"
            onClick={() => onStatusChange(assignment.id, nextStatus)}
            disabled={buttonDisabled}
            aria-label={actionLabel}
            title={actionLabel}
            className={`
              h-12 w-12 sm:h-auto sm:w-auto sm:px-4 sm:py-2 rounded-xl font-semibold text-sm shrink-0
              flex items-center justify-center gap-2
              bg-green-700 hover:bg-green-800 text-white ${desktopActionButtonTheme}
              disabled:opacity-50 disabled:cursor-not-allowed
              transition-all transform hover:scale-105 active:scale-95
            `}
          >
            {showProcessingLabel ? (
              <>
                <Icon name="loader" size={20} className="animate-spin sm:hidden" />
                <span className="sr-only sm:not-sr-only">Procesando...</span>
              </>
            ) : (
              <>
                <Icon name="checkCircle" size={20} className="sm:hidden" />
                <Icon name={isCompleted ? 'mailCheck' : 'mail'} size={16} className="hidden sm:block" />
                <span className="sr-only sm:not-sr-only">{actionLabel}</span>
              </>
            )}
          </button>
        </div>
      </div>

      <div
        className="h-1 w-full bg-gradient-to-r opacity-75 group-hover:opacity-100 transition-opacity"
        style={{
          backgroundImage: `linear-gradient(to right, ${config.accentColor}, ${config.accentColor}dd)`
        }}
      />

      <div className="absolute inset-0 bg-gradient-to-t from-black/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
    </div>
  );
}, (prev, next) => (
  prev.assignment === next.assignment
  && prev.isProcessing === next.isProcessing
  && prev.isExiting === next.isExiting
  && prev.isExitLocked === next.isExitLocked
  && prev.preserveCompletedTheme === next.preserveCompletedTheme
  && prev.onStatusChange === next.onStatusChange
  && prev.statusResolver === next.statusResolver
));

const AnimatedAssignmentCardSlot = memo(({
  assignment,
  isExiting = false,
  isPinnedRemnant = false,
  preserveCompletedTheme = false,
  isLast = false,
  onStatusChange,
  onExitAnimationComplete = null,
  isProcessing = false,
  statusResolver = getPublisherAssignmentStatus
}) => {
  const [isAnimatingOut, setIsAnimatingOut] = useState(false);
  const [rowCollapsed, setRowCollapsed] = useState(false);
  const [measuredHeight, setMeasuredHeight] = useState(null);
  const contentRef = useRef(null);
  const rowRef = useRef(null);
  const exitCompleteRef = useRef(false);

  const handleRowAnimationEnd = useCallback((event) => {
    if (event.target !== rowRef.current || !isAnimatingOut || exitCompleteRef.current) return;
    const animationName = event.animationName || '';
    if (animationName !== 'assignment-row-exit' && animationName !== 'assignment-row-exit-last') return;

    exitCompleteRef.current = true;
    setRowCollapsed(true);
    window.requestAnimationFrame(() => {
      onExitAnimationComplete?.(assignment.id);
    });
  }, [assignment.id, isAnimatingOut, onExitAnimationComplete]);

  useLayoutEffect(() => {
    if (!isExiting && !isPinnedRemnant) {
      exitCompleteRef.current = false;
      setRowCollapsed(false);
    }
  }, [isExiting, isPinnedRemnant]);

  useLayoutEffect(() => {
    if (isAnimatingOut || isPinnedRemnant || rowCollapsed) return;
    const nextHeight = contentRef.current?.offsetHeight ?? 0;
    if (nextHeight > 0 && nextHeight !== measuredHeight) {
      setMeasuredHeight(nextHeight);
    }
  });

  useLayoutEffect(() => {
    if (!isExiting) {
      setIsAnimatingOut(false);
      return undefined;
    }

    if (!measuredHeight) return undefined;

    let raf2 = 0;
    const raf1 = window.requestAnimationFrame(() => {
      raf2 = window.requestAnimationFrame(() => {
        setIsAnimatingOut(true);
      });
    });

    return () => {
      window.cancelAnimationFrame(raf1);
      window.cancelAnimationFrame(raf2);
    };
  }, [isExiting, measuredHeight, assignment.id]);

  const useFloaterLayout = measuredHeight != null;

  if (isPinnedRemnant || rowCollapsed) {
    return (
      <div
        ref={rowRef}
        className="assignment-card-exit-row assignment-card-exit-row--collapsed"
        aria-hidden="true"
      />
    );
  }

  return (
    <div
      ref={rowRef}
      className="assignment-card-exit-row"
      data-exiting={isAnimatingOut ? 'true' : 'false'}
      data-exit-direction={preserveCompletedTheme ? 'left' : 'right'}
      onAnimationEnd={handleRowAnimationEnd}
      style={{
        '--assignment-row-height': measuredHeight ? `${measuredHeight}px` : undefined,
        '--assignment-row-gap': isLast ? '0px' : '1rem',
        height: useFloaterLayout && !isAnimatingOut ? measuredHeight : undefined
      }}
    >
      <div className={useFloaterLayout ? 'assignment-card-exit-floater' : undefined}>
        <div ref={contentRef}>
          <PublisherAssignmentCard
            assignment={assignment}
            onStatusChange={onStatusChange}
            isProcessing={isProcessing}
            isExiting={isAnimatingOut}
            isExitLocked={isExiting}
            preserveCompletedTheme={preserveCompletedTheme}
            statusResolver={statusResolver}
          />
        </div>
      </div>
    </div>
  );
}, (prev, next) => (
  prev.assignment === next.assignment
  && prev.isExiting === next.isExiting
  && prev.isPinnedRemnant === next.isPinnedRemnant
  && prev.preserveCompletedTheme === next.preserveCompletedTheme
  && prev.isProcessing === next.isProcessing
  && prev.isLast === next.isLast
  && prev.onStatusChange === next.onStatusChange
  && prev.onExitAnimationComplete === next.onExitAnimationComplete
  && prev.statusResolver === next.statusResolver
));

const PublisherAssignmentsSection = ({
  activeCampaign,
  assignments,
  groupedAssignments,
  onStatusChange,
  isProcessing = false,
  publisherFilter = CAMPAIGN_PROGRESS_STATUSES.IN_PROGRESS,
  onFilterChange = () => {},
  filterOptions = PUBLISHER_FILTER_OPTIONS,
  statusResolver = getPublisherAssignmentStatus,
  onOpenTerritoryMap = null
}) => {
  const [exitingAssignmentId, setExitingAssignmentId] = useState(null);
  const [processingAssignmentId, setProcessingAssignmentId] = useState(null);
  const pendingExitRef = useRef(null);
  const exitingOverlayRef = useRef(null);

  const visibleGroupedAssignments = useMemo(() => {
    if (!exitingAssignmentId || !exitingOverlayRef.current) return groupedAssignments;
    return pinExitingAssignmentInGroups(groupedAssignments, exitingOverlayRef.current);
  }, [groupedAssignments, exitingAssignmentId]);

  const pinnedAssignmentIds = useMemo(() => {
    if (!exitingAssignmentId) return new Set();
    const stillInFilter = groupedAssignments.some((group) =>
      group.assignments.some((item) => item.id === exitingAssignmentId)
    );
    return stillInFilter ? new Set() : new Set([exitingAssignmentId]);
  }, [groupedAssignments, exitingAssignmentId]);

  const runStatusChange = useCallback(async (assignmentId, status) => {
    setProcessingAssignmentId(assignmentId);
    try {
      await onStatusChange(assignmentId, status);
    } finally {
      setProcessingAssignmentId(null);
    }
  }, [onStatusChange]);

  const handleExitAnimationComplete = useCallback(async (assignmentId) => {
    const pending = pendingExitRef.current;
    if (!pending || pending.assignmentId !== assignmentId) return;

    try {
      await runStatusChange(assignmentId, pending.status);
    } finally {
      pendingExitRef.current = null;
      exitingOverlayRef.current = null;
      setExitingAssignmentId(null);
    }
  }, [runStatusChange]);

  const handleAnimatedStatusChange = useCallback(async (assignmentId, status) => {
    const shouldAnimate = shouldAnimateAssignmentExit(status, publisherFilter) && !exitingAssignmentId;

    if (!shouldAnimate) {
      if (exitingAssignmentId && assignmentId === exitingAssignmentId) {
        return;
      }
      await runStatusChange(assignmentId, status);
      return;
    }

    const assignment = assignments.find((item) => item.id === assignmentId);
    const territoryId = assignment?.territoryId || assignment?.addressSnapshot?.territoryId || 'sin-territorio';
    const sourceGroup = groupedAssignments.find((group) => group.territoryId === territoryId);
    const sourceIndex = sourceGroup?.assignments.findIndex((item) => item.id === assignmentId) ?? -1;

    pendingExitRef.current = { assignmentId, status };
    if (assignment) {
      exitingOverlayRef.current = {
        assignment,
        territoryId,
        index: sourceIndex
      };
    }

    setExitingAssignmentId(assignmentId);
  }, [assignments, exitingAssignmentId, groupedAssignments, publisherFilter, runStatusChange]);

  if (!activeCampaign) {
    return (
      <div className="flex min-h-[calc(100dvh-12rem)] items-center justify-center py-8">
        <EmptyState
          variant="centered"
          icon="calendar"
          title={'A\u00fan no hay una campa\u00f1a activa'}
          description={'Cuando los administradores preparen una campa\u00f1a, aqu\u00ed aparecer\u00e1n tus direcciones asignadas.'}
        />
      </div>
    );
  }

  const completedCount = assignments.filter((a) => a.status === CAMPAIGN_PROGRESS_STATUSES.COMPLETED).length;
  const pendingCount = assignments.length - completedCount;

  const filterCounts = {
    [CAMPAIGN_PROGRESS_STATUSES.IN_PROGRESS]: pendingCount,
    [CAMPAIGN_PROGRESS_STATUSES.COMPLETED]: completedCount
  };
  const programUrl = getRegionalAssembly2026ProgramUrl(activeCampaign);

  return (
    <div className="space-y-4">
      <SectionCard
        title={activeCampaign.name}
        icon={getCampaignTypeIcon(activeCampaign.type)}
        rightSlot={programUrl ? (
          <a
            href={programUrl}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Abrir programa en JW.org"
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm transition-colors hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700"
          >
            <Icon name="externalLink" size={16} />
          </a>
        ) : null}
      >
        <div className="flex flex-wrap gap-2">
          {filterOptions.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => onFilterChange(option.id)}
              className={`rounded-2xl border px-4 py-2 text-sm font-semibold transition-all ${
                publisherFilter === option.id
                  ? 'border-slate-800 bg-slate-800 text-white'
                  : 'border-slate-200 bg-white text-slate-700 hover:border-slate-400'
              }`}
            >
              {getPublisherFilterLabel(option.id, filterCounts[option.id], option.label)}
              {filterCounts[option.id] != null ? ` (${filterCounts[option.id]})` : ''}
            </button>
          ))}
        </div>
      </SectionCard>

      {visibleGroupedAssignments.length === 0 ? (
        <EmptyState
          icon="bookmark"
          title="No hay direcciones en este filtro"
          description={'Cambia entre Pendientes y Completadas para revisar tus invitaciones.'}
        />
      ) : (
        visibleGroupedAssignments.map((group) => (
          <SectionCard
            key={group.territoryId}
            title={group.territoryName}
            subtitle={`${group.assignments.length} direcci\u00f3n${group.assignments.length !== 1 ? 'es' : ''}`}
            headerVariant="dark"
            allowContentOverflow
            rightSlot={onOpenTerritoryMap && group.assignments.length > 0 ? (
              <button
                type="button"
                onClick={() => onOpenTerritoryMap(group.assignments, group.territoryName)}
                className="inline-flex items-center rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-xs font-bold text-white backdrop-blur-sm transition-colors hover:bg-white/20"
              >
                <Icon name="map" size={15} className="mr-2" />
                Ver mapa
              </button>
            ) : null}
          >
            <div>
              {group.assignments.map((assignment, index) => (
                <AnimatedAssignmentCardSlot
                  key={assignment.id}
                  assignment={assignment}
                  isExiting={exitingAssignmentId === assignment.id}
                  isPinnedRemnant={pinnedAssignmentIds.has(assignment.id)}
                  preserveCompletedTheme={publisherFilter === CAMPAIGN_PROGRESS_STATUSES.COMPLETED}
                  isLast={index === group.assignments.length - 1}
                  onStatusChange={handleAnimatedStatusChange}
                  onExitAnimationComplete={handleExitAnimationComplete}
                  isProcessing={processingAssignmentId === assignment.id}
                  statusResolver={statusResolver}
                />
              ))}
            </div>
          </SectionCard>
        ))
      )}
    </div>
  );
};

const sortParticipantAssignments = (assignments = []) => (
  [...assignments].sort((a, b) => {
    const territoryA = a.addressSnapshot?.territoryName || '';
    const territoryB = b.addressSnapshot?.territoryName || '';
    const territoryDiff = territoryA.localeCompare(territoryB, 'es', { numeric: true });
    if (territoryDiff !== 0) return territoryDiff;
    return getDisplayAddress(a.addressSnapshot).localeCompare(
      getDisplayAddress(b.addressSnapshot),
      'es',
      { numeric: true }
    );
  })
);

const ParticipantAssignmentAddressList = ({
  assignments = [],
  isBusy = false,
  isReadOnly = false,
  onRequestReassignment = null,
  onCompleteAssignment = null
}) => {
  const grouped = useMemo(
    () => groupAssignmentsByTerritory(assignments),
    [assignments]
  );

  if (grouped.length === 0) {
    return null;
  }

  return (
    <div className="mt-3 space-y-3 border-t border-gray-100 pt-3">
      {grouped.map((group) => (
        <div key={group.territoryId}>
          <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">
            {group.territoryName}
          </p>
          <ul className="space-y-2">
            {group.assignments.map((assignment) => {
              const progressMeta = getCampaignProgressMeta(assignment.status);
              const snapshot = assignment.addressSnapshot || {};
              const mapHref = getPublisherAssignmentMapHref(snapshot);
              const canManage = !isReadOnly && assignment.status !== CAMPAIGN_PROGRESS_STATUSES.COMPLETED;

              return (
                <li
                  key={assignment.id}
                  className={`rounded-2xl border px-3 py-3 lg:px-4 ${
                    assignment.status === CAMPAIGN_PROGRESS_STATUSES.COMPLETED
                      ? 'border-emerald-100 bg-emerald-50/50'
                      : 'border-slate-200 bg-slate-50'
                  }`}
                >
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold ${progressMeta.badgeClass}`}>
                          {progressMeta.label}
                        </span>
                        {assignment.completedByUserName ? (
                          <span className="text-xs text-emerald-700">
                            Completada por {assignment.completedByUserName}
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-1 text-sm font-semibold text-gray-900 lg:text-base">{getDisplayAddress(snapshot)}</p>
                    </div>

                    <div className="grid gap-2 sm:grid-cols-2 lg:flex lg:shrink-0 lg:items-center">
                      {canManage && onCompleteAssignment ? (
                        <button
                          type="button"
                          onClick={() => onCompleteAssignment(assignment)}
                          disabled={isBusy}
                          className="flex min-h-[42px] items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-bold text-white shadow-sm transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          <Icon name="checkCircle" size={16} />
                          Marcar completada
                        </button>
                      ) : null}
                      {canManage && onRequestReassignment ? (
                        <button
                          type="button"
                          onClick={() => onRequestReassignment(assignment)}
                          disabled={isBusy}
                          className="flex min-h-[42px] items-center justify-center gap-2 rounded-xl border border-indigo-200 bg-white px-4 py-2 text-sm font-semibold text-indigo-700 transition-colors hover:bg-indigo-50 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          <Icon name="users" size={15} />
                          Cambiar responsable
                        </button>
                      ) : null}
                      {mapHref ? (
                        <a
                          href={mapHref}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label="Abrir en Google Maps"
                          className="flex min-h-[42px] items-center justify-center gap-2 rounded-xl bg-slate-700 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-slate-800 sm:col-span-2 lg:col-span-1"
                        >
                          <Icon name="navigation" size={14} />
                          Mapa
                        </a>
                      ) : null}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </div>
  );
};

const CampaignReassignmentModal = ({
  request,
  participants = [],
  isProcessing = false,
  onClose,
  onConfirm
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [targetUserId, setTargetUserId] = useState('');
  const lastRequestRef = useRef(request);
  if (request) {
    lastRequestRef.current = request;
  }
  const activeRequest = request || lastRequestRef.current;
  const isOpen = Boolean(request);

  useEffect(() => {
    if (!isOpen) return;
    setSearchQuery('');
    setTargetUserId('');
  }, [isOpen, activeRequest?.assignmentId, activeRequest?.sourceUserId, activeRequest?.mode]);

  const requestedAssignments = useMemo(() => {
    if (Array.isArray(activeRequest?.assignments)) return activeRequest.assignments;
    return activeRequest?.assignment ? [activeRequest.assignment] : [];
  }, [activeRequest?.assignment, activeRequest?.assignments]);
  const hasRestrictedAddresses = requestedAssignments.some(isRestrictedCampaignAddress);

  const availableParticipants = useMemo(() => {
    const normalizedSearch = normalizeSearchText(searchQuery);
    return participants.filter((participant) => (
      participant.userId !== activeRequest?.sourceUserId
      && requestedAssignments.every((assignment) => (
        canParticipantReceiveCampaignAddress(assignment, participant)
      ))
      && (!normalizedSearch || normalizeSearchText(participant.userNameSnapshot).includes(normalizedSearch))
    ));
  }, [participants, activeRequest?.sourceUserId, requestedAssignments, searchQuery]);

  const selectedParticipant = participants.find((participant) => participant.userId === targetUserId);
  const isBulk = activeRequest?.mode === 'all_pending';
  const count = Number(activeRequest?.count) || 0;

  const handleConfirm = async () => {
    if (!targetUserId) return;
    await onConfirm(targetUserId);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={isProcessing ? () => {} : onClose}
      title={isBulk ? 'Reasignar direcciones pendientes' : 'Cambiar responsable'}
      size="md"
      modalId="campaign-reassignment-modal"
      closeOnBackdrop={!isProcessing}
      closeOnEscape={!isProcessing}
    >
      <div className="flex max-h-[calc(85vh-73px)] flex-col">
        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Responsable actual</p>
            <p className="mt-1 font-semibold text-slate-900">{activeRequest?.sourceUserName || 'Participante'}</p>
            <p className="mt-2 text-sm text-slate-600">
              {isBulk
                ? `${count} ${count === 1 ? 'dirección pendiente' : 'direcciones pendientes'} se transferirán.`
                : getDisplayAddress(activeRequest?.assignment?.addressSnapshot, 'Dirección')}
            </p>
          </div>

          {activeRequest?.assignment?.status === CAMPAIGN_PROGRESS_STATUSES.IN_PROGRESS ? (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
              Esta dirección está en progreso. Al reasignarla volverá a pendiente y se borrará su fecha de inicio.
            </div>
          ) : null}

          <div>
            <label htmlFor="campaign-reassignment-search" className="mb-2 block text-sm font-semibold text-slate-800">
              Selecciona quién la recibirá
            </label>
            <div className="relative">
              <Icon name="search" size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                id="campaign-reassignment-search"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                disabled={isProcessing}
                placeholder="Buscar por nombre o apellido"
                className="w-full rounded-2xl border border-slate-300 py-3 pl-11 pr-4 text-sm focus:border-indigo-500 focus:outline-none disabled:opacity-60"
              />
            </div>
          </div>

          <div className="space-y-2">
            {availableParticipants.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 p-4 text-center text-sm text-slate-500">
                {hasRestrictedAddresses
                  ? 'No hay varones autorizados que coincidan con la búsqueda.'
                  : 'No hay participantes activos que coincidan con la búsqueda.'}
              </div>
            ) : availableParticipants.map((participant) => {
              const isSelected = targetUserId === participant.userId;
              return (
                <button
                  key={participant.userId}
                  type="button"
                  onClick={() => setTargetUserId(participant.userId)}
                  disabled={isProcessing}
                  aria-pressed={isSelected}
                  className={`flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-left transition-colors disabled:opacity-60 ${
                    isSelected
                      ? 'border-indigo-500 bg-indigo-50 ring-2 ring-indigo-100'
                      : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-slate-900">{participant.userNameSnapshot}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      {participant.total || 0} asignadas · {participant.pending || 0} pendientes
                    </p>
                  </div>
                  <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                    isSelected ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-400'
                  }`}>
                    <Icon name={isSelected ? 'check' : 'user'} size={15} />
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="border-t border-slate-200 bg-white px-5 py-4">
          {selectedParticipant ? (
            <p className="mb-3 text-center text-sm text-slate-600">
              Se asignará{isBulk && count !== 1 ? 'n' : ''} a <strong>{selectedParticipant.userNameSnapshot}</strong>.
            </p>
          ) : null}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isProcessing}
              className="min-h-[44px] flex-1 rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 disabled:opacity-60"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={isProcessing || !targetUserId}
              className="flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isProcessing ? <Icon name="loader" size={16} className="animate-spin" /> : <Icon name="users" size={16} />}
              {isProcessing ? 'Reasignando...' : 'Confirmar cambio'}
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
};

const CampaignAddressDriftBanner = ({
  drift,
  onRegenerate,
  isBusy = false,
  isReadOnly = false
}) => {
  if (!drift?.hasNewAddresses && !drift?.hasStaleAssignments) {
    return null;
  }

  return (
    <div className="rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-sky-900">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          {drift.hasNewAddresses ? (
            <p className="text-sm font-semibold">
              {drift.newCount === 1
                ? 'Hay 1 dirección nueva desde el último reparto.'
                : `Hay ${drift.newCount} direcciones nuevas desde el último reparto.`}
            </p>
          ) : null}
          {drift.hasStaleAssignments ? (
            <p className="text-sm font-semibold">
              {drift.staleCount === 1
                ? '1 dirección del reparto ya no está disponible.'
                : `${drift.staleCount} direcciones del reparto ya no están disponibles.`}
            </p>
          ) : null}
          <p className="text-sm text-sky-800/90">
            {drift.hasNewAddresses
              ? `El reparto actual cubre ${drift.assignedCount} de ${drift.liveCount} direcciones elegibles. Se recomienda regenerar el reparto para mantenerlo actualizado.`
              : 'Regenera el reparto para alinear las asignaciones con las direcciones actuales.'}
          </p>
        </div>
        {!isReadOnly && onRegenerate ? (
          <button
            type="button"
            onClick={onRegenerate}
            disabled={isBusy}
            className="inline-flex min-h-[44px] shrink-0 items-center justify-center gap-2 rounded-2xl bg-sky-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition-colors hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isBusy ? (
              <>
                <Icon name="loader" size={16} className="animate-spin" />
                Regenerando...
              </>
            ) : (
              <>
                <Icon name="shuffle" size={16} />
                Regenerar reparto
              </>
            )}
          </button>
        ) : null}
      </div>
    </div>
  );
};

const CopyDistributionButton = ({ onClick, copied, disabled = false, className = '' }) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    aria-label="Copiar reparto"
    title="Copiar reparto para WhatsApp"
    className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60 ${className}`}
  >
    <Icon name={copied ? 'checkCircle' : 'copy'} size={16} />
  </button>
);

const CampaignDistributionControl = ({
  participants = [],
  distributionTargets = {},
  totalAddresses = 0,
  configuredTotal = 0,
  isBalanced = false,
  preservedCountsByUser = {},
  isBusy = false,
  isReadOnly = false,
  onAdjustTarget = () => {},
  onSetTarget = () => {},
  onUseConfiguredTargets = () => {},
  onApply = () => {},
  compact = false,
  assignmentsByUserId = null,
  onOpenParticipantMap = null,
  onRequestReassignment = null,
  onRequestBulkReassignment = null,
  onCompleteAssignment = null,
  assignmentsGenerated = false,
  requiresRegenerate = false
}) => {
  const [expandedParticipantId, setExpandedParticipantId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const balanceDifference = totalAddresses - configuredTotal;

  const filteredParticipants = useMemo(() => {
    const normalizedSearch = normalizeSearchText(searchQuery);
    if (!normalizedSearch) return participants;

    return participants.filter((participant) => (
      normalizeSearchText(participant.userNameSnapshot).includes(normalizedSearch)
    ));
  }, [participants, searchQuery]);

  return (
    <div className="space-y-4">
      {assignmentsGenerated && (
        <div className="flex items-start gap-2.5 rounded-2xl border border-sky-200 bg-sky-50 px-3 py-2.5 text-sm text-sky-800">
          <Icon name="info" size={16} className="mt-0.5 shrink-0" />
          <p>
            <strong>Asignadas ahora</strong> muestra el reparto vigente. La cantidad de <strong>Al actualizar</strong> es la que quedará al pulsar Actualizar reparto.
          </p>
        </div>
      )}

      {!isBalanced && (
        <div className="flex flex-col gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-3 py-3 text-sm text-amber-900 sm:flex-row sm:items-center sm:justify-between">
          <p className="font-semibold">
            {balanceDifference > 0
              ? `Faltan ${balanceDifference} dirección${balanceDifference === 1 ? '' : 'es'} por asignar (${configuredTotal}/${totalAddresses}).`
              : `Sobran ${Math.abs(balanceDifference)} dirección${Math.abs(balanceDifference) === 1 ? '' : 'es'} (${configuredTotal}/${totalAddresses}).`}
          </p>
          <button
            type="button"
            onClick={onUseConfiguredTargets}
            disabled={isBusy || isReadOnly}
            className="min-h-[40px] shrink-0 rounded-xl border border-amber-300 bg-white px-3 py-2 text-xs font-bold text-amber-900 transition-colors hover:bg-amber-100 disabled:opacity-60"
          >
            Usar cantidades configuradas
          </button>
        </div>
      )}

      {!requiresRegenerate && (
        <button
          type="button"
          onClick={onApply}
          disabled={isBusy || isReadOnly || !isBalanced || participants.length === 0}
          className={`inline-flex min-h-[44px] items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-5 text-sm font-bold text-white shadow-sm transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60 ${
            compact ? 'w-full py-3' : 'shrink-0 py-2.5'
          }`}
        >
          {isBusy ? (
            <>
              <Icon name="loader" size={16} className="animate-spin" />
              Actualizando...
            </>
          ) : (
            <>
              <Icon name="shuffle" size={16} />
              Actualizar reparto
            </>
          )}
        </button>
      )}

      {participants.length > 0 && (
        <div className="relative">
          <div className="pointer-events-none absolute left-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
            <Icon name="search" size={16} />
          </div>
          <input
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            onFocus={(event) => {
              if (event.target.value.length > 0) {
                event.target.select();
              }
            }}
            disabled={isBusy}
            inputMode="search"
            placeholder="Buscar por nombre o apellido"
            aria-label="Buscar hermano en el reparto"
            className="w-full rounded-2xl border border-gray-300 py-3 pl-12 pr-10 text-sm focus:border-slate-500 focus:outline-none disabled:opacity-60"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              disabled={isBusy}
              aria-label="Limpiar búsqueda"
              className="absolute right-3 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-xl text-slate-500 transition-colors hover:bg-slate-100 disabled:opacity-60"
            >
              <Icon name="x" size={16} />
            </button>
          )}
        </div>
      )}

      {searchQuery && filteredParticipants.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-4 text-sm text-gray-500">
          {`Sin resultados para "${searchQuery}"`}
        </div>
      ) : (
      <div className={`space-y-3 ${compact ? '' : 'lg:grid lg:grid-cols-2 lg:gap-3 lg:space-y-0 xl:grid-cols-2'}`}>
        {filteredParticipants.map((participant) => {
          const targetValue = Number(distributionTargets[participant.userId]) || 0;
          const minTarget = preservedCountsByUser[participant.userId] || 0;
          const currentDelta = targetValue - (participant.total || 0);
          const deltaLabel = currentDelta === 0
            ? null
            : currentDelta > 0
              ? `${currentDelta} más al actualizar`
              : `${Math.abs(currentDelta)} menos al actualizar`;

          return (
            <div
              key={participant.userId}
              className={`rounded-2xl border border-gray-200 bg-white p-4 ${compact ? '' : 'lg:h-full'}`}
            >
              <div className={`flex gap-3 ${compact ? 'flex-col lg:flex-row lg:items-start lg:justify-between' : 'flex-col sm:flex-row sm:items-start sm:justify-between'}`}>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold text-gray-900">{participant.userNameSnapshot}</p>
                    {deltaLabel && (
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-bold ${
                        currentDelta > 0 ? 'bg-sky-100 text-sky-700' : 'bg-orange-100 text-orange-700'
                      }`}>
                        {deltaLabel}
                      </span>
                    )}
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2 text-xs font-semibold">
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-700">
                      Pendientes: {participant.pending}
                    </span>
                    <span className="rounded-full bg-amber-100 px-2.5 py-1 text-amber-700">
                      En progreso: {participant.inProgress}
                    </span>
                    <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-emerald-700">
                      Completadas: {participant.completed}
                    </span>
                  </div>
                  {minTarget > 0 && (
                    <p className="mt-2 text-xs text-slate-500">
                      Mínimo {minTarget} por asignaciones completadas, en progreso o bloqueadas.
                    </p>
                  )}
                </div>

                <div className={`flex items-end gap-2 ${compact ? 'justify-between lg:shrink-0 lg:justify-end' : 'shrink-0 sm:justify-end'}`}>
                  <button
                    type="button"
                    onClick={() => onAdjustTarget(participant.userId, -1)}
                    disabled={isBusy || isReadOnly || targetValue <= minTarget}
                    aria-label={`Reducir objetivo de ${participant.userNameSnapshot}`}
                    className="flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 transition-colors hover:border-slate-400 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Icon name="minus" size={16} />
                  </button>
                  <label className="flex flex-col items-center gap-1">
                    <span className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
                      Al actualizar
                    </span>
                    <input
                      type="number"
                      min={minTarget}
                      max={totalAddresses}
                      inputMode="numeric"
                      value={targetValue}
                      onChange={(event) => onSetTarget(participant.userId, event.target.value)}
                      disabled={isBusy || isReadOnly}
                      aria-label={`Cantidad al actualizar para ${participant.userNameSnapshot}`}
                      className="h-11 w-16 rounded-xl border border-gray-300 px-2 text-center text-base font-bold tabular-nums focus:border-slate-500 focus:outline-none disabled:opacity-60"
                    />
                  </label>
                  <button
                    type="button"
                    onClick={() => onAdjustTarget(participant.userId, 1)}
                    disabled={isBusy || isReadOnly || targetValue >= totalAddresses}
                    aria-label={`Aumentar objetivo de ${participant.userNameSnapshot}`}
                    className="flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 transition-colors hover:border-slate-400 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Icon name="plus" size={16} />
                  </button>
                </div>
              </div>

              {assignmentsGenerated && participant.total > 0 && assignmentsByUserId && onOpenParticipantMap ? (
                <div className="mt-3 space-y-2">
                  <button
                    type="button"
                    onClick={() => setExpandedParticipantId((prev) => (
                      prev === participant.userId ? null : participant.userId
                    ))}
                    className="flex w-full min-h-[40px] items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700 transition-colors hover:border-slate-300 hover:bg-slate-100"
                  >
                    <span>Asignadas ahora: {participant.total} · Ver direcciones</span>
                    <Icon
                      name="chevronDown"
                      size={16}
                      className={`shrink-0 transition-transform ${expandedParticipantId === participant.userId ? 'rotate-180' : ''}`}
                    />
                  </button>

                  {expandedParticipantId === participant.userId ? (
                    <ParticipantAssignmentAddressList
                      assignments={assignmentsByUserId.get(participant.userId) || []}
                      isBusy={isBusy}
                      isReadOnly={isReadOnly}
                      onRequestReassignment={onRequestReassignment}
                      onCompleteAssignment={onCompleteAssignment}
                    />
                  ) : null}

                  <div className="flex flex-col gap-2 lg:flex-row">
                    {!isReadOnly && participant.pending > 0 && onRequestBulkReassignment ? (
                      <button
                        type="button"
                        onClick={() => onRequestBulkReassignment(participant)}
                        disabled={isBusy}
                        className="flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-2.5 text-sm font-bold text-indigo-700 transition-colors hover:bg-indigo-100 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <Icon name="users" size={16} />
                        Reasignar pendientes ({participant.pending})
                      </button>
                    ) : null}

                    <button
                      type="button"
                      onClick={() => onOpenParticipantMap(participant.userId, participant.userNameSnapshot)}
                      className="flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-bold text-slate-800 shadow-sm transition-colors hover:border-slate-400 hover:bg-slate-50"
                    >
                      <Icon name="map" size={16} />
                      Ver mapa
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
      )}
    </div>
  );
};

const CampaignHistoryDetail = ({ summary, isLegacy = false }) => {
  const [expandedTerritoryIds, setExpandedTerritoryIds] = useState(() => new Set());

  const assignmentsByTerritory = useMemo(() => {
    const grouped = new Map();

    (summary?.assignments || []).forEach((assignment) => {
      const territoryId = assignment.territoryId || 'sin-territorio';
      if (!grouped.has(territoryId)) {
        grouped.set(territoryId, []);
      }
      grouped.get(territoryId).push(assignment);
    });

    return grouped;
  }, [summary?.assignments]);

  const toggleTerritory = (territoryId) => {
    setExpandedTerritoryIds((previous) => {
      const next = new Set(previous);
      if (next.has(territoryId)) {
        next.delete(territoryId);
      } else {
        next.add(territoryId);
      }
      return next;
    });
  };

  if (!summary) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
        No hay datos históricos disponibles para esta campaña.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {isLegacy ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Historial anterior · resumen reconstruido desde las asignaciones guardadas.
        </div>
      ) : null}

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Resumen general</p>
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <div className="rounded-xl bg-slate-50 px-3 py-2 text-center">
            <p className="text-lg font-bold tabular-nums text-slate-900">{summary.total || 0}</p>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">total</p>
          </div>
          <div className="rounded-xl bg-emerald-50 px-3 py-2 text-center">
            <p className="text-lg font-bold tabular-nums text-emerald-700">{summary.completed || 0}</p>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-emerald-700">completadas</p>
          </div>
          <div className="rounded-xl bg-slate-50 px-3 py-2 text-center">
            <p className="text-lg font-bold tabular-nums text-slate-900">{summary.pending || 0}</p>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">pendientes</p>
          </div>
          <div className="rounded-xl bg-amber-50 px-3 py-2 text-center">
            <p className="text-lg font-bold tabular-nums text-amber-700">{summary.inProgress || 0}</p>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-amber-700">en progreso</p>
          </div>
        </div>
        <p className="mt-3 text-sm font-semibold text-slate-700">
          Avance final: {summary.progressPercent ?? 0}%
        </p>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Por hermano</p>
        <div className="mt-3 space-y-2">
          {(summary.byParticipant || []).length === 0 ? (
            <p className="text-sm text-slate-500">Sin participantes registrados.</p>
          ) : (
            summary.byParticipant.map((participant) => (
              <div
                key={participant.userId}
                className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2.5"
              >
                <p className="text-sm font-bold text-slate-900">{participant.userNameSnapshot}</p>
                <p className="mt-1 text-xs text-slate-600">
                  {participant.total} total · {participant.completed} completadas · {participant.pending} pendientes · {participant.inProgress} en progreso
                </p>
              </div>
            ))
          )}
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Por territorio</p>
        <div className="mt-3 space-y-2">
          {(summary.byTerritory || []).length === 0 ? (
            <p className="text-sm text-slate-500">Sin territorios registrados.</p>
          ) : (
            summary.byTerritory.map((territory) => {
              const isExpanded = expandedTerritoryIds.has(territory.territoryId);
              const territoryAssignments = assignmentsByTerritory.get(territory.territoryId) || [];

              return (
                <div
                  key={territory.territoryId}
                  className="overflow-hidden rounded-xl border border-slate-100"
                >
                  <button
                    type="button"
                    onClick={() => toggleTerritory(territory.territoryId)}
                    className="flex w-full items-center justify-between gap-3 bg-slate-50 px-3 py-3 text-left"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-slate-900">{territory.territoryName}</p>
                      <p className="mt-0.5 text-xs text-slate-600">
                        {territory.total} dir. · {territory.completed} completadas · {territory.pending} pend. · {territory.inProgress} en prog.
                      </p>
                    </div>
                    <Icon
                      name="chevronDown"
                      size={16}
                      className={`shrink-0 text-slate-500 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                    />
                  </button>

                  {isExpanded ? (
                    <div className="divide-y divide-slate-100 bg-white">
                      {territoryAssignments.map((assignment, index) => {
                        const progressMeta = getCampaignProgressMeta(assignment.status);
                        return (
                          <div
                            key={`${assignment.addressId || 'address'}-${index}`}
                            className="px-3 py-3"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <p className="text-sm font-semibold text-slate-900">
                                  {assignment.addressDisplay || assignment.addressSnapshot?.address || 'Dirección'}
                                </p>
                                <p className="mt-1 text-xs text-slate-500">
                                  Responsable: {assignment.assignedUserName || 'Sin asignar'}
                                </p>
                              </div>
                              <span className={`shrink-0 rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${progressMeta.badgeClass}`}>
                                {progressMeta.label}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : null}
                </div>
              );
            })
          )}
        </div>
      </section>
    </div>
  );
};

const CampaignsView = ({ onBack }) => {
  const {
    currentUser,
    territories,
    addresses,
    addressesLoading,
    users
  } = useApp();
  const { showToast, removeToast } = useToast();
  const {
    campaigns,
    campaignParticipants,
    campaignAssignments,
    campaignsLoading,
    activeCampaign,
    campaignHistory,
    myPendingCampaignAssignmentsCount,
    handleCreateCampaign,
    handleUpdateCampaign,
    handleSaveCampaignStructure,
    handleGenerateCampaignAssignments,
    handleRedistributeCampaignAssignments,
    handleSaveDistributionTargetsDraft,
    handleActivateCampaign,
    handleCompleteCampaign,
    handleArchiveCampaign,
    handleFinalizeAndArchiveCampaign,
    handleDeleteCampaign,
    handleUpdateCampaignAssignmentStatus,
    handleResetCampaignAssignment,
    handleReassignCampaignAssignments,
    handleUndoCampaignReassignment,
    handleToggleCampaignAssignmentLock
  } = useCampaigns();

  const isAdmin = currentUser?.role === 'admin';
  const allTerritoryIds = useMemo(
    () => territories.map((territory) => territory.id).filter(Boolean),
    [territories]
  );
  const territoryMap = useMemo(() => territories.reduce((accumulator, territory) => {
    accumulator[territory.id] = territory;
    return accumulator;
  }, {}), [territories]);
  const [selectedCampaignId, setSelectedCampaignId] = useState(null);
  const [campaignForm, setCampaignForm] = useState(DEFAULT_CAMPAIGN_FORM);
  const [participantsDraft, setParticipantsDraft] = useState([]);
  const [participantSearch, setParticipantSearch] = useState('');
  const [participantGenderFilter, setParticipantGenderFilter] = useState(null);
  const isDesktop = useIsDesktop();
  const [publisherFilter, setPublisherFilter] = useState(CAMPAIGN_PROGRESS_STATUSES.IN_PROGRESS);
  const [publisherMapState, setPublisherMapState] = useState({
    isOpen: false,
    territoryId: null,
    territoryName: ''
  });
  const [participantMapState, setParticipantMapState] = useState({
    isOpen: false,
    userId: null,
    userName: ''
  });
  const [isCampaignMapOpen, setIsCampaignMapOpen] = useState(false);
  const [adminViewMode, setAdminViewMode] = useState('admin');
  const [isBusy, setIsBusy] = useState(false);
  const [reassignmentRequest, setReassignmentRequest] = useState(null);
  const [confirmAction, setConfirmAction] = useState(null);
  const [campaignPendingDelete, setCampaignPendingDelete] = useState(null);

  const [adminScreen, setAdminScreen] = useState('hub');
  const [historyCampaignId, setHistoryCampaignId] = useState(null);
  const [step3Tab, setStep3Tab] = useState('participants');
  const [step3DistributionFilter, setStep3DistributionFilter] = useState('all');
  const [isHubProgressDetailOpen, setIsHubProgressDetailOpen] = useState(false);
  const [isHubPendingAddressesOpen, setIsHubPendingAddressesOpen] = useState(true);
  const [isHistoryExpanded, setIsHistoryExpanded] = useState(false);
  const [distributionTargets, setDistributionTargets] = useState({});
  const distributionHydratedCampaignRef = useRef(null);
  const distributionApplyLockRef = useRef(null);
  const distributionSkipSaveRef = useRef(true);
  const distributionSaveTimeoutRef = useRef(null);
  const distributionSavePromisesRef = useRef(new Set());
  const distributionTargetsRef = useRef({});
  const selectedCampaignAssignmentsRef = useRef([]);
  const selectedCampaignParticipantsRef = useRef([]);
  const reassignmentUndoRef = useRef(null);
  const reassignmentUndoTimeoutRef = useRef(null);
  const hasAutoSelectedAdminViewRef = useRef(false);
  const [isCreatingNewCampaign, setIsCreatingNewCampaign] = useState(false);
  const prevSelectedCampaignIdRef = useRef(null);
  const distributionCopyTimeoutRef = useRef(null);
  const [distributionCopyFeedback, setDistributionCopyFeedback] = useState(false);

  const clearReassignmentUndo = useCallback((removeVisibleToast = true) => {
    const activeUndo = reassignmentUndoRef.current;

    if (reassignmentUndoTimeoutRef.current) {
      clearTimeout(reassignmentUndoTimeoutRef.current);
      reassignmentUndoTimeoutRef.current = null;
    }
    reassignmentUndoRef.current = null;

    if (removeVisibleToast && activeUndo?.toastId) {
      removeToast(activeUndo.toastId);
    }
  }, [removeToast]);

  useEffect(() => () => {
    clearReassignmentUndo();
  }, [clearReassignmentUndo]);

  useEffect(() => {
    if (adminScreen === 'step3') {
      setStep3Tab('participants');
    }
  }, [adminScreen]);

  useEffect(() => {
    if (!isAdmin) return;
    if (isCreatingNewCampaign) return;
    if (selectedCampaignId && campaigns.some((campaign) => campaign.id === selectedCampaignId)) return;

    const nextDraft = campaigns.find((campaign) => campaign.status === CAMPAIGN_STATUSES.DRAFT);
    const nextCampaignId = activeCampaign?.id || nextDraft?.id || null;
    setSelectedCampaignId(nextCampaignId);
  }, [activeCampaign, campaigns, isAdmin, isCreatingNewCampaign, selectedCampaignId]);

  useEffect(() => {
    if (selectedCampaignId) {
      setIsCreatingNewCampaign(false);
    }
  }, [selectedCampaignId]);

  useEffect(() => {
    if (!isAdmin || campaignsLoading || hasAutoSelectedAdminViewRef.current) return;

    setAdminViewMode(myPendingCampaignAssignmentsCount > 0 ? 'personal' : 'admin');
    hasAutoSelectedAdminViewRef.current = true;
  }, [campaignsLoading, isAdmin, myPendingCampaignAssignmentsCount]);

  const selectedCampaign = useMemo(() => {
    if (!isAdmin) return activeCampaign;
    if (activeCampaign) return activeCampaign;
    return campaigns.find((campaign) => campaign.id === selectedCampaignId) || null;
  }, [activeCampaign, campaigns, isAdmin, selectedCampaignId]);

  const selectedCampaignParticipants = useMemo(() => {
    if (!selectedCampaign) return [];
    return campaignParticipants
      .filter((participant) => participant.campaignId === selectedCampaign.id)
      .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
  }, [campaignParticipants, selectedCampaign]);

  const selectedCampaignAssignments = useMemo(() => {
    if (!selectedCampaign) return [];
    return campaignAssignments
      .filter((assignment) => assignment.campaignId === selectedCampaign.id)
      .sort((a, b) => {
        const territoryA = a.addressSnapshot?.territoryName || '';
        const territoryB = b.addressSnapshot?.territoryName || '';
        const territoryDiff = territoryA.localeCompare(territoryB, 'es', { numeric: true });
        if (territoryDiff !== 0) return territoryDiff;
        return getDisplayAddress(a.addressSnapshot, '').localeCompare(getDisplayAddress(b.addressSnapshot, ''), 'es', { numeric: true });
      });
  }, [campaignAssignments, selectedCampaign]);

  useEffect(() => {
    selectedCampaignAssignmentsRef.current = selectedCampaignAssignments;
    selectedCampaignParticipantsRef.current = selectedCampaignParticipants;
  }, [selectedCampaignAssignments, selectedCampaignParticipants]);

  useEffect(() => {
    const activeUndo = reassignmentUndoRef.current;
    if (activeUndo && activeUndo.campaignId !== selectedCampaign?.id) {
      clearReassignmentUndo();
    }
  }, [clearReassignmentUndo, selectedCampaign?.id]);

  const allTerritoryAddresses = useMemo(() => sortCampaignSourceAddresses(
    getEligibleCampaignAddresses(addresses, { territoryIds: allTerritoryIds }),
    territoryMap
  ), [addresses, allTerritoryIds, territoryMap]);

  const isReadOnlyCampaign = selectedCampaign && [CAMPAIGN_STATUSES.COMPLETED, CAMPAIGN_STATUSES.ARCHIVED].includes(selectedCampaign.status);

  useEffect(() => {
    const availableUsers = [...users]
      .sort((a, b) => a.name.localeCompare(b.name, 'es'));

    const campaignId = selectedCampaign?.id ?? null;
    const isCampaignChange = prevSelectedCampaignIdRef.current !== campaignId;
    prevSelectedCampaignIdRef.current = campaignId;

    if (isCampaignChange) {
      setParticipantSearch('');
      setParticipantGenderFilter(null);
      setStep3DistributionFilter('all');
      setIsHubProgressDetailOpen(false);
      setIsHubPendingAddressesOpen(true);
      setIsCampaignMapOpen(false);
    }

    if (!selectedCampaign) {
      setCampaignForm({ ...DEFAULT_CAMPAIGN_FORM });
      setParticipantsDraft(availableUsers.map((user) => applyDefaultCampaignAssignment({
        userId: user.id,
        userNameSnapshot: user.name,
        userRole: user.role
      })));
      return;
    }

    setCampaignForm({
      name: selectedCampaign.name || '',
      type: selectedCampaign.type || 'asamblea',
      eventDate: selectedCampaign.eventDate || '',
      eventEndDate: selectedCampaign.eventEndDate || selectedCampaign.eventDate || ''
    });

    const participantsByUserId = new Map(
      selectedCampaignParticipants.map((participant) => [participant.userId, participant])
    );

    setParticipantsDraft(availableUsers.map((user) => {
      const participant = participantsByUserId.get(user.id);
      if (participant) {
        return resolveCampaignAssignment({
          id: participant.id,
          userId: participant.userId,
          userNameSnapshot: participant.userNameSnapshot,
          userRole: user.role,
          capacityWeight: participant.capacityWeight ?? 1,
          hardLimit: participant.hardLimit ?? '',
          isEnabled: participant.isEnabled !== false
        });
      }

      return applyDefaultCampaignAssignment({
        userId: user.id,
        userNameSnapshot: user.name,
        userRole: user.role
      });
    }));
  }, [selectedCampaign, selectedCampaignParticipants, users]);

  useEffect(() => {
    if (adminViewMode !== 'admin') {
      setAdminScreen('hub');
      setHistoryCampaignId(null);
    }
  }, [adminViewMode]);

  const historyCampaign = useMemo(
    () => campaignHistory.find((campaign) => campaign.id === historyCampaignId) || null,
    [campaignHistory, historyCampaignId]
  );

  const historySummaryResult = useMemo(() => {
    if (!historyCampaign) return null;

    const participantsForHistory = campaignParticipants.filter(
      (participant) => participant.campaignId === historyCampaign.id
    );
    const assignmentsForHistory = campaignAssignments.filter(
      (assignment) => assignment.campaignId === historyCampaign.id
    );

    return resolveCampaignHistorySummary({
      campaign: historyCampaign,
      participants: participantsForHistory,
      assignments: assignmentsForHistory
    });
  }, [campaignAssignments, campaignParticipants, historyCampaign]);

  const usersAvailableForCampaign = useMemo(
    () => [...users].sort((a, b) => a.name.localeCompare(b.name, 'es')),
    [users]
  );

  const usersById = useMemo(
    () => users.reduce((accumulator, user) => {
      accumulator[user.id] = user;
      return accumulator;
    }, {}),
    [users]
  );

  const getParticipantGender = (participant) => getUserGender(
    usersById[participant.userId] || participant.userNameSnapshot
  );

  const participantGenderCounts = useMemo(() => participantsDraft.reduce((accumulator, participant) => {
    const gender = getParticipantGender(participant);
    if (gender === 'Hombre') accumulator.male += 1;
    if (gender === 'Mujer') accumulator.female += 1;
    return accumulator;
  }, { male: 0, female: 0 }), [participantsDraft, usersById]);

  const filteredParticipantsDraft = useMemo(() => {
    const normalizedSearch = normalizeSearchText(participantSearch);

    return participantsDraft.filter((participant) => {
      if (normalizedSearch && !normalizeSearchText(participant.userNameSnapshot).includes(normalizedSearch)) {
        return false;
      }

      if (participantGenderFilter && getParticipantGender(participant) !== participantGenderFilter) {
        return false;
      }

      return true;
    });
  }, [participantGenderFilter, participantSearch, participantsDraft, usersById]);

  const participantTargetsPreview = useMemo(() => {
    const totalAddresses = allTerritoryAddresses.length;
    const resolvedDraft = participantsDraft.map(resolveCampaignAssignment);
    const enabledCount = resolvedDraft.filter((participant) => participant.isEnabled !== false).length;

    if (totalAddresses === 0) {
      return { byUserId: {}, error: null };
    }

    if (enabledCount === 0) {
      return { byUserId: {}, error: 'Todos los hermanos están excluidos del reparto.' };
    }

    try {
      const targets = calculateCampaignTargets(resolvedDraft, totalAddresses);
      const byUserId = targets.reduce((accumulator, target) => {
        accumulator[target.userId] = target.assignedCount;
        return accumulator;
      }, {});

      return { byUserId, error: null };
    } catch (error) {
      return { byUserId: {}, error: error.message };
    }
  }, [allTerritoryAddresses.length, participantsDraft]);

  const participantSummary = useMemo(() => {
    const sourceParticipants = isAdmin ? participantsDraft : [];

    return sourceParticipants.map((participant) => {
      const assignmentsForParticipant = selectedCampaignAssignments.filter(
        (assignment) => assignment.assignedUserId === participant.userId
      );
      return {
        ...participant,
        total: assignmentsForParticipant.length,
        pending: assignmentsForParticipant.filter((assignment) => assignment.status === CAMPAIGN_PROGRESS_STATUSES.PENDING).length,
        inProgress: assignmentsForParticipant.filter((assignment) => assignment.status === CAMPAIGN_PROGRESS_STATUSES.IN_PROGRESS).length,
        completed: assignmentsForParticipant.filter((assignment) => assignment.status === CAMPAIGN_PROGRESS_STATUSES.COMPLETED).length
      };
    });
  }, [isAdmin, participantsDraft, selectedCampaignAssignments]);

  const preservedCountsByUser = useMemo(
    () => countPreservedAssignmentsByUser(selectedCampaignAssignments),
    [selectedCampaignAssignments]
  );

  const assignmentsByUserId = useMemo(() => {
    const map = new Map();

    selectedCampaignAssignments.forEach((assignment) => {
      const userId = assignment.assignedUserId;
      if (!userId) return;

      if (!map.has(userId)) {
        map.set(userId, []);
      }

      map.get(userId).push(assignment);
    });

    map.forEach((assignments, userId) => {
      map.set(userId, sortParticipantAssignments(assignments));
    });

    return map;
  }, [selectedCampaignAssignments]);

  const participantMapAssignments = useMemo(() => {
    if (!participantMapState.userId) return [];
    return assignmentsByUserId.get(participantMapState.userId) || [];
  }, [assignmentsByUserId, participantMapState.userId]);

  const handleOpenPublisherTerritoryMap = useCallback((assignments, territoryName) => {
    const territoryId = assignments[0]?.territoryId
      || assignments[0]?.addressSnapshot?.territoryId
      || 'sin-territorio';
    setPublisherMapState({ isOpen: true, territoryId, territoryName });
  }, []);

  const handleClosePublisherMap = useCallback(() => {
    setPublisherMapState({ isOpen: false, territoryId: null, territoryName: '' });
  }, []);

  const handleOpenParticipantMap = useCallback((userId, userName) => {
    setParticipantMapState({ isOpen: true, userId, userName });
  }, []);

  const handleCloseParticipantMap = useCallback(() => {
    setParticipantMapState({ isOpen: false, userId: null, userName: '' });
  }, []);

  const handleOpenCampaignMap = useCallback(() => {
    setParticipantMapState({ isOpen: false, userId: null, userName: '' });
    setIsCampaignMapOpen(true);
  }, []);

  const handleCloseCampaignMap = useCallback(() => {
    setIsCampaignMapOpen(false);
  }, []);

  const step3DistributionParticipants = useMemo(() => (
    selectedCampaignParticipants
      .map((participant) => {
        const summary = participantSummary.find((entry) => entry.userId === participant.userId);
        return {
          userId: participant.userId,
          userNameSnapshot: participant.userNameSnapshot,
          total: summary?.total || 0,
          pending: summary?.pending || 0,
          inProgress: summary?.inProgress || 0,
          completed: summary?.completed || 0
        };
      })
      .sort((a, b) => a.userNameSnapshot.localeCompare(b.userNameSnapshot, 'es'))
  ), [participantSummary, selectedCampaignParticipants]);

  const distributionControlParticipants = useMemo(
    () => step3DistributionParticipants,
    [step3DistributionParticipants]
  );

  const participantsWithAssignmentsCount = useMemo(
    () => step3DistributionParticipants.filter((participant) => participant.total > 0).length,
    [step3DistributionParticipants]
  );

  const step3UnassignedParticipants = useMemo(
    () => step3DistributionParticipants.filter(
      (participant) => (Number(distributionTargets[participant.userId]) || 0) === 0
    ),
    [step3DistributionParticipants, distributionTargets]
  );

  const step3UnassignedCount = step3UnassignedParticipants.length;

  const isDistributionParticipantPioneer = (participant) => (
    isPioneerUser(usersById[participant.userId]) || isPioneerName(participant.userNameSnapshot)
  );

  const step3PioneerDistributionCount = useMemo(
    () => distributionControlParticipants.filter(isDistributionParticipantPioneer).length,
    [distributionControlParticipants, usersById]
  );

  const step3DistributionFilterOptions = useMemo(() => {
    const options = [
      { id: 'all', label: 'Todos', count: distributionControlParticipants.length },
      { id: 'pioneers', label: 'Precursores', count: step3PioneerDistributionCount }
    ];

    if (step3UnassignedCount > 0) {
      options.push({ id: 'unassigned', label: 'Sin reparto', count: step3UnassignedCount });
    }

    return options;
  }, [distributionControlParticipants.length, step3PioneerDistributionCount, step3UnassignedCount]);

  const step3FilteredDistributionParticipants = useMemo(() => {
    if (step3DistributionFilter === 'pioneers') {
      return distributionControlParticipants.filter(isDistributionParticipantPioneer);
    }
    if (step3DistributionFilter === 'unassigned') {
      return step3UnassignedParticipants;
    }
    return distributionControlParticipants;
  }, [
    distributionControlParticipants,
    step3UnassignedParticipants,
    step3DistributionFilter,
    usersById
  ]);

  useEffect(() => {
    if (step3DistributionFilter === 'unassigned' && step3UnassignedCount === 0) {
      setStep3DistributionFilter('all');
    }
  }, [step3DistributionFilter, step3UnassignedCount]);

  const step3DistributionHeaderCount = useMemo(() => {
    if (step3DistributionFilter === 'unassigned') {
      return step3UnassignedCount;
    }

    if (step3DistributionFilter === 'pioneers') {
      return step3FilteredDistributionParticipants.length;
    }

    return distributionControlParticipants.length;
  }, [
    step3DistributionFilter,
    step3UnassignedCount,
    step3FilteredDistributionParticipants.length,
    distributionControlParticipants.length
  ]);

  const isDistributionParticipantPioneerCallback = useCallback(
    (participant) => (
      isPioneerUser(usersById[participant.userId]) || isPioneerName(participant.userNameSnapshot)
    ),
    [usersById]
  );

  const handleCopyDistributionList = useCallback(async () => {
    const text = formatCampaignDistributionWhatsAppText({
      participants: step3DistributionParticipants,
      distributionTargets,
      isPioneer: isDistributionParticipantPioneerCallback
    });

    if (!text) {
      showToast('No hay reparto para copiar', 'error');
      return;
    }

    try {
      const copied = await copiarAlPortapapeles(text);
      setDistributionCopyFeedback(true);
      showToast(
        copied
          ? 'Reparto copiado para WhatsApp'
          : 'Revisa el texto en el diálogo para copiar manualmente',
        copied ? 'success' : 'info'
      );

      if (distributionCopyTimeoutRef.current) {
        clearTimeout(distributionCopyTimeoutRef.current);
      }
      distributionCopyTimeoutRef.current = setTimeout(() => {
        setDistributionCopyFeedback(false);
      }, 2200);
    } catch (error) {
      console.error('Error copiando reparto:', error);
      showToast('No se pudo copiar el reparto', 'error');
    }
  }, [
    distributionTargets,
    isDistributionParticipantPioneerCallback,
    showToast,
    step3DistributionParticipants
  ]);

  useEffect(() => () => {
    if (distributionCopyTimeoutRef.current) {
      clearTimeout(distributionCopyTimeoutRef.current);
    }
  }, []);

  const totalDistributionAddresses = useMemo(() => {
    if (selectedCampaign) {
      return getCampaignCandidateAddresses({
        campaign: selectedCampaign,
        addresses,
        territoryMap
      }).length;
    }

    return allTerritoryAddresses.length;
  }, [addresses, allTerritoryAddresses.length, selectedCampaign, territoryMap]);

  const distributionAssignmentFingerprint = useMemo(
    () => buildDistributionAssignmentFingerprint(selectedCampaignAssignments),
    [selectedCampaignAssignments]
  );
  const persistedDistributionDraftFingerprint = useMemo(
    () => buildDistributionTargetFingerprint(selectedCampaign?.distributionTargetsDraft || {}),
    [selectedCampaign?.distributionTargetsDraft]
  );

  const campaignAddressDrift = useMemo(
    () => getCampaignAddressDrift(selectedCampaignAssignments, allTerritoryAddresses),
    [selectedCampaignAssignments, allTerritoryAddresses]
  );

  const campaignRequiresRegenerate = campaignAddressDrift.hasNewAddresses
    || campaignAddressDrift.hasStaleAssignments;

  const distributionConfiguredTotal = useMemo(
    () => Object.values(distributionTargets).reduce((sum, count) => sum + (Number(count) || 0), 0),
    [distributionTargets]
  );

  const distributionBalanceDiff = totalDistributionAddresses - distributionConfiguredTotal;
  const distributionIsBalanced = distributionBalanceDiff === 0;

  const personalCampaign = activeCampaign;

  const personalAssignments = useMemo(() => {
    if (!currentUser?.id || !personalCampaign) return [];

    return campaignAssignments
      .filter((assignment) => (
        assignment.campaignId === personalCampaign.id && assignment.assignedUserId === currentUser.id
      ))
      .sort((a, b) => {
        const territoryA = a.addressSnapshot?.territoryName || '';
        const territoryB = b.addressSnapshot?.territoryName || '';
        const territoryDiff = territoryA.localeCompare(territoryB, 'es', { numeric: true });
        if (territoryDiff !== 0) return territoryDiff;
        return getDisplayAddress(a.addressSnapshot, '').localeCompare(getDisplayAddress(b.addressSnapshot, ''), 'es', { numeric: true });
      });
  }, [campaignAssignments, currentUser?.id, personalCampaign]);

  const personalPendingAssignmentsCount = useMemo(
    () => personalAssignments.filter((assignment) => assignment.status !== CAMPAIGN_PROGRESS_STATUSES.COMPLETED).length,
    [personalAssignments]
  );

  const filteredPublisherAssignments = useMemo(
    () => personalAssignments.filter((assignment) => getPublisherAssignmentStatus(assignment) === publisherFilter),
    [personalAssignments, publisherFilter]
  );

  const groupedPublisherAssignments = useMemo(
    () => groupAssignmentsByTerritory(filteredPublisherAssignments),
    [filteredPublisherAssignments]
  );

  const publisherMapAssignments = useMemo(() => {
    if (!publisherMapState.isOpen || !publisherMapState.territoryId) return [];

    return personalAssignments.filter((assignment) => {
      const territoryId = assignment.territoryId || assignment.addressSnapshot?.territoryId || 'sin-territorio';
      return territoryId === publisherMapState.territoryId;
    });
  }, [personalAssignments, publisherMapState.isOpen, publisherMapState.territoryId]);

  const completedAssignmentsCount = selectedCampaignAssignments.filter(
    (assignment) => assignment.status === CAMPAIGN_PROGRESS_STATUSES.COMPLETED
  ).length;
  const pendingAssignmentsCount = selectedCampaignAssignments.filter(
    (assignment) => assignment.status === CAMPAIGN_PROGRESS_STATUSES.PENDING
  ).length;
  const inProgressAssignmentsCount = selectedCampaignAssignments.filter(
    (assignment) => assignment.status === CAMPAIGN_PROGRESS_STATUSES.IN_PROGRESS
  ).length;
  const enabledParticipantsCount = participantsDraft
    .map(resolveCampaignAssignment)
    .filter((participant) => participant.isEnabled !== false).length;
  const progressPercent = selectedCampaignAssignments.length > 0
    ? Math.round((completedAssignmentsCount / selectedCampaignAssignments.length) * 100)
    : 0;

  const hubProgressByParticipant = useMemo(() => (
    participantSummary
      .filter((participant) => participant.total > 0)
      .map((participant) => ({
        ...participant,
        incomplete: participant.pending + participant.inProgress
      }))
      .sort((a, b) => {
        if (b.incomplete !== a.incomplete) return b.incomplete - a.incomplete;
        if (b.pending !== a.pending) return b.pending - a.pending;
        return (a.userNameSnapshot || '').localeCompare(b.userNameSnapshot || '', 'es');
      })
  ), [participantSummary]);

  const hubProgressByTerritory = useMemo(() => (
    groupAssignmentsByTerritory(selectedCampaignAssignments)
      .map((group) => {
        const pending = group.assignments.filter(
          (assignment) => assignment.status === CAMPAIGN_PROGRESS_STATUSES.PENDING
        ).length;
        const inProgress = group.assignments.filter(
          (assignment) => assignment.status === CAMPAIGN_PROGRESS_STATUSES.IN_PROGRESS
        ).length;
        const completed = group.assignments.filter(
          (assignment) => assignment.status === CAMPAIGN_PROGRESS_STATUSES.COMPLETED
        ).length;

        return {
          territoryId: group.territoryId,
          territoryName: group.territoryName,
          total: group.assignments.length,
          pending,
          inProgress,
          completed,
          incomplete: pending + inProgress
        };
      })
      .sort((a, b) => (
        (a.territoryName || '').localeCompare(b.territoryName || '', 'es', { numeric: true })
      ))
  ), [selectedCampaignAssignments]);

  const hubPendingAddressesByTerritory = useMemo(() => {
    const pendingAssignments = selectedCampaignAssignments.filter((assignment) => (
      assignment.status === CAMPAIGN_PROGRESS_STATUSES.PENDING
      || assignment.status === CAMPAIGN_PROGRESS_STATUSES.IN_PROGRESS
    ));

    return groupAssignmentsByTerritory(pendingAssignments).map((group) => ({
      ...group,
      assignments: [...group.assignments].sort((a, b) => (
        getDisplayAddress(a.addressSnapshot, '').localeCompare(
          getDisplayAddress(b.addressSnapshot, ''),
          'es',
          { numeric: true }
        )
      ))
    }));
  }, [selectedCampaignAssignments]);

  const participantsReady = enabledParticipantsCount > 0;
  const assignmentsGenerated = selectedCampaignAssignments.length > 0;
  const campaignIsActive = selectedCampaign?.status === CAMPAIGN_STATUSES.ACTIVE;
  const hasActiveCampaign = Boolean(activeCampaign);
  const shouldHideSetupSteps = hasActiveCampaign;

  const hasSavedParticipants = useMemo(
    () => selectedCampaignId && campaignParticipants.some((p) => p.campaignId === selectedCampaignId),
    [campaignParticipants, selectedCampaignId]
  );

  const suggestedStep = useMemo(() => {
    if (!selectedCampaignId) return 1;
    if (assignmentsGenerated) return 3;
    if (hasSavedParticipants) return 3;
    if (selectedCampaign) return 2;
    return 1;
  }, [assignmentsGenerated, hasSavedParticipants, selectedCampaign, selectedCampaignId]);

  const step1Complete = Boolean(selectedCampaignId && campaignForm.name.trim());
  const step2Complete = hasSavedParticipants && enabledParticipantsCount > 0;
  const step3Complete = assignmentsGenerated;

  const step1Summary = selectedCampaign
    ? `${selectedCampaign.name} · ${formatCampaignSchedule(selectedCampaign)}`
    : 'Nueva campaña sin guardar';
  const step2Summary = `${enabledParticipantsCount} activos · ${allTerritoryAddresses.length} direcciones`;
  const step2Subtitle = `${enabledParticipantsCount} activos · ${allTerritoryAddresses.length} direcciones a repartir`;
  const step3Summary = assignmentsGenerated
    ? campaignAddressDrift.hasNewAddresses
      ? `${selectedCampaignAssignments.length} repartidas · +${campaignAddressDrift.newCount} nueva${campaignAddressDrift.newCount === 1 ? '' : 's'}`
      : `${selectedCampaignAssignments.length} repartidas · ${completedAssignmentsCount} completadas`
    : participantsReady
      ? 'Listo para generar reparto'
      : 'Configura participantes primero';

  const adminHeaderSubtitle = useMemo(() => {
    if (!selectedCampaign) {
      return 'Sin campaña activa';
    }

    return selectedCampaign.name || 'Campaña sin nombre';
  }, [selectedCampaign]);

  useEffect(() => {
    distributionTargetsRef.current = distributionTargets;
  }, [distributionTargets]);

  useEffect(() => {
    if (!selectedCampaign?.id) {
      setDistributionTargets({});
      distributionHydratedCampaignRef.current = null;
      distributionApplyLockRef.current = null;
      return;
    }

    if (!assignmentsGenerated) {
      setDistributionTargets({});
      distributionHydratedCampaignRef.current = null;
      distributionApplyLockRef.current = null;
      return;
    }

    const expectedAppliedFingerprint = distributionApplyLockRef.current;
    if (expectedAppliedFingerprint) {
      if (distributionAssignmentFingerprint !== expectedAppliedFingerprint) {
        return;
      }

      distributionApplyLockRef.current = null;
      distributionSkipSaveRef.current = true;
      setDistributionTargets(buildDistributionTargetsFromAssignments(
        selectedCampaignAssignments,
        selectedCampaignParticipants
      ));
      return;
    }

    const hydrationKey = [
      selectedCampaign.id,
      totalDistributionAddresses,
      selectedCampaignAssignments.length,
      distributionAssignmentFingerprint,
      persistedDistributionDraftFingerprint
    ].join(':');

    if (distributionHydratedCampaignRef.current === hydrationKey) {
      return;
    }

    const localDraft = loadDistributionDraft(selectedCampaign.id);
    const resolved = resolveDistributionTargets({
      firestoreDraft: selectedCampaign.distributionTargetsDraft,
      firestoreDraftMeta: selectedCampaign.distributionTargetsDraftMeta,
      localDraft,
      assignments: selectedCampaignAssignments,
      participants: selectedCampaignParticipants,
      preservedCountsByUser,
      addressCount: totalDistributionAddresses
    });

    distributionSkipSaveRef.current = true;
    setDistributionTargets(resolved);
    distributionHydratedCampaignRef.current = hydrationKey;
  }, [
    assignmentsGenerated,
    distributionAssignmentFingerprint,
    persistedDistributionDraftFingerprint,
    preservedCountsByUser,
    selectedCampaign?.distributionTargetsDraft,
    selectedCampaign?.distributionTargetsDraftMeta,
    selectedCampaign?.id,
    selectedCampaignAssignments,
    selectedCampaignParticipants,
    totalDistributionAddresses
  ]);

  useEffect(() => {
    if (distributionSkipSaveRef.current) {
      distributionSkipSaveRef.current = false;
      return undefined;
    }

    if (!selectedCampaign?.id || isReadOnlyCampaign || !assignmentsGenerated) {
      return undefined;
    }

    if (!distributionHydratedCampaignRef.current) {
      return undefined;
    }

    const campaignId = selectedCampaign.id;
    const meta = {
      addressCount: totalDistributionAddresses,
      updatedAt: new Date().toISOString()
    };

    saveDistributionDraft(campaignId, distributionTargets, meta);

    if (distributionSaveTimeoutRef.current) {
      clearTimeout(distributionSaveTimeoutRef.current);
    }

    distributionSaveTimeoutRef.current = setTimeout(() => {
      distributionSaveTimeoutRef.current = null;
      const savePromise = handleSaveDistributionTargetsDraft(campaignId, distributionTargets, meta).catch((error) => {
        console.error('Error guardando borrador de reparto:', error);
      });
      distributionSavePromisesRef.current.add(savePromise);
      savePromise.then(() => {
        distributionSavePromisesRef.current.delete(savePromise);
      });
    }, 500);

    return () => {
      if (distributionSaveTimeoutRef.current) {
        clearTimeout(distributionSaveTimeoutRef.current);
      }
    };
  }, [
    assignmentsGenerated,
    distributionTargets,
    handleSaveDistributionTargetsDraft,
    isReadOnlyCampaign,
    selectedCampaign?.id,
    totalDistributionAddresses
  ]);

  useEffect(() => {
    const flushDistributionDraft = () => {
      if (!selectedCampaign?.id || isReadOnlyCampaign || !assignmentsGenerated) return;
      if (distributionSkipSaveRef.current) return;

      const campaignId = selectedCampaign.id;
      const targets = distributionTargetsRef.current;
      const meta = {
        addressCount: totalDistributionAddresses,
        updatedAt: new Date().toISOString()
      };

      saveDistributionDraft(campaignId, targets, meta);
      handleSaveDistributionTargetsDraft(campaignId, targets, meta).catch((error) => {
        console.error('Error guardando borrador de reparto al salir:', error);
      });
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        flushDistributionDraft();
      }
    };

    window.addEventListener('pagehide', flushDistributionDraft);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('pagehide', flushDistributionDraft);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [
    assignmentsGenerated,
    handleSaveDistributionTargetsDraft,
    isReadOnlyCampaign,
    selectedCampaign?.id,
    totalDistributionAddresses
  ]);

  useEffect(() => {
    setPublisherFilter(CAMPAIGN_PROGRESS_STATUSES.IN_PROGRESS);
    setPublisherMapState({ isOpen: false, assignments: [], territoryName: '' });
  }, [personalCampaign?.id]);

  const updateParticipantDraft = (userId, key, value) => {
    setParticipantsDraft((previous) => previous.map((participant) => (
      participant.userId === userId
        ? { ...participant, [key]: value }
        : participant
    )));
  };

  const applyParticipantMode = (userId, mode) => {
    setParticipantsDraft((previous) => previous.map((participant) => {
      if (participant.userId !== userId) return participant;

      if (mode === 'excluded') {
        return { ...participant, isEnabled: false };
      }

      const updated = { ...participant, isEnabled: true, capacityWeight: 1 };

      if (['1', '2', '3', '4'].includes(mode)) {
        return { ...updated, hardLimit: Number(mode) };
      }

      return participant;
    }));
  };

  const persistAdminDraft = async () => {
    let campaignId = selectedCampaignId;
    const addressCountSnapshot = getEligibleCampaignAddresses(addresses, {
      territoryIds: allTerritoryIds
    }).length;
    const draftPayload = {
      ...campaignForm,
      excludedAddressIds: [],
      sourceTerritoryIds: allTerritoryIds,
      addressCountSnapshot
    };

    if (campaignId) {
      await handleUpdateCampaign(campaignId, draftPayload);
    } else {
      campaignId = await handleCreateCampaign(draftPayload);
      setSelectedCampaignId(campaignId);
    }

    await handleSaveCampaignStructure(campaignId, {
      participants: participantsDraft.map(resolveCampaignAssignment)
    });

    return campaignId;
  };

  const finishPendingDistributionDraftSave = async () => {
    if (distributionSaveTimeoutRef.current) {
      clearTimeout(distributionSaveTimeoutRef.current);
      distributionSaveTimeoutRef.current = null;
    }

    if (distributionSavePromisesRef.current.size > 0) {
      await Promise.all([...distributionSavePromisesRef.current]);
    }
  };

  const handleSaveAndReturnToHub = async () => {
    setIsBusy(true);
    try {
      await persistAdminDraft();
      setAdminScreen('hub');
    } catch (error) {
      console.error('Error guardando campaña:', error);
      showToast(error.message || 'No se pudo guardar la campaña.', 'error');
    } finally {
      setIsBusy(false);
    }
  };

  const handleSaveAndGoToStep2 = async () => {
    setIsBusy(true);
    try {
      await persistAdminDraft();
      setAdminScreen('step2');
    } catch (error) {
      console.error('Error guardando campaña:', error);
      showToast(error.message || 'No se pudo guardar la campaña.', 'error');
    } finally {
      setIsBusy(false);
    }
  };

  const executeAdminAction = async (action) => {
    if (['generate', 'complete', 'archive', 'finalize', 'delete'].includes(action)) {
      clearReassignmentUndo();
    }

    setIsBusy(true);
    try {
      if (action === 'save') {
        await persistAdminDraft();
      }

      if (action === 'generate') {
        await finishPendingDistributionDraftSave();
        const campaignId = await persistAdminDraft();
        const result = await handleGenerateCampaignAssignments(campaignId, { preferLatest: true });
        const regeneratedTargets = result?.distributionTargets || {};
        clearDistributionDraft(campaignId);
        distributionHydratedCampaignRef.current = null;
        distributionSkipSaveRef.current = true;
        distributionApplyLockRef.current = buildDistributionTargetFingerprint(regeneratedTargets);
        setDistributionTargets(regeneratedTargets);
      }

      if (action === 'activate') {
        const campaignId = await persistAdminDraft();
        await handleActivateCampaign(campaignId, { preferLatest: true });
      }

      if (action === 'complete' && selectedCampaign) {
        await handleCompleteCampaign(selectedCampaign.id);
        setSelectedCampaignId(null);
        setIsCreatingNewCampaign(true);
        setAdminScreen('hub');
        setHistoryCampaignId(null);
      }

      if (action === 'finalize' && selectedCampaign) {
        await handleFinalizeAndArchiveCampaign(selectedCampaign.id);
        setSelectedCampaignId(null);
        setIsCreatingNewCampaign(true);
        setAdminScreen('hub');
        setHistoryCampaignId(null);
      }

      if (action === 'archive' && selectedCampaign) {
        await handleArchiveCampaign(selectedCampaign.id);
        setSelectedCampaignId(null);
        setIsCreatingNewCampaign(true);
        setAdminScreen('hub');
        setHistoryCampaignId(null);
      }

      if (action === 'delete' && campaignPendingDelete) {
        const deletedCampaignId = campaignPendingDelete.id;
        await handleDeleteCampaign(deletedCampaignId);
        if (selectedCampaignId === deletedCampaignId) {
          setSelectedCampaignId(null);
        }
        setCampaignPendingDelete(null);
      }
    } catch (error) {
      console.error('Error en acci\u00f3n de campa\u00f1a:', error);
      showToast(error.message || 'Ocurri\u00f3 un error al procesar la campa\u00f1a.', 'error');
    } finally {
      setIsBusy(false);
      setConfirmAction(null);
    }
  };

  const handlePublisherStatusChange = async (assignmentId, status) => {
    setIsBusy(true);
    try {
      await handleUpdateCampaignAssignmentStatus(assignmentId, status);
    } catch (error) {
      const message = error?.code === 'resource-exhausted'
        ? 'Firebase alcanzó el límite de uso. Espera unos minutos e intenta de nuevo.'
        : (error?.message || 'No se pudo actualizar el avance.');
      console.error('Error actualizando estado de campa\u00f1a:', error);
      showToast(message, 'error');
      throw error;
    } finally {
      setIsBusy(false);
    }
  };

  const handleAdminCompleteAssignment = async (assignment) => {
    if (!assignment || assignment.status === CAMPAIGN_PROGRESS_STATUSES.COMPLETED) return;

    setIsBusy(true);
    try {
      await handleUpdateCampaignAssignmentStatus(
        assignment.id,
        CAMPAIGN_PROGRESS_STATUSES.COMPLETED
      );
      showToast('Dirección marcada como completada.', 'success');
    } catch (error) {
      const message = error?.code === 'resource-exhausted'
        ? 'Firebase alcanzó el límite de uso. Espera unos minutos e intenta de nuevo.'
        : (error?.message || 'No se pudo completar la dirección.');
      console.error('Error completando dirección desde administración:', error);
      showToast(message, 'error');
    } finally {
      setIsBusy(false);
    }
  };

  const handleOpenAssignmentReassignment = useCallback((assignment) => {
    if (!assignment || assignment.status === CAMPAIGN_PROGRESS_STATUSES.COMPLETED) return;

    const sourceParticipant = selectedCampaignParticipants.find(
      (participant) => participant.userId === assignment.assignedUserId
    );
    setReassignmentRequest({
      mode: 'single',
      campaignId: assignment.campaignId,
      assignmentId: assignment.id,
      assignment,
      expectedStatus: assignment.status,
      count: 1,
      sourceUserId: assignment.assignedUserId,
      sourceUserName: sourceParticipant?.userNameSnapshot || assignment.assignedUserName || 'Participante'
    });
  }, [selectedCampaignParticipants]);

  const handleOpenBulkReassignment = useCallback((participant) => {
    if (!participant || !selectedCampaign?.id) return;
    const pendingAssignments = (assignmentsByUserId.get(participant.userId) || []).filter(
      (assignment) => assignment.status === CAMPAIGN_PROGRESS_STATUSES.PENDING
    );
    const pendingCount = pendingAssignments.length;
    if (pendingCount === 0) {
      showToast('Esta persona ya no tiene direcciones pendientes.', 'info');
      return;
    }

    setReassignmentRequest({
      mode: 'all_pending',
      campaignId: selectedCampaign.id,
      assignments: pendingAssignments,
      count: pendingCount,
      sourceUserId: participant.userId,
      sourceUserName: participant.userNameSnapshot
    });
  }, [assignmentsByUserId, selectedCampaign?.id, showToast]);

  const handleUndoReassignment = useCallback(async (undoToken) => {
    const requestedAt = Date.now();
    const activeUndo = reassignmentUndoRef.current;
    if (!activeUndo || activeUndo.operationId !== undoToken?.operationId) {
      showToast('Solo se puede deshacer la reasignación más reciente.', 'info');
      return;
    }
    if (requestedAt >= undoToken.expiresAt) {
      clearReassignmentUndo();
      showToast('El tiempo para deshacer esta reasignación terminó.', 'info');
      return;
    }

    clearReassignmentUndo(false);
    setIsBusy(true);

    try {
      const result = await handleUndoCampaignReassignment(undoToken, requestedAt);
      const restoredById = new Map(
        result.restoredAssignments.map((assignment) => [assignment.id, assignment])
      );
      const nextAssignments = selectedCampaignAssignmentsRef.current.map((assignment) => (
        restoredById.has(assignment.id)
          ? { ...assignment, ...restoredById.get(assignment.id) }
          : assignment
      ));

      clearDistributionDraft(undoToken.campaignId);
      distributionHydratedCampaignRef.current = null;
      distributionSkipSaveRef.current = true;
      setDistributionTargets(buildDistributionTargetsFromAssignments(
        nextAssignments,
        selectedCampaignParticipantsRef.current
      ));

      showToast(
        result.restoredCount === 1
          ? 'Reasignación deshecha'
          : `${result.restoredCount} reasignaciones deshechas`,
        'success'
      );
    } catch (error) {
      console.error('Error deshaciendo reasignación:', error);
      showToast(
        error.message || 'No se pudo deshacer porque el reparto ya cambió.',
        'warning',
        5000
      );
    } finally {
      setIsBusy(false);
    }
  }, [
    clearReassignmentUndo,
    handleUndoCampaignReassignment,
    showToast
  ]);

  const handleConfirmReassignment = async (targetUserId) => {
    if (!reassignmentRequest) return;

    setIsBusy(true);
    try {
      const result = await handleReassignCampaignAssignments({
        campaignId: reassignmentRequest.campaignId,
        sourceUserId: reassignmentRequest.sourceUserId,
        targetUserId,
        mode: reassignmentRequest.mode,
        assignmentId: reassignmentRequest.assignmentId || null,
        expectedStatus: reassignmentRequest.expectedStatus || null
      });

      const movedIds = new Set(result.assignmentIds);
      const nextAssignments = selectedCampaignAssignments.map((assignment) => (
        movedIds.has(assignment.id)
          ? {
            ...assignment,
            assignedUserId: result.targetUserId,
            status: assignment.status === CAMPAIGN_PROGRESS_STATUSES.IN_PROGRESS
              ? CAMPAIGN_PROGRESS_STATUSES.PENDING
              : assignment.status,
            manualLocked: true
          }
          : assignment
      ));

      clearDistributionDraft(reassignmentRequest.campaignId);
      distributionHydratedCampaignRef.current = null;
      distributionSkipSaveRef.current = true;
      setDistributionTargets(buildDistributionTargetsFromAssignments(
        nextAssignments,
        selectedCampaignParticipants
      ));

      clearReassignmentUndo();
      const successMessage = result.movedCount === 1
        ? `Dirección reasignada a ${result.targetUserName}`
        : `${result.movedCount} direcciones reasignadas a ${result.targetUserName}`;
      const remainingUndoTime = Math.max(
        0,
        result.undoToken.expiresAt - Date.now()
      );

      if (remainingUndoTime > 0) {
        reassignmentUndoRef.current = {
          operationId: result.undoToken.operationId,
          campaignId: result.undoToken.campaignId,
          toastId: null
        };

        const toastId = showToast(successMessage, 'success', remainingUndoTime, {
          label: 'Deshacer',
          onClick: () => handleUndoReassignment(result.undoToken)
        });
        if (reassignmentUndoRef.current?.operationId === result.undoToken.operationId) {
          reassignmentUndoRef.current.toastId = toastId;
        }

        reassignmentUndoTimeoutRef.current = setTimeout(() => {
          if (reassignmentUndoRef.current?.operationId === result.undoToken.operationId) {
            reassignmentUndoRef.current = null;
          }
          reassignmentUndoTimeoutRef.current = null;
        }, remainingUndoTime);
      } else {
        showToast(successMessage, 'success');
      }

      setReassignmentRequest(null);
    } catch (error) {
      console.error('Error reasignando direcciones:', error);
      showToast(error.message || 'No se pudieron reasignar las direcciones.', 'error');
    } finally {
      setIsBusy(false);
    }
  };

  const handleToggleLock = async (assignmentId) => {
    setIsBusy(true);
    try {
      await handleToggleCampaignAssignmentLock(assignmentId);
    } catch (error) {
      console.error('Error bloqueando asignaci\u00f3n:', error);
      showToast(error.message || 'No se pudo cambiar el bloqueo.', 'error');
    } finally {
      setIsBusy(false);
    }
  };

  const handleResetAssignment = async (assignmentId) => {
    setIsBusy(true);
    try {
      await handleResetCampaignAssignment(assignmentId);
    } catch (error) {
      console.error('Error reseteando asignaci\u00f3n:', error);
      showToast(error.message || 'No se pudo resetear la asignaci\u00f3n.', 'error');
    } finally {
      setIsBusy(false);
    }
  };

  const adjustDistributionTarget = (userId, delta) => {
    setDistributionTargets((previous) => {
      const current = Number(previous[userId]) || 0;
      const minTarget = preservedCountsByUser[userId] || 0;
      const next = Math.max(minTarget, Math.min(totalDistributionAddresses, current + delta));

      return {
        ...previous,
        [userId]: next
      };
    });
  };

  const setDistributionTarget = (userId, value) => {
    const parsed = Math.max(0, Number.parseInt(String(value), 10) || 0);
    const minTarget = preservedCountsByUser[userId] || 0;

    setDistributionTargets((previous) => ({
      ...previous,
      [userId]: Math.max(minTarget, Math.min(totalDistributionAddresses, parsed))
    }));
  };

  const useConfiguredDistributionTargets = () => {
    if (participantTargetsPreview.error) {
      showToast(participantTargetsPreview.error, 'error');
      return;
    }

    const configuredTargets = step3DistributionParticipants.reduce((targets, participant) => {
      const configuredCount = Number(participantTargetsPreview.byUserId[participant.userId]) || 0;
      const minimumCount = preservedCountsByUser[participant.userId] || 0;
      targets[participant.userId] = Math.max(configuredCount, minimumCount);
      return targets;
    }, {});

    setDistributionTargets(configuredTargets);
  };

  const handleApplyDistribution = async () => {
    if (!selectedCampaign?.id || !distributionIsBalanced) return;

    const appliedTargets = { ...distributionTargetsRef.current };

    clearReassignmentUndo();
    setIsBusy(true);
    try {
      await finishPendingDistributionDraftSave();
      await handleRedistributeCampaignAssignments(
        selectedCampaign.id,
        appliedTargets,
        { preferLatest: true }
      );
      clearDistributionDraft(selectedCampaign.id);
      distributionSkipSaveRef.current = true;
      setDistributionTargets(appliedTargets);
      distributionApplyLockRef.current = buildDistributionTargetFingerprint(appliedTargets);
    } catch (error) {
      console.error('Error actualizando reparto:', error);
      showToast(error.message || 'No se pudo actualizar el reparto.', 'error');
    } finally {
      setIsBusy(false);
    }
  };

  const renderSelectableCampaignCard = (campaign) => {
    const isSelected = campaign.id === selectedCampaignId;
    const assignmentCount = campaignAssignments.filter((assignment) => assignment.campaignId === campaign.id).length;
    const liveAddressCount = getEligibleCampaignAddresses(addresses, {
      territoryIds: allTerritoryIds
    }).length;
    const addressCount = assignmentCount > 0
      ? assignmentCount
      : Math.max(liveAddressCount, campaign.addressCountSnapshot || 0);

    return (
      <div
        key={campaign.id}
        className={`rounded-3xl border p-4 transition-all ${
          isSelected
            ? 'border-slate-800 bg-slate-800 text-white shadow-lg'
            : 'border-gray-200 bg-white hover:border-slate-400 hover:shadow-sm'
        }`}
      >
        <div className="flex items-start justify-between gap-3">
          <button
            type="button"
            onClick={() => setSelectedCampaignId(campaign.id)}
            className="min-w-0 flex-1 text-left"
          >
            <p className={`text-xs font-bold uppercase tracking-wide ${isSelected ? 'text-slate-200' : 'text-gray-500'}`}>
              {formatCampaignTypeLabel(campaign.type)}
            </p>
            <h3 className="text-lg font-bold mt-1">{campaign.name}</h3>
            <p className={`text-sm mt-1 ${isSelected ? 'text-slate-200' : 'text-gray-500'}`}>
              {formatCampaignSchedule(campaign)}
            </p>
            <p className={`text-sm mt-3 ${isSelected ? 'text-slate-100' : 'text-gray-600'}`}>
              Territorios: {allTerritoryIds.length} · Direcciones: {addressCount}
            </p>
          </button>
          {campaign.status === CAMPAIGN_STATUSES.DRAFT ? (
            <button
              type="button"
              onClick={() => {
                setCampaignPendingDelete(campaign);
                setConfirmAction('delete');
              }}
              disabled={isBusy}
              aria-label={`Eliminar campaña ${campaign.name}`}
              className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border transition-colors disabled:opacity-60 ${
                isSelected
                  ? 'border-slate-600 bg-slate-700 text-slate-100 hover:bg-red-600 hover:border-red-500'
                  : 'border-gray-200 bg-white text-gray-500 hover:border-red-200 hover:bg-red-50 hover:text-red-600'
              }`}
            >
              <Icon name="trash" size={16} />
            </button>
          ) : null}
        </div>
      </div>
    );
  };

  const renderStep3PrimaryCta = () => {
    if (campaignIsActive) return null;
    if (assignmentsGenerated) {
      return (
        <button
          type="button"
          onClick={() => setConfirmAction('activate')}
          disabled={isBusy || isReadOnlyCampaign}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-6 py-3.5 text-base font-bold text-white shadow-sm transition-colors hover:bg-emerald-700 disabled:opacity-60"
        >
          <Icon name="zap" size={18} />
          {'Activar campa\u00f1a'}
        </button>
      );
    }
    if (!assignmentsGenerated && participantsReady) {
      return (
        <button
          type="button"
          onClick={() => executeAdminAction('generate')}
          disabled={isBusy || isReadOnlyCampaign}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-6 py-3.5 text-base font-bold text-white shadow-sm transition-colors hover:bg-indigo-700 disabled:opacity-60"
        >
          <Icon name="shuffle" size={18} />
          {'Generar asignaci\u00f3n autom\u00e1tica'}
        </button>
      );
    }
    return (
      <button
        type="button"
        onClick={() => executeAdminAction('save')}
        disabled={isBusy || isReadOnlyCampaign}
        className="flex w-full items-center justify-center rounded-2xl bg-slate-800 px-6 py-3.5 text-base font-bold text-white shadow-sm transition-colors hover:bg-slate-900 disabled:opacity-60"
      >
        {'Guardar campa\u00f1a'}
      </button>
    );
  };

  if (campaignsLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="text-center">
          <div className="w-14 h-14 rounded-2xl bg-slate-800 text-white flex items-center justify-center mx-auto mb-4 animate-pulse">
            <Icon name="mail" size={24} />
          </div>
              <p className="text-sm font-medium text-slate-700">{'Cargando campa\u00f1as e invitaciones...'}</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="shadow-xl px-4 py-3 flex-shrink-0" style={{ backgroundColor: '#2C3E50' }}>
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 flex-1 items-center gap-3">
              <button
                onClick={onBack}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10 backdrop-blur-sm transition-all hover:bg-white/20"
                aria-label="Volver"
              >
                <Icon name="arrowLeft" size={18} className="text-white" />
              </button>
              <div className="min-w-0">
                <h1 className="truncate text-lg font-bold text-white">Direcciones por visitar</h1>
                <p className="truncate text-xs text-white/70">
                  {activeCampaign ? `${activeCampaign.name} - ${formatCampaignSchedule(activeCampaign)}` : 'Sin campa\u00f1a activa'}
                </p>
              </div>
            </div>
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10">
              <Icon name="mail" size={18} className="text-white" />
            </div>
          </div>
        </div>

        <div className="max-w-3xl mx-auto p-4 space-y-4">
          <PublisherAssignmentsSection
            activeCampaign={personalCampaign}
            assignments={personalAssignments}
            groupedAssignments={groupedPublisherAssignments}
            onStatusChange={handlePublisherStatusChange}
            isProcessing={isBusy}
            publisherFilter={publisherFilter}
            onFilterChange={setPublisherFilter}
            filterOptions={PUBLISHER_FILTER_OPTIONS}
            statusResolver={getPublisherAssignmentStatus}
            onOpenTerritoryMap={handleOpenPublisherTerritoryMap}
          />
        </div>

        <LazyCampaignAssignmentsMapModal
          isOpen={publisherMapState.isOpen}
          onClose={handleClosePublisherMap}
          campaign={personalCampaign}
          assignments={publisherMapAssignments}
          onStatusChange={handlePublisherStatusChange}
          isProcessing={isBusy}
          participantName={publisherMapState.territoryName}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="shadow-xl px-4 py-3 flex-shrink-0" style={{ backgroundColor: '#2C3E50' }}>
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <button
              onClick={onBack}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10 backdrop-blur-sm transition-all hover:bg-white/20"
              aria-label="Volver"
            >
              <Icon name="arrowLeft" size={18} className="text-white" />
            </button>
            <div className="min-w-0">
              <h1 className="truncate text-lg font-bold text-white">{'Campa\u00f1as e Invitaciones'}</h1>
              <p className="truncate text-xs text-white/70">{adminHeaderSubtitle}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-6">
        <div
          className="mx-auto flex max-w-md rounded-2xl border border-slate-200 bg-slate-100 p-1"
          role="tablist"
          aria-label="Modo de campaña"
        >
          <button
            type="button"
            role="tab"
            aria-selected={adminViewMode === 'admin'}
            onClick={() => setAdminViewMode('admin')}
            className={`flex min-h-[44px] flex-1 items-center justify-center rounded-xl px-3 py-2.5 text-sm font-bold transition-all ${
              adminViewMode === 'admin'
                ? 'bg-slate-800 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Administrar
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={adminViewMode === 'personal'}
            onClick={() => setAdminViewMode('personal')}
            className={`flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-bold transition-all ${
              adminViewMode === 'personal'
                ? 'bg-indigo-700 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>Mis direcciones</span>
            {personalPendingAssignmentsCount > 0 && (
              <span className={`inline-flex min-w-[22px] items-center justify-center rounded-full px-1.5 py-0.5 text-xs font-bold ${
                adminViewMode === 'personal' ? 'bg-white text-indigo-700' : 'bg-indigo-100 text-indigo-700'
              }`}>
                {personalPendingAssignmentsCount}
              </span>
            )}
          </button>
        </div>

        {adminViewMode === 'personal' ? (
          <div className="max-w-3xl mx-auto">
            <PublisherAssignmentsSection
              activeCampaign={personalCampaign}
              assignments={personalAssignments}
              groupedAssignments={groupedPublisherAssignments}
              onStatusChange={handlePublisherStatusChange}
              isProcessing={isBusy}
              publisherFilter={publisherFilter}
              onFilterChange={setPublisherFilter}
              filterOptions={PUBLISHER_FILTER_OPTIONS}
              statusResolver={getPublisherAssignmentStatus}
              onOpenTerritoryMap={handleOpenPublisherTerritoryMap}
            />
          </div>
        ) : (
          <>
        {!hasActiveCampaign && (
          <button
            type="button"
            onClick={() => {
              setIsCreatingNewCampaign(true);
              setSelectedCampaignId(null);
              setHistoryCampaignId(null);
              setAdminScreen('step1');
            }}
            className="flex min-h-[48px] w-full items-center justify-center gap-2 rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-bold text-slate-800 shadow-sm transition-colors hover:border-slate-400 hover:bg-slate-50"
          >
            <Icon name="plus" size={16} />
            Nueva campaña
          </button>
        )}

        {selectedCampaign && assignmentsGenerated && (
          <section className="rounded-[30px] border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
                <Icon name="activity" size={18} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-slate-900">
                  {completedAssignmentsCount} de {selectedCampaignAssignments.length} completadas
                  <span className="ml-2 text-emerald-700">({progressPercent}%)</span>
                </p>
                <p className="text-xs text-slate-500">
                  {pendingAssignmentsCount} pendientes · {inProgressAssignmentsCount} en progreso
                </p>
              </div>
            </div>
            <div className="mt-3 h-3 w-full overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              />
            </div>

            {campaignIsActive && (
              <button
                type="button"
                onClick={() => setConfirmAction('finalize')}
                disabled={isBusy}
                className="mt-4 flex min-h-[48px] w-full items-center justify-center gap-2 rounded-2xl bg-[#2C3E50] px-4 py-3 text-sm font-bold text-white shadow-sm transition-colors hover:bg-[#243342] disabled:opacity-60"
              >
                <Icon name="checkCircle" size={16} />
                Finalizar y archivar
              </button>
            )}
            {selectedCampaign?.status === CAMPAIGN_STATUSES.COMPLETED && (
              <button
                type="button"
                onClick={() => setConfirmAction('archive')}
                disabled={isBusy}
                className="mt-4 flex min-h-[48px] w-full items-center justify-center gap-2 rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-bold text-slate-800 shadow-sm transition-colors hover:border-slate-400 hover:bg-slate-50 disabled:opacity-60"
              >
                Archivar campaña
              </button>
            )}

            <button
              type="button"
              onClick={() => setIsHubProgressDetailOpen((previous) => !previous)}
              aria-expanded={isHubProgressDetailOpen}
              className="mt-3 flex min-h-[44px] w-full items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:border-slate-300 hover:bg-slate-100"
            >
              <span>{isHubProgressDetailOpen ? 'Ocultar detalle' : 'Ver detalle del avance'}</span>
              <Icon
                name="chevronDown"
                size={16}
                className={`shrink-0 text-slate-400 transition-transform ${isHubProgressDetailOpen ? 'rotate-180' : ''}`}
              />
            </button>

            {isHubProgressDetailOpen && (
              <div className="mt-4 space-y-4 border-t border-slate-100 pt-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Icon name="users" size={14} className="text-slate-500" />
                    <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">
                      Por hermano
                    </p>
                  </div>
                  {hubProgressByParticipant.length === 0 ? (
                    <p className="rounded-2xl bg-slate-50 px-3 py-2.5 text-sm text-slate-500">
                      Aún no hay hermanos con direcciones repartidas.
                    </p>
                  ) : (
                    <ul className="space-y-2">
                      {hubProgressByParticipant.map((participant) => {
                        const isDone = participant.incomplete === 0;
                        return (
                          <li
                            key={participant.userId}
                            className="rounded-2xl border border-slate-100 bg-slate-50/80 px-3 py-2.5"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <p className="truncate text-sm font-semibold text-slate-900">
                                  {participant.userNameSnapshot}
                                </p>
                                <p className="mt-0.5 text-xs text-slate-500">
                                  {participant.pending} pend. · {participant.inProgress} en prog. · {participant.completed} hechas
                                </p>
                              </div>
                              <span
                                className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold ${
                                  isDone
                                    ? 'bg-emerald-100 text-emerald-700'
                                    : 'bg-amber-100 text-amber-700'
                                }`}
                              >
                                {isDone ? 'Listo' : `${participant.incomplete} faltan`}
                              </span>
                            </div>
                            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-white">
                              <div
                                className="h-full rounded-full bg-emerald-500"
                                style={{
                                  width: `${participant.total > 0
                                    ? Math.round((participant.completed / participant.total) * 100)
                                    : 0}%`
                                }}
                              />
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Icon name="map" size={14} className="text-slate-500" />
                    <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">
                      Por territorio
                    </p>
                  </div>
                  {hubProgressByTerritory.length === 0 ? (
                    <p className="rounded-2xl bg-slate-50 px-3 py-2.5 text-sm text-slate-500">
                      Sin territorios en el reparto.
                    </p>
                  ) : (
                    <ul className="space-y-2">
                      {hubProgressByTerritory.map((territory) => (
                        <li
                          key={territory.territoryId}
                          className="flex items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-slate-50/80 px-3 py-2.5"
                        >
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-slate-900">
                              {territory.territoryName}
                            </p>
                            <p className="mt-0.5 text-xs text-slate-500">
                              {territory.completed}/{territory.total} completadas
                              {territory.incomplete > 0
                                ? ` · ${territory.incomplete} pendientes`
                                : ''}
                            </p>
                          </div>
                          <span
                            className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold ${
                              territory.incomplete === 0
                                ? 'bg-emerald-100 text-emerald-700'
                                : 'bg-slate-200 text-slate-700'
                            }`}
                          >
                            {territory.incomplete === 0 ? '100%' : `${Math.round((territory.completed / territory.total) * 100)}%`}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                {hubPendingAddressesByTerritory.length > 0 && (
                  <div className="space-y-2">
                    <button
                      type="button"
                      onClick={() => setIsHubPendingAddressesOpen((previous) => !previous)}
                      aria-expanded={isHubPendingAddressesOpen}
                      className="flex min-h-[44px] w-full items-center justify-between gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-left transition-colors hover:border-slate-300 hover:bg-slate-100"
                    >
                      <div className="flex min-w-0 items-center gap-2">
                        <Icon name="mapPin" size={14} className="shrink-0 text-slate-500" />
                        <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">
                          Direcciones pendientes
                        </p>
                        <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-700">
                          {pendingAssignmentsCount + inProgressAssignmentsCount}
                        </span>
                      </div>
                      <Icon
                        name="chevronDown"
                        size={16}
                        className={`shrink-0 text-slate-400 transition-transform ${isHubPendingAddressesOpen ? 'rotate-180' : ''}`}
                      />
                    </button>
                    {isHubPendingAddressesOpen && (
                      <div className="space-y-3">
                        {hubPendingAddressesByTerritory.map((group) => (
                          <div key={group.territoryId} className="space-y-2">
                            <p className="px-1 text-xs font-bold text-slate-600">
                              {group.territoryName}
                            </p>
                            <ul className="space-y-2">
                              {group.assignments.map((assignment) => {
                                const progressMeta = getCampaignProgressMeta(assignment.status);
                                return (
                                  <li
                                    key={assignment.id}
                                    className="rounded-2xl border border-slate-100 bg-slate-50/80 px-3 py-2.5"
                                  >
                                    <div className="flex items-start justify-between gap-2">
                                      <div className="min-w-0">
                                        <p className="truncate text-sm font-semibold text-slate-900">
                                          {getDisplayAddress(assignment.addressSnapshot)}
                                        </p>
                                        <p className="mt-0.5 truncate text-xs text-slate-500">
                                          {assignment.assignedUserName || 'Sin asignar'}
                                        </p>
                                      </div>
                                      <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-bold ${progressMeta.badgeClass}`}>
                                        {progressMeta.label}
                                      </span>
                                    </div>
                                  </li>
                                );
                              })}
                            </ul>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => setAdminScreen('step3')}
                  className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-2xl border border-indigo-200 bg-indigo-50 px-4 py-2.5 text-sm font-bold text-indigo-700 transition-colors hover:bg-indigo-100"
                >
                  Ver en Administrar reparto
                  <Icon name="chevronRight" size={16} />
                </button>
              </div>
            )}
          </section>
        )}

        {!assignmentsGenerated && (
          <section className="rounded-[30px] border border-slate-200 bg-white p-4 shadow-sm space-y-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Progreso</p>
              <div className="mt-3">
                <CampaignStepper
                  steps={[
                    { id: 1, label: 'Datos', complete: step1Complete, current: suggestedStep === 1 },
                    { id: 2, label: 'Hermanos', complete: step2Complete, current: suggestedStep === 2 },
                    { id: 3, label: 'Reparto', complete: step3Complete, current: suggestedStep === 3 }
                  ]}
                />
              </div>
            </div>

            {!shouldHideSetupSteps && (
              <div className="space-y-3">
                <CampaignHubStepCard
                  stepNumber={1}
                  title="Crea o edita la campaña"
                  summary={step1Summary}
                  icon="calendar"
                  isComplete={step1Complete}
                  isSuggested={suggestedStep === 1}
                  onClick={() => setAdminScreen('step1')}
                />
                <CampaignHubStepCard
                  stepNumber={2}
                  title="Excluye hermanos"
                  summary={step2Summary}
                  icon="users"
                  isComplete={step2Complete}
                  isSuggested={suggestedStep === 2}
                  onClick={() => setAdminScreen('step2')}
                  disabled={!selectedCampaignId && !campaignForm.name.trim()}
                />
              </div>
            )}

            <CampaignHubStepCard
              stepNumber={3}
              title={campaignIsActive ? 'Administra el reparto' : 'Genera el reparto'}
              summary={step3Summary}
              icon="zap"
              isComplete={step3Complete && campaignIsActive}
              isSuggested={suggestedStep === 3}
              onClick={() => setAdminScreen('step3')}
            />
          </section>
        )}

        {selectedCampaign && assignmentsGenerated && (
          <section className="rounded-[30px] border border-slate-200 bg-white p-4 shadow-sm space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-700">
                <Icon name="zap" size={18} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-slate-900">Resumen del reparto</p>
                <p className="text-xs text-slate-500">
                  {pendingAssignmentsCount} pendientes · {inProgressAssignmentsCount} en progreso · {completedAssignmentsCount} completadas
                </p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-2xl bg-slate-50 px-3 py-2 text-center">
                <p className="text-lg font-bold tabular-nums text-slate-900">{selectedCampaignAssignments.length}</p>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">direcciones</p>
              </div>
              <div className="rounded-2xl bg-slate-50 px-3 py-2 text-center">
                <p className="text-lg font-bold tabular-nums text-slate-900">{participantsWithAssignmentsCount}</p>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">con reparto</p>
              </div>
              <div className="rounded-2xl bg-slate-50 px-3 py-2 text-center">
                <p className="text-lg font-bold tabular-nums text-slate-900">{distributionConfiguredTotal}/{totalDistributionAddresses}</p>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">objetivo</p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setAdminScreen('step3')}
              className="flex min-h-[48px] w-full items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-4 py-3 text-sm font-bold text-white shadow-sm transition-colors hover:bg-indigo-700"
            >
              <Icon name="zap" size={16} />
              Administrar reparto
              <Icon name="chevronRight" size={16} />
            </button>
          </section>
        )}

        {campaignHistory.length > 0 && (
          <SectionCard
            title="Historial"
            subtitle={'Campa\u00f1as cerradas para consulta posterior'}
            collapsible
            isExpanded={isHistoryExpanded}
            onToggle={() => setIsHistoryExpanded((previous) => !previous)}
            sectionId="campaign-history-list"
            summaryLabel={`${campaignHistory.length} ${campaignHistory.length === 1 ? 'campaña' : 'campañas'}`}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {campaignHistory.map((campaign) => {
                const hasFrozenSummary = Boolean(campaign.finalSummary);
                return (
                  <button
                    key={campaign.id}
                    type="button"
                    onClick={() => setHistoryCampaignId(campaign.id)}
                    className="rounded-2xl border border-gray-200 bg-white p-4 text-left transition-all hover:border-slate-400 hover:shadow-sm"
                  >
                    <p className="text-xs font-bold uppercase tracking-wide text-gray-500">{formatCampaignTypeLabel(campaign.type)}</p>
                    <h3 className="mt-1 text-base font-bold text-gray-900">{campaign.name}</h3>
                    <p className="mt-1 text-sm text-gray-500">{formatCampaignSchedule(campaign)}</p>
                    <p className="mt-3 text-xs font-semibold text-slate-600">
                      {hasFrozenSummary ? 'Ver historial completo' : 'Historial anterior · ver detalle'}
                    </p>
                  </button>
                );
              })}
            </div>
          </SectionCard>
        )}
          </>
        )}
      <CampaignStepShell
        isOpen={Boolean(historyCampaign)}
        backHandlerId="campaigns-history-detail"
        stepLabel={historySummaryResult?.isLegacy ? 'Historial anterior' : 'Historial'}
        title={historyCampaign?.name || 'Campaña cerrada'}
        subtitle={historyCampaign ? formatCampaignSchedule(historyCampaign) : ''}
        onBack={() => setHistoryCampaignId(null)}
      >
        <CampaignHistoryDetail
          summary={historySummaryResult?.summary || null}
          isLegacy={Boolean(historySummaryResult?.isLegacy)}
        />
      </CampaignStepShell>

      <CampaignStepShell
        isOpen={adminScreen === 'step1'}
        backHandlerId="campaigns-step-one"
        stepLabel="Paso 1 de 3"
        title="Datos de la campaña"
        subtitle={selectedCampaign ? selectedCampaign.name : 'Nueva campaña'}
        onBack={() => setAdminScreen('hub')}
        footer={(
          <button
            type="button"
            onClick={handleSaveAndGoToStep2}
            disabled={isBusy || isReadOnlyCampaign}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-800 px-6 py-3.5 text-base font-bold text-white shadow-sm transition-colors hover:bg-slate-900 disabled:opacity-60"
          >
            {isBusy ? (
              <>
                <Icon name="loader" size={18} className="animate-spin" />
                Guardando...
              </>
            ) : (
              <>
                <Icon name="chevronRight" size={18} />
                Siguiente paso
              </>
            )}
          </button>
        )}
      >
        <div className="grid grid-cols-1 gap-4">
          <label className="space-y-2">
            <span className="text-sm font-semibold text-gray-700">Nombre</span>
            <input
              value={campaignForm.name}
              onChange={(event) => setCampaignForm((previous) => ({ ...previous, name: event.target.value }))}
              disabled={isBusy || isReadOnlyCampaign}
              autoFocus={!selectedCampaignId}
              className="w-full rounded-2xl border border-gray-300 px-4 py-3 focus:border-slate-500 focus:outline-none"
              placeholder="Invitación Asamblea Abril"
            />
          </label>
          <div className="space-y-2">
            <p id="campaign-type-label-step" className="text-sm font-semibold text-gray-700">Tipo</p>
            <CampaignTypeSelect
              value={campaignForm.type}
              onChange={(type) => setCampaignForm((previous) => ({ ...previous, type }))}
              disabled={isBusy || isReadOnlyCampaign}
            />
          </div>
          <div className="space-y-2">
            <p className="text-sm font-semibold text-gray-700">Fecha</p>
            <CampaignDateRangePicker
              startDate={campaignForm.eventDate}
              endDate={campaignForm.eventEndDate}
              onChange={(nextRange) => setCampaignForm((previous) => ({
                ...previous,
                eventDate: nextRange.eventDate,
                eventEndDate: nextRange.eventEndDate
              }))}
              disabled={isBusy || isReadOnlyCampaign}
            />
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-sm font-semibold text-slate-700">Resumen</p>
          <div className="mt-3 space-y-2">
            <div className="flex items-center gap-3 rounded-2xl border border-slate-200/80 bg-white px-3 py-2.5">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-100 text-indigo-700">
                <Icon name="map" size={16} />
              </div>
              <span className="min-w-0 flex-1 text-sm text-slate-600">Territorios</span>
              <span className="text-sm font-bold tabular-nums text-slate-900">{allTerritoryIds.length}</span>
            </div>
            {addressesLoading ? (
              <div className="flex items-center gap-3 rounded-2xl border border-slate-200/80 bg-white px-3 py-2.5">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
                  <Icon name="loader" size={16} className="animate-spin" />
                </div>
                <span className="text-sm text-slate-500">Cargando direcciones…</span>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-3 rounded-2xl border border-slate-200/80 bg-white px-3 py-2.5">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
                    <Icon name="mapPin" size={16} />
                  </div>
                  <span className="min-w-0 flex-1 text-sm text-slate-600">Direcciones</span>
                  <span className="text-sm font-bold tabular-nums text-slate-900">{allTerritoryAddresses.length}</span>
                </div>
                {allTerritoryAddresses.length === 0 && (
                  <div className="flex items-start gap-2.5 rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2.5">
                    <Icon name="alertTriangle" size={16} className="mt-0.5 shrink-0 text-amber-600" />
                    <p className="text-sm leading-relaxed text-amber-800">
                      No hay direcciones activas en la congregación. Agrégalas desde cada territorio.
                    </p>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {(() => {
          const editableCampaigns = campaigns.filter((c) => [CAMPAIGN_STATUSES.DRAFT, CAMPAIGN_STATUSES.ACTIVE].includes(c.status));

          if (editableCampaigns.length === 0) {
            return null;
          }

          return (
            <div>
              <p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-slate-500">En curso o borrador</p>
              <div className="space-y-3">
                {editableCampaigns.map(renderSelectableCampaignCard)}
              </div>
            </div>
          );
        })()}
      </CampaignStepShell>

      <CampaignStepShell
        isOpen={adminScreen === 'step2'}
        backHandlerId="campaigns-step-two"
        stepLabel="Paso 2 de 3"
        title="Hermanos y reparto"
        subtitle={step2Subtitle}
        onBack={() => setAdminScreen('hub')}
        footer={(
          <button
            type="button"
            onClick={handleSaveAndReturnToHub}
            disabled={isBusy || isReadOnlyCampaign}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-6 py-3.5 text-base font-bold text-white shadow-sm transition-colors hover:bg-emerald-700 disabled:opacity-60"
          >
            {isBusy ? (
              <>
                <Icon name="loader" size={18} className="animate-spin" />
                Guardando...
              </>
            ) : (
              <>
                <Icon name="save" size={18} />
                Guardar participantes
              </>
            )}
          </button>
        )}
      >
        <div className="sticky top-0 z-10 -mx-4 bg-gray-50 px-4 pb-3 pt-1">
          <div className="relative">
            <div className="pointer-events-none absolute left-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
              <Icon name="search" size={16} />
            </div>
            <input
              value={participantSearch}
              onChange={(event) => setParticipantSearch(event.target.value)}
              onFocus={(event) => {
                if (event.target.value.length > 0) {
                  event.target.select();
                }
              }}
              disabled={isBusy}
              inputMode="search"
              placeholder="Buscar por nombre o apellido"
              className="w-full rounded-2xl border border-gray-300 py-3 pl-12 pr-10 text-sm focus:border-slate-500 focus:outline-none disabled:opacity-60"
            />
            {participantSearch && (
              <button
                type="button"
                onClick={() => setParticipantSearch('')}
                disabled={isBusy}
                aria-label="Limpiar búsqueda"
                className="absolute right-3 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-xl text-slate-500 transition-colors hover:bg-slate-100 disabled:opacity-60"
              >
                <Icon name="x" size={16} />
              </button>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 font-semibold text-emerald-800">
            <Icon name="users" size={14} />
            {enabledParticipantsCount} activos
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 font-semibold text-slate-700">
            <Icon name="mapPin" size={14} />
            {allTerritoryAddresses.length} direcciones
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 font-semibold text-slate-700">
            <Icon name="user" size={14} />
            {participantsDraft.length} hermanos
          </span>
          {isDesktop && (
            <>
              <span className="hidden lg:inline h-5 w-px bg-slate-200" aria-hidden="true" />
              {[
                { id: 'Hombre', label: 'Varones', count: participantGenderCounts.male },
                { id: 'Mujer', label: 'Mujeres', count: participantGenderCounts.female }
              ].map((option) => {
                const isActive = participantGenderFilter === option.id;

                return (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => setParticipantGenderFilter((previous) => (
                      previous === option.id ? null : option.id
                    ))}
                    disabled={isBusy}
                    className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 font-semibold transition-all disabled:opacity-60 ${
                      isActive
                        ? 'border-slate-800 bg-slate-800 text-white'
                        : 'border-slate-200 bg-white text-slate-700 hover:border-slate-400'
                    }`}
                  >
                    {option.label} ({option.count})
                  </button>
                );
              })}
            </>
          )}
        </div>

        {participantTargetsPreview.error && (
          <div className="flex items-start gap-2.5 rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2.5">
            <Icon name="alertTriangle" size={16} className="mt-0.5 shrink-0 text-amber-600" />
            <p className="text-sm leading-relaxed text-amber-800">{participantTargetsPreview.error}</p>
          </div>
        )}
        <div className="space-y-2">
          {filteredParticipantsDraft.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-4 text-sm text-gray-500">
              {participantGenderFilter
                ? `No hay hermanos que coincidan con el filtro${participantSearch ? ' ni la búsqueda' : ''}.`
                : 'No hay hermanos que coincidan con la búsqueda.'}
            </div>
          ) : (
            filteredParticipantsDraft.map((participant) => {
              const resolvedParticipant = resolveCampaignAssignment(participant);
              const currentMode = getParticipantAssignmentMode(resolvedParticipant);
              const assignedCount = participantTargetsPreview.byUserId[participant.userId];
              const previewBadge = getParticipantPreviewBadge(resolvedParticipant, assignedCount);
              const isIncluded = resolvedParticipant.isEnabled !== false;

              return (
                <div
                  key={participant.userId}
                  className={`rounded-2xl border transition-all ${
                    isIncluded ? 'border-gray-200 bg-white' : 'border-slate-200 bg-slate-50'
                  }`}
                >
                  <div className="flex items-start gap-3 p-3">
                    <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${
                      isIncluded ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-500'
                    }`}>
                      <Icon name="user" size={16} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="min-w-0 flex-1 truncate text-sm font-bold text-slate-900">
                          {participant.userNameSnapshot}
                        </p>
                        <span className={`inline-flex shrink-0 items-center rounded-full border px-2.5 py-1 text-xs font-bold ${previewBadge.className}`}>
                          {previewBadge.label}
                        </span>
                      </div>

                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {PARTICIPANT_ASSIGNMENT_MODES.map((mode) => {
                          const isSelected = currentMode === mode.id;

                          return (
                            <button
                              key={mode.id}
                              type="button"
                              onClick={() => applyParticipantMode(participant.userId, mode.id)}
                              disabled={isBusy || isReadOnlyCampaign}
                              className={`min-h-[36px] shrink-0 rounded-xl px-3 py-1.5 text-xs font-bold transition-all disabled:opacity-60 ${
                                isSelected
                                  ? mode.id === 'excluded'
                                    ? 'bg-slate-600 text-white shadow-sm'
                                    : 'bg-emerald-600 text-white shadow-sm'
                                  : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:ring-slate-300'
                              }`}
                            >
                              {mode.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {currentMode === 'advanced' && (
                    <div className="border-t border-slate-200 px-3 pb-3 pt-3">
                      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Configuración avanzada</p>
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <label className="space-y-1">
                          <span className="text-xs font-semibold text-gray-500">Carga relativa</span>
                          <input
                            type="number"
                            min="1"
                            inputMode="numeric"
                            value={participant.capacityWeight}
                            onChange={(event) => updateParticipantDraft(participant.userId, 'capacityWeight', event.target.value)}
                            disabled={isBusy || isReadOnlyCampaign || !isIncluded}
                            className="w-full rounded-xl border border-gray-300 px-3 py-3 focus:border-slate-500 focus:outline-none disabled:opacity-60"
                          />
                        </label>
                        <label className="space-y-1">
                          <span className="text-xs font-semibold text-gray-500">Límite de direcciones</span>
                          <input
                            type="number"
                            min="0"
                            inputMode="numeric"
                            value={participant.hardLimit}
                            onChange={(event) => updateParticipantDraft(participant.userId, 'hardLimit', event.target.value)}
                            disabled={isBusy || isReadOnlyCampaign || !isIncluded}
                            placeholder="Sin límite"
                            className="w-full rounded-xl border border-gray-300 px-3 py-3 focus:border-slate-500 focus:outline-none disabled:opacity-60"
                          />
                        </label>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </CampaignStepShell>

      <CampaignStepShell
        isOpen={adminScreen === 'step3'}
        backHandlerId="campaigns-step-three"
        stepLabel="Paso 3 de 3"
        title={campaignIsActive ? 'Administra el reparto' : 'Genera el reparto'}
        subtitle={step3Summary}
        onBack={() => setAdminScreen('hub')}
        footer={!campaignIsActive ? renderStep3PrimaryCta() : null}
      >
        <div className="sticky top-0 z-10 -mx-4 -mt-4 border-b border-slate-300 bg-slate-100 px-4 py-3 shadow-sm">
          <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-600">
            Acciones
          </p>
          <div className="flex flex-wrap gap-2">
            {!campaignIsActive && assignmentsGenerated && (
              <button
                type="button"
                onClick={() => executeAdminAction('save')}
                disabled={isBusy || isReadOnlyCampaign}
                className="min-h-[44px] rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:border-slate-400 hover:bg-slate-50 disabled:opacity-60"
              >
                Guardar campaña
              </button>
            )}
            {assignmentsGenerated && (
              <button
                type="button"
                onClick={() => setConfirmAction('generate')}
                disabled={isBusy || isReadOnlyCampaign}
                className="min-h-[44px] rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:border-slate-400 hover:bg-slate-50 disabled:opacity-60"
              >
                Regenerar reparto
              </button>
            )}
            {assignmentsGenerated && (
              <button
                type="button"
                onClick={handleOpenCampaignMap}
                disabled={isBusy}
                aria-label="Ver mapa del territorio"
                title="Ver mapa del territorio"
                className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl border border-slate-300 bg-white px-3 text-slate-700 transition-colors hover:border-slate-400 hover:bg-slate-50 disabled:opacity-60"
              >
                <Icon name="map" size={18} />
              </button>
            )}
            {campaignIsActive && (
              <button
                type="button"
                onClick={() => setConfirmAction('finalize')}
                disabled={isBusy}
                className="min-h-[44px] rounded-xl border border-[#2C3E50]/30 bg-white px-4 py-2.5 text-sm font-semibold text-[#2C3E50] transition-colors hover:bg-[#2C3E50]/5 disabled:opacity-60"
              >
                Finalizar y archivar
              </button>
            )}
            {selectedCampaign?.status === CAMPAIGN_STATUSES.COMPLETED && (
              <button
                type="button"
                onClick={() => setConfirmAction('archive')}
                disabled={isBusy}
                className="min-h-[44px] rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 transition-colors hover:border-slate-400 hover:text-slate-800 disabled:opacity-60"
              >
                Archivar
              </button>
            )}
          </div>
        </div>

        {assignmentsGenerated && (
          <SegmentedToggle
            value={step3Tab}
            onChange={setStep3Tab}
            options={[
              { id: 'participants', label: 'Participantes', count: step3DistributionParticipants.length },
              { id: 'addresses', label: 'Direcciones', count: selectedCampaignAssignments.length }
            ]}
            disabled={isBusy}
            className="w-full"
          />
        )}

        {(step3Tab === 'participants' || !assignmentsGenerated) && (
        <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-center gap-2.5">
              <p className="text-sm font-semibold text-slate-700">Detalle del reparto</p>
              {assignmentsGenerated && (
                <CopyDistributionButton
                  onClick={handleCopyDistributionList}
                  copied={distributionCopyFeedback}
                  disabled={isBusy || !distributionIsBalanced || step3DistributionParticipants.length === 0}
                />
              )}
              {assignmentsGenerated && (
                <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-bold text-indigo-700">
                  <Icon name="users" size={14} />
                  {step3DistributionHeaderCount}
                </span>
              )}
              {assignmentsGenerated && step3UnassignedCount > 0 && (
                <button
                  type="button"
                  onClick={() => setStep3DistributionFilter((prev) => (
                    prev === 'unassigned' ? 'all' : 'unassigned'
                  ))}
                  disabled={isBusy}
                  aria-label="Ver participantes con objetivo en 0 direcciones"
                  aria-pressed={step3DistributionFilter === 'unassigned'}
                  className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold transition-colors disabled:opacity-60 ${
                    step3DistributionFilter === 'unassigned'
                      ? 'bg-red-100 text-red-800 ring-2 ring-red-300'
                      : 'bg-red-50 text-red-700 hover:bg-red-100'
                  }`}
                >
                  <Icon name="users" size={14} />
                  {step3UnassignedCount}
                </button>
              )}
              {assignmentsGenerated && campaignAddressDrift.hasNewAddresses && (
                <span
                  className="inline-flex shrink-0 items-center gap-1 rounded-full bg-sky-50 px-2.5 py-0.5 text-xs font-bold text-sky-700"
                  aria-label={`${campaignAddressDrift.newCount} direcciones nuevas`}
                >
                  <Icon name="plus" size={14} />
                  {campaignAddressDrift.newCount}
                </span>
              )}
            </div>
            {assignmentsGenerated && (
              <SegmentedToggle
                value={step3DistributionFilter}
                onChange={setStep3DistributionFilter}
                options={step3DistributionFilterOptions}
                disabled={isBusy}
                className="w-full min-w-[220px] sm:w-auto sm:min-w-[240px]"
              />
            )}
          </div>

          {!assignmentsGenerated ? (
            <div className="mt-3 rounded-2xl border border-dashed border-slate-300 bg-white p-4 text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
                <Icon name="shuffle" size={20} />
              </div>
              <p className="text-sm font-semibold text-slate-700">Aún no hay reparto generado</p>
              <p className="mt-1 text-sm text-slate-500">
                Genera el reparto para ver quién recibe cada dirección.
              </p>
            </div>
          ) : (
            <div className="mt-3 space-y-3">
              {step3FilteredDistributionParticipants.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-4 text-center text-sm text-slate-500">
                  {step3DistributionFilter === 'pioneers'
                    ? 'Ningún precursor tiene direcciones asignadas en esta campaña.'
                    : step3DistributionFilter === 'unassigned'
                      ? 'Ningún participante tiene el objetivo en 0 direcciones.'
                      : 'Aún no hay participantes con direcciones en esta campaña.'}
                </div>
              ) : (
                <CampaignDistributionControl
                  participants={step3FilteredDistributionParticipants}
                  distributionTargets={distributionTargets}
                  totalAddresses={totalDistributionAddresses}
                  configuredTotal={distributionConfiguredTotal}
                  isBalanced={distributionIsBalanced}
                  preservedCountsByUser={preservedCountsByUser}
                  isBusy={isBusy}
                  isReadOnly={isReadOnlyCampaign}
                  onAdjustTarget={adjustDistributionTarget}
                  onSetTarget={setDistributionTarget}
                  onUseConfiguredTargets={useConfiguredDistributionTargets}
                  onApply={handleApplyDistribution}
                  assignmentsByUserId={assignmentsByUserId}
                  onOpenParticipantMap={handleOpenParticipantMap}
                  onRequestReassignment={handleOpenAssignmentReassignment}
                  onRequestBulkReassignment={handleOpenBulkReassignment}
                  onCompleteAssignment={handleAdminCompleteAssignment}
                  assignmentsGenerated={assignmentsGenerated}
                  liveAvailableCount={campaignAddressDrift.liveCount}
                  requiresRegenerate={campaignRequiresRegenerate}
                  compact
                />
              )}
            </div>
          )}
        </div>
        )}

        {step3Tab === 'addresses' && assignmentsGenerated && (
          <div className="space-y-3">
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm font-bold text-slate-900">Aquí puedes corregir el reparto sin empezar de nuevo</p>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Usa esta lista para mover direcciones entre hermanos, bloquear asignaciones que no quieres alterar o resetear una dirección para devolverla a pendiente.
              </p>
            </div>

            {selectedCampaignAssignments.length === 0 ? (
              <EmptyState
                icon="mail"
                title="Aún no hay direcciones repartidas"
                description="Guarda la campaña y genera la asignación automática para empezar a administrar el seguimiento."
              />
            ) : (
              selectedCampaignAssignments.map((assignment) => {
                const progressMeta = getCampaignProgressMeta(assignment.status);
                return (
                  <div key={assignment.id} className="space-y-3 rounded-2xl border border-gray-200 bg-white p-4">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                      <div>
                        <div className="mb-2 flex flex-wrap items-center gap-2">
                          <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-bold ${progressMeta.badgeClass}`}>
                            {progressMeta.label}
                          </span>
                          {assignment.manualLocked && (
                            <span className="inline-flex items-center rounded-full border border-red-200 bg-red-50 px-2.5 py-1 text-xs font-bold text-red-700">
                              Bloqueada
                            </span>
                          )}
                        </div>
                        <h4 className="text-base font-bold text-gray-900">{getDisplayAddress(assignment.addressSnapshot)}</h4>
                        <p className="mt-1 text-sm text-gray-500">{assignment.addressSnapshot?.territoryName || 'Territorio'}</p>
                        {assignment.completedByUserName && (
                          <p className="mt-2 text-xs text-emerald-700">Completada por: {assignment.completedByUserName}</p>
                        )}
                      </div>
                      <div className="flex flex-col gap-2 md:flex-row lg:items-start">
                        <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700">
                          {assignment.assignedUserName || selectedCampaignParticipants.find(
                            (participant) => participant.userId === assignment.assignedUserId
                          )?.userNameSnapshot || 'Participante'}
                        </div>
                        {assignment.status !== CAMPAIGN_PROGRESS_STATUSES.COMPLETED ? (
                          <>
                            <button
                              type="button"
                              onClick={() => handleAdminCompleteAssignment(assignment)}
                              disabled={isBusy || isReadOnlyCampaign}
                              className="rounded-xl bg-emerald-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
                            >
                              Marcar completada
                            </button>
                            <button
                              type="button"
                              onClick={() => handleOpenAssignmentReassignment(assignment)}
                              disabled={isBusy || isReadOnlyCampaign}
                              className="rounded-xl bg-indigo-100 px-3 py-2 text-sm font-semibold text-indigo-700 disabled:opacity-50"
                            >
                              Cambiar responsable
                            </button>
                          </>
                        ) : null}
                        <button
                          onClick={() => handleToggleLock(assignment.id)}
                          disabled={isBusy}
                          className={`rounded-xl px-3 py-2 text-sm font-semibold ${assignment.manualLocked ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-700'}`}
                        >
                          {assignment.manualLocked ? 'Desbloquear' : 'Bloquear'}
                        </button>
                        <button
                          onClick={() => handleResetAssignment(assignment.id)}
                          disabled={isBusy || assignment.status === CAMPAIGN_PROGRESS_STATUSES.PENDING}
                          className="rounded-xl bg-amber-100 px-3 py-2 text-sm font-semibold text-amber-700 disabled:opacity-50"
                        >
                          Resetear
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </CampaignStepShell>

      </div>

      <CampaignReassignmentModal
        request={reassignmentRequest}
        participants={step3DistributionParticipants}
        isProcessing={isBusy}
        onClose={() => setReassignmentRequest(null)}
        onConfirm={handleConfirmReassignment}
      />

      <LazyCampaignAssignmentsMapModal
        isOpen={publisherMapState.isOpen}
        onClose={handleClosePublisherMap}
        campaign={personalCampaign}
        assignments={publisherMapAssignments}
        onStatusChange={handlePublisherStatusChange}
        isProcessing={isBusy}
        participantName={publisherMapState.territoryName}
      />

      <LazyCampaignAssignmentsMapModal
        isOpen={participantMapState.isOpen}
        onClose={handleCloseParticipantMap}
        campaign={selectedCampaign}
        assignments={participantMapAssignments}
        onStatusChange={handlePublisherStatusChange}
        isProcessing={isBusy || isReadOnlyCampaign}
        modalId="campaign-step3-participant-map"
        participantName={participantMapState.userName}
      />

      <LazyCampaignAssignmentsMapModal
        isOpen={isCampaignMapOpen}
        onClose={handleCloseCampaignMap}
        campaign={selectedCampaign}
        assignments={selectedCampaignAssignments}
        onStatusChange={handlePublisherStatusChange}
        isProcessing={isBusy || isReadOnlyCampaign}
        modalId="campaign-step3-full-map"
        participantName="Todo el territorio"
      />

      <ConfirmDialog
        isOpen={confirmAction === 'generate'}
        onClose={() => setConfirmAction(null)}
        onConfirm={() => executeAdminAction('generate')}
        title="Regenerar reparto"
        message="Vas a volver a repartir las direcciones. Se borrarán las asignaciones pendientes sin candado y se crearán otras nuevas (el hermano de cada dirección pendiente puede cambiar). Se mantienen las que ya están en progreso, completadas o con candado. ¿Seguro que quieres regenerar?"
        confirmText="Sí, regenerar"
        cancelText="Cancelar"
        type="warning"
        isProcessing={isBusy}
        dialogId="campaigns-confirm-generate"
      />

      <ConfirmDialog
        isOpen={confirmAction === 'activate'}
        onClose={() => setConfirmAction(null)}
        onConfirm={() => executeAdminAction('activate')}
        title={'Activar campa\u00f1a'}
        message={(() => {
          const participantCount = participantSummary.filter((participant) => participant.total > 0).length;
          const addressCount = selectedCampaignAssignments.length;

          return (
            <div className="space-y-4 text-left">
              <p className="text-center text-base font-bold leading-snug text-slate-900">
                {selectedCampaign?.name || 'Campaña'}
              </p>
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-2xl bg-slate-50 px-3 py-3 text-center">
                  <p className="text-2xl font-bold tabular-nums text-slate-900">{addressCount}</p>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    {addressCount === 1 ? 'dirección' : 'direcciones'}
                  </p>
                </div>
                <div className="rounded-2xl bg-slate-50 px-3 py-3 text-center">
                  <p className="text-2xl font-bold tabular-nums text-slate-900">{participantCount}</p>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    {participantCount === 1 ? 'hermano' : 'hermanos'}
                  </p>
                </div>
              </div>
            </div>
          );
        })()}
        confirmText={'S\u00ed, activar'}
        cancelText="Cancelar"
        type="success"
        isProcessing={isBusy}
        dialogId="campaigns-confirm-activate"
      />

      <ConfirmDialog
        isOpen={confirmAction === 'complete' || confirmAction === 'finalize'}
        onClose={() => setConfirmAction(null)}
        onConfirm={() => executeAdminAction(confirmAction === 'complete' ? 'complete' : 'finalize')}
        title="Finalizar y archivar"
        message={(() => {
          const total = selectedCampaignAssignments.length;
          const completed = selectedCampaignAssignments.filter(
            (assignment) => assignment.status === CAMPAIGN_PROGRESS_STATUSES.COMPLETED
          ).length;
          const pending = selectedCampaignAssignments.filter(
            (assignment) => assignment.status === CAMPAIGN_PROGRESS_STATUSES.PENDING
          ).length;
          const inProgress = selectedCampaignAssignments.filter(
            (assignment) => assignment.status === CAMPAIGN_PROGRESS_STATUSES.IN_PROGRESS
          ).length;
          const participantsWithMissing = participantSummary
            .filter((participant) => participant.total > 0 && (participant.pending + participant.inProgress) > 0)
            .map((participant) => {
              const missing = participant.pending + participant.inProgress;
              return `• ${participant.userNameSnapshot}: ${missing} faltante${missing === 1 ? '' : 's'}`;
            });

          const lines = [
            `Resumen: ${total} direcciones · ${completed} completadas · ${pending} pendientes · ${inProgress} en progreso.`,
            '',
            participantsWithMissing.length > 0
              ? `Hermanos con faltantes:\n${participantsWithMissing.join('\n')}`
              : 'No hay hermanos con direcciones faltantes.',
            '',
            'Al finalizar y archivar:',
            '• Desaparecerá del panel de los hermanos',
            '• No cambia ni borra territorios ni direcciones',
            '• Quedará en el historial para estadística de administradores',
            '• Se podrá crear otra campaña'
          ];

          return lines.join('\n');
        })()}
        confirmText="Sí, finalizar y archivar"
        cancelText="Cancelar"
        type="success"
        isProcessing={isBusy}
        dialogId="campaigns-confirm-finalize"
      />

      <ConfirmDialog
        isOpen={confirmAction === 'archive'}
        onClose={() => {
          setConfirmAction(null);
          setCampaignPendingDelete(null);
        }}
        onConfirm={() => executeAdminAction('archive')}
        title="Archivar campaña"
        message={[
          'Esta campaña ya está finalizada. Al archivarla:',
          '• No cambia ni borra territorios ni direcciones',
          '• El resumen estadístico se conserva',
          '• Seguirá disponible en el historial de administradores',
          '• Se podrá crear otra campaña'
        ].join('\n')}
        confirmText="Sí, archivar"
        cancelText="Cancelar"
        type="warning"
        isProcessing={isBusy}
        dialogId="campaigns-confirm-archive"
      />

      <ConfirmDialog
        isOpen={confirmAction === 'delete'}
        onClose={() => {
          setConfirmAction(null);
          setCampaignPendingDelete(null);
        }}
        onConfirm={() => executeAdminAction('delete')}
        title="Eliminar campaña"
        message={(() => {
          const campaignName = campaignPendingDelete?.name || 'esta campaña';
          const assignmentCount = campaignPendingDelete
            ? campaignAssignments.filter((assignment) => assignment.campaignId === campaignPendingDelete.id).length
            : 0;

          return `¿Seguro que quieres eliminar "${campaignName}"? Se borrará la campaña y sus ${assignmentCount} asignación${assignmentCount === 1 ? '' : 'es'}. Las direcciones de los territorios no se eliminarán. Esta acción no se puede deshacer.`;
        })()}
        confirmText="Sí, eliminar"
        cancelText="Cancelar"
        type="danger"
        isProcessing={isBusy}
        dialogId="campaigns-confirm-delete"
      />
    </div>
  );
};

export default CampaignsView;
