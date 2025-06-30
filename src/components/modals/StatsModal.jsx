import React, { useState, useMemo } from 'react';
import Modal from '../common/Modal';
import Icon from '../common/Icon';
import { useApp } from '../../context/AppContext';

const StatsModal = ({ isOpen, onClose }) => {
  const { territories, addresses, territoryHistory } = useApp();
  const [selectedStat, setSelectedStat] = useState('overview');
  
  const stats = useMemo(() => {
    if (!territories || !addresses) return null;
    
    const now = new Date();
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
    
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
    
    return {
      ...basic,
      ...timeStats,
      activePublishers: activePublishers.length,
      publisherStats: Object.entries(publisherStats).sort((a, b) => b[1] - a[1])
    };
  }, [territories, addresses, territoryHistory]);
  
  if (!stats) return null;
  
  const StatCard = ({ title, value, subtitle, icon, trend }) => (
    <div className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-sm transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-600 mb-1">{title}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
          {trend !== undefined && (
            <div className={`flex items-center mt-2 text-xs ${trend > 0 ? 'text-green-600' : 'text-red-600'}`}>
              <Icon name={trend > 0 ? 'trendingUp' : 'trendingDown'} size={14} className="mr-1" />
              <span>{Math.abs(trend)}% vs mes anterior</span>
            </div>
          )}
        </div>
        <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center ml-4">
          <Icon name={icon} size={20} className="text-gray-600" />
        </div>
      </div>
    </div>
  );
  
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="" size="2xl">
      <div className="flex flex-col h-full">
        {/* Header personalizado */}
        <div className="bg-gray-50 border-b border-gray-200 p-6 pb-0">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-800">Estadísticas Generales</h2>
            <button 
              onClick={onClose}
              className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
            >
              <Icon name="x" size={20} className="text-gray-600" />
            </button>
          </div>
          
          {/* Tabs minimalistas */}
          <div className="flex space-x-1">
            {[
              { id: 'overview', label: 'Vista General', icon: 'activity' },
              { id: 'progress', label: 'Progreso', icon: 'barChart' },
              { id: 'performance', label: 'Rendimiento', icon: 'clock' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setSelectedStat(tab.id)}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 font-medium text-sm transition-all border-b-2 ${
                  selectedStat === tab.id 
                    ? 'text-gray-900 border-gray-800 bg-white' 
                    : 'text-gray-500 border-transparent hover:text-gray-700'
                }`}
              >
                <Icon name={tab.icon} size={16} />
                {tab.label}
              </button>
            ))}
          </div>
        </div>
        
        {/* Contenido scrolleable */}
        <div className="flex-1 overflow-y-auto p-6">
          {selectedStat === 'overview' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <StatCard
                  title="Total de Territorios"
                  value={stats.totalTerritories}
                  icon="mapPin"
                />
                <StatCard
                  title="Total de Direcciones"
                  value={stats.totalAddresses}
                  icon="home"
                />
                <StatCard
                  title="Publicadores Activos"
                  value={stats.activePublishers}
                  subtitle={`${stats.inUseTerritories} territorios asignados`}
                  icon="users"
                />
                <StatCard
                  title="Tasa de Utilización"
                  value={`${stats.territoryUtilization}%`}
                  subtitle="Territorios en uso"
                  icon="activity"
                />
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
              {/* Progreso general */}
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h4 className="text-base font-semibold text-gray-900 mb-4">Progreso General del Trabajo</h4>
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