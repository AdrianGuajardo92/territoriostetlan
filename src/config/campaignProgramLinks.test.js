import { describe, expect, it } from 'vitest';
import {
  BIBLE_STUDY_CAMPAIGN_2026_GUIDE,
  BIBLE_STUDY_CAMPAIGN_2026_VIDEO_URL,
  getBibleStudyCampaign2026Guide,
  getRegionalAssembly2026ProgramUrl
} from './campaignProgramLinks.js';

describe('recursos oficiales de campañas', () => {
  it('muestra los consejos en la campaña de cursos bíblicos de septiembre de 2026', () => {
    expect(getBibleStudyCampaign2026Guide({
      name: 'Campaña de cursos bíblicos | Septiembre 2026',
      type: 'especial'
    })).toBe(BIBLE_STUDY_CAMPAIGN_2026_GUIDE);
  });

  it('reconoce la campaña por la fecha aunque el nombre no incluya el mes ni el año', () => {
    expect(getBibleStudyCampaign2026Guide({
      name: 'Campaña de cursos bíblicos',
      type: 'especial',
      eventDate: '2026-09-01'
    })).toBe(BIBLE_STUDY_CAMPAIGN_2026_GUIDE);
  });

  it('no muestra esos consejos en otras campañas', () => {
    expect(getBibleStudyCampaign2026Guide({
      name: 'Invitación a la Conmemoración | 2026',
      type: 'conmemoracion',
      eventDate: '2026-03-01'
    })).toBeNull();
  });

  it('delimita un fragmento distinto para cada consejo', () => {
    const ranges = BIBLE_STUDY_CAMPAIGN_2026_GUIDE.tips.map((tip) => [
      tip.startTime,
      tip.endTime
    ]);

    expect(ranges).toEqual([
      [31, 154],
      [154, 178],
      [178, 289],
      [289, 409.5]
    ]);
  });

  it('usa el video oficial en lengua de señas mexicana', () => {
    expect(BIBLE_STUDY_CAMPAIGN_2026_VIDEO_URL).toContain('mwbv_LSM_202609_01');
    expect(BIBLE_STUDY_CAMPAIGN_2026_GUIDE.resources[1].url).toContain('/mfs/');
  });

  it('abre la guía en la sección exacta de WOL', () => {
    expect(BIBLE_STUDY_CAMPAIGN_2026_GUIDE.resources[0].url).toBe(
      'https://wol.jw.org/es/wol/d/r4/lp-s/202026252#p28'
    );
  });

  it('conserva el enlace del programa para la asamblea regional de 2026', () => {
    expect(getRegionalAssembly2026ProgramUrl({
      name: 'Asamblea regional 2026',
      type: 'asamblea'
    })).toContain('asamblea-regional-2026-video');
  });
});
