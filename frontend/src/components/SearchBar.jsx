import React, { useState } from 'react';
import { Search, X } from 'lucide-react';

/**
 * SearchBar Component
 *
 * Provides hero heading and a large, accessible keyword search input.
 */
export function SearchBar({ value, onSearch }) {
  const [searchTerm, setSearchTerm] = useState(value || '');
  const [prevValue, setPrevValue] = useState(value);

  // Sync state if parent value prop resets
  if (value !== prevValue) {
    setPrevValue(value);
    setSearchTerm(value || '');
  }

  const handleSubmit = (e) => {
    e.preventDefault();
    onSearch(searchTerm.trim());
  };

  const handleClear = () => {
    setSearchTerm('');
    onSearch('');
  };

  return (
    <div className="search-container">
      <div className="hero-section">
        <h2 className="hero-title">Find your next remote opportunity</h2>
        <p className="hero-subtitle">
          Discover remote engineering, design, marketing, and management jobs from Jobicy.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="search-form" role="search">
        <div className="search-input-wrapper">
          <Search className="search-icon" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by title, company, or keyword (e.g. Python, Marketing, Engineer)..."
            className="search-input"
            aria-label="Search jobs by title, company or keyword"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={handleClear}
              className="search-clear-btn"
              title="Clear search"
              aria-label="Clear search text"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        <button type="submit" className="search-submit-btn">
          Search Jobs
        </button>
      </form>
    </div>
  );
}
