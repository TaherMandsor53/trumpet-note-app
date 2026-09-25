'use client';

import React, { useState } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '@/store';
import { isOverallMajor, isInstrumentMajor } from '@/lib/rbac';
import {
  useGetReferenceLinksQuery,
  useAddReferenceLinkMutation,
  useUpdateReferenceLinkMutation,
  useDeleteReferenceLinkMutation,
} from '@/store/api/bandApi';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/components/ui/toast';
import {
  Video,
  Play,
  ExternalLink,
  PlusCircle,
  Upload,
  FolderOpen,
  FileText,
  Image as ImageIcon,
  CheckCircle2,
  Music,
  RefreshCw,
  Eye,
  Pencil,
  Trash2,
  AlertTriangle,
  Maximize2,
  Download,
  PlayCircle,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

function Youtube({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
    </svg>
  );
}

function Instagram({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="20" height="20" x="2" y="2" rx="5" ry="5"/>
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>
      <line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/>
    </svg>
  );
}

const INSTRUMENT_OPTIONS = [
  { value: 'Trumpet', label: 'Trumpet', folder: 'Trumpet Notes' },
  { value: 'Saxophone', label: 'Saxophone', folder: 'Saxophone Notes' },
  { value: 'SideDrum/BaseDrum', label: 'SideDrum / BaseDrum', folder: 'SideDrum Notes' },
  { value: 'Trombone', label: 'Trombone', folder: 'Trombone Notes' },
  { value: 'Euphonium', label: 'Euphonium', folder: 'Euphonium Notes' },
];

export interface FilePopupState {
  open: boolean;
  tuneName: string;
  instrumentType: string;
  fileName: string;
  fileUrl: string;
  isPdf: boolean;
}

export interface VideoPopupState {
  open: boolean;
  tuneName: string;
  instrumentType: string;
  youtubeLink: string;
  embedUrl: string;
}

export interface EditTuneState {
  open: boolean;
  originalTuneName: string;
  tuneName: string;
  instrumentType: string;
  youtubeLink: string;
  instagramLink: string;
  existingFileName?: string;
  existingFileUrl?: string;
  newFile: File | null;
}

export interface DeleteConfirmState {
  open: boolean;
  tuneName: string;
  instrumentType: string;
}

/**
 * Extracts standard 11-char YouTube ID and formats embed URL
 */
function getYoutubeEmbedUrl(url?: string, autoplay = 0): string | null {
  if (!url) return null;
  const cleanUrl = url.trim();
  const regExp = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?|shorts)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i;
  const match = cleanUrl.match(regExp);
  const videoId = match && match[1] ? match[1] : null;
  if (!videoId) return null;
  return `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=${autoplay}&rel=0`;
}

function extractYoutubeVideoId(url?: string): string | null {
  if (!url) return null;
  const cleanUrl = url.trim();
  const regExp = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?|shorts)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i;
  const match = cleanUrl.match(regExp);
  return match && match[1] ? match[1] : null;
}

/**
 * Ensures Google Drive links use /preview for embedding without X-Frame-Options errors
 */
function formatScorePreviewUrl(url?: string): string {
  if (!url) return '';
  if (url.includes('drive.google.com')) {
    if (url.includes('/preview')) return url;
    const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
    if (match && match[1]) {
      return `https://drive.google.com/file/d/${match[1]}/preview`;
    }
    return url.replace(/\/view(\?.*)?$/, '/preview');
  }
  return url;
}

