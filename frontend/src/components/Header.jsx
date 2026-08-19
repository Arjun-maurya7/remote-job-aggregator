import React from 'react';
import { Briefcase, RefreshCw, CheckCircle2, AlertCircle, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';

/**
 * Header Component
 *
 * Premium floating glass navigation bar with animated brand logo,
 * shimmer sync button, and toast notification system.
 */
export function Header({ onSync, isSyncing, syncResult, syncError }) {
  return (
    <header className="glass-header">
      <div className="header-inner">
        {/* Left Brand Identity */}
        <Link to="/" className="brand-link">
          <div className="brand-logo-box">
            <Briefcase className="w-5 h-5 text-white" />
          </div>
          <div className="brand-info">
            <div className="brand-heading-row">
              <span className="brand-name">JobFinder</span>
              <span className="brand-tag">
                <Sparkles className="w-3 h-3" />
                <span>2026</span>
              </span>
            </div>
            <p className="brand-tagline">Remote jobs, all in one place</p>
          </div>
        </Link>

        {/* Right Actions */}
        <div className="header-actions">
          <button
            onClick={onSync}
            disabled={isSyncing}
            className="btn-sync-glass"
            title="Fetch latest remote jobs from Jobicy API"
            aria-label="Sync Jobs from Jobicy"
          >
            <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} style={{ color: isSyncing ? '#818cf8' : undefined }} />
            <span>{isSyncing ? 'Syncing...' : 'Sync Jobs'}</span>
          </button>
        </div>
      </div>

      {/* Toast Notifications */}
      {syncResult && (
        <div className="toast-container">
          <div className="toast-glass success" role="status">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            <span>
              <strong>Jobs synced:</strong> {syncResult.fetched} fetched (
              <strong>{syncResult.inserted}</strong> new, <strong>{syncResult.updated}</strong> updated)
            </span>
          </div>
        </div>
      )}

      {syncError && (
        <div className="toast-container">
          <div className="toast-glass error" role="alert">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>Sync failed: {syncError}</span>
          </div>
        </div>
      )}
    </header>
  );
}
