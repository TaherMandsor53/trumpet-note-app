'use client';

import React, { useEffect } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '@/store';

export function ThemeWrapper({ children }: { children: React.ReactNode }) {
  const theme = useSelector((state: RootState) => state.theme.theme);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove('dark', 'light', 'monochrome');
    root.classList.add(theme);
  }, [theme]);

  return <div className="min-h-screen bg-musical-pattern text-foreground">{children}</div>;
}
