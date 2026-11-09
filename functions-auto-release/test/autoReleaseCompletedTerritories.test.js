import test from 'node:test';
import assert from 'node:assert/strict';
import {
  AUTO_RELEASE_AFTER_MS,
  getTerritoryCompletionDate,
  isEligibleForAutoRelease,
  releaseCompletedTerritory,
  releaseEligibleTerritories,
} from '../src/scheduled/autoReleaseCompletedTerritories.js';

const now = new Date('2026-11-02T18:00:00.000Z');
const completedAt = new Date(now.getTime() - AUTO_RELEASE_AFTER_MS);

const createDb = (territoryData, addressData = []) => {
  const territory = { ...territoryData };
  const addresses = addressData.map((data, index) => ({ id: `a${index}`, data: { ...data } }));
  const history = [];
  const territoryRef = { id: 't1', kind: 'territory' };

  const db = {
    collection: (name) => ({
      doc: () => ({ id: `history-${history.length}`, kind: 'history' }),
      where: (field, operator, value) => ({ name, field, operator, value, kind: 'query' }),
    }),
    runTransaction: async (callback) => {
      const writes = [];
      const transaction = {
        get: async (target) => {
          if (target.kind === 'territory') {
            return { exists: true, data: () => ({ ...territory }) };
          }
          if (target.kind === 'query' && target.name === 'addresses') {
            return {
              docs: addresses.map((address) => ({
                ref: { id: address.id, kind: 'address' },
                data: () => ({ ...address.data }),
              })),
            };
          }
          throw new Error('Lectura inesperada');
        },
        update: (ref, data) => writes.push({ type: 'update', ref, data }),
        create: (ref, data) => writes.push({ type: 'create', ref, data }),
      };
      const result = await callback(transaction);
      for (const write of writes) {
        if (write.ref.kind === 'territory') Object.assign(territory, write.data);
        if (write.ref.kind === 'address') {
          Object.assign(addresses.find((address) => address.id === write.ref.id).data, write.data);
        }
        if (write.type === 'create') history.push(write.data);
      }
      return result;
    },
  };

  return { db, territory, territoryRef, addresses, history };
};

test('libera a las 168 horas exactas y nunca usa lastWorked como fecha de finalización', () => {
  const data = { status: 'Completado', completedDate: completedAt };
  assert.equal(isEligibleForAutoRelease(data, now), true);
  assert.equal(isEligibleForAutoRelease({ ...data, completedDate: new Date(completedAt.getTime() + 1) }, now), false);
  assert.equal(isEligibleForAutoRelease({ status: 'Completado', lastWorked: completedAt }, now), false);
  assert.equal(isEligibleForAutoRelease({ ...data, status: 'En uso' }, now), false);
});

test('acepta terminadoDate heredada válida y rechaza fechas ambiguas', () => {
  assert.equal(getTerritoryCompletionDate({ terminadoDate: { toDate: () => completedAt } }).getTime(), completedAt.getTime());
  assert.equal(getTerritoryCompletionDate({ completedDate: completedAt.toISOString() }).getTime(), completedAt.getTime());
  assert.equal(getTerritoryCompletionDate({ completedDate: '2026-10-26' }), null);
});

test('libera territorio y direcciones juntos, conserva la finalización y evita una segunda liberación', async () => {
  const state = createDb(
    { name: 'Territorio 1', status: 'Completado', completedDate: completedAt, completedBy: 'Ana', assignedTo: ['Ana', 'Luis'], assignedDate: new Date('2026-10-01T00:00:00Z') },
    [{ isVisited: true }, { isVisited: true }, { isVisited: false }]
  );

  assert.deepEqual(await releaseCompletedTerritory(state.db, state.territoryRef, now), { released: true, resetAddresses: 2 });
  assert.equal(state.territory.status, 'Disponible');
  assert.equal(state.territory.assignedTo, null);
  assert.equal(state.territory.assignedDate, null);
  assert.equal(state.territory.completedDate, completedAt);
  assert.equal(state.territory.completedBy, 'Ana');
  assert.ok(state.addresses.every((address) => address.data.isVisited === false));
  assert.equal(state.history.length, 1);
  assert.equal(state.history[0].status, 'Devuelto automáticamente');
  assert.equal(state.history[0].completedDate, undefined);

  assert.deepEqual(await releaseCompletedTerritory(state.db, state.territoryRef, now), { released: false, resetAddresses: 0 });
  assert.equal(state.history.length, 1);
});

test('vuelve a comprobar el estado y la fecha dentro de la transacción', async () => {
  const reassigned = createDb({ status: 'En uso', completedDate: completedAt, assignedTo: 'Luis' }, [{ isVisited: true }]);
  assert.equal((await releaseCompletedTerritory(reassigned.db, reassigned.territoryRef, now)).released, false);
  assert.equal(reassigned.addresses[0].data.isVisited, true);

  const recompleted = createDb({ status: 'Completado', completedDate: new Date(now.getTime() - 60_000) }, [{ isVisited: true }]);
  assert.equal((await releaseCompletedTerritory(recompleted.db, recompleted.territoryRef, now)).released, false);
  assert.equal(recompleted.addresses[0].data.isVisited, true);
});

test('si excede el límite de escrituras no cambia ningún dato', async () => {
  const state = createDb({ status: 'Completado', completedDate: completedAt, assignedTo: 'Ana' },
    Array.from({ length: 399 }, () => ({ isVisited: true })));
  await assert.rejects(releaseCompletedTerritory(state.db, state.territoryRef, now), /demasiadas direcciones/);
  assert.equal(state.territory.status, 'Completado');
  assert.equal(state.history.length, 0);
  assert.ok(state.addresses.every((address) => address.data.isVisited));
});

test('la revisión omite territorios sin fecha válida', async () => {
  const db = {
    collection: () => ({
      where: () => ({ get: async () => ({ size: 1, docs: [{ id: 't1', data: () => ({ status: 'Completado', lastWorked: completedAt }) }] }) }),
    }),
  };
  const result = await releaseEligibleTerritories(db, now);
  assert.equal(result.withoutCompletionDate, 1);
  assert.equal(result.releasedTerritories, 0);
});
