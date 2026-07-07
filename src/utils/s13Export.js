/**
 * Funciones de exportación para Reporte S-13
 * Registro de Asignación de Territorio
 */

import * as XLSX from 'xlsx';
import { getAssignedNames, formatTeamNames } from './territoryHelpers';

const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

const MONTH_NAMES_SHORT = [
  'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
  'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'
];

const ASSIGNMENT_STATUSES = new Set(['Asignado', 'Reasignado']);
const COMPLETION_STATUSES = new Set(['Completado', 'Completado Automáticamente']);
const S13_CYCLES_PER_ROW = 4;
const S13_ROWS_PER_PAGE = 20;

const toDate = (timestamp) => {
  if (!timestamp) return null;
  if (timestamp.toDate) return timestamp.toDate();
  if (timestamp instanceof Date) return timestamp;
  return new Date(timestamp);
};

const formatDate = (date) => {
  if (!date) return '';
  const d = toDate(date);
  if (!d || Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: '2-digit' });
};

const formatDateShort = (date) => {
  if (!date) return '-';
  const d = toDate(date);
  if (!d || Number.isNaN(d.getTime())) return '-';
  return `${d.getDate()}/${MONTH_NAMES_SHORT[d.getMonth()]}`;
};

const formatDateISO = (date) => {
  const d = toDate(date);
  if (!d || Number.isNaN(d.getTime())) return '';
  return d.toISOString().split('T')[0];
};

