import React, { useState, useEffect, useRef, useMemo } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { Play, Info, Settings, Loader2, Search, X, RefreshCw, FileText, Calendar, HardDrive, LayoutGrid, List, Heart, Clock, SortAsc, SortDesc, Zap } from 'lucide-react';
import type { MediaItem, AppSettings, PrimaryColorKey, ThemeMode } from './types';
import VideoPlayer from './components/VideoPlayer';
import CategorySidebar from './components/CategorySidebar';
import SettingsModal from './components/SettingsModal';
import DeepMetaModal from './components/DeepMetaModal';

gsap.registerPlugin(useGSAP);

export default function App() {
  const [library, setLibrary] = useState<MediaItem[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>("All");
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [activeMedia, setActiveMedia] = useState<MediaItem | null>(null);
  const [selectedDetailMedia, setSelectedDetailMedia] = useState<MediaItem | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [regenerating, setRegenerating] = useState(false);
  
  const [scanStatus, setScanStatus] = useState<{ current: number; total: number; currentFile: string; added: number; errors: number } | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
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
      theme: 'dark'
    };
  });

  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showDeepMetaModal, setShowDeepMetaModal] = useState(false);
  const [selectedDeepMedia, setSelectedDeepMedia] = useState<MediaItem | null>(null);

  // Splash Screen & Background Image States
  const [showSplash, setShowSplash] = useState(() => !sessionStorage.getItem('ogglebox_splash_seen_v2'));
  const [splashFading, setSplashFading] = useState(false);
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

  const toggleFavorite = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setFavorites(prev => {
      const next = prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id];
      localStorage.setItem('motionstream_favorites', JSON.stringify(next));
      return next;
    });
  };

  const containerRef = useRef<HTMLDivElement>(null);

  // Fetch library
  const fetchLibrary = async () => {
    try {
      const libRes = await fetch('/api/library');
      const libData = await libRes.json();
      setLibrary(libData);
    } catch (err) {
      console.error("Failed to fetch library:", err);
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
      console.error(err);
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

  // Fast GSAP animation for visible items
  useGSAP(() => {
    if (!loading && !activeMedia && filteredLibrary.length > 0) {
      const cards = containerRef.current?.querySelectorAll('.gsap-card');
      if (cards && cards.length > 0) {
        const visibleCards = Array.from(cards).slice(0, 18);
        gsap.fromTo(
          visibleCards,
          { y: 15, opacity: 0, scale: 0.98 },
          { 
            y: 0, 
            opacity: 1, 
            scale: 1,
            duration: 0.35, 
            stagger: { amount: 0.15 }, 
            ease: 'power2.out',
            clearProps: 'all'
          }
        );
      }
    }
  }, { dependencies: [searchQuery, activeCategory, loading, activeMedia], scope: containerRef });

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
          className={`fixed inset-0 z-50 bg-black flex items-center justify-center transition-opacity duration-800 pointer-events-auto ${
            splashFading ? 'opacity-0 pointer-events-none' : 'opacity-100'
          }`}
        >
          <video
            src={import.meta.env.VITE_SPLASH_VIDEO || "/ogglebox.mp4"}
            autoPlay
            muted
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
            <div className="flex items-center gap-3 cursor-pointer" onClick={() => setActiveCategory("All")}>
              <div className={`w-8.5 h-8.5 rounded-xl flex items-center justify-center shadow-lg bg-gradient-to-br ${colorClasses.gradient}`}>
                <Play className="w-4 h-4 text-white fill-white ml-0.5" />
              </div>
              <h1 className="text-xl font-black italic tracking-tight uppercase flex items-center gap-1.5">
                <span className={colorClasses.text}>{firstWord}</span>
                {remainingWords && <span className={isLight ? "text-slate-900" : "text-white"}>{remainingWords}</span>}
              </h1>
            </div>
            
            <div className="flex flex-col md:flex-row items-center gap-3 w-full md:w-auto justify-between md:justify-end">
              {/* View & Sort Controls */}
              <div className={`flex items-center gap-2 border rounded-full px-2 py-1 ${
                isLight ? 'bg-slate-200/60 border-slate-300' : 'bg-white/5 border-white/10'
              }`}>
                <button 
                  onClick={() => setViewMode('grid')} 
                  className={`p-1.5 rounded-full transition-colors ${
                    viewMode === 'grid' 
                      ? `${colorClasses.bgLight} ${colorClasses.text}` 
                      : isLight ? 'text-slate-600 hover:text-slate-900' : 'text-white/50 hover:text-white'
                  }`}
                  title="Grid View"
                >
                  <LayoutGrid className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => setViewMode('list')} 
                  className={`p-1.5 rounded-full transition-colors ${
                    viewMode === 'list' 
                      ? `${colorClasses.bgLight} ${colorClasses.text}` 
                      : isLight ? 'text-slate-600 hover:text-slate-900' : 'text-white/50 hover:text-white'
                  }`}
                  title="2-Column List View"
                >
                  <List className="w-4 h-4" />
                </button>
                <div className={`w-px h-4 mx-1 ${isLight ? 'bg-slate-300' : 'bg-white/10'}`}></div>
                <select 
                  value={sortBy} 
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className={`bg-transparent text-xs font-medium outline-none cursor-pointer appearance-none px-2 ${
                    isLight ? 'text-slate-700' : 'text-white/80'
                  }`}
                >
                  <option value="title" className={isLight ? "bg-white text-slate-900" : "bg-slate-900 text-white"}>Title</option>
                  <option value="date" className={isLight ? "bg-white text-slate-900" : "bg-slate-900 text-white"}>Date Added</option>
                  <option value="size" className={isLight ? "bg-white text-slate-900" : "bg-slate-900 text-white"}>File Size</option>
                </select>
                <button 
                  onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')} 
                  className={`p-1.5 ${isLight ? 'text-slate-600 hover:text-slate-900' : 'text-white/50 hover:text-white'}`}
                >
                  {sortOrder === 'asc' ? <SortAsc className="w-4 h-4" /> : <SortDesc className="w-4 h-4" />}
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
            <main className="flex-1 h-full overflow-y-auto p-6 md:p-8 custom-scrollbar">
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
              ) : viewMode === 'grid' ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-5">
                  {filteredLibrary.map((item) => {
                    const savedTime = localStorage.getItem(`motionstream_progress_${item.id}`);
                    const savedPercent = localStorage.getItem(`motionstream_progress_percent_${item.id}`);
                    const hasProgress = savedTime && !isNaN(parseFloat(savedTime)) && parseFloat(savedTime) > 0;
                    const progressWidth = savedPercent && !isNaN(parseFloat(savedPercent)) ? `${parseFloat(savedPercent)}%` : '0%';
                    
                    return (
                      <div 
                        key={item.id} 
                        className={`gsap-card group relative aspect-[16/10] border rounded-2xl overflow-hidden cursor-pointer transition-all duration-300 hover:shadow-xl ${
                          isLight 
                            ? 'bg-white border-slate-200 hover:border-slate-300 shadow-sm' 
                            : 'bg-white/5 backdrop-blur-xl border-white/10 hover:border-cyan-500/50'
                        }`}
                        onClick={() => openPlayer(item)}
                      >
                        <img 
                          src={item.poster} 
                          alt={item.title} 
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                          loading="lazy"
                        />
                        
                        {item.category && item.category !== 'Root' && (
                          <div className="absolute top-2 left-2 right-12 z-30 pointer-events-none">
                            <span className={`text-[8px] font-sans font-bold px-1.5 py-0.5 rounded border uppercase tracking-wide truncate inline-block max-w-full leading-none ${
                              isLight 
                                ? 'bg-white/90 text-slate-800 border-slate-300 shadow-sm' 
                                : 'bg-black/80 backdrop-blur-md text-cyan-300 border-cyan-500/20'
                            }`}>
                              {item.category.split('/').pop()}
                            </span>
                          </div>
                        )}

                        {/* File Info Details Trigger */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedDetailMedia(item);
                          }}
                          className={`absolute top-2 right-2 z-30 w-7 h-7 rounded-full flex items-center justify-center border transition-colors ${
                            isLight
                              ? 'bg-white/90 text-slate-700 hover:bg-white border-slate-300 shadow-sm'
                              : 'bg-black/60 backdrop-blur-md text-white/70 hover:text-white hover:bg-black/80 border-white/10'
                          }`}
                          title="File Info"
                        >
                          <Info className="w-3.5 h-3.5" />
                        </button>

                        {/* Title Bar */}
                        <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black/90 via-black/60 to-transparent transition-opacity duration-300 group-hover:opacity-0 pointer-events-none z-10 flex flex-col justify-end">
                          <h3 className="text-xs font-bold truncate text-white">{item.title}</h3>
                          <p className="text-[10px] text-white/60 font-mono mt-0.5">{item.sizeFormatted || 'MP4'} • {item.format || 'MP4'}</p>
                        </div>

                        {/* Hover Play Overlay */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center z-20">
                          <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${colorClasses.gradient} flex items-center justify-center shadow-lg transform scale-90 group-hover:scale-100 transition-transform duration-300`}>
                            <Play className="w-4 h-4 text-white fill-white ml-0.5" />
                          </div>
                        </div>

                        {hasProgress && (
                          <div className="absolute bottom-0 left-0 w-full h-1 bg-white/20 z-30">
                            <div className={`h-full ${colorClasses.bg}`} style={{ width: progressWidth }}></div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                /* Two-Column List View with Generous Padding & DEEP Meta button */
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-5">
                  {filteredLibrary.map((item) => {
                    const savedTime = localStorage.getItem(`motionstream_progress_${item.id}`);
                    const savedPercent = localStorage.getItem(`motionstream_progress_percent_${item.id}`);
                    const hasProgress = savedTime && !isNaN(parseFloat(savedTime)) && parseFloat(savedTime) > 0;
                    const progressWidth = savedPercent && !isNaN(parseFloat(savedPercent)) ? `${parseFloat(savedPercent)}%` : '0%';

                    return (
                      <div 
                        key={item.id} 
                        className={`group flex flex-col sm:flex-row items-stretch border rounded-2xl overflow-hidden cursor-pointer transition-all duration-200 shadow-sm hover:shadow-md ${
                          isLight 
                            ? 'bg-white border-slate-200 hover:border-slate-300' 
                            : 'bg-white/5 backdrop-blur-xl border-white/10 hover:border-white/20 hover:bg-white/10'
                        }`}
                        onClick={() => openPlayer(item)}
                      >
                        {/* Thumbnail */}
                        <div className="relative w-full sm:w-44 h-36 sm:h-auto flex-shrink-0 bg-black overflow-hidden group">
                          <img 
                            src={item.poster} 
                            alt={item.title} 
                            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                            loading="lazy"
                          />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${colorClasses.gradient} flex items-center justify-center shadow-lg`}>
                              <Play className="w-4 h-4 text-white fill-white ml-0.5" />
                            </div>
                          </div>
                          {hasProgress && (
                            <div className="absolute bottom-0 left-0 w-full h-1 bg-white/20 z-30">
                              <div className={`h-full ${colorClasses.bg}`} style={{ width: progressWidth }}></div>
                            </div>
                          )}
                        </div>

                        {/* Generous Padding Details Container */}
                        <div className="p-4 md:p-5 flex flex-col justify-between flex-1 min-w-0 space-y-3">
                          <div>
                            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                              {item.category && item.category !== 'Root' && (
                                <span className={`text-[9px] font-bold font-mono px-2 py-0.5 rounded uppercase tracking-wider border ${colorClasses.bgLight} ${colorClasses.text} ${colorClasses.border}`}>
                                  {item.category.split('/').pop()}
                                </span>
                              )}
                              <span className={`text-[9px] font-mono px-2 py-0.5 rounded ${isLight ? 'bg-slate-100 text-slate-600' : 'bg-white/10 text-white/60'}`}>
                                {item.format || 'MP4'}
                              </span>
                              <span className={`text-[9px] font-mono px-2 py-0.5 rounded ${isLight ? 'bg-slate-100 text-slate-600' : 'bg-white/10 text-white/60'}`}>
                                {item.sizeFormatted || 'N/A'}
                              </span>
                            </div>
                            <h3 className={`text-base font-bold truncate ${isLight ? 'text-slate-900' : 'text-white'}`}>
                              {item.title}
                            </h3>
                            <p className={`text-xs line-clamp-2 mt-1 ${isLight ? 'text-slate-500' : 'text-white/60'}`}>
                              {item.description || item.filename}
                            </p>
                          </div>

                          <div className="flex items-center justify-between pt-2 border-t border-white/5 gap-2">
                            <span className={`text-[10px] font-mono ${isLight ? 'text-slate-400' : 'text-white/40'}`}>
                              {item.year || '2026'}
                            </span>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedDeepMedia(item);
                                  setShowDeepMetaModal(true);
                                }}
                                className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 border transition-all ${
                                  colorClasses.bgLight
                                } ${colorClasses.text} ${colorClasses.border} hover:scale-105`}
                                title="Inspect Deep FFprobe Metadata"
                              >
                                <Zap className="w-3 h-3" />
                                DEEP
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedDetailMedia(item);
                                }}
                                className={`w-7 h-7 rounded-full flex items-center justify-center border transition-colors ${
                                  isLight 
                                    ? 'bg-slate-100 text-slate-600 hover:bg-slate-200 border-slate-300' 
                                    : 'bg-black/40 text-white/60 hover:text-white hover:bg-black/60 border-white/10'
                                }`}
                                title="File Info"
                              >
                                <Info className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </main>
          </div>

          {/* Resume Playback Modal */}
          {showResumeModal && (
            <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
              <div className={`border rounded-2xl p-6 max-w-sm w-full shadow-2xl relative ${
                isLight ? 'bg-white border-slate-200 text-slate-900' : 'bg-[#0f172a] border-white/10 text-white'
              }`}>
                <h3 className="text-xl font-bold mb-2">Resume Playback?</h3>
                <p className={`text-sm mb-6 ${isLight ? 'text-slate-500' : 'text-white/60'}`}>
                  You left off at {Math.round(parseFloat(localStorage.getItem(`motionstream_progress_percent_${showResumeModal.id}`) || '0'))}%
                </p>
                <div className="flex gap-3">
                  <button 
                    onClick={() => {
                      localStorage.setItem(`motionstream_progress_${showResumeModal.id}`, '0');
                      localStorage.setItem(`motionstream_progress_percent_${showResumeModal.id}`, '0');
                      setActiveMedia(showResumeModal);
                      setShowResumeModal(null);
                    }}
                    className={`flex-1 py-2 rounded-lg font-medium transition-colors ${
                      isLight ? 'bg-slate-100 hover:bg-slate-200 text-slate-800' : 'bg-white/10 hover:bg-white/20 text-white'
                    }`}
                  >
                    Start Over
                  </button>
                  <button 
                    onClick={() => {
                      setActiveMedia(showResumeModal);
                      setShowResumeModal(null);
                    }}
                    className={`flex-1 py-2 rounded-lg font-bold text-white shadow-lg transition-all bg-gradient-to-r ${colorClasses.gradient}`}
                  >
                    Resume
                  </button>
                </div>
                <button onClick={() => setShowResumeModal(null)} className="absolute top-4 right-4 text-white/50 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}
          
          {/* File Info Details Modal */}
          {selectedDetailMedia && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
              <div className={`border rounded-3xl p-6 max-w-lg w-full shadow-2xl relative flex flex-col gap-5 ${
                isLight ? 'bg-white border-slate-200 text-slate-900' : 'bg-[#0f172a] border-white/10 text-white'
              }`}>
                <button 
                  onClick={() => setSelectedDetailMedia(null)}
                  className={`absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
                    isLight ? 'bg-slate-100 text-slate-600 hover:bg-slate-200' : 'bg-white/5 text-white/60 hover:text-white'
                  }`}
                >
                  <X className="w-4 h-4" />
                </button>

                <div className="flex items-center gap-4">
                  <div className="w-20 h-28 rounded-xl overflow-hidden relative border border-white/10 shrink-0 bg-black">
                    <img src={selectedDetailMedia.poster} alt={selectedDetailMedia.title} className="w-full h-full object-cover" />
                  </div>
                  <div className="overflow-hidden">
                    <span className={`text-[10px] font-mono uppercase tracking-widest px-2 py-0.5 rounded border ${colorClasses.bgLight} ${colorClasses.text} ${colorClasses.border}`}>
                      media/{selectedDetailMedia.category || 'Root'}
                    </span>
                    <h3 className="text-lg font-bold mt-1 truncate">{selectedDetailMedia.title}</h3>
                    <p className={`text-xs font-mono truncate ${isLight ? 'text-slate-500' : 'text-white/50'}`}>
                      {selectedDetailMedia.filename}
                    </p>
                  </div>
                </div>

                <div className={`grid grid-cols-2 gap-3 text-xs p-4 rounded-2xl border ${
                  isLight ? 'bg-slate-50 border-slate-200 text-slate-700' : 'bg-white/5 border-white/5 text-white/70'
                }`}>
                  <div className="flex items-center gap-2">
                    <FileText className={`w-4 h-4 ${colorClasses.text}`} />
                    <span>Format: <strong>{selectedDetailMedia.format || 'MP4'}</strong></span>
                  </div>
                  <div className="flex items-center gap-2">
                    <HardDrive className={`w-4 h-4 ${colorClasses.text}`} />
                    <span>Size: <strong>{selectedDetailMedia.sizeFormatted || 'Unknown'}</strong></span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className={`w-4 h-4 ${colorClasses.text}`} />
                    <span>Modified: <strong>{selectedDetailMedia.modifiedAt || selectedDetailMedia.year}</strong></span>
                  </div>
                  <div className="flex items-center gap-2 truncate">
                    <Search className={`w-4 h-4 ${colorClasses.text} shrink-0`} />
                    <span className="truncate">Path: <strong>{selectedDetailMedia.path}</strong></span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={() => {
                      const item = selectedDetailMedia;
                      setSelectedDetailMedia(null);
                      openPlayer(item);
                    }}
                    className={`flex-1 text-white font-bold py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 shadow-md hover:opacity-90 transition-opacity bg-gradient-to-r ${colorClasses.gradient}`}
                  >
                    <Play className="w-4 h-4 fill-current" />
                    <span>Play Video</span>
                  </button>

                  <button
                    onClick={() => {
                      const item = selectedDetailMedia;
                      setSelectedDetailMedia(null);
                      setSelectedDeepMedia(item);
                      setShowDeepMetaModal(true);
                    }}
                    className={`font-bold py-2.5 px-4 rounded-xl flex items-center justify-center gap-1.5 border transition-all ${colorClasses.bgLight} ${colorClasses.text} ${colorClasses.border} hover:scale-105`}
                  >
                    <Zap className="w-4 h-4" />
                    <span>DEEP Meta</span>
                  </button>

                  <button
                    onClick={() => handleRegenerateThumbnail(selectedDetailMedia)}
                    disabled={regenerating}
                    className={`font-medium py-2.5 px-3 rounded-xl flex items-center justify-center gap-1.5 transition-colors border ${
                      isLight ? 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-300' : 'bg-white/10 hover:bg-white/20 text-white border-white/10'
                    }`}
                    title="Regenerate Poster Thumbnail"
                  >
                    <RefreshCw className={`w-4 h-4 ${regenerating ? `animate-spin ${colorClasses.text}` : ''}`} />
                  </button>
                </div>
              </div>
            </div>
          )}

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
