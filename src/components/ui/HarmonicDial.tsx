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
import { Sparkles, ArrowRight, Music, Users, Crown, Phone, Mail, ChevronRight } from 'lucide-react';
import { useGetUsersQuery } from '@/store/api/bandApi';
import { Dialog, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';

interface HarmonicDialProps {
  onSelectSection?: (section: InstrumentSection) => void;
  onExploreScores?: () => void;
}

export function HarmonicDial({ onSelectSection, onExploreScores }: HarmonicDialProps) {
  const { data: usersData } = useGetUsersQuery({ all: 'true' });
  const allUsers = usersData?.users || [];

  const [selectedSectionForModal, setSelectedSectionForModal] = useState<InstrumentSection | null>(null);

  // Helper to exclude executive commanders who don't play as section instrument players
  const isExecutiveCommander = (u: User) =>
    u.role === 'Overall Major' ||
    u.rank?.toLowerCase().includes('overall major') ||
    u.rank?.toLowerCase().includes('executive command') ||
    u.rank?.toLowerCase().includes('command overall major');

  // Compute section players: exclude executive commanders, put Section Major FIRST, followed by players
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
      if (isExecutiveCommander(u)) return; // Exclude Overall Major & Executive Commands
      if (map[u.section]) {
        map[u.section].push(u);
      }
    });

    // Sort each section: Section Major FIRST, then others alphabetically
    Object.keys(map).forEach(secKey => {
      const sec = secKey as InstrumentSection;
      map[sec].sort((a, b) => {
        const aIsMajor = a.role.endsWith('Major') || a.role === `${sec} Major`;
        const bIsMajor = b.role.endsWith('Major') || b.role === `${sec} Major`;
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

      {/* 6 Curved Radial Section Cards (Image 1 Redesign with Trombone & Authentic Counts) */}
      <div className="relative z-10 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5 md:gap-4 mt-6">
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
          <div className="text-3xl sm:text-4xl font-serif font-black text-foreground">6</div>
          <p className="text-xs text-muted-foreground uppercase tracking-wider mt-1 font-medium">
            Instrument Sections
          </p>
        </div>
        <div>
          <div className="text-3xl sm:text-4xl font-serif font-black text-[#D97736]">37</div>
          <p className="text-xs text-muted-foreground uppercase tracking-wider mt-1 font-medium">
            Active Band Musicians
          </p>
        </div>
        <div>
          <div className="text-3xl sm:text-4xl font-serif font-black text-foreground">100%</div>
          <p className="text-xs text-muted-foreground uppercase tracking-wider mt-1 font-medium">
            RBAC Governed
          </p>
        </div>
        <div>
          <div className="text-3xl sm:text-4xl font-serif font-black text-[#D97736]">Live</div>
          <p className="text-xs text-muted-foreground uppercase tracking-wider mt-1 font-medium">
            Attendance Matrix Sync
          </p>
        </div>
      </div>

      {/* Interactive Modal: Displays that Particular Instrument Major FIRST followed by other members */}
      <Dialog
        open={!!selectedSectionForModal}
        onOpenChange={open => !open && setSelectedSectionForModal(null)}
      >
        <div className="space-y-4">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-[#D97736]/15 border border-[#D97736]/30 text-[#D97736]">
                <Music className="w-5 h-5" />
              </span>
              <div>
                <DialogTitle className="text-xl font-serif font-bold text-foreground">
                  {selectedSectionForModal === 'SideDrum' ? 'SideDrum/BaseDrum' : selectedSectionForModal} Section Musicians ({activeRoster.length})
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  Instrument Major listed first, followed by section players (Overall Command excluded).
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {/* Members List with Instrument Major FIRST */}
          <div className="max-h-[380px] overflow-y-auto space-y-2 pr-1 divide-y divide-border/40">
            {activeRoster.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-6">
                No players registered in {selectedSectionForModal} section.
              </p>
            ) : (
              activeRoster.map((player, idx) => {
                const isMajor = player.role.endsWith('Major') || player.role === `${selectedSectionForModal} Major`;

                return (
                  <div
                    key={player.id}
                    className={`pt-2.5 first:pt-0 pb-1.5 flex items-start justify-between gap-3 p-2.5 rounded-xl transition-colors ${
                      isMajor
                        ? 'bg-amber-500/10 border border-amber-500/30'
                        : 'hover:bg-muted/30'
                    }`}
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        {isMajor && (
                          <Crown className="w-4 h-4 text-amber-400 shrink-0" title="Section Major" />
                        )}
                        <span className={`text-xs font-bold ${isMajor ? 'text-amber-300 font-serif text-sm' : 'text-foreground'}`}>
                          {player.name}
                        </span>
                        {isMajor && (
                          <Badge className="bg-[#D97736] text-white text-[9px] py-0 px-1.5 font-bold uppercase tracking-wider">
                            Section Major
                          </Badge>
                        )}
                      </div>

                      <div className="text-[11px] text-muted-foreground font-mono">
                        ITS: {player.itsNumber || '—'} • {player.rank || player.role}
                      </div>

                      {player.phone && (
                        <div className="text-[10px] text-muted-foreground/80 flex items-center gap-1">
                          <Phone className="w-3 h-3 text-[#D97736]" /> {player.phone}
                        </div>
                      )}
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-[10px] font-mono text-muted-foreground">
                        #{idx + 1}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div className="pt-3 border-t border-border flex items-center justify-between gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedSectionForModal(null)}
              className="text-xs"
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
                className="text-xs gap-1.5 shadow-warm-glow"
              >
                <span>Go to {selectedSectionForModal === 'SideDrum' ? 'SideDrum/BaseDrum' : selectedSectionForModal} Workspace</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Button>
            )}
          </div>
        </div>
      </Dialog>
    </section>
  );
}
