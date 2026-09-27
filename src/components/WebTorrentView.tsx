import React, { useState, useEffect, useRef } from 'react';
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

  // Accordion state: by default, all torrents are collapsed or expanded on click
  const [expandedTorrents, setExpandedTorrents] = useState<Record<string, boolean>>({});
  const [expandedSwarmInfo, setExpandedSwarmInfo] = useState<Record<string, boolean>>({});
  const [expandedFiles, setExpandedFiles] = useState<Record<string, boolean>>({});
  const [expandedWires, setExpandedWires] = useState<Record<string, boolean>>({});
  const [showAllWires, setShowAllWires] = useState<Record<string, boolean>>({});
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [isOrganizing, setIsOrganizing] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const magnetInputRef = useRef<HTMLInputElement>(null);
  const isLight = theme === 'light';

  // Fetch live torrent list from backend daemon
  const fetchTorrents = async () => {
    try {
      const res = await fetch('/api/torrents');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setTorrents(data);
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
      if (!res.ok) throw new Error(data.error || 'Failed to upload .torrent file');
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
      showNotification(`Failed to pause: ${err.message}`, true);
    }
  };

  // Resume Torrent
  const handleResume = async (id: string) => {
    try {
      const res = await fetch(`/api/torrents/${id}/resume`, { method: 'POST' });
      if (res.ok) {
        showNotification('Torrent resumed');
        await fetchTorrents();
      }
    } catch (err: any) {
      showNotification(`Failed to resume: ${err.message}`, true);
    }
  };

  // Seed Torrent
  const handleSeed = async (id: string) => {
    try {
      const res = await fetch(`/api/torrents/${id}/seed`, { method: 'POST' });
      if (res.ok) {
        showNotification('Torrent set to Seeding mode');
        await fetchTorrents();
      }
    } catch (err: any) {
      showNotification(`Failed to seed: ${err.message}`, true);
    }
  };

  // Stop Torrent
  const handleStop = async (id: string) => {
    try {
      const res = await fetch(`/api/torrents/${id}/stop`, { method: 'POST' });
      if (res.ok) {
        showNotification('Torrent swarm stopped');
        await fetchTorrents();
      }
    } catch (err: any) {
      showNotification(`Failed to stop: ${err.message}`, true);
    }
  };

  // Delete Torrent
  const handleDelete = async (id: string, deleteFiles: boolean) => {
    try {
      const res = await fetch(`/api/torrents/${id}?deleteFiles=${deleteFiles}`, { method: 'DELETE' });
      if (res.ok) {
        setDeleteConfirmId(null);
        showNotification(`Torrent removed ${deleteFiles ? 'and disk files deleted' : ''}`);
        await fetchTorrents();
      }
    } catch (err: any) {
      showNotification(`Failed to remove: ${err.message}`, true);
    }
  };

  // Move completed files to media/new/ or media/new/other/
  const handleOrganize = async (id: string) => {
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

  const copyInfoHash = (torrent: TorrentItem) => {
    navigator.clipboard.writeText(torrent.infoHash || torrent.id);
    setCopiedId(torrent.id);
    setTimeout(() => setCopiedId(null), 2000);
    showNotification('InfoHash copied to clipboard');
  };

  // Launch in flagship OggleBox VideoPlayer
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
      poster: '/placeholder.jpg'
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
    <div className="wt-container custom-scrollbar">
      {/* Top Banner: Daemon Telemetry & Torrent Input */}
      <div className="wt-header-banner">
        <div className="wt-banner-top">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
              <span className="wt-pill-badge wt-badge-emerald">
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#10b981' }} />
                Backend Node.js Daemon Active
              </span>
              <span className="wt-pill-badge wt-badge-slate">
                TCP / UDP / DHT Swarm Enabled
              </span>
              <span className="wt-pill-badge wt-badge-slate">
                Saves to: ./media/Torrents • Moves to: ./media/new
              </span>
            </div>

            <h2 className="wt-title">
              BitTorrent <span style={{ color: '#22d3ee' }}>Engine Suite</span>
            </h2>
            <p style={{ fontSize: '0.875rem', color: '#94a3b8', marginTop: '0.25rem' }}>
              High-throughput BitTorrent client with sequential piece streaming, auto-moving completed files into <code style={{ color: '#22d3ee' }}>media/new</code>, automated thumbnail extraction, and media library synchronization.
            </p>
          </div>

          {/* Session Bandwidth Counter */}
          <div className="wt-speed-ticker">
            <div className="wt-speed-item">
              <Download style={{ width: '16px', height: '16px', color: '#22d3ee' }} />
              <div>
                <p style={{ fontSize: '10px', color: '#94a3b8', textTransform: 'uppercase' }}>Swarm Inbound</p>
                <p style={{ fontSize: '14px', fontWeight: 700, color: '#22d3ee', fontFamily: 'var(--font-mono)' }}>
                  {formatBytes(totalDownloadSpeed)}/s
                </p>
              </div>
            </div>
            <div style={{ width: '1px', height: '32px', backgroundColor: '#334155' }} />
            <div className="wt-speed-item">
              <Upload style={{ width: '16px', height: '16px', color: '#34d399' }} />
              <div>
                <p style={{ fontSize: '10px', color: '#94a3b8', textTransform: 'uppercase' }}>Swarm Outbound</p>
                <p style={{ fontSize: '14px', fontWeight: 700, color: '#34d399', fontFamily: 'var(--font-mono)' }}>
                  {formatBytes(totalUploadSpeed)}/s
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Action Bar: Magnet Input & Torrent Upload */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!magnetInput.trim()) {
              magnetInputRef.current?.focus();
              showNotification('Please paste a magnet link (magnet:?xt=urn:btih:...) or 40-character infoHash first.', true);
              return;
            }
            handleAddMagnet(magnetInput);
          }}
          className="wt-input-row"
        >
          <input
            ref={magnetInputRef}
            type="text"
            value={magnetInput}
            onChange={(e) => setMagnetInput(e.target.value)}
            placeholder="Paste magnet link (magnet:?xt=urn:btih:...) or 40-char infoHash..."
            className="wt-text-input"
          />

          <button
            type="submit"
            disabled={isSubmitting}
            className="wt-btn-primary"
            title="Add Torrent to Swarm"
          >
            <Plus style={{ width: '16px', height: '16px' }} />
            <span>{isSubmitting ? 'Adding...' : 'Add Torrent'}</span>
          </button>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="wt-btn-secondary"
            title="Upload local .torrent file"
          >
            <FileVideo style={{ width: '16px', height: '16px' }} />
            <span>Upload .torrent</span>
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept=".torrent"
            onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
            style={{ display: 'none' }}
          />
        </form>

        {/* Featured Legal Open-Source Torrents */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', fontSize: '0.75rem' }}>
          <span style={{ color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
            <Sparkles style={{ width: '14px', height: '14px', color: '#fbbf24' }} /> Instant Demos:
          </span>
          {FEATURED_TORRENTS.map((demo) => (
            <button
              key={demo.name}
              type="button"
              onClick={() => handleAddMagnet(demo.magnet)}
              style={{
                fontSize: '11px',
                padding: '0.25rem 0.625rem',
                borderRadius: '0.5rem',
                border: '1px solid #334155',
                backgroundColor: '#1e293b',
                color: '#cbd5e1',
                cursor: 'pointer'
              }}
            >
              {demo.name}
            </button>
          ))}
        </div>

        {/* Toast / Notification Banners */}
        {actionSuccess && (
          <div style={{ padding: '0.5rem 1rem', borderRadius: '0.5rem', backgroundColor: 'rgba(16, 185, 129, 0.15)', border: '1px solid rgba(16, 185, 129, 0.4)', color: '#34d399', fontSize: '12px', fontFamily: 'var(--font-mono)' }}>
            ✓ {actionSuccess}
          </div>
        )}
        {errorMessage && (
          <div style={{ padding: '0.5rem 1rem', borderRadius: '0.5rem', backgroundColor: 'rgba(244, 63, 94, 0.15)', border: '1px solid rgba(244, 63, 94, 0.4)', color: '#fb7185', fontSize: '12px', fontFamily: 'var(--font-mono)' }}>
            ⚠ {errorMessage}
          </div>
        )}
      </div>

      {/* Filter Bar & Summary */}
      <div className="wt-filter-bar">
        <div className="wt-filter-tabs">
          {(['all', 'downloading', 'seeding', 'paused', 'stopped'] as const).map((tab) => {
            const count = tab === 'all' 
              ? torrents.length 
              : torrents.filter(t => tab === 'downloading' ? (t.status === 'downloading' || t.status === 'metadata') : t.status === tab).length;
            
            return (
              <button
                key={tab}
                onClick={() => setFilterTab(tab)}
                className={`wt-filter-tab ${filterTab === tab ? 'active' : ''}`}
              >
                {tab} ({count})
              </button>
            );
          })}
        </div>

        <div style={{ fontSize: '12px', fontFamily: 'var(--font-mono)', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ color: '#22d3ee', fontWeight: 700 }}>{torrents.length}</span>
          <span>active swarms</span>
          <span>•</span>
          <span style={{ color: '#34d399', fontWeight: 700 }}>{formatBytes(totalDownloaded)}</span>
          <span>processed</span>
        </div>
      </div>

      {/* Torrent List (Clear, Logical, Planned Table of Items) */}
      {filteredTorrents.length === 0 ? (
        <div style={{
          backgroundColor: '#0f172a',
          border: '1px solid #334155',
          borderRadius: '1.25rem',
          padding: '3rem',
          textAlign: 'center',
          color: '#94a3b8'
        }}>
          <Radio style={{ width: '48px', height: '48px', color: '#22d3ee', margin: '0 auto 1rem', opacity: 0.6 }} />
          <h3 style={{ fontSize: '1.125rem', fontWeight: 700, color: '#ffffff', marginBottom: '0.5rem' }}>
            No BitTorrent downloads found
          </h3>
          <p style={{ fontSize: '0.8125rem', maxWidth: '400px', margin: '0 auto', color: '#64748b' }}>
            Paste a magnet link or click one of the open source demo buttons above to initiate downloads.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {filteredTorrents.map((t) => {
            const isExpanded = expandedTorrents[t.id] ?? false;
            const isSwarmOpen = expandedSwarmInfo[t.id] ?? false;
            const isFilesOpen = expandedFiles[t.id] ?? true;
            const isWiresOpen = expandedWires[t.id] ?? false;
            const isAllWires = showAllWires[t.id] ?? false;
            const wires = t.wires || [];
            const limitedWires = isAllWires ? wires : wires.slice(0, 8);

            const statusClass = 
              t.status === 'seeding' ? 'wt-badge-emerald' :
              t.status === 'downloading' ? 'wt-badge-cyan' :
              t.status === 'paused' ? 'wt-badge-amber' :
              t.status === 'stopped' ? 'wt-badge-slate' :
              'wt-badge-indigo';

            const isIsoOrZip = t.name.toLowerCase().endsWith('.iso') || t.name.toLowerCase().endsWith('.zip') || t.name.toLowerCase().endsWith('.tar.gz') || t.name.toLowerCase().endsWith('.rar');
            const isAudio = t.files.some(f => f.isAudio || ['mp3', 'flac', 'wav', 'aac', 'm4a', 'ogg', 'opus'].includes(f.name.split('.').pop()?.toLowerCase() || ''));

            return (
              <div key={t.id} className="wt-torrent-card">
                {/* Main Header Row */}
                <div
                  className="wt-torrent-row"
                  onClick={() => setExpandedTorrents(prev => ({ ...prev, [t.id]: !isExpanded }))}
                >
                  {/* Left Column: Status, Name, File Count, Size */}
                  <div className="wt-torrent-info">
                    <div className="wt-torrent-meta-top">
                      <span className={`wt-pill-badge ${statusClass}`}>
                        {t.status}
                      </span>
                      <span style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: '#94a3b8' }}>
                        {t.files.length} {t.files.length === 1 ? 'file' : 'files'}
                      </span>
                      <span style={{ color: '#475569' }}>•</span>
                      <span style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: '#e2e8f0', fontWeight: 700 }}>
                        {t.lengthFormatted}
                      </span>
                      <span style={{ color: '#475569' }}>•</span>
                      <span style={{ fontSize: '10px', fontFamily: 'var(--font-mono)', color: '#06b6d4', textTransform: 'uppercase' }}>
                        {t.category || 'Torrents'}
                      </span>
                    </div>

                    <div className="wt-torrent-title-line">
                      {isIsoOrZip ? (
                        <Disc style={{ width: '18px', height: '18px', color: '#fbbf24', flexShrink: 0 }} />
                      ) : isAudio ? (
                        <Music style={{ width: '18px', height: '18px', color: '#818cf8', flexShrink: 0 }} />
                      ) : (
                        <FileVideo style={{ width: '18px', height: '18px', color: '#22d3ee', flexShrink: 0 }} />
                      )}
                      <h3 className="wt-torrent-name" title={t.name}>
                        {t.name}
                      </h3>
                    </div>
                  </div>

                  {/* Middle Column: Live Bandwidth Ticker & Progress */}
                  <div className="wt-torrent-metrics">
                    {t.status === 'seeding' ? (
                      <div>
                        <p style={{ color: '#34d399', fontWeight: 700 }}>↑ {formatBytes(t.uploadSpeed)}/s</p>
                        <p style={{ fontSize: '10px', color: '#10b981', textAlign: 'right' }}>100% Done</p>
                      </div>
                    ) : t.status === 'downloading' || t.status === 'metadata' ? (
                      <div>
                        <p style={{ color: '#22d3ee', fontWeight: 700 }}>↓ {formatBytes(t.downloadSpeed)}/s</p>
                        <p style={{ fontSize: '10px', color: '#94a3b8', textAlign: 'right' }}>{t.progress}% • {formatETA(t.timeRemaining)}</p>
                      </div>
                    ) : (
                      <span style={{ color: '#64748b', fontStyle: 'italic' }}>Paused / Idle</span>
                    )}
                  </div>

                  {/* Right Column: Quick Action Controls */}
                  <div className="wt-torrent-actions" onClick={(e) => e.stopPropagation()}>
                    {/* Seed Button */}
                    <button
                      type="button"
                      onClick={() => handleSeed(t.id)}
                      className={`wt-action-btn ${t.status === 'seeding' ? 'active-green' : ''}`}
                      title="Seed Torrent (Share with swarm)"
                    >
                      <Upload style={{ width: '13px', height: '13px' }} />
                      <span className="wt-btn-label">Seed</span>
                    </button>

                    {/* Pause / Resume Button */}
                    {t.paused ? (
                      <button
                        type="button"
                        onClick={() => handleResume(t.id)}
                        className="wt-action-btn active-amber"
                        title="Resume Torrent"
                      >
                        <Play style={{ width: '13px', height: '13px', fill: 'currentColor' }} />
                        <span className="wt-btn-label">Resume</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handlePause(t.id)}
                        className="wt-action-btn"
                        title="Pause Torrent"
                      >
                        <Pause style={{ width: '13px', height: '13px' }} />
                        <span className="wt-btn-label">Pause</span>
                      </button>
                    )}

                    {/* Stop Button */}
                    <button
                      type="button"
                      onClick={() => handleStop(t.id)}
                      className="wt-action-btn"
                      title="Stop Torrent Swarm"
                    >
                      <Square style={{ width: '12px', height: '12px' }} />
                      <span className="wt-btn-label">Stop</span>
                    </button>

                    {/* Move / Organize Button */}
                    <button
                      type="button"
                      onClick={() => handleOrganize(t.id)}
                      disabled={isOrganizing === t.id}
                      className="wt-action-btn"
                      title="Organize / Move completed files into media/new/"
                    >
                      <FolderDown style={{ width: '13px', height: '13px', color: isOrganizing === t.id ? '#22d3ee' : 'inherit' }} />
                      <span className="wt-btn-label">{isOrganizing === t.id ? 'Moving...' : 'Move'}</span>
                    </button>

                    {/* Copy InfoHash / Magnet */}
                    <button
                      type="button"
                      onClick={() => copyInfoHash(t)}
                      className="wt-action-btn"
                      title="Copy InfoHash / Magnet"
                    >
                      {copiedId === t.id ? <Check style={{ width: '13px', height: '13px', color: '#34d399' }} /> : <Copy style={{ width: '13px', height: '13px' }} />}
                    </button>

                    {/* Delete Button */}
                    <button
                      type="button"
                      onClick={() => setDeleteConfirmId(t.id)}
                      className="wt-action-btn danger"
                      title="Remove Torrent"
                    >
                      <Trash2 style={{ width: '13px', height: '13px' }} />
                      <span className="wt-btn-label">Delete</span>
                    </button>

                    {/* Details Toggle Chevron Button */}
                    <button
                      type="button"
                      className="wt-action-btn"
                      title={isExpanded ? "Collapse Details" : "Expand Details"}
                      onClick={(e) => {
                        e.stopPropagation();
                        setExpandedTorrents(prev => ({ ...prev, [t.id]: !isExpanded }));
                      }}
                    >
                      {isExpanded ? <ChevronUp style={{ width: '14px', height: '14px' }} /> : <ChevronDown style={{ width: '14px', height: '14px' }} />}
                      <span className="wt-btn-label">{isExpanded ? 'Hide' : 'Details'}</span>
                    </button>
                  </div>
                </div>

                {/* Progress Bar under header */}
                <div className="wt-card-progress">
                  <div
                    className={`wt-card-progress-bar ${t.status}`}
                    style={{ width: `${Math.min(100, Math.max(0, t.progress))}%` }}
                  />
                </div>

                {/* Delete Confirmation Box */}
                {deleteConfirmId === t.id && (
                  <div style={{
                    padding: '0.75rem 1.25rem',
                    backgroundColor: 'rgba(244, 63, 94, 0.15)',
                    borderTop: '1px solid rgba(244, 63, 94, 0.3)',
                    borderBottom: '1px solid rgba(244, 63, 94, 0.3)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '0.5rem',
                    fontSize: '12px',
                    fontFamily: 'var(--font-mono)'
                  }}>
                    <span style={{ color: '#fecdd3' }}>Delete "{t.name}" from client?</span>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button
                        onClick={() => handleDelete(t.id, false)}
                        style={{ padding: '0.25rem 0.75rem', borderRadius: '0.5rem', backgroundColor: '#334155', color: '#ffffff', border: 'none', cursor: 'pointer', fontSize: '11px', fontWeight: 600 }}
                      >
                        Remove Torrent Only
                      </button>
                      <button
                        onClick={() => handleDelete(t.id, true)}
                        style={{ padding: '0.25rem 0.75rem', borderRadius: '0.5rem', backgroundColor: '#e11d48', color: '#ffffff', border: 'none', cursor: 'pointer', fontSize: '11px', fontWeight: 700 }}
                      >
                        Delete Files Too
                      </button>
                      <button
                        onClick={() => setDeleteConfirmId(null)}
                        style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '0.25rem' }}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                {/* Expanded Details Inspection Drawer */}
                {isExpanded && (
                  <div className="wt-drawer">
                    {/* Section 1: Telemetry Cards */}
                    <div className="wt-stat-boxes">
                      <div className="wt-stat-box">
                        <p className="wt-stat-label">
                          <Download style={{ width: '12px', height: '12px', color: '#22d3ee' }} /> Inbound Speed
                        </p>
                        <p className="wt-stat-value" style={{ color: '#22d3ee' }}>
                          {formatBytes(t.downloadSpeed)}/s
                        </p>
                      </div>

                      <div className="wt-stat-box">
                        <p className="wt-stat-label">
                          <Upload style={{ width: '12px', height: '12px', color: '#34d399' }} /> Outbound Speed
                        </p>
                        <p className="wt-stat-value" style={{ color: '#34d399' }}>
                          {formatBytes(t.uploadSpeed)}/s
                        </p>
                      </div>

                      <div className="wt-stat-box">
                        <p className="wt-stat-label">
                          <Users style={{ width: '12px', height: '12px', color: '#a5b4fc' }} /> Swarm Peers
                        </p>
                        <p className="wt-stat-value" style={{ color: '#a5b4fc' }}>
                          {t.numPeers} connected
                        </p>
                      </div>

                      <div className="wt-stat-box">
                        <p className="wt-stat-label">
                          <Percent style={{ width: '12px', height: '12px', color: '#fbbf24' }} /> Share Ratio
                        </p>
                        <p className="wt-stat-value" style={{ color: '#fbbf24' }}>
                          {t.ratio || 0}
                        </p>
                      </div>
                    </div>

                    {/* Section 2: Files in Torrent */}
                    <div className="wt-section-box">
                      <button
                        type="button"
                        onClick={() => setExpandedFiles(prev => ({ ...prev, [t.id]: !isFilesOpen }))}
                        className="wt-section-header"
                      >
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <HardDrive style={{ width: '16px', height: '16px', color: '#22d3ee' }} />
                          <span>Files inside torrent ({t.files.length})</span>
                        </span>
                        {isFilesOpen ? <ChevronUp style={{ width: '16px', height: '16px' }} /> : <ChevronDown style={{ width: '16px', height: '16px' }} />}
                      </button>

                      {isFilesOpen && (
                        <div className="wt-section-content">
                          {t.files.map((file) => {
                            const isAudio = file.isAudio || file.fileType === 'audio';
                            const isBinary = file.fileType === 'binary';
                            const isVideo = file.isVideo || file.fileType === 'video';

                            return (
                              <div key={file.index} className="wt-file-item">
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1, minWidth: '220px' }}>
                                  {isAudio ? (
                                    <Music style={{ width: '16px', height: '16px', color: '#818cf8', flexShrink: 0 }} />
                                  ) : isBinary ? (
                                    <Disc style={{ width: '16px', height: '16px', color: '#fbbf24', flexShrink: 0 }} />
                                  ) : (
                                    <FileVideo style={{ width: '16px', height: '16px', color: '#22d3ee', flexShrink: 0 }} />
                                  )}
                                  <span className="wt-file-name" title={file.name}>
                                    {file.name}
                                  </span>
                                </div>

                                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexShrink: 0 }}>
                                  <span style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: '#94a3b8' }}>
                                    {file.lengthFormatted}
                                  </span>
                                  {file.progress !== undefined && (
                                    <span style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: '#34d399', fontWeight: 700 }}>
                                      {file.progress}%
                                    </span>
                                  )}

                                  {/* Play / Stream Button for Media */}
                                  {(isVideo || isAudio) && onPlayMedia && (
                                    <button
                                      type="button"
                                      onClick={() => streamInFlagshipPlayer(t, file)}
                                      style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '0.375rem',
                                        padding: '0.25rem 0.625rem',
                                        borderRadius: '0.5rem',
                                        backgroundColor: '#0284c7',
                                        color: '#ffffff',
                                        border: 'none',
                                        fontSize: '11px',
                                        fontWeight: 700,
                                        cursor: 'pointer'
                                      }}
                                    >
                                      <Play style={{ width: '12px', height: '12px', fill: 'currentColor' }} />
                                      <span>{isAudio ? 'Play Audio' : 'Stream'}</span>
                                    </button>
                                  )}

                                  {isBinary && (
                                    <span style={{
                                      fontSize: '10px',
                                      fontWeight: 700,
                                      padding: '0.25rem 0.5rem',
                                      borderRadius: '0.375rem',
                                      backgroundColor: 'rgba(245, 158, 11, 0.15)',
                                      color: '#fbbf24',
                                      border: '1px solid rgba(245, 158, 11, 0.3)'
                                    }}>
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

                    {/* Section 3: Technical Swarm Details */}
                    <div className="wt-section-box">
                      <button
                        type="button"
                        onClick={() => setExpandedSwarmInfo(prev => ({ ...prev, [t.id]: !isSwarmOpen }))}
                        className="wt-section-header"
                      >
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <Activity style={{ width: '16px', height: '16px', color: '#22d3ee' }} />
                          <span>Technical Swarm Information & Directories</span>
                        </span>
                        {isSwarmOpen ? <ChevronUp style={{ width: '16px', height: '16px' }} /> : <ChevronDown style={{ width: '16px', height: '16px' }} />}
                      </button>

                      {isSwarmOpen && (
                        <div className="wt-section-content" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem', fontSize: '12px', fontFamily: 'var(--font-mono)' }}>
                          <div>
                            <p style={{ fontSize: '10px', color: '#64748b', textTransform: 'uppercase' }}>InfoHash</p>
                            <p style={{ color: '#cbd5e1', wordBreak: 'break-all', userSelect: 'all' }}>{t.infoHash}</p>
                          </div>
                          <div>
                            <p style={{ fontSize: '10px', color: '#64748b', textTransform: 'uppercase' }}>Host Directory</p>
                            <p style={{ color: '#cbd5e1', wordBreak: 'break-all', userSelect: 'all' }}>{t.savePath}</p>
                          </div>
                          <div>
                            <p style={{ fontSize: '10px', color: '#64748b', textTransform: 'uppercase' }}>Total Downloaded</p>
                            <p style={{ color: '#e2e8f0', fontWeight: 700 }}>{formatBytes(t.downloaded)}</p>
                          </div>
                          <div>
                            <p style={{ fontSize: '10px', color: '#64748b', textTransform: 'uppercase' }}>Category</p>
                            <p style={{ color: '#22d3ee', fontWeight: 700 }}>{t.category || 'Torrents'}</p>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Section 4: Connected Swarm Peers (Limited window of 8 wires) */}
                    <div className="wt-section-box">
                      <button
                        type="button"
                        onClick={() => setExpandedWires(prev => ({ ...prev, [t.id]: !isWiresOpen }))}
                        className="wt-section-header"
                      >
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <Users style={{ width: '16px', height: '16px', color: '#818cf8' }} />
                          <span>Connected Swarm Peers ({wires.length})</span>
                          <span style={{ fontSize: '10px', color: '#64748b', fontWeight: 400 }}>
                            {wires.length > 8 && !isAllWires ? '(Showing top 8 active)' : ''}
                          </span>
                        </span>
                        {isWiresOpen ? <ChevronUp style={{ width: '16px', height: '16px' }} /> : <ChevronDown style={{ width: '16px', height: '16px' }} />}
                      </button>

                      {isWiresOpen && (
                        <div className="wt-section-content">
                          {wires.length === 0 ? (
                            <p style={{ fontSize: '11px', color: '#64748b', fontStyle: 'italic', padding: '0.5rem 0' }}>
                              Announcing to TCP/UDP trackers and discovering DHT peers...
                            </p>
                          ) : (
                            <>
                              <div className="wt-peer-grid-container custom-scrollbar">
                                {limitedWires.map((wire, idx) => (
                                  <div key={idx} className="wt-peer-item">
                                    <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '160px' }}>
                                      <p style={{ fontWeight: 700, color: '#ffffff' }}>{wire.client}</p>
                                      <p style={{ fontSize: '9px', color: '#64748b' }}>{wire.address}</p>
                                    </div>
                                    <span style={{ color: '#22d3ee', fontWeight: 700 }}>
                                      ↓ {formatBytes(wire.downloadSpeed)}/s
                                    </span>
                                  </div>
                                ))}
                              </div>

                              {wires.length > 8 && (
                                <button
                                  type="button"
                                  onClick={() => setShowAllWires(prev => ({ ...prev, [t.id]: !isAllWires }))}
                                  style={{
                                    marginTop: '0.5rem',
                                    background: 'transparent',
                                    border: 'none',
                                    color: '#22d3ee',
                                    fontSize: '11px',
                                    fontFamily: 'var(--font-mono)',
                                    cursor: 'pointer',
                                    padding: '0.25rem 0'
                                  }}
                                >
                                  {isAllWires ? '▲ Show top 8 peers only' : `▼ Show all ${wires.length} connected peers`}
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
