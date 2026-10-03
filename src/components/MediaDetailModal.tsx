import React, { useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import {
  X, Play, Music, Disc, Download, Zap, RefreshCw, FileText,
  HardDrive, Calendar, Search
} from 'lucide-react';
import type { MediaItem, PrimaryColorKey, ThemeMode } from '../types';
import { ACCENT_PALETTES } from '../utils/themeTokens';

interface MediaDetailModalProps {
  isOpen: boolean;
  item: MediaItem | null;
  onClose: () => void;
  onPlay: (item: MediaItem) => void;
  onOpenDeepMeta: (item: MediaItem) => void;
  onRegenerateThumbnail?: (item: MediaItem) => void;
  regenerating?: boolean;
  theme?: ThemeMode;
  primaryColor?: PrimaryColorKey;
}

export default function MediaDetailModal({
  isOpen,
  item,
  onClose,
  onPlay,
  onOpenDeepMeta,
  onRegenerateThumbnail,
  regenerating = false,
  theme = 'dark',
  primaryColor = 'cyan'
}: MediaDetailModalProps) {
  const [isClosing, setIsClosing] = useState(false);
  const backdropRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  const isLight = theme === 'light';
  const palette = ACCENT_PALETTES[primaryColor]?.[theme] || ACCENT_PALETTES.cyan[theme];

  // GSAP 3D Entrance
  useGSAP(() => {
    if (!isOpen) return;

    if (backdropRef.current) {
      gsap.fromTo(backdropRef.current,
        { opacity: 0 },
        { opacity: 1, duration: 0.26, ease: 'power2.out' }
      );
    }

    if (cardRef.current) {
      gsap.fromTo(cardRef.current,
        { opacity: 0, scale: 0.92, y: 22, rotateX: 6 },
        { opacity: 1, scale: 1, y: 0, rotateX: 0, duration: 0.36, ease: 'back.out(1.2)' }
      );
    }
  }, [isOpen]);

  const handleAnimatedClose = (action?: () => void) => {
    if (isClosing) return;
    setIsClosing(true);

    const tl = gsap.timeline({
      onComplete: () => {
        setIsClosing(false);
        onClose();
        if (action) action();
      }
    });

    if (cardRef.current) {
      tl.to(cardRef.current, {
        opacity: 0,
        y: 16,
        scale: 0.93,
        rotateX: -4,
        duration: 0.2,
        ease: 'power2.in'
      }, 0);
    }

    if (backdropRef.current) {
      tl.to(backdropRef.current, {
        opacity: 0,
        duration: 0.2,
        ease: 'power2.in'
      }, 0);
    }
  };

  if (!isOpen || !item) return null;

  return createPortal(
    <div
      ref={backdropRef}
      className="fixed inset-0 z-modal z-[99999] pointer-events-auto flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
      style={{ zIndex: 99999 }}
      onClick={(e) => {
        if (e.target === backdropRef.current) handleAnimatedClose();
      }}
    >
      <div
        ref={cardRef}
        className={`w-full max-w-lg rounded-3xl border shadow-2xl p-6 relative flex flex-col gap-5 ${
          isLight ? 'bg-white border-slate-200 text-slate-900' : 'bg-slate-900 border-white/10 text-white'
        }`}
        style={{
          boxShadow: isLight
            ? '0 24px 64px -12px rgba(15, 23, 42, 0.18), 0 0 1px 1px rgba(15, 23, 42, 0.05)'
            : '0 30px 80px -15px rgba(0, 0, 0, 0.9), 0 0 1px 1px rgba(255, 255, 255, 0.1)',
          transformStyle: 'preserve-3d'
        }}
      >
        <button
          type="button"
          onClick={() => handleAnimatedClose()}
          className={`absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
            isLight
              ? 'bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900'
              : 'bg-white/5 hover:bg-white/10 text-white/60 hover:text-white'
          }`}
          title="Close"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Media Preview & Title Info */}
        <div className="flex items-center gap-4">
          <div className="w-20 h-28 rounded-2xl overflow-hidden relative border border-white/10 shrink-0 bg-black flex items-center justify-center shadow-md">
            {item.mediaType === 'audio' ? (
              <div className="w-full h-full bg-gradient-to-br from-indigo-950 via-slate-900 to-purple-950 flex flex-col items-center justify-center p-2 text-center">
                <Music className="w-8 h-8 text-indigo-400 mb-1" />
                <span className="text-[8px] font-mono text-indigo-300 uppercase font-bold">Audio Track</span>
              </div>
            ) : item.mediaType === 'binary' ? (
              <div className="w-full h-full bg-gradient-to-br from-amber-950 via-slate-900 to-orange-950 flex flex-col items-center justify-center p-2 text-center">
                <Disc className="w-8 h-8 text-amber-400 mb-1" />
                <span className="text-[8px] font-mono text-amber-300 uppercase font-bold">ISO / Archive</span>
              </div>
            ) : (
              <img src={item.poster} alt={item.title} className="w-full h-full object-cover" />
            )}
          </div>

          <div className="overflow-hidden flex-1">
            <span
              className="text-[10px] font-mono uppercase tracking-widest px-2.5 py-0.5 rounded-full inline-block font-bold mb-1"
              style={{
                backgroundColor: palette.badgeBg,
                color: palette.badgeText,
                border: `1px solid ${palette.badgeBorder}`
              }}
            >
              media/{item.category || 'Root'}
            </span>
            <h3 className="text-lg font-bold truncate leading-snug">{item.title}</h3>
            <p className={`text-xs font-mono truncate mt-0.5 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
              {item.filename}
            </p>
          </div>
        </div>

        {/* Metadata Details Grid */}
        <div className={`grid grid-cols-2 gap-3 text-xs p-4 rounded-2xl border ${
          isLight ? 'bg-slate-50 border-slate-200 text-slate-700' : 'bg-white/5 border-white/5 text-slate-300'
        }`}>
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 flex-none" style={{ color: palette.primary }} />
            <span>Format: <strong>{item.format?.toUpperCase() || 'MP4'}</strong></span>
          </div>
          <div className="flex items-center gap-2">
            <HardDrive className="w-4 h-4 flex-none" style={{ color: palette.primary }} />
            <span>Size: <strong>{item.sizeFormatted || 'Unknown'}</strong></span>
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 flex-none" style={{ color: palette.primary }} />
            <span>Modified: <strong>{item.modifiedAt || item.year || 'N/A'}</strong></span>
          </div>
          <div className="flex items-center gap-2 truncate">
            <Search className="w-4 h-4 flex-none shrink-0" style={{ color: palette.primary }} />
            <span className="truncate">Path: <strong>{item.path || item.filename}</strong></span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3">
          {item.mediaType === 'binary' ? (
            <a
              href={item.url}
              download={item.filename}
              className="flex-1 text-black font-bold py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 shadow-md hover:opacity-90 transition-opacity bg-gradient-to-r from-amber-400 to-amber-500 text-xs"
            >
              <Download className="w-4 h-4" />
              <span>Download File</span>
            </a>
          ) : (
            <button
              type="button"
              onClick={() => handleAnimatedClose(() => onPlay(item))}
              className="flex-1 text-white font-bold py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 shadow-md hover:scale-[1.02] active:scale-[0.98] transition-all text-xs"
              style={
                item.mediaType === 'audio'
                  ? { backgroundImage: 'linear-gradient(to right, #6366f1, #9333ea)' }
                  : { backgroundColor: palette.primary, boxShadow: palette.hoverGlow }
              }
            >
              {item.mediaType === 'audio' ? (
                <>
                  <Music className="w-4 h-4" />
                  <span>Play Audio</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-current" />
                  <span>Play Video</span>
                </>
              )}
            </button>
          )}

          <button
            type="button"
            onClick={() => handleAnimatedClose(() => onOpenDeepMeta(item))}
            className="font-bold py-2.5 px-4 rounded-xl flex items-center justify-center gap-1.5 border transition-all text-xs hover:scale-105 active:scale-95"
            style={{
              backgroundColor: palette.badgeBg,
              color: palette.badgeText,
              borderColor: palette.badgeBorder
            }}
          >
            <Zap className="w-4 h-4" />
            <span>DEEP Meta</span>
          </button>

          {item.mediaType !== 'audio' && item.mediaType !== 'binary' && onRegenerateThumbnail && (
            <button
              type="button"
              onClick={() => onRegenerateThumbnail(item)}
              disabled={regenerating}
              className={`font-medium py-2.5 px-3 rounded-xl flex items-center justify-center gap-1.5 transition-colors border ${
                isLight ? 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-300' : 'bg-white/10 hover:bg-white/20 text-white border-white/10'
              }`}
              title="Regenerate Poster Thumbnail"
            >
              <RefreshCw className={`w-4 h-4 ${regenerating ? 'animate-spin' : ''}`} style={regenerating ? { color: palette.primary } : undefined} />
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
