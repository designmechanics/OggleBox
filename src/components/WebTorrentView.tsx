import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Play, Download, Upload, Users, HardDrive, FileVideo, AlertCircle, X,
  Pause, Trash2, Copy, Check, Clock, Percent, Activity, ChevronDown, ChevronUp,
  Radio, Zap, Globe, Sparkles, Server, Terminal, ShieldCheck, RefreshCw, Plus,
  FolderDown, Square, Music, Disc, FileArchive, ArrowRight, CheckCircle2
} from 'lucide-react';
import type { PrimaryColorKey, ThemeMode, TorrentItem, TorrentFileItem, MediaItem } from '../types';

interface WebTorrentViewProps {
  theme: ThemeMode;
  primaryColor: PrimaryColorKey;
  onPlayMedia?: (item: MediaItem) => void;
}

const FEATURED_TORRENTS = [
  {
    name: 'Sintel (Open Movie)',
    magnet: 'magnet:?xt=urn:btih:08ada5a7a6183aae1e09d831df6748d566095a10&dn=Sintel&tr=udp%3A%2F%2Fexplodie.org%3A6969&tr=udp%3A%2F%2Ftracker.coppersurfer.tk%3A6969&tr=udp%3A%2F%2Ftracker.empirejs.org%3A1337&tr=udp%3A%2F%2Ftracker.leechers-paradise.org%3A6969&tr=udp%3A%2F%2Ftracker.opentrackr.org%3A1337&tr=wss%3A%2F%2Ftracker.btorrent.xyz&tr=wss%3A%2F%2Ftracker.fastcast.nz&tr=wss%3A%2F%2Ftracker.openwebtorrent.com'
  },
  {
    name: 'Tears of Steel (4K Sci-Fi Short)',
    magnet: 'magnet:?xt=urn:btih:209c8226b299b3083d9418641198f1f1d1aa7556&dn=Tears+of+Steel&tr=udp%3A%2F%2Fexplodie.org%3A6969&tr=udp%3A%2F%2Ftracker.coppersurfer.tk%3A6969&tr=wss%3A%2F%2Ftracker.btorrent.xyz&tr=wss%3A%2F%2Ftracker.fastcast.nz&tr=wss%3A%2F%2Ftracker.openwebtorrent.com'
  },
  {
    name: 'Big Buck Bunny (Animation)',
    magnet: 'magnet:?xt=urn:btih:dd8255edd6471b77636a66d4dd23863792ee5a79&dn=Big+Buck+Bunny&tr=udp%3A%2F%2Fexplodie.org%3A6969&tr=wss%3A%2F%2Ftracker.btorrent.xyz&tr=wss%3A%2F%2Ftracker.fastcast.nz&tr=wss%3A%2F%2Ftracker.openwebtorrent.com'
  }
];

