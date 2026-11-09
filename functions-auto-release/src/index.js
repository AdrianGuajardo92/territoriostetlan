import { initializeApp } from 'firebase-admin/app';
import { autoReleaseCompletedTerritories } from './scheduled/autoReleaseCompletedTerritories.js';

initializeApp();

export { autoReleaseCompletedTerritories };
