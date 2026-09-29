'use client';

import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '@/store';
import { isOverallMajor, isInstrumentMajor, getManagedSection } from '@/lib/rbac';
import {
  useGetReferenceLinksQuery,
  useAddReferenceLinkMutation,
  useUpdateReferenceLinkMutation,
  useDeleteReferenceLinkMutation,
  useGetUsersQuery,
  useGetAssignedNotesQuery,
  useAssignNotesMutation,
} from '@/store/api/bandApi';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Pagination } from '@/components/ui/pagination';
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
  Music,
  RefreshCw,
  Eye,
  Pencil,
  Trash2,
  AlertTriangle,
  Maximize2,
  Minimize2,
  Download,
  Loader2,
  Users,
  Search,
  Check,
  CheckSquare,
  Square,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Filter,
  Lock,
  Smartphone,
  Fingerprint,
  EyeOff,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { SecurePdfCanvasViewer } from '@/components/notes/SecurePdfCanvasViewer';

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
  { value: 'Euphonium', label: 'Euphonium', folder: 'Euphonium Notes' },
  { value: 'SideDrum/BaseDrum', label: 'SideDrum / BaseDrum', folder: 'SideDrum Notes' },
  { value: 'Trombone', label: 'Trombone', folder: 'Trombone Notes' },
];

function getDriveFolderForInstrument(instrument?: string): string {
  if (!instrument) return 'Trumpet Notes';
  const clean = instrument.trim().toLowerCase();
  if (clean === 'trumpet') return 'Trumpet Notes';
  if (clean === 'saxophone') return 'Saxophone Notes';
  if (clean === 'euphonium') return 'Euphonium Notes';
  if (clean.includes('sidedrum') || clean.includes('basedrum')) return 'SideDrum Notes';
  if (clean === 'trombone') return 'Trombone Notes';
  if (clean === 'dish') return 'Dish Notes';
  return `${instrument} Notes`;
}

function normalizeInstrumentValue(sec?: string | null): string {
  if (!sec) return 'Trumpet';
  const clean = sec.trim().toLowerCase();
  if (clean === 'trumpet') return 'Trumpet';
  if (clean === 'saxophone') return 'Saxophone';
  if (clean === 'euphonium') return 'Euphonium';
  if (clean.includes('sidedrum') || clean.includes('basedrum')) return 'SideDrum/BaseDrum';
  if (clean === 'trombone') return 'Trombone';
  return 'Trumpet';
}

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

