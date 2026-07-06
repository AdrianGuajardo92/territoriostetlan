import React, { useEffect, useMemo, useRef, useState } from 'react';
import ConfirmDialog from '../components/common/ConfirmDialog';
import Icon from '../components/common/Icon';
import { useApp } from '../context/AppContext';
import { useBackHandler } from '../hooks/useBackHandler';
import { useCampaigns } from '../context/CampaignContext';
import {
  CAMPAIGN_PROGRESS_STATUSES,
  CAMPAIGN_STATUSES,
  formatCampaignDate,
  formatCampaignTypeLabel,
  getCampaignProgressMeta,
  calculateCampaignTargets,
  getEligibleCampaignAddresses,
  groupAssignmentsByTerritory,
  sortCampaignSourceAddresses
} from '../utils/campaignUtils';
import { LazyCampaignAssignmentsMapModal } from '../components/modals/LazyModals';
import { getDisplayAddress, getFullAddress } from '../utils/helpers';
import {
  CampaignHubStepCard,
  CampaignStatTile,
  CampaignStepper,
  CampaignStepShell
} from '../components/campaigns/CampaignMobileShell';

const DEFAULT_CAMPAIGN_FORM = {
  name: '',
  type: 'asamblea',
  eventDate: ''
};

const PUBLISHER_FILTER_OPTIONS = [
  { id: CAMPAIGN_PROGRESS_STATUSES.IN_PROGRESS, label: 'En progreso' },
  { id: CAMPAIGN_PROGRESS_STATUSES.COMPLETED, label: 'Completadas' }
];

const PUBLISHER_STATUS_OPTIONS = [
  { id: CAMPAIGN_PROGRESS_STATUSES.IN_PROGRESS, label: 'En progreso' },
  { id: CAMPAIGN_PROGRESS_STATUSES.COMPLETED, label: 'Completada' }
];

const CAMPAIGN_TYPE_OPTIONS = [
  { value: 'asamblea', label: 'Asamblea', icon: 'building' },
  { value: 'conmemoracion', label: 'Conmemoraci\u00f3n', icon: 'wine' }
];

