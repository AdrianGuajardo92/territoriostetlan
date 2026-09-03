import { describe, it, expect } from 'vitest';
import {
  buildCampaignReassignmentUndoEntry,
  buildDistributionAssignmentFingerprint,
  buildDistributionTargetsFromAssignments,
  buildDistributionTargetFingerprint,
  buildRedistributionNeeds,
  distributeAddressesAcrossParticipants,
  enforceCampaignAddressRestrictions,
  shuffleCampaignItems,
  isCampaignReassignmentUndoTokenExpired,
  prepareDistributionTargetsForApply,
  selectCampaignAssignmentsForReassignment,
  validateCampaignReassignmentUndoCandidate,
  validateRedistributionAddressPool
} from './campaignUtils.js';

describe('participantes visibles en la administración del reparto', () => {
  const participants = [
    { userId: 'active', isEnabled: true },
    { userId: 'without-default-assignment', isEnabled: false }
  ];

  it('conserva con objetivo 0 a quienes no recibieron reparto', () => {
    expect(buildDistributionTargetsFromAssignments([], participants)).toEqual({
      active: 0,
      'without-default-assignment': 0
    });
  });

  it('permite asignar manualmente a una persona excluida por defecto', () => {
    expect(prepareDistributionTargetsForApply({
      active: 1,
      'without-default-assignment': 1
    }, participants, {}, 2)).toEqual({
      active: 1,
      'without-default-assignment': 1
    });
  });
});

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

  it('baraja a las personas y les deja direcciones seguidas', () => {
    const addresses = [
      { id: 't8-a', territoryId: 't8', address: 'Calle 8 A' },
      { id: 't8-b', territoryId: 't8', address: 'Calle 8 B' },
      { id: 't8-c', territoryId: 't8', address: 'Calle 8 C' },
      { id: 't9-a', territoryId: 't9', address: 'Calle 9 A' },
      { id: 't9-b', territoryId: 't9', address: 'Calle 9 B' }
    ];
    const participants = [
      { userId: 'adrian', userNameSnapshot: 'Adrián Guajardo', isEnabled: true },
      { userId: 'zoe', userNameSnapshot: 'Zoe López', isEnabled: true }
    ];
    const targets = [
      { userId: 'adrian', assignedCount: 3 },
      { userId: 'zoe', assignedCount: 2 }
    ];
    const territoryMap = {
      t8: { id: 't8', name: 'Territorio 8' },
      t9: { id: 't9', name: 'Territorio 9' }
    };

    const putZoeFirst = () => 0;
    const assignments = distributeAddressesAcrossParticipants({
      addresses,
      participants,
      targets,
      territoryMap,
      random: putZoeFirst
    });

    expect(assignments.map((assignment) => assignment.assignedUserId)).toEqual([
      'zoe',
      'zoe',
      'adrian',
      'adrian',
      'adrian'
    ]);
    expect(assignments.slice(0, 2).map((assignment) => assignment.addressId)).toEqual(['t8-a', 't8-b']);
    expect(assignments.slice(2).map((assignment) => assignment.addressId)).toEqual(['t8-c', 't9-a', 't9-b']);
  });

  it('reserva las seis direcciones especiales para los varones autorizados', () => {
    const restrictedAddressIds = [
      'territorio-enlaces-2026-07-05-t01-005',
      'territorio-enlaces-2026-07-05-t01-004',
      'territorio-enlaces-2026-07-05-t01-002',
      'territorio-enlaces-2026-07-05-t01-006',
      'territorio-enlaces-2026-07-05-t01-001',
      'territorio-enlaces-2026-07-05-t01-003'
    ];
    const addresses = [
      ...restrictedAddressIds.map((id, index) => ({
        id,
        territoryId: 't1',
        address: `Especial ${index + 1}`
      })),
      ...Array.from({ length: 6 }, (_, index) => ({
        id: `normal-${index + 1}`,
        territoryId: 't2',
        address: `Normal ${index + 1}`
      }))
    ];
    const participants = [
      { userId: 'ana', userNameSnapshot: 'Ana Ruiz', isEnabled: true },
      { userId: 'adrian', userNameSnapshot: 'Adrián Guajardo', isEnabled: true }
    ];
    const targets = [
      { userId: 'ana', assignedCount: 6 },
      { userId: 'adrian', assignedCount: 6 }
    ];

    const assignments = distributeAddressesAcrossParticipants({
      addresses,
      participants,
      targets,
      territoryMap: {
        t1: { id: 't1', name: 'Territorio 1' },
        t2: { id: 't2', name: 'Territorio 2' }
      },
      random: () => 0.999
    });

    const restrictedAssignments = assignments.filter((assignment) => (
      restrictedAddressIds.includes(assignment.addressId)
    ));
    const counts = assignments.reduce((result, assignment) => {
      result[assignment.assignedUserId] = (result[assignment.assignedUserId] || 0) + 1;
      return result;
    }, {});

    expect(restrictedAssignments).toHaveLength(6);
    expect(restrictedAssignments.every((assignment) => assignment.assignedUserId === 'adrian')).toBe(true);
    expect(counts).toEqual({ adrian: 6, ana: 6 });
  });

  it('avisa cuando los autorizados no tienen cupo suficiente', () => {
    const assignments = [
      {
        addressId: 'territorio-enlaces-2026-07-05-t01-001',
        assignedUserId: 'ana',
        assignedUserName: 'Ana Ruiz'
      },
      {
        addressId: 'normal-1',
        assignedUserId: 'maria',
        assignedUserName: 'María López'
      }
    ];

    expect(() => enforceCampaignAddressRestrictions(assignments)).toThrow(/capacidad.*autorizados/i);
  });
});

