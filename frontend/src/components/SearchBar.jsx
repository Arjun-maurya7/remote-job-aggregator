import React, { useState } from 'react';
import { Search, X, ArrowRight, Sparkles } from 'lucide-react';

/**
 * SearchBar & Hero Component
 *
 * Full-bleed hero section with animated ambient glow orbs,
 * large gradient heading, and a glossy floating glass search panel.
 */
export function SearchBar({ value, onSearch }) {
  const [searchTerm, setSearchTerm] = useState(value || '');
  const [prevValue, setPrevValue] = useState(value);

  // Sync state if parent prop resets
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
    <section className="hero-container">
      {/* Animated ambient glow orbs */}
      <div className="ambient-glow" />

      <div className="hero-content">
        <div className="hero-eyebrow">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Remote Opportunities</span>
        </div>

        <h1 className="hero-heading">
          Find work you'll{' '}
          <span className="gradient-text">love</span>
          {' '}remotely.
        </h1>

        <p className="hero-subheading">
          Discover 100+ curated remote opportunities across engineering, design, marketing,
          sales, and management — all ingested live from Jobicy.
        </p>

        {/* Glossy Floating Glass Search Panel */}
        <form onSubmit={handleSubmit} className="glass-search-panel" role="search">
          <div className="search-field-wrapper">
            <Search className="search-field-icon" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search jobs, companies, or skills..."
              className="search-field-input"
              aria-label="Search jobs by title, company, or skills"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={handleClear}
                className="search-clear-btn"
                title="Clear search input"
                aria-label="Clear search input"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          <button type="submit" className="btn-search-gradient">
            <span>Search</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>
      </div>
    </section>
  );
}
