/**
 * API Service Module
 *
 * Centralizes all HTTP communications with the FastAPI backend.
 * Uses Vite environment variable VITE_API_BASE_URL or defaults to http://localhost:8000.
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

/**
 * Check backend health.
 *
 * @param {AbortSignal} signal - Optional abort signal for timeout cancellation
 * @returns {Promise<boolean>} True if status is ok
 */
export async function checkHealth(signal) {
  const url = `${API_BASE_URL}/health`;
  const response = await fetch(url, { signal });
  if (!response.ok) {
    throw new Error('Health check failed');
  }
  const data = await response.json();
  if (data.status !== 'ok') {
    throw new Error('Backend not ready');
  }
  return true;
}

/**
 * Fetch a paginated and filtered list of jobs from GET /jobs.
 *
 * @param {Object} params - Query parameters (search, location, employment_type, industry, job_level, page, limit)
 * @returns {Promise<Object>} Returns { items, page, limit, total, pages }
 */
export async function getJobs(params = {}) {
  const queryParams = new URLSearchParams();

  if (params.search) queryParams.append('search', params.search);
  if (params.location) queryParams.append('location', params.location);
  if (params.employment_type) queryParams.append('employment_type', params.employment_type);
  if (params.industry) queryParams.append('industry', params.industry);
  if (params.job_level) queryParams.append('job_level', params.job_level);
  if (params.page) queryParams.append('page', params.page);
  if (params.limit) queryParams.append('limit', params.limit);

  const url = `${API_BASE_URL}/jobs?${queryParams.toString()}`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Failed to fetch jobs: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

/**
 * Fetch single job by ID from GET /jobs/{id}.
 *
 * @param {number|string} id - Internal PostgreSQL job ID
 * @returns {Promise<Object>} Job details object
 */
export async function getJobById(id) {
  const url = `${API_BASE_URL}/jobs/${id}`;
  const response = await fetch(url);

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error('Job not found');
    }
    throw new Error(`Failed to fetch job details: ${response.status}`);
  }

  return response.json();
}

/**
 * Trigger batch ingestion from POST /ingestion/run.
 *
 * @returns {Promise<Object>} IngestionResult stats { fetched, inserted, updated, failed, status }
 */
export async function runIngestion() {
  const url = `${API_BASE_URL}/ingestion/run`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Ingestion failed with status ${response.status}`);
  }

  return response.json();
}
