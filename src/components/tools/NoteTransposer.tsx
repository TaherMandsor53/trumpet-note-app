'use client';

import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import jsPDF from 'jspdf';
import { Music, Download, FileText, Sparkles, RefreshCw } from 'lucide-react';

const HIGHER_NOTES_MAP: Record<string, string> = {
  C: '1',
  'C#': '2',
  Db: '2',
  D: '0',
  'D#': '1',
  Eb: '1',
  E: '2',
  F: '0',
  'F#': '1',
  Gb: '1',
  G: '1/2',
  'G#': '1',
  Ab: '1',
  A: '2',
  'A#': '0',
  Bb: '0',
  B: '1/2',
};

export function NoteTransposer() {
  const [notations, setNotations] = useState('C D E F G A B C\nC# D# F# G# A#\nDb Eb Gb Ab Bb');
  const [noteType, setNoteType] = useState('1');
  const [baseType, setBaseType] = useState('1');
  const [instrumentType, setInstrumentType] = useState('1');

  const [finalConversion, setFinalConversion] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleConvert = (e: React.FormEvent) => {
    e.preventDefault();

    const placeholder = ' __NEWLINE__ ';
    const strWithPlaceholder = notations.replace(/\n/g, placeholder);
    const semitoneValue = strWithPlaceholder
      .split(' ')
      .map(note => HIGHER_NOTES_MAP[note.trim()] || (note.includes('__NEWLINE__') ? placeholder : note))
      .join('_');

    const finalStr = semitoneValue
      .replace(/ /g, placeholder)
      .replace(new RegExp(placeholder, 'g'), '\n')
      .replace(/__NEWLINE__/g, ' ')
      .replace(/_/g, ' ');

    setFinalConversion(finalStr);
    setIsModalOpen(true);
  };

  const handleDownloadPDF = () => {
    const doc = new jsPDF();
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.text('Taheri Scout Band Group - Transposed Instrument Notations', 14, 20);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    doc.text(`Target Instrument: ${instrumentType === '1' ? 'Trumpet (Bb)' : 'Saxophone (Eb/Bb)'}`, 14, 28);
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 34);

    doc.setFont('courier', 'bold');
    doc.setFontSize(14);
    const lines = doc.splitTextToSize(finalConversion, 180);
    doc.text(lines, 14, 46);

    doc.save('Taheri_Scout_Transposed_Notes.pdf');
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <Card className="border border-border shadow-md">
        <CardHeader>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border border-amber-500/40 bg-amber-500/10 text-amber-300 text-xs font-semibold mb-1">
            <Music className="w-3.5 h-3.5 text-[#D97736]" /> Madeh Composition &amp; Transposition
          </div>
          <CardTitle className="text-xl font-serif font-black">
            Compose &amp; Transpose Madeh Notes
          </CardTitle>
          <CardDescription className="text-xs">
            Compose and convert standard Madeh melodies into trumpet and brass valve fingerings (e.g. 1 0 2 0) for Milad Mubarak processions and generate printable score PDFs.
          </CardDescription>
        </CardHeader>

        <form onSubmit={handleConvert}>
          <CardContent className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="font-medium text-muted-foreground mb-1 block">Conversion Mode</label>
                <Select value={noteType} onChange={e => setNoteType(e.target.value)}>
                  <option value="1">Alphabets (C D E) → Numerical (1 0 2)</option>
                </Select>
              </div>

              <div>
                <label className="font-medium text-muted-foreground mb-1 block">Target Instrument</label>
                <Select value={instrumentType} onChange={e => setInstrumentType(e.target.value)}>
                  <option value="1">Piano → Trumpet (Bb)</option>
                  <option value="2">Piano → E-flat Alto Saxophone</option>
                  <option value="3">Piano → B-flat Tenor Saxophone</option>
                  <option value="4">Piano → E-flat Baritone Saxophone</option>
                </Select>
              </div>

              <div>
                <label className="font-medium text-muted-foreground mb-1 block">Sound Base Octave</label>
                <Select value={baseType} onChange={e => setBaseType(e.target.value)}>
                  <option value="1">C5 → C6 (Higher Base)</option>
                  <option value="2">C4 → C5 (Lower Base)</option>
                </Select>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="font-medium text-muted-foreground">
                  Input Musical Notations (Space-separated chords/melodies)
                </label>
                <button
                  type="button"
                  onClick={() => setNotations('C D E F G A B C')}
                  className="text-[10px] text-primary hover:underline"
                >
                  Load Scale
                </button>
              </div>
              <textarea
                rows={6}
                value={notations}
                onChange={e => setNotations(e.target.value)}
                placeholder="Enter notes: C D E F G A B..."
                className="w-full rounded-md border border-input bg-transparent p-3 text-sm font-mono focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                required
              />
            </div>
          </CardContent>

          <CardFooter className="flex justify-end gap-2 border-t pt-4">
            <Button type="submit" variant="gold" className="gap-2 text-xs">
              <RefreshCw className="w-3.5 h-3.5" /> Transpose & Preview PDF
            </Button>
          </CardFooter>
        </form>
      </Card>

      {/* Preview Dialog */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogHeader>
          <DialogTitle>Transposed Brass Valve Fingerings</DialogTitle>
          <DialogDescription>
            Converted numeric valve patterns for your target instrument.
          </DialogDescription>
        </DialogHeader>

        <div className="p-4 rounded-lg border bg-muted/30 font-mono text-sm leading-relaxed whitespace-pre-wrap max-h-64 overflow-y-auto">
          {finalConversion}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => setIsModalOpen(false)}>
            Close
          </Button>
          <Button variant="gold" onClick={handleDownloadPDF} className="gap-1.5">
            <Download className="w-4 h-4" /> Download PDF Sheet
          </Button>
        </DialogFooter>
      </Dialog>
    </div>
  );
}
