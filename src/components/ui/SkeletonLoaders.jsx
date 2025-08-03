import React from 'react';

// Base skeleton component
const Skeleton = ({ className = '', width, height, ...props }) => (
  <div
    className={`animate-pulse bg-gray-200 rounded ${className}`}
    style={{ width, height }}
    {...props}
  />
);

// Dark mode skeleton
const SkeletonDark = ({ className = '', width, height, ...props }) => (
  <div
    className={`animate-pulse bg-slate-700 rounded ${className}`}
    style={{ width, height }}
    {...props}
  />
);

// Project card skeleton
export const ProjectCardSkeleton = ({ colorMode = false }) => {
  const SkeletonComponent = colorMode ? SkeletonDark : Skeleton;
  
  return (
    <div className={`${colorMode ? 'bg-slate-800 border-slate-600' : 'bg-white border-gray-200'} border rounded-lg shadow-sm p-4 space-y-4`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <SkeletonComponent className="w-6 h-6 rounded-full" />
          <SkeletonComponent className="h-5 w-20" />
          <SkeletonComponent className="h-4 w-16" />
          <SkeletonComponent className="h-4 w-12" />
        </div>
      </div>
      
      {/* Customer info */}
      <div className="space-y-2">
        <SkeletonComponent className="h-4 w-32" />
        <div className="flex items-center gap-4">
          <SkeletonComponent className="h-3 w-24" />
          <SkeletonComponent className="h-3 w-32" />
        </div>
        <SkeletonComponent className="h-3 w-48" />
      </div>
      
      {/* Progress bar */}
      <div className="space-y-2">
        <div className="flex justify-between">
          <SkeletonComponent className="h-3 w-16" />
          <SkeletonComponent className="h-3 w-8" />
        </div>
        <SkeletonComponent className="h-3 w-full" />
      </div>
      
      {/* Contact cards */}
      <div className="grid grid-cols-3 gap-2">
        {[1, 2, 3].map(i => (
          <div key={i} className={`p-2 rounded border ${colorMode ? 'bg-slate-700 border-slate-600' : 'bg-gray-50 border-gray-200'}`}>
            <SkeletonComponent className="h-3 w-16 mb-2" />
            <SkeletonComponent className="h-2 w-20 mb-1" />
            <SkeletonComponent className="h-2 w-24" />
          </div>
        ))}
      </div>
      
      {/* Action buttons */}
      <div className="grid grid-cols-3 gap-2">
        {[1, 2, 3, 4, 5, 6].map(i => (
          <SkeletonComponent key={i} className="h-12 w-full" />
        ))}
      </div>
    </div>
  );
};

// Simple list item skeleton
export const ListItemSkeleton = ({ colorMode = false }) => {
  const SkeletonComponent = colorMode ? SkeletonDark : Skeleton;
  
  return (
    <div className={`${colorMode ? 'bg-slate-800 border-slate-600' : 'bg-white border-gray-200'} border rounded-lg p-4`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <SkeletonComponent className="w-8 h-8 rounded-full" />
          <div className="space-y-1">
            <SkeletonComponent className="h-4 w-32" />
            <SkeletonComponent className="h-3 w-24" />
          </div>
        </div>
        <SkeletonComponent className="h-3 w-16" />
      </div>
    </div>
  );
};

// Table skeleton
export const TableSkeleton = ({ rows = 5, columns = 4, colorMode = false }) => {
  const SkeletonComponent = colorMode ? SkeletonDark : Skeleton;
  
  return (
    <div className={`${colorMode ? 'bg-slate-800 border-slate-600' : 'bg-white border-gray-200'} border rounded-lg overflow-hidden`}>
      {/* Header */}
      <div className={`${colorMode ? 'bg-slate-700' : 'bg-gray-50'} p-4 border-b ${colorMode ? 'border-slate-600' : 'border-gray-200'}`}>
        <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
          {Array.from({ length: columns }).map((_, i) => (
            <SkeletonComponent key={i} className="h-4 w-20" />
          ))}
        </div>
      </div>
      
      {/* Rows */}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className={`p-4 border-b ${colorMode ? 'border-slate-600' : 'border-gray-200'} last:border-b-0`}>
          <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
            {Array.from({ length: columns }).map((_, colIndex) => (
              <SkeletonComponent key={colIndex} className="h-4 w-full" />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

// Activity feed skeleton
export const ActivityFeedSkeleton = ({ items = 5, colorMode = false }) => {
  const SkeletonComponent = colorMode ? SkeletonDark : Skeleton;
  
  return (
    <div className="space-y-4">
      {Array.from({ length: items }).map((_, i) => (
        <div key={i} className={`${colorMode ? 'bg-slate-800 border-slate-600' : 'bg-white border-gray-200'} border rounded-lg p-4`}>
          <div className="flex items-start gap-3">
            <SkeletonComponent className="w-8 h-8 rounded-full flex-shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="flex items-center justify-between">
                <SkeletonComponent className="h-4 w-24" />
                <SkeletonComponent className="h-3 w-16" />
              </div>
              <SkeletonComponent className="h-3 w-full" />
              <SkeletonComponent className="h-3 w-3/4" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

// Dashboard stats skeleton
export const DashboardStatsSkeleton = ({ colorMode = false }) => {
  const SkeletonComponent = colorMode ? SkeletonDark : Skeleton;
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {[1, 2, 3, 4].map(i => (
        <div key={i} className={`${colorMode ? 'bg-slate-800 border-slate-600' : 'bg-white border-gray-200'} border rounded-lg p-6`}>
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <SkeletonComponent className="h-4 w-20" />
              <SkeletonComponent className="h-8 w-16" />
              <SkeletonComponent className="h-3 w-24" />
            </div>
            <SkeletonComponent className="w-12 h-12 rounded-lg" />
          </div>
        </div>
      ))}
    </div>
  );
};

// Search results skeleton
export const SearchResultsSkeleton = ({ items = 3, colorMode = false }) => {
  const SkeletonComponent = colorMode ? SkeletonDark : Skeleton;
  
  return (
    <div className="space-y-2">
      {Array.from({ length: items }).map((_, i) => (
        <div key={i} className={`${colorMode ? 'bg-slate-800 border-slate-600' : 'bg-white border-gray-200'} border rounded-lg p-3`}>
          <div className="flex items-center gap-3">
            <SkeletonComponent className="w-6 h-6 rounded" />
            <div className="flex-1 space-y-1">
              <SkeletonComponent className="h-4 w-32" />
              <SkeletonComponent className="h-3 w-48" />
            </div>
            <SkeletonComponent className="h-3 w-12" />
          </div>
        </div>
      ))}
    </div>
  );
};

// Generic content skeleton
export const ContentSkeleton = ({ lines = 3, colorMode = false }) => {
  const SkeletonComponent = colorMode ? SkeletonDark : Skeleton;
  
  return (
    <div className="space-y-3">
      {Array.from({ length: lines }).map((_, i) => (
        <SkeletonComponent 
          key={i} 
          className={`h-4 ${i === lines - 1 ? 'w-3/4' : 'w-full'}`} 
        />
      ))}
    </div>
  );
};

// Form skeleton
export const FormSkeleton = ({ fields = 4, colorMode = false }) => {
  const SkeletonComponent = colorMode ? SkeletonDark : Skeleton;
  
  return (
    <div className="space-y-4">
      {Array.from({ length: fields }).map((_, i) => (
        <div key={i} className="space-y-2">
          <SkeletonComponent className="h-4 w-24" />
          <SkeletonComponent className="h-10 w-full" />
        </div>
      ))}
      <div className="flex justify-end gap-2 mt-6">
        <SkeletonComponent className="h-10 w-20" />
        <SkeletonComponent className="h-10 w-24" />
      </div>
    </div>
  );
};

// Error state component
export const ErrorState = ({ 
  message = "Something went wrong", 
  onRetry, 
  colorMode = false 
}) => (
  <div className={`${colorMode ? 'bg-slate-800 border-slate-600' : 'bg-white border-gray-200'} border rounded-lg p-8 text-center`}>
    <div className="mb-4">
      <svg className="w-12 h-12 text-red-400 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
      </svg>
    </div>
    <h3 className={`text-lg font-semibold ${colorMode ? 'text-white' : 'text-gray-900'} mb-2`}>
      Oops! Something went wrong
    </h3>
    <p className={`${colorMode ? 'text-gray-300' : 'text-gray-600'} mb-4`}>
      {message}
    </p>
    {onRetry && (
      <button
        onClick={onRetry}
        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
      >
        Try Again
      </button>
    )}
  </div>
);

// Empty state component
export const EmptyState = ({ 
  title = "No data found", 
  description = "There's nothing here yet.", 
  action,
  colorMode = false 
}) => (
  <div className={`${colorMode ? 'bg-slate-800 border-slate-600' : 'bg-white border-gray-200'} border rounded-lg p-8 text-center`}>
    <div className="mb-4">
      <svg className="w-12 h-12 text-gray-400 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
      </svg>
    </div>
    <h3 className={`text-lg font-semibold ${colorMode ? 'text-white' : 'text-gray-900'} mb-2`}>
      {title}
    </h3>
    <p className={`${colorMode ? 'text-gray-300' : 'text-gray-600'} mb-4`}>
      {description}
    </p>
    {action}
  </div>
);

export default {
  ProjectCardSkeleton,
  ListItemSkeleton,
  TableSkeleton,
  ActivityFeedSkeleton,
  DashboardStatsSkeleton,
  SearchResultsSkeleton,
  ContentSkeleton,
  FormSkeleton,
  ErrorState,
  EmptyState,
};