import { describe, expect, it } from 'vitest';
import {
  RESTRICTED_CAMPAIGN_ADDRESS_IDS,
  RESTRICTED_CAMPAIGN_PARTICIPANT_NAMES,
  canParticipantReceiveCampaignAddress,
  isRestrictedCampaignAddress,
  isRestrictedCampaignParticipant
} from './campaignAddressRestrictions.js';

describe('restricciones especiales de direcciones de campaña', () => {
  it('identifica las seis direcciones marcadas del Territorio 1', () => {
    expect(RESTRICTED_CAMPAIGN_ADDRESS_IDS).toHaveLength(6);
    expect(new Set(RESTRICTED_CAMPAIGN_ADDRESS_IDS).size).toBe(6);

    for (const addressId of RESTRICTED_CAMPAIGN_ADDRESS_IDS) {
      expect(isRestrictedCampaignAddress(addressId)).toBe(true);
    }
  });

  it('reconoce únicamente a los ocho varones autorizados', () => {
    expect(RESTRICTED_CAMPAIGN_PARTICIPANT_NAMES).toHaveLength(8);

    for (const name of RESTRICTED_CAMPAIGN_PARTICIPANT_NAMES) {
      expect(isRestrictedCampaignParticipant(name)).toBe(true);
    }

    expect(isRestrictedCampaignParticipant('Montserrat Ruiz')).toBe(false);
  });

  it('tolera diferencias de acentos y mayúsculas en los nombres autorizados', () => {
    const restrictedAddressId = RESTRICTED_CAMPAIGN_ADDRESS_IDS[0];

    expect(canParticipantReceiveCampaignAddress(restrictedAddressId, 'ADRIAN GUAJARDO')).toBe(true);
    expect(canParticipantReceiveCampaignAddress(restrictedAddressId, 'Maria López')).toBe(false);
    expect(canParticipantReceiveCampaignAddress('direccion-normal', 'Maria López')).toBe(true);
  });
});
