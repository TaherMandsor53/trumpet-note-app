'use client';

import React, { useState, useRef } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/components/ui/toast';
import jsPDF from 'jspdf';
import {
  Music,
  Download,
  FileText,
  Sparkles,
  RefreshCw,
  Upload,
  Image as ImageIcon,
  CheckCircle2,
  Copy,
  FileUp,
  ArrowRightLeft,
  X,
  FileCode,
  BookOpen,
  Keyboard,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ==========================================
// IMAGE 2: TAHERI SCOUT GROUP DOHAD MAPPINGS
// ==========================================
// C major scale standard:
// 1  C   0
// 2  D   1/3      2b #1   1/2
// 3  E   1/2      3b #2   2
// 4  F   1        5b #4   2
// 5  G   0        6b #5   2/3
// 6  A   1/2      7b #6   1
// 7  B   2
// 8  C   0
//
// 1  Sa  0
// 2  Re  1/3
// 3  Ga  1/2
// 4  Ma  1
// 5  Pa  0
// 6  Dha 1/2
// 7  Ni  2
// 8  Sa  0

export const DOHAD_NOTE_TO_VALVES: Record<string, string> = {
  // Naturals
  C: '0',
  D: '1/3',
  E: '1/2',
  F: '1',
  G: '0',
  A: '1/2',
  B: '2',
  // Accidentals (Image 2: 2b #1 = 1/2, 3b #2 = 2, 5b #4 = 2, 6b #5 = 2/3, 7b #6 = 1)
  'C#': '1/2',
  DB: '1/2',
  Db: '1/2',
  '#1': '1/2',
  '2B': '1/2',
  '2b': '1/2',
  'D#': '2',
  EB: '2',
  Eb: '2',
  '#2': '2',
  '3B': '2',
  '3b': '2',
  'F#': '2',
  GB: '2',
  Gb: '2',
  '#4': '2',
  '5B': '2',
  '5b': '2',
  'G#': '2/3',
  AB: '2/3',
  Ab: '2/3',
  '#5': '2/3',
  '6B': '2/3',
  '6b': '2/3',
  'A#': '1',
  BB: '1',
  Bb: '1',
  '#6': '1',
  '7B': '1',
  '7b': '1',
  // Sargam equivalents from Image 2
  SA: '0',
  Sa: '0',
  RE: '1/3',
  Re: '1/3',
  GA: '1/2',
  Ga: '1/2',
  MA: '1',
  Ma: '1',
  PA: '0',
  Pa: '0',
  DHA: '1/2',
  Dha: '1/2',
  NI: '2',
  Ni: '2',
  // Scale Degrees
  '1': '0',
  '2': '1/3',
  '3': '1/2',
  '4': '1',
  '5': '0',
  '6': '1/2',
  '7': '2',
  '8': '0',
};

export const DOHAD_VALVES_TO_NOTES: Record<string, string> = {
  // Fingerings -> Standard Notes (Image 2)
  '0': 'C',
  '1/3': 'D',
  '1/2': 'E',
  '1': 'F',
  '2': 'B',
  '2/3': 'G#',
  // Accidentals from Image 2
  '#1': 'C#',
  '2b': 'Db',
  '2B': 'Db',
  '#2': 'D#',
  '3b': 'Eb',
  '3B': 'Eb',
  '#4': 'F#',
  '5b': 'Gb',
  '5B': 'Gb',
  '#5': 'G#',
  '6b': 'Ab',
  '6B': 'Ab',
  '#6': 'A#',
  '7b': 'Bb',
  '7B': 'Bb',
};

// Regex for intelligent note tokenization and auto-spacing
export function autoFormatNotes(input: string): string {
  if (!input) return '';
  const lines = input.split('\n');
  const formattedLines = lines.map(line => {
    if (!line.trim()) return '';
    // Tokenizer matching fractions, accidental degrees, sargam, notes with accidentals, or numbers
    const tokenRegex = /(?:\d+\/\d+|[#]\d+|\d+[bB#]|Dha|dha|Sa|sa|Re|re|Ga|ga|Ma|ma|Pa|pa|Ni|ni|[A-Ga-g][#bB]?|[0-8]|[A-Za-z]+|[^\s\w/]+)/g;
    const tokens = line.match(tokenRegex);
    if (!tokens) return line;
    return tokens.join(' ');
  });
  return formattedLines.join('\n');
}

export function NoteTransposer() {
  const { toast } = useToast();

  // Mode: 'type' or 'upload'
  const [inputMode, setInputMode] = useState<'type' | 'upload'>('type');

  // Conversion Target: 'to_number' (Alphabet -> Number) or 'to_alphabet' (Number -> Alphabet)
  const [conversionDirection, setConversionDirection] = useState<'to_number' | 'to_alphabet'>('to_number');

  // Instrument & Octave
  const [instrumentType, setInstrumentType] = useState('1'); // 1: Trumpet (Bb), 2: Alto Sax, 3: Tenor Sax, 4: Euphonium/Trombone
  const [baseOctave, setBaseOctave] = useState('1'); // 1: C5 -> C6 Higher, 2: C4 -> C5 Lower

  // Tune Metadata & Input State
  const [tuneTitle, setTuneTitle] = useState('Madeh Procession Melody');
  const [notations, setNotations] = useState('C D E F G A B C\nC# D# F# G# A#\nDb Eb Gb Ab Bb');
  const [autoSpaceEnabled, setAutoSpaceEnabled] = useState(true);

  // File Upload State
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [uploadedImagePreview, setUploadedImagePreview] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Conversion & Modal State
  const [transposedOutput, setTransposedOutput] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showScaleChart, setShowScaleChart] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-spacing input handler
  const handleNotationsChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const rawVal = e.target.value;

    if (!autoSpaceEnabled) {
      setNotations(rawVal);
      return;
    }

    // Check if the user is typing consecutive notes without spaces (e.g. "CD", "12", "C#D")
    const hasUnspacedNotes = /(?:[A-Ga-g][#bB]?|\d+\/\d+|\d+[bB#]|[0-8])([A-Ga-g]|\d)/i.test(rawVal);

    if (hasUnspacedNotes) {
      const formatted = autoFormatNotes(rawVal);
      setNotations(formatted);
    } else {
      setNotations(rawVal);
    }
  };

  // Explicit Auto-Space format button
  const handleAutoSpaceClick = () => {
    const formatted = autoFormatNotes(notations);
    setNotations(formatted);
    toast.success('Auto-Spaced', 'All notes, alphabets, and numbers have been formatted with spaces.');
  };

  // Quick Keypad append for mobile and tablet users
  const handleKeypadAppend = (token: string) => {
    setNotations(prev => {
      const clean = prev.trimEnd();
      return clean ? `${clean} ${token} ` : `${token} `;
    });
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  };

  // File Upload Handlers (Image or PDF)
  const handleFileSelect = (file: File) => {
    const isImage = file.type.startsWith('image/');
    const isPdf = file.type === 'application/pdf';

    if (!isImage && !isPdf) {
      toast.error('Unsupported File', 'Please upload a sheet music image (PNG/JPG) or PDF score.');
      return;
    }

    setUploadedFile(file);

    if (isImage) {
      const reader = new FileReader();
      reader.onload = e => {
        setUploadedImagePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
      toast.success('Score Image Loaded', `${file.name} ready for conversion into PDF score.`);
    } else {
      setUploadedImagePreview(null);
      toast.success('PDF Score Uploaded', `${file.name} ready for transcription and compilation.`);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleRemoveFile = () => {
    setUploadedFile(null);
    setUploadedImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Conversion Execution Logic based on Image 2
  const performConversion = (): string => {
    const lines = notations.split('\n');

    const convertedLines = lines.map(line => {
      if (!line.trim()) return '';

      // Tokenize line
      const tokenRegex = /(?:\d+\/\d+|[#]\d+|\d+[bB#]|Dha|dha|Sa|sa|Re|re|Ga|ga|Ma|ma|Pa|pa|Ni|ni|[A-Ga-g][#bB]?|[0-8]|[A-Za-z]+|[^\s\w/]+)/g;
      const tokens = line.match(tokenRegex) || line.split(/\s+/);

      const convertedTokens = tokens.map(token => {
        const clean = token.trim();
        if (!clean) return '';

        if (conversionDirection === 'to_number') {
          // Convert Note Alphabet / Sargam / Degree to Number (Valve Fingerings)
          const upper = clean.toUpperCase();
          if (DOHAD_NOTE_TO_VALVES[clean] !== undefined) {
            return DOHAD_NOTE_TO_VALVES[clean];
          }
          if (DOHAD_NOTE_TO_VALVES[upper] !== undefined) {
            return DOHAD_NOTE_TO_VALVES[upper];
          }
          return clean; // fallback if punctuation or unknown
        } else {
          // Convert Number / Valve Fingering / Degree to Note Alphabet
          if (DOHAD_VALVES_TO_NOTES[clean] !== undefined) {
            return DOHAD_VALVES_TO_NOTES[clean];
          }
          const upper = clean.toUpperCase();
          if (DOHAD_VALVES_TO_NOTES[upper] !== undefined) {
            return DOHAD_VALVES_TO_NOTES[upper];
          }
          return clean;
        }
      });

      return convertedTokens.filter(Boolean).join(' ');
    });

    return convertedLines.join('\n');
  };

  // Transpose button click handler
  const handleTranspose = (e: React.FormEvent) => {
    e.preventDefault();
    if (!notations.trim() && !uploadedFile) {
      toast.error('No Notes Entered', 'Please type notes or upload a sheet image/PDF to convert.');
      return;
    }

    const output = performConversion();
    setTransposedOutput(output);
    setIsModalOpen(true);
  };

  // Generate & Download PDF Score Sheet
  const handleDownloadPDF = () => {
    try {
      const doc = new jsPDF();
      const output = transposedOutput || performConversion();

      // Instrument label
      const instLabel =
        instrumentType === '1'
          ? 'Trumpet (Bb)'
          : instrumentType === '2'
          ? 'E-flat Alto Saxophone'
          : instrumentType === '3'
          ? 'B-flat Tenor Saxophone'
          : 'Euphonium / Trombone';

      const octaveLabel = baseOctave === '1' ? 'C5 → C6 (Higher Base)' : 'C4 → C5 (Lower Base)';
      const modeLabel =
        conversionDirection === 'to_number'
          ? 'Alphabets (C D E) → Brass Valve Fingerings (0, 1/3, 1/2)'
          : 'Numbers / Fingerings → Musical Note Alphabets (C D E)';

      // 1. Header & Title Banner
      doc.setFillColor(28, 23, 20); // Dark Scout Brown/Black
      doc.rect(0, 0, 210, 32, 'F');

      doc.setTextColor(245, 158, 11); // Gold
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(16);
      doc.text('TAHERI SCOUT BAND GROUP • DOHAD (EST. 1988)', 105, 14, { align: 'center' });

      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.text('Milad Mubarak & Procession Music Score Transposition Sheet', 105, 24, { align: 'center' });

      // 2. Metadata Box
      doc.setTextColor(20, 20, 20);
      doc.setFontSize(10);
      doc.setDrawColor(200, 200, 200);
      doc.setFillColor(250, 250, 250);
      doc.roundedRect(14, 38, 182, 28, 3, 3, 'FD');

      doc.setFont('helvetica', 'bold');
      doc.text(`Tune Title:`, 20, 46);
      doc.setFont('helvetica', 'normal');
      doc.text(tuneTitle || 'Madeh Procession Melody', 46, 46);

      doc.setFont('helvetica', 'bold');
      doc.text(`Instrument:`, 20, 54);
      doc.setFont('helvetica', 'normal');
      doc.text(instLabel, 46, 54);

      doc.setFont('helvetica', 'bold');
      doc.text(`Octave:`, 110, 46);
      doc.setFont('helvetica', 'normal');
      doc.text(octaveLabel, 128, 46);

      doc.setFont('helvetica', 'bold');
      doc.text(`Mode:`, 110, 54);
      doc.setFont('helvetica', 'normal');
      doc.text(conversionDirection === 'to_number' ? 'Alpha → Valve Numbers' : 'Numbers → Alpha Notes', 128, 54);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(100, 100, 100);
      doc.text(`Generated: ${new Date().toLocaleString()}`, 20, 62);

      // 3. Image 2 Reference Box: C Major Scale Fingering Guide
      doc.setDrawColor(217, 119, 54); // Accent border
      doc.setFillColor(254, 249, 242); // Warm parchment
      doc.roundedRect(14, 70, 182, 34, 2, 2, 'FD');

      doc.setTextColor(180, 83, 9);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.text('REFERENCE: TAHERI SCOUT DOHAD C MAJOR SCALE & VALVE FINGERINGS (IMAGE 2)', 20, 77);

      doc.setFont('courier', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(30, 30, 30);
      doc.text('C (Sa)  : 0    | D (Re)  : 1/3  | E (Ga)  : 1/2  | F (Ma)  : 1', 20, 84);
      doc.text('G (Pa)  : 0    | A (Dha) : 1/2  | B (Ni)  : 2    | High C  : 0', 20, 90);
      doc.text('Accidentals: C#/Db [#1/2b]: 1/2 | D#/Eb [#2/3b]: 2 | F#/Gb [#4/5b]: 2 | G#/Ab [#5/6b]: 2/3 | A#/Bb [#6/7b]: 1', 20, 96);

      // 4. Converted Notations Box
      let currentY = 112;

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(20, 20, 20);
      doc.text(
        conversionDirection === 'to_number'
          ? 'Transposed Brass Valve Fingerings (Numbers):'
          : 'Transposed Note Alphabets (C D E):',
        14,
        currentY
      );

      currentY += 6;
      doc.setFont('courier', 'bold');
      doc.setFontSize(12);
      doc.setTextColor(217, 80, 0); // Orange-amber bold notation font

      const outputLines = doc.splitTextToSize(output, 182);
      doc.text(outputLines, 14, currentY);

      currentY += outputLines.length * 6 + 12;

      // 5. Original Notes Box
      if (notations.trim()) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.setTextColor(60, 60, 60);
        doc.text('Original Notations / Input:', 14, currentY);

        currentY += 5;
        doc.setFont('courier', 'normal');
        doc.setFontSize(9.5);
        doc.setTextColor(80, 80, 80);
        const originalLines = doc.splitTextToSize(notations, 182);
        doc.text(originalLines, 14, currentY);
        currentY += originalLines.length * 5 + 10;
      }

      // 6. If user uploaded an image, embed it into the PDF (or on a second page if needed)
      if (uploadedImagePreview) {
        if (currentY > 180) {
          doc.addPage();
          currentY = 20;
        }

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.setTextColor(20, 20, 20);
        doc.text(`Attached Sheet Music Score (${uploadedFile?.name || 'Image Score'}):`, 14, currentY);
        currentY += 8;

        try {
          doc.addImage(uploadedImagePreview, 'JPEG', 14, currentY, 182, 85);
        } catch (imgErr) {
          console.warn('Could not embed image in PDF:', imgErr);
        }
      }

      // 7. Footer
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(8);
      doc.setTextColor(140, 140, 140);
      doc.text(
        'Taheri Scout Band Group Dohad • Band Members Portal • Official Madeh Score',
        105,
        288,
        { align: 'center' }
      );

      const fileName = `${(tuneTitle || 'Taheri_Scout_Score')
        .replace(/[^a-zA-Z0-9]/g, '_')}_Notes.pdf`;
      doc.save(fileName);

      toast.success('PDF Downloaded', `Successfully generated score PDF: ${fileName}`);
    } catch (err: any) {
      toast.error('PDF Generation Failed', err?.message || 'Could not compile score PDF.');
    }
  };

  // Copy to clipboard
  const handleCopyNotations = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied', 'Transposed notations copied to clipboard.');
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Top Header */}
      <Card className="border border-border/80 shadow-md bg-card">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between flex-wrap gap-2 mb-1">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border border-amber-500/40 bg-amber-500/10 text-amber-300 text-xs font-semibold">
              <Music className="w-3.5 h-3.5 text-[#D97736]" /> Madeh Composition &amp; Transposition
            </div>

            {/* Toggle Image 2 C Major Scale Reference Chart */}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowScaleChart(prev => !prev)}
              className="gap-1.5 text-xs text-amber-400 border-amber-500/40 hover:bg-amber-500/10 cursor-pointer h-7"
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>{showScaleChart ? 'Hide Dohad Scale' : 'View Dohad Scale (Image 2)'}</span>
              {showScaleChart ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </Button>
          </div>

          <CardTitle className="text-xl sm:text-2xl font-serif font-black text-foreground">
            Compose &amp; Transpose Madeh Notes
          </CardTitle>
          <CardDescription className="text-xs text-muted-foreground">
            Convert Madeh melodies between note alphabets (C D E) and brass valve fingerings (0, 1/3, 1/2) using the official Taheri Scout Group Dohad scale. Type with auto-spacing or upload sheet music to convert into printable PDF scores.
          </CardDescription>
        </CardHeader>

        {/* Collapsible Image 2 Dohad Scale Reference Card */}
        {showScaleChart && (
          <div className="px-6 pb-4">
            <div className="p-3.5 rounded-xl border border-amber-500/30 bg-amber-500/5 text-xs">
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold text-amber-300 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" /> C Major Scale &amp; Valve Fingerings (Taheri Scout Group Dohad)
                </span>
                <Badge variant="outline" className="text-[10px] text-amber-400 border-amber-500/30">
                  Image 2 Standard
                </Badge>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono text-[11px]">
                <div className="p-2 rounded bg-black/30 border border-white/5">
                  <p className="text-muted-foreground text-[10px] uppercase">Degree &bull; Note &bull; Valve</p>
                  <p className="font-bold text-foreground">1 &bull; C (Sa) &bull; <span className="text-[#D97736]">0</span></p>
                  <p className="font-bold text-foreground">2 &bull; D (Re) &bull; <span className="text-[#D97736]">1/3</span></p>
                </div>
                <div className="p-2 rounded bg-black/30 border border-white/5">
                  <p className="text-muted-foreground text-[10px] uppercase">Degree &bull; Note &bull; Valve</p>
                  <p className="font-bold text-foreground">3 &bull; E (Ga) &bull; <span className="text-[#D97736]">1/2</span></p>
                  <p className="font-bold text-foreground">4 &bull; F (Ma) &bull; <span className="text-[#D97736]">1</span></p>
                </div>
                <div className="p-2 rounded bg-black/30 border border-white/5">
                  <p className="text-muted-foreground text-[10px] uppercase">Degree &bull; Note &bull; Valve</p>
                  <p className="font-bold text-foreground">5 &bull; G (Pa) &bull; <span className="text-[#D97736]">0</span></p>
                  <p className="font-bold text-foreground">6 &bull; A (Dha) &bull; <span className="text-[#D97736]">1/2</span></p>
                </div>
                <div className="p-2 rounded bg-black/30 border border-white/5">
                  <p className="text-muted-foreground text-[10px] uppercase">Degree &bull; Note &bull; Valve</p>
                  <p className="font-bold text-foreground">7 &bull; B (Ni) &bull; <span className="text-[#D97736]">2</span></p>
                  <p className="font-bold text-foreground">8 &bull; C (Sa) &bull; <span className="text-[#D97736]">0</span></p>
                </div>
              </div>

              {/* Accidentals Row */}
              <div className="mt-2 pt-2 border-t border-amber-500/20 text-[10px] font-mono text-muted-foreground flex flex-wrap gap-x-4 gap-y-1">
                <span><strong className="text-foreground">2b / #1 (C#/Db):</strong> <span className="text-amber-400">1/2</span></span>
                <span><strong className="text-foreground">3b / #2 (D#/Eb):</strong> <span className="text-amber-400">2</span></span>
                <span><strong className="text-foreground">5b / #4 (F#/Gb):</strong> <span className="text-amber-400">2</span></span>
                <span><strong className="text-foreground">6b / #5 (G#/Ab):</strong> <span className="text-amber-400">2/3</span></span>
                <span><strong className="text-foreground">7b / #6 (A#/Bb):</strong> <span className="text-amber-400">1</span></span>
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleTranspose}>
          <CardContent className="space-y-4 text-xs">
            {/* 1. View Switcher Tabs: Type Notes vs Upload File (Image / PDF) */}
            <div className="flex items-center gap-2 p-1 bg-muted/40 rounded-xl border border-border/80">
              <button
                type="button"
                onClick={() => setInputMode('type')}
                className={cn(
                  'flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer',
                  inputMode === 'type'
                    ? 'bg-[#D97736] text-white shadow-sm'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
                )}
              >
                <Keyboard className="w-3.5 h-3.5" />
                <span>Type Notes (Auto-Spacing)</span>
              </button>

              <button
                type="button"
                onClick={() => setInputMode('upload')}
                className={cn(
                  'flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer',
                  inputMode === 'upload'
                    ? 'bg-[#D97736] text-white shadow-sm'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
                )}
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Upload File (Image / PDF)</span>
              </button>
            </div>

            {/* 2. Primary Configuration: Conversion Direction, Target Instrument, Base Octave */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
              {/* Conversion Direction Option */}
              <div>
                <label className="font-bold text-foreground mb-1 block flex items-center justify-between">
                  <span>Conversion Direction</span>
                  <ArrowRightLeft className="w-3 h-3 text-[#D97736]" />
                </label>
                <Select
                  value={conversionDirection}
                  onChange={e => setConversionDirection(e.target.value as any)}
                  className="h-9 text-xs"
                >
                  <option value="to_number">Alphabet (C D E) → Number (0 1/3 1/2)</option>
                  <option value="to_alphabet">Number (0 1/3 1/2) → Alphabet (C D E)</option>
                </Select>
              </div>

              {/* Target Instrument */}
              <div>
                <label className="font-bold text-foreground mb-1 block">Target Instrument</label>
                <Select
                  value={instrumentType}
                  onChange={e => setInstrumentType(e.target.value)}
                  className="h-9 text-xs"
                >
                  <option value="1">Piano → Trumpet (Bb)</option>
                  <option value="2">Piano → E-flat Alto Saxophone</option>
                  <option value="3">Piano → B-flat Tenor Saxophone</option>
                  <option value="4">Piano → Euphonium / Trombone</option>
                </Select>
              </div>

              {/* Base Octave */}
              <div>
                <label className="font-bold text-foreground mb-1 block">Sound Base Octave</label>
                <Select
                  value={baseOctave}
                  onChange={e => setBaseOctave(e.target.value)}
                  className="h-9 text-xs"
                >
                  <option value="1">C5 → C6 (Higher Base)</option>
                  <option value="2">C4 → C5 (Lower Base)</option>
                </Select>
              </div>
            </div>

            {/* Tune Title Input (for score naming & PDF generation) */}
            <div>
              <label className="font-medium text-muted-foreground mb-1 block">Tune / Composition Title</label>
              <Input
                type="text"
                value={tuneTitle}
                onChange={e => setTuneTitle(e.target.value)}
                placeholder="e.g. Burhanedin Chaman Tera, Ya Husain..."
                className="h-9 text-xs"
              />
            </div>

            {/* VIEW A: TYPE NOTES MODE */}
            {inputMode === 'type' && (
              <div className="space-y-2.5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <label className="font-bold text-foreground">
                      Input Musical Notations (Space-separated notes)
                    </label>
                    <Badge variant="outline" className="text-[10px] text-emerald-400 border-emerald-500/40">
                      Auto-Spacing Active
                    </Badge>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      type="button"
                      onClick={handleAutoSpaceClick}
                      className="text-[11px] font-semibold text-amber-400 hover:text-amber-300 flex items-center gap-1 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/30 cursor-pointer"
                    >
                      <Sparkles className="w-3 h-3 text-amber-400" />
                      <span>Format Spaces</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setNotations('C D E F G A B C')}
                      className="text-[11px] text-primary hover:underline cursor-pointer"
                    >
                      Scale Preset
                    </button>
                    <button
                      type="button"
                      onClick={() => setNotations('Sa Re Ga Ma Pa Dha Ni Sa')}
                      className="text-[11px] text-primary hover:underline cursor-pointer"
                    >
                      Sargam Preset
                    </button>
                  </div>
                </div>

                <div className="relative">
                  <textarea
                    ref={textareaRef}
                    rows={6}
                    value={notations}
                    onChange={handleNotationsChange}
                    placeholder={
                      conversionDirection === 'to_number'
                        ? 'Type or paste notes: C D E F G A B C or C# D# F# G# A# (auto-spaced)...'
                        : 'Type or paste valve numbers: 0 1/3 1/2 1 0 1/2 2 0...'
                    }
                    className="w-full rounded-xl border border-input bg-card/60 p-3.5 text-sm font-mono focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-amber-500 shadow-inner"
                    required={!uploadedFile}
                  />

                  {/* Auto-space indicator toggle */}
                  <div className="absolute bottom-2.5 right-3 flex items-center gap-2 bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-md border border-white/10 text-[10px] text-muted-foreground">
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={autoSpaceEnabled}
                        onChange={e => setAutoSpaceEnabled(e.target.checked)}
                        className="rounded accent-amber-500 cursor-pointer"
                      />
                      <span>Auto-space on typing</span>
                    </label>
                  </div>
                </div>

                {/* Touch Keypad for Mobile and Tablet Band Members */}
                <div className="p-3 rounded-xl border border-border/80 bg-muted/20 space-y-2">
                  <div className="flex items-center justify-between text-[11px] text-muted-foreground font-medium">
                    <span>Quick Touch Keypad (Auto-spaced on tap):</span>
                    <span className="text-[10px] text-amber-400 font-mono">Mobile Friendly</span>
                  </div>

                  {/* Row 1: Naturals */}
                  <div className="flex flex-wrap gap-1.5">
                    {['C', 'D', 'E', 'F', 'G', 'A', 'B'].map(note => (
                      <button
                        key={note}
                        type="button"
                        onClick={() => handleKeypadAppend(note)}
                        className="flex-1 min-w-[38px] py-1.5 px-2 rounded-lg bg-card border border-border text-foreground font-mono font-bold text-xs hover:border-amber-500 hover:bg-amber-500/10 active:scale-95 transition-all cursor-pointer"
                      >
                        {note}
                      </button>
                    ))}
                  </div>

                  {/* Row 2: Sharps & Flats */}
                  <div className="flex flex-wrap gap-1.5">
                    {['C#', 'D#', 'F#', 'G#', 'A#', 'Db', 'Eb', 'Gb', 'Ab', 'Bb'].map(acc => (
                      <button
                        key={acc}
                        type="button"
                        onClick={() => handleKeypadAppend(acc)}
                        className="flex-1 min-w-[34px] py-1 px-1.5 rounded-lg bg-card/70 border border-border/70 text-amber-300 font-mono text-[11px] hover:border-amber-500 hover:bg-amber-500/10 active:scale-95 transition-all cursor-pointer"
                      >
                        {acc}
                      </button>
                    ))}
                  </div>

                  {/* Row 3: Fingerings & Sargam */}
                  <div className="flex flex-wrap gap-1.5">
                    {['0', '1/3', '1/2', '1', '2', '2/3'].map(val => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => handleKeypadAppend(val)}
                        className="py-1 px-2.5 rounded-lg bg-[#D97736]/15 border border-[#D97736]/40 text-[#D97736] font-mono font-bold text-[11px] hover:bg-[#D97736]/25 active:scale-95 transition-all cursor-pointer"
                      >
                        {val}
                      </button>
                    ))}

                    {['Sa', 'Re', 'Ga', 'Ma', 'Pa', 'Dha', 'Ni'].map(sarg => (
                      <button
                        key={sarg}
                        type="button"
                        onClick={() => handleKeypadAppend(sarg)}
                        className="py-1 px-2 rounded-lg bg-card border border-border/60 text-muted-foreground font-mono text-[10px] hover:text-foreground active:scale-95 transition-all cursor-pointer"
                      >
                        {sarg}
                      </button>
                    ))}

                    <button
                      type="button"
                      onClick={() => setNotations('')}
                      className="py-1 px-2 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 font-mono text-[10px] hover:bg-rose-500/20 active:scale-95 transition-all cursor-pointer ml-auto"
                    >
                      Clear
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* VIEW B: UPLOAD FILE (IMAGE / PDF) MODE */}
            {inputMode === 'upload' && (
              <div className="space-y-3.5">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/jpg,image/webp,application/pdf"
                  onChange={e => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
                  className="hidden"
                />

                {/* Drag and Drop Zone */}
                {!uploadedFile ? (
                  <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={cn(
                      'border-2 border-dashed rounded-2xl p-6 sm:p-8 text-center cursor-pointer transition-all',
                      isDragging
                        ? 'border-amber-500 bg-amber-500/10 scale-[1.01]'
                        : 'border-border/80 hover:border-amber-500/60 hover:bg-muted/20 bg-card/40'
                    )}
                  >
                    <div className="w-12 h-12 rounded-full bg-amber-500/15 border border-amber-500/30 flex items-center justify-center mx-auto mb-3 text-[#D97736]">
                      <FileUp className="w-6 h-6" />
                    </div>
                    <h5 className="font-bold text-sm text-foreground mb-1">
                      Upload Sheet Music Image or PDF
                    </h5>
                    <p className="text-xs text-muted-foreground max-w-sm mx-auto mb-3">
                      Drag and drop your scanned score photo (PNG/JPG) or score document (PDF).
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="gap-2 text-xs border-amber-500/40 text-amber-300"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>Choose File</span>
                    </Button>
                  </div>
                ) : (
                  /* File Uploaded Preview Card */
                  <div className="p-4 rounded-xl border border-amber-500/40 bg-card shadow-sm space-y-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="p-2.5 rounded-lg bg-amber-500/15 border border-amber-500/30 text-[#D97736] shrink-0">
                          {uploadedFile.type.startsWith('image/') ? (
                            <ImageIcon className="w-5 h-5" />
                          ) : (
                            <FileText className="w-5 h-5" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-xs text-foreground truncate">{uploadedFile.name}</p>
                          <p className="text-[11px] text-muted-foreground font-mono">
                            {(uploadedFile.size / 1024).toFixed(1)} KB &bull;{' '}
                            {uploadedFile.type.startsWith('image/') ? 'Image Score' : 'PDF Score'}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={handleRemoveFile}
                          className="h-8 px-2 text-muted-foreground hover:text-rose-400"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>

                    {/* Image Preview Thumbnail */}
                    {uploadedImagePreview && (
                      <div className="relative rounded-lg overflow-hidden border border-border/80 bg-black/40 max-h-48 flex items-center justify-center p-2">
                        <img
                          src={uploadedImagePreview}
                          alt="Uploaded Score"
                          className="max-h-44 object-contain rounded"
                        />
                      </div>
                    )}

                    {/* Accompanying Notes for the uploaded file */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="font-medium text-muted-foreground text-[11px]">
                          Musical Notations for this score (Type or edit below with auto-spacing):
                        </label>
                        <button
                          type="button"
                          onClick={handleAutoSpaceClick}
                          className="text-[10px] text-amber-400 hover:underline cursor-pointer"
                        >
                          Auto-Space Format
                        </button>
                      </div>
                      <textarea
                        rows={3}
                        value={notations}
                        onChange={handleNotationsChange}
                        placeholder="Transcribe or enter notes: C D E F G A B..."
                        className="w-full rounded-lg border border-input bg-card/60 p-2.5 text-xs font-mono focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-amber-500"
                      />
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>

          {/* Card Footer Actions */}
          <CardFooter className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-t pt-4">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
              <span>Dohad Band valve mapping: 0, 1/3, 1/2, 1, 2, 2/3</span>
            </div>

            <div className="flex items-center gap-2">
              <Button
                type="submit"
                variant="havenly"
                className="gap-2 text-xs font-bold shadow-warm-glow cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Transpose &amp; Preview</span>
              </Button>

              <Button
                type="button"
                variant="gold"
                onClick={handleDownloadPDF}
                className="gap-2 text-xs font-bold cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Convert into PDF</span>
              </Button>
            </div>
          </CardFooter>
        </form>
      </Card>

      {/* Preview Dialog Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <div className="space-y-4">
          <DialogHeader>
            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border border-amber-500/40 bg-amber-500/10 text-amber-300 text-[11px] font-semibold mb-1 w-fit">
              <Music className="w-3 h-3 text-[#D97736]" /> Taheri Scout Group Dohad Standard
            </div>
            <DialogTitle className="text-lg font-serif font-black text-foreground">
              {conversionDirection === 'to_number'
                ? 'Transposed Brass Valve Fingerings'
                : 'Transposed Note Alphabets'}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Score converted based on the official Dohad C Major Scale chart (Image 2). Ready to copy or export into printable PDF.
            </DialogDescription>
          </DialogHeader>

          {/* Side by Side / Stacked Review */}
          <div className="space-y-3">
            <div>
              <div className="flex items-center justify-between mb-1 text-[11px] font-bold text-foreground">
                <span>
                  {conversionDirection === 'to_number'
                    ? 'Valve Fingerings (Numbers):'
                    : 'Note Alphabets (C D E):'}
                </span>
                <button
                  type="button"
                  onClick={() => handleCopyNotations(transposedOutput)}
                  className="text-amber-400 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <Copy className="w-3 h-3" />
                  <span>Copy</span>
                </button>
              </div>

              <div className="p-4 rounded-xl border border-amber-500/40 bg-[#16120e] font-mono text-sm leading-relaxed text-amber-200 whitespace-pre-wrap max-h-60 overflow-y-auto shadow-inner">
                {transposedOutput || 'No notes converted yet.'}
              </div>
            </div>

            {/* Original Comparison */}
            <div>
              <span className="text-[11px] font-medium text-muted-foreground block mb-1">
                Original Input Notations:
              </span>
              <div className="p-2.5 rounded-lg border border-border/80 bg-muted/20 font-mono text-xs text-muted-foreground whitespace-pre-wrap max-h-24 overflow-y-auto">
                {notations || 'None'}
              </div>
            </div>

            {/* Image Preview if uploaded */}
            {uploadedImagePreview && (
              <div className="pt-2 border-t border-border/50">
                <span className="text-[11px] font-medium text-muted-foreground block mb-1">
                  Attached Score Image:
                </span>
                <div className="rounded-lg overflow-hidden border border-border/80 max-h-32 bg-black/40 flex items-center justify-center p-1">
                  <img
                    src={uploadedImagePreview}
                    alt="Score preview"
                    className="max-h-28 object-contain rounded"
                  />
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2 sm:justify-between pt-2">
            <Button variant="outline" size="sm" onClick={() => setIsModalOpen(false)}>
              Close
            </Button>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleCopyNotations(transposedOutput)}
                className="gap-1.5 text-xs"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>Copy Notes</span>
              </Button>

              <Button
                variant="gold"
                size="sm"
                onClick={handleDownloadPDF}
                className="gap-1.5 text-xs font-bold"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download PDF Sheet</span>
              </Button>
            </div>
          </DialogFooter>
        </div>
      </Dialog>
    </div>
  );
}
