import React from 'react';
import { X, RefreshCw, FolderSearch, Type, Palette, Sun, Moon, Check, HardDrive, Monitor } from 'lucide-react';
import type { AppSettings, PrimaryColorKey, ThemeMode } from '../types';

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

const COLOR_OPTIONS: { key: PrimaryColorKey; name: string; hex: string; bgClass: string; textClass: string; borderClass: string }[] = [
  { key: 'cyan', name: 'Electric Cyan', hex: '#22d3ee', bgClass: 'bg-cyan-500', textClass: 'text-cyan-400', borderClass: 'border-cyan-500' },
  { key: 'pink', name: 'Neon Pink', hex: '#ec4899', bgClass: 'bg-pink-500', textClass: 'text-pink-400', borderClass: 'border-pink-500' },
  { key: 'emerald', name: 'Emerald Green', hex: '#10b981', bgClass: 'bg-emerald-500', textClass: 'text-emerald-400', borderClass: 'border-emerald-500' },
  { key: 'amber', name: 'Golden Amber', hex: '#f59e0b', bgClass: 'bg-amber-500', textClass: 'text-amber-400', borderClass: 'border-amber-500' },
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
  if (!isOpen) return null;

  const isLight = settings.theme === 'light';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-fadeIn">
      <div className={`w-full max-w-lg rounded-3xl border shadow-2xl overflow-hidden transition-all duration-300 ${
        isLight ? 'bg-white border-slate-200 text-slate-800' : 'bg-slate-900 border-white/10 text-white'
      }`}>
        {/* Header */}
        <div className={`px-6 py-5 border-b flex items-center justify-between ${
          isLight ? 'border-slate-200 bg-slate-50' : 'border-white/10 bg-white/5'
        }`}>
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-xl ${isLight ? 'bg-slate-200/80 text-slate-700' : 'bg-white/10 text-cyan-400'}`}>
              <Monitor className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold">Preferences & Settings</h2>
              <p className={`text-xs ${isLight ? 'text-slate-500' : 'text-white/50'}`}>Customize theme, title & scan library</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className={`p-2 rounded-full transition-colors ${
              isLight ? 'hover:bg-slate-200 text-slate-500 hover:text-slate-900' : 'hover:bg-white/10 text-white/60 hover:text-white'
            }`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto custom-scrollbar">
          {/* App Title Customization */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider opacity-80">
              <Type className="w-4 h-4 text-cyan-400" />
              Application Title
            </label>
            <input
              type="text"
              value={settings.appTitle}
              onChange={(e) => onUpdateSettings({ appTitle: e.target.value })}
              placeholder="e.g. MOTION STREAM"
              className={`w-full px-4 py-2.5 rounded-xl border text-sm font-medium transition-all outline-none focus:ring-2 focus:ring-cyan-500/50 ${
                isLight 
                  ? 'bg-slate-50 border-slate-300 text-slate-900 focus:bg-white' 
                  : 'bg-black/40 border-white/10 text-white focus:bg-black/60'
              }`}
            />
            <p className={`text-[11px] ${isLight ? 'text-slate-500' : 'text-white/40'}`}>
              Note: The 1st word will be highlighted with your selected primary accent color.
            </p>
          </div>

          {/* Browser Webpage Title */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider opacity-80">
              <Monitor className="w-4 h-4 text-cyan-400" />
              Browser Tab Title
            </label>
            <input
              type="text"
              value={settings.pageTitle}
              onChange={(e) => onUpdateSettings({ pageTitle: e.target.value })}
              placeholder="e.g. Motion Stream - Media Library"
              className={`w-full px-4 py-2.5 rounded-xl border text-sm font-medium transition-all outline-none focus:ring-2 focus:ring-cyan-500/50 ${
                isLight 
                  ? 'bg-slate-50 border-slate-300 text-slate-900 focus:bg-white' 
                  : 'bg-black/40 border-white/10 text-white focus:bg-black/60'
              }`}
            />
          </div>

          {/* Primary Color Picker */}
          <div className="space-y-3">
            <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider opacity-80">
              <Palette className="w-4 h-4 text-cyan-400" />
              Primary Accent Colour
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {COLOR_OPTIONS.map((c) => {
                const isSelected = settings.primaryColor === c.key;
                return (
                  <button
                    key={c.key}
                    onClick={() => onUpdateSettings({ primaryColor: c.key })}
                    className={`flex flex-col items-center gap-2 p-3 rounded-2xl border transition-all ${
                      isSelected
                        ? isLight
                          ? 'bg-slate-100 border-slate-400 shadow-md ring-2 ring-slate-400'
                          : 'bg-white/10 border-white/40 shadow-lg ring-2 ring-white/30'
                        : isLight
                        ? 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                        : 'bg-white/5 border-white/10 hover:bg-white/10'
                    }`}
                  >
                    <div className="relative w-8 h-8 rounded-full flex items-center justify-center shadow-inner" style={{ backgroundColor: c.hex }}>
                      {isSelected && <Check className="w-4 h-4 text-black drop-shadow" />}
                    </div>
                    <span className="text-xs font-semibold">{c.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Theme Selector */}
          <div className="space-y-3">
            <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider opacity-80">
              {isLight ? <Sun className="w-4 h-4 text-amber-500" /> : <Moon className="w-4 h-4 text-indigo-400" />}
              Appearance Mode
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => onUpdateSettings({ theme: 'dark' })}
                className={`flex items-center justify-center gap-2.5 py-3 rounded-2xl border font-semibold text-xs transition-all ${
                  settings.theme === 'dark'
                    ? 'bg-slate-800 text-white border-cyan-500/50 shadow-md ring-2 ring-cyan-500/30'
                    : isLight
                    ? 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    : 'bg-white/5 text-white/70 border-white/10 hover:bg-white/10'
                }`}
              >
                <Moon className="w-4 h-4 text-indigo-400" />
                Dark Theme
              </button>
              <button
                onClick={() => onUpdateSettings({ theme: 'light' })}
                className={`flex items-center justify-center gap-2.5 py-3 rounded-2xl border font-semibold text-xs transition-all ${
                  settings.theme === 'light'
                    ? 'bg-white text-slate-900 border-amber-500/50 shadow-md ring-2 ring-amber-500/30'
                    : isLight
                    ? 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    : 'bg-white/5 text-white/70 border-white/10 hover:bg-white/10'
                }`}
              >
                <Sun className="w-4 h-4 text-amber-500" />
                Light Theme
              </button>
            </div>
          </div>

          {/* Scan Folder Section */}
          <div className={`p-4 rounded-2xl border space-y-3 ${
            isLight ? 'bg-slate-50 border-slate-200' : 'bg-white/5 border-white/10'
          }`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <FolderSearch className="w-5 h-5 text-cyan-400" />
                <div>
                  <h3 className="text-sm font-bold">Media Directory Scanner</h3>
                  <p className={`text-xs ${isLight ? 'text-slate-500' : 'text-white/50'}`}>
                    Scan disk for new videos & auto-generate posters ({libraryCount} items)
                  </p>
                </div>
              </div>
            </div>

            {scanning && scanStatus && (
              <div className="space-y-1.5 pt-2">
                <div className="flex justify-between text-xs font-mono">
                  <span className="truncate max-w-[200px]">{scanStatus.currentFile}</span>
                  <span>{scanStatus.current} / {scanStatus.total}</span>
                </div>
                <div className="w-full h-2 bg-black/20 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-cyan-400 transition-all duration-200"
                    style={{ width: `${scanStatus.total ? (scanStatus.current / scanStatus.total) * 100 : 0}%` }}
                  />
                </div>
              </div>
            )}

            <button
              onClick={onScanFolder}
              disabled={scanning}
              className={`w-full py-3 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all ${
                scanning
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 cursor-not-allowed'
                  : 'bg-gradient-to-r from-cyan-500 to-indigo-600 text-white shadow-lg hover:shadow-cyan-500/25 hover:scale-[1.01] active:scale-[0.99]'
              }`}
            >
              {scanning ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Scanning Media Folder...
                </>
              ) : (
                <>
                  <FolderSearch className="w-4 h-4" />
                  Scan Media Folder Now
                </>
              )}
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className={`px-6 py-4 border-t flex justify-end ${
          isLight ? 'border-slate-200 bg-slate-50' : 'border-white/10 bg-white/5'
        }`}>
          <button
            onClick={onClose}
            className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 text-white font-bold text-xs shadow-md hover:opacity-90 transition-opacity"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
