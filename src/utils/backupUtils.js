/**
 * Utilidades de backup para el cliente.
 * Mantener sincronizado con functions/src/backup/buildBackup.js (servidor).
 */

const BACKUP_VERSION = '1.0';
const BACKUP_TYPE = 'addresses_territories';

export function buildAddressesTerritoriesBackupPayload(territories, addresses) {
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

export function getAddressesTerritoriesBackupFileName(date = new Date()) {
  const day = date.toISOString().split('T')[0];
  return `backup_direcciones_territorios_${day}.json`;
}

export function downloadBackupJson(backupData, fileName) {
  const dataStr = JSON.stringify(backupData, null, 2);
  const dataBlob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(dataBlob);

  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
