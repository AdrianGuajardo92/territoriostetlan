import { describe, expect, it } from 'vitest';
import {
  DEFAULT_CAMPAIGN_ADDRESS_COUNT,
  PIONEER_CAMPAIGN_ADDRESS_COUNT,
  getDefaultCampaignAssignment,
  resolveCampaignAssignment
} from './campaignAssignmentRules.js';

describe('reglas fijas de reparto de campaña', () => {
  it('da 3 direcciones a los precursores', () => {
    expect(getDefaultCampaignAssignment('Adrián Merino')).toEqual({
      isEnabled: true,
      capacityWeight: 1,
      hardLimit: PIONEER_CAMPAIGN_ADDRESS_COUNT
    });
  });

  it('excluye a Jorge Perea, Luis Isas y Rogelio Sepúlveda', () => {
    for (const name of ['Jorge Perea', 'Luis Isas', 'Rogelio Sepúlveda']) {
      expect(getDefaultCampaignAssignment(name).isEnabled).toBe(false);
    }
  });

  it('deja a Andrea Alcázar, Martín y Gabriela Martínez en 2 aunque sean precursores', () => {
    for (const name of ['Andrea Alcázar', 'Martín Martínez', 'Gabriela Martínez']) {
      expect(getDefaultCampaignAssignment(name)).toEqual({
        isEnabled: true,
        capacityWeight: 1,
        hardLimit: DEFAULT_CAMPAIGN_ADDRESS_COUNT
      });
    }
  });

  it('da 3 direcciones a Adrián Guajardo', () => {
    expect(getDefaultCampaignAssignment('Adrián Guajardo')).toEqual({
      isEnabled: true,
      capacityWeight: 1,
      hardLimit: PIONEER_CAMPAIGN_ADDRESS_COUNT
    });
  });

  it('deja 2 direcciones al resto', () => {
    expect(getDefaultCampaignAssignment('José Galindo')).toEqual({
      isEnabled: true,
      capacityWeight: 1,
      hardLimit: DEFAULT_CAMPAIGN_ADDRESS_COUNT
    });
  });

  it('convierte el modo automático guardado en la regla visible', () => {
    expect(resolveCampaignAssignment({
      userNameSnapshot: 'Jorge Perea',
      isEnabled: true,
      capacityWeight: 1,
      hardLimit: ''
    }).isEnabled).toBe(false);

    expect(resolveCampaignAssignment({
      userNameSnapshot: 'Adrián Merino',
      isEnabled: true,
      capacityWeight: 1,
      hardLimit: ''
    }).hardLimit).toBe(PIONEER_CAMPAIGN_ADDRESS_COUNT);

    expect(resolveCampaignAssignment({
      userNameSnapshot: 'Gabriela Martínez',
      isEnabled: true,
      capacityWeight: 1,
      hardLimit: PIONEER_CAMPAIGN_ADDRESS_COUNT
    }).hardLimit).toBe(DEFAULT_CAMPAIGN_ADDRESS_COUNT);
  });
});
