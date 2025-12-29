/**
 * Funciones de exportación para Reporte S-13
 * Registro de Asignación de Territorio
 *
 * Estructura de año de servicio: Septiembre - Agosto
 */

import * as XLSX from 'xlsx';

// Nombres de meses en español
const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

const MONTH_NAMES_SHORT = [
  'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
  'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'
];

/**
 * Convierte un timestamp de Firebase a Date
 */
const toDate = (timestamp) => {
  if (!timestamp) return null;
  if (timestamp.toDate) return timestamp.toDate();
  if (timestamp instanceof Date) return timestamp;
  return new Date(timestamp);
};

/**
 * Formatea una fecha para mostrar en el reporte
 */
const formatDate = (date) => {
  if (!date) return '';
  const d = toDate(date);
  if (!d || isNaN(d.getTime())) return '';
  return d.toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: '2-digit' });
};

/**
 * Formatea fecha corta (día/mes)
 */
const formatDateShort = (date) => {
  if (!date) return '-';
  const d = toDate(date);
  if (!d || isNaN(d.getTime())) return '-';
  return `${d.getDate()}/${MONTH_NAMES_SHORT[d.getMonth()]}`;
};

/**
 * Normaliza assignedTo a un string legible
 */
const formatAssignedTo = (assignedTo) => {
  if (!assignedTo) return '';
  if (Array.isArray(assignedTo)) {
    return assignedTo.filter(n => n && n.trim()).join(' y ');
  }
  return assignedTo;
};

/**
 * Calcula los días entre dos fechas
 */
const calculateDays = (startDate, endDate) => {
  const start = toDate(startDate);
  const end = endDate ? toDate(endDate) : new Date();
  if (!start) return 0;
  const diffTime = Math.abs(end - start);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
};

/**
 * Genera el rango de fechas para un año de servicio
 * Año de servicio: Septiembre del año anterior - Agosto del año actual
 * Ejemplo: 2025 -> Sep 2024 - Ago 2025
 */
export const getServiceYearRange = (serviceYear) => {
  return {
    start: new Date(serviceYear - 1, 8, 1), // 1 de Septiembre del año anterior
    end: new Date(serviceYear, 7, 31, 23, 59, 59) // 31 de Agosto del año actual
  };
};

/**
 * Genera el rango de fechas para un semestre
 * Semestre 1: Sep - Feb
 * Semestre 2: Mar - Ago
 */
export const getSemesterRange = (serviceYear, semester) => {
  if (semester === 1) {
    return {
      start: new Date(serviceYear - 1, 8, 1), // 1 Sep
      end: new Date(serviceYear, 1, 28, 23, 59, 59) // 28/29 Feb (simplificado)
    };
  } else {
    return {
      start: new Date(serviceYear, 2, 1), // 1 Mar
      end: new Date(serviceYear, 7, 31, 23, 59, 59) // 31 Ago
    };
  }
};

/**
 * Genera el rango de fechas para un período personalizado
 * @param {number} startMonth - Mes de inicio (0-11)
 * @param {number} startYear - Año de inicio
 * @param {number} endMonth - Mes de fin (0-11)
 * @param {number} endYear - Año de fin
 */
export const getCustomRange = (startMonth, startYear, endMonth, endYear) => {
  // Último día del mes final
  const lastDay = new Date(endYear, endMonth + 1, 0).getDate();
  return {
    start: new Date(startYear, startMonth, 1),
    end: new Date(endYear, endMonth, lastDay, 23, 59, 59)
  };
};

/**
 * Agrupa las asignaciones por mes/año y las ordena cronológicamente
 * @param {Array} detailList - Lista de asignaciones del reporte
 * @returns {Array} Lista de meses con sus asignaciones y estadísticas
 */
export const groupByMonthOrdered = (detailList) => {
  // Agrupar por clave mes-año
  const grouped = {};

  detailList.forEach(item => {
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
    grouped[key].stats.total++;
    if (item.status === 'Completado') {
      grouped[key].stats.completed++;
    } else {
      grouped[key].stats.inProgress++;
    }
  });

  // Ordenar cronológicamente
  return Object.values(grouped).sort((a, b) => {
    if (a.year !== b.year) return a.year - b.year;
    return a.month - b.month;
  });
};

