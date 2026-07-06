import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';
import { getFirestore } from 'firebase-admin/firestore';
import { DEFAULT_DRIVE_FOLDER_ID } from '../backup/driveUpload.js';
import { runDriveBackup } from '../backup/runDriveBackup.js';
import { verifyAdmin } from '../backup/verifyAdmin.js';

const driveServiceAccountJson = defineSecret('DRIVE_SERVICE_ACCOUNT_JSON');

export const uploadBackupToDrive = onCall(
  {
    secrets: [driveServiceAccountJson],
    timeoutSeconds: 300,
    memory: '512MiB',
  },
  async (request) => {
    const { userId, accessCode, password } = request.data || {};
    const db = getFirestore();

    const isAdmin = await verifyAdmin(db, { userId, accessCode, password });
    if (!isAdmin) {
      throw new HttpsError('permission-denied', 'Solo administradores pueden subir respaldos.');
    }

    const serviceAccountJson = driveServiceAccountJson.value();
    if (!serviceAccountJson) {
      throw new HttpsError('failed-precondition', 'Credenciales de Google Drive no configuradas.');
    }

    try {
      return await runDriveBackup({
        db,
        serviceAccountJson,
        folderId: DEFAULT_DRIVE_FOLDER_ID,
      });
    } catch (error) {
      throw new HttpsError('internal', error.message || 'Error al subir respaldo a Google Drive.');
    }
  }
);
