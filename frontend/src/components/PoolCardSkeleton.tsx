import React from 'react';

const PoolCardSkeleton: React.FC = () => {
  return (
    <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/20 animate-pulse">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="flex items-center -space-x-2">
            <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
            <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
          </div>
          <div>
            <div className="h-5 bg-gray-200 rounded w-24 mb-2"></div>
            <div className="h-3 bg-gray-200 rounded w-16"></div>
          </div>
        </div>
        <div className="h-6 bg-gray-200 rounded-full w-16"></div>
      </div>

      {/* Pool Type Badge */}
      <div className="mb-4">
        <div className="h-6 bg-gray-200 rounded-full w-20"></div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-gray-100 rounded-xl p-3">
          <div className="h-3 bg-gray-200 rounded w-16 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-12"></div>
        </div>
        <div className="bg-gray-100 rounded-xl p-3">
          <div className="h-3 bg-gray-200 rounded w-16 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-12"></div>
        </div>
        <div className="bg-gray-100 rounded-xl p-3">
          <div className="h-3 bg-gray-200 rounded w-16 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-12"></div>
        </div>
        <div className="bg-gray-100 rounded-xl p-3">
          <div className="h-3 bg-gray-200 rounded w-16 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-12"></div>
        </div>
      </div>

      {/* Pool Address */}
      <div className="mb-4 p-3 bg-gray-50 rounded-xl">
        <div className="h-3 bg-gray-200 rounded w-20 mb-2"></div>
        <div className="h-3 bg-gray-200 rounded w-full"></div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between">
        <div className="h-4 bg-gray-200 rounded w-24"></div>
        <div className="h-8 bg-gray-200 rounded-xl w-32"></div>
      </div>
    </div>
  );
};

export default PoolCardSkeleton; 