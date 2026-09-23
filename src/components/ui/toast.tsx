'use client';

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { CheckCircle2, AlertTriangle, AlertCircle, Info, X } from 'lucide-react';

export type ToastVariant = 'success' | 'error' | 'warning' | 'info';

export interface ToastOptions {
  title: string;
  description?: string;
  variant?: ToastVariant;
  duration?: number; // ms, default 4500
}

export interface ToastItem extends ToastOptions {
  id: string;
  createdAt: number;
}

interface ToastContextValue {
  toasts: ToastItem[];
  toast: {
    (options: ToastOptions): string;
    success: (title: string, description?: string, duration?: number) => string;
    error: (title: string, description?: string, duration?: number) => string;
    warning: (title: string, description?: string, duration?: number) => string;
    info: (title: string, description?: string, duration?: number) => string;
  };
  dismiss: (id: string) => void;
  dismissAll: () => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const dismissAll = useCallback(() => {
    setToasts([]);
  }, []);

  const addToast = useCallback((options: ToastOptions): string => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const newToast: ToastItem = {
      id,
      title: options.title,
      description: options.description,
      variant: options.variant || 'info',
      duration: options.duration || 4500,
      createdAt: Date.now(),
    };

    setToasts(prev => [newToast, ...prev.slice(0, 3)]); // Keep at most 4 stacked
    return id;
  }, []);

  const toastMethods = React.useMemo(() => {
    const fn = (opts: ToastOptions) => addToast(opts);
    fn.success = (title: string, description?: string, duration?: number) =>
      addToast({ title, description, variant: 'success', duration });
    fn.error = (title: string, description?: string, duration?: number) =>
      addToast({ title, description, variant: 'error', duration });
    fn.warning = (title: string, description?: string, duration?: number) =>
      addToast({ title, description, variant: 'warning', duration });
    fn.info = (title: string, description?: string, duration?: number) =>
      addToast({ title, description, variant: 'info', duration });
    return fn;
  }, [addToast]);

  return (
    <ToastContext.Provider value={{ toasts, toast: toastMethods, dismiss, dismissAll }}>
      {children}
      <ToastViewport toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return ctx;
}

function ToastViewport({
  toasts,
  onDismiss,
}: {
  toasts: ToastItem[];
  onDismiss: (id: string) => void;
}) {
  if (toasts.length === 0) return null;

  return (
    <aside
      aria-label="Notifications"
      className={cn(
        'fixed z-[100] flex flex-col pointer-events-none gap-2.5 transition-all duration-300',
        // Mobile view: centered at top with comfortable side insets
        'top-3 inset-x-3 max-w-sm mx-auto sm:max-w-none sm:mx-0',
        // Tablet & Desktop view: pinned top-right
        'sm:top-5 sm:right-5 sm:left-auto sm:w-[420px]'
      )}
    >
      {toasts.map(t => (
        <ToastCard key={t.id} toast={t} onDismiss={() => onDismiss(t.id)} />
      ))}
    </aside>
  );
}

const variantConfig: Record<
  ToastVariant,
  {
    border: string;
    bg: string;
    icon: React.ReactNode;
    badge: string;
    badgeText: string;
    progressBar: string;
  }
> = {
  success: {
    border: 'border-emerald-500/40 hover:border-emerald-500/60 shadow-emerald-500/10',
    bg: 'bg-[#121814]/95',
    icon: <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />,
    badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    badgeText: 'Success',
    progressBar: 'bg-emerald-500',
  },
  error: {
    border: 'border-rose-500/45 hover:border-rose-500/70 shadow-rose-500/10',
    bg: 'bg-[#1a1213]/95',
    icon: <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />,
    badge: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
    badgeText: 'Error',
    progressBar: 'bg-rose-500',
  },
  warning: {
    border: 'border-amber-500/50 hover:border-amber-500/75 shadow-amber-500/10',
    bg: 'bg-[#181410]/95',
    icon: <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />,
    badge: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
    badgeText: 'Warning',
    progressBar: 'bg-amber-500',
  },
  info: {
    border: 'border-[#D97736]/40 hover:border-[#D97736]/60 shadow-amber-500/10',
    bg: 'bg-[#161311]/95',
    icon: <Info className="w-4 h-4 text-amber-400 shrink-0" />,
    badge: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
    badgeText: 'Notice',
    progressBar: 'bg-[#D97736]',
  },
};

function ToastCard({
  toast,
  onDismiss,
}: {
  toast: ToastItem;
  onDismiss: () => void;
}) {
  const config = variantConfig[toast.variant || 'info'];
  const duration = toast.duration || 4500;
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    const startTime = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, 100 - (elapsed / duration) * 100);
      setProgress(remaining);
      if (elapsed >= duration) {
        clearInterval(interval);
        onDismiss();
      }
    }, 25);

    return () => clearInterval(interval);
  }, [duration, onDismiss]);

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        'pointer-events-auto relative overflow-hidden rounded-xl border p-3.5 sm:p-4 shadow-2xl backdrop-blur-md transition-all duration-300',
        'animate-in fade-in slide-in-from-top-2 sm:slide-in-from-right-4',
        config.bg,
        config.border
      )}
    >
      <div className="flex items-start gap-3">
        <div className="mt-0.5 p-1 rounded-lg bg-black/40 border border-white/5 shrink-0">
          {config.icon}
        </div>

        <div className="flex-1 min-w-0 pr-2">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span
              className={cn(
                'px-1.5 py-0.2 rounded text-[9px] font-bold uppercase tracking-wider border',
                config.badge
              )}
            >
              {config.badgeText}
            </span>
            <h6 className="font-serif font-bold text-xs sm:text-sm text-foreground truncate">
              {toast.title}
            </h6>
          </div>

          {toast.description && (
            <p className="text-[11px] sm:text-xs text-muted-foreground leading-relaxed line-clamp-3">
              {toast.description}
            </p>
          )}
        </div>

        <button
          type="button"
          onClick={onDismiss}
          className="text-muted-foreground hover:text-foreground p-1 rounded-md transition-colors hover:bg-white/5"
          aria-label="Close notification"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Auto-dismiss countdown bar */}
      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-black/40">
        <div
          className={cn('h-full transition-all ease-linear', config.progressBar)}
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}
