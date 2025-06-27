import React from 'react';

const TerritoryFilters = ({ filterStatus, setFilterStatus, stats, userHasAssignedTerritories }) => {
  return (
    <div className="px-4 pb-4">
      <div className="flex items-stretch gap-3">
        <button
          onClick={() => setFilterStatus('all')}
          title={`Todos (${stats.total})`}
          className={`flex-shrink-0 w-14 h-20 flex flex-col items-center justify-center rounded-2xl transition-all duration-300 transform hover:scale-105 ${
            filterStatus === 'all' 
              ? 'bg-gradient-to-br from-gray-700 to-gray-900 text-white shadow-lg scale-105' 
              : 'bg-white text-gray-600 shadow-md hover:shadow-lg'
          }`}
        >
          <svg className="w-6 h-6 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
          </svg>
          <span className="text-xs font-bold">{stats.total}</span>
        </button>
        
        <div className="flex-1 grid grid-cols-3 gap-3">
          <button
            onClick={() => setFilterStatus('disponible')}
            className={`relative p-3 text-center rounded-2xl transition-all duration-300 transform hover:scale-105 overflow-hidden ${
              filterStatus === 'disponible' 
                ? 'bg-gradient-to-br from-emerald-500 to-green-600 text-white shadow-lg scale-105' 
                : 'bg-white hover:bg-green-50 shadow-md hover:shadow-lg'
            }`}
          >
            {filterStatus === 'disponible' && (
              <div className="absolute inset-0 bg-white/20 blur-xl"></div>
            )}
            <div className="relative">
              <svg className={`w-6 h-6 mx-auto ${filterStatus === 'disponible' ? 'text-white' : 'text-emerald-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <p className={`font-bold text-lg mt-1 ${filterStatus === 'disponible' ? 'text-white' : 'text-gray-900'}`}>
                {stats.available}
              </p>
            </div>
          </button>
          
          <button
            onClick={() => setFilterStatus('en uso')}
            className={`relative p-3 text-center rounded-2xl transition-all duration-300 transform hover:scale-105 overflow-hidden ${
              filterStatus === 'en uso' 
                ? 'bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-lg scale-105' 
                : 'bg-white hover:bg-amber-50 shadow-md hover:shadow-lg'
            }`}
          >
            {userHasAssignedTerritories && (
              <span className="absolute top-2 right-2 w-3 h-3 bg-blue-500 rounded-full ring-2 ring-white shadow-lg animate-pulse"></span>
            )}
            {filterStatus === 'en uso' && (
              <div className="absolute inset-0 bg-white/20 blur-xl"></div>
            )}
            <div className="relative">
              <svg className={`w-6 h-6 mx-auto ${filterStatus === 'en uso' ? 'text-white' : 'text-amber-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              <p className={`font-bold text-lg mt-1 ${filterStatus === 'en uso' ? 'text-white' : 'text-gray-900'}`}>
                {stats.inUse}
              </p>
            </div>
          </button>
          
          <button
            onClick={() => setFilterStatus('terminado')}
            className={`relative p-3 text-center rounded-2xl transition-all duration-300 transform hover:scale-105 overflow-hidden ${
              filterStatus === 'terminado' 
                ? 'bg-gradient-to-br from-rose-500 to-red-600 text-white shadow-lg scale-105' 
                : 'bg-white hover:bg-red-50 shadow-md hover:shadow-lg'
            }`}
          >
            {filterStatus === 'terminado' && (
              <div className="absolute inset-0 bg-white/20 blur-xl"></div>
            )}
            <div className="relative">
              <svg className={`w-6 h-6 mx-auto ${filterStatus === 'terminado' ? 'text-white' : 'text-rose-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className={`font-bold text-lg mt-1 ${filterStatus === 'terminado' ? 'text-white' : 'text-gray-900'}`}>
                {stats.completed}
              </p>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};

export default TerritoryFilters; 