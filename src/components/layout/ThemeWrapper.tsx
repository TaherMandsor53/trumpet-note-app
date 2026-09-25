'use client';

import React, { useEffect } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '@/store';

import { ToastProvider } from '@/components/ui/toast';
import { SessionTimeoutProvider } from '@/components/auth/SessionTimeoutProvider';

export function ThemeWrapper({ children }: { children: React.ReactNode }) {
  const theme = useSelector((state: RootState) => state.theme.theme);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove('light', 'dark', 'monochrome');
    const safeTheme = theme === 'light' ? 'light' : 'dark';
    root.classList.add(safeTheme);
  }, [theme]);

  return (
    <ToastProvider>
      <SessionTimeoutProvider>
        <div className="min-h-screen bg-musical-pattern text-foreground">{children}</div>
      </SessionTimeoutProvider>
    </ToastProvider>
  );
}
