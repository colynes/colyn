import React from 'react';
import { router } from '@inertiajs/react';
import { ChevronLeft, ChevronRight, MoreHorizontal } from 'lucide-react';

function buildPageItems(currentPage, totalPages) {
  if (!totalPages || totalPages <= 0) {
    return [];
  }

  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const pages = new Set([1, totalPages, currentPage - 1, currentPage, currentPage + 1]);

  if (currentPage <= 3) {
    pages.add(2);
    pages.add(3);
    pages.add(4);
  }

  if (currentPage >= totalPages - 2) {
    pages.add(totalPages - 1);
    pages.add(totalPages - 2);
    pages.add(totalPages - 3);
  }

  const sortedPages = Array.from(pages)
    .filter((page) => page >= 1 && page <= totalPages)
    .sort((left, right) => left - right);

  const items = [];

  sortedPages.forEach((page, index) => {
    const previous = sortedPages[index - 1];

    if (previous && page - previous > 1) {
      items.push(`ellipsis-${previous}-${page}`);
    }

    items.push(page);
  });

  return items;
}

function normalizeQuery(query = {}) {
  return Object.fromEntries(
    Object.entries(query).filter(([, value]) => value !== '' && value !== null && value !== undefined),
  );
}

export default function BackofficePagination({
  paginator = null,
  path = '',
  query = {},
  onPageChange = null,
  currentPage = null,
  totalPages = null,
  totalItems = null,
  from = null,
  to = null,
}) {
  const resolvedCurrentPage = paginator?.current_page ?? currentPage ?? 1;
  const resolvedTotalPages = paginator?.last_page ?? totalPages ?? 1;
  const resolvedTotalItems = paginator?.total ?? totalItems ?? 0;
  const resolvedFrom = paginator?.from ?? from ?? 0;
  const resolvedTo = paginator?.to ?? to ?? 0;

  if (!resolvedTotalItems && resolvedTotalPages <= 1) {
    return null;
  }

  const pageItems = buildPageItems(resolvedCurrentPage, resolvedTotalPages);

  const navigateToPage = (page) => {
    if (page < 1 || page > resolvedTotalPages || page === resolvedCurrentPage) {
      return;
    }

    if (typeof onPageChange === 'function') {
      onPageChange(page);
      return;
    }

    if (!path) {
      return;
    }

    router.get(
      path,
      { ...normalizeQuery(query), page },
      { preserveScroll: true, preserveState: true, replace: true },
    );
  };

  const buttonClassName = (isActive) => `inline-flex h-10 min-w-10 items-center justify-center rounded-xl border px-3 text-sm font-semibold transition ${
    isActive
      ? 'border-[#4f3118] bg-[#4f3118] text-white shadow-[0_10px_20px_rgba(79,49,24,0.16)]'
      : 'border-[#dcc9b2] bg-white text-[#4f3118] hover:bg-[#f7f1e8]'
  }`;

  const disabledButtonClassName = 'cursor-not-allowed border-[#ece2d6] bg-[#faf6f1] text-[#b59f89]';

  return (
    <div className="flex flex-col gap-4 rounded-[1.35rem] border border-[#e0d1bf] bg-white px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
      <p className="text-sm text-[#73563a]">
        {resolvedTotalItems > 0
          ? `Showing ${resolvedFrom} to ${resolvedTo} of ${resolvedTotalItems} results`
          : 'No results to show'}
      </p>

      <div className="flex items-center justify-between gap-2 sm:justify-end">
        <button
          type="button"
          onClick={() => navigateToPage(resolvedCurrentPage - 1)}
          disabled={resolvedCurrentPage <= 1}
          className={`${buttonClassName(false)} ${resolvedCurrentPage <= 1 ? disabledButtonClassName : ''}`}
          aria-label="Go to previous page"
        >
          <ChevronLeft className="h-4 w-4" />
          <span className="ml-1 hidden sm:inline">Previous</span>
        </button>

        <div className="flex items-center gap-2">
          {pageItems.map((item) => {
            if (typeof item === 'string' && item.startsWith('ellipsis-')) {
              return (
                <span
                  key={item}
                  className="inline-flex h-10 min-w-8 items-center justify-center text-[#9a8168]"
                >
                  <MoreHorizontal className="h-4 w-4" />
                </span>
              );
            }

            return (
              <button
                key={`page-${item}`}
                type="button"
                onClick={() => navigateToPage(item)}
                className={buttonClassName(item === resolvedCurrentPage)}
                aria-current={item === resolvedCurrentPage ? 'page' : undefined}
                aria-label={`Go to page ${item}`}
              >
                {item}
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={() => navigateToPage(resolvedCurrentPage + 1)}
          disabled={resolvedCurrentPage >= resolvedTotalPages}
          className={`${buttonClassName(false)} ${resolvedCurrentPage >= resolvedTotalPages ? disabledButtonClassName : ''}`}
          aria-label="Go to next page"
        >
          <span className="mr-1 hidden sm:inline">Next</span>
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
