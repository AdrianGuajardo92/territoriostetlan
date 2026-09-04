export const REGIONAL_ASSEMBLY_2026_PROGRAM_URL =
  'https://www.jw.org/mfs/testigos-de-jehov%C3%A1/asambleas-anuales/asamblea-regional-2026-video/';

export const BIBLE_STUDY_CAMPAIGN_2026_VIDEO_URL =
  'https://cfp2.jw-cdn.org/a/74dc88/1/o/mwbv_LSM_202609_01_r360P.mp4';

export const BIBLE_STUDY_CAMPAIGN_2026_VIDEO_POSTER_URL =
  'https://cfp2.jw-cdn.org/a/370c5d5/1/ir/mwbv_univ_202609_01_lg.jpg';

export const BIBLE_STUDY_CAMPAIGN_2026_LSM_REPORT_URL =
  'https://www.jw.org/mfs/noticias/region/internacionales/2024-Informe-6-del-Cuerpo-Gobernante/';

export const BIBLE_STUDY_CAMPAIGN_2026_GUIDE = Object.freeze({
  tips: Object.freeze([
    Object.freeze({
      text: 'Piensa en personas que ya te escucharon y vuelve a visitarlas para mostrarles cómo es el curso.',
      startTime: 31,
      endTime: 154
    }),
    Object.freeze({
      text: 'Predica con regularidad de casa en casa y procura ir cuando sea más probable encontrar a la gente.',
      startTime: 154,
      endTime: 178
    }),
    Object.freeze({
      text: 'Usa el método directo cuando veas que es un buen momento para ofrecer el curso.',
      startTime: 178,
      endTime: 289
    }),
    Object.freeze({
      text: 'Aprovecha bien el tiempo y analiza con equilibrio qué revisitas están progresando.',
      startTime: 289,
      endTime: 409.5
    })
  ]),
  resources: Object.freeze([
    Object.freeze({
      label: 'Guía de la campaña en WOL',
      description: 'Abre directamente la parte “En esta campaña, ni un golpe al aire”.',
      url: 'https://wol.jw.org/es/wol/d/r4/lp-s/202026252#p28'
    }),
    Object.freeze({
      label: 'Informe 6 en LSM',
      description: 'Video oficial con interpretación en lengua de señas mexicana.',
      url: BIBLE_STUDY_CAMPAIGN_2026_LSM_REPORT_URL
    }),
    Object.freeze({
      label: 'Una pregunta sencilla',
      description: 'Una idea para encontrar más personas interesadas.',
      url: 'https://www.jw.org/es/biblioteca/revistas/atalaya-estudio-febrero-2025/Una-pregunta-sencilla-que-cualquiera-de-nosotros-puede-hacer/'
    })
  ])
});

const normalizeCampaignName = (name) => String(name || '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase();

const getCampaignEventDate = (campaign) => {
  const rawDate = campaign?.eventDate;
  const date = rawDate?.toDate?.() ?? new Date(
    typeof rawDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(rawDate)
      ? `${rawDate}T12:00:00`
      : rawDate
  );
  return Number.isNaN(date?.getTime?.()) ? null : date;
};

export const getRegionalAssembly2026ProgramUrl = (campaign) => {
  if (!campaign || campaign.type !== 'asamblea') return null;

  const name = String(campaign.name || '').toLowerCase();
  if (name.includes('2026')) return REGIONAL_ASSEMBLY_2026_PROGRAM_URL;

  const date = campaign.eventDate?.toDate?.() ?? new Date(campaign.eventDate);
  if (!Number.isNaN(date?.getTime?.()) && date.getFullYear() === 2026) {
    return REGIONAL_ASSEMBLY_2026_PROGRAM_URL;
  }

  return null;
};

export const getBibleStudyCampaign2026Guide = (campaign) => {
  if (!campaign) return null;

  const name = normalizeCampaignName(campaign.name);
  const isBibleStudyCampaign = name.includes('curso') && name.includes('biblic');
  if (!isBibleStudyCampaign) return null;

  const eventDate = getCampaignEventDate(campaign);
  const is2026 = name.includes('2026') || eventDate?.getFullYear() === 2026;
  const isSeptember = name.includes('septiembre') || eventDate?.getMonth() === 8;

  return is2026 && isSeptember ? BIBLE_STUDY_CAMPAIGN_2026_GUIDE : null;
};
