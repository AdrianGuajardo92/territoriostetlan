import React, { useState, useMemo } from 'react';
import Modal from '../common/Modal';
import Icon from '../common/Icon';
import { useApp } from '../../context/AppContext';
import { useToast } from '../../hooks/useToast';
import {
  generateS13Data,
  exportS13ToExcel,
  exportS13ToPDF,
  getAvailableServiceYears,
  getServiceYearRange,
  getSemesterRange,
  getCustomRange,
  groupByMonthOrdered,
  generateSimpleSummary,
  exportSimpleSummaryToExcel,
  exportSimpleSummaryToPDF,
  formatDateShort,
  MONTH_NAMES
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
  { value: 'full', label: 'Año completo', description: 'Sep - Ago' },
  { value: 'semester1', label: 'Semestre 1', description: 'Sep - Feb' },
  { value: 'semester2', label: 'Semestre 2', description: 'Mar - Ago' },
  { value: 'custom', label: 'Personalizado', description: 'Rango personalizado' }
];

/**
 * Tabs disponibles para la vista
 */
const VIEW_TABS = [
  { id: 'summary', label: 'Resumen', icon: 'fas fa-chart-pie' },
  { id: 'detail', label: 'Detalle', icon: 'fas fa-list' },
  { id: 'byMonth', label: 'Por Mes', icon: 'fas fa-calendar-alt' },
  { id: 's13', label: 'Formato S-13', icon: 'fas fa-file-alt' }
];

