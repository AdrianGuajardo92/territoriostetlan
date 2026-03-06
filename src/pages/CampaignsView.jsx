import React, { useEffect, useMemo, useRef, useState } from 'react';
import ConfirmDialog from '../components/common/ConfirmDialog';
import Icon from '../components/common/Icon';
import { useApp } from '../context/AppContext';
import { useCampaigns } from '../context/CampaignContext';
import {
  CAMPAIGN_PROGRESS_STATUSES,
  CAMPAIGN_STATUSES,
  formatCampaignDate,
  formatCampaignTypeLabel,
  getCampaignProgressMeta,
  getCampaignStatusMeta,
  groupAssignmentsByTerritory,
  sortCampaignSourceAddresses
} from '../utils/campaignUtils';

const DEFAULT_CAMPAIGN_FORM = {
  name: '',
  type: 'asamblea',
  eventDate: '',
  sourceTerritoryIds: [],
  excludedAddressIds: []
};

const FILTER_OPTIONS = [
  { id: 'all', label: 'Todas' },
  { id: CAMPAIGN_PROGRESS_STATUSES.PENDING, label: 'Pendientes' },
  { id: CAMPAIGN_PROGRESS_STATUSES.IN_PROGRESS, label: 'En progreso' },
  { id: CAMPAIGN_PROGRESS_STATUSES.COMPLETED, label: 'Completadas' }
];

const normalizeSearchText = (value = '') => String(value || '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .trim();

const SectionCard = ({ title, subtitle, children, rightSlot = null, icon = null, eyebrow = null, tone = 'slate' }) => {
  const toneClasses = {
    slate: 'from-slate-50 via-white to-white',
    indigo: 'from-indigo-50 via-white to-white',
    emerald: 'from-emerald-50 via-white to-white',
    amber: 'from-amber-50 via-white to-white'
  };

  return (
    <section className="overflow-hidden rounded-[30px] border border-slate-200 bg-white shadow-sm">
      <div className={`border-b border-slate-100 bg-gradient-to-r px-5 py-4 ${toneClasses[tone] || toneClasses.slate}`}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            {icon && (
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white text-slate-700 shadow-sm ring-1 ring-slate-200">
                <Icon name={icon} size={18} />
              </div>
            )}
            <div>
              {eyebrow && <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">{eyebrow}</p>}
              <h2 className="mt-1 text-lg font-bold text-gray-900">{title}</h2>
              {subtitle && <p className="mt-1 text-sm text-gray-500">{subtitle}</p>}
            </div>
          </div>
          {rightSlot}
        </div>
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
};

const EmptyState = ({ icon = 'mail', title, description }) => (
  <div className="bg-white rounded-3xl border border-dashed border-gray-300 p-10 text-center shadow-sm">
    <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
      <Icon name={icon} size={28} className="text-slate-500" />
    </div>
    <h3 className="text-lg font-bold text-gray-900 mb-2">{title}</h3>
    <p className="text-sm text-gray-600 max-w-md mx-auto">{description}</p>
  </div>
);

const CampaignSummaryPills = ({ assignments = [] }) => {
  const pending = assignments.filter((assignment) => assignment.status === CAMPAIGN_PROGRESS_STATUSES.PENDING).length;
  const inProgress = assignments.filter((assignment) => assignment.status === CAMPAIGN_PROGRESS_STATUSES.IN_PROGRESS).length;
  const completed = assignments.filter((assignment) => assignment.status === CAMPAIGN_PROGRESS_STATUSES.COMPLETED).length;

  const items = [
    { label: 'Pendientes', value: pending, className: 'bg-slate-100 text-slate-700' },
    { label: 'En progreso', value: inProgress, className: 'bg-amber-100 text-amber-700' },
    { label: 'Completadas', value: completed, className: 'bg-emerald-100 text-emerald-700' }
  ];

  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item) => (
        <div key={item.label} className={`px-3 py-2 rounded-2xl text-sm font-semibold ${item.className}`}>
          {item.label}: {item.value}
        </div>
      ))}
    </div>
  );
};

