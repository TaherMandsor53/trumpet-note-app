'use client';

import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '@/store';
import {
  useGetUsersQuery,
  useCreateUserMutation,
  useUpdateUserMutation,
  useDeleteUserMutation,
  useGetTunesQuery,
  useAssignTuneMutation,
  useSyncDriveSectionMutation,
} from '@/store/api/bandApi';
import { getManagedSection, isOverallMajor, isInstrumentMajor, ALL_SECTIONS } from '@/lib/rbac';
import { InstrumentSection, User, Tune, Role } from '@/types/band';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { formatDate, getDaysRemainingForNewBadge, cn } from '@/lib/utils';
import { AttendanceMarker } from '@/components/attendance/AttendanceMarker';
import { AttendanceReports } from '@/components/attendance/AttendanceReports';
import { MemberModal } from '@/components/members/MemberModal';
import { useToast } from '@/components/ui/toast';
import {
  Users,
  Music,
  Plus,
  Trash2,
  Pencil,
  Share2,
  CloudLightning,
  FileText,
  Sparkles,
  Search,
  ExternalLink,
  Check,
  CalendarCheck,
  Crown,
} from 'lucide-react';

interface SectionWorkspaceProps {
  initialSection?: InstrumentSection;
}

export function SectionWorkspace({ initialSection }: SectionWorkspaceProps = {}) {
  const currentUser = useSelector((state: RootState) => state.auth.user);
  const activeRole = useSelector((state: RootState) => state.auth.activeRole);

  const role = currentUser?.role || activeRole;
  const isSuperAdmin = isOverallMajor(role);
  const managedSec = getManagedSection(role);

  const [selectedAdminSection, setSelectedAdminSection] = useState<InstrumentSection>(initialSection || 'Trumpet');

  // Sync if initialSection changes
  useEffect(() => {
    if (initialSection) {
      setSelectedAdminSection(initialSection);
    }
  }, [initialSection]);

  // Instrument Major is strictly locked to their managed section; Overall Major can oversee all
  const currentSection: InstrumentSection = isSuperAdmin
    ? selectedAdminSection
    : (managedSec || currentUser?.section || 'Trumpet');

  const { data: usersData, refetch: refetchUsers } = useGetUsersQuery({ section: currentSection });
  const { data: tunesData, refetch: refetchTunes } = useGetTunesQuery({ section: currentSection });

  const [createUser, { isLoading: isCreatingUser }] = useCreateUserMutation();
  const [deleteUser] = useDeleteUserMutation();
  const [assignTune, { isLoading: isAssigning }] = useAssignTuneMutation();
  const [syncDrive, { isLoading: isSyncingDrive }] = useSyncDriveSectionMutation();
  const { toast } = useToast();

  const canManageThisSection = isSuperAdmin || (managedSec !== null && managedSec === currentSection);

  const [isMemberModalOpen, setIsMemberModalOpen] = useState(false);
  const [selectedPlayerForEdit, setSelectedPlayerForEdit] = useState<User | null>(null);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [selectedTune, setSelectedTune] = useState<Tune | null>(null);
  const [assignedPlayerIds, setAssignedPlayerIds] = useState<string[]>([]);

  const [syncNotice, setSyncNotice] = useState<string | null>(null);
  const [activeSectionTab, setActiveSectionTab] = useState<'repertoire' | 'attendance'>('repertoire');

  // Exclude executive commanders / Majors who don't play as section instrument players
  const isExecutiveCommander = (u: User) => {
    if (isInstrumentMajor(u.role)) return false;
    return (
      u.role === 'Major' ||
      u.role === 'Overall Major' ||
      isOverallMajor(u.role) ||
      u.rank?.toLowerCase() === 'major' ||
      u.rank?.toLowerCase().includes('overall major') ||
      u.rank?.toLowerCase().includes('executive command') ||
      u.rank?.toLowerCase().includes('command overall major')
    );
  };

  // Sort section players: Instrument Major FIRST, then others alphabetically
  const sectionPlayers = (usersData?.users || [])
    .filter(u => u.section === currentSection && !isExecutiveCommander(u))
    .sort((a, b) => {
      const aIsMajor = isInstrumentMajor(a.role) || a.role === `${currentSection} Major`;
      const bIsMajor = isInstrumentMajor(b.role) || b.role === `${currentSection} Major`;
      if (aIsMajor && !bIsMajor) return -1;
      if (!aIsMajor && bIsMajor) return 1;
      return a.name.localeCompare(b.name);
    });
  const sectionTunes = (tunesData?.tunes || []).filter(t => t.section === currentSection);

  // Add/Edit is handled via MemberModal

  const handleDeletePlayer = async (id: string) => {
    if (confirm(`Remove this player from the ${currentSection} roster? This will sync with Google Sheets.`)) {
      try {
        await deleteUser(id).unwrap();
        toast.success(
          'Player Removed Successfully',
          `Musician has been removed from the ${currentSection} roster and synced to Google Sheets & local Excel.`
        );
        refetchUsers();
      } catch (err: any) {
        toast.error(
          'Removal Failed',
          err?.data?.error || err?.message || 'Failed to remove player.'
        );
      }
    }
  };

  const handleOpenAssignModal = (tune: Tune) => {
    setSelectedTune(tune);
    setAssignedPlayerIds(tune.assignedUserIds || []);
    setIsAssignModalOpen(true);
  };

  const togglePlayerAssignment = (userId: string) => {
    setAssignedPlayerIds(prev =>
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    );
  };

  const handleSaveAssignments = async () => {
    if (!selectedTune) return;
    try {
      await assignTune({
        tuneId: selectedTune.id,
        assignedUserIds: assignedPlayerIds,
      }).unwrap();
      setIsAssignModalOpen(false);
      refetchTunes();
      toast.success(
        'Tune Assigned Successfully',
        `Assigned "${selectedTune.title}" to ${assignedPlayerIds.length} musician(s).`
      );
    } catch (err: any) {
      toast.error(
        'Assignment Failed',
        err?.data?.error || err?.message || 'Failed to assign tune.'
      );
    }
  };

  const handleSyncDrive = async () => {
    setSyncNotice(null);
    try {
      const res = await syncDrive({ section: currentSection }).unwrap();
      const msg = `Discovered ${res.result.syncedFilesCount} files (${res.result.newFilesAdded} new) from Google Drive.`;
      setSyncNotice(`Synced with Google Drive! ${msg}`);
      toast.success('Drive Synchronized', msg);
      refetchTunes();
    } catch (err: any) {
      const errTxt = err?.data?.error || 'Drive sync failed.';
      setSyncNotice(errTxt);
      toast.error('Drive Sync Error', errTxt);
    }
  };

  return (
    <div className="space-y-6">
      {/* Workspace Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-card border border-border/80 p-5 rounded-xl">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full border border-amber-500/40 bg-amber-500/10 text-amber-300 text-xs font-semibold mb-1">
            <Music className="w-3.5 h-3.5 text-[#D97736]" /> Section Madeh Workspace
          </div>
          <h2 className="text-2xl font-serif font-black tracking-tight text-foreground">
            {currentSection === 'SideDrum' ? 'SideDrum/BaseDrum' : currentSection} Section Madeh Command
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Manage section players, assign specialized Madeh scores for Milad Mubarak, and sync Google Drive sheet music.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleSyncDrive}
            disabled={isSyncingDrive}
            className="text-xs gap-1.5"
          >
            <CloudLightning className="w-3.5 h-3.5 text-amber-400" />
            {isSyncingDrive ? 'Syncing Drive...' : 'Sync Google Drive'}
          </Button>
          {canManageThisSection && (
            <Button
              variant="default"
              size="sm"
              onClick={() => {
                setSelectedPlayerForEdit(null);
                setIsMemberModalOpen(true);
              }}
              className="text-xs gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" /> Add Section Player
            </Button>
          )}
        </div>
      </div>

      {/* Overall Major Global Section Overseer */}
      {isSuperAdmin && (
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 p-2.5 bg-card/70 border border-border/80 rounded-xl">
          <span className="text-xs font-semibold text-muted-foreground px-1 shrink-0">
            Overall Major Section Overseer:
          </span>
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
            {ALL_SECTIONS.map(sec => (
              <button
                key={sec}
                type="button"
                onClick={() => setSelectedAdminSection(sec)}
                className={cn(
                  'px-3.5 py-1 text-xs font-semibold rounded-lg transition-all',
                  currentSection === sec
                    ? 'bg-[#D97736] text-white shadow-md'
                    : 'bg-muted/40 hover:bg-muted text-muted-foreground hover:text-foreground'
                )}
              >
                {sec === 'SideDrum' ? 'SideDrum/BaseDrum' : sec}
              </button>
            ))}
          </div>
        </div>
      )}

      {syncNotice && (
        <div className="p-3 bg-amber-500/15 border border-amber-500/30 rounded-lg text-xs font-medium text-amber-300">
          {syncNotice}
        </div>
      )}

      {/* Major Workspace Sub-Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-border/80 pb-3">
        <button
          type="button"
          onClick={() => setActiveSectionTab('repertoire')}
          className={cn(
            'px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer',
            activeSectionTab === 'repertoire'
              ? 'bg-[#D97736] text-white shadow-warm-glow'
              : 'bg-muted/40 hover:bg-muted text-muted-foreground hover:text-foreground'
          )}
        >
          <Music className="w-3.5 h-3.5" />
          <span>Section Scores &amp; Players ({sectionPlayers.length})</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveSectionTab('attendance')}
          className={cn(
            'px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer',
            activeSectionTab === 'attendance'
              ? 'bg-[#D97736] text-white shadow-warm-glow'
              : 'bg-muted/40 hover:bg-muted text-muted-foreground hover:text-foreground'
          )}
        >
          <CalendarCheck className="w-3.5 h-3.5" />
          <span>Practice Attendance Module (Hazri)</span>
        </button>
      </div>

      {activeSectionTab === 'attendance' ? (
        <div className="space-y-6">
          <AttendanceMarker onSuccess={() => refetchUsers()} />
          <AttendanceReports />
        </div>
      ) : (
        /* Two Column Layout: Players Roster & Section Tunes */
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Section Players Roster */}
        <Card className="border border-border">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="w-4 h-4 text-primary" />
                {currentSection === 'SideDrum' ? 'SideDrum/BaseDrum' : currentSection} Section Players ({sectionPlayers.length})
              </CardTitle>
              <CardDescription className="text-xs">
                Restricted to {currentSection === 'SideDrum' ? 'SideDrum/BaseDrum' : currentSection} players only.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {sectionPlayers.length === 0 ? (
              <p className="text-xs text-muted-foreground py-6 text-center">
                No players currently registered in the {currentSection === 'SideDrum' ? 'SideDrum/BaseDrum' : currentSection} section.
              </p>
            ) : (
              sectionPlayers.map(player => {
                const isSectionMajor = isInstrumentMajor(player.role) || player.role === `${currentSection} Major`;

                return (
                  <div
                    key={player.id}
                    className={cn(
                      'flex items-center justify-between p-3 rounded-lg border transition-colors text-xs',
                      isSectionMajor
                        ? 'border-amber-500/40 bg-amber-500/10'
                        : 'border-border/60 bg-muted/20 hover:bg-muted/40'
                    )}
                  >
                    <div>
                      <div className="flex items-center gap-1.5">
                        {isSectionMajor && <Crown className="w-3.5 h-3.5 text-amber-400 shrink-0" />}
                        <h4 className={cn('font-semibold', isSectionMajor ? 'text-amber-300 font-bold' : 'text-foreground')}>
                          {player.name}
                        </h4>
                        {isSectionMajor && (
                          <Badge className="bg-[#D97736] text-white text-[9px] py-0 px-1 font-bold uppercase">
                            Section Major
                          </Badge>
                        )}
                      </div>
                      <p className="text-[11px] text-muted-foreground font-mono mt-0.5">{player.email}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-[10px] py-0">
                          {player.rank || (isSectionMajor ? `${currentSection} Major` : 'Player')}
                        </Badge>
                        {player.phone && (
                          <span className="text-[10px] text-muted-foreground font-medium font-mono">
                            {player.phone}
                          </span>
                        )}
                      </div>
                    </div>
                    {canManageThisSection && (
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedPlayerForEdit(player);
                            setIsMemberModalOpen(true);
                          }}
                          className="text-muted-foreground hover:text-amber-400 h-8 w-8 p-0"
                          title="Edit Player"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeletePlayer(player.id)}
                          className="text-muted-foreground hover:text-destructive h-8 w-8 p-0"
                          title="Remove Player"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    )}
                  </div>
                );
              })
          )}
          </CardContent>
        </Card>

        {/* Right: Section Tunes & Assignment */}
        <Card className="border border-border">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Music className="w-4 h-4 text-amber-400" />
                {currentSection === 'SideDrum' ? 'SideDrum/BaseDrum' : currentSection} Sheet Music & Assignments ({sectionTunes.length})
              </CardTitle>
              <CardDescription className="text-xs">
                Assigned tune access per player with 15-day NEW tag.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {sectionTunes.length === 0 ? (
              <p className="text-xs text-muted-foreground py-6 text-center">
                No tune notes found for this section yet. Click Sync Google Drive to import.
              </p>
            ) : (
              sectionTunes.map(tune => {
                const isNew = tune.isNew;
                const daysRemaining = isNew ? getDaysRemainingForNewBadge(tune.createdAt) : 0;

                return (
                  <div
                    key={tune.id}
                    className="p-3 rounded-lg border border-border/60 bg-muted/20 hover:bg-muted/40 transition-colors space-y-2 text-xs"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-bold text-sm text-foreground">{tune.title}</h4>
                          {isNew && (
                            <Badge variant="new" title={`${daysRemaining} days remaining for NEW tag`}>
                              NEW ({daysRemaining}d)
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-[11px] text-muted-foreground mt-0.5">
                          <span>Uploaded: {formatDate(tune.createdAt)}</span>
                          <span>• Tempo: {tune.tempo || 'Standard'}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenAssignModal(tune)}
                          className="text-xs gap-1 h-7 px-2"
                        >
                          <Share2 className="w-3 h-3 text-amber-400" />
                          <span>Assign ({tune.assignedUserIds?.length || 0})</span>
                        </Button>
                        <a
                          href={tune.pdfUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center justify-center h-7 px-2 rounded-md border border-input text-xs font-medium hover:bg-accent"
                          title="Open Sheet Music"
                        >
                          <FileText className="w-3 h-3 text-primary" />
                        </a>
                      </div>
                    </div>

                    {/* Assigned Players Pills */}
                    <div className="flex items-center gap-1 flex-wrap pt-1 border-t border-border/40">
                      <span className="text-[10px] text-muted-foreground font-semibold">
                        Assigned to:
                      </span>
                      {tune.assignedUserIds?.length === 0 ? (
                        <span className="text-[10px] text-muted-foreground italic">
                          All Section Players (Universal Repertoire)
                        </span>
                      ) : (
                        tune.assignedUserIds.map(userId => {
                          const player = sectionPlayers.find(p => p.id === userId);
                          return (
                            <Badge key={userId} variant="secondary" className="text-[9px] py-0 px-1.5">
                              {player?.name || userId}
                            </Badge>
                          );
                        })
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      </div>
      )}

      {/* Reusable Member Management Modal (Add & Edit for Section) */}
      <MemberModal
        isOpen={isMemberModalOpen}
        onClose={() => {
          setIsMemberModalOpen(false);
          setSelectedPlayerForEdit(null);
        }}
        onSuccess={() => refetchUsers()}
        memberToEdit={selectedPlayerForEdit}
        currentSection={currentSection}
        userRole={role as Role}
      />

      {/* Assign Tune Dialog */}
      <Dialog open={isAssignModalOpen} onOpenChange={setIsAssignModalOpen}>
        <DialogHeader>
          <DialogTitle>Assign Tune: {selectedTune?.title}</DialogTitle>
          <DialogDescription>
            Select specific {currentSection} section players to grant sheet music access. Leave none selected to make it accessible to the entire section.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 max-h-60 overflow-y-auto py-2">
          {sectionPlayers.map(player => {
            const isAssigned = assignedPlayerIds.includes(player.id);
            return (
              <div
                key={player.id}
                onClick={() => togglePlayerAssignment(player.id)}
                className={`flex items-center justify-between p-2.5 rounded-lg border cursor-pointer transition-colors text-xs ${
                  isAssigned
                    ? 'border-primary bg-primary/10 font-semibold'
                    : 'border-border hover:bg-muted/40'
                }`}
              >
                <div>
                  <p className="text-foreground">{player.name}</p>
                  <p className="text-[10px] text-muted-foreground">{player.rank || 'Player'}</p>
                </div>
                {isAssigned && <Check className="w-4 h-4 text-primary" />}
              </div>
            );
          })}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => setIsAssignModalOpen(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="gold"
            onClick={handleSaveAssignments}
            disabled={isAssigning}
          >
            {isAssigning ? 'Saving...' : 'Save Assignments'}
          </Button>
        </DialogFooter>
      </Dialog>
    </div>
  );
}
