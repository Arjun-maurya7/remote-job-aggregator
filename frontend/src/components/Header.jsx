import React from 'react';
import { Briefcase, RefreshCw, CheckCircle2, AlertCircle } from 'lucide-react';

/**
 * Header Component
 *
 * Top navigation bar displaying branding title, subtitle, and Sync Jobs button.
 */
export function Header({ onSync, isSyncing, syncResult, syncError }) {
  return (
    <header className="header-container">
      <div className="header-content">
        <div className="brand-section">
          <div className="brand-logo-icon">
            <Briefcase className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="brand-title">JobFinder</h1>
            <p className="brand-subtitle">Find your next remote opportunity</p>
          </div>
        </div>

        <div className="header-actions">
          <button
            onClick={onSync}
            disabled={isSyncing}
            className="sync-button"
            title="Trigger batch job ingestion from Jobicy API"
            aria-label="Sync Jobs from Jobicy"
          >
            <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>{isSyncing ? 'Syncing...' : 'Sync Jobs'}</span>
          </button>
        </div>
      </div>

      {/* Sync Toast Feedback */}
      {syncResult && (
        <div className="sync-toast success">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          <span>
            Jobs synced successfully: <strong>{syncResult.fetched}</strong> fetched (
            <strong>{syncResult.inserted}</strong> new, <strong>{syncResult.updated}</strong> updated)
          </span>
        </div>
      )}

      {syncError && (
        <div className="sync-toast error">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>Sync failed: {syncError}</span>
        </div>
      )}
    </header>
  );
}