const PARTICIPANT_ASSIGNMENT_MODES = [
  { id: 'auto', label: 'Automático' },
  { id: '1', label: '1' },
  { id: '2', label: '2' },
  { id: '3', label: '3' },
  { id: 'excluded', label: 'Excluido' }
];

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
                  onClick={() => {
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
  if (participant.isEnabled === false) return 'excluded';

  const weight = Number(participant.capacityWeight) || 1;
  const rawLimit = participant.hardLimit;

  if (rawLimit === '' || rawLimit === null || rawLimit === undefined) {
    return weight === 1 ? 'auto' : 'advanced';
  }

  const limitNum = Number(rawLimit);
  if (!Number.isFinite(limitNum)) return 'auto';

  if (weight === 1 && [1, 2, 3].includes(limitNum)) {
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

  if (['1', '2', '3'].includes(mode)) {
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
  isCollapsed = false
}) => {
  const toneClasses = {
    slate: 'from-slate-50 via-white to-white',
    indigo: 'from-indigo-50 via-white to-white',
    emerald: 'from-emerald-50 via-white to-white',
    amber: 'from-amber-50 via-white to-white'
  };

  return (
    <section className="overflow-hidden rounded-[30px] border border-slate-200 bg-white shadow-sm">
      <div className={`bg-gradient-to-r px-5 ${isCollapsed ? 'py-3' : 'py-4'} ${toneClasses[tone] || toneClasses.slate} ${isCollapsed ? '' : 'border-b border-slate-100'}`}>
        <div className={`flex justify-between gap-3 ${isCollapsed ? 'items-center' : 'items-start'}`}>
          <div className="flex min-w-0 items-start gap-3">
            {icon && (
              <div className={`flex shrink-0 items-center justify-center bg-white text-slate-700 shadow-sm ring-1 ring-slate-200 ${isCollapsed ? 'h-10 w-10 rounded-xl' : 'h-11 w-11 rounded-2xl'}`}>
                <Icon name={icon} size={18} />
              </div>
            )}
            <div className="min-w-0">
              {eyebrow && <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">{eyebrow}</p>}
              <h2 className={`${isCollapsed ? 'mt-0 text-base' : 'mt-1 text-lg'} font-bold text-gray-900`}>{title}</h2>
              {!isCollapsed && subtitle && <p className="mt-1 text-sm text-gray-500">{subtitle}</p>}
            </div>
          </div>
          {rightSlot}
        </div>
      </div>
      {children !== null && children !== undefined && children !== false && (
        <div className="p-5">{children}</div>
      )}
    </section>
  );
};

const SectionToggleButton = ({ isExpanded, onClick, summaryLabel }) => (
  <button
    type="button"
    onClick={onClick}
    aria-expanded={isExpanded}
    className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm transition-colors hover:border-slate-300 hover:text-slate-900"
  >
    {summaryLabel && (
      <span className="hidden text-xs font-semibold text-slate-500 lg:inline">
        {summaryLabel}
      </span>
    )}
    <span>{isExpanded ? 'Ocultar' : 'Mostrar'}</span>
    <Icon
      name="chevronRight"
      size={16}
      className={`transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`}
    />
  </button>
);

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

const PublisherAssignmentCard = ({
  assignment,
  onStatusChange,
  isProcessing = false,
  statusOptions = PUBLISHER_STATUS_OPTIONS,
  statusResolver = getPublisherAssignmentStatus
}) => {
  const displayStatus = statusResolver(assignment);
  const progressMeta = getCampaignProgressMeta(displayStatus);
  const snapshot = assignment.addressSnapshot || {};
  const mapHref = getPublisherAssignmentMapHref(snapshot);

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold border ${progressMeta.badgeClass}`}>
              <span className={`w-2 h-2 rounded-full mr-2 ${progressMeta.dotClass}`}></span>
              {progressMeta.label}
            </span>
          </div>
          <h4 className="text-base font-bold text-gray-900">{getDisplayAddress(snapshot)}</h4>
          <p className="text-sm text-gray-500 mt-1">{snapshot.territoryName || 'Territorio'}</p>
        </div>
        <a
          href={mapHref || '#'}
          target="_blank"
          rel="noopener noreferrer"
          className={`w-11 h-11 rounded-2xl flex items-center justify-center ${mapHref ? 'bg-slate-700 text-white hover:bg-slate-800' : 'bg-gray-100 text-gray-400 pointer-events-none'} transition-colors`}
        >
          <Icon name="navigation" size={18} />
        </a>
      </div>

      {(snapshot.phone || snapshot.notes) && (
        <div className="space-y-2 text-sm text-gray-700">
          {snapshot.phone && <p><span className="font-semibold text-gray-500">Telefono:</span> {snapshot.phone}</p>}
          {snapshot.notes && <p className="text-gray-600 italic">"{snapshot.notes}"</p>}
        </div>
      )}

      <div className={`grid gap-2 ${statusOptions.length === 2 ? 'grid-cols-2' : 'grid-cols-3'}`}>
        {statusOptions.map((option) => {
          const isActive = displayStatus === option.id;
          return (
            <button
              key={option.id}
              onClick={() => onStatusChange(option.id)}
              disabled={isProcessing || isActive}
              className={`px-3 py-2 rounded-xl text-sm font-semibold transition-all border ${
                isActive
                  ? 'bg-slate-800 text-white border-slate-800'
                  : 'bg-white text-slate-700 border-slate-200 hover:border-slate-400'
              } disabled:opacity-60`}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
};

const PublisherAssignmentsSection = ({
  activeCampaign,
  assignments,
  groupedAssignments,
  onStatusChange,
  isProcessing = false,
  publisherFilter = CAMPAIGN_PROGRESS_STATUSES.IN_PROGRESS,
  onFilterChange = () => {},
  filterOptions = PUBLISHER_FILTER_OPTIONS,
  statusOptions = PUBLISHER_STATUS_OPTIONS,
  statusResolver = getPublisherAssignmentStatus,
  onOpenMap = null
}) => {
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
  const totalCount = assignments.length;

  const filterCounts = {
    [CAMPAIGN_PROGRESS_STATUSES.IN_PROGRESS]: pendingCount,
    [CAMPAIGN_PROGRESS_STATUSES.COMPLETED]: completedCount
  };

  return (
    <div className="space-y-4">
      <SectionCard
        title={activeCampaign.name}
        subtitle={`${formatCampaignTypeLabel(activeCampaign.type)} - ${formatCampaignDate(activeCampaign.eventDate)}`}
        rightSlot={(
          <div className="flex flex-wrap items-center justify-end gap-2">
            {onOpenMap && assignments.length > 0 && (
              <button
                type="button"
                onClick={onOpenMap}
                className="inline-flex items-center rounded-2xl border border-indigo-200 bg-indigo-50 px-3 py-2 text-xs font-bold text-indigo-700 transition-colors hover:bg-indigo-100"
              >
                <Icon name="map" size={15} className="mr-2" />
                Ver mapa
              </button>
            )}
          </div>
        )}
      >
        {totalCount > 0 && (
          <div className="mb-3 flex items-center gap-2 rounded-2xl border border-indigo-100 bg-indigo-50 px-3 py-2.5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-100 text-indigo-700">
              <Icon name={pendingCount > 0 ? 'mapPin' : 'checkCircle'} size={15} />
            </div>
            <p className="min-w-0 text-sm font-semibold text-indigo-900">
              {pendingCount > 0
                ? (<>Te faltan <strong>{pendingCount}</strong> {pendingCount === 1 ? 'dirección' : 'direcciones'}</>)
                : 'Completaste todas tus direcciones'}
            </p>
          </div>
        )}
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
              {option.label}{filterCounts[option.id] != null ? ` (${filterCounts[option.id]})` : ''}
            </button>
          ))}
        </div>
      </SectionCard>

      {groupedAssignments.length === 0 ? (
        <EmptyState
          icon="bookmark"
          title="No hay direcciones en este filtro"
          description={'Cambia entre En progreso y Completadas para revisar tus invitaciones.'}
        />
      ) : (
        groupedAssignments.map((group) => (
          <SectionCard
            key={group.territoryId}
            title={group.territoryName}
            subtitle={`${group.assignments.length} direcci\u00f3n${group.assignments.length !== 1 ? 'es' : ''}`}
          >
            <div className="space-y-3">
              {group.assignments.map((assignment) => (
                <PublisherAssignmentCard
                  key={assignment.id}
                  assignment={assignment}
                  onStatusChange={(status) => onStatusChange(assignment.id, status)}
                  isProcessing={isProcessing}
                  statusOptions={statusOptions}
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

const CampaignsView = ({ onBack }) => {
  const {
    currentUser,
    territories,
    addresses,
    addressesLoading,
    users,
    showToast
  } = useApp();
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
    handleActivateCampaign,
    handleCompleteCampaign,
    handleArchiveCampaign,
    handleDeleteCampaign,
    handleUpdateCampaignAssignmentStatus,
    handleResetCampaignAssignment,
    handleMoveCampaignAssignment,
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
  const [publisherFilter, setPublisherFilter] = useState(CAMPAIGN_PROGRESS_STATUSES.IN_PROGRESS);
  const [isCampaignMapOpen, setIsCampaignMapOpen] = useState(false);
  const [adminViewMode, setAdminViewMode] = useState('admin');
  const [isBusy, setIsBusy] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null);
  const [campaignPendingDelete, setCampaignPendingDelete] = useState(null);

  // ConfirmDialogs admin (activate / complete / archive / delete) son mutuamente
  // exclusivos; un solo registro cubre los cuatro.
  useBackHandler({
    isOpen: confirmAction !== null,
    onClose: () => {
      setConfirmAction(null);
      setCampaignPendingDelete(null);
    },
    id: 'campaigns-confirm-action'
  });
  const [adminScreen, setAdminScreen] = useState('hub');
  const [isTrackingExpanded, setIsTrackingExpanded] = useState(false);
  const [isAssignmentsExpanded, setIsAssignmentsExpanded] = useState(false);
  const hasAutoSelectedAdminViewRef = useRef(false);
  const campaignDateInputRef = useRef(null);

  const openCampaignDatePicker = () => {
    const input = campaignDateInputRef.current;
    if (!input || input.disabled) return;
    try {
      if (typeof input.showPicker === 'function') {
        input.showPicker();
        return;
      }
    } catch {
      // Safari puede lanzar si el gesto no es válido
    }
    input.focus();
  };

  useEffect(() => {
    if (!isAdmin) return;
    if (selectedCampaignId && campaigns.some((campaign) => campaign.id === selectedCampaignId)) return;

    const nextCampaignId = activeCampaign?.id || campaigns[0]?.id || null;
    setSelectedCampaignId(nextCampaignId);
  }, [activeCampaign, campaigns, isAdmin, selectedCampaignId]);

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

  const allTerritoryAddresses = useMemo(() => sortCampaignSourceAddresses(
    getEligibleCampaignAddresses(addresses, { territoryIds: allTerritoryIds }),
    territoryMap
  ), [addresses, allTerritoryIds, territoryMap]);

  const isReadOnlyCampaign = selectedCampaign && [CAMPAIGN_STATUSES.COMPLETED, CAMPAIGN_STATUSES.ARCHIVED].includes(selectedCampaign.status);

  useEffect(() => {
    const availableUsers = [...users]
      .sort((a, b) => a.name.localeCompare(b.name, 'es'));

    setParticipantSearch('');

    if (!selectedCampaign) {
      setCampaignForm({ ...DEFAULT_CAMPAIGN_FORM });
      setParticipantsDraft(availableUsers.map((user) => ({
        userId: user.id,
        userNameSnapshot: user.name,
        userRole: user.role,
        capacityWeight: 1,
        hardLimit: '',
        isEnabled: true
      })));
      return;
    }

    setCampaignForm({
      name: selectedCampaign.name || '',
      type: selectedCampaign.type || 'asamblea',
      eventDate: selectedCampaign.eventDate || ''
    });

    const participantsByUserId = new Map(
      selectedCampaignParticipants.map((participant) => [participant.userId, participant])
    );

    setParticipantsDraft(availableUsers.map((user) => {
      const participant = participantsByUserId.get(user.id);
      if (participant) {
        return {
          id: participant.id,
          userId: participant.userId,
          userNameSnapshot: participant.userNameSnapshot,
          userRole: user.role,
          capacityWeight: participant.capacityWeight ?? 1,
          hardLimit: participant.hardLimit ?? '',
          isEnabled: participant.isEnabled !== false
        };
      }

      return {
        userId: user.id,
        userNameSnapshot: user.name,
        userRole: user.role,
        capacityWeight: 1,
        hardLimit: '',
        isEnabled: true
      };
    }));
  }, [selectedCampaign, selectedCampaignParticipants, users]);

  useEffect(() => {
    if (adminViewMode !== 'admin') {
      setAdminScreen('hub');
      setIsTrackingExpanded(false);
      setIsAssignmentsExpanded(false);
    }
  }, [adminViewMode]);

  const usersAvailableForCampaign = useMemo(
    () => [...users].sort((a, b) => a.name.localeCompare(b.name, 'es')),
    [users]
  );

  const filteredParticipantsDraft = useMemo(() => {
    const normalizedSearch = normalizeSearchText(participantSearch);
    if (!normalizedSearch) return participantsDraft;

    return participantsDraft.filter((participant) => (
      normalizeSearchText(participant.userNameSnapshot).includes(normalizedSearch)
    ));
  }, [participantSearch, participantsDraft]);

  const participantTargetsPreview = useMemo(() => {
    const totalAddresses = allTerritoryAddresses.length;
    const enabledCount = participantsDraft.filter((participant) => participant.isEnabled !== false).length;

    if (totalAddresses === 0) {
      return { byUserId: {}, error: null };
    }

    if (enabledCount === 0) {
      return { byUserId: {}, error: 'Todos los hermanos están excluidos del reparto.' };
    }

    try {
      const targets = calculateCampaignTargets(participantsDraft, totalAddresses);
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

  const personalCampaign = useMemo(() => {
    if (activeCampaign) return activeCampaign;

    if (selectedCampaign && ![CAMPAIGN_STATUSES.COMPLETED, CAMPAIGN_STATUSES.ARCHIVED].includes(selectedCampaign.status)) {
      return selectedCampaign;
    }

    return campaigns.find((campaign) => (
      ![CAMPAIGN_STATUSES.COMPLETED, CAMPAIGN_STATUSES.ARCHIVED].includes(campaign.status)
    )) || null;
  }, [activeCampaign, campaigns, selectedCampaign]);

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

  const completedAssignmentsCount = selectedCampaignAssignments.filter(
    (assignment) => assignment.status === CAMPAIGN_PROGRESS_STATUSES.COMPLETED
  ).length;
  const pendingAssignmentsCount = selectedCampaignAssignments.filter(
    (assignment) => assignment.status === CAMPAIGN_PROGRESS_STATUSES.PENDING
  ).length;
  const inProgressAssignmentsCount = selectedCampaignAssignments.filter(
    (assignment) => assignment.status === CAMPAIGN_PROGRESS_STATUSES.IN_PROGRESS
  ).length;
  const enabledParticipantsCount = participantsDraft.filter((participant) => participant.isEnabled !== false).length;
  const progressPercent = selectedCampaignAssignments.length > 0
    ? Math.round((completedAssignmentsCount / selectedCampaignAssignments.length) * 100)
    : 0;
  const participantsReady = enabledParticipantsCount > 0;
  const assignmentsGenerated = selectedCampaignAssignments.length > 0;
  const campaignIsActive = selectedCampaign?.status === CAMPAIGN_STATUSES.ACTIVE;
  const hasActiveCampaign = Boolean(activeCampaign);
  const shouldHideSetupSteps = hasActiveCampaign;

  useEffect(() => {
    if (!hasActiveCampaign || !assignmentsGenerated) return;
    setIsTrackingExpanded(true);
  }, [hasActiveCampaign, assignmentsGenerated, selectedCampaignId]);

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
    ? `${selectedCampaign.name} · ${formatCampaignDate(selectedCampaign.eventDate)}`
    : 'Nueva campaña sin guardar';
  const step2Summary = `${enabledParticipantsCount} activos · ${allTerritoryAddresses.length} direcciones`;
  const step2Subtitle = `${enabledParticipantsCount} activos · ${allTerritoryAddresses.length} direcciones a repartir`;
  const step3Summary = assignmentsGenerated
    ? `${selectedCampaignAssignments.length} repartidas · ${completedAssignmentsCount} completadas`
    : participantsReady
      ? 'Listo para generar reparto'
      : 'Configura participantes primero';

  const adminHeaderSubtitle = useMemo(() => {
    if (!selectedCampaign) {
      return 'Sin campaña activa';
    }

    const name = selectedCampaign.name || 'Campaña sin nombre';

    if (selectedCampaign.status === CAMPAIGN_STATUSES.DRAFT) {
      return `${name} · Borrador`;
    }
    if (selectedCampaign.status === CAMPAIGN_STATUSES.ACTIVE) {
      return `${name} · ${formatCampaignDate(selectedCampaign.eventDate)}`;
    }
    if (selectedCampaign.status === CAMPAIGN_STATUSES.COMPLETED) {
      return `${name} · Completada`;
    }
    if (selectedCampaign.status === CAMPAIGN_STATUSES.ARCHIVED) {
      return `${name} · Archivada`;
    }

    return name;
  }, [selectedCampaign]);

  useEffect(() => {
    setPublisherFilter(CAMPAIGN_PROGRESS_STATUSES.IN_PROGRESS);
    setIsCampaignMapOpen(false);
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

      if (mode === 'auto') {
        return { ...updated, hardLimit: '' };
      }

      if (['1', '2', '3'].includes(mode)) {
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
      participants: participantsDraft
    });

    return campaignId;
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

  const executeAdminAction = async (action) => {
    setIsBusy(true);
    try {
      if (action === 'save') {
        await persistAdminDraft();
      }

      if (action === 'generate') {
        const campaignId = await persistAdminDraft();
        await handleGenerateCampaignAssignments(campaignId, { preferLatest: true });
      }

      if (action === 'activate') {
        const campaignId = await persistAdminDraft();
        await handleActivateCampaign(campaignId, { preferLatest: true });
      }

      if (action === 'complete' && selectedCampaign) {
        await handleCompleteCampaign(selectedCampaign.id);
      }

      if (action === 'archive' && selectedCampaign) {
        await handleArchiveCampaign(selectedCampaign.id);
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
      console.error('Error actualizando estado de campa\u00f1a:', error);
      showToast(error.message || 'No se pudo actualizar el avance.', 'error');
    } finally {
      setIsBusy(false);
    }
  };

  const handleMoveAssignment = async (assignment, nextUserId) => {
    if (assignment.assignedUserId === nextUserId) return;

    setIsBusy(true);
    try {
      await handleMoveCampaignAssignment(assignment.id, nextUserId);
    } catch (error) {
      console.error('Error moviendo asignaci\u00f3n:', error);
      showToast(error.message || 'No se pudo mover la asignaci\u00f3n.', 'error');
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
              {formatCampaignDate(campaign.eventDate)}
            </p>
            <p className={`text-sm mt-3 ${isSelected ? 'text-slate-100' : 'text-gray-600'}`}>
              Territorios: {allTerritoryIds.length} · Direcciones: {addressCount}
            </p>
          </button>
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
                  {activeCampaign ? `${activeCampaign.name} - ${formatCampaignDate(activeCampaign.eventDate)}` : 'Sin campa\u00f1a activa'}
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
            statusOptions={PUBLISHER_STATUS_OPTIONS}
            statusResolver={getPublisherAssignmentStatus}
            onOpenMap={() => setIsCampaignMapOpen(true)}
          />
        </div>

        <LazyCampaignAssignmentsMapModal
          isOpen={isCampaignMapOpen}
          onClose={() => setIsCampaignMapOpen(false)}
          campaign={personalCampaign}
          assignments={personalAssignments}
          onStatusChange={handlePublisherStatusChange}
          isProcessing={isBusy}
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
          {hasActiveCampaign ? (
            <span className="inline-flex shrink-0 items-center rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-800 sm:rounded-2xl sm:px-4 sm:py-2 sm:text-sm">
              Campaña activa
            </span>
          ) : null}
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
              statusOptions={PUBLISHER_STATUS_OPTIONS}
              statusResolver={getPublisherAssignmentStatus}
              onOpenMap={() => setIsCampaignMapOpen(true)}
            />
          </div>
        ) : (
          <>
        {selectedCampaign && assignmentsGenerated && (
          <section className="rounded-[30px] border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
                  <Icon name="barChart" size={18} />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-900">
                    {completedAssignmentsCount} de {selectedCampaignAssignments.length} completadas
                    <span className="ml-2 text-emerald-700">({progressPercent}%)</span>
                  </p>
                  <p className="text-xs text-slate-500">
                    {pendingAssignmentsCount} pendientes · {inProgressAssignmentsCount} en progreso
                  </p>
                </div>
              </div>
            </div>
            <div className="mt-3 h-3 w-full overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </section>
        )}

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

        {selectedCampaign && assignmentsGenerated && (
          <SectionCard
            title="Seguimiento del reparto"
            subtitle={'Vista r\u00e1pida del avance individual por participante'}
            icon="activity"
            eyebrow="Control"
            tone="emerald"
            isCollapsed={!isTrackingExpanded}
            rightSlot={(
              <SectionToggleButton
                isExpanded={isTrackingExpanded}
                onClick={() => setIsTrackingExpanded((prev) => !prev)}
                summaryLabel={`${participantSummary.length} participante${participantSummary.length !== 1 ? 's' : ''}`}
              />
            )}
          >
            {isTrackingExpanded ? (
              <div className="space-y-3">
                {participantSummary.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-4 text-sm text-gray-500">
                    {'A\u00fan no hay participantes configurados en esta campa\u00f1a.'}
                  </div>
                ) : participantSummary.map((participant) => (
                  <div key={participant.userId} className="rounded-2xl border border-gray-200 bg-white p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-gray-900">{participant.userNameSnapshot}</p>
                      </div>
                      <div className="text-right text-sm">
                        <p className="font-bold text-slate-800">{participant.total}</p>
                        <p className="text-xs text-gray-500">direcciones</p>
                      </div>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold">
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-700">Pendientes: {participant.pending}</span>
                      <span className="rounded-full bg-amber-100 px-2.5 py-1 text-amber-700">En progreso: {participant.inProgress}</span>
                      <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-emerald-700">Completadas: {participant.completed}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
          </SectionCard>
        )}

        {selectedCampaign && assignmentsGenerated && (
          <SectionCard
            title="Direcciones asignadas"
            subtitle={'Mueve, bloquea o resetea cada direcci\u00f3n de la campa\u00f1a sin tocar territorios ni revisitas'}
            isCollapsed={!isAssignmentsExpanded}
            rightSlot={(
              <SectionToggleButton
                isExpanded={isAssignmentsExpanded}
                onClick={() => setIsAssignmentsExpanded((prev) => !prev)}
                summaryLabel={`${selectedCampaignAssignments.length} ${selectedCampaignAssignments.length === 1 ? 'direcci\u00f3n' : 'direcciones'}`}
              />
            )}
          >
            {isAssignmentsExpanded ? (
              <>
                <div className="mb-5 rounded-3xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-sm font-bold text-slate-900">{'Aqu\u00ed puedes corregir el reparto sin empezar de nuevo'}</p>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    {'Usa esta lista para mover direcciones entre hermanos, bloquear asignaciones que no quieres alterar o resetear una direcci\u00f3n para devolverla a pendiente.'}
                  </p>
                </div>

                {selectedCampaignAssignments.length === 0 ? (
                  <EmptyState
                    icon="mail"
                    title={'A\u00fan no hay direcciones repartidas'}
                    description={'Guarda la campa\u00f1a y genera la asignaci\u00f3n autom\u00e1tica para empezar a administrar el seguimiento.'}
                  />
                ) : (
                  <div className="space-y-3">
                    {selectedCampaignAssignments.map((assignment) => {
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
                              <select
                                value={assignment.assignedUserId}
                                onChange={(event) => handleMoveAssignment(assignment, event.target.value)}
                                disabled={isBusy || assignment.status !== CAMPAIGN_PROGRESS_STATUSES.PENDING}
                                className="rounded-xl border border-gray-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
                              >
                                {selectedCampaignParticipants.map((participant) => (
                                  <option key={participant.userId} value={participant.userId}>{participant.userNameSnapshot}</option>
                                ))}
                              </select>
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
                    })}
                  </div>
                )}
              </>
            ) : null}
          </SectionCard>
        )}

        {campaignHistory.length > 0 && (
              <SectionCard title="Historial" subtitle={'Campa\u00f1as cerradas para consulta posterior'}>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {campaignHistory.map((campaign) => {
                return (
                  <div key={campaign.id} className="rounded-2xl border border-gray-200 bg-white p-4">
                    <div>
                      <div>
                        <p className="text-xs font-bold uppercase tracking-wide text-gray-500">{formatCampaignTypeLabel(campaign.type)}</p>
                        <h3 className="text-base font-bold text-gray-900 mt-1">{campaign.name}</h3>
                        <p className="text-sm text-gray-500 mt-1">{formatCampaignDate(campaign.eventDate)}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </SectionCard>
        )}
          </>
        )}
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
            onClick={handleSaveAndReturnToHub}
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
                <Icon name="save" size={18} />
                Guardar y volver
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
          <label className="space-y-2">
            <span id="campaign-type-label-step" className="text-sm font-semibold text-gray-700">Tipo</span>
            <CampaignTypeSelect
              value={campaignForm.type}
              onChange={(type) => setCampaignForm((previous) => ({ ...previous, type }))}
              disabled={isBusy || isReadOnlyCampaign}
            />
          </label>
          <label className="space-y-2 cursor-pointer" onClick={openCampaignDatePicker}>
            <span className="text-sm font-semibold text-gray-700">Fecha</span>
            <div className="group relative">
              <div className="pointer-events-none absolute left-3 top-1/2 z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-xl bg-sky-100 text-sky-700 group-has-[:disabled]:opacity-60">
                <Icon name="calendar" size={16} />
              </div>
              <input
                ref={campaignDateInputRef}
                type="date"
                value={campaignForm.eventDate}
                onChange={(event) => setCampaignForm((previous) => ({ ...previous, eventDate: event.target.value }))}
                onClick={(event) => {
                  event.stopPropagation();
                  openCampaignDatePicker();
                }}
                disabled={isBusy || isReadOnlyCampaign}
                className="w-full cursor-pointer rounded-2xl border border-gray-300 py-3 pl-12 pr-4 focus:border-slate-500 focus:outline-none disabled:cursor-not-allowed disabled:opacity-60 relative [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:inset-0 [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-0"
              />
            </div>
          </label>
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
          const closedCampaigns = campaigns.filter((c) => [CAMPAIGN_STATUSES.COMPLETED, CAMPAIGN_STATUSES.ARCHIVED].includes(c.status));

          if (campaigns.length === 0) {
            return null;
          }

          return (
            <div className="space-y-4">
              {editableCampaigns.length > 0 && (
                <div>
                  <p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-slate-500">En curso o borrador</p>
                  <div className="space-y-3">
                    {editableCampaigns.map(renderSelectableCampaignCard)}
                  </div>
                </div>
              )}
              {closedCampaigns.length > 0 && (
                <div>
                  <p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-slate-400">Cerradas</p>
                  <div className="space-y-3">
                    {closedCampaigns.map(renderSelectableCampaignCard)}
                  </div>
                </div>
              )}
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

        <div className="flex flex-wrap gap-2 text-sm">
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
              No hay hermanos que coincidan con la búsqueda.
            </div>
          ) : (
            filteredParticipantsDraft.map((participant) => {
              const currentMode = getParticipantAssignmentMode(participant);
              const assignedCount = participantTargetsPreview.byUserId[participant.userId];
              const previewBadge = getParticipantPreviewBadge(participant, assignedCount);
              const isIncluded = participant.isEnabled !== false;

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
        <div className="grid grid-cols-3 gap-2">
          <CampaignStatTile
            icon="mapPin"
            label="Direcciones"
            value={selectedCampaignAssignments.length}
          />
          <CampaignStatTile
            icon="clock"
            label="Pendientes"
            value={pendingAssignmentsCount}
          />
          <CampaignStatTile
            icon="checkCircle"
            label="Completadas"
            value={completedAssignmentsCount}
          />
        </div>

        <div className="flex flex-wrap gap-2">
          {!campaignIsActive && assignmentsGenerated && (
            <button
              type="button"
              onClick={() => executeAdminAction('save')}
              disabled={isBusy || isReadOnlyCampaign}
              className="min-h-[44px] rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition-colors hover:border-slate-400 disabled:opacity-60"
            >
              Guardar campaña
            </button>
          )}
          {assignmentsGenerated && (
            <button
              type="button"
              onClick={() => executeAdminAction('generate')}
              disabled={isBusy || isReadOnlyCampaign}
              className="min-h-[44px] rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition-colors hover:border-slate-400 disabled:opacity-60"
            >
              Regenerar reparto
            </button>
          )}
          {campaignIsActive && (
            <button
              type="button"
              onClick={() => setConfirmAction('complete')}
              disabled={isBusy}
              className="min-h-[44px] rounded-2xl border border-blue-300 bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-700 transition-colors hover:border-blue-400 disabled:opacity-60"
            >
              Completar campaña
            </button>
          )}
          {selectedCampaign && selectedCampaign.status !== CAMPAIGN_STATUSES.ARCHIVED && (
            <button
              type="button"
              onClick={() => setConfirmAction('archive')}
              disabled={isBusy}
              className="min-h-[44px] rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-500 transition-colors hover:border-slate-400 disabled:opacity-60"
            >
              Archivar
            </button>
          )}
        </div>

        {!assignmentsGenerated && (
          <p className="text-sm text-slate-500">
            Cuando generes la asignación, podrás ver el seguimiento y el detalle de direcciones en el hub.
          </p>
        )}
      </CampaignStepShell>

      </div>

      <LazyCampaignAssignmentsMapModal
        isOpen={isCampaignMapOpen}
        onClose={() => setIsCampaignMapOpen(false)}
        campaign={personalCampaign}
        assignments={personalAssignments}
        onStatusChange={handlePublisherStatusChange}
        isProcessing={isBusy}
      />

      <ConfirmDialog
        isOpen={confirmAction === 'activate'}
        onClose={() => setConfirmAction(null)}
        onConfirm={() => executeAdminAction('activate')}
                  title={'Activar campa\u00f1a'}
                  message={(() => {
                    const counts = participantSummary.filter((p) => p.total > 0).map((p) => p.total);
                    const minCount = counts.length > 0 ? Math.min(...counts) : 0;
                    const maxCount = counts.length > 0 ? Math.max(...counts) : 0;
                    const participantCount = counts.length;
                    return `Vas a activar "${selectedCampaign?.name || ''}" con ${selectedCampaignAssignments.length} direcciones repartidas entre ${participantCount} hermanos. Cada uno recibir\u00e1 entre ${minCount} y ${maxCount} direcciones. Una vez activa, los hermanos podr\u00e1n ver sus asignaciones.`;
                  })()}
        confirmText={'S\u00ed, activar'}
        cancelText="Cancelar"
        type="success"
        isProcessing={isBusy}
      />

      <ConfirmDialog
        isOpen={confirmAction === 'complete'}
        onClose={() => setConfirmAction(null)}
        onConfirm={() => executeAdminAction('complete')}
                  title={'Completar campa\u00f1a'}
                  message={'\u00bfSeguro que quieres cerrar esta campa\u00f1a activa y moverla al historial?'}
        confirmText="Si, completar"
        cancelText="Cancelar"
        type="success"
        isProcessing={isBusy}
      />

      <ConfirmDialog
        isOpen={confirmAction === 'archive'}
        onClose={() => {
          setConfirmAction(null);
          setCampaignPendingDelete(null);
        }}
        onConfirm={() => executeAdminAction('archive')}
                  title={'Archivar campa\u00f1a'}
                  message={'\u00bfSeguro que quieres archivar esta campa\u00f1a? Seguir\u00e1 disponible en el historial.'}
        confirmText="Si, archivar"
        cancelText="Cancelar"
        type="warning"
        isProcessing={isBusy}
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
      />
    </div>
  );
};

export default CampaignsView;
