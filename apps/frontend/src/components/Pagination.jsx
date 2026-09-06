'use client';

import React from 'react';

/**
 * DealFlow360 Zinc Monochrome Pagination Component
 * Follows strict design guidelines: zero emojis, crisp zinc tokens, accessible controls.
 */
export default function Pagination({
  currentPage = 1,
  totalItems = 0,
  pageSize = 10,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 25, 50],
  compact = false,
  className = '',
}) {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const validCurrentPage = Math.min(Math.max(1, currentPage), totalPages);

  const startItem = totalItems === 0 ? 0 : (validCurrentPage - 1) * pageSize + 1;
  const endItem = Math.min(validCurrentPage * pageSize, totalItems);

  // Generate page numbers with smart ellipsis window
  const getPageNumbers = () => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    if (validCurrentPage <= 4) {
      return [1, 2, 3, 4, 5, '...', totalPages];
    }

    if (validCurrentPage >= totalPages - 3) {
      return [
        1,
        '...',
        totalPages - 4,
        totalPages - 3,
        totalPages - 2,
        totalPages - 1,
        totalPages,
      ];
    }

    return [
      1,
      '...',
      validCurrentPage - 1,
      validCurrentPage,
      validCurrentPage + 1,
      '...',
      totalPages,
    ];
  };

  const handlePage = (p) => {
    if (p >= 1 && p <= totalPages && p !== validCurrentPage && onPageChange) {
      onPageChange(p);
    }
  };

  // Compact variant (ideal for sidebars like Portal left list)
  if (compact) {
    if (totalItems <= pageSize && totalPages <= 1) return null;

    return (
      <div
        className={`flex items-center justify-between gap-2 pt-3 border-t border-zinc-200 text-xs text-zinc-600 ${className}`}
      >
        <span className="text-[11px] text-zinc-500 font-medium">
          {startItem}-{endItem} of {totalItems}
        </span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => handlePage(validCurrentPage - 1)}
            disabled={validCurrentPage <= 1}
            aria-label="Previous page"
            className="p-1 rounded border border-zinc-200 bg-white hover:bg-zinc-50 disabled:opacity-30 disabled:cursor-not-allowed transition text-zinc-700 cursor-pointer"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <span className="px-1.5 text-[11px] font-semibold text-zinc-800">
            {validCurrentPage} / {totalPages}
          </span>
          <button
            type="button"
            onClick={() => handlePage(validCurrentPage + 1)}
            disabled={validCurrentPage >= totalPages}
            aria-label="Next page"
            className="p-1 rounded border border-zinc-200 bg-white hover:bg-zinc-50 disabled:opacity-30 disabled:cursor-not-allowed transition text-zinc-700 cursor-pointer"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>
    );
  }

  // Full table footer pagination
  return (
    <div
      className={`flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-zinc-200 bg-white text-xs text-zinc-600 select-none ${className}`}
    >
      {/* Left side: Item count & Page size selector */}
      <div className="flex items-center gap-4 flex-wrap">
        <span className="text-zinc-500">
          Showing <span className="font-semibold text-zinc-900">{startItem}</span> to{' '}
          <span className="font-semibold text-zinc-900">{endItem}</span> of{' '}
          <span className="font-semibold text-zinc-900">{totalItems}</span> results
        </span>

        {onPageSizeChange && (
          <div className="flex items-center gap-1.5 text-zinc-500">
            <span>Show:</span>
            <select
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              aria-label="Items per page"
              className="h-7 px-2 text-xs font-medium rounded-md border border-zinc-200 bg-white text-zinc-800 focus:outline-none focus:border-zinc-400 focus:ring-1 focus:ring-zinc-400 transition cursor-pointer"
            >
              {pageSizeOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt} / page
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Right side: Navigation buttons */}
      <div className="flex items-center gap-1">
        {/* First Page */}
        <button
          type="button"
          onClick={() => handlePage(1)}
          disabled={validCurrentPage <= 1}
          aria-label="First page"
          title="First page"
          className="h-8 w-8 flex items-center justify-center rounded-md border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 disabled:opacity-30 disabled:cursor-not-allowed transition cursor-pointer"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
          </svg>
        </button>

        {/* Previous Page */}
        <button
          type="button"
          onClick={() => handlePage(validCurrentPage - 1)}
          disabled={validCurrentPage <= 1}
          aria-label="Previous page"
          title="Previous page"
          className="h-8 px-2.5 flex items-center gap-1 rounded-md border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 disabled:opacity-30 disabled:cursor-not-allowed transition cursor-pointer text-xs font-medium"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
          </svg>
          <span className="hidden sm:inline">Prev</span>
        </button>

        {/* Page Number Buttons */}
        <div className="flex items-center gap-1 px-1">
          {getPageNumbers().map((item, idx) => {
            if (item === '...') {
              return (
                <span key={`dots-${idx}`} className="w-6 text-center text-zinc-400 font-bold select-none">
                  &hellip;
                </span>
              );
            }

            const isCurrent = item === validCurrentPage;
            return (
              <button
                key={item}
                type="button"
                onClick={() => handlePage(item)}
                aria-label={`Page ${item}`}
                aria-current={isCurrent ? 'page' : undefined}
                className={`h-8 min-w-[32px] px-2 text-xs font-semibold rounded-md transition cursor-pointer ${
                  isCurrent
                    ? 'bg-zinc-900 text-white shadow-xs'
                    : 'border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 hover:border-zinc-300'
                }`}
              >
                {item}
              </button>
            );
          })}
        </div>

        {/* Next Page */}
        <button
          type="button"
          onClick={() => handlePage(validCurrentPage + 1)}
          disabled={validCurrentPage >= totalPages}
          aria-label="Next page"
          title="Next page"
          className="h-8 px-2.5 flex items-center gap-1 rounded-md border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 disabled:opacity-30 disabled:cursor-not-allowed transition cursor-pointer text-xs font-medium"
        >
          <span className="hidden sm:inline">Next</span>
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
          </svg>
        </button>

        {/* Last Page */}
        <button
          type="button"
          onClick={() => handlePage(totalPages)}
          disabled={validCurrentPage >= totalPages}
          aria-label="Last page"
          title="Last page"
          className="h-8 w-8 flex items-center justify-center rounded-md border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 disabled:opacity-30 disabled:cursor-not-allowed transition cursor-pointer"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 5l7 7-7 7M5 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    </div>
  );
}
