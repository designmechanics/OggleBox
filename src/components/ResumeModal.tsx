import React, { useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { X, Play, RotateCcw } from 'lucide-react';
import type { MediaItem, PrimaryColorKey, ThemeMode } from '../types';
import { ACCENT_PALETTES } from '../utils/themeTokens';

interface ResumeModalProps {
  isOpen: boolean;
  item: MediaItem | null;
  onClose: () => void;
  onResume: (item: MediaItem) => void;
  onStartOver: (item: MediaItem) => void;
  theme?: ThemeMode;
  primaryColor?: PrimaryColorKey;
}

export default function ResumeModal({
  isOpen,
  item,
  onClose,
  onResume,
  onStartOver,
  theme = 'dark',
  primaryColor = 'cyan'
}: ResumeModalProps) {
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
        { opacity: 1, duration: 0.24, ease: 'power2.out' }
      );
    }

    if (cardRef.current) {
      gsap.fromTo(cardRef.current,
        { opacity: 0, scale: 0.9, y: 20, rotateX: 6 },
        { opacity: 1, scale: 1, y: 0, rotateX: 0, duration: 0.35, ease: 'back.out(1.2)' }
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
        scale: 0.92,
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

  const formatTime = (timeInSeconds: number) => {
    if (isNaN(timeInSeconds) || timeInSeconds <= 0) return '0:00';
    const hours = Math.floor(timeInSeconds / 3600);
    const minutes = Math.floor((timeInSeconds % 3600) / 60);
    const seconds = Math.floor(timeInSeconds % 60);
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const progressPercent = Math.round(
    parseFloat(localStorage.getItem(`motionstream_progress_percent_${item.id}`) || '0')
  );
  const savedTimeSec = parseFloat(
    localStorage.getItem(`motionstream_progress_${item.id}`) || '0'
  );

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
        className={`w-full max-w-sm rounded-3xl border shadow-2xl p-6 relative flex flex-col gap-4 ${
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

        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0"
            style={{
              backgroundColor: palette.badgeBg,
              color: palette.primary,
              border: `1px solid ${palette.badgeBorder}`
            }}
          >
            <Play className="w-5 h-5 fill-current ml-0.5" />
          </div>
          <div>
            <h3 className="text-lg font-bold">Resume Playback?</h3>
            <p className={`text-xs ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
              You left off at <strong style={{ color: palette.primary }}>{progressPercent}%</strong>
              {savedTimeSec > 0 && <span className="opacity-75"> ({formatTime(savedTimeSec)})</span>}
            </p>
          </div>
        </div>

        {/* Progress bar preview */}
        <div className="w-full h-2 bg-black/20 rounded-full overflow-hidden">
          <div
            className="h-full transition-all duration-300 rounded-full"
            style={{
              width: `${Math.min(100, Math.max(0, progressPercent))}%`,
              backgroundColor: palette.primary
            }}
          />
        </div>

        <div className="flex gap-3 pt-1">
          <button
            type="button"
            onClick={() => handleAnimatedClose(() => onStartOver(item))}
            className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 border transition-all ${
              isLight
                ? 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
                : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
            }`}
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Start Over</span>
          </button>
          <button
            type="button"
            onClick={() => handleAnimatedClose(() => onResume(item))}
            className="flex-1 py-2.5 px-4 rounded-xl text-xs font-bold text-white shadow-lg transition-all flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-[0.98]"
            style={{
              backgroundColor: palette.primary,
              boxShadow: palette.hoverGlow
            }}
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>Resume</span>
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
