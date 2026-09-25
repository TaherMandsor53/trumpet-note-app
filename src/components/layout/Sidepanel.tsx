'use client';

import React from 'react';
import Image from 'next/image';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '@/store';
import { setTheme } from '@/store/themeSlice';
import { logout } from '@/store/authSlice';
import { useLogoutUserMutation } from '@/store/api/bandApi';
import {
  isOverallMajor,
  isInstrumentMajor,
  isTreasurer,
  canAccessFullFinancials,
  canSyncDrive,
} from '@/lib/rbac';
import { Role } from '@/types/band';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { SoundwaveAnimation } from '@/components/ui/musical-icons';
import {
  LayoutDashboard,
  Crown,
  Coins,
  Users,
  CalendarCheck,
  BookOpen,
  Network,
  Music,
  Video,
  CloudLightning,
  FileSpreadsheet,
  Moon,
  Sun,
  LogOut,
  X,
  ChevronRight,
  ShieldCheck,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface SidepanelProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  onOpenDriveSync?: () => void;
  onOpenExcelSync?: () => void;
}

export function Sidepanel({
  activeTab,
  onTabChange,
  isOpenMobile,
  onCloseMobile,
  isCollapsed = false,
  onToggleCollapse,
  onOpenDriveSync,
  onOpenExcelSync,
}: SidepanelProps) {
  const dispatch = useDispatch();
  const [logoutUser] = useLogoutUserMutation();
  const theme = useSelector((state: RootState) => state.theme.theme);
  const currentUser = useSelector((state: RootState) => state.auth.user);
  const activeRole = useSelector((state: RootState) => state.auth.activeRole);

  const roleName = (currentUser?.role || activeRole) as Role;
  const isTreasurerUser = isTreasurer(roleName, currentUser);
  const isOverallMajorUser = isOverallMajor(roleName);
  const isInstrumentMajorUser = isInstrumentMajor(roleName);

  const displayRoleTitle = currentUser?.name?.includes('HUSAIN JUJARBHAI KUNDAWALA')
    ? 'Trumpet Member • Treasurer'
    : currentUser?.name?.includes('TAHA MAZHARBHAI KUNDAWALA')
    ? 'SideDrum Member • Treasurer'
    : roleName;

  const cycleTheme = () => {
    dispatch(setTheme(theme === 'dark' ? 'light' : 'dark'));
  };

  const handleSignOut = async () => {
    try {
      await logoutUser().unwrap();
    } catch {
      // Ignore
    }
    dispatch(logout());
    window.location.href = '/';
  };

  const handleSelectTab = (tabId: string) => {
    onTabChange(tabId);
    onCloseMobile();
  };

  // Define All Navigation Tabs with their access rules
  const allNavItems = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      subtitle: isOverallMajorUser
        ? 'Executive Command'
        : isTreasurerUser
        ? 'Treasury Hub'
        : isInstrumentMajorUser
        ? `${currentUser?.section || 'Section'} Command`
        : 'Musician Portal',
      icon: LayoutDashboard,
      allowed: true, // Visible to all roles with role-wise details!
      badge: 'Hub',
      badgeVariant: 'secondary' as const,
    },
    {
      id: 'financials',
      label: 'Lavajam Management',
      subtitle: 'Dues Ledger & Accounts',
      icon: Coins,
      allowed: canAccessFullFinancials(roleName, currentUser),
      badge: 'Finance',
      badgeVariant: 'emerald' as const,
    },
    {
      id: 'section',
      label: 'Section Workspace',
      subtitle: `${currentUser?.section || 'Instrument'} Musicians & Scores`,
      icon: Users,
      allowed: isOverallMajorUser || isInstrumentMajorUser || isTreasurerUser,
      badge: currentUser?.section || 'Section',
      badgeVariant: 'gold' as const,
    },
    {
      id: 'member-portal',
      label: 'My Madeh Portal',
      subtitle: 'Assigned Scores & Practice',
      icon: BookOpen,
      allowed:
        !isOverallMajorUser || isTreasurerUser, // Members, Section Majors, and Treasurer
      badge: 'Repertoire',
      badgeVariant: 'outline' as const,
    },
    {
      id: 'attendance',
      label: 'Practice Attendance',
      subtitle: 'Rehearsal Hazri Ledger',
      icon: CalendarCheck,
      allowed: true, // Visible to all roles
      badge: 'Hazri',
      badgeVariant: 'secondary' as const,
    },
    {
      id: 'org-chart',
      label: 'Band Khidmat Roster',
      subtitle: 'Leadership Tree Structure',
      icon: Network,
      allowed: true, // Visible to all roles
      badge: '40 Members',
      badgeVariant: 'outline' as const,
    },
    {
      id: 'transposer',
      label: 'Compose Madeh Notes',
      subtitle: 'Brass Transposer & Staves',
      icon: Music,
      allowed: true, // Visible to all roles
      badge: 'Tool',
      badgeVariant: 'secondary' as const,
    },
    {
      id: 'videos',
      label: 'Procession Videos',
      subtitle: 'Parade & Milad Showcase',
      icon: Video,
      allowed: true, // Visible to all roles
      badge: 'Media',
      badgeVariant: 'secondary' as const,
    },
  ];

  // Filter tabs strictly based on user access
  const accessibleNavItems = allNavItems.filter(item => item.allowed);

  const getRoleBadgeVariant = (role: string) => {
    if (role === 'Overall Major' || role === 'Major') return 'gold';
    if (isTreasurerUser || role === 'Treasurer') return 'emerald';
    if (role.endsWith('Major')) return 'default';
    return 'secondary';
  };

  // Nav Content Component (handles both expanded and collapsed icon-only mode)
  const NavigationContent = ({ isCollapsedMode = false }: { isCollapsedMode?: boolean }) => (
    <div className="flex flex-col h-full select-none">
      {/* 1. Brand & Crest Header */}
      <div className="p-3.5 border-b border-border/70 flex items-center justify-between gap-2 shrink-0">
        {!isCollapsedMode ? (
          <>
            <div
              className="flex items-center gap-2.5 cursor-pointer min-w-0 flex-1"
              onClick={() => handleSelectTab('dashboard')}
            >
              <div className="relative w-10 h-10 rounded-full overflow-hidden border-2 border-amber-400/70 shadow-md shrink-0 bg-background">
                <Image
                  src="/assets/images/TaheriScoutImg.png"
                  alt="Taheri Scout Band Crest"
                  width={40}
                  height={40}
                  className="object-cover"
                  priority
                />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="font-serif font-black tracking-wide text-sm text-foreground truncate">
                    TAHERI SCOUT
                  </span>
                  <SoundwaveAnimation />
                </div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-mono truncate">
                  Band Portal • 1448H
                </p>
              </div>
            </div>

            {/* Desktop Collapse Toggle Button */}
            {onToggleCollapse && (
              <button
                type="button"
                onClick={onToggleCollapse}
                className="hidden lg:flex p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/70 transition-colors cursor-pointer"
                title="Collapse Sidebar"
                aria-label="Collapse Sidebar"
              >
                <PanelLeftClose className="w-4 h-4 text-[#D97736]" />
              </button>
            )}

            {/* Mobile Close Button */}
            <button
              type="button"
              onClick={onCloseMobile}
              className="lg:hidden p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors cursor-pointer"
              aria-label="Close menu"
            >
              <X className="w-5 h-5" />
            </button>
          </>
        ) : (
          /* Collapsed Header: Centered Crest with Expand Button */
          <div className="w-full flex flex-col items-center gap-2 relative group/brand">
            <div
              className="relative w-10 h-10 rounded-full overflow-hidden border-2 border-amber-400/80 shadow-md shrink-0 bg-background cursor-pointer hover:scale-105 transition-transform"
              onClick={() => handleSelectTab('dashboard')}
              title="Taheri Scout Band • Dashboard"
            >
              <Image
                src="/assets/images/TaheriScoutImg.png"
                alt="Taheri Scout Band Crest"
                width={40}
                height={40}
                className="object-cover"
                priority
              />
            </div>
            {/* Expand Toggle Button */}
            {onToggleCollapse && (
              <button
                type="button"
                onClick={onToggleCollapse}
                className="p-1 rounded-md text-amber-500 hover:text-amber-300 hover:bg-amber-500/15 transition-all cursor-pointer"
                title="Expand Sidebar"
                aria-label="Expand Sidebar"
              >
                <PanelLeftOpen className="w-4 h-4" />
              </button>
            )}

            {/* Hover Tooltip for Collapsed Brand */}
            <div className="absolute left-full top-2 ml-3.5 hidden group-hover/brand:flex items-center z-50 pointer-events-none drop-shadow-xl">
              <div className="w-2 h-2 bg-[#25130B] dark:bg-[#1E1008] border-l border-b border-amber-500/40 rotate-45 -mr-1 z-10" />
              <div className="px-3 py-1.5 rounded-xl bg-[#25130B] dark:bg-[#1E1008] text-foreground border border-amber-500/40 shadow-2xl text-xs whitespace-nowrap animate-in fade-in zoom-in-95 duration-150">
                <span className="font-bold text-amber-300">TAHERI SCOUT BAND</span>
                <span className="block text-[10px] text-muted-foreground font-mono">Official Portal • 1448H</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 2. Active User Profile Summary Card */}
      {!isCollapsedMode ? (
        <div className="p-3 border-b border-border/60 bg-muted/20 shrink-0">
          <div className="p-3 rounded-xl bg-card border border-border/70 shadow-xs space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-bold text-foreground truncate max-w-[160px]">
                {currentUser?.name || 'Active Member'}
              </span>
              <Badge
                variant={getRoleBadgeVariant(roleName) as any}
                className="text-[9px] py-0 px-1.5 font-bold uppercase tracking-wider shrink-0"
              >
                {displayRoleTitle}
              </Badge>
            </div>
            <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-0.5">
              <span>
                Section: <strong className="text-foreground">{currentUser?.section || 'General'}</strong>
              </span>
              {currentUser?.itsNumber && (
                <span className="font-mono text-[10px] text-muted-foreground">
                  ITS: {currentUser.itsNumber}
                </span>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* Collapsed Profile: Compact Icon with Hover Details Tooltip */
        <div className="p-2 border-b border-border/60 bg-muted/20 flex flex-col items-center shrink-0">
          <div className="relative group/profile flex items-center justify-center">
            <div
              className={cn(
                'w-10 h-10 rounded-xl border flex items-center justify-center text-xs font-bold uppercase shadow-xs transition-transform hover:scale-105 cursor-pointer',
                roleName === 'Overall Major' || roleName === 'Major'
                  ? 'border-amber-400/60 bg-amber-500/15 text-amber-300'
                  : isTreasurerUser
                  ? 'border-emerald-500/60 bg-emerald-500/15 text-emerald-300'
                  : 'border-border/70 bg-card text-foreground'
              )}
              title={currentUser?.name || 'Active Session'}
            >
              {currentUser?.name ? currentUser.name.charAt(0) : 'U'}
            </div>

            {/* Hover Tooltip for Profile in Collapsed Mode */}
            <div className="absolute left-full top-1/2 -translate-y-1/2 ml-3.5 hidden group-hover/profile:flex items-center z-50 pointer-events-none drop-shadow-xl">
              <div className="w-2 h-2 bg-[#25130B] dark:bg-[#1E1008] border-l border-b border-amber-500/40 rotate-45 -mr-1 z-10" />
              <div className="px-3.5 py-2 rounded-xl bg-[#25130B] dark:bg-[#1E1008] text-foreground border border-amber-500/40 shadow-2xl text-xs whitespace-nowrap flex flex-col gap-0.5 animate-in fade-in zoom-in-95 duration-150 min-w-[160px]">
                <span className="font-bold text-foreground text-xs">{currentUser?.name || 'Active Member'}</span>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <Badge variant={getRoleBadgeVariant(roleName) as any} className="text-[9px] py-0 px-1.5 font-bold uppercase">
                    {displayRoleTitle}
                  </Badge>
                  <span className="text-[10px] text-muted-foreground">• {currentUser?.section || 'General'}</span>
                </div>
                {currentUser?.itsNumber && (
                  <span className="text-[10px] font-mono text-[#D97736] mt-0.5">ITS: {currentUser.itsNumber}</span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. Navigation Links List (Access Controlled) */}
      <div
        className={cn(
          'flex-1 py-3 space-y-1.5',
          isCollapsedMode
            ? 'px-2 overflow-visible'
            : 'px-2.5 overflow-y-auto scrollbar-thin'
        )}
      >
        {!isCollapsedMode && (
          <div className="px-2 pb-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/80 flex items-center justify-between">
            <span>Khidmat Modules</span>
            <span className="text-[9px] font-mono text-muted-foreground">
              {accessibleNavItems.length} Tabs
            </span>
          </div>
        )}

        {accessibleNavItems.map(item => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          if (isCollapsedMode) {
            // Collapsed: Centered Icon Button with High-Impact Hover Tooltip
            return (
              <div key={item.id} className="relative group/navitem flex items-center justify-center">
                <button
                  type="button"
                  onClick={() => handleSelectTab(item.id)}
                  title={item.label}
                  aria-label={item.label}
                  className={cn(
                    'w-11 h-11 rounded-xl flex items-center justify-center transition-all cursor-pointer relative',
                    isActive
                      ? 'bg-[#D97736] text-white shadow-warm-glow ring-2 ring-[#D97736]/50'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/70'
                  )}
                >
                  <Icon className="w-5 h-5" />
                  {isActive && (
                    <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-[#D97736] border-2 border-card animate-pulse" />
                  )}
                </button>

                {/* Floating Tooltip showing Sidepanel Name on Hover */}
                <div className="absolute left-full top-1/2 -translate-y-1/2 ml-3.5 hidden group-hover/navitem:flex items-center z-50 pointer-events-none drop-shadow-2xl">
                  {/* Tooltip Arrow */}
                  <div className="w-2 h-2 bg-[#25130B] dark:bg-[#1E1008] border-l border-b border-amber-500/40 rotate-45 -mr-1 z-10" />
                  <div className="px-3.5 py-2 rounded-xl bg-[#25130B] dark:bg-[#1E1008] text-foreground border border-amber-500/40 shadow-2xl text-xs whitespace-nowrap flex flex-col gap-0.5 animate-in fade-in zoom-in-95 duration-150 min-w-[145px]">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-amber-300 text-xs tracking-wide">
                        {item.label}
                      </span>
                      {item.badge && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 font-mono font-semibold">
                          {item.badge}
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-muted-foreground font-medium">
                      {item.subtitle}
                    </span>
                  </div>
                </div>
              </div>
            );
          }

          // Expanded: Full Item with Labels and Badges
          return (
            <button
              key={item.id}
              onClick={() => handleSelectTab(item.id)}
              className={cn(
                'w-full text-left flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition-all group relative cursor-pointer',
                isActive
                  ? 'bg-amber-500/15 text-foreground font-bold shadow-xs border border-amber-500/40 dark:bg-amber-500/20'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/40 border border-transparent'
              )}
            >
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div
                  className={cn(
                    'w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors',
                    isActive
                      ? 'bg-[#D97736] text-white shadow-xs'
                      : 'bg-muted/70 text-muted-foreground group-hover:text-foreground group-hover:bg-muted'
                  )}
                >
                  <Icon className="w-4 h-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-semibold truncate leading-tight">
                    {item.label}
                  </div>
                  <div className="text-[10px] text-muted-foreground truncate leading-tight mt-0.5">
                    {item.subtitle}
                  </div>
                </div>
              </div>

              {/* Right Indicator / Badge */}
              <div className="shrink-0 flex items-center gap-1">
                {isActive && (
                  <span className="w-1.5 h-1.5 rounded-full bg-[#D97736] animate-pulse" />
                )}
                <ChevronRight
                  className={cn(
                    'w-3.5 h-3.5 transition-transform',
                    isActive
                      ? 'text-[#D97736] translate-x-0.5'
                      : 'text-muted-foreground/40 group-hover:text-muted-foreground'
                  )}
                />
              </div>
            </button>
          );
        })}
      </div>

      {/* 4. Quick Integration Tools (Drive & Excel Sync) */}
      {(canSyncDrive(roleName) || canAccessFullFinancials(roleName, currentUser)) && (
        <div className="p-2.5 border-t border-border/70 bg-muted/15 shrink-0">
          {!isCollapsedMode ? (
            <div className="space-y-1">
              <div className="px-2 text-[9px] font-bold uppercase tracking-wider text-muted-foreground/80 mb-1">
                Data Synchronization
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                {canSyncDrive(roleName) && onOpenDriveSync && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      onOpenDriveSync();
                      onCloseMobile();
                    }}
                    className="text-[11px] h-8 px-2 gap-1.5 border-[#D97736]/40 hover:bg-[#D97736]/10 text-foreground justify-center cursor-pointer"
                    title="Sync scores with Google Drive"
                  >
                    <CloudLightning className="w-3.5 h-3.5 text-[#D97736]" />
                    <span>Drive Sync</span>
                  </Button>
                )}

                {canAccessFullFinancials(roleName, currentUser) && onOpenExcelSync && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      onOpenExcelSync();
                      onCloseMobile();
                    }}
                    className="text-[11px] h-8 px-2 gap-1.5 border-emerald-500/40 hover:bg-emerald-500/10 text-foreground justify-center cursor-pointer"
                    title="Import/Export Excel sheets"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Excel Sync</span>
                  </Button>
                )}
              </div>
            </div>
          ) : (
            /* Collapsed Sync: Centered Icon Buttons with Hover Tooltips */
            <div className="flex flex-col items-center gap-2">
              {canSyncDrive(roleName) && onOpenDriveSync && (
                <div className="relative group/sync flex items-center justify-center">
                  <button
                    type="button"
                    onClick={onOpenDriveSync}
                    className="w-10 h-10 rounded-xl border border-[#D97736]/40 hover:bg-[#D97736]/15 text-[#D97736] flex items-center justify-center cursor-pointer transition-all shadow-xs"
                    title="Google Drive Sync"
                    aria-label="Google Drive Sync"
                  >
                    <CloudLightning className="w-4 h-4" />
                  </button>
                  <div className="absolute left-full top-1/2 -translate-y-1/2 ml-3.5 hidden group-hover/sync:flex items-center z-50 pointer-events-none drop-shadow-xl">
                    <div className="w-2 h-2 bg-[#25130B] dark:bg-[#1E1008] border-l border-b border-amber-500/40 rotate-45 -mr-1 z-10" />
                    <div className="px-3 py-1.5 rounded-xl bg-[#25130B] dark:bg-[#1E1008] text-foreground border border-amber-500/40 shadow-2xl text-xs whitespace-nowrap flex flex-col animate-in fade-in zoom-in-95 duration-150">
                      <span className="font-bold text-amber-300 text-xs">Drive Sync</span>
                      <span className="text-[10px] text-muted-foreground">Sync scores with Google Drive</span>
                    </div>
                  </div>
                </div>
              )}

              {canAccessFullFinancials(roleName, currentUser) && onOpenExcelSync && (
                <div className="relative group/excel flex items-center justify-center">
                  <button
                    type="button"
                    onClick={onOpenExcelSync}
                    className="w-10 h-10 rounded-xl border border-emerald-500/40 hover:bg-emerald-500/15 text-emerald-400 flex items-center justify-center cursor-pointer transition-all shadow-xs"
                    title="Excel Sync"
                    aria-label="Excel Sync"
                  >
                    <FileSpreadsheet className="w-4 h-4" />
                  </button>
                  <div className="absolute left-full top-1/2 -translate-y-1/2 ml-3.5 hidden group-hover/excel:flex items-center z-50 pointer-events-none drop-shadow-xl">
                    <div className="w-2 h-2 bg-[#25130B] dark:bg-[#1E1008] border-l border-b border-emerald-500/40 rotate-45 -mr-1 z-10" />
                    <div className="px-3 py-1.5 rounded-xl bg-[#25130B] dark:bg-[#1E1008] text-foreground border border-emerald-500/40 shadow-2xl text-xs whitespace-nowrap flex flex-col animate-in fade-in zoom-in-95 duration-150">
                      <span className="font-bold text-emerald-400 text-xs">Excel Sync</span>
                      <span className="text-[10px] text-muted-foreground">Import / Export Excel sheets</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* 5. Footer Utilities: Theme Toggle, Logout & Collapse Switcher */}
      <div className="p-3 border-t border-border/70 bg-card/80 shrink-0">
        {!isCollapsedMode ? (
          <div className="flex items-center justify-between gap-1.5">
            <Button
              variant="outline"
              size="sm"
              onClick={cycleTheme}
              className="flex-1 text-xs gap-1.5 h-8 font-medium border-border/80 hover:bg-accent/40 cursor-pointer"
              title="Toggle Theme"
            >
              {theme === 'light' ? (
                <>
                  <Sun className="w-3.5 h-3.5 text-amber-500" />
                  <span>Light Mode</span>
                </>
              ) : (
                <>
                  <Moon className="w-3.5 h-3.5 text-amber-400" />
                  <span>Dark Mode</span>
                </>
              )}
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handleSignOut}
              className="h-8 px-2.5 border-red-500/30 text-red-600 dark:text-red-300 hover:bg-red-500/10 transition-colors cursor-pointer"
              title="Sign Out"
            >
              <LogOut className="w-3.5 h-3.5" />
            </Button>

            {onToggleCollapse && (
              <Button
                variant="outline"
                size="sm"
                onClick={onToggleCollapse}
                className="hidden lg:flex h-8 px-2 border-amber-500/40 text-amber-400 hover:bg-amber-500/10 transition-colors cursor-pointer"
                title="Collapse Sidebar"
              >
                <PanelLeftClose className="w-3.5 h-3.5 text-[#D97736]" />
              </Button>
            )}
          </div>
        ) : (
          /* Collapsed Footer: Stacked Centered Buttons with Tooltips */
          <div className="flex flex-col items-center gap-2">
            {/* Theme Toggle */}
            <div className="relative group/theme flex items-center justify-center">
              <button
                type="button"
                onClick={cycleTheme}
                className="w-10 h-10 rounded-xl border border-border/80 hover:bg-accent/40 flex items-center justify-center cursor-pointer transition-all"
                title={theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
                aria-label="Toggle Theme"
              >
                {theme === 'light' ? (
                  <Sun className="w-4 h-4 text-amber-500" />
                ) : (
                  <Moon className="w-4 h-4 text-amber-400" />
                )}
              </button>
              <div className="absolute left-full top-1/2 -translate-y-1/2 ml-3.5 hidden group-hover/theme:flex items-center z-50 pointer-events-none drop-shadow-xl">
                <div className="w-2 h-2 bg-[#25130B] dark:bg-[#1E1008] border-l border-b border-amber-500/40 rotate-45 -mr-1 z-10" />
                <div className="px-3 py-1.5 rounded-xl bg-[#25130B] dark:bg-[#1E1008] text-foreground border border-amber-500/40 shadow-2xl text-xs whitespace-nowrap">
                  {theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
                </div>
              </div>
            </div>

            {/* Sign Out */}
            <div className="relative group/logout flex items-center justify-center">
              <button
                type="button"
                onClick={handleSignOut}
                className="w-10 h-10 rounded-xl border border-red-500/30 text-red-500 hover:bg-red-500/10 flex items-center justify-center cursor-pointer transition-all"
                title="Sign Out"
                aria-label="Sign Out"
              >
                <LogOut className="w-4 h-4" />
              </button>
              <div className="absolute left-full top-1/2 -translate-y-1/2 ml-3.5 hidden group-hover/logout:flex items-center z-50 pointer-events-none drop-shadow-xl">
                <div className="w-2 h-2 bg-[#25130B] dark:bg-[#1E1008] border-l border-b border-red-500/40 rotate-45 -mr-1 z-10" />
                <div className="px-3 py-1.5 rounded-xl bg-[#25130B] dark:bg-[#1E1008] text-foreground border border-red-500/40 shadow-2xl text-xs whitespace-nowrap font-bold text-red-400">
                  Sign Out
                </div>
              </div>
            </div>

            {/* Expand Sidebar Button */}
            {onToggleCollapse && (
              <div className="relative group/expand flex items-center justify-center pt-1 border-t border-border/50 w-full">
                <button
                  type="button"
                  onClick={onToggleCollapse}
                  className="w-10 h-10 rounded-xl border border-amber-500/40 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 flex items-center justify-center cursor-pointer transition-all shadow-xs"
                  title="Expand Sidebar"
                  aria-label="Expand Sidebar"
                >
                  <PanelLeftOpen className="w-5 h-5 text-[#D97736]" />
                </button>
                <div className="absolute left-full top-1/2 -translate-y-1/2 ml-3.5 hidden group-hover/expand:flex items-center z-50 pointer-events-none drop-shadow-xl">
                  <div className="w-2 h-2 bg-[#25130B] dark:bg-[#1E1008] border-l border-b border-amber-500/40 rotate-45 -mr-1 z-10" />
                  <div className="px-3 py-1.5 rounded-xl bg-[#25130B] dark:bg-[#1E1008] text-foreground border border-amber-500/40 shadow-2xl text-xs whitespace-nowrap font-bold text-amber-300">
                    Expand Sidebar
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* ========================================================
          DESKTOP SIDEPANEL: Fixed Full Viewport Height
          Always spans from top to bottom (inset-y-0 h-screen).
          Never truncates or scrolls away with main page.
         ======================================================== */}
      <aside
        className={cn(
          'hidden lg:flex flex-col fixed inset-y-0 left-0 z-30 border-r border-border/70 bg-card/95 dark:bg-[#1C0E07]/95 backdrop-blur-2xl h-screen transition-all duration-300 ease-in-out shadow-xl overflow-visible',
          isCollapsed ? 'w-20' : 'w-64'
        )}
      >
        <NavigationContent isCollapsedMode={isCollapsed} />
      </aside>

      {/* ========================================================
          MOBILE / TABLET HAMBURGER DRAWER: Sheet modal (< 1024px)
         ======================================================== */}
      {isOpenMobile && (
        <div className="fixed inset-0 z-50 lg:hidden">
          {/* Backdrop blur overlay */}
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity animate-in fade-in"
            onClick={onCloseMobile}
            aria-hidden="true"
          />

          {/* Slide-out drawer panel (always full expanded width on mobile) */}
          <div className="fixed inset-y-0 left-0 w-[280px] sm:w-[320px] bg-background border-r border-border/80 shadow-2xl z-50 flex flex-col animate-in slide-in-from-left duration-200">
            <NavigationContent isCollapsedMode={false} />
          </div>
        </div>
      )}
    </>
  );
}
