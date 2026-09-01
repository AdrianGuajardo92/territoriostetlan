import { describe, expect, it } from 'vitest';
import {
  formatCampaignDateRange,
  formatCampaignSchedule,
  getCampaignPeriodEndAt,
  hasCampaignPeriodEnded,
  normalizeCampaignDateRange,
  toCampaignDateKey
} from './campaignUtils.js';

describe('rango de fechas de campaña', () => {
  it('ordena inicio y fin si el usuario elige al revés', () => {
    expect(normalizeCampaignDateRange('2026-09-30', '2026-09-01')).toEqual({
      eventDate: '2026-09-01',
      eventEndDate: '2026-09-30'
    });
  });

  it('muestra un solo día o el rango completo', () => {
    expect(formatCampaignDateRange('2026-09-01', '2026-09-01')).toMatch(/1/);
    expect(formatCampaignDateRange('2026-09-01', '2026-09-30')).toContain('–');
    expect(formatCampaignSchedule({
      eventDate: '2026-09-01',
      eventEndDate: '2026-09-30'
    })).toContain('–');
    expect(formatCampaignSchedule({ eventDate: '2026-07-07' })).not.toContain('–');
  });

  it('vence a la 1:00 del día siguiente al fin', () => {
    const periodEnd = getCampaignPeriodEndAt('2026-09-30');
    expect(toCampaignDateKey(periodEnd)).toBe('2026-10-01');
    expect(periodEnd.getHours()).toBe(1);
    expect(periodEnd.getMinutes()).toBe(0);

    const campaign = { eventEndDate: '2026-09-30' };
    expect(hasCampaignPeriodEnded(campaign, new Date(2026, 8, 30, 23, 59))).toBe(false);
    expect(hasCampaignPeriodEnded(campaign, new Date(2026, 9, 1, 0, 59))).toBe(false);
    expect(hasCampaignPeriodEnded(campaign, new Date(2026, 9, 1, 1, 0))).toBe(true);
    expect(hasCampaignPeriodEnded({ eventDate: '2026-07-07' }, new Date(2026, 9, 1))).toBe(false);
  });
});
