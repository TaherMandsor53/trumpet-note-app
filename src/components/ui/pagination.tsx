'use client';

import React from 'react';
import { Button } from './button';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface PaginationProps {
  currentPage: number;
  totalItems: number;
  pageSize: number;
  pageSizeOptions?: number[];
  onPageChange: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  className?: string;
}

export function Pagination({
  currentPage,
  totalItems,
  pageSize = 10,
  pageSizeOptions = [10, 20, 50, 100],
  onPageChange,
  onPageSizeChange,
  className,
}: PaginationProps) {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const validCurrentPage = Math.min(Math.max(1, currentPage), totalPages);

  const startItem = totalItems === 0 ? 0 : (validCurrentPage - 1) * pageSize + 1;
  const endItem = Math.min(validCurrentPage * pageSize, totalItems);

  // Generate page numbers to display with smart ellipsis
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (validCurrentPage <= 3) {
        pages.push(1, 2, 3, 4, '...', totalPages);
      } else if (validCurrentPage >= totalPages - 2) {
        pages.push(1, '...', totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
      } else {
        pages.push(1, '...', validCurrentPage - 1, validCurrentPage, validCurrentPage + 1, '...', totalPages);
      }
    }
    return pages;
  };

  return (
    <div
      className={cn(
        'flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 bg-card/60 border-t border-border/80 rounded-b-xl text-xs',
        className
      )}
    >
      {/* Left: Record Summary & Page Size Selector */}
      <div className="flex flex-wrap items-center gap-3 text-muted-foreground w-full sm:w-auto justify-between sm:justify-start">
        <span className="font-medium">
          Showing <span className="font-bold text-foreground font-mono">{startItem}</span> -{' '}
          <span className="font-bold text-foreground font-mono">{endItem}</span> of{' '}
          <span className="font-bold text-foreground font-mono">{totalItems}</span> records
        </span>

        {onPageSizeChange && (
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] text-muted-foreground">Rows:</span>
            <select
              value={pageSize}
              onChange={e => {
                const newSize = Number(e.target.value);
                onPageSizeChange(newSize);
                onPageChange(1);
              }}
              className="bg-background border border-border rounded-md px-2 py-1 text-xs font-semibold text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
            >
              {pageSizeOptions.map(opt => (
                <option key={opt} value={opt}>
                  {opt} / page
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Right: Page Navigation Controls */}
      <div className="flex items-center gap-1 w-full sm:w-auto justify-center sm:justify-end flex-wrap">
        {/* First Page */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(1)}
          disabled={validCurrentPage <= 1}
          className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
          title="First Page"
        >
          <ChevronsLeft className="w-3.5 h-3.5" />
        </Button>

        {/* Previous Page */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(validCurrentPage - 1)}
          disabled={validCurrentPage <= 1}
          className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
          title="Previous Page"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
        </Button>

        {/* Number Buttons */}
        <div className="flex items-center gap-1">
          {getPageNumbers().map((p, idx) => {
            if (p === '...') {
              return (
                <span key={`dots-${idx}`} className="px-1 text-muted-foreground select-none">
                  …
                </span>
              );
            }
            const isCurrent = p === validCurrentPage;
            return (
              <button
                key={p}
                type="button"
                onClick={() => onPageChange(Number(p))}
                className={cn(
                  'h-7 min-w-[28px] px-1.5 rounded-md font-mono text-xs font-semibold transition-all cursor-pointer flex items-center justify-center',
                  isCurrent
                    ? 'bg-[#D97736] text-white shadow-xs'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/40 border border-transparent'
                )}
              >
                {p}
              </button>
            );
          })}
        </div>

        {/* Next Page */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(validCurrentPage + 1)}
          disabled={validCurrentPage >= totalPages}
          className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
          title="Next Page"
        >
          <ChevronRight className="w-3.5 h-3.5" />
        </Button>

        {/* Last Page */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(totalPages)}
          disabled={validCurrentPage >= totalPages}
          className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
          title="Last Page"
        >
          <ChevronsRight className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  );
}
