const STORAGE_PREFIX = 'campaign-pending-reminder';

export const getCampaignPendingReminderDateKey = (date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const getCampaignPendingReminderStorageKey = (userId, campaignId, date = new Date()) => (
  `${STORAGE_PREFIX}:${userId}:${campaignId}:${getCampaignPendingReminderDateKey(date)}`
);

export const hasSeenCampaignPendingReminder = (userId, campaignId, date = new Date()) => {
  if (!userId || !campaignId || typeof localStorage === 'undefined') return true;
  return localStorage.getItem(getCampaignPendingReminderStorageKey(userId, campaignId, date)) === '1';
};

export const markCampaignPendingReminderSeen = (userId, campaignId, date = new Date()) => {
  if (!userId || !campaignId || typeof localStorage === 'undefined') return;
  localStorage.setItem(getCampaignPendingReminderStorageKey(userId, campaignId, date), '1');
};
