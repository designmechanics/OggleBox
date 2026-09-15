import React, { useState, useEffect, useRef } from 'react';
// @ts-ignore
import WebTorrent from 'webtorrent/dist/webtorrent.min.js';
import {
  Play, Download, Upload, Users, HardDrive, FileVideo, AlertCircle, X,
  Pause, Trash2, Share2, Copy, Check, Clock, Percent, Activity, ChevronDown, ChevronUp, Plus
} from 'lucide-react';
import type { PrimaryColorKey, ThemeMode } from '../types';

interface WebTorrentViewProps {
  theme: ThemeMode;
  primaryColor: PrimaryColorKey;
}

interface TorrentItem {
  id: string;
  name: string;
  magnetURI: string;
  progress: number;
  downloadSpeed: number;
  uploadSpeed: number;
  numPeers: number;
  downloaded: number;
  length: number;
  timeRemaining: number;
  ratio: number;
  paused: boolean;
  isSeeding: boolean;
  torrentObj: any;
  files: any[];
  wires: any[];
  pieces: boolean[];
}

export default function WebTorrentView({ theme, primaryColor }: WebTorrentViewProps) {
  const [torrentInput, setTorrentInput] = useState('');
  const [client, setClient] = useState<any>(null);
  const [torrents, setTorrents] = useState<TorrentItem[]>([]);
  const [selectedTorrentId, setSelectedTorrentId] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<any>(null);

  const [errorMsg, setErrorMsg] = useState('');
  const [copiedMagnetId, setCopiedMagnetId] = useState<string | null>(null);
  const [showPeers, setShowPeers] = useState(false);
  const [showPieces, setShowPieces] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const seedInputRef = useRef<HTMLInputElement>(null);

  const isLight = theme === 'light';

  const colorClasses = React.useMemo(() => {
    switch (primaryColor) {
      case 'pink':
        return {
          text: 'text-pink-400',
          bg: 'bg-pink-500',
          bgLight: 'bg-pink-500/10',
          border: 'border-pink-500/30',
          gradient: 'from-pink-400 to-rose-600',
          ring: 'focus:ring-pink-500/50'
        };
      case 'emerald':
        return {
          text: 'text-emerald-400',
          bg: 'bg-emerald-500',
          bgLight: 'bg-emerald-500/10',
          border: 'border-emerald-500/30',
          gradient: 'from-emerald-400 to-teal-600',
          ring: 'focus:ring-emerald-500/50'
        };
      case 'amber':
        return {
          text: 'text-amber-400',
          bg: 'bg-amber-500',
          bgLight: 'bg-amber-500/10',
          border: 'border-amber-500/30',
          gradient: 'from-amber-400 to-orange-600',
          ring: 'focus:ring-amber-500/50'
        };
      default:
        return {
          text: 'text-cyan-400',
          bg: 'bg-cyan-500',
          bgLight: 'bg-cyan-500/10',
          border: 'border-cyan-500/30',
          gradient: 'from-cyan-400 to-indigo-600',
          ring: 'focus:ring-cyan-500/50'
        };
    }
  }, [primaryColor]);

  useEffect(() => {
    const wtClient = new WebTorrent();
    setClient(wtClient);

    const interval = setInterval(() => {
      if (wtClient && wtClient.torrents) {
        setTorrents(wtClient.torrents.map((t: any) => {
          const pieceArray: boolean[] = [];
          if (t.pieces) {
            const numPieces = t.pieces.length || 0;
            for (let i = 0; i < numPieces; i++) {
              const isDownloaded = typeof t.pieces.get === 'function' ? Boolean(t.pieces.get(i)) : Boolean(t.pieces[i]);
              pieceArray.push(isDownloaded);
            }
          }

          const wireList = (t.wires || []).map((w: any) => ({
            peerId: w.peerId || 'Unknown',
            address: w.remoteAddress || 'WebRTC Peer',
            client: w.clientName || 'WebTorrent Client',
            downloadSpeed: typeof w.downloadSpeed === 'function' ? w.downloadSpeed() : (w.downloadSpeed || 0),
            uploadSpeed: typeof w.uploadSpeed === 'function' ? w.uploadSpeed() : (w.uploadSpeed || 0)
          }));

          return {
            id: t.infoHash || t.magnetURI || String(Math.random()),
            name: t.name || 'Unnamed Torrent',
            magnetURI: t.magnetURI || '',
            progress: Math.round((t.progress || 0) * 100),
            downloadSpeed: t.downloadSpeed || 0,
            uploadSpeed: t.uploadSpeed || 0,
            numPeers: t.numPeers || 0,
            downloaded: t.downloaded || 0,
            length: t.length || 0,
            timeRemaining: t.timeRemaining || 0,
            ratio: t.ratio || 0,
            paused: t.paused || false,
            isSeeding: t.progress === 1,
            torrentObj: t,
            files: t.files || [],
            wires: wireList,
            pieces: pieceArray
          };
        }));
      }
    }, 1000);

    return () => {
      clearInterval(interval);
      wtClient.destroy();
    };
  }, []);

  const formatBytes = (bytes: number): string => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatETA = (ms: number): string => {
    if (!ms || !isFinite(ms) || ms <= 0) return 'Done / N/A';
    const seconds = Math.floor(ms / 1000);
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    const h = Math.floor(m / 60);
    if (h > 0) return `${h}h ${m % 60}m`;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
  };

  const selectedTorrent = torrents.find(t => t.id === selectedTorrentId) || torrents[0] || null;

  const handleAddTorrent = (torrentId: string | File) => {
    if (!client) return;
    setErrorMsg('');

    try {
      client.add(torrentId, (t: any) => {
        const id = t.infoHash || t.magnetURI;
        setSelectedTorrentId(id);

        const videoFiles = (t.files || []).filter((f: any) =>
          f.name.endsWith('.mp4') || f.name.endsWith('.mkv') ||
          f.name.endsWith('.webm') || f.name.endsWith('.avi') || f.name.endsWith('.mov')
        );
        const mainFile = videoFiles.length > 0
          ? videoFiles.reduce((prev: any, curr: any) => (prev.length > curr.length ? prev : curr))
          : t.files[0];

        if (mainFile) {
          setSelectedFile(mainFile);
        }

        t.on('error', (err: any) => {
          setErrorMsg(err instanceof Error ? err.message : String(err));
        });
      });
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : String(err));
    }
  };

  const handleSeedFiles = (files: FileList | File[]) => {
    if (!client || !files || files.length === 0) return;
    setErrorMsg('');

    try {
      client.seed(files, (t: any) => {
        const id = t.infoHash || t.magnetURI;
        setSelectedTorrentId(id);

        const videoFiles = (t.files || []).filter((f: any) =>
          f.name.endsWith('.mp4') || f.name.endsWith('.mkv') ||
          f.name.endsWith('.webm') || f.name.endsWith('.avi') || f.name.endsWith('.mov')
        );
        if (videoFiles[0]) setSelectedFile(videoFiles[0]);
      });
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : String(err));
    }
  };

  const togglePauseTorrent = (tItem: TorrentItem) => {
    if (tItem.torrentObj) {
      if (tItem.paused) {
        tItem.torrentObj.resume();
      } else {
        tItem.torrentObj.pause();
      }
    }
  };

  const removeTorrent = (tItem: TorrentItem) => {
    if (tItem.torrentObj) {
      tItem.torrentObj.destroy();
      if (selectedTorrentId === tItem.id) {
        setSelectedTorrentId(null);
        setSelectedFile(null);
      }
    }
  };

  const copyMagnet = (tItem: TorrentItem) => {
    if (tItem.magnetURI) {
      navigator.clipboard.writeText(tItem.magnetURI);
      setCopiedMagnetId(tItem.id);
      setTimeout(() => setCopiedMagnetId(null), 2500);
    }
  };

  const downloadFileToDisk = (file: any) => {
    if (!file) return;
    file.getBlobURL((err: any, url: string) => {
      if (err || !url) return;
      const a = document.createElement('a');
      a.href = url;
      a.download = file.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    });
  };

  useEffect(() => {
    if (selectedFile && videoRef.current) {
      selectedFile.renderTo(videoRef.current, {
        autoplay: true
      });
    }
  }, [selectedFile]);

  return (
    <div className="flex-1 h-full overflow-y-auto p-6 md:p-8 custom-scrollbar flex flex-col gap-6">
      {/* Top Banner / Drag & Drop Seeding Area */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            handleSeedFiles(e.dataTransfer.files);
          }
        }}
        className={`border rounded-3xl p-6 md:p-8 backdrop-blur-xl relative overflow-hidden transition-all ${
          dragOver
            ? `${colorClasses.border} ${colorClasses.bgLight} scale-[1.01]`
            : isLight ? 'bg-white/80 border-slate-200 shadow-sm text-slate-900' : 'bg-white/5 border-white/10 text-white'
        }`}
      >
        <div className="max-w-4xl">
          <div className="flex items-center gap-2 mb-2">
            <span className={`text-[10px] font-mono uppercase tracking-widest px-2.5 py-1 rounded-full border font-bold ${colorClasses.bgLight} ${colorClasses.text} ${colorClasses.border}`}>
              Peer-to-Peer Engine
            </span>
          </div>
          <h2 className="text-2xl md:text-3xl font-black italic uppercase tracking-tight mb-2">
            WebTorrent <span className={colorClasses.text}>Suite</span>
          </h2>
          <p className={`text-sm mb-6 ${isLight ? 'text-slate-600' : 'text-white/60'}`}>
            Stream magnet links, seed local media files over WebRTC, and manage real-time peer swarms. Drag & drop files anywhere here to seed.
          </p>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (torrentInput.trim()) {
                handleAddTorrent(torrentInput.trim());
                setTorrentInput('');
              }
            }}
            className="flex flex-col sm:flex-row gap-3"
          >
            <input
              type="text"
              value={torrentInput}
              onChange={(e) => setTorrentInput(e.target.value)}
              placeholder="Paste magnet link (magnet:?xt=urn:btih:...)..."
              className={`flex-1 border rounded-2xl px-4 py-3 text-sm focus:outline-none transition-all ${
                isLight
                  ? 'bg-slate-100 border-slate-300 text-slate-900 placeholder:text-slate-400 focus:bg-white focus:ring-2 focus:ring-slate-400'
                  : `bg-black/40 border-white/10 text-white placeholder:text-white/30 focus:ring-2 ${colorClasses.ring}`
              }`}
            />

            <button
              type="submit"
              disabled={!torrentInput.trim()}
              className={`font-bold px-6 py-3 rounded-2xl flex items-center justify-center gap-2 text-white shadow-lg transition-all disabled:opacity-50 bg-gradient-to-r ${colorClasses.gradient}`}
            >
              <Play className="w-4 h-4 fill-current" />
              <span>Stream Magnet</span>
            </button>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className={`font-medium px-5 py-3 rounded-2xl flex items-center justify-center gap-2 border transition-colors ${
                isLight ? 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-300' : 'bg-white/10 hover:bg-white/20 text-white border-white/10'
              }`}
            >
              <FileVideo className="w-4 h-4" />
              <span>Open .torrent</span>
            </button>

            <button
              type="button"
              onClick={() => seedInputRef.current?.click()}
              className={`font-medium px-5 py-3 rounded-2xl flex items-center justify-center gap-2 border transition-colors ${
                colorClasses.bgLight
              } ${colorClasses.text} ${colorClasses.border}`}
            >
              <Share2 className="w-4 h-4" />
              <span>Seed File</span>
            </button>

            <input ref={fileInputRef} type="file" accept=".torrent" onChange={(e) => e.target.files?.[0] && handleAddTorrent(e.target.files[0])} className="hidden" />
            <input ref={seedInputRef} type="file" multiple onChange={(e) => e.target.files && handleSeedFiles(e.target.files)} className="hidden" />
          </form>

          {errorMsg && (
            <div className="mt-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}
        </div>
      </div>

      {/* Main Grid: Multi-Torrent Dashboard & Video Player */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Player & Active Torrent Details */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          {/* HTML5 Video Container */}
          <div className={`aspect-video rounded-3xl overflow-hidden border bg-black relative flex items-center justify-center shadow-2xl ${
            isLight ? 'border-slate-300' : 'border-white/10'
          }`}>
            <video ref={videoRef} controls className="w-full h-full object-contain" />
            {!selectedFile && (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-white/40 gap-3 p-6 text-center">
                <FileVideo className="w-16 h-16 stroke-1 opacity-50" />
                <p className="text-sm">Select a video file from an active torrent to start streaming.</p>
              </div>
            )}
          </div>

          {/* Active Torrent Full Metrics Bar */}
          {selectedTorrent && (
            <div className={`border rounded-3xl p-6 flex flex-col gap-4 ${
              isLight ? 'bg-white border-slate-200 text-slate-800 shadow-sm' : 'bg-white/5 border-white/10 text-white'
            }`}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/5">
                <div>
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold uppercase ${
                      selectedTorrent.isSeeding ? 'bg-emerald-500/20 text-emerald-400' : 'bg-cyan-500/20 text-cyan-400'
                    }`}>
                      {selectedTorrent.isSeeding ? 'Seeding' : selectedTorrent.paused ? 'Paused' : 'Downloading'}
                    </span>
                    <h3 className="text-base font-bold truncate max-w-md">{selectedTorrent.name}</h3>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => togglePauseTorrent(selectedTorrent)}
                    className={`p-2 rounded-xl border transition-colors ${
                      isLight ? 'bg-slate-100 hover:bg-slate-200 text-slate-700' : 'bg-white/10 hover:bg-white/20 text-white border-white/10'
                    }`}
                    title={selectedTorrent.paused ? "Resume Download" : "Pause Download"}
                  >
                    {selectedTorrent.paused ? <Play className="w-4 h-4 fill-current" /> : <Pause className="w-4 h-4" />}
                  </button>

                  <button
                    onClick={() => copyMagnet(selectedTorrent)}
                    className={`p-2 rounded-xl border transition-colors ${
                      isLight ? 'bg-slate-100 hover:bg-slate-200 text-slate-700' : 'bg-white/10 hover:bg-white/20 text-white border-white/10'
                    }`}
                    title="Copy Magnet Link"
                  >
                    {copiedMagnetId === selectedTorrent.id ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  </button>

                  <button
                    onClick={() => removeTorrent(selectedTorrent)}
                    className="p-2 rounded-xl border border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors"
                    title="Remove Torrent"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Metrics Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs font-mono">
                <div className="p-3 rounded-2xl bg-black/20 border border-white/5">
                  <p className="text-[10px] opacity-60 uppercase flex items-center gap-1">
                    <Download className="w-3 h-3" /> Speed
                  </p>
                  <p className="font-bold text-sm mt-0.5">{formatBytes(selectedTorrent.downloadSpeed)}/s</p>
                </div>
                <div className="p-3 rounded-2xl bg-black/20 border border-white/5">
                  <p className="text-[10px] opacity-60 uppercase flex items-center gap-1">
                    <Upload className="w-3 h-3" /> Upload
                  </p>
                  <p className="font-bold text-sm mt-0.5">{formatBytes(selectedTorrent.uploadSpeed)}/s</p>
                </div>
                <div className="p-3 rounded-2xl bg-black/20 border border-white/5">
                  <p className="text-[10px] opacity-60 uppercase flex items-center gap-1">
                    <Clock className="w-3 h-3" /> ETA
                  </p>
                  <p className="font-bold text-sm mt-0.5">{formatETA(selectedTorrent.timeRemaining)}</p>
                </div>
                <div className="p-3 rounded-2xl bg-black/20 border border-white/5">
                  <p className="text-[10px] opacity-60 uppercase flex items-center gap-1">
                    <Percent className="w-3 h-3" /> Share Ratio
                  </p>
                  <p className="font-bold text-sm mt-0.5">{selectedTorrent.ratio.toFixed(2)}</p>
                </div>
                <div className="p-3 rounded-2xl bg-black/20 border border-white/5">
                  <p className="text-[10px] opacity-60 uppercase flex items-center gap-1">
                    <Users className="w-3 h-3" /> Peers
                  </p>
                  <p className="font-bold text-sm mt-0.5">{selectedTorrent.numPeers}</p>
                </div>
              </div>

              {/* Collapsible Panels: Peers List & Piece Bitfield Visualizer */}
              <div className="flex flex-col gap-3 pt-2">
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowPeers(!showPeers)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-mono border flex items-center gap-1.5 transition-colors ${
                      showPeers ? `${colorClasses.bgLight} ${colorClasses.text} ${colorClasses.border}` : isLight ? 'bg-slate-100 text-slate-700' : 'bg-white/5 text-white/70 border-white/10'
                    }`}
                  >
                    <Users className="w-3.5 h-3.5" />
                    <span>Peer Swarm ({selectedTorrent.wires.length})</span>
                    {showPeers ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </button>

                  <button
                    onClick={() => setShowPieces(!showPieces)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-mono border flex items-center gap-1.5 transition-colors ${
                      showPieces ? `${colorClasses.bgLight} ${colorClasses.text} ${colorClasses.border}` : isLight ? 'bg-slate-100 text-slate-700' : 'bg-white/5 text-white/70 border-white/10'
                    }`}
                  >
                    <Activity className="w-3.5 h-3.5" />
                    <span>Piece Bitfield ({selectedTorrent.pieces.length} blocks)</span>
                    {showPieces ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </button>
                </div>

                {/* Peer List View */}
                {showPeers && (
                  <div className={`p-4 rounded-2xl border max-h-48 overflow-y-auto text-xs font-mono ${
                    isLight ? 'bg-slate-50 border-slate-200 text-slate-800' : 'bg-black/40 border-white/5 text-white/80'
                  }`}>
                    {selectedTorrent.wires.length === 0 ? (
                      <p className="italic opacity-50">No active peer wires connected yet.</p>
                    ) : (
                      <div className="flex flex-col gap-2">
                        {selectedTorrent.wires.map((wire, idx) => (
                          <div key={idx} className="flex items-center justify-between pb-1.5 border-b border-white/5">
                            <div>
                              <p className="font-bold">{wire.client} ({wire.address})</p>
                            </div>
                            <div className="flex items-center gap-3 text-[11px] opacity-70">
                              <span>↓ {formatBytes(wire.downloadSpeed)}/s</span>
                              <span>↑ {formatBytes(wire.uploadSpeed)}/s</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Piece Bitfield Visualizer Grid */}
                {showPieces && (
                  <div className={`p-4 rounded-2xl border flex flex-wrap gap-1 max-h-48 overflow-y-auto ${
                    isLight ? 'bg-slate-50 border-slate-200' : 'bg-black/40 border-white/5'
                  }`}>
                    {selectedTorrent.pieces.length === 0 ? (
                      <p className="text-xs font-mono italic opacity-50">Bitfield metadata pending...</p>
                    ) : (
                      selectedTorrent.pieces.map((isDownloaded, pIdx) => (
                        <div
                          key={pIdx}
                          title={`Piece #${pIdx + 1}: ${isDownloaded ? 'Downloaded' : 'Missing'}`}
                          className={`w-3 h-3 rounded-sm transition-colors ${
                            isDownloaded ? 'bg-cyan-400' : isLight ? 'bg-slate-300' : 'bg-white/10'
                          }`}
                        />
                      ))
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Multi-Torrent Dashboard & File Explorer */}
        <div className="flex flex-col gap-6">
          {/* Active Torrents Dashboard List */}
          <div className={`border rounded-3xl p-6 flex flex-col gap-4 ${
            isLight ? 'bg-white border-slate-200 text-slate-900 shadow-sm' : 'bg-white/5 border-white/10 text-white'
          }`}>
            <h3 className="text-base font-bold flex items-center justify-between">
              <span>Active Swarms</span>
              <span className={`text-xs font-mono px-2 py-0.5 rounded ${isLight ? 'bg-slate-100 text-slate-600' : 'bg-white/10 text-white/60'}`}>
                {torrents.length} active
              </span>
            </h3>

            {torrents.length === 0 ? (
              <p className={`text-xs italic py-8 text-center ${isLight ? 'text-slate-400' : 'text-white/40'}`}>
                No active torrents in session. Add a magnet link above to start.
              </p>
            ) : (
              <div className="flex flex-col gap-2.5 max-h-60 overflow-y-auto custom-scrollbar pr-1">
                {torrents.map((tItem) => {
                  const isSelected = selectedTorrent?.id === tItem.id;

                  return (
                    <div
                      key={tItem.id}
                      onClick={() => setSelectedTorrentId(tItem.id)}
                      className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex flex-col gap-2 ${
                        isSelected
                          ? `${colorClasses.bgLight} ${colorClasses.border}`
                          : isLight
                          ? 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                          : 'bg-white/5 border-white/5 hover:bg-white/10'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <h4 className="text-xs font-bold truncate max-w-[180px]">{tItem.name}</h4>
                        <span className="text-[10px] font-mono font-bold">{tItem.progress}%</span>
                      </div>

                      <div className="w-full h-1.5 bg-black/20 rounded-full overflow-hidden">
                        <div className={`h-full ${colorClasses.bg}`} style={{ width: `${tItem.progress}%` }} />
                      </div>

                      <div className="flex items-center justify-between text-[10px] font-mono opacity-70">
                        <span>↓ {formatBytes(tItem.downloadSpeed)}/s</span>
                        <span>{tItem.numPeers} peers</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Selected Torrent Files List */}
          <div className={`border rounded-3xl p-6 flex flex-col gap-4 ${
            isLight ? 'bg-white border-slate-200 text-slate-900 shadow-sm' : 'bg-white/5 border-white/10 text-white'
          }`}>
            <h3 className="text-base font-bold flex items-center justify-between">
              <span>File Browser</span>
              <span className={`text-xs font-mono px-2 py-0.5 rounded ${isLight ? 'bg-slate-100 text-slate-600' : 'bg-white/10 text-white/60'}`}>
                {selectedTorrent?.files.length || 0} files
              </span>
            </h3>

            {!selectedTorrent || selectedTorrent.files.length === 0 ? (
              <p className={`text-xs italic py-8 text-center ${isLight ? 'text-slate-400' : 'text-white/40'}`}>
                Select a torrent to inspect and stream files.
              </p>
            ) : (
              <div className="flex flex-col gap-2 overflow-y-auto max-h-[350px] custom-scrollbar pr-1">
                {selectedTorrent.files.map((file: any, idx: number) => {
                  const isVideo = file.name.endsWith('.mp4') || file.name.endsWith('.mkv') ||
                    file.name.endsWith('.webm') || file.name.endsWith('.avi') || file.name.endsWith('.mov');
                  const isSelected = selectedFile === file;

                  return (
                    <div
                      key={idx}
                      className={`p-3 rounded-2xl border transition-all text-xs flex items-center justify-between gap-2 ${
                        isSelected
                          ? `${colorClasses.bgLight} ${colorClasses.border} ${colorClasses.text} font-bold`
                          : isVideo
                          ? isLight
                            ? 'bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-800'
                            : 'bg-white/5 border-white/5 hover:bg-white/10 text-white/90'
                          : isLight
                          ? 'bg-slate-100 border-slate-200 opacity-50 text-slate-500'
                          : 'bg-white/5 border-white/5 opacity-40 text-white/40'
                      }`}
                    >
                      <button
                        onClick={() => isVideo && setSelectedFile(file)}
                        disabled={!isVideo}
                        className="flex items-center gap-2 min-w-0 text-left flex-1"
                      >
                        <FileVideo className="w-4 h-4 shrink-0" />
                        <span className="truncate">{file.name}</span>
                      </button>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className="font-mono text-[10px] opacity-70">
                          {formatBytes(file.length)}
                        </span>
                        <button
                          onClick={() => downloadFileToDisk(file)}
                          className={`p-1.5 rounded-lg border transition-colors ${
                            isLight ? 'bg-white hover:bg-slate-200 text-slate-700' : 'bg-white/10 hover:bg-white/20 text-white border-white/10'
                          }`}
                          title="Save File to Disk"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
