'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '@/store';
import { useGetMeQuery } from '@/store/api/bandApi';
import { setCredentials, setActiveRole } from '@/store/authSlice';
import { Navbar } from '@/components/layout/Navbar';
import { ExecutiveDashboard } from '@/components/dashboards/ExecutiveDashboard';
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
import { HarmonicDial } from '@/components/ui/HarmonicDial';
import {
  FrequencyEqualizer,
  FloatingNoteParticles,
  MadehStaveVisualizer,
  SoundwaveAnimation,
} from '@/components/ui/musical-icons';
import {
  canAccessFullFinancials,
  isOverallMajor,
  isInstrumentMajor,
  isTreasurer,
  getManagedSection,
  canSyncDrive,
} from '@/lib/rbac';
import { InstrumentSection } from '@/types/band';
import {
  Crown,
  Coins,
  Users,
  Music,
  Network,
  Video,
  FileSpreadsheet,
  CloudLightning,
  UserCheck,
  ArrowRight,
  ShieldCheck,
  Radio,
  Loader2,
  BookOpen,
  Receipt,
  CalendarCheck,
  Sparkles,
} from 'lucide-react';

export default function DashboardPage() {
  const router = useRouter();
  const dispatch = useDispatch();
  const currentUser = useSelector((state: RootState) => state.auth.user);
  const activeRole = useSelector((state: RootState) => state.auth.activeRole);

  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [selectedWorkspaceSection, setSelectedWorkspaceSection] = useState<InstrumentSection>('Trumpet');
  const [isDriveModalOpen, setIsDriveModalOpen] = useState(false);
  const [isExcelModalOpen, setIsExcelModalOpen] = useState(false);

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
  const isTabAllowedForRole = (tab: string, role: string) => {
    if (role === 'Overall Major') return true;
    if (role === 'Treasurer') {
      return ['financials', 'attendance', 'org-chart', 'transposer', 'videos'].includes(tab);
    }
    if (isInstrumentMajor(role)) {
      return ['section', 'attendance', 'org-chart', 'transposer', 'videos'].includes(tab);
    }
    if (role === 'Band Member / Player' || role === 'Instrument Maintainer') {
      return ['member-portal', 'attendance', 'org-chart', 'transposer', 'videos'].includes(tab);
    }
    return false;
  };

  const getDefaultTabForRole = (role: string) => {
    if (role === 'Treasurer') return 'financials';
    if (isInstrumentMajor(role)) return 'section';
    if (role === 'Band Member / Player' || role === 'Instrument Maintainer') return 'member-portal';
    return 'dashboard';
  };

  // Adjust active tab when role switches or if an unauthorized tab is visited
  useEffect(() => {
    const role = currentUser?.role || activeRole;
    if (!isTabAllowedForRole(activeTab, role)) {
      setActiveTab(getDefaultTabForRole(role));
    }
  }, [activeRole, currentUser?.role, activeTab]);

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

  // Get role-specific hero details so no irrelevant items are shown
  const getHeroContent = () => {
    if (effectiveRole === 'Band Member / Player' || effectiveRole === 'Instrument Maintainer') {
      return {
        tag: `✦ BAND MUSICIAN PORTAL • KHIDMAT OF AQA MOLA (TUS)`,
        heading: (
          <>
            Welcome, <span className="italic text-[#E5A93C]">{currentUser?.name || 'Scout Musician'}</span>
          </>
        ),
        subtitle: `Access your section's assigned Madeh notes, practice brass fingering transpositions for upcoming Milad Mubarak, and review your hazri attendance and Lavajam contribution records.`,
        ctaButtons: (
          <>
            <Button
              variant="havenly"
              size="pill"
              onClick={() => setActiveTab('transposer')}
              className="gap-2 text-xs px-5 shadow-warm-glow hover:scale-[1.02] transition-transform"
            >
              <Music className="w-3.5 h-3.5 text-amber-200" />
              <span>Compose / Transpose Madeh</span>
            </Button>
            <Button
              variant="havenly-outline"
              size="pill"
              onClick={() => setActiveTab('member-portal')}
              className="gap-2 text-xs px-5 hover:scale-[1.02] transition-transform"
            >
              <BookOpen className="w-3.5 h-3.5 text-amber-300" />
              <span>My Madeh Notes</span>
            </Button>
            <Button
              variant="havenly-outline"
              size="pill"
              onClick={() => setActiveTab('org-chart')}
              className="gap-2 text-xs px-5 hover:scale-[1.02] transition-transform"
            >
              <Network className="w-3.5 h-3.5 text-amber-300" />
              <span>Band Khidmat Roster</span>
            </Button>
          </>
        ),
        pills: [
          { icon: Music, label: 'Compose Madeh Notes', desc: 'Brass fingering & transpositions' },
          { icon: BookOpen, label: 'Stored Madeh Library', desc: 'Assigned scores for Milad processions' },
          { icon: CalendarCheck, label: 'Hazri & Lavajam', desc: 'Attendance and member contribution dues' },
        ],
        focusTitle: `Active Section: ${currentUser?.section || 'Brass'} Section`,
        focusChips: [`+ ${currentUser?.section || 'Brass'} Lead`, '+ Milad Mubarak Madeh', '+ Procession Cadence', '+ Rehearsal Hazri'],
      };
    }

    if (effectiveRole === 'Treasurer') {
      return {
        tag: '✦ TREASURY ADMINISTRATION • BAND LAVAJAM & KHIDMAT ACCOUNTS',
        heading: (
          <>
            Band Lavajam Treasury &amp; <br />
            <span className="italic text-[#E5A93C]">Financial Management</span>
          </>
        ),
        subtitle: 'Comprehensive ledger for band member Lavajam dues collection, digital receipt verification, UPI and cash reconciliations, and Milad celebration expense accounting.',
        ctaButtons: (
          <>
            <Button
              variant="havenly"
              size="pill"
              onClick={() => setActiveTab('financials')}
              className="gap-2 text-xs px-5 shadow-warm-glow hover:scale-[1.02] transition-transform"
            >
              <Coins className="w-3.5 h-3.5 text-amber-200" />
              <span>Lavajam Ledger</span>
            </Button>
            <Button
              variant="havenly-outline"
              size="pill"
              onClick={() => setIsExcelModalOpen(true)}
              className="gap-2 text-xs px-5 hover:scale-[1.02] transition-transform"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
              <span>Excel Roster Sync</span>
            </Button>
            <Button
              variant="havenly-outline"
              size="pill"
              onClick={() => setActiveTab('transposer')}
              className="gap-2 text-xs px-5 hover:scale-[1.02] transition-transform"
            >
              <Music className="w-3.5 h-3.5 text-amber-300" />
              <span>Compose Madeh Notes</span>
            </Button>
          </>
        ),
        pills: [
          { icon: Coins, label: 'Lavajam Accounting', desc: 'Monthly dues collection & audit ledger' },
          { icon: Receipt, label: 'Digital Receipts', desc: 'Verified member payment receipts' },
          { icon: FileSpreadsheet, label: 'Excel Sync', desc: 'Export & import sheets' },
        ],
        focusTitle: 'Treasury & Lavajam Focus:',
        focusChips: ['+ 100% Verified Dues', '+ UPI Reconciled', '+ Monthly Accounting', '+ Digital Receipts', '+ Milad Fund'],
      };
    }

    if (isInstrumentMajor(effectiveRole)) {
      const sec = getManagedSection(effectiveRole) || currentUser?.section || 'Instrument';
      return {
        tag: `✦ ${sec} SECTION MAJOR • MADEH REPERTOIRE LEAD`,
        heading: (
          <>
            {effectiveRole} <br />
            <span className="italic text-[#E5A93C]">{sec} Madeh Workspace</span>
          </>
        ),
        subtitle: `Oversee ${sec} section musicians, compose and assign Madeh scores for Milad Mubarak processions, synchronize sheet notes from Google Drive, and record rehearsal hazri.`,
        ctaButtons: (
          <>
            <Button
              variant="havenly"
              size="pill"
              onClick={() => setActiveTab('section')}
              className="gap-2 text-xs px-5 shadow-warm-glow hover:scale-[1.02] transition-transform"
            >
              <Users className="w-3.5 h-3.5 text-amber-200" />
              <span>Section Madeh Workspace</span>
            </Button>
            <Button
              variant="havenly-outline"
              size="pill"
              onClick={() => setActiveTab('transposer')}
              className="gap-2 text-xs px-5 hover:scale-[1.02] transition-transform"
            >
              <Music className="w-3.5 h-3.5 text-amber-300" />
              <span>Compose Madeh Notes</span>
            </Button>
            <Button
              variant="havenly-outline"
              size="pill"
              onClick={() => setActiveTab('attendance')}
              className="gap-2 text-xs px-5 hover:scale-[1.02] transition-transform"
            >
              <CalendarCheck className="w-3.5 h-3.5 text-amber-300" />
              <span>Practice Attendance (Hazri)</span>
            </Button>
            <Button
              variant="havenly-outline"
              size="pill"
              onClick={() => setIsDriveModalOpen(true)}
              className="gap-2 text-xs px-5 hover:scale-[1.02] transition-transform"
            >
              <CloudLightning className="w-3.5 h-3.5 text-amber-300" />
              <span>Drive Scores Sync</span>
            </Button>
          </>
        ),
        pills: [
          { icon: Music, label: 'Compose Madeh Notes', desc: `${sec} transpositions & fingering charts` },
          { icon: CloudLightning, label: 'Store Madeh Scores', desc: 'Sync procession sheet notes' },
          { icon: ShieldCheck, label: 'Rehearsal Hazri', desc: 'Player attendance & parade drills' },
        ],
        focusTitle: `${sec} Madeh Repertoire Focus:`,
        focusChips: [`+ ${sec} Lead Voice`, '+ Madeh Tarannum', '+ Milad Cadence', '+ Rehearsal Hazri', '+ Note Transposition'],
      };
    }

    // Default: Overall Major
    return {
      tag: '✦ DAWOODI BOHRA RELIGIOUS BAND • MILAD MUBARAK CELEBRATIONS',
      heading: (
        <>
          Composing &amp; Archiving Madeh Notes for <br />
          <span className="italic text-[#E5A93C]">Mola's Milad Celebrations</span>
        </>
      ),
      subtitle: 'Official religious band portal to compose brass Madeh notes, store and archive procession scores, record member attendance (Hazri), and manage transparent Lavajam financials in khidmat of Aqa Mola (TUS).',
      ctaButtons: (
        <>
          <Button
            variant="havenly"
            size="pill"
            onClick={() => setActiveTab('transposer')}
            className="gap-2 text-xs px-5 shadow-warm-glow hover:scale-[1.02] transition-transform"
          >
            <Music className="w-3.5 h-3.5 text-amber-200" />
            <span>Compose Madeh Notes</span>
          </Button>
          <Button
            variant="havenly-outline"
            size="pill"
            onClick={() => setActiveTab('dashboard')}
            className="gap-2 text-xs px-5 hover:scale-[1.02] transition-transform"
          >
            <Crown className="w-3.5 h-3.5 text-amber-200" />
            <span>Command &amp; Attendance</span>
          </Button>
          <Button
            variant="havenly-outline"
            size="pill"
            onClick={() => setActiveTab('org-chart')}
            className="gap-2 text-xs px-5 hover:scale-[1.02] transition-transform"
          >
            <Network className="w-3.5 h-3.5 text-amber-300" />
            <span>Band Khidmat Roster</span>
          </Button>
        </>
      ),
      pills: [
        { icon: Music, label: 'Compose Madeh Notes', desc: 'Brass note fingerings, transpositions & scales' },
        { icon: BookOpen, label: 'Store Madeh Notes', desc: 'Digital archive of Milad scores & sheet music' },
        { icon: Coins, label: 'Attendance & Lavajam', desc: 'Rehearsal hazri & transparent member dues' },
      ],
      focusTitle: 'Milad Repertoire & Khidmat Cadence:',
      focusChips: [
        '+ Milad Mubarak Madeh',
        '+ Brass Note Transpositions',
        '+ Procession March Cadence',
        '+ Store Madeh Library',
        '+ Band Member Hazri',
        '+ Lavajam Management',
      ],
    };
  };

  const hero = getHeroContent();

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      {/* Top Notification Announcement Bar */}
      <div className="w-full bg-[#1A0C06] border-b border-amber-900/30 text-amber-200/90 text-[11px] py-1.5 px-4 text-center font-medium tracking-wide flex items-center justify-center gap-2">
        <span className="inline-block w-2 h-2 rounded-full bg-[#D97736] animate-ping" />
        <span>Taheri Scout Band • Milad Mubarak Madeh Repertoire, Hazri &amp; Lavajam Portal Synchronized</span>
        {canSyncDrive(effectiveRole) && (
          <button
            onClick={() => setIsDriveModalOpen(true)}
            className="hidden sm:inline-flex items-center gap-1 font-bold text-[#D97736] hover:underline ml-2"
          >
            <span>Sync Scores</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        )}
      </div>

      <Navbar activeTab={activeTab} onTabChange={setActiveTab} />

      {/* ========================================================
          WARM EDITORIAL HERO SECTION (Role-Tailored)
         ======================================================== */}
      <section className="relative overflow-hidden bg-havenly-hero text-white pt-10 pb-14 px-4 sm:px-6 md:px-10 border-b border-amber-900/40">
        <FloatingNoteParticles />

        <div className="max-w-7xl mx-auto relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* Left Column: Headline, Subtitle, CTA buttons & Feature Badges */}
          <div className="lg:col-span-7 space-y-5">
            {/* Pill Tag with glowing amber indicator */}
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-white/20 bg-white/10 backdrop-blur-md text-amber-200 text-xs font-semibold tracking-wider uppercase">
              <span className="w-2 h-2 rounded-full bg-[#D97736]" />
              {hero.tag}
            </div>

            {/* Editorial Serif Heading */}
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-serif font-black tracking-tight leading-[1.15] text-amber-50">
              {hero.heading}
            </h1>

            {/* Subtext */}
            <p className="text-xs sm:text-sm text-amber-100/80 max-w-xl leading-relaxed">
              {hero.subtitle}
            </p>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center gap-3 pt-1">
              {hero.ctaButtons}
            </div>

            {/* 3 Frosted Pill Badges */}
            <div className="pt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
              {hero.pills.map((pill, idx) => {
                const PillIcon = pill.icon;
                return (
                  <div key={idx} className="p-3 rounded-2xl glass-pill-warm border border-white/15 backdrop-blur-md">
                    <div className="flex items-center gap-2 text-xs font-bold text-amber-200">
                      <PillIcon className="w-3.5 h-3.5 text-[#D97736]" /> {pill.label}
                    </div>
                    <p className="text-[11px] text-amber-100/70 mt-1">{pill.desc}</p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Column: Floating Musical Madeh Cadence Visualizer Card */}
          <div className="lg:col-span-5 flex justify-center lg:justify-end">
            <div className="w-full max-w-sm rounded-3xl p-5 bg-white/[0.08] backdrop-blur-2xl border border-white/20 shadow-2xl shadow-black/40 relative overflow-hidden">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
                  <span className="text-[11px] font-bold tracking-wide uppercase text-amber-200">
                    Madeh Cadence &amp; Harmony
                  </span>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-semibold">
                  Milad Repertoire
                </span>
              </div>

              {/* Animated Musical Stave Visualizer with 5 Lines & Notes */}
              <MadehStaveVisualizer className="mb-3" />

              {/* Musical Chips */}
              <p className="text-[11px] font-semibold text-amber-100 mb-1.5">{hero.focusTitle}</p>
              <div className="flex flex-wrap gap-1 mb-3">
                {hero.focusChips.map(chip => (
                  <span
                    key={chip}
                    className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 hover:bg-white/20 border border-white/15 text-amber-100 transition-colors cursor-pointer"
                  >
                    {chip}
                  </span>
                ))}
              </div>

              <div className="pt-2 border-t border-white/10 text-[10px] italic text-amber-200/80 leading-snug">
                &ldquo;Devotedly playing sacred Madeh melodies in the barakat of Aqa Mola (TUS) for Milad Mubarak celebrations and religious processions.&rdquo;
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================
          MAIN WORKSPACE NAVIGATION BAR (Strictly Role Governed)
         ======================================================== */}
      <nav className="border-b bg-card/70 backdrop-blur-xl sticky top-28 z-30 px-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between overflow-x-auto no-scrollbar gap-2 py-2.5">
          <div className="flex items-center gap-1.5 shrink-0">
            {/* Overall Major: Executive Command */}
            {isOverallMajor(effectiveRole) && (
              <Button
                variant={activeTab === 'dashboard' ? 'havenly' : 'ghost'}
                size="sm"
                onClick={() => setActiveTab('dashboard')}
                className="text-xs gap-1.5 rounded-full"
              >
                <Crown className="w-3.5 h-3.5" /> Executive Command
              </Button>
            )}

            {/* Financial Portal (Treasurer & Overall Major) */}
            {canAccessFullFinancials(effectiveRole) && (
              <Button
                variant={activeTab === 'financials' ? 'emerald' : 'ghost'}
                size="sm"
                onClick={() => setActiveTab('financials')}
                className="text-xs gap-1.5 rounded-full"
              >
                <Coins className="w-3.5 h-3.5" /> Lavajam Management
              </Button>
            )}

            {/* Section Workspace (Instrument Majors & Overall Major) */}
            {(isInstrumentMajor(effectiveRole) || isOverallMajor(effectiveRole)) && (
              <Button
                variant={activeTab === 'section' ? 'havenly' : 'ghost'}
                size="sm"
                onClick={() => setActiveTab('section')}
                className="text-xs gap-1.5 rounded-full"
              >
                <Users className="w-3.5 h-3.5" /> Section Madeh Workspace
              </Button>
            )}

            {/* Attendance Module (All band members can view attendance; Overall Major views all, members view personal) */}
            <Button
              variant={activeTab === 'attendance' ? 'havenly' : 'ghost'}
              size="sm"
              onClick={() => setActiveTab('attendance')}
              className="text-xs gap-1.5 rounded-full"
            >
              <CalendarCheck className="w-3.5 h-3.5" /> Practice Attendance (Hazri)
            </Button>

            {/* Band Member / Player & Instrument Maintainer Portal */}
            {(effectiveRole === 'Band Member / Player' || effectiveRole === 'Instrument Maintainer') && (
              <Button
                variant={activeTab === 'member-portal' ? 'havenly' : 'ghost'}
                size="sm"
                onClick={() => setActiveTab('member-portal')}
                className="text-xs gap-1.5 rounded-full"
              >
                <BookOpen className="w-3.5 h-3.5" /> My Madeh Portal
              </Button>
            )}

            {/* Org Chart (Visible to ALL roles) */}
            <Button
              variant={activeTab === 'org-chart' ? 'havenly' : 'ghost'}
              size="sm"
              onClick={() => setActiveTab('org-chart')}
              className="text-xs gap-1.5 rounded-full"
            >
              <Network className="w-3.5 h-3.5" /> Band Khidmat Roster
            </Button>

            {/* Note Transposer Tool (Visible to ALL roles) */}
            <Button
              variant={activeTab === 'transposer' ? 'havenly' : 'ghost'}
              size="sm"
              onClick={() => setActiveTab('transposer')}
              className="text-xs gap-1.5 rounded-full"
            >
              <Music className="w-3.5 h-3.5" /> Compose Madeh Notes
            </Button>

            {/* Video Showcase (Visible to ALL roles) */}
            <Button
              variant={activeTab === 'videos' ? 'havenly' : 'ghost'}
              size="sm"
              onClick={() => setActiveTab('videos')}
              className="text-xs gap-1.5 rounded-full"
            >
              <Video className="w-3.5 h-3.5" /> Procession Videos
            </Button>
          </div>

          {/* Quick Integration Triggers: Drive & Excel (Filtered by role) */}
          <div className="flex items-center gap-1.5 shrink-0 pl-2 border-l border-border/60">
            {canSyncDrive(effectiveRole) && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsDriveModalOpen(true)}
                className="text-xs gap-1.5 h-8 px-3 rounded-full border-[#D97736]/40 hover:bg-[#D97736]/10"
                title="Sync Section Sheet Music from Google Drive"
              >
                <CloudLightning className="w-3.5 h-3.5 text-[#D97736]" />
                <span className="hidden md:inline">Drive Sync</span>
              </Button>
            )}

            {canAccessFullFinancials(effectiveRole) && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsExcelModalOpen(true)}
                className="text-xs gap-1.5 h-8 px-3 rounded-full border-emerald-500/40 hover:bg-emerald-500/10"
                title="Import/Export Excel Rosters and Financials"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                <span className="hidden md:inline">Excel Sync</span>
              </Button>
            )}
          </div>
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 md:p-8">
        {/* Semicircular Harmonic Dial (Rendered for Overall Major) */}
        {activeTab === 'dashboard' && isOverallMajor(effectiveRole) && (
          <>
            <HarmonicDial
              onSelectSection={(sec: InstrumentSection) => {
                setSelectedWorkspaceSection(sec);
                setActiveTab('section');
              }}
              onExploreScores={() => {
                setActiveTab('section');
              }}
            />
            <ExecutiveDashboard />
          </>
        )}

        {activeTab === 'financials' && canAccessFullFinancials(effectiveRole) && <FinancialPortal />}
        {activeTab === 'section' && (isInstrumentMajor(effectiveRole) || isOverallMajor(effectiveRole)) && (
          <SectionWorkspace initialSection={selectedWorkspaceSection} />
        )}
        {activeTab === 'attendance' && (
          <div className="space-y-6">
            <AttendanceMarker />
            {isOverallMajor(effectiveRole) && <AttendanceReports />}
          </div>
        )}
        {activeTab === 'member-portal' && (effectiveRole === 'Band Member / Player' || effectiveRole === 'Instrument Maintainer') && <MemberPortal />}
        {activeTab === 'org-chart' && <HierarchicalOrgChart />}
        {activeTab === 'transposer' && <NoteTransposer />}
        {activeTab === 'videos' && <VideoShowcase />}
      </main>

      {/* Modals strictly gated by role */}
      {canSyncDrive(effectiveRole) && (
        <DriveSyncModal open={isDriveModalOpen} onOpenChange={setIsDriveModalOpen} />
      )}
      {canAccessFullFinancials(effectiveRole) && (
        <ExcelImportExportModal open={isExcelModalOpen} onOpenChange={setIsExcelModalOpen} />
      )}

      {/* Footer */}
      <footer className="border-t py-8 px-4 bg-card/60 backdrop-blur-md text-center text-xs text-muted-foreground mt-auto">
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
  );
}