function formatBytes(bytes: number): string {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function formatETA(ms: number): string {
  if (!ms || !isFinite(ms) || ms <= 0) return 'Done / Seeding';
  const seconds = Math.floor(ms / 1000);
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  const h = Math.floor(m / 60);
  if (h > 0) return `${h}h ${m % 60}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

export default function WebTorrentView({ theme, primaryColor, onPlayMedia }: WebTorrentViewProps) {
  const [torrents, setTorrents] = useState<TorrentItem[]>([]);
  const [filterTab, setFilterTab] = useState<'all' | 'downloading' | 'seeding' | 'paused' | 'stopped'>('all');
  
  const [magnetInput, setMagnetInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Accordion state: by default, all torrents are expanded or expanded on click
  const [expandedTorrents, setExpandedTorrents] = useState<Record<string, boolean>>({});
  const [expandedSwarmInfo, setExpandedSwarmInfo] = useState<Record<string, boolean>>({});
  const [expandedFiles, setExpandedFiles] = useState<Record<string, boolean>>({});
  const [expandedWires, setExpandedWires] = useState<Record<string, boolean>>({});
  const [showAllWires, setShowAllWires] = useState<Record<string, boolean>>({});
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [isOrganizing, setIsOrganizing] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const isLight = theme === 'light';

  const colorClasses = useMemo(() => {
    switch (primaryColor) {
      case 'pink':
        return {
          text: 'text-pink-400',
          bg: 'bg-pink-500',
          bgLight: 'bg-pink-500/10',
          border: 'border-pink-500/30',
          gradient: 'from-pink-400 to-rose-600',
          ring: 'focus:ring-pink-500/50',
          badge: 'bg-pink-500/20 text-pink-300 border-pink-500/30'
        };
      case 'emerald':
        return {
          text: 'text-emerald-400',
          bg: 'bg-emerald-500',
          bgLight: 'bg-emerald-500/10',
          border: 'border-emerald-500/30',
          gradient: 'from-emerald-400 to-teal-600',
          ring: 'focus:ring-emerald-500/50',
          badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
        };
      case 'amber':
        return {
          text: 'text-amber-400',
          bg: 'bg-amber-500',
          bgLight: 'bg-amber-500/10',
          border: 'border-amber-500/30',
          gradient: 'from-amber-400 to-orange-600',
          ring: 'focus:ring-amber-500/50',
          badge: 'bg-amber-500/20 text-amber-300 border-amber-500/30'
        };
      default:
        return {
          text: 'text-cyan-400',
          bg: 'bg-cyan-500',
          bgLight: 'bg-cyan-500/10',
          border: 'border-cyan-500/30',
          gradient: 'from-cyan-400 to-indigo-600',
          ring: 'focus:ring-cyan-500/50',
          badge: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30'
        };
    }
  }, [primaryColor]);

  // Fetch live torrent list from backend daemon
  const fetchTorrents = async () => {
    try {
      const res = await fetch('/api/torrents');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setTorrents(data);
          // Set default expanded state for newly discovered torrents if not explicitly set
          setExpandedTorrents(prev => {
            const next = { ...prev };
            data.forEach((t: TorrentItem) => {
              if (next[t.id] === undefined) {
                next[t.id] = true; // default open
              }
            });
            return next;
          });
        }
      }
    } catch (err) {
      console.warn('Failed to poll torrent daemon:', err);
    }
  };

  useEffect(() => {
    fetchTorrents();
    const interval = setInterval(fetchTorrents, 1500);
    return () => clearInterval(interval);
  }, []);

  const showNotification = (msg: string, isError = false) => {
    if (isError) {
      setErrorMessage(msg);
      setTimeout(() => setErrorMessage(null), 5000);
    } else {
      setActionSuccess(msg);
      setTimeout(() => setActionSuccess(null), 4000);
    }
  };

  // Add Magnet Link
  const handleAddMagnet = async (magnetURI: string) => {
    if (!magnetURI.trim()) return;
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      const res = await fetch('/api/torrents/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ magnetURI: magnetURI.trim(), category: 'Torrents' })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to add torrent');
      setMagnetInput('');
      showNotification(`Torrent added: "${data.torrent?.name || 'Resolving...'}"`);
      await fetchTorrents();
    } catch (err: any) {
      showNotification(err.message, true);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Upload .torrent File
  const handleFileUpload = async (file: File) => {
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      const arrayBuffer = await file.arrayBuffer();
      const res = await fetch('/api/torrents/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/octet-stream' },
        body: arrayBuffer
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to parse .torrent binary');
      showNotification(`File uploaded: "${data.torrent?.name || file.name}"`);
      await fetchTorrents();
    } catch (err: any) {
      showNotification(err.message, true);
    } finally {
      setIsSubmitting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Pause Torrent
  const handlePause = async (id: string) => {
    try {
      const res = await fetch(`/api/torrents/${id}/pause`, { method: 'POST' });
      if (res.ok) {
        showNotification('Torrent paused');
        await fetchTorrents();
      }
    } catch (err: any) {
      showNotification(err.message, true);
    }
  };

  // Resume / Seed Torrent
  const handleResume = async (id: string) => {
    try {
      const res = await fetch(`/api/torrents/${id}/resume`, { method: 'POST' });
      if (res.ok) {
        showNotification('Torrent resumed');
        await fetchTorrents();
      }
    } catch (err: any) {
      showNotification(err.message, true);
    }
  };

  // Explicit Seed Button
  const handleSeed = async (id: string) => {
    try {
      const res = await fetch(`/api/torrents/${id}/seed`, { method: 'POST' });
      if (res.ok) {
        showNotification('Torrent set to active seeding');
        await fetchTorrents();
      }
    } catch (err: any) {
      showNotification(err.message, true);
    }
  };

  // Stop Button
  const handleStop = async (id: string) => {
    try {
      const res = await fetch(`/api/torrents/${id}/stop`, { method: 'POST' });
      if (res.ok) {
        showNotification('Torrent swarm stopped');
        await fetchTorrents();
      }
    } catch (err: any) {
      showNotification(err.message, true);
    }
  };

  // Delete Torrent
  const handleDelete = async (id: string, deleteFiles: boolean) => {
    try {
      const res = await fetch(`/api/torrents/${id}?deleteFiles=${deleteFiles}`, { method: 'DELETE' });
      if (res.ok) {
        showNotification(`Torrent removed ${deleteFiles ? 'and disk files deleted' : ''}`);
        setDeleteConfirmId(null);
        await fetchTorrents();
      }
    } catch (err: any) {
      showNotification(err.message, true);
    }
  };

  // Move completed files to media/new/ or media/new/other/
  const handleMoveToNew = async (id: string) => {
    setIsOrganizing(id);
    try {
      const res = await fetch(`/api/torrents/${id}/move-to-new`, { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        showNotification(`Organized ${data.moved?.length || 0} file(s) into media/new/ (Total library: ${data.count})`);
      } else {
        throw new Error(data.error || 'Failed to move files');
      }
    } catch (err: any) {
      showNotification(err.message, true);
    } finally {
      setIsOrganizing(null);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  // One-click stream in flagship player
  const streamInFlagshipPlayer = (torrent: TorrentItem, file: TorrentFileItem) => {
    if (!onPlayMedia) return;

    const ext = file.name.split('.').pop()?.toUpperCase() || 'MP4';
    const isAudio = file.isAudio || ['MP3', 'FLAC', 'WAV', 'AAC', 'M4A', 'OGG', 'OPUS'].includes(ext);

    const syntheticMedia: MediaItem = {
      id: `torrent_${torrent.id}_${file.index}`,
      filename: file.name,
      path: file.path,
      category: torrent.category || 'Torrents',
      url: `/api/torrents/${torrent.id}/stream/${file.index}`,
      title: file.name.replace(/\.[^/.]+$/, ''),
      year: new Date().getFullYear(),
      size: file.length,
      sizeFormatted: file.lengthFormatted,
      format: ext,
      mediaType: isAudio ? 'audio' : 'video',
      description: `BitTorrent Stream • Swarm: ${torrent.name}`,
      poster: '/public/sample-big-buck-bunny.jpg'
    };

    onPlayMedia(syntheticMedia);
  };

  // Aggregate stats
  const totalDownloadSpeed = torrents.reduce((acc, t) => acc + (t.downloadSpeed || 0), 0);
  const totalUploadSpeed = torrents.reduce((acc, t) => acc + (t.uploadSpeed || 0), 0);
  const totalDownloaded = torrents.reduce((acc, t) => acc + (t.downloaded || 0), 0);

  // Filtered torrent list
  const filteredTorrents = torrents.filter((t) => {
    if (filterTab === 'downloading') return t.status === 'downloading' || t.status === 'metadata';
    if (filterTab === 'seeding') return t.status === 'seeding';
    if (filterTab === 'paused') return t.status === 'paused';
    if (filterTab === 'stopped') return t.status === 'stopped';
    return true;
  });

  return (
    <div className="flex-1 h-full overflow-y-auto p-4 md:p-8 custom-scrollbar flex flex-col gap-6 max-w-7xl mx-auto w-full">
      {/* Top Banner: Daemon Telemetry & Torrent Input (Solid High-Contrast Background) */}
      <div
        className={`border rounded-3xl p-6 md:p-8 shadow-2xl backdrop-blur-2xl relative overflow-hidden transition-all ${
          isLight 
            ? 'bg-white/95 border-slate-300 text-slate-900 shadow-xl' 
            : 'bg-slate-900/95 border-slate-700/60 text-white shadow-2xl'
        }`}
      >
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="max-w-2xl">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span
                className={`text-[10px] font-mono uppercase tracking-widest px-2.5 py-1 rounded-full border font-bold ${colorClasses.badge} flex items-center gap-1.5`}
              >
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse inline-block shrink-0" />
                Backend Node.js Daemon Active
              </span>
              <span
                className={`text-[10px] font-mono px-2.5 py-1 rounded-full border ${
                  isLight ? 'bg-slate-100 text-slate-700 border-slate-300' : 'bg-slate-800 text-slate-200 border-slate-700'
                }`}
              >
                TCP / UDP / DHT Swarm Enabled
              </span>
              <span
                className={`text-[10px] font-mono px-2.5 py-1 rounded-full border ${
                  isLight ? 'bg-slate-100 text-slate-700 border-slate-300' : 'bg-slate-800 text-slate-200 border-slate-700'
                }`}
              >
                Saves to: ./media/Torrents • Moves to: ./media/new
              </span>
            </div>

            <h2 className="text-2xl md:text-3xl font-black italic uppercase tracking-tight mb-2">
              BitTorrent <span className={colorClasses.text}>Engine Suite</span>
            </h2>
            <p className={`text-sm ${isLight ? 'text-slate-600' : 'text-slate-300'}`}>
              High-throughput BitTorrent client with sequential piece streaming, auto-moving completed files into <code className="text-cyan-400">media/new</code>, automated thumbnail extraction, and media library synchronization.
            </p>
          </div>

          {/* Session Bandwidth Counter */}
          <div
            className={`p-4 rounded-2xl border flex items-center gap-5 text-xs font-mono shrink-0 shadow-lg ${
              isLight ? 'bg-slate-100 border-slate-300' : 'bg-black/60 border-slate-700/80'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <div className={`p-2 rounded-xl ${colorClasses.bgLight} ${colorClasses.text}`}>
                <Download className="w-4 h-4" />
              </div>
              <div>
                <p className="text-[10px] opacity-60 uppercase font-sans">Swarm Inbound</p>
                <p className="font-bold text-sm text-cyan-400">{formatBytes(totalDownloadSpeed)}/s</p>
              </div>
            </div>
            <div className={`w-px h-8 ${isLight ? 'bg-slate-300' : 'bg-slate-700'}`} />
            <div className="flex items-center gap-2.5">
              <div className={`p-2 rounded-xl ${colorClasses.bgLight} ${colorClasses.text}`}>
                <Upload className="w-4 h-4" />
              </div>
              <div>
                <p className="text-[10px] opacity-60 uppercase font-sans">Swarm Outbound</p>
                <p className="font-bold text-sm text-emerald-400">{formatBytes(totalUploadSpeed)}/s</p>
              </div>
            </div>
          </div>
        </div>

        {/* Action Bar: Magnet Input & Torrent Upload */}
        <div className="mt-6 flex flex-col gap-4">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleAddMagnet(magnetInput);
            }}
            className="flex flex-col sm:flex-row gap-3"
          >
            <input
              type="text"
              value={magnetInput}
              onChange={(e) => setMagnetInput(e.target.value)}
              placeholder="Paste magnet link (magnet:?xt=urn:btih:...) or 40-char infoHash..."
              className={`flex-1 border rounded-2xl px-4 py-3 text-sm focus:outline-none transition-all ${
                isLight
                  ? 'bg-slate-100 border-slate-300 text-slate-900 placeholder:text-slate-400 focus:bg-white focus:ring-2 focus:ring-slate-400'
                  : `bg-slate-950/80 border-slate-700 text-white placeholder:text-slate-400 focus:ring-2 ${colorClasses.ring}`
              }`}
            />

            <button
              type="submit"
              disabled={isSubmitting || !magnetInput.trim()}
              className={`font-bold px-6 py-3 rounded-2xl flex items-center justify-center gap-2 text-white shadow-lg transition-all disabled:opacity-50 bg-gradient-to-r ${colorClasses.gradient} hover:scale-105`}
            >
              <Plus className="w-4 h-4" />
              <span>{isSubmitting ? 'Adding...' : 'Add Torrent'}</span>
            </button>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className={`font-medium px-5 py-3 rounded-2xl flex items-center justify-center gap-2 border transition-colors ${
                isLight ? 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-300' : 'bg-slate-800 hover:bg-slate-700 text-white border-slate-600'
              }`}
            >
              <FileVideo className="w-4 h-4" />
              <span>Upload .torrent</span>
            </button>

            <input
              ref={fileInputRef}
              type="file"
              accept=".torrent"
              onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
              className="hidden"
              style={{ display: 'none' }}
            />
          </form>

          {/* Instant Open Source Demos */}
          <div className="flex items-center gap-2 pt-1 flex-wrap">
            <span className="text-xs font-mono font-bold opacity-70 flex items-center gap-1 mr-1">
              <Sparkles className={`w-3.5 h-3.5 ${colorClasses.text}`} />
              Instant Demos:
            </span>
            {FEATURED_TORRENTS.map((demo, idx) => (
              <button
                key={idx}
                onClick={() => handleAddMagnet(demo.magnet)}
                className={`text-xs px-3 py-1.5 rounded-xl border font-medium transition-all hover:scale-105 flex items-center gap-1.5 ${
                  isLight
                    ? 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-800'
                    : 'bg-slate-800/90 hover:bg-slate-700 border-slate-700 text-slate-200'
                }`}
              >
                <Play className="w-3 h-3 fill-current" />
                <span>{demo.name}</span>
              </button>
            ))}
          </div>

          {/* Success & Error Notifications */}
          {actionSuccess && (
            <div className="p-3 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2 animate-fadeIn shadow-lg">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
              <span className="font-medium">{actionSuccess}</span>
            </div>
          )}

          {errorMessage && (
            <div className="p-3 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-2 animate-fadeIn shadow-lg">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span className="font-medium">{errorMessage}</span>
            </div>
          )}
        </div>
      </div>

      {/* Filter Tabs & Telemetry Bar */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div
          className={`flex items-center p-1.5 rounded-2xl border text-xs font-medium shadow-md ${
            isLight ? 'bg-white border-slate-300' : 'bg-slate-900/95 border-slate-700/60'
          }`}
        >
          {(['all', 'downloading', 'seeding', 'paused', 'stopped'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setFilterTab(tab)}
              className={`px-3.5 py-1.5 rounded-xl capitalize transition-all ${
                filterTab === tab
                  ? `${colorClasses.bg} text-white shadow-md font-bold`
                  : isLight
                  ? 'text-slate-600 hover:text-slate-900'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="text-xs font-mono opacity-80 flex items-center gap-2 bg-slate-900/90 border border-slate-700/60 px-3 py-1.5 rounded-xl">
          <span className="text-cyan-400 font-bold">{torrents.length}</span>
          <span>active swarms</span>
          <span className="opacity-40">•</span>
          <span className="text-emerald-400 font-bold">{formatBytes(totalDownloaded)}</span>
          <span>processed</span>
        </div>
      </div>

      {/* Torrent List (Uniform, Expandable Accordion Rows with Solid Background) */}
      {filteredTorrents.length === 0 ? (
        <div
          className={`border rounded-3xl p-12 flex flex-col items-center justify-center text-center gap-4 shadow-xl ${
            isLight ? 'bg-white border-slate-200 text-slate-500' : 'bg-slate-900/95 border-slate-700/60 text-slate-400'
          }`}
        >
          <Radio className="w-12 h-12 stroke-1 opacity-50 text-cyan-400" />
          <div>
            <p className="text-base font-bold text-white mb-1">No torrents in this view</p>
            <p className="text-xs max-w-sm opacity-70">
              Paste a magnet link or click one of the open source demo buttons above to initiate downloads on the server.
            </p>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {filteredTorrents.map((t) => {
            const isExpanded = expandedTorrents[t.id] ?? true;
            const isSwarmOpen = expandedSwarmInfo[t.id] ?? false;
            const isFilesOpen = expandedFiles[t.id] ?? true;
            const isWiresOpen = expandedWires[t.id] ?? false;
            const isAllWires = showAllWires[t.id] ?? false;
            const wires = t.wires || [];
            const limitedWires = isAllWires ? wires : wires.slice(0, 8);

            return (
              <div
                key={t.id}
                className={`border rounded-3xl shadow-xl transition-all overflow-hidden ${
                  isLight
                    ? 'bg-white border-slate-300 shadow-md'
                    : 'bg-slate-900/95 border-slate-700/70 hover:border-slate-600'
                }`}
              >
                {/* Header Summary Row (Always Visible, Click to Toggle Accordion) */}
                <div
                  onClick={() => setExpandedTorrents((prev) => ({ ...prev, [t.id]: !isExpanded }))}
                  className={`p-5 md:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer transition-colors ${
                    isLight ? 'hover:bg-slate-50' : 'hover:bg-slate-800/40'
                  }`}
                >
                  {/* Left: Status, Category, Name & Size */}
                  <div className="min-w-0 flex-1 flex flex-col gap-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={`text-[10px] font-mono px-2.5 py-0.5 rounded-full font-bold uppercase border ${
                          t.status === 'seeding'
                            ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                            : t.status === 'paused'
                            ? 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                            : t.status === 'stopped'
                            ? 'bg-slate-800 text-slate-400 border-slate-600'
                            : t.status === 'metadata'
                            ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30 animate-pulse'
                            : `${colorClasses.bgLight} ${colorClasses.text} ${colorClasses.border}`
                        }`}
                      >
                        {t.status}
                      </span>
                      <span className="opacity-30 text-xs">•</span>
                      <span className="text-xs font-mono opacity-70">
                        {t.files.length} {t.files.length === 1 ? 'file' : 'files'}
                      </span>
                      <span className="opacity-30 text-xs">•</span>
                      <span className="text-xs font-mono font-bold text-slate-300">
                        {t.lengthFormatted}
                      </span>
                    </div>

                    <h3 className="text-base md:text-lg font-bold truncate text-white max-w-2xl">
                      {t.name}
                    </h3>
                  </div>

                  {/* Middle: Live Bandwidth Ticker */}
                  <div className="flex items-center gap-4 text-xs font-mono shrink-0">
                    {t.status === 'downloading' || t.status === 'metadata' ? (
                      <div className="flex items-center gap-3">
                        <span className="text-cyan-400 font-bold">↓ {formatBytes(t.downloadSpeed)}/s</span>
                        <span className="opacity-40">•</span>
                        <span className="font-bold text-white">{t.progress}%</span>
                      </div>
                    ) : t.status === 'seeding' ? (
                      <div className="flex items-center gap-3">
                        <span className="text-emerald-400 font-bold">↑ {formatBytes(t.uploadSpeed)}/s</span>
                        <span className="opacity-40">•</span>
                        <span className="text-emerald-400 font-bold">100% Done</span>
                      </div>
                    ) : (
                      <span className="text-slate-400 italic">Idle / Paused</span>
                    )}
                  </div>

                  {/* Right: Uniform Actions & Accordion Toggle */}
                  <div className="flex items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
                    {/* Seed Button */}
                    <button
                      onClick={() => handleSeed(t.id)}
                      className={`p-2 rounded-xl border transition-colors ${
                        t.status === 'seeding'
                          ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                          : isLight ? 'bg-slate-100 hover:bg-slate-200 text-slate-800' : 'bg-slate-800 hover:bg-slate-700 text-white'
                      }`}
                      title="Seed Torrent"
                    >
                      <Upload className="w-4 h-4" />
                    </button>

                    {/* Pause Button */}
                    {t.paused ? (
                      <button
                        onClick={() => handleResume(t.id)}
                        className="p-2 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 transition-colors"
                        title="Resume Torrent"
                      >
                        <Play className="w-4 h-4 fill-current" />
                      </button>
                    ) : (
                      <button
                        onClick={() => handlePause(t.id)}
                        className={`p-2 rounded-xl border transition-colors ${
                          isLight ? 'bg-slate-100 hover:bg-slate-200 text-slate-800' : 'bg-slate-800 hover:bg-slate-700 text-white'
                        }`}
                        title="Pause Torrent"
                      >
                        <Pause className="w-4 h-4" />
                      </button>
                    )}

                    {/* Stop Button */}
                    <button
                      onClick={() => handleStop(t.id)}
                      className={`p-2 rounded-xl border transition-colors ${
                        t.status === 'stopped'
                          ? 'bg-slate-700 text-slate-300 border-slate-600'
                          : isLight ? 'bg-slate-100 hover:bg-slate-200 text-slate-800' : 'bg-slate-800 hover:bg-slate-700 text-white'
                      }`}
                      title="Stop Swarm"
                    >
                      <Square className="w-4 h-4" />
                    </button>

                    {/* Move to "new" Button */}
                    <button
                      onClick={() => handleMoveToNew(t.id)}
                      disabled={isOrganizing === t.id}
                      className={`p-2 rounded-xl border transition-colors ${
                        isLight ? 'bg-slate-100 hover:bg-slate-200 text-slate-800' : 'bg-slate-800 hover:bg-slate-700 text-cyan-300 border-cyan-500/30'
                      }`}
                      title="Move completed files to media/new/"
                    >
                      <FolderDown className={`w-4 h-4 ${isOrganizing === t.id ? 'animate-bounce' : ''}`} />
                    </button>

                    {/* Copy Magnet */}
                    <button
                      onClick={() => copyToClipboard(t.magnetURI || t.infoHash, t.id)}
                      className={`p-2 rounded-xl border transition-colors ${
                        isLight ? 'bg-slate-100 hover:bg-slate-200 text-slate-800' : 'bg-slate-800 hover:bg-slate-700 text-white'
                      }`}
                      title="Copy Magnet Link"
                    >
                      {copiedId === t.id ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                    </button>

                    {/* Delete Button */}
                    <button
                      onClick={() => setDeleteConfirmId(t.id)}
                      className="p-2 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 transition-colors"
                      title="Delete Torrent"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>

                    {/* Accordion Chevron */}
                    <div className="p-2 text-slate-400 hover:text-white transition-colors">
                      {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                    </div>
                  </div>
                </div>

                {/* Delete Confirmation Prompt */}
                {deleteConfirmId === t.id && (
                  <div
                    className={`p-4 border-t border-b text-xs font-mono flex flex-col sm:flex-row items-center justify-between gap-3 ${
                      isLight ? 'bg-rose-50 border-rose-200 text-rose-900' : 'bg-rose-950/60 border-rose-500/30 text-rose-200'
                    }`}
                  >
                    <span>Delete "{t.name.slice(0, 35)}..."?</span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleDelete(t.id, false)}
                        className="px-3 py-1.5 rounded-xl border border-rose-500/40 bg-rose-500/20 hover:bg-rose-500/30 text-xs font-bold"
                      >
                        Remove Torrent Only
                      </button>
                      <button
                        onClick={() => handleDelete(t.id, true)}
                        className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow"
                      >
                        Delete Files Too
                      </button>
                      <button
                        onClick={() => setDeleteConfirmId(null)}
                        className="px-2 py-1.5 opacity-60 hover:opacity-100"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                {/* Expanded Details Body: Logical, Uniform & Structured Order */}
                {isExpanded && (
                  <div className="p-5 md:p-6 border-t border-slate-700/50 flex flex-col gap-6 bg-slate-950/40">
                    {/* Section 1: Visual Progress Bar */}
                    <div className="flex flex-col gap-1.5">
                      <div className="flex items-center justify-between text-xs font-mono">
                        <span className="font-bold flex items-center gap-1.5">
                          <span className={t.status === 'seeding' ? 'text-emerald-400' : colorClasses.text}>
                            {t.progress}%
                          </span>
                          {t.status === 'seeding' && (
                            <span className="text-[10px] text-emerald-400 font-normal">• Seeding Complete</span>
                          )}
                        </span>
                        <span className="opacity-70 text-slate-300">{formatETA(t.timeRemaining)}</span>
                      </div>
                      <div
                        className={`w-full h-2 rounded-full overflow-hidden ${
                          isLight ? 'bg-slate-200' : 'bg-slate-800'
                        }`}
                        style={{ height: '8px' }}
                      >
                        <div
                          className={`h-full transition-all duration-300 ${
                            t.status === 'seeding' ? 'bg-emerald-400' : colorClasses.bg
                          }`}
                          style={{ width: `${Math.min(100, Math.max(0, t.progress))}%`, height: '100%' }}
                        />
                      </div>
                    </div>

                    {/* Section 2: Bandwidth & Swarm Telemetry in 4 Uniform Cards */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
                      <div
                        className={`p-3 rounded-2xl border ${
                          isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-900 border-slate-700/80 shadow-md'
                        }`}
                      >
                        <p className="text-[10px] opacity-60 uppercase flex items-center gap-1 font-sans">
                          <Download className="w-3 h-3 text-cyan-400" /> Inbound Speed
                        </p>
                        <p className="font-bold text-sm text-cyan-300 mt-1">{formatBytes(t.downloadSpeed)}/s</p>
                      </div>

                      <div
                        className={`p-3 rounded-2xl border ${
                          isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-900 border-slate-700/80 shadow-md'
                        }`}
                      >
                        <p className="text-[10px] opacity-60 uppercase flex items-center gap-1 font-sans">
                          <Upload className="w-3 h-3 text-emerald-400" /> Outbound Speed
                        </p>
                        <p className="font-bold text-sm text-emerald-400 mt-1">{formatBytes(t.uploadSpeed)}/s</p>
                      </div>

                      <div
                        className={`p-3 rounded-2xl border ${
                          isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-900 border-slate-700/80 shadow-md'
                        }`}
                      >
                        <p className="text-[10px] opacity-60 uppercase flex items-center gap-1 font-sans">
                          <Users className="w-3 h-3 text-indigo-300" /> Swarm Peers
                        </p>
                        <p className="font-bold text-sm text-indigo-200 mt-1">{t.numPeers} connected</p>
                      </div>

                      <div
                        className={`p-3 rounded-2xl border ${
                          isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-900 border-slate-700/80 shadow-md'
                        }`}
                      >
                        <p className="text-[10px] opacity-60 uppercase flex items-center gap-1 font-sans">
                          <Percent className="w-3 h-3 text-amber-400" /> Share Ratio
                        </p>
                        <p className="font-bold text-sm text-amber-300 mt-1">{t.ratio || 0}</p>
                      </div>
                    </div>

                    {/* Section 3: Technical Swarm Details (Collapsible Toggle) */}
                    <div className="border border-slate-700/60 rounded-2xl overflow-hidden bg-slate-900/60">
                      <button
                        onClick={() => setExpandedSwarmInfo((prev) => ({ ...prev, [t.id]: !isSwarmOpen }))}
                        className="w-full p-3.5 flex items-center justify-between text-xs font-mono font-bold text-slate-300 hover:text-white transition-colors"
                      >
                        <span className="flex items-center gap-2">
                          <Activity className="w-4 h-4 text-cyan-400" />
                          <span>Technical Swarm Information & Directories</span>
                        </span>
                        {isSwarmOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>

                      {isSwarmOpen && (
                        <div className="p-4 pt-1 border-t border-slate-700/60 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
                          <div>
                            <p className="text-[10px] opacity-50 uppercase mb-0.5">InfoHash</p>
                            <p className="truncate text-slate-300 select-all font-mono">{t.infoHash}</p>
                          </div>
                          <div>
                            <p className="text-[10px] opacity-50 uppercase mb-0.5">Host Directory</p>
                            <p className="truncate text-slate-300 select-all font-mono">{t.savePath}</p>
                          </div>
                          <div>
                            <p className="text-[10px] opacity-50 uppercase mb-0.5">Total Downloaded</p>
                            <p className="font-bold text-slate-200">{formatBytes(t.downloaded)}</p>
                          </div>
                          <div>
                            <p className="text-[10px] opacity-50 uppercase mb-0.5">Category</p>
                            <p className="font-bold text-cyan-300">{t.category || 'Torrents'}</p>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Section 4: Files Inside Torrent (Collapsible Toggle, Default Open) */}
                    <div className="border border-slate-700/60 rounded-2xl overflow-hidden bg-slate-900/60">
                      <button
                        onClick={() => setExpandedFiles((prev) => ({ ...prev, [t.id]: !isFilesOpen }))}
                        className="w-full p-3.5 flex items-center justify-between text-xs font-mono font-bold text-slate-300 hover:text-white transition-colors"
                      >
                        <span className="flex items-center gap-2">
                          <FileVideo className="w-4 h-4 text-emerald-400" />
                          <span>Files inside torrent ({t.files.length})</span>
                        </span>
                        {isFilesOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>

                      {isFilesOpen && (
                        <div className="p-3 pt-1 border-t border-slate-700/60 flex flex-col gap-2 max-h-60 overflow-y-auto custom-scrollbar">
                          {t.files.map((file) => {
                            const isAudio = file.isAudio || file.fileType === 'audio';
                            const isBinary = file.fileType === 'binary';
                            const isVideo = file.isVideo || file.fileType === 'video';

                            return (
                              <div
                                key={file.index}
                                className={`p-3 rounded-xl border flex items-center justify-between gap-3 text-xs ${
                                  isLight
                                    ? 'bg-slate-50 border-slate-200 text-slate-800'
                                    : 'bg-slate-900/90 border-slate-700/60 text-white'
                                }`}
                              >
                                <div className="min-w-0 flex-1 flex items-center gap-2.5">
                                  {isAudio ? (
                                    <Music className="w-4 h-4 text-cyan-400 shrink-0" />
                                  ) : isBinary ? (
                                    <Disc className="w-4 h-4 text-amber-400 shrink-0" />
                                  ) : (
                                    <FileVideo className="w-4 h-4 text-emerald-400 shrink-0" />
                                  )}
                                  <span className="truncate font-medium">{file.name}</span>
                                </div>

                                <div className="flex items-center gap-3 shrink-0 font-mono text-[11px]">
                                  <span className="opacity-70 text-slate-300">{file.lengthFormatted}</span>
                                  {file.progress !== undefined && (
                                    <>
                                      <span className="opacity-40">•</span>
                                      <span className="opacity-80 font-bold text-slate-200">{file.progress}%</span>
                                    </>
                                  )}

                                  {/* Streamable Playback for Video and Sound files */}
                                  {(isVideo || isAudio) && onPlayMedia && (
                                    <button
                                      onClick={() => streamInFlagshipPlayer(t, file)}
                                      className={`px-3 py-1 rounded-lg font-bold flex items-center gap-1.5 text-white shadow-md transition-all hover:scale-105 ${colorClasses.bg}`}
                                      title={isAudio ? "Play in Music Player" : "Stream in Flagship Player"}
                                    >
                                      <Play className="w-3 h-3 fill-current" />
                                      <span>{isAudio ? 'Play Audio' : 'Stream'}</span>
                                    </button>
                                  )}

                                  {/* Indicator for Binary / Other files */}
                                  {isBinary && (
                                    <span className="px-2 py-0.5 rounded text-[10px] font-bold border border-amber-500/30 bg-amber-500/10 text-amber-400">
                                      ISO / Archive
                                    </span>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* Section 5: Swarm Connections / Peer Wires (Collapsible Toggle, LIMITED to 6-8 connections) */}
                    <div className="border border-slate-700/60 rounded-2xl overflow-hidden bg-slate-900/60">
                      <button
                        onClick={() => setExpandedWires((prev) => ({ ...prev, [t.id]: !isWiresOpen }))}
                        className="w-full p-3.5 flex items-center justify-between text-xs font-mono font-bold text-slate-300 hover:text-white transition-colors"
                      >
                        <span className="flex items-center gap-2">
                          <Users className="w-4 h-4 text-indigo-400" />
                          <span>Swarm Connections & Peer Wires ({wires.length})</span>
                          <span className="text-[10px] font-normal opacity-60 font-sans">
                            {wires.length > 8 && !isAllWires ? `(Showing top 8 active)` : ''}
                          </span>
                        </span>
                        {isWiresOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>

                      {isWiresOpen && (
                        <div className="p-4 pt-1 border-t border-slate-700/60 flex flex-col gap-2">
                          {wires.length === 0 ? (
                            <p className="italic opacity-50 text-[11px] py-2 text-slate-400">
                              Searching BitTorrent DHT and announcing to TCP/UDP trackers...
                            </p>
                          ) : (
                            <>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-52 overflow-y-auto custom-scrollbar pr-1">
                                {limitedWires.map((wire, idx) => (
                                  <div
                                    key={idx}
                                    className={`p-2.5 rounded-xl border flex items-center justify-between text-[11px] font-mono ${
                                      isLight
                                        ? 'bg-slate-50 border-slate-200'
                                        : 'bg-slate-900/90 border-slate-700/60 text-slate-300'
                                    }`}
                                  >
                                    <div className="truncate max-w-[150px]">
                                      <p className="font-bold truncate text-white">{wire.client}</p>
                                      <p className="text-[9px] opacity-50 truncate">{wire.address}</p>
                                    </div>
                                    <span className="text-cyan-400 font-bold shrink-0">
                                      ↓ {formatBytes(wire.downloadSpeed)}/s
                                    </span>
                                  </div>
                                ))}
                              </div>

                              {/* Toggle between limited (top 8) and all connections */}
                              {wires.length > 8 && (
                                <button
                                  onClick={() => setShowAllWires((prev) => ({ ...prev, [t.id]: !isAllWires }))}
                                  className="mt-2 text-xs font-mono text-cyan-400 hover:text-cyan-300 flex items-center justify-center gap-1 py-1"
                                >
                                  <span>{isAllWires ? 'Show top 8 connections only' : `Show all ${wires.length} connections`}</span>
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