const PublisherAssignmentCard = ({ assignment, onStatusChange, isProcessing = false }) => {
  const progressMeta = getCampaignProgressMeta(assignment.status);
  const snapshot = assignment.addressSnapshot || {};

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
          href={snapshot.mapUrl || '#'}
          target="_blank"
          rel="noopener noreferrer"
          className={`w-11 h-11 rounded-2xl flex items-center justify-center ${snapshot.mapUrl ? 'bg-slate-700 text-white hover:bg-slate-800' : 'bg-gray-100 text-gray-400 pointer-events-none'} transition-colors`}
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

      <div className="grid grid-cols-3 gap-2">
        {FILTER_OPTIONS.filter((option) => option.id !== 'all').map((option) => {
          const isActive = assignment.status === option.id;
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
  publisherFilter,
  onFilterChange,
  onStatusChange,
  isProcessing = false
}) => {
  if (!activeCampaign) {
    return (
      <EmptyState
        icon="calendar"
        title={'A\u00fan no hay una campa\u00f1a activa'}
        description={'Cuando los administradores preparen una campa\u00f1a, aqu\u00ed aparecer\u00e1n tus direcciones personales para trabajar las invitaciones.'}
      />
    );
  }

  return (
    <div className="space-y-4">
      <SectionCard
        title={activeCampaign.name}
        subtitle={`${formatCampaignTypeLabel(activeCampaign.type)} - ${formatCampaignDate(activeCampaign.eventDate)}`}
        rightSlot={(
          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold border ${getCampaignStatusMeta(activeCampaign.status).badgeClass}`}>
            {getCampaignStatusMeta(activeCampaign.status).label}
          </span>
        )}
      >
        <CampaignSummaryPills assignments={assignments} />
        <div className="flex flex-wrap gap-2 mt-4">
          {FILTER_OPTIONS.map((option) => (
            <button
              key={option.id}
              onClick={() => onFilterChange(option.id)}
              className={`px-4 py-2 rounded-2xl text-sm font-semibold border transition-all ${
                publisherFilter === option.id
                  ? 'bg-slate-800 text-white border-slate-800'
                  : 'bg-white text-slate-700 border-slate-200 hover:border-slate-400'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </SectionCard>

      {groupedAssignments.length === 0 ? (
        <EmptyState
          icon="bookmark"
          title="No hay direcciones en este filtro"
          description={'Prueba cambiando el filtro o vuelve m\u00e1s tarde cuando haya nuevas asignaciones.'}
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
    myCampaignAssignments,
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
  const [publisherFilter, setPublisherFilter] = useState('all');
  const [adminViewMode, setAdminViewMode] = useState('admin');
  const [isBusy, setIsBusy] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null);
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
    const includedTerritoryIds = new Set(allTerritoryIds);
    const sourceAddresses = addresses.filter((address) => {
      if (!includedTerritoryIds.has(address.territoryId)) return false;
      if (address.deleted) return false;
      return true;
    });

    return sortCampaignSourceAddresses(sourceAddresses, territoryMap);
  }, [addresses, allTerritoryIds, territoryMap]);

  const selectedCandidateAddresses = useMemo(() => campaignSourceAddresses, [campaignSourceAddresses]);

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

  const filteredPublisherAssignments = useMemo(() => {
    if (publisherFilter === 'all') return myCampaignAssignments;
    return myCampaignAssignments.filter((assignment) => assignment.status === publisherFilter);
  }, [myCampaignAssignments, publisherFilter]);

  const groupedPublisherAssignments = useMemo(
    () => groupAssignmentsByTerritory(filteredPublisherAssignments),
    [filteredPublisherAssignments]
  );

  const activeCampaignMeta = selectedCampaign ? getCampaignStatusMeta(selectedCampaign.status) : null;
  const completedAssignmentsCount = selectedCampaignAssignments.filter(
    (assignment) => assignment.status === CAMPAIGN_PROGRESS_STATUSES.COMPLETED
  ).length;
  const pendingAssignmentsCount = selectedCampaignAssignments.filter(
    (assignment) => assignment.status === CAMPAIGN_PROGRESS_STATUSES.PENDING
  ).length;
  const enabledParticipantsCount = participantsDraft.filter((participant) => participant.isEnabled !== false).length;
  const basicsReady = Boolean(campaignForm.name.trim()) && Boolean(campaignForm.eventDate);
  const participantsReady = enabledParticipantsCount > 0;
  const assignmentsGenerated = selectedCampaignAssignments.length > 0;
  const campaignIsActive = selectedCampaign?.status === CAMPAIGN_STATUSES.ACTIVE;
  const adminNextRecommendedAction = !basicsReady
    ? 'Completa primero el nombre y la fecha.'
    : !participantsReady
      ? 'Deja al menos un hermano incluido para la campa\u00f1a.'
      : !assignmentsGenerated
        ? 'Genera la asignaci\u00f3n autom\u00e1tica para repartir las direcciones.'
        : !campaignIsActive
          ? 'Activa la campa\u00f1a cuando ya revisaste el reparto.'
          : 'La campa\u00f1a ya est\u00e1 activa. Ahora solo toca dar seguimiento.';

  const handleCreateNewDraft = () => {
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
        await handleGenerateCampaignAssignments(campaignId);
      }

      if (action === 'activate') {
        const campaignId = await persistAdminDraft();
        await handleActivateCampaign(campaignId);
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
                <h1 className="text-xl font-bold text-white">Mis Invitaciones</h1>
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
            activeCampaign={activeCampaign}
            assignments={myCampaignAssignments}
            groupedAssignments={groupedPublisherAssignments}
            publisherFilter={publisherFilter}
            onFilterChange={setPublisherFilter}
            onStatusChange={handlePublisherStatusChange}
            isProcessing={isBusy}
          />
        </div>
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
          <button
            onClick={handleCreateNewDraft}
            className="px-4 py-2 rounded-2xl bg-white text-slate-800 font-semibold shadow-sm hover:bg-slate-100 transition-colors"
          >
            {'Nueva campa\u00f1a'}
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-6">
        <section className="rounded-[30px] border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Modo</p>
              <h2 className="mt-1 text-lg font-bold text-slate-900">{'Administra la campa\u00f1a o revisa tus invitaciones'}</h2>
              <p className="mt-1 text-sm text-slate-600">{'Aqu\u00ed puedes gestionar el reparto y tambi\u00e9n ver las direcciones que te tocaron a ti.'}</p>
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
                  <p className="text-sm font-bold">Mis invitaciones</p>
                  {myPendingCampaignAssignmentsCount > 0 && (
                    <span className={`inline-flex min-w-[28px] items-center justify-center rounded-full px-2 py-1 text-xs font-bold ${
                      adminViewMode === 'personal' ? 'bg-white text-indigo-700' : 'bg-indigo-100 text-indigo-700'
                    }`}>
                      {myPendingCampaignAssignmentsCount}
                    </span>
                  )}
                </div>
                <p className={`mt-1 text-xs ${adminViewMode === 'personal' ? 'text-indigo-100' : 'text-slate-500'}`}>
                  Ver solo las direcciones asignadas a tu cuenta
                </p>
              </button>
            </div>
          </div>
        </section>

        {adminViewMode === 'personal' ? (
          <div className="max-w-3xl mx-auto">
            <PublisherAssignmentsSection
              activeCampaign={activeCampaign}
              assignments={myCampaignAssignments}
              groupedAssignments={groupedPublisherAssignments}
              publisherFilter={publisherFilter}
              onFilterChange={setPublisherFilter}
              onStatusChange={handlePublisherStatusChange}
              isProcessing={isBusy}
            />
          </div>
        ) : (
          <>
        <section className="rounded-[30px] border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900">{'Crea la campa\u00f1a en 3 pasos'}</h2>
              <p className="mt-1 text-sm text-slate-600">{adminNextRecommendedAction}</p>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {[
                { step: '1', label: 'Campa\u00f1a', ready: basicsReady, active: !basicsReady },
                { step: '2', label: 'Hermanos', ready: participantsReady, active: basicsReady && !participantsReady },
                { step: '3', label: 'Reparto', ready: assignmentsGenerated, active: participantsReady && !assignmentsGenerated }
              ].map((item) => (
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
        <SectionCard
          title={'Paso 1. Crea o edita la campa\u00f1a'}
          subtitle={'Elige una campa\u00f1a y llena nombre, tipo y fecha'}
          icon="calendar"
          eyebrow="Paso 1"
          tone="indigo"
          rightSlot={selectedCampaign && activeCampaignMeta ? (
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold border ${activeCampaignMeta.badgeClass}`}>
              {activeCampaignMeta.label}
            </span>
          ) : null}
        >
          <div className="mb-4 flex flex-wrap items-center gap-2 text-sm text-slate-600">
            <span className="rounded-full bg-slate-100 px-3 py-1 font-semibold text-slate-700">
              {campaigns.length} campa{'\u00f1'}a{campaigns.length !== 1 ? 's' : ''}
            </span>
            <span className="rounded-full bg-slate-100 px-3 py-1 font-semibold text-slate-700">
              {selectedCampaign ? `Actual: ${selectedCampaign.name}` : 'Borrador nuevo'}
            </span>
          </div>

          {campaigns.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-600">
              {'A\u00fan no hay campa\u00f1as guardadas. Llena los datos de abajo y guarda el borrador.'}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {campaigns.map((campaign) => {
                const statusMeta = getCampaignStatusMeta(campaign.status);
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
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold border ${isSelected ? 'bg-white text-slate-800 border-white' : statusMeta.badgeClass}`}>
                        {statusMeta.label}
                      </span>
                    </div>
                    <p className={`text-sm mt-3 ${isSelected ? 'text-slate-100' : 'text-gray-600'}`}>
                      Territorios: {allTerritoryIds.length} · Direcciones: {campaign.addressCountSnapshot || 0}
                    </p>
                  </button>
                );
              })}
            </div>
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
                <p>Territorios: {allTerritoryIds.length}</p>
                <p>Direcciones: {selectedCandidateAddresses.length}</p>
                <p>Hermanos: {enabledParticipantsCount}</p>
                <p>Repartidas: {selectedCampaignAssignments.length}</p>
              </div>
            </div>
          </div>
        </SectionCard>

        <SectionCard
          title="Paso 2. Excluye hermanos"
          subtitle={'Todos participan por defecto. Excluye solo a quienes no participar\u00e1n'}
          icon="users"
          eyebrow="Paso 2"
          tone="emerald"
        >
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
                              <span>Capacidad: {participant.capacityWeight}</span>
                              <span>Maximo: {participant.hardLimit === '' ? 'Sin limite' : participant.hardLimit}</span>
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
                              <span className="text-xs font-semibold text-gray-500">Capacidad</span>
                              <input
                                type="number"
                                min="1"
                                value={participant.capacityWeight}
                                onChange={(event) => updateParticipantDraft(participant.userId, 'capacityWeight', event.target.value)}
                                disabled={isBusy || isReadOnlyCampaign || !isIncluded}
                                className="w-full rounded-xl border border-gray-300 px-3 py-2 focus:border-slate-500 focus:outline-none"
                              />
                            </label>
                            <label className="space-y-1">
                              <span className="text-xs font-semibold text-gray-500">Maximo</span>
                              <input
                                type="number"
                                min="0"
                                value={participant.hardLimit}
                                onChange={(event) => updateParticipantDraft(participant.userId, 'hardLimit', event.target.value)}
                                disabled={isBusy || isReadOnlyCampaign || !isIncluded}
                                placeholder="Sin limite"
                                className="w-full rounded-xl border border-gray-300 px-3 py-2 focus:border-slate-500 focus:outline-none"
                              />
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
        </SectionCard>

        <SectionCard
          title="Paso 3. Genera el reparto"
                subtitle={'Guarda, reparte y activa la campa\u00f1a'}
          icon="zap"
          eyebrow="Paso 3"
          tone="indigo"
          rightSlot={<CampaignSummaryPills assignments={selectedCampaignAssignments} />}
        >
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

          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => executeAdminAction('save')}
              disabled={isBusy || isReadOnlyCampaign}
              className="px-5 py-3 rounded-2xl bg-slate-800 text-white font-semibold disabled:opacity-60"
            >
              Guardar borrador
            </button>
            <button
              onClick={() => executeAdminAction('generate')}
              disabled={isBusy || isReadOnlyCampaign}
              className="px-5 py-3 rounded-2xl bg-indigo-600 text-white font-semibold disabled:opacity-60"
            >
              {'Generar asignaci\u00f3n autom\u00e1tica'}
            </button>
            <button
              onClick={() => executeAdminAction('activate')}
              disabled={isBusy || isReadOnlyCampaign}
              className="px-5 py-3 rounded-2xl bg-emerald-600 text-white font-semibold disabled:opacity-60"
            >
              {'Activar campa\u00f1a'}
            </button>
            {selectedCampaign && selectedCampaign.status === CAMPAIGN_STATUSES.ACTIVE && (
              <button
                onClick={() => setConfirmAction('complete')}
                disabled={isBusy}
                className="px-5 py-3 rounded-2xl bg-blue-600 text-white font-semibold disabled:opacity-60"
              >
                {'Completar campa\u00f1a'}
              </button>
            )}
            {selectedCampaign && selectedCampaign.status !== CAMPAIGN_STATUSES.ARCHIVED && (
              <button
                onClick={() => setConfirmAction('archive')}
                disabled={isBusy}
                className="px-5 py-3 rounded-2xl bg-gray-700 text-white font-semibold disabled:opacity-60"
              >
                Archivar
              </button>
            )}
          </div>

          {!assignmentsGenerated && (
            <p className="mt-4 text-sm text-slate-500">
              {'Cuando generes la asignaci\u00f3n, aqu\u00ed aparecer\u00e1n el seguimiento y el detalle de direcciones.'}
            </p>
          )}
        </SectionCard>
        {selectedCampaign && assignmentsGenerated && (
          <SectionCard
            title="Seguimiento del reparto"
            subtitle={'Vista r\u00e1pida del avance individual y agregado por grupo o familia'}
            icon="activity"
            eyebrow="Control"
            tone="emerald"
          >
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              <div className="space-y-3">
                {participantSummary.length === 0 ? (
                  <div className="text-sm text-gray-500 bg-gray-50 rounded-2xl border border-dashed border-gray-300 p-4">
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
                    <div className="flex flex-wrap gap-2 mt-3 text-xs font-semibold">
                      <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-700">Pendientes: {participant.pending}</span>
                      <span className="px-2.5 py-1 rounded-full bg-amber-100 text-amber-700">En progreso: {participant.inProgress}</span>
                      <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700">Completadas: {participant.completed}</span>
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
                    <p className="text-xs text-indigo-700 mt-3">Completadas: {group.completed}</p>
                  </div>
                ))}
              </div>
            </div>
          </SectionCard>
        )}

        {selectedCampaign && assignmentsGenerated && (
              <SectionCard title="Direcciones asignadas" subtitle={'Mueve, bloquea o resetea cada direcci\u00f3n de la campa\u00f1a sin tocar territorios ni revisitas'}>
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
                    description={'Guarda el borrador y genera la asignaci\u00f3n autom\u00e1tica para empezar a administrar el seguimiento.'}
              />
            ) : (
              <div className="space-y-3 max-h-[720px] overflow-y-auto pr-1">
                {selectedCampaignAssignments.map((assignment) => {
                  const progressMeta = getCampaignProgressMeta(assignment.status);
                  return (
                    <div key={assignment.id} className="rounded-2xl border border-gray-200 bg-white p-4 space-y-3">
                      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3">
                        <div>
                          <div className="flex flex-wrap items-center gap-2 mb-2">
                            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold border ${progressMeta.badgeClass}`}>
                              {progressMeta.label}
                            </span>
                            {assignment.manualLocked && (
                              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold border bg-red-50 text-red-700 border-red-200">
                                Bloqueada
                              </span>
                            )}
                            {assignment.groupLabelSnapshot && (
                              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border bg-indigo-50 text-indigo-700 border-indigo-200">
                                {assignment.groupLabelSnapshot}
                              </span>
                            )}
                          </div>
                          <h4 className="text-base font-bold text-gray-900">{assignment.addressSnapshot?.address || 'Direcci\u00f3n sin dato'}</h4>
                          <p className="text-sm text-gray-500 mt-1">{assignment.addressSnapshot?.territoryName || 'Territorio'}</p>
                          {assignment.completedByUserName && (
                            <p className="text-xs text-emerald-700 mt-2">Completada por: {assignment.completedByUserName}</p>
                          )}
                        </div>
                        <div className="flex flex-col md:flex-row gap-2 lg:items-start">
                          <select
                            value={assignment.assignedUserId}
                            onChange={(event) => handleMoveAssignment(assignment, event.target.value)}
                            disabled={isBusy || assignment.status !== CAMPAIGN_PROGRESS_STATUSES.PENDING}
                            className="px-3 py-2 rounded-xl border border-gray-300 focus:border-slate-500 focus:outline-none text-sm"
                          >
                            {selectedCampaignParticipants.map((participant) => (
                              <option key={participant.userId} value={participant.userId}>{participant.userNameSnapshot}</option>
                            ))}
                          </select>
                          <button
                            onClick={() => handleToggleLock(assignment.id)}
                            disabled={isBusy}
                            className={`px-3 py-2 rounded-xl text-sm font-semibold ${assignment.manualLocked ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-700'}`}
                          >
                            {assignment.manualLocked ? 'Desbloquear' : 'Bloquear'}
                          </button>
                          <button
                            onClick={() => handleResetAssignment(assignment.id)}
                            disabled={isBusy || assignment.status === CAMPAIGN_PROGRESS_STATUSES.PENDING}
                            className="px-3 py-2 rounded-xl text-sm font-semibold bg-amber-100 text-amber-700 disabled:opacity-50"
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
          </SectionCard>
        )}

        {campaignHistory.length > 0 && (
              <SectionCard title="Historial" subtitle={'Campa\u00f1as cerradas para consulta posterior'}>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {campaignHistory.map((campaign) => {
                const statusMeta = getCampaignStatusMeta(campaign.status);
                return (
                  <div key={campaign.id} className="rounded-2xl border border-gray-200 bg-white p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs font-bold uppercase tracking-wide text-gray-500">{formatCampaignTypeLabel(campaign.type)}</p>
                        <h3 className="text-base font-bold text-gray-900 mt-1">{campaign.name}</h3>
                        <p className="text-sm text-gray-500 mt-1">{formatCampaignDate(campaign.eventDate)}</p>
                      </div>
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold border ${statusMeta.badgeClass}`}>
                        {statusMeta.label}
                      </span>
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



