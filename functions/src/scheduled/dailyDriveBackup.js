import { onSchedule } from 'firebase-functions/v2/scheduler';
import { defineSecret } from 'firebase-functions/params';
import { logger } from 'firebase-functions';
import { getFirestore } from 'firebase-admin/firestore';
import { DEFAULT_DRIVE_FOLDER_ID } from '../backup/driveUpload.js';
import { runDriveBackup } from '../backup/runDriveBackup.js';

const driveServiceAccountJson = defineSecret('DRIVE_SERVICE_ACCOUNT_JSON');

export const dailyDriveBackup = onSchedule(
  {
    schedule: '0 1 * * *',
    timeZone: 'America/Mexico_City',
    secrets: [driveServiceAccountJson],
    timeoutSeconds: 300,
    memory: '512MiB',
  },
  async () => {
    const db = getFirestore();
    const serviceAccountJson = driveServiceAccountJson.value();

    if (!serviceAccountJson) {
      logger.error('DRIVE_SERVICE_ACCOUNT_JSON no configurado');
      throw new Error('Secreto DRIVE_SERVICE_ACCOUNT_JSON no configurado');
    }

    const result = await runDriveBackup({
      db,
      serviceAccountJson,
      folderId: DEFAULT_DRIVE_FOLDER_ID,
    });

    logger.info('Respaldo diario subido a Google Drive', result);
    return result;
  }
);
