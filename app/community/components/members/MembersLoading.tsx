import React from 'react';

interface MembersLoadingProps {
  itemCount?: number;
}

export const MembersLoading: React.FC<MembersLoadingProps> = ({ itemCount = 6 }) => {
  const skeletonIds = React.useMemo(
    () => Array.from({ length: itemCount }, (_, i) => `skeleton-${i}`),
    [itemCount]
  );

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {skeletonIds.map((id) => (
          <div
            key={id}
            className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-6 animate-pulse"
          >
            <div className="flex items-center space-x-4 mb-4">
              <div className="w-16 h-16 bg-gray-200 dark:bg-slate-700 rounded-full" />
              <div className="flex-1">
                <div className="h-4 bg-gray-200 dark:bg-slate-700 rounded w-3/4 mb-2" />
                <div className="h-3 bg-gray-200 dark:bg-slate-700 rounded w-1/2" />
              </div>
            </div>
            <div className="space-y-2">
              <div className="h-3 bg-gray-200 dark:bg-slate-700 rounded" />
              <div className="h-3 bg-gray-200 dark:bg-slate-700 rounded w-5/6" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