/**
 * Genera lista de años de servicio disponibles
 */
export const getAvailableServiceYears = () => {
  const currentDate = new Date();
  const currentMonth = currentDate.getMonth();
  const currentYear = currentDate.getFullYear();

  // Si estamos en Sep-Dic, el año de servicio actual es el siguiente
  // Si estamos en Ene-Ago, el año de servicio actual es el actual
  const currentServiceYear = currentMonth >= 8 ? currentYear + 1 : currentYear;

  const years = [];
  for (let i = 0; i < 5; i++) {
    const year = currentServiceYear - i;
    years.push({
      value: year,
      label: `${year - 1}-${year}`,
      description: `Sep ${year - 1} - Ago ${year}`
    });
  }
  return years;
};

/**
 * Filtra el historial por rango de fechas
 */
export const filterHistoryByDateRange = (history, startDate, endDate) => {
  return history.filter(h => {
    const assignedDate = toDate(h.assignedDate);
    if (!assignedDate) return false;
    return assignedDate >= startDate && assignedDate <= endDate;
  });
};

/**
 * Obtiene la última fecha de completación ANTES del período seleccionado
 */
export const getLastCompletedBefore = (history, territoryId, startDate) => {
  const completions = history
    .filter(h => {
      if (h.territoryId !== territoryId) return false;
      if (h.status !== 'Completado' && h.status !== 'Completado Automáticamente') return false;
      const completedDate = toDate(h.completedDate);
      return completedDate && completedDate < startDate;
    })
    .map(h => toDate(h.completedDate))
    .sort((a, b) => b - a);

  return completions[0] || null;
};

/**
 * Agrupa el historial por territorio, combinando registros de Asignado con Completado
 */
