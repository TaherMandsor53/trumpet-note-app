'use client';

import React, { useEffect } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '@/store';

export function ThemeWrapper({ children }: { children: React.ReactNode }) {
  const theme = useSelector((state: RootState) => state.theme.theme);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove('light', 'dark', 'monochrome');
    const safeTheme = theme === 'monochrome' ? 'monochrome' : 'dark';
    root.classList.add(safeTheme);
  }, [theme]);

  return <div className="min-h-screen bg-musical-pattern text-foreground">{children}</div>;
}
