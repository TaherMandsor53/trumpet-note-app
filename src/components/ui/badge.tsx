import * as React from 'react';
import { cn } from '@/lib/utils';

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?:
    | 'default'
    | 'secondary'
    | 'destructive'
    | 'outline'
    | 'gold'
    | 'emerald'
    | 'new'
    | 'havenly-pill'
    | 'terracotta';
}

function Badge({ className, variant = 'default', ...props }: BadgeProps) {
  const variantStyles = {
    default: 'border-transparent bg-primary text-primary-foreground shadow-sm',
    secondary: 'border-border/60 bg-secondary/80 text-secondary-foreground',
    destructive: 'border-transparent bg-destructive text-destructive-foreground',
    outline: 'text-foreground border border-border/80 bg-background/50 backdrop-blur-xs',
    gold: 'border-amber-400/40 bg-amber-500/15 text-amber-400 font-semibold border',
    emerald: 'border-emerald-400/40 bg-emerald-500/15 text-emerald-400 font-semibold border',
    new: 'border-amber-400 bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-600 text-slate-950 font-black shadow-md shadow-amber-500/30 tracking-wider uppercase text-[10px] px-2.5 py-0.5 animate-rhythm',
    'havenly-pill':
      'border-amber-400/25 bg-amber-500/10 text-amber-300 font-semibold uppercase tracking-widest text-[10px] px-3 py-1 backdrop-blur-md',
    terracotta:
      'border-[#D97736]/40 bg-[#D97736]/15 text-[#E5A93C] font-semibold border text-[11px] px-2.5 py-0.5',
  };

  return (
    <div
      className={cn(
        'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
        variantStyles[variant],
        className
      )}
      {...props}
    />
  );
}

export { Badge };
