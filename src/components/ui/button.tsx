import * as React from 'react';
import { cn } from '@/lib/utils';

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?:
    | 'default'
    | 'destructive'
    | 'outline'
    | 'secondary'
    | 'ghost'
    | 'link'
    | 'gold'
    | 'emerald'
    | 'havenly'
    | 'havenly-outline'
    | 'pill';
  size?: 'default' | 'sm' | 'lg' | 'icon' | 'pill';
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', size = 'default', ...props }, ref) => {
    const variantStyles = {
      default:
        'bg-primary text-primary-foreground hover:opacity-95 shadow-sm font-medium border border-primary/40',
      destructive:
        'bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-sm',
      outline:
        'border border-input bg-background/80 hover:bg-accent hover:text-accent-foreground backdrop-blur',
      secondary:
        'bg-secondary text-secondary-foreground hover:bg-secondary/80 border border-border/60',
      ghost: 'hover:bg-accent/70 hover:text-accent-foreground',
      link: 'text-primary underline-offset-4 hover:underline',
      gold: 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-semibold shadow-md shadow-amber-500/20 border border-amber-400/40',
      emerald:
        'bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-md shadow-emerald-600/20 border border-emerald-500/40',
      // Havenly / Warm luxury editorial variants inspired by reference image
      havenly:
        'bg-gradient-to-r from-[#D97736] to-[#C26330] hover:from-[#C26330] hover:to-[#A74E20] text-white font-semibold shadow-md shadow-orange-900/30 rounded-full border border-amber-300/30 tracking-wide',
      'havenly-outline':
        'bg-amber-700/10 hover:bg-amber-700/20 text-[#2B150A] dark:text-foreground border border-amber-700/35 hover:border-amber-700/60 dark:bg-white/10 dark:hover:bg-white/15 dark:border-white/20 dark:hover:border-amber-400/40 rounded-full backdrop-blur-md transition-all font-semibold',
      pill: 'bg-primary text-primary-foreground hover:opacity-95 rounded-full shadow-sm font-medium',
    };

    const sizeStyles = {
      default: 'h-9 px-4 py-2 text-sm rounded-lg',
      sm: 'h-8 px-3 text-xs rounded-md',
      lg: 'h-11 px-7 text-base rounded-xl',
      icon: 'h-9 w-9 p-0 flex items-center justify-center rounded-lg',
      pill: 'h-10 px-5 py-2 text-sm rounded-full',
    };

    return (
      <button
        className={cn(
          'inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98]',
          variantStyles[variant],
          sizeStyles[size],
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = 'Button';

export { Button };
