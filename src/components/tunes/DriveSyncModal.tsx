'use client';

import React, { useState } from 'react';
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DRIVE_SECTION_FOLDERS } from '@/lib/drive-service';
import { useSyncDriveSectionMutation } from '@/store/api/bandApi';
import { InstrumentSection, DriveFolderSyncResult } from '@/types/band';
import { CloudLightning, FolderSync, CheckCircle2, FileText, Sparkles } from 'lucide-react';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function DriveSyncModal({ open, onOpenChange, onSuccess }: Props) {
  const [syncDrive, { isLoading }] = useSyncDriveSectionMutation();
  const [selectedSection, setSelectedSection] = useState<InstrumentSection>('Trumpet');
  const [syncResult, setSyncResult] = useState<DriveFolderSyncResult | null>(null);

  const sections: InstrumentSection[] = ['Trumpet', 'Saxophone', 'Euphonium', 'Dish', 'SideDrum'];

  const handleSync = async () => {
    try {
      const res = await syncDrive({ section: selectedSection }).unwrap();
      setSyncResult(res.result);
      if (onSuccess) onSuccess();
    } catch (err) {
      console.error('Failed to sync section folder from Google Drive', err);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <CloudLightning className="w-5 h-5 text-amber-400" />
          Google Drive Instrument Folder Sync
        </DialogTitle>
        <DialogDescription>
          Synchronize designated section folders directly from Google Drive. Newly imported sheet music files automatically receive the prominent 15-day NEW badge.
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-4 text-xs">
        <div>
          <label className="font-semibold text-foreground mb-1 block">
            Select Section Folder to Synchronize
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {sections.map(s => {
              const folder = DRIVE_SECTION_FOLDERS[s];
              const isSelected = selectedSection === s;
              return (
                <div
                  key={s}
                  onClick={() => {
                    setSelectedSection(s);
                    setSyncResult(null);
                  }}
                  className={`p-3 rounded-lg border cursor-pointer transition-all ${
                    isSelected
                      ? 'border-amber-400 bg-amber-500/10 shadow-xs'
                      : 'border-border/70 hover:border-border hover:bg-muted/30'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-foreground">{s} Section</span>
                    <Badge variant="outline" className="text-[9px] py-0">
                      Cloud Sync
                    </Badge>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-1 truncate">
                    {folder.path}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {syncResult && (
          <div className="p-3 bg-emerald-500/15 border border-emerald-500/30 rounded-lg text-xs space-y-2">
            <div className="flex items-center gap-1.5 font-semibold text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
              <span>
                Synchronization Complete! {syncResult.newFilesAdded} new sheet music file(s) imported.
              </span>
            </div>
            <div className="space-y-1">
              {syncResult.files.map(f => (
                <div
                  key={f.id}
                  className="flex items-center justify-between bg-card/60 p-1.5 rounded text-[11px]"
                >
                  <span className="font-medium text-foreground truncate max-w-[240px]">
                    {f.name}
                  </span>
                  <Badge variant="new" className="text-[9px] py-0">
                    NEW TAG ACTIVE
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <DialogFooter className="gap-2">
        <Button variant="outline" onClick={() => onOpenChange(false)}>
          Close
        </Button>
        <Button variant="gold" onClick={handleSync} disabled={isLoading} className="gap-1.5">
          <FolderSync className="w-3.5 h-3.5" />
          {isLoading ? 'Scanning & Synchronizing...' : `Sync ${selectedSection} Folder`}
        </Button>
      </DialogFooter>
    </Dialog>
  );
}
