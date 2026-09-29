'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  ChevronLeft,
  ChevronRight,
  RotateCw,
  Fingerprint,
  Smartphone,
  Shield,
  Loader2,
  AlertCircle,
  FileText,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface WatermarkInfo {
  name: string;
  itsNumber: string;
  instrument: string;
  timestamp: string;
}

interface SecurePdfCanvasViewerProps {
  fileUrl: string;
  fileName?: string;
  isPdf: boolean;
  watermark: WatermarkInfo;
  shutterGuardEnabled: boolean;
  isShutterRevealed: boolean;
  onShutterChange: (revealed: boolean) => void;
  isFullscreen?: boolean;
}

declare global {
  interface Window {
    pdfjsLib?: any;
  }
}

export function SecurePdfCanvasViewer({
  fileUrl,
  fileName,
  isPdf,
  watermark,
  shutterGuardEnabled,
  isShutterRevealed,
  onShutterChange,
  isFullscreen = false,
}: SecurePdfCanvasViewerProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [numPages, setNumPages] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [zoomScale, setZoomScale] = useState<number>(1.0);
  const [useIframeFallback, setUseIframeFallback] = useState(false);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const renderTaskRef = useRef<any>(null);

  // Load PDF.js script dynamically if not present
  useEffect(() => {
    if (!isPdf) {
      setIsLoading(false);
      return;
    }

    let isMounted = true;

    const loadPdfJsScript = async (): Promise<boolean> => {
      if (window.pdfjsLib) {
        return true;
      }

      return new Promise<boolean>((resolve) => {
        const existingScript = document.getElementById('pdfjs-core-script') as HTMLScriptElement;
        if (existingScript) {
          existingScript.addEventListener('load', () => resolve(true), { once: true });
          existingScript.addEventListener('error', () => resolve(false), { once: true });
          if (window.pdfjsLib) resolve(true);
          return;
        }

        const script = document.createElement('script');
        script.id = 'pdfjs-core-script';
        script.src = '/vendor/pdfjs/pdf.min.js';
        script.async = true;

        script.onload = () => {
          if (window.pdfjsLib) {
            window.pdfjsLib.GlobalWorkerOptions.workerSrc = '/vendor/pdfjs/pdf.worker.min.js';
            resolve(true);
          } else {
            resolve(false);
          }
        };

        script.onerror = () => resolve(false);
        document.head.appendChild(script);
      });
    };

    const initPdf = async () => {
      setIsLoading(true);
      setLoadError(null);
      setUseIframeFallback(false);

      const hasPdfJs = await loadPdfJsScript();
      if (!isMounted) return;

      if (!hasPdfJs || !window.pdfjsLib) {
        // Fall back to protected sandboxed frame if PDF.js library could not be loaded
        setUseIframeFallback(true);
        setIsLoading(false);
        return;
      }

      try {
        window.pdfjsLib.GlobalWorkerOptions.workerSrc = '/vendor/pdfjs/pdf.worker.min.js';

        // Prepare source: local files and drive URLs routed through secure server streamer to avoid CORS and download headers
        const streamUrl = `/api/tunes/pdf-stream?url=${encodeURIComponent(fileUrl)}`;

        const loadingTask = window.pdfjsLib.getDocument({
          url: streamUrl,
          cMapUrl: '/vendor/pdfjs/cmaps/',
          cMapPacked: true,
          disableRange: false,
          disableStream: false,
        });

        const doc = await loadingTask.promise;
        if (!isMounted) return;

        setPdfDoc(doc);
        setNumPages(doc.numPages);
        setCurrentPage(1);
        setIsLoading(false);
      } catch (err: any) {
        console.warn('PDF.js canvas render could not parse directly, falling back to secure frame:', err);
        if (!isMounted) return;
        setUseIframeFallback(true);
        setIsLoading(false);
      }
    };

    initPdf();

    return () => {
      isMounted = false;
      if (renderTaskRef.current) {
        try {
          renderTaskRef.current.cancel();
        } catch {}
      }
    };
  }, [fileUrl, isPdf]);

  // Render current PDF page onto HTML5 canvas with stamped security watermark
  const renderCurrentPage = useCallback(async () => {
    if (!pdfDoc || !canvasRef.current || !containerRef.current) return;

    try {
      const page = await pdfDoc.getPage(currentPage);
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d', { alpha: false });
      if (!ctx) return;

      if (renderTaskRef.current) {
        try {
          renderTaskRef.current.cancel();
        } catch {}
      }

      const containerWidth = containerRef.current.clientWidth || 600;
      const unscaledViewport = page.getViewport({ scale: 1 });
      const fitScale = Math.min((containerWidth - 24) / unscaledViewport.width, 2.5);
      const effectiveScale = Math.max(fitScale * zoomScale, 0.5);

      const dpr = window.devicePixelRatio || 1;
      const viewport = page.getViewport({ scale: effectiveScale * dpr });

      canvas.width = viewport.width;
      canvas.height = viewport.height;
      canvas.style.width = `${viewport.width / dpr}px`;
      canvas.style.height = `${viewport.height / dpr}px`;

      const renderContext = {
        canvasContext: ctx,
        viewport,
      };

      const task = page.render(renderContext);
      renderTaskRef.current = task;
      await task.promise;

      // Burn diagonal dynamic security watermark directly into the canvas pixels
      ctx.save();
      ctx.scale(dpr, dpr);
      const displayW = viewport.width / dpr;
      const displayH = viewport.height / dpr;

      ctx.rotate((-22 * Math.PI) / 180);
      ctx.font = 'bold 13px sans-serif';
      ctx.fillStyle = 'rgba(217, 119, 54, 0.18)'; // Taheri Amber semi-transparent

      const stepX = 260;
      const stepY = 140;
      const startX = -displayW;
      const endX = displayW * 2;
      const startY = -displayH;
      const endY = displayH * 2;

      for (let y = startY; y < endY; y += stepY) {
        for (let x = startX; x < endX; x += stepX) {
          ctx.fillText('TAHERI SCOUT BAND', x, y);
          ctx.fillText(`${watermark.name.toUpperCase()} (${watermark.itsNumber})`, x, y + 16);
          ctx.fillText(`CONFIDENTIAL • ${watermark.timestamp}`, x, y + 32);
        }
      }

      ctx.restore();
    } catch (err: any) {
      if (err?.name !== 'RenderingCancelledException') {
        console.error('Canvas render error:', err);
      }
    }
  }, [pdfDoc, currentPage, zoomScale, watermark]);

  useEffect(() => {
    if (pdfDoc) {
      renderCurrentPage();
    }
  }, [pdfDoc, currentPage, zoomScale, renderCurrentPage]);

  // Handle window resize to re-render responsive canvas
  useEffect(() => {
    const handleResize = () => {
      if (pdfDoc) {
        renderCurrentPage();
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [pdfDoc, renderCurrentPage]);

  // Clean formatted preview URL for fallback iframe
  const getCleanIframeUrl = (url: string) => {
    if (!url) return '';
    let clean = url.trim();
    if (clean.includes('drive.google.com')) {
      const match = clean.match(/\/file\/d\/([a-zA-Z0-9_-]+)/) || clean.match(/[?&]id=([a-zA-Z0-9_-]+)/);
      if (match && match[1]) {
        return `https://drive.google.com/file/d/${match[1]}/preview`;
      }
    }
    return `/api/tunes/pdf-stream?url=${encodeURIComponent(clean)}`;
  };

  return (
    <div
      ref={containerRef}
      className={cn(
        'relative w-full h-full flex flex-col items-center justify-between select-none overflow-hidden bg-zinc-950',
        isFullscreen ? 'h-[92vh]' : 'h-[72vh] min-h-[460px]'
      )}
      onContextMenu={(e) => e.preventDefault()}
      style={{
        WebkitTouchCallout: 'none',
        WebkitUserSelect: 'none',
        userSelect: 'none',
      }}
    >
      {/* 1. In-Modal Secure Toolbar (Zoom, Page Navigation) */}
      <div className="w-full px-3 py-1.5 bg-zinc-900/90 border-b border-border/60 flex items-center justify-between gap-2 shrink-0 z-30 backdrop-blur-xs">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-mono">
          <Shield className="w-3.5 h-3.5 text-amber-500 shrink-0" />
          <span className="hidden sm:inline font-semibold text-foreground">Canvas Shield:</span>
          <span className="text-[11px] text-amber-400">
            {isPdf && !useIframeFallback ? `Page ${currentPage} of ${numPages || 1}` : 'Secure View'}
          </span>
        </div>

        {/* Page Switcher (if multi-page PDF) */}
        {isPdf && numPages > 1 && !useIframeFallback && (
          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="h-7 px-2 text-xs border-border/60 hover:bg-muted/50"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </Button>
            <span className="text-xs font-mono px-1">
              {currentPage}/{numPages}
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={currentPage >= numPages}
              onClick={() => setCurrentPage((p) => Math.min(numPages, p + 1))}
              className="h-7 px-2 text-xs border-border/60 hover:bg-muted/50"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </Button>
          </div>
        )}

        {/* Zoom Controls */}
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setZoomScale((z) => Math.max(0.6, Number((z - 0.2).toFixed(1))))}
            className="h-7 w-7 p-0 border-border/60 hover:bg-muted/50"
            title="Zoom Out"
          >
            <ZoomOut className="w-3.5 h-3.5 text-muted-foreground" />
          </Button>
          <span className="text-[10px] font-mono text-muted-foreground w-9 text-center">
            {Math.round(zoomScale * 100)}%
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setZoomScale((z) => Math.min(2.5, Number((z + 0.2).toFixed(1))))}
            className="h-7 w-7 p-0 border-border/60 hover:bg-muted/50"
            title="Zoom In"
          >
            <ZoomIn className="w-3.5 h-3.5 text-muted-foreground" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setZoomScale(1.0)}
            className="h-7 px-1.5 text-[10px] font-mono text-muted-foreground hover:text-foreground"
            title="Reset Zoom"
          >
            Reset
          </Button>
        </div>
      </div>

      {/* 2. Main Document Viewport */}
      <div
        className={cn(
          'relative w-full flex-1 flex items-center justify-center overflow-auto p-2',
          shutterGuardEnabled && isShutterRevealed ? 'cursor-grab active:cursor-grabbing' : ''
        )}
        onTouchStart={() => {
          if (shutterGuardEnabled) onShutterChange(true);
        }}
        onTouchEnd={() => {
          if (shutterGuardEnabled) onShutterChange(false);
        }}
        onTouchCancel={() => {
          if (shutterGuardEnabled) onShutterChange(false);
        }}
        onMouseDown={() => {
          if (shutterGuardEnabled) onShutterChange(true);
        }}
        onMouseUp={() => {
          if (shutterGuardEnabled) onShutterChange(false);
        }}
        onMouseLeave={() => {
          if (shutterGuardEnabled) onShutterChange(false);
        }}
      >
        {/* Anti-Screenshot Touch & Hold Shutter Overlay */}
        {shutterGuardEnabled && !isShutterRevealed && (
          <div
            className="absolute inset-0 z-40 bg-zinc-950/98 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center select-none cursor-pointer"
            onTouchStart={(e) => {
              e.preventDefault();
              onShutterChange(true);
            }}
            onMouseDown={(e) => {
              e.preventDefault();
              onShutterChange(true);
            }}
          >
            <div className="w-16 h-16 rounded-2xl bg-amber-500/20 border-2 border-amber-500/50 flex items-center justify-center mb-4 shadow-xl shadow-amber-500/10 animate-bounce">
              <Fingerprint className="w-9 h-9 text-amber-400" />
            </div>
            <h4 className="text-lg font-serif font-black text-foreground mb-1 tracking-tight">
              Touch &amp; Hold to View Score
            </h4>
            <p className="text-xs text-muted-foreground max-w-sm mb-4 leading-relaxed">
              Confidentiality Shield is active. Keep your finger pressed anywhere on this screen to read the notes. Releasing instantly conceals the document to block screenshots.
            </p>
            <div className="inline-flex items-center gap-2 text-xs font-semibold px-4 py-2 rounded-full border border-amber-500/40 bg-amber-500/15 text-amber-400 shadow-md">
              <Smartphone className="w-4 h-4 animate-pulse" /> Press &amp; Hold Screen
            </div>
          </div>
        )}

        {/* Dynamic High-Density Repeating Watermark (DOM Overlay Layer) */}
        <div
          className="absolute inset-0 z-30 pointer-events-none select-none overflow-hidden flex flex-wrap content-start justify-around gap-12 sm:gap-16 p-6 opacity-[0.28] dark:opacity-[0.32]"
          aria-hidden="true"
        >
          {Array.from({ length: 30 }).map((_, idx) => (
            <div
              key={idx}
              className="transform -rotate-25 text-center font-mono font-bold text-[10px] sm:text-[11px] tracking-wider leading-relaxed text-foreground select-none"
            >
              <div className="text-amber-500 font-black">TAHERI SCOUT BAND</div>
              <div className="font-extrabold text-foreground">{watermark.name.toUpperCase()}</div>
              <div>ITS: {watermark.itsNumber} • {watermark.instrument}</div>
              <div className="text-[9px] text-red-400 font-sans font-black uppercase">
                CONFIDENTIAL • DO NOT SCREENSHOT • {watermark.timestamp}
              </div>
            </div>
          ))}
        </div>

        {/* Loading Spinner */}
        {isLoading && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-zinc-950/80">
            <Loader2 className="w-8 h-8 text-amber-500 animate-spin mb-3" />
            <p className="text-xs text-muted-foreground font-mono">Securing &amp; Rendering Score...</p>
          </div>
        )}

        {/* 1. PDF Canvas Rendering (Strictly no external links, zero downloads) */}
        {isPdf && !useIframeFallback ? (
          <div className="relative flex items-center justify-center max-w-full max-h-full">
            <canvas
              ref={canvasRef}
              className="rounded-lg shadow-2xl bg-white max-w-full object-contain pointer-events-none"
              style={{
                userSelect: 'none',
                WebkitTouchCallout: 'none',
              }}
            />
          </div>
        ) : isPdf && useIframeFallback ? (
          /* 2. Sandboxed Iframe Fallback: STRICTLY BLOCKS POPUPS & LINKS */
          <div className="relative w-full h-full flex flex-col">
            {/* Top Toolbar Shield: Blocks Google Drive's Popout & Download Button */}
            <div
              className="absolute top-0 left-0 right-0 h-14 z-30 bg-transparent cursor-default"
              title="Protected Document Toolbar"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
            />
            <iframe
              src={getCleanIframeUrl(fileUrl)}
              title={fileName || 'Tune Score'}
              sandbox="allow-scripts allow-same-origin allow-forms"
              className="w-full h-full rounded-lg border-0 bg-white"
              onContextMenu={(e) => e.preventDefault()}
            />
          </div>
        ) : (
          /* 3. Image File Rendering (PNG / JPG / WEBP) */
          <div className="relative max-h-full max-w-full overflow-auto flex items-center justify-center p-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={
                fileUrl.startsWith('data:')
                  ? fileUrl
                  : `/api/tunes/pdf-stream?url=${encodeURIComponent(fileUrl)}`
              }
              alt={fileName || 'Tune Score'}
              draggable={false}
              onContextMenu={(e) => e.preventDefault()}
              className="max-h-[75vh] w-auto object-contain rounded-lg shadow-2xl select-none pointer-events-none"
              style={{
                transform: `scale(${zoomScale})`,
                transition: 'transform 0.15s ease',
              }}
              onLoad={() => setIsLoading(false)}
              onError={() => {
                setIsLoading(false);
                setLoadError('Failed to load score image file.');
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
