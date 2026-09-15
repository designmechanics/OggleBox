import React, { useState, useEffect, useRef } from 'react';
// @ts-ignore
import WebTorrent from 'webtorrent/dist/webtorrent.min.js';
import { Play, Download, Upload, Users, HardDrive, FileVideo, AlertCircle, X, Shield, RefreshCw } from 'lucide-react';
import type { PrimaryColorKey, ThemeMode } from '../types';

interface WebTorrentViewProps {
  theme: ThemeMode;
  primaryColor: PrimaryColorKey;
}

export default function WebTorrentView({ theme, primaryColor }: WebTorrentViewProps) {
  const [torrentInput, setTorrentInput] = useState('');
  const [client, setClient] = useState<WebTorrent.Instance | null>(null);
  const [torrent, setTorrent] = useState<WebTorrent.Torrent | null>(null);
  const [files, setFiles] = useState<WebTorrent.TorrentFile[]>([]);
  const [selectedFile, setSelectedFile] = useState<WebTorrent.TorrentFile | null>(null);

  const [progress, setProgress] = useState(0);
  const [downloadSpeed, setDownloadSpeed] = useState(0);
  const [uploadSpeed, setUploadSpeed] = useState(0);
  const [numPeers, setNumPeers] = useState(0);
  const [downloaded, setDownloaded] = useState(0);
  const [totalSize, setTotalSize] = useState(0);
  const [status, setStatus] = useState<'idle' | 'connecting' | 'downloading' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

    return () => {
      wtClient.destroy();
    };
  }, []);

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleAddTorrent = (torrentId: string | File) => {
    if (!client) return;
    setStatus('connecting');
    setErrorMsg('');

    if (torrent) {
      torrent.destroy();
      setTorrent(null);
      setFiles([]);
      setSelectedFile(null);
    }

    try {
      client.add(torrentId, (t) => {
        setTorrent(t);
        setFiles(t.files);
        setTotalSize(t.length);
        setStatus('downloading');

        // Find largest video file by default
        const videoFiles = t.files.filter(f =>
          f.name.endsWith('.mp4') || f.name.endsWith('.mkv') ||
          f.name.endsWith('.webm') || f.name.endsWith('.avi') || f.name.endsWith('.mov')
        );
        const mainFile = videoFiles.length > 0
          ? videoFiles.reduce((prev, curr) => (prev.length > curr.length ? prev : curr))
          : t.files[0];

        if (mainFile) {
          setSelectedFile(mainFile);
        }

        t.on('download', () => {
          setProgress(Math.round(t.progress * 100));
          setDownloadSpeed(t.downloadSpeed);
          setUploadSpeed(t.uploadSpeed);
          setNumPeers(t.numPeers);
          setDownloaded(t.downloaded);
        });

        t.on('error', (err) => {
          setStatus('error');
          setErrorMsg(err instanceof Error ? err.message : String(err));
        });
      });
    } catch (err) {
      setStatus('error');
      setErrorMsg(err instanceof Error ? err.message : String(err));
    }
  };

  useEffect(() => {
    if (selectedFile && videoRef.current) {
      selectedFile.renderTo(videoRef.current, {
        autoplay: true
      });
    }
  }, [selectedFile]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleAddTorrent(file);
    }
  };

  return (
    <div className="flex-1 h-full overflow-y-auto p-6 md:p-8 custom-scrollbar flex flex-col gap-6">
      {/* Input Header Banner */}
      <div className={`border rounded-3xl p-6 md:p-8 backdrop-blur-xl relative overflow-hidden ${
        isLight ? 'bg-white/80 border-slate-200 shadow-sm text-slate-900' : 'bg-white/5 border-white/10 text-white'
      }`}>
        <div className="max-w-3xl">
          <div className="flex items-center gap-2 mb-2">
            <span className={`text-[10px] font-mono uppercase tracking-widest px-2.5 py-1 rounded-full border font-bold ${colorClasses.bgLight} ${colorClasses.text} ${colorClasses.border}`}>
              Peer-to-Peer Streaming
            </span>
          </div>
          <h2 className="text-2xl md:text-3xl font-black italic uppercase tracking-tight mb-2">
            WebTorrent <span className={colorClasses.text}>Player</span>
          </h2>
          <p className={`text-sm mb-6 ${isLight ? 'text-slate-600' : 'text-white/60'}`}>
            Stream magnet links and torrent files directly in your browser with zero server storage overhead.
          </p>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (torrentInput.trim()) handleAddTorrent(torrentInput.trim());
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
            <input
              ref={fileInputRef}
              type="file"
              accept=".torrent"
              onChange={handleFileChange}
              className="hidden"
            />
          </form>

          {errorMsg && (
            <div className="mt-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}
        </div>
      </div>

      {/* Main Player & Files Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* HTML5 Video Container */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          <div className={`aspect-video rounded-3xl overflow-hidden border bg-black relative flex items-center justify-center shadow-2xl ${
            isLight ? 'border-slate-300' : 'border-white/10'
          }`}>
            <video
              ref={videoRef}
              controls
              className="w-full h-full object-contain"
            />
            {status === 'idle' && (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-white/40 gap-3 p-6 text-center">
                <FileVideo className="w-16 h-16 stroke-1 opacity-50" />
                <p className="text-sm">Enter a magnet link or select a .torrent file to start streaming.</p>
              </div>
            )}
            {status === 'connecting' && (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-white gap-3 bg-black/80 backdrop-blur-md">
                <RefreshCw className={`w-10 h-10 animate-spin ${colorClasses.text}`} />
                <p className="text-sm font-medium">Connecting to WebTorrent peers...</p>
              </div>
            )}
          </div>

          {/* Download Stats Bar */}
          {torrent && (
            <div className={`border rounded-2xl p-5 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-mono ${
              isLight ? 'bg-white border-slate-200 text-slate-700 shadow-sm' : 'bg-white/5 border-white/10 text-white/80'
            }`}>
              <div className="flex items-center gap-2.5">
                <Download className={`w-4 h-4 ${colorClasses.text}`} />
                <div>
                  <p className="text-[10px] opacity-60 uppercase">Download</p>
                  <p className="font-bold">{formatBytes(downloadSpeed)}/s</p>
                </div>
              </div>
              <div className="flex items-center gap-2.5">
                <Upload className={`w-4 h-4 ${colorClasses.text}`} />
                <div>
                  <p className="text-[10px] opacity-60 uppercase">Upload</p>
                  <p className="font-bold">{formatBytes(uploadSpeed)}/s</p>
                </div>
              </div>
              <div className="flex items-center gap-2.5">
                <Users className={`w-4 h-4 ${colorClasses.text}`} />
                <div>
                  <p className="text-[10px] opacity-60 uppercase">Peers</p>
                  <p className="font-bold">{numPeers}</p>
                </div>
              </div>
              <div className="flex items-center gap-2.5">
                <HardDrive className={`w-4 h-4 ${colorClasses.text}`} />
                <div>
                  <p className="text-[10px] opacity-60 uppercase">Progress</p>
                  <p className="font-bold">{progress}% ({formatBytes(downloaded)} / {formatBytes(totalSize)})</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Torrent Files List Sidebar */}
        <div className={`border rounded-3xl p-6 flex flex-col gap-4 ${
          isLight ? 'bg-white border-slate-200 text-slate-900 shadow-sm' : 'bg-white/5 border-white/10 text-white'
        }`}>
          <h3 className="text-base font-bold flex items-center justify-between">
            <span>Torrent Files</span>
            <span className={`text-xs font-mono px-2 py-0.5 rounded ${isLight ? 'bg-slate-100 text-slate-600' : 'bg-white/10 text-white/60'}`}>
              {files.length} items
            </span>
          </h3>

          {files.length === 0 ? (
            <p className={`text-xs italic py-8 text-center ${isLight ? 'text-slate-400' : 'text-white/40'}`}>
              No active torrent loaded.
            </p>
          ) : (
            <div className="flex flex-col gap-2 overflow-y-auto max-h-[400px] custom-scrollbar pr-1">
              {files.map((file, idx) => {
                const isVideo = file.name.endsWith('.mp4') || file.name.endsWith('.mkv') ||
                  file.name.endsWith('.webm') || file.name.endsWith('.avi') || file.name.endsWith('.mov');
                const isSelected = selectedFile === file;

                return (
                  <button
                    key={idx}
                    onClick={() => isVideo && setSelectedFile(file)}
                    disabled={!isVideo}
                    className={`text-left p-3 rounded-2xl border transition-all text-xs flex items-center justify-between gap-3 ${
                      isSelected
                        ? `${colorClasses.bgLight} ${colorClasses.border} ${colorClasses.text} font-bold`
                        : isVideo
                        ? isLight
                          ? 'bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-800'
                          : 'bg-white/5 border-white/5 hover:bg-white/10 text-white/90'
                        : isLight
                        ? 'bg-slate-100 border-slate-200 opacity-50 cursor-not-allowed text-slate-500'
                        : 'bg-white/5 border-white/5 opacity-40 cursor-not-allowed text-white/40'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <FileVideo className="w-4 h-4 shrink-0" />
                      <span className="truncate">{file.name}</span>
                    </div>
                    <span className="font-mono text-[10px] shrink-0 opacity-70">
                      {formatBytes(file.length)}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
