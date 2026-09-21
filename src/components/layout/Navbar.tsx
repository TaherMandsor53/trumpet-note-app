'use client';

import React from 'react';
import Image from 'next/image';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '@/store';
import { setTheme } from '@/store/themeSlice';
import { useRouter } from 'next/navigation';
import { logout } from '@/store/authSlice';
import { useLogoutUserMutation } from '@/store/api/bandApi';
import { isInstrumentMajor } from '@/lib/rbac';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { SoundwaveAnimation } from '@/components/ui/musical-icons';
import { Moon, Contrast, LogOut } from 'lucide-react';

export function Navbar({ activeTab, onTabChange }: { activeTab: string; onTabChange: (tab: string) => void }) {
  const router = useRouter();
  const dispatch = useDispatch();
  const [logoutUser] = useLogoutUserMutation();
  const theme = useSelector((state: RootState) => state.theme.theme);
  const currentUser = useSelector((state: RootState) => state.auth.user);
  const activeRole = useSelector((state: RootState) => state.auth.activeRole);

  const cycleTheme = () => {
    if (theme === 'dark') dispatch(setTheme('monochrome'));
    else dispatch(setTheme('dark'));
  };

  const getRoleBadgeVariant = (role: string) => {
    if (role === 'Overall Major') return 'gold';
    if (role === 'Treasurer') return 'emerald';
    if (role.endsWith('Major')) return 'default';
    return 'secondary';
  };

  const roleName = currentUser?.role || activeRole;
  const isOverallMajor = roleName === 'Overall Major';
  const isTreasurer = roleName === 'Treasurer';

  const handleBrandClick = () => {
    if (roleName === 'Treasurer') onTabChange('financials');
    else if (isInstrumentMajor(roleName)) onTabChange('section');
    else if (roleName === 'Band Member / Player') onTabChange('member-portal');
    else onTabChange('dashboard');
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between h-16 gap-4">
        {/* Brand */}
        <div className="flex items-center gap-3 cursor-pointer" onClick={handleBrandClick}>
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
              <span className="font-serif font-black tracking-wide text-lg text-foreground">TAHERI SCOUT BAND</span>
              <SoundwaveAnimation />
            </div>
            <p className="text-[11px] text-muted-foreground uppercase tracking-widest font-mono">Religious Band Khidmat • Est. 1988</p>
          </div>
        </div>

        {/* Right Section: Active User & Theme Switcher */}
        <div className="flex items-center gap-3">
          {/* Active Role Indicator */}
          <div className="hidden sm:flex flex-col items-end justify-center">
            <span className="text-xs font-bold text-foreground tracking-tight leading-normal max-w-[220px] truncate text-right">
              {currentUser?.name || 'Active Session'}
            </span>
            <div className="flex items-center justify-end gap-1.5 mt-1.5">
              <Badge
                variant={getRoleBadgeVariant(roleName) as any}
                className="text-[10px] py-0 px-2 font-semibold shadow-xs"
              >
                {roleName}
              </Badge>
              {currentUser?.section && !isOverallMajor && !isTreasurer && (
                <span className="text-[10px] text-muted-foreground font-medium">
                  • {currentUser.section}
                </span>
              )}
            </div>
          </div>

          {/* Divider */}
          <div className="h-6 w-px bg-border/60 mx-0.5 hidden sm:block" />

          {/* Theme Toggle Button (Dark <-> Monochrome only) */}
          <Button
            variant="outline"
            size="sm"
            onClick={cycleTheme}
            className="flex items-center gap-1.5 text-xs font-medium px-2.5 h-8 border-border/80 hover:bg-accent/40"
            title="Toggle theme (Dark or Monochrome)"
          >
            {theme === 'monochrome' ? (
              <>
                <Contrast className="w-3.5 h-3.5 text-foreground" />
                <span className="hidden md:inline font-mono">Monochrome</span>
              </>
            ) : (
              <>
                <Moon className="w-3.5 h-3.5 text-amber-400" />
                <span className="hidden md:inline">Dark</span>
              </>
            )}
          </Button>

          {/* Sign Out Button */}
          <Button
            id="sign-out-btn"
            variant="outline"
            size="sm"
            onClick={async () => {
              try {
                await logoutUser().unwrap();
              } catch (e) {
                // ignore
              }
              dispatch(logout());
              window.location.href = '/';
            }}
            className="flex items-center gap-1.5 text-xs font-medium px-2.5 h-8 border-red-500/30 text-red-300 hover:text-red-200 hover:bg-red-500/10 transition-colors"
            title="Sign out of Taheri Scout Band portal"
          >
            <LogOut className="w-3.5 h-3.5 text-red-400" />
            <span className="hidden sm:inline">Sign Out</span>
          </Button>
        </div>
      </div>
    </header>
  );
}
