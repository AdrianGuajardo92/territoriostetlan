import { beforeEach, describe, expect, it } from 'vitest';
import {
  getCampaignPendingReminderStorageKey,
  hasSeenCampaignPendingReminder,
  markCampaignPendingReminderSeen
} from './campaignPendingReminder.js';

const createMemoryStorage = () => {
  const store = new Map();

  return {
    getItem: (key) => (store.has(key) ? store.get(key) : null),
    setItem: (key, value) => {
      store.set(String(key), String(value));
    },
    removeItem: (key) => {
      store.delete(String(key));
    },
    clear: () => {
      store.clear();
    }
  };
};

describe('aviso diario de campaña', () => {
  beforeEach(() => {
    globalThis.localStorage = createMemoryStorage();
  });

  it('marca visto solo para ese usuario, campaña y día', () => {
    const date = new Date('2026-09-01T12:00:00');

    expect(hasSeenCampaignPendingReminder('u1', 'c1', date)).toBe(false);
    markCampaignPendingReminderSeen('u1', 'c1', date);
    expect(hasSeenCampaignPendingReminder('u1', 'c1', date)).toBe(true);
    expect(hasSeenCampaignPendingReminder('u1', 'c2', date)).toBe(false);
    expect(localStorage.getItem(getCampaignPendingReminderStorageKey('u1', 'c1', date))).toBe('1');
  });
});
