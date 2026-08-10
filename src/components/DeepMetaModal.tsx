import React, { useState, useEffect } from 'react';
import { X, Cpu, Film, Volume2, HardDrive, Tag, Loader2, Play, Calendar, Clock, Layers, ShieldCheck } from 'lucide-react';
import type { MediaItem, DeepMeta, ThemeMode } from '../types';

interface DeepMetaModalProps {
  item: MediaItem | null;
  isOpen: boolean;
  onClose: () => void;
  onPlay?: (item: MediaItem) => void;
  theme?: ThemeMode;
}

export default function DeepMetaModal({
  item,
  isOpen,
  onClose,
  onPlay,
  theme = 'dark'
}: DeepMetaModalProps) {
  const [loading, setLoading] = useState(false);
  const [meta, setMeta] = useState<DeepMeta | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && item) {
      setLoading(true);
      setError(null);
      setMeta(null);

      let cleanPath = item.path || item.url || '';
      cleanPath = cleanPath
        .replace(/^\/api\/stream\//, '')
        .replace(/^\/api\/transcode\//, '')
        .replace(/^transcode\//, '')
        .replace(/^\/+/, '');

      const encodedPath = cleanPath.split('/').map(encodeURIComponent).join('/');

      fetch(`/api/probe/${encodedPath}`)
        .then((res) => {
          if (!res.ok) throw new Error(`Server returned HTTP ${res.status}`);
          return res.json();
        })
        .then((data: DeepMeta) => {
          setMeta(data);
          setLoading(false);
        })
        .catch((err) => {
          console.error("Deep meta fetch error:", err);
          setError("Failed to fetch deep ffprobe metadata from server");
          setLoading(false);
        });
    }
  }, [isOpen, item]);

  if (!isOpen || !item) return null;

  const isLight = theme === 'light';

  const formatDuration = (seconds?: number) => {
    if (!seconds) return 'N/A';
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    if (hrs > 0) {
      return `${hrs}h ${mins}m ${secs}s`;
    }
    return `${mins}m ${secs}s`;
  };

  const formatBitrate = (bitrate?: number | string) => {
    if (!bitrate) return 'N/A';
    const num = typeof bitrate === 'string' ? parseFloat(bitrate) : bitrate;
    if (isNaN(num)) return 'N/A';
    if (num >= 1000000) return `${(num / 1000000).toFixed(2)} Mbps`;
    if (num >= 1000) return `${(num / 1000).toFixed(0)} Kbps`;
    return `${num} bps`;
  };

  const formatBytes = (bytes?: number) => {
    if (!bytes) return item.sizeFormatted || 'N/A';
    if (bytes >= 1073741824) return `${(bytes / 1073741824).toFixed(2)} GB`;
    if (bytes >= 1048576) return `${(bytes / 1048576).toFixed(1)} MB`;
    return `${(bytes / 1024).toFixed(0)} KB`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className={`w-full max-w-2xl rounded-3xl border shadow-2xl overflow-hidden transition-all duration-300 flex flex-col max-h-[85vh] ${
        isLight ? 'bg-white border-slate-200 text-slate-800' : 'bg-slate-900 border-white/10 text-white'
      }`}>
        {/* Header */}
        <div className={`px-6 py-5 border-b flex items-center justify-between ${
          isLight ? 'border-slate-200 bg-slate-50' : 'border-white/10 bg-white/5'
        }`}>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono font-bold uppercase tracking-widest px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                  DEEP META INSPECTOR
                </span>
                <span className={`text-xs font-mono ${isLight ? 'text-slate-500' : 'text-white/50'}`}>
                  {item.format?.toUpperCase() || 'MP4'}
                </span>
              </div>
              <h2 className="text-lg font-bold truncate max-w-md mt-0.5">{item.title}</h2>
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

        {/* Scrollable Content */}
        <div className="p-6 space-y-6 overflow-y-auto custom-scrollbar flex-1">
          {loading ? (
            <div className="py-16 flex flex-col items-center justify-center gap-3">
              <Loader2 className="w-10 h-10 text-cyan-400 animate-spin" />
              <p className="text-xs font-mono text-cyan-300 uppercase tracking-widest">Running ffprobe Deep Analysis...</p>
            </div>
          ) : error ? (
            <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm">
              {error}
            </div>
          ) : meta ? (
            <>
              {/* File Container Overview */}
              <div className={`p-4 rounded-2xl border space-y-3 ${
                isLight ? 'bg-slate-50 border-slate-200' : 'bg-white/5 border-white/10'
              }`}>
                <h3 className="text-xs font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-2">
                  <HardDrive className="w-4 h-4" />
                  Container & File Overview
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs font-mono">
                  <div>
                    <span className="block opacity-50 text-[10px]">Format / Container:</span>
                    <span className="font-semibold">{meta.formatLong || meta.format || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="block opacity-50 text-[10px]">Duration:</span>
                    <span className="font-semibold">{formatDuration(meta.duration)}</span>
                  </div>
                  <div>
                    <span className="block opacity-50 text-[10px]">File Size:</span>
                    <span className="font-semibold">{formatBytes(meta.size)}</span>
                  </div>
                  <div>
                    <span className="block opacity-50 text-[10px]">Total Bitrate:</span>
                    <span className="font-semibold">{formatBitrate(meta.bitrate)}</span>
                  </div>
                  <div>
                    <span className="block opacity-50 text-[10px]">Total Streams:</span>
                    <span className="font-semibold">{meta.streamsCount || 1} Stream(s)</span>
                  </div>
                  <div>
                    <span className="block opacity-50 text-[10px]">Modified Date:</span>
                    <span className="font-semibold">{meta.modified ? new Date(meta.modified).toLocaleDateString() : 'N/A'}</span>
                  </div>
                </div>
                <div className="pt-2 border-t border-white/5 text-[11px] font-mono opacity-60 truncate">
                  Path: {item.path || item.filename}
                </div>
              </div>

              {/* Video Stream Specs */}
              <div className={`p-4 rounded-2xl border space-y-3 ${
                isLight ? 'bg-slate-50 border-slate-200' : 'bg-white/5 border-white/10'
              }`}>
                <h3 className="text-xs font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-2">
                  <Film className="w-4 h-4" />
                  Video Stream Specifications
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs font-mono">
                  <div>
                    <span className="block opacity-50 text-[10px]">Codec:</span>
                    <span className="font-semibold text-cyan-300">{meta.video?.codec?.toUpperCase() || 'H.264'}</span>
                  </div>
                  <div>
                    <span className="block opacity-50 text-[10px]">Profile:</span>
                    <span className="font-semibold">{meta.video?.profile || 'High / Main'}</span>
                  </div>
                  <div>
                    <span className="block opacity-50 text-[10px]">Resolution:</span>
                    <span className="font-semibold">{meta.video?.width && meta.video?.height ? `${meta.video.width} x ${meta.video.height}` : '1920 x 1080'}</span>
                  </div>
                  <div>
                    <span className="block opacity-50 text-[10px]">Display Aspect Ratio:</span>
                    <span className="font-semibold">{meta.video?.aspectRatio || '16:9'}</span>
                  </div>
                  <div>
                    <span className="block opacity-50 text-[10px]">Frame Rate (FPS):</span>
                    <span className="font-semibold">{meta.video?.fps || '24 / 30'}</span>
                  </div>
                  <div>
                    <span className="block opacity-50 text-[10px]">Pixel Format:</span>
                    <span className="font-semibold">{meta.video?.pixFmt || 'yuv420p'}</span>
                  </div>
                  <div>
                    <span className="block opacity-50 text-[10px]">Color Space:</span>
                    <span className="font-semibold">{meta.video?.colorSpace || 'bt709'}</span>
                  </div>
                  <div>
                    <span className="block opacity-50 text-[10px]">Video Bitrate:</span>
                    <span className="font-semibold">{formatBitrate(meta.video?.bitrate)}</span>
                  </div>
                </div>
              </div>

              {/* Audio Stream Specs */}
              <div className={`p-4 rounded-2xl border space-y-3 ${
                isLight ? 'bg-slate-50 border-slate-200' : 'bg-white/5 border-white/10'
              }`}>
                <h3 className="text-xs font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-2">
                  <Volume2 className="w-4 h-4" />
                  Audio Stream Specifications
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs font-mono">
                  <div>
                    <span className="block opacity-50 text-[10px]">Audio Codec:</span>
                    <span className="font-semibold text-cyan-300">{meta.audio?.codec?.toUpperCase() || 'AAC'}</span>
                  </div>
                  <div>
                    <span className="block opacity-50 text-[10px]">Channels:</span>
                    <span className="font-semibold">{meta.audio?.channels ? `${meta.audio.channels} Ch (${meta.audio.channelLayout || 'stereo'})` : '2 Ch (Stereo)'}</span>
                  </div>
                  <div>
                    <span className="block opacity-50 text-[10px]">Sample Rate:</span>
                    <span className="font-semibold">{meta.audio?.sampleRate ? `${meta.audio.sampleRate} Hz` : '48000 Hz'}</span>
                  </div>
                  <div>
                    <span className="block opacity-50 text-[10px]">Audio Bitrate:</span>
                    <span className="font-semibold">{formatBitrate(meta.audio?.bitrate)}</span>
                  </div>
                </div>
              </div>

              {/* Tags / Metadata */}
              {meta.tags && Object.keys(meta.tags).length > 0 && (
                <div className={`p-4 rounded-2xl border space-y-3 ${
                  isLight ? 'bg-slate-50 border-slate-200' : 'bg-white/5 border-white/10'
                }`}>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-2">
                    <Tag className="w-4 h-4" />
                    Embedded Metadata Tags
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-mono">
                    {Object.entries(meta.tags).map(([key, val]) => (
                      <div key={key} className="truncate">
                        <span className="opacity-50 uppercase text-[10px]">{key}: </span>
                        <span>{String(val)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : null}
        </div>

        {/* Footer */}
        <div className={`px-6 py-4 border-t flex justify-between items-center ${
          isLight ? 'border-slate-200 bg-slate-50' : 'border-white/10 bg-white/5'
        }`}>
          {onPlay && (
            <button
              onClick={() => {
                onClose();
                onPlay(item);
              }}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 text-white font-bold text-xs shadow-md hover:scale-105 transition-transform flex items-center gap-2"
            >
              <Play className="w-4 h-4 fill-current" />
              Play Media
            </button>
          )}
          <button
            onClick={onClose}
            className={`px-5 py-2.5 rounded-xl font-bold text-xs border transition-colors ml-auto ${
              isLight ? 'bg-slate-200 text-slate-800 border-slate-300 hover:bg-slate-300' : 'bg-white/10 text-white border-white/10 hover:bg-white/20'
            }`}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
