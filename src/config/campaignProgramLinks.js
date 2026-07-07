export const REGIONAL_ASSEMBLY_2026_PROGRAM_URL =
  'https://www.jw.org/mfs/biblioteca/programas/programa-asamblea-regional-2026/';

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
