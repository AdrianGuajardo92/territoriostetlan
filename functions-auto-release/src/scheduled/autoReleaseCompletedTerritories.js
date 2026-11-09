import { onSchedule } from 'firebase-functions/v2/scheduler';
import { logger } from 'firebase-functions';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';

export const AUTO_RELEASE_AFTER_MS = 7 * 24 * 60 * 60 * 1000;
const COMPLETED_STATUSES = new Set(['Completado', 'Terminado']);
// Firestore permite hasta 500 escrituras por transacción. Dejar margen para
// transformaciones y fallar antes de hacer una liberación incompleta.
const MAX_TRANSACTION_WRITES = 400;

const toCompletionDate = (value) => {
  if (value instanceof Date) {
    return Number.isFinite(value.getTime()) ? value : null;
  }

  if (value && typeof value.toDate === 'function') {
    const date = value.toDate();
    return date instanceof Date && Number.isFinite(date.getTime()) ? date : null;
  }

  // Aceptar únicamente cadenas con hora y zona explícitas. Una fecha sin zona
  // no permite saber con certeza cuándo se cumplieron los siete días.
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:[\d.]+(?:Z|[+-]\d{2}:\d{2})$/i.test(value)) {
    const date = new Date(value);
    return Number.isFinite(date.getTime()) ? date : null;
  }

  return null;
};

export const getTerritoryCompletionDate = (territory) =>
  toCompletionDate(territory?.completedDate ?? territory?.terminadoDate);

export const isEligibleForAutoRelease = (territory, now = new Date()) => {
  if (!COMPLETED_STATUSES.has(territory?.status)) return false;
  const completedAt = getTerritoryCompletionDate(territory);
  return Boolean(completedAt && completedAt.getTime() <= now.getTime() - AUTO_RELEASE_AFTER_MS);
};

export const releaseCompletedTerritory = async (db, territoryRef, now = new Date()) => {
  const historyRef = db.collection('territoryHistory').doc();

  return db.runTransaction(async (transaction) => {
    // El listado inicial puede estar desactualizado: una reasignación o una
    // nueva finalización entre ambas lecturas debe cancelar esta liberación.
    const territorySnapshot = await transaction.get(territoryRef);
    if (!territorySnapshot.exists) return { released: false, resetAddresses: 0 };

    const territory = territorySnapshot.data();
    if (!isEligibleForAutoRelease(territory, now)) {
      return { released: false, resetAddresses: 0 };
    }

    const addressSnapshot = await transaction.get(
      db.collection('addresses').where('territoryId', '==', territoryRef.id)
    );
    const addressesToReset = addressSnapshot.docs.filter((addressDoc) => addressDoc.data().isVisited !== false);

    if (addressesToReset.length + 2 > MAX_TRANSACTION_WRITES) {
      throw new Error(`Territorio ${territoryRef.id}: demasiadas direcciones para liberación atómica (${addressesToReset.length})`);
    }

    // Territorio, direcciones e historial se confirman juntos. Si falla alguna
    // escritura, el territorio conserva el estado Completado para reintentar.
    transaction.update(territoryRef, {
      status: 'Disponible',
      assignedTo: null,
      assignedDate: null,
      autoReleasedAt: FieldValue.serverTimestamp(),
    });

    addressesToReset.forEach((addressDoc) => {
      transaction.update(addressDoc.ref, { isVisited: false });
    });

    transaction.create(historyRef, {
      territoryId: territoryRef.id,
      territoryName: territory.name || territoryRef.id,
      status: 'Devuelto automáticamente',
      previousAssignedTo: territory.assignedTo ?? null,
      originalCompletedDate: territory.completedDate ?? territory.terminadoDate,
      releasedAt: FieldValue.serverTimestamp(),
      returnedBy: 'Sistema',
    });

    return { released: true, resetAddresses: addressesToReset.length };
  });
};

export const releaseEligibleTerritories = async (db, now = new Date()) => {
  // La fecha se filtra en memoria para no requerir un índice compuesto nuevo.
  const territoriesSnapshot = await db.collection('territories')
    .where('status', 'in', [...COMPLETED_STATUSES])
    .get();

  const result = {
    completedTerritories: territoriesSnapshot.size,
    eligibleTerritories: 0,
    releasedTerritories: 0,
    resetAddresses: 0,
    withoutCompletionDate: 0,
    failures: [],
  };

  for (const territoryDoc of territoriesSnapshot.docs) {
    const territory = territoryDoc.data();
    if (!getTerritoryCompletionDate(territory)) {
      result.withoutCompletionDate += 1;
      continue;
    }
    if (!isEligibleForAutoRelease(territory, now)) continue;

    result.eligibleTerritories += 1;
    try {
      const release = await releaseCompletedTerritory(db, territoryDoc.ref, now);
      if (release.released) {
        result.releasedTerritories += 1;
        result.resetAddresses += release.resetAddresses;
      }
    } catch (error) {
      logger.error('No se pudo liberar automáticamente un territorio', {
        territoryId: territoryDoc.id,
        error: error.message,
      });
      result.failures.push(territoryDoc.id);
    }
  }

  logger.info('Revisión de liberación automática de territorios', result);
  if (result.failures.length > 0) {
    throw new Error(`Falló la liberación de ${result.failures.length} territorio(s): ${result.failures.join(', ')}`);
  }
  return result;
};

export const autoReleaseCompletedTerritories = onSchedule(
  {
    schedule: '0 * * * *',
    timeZone: 'America/Mexico_City',
    timeoutSeconds: 300,
    memory: '256MiB',
  },
  async () => releaseEligibleTerritories(getFirestore())
);
