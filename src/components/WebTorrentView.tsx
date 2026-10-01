import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Play, Download, Upload, Users, HardDrive, FileVideo, AlertCircle, X,
  Pause, Trash2, Copy, Check, Clock, Percent, Activity, ChevronDown, ChevronUp,
  Radio, Zap, Globe, Sparkles, Server, Terminal, ShieldCheck, RefreshCw, Plus, FolderDown
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
  if (!ms || !isFinite(ms) || ms <= 0) return 'Done / Idle';
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
  const [selectedTorrentId, setSelectedTorrentId] = useState<string | null>(null);
  const [filterTab, setFilterTab] = useState<'all' | 'downloading' | 'seeding' | 'paused'>('all');
  
  const [magnetInput, setMagnetInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const [expandedFiles, setExpandedFiles] = useState<Record<string, boolean>>({});
  const [expandedPeers, setExpandedPeers] = useState<Record<string, boolean>>({});
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

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
          if (!selectedTorrentId && data.length > 0) {
            setSelectedTorrentId(data[0].id);
          }
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
  }, [selectedTorrentId]);

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
      if (!res.ok) {
        throw new Error(data.error || 'Failed to add torrent');
      }

      showNotification(`Added torrent: ${data.torrent?.name || 'Swarm added'}`);
      setMagnetInput('');
      await fetchTorrents();
      if (data.torrent?.id) setSelectedTorrentId(data.torrent.id);
    } catch (err: any) {
      showNotification(err.message || 'Error adding magnet link', true);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Upload .torrent file
  const handleFileUpload = async (file: File) => {
    if (!file) return;
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const arrayBuffer = await file.arrayBuffer();
      const res = await fetch('/api/torrents/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-bittorrent' },
        body: arrayBuffer
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to upload .torrent file');
      }

      showNotification(`Loaded torrent file: ${file.name}`);
      await fetchTorrents();
      if (data.torrent?.id) setSelectedTorrentId(data.torrent.id);
    } catch (err: any) {
      showNotification(err.message || 'Error uploading .torrent file', true);
    } finally {
      setIsSubmitting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handlePause = async (id: string) => {
    try {
      await fetch(`/api/torrents/${id}/pause`, { method: 'POST' });
      fetchTorrents();
    } catch (err) {}
  };

  const handleResume = async (id: string) => {
    try {
      await fetch(`/api/torrents/${id}/resume`, { method: 'POST' });
      fetchTorrents();
    } catch (err) {}
  };

  const handleDelete = async (id: string, deleteFiles: boolean) => {
    try {
      await fetch(`/api/torrents/${id}?deleteFiles=${deleteFiles}`, { method: 'DELETE' });
      showNotification(`Removed torrent ${deleteFiles ? 'and deleted files' : ''}`);
      setDeleteConfirmId(null);
      if (selectedTorrentId === id) setSelectedTorrentId(null);
      fetchTorrents();
    } catch (err: any) {
      showNotification(err.message || 'Failed to remove torrent', true);
    }
  };

  const handleImportToLibrary = async (id: string) => {
    try {
      const res = await fetch(`/api/torrents/${id}/import`, { method: 'POST' });
      const data = await res.json();
      showNotification(`Library synced: ${data.count} items active`);
    } catch (err: any) {
      showNotification('Failed to sync with media library', true);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Launch video in flagship VideoPlayer component
  const streamInFlagshipPlayer = (torrent: TorrentItem, file: TorrentFileItem) => {
    if (!onPlayMedia) return;

    const ext = file.name.split('.').pop()?.toUpperCase() || 'MP4';
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
    return true;
  });

  const selectedTorrent = torrents.find((t) => t.id === selectedTorrentId) || torrents[0] || null;

  return (
    <div className="flex-1 h-full overflow-y-auto p-6 md:p-8 custom-scrollbar flex flex-col gap-6">
      {/* Top Banner: Daemon Telemetry & Torrent Input */}
      <div
        className={`border rounded-3xl p-6 md:p-8 backdrop-blur-xl relative overflow-hidden transition-all ${
          isLight ? 'bg-white/90 border-slate-200 shadow-sm text-slate-900' : 'bg-white/5 border-white/10 text-white'
        }`}
      >
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="max-w-2xl">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span
                className={`text-[10px] font-mono uppercase tracking-widest px-2.5 py-1 rounded-full border font-bold ${colorClasses.badge} flex items-center gap-1.5`}
              >
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                Backend Node.js Daemon Active
              </span>
              <span
                className={`text-[10px] font-mono px-2.5 py-1 rounded-full border ${
                  isLight ? 'bg-slate-100 text-slate-700 border-slate-300' : 'bg-white/10 text-white/80 border-white/10'
                }`}
              >
                TCP / UDP / DHT Swarm Enabled
              </span>
              <span
                className={`text-[10px] font-mono px-2.5 py-1 rounded-full border ${
                  isLight ? 'bg-slate-100 text-slate-700 border-slate-300' : 'bg-white/10 text-white/80 border-white/10'
                }`}
              >
                Saves to: ./media/Torrents
              </span>
            </div>

            <h2 className="text-2xl md:text-3xl font-black italic uppercase tracking-tight mb-2">
              BitTorrent <span className={colorClasses.text}>Engine Suite</span>
            </h2>
            <p className={`text-sm ${isLight ? 'text-slate-600' : 'text-white/60'}`}>
              High-throughput Node.js BitTorrent client with sequential piece streaming, persistent background downloads, on-the-fly FFmpeg transcoding, and automatic media library indexing.
            </p>
          </div>

          {/* Session Bandwidth Counter */}
          <div
            className={`p-4 rounded-2xl border flex items-center gap-5 text-xs font-mono shrink-0 ${
              isLight ? 'bg-slate-100 border-slate-300' : 'bg-black/40 border-white/10'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <div className={`p-2 rounded-xl ${colorClasses.bgLight} ${colorClasses.text}`}>
                <Download className="w-4 h-4" />
              </div>
              <div>
                <p className="text-[10px] opacity-60 uppercase">Swarm Inbound</p>
                <p className="font-bold text-sm">{formatBytes(totalDownloadSpeed)}/s</p>
              </div>
            </div>
            <div className={`w-px h-8 ${isLight ? 'bg-slate-300' : 'bg-white/10'}`} />
            <div className="flex items-center gap-2.5">
              <div className={`p-2 rounded-xl ${colorClasses.bgLight} ${colorClasses.text}`}>
                <Upload className="w-4 h-4" />
              </div>
              <div>
                <p className="text-[10px] opacity-60 uppercase">Swarm Outbound</p>
                <p className="font-bold text-sm">{formatBytes(totalUploadSpeed)}/s</p>
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
                  : `bg-black/40 border-white/10 text-white placeholder:text-white/30 focus:ring-2 ${colorClasses.ring}`
              }`}
            />

            <button
              type="submit"
              disabled={isSubmitting || !magnetInput.trim()}
              className={`font-bold px-6 py-3 rounded-2xl flex items-center justify-center gap-2 text-white shadow-lg transition-all disabled:opacity-50 bg-gradient-to-r ${colorClasses.gradient}`}
            >
              <Plus className="w-4 h-4" />
              <span>{isSubmitting ? 'Adding...' : 'Add Torrent'}</span>
            </button>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className={`font-medium px-5 py-3 rounded-2xl flex items-center justify-center gap-2 border transition-colors ${
                isLight ? 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-300' : 'bg-white/10 hover:bg-white/20 text-white border-white/10'
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
                    : 'bg-white/5 hover:bg-white/10 border-white/10 text-white/80'
                }`}
              >
                <Play className="w-3 h-3 fill-current" />
                <span>{demo.name}</span>
              </button>
            ))}
          </div>

          {/* Success & Error Notifications */}
          {actionSuccess && (
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2 animate-fadeIn">
              <Check className="w-4 h-4 shrink-0" />
              <span>{actionSuccess}</span>
            </div>
          )}

          {errorMessage && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2 animate-fadeIn">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}
        </div>
      </div>

      {/* Main Grid: Torrent Dashboard & Details View */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 Cols): Active Torrents Swarm Dashboard */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          {/* Filter Bar */}
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div
              className={`flex items-center p-1 rounded-2xl border text-xs font-medium ${
                isLight ? 'bg-slate-200/60 border-slate-300' : 'bg-white/5 border-white/10'
              }`}
            >
              {(['all', 'downloading', 'seeding', 'paused'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setFilterTab(tab)}
                  className={`px-3.5 py-1.5 rounded-xl capitalize transition-all ${
                    filterTab === tab
                      ? `${colorClasses.bg} text-white shadow-md font-bold`
                      : isLight
                      ? 'text-slate-600 hover:text-slate-900'
                      : 'text-white/60 hover:text-white'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            <div className="text-xs font-mono opacity-60 flex items-center gap-2">
              <span>{torrents.length} active torrents</span>
              <span>•</span>
              <span>{formatBytes(totalDownloaded)} total</span>
            </div>
          </div>

          {/* Torrent List */}
          {filteredTorrents.length === 0 ? (
            <div
              className={`border rounded-3xl p-12 flex flex-col items-center justify-center text-center gap-4 ${
                isLight ? 'bg-white border-slate-200 text-slate-500' : 'bg-white/5 border-white/10 text-white/40'
              }`}
            >
              <Radio className="w-12 h-12 stroke-1 opacity-50" />
              <div>
                <p className="text-base font-bold mb-1">No torrents in this view</p>
                <p className="text-xs max-w-sm">
                  Paste a magnet link or click one of the open source demo buttons above to initiate downloads on the server.
                </p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {filteredTorrents.map((t) => {
                const isSelected = selectedTorrent?.id === t.id;
                const isExpanded = expandedFiles[t.id] ?? true;

                return (
                  <div
                    key={t.id}
                    onClick={() => setSelectedTorrentId(t.id)}
                    className={`border rounded-3xl p-5 md:p-6 transition-all cursor-pointer flex flex-col gap-4 ${
                      isSelected
                        ? `${colorClasses.border} ${isLight ? 'bg-white shadow-md' : 'bg-white/[0.08]'}`
                        : isLight
                        ? 'bg-white border-slate-200 hover:border-slate-300'
                        : 'bg-white/5 border-white/10 hover:border-white/20'
                    }`}
                  >
                    {/* Header Row: Status, Title, Actions */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                          <span
                            className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold uppercase ${
                              t.status === 'seeding'
                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                : t.status === 'paused'
                                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                                : t.status === 'metadata'
                                ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 animate-pulse'
                                : `${colorClasses.bgLight} ${colorClasses.text} ${colorClasses.border}`
                            }`}
                          >
                            {t.status}
                          </span>
                          <span className="text-xs font-mono opacity-50">
                            {t.files.length} {t.files.length === 1 ? 'file' : 'files'}
                          </span>
                        </div>
                        <h3 className="text-base font-bold truncate max-w-xl">{t.name}</h3>
                      </div>

                      {/* Control Actions */}
                      <div className="flex items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
                        {t.paused ? (
                          <button
                            onClick={() => handleResume(t.id)}
                            className={`p-2 rounded-xl border transition-colors ${
                              isLight ? 'bg-slate-100 hover:bg-slate-200 text-slate-800' : 'bg-white/10 hover:bg-white/20 text-white'
                            }`}
                            title="Resume Torrent"
                          >
                            <Play className="w-4 h-4 fill-current" />
                          </button>
                        ) : (
                          <button
                            onClick={() => handlePause(t.id)}
                            className={`p-2 rounded-xl border transition-colors ${
                              isLight ? 'bg-slate-100 hover:bg-slate-200 text-slate-800' : 'bg-white/10 hover:bg-white/20 text-white'
                            }`}
                            title="Pause Torrent"
                          >
                            <Pause className="w-4 h-4" />
                          </button>
                        )}

                        <button
                          onClick={() => copyToClipboard(t.magnetURI || t.infoHash, t.id)}
                          className={`p-2 rounded-xl border transition-colors ${
                            isLight ? 'bg-slate-100 hover:bg-slate-200 text-slate-800' : 'bg-white/10 hover:bg-white/20 text-white'
                          }`}
                          title="Copy Magnet Link"
                        >
                          {copiedId === t.id ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                        </button>

                        <button
                          onClick={() => handleImportToLibrary(t.id)}
                          className={`p-2 rounded-xl border transition-colors ${
                            isLight ? 'bg-slate-100 hover:bg-slate-200 text-slate-800' : 'bg-white/10 hover:bg-white/20 text-white'
                          }`}
                          title="Sync with OggleBox Library"
                        >
                          <FolderDown className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => setDeleteConfirmId(t.id)}
                          className="p-2 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 transition-colors"
                          title="Delete Torrent"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Delete Confirmation Prompt */}
                    {deleteConfirmId === t.id && (
                      <div
                        className={`p-4 rounded-2xl border text-xs font-mono flex flex-col sm:flex-row items-center justify-between gap-3 ${
                          isLight ? 'bg-rose-50 border-rose-200 text-rose-900' : 'bg-rose-950/40 border-rose-500/30 text-rose-200'
                        }`}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <span>Delete "{t.name.slice(0, 30)}..."?</span>
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

                    {/* Progress Bar */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs font-mono">
                        <span className="font-bold">{t.progress}%</span>
                        <span className="opacity-60">{formatETA(t.timeRemaining)}</span>
                      </div>
                      <div
                        className={`w-full h-2 rounded-full overflow-hidden ${
                          isLight ? 'bg-slate-200' : 'bg-black/40'
                        }`}
                      >
                        <div
                          className={`h-full transition-all duration-300 ${colorClasses.bg}`}
                          style={{ width: `${Math.min(100, Math.max(0, t.progress))}%` }}
                        />
                      </div>
                    </div>

                    {/* Telemetry Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
                      <div
                        className={`p-2.5 rounded-xl border ${
                          isLight ? 'bg-slate-50 border-slate-200' : 'bg-black/20 border-white/5'
                        }`}
                      >
                        <p className="text-[10px] opacity-60 uppercase flex items-center gap-1">
                          <Download className="w-3 h-3" /> Inbound
                        </p>
                        <p className="font-bold mt-0.5">{formatBytes(t.downloadSpeed)}/s</p>
                      </div>

                      <div
                        className={`p-2.5 rounded-xl border ${
                          isLight ? 'bg-slate-50 border-slate-200' : 'bg-black/20 border-white/5'
                        }`}
                      >
                        <p className="text-[10px] opacity-60 uppercase flex items-center gap-1">
                          <Upload className="w-3 h-3" /> Outbound
                        </p>
                        <p className="font-bold mt-0.5">{formatBytes(t.uploadSpeed)}/s</p>
                      </div>

                      <div
                        className={`p-2.5 rounded-xl border ${
                          isLight ? 'bg-slate-50 border-slate-200' : 'bg-black/20 border-white/5'
                        }`}
                      >
                        <p className="text-[10px] opacity-60 uppercase flex items-center gap-1">
                          <Users className="w-3 h-3" /> Swarm Peers
                        </p>
                        <p className="font-bold mt-0.5">{t.numPeers}</p>
                      </div>

                      <div
                        className={`p-2.5 rounded-xl border ${
                          isLight ? 'bg-slate-50 border-slate-200' : 'bg-black/20 border-white/5'
                        }`}
                      >
                        <p className="text-[10px] opacity-60 uppercase flex items-center gap-1">
                          <Percent className="w-3 h-3" /> Share Ratio
                        </p>
                        <p className="font-bold mt-0.5">{t.ratio}</p>
                      </div>
                    </div>

                    {/* Collapsible File Explorer for this Torrent */}
                    <div className="pt-1 border-t border-white/5 flex flex-col gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setExpandedFiles((prev) => ({ ...prev, [t.id]: !isExpanded }));
                        }}
                        className={`flex items-center justify-between text-xs font-mono font-bold py-1 ${
                          colorClasses.text
                        }`}
                      >
                        <span className="flex items-center gap-1.5">
                          <FileVideo className="w-3.5 h-3.5" />
                          <span>Files inside torrent ({t.files.length})</span>
                        </span>
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>

                      {isExpanded && (
                        <div className="flex flex-col gap-2 pt-1 max-h-60 overflow-y-auto custom-scrollbar pr-1">
                          {t.files.map((file) => (
                            <div
                              key={file.index}
                              className={`p-2.5 rounded-xl border flex items-center justify-between gap-3 text-xs ${
                                isLight
                                  ? 'bg-slate-50 border-slate-200 text-slate-800'
                                  : 'bg-black/30 border-white/5 text-white/90'
                              }`}
                            >
                              <div className="min-w-0 flex-1 flex items-center gap-2">
                                <FileVideo
                                  className={`w-4 h-4 shrink-0 ${file.isVideo ? colorClasses.text : 'opacity-40'}`}
                                />
                                <span className="truncate font-medium">{file.name}</span>
                              </div>

                              <div className="flex items-center gap-3 shrink-0 font-mono text-[11px]">
                                <span className="opacity-60">{file.lengthFormatted}</span>
                                {file.progress !== undefined && (
                                  <span className="opacity-60">{file.progress}%</span>
                                )}

                                {file.isVideo && onPlayMedia && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      streamInFlagshipPlayer(t, file);
                                    }}
                                    className={`px-3 py-1 rounded-lg font-bold flex items-center gap-1 text-white shadow transition-all ${colorClasses.bg}`}
                                    title="Stream in Flagship Player with Audio Visualizer"
                                  >
                                    <Play className="w-3 h-3 fill-current" />
                                    <span>Stream</span>
                                  </button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column (1 Col): Active Swarm Deep Inspection */}
        <div className="flex flex-col gap-6">
          {/* Swarm Details Card */}
          <div
            className={`border rounded-3xl p-6 flex flex-col gap-4 ${
              isLight ? 'bg-white border-slate-200 text-slate-900 shadow-sm' : 'bg-white/5 border-white/10 text-white'
            }`}
          >
            <h3 className="text-base font-bold flex items-center justify-between">
              <span>Swarm Inspection</span>
              {selectedTorrent && (
                <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold uppercase ${colorClasses.badge}`}>
                  Live Stream
                </span>
              )}
            </h3>

            {!selectedTorrent ? (
              <p className={`text-xs italic py-8 text-center ${isLight ? 'text-slate-400' : 'text-white/40'}`}>
                Select a torrent to inspect its swarm metrics, active wires, and bitfield pieces.
              </p>
            ) : (
              <div className="flex flex-col gap-4 text-xs font-mono">
                <div>
                  <p className="text-[10px] opacity-50 uppercase mb-1">Torrent Name</p>
                  <p className="font-bold truncate text-sm">{selectedTorrent.name}</p>
                </div>

                <div>
                  <p className="text-[10px] opacity-50 uppercase mb-1">InfoHash</p>
                  <p className="truncate opacity-80 select-all">{selectedTorrent.infoHash}</p>
                </div>

                <div>
                  <p className="text-[10px] opacity-50 uppercase mb-1">Host Directory</p>
                  <p className="truncate opacity-80 select-all">{selectedTorrent.savePath}</p>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/5">
                  <div
                    className={`p-2.5 rounded-xl border ${
                      isLight ? 'bg-slate-50 border-slate-200' : 'bg-black/30 border-white/5'
                    }`}
                  >
                    <p className="text-[10px] opacity-50 uppercase">Total Length</p>
                    <p className="font-bold text-sm mt-0.5">{selectedTorrent.lengthFormatted}</p>
                  </div>
                  <div
                    className={`p-2.5 rounded-xl border ${
                      isLight ? 'bg-slate-50 border-slate-200' : 'bg-black/30 border-white/5'
                    }`}
                  >
                    <p className="text-[10px] opacity-50 uppercase">Downloaded</p>
                    <p className="font-bold text-sm mt-0.5">{formatBytes(selectedTorrent.downloaded)}</p>
                  </div>
                </div>

                {/* Connected Wires / Peer Swarm */}
                <div className="pt-2 border-t border-white/5 flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5" />
                      <span>Connected Peer Wires ({(selectedTorrent.wires || []).length})</span>
                    </span>
                  </div>

                  {(selectedTorrent.wires || []).length === 0 ? (
                    <p className="italic opacity-50 text-[11px] py-2">
                      Connecting to BitTorrent swarm via DHT & TCP/UDP trackers...
                    </p>
                  ) : (
                    <div className="flex flex-col gap-1.5 max-h-48 overflow-y-auto custom-scrollbar">
                      {selectedTorrent.wires?.map((wire, idx) => (
                        <div
                          key={idx}
                          className={`p-2 rounded-xl border flex items-center justify-between text-[11px] ${
                            isLight
                              ? 'bg-slate-50 border-slate-200'
                              : 'bg-black/30 border-white/5 text-white/80'
                          }`}
                        >
                          <span className="font-bold truncate max-w-[140px]">{wire.client}</span>
                          <span className="opacity-70">↓ {formatBytes(wire.downloadSpeed)}/s</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* One-Click Stream Video Files */}
                <div className="pt-2 border-t border-white/5 flex flex-col gap-2">
                  <span className="font-bold text-[11px] uppercase tracking-wider opacity-70">
                    Streamable Media Files
                  </span>
                  {selectedTorrent.files.filter((f) => f.isVideo).length === 0 ? (
                    <p className="italic opacity-50 text-[11px]">No video containers detected.</p>
                  ) : (
                    selectedTorrent.files
                      .filter((f) => f.isVideo)
                      .map((file) => (
                        <button
                          key={file.index}
                          onClick={() => streamInFlagshipPlayer(selectedTorrent, file)}
                          className={`w-full p-3 rounded-2xl border font-bold flex items-center justify-between gap-2 transition-all hover:scale-[1.02] ${colorClasses.bgLight} ${colorClasses.border} ${colorClasses.text}`}
                        >
                          <div className="flex items-center gap-2 truncate text-left">
                            <Play className="w-4 h-4 fill-current shrink-0" />
                            <span className="truncate text-xs">{file.name}</span>
                          </div>
                          <span className="text-[10px] opacity-70 shrink-0">{file.lengthFormatted}</span>
                        </button>
                      ))
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
