'use client';

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  Volume2,
  VolumeX,
  Play,
  Square,
  ChevronUp,
  ChevronDown,
  LayoutGrid,
  Disc,
  BookOpen,
  Activity,
  Award,
  Sparkles,
  Info,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Plus,
  HelpCircle,
  Sliders,
  X,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useToast } from '@/components/ui/toast';

// ============================================================================
// DATA MODEL: COMPLETE BB TRUMPET FINGERING CHART
// ============================================================================
export interface TrumpetNote {
  id: string; // e.g. "C4", "Db4", "D4"
  naturalName: string; // "C", "D", "E", etc.
  accidental: '' | '#' | 'b';
  sharpSpelling: string; // "C#4"
  flatSpelling: string; // "Db4"
  octave: number; // 3, 4, 5, 6
  writtenPitch: string; // "C4"
  concertPitch: string; // "Bb3"
  writtenFreq: number; // in Hz
  concertFreq: number; // in Hz
  valves: number[]; // e.g. [1, 2] or [] for open
  alternates: number[][]; // alternate fingerings e.g. [[3]]
  staffPosition: number; // 0 = middle line (B4), positive = higher, negative = lower
  octaveGroup: 'C3 - C4' | 'C4 - C5' | 'C5 - C6' | 'C6 - C7';
  dohadCode: string; // Dohad Band scale valve label, e.g. "0", "1/3", "1/2"
  harmonicRank: string; // "2nd Partial", "3rd Partial", etc.
}

