'use client';

import React, { useState, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '@/store';
import {
  useGetTunesQuery,
  useGetAssignedNotesQuery,
  useGetReferenceLinksQuery,
} from '@/store/api/bandApi';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatDate, getDaysRemainingForNewBadge } from '@/lib/utils';
import { SecuredNoteViewerModal } from '@/components/notes/SecuredNoteViewerModal';
import {
  UserCheck,
  Music,
  FileText,
  ShieldCheck,
  Lock,
  Eye,
} from 'lucide-react';

export function MemberPortal() {
  const currentUser = useSelector((state: RootState) => state.auth.user);
  const [selectedTuneForViewer, setSelectedTuneForViewer] = useState<any | null>(null);

  // Queries for catalog tunes, Excel Assign Notes sheet, and Reference Links
  const { data: tunesData, isLoading: isLoadingTunes } = useGetTunesQuery({ section: currentUser?.section });
  const { data: assignedNotesData, isLoading: isLoadingAssigned } = useGetAssignedNotesQuery();
  const { data: refLinksData, isLoading: isLoadingRefLinks } = useGetReferenceLinksQuery();

  const catalogTunes = tunesData?.tunes || [];
  const assignedRecords = assignedNotesData?.assignedNotes || [];
  const userAssignedTunes = assignedNotesData?.userAssignedTunes || [];
  const allRefLinks = refLinksData?.referenceLinks || [];

  // Match current member in Assign Notes sheet by ITS or Member Name
  const myAssignRecord = useMemo(() => {
    if (!currentUser) return null;
    return assignedRecords.find(
      (r: any) =>
        (currentUser.itsNumber && String(r.itsNumber).trim() === String(currentUser.itsNumber).trim()) ||
        (currentUser.name && String(r.memberName).toLowerCase().trim() === currentUser.name.toLowerCase().trim()) ||
        (currentUser.name && String(r.memberName).toLowerCase().includes(currentUser.name.toLowerCase()))
    );
  }, [assignedRecords, currentUser]);

  // Set of all tune titles / keys assigned to the current member
  const assignedTuneNames = useMemo(() => {
    const set = new Set<string>();
    if (myAssignRecord?.assignedTunes) {
      myAssignRecord.assignedTunes
        .split(',')
        .map((s: string) => s.trim().toLowerCase())
        .filter(Boolean)
        .forEach((name: string) => set.add(name));
    }
    userAssignedTunes.forEach((s: string) => {
      const trimmed = s.trim().toLowerCase();
      if (trimmed) set.add(trimmed);
    });
    return set;
  }, [myAssignRecord, userAssignedTunes]);

  // Unified list of ONLY scores assigned to this Member by Section Major
  const unifiedAssignedNotes = useMemo(() => {
    const list: any[] = [];
    const seenTitles = new Set<string>();

    // Strict Privacy: A score is ONLY assigned if it explicitly matches the member's assigned tunes from Assign Notes sheet
    if (assignedTuneNames.size === 0) {
      return [];
    }

    // 1. Catalog Tunes (from db/API) that match the member's assigned tunes from Assign Notes sheet
    catalogTunes.forEach(tune => {
      const titleLower = tune.title.trim().toLowerCase();
      const keyLower = tune.key ? tune.key.trim().toLowerCase() : '';
      const arabicLower = tune.arabicName ? tune.arabicName.trim().toLowerCase() : '';
      const isAssignedInSheet =
        assignedTuneNames.has(titleLower) ||
        (keyLower && assignedTuneNames.has(keyLower)) ||
        (arabicLower && assignedTuneNames.has(arabicLower));

      if (isAssignedInSheet) {
        seenTitles.add(titleLower);
        if (keyLower) seenTitles.add(keyLower);
        list.push({
          id: tune.id,
          title: tune.title,
          section: tune.section,
          pdfUrl: tune.pdfUrl,
          audioUrl: tune.audioUrl,
          difficulty: tune.difficulty || 'Intermediate',
          tempo: tune.tempo || '112 BPM',
          createdAt: tune.createdAt,
          isNew: tune.isNew,
        });
      }
    });

    // 2. Reference Link scores uploaded and assigned by Section Major
    allRefLinks.forEach(ref => {
      const refTitleLower = (ref.tuneName || '').trim().toLowerCase();
      if (!refTitleLower) return;

      if (assignedTuneNames.has(refTitleLower) && !seenTitles.has(refTitleLower)) {
        seenTitles.add(refTitleLower);
        list.push({
          id: ref.id || `ref-${ref.tuneName}`,
          title: ref.tuneName,
          section: ref.instrumentType || currentUser?.section || 'Trumpet',
          pdfUrl: ref.fileUrl,
          audioUrl: ref.youtubeLink,
          difficulty: 'Intermediate',
          tempo: 'Standard Scales',
          createdAt: ref.timestamp || ref.createdAt,
          isNew: true,
        });
      }
    });

    return list;
  }, [catalogTunes, allRefLinks, assignedTuneNames, currentUser]);

  const isLoading = isLoadingTunes || isLoadingAssigned || isLoadingRefLinks;

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-card via-card to-amber-500/10 border border-border p-6 rounded-xl relative overflow-hidden shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border border-primary/40 bg-primary/10 text-primary text-xs font-semibold mb-1">
              <UserCheck className="w-3.5 h-3.5" /> Scout Musician Portal
            </div>
            <h2 className="text-2xl sm:text-3xl font-serif font-black tracking-tight text-foreground">
              Welcome, {currentUser?.name || 'Scout Player'}
            </h2>
            <p className="text-xs text-muted-foreground mt-1">
              Section: <span className="font-semibold text-foreground">{currentUser?.section}</span> • Rank: {currentUser?.rank || 'Band Player'}
            </p>
          </div>

          {/* Quick Assigned Notes Count Pill */}
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">
                Assigned Scores
              </p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <Badge
                  variant="outline"
                  className="text-xs py-1 px-3 font-bold border-amber-500/40 text-amber-500 bg-amber-500/10"
                >
                  <Music className="w-3 h-3 mr-1 inline" />
                  {unifiedAssignedNotes.length} Assigned {unifiedAssignedNotes.length === 1 ? 'Score' : 'Scores'}
                </Badge>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Assigned Sheet Music & Tune Catalog with 15-day "NEW" badge logic */}
      <Card className="border border-border shadow-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <Music className="w-5 h-5 text-amber-400" />
                Your Stored Madeh Notes &amp; Section Repertoire
              </CardTitle>
              <CardDescription className="text-xs">
                Sacred Madeh scores assigned directly to you for Mola&apos;s Milad Mubarak processions and rehearsal drills.
              </CardDescription>
            </div>
            <Badge variant="outline" className="text-xs">
              {unifiedAssignedNotes.length} Stored Madeh {unifiedAssignedNotes.length === 1 ? 'Note' : 'Notes'}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="py-8 text-center text-muted-foreground text-xs">
              Loading your assigned sheet music...
            </div>
          ) : unifiedAssignedNotes.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground text-xs space-y-2">
              <Music className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
              <p className="font-semibold text-foreground text-sm">No Sheet Music Currently Assigned</p>
              <p>You currently do not have any notes assigned by your Section Major. Check back after your next practice session!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {unifiedAssignedNotes.map(tune => {
                const daysRemaining = tune.createdAt ? getDaysRemainingForNewBadge(tune.createdAt) : 0;
                const isNew = tune.isNew !== undefined ? tune.isNew : daysRemaining > 0;

                return (
                  <div
                    key={tune.id}
                    className="p-4 rounded-xl border border-border/70 bg-muted/15 hover:bg-muted/40 transition-all flex flex-col justify-between group space-y-3"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="font-serif font-bold text-sm text-foreground group-hover:text-primary transition-colors">
                          {tune.title}
                        </h4>
                        {isNew && daysRemaining > 0 && (
                          <Badge variant="new" className="shrink-0">
                            NEW ({daysRemaining}D)
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-muted-foreground mt-1 font-mono">
                        <span>{tune.section}</span>
                        <span>• {tune.difficulty || 'Intermediate'}</span>
                        <span>• {tune.tempo || '112 BPM'}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-border/40 text-xs">
                      <span className="text-[10px] text-muted-foreground">
                        {tune.createdAt ? `Added ${formatDate(tune.createdAt)}` : 'Assigned Score'}
                      </span>
                      {tune.pdfUrl ? (
                        <Button
                          size="sm"
                          onClick={() => setSelectedTuneForViewer(tune)}
                          className="inline-flex items-center gap-1.5 px-3 py-1 h-8 rounded-lg bg-primary text-primary-foreground text-xs font-semibold shadow-xs hover:opacity-90 transition-opacity cursor-pointer"
                        >
                          <ShieldCheck className="w-3.5 h-3.5" />
                          <span>View Notes PDF</span>
                          <span className="text-[9px] bg-black/25 px-1 py-0.5 rounded font-mono font-normal">
                            Protected
                          </span>
                        </Button>
                      ) : (
                        <span className="text-[10px] text-muted-foreground italic">
                          PDF Score Pending
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Secured In-App View-Only Modal with Phone Screenshot Restrictions */}
      <SecuredNoteViewerModal
        isOpen={!!selectedTuneForViewer}
        onClose={() => setSelectedTuneForViewer(null)}
        tune={selectedTuneForViewer}
        member={currentUser}
      />
    </div>
  );
}
