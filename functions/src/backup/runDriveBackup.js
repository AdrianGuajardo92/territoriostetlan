import {
  buildAddressesTerritoriesBackup,
  getBackupFileName,
  serializeBackup,
} from './buildBackup.js';
import { uploadJsonToDrive } from './driveUpload.js';

export async function runDriveBackup({ db, serviceAccountJson, folderId }) {
  const backupData = await buildAddressesTerritoriesBackup(db);
  const fileName = getBackupFileName();
  const jsonContent = serializeBackup(backupData);

  const uploadResult = await uploadJsonToDrive({
    serviceAccountJson,
    folderId,
    fileName,
    jsonContent,
  });

  return {
    success: true,
    fileName: uploadResult.fileName,
    webViewLink: uploadResult.webViewLink,
    replaced: uploadResult.replaced,
    totalTerritories: backupData.data.territories.length,
    totalAddresses: backupData.data.addresses.length,
    timestamp: backupData.timestamp,
  };
}
