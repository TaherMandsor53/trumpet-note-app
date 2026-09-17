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
