import { isPioneerName, normalizePersonName } from './congregationPioneers';

export const PIONEER_CAMPAIGN_ADDRESS_COUNT = 3;
export const DEFAULT_CAMPAIGN_ADDRESS_COUNT = 2;
export const REDUCED_CAMPAIGN_ADDRESS_COUNT = 1;

/** Hermanos que no entran al reparto de campañas. Se pueden ir ampliando. */
export const EXCLUDED_CAMPAIGN_NAMES = [
  'Jorge Perea',
  'Luis Isas',
  'Rogelio Sepúlveda'
];

/** Hermanos con una sola dirección. Se pueden ir ampliando. */
export const ONE_ADDRESS_CAMPAIGN_NAMES = [];

/** Precursores u otros que, aun así, se quedan en 2 direcciones. */
export const TWO_ADDRESS_CAMPAIGN_NAMES = [
  'Martín Martínez',
  'Gabriela Martínez',
  'Andrea Alcázar'
];

/** Hermanos que no son precursores y aun así llevan 3. */
export const THREE_ADDRESS_CAMPAIGN_NAMES = [
  'Adrián Guajardo'
];

const toNameSet = (names) => new Set(names.map(normalizePersonName));

const EXCLUDED_CAMPAIGN_NAMES_NORMALIZED = toNameSet(EXCLUDED_CAMPAIGN_NAMES);
const ONE_ADDRESS_CAMPAIGN_NAMES_NORMALIZED = toNameSet(ONE_ADDRESS_CAMPAIGN_NAMES);
const TWO_ADDRESS_CAMPAIGN_NAMES_NORMALIZED = toNameSet(TWO_ADDRESS_CAMPAIGN_NAMES);
const THREE_ADDRESS_CAMPAIGN_NAMES_NORMALIZED = toNameSet(THREE_ADDRESS_CAMPAIGN_NAMES);

export const isExcludedCampaignName = (name) => (
  EXCLUDED_CAMPAIGN_NAMES_NORMALIZED.has(normalizePersonName(name))
);

export const isOneAddressCampaignName = (name) => (
  ONE_ADDRESS_CAMPAIGN_NAMES_NORMALIZED.has(normalizePersonName(name))
);

export const isTwoAddressCampaignName = (name) => (
  TWO_ADDRESS_CAMPAIGN_NAMES_NORMALIZED.has(normalizePersonName(name))
);

export const isThreeAddressCampaignName = (name) => (
  THREE_ADDRESS_CAMPAIGN_NAMES_NORMALIZED.has(normalizePersonName(name))
);

export const getDefaultCampaignAssignment = (name) => {
  if (isExcludedCampaignName(name)) {
    return {
      isEnabled: false,
      capacityWeight: 1,
      hardLimit: ''
    };
  }

  if (isOneAddressCampaignName(name)) {
    return {
      isEnabled: true,
      capacityWeight: 1,
      hardLimit: REDUCED_CAMPAIGN_ADDRESS_COUNT
    };
  }

  if (isTwoAddressCampaignName(name)) {
    return {
      isEnabled: true,
      capacityWeight: 1,
      hardLimit: DEFAULT_CAMPAIGN_ADDRESS_COUNT
    };
  }

  if (isThreeAddressCampaignName(name) || isPioneerName(name)) {
    return {
      isEnabled: true,
      capacityWeight: 1,
      hardLimit: PIONEER_CAMPAIGN_ADDRESS_COUNT
    };
  }

  return {
    isEnabled: true,
    capacityWeight: 1,
    hardLimit: DEFAULT_CAMPAIGN_ADDRESS_COUNT
  };
};

export const applyDefaultCampaignAssignment = (participant) => ({
  ...participant,
  ...getDefaultCampaignAssignment(participant.userNameSnapshot || participant.name)
});

export const isAutoCampaignAssignment = (participant) => {
  if (participant?.isEnabled === false) return false;
  const rawLimit = participant?.hardLimit;
  const weight = Number(participant?.capacityWeight) || 1;
  return weight === 1 && (rawLimit === '' || rawLimit === null || rawLimit === undefined);
};

export const resolveCampaignAssignment = (participant) => {
  const name = participant?.userNameSnapshot || participant?.name;
  const hasFixedRule = (
    isExcludedCampaignName(name)
    || isOneAddressCampaignName(name)
    || isTwoAddressCampaignName(name)
    || isThreeAddressCampaignName(name)
  );

  if (hasFixedRule || isAutoCampaignAssignment(participant)) {
    return applyDefaultCampaignAssignment(participant);
  }

  return participant;
};