export interface AssignTuneState {
  open: boolean;
  tuneName: string;
  instrumentType: string;
  selectedMemberNames: string[];
  searchQuery: string;
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
 * Ensures Google Drive links use /preview and PDF links suppress browser toolbars & download options
 */
function formatScorePreviewUrl(url?: string): string {
  if (!url) return '';
  let clean = url.trim();

  // Ensure leading slash for local relative paths
  if (
    !clean.startsWith('http://') &&
    !clean.startsWith('https://') &&
    !clean.startsWith('/') &&
    !clean.startsWith('blob:') &&
    !clean.startsWith('data:')
  ) {
    clean = '/' + clean;
  }

  // Google Drive URL transformation
  if (clean.includes('drive.google.com')) {
    const match = clean.match(/\/file\/d\/([a-zA-Z0-9_-]+)/) || clean.match(/\/d\/([a-zA-Z0-9_-]+)/) || clean.match(/id=([a-zA-Z0-9_-]+)/);
    if (match && match[1]) {
      return `https://drive.google.com/file/d/${match[1]}/preview`;
    }
    if (clean.includes('/preview')) return clean;
    return clean.replace(/\/view(\?.*)?$/, '/preview');
  }

  // Direct PDF URL: suppress browser PDF viewer toolbar, download/print buttons, navpanes, scrollbars
  if (clean.toLowerCase().includes('.pdf')) {
    const [basePath] = clean.split('#');
    let safePath = basePath;
    if (safePath.includes(' ') && !safePath.includes('%20')) {
      safePath = encodeURI(safePath);
    }
    return `${safePath}#toolbar=0&navpanes=0&scrollbar=0`;
  }

  // Encode spaces for other file URLs
  if (clean.includes(' ') && !clean.includes('%20')) {
    clean = encodeURI(clean);
  }

  return clean;
}

export function VideoShowcase() {
  const currentUser = useSelector((state: RootState) => state.auth.user);
  const activeRole = useSelector((state: RootState) => state.auth.activeRole);
  const role = currentUser?.role || activeRole;
  const { toast } = useToast();

  // Role permissions
  const isMajor = isOverallMajor(role);
  const managedSection = getManagedSection(role) || (role.endsWith('Major') ? currentUser?.section : null);
  const isSectionMajor = Boolean(managedSection) || isInstrumentMajor(role);
  const canManageNotes = isMajor || isSectionMajor;

  // Data Queries
  const { data: refLinksData, refetch: refetchRefLinks, isFetching: isRefreshing } = useGetReferenceLinksQuery();
  const { data: usersData } = useGetUsersQuery();
  const { data: assignedNotesData, refetch: refetchAssignedNotes } = useGetAssignedNotesQuery();

  // Mutations
  const [addReferenceLink, { isLoading: isUploading }] = useAddReferenceLinkMutation();
  const [updateReferenceLink, { isLoading: isUpdating }] = useUpdateReferenceLinkMutation();
  const [deleteReferenceLink, { isLoading: isDeleting }] = useDeleteReferenceLinkMutation();
  const [assignNotes, { isLoading: isAssigning }] = useAssignNotesMutation();

  const allReferenceLinks = refLinksData?.referenceLinks || [];
  const allUsers = usersData?.users || [];
  const assignedRecords = assignedNotesData?.assignedNotes || [];
  const userAssignedTunes = assignedNotesData?.userAssignedTunes || [];

  // Filter state for Overall Major
  const [sectionFilter, setSectionFilter] = useState<string>('All');

  // Filtered Reference Links based on Instrument Type & Role
  const filteredReferenceLinks = useMemo(() => {
    // 1. Overall Major: Sees all tunes, can filter by section
    if (isMajor) {
      if (sectionFilter === 'All') return allReferenceLinks;
      return allReferenceLinks.filter(item => {
        const itemInst = (item.instrumentType || '').toLowerCase();
        const filt = sectionFilter.toLowerCase();
        if (filt.includes('sidedrum') || filt.includes('basedrum')) {
          return itemInst.includes('sidedrum') || itemInst.includes('basedrum');
        }
        return itemInst === filt;
      });
    }

    // 2. Section Major: ONLY sees tunes for their particular instrument section
    if (isSectionMajor && managedSection) {
      const secLower = managedSection.toLowerCase();
      return allReferenceLinks.filter(item => {
        const itemInst = (item.instrumentType || '').toLowerCase();
        if (secLower.includes('sidedrum') || secLower.includes('basedrum')) {
          return itemInst.includes('sidedrum') || itemInst.includes('basedrum');
        }
        return itemInst === secLower;
      });
    }

    // 3. Regular Musician / Member: ONLY assigned tunes should be visible!
    const myRecord = assignedRecords.find(
      r =>
        (currentUser?.name && r.memberName.toLowerCase().includes(currentUser.name.toLowerCase())) ||
        (currentUser?.itsNumber && r.itsNumber === currentUser.itsNumber)
    );
    const myAssignedList = myRecord?.assignedTunes
      ? myRecord.assignedTunes.split(',').map((s: string) => s.trim().toLowerCase()).filter(Boolean)
      : userAssignedTunes.map((s: string) => s.toLowerCase());

    return allReferenceLinks.filter(item =>
      myAssignedList.includes(item.tuneName.toLowerCase())
    );
  }, [allReferenceLinks, isMajor, isSectionMajor, managedSection, sectionFilter, assignedRecords, userAssignedTunes, currentUser]);

  // Pagination State (Default 10 records per page as requested)
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Paginated Reference Links
  const paginatedReferenceLinks = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return filteredReferenceLinks.slice(startIndex, startIndex + pageSize);
  }, [filteredReferenceLinks, currentPage, pageSize]);

  // Active video player state for pinned top video
  const [activeVideoTuneId, setActiveVideoTuneId] = useState<string | null>(null);

  // Modal State for Adding Tune Notes
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Modal State for Viewing Score in Popup (NO auto download, anti-screenshot protected)
  const [filePopup, setFilePopup] = useState<FilePopupState>({
    open: false,
    tuneName: '',
    instrumentType: '',
    fileName: '',
    fileUrl: '',
    isPdf: true,
  });

  // Score Modal Security & Anti-Screenshot States
  const [isScoreProtected, setIsScoreProtected] = useState(false);
  const [scoreProtectionReason, setScoreProtectionReason] = useState<string>('');
  const [isScoreFullscreen, setIsScoreFullscreen] = useState(false);
  const [shutterGuardEnabled, setShutterGuardEnabled] = useState(true);
  const [isShutterRevealed, setIsShutterRevealed] = useState(false);
  const scoreViewerContainerRef = useRef<HTMLDivElement | null>(null);

  // Device detection: identify mobile/tablet devices
  const [isMobileOrTablet, setIsMobileOrTablet] = useState(false);
  const isMobileOrTabletRef = useRef(false);

  useEffect(() => {
    const checkIsMobileOrTablet = () => {
      if (typeof window === 'undefined') return false;
      const isTouch =
        'ontouchstart' in window ||
        (typeof navigator !== 'undefined' &&
          (navigator.maxTouchPoints > 0 || (navigator as any).msMaxTouchPoints > 0));
      const isIPad =
        typeof navigator !== 'undefined' &&
        navigator.platform === 'MacIntel' &&
        navigator.maxTouchPoints > 1;
      const isSmallScreen = window.innerWidth <= 1024;
      const isMobileUA =
        typeof navigator !== 'undefined' &&
        /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile|Tablet/i.test(navigator.userAgent);
      return Boolean(isMobileUA || isIPad || (isTouch && isSmallScreen) || isSmallScreen);
    };

    const detected = checkIsMobileOrTablet();
    setIsMobileOrTablet(detected);
    isMobileOrTabletRef.current = detected;
    if (detected) {
      setShutterGuardEnabled(true);
    }

    const handleResize = () => {
      const res = checkIsMobileOrTablet();
      setIsMobileOrTablet(res);
      isMobileOrTabletRef.current = res;
      if (res) {
        setShutterGuardEnabled(true);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Trigger Security Alert & Blackout on screenshot / unauthorized action
  const triggerScoreSecurityAlert = useCallback((reason: string) => {
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(
          '🔒 CONFIDENTIAL DOCUMENT: Taheri Scout Band score notes are restricted. Screenshots, prints, and downloads are strictly prohibited.'
        ).catch(() => {});
      }
    } catch {
      // Ignore
    }

    setIsScoreProtected(true);
    setScoreProtectionReason(reason);
  }, []);

  // Multi-layered Anti-Screenshot & Screen Capture Protection for Score Viewer
  useEffect(() => {
    if (!filePopup.open) {
      setIsScoreProtected(false);
      setScoreProtectionReason('');
      setIsShutterRevealed(false);
      return;
    }

    // Layer 1: Phone / Tablet App Switcher & Backgrounding Detection
    const handleVisibilityChange = () => {
      if (document.hidden || document.visibilityState === 'hidden') {
        triggerScoreSecurityAlert('Document viewing paused: Screen backgrounded or app-switcher detected.');
      }
    };

    // Layer 2: Window Focus Loss (Triggered on Snipping Tool, Screenshot shortcut, or Window Switch)
    const handleWindowBlur = () => {
      triggerScoreSecurityAlert('Viewing paused: Screen capture, Snipping Tool, or window switch was detected.');
    };

    // Layer 3: Page Hide
    const handlePageHide = () => {
      triggerScoreSecurityAlert('Viewing paused: Mobile/Tablet screen was backgrounded.');
    };

    // Layer 4: Keyboard Screenshot Shortcut Interception
    const handleKeyDown = (e: KeyboardEvent) => {
      // PrintScreen key
      if (e.key === 'PrintScreen' || e.keyCode === 44) {
        e.preventDefault();
        e.stopPropagation();
        triggerScoreSecurityAlert('Screenshot shortcut (PrintScreen) intercepted.');
        return;
      }

      // Ctrl / Cmd + P (Print)
      if ((e.ctrlKey || e.metaKey) && (e.key === 'p' || e.key === 'P')) {
        e.preventDefault();
        e.stopPropagation();
        triggerScoreSecurityAlert('Printing is strictly prohibited for confidential band scores.');
        return;
      }

      // Ctrl / Cmd + S (Save / Download)
      if ((e.ctrlKey || e.metaKey) && (e.key === 's' || e.key === 'S')) {
        e.preventDefault();
        e.stopPropagation();
        triggerScoreSecurityAlert('Direct file saving or downloading is disabled.');
        return;
      }

      // Windows Snipping Tool (Ctrl + Shift + S or Win + Shift + S)
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 's' || e.key === 'S')) {
        e.preventDefault();
        e.stopPropagation();
        triggerScoreSecurityAlert('Screen Snip / Snipping Tool shortcut blocked.');
        return;
      }

      // macOS Screenshot shortcuts (Cmd + Shift + 3 / 4 / 5)
      if (e.metaKey && e.shiftKey && ['3', '4', '5'].includes(e.key)) {
        e.preventDefault();
        e.stopPropagation();
        triggerScoreSecurityAlert('Screen capture shortcut blocked.');
        return;
      }

      // Escape key to exit fullscreen or close modal
      if (e.key === 'Escape') {
        if (document.fullscreenElement) {
          document.exitFullscreen?.().catch(() => {});
          setIsScoreFullscreen(false);
        } else {
          setFilePopup(prev => ({ ...prev, open: false }));
        }
      }
    };

    // Layer 5: Clipboard copy / cut prevention
    const handleCopy = (e: ClipboardEvent) => {
      e.preventDefault();
      if (e.clipboardData) {
        e.clipboardData.setData('text/plain', '🔒 CONFIDENTIAL: Taheri Scout Band Score - Copying Prohibited.');
      }
      triggerScoreSecurityAlert('Copying score content is prohibited.');
    };

    // Layer 6: BeforePrint detection
    const handleBeforePrint = (e: Event) => {
      e.preventDefault();
      triggerScoreSecurityAlert('Printing is prohibited.');
    };

    // Fullscreen change listener to sync isScoreFullscreen
    const handleFullscreenChange = () => {
      setIsScoreFullscreen(Boolean(document.fullscreenElement));
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleWindowBlur);
    window.addEventListener('pagehide', handlePageHide);
    window.addEventListener('keydown', handleKeyDown, true);
    window.addEventListener('copy', handleCopy);
    window.addEventListener('cut', handleCopy);
    window.addEventListener('beforeprint', handleBeforePrint);
    document.addEventListener('fullscreenchange', handleFullscreenChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleWindowBlur);
      window.removeEventListener('pagehide', handlePageHide);
      window.removeEventListener('keydown', handleKeyDown, true);
      window.removeEventListener('copy', handleCopy);
      window.removeEventListener('cut', handleCopy);
      window.removeEventListener('beforeprint', handleBeforePrint);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, [filePopup.open, triggerScoreSecurityAlert]);

  // Fullscreen toggle handler
  const handleToggleScoreFullscreen = () => {
    if (!scoreViewerContainerRef.current) return;
    if (!document.fullscreenElement) {
      scoreViewerContainerRef.current.requestFullscreen?.().catch(() => {});
      setIsScoreFullscreen(true);
    } else {
      document.exitFullscreen?.().catch(() => {});
      setIsScoreFullscreen(false);
    }
  };

  const formattedScoreTimestamp = useMemo(() => {
    return new Date().toISOString().replace('T', ' ').slice(0, 16);
  }, [filePopup.open]);

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

  // Modal State for Assigning Tune Notes
  const [assignState, setAssignState] = useState<AssignTuneState>({
    open: false,
    tuneName: '',
    instrumentType: 'Trumpet',
    selectedMemberNames: [],
    searchQuery: '',
  });

  // Add Form State
  const [tuneName, setTuneName] = useState('');
  const [instrumentType, setInstrumentType] = useState<string>(
    isSectionMajor && managedSection ? normalizeInstrumentValue(managedSection) : 'Trumpet'
  );
  const [youtubeLink, setYoutubeLink] = useState('');
  const [instagramLink, setInstagramLink] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const currentFolder =
    INSTRUMENT_OPTIONS.find(i => i.value === instrumentType)?.folder ||
    getDriveFolderForInstrument(instrumentType);

  const editCurrentFolder =
    INSTRUMENT_OPTIONS.find(i => i.value === editState.instrumentType)?.folder ||
    getDriveFolderForInstrument(editState.instrumentType);

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
    ? filteredReferenceLinks.find(item => item.id === activeVideoTuneId)
    : null;

  const activeVideoId = activeTune ? extractYoutubeVideoId(activeTune.youtubeLink) : null;

  // Handle Score File click: Opens in secured popup without downloading
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

    setIsScoreProtected(false);
    setScoreProtectionReason('');
    setIsShutterRevealed(false);
    setShutterGuardEnabled(true);
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

  // Calculate assigned member count for a tune
  const getAssignedCountForTune = (tuneTitle: string) => {
    if (!tuneTitle) return 0;
    const lowerTitle = tuneTitle.toLowerCase().trim();
    return assignedRecords.filter(r => {
      if (!r.assignedTunes) return false;
      const tunes = r.assignedTunes.split(',').map((s: string) => s.trim().toLowerCase());
      return tunes.includes(lowerTitle);
    }).length;
  };

  // Open Assign Modal: Populates eligible members for that specific instrument
  const handleOpenAssign = (item: any) => {
    const tuneTitleLower = item.tuneName.toLowerCase().trim();

    // Determine members who already have this tune assigned
    const preselected: string[] = [];
    assignedRecords.forEach(r => {
      if (!r.assignedTunes) return;
      const tunes = r.assignedTunes.split(',').map((s: string) => s.trim().toLowerCase());
      if (tunes.includes(tuneTitleLower)) {
        preselected.push(r.memberName);
      }
    });

    setAssignState({
      open: true,
      tuneName: item.tuneName,
      instrumentType: item.instrumentType,
      selectedMemberNames: preselected,
      searchQuery: '',
    });
  };

  // Eligible members for the instrument in Assign Modal
  const eligibleSectionMembers = useMemo(() => {
    if (!assignState.open) return [];
    const inst = (assignState.instrumentType || '').toLowerCase();

    return allUsers.filter(u => {
      const uSec = (u.section || '').toLowerCase();
      const uRole = (u.role || '').toLowerCase();
      if (inst === 'trumpet') return uSec === 'trumpet' || uRole.includes('trumpet');
      if (inst === 'saxophone') return uSec === 'saxophone' || uRole.includes('saxophone');
      if (inst.includes('sidedrum') || inst.includes('basedrum')) {
        return (
          uSec.includes('sidedrum') ||
          uSec.includes('basedrum') ||
          uRole.includes('sidedrum') ||
          uRole.includes('basedrum')
        );
      }
      if (inst === 'trombone') return uSec === 'trombone' || uRole.includes('trombone');
      if (inst === 'euphonium') return uSec === 'euphonium' || uRole.includes('euphonium');
      if (inst === 'dish') return uSec === 'dish' || uRole.includes('dish');
      return uSec === inst;
    });
  }, [assignState.open, assignState.instrumentType, allUsers]);

  // Filtered members by search query in modal
  const searchedMembers = useMemo(() => {
    const q = assignState.searchQuery.toLowerCase().trim();
    if (!q) return eligibleSectionMembers;
    return eligibleSectionMembers.filter(
      m => m.name.toLowerCase().includes(q) || (m.itsNumber && m.itsNumber.includes(q))
    );
  }, [eligibleSectionMembers, assignState.searchQuery]);

  // Toggle member assignment selection
  const handleToggleMember = (name: string) => {
    setAssignState(prev => {
      const exists = prev.selectedMemberNames.includes(name);
      return {
        ...prev,
        selectedMemberNames: exists
          ? prev.selectedMemberNames.filter(n => n !== name)
          : [...prev.selectedMemberNames, name],
      };
    });
  };

  // Select all / Deselect all
  const handleSelectAllMembers = () => {
    const allNames = eligibleSectionMembers.map(m => m.name);
    setAssignState(prev => ({
      ...prev,
      selectedMemberNames: prev.selectedMemberNames.length === allNames.length ? [] : allNames,
    }));
  };

  // Submit Assign Form
  const handleAssignSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignState.tuneName) return;

    try {
      const assignments = eligibleSectionMembers.map(m => ({
        memberName: m.name,
        itsNumber: m.itsNumber || '',
        section: m.section || assignState.instrumentType,
        assigned: assignState.selectedMemberNames.includes(m.name),
      }));

      await assignNotes({
        tuneName: assignState.tuneName,
        assignments,
      }).unwrap();

      toast.success(
        'Tune Assigned Successfully',
        `Score "${assignState.tuneName}" updated for ${assignState.selectedMemberNames.length} musicians in Assign Notes sheet.`
      );

      setAssignState(prev => ({ ...prev, open: false }));
      refetchAssignedNotes();
      refetchRefLinks();
    } catch (err: any) {
      toast.error('Assignment Failed', err?.data?.error || err?.message || 'Could not save assignments.');
    }
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
      formData.append('targetFolder', currentFolder);
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
      formData.append('targetFolder', editCurrentFolder);
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

  // Restrict access: Only Major and Section Majors can view / manage tune notes
  if (!canManageNotes) {
    return (
      <div className="max-w-2xl mx-auto my-12 p-8 text-center bg-card rounded-2xl border border-border space-y-4 shadow-sm">
        <div className="w-12 h-12 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mx-auto text-amber-500">
          <Lock className="w-6 h-6" />
        </div>
        <h3 className="text-xl font-bold font-serif text-foreground">Access Restricted</h3>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">
          The <strong>Manage Tune Notes</strong> module is exclusively accessible to Major and Section Majors.
        </p>
        <p className="text-xs text-muted-foreground/80">
          Band members can access their assigned scores and practice sheets directly inside <strong>My Madeh Portal</strong>.
        </p>
      </div>
    );
  }

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
            onClick={() => {
              refetchRefLinks();
              refetchAssignedNotes();
            }}
            variant="outline"
            size="sm"
            disabled={isRefreshing}
            className="gap-1.5 text-xs h-9 cursor-pointer"
          >
            <RefreshCw className={cn('w-3.5 h-3.5', isRefreshing && 'animate-spin')} />
            <span>Refresh</span>
          </Button>

          {/* Option to Add Tune Notes: Major & Section Majors */}
          {canManageNotes && (
            <Button
              onClick={() => {
                if (isSectionMajor && managedSection) {
                  setInstrumentType(normalizeInstrumentValue(managedSection));
                }
                setIsAddModalOpen(true);
              }}
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

      {/* Role-Specific Filter & Scope Banner */}
      <div className="flex items-center justify-between flex-wrap gap-2 p-3 rounded-xl bg-card border border-border/70 shadow-xs">
        <div className="flex items-center gap-2 flex-wrap">
          {isMajor ? (
            /* Overall Major: Interactive Instrument Filter Tabs */
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-xs font-bold text-muted-foreground flex items-center gap-1 mr-1">
                <Filter className="w-3.5 h-3.5 text-[#D97736]" /> Filter Instrument:
              </span>
              {['All', 'Trumpet', 'Saxophone', 'SideDrum/BaseDrum', 'Trombone', 'Euphonium'].map(inst => (
                <button
                  key={inst}
                  type="button"
                  onClick={() => setSectionFilter(inst)}
                  className={cn(
                    'px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all cursor-pointer',
                    sectionFilter === inst
                      ? 'bg-[#D97736] text-white border-[#D97736] shadow-sm'
                      : 'bg-muted/40 text-muted-foreground border-border hover:bg-muted/80'
                  )}
                >
                  {inst === 'SideDrum/BaseDrum' ? 'Side/Base Drum' : inst}
                </button>
              ))}
            </div>
          ) : isSectionMajor ? (
            /* Section Major: Clear Indicator of their designated Instrument Section */
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs py-1 px-2.5 font-bold text-[#D97736] border-[#D97736]/40 bg-[#D97736]/10">
                <Shield className="w-3.5 h-3.5 mr-1.5" />
                Section Major View: {managedSection} Notes
              </Badge>
              <span className="text-xs text-muted-foreground">
                Showing all scores and reference tunes for {managedSection} musicians.
              </span>
            </div>
          ) : (
            /* Regular Musician: Assigned Practice Notes Scope */
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs py-1 px-2.5 font-bold text-emerald-400 border-emerald-500/40 bg-emerald-500/10">
                <Check className="w-3.5 h-3.5 mr-1" />
                My Assigned Tunes
              </Badge>
              <span className="text-xs text-muted-foreground">
                Displaying tune scores assigned to you by your Section Major.
              </span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground">
          <span>{filteredReferenceLinks.length} {filteredReferenceLinks.length === 1 ? 'Tune' : 'Tunes'} Visible</span>
        </div>
      </div>

      {/* Main Video Player (Only rendered when a tune with a video is explicitly selected) */}
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

      {/* Dynamic Tune Notes Details List */}
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
            {filteredReferenceLinks.length} {filteredReferenceLinks.length === 1 ? 'Record' : 'Records'}
          </span>
        </div>

        {filteredReferenceLinks.length === 0 ? (
          <Card className="border border-dashed border-border/80 p-8 text-center bg-card/40">
            <Music className="w-10 h-10 text-muted-foreground mx-auto mb-2 opacity-50" />
            <h4 className="text-sm font-bold text-foreground">
              {!canManageNotes ? 'No Practice Tunes Assigned Yet' : 'No Tune Notes Found for this Section'}
            </h4>
            <p className="text-xs text-muted-foreground mt-1 max-w-md mx-auto">
              {!canManageNotes
                ? 'Your Section Major has not assigned any specific tune notes to your account yet. When assigned, they will appear here.'
                : 'You can upload and add tune notes using the button above. The score file will save into your designated Google Drive folder.'}
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
              <table className="w-full text-left text-xs min-w-[760px]">
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
                  {paginatedReferenceLinks.map((item, idx) => {
                    const isVideoSelected = activeTune?.id === item.id;
                    const hasYoutube = Boolean(item.youtubeLink && item.youtubeLink.trim());
                    const hasInstagram = Boolean(item.instagramLink && item.instagramLink.trim());
                    const assignedCount = getAssignedCountForTune(item.tuneName);

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

                        {/* 3. Score File (Opens in secured popup, no download or external link) */}
                        <td className="py-3 px-4 text-center">
                          {item.fileUrl ? (
                            <div className="inline-flex items-center justify-center">
                              <button
                                type="button"
                                onClick={() => handleOpenFilePopup(item)}
                                title="Click to view score in secured popup (download & screenshot protected)"
                                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-semibold cursor-pointer transition-all hover:scale-105 active:scale-95"
                              >
                                {item.fileName?.toLowerCase().endsWith('.pdf') ? (
                                  <FileText className="w-3.5 h-3.5" />
                                ) : (
                                  <ImageIcon className="w-3.5 h-3.5" />
                                )}
                                <span>View Score</span>
                              </button>
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

                        {/* 7. Actions: Assign, Edit, Delete for Section Major & Major */}
                        {canManageNotes && (
                          <td className="py-3 px-4 text-center">
                            <div className="inline-flex items-center gap-1.5">
                              {/* Option to Assign: Opens modal to assign to section musicians */}
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => handleOpenAssign(item)}
                                title={`Assign ${item.tuneName} to Section Musicians`}
                                className="h-7 px-2.5 gap-1.5 text-[11px] font-bold bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/30 cursor-pointer transition-all"
                              >
                                <Users className="w-3.5 h-3.5" />
                                <span>Assign</span>
                                {assignedCount > 0 && (
                                  <span className="ml-0.5 px-1.5 py-0.2 rounded-full text-[9px] bg-blue-500/30 text-blue-200 font-mono font-bold">
                                    {assignedCount}
                                  </span>
                                )}
                              </Button>

                              {/* Edit Button */}
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => handleOpenEdit(item)}
                                title="Update / Edit Tune Notes"
                                className="h-7 w-7 p-0 text-amber-400 hover:text-amber-300 hover:bg-amber-500/10 cursor-pointer"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </Button>

                              {/* Delete Button */}
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
            {filteredReferenceLinks.length > 0 && (
              <Pagination
                currentPage={currentPage}
                totalItems={filteredReferenceLinks.length}
                pageSize={pageSize}
                pageSizeOptions={[10, 20, 50, 100]}
                onPageChange={setCurrentPage}
                onPageSizeChange={setPageSize}
              />
            )}
          </div>
        )}
      </div>

      {/* ASSIGN TUNE MODAL: Section Major assigns tune to musicians of that specific instrument */}
      <Dialog
        open={assignState.open}
        onOpenChange={open => setAssignState(prev => ({ ...prev, open }))}
        contentClassName="max-w-xl"
      >
        <form onSubmit={handleAssignSubmit} className="space-y-4">
          <DialogHeader>
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <Badge variant="outline" className="text-[10px] text-blue-400 border-blue-500/40 bg-blue-500/10">
                <Users className="w-3 h-3 mr-1" /> Repertoire Assignment
              </Badge>
              <Badge variant="outline" className="text-[10px] text-amber-400 border-amber-500/40">
                {assignState.instrumentType} Section
              </Badge>
            </div>
            <DialogTitle className="text-lg font-serif font-black text-foreground">
              Assign Tune: {assignState.tuneName}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Assign this score to musicians in the <strong className="text-foreground">{assignState.instrumentType}</strong> section.
              Records are synchronized to the <strong className="text-foreground font-mono">Assign Notes</strong> sheet in Excel.
            </DialogDescription>
          </DialogHeader>

          {/* Search & Bulk Select Controls */}
          <div className="flex items-center justify-between gap-2 pt-1">
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search member name or ITS..."
                value={assignState.searchQuery}
                onChange={e => setAssignState(prev => ({ ...prev, searchQuery: e.target.value }))}
                className="h-8 pl-8 text-xs bg-muted/30"
              />
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleSelectAllMembers}
              className="text-xs h-8 px-2.5 gap-1 cursor-pointer shrink-0"
            >
              {assignState.selectedMemberNames.length === eligibleSectionMembers.length ? (
                <>
                  <Square className="w-3.5 h-3.5" /> <span>Deselect All</span>
                </>
              ) : (
                <>
                  <CheckSquare className="w-3.5 h-3.5 text-blue-400" /> <span>Select All</span>
                </>
              )}
            </Button>
          </div>

          {/* Members List Box */}
          <div className="border border-border/80 rounded-xl overflow-hidden bg-card/60 divide-y divide-border/60 max-h-[46vh] overflow-y-auto scrollbar-thin">
            {searchedMembers.length === 0 ? (
              <div className="p-6 text-center text-xs text-muted-foreground">
                No {assignState.instrumentType} musicians found matching your query.
              </div>
            ) : (
              searchedMembers.map(member => {
                const isSelected = assignState.selectedMemberNames.includes(member.name);
                return (
                  <div
                    key={member.id || member.itsNumber}
                    onClick={() => handleToggleMember(member.name)}
                    className={cn(
                      'p-2.5 flex items-center justify-between gap-3 text-xs cursor-pointer transition-colors',
                      isSelected ? 'bg-blue-500/10 hover:bg-blue-500/15' : 'hover:bg-muted/40'
                    )}
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <div
                        className={cn(
                          'w-4 h-4 rounded border flex items-center justify-center transition-colors shrink-0',
                          isSelected
                            ? 'bg-blue-600 border-blue-600 text-white'
                            : 'border-border bg-background'
                        )}
                      >
                        {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-foreground truncate">{member.name}</p>
                        <p className="text-[10px] text-muted-foreground font-mono">
                          ITS: {member.itsNumber || '—'} • {member.rank || member.role}
                        </p>
                      </div>
                    </div>

                    <Badge
                      variant="outline"
                      className={cn(
                        'text-[10px] font-mono shrink-0',
                        isSelected
                          ? 'border-blue-500/50 text-blue-300 bg-blue-500/15'
                          : 'border-border text-muted-foreground'
                      )}
                    >
                      {isSelected ? 'Assigned' : 'Unassigned'}
                    </Badge>
                  </div>
                );
              })
            )}
          </div>

          <DialogFooter className="flex items-center justify-between sm:justify-between pt-2 border-t border-border/60">
            <span className="text-[11px] text-muted-foreground font-mono">
              Selected: <strong className="text-foreground">{assignState.selectedMemberNames.length}</strong> of {eligibleSectionMembers.length}
            </span>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setAssignState(prev => ({ ...prev, open: false }))}
                disabled={isAssigning}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="havenly"
                size="sm"
                disabled={isAssigning}
                className="gap-1.5 font-bold shadow-warm-glow cursor-pointer"
              >
                {isAssigning ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving Assignments...
                  </>
                ) : (
                  <>
                    <Check className="w-3.5 h-3.5" /> Save Assignments ({assignState.selectedMemberNames.length})
                  </>
                )}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </Dialog>

      {/* POPUP MODAL: Score File Viewer (Secured In-App View, NO download, Anti-Screenshot) */}
      <Dialog
        open={filePopup.open}
        onOpenChange={open => {
          if (!open && document.fullscreenElement) {
            document.exitFullscreen?.().catch(() => {});
            setIsScoreFullscreen(false);
          }
          setFilePopup(prev => ({ ...prev, open }));
        }}
        contentClassName="max-w-5xl"
      >
        <div className="space-y-3">
          {/* Dynamic CSS Print Shield: Blanks out page completely if user attempts printing */}
          <style dangerouslySetInnerHTML={{
            __html: `
              @media print {
                body * { display: none !important; }
                html, body { background: #000000 !important; color: #ffffff !important; }
                body::before {
                  content: "CONFIDENTIAL DOCUMENT - PRINTING PROHIBITED (TAHERI SCOUT BAND)";
                  display: block !important;
                  font-family: sans-serif;
                  font-size: 20px;
                  color: red;
                  text-align: center;
                  margin-top: 20%;
                }
              }
            `,
          }} />

          <DialogHeader>
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <Badge variant="outline" className="text-[10px] text-emerald-400 border-emerald-500/40">
                  Score Preview
                </Badge>
                <Badge variant="outline" className="text-[10px] text-amber-400 border-amber-500/40">
                  {filePopup.instrumentType}
                </Badge>
                <Badge variant="outline" className="text-[10px] py-0.5 px-2 font-bold border-amber-500/50 text-amber-500 bg-amber-500/10">
                  <ShieldCheck className="w-3 h-3 mr-1 inline" />
                  View-Only
                </Badge>
                <Badge variant="outline" className="text-[10px] py-0.5 px-2 font-mono text-red-400 border-red-500/40 bg-red-500/10">
                  <Lock className="w-3 h-3 mr-1 inline" />
                  Non-Downloadable
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                {/* Phone Shutter Guard Toggle */}
                <Button
                  type="button"
                  variant={shutterGuardEnabled ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => {
                    setShutterGuardEnabled(!shutterGuardEnabled);
                    setIsShutterRevealed(false);
                  }}
                  className={`text-xs h-7 px-2.5 gap-1.5 transition-all ${
                    shutterGuardEnabled
                      ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                      : 'border-amber-500/40 text-amber-500 hover:bg-amber-500/10'
                  }`}
                  title="Toggle Mobile/Tablet Touch-to-Reveal Shutter for anti-screenshot protection"
                >
                  <Smartphone className="w-3 h-3" />
                  <span className="hidden sm:inline font-semibold">
                    {shutterGuardEnabled ? 'Shutter: ON' : 'Shutter Guard'}
                  </span>
                </Button>

                {/* In-App Fullscreen Toggle Button (NO opening raw file in a new tab) */}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleToggleScoreFullscreen}
                  className="inline-flex items-center gap-1.5 text-xs text-emerald-400 font-semibold bg-emerald-500/10 hover:bg-emerald-500/20 px-2.5 h-7 rounded-md border border-emerald-500/30 transition-colors"
                  title={isScoreFullscreen ? 'Exit Fullscreen' : 'View Fullscreen'}
                >
                  {isScoreFullscreen ? <Minimize2 className="w-3 h-3" /> : <Maximize2 className="w-3 h-3" />}
                  <span>{isScoreFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}</span>
                </Button>
              </div>
            </div>
            <DialogTitle className="text-lg font-serif font-black text-foreground">
              {filePopup.tuneName}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Viewing score file: <span className="font-mono text-foreground">{filePopup.fileName}</span> • Authorized: <span className="text-foreground font-semibold">{currentUser?.name || 'Band Officer'}</span> ({role})
            </DialogDescription>
          </DialogHeader>

          {/* Security Notice Banner */}
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-1.5 text-[11px] text-amber-300 flex items-center justify-between gap-2 shrink-0">
            <div className="flex items-center gap-1.5 overflow-hidden">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping shrink-0" />
              <span className="font-semibold text-amber-200">Confidential Score Guard:</span>
              <span className="truncate">
                Direct downloads, printing, and screenshots are restricted. Dynamic watermark applied.
              </span>
            </div>
            <span className="font-mono text-[10px] text-muted-foreground shrink-0 hidden sm:inline">
              SECURE-VIEW • 1448H
            </span>
          </div>

          {/* Embedded Score Display with Multi-Layered Anti-Screenshot Protection */}
          <div
            ref={scoreViewerContainerRef}
            className="relative rounded-xl overflow-hidden border border-border/80 bg-zinc-950 flex flex-col items-center justify-center min-h-[420px] select-none"
            onContextMenu={e => e.preventDefault()}
            style={{
              WebkitTouchCallout: 'none',
              WebkitUserSelect: 'none',
              userSelect: 'none',
            }}
          >
            {/* Floating Exit Fullscreen bar when active */}
            {isScoreFullscreen && (
              <div className="absolute top-3 right-3 z-40">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={handleToggleScoreFullscreen}
                  className="bg-black/80 text-white border-white/30 hover:bg-black text-xs gap-1.5 backdrop-blur-sm"
                >
                  <Minimize2 className="w-3.5 h-3.5" />
                  <span>Exit Fullscreen</span>
                </Button>
              </div>
            )}

            {/* Blackout Shield (When screen capture, shortcut, or app-switch detected) */}
            {isScoreProtected && (
              <div className="absolute inset-0 z-50 bg-black/98 backdrop-blur-2xl flex flex-col items-center justify-center p-6 text-center select-none animate-in fade-in duration-150">
                <div className="w-16 h-16 rounded-full bg-red-500/20 border-2 border-red-500/40 flex items-center justify-center mb-4 shadow-lg shadow-red-500/10 animate-pulse">
                  <ShieldAlert className="w-8 h-8 text-red-500" />
                </div>
                <h3 className="text-xl font-serif font-black text-red-400 mb-1.5 tracking-tight">
                  🔒 Viewing Shield Active
                </h3>
                <p className="text-xs text-muted-foreground max-w-md mb-2">
                  {scoreProtectionReason || 'Document viewing was paused because a screen capture, screenshot gesture, or app-switch was detected.'}
                </p>
                <div className="bg-amber-500/10 border border-amber-500/30 text-amber-300 px-3.5 py-2 rounded-xl text-xs font-mono mb-6 max-w-sm">
                  User: <span className="font-bold text-foreground">{currentUser?.name || 'Band Officer'}</span> ({role})
                  <br />
                  ITS: <span className="font-bold text-amber-400">{currentUser?.itsNumber || '—'}</span> • {filePopup.instrumentType}
                </div>
                <Button
                  type="button"
                  onClick={() => {
                    setIsScoreProtected(false);
                    setScoreProtectionReason('');
                  }}
                  className="bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs px-6 py-2.5 rounded-xl shadow-lg transition-transform active:scale-95"
                >
                  <Eye className="w-4 h-4 mr-2" /> Resume Secure Viewing
                </Button>
              </div>
            )}

            {/* Secured Canvas Document Viewer with Anti-Screenshot Shutter & Dynamic Stamped Watermark */}
            <SecurePdfCanvasViewer
              fileUrl={filePopup.fileUrl}
              fileName={filePopup.fileName}
              isPdf={filePopup.isPdf}
              watermark={{
                name: currentUser?.name || 'Band Officer',
                itsNumber: currentUser?.itsNumber || '—',
                instrument: filePopup.instrumentType,
                timestamp: formattedScoreTimestamp,
              }}
              shutterGuardEnabled={shutterGuardEnabled}
              isShutterRevealed={isShutterRevealed}
              onShutterChange={setIsShutterRevealed}
              isFullscreen={isScoreFullscreen}
            />
          </div>

          <DialogFooter className="flex items-center justify-between sm:justify-between pt-2 border-t border-border/60">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Shield className="w-3.5 h-3.5 text-amber-500 shrink-0" />
              <span className="text-[11px] font-mono">
                Confidential Band Score • Downloads and Screenshots Restricted
              </span>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                if (document.fullscreenElement) {
                  document.exitFullscreen?.().catch(() => {});
                  setIsScoreFullscreen(false);
                }
                setFilePopup(prev => ({ ...prev, open: false }));
              }}
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
              Upload your sheet notes into the designated instrument folder in Google Drive and synchronize with the Reference Link sheet.
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

              {/* Dynamic Target Drive Folder Indicator */}
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
