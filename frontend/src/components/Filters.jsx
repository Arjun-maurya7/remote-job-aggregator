import React from 'react';
import { MapPin, Building2, Briefcase, Layers, RotateCcw } from 'lucide-react';

const LOCATION_OPTIONS = [
  { label: 'All Locations', value: '' },
  { label: 'Anywhere', value: 'Anywhere' },
  { label: 'India', value: 'India' },
  { label: 'USA', value: 'USA' },
  { label: 'UK', value: 'UK' },
  { label: 'Europe', value: 'Europe' },
  { label: 'Canada', value: 'Canada' },
  { label: 'Americas', value: 'Americas' },
];

const INDUSTRY_OPTIONS = [
  { label: 'All Industries', value: '' },
  { label: 'Engineering', value: 'Engineering' },
  { label: 'Creative & Design', value: 'Creative & Design' },
  { label: 'Copywriting', value: 'Copywriting' },
  { label: 'Data', value: 'Data' },
  { label: 'Management', value: 'Management' },
  { label: 'Marketing', value: 'Marketing' },
  { label: 'Sales', value: 'Sales' },
  { label: 'DevOps', value: 'DevOps' },
];

const EMPLOYMENT_TYPE_OPTIONS = [
  { label: 'All Employment Types', value: '' },
  { label: 'Full-Time', value: 'Full-Time' },
  { label: 'Part-Time', value: 'Part-Time' },
  { label: 'Contract', value: 'Contract' },
  { label: 'Freelance', value: 'Freelance' },
];

const JOB_LEVEL_OPTIONS = [
  { label: 'All Job Levels', value: '' },
  { label: 'Senior', value: 'Senior' },
  { label: 'Midweight', value: 'Midweight' },
  { label: 'Junior', value: 'Junior' },
  { label: 'Lead', value: 'Lead' },
  { label: 'Director', value: 'Director' },
];

/**
 * Filters Component
 *
 * Horizontal filter bar with custom select controls.
 */
export function Filters({ filters, onChange, onReset }) {
  const hasActiveFilters = Boolean(
    filters.location ||
      filters.industry ||
      filters.employment_type ||
      filters.job_level ||
      filters.search
  );

  return (
    <div className="filter-panel">
      <div className="filter-grid">
        {/* Location Filter */}
        <div className="filter-group">
          <label className="filter-label" htmlFor="location-select">
            <MapPin className="w-3.5 h-3.5" />
            <span>Location</span>
          </label>
          <select
            id="location-select"
            value={filters.location || ''}
            onChange={(e) => onChange('location', e.target.value)}
            className="filter-select"
            aria-label="Filter by Location"
          >
            {LOCATION_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* Industry Filter */}
        <div className="filter-group">
          <label className="filter-label" htmlFor="industry-select">
            <Building2 className="w-3.5 h-3.5" />
            <span>Industry</span>
          </label>
          <select
            id="industry-select"
            value={filters.industry || ''}
            onChange={(e) => onChange('industry', e.target.value)}
            className="filter-select"
            aria-label="Filter by Industry"
          >
            {INDUSTRY_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* Employment Type Filter */}
        <div className="filter-group">
          <label className="filter-label" htmlFor="employment-type-select">
            <Briefcase className="w-3.5 h-3.5" />
            <span>Employment Type</span>
          </label>
          <select
            id="employment-type-select"
            value={filters.employment_type || ''}
            onChange={(e) => onChange('employment_type', e.target.value)}
            className="filter-select"
            aria-label="Filter by Employment Type"
          >
            {EMPLOYMENT_TYPE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* Job Level Filter */}
        <div className="filter-group">
          <label className="filter-label" htmlFor="job-level-select">
            <Layers className="w-3.5 h-3.5" />
            <span>Job Level</span>
          </label>
          <select
            id="job-level-select"
            value={filters.job_level || ''}
            onChange={(e) => onChange('job_level', e.target.value)}
            className="filter-select"
            aria-label="Filter by Job Level"
          >
            {JOB_LEVEL_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {hasActiveFilters && (
        <div className="filter-actions">
          <button onClick={onReset} className="reset-filter-btn" type="button">
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset All Filters</span>
          </button>
        </div>
      )}
    </div>
  );
}
