import React, { useState, useMemo } from 'react';
import Modal from '../common/Modal';
import Icon from '../common/Icon';
import { useApp } from '../../context/AppContext';
import { useToast } from '../../hooks/useToast';
import S13OfficialTable from '../reports/S13OfficialTable';
import {
  generateS13Data,
  exportS13ToExcel,
  exportS13ToPDF,
  exportS13ToHTMLFile,
  getRollingMonthsRange,
  getDateRangeFromInputs,
  formatPeriodLabel,
  groupByMonthOrdered,
  generateSimpleSummary,
  exportSimpleSummaryToExcel,
  exportSimpleSummaryToPDF,
  formatDateShort
} from '../../utils/s13Export';

/**
 * Formatea una fecha para mostrar en la tabla
 */
const formatDate = (date) => {
  if (!date) return '-';
  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d.getTime())) return '-';
  return d.toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: '2-digit' });
};

/**
 * Opciones de período disponibles
 */
const PERIOD_OPTIONS = [
  { value: 'months3', label: '3 meses', months: 3 },
  { value: 'months6', label: '6 meses', months: 6 },
  { value: 'months12', label: '12 meses', months: 12 },
  { value: 'custom', label: 'Personalizado', months: null }
];

const toInputDateValue = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Tabs disponibles para la vista
 */
const VIEW_TABS = [
  { id: 'summary', label: 'Resumen', icon: 'fas fa-chart-pie' },
  { id: 'detail', label: 'Detalle', icon: 'fas fa-list' },
  { id: 'byMonth', label: 'Por Mes', icon: 'fas fa-calendar-alt' },
  { id: 's13', label: 'Vista previa S-13', icon: 'fas fa-file-alt' }
];

