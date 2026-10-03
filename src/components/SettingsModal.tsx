import React, { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import {
  X, RefreshCw, FolderSearch, Type, Palette, Sun, Moon, Check,
  HardDrive, Monitor, SlidersHorizontal, Cpu, Sparkles, ShieldCheck
} from 'lucide-react';
import type { AppSettings, PrimaryColorKey, ThemeMode, TranscodeProfile } from '../types';
import { ACCENT_PALETTES } from '../utils/themeTokens';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  onUpdateSettings: (newSettings: Partial<AppSettings>) => void;
  onScanFolder: () => void;
  scanning: boolean;
  scanStatus: { current: number; total: number; currentFile: string; added: number; errors: number } | null;
  libraryCount: number;
}

type SettingsTab = 'appearance' | 'transcode' | 'scanner';

const COLOR_OPTIONS: { key: PrimaryColorKey; name: string; hex: string }[] = [
  { key: 'cyan', name: 'Electric Cyan', hex: '#22d3ee' },
  { key: 'pink', name: 'Neon Pink', hex: '#ec4899' },
  { key: 'emerald', name: 'Emerald Green', hex: '#10b981' },
  { key: 'amber', name: 'Golden Amber', hex: '#f59e0b' },
];

const TRANSCODE_PROFILES: { id: TranscodeProfile; label: string; desc: string; resolution: string; crf: string }[] = [
  { id: 'netflix', label: 'Cinema Quality', desc: '1080p High-Bitrate (6 Mbps) with 2-second keyframes', resolution: '1920x1080', crf: 'CRF 18' },
  { id: 'smooth', label: 'High Frame-Rate', desc: '60fps motion smoothing for sports and fluid action', resolution: '1920x1080', crf: '60 FPS' },
  { id: 'standard', label: 'Standard Balanced', desc: 'Balanced CRF 23 encoding for instant web streaming', resolution: '1080p / 720p', crf: 'CRF 23' },
  { id: 'anime', label: 'Anime Enhancer', desc: 'Tuned filter for animated content and line art detail', resolution: 'Original', crf: 'Tuned' },
  { id: 'low', label: 'Fast / Low Bandwidth', desc: '720p 1.5 Mbps for mobile connections and weak WiFi', resolution: '1280x720', crf: 'CRF 28' },
];

