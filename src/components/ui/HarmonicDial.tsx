'use client';

import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  TrumpetGlyph,
  SaxophoneGlyph,
  DrumGlyph,
  CymbalsGlyph,
  ClefGlyph,
  FrequencyEqualizer,
} from '@/components/ui/musical-icons';
import { InstrumentSection } from '@/types/band';
import { Sparkles, ArrowRight, Music, Users, Volume2 } from 'lucide-react';

interface HarmonicDialProps {
  onSelectSection?: (section: InstrumentSection) => void;
  onExploreScores?: () => void;
}

export function HarmonicDial({ onSelectSection, onExploreScores }: HarmonicDialProps) {
  const sections: {
    section: InstrumentSection;
    lead: string;
    major: string;
    playersCount: number;
    icon: React.ReactNode;
    color: string;
    accentBg: string;
    image: string;
  }[] = [
    {
      section: 'Trumpet',
      lead: 'Brass Lead & Fanfare',
      major: 'Taher Mandsorwala',
      playersCount: 4,
      icon: <TrumpetGlyph className="w-5 h-5 text-amber-400" />,
      color: 'border-amber-500/40 text-amber-400',
      accentBg: 'from-amber-950/40 to-amber-900/10',
      image: 'https://images.unsplash.com/photo-1511192336575-5a79af67a629?w=300&auto=format&fit=crop&q=80',
    },
    {
      section: 'Saxophone',
      lead: 'Harmonized Woodwinds',
      major: 'Mustafa Bhai',
      playersCount: 3,
      icon: <SaxophoneGlyph className="w-5 h-5 text-[#D97736]" />,
      color: 'border-[#D97736]/40 text-[#D97736]',
      accentBg: 'from-orange-950/40 to-orange-900/10',
      image: 'https://images.unsplash.com/photo-1525994886773-080587e161c2?w=300&auto=format&fit=crop&q=80',
    },
    {
      section: 'Euphonium',
      lead: 'Bass Clef Resonance',
      major: 'Abbas Bhai',
      playersCount: 3,
      icon: <Music className="w-5 h-5 text-amber-300" />,
      color: 'border-amber-300/40 text-amber-300',
      accentBg: 'from-yellow-950/40 to-yellow-900/10',
      image: 'https://images.unsplash.com/photo-1465847899084-d164df4dedc6?w=300&auto=format&fit=crop&q=80',
    },
    {
      section: 'Dish',
      lead: 'Cymbals & Procession Accents',
      major: 'Murtaza Bhai',
      playersCount: 2,
      icon: <CymbalsGlyph className="w-5 h-5 text-emerald-400" />,
      color: 'border-emerald-500/40 text-emerald-400',
      accentBg: 'from-emerald-950/40 to-emerald-900/10',
      image: 'https://images.unsplash.com/photo-1519892300165-cb5542fb47c7?w=300&auto=format&fit=crop&q=80',
    },
    {
      section: 'SideDrum',
      lead: 'Marching Snare & Cadence',
      major: 'Shabbir Bhai',
      playersCount: 3,
      icon: <DrumGlyph className="w-5 h-5 text-purple-400" />,
      color: 'border-purple-500/40 text-purple-400',
      accentBg: 'from-purple-950/40 to-purple-900/10',
      image: 'https://images.unsplash.com/photo-1543791187-df796fa11835?w=300&auto=format&fit=crop&q=80',
    },
  ];

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
          <Sparkles className="w-3.5 h-3.5" /> Harmonic Cadence Spectrum
        </div>
        <h2 className="text-3xl sm:text-4xl md:text-5xl font-serif font-black tracking-tight text-foreground leading-[1.15]">
          Five Voices. One Cadence. <br />
          <span className="italic text-[#D97736]">Absolute Precision.</span>
        </h2>
        <p className="text-sm sm:text-base text-muted-foreground mt-3 leading-relaxed">
          From the soaring fanfare of the Trumpets to the cadence of the SideDrums,
          explore the distinct sections that compose the Taheri Scout Band Group.
        </p>

        <div className="mt-5 flex items-center justify-center gap-3">
          <Button
            variant="havenly"
            size="pill"
            onClick={onExploreScores}
            className="gap-2 text-xs sm:text-sm px-6 shadow-warm-glow"
          >
            <span>Explore All Section Scores</span>
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* 5 Curved Radial Section Cards inspired by reference image */}
      <div className="relative z-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 md:gap-5 mt-6">
        {sections.map((sec, idx) => (
          <div
            key={sec.section}
            onClick={() => onSelectSection?.(sec.section)}
            className="group relative cursor-pointer overflow-hidden rounded-2xl border border-border/80 dark:border-amber-500/20 bg-card/90 dark:bg-[#2B160E]/80 backdrop-blur-md p-4 transition-all duration-300 hover:scale-[1.03] hover:shadow-xl hover:border-[#D97736]/60 flex flex-col justify-between"
          >
            {/* Top Badge & Icon */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="p-2 rounded-xl bg-background/80 dark:bg-[#1E0F08] border border-border/60 shadow-xs">
                  {sec.icon}
                </div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground font-semibold">
                  0{idx + 1}
                </span>
              </div>

              {/* Title & Role */}
              <h3 className="font-serif font-bold text-lg text-foreground group-hover:text-[#D97736] transition-colors">
                {sec.section}
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{sec.lead}</p>
            </div>

            {/* Bottom Details */}
            <div className="mt-5 pt-3 border-t border-border/60 flex items-center justify-between text-xs">
              <span className="text-[11px] font-medium text-foreground flex items-center gap-1">
                <Users className="w-3 h-3 text-[#D97736]" /> {sec.playersCount} Players
              </span>
              <span className="text-[10px] text-[#D97736] group-hover:translate-x-0.5 transition-transform font-bold">
                View →
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* 4 Bottom Stats Columns (matching image stats: 12+ Years, 25+ Programs...) */}
      <div className="relative z-10 grid grid-cols-2 md:grid-cols-4 gap-6 pt-10 mt-10 border-t border-border/80 dark:border-amber-900/30 text-center">
        <div>
          <div className="text-3xl sm:text-4xl font-serif font-black text-foreground">5</div>
          <p className="text-xs text-muted-foreground uppercase tracking-wider mt-1 font-medium">
            Instrument Sections
          </p>
        </div>
        <div>
          <div className="text-3xl sm:text-4xl font-serif font-black text-[#D97736]">50+</div>
          <p className="text-xs text-muted-foreground uppercase tracking-wider mt-1 font-medium">
            Scores & Transpositions
          </p>
        </div>
        <div>
          <div className="text-3xl sm:text-4xl font-serif font-black text-foreground">100%</div>
          <p className="text-xs text-muted-foreground uppercase tracking-wider mt-1 font-medium">
            RBAC Governed
          </p>
        </div>
        <div>
          <div className="text-3xl sm:text-4xl font-serif font-black text-[#D97736]">15-Day</div>
          <p className="text-xs text-muted-foreground uppercase tracking-wider mt-1 font-medium">
            Dynamic "NEW" Sync
          </p>
        </div>
      </div>
    </section>
  );
}
