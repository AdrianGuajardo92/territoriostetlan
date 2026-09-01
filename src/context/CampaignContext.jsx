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
  deleteField,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  runTransaction,
  serverTimestamp,
  updateDoc,
  where,
  writeBatch
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { useToast } from '../hooks/useToast';
import { useApp } from './AppContext';
import {
  CAMPAIGN_FINAL_SUMMARY_VERSION,
  CAMPAIGN_PROGRESS_STATUSES,
  CAMPAIGN_REASSIGNMENT_UNDO_FIELDS,
  CAMPAIGN_REASSIGNMENT_UNDO_WINDOW_MS,
  CAMPAIGN_STATUSES,
  assertCampaignAssignmentsWritable,
  hasCampaignPeriodEnded,
  normalizeCampaignDateRange,
  buildCampaignFinalizeUpdate,
  buildCampaignFinalSummary,
  buildCampaignReassignmentUndoEntry,
  buildRedistributionNeeds,
  buildTerritoryMap,
  calculateCampaignTargets,
  countPreservedAssignmentsByUser,
  distributeAddressesAcrossParticipants,
  getCampaignCandidateAddresses,
  getPendingUnlockedCampaignAssignments,
  getPreservedCampaignAssignments,
  isCampaignReassignmentUndoTokenExpired,
  normalizeParticipantConfig,
  prepareDistributionTargetsForApply,
  selectCampaignAssignmentsForReassignment,
  sortCampaigns,
  validateCampaignReassignmentUndoCandidate,
  validateDistributionTargets,
  validateRedistributionAddressPool,
  verifyDistributionCounts
} from '../utils/campaignUtils';

const CampaignContext = createContext();

const buildLookup = (items = []) => items.reduce((accumulator, item) => {
  accumulator[item.id] = item;
  return accumulator;
}, {});

const mapSnapshotDocs = (snapshot) => snapshot.docs.map((itemDoc) => ({
  id: itemDoc.id,
  ...itemDoc.data()
}));

const FIRESTORE_BATCH_LIMIT = 500;
const hasOwn = (value, key) => Object.prototype.hasOwnProperty.call(value, key);

const buildCampaignReassignmentUndoUpdates = (undoEntry) => {
  const updates = CAMPAIGN_REASSIGNMENT_UNDO_FIELDS.reduce((result, field) => {
    result[field] = hasOwn(undoEntry.previous, field)
      ? undoEntry.previous[field]
      : deleteField();
    return result;
  }, {});

  updates.updatedAt = serverTimestamp();
  return updates;
};