export default function SettingsModal({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
  onScanFolder,
  scanning,
  scanStatus,
  libraryCount
}: SettingsModalProps) {
  const [activeTab, setActiveTab] = useState<SettingsTab>('appearance');
  const [isClosing, setIsClosing] = useState(false);

  const backdropRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const tabContentRef = useRef<HTMLDivElement>(null);

  const isLight = settings.theme === 'light';
  const palette = ACCENT_PALETTES[settings.primaryColor]?.[settings.theme] || ACCENT_PALETTES.cyan[settings.theme];

  // GSAP Entrance Choreography
  useGSAP(() => {
    if (!isOpen) return;

    if (backdropRef.current) {
      gsap.fromTo(backdropRef.current,
        { opacity: 0 },
        { opacity: 1, duration: 0.28, ease: 'power2.out' }
      );
    }

    if (cardRef.current) {
      gsap.fromTo(cardRef.current,
        { opacity: 0, scale: 0.92, y: 24, rotateX: 6 },
        { opacity: 1, scale: 1, y: 0, rotateX: 0, duration: 0.38, ease: 'back.out(1.2)' }
      );
    }
  }, [isOpen]);

  // GSAP Tab Switch Content Animation
  useGSAP(() => {
    if (!tabContentRef.current) return;
    gsap.fromTo(tabContentRef.current,
      { opacity: 0, y: 12, scale: 0.98 },
      { opacity: 1, y: 0, scale: 1, duration: 0.24, ease: 'power3.out' }
    );
  }, [activeTab]);

  // Smooth Animated Close
  const handleAnimatedClose = () => {
    if (isClosing) return;
    setIsClosing(true);

    const tl = gsap.timeline({
      onComplete: () => {
        setIsClosing(false);
        onClose();
      }
    });

    if (cardRef.current) {
      tl.to(cardRef.current, {
        opacity: 0,
        y: 18,
        scale: 0.94,
        rotateX: -4,
        duration: 0.22,
        ease: 'power2.in'
      }, 0);
    }

    if (backdropRef.current) {
      tl.to(backdropRef.current, {
        opacity: 0,
        duration: 0.22,
        ease: 'power2.in'
      }, 0);
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <div
      ref={backdropRef}
      className="fixed inset-0 z-modal z-[99999] pointer-events-auto flex items-center justify-center p-4 bg-black/70 backdrop-blur-md"
      style={{ zIndex: 99999 }}
      onClick={(e) => {
        if (e.target === backdropRef.current) handleAnimatedClose();
      }}
    >
      <div
        ref={cardRef}
        className={`w-full max-w-2xl rounded-3xl border shadow-2xl overflow-hidden flex flex-col max-h-[88vh] ${
          isLight ? 'bg-white border-slate-200 text-slate-900' : 'bg-slate-900 border-white/10 text-white'
        }`}
        style={{
          boxShadow: isLight
            ? '0 24px 64px -12px rgba(15, 23, 42, 0.18), 0 0 1px 1px rgba(15, 23, 42, 0.05)'
            : '0 30px 80px -15px rgba(0, 0, 0, 0.9), 0 0 1px 1px rgba(255, 255, 255, 0.1)',
          transformStyle: 'preserve-3d'
        }}
      >
        {/* Header */}
        <div className={`px-6 py-5 border-b flex items-center justify-between shrink-0 ${
          isLight ? 'border-slate-200 bg-slate-50/80' : 'border-white/10 bg-white/5'
        }`}>
          <div className="flex items-center gap-3">
            <div
              className="p-2.5 rounded-2xl flex items-center justify-center transition-colors shadow-sm"
              style={{
                backgroundColor: palette.badgeBg,
                color: palette.primary,
                border: `1px solid ${palette.badgeBorder}`
              }}
            >
              <Monitor className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span
                  className="text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded-full"
                  style={{
                    backgroundColor: palette.badgeBg,
                    color: palette.badgeText,
                    border: `1px solid ${palette.badgeBorder}`
                  }}
                >
                  SYSTEM CONTROL
                </span>
                <span className={`text-xs font-mono ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                  v1.2.0
                </span>
              </div>
              <h2 className="text-lg font-bold tracking-tight mt-0.5">Preferences & Settings</h2>
            </div>
          </div>

          <button
            type="button"
            onClick={handleAnimatedClose}
            className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
              isLight
                ? 'bg-slate-200/60 hover:bg-slate-200 text-slate-600 hover:text-slate-900'
                : 'bg-white/10 hover:bg-white/20 text-white/70 hover:text-white'
            }`}
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Navigation Bar */}
        <div className={`px-6 pt-3 pb-2 border-b flex items-center gap-2 shrink-0 overflow-x-auto custom-scrollbar ${
          isLight ? 'bg-slate-100/60 border-slate-200' : 'bg-black/20 border-white/5'
        }`}>
          {[
            { id: 'appearance' as const, label: 'Appearance & Theme', icon: Palette },
            { id: 'transcode' as const, label: 'Transcoding & Quality', icon: SlidersHorizontal },
            { id: 'scanner' as const, label: 'Library Scanner', icon: FolderSearch }
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all duration-200 select-none ${
                  isActive
                    ? 'text-white shadow-md'
                    : isLight
                    ? 'text-slate-600 hover:text-slate-900 hover:bg-white/80'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
                style={
                  isActive
                    ? {
                        backgroundColor: palette.primary,
                        boxShadow: palette.hoverGlow
                      }
                    : undefined
                }
              >
                <Icon className="w-3.5 h-3.5 flex-none" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab Content Panel */}
        <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
          <div ref={tabContentRef} className="flex flex-col gap-6">
            {/* TAB 1: APPEARANCE & BRANDING */}
            {activeTab === 'appearance' && (
              <>
                {/* Theme Selector */}
                <div className="flex flex-col gap-2.5">
                  <label className="flex items-center gap-2 text-xs font-mono font-bold uppercase tracking-wider opacity-75">
                    {isLight ? <Sun className="w-4 h-4 text-amber-500" /> : <Moon className="w-4 h-4 text-indigo-400" />}
                    Appearance Mode
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => onUpdateSettings({ theme: 'dark' })}
                      className={`flex items-center gap-3.5 p-3.5 rounded-2xl border text-left transition-all ${
                        settings.theme === 'dark'
                          ? 'bg-slate-800 text-white shadow-lg ring-2'
                          : isLight
                          ? 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                          : 'bg-white/5 text-slate-300 border-white/10 hover:bg-white/10'
                      }`}
                      style={
                        settings.theme === 'dark'
                          ? { borderColor: palette.primary, boxShadow: palette.hoverGlow }
                          : undefined
                      }
                    >
                      <div className="w-10 h-10 rounded-xl bg-slate-950 border border-indigo-500/30 flex items-center justify-center shrink-0 text-indigo-400">
                        <Moon className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="font-bold text-sm">Dark Theme</div>
                        <div className="text-xs text-slate-400">Deep slate & obsidian backdrop</div>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => onUpdateSettings({ theme: 'light' })}
                      className={`flex items-center gap-3.5 p-3.5 rounded-2xl border text-left transition-all ${
                        settings.theme === 'light'
                          ? 'bg-white text-slate-900 shadow-md ring-2'
                          : isLight
                          ? 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                          : 'bg-white/5 text-slate-300 border-white/10 hover:bg-white/10'
                      }`}
                      style={
                        settings.theme === 'light'
                          ? { borderColor: palette.primary, boxShadow: palette.hoverGlow }
                          : undefined
                      }
                    >
                      <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center shrink-0 text-amber-500">
                        <Sun className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="font-bold text-sm">Light Theme</div>
                        <div className="text-xs text-slate-500">Crisp high-contrast daytime mode</div>
                      </div>
                    </button>
                  </div>
                </div>

                {/* Primary Accent Color Picker */}
                <div className="flex flex-col gap-2.5">
                  <label className="flex items-center gap-2 text-xs font-mono font-bold uppercase tracking-wider opacity-75">
                    <Palette className="w-4 h-4 text-cyan-400" />
                    Primary Accent Colour & Dynamic Halo
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {COLOR_OPTIONS.map((c) => {
                      const isSelected = settings.primaryColor === c.key;
                      return (
                        <button
                          key={c.key}
                          type="button"
                          onClick={() => onUpdateSettings({ primaryColor: c.key })}
                          className={`flex flex-col items-center gap-2 p-3.5 rounded-2xl border transition-all ${
                            isSelected
                              ? isLight
                                ? 'bg-slate-100 border-slate-400 shadow-md ring-2 ring-slate-400'
                                : 'bg-white/10 border-white/40 shadow-lg ring-2 ring-white/30'
                              : isLight
                              ? 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                              : 'bg-white/5 border-white/10 hover:bg-white/10'
                          }`}
                        >
                          <div
                            className="relative w-9 h-9 rounded-full flex items-center justify-center shadow-md transition-transform hover:scale-105"
                            style={{ backgroundColor: c.hex }}
                          >
                            {isSelected && <Check className="w-4 h-4 text-black drop-shadow font-bold" />}
                          </div>
                          <span className="text-xs font-bold">{c.name}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Application Titles */}
                <div className={`p-5 rounded-2xl border flex flex-col gap-4 ${
                  isLight ? 'bg-slate-50/80 border-slate-200' : 'bg-white/5 border-white/10'
                }`}>
                  <div className="flex flex-col gap-1.5">
                    <label className="flex items-center gap-2 text-xs font-mono font-bold uppercase tracking-wider opacity-75">
                      <Type className="w-4 h-4 text-cyan-400" />
                      Application Title (Navbar Brand)
                    </label>
                    <input
                      type="text"
                      value={settings.appTitle}
                      onChange={(e) => onUpdateSettings({ appTitle: e.target.value })}
                      placeholder="e.g. OggleBox Server"
                      className={`w-full px-4 py-2.5 rounded-xl border text-sm font-medium transition-all outline-none focus:ring-2 ${
                        isLight
                          ? 'bg-white border-slate-300 text-slate-900 focus:ring-slate-300'
                          : 'bg-black/40 border-white/10 text-white focus:ring-cyan-500/50'
                      }`}
                    />
                    <p className={`text-[11px] ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                      Tip: The first word inherits your selected accent color in the header.
                    </p>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="flex items-center gap-2 text-xs font-mono font-bold uppercase tracking-wider opacity-75">
                      <Monitor className="w-4 h-4 text-cyan-400" />
                      Browser Tab Page Title
                    </label>
                    <input
                      type="text"
                      value={settings.pageTitle}
                      onChange={(e) => onUpdateSettings({ pageTitle: e.target.value })}
                      placeholder="e.g. OggleBox - Media Streaming"
                      className={`w-full px-4 py-2.5 rounded-xl border text-sm font-medium transition-all outline-none focus:ring-2 ${
                        isLight
                          ? 'bg-white border-slate-300 text-slate-900 focus:ring-slate-300'
                          : 'bg-black/40 border-white/10 text-white focus:ring-cyan-500/50'
                      }`}
                    />
                  </div>
                </div>
              </>
            )}

            {/* TAB 2: TRANSCODING & QUALITY */}
            {activeTab === 'transcode' && (
              <>
                <div className="flex flex-col gap-2.5">
                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-2 text-xs font-mono font-bold uppercase tracking-wider opacity-75">
                      <Cpu className="w-4 h-4 text-cyan-400" />
                      Real-Time FFmpeg Streaming Profile
                    </label>
                    <span
                      className="text-[10px] font-mono uppercase font-bold px-2 py-0.5 rounded border"
                      style={{
                        backgroundColor: palette.badgeBg,
                        color: palette.badgeText,
                        borderColor: palette.badgeBorder
                      }}
                    >
                      Active: {settings.transcodeProfile?.toUpperCase() || 'STANDARD'}
                    </span>
                  </div>

                  <div className="flex flex-col gap-2.5">
                    {TRANSCODE_PROFILES.map((prof) => {
                      const isSelected = settings.transcodeProfile === prof.id;
                      return (
                        <button
                          key={prof.id}
                          type="button"
                          onClick={() => onUpdateSettings({ transcodeProfile: prof.id })}
                          className={`p-3.5 rounded-2xl border text-left transition-all flex items-center justify-between gap-4 ${
                            isSelected
                              ? isLight
                                ? 'bg-white border-slate-400 shadow-md ring-2 ring-slate-400'
                                : 'bg-white/10 border-white/40 shadow-lg ring-2 ring-white/30'
                              : isLight
                              ? 'bg-slate-50/80 border-slate-200 hover:bg-white'
                              : 'bg-white/5 border-white/10 hover:bg-white/10'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className="w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0"
                              style={{
                                borderColor: isSelected ? palette.primary : isLight ? '#94a3b8' : '#64748b',
                                backgroundColor: isSelected ? palette.primary : 'transparent'
                              }}
                            >
                              {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                            </div>
                            <div>
                              <div className="font-bold text-sm flex items-center gap-2">
                                <span>{prof.label}</span>
                                <span className={`text-[10px] font-mono px-2 py-0.5 rounded border ${
                                  isLight ? 'bg-slate-200/60 border-slate-300 text-slate-700' : 'bg-black/40 border-white/10 text-slate-300'
                                }`}>
                                  {prof.resolution}
                                </span>
                              </div>
                              <p className={`text-xs mt-0.5 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                                {prof.desc}
                              </p>
                            </div>
                          </div>
                          <span className="text-xs font-mono font-bold text-slate-400 flex-none hidden sm:inline">
                            {prof.crf}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className={`p-4 rounded-2xl border text-xs flex items-center gap-3 ${
                  isLight ? 'bg-amber-50/80 border-amber-200 text-amber-900' : 'bg-indigo-950/40 border-indigo-500/30 text-indigo-200'
                }`}>
                  <ShieldCheck className="w-5 h-5 flex-none" />
                  <p>
                    Automatic Direct Play will be prioritized for native browser codecs (H.264/AAC/MP4). Non-standard formats (MKV/HEVC/AVI) automatically trigger live streamed transcoding.
                  </p>
                </div>
              </>
            )}

            {/* TAB 3: LIBRARY & SCANNER */}
            {activeTab === 'scanner' && (
              <>
                <div className={`p-5 rounded-2xl border flex flex-col gap-4 ${
                  isLight ? 'bg-slate-50/80 border-slate-200' : 'bg-white/5 border-white/10'
                }`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 rounded-2xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                        <FolderSearch className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold">Media Directory Scanner</h3>
                        <p className={`text-xs ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                          Scans disk storage, detects video/audio/archives & backfills posters.
                        </p>
                      </div>
                    </div>

                    <div className={`px-3 py-1.5 rounded-xl border text-xs font-mono font-bold ${
                      isLight ? 'bg-white border-slate-200 text-slate-700' : 'bg-black/40 border-white/10 text-white'
                    }`}>
                      {libraryCount} Total Items
                    </div>
                  </div>

                  {scanning && scanStatus && (
                    <div className="flex flex-col gap-2 pt-2">
                      <div className="flex justify-between text-xs font-mono">
                        <span className="truncate max-w-[280px]">{scanStatus.currentFile}</span>
                        <span className="font-bold">{scanStatus.current} / {scanStatus.total}</span>
                      </div>
                      <div className="w-full h-2.5 bg-black/20 rounded-full overflow-hidden">
                        <div
                          className="h-full transition-all duration-200"
                          style={{
                            width: `${scanStatus.total ? (scanStatus.current / scanStatus.total) * 100 : 0}%`,
                            backgroundColor: palette.primary
                          }}
                        />
                      </div>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={onScanFolder}
                    disabled={scanning}
                    className={`w-full py-3 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all ${
                      scanning
                        ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 cursor-not-allowed'
                        : 'text-white shadow-lg hover:scale-[1.01] active:scale-[0.99]'
                    }`}
                    style={
                      !scanning
                        ? {
                            backgroundColor: palette.primary,
                            boxShadow: palette.hoverGlow
                          }
                        : undefined
                    }
                  >
                    {scanning ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        Scanning Media Folders & Extracting Metadata...
                      </>
                    ) : (
                      <>
                        <FolderSearch className="w-4 h-4" />
                        Run Full Media Library Scan Now
                      </>
                    )}
                  </button>
                </div>

                {/* Storage directories info */}
                <div className={`p-4 rounded-2xl border flex flex-col gap-2 text-xs font-mono ${
                  isLight ? 'bg-slate-50 border-slate-200 text-slate-700' : 'bg-white/5 border-white/5 text-slate-300'
                }`}>
                  <div className="flex items-center gap-2 font-bold uppercase tracking-wider text-[10px] text-slate-400">
                    <HardDrive className="w-3.5 h-3.5" />
                    Storage Target Folders
                  </div>
                  <div className={`flex justify-between border-b pb-1.5 ${isLight ? 'border-slate-200' : 'border-white/5'}`}>
                    <span className="text-slate-400">Active Media Root:</span>
                    <span className="font-bold">./media/</span>
                  </div>
                  <div className={`flex justify-between border-b pb-1.5 ${isLight ? 'border-slate-200' : 'border-white/5'}`}>
                    <span className="text-slate-400">WebTorrent Downloads:</span>
                    <span className="font-bold">./media/Torrents/</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Organized Ingest Directory:</span>
                    <span className="font-bold">./media/new/</span>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className={`px-6 py-4 border-t flex items-center justify-between shrink-0 ${
          isLight ? 'border-slate-200 bg-slate-50/80' : 'border-white/10 bg-white/5'
        }`}>
          <div className={`text-xs font-mono ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
            Changes save automatically to localStorage
          </div>
          <button
            type="button"
            onClick={handleAnimatedClose}
            className="px-6 py-2.5 rounded-xl text-white font-bold text-xs shadow-md transition-all hover:scale-105 active:scale-95"
            style={{
              backgroundColor: palette.primary,
              boxShadow: palette.hoverGlow
            }}
          >
            Done
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