export const groupHistoryByTerritory = (history, territories) => {
  const grouped = {};

  // Inicializar con todos los territorios
  territories.forEach(t => {
    grouped[t.id] = {
      territoryId: t.id,
      territoryName: t.name,
      assignments: []
    };
  });

  // Separar registros por tipo
  const assignmentRecords = history.filter(h =>
    h.status === 'Asignado' || h.status === 'Reasignado'
  );
  const completionRecords = history.filter(h =>
    h.status === 'Completado' || h.status === 'Completado Automáticamente'
  );

  // Procesar asignaciones y buscar su completación correspondiente
  assignmentRecords.forEach(assignment => {
    if (!grouped[assignment.territoryId]) return;

    const assignedDate = toDate(assignment.assignedDate);
    const assignedTo = formatAssignedTo(assignment.assignedTo);

    // Buscar registro de completación que corresponda a esta asignación
    const matchingCompletion = completionRecords.find(c => {
      if (c.territoryId !== assignment.territoryId) return false;

      const completionAssignedDate = toDate(c.assignedDate);
      const completedDate = toDate(c.completedDate);

      if (completionAssignedDate && assignedDate) {
        const timeDiff = Math.abs(completionAssignedDate.getTime() - assignedDate.getTime());
        const dayInMs = 24 * 60 * 60 * 1000;
        if (timeDiff < dayInMs) return true;
      }

      if (completedDate && assignedDate && completedDate >= assignedDate) {
        const completionAssignedTo = formatAssignedTo(c.assignedTo);
        if (completionAssignedTo === assignedTo) return true;
      }

      return false;
    });

    const completedDate = matchingCompletion ? toDate(matchingCompletion.completedDate) : null;

    grouped[assignment.territoryId].assignments.push({
      assignedTo,
      assignedDate,
      completedDate,
      days: calculateDays(assignedDate, completedDate),
      status: completedDate ? 'Completado' : 'En progreso',
      month: assignedDate ? MONTH_NAMES[assignedDate.getMonth()] : '',
      monthIndex: assignedDate ? assignedDate.getMonth() : -1
    });
  });

  // También procesar completaciones con su propia fecha de asignación
  completionRecords.forEach(completion => {
    if (!grouped[completion.territoryId]) return;

    const completedDate = toDate(completion.completedDate);
    const assignedDate = toDate(completion.assignedDate);
    const assignedTo = formatAssignedTo(completion.assignedTo);

    const existingAssignment = grouped[completion.territoryId].assignments.find(a => {
      if (!a.assignedDate || !assignedDate) return false;
      const timeDiff = Math.abs(a.assignedDate.getTime() - assignedDate.getTime());
      const dayInMs = 24 * 60 * 60 * 1000;
      return timeDiff < dayInMs && a.assignedTo === assignedTo;
    });

    if (!existingAssignment && assignedDate) {
      grouped[completion.territoryId].assignments.push({
        assignedTo,
        assignedDate,
        completedDate,
        days: calculateDays(assignedDate, completedDate),
        status: 'Completado',
        month: MONTH_NAMES[assignedDate.getMonth()],
        monthIndex: assignedDate.getMonth()
      });
    }
  });

  // Ordenar y eliminar duplicados
  Object.values(grouped).forEach(territory => {
    const seen = new Set();
    territory.assignments = territory.assignments.filter(a => {
      const key = `${a.assignedTo}-${a.assignedDate?.getTime() || 0}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    territory.assignments.sort((a, b) => {
      const dateA = a.assignedDate || new Date(0);
      const dateB = b.assignedDate || new Date(0);
      return dateA - dateB;
    });
  });

  return grouped;
};

/**
 * Genera los datos para el reporte S-13 con la nueva estructura
 */
export const generateS13Data = (territoryHistory, territories, startDate, endDate) => {
  const filteredHistory = filterHistoryByDateRange(territoryHistory, startDate, endDate);
  const grouped = groupHistoryByTerritory(filteredHistory, territories);

  // Crear lista plana de todas las asignaciones para vista de detalle
  const detailList = [];

  territories
    .sort((a, b) => {
      const numA = parseInt(a.name.replace(/\D/g, '')) || 0;
      const numB = parseInt(b.name.replace(/\D/g, '')) || 0;
      return numA - numB;
    })
    .forEach(territory => {
      const assignments = grouped[territory.id]?.assignments || [];
      assignments.forEach(assignment => {
        detailList.push({
          territoryId: territory.id,
          territoryNumber: territory.name,
          ...assignment
        });
      });
    });

  // Ordenar por fecha de asignación
  detailList.sort((a, b) => {
    const dateA = a.assignedDate || new Date(0);
    const dateB = b.assignedDate || new Date(0);
    return dateA - dateB;
  });

  // Crear resumen por territorio
  const summaryByTerritory = territories
    .sort((a, b) => {
      const numA = parseInt(a.name.replace(/\D/g, '')) || 0;
      const numB = parseInt(b.name.replace(/\D/g, '')) || 0;
      return numA - numB;
    })
    .map(territory => {
      const lastCompleted = getLastCompletedBefore(territoryHistory, territory.id, startDate);
      const assignments = grouped[territory.id]?.assignments || [];
      const completedCount = assignments.filter(a => a.status === 'Completado').length;
      const lastCompletedInPeriod = assignments
        .filter(a => a.completedDate)
        .sort((a, b) => b.completedDate - a.completedDate)[0];

      return {
        territoryId: territory.id,
        territoryNumber: territory.name,
        totalAssignments: assignments.length,
        completedCount,
        lastCompletedBefore: lastCompleted,
        lastCompletedInPeriod: lastCompletedInPeriod?.completedDate || null,
        assignments: assignments.slice(0, 4) // Para formato S-13 oficial (máx 4 columnas)
      };
    });

  // Agrupar por mes para vista de detalle
  const byMonth = {};
  detailList.forEach(item => {
    const month = item.month || 'Sin fecha';
    if (!byMonth[month]) {
      byMonth[month] = [];
    }
    byMonth[month].push(item);
  });

  return {
    detailList,
    summaryByTerritory,
    byMonth,
    stats: {
      totalTerritories: territories.length,
      territoriesWithActivity: summaryByTerritory.filter(t => t.totalAssignments > 0).length,
      totalAssignments: detailList.length,
      completedAssignments: detailList.filter(a => a.status === 'Completado').length,
      inProgressAssignments: detailList.filter(a => a.status === 'En progreso').length
    }
  };
};

/**
 * Exporta el reporte S-13 a Excel con 3 hojas
 */
export const exportS13ToExcel = (data, serviceYear, periodLabel) => {
  const wb = XLSX.utils.book_new();

  // ═══════════════════════════════════════════════════════════
  // HOJA 1: Resumen por Territorio
  // ═══════════════════════════════════════════════════════════
  const summaryHeaders = [
    'Núm. Territorio',
    'Total Asignaciones',
    'Veces Completado',
    'Última Completado (antes del período)',
    'Última Completado (en el período)'
  ];

  const summaryRows = data.summaryByTerritory.map(t => [
    t.territoryNumber,
    t.totalAssignments,
    t.completedCount,
    formatDate(t.lastCompletedBefore),
    formatDate(t.lastCompletedInPeriod)
  ]);

  const summaryData = [
    [`RESUMEN POR TERRITORIO - Año de servicio: ${serviceYear - 1}-${serviceYear}`],
    [`Período: ${periodLabel}`],
    [],
    summaryHeaders,
    ...summaryRows
  ];

  const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
  wsSummary['!cols'] = [
    { wch: 15 }, { wch: 18 }, { wch: 16 }, { wch: 28 }, { wch: 28 }
  ];
  XLSX.utils.book_append_sheet(wb, wsSummary, 'Resumen');

  // ═══════════════════════════════════════════════════════════
  // HOJA 2: Detalle por Mes
  // ═══════════════════════════════════════════════════════════
  const detailHeaders = [
    'Mes',
    'Territorio',
    'Publicador',
    'Fecha Asignado',
    'Fecha Completado',
    'Días',
    'Estado'
  ];

  const detailRows = data.detailList.map(item => [
    item.month,
    item.territoryNumber,
    item.assignedTo,
    formatDate(item.assignedDate),
    formatDate(item.completedDate),
    item.days,
    item.status
  ]);

  const detailData = [
    [`DETALLE POR MES - Año de servicio: ${serviceYear - 1}-${serviceYear}`],
    [`Período: ${periodLabel}`],
    [],
    detailHeaders,
    ...detailRows
  ];

  const wsDetail = XLSX.utils.aoa_to_sheet(detailData);
  wsDetail['!cols'] = [
    { wch: 12 }, { wch: 12 }, { wch: 25 }, { wch: 14 }, { wch: 14 }, { wch: 8 }, { wch: 12 }
  ];
  XLSX.utils.book_append_sheet(wb, wsDetail, 'Detalle por Mes');

  // ═══════════════════════════════════════════════════════════
  // HOJA 3: Formato S-13 Oficial
  // ═══════════════════════════════════════════════════════════
  const s13Headers = [
    'Núm. de terr.',
    'Última fecha completado',
    'Asignado a (1)', 'Fecha asignado', 'Fecha completado',
    'Asignado a (2)', 'Fecha asignado', 'Fecha completado',
    'Asignado a (3)', 'Fecha asignado', 'Fecha completado',
    'Asignado a (4)', 'Fecha asignado', 'Fecha completado'
  ];

  const s13Rows = data.summaryByTerritory.map(row => {
    const rowData = [
      row.territoryNumber,
      formatDate(row.lastCompletedBefore)
    ];

    for (let i = 0; i < 4; i++) {
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

    return rowData;
  });

  const s13Data = [
    [`REGISTRO DE ASIGNACIÓN DE TERRITORIO (S-13)`],
    [`Año de servicio: ${serviceYear - 1}-${serviceYear} | Período: ${periodLabel}`],
    [],
    s13Headers,
    ...s13Rows,
    [],
    ['*Cuando comience una nueva página, anote en esta columna la última fecha en que los territorios se completaron.']
  ];

  const wsS13 = XLSX.utils.aoa_to_sheet(s13Data);
  wsS13['!cols'] = [
    { wch: 12 }, { wch: 18 },
    { wch: 20 }, { wch: 12 }, { wch: 12 },
    { wch: 20 }, { wch: 12 }, { wch: 12 },
    { wch: 20 }, { wch: 12 }, { wch: 12 },
    { wch: 20 }, { wch: 12 }, { wch: 12 }
  ];
  XLSX.utils.book_append_sheet(wb, wsS13, 'Formato S-13');

  // Guardar archivo
  const fileName = `S-13_Registro_Territorio_${serviceYear - 1}-${serviceYear}.xlsx`;
  XLSX.writeFile(wb, fileName);

  return fileName;
};

/**
 * Genera HTML para impresión del reporte S-13
 */
export const generateS13PrintHTML = (data, serviceYear, periodLabel) => {
  const assignmentColumns = (assignments) => {
    let html = '';
    for (let i = 0; i < 4; i++) {
      const a = assignments[i];
      html += `
        <td class="name">${a?.assignedTo || ''}</td>
        <td>${a ? formatDate(a.assignedDate) : ''}</td>
        <td>${a ? formatDate(a.completedDate) : ''}</td>
      `;
    }
    return html;
  };

  const rows = data.summaryByTerritory.map(row => `
    <tr>
      <td class="territory-num">${row.territoryNumber}</td>
      <td>${formatDate(row.lastCompletedBefore)}</td>
      ${assignmentColumns(row.assignments)}
    </tr>
  `).join('');

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>S-13 - Registro de Asignación de Territorio ${serviceYear - 1}-${serviceYear}</title>
      <style>
        @page {
          size: landscape;
          margin: 8mm;
        }

        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }

        body {
          font-family: Arial, sans-serif;
          font-size: 9px;
          padding: 8px;
        }

        .header {
          text-align: center;
          margin-bottom: 12px;
        }

        .header h1 {
          font-size: 14px;
          font-weight: bold;
          margin-bottom: 4px;
        }

        .header p {
          font-size: 10px;
          color: #444;
        }

        table {
          width: 100%;
          border-collapse: collapse;
          font-size: 8px;
        }

        th, td {
          border: 1px solid #333;
          padding: 3px 4px;
          text-align: center;
          vertical-align: middle;
        }

        th {
          background-color: #e8e8e8;
          font-weight: bold;
          font-size: 7px;
        }

        .territory-num {
          font-weight: bold;
          background-color: #f5f5f5;
        }

        .name {
          text-align: left;
          max-width: 90px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .assignment-group {
          background-color: #f0f0f0;
        }

        .footer {
          margin-top: 8px;
          font-size: 7px;
          color: #666;
        }

        @media print {
          body {
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>REGISTRO DE ASIGNACIÓN DE TERRITORIO</h1>
        <p><strong>Año de servicio:</strong> ${serviceYear - 1}-${serviceYear} | <strong>Período:</strong> ${periodLabel}</p>
      </div>

      <table>
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
            <th>Nombre</th>
            <th>Fecha<br>asignado</th>
            <th>Fecha<br>completado</th>
            <th>Nombre</th>
            <th>Fecha<br>asignado</th>
            <th>Fecha<br>completado</th>
            <th>Nombre</th>
            <th>Fecha<br>asignado</th>
            <th>Fecha<br>completado</th>
            <th>Nombre</th>
            <th>Fecha<br>asignado</th>
            <th>Fecha<br>completado</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>

      <div class="footer">
        <p>*Cuando comience una nueva página, anote en esta columna la última fecha en que los territorios se completaron.</p>
        <p style="margin-top: 4px;">S-13-S — Generado el ${new Date().toLocaleDateString('es-MX')}</p>
      </div>
    </body>
    </html>
  `;
};

/**
 * Exporta el reporte S-13 a PDF usando window.print()
 */
export const exportS13ToPDF = (data, serviceYear, periodLabel) => {
  const html = generateS13PrintHTML(data, serviceYear, periodLabel);

  const printWindow = window.open('', '_blank');
  printWindow.document.write(html);
  printWindow.document.close();

  printWindow.onload = function() {
    setTimeout(() => {
      printWindow.print();
    }, 250);
  };
};

// ═══════════════════════════════════════════════════════════════════════════
// REPORTE SIMPLE DE COBERTURA DE TERRITORIOS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Genera un resumen simple y fácil de entender por territorio
 * @param {Array} territoryHistory - Historial completo de territorios
 * @param {Array} territories - Lista de todos los territorios
 * @param {Date} startDate - Fecha de inicio del período
 * @param {Date} endDate - Fecha de fin del período
 */
export const generateSimpleSummary = (territoryHistory, territories, startDate, endDate) => {
  const summary = [];

  // Procesar cada territorio
  territories
    .sort((a, b) => {
      const numA = parseInt(a.name.replace(/\D/g, '')) || 0;
      const numB = parseInt(b.name.replace(/\D/g, '')) || 0;
      return numA - numB;
    })
    .forEach(territory => {
      // Filtrar historial de este territorio en el período
      const territoryRecords = territoryHistory.filter(h => {
        if (h.territoryId !== territory.id) return false;
        const date = toDate(h.assignedDate) || toDate(h.completedDate);
        if (!date) return false;
        return date >= startDate && date <= endDate;
      });

      // Contar veces completado
      const completions = territoryRecords.filter(h =>
        h.status === 'Completado' || h.status === 'Completado Automáticamente'
      );

      // Calcular promedio de días para completar
      let totalDays = 0;
      let countWithDays = 0;
      completions.forEach(c => {
        const assignedDate = toDate(c.assignedDate);
        const completedDate = toDate(c.completedDate);
        if (assignedDate && completedDate) {
          const days = calculateDays(assignedDate, completedDate);
          totalDays += days;
          countWithDays++;
        }
      });
      const averageDays = countWithDays > 0 ? Math.round(totalDays / countWithDays) : null;

      // Última fecha completado
      const lastCompletion = completions
        .filter(c => toDate(c.completedDate))
        .sort((a, b) => toDate(b.completedDate) - toDate(a.completedDate))[0];
      const lastCompletedDate = lastCompletion ? toDate(lastCompletion.completedDate) : null;

      summary.push({
        territoryId: territory.id,
        territoryName: territory.name,
        timesWorked: completions.length,
        averageDays: averageDays,
        lastCompleted: lastCompletedDate,
        status: completions.length > 0 ? 'worked' : 'notWorked'
      });
    });

  // Calcular estadísticas generales
  const worked = summary.filter(s => s.status === 'worked');
  const notWorked = summary.filter(s => s.status === 'notWorked');
  const totalDaysAll = worked.reduce((sum, s) => sum + (s.averageDays || 0), 0);
  const countWithAvg = worked.filter(s => s.averageDays !== null).length;

  const stats = {
    totalTerritories: summary.length,
    territoriesWorked: worked.length,
    territoriesNotWorked: notWorked.length,
    percentageWorked: summary.length > 0 ? Math.round((worked.length / summary.length) * 100) : 0,
    overallAverageDays: countWithAvg > 0 ? Math.round(totalDaysAll / countWithAvg) : null
  };

  return { summary, stats };
};

/**
 * Exporta el resumen simple a Excel
 */
export const exportSimpleSummaryToExcel = (simpleSummary, periodLabel) => {
  const wb = XLSX.utils.book_new();

  // Preparar datos
  const headers = [
    'Territorio',
    'Veces Trabajado',
    'Promedio para Completar (días)',
    'Última vez Completado',
    'Estado'
  ];

  const rows = simpleSummary.summary.map(item => [
    item.territoryName,
    item.timesWorked,
    item.averageDays !== null ? `${item.averageDays} días` : '-',
    item.lastCompleted ? formatDate(item.lastCompleted) : 'Sin datos',
    item.status === 'worked' ? 'Trabajado' : 'Sin trabajar'
  ]);

  // Crear hoja con título y estadísticas
  const sheetData = [
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
  ];

  const ws = XLSX.utils.aoa_to_sheet(sheetData);

  // Ajustar anchos de columna
  ws['!cols'] = [
    { wch: 15 },  // Territorio
    { wch: 18 },  // Veces Trabajado
    { wch: 28 },  // Promedio
    { wch: 22 },  // Última vez
    { wch: 15 }   // Estado
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'Resumen');

  // Guardar archivo
  const fileName = `Resumen_Territorios_${new Date().toISOString().split('T')[0]}.xlsx`;
  XLSX.writeFile(wb, fileName);

  return fileName;
};

/**
 * Genera HTML para el PDF del resumen simple
 */
export const generateSimpleSummaryPrintHTML = (simpleSummary, periodLabel) => {
  const rows = simpleSummary.summary.map((item, index) => `
    <tr class="${index % 2 === 0 ? 'even' : 'odd'}">
      <td class="territory">${item.territoryName}</td>
      <td class="center">${item.timesWorked}</td>
      <td class="center">${item.averageDays !== null ? `${item.averageDays} días` : '-'}</td>
      <td class="center">${item.lastCompleted ? formatDate(item.lastCompleted) : 'Sin datos'}</td>
      <td class="center status-${item.status}">${item.status === 'worked' ? '✓ Trabajado' : '⚠ Sin trabajar'}</td>
    </tr>
  `).join('');

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Resumen de Cobertura de Territorios</title>
      <style>
        @page {
          size: portrait;
          margin: 15mm;
        }

        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }

        body {
          font-family: 'Segoe UI', Arial, sans-serif;
          font-size: 11px;
          color: #333;
          padding: 10px;
        }

        .header {
          text-align: center;
          margin-bottom: 20px;
          padding-bottom: 15px;
          border-bottom: 2px solid #2563eb;
        }

        .header h1 {
          font-size: 18px;
          font-weight: bold;
          color: #1e40af;
          margin-bottom: 5px;
        }

        .header .period {
          font-size: 12px;
          color: #666;
        }

        table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 20px;
        }

        th {
          background-color: #2563eb;
          color: white;
          padding: 10px 8px;
          text-align: center;
          font-weight: bold;
          font-size: 10px;
        }

        td {
          padding: 8px;
          border-bottom: 1px solid #e5e7eb;
        }

        .territory {
          font-weight: bold;
          color: #1f2937;
        }

        .center {
          text-align: center;
        }

        .even {
          background-color: #f9fafb;
        }

        .odd {
          background-color: white;
        }

        .status-worked {
          color: #059669;
          font-weight: bold;
        }

        .status-notWorked {
          color: #dc2626;
          font-weight: bold;
        }

        .stats-box {
          background-color: #f0f9ff;
          border: 1px solid #bae6fd;
          border-radius: 8px;
          padding: 15px;
          margin-top: 15px;
        }

        .stats-box h2 {
          font-size: 14px;
          color: #0369a1;
          margin-bottom: 10px;
          border-bottom: 1px solid #bae6fd;
          padding-bottom: 5px;
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 10px;
        }

        .stat-item {
          font-size: 11px;
        }

        .stat-item strong {
          color: #0369a1;
        }

        .footer {
          text-align: center;
          margin-top: 20px;
          font-size: 9px;
          color: #9ca3af;
        }

        @media print {
          body {
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>📊 RESUMEN DE COBERTURA DE TERRITORIOS</h1>
        <p class="period">${periodLabel}</p>
      </div>

      <table>
        <thead>
          <tr>
            <th style="width: 15%;">Territorio</th>
            <th style="width: 18%;">Veces Trabajado</th>
            <th style="width: 25%;">Promedio para Completar</th>
            <th style="width: 22%;">Última vez Completado</th>
            <th style="width: 20%;">Estado</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>

      <div class="stats-box">
        <h2>📈 RESUMEN GENERAL</h2>
        <div class="stats-grid">
          <div class="stat-item"><strong>Total de territorios:</strong> ${simpleSummary.stats.totalTerritories}</div>
          <div class="stat-item"><strong>Territorios trabajados:</strong> ${simpleSummary.stats.territoriesWorked} (${simpleSummary.stats.percentageWorked}%)</div>
          <div class="stat-item"><strong>Sin trabajar:</strong> ${simpleSummary.stats.territoriesNotWorked} territorios</div>
          <div class="stat-item"><strong>Promedio para dar la vuelta:</strong> ${simpleSummary.stats.overallAverageDays || '-'} días</div>
        </div>
      </div>

      <div class="footer">
        Generado el ${new Date().toLocaleDateString('es-MX', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
      </div>
    </body>
    </html>
  `;
};

/**
 * Exporta el resumen simple a PDF
 */
export const exportSimpleSummaryToPDF = (simpleSummary, periodLabel) => {
  const html = generateSimpleSummaryPrintHTML(simpleSummary, periodLabel);

  const printWindow = window.open('', '_blank');
  printWindow.document.write(html);
  printWindow.document.close();

  printWindow.onload = function() {
    setTimeout(() => {
      printWindow.print();
    }, 250);
  };
};

// Exportar utilidades adicionales
export { formatDate, formatDateShort, formatAssignedTo, calculateDays, MONTH_NAMES, MONTH_NAMES_SHORT, toDate };
