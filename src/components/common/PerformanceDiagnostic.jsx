import React, { useState, useEffect } from 'react';
import { PerformanceMonitor } from '../../utils/performanceOptimizer';

const PerformanceDiagnostic = ({ isOpen, onClose }) => {
  const [metrics, setMetrics] = useState(null);
  const [sessionMetrics, setSessionMetrics] = useState(null);

  useEffect(() => {
    if (isOpen) {
      // Obtener métricas históricas
      const historical = PerformanceMonitor.getHistoricalMetrics();
      setMetrics(historical);

      // Obtener métricas de la sesión actual
      const session = PerformanceMonitor.getSessionMetrics();
      setSessionMetrics(session);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[80vh] overflow-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900">
              📊 Diagnóstico FASE 1 - Performance
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-2xl"
            >
              ×
            </button>
          </div>

          {/* Métricas de Login */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-3 text-blue-600">
              ⚡ Métricas de Login
            </h3>
            {metrics ? (
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-green-50 p-4 rounded-lg">
                  <div className="text-sm text-green-600">Promedio Login</div>
                  <div className="text-2xl font-bold text-green-800">
                    {metrics.averageLoginTime.toFixed(0)}ms
                  </div>
                </div>
                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="text-sm text-blue-600">Login Más Rápido</div>
                  <div className="text-2xl font-bold text-blue-800">
                    {metrics.fastestLogin.toFixed(0)}ms
                  </div>
                </div>
                <div className="bg-purple-50 p-4 rounded-lg">
                  <div className="text-sm text-purple-600">Total Logins</div>
                  <div className="text-2xl font-bold text-purple-800">
                    {metrics.totalLogins}
                  </div>
                </div>
                <div className="bg-yellow-50 p-4 rounded-lg">
                  <div className="text-sm text-yellow-600">Últimos 10</div>
                  <div className="text-2xl font-bold text-yellow-800">
                    {metrics.last10Average.toFixed(0)}ms
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-gray-500 text-center py-4">
                No hay datos de login aún. Inicia sesión para ver métricas.
              </div>
            )}
          </div>

          {/* Métricas de Sesión */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-3 text-green-600">
              🚀 Métricas de Carga
            </h3>
            {sessionMetrics && (
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="text-sm text-gray-600">Carga de Página</div>
                  <div className="text-xl font-bold text-gray-800">
                    {sessionMetrics.pageLoad}ms
                  </div>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="text-sm text-gray-600">Primer Pintado</div>
                  <div className="text-xl font-bold text-gray-800">
                    {sessionMetrics.firstPaint.toFixed(0)}ms
                  </div>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="text-sm text-gray-600">Memoria Dispositivo</div>
                  <div className="text-xl font-bold text-gray-800">
                    {sessionMetrics.deviceMemory}GB
                  </div>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="text-sm text-gray-600">Conexión</div>
                  <div className="text-xl font-bold text-gray-800">
                    {sessionMetrics.connection?.effectiveType || 'Desconocida'}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Criterios de Éxito FASE 1 */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-3 text-red-600">
              🎯 Criterios de Éxito FASE 1
            </h3>
            <div className="space-y-2">
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span>Login &lt; 1000ms</span>
                <span className={`font-bold ${
                  metrics && metrics.averageLoginTime < 1000 
                    ? 'text-green-600' : 'text-red-600'
                }`}>
                  {metrics ? 
                    (metrics.averageLoginTime < 1000 ? '✅ PASÓ' : '❌ FALTA') 
                    : '⏳ PENDIENTE'
                  }
                </span>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span>Carga inicial &lt; 3000ms</span>
                <span className={`font-bold ${
                  sessionMetrics && sessionMetrics.firstContentfulPaint < 3000 
                    ? 'text-green-600' : 'text-red-600'
                }`}>
                  {sessionMetrics ? 
                    (sessionMetrics.firstContentfulPaint < 3000 ? '✅ PASÓ' : '❌ FALTA') 
                    : '⏳ PENDIENTE'
                  }
                </span>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span>Sin errores en consola</span>
                <span className="font-bold text-yellow-600">🔍 REVISAR MANUALMENTE</span>
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              onClick={onClose}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PerformanceDiagnostic; 