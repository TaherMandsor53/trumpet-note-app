'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ThemedDatePickerProps {
  value: string; // YYYY-MM-DD
  onChange: (value: string) => void;
  className?: string;
  disabled?: boolean;
  maxDate?: string; // YYYY-MM-DD to disable future dates
  label?: string;
}

export function ThemedDatePicker({ value, onChange, className, disabled, maxDate, label }: ThemedDatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Parse initial date
  const parsedDate = value ? new Date(value + 'T00:00:00') : new Date();
  const [viewYear, setViewYear] = useState(parsedDate.getFullYear());
  const [viewMonth, setViewMonth] = useState(parsedDate.getMonth()); // 0-indexed

  // Format value to DD/MM/YYYY for display (matching Google Sheet Image 3)
  const formatDisplay = (isoStr: string) => {
    if (!isoStr) return '';
    const parts = isoStr.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return isoStr;
  };

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const daysOfWeek = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

  // Calculate calendar days
  const firstDayOfMonth = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const daysInPrevMonth = new Date(viewYear, viewMonth, 0).getDate();

  const handlePrevMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear(y => y - 1);
    } else {
      setViewMonth(m => m - 1);
    }
  };

  const canGoNextMonth = (() => {
    if (!maxDate) return true;
    const parts = maxDate.split('-');
    if (parts.length < 2) return true;
    const maxY = parseInt(parts[0], 10);
    const maxM = parseInt(parts[1], 10) - 1;
    return viewYear < maxY || (viewYear === maxY && viewMonth < maxM);
  })();

  const handleNextMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!canGoNextMonth) return;
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear(y => y + 1);
    } else {
      setViewMonth(m => m + 1);
    }
  };

  const handleSelectDay = (day: number) => {
    const mm = String(viewMonth + 1).padStart(2, '0');
    const dd = String(day).padStart(2, '0');
    const isoString = `${viewYear}-${mm}-${dd}`;
    if (maxDate && isoString > maxDate) return;
    onChange(isoString);
    setIsOpen(false);
  };

  const handleSetToday = (e: React.MouseEvent) => {
    e.stopPropagation();
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    setViewYear(yyyy);
    setViewMonth(today.getMonth());
    onChange(`${yyyy}-${mm}-${dd}`);
    setIsOpen(false);
  };

  const handleSetYesterday = (e: React.MouseEvent) => {
    e.stopPropagation();
    const yest = new Date();
    yest.setDate(yest.getDate() - 1);
    const yyyy = yest.getFullYear();
    const mm = String(yest.getMonth() + 1).padStart(2, '0');
    const dd = String(yest.getDate()).padStart(2, '0');
    setViewYear(yyyy);
    setViewMonth(yest.getMonth());
    onChange(`${yyyy}-${mm}-${dd}`);
    setIsOpen(false);
  };

  const todayStr = (() => {
    const t = new Date();
    return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`;
  })();

  return (
    <div className={cn('relative inline-block w-full', className)} ref={containerRef}>
      {/* Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={cn(
          'w-full flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-xl border transition-all text-xs font-mono font-medium shadow-sm',
          'bg-card/90 dark:bg-[#25130A] border-amber-500/30 hover:border-amber-500/60 focus:outline-none focus:ring-2 focus:ring-amber-500/40',
          isOpen && 'ring-2 ring-amber-500/50 border-amber-500 shadow-warm-glow',
          disabled && 'opacity-60 cursor-not-allowed'
        )}
      >
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-[#D97736]">
            <CalendarIcon className="w-4 h-4" />
          </div>
          <div className="text-left font-sans min-w-0">
            <div className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider truncate">
              {label || 'Selected Attendance Date'}
            </div>
            <div className="text-xs font-mono font-bold text-[#E5A93C]">
              {formatDisplay(value) || 'Select Date'}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-amber-500/10 border border-amber-500/20 text-[10px] text-amber-300 font-mono shrink-0">
          <span>DD/MM/YYYY</span>
        </div>
      </button>

      {/* Popover Calendar Modal */}
      {isOpen && (
        <div className="absolute z-50 mt-2 left-0 sm:left-auto right-0 sm:right-auto w-[calc(100vw-3.5rem)] max-w-[320px] sm:w-80 p-3 sm:p-4 rounded-2xl bg-gradient-to-b from-[#2B160E] to-[#1C0D06] border border-amber-500/40 shadow-2xl backdrop-blur-xl text-foreground animate-in fade-in zoom-in-95 duration-150">
          {/* Header Month / Year & Navigation */}
          <div className="flex items-center justify-between mb-3 pb-2 border-b border-amber-900/40">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="p-1.5 rounded-lg hover:bg-amber-500/20 text-amber-300 hover:text-amber-100 transition-colors"
              title="Previous Month"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <div className="text-center">
              <span className="font-serif font-bold text-sm text-[#F5E6D3] tracking-wide">
                {monthNames[viewMonth]} {viewYear}
              </span>
            </div>

            <button
              type="button"
              disabled={!canGoNextMonth}
              onClick={handleNextMonth}
              className={cn(
                'p-1.5 rounded-lg text-amber-300 transition-colors',
                canGoNextMonth
                  ? 'hover:bg-amber-500/20 hover:text-amber-100 cursor-pointer'
                  : 'opacity-30 cursor-not-allowed text-muted-foreground/40'
              )}
              title={canGoNextMonth ? 'Next Month' : 'Future dates disabled'}
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Days of Week Header */}
          <div className="grid grid-cols-7 gap-1 text-center mb-2">
            {daysOfWeek.map((day, idx) => (
              <span
                key={day}
                className={cn(
                  'text-[10px] font-bold uppercase tracking-wider',
                  idx === 0 || idx === 6 ? 'text-amber-400/70' : 'text-muted-foreground'
                )}
              >
                {day}
              </span>
            ))}
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-1 text-center">
            {/* Previous month leading days */}
            {Array.from({ length: firstDayOfMonth }).map((_, idx) => {
              const day = daysInPrevMonth - firstDayOfMonth + idx + 1;
              return (
                <div
                  key={`prev-${idx}`}
                  className="h-8 flex items-center justify-center text-[11px] text-muted-foreground/30 select-none font-mono"
                >
                  {day}
                </div>
              );
            })}

            {/* Current month days */}
            {Array.from({ length: daysInMonth }).map((_, idx) => {
              const day = idx + 1;
              const dayIso = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
              const isSelected = value === dayIso;
              const isToday = dayIso === todayStr;
              const isFuture = maxDate ? dayIso > maxDate : false;

              return (
                <button
                  key={day}
                  type="button"
                  disabled={isFuture}
                  onClick={() => !isFuture && handleSelectDay(day)}
                  className={cn(
                    'h-8 w-full rounded-lg text-xs font-mono font-medium transition-all flex items-center justify-center relative',
                    isFuture
                      ? 'opacity-25 cursor-not-allowed text-muted-foreground/30 pointer-events-none'
                      : isSelected
                      ? 'bg-[#D97736] text-white font-bold shadow-warm-glow ring-2 ring-amber-400 cursor-pointer'
                      : isToday
                      ? 'border border-amber-500/60 text-amber-300 hover:bg-amber-500/20 cursor-pointer'
                      : 'hover:bg-amber-500/15 hover:text-amber-200 text-foreground/90 cursor-pointer'
                  )}
                  title={isFuture ? 'Future date disabled' : undefined}
                >
                  {day}
                  {isToday && !isSelected && (
                    <span className="absolute bottom-1 w-1 h-1 rounded-full bg-amber-400" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Quick Date Selectors */}
          <div className="mt-3 pt-3 border-t border-amber-900/40 flex items-center justify-between text-xs">
            <button
              type="button"
              onClick={handleSetYesterday}
              className="px-2.5 py-1 rounded-md text-[11px] text-muted-foreground hover:text-amber-200 hover:bg-amber-500/15 transition-colors"
            >
              Yesterday
            </button>
            <button
              type="button"
              onClick={handleSetToday}
              className="px-2.5 py-1 rounded-md text-[11px] font-semibold text-amber-300 hover:text-amber-100 hover:bg-amber-500/20 transition-colors flex items-center gap-1"
            >
              <Sparkles className="w-3 h-3 text-amber-400" /> Today ({formatDisplay(todayStr)})
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
