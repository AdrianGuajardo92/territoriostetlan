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

    return String(a.address || '').localeCompare(String(b.address || ''), 'es', { numeric: true });
  });
};

export const buildCampaignAddressSnapshot = (address, territoryMap = {}) => ({
  id: address.id,
  territoryId: address.territoryId,
  territoryName: territoryMap[address.territoryId]?.name || address.territoryName || 'N/D',
  address: address.address || '',
  name: address.name || '',
  phone: address.phone || '',
  notes: address.notes || '',
  gender: address.gender || '',
  latitude: address.latitude ?? null,
  longitude: address.longitude ?? null,
  mapUrl: address.mapUrl || '',
  coords: Array.isArray(address.coords) ? address.coords : null
});

export const getCampaignCandidateAddresses = ({ campaign, addresses = [], territoryMap = {} }) => {
  if (!campaign) return [];

  const selectedTerritoryIds = new Set(Array.isArray(campaign.sourceTerritoryIds) ? campaign.sourceTerritoryIds : []);
  const excludedAddressIds = new Set(Array.isArray(campaign.excludedAddressIds) ? campaign.excludedAddressIds : []);

  const candidates = addresses.filter((address) => {
    if (!selectedTerritoryIds.has(address.territoryId)) return false;
    if (address.deleted) return false;
    if (excludedAddressIds.has(address.id)) return false;
    return true;
  });

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
  groupsById = {},
  territoryMap = {}
}) => {
  if (addresses.length === 0) return [];

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

  let participantIndex = 0;
  let guard = 0;

  return addresses.map((address) => {
    while (
      orderedParticipants.length > 0 &&
      (remainingByUserId.get(orderedParticipants[participantIndex]?.userId) || 0) <= 0
    ) {
      participantIndex = (participantIndex + 1) % orderedParticipants.length;
      guard += 1;

      if (guard > orderedParticipants.length * 4) {
        throw new Error('No se pudo completar la distribucion de direcciones.');
      }
    }

    const participant = orderedParticipants[participantIndex];
    if (!participant) {
      throw new Error('No hay personas disponibles para asignar direcciones.');
    }

    const remaining = remainingByUserId.get(participant.userId) || 0;
    if (remaining <= 0) {
      throw new Error('No hay capacidad restante para asignar direcciones.');
    }

    remainingByUserId.set(participant.userId, remaining - 1);

    const relatedGroup = participant.groupId ? groupsById[participant.groupId] : null;
    participantIndex = (participantIndex + 1) % orderedParticipants.length;
    guard = 0;

    return {
      addressId: address.id,
      territoryId: address.territoryId,
      addressSnapshot: buildCampaignAddressSnapshot(address, territoryMap),
      assignedUserId: participant.userId,
      assignedUserName: participant.userNameSnapshot,
      groupId: participant.groupId || null,
      groupLabelSnapshot: relatedGroup?.label || null,
      status: CAMPAIGN_PROGRESS_STATUSES.PENDING,
      manualLocked: false
    };
  });
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
    label: 'Borrador',
    badgeClass: 'bg-amber-100 text-amber-700 border-amber-200'
  };
};
