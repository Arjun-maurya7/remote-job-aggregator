import React from 'react';

/**
 * Loading Skeleton Component
 *
 * Dark-themed skeleton job cards with animated shimmer wave,
 * matching the glass-card structure of JobCard.
 */
export function Loading() {
  return (
    <div className="job-cards-stack" aria-busy="true" aria-label="Loading job listings">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <div key={i} className="glass-skeleton-card animate-shimmer">
          <div className="skeleton-top-bar">
            <div className="skeleton-avatar-box" />
            <div className="skeleton-text-group">
              <div className="skeleton-line-title" />
              <div className="skeleton-line-sub" />
            </div>
          </div>
          <div className="skeleton-pills-bar">
            <div className="skeleton-pill" />
            <div className="skeleton-pill" style={{ width: '96px' }} />
            <div className="skeleton-pill" style={{ width: '64px' }} />
          </div>
          <div className="skeleton-line-body" />
          <div className="skeleton-line-body" style={{ width: '80%' }} />
          <div className="skeleton-line-body" style={{ width: '60%' }} />
          <div className="skeleton-footer-bar">
            <div className="skeleton-line-sub" style={{ width: '40%' }} />
            <div style={{ display: 'flex', gap: '8px' }}>
              <div className="skeleton-btn-box" />
              <div className="skeleton-btn-box" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
