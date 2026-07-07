const STORAGE_KEY = 'territorios-campaign-distribution-drafts';

const readAllDrafts = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
};

const writeAllDrafts = (drafts) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(drafts));
  } catch {
    // Ignorar errores de cuota o modo privado
  }
};

export const loadDistributionDraft = (campaignId) => {
  if (!campaignId) return null;
  const entry = readAllDrafts()[campaignId];
  if (!entry || typeof entry !== 'object') return null;
  if (!entry.targets || typeof entry.targets !== 'object') return null;
  return entry;
};

export const saveDistributionDraft = (campaignId, targets = {}, meta = {}) => {
  if (!campaignId) return;

  const drafts = readAllDrafts();
  drafts[campaignId] = {
    targets: { ...targets },
    addressCount: Number(meta.addressCount) || 0,
    updatedAt: meta.updatedAt || new Date().toISOString()
  };
  writeAllDrafts(drafts);
};

export const clearDistributionDraft = (campaignId) => {
  if (!campaignId) return;

  const drafts = readAllDrafts();
  if (!drafts[campaignId]) return;

  delete drafts[campaignId];
  writeAllDrafts(drafts);
};