export const TRUMPET_NOTES: TrumpetNote[] = [
  // -------------------------------------------------------------
  // OCTAVE C3 - C4 (Low register / below middle C)
  // -------------------------------------------------------------
  {
    id: 'Fs3',
    naturalName: 'F',
    accidental: '#',
    sharpSpelling: 'F#3',
    flatSpelling: 'Gb3',
    octave: 3,
    writtenPitch: 'F#3',
    concertPitch: 'E3',
    writtenFreq: 185.0,
    concertFreq: 164.81,
    valves: [1, 2, 3],
    alternates: [],
    staffPosition: -9,
    octaveGroup: 'C3 - C4',
    dohadCode: '1/2/3',
    harmonicRank: '2nd Partial (Fundamental low)',
  },
  {
    id: 'G3',
    naturalName: 'G',
    accidental: '',
    sharpSpelling: 'G3',
    flatSpelling: 'G3',
    octave: 3,
    writtenPitch: 'G3',
    concertPitch: 'F3',
    writtenFreq: 196.0,
    concertFreq: 174.61,
    valves: [1, 3],
    alternates: [],
    staffPosition: -8,
    octaveGroup: 'C3 - C4',
    dohadCode: '1/3',
    harmonicRank: '2nd Partial',
  },
  {
    id: 'Gs3',
    naturalName: 'G',
    accidental: '#',
    sharpSpelling: 'G#3',
    flatSpelling: 'Ab3',
    octave: 3,
    writtenPitch: 'G#3',
    concertPitch: 'F#3',
    writtenFreq: 207.65,
    concertFreq: 185.0,
    valves: [2, 3],
    alternates: [],
    staffPosition: -7,
    octaveGroup: 'C3 - C4',
    dohadCode: '2/3',
    harmonicRank: '2nd Partial',
  },
  {
    id: 'A3',
    naturalName: 'A',
    accidental: '',
    sharpSpelling: 'A3',
    flatSpelling: 'A3',
    octave: 3,
    writtenPitch: 'A3',
    concertPitch: 'G3',
    writtenFreq: 220.0,
    concertFreq: 196.0,
    valves: [1, 2],
    alternates: [[3]],
    staffPosition: -6,
    octaveGroup: 'C3 - C4',
    dohadCode: '1/2',
    harmonicRank: '2nd Partial',
  },
  {
    id: 'As3',
    naturalName: 'A',
    accidental: '#',
    sharpSpelling: 'A#3',
    flatSpelling: 'Bb3',
    octave: 3,
    writtenPitch: 'A#3',
    concertPitch: 'G#3',
    writtenFreq: 233.08,
    concertFreq: 207.65,
    valves: [1],
    alternates: [],
    staffPosition: -5,
    octaveGroup: 'C3 - C4',
    dohadCode: '1',
    harmonicRank: '2nd Partial',
  },
  {
    id: 'B3',
    naturalName: 'B',
    accidental: '',
    sharpSpelling: 'B3',
    flatSpelling: 'B3',
    octave: 3,
    writtenPitch: 'B3',
    concertPitch: 'A3',
    writtenFreq: 246.94,
    concertFreq: 220.0,
    valves: [2],
    alternates: [],
    staffPosition: -4,
    octaveGroup: 'C3 - C4',
    dohadCode: '2',
    harmonicRank: '2nd Partial',
  },

  // -------------------------------------------------------------
  // OCTAVE C4 - C5 (Middle register / standard Madeh melodic range)
  // -------------------------------------------------------------
  {
    id: 'C4',
    naturalName: 'C',
    accidental: '',
    sharpSpelling: 'C4',
    flatSpelling: 'C4',
    octave: 4,
    writtenPitch: 'C4',
    concertPitch: 'Bb3',
    writtenFreq: 261.63,
    concertFreq: 233.08,
    valves: [],
    alternates: [],
    staffPosition: -3, // Middle C (ledger line below staff)
    octaveGroup: 'C4 - C5',
    dohadCode: '0',
    harmonicRank: '2nd Partial (Open)',
  },
  {
    id: 'Cs4',
    naturalName: 'C',
    accidental: '#',
    sharpSpelling: 'C#4',
    flatSpelling: 'Db4',
    octave: 4,
    writtenPitch: 'C#4',
    concertPitch: 'B3',
    writtenFreq: 277.18,
    concertFreq: 246.94,
    valves: [1, 2, 3],
    alternates: [],
    staffPosition: -3,
    octaveGroup: 'C4 - C5',
    dohadCode: '1/2',
    harmonicRank: 'Low chromatic',
  },
  {
    id: 'D4',
    naturalName: 'D',
    accidental: '',
    sharpSpelling: 'D4',
    flatSpelling: 'D4',
    octave: 4,
    writtenPitch: 'D4',
    concertPitch: 'C4',
    writtenFreq: 293.66,
    concertFreq: 261.63,
    valves: [1, 3],
    alternates: [],
    staffPosition: -2,
    octaveGroup: 'C4 - C5',
    dohadCode: '1/3',
    harmonicRank: '3rd Partial',
  },
  {
    id: 'Ds4',
    naturalName: 'D',
    accidental: '#',
    sharpSpelling: 'D#4',
    flatSpelling: 'Eb4',
    octave: 4,
    writtenPitch: 'D#4',
    concertPitch: 'C#4',
    writtenFreq: 311.13,
    concertFreq: 277.18,
    valves: [2, 3],
    alternates: [],
    staffPosition: -2,
    octaveGroup: 'C4 - C5',
    dohadCode: '2',
    harmonicRank: '3rd Partial',
  },
  {
    id: 'E4',
    naturalName: 'E',
    accidental: '',
    sharpSpelling: 'E4',
    flatSpelling: 'E4',
    octave: 4,
    writtenPitch: 'E4',
    concertPitch: 'D4',
    writtenFreq: 329.63,
    concertFreq: 293.66,
    valves: [1, 2],
    alternates: [[3]],
    staffPosition: -1,
    octaveGroup: 'C4 - C5',
    dohadCode: '1/2',
    harmonicRank: '3rd Partial',
  },
  {
    id: 'F4',
    naturalName: 'F',
    accidental: '',
    sharpSpelling: 'F4',
    flatSpelling: 'F4',
    octave: 4,
    writtenPitch: 'F4',
    concertPitch: 'Eb4',
    writtenFreq: 349.23,
    concertFreq: 311.13,
    valves: [1],
    alternates: [],
    staffPosition: 0,
    octaveGroup: 'C4 - C5',
    dohadCode: '1',
    harmonicRank: '3rd Partial',
  },
  {
    id: 'Fs4',
    naturalName: 'F',
    accidental: '#',
    sharpSpelling: 'F#4',
    flatSpelling: 'Gb4',
    octave: 4,
    writtenPitch: 'F#4',
    concertPitch: 'E4',
    writtenFreq: 369.99,
    concertFreq: 329.63,
    valves: [2],
    alternates: [],
    staffPosition: 0,
    octaveGroup: 'C4 - C5',
    dohadCode: '2',
    harmonicRank: '3rd Partial',
  },
  {
    id: 'G4',
    naturalName: 'G',
    accidental: '',
    sharpSpelling: 'G4',
    flatSpelling: 'G4',
    octave: 4,
    writtenPitch: 'G4',
    concertPitch: 'F4',
    writtenFreq: 392.0,
    concertFreq: 349.23,
    valves: [],
    alternates: [[1, 3]],
    staffPosition: 1,
    octaveGroup: 'C4 - C5',
    dohadCode: '0',
    harmonicRank: '3rd Partial (Open)',
  },
  {
    id: 'Gs4',
    naturalName: 'G',
    accidental: '#',
    sharpSpelling: 'G#4',
    flatSpelling: 'Ab4',
    octave: 4,
    writtenPitch: 'G#4',
    concertPitch: 'F#4',
    writtenFreq: 415.3,
    concertFreq: 369.99,
    valves: [2, 3],
    alternates: [],
    staffPosition: 1,
    octaveGroup: 'C4 - C5',
    dohadCode: '2/3',
    harmonicRank: '4th Partial',
  },
  {
    id: 'A4',
    naturalName: 'A',
    accidental: '',
    sharpSpelling: 'A4',
    flatSpelling: 'A4',
    octave: 4,
    writtenPitch: 'A4',
    concertPitch: 'G4',
    writtenFreq: 440.0,
    concertFreq: 392.0,
    valves: [1, 2],
    alternates: [[3]],
    staffPosition: 2,
    octaveGroup: 'C4 - C5',
    dohadCode: '1/2',
    harmonicRank: '4th Partial',
  },
  {
    id: 'As4',
    naturalName: 'A',
    accidental: '#',
    sharpSpelling: 'A#4',
    flatSpelling: 'Bb4',
    octave: 4,
    writtenPitch: 'A#4',
    concertPitch: 'G#4',
    writtenFreq: 466.16,
    concertFreq: 415.3,
    valves: [1],
    alternates: [],
    staffPosition: 2,
    octaveGroup: 'C4 - C5',
    dohadCode: '1',
    harmonicRank: '4th Partial',
  },
  {
    id: 'B4',
    naturalName: 'B',
    accidental: '',
    sharpSpelling: 'B4',
    flatSpelling: 'B4',
    octave: 4,
    writtenPitch: 'B4',
    concertPitch: 'A4',
    writtenFreq: 493.88,
    concertFreq: 440.0,
    valves: [2],
    alternates: [],
    staffPosition: 3,
    octaveGroup: 'C4 - C5',
    dohadCode: '2',
    harmonicRank: '4th Partial',
  },

  // -------------------------------------------------------------
  // OCTAVE C5 - C6 (High register / lead trumpet fanfare)
  // -------------------------------------------------------------
  {
    id: 'C5',
    naturalName: 'C',
    accidental: '',
    sharpSpelling: 'C5',
    flatSpelling: 'C5',
    octave: 5,
    writtenPitch: 'C5',
    concertPitch: 'Bb4',
    writtenFreq: 523.25,
    concertFreq: 466.16,
    valves: [],
    alternates: [],
    staffPosition: 4,
    octaveGroup: 'C5 - C6',
    dohadCode: '0',
    harmonicRank: '4th Partial (Open C)',
  },
  {
    id: 'Cs5',
    naturalName: 'C',
    accidental: '#',
    sharpSpelling: 'C#5',
    flatSpelling: 'Db5',
    octave: 5,
    writtenPitch: 'C#5',
    concertPitch: 'B4',
    writtenFreq: 554.37,
    concertFreq: 493.88,
    valves: [1, 2],
    alternates: [[3]],
    staffPosition: 4,
    octaveGroup: 'C5 - C6',
    dohadCode: '1/2',
    harmonicRank: '5th Partial',
  },
  {
    id: 'D5',
    naturalName: 'D',
    accidental: '',
    sharpSpelling: 'D5',
    flatSpelling: 'D5',
    octave: 5,
    writtenPitch: 'D5',
    concertPitch: 'C5',
    writtenFreq: 587.33,
    concertFreq: 523.25,
    valves: [1],
    alternates: [[1, 3]],
    staffPosition: 5,
    octaveGroup: 'C5 - C6',
    dohadCode: '1/3',
    harmonicRank: '5th Partial',
  },
  {
    id: 'Ds5',
    naturalName: 'D',
    accidental: '#',
    sharpSpelling: 'D#5',
    flatSpelling: 'Eb5',
    octave: 5,
    writtenPitch: 'D#5',
    concertPitch: 'C#5',
    writtenFreq: 622.25,
    concertFreq: 554.37,
    valves: [2],
    alternates: [[2, 3]],
    staffPosition: 5,
    octaveGroup: 'C5 - C6',
    dohadCode: '2',
    harmonicRank: '5th Partial',
  },
  {
    id: 'E5',
    naturalName: 'E',
    accidental: '',
    sharpSpelling: 'E5',
    flatSpelling: 'E5',
    octave: 5,
    writtenPitch: 'E5',
    concertPitch: 'D5',
    writtenFreq: 659.25,
    concertFreq: 587.33,
    valves: [],
    alternates: [[1, 2]],
    staffPosition: 6,
    octaveGroup: 'C5 - C6',
    dohadCode: '1/2',
    harmonicRank: '5th Partial (Open)',
  },
  {
    id: 'F5',
    naturalName: 'F',
    accidental: '',
    sharpSpelling: 'F5',
    flatSpelling: 'F5',
    octave: 5,
    writtenPitch: 'F5',
    concertPitch: 'Eb5',
    writtenFreq: 698.46,
    concertFreq: 622.25,
    valves: [1],
    alternates: [],
    staffPosition: 7,
    octaveGroup: 'C5 - C6',
    dohadCode: '1',
    harmonicRank: '6th Partial',
  },
  {
    id: 'Fs5',
    naturalName: 'F',
    accidental: '#',
    sharpSpelling: 'F#5',
    flatSpelling: 'Gb5',
    octave: 5,
    writtenPitch: 'F#5',
    concertPitch: 'E5',
    writtenFreq: 739.99,
    concertFreq: 659.25,
    valves: [2],
    alternates: [],
    staffPosition: 7,
    octaveGroup: 'C5 - C6',
    dohadCode: '2',
    harmonicRank: '6th Partial',
  },
  {
    id: 'G5',
    naturalName: 'G',
    accidental: '',
    sharpSpelling: 'G5',
    flatSpelling: 'G5',
    octave: 5,
    writtenPitch: 'G5',
    concertPitch: 'F5',
    writtenFreq: 783.99,
    concertFreq: 698.46,
    valves: [],
    alternates: [[1, 2]],
    staffPosition: 8,
    octaveGroup: 'C5 - C6',
    dohadCode: '0',
    harmonicRank: '6th Partial (Open G)',
  },
  {
    id: 'Gs5',
    naturalName: 'G',
    accidental: '#',
    sharpSpelling: 'G#5',
    flatSpelling: 'Ab5',
    octave: 5,
    writtenPitch: 'G#5',
    concertPitch: 'F#5',
    writtenFreq: 830.61,
    concertFreq: 739.99,
    valves: [2, 3],
    alternates: [],
    staffPosition: 8,
    octaveGroup: 'C5 - C6',
    dohadCode: '2/3',
    harmonicRank: '7th Partial',
  },
  {
    id: 'A5',
    naturalName: 'A',
    accidental: '',
    sharpSpelling: 'A5',
    flatSpelling: 'A5',
    octave: 5,
    writtenPitch: 'A5',
    concertPitch: 'G5',
    writtenFreq: 880.0,
    concertFreq: 783.99,
    valves: [1, 2],
    alternates: [[3]],
    staffPosition: 9,
    octaveGroup: 'C5 - C6',
    dohadCode: '1/2',
    harmonicRank: '7th Partial',
  },
  {
    id: 'As5',
    naturalName: 'A',
    accidental: '#',
    sharpSpelling: 'A#5',
    flatSpelling: 'Bb5',
    octave: 5,
    writtenPitch: 'A#5',
    concertPitch: 'G#5',
    writtenFreq: 932.33,
    concertFreq: 830.61,
    valves: [1],
    alternates: [],
    staffPosition: 9,
    octaveGroup: 'C5 - C6',
    dohadCode: '1',
    harmonicRank: '7th Partial',
  },
  {
    id: 'B5',
    naturalName: 'B',
    accidental: '',
    sharpSpelling: 'B5',
    flatSpelling: 'B5',
    octave: 5,
    writtenPitch: 'B5',
    concertPitch: 'A5',
    writtenFreq: 987.77,
    concertFreq: 880.0,
    valves: [2],
    alternates: [],
    staffPosition: 10,
    octaveGroup: 'C5 - C6',
    dohadCode: '2',
    harmonicRank: '8th Partial',
  },

  // -------------------------------------------------------------
  // OCTAVE C6 - C7 (Extreme Altissimo / High C Fanfare)
  // -------------------------------------------------------------
  {
    id: 'C6',
    naturalName: 'C',
    accidental: '',
    sharpSpelling: 'C6',
    flatSpelling: 'C6',
    octave: 6,
    writtenPitch: 'C6',
    concertPitch: 'Bb5',
    writtenFreq: 1046.5,
    concertFreq: 932.33,
    valves: [],
    alternates: [],
    staffPosition: 11, // High C
    octaveGroup: 'C6 - C7',
    dohadCode: '0',
    harmonicRank: '8th Partial (High C)',
  },
  {
    id: 'Cs6',
    naturalName: 'C',
    accidental: '#',
    sharpSpelling: 'C#6',
    flatSpelling: 'Db6',
    octave: 6,
    writtenPitch: 'C#6',
    concertPitch: 'B5',
    writtenFreq: 1108.73,
    concertFreq: 987.77,
    valves: [1, 2],
    alternates: [[2]],
    staffPosition: 11,
    octaveGroup: 'C6 - C7',
    dohadCode: '1/2',
    harmonicRank: 'Altissimo',
  },
  {
    id: 'D6',
    naturalName: 'D',
    accidental: '',
    sharpSpelling: 'D6',
    flatSpelling: 'D6',
    octave: 6,
    writtenPitch: 'D6',
    concertPitch: 'C6',
    writtenFreq: 1174.66,
    concertFreq: 1046.5,
    valves: [1],
    alternates: [[]],
    staffPosition: 12,
    octaveGroup: 'C6 - C7',
    dohadCode: '1',
    harmonicRank: 'Altissimo',
  },
  {
    id: 'Ds6',
    naturalName: 'D',
    accidental: '#',
    sharpSpelling: 'D#6',
    flatSpelling: 'Eb6',
    octave: 6,
    writtenPitch: 'D#6',
    concertPitch: 'C#6',
    writtenFreq: 1244.51,
    concertFreq: 1108.73,
    valves: [2],
    alternates: [[2, 3]],
    staffPosition: 12,
    octaveGroup: 'C6 - C7',
    dohadCode: '2',
    harmonicRank: 'Altissimo',
  },
  {
    id: 'E6',
    naturalName: 'E',
    accidental: '',
    sharpSpelling: 'E6',
    flatSpelling: 'E6',
    octave: 6,
    writtenPitch: 'E6',
    concertPitch: 'D6',
    writtenFreq: 1318.51,
    concertFreq: 1174.66,
    valves: [],
    alternates: [[1, 2]],
    staffPosition: 13,
    octaveGroup: 'C6 - C7',
    dohadCode: '0',
    harmonicRank: 'Altissimo',
  },
  {
    id: 'F6',
    naturalName: 'F',
    accidental: '',
    sharpSpelling: 'F6',
    flatSpelling: 'F6',
    octave: 6,
    writtenPitch: 'F6',
    concertPitch: 'Eb6',
    writtenFreq: 1396.91,
    concertFreq: 1244.51,
    valves: [1],
    alternates: [],
    staffPosition: 14,
    octaveGroup: 'C6 - C7',
    dohadCode: '1',
    harmonicRank: 'Altissimo',
  },
  {
    id: 'G6',
    naturalName: 'G',
    accidental: '',
    sharpSpelling: 'G6',
    flatSpelling: 'G6',
    octave: 6,
    writtenPitch: 'G6',
    concertPitch: 'F6',
    writtenFreq: 1567.98,
    concertFreq: 1396.91,
    valves: [],
    alternates: [],
    staffPosition: 15,
    octaveGroup: 'C6 - C7',
    dohadCode: '0',
    harmonicRank: 'Double C Register',
  },
  {
    id: 'C7',
    naturalName: 'C',
    accidental: '',
    sharpSpelling: 'C7',
    flatSpelling: 'C7',
    octave: 7,
    writtenPitch: 'C7',
    concertPitch: 'Bb6',
    writtenFreq: 2093.0,
    concertFreq: 1864.66,
    valves: [],
    alternates: [],
    staffPosition: 18,
    octaveGroup: 'C6 - C7',
    dohadCode: '0',
    harmonicRank: 'Double High C (16th Partial)',
  },
];

