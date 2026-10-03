import React, { useState } from 'react';
import { Play, Star, Copy, Check, Info, Music, Disc } from 'lucide-react';
import type { MediaItem, PrimaryColorKey, ThemeMode } from '../../types';
import { getCardDepthStyling } from '../../motion/motionMath';
import { ACCENT_PALETTES } from '../../utils/themeTokens';

interface MediaCardProps {
  item: MediaItem;
  index: number;
  focusIndex: number;
  isSelected: boolean;
  isStarred: boolean;
  isCarousel: boolean;
  theme: ThemeMode;
  accent: PrimaryColorKey;
  onSelect: (item: MediaItem, e: React.MouseEvent) => void;
  onToggleStar: (id: string, e: React.MouseEvent) => void;
  onPlay?: (item: MediaItem) => void;
  onInfo?: (item: MediaItem) => void;
  cardRefCallback: (el: HTMLDivElement | null) => void;
}

export const MediaCard: React.FC<MediaCardProps> = React.memo(({
  item,
  index,
  focusIndex,
  isSelected,
  isStarred,
  isCarousel,
  theme,
  accent,
  onSelect,
  onToggleStar,
  onPlay,
  onInfo,
  cardRefCallback
}) => {
  const [copied, setCopied] = useState(false);
  const isLight = theme === 'light';
  const palette = ACCENT_PALETTES[accent]?.[theme] || ACCENT_PALETTES.cyan[theme];

  const ad = isCarousel ? Math.abs(index - focusIndex) : 0;
  const depth = getCardDepthStyling(ad, isSelected, isCarousel, theme, accent);

  const isAudio = item.mediaType === 'audio';
  const isBinary = item.mediaType === 'binary';

  // Watch progress
  const savedTime = localStorage.getItem(`motionstream_progress_${item.id}`);
  const savedPercent = localStorage.getItem(`motionstream_progress_percent_${item.id}`);
  const hasProgress = savedTime && !isNaN(parseFloat(savedTime)) && parseFloat(savedTime) > 0;
  const progressWidth = savedPercent && !isNaN(parseFloat(savedPercent)) ? `${parseFloat(savedPercent)}%` : '0%';

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard?.writeText(item.title);
    setCopied(true);
    setTimeout(() => setCopied(false), 1400);
  };

  return (
    <div
      ref={cardRefCallback}
      data-card={item.id}
      onClick={(e) => onSelect(item, e)}
      className="absolute top-0 left-0 w-[250px] h-[300px] cursor-pointer select-none opacity-0"
      style={{ transformStyle: 'preserve-3d', willChange: 'transform, opacity' }}
    >
      <div data-reveal="1" className="w-full h-full">
        <div
          className={`w-full h-full rounded-2xl overflow-hidden flex flex-col relative transition-all duration-300 ${
            isLight ? 'bg-white text-slate-800' : 'bg-slate-900/90 text-slate-100'
          }`}
          style={{
            border: depth.border,
            boxShadow: depth.boxShadow,
            transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-3px)';
            e.currentTarget.style.boxShadow = palette.hoverGlow;
            e.currentTarget.style.borderColor = palette.primary;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = depth.boxShadow;
            e.currentTarget.style.borderColor = depth.borderColor;
          }}
        >
          {/* Poster / Artwork Area */}
          <div className="relative flex-1 min-h-0 bg-slate-950/40 overflow-hidden group">
            {isAudio ? (
              <div className="w-full h-full bg-gradient-to-br from-indigo-950 via-slate-900 to-purple-950 flex flex-col items-center justify-center p-3">
                <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center shadow-lg shadow-indigo-500/20">
                  <Music className="w-6 h-6 text-indigo-400" />
                </div>
                <span className="text-[9px] font-mono text-indigo-300 font-bold uppercase tracking-wider mt-2">
                  Audio Track
                </span>
              </div>
            ) : isBinary ? (
              <div className="w-full h-full bg-gradient-to-br from-amber-950 via-slate-900 to-orange-950 flex flex-col items-center justify-center p-3">
                <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center shadow-lg shadow-amber-500/20">
                  <Disc className="w-6 h-6 text-amber-400" />
                </div>
                <span className="text-[9px] font-mono text-amber-300 font-bold uppercase tracking-wider mt-2">
                  ISO / Archive
                </span>
              </div>
            ) : item.poster ? (
              <img
                src={item.poster}
                alt={item.title}
                className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                loading="lazy"
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center text-xs tracking-widest text-slate-500 uppercase font-mono">
                No Preview
              </div>
            )}

            {/* MediaType / Format Badge */}
            <span
              className="absolute left-2.5 top-2.5 px-2 py-0.5 rounded-md text-[10px] font-mono tracking-wider uppercase font-semibold border backdrop-blur-md z-10"
              style={{
                backgroundColor: palette.badgeBg,
                borderColor: palette.badgeBorder,
                color: palette.badgeText
              }}
            >
              {item.format || (isAudio ? 'AUDIO' : isBinary ? 'BIN' : 'VIDEO')}
            </span>

            {/* Action Buttons Top Right: Info & Star */}
            <div className="absolute right-2 top-2 flex items-center gap-1.5 z-10">
              {onInfo && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onInfo(item);
                  }}
                  className="w-6 h-6 rounded-md bg-slate-950/70 hover:bg-slate-950 text-white/80 hover:text-white transition-colors flex items-center justify-center backdrop-blur-sm border border-white/10"
                  title="File Details & DEEP Meta"
                >
                  <Info className="w-3.5 h-3.5" />
                </button>
              )}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleStar(item.id, e);
                }}
                className="w-6 h-6 rounded-md bg-slate-950/70 hover:bg-slate-950 transition-colors flex items-center justify-center backdrop-blur-sm border border-white/10"
                title={isStarred ? 'Remove from Favorites' : 'Add to Favorites'}
              >
                <Star
                  className="w-3.5 h-3.5"
                  style={{
                    color: isStarred ? palette.primary : 'rgba(255, 255, 255, 0.4)',
                    fill: isStarred ? palette.primary : 'none'
                  }}
                />
              </button>
            </div>

            {/* Play Button Overlay */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                if (isBinary && onInfo) {
                  onInfo(item);
                } else if (onPlay) {
                  onPlay(item);
                }
              }}
              className="absolute bottom-2.5 right-2.5 w-8 h-8 rounded-full bg-slate-950/80 hover:scale-110 active:scale-95 transition-transform backdrop-blur-md border border-white/20 flex items-center justify-center text-white shadow-lg z-10"
              title={isBinary ? 'View Details' : 'Play Media'}
            >
              {isBinary ? (
                <Info className="w-3.5 h-3.5 text-amber-400" />
              ) : (
                <Play className="w-3.5 h-3.5 fill-current ml-0.5" style={{ color: palette.primary }} />
              )}
            </button>

            {/* Watch Progress Bar */}
            {hasProgress && !isBinary && (
              <div className="absolute bottom-0 left-0 w-full h-1 bg-white/20 z-20">
                <div
                  className="h-full transition-all duration-300"
                  style={{ width: progressWidth, backgroundColor: palette.primary }}
                />
              </div>
            )}
          </div>

          {/* Metadata Footer */}
          <div className="p-3 flex flex-col gap-1.5 flex-none">
            <h3 className="font-semibold text-sm leading-tight truncate" title={item.title}>
              {item.title}
            </h3>

            {/* Category and Size Chips */}
            <div className="flex items-center gap-1.5 flex-wrap">
              {item.category && item.category !== 'Root' && (
                <span className="px-2 py-0.5 rounded-full text-[9px] font-mono tracking-wide uppercase bg-slate-200/50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 truncate max-w-[120px]">
                  {item.category.split('/').pop()}
                </span>
              )}
              {item.sizeFormatted && (
                <span className="px-2 py-0.5 rounded-full text-[9px] font-mono tracking-wide uppercase bg-slate-200/30 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400">
                  {item.sizeFormatted}
                </span>
              )}
            </div>

            {/* Filename & Quick Copy */}
            <div className="flex items-center justify-between gap-2 text-[10px] font-mono text-slate-500 pt-1 border-t border-slate-200/40 dark:border-slate-800/60">
              <span className="truncate" title={item.filename}>
                {item.filename}
              </span>
              <button
                type="button"
                onClick={handleCopy}
                className="hover:text-slate-300 p-0.5 rounded transition-colors"
                title="Copy Title"
              >
                {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});
