import React, { useState, useMemo } from 'react';
import Modal from '../common/Modal';
import Icon from '../common/Icon';
import { useApp } from '../../context/AppContext';
import { useToast } from '../../hooks/useToast';
import * as XLSX from 'xlsx';

const StatsModal = ({ isOpen, onClose }) => {
  const { territories, addresses, users, territoryHistory = [] } = useApp();
  const { showToast } = useToast();
  const [selectedStat, setSelectedStat] = useState('overview');
  const [dateFilter, setDateFilter] = useState('all'); // all, week, month, year
  
  const stats = useMemo(() => {
    if (!territories || !addresses) return null;
    
    const now = new Date();
    const lastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
    const lastYear = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    
    // Estadísticas básicas
    const basic = {
      totalTerritories: territories.length,
      availableTerritories: territories.filter(t => t.status === 'Disponible').length,
      inUseTerritories: territories.filter(t => t.status === 'En uso').length,
      completedTerritories: territories.filter(t => t.status === 'Completado' || t.status === 'Terminado').length,
      totalAddresses: addresses.length,
      visitedAddresses: addresses.filter(a => a.isVisited).length,
      pendingAddresses: addresses.filter(a => !a.isVisited).length
    };
    
    // Progreso y tasas
    basic.completionRate = basic.totalAddresses > 0 
      ? (basic.visitedAddresses / basic.totalAddresses * 100).toFixed(1) 
      : 0;
    
    basic.territoryUtilization = basic.totalTerritories > 0
      ? ((basic.inUseTerritories / basic.totalTerritories) * 100).toFixed(1)
      : 0;
      
    // Territorios completados por período
    const completedByPeriod = {
      week: 0,
      month: 0, 
      year: 0
    };
    
    territoryHistory.forEach(h => {
      if (h.status === 'Completado' && h.completedDate) {
        const completedDate = h.completedDate.toDate ? h.completedDate.toDate() : new Date(h.completedDate);
        if (completedDate > lastWeek) completedByPeriod.week++;
        if (completedDate > lastMonth) completedByPeriod.month++;
        if (completedDate > lastYear) completedByPeriod.year++;
      }
    });
    
    // Direcciones agregadas este mes
    const addressesAddedThisMonth = addresses.filter(a => {
      if (a.createdAt) {
        const createdDate = a.createdAt.toDate ? a.createdAt.toDate() : new Date(a.createdAt);
        return createdDate >= startOfMonth;
      }
      return false;
    }).length;
    
    // Estadísticas de tiempo
    const timeStats = {
      averageCompletionDays: 0,
      fastestCompletion: null,
      slowestCompletion: null,
      completionsLastMonth: 0
    };
    
    if (territoryHistory && territoryHistory.length > 0) {
      const completedWithTime = territoryHistory
        .filter(h => h.completedDate && h.assignedDate)
        .map(h => ({
          ...h,
          days: Math.floor((h.completedDate.toDate() - h.assignedDate.toDate()) / (1000 * 60 * 60 * 24))
        }));
      
      if (completedWithTime.length > 0) {
        const totalDays = completedWithTime.reduce((sum, h) => sum + h.days, 0);
        timeStats.averageCompletionDays = Math.round(totalDays / completedWithTime.length);
        
        completedWithTime.sort((a, b) => a.days - b.days);
        timeStats.fastestCompletion = completedWithTime[0];
        timeStats.slowestCompletion = completedWithTime[completedWithTime.length - 1];
      }
      
      timeStats.completionsLastMonth = territoryHistory.filter(h => 
        h.completedDate && h.completedDate.toDate() > lastMonth
      ).length;
    }
    
    // Publicadores activos
    const activePublishers = [...new Set(territories
      .filter(t => t.status === 'En uso')
      .map(t => t.assignedTo)
      .filter(Boolean))];
    
    // Territorios por publicador
    const publisherStats = {};
    territories.forEach(t => {
      if (t.status === 'En uso' && t.assignedTo) {
        publisherStats[t.assignedTo] = (publisherStats[t.assignedTo] || 0) + 1;
      }
    });
    
    // Publicadores inactivos (no tienen territorios asignados actualmente)
    const inactivePublishers = users ? users.filter(user => 
      user.role !== 'admin' && !activePublishers.includes(user.name)
    ).length : 0;
    
    // Estadísticas predictivas
    const predictiveStats = {
      estimatedDaysToComplete: 0,
      progressPerDay: 0
    };
    
    // Calcular velocidad de progreso basado en último mes
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const recentCompletions = territoryHistory.filter(h => {
      if (h.completedDate) {
        const date = h.completedDate.toDate ? h.completedDate.toDate() : new Date(h.completedDate);
        return date > thirtyDaysAgo;
      }
      return false;
    }).length;
    
    if (recentCompletions > 0 && basic.pendingAddresses > 0) {
      const avgAddressesPerTerritory = basic.totalAddresses / basic.totalTerritories;
      const addressesCompletedLastMonth = recentCompletions * avgAddressesPerTerritory;
      predictiveStats.progressPerDay = addressesCompletedLastMonth / 30;
      predictiveStats.estimatedDaysToComplete = Math.ceil(basic.pendingAddresses / predictiveStats.progressPerDay);
    }
    
    return {
      ...basic,
      ...timeStats,
      ...predictiveStats,
      completedByPeriod,
      addressesAddedThisMonth,
      activePublishers: activePublishers.length,
      inactivePublishers,
      publisherStats: Object.entries(publisherStats).sort((a, b) => b[1] - a[1])
    };
  }, [territories, addresses, users, territoryHistory]);
  
  if (!stats) return null;
  
  // Función para exportar a Excel
  const exportToExcel = () => {
    try {
      // Crear un nuevo libro
      const wb = XLSX.utils.book_new();
      
      // Hoja 1: Resumen General
      const summaryData = [
        ['ESTADÍSTICAS GENERALES - TERRITORIOS LS'],
        ['Fecha de generación:', new Date().toLocaleString('es-MX')],
        [''],
        ['RESUMEN GENERAL'],
        ['Total de Territorios', stats.totalTerritories],
        ['Total de Direcciones', stats.totalAddresses],
        ['Porcentaje de Cobertura', `${stats.completionRate}%`],
        ['Días Promedio por Territorio', stats.averageCompletionDays || 'N/A'],
        [''],
        ['ESTADO DE TERRITORIOS'],
        ['Disponibles', stats.availableTerritories],
        ['En Uso', stats.inUseTerritories],
        ['Completados esta Semana', stats.completedByPeriod.week],
        ['Completados este Mes', stats.completedByPeriod.month],
        ['Completados este Año', stats.completedByPeriod.year],
        [''],
        ['PUBLICADORES'],
        ['Publicadores Activos', stats.activePublishers],
        ['Publicadores Inactivos', stats.inactivePublishers],
        [''],
        ['DIRECCIONES'],
        ['Visitadas', stats.visitedAddresses],
        ['Pendientes', stats.pendingAddresses],
        ['Agregadas este Mes', stats.addressesAddedThisMonth],
        [''],
        ['ESTIMACIÓN'],
        ['Días Estimados para Completar', stats.estimatedDaysToComplete || 'N/A'],
        ['Meses Estimados para Completar', stats.estimatedDaysToComplete ? Math.ceil(stats.estimatedDaysToComplete / 30) : 'N/A']
      ];
      
      const ws1 = XLSX.utils.aoa_to_sheet(summaryData);
      XLSX.utils.book_append_sheet(wb, ws1, 'Resumen General');
      
      // Hoja 2: Detalle por Publicador
      const publisherData = [
        ['DETALLE POR PUBLICADOR'],
        [''],
        ['Publicador', 'Territorios Asignados']
      ];
      
      stats.publisherStats.forEach(([name, count]) => {
        publisherData.push([name, count]);
      });
      
      const ws2 = XLSX.utils.aoa_to_sheet(publisherData);
      XLSX.utils.book_append_sheet(wb, ws2, 'Por Publicador');
      
      // Hoja 3: Territorios Detallados
      const territoryData = [
        ['LISTA DE TERRITORIOS'],
        [''],
        ['Territorio', 'Estado', 'Asignado a', 'Direcciones', 'Visitadas', '% Completado']
      ];
      
      territories.forEach(territory => {
        const territoryAddresses = addresses.filter(a => a.territoryId === territory.id);
        const visitedCount = territoryAddresses.filter(a => a.isVisited).length;
        const percentage = territoryAddresses.length > 0 
          ? ((visitedCount / territoryAddresses.length) * 100).toFixed(1)
          : 0;
          
        territoryData.push([
          territory.name,
          territory.status,
          territory.assignedTo || '-',
          territoryAddresses.length,
          visitedCount,
          `${percentage}%`
        ]);
      });
      
      const ws3 = XLSX.utils.aoa_to_sheet(territoryData);
      XLSX.utils.book_append_sheet(wb, ws3, 'Territorios');
      
      // Descargar el archivo
      const fileName = `estadisticas_territorios_${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(wb, fileName);
      
      showToast('✅ Archivo Excel generado correctamente', 'success');
    } catch (error) {
      console.error('Error exportando a Excel:', error);
      showToast('❌ Error al generar archivo Excel', 'error');
    }
  };
  
  // Función para exportar a PDF (requiere librería adicional o usar el navegador)
  const exportToPDF = () => {
    try {
      // Crear contenido HTML para el PDF
      const printContent = `
        <html>
          <head>
            <title>Estadísticas - Territorios LS</title>
            <style>
              body { font-family: Arial, sans-serif; padding: 20px; }
              h1 { color: #333; font-size: 24px; }
              h2 { color: #666; font-size: 18px; margin-top: 20px; }
              table { width: 100%; border-collapse: collapse; margin: 15px 0; }
              th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
              th { background-color: #f2f2f2; font-weight: bold; }
              .stat { margin: 10px 0; }
              .stat-label { font-weight: bold; }
              .stat-value { color: #2563eb; }
            </style>
          </head>
          <body>
            <h1>Estadísticas de Territorios LS</h1>
            <p>Fecha: ${new Date().toLocaleString('es-MX')}</p>
            
            <h2>Resumen General</h2>
            <div class="stat">
              <span class="stat-label">Total de Territorios:</span> 
              <span class="stat-value">${stats.totalTerritories}</span>
            </div>
            <div class="stat">
              <span class="stat-label">Total de Direcciones:</span> 
              <span class="stat-value">${stats.totalAddresses}</span>
            </div>
            <div class="stat">
              <span class="stat-label">Porcentaje de Cobertura:</span> 
              <span class="stat-value">${stats.completionRate}%</span>
            </div>
            <div class="stat">
              <span class="stat-label">Días Promedio por Territorio:</span> 
              <span class="stat-value">${stats.averageCompletionDays || 'N/A'}</span>
            </div>
            
            <h2>Estado de Territorios</h2>
            <table>
              <tr>
                <th>Estado</th>
                <th>Cantidad</th>
              </tr>
              <tr>
                <td>Disponibles</td>
                <td>${stats.availableTerritories}</td>
              </tr>
              <tr>
                <td>En Uso</td>
                <td>${stats.inUseTerritories}</td>
              </tr>
              <tr>
                <td>Completados esta Semana</td>
                <td>${stats.completedByPeriod.week}</td>
              </tr>
              <tr>
                <td>Completados este Mes</td>
                <td>${stats.completedByPeriod.month}</td>
              </tr>
              <tr>
                <td>Completados este Año</td>
                <td>${stats.completedByPeriod.year}</td>
              </tr>
            </table>
            
            <h2>Publicadores</h2>
            <div class="stat">
              <span class="stat-label">Activos:</span> 
              <span class="stat-value">${stats.activePublishers}</span>
            </div>
            <div class="stat">
              <span class="stat-label">Inactivos:</span> 
              <span class="stat-value">${stats.inactivePublishers}</span>
            </div>
            
            <h2>Estimación de Finalización</h2>
            <div class="stat">
              <span class="stat-label">Tiempo Estimado:</span> 
              <span class="stat-value">${stats.estimatedDaysToComplete ? 
                `${Math.ceil(stats.estimatedDaysToComplete / 30)} meses` : 
                'No hay suficientes datos'}</span>
            </div>
          </body>
        </html>
      `;
      
      // Abrir ventana de impresión
      const printWindow = window.open('', '_blank');
      printWindow.document.write(printContent);
      printWindow.document.close();
      
      // Esperar a que cargue y luego imprimir
      printWindow.onload = function() {
        printWindow.print();
        // Opcional: cerrar la ventana después de imprimir
        // printWindow.close();
      };
      
      showToast('✅ Generando PDF para impresión...', 'success');
    } catch (error) {
      console.error('Error exportando a PDF:', error);
      showToast('❌ Error al generar PDF', 'error');
    }
  };
  
  // Componente StatCard rediseñado con estilo elegante
  const StatCard = ({ title, value, subtitle, icon, trend, color = 'blue', gradient = true }) => {
    const colorConfig = {
      blue: { 
        bg: 'from-blue-50 to-indigo-100', 
        iconBg: 'bg-blue-500', 
        text: 'text-blue-600',
        accent: 'border-blue-200',
        hover: 'hover:shadow-blue-100/50'
      },
      green: { 
        bg: 'from-green-50 to-emerald-100', 
        iconBg: 'bg-green-500', 
        text: 'text-green-600',
        accent: 'border-green-200',
        hover: 'hover:shadow-green-100/50'
      },
      purple: { 
        bg: 'from-purple-50 to-violet-100', 
        iconBg: 'bg-purple-500', 
        text: 'text-purple-600',
        accent: 'border-purple-200',
        hover: 'hover:shadow-purple-100/50'
      },
      orange: { 
        bg: 'from-orange-50 to-amber-100', 
        iconBg: 'bg-orange-500', 
        text: 'text-orange-600',
        accent: 'border-orange-200',
        hover: 'hover:shadow-orange-100/50'
      },
      gray: { 
        bg: 'from-gray-50 to-slate-100', 
        iconBg: 'bg-gray-500', 
        text: 'text-gray-600',
        accent: 'border-gray-200',
        hover: 'hover:shadow-gray-100/50'
      }
    };
    
    const config = colorConfig[color] || colorConfig.blue;
    
    return (
      <div className={`
        ${gradient ? `bg-gradient-to-br ${config.bg}` : 'bg-white'} 
        border-2 ${config.accent} rounded-2xl p-6 
        shadow-lg ${config.hover} hover:shadow-2xl 
        hover:scale-[1.02] transition-all duration-300 ease-out
        backdrop-blur-sm border-white/20
      `}>
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-600 mb-2 truncate">{title}</p>
            <p className="text-3xl font-bold text-gray-900 mb-1">{value}</p>
            {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
            {trend !== undefined && (
              <div className={`flex items-center mt-3 text-xs px-2 py-1 rounded-full ${
                trend > 0 
                  ? 'bg-green-100 text-green-700' 
                  : trend < 0 
                    ? 'bg-red-100 text-red-700'
                    : 'bg-gray-100 text-gray-700'
              }`}>
                <i className={`fas ${trend > 0 ? 'fa-arrow-up' : trend < 0 ? 'fa-arrow-down' : 'fa-minus'} mr-1.5`}></i>
                <span className="font-medium">{Math.abs(trend)}% vs mes anterior</span>
              </div>
            )}
          </div>
          <div className={`w-14 h-14 ${config.iconBg} rounded-2xl flex items-center justify-center ml-4 shadow-lg transform hover:scale-110 transition-transform`}>
            <i className={`fas fa-${icon} text-xl text-white`}></i>
          </div>
        </div>
      </div>
    );
  };
  
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="" size="full">
      <div className="h-full flex flex-col bg-gradient-to-br from-indigo-50 via-white to-blue-50">
        {/* Header elegante con temática consistente */}
        <div className="shadow-xl px-4 py-6 flex-shrink-0" style={{ backgroundColor: '#2C3E50' }}>
          <div className="flex items-center justify-between mb-4">
            {/* Título con ícono */}
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center backdrop-blur-sm">
                <i className="fas fa-chart-line text-2xl text-white"></i>
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Estadísticas Avanzadas</h2>
                <p className="text-white/70 text-sm">Panel exclusivo para administradores</p>
              </div>
            </div>
            
            {/* Botones de exportación mejorados */}
            <div className="flex items-center gap-2">
              <button 
                onClick={exportToPDF}
                className="flex items-center gap-2 px-4 py-2 bg-red-500/90 text-white rounded-xl hover:bg-red-600 transition-all transform hover:scale-105 shadow-lg backdrop-blur-sm text-sm font-medium"
                title="Exportar a PDF"
              >
                <i className="fas fa-file-pdf"></i>
                <span className="hidden sm:inline">PDF</span>
              </button>
              <button 
                onClick={exportToExcel}
                className="flex items-center gap-2 px-4 py-2 bg-green-500/90 text-white rounded-xl hover:bg-green-600 transition-all transform hover:scale-105 shadow-lg backdrop-blur-sm text-sm font-medium"
                title="Exportar a Excel"
              >
                <i className="fas fa-file-excel"></i>
                <span className="hidden sm:inline">Excel</span>
              </button>
              <button 
                onClick={onClose}
                className="p-3 rounded-xl transition-all transform hover:scale-105 group"
                style={{ backgroundColor: '#34495e' }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#3a526b'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#34495e'}
              >
                <Icon name="x" size={20} className="text-white group-hover:rotate-90 transition-transform" />
              </button>
            </div>
          </div>
          
          {/* Tabs elegantes con gradientes */}
          <div className="flex space-x-2">
            {[
              { id: 'overview', label: 'General', icon: 'fas fa-chart-pie', shortLabel: 'General' },
              { id: 'progress', label: 'Progreso', icon: 'fas fa-chart-bar', shortLabel: 'Progreso' },
              { id: 'performance', label: 'Rendimiento', icon: 'fas fa-tachometer-alt', shortLabel: 'Rendimiento' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setSelectedStat(tab.id)}
                className={`flex-1 flex items-center justify-center gap-2 px-3 py-3 rounded-xl font-medium text-sm transition-all transform hover:scale-105 ${
                  selectedStat === tab.id 
                    ? 'bg-white text-gray-800 shadow-lg' 
                    : 'bg-white/10 text-white/80 hover:bg-white/20 backdrop-blur-sm'
                }`}
              >
                <i className={`${tab.icon} text-lg`}></i>
                <span className="hidden sm:inline">{tab.label}</span>
                <span className="sm:hidden">{tab.shortLabel}</span>
              </button>
            ))}
          </div>
        </div>
        
        {/* Contenido scrolleable con diseño elegante */}
        <div className="flex-1 overflow-y-auto min-h-0 p-4 sm:p-6" style={{ maxHeight: 'calc(100vh - 140px)' }}>
          {selectedStat === 'overview' && (
            <div className="space-y-8">
              {/* Sección 1: Estadísticas Generales con diseño mejorado */}
              <div>
                <div className="flex items-center mb-6">
                  <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center mr-3 shadow-lg">
                    <i className="fas fa-chart-pie text-white text-lg"></i>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-800">Estadísticas Generales</h3>
                    <p className="text-sm text-gray-600">Visión general del trabajo de predicación</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <StatCard
                    title="Total de Territorios"
                    value={stats.totalTerritories}
                    icon="map"
                    color="blue"
                  />
                  <StatCard
                    title="Total de Direcciones"
                    value={stats.totalAddresses}
                    icon="home"
                    color="green"
                  />
                  <StatCard
                    title="Porcentaje de Cobertura"
                    value={`${stats.completionRate}%`}
                    subtitle={`${stats.visitedAddresses} de ${stats.totalAddresses} visitadas`}
                    icon="chart-line"
                    color="purple"
                  />
                  <StatCard
                    title="Días Promedio por Territorio"
                    value={stats.averageCompletionDays || 'N/A'}
                    subtitle="Para completar"
                    icon="clock"
                    color="orange"
                  />
                </div>
              </div>
              
              {/* Sección 2: Estado de Territorios con diseño mejorado */}
              <div>
                <div className="flex items-center mb-6">
                  <div className="w-10 h-10 bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl flex items-center justify-center mr-3 shadow-lg">
                    <i className="fas fa-map-marked-alt text-white text-lg"></i>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-800">Estado de Territorios</h3>
                    <p className="text-sm text-gray-600">Distribución actual de territorios</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <StatCard
                    title="Disponibles"
                    value={stats.availableTerritories}
                    icon="check-circle"
                    color="green"
                  />
                  <StatCard
                    title="En Uso"
                    value={stats.inUseTerritories}
                    subtitle={`Por ${stats.activePublishers} publicadores`}
                    icon="users"
                    color="blue"
                  />
                  <StatCard
                    title="Completados"
                    value={`${stats.completedByPeriod.week}/${stats.completedByPeriod.month}/${stats.completedByPeriod.year}`}
                    subtitle="Semana/Mes/Año"
                    icon="trophy"
                    color="orange"
                  />
                </div>
              </div>
              
              {/* Sección 3: Estadísticas de Publicadores con diseño mejorado */}
              <div>
                <div className="flex items-center mb-6">
                  <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-violet-600 rounded-xl flex items-center justify-center mr-3 shadow-lg">
                    <i className="fas fa-users text-white text-lg"></i>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-800">Estadísticas de Publicadores</h3>
                    <p className="text-sm text-gray-600">Actividad y participación</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <StatCard
                    title="Publicadores Inactivos"
                    value={stats.inactivePublishers}
                    subtitle="Sin territorios asignados"
                    icon="user-slash"
                    color="gray"
                  />
                  <StatCard
                    title="Direcciones Agregadas"
                    value={stats.addressesAddedThisMonth}
                    subtitle="Este mes"
                    icon="plus-circle"
                    color="green"
                  />
                </div>
              </div>
              
              {/* Sección 4: Estimación Predictiva con diseño especial */}
              <div className="relative bg-gradient-to-br from-indigo-100 via-blue-50 to-purple-100 rounded-3xl p-6 sm:p-8 border-2 border-indigo-200 shadow-xl overflow-hidden">
                {/* Decoración de fondo */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-indigo-200/30 to-purple-200/30 rounded-full transform translate-x-16 -translate-y-16"></div>
                <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-br from-blue-200/30 to-indigo-200/30 rounded-full transform -translate-x-12 translate-y-12"></div>
                
                <div className="relative z-10">
                  <div className="flex items-center mb-6">
                    <div className="w-12 h-12 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl flex items-center justify-center mr-4 shadow-xl">
                      <i className="fas fa-crystal-ball text-white text-xl"></i>
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold text-indigo-900">Estimación Predictiva</h3>
                      <p className="text-indigo-700">Tiempo estimado para completar todo el trabajo</p>
                    </div>
                  </div>
                  
                  <div className="text-center bg-white/70 backdrop-blur-sm rounded-2xl p-6 border border-white/50">
                    <div className="mb-4">
                      <p className="text-5xl font-black bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                        {stats.estimatedDaysToComplete > 0 
                          ? `${Math.ceil(stats.estimatedDaysToComplete / 30)}`
                          : 'N/A'}
                      </p>
                      {stats.estimatedDaysToComplete > 0 && (
                        <p className="text-xl font-bold text-indigo-800 mt-2">meses</p>
                      )}
                    </div>
                    <p className="text-sm text-indigo-700 font-medium">
                      {stats.estimatedDaysToComplete > 0 
                        ? `Aproximadamente ${stats.estimatedDaysToComplete} días al ritmo actual`
                        : 'No hay suficientes datos para realizar la estimación'}
                    </p>
                  </div>
                </div>
              </div>
              
              {/* Distribución de territorios */}
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h4 className="text-base font-semibold text-gray-900 mb-4">Distribución de Territorios</h4>
                <div className="space-y-3">
                  <div className="flex items-center">
                    <div className="w-32 text-sm text-gray-600">Disponibles</div>
                    <div className="flex-1 bg-gray-200 rounded-full h-6 relative overflow-hidden">
                      <div 
                        className="absolute left-0 top-0 h-full bg-green-500 flex items-center justify-end pr-2"
                        style={{ width: `${stats.totalTerritories > 0 ? (stats.availableTerritories / stats.totalTerritories * 100) : 0}%` }}
                      >
                        <span className="text-xs font-medium text-white">{stats.availableTerritories}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center">
                    <div className="w-32 text-sm text-gray-600">En uso</div>
                    <div className="flex-1 bg-gray-200 rounded-full h-6 relative overflow-hidden">
                      <div 
                        className="absolute left-0 top-0 h-full bg-yellow-500 flex items-center justify-end pr-2"
                        style={{ width: `${stats.totalTerritories > 0 ? (stats.inUseTerritories / stats.totalTerritories * 100) : 0}%` }}
                      >
                        <span className="text-xs font-medium text-white">{stats.inUseTerritories}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center">
                    <div className="w-32 text-sm text-gray-600">Completados</div>
                    <div className="flex-1 bg-gray-200 rounded-full h-6 relative overflow-hidden">
                      <div 
                        className="absolute left-0 top-0 h-full bg-gray-600 flex items-center justify-end pr-2"
                        style={{ width: `${stats.totalTerritories > 0 ? (stats.completedTerritories / stats.totalTerritories * 100) : 0}%` }}
                      >
                        <span className="text-xs font-medium text-white">{stats.completedTerritories}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {selectedStat === 'progress' && (
            <div className="space-y-6">
              {/* Filtros de fecha */}
              <div className="flex gap-2 justify-center">
                {['all', 'week', 'month', 'year'].map(filter => (
                  <button
                    key={filter}
                    onClick={() => setDateFilter(filter)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      dateFilter === filter
                        ? 'bg-gray-800 text-white'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    {filter === 'all' ? 'Todo' : 
                     filter === 'week' ? 'Semana' :
                     filter === 'month' ? 'Mes' : 'Año'}
                  </button>
                ))}
              </div>
              
              {/* Progreso general */}
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h4 className="text-base font-semibold text-gray-900 mb-4">
                  Progreso General del Trabajo
                  {dateFilter !== 'all' && ` - Último${dateFilter === 'week' ? 'a Semana' : dateFilter === 'month' ? ' Mes' : ' Año'}`}
                </h4>
                <div className="relative w-full bg-gray-200 rounded-full h-8 overflow-hidden mb-4">
                  <div
                    className="absolute left-0 top-0 h-full bg-gray-800 transition-all duration-1000 flex items-center justify-end pr-3"
                    style={{ width: `${stats.completionRate}%` }}
                  >
                    <span className="text-white text-sm font-bold">{stats.completionRate}%</span>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <p className="text-2xl font-bold text-green-600">{stats.visitedAddresses}</p>
                    <p className="text-xs text-gray-600">Visitadas</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-orange-600">{stats.pendingAddresses}</p>
                    <p className="text-xs text-gray-600">Pendientes</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-700">{stats.totalAddresses}</p>
                    <p className="text-xs text-gray-600">Total</p>
                  </div>
                </div>
              </div>
              
              {/* Publicadores con más territorios */}
              {stats.publisherStats.length > 0 && (
                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  <h4 className="text-base font-semibold text-gray-900 mb-4">Territorios por Publicador</h4>
                  <div className="space-y-2">
                    {stats.publisherStats.slice(0, 5).map(([name, count]) => (
                      <div key={name} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center">
                          <Icon name="user" size={16} className="mr-2 text-gray-500" />
                          <span className="font-medium text-gray-800">{name}</span>
                        </div>
                        <span className="px-3 py-1 bg-gray-200 text-gray-700 rounded-full text-sm font-semibold">
                          {count} {count === 1 ? 'territorio' : 'territorios'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
          
          {selectedStat === 'performance' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <StatCard
                  title="Tiempo Promedio"
                  value={stats.averageCompletionDays ? `${stats.averageCompletionDays} días` : 'N/A'}
                  subtitle="Para completar un territorio"
                  icon="clock"
                />
                <StatCard
                  title="Completados Último Mes"
                  value={stats.completionsLastMonth}
                  subtitle="Territorios completados"
                  icon="checkCircle"
                />
              </div>
              
              {/* Récords */}
              {(stats.fastestCompletion || stats.slowestCompletion) && (
                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  <h4 className="text-base font-semibold text-gray-900 mb-4">Récords de Completación</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {stats.fastestCompletion && (
                      <div className="bg-green-50 border border-green-200 p-4 rounded-lg">
                        <div className="flex items-center mb-2">
                          <Icon name="zap" size={20} className="text-green-600 mr-2" />
                          <h5 className="font-semibold text-green-900">Más Rápido</h5>
                        </div>
                        <p className="text-2xl font-bold text-green-700">{stats.fastestCompletion.days} días</p>
                        <p className="text-sm text-gray-600 mt-1">
                          {stats.fastestCompletion.territoryName} - {stats.fastestCompletion.assignedTo}
                        </p>
                      </div>
                    )}
                    {stats.slowestCompletion && (
                      <div className="bg-orange-50 border border-orange-200 p-4 rounded-lg">
                        <div className="flex items-center mb-2">
                          <Icon name="clock" size={20} className="text-orange-600 mr-2" />
                          <h5 className="font-semibold text-orange-900">Más Tiempo</h5>
                        </div>
                        <p className="text-2xl font-bold text-orange-700">{stats.slowestCompletion.days} días</p>
                        <p className="text-sm text-gray-600 mt-1">
                          {stats.slowestCompletion.territoryName} - {stats.slowestCompletion.assignedTo}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
};

export default StatsModal; 