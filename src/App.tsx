import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { Play, Info, Settings, Loader2, Search, X, RefreshCw, FileText, Calendar, HardDrive, LayoutGrid, List, Heart, Clock, SortAsc, SortDesc, Zap, Volume2, VolumeX, Radio, Music, Disc, Download } from 'lucide-react';
import type { MediaItem, AppSettings, PrimaryColorKey, ThemeMode } from './types';
import type { ViewMode, Density, ListColumns, ListOrder } from './types/mediaMotion';
import VideoPlayer from './components/VideoPlayer';
import CategorySidebar from './components/CategorySidebar';
import SettingsModal from './components/SettingsModal';
import DeepMetaModal from './components/DeepMetaModal';
import ResumeModal from './components/ResumeModal';
import MediaDetailModal from './components/MediaDetailModal';
import WebTorrentView from './components/WebTorrentView';
import { MediaStage } from './components/media/MediaStage';
import { DisplayViewBar } from './components/media/DisplayViewBar';
import { AppLogo } from './components/AppLogo';
import { executeViewTransition } from './motion/transitionChoreography';

gsap.registerPlugin(useGSAP);

export default function App() {
  const [library, setLibrary] = useState<MediaItem[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>("All");
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [activeMedia, setActiveMedia] = useState<MediaItem | null>(null);
  const [selectedDetailMedia, setSelectedDetailMedia] = useState<MediaItem | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<'library' | 'webtorrent'>('library');
  const [regenerating, setRegenerating] = useState(false);
  
  const [scanStatus, setScanStatus] = useState<{ current: number; total: number; currentFile: string; added: number; errors: number } | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [density, setDensity] = useState<Density>(4);
  const [listColumns, setListColumns] = useState<ListColumns>(2);
  const [listOrder, setListOrder] = useState<ListOrder>('down');
  const [motionMultiplier, setMotionMultiplier] = useState<number>(1.0);
  const [focusIndex, setFocusIndex] = useState(0);
  const [sortBy, setSortBy] = useState<'title' | 'date' | 'size' | 'duration'>('title');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [favorites, setFavorites] = useState<string[]>([]);
  const [watchHistory, setWatchHistory] = useState<Record<string, number>>({});
  const [showResumeModal, setShowResumeModal] = useState<MediaItem | null>(null);

  // Settings State & Persistence
  const [settings, setSettings] = useState<AppSettings>(() => {
    try {
      const saved = localStorage.getItem('motionstream_settings');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return {
      appTitle: import.meta.env.VITE_APP_TITLE || 'OggleBox Server',
      pageTitle: import.meta.env.VITE_PAGE_TITLE || 'OggleBox - Media Library',
      primaryColor: 'cyan',
      theme: 'dark',
      transcodeProfile: 'netflix'
    };
  });

  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showDeepMetaModal, setShowDeepMetaModal] = useState(false);
  const [selectedDeepMedia, setSelectedDeepMedia] = useState<MediaItem | null>(null);

  // Splash Screen & Background Image States
  const [showSplash, setShowSplash] = useState(() => !sessionStorage.getItem('ogglebox_splash_seen_v2'));
  const [splashFading, setSplashFading] = useState(false);
  const splashVideoRef = useRef<HTMLVideoElement>(null);
  const [bgLoaded, setBgLoaded] = useState(false);

  const triggerFade = () => {
    setSplashFading(true);
    sessionStorage.setItem('ogglebox_splash_seen_v2', 'true');
    setTimeout(() => {
      setShowSplash(false);
    }, 800);
  };

  useEffect(() => {
    if (showSplash) {
      if (splashVideoRef.current) {
        const vid = splashVideoRef.current;
        vid.volume = 1.0;
        vid.muted = false;
        vid.play().catch(() => {
          // Fallback to muted playback if browser autoplay policy blocks unmuted audio
          vid.muted = true;
          vid.play().catch(() => {});
        });
      }
      // Fallback timeout in case video fails to load or play
      const timer = setTimeout(triggerFade, 5000);
      return () => clearTimeout(timer);
    }
  }, [showSplash]);

  useEffect(() => {
    const timer = setTimeout(() => setBgLoaded(true), 100);
    return () => clearTimeout(timer);
  }, []);

  const updateSettings = (partial: Partial<AppSettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...partial };
      localStorage.setItem('motionstream_settings', JSON.stringify(next));
      return next;
    });
  };

  // Sync webpage title
  useEffect(() => {
    document.title = settings.pageTitle || 'OggleBox - Media Library';
  }, [settings.pageTitle]);

  const colorClasses = useMemo(() => {
    switch (settings.primaryColor) {
      case 'pink':
        return {
          text: 'text-pink-400',
          bg: 'bg-pink-500',
          bgLight: 'bg-pink-500/10',
          border: 'border-pink-500/30',
          gradient: 'from-pink-400 to-rose-600',
          shadow: 'shadow-pink-500/20'
        };
      case 'emerald':
        return {
          text: 'text-emerald-400',
          bg: 'bg-emerald-500',
          bgLight: 'bg-emerald-500/10',
          border: 'border-emerald-500/30',
          gradient: 'from-emerald-400 to-teal-600',
          shadow: 'shadow-emerald-500/20'
        };
      case 'amber':
        return {
          text: 'text-amber-400',
          bg: 'bg-amber-500',
          bgLight: 'bg-amber-500/10',
          border: 'border-amber-500/30',
          gradient: 'from-amber-400 to-orange-600',
          shadow: 'shadow-amber-500/20'
        };
      default:
        return {
          text: 'text-cyan-400',
          bg: 'bg-cyan-500',
          bgLight: 'bg-cyan-500/10',
          border: 'border-cyan-500/30',
          gradient: 'from-cyan-400 to-indigo-600',
          shadow: 'shadow-cyan-500/20'
        };
    }
  }, [settings.primaryColor]);

  const isLight = settings.theme === 'light';

  useEffect(() => {
    try {
      const favs = JSON.parse(localStorage.getItem('motionstream_favorites') || '[]');
      setFavorites(favs);
      
      const hist: Record<string, number> = {};
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith('motionstream_progress_percent_')) {
          const id = key.replace('motionstream_progress_percent_', '');
          hist[id] = parseFloat(localStorage.getItem(key) || '0');
        }
      }
      setWatchHistory(hist);
    } catch(e) {}
  }, []);

  const toggleFavorite = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setFavorites(prev => {
      const next = prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id];
      localStorage.setItem('motionstream_favorites', JSON.stringify(next));
      return next;
    });
  };

  const favoritesMap = useMemo(() => {
    const map: Record<string, boolean> = {};
    favorites.forEach((id) => { map[id] = true; });
    return map;
  }, [favorites]);

  const handleViewModeChange = (mode: ViewMode) => {
    if (mode === viewMode) return;
    executeViewTransition(mode, 1, () => {
      setViewMode(mode);
    });
  };

  const containerRef = useRef<HTMLDivElement>(null);

  // Fetch library
  const fetchLibrary = async () => {
    try {
      const libRes = await fetch('/api/library');
      const libData = await libRes.json();
      if (Array.isArray(libData)) {
        setLibrary(libData);
      } else {
        console.warn("Library API did not return an array:", libData);
      }
    } catch (err) {
      console.error("Failed to fetch library:", err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLibrary();
  }, []);

  const handleScan = async () => {
    setScanning(true);
    setScanStatus({ current: 0, total: 0, currentFile: "Initializing scan...", added: 0, errors: 0 });

    const pollInterval = setInterval(async () => {
      try {
        const progRes = await fetch('/api/scan/progress');
        const progData = await progRes.json();
        if (progData && progData.inProgress) {
          setScanStatus(progData);
        }
      } catch (err) {
        console.error("Failed to poll scan progress:", err);
      }
    }, 1000);

    try {
      const res = await fetch('/api/scan', { method: 'POST' });
      const data = await res.json();
      await fetchLibrary();
      if (data && data.message) {
        setToastMessage(data.message);
        setTimeout(() => setToastMessage(null), 6000);
      }
    } catch (err) {
      console.error("Scan failed:", err);
      setToastMessage("Scan failed. Check terminal output.");
      setTimeout(() => setToastMessage(null), 5000);
    } finally {
      clearInterval(pollInterval);
      setScanning(false);
      setScanStatus(null);
    }
  };

  const openPlayer = (item: MediaItem) => {
    const savedPercent = localStorage.getItem(`motionstream_progress_percent_${item.id}`);
    if (savedPercent && parseFloat(savedPercent) > 5 && parseFloat(savedPercent) < 95) {
      setShowResumeModal(item);
    } else {
      setActiveMedia(item);
    }
  };

  const closePlayer = () => {
    setActiveMedia(null);
  };

  const handleRegenerateThumbnail = async (item: MediaItem) => {
    setRegenerating(true);
    try {
      await fetch('/api/thumbnail/regenerate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: item.path || item.id, timestamp: 30 })
      });
      await fetchLibrary();
      setSelectedDetailMedia(prev => prev ? { ...prev, poster: `${prev.poster}?t=${Date.now()}` } : null);
    } catch (err) {
      console.error("Regenerate thumbnail error:", err instanceof Error ? err.message : String(err));
    } finally {
      setRegenerating(false);
    }
  };

  // Category & Search Filter
  const filteredLibrary = library.filter(item => {
    const matchesSearch = item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          item.filename.toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchesSearch) return false;
    if (activeCategory === "Favorites") return favorites.includes(item.id);
    if (activeCategory === "All") return true;
    const cat = item.category || 'Root';
    if (activeCategory === 'Root') {
      return cat === 'Root' || cat === 'media';
    }
    return cat === activeCategory || cat.startsWith(activeCategory + '/');
  }).sort((a, b) => {
    let cmp = 0;
    if (sortBy === 'title') cmp = a.title.localeCompare(b.title);
    else if (sortBy === 'size') cmp = (a.size || 0) - (b.size || 0);
    else if (sortBy === 'date') cmp = (a.modifiedAt || '').localeCompare(b.modifiedAt || '');
    return sortOrder === 'asc' ? cmp : -cmp;
  });

  // Reset focusIndex when search, category, or sorting changes
  useEffect(() => {
    setFocusIndex(0);
  }, [searchQuery, activeCategory, sortBy, sortOrder]);


  // App Title parsing (1st word styled with primary color)
  const appTitleWords = (settings.appTitle || "OggleBox Server").trim().split(/\s+/);
  const firstWord = appTitleWords[0] || "OggleBox";
  const remainingWords = appTitleWords.slice(1).join(" ");

  return (
    <div 
      ref={containerRef} 
      className={`h-screen w-screen font-sans overflow-hidden flex flex-col relative transition-colors duration-300 ${
        isLight ? 'bg-slate-100 text-slate-900 selection:bg-amber-500/30' : 'bg-[#020617] text-white selection:bg-cyan-500/30'
      }`}
    >
      {/* 4-Second Session Splash Screen Video */}
      {showSplash && (
        <div 
          className={`fixed inset-0 z-modal z-50 bg-black flex items-center justify-center transition-opacity duration-800 pointer-events-auto ${
            splashFading ? 'opacity-0 pointer-events-none' : 'opacity-100'
          }`}
          style={{ zIndex: 999999 }}
        >
          <video
            ref={splashVideoRef}
            src={import.meta.env.VITE_SPLASH_VIDEO || "/ogglebox.mp4"}
            autoPlay
            playsInline
            onEnded={triggerFade}
            className="w-full h-full object-cover"
          />
        </div>
      )}

      {/* Background Glows */}
      {!isLight && (
        <>
          <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-indigo-600/15 rounded-full blur-[120px] pointer-events-none z-0"></div>
          <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] bg-cyan-600/10 rounded-full blur-[120px] pointer-events-none z-0"></div>
        </>
      )}
      
      {activeMedia ? (
        <VideoPlayer 
          item={activeMedia} 
          playlist={filteredLibrary}
          onClose={closePlayer} 
          onPlayNext={(nextItem) => setActiveMedia(nextItem)}
          onPlayPrev={(prevItem) => setActiveMedia(prevItem)}
          settings={settings}
        />
      ) : (
        <div className="relative z-10 flex flex-col h-full overflow-hidden">
          {/* Site Background Image - Darkened or Lightened 50% based on theme, only in grid/list view */}
          <div className={`absolute inset-0 pointer-events-none z-0 overflow-hidden transition-colors duration-1000 ${isLight ? 'bg-white' : 'bg-black'}`}>
            <img 
              src={import.meta.env.VITE_BG_IMAGE || "/ogglebox.jpg"} 
              alt="" 
              className={`w-full h-full object-cover transition-opacity duration-1000 ${bgLoaded ? 'opacity-50' : 'opacity-0'}`}
              onLoad={() => setBgLoaded(true)}
            />
          </div>

          {/* Main Top Header */}
          <nav className={`shrink-0 border-b px-6 py-3.5 flex flex-col md:flex-row items-center justify-between gap-4 z-20 transition-colors ${
            isLight ? 'bg-white/80 backdrop-blur-xl border-slate-200 shadow-sm' : 'bg-black/40 backdrop-blur-xl border-white/10'
          }`}>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3.5 cursor-pointer group" onClick={() => { setActiveTab('library'); setActiveCategory("All"); }}>
                <AppLogo
                  theme={settings.theme}
                  accent={settings.primaryColor}
                  size={42}
                />
                <h1 className="font-title text-2xl md:text-3xl font-black italic tracking-wide uppercase flex items-center gap-1.5 leading-none select-none">
                  <span className={colorClasses.text}>{firstWord}</span>
                  {remainingWords && <span className={isLight ? "text-slate-900" : "text-white"}>{remainingWords}</span>}
                </h1>
              </div>

              {/* View Switcher Tabs (Library vs WebTorrent) */}
              <div className={`flex items-center p-1 rounded-full border text-xs font-bold ${
                isLight ? 'bg-slate-200/60 border-slate-300' : 'bg-white/5 border-white/10'
              }`}>
                <button
                  onClick={() => setActiveTab('library')}
                  className={`px-3 py-1 rounded-full transition-all ${
                    activeTab === 'library'
                      ? `${colorClasses.bg} text-white shadow-md`
                      : isLight ? 'text-slate-600 hover:text-slate-900' : 'text-white/60 hover:text-white'
                  }`}
                >
                  Library
                </button>
                <button
                  onClick={() => setActiveTab('webtorrent')}
                  className={`px-3 py-1 rounded-full transition-all flex items-center gap-1.5 ${
                    activeTab === 'webtorrent'
                      ? `${colorClasses.bg} text-white shadow-md`
                      : isLight ? 'text-slate-600 hover:text-slate-900' : 'text-white/60 hover:text-white'
                  }`}
                >
                  <Radio className="w-3.5 h-3.5" />
                  WebTorrent
                </button>
              </div>
            </div>
            
            <div className="flex flex-col md:flex-row items-center gap-3 w-full md:w-auto justify-between md:justify-end">
              {/* View & Sort Controls */}
              {/* Sort Controls */}
              <div className={`flex items-center gap-1.5 border rounded-full px-3 py-1.5 ${
                isLight ? 'bg-slate-200/60 border-slate-300' : 'bg-white/5 border-white/10'
              }`}>
                <span className="text-[10px] font-mono uppercase text-slate-400">Sort:</span>
                <select 
                  value={sortBy} 
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className={`bg-transparent text-xs font-semibold outline-none cursor-pointer appearance-none px-1 ${
                    isLight ? 'text-slate-700' : 'text-white/80'
                  }`}
                >
                  <option value="title" className={isLight ? "bg-white text-slate-900" : "bg-slate-900 text-white"}>Title</option>
                  <option value="date" className={isLight ? "bg-white text-slate-900" : "bg-slate-900 text-white"}>Date Added</option>
                  <option value="size" className={isLight ? "bg-white text-slate-900" : "bg-slate-900 text-white"}>File Size</option>
                </select>
                <button 
                  onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')} 
                  className={`p-1 rounded-full hover:bg-white/10 transition-colors ${isLight ? 'text-slate-600 hover:text-slate-900' : 'text-white/60 hover:text-white'}`}
                  title={sortOrder === 'asc' ? 'Ascending' : 'Descending'}
                >
                  {sortOrder === 'asc' ? <SortAsc className="w-3.5 h-3.5" /> : <SortDesc className="w-3.5 h-3.5" />}
                </button>
              </div>

              {/* Search Bar */}
              <div className="relative flex-1 md:flex-initial">
                <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none ${
                  isLight ? 'text-slate-400' : 'text-white/50'
                }`} />
                <input 
                  type="text" 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search video title..." 
                  className={`border rounded-full pl-9 pr-4 py-1.5 text-xs focus:outline-none transition-all w-full md:w-60 ${
                    isLight 
                      ? 'bg-slate-200/60 border-slate-300 text-slate-900 placeholder:text-slate-400 focus:bg-white focus:ring-2 focus:ring-slate-300' 
                      : 'bg-white/5 border-white/10 text-white placeholder:text-white/40 focus:ring-2 focus:ring-cyan-500/50'
                  }`}
                />
              </div>

              {/* Settings Trigger Icon (Located to the right of header actions) */}
              <button 
                onClick={() => setShowSettingsModal(true)}
                className={`p-2 rounded-full border transition-all flex items-center justify-center ${
                  isLight 
                    ? 'bg-white border-slate-300 text-slate-700 hover:bg-slate-100 hover:text-slate-900 shadow-sm' 
                    : 'bg-white/5 border-white/10 text-white/80 hover:bg-white/10 hover:text-white'
                }`}
                title="Settings & Preferences"
              >
                <Settings className={`w-4 h-4 ${colorClasses.text}`} />
              </button>
            </div>
          </nav>

          {/* Toast Notification */}
          {toastMessage && (
            <div className={`border-b px-6 py-2 flex items-center justify-between text-xs font-mono shrink-0 z-20 ${
              isLight ? 'bg-amber-100 border-amber-300 text-amber-900' : 'bg-indigo-950/90 border-indigo-500/40 text-indigo-200'
            }`}>
              <span>{toastMessage}</span>
              <button onClick={() => setToastMessage(null)} className="opacity-60 hover:opacity-100">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Main Content Area */}
          {activeTab === 'webtorrent' ? (
            <main className="flex-1 w-full h-full overflow-y-auto custom-scrollbar min-h-0 relative z-10">
              <WebTorrentView 
                theme={settings.theme} 
                primaryColor={settings.primaryColor}
                onPlayMedia={(mediaItem) => setActiveMedia(mediaItem)}
              />
            </main>
          ) : (
            <div className="flex-1 flex flex-col md:flex-row overflow-hidden min-h-0">
              {/* Category Sidebar */}
              <CategorySidebar
                library={library}
                activeCategory={activeCategory}
                onSelectCategory={setActiveCategory}
                theme={settings.theme}
                primaryColor={settings.primaryColor}
              />

                {/* Video Listing Container */}
                <main className="flex-1 min-h-0 flex flex-col relative overflow-hidden">
                  {/* 7 Display View Toggle Bar */}
                  <DisplayViewBar
                    view={viewMode}
                    onViewChange={handleViewModeChange}
                    density={density}
                    onDensityChange={setDensity}
                    listColumns={listColumns}
                    onListColumnsChange={setListColumns}
                    listOrder={listOrder}
                    onListOrderChange={setListOrder}
                    motionMultiplier={motionMultiplier}
                    onMotionMultiplierChange={setMotionMultiplier}
                    theme={settings.theme}
                    accent={settings.primaryColor}
                  />

              {loading ? (
                <div className="h-64 flex items-center justify-center">
                  <Loader2 className={`w-8 h-8 animate-spin ${colorClasses.text}`} />
                </div>
              ) : filteredLibrary.length === 0 ? (
                <div className={`h-64 flex flex-col items-center justify-center ${isLight ? 'text-slate-500' : 'text-white/40'}`}>
                  <Info className={`w-12 h-12 mb-4 opacity-50 ${colorClasses.text}`} />
                  <p className="text-base font-semibold">No media found in this category.</p>
                  <p className="text-xs mt-1 opacity-70">Select a different category or scan folder in settings.</p>
                </div>
              ) : (
                <MediaStage
                  items={filteredLibrary}
                  view={viewMode}
                  density={density}
                  listColumns={listColumns}
                  listOrder={listOrder}
                  motionMultiplier={motionMultiplier}
                  focusIndex={focusIndex}
                  onFocusChange={setFocusIndex}
                  stars={favoritesMap}
                  onToggleStar={toggleFavorite}
                  theme={settings.theme}
                  accent={settings.primaryColor}
                  onSelectMedia={(item) => {
                    if (item.mediaType === 'binary') {
                      setSelectedDetailMedia(item);
                    } else {
                      openPlayer(item);
                    }
                  }}
                  onPlayMedia={(item) => {
                    if (item.mediaType === 'binary') {
                      setSelectedDetailMedia(item);
                    } else {
                      openPlayer(item);
                    }
                  }}
                  onInfoMedia={(item) => {
                    setSelectedDetailMedia(item);
                  }}
                />
              )}
                </main>
            </div>
          )}

          {/* Resume Playback Modal */}
          <ResumeModal
            isOpen={!!showResumeModal}
            item={showResumeModal}
            onClose={() => setShowResumeModal(null)}
            onResume={(item) => {
              setActiveMedia(item);
              setShowResumeModal(null);
            }}
            onStartOver={(item) => {
              localStorage.setItem(`motionstream_progress_${item.id}`, '0');
              localStorage.setItem(`motionstream_progress_percent_${item.id}`, '0');
              setActiveMedia(item);
              setShowResumeModal(null);
            }}
            theme={settings.theme}
            primaryColor={settings.primaryColor}
          />
          
          {/* File Info Details Modal */}
          <MediaDetailModal
            isOpen={!!selectedDetailMedia}
            item={selectedDetailMedia}
            onClose={() => setSelectedDetailMedia(null)}
            onPlay={(item) => {
              setSelectedDetailMedia(null);
              openPlayer(item);
            }}
            onOpenDeepMeta={(item) => {
              setSelectedDetailMedia(null);
              setSelectedDeepMedia(item);
              setShowDeepMetaModal(true);
            }}
            onRegenerateThumbnail={(item) => handleRegenerateThumbnail(item)}
            regenerating={regenerating}
            theme={settings.theme}
            primaryColor={settings.primaryColor}
          />

          {/* Settings Modal */}
          <SettingsModal 
            isOpen={showSettingsModal}
            onClose={() => setShowSettingsModal(false)}
            settings={settings}
            onUpdateSettings={updateSettings}
            onScanFolder={handleScan}
            scanning={scanning}
            scanStatus={scanStatus}
            libraryCount={library.length}
          />

          {/* DEEP Metadata Modal */}
          <DeepMetaModal 
            isOpen={showDeepMetaModal}
            item={selectedDeepMedia}
            onClose={() => {
              setShowDeepMetaModal(false);
              setSelectedDeepMedia(null);
            }}
            onPlay={(item) => openPlayer(item)}
            theme={settings.theme}
          />
        </div>
      )}
    </div>
  );
}
