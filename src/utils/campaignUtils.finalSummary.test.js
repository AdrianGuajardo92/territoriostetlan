import { describe, it, expect } from 'vitest';
import {
  CAMPAIGN_FINAL_SUMMARY_VERSION,
  CAMPAIGN_FINALIZE_UPDATE_KEYS,
  CAMPAIGN_PROGRESS_STATUSES,
  CAMPAIGN_STATUSES,
  assertCampaignAssignmentsWritable,
  buildCampaignFinalizeUpdate,
  buildCampaignFinalSummary,
  resolveCampaignHistorySummary
} from './campaignUtils.js';

const baseParticipants = [
  { userId: 'ana', userNameSnapshot: 'Ana', isEnabled: true },
  { userId: 'bruno', userNameSnapshot: 'Bruno', isEnabled: true }
];

const baseAssignments = [
  {
    addressId: 'a1',
    territoryId: 't10',
    addressSnapshot: {
      address: 'Calle 1',
      fullAddress: 'Calle 1, Guadalajara',
      territoryName: 'Territorio 10',
      name: 'Casa 1'
    },
    assignedUserId: 'ana',
    assignedUserName: 'Ana',
    status: CAMPAIGN_PROGRESS_STATUSES.COMPLETED,
    manualLocked: false,
    completedAt: { seconds: 1_700_000_000, nanoseconds: 0 },
    completedByUserId: 'ana',
    completedByUserName: 'Ana'
  },
  {
    addressId: 'a2',
    territoryId: 't2',
    addressSnapshot: {
      address: 'Calle 2',
      territoryName: 'Territorio 2'
    },
    assignedUserId: 'bruno',
    assignedUserName: 'Bruno',
    status: CAMPAIGN_PROGRESS_STATUSES.PENDING,
    manualLocked: true
  },
  {
    addressId: 'a3',
    territoryId: 't10',
    addressSnapshot: {
      address: 'Calle 3',
      territoryName: 'Territorio 10'
    },
    assignedUserId: 'ana',
    assignedUserName: 'Ana',
    status: CAMPAIGN_PROGRESS_STATUSES.IN_PROGRESS,
    manualLocked: false
  },
  {
    addressId: 'a4',
    territoryId: 't2',
    addressSnapshot: {
      address: 'Calle 4',
      territoryName: 'Territorio 2'
    },
    assignedUserId: 'bruno',
    assignedUserName: 'Bruno',
    status: CAMPAIGN_PROGRESS_STATUSES.COMPLETED,
    manualLocked: false,
    completedAt: '2024-01-02T00:00:00.000Z',
    completedByUserId: 'admin',
    completedByUserName: 'Admin'
  }
];

describe('buildCampaignFinalSummary', () => {
  it('congela conteos, agrupaciones, orden numérico y estados', () => {
    const summary = buildCampaignFinalSummary({
      campaign: { id: 'camp-1', name: 'Asamblea', type: 'asamblea' },
      participants: baseParticipants,
      assignments: baseAssignments
    });

    expect(summary.version).toBe(CAMPAIGN_FINAL_SUMMARY_VERSION);
    expect(summary.campaignId).toBe('camp-1');
    expect(summary.total).toBe(4);
    expect(summary.completed).toBe(2);
    expect(summary.pending).toBe(1);
    expect(summary.inProgress).toBe(1);
    expect(summary.progressPercent).toBe(50);

    expect(summary.byParticipant.map((entry) => entry.userId)).toEqual(['ana', 'bruno']);
    expect(summary.byParticipant[0]).toMatchObject({
      userId: 'ana',
      userNameSnapshot: 'Ana',
      total: 2,
      completed: 1,
      pending: 0,
      inProgress: 1
    });
    expect(summary.byParticipant[1]).toMatchObject({
      userId: 'bruno',
      total: 2,
      completed: 1,
      pending: 1,
      inProgress: 0
    });

    expect(summary.byTerritory.map((entry) => entry.territoryName)).toEqual([
      'Territorio 2',
      'Territorio 10'
    ]);
    expect(summary.byTerritory[0]).toMatchObject({
      territoryId: 't2',
      total: 2,
      completed: 1,
      pending: 1
    });

    expect(summary.assignments).toHaveLength(4);
    expect(summary.assignments[0].territoryName).toBe('Territorio 2');
    expect(summary.assignments[0].addressDisplay).toBe('Calle 2');
    expect(summary.assignments.find((item) => item.addressId === 'a1')).toMatchObject({
      assignedUserId: 'ana',
      status: CAMPAIGN_PROGRESS_STATUSES.COMPLETED,
      manualLocked: false,
      completedAt: '2023-11-14T22:13:20.000Z',
      completedBy: { userId: 'ana', userName: 'Ana' }
    });
    expect(summary.assignments.find((item) => item.addressId === 'a2').manualLocked).toBe(true);

    const serialized = JSON.stringify(summary);
    expect(serialized.includes('undefined')).toBe(false);
    expect(JSON.parse(serialized)).toEqual(summary);
  });

  it('queda independiente de mutaciones posteriores a los inputs', () => {
    const participants = baseParticipants.map((participant) => ({ ...participant }));
    const assignments = baseAssignments.map((assignment) => ({
      ...assignment,
      addressSnapshot: { ...assignment.addressSnapshot }
    }));

    const summary = buildCampaignFinalSummary({
      campaign: { id: 'camp-2', name: 'Conmemoracion', type: 'conmemoracion' },
      participants,
      assignments
    });

    participants[0].userNameSnapshot = 'Ana Mutada';
    assignments[0].status = CAMPAIGN_PROGRESS_STATUSES.PENDING;
    assignments[0].addressSnapshot.address = 'Calle mutada';
    assignments[0].assignedUserName = 'Otro';

    expect(summary.byParticipant[0].userNameSnapshot).toBe('Ana');
    expect(summary.assignments.find((item) => item.addressId === 'a1')).toMatchObject({
      status: CAMPAIGN_PROGRESS_STATUSES.COMPLETED,
      addressDisplay: 'Calle 1',
      assignedUserName: 'Ana'
    });
    expect(summary.completed).toBe(2);
  });
});

