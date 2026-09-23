'use client';

import React, { useState, useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  TrumpetGlyph,
  SaxophoneGlyph,
  DrumGlyph,
  CymbalsGlyph,
} from '@/components/ui/musical-icons';
import { InstrumentSection, User } from '@/types/band';
import { Sparkles, ArrowRight, Music, Users, Crown, Phone, Mail, ChevronRight, ShieldCheck } from 'lucide-react';
import { useGetUsersQuery } from '@/store/api/bandApi';
import { Dialog, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { isInstrumentMajor, isOverallMajor } from '@/lib/rbac';

interface HarmonicDialProps {
  onSelectSection?: (section: InstrumentSection) => void;
  onExploreScores?: () => void;
}

export function HarmonicDial({ onSelectSection, onExploreScores }: HarmonicDialProps) {
  const { data: usersData } = useGetUsersQuery({ all: 'true' });
  const allUsers = usersData?.users || [];

  const [selectedSectionForModal, setSelectedSectionForModal] = useState<InstrumentSection | null>(null);
  const [isMajorModalOpen, setIsMajorModalOpen] = useState(false);

  // Helper to identify Overall Band Majors (Executive Leadership) - strictly NOT section majors
  const isMajorUser = (u: User) => {
    // If it's an instrument section major (e.g. Trumpet Major, SideDrum Major), they are NOT the overall Major
    if (isInstrumentMajor(u.role)) return false;
    return (
      u.role === 'Major' ||
      u.role === 'Overall Major' ||
      isOverallMajor(u.role) ||
      u.rank?.toLowerCase() === 'major' ||
      u.rank?.toLowerCase().includes('overall major') ||
      u.rank?.toLowerCase().includes('executive command') ||
      u.rank?.toLowerCase().includes('command overall major')
    );
  };

  // Strictly ONLY the Band Majors (Executive Command) - no Section Majors
  const majorsList = useMemo(() => {
    return allUsers.filter(u => isMajorUser(u));
  }, [allUsers]);

  // Compute section players: strictly exclude Majors, put Section Major FIRST, followed by players
  const sectionRosters = useMemo(() => {
    const map: Record<InstrumentSection, User[]> = {
      Trumpet: [],
      Saxophone: [],
      Euphonium: [],
      Trombone: [],
      Dish: [],
      SideDrum: [],
    };

    allUsers.forEach(u => {
      if (isMajorUser(u)) return; // DO NOT show Major in ANY instrument section!
      if (map[u.section]) {
        map[u.section].push(u);
      }
    });

    // Sort each section: Section Major FIRST, then others alphabetically
    Object.keys(map).forEach(secKey => {
      const sec = secKey as InstrumentSection;
      map[sec].sort((a, b) => {
        const aIsMajor = isInstrumentMajor(a.role) || a.role === `${sec} Major`;
        const bIsMajor = isInstrumentMajor(b.role) || b.role === `${sec} Major`;
        if (aIsMajor && !bIsMajor) return -1;
        if (!aIsMajor && bIsMajor) return 1;
        return a.name.localeCompare(b.name);
      });
    });

    return map;
  }, [allUsers]);

  const sectionsConfig: {
    section: InstrumentSection;
    title?: string;
    lead: string;
    num: string;
    icon: React.ReactNode;
    color: string;
  }[] = [
    {
      section: 'Trumpet',
      title: 'Trumpet',
      lead: 'Brass Lead & Fanfare',
      num: '01',
      icon: <TrumpetGlyph className="w-5 h-5 text-amber-400" />,
      color: 'border-amber-500/40 text-amber-400',
    },
    {
      section: 'Saxophone',
      title: 'Saxophone',
      lead: 'Harmonized Woodwinds',
      num: '02',
      icon: <SaxophoneGlyph className="w-5 h-5 text-[#D97736]" />,
      color: 'border-[#D97736]/40 text-[#D97736]',
    },
    {
      section: 'Euphonium',
      title: 'Euphonium',
      lead: 'Bass Clef Resonance',
      num: '03',
      icon: <Music className="w-5 h-5 text-amber-300" />,
      color: 'border-amber-300/40 text-amber-300',
    },
    {
      section: 'Trombone',
      title: 'Trombone',
      lead: 'Tenor Slide & Harmonic Depth',
      num: '04',
      icon: <Music className="w-5 h-5 text-yellow-500" />,
      color: 'border-yellow-500/40 text-yellow-500',
    },
    {
      section: 'Dish',
      title: 'Dish',
      lead: 'Cymbals & Procession',
      num: '05',
      icon: <CymbalsGlyph className="w-5 h-5 text-emerald-400" />,
      color: 'border-emerald-500/40 text-emerald-400',
    },
    {
      section: 'SideDrum',
      title: 'SideDrum/BaseDrum',
      lead: 'Marching Snare, Base Drum & Cadence',
      num: '06',
      icon: <DrumGlyph className="w-5 h-5 text-purple-400" />,
      color: 'border-purple-500/40 text-purple-400',
    },
  ];

  const activeRoster = selectedSectionForModal ? sectionRosters[selectedSectionForModal] || [] : [];
  const activeMajor = activeRoster.find(u => u.role.endsWith('Major') || u.role === `${selectedSectionForModal} Major`);

  return (
    <section className="relative overflow-hidden rounded-4xl bg-gradient-to-b from-[#FAF6F0] to-[#F2EAE0] dark:from-[#211009] dark:to-[#170B05] border border-amber-900/20 dark:border-amber-500/15 shadow-2xl p-6 sm:p-10 md:p-14 my-10">
      {/* Background Semicircular Radial Dial Ticks */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20 dark:opacity-15">
        <svg className="w-[850px] h-[850px]" viewBox="0 0 100 100">
          <circle
            cx="50"
            cy="50"
            r="44"
            fill="none"
            stroke="currentColor"
            strokeWidth="0.5"
            strokeDasharray="0.8 1.8"
            className="text-[#D97736]"
          />
          <circle
            cx="50"
            cy="50"
            r="38"
            fill="none"
            stroke="currentColor"
            strokeWidth="0.3"
            strokeDasharray="0.5 3"
            className="text-amber-500"
          />
        </svg>
      </div>

      {/* Top Tag & Title Inside Arc */}
      <div className="relative z-10 text-center max-w-2xl mx-auto mb-10">
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full border border-[#D97736]/30 bg-[#D97736]/10 text-[#D97736] text-xs font-semibold uppercase tracking-widest mb-3 backdrop-blur">
          <Sparkles className="w-3.5 h-3.5" /> Six Section Madeh Harmonics
        </div>
        <h2 className="text-3xl sm:text-4xl md:text-5xl font-serif font-black tracking-tight text-foreground leading-[1.15]">
          Six Voices. Sacred Madeh. <br />
          <span className="italic text-[#D97736]">One Devoted Khidmat.</span>
        </h2>
        <p className="text-sm sm:text-base text-muted-foreground mt-3 leading-relaxed">
          From the soaring fanfare of the Trumpets to the deep cadence of the SideDrum/BaseDrum and Trombone,
          compose and master the sacred Madeh notes performed for Aqa Mola&apos;s Milad Mubarak celebrations.
        </p>

        <div className="mt-5 flex items-center justify-center gap-3">
          <Button
            variant="havenly"
            size="pill"
            onClick={onExploreScores}
            className="gap-2 text-xs sm:text-sm px-6 shadow-warm-glow cursor-pointer"
          >
            <span>Explore Stored Madeh Notes</span>
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Dedicated Executive Command Card for Major (Exclusively Major Role, NO Section Majors) */}
      <div
        id="major-card-trigger"
        onClick={() => setIsMajorModalOpen(true)}
        className="relative z-10 cursor-pointer overflow-hidden rounded-2xl border-2 border-amber-500/50 bg-gradient-to-r from-amber-500/20 via-card/95 to-amber-600/15 dark:from-amber-950/45 dark:via-[#211009] dark:to-[#170B05] backdrop-blur-md p-4 sm:p-5 shadow-xl hover:shadow-amber-500/20 hover:border-amber-400 transition-all duration-300 hover:scale-[1.01] mt-6 mb-6 group"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="p-3 sm:p-3.5 rounded-2xl bg-amber-500/25 border border-amber-500/40 text-amber-400 shadow-inner group-hover:scale-105 transition-transform">
              <Crown className="w-6 h-6 sm:w-7 sm:h-7 text-amber-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-serif font-black text-xl sm:text-2xl text-foreground group-hover:text-amber-400 transition-colors">
                  Major
                </h3>
                <Badge className="bg-amber-500 text-black font-extrabold text-[10px] py-0.5 px-2 tracking-wider">
                  OVERALL COMMAND
                </Badge>
              </div>
              <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                Executive Leadership & Supreme Band Direction • Exclusively Major Role
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between sm:justify-end gap-4 pt-3 sm:pt-0 border-t sm:border-t-0 border-border/40">
            <div className="text-left sm:text-right">
              <span className="text-xs sm:text-sm font-bold text-foreground flex items-center gap-1.5 sm:justify-end">
                <Users className="w-4 h-4 text-amber-400" />
                <span className="text-amber-400 font-extrabold">{majorsList.length}</span> Majors
              </span>
              <span className="text-[11px] text-muted-foreground">Overall Band Commanders</span>
            </div>
            <Button
              variant="gold"
              size="sm"
              className="text-xs gap-1.5 shadow-warm-glow font-bold cursor-pointer"
              onClick={(e) => {
                e.stopPropagation();
                setIsMajorModalOpen(true);
              }}
            >
              <span>View All Majors</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </Button>
          </div>
        </div>
      </div>

      {/* 6 Curved Radial Section Cards (Image 1 Redesign with Trombone & Authentic Counts) */}
      <div className="relative z-10 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5 md:gap-4">
        {sectionsConfig.map(sec => {
          const players = sectionRosters[sec.section] || [];
          const count = players.length;

          return (
            <div
              key={sec.section}
              onClick={() => setSelectedSectionForModal(sec.section)}
              className="group relative cursor-pointer overflow-hidden rounded-2xl border border-border/80 dark:border-amber-500/20 bg-card/90 dark:bg-[#2B160E]/80 backdrop-blur-md p-4 transition-all duration-300 hover:scale-[1.03] hover:shadow-xl hover:border-[#D97736]/60 flex flex-col justify-between"
            >
              {/* Top Badge & Icon */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="p-2 rounded-xl bg-background/80 dark:bg-[#1E0F08] border border-border/60 shadow-xs">
                    {sec.icon}
                  </div>
                  <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground font-semibold">
                    {sec.num}
                  </span>
                </div>

                {/* Title & Role */}
                <h3 className="font-serif font-bold text-base text-foreground group-hover:text-[#D97736] transition-colors">
                  {sec.title || (sec.section === 'SideDrum' ? 'SideDrum/BaseDrum' : sec.section)}
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{sec.lead}</p>
              </div>

              {/* Bottom Details: Authentic Member Count (Excluding Overall Major) */}
              <div className="mt-5 pt-3 border-t border-border/60 flex items-center justify-between text-xs">
                <span className="text-[11px] font-medium text-foreground flex items-center gap-1">
                  <Users className="w-3 h-3 text-[#D97736]" /> {count} {count === 1 ? 'Player' : 'Players'}
                </span>
                <span className="text-[10px] text-[#D97736] group-hover:translate-x-0.5 transition-transform font-bold">
                  View →
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* 4 Bottom Stats Columns */}
      <div className="relative z-10 grid grid-cols-2 md:grid-cols-4 gap-6 pt-10 mt-10 border-t border-border/80 dark:border-amber-900/30 text-center">
        <div>
          <div className="text-3xl sm:text-4xl font-serif font-black text-amber-400">
            {majorsList.length}
          </div>
          <p className="text-xs text-muted-foreground uppercase tracking-wider mt-1 font-medium">
            Band Majors (Command)
          </p>
        </div>
        <div>
          <div className="text-3xl sm:text-4xl font-serif font-black text-foreground">6</div>
          <p className="text-xs text-muted-foreground uppercase tracking-wider mt-1 font-medium">
            Instrument Sections
          </p>
        </div>
        <div>
          <div className="text-3xl sm:text-4xl font-serif font-black text-[#D97736]">
            {allUsers.length - majorsList.length}
          </div>
          <p className="text-xs text-muted-foreground uppercase tracking-wider mt-1 font-medium">
            Section Musicians
          </p>
        </div>
        <div>
          <div className="text-3xl sm:text-4xl font-serif font-black text-[#D97736]">
            {allUsers.length}
          </div>
          <p className="text-xs text-muted-foreground uppercase tracking-wider mt-1 font-medium">
            Total Band Strength
          </p>
        </div>
      </div>

      {/* Interactive Modal: Displays that Particular Instrument Major FIRST followed by section members */}
      <Dialog
        open={!!selectedSectionForModal}
        onOpenChange={open => !open && setSelectedSectionForModal(null)}
      >
        <div className="flex flex-col max-h-[82vh] sm:max-h-[85vh] min-w-0 max-w-full overflow-hidden">
          <DialogHeader>
            <div className="flex items-start gap-2.5 sm:gap-3 min-w-0">
              <span className="p-2 sm:p-2.5 rounded-xl bg-[#D97736]/15 border border-[#D97736]/30 text-[#D97736] shrink-0 mt-0.5">
                <Music className="w-4 h-4 sm:w-5 sm:h-5" />
              </span>
              <div className="min-w-0 flex-1">
                <DialogTitle className="text-base sm:text-xl font-serif font-black text-foreground break-words leading-snug">
                  {selectedSectionForModal === 'SideDrum' ? 'SideDrum/BaseDrum' : selectedSectionForModal} Section Musicians ({activeRoster.length})
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground mt-0.5 leading-normal break-words">
                  Instrument Major listed first, followed by section players (Overall Command excluded).
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {/* Members List with Instrument Major FIRST */}
          <div className="flex-1 overflow-y-auto max-h-[50vh] sm:max-h-[58vh] pr-1 sm:pr-1.5 space-y-2 py-1 min-w-0 max-w-full">
            {activeRoster.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-6">
                No players registered in {selectedSectionForModal} section.
              </p>
            ) : (
              activeRoster.map((player, idx) => {
                const isSectionMajor = isInstrumentMajor(player.role) || player.role === `${selectedSectionForModal} Major`;

                return isSectionMajor ? (
                  <div
                    key={player.id}
                    className="p-3 sm:p-4 rounded-xl bg-amber-500/15 border-2 border-amber-500/40 shadow-sm transition-all hover:bg-amber-500/20 mb-2.5 sm:mb-3 space-y-2 min-w-0 max-w-full overflow-hidden"
                  >
                    {/* Top row: Crown, Major Name, Badge & Index */}
                    <div className="flex flex-col xs:flex-row xs:items-center justify-between gap-1.5 sm:gap-2 min-w-0">
                      <div className="flex items-center gap-1.5 min-w-0 flex-1">
                        <Crown className="w-4 h-4 text-amber-400 shrink-0" />
                        <span className="text-sm sm:text-base font-serif font-black text-amber-300 tracking-wide break-words min-w-0">
                          {player.name}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0 self-start xs:self-auto">
                        <Badge className="bg-[#D97736] text-white text-[9px] sm:text-[10px] py-0.5 px-2 font-black uppercase tracking-wider shadow-xs whitespace-nowrap">
                          Section Major
                        </Badge>
                        <span className="text-[10px] sm:text-[11px] font-mono font-bold text-amber-400/90 bg-amber-500/20 px-1.5 py-0.5 rounded">
                          #{idx + 1}
                        </span>
                      </div>
                    </div>

                    {/* Details row: ITS, Role, Jamaat, Phone */}
                    <div className="pt-2 border-t border-amber-500/20 grid grid-cols-1 sm:grid-cols-2 gap-x-2 gap-y-1 text-xs font-mono text-muted-foreground min-w-0">
                      <div className="flex items-center gap-1 min-w-0">
                        <span className="text-muted-foreground/70 shrink-0">ITS:</span>
                        <span className="text-foreground font-semibold truncate">{player.itsNumber || '—'}</span>
                      </div>
                      <div className="flex items-center gap-1 min-w-0">
                        <span className="text-muted-foreground/70 shrink-0">Role:</span>
                        <span className="text-amber-200/90 font-sans truncate">{player.rank || player.role}</span>
                      </div>
                      {player.jamaat && (
                        <div className="flex items-center gap-1 min-w-0">
                          <span className="text-muted-foreground/70 shrink-0">Jamaat:</span>
                          <span className="text-foreground font-sans truncate">{player.jamaat}</span>
                        </div>
                      )}
                      {player.phone && (
                        <div className="flex items-center gap-1 min-w-0 text-amber-300">
                          <Phone className="w-3.5 h-3.5 text-[#D97736] shrink-0" />
                          <a href={`tel:${player.phone}`} className="hover:underline font-mono truncate">
                            {player.phone}
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div
                    key={player.id}
                    className="p-2.5 sm:p-3.5 rounded-xl border border-border/60 bg-card/60 hover:bg-muted/40 transition-colors mb-2 min-w-0 max-w-full overflow-hidden"
                  >
                    <div className="flex items-start justify-between gap-2 min-w-0">
                      <div className="space-y-1 flex-1 min-w-0">
                        <div className="text-xs sm:text-sm font-bold text-foreground break-words min-w-0">
                          {player.name}
                        </div>
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-muted-foreground font-mono min-w-0">
                          <span className="shrink-0">ITS: {player.itsNumber || '—'}</span>
                          <span>•</span>
                          <span className="font-sans truncate">{player.rank || player.role}</span>
                          {player.jamaat && (
                            <>
                              <span>•</span>
                              <span className="font-sans text-[10px] text-muted-foreground/80 truncate">{player.jamaat}</span>
                            </>
                          )}
                        </div>
                        {player.phone && (
                          <div className="text-[11px] text-muted-foreground/90 flex items-center gap-1.5 pt-0.5 min-w-0">
                            <Phone className="w-3 h-3 text-[#D97736] shrink-0" />
                            <a href={`tel:${player.phone}`} className="hover:underline font-mono truncate">
                              {player.phone}
                            </a>
                          </div>
                        )}
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-[10px] font-mono text-muted-foreground/70 bg-muted/50 px-1.5 py-0.5 rounded">
                          #{idx + 1}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div className="pt-3 border-t border-border flex flex-col sm:flex-row sm:items-center justify-between gap-2 shrink-0 w-full min-w-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedSectionForModal(null)}
              className="text-xs order-2 sm:order-1 w-full sm:w-auto"
            >
              Close
            </Button>

            {selectedSectionForModal && onSelectSection && (
              <Button
                variant="havenly"
                size="sm"
                onClick={() => {
                  const sec = selectedSectionForModal;
                  setSelectedSectionForModal(null);
                  onSelectSection(sec);
                }}
                className="text-xs gap-1.5 shadow-warm-glow order-1 sm:order-2 w-full sm:w-auto justify-center"
              >
                <span className="truncate">Go to {selectedSectionForModal === 'SideDrum' ? 'SideDrum/BaseDrum' : selectedSectionForModal} Workspace</span>
                <ChevronRight className="w-3.5 h-3.5 shrink-0" />
              </Button>
            )}
          </div>
        </div>
      </Dialog>

      {/* Dedicated Interactive Modal for Major (Showing ONLY Major, NOT Section Majors) */}
      <Dialog
        open={isMajorModalOpen}
        onOpenChange={open => setIsMajorModalOpen(open)}
      >
        <div className="flex flex-col max-h-[82vh] sm:max-h-[85vh] min-w-0 max-w-full overflow-hidden">
          <DialogHeader>
            <div className="flex items-start gap-2.5 sm:gap-3 min-w-0">
              <span className="p-2 sm:p-2.5 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-400 shadow-inner shrink-0 mt-0.5">
                <Crown className="w-4 h-4 sm:w-6 sm:h-6 text-amber-400" />
              </span>
              <div className="min-w-0 flex-1">
                <DialogTitle className="text-base sm:text-xl font-serif font-black text-foreground flex flex-wrap items-center gap-1.5 sm:gap-2 leading-snug">
                  <span>Band Majors ({majorsList.length})</span>
                  <Badge className="bg-amber-500 text-black font-extrabold text-[9px] sm:text-[10px] py-0 px-1.5">
                    OVERALL COMMAND
                  </Badge>
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground mt-0.5 leading-normal break-words">
                  Executive Band Leadership & Supreme Commanders (Section Majors excluded).
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {/* Members List: Strictly Only Major */}
          <div className="flex-1 overflow-y-auto max-h-[50vh] sm:max-h-[58vh] pr-1 sm:pr-1.5 space-y-2 py-1 min-w-0 max-w-full">
            {majorsList.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-6">
                No Majors registered in executive command.
              </p>
            ) : (
              majorsList.map((major, idx) => (
                <div
                  key={major.id}
                  className="p-3 sm:p-4 rounded-xl bg-amber-500/15 border-2 border-amber-500/40 shadow-sm transition-all hover:bg-amber-500/20 mb-2.5 sm:mb-3 space-y-2 min-w-0 max-w-full overflow-hidden"
                >
                  <div className="flex flex-col xs:flex-row xs:items-center justify-between gap-1.5 sm:gap-2 min-w-0">
                    <div className="flex items-center gap-1.5 min-w-0 flex-1">
                      <Crown className="w-4 h-4 text-amber-400 shrink-0" />
                      <span className="text-sm sm:text-base font-serif font-black text-amber-300 tracking-wide break-words min-w-0">
                        {major.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0 self-start xs:self-auto">
                      <Badge className="bg-amber-500 text-black text-[9px] sm:text-[10px] py-0.5 px-2 font-black uppercase tracking-wider whitespace-nowrap">
                        Major
                      </Badge>
                      <span className="text-[10px] sm:text-[11px] font-mono font-bold text-amber-400 bg-amber-500/20 px-1.5 py-0.5 rounded">
                        #{idx + 1}
                      </span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-amber-500/20 grid grid-cols-1 sm:grid-cols-2 gap-x-2 gap-y-1 text-xs font-mono text-muted-foreground min-w-0">
                    <div className="flex items-center gap-1 min-w-0">
                      <span className="text-muted-foreground/70 shrink-0">ITS:</span>
                      <span className="text-foreground font-semibold truncate">{major.itsNumber || '—'}</span>
                    </div>
                    <div className="flex items-center gap-1 min-w-0">
                      <span className="text-muted-foreground/70 shrink-0">Role:</span>
                      <span className="text-amber-200/90 font-sans truncate">{major.rank || major.role}</span>
                    </div>
                    {major.jamaat && (
                      <div className="flex items-center gap-1 min-w-0">
                        <span className="text-muted-foreground/70 shrink-0">Jamaat:</span>
                        <span className="text-foreground font-sans truncate">{major.jamaat}</span>
                      </div>
                    )}
                    {major.phone && (
                      <div className="flex items-center gap-1 min-w-0 text-amber-300">
                        <Phone className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        <a href={`tel:${major.phone}`} className="hover:underline font-mono truncate">
                          {major.phone}
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="pt-3 border-t border-border flex items-center justify-between gap-2 shrink-0 w-full min-w-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsMajorModalOpen(false)}
              className="text-xs w-full sm:w-auto"
            >
              Close
            </Button>
          </div>
        </div>
      </Dialog>
    </section>
  );
}
