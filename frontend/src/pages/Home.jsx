import React, { useState, useEffect } from 'react';
import { Header } from '../components/Header';
import { SearchBar } from '../components/SearchBar';
import { Filters } from '../components/Filters';
import { JobCard } from '../components/JobCard';
import { Pagination } from '../components/Pagination';
import { Loading } from '../components/Loading';

import { getJobs, runIngestion } from '../services/api';
import { SearchX, ServerOff, RotateCcw } from 'lucide-react';

/**
 * Home Page Component
 *
 * Primary application dashboard with search, filter toolbar, results counter,
 * glass job card stack, loading skeletons, empty states, and error handling.
 */
export function Home() {
  const [data, setData] = useState({ items: [], page: 1, limit: 20, total: 0, pages: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [filters, setFilters] = useState({
    search: '',
    location: '',
    industry: '',
    employment_type: '',
    job_level: '',
    page: 1,
    limit: 20,
  });

  const [isSyncing, setIsSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState(null);
  const [syncError, setSyncError] = useState(null);

  useEffect(() => {
    let ignore = false;

    async function load() {
      setLoading(true);
      setError(null);

      try {
        const response = await getJobs(filters);
        if (!ignore) setData(response);
      } catch (err) {
        if (!ignore)
          setError(err.message || 'Unable to load jobs. Please check that the API server is running.');
      } finally {
        if (!ignore) setLoading(false);
      }
    }

    load();

    return () => {
      ignore = true;
    };
  }, [filters]);

  const handleSearch = (searchTerm) => {
    setFilters((prev) => ({
      ...prev,
      search: searchTerm,
      page: 1,
    }));
  };

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value,
      page: 1,
    }));
  };

  const handleResetFilters = () => {
    setFilters({
      search: '',
      location: '',
      industry: '',
      employment_type: '',
      job_level: '',
      page: 1,
      limit: 20,
    });
  };

  const handlePageChange = (newPage) => {
    setFilters((prev) => ({
      ...prev,
      page: newPage,
    }));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSyncJobs = async () => {
    setIsSyncing(true);
    setSyncResult(null);
    setSyncError(null);

    try {
      const result = await runIngestion();
      setSyncResult(result);
      setFilters((f) => ({ ...f }));
    } catch (err) {
      setSyncError(err.message || 'Sync failed.');
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="app-shell">
      {/* Floating Navbar */}
      <Header
        onSync={handleSyncJobs}
        isSyncing={isSyncing}
        syncResult={syncResult}
        syncError={syncError}
      />

      <main className="main-content-layout">
        {/* Hero & Search Header */}
        <SearchBar value={filters.search} onSearch={handleSearch} />

        {/* Filter Toolbar */}
        <Filters
          filters={filters}
          onChange={handleFilterChange}
          onReset={handleResetFilters}
        />

        {/* Results Header Summary Bar */}
        {!loading && !error && (
          <div className="results-header-container">
            <div>
              <h2 className="results-main-title">Remote opportunities</h2>
              <p className="results-count-text">
                {data.total} {data.total === 1 ? 'job available' : 'jobs available'}
                {filters.search && <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}> for "{filters.search}"</span>}
              </p>
            </div>

            <div className="results-live-indicator">
              <span className="live-dot-small" />
              <span>Updated from Jobicy</span>
            </div>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="state-card-wrapper" role="alert">
            <div className="glass-state-card error">
              <div className="state-icon-box error">
                <ServerOff className="w-6 h-6" />
              </div>
              <h3 className="state-card-title">Unable to load jobs</h3>
              <p className="state-card-message">
                Something went wrong while fetching opportunities from the API. Please try again.
              </p>
              <button onClick={() => setFilters((f) => ({ ...f }))} className="btn-gradient-primary">
                Try again
              </button>
            </div>
          </div>
        )}

        {/* Loading Skeletons */}
        {loading && <Loading />}

        {/* Empty Result State */}
        {!loading && !error && data.items.length === 0 && (
          <div className="state-card-wrapper">
            <div className="glass-state-card empty">
              <div className="state-icon-box empty">
                <SearchX className="w-6 h-6" />
              </div>
              <h3 className="state-card-title">No jobs found</h3>
              <p className="state-card-message">
                We couldn't find opportunities matching your current search and active filters.
              </p>
              <button onClick={handleResetFilters} className="btn-glass-secondary">
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Clear filters</span>
              </button>
            </div>
          </div>
        )}

        {/* Job Cards Stack */}
        {!loading && !error && data.items.length > 0 && (
          <div className="job-cards-stack">
            {data.items.map((job, index) => (
              <JobCard key={job.id} job={job} index={index} />
            ))}
          </div>
        )}

        {/* Pagination Bar */}
        {!loading && !error && data.pages > 1 && (
          <Pagination
            page={data.page}
            pages={data.pages}
            onPageChange={handlePageChange}
          />
        )}
      </main>

      {/* Footer Bar */}
      <footer className="glass-footer">
        <div className="footer-inner">
          <p>© {new Date().getFullYear()} JobFinder — Modern Job Search System</p>
          <p className="text-slate-400">Data ingested from Jobicy REST API</p>
        </div>
      </footer>
    </div>
  );
}
