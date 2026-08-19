import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

/**
 * Pagination Component
 *
 * Clean, centered glass pagination bar with active accent pill and nav arrows.
 */
export function Pagination({ page, pages, onPageChange }) {
  if (pages <= 1) return null;

  const getPageNumbers = () => {
    const pageNumbers = [];
    const maxVisible = 5;

    if (pages <= maxVisible) {
      for (let i = 1; i <= pages; i++) pageNumbers.push(i);
    } else {
      pageNumbers.push(1);
      if (page > 3) pageNumbers.push('...');

      const start = Math.max(2, page - 1);
      const end = Math.min(pages - 1, page + 1);

      for (let i = start; i <= end; i++) {
        if (i > 1 && i < pages) pageNumbers.push(i);
      }

      if (page < pages - 2) pageNumbers.push('...');
      pageNumbers.push(pages);
    }

    return pageNumbers;
  };

  return (
    <nav className="glass-pagination-nav" aria-label="Pagination Navigation">
      <button
        onClick={() => onPageChange(page - 1)}
        disabled={page <= 1}
        className="pagination-nav-button"
        aria-label="Previous Page"
      >
        <ChevronLeft className="w-4 h-4" />
        <span>Previous</span>
      </button>

      <div className="pagination-numbers-row">
        {getPageNumbers().map((num, idx) =>
          typeof num === 'number' ? (
            <button
              key={idx}
              onClick={() => onPageChange(num)}
              className={`page-pill-button ${page === num ? 'is-active' : ''}`}
              aria-current={page === num ? 'page' : undefined}
              aria-label={`Page ${num}`}
            >
              {num}
            </button>
          ) : (
            <span key={idx} className="page-dots">
              ...
            </span>
          )
        )}
      </div>

      <button
        onClick={() => onPageChange(page + 1)}
        disabled={page >= pages}
        className="pagination-nav-button"
        aria-label="Next Page"
      >
        <span>Next</span>
        <ChevronRight className="w-4 h-4" />
      </button>
    </nav>
  );
}