interface TrumpetFingeringProps {
  onInsertNote?: (noteName: string, dohadCode?: string) => void;
}

export function TrumpetFingering({ onInsertNote }: TrumpetFingeringProps) {
  const { toast } = useToast();

  // State Management
  const [activeOctave, setActiveOctave] = useState<'C3 - C4' | 'C4 - C5' | 'C5 - C6' | 'C6 - C7'>('C4 - C5');
  const [selectedNoteId, setSelectedNoteId] = useState<string>('C5'); // Default to C5 as in screenshot
  const [isConcertPitch, setIsConcertPitch] = useState(false); // Toggle Concert Pitch vs Written Pitch
  const [useSharps, setUseSharps] = useState(false); // 1/2 button: toggle sharp vs flat spelling
  const [isKeyboardHidden, setIsKeyboardHidden] = useState(false); // Hide / Show piano keyboard
  const [activeAlternateIndex, setActiveAlternateIndex] = useState<number>(-1); // -1 = primary fingering

  // Sound & Audio Synthesis
  const [isPlayingSound, setIsPlayingSound] = useState(false);
  const [timbreMode, setTimbreMode] = useState<'brass' | 'flugel' | 'pure'>('brass');
  const audioCtxRef = useRef<AudioContext | null>(null);
  const activeOscillatorsRef = useRef<any[]>([]);

  // Metronome State
  const [isMetronomeActive, setIsMetronomeActive] = useState(false);
  const [metronomeBpm, setMetronomeBpm] = useState(112);
  const metronomeTimerRef = useRef<any>(null);

  // Modals & Panels
  const [isChartModalOpen, setIsChartModalOpen] = useState(false);
  const [isArticlesModalOpen, setIsArticlesModalOpen] = useState(false);
  const [isPracticeModalOpen, setIsPracticeModalOpen] = useState(false);
  const [isTunerModalOpen, setIsTunerModalOpen] = useState(false);
  const [isRepertoireModalOpen, setIsRepertoireModalOpen] = useState(false);

  // Practice Quiz State
  const [quizScore, setQuizScore] = useState({ correct: 0, total: 0 });
  const [quizNote, setQuizNote] = useState<TrumpetNote>(TRUMPET_NOTES[6]); // C4
  const [quizSelectedValves, setQuizSelectedValves] = useState<number[]>([]);
  const [quizFeedback, setQuizFeedback] = useState<'correct' | 'wrong' | null>(null);

  // Resolve active note object
  const activeNote = useMemo(() => {
    return TRUMPET_NOTES.find(n => n.id === selectedNoteId) || TRUMPET_NOTES[6]; // C4 fallback
  }, [selectedNoteId]);

  // Determine current active valves (primary or alternate)
  const currentValves = useMemo(() => {
    if (activeAlternateIndex >= 0 && activeNote.alternates[activeAlternateIndex]) {
      return activeNote.alternates[activeAlternateIndex];
    }
    return activeNote.valves;
  }, [activeNote, activeAlternateIndex]);

  // Web Audio Context initialization
  const getAudioContext = useCallback(() => {
    if (typeof window === 'undefined') return null;
    if (!audioCtxRef.current) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        audioCtxRef.current = new AudioCtx();
      }
    }
    if (audioCtxRef.current?.state === 'suspended') {
      audioCtxRef.current.resume();
    }
    return audioCtxRef.current;
  }, []);

  // Realistic Brass Trumpet Sound Synthesis
  const playTrumpetTone = useCallback((freq: number, durationSec = 1.0) => {
    const ctx = getAudioContext();
    if (!ctx) return;

    // Stop currently playing tones
    activeOscillatorsRef.current.forEach(node => {
      try {
        node.stop();
      } catch {
        // ignore
      }
    });
    activeOscillatorsRef.current = [];

    setIsPlayingSound(true);

    const now = ctx.currentTime;
    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(0.001, now);
    masterGain.connect(ctx.destination);

    // Brass filter: resonant lowpass creating characteristic brass "bite" on attack
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.Q.setValueAtTime(timbreMode === 'flugel' ? 1.5 : 3.0, now);
    filter.frequency.setValueAtTime(freq * 1.5, now);
    filter.frequency.exponentialRampToValueAtTime(Math.min(freq * 5.0, 7000), now + 0.05); // Attack bite
    filter.frequency.exponentialRampToValueAtTime(freq * 2.8, now + 0.3); // Settle
    filter.connect(masterGain);

    // Harmonic blend: Brass instruments have rich odd and even harmonics
    const harmonics = [
      { mult: 1, gain: 0.65 },
      { mult: 2, gain: 0.35 },
      { mult: 3, gain: 0.25 },
      { mult: 4, gain: 0.15 },
      { mult: 5, gain: 0.08 },
    ];

    harmonics.forEach(({ mult, gain: hGain }) => {
      const osc = ctx.createOscillator();
      const oscGain = ctx.createGain();

      osc.type = mult === 1 ? 'sawtooth' : 'triangle';
      osc.frequency.setValueAtTime(freq * mult, now);

      // Add gentle natural brass vibrato (5.5 Hz)
      const vibrato = ctx.createOscillator();
      const vibratoGain = ctx.createGain();
      vibrato.frequency.setValueAtTime(5.5, now);
      vibratoGain.gain.setValueAtTime(freq * 0.004, now);
      vibrato.connect(vibratoGain);
      vibratoGain.connect(osc.frequency);
      vibrato.start(now);
      vibrato.stop(now + durationSec);

      oscGain.gain.setValueAtTime(hGain, now);
      osc.connect(oscGain);
      oscGain.connect(filter);

      osc.start(now);
      osc.stop(now + durationSec);
      activeOscillatorsRef.current.push(osc);
    });

    // Master Envelope (Attack, Decay, Sustain, Release)
    masterGain.gain.exponentialRampToValueAtTime(0.4, now + 0.04); // Attack
    masterGain.gain.exponentialRampToValueAtTime(0.3, now + 0.2); // Decay
    masterGain.gain.setValueAtTime(0.28, now + durationSec - 0.1); // Sustain
    masterGain.gain.exponentialRampToValueAtTime(0.0001, now + durationSec); // Release

    setTimeout(() => {
      setIsPlayingSound(false);
    }, durationSec * 1000);
  }, [getAudioContext, timbreMode]);

  // Play currently selected note
  const handlePlayCurrentNote = () => {
    const freq = isConcertPitch ? activeNote.concertFreq : activeNote.writtenFreq;
    playTrumpetTone(freq, 1.2);
  };

  // Step up / down semitone navigation
  const handleStepPitch = (direction: 'up' | 'down') => {
    const currentIndex = TRUMPET_NOTES.findIndex(n => n.id === selectedNoteId);
    if (currentIndex === -1) return;

    let nextIndex = direction === 'up' ? currentIndex + 1 : currentIndex - 1;
    if (nextIndex < 0) nextIndex = 0;
    if (nextIndex >= TRUMPET_NOTES.length) nextIndex = TRUMPET_NOTES.length - 1;

    const nextNote = TRUMPET_NOTES[nextIndex];
    setSelectedNoteId(nextNote.id);
    setActiveOctave(nextNote.octaveGroup);
    setActiveAlternateIndex(-1);

    const freq = isConcertPitch ? nextNote.concertFreq : nextNote.writtenFreq;
    playTrumpetTone(freq, 0.6);
  };

  // Toggle Valve Press (Reverse Lookup: Allows musician to tap pistons directly)
  const handleToggleValveManually = (valveNum: number) => {
    const currentList = [...currentValves];
    let nextList: number[];
    if (currentList.includes(valveNum)) {
      nextList = currentList.filter(v => v !== valveNum);
    } else {
      nextList = [...currentList, valveNum].sort();
    }

    // Find notes in current octave that match this valve combination
    const matchingNotes = TRUMPET_NOTES.filter(
      n => n.octaveGroup === activeOctave && JSON.stringify(n.valves) === JSON.stringify(nextList)
    );

    if (matchingNotes.length > 0) {
      setSelectedNoteId(matchingNotes[0].id);
      const freq = isConcertPitch ? matchingNotes[0].concertFreq : matchingNotes[0].writtenFreq;
      playTrumpetTone(freq, 0.6);
    } else {
      // Find anywhere in entire chart
      const anyMatch = TRUMPET_NOTES.find(
        n => JSON.stringify(n.valves) === JSON.stringify(nextList)
      );
      if (anyMatch) {
        setSelectedNoteId(anyMatch.id);
        setActiveOctave(anyMatch.octaveGroup);
        const freq = isConcertPitch ? anyMatch.concertFreq : anyMatch.writtenFreq;
        playTrumpetTone(freq, 0.6);
      }
    }
  };

  // Metronome Click Synthesis
  const playMetronomeClick = useCallback((isAccent = false) => {
    const ctx = getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(isAccent ? 1200 : 800, now);
    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.05);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.05);
  }, [getAudioContext]);

  // Metronome Interval Loop
  useEffect(() => {
    if (isMetronomeActive) {
      const intervalMs = (60 / metronomeBpm) * 1000;
      let beat = 0;
      metronomeTimerRef.current = setInterval(() => {
        playMetronomeClick(beat % 4 === 0);
        beat++;
      }, intervalMs);
    } else {
      if (metronomeTimerRef.current) {
        clearInterval(metronomeTimerRef.current);
      }
    }
    return () => {
      if (metronomeTimerRef.current) clearInterval(metronomeTimerRef.current);
    };
  }, [isMetronomeActive, metronomeBpm, playMetronomeClick]);

  // Setup Next Practice Quiz Note
  const setupNewQuizNote = () => {
    const middleNotes = TRUMPET_NOTES.filter(n => n.octaveGroup === 'C4 - C5' || n.octaveGroup === 'C5 - C6');
    const randomNote = middleNotes[Math.floor(Math.random() * middleNotes.length)];
    setQuizNote(randomNote);
    setQuizSelectedValves([]);
    setQuizFeedback(null);
  };

  // Check Practice Quiz Answer
  const handleCheckQuizAnswer = () => {
    const correct = JSON.stringify(quizNote.valves.sort()) === JSON.stringify(quizSelectedValves.sort());
    if (correct) {
      setQuizFeedback('correct');
      setQuizScore(prev => ({ correct: prev.correct + 1, total: prev.total + 1 }));
      playTrumpetTone(quizNote.writtenFreq, 0.8);
      toast.success('Correct Fingering!', `Great job! ${quizNote.writtenPitch} fingering is ${quizNote.valves.length ? quizNote.valves.join('-') : 'Open (0)'}.`);
    } else {
      setQuizFeedback('wrong');
      setQuizScore(prev => ({ ...prev, total: prev.total + 1 }));
      toast.error('Incorrect', `The correct fingering for ${quizNote.writtenPitch} is ${quizNote.valves.length ? quizNote.valves.join('-') : 'Open (0)'}.`);
    }
  };

  // Insert active note into Madeh Composition
  const handleInsertActiveNote = () => {
    const noteName = useSharps ? activeNote.sharpSpelling : activeNote.flatSpelling;
    onInsertNote?.(noteName, activeNote.dohadCode);
    toast.success('Inserted Note', `Added ${noteName} (${activeNote.dohadCode}) into Madeh composition editor.`);
  };

  // Display Name of current note (written vs concert & sharp vs flat)
  const currentDisplayName = useMemo(() => {
    if (isConcertPitch) {
      return activeNote.concertPitch;
    }
    return useSharps ? activeNote.sharpSpelling : activeNote.flatSpelling;
  }, [activeNote, isConcertPitch, useSharps]);

  const currentFrequencyLabel = useMemo(() => {
    const freq = isConcertPitch ? activeNote.concertFreq : activeNote.writtenFreq;
    return `${Math.round(freq)}Hz`;
  }, [activeNote, isConcertPitch]);

  return (
    <div className="w-full max-w-md mx-auto bg-[#1C0D07] text-[#F5EDE6] rounded-3xl border border-amber-900/40 p-4 sm:p-5 shadow-2xl space-y-4 select-none">
      
      {/* 1. TOP HEADER BAR (From Image: Grid, Tuning Fork, Concert Pitch On/Off, Songbook, Equalizer) */}
      <div className="flex items-center justify-between gap-2 px-1 pt-1">
        {/* Left Icons: All Notes Grid & Pitch Pipe Tuner */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsChartModalOpen(true)}
            className="w-10 h-10 rounded-2xl bg-amber-950/40 border border-amber-800/40 hover:bg-amber-900/60 text-amber-200 flex items-center justify-center transition-all cursor-pointer shadow-md"
            title="Complete Trumpet Fingering Chart"
          >
            <LayoutGrid className="w-5 h-5 text-amber-300" />
          </button>

          <button
            type="button"
            onClick={() => setIsTunerModalOpen(true)}
            className="w-10 h-10 rounded-2xl bg-amber-950/40 border border-amber-800/40 hover:bg-amber-900/60 text-amber-200 flex items-center justify-center transition-all cursor-pointer shadow-md"
            title="Reference Pitch Pipe / Tuner (Bb / A440)"
          >
            <Disc className="w-5 h-5 text-amber-300" />
          </button>
        </div>

        {/* Center: Concert Pitch Toggle (On | Off) */}
        <div className="flex flex-col items-center">
          <span className="text-[10px] text-amber-300/80 font-medium tracking-wide">
            Concert Pitch
          </span>
          <div className="flex items-center bg-black/50 p-0.5 rounded-full border border-amber-700/50 mt-0.5">
            <button
              type="button"
              onClick={() => setIsConcertPitch(true)}
              className={`px-3 py-0.5 text-xs font-bold rounded-full transition-all cursor-pointer ${
                isConcertPitch
                  ? 'bg-amber-500 text-black shadow-sm'
                  : 'text-amber-200/60 hover:text-amber-100'
              }`}
            >
              On
            </button>
            <button
              type="button"
              onClick={() => setIsConcertPitch(false)}
              className={`px-3 py-0.5 text-xs font-bold rounded-full transition-all cursor-pointer ${
                !isConcertPitch
                  ? 'bg-amber-200/90 text-black shadow-sm'
                  : 'text-amber-200/60 hover:text-amber-100'
              }`}
            >
              Off
            </button>
          </div>
          <span className="text-[9px] text-muted-foreground/80 font-mono mt-0.5">
            {isConcertPitch ? 'Concert Pitch (C)' : 'Written Notes (Bb)'}
          </span>
        </div>

        {/* Right Icons: Songbook & Timbre Sound Equalizer */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsRepertoireModalOpen(true)}
            className="w-10 h-10 rounded-2xl bg-amber-950/40 border border-amber-800/40 hover:bg-amber-900/60 text-amber-200 flex items-center justify-center transition-all cursor-pointer shadow-md"
            title="Madeh Repertoire Fingerings"
          >
            <BookOpen className="w-5 h-5 text-amber-300" />
          </button>

          <button
            type="button"
            onClick={() => {
              const modes: ('brass' | 'flugel' | 'pure')[] = ['brass', 'flugel', 'pure'];
              const next = modes[(modes.indexOf(timbreMode) + 1) % modes.length];
              setTimbreMode(next);
              toast.info('Trumpet Timbre', `Tone switched to: ${next.toUpperCase()}`);
            }}
            className="w-10 h-10 rounded-2xl bg-amber-950/40 border border-amber-800/40 hover:bg-amber-900/60 text-amber-200 flex items-center justify-center transition-all cursor-pointer shadow-md"
            title={`Timbre: ${timbreMode}`}
          >
            <Activity className="w-5 h-5 text-amber-300" />
          </button>
        </div>
      </div>

      {/* 2. TOP ACTION BUTTONS: Articles & Practice Tracker */}
      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => setIsArticlesModalOpen(true)}
          className="flex items-center justify-center gap-2 py-2 px-3 rounded-2xl bg-gradient-to-r from-amber-950/60 to-amber-900/40 border border-amber-600/40 text-amber-200 text-xs font-serif font-bold hover:border-amber-400 transition-all cursor-pointer shadow-sm active:scale-98"
        >
          <span>Articles</span>
          <span className="text-sm">📑</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setupNewQuizNote();
            setIsPracticeModalOpen(true);
          }}
          className="flex items-center justify-center gap-2 py-2 px-3 rounded-2xl bg-gradient-to-r from-amber-950/60 to-amber-900/40 border border-amber-600/40 text-amber-200 text-xs font-serif font-bold hover:border-amber-400 transition-all cursor-pointer shadow-sm active:scale-98"
        >
          <span>Practice Tracker</span>
          <span className="text-sm">🎯</span>
        </button>
      </div>

      {/* 3. CENTER SECTION: 3 REALISTIC TRUMPET VALVES & SIDE CONTROLS */}
      <div className="grid grid-cols-5 gap-2 items-center bg-black/25 p-3 rounded-3xl border border-amber-900/30">
        
        {/* Left Side Controls: Play Sound & Alternates */}
        <div className="flex flex-col items-center justify-around h-full gap-3">
          {/* Audio toggle button */}
          <button
            type="button"
            onClick={handlePlayCurrentNote}
            className="w-11 h-11 rounded-2xl bg-amber-900/40 border border-amber-700/50 hover:bg-amber-800/60 text-amber-300 flex items-center justify-center transition-all cursor-pointer shadow-md active:scale-95"
            title="Hear Trumpet Note"
          >
            <span className="text-lg">🎺</span>
          </button>

          {/* Alternate Fingering Indicator / Button */}
          <button
            type="button"
            onClick={() => {
              if (activeNote.alternates.length > 0) {
                const nextAlt = activeAlternateIndex + 1;
                if (nextAlt >= activeNote.alternates.length) {
                  setActiveAlternateIndex(-1); // Back to primary
                } else {
                  setActiveAlternateIndex(nextAlt);
                }
              } else {
                toast.info('Standard Fingering', `${activeNote.writtenPitch} has no common alternate fingering.`);
              }
            }}
            className={`w-11 h-11 rounded-2xl border flex flex-col items-center justify-center transition-all cursor-pointer shadow-md active:scale-95 ${
              activeAlternateIndex >= 0
                ? 'bg-amber-500 text-black border-amber-300'
                : 'bg-amber-900/40 text-amber-300 border-amber-700/50 hover:bg-amber-800/60'
            }`}
            title="Toggle Alternate Fingering"
          >
            <Sparkles className="w-4 h-4" />
            <span className="text-[9px] font-mono leading-none mt-0.5">
              {activeNote.alternates.length > 0 ? (activeAlternateIndex >= 0 ? 'Alt' : '1st') : '•'}
            </span>
          </button>
        </div>

        {/* Center: 3 Animated Metallic Trumpet Valves (Pistons 1, 2, 3) */}
        <div className="col-span-3 flex items-center justify-center gap-3.5 sm:gap-4 py-2">
          {[1, 2, 3].map(valveNumber => {
            const isPressed = currentValves.includes(valveNumber);

            return (
              <div
                key={valveNumber}
                onClick={() => handleToggleValveManually(valveNumber)}
                className="flex flex-col items-center cursor-pointer group"
                title={`Valve ${valveNumber}: Tap to toggle depression`}
              >
                {/* 3D Metallic Piston Assembly */}
                <div className="relative w-10 sm:w-11 h-28 flex flex-col items-center justify-end">
                  
                  {/* Top Valve Finger Button / Cap */}
                  <div
                    className={`w-8 h-3.5 rounded-full border border-zinc-400 bg-gradient-to-b from-zinc-200 via-zinc-400 to-zinc-600 shadow-md transition-all duration-150 ${
                      isPressed ? 'translate-y-6 shadow-inner brightness-90' : 'translate-y-0'
                    }`}
                  >
                    <div className="w-5 h-1.5 mx-auto mt-0.5 rounded-full bg-white/70" />
                  </div>

                  {/* Piston Stem Rod */}
                  <div
                    className={`w-2 bg-gradient-to-r from-zinc-400 via-zinc-200 to-zinc-500 transition-all duration-150 ${
                      isPressed ? 'h-3 translate-y-6' : 'h-8 translate-y-0'
                    }`}
                  />

                  {/* Brass Casing Cylinder (Outer Valve Casing) */}
                  <div
                    className={`w-10 sm:w-11 h-16 rounded-xl border-2 transition-all flex flex-col items-center justify-center relative overflow-hidden shadow-lg ${
                      isPressed
                        ? 'border-amber-400 bg-gradient-to-b from-amber-600 via-amber-400 to-amber-700 ring-2 ring-amber-400/50 shadow-amber-500/20'
                        : 'border-amber-700/60 bg-gradient-to-b from-[#E2C799] via-[#D1A966] to-[#A37B3D]'
                    }`}
                  >
                    {/* Metallic Cylinder Sheen / Reflection */}
                    <div className="absolute inset-y-0 left-1.5 w-1.5 bg-white/40 blur-[0.5px]" />
                    <div className="absolute inset-y-0 right-2 w-1 bg-black/25" />

                    {/* Valve Number inside casing */}
                    <span className="font-serif font-black text-sm text-[#3E2305] drop-shadow-sm select-none">
                      {isPressed ? '▼' : ''}
                    </span>
                  </div>
                </div>

                {/* Valve Number Label below (1, 2, 3) */}
                <span
                  className={`mt-2 font-serif font-bold text-sm transition-colors ${
                    isPressed ? 'text-amber-400 scale-110' : 'text-amber-200/70 group-hover:text-amber-200'
                  }`}
                >
                  {valveNumber}
                </span>
              </div>
            );
          })}
        </div>

        {/* Right Side Controls: Metronome & 1/2 Accidental Toggle */}
        <div className="flex flex-col items-center justify-around h-full gap-3">
          {/* Metronome Button */}
          <button
            type="button"
            onClick={() => setIsMetronomeActive(!isMetronomeActive)}
            className={`w-11 h-11 rounded-2xl border flex flex-col items-center justify-center transition-all cursor-pointer shadow-md active:scale-95 ${
              isMetronomeActive
                ? 'bg-emerald-600 text-white border-emerald-400 ring-2 ring-emerald-500/40 animate-pulse'
                : 'bg-amber-900/40 text-amber-300 border-amber-700/50 hover:bg-amber-800/60'
            }`}
            title={`Metronome (${metronomeBpm} BPM): Click to Toggle`}
          >
            <span className="text-base">⏱️</span>
            <span className="text-[8px] font-mono leading-none mt-0.5">{metronomeBpm}</span>
          </button>

          {/* 1/2 Enharmonic Spelling Toggle (Sharp vs Flat) */}
          <button
            type="button"
            onClick={() => setUseSharps(!useSharps)}
            className={`w-11 h-11 rounded-2xl border font-bold text-xs flex items-center justify-center transition-all cursor-pointer shadow-md active:scale-95 ${
              useSharps
                ? 'bg-amber-500 text-black border-amber-300'
                : 'bg-amber-900/40 text-amber-200 border-amber-700/50 hover:bg-amber-800/60'
            }`}
            title="Toggle Enharmonic (# vs b)"
          >
            1/2
          </button>
        </div>
      </div>

      {/* 4. NOTE STAVE & PITCH DISPLAY CARD (Matching Image: Left Clef/Stave, Right Play/Arrows) */}
      <div className="grid grid-cols-5 gap-3 items-stretch">
        
        {/* Left Stave Card: Note Name, Frequency & Treble Clef Graphic */}
        <div className="col-span-3 bg-black/40 border border-amber-900/50 rounded-3xl p-3 flex flex-col justify-between shadow-inner">
          <div className="flex items-center justify-between">
            <span className="font-serif font-black text-sm text-amber-200">
              {currentDisplayName} ({currentFrequencyLabel})
            </span>
            <Badge variant="outline" className="text-[9px] py-0 px-1.5 text-amber-400 border-amber-500/40 font-mono">
              Dohad: {activeNote.dohadCode}
            </Badge>
          </div>

          {/* Musical Staff Representation (Interactive SVG) */}
          <div className="w-full h-24 relative flex items-center justify-center my-1 select-none">
            <svg viewBox="0 0 200 90" className="w-full h-full">
              {/* 5 Staff Lines */}
              {[25, 35, 45, 55, 65].map((y, idx) => (
                <line
                  key={idx}
                  x1="10"
                  y1={y}
                  x2="190"
                  y2={y}
                  stroke="#8B7355"
                  strokeWidth="1.2"
                  opacity="0.85"
                />
              ))}

              {/* Treble Clef Symbol */}
              <text
                x="20"
                y="63"
                fontSize="48"
                fill="#F5EDE6"
                fontFamily="serif"
                className="select-none pointer-events-none"
              >
                𝄞
              </text>

              {/* Ledger Lines for Low Notes (Middle C is at y = 75, A3 is at y = 85) */}
              {activeNote.staffPosition <= -3 && (
                <line x1="110" y1="75" x2="150" y2="75" stroke="#F5EDE6" strokeWidth="1.5" />
              )}
              {activeNote.staffPosition <= -5 && (
                <line x1="110" y1="85" x2="150" y2="85" stroke="#F5EDE6" strokeWidth="1.5" />
              )}

              {/* Ledger Lines for High Notes (A5 is at y = 15, C6 is at y = 5) */}
              {activeNote.staffPosition >= 9 && (
                <line x1="110" y1="15" x2="150" y2="15" stroke="#F5EDE6" strokeWidth="1.5" />
              )}
              {activeNote.staffPosition >= 11 && (
                <line x1="110" y1="5" x2="150" y2="5" stroke="#F5EDE6" strokeWidth="1.5" />
              )}

              {/* Note Head Position calculation */}
              {/* Middle line B4 is y = 45. Each step is 5px. */}
              {(() => {
                const noteY = 45 - activeNote.staffPosition * 5;
                const noteX = 130;
                return (
                  <g>
                    {/* Accidental (# or b) */}
                    {activeNote.accidental && (
                      <text
                        x={noteX - 16}
                        y={noteY + 4}
                        fontSize="18"
                        fill="#F5EDE6"
                        fontWeight="bold"
                        className="select-none"
                      >
                        {useSharps ? (activeNote.sharpSpelling.includes('#') ? '♯' : '♭') : (activeNote.flatSpelling.includes('b') ? '♭' : '♯')}
                      </text>
                    )}

                    {/* Note Head (Oval) */}
                    <ellipse
                      cx={noteX}
                      cy={noteY}
                      rx="7"
                      ry="5.5"
                      transform={`rotate(-20 ${noteX} ${noteY})`}
                      fill="#F5EDE6"
                      className="transition-all duration-150"
                    />

                    {/* Note Stem */}
                    <line
                      x1={activeNote.staffPosition >= 3 ? noteX - 6.5 : noteX + 6.5}
                      y1={noteY}
                      x2={activeNote.staffPosition >= 3 ? noteX - 6.5 : noteX + 6.5}
                      y2={activeNote.staffPosition >= 3 ? noteY + 28 : noteY - 28}
                      stroke="#F5EDE6"
                      strokeWidth="1.8"
                    />
                  </g>
                );
              })()}
            </svg>
          </div>

          <div className="flex items-center justify-between text-[10px] text-muted-foreground font-mono">
            <span>{activeNote.harmonicRank}</span>
            {onInsertNote && (
              <button
                type="button"
                onClick={handleInsertActiveNote}
                className="text-amber-400 hover:underline flex items-center gap-1 font-bold"
              >
                <Plus className="w-3 h-3" /> Insert Note
              </button>
            )}
          </div>
        </div>

        {/* Right Card: Glowing Play Button & Semitone Steppers */}
        <div className="col-span-2 bg-black/40 border border-amber-900/50 rounded-3xl p-3 flex flex-col items-center justify-between gap-2 shadow-inner">
          {/* Circular Holographic Play Button */}
          <button
            type="button"
            onClick={handlePlayCurrentNote}
            className={`w-14 h-14 rounded-full border-2 flex items-center justify-center transition-all cursor-pointer active:scale-95 ${
              isPlayingSound
                ? 'border-emerald-400 bg-emerald-500 text-black shadow-lg shadow-emerald-500/40 ring-4 ring-emerald-400/30'
                : 'border-zinc-300 bg-gradient-to-br from-zinc-100 via-amber-100 to-zinc-300 text-zinc-900 shadow-md hover:scale-105'
            }`}
            title="Play Trumpet Tone"
          >
            <Play className={`w-6 h-6 ml-0.5 fill-current ${isPlayingSound ? 'animate-pulse' : ''}`} />
          </button>

          {/* Steppers Up & Down (▲ and ▼) */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleStepPitch('up')}
              className="w-9 h-9 rounded-xl bg-amber-200/90 hover:bg-amber-300 text-black flex items-center justify-center font-bold transition-all cursor-pointer shadow-sm active:scale-95"
              title="Next Higher Note (▲)"
            >
              <ChevronUp className="w-5 h-5 text-black" />
            </button>

            <button
              type="button"
              onClick={() => handleStepPitch('down')}
              className="w-9 h-9 rounded-xl bg-amber-200/90 hover:bg-amber-300 text-black flex items-center justify-center font-bold transition-all cursor-pointer shadow-sm active:scale-95"
              title="Next Lower Note (▼)"
            >
              <ChevronDown className="w-5 h-5 text-black" />
            </button>
          </div>
        </div>
      </div>

      {/* 5. OCTAVE SELECTOR & PIANO KEYBOARD SECTION */}
      <div className="space-y-2">
        {/* Octave Range Tabs & Hide Button */}
        <div className="flex items-center justify-between gap-1 text-[11px] font-mono">
          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
            {(['C3 - C4', 'C4 - C5', 'C5 - C6', 'C6 - C7'] as const).map(octaveRange => (
              <button
                key={octaveRange}
                type="button"
                onClick={() => {
                  setActiveOctave(octaveRange);
                  // Auto-select lowest note in that octave
                  const octaveNotes = TRUMPET_NOTES.filter(n => n.octaveGroup === octaveRange);
                  if (octaveNotes.length > 0) {
                    setSelectedNoteId(octaveNotes[0].id);
                  }
                }}
                className={`px-2.5 py-1 rounded-xl transition-all cursor-pointer ${
                  activeOctave === octaveRange
                    ? 'bg-black/60 text-amber-300 font-bold border border-amber-700/50 shadow-sm'
                    : 'text-muted-foreground hover:text-amber-200'
                }`}
              >
                {octaveRange}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setIsKeyboardHidden(!isKeyboardHidden)}
            className="px-2.5 py-1 rounded-xl bg-amber-200/80 hover:bg-amber-300 text-black font-semibold text-[10px] transition-all cursor-pointer"
          >
            {isKeyboardHidden ? 'Show' : 'Hide'}
          </button>
        </div>

        {/* Interactive Piano Keyboard (Responsive Chrome/Ebony) */}
        {!isKeyboardHidden && (
          <div className="relative w-full h-28 bg-zinc-950 rounded-2xl p-1.5 border border-zinc-800 shadow-xl overflow-hidden flex select-none">
            {/* White Keys */}
            {[
              { note: 'C', idPrefix: 'C' },
              { note: 'D', idPrefix: 'D' },
              { note: 'E', idPrefix: 'E' },
              { note: 'F', idPrefix: 'F' },
              { note: 'G', idPrefix: 'G' },
              { note: 'A', idPrefix: 'A' },
              { note: 'B', idPrefix: 'B' },
              { note: 'C', idPrefix: 'C_next' },
            ].map((keyItem, idx) => {
              // Find matching note in active octave
              const octNum = activeOctave === 'C3 - C4' ? 3 : activeOctave === 'C4 - C5' ? 4 : activeOctave === 'C5 - C6' ? 5 : 6;
              const actualOct = keyItem.idPrefix === 'C_next' ? octNum + 1 : octNum;
              const matchingNote = TRUMPET_NOTES.find(
                n => n.naturalName === keyItem.note && !n.accidental && n.octave === actualOct
              );

              const isSelected = matchingNote?.id === selectedNoteId;

              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    if (matchingNote) {
                      setSelectedNoteId(matchingNote.id);
                      setActiveAlternateIndex(-1);
                      const freq = isConcertPitch ? matchingNote.concertFreq : matchingNote.writtenFreq;
                      playTrumpetTone(freq, 0.6);
                    }
                  }}
                  className={`flex-1 h-full rounded-b-lg border-x border-b border-zinc-300/40 flex flex-col justify-end items-center pb-1.5 transition-all cursor-pointer relative ${
                    isSelected
                      ? 'bg-amber-200/90 text-black font-black shadow-inner'
                      : 'bg-white text-zinc-800 hover:bg-zinc-100 font-bold active:bg-zinc-200'
                  }`}
                >
                  <span className="text-[10px] pointer-events-none">{keyItem.note}</span>
                </button>
              );
            })}

            {/* Black Keys (Positioned absolutely over white key seams) */}
            {[
              { note: 'Db/C#', leftPercent: 9.5, sharp: 'Cs', octOffset: 0 },
              { note: 'Eb/D#', leftPercent: 22.5, sharp: 'Ds', octOffset: 0 },
              { note: 'Gb/F#', leftPercent: 48.0, sharp: 'Fs', octOffset: 0 },
              { note: 'Ab/G#', leftPercent: 61.0, sharp: 'Gs', octOffset: 0 },
              { note: 'Bb/A#', leftPercent: 74.0, sharp: 'As', octOffset: 0 },
            ].map((blackKey, bIdx) => {
              const octNum = activeOctave === 'C3 - C4' ? 3 : activeOctave === 'C4 - C5' ? 4 : activeOctave === 'C5 - C6' ? 5 : 6;
              const matchingBlackNote = TRUMPET_NOTES.find(
                n => n.id.startsWith(blackKey.sharp) && n.octave === octNum
              );

              const isSelected = matchingBlackNote?.id === selectedNoteId;

              return (
                <button
                  key={bIdx}
                  type="button"
                  onClick={() => {
                    if (matchingBlackNote) {
                      setSelectedNoteId(matchingBlackNote.id);
                      setActiveAlternateIndex(-1);
                      const freq = isConcertPitch ? matchingBlackNote.concertFreq : matchingBlackNote.writtenFreq;
                      playTrumpetTone(freq, 0.6);
                    }
                  }}
                  style={{ left: `${blackKey.leftPercent}%` }}
                  className={`absolute top-1.5 w-[9%] h-[60%] rounded-b-md z-10 flex flex-col justify-end items-center pb-1 transition-all cursor-pointer shadow-md ${
                    isSelected
                      ? 'bg-amber-500 text-black font-black border border-amber-300'
                      : 'bg-zinc-900 border-x border-b border-zinc-700 text-zinc-300 hover:bg-zinc-800 active:bg-zinc-700'
                  }`}
                >
                  <span className="text-[8px] leading-tight text-center pointer-events-none">
                    {useSharps ? blackKey.note.split('/')[1] : blackKey.note.split('/')[0]}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* ------------------------------------------------------------- */}
      {/* MODAL 1: COMPLETE TRUMPET FINGERING CHART (Grid Icon) */}
      {/* ------------------------------------------------------------- */}
      <Dialog open={isChartModalOpen} onOpenChange={setIsChartModalOpen}>
        <div className="space-y-4">
          <DialogHeader>
            <DialogTitle className="text-xl font-serif font-black text-foreground flex items-center gap-2">
              <LayoutGrid className="w-5 h-5 text-amber-500" />
              Complete Trumpet Fingering Chart
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Standard B-flat Trumpet valve fingerings across full chromatic range from F#3 to C7.
            </DialogDescription>
          </DialogHeader>

          <div className="max-h-[60vh] overflow-y-auto pr-1 space-y-2 text-xs">
            <table className="w-full text-left font-mono border-collapse">
              <thead>
                <tr className="border-b border-border/80 text-[10px] text-muted-foreground uppercase">
                  <th className="py-1 px-2">Note</th>
                  <th className="py-1 px-2">Valves</th>
                  <th className="py-1 px-2">Dohad</th>
                  <th className="py-1 px-2">Concert</th>
                  <th className="py-1 px-2 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {TRUMPET_NOTES.map(noteItem => {
                  const isCurrent = noteItem.id === selectedNoteId;
                  return (
                    <tr
                      key={noteItem.id}
                      className={`hover:bg-muted/40 cursor-pointer transition-colors ${
                        isCurrent ? 'bg-amber-500/15 font-bold text-amber-400' : ''
                      }`}
                      onClick={() => {
                        setSelectedNoteId(noteItem.id);
                        setActiveOctave(noteItem.octaveGroup);
                        setIsChartModalOpen(false);
                        const freq = isConcertPitch ? noteItem.concertFreq : noteItem.writtenFreq;
                        playTrumpetTone(freq, 0.6);
                      }}
                    >
                      <td className="py-1.5 px-2">
                        {noteItem.sharpSpelling} / {noteItem.flatSpelling}
                      </td>
                      <td className="py-1.5 px-2">
                        <span className="font-bold text-primary">
                          {noteItem.valves.length > 0 ? noteItem.valves.join('-') : 'Open (0)'}
                        </span>
                        {noteItem.alternates.length > 0 && (
                          <span className="text-[10px] text-muted-foreground ml-1">
                            (Alt: {noteItem.alternates.map(a => a.join('-')).join(', ')})
                          </span>
                        )}
                      </td>
                      <td className="py-1.5 px-2 text-amber-300 font-sans">
                        {noteItem.dohadCode}
                      </td>
                      <td className="py-1.5 px-2 text-muted-foreground">
                        {noteItem.concertPitch} ({Math.round(noteItem.concertFreq)}Hz)
                      </td>
                      <td className="py-1.5 px-2 text-right">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 px-2 text-[10px] text-amber-400"
                        >
                          Select
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </Dialog>

      {/* ------------------------------------------------------------- */}
      {/* MODAL 2: ARTICLES & TRUMPET GUIDES (Articles Button) */}
      {/* ------------------------------------------------------------- */}
      <Dialog open={isArticlesModalOpen} onOpenChange={setIsArticlesModalOpen}>
        <div className="space-y-4">
          <DialogHeader>
            <DialogTitle className="text-xl font-serif font-black text-foreground flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-amber-500" />
              Trumpet Fingering &amp; Technique Guides
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Educational guides for Taheri Scout Band brass musicians.
            </DialogDescription>
          </DialogHeader>

          <div className="max-h-[60vh] overflow-y-auto pr-1 space-y-3 text-xs">
            <div className="p-3.5 rounded-xl border border-border bg-card/80 space-y-1.5">
              <h4 className="font-bold text-foreground text-sm flex items-center gap-1.5">
                <span>🎺 1. How Trumpet Valves Work</span>
              </h4>
              <p className="text-muted-foreground leading-relaxed">
                The trumpet is fundamentally an open pipe producing harmonic overtones. Pressing valves inserts additional tubing:
              </p>
              <ul className="list-disc list-inside text-muted-foreground/90 space-y-1 font-mono text-[11px]">
                <li><strong className="text-amber-400">2nd Valve:</strong> Lowers pitch by 1 half-step (semitone).</li>
                <li><strong className="text-amber-400">1st Valve:</strong> Lowers pitch by 1 whole step (2 semitones).</li>
                <li><strong className="text-amber-400">3rd Valve:</strong> Lowers pitch by 1.5 steps (3 semitones).</li>
                <li><strong className="text-amber-400">1 + 2 Valves:</strong> Combines to equal 3 semitones (alternate for 3rd valve).</li>
                <li><strong className="text-amber-400">1 + 3 Valves:</strong> Lowers pitch by 5 semitones (used for low D &amp; G).</li>
                <li><strong className="text-amber-400">1 + 2 + 3 Valves:</strong> Lowers pitch by 6 semitones (used for low C# &amp; F#).</li>
              </ul>
            </div>

            <div className="p-3.5 rounded-xl border border-border bg-card/80 space-y-1.5">
              <h4 className="font-bold text-foreground text-sm flex items-center gap-1.5">
                <span>🎼 2. Written Pitch vs Concert Pitch</span>
              </h4>
              <p className="text-muted-foreground leading-relaxed">
                The standard trumpet is pitched in <strong>B-flat (Bb)</strong>. When a trumpet player reads and plays a written <strong>C</strong>, the sound produced in concert pitch is a <strong>B-flat</strong> (a whole step lower). Use the top Concert Pitch toggle in this app to see both pitches simultaneously.
              </p>
            </div>

            <div className="p-3.5 rounded-xl border border-border bg-card/80 space-y-1.5">
              <h4 className="font-bold text-foreground text-sm flex items-center gap-1.5">
                <span>🕌 3. Taheri Scout Band Dohad Scale Mapping</span>
              </h4>
              <p className="text-muted-foreground leading-relaxed">
                In band rehearsals, tunes are vocalized using Dohad valve notation: <strong>0 (C/Sa)</strong>, <strong>1/3 (D/Re)</strong>, <strong>1/2 (E/Ga)</strong>, <strong>1 (F/Ma)</strong>, <strong>0 (G/Pa)</strong>, <strong>1/2 (A/Dha)</strong>, <strong>2 (B/Ni)</strong>.
              </p>
            </div>
          </div>
        </div>
      </Dialog>

      {/* ------------------------------------------------------------- */}
      {/* MODAL 3: PRACTICE TRACKER & FINGERING QUIZ (Practice Tracker Button) */}
      {/* ------------------------------------------------------------- */}
      <Dialog open={isPracticeModalOpen} onOpenChange={setIsPracticeModalOpen}>
        <div className="space-y-4">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle className="text-xl font-serif font-black text-foreground flex items-center gap-2">
                <Award className="w-5 h-5 text-amber-500" />
                Trumpet Fingering Practice Quiz
              </DialogTitle>
              <Badge variant="outline" className="text-xs font-mono text-amber-400 border-amber-500/40">
                Score: {quizScore.correct} / {quizScore.total}
              </Badge>
            </div>
            <DialogDescription className="text-xs text-muted-foreground">
              Test your recall of valve fingerings for sacred Madeh repertoire.
            </DialogDescription>
          </DialogHeader>

          <div className="p-4 rounded-2xl bg-black/40 border border-amber-900/40 flex flex-col items-center text-center space-y-3">
            <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">
              What is the fingering for:
            </p>
            <div className="text-3xl font-serif font-black text-amber-400">
              {quizNote.sharpSpelling} / {quizNote.flatSpelling}
            </div>
            <p className="text-[11px] text-muted-foreground font-mono">
              Octave: {quizNote.octaveGroup} • Dohad: {quizNote.dohadCode}
            </p>

            {/* Interactive Valves for Quiz Input */}
            <div className="flex items-center justify-center gap-4 py-2">
              {[1, 2, 3].map(valveNum => {
                const isSelected = quizSelectedValves.includes(valveNum);
                return (
                  <button
                    key={valveNum}
                    type="button"
                    onClick={() => {
                      if (isSelected) {
                        setQuizSelectedValves(prev => prev.filter(v => v !== valveNum));
                      } else {
                        setQuizSelectedValves(prev => [...prev, valveNum].sort());
                      }
                    }}
                    className={`w-12 h-16 rounded-xl border-2 flex flex-col items-center justify-center font-serif font-black text-base transition-all cursor-pointer shadow-md ${
                      isSelected
                        ? 'border-amber-400 bg-amber-500 text-black ring-2 ring-amber-400/40'
                        : 'border-zinc-600 bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                    }`}
                  >
                    <span>{valveNum}</span>
                    <span className="text-[9px] font-sans font-normal mt-0.5">
                      {isSelected ? 'DOWN' : 'UP'}
                    </span>
                  </button>
                );
              })}
            </div>

            <p className="text-[10px] text-muted-foreground">
              Leave all valves UP for Open (0) fingering.
            </p>

            {/* Submit & Next Buttons */}
            <div className="flex items-center gap-2 pt-2 w-full max-w-xs">
              <Button
                type="button"
                onClick={handleCheckQuizAnswer}
                className="flex-1 bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs"
              >
                Submit Answer
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={setupNewQuizNote}
                className="text-xs"
              >
                <RefreshCw className="w-3.5 h-3.5 mr-1" /> Next
              </Button>
            </div>

            {/* Feedback callout */}
            {quizFeedback && (
              <div
                className={`p-2.5 rounded-xl border text-xs w-full max-w-xs flex items-center justify-center gap-2 font-semibold ${
                  quizFeedback === 'correct'
                    ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-400'
                    : 'border-rose-500/50 bg-rose-500/10 text-rose-400'
                }`}
              >
                {quizFeedback === 'correct' ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 shrink-0" /> Correct! Outstanding precision.
                  </>
                ) : (
                  <>
                    <XCircle className="w-4 h-4 shrink-0" /> Incorrect! Fingering is{' '}
                    {quizNote.valves.length ? quizNote.valves.join('-') : 'Open (0)'}.
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </Dialog>

      {/* ------------------------------------------------------------- */}
      {/* MODAL 4: REFERENCE PITCH PIPE / TUNER (Disc Icon) */}
      {/* ------------------------------------------------------------- */}
      <Dialog open={isTunerModalOpen} onOpenChange={setIsTunerModalOpen}>
        <div className="space-y-4">
          <DialogHeader>
            <DialogTitle className="text-xl font-serif font-black text-foreground flex items-center gap-2">
              <Disc className="w-5 h-5 text-amber-500" />
              Reference Pitch Pipe &amp; Drone
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Tune your trumpet before rehearsal with standard reference tones.
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-2 text-xs">
            {[
              { label: 'Concert Bb4 (466.16 Hz)', note: 'Trumpet High C5', freq: 466.16 },
              { label: 'Concert A4 (440.0 Hz)', note: 'Trumpet B4', freq: 440.0 },
              { label: 'Concert F4 (349.23 Hz)', note: 'Trumpet G4', freq: 349.23 },
              { label: 'Concert Bb3 (233.08 Hz)', note: 'Trumpet Low C4', freq: 233.08 },
            ].map(pitch => (
              <button
                key={pitch.label}
                type="button"
                onClick={() => playTrumpetTone(pitch.freq, 2.5)}
                className="p-3 rounded-xl border border-amber-900/50 bg-black/40 hover:bg-amber-900/40 text-left transition-all cursor-pointer shadow-sm group"
              >
                <p className="font-bold text-amber-400 group-hover:text-amber-300">{pitch.label}</p>
                <p className="text-[10px] text-muted-foreground">{pitch.note}</p>
                <div className="mt-2 text-[10px] font-semibold text-emerald-400 flex items-center gap-1">
                  <Play className="w-3 h-3 fill-current" /> Play 2.5s Tone
                </div>
              </button>
            ))}
          </div>
        </div>
      </Dialog>

      {/* ------------------------------------------------------------- */}
      {/* MODAL 5: REPERTOIRE TUNES FINGERINGS (Songbook Icon) */}
      {/* ------------------------------------------------------------- */}
      <Dialog open={isRepertoireModalOpen} onOpenChange={setIsRepertoireModalOpen}>
        <div className="space-y-4">
          <DialogHeader>
            <DialogTitle className="text-xl font-serif font-black text-foreground flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-amber-500" />
              Sacred Madeh Scale Fingerings
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Pre-mapped valve sequences for standard Taheri Scout Band scales and processions.
            </DialogDescription>
          </DialogHeader>

          <div className="max-h-[60vh] overflow-y-auto space-y-2.5 text-xs">
            <div className="p-3 rounded-xl border border-border bg-card/60">
              <h5 className="font-bold text-foreground mb-1">C Major Repertoire Scale</h5>
              <p className="font-mono text-amber-400 text-xs">
                C4 (0) &bull; D4 (1/3) &bull; E4 (1/2) &bull; F4 (1) &bull; G4 (0) &bull; A4 (1/2) &bull; B4 (2) &bull; C5 (0)
              </p>
            </div>

            <div className="p-3 rounded-xl border border-border bg-card/60">
              <h5 className="font-bold text-foreground mb-1">Dohad Cadence Accidental Scale</h5>
              <p className="font-mono text-amber-400 text-xs">
                C#4 (1/2) &bull; D#4 (2) &bull; F#4 (2) &bull; G#4 (2/3) &bull; A#4 (1)
              </p>
            </div>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