export function VideoShowcase() {
  const currentUser = useSelector((state: RootState) => state.auth.user);
  const activeRole = useSelector((state: RootState) => state.auth.activeRole);
  const role = currentUser?.role || activeRole;
  const { toast } = useToast();

  // Permission: Section Major and Major have authority to Add, Edit, and Delete Tune Notes
  const canManageNotes = isOverallMajor(role) || isInstrumentMajor(role);

  // Dynamic Reference Links fetched from GET API call
  const { data: refLinksData, refetch: refetchRefLinks, isFetching: isRefreshing } = useGetReferenceLinksQuery();
  const [addReferenceLink, { isLoading: isUploading }] = useAddReferenceLinkMutation();
  const [updateReferenceLink, { isLoading: isUpdating }] = useUpdateReferenceLinkMutation();
  const [deleteReferenceLink, { isLoading: isDeleting }] = useDeleteReferenceLinkMutation();

  const referenceLinks = refLinksData?.referenceLinks || [];

  // Active video player state for pinned top video
  const [activeVideoTuneId, setActiveVideoTuneId] = useState<string | null>(null);

  // Modal State for Adding Tune Notes
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Modal State for Viewing Score in Popup (NO auto download)
  const [filePopup, setFilePopup] = useState<FilePopupState>({
    open: false,
    tuneName: '',
    instrumentType: '',
    fileName: '',
    fileUrl: '',
    isPdf: true,
  });

  // Modal State for Direct Video Popup Playback
  const [videoPopup, setVideoPopup] = useState<VideoPopupState>({
    open: false,
    tuneName: '',
    instrumentType: '',
    youtubeLink: '',
    embedUrl: '',
  });

  // Modal State for Editing / Updating Tune Notes
  const [editState, setEditState] = useState<EditTuneState>({
    open: false,
    originalTuneName: '',
    tuneName: '',
    instrumentType: 'Trumpet',
    youtubeLink: '',
    instagramLink: '',
    existingFileName: '',
    existingFileUrl: '',
    newFile: null,
  });

  // Modal State for Confirming Deletion
  const [deleteState, setDeleteState] = useState<DeleteConfirmState>({
    open: false,
    tuneName: '',
    instrumentType: '',
  });

  // Add Form State
  const [tuneName, setTuneName] = useState('');
  const [instrumentType, setInstrumentType] = useState('Trumpet');
  const [youtubeLink, setYoutubeLink] = useState('');
  const [instagramLink, setInstagramLink] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const currentFolder =
    INSTRUMENT_OPTIONS.find(i => i.value === instrumentType)?.folder || `${instrumentType} Notes`;

  const editCurrentFolder =
    INSTRUMENT_OPTIONS.find(i => i.value === editState.instrumentType)?.folder || `${editState.instrumentType} Notes`;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleEditFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setEditState(prev => ({ ...prev, newFile: e.target.files![0] }));
    }
  };

  // Find currently active tune for top video player (only if explicitly activated)
  const activeTune = activeVideoTuneId
    ? referenceLinks.find(item => item.id === activeVideoTuneId)
    : null;

  const activeVideoId = activeTune ? extractYoutubeVideoId(activeTune.youtubeLink) : null;

  // Handle Score File click: Opens in popup without downloading
  const handleOpenFilePopup = (item: any) => {
    if (!item.fileUrl) {
      toast.error('No File Available', 'This entry does not have an attached score file.');
      return;
    }

    const isPdf =
      item.fileName?.toLowerCase().endsWith('.pdf') ||
      item.fileUrl?.toLowerCase().includes('.pdf') ||
      item.fileUrl?.includes('application/pdf') ||
      !item.fileName?.match(/\.(png|jpg|jpeg|webp)$/i);

    setFilePopup({
      open: true,
      tuneName: item.tuneName,
      instrumentType: item.instrumentType,
      fileName: item.fileName || 'Tune Score',
      fileUrl: item.fileUrl,
      isPdf: Boolean(isPdf),
    });
  };

  // Handle YouTube Click: Open interactive video popup for immediate playback
  const handleOpenVideoPopup = (item: any) => {
    if (!item.youtubeLink) {
      toast.error('No Video Link', 'This entry does not have a YouTube link.');
      return;
    }

    const embedUrl = getYoutubeEmbedUrl(item.youtubeLink, 1);
    if (!embedUrl) {
      // If embed URL can't be parsed, open in new tab
      window.open(item.youtubeLink, '_blank');
      return;
    }

    setVideoPopup({
      open: true,
      tuneName: item.tuneName,
      instrumentType: item.instrumentType,
      youtubeLink: item.youtubeLink,
      embedUrl,
    });

    setActiveVideoTuneId(item.id);
  };

  // Open Edit Modal
  const handleOpenEdit = (item: any) => {
    setEditState({
      open: true,
      originalTuneName: item.tuneName,
      tuneName: item.tuneName,
      instrumentType: item.instrumentType || 'Trumpet',
      youtubeLink: item.youtubeLink || '',
      instagramLink: item.instagramLink || '',
      existingFileName: item.fileName || '',
      existingFileUrl: item.fileUrl || '',
      newFile: null,
    });
  };

  // Open Delete Modal
  const handleOpenDelete = (item: any) => {
    setDeleteState({
      open: true,
      tuneName: item.tuneName,
      instrumentType: item.instrumentType,
    });
  };

  // Submit Add
  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tuneName.trim()) {
      toast.error('Missing Tune Name', 'Please enter the title of the tune note.');
      return;
    }

    try {
      const formData = new FormData();
      formData.append('tuneName', tuneName.trim());
      formData.append('instrumentType', instrumentType);
      formData.append('youtubeLink', youtubeLink.trim());
      formData.append('instagramLink', instagramLink.trim());
      if (selectedFile) {
        formData.append('file', selectedFile);
      }

      const res = await addReferenceLink(formData).unwrap();
      toast.success(
        'Tune Notes & Reference Added',
        `Score saved to "${currentFolder}" in Google Drive and recorded in Reference Link sheet.`
      );

      if (res?.record?.id && youtubeLink) {
        setActiveVideoTuneId(res.record.id);
      }

      setTuneName('');
      setYoutubeLink('');
      setInstagramLink('');
      setSelectedFile(null);
      setIsAddModalOpen(false);
      refetchRefLinks();
    } catch (err: any) {
      toast.error('Upload Failed', err?.data?.error || err?.message || 'Could not record tune notes.');
    }
  };

  // Submit Edit (Update)
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editState.tuneName.trim()) {
      toast.error('Missing Tune Name', 'Please enter the tune name.');
      return;
    }

    try {
      const formData = new FormData();
      formData.append('originalTuneName', editState.originalTuneName);
      formData.append('tuneName', editState.tuneName.trim());
      formData.append('instrumentType', editState.instrumentType);
      formData.append('youtubeLink', editState.youtubeLink.trim());
      formData.append('instagramLink', editState.instagramLink.trim());
      if (editState.newFile) {
        formData.append('file', editState.newFile);
      }

      await updateReferenceLink(formData).unwrap();
      toast.success(
        'Tune Updated Successfully',
        `Changes saved to Reference Link sheet and database.`
      );

      setEditState(prev => ({ ...prev, open: false, newFile: null }));
      refetchRefLinks();
    } catch (err: any) {
      toast.error('Update Failed', err?.data?.error || err?.message || 'Could not update tune notes.');
    }
  };

  // Submit Delete
  const handleDeleteConfirm = async () => {
    if (!deleteState.tuneName) return;

    try {
      await deleteReferenceLink(deleteState.tuneName).unwrap();
      toast.success(
        'Tune Deleted',
        `"${deleteState.tuneName}" has been removed from Reference Link sheet and repertoire.`
      );
      setDeleteState({ open: false, tuneName: '', instrumentType: '' });
      refetchRefLinks();
    } catch (err: any) {
      toast.error('Delete Failed', err?.data?.error || err?.message || 'Could not delete tune note.');
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Top Header Row with Add Tune Notes Button & Refresh */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border border-primary/40 bg-primary/10 text-primary text-xs font-semibold mb-1">
            <Video className="w-3.5 h-3.5" /> Performance Archive &amp; Repertoire
          </div>
          <h2 className="text-2xl font-serif font-black tracking-tight text-foreground">
            Taheri Scout Band Performances &amp; Tune Notes
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Procession videos, parade cadences, harmonic Madeh scores, and live Reference Link sheet records.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button
            onClick={() => refetchRefLinks()}
            variant="outline"
            size="sm"
            disabled={isRefreshing}
            className="gap-1.5 text-xs h-9 cursor-pointer"
          >
            <RefreshCw className={cn('w-3.5 h-3.5', isRefreshing && 'animate-spin')} />
            <span>Refresh</span>
          </Button>

          {/* Option to Add Tune Notes: Exclusively for Major & Section Majors */}
          {canManageNotes && (
            <Button
              onClick={() => setIsAddModalOpen(true)}
              variant="havenly"
              size="sm"
              className="gap-2 text-xs font-bold shadow-warm-glow cursor-pointer h-9"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Add Tune Notes</span>
            </Button>
          )}
        </div>
      </div>

      {/* Main Video Player (Only rendered when a tune with a video is available) */}
      {activeTune && activeVideoId ? (
        <Card className="border border-border/80 overflow-hidden shadow-lg bg-card">
          <div className="relative w-full aspect-video bg-black">
            <iframe
              src={`https://www.youtube-nocookie.com/embed/${activeVideoId}?autoplay=0&rel=0`}
              title={activeTune.tuneName}
              className="w-full h-full border-0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
          <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-card">
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <h3 className="font-serif font-bold text-lg text-foreground truncate">{activeTune.tuneName}</h3>
                <Badge variant="outline" className="text-[10px] font-mono text-[#D97736] border-[#D97736]/40">
                  {activeTune.instrumentType}
                </Badge>
                <Badge variant="outline" className="text-[10px] font-mono text-emerald-400 border-emerald-500/40">
                  📁 {activeTune.targetFolder || `${activeTune.instrumentType} Notes`}
                </Badge>
              </div>
              {activeTune.uploadedBy && (
                <p className="text-xs text-muted-foreground">Uploaded by {activeTune.uploadedBy}</p>
              )}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {activeTune.fileUrl && (
                <Button
                  onClick={() => handleOpenFilePopup(activeTune)}
                  variant="outline"
                  size="sm"
                  className="gap-1.5 text-xs text-emerald-400 border-emerald-500/40 hover:bg-emerald-500/10 cursor-pointer"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>View Score</span>
                </Button>
              )}
              {activeTune.youtubeLink && (
                <a
                  href={activeTune.youtubeLink}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs text-[#D97736] font-semibold hover:underline bg-[#D97736]/10 px-3 py-1.5 rounded-lg border border-[#D97736]/30"
                >
                  <Youtube className="w-3.5 h-3.5 text-red-500" />
                  <span>Watch on YouTube</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
          </CardContent>
        </Card>
      ) : null}

      {/* Dynamic Tune Notes Details List (GET API Call) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <FolderOpen className="w-3.5 h-3.5 text-[#D97736]" /> Tune Notes &amp; Reference Link Details
            </h4>
            <Badge variant="outline" className="text-[9px] text-emerald-400 border-emerald-500/40 font-mono">
              Live Reference Link Sheet
            </Badge>
          </div>
          <span className="text-xs text-muted-foreground font-mono">
            {referenceLinks.length} {referenceLinks.length === 1 ? 'Record' : 'Records'}
          </span>
        </div>

        {referenceLinks.length === 0 ? (
          <Card className="border border-dashed border-border/80 p-8 text-center bg-card/40">
            <Music className="w-10 h-10 text-muted-foreground mx-auto mb-2 opacity-50" />
            <h4 className="text-sm font-bold text-foreground">No Tune Notes Recorded Yet</h4>
            <p className="text-xs text-muted-foreground mt-1 max-w-md mx-auto">
              Major and Section Majors can add tune notes above. The file will route to your designated Instrument folder in Google Drive (Trumpet Notes, Saxophone Notes, etc.) and save to the Reference Link sheet.
            </p>
            {canManageNotes && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsAddModalOpen(true)}
                className="mt-4 gap-1.5 text-xs text-[#D97736] border-[#D97736]/40 cursor-pointer"
              >
                <PlusCircle className="w-3.5 h-3.5" /> Add First Tune Note
              </Button>
            )}
          </Card>
        ) : (
          /* Responsive Table */
          <div className="border border-border/80 rounded-xl overflow-hidden bg-card shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs min-w-[700px]">
                <thead className="bg-muted/50 border-b border-border text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="py-3 px-4">Notes Name</th>
                    <th className="py-3 px-4">Instrument Type</th>
                    <th className="py-3 px-4 text-center">Score File</th>
                    <th className="py-3 px-4 text-center">YouTube Link</th>
                    <th className="py-3 px-4 text-center">Instagram Link</th>
                    <th className="py-3 px-4">Uploaded Details</th>
                    {canManageNotes && <th className="py-3 px-4 text-center">Actions</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {referenceLinks.map((item, idx) => {
                    const isVideoSelected = activeTune?.id === item.id;
                    const hasYoutube = Boolean(item.youtubeLink && item.youtubeLink.trim());
                    const hasInstagram = Boolean(item.instagramLink && item.instagramLink.trim());

                    return (
                      <tr
                        key={item.id || idx}
                        className={cn(
                          'hover:bg-muted/30 transition-colors',
                          isVideoSelected && 'bg-amber-500/10'
                        )}
                      >
                        {/* 1. Notes Name */}
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm text-foreground">
                              {item.tuneName}
                            </span>
                          </div>
                        </td>

                        {/* 2. Instrument Type & Folder */}
                        <td className="py-3 px-4">
                          <div className="space-y-0.5">
                            <Badge variant="outline" className="text-[10px] text-amber-400 border-amber-500/40">
                              {item.instrumentType}
                            </Badge>
                            <div className="text-[10px] text-muted-foreground flex items-center gap-1 font-mono">
                              <FolderOpen className="w-3 h-3 text-emerald-400 shrink-0" />
                              <span>{item.targetFolder || `${item.instrumentType} Notes`}</span>
                            </div>
                          </div>
                        </td>

                        {/* 3. Score File (Opens in popup without downloading + external link) */}
                        <td className="py-3 px-4 text-center">
                          {item.fileUrl ? (
                            <div className="inline-flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => handleOpenFilePopup(item)}
                                title="Click to view score in popup (no download)"
                                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-semibold cursor-pointer transition-all hover:scale-105 active:scale-95"
                              >
                                {item.fileName?.toLowerCase().endsWith('.pdf') ? (
                                  <FileText className="w-3.5 h-3.5" />
                                ) : (
                                  <ImageIcon className="w-3.5 h-3.5" />
                                )}
                                <span>View Score</span>
                              </button>
                              <a
                                href={formatScorePreviewUrl(item.fileUrl)}
                                target="_blank"
                                rel="noreferrer"
                                title="Open Score in New Tab"
                                className="p-1 rounded text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 transition-colors"
                              >
                                <ExternalLink className="w-3 h-3" />
                              </a>
                            </div>
                          ) : (
                            <span className="text-muted-foreground/60 text-[11px]">-</span>
                          )}
                        </td>

                        {/* 4. YouTube Link (Plays in Popup Player + Direct Link) */}
                        <td className="py-3 px-4 text-center">
                          {hasYoutube ? (
                            <div className="inline-flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleOpenVideoPopup(item)}
                                title="Watch Video in Popup Player"
                                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 text-amber-400 border border-amber-500/30 text-xs font-semibold cursor-pointer transition-all hover:scale-105 active:scale-95"
                              >
                                <Play className="w-3.5 h-3.5 fill-current" />
                                <span>Watch Video</span>
                              </button>

                              <a
                                href={item.youtubeLink}
                                target="_blank"
                                rel="noreferrer"
                                title="Open on YouTube Website / App"
                                className="p-1 rounded text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                              </a>
                            </div>
                          ) : (
                            <span className="text-muted-foreground/60 text-[11px]">-</span>
                          )}
                        </td>

                        {/* 5. Instagram Link */}
                        <td className="py-3 px-4 text-center">
                          {hasInstagram ? (
                            <a
                              href={item.instagramLink}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-[11px] font-semibold text-pink-400 hover:underline bg-pink-500/10 px-2 py-1 rounded-md border border-pink-500/30"
                            >
                              <Instagram className="w-3 h-3" />
                              <span>Instagram</span>
                              <ExternalLink className="w-2.5 h-2.5" />
                            </a>
                          ) : (
                            <span className="text-muted-foreground/60 text-[11px]">-</span>
                          )}
                        </td>

                        {/* 6. Uploaded Details */}
                        <td className="py-3 px-4">
                          <div className="text-[11px] text-muted-foreground">
                            {item.uploadedBy && (
                              <p className="text-foreground font-medium truncate max-w-[140px]">
                                {item.uploadedBy}
                              </p>
                            )}
                            {item.createdAt && (
                              <p className="font-mono text-[10px] text-muted-foreground/80">
                                {new Date(item.createdAt).toLocaleDateString()}
                              </p>
                            )}
                          </div>
                        </td>

                        {/* 7. Actions: Update & Delete for Leadership */}
                        {canManageNotes && (
                          <td className="py-3 px-4 text-center">
                            <div className="inline-flex items-center gap-1">
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => handleOpenEdit(item)}
                                title="Update / Edit Tune Notes"
                                className="h-7 w-7 p-0 text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 cursor-pointer"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => handleOpenDelete(item)}
                                title="Delete Tune Notes Record"
                                className="h-7 w-7 p-0 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* POPUP MODAL: Score File Viewer (NO auto download) */}
      <Dialog
        open={filePopup.open}
        onOpenChange={open => setFilePopup(prev => ({ ...prev, open }))}
        contentClassName="max-w-4xl"
      >
        <div className="space-y-3">
          <DialogHeader>
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <Badge variant="outline" className="text-[10px] text-emerald-400 border-emerald-500/40">
                  Score Preview
                </Badge>
                <Badge variant="outline" className="text-[10px] text-amber-400 border-amber-500/40">
                  {filePopup.instrumentType}
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={formatScorePreviewUrl(filePopup.fileUrl)}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs text-emerald-400 font-semibold bg-emerald-500/10 hover:bg-emerald-500/20 px-2.5 py-1 rounded-md border border-emerald-500/30 transition-colors"
                >
                  <Maximize2 className="w-3 h-3" />
                  <span>Open Fullscreen</span>
                </a>
                <a
                  href={filePopup.fileUrl}
                  download={filePopup.fileName}
                  className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground bg-muted/40 hover:bg-muted/70 px-2.5 py-1 rounded-md border border-border transition-colors"
                >
                  <Download className="w-3 h-3" />
                  <span>Download</span>
                </a>
              </div>
            </div>
            <DialogTitle className="text-lg font-serif font-black text-foreground">
              {filePopup.tuneName}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Viewing score file: <span className="font-mono text-foreground">{filePopup.fileName}</span>
            </DialogDescription>
          </DialogHeader>

          {/* Embedded Score Display */}
          <div className="rounded-xl overflow-hidden border border-border/80 bg-zinc-950/80 flex items-center justify-center min-h-[380px]">
            {filePopup.isPdf ? (
              <object
                data={formatScorePreviewUrl(filePopup.fileUrl)}
                type="application/pdf"
                className="w-full h-[68vh] rounded-lg bg-white"
              >
                <iframe
                  src={`${formatScorePreviewUrl(filePopup.fileUrl)}#toolbar=0`}
                  title={filePopup.tuneName}
                  className="w-full h-[68vh] rounded-lg border-0 bg-white"
                >
                  <div className="p-8 text-center text-foreground space-y-3">
                    <p className="text-sm">Unable to display PDF directly in your browser frame.</p>
                    <a
                      href={formatScorePreviewUrl(filePopup.fileUrl)}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg font-semibold text-xs"
                    >
                      <Maximize2 className="w-4 h-4" /> Open PDF in New Tab
                    </a>
                  </div>
                </iframe>
              </object>
            ) : (
              <div className="max-h-[68vh] overflow-auto p-2 flex items-center justify-center">
                <img
                  src={filePopup.fileUrl}
                  alt={filePopup.tuneName}
                  className="max-h-[65vh] object-contain rounded-lg shadow-lg"
                />
              </div>
            )}
          </div>

          <DialogFooter className="flex items-center justify-between sm:justify-between pt-2 border-t border-border/60">
            <span className="text-[11px] text-muted-foreground font-mono">
              Score opened without automatic download
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setFilePopup(prev => ({ ...prev, open: false }))}
            >
              Close
            </Button>
          </DialogFooter>
        </div>
      </Dialog>

      {/* POPUP MODAL: Interactive YouTube Video Player */}
      <Dialog
        open={videoPopup.open}
        onOpenChange={open => setVideoPopup(prev => ({ ...prev, open }))}
        contentClassName="max-w-3xl"
      >
        <div className="space-y-3">
          <DialogHeader>
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <Badge variant="outline" className="text-[10px] text-red-400 border-red-500/40">
                  <Youtube className="w-3 h-3 mr-1 fill-current inline" /> Video Playback
                </Badge>
                <Badge variant="outline" className="text-[10px] text-amber-400 border-amber-500/40">
                  {videoPopup.instrumentType}
                </Badge>
              </div>
              {videoPopup.youtubeLink && (
                <a
                  href={videoPopup.youtubeLink}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs text-red-400 font-semibold bg-red-500/10 hover:bg-red-500/20 px-2.5 py-1 rounded-md border border-red-500/30 transition-colors"
                >
                  <ExternalLink className="w-3 h-3" />
                  <span>Open in YouTube App</span>
                </a>
              )}
            </div>
            <DialogTitle className="text-lg font-serif font-black text-foreground">
              {videoPopup.tuneName}
            </DialogTitle>
          </DialogHeader>

          {/* Embedded YouTube Player */}
          <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-black border border-border shadow-2xl">
            {videoPopup.embedUrl ? (
              <iframe
                src={videoPopup.embedUrl}
                title={videoPopup.tuneName}
                className="w-full h-full border-0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground text-xs">
                Could not load video player.
              </div>
            )}
          </div>

          <DialogFooter className="flex items-center justify-between sm:justify-between pt-2 border-t border-border/60">
            <span className="text-[11px] text-muted-foreground font-mono">
              Playing in high definition
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setVideoPopup(prev => ({ ...prev, open: false }))}
            >
              Close
            </Button>
          </DialogFooter>
        </div>
      </Dialog>

      {/* UPDATE / EDIT MODAL (Section Major & Major) */}
      <Dialog open={editState.open} onOpenChange={open => setEditState(prev => ({ ...prev, open }))}>
        <form onSubmit={handleEditSubmit} className="space-y-4 overflow-y-auto max-h-[82vh] pr-1.5 scrollbar-thin">
          <DialogHeader>
            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border border-blue-500/40 bg-blue-500/10 text-blue-300 text-[11px] font-semibold mb-1 w-fit">
              <Pencil className="w-3 h-3 text-blue-400" /> Update Tune Notes &amp; Links
            </div>
            <DialogTitle className="text-lg font-serif font-black text-foreground">
              Edit Tune Record: {editState.originalTuneName}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Update tune name, instrument section, replace score file, or edit YouTube/Instagram links.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3.5 text-xs">
            {/* 1. Tune Name */}
            <div>
              <label className="font-bold text-foreground mb-1 block">
                Tune Name <span className="text-rose-500">*</span>
              </label>
              <Input
                type="text"
                placeholder="Tune Title"
                value={editState.tuneName}
                onChange={e => setEditState(prev => ({ ...prev, tuneName: e.target.value }))}
                className="h-9 text-xs"
                required
              />
            </div>

            {/* 2. Instrument Type */}
            <div>
              <label className="font-bold text-foreground mb-1 block">
                Instrument Type <span className="text-rose-500">*</span>
              </label>
              <Select
                value={editState.instrumentType}
                onChange={e => setEditState(prev => ({ ...prev, instrumentType: e.target.value }))}
                className="h-9 text-xs"
              >
                {INSTRUMENT_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </Select>
              <div className="mt-2 p-2 rounded-lg bg-blue-500/10 border border-blue-500/30 text-blue-200 flex items-center justify-between text-[11px]">
                <span className="flex items-center gap-1.5">
                  <FolderOpen className="w-3.5 h-3.5 text-blue-400" /> Target Drive Folder:
                </span>
                <span className="font-mono font-bold text-blue-300">
                  📁 {editCurrentFolder}
                </span>
              </div>
            </div>

            {/* 3. Replace Score File (Optional) */}
            <div>
              <label className="font-bold text-foreground mb-1 block">
                Replace Score File (Optional)
              </label>
              {editState.existingFileName && !editState.newFile && (
                <div className="mb-2 p-2 rounded-lg bg-muted/40 border border-border flex items-center justify-between text-[11px]">
                  <span className="text-muted-foreground truncate max-w-[240px]">
                    Current: <strong className="text-foreground">{editState.existingFileName}</strong>
                  </span>
                  <Badge variant="outline" className="text-[10px] text-emerald-400 border-emerald-500/40">
                    Active Score
                  </Badge>
                </div>
              )}
              <div className="flex items-center gap-2">
                <input
                  type="file"
                  id="tune-score-edit-file"
                  accept="image/png,image/jpeg,image/jpg,image/webp,application/pdf"
                  onChange={handleEditFileChange}
                  className="hidden"
                />
                <label
                  htmlFor="tune-score-edit-file"
                  className="flex-1 flex items-center justify-center gap-2 h-9 px-3 rounded-md border border-dashed border-input bg-muted/30 hover:bg-muted/60 text-xs text-foreground cursor-pointer transition-colors"
                >
                  <Upload className="w-3.5 h-3.5 text-blue-400" />
                  <span className="truncate">
                    {editState.newFile ? editState.newFile.name : 'Choose replacement Image or PDF...'}
                  </span>
                </label>
                {editState.newFile && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setEditState(prev => ({ ...prev, newFile: null }))}
                    className="h-9 px-2 text-rose-400"
                  >
                    Clear
                  </Button>
                )}
              </div>
            </div>

            {/* 4. YouTube Link */}
            <div>
              <label className="font-bold text-foreground mb-1 flex items-center gap-1.5">
                <Youtube className="w-3.5 h-3.5 text-red-500" /> YouTube Link
              </label>
              <Input
                type="url"
                placeholder="https://www.youtube.com/watch?v=..."
                value={editState.youtubeLink}
                onChange={e => setEditState(prev => ({ ...prev, youtubeLink: e.target.value }))}
                className="h-9 text-xs"
              />
            </div>

            {/* 5. Instagram Link */}
            <div>
              <label className="font-bold text-foreground mb-1 flex items-center gap-1.5">
                <Instagram className="w-3.5 h-3.5 text-pink-500" /> Instagram Link
              </label>
              <Input
                type="url"
                placeholder="https://www.instagram.com/reel/..."
                value={editState.instagramLink}
                onChange={e => setEditState(prev => ({ ...prev, instagramLink: e.target.value }))}
                className="h-9 text-xs"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 pt-2 border-t border-border/60">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setEditState(prev => ({ ...prev, open: false }))}
              disabled={isUpdating}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="havenly"
              size="sm"
              disabled={isUpdating}
              className="gap-1.5 font-bold shadow-warm-glow cursor-pointer"
            >
              {isUpdating ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </Button>
          </DialogFooter>
        </form>
      </Dialog>

      {/* DELETE CONFIRMATION MODAL */}
      <Dialog
        open={deleteState.open}
        onOpenChange={open => setDeleteState(prev => ({ ...prev, open }))}
        contentClassName="max-w-md"
      >
        <div className="space-y-4">
          <DialogHeader>
            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border border-rose-500/40 bg-rose-500/10 text-rose-300 text-[11px] font-semibold mb-1 w-fit">
              <AlertTriangle className="w-3.5 h-3.5 text-rose-400" /> Delete Confirmation
            </div>
            <DialogTitle className="text-lg font-serif font-black text-foreground">
              Delete Tune Record
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Are you sure you want to permanently delete this tune note record?
            </DialogDescription>
          </DialogHeader>

          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-200 text-xs space-y-1.5">
            <p>
              Tune Name: <strong className="text-white">{deleteState.tuneName}</strong>
            </p>
            <p className="text-[11px] text-rose-300/90">
              This will remove the entry from the <span className="font-mono">Reference Link</span> sheet in Google Sheets and local database.
            </p>
          </div>

          <DialogFooter className="gap-2 pt-2 border-t border-border/60">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setDeleteState({ open: false, tuneName: '', instrumentType: '' })}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={handleDeleteConfirm}
              disabled={isDeleting}
              className="gap-1.5 font-bold cursor-pointer"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="w-3.5 h-3.5" /> Confirm Delete
                </>
              )}
            </Button>
          </DialogFooter>
        </div>
      </Dialog>

      {/* Add Tune Notes Modal (Major & Section Major) */}
      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <form onSubmit={handleAddSubmit} className="space-y-4 overflow-y-auto max-h-[82vh] pr-1.5 scrollbar-thin">
          <DialogHeader>
            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border border-amber-500/40 bg-amber-500/10 text-amber-300 text-[11px] font-semibold mb-1 w-fit">
              <FolderOpen className="w-3 h-3 text-[#D97736]" /> My Drive • Reference Link Sync
            </div>
            <DialogTitle className="text-lg font-serif font-black text-foreground">
              Add Tune Notes &amp; Reference Links
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Upload your sheet notes into the designated instrument folder in Google Drive (Image 3) and synchronize with the Reference Link sheet.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3.5 text-xs">
            {/* 1. Tune Name */}
            <div>
              <label className="font-bold text-foreground mb-1 block">
                Tune Name <span className="text-rose-500">*</span>
              </label>
              <Input
                type="text"
                placeholder="e.g., Ya Husain Ya Mazloom, Hai Tahani..."
                value={tuneName}
                onChange={e => setTuneName(e.target.value)}
                className="h-9 text-xs"
                required
              />
            </div>

            {/* 2. Instrument Type Dropdown & Target Folder Badge */}
            <div>
              <label className="font-bold text-foreground mb-1 block">
                Instrument Type <span className="text-rose-500">*</span>
              </label>
              <Select
                value={instrumentType}
                onChange={e => setInstrumentType(e.target.value)}
                className="h-9 text-xs"
              >
                {INSTRUMENT_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </Select>

              {/* Dynamic Target Drive Folder Indicator based on Image 3 */}
              <div className="mt-2 p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 flex items-center justify-between text-[11px]">
                <span className="flex items-center gap-1.5">
                  <FolderOpen className="w-4 h-4 text-[#D97736]" /> Target Google Drive Folder:
                </span>
                <span className="font-mono font-bold text-emerald-400 bg-emerald-500/15 px-2 py-0.5 rounded border border-emerald-500/30">
                  📁 {currentFolder}
                </span>
              </div>
            </div>

            {/* 3. Upload File (Image or PDF) */}
            <div>
              <label className="font-bold text-foreground mb-1 block">
                Upload Score File (Image / PDF)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="file"
                  id="tune-score-file"
                  accept="image/png,image/jpeg,image/jpg,image/webp,application/pdf"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <label
                  htmlFor="tune-score-file"
                  className="flex-1 flex items-center justify-center gap-2 h-9 px-3 rounded-md border border-dashed border-input bg-muted/30 hover:bg-muted/60 text-xs text-foreground cursor-pointer transition-colors"
                >
                  <Upload className="w-3.5 h-3.5 text-[#D97736]" />
                  <span className="truncate">
                    {selectedFile ? selectedFile.name : 'Choose Image or PDF score...'}
                  </span>
                </label>
                {selectedFile && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedFile(null)}
                    className="h-9 px-2 text-rose-400"
                  >
                    Clear
                  </Button>
                )}
              </div>
              <p className="text-[10px] text-muted-foreground mt-1">
                Supported formats: PDF, PNG, JPG, JPEG, WEBP. Uploads to &ldquo;{currentFolder}&rdquo; in Google Drive.
              </p>
            </div>

            {/* 4. YouTube Link */}
            <div>
              <label className="font-bold text-foreground mb-1 flex items-center gap-1.5">
                <Youtube className="w-3.5 h-3.5 text-red-500" /> YouTube Link
              </label>
              <Input
                type="url"
                placeholder="https://www.youtube.com/watch?v=..."
                value={youtubeLink}
                onChange={e => setYoutubeLink(e.target.value)}
                className="h-9 text-xs"
              />
            </div>

            {/* 5. Instagram Link */}
            <div>
              <label className="font-bold text-foreground mb-1 flex items-center gap-1.5">
                <Instagram className="w-3.5 h-3.5 text-pink-500" /> Instagram Link
              </label>
              <Input
                type="url"
                placeholder="https://www.instagram.com/reel/..."
                value={instagramLink}
                onChange={e => setInstagramLink(e.target.value)}
                className="h-9 text-xs"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 pt-2 border-t border-border/60">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsAddModalOpen(false)}
              disabled={isUploading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="havenly"
              size="sm"
              disabled={isUploading}
              className="gap-1.5 font-bold shadow-warm-glow cursor-pointer"
            >
              {isUploading ? 'Submitting & Syncing...' : 'Submit & Record to Reference Sheet'}
            </Button>
          </DialogFooter>
        </form>
      </Dialog>
    </div>
  );
}
