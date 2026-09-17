'use client';

import React, { useState } from 'react';
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { FileSpreadsheet, Upload, Download, CheckCircle2, AlertCircle } from 'lucide-react';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function ExcelImportExportModal({ open, onOpenChange, onSuccess }: Props) {
  const [fileType, setFileType] = useState<'members' | 'tunes'>('members');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [status, setStatus] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) return;

    setIsUploading(true);
    setStatus(null);

    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('type', fileType);

    try {
      const res = await fetch('/api/excel/parse', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();

      if (res.ok) {
        setStatus({
          text: data.message || `Successfully processed ${data.importedCount} rows!`,
          type: 'success',
        });
        setSelectedFile(null);
        if (onSuccess) onSuccess();
      } else {
        setStatus({ text: data.error || 'Failed to process file', type: 'error' });
      }
    } catch (err) {
      setStatus({ text: 'Network or server error during upload.', type: 'error' });
    } finally {
      setIsUploading(false);
    }
  };

  const downloadSampleTemplate = () => {
    const csvContent =
      fileType === 'members'
        ? 'Name,Email,Section,Role,Phone,Rank\nAli Asgar,aliasgar@taheriscout.org,Trumpet,Band Member / Player,+91 9820011223,1st Voice\nMustafa Bhai,mustafa@taheriscout.org,Saxophone,Saxophone Major,+91 9820022334,Section Major'
        : 'Title,Section,Key,Difficulty,Tempo\nChaman Tera Anthem,Trumpet,chaman_anthem,Intermediate,112 BPM\nSalwaat March Cadence,SideDrum,salwaat_cadence,Advanced,128 BPM';

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Taheri_Scout_${fileType}_template.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <FileSpreadsheet className="w-5 h-5 text-emerald-500" />
          Bulk Excel / Sheets Data Connector
        </DialogTitle>
        <DialogDescription>
          Import bulk band rosters and sheet music tune listings via spreadsheet.
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-4 text-xs">
        {/* Type Select */}
        <div className="flex items-center gap-2 p-1 bg-muted rounded-lg">
          <button
            type="button"
            onClick={() => setFileType('members')}
            className={`flex-1 py-1.5 rounded-md font-medium text-xs transition-colors ${
              fileType === 'members'
                ? 'bg-background text-foreground shadow-xs font-semibold'
                : 'text-muted-foreground'
            }`}
          >
            Band Member Roster
          </button>
          <button
            type="button"
            onClick={() => setFileType('tunes')}
            className={`flex-1 py-1.5 rounded-md font-medium text-xs transition-colors ${
              fileType === 'tunes'
                ? 'bg-background text-foreground shadow-xs font-semibold'
                : 'text-muted-foreground'
            }`}
          >
            Tune Catalog Notations
          </button>
        </div>

        {status && (
          <div
            className={`p-3 rounded-md text-xs font-medium border ${
              status.type === 'success'
                ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
                : 'bg-destructive/15 border-destructive/30 text-destructive'
            }`}
          >
            {status.text}
          </div>
        )}

        <form onSubmit={handleUpload} className="space-y-4">
          <div className="border-2 border-dashed border-border/80 rounded-xl p-6 text-center hover:border-primary/50 transition-colors">
            <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
            <p className="font-semibold text-foreground">Choose spreadsheet to upload</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">Supports .xlsx, .xls, and .csv files</p>
            <input
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={e => setSelectedFile(e.target.files?.[0] || null)}
              className="mt-3 text-xs"
              required
            />
            {selectedFile && (
              <p className="text-xs text-primary font-mono mt-2 font-semibold">
                Selected: {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)
              </p>
            )}
          </div>

          <div className="flex items-center justify-between pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={downloadSampleTemplate}
              className="text-xs gap-1"
            >
              <Download className="w-3.5 h-3.5 text-emerald-500" /> Download Template
            </Button>

            <Button
              type="submit"
              variant="gold"
              size="sm"
              disabled={!selectedFile || isUploading}
            >
              {isUploading ? 'Parsing & Importing...' : 'Import Spreadsheet'}
            </Button>
          </div>
        </form>
      </div>

      <DialogFooter>
        <Button variant="ghost" onClick={() => onOpenChange(false)}>
          Close
        </Button>
      </DialogFooter>
    </Dialog>
  );
}
