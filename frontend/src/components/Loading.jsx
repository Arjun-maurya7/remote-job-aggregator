import React from 'react';

/**
 * Loading Component
 *
 * Renders skeleton card placeholders during API data fetching.
 */
export function Loading() {
  return (
    <div className="job-cards-stack" aria-busy="true" aria-label="Loading jobs">
      {[1, 2, 3].map((i) => (
        <div key={i} className="skeleton-card animate-pulse">
          <div className="flex items-start gap-4 mb-4">
            <div className="skeleton-box w-12 h-12 rounded-lg flex-shrink-0"></div>
            <div className="flex-1 space-y-2">
              <div className="skeleton-box h-5 w-1/2"></div>
              <div className="skeleton-box h-4 w-1/4"></div>
            </div>
          </div>
          <div className="flex gap-2 mb-4">
            <div className="skeleton-box h-5 w-20 rounded-full"></div>
            <div className="skeleton-box h-5 w-24 rounded-full"></div>
            <div className="skeleton-box h-5 w-16 rounded-full"></div>
          </div>
          <div className="skeleton-box h-4 w-full mb-2"></div>
          <div className="skeleton-box h-4 w-3/4 mb-4"></div>
          <div className="flex items-center justify-between pt-3 border-t border-slate-100">
            <div className="skeleton-box h-4 w-1/3"></div>
            <div className="skeleton-box h-8 w-24 rounded-md"></div>
          </div>
        </div>
      ))}
    </div>
  );
}
