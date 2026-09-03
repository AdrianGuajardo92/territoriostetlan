import { describe, expect, it } from 'vitest';
import {
  DEFAULT_CAMPAIGN_ADDRESS_COUNT,
  EXTENDED_CAMPAIGN_ADDRESS_COUNT,
  PIONEER_CAMPAIGN_ADDRESS_COUNT,
  REDUCED_CAMPAIGN_ADDRESS_COUNT,
  getDefaultCampaignAssignment,
  resolveCampaignAssignment
} from './campaignAssignmentRules.js';
import { calculateCampaignTargets } from '../utils/campaignUtils.js';

describe('reglas fijas de reparto de campaña', () => {
  const currentCampaignNames = [
    'Adrián Guajardo', 'Adrián Merino', 'Alicia Ramos', 'Alison González',
    'Ana Ruiz', 'Andrea Alcázar', 'Antonio Isas', 'April Merino', 'Beker Alvizo',
    'Carlos Ramos', 'Carolina Segura', 'Cristina Ávila', 'Diego Serrano',
    'Eliseba Serrano', 'Fabiola Guajardo', 'Gabriel Segura', 'Gabriela Martínez',
    'Gabriela Silva', 'Gloria Romero', 'Graciela Limones', 'Greta Hernández',
    'Gritzel Hernandez', 'Jehonatán Chávez', 'Jehu Abner', 'Jessica Isas',
    'Jorge Perea', 'José Galindo', 'José Heredia', 'Joshua Garcia', 'Julio Mora',
    'Karina González', 'Leilany Silva', 'Luis Hernández', 'Luis Isas', 'Ma. Ramírez',
    'Margarita Ballardo', 'Maricela Murillo', 'Marisol Isas', 'Martha Martínez',
    'Martín Martínez', 'Mauricio Chávez', 'Miguel Silva', 'Montserrat Ruiz',
    'Nahomy Estrada', 'Omar Gallardo', 'Omega Gallardo', 'Rogelio Sepúlveda',
    'Rosaura Chávez', 'Silvia Blas', 'Sophia Macias', 'Valeria Valencia',
    'Verónica Martínez'
  ];

  it('da 3 direcciones a los precursores', () => {
    expect(getDefaultCampaignAssignment('Adrián Merino')).toEqual({
      isEnabled: true,
      capacityWeight: 1,
      hardLimit: PIONEER_CAMPAIGN_ADDRESS_COUNT
    });
  });

  it('excluye a las personas configuradas sin reparto', () => {
    for (const name of ['Luis Isas', 'Rogelio Sepúlveda', 'Ma. Ramírez', 'Jessica Isas', 'Jehu Abner']) {
      expect(getDefaultCampaignAssignment(name).isEnabled).toBe(false);
    }
  });

  it('respeta los precursores configurados con 2 direcciones', () => {
    for (const name of [
      'Andrea Alcázar',
      'Martín Martínez',
      'Gabriela Martínez',
      'Carlos Ramos',
      'Jorge Perea',
      'Karina González',
      'Mauricio Chávez',
      'Nahomy Estrada',
      'Rosaura Chávez',
      'Sophia Macias',
      'Verónica Martínez'
    ]) {
      expect(getDefaultCampaignAssignment(name)).toEqual({
        isEnabled: true,
        capacityWeight: 1,
        hardLimit: DEFAULT_CAMPAIGN_ADDRESS_COUNT
      });
    }
  });

  it('deja a Graciela Limones en 1 dirección', () => {
    expect(getDefaultCampaignAssignment('Graciela Limones')).toEqual({
      isEnabled: true,
      capacityWeight: 1,
      hardLimit: REDUCED_CAMPAIGN_ADDRESS_COUNT
    });
  });

  it('da 4 direcciones a Carolina, Cristina, Fabiola y Gabriel', () => {
    for (const name of ['Carolina Segura', 'Cristina Ávila', 'Fabiola Guajardo', 'Gabriel Segura']) {
      expect(getDefaultCampaignAssignment(name)).toEqual({
        isEnabled: true,
        capacityWeight: 1,
        hardLimit: EXTENDED_CAMPAIGN_ADDRESS_COUNT
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

  it('completa exactamente las 109 direcciones con 47 participantes', () => {
    const assignments = currentCampaignNames.map(getDefaultCampaignAssignment);
    const enabledAssignments = assignments.filter((assignment) => assignment.isEnabled);

    expect(enabledAssignments).toHaveLength(47);
    expect(enabledAssignments.reduce((total, assignment) => total + assignment.hardLimit, 0)).toBe(109);

    const participants = currentCampaignNames.map((name) => ({
      userId: name,
      userNameSnapshot: name,
      ...getDefaultCampaignAssignment(name)
    }));
    const targets = calculateCampaignTargets(participants, 109);

    for (const target of targets) {
      const configured = participants.find((participant) => participant.userId === target.userId);
      expect(target.assignedCount).toBe(configured.hardLimit);
    }
  });

  it('convierte el modo automático guardado en la regla visible', () => {
    expect(resolveCampaignAssignment({
      userNameSnapshot: 'Jessica Isas',
      isEnabled: true,
      capacityWeight: 1,
      hardLimit: ''
    }).isEnabled).toBe(false);

    expect(resolveCampaignAssignment({
      userNameSnapshot: 'Jorge Perea',
      isEnabled: false,
      capacityWeight: 1,
      hardLimit: ''
    })).toEqual({
      userNameSnapshot: 'Jorge Perea',
      isEnabled: true,
      capacityWeight: 1,
      hardLimit: DEFAULT_CAMPAIGN_ADDRESS_COUNT
    });

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

    expect(resolveCampaignAssignment({
      userNameSnapshot: 'Cristina Ávila',
      isEnabled: true,
      capacityWeight: 1,
      hardLimit: PIONEER_CAMPAIGN_ADDRESS_COUNT
    }).hardLimit).toBe(EXTENDED_CAMPAIGN_ADDRESS_COUNT);
  });
});