const S13ReportModal = ({ isOpen, onClose, modalId = 's13-report-modal' }) => {
  const { territories, territoryHistory = [] } = useApp();
  const { showToast } = useToast();

  const today = useMemo(() => new Date(), []);
  const defaultRange = useMemo(() => getRollingMonthsRange(12, today), [today]);

  const [selectedPeriod, setSelectedPeriod] = useState('months12');
  const [activeTab, setActiveTab] = useState('summary');
  const [customStartDate, setCustomStartDate] = useState(toInputDateValue(defaultRange.start));
  const [customEndDate, setCustomEndDate] = useState(toInputDateValue(defaultRange.end));
  const [rangeError, setRangeError] = useState(null);

  // Estados para meses expandidos en vista "Por Mes"
  const [expandedMonths, setExpandedMonths] = useState({});

  // Calcular rango de fechas basado en selección
  const dateRange = useMemo(() => {
    try {
      if (selectedPeriod === 'custom') {
        return getDateRangeFromInputs(customStartDate, customEndDate);
      }
      const option = PERIOD_OPTIONS.find((entry) => entry.value === selectedPeriod);
      return getRollingMonthsRange(option?.months || 12, today);
    } catch (error) {
      return null;
    }
  }, [selectedPeriod, customStartDate, customEndDate, today]);

  // Generar datos del reporte
  const reportData = useMemo(() => {
    if (!territories || !territoryHistory || !dateRange) {
      return { detailList: [], summaryByTerritory: [], s13Rows: [], byMonth: {}, stats: {}, period: null };
    }
    return generateS13Data(territoryHistory, territories, dateRange.start, dateRange.end);
  }, [territories, territoryHistory, dateRange]);

  const periodLabel = reportData.period?.label
    || (dateRange ? formatPeriodLabel(dateRange.start, dateRange.end) : 'Período no válido');

  // Datos agrupados por mes para la vista "Por Mes"
  const monthlyData = useMemo(() => {
    return groupByMonthOrdered(reportData.detailList);
  }, [reportData.detailList]);

  // Resumen simple para la vista principal
  const simpleSummary = useMemo(() => {
    if (!territories || !territoryHistory || !dateRange) {
      return { summary: [], stats: {} };
    }
    return generateSimpleSummary(territoryHistory, territories, dateRange.start, dateRange.end);
  }, [territories, territoryHistory, dateRange]);

  const validateCustomRange = () => {
    if (selectedPeriod !== 'custom') {
      setRangeError(null);
      return true;
    }
    try {
      getDateRangeFromInputs(customStartDate, customEndDate);
      setRangeError(null);
      return true;
    } catch (error) {
      setRangeError(error.message);
      return false;
    }
  };

  // Toggle para expandir/colapsar un mes
  const toggleMonth = (monthKey) => {
    setExpandedMonths(prev => ({
      ...prev,
      [monthKey]: !prev[monthKey]
    }));
  };

  // Expandir o colapsar todos los meses
  const toggleAllMonths = (expand) => {
    const newState = {};
    monthlyData.forEach(m => {
      newState[m.key] = expand;
    });
    setExpandedMonths(newState);
  };

  // Handlers de exportación para vista actual
  const handleExportExcel = () => {
    if (!validateCustomRange() || !dateRange) {
      showToast(rangeError || 'Selecciona un período válido.', 'error');
      return;
    }
    try {
      if (activeTab === 'summary') {
        const fileName = exportSimpleSummaryToExcel(simpleSummary, periodLabel);
        showToast(`Resumen exportado: ${fileName}`, 'success');
      } else {
        const fileName = exportS13ToExcel(reportData, periodLabel);
        showToast(`Archivo Excel generado: ${fileName}`, 'success');
      }
    } catch (error) {
      console.error('Error exportando a Excel:', error);
      showToast('Error al generar archivo Excel', 'error');
    }
  };

  const handleExportPDF = () => {
    if (!validateCustomRange() || !dateRange) {
      showToast(rangeError || 'Selecciona un período válido.', 'error');
      return;
    }
    try {
      if (activeTab === 'summary') {
        exportSimpleSummaryToPDF(simpleSummary, periodLabel);
        showToast('Generando PDF del resumen...', 'success');
      } else {
        exportS13ToPDF(reportData, periodLabel);
        showToast('Generando PDF para impresión...', 'success');
      }
    } catch (error) {
      console.error('Error exportando a PDF:', error);
      showToast('Error al generar PDF', 'error');
    }
  };

  const handleExportHTML = () => {
    if (!validateCustomRange() || !dateRange) {
      showToast(rangeError || 'Selecciona un período válido.', 'error');
      return;
    }
    try {
      const fileName = exportS13ToHTMLFile(reportData, periodLabel);
      showToast(`HTML generado: ${fileName}`, 'success');
    } catch (error) {
      console.error('Error exportando a HTML:', error);
      showToast('Error al generar archivo HTML', 'error');
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="" size="full" modalId={modalId}>
      <div className="h-full flex flex-col bg-gradient-to-br from-slate-50 via-white to-blue-50">
        {/* Header */}
        <div className="shadow-xl px-4 py-4 flex-shrink-0" style={{ backgroundColor: '#1e3a5f' }}>
          {/* Título y botón cerrar */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center backdrop-blur-sm">
                <i className="fas fa-file-alt text-lg text-white"></i>
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">Registro de Asignación de Territorio</h2>
                <p className="text-white/70 text-sm">Formulario S-13</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 transition-all"
            >
              <Icon name="x" size={20} className="text-white" />
            </button>
          </div>

          {/* Selectores de período */}
          <div className="mb-3 flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-sm text-white/70">Período:</span>
              <div className="flex overflow-hidden rounded-lg border border-white/20">
                {PERIOD_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => {
                      setSelectedPeriod(option.value);
                      setRangeError(null);
                    }}
                    className={`px-3 py-2 text-sm font-medium transition-all ${
                      selectedPeriod === option.value
                        ? 'bg-white text-gray-800'
                        : 'bg-white/10 text-white hover:bg-white/20'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
            {dateRange ? (
              <span className="rounded-lg bg-white/10 px-3 py-2 text-sm text-white/90">
                {periodLabel}
              </span>
            ) : null}
          </div>

          {selectedPeriod === 'custom' ? (
            <div className="mb-3 flex flex-wrap items-center gap-3 rounded-lg border border-white/10 bg-white/5 p-3">
              <div className="flex items-center gap-2">
                <span className="text-sm text-white/70">Desde:</span>
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(event) => {
                    setCustomStartDate(event.target.value);
                    setRangeError(null);
                  }}
                  className="rounded-lg border border-white/20 bg-white/10 px-2 py-1.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-white/30"
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-white/70">Hasta:</span>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(event) => {
                    setCustomEndDate(event.target.value);
                    setRangeError(null);
                  }}
                  className="rounded-lg border border-white/20 bg-white/10 px-2 py-1.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-white/30"
                />
              </div>
              {rangeError ? (
                <span className="text-sm text-red-200">{rangeError}</span>
              ) : null}
            </div>
          ) : null}

          {/* Estadísticas y botones de exportación */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            {/* Estadísticas */}
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-1.5 text-white/80">
                <i className="fas fa-map text-xs"></i>
                <span>{reportData.stats.territoriesWithActivity || 0}/{reportData.stats.totalTerritories || 0} territorios</span>
              </div>
              <div className="flex items-center gap-1.5 text-white/80">
                <i className="fas fa-clipboard-list text-xs"></i>
                <span>{reportData.stats.totalAssignments || 0} asignaciones</span>
              </div>
              <div className="flex items-center gap-1.5 text-green-300">
                <i className="fas fa-check-circle text-xs"></i>
                <span>{reportData.stats.completedAssignments || 0} completados</span>
              </div>
              <div className="flex items-center gap-1.5 text-yellow-300">
                <i className="fas fa-clock text-xs"></i>
                <span>{reportData.stats.inProgressAssignments || 0} en progreso</span>
              </div>
            </div>

            {/* Botones de exportación */}
            <div className="flex items-center gap-2">
              {activeTab !== 'summary' ? (
                <button
                  type="button"
                  onClick={handleExportHTML}
                  className="flex items-center gap-2 rounded-xl bg-sky-500/90 px-4 py-2 text-sm font-medium text-white shadow-lg transition-all hover:scale-105 hover:bg-sky-600"
                >
                  <i className="fas fa-code"></i>
                  <span>HTML</span>
                </button>
              ) : null}
              <button
                type="button"
                onClick={handleExportPDF}
                className="flex items-center gap-2 rounded-xl bg-red-500/90 px-4 py-2 text-sm font-medium text-white shadow-lg transition-all hover:scale-105 hover:bg-red-600"
              >
                <i className="fas fa-file-pdf"></i>
                <span>PDF</span>
              </button>
              <button
                type="button"
                onClick={handleExportExcel}
                className="flex items-center gap-2 rounded-xl bg-green-500/90 px-4 py-2 text-sm font-medium text-white shadow-lg transition-all hover:scale-105 hover:bg-green-600"
              >
                <i className="fas fa-file-excel"></i>
                <span>Excel</span>
              </button>
            </div>
          </div>
        </div>

        {/* Tabs de vista */}
        <div className="flex border-b border-gray-200 bg-white px-4">
          {VIEW_TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-all ${
                activeTab === tab.id
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <i className={tab.icon}></i>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Contenido */}
        <div className="flex-1 overflow-auto p-4">
          {/* Vista de Resumen Simple */}
          {activeTab === 'summary' && (
            <div className="space-y-4">
              {/* Estadísticas generales - Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-white rounded-xl shadow-md border border-gray-200 p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                      <i className="fas fa-map text-blue-600"></i>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-gray-800">{simpleSummary.stats.totalTerritories || 0}</p>
                      <p className="text-xs text-gray-500">Total territorios</p>
                    </div>
                  </div>
                </div>
                <div className="bg-white rounded-xl shadow-md border border-gray-200 p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                      <i className="fas fa-check-circle text-green-600"></i>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-green-600">{simpleSummary.stats.territoriesWorked || 0}</p>
                      <p className="text-xs text-gray-500">Trabajados ({simpleSummary.stats.percentageWorked || 0}%)</p>
                    </div>
                  </div>
                </div>
                <div className="bg-white rounded-xl shadow-md border border-gray-200 p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
                      <i className="fas fa-exclamation-triangle text-yellow-600"></i>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-yellow-600">{simpleSummary.stats.territoriesNotWorked || 0}</p>
                      <p className="text-xs text-gray-500">Sin trabajar</p>
                    </div>
                  </div>
                </div>
                <div className="bg-white rounded-xl shadow-md border border-gray-200 p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                      <i className="fas fa-clock text-purple-600"></i>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-purple-600">{simpleSummary.stats.overallAverageDays || '-'}</p>
                      <p className="text-xs text-gray-500">Días promedio</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Tabla de resumen simple */}
              <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
                <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-4 py-3">
                  <h3 className="text-white font-bold flex items-center gap-2">
                    <i className="fas fa-chart-bar"></i>
                    Resumen de Cobertura de Territorios
                  </h3>
                  <p className="text-white/70 text-sm">{periodLabel}</p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="border-b border-gray-200 px-4 py-3 text-left font-semibold text-gray-700">
                          Territorio
                        </th>
                        <th className="border-b border-gray-200 px-4 py-3 text-center font-semibold text-gray-700">
                          Veces Trabajado
                        </th>
                        <th className="border-b border-gray-200 px-4 py-3 text-center font-semibold text-gray-700">
                          Promedio para Completar
                        </th>
                        <th className="border-b border-gray-200 px-4 py-3 text-center font-semibold text-gray-700">
                          Última vez Completado
                        </th>
                        <th className="border-b border-gray-200 px-4 py-3 text-center font-semibold text-gray-700">
                          Estado
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {simpleSummary.summary.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="px-4 py-12 text-center text-gray-500">
                            <i className="fas fa-inbox text-4xl mb-3 block text-gray-300"></i>
                            <p className="font-medium">No hay datos en este período</p>
                            <p className="text-sm mt-1">{periodLabel}</p>
                          </td>
                        </tr>
                      ) : (
                        simpleSummary.summary.map((item, index) => (
                          <tr key={item.territoryId} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                            <td className="border-b border-gray-200 px-4 py-3 font-bold text-gray-800">
                              {item.territoryName}
                            </td>
                            <td className="border-b border-gray-200 px-4 py-3 text-center">
                              <span className={`px-3 py-1 rounded-full text-sm font-bold ${
                                item.timesWorked > 0 ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-400'
                              }`}>
                                {item.timesWorked}
                              </span>
                            </td>
                            <td className="border-b border-gray-200 px-4 py-3 text-center text-gray-600">
                              {item.averageDays !== null ? `${item.averageDays} días` : '-'}
                            </td>
                            <td className="border-b border-gray-200 px-4 py-3 text-center text-gray-600">
                              {item.lastCompleted ? formatDate(item.lastCompleted) : 'Sin datos'}
                            </td>
                            <td className="border-b border-gray-200 px-4 py-3 text-center">
                              {item.status === 'worked' ? (
                                <span className="inline-flex items-center gap-1 px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-bold">
                                  <i className="fas fa-check-circle"></i>
                                  Trabajado
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs font-bold">
                                  <i className="fas fa-exclamation-triangle"></i>
                                  Sin trabajar
                                </span>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Vista de Detalle */}
          {activeTab === 'detail' && (
            <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="border-b border-gray-300 px-4 py-3 text-left font-semibold text-gray-700">
                        Territorio
                      </th>
                      <th className="border-b border-gray-300 px-4 py-3 text-left font-semibold text-gray-700">
                        Publicador
                      </th>
                      <th className="border-b border-gray-300 px-4 py-3 text-center font-semibold text-gray-700">
                        Asignado
                      </th>
                      <th className="border-b border-gray-300 px-4 py-3 text-center font-semibold text-gray-700">
                        Completado
                      </th>
                      <th className="border-b border-gray-300 px-4 py-3 text-center font-semibold text-gray-700">
                        Días
                      </th>
                      <th className="border-b border-gray-300 px-4 py-3 text-center font-semibold text-gray-700">
                        Estado
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportData.detailList.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-12 text-center text-gray-500">
                          <i className="fas fa-inbox text-4xl mb-3 block text-gray-300"></i>
                          <p className="font-medium">No hay asignaciones en este período</p>
                          <p className="text-sm mt-1">
                            {periodLabel}
                          </p>
                        </td>
                      </tr>
                    ) : (
                      reportData.detailList.map((item, index) => (
                        <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                          <td className="border-b border-gray-200 px-4 py-3 font-medium text-gray-800">
                            {item.territoryNumber}
                          </td>
                          <td className="border-b border-gray-200 px-4 py-3 text-gray-700">
                            {item.assignedTo || '-'}
                          </td>
                          <td className="border-b border-gray-200 px-4 py-3 text-center text-gray-600">
                            {formatDateShort(item.assignedDate)}
                          </td>
                          <td className="border-b border-gray-200 px-4 py-3 text-center text-gray-600">
                            {item.completedDate ? formatDateShort(item.completedDate) : '-'}
                          </td>
                          <td className="border-b border-gray-200 px-4 py-3 text-center">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              item.status === 'Completado' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                            }`}>
                              {item.days} días
                            </span>
                          </td>
                          <td className="border-b border-gray-200 px-4 py-3 text-center">
                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                              item.status === 'Completado'
                                ? 'bg-green-100 text-green-700'
                                : 'bg-yellow-100 text-yellow-700'
                            }`}>
                              {item.status}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Vista Por Mes - Secciones Colapsables */}
          {activeTab === 'byMonth' && (
            <div className="space-y-3">
              {/* Botones expandir/colapsar todos */}
              {monthlyData.length > 0 && (
                <div className="flex justify-end gap-2 mb-2">
                  <button
                    onClick={() => toggleAllMonths(true)}
                    className="px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                  >
                    <i className="fas fa-expand-alt mr-1"></i>
                    Expandir todos
                  </button>
                  <button
                    onClick={() => toggleAllMonths(false)}
                    className="px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                  >
                    <i className="fas fa-compress-alt mr-1"></i>
                    Colapsar todos
                  </button>
                </div>
              )}

              {monthlyData.length === 0 ? (
                <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-12 text-center">
                  <i className="fas fa-inbox text-4xl mb-3 block text-gray-300"></i>
                  <p className="font-medium text-gray-500">No hay asignaciones en este período</p>
                  <p className="text-sm mt-1 text-gray-400">{periodLabel}</p>
                </div>
              ) : (
                monthlyData.map((monthData) => {
                  const isExpanded = expandedMonths[monthData.key] !== false; // Expandido por defecto
                  return (
                    <div key={monthData.key} className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
                      {/* Header del mes - clickeable */}
                      <button
                        onClick={() => toggleMonth(monthData.key)}
                        className="w-full flex items-center justify-between px-4 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:from-blue-700 hover:to-blue-800 transition-all"
                      >
                        <div className="flex items-center gap-3">
                          <i className={`fas fa-chevron-${isExpanded ? 'down' : 'right'} text-sm transition-transform`}></i>
                          <span className="font-bold text-lg">{monthData.monthName} {monthData.year}</span>
                        </div>
                        <div className="flex items-center gap-4 text-sm">
                          <span className="flex items-center gap-1.5">
                            <i className="fas fa-clipboard-list text-xs"></i>
                            {monthData.stats.total} asignaciones
                          </span>
                          <span className="flex items-center gap-1.5 text-green-200">
                            <i className="fas fa-check-circle text-xs"></i>
                            {monthData.stats.completed} completados
                          </span>
                          {monthData.stats.inProgress > 0 && (
                            <span className="flex items-center gap-1.5 text-yellow-200">
                              <i className="fas fa-clock text-xs"></i>
                              {monthData.stats.inProgress} en progreso
                            </span>
                          )}
                        </div>
                      </button>

                      {/* Contenido del mes - tabla */}
                      {isExpanded && (
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="bg-gray-50">
                                <th className="border-b border-gray-200 px-4 py-2 text-left font-semibold text-gray-600">Territorio</th>
                                <th className="border-b border-gray-200 px-4 py-2 text-left font-semibold text-gray-600">Publicador</th>
                                <th className="border-b border-gray-200 px-4 py-2 text-center font-semibold text-gray-600">Asignado</th>
                                <th className="border-b border-gray-200 px-4 py-2 text-center font-semibold text-gray-600">Completado</th>
                                <th className="border-b border-gray-200 px-4 py-2 text-center font-semibold text-gray-600">Días</th>
                                <th className="border-b border-gray-200 px-4 py-2 text-center font-semibold text-gray-600">Estado</th>
                              </tr>
                            </thead>
                            <tbody>
                              {monthData.assignments.map((item, index) => (
                                <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                                  <td className="border-b border-gray-100 px-4 py-2.5 font-medium text-gray-800">
                                    {item.territoryNumber}
                                  </td>
                                  <td className="border-b border-gray-100 px-4 py-2.5 text-gray-700">
                                    {item.assignedTo || '-'}
                                  </td>
                                  <td className="border-b border-gray-100 px-4 py-2.5 text-center text-gray-600">
                                    {formatDateShort(item.assignedDate)}
                                  </td>
                                  <td className="border-b border-gray-100 px-4 py-2.5 text-center text-gray-600">
                                    {item.completedDate ? formatDateShort(item.completedDate) : '-'}
                                  </td>
                                  <td className="border-b border-gray-100 px-4 py-2.5 text-center">
                                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                                      item.status === 'Completado' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                                    }`}>
                                      {item.days}d
                                    </span>
                                  </td>
                                  <td className="border-b border-gray-100 px-4 py-2.5 text-center">
                                    {item.status === 'Completado' ? (
                                      <i className="fas fa-check-circle text-green-500"></i>
                                    ) : (
                                      <i className="fas fa-clock text-yellow-500"></i>
                                    )}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          )}

          {activeTab === 's13' && (
            <S13OfficialTable
              rows={reportData.s13Rows}
              periodLabel={periodLabel}
              serviceYearLabel={reportData.period?.serviceYearLabel}
            />
          )}
        </div>
      </div>
    </Modal>
  );
};

export default S13ReportModal;
