import React from 'react';
import { MapPin, Building2, Briefcase, Layers, RotateCcw } from 'lucide-react';

const LOCATION_OPTIONS = [
  { label: 'Location: All', value: '' },
  { label: 'Location: Anywhere', value: 'Anywhere' },
  { label: 'Location: India', value: 'India' },
  { label: 'Location: USA', value: 'USA' },
  { label: 'Location: UK', value: 'UK' },
  { label: 'Location: Europe', value: 'Europe' },
  { label: 'Location: Canada', value: 'Canada' },
  { label: 'Location: Americas', value: 'Americas' },
];

const INDUSTRY_OPTIONS = [
  { label: 'Industry: All', value: '' },
  { label: 'Industry: Engineering', value: 'Engineering' },
  { label: 'Industry: Creative & Design', value: 'Creative & Design' },
  { label: 'Industry: Copywriting', value: 'Copywriting' },
  { label: 'Industry: Data', value: 'Data' },
  { label: 'Industry: Management', value: 'Management' },
  { label: 'Industry: Marketing', value: 'Marketing' },
  { label: 'Industry: Sales', value: 'Sales' },
  { label: 'Industry: DevOps', value: 'DevOps' },
];

const EMPLOYMENT_TYPE_OPTIONS = [
  { label: 'Type: All', value: '' },
  { label: 'Type: Full-Time', value: 'Full-Time' },
  { label: 'Type: Part-Time', value: 'Part-Time' },
  { label: 'Type: Contract', value: 'Contract' },
  { label: 'Type: Freelance', value: 'Freelance' },
];

const JOB_LEVEL_OPTIONS = [
  { label: 'Level: All', value: '' },
  { label: 'Level: Senior', value: 'Senior' },
  { label: 'Level: Midweight', value: 'Midweight' },
  { label: 'Level: Junior', value: 'Junior' },
  { label: 'Level: Lead', value: 'Lead' },
  { label: 'Level: Director', value: 'Director' },
];

/**
 * Filters Component
 *
 * Floating glass toolbar with custom select controls and active state glow.
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
    <div className="glass-filter-toolbar">
      <div className="filter-items-grid">
        {/* Location Filter */}
        <div className={`glass-select-wrapper ${filters.location ? 'is-active' : ''}`}>
          <MapPin className="select-icon" />
          <select
            id="location-select"
            value={filters.location || ''}
            onChange={(e) => onChange('location', e.target.value)}
            className="glass-select-control"
            aria-label="Location Filter"
          >
            {LOCATION_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* Industry Filter */}
        <div className={`glass-select-wrapper ${filters.industry ? 'is-active' : ''}`}>
          <Building2 className="select-icon" />
          <select
            id="industry-select"
            value={filters.industry || ''}
            onChange={(e) => onChange('industry', e.target.value)}
            className="glass-select-control"
            aria-label="Industry Filter"
          >
            {INDUSTRY_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* Employment Type Filter */}
        <div className={`glass-select-wrapper ${filters.employment_type ? 'is-active' : ''}`}>
          <Briefcase className="select-icon" />
          <select
            id="employment-type-select"
            value={filters.employment_type || ''}
            onChange={(e) => onChange('employment_type', e.target.value)}
            className="glass-select-control"
            aria-label="Employment Type Filter"
          >
            {EMPLOYMENT_TYPE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* Job Level Filter */}
        <div className={`glass-select-wrapper ${filters.job_level ? 'is-active' : ''}`}>
          <Layers className="select-icon" />
          <select
            id="job-level-select"
            value={filters.job_level || ''}
            onChange={(e) => onChange('job_level', e.target.value)}
            className="glass-select-control"
            aria-label="Job Level Filter"
          >
            {JOB_LEVEL_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* Clear Filters Action */}
        {hasActiveFilters && (
          <button
            onClick={onReset}
            className="btn-clear-filters"
            type="button"
            title="Reset active search and filters"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Clear filters</span>
          </button>
        )}
      </div>
    </div>
  );
}
