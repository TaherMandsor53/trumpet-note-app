'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '@/store';
import { useGetMeQuery } from '@/store/api/bandApi';
import { setCredentials, setActiveRole } from '@/store/authSlice';
import { Navbar } from '@/components/layout/Navbar';
import { Sidepanel } from '@/components/layout/Sidepanel';
import { RoleBasedDashboard } from '@/components/dashboards/RoleBasedDashboard';
import { FinancialPortal } from '@/components/dashboards/FinancialPortal';
import { SectionWorkspace } from '@/components/dashboards/SectionWorkspace';
import { MemberPortal } from '@/components/dashboards/MemberPortal';
import { HierarchicalOrgChart } from '@/components/org-chart/HierarchicalOrgChart';
import { NoteTransposer } from '@/components/tools/NoteTransposer';
import { VideoShowcase } from '@/components/tools/VideoShowcase';
import { DriveSyncModal } from '@/components/tunes/DriveSyncModal';
import { ExcelImportExportModal } from '@/components/excel/ExcelImportExportModal';
import { AttendanceMarker } from '@/components/attendance/AttendanceMarker';
import { AttendanceReports } from '@/components/attendance/AttendanceReports';
import { Button } from '@/components/ui/button';
import {
  canAccessFullFinancials,
  isOverallMajor,
  isInstrumentMajor,
  isTreasurer,
  canSyncDrive,
} from '@/lib/rbac';
import { InstrumentSection, Role } from '@/types/band';
import {
  ArrowRight,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export default function DashboardPage() {
  const router = useRouter();
  const dispatch = useDispatch();
  const currentUser = useSelector((state: RootState) => state.auth.user);
  const activeRole = useSelector((state: RootState) => state.auth.activeRole);

  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [selectedWorkspaceSection, setSelectedWorkspaceSection] = useState<InstrumentSection>('Trumpet');
  const [isDriveModalOpen, setIsDriveModalOpen] = useState(false);
  const [isExcelModalOpen, setIsExcelModalOpen] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  // Restore collapsed state preference from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('tsb_sidepanel_collapsed');
      if (saved !== null) {
        setIsSidebarCollapsed(saved === 'true');
      }
    } catch {
      // Ignore
    }
  }, []);

  const handleToggleCollapse = () => {
    setIsSidebarCollapsed(prev => {
      const next = !prev;
      try {
        localStorage.setItem('tsb_sidepanel_collapsed', String(next));
      } catch {
        // Ignore
      }
      return next;
    });
  };

  const { data: sessionData, isLoading: isSessionLoading } = useGetMeQuery();

  // Authentication & Session Guard
  useEffect(() => {
    if (!isSessionLoading) {
      if (sessionData?.authenticated && sessionData.user) {
        if (!currentUser || currentUser.id !== sessionData.user.id) {
          dispatch(setCredentials({ user: sessionData.user, token: '' }));
          dispatch(setActiveRole(sessionData.user.role));
        }
      } else if (!currentUser) {
        // Unauthenticated -> redirect to login page
        router.push('/');
      }
    }
  }, [isSessionLoading, sessionData, currentUser, dispatch, router]);

  // Tab permission validator for strict role separation
  const isTabAllowedForRole = (tab: string, role: string, user?: any) => {
    const r = role as Role;
    if (tab === 'dashboard') return true; // All roles have role-wise dashboard!
    if (isOverallMajor(r)) return true;
    if (isTreasurer(r, user || currentUser)) {
      return ['dashboard', 'financials', 'member-portal', 'section', 'attendance', 'org-chart', 'transposer', 'videos'].includes(tab);
    }
    if (isInstrumentMajor(r)) {
      return ['dashboard', 'section', 'attendance', 'org-chart', 'transposer', 'videos'].includes(tab);
    }
    if (role === 'Band Member / Player' || role.endsWith('Member') || role === 'Instrument Maintainer') {
      return ['dashboard', 'member-portal', 'attendance', 'org-chart', 'transposer', 'videos'].includes(tab);
    }
    return false;
  };

  const getDefaultTabForRole = (role: string, user?: any) => {
    return 'dashboard';
  };

  // Adjust active tab when role switches or if an unauthorized tab is visited
  useEffect(() => {
    const role = currentUser?.role || activeRole;
    if (!isTabAllowedForRole(activeTab, role, currentUser)) {
      setActiveTab(getDefaultTabForRole(role, currentUser));
    }
  }, [activeRole, currentUser, activeTab]);

  const effectiveRole = currentUser?.role || activeRole;

  // Show loading spinner while determining session state
  if (isSessionLoading && !currentUser) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background text-foreground">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-[#D97736] animate-spin" />
          <p className="text-sm font-medium text-muted-foreground animate-pulse">
            Verifying Taheri Scout Band credentials...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-background text-foreground w-full relative">
      {/* Access-Controlled Sidepanel (Desktop fixed full-height, Mobile slide-out drawer) */}
      <Sidepanel
        activeTab={activeTab}
        onTabChange={setActiveTab}
        isOpenMobile={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={handleToggleCollapse}
        onOpenDriveSync={() => setIsDriveModalOpen(true)}
        onOpenExcelSync={() => setIsExcelModalOpen(true)}
      />

      {/* Main viewport & content column (responsive padding offset matching fixed sidebar) */}
      <div
        className={cn(
          'flex-1 flex flex-col min-w-0 min-h-screen overflow-x-hidden transition-[padding-left] duration-300 ease-in-out',
          isSidebarCollapsed ? 'lg:pl-20' : 'lg:pl-64'
        )}
      >
        {/* Top Notification Announcement Bar */}
        <div className="w-full bg-[#1A0C06] border-b border-amber-900/30 text-amber-200/90 text-[10px] sm:text-[11px] py-1.5 px-3 sm:px-4 text-center font-medium tracking-wide flex items-center justify-center gap-1.5 sm:gap-2">
          <span className="inline-block w-2 h-2 rounded-full bg-[#D97736] animate-ping shrink-0" />
          <span className="truncate">Taheri Scout Band • Milad Mubarak Madeh Repertoire, Hazri &amp; Lavajam Portal Synchronized</span>
          {canSyncDrive(effectiveRole) && (
            <button
              onClick={() => setIsDriveModalOpen(true)}
              className="hidden sm:inline-flex items-center gap-1 font-bold text-[#D97736] hover:underline ml-2 shrink-0"
            >
              <span>Sync Scores</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          )}
        </div>

        {/* Global Navigation Header with Mobile Hamburger button */}
        <Navbar
          activeTab={activeTab}
          onTabChange={setActiveTab}
          onToggleSidebar={() => setIsMobileSidebarOpen(prev => !prev)}
        />

        {/* Main Content Area */}
        <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 md:p-8">
          {/* Role-Based Dashboard View (Role-specific details for Major, Treasurer, Section Major, and Musician) */}
          {activeTab === 'dashboard' && (
            <RoleBasedDashboard
              setActiveTab={setActiveTab}
              setSelectedWorkspaceSection={setSelectedWorkspaceSection}
              setIsDriveModalOpen={setIsDriveModalOpen}
              setIsExcelModalOpen={setIsExcelModalOpen}
            />
          )}

          {/* Financial Portal (Treasurer & Overall Major) */}
          {activeTab === 'financials' && canAccessFullFinancials(effectiveRole, currentUser) && (
            <FinancialPortal />
          )}

          {/* Section Workspace */}
          {activeTab === 'section' && (isInstrumentMajor(effectiveRole) || isOverallMajor(effectiveRole) || isTreasurer(effectiveRole, currentUser)) && (
            <SectionWorkspace initialSection={selectedWorkspaceSection} />
          )}

          {/* Practice Attendance (Hazri) */}
          {activeTab === 'attendance' && (
            <div className="space-y-6">
              <AttendanceMarker />
              {isOverallMajor(effectiveRole) && <AttendanceReports />}
            </div>
          )}

          {/* My Madeh Portal */}
          {activeTab === 'member-portal' && (
            <MemberPortal />
          )}

          {/* Org Chart (Visible to ALL roles) */}
          {activeTab === 'org-chart' && <HierarchicalOrgChart />}

          {/* Note Transposer Tool (Visible to ALL roles) */}
          {activeTab === 'transposer' && <NoteTransposer />}

          {/* Procession Videos (Visible to ALL roles) */}
          {activeTab === 'videos' && <VideoShowcase />}
        </main>

        {/* Modals strictly gated by role */}
        {canSyncDrive(effectiveRole) && (
          <DriveSyncModal open={isDriveModalOpen} onOpenChange={setIsDriveModalOpen} />
        )}
        {canAccessFullFinancials(effectiveRole, currentUser) && (
          <ExcelImportExportModal open={isExcelModalOpen} onOpenChange={setIsExcelModalOpen} />
        )}

        {/* Footer */}
        <footer className="border-t py-6 px-4 bg-card/60 backdrop-blur-md text-center text-xs text-muted-foreground mt-auto">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className="font-serif font-bold text-foreground text-sm">TAHERI SCOUT BAND</span>
              <span>© {new Date().getFullYear()} All rights reserved.</span>
            </div>
            <div className="flex items-center gap-4 text-[11px]">
              <span className="font-medium text-foreground/80">Powered By Taher Mandsorwala</span>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
