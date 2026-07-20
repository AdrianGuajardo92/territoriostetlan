import { describe, it, expect } from 'vitest';
import {
  buildDistributionAssignmentFingerprint,
  buildDistributionTargetFingerprint,
  buildRedistributionNeeds,
  distributeAddressesAcrossParticipants,
  selectCampaignAssignmentsForReassignment,
  validateRedistributionAddressPool
} from './campaignUtils.js';

describe('buildRedistributionNeeds', () => {
  it('calcula necesidades cuando Fabiola sube a 3 y Ana baja a 2', () => {
    const needs = buildRedistributionNeeds({
      participantTargets: { fabiola: 3, ana: 2 },
      preservedCountsByUser: {}
    });

    const byUser = Object.fromEntries(needs.map((entry) => [entry.userId, entry.assignedCount]));
    expect(byUser.fabiola).toBe(3);
    expect(byUser.ana).toBe(2);
  });

  it('resta asignaciones preservadas del objetivo', () => {
    const needs = buildRedistributionNeeds({
      participantTargets: { ana: 2 },
      preservedCountsByUser: { ana: 1 }
    });

    expect(needs).toEqual([{ userId: 'ana', assignedCount: 1 }]);
  });
});

describe('distributeAddressesAcrossParticipants', () => {
  it('asigna conteos exactos por usuario', () => {
    const addresses = [
      { id: 'a1', territoryId: 't1', address: 'Calle 1' },
      { id: 'a2', territoryId: 't1', address: 'Calle 2' },
      { id: 'a3', territoryId: 't1', address: 'Calle 3' },
      { id: 'a4', territoryId: 't1', address: 'Calle 4' },
      { id: 'a5', territoryId: 't1', address: 'Calle 5' }
    ];
    const participants = [
      { userId: 'fabiola', userNameSnapshot: 'Fabiola', isEnabled: true, sortOrder: 0 },
      { userId: 'ana', userNameSnapshot: 'Ana', isEnabled: true, sortOrder: 1 }
    ];
    const targets = [
      { userId: 'fabiola', assignedCount: 3 },
      { userId: 'ana', assignedCount: 2 }
    ];

    const assignments = distributeAddressesAcrossParticipants({
      addresses,
      participants,
      targets,
      territoryMap: { t1: { id: 't1', name: 'Territorio 1' } }
    });

    const counts = assignments.reduce((accumulator, assignment) => {
      accumulator[assignment.assignedUserId] = (accumulator[assignment.assignedUserId] || 0) + 1;
      return accumulator;
    }, {});

    expect(counts.fabiola).toBe(3);
    expect(counts.ana).toBe(2);
    expect(assignments.length).toBe(5);
  });
});

describe('distribution fingerprints', () => {
  it('cambia la huella cuando cambia el dueño aunque el total sea igual', () => {
    const before = buildDistributionAssignmentFingerprint([
      { assignedUserId: 'fabiola' },
      { assignedUserId: 'fabiola' },
      { assignedUserId: 'ana' },
      { assignedUserId: 'ana' },
      { assignedUserId: 'ana' }
    ]);
    const after = buildDistributionAssignmentFingerprint([
      { assignedUserId: 'fabiola' },
      { assignedUserId: 'fabiola' },
      { assignedUserId: 'fabiola' },
      { assignedUserId: 'ana' },
      { assignedUserId: 'ana' }
    ]);

    expect(before).not.toBe(after);
    expect(before).toBe('ana:3|fabiola:2');
    expect(after).toBe('ana:2|fabiola:3');
  });

  it('alinea huella de objetivos con asignaciones cuando el reparto coincide', () => {
    const targets = { fabiola: 3, ana: 2, carlos: 0 };
    const assignments = [
      { assignedUserId: 'fabiola' },
      { assignedUserId: 'fabiola' },
      { assignedUserId: 'fabiola' },
      { assignedUserId: 'ana' },
      { assignedUserId: 'ana' }
    ];

    expect(buildDistributionTargetFingerprint(targets))
      .toBe(buildDistributionAssignmentFingerprint(assignments));
  });
});

describe('validateRedistributionAddressPool', () => {
  it('lanza error cuando hay asignaciones huérfanas', () => {
    expect(() => validateRedistributionAddressPool(
      [{ addressId: 'a1' }, { addressId: 'missing' }],
      [{ id: 'a1' }]
    )).toThrow(/huérfanas/i);
  });
});

describe('selectCampaignAssignmentsForReassignment', () => {
  const assignments = [
    { id: 'pending-1', campaignId: 'campaign-1', assignedUserId: 'ana', status: 'pending' },
    { id: 'progress-1', campaignId: 'campaign-1', assignedUserId: 'ana', status: 'in_progress' },
    { id: 'completed-1', campaignId: 'campaign-1', assignedUserId: 'ana', status: 'completed' },
    { id: 'pending-2', campaignId: 'campaign-1', assignedUserId: 'luis', status: 'pending' },
    { id: 'other-campaign', campaignId: 'campaign-2', assignedUserId: 'ana', status: 'pending' }
  ];

  it('selecciona solamente todas las pendientes del responsable y campaña indicados', () => {
    expect(selectCampaignAssignmentsForReassignment({
      assignments,
      campaignId: 'campaign-1',
      sourceUserId: 'ana',
      mode: 'all_pending'
    }).map((assignment) => assignment.id)).toEqual(['pending-1']);
  });

  it('permite seleccionar individualmente una dirección en progreso', () => {
    expect(selectCampaignAssignmentsForReassignment({
      assignments,
      campaignId: 'campaign-1',
      sourceUserId: 'ana',
      assignmentId: 'progress-1'
    })).toHaveLength(1);
  });

  it('impide reasignar una dirección completada', () => {
    expect(() => selectCampaignAssignmentsForReassignment({
      assignments,
      campaignId: 'campaign-1',
      sourceUserId: 'ana',
      assignmentId: 'completed-1'
    })).toThrow(/completadas/i);
  });

  it('detecta cuando la dirección ya cambió de responsable', () => {
    expect(() => selectCampaignAssignmentsForReassignment({
      assignments,
      campaignId: 'campaign-1',
      sourceUserId: 'ana',
      assignmentId: 'pending-2'
    })).toThrow(/otra persona/i);
  });

  it('obliga a reabrir cuando el estado cambió mientras se confirmaba', () => {
    expect(() => selectCampaignAssignmentsForReassignment({
      assignments,
      campaignId: 'campaign-1',
      sourceUserId: 'ana',
      assignmentId: 'progress-1',
      expectedStatus: 'pending'
    })).toThrow(/estado.*cambió/i);
  });
});
