import { normalizePersonName } from './congregationPioneers';

/**
 * Direcciones del Territorio 1 que, por sus circunstancias, solamente deben
 * asignarse a los hermanos indicados abajo.
 */
export const RESTRICTED_CAMPAIGN_ADDRESS_IDS = [
  'territorio-enlaces-2026-07-05-t01-005', // C. 2 #2042
  'territorio-enlaces-2026-07-05-t01-004', // C. 10-A #2102A
  'territorio-enlaces-2026-07-05-t01-002', // C. Pino #1257
  'territorio-enlaces-2026-07-05-t01-006', // Del Furgón #2270
  'territorio-enlaces-2026-07-05-t01-001', // Perdiz #1515
  'territorio-enlaces-2026-07-05-t01-003' // Verdín #1725
];

export const RESTRICTED_CAMPAIGN_PARTICIPANT_NAMES = [
  'Adrián Guajardo',
  'Adrián Merino',
  'Carlos Ramos',
  'Diego Serrano',
  'Gabriel Segura',
  'Mauricio Chávez',
  'Miguel Silva',
  'Omar Gallardo'
];

const RESTRICTED_ADDRESS_ID_SET = new Set(RESTRICTED_CAMPAIGN_ADDRESS_IDS);
const RESTRICTED_PARTICIPANT_NAME_SET = new Set(
  RESTRICTED_CAMPAIGN_PARTICIPANT_NAMES.map(normalizePersonName)
);

const getAddressId = (addressLike) => {
  if (typeof addressLike === 'string') return addressLike;
  return addressLike?.addressId || addressLike?.id || addressLike?.addressSnapshot?.id || '';
};

const getParticipantName = (participantLike) => (
  typeof participantLike === 'string'
    ? participantLike
    : participantLike?.userNameSnapshot || participantLike?.assignedUserName || participantLike?.name || ''
);

export const isRestrictedCampaignAddress = (addressLike) => (
  RESTRICTED_ADDRESS_ID_SET.has(getAddressId(addressLike))
);

export const isRestrictedCampaignParticipant = (participantLike) => (
  RESTRICTED_PARTICIPANT_NAME_SET.has(normalizePersonName(getParticipantName(participantLike)))
);

export const canParticipantReceiveCampaignAddress = (addressLike, participantLike) => (
  !isRestrictedCampaignAddress(addressLike) || isRestrictedCampaignParticipant(participantLike)
);
