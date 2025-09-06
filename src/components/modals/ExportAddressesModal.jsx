import React from 'react';
import Icon from '../common/Icon';

const ExportAddressesModal = ({ 
  isOpen, 
  onClose, 
  onExportComplete, 
  onExportSimplified 
}) => {
  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[10002]"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="fixed inset-0 z-[10003] flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full transform pointer-events-auto">
          {/* Header */}
          <div className="bg-gradient-to-r from-purple-600 to-pink-600 p-6 rounded-t-2xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                  <Icon name="download" className="text-2xl text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white">Exportar Direcciones</h2>
                  <p className="text-white/80 text-sm">Selecciona el formato de exportación</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="w-10 h-10 bg-white/20 hover:bg-white/30 rounded-xl flex items-center justify-center transition-colors"
              >
                <Icon name="x" className="text-xl text-white" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="p-6 space-y-4">
            {/* Opción 1: Exportación Completa */}
            <button
              onClick={() => {
                onExportComplete();
                onClose();
              }}
              className="w-full group relative overflow-hidden bg-gradient-to-r from-blue-50 to-indigo-100 hover:from-blue-100 hover:to-indigo-200 border-2 border-blue-200 hover:border-blue-300 rounded-xl p-5 transition-all transform hover:scale-[1.02] hover:shadow-lg"
            >
              <div className="relative z-10">
                <div className="flex items-start gap-4">
                  <div className="w-14 h-14 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg">
                    <Icon name="database" className="text-2xl text-white" />
                  </div>
                  <div className="text-left flex-1">
                    <h3 className="text-lg font-bold text-gray-900 mb-1">
                      Exportación Completa
                    </h3>
                    <p className="text-sm text-gray-600 leading-relaxed">
                      Incluye <span className="font-semibold">todos los campos y datos</span> de cada dirección. 
                      Ideal para respaldos detallados y análisis completo.
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <span className="inline-flex items-center px-2.5 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                        <Icon name="check" className="text-xs mr-1" />
                        Datos completos
                      </span>
                      <span className="inline-flex items-center px-2.5 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                        <Icon name="check" className="text-xs mr-1" />
                        Respaldo total
                      </span>
                      <span className="inline-flex items-center px-2.5 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                        <Icon name="check" className="text-xs mr-1" />
                        Incluye notas
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              {/* Efecto hover */}
              <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-indigo-500 opacity-0 group-hover:opacity-10 transition-opacity" />
            </button>

            {/* Opción 2: Exportación Simplificada */}
            <button
              onClick={() => {
                onExportSimplified();
                onClose();
              }}
              className="w-full group relative overflow-hidden bg-gradient-to-r from-green-50 to-emerald-100 hover:from-green-100 hover:to-emerald-200 border-2 border-green-200 hover:border-green-300 rounded-xl p-5 transition-all transform hover:scale-[1.02] hover:shadow-lg"
            >
              <div className="relative z-10">
                <div className="flex items-start gap-4">
                  <div className="w-14 h-14 bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg">
                    <Icon name="fileText" className="text-2xl text-white" />
                  </div>
                  <div className="text-left flex-1">
                    <h3 className="text-lg font-bold text-gray-900 mb-1">
                      Exportación Simplificada
                      <span className="ml-2 inline-flex items-center px-2 py-0.5 bg-green-500 text-white rounded-full text-xs font-bold">
                        PARA CAMPAÑAS
                      </span>
                    </h3>
                    <p className="text-sm text-gray-600 leading-relaxed">
                      Incluye <span className="font-semibold">únicamente el territorio y la dirección</span>. 
                      Lista limpia y precisa, lista para imprimir o usar directamente.
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <span className="inline-flex items-center px-2.5 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                        <Icon name="check" className="text-xs mr-1" />
                        Formato limpio
                      </span>
                      <span className="inline-flex items-center px-2.5 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                        <Icon name="check" className="text-xs mr-1" />
                        Listo para usar
                      </span>
                      <span className="inline-flex items-center px-2.5 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                        <Icon name="check" className="text-xs mr-1" />
                        Solo lo esencial
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              {/* Efecto hover */}
              <div className="absolute inset-0 bg-gradient-to-r from-green-400 to-emerald-500 opacity-0 group-hover:opacity-10 transition-opacity" />
            </button>

            {/* Nota informativa */}
            <div className="mt-6 p-4 bg-gray-50 rounded-xl border border-gray-200">
              <div className="flex items-start gap-3">
                <Icon name="info" className="text-gray-400 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-gray-600">
                  <p className="font-medium text-gray-700 mb-1">Nota importante:</p>
                  <p>Ambos formatos mantendrán las direcciones <span className="font-semibold">ordenadas por territorio</span> de forma ascendente (Territorio 1, 2, 3...).</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default ExportAddressesModal;