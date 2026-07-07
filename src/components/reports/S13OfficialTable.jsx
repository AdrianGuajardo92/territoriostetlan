import React from 'react';

const formatDisplayDate = (date) => {
  if (!date) return '-';
  const d = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(d.getTime())) return '-';
  return d.toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: '2-digit' });
};

const COLUMN_COLORS = ['bg-blue-50', 'bg-green-50', 'bg-yellow-50', 'bg-purple-50'];

const AssignmentCells = ({ assignments = [] }) => (
  <>
    {COLUMN_COLORS.map((colorClass, index) => {
      const assignment = assignments[index];
      return (
        <React.Fragment key={index}>
          <td className={`border border-gray-300 px-2 py-2 text-left text-xs ${colorClass} ${assignment?.assignedTo ? 'text-gray-800' : 'text-gray-300'}`}>
            {assignment?.assignedTo || '-'}
          </td>
          <td className={`border border-gray-300 px-2 py-2 text-center text-xs ${colorClass} ${assignment?.assignedDate ? 'text-gray-600' : 'text-gray-300'}`}>
            {formatDisplayDate(assignment?.assignedDate)}
          </td>
          <td className={`border border-gray-300 px-2 py-2 text-center text-xs ${colorClass} ${assignment?.completedDate ? 'font-medium text-green-600' : 'text-gray-300'}`}>
            {formatDisplayDate(assignment?.completedDate)}
          </td>
        </React.Fragment>
      );
    })}
  </>
);

const S13OfficialTable = ({ rows = [], periodLabel = '', serviceYearLabel = '', compact = false }) => {
  if (rows.length === 0) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-12 text-center text-gray-500">
        <p className="font-medium">No hay datos para este período</p>
        {periodLabel ? <p className="mt-1 text-sm text-gray-400">{periodLabel}</p> : null}
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg">
      <div className="border-b border-gray-200 bg-slate-800 px-4 py-3 text-white">
        <h3 className="text-sm font-bold">Vista previa S-13</h3>
        <p className="text-xs text-white/70">
          {serviceYearLabel ? `Año de servicio (ref.): ${serviceYearLabel}` : null}
          {serviceYearLabel && periodLabel ? ' · ' : null}
          {periodLabel}
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className={`w-full ${compact ? 'text-[10px]' : 'text-sm'}`}>
          <thead>
            <tr className="bg-gray-100">
              <th rowSpan={2} className="sticky left-0 z-10 min-w-[72px] border border-gray-300 bg-gray-100 px-3 py-2 text-center font-semibold text-gray-700">
                Núm.<br />de terr.
              </th>
              <th rowSpan={2} className="min-w-[88px] border border-gray-300 px-3 py-2 text-center font-semibold text-gray-700">
                Última fecha<br />completado*
              </th>
              {COLUMN_COLORS.map((color, index) => (
                <th key={index} colSpan={3} className={`border border-gray-300 px-2 py-1 text-center font-semibold text-gray-700 ${color}`}>
                  Asignado a
                </th>
              ))}
            </tr>
            <tr className="bg-gray-50 text-xs">
              {COLUMN_COLORS.map((color, index) => (
                <React.Fragment key={index}>
                  <th className={`border border-gray-300 px-2 py-1 font-medium text-gray-600 ${color}`}>Nombre</th>
                  <th className={`border border-gray-300 px-2 py-1 font-medium text-gray-600 ${color}`}>Asignado</th>
                  <th className={`border border-gray-300 px-2 py-1 font-medium text-gray-600 ${color}`}>Completado</th>
                </React.Fragment>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr
                key={`${row.territoryId}-${row.pageChunkIndex}-${index}`}
                className={`${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'} ${row.isContinuation ? 'border-t-2 border-dashed border-slate-300' : ''}`}
              >
                <td className="sticky left-0 z-10 border border-gray-300 bg-inherit px-3 py-2 text-center font-semibold text-gray-800">
                  {row.territoryNumber || (row.isContinuation ? '↳' : '')}
                </td>
                <td className="border border-gray-300 px-3 py-2 text-center text-xs text-gray-600">
                  {formatDisplayDate(row.lastCompletedBefore)}
                </td>
                <AssignmentCells assignments={row.assignments} />
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="border-t border-gray-100 px-4 py-2 text-xs italic text-gray-500">
        *Cuando comience una nueva página, anote en esta columna la última fecha en que los territorios se completaron.
        {rows.some((row) => row.totalChunks > 1) ? (
          <span className="ml-2 font-medium not-italic text-amber-700">
            Hay territorios con más de 4 ciclos; se muestran en filas de continuación.
          </span>
        ) : null}
      </p>
    </div>
  );
};

export default S13OfficialTable;
