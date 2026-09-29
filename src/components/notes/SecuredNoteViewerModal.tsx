'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  Eye,
  EyeOff,
  Lock,
  X,
  Music,
  FileText,
  AlertTriangle,
  Smartphone,
  Maximize2,
  Minimize2,
  Volume2,
  VolumeX,
  Fingerprint,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { SecurePdfCanvasViewer } from '@/components/notes/SecurePdfCanvasViewer';

interface SecuredNoteViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  tune: {
    id?: string;
    title: string;
    section?: string;
    pdfUrl: string;
    fileName?: string;
    audioUrl?: string;
    difficulty?: string;
    tempo?: string;
  } | null;
  member: {
    name?: string;
    itsNumber?: string;
    section?: string;
    role?: string;
  } | null;
}

export function SecuredNoteViewerModal({
  isOpen,
  onClose,
  tune,
  member,
}: SecuredNoteViewerModalProps) {
  // Security State
  const [isScreenProtected, setIsScreenProtected] = useState(false);
  const [protectionReason, setProtectionReason] = useState<string>('');
  const [securityAlert, setSecurityAlert] = useState<string | null>(null);

  // Phone Anti-Screenshot Shutter Guard (Hold / Touch to Reveal)
  const [shutterGuardEnabled, setShutterGuardEnabled] = useState(true);
  const [isShutterRevealed, setIsShutterRevealed] = useState(false);

  // Audio Playback state (optional if audioUrl is present)
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Viewport / container ref
  const viewerContainerRef = useRef<HTMLDivElement | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

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

  // Format preview URL: convert Google Drive links to /preview, encode spaces, and append #toolbar=0
  const formatSecurePreviewUrl = useCallback((url: string): string => {
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
      const match = clean.match(/\/file\/d\/([a-zA-Z0-9_-]+)/) || clean.match(/id=([a-zA-Z0-9_-]+)/);
      if (match && match[1]) {
        return `https://drive.google.com/file/d/${match[1]}/preview`;
      }
    }

    // Direct PDF URL: hide toolbar, navpanes, scrollbar
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
  }, []);

  // Trigger Security Alert & Blackout on screenshot / unauthorized action
  const triggerSecurityAlert = useCallback((reason: string) => {
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(
          '🔒 CONFIDENTIAL DOCUMENT: Taheri Scout Band Madeh scores are restricted. Screenshots and copies are strictly prohibited.'
        ).catch(() => {});
      }
    } catch {
      // Ignore
    }

    setIsScreenProtected(true);
    setProtectionReason(reason);
    setSecurityAlert(reason);
  }, []);

  // Multi-layered Anti-Screenshot & Screen Capture Protection
  useEffect(() => {
    if (!isOpen) {
      setIsScreenProtected(false);
      setSecurityAlert(null);
      setIsShutterRevealed(false);
      return;
    }

    // Layer 1: Phone / Tablet / Desktop App Switcher & Backgrounding Detection
    const handleVisibilityChange = () => {
      if (document.hidden || document.visibilityState === 'hidden') {
        triggerSecurityAlert('Document viewing paused: Screen backgrounded or app-switcher detected.');
      }
    };

    // Layer 2: Window Focus Loss (Triggered on Snipping Tool, Screenshot shortcut, or Window Switch)
    const handleWindowBlur = () => {
      triggerSecurityAlert('Viewing paused: Screen capture, Snipping Tool, or window switch was detected.');
    };

    // Layer 3: Page Hide
    const handlePageHide = () => {
      triggerSecurityAlert('Viewing paused: Screen was backgrounded.');
    };

    // Layer 4: Keyboard Screenshot Shortcut Interception (Active across all devices)
    const handleKeyDown = (e: KeyboardEvent) => {
      // PrintScreen key
      if (e.key === 'PrintScreen' || e.keyCode === 44) {
        e.preventDefault();
        e.stopPropagation();
        triggerSecurityAlert('Screenshot shortcut (PrintScreen) intercepted.');
        return;
      }

      // Ctrl / Cmd + P (Print)
      if ((e.ctrlKey || e.metaKey) && (e.key === 'p' || e.key === 'P')) {
        e.preventDefault();
        e.stopPropagation();
        triggerSecurityAlert('Printing is strictly prohibited for confidential band scores.');
        return;
      }

      // Ctrl / Cmd + S (Save / Download)
      if ((e.ctrlKey || e.metaKey) && (e.key === 's' || e.key === 'S')) {
        e.preventDefault();
        e.stopPropagation();
        triggerSecurityAlert('Direct file saving or downloading is disabled.');
        return;
      }

      // Windows Snipping Tool (Ctrl + Shift + S or Win + Shift + S)
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 's' || e.key === 'S')) {
        e.preventDefault();
        e.stopPropagation();
        triggerSecurityAlert('Screen Snip / Snipping Tool shortcut blocked.');
        return;
      }

      // macOS Screenshot shortcuts (Cmd + Shift + 3 / 4 / 5)
      if (e.metaKey && e.shiftKey && ['3', '4', '5'].includes(e.key)) {
        e.preventDefault();
        e.stopPropagation();
        triggerSecurityAlert('Screen capture shortcut blocked.');
        return;
      }

      // Escape key to close
      if (e.key === 'Escape') {
        onClose();
      }
    };

    // Layer 5: Clipboard copy / cut prevention
    const handleCopy = (e: ClipboardEvent) => {
      e.preventDefault();
      if (e.clipboardData) {
        e.clipboardData.setData('text/plain', '🔒 CONFIDENTIAL: Taheri Scout Band Madeh Score - Copying Prohibited.');
      }
      triggerSecurityAlert('Copying notes content is prohibited.');
    };

    // Layer 6: BeforePrint detection
    const handleBeforePrint = (e: Event) => {
      e.preventDefault();
      triggerSecurityAlert('Printing is prohibited.');
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleWindowBlur);
    window.addEventListener('pagehide', handlePageHide);
    window.addEventListener('keydown', handleKeyDown, true);
    window.addEventListener('copy', handleCopy);
    window.addEventListener('cut', handleCopy);
    window.addEventListener('beforeprint', handleBeforePrint);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleWindowBlur);
      window.removeEventListener('pagehide', handlePageHide);
      window.removeEventListener('keydown', handleKeyDown, true);
      window.removeEventListener('copy', handleCopy);
      window.removeEventListener('cut', handleCopy);
      window.removeEventListener('beforeprint', handleBeforePrint);
    };
  }, [isOpen, onClose, triggerSecurityAlert]);

  // Toggle fullscreen mode
  const handleToggleFullscreen = () => {
    if (!viewerContainerRef.current) return;
    if (!document.fullscreenElement) {
      viewerContainerRef.current.requestFullscreen?.().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.().catch(() => {});
      setIsFullscreen(false);
    }
  };

  // Toggle Audio playback
  const handleToggleAudio = () => {
    if (!audioRef.current || !tune?.audioUrl) return;
    if (isPlayingAudio) {
      audioRef.current.pause();
      setIsPlayingAudio(false);
    } else {
      audioRef.current.play().then(() => setIsPlayingAudio(true)).catch(() => {});
    }
  };

  if (!isOpen || !tune) return null;

  const previewUrl = formatSecurePreviewUrl(tune.pdfUrl);
  const isImageFile =
    /\.(jpg|jpeg|png|webp|avif)$/i.test(tune.pdfUrl.split('?')[0]) ||
    /\.(jpg|jpeg|png|webp|avif)$/i.test(tune.fileName || '') ||
    tune.pdfUrl.startsWith('data:image');
  const formattedTimestamp = new Date().toISOString().replace('T', ' ').slice(0, 16);

  return (
    <div
      ref={viewerContainerRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-2 sm:p-4 select-none touch-none-callout overflow-hidden"
      onContextMenu={(e) => e.preventDefault()}
      style={{
        WebkitTouchCallout: 'none',
        WebkitUserSelect: 'none',
        userSelect: 'none',
      }}
    >
      {/* Dynamic CSS Print Shield: Completely blanks out page if user invokes print */}
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

      {/* Main Modal Card */}
      <div className="relative w-full max-w-5xl h-[95vh] sm:h-[92vh] flex flex-col bg-card border-2 border-amber-500/40 rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* 1. Header Bar: Document Information & Confidentiality Guard Status */}
        <div className="px-4 py-3 border-b border-border bg-card/95 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center shrink-0 shadow-inner">
              <Lock className="w-4 h-4 text-amber-500" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-serif font-black text-sm sm:text-base text-foreground truncate">
                  {tune.title}
                </h3>
                <Badge variant="outline" className="text-[10px] py-0 px-2 font-bold border-amber-500/50 text-amber-500 bg-amber-500/10">
                  <ShieldCheck className="w-3 h-3 mr-1 inline" />
                  View-Only
                </Badge>
                <Badge variant="outline" className="text-[10px] py-0 px-2 font-mono text-red-400 border-red-500/40 bg-red-500/10">
                  {isMobileOrTablet ? 'Mobile/Tablet Anti-Screenshot' : 'Non-Downloadable'}
                </Badge>
              </div>
              <p className="text-[10px] text-muted-foreground truncate font-mono mt-0.5">
                Licensed to: <span className="font-bold text-foreground">{member?.name || 'Authorized Musician'}</span> • ITS: <span className="text-amber-500 font-bold">{member?.itsNumber || '—'}</span> • {tune.section || member?.section || 'Trumpet'}
              </p>
            </div>
          </div>

          {/* Action & Control Buttons */}
          <div className="flex items-center gap-1.5 sm:gap-2 ml-auto shrink-0">
            {/* Phone Shutter Guard Toggle (Touch to Hold & Reveal) */}
            <Button
              type="button"
              variant={shutterGuardEnabled ? 'default' : 'outline'}
              size="sm"
              onClick={() => {
                setShutterGuardEnabled(!shutterGuardEnabled);
                setIsShutterRevealed(false);
              }}
              className={`text-xs h-8 px-2.5 gap-1.5 transition-all ${
                shutterGuardEnabled
                  ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                  : 'border-amber-500/40 text-amber-500 hover:bg-amber-500/10'
              }`}
              title="Toggle Mobile/Tablet Touch-to-Reveal Shutter for maximum screenshot protection"
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span className="hidden md:inline font-semibold">
                {shutterGuardEnabled ? 'Shutter Guard: ON' : 'Shutter Guard'}
              </span>
            </Button>

            {/* Audio Accompaniment (if audioUrl provided) */}
            {tune.audioUrl && (
              <>
                <audio ref={audioRef} src={tune.audioUrl} onEnded={() => setIsPlayingAudio(false)} />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleToggleAudio}
                  className="text-xs h-8 px-2 border-border hover:bg-accent"
                  title={isPlayingAudio ? 'Mute Audio' : 'Play Tune Audio'}
                >
                  {isPlayingAudio ? (
                    <Volume2 className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                  ) : (
                    <VolumeX className="w-3.5 h-3.5 text-muted-foreground" />
                  )}
                </Button>
              </>
            )}

            {/* Fullscreen Toggle */}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleToggleFullscreen}
              className="text-xs h-8 px-2 border-border hover:bg-accent hidden sm:flex"
              title="Toggle Fullscreen"
            >
              {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            </Button>

            {/* Exit / Close Viewer Button */}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              className="text-xs h-8 px-3 border-red-500/40 text-red-400 hover:bg-red-500/10 hover:text-red-300 font-semibold"
            >
              <X className="w-3.5 h-3.5 mr-1" /> Close
            </Button>
          </div>
        </div>

        {/* 2. Security Notice Banner */}
        <div className="bg-amber-500/10 border-b border-amber-500/20 px-3 py-1.5 text-[11px] text-amber-300/90 flex items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-1.5 overflow-hidden">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping shrink-0" />
            <span className="font-semibold text-amber-200">Confidential Score Guard:</span>
            <span className="truncate">
              Direct downloads, print, and mobile/tablet screenshots are restricted. Dynamic watermark applied.
            </span>
          </div>
          <span className="font-mono text-[10px] text-muted-foreground shrink-0 hidden sm:inline">
            SECURE-VIEW • 1448H
          </span>
        </div>

        {/* 3. Main Document Viewport Area */}
        <div
          className="relative flex-1 bg-zinc-950/95 overflow-hidden flex items-center justify-center"
          onContextMenu={(e) => e.preventDefault()}
        >
          {/* Blackout Shield (When screen lost focus, app switch occurred, or screenshot attempted on mobile/tablet) */}
          {isScreenProtected && (
            <div className="absolute inset-0 z-50 bg-black/98 backdrop-blur-2xl flex flex-col items-center justify-center p-6 text-center select-none animate-in fade-in duration-150">
              <div className="w-16 h-16 rounded-full bg-red-500/20 border-2 border-red-500/40 flex items-center justify-center mb-4 shadow-lg shadow-red-500/10 animate-pulse">
                <ShieldAlert className="w-8 h-8 text-red-500" />
              </div>
              <h3 className="text-xl font-serif font-black text-red-400 mb-1.5 tracking-tight">
                🔒 Viewing Shield Active
              </h3>
              <p className="text-xs text-muted-foreground max-w-md mb-2">
                {protectionReason || 'Document viewing was paused because a screen capture, screenshot gesture, or app-switch was detected on your mobile/tablet device.'}
              </p>
              <div className="bg-amber-500/10 border border-amber-500/30 text-amber-300 px-3.5 py-2 rounded-xl text-xs font-mono mb-6 max-w-sm">
                Member: <span className="font-bold text-foreground">{member?.name || 'Band Musician'}</span>
                <br />
                ITS: <span className="font-bold text-primary">{member?.itsNumber || '—'}</span> • {tune.section || 'Trumpet'}
              </div>
              <Button
                type="button"
                onClick={() => {
                  setIsScreenProtected(false);
                  setSecurityAlert(null);
                }}
                className="bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs px-6 py-2.5 rounded-xl shadow-lg transition-transform active:scale-95"
              >
                <Eye className="w-4 h-4 mr-2" /> Resume Secure Viewing
              </Button>
            </div>
          )}

          {/* Secured Canvas Document Viewer with Anti-Screenshot Shutter & Dynamic Stamped Watermark */}
          <SecurePdfCanvasViewer
              fileUrl={tune.pdfUrl}
              fileName={tune.title}
              isPdf={!isImageFile}
              watermark={{
                name: member?.name || 'Authorized Musician',
                itsNumber: member?.itsNumber || '—',
                instrument: tune.section || member?.section || 'Trumpet',
                timestamp: formattedTimestamp,
              }}
              shutterGuardEnabled={shutterGuardEnabled}
              isShutterRevealed={isShutterRevealed}
              onShutterChange={setIsShutterRevealed}
              isFullscreen={isFullscreen}
            />
          </div>

        {/* 4. Footer: Confidentiality & Compliance Notice */}
        <div className="px-4 py-2.5 border-t border-border bg-card/95 flex flex-wrap items-center justify-between gap-2 shrink-0 text-xs">
          <div className="flex items-center gap-2 text-muted-foreground text-[11px]">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
            <span className="truncate">
              Sacred Madeh score strictly intended for individual rehearsal. Unauthorized copying, screenshots, or distribution are prohibited.
            </span>
          </div>
          <div className="flex items-center gap-2 ml-auto text-[10px] font-mono text-muted-foreground">
            <span>ITS: {member?.itsNumber || '—'}</span>
            <span>•</span>
            <span>Session Protected</span>
          </div>
        </div>
      </div>
    </div>
  );
}
