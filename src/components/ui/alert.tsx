'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { CheckCircle2, AlertTriangle, AlertCircle, Info, X } from 'lucide-react';

export interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'success' | 'warning' | 'destructive' | 'info';
  onDismiss?: () => void;
}

const variantStyles: Record<string, { container: string; icon: React.ReactNode; iconClass: string }> = {
  default: {
    container: 'border-border/80 bg-card/95 text-foreground shadow-lg',
    icon: <Info className="w-4 h-4 shrink-0 text-primary" />,
    iconClass: 'text-primary',
  },
  info: {
    container: 'border-amber-500/40 bg-[#161311]/95 text-foreground shadow-amber-500/5 shadow-xl',
    icon: <Info className="w-4 h-4 shrink-0 text-amber-400" />,
    iconClass: 'text-amber-400',
  },
  success: {
    container: 'border-emerald-500/40 bg-emerald-950/20 text-emerald-100 shadow-emerald-500/5 shadow-xl backdrop-blur-md',
    icon: <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />,
    iconClass: 'text-emerald-400',
  },
  warning: {
    container: 'border-amber-500/50 bg-amber-950/25 text-amber-100 shadow-amber-500/10 shadow-xl backdrop-blur-md',
    icon: <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400" />,
    iconClass: 'text-amber-400',
  },
  destructive: {
    container: 'border-rose-500/50 bg-rose-950/25 text-rose-100 shadow-rose-500/10 shadow-xl backdrop-blur-md',
    icon: <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />,
    iconClass: 'text-rose-400',
  },
};

export const Alert = React.forwardRef<HTMLDivElement, AlertProps>(
  ({ className, variant = 'default', children, onDismiss, ...props }, ref) => {
    const currentVariant = variantStyles[variant] || variantStyles.default;

    return (
      <div
        ref={ref}
        role="alert"
        className={cn(
          'relative w-full rounded-xl border p-4 text-xs transition-all flex items-start gap-3',
          currentVariant.container,
          className
        )}
        {...props}
      >
        <div className="mt-0.5">{currentVariant.icon}</div>
        <div className="flex-1 min-w-0">{children}</div>
        {onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            className="text-muted-foreground hover:text-foreground p-0.5 rounded-md transition-colors"
            aria-label="Dismiss alert"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    );
  }
);
Alert.displayName = 'Alert';

export const AlertTitle = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, children, ...props }, ref) => (
    <h5
      ref={ref}
      className={cn('font-serif font-bold text-sm tracking-tight leading-none mb-1 text-foreground', className)}
      {...props}
    >
      {children}
    </h5>
  )
);
AlertTitle.displayName = 'AlertTitle';

export const AlertDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('text-xs text-muted-foreground leading-relaxed', className)}
      {...props}
    />
  )
);
AlertDescription.displayName = 'AlertDescription';
