'use client';

import React from 'react';
import Image from 'next/image';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '@/store';
import { setTheme, AppTheme } from '@/store/themeSlice';
import { RoleSwitcherBar } from './RoleSwitcherBar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { SoundwaveAnimation } from '@/components/ui/musical-icons';
import { Moon, Sun, Contrast, ShieldAlert, Music } from 'lucide-react';

export function Navbar({ activeTab, onTabChange }: { activeTab: string; onTabChange: (tab: string) => void }) {
  const dispatch = useDispatch();
  const theme = useSelector((state: RootState) => state.theme.theme);
  const currentUser = useSelector((state: RootState) => state.auth.user);
  const activeRole = useSelector((state: RootState) => state.auth.activeRole);

  const cycleTheme = () => {
    if (theme === 'dark') dispatch(setTheme('monochrome'));
    else if (theme === 'monochrome') dispatch(setTheme('light'));
    else dispatch(setTheme('dark'));
  };

  const getRoleBadgeVariant = (role: string) => {
    if (role === 'Overall Major') return 'gold';
    if (role === 'Treasurer') return 'emerald';
    if (role.endsWith('Major')) return 'default';
    return 'secondary';
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between h-16 gap-4">
        {/* Brand */}
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => onTabChange('dashboard')}>
          <div className="relative w-10 h-10 rounded-full overflow-hidden border-2 border-amber-400/60 shadow-md">
            <Image
              src="/assets/images/TaheriScoutImg.png"
              alt="Taheri Scout Band Crest"
              width={40}
              height={40}
              className="object-cover"
              priority
            />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-serif font-black tracking-wide text-lg text-foreground">
                TAHERI SCOUT BAND
              </span>
              <SoundwaveAnimation />
            </div>
            <p className="text-[11px] text-muted-foreground uppercase tracking-widest font-mono">
              Established Scout Cadence & Repertoire
            </p>
          </div>
        </div>

        {/* Right Section: Active User & Theme Switcher */}
        <div className="flex items-center gap-3">
          {/* Active Role Indicator */}
          <div className="hidden sm:flex flex-col items-end">
            <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
              {currentUser?.name || 'Active Session'}
            </span>
            <div className="flex items-center gap-1.5 mt-0.5">
              <Badge variant={getRoleBadgeVariant(currentUser?.role || activeRole) as any} className="text-[10px] py-0 px-2">
                {currentUser?.role || activeRole}
              </Badge>
              {currentUser?.section && (
                <span className="text-[10px] text-muted-foreground font-medium">
                  • {currentUser.section}
                </span>
              )}
            </div>
          </div>

          {/* Theme Toggle Button (Dark -> Monochrome -> Light) */}
          <Button
            variant="outline"
            size="sm"
            onClick={cycleTheme}
            className="flex items-center gap-1.5 text-xs font-medium px-2.5 h-8 border-border/80"
            title="Toggle theme (Dark, Monochrome, Light)"
          >
            {theme === 'dark' && (
              <>
                <Moon className="w-3.5 h-3.5 text-amber-400" />
                <span className="hidden md:inline">Dark</span>
              </>
            )}
            {theme === 'monochrome' && (
              <>
                <Contrast className="w-3.5 h-3.5 text-foreground" />
                <span className="hidden md:inline font-mono">Monochrome</span>
              </>
            )}
            {theme === 'light' && (
              <>
                <Sun className="w-3.5 h-3.5 text-amber-500" />
                <span className="hidden md:inline">Light</span>
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Role Switcher Toolbar */}
      <RoleSwitcherBar />
    </header>
  );
}
