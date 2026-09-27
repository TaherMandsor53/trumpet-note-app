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

interface SecuredNoteViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  tune: {
    id?: string;
    title: string;
    section?: string;
    pdfUrl: string;
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
  const [shutterGuardEnabled, setShutterGuardEnabled] = useState(false);
  const [isShutterRevealed, setIsShutterRevealed] = useState(false);

  // Audio Playback state (optional if audioUrl is present)
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Viewport / container ref
  const viewerContainerRef = useRef<HTMLDivElement | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Format preview URL: convert Google Drive links to /preview and append #toolbar=0
  const formatSecurePreviewUrl = useCallback((url: string): string => {
    if (!url) return '';
    let clean = url.trim();

    // Google Drive URL transformation
    if (clean.includes('drive.google.com')) {
      const match = clean.match(/\/file\/d\/([a-zA-Z0-9_-]+)/) || clean.match(/id=([a-zA-Z0-9_-]+)/);
      if (match && match[1]) {
        return `https://drive.google.com/file/d/${match[1]}/preview`;
      }
    }

    // Direct PDF URL: hide toolbar, navpanes, scrollbar
    if (clean.toLowerCase().includes('.pdf')) {
      if (!clean.includes('#')) {
        return `${clean}#toolbar=0&navpanes=0&scrollbar=0`;
      }
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

    // Layer 1: Phone App Switcher & Backgrounding Detection (fires on mobile screenshot gesture or app switch)
    const handleVisibilityChange = () => {
      if (document.hidden || document.visibilityState === 'hidden') {
        triggerSecurityAlert('Phone app-switcher, notification shade, or screenshot gesture detected.');
      }
    };

    // Layer 2: Window Focus Loss (Triggered on Android/iOS when screenshotting or notification shade pulled)
    const handleWindowBlur = () => {
      triggerSecurityAlert('Viewing paused: Window lost focus or screen capture was initiated.');
    };

    // Layer 3: Page Hide
    const handlePageHide = () => {
      triggerSecurityAlert('Screen backgrounded.');
    };

    // Layer 4: Keyboard Screenshot Shortcut Interception
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
  const isImageFile = /\.(jpg|jpeg|png|webp|avif)$/i.test(tune.pdfUrl.split('?')[0]);
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
                  No Screenshots
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
              title="Toggle Phone Touch-to-Reveal Shutter for maximum screenshot protection"
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
              Direct downloads, print, and phone screenshots are restricted. Dynamic watermark applied.
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
          {/* Blackout Shield (When screen lost focus, app switch occurred, or screenshot attempted) */}
          {isScreenProtected && (
            <div className="absolute inset-0 z-50 bg-black/98 backdrop-blur-2xl flex flex-col items-center justify-center p-6 text-center select-none animate-in fade-in duration-150">
              <div className="w-16 h-16 rounded-full bg-red-500/20 border-2 border-red-500/40 flex items-center justify-center mb-4 shadow-lg shadow-red-500/10 animate-pulse">
                <ShieldAlert className="w-8 h-8 text-red-500" />
              </div>
              <h3 className="text-xl font-serif font-black text-red-400 mb-1.5 tracking-tight">
                🔒 Viewing Shield Active
              </h3>
              <p className="text-xs text-muted-foreground max-w-md mb-2">
                {protectionReason || 'Document viewing was paused because the phone screen lost focus, an app-switch was detected, or a screenshot shortcut was intercepted.'}
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

          {/* Phone Shutter Guard (Touch / Hold Screen to Reveal) */}
          {shutterGuardEnabled && !isShutterRevealed && !isScreenProtected && (
            <div
              className="absolute inset-0 z-40 bg-zinc-950/96 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center select-none cursor-pointer"
              onTouchStart={() => setIsShutterRevealed(true)}
              onTouchEnd={() => setIsShutterRevealed(false)}
              onMouseDown={() => setIsShutterRevealed(true)}
              onMouseUp={() => setIsShutterRevealed(false)}
              onMouseLeave={() => setIsShutterRevealed(false)}
            >
              <div className="w-16 h-16 rounded-2xl bg-amber-500/20 border-2 border-amber-500/40 flex items-center justify-center mb-4 shadow-lg animate-bounce">
                <Fingerprint className="w-8 h-8 text-amber-400" />
              </div>
              <h4 className="text-lg font-serif font-bold text-foreground mb-1">
                Touch &amp; Hold to View Note
              </h4>
              <p className="text-xs text-muted-foreground max-w-sm mb-4">
                Anti-Screenshot Shutter Guard is active. Keep your finger pressed anywhere on this screen to read the score. Releasing will immediately cover the document.
              </p>
              <div className="inline-flex items-center gap-2 text-xs font-semibold px-4 py-2 rounded-full border border-amber-500/40 bg-amber-500/10 text-amber-400">
                <Smartphone className="w-4 h-4" /> Press &amp; Hold to Reveal
              </div>
            </div>
          )}

          {/* Dynamic Repeating High-Density Watermark Overlay */}
          <div
            className="absolute inset-0 z-30 pointer-events-none select-none overflow-hidden flex flex-wrap content-start justify-around gap-12 sm:gap-16 p-6 opacity-[0.24] dark:opacity-[0.28]"
            aria-hidden="true"
            style={{
              WebkitTouchCallout: 'none',
              WebkitUserSelect: 'none',
              userSelect: 'none',
            }}
          >
            {Array.from({ length: 30 }).map((_, idx) => (
              <div
                key={idx}
                className="transform -rotate-25 text-center font-mono font-bold text-[10px] sm:text-[11px] tracking-wider leading-relaxed text-foreground select-none"
              >
                <div className="text-amber-500/90 font-black">TAHERI SCOUT BAND</div>
                <div className="font-semibold text-foreground">{member?.name?.toUpperCase()}</div>
                <div>ITS: {member?.itsNumber || '—'} • {member?.section || 'Trumpet'}</div>
                <div className="text-[9px] text-red-400 font-sans font-extrabold uppercase">
                  CONFIDENTIAL • DO NOT SCREENSHOT • {formattedTimestamp}
                </div>
              </div>
            ))}
          </div>

          {/* Document Render Area (PDF / Drive Preview / Image) */}
          <div
            className={`w-full h-full flex items-center justify-center overflow-auto p-1 sm:p-2 transition-all ${
              shutterGuardEnabled && isShutterRevealed ? 'cursor-grab active:cursor-grabbing' : ''
            }`}
            onTouchEnd={() => {
              if (shutterGuardEnabled) setIsShutterRevealed(false);
            }}
            onMouseUp={() => {
              if (shutterGuardEnabled) setIsShutterRevealed(false);
            }}
          >
            {isImageFile ? (
              <div className="relative max-h-full max-w-full overflow-auto flex items-center justify-center p-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={previewUrl}
                  alt={tune.title}
                  draggable={false}
                  onContextMenu={(e) => e.preventDefault()}
                  className="max-h-[80vh] w-auto object-contain rounded-lg shadow-2xl select-none pointer-events-auto"
                />
              </div>
            ) : (
              <div className="relative w-full h-full flex flex-col">
                <iframe
                  src={previewUrl}
                  title={tune.title}
                  sandbox="allow-scripts allow-same-origin allow-forms"
                  className="w-full h-full rounded-lg border-0 bg-white"
                  onContextMenu={(e) => e.preventDefault()}
                />
              </div>
            )}
          </div>
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