const commitDeletesInBatches = async (docRefs = []) => {
  for (let index = 0; index < docRefs.length; index += FIRESTORE_BATCH_LIMIT) {
    const batch = writeBatch(db);
    const chunk = docRefs.slice(index, index + FIRESTORE_BATCH_LIMIT);
    chunk.forEach((docRef) => batch.delete(docRef));
    await batch.commit();
  }
};

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
  const [campaignParticipants, setCampaignParticipants] = useState([]);
  const [campaignAssignments, setCampaignAssignments] = useState([]);
  const [campaignActivity, setCampaignActivity] = useState([]);
  const [campaignsLoading, setCampaignsLoading] = useState(true);

  const unsubscribesRef = useRef([]);
  const autoFinalizedIdsRef = useRef(new Set());

  const isAdmin = currentUser?.role === 'admin';
  const allTerritoryIds = useMemo(
    () => territories.map((territory) => territory.id).filter(Boolean),
    [territories]
  );
  const territoryMap = useMemo(() => buildTerritoryMap(territories), [territories]);
  const usersById = useMemo(() => buildLookup(users), [users]);

  const resolveCampaign = useCallback(async (campaignId, options = {}) => {
    const preferLatest = options.preferLatest === true;

    if (!campaignId) {
      return null;
    }

    if (!preferLatest) {
      const localCampaign = campaigns.find((item) => item.id === campaignId);
      if (localCampaign) {
        return localCampaign;
      }
    }

    const campaignSnapshot = await getDoc(doc(db, 'campaigns', campaignId));
    if (!campaignSnapshot.exists()) {
      return null;
    }

    return {
      id: campaignSnapshot.id,
      ...campaignSnapshot.data()
    };
  }, [campaigns]);

  const resolveCampaignItems = useCallback(async (collectionName, campaignId, localItems = [], options = {}) => {
    const preferLatest = options.preferLatest === true;
    const localMatches = localItems.filter((item) => item.campaignId === campaignId);

    if (!preferLatest && localMatches.length > 0) {
      return localMatches;
    }

    const snapshot = await getDocs(query(
      collection(db, collectionName),
      where('campaignId', '==', campaignId)
    ));

    return mapSnapshotDocs(snapshot);
  }, []);

  const resetCampaignState = useCallback(() => {
    setCampaigns([]);
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

    const unsubscribeParticipants = isAdmin
      ? onSnapshot(collection(db, 'campaignParticipants'), (snapshot) => {
        setCampaignParticipants(snapshot.docs.map((participantDoc) => ({
          id: participantDoc.id,
          ...participantDoc.data()
        })));
      })
      : () => {
        setCampaignParticipants([]);
      };

    const assignmentsQuery = isAdmin
      ? collection(db, 'campaignAssignments')
      : query(
        collection(db, 'campaignAssignments'),
        where('assignedUserId', '==', currentUser.id)
      );

    const unsubscribeAssignments = onSnapshot(assignmentsQuery, (snapshot) => {
      const nextAssignments = snapshot.docs.map((assignmentDoc) => ({
        id: assignmentDoc.id,
        ...assignmentDoc.data()
      }));
      setCampaignAssignments(nextAssignments);
    });

    const unsubscribeActivity = isAdmin
      ? onSnapshot(collection(db, 'campaignActivity'), (snapshot) => {
        setCampaignActivity(snapshot.docs.map((activityDoc) => ({
          id: activityDoc.id,
          ...activityDoc.data()
        })));
      })
      : () => {
        setCampaignActivity([]);
      };

    unsubscribesRef.current = [
      unsubscribeCampaigns,
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
  }, [currentUser, isAdmin, resetCampaignState]);

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

  const normalizeCampaignPayload = useCallback((payload = {}) => {
    const dateRange = normalizeCampaignDateRange(payload.eventDate, payload.eventEndDate);

    return {
      name: String(payload.name || '').trim(),
      type: String(payload.type || 'asamblea').trim().toLowerCase(),
      eventDate: dateRange.eventDate,
      eventEndDate: dateRange.eventEndDate,
      status: payload.status || CAMPAIGN_STATUSES.DRAFT,
      sourceTerritoryIds: Array.from(new Set(allTerritoryIds)),
      excludedAddressIds: Array.from(new Set(Array.isArray(payload.excludedAddressIds) ? payload.excludedAddressIds : [])),
      addressCountSnapshot: Number(payload.addressCountSnapshot) || 0
    };
  }, [allTerritoryIds]);

  const handleCreateCampaign = useCallback(async (payload) => {
    if (!isAdmin) {
      throw new Error('Solo los administradores pueden crear campañas.');
    }

    const normalizedPayload = normalizeCampaignPayload(payload);

    if (!normalizedPayload.name) {
      throw new Error('La campaña necesita un nombre.');
    }

    if (normalizedPayload.sourceTerritoryIds.length === 0) {
      throw new Error('No hay territorios disponibles para la campaña.');
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

    const campaign = await resolveCampaign(campaignId, { preferLatest: true });
    assertCampaignAssignmentsWritable(campaign);

    const normalizedUpdates = normalizeCampaignPayload({
      ...campaign,
      ...updates,
      status: updates.status || campaign.status || CAMPAIGN_STATUSES.DRAFT
    });

    if (!normalizedUpdates.name) {
      throw new Error('La campaña necesita un nombre.');
    }

    if (normalizedUpdates.sourceTerritoryIds.length === 0) {
      throw new Error('No hay territorios disponibles para la campaña.');
    }

    await updateDoc(doc(db, 'campaigns', campaignId), {
      ...normalizedUpdates,
      updatedAt: serverTimestamp()
    });

    await logCampaignActivity(campaignId, null, 'campaign_updated', {
      name: normalizedUpdates.name,
      territories: normalizedUpdates.sourceTerritoryIds.length
    });
  }, [isAdmin, logCampaignActivity, normalizeCampaignPayload, resolveCampaign]);

  const handleSaveCampaignStructure = useCallback(async (campaignId, structure) => {
    if (!isAdmin) {
      throw new Error('Solo los administradores pueden editar participantes.');
    }

    const campaign = await resolveCampaign(campaignId, { preferLatest: true });
    assertCampaignAssignmentsWritable(campaign);

    const rawParticipants = Array.isArray(structure?.participants) ? structure.participants : [];

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
          groupId: null,
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

    const existingGroupsSnapshot = await getDocs(query(
      collection(db, 'campaignGroups'),
      where('campaignId', '==', campaignId)
    ));
    const existingParticipants = campaignParticipants.filter((participant) => participant.campaignId === campaignId);
    const nextParticipantIds = new Set(normalizedParticipants.map((participant) => participant.id).filter(Boolean));
    const batch = writeBatch(db);

    existingGroupsSnapshot.docs.forEach((groupDoc) => {
      batch.delete(doc(db, 'campaignGroups', groupDoc.id));
    });

    existingParticipants.forEach((participant) => {
      if (!nextParticipantIds.has(participant.id)) {
        batch.delete(doc(db, 'campaignParticipants', participant.id));
      }
    });

    normalizedParticipants.forEach((participant) => {
      const participantRef = participant.id
        ? doc(db, 'campaignParticipants', participant.id)
        : doc(collection(db, 'campaignParticipants'));

      batch.set(participantRef, {
        campaignId,
        userId: participant.userId,
        userNameSnapshot: participant.userNameSnapshot,
        groupId: null,
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
      participantCount: normalizedParticipants.length
    });
    showToast('Participantes guardados', 'success');
  }, [campaignParticipants, isAdmin, logCampaignActivity, resolveCampaign, showToast, usersById]);

  const handleRedistributeCampaignAssignments = useCallback(async (campaignId, participantTargets = {}, options = {}) => {
    if (!isAdmin) {
      throw new Error('Solo los administradores pueden reorganizar asignaciones.');
    }

    const campaign = await resolveCampaign(campaignId, options);
    assertCampaignAssignmentsWritable(campaign);

    const candidateAddresses = getCampaignCandidateAddresses({
      campaign,
      addresses,
      territoryMap
    });

    if (candidateAddresses.length === 0) {
      throw new Error('La campaña no tiene direcciones disponibles para asignar.');
    }

    const campaignSpecificParticipants = (await resolveCampaignItems(
      'campaignParticipants',
      campaignId,
      campaignParticipants,
      options
    ))
      .map(normalizeParticipantConfig)
      .filter((participant) => participant.isEnabled);

    if (campaignSpecificParticipants.length === 0) {
      throw new Error('Debes agregar al menos una persona antes de reorganizar el reparto.');
    }

    const existingAssignments = await resolveCampaignItems(
      'campaignAssignments',
      campaignId,
      campaignAssignments,
      options
    );
    const preservedAssignments = getPreservedCampaignAssignments(existingAssignments);
    const pendingUnlockedAssignments = getPendingUnlockedCampaignAssignments(existingAssignments);
    const preservedCountsByUser = countPreservedAssignmentsByUser(existingAssignments);

    const sanitizedTargets = prepareDistributionTargetsForApply(
      participantTargets,
      campaignSpecificParticipants,
      preservedCountsByUser,
      candidateAddresses.length
    );

    validateDistributionTargets({
      participantTargets: sanitizedTargets,
      totalAddresses: candidateAddresses.length,
      preservedCountsByUser
    });

    const redistributionNeeds = buildRedistributionNeeds({
      participantTargets: sanitizedTargets,
      preservedCountsByUser
    });

    if (redistributionNeeds.reduce((sum, entry) => sum + entry.assignedCount, 0) !== pendingUnlockedAssignments.length) {
      throw new Error('El reparto manual no coincide con las direcciones pendientes disponibles.');
    }

    const pendingAddressIds = new Set(pendingUnlockedAssignments.map((assignment) => assignment.addressId));
    const addressesToRedistribute = candidateAddresses.filter((address) => pendingAddressIds.has(address.id));

    validateRedistributionAddressPool(pendingUnlockedAssignments, addressesToRedistribute);

    const generatedAssignments = distributeAddressesAcrossParticipants({
      addresses: addressesToRedistribute,
      participants: campaignSpecificParticipants,
      targets: redistributionNeeds,
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
        sortOrder: preservedAssignments.length + index,
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
      distributionTargetsDraft: deleteField(),
      distributionTargetsDraftMeta: deleteField(),
      updatedAt: serverTimestamp()
    });

    await batch.commit();

    const updatedAssignments = await resolveCampaignItems(
      'campaignAssignments',
      campaignId,
      [],
      { preferLatest: true }
    );
    verifyDistributionCounts(updatedAssignments, sanitizedTargets);

    await logCampaignActivity(campaignId, null, 'campaign_assignments_redistributed', {
      redistributedCount: generatedAssignments.length,
      preservedCount: preservedAssignments.length,
      addressCount: candidateAddresses.length
    });

    showToast('Reparto actualizado correctamente', 'success');
  }, [
    addresses,
    campaignAssignments,
    campaignParticipants,
    isAdmin,
    logCampaignActivity,
    resolveCampaign,
    resolveCampaignItems,
    showToast,
    territoryMap
  ]);

  const handleGenerateCampaignAssignments = useCallback(async (campaignId, options = {}) => {
    if (!isAdmin) {
      throw new Error('Solo los administradores pueden generar asignaciones.');
    }

    const campaign = await resolveCampaign(campaignId, options);
    assertCampaignAssignmentsWritable(campaign);

    const candidateAddresses = getCampaignCandidateAddresses({
      campaign,
      addresses,
      territoryMap
    });

    if (candidateAddresses.length === 0) {
      throw new Error('La campaña no tiene direcciones disponibles para asignar.');
    }

    const campaignSpecificParticipants = (await resolveCampaignItems(
      'campaignParticipants',
      campaignId,
      campaignParticipants,
      options
    ))
      .map(normalizeParticipantConfig)
      .filter((participant) => participant.isEnabled);

    if (campaignSpecificParticipants.length === 0) {
      throw new Error('Debes agregar al menos una persona antes de generar la campaña.');
    }

    const existingAssignments = await resolveCampaignItems(
      'campaignAssignments',
      campaignId,
      campaignAssignments,
      options
    );
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
      distributionTargetsDraft: deleteField(),
      distributionTargetsDraftMeta: deleteField(),
      updatedAt: serverTimestamp()
    });

    await batch.commit();
    await logCampaignActivity(campaignId, null, 'campaign_assignments_generated', {
      generatedCount: generatedAssignments.length,
      preservedCount: preservedAssignments.length,
      addressCount: candidateAddresses.length
    });

    showToast('Asignacion automatica generada correctamente', 'success');
  }, [
    addresses,
    campaignAssignments,
    campaignParticipants,
    isAdmin,
    logCampaignActivity,
    resolveCampaign,
    resolveCampaignItems,
    showToast,
    territoryMap
  ]);

  const handleActivateCampaign = useCallback(async (campaignId, options = {}) => {
    if (!isAdmin) {
      throw new Error('Solo los administradores pueden activar campañas.');
    }

    const campaign = await resolveCampaign(campaignId, { ...options, preferLatest: true });
    assertCampaignAssignmentsWritable(campaign);

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
    const campaignSpecificAssignments = await resolveCampaignItems(
      'campaignAssignments',
      campaignId,
      campaignAssignments,
      options
    );
    const assignmentCount = campaignSpecificAssignments.length;

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
  }, [
    addresses,
    campaignAssignments,
    campaigns,
    isAdmin,
    logCampaignActivity,
    resolveCampaign,
    resolveCampaignItems,
    showToast,
    territoryMap
  ]);

  const handleCompleteCampaign = useCallback(async (campaignId) => {
    if (!isAdmin) {
      throw new Error('Solo los administradores pueden completar campañas.');
    }

    const campaign = await resolveCampaign(campaignId, { preferLatest: true });
    if (!campaign) {
      throw new Error('No se encontró la campaña seleccionada.');
    }
    if (campaign.status !== CAMPAIGN_STATUSES.ACTIVE) {
      throw new Error('Solo se puede finalizar una campaña activa.');
    }

    const [participantsForCampaign, assignmentsForCampaign] = await Promise.all([
      resolveCampaignItems(
        'campaignParticipants',
        campaignId,
        campaignParticipants,
        { preferLatest: true }
      ),
      resolveCampaignItems(
        'campaignAssignments',
        campaignId,
        campaignAssignments,
        { preferLatest: true }
      )
    ]);

    const finalSummary = buildCampaignFinalSummary({
      campaign,
      participants: participantsForCampaign,
      assignments: assignmentsForCampaign
    });

    await updateDoc(doc(db, 'campaigns', campaignId), {
      status: CAMPAIGN_STATUSES.COMPLETED,
      completedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      finalSummary,
      finalSummaryVersion: CAMPAIGN_FINAL_SUMMARY_VERSION
    });

    await logCampaignActivity(campaignId, null, 'campaign_completed', {
      total: finalSummary.total,
      completed: finalSummary.completed,
      pending: finalSummary.pending,
      inProgress: finalSummary.inProgress,
      progressPercent: finalSummary.progressPercent
    });
    showToast('Campaña completada', 'success');
  }, [
    campaignAssignments,
    campaignParticipants,
    isAdmin,
    logCampaignActivity,
    resolveCampaign,
    resolveCampaignItems,
    showToast
  ]);

  const handleArchiveCampaign = useCallback(async (campaignId) => {
    if (!isAdmin) {
      throw new Error('Solo los administradores pueden archivar campañas.');
    }

    const campaign = await resolveCampaign(campaignId, { preferLatest: true });
    const finalizeUpdate = buildCampaignFinalizeUpdate({
      campaign,
      participants: [],
      assignments: []
    });

    if (finalizeUpdate.mode !== 'archive') {
      throw new Error('Solo se pueden archivar campañas ya finalizadas.');
    }

    await updateDoc(doc(db, 'campaigns', campaignId), {
      ...finalizeUpdate.fields,
      updatedAt: serverTimestamp()
    });

    await logCampaignActivity(campaignId, null, 'campaign_archived');
    showToast('Campaña archivada', 'success');
  }, [isAdmin, logCampaignActivity, resolveCampaign, showToast]);

  const handleFinalizeAndArchiveCampaign = useCallback(async (campaignId) => {
    if (!isAdmin) {
      throw new Error('Solo los administradores pueden finalizar campañas.');
    }

    const campaign = await resolveCampaign(campaignId, { preferLatest: true });
    if (!campaign) {
      throw new Error('No se encontró la campaña seleccionada.');
    }
    if (campaign.status === CAMPAIGN_STATUSES.COMPLETED) {
      await handleArchiveCampaign(campaignId);
      return;
    }

    const [participantsForCampaign, assignmentsForCampaign] = await Promise.all([
      resolveCampaignItems(
        'campaignParticipants',
        campaignId,
        campaignParticipants,
        { preferLatest: true }
      ),
      resolveCampaignItems(
        'campaignAssignments',
        campaignId,
        campaignAssignments,
        { preferLatest: true }
      )
    ]);

    const finalizeUpdate = buildCampaignFinalizeUpdate({
      campaign,
      participants: participantsForCampaign,
      assignments: assignmentsForCampaign
    });

    await updateDoc(doc(db, 'campaigns', campaignId), {
      ...finalizeUpdate.fields,
      completedAt: campaign.completedAt || serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    if (finalizeUpdate.mode === 'finalize' && finalizeUpdate.finalSummary) {
      await logCampaignActivity(campaignId, null, 'campaign_completed', {
        total: finalizeUpdate.finalSummary.total,
        completed: finalizeUpdate.finalSummary.completed,
        pending: finalizeUpdate.finalSummary.pending,
        inProgress: finalizeUpdate.finalSummary.inProgress,
        progressPercent: finalizeUpdate.finalSummary.progressPercent
      });
    }

    await logCampaignActivity(campaignId, null, 'campaign_archived');
    showToast('Campaña finalizada y archivada', 'success');
  }, [
    campaignAssignments,
    campaignParticipants,
    handleArchiveCampaign,
    isAdmin,
    logCampaignActivity,
    resolveCampaign,
    resolveCampaignItems,
    showToast
  ]);

  useEffect(() => {
    if (!isAdmin || campaignsLoading) return undefined;

    const expiredActive = campaigns.find((campaign) => (
      campaign.status === CAMPAIGN_STATUSES.ACTIVE
      && hasCampaignPeriodEnded(campaign)
      && !autoFinalizedIdsRef.current.has(campaign.id)
    ));

    if (!expiredActive) return undefined;

    autoFinalizedIdsRef.current.add(expiredActive.id);
    handleFinalizeAndArchiveCampaign(expiredActive.id).catch((error) => {
      autoFinalizedIdsRef.current.delete(expiredActive.id);
      console.error('No se pudo cerrar la campaña al vencer su fecha:', error);
    });

    return undefined;
  }, [campaigns, campaignsLoading, handleFinalizeAndArchiveCampaign, isAdmin]);

  const handleDeleteCampaign = useCallback(async (campaignId) => {
    if (!isAdmin) {
      throw new Error('Solo los administradores pueden eliminar campañas.');
    }

    const campaign = await resolveCampaign(campaignId, { preferLatest: true });
    if (!campaign) {
      throw new Error('No se encontró la campaña seleccionada.');
    }
    if (campaign.status !== CAMPAIGN_STATUSES.DRAFT) {
      throw new Error(
        'Solo se pueden eliminar campañas en borrador. Las activas, completadas o archivadas se conservan en el historial.'
      );
    }

    const [
      assignmentsSnapshot,
      groupsSnapshot,
      participantsSnapshot,
      activitySnapshot
    ] = await Promise.all([
      getDocs(query(collection(db, 'campaignAssignments'), where('campaignId', '==', campaignId))),
      getDocs(query(collection(db, 'campaignGroups'), where('campaignId', '==', campaignId))),
      getDocs(query(collection(db, 'campaignParticipants'), where('campaignId', '==', campaignId))),
      getDocs(query(collection(db, 'campaignActivity'), where('campaignId', '==', campaignId)))
    ]);

    const assignmentCount = assignmentsSnapshot.docs.length;

    const docRefsToDelete = [
      ...assignmentsSnapshot.docs.map((assignmentDoc) => doc(db, 'campaignAssignments', assignmentDoc.id)),
      ...groupsSnapshot.docs.map((groupDoc) => doc(db, 'campaignGroups', groupDoc.id)),
      ...participantsSnapshot.docs.map((participantDoc) => doc(db, 'campaignParticipants', participantDoc.id)),
      ...activitySnapshot.docs.map((activityDoc) => doc(db, 'campaignActivity', activityDoc.id)),
      doc(db, 'campaigns', campaignId)
    ];

    await commitDeletesInBatches(docRefsToDelete);

    showToast(
      `Campaña "${campaign.name}" eliminada junto con ${assignmentCount} asignación${assignmentCount === 1 ? '' : 'es'}. Las direcciones de los territorios se conservan.`,
      'success'
    );
  }, [isAdmin, resolveCampaign, showToast]);

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

    const campaign = await resolveCampaign(assignment.campaignId, { preferLatest: true });
    assertCampaignAssignmentsWritable(campaign);

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
    }).catch(() => {});
  }, [campaignAssignments, currentUser, isAdmin, logCampaignActivity, resolveCampaign]);

  const handleResetCampaignAssignment = useCallback(async (assignmentId) => {
    if (!isAdmin) {
      throw new Error('Solo los administradores pueden resetear asignaciones.');
    }

    const assignment = campaignAssignments.find((item) => item.id === assignmentId);
    if (!assignment) {
      throw new Error('No se encontro la asignacion seleccionada.');
    }

    const campaign = await resolveCampaign(assignment.campaignId, { preferLatest: true });
    assertCampaignAssignmentsWritable(campaign);

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
  }, [campaignAssignments, isAdmin, logCampaignActivity, resolveCampaign, showToast]);

  const handleReassignCampaignAssignments = useCallback(async ({
    campaignId,
    sourceUserId,
    targetUserId,
    mode = 'single',
    assignmentId = null,
    expectedStatus = null
  }) => {
    if (!isAdmin) {
      throw new Error('Solo los administradores pueden reasignar direcciones.');
    }
    if (!campaignId || !sourceUserId || !targetUserId) {
      throw new Error('Faltan datos para completar la reasignación.');
    }
    if (sourceUserId === targetUserId) {
      throw new Error('Selecciona una persona diferente.');
    }

    const [latestCampaign, latestAssignments, latestParticipants] = await Promise.all([
      resolveCampaign(campaignId, { preferLatest: true }),
      resolveCampaignItems('campaignAssignments', campaignId, campaignAssignments, { preferLatest: true }),
      resolveCampaignItems('campaignParticipants', campaignId, campaignParticipants, { preferLatest: true })
    ]);
    if (!latestCampaign) {
      throw new Error('La campaña seleccionada ya no está disponible.');
    }
    assertCampaignAssignmentsWritable(latestCampaign);

    const targetParticipant = latestParticipants.find((participant) => (
      participant.userId === targetUserId && participant.isEnabled !== false
    ));
    if (!targetParticipant) {
      throw new Error('La persona seleccionada ya no participa en esta campaña.');
    }

    const assignmentsToMove = selectCampaignAssignmentsForReassignment({
      assignments: latestAssignments,
      campaignId,
      sourceUserId,
      mode,
      assignmentId,
      expectedStatus
    });
    if (assignmentsToMove.length === 0) {
      throw new Error('Esta persona ya no tiene direcciones pendientes para reasignar.');
    }
    if (assignmentsToMove.length + 1 > FIRESTORE_BATCH_LIMIT) {
      throw new Error('Hay demasiadas direcciones para moverlas en una sola operación.');
    }

    const operationId = doc(collection(db, 'campaignActivity')).id;
    const undoEntries = assignmentsToMove.map(buildCampaignReassignmentUndoEntry);
    const batch = writeBatch(db);
    let resetCount = 0;

    assignmentsToMove.forEach((assignment) => {
      const wasInProgress = assignment.status === CAMPAIGN_PROGRESS_STATUSES.IN_PROGRESS;
      if (wasInProgress) resetCount += 1;

      const updates = {
        assignedUserId: targetParticipant.userId,
        assignedUserName: targetParticipant.userNameSnapshot,
        groupId: null,
        groupLabelSnapshot: null,
        manualLocked: true,
        lastMoveOperationId: operationId,
        lastMovedAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      if (wasInProgress) {
        updates.status = CAMPAIGN_PROGRESS_STATUSES.PENDING;
        updates.startedAt = null;
        updates.completedAt = null;
        updates.completedByUserId = null;
        updates.completedByUserName = null;
      }

      batch.update(doc(db, 'campaignAssignments', assignment.id), updates);
    });

    batch.update(doc(db, 'campaigns', campaignId), {
      distributionTargetsDraft: deleteField(),
      distributionTargetsDraftMeta: deleteField(),
      updatedAt: serverTimestamp()
    });

    await batch.commit();

    await Promise.all(assignmentsToMove.map((assignment) => (
      logCampaignActivity(campaignId, assignment.id, 'assignment_moved', {
        fromUserId: sourceUserId,
        toUserId: targetParticipant.userId,
        operationId,
        resetFromInProgress: assignment.status === CAMPAIGN_PROGRESS_STATUSES.IN_PROGRESS,
        transferMode: mode
      })
    )));

    const movedCount = assignmentsToMove.length;
    const createdAt = Date.now();

    return {
      movedCount,
      resetCount,
      targetUserId: targetParticipant.userId,
      targetUserName: targetParticipant.userNameSnapshot,
      assignmentIds: assignmentsToMove.map((assignment) => assignment.id),
      undoToken: {
        version: 1,
        operationId,
        campaignId,
        sourceUserId,
        targetUserId: targetParticipant.userId,
        transferMode: mode,
        entries: undoEntries,
        createdAt,
        expiresAt: createdAt + CAMPAIGN_REASSIGNMENT_UNDO_WINDOW_MS
      }
    };
  }, [
    campaignAssignments,
    campaignParticipants,
    isAdmin,
    logCampaignActivity,
    resolveCampaign,
    resolveCampaignItems
  ]);

  const handleUndoCampaignReassignment = useCallback(async (
    undoToken,
    requestedAt = Date.now()
  ) => {
    if (!isAdmin) {
      throw new Error('Solo los administradores pueden deshacer reasignaciones.');
    }
    if (
      undoToken?.version !== 1
      || !undoToken.operationId
      || !undoToken.campaignId
      || !undoToken.targetUserId
      || !Array.isArray(undoToken.entries)
      || undoToken.entries.length === 0
    ) {
      throw new Error('La información para deshacer ya no es válida.');
    }
    if (isCampaignReassignmentUndoTokenExpired(undoToken, requestedAt)) {
      throw new Error('El tiempo para deshacer esta reasignación terminó.');
    }
    if (undoToken.entries.length + 1 > FIRESTORE_BATCH_LIMIT) {
      throw new Error('Hay demasiadas direcciones para deshacerlas en una sola operación.');
    }

    const uniqueAssignmentIds = new Set(
      undoToken.entries.map((entry) => entry.assignmentId)
    );
    const hasInvalidEntry = undoToken.entries.some((entry) => (
      !entry?.assignmentId
      || entry.campaignId !== undoToken.campaignId
      || !entry.previous?.assignedUserId
    ));
    if (hasInvalidEntry || uniqueAssignmentIds.size !== undoToken.entries.length) {
      throw new Error('La información para deshacer está incompleta.');
    }

    const campaignRef = doc(db, 'campaigns', undoToken.campaignId);
    const assignmentRefs = undoToken.entries.map(
      (entry) => doc(db, 'campaignAssignments', entry.assignmentId)
    );

    await runTransaction(db, async (transaction) => {
      const [campaignSnapshot, ...assignmentSnapshots] = await Promise.all([
        transaction.get(campaignRef),
        ...assignmentRefs.map((assignmentRef) => transaction.get(assignmentRef))
      ]);

      if (!campaignSnapshot.exists()) {
        throw new Error('La campaña seleccionada ya no está disponible.');
      }

      const campaign = { id: campaignSnapshot.id, ...campaignSnapshot.data() };
      assertCampaignAssignmentsWritable(campaign);

      assignmentSnapshots.forEach((assignmentSnapshot, index) => {
        const assignment = assignmentSnapshot.exists()
          ? { id: assignmentSnapshot.id, ...assignmentSnapshot.data() }
          : null;

        validateCampaignReassignmentUndoCandidate({
          assignment,
          undoEntry: undoToken.entries[index],
          operationId: undoToken.operationId,
          targetUserId: undoToken.targetUserId
        });
      });

      assignmentRefs.forEach((assignmentRef, index) => {
        transaction.update(
          assignmentRef,
          buildCampaignReassignmentUndoUpdates(undoToken.entries[index])
        );
      });

      transaction.update(campaignRef, {
        distributionTargetsDraft: deleteField(),
        distributionTargetsDraftMeta: deleteField(),
        updatedAt: serverTimestamp()
      });
    });

    await Promise.all(undoToken.entries.map((entry) => (
      logCampaignActivity(
        undoToken.campaignId,
        entry.assignmentId,
        'assignment_move_undone',
        {
          operationId: undoToken.operationId,
          fromUserId: undoToken.targetUserId,
          toUserId: entry.previous.assignedUserId,
          transferMode: undoToken.transferMode
        }
      )
    )));

    return {
      restoredCount: undoToken.entries.length,
      assignmentIds: undoToken.entries.map((entry) => entry.assignmentId),
      restoredAssignments: undoToken.entries.map((entry) => ({
        id: entry.assignmentId,
        ...entry.previous
      }))
    };
  }, [isAdmin, logCampaignActivity]);

  const handleToggleCampaignAssignmentLock = useCallback(async (assignmentId) => {
    if (!isAdmin) {
      throw new Error('Solo los administradores pueden bloquear asignaciones.');
    }

    const assignment = campaignAssignments.find((item) => item.id === assignmentId);
    if (!assignment) {
      throw new Error('No se encontro la asignacion seleccionada.');
    }

    const campaign = await resolveCampaign(assignment.campaignId, { preferLatest: true });
    assertCampaignAssignmentsWritable(campaign);

    await updateDoc(doc(db, 'campaignAssignments', assignmentId), {
      manualLocked: !assignment.manualLocked,
      updatedAt: serverTimestamp()
    });

    await logCampaignActivity(assignment.campaignId, assignmentId, 'assignment_lock_toggled', {
      manualLocked: !assignment.manualLocked
    });
  }, [campaignAssignments, isAdmin, logCampaignActivity, resolveCampaign]);

  const handleSaveDistributionTargetsDraft = useCallback(async (campaignId, targets = {}, meta = {}) => {
    if (!isAdmin) {
      throw new Error('Solo los administradores pueden guardar borradores de reparto.');
    }

    const campaign = await resolveCampaign(campaignId);
    assertCampaignAssignmentsWritable(campaign);

    const normalizedTargets = Object.entries(targets).reduce((accumulator, [userId, count]) => {
      const parsed = Math.max(0, Number.parseInt(String(count), 10) || 0);
      accumulator[userId] = parsed;
      return accumulator;
    }, {});

    await updateDoc(doc(db, 'campaigns', campaignId), {
      distributionTargetsDraft: normalizedTargets,
      distributionTargetsDraftMeta: {
        addressCount: Number(meta.addressCount) || 0,
        updatedAt: meta.updatedAt || new Date().toISOString()
      },
      updatedAt: serverTimestamp()
    });
  }, [isAdmin, resolveCampaign]);

  const value = {
    campaigns: campaignsSorted,
    campaignParticipants,
    campaignAssignments,
    campaignActivity,
    campaignsLoading,
    activeCampaign,
    campaignHistory,
    activeCampaignParticipants,
    activeCampaignAssignments,
    myCampaignAssignments,
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
  };

  return <CampaignContext.Provider value={value}>{children}</CampaignContext.Provider>;
};

export default CampaignContext;
