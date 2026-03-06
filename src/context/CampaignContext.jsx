import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState
} from 'react';
import {
  addDoc,
  collection,
  doc,
  onSnapshot,
  serverTimestamp,
  updateDoc,
  writeBatch
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { useToast } from '../hooks/useToast';
import { useApp } from './AppContext';
import {
  CAMPAIGN_PROGRESS_STATUSES,
  CAMPAIGN_STATUSES,
  buildTerritoryMap,
  calculateCampaignTargets,
  distributeAddressesAcrossParticipants,
  getCampaignCandidateAddresses,
  normalizeParticipantConfig,
  sortCampaigns
} from '../utils/campaignUtils';

const CampaignContext = createContext();

const buildLookup = (items = []) => items.reduce((accumulator, item) => {
  accumulator[item.id] = item;
  return accumulator;
}, {});

export const useCampaigns = () => {
  const context = useContext(CampaignContext);

  if (!context) {
    throw new Error('useCampaigns must be used within CampaignProvider');
  }

  return context;
};

export const CampaignProvider = ({ children }) => {
  const { currentUser, addresses, territories, users } = useApp();
  const { showToast } = useToast();

  const [campaigns, setCampaigns] = useState([]);
  const [campaignGroups, setCampaignGroups] = useState([]);
  const [campaignParticipants, setCampaignParticipants] = useState([]);
  const [campaignAssignments, setCampaignAssignments] = useState([]);
  const [campaignActivity, setCampaignActivity] = useState([]);
  const [campaignsLoading, setCampaignsLoading] = useState(true);

  const unsubscribesRef = useRef([]);

  const isAdmin = currentUser?.role === 'admin';
  const allTerritoryIds = useMemo(
    () => territories.map((territory) => territory.id).filter(Boolean),
    [territories]
  );
  const territoryMap = useMemo(() => buildTerritoryMap(territories), [territories]);
  const usersById = useMemo(() => buildLookup(users), [users]);

  const resetCampaignState = useCallback(() => {
    setCampaigns([]);
    setCampaignGroups([]);
    setCampaignParticipants([]);
    setCampaignAssignments([]);
    setCampaignActivity([]);
    setCampaignsLoading(false);
  }, []);

  const logCampaignActivity = useCallback(async (campaignId, assignmentId, type, payload = {}) => {
    if (!currentUser?.id) return;

    try {
      await addDoc(collection(db, 'campaignActivity'), {
        campaignId,
        assignmentId: assignmentId || null,
        type,
        payload,
        performedByUserId: currentUser.id,
        performedByUserName: currentUser.name || 'Usuario',
        createdAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Error registrando actividad de campana:', error);
    }
  }, [currentUser]);

  useEffect(() => {
    if (!currentUser) {
      unsubscribesRef.current.forEach((unsubscribe) => {
        if (typeof unsubscribe === 'function') unsubscribe();
      });
      unsubscribesRef.current = [];
      resetCampaignState();
      return undefined;
    }

    setCampaignsLoading(true);

    const unsubscribeCampaigns = onSnapshot(collection(db, 'campaigns'), (snapshot) => {
      const nextCampaigns = snapshot.docs.map((campaignDoc) => ({
        id: campaignDoc.id,
        ...campaignDoc.data()
      }));
      setCampaigns(nextCampaigns);
      setCampaignsLoading(false);
    });

    const unsubscribeGroups = onSnapshot(collection(db, 'campaignGroups'), (snapshot) => {
      setCampaignGroups(snapshot.docs.map((groupDoc) => ({
        id: groupDoc.id,
        ...groupDoc.data()
      })));
    });

    const unsubscribeParticipants = onSnapshot(collection(db, 'campaignParticipants'), (snapshot) => {
      setCampaignParticipants(snapshot.docs.map((participantDoc) => ({
        id: participantDoc.id,
        ...participantDoc.data()
      })));
    });

    const unsubscribeAssignments = onSnapshot(collection(db, 'campaignAssignments'), (snapshot) => {
      setCampaignAssignments(snapshot.docs.map((assignmentDoc) => ({
        id: assignmentDoc.id,
        ...assignmentDoc.data()
      })));
    });

    const unsubscribeActivity = onSnapshot(collection(db, 'campaignActivity'), (snapshot) => {
      setCampaignActivity(snapshot.docs.map((activityDoc) => ({
        id: activityDoc.id,
        ...activityDoc.data()
      })));
    });

    unsubscribesRef.current = [
      unsubscribeCampaigns,
      unsubscribeGroups,
      unsubscribeParticipants,
      unsubscribeAssignments,
      unsubscribeActivity
    ];

    return () => {
      unsubscribesRef.current.forEach((unsubscribe) => {
        if (typeof unsubscribe === 'function') unsubscribe();
      });
      unsubscribesRef.current = [];
    };
  }, [currentUser, resetCampaignState]);

  const campaignsSorted = useMemo(() => sortCampaigns(campaigns), [campaigns]);

  const activeCampaign = useMemo(
    () => campaignsSorted.find((campaign) => campaign.status === CAMPAIGN_STATUSES.ACTIVE) || null,
    [campaignsSorted]
  );

  const campaignHistory = useMemo(
    () => campaignsSorted.filter((campaign) => (
      campaign.status === CAMPAIGN_STATUSES.COMPLETED || campaign.status === CAMPAIGN_STATUSES.ARCHIVED
    )),
    [campaignsSorted]
  );

  const myCampaignAssignments = useMemo(() => {
    if (!currentUser?.id || !activeCampaign) return [];

    return campaignAssignments.filter((assignment) => (
      assignment.campaignId === activeCampaign.id && assignment.assignedUserId === currentUser.id
    ));
  }, [campaignAssignments, currentUser, activeCampaign]);

  const myPendingCampaignAssignmentsCount = useMemo(
    () => myCampaignAssignments.filter((assignment) => assignment.status !== CAMPAIGN_PROGRESS_STATUSES.COMPLETED).length,
    [myCampaignAssignments]
  );

  const activeCampaignAssignments = useMemo(() => {
    if (!activeCampaign) return [];
    return campaignAssignments.filter((assignment) => assignment.campaignId === activeCampaign.id);
  }, [activeCampaign, campaignAssignments]);

  const activeCampaignParticipants = useMemo(() => {
    if (!activeCampaign) return [];

    return campaignParticipants
      .filter((participant) => participant.campaignId === activeCampaign.id)
      .sort((a, b) => {
        const sortDiff = (a.sortOrder ?? 0) - (b.sortOrder ?? 0);
        if (sortDiff !== 0) return sortDiff;
        return String(a.userNameSnapshot || '').localeCompare(String(b.userNameSnapshot || ''), 'es');
      });
  }, [activeCampaign, campaignParticipants]);

  const activeCampaignGroups = useMemo(() => {
    if (!activeCampaign) return [];

    return campaignGroups
      .filter((group) => group.campaignId === activeCampaign.id)
      .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
  }, [activeCampaign, campaignGroups]);

  const normalizeCampaignPayload = useCallback((payload = {}) => ({
    name: String(payload.name || '').trim(),
    type: String(payload.type || 'asamblea').trim().toLowerCase(),
    eventDate: payload.eventDate || '',
    status: payload.status || CAMPAIGN_STATUSES.DRAFT,
    sourceTerritoryIds: Array.from(new Set(
      allTerritoryIds.length > 0
        ? allTerritoryIds
        : (Array.isArray(payload.sourceTerritoryIds) ? payload.sourceTerritoryIds : [])
    )),
    excludedAddressIds: Array.from(new Set(Array.isArray(payload.excludedAddressIds) ? payload.excludedAddressIds : [])),
    addressCountSnapshot: Number(payload.addressCountSnapshot) || 0
  }), [allTerritoryIds]);

  const handleCreateCampaign = useCallback(async (payload) => {
    if (!isAdmin) {
      throw new Error('Solo los administradores pueden crear campañas.');
    }

    const normalizedPayload = normalizeCampaignPayload(payload);

    if (!normalizedPayload.name) {
      throw new Error('La campaña necesita un nombre.');
    }

    if (normalizedPayload.sourceTerritoryIds.length === 0) {
      throw new Error('Selecciona al menos un territorio para la campaña.');
    }

    const campaignRef = await addDoc(collection(db, 'campaigns'), {
      ...normalizedPayload,
      createdBy: currentUser?.id || 'admin',
      createdByName: currentUser?.name || 'Administrador',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    await logCampaignActivity(campaignRef.id, null, 'campaign_created', {
      name: normalizedPayload.name,
      type: normalizedPayload.type
    });

    showToast('Campaña creada correctamente', 'success');
    return campaignRef.id;
  }, [currentUser, isAdmin, logCampaignActivity, normalizeCampaignPayload, showToast]);

  const handleUpdateCampaign = useCallback(async (campaignId, updates) => {
    if (!isAdmin) {
      throw new Error('Solo los administradores pueden actualizar campañas.');
    }

    const campaign = campaigns.find((item) => item.id === campaignId);
    if (!campaign) {
      throw new Error('No se encontro la campaña seleccionada.');
    }

    const normalizedUpdates = normalizeCampaignPayload({
      ...campaign,
      ...updates,
      status: updates.status || campaign.status || CAMPAIGN_STATUSES.DRAFT
    });

    if (!normalizedUpdates.name) {
      throw new Error('La campaña necesita un nombre.');
    }

    if (normalizedUpdates.sourceTerritoryIds.length === 0) {
      throw new Error('Selecciona al menos un territorio para la campaña.');
    }

    await updateDoc(doc(db, 'campaigns', campaignId), {
      ...normalizedUpdates,
      updatedAt: serverTimestamp()
    });

    await logCampaignActivity(campaignId, null, 'campaign_updated', {
      name: normalizedUpdates.name,
      territories: normalizedUpdates.sourceTerritoryIds.length
    });
  }, [campaigns, isAdmin, logCampaignActivity, normalizeCampaignPayload]);

  const handleSaveCampaignStructure = useCallback(async (campaignId, structure) => {
    if (!isAdmin) {
      throw new Error('Solo los administradores pueden editar participantes.');
    }

    const campaign = campaigns.find((item) => item.id === campaignId);
    if (!campaign) {
      throw new Error('No se encontro la campaña seleccionada.');
    }

    const rawParticipants = Array.isArray(structure?.participants) ? structure.participants : [];
    const rawGroups = Array.isArray(structure?.groups) ? structure.groups : [];

    const duplicateUsers = new Set();
    const seenUsers = new Set();

    const normalizedParticipants = rawParticipants
      .filter((participant) => participant?.userId && usersById[participant.userId])
      .map((participant, index) => {
        if (seenUsers.has(participant.userId)) {
          duplicateUsers.add(participant.userId);
        }
        seenUsers.add(participant.userId);

        return {
          id: participant.id,
          campaignId,
          userId: participant.userId,
          userNameSnapshot: usersById[participant.userId]?.name || participant.userNameSnapshot || 'Usuario',
          groupId: participant.groupId || null,
          capacityWeight: Math.max(1, Number(participant.capacityWeight) || 1),
          hardLimit: participant.hardLimit === '' || participant.hardLimit === null || participant.hardLimit === undefined
            ? null
            : Math.max(0, Number(participant.hardLimit) || 0),
          isEnabled: participant.isEnabled !== false,
          sortOrder: index
        };
      });

    if (duplicateUsers.size > 0) {
      throw new Error('No puedes repetir el mismo publicador dentro de la misma campaña.');
    }

    const normalizedGroups = rawGroups
      .map((group, index) => ({
        id: group.id,
        campaignId,
        label: String(group.label || '').trim(),
        sortOrder: index
      }))
      .filter((group) => group.label);

    const validGroupIds = new Set(normalizedGroups.map((group) => group.id).filter(Boolean));
    normalizedParticipants.forEach((participant) => {
      if (participant.groupId && !validGroupIds.has(participant.groupId)) {
        participant.groupId = null;
      }
    });

    const existingGroups = campaignGroups.filter((group) => group.campaignId === campaignId);
    const existingParticipants = campaignParticipants.filter((participant) => participant.campaignId === campaignId);
    const nextGroupIds = new Set(normalizedGroups.map((group) => group.id).filter(Boolean));
    const nextParticipantIds = new Set(normalizedParticipants.map((participant) => participant.id).filter(Boolean));
    const batch = writeBatch(db);
    const groupIdMap = {};

    existingGroups.forEach((group) => {
      if (!nextGroupIds.has(group.id)) {
        batch.delete(doc(db, 'campaignGroups', group.id));
      }
    });

    existingParticipants.forEach((participant) => {
      if (!nextParticipantIds.has(participant.id)) {
        batch.delete(doc(db, 'campaignParticipants', participant.id));
      }
    });

    normalizedGroups.forEach((group) => {
      const groupRef = group.id ? doc(db, 'campaignGroups', group.id) : doc(collection(db, 'campaignGroups'));
      groupIdMap[group.id || `temp-group-${group.sortOrder}`] = groupRef.id;
    });

    normalizedGroups.forEach((group) => {
      const resolvedGroupId = groupIdMap[group.id || `temp-group-${group.sortOrder}`];
      const memberUserIds = normalizedParticipants
        .filter((participant) => participant.groupId === group.id)
        .map((participant) => participant.userId);
      const memberNamesSnapshot = memberUserIds.map((userId) => usersById[userId]?.name || 'Usuario');
      const groupRef = doc(db, 'campaignGroups', resolvedGroupId);

      batch.set(groupRef, {
        campaignId,
        label: group.label,
        memberUserIds,
        memberNamesSnapshot,
        sortOrder: group.sortOrder,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
    });

    normalizedParticipants.forEach((participant) => {
      const participantRef = participant.id
        ? doc(db, 'campaignParticipants', participant.id)
        : doc(collection(db, 'campaignParticipants'));
      const resolvedGroupId = participant.groupId
        ? groupIdMap[participant.groupId] || participant.groupId
        : null;

      batch.set(participantRef, {
        campaignId,
        userId: participant.userId,
        userNameSnapshot: participant.userNameSnapshot,
        groupId: resolvedGroupId,
        capacityWeight: participant.capacityWeight,
        hardLimit: participant.hardLimit,
        isEnabled: participant.isEnabled,
        sortOrder: participant.sortOrder,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
    });

    await batch.commit();
    await logCampaignActivity(campaignId, null, 'campaign_structure_saved', {
      participantCount: normalizedParticipants.length,
      groupCount: normalizedGroups.length
    });
    showToast('Participantes y grupos guardados', 'success');
  }, [campaignGroups, campaignParticipants, campaigns, isAdmin, logCampaignActivity, showToast, usersById]);

  const handleGenerateCampaignAssignments = useCallback(async (campaignId) => {
    if (!isAdmin) {
      throw new Error('Solo los administradores pueden generar asignaciones.');
    }

    const campaign = campaigns.find((item) => item.id === campaignId);
    if (!campaign) {
      throw new Error('No se encontro la campaña seleccionada.');
    }

    const candidateAddresses = getCampaignCandidateAddresses({
      campaign,
      addresses,
      territoryMap
    });

    if (candidateAddresses.length === 0) {
      throw new Error('La campaña no tiene direcciones disponibles para asignar.');
    }

    const campaignSpecificParticipants = campaignParticipants
      .filter((participant) => participant.campaignId === campaignId)
      .map(normalizeParticipantConfig)
      .filter((participant) => participant.isEnabled);

    if (campaignSpecificParticipants.length === 0) {
      throw new Error('Debes agregar al menos una persona antes de generar la campaña.');
    }

    const campaignSpecificGroups = campaignGroups.filter((group) => group.campaignId === campaignId);
    const groupsById = buildLookup(campaignSpecificGroups);
    const existingAssignments = campaignAssignments.filter((assignment) => assignment.campaignId === campaignId);
    const preservedAssignments = existingAssignments.filter(
      (assignment) => assignment.manualLocked || assignment.status !== CAMPAIGN_PROGRESS_STATUSES.PENDING
    );
    const pendingUnlockedAssignments = existingAssignments.filter(
      (assignment) => !assignment.manualLocked && assignment.status === CAMPAIGN_PROGRESS_STATUSES.PENDING
    );
    const preservedAddressIds = new Set(preservedAssignments.map((assignment) => assignment.addressId));
    const availableAddresses = candidateAddresses.filter((address) => !preservedAddressIds.has(address.id));
    const preservedCountsByUser = preservedAssignments.reduce((accumulator, assignment) => {
      accumulator[assignment.assignedUserId] = (accumulator[assignment.assignedUserId] || 0) + 1;
      return accumulator;
    }, {});

    const remainingParticipants = campaignSpecificParticipants
      .map((participant) => {
        const usedCount = preservedCountsByUser[participant.userId] || 0;
        const remainingLimit = Number.isFinite(participant.hardLimit)
          ? Math.max(0, participant.hardLimit - usedCount)
          : participant.hardLimit;

        return {
          ...participant,
          hardLimit: remainingLimit
        };
      })
      .filter((participant) => !Number.isFinite(participant.hardLimit) || participant.hardLimit > 0);

    const targets = calculateCampaignTargets(remainingParticipants, availableAddresses.length);
    const generatedAssignments = distributeAddressesAcrossParticipants({
      addresses: availableAddresses,
      participants: remainingParticipants,
      targets,
      groupsById,
      territoryMap
    });

    const batch = writeBatch(db);

    pendingUnlockedAssignments.forEach((assignment) => {
      batch.delete(doc(db, 'campaignAssignments', assignment.id));
    });

    generatedAssignments.forEach((assignment, index) => {
      const assignmentRef = doc(collection(db, 'campaignAssignments'));
      batch.set(assignmentRef, {
        campaignId,
        ...assignment,
        sortOrder: index,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        startedAt: null,
        completedAt: null,
        completedByUserId: null,
        completedByUserName: null,
        lastMovedAt: null
      });
    });

    batch.update(doc(db, 'campaigns', campaignId), {
      addressCountSnapshot: candidateAddresses.length,
      updatedAt: serverTimestamp()
    });

    await batch.commit();
    await logCampaignActivity(campaignId, null, 'campaign_assignments_generated', {
      generatedCount: generatedAssignments.length,
      preservedCount: preservedAssignments.length,
      addressCount: candidateAddresses.length
    });

    showToast('Asignacion automatica generada correctamente', 'success');
  }, [addresses, campaignAssignments, campaignGroups, campaignParticipants, campaigns, isAdmin, logCampaignActivity, showToast, territoryMap]);

  const handleActivateCampaign = useCallback(async (campaignId) => {
    if (!isAdmin) {
      throw new Error('Solo los administradores pueden activar campañas.');
    }

    const campaign = campaigns.find((item) => item.id === campaignId);
    if (!campaign) {
      throw new Error('No se encontro la campaña seleccionada.');
    }

    const anotherActiveCampaign = campaigns.find(
      (item) => item.status === CAMPAIGN_STATUSES.ACTIVE && item.id !== campaignId
    );

    if (anotherActiveCampaign) {
      throw new Error('Ya existe una campaña activa. Completa o archiva la actual antes de activar otra.');
    }

    const candidateAddresses = getCampaignCandidateAddresses({
      campaign,
      addresses,
      territoryMap
    });
    const assignmentCount = campaignAssignments.filter((assignment) => assignment.campaignId === campaignId).length;

    if (candidateAddresses.length === 0) {
      throw new Error('La campaña no tiene direcciones disponibles para activar.');
    }

    if (assignmentCount !== candidateAddresses.length) {
      throw new Error('Debes generar asignaciones para todas las direcciones antes de activar la campaña.');
    }

    await updateDoc(doc(db, 'campaigns', campaignId), {
      status: CAMPAIGN_STATUSES.ACTIVE,
      activatedAt: campaign.activatedAt || serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    await logCampaignActivity(campaignId, null, 'campaign_activated', {
      assignmentCount
    });

    showToast('Campaña activada correctamente', 'success');
  }, [addresses, campaignAssignments, campaigns, isAdmin, logCampaignActivity, showToast, territoryMap]);

  const handleCompleteCampaign = useCallback(async (campaignId) => {
    if (!isAdmin) {
      throw new Error('Solo los administradores pueden completar campañas.');
    }

    await updateDoc(doc(db, 'campaigns', campaignId), {
      status: CAMPAIGN_STATUSES.COMPLETED,
      completedAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    await logCampaignActivity(campaignId, null, 'campaign_completed');
    showToast('Campaña completada', 'success');
  }, [isAdmin, logCampaignActivity, showToast]);

  const handleArchiveCampaign = useCallback(async (campaignId) => {
    if (!isAdmin) {
      throw new Error('Solo los administradores pueden archivar campañas.');
    }

    await updateDoc(doc(db, 'campaigns', campaignId), {
      status: CAMPAIGN_STATUSES.ARCHIVED,
      updatedAt: serverTimestamp()
    });

    await logCampaignActivity(campaignId, null, 'campaign_archived');
    showToast('Campaña archivada', 'success');
  }, [isAdmin, logCampaignActivity, showToast]);

  const handleUpdateCampaignAssignmentStatus = useCallback(async (assignmentId, nextStatus) => {
    const assignment = campaignAssignments.find((item) => item.id === assignmentId);
    if (!assignment) {
      throw new Error('No se encontro la asignacion seleccionada.');
    }

    const canEdit = isAdmin || assignment.assignedUserId === currentUser?.id;
    if (!canEdit) {
      throw new Error('No tienes permiso para actualizar esta asignacion.');
    }

    if (!Object.values(CAMPAIGN_PROGRESS_STATUSES).includes(nextStatus)) {
      throw new Error('Estado de campaña no valido.');
    }

    const updates = {
      status: nextStatus,
      updatedAt: serverTimestamp()
    };

    if (nextStatus === CAMPAIGN_PROGRESS_STATUSES.PENDING) {
      updates.startedAt = null;
      updates.completedAt = null;
      updates.completedByUserId = null;
      updates.completedByUserName = null;
    }

    if (nextStatus === CAMPAIGN_PROGRESS_STATUSES.IN_PROGRESS) {
      updates.startedAt = assignment.startedAt || serverTimestamp();
      updates.completedAt = null;
      updates.completedByUserId = null;
      updates.completedByUserName = null;
    }

    if (nextStatus === CAMPAIGN_PROGRESS_STATUSES.COMPLETED) {
      updates.startedAt = assignment.startedAt || serverTimestamp();
      updates.completedAt = serverTimestamp();
      updates.completedByUserId = currentUser?.id || null;
      updates.completedByUserName = currentUser?.name || 'Usuario';
    }

    await updateDoc(doc(db, 'campaignAssignments', assignmentId), updates);
    await logCampaignActivity(assignment.campaignId, assignmentId, 'assignment_status_changed', {
      from: assignment.status,
      to: nextStatus
    });
  }, [campaignAssignments, currentUser, isAdmin, logCampaignActivity]);

  const handleResetCampaignAssignment = useCallback(async (assignmentId) => {
    if (!isAdmin) {
      throw new Error('Solo los administradores pueden resetear asignaciones.');
    }

    const assignment = campaignAssignments.find((item) => item.id === assignmentId);
    if (!assignment) {
      throw new Error('No se encontro la asignacion seleccionada.');
    }

    await updateDoc(doc(db, 'campaignAssignments', assignmentId), {
      status: CAMPAIGN_PROGRESS_STATUSES.PENDING,
      startedAt: null,
      completedAt: null,
      completedByUserId: null,
      completedByUserName: null,
      updatedAt: serverTimestamp()
    });

    await logCampaignActivity(assignment.campaignId, assignmentId, 'assignment_reset');
    showToast('Asignacion reseteada', 'success');
  }, [campaignAssignments, isAdmin, logCampaignActivity, showToast]);

  const handleMoveCampaignAssignment = useCallback(async (assignmentId, nextUserId) => {
    if (!isAdmin) {
      throw new Error('Solo los administradores pueden mover asignaciones.');
    }

    const assignment = campaignAssignments.find((item) => item.id === assignmentId);
    if (!assignment) {
      throw new Error('No se encontro la asignacion seleccionada.');
    }

    if (assignment.status !== CAMPAIGN_PROGRESS_STATUSES.PENDING) {
      throw new Error('Resetea la asignacion a pendiente antes de moverla.');
    }

    const targetParticipant = campaignParticipants.find((participant) => (
      participant.campaignId === assignment.campaignId && participant.userId === nextUserId
    ));

    if (!targetParticipant) {
      throw new Error('Selecciona una persona valida dentro de la campaña.');
    }

    const relatedGroup = targetParticipant.groupId
      ? campaignGroups.find((group) => group.id === targetParticipant.groupId)
      : null;

    await updateDoc(doc(db, 'campaignAssignments', assignmentId), {
      assignedUserId: targetParticipant.userId,
      assignedUserName: targetParticipant.userNameSnapshot,
      groupId: targetParticipant.groupId || null,
      groupLabelSnapshot: relatedGroup?.label || null,
      manualLocked: true,
      lastMovedAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    await logCampaignActivity(assignment.campaignId, assignmentId, 'assignment_moved', {
      fromUserId: assignment.assignedUserId,
      toUserId: targetParticipant.userId
    });

    showToast('Asignacion movida y bloqueada', 'success');
  }, [campaignAssignments, campaignGroups, campaignParticipants, isAdmin, logCampaignActivity, showToast]);

  const handleToggleCampaignAssignmentLock = useCallback(async (assignmentId) => {
    if (!isAdmin) {
      throw new Error('Solo los administradores pueden bloquear asignaciones.');
    }

    const assignment = campaignAssignments.find((item) => item.id === assignmentId);
    if (!assignment) {
      throw new Error('No se encontro la asignacion seleccionada.');
    }

    await updateDoc(doc(db, 'campaignAssignments', assignmentId), {
      manualLocked: !assignment.manualLocked,
      updatedAt: serverTimestamp()
    });

    await logCampaignActivity(assignment.campaignId, assignmentId, 'assignment_lock_toggled', {
      manualLocked: !assignment.manualLocked
    });
  }, [campaignAssignments, isAdmin, logCampaignActivity]);

  const value = {
    campaigns: campaignsSorted,
    campaignGroups,
    campaignParticipants,
    campaignAssignments,
    campaignActivity,
    campaignsLoading,
    activeCampaign,
    campaignHistory,
    activeCampaignGroups,
    activeCampaignParticipants,
    activeCampaignAssignments,
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
  };

  return <CampaignContext.Provider value={value}>{children}</CampaignContext.Provider>;
};

export default CampaignContext;
