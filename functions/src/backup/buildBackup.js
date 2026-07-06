/**
 * Construye el payload de backup direcciones + territorios.
 * Mantener sincronizado con src/utils/backupUtils.js (cliente).
 */

const BACKUP_VERSION = '1.0';
const BACKUP_TYPE = 'addresses_territories';

async function fetchCollection(db, collectionName) {
  const snapshot = await db.collection(collectionName).get();
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
}

export function getBackupFileName(date = new Date()) {
  const day = date.toISOString().split('T')[0];
  return `backup_direcciones_territorios_${day}.json`;
}

export async function buildAddressesTerritoriesBackup(db) {
  const [territories, addresses] = await Promise.all([
    fetchCollection(db, 'territories'),
    fetchCollection(db, 'addresses'),
  ]);

  return {
    version: BACKUP_VERSION,
    timestamp: new Date().toISOString(),
    type: BACKUP_TYPE,
    data: {
      territories,
      addresses,
    },
  };
}

export function serializeBackup(backupData) {
  return JSON.stringify(backupData, null, 2);
}