describe('resolveCampaignHistorySummary', () => {
  it('usa finalSummary congelado cuando existe', () => {
    const frozen = buildCampaignFinalSummary({
      campaign: { id: 'camp-3', name: 'Cerrada', type: 'asamblea' },
      participants: baseParticipants,
      assignments: baseAssignments
    });

    const result = resolveCampaignHistorySummary({
      campaign: {
        id: 'camp-3',
        name: 'Cerrada',
        finalSummary: frozen
      },
      participants: [],
      assignments: []
    });

    expect(result.isLegacy).toBe(false);
    expect(result.summary).toBe(frozen);
  });

  it('reconstruye historial anterior cuando no hay finalSummary', () => {
    const result = resolveCampaignHistorySummary({
      campaign: { id: 'camp-legacy', name: 'Antigua', type: 'asamblea' },
      participants: baseParticipants,
      assignments: baseAssignments.slice(0, 2)
    });

    expect(result.isLegacy).toBe(true);
    expect(result.summary.total).toBe(2);
    expect(result.summary.campaignId).toBe('camp-legacy');
  });
});

describe('buildCampaignFinalizeUpdate', () => {
  it('congela el resumen y archiva una campaña activa sin tocar territorios', () => {
    const result = buildCampaignFinalizeUpdate({
      campaign: { id: 'camp-1', name: 'Asamblea', type: 'asamblea', status: CAMPAIGN_STATUSES.ACTIVE },
      participants: baseParticipants,
      assignments: baseAssignments
    });

    expect(result.mode).toBe('finalize');
    expect(result.fields.status).toBe(CAMPAIGN_STATUSES.ARCHIVED);
    expect(result.fields.finalSummary.total).toBe(4);
    expect(result.fields.finalSummaryVersion).toBe(CAMPAIGN_FINAL_SUMMARY_VERSION);
    expect(Object.keys(result.fields).every((key) => CAMPAIGN_FINALIZE_UPDATE_KEYS.includes(key))).toBe(true);
    expect(result.fields).not.toHaveProperty('territories');
    expect(result.fields).not.toHaveProperty('addresses');
    expect(JSON.stringify(result.fields)).not.toContain('undefined');
  });

  it('archiva una campaña ya completada y conserva el finalSummary', () => {
    const frozen = buildCampaignFinalSummary({
      campaign: { id: 'camp-2', name: 'Cerrada', type: 'asamblea' },
      participants: baseParticipants,
      assignments: baseAssignments
    });

    const result = buildCampaignFinalizeUpdate({
      campaign: {
        id: 'camp-2',
        status: CAMPAIGN_STATUSES.COMPLETED,
        finalSummary: frozen
      }
    });

    expect(result.mode).toBe('archive');
    expect(result.fields).toEqual({ status: CAMPAIGN_STATUSES.ARCHIVED });
    expect(result.finalSummary).toBe(frozen);
  });

  it('rechaza borradores y campañas ya archivadas', () => {
    expect(() => buildCampaignFinalizeUpdate({
      campaign: { id: 'draft-1', status: CAMPAIGN_STATUSES.DRAFT }
    })).toThrow(/borrador/);

    expect(() => buildCampaignFinalizeUpdate({
      campaign: { id: 'arch-1', status: CAMPAIGN_STATUSES.ARCHIVED }
    })).toThrow(/ya está archivada/);
  });
});

describe('assertCampaignAssignmentsWritable', () => {
  it('permite draft y active', () => {
    expect(assertCampaignAssignmentsWritable({ status: 'draft' })).toBe(true);
    expect(assertCampaignAssignmentsWritable({ status: 'active' })).toBe(true);
  });

  it('bloquea completed y archived', () => {
    expect(() => assertCampaignAssignmentsWritable({ status: 'completed' })).toThrow(
      /cerrada/
    );
    expect(() => assertCampaignAssignmentsWritable({ status: 'archived' })).toThrow(
      /cerrada/
    );
  });
});