describe('shuffleCampaignItems', () => {
  it('no deja el orden alfabético original', () => {
    const names = ['Ana', 'Bruno', 'Carla', 'Diego'];
    const shuffled = shuffleCampaignItems(names, () => 0);

    expect(shuffled).not.toEqual(names);
    expect([...shuffled].sort()).toEqual([...names].sort());
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

describe('deshacer reasignaciones de campaña', () => {
  const timestamp = (milliseconds) => ({
    toMillis: () => milliseconds
  });

  it('captura el estado previo completo de una dirección en progreso', () => {
    const startedAt = timestamp(50);
    const assignment = {
      id: 'progress-1',
      campaignId: 'campaign-1',
      assignedUserId: 'ana',
      assignedUserName: 'Ana',
      status: 'in_progress',
      startedAt,
      manualLocked: false,
      groupId: 'group-1',
      groupLabelSnapshot: 'Grupo 1',
      lastMovedAt: timestamp(25)
    };

    expect(buildCampaignReassignmentUndoEntry(assignment)).toEqual({
      assignmentId: 'progress-1',
      campaignId: 'campaign-1',
      previous: {
        assignedUserId: 'ana',
        assignedUserName: 'Ana',
        groupId: 'group-1',
        groupLabelSnapshot: 'Grupo 1',
        manualLocked: false,
        status: 'in_progress',
        startedAt,
        lastMovedAt: assignment.lastMovedAt
      }
    });
  });

  it('acepta una pendiente que no cambió después del movimiento', () => {
    const movedAt = timestamp(100);
    const undoEntry = buildCampaignReassignmentUndoEntry({
      id: 'pending-1',
      campaignId: 'campaign-1',
      assignedUserId: 'ana',
      assignedUserName: 'Ana',
      status: 'pending',
      manualLocked: false
    });

    expect(validateCampaignReassignmentUndoCandidate({
      assignment: {
        id: 'pending-1',
        campaignId: 'campaign-1',
        assignedUserId: 'luis',
        status: 'pending',
        manualLocked: true,
        lastMoveOperationId: 'move-1',
        lastMovedAt: movedAt,
        updatedAt: movedAt
      },
      undoEntry,
      operationId: 'move-1',
      targetUserId: 'luis'
    })).toBe(true);
  });

  it.each([
    {
      label: 'se movió nuevamente',
      changes: { lastMoveOperationId: 'move-2' },
      expected: /nuevamente/i
    },
    {
      label: 'ya fue iniciada',
      changes: { status: 'in_progress' },
      expected: /iniciada o completada/i
    },
    {
      label: 'cambió después del movimiento',
      changes: { updatedAt: timestamp(101) },
      expected: /cambió después/i
    }
  ])('rechaza el undo masivo si una dirección $label', ({ changes, expected }) => {
    const movedAt = timestamp(100);
    const undoEntry = buildCampaignReassignmentUndoEntry({
      id: 'pending-1',
      campaignId: 'campaign-1',
      assignedUserId: 'ana',
      status: 'pending'
    });
    const assignment = {
      id: 'pending-1',
      campaignId: 'campaign-1',
      assignedUserId: 'luis',
      status: 'pending',
      manualLocked: true,
      lastMoveOperationId: 'move-1',
      lastMovedAt: movedAt,
      updatedAt: movedAt,
      ...changes
    };

    expect(() => validateCampaignReassignmentUndoCandidate({
      assignment,
      undoEntry,
      operationId: 'move-1',
      targetUserId: 'luis'
    })).toThrow(expected);
  });

  it('vence el token al terminar la ventana indicada', () => {
    const undoToken = { expiresAt: 15_000 };

    expect(isCampaignReassignmentUndoTokenExpired(undoToken, 14_999)).toBe(false);
    expect(isCampaignReassignmentUndoTokenExpired(undoToken, 15_000)).toBe(true);
  });
});