const calculateDays = (startDate, endDate) => {
  const start = toDate(startDate);
  const end = endDate ? toDate(endDate) : new Date();
  if (!start) return 0;
  const diffTime = Math.abs(end - start);
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

const sortTerritoriesByNumber = (territories = []) => (
  [...territories].sort((a, b) => {
    const numA = parseInt(String(a.name).replace(/\D/g, ''), 10) || 0;
    const numB = parseInt(String(b.name).replace(/\D/g, ''), 10) || 0;
    return numA - numB;
  })
);

const getAssigneeNames = (record) => {
  if (record?.assignedNames?.length) {
    return record.assignedNames.filter((name) => name && String(name).trim());
  }
  return getAssignedNames(record?.assignedTo);
};

const getAssigneeKey = (record) => getAssigneeNames(record).sort().join('|');

const formatAssigneeDisplay = (record) => formatTeamNames(getAssigneeNames(record));

const isDateInRange = (date, startDate, endDate) => {
  const value = toDate(date);
  if (!value) return false;
  return value >= startDate && value <= endDate;
};

const cycleIntersectsPeriod = (cycle, startDate, endDate) => (
  isDateInRange(cycle.assignedDate, startDate, endDate)
  || isDateInRange(cycle.completedDate, startDate, endDate)
);

/**
 * Últimos N meses calendario hasta endDate (por defecto hoy).
 */
export const getRollingMonthsRange = (months, endDate = new Date()) => {
  const end = new Date(endDate);
  end.setHours(23, 59, 59, 999);
  const start = new Date(end);
  start.setMonth(start.getMonth() - months);
  start.setHours(0, 0, 0, 0);
  return { start, end };
};

/**
 * Rango desde inputs type="date" (YYYY-MM-DD).
 */
export const getDateRangeFromInputs = (startISO, endISO) => {
  if (!startISO || !endISO) {
    throw new Error('Selecciona fecha de inicio y fin.');
  }
  const start = new Date(`${startISO}T00:00:00`);
  const end = new Date(`${endISO}T23:59:59`);
  if (start > end) {
    throw new Error('La fecha de inicio no puede ser posterior a la fecha de fin.');
  }
  return { start, end };
};

export const formatPeriodLabel = (startDate, endDate) => {
  const start = toDate(startDate);
  const end = toDate(endDate);
  if (!start || !end) return 'Período no definido';
  const opts = { day: 'numeric', month: 'short', year: 'numeric' };
  return `${start.toLocaleDateString('es-MX', opts)} – ${end.toLocaleDateString('es-MX', opts)}`;
};

export const getServiceYearLabelForDate = (dateLike = new Date()) => {
  const date = toDate(dateLike) || new Date();
  const month = date.getMonth();
  const year = date.getFullYear();
  const serviceYear = month >= 8 ? year + 1 : year;
  return `${serviceYear - 1}-${serviceYear}`;
};

/** @deprecated Mantener compatibilidad con código legado */
export const getServiceYearRange = (serviceYear) => ({
  start: new Date(serviceYear - 1, 8, 1),
  end: new Date(serviceYear, 7, 31, 23, 59, 59)
});

export const getSemesterRange = (serviceYear, semester) => {
  if (semester === 1) {
    return {
      start: new Date(serviceYear - 1, 8, 1),
      end: new Date(serviceYear, 1, 28, 23, 59, 59)
    };
  }
  return {
    start: new Date(serviceYear, 2, 1),
    end: new Date(serviceYear, 7, 31, 23, 59, 59)
  };
};

export const getCustomRange = (startMonth, startYear, endMonth, endYear) => {
  const lastDay = new Date(endYear, endMonth + 1, 0).getDate();
  return {
    start: new Date(startYear, startMonth, 1),
    end: new Date(endYear, endMonth, lastDay, 23, 59, 59)
  };
};

export const getAvailableServiceYears = () => {
  const currentDate = new Date();
  const currentMonth = currentDate.getMonth();
  const currentYear = currentDate.getFullYear();
  const currentServiceYear = currentMonth >= 8 ? currentYear + 1 : currentYear;

  const years = [];
  for (let i = 0; i < 5; i += 1) {
    const year = currentServiceYear - i;
    years.push({
      value: year,
      label: `${year - 1}-${year}`,
      description: `Sep ${year - 1} - Ago ${year}`
    });
  }
  return years;
};

export const filterHistoryByActivityRange = (history, startDate, endDate) => (
  history.filter((record) => {
    if (!record?.territoryId) return false;
    if (record.status === 'Reinicio General') return false;
    return isDateInRange(record.assignedDate, startDate, endDate)
      || isDateInRange(record.completedDate, startDate, endDate);
  })
);

/** @deprecated Usar filterHistoryByActivityRange */
export const filterHistoryByDateRange = (history, startDate, endDate) => (
  filterHistoryByActivityRange(history, startDate, endDate)
);

export const getLastCompletedBefore = (history, territoryId, startDate) => {
  const completions = history
    .filter((record) => {
      if (record.territoryId !== territoryId) return false;
      if (!COMPLETION_STATUSES.has(record.status)) return false;
      const completedDate = toDate(record.completedDate);
      return completedDate && completedDate < startDate;
    })
    .map((record) => toDate(record.completedDate))
    .sort((a, b) => b - a);

  return completions[0] || null;
};

const buildCycleFromRecords = (assignment, completion) => {
  const assignedDate = toDate(assignment?.assignedDate || completion?.assignedDate);
  const completedDate = completion ? toDate(completion.completedDate) : null;
  const source = assignment || completion;

  return {
    assignedTo: formatAssigneeDisplay(source),
    assignedDate,
    completedDate,
    days: calculateDays(assignedDate, completedDate),
    status: completedDate ? 'Completado' : 'En progreso',
    month: assignedDate ? MONTH_NAMES[assignedDate.getMonth()] : '',
    monthIndex: assignedDate ? assignedDate.getMonth() : -1
  };
};

const findMatchingCompletion = (assignment, completions, usedCompletionIds) => {
  const assignedDate = toDate(assignment.assignedDate);
  const assigneeKey = getAssigneeKey(assignment);

  return completions.find((completion) => {
    if (usedCompletionIds.has(completion.id)) return false;
    if (completion.territoryId !== assignment.territoryId) return false;

    const completionAssigneeKey = getAssigneeKey(completion);
    if (completionAssigneeKey && assigneeKey && completionAssigneeKey !== assigneeKey) {
      return false;
    }

    const completionAssignedDate = toDate(completion.assignedDate);
    const completedDate = toDate(completion.completedDate);

    if (completionAssignedDate && assignedDate) {
      const timeDiff = Math.abs(completionAssignedDate.getTime() - assignedDate.getTime());
      if (timeDiff < 24 * 60 * 60 * 1000) return true;
    }

    if (completedDate && assignedDate && completedDate >= assignedDate) {
      return true;
    }

    return false;
  }) || null;
};

/**
 * Reconstruye ciclos de asignación por territorio desde el historial completo.
 */
export const buildAssignmentCyclesForTerritory = (territoryHistory, territoryId) => {
  const records = territoryHistory
    .filter((record) => record.territoryId === territoryId)
    .filter((record) => ASSIGNMENT_STATUSES.has(record.status)
      || COMPLETION_STATUSES.has(record.status)
      || record.status === 'Devuelto')
    .sort((a, b) => {
      const dateA = toDate(a.assignedDate) || toDate(a.completedDate) || new Date(0);
      const dateB = toDate(b.assignedDate) || toDate(b.completedDate) || new Date(0);
      return dateA - dateB;
    });

  const assignmentRecords = records.filter((record) => ASSIGNMENT_STATUSES.has(record.status));
  const completionRecords = records.filter((record) => COMPLETION_STATUSES.has(record.status));
  const usedCompletionIds = new Set();
  const cycles = [];

  assignmentRecords.forEach((assignment) => {
    const completion = findMatchingCompletion(assignment, completionRecords, usedCompletionIds);
    if (completion) usedCompletionIds.add(completion.id);
    cycles.push(buildCycleFromRecords(assignment, completion));
  });

  completionRecords.forEach((completion) => {
    if (usedCompletionIds.has(completion.id)) return;

    const assignedDate = toDate(completion.assignedDate);
    const completedDate = toDate(completion.completedDate);
    const duplicate = cycles.some((cycle) => {
      if (!assignedDate || !cycle.assignedDate) return false;
      const sameDay = Math.abs(cycle.assignedDate.getTime() - assignedDate.getTime()) < 24 * 60 * 60 * 1000;
      return sameDay && cycle.assignedTo === formatAssigneeDisplay(completion);
    });

    if (!duplicate) {
      cycles.push(buildCycleFromRecords(null, completion));
    }
  });

  const seen = new Set();
  return cycles
    .filter((cycle) => {
      const key = `${cycle.assignedTo}-${cycle.assignedDate?.getTime() || 0}-${cycle.completedDate?.getTime() || 0}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((a, b) => {
      const dateA = a.assignedDate || new Date(0);
      const dateB = b.assignedDate || new Date(0);
      return dateA - dateB;
    });
};

export const buildS13Rows = (summaryByTerritory = []) => {
  const rows = [];

  summaryByTerritory.forEach((territory) => {
    const { assignments = [], territoryNumber, lastCompletedBefore, territoryId } = territory;
    const chunks = [];

    for (let i = 0; i < assignments.length; i += S13_CYCLES_PER_ROW) {
      chunks.push(assignments.slice(i, i + S13_CYCLES_PER_ROW));
    }

    if (chunks.length === 0) {
      rows.push({
        territoryId,
        territoryNumber,
        lastCompletedBefore,
        assignments: [],
        isContinuation: false,
        pageChunkIndex: 0,
        totalChunks: 1
      });
      return;
    }

    chunks.forEach((chunk, index) => {
      rows.push({
        territoryId,
        territoryNumber: index === 0 ? territoryNumber : '',
        lastCompletedBefore: index === 0 ? lastCompletedBefore : null,
        assignments: chunk,
        isContinuation: index > 0,
        pageChunkIndex: index,
        totalChunks: chunks.length
      });
    });
  });

  return rows;
};

export const groupByMonthOrdered = (detailList) => {
  const grouped = {};

  detailList.forEach((item) => {
    if (!item.assignedDate) return;
    const date = toDate(item.assignedDate);
    if (!date) return;

    const key = `${date.getFullYear()}-${String(date.getMonth()).padStart(2, '0')}`;
    if (!grouped[key]) {
      grouped[key] = {
        key,
        month: date.getMonth(),
        year: date.getFullYear(),
        monthName: MONTH_NAMES[date.getMonth()],
        assignments: [],
        stats: { total: 0, completed: 0, inProgress: 0 }
      };
    }
    grouped[key].assignments.push(item);
    grouped[key].stats.total += 1;
    if (item.status === 'Completado') {
      grouped[key].stats.completed += 1;
    } else {
      grouped[key].stats.inProgress += 1;
    }
  });

  return Object.values(grouped).sort((a, b) => {
    if (a.year !== b.year) return a.year - b.year;
    return a.month - b.month;
  });
};

export const generateS13Data = (territoryHistory, territories, startDate, endDate) => {
  const detailList = [];
  const summaryByTerritory = sortTerritoriesByNumber(territories).map((territory) => {
    const allCycles = buildAssignmentCyclesForTerritory(territoryHistory, territory.id);
    const assignments = allCycles.filter((cycle) => cycleIntersectsPeriod(cycle, startDate, endDate));
    const lastCompletedBefore = getLastCompletedBefore(territoryHistory, territory.id, startDate);
    const completedCount = assignments.filter((cycle) => cycle.status === 'Completado').length;
    const lastCompletedInPeriod = assignments
      .filter((cycle) => cycle.completedDate)
      .sort((a, b) => b.completedDate - a.completedDate)[0];

    assignments.forEach((assignment) => {
      detailList.push({
        territoryId: territory.id,
        territoryNumber: territory.name,
        ...assignment
      });
    });

    return {
      territoryId: territory.id,
      territoryNumber: territory.name,
      totalAssignments: assignments.length,
      completedCount,
      lastCompletedBefore,
      lastCompletedInPeriod: lastCompletedInPeriod?.completedDate || null,
      assignments
    };
  });

  detailList.sort((a, b) => {
    const dateA = a.assignedDate || new Date(0);
    const dateB = b.assignedDate || new Date(0);
    return dateA - dateB;
  });

  const byMonth = {};
  detailList.forEach((item) => {
    const month = item.month || 'Sin fecha';
    if (!byMonth[month]) byMonth[month] = [];
    byMonth[month].push(item);
  });

  const s13Rows = buildS13Rows(summaryByTerritory);
  const periodLabel = formatPeriodLabel(startDate, endDate);
  const serviceYearLabel = getServiceYearLabelForDate(endDate);

  return {
    detailList,
    summaryByTerritory,
    s13Rows,
    byMonth,
    period: {
      start: startDate,
      end: endDate,
      label: periodLabel,
      serviceYearLabel
    },
    stats: {
      totalTerritories: territories.length,
      territoriesWithActivity: summaryByTerritory.filter((territory) => territory.totalAssignments > 0).length,
      totalAssignments: detailList.length,
      completedAssignments: detailList.filter((assignment) => assignment.status === 'Completado').length,
      inProgressAssignments: detailList.filter((assignment) => assignment.status === 'En progreso').length
    }
  };
};

const buildExcelFileName = (period) => {
  const start = formatDateISO(period?.start) || 'inicio';
  const end = formatDateISO(period?.end) || 'fin';
  return `S-13_${start}_${end}.xlsx`;
};

export const exportS13ToExcel = (data, periodLabel) => {
  const wb = XLSX.utils.book_new();
  const label = periodLabel || data.period?.label || '';
  const serviceYearLabel = data.period?.serviceYearLabel || '';

  const summaryHeaders = [
    'Núm. Territorio',
    'Total Asignaciones',
    'Veces Completado',
    'Última Completado (antes del período)',
    'Última Completado (en el período)'
  ];

  const summaryRows = data.summaryByTerritory.map((territory) => [
    territory.territoryNumber,
    territory.totalAssignments,
    territory.completedCount,
    formatDate(territory.lastCompletedBefore),
    formatDate(territory.lastCompletedInPeriod)
  ]);

  const wsSummary = XLSX.utils.aoa_to_sheet([
    ['RESUMEN POR TERRITORIO - S-13'],
    [`Año de servicio (referencia): ${serviceYearLabel}`],
    [`Período: ${label}`],
    [],
    summaryHeaders,
    ...summaryRows
  ]);
  wsSummary['!cols'] = [{ wch: 15 }, { wch: 18 }, { wch: 16 }, { wch: 28 }, { wch: 28 }];
  XLSX.utils.book_append_sheet(wb, wsSummary, 'Resumen');

  const detailHeaders = [
    'Territorio',
    'Publicador(es)',
    'Fecha Asignado',
    'Fecha Completado',
    'Días',
    'Estado',
    'Mes'
  ];

  const detailRows = data.detailList.map((item) => [
    item.territoryNumber,
    item.assignedTo,
    formatDate(item.assignedDate),
    formatDate(item.completedDate),
    item.days,
    item.status,
    item.month
  ]);

  const wsDetail = XLSX.utils.aoa_to_sheet([
    ['DETALLE COMPLETO - S-13'],
    [`Período: ${label}`],
    [],
    detailHeaders,
    ...detailRows
  ]);
  wsDetail['!cols'] = [{ wch: 12 }, { wch: 30 }, { wch: 14 }, { wch: 14 }, { wch: 8 }, { wch: 12 }, { wch: 12 }];
  XLSX.utils.book_append_sheet(wb, wsDetail, 'Detalle completo');

  const s13Headers = [
    'Núm. de terr.',
    'Última fecha completado',
    'Asignado a (1)', 'Fecha asignado', 'Fecha completado',
    'Asignado a (2)', 'Fecha asignado', 'Fecha completado',
    'Asignado a (3)', 'Fecha asignado', 'Fecha completado',
    'Asignado a (4)', 'Fecha asignado', 'Fecha completado',
    'Continuación'
  ];

  const s13Rows = (data.s13Rows || buildS13Rows(data.summaryByTerritory)).map((row) => {
    const rowData = [row.territoryNumber, formatDate(row.lastCompletedBefore)];
    for (let i = 0; i < S13_CYCLES_PER_ROW; i += 1) {
      const assignment = row.assignments[i];
      if (assignment) {
        rowData.push(
          assignment.assignedTo,
          formatDate(assignment.assignedDate),
          formatDate(assignment.completedDate)
        );
      } else {
        rowData.push('', '', '');
      }
    }
    rowData.push(row.isContinuation ? 'Sí' : '');
    return rowData;
  });

  const wsS13 = XLSX.utils.aoa_to_sheet([
    ['REGISTRO DE ASIGNACIÓN DE TERRITORIO (S-13)'],
    [`Año de servicio (referencia): ${serviceYearLabel} | Período: ${label}`],
    [],
    s13Headers,
    ...s13Rows,
    [],
    ['*Cuando comience una nueva página, anote en esta columna la última fecha en que los territorios se completaron.']
  ]);
  XLSX.utils.book_append_sheet(wb, wsS13, 'Formato S-13');

  const fileName = buildExcelFileName(data.period);
  XLSX.writeFile(wb, fileName);
  return fileName;
};

const renderS13TableHead = () => `
  <thead>
    <tr>
      <th rowspan="2" style="width: 55px;">Núm.<br>de terr.</th>
      <th rowspan="2" style="width: 65px;">Última fecha<br>en que se<br>completó*</th>
      <th colspan="3" class="assignment-group">Asignado a</th>
      <th colspan="3" class="assignment-group">Asignado a</th>
      <th colspan="3" class="assignment-group">Asignado a</th>
      <th colspan="3" class="assignment-group">Asignado a</th>
    </tr>
    <tr>
      ${Array.from({ length: 4 }).map(() => `
        <th>Nombre</th>
        <th>Fecha<br>asignado</th>
        <th>Fecha<br>completado</th>
      `).join('')}
    </tr>
  </thead>
`;

const renderAssignmentCells = (assignments = []) => {
  let html = '';
  for (let i = 0; i < S13_CYCLES_PER_ROW; i += 1) {
    const assignment = assignments[i];
    html += `
      <td class="name">${assignment?.assignedTo || ''}</td>
      <td>${assignment ? formatDate(assignment.assignedDate) : ''}</td>
      <td>${assignment ? formatDate(assignment.completedDate) : ''}</td>
    `;
  }
  return html;
};

export const generateS13PrintHTML = (data, periodLabel) => {
  const rows = data.s13Rows || buildS13Rows(data.summaryByTerritory);
  const label = periodLabel || data.period?.label || '';
  const serviceYearLabel = data.period?.serviceYearLabel || getServiceYearLabelForDate();

  const tableSections = [];
  for (let i = 0; i < rows.length; i += S13_ROWS_PER_PAGE) {
    const chunk = rows.slice(i, i + S13_ROWS_PER_PAGE);
    const pageBreak = i > 0 ? 'page-break' : '';
    const bodyRows = chunk.map((row) => `
      <tr class="${row.isContinuation ? 'continuation-row' : ''}">
        <td class="territory-num">${row.territoryNumber || ''}</td>
        <td>${formatDate(row.lastCompletedBefore)}</td>
        ${renderAssignmentCells(row.assignments)}
      </tr>
    `).join('');

    tableSections.push(`
      <section class="print-page ${pageBreak}">
        <div class="header">
          <h1>REGISTRO DE ASIGNACIÓN DE TERRITORIO</h1>
          <p><strong>Año de servicio:</strong> ${serviceYearLabel} | <strong>Período:</strong> ${label}</p>
        </div>
        <table>
          ${renderS13TableHead()}
          <tbody>${bodyRows}</tbody>
        </table>
      </section>
    `);
  }

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>S-13 - Registro de Asignación de Territorio</title>
      <style>
        @page { size: landscape; margin: 8mm; }
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: Arial, sans-serif; font-size: 9px; padding: 8px; }
        .header { text-align: center; margin-bottom: 12px; }
        .header h1 { font-size: 14px; font-weight: bold; margin-bottom: 4px; }
        .header p { font-size: 10px; color: #444; }
        table { width: 100%; border-collapse: collapse; font-size: 8px; }
        th, td { border: 1px solid #333; padding: 3px 4px; text-align: center; vertical-align: middle; }
        th { background-color: #e8e8e8; font-weight: bold; font-size: 7px; }
        .territory-num { font-weight: bold; background-color: #f5f5f5; }
        .name { text-align: left; max-width: 90px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .assignment-group { background-color: #f0f0f0; }
        .continuation-row td { background-color: #fafafa; }
        .footer { margin-top: 8px; font-size: 7px; color: #666; }
        .page-break { page-break-before: always; }
        @media print {
          body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
        }
      </style>
    </head>
    <body>
      ${tableSections.join('')}
      <div class="footer">
        <p>*Cuando comience una nueva página, anote en esta columna la última fecha en que los territorios se completaron.</p>
        <p style="margin-top: 4px;">S-13-S — Generado el ${new Date().toLocaleDateString('es-MX')}</p>
      </div>
    </body>
    </html>
  `;
};

export const exportS13ToPDF = (data, periodLabel) => {
  const html = generateS13PrintHTML(data, periodLabel);
  const printWindow = window.open('', '_blank');
  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.onload = function onPrintLoad() {
    setTimeout(() => {
      printWindow.print();
    }, 250);
  };
};

export const exportS13ToHTMLFile = (data, periodLabel) => {
  const html = generateS13PrintHTML(data, periodLabel);
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  const start = formatDateISO(data.period?.start) || 'inicio';
  const end = formatDateISO(data.period?.end) || 'fin';
  anchor.href = url;
  anchor.download = `S-13_${start}_${end}.html`;
  anchor.click();
  URL.revokeObjectURL(url);
  return anchor.download;
};

export const generateSimpleSummary = (territoryHistory, territories, startDate, endDate) => {
  const summary = sortTerritoriesByNumber(territories).map((territory) => {
    const cycles = buildAssignmentCyclesForTerritory(territoryHistory, territory.id)
      .filter((cycle) => cycleIntersectsPeriod(cycle, startDate, endDate));

    const completions = cycles.filter((cycle) => cycle.status === 'Completado');
    let totalDays = 0;
    let countWithDays = 0;

    completions.forEach((cycle) => {
      if (cycle.assignedDate && cycle.completedDate) {
        totalDays += cycle.days;
        countWithDays += 1;
      }
    });

    const averageDays = countWithDays > 0 ? Math.round(totalDays / countWithDays) : null;
    const lastCompletedDate = completions
      .map((cycle) => cycle.completedDate)
      .filter(Boolean)
      .sort((a, b) => b - a)[0] || null;

    return {
      territoryId: territory.id,
      territoryName: territory.name,
      timesWorked: completions.length,
      averageDays,
      lastCompleted: lastCompletedDate,
      status: completions.length > 0 ? 'worked' : 'notWorked'
    };
  });

  const worked = summary.filter((item) => item.status === 'worked');
  const notWorked = summary.filter((item) => item.status === 'notWorked');
  const totalDaysAll = worked.reduce((sum, item) => sum + (item.averageDays || 0), 0);
  const countWithAvg = worked.filter((item) => item.averageDays !== null).length;

  return {
    summary,
    stats: {
      totalTerritories: summary.length,
      territoriesWorked: worked.length,
      territoriesNotWorked: notWorked.length,
      percentageWorked: summary.length > 0 ? Math.round((worked.length / summary.length) * 100) : 0,
      overallAverageDays: countWithAvg > 0 ? Math.round(totalDaysAll / countWithAvg) : null
    }
  };
};

export const exportSimpleSummaryToExcel = (simpleSummary, periodLabel) => {
  const wb = XLSX.utils.book_new();
  const headers = [
    'Territorio',
    'Veces Trabajado',
    'Promedio para Completar (días)',
    'Última vez Completado',
    'Estado'
  ];

  const rows = simpleSummary.summary.map((item) => [
    item.territoryName,
    item.timesWorked,
    item.averageDays !== null ? `${item.averageDays} días` : '-',
    item.lastCompleted ? formatDate(item.lastCompleted) : 'Sin datos',
    item.status === 'worked' ? 'Trabajado' : 'Sin trabajar'
  ]);

  const ws = XLSX.utils.aoa_to_sheet([
    ['RESUMEN DE COBERTURA DE TERRITORIOS'],
    [`Período: ${periodLabel}`],
    [],
    headers,
    ...rows,
    [],
    ['RESUMEN GENERAL'],
    [`Total de territorios: ${simpleSummary.stats.totalTerritories}`],
    [`Territorios trabajados: ${simpleSummary.stats.territoriesWorked} (${simpleSummary.stats.percentageWorked}%)`],
    [`Sin trabajar: ${simpleSummary.stats.territoriesNotWorked} territorios`],
    [`Promedio para dar la vuelta: ${simpleSummary.stats.overallAverageDays || '-'} días`]
  ]);

  ws['!cols'] = [{ wch: 15 }, { wch: 18 }, { wch: 28 }, { wch: 22 }, { wch: 15 }];
  XLSX.utils.book_append_sheet(wb, ws, 'Resumen');

  const fileName = `Resumen_Territorios_${new Date().toISOString().split('T')[0]}.xlsx`;
  XLSX.writeFile(wb, fileName);
  return fileName;
};

export const generateSimpleSummaryPrintHTML = (simpleSummary, periodLabel) => {
  const rows = simpleSummary.summary.map((item, index) => `
    <tr class="${index % 2 === 0 ? 'even' : 'odd'}">
      <td class="territory">${item.territoryName}</td>
      <td class="center">${item.timesWorked}</td>
      <td class="center">${item.averageDays !== null ? `${item.averageDays} días` : '-'}</td>
      <td class="center">${item.lastCompleted ? formatDate(item.lastCompleted) : 'Sin datos'}</td>
      <td class="center status-${item.status}">${item.status === 'worked' ? 'Trabajado' : 'Sin trabajar'}</td>
    </tr>
  `).join('');

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Resumen de Cobertura de Territorios</title>
      <style>
        @page { size: portrait; margin: 15mm; }
        body { font-family: Arial, sans-serif; font-size: 11px; color: #333; padding: 10px; }
        .header { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #2563eb; padding-bottom: 15px; }
        .header h1 { font-size: 18px; color: #1e40af; }
        table { width: 100%; border-collapse: collapse; }
        th { background-color: #2563eb; color: white; padding: 10px 8px; }
        td { padding: 8px; border-bottom: 1px solid #e5e7eb; }
        .center { text-align: center; }
        .even { background-color: #f9fafb; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>RESUMEN DE COBERTURA DE TERRITORIOS</h1>
        <p>${periodLabel}</p>
      </div>
      <table>
        <thead>
          <tr>
            <th>Territorio</th>
            <th>Veces Trabajado</th>
            <th>Promedio para Completar</th>
            <th>Última vez Completado</th>
            <th>Estado</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </body>
    </html>
  `;
};

export const exportSimpleSummaryToPDF = (simpleSummary, periodLabel) => {
  const html = generateSimpleSummaryPrintHTML(simpleSummary, periodLabel);
  const printWindow = window.open('', '_blank');
  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.onload = function onPrintLoad() {
    setTimeout(() => {
      printWindow.print();
    }, 250);
  };
};

const formatAssignedTo = (assignedTo) => {
  if (!assignedTo) return '';
  if (Array.isArray(assignedTo)) {
    return assignedTo.filter((name) => name && name.trim()).join(' y ');
  }
  return assignedTo;
};

export {
  formatDate,
  formatDateShort,
  formatAssignedTo,
  calculateDays,
  MONTH_NAMES,
  MONTH_NAMES_SHORT,
  toDate,
  S13_CYCLES_PER_ROW
};
