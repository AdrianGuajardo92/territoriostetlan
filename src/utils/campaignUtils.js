import { getDisplayAddress, getFullAddress } from './helpers';

export const CAMPAIGN_STATUSES = {
  DRAFT: 'draft',
  ACTIVE: 'active',
  COMPLETED: 'completed',
  ARCHIVED: 'archived'
};

export const CAMPAIGN_PROGRESS_STATUSES = {
  PENDING: 'pending',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed'
};

export const CAMPAIGN_FINAL_SUMMARY_VERSION = 1;

export const CAMPAIGN_REASSIGNMENT_UNDO_WINDOW_MS = 15_000;

export const CAMPAIGN_REASSIGNMENT_UNDO_FIELDS = [
  'assignedUserId',
  'assignedUserName',
  'groupId',
  'groupLabelSnapshot',
  'manualLocked',
  'status',
  'startedAt',
  'completedAt',
  'completedByUserId',
  'completedByUserName',
  'lastMovedAt',
  'lastMoveOperationId'
];

const DEFAULT_WEIGHT = 1;

export const shuffleCampaignItems = (items = [], random = Math.random) => {
  const shuffled = [...items];

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }

  return shuffled;
};

const normalizeText = (value = '') => String(value || '').trim().toLowerCase();
const hasOwn = (value, key) => Object.prototype.hasOwnProperty.call(value, key);

const getTimestampIdentity = (value) => {
  if (!value) return null;
  if (Number.isFinite(value.seconds)) {
    return `${value.seconds}:${value.nanoseconds || 0}`;
  }
  if (typeof value.toMillis === 'function') return String(value.toMillis());
  if (value instanceof Date) return String(value.getTime());
  return null;
};

const getTerritoryNumericValue = (territoryLike) => {
  const rawValue = typeof territoryLike === 'string'
    ? territoryLike
    : territoryLike?.name || territoryLike?.id || '';
  const match = String(rawValue).match(/\d+/);
  return match ? Number(match[0]) : Number.MAX_SAFE_INTEGER;
};

export const formatCampaignTypeLabel = (type) => {
  const normalized = normalizeText(type);

  if (normalized === 'asamblea') return 'Asamblea';
  if (normalized === 'conmemoracion' || normalized === 'conmemoración') return 'Conmemoracion';
  if (normalized === 'especial' || normalized === 'campana especial' || normalized === 'campaña especial') {
    return 'Campaña especial';
  }
  if (!normalized) return 'Campana';

  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
};

const CAMPAIGN_DATE_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export const parseCampaignDateKey = (dateLike) => {
  if (!dateLike) return null;

  if (typeof dateLike === 'string' && CAMPAIGN_DATE_KEY_PATTERN.test(dateLike)) {
    const [year, month, day] = dateLike.split('-').map(Number);
    return new Date(year, month - 1, day);
  }

  const value = dateLike?.toDate ? dateLike.toDate() : new Date(dateLike);
  if (Number.isNaN(value.getTime())) return null;
  return value;
};

