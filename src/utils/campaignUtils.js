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

const DEFAULT_WEIGHT = 1;

const normalizeText = (value = '') => String(value || '').trim().toLowerCase();

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
  if (!normalized) return 'Campana';

  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
};

export const formatCampaignDate = (dateLike) => {
  if (!dateLike) return 'Sin fecha';

  const value = dateLike?.toDate ? dateLike.toDate() : new Date(dateLike);
  if (Number.isNaN(value.getTime())) return 'Sin fecha';

  return value.toLocaleDateString('es-MX', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
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
  territoryMap = {}
}) => {
  if (addresses.length === 0) return [];

  const orderedAddresses = sortCampaignSourceAddresses(addresses, territoryMap);

  const orderedParticipants = [...participants]
    .map(normalizeParticipantConfig)
    .filter((participant) => participant.isEnabled)
    .sort((a, b) => {
      const sortDiff = (a.sortOrder ?? 0) - (b.sortOrder ?? 0);
      if (sortDiff !== 0) return sortDiff;

      return String(a.userNameSnapshot || '').localeCompare(String(b.userNameSnapshot || ''), 'es');
    });

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
