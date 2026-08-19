import React, { useState, useEffect } from 'react';
import { Header } from '../components/Header';
import { SearchBar } from '../components/SearchBar';
import { Filters } from '../components/Filters';
import { JobCard } from '../components/JobCard';
import { Pagination } from '../components/Pagination';
import { Loading } from '../components/Loading';

import { getJobs, runIngestion } from '../services/api';
import { SearchX, ServerOff } from 'lucide-react';

/**
 * Home Page (Dashboard)
 *
 * Renders main job dashboard with search, filters, results summary, job cards, loading, error, and empty states.
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
        if (!ignore) setError(err.message || 'Unable to load jobs. Please check that the API server is running.');
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
      <Header
        onSync={handleSyncJobs}
        isSyncing={isSyncing}
        syncResult={syncResult}
        syncError={syncError}
      />

      <main className="main-container">
        {/* Search & Filter Controls */}
        <SearchBar value={filters.search} onSearch={handleSearch} />
        <Filters
          filters={filters}
          onChange={handleFilterChange}
          onReset={handleResetFilters}
        />

        {/* Results Header Summary Row */}
        {!loading && !error && (
          <div className="results-header-bar">
            <div>
              <h3 className="results-heading">Remote Jobs</h3>
              <p className="results-counter">
                {data.total} {data.total === 1 ? 'job' : 'jobs'} found
                {filters.search && <span> for "{filters.search}"</span>}
              </p>
            </div>

            {data.pages > 1 && (
              <span className="results-page-indicator">
                Page {data.page} of {data.pages}
              </span>
            )}
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="status-card" role="alert">
            <div className="status-icon-wrapper error">
              <ServerOff className="w-7 h-7" />
            </div>
            <h3 className="status-title">Unable to load jobs</h3>
            <p className="status-desc">
              We couldn't connect to the job service. Please verify the API server is running.
            </p>
            <button onClick={() => setFilters((f) => ({ ...f }))} className="btn-primary">
              Retry Loading
            </button>
          </div>
        )}

        {/* Loading Skeleton */}
        {loading && <Loading />}

        {/* Empty Result State */}
        {!loading && !error && data.items.length === 0 && (
          <div className="status-card">
            <div className="status-icon-wrapper empty">
              <SearchX className="w-7 h-7" />
            </div>
            <h3 className="status-title">No jobs found</h3>
            <p className="status-desc">
              We couldn't find any job listings matching your search or active filters.
            </p>
            <button onClick={handleResetFilters} className="btn-secondary">
              Clear All Filters
            </button>
          </div>
        )}

        {/* Job Cards Stack */}
        {!loading && !error && data.items.length > 0 && (
          <div className="job-cards-stack">
            {data.items.map((job) => (
              <JobCard key={job.id} job={job} />
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

      {/* Footer */}
      <footer className="footer-container">
        <div className="footer-content">
          <p>JobFinder — End-to-End Job Ingestion & Search Platform</p>
          <p>Data legitimately ingested from public Jobicy REST API v2</p>
        </div>
      </footer>
    </div>
  );
}