export const toCampaignDateKey = (dateLike) => {
  if (typeof dateLike === 'string' && CAMPAIGN_DATE_KEY_PATTERN.test(dateLike)) {
    return dateLike;
  }

  const value = parseCampaignDateKey(dateLike);
  if (!value) return '';

  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const normalizeCampaignDateRange = (startLike, endLike) => {
  const startKey = toCampaignDateKey(startLike);
  const endKey = toCampaignDateKey(endLike) || startKey;

  if (!startKey) {
    return { eventDate: '', eventEndDate: '' };
  }

  if (endKey && endKey < startKey) {
    return { eventDate: endKey, eventEndDate: startKey };
  }

  return {
    eventDate: startKey,
    eventEndDate: endKey || startKey
  };
};

export const formatCampaignDate = (dateLike) => {
  const value = parseCampaignDateKey(dateLike);
  if (!value) return 'Sin fecha';

  return value.toLocaleDateString('es-MX', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

export const formatCampaignDateRange = (startLike, endLike) => {
  const range = normalizeCampaignDateRange(startLike, endLike);
  if (!range.eventDate) return 'Sin fecha';
  if (!range.eventEndDate || range.eventEndDate === range.eventDate) {
    return formatCampaignDate(range.eventDate);
  }

  const startDate = parseCampaignDateKey(range.eventDate);
  const endDate = parseCampaignDateKey(range.eventEndDate);
  const sameYear = startDate.getFullYear() === endDate.getFullYear();
  const startLabel = startDate.toLocaleDateString('es-MX', {
    day: 'numeric',
    month: 'short',
    year: sameYear ? undefined : 'numeric'
  });

  return `${startLabel} – ${formatCampaignDate(range.eventEndDate)}`;
};

export const formatCampaignSchedule = (campaign) => (
  formatCampaignDateRange(campaign?.eventDate, campaign?.eventEndDate || campaign?.eventDate)
);

export const getCampaignPeriodEndAt = (endDateLike) => {
  const endDate = parseCampaignDateKey(endDateLike);
  if (!endDate) return null;

  const periodEnd = new Date(endDate);
  periodEnd.setDate(periodEnd.getDate() + 1);
  periodEnd.setHours(1, 0, 0, 0);
  return periodEnd;
};

export const hasCampaignPeriodEnded = (campaign, now = new Date()) => {
  const endKey = toCampaignDateKey(campaign?.eventEndDate);
  if (!endKey) return false;

  const periodEnd = getCampaignPeriodEndAt(endKey);
  return Boolean(periodEnd && now.getTime() >= periodEnd.getTime());
};

export const sortCampaigns = (campaigns = []) => {
  const statusOrder = {
    [CAMPAIGN_STATUSES.ACTIVE]: 0,
    [CAMPAIGN_STATUSES.DRAFT]: 1,
    [CAMPAIGN_STATUSES.COMPLETED]: 2,
    [CAMPAIGN_STATUSES.ARCHIVED]: 3
  };

  return [...campaigns].sort((a, b) => {
    const statusDiff = (statusOrder[a.status] ?? 99) - (statusOrder[b.status] ?? 99);
    if (statusDiff !== 0) return statusDiff;

    const dateA = a.eventDate?.toDate ? a.eventDate.toDate() : new Date(a.eventDate || a.createdAt || 0);
    const dateB = b.eventDate?.toDate ? b.eventDate.toDate() : new Date(b.eventDate || b.createdAt || 0);
    return dateB - dateA;
  });
};

export const buildTerritoryMap = (territories = []) =>
  territories.reduce((accumulator, territory) => {
    accumulator[territory.id] = territory;
    return accumulator;
  }, {});

export const sortCampaignSourceAddresses = (addresses = [], territoryMap = {}) => {
  return [...addresses].sort((a, b) => {
    const territoryA = territoryMap[a.territoryId] || a.territoryName || a.territoryId;
    const territoryB = territoryMap[b.territoryId] || b.territoryName || b.territoryId;

    const territoryDiff = getTerritoryNumericValue(territoryA) - getTerritoryNumericValue(territoryB);
    if (territoryDiff !== 0) return territoryDiff;

    const territoryNameA = territoryMap[a.territoryId]?.name || '';
    const territoryNameB = territoryMap[b.territoryId]?.name || '';
    const territoryNameDiff = territoryNameA.localeCompare(territoryNameB, 'es', { numeric: true });
    if (territoryNameDiff !== 0) return territoryNameDiff;

    return getDisplayAddress(a, '').localeCompare(getDisplayAddress(b, ''), 'es', { numeric: true });
  });
};

export const buildCampaignAddressSnapshot = (address, territoryMap = {}) => ({
  id: address.id,
  territoryId: address.territoryId,
  territoryName: territoryMap[address.territoryId]?.name || address.territoryName || 'N/D',
  address: getDisplayAddress(address, ''),
  fullAddress: getFullAddress(address, ''),
  name: address.name || '',
  phone: address.phone || '',
  notes: address.notes || '',
  gender: address.gender || '',
  latitude: address.latitude ?? null,
  longitude: address.longitude ?? null,
  mapUrl: address.mapUrl || '',
  coords: Array.isArray(address.coords) ? address.coords : null
});

export const getEligibleCampaignAddresses = (
  addresses = [],
  { excludedAddressIds = [], territoryIds = null } = {}
) => {
  const excludedIds = new Set(Array.isArray(excludedAddressIds) ? excludedAddressIds : []);
  const territoryIdSet = Array.isArray(territoryIds) && territoryIds.length > 0
    ? new Set(territoryIds)
    : null;

  const filtered = addresses.filter((address) => {
    if (address.deleted || address.isArchived) return false;
    if (excludedIds.has(address.id)) return false;
    if (territoryIdSet && !territoryIdSet.has(address.territoryId)) return false;
    return true;
  });

  return filtered;
};

export const getCampaignAddressDrift = (assignments = [], eligibleAddresses = []) => {
  const assignedIds = new Set(
    assignments.map((assignment) => assignment.addressId).filter(Boolean)
  );
  const eligibleIds = new Set(
    eligibleAddresses.map((address) => address.id).filter(Boolean)
  );

  const newAddresses = eligibleAddresses.filter((address) => !assignedIds.has(address.id));
  const staleAssignments = assignments.filter(
    (assignment) => assignment.addressId && !eligibleIds.has(assignment.addressId)
  );

  return {
    liveCount: eligibleAddresses.length,
    assignedCount: assignments.length,
    newCount: newAddresses.length,
    staleCount: staleAssignments.length,
    newAddresses,
    hasNewAddresses: newAddresses.length > 0,
    hasStaleAssignments: staleAssignments.length > 0
  };
};

export const getCampaignCandidateAddresses = ({ campaign, addresses = [], territoryMap = {} }) => {
  if (!campaign) return [];

  const candidates = getEligibleCampaignAddresses(addresses);

  return sortCampaignSourceAddresses(candidates, territoryMap);
};

const normalizeHardLimit = (value) => {
  if (value === null || value === undefined || value === '') {
    return Number.POSITIVE_INFINITY;
  }

  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return Number.POSITIVE_INFINITY;
  return Math.max(0, Math.floor(parsed));
};

export const normalizeParticipantConfig = (participant) => ({
  ...participant,
  capacityWeight: Math.max(DEFAULT_WEIGHT, Number(participant.capacityWeight) || DEFAULT_WEIGHT),
  hardLimit: normalizeHardLimit(participant.hardLimit),
  isEnabled: participant.isEnabled !== false
});

export const calculateCampaignTargets = (participants = [], totalAddresses = 0) => {
  if (totalAddresses === 0) {
    return [];
  }

  const normalizedParticipants = participants
    .map(normalizeParticipantConfig)
    .filter((participant) => participant.isEnabled);

  if (normalizedParticipants.length === 0) {
    throw new Error('Debes habilitar al menos una persona para repartir direcciones.');
  }

  const totalLimit = normalizedParticipants.reduce((sum, participant) => {
    if (!Number.isFinite(participant.hardLimit)) {
      return Number.POSITIVE_INFINITY;
    }

    return sum + participant.hardLimit;
  }, 0);

  if (Number.isFinite(totalLimit) && totalLimit < totalAddresses) {
    throw new Error('La suma de limites maximos no alcanza para cubrir todas las direcciones.');
  }

  const totalWeight = normalizedParticipants.reduce(
    (sum, participant) => sum + participant.capacityWeight,
    0
  );

  let assignedTotal = 0;
  const targets = normalizedParticipants.map((participant) => {
    const rawTarget = (totalAddresses * participant.capacityWeight) / totalWeight;
    const initialAssigned = Math.min(Math.floor(rawTarget), participant.hardLimit);
    assignedTotal += initialAssigned;

    return {
      ...participant,
      rawTarget,
      assigned: initialAssigned
    };
  });

  let remainder = totalAddresses - assignedTotal;

  while (remainder > 0) {
    const availableTargets = targets
      .filter((target) => target.assigned < target.hardLimit)
      .sort((a, b) => {
        const deficitDiff = (b.rawTarget - b.assigned) - (a.rawTarget - a.assigned);
        if (deficitDiff !== 0) return deficitDiff;

        const ratioA = a.assigned / a.capacityWeight;
        const ratioB = b.assigned / b.capacityWeight;
        if (ratioA !== ratioB) return ratioA - ratioB;

        return String(a.userNameSnapshot || '').localeCompare(String(b.userNameSnapshot || ''), 'es');
      });

    if (availableTargets.length === 0) {
      throw new Error('No hay capacidad disponible para terminar el reparto automatico.');
    }

    availableTargets[0].assigned += 1;
    remainder -= 1;
  }

  return targets.map((target) => ({
    userId: target.userId,
    assignedCount: target.assigned
  }));
};

export const distributeAddressesAcrossParticipants = ({
  addresses = [],
  participants = [],
  targets = [],
  territoryMap = {},
  random = Math.random
}) => {
  if (addresses.length === 0) return [];

  const orderedAddresses = sortCampaignSourceAddresses(addresses, territoryMap);

  const orderedParticipants = shuffleCampaignItems(
    participants
      .map(normalizeParticipantConfig)
      .filter((participant) => participant.isEnabled),
    random
  );

  const remainingByUserId = new Map(
    targets.map((target) => [target.userId, target.assignedCount])
  );

  const assignments = [];
  let addressIndex = 0;

  for (const participant of orderedParticipants) {
    const count = remainingByUserId.get(participant.userId) || 0;

    for (let i = 0; i < count; i += 1) {
      if (addressIndex >= orderedAddresses.length) {
        throw new Error('No hay suficientes direcciones para completar la distribucion.');
      }

      const address = orderedAddresses[addressIndex];
      addressIndex += 1;

      assignments.push({
        addressId: address.id,
        territoryId: address.territoryId,
        addressSnapshot: buildCampaignAddressSnapshot(address, territoryMap),
        assignedUserId: participant.userId,
        assignedUserName: participant.userNameSnapshot,
        groupId: null,
        groupLabelSnapshot: null,
        status: CAMPAIGN_PROGRESS_STATUSES.PENDING,
        manualLocked: false
      });
    }
  }

  if (addressIndex !== orderedAddresses.length) {
    throw new Error('No se pudo completar la distribucion de direcciones.');
  }

  return assignments;
};

export const groupAssignmentsByTerritory = (assignments = []) => {
  const groupedMap = assignments.reduce((accumulator, assignment) => {
    const territoryId = assignment.territoryId || assignment.addressSnapshot?.territoryId || 'sin-territorio';

    if (!accumulator[territoryId]) {
      accumulator[territoryId] = {
        territoryId,
        territoryName: assignment.addressSnapshot?.territoryName || assignment.territoryName || 'Territorio',
        assignments: []
      };
    }

    accumulator[territoryId].assignments.push(assignment);
    return accumulator;
  }, {});

  return Object.values(groupedMap).sort((a, b) => {
    const territoryDiff = getTerritoryNumericValue(a.territoryName) - getTerritoryNumericValue(b.territoryName);
    if (territoryDiff !== 0) return territoryDiff;
    return a.territoryName.localeCompare(b.territoryName, 'es', { numeric: true });
  });
};

export const getCampaignProgressMeta = (status) => {
  if (status === CAMPAIGN_PROGRESS_STATUSES.COMPLETED) {
    return {
      label: 'Completada',
      badgeClass: 'bg-emerald-100 text-emerald-700 border-emerald-200',
      dotClass: 'bg-emerald-500'
    };
  }

  if (status === CAMPAIGN_PROGRESS_STATUSES.IN_PROGRESS) {
    return {
      label: 'En progreso',
      badgeClass: 'bg-amber-100 text-amber-700 border-amber-200',
      dotClass: 'bg-amber-500'
    };
  }

  return {
    label: 'Pendiente',
    badgeClass: 'bg-slate-100 text-slate-700 border-slate-200',
    dotClass: 'bg-slate-500'
  };
};

export const getPreservedCampaignAssignments = (assignments = []) => (
  assignments.filter((assignment) => (
    assignment.manualLocked || assignment.status !== CAMPAIGN_PROGRESS_STATUSES.PENDING
  ))
);

export const getPendingUnlockedCampaignAssignments = (assignments = []) => (
  assignments.filter((assignment) => (
    !assignment.manualLocked && assignment.status === CAMPAIGN_PROGRESS_STATUSES.PENDING
  ))
);

export const countPreservedAssignmentsByUser = (assignments = []) => (
  getPreservedCampaignAssignments(assignments).reduce((accumulator, assignment) => {
    accumulator[assignment.assignedUserId] = (accumulator[assignment.assignedUserId] || 0) + 1;
    return accumulator;
  }, {})
);

export const selectCampaignAssignmentsForReassignment = ({
  assignments = [],
  campaignId,
  sourceUserId,
  mode = 'single',
  assignmentId = null,
  expectedStatus = null
}) => {
  const campaignAssignments = assignments.filter(
    (assignment) => assignment.campaignId === campaignId
  );

  if (mode === 'all_pending') {
    return campaignAssignments.filter((assignment) => (
      assignment.assignedUserId === sourceUserId
      && assignment.status === CAMPAIGN_PROGRESS_STATUSES.PENDING
    ));
  }

  const assignment = campaignAssignments.find((item) => item.id === assignmentId);
  if (!assignment) {
    throw new Error('La dirección seleccionada ya no está disponible en esta campaña.');
  }
  if (assignment.assignedUserId !== sourceUserId) {
    throw new Error('La dirección ya fue reasignada a otra persona.');
  }
  if (expectedStatus && assignment.status !== expectedStatus) {
    throw new Error('El estado de la dirección cambió. Cierra y vuelve a abrir la reasignación.');
  }
  if (assignment.status === CAMPAIGN_PROGRESS_STATUSES.COMPLETED) {
    throw new Error('Las direcciones completadas no se pueden reasignar.');
  }
  if (![CAMPAIGN_PROGRESS_STATUSES.PENDING, CAMPAIGN_PROGRESS_STATUSES.IN_PROGRESS].includes(assignment.status)) {
    throw new Error('El estado actual de la dirección no permite reasignarla.');
  }

  return [assignment];
};

export const buildCampaignReassignmentUndoEntry = (assignment = {}) => {
  if (!assignment.id || !assignment.campaignId) {
    throw new Error('No se puede preparar el deshacer de una asignación incompleta.');
  }

  const previous = CAMPAIGN_REASSIGNMENT_UNDO_FIELDS.reduce((snapshot, field) => {
    if (hasOwn(assignment, field)) {
      snapshot[field] = assignment[field];
    }
    return snapshot;
  }, {});

  return {
    assignmentId: assignment.id,
    campaignId: assignment.campaignId,
    previous
  };
};

export const isCampaignReassignmentUndoTokenExpired = (
  undoToken,
  now = Date.now()
) => (
  !Number.isFinite(undoToken?.expiresAt) || now >= undoToken.expiresAt
);

export const validateCampaignReassignmentUndoCandidate = ({
  assignment,
  undoEntry,
  operationId,
  targetUserId
}) => {
  if (!assignment || assignment.id !== undoEntry?.assignmentId) {
    throw new Error('Una dirección de la reasignación ya no está disponible.');
  }
  if (assignment.campaignId !== undoEntry.campaignId) {
    throw new Error('Una dirección ya no pertenece a la campaña original.');
  }
  if (!operationId || assignment.lastMoveOperationId !== operationId) {
    throw new Error('Una dirección fue reasignada nuevamente.');
  }
  if (assignment.assignedUserId !== targetUserId) {
    throw new Error('Una dirección ya tiene otro responsable.');
  }
  if (assignment.status !== CAMPAIGN_PROGRESS_STATUSES.PENDING) {
    throw new Error('Una dirección ya fue iniciada o completada.');
  }
  if (assignment.manualLocked !== true) {
    throw new Error('El bloqueo de una dirección cambió después de reasignarla.');
  }

  const lastMovedAt = getTimestampIdentity(assignment.lastMovedAt);
  const updatedAt = getTimestampIdentity(assignment.updatedAt);
  if (lastMovedAt === null || updatedAt === null || lastMovedAt !== updatedAt) {
    throw new Error('Una dirección cambió después de la reasignación.');
  }

  return true;
};

export const buildDistributionTargetsFromAssignments = (
  assignments = [],
  participants = []
) => {
  const targets = {};
  const enabledParticipants = participants.filter((participant) => participant.isEnabled !== false);

  enabledParticipants.forEach((participant) => {
    targets[participant.userId] = 0;
  });

  assignments.forEach((assignment) => {
    targets[assignment.assignedUserId] = (targets[assignment.assignedUserId] || 0) + 1;
  });

  return targets;
};

export const sanitizeDistributionTargets = (
  rawTargets = {},
  participants = [],
  preservedCountsByUser = {},
  totalAddresses = Number.POSITIVE_INFINITY
) => {
  const enabledParticipants = participants.filter((participant) => participant.isEnabled !== false);
  const sanitized = {};

  enabledParticipants.forEach((participant) => {
    const minTarget = preservedCountsByUser[participant.userId] || 0;
    const parsed = Math.max(0, Number.parseInt(String(rawTargets[participant.userId] ?? 0), 10) || 0);
    sanitized[participant.userId] = Math.max(minTarget, Math.min(totalAddresses, parsed));
  });

  return sanitized;
};

export const prepareDistributionTargetsForApply = (
  rawTargets = {},
  participants = [],
  preservedCountsByUser = {},
  totalAddresses = 0
) => sanitizeDistributionTargets(
  rawTargets,
  participants,
  preservedCountsByUser,
  totalAddresses
);

export const countAssignmentsByUser = (assignments = []) => (
  assignments.reduce((accumulator, assignment) => {
    if (!assignment.assignedUserId) return accumulator;
    accumulator[assignment.assignedUserId] = (accumulator[assignment.assignedUserId] || 0) + 1;
    return accumulator;
  }, {})
);

export const buildDistributionAssignmentFingerprint = (assignments = []) => {
  const counts = countAssignmentsByUser(assignments);
  return Object.keys(counts)
    .sort()
    .map((userId) => `${userId}:${counts[userId]}`)
    .join('|');
};

export const buildDistributionTargetFingerprint = (targets = {}) => (
  Object.entries(targets)
    .filter(([, count]) => (Number(count) || 0) > 0)
    .sort(([userIdA], [userIdB]) => userIdA.localeCompare(userIdB))
    .map(([userId, count]) => `${userId}:${Number(count) || 0}`)
    .join('|')
);

export const validateRedistributionAddressPool = (
  pendingUnlockedAssignments = [],
  addressesToRedistribute = []
) => {
  if (addressesToRedistribute.length !== pendingUnlockedAssignments.length) {
    throw new Error(
      'Hay asignaciones huérfanas fuera del reparto actual. Regenera el reparto para incluir solo direcciones válidas.'
    );
  }
};

export const verifyDistributionCounts = (assignments = [], participantTargets = {}) => {
  const counts = countAssignmentsByUser(assignments);
  const mismatches = Object.entries(participantTargets).filter(([userId, targetCount]) => {
    const expected = Number(targetCount) || 0;
    const actual = counts[userId] || 0;
    return actual !== expected;
  });

  if (mismatches.length > 0) {
    throw new Error('El reparto aplicado no coincide con los objetivos configurados. Intenta de nuevo o regenera el reparto.');
  }
};

const isDraftCompatible = (draftMeta, addressCount) => {
  if (!draftMeta || draftMeta.addressCount == null) return false;
  return Number(draftMeta.addressCount) === Number(addressCount);
};

export const resolveDistributionTargets = ({
  firestoreDraft = null,
  firestoreDraftMeta = null,
  localDraft = null,
  assignments = [],
  participants = [],
  preservedCountsByUser = {},
  addressCount = 0
}) => {
  const fallback = buildDistributionTargetsFromAssignments(assignments, participants);

  if (firestoreDraft
    && typeof firestoreDraft === 'object'
    && isDraftCompatible(firestoreDraftMeta, addressCount)) {
    return sanitizeDistributionTargets(
      firestoreDraft,
      participants,
      preservedCountsByUser,
      addressCount
    );
  }

  if (localDraft?.targets
    && isDraftCompatible(localDraft, addressCount)) {
    return sanitizeDistributionTargets(
      localDraft.targets,
      participants,
      preservedCountsByUser,
      addressCount
    );
  }

  return fallback;
};

export const validateDistributionTargets = ({
  participantTargets = {},
  totalAddresses = 0,
  preservedCountsByUser = {}
}) => {
  const configuredTotal = Object.values(participantTargets).reduce(
    (sum, count) => sum + (Number(count) || 0),
    0
  );

  if (configuredTotal !== totalAddresses) {
    const difference = totalAddresses - configuredTotal;
    if (difference > 0) {
      throw new Error(`Faltan ${difference} dirección${difference === 1 ? '' : 'es'} por repartir (${configuredTotal}/${totalAddresses}).`);
    }

    throw new Error(`Sobran ${Math.abs(difference)} dirección${Math.abs(difference) === 1 ? '' : 'es'} (${configuredTotal}/${totalAddresses}).`);
  }

  Object.entries(participantTargets).forEach(([userId, targetCount]) => {
    const preservedCount = preservedCountsByUser[userId] || 0;
    const normalizedTarget = Number(targetCount) || 0;

    if (normalizedTarget < preservedCount) {
      throw new Error('No puedes reducir por debajo de las asignaciones completadas, en progreso o bloqueadas.');
    }
  });

  return configuredTotal;
};

export const buildRedistributionNeeds = ({
  participantTargets = {},
  preservedCountsByUser = {}
}) => Object.entries(participantTargets).map(([userId, targetCount]) => {
  const preservedCount = preservedCountsByUser[userId] || 0;
  const normalizedTarget = Math.max(0, Number(targetCount) || 0);

  return {
    userId,
    assignedCount: Math.max(0, normalizedTarget - preservedCount)
  };
}).filter((entry) => entry.assignedCount > 0);

export const getCampaignStatusMeta = (status) => {
  if (status === CAMPAIGN_STATUSES.ACTIVE) {
    return {
      label: 'Activa',
      badgeClass: 'bg-emerald-100 text-emerald-700 border-emerald-200'
    };
  }

  if (status === CAMPAIGN_STATUSES.COMPLETED) {
    return {
      label: 'Completada',
      badgeClass: 'bg-blue-100 text-blue-700 border-blue-200'
    };
  }

  if (status === CAMPAIGN_STATUSES.ARCHIVED) {
    return {
      label: 'Archivada',
      badgeClass: 'bg-gray-100 text-gray-700 border-gray-200'
    };
  }

  return {
    label: 'Pendiente de activar',
    badgeClass: 'bg-amber-100 text-amber-700 border-amber-200'
  };
};

export const assertCampaignAssignmentsWritable = (campaign) => {
  if (!campaign) {
    throw new Error('No se encontró la campaña seleccionada.');
  }

  if ([CAMPAIGN_STATUSES.COMPLETED, CAMPAIGN_STATUSES.ARCHIVED].includes(campaign.status)) {
    throw new Error('Esta campaña está cerrada y ya no se puede modificar.');
  }

  return true;
};

export const CAMPAIGN_FINALIZE_UPDATE_KEYS = [
  'status',
  'completedAt',
  'updatedAt',
  'finalSummary',
  'finalSummaryVersion'
];

export const buildCampaignFinalizeUpdate = ({
  campaign = null,
  participants = [],
  assignments = []
} = {}) => {
  if (!campaign?.id) {
    throw new Error('No se encontró la campaña seleccionada.');
  }

  if (campaign.status === CAMPAIGN_STATUSES.DRAFT) {
    throw new Error('No se pueden archivar campañas en borrador. Elimínalas o actívalas primero.');
  }

  if (campaign.status === CAMPAIGN_STATUSES.ARCHIVED) {
    throw new Error('Esta campaña ya está archivada.');
  }

  if (campaign.status === CAMPAIGN_STATUSES.COMPLETED) {
    return {
      mode: 'archive',
      fields: {
        status: CAMPAIGN_STATUSES.ARCHIVED
      },
      finalSummary: campaign.finalSummary || null
    };
  }

  if (campaign.status !== CAMPAIGN_STATUSES.ACTIVE) {
    throw new Error('Solo se puede finalizar una campaña activa.');
  }

  const finalSummary = buildCampaignFinalSummary({
    campaign,
    participants,
    assignments
  });

  return {
    mode: 'finalize',
    fields: {
      status: CAMPAIGN_STATUSES.ARCHIVED,
      finalSummary,
      finalSummaryVersion: CAMPAIGN_FINAL_SUMMARY_VERSION
    },
    finalSummary
  };
};

const toSerializableTimestamp = (value) => {
  if (value == null || value === '') return null;

  if (typeof value === 'string') {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? value : parsed.toISOString();
  }

  if (typeof value?.toDate === 'function') {
    const date = value.toDate();
    return Number.isNaN(date.getTime()) ? null : date.toISOString();
  }

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value.toISOString();
  }

  if (Number.isFinite(value?.seconds)) {
    const date = new Date(value.seconds * 1000);
    return Number.isNaN(date.getTime()) ? null : date.toISOString();
  }

  if (Number.isFinite(value)) {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date.toISOString();
  }

  return null;
};

const createEmptyStatusCounts = () => ({
  total: 0,
  pending: 0,
  inProgress: 0,
  completed: 0
});

const incrementStatusCounts = (counts, status) => {
  counts.total += 1;

  if (status === CAMPAIGN_PROGRESS_STATUSES.COMPLETED) {
    counts.completed += 1;
    return;
  }

  if (status === CAMPAIGN_PROGRESS_STATUSES.IN_PROGRESS) {
    counts.inProgress += 1;
    return;
  }

  counts.pending += 1;
};

const buildEssentialAddressSnapshot = (snapshot = {}, fallbackTerritoryName = '') => {
  const addressDisplay = getDisplayAddress(snapshot, '') || snapshot.address || '';
  const fullAddress = getFullAddress(snapshot, '') || snapshot.fullAddress || addressDisplay;

  return {
    address: addressDisplay,
    fullAddress,
    name: snapshot.name || '',
    phone: snapshot.phone || '',
    notes: snapshot.notes || '',
    territoryName: snapshot.territoryName || fallbackTerritoryName || '',
    latitude: snapshot.latitude ?? null,
    longitude: snapshot.longitude ?? null,
    mapUrl: snapshot.mapUrl || '',
    coords: Array.isArray(snapshot.coords) ? [...snapshot.coords] : null
  };
};

const buildCompletedBySnapshot = (assignment = {}) => {
  const userId = assignment.completedByUserId || null;
  const userName = assignment.completedByUserName || null;

  if (!userId && !userName) return null;

  return {
    userId,
    userName
  };
};

export const buildCampaignFinalSummary = ({
  campaign = null,
  participants = [],
  assignments = []
} = {}) => {
  const closedAt = new Date().toISOString();
  const participantStats = new Map();

  (Array.isArray(participants) ? participants : []).forEach((participant) => {
    if (!participant?.userId) return;

    participantStats.set(participant.userId, {
      userId: participant.userId,
      userNameSnapshot: participant.userNameSnapshot || 'Usuario',
      ...createEmptyStatusCounts()
    });
  });

  const territoryStats = new Map();
  const assignmentDetails = [];

  (Array.isArray(assignments) ? assignments : []).forEach((assignment) => {
    const status = Object.values(CAMPAIGN_PROGRESS_STATUSES).includes(assignment?.status)
      ? assignment.status
      : CAMPAIGN_PROGRESS_STATUSES.PENDING;
    const assignedUserId = assignment?.assignedUserId || null;
    const assignedUserName = assignment?.assignedUserName || 'Usuario';
    const territoryId = assignment?.territoryId
      || assignment?.addressSnapshot?.territoryId
      || 'sin-territorio';
    const territoryName = assignment?.addressSnapshot?.territoryName
      || assignment?.territoryName
      || 'Territorio';
    const addressSnapshot = buildEssentialAddressSnapshot(
      assignment?.addressSnapshot || {},
      territoryName
    );
    const addressDisplay = addressSnapshot.address
      || getDisplayAddress(assignment?.addressSnapshot, '')
      || '';

    if (assignedUserId) {
      if (!participantStats.has(assignedUserId)) {
        participantStats.set(assignedUserId, {
          userId: assignedUserId,
          userNameSnapshot: assignedUserName,
          ...createEmptyStatusCounts()
        });
      }

      const participantEntry = participantStats.get(assignedUserId);
      if (!participantEntry.userNameSnapshot) {
        participantEntry.userNameSnapshot = assignedUserName;
      }
      incrementStatusCounts(participantEntry, status);
    }

    if (!territoryStats.has(territoryId)) {
      territoryStats.set(territoryId, {
        territoryId,
        territoryName,
        ...createEmptyStatusCounts()
      });
    }

    const territoryEntry = territoryStats.get(territoryId);
    if (!territoryEntry.territoryName && territoryName) {
      territoryEntry.territoryName = territoryName;
    }
    incrementStatusCounts(territoryEntry, status);

    assignmentDetails.push({
      addressId: assignment?.addressId || null,
      addressDisplay,
      addressSnapshot,
      territoryId,
      territoryName,
      assignedUserId,
      assignedUserName,
      status,
      manualLocked: assignment?.manualLocked === true,
      completedAt: toSerializableTimestamp(assignment?.completedAt),
      completedBy: buildCompletedBySnapshot(assignment)
    });
  });

  const totals = createEmptyStatusCounts();
  assignmentDetails.forEach((detail) => {
    incrementStatusCounts(totals, detail.status);
  });

  const progressPercent = totals.total === 0
    ? 0
    : Math.round((totals.completed / totals.total) * 100);

  const byParticipant = Array.from(participantStats.values())
    .map((entry) => ({
      userId: entry.userId,
      userNameSnapshot: entry.userNameSnapshot || 'Usuario',
      total: entry.total,
      pending: entry.pending,
      inProgress: entry.inProgress,
      completed: entry.completed
    }))
    .sort((a, b) => a.userNameSnapshot.localeCompare(b.userNameSnapshot, 'es', { sensitivity: 'base' }));

  const byTerritory = Array.from(territoryStats.values())
    .map((entry) => ({
      territoryId: entry.territoryId,
      territoryName: entry.territoryName || 'Territorio',
      total: entry.total,
      pending: entry.pending,
      inProgress: entry.inProgress,
      completed: entry.completed
    }))
    .sort((a, b) => {
      const territoryDiff = getTerritoryNumericValue(a.territoryName) - getTerritoryNumericValue(b.territoryName);
      if (territoryDiff !== 0) return territoryDiff;
      return a.territoryName.localeCompare(b.territoryName, 'es', { numeric: true });
    });

  assignmentDetails.sort((a, b) => {
    const territoryDiff = getTerritoryNumericValue(a.territoryName) - getTerritoryNumericValue(b.territoryName);
    if (territoryDiff !== 0) return territoryDiff;

    const territoryNameDiff = a.territoryName.localeCompare(b.territoryName, 'es', { numeric: true });
    if (territoryNameDiff !== 0) return territoryNameDiff;

    return a.addressDisplay.localeCompare(b.addressDisplay, 'es', { numeric: true });
  });

  return {
    version: CAMPAIGN_FINAL_SUMMARY_VERSION,
    campaignId: campaign?.id || null,
    campaignName: campaign?.name || '',
    campaignType: campaign?.type || '',
    closedAt,
    total: totals.total,
    completed: totals.completed,
    pending: totals.pending,
    inProgress: totals.inProgress,
    progressPercent,
    byParticipant,
    byTerritory,
    assignments: assignmentDetails
  };
};

export const resolveCampaignHistorySummary = ({
  campaign = null,
  participants = [],
  assignments = []
} = {}) => {
  if (campaign?.finalSummary && typeof campaign.finalSummary === 'object') {
    return {
      summary: campaign.finalSummary,
      isLegacy: false
    };
  }

  return {
    summary: buildCampaignFinalSummary({ campaign, participants, assignments }),
    isLegacy: true
  };
};

const formatDistributionAddressCount = (count) => (
  count === 1 ? '1 dirección' : `${count} direcciones`
);

const formatDistributionParticipantEntry = (index, name, count) => (
  `${index}.- ${name}\n*${formatDistributionAddressCount(count)}*`
);

const sortDistributionParticipantsByName = (a, b) => (
  a.userNameSnapshot.localeCompare(b.userNameSnapshot, 'es')
);

const getDistributionTargetCount = (participant, distributionTargets = {}) => (
  Number(distributionTargets[participant.userId]) || 0
);

export const formatCampaignDistributionWhatsAppText = ({
  participants = [],
  distributionTargets = {},
  isPioneer = () => false
} = {}) => {
  if (participants.length === 0) {
    return '';
  }

  const withoutAddresses = participants
    .filter((participant) => getDistributionTargetCount(participant, distributionTargets) === 0)
    .slice()
    .sort(sortDistributionParticipantsByName);

  const withAddresses = participants
    .filter((participant) => getDistributionTargetCount(participant, distributionTargets) > 0)
    .slice()
    .sort(sortDistributionParticipantsByName);

  const sections = [];

  if (withoutAddresses.length > 0) {
    const sinDireccionesList = withoutAddresses
      .map((participant, index) => formatDistributionParticipantEntry(
        index + 1,
        participant.userNameSnapshot,
        0
      ))
      .join('\n\n');
    sections.push(`*Hermanos o hermanas sin direcciones*\n\n${sinDireccionesList}`);
  }

  if (withAddresses.length > 0) {
    const mainList = withAddresses
      .map((participant, index) => {
        const count = getDistributionTargetCount(participant, distributionTargets);
        return formatDistributionParticipantEntry(
          index + 1,
          participant.userNameSnapshot,
          count
        );
      })
      .join('\n\n');
    sections.push(`*Lista general*\n\n${mainList}`);
  }

  const pioneersWithAddresses = withAddresses.filter(isPioneer);

  if (pioneersWithAddresses.length > 0) {
    const pioneerList = pioneersWithAddresses
      .map((participant, index) => {
        const count = getDistributionTargetCount(participant, distributionTargets);
        return formatDistributionParticipantEntry(
          index + 1,
          participant.userNameSnapshot,
          count
        );
      })
      .join('\n\n');
    sections.push(`*Precursores*\n\n${pioneerList}`);
  }

  return sections.join('\n\n');
};
