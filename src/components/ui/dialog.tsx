'use client';

import * as React from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
  className?: string;
  contentClassName?: string;
}

export function Dialog({ open, onOpenChange, children, className, contentClassName }: DialogProps) {
  if (!open) return null;

  return (
    <div className={cn("fixed inset-0 z-50 flex items-center justify-center overflow-y-auto overflow-x-hidden bg-black/80 backdrop-blur-sm p-3 sm:p-4 md:p-6 animate-in fade-in duration-200 w-full max-w-full", className)}>
      <div
        className="fixed inset-0"
        onClick={() => onOpenChange(false)}
        aria-hidden="true"
      />
      <div className={cn("relative z-50 w-[calc(100vw-1.5rem)] sm:w-full max-w-lg rounded-2xl border bg-card p-3.5 sm:p-6 shadow-2xl animate-in zoom-in-95 duration-200 max-h-[92vh] flex flex-col overflow-hidden box-border min-w-0", contentClassName)}>
        <button
          onClick={() => onOpenChange(false)}
          className="absolute right-2.5 top-2.5 sm:right-4 sm:top-4 z-20 p-1.5 rounded-full text-muted-foreground/80 hover:text-foreground hover:bg-muted/80 transition-colors focus:outline-none focus:ring-2 focus:ring-ring"
          title="Close dialog"
        >
          <X className="h-4 w-4" />
          <span className="sr-only">Close</span>
        </button>
        {children}
      </div>
    </div>
  );
}

export function DialogHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('flex flex-col space-y-1.5 text-left pr-7 sm:pr-9 mb-3 sm:mb-4 shrink-0 min-w-0 max-w-full overflow-hidden', className)}
      {...props}
    />
  );
}

export function DialogTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h2
      className={cn('text-base sm:text-lg font-semibold leading-snug tracking-tight break-words min-w-0', className)}
      {...props}
    />
  );
}

export function DialogDescription({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      className={cn('text-xs text-muted-foreground mt-1 break-words min-w-0 leading-normal', className)}
      {...props}
    />
  );
}

export function DialogFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 mt-6', className)}
      {...props}
    />
  );
}
