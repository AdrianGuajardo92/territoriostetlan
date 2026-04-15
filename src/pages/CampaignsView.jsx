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
  groupAssignmentsByTerritory,
  sortCampaignSourceAddresses
} from '../utils/campaignUtils';
import { LazyCampaignAssignmentsMapModal } from '../components/modals/LazyModals';

const DEFAULT_CAMPAIGN_FORM = {
  name: '',
  type: 'asamblea',
  eventDate: '',
  sourceTerritoryIds: [],
  excludedAddressIds: []
};

const PUBLISHER_FILTER_OPTIONS = [
  { id: CAMPAIGN_PROGRESS_STATUSES.IN_PROGRESS, label: 'En progreso' },
  { id: CAMPAIGN_PROGRESS_STATUSES.COMPLETED, label: 'Completadas' }
];

const PUBLISHER_STATUS_OPTIONS = [
  { id: CAMPAIGN_PROGRESS_STATUSES.IN_PROGRESS, label: 'En progreso' },
  { id: CAMPAIGN_PROGRESS_STATUSES.COMPLETED, label: 'Completada' }
];

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

  if (snapshot.address) {
    return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(snapshot.address)}`;
  }

  return '';
};

const normalizeSearchText = (value = '') => String(value || '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .trim();

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

const EmptyState = ({ icon = 'mail', title, description }) => (
  <div className="bg-white rounded-3xl border border-dashed border-gray-300 p-10 text-center shadow-sm">
    <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
      <Icon name={icon} size={28} className="text-slate-500" />
    </div>
    <h3 className="text-lg font-bold text-gray-900 mb-2">{title}</h3>
    <p className="text-sm text-gray-600 max-w-md mx-auto">{description}</p>
  </div>
);

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
            {assignment.groupLabelSnapshot && (
              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                {assignment.groupLabelSnapshot}
              </span>
            )}
          </div>
          <h4 className="text-base font-bold text-gray-900">{snapshot.address || 'Direcci\u00f3n sin dato'}</h4>
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

      {(snapshot.name || snapshot.phone || snapshot.notes) && (
        <div className="space-y-2 text-sm text-gray-700">
          {snapshot.name && <p><span className="font-semibold text-gray-500">Nombre:</span> {snapshot.name}</p>}
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
      <EmptyState
        icon="calendar"
        title={'A\u00fan no hay una campa\u00f1a activa'}
        description={'Cuando los administradores preparen una campa\u00f1a, aqu\u00ed aparecer\u00e1n tus direcciones asignadas.'}
      />
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
    users,
    showToast
  } = useApp();
  const {
    campaigns,
    campaignGroups,
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
  const [groupsDraft, setGroupsDraft] = useState([]);
  const [newGroupLabel, setNewGroupLabel] = useState('');
  const [expandedParticipantId, setExpandedParticipantId] = useState(null);
  const [participantSearch, setParticipantSearch] = useState('');
  const [publisherFilter, setPublisherFilter] = useState(CAMPAIGN_PROGRESS_STATUSES.IN_PROGRESS);
  const [isCampaignMapOpen, setIsCampaignMapOpen] = useState(false);
  const [adminViewMode, setAdminViewMode] = useState('admin');
  const [isBusy, setIsBusy] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null);

  // ConfirmDialogs admin (activate / complete / archive) son mutuamente
  // exclusivos; un solo registro cubre los tres.
  useBackHandler({
    isOpen: confirmAction !== null,
    onClose: () => setConfirmAction(null),
    id: 'campaigns-confirm-action'
  });
  const [isStepOneExpanded, setIsStepOneExpanded] = useState(false);
  const [isStepTwoExpanded, setIsStepTwoExpanded] = useState(false);
  const [isStepThreeExpanded, setIsStepThreeExpanded] = useState(false);
  const [isTrackingExpanded, setIsTrackingExpanded] = useState(false);
  const [isAssignmentsExpanded, setIsAssignmentsExpanded] = useState(false);
  const hasAutoSelectedAdminViewRef = useRef(false);

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

  const selectedCampaignGroups = useMemo(() => {
    if (!selectedCampaign) return [];
    return campaignGroups
      .filter((group) => group.campaignId === selectedCampaign.id)
      .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
  }, [campaignGroups, selectedCampaign]);

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
        return String(a.addressSnapshot?.address || '').localeCompare(String(b.addressSnapshot?.address || ''), 'es', { numeric: true });
      });
  }, [campaignAssignments, selectedCampaign]);

  const campaignSourceAddresses = useMemo(() => {
    const includedTerritoryIds = new Set(campaignForm.sourceTerritoryIds.length > 0 ? campaignForm.sourceTerritoryIds : allTerritoryIds);
    const excludedIds = new Set(campaignForm.excludedAddressIds || []);
    const sourceAddresses = addresses.filter((address) => {
      if (!includedTerritoryIds.has(address.territoryId)) return false;
      if (address.deleted) return false;
      if (excludedIds.has(address.id)) return false;
      return true;
    });

    return sortCampaignSourceAddresses(sourceAddresses, territoryMap);
  }, [addresses, allTerritoryIds, campaignForm.excludedAddressIds, campaignForm.sourceTerritoryIds, territoryMap]);

  const selectedCandidateAddresses = useMemo(() => campaignSourceAddresses, [campaignSourceAddresses]);

  const allTerritoryAddresses = useMemo(() => {
    const includedTerritoryIds = new Set(campaignForm.sourceTerritoryIds.length > 0 ? campaignForm.sourceTerritoryIds : allTerritoryIds);
    return addresses
      .filter((a) => includedTerritoryIds.has(a.territoryId) && !a.deleted)
      .sort((a, b) => {
        const tA = territoryMap[a.territoryId]?.name || '';
        const tB = territoryMap[b.territoryId]?.name || '';
        return tA.localeCompare(tB, 'es', { numeric: true }) || (a.street || a.address || '').localeCompare(b.street || b.address || '', 'es');
      });
  }, [addresses, allTerritoryIds, campaignForm.sourceTerritoryIds, territoryMap]);

  const isReadOnlyCampaign = selectedCampaign && [CAMPAIGN_STATUSES.COMPLETED, CAMPAIGN_STATUSES.ARCHIVED].includes(selectedCampaign.status);

  useEffect(() => {
    const availableUsers = [...users]
      .sort((a, b) => a.name.localeCompare(b.name, 'es'));

    setExpandedParticipantId(null);
    setParticipantSearch('');

    if (!selectedCampaign) {
      setCampaignForm({
        ...DEFAULT_CAMPAIGN_FORM,
        sourceTerritoryIds: allTerritoryIds,
        excludedAddressIds: []
      });
      setParticipantsDraft(availableUsers.map((user) => ({
        userId: user.id,
        userNameSnapshot: user.name,
        userRole: user.role,
        groupId: null,
        capacityWeight: 1,
        hardLimit: '',
        isEnabled: true
      })));
      setGroupsDraft([]);
      return;
    }

    setCampaignForm({
      name: selectedCampaign.name || '',
      type: selectedCampaign.type || 'asamblea',
      eventDate: selectedCampaign.eventDate || '',
      sourceTerritoryIds: allTerritoryIds,
      excludedAddressIds: []
    });

    setGroupsDraft(selectedCampaignGroups.map((group) => ({
      id: group.id,
      label: group.label || ''
    })));

    const participantsByUserId = new Map(
      selectedCampaignParticipants.map((participant) => [participant.userId, participant])
    );
    const hasSavedParticipants = selectedCampaignParticipants.length > 0;

    setParticipantsDraft(availableUsers.map((user) => {
      const participant = participantsByUserId.get(user.id);
      if (participant) {
        return {
          id: participant.id,
          userId: participant.userId,
          userNameSnapshot: participant.userNameSnapshot,
          userRole: user.role,
          groupId: participant.groupId || null,
          capacityWeight: participant.capacityWeight ?? 1,
          hardLimit: participant.hardLimit ?? '',
          isEnabled: participant.isEnabled !== false
        };
      }

      return {
        userId: user.id,
        userNameSnapshot: user.name,
        userRole: user.role,
        groupId: null,
        capacityWeight: 1,
        hardLimit: '',
        isEnabled: true
      };
    }));
  }, [allTerritoryIds, selectedCampaign, selectedCampaignGroups, selectedCampaignParticipants, users]);

  useEffect(() => {
    if (!expandedParticipantId) return;

    const participantStillExists = participantsDraft.some((participant) => participant.userId === expandedParticipantId);
    if (!participantStillExists) {
      setExpandedParticipantId(null);
    }
  }, [expandedParticipantId, participantsDraft]);

  useEffect(() => {
    if (!isAdmin || adminViewMode !== 'admin') {
      setIsStepOneExpanded(false);
      setIsStepTwoExpanded(false);
      setIsStepThreeExpanded(false);
      setIsTrackingExpanded(false);
      setIsAssignmentsExpanded(false);
      return;
    }

    const campaign = campaigns.find((c) => c.id === selectedCampaignId);
    const hasAssignments = campaignAssignments.some((a) => a.campaignId === selectedCampaignId);
    const hasParticipants = campaignParticipants.some((p) => p.campaignId === selectedCampaignId);
    const isActive = campaign?.status === CAMPAIGN_STATUSES.ACTIVE;

    if (isActive && hasAssignments) {
      setIsStepOneExpanded(false);
      setIsStepTwoExpanded(false);
      setIsStepThreeExpanded(false);
      setIsTrackingExpanded(true);
      setIsAssignmentsExpanded(false);
    } else if (hasParticipants && !hasAssignments) {
      setIsStepOneExpanded(false);
      setIsStepTwoExpanded(false);
      setIsStepThreeExpanded(true);
      setIsTrackingExpanded(false);
      setIsAssignmentsExpanded(false);
    } else if (campaign && !hasParticipants) {
      setIsStepOneExpanded(false);
      setIsStepTwoExpanded(true);
      setIsStepThreeExpanded(false);
      setIsTrackingExpanded(false);
      setIsAssignmentsExpanded(false);
    } else if (!campaign) {
      setIsStepOneExpanded(true);
      setIsStepTwoExpanded(false);
      setIsStepThreeExpanded(false);
      setIsTrackingExpanded(false);
      setIsAssignmentsExpanded(false);
    } else {
      setIsStepOneExpanded(false);
      setIsStepTwoExpanded(false);
      setIsStepThreeExpanded(false);
      setIsTrackingExpanded(false);
      setIsAssignmentsExpanded(false);
    }
  }, [adminViewMode, campaignAssignments, campaignParticipants, campaigns, isAdmin, selectedCampaignId]);

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

  const groupOptionsById = useMemo(
    () => groupsDraft.reduce((accumulator, group) => {
      accumulator[group.id] = group;
      return accumulator;
    }, {}),
    [groupsDraft]
  );

  const participantSummary = useMemo(() => {
    const sourceParticipants = isAdmin ? participantsDraft : [];

    return sourceParticipants.map((participant) => {
      const assignmentsForParticipant = selectedCampaignAssignments.filter(
        (assignment) => assignment.assignedUserId === participant.userId
      );
      return {
        ...participant,
        groupLabel: participant.groupId ? groupOptionsById[participant.groupId]?.label || 'Grupo' : 'Sin grupo',
        total: assignmentsForParticipant.length,
        pending: assignmentsForParticipant.filter((assignment) => assignment.status === CAMPAIGN_PROGRESS_STATUSES.PENDING).length,
        inProgress: assignmentsForParticipant.filter((assignment) => assignment.status === CAMPAIGN_PROGRESS_STATUSES.IN_PROGRESS).length,
        completed: assignmentsForParticipant.filter((assignment) => assignment.status === CAMPAIGN_PROGRESS_STATUSES.COMPLETED).length
      };
    });
  }, [groupOptionsById, isAdmin, participantsDraft, selectedCampaignAssignments]);

  const groupSummary = useMemo(() => {
    if (!isAdmin) return [];

    const summary = groupsDraft.map((group) => {
      const memberIds = participantsDraft.filter((participant) => participant.groupId === group.id).map((participant) => participant.userId);
      const assignmentsForGroup = selectedCampaignAssignments.filter((assignment) => memberIds.includes(assignment.assignedUserId));
      return {
        id: group.id,
        label: group.label,
        members: memberIds.length,
        total: assignmentsForGroup.length,
        completed: assignmentsForGroup.filter((assignment) => assignment.status === CAMPAIGN_PROGRESS_STATUSES.COMPLETED).length
      };
    });

    const groupLessMembers = participantsDraft.filter((participant) => !participant.groupId);
    if (groupLessMembers.length > 0) {
      const groupLessAssignments = selectedCampaignAssignments.filter((assignment) => (
        groupLessMembers.some((participant) => participant.userId === assignment.assignedUserId)
      ));
      summary.push({
        id: 'sin-grupo',
        label: 'Sin grupo',
        members: groupLessMembers.length,
        total: groupLessAssignments.length,
        completed: groupLessAssignments.filter((assignment) => assignment.status === CAMPAIGN_PROGRESS_STATUSES.COMPLETED).length
      });
    }

    return summary;
  }, [groupsDraft, isAdmin, participantsDraft, selectedCampaignAssignments]);

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
        return String(a.addressSnapshot?.address || '').localeCompare(String(b.addressSnapshot?.address || ''), 'es', { numeric: true });
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
  const basicsReady = Boolean(campaignForm.name.trim()) && Boolean(campaignForm.eventDate);
  const participantsReady = enabledParticipantsCount > 0;
  const assignmentsGenerated = selectedCampaignAssignments.length > 0;
  const campaignIsActive = selectedCampaign?.status === CAMPAIGN_STATUSES.ACTIVE;
  const hasActiveCampaign = Boolean(activeCampaign);
  const shouldHideSetupSteps = hasActiveCampaign;
  const adminOverviewTitle = shouldHideSetupSteps ? 'Campaña activa en curso' : 'Crea la campaña en 3 pasos';
  const adminNextRecommendedAction = !basicsReady
    ? 'Completa primero el nombre y la fecha.'
    : !participantsReady
      ? 'Deja al menos un hermano incluido para la campa\u00f1a.'
      : !assignmentsGenerated
        ? 'Genera la asignaci\u00f3n autom\u00e1tica para repartir las direcciones.'
        : !campaignIsActive
          ? 'Activa la campa\u00f1a cuando ya revisaste el reparto.'
          : 'La campa\u00f1a ya est\u00e1 activa. Ahora solo toca dar seguimiento.';
  const adminOverviewDescription = shouldHideSetupSteps
    ? 'Solo se muestra el reparto y el seguimiento de la campaña activa. Completa o archiva la actual antes de preparar otra.'
    : adminNextRecommendedAction;
  const adminOverviewSteps = shouldHideSetupSteps
    ? [{ step: '3', label: 'Reparto', ready: true, active: false }]
    : [
        { step: '1', label: 'Campa\u00f1a', ready: basicsReady, active: !basicsReady },
        { step: '2', label: 'Hermanos', ready: participantsReady, active: basicsReady && !participantsReady },
        { step: '3', label: 'Reparto', ready: assignmentsGenerated, active: participantsReady && !assignmentsGenerated }
      ];

  useEffect(() => {
    setPublisherFilter(CAMPAIGN_PROGRESS_STATUSES.IN_PROGRESS);
    setIsCampaignMapOpen(false);
  }, [personalCampaign?.id]);

  const handleCreateNewDraft = () => {
    if (hasActiveCampaign) {
      showToast('Ya existe una campaña activa. Completa o archiva la actual antes de preparar otra.', 'warning');
      return;
    }

    setAdminViewMode('admin');
    setSelectedCampaignId(null);
    setCampaignForm({
      ...DEFAULT_CAMPAIGN_FORM,
      sourceTerritoryIds: allTerritoryIds,
      excludedAddressIds: []
    });
    setExpandedParticipantId(null);
    setParticipantSearch('');
    setParticipantsDraft(usersAvailableForCampaign.map((user) => ({
      userId: user.id,
      userNameSnapshot: user.name,
      userRole: user.role,
      groupId: null,
      capacityWeight: 1,
      hardLimit: '',
      isEnabled: true
    })));
    setGroupsDraft([]);
  };

  const updateParticipantDraft = (userId, key, value) => {
    setParticipantsDraft((previous) => previous.map((participant) => (
      participant.userId === userId
        ? { ...participant, [key]: value }
        : participant
    )));
  };

  const addGroupDraft = () => {
    const label = newGroupLabel.trim();
    if (!label) return;

    setGroupsDraft((previous) => [
      ...previous,
      { id: `temp-group-${Date.now()}`, label }
    ]);
    setNewGroupLabel('');
  };

  const updateGroupDraft = (groupId, value) => {
    setGroupsDraft((previous) => previous.map((group) => (
      group.id === groupId ? { ...group, label: value } : group
    )));
  };

  const removeGroupDraft = (groupId) => {
    setGroupsDraft((previous) => previous.filter((group) => group.id !== groupId));
    setParticipantsDraft((previous) => previous.map((participant) => (
      participant.groupId === groupId ? { ...participant, groupId: null } : participant
    )));
  };

  const persistAdminDraft = async () => {
    let campaignId = selectedCampaignId;
    const draftPayload = {
      ...campaignForm,
      sourceTerritoryIds: allTerritoryIds,
      excludedAddressIds: []
    };

    if (campaignId) {
      await handleUpdateCampaign(campaignId, draftPayload);
    } else {
      campaignId = await handleCreateCampaign(draftPayload);
      setSelectedCampaignId(campaignId);
    }

    await handleSaveCampaignStructure(campaignId, {
      groups: groupsDraft,
      participants: participantsDraft
    });

    return campaignId;
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
        <div className="shadow-xl px-4 py-4" style={{ backgroundColor: '#2C3E50' }}>
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <button
                onClick={onBack}
                className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center backdrop-blur-sm hover:bg-white/20 transition-all"
              >
                <Icon name="arrowLeft" size={18} className="text-white" />
              </button>
              <div>
                <h1 className="text-xl font-bold text-white">Direcciones por visitar</h1>
                <p className="text-white/70 text-sm">
                  {activeCampaign ? `${activeCampaign.name} - ${formatCampaignDate(activeCampaign.eventDate)}` : 'Sin campa\u00f1a activa'}
                </p>
              </div>
            </div>
            <div className="w-11 h-11 rounded-2xl bg-white/10 flex items-center justify-center">
              <Icon name="mail" size={20} className="text-white" />
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
      <div className="shadow-xl px-4 py-4" style={{ backgroundColor: '#2C3E50' }}>
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center backdrop-blur-sm hover:bg-white/20 transition-all"
            >
              <Icon name="arrowLeft" size={18} className="text-white" />
            </button>
            <div>
                <h1 className="text-xl font-bold text-white">{'Campa\u00f1as e Invitaciones'}</h1>
                <p className="text-white/70 text-sm">{'M\u00f3dulo de asignaci\u00f3n personal y seguimiento en tiempo real'}</p>
            </div>
          </div>
          {hasActiveCampaign ? (
            <span className="inline-flex items-center rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-bold text-emerald-800">
              Campaña activa
            </span>
          ) : (
            <button
              onClick={handleCreateNewDraft}
              className="px-4 py-2 rounded-2xl bg-white text-slate-800 font-semibold shadow-sm hover:bg-slate-100 transition-colors"
            >
              {'Nueva campa\u00f1a'}
            </button>
          )}
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-6">
        <section className="rounded-[30px] border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Modo</p>
              <h2 className="mt-1 text-lg font-bold text-slate-900">{'Administra la campa\u00f1a o revisa tus direcciones'}</h2>
              <p className="mt-1 text-sm text-slate-600">{'Aqu\u00ed puedes gestionar el reparto y tambi\u00e9n ver las direcciones asignadas para ti.'}</p>
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <button
                onClick={() => setAdminViewMode('admin')}
                className={`rounded-2xl border px-4 py-3 text-left transition-all ${
                  adminViewMode === 'admin'
                    ? 'border-slate-800 bg-slate-800 text-white shadow-sm'
                    : 'border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-400'
                }`}
              >
                <p className="text-sm font-bold">Administrar</p>
                <p className={`mt-1 text-xs ${adminViewMode === 'admin' ? 'text-slate-200' : 'text-slate-500'}`}>
                  {'Crear, repartir y ajustar la campa\u00f1a'}
                </p>
              </button>
              <button
                onClick={() => setAdminViewMode('personal')}
                className={`rounded-2xl border px-4 py-3 text-left transition-all ${
                  adminViewMode === 'personal'
                    ? 'border-indigo-700 bg-indigo-700 text-white shadow-sm'
                    : 'border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-400'
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-bold">Direcciones por visitar</p>
                  {personalPendingAssignmentsCount > 0 && (
                    <span className={`inline-flex min-w-[28px] items-center justify-center rounded-full px-2 py-1 text-xs font-bold ${
                      adminViewMode === 'personal' ? 'bg-white text-indigo-700' : 'bg-indigo-100 text-indigo-700'
                    }`}>
                      {personalPendingAssignmentsCount}
                    </span>
                  )}
                </div>
                <p className={`mt-1 text-xs ${adminViewMode === 'personal' ? 'text-indigo-100' : 'text-slate-500'}`}>
                  Ver solo las direcciones asignadas para ti
                </p>
              </button>
            </div>
          </div>
        </section>

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
        <section className="rounded-[30px] border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900">{adminOverviewTitle}</h2>
              <p className="mt-1 text-sm text-slate-600">{adminOverviewDescription}</p>
            </div>
            <div className={`grid gap-2 ${adminOverviewSteps.length === 1 ? 'grid-cols-1' : 'grid-cols-3'}`}>
              {adminOverviewSteps.map((item) => (
                <div
                  key={item.step}
                  className={`rounded-2xl border px-4 py-3 text-center ${
                    item.ready
                      ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
                      : item.active
                        ? 'border-indigo-200 bg-indigo-50 text-indigo-950'
                        : 'border-slate-200 bg-slate-50 text-slate-600'
                  }`}
                >
                  <p className="text-xs font-bold uppercase tracking-[0.18em]">Paso {item.step}</p>
                  <p className="mt-1 text-sm font-bold">{item.label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

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

        {!shouldHideSetupSteps && (
          <>
        <SectionCard
          title={'Paso 1. Crea o edita la campa\u00f1a'}
          subtitle={'Elige una campa\u00f1a y llena nombre, tipo y fecha'}
          icon="calendar"
          eyebrow="Paso 1"
          tone="indigo"
          isCollapsed={!isStepOneExpanded}
          rightSlot={(
            <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
              <SectionToggleButton
                isExpanded={isStepOneExpanded}
                onClick={() => setIsStepOneExpanded((prev) => !prev)}
                summaryLabel={selectedCampaign ? 'Datos de campaña' : 'Nueva campaña'}
              />
            </div>
          )}
        >
          {isStepOneExpanded ? (
            <>
          <div className="mb-4 flex flex-wrap items-center gap-2 text-sm text-slate-600">
            <span className="rounded-full bg-slate-100 px-3 py-1 font-semibold text-slate-700">
              {campaigns.length} campa{'\u00f1'}a{campaigns.length !== 1 ? 's' : ''}
            </span>
            <span className="rounded-full bg-slate-100 px-3 py-1 font-semibold text-slate-700">
              {selectedCampaign ? `Actual: ${selectedCampaign.name}` : 'Campaña nueva'}
            </span>
          </div>

          {(() => {
            const editableCampaigns = campaigns.filter((c) => [CAMPAIGN_STATUSES.DRAFT, CAMPAIGN_STATUSES.ACTIVE].includes(c.status));
            const closedCampaigns = campaigns.filter((c) => [CAMPAIGN_STATUSES.COMPLETED, CAMPAIGN_STATUSES.ARCHIVED].includes(c.status));

            if (campaigns.length === 0) {
              return (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                  {'A\u00fan no hay campa\u00f1as guardadas. Llena los datos de abajo y guarda la campa\u00f1a.'}
                </div>
              );
            }

            const renderCampaignCard = (campaign) => {
              const isSelected = campaign.id === selectedCampaignId;
              return (
                <button
                  key={campaign.id}
                  onClick={() => setSelectedCampaignId(campaign.id)}
                  className={`text-left rounded-3xl border p-4 transition-all ${
                    isSelected
                      ? 'border-slate-800 bg-slate-800 text-white shadow-lg'
                      : 'border-gray-200 bg-white hover:border-slate-400 hover:shadow-sm'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className={`text-xs font-bold uppercase tracking-wide ${isSelected ? 'text-slate-200' : 'text-gray-500'}`}>
                        {formatCampaignTypeLabel(campaign.type)}
                      </p>
                      <h3 className="text-lg font-bold mt-1">{campaign.name}</h3>
                      <p className={`text-sm mt-1 ${isSelected ? 'text-slate-200' : 'text-gray-500'}`}>
                        {formatCampaignDate(campaign.eventDate)}
                      </p>
                    </div>
                  </div>
                  <p className={`text-sm mt-3 ${isSelected ? 'text-slate-100' : 'text-gray-600'}`}>
                    Territorios: {campaign.sourceTerritoryIds?.length || allTerritoryIds.length} · Direcciones: {campaign.addressCountSnapshot || 0}
                  </p>
                </button>
              );
            };

            return (
              <div className="space-y-4">
                {editableCampaigns.length > 0 && (
                  <div>
                    <p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-slate-500">En curso o borrador</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                      {editableCampaigns.map(renderCampaignCard)}
                    </div>
                  </div>
                )}
                {closedCampaigns.length > 0 && (
                  <div>
                    <p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-slate-400">Cerradas</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                      {closedCampaigns.map(renderCampaignCard)}
                    </div>
                  </div>
                )}
              </div>
            );
          })()}

          <div className="mt-5 rounded-3xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-center justify-between gap-3 mb-3">
              <p className="text-sm font-semibold text-slate-700">Territorios incluidos</p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setCampaignForm((prev) => ({ ...prev, sourceTerritoryIds: [...allTerritoryIds] }))}
                  disabled={isBusy || isReadOnlyCampaign}
                  className="text-xs font-semibold text-indigo-700 hover:text-indigo-900 disabled:opacity-60"
                >
                  Todos
                </button>
                <span className="text-xs text-slate-300">|</span>
                <button
                  type="button"
                  onClick={() => setCampaignForm((prev) => ({ ...prev, sourceTerritoryIds: [] }))}
                  disabled={isBusy || isReadOnlyCampaign}
                  className="text-xs font-semibold text-slate-500 hover:text-slate-700 disabled:opacity-60"
                >
                  Ninguno
                </button>
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6 gap-2 max-h-[200px] overflow-y-auto pr-1">
              {territories.map((territory) => {
                const isIncluded = campaignForm.sourceTerritoryIds.includes(territory.id);
                const addressCount = addresses.filter((a) => a.territoryId === territory.id && !a.deleted).length;
                return (
                  <label
                    key={territory.id}
                    className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-sm cursor-pointer transition-all ${
                      isIncluded
                        ? 'border-indigo-200 bg-indigo-50 text-indigo-900'
                        : 'border-slate-200 bg-white text-slate-500'
                    } ${isBusy || isReadOnlyCampaign ? 'opacity-60 pointer-events-none' : ''}`}
                  >
                    <input
                      type="checkbox"
                      checked={isIncluded}
                      onChange={() => {
                        setCampaignForm((prev) => ({
                          ...prev,
                          sourceTerritoryIds: isIncluded
                            ? prev.sourceTerritoryIds.filter((id) => id !== territory.id)
                            : [...prev.sourceTerritoryIds, territory.id]
                        }));
                      }}
                      disabled={isBusy || isReadOnlyCampaign}
                      className="rounded"
                    />
                    <span className="truncate font-semibold">{territory.name || territory.number || territory.id}</span>
                    <span className="ml-auto text-xs text-slate-400">{addressCount}</span>
                  </label>
                );
              })}
            </div>
          </div>

          {allTerritoryAddresses.length > 0 && (
            <details className="mt-5 rounded-3xl border border-slate-200 bg-slate-50 group">
              <summary className="flex cursor-pointer items-center justify-between gap-3 p-4 select-none list-none [&::-webkit-details-marker]:hidden">
                <div className="flex items-center gap-3">
                  <p className="text-sm font-semibold text-slate-700">Excluir direcciones</p>
                  {campaignForm.excludedAddressIds.length > 0 && (
                    <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-bold text-amber-800">
                      {campaignForm.excludedAddressIds.length} excluidas
                    </span>
                  )}
                </div>
                <Icon name="chevronDown" size={16} className="text-slate-400 transition-transform group-open:rotate-180" />
              </summary>
              <div className="border-t border-slate-200 p-4">
                {campaignForm.excludedAddressIds.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setCampaignForm((prev) => ({ ...prev, excludedAddressIds: [] }))}
                    disabled={isBusy || isReadOnlyCampaign}
                    className="mb-3 text-xs font-semibold text-indigo-700 hover:text-indigo-900 disabled:opacity-60"
                  >
                    Incluir todas
                  </button>
                )}
                <div className="max-h-[240px] overflow-y-auto pr-1 space-y-1">
                  {allTerritoryAddresses.map((address) => {
                    const isExcluded = campaignForm.excludedAddressIds.includes(address.id);
                    const territory = territories.find((t) => t.id === address.territoryId);
                    return (
                      <label
                        key={address.id}
                        className={`flex items-center gap-3 rounded-xl border px-3 py-2 text-sm cursor-pointer transition-all ${
                          isExcluded
                            ? 'border-amber-200 bg-amber-50 text-amber-800 line-through'
                            : 'border-slate-100 bg-white text-slate-700'
                        } ${isBusy || isReadOnlyCampaign ? 'opacity-60 pointer-events-none' : ''}`}
                      >
                        <input
                          type="checkbox"
                          checked={!isExcluded}
                          onChange={() => {
                            setCampaignForm((prev) => ({
                              ...prev,
                              excludedAddressIds: isExcluded
                                ? prev.excludedAddressIds.filter((id) => id !== address.id)
                                : [...prev.excludedAddressIds, address.id]
                            }));
                          }}
                          disabled={isBusy || isReadOnlyCampaign}
                          className="rounded"
                        />
                        <span className="truncate">{address.street || address.address || address.id}</span>
                        {territory && (
                          <span className="ml-auto shrink-0 text-xs text-slate-400">T{territory.name || territory.number}</span>
                        )}
                      </label>
                    );
                  })}
                </div>
              </div>
            </details>
          )}

          <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <label className="space-y-2">
                <span className="text-sm font-semibold text-gray-700">Nombre</span>
                <input
                  value={campaignForm.name}
                  onChange={(event) => setCampaignForm((previous) => ({ ...previous, name: event.target.value }))}
                  disabled={isBusy || isReadOnlyCampaign}
                  className="w-full px-4 py-3 rounded-2xl border border-gray-300 focus:border-slate-500 focus:outline-none"
                  placeholder={'Invitaci\u00f3n Asamblea Abril'}
                />
              </label>
              <label className="space-y-2">
                <span className="text-sm font-semibold text-gray-700">Tipo</span>
                <select
                  value={campaignForm.type}
                  onChange={(event) => setCampaignForm((previous) => ({ ...previous, type: event.target.value }))}
                  disabled={isBusy || isReadOnlyCampaign}
                  className="w-full px-4 py-3 rounded-2xl border border-gray-300 focus:border-slate-500 focus:outline-none"
                >
                  <option value="asamblea">Asamblea</option>
                  <option value="conmemoracion">{'Conmemoraci\u00f3n'}</option>
                </select>
              </label>
              <label className="space-y-2">
                <span className="text-sm font-semibold text-gray-700">Fecha</span>
                <input
                  type="date"
                  value={campaignForm.eventDate}
                  onChange={(event) => setCampaignForm((previous) => ({ ...previous, eventDate: event.target.value }))}
                  disabled={isBusy || isReadOnlyCampaign}
                  className="w-full px-4 py-3 rounded-2xl border border-gray-300 focus:border-slate-500 focus:outline-none"
                />
              </label>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm font-semibold text-slate-700">Resumen</p>
              <div className="mt-3 space-y-2 text-sm text-slate-600">
                <p>Territorios: {campaignForm.sourceTerritoryIds.length} de {allTerritoryIds.length}</p>
                <p>Direcciones: {selectedCandidateAddresses.length}{campaignForm.excludedAddressIds.length > 0 ? ` (${campaignForm.excludedAddressIds.length} excluidas)` : ''}</p>
                <p>Hermanos: {enabledParticipantsCount}</p>
                <p>Repartidas: {selectedCampaignAssignments.length}</p>
              </div>
            </div>
          </div>
            </>
          ) : null}
        </SectionCard>

        <SectionCard
          title="Paso 2. Excluye hermanos"
          subtitle={'Todos participan por defecto. Excluye solo a quienes no participar\u00e1n'}
          icon="users"
          eyebrow="Paso 2"
          tone="emerald"
          isCollapsed={!isStepTwoExpanded}
          rightSlot={(
            <SectionToggleButton
              isExpanded={isStepTwoExpanded}
              onClick={() => setIsStepTwoExpanded((prev) => !prev)}
              summaryLabel={`${enabledParticipantsCount} activo${enabledParticipantsCount !== 1 ? 's' : ''}`}
            />
          )}
        >
          {isStepTwoExpanded ? (
            <>
          <div className="mb-4 flex flex-wrap items-center gap-2 text-sm text-slate-600">
            <span className="rounded-full bg-emerald-50 px-3 py-1 font-semibold text-emerald-800">
              Participan por defecto: {participantsDraft.length}
            </span>
            <span className="rounded-full bg-emerald-50 px-3 py-1 font-semibold text-emerald-800">
              Activos: {enabledParticipantsCount}
            </span>
            <span className="rounded-full bg-emerald-50 px-3 py-1 font-semibold text-emerald-800">
              Grupos: {groupsDraft.length}
            </span>
          </div>

          <div>
            <div className="flex items-center justify-between gap-3 mb-3">
              <p className="text-sm font-semibold text-gray-700">Hermanos incluidos</p>
              <span className="text-xs font-semibold text-slate-500">{'Toca un hermano para ver su configuraci\u00f3n'}</span>
            </div>
            <div className="mb-3">
              <input
                value={participantSearch}
                onChange={(event) => setParticipantSearch(event.target.value)}
                disabled={isBusy}
                placeholder="Buscar por nombre o apellido"
                className="w-full rounded-2xl border border-gray-300 px-4 py-3 text-sm focus:border-slate-500 focus:outline-none"
              />
            </div>
            <div className="space-y-2 max-h-[560px] overflow-y-auto pr-1">
              {filteredParticipantsDraft.length === 0 ? (
                <div className="text-sm text-gray-500 bg-gray-50 rounded-2xl border border-dashed border-gray-300 p-4">
                  {'No hay hermanos que coincidan con la b\u00fasqueda.'}
                </div>
              ) : (
                filteredParticipantsDraft.map((participant) => {
                  const isExpanded = expandedParticipantId === participant.userId;
                  const isIncluded = participant.isEnabled !== false;
                  const participantGroupLabel = participant.groupId
                    ? groupOptionsById[participant.groupId]?.label || 'Sin nombre'
                    : 'Sin grupo';

                  return (
                    <div
                      key={participant.userId}
                      className={`rounded-2xl border transition-all ${
                        isExpanded
                          ? 'border-emerald-200 bg-emerald-50/40'
                          : isIncluded
                            ? 'border-gray-200 bg-white'
                            : 'border-slate-200 bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center gap-3 p-3">
                        <button
                          type="button"
                          onClick={() => setExpandedParticipantId(isExpanded ? null : participant.userId)}
                          className="flex min-w-0 flex-1 items-center gap-3 text-left"
                        >
                          <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${
                            isIncluded ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-500'
                          }`}>
                            <Icon name="user" size={16} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="truncate text-sm font-bold text-slate-900">{participant.userNameSnapshot}</p>
                              {participant.userRole === 'admin' && (
                                <span className="rounded-full bg-indigo-100 px-2.5 py-1 text-[11px] font-bold text-indigo-800">
                                  Admin
                                </span>
                              )}
                              <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${
                                isIncluded ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'
                              }`}>
                                {isIncluded ? 'Incluido' : 'Excluido'}
                              </span>
                            </div>
                            <div className="mt-1 flex flex-wrap gap-2 text-xs text-slate-500">
                              <span>{participantGroupLabel}</span>
                              <span>Carga: {participant.capacityWeight}</span>
                              <span>{'L\u00edmite'}: {participant.hardLimit === '' ? 'Sin limite' : participant.hardLimit}</span>
                            </div>
                          </div>
                          <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-slate-500 ring-1 ring-slate-200 transition-transform ${
                            isExpanded ? 'rotate-90' : ''
                          }`}>
                            <Icon name="chevronRight" size={16} />
                          </div>
                        </button>

                        <button
                          type="button"
                          onClick={() => updateParticipantDraft(participant.userId, 'isEnabled', !isIncluded)}
                          disabled={isBusy || isReadOnlyCampaign}
                          className={`shrink-0 rounded-2xl px-4 py-2 text-sm font-bold transition-all disabled:opacity-60 ${
                            isIncluded
                              ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                              : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                          }`}
                        >
                          {isIncluded ? 'Incluido' : 'Excluido'}
                        </button>
                      </div>

                      {isExpanded && (
                        <div className="border-t border-slate-200 px-3 pb-3 pt-3">
                          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                            <label className="space-y-1">
                              <span className="text-xs font-semibold text-gray-500">Carga relativa</span>
                              <input
                                type="number"
                                min="1"
                                value={participant.capacityWeight}
                                onChange={(event) => updateParticipantDraft(participant.userId, 'capacityWeight', event.target.value)}
                                disabled={isBusy || isReadOnlyCampaign || !isIncluded}
                                className="w-full rounded-xl border border-gray-300 px-3 py-2 focus:border-slate-500 focus:outline-none"
                              />
                              <p className="text-[11px] text-slate-400">{'Pon 2 si puede visitar el doble que los dem\u00e1s'}</p>
                            </label>
                            <label className="space-y-1">
                              <span className="text-xs font-semibold text-gray-500">{'L\u00edmite de direcciones'}</span>
                              <input
                                type="number"
                                min="0"
                                value={participant.hardLimit}
                                onChange={(event) => updateParticipantDraft(participant.userId, 'hardLimit', event.target.value)}
                                disabled={isBusy || isReadOnlyCampaign || !isIncluded}
                                placeholder="Sin limite"
                                className="w-full rounded-xl border border-gray-300 px-3 py-2 focus:border-slate-500 focus:outline-none"
                              />
                              <p className="text-[11px] text-slate-400">{'M\u00e1ximo de direcciones que recibir\u00e1'}</p>
                            </label>
                            <label className="space-y-1">
                              <span className="text-xs font-semibold text-gray-500">Grupo</span>
                              <select
                                value={participant.groupId || ''}
                                onChange={(event) => updateParticipantDraft(participant.userId, 'groupId', event.target.value || null)}
                                disabled={isBusy || isReadOnlyCampaign || !isIncluded}
                                className="w-full rounded-xl border border-gray-300 px-3 py-2 focus:border-slate-500 focus:outline-none"
                              >
                                <option value="">Sin grupo</option>
                                {groupsDraft.map((group) => (
                                  <option key={group.id} value={group.id}>{group.label}</option>
                                ))}
                              </select>
                            </label>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="mt-5 rounded-3xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex flex-col gap-3 md:flex-row">
              <input
                value={newGroupLabel}
                onChange={(event) => setNewGroupLabel(event.target.value)}
                disabled={isBusy || isReadOnlyCampaign}
                className="flex-1 px-4 py-3 rounded-2xl border border-gray-300 focus:border-slate-500 focus:outline-none"
                placeholder="Grupo o familia"
              />
              <button
                onClick={addGroupDraft}
                disabled={isBusy || isReadOnlyCampaign || !newGroupLabel.trim()}
                className="px-5 py-3 rounded-2xl bg-slate-800 text-white font-semibold disabled:opacity-60"
              >
                Agregar grupo
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 mt-4">
              {groupsDraft.length === 0 ? (
                <div className="text-sm text-gray-500 bg-white rounded-2xl border border-dashed border-gray-300 p-4">
                  Si no necesitas grupos, puedes seguir asi.
                </div>
              ) : (
                groupsDraft.map((group) => {
                  const members = participantsDraft.filter((participant) => participant.groupId === group.id);
                  return (
                    <div key={group.id} className="rounded-2xl border border-gray-200 bg-white p-4 space-y-3">
                      <div className="flex items-center justify-between gap-3">
                        <input
                          value={group.label}
                          onChange={(event) => updateGroupDraft(group.id, event.target.value)}
                          disabled={isBusy || isReadOnlyCampaign}
                          className="flex-1 px-3 py-2 rounded-xl border border-gray-300 focus:border-slate-500 focus:outline-none"
                        />
                        <button
                          onClick={() => removeGroupDraft(group.id)}
                          disabled={isBusy || isReadOnlyCampaign}
                          className="w-10 h-10 rounded-xl bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
                        >
                          <Icon name="trash" size={16} />
                        </button>
                      </div>
                      <div className="text-xs text-gray-500">
                        {members.length === 0 ? 'Sin integrantes asignados' : members.map((member) => member.userNameSnapshot).join(', ')}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
            </>
          ) : null}
        </SectionCard>
          </>
        )}

        <SectionCard
          title={campaignIsActive ? 'Paso 3. Administra el reparto' : 'Paso 3. Genera el reparto'}
          subtitle={campaignIsActive ? 'La campaña está activa. Ajusta el reparto y da seguimiento.' : 'Guarda, reparte y activa la campaña'}
          icon="zap"
          eyebrow="Paso 3"
          tone="indigo"
          isCollapsed={!isStepThreeExpanded}
          rightSlot={(
            <SectionToggleButton
              isExpanded={isStepThreeExpanded}
              onClick={() => setIsStepThreeExpanded((prev) => !prev)}
              summaryLabel={`${selectedCampaignAssignments.length} ${selectedCampaignAssignments.length === 1 ? 'direcci\u00f3n' : 'direcciones'}`}
            />
          )}
        >
          {isStepThreeExpanded ? (
            <>
          <div className="mb-4 flex flex-wrap items-center gap-2 text-sm text-slate-600">
            <span className="rounded-full bg-indigo-50 px-3 py-1 font-semibold text-indigo-800">
              Direcciones: {selectedCampaignAssignments.length}
            </span>
            <span className="rounded-full bg-indigo-50 px-3 py-1 font-semibold text-indigo-800">
              Pendientes: {pendingAssignmentsCount}
            </span>
            <span className="rounded-full bg-indigo-50 px-3 py-1 font-semibold text-indigo-800">
              Completadas: {completedAssignmentsCount}
            </span>
          </div>

          <div className="space-y-3">
            {(() => {
              if (campaignIsActive) return null;
              if (assignmentsGenerated) return (
                <button
                  onClick={() => setConfirmAction('activate')}
                  disabled={isBusy || isReadOnlyCampaign}
                  className="w-full sm:w-auto px-6 py-3.5 rounded-2xl bg-emerald-600 text-white font-bold text-base shadow-sm hover:bg-emerald-700 disabled:opacity-60 transition-colors"
                >
                  <span className="flex items-center justify-center gap-2">
                    <Icon name="zap" size={18} />
                    {'Activar campa\u00f1a'}
                  </span>
                </button>
              );
              if (!assignmentsGenerated && participantsReady) return (
                <button
                  onClick={() => executeAdminAction('generate')}
                  disabled={isBusy || isReadOnlyCampaign}
                  className="w-full sm:w-auto px-6 py-3.5 rounded-2xl bg-indigo-600 text-white font-bold text-base shadow-sm hover:bg-indigo-700 disabled:opacity-60 transition-colors"
                >
                  <span className="flex items-center justify-center gap-2">
                    <Icon name="shuffle" size={18} />
                    {'Generar asignaci\u00f3n autom\u00e1tica'}
                  </span>
                </button>
              );
              return (
                <button
                  onClick={() => executeAdminAction('save')}
                  disabled={isBusy || isReadOnlyCampaign}
                  className="w-full sm:w-auto px-6 py-3.5 rounded-2xl bg-slate-800 text-white font-bold text-base shadow-sm hover:bg-slate-900 disabled:opacity-60 transition-colors"
                >
                  {'Guardar campa\u00f1a'}
                </button>
              );
            })()}

            <div className="flex flex-wrap gap-2">
              {!campaignIsActive && assignmentsGenerated && (
                <button
                  onClick={() => executeAdminAction('save')}
                  disabled={isBusy || isReadOnlyCampaign}
                  className="px-4 py-2 rounded-2xl border border-slate-300 bg-white text-slate-700 text-sm font-semibold hover:border-slate-400 disabled:opacity-60 transition-colors"
                >
                  {'Guardar campa\u00f1a'}
                </button>
              )}
              {assignmentsGenerated && (
                <button
                  onClick={() => executeAdminAction('generate')}
                  disabled={isBusy || isReadOnlyCampaign}
                  className="px-4 py-2 rounded-2xl border border-slate-300 bg-white text-slate-700 text-sm font-semibold hover:border-slate-400 disabled:opacity-60 transition-colors"
                >
                  Regenerar reparto
                </button>
              )}
              {campaignIsActive && (
                <button
                  onClick={() => setConfirmAction('complete')}
                  disabled={isBusy}
                  className="px-4 py-2 rounded-2xl border border-blue-300 bg-blue-50 text-blue-700 text-sm font-semibold hover:border-blue-400 disabled:opacity-60 transition-colors"
                >
                  {'Completar campa\u00f1a'}
                </button>
              )}
              {selectedCampaign && selectedCampaign.status !== CAMPAIGN_STATUSES.ARCHIVED && (
                <button
                  onClick={() => setConfirmAction('archive')}
                  disabled={isBusy}
                  className="px-4 py-2 rounded-2xl border border-slate-300 bg-white text-slate-500 text-sm font-semibold hover:border-slate-400 disabled:opacity-60 transition-colors"
                >
                  Archivar
                </button>
              )}
            </div>
          </div>

          {!assignmentsGenerated && (
            <p className="mt-4 text-sm text-slate-500">
              {'Cuando generes la asignaci\u00f3n, aqu\u00ed aparecer\u00e1n el seguimiento y el detalle de direcciones.'}
            </p>
          )}
            </>
          ) : null}
        </SectionCard>
        {selectedCampaign && assignmentsGenerated && (
          <SectionCard
            title="Seguimiento del reparto"
            subtitle={'Vista r\u00e1pida del avance individual y agregado por grupo o familia'}
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
              <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
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
                          <p className="text-xs text-gray-500">{participant.groupLabel}</p>
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

                <div className="space-y-3">
                  {groupSummary.map((group) => (
                    <div key={group.id} className="rounded-2xl border border-indigo-100 bg-indigo-50/70 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold text-indigo-900">{group.label}</p>
                          <p className="text-xs text-indigo-700">{group.members} integrante{group.members !== 1 ? 's' : ''}</p>
                        </div>
                        <div className="text-right text-sm">
                          <p className="font-bold text-indigo-900">{group.total}</p>
                          <p className="text-xs text-indigo-700">asignadas</p>
                        </div>
                      </div>
                      <p className="mt-3 text-xs text-indigo-700">Completadas: {group.completed}</p>
                    </div>
                  ))}
                </div>
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
                  <div className="max-h-[720px] space-y-3 overflow-y-auto pr-1">
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
                                {assignment.groupLabelSnapshot && (
                                  <span className="inline-flex items-center rounded-full border border-indigo-200 bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700">
                                    {assignment.groupLabelSnapshot}
                                  </span>
                                )}
                              </div>
                              <h4 className="text-base font-bold text-gray-900">{assignment.addressSnapshot?.address || 'Direcci\u00f3n sin dato'}</h4>
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
        onClose={() => setConfirmAction(null)}
        onConfirm={() => executeAdminAction('archive')}
                  title={'Archivar campa\u00f1a'}
                  message={'\u00bfSeguro que quieres archivar esta campa\u00f1a? Seguir\u00e1 disponible en el historial.'}
        confirmText="Si, archivar"
        cancelText="Cancelar"
        type="warning"
        isProcessing={isBusy}
      />
    </div>
  );
};

export default CampaignsView;