const S13ReportModal = ({ isOpen, onClose }) => {
  const { territories, territoryHistory = [] } = useApp();
  const { showToast } = useToast();

  // Estados
  const availableYears = useMemo(() => getAvailableServiceYears(), []);
  const [selectedServiceYear, setSelectedServiceYear] = useState(availableYears[0]?.value || new Date().getFullYear());
  const [selectedPeriod, setSelectedPeriod] = useState('full');
  const [activeTab, setActiveTab] = useState('summary');

  // Estados para rango personalizado
  const currentDate = new Date();
  const [customStartMonth, setCustomStartMonth] = useState(8); // Septiembre
  const [customStartYear, setCustomStartYear] = useState(currentDate.getMonth() >= 8 ? currentDate.getFullYear() : currentDate.getFullYear() - 1);
  const [customEndMonth, setCustomEndMonth] = useState(currentDate.getMonth());
  const [customEndYear, setCustomEndYear] = useState(currentDate.getFullYear());

  // Estados para meses expandidos en vista "Por Mes"
  const [expandedMonths, setExpandedMonths] = useState({});

  // Calcular rango de fechas basado en selección
  const dateRange = useMemo(() => {
    if (selectedPeriod === 'full') {
      return getServiceYearRange(selectedServiceYear);
    } else if (selectedPeriod === 'semester1') {
      return getSemesterRange(selectedServiceYear, 1);
    } else if (selectedPeriod === 'semester2') {
      return getSemesterRange(selectedServiceYear, 2);
    } else {
      // Rango personalizado
      return getCustomRange(customStartMonth, customStartYear, customEndMonth, customEndYear);
    }
  }, [selectedServiceYear, selectedPeriod, customStartMonth, customStartYear, customEndMonth, customEndYear]);

  // Generar datos del reporte
  const reportData = useMemo(() => {
    if (!territories || !territoryHistory) {
      return { detailList: [], summaryByTerritory: [], byMonth: {}, stats: {} };
    }
    return generateS13Data(territoryHistory, territories, dateRange.start, dateRange.end);
  }, [territories, territoryHistory, dateRange]);

  // Label del período para exportación
  const periodLabel = useMemo(() => {
    if (selectedPeriod === 'custom') {
      return `${MONTH_NAMES[customStartMonth]} ${customStartYear} - ${MONTH_NAMES[customEndMonth]} ${customEndYear}`;
    }
    const option = PERIOD_OPTIONS.find(p => p.value === selectedPeriod);
    return `${option?.label} (${option?.description})`;
  }, [selectedPeriod, customStartMonth, customStartYear, customEndMonth, customEndYear]);

  // Datos agrupados por mes para la vista "Por Mes"
  const monthlyData = useMemo(() => {
    return groupByMonthOrdered(reportData.detailList);
  }, [reportData.detailList]);

  // Resumen simple para la vista principal
  const simpleSummary = useMemo(() => {
    if (!territories || !territoryHistory) {
      return { summary: [], stats: {} };
    }
    return generateSimpleSummary(territoryHistory, territories, dateRange.start, dateRange.end);
  }, [territories, territoryHistory, dateRange]);

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
    try {
      if (activeTab === 'summary') {
        const fileName = exportSimpleSummaryToExcel(simpleSummary, periodLabel);
        showToast(`Resumen exportado: ${fileName}`, 'success');
      } else {
        const fileName = exportS13ToExcel(reportData, selectedServiceYear, periodLabel);
        showToast(`Archivo Excel generado: ${fileName}`, 'success');
      }
    } catch (error) {
      console.error('Error exportando a Excel:', error);
      showToast('Error al generar archivo Excel', 'error');
    }
  };

  const handleExportPDF = () => {
    try {
      if (activeTab === 'summary') {
        exportSimpleSummaryToPDF(simpleSummary, periodLabel);
        showToast('Generando PDF del resumen...', 'success');
      } else {
        exportS13ToPDF(reportData, selectedServiceYear, periodLabel);
        showToast('Generando PDF para impresión...', 'success');
      }
    } catch (error) {
      console.error('Error exportando a PDF:', error);
      showToast('Error al generar PDF', 'error');
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="" size="full">
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
          <div className="flex flex-wrap items-center gap-3 mb-3">
            {/* Selector de año de servicio */}
            <div className="flex items-center gap-2">
              <span className="text-white/70 text-sm">Año:</span>
              <select
                value={selectedServiceYear}
                onChange={(e) => setSelectedServiceYear(parseInt(e.target.value))}
                className="px-3 py-2 bg-white/10 text-white border border-white/20 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-white/30"
              >
                {availableYears.map(year => (
                  <option key={year.value} value={year.value} className="text-gray-800">
                    {year.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Selector de período */}
            <div className="flex items-center gap-2">
              <span className="text-white/70 text-sm">Período:</span>
              <div className="flex rounded-lg overflow-hidden border border-white/20">
                {PERIOD_OPTIONS.map(option => (
                  <button
                    key={option.value}
                    onClick={() => setSelectedPeriod(option.value)}
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
          </div>

          {/* Selectores de rango personalizado */}
          {selectedPeriod === 'custom' && (
            <div className="flex flex-wrap items-center gap-3 mb-3 p-3 bg-white/5 rounded-lg border border-white/10">
              <div className="flex items-center gap-2">
                <span className="text-white/70 text-sm">Desde:</span>
                <select
                  value={customStartMonth}
                  onChange={(e) => setCustomStartMonth(parseInt(e.target.value))}
                  className="px-2 py-1.5 bg-white/10 text-white border border-white/20 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-white/30"
                >
                  {MONTH_NAMES.map((month, index) => (
                    <option key={index} value={index} className="text-gray-800">{month}</option>
                  ))}
                </select>
                <select
                  value={customStartYear}
                  onChange={(e) => setCustomStartYear(parseInt(e.target.value))}
                  className="px-2 py-1.5 bg-white/10 text-white border border-white/20 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-white/30"
                >
                  {Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - 5 + i).map(year => (
                    <option key={year} value={year} className="text-gray-800">{year}</option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-white/70 text-sm">Hasta:</span>
                <select
                  value={customEndMonth}
                  onChange={(e) => setCustomEndMonth(parseInt(e.target.value))}
                  className="px-2 py-1.5 bg-white/10 text-white border border-white/20 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-white/30"
                >
                  {MONTH_NAMES.map((month, index) => (
                    <option key={index} value={index} className="text-gray-800">{month}</option>
                  ))}
                </select>
                <select
                  value={customEndYear}
                  onChange={(e) => setCustomEndYear(parseInt(e.target.value))}
                  className="px-2 py-1.5 bg-white/10 text-white border border-white/20 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-white/30"
                >
                  {Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - 5 + i).map(year => (
                    <option key={year} value={year} className="text-gray-800">{year}</option>
                  ))}
                </select>
              </div>
            </div>
          )}

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
              <button
                onClick={handleExportPDF}
                className="flex items-center gap-2 px-4 py-2 bg-red-500/90 text-white rounded-xl hover:bg-red-600 transition-all transform hover:scale-105 shadow-lg text-sm font-medium"
              >
                <i className="fas fa-file-pdf"></i>
                <span>PDF</span>
              </button>
              <button
                onClick={handleExportExcel}
                className="flex items-center gap-2 px-4 py-2 bg-green-500/90 text-white rounded-xl hover:bg-green-600 transition-all transform hover:scale-105 shadow-lg text-sm font-medium"
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

          {/* Vista Formato S-13 Oficial */}
          {activeTab === 's13' && (
            <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-100">
                      <th rowSpan={2} className="border border-gray-300 px-3 py-2 text-center font-semibold text-gray-700 sticky left-0 bg-gray-100 z-10" style={{ minWidth: '80px' }}>
                        Núm.<br />de terr.
                      </th>
                      <th rowSpan={2} className="border border-gray-300 px-3 py-2 text-center font-semibold text-gray-700" style={{ minWidth: '90px' }}>
                        Última fecha<br />completado*
                      </th>
                      <th colSpan={3} className="border border-gray-300 px-2 py-1 text-center font-semibold text-gray-700 bg-blue-50">
                        Asignado a
                      </th>
                      <th colSpan={3} className="border border-gray-300 px-2 py-1 text-center font-semibold text-gray-700 bg-green-50">
                        Asignado a
                      </th>
                      <th colSpan={3} className="border border-gray-300 px-2 py-1 text-center font-semibold text-gray-700 bg-yellow-50">
                        Asignado a
                      </th>
                      <th colSpan={3} className="border border-gray-300 px-2 py-1 text-center font-semibold text-gray-700 bg-purple-50">
                        Asignado a
                      </th>
                    </tr>
                    <tr className="bg-gray-50 text-xs">
                      {[1, 2, 3, 4].map((num) => (
                        <React.Fragment key={num}>
                          <th className={`border border-gray-300 px-2 py-1 text-center font-medium text-gray-600 ${num === 1 ? 'bg-blue-50' : num === 2 ? 'bg-green-50' : num === 3 ? 'bg-yellow-50' : 'bg-purple-50'}`} style={{ minWidth: '100px' }}>
                            Nombre
                          </th>
                          <th className={`border border-gray-300 px-2 py-1 text-center font-medium text-gray-600 ${num === 1 ? 'bg-blue-50' : num === 2 ? 'bg-green-50' : num === 3 ? 'bg-yellow-50' : 'bg-purple-50'}`} style={{ minWidth: '75px' }}>
                            Asignado
                          </th>
                          <th className={`border border-gray-300 px-2 py-1 text-center font-medium text-gray-600 ${num === 1 ? 'bg-blue-50' : num === 2 ? 'bg-green-50' : num === 3 ? 'bg-yellow-50' : 'bg-purple-50'}`} style={{ minWidth: '75px' }}>
                            Completado
                          </th>
                        </React.Fragment>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {reportData.summaryByTerritory.length === 0 ? (
                      <tr>
                        <td colSpan={14} className="border border-gray-300 px-4 py-12 text-center text-gray-500">
                          <i className="fas fa-inbox text-4xl mb-3 block text-gray-300"></i>
                          <p className="font-medium">No hay datos para este período</p>
                          <p className="text-sm mt-1">{periodLabel}</p>
                        </td>
                      </tr>
                    ) : (
                      reportData.summaryByTerritory.map((row, index) => (
                        <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                          <td className="border border-gray-300 px-3 py-2 text-center font-semibold text-gray-800 sticky left-0 bg-inherit z-10">
                            {row.territoryNumber}
                          </td>
                          <td className="border border-gray-300 px-3 py-2 text-center text-gray-600 text-xs">
                            {formatDate(row.lastCompletedBefore)}
                          </td>
                          {[0, 1, 2, 3].map((colIndex) => {
                            const assignment = row.assignments[colIndex];
                            return (
                              <React.Fragment key={colIndex}>
                                <td className={`border border-gray-300 px-2 py-2 text-left text-xs ${assignment?.assignedTo ? 'text-gray-800' : 'text-gray-300'}`}>
                                  {assignment?.assignedTo || '-'}
                                </td>
                                <td className={`border border-gray-300 px-2 py-2 text-center text-xs ${assignment?.assignedDate ? 'text-gray-600' : 'text-gray-300'}`}>
                                  {formatDate(assignment?.assignedDate)}
                                </td>
                                <td className={`border border-gray-300 px-2 py-2 text-center text-xs ${assignment?.completedDate ? 'text-green-600 font-medium' : 'text-gray-300'}`}>
                                  {formatDate(assignment?.completedDate)}
                                </td>
                              </React.Fragment>
                            );
                          })}
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Nota al pie */}
          <p className="mt-3 text-xs text-gray-500 italic">
            *Cuando comience una nueva página, anote en esta columna la última fecha en que los territorios se completaron.
          </p>
        </div>
      </div>
    </Modal>
  );
};

export default S13ReportModal;
