'use client';

import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '@/store';
import { useGetMeQuery, useLoginUserMutation } from '@/store/api/bandApi';
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
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { HarmonicDial } from '@/components/ui/HarmonicDial';
import {
  FrequencyEqualizer,
  FloatingNoteParticles,
  TrumpetGlyph,
  DrumGlyph,
} from '@/components/ui/musical-icons';
import {
  canAccessFullFinancials,
  isOverallMajor,
  isInstrumentMajor,
  isTreasurer,
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
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Activity,
  Radio,
} from 'lucide-react';

export default function HomePage() {
  const dispatch = useDispatch();
  const currentUser = useSelector((state: RootState) => state.auth.user);
  const activeRole = useSelector((state: RootState) => state.auth.activeRole);

  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [isDriveModalOpen, setIsDriveModalOpen] = useState(false);
  const [isExcelModalOpen, setIsExcelModalOpen] = useState(false);

  const { data: sessionData, isSuccess: isSessionLoaded } = useGetMeQuery();
  const [loginUser] = useLoginUserMutation();

  // Auto-login default profile (Overall Major) if no session exists
  useEffect(() => {
    if (!currentUser && isSessionLoaded) {
      if (sessionData?.authenticated && sessionData.user) {
        dispatch(setCredentials({ user: sessionData.user, token: '' }));
        dispatch(setActiveRole(sessionData.user.role));
      } else {
        loginUser({ role: 'Overall Major' })
          .unwrap()
          .then(res => {
            dispatch(setCredentials({ user: res.user, token: res.token }));
            dispatch(setActiveRole(res.user.role));
          })
          .catch(() => {});
      }
    }
  }, [currentUser, isSessionLoaded, sessionData, dispatch, loginUser]);

  // Adjust active tab when role switches to ensure immediate relevance
  useEffect(() => {
    if (activeRole === 'Treasurer') {
      setActiveTab('financials');
    } else if (activeRole === 'Overall Major') {
      setActiveTab('dashboard');
    } else if (isInstrumentMajor(activeRole)) {
      setActiveTab('section');
    } else {
      setActiveTab('member-portal');
    }
  }, [activeRole]);

  const effectiveRole = currentUser?.role || activeRole;

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      {/* Top Notification Announcement Bar (Inspired by Havenly top banner) */}
      <div className="w-full bg-[#1A0C06] border-b border-amber-900/30 text-amber-200/90 text-[11px] py-1.5 px-4 text-center font-medium tracking-wide flex items-center justify-center gap-2">
        <span className="inline-block w-2 h-2 rounded-full bg-[#D97736] animate-ping" />
        <span>Taheri Scout Band Group • 2026 Procession Repertoire & Automated Drive Sync Active</span>
        <button
          onClick={() => setIsDriveModalOpen(true)}
          className="hidden sm:inline-flex items-center gap-1 font-bold text-[#D97736] hover:underline ml-2"
        >
          <span>Sync Scores</span>
          <ArrowRight className="w-3 h-3" />
        </button>
      </div>

      <Navbar activeTab={activeTab} onTabChange={setActiveTab} />

      {/* ========================================================
          WARM EDITORIAL HERO SECTION (Faithful to Reference Image)
         ======================================================== */}
      <section className="relative overflow-hidden bg-havenly-hero text-white pt-12 pb-16 px-4 sm:px-6 md:px-10 border-b border-amber-900/40">
        <FloatingNoteParticles />

        <div className="max-w-7xl mx-auto relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* Left Column: Headline, Subtitle, CTA buttons & Feature Badges */}
          <div className="lg:col-span-7 space-y-6">
            {/* Pill Tag with glowing amber indicator */}
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-white/20 bg-white/10 backdrop-blur-md text-amber-200 text-xs font-semibold tracking-wider uppercase">
              <span className="w-2 h-2 rounded-full bg-[#D97736]" />
              Taheri Scout Brass & Percussion Ensemble
            </div>

            {/* Editorial Serif Heading */}
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-serif font-black tracking-tight leading-[1.1] text-amber-50">
              Harmonizing Precision, Cadence &amp; <br />
              <span className="italic text-[#E5A93C]">Scout Brotherhood</span>
            </h1>

            {/* Subtext */}
            <p className="text-sm sm:text-base text-amber-100/80 max-w-xl leading-relaxed">
              Official command portal for brass fingering transpositions, rehearsal drill attendance,
              Google Drive sheet music synchronization, and transparent Lavajam financials.
            </p>

            {/* Action Buttons (Pill-shaped with icon badges) */}
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <Button
                variant="havenly"
                size="pill"
                onClick={() => setActiveTab('transposer')}
                className="gap-2.5 text-sm px-6 shadow-warm-glow hover:scale-[1.02] transition-transform"
              >
                <Music className="w-4 h-4 text-amber-200" />
                <span>Note Transposer Tool</span>
              </Button>

              <Button
                variant="havenly-outline"
                size="pill"
                onClick={() => setActiveTab('org-chart')}
                className="gap-2 text-sm px-6 hover:scale-[1.02] transition-transform"
              >
                <Network className="w-4 h-4 text-amber-300" />
                <span>Workday Org Tree</span>
              </Button>
            </div>

            {/* 3 Frosted Pill Badges at bottom left (matching the 3 pills in the image) */}
            <div className="pt-6 grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-3 rounded-2xl glass-pill-warm border border-white/15 backdrop-blur-md">
                <div className="flex items-center gap-2 text-xs font-bold text-amber-200">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#D97736]" /> RBAC Governed
                </div>
                <p className="text-[11px] text-amber-100/70 mt-1">Section data segregation</p>
              </div>

              <div className="p-3 rounded-2xl glass-pill-warm border border-white/15 backdrop-blur-md">
                <div className="flex items-center gap-2 text-xs font-bold text-amber-200">
                  <CloudLightning className="w-3.5 h-3.5 text-[#D97736]" /> Drive Sync
                </div>
                <p className="text-[11px] text-amber-100/70 mt-1">15-day dynamic "NEW" badges</p>
              </div>

              <div className="p-3 rounded-2xl glass-pill-warm border border-white/15 backdrop-blur-md">
                <div className="flex items-center gap-2 text-xs font-bold text-amber-200">
                  <Coins className="w-3.5 h-3.5 text-[#D97736]" /> Lavajam Ledger
                </div>
                <p className="text-[11px] text-amber-100/70 mt-1">Transparent member dues</p>
              </div>
            </div>
          </div>

          {/* Right Column: Floating Musical Harmonic Visualizer Card (Styled like "How are you feeling today?" card) */}
          <div className="lg:col-span-5 flex justify-center lg:justify-end">
            <div className="w-full max-w-sm rounded-3xl p-6 bg-white/[0.08] backdrop-blur-2xl border border-white/20 shadow-2xl shadow-black/40 relative overflow-hidden">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Radio className="w-4 h-4 text-emerald-400 animate-pulse" />
                  <span className="text-xs font-bold tracking-wide uppercase text-amber-200">
                    Live Ensemble Frequency
                  </span>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Concert Bb
                </span>
              </div>

              {/* Animated Soundwave Frequency Waveform */}
              <div className="p-4 rounded-2xl bg-black/30 border border-white/10 mb-4 flex flex-col items-center justify-center">
                <FrequencyEqualizer barsCount={16} className="my-2" />
                <span className="text-[10px] font-mono text-amber-200/70 mt-2 uppercase tracking-widest">
                  Harmonic Pitch: 440 Hz • Stereo Soundstage
                </span>
              </div>

              {/* Musical Chips (matching the mood chips in the reference image) */}
              <p className="text-xs font-semibold text-amber-100 mb-2">Section Soundscape Focus:</p>
              <div className="flex flex-wrap gap-1.5 mb-4">
                {['+ Trumpet Lead', '+ Snare Cadence', '+ Euphonium Bass', '+ Saxophone Harmony', '+ Cymbals'].map(chip => (
                  <span
                    key={chip}
                    className="text-[11px] px-2.5 py-1 rounded-full bg-white/10 hover:bg-white/20 border border-white/15 text-amber-100 transition-colors cursor-pointer"
                  >
                    {chip}
                  </span>
                ))}
              </div>

              {/* Quote at bottom of card */}
              <div className="pt-3 border-t border-white/10 text-[11px] italic text-amber-200/80 leading-snug">
                "When every valve and cadence strike in unison, the scout spirit echoes through every procession."
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================
          MAIN WORKSPACE NAVIGATION BAR (Floating Pill Style)
         ======================================================== */}
      <nav className="border-b bg-card/70 backdrop-blur-xl sticky top-28 z-30 px-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between overflow-x-auto no-scrollbar gap-2 py-2.5">
          <div className="flex items-center gap-1.5 shrink-0">
            {/* Overall Major Executive Dashboard */}
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
                <Coins className="w-3.5 h-3.5" /> Lavajam Financials
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
                <Users className="w-3.5 h-3.5" /> Section Workspace
              </Button>
            )}

            {/* Band Member / Player Portal */}
            {effectiveRole === 'Band Member / Player' && (
              <Button
                variant={activeTab === 'member-portal' ? 'havenly' : 'ghost'}
                size="sm"
                onClick={() => setActiveTab('member-portal')}
                className="text-xs gap-1.5 rounded-full"
              >
                <UserCheck className="w-3.5 h-3.5" /> My Member Portal
              </Button>
            )}

            {/* Org Chart (Visible to ALL members) */}
            <Button
              variant={activeTab === 'org-chart' ? 'havenly' : 'ghost'}
              size="sm"
              onClick={() => setActiveTab('org-chart')}
              className="text-xs gap-1.5 rounded-full"
            >
              <Network className="w-3.5 h-3.5" /> Workday Org Tree
            </Button>

            {/* Note Transposer Tool */}
            <Button
              variant={activeTab === 'transposer' ? 'havenly' : 'ghost'}
              size="sm"
              onClick={() => setActiveTab('transposer')}
              className="text-xs gap-1.5 rounded-full"
            >
              <Music className="w-3.5 h-3.5" /> Note Transposer
            </Button>

            {/* Video Showcase */}
            <Button
              variant={activeTab === 'videos' ? 'havenly' : 'ghost'}
              size="sm"
              onClick={() => setActiveTab('videos')}
              className="text-xs gap-1.5 rounded-full"
            >
              <Video className="w-3.5 h-3.5" /> Videos
            </Button>
          </div>

          {/* Quick Integration Triggers: Drive & Excel */}
          <div className="flex items-center gap-1.5 shrink-0 pl-2 border-l border-border/60">
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
        {/* Semicircular Harmonic Dial (Rendered in Dashboard or when browsing overview) */}
        {activeTab === 'dashboard' && isOverallMajor(effectiveRole) && (
          <>
            <HarmonicDial
              onSelectSection={(sec: InstrumentSection) => {
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
          <SectionWorkspace />
        )}
        {activeTab === 'member-portal' && <MemberPortal />}
        {activeTab === 'org-chart' && <HierarchicalOrgChart />}
        {activeTab === 'transposer' && <NoteTransposer />}
        {activeTab === 'videos' && <VideoShowcase />}
      </main>

      {/* Modals */}
      <DriveSyncModal open={isDriveModalOpen} onOpenChange={setIsDriveModalOpen} />
      <ExcelImportExportModal open={isExcelModalOpen} onOpenChange={setIsExcelModalOpen} />

      {/* Footer */}
      <footer className="border-t py-8 px-4 bg-card/60 backdrop-blur-md text-center text-xs text-muted-foreground mt-auto">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-serif font-bold text-foreground text-sm">TAHERI SCOUT BAND</span>
            <span>© {new Date().getFullYear()} All rights reserved.</span>
          </div>
          <div className="flex items-center gap-4 text-[11px]">
            <span>Role-Based Access Control (RBAC) Active</span>
            <span>•</span>
            <span>Google Drive &amp; Excel Sync</span>
            <span>•</span>
            <span>Dynamic 15-Day NEW Logic</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
