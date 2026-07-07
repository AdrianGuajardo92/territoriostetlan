const STORAGE_KEY = 'territorios-quick-proposal-drafts';

export const isQuickProposalDraftEmpty = (draft = {}) => {
  const mapUrl = String(draft.mapUrl || '').trim();
  const coordsText = String(draft.coordsText || '').trim();
  const territoryId = String(draft.territoryId || '').trim();
  return !mapUrl && !coordsText && !territoryId;
};

export const loadQuickProposalDrafts = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
};

const writeQuickProposalDrafts = (drafts) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(drafts));
  } catch {
    // Ignorar errores de cuota o modo privado
  }
};

export const saveQuickProposalDraft = (proposalId, partial = {}) => {
  if (!proposalId) return;

  const drafts = loadQuickProposalDrafts();
  const current = drafts[proposalId] || {};
  const next = {
    ...current,
    ...partial,
    updatedAt: new Date().toISOString()
  };

  if (isQuickProposalDraftEmpty(next)) {
    delete drafts[proposalId];
  } else {
    drafts[proposalId] = next;
  }

  writeQuickProposalDrafts(drafts);
};

export const removeQuickProposalDraft = (proposalId) => {
  if (!proposalId) return;

  const drafts = loadQuickProposalDrafts();
  if (!drafts[proposalId]) return;

  delete drafts[proposalId];
  writeQuickProposalDrafts(drafts);
};

export const hydrateQuickProposalDrafts = () => {
  const drafts = loadQuickProposalDrafts();
  const locations = {};
  const territories = {};

  Object.entries(drafts).forEach(([proposalId, draft]) => {
    locations[proposalId] = {
      mapUrl: draft.mapUrl || '',
      coordsText: draft.coordsText || '',
      latitude: draft.latitude ?? null,
      longitude: draft.longitude ?? null
    };

    if (draft.territoryId) {
      territories[proposalId] = draft.territoryId;
    }
  });

  return { locations, territories };
};
