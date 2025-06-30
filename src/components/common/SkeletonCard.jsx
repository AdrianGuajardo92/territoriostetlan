import React from 'react';

const SkeletonCard = () => {
  return (
    <div className="bg-white rounded-2xl border-2 border-gray-200 p-6 loading-premium animate-premium-fade-scale">
      <div className="flex items-start justify-between mb-4">
        <div className="h-8 bg-gray-200 rounded-md w-24 loading-skeleton"></div>
        <div className="h-8 w-8 bg-gray-200 rounded-lg loading-skeleton"></div>
      </div>
      
              <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="h-4 bg-gray-200 rounded w-16 loading-skeleton"></div>
          <div className="h-4 bg-gray-200 rounded w-20 loading-skeleton"></div>
        </div>
        
        <div className="flex items-center justify-between">
          <div className="h-4 bg-gray-200 rounded w-20 loading-skeleton"></div>
          <div className="h-4 bg-gray-200 rounded w-32 loading-skeleton"></div>
        </div>
        
        <div className="flex items-center justify-between">
          <div className="h-4 bg-gray-200 rounded w-16 loading-skeleton"></div>
          <div className="h-4 bg-gray-200 rounded w-24 loading-skeleton"></div>
        </div>
      </div>
      
      <div className="mt-4 pt-4 border-t border-gray-200">
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 bg-gray-200 rounded-full loading-skeleton"></div>
          <div className="h-3 bg-gray-200 rounded w-28 loading-skeleton"></div>
        </div>
      </div>
    </div>
  );
};

export default SkeletonCard; 