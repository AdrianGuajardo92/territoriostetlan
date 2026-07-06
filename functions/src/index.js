import { initializeApp } from 'firebase-admin/app';
import { dailyDriveBackup } from './scheduled/dailyDriveBackup.js';
import { uploadBackupToDrive } from './callable/uploadBackupToDrive.js';

initializeApp();

export { dailyDriveBackup, uploadBackupToDrive };
