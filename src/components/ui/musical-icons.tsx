import React from 'react';

export function TrumpetGlyph({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M3 13h4l8-4v8l-8-4H3z" />
      <path d="M15 9l5-3v10l-5-3" />
      <path d="M9 7v2" />
      <path d="M11 7v2" />
      <path d="M13 7v2" />
      <circle cx="21" cy="11" r="1.5" />
    </svg>
  );
}

export function SaxophoneGlyph({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M6 3v8a4 4 0 0 0 4 4h4a3 3 0 0 0 3-3V7a3 3 0 0 0-3-3h-2" />
      <circle cx="17" cy="14" r="3" />
      <path d="M6 7h4" />
      <path d="M6 10h4" />
    </svg>
  );
}

export function DrumGlyph({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <ellipse cx="12" cy="7" rx="9" ry="4" />
      <path d="M3 7v9c0 2.2 4 4 9 4s9-1.8 9-4V7" />
      <path d="M7 10l5 5 5-5" />
    </svg>
  );
}

export function CymbalsGlyph({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <ellipse cx="12" cy="9" rx="9" ry="3" />
      <ellipse cx="12" cy="15" rx="9" ry="3" />
      <line x1="12" y1="6" x2="12" y2="12" />
      <line x1="12" y1="12" x2="12" y2="18" />
    </svg>
  );
}

export function ClefGlyph({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M12 2C10.5 2 9.5 3 9.5 4.5c0 1.2.7 2.1 1.7 2.4L9 14.5c-.8-.5-1.8-.8-2.8-.8C4 13.7 2 15.5 2 18s2 4.2 4.2 4.2c2.2 0 4-1.8 4-4.2 0-.3 0-.6-.1-.9l2.1-10.8c.6.4 1.3.7 2.1.7 1.9 0 3.5-1.6 3.5-3.5S16.2 2 14.3 2H12zm-5.8 17.7c-1 0-1.8-.8-1.8-1.8s.8-1.8 1.8-1.8c.8 0 1.5.5 1.7 1.2-.4 1.4-1.1 2.4-1.7 2.4z" />
    </svg>
  );
}

export function SoundwaveAnimation() {
  return (
    <div className="flex items-center gap-0.5 h-6 px-1">
      <span className="w-1 bg-[#D97736] rounded-full soundwave-bar-1" />
      <span className="w-1 bg-[#E5A93C] rounded-full soundwave-bar-2" />
      <span className="w-1 bg-[#D97736] rounded-full soundwave-bar-3" />
      <span className="w-1 bg-[#E5A93C] rounded-full soundwave-bar-4" />
      <span className="w-1 bg-[#D97736] rounded-full soundwave-bar-5" />
    </div>
  );
}

export function FrequencyEqualizer({ barsCount = 12, className = '' }: { barsCount?: number; className?: string }) {
  const bars = Array.from({ length: barsCount });
  return (
    <div className={`flex items-end gap-1 h-8 ${className}`}>
      {bars.map((_, i) => {
        const heightClass =
          i % 5 === 0
            ? 'eq-bar-1'
            : i % 5 === 1
            ? 'eq-bar-2'
            : i % 5 === 2
            ? 'eq-bar-3'
            : i % 5 === 3
            ? 'eq-bar-4'
            : 'eq-bar-5';
        const colorClass =
          i % 2 === 0
            ? 'bg-gradient-to-t from-[#C26330] to-[#E5A93C]'
            : 'bg-gradient-to-t from-[#D97736] to-[#F3C46B]';

        return (
          <span
            key={i}
            className={`w-1 rounded-full ${colorClass} ${heightClass}`}
            style={{ animationDelay: `${(i * 0.15).toFixed(2)}s` }}
          />
        );
      })}
    </div>
  );
}

export function FloatingNoteParticles() {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-25">
      <span className="absolute left-[15%] bottom-[10%] text-amber-300 text-lg animate-float-1">♩</span>
      <span className="absolute left-[40%] bottom-[20%] text-[#D97736] text-xl animate-float-2">♪</span>
      <span className="absolute left-[70%] bottom-[15%] text-amber-200 text-base animate-float-3">♫</span>
      <span className="absolute left-[85%] bottom-[25%] text-[#E5A93C] text-lg animate-float-1">♬</span>
    </div>
  );
}

export function MadehStaveVisualizer({ className = '' }: { className?: string }) {
  return (
    <div className={`relative w-full rounded-2xl p-3 bg-black/40 border border-amber-500/25 shadow-inner overflow-hidden ${className}`}>
      {/* 5-Line Musical Staff with Golden Shimmer */}
      <div className="relative py-2.5 px-2 bg-gradient-to-r from-amber-950/20 via-transparent to-amber-950/20 rounded-xl">
        {/* Five Staff Lines */}
        <div className="space-y-2 relative my-1">
          <div className="h-[1px] w-full bg-gradient-to-r from-amber-500/40 via-amber-400/60 to-amber-500/40" />
          <div className="h-[1px] w-full bg-gradient-to-r from-amber-500/40 via-amber-400/60 to-amber-500/40" />
          <div className="h-[1px] w-full bg-gradient-to-r from-amber-500/40 via-amber-400/60 to-amber-500/40" />
          <div className="h-[1px] w-full bg-gradient-to-r from-amber-500/40 via-amber-400/60 to-amber-500/40" />
          <div className="h-[1px] w-full bg-gradient-to-r from-amber-500/40 via-amber-400/60 to-amber-500/40" />
        </div>

        {/* Treble Clef Graphic on Left */}
        <div className="absolute left-2 top-1/2 -translate-y-1/2 text-amber-300 select-none text-3xl font-serif leading-none pointer-events-none drop-shadow-[0_0_8px_rgba(229,169,60,0.6)]">
          𝄞
        </div>

        {/* Animated Madeh Notes Dancing Along the Stave */}
        <div className="absolute inset-0 pl-11 pr-3 flex items-center justify-around pointer-events-none">
          <span className="text-amber-200 text-lg animate-bounce [animation-duration:1.4s] drop-shadow-[0_0_6px_rgba(245,158,11,0.7)]">♩</span>
          <span className="text-[#E5A93C] text-xl animate-bounce [animation-duration:1.1s] [animation-delay:0.2s] drop-shadow-[0_0_6px_rgba(229,169,60,0.7)]">♪</span>
          <span className="text-amber-100 text-2xl animate-bounce [animation-duration:1.6s] [animation-delay:0.5s] drop-shadow-[0_0_8px_rgba(255,255,255,0.8)]">♫</span>
          <span className="text-[#D97736] text-xl animate-bounce [animation-duration:1.2s] [animation-delay:0.3s] drop-shadow-[0_0_6px_rgba(217,119,54,0.7)]">♬</span>
          <span className="text-amber-300 text-lg animate-bounce [animation-duration:1.5s] [animation-delay:0.7s] drop-shadow-[0_0_6px_rgba(245,158,11,0.7)]">♩</span>
        </div>
      </div>

      {/* Cadence Equalizer Bars Underneath */}
      <div className="mt-2.5 pt-2 border-t border-amber-900/40 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          <span className="text-[10px] font-mono uppercase tracking-wider text-amber-200/90 font-semibold">
            Madeh Cadence • ♩ = 108 BPM
          </span>
        </div>
        <FrequencyEqualizer barsCount={14} className="h-5" />
      </div>
    </div>
  );
}
