import React, { useRef, useState, useEffect } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { AudioWaveform, SlidersHorizontal, ArrowLeft, Play, Pause, Maximize, Volume2, VolumeX, Loader2, SkipBack, SkipForward, RotateCcw, RotateCw, Repeat, X } from 'lucide-react';
import type { MediaItem } from '../types';


interface VideoPlayerProps {
  item: MediaItem;
  playlist?: MediaItem[];
  onClose: () => void;
  onPlayNext?: (nextItem: MediaItem) => void;
  onPlayPrev?: (prevItem: MediaItem) => void;
}

export default function VideoPlayer({ item, playlist = [], onClose, onPlayNext, onPlayPrev }: VideoPlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsRef = useRef<HTMLDivElement>(null);
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isLoaded, setIsLoaded] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const controlsTimeoutRef = useRef<NodeJS.Timeout>();
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [useTranscode, setUseTranscode] = useState(false);
  const [transcodeStartTime, setTranscodeStartTime] = useState(0);
  const toastTimeoutRef = useRef<NodeJS.Timeout>();

  
  // --- NEW COMPLEX FEATURES ---
  const [showFilters, setShowFilters] = useState(false);
  const [videoFilters, setVideoFilters] = useState({ brightness: 100, contrast: 100, saturation: 100, sepia: 0, hue: 0 });
  const [showVisualiser, setShowVisualiser] = useState(false);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const reqRef = useRef<number>(0);

  const initAudio = () => {
    if (!audioCtxRef.current && videoRef.current) {
      try {
        const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
        audioCtxRef.current = new AudioContext();
        analyserRef.current = audioCtxRef.current.createAnalyser();
        analyserRef.current.fftSize = 128; // 64 frequency bins
        sourceRef.current = audioCtxRef.current.createMediaElementSource(videoRef.current);
        sourceRef.current.connect(analyserRef.current);
        analyserRef.current.connect(audioCtxRef.current.destination);
      } catch (err) {
        console.warn("Audio Context Init Failed (Already bound or unsupported)", err);
      }
    }
    if (audioCtxRef.current?.state === 'suspended') {
      audioCtxRef.current.resume();
    }
  };

  useEffect(() => {
    let animationFrameId: number;
    if (showVisualiser && canvasRef.current) {
      initAudio();
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      
      const draw = () => {
        animationFrameId = requestAnimationFrame(draw);
        if (analyserRef.current && ctx) {
          const bufferLength = analyserRef.current.frequencyBinCount;
          const dataArray = new Uint8Array(bufferLength);
          analyserRef.current.getByteFrequencyData(dataArray);
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          const barWidth = (canvas.width / bufferLength) * 2.2;
          let x = 0;
          for (let i = 0; i < bufferLength; i++) {
            const barHeight = (dataArray[i] / 255) * (canvas.height - 10);
            const r = dataArray[i] + 50 * (i / bufferLength);
            const g = 250 * (i / bufferLength);
            const b = 250;
            ctx.fillStyle = `rgba(${r},${g},${b}, 0.85)`;
            ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);
            x += barWidth + 1.5;
          }
        }
      };
      draw();
    } else {
      if (canvasRef.current) {
        const ctx = canvasRef.current.getContext('2d');
        if (ctx) ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      }
    }
    return () => {
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
    };
  }, [showVisualiser]);

  const [showStats, setShowStats] = useState(false);
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);
  const [playbackRate, setPlaybackRate] = useState<number>(1);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const [showTheaterMode, setShowTheaterMode] = useState(false);
  const [hoverTime, setHoverTime] = useState<number | null>(null);
  const [hoverPos, setHoverPos] = useState<number>(0);
  const progressBarRef = useRef<HTMLDivElement>(null);
  const [showProgressHover, setShowProgressHover] = useState(false);
    const [loopMode, setLoopMode] = useState<'off' | 'single' | 'all'>('off');
  const [loopAB, setLoopAB] = useState<{a: number | null, b: number | null}>({a: null, b: null});
  const [sleepTimer, setSleepTimer] = useState<number | null>(null); // timestamp when to sleep
  const [autoPlayNext, setAutoPlayNext] = useState(true);
  const [stats, setStats] = useState({ decode: 0, dropped: 0, res: '', buffer: 0 });

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.playbackRate = playbackRate;
    }
  }, [playbackRate, isLoaded]);


  const showToast = (msg: string) => {
    setToastMessage(msg);
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    toastTimeoutRef.current = setTimeout(() => {
      setToastMessage(null);
    }, 1200);
  };

  const handleSpeedChange = (speed: number) => {
    if (useTranscode) {
      showToast("Speed change unavailable in transcode mode");
      return;
    }
    setPlaybackSpeed(speed);
    setPlaybackRate(speed);
    if (videoRef.current) {
      videoRef.current.playbackRate = speed;
    }
    showToast(`${speed}x Speed`);
  };

  const toggleTranscode = () => {
    const newMode = !useTranscode;
    setUseTranscode(newMode);
    
    if (videoRef.current) {
      // Store current time for transcode seek
      const t = videoRef.current.currentTime;
      setTranscodeStartTime(t);
      setIsLoaded(false);
      videoRef.current.pause();
    }
    
    showToast(newMode ? 'Transcoding Enabled (Fixes Codecs)' : 'Direct Play Enabled');
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger shortcuts if target is an input
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;

      if (e.code === 'Space' || e.code === 'KeyK') {
        e.preventDefault();
        togglePlay();
        showToast(isPlaying ? 'Paused' : 'Playing');
      } else if (e.code === 'ArrowLeft' || e.code === 'KeyJ') {
        e.preventDefault();
        if (videoRef.current) {
          videoRef.current.currentTime = Math.max(0, videoRef.current.currentTime - 5);
          showToast('-5s');
        }
      } else if (e.code === 'ArrowRight' || e.code === 'KeyL') {
        e.preventDefault();
        if (videoRef.current) {
          videoRef.current.currentTime = Math.min(videoRef.current.duration, videoRef.current.currentTime + 5);
          showToast('+5s');
        }
      } else if (e.code === 'ArrowUp') {
        e.preventDefault();
        if (videoRef.current) {
          const newVol = Math.min(1, volume + 0.1);
          setVolume(newVol);
          videoRef.current.volume = newVol;
          setIsMuted(false);
          videoRef.current.muted = false;
          showToast(`Vol: ${Math.round(newVol * 100)}%`);
        }
      } else if (e.code === 'ArrowDown') {
        e.preventDefault();
        if (videoRef.current) {
          const newVol = Math.max(0, volume - 0.1);
          setVolume(newVol);
          videoRef.current.volume = newVol;
          if (newVol === 0) {
            setIsMuted(true);
            videoRef.current.muted = true;
          }
          showToast(`Vol: ${Math.round(newVol * 100)}%`);
        }
      } else if (e.code === 'KeyM') {
        e.preventDefault();
        toggleMute();
        showToast(!isMuted ? 'Muted' : 'Unmuted');
      
      } else if (e.code === 'KeyF') {
        e.preventDefault();
        toggleFullscreen();
      } else if (e.key === ',') {
        stepFrame(-1);
      } else if (e.key === '.') {
        stepFrame(1);
      } else if (e.key === 's' || e.key === 'S') {
        setShowStats(s => !s);
      } else if (e.code === 'Escape') {

        handleClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    };
  }, [isPlaying, volume, isMuted]);

  const formatTime = (timeInSeconds: number) => {
    if (isNaN(timeInSeconds)) return "00:00";
    const hours = Math.floor(timeInSeconds / 3600);
    const minutes = Math.floor((timeInSeconds % 3600) / 60);
    const seconds = Math.floor(timeInSeconds % 60);
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  useGSAP(() => {
    // Assemble animation
    const tl = gsap.timeline();
    
    tl.fromTo(containerRef.current, 
      { opacity: 0, scale: 0.95 },
      { opacity: 1, scale: 1, duration: 0.8, ease: 'expo.out' }
    );
    
    tl.fromTo('.gsap-player-ui',
      { y: 30, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.6, stagger: 0.1, ease: 'power3.out' },
      "-=0.4"
    );
  }, { scope: containerRef });

  useGSAP(() => {
    if (!isPlaying && isLoaded) {
      gsap.fromTo('.gsap-pause-overlay', 
        { opacity: 0, scale: 0.9, y: 20 },
        { opacity: 1, scale: 1, y: 0, duration: 0.6, ease: 'back.out(1.5)', overwrite: 'auto' }
      );
    } else {
      gsap.to('.gsap-pause-overlay', { opacity: 0, scale: 0.95, y: -20, duration: 0.3, ease: 'power2.in', overwrite: 'auto' });
    }
  }, { dependencies: [isPlaying, isLoaded], scope: containerRef });

  const handleClose = () => {
    if (videoRef.current) {
      videoRef.current.pause();
    }
    // Disassemble animation
    const tl = gsap.timeline({ onComplete: onClose });
    tl.to('.gsap-player-ui', { y: 20, opacity: 0, duration: 0.3, stagger: 0.05, ease: 'power2.in' });
    tl.to(containerRef.current, { opacity: 0, scale: 0.95, duration: 0.5, ease: 'expo.in' }, "-=0.2");
  };

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  
  const currentIndex = playlist.findIndex(p => p.id === item.id);
  
  const playNext = () => {
    if (currentIndex >= 0 && currentIndex < playlist.length - 1 && onPlayNext) {
      onPlayNext(playlist[currentIndex + 1]);
    } else {
      showToast("End of playlist");
    }
  };

  const playPrev = () => {
    if (currentIndex > 0 && onPlayPrev) {
      onPlayPrev(playlist[currentIndex - 1]);
    } else {
      showToast("Start of playlist");
    }
  };

  const stepFrame = (direction: number) => {
    if (videoRef.current) {
      videoRef.current.pause();
      setIsPlaying(false);
      videoRef.current.currentTime += direction * (1/30); // Approx 30fps
      showToast(direction > 0 ? 'Frame Forward' : 'Frame Back');
    }
  };

  const setLoopPoint = (point: 'a' | 'b') => {
    if (!videoRef.current) return;
    const time = useTranscode ? transcodeStartTime + videoRef.current.currentTime : videoRef.current.currentTime;
    setLoopAB(prev => {
      const next = { ...prev, [point]: time };
      if (point === 'a' && next.b && next.b < time) next.b = null;
      if (point === 'b' && next.a && next.a > time) next.a = null;
      showToast(`Loop ${point.toUpperCase()} set: ${formatTime(time)}`);
      return next;
    });
  };
  
    const skipTime = (amount: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime += amount;
    }
  };

  const toggleLoopMode = () => {
    const modes: ('off' | 'single' | 'all')[] = ['off', 'single', 'all'];
    const next = modes[(modes.indexOf(loopMode) + 1) % modes.length];
    setLoopMode(next);
  };

  const clearLoop = () => {
    setLoopAB({a: null, b: null});
    showToast("Loop cleared");
  };

  const toggleMute = () => {
    if (videoRef.current) {
      const newMuted = !isMuted;
      videoRef.current.muted = newMuted;
      setIsMuted(newMuted);
      if (newMuted && volume === 0) {
        setVolume(1);
        videoRef.current.volume = 1;
      }
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    if (videoRef.current) {
      videoRef.current.volume = val;
      if (val === 0) {
        setIsMuted(true);
        videoRef.current.muted = true;
      } else {
        setIsMuted(false);
        videoRef.current.muted = false;
      }
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      let time = videoRef.current.currentTime;
      let currentDuration = videoRef.current.duration;
      
      if (useTranscode) {
        time += transcodeStartTime;
        // In transcode mode, duration might be Infinity due to streaming
        // We fallback to the previously known duration or don't update if Infinity
        if (currentDuration === Infinity || isNaN(currentDuration)) {
            currentDuration = duration;
        }
      }

      setCurrentTime(time);
      if (currentDuration > 0 && currentDuration !== Infinity) {
        setDuration(currentDuration);
      }
      
      const activeDuration = currentDuration > 0 && currentDuration !== Infinity ? currentDuration : duration;
      const p = activeDuration > 0 ? (time / activeDuration) * 100 : 0;
      setProgress(p || 0);

      // Enforce A-B loop if set
      if (loopAB.a !== null && loopAB.b !== null && loopAB.b > loopAB.a) {
        if (time >= loopAB.b || time < loopAB.a) {
          if (useTranscode) {
            setTranscodeStartTime(loopAB.a);
            setIsLoaded(false);
          } else {
            videoRef.current.currentTime = loopAB.a;
          }
        }
      }
      
      // Save progress to local storage
      if (time > 0 && activeDuration > 0) {
        localStorage.setItem(`motionstream_progress_${item.id}`, time.toString());
        localStorage.setItem(`motionstream_progress_percent_${item.id}`, p.toString());
      }
    }
  };

  const onLoadedData = () => {
    setIsLoaded(true);
    if (videoRef.current) {
      if (!useTranscode) {
        // Restore progress for direct play
        const savedTime = localStorage.getItem(`motionstream_progress_${item.id}`);
        if (savedTime && !isNaN(parseFloat(savedTime))) {
          const time = parseFloat(savedTime);
          if (time < videoRef.current.duration - 5) {
            videoRef.current.currentTime = time;
            setCurrentTime(time);
          }
        }
      }
      
      videoRef.current.play().then(() => { setIsPlaying(true); }).catch(() => setIsPlaying(false));
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (videoRef.current) {
      const percentage = parseFloat(e.target.value);
      const time = (percentage / 100) * (duration || videoRef.current.duration);
      
      if (useTranscode) {
        // For transcoded streams, we must trigger a reload with new start time
        setTranscodeStartTime(time);
        setIsLoaded(false);
      } else {
        videoRef.current.currentTime = time;
      }
      setProgress(percentage);
    }
  };

  const togglePiP = async () => {
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      } else if (videoRef.current) {
        await videoRef.current.requestPictureInPicture();
      }
    } catch (err) {
      console.error(err);
    }
  };
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen().catch(err => {
        console.error("Error attempting to enable fullscreen:", err);
      });
    } else {
      document.exitFullscreen();
    }
  };

  const handleMouseMove = () => {
    setShowControls(true);
    gsap.to(controlsRef.current, { opacity: 1, y: 0, duration: 0.4, ease: 'power2.out' });
    
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    
    if (isPlaying) {
      controlsTimeoutRef.current = setTimeout(() => {
        setShowControls(false);
        gsap.to(controlsRef.current, { opacity: 0, y: 20, duration: 0.6, ease: 'power2.inOut' });
      }, 3000);
    }
  };

  useEffect(() => {
    return () => {
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    };
  }, []);

  return (
    <div 
      ref={containerRef} 
      className="fixed inset-0 z-50 bg-black flex flex-col"
      onMouseMove={handleMouseMove}
      onClick={handleMouseMove}
    >
      {/* Top Bar */}
      <div className="gsap-player-ui absolute top-0 inset-x-0 p-6 z-10 bg-gradient-to-b from-black/80 to-transparent flex items-center justify-between transition-opacity duration-300" style={{ opacity: showControls ? 1 : 0 }}>
        <button 
          onClick={handleClose}
          className="flex items-center gap-2 text-white/80 hover:text-white transition-colors"
        >
          <div className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center hover:bg-white/20 transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </div>
          <span className="font-medium tracking-wide">Back to Library</span>
        </button>
        
        <div className="text-right">
          <h2 className="text-xl font-bold text-white">{item.title}</h2>
          <p className="text-sm text-white/60">{item.year}</p>
        </div>
      </div>

      {/* Video Element */}
      <div className="flex-1 relative flex items-center justify-center bg-black" onClick={togglePlay}>
        {!isLoaded && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
            <div className="flex flex-col items-center gap-3 bg-black/60 backdrop-blur-md px-6 py-4 rounded-2xl border border-white/10">
              <Loader2 className="w-10 h-10 text-cyan-400 animate-spin" />
              <span className="text-xs font-mono text-cyan-300 uppercase tracking-widest">Loading Stream...</span>
            </div>
          </div>
        )}
        
        {/* Stats for Nerds */}
        {showStats && (
          <div className="absolute top-4 left-4 z-40 bg-black/80 backdrop-blur-md border border-white/10 rounded-lg p-4 font-mono text-xs text-white/80 w-64 shadow-2xl">
            <h4 className="text-cyan-400 mb-2 font-bold uppercase">Stats for Nerds</h4>
            <div className="grid grid-cols-2 gap-2">
              <span className="text-white/50">Res:</span><span>{stats.res || 'N/A'}</span>
              <span className="text-white/50">Mode:</span><span>{useTranscode ? 'Transcode' : 'Direct'}</span>
              <span className="text-white/50">Dropped:</span><span>{stats.dropped}</span>
              <span className="text-white/50">Decoded:</span><span>{stats.decode}</span>
              <span className="text-white/50">Buffer:</span><span>{formatTime(stats.buffer)}</span>
            </div>
          </div>
        )}

        
        <video

          key={useTranscode ? `transcode-${transcodeStartTime}` : 'direct'}
          ref={videoRef}
          src={(() => {
            let cleanPath = item.path || item.url || '';
            cleanPath = cleanPath.replace(/^\/api\/stream\//, '').replace(/^\/api\/transcode\//, '').replace(/^transcode\//, '').replace(/^\/+/, '');
            const encodedPath = cleanPath.split('/').map(encodeURIComponent).join('/');
            if (useTranscode) {
              return `/api/transcode/${encodedPath}?start=${transcodeStartTime}`;
            }
            return `/api/stream/${encodedPath}`;
          })()}
          className="w-full h-full max-h-screen object-contain relative z-0 cursor-pointer"
          style={{ filter: `brightness(${videoFilters.brightness}%) contrast(${videoFilters.contrast}%) saturate(${videoFilters.saturation}%) sepia(${videoFilters.sepia}%) hue-rotate(${videoFilters.hue}deg)` }}
          onClick={togglePlay}
          onTimeUpdate={handleTimeUpdate}
          onLoadedData={onLoadedData}
          onCanPlay={() => setIsLoaded(true)}
          onLoadedMetadata={() => setIsLoaded(true)}
          onError={(e) => {
            console.error("Video element playback error:", e);
            setIsLoaded(true);
            showToast("Playback error or unsupported format");
          }}
          
          onEnded={() => {
            if (loopMode === 'single') {
              videoRef.current?.play();
            } else if (autoPlayNext && currentIndex < playlist.length - 1) {
              playNext();
            } else if (loopMode === 'all' && autoPlayNext && playlist.length > 0) {
              if (onPlayNext) onPlayNext(playlist[0]);
            } else {
              setIsPlaying(false);
            }
          }}

          autoPlay
          playsInline
        />
        
        

        

        
        {/* HUD Toast overlay */}
        {toastMessage && (
          <div className="absolute top-8 left-1/2 -translate-x-1/2 z-30 pointer-events-none bg-black/70 backdrop-blur-md text-cyan-400 border border-cyan-500/30 font-mono text-sm uppercase px-5 py-2 rounded-full shadow-lg shadow-cyan-500/10 transition-all">
            {toastMessage}
          </div>
        )}

        {/* Title Overlay on Pause */}
        <div className="gsap-pause-overlay absolute inset-0 pointer-events-none flex items-center justify-center z-10 opacity-0">
          <div className="bg-black/40 backdrop-blur-xl px-10 py-8 rounded-3xl border border-white/10 flex flex-col items-center shadow-2xl shadow-cyan-500/10">
            <h2 className="text-4xl font-black italic tracking-tighter text-white mb-2 max-w-2xl text-center drop-shadow-lg">{item.title}</h2>
            <p className="text-cyan-400 font-mono text-sm uppercase tracking-widest">{item.filename}</p>
          </div>
        </div>
      </div>

      {/* Bottom Controls */}
      <div 
        ref={controlsRef}
        className="gsap-player-ui absolute bottom-0 inset-x-0 p-6 pt-24 bg-gradient-to-t from-black via-black/80 to-transparent z-20"
      >
        <div className="max-w-5xl mx-auto flex flex-col gap-4 relative">
          {/* Real-time Web Audio API Visualiser */}
        <canvas 
          ref={canvasRef} 
          width={800} 
          height={150}
          className={`absolute bottom-full mb-4 left-1/2 -translate-x-1/2 z-10 pointer-events-none transition-opacity duration-500 ${showVisualiser ? 'opacity-100' : 'opacity-0'}`} 
        />
          {/* Progress Bar Container */}
          <div className="group relative py-2 cursor-pointer flex items-center">
            {/* Background Track */}
            <div className="w-full h-2 bg-white/15 backdrop-blur-xl border border-white/10 rounded-full relative overflow-hidden">
              {/* Blue Progress Fill */}
              <div 
                className="absolute left-0 top-0 bottom-0 bg-cyan-400 rounded-full shadow-[0_0_12px_rgba(34,211,238,0.8)] transition-all duration-75" 
                style={{ width: `${progress}%` }}
              />
              
              {/* A-B Loop Range Overlay */}
              {duration > 0 && loopAB.a !== null && loopAB.b !== null && (
                <div 
                  className="absolute top-0 bottom-0 bg-pink-500/40 border-x border-pink-400 z-10 pointer-events-none"
                  style={{ 
                    left: `${(loopAB.a / duration) * 100}%`, 
                    width: `${Math.max(0, ((loopAB.b - loopAB.a) / duration) * 100)}%` 
                  }}
                />
              )}
            </div>

            {/* Point A Marker */}
            {duration > 0 && loopAB.a !== null && (
              <div 
                className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 z-20 w-3 h-3 bg-pink-400 border border-white rounded-full shadow-[0_0_8px_rgba(236,72,153,1)] pointer-events-none"
                style={{ left: `${(loopAB.a / duration) * 100}%` }}
                title={`Loop A: ${formatTime(loopAB.a)}`}
              />
            )}

            {/* Point B Marker */}
            {duration > 0 && loopAB.b !== null && (
              <div 
                className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 z-20 w-3 h-3 bg-pink-500 border border-white rounded-full shadow-[0_0_8px_rgba(236,72,153,1)] pointer-events-none"
                style={{ left: `${(loopAB.b / duration) * 100}%` }}
                title={`Loop B: ${formatTime(loopAB.b)}`}
              />
            )}

            {/* Progress Handle / Scrubber Point */}
            <div 
              className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-4 h-4 bg-white border-2 border-cyan-400 rounded-full shadow-[0_0_10px_rgba(34,211,238,1)] pointer-events-none transition-transform group-hover:scale-125 z-30"
              style={{ left: `${progress}%` }}
            />

            {/* Interactive Seek Input */}
            <input 
              type="range" 
              min="0" 
              max="100" 
              step="0.05"
              value={progress}
              onChange={handleSeek}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-40"
            />
          </div>
          
          <div className="flex items-center justify-between relative">
            {/* Left: Volume & Time */}
            <div className="flex items-center gap-6 flex-1 basis-0 justify-start">
              {/* Volume Controls */}
              <div className="flex items-center justify-center relative">
                <button 
                  onClick={toggleMute} 
                  onMouseEnter={() => setShowVolumeSlider(prev => !prev)}
                  className="flex items-center justify-center text-white hover:text-cyan-400 transition-colors p-1"
                >
                  {isMuted ? <VolumeX className="w-6 h-6" /> : <Volume2 className="w-6 h-6" />}
                </button>
                {/* Vertical Volume Popup */}
                <div 
                  className={`absolute left-1/2 -translate-x-1/2 transition-all duration-200 origin-bottom z-50 after:absolute after:inset-x-0 after:-bottom-8 after:h-10 ${
                    showVolumeSlider ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
                  }`} 
                  style={{ top: '-196px' }}
                >
                  <div className="w-12 bg-slate-900/95 backdrop-blur-2xl border border-white/20 rounded-2xl py-3.5 px-3 flex flex-col items-center gap-2.5 shadow-[0_10px_30px_rgba(0,0,0,0.8)]">
                    <span className="text-[10px] font-mono text-cyan-400 font-bold tracking-tight select-none">
                      {Math.round((isMuted ? 0 : volume) * 100)}%
                    </span>
                    <div className="relative w-2.5 h-28 bg-white/20 border border-white/10 rounded-full flex flex-col justify-end items-center cursor-pointer my-1">
                      <div 
                        className="w-full bg-cyan-400 rounded-full transition-all duration-75"
                        style={{ height: `${isMuted ? 0 : volume * 100}%` }}
                      />
                      <div 
                        className="absolute left-1/2 -translate-x-1/2 w-5 h-5 bg-cyan-400 border border-white rounded-full shadow-[0_0_10px_rgba(34,211,238,1)] pointer-events-none transition-all duration-75 z-20"
                        style={{ bottom: `calc(${isMuted ? 0 : volume * 100}% - 10px)` }}
                      />
                      <input 
                        type="range" 
                        min="0" 
                        max="1"
                        step="0.01"
                        orient="vertical"
                        value={isMuted ? 0 : volume}
                        onChange={handleVolumeChange}
                        className="absolute -inset-x-3 inset-y-0 w-auto h-full opacity-0 cursor-pointer z-30"
                        style={{ appearance: 'slider-vertical', WebkitAppearance: 'slider-vertical' }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Time display */}
              <div className="text-xs font-mono tracking-wider text-white flex items-center leading-none">
                <span>{formatTime(currentTime)}<span className="text-white/50 mx-0.5">/</span><span className="text-white/70">{formatTime(duration)}</span></span>
                <span className="ml-2 px-1.5 py-0.5 rounded bg-white/10 text-[9px] uppercase text-white/60">
                  {duration > currentTime ? `-${formatTime(duration - currentTime)}` : '00:00'}
                </span>
              </div>
            </div>

            {/* Center: Transport Controls */}
            <div className="flex items-center justify-center gap-3 flex-1 basis-0">
              <button onClick={playPrev} className="flex items-center justify-center text-white/80 hover:text-cyan-400 transition-colors p-2" title="Previous Video">
                <SkipBack className="w-5 h-5" />
              </button>
              <button 
                onClick={() => skipTime(-10)} 
                className="flex items-center justify-center text-white/80 hover:text-cyan-400 transition-colors p-2 transform active:scale-90"
                title="Rewind 10s (Left Arrow / J)"
              >
                <RotateCcw className="w-5 h-5" />
              </button>
              <button 
                onClick={togglePlay}
                className="flex items-center justify-center text-white hover:text-cyan-400 transition-colors transform hover:scale-110 active:scale-95 mx-2"
                title="Play / Pause (Space / K)"
              >
                {isPlaying ? <Pause className="w-10 h-10 fill-current" /> : <Play className="w-10 h-10 fill-current ml-1" />}
              </button>
              <button 
                onClick={() => skipTime(10)} 
                className="flex items-center justify-center text-white/80 hover:text-cyan-400 transition-colors p-2 transform active:scale-90"
                title="Forward 10s (Right Arrow / L)"
              >
                <RotateCw className="w-5 h-5" />
              </button>
              <button onClick={playNext} className="flex items-center justify-center text-white/80 hover:text-cyan-400 transition-colors p-2" title="Next Video">
                <SkipForward className="w-5 h-5" />
              </button>
              
              {/* Repeat & A-B Clip Looper Controls */}
              <div className="flex items-center gap-1 bg-white/5 border border-white/10 rounded-full p-1 ml-1">
                <button 
                  onClick={toggleLoopMode} 
                  className={`flex items-center justify-center p-1.5 rounded-full transition-colors ${loopMode !== 'off' ? 'text-cyan-400 bg-cyan-500/10' : 'text-white/60 hover:text-white'}`}
                  title="Loop Mode (Off / Single / All)"
                >
                  <Repeat className="w-4 h-4" />
                  {loopMode !== 'off' && (
                    <span className="ml-1 text-[9px] font-mono font-bold text-cyan-400">
                      {loopMode === 'single' ? '1' : 'ALL'}
                    </span>
                  )}
                </button>

                <div className="w-[1px] h-3.5 bg-white/15 my-auto" />

                {/* A-B Clip Looper Buttons */}
                <button
                  onClick={() => setLoopPoint('a')}
                  className={`px-2 py-0.5 text-[10px] font-mono font-bold rounded-md transition-all ${loopAB.a !== null ? 'bg-cyan-500 text-black shadow-[0_0_8px_rgba(34,211,238,0.6)]' : 'text-white/70 hover:text-cyan-400 hover:bg-white/10'}`}
                  title={loopAB.a !== null ? `Loop A set at ${formatTime(loopAB.a)}` : "Set Loop Start Point (A)"}
                >
                  A
                </button>
                <button
                  onClick={() => setLoopPoint('b')}
                  className={`px-2 py-0.5 text-[10px] font-mono font-bold rounded-md transition-all ${loopAB.b !== null ? 'bg-pink-500 text-black shadow-[0_0_8px_rgba(236,72,153,0.6)]' : 'text-white/70 hover:text-pink-400 hover:bg-white/10'}`}
                  title={loopAB.b !== null ? `Loop B set at ${formatTime(loopAB.b)}` : "Set Loop End Point (B)"}
                >
                  B
                </button>

                {(loopAB.a !== null || loopAB.b !== null) && (
                  <button 
                    onClick={clearLoop} 
                    className="p-1 text-white/50 hover:text-rose-400 transition-colors rounded-full"
                    title="Clear A-B Loop"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Right: Extras */}
            <div className="flex items-center justify-end gap-3 flex-1 basis-0">
              <button 
                onClick={toggleTranscode}
                className={`flex items-center justify-center px-2 py-1 rounded text-[10px] font-bold tracking-wider uppercase transition-colors ${useTranscode ? 'bg-indigo-500 text-white' : 'bg-white/10 text-white/70 hover:bg-white/20'}`}
                title="Toggle FFmpeg real-time transcode"
              >
                {useTranscode ? 'TRANS' : 'DIRECT'}
              </button>
              
              <button 
                onClick={() => { setShowVisualiser(p => !p); initAudio(); }}
                className={`flex items-center justify-center p-2 rounded-full transition-colors transform hover:scale-110 ${showVisualiser ? 'text-cyan-400 bg-cyan-400/10' : 'text-white/50 hover:text-white'}`}
                title="Web Audio Visualiser"
              >
                <AudioWaveform className="w-4 h-4" />
              </button>
              <div className="relative flex items-center justify-center">
              <button 
                onClick={() => setShowFilters(p => !p)}
                className={`flex items-center justify-center p-2 rounded-full transition-colors transform hover:scale-110 ${showFilters ? 'text-pink-400 bg-pink-400/10' : 'text-white/50 hover:text-white'}`}
                title="Colour Grading Engine"
              >
                <SlidersHorizontal className="w-4 h-4" />
              </button>
              {/* Real-time Colour Grading Matrix */}
        {showFilters && (
          <div className="absolute right-0 z-50 bg-slate-900/95 backdrop-blur-2xl border border-white/20 rounded-2xl p-4 w-64 max-h-[calc(100vh-140px)] overflow-y-auto shadow-[0_10px_40px_rgba(0,0,0,0.8)] origin-bottom animate-in slide-in-from-bottom-2" style={{ top: '-286px' }}>
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-cyan-400 font-bold uppercase text-xs tracking-widest">Colour Engine</h4>
              <button onClick={() => setVideoFilters({ brightness: 100, contrast: 100, saturation: 100, sepia: 0, hue: 0 })} className="text-[10px] text-white/50 hover:text-cyan-400">RESET</button>
            </div>
            <div className="space-y-4">
              {Object.entries(videoFilters).map(([key, val]) => (
                <div key={key}>
                  <div className="flex justify-between text-[10px] uppercase text-white/70 mb-1">
                    <span>{key}</span>
                    <span>{val}{key==='hue'?'°':'%'}</span>
                  </div>
                  <input 
                    type="range" 
                    min={key==='hue'?0:0} 
                    max={key==='hue'?360:200} 
                    value={val}
                    onChange={(e) => setVideoFilters(p => ({...p, [key]: Number(e.target.value)}))}
                    className="w-full h-1 bg-white/20 rounded-full appearance-none outline-none cursor-ew-resize [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-cyan-400 [&::-webkit-slider-thumb]:rounded-full hover:[&::-webkit-slider-thumb]:scale-125 transition-all"
                  />
                </div>
              ))}
            </div>
          </div>
        )}
            </div>
              
              <div className="relative flex items-center justify-center group">
                <button 
                  onClick={() => setShowSpeedMenu(!showSpeedMenu)}
                  className="flex items-center justify-center text-white hover:text-cyan-400 transition-colors text-xs font-bold px-2 py-1 bg-white/5 rounded"
                >
                  {playbackRate}x
                </button>
                {showSpeedMenu && (
                  <div className="absolute right-0 bg-slate-900/95 backdrop-blur-2xl border border-white/20 rounded-xl overflow-hidden flex flex-col min-w-[90px] max-h-[calc(100vh-140px)] overflow-y-auto shadow-[0_10px_40px_rgba(0,0,0,0.8)] origin-bottom animate-in slide-in-from-bottom-2 z-50" style={{ top: '-290px' }}>
                    {[0.25, 0.5, 1, 1.25, 1.5, 2, 4].map(rate => (
                      <button
                        key={rate}
                        onClick={() => { 
                          handleSpeedChange(rate); 
                          setPlaybackRate(rate); 
                          setShowSpeedMenu(false); 
                        }}
                        className={`px-4 py-2.5 text-xs font-medium text-left transition-colors hover:bg-white/10 ${playbackRate === rate ? 'text-cyan-400 bg-cyan-500/10' : 'text-white'}`}
                      >
                        {rate}x
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <button onClick={() => setShowTheaterMode(!showTheaterMode)} className={`flex items-center justify-center text-white/50 hover:text-cyan-400 transition-colors transform hover:scale-110 p-2 ${showTheaterMode ? 'text-cyan-400' : ''}`} title="Theater Mode">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect><line x1="8" y1="21" x2="16" y2="21"></line><line x1="12" y1="17" x2="12" y2="21"></line></svg>
              </button>
              <button onClick={togglePiP} className="flex items-center justify-center text-white/50 hover:text-cyan-400 transition-colors transform hover:scale-110 p-2" title="Picture in Picture (P)">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><rect x="11" y="11" width="8" height="6" rx="1" ry="1"></rect></svg>
              </button>
              <button onClick={toggleFullscreen} className="flex items-center justify-center text-white/50 hover:text-cyan-400 transition-colors transform hover:scale-110 p-2">
                <Maximize className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
