import React, { useMemo } from 'react';
import { Star, Play, Info } from 'lucide-react';
import type { MediaItem, PrimaryColorKey, ThemeMode } from '../../types';
import type { ListColumns, ListOrder } from '../../types/mediaMotion';
import { ACCENT_PALETTES } from '../../utils/themeTokens';

interface MediaListViewProps {
  items: MediaItem[];
  theme: ThemeMode;
  accent: PrimaryColorKey;
  stars: Record<string, boolean>;
  onToggleStar: (id: string, e: React.MouseEvent) => void;
  onSelect: (item: MediaItem) => void;
  onPlay?: (item: MediaItem) => void;
  onInfo?: (item: MediaItem) => void;
  columns?: ListColumns;
  order?: ListOrder;
}

export const MediaListView: React.FC<MediaListViewProps> = ({
  items,
  theme,
  accent,
  stars,
  onToggleStar,
  onSelect,
  onPlay,
  onInfo,
  columns = 2,
  order = 'down'
}) => {
  const isLight = theme === 'light';
  const palette = ACCENT_PALETTES[accent]?.[theme] || ACCENT_PALETTES.cyan[theme];

  // Distribute items into columns based on order
  const columnGroups = useMemo(() => {
    if (columns <= 1 || items.length <= 1) return [items];
    const groups: MediaItem[][] = Array.from({ length: columns }, () => []);

    if (order === 'across') {
      items.forEach((item, idx) => groups[idx % columns].push(item));
    } else {
      const chunkSize = Math.ceil(items.length / columns);
      for (let c = 0; c < columns; c++) {
        groups[c] = items.slice(c * chunkSize, (c + 1) * chunkSize);
      }
    }
    return groups;
  }, [items, columns, order]);

  const renderHeader = (colNum: number) => (
    <div
      key={`hdr-${colNum}`}
      className={`sticky top-0 z-20 flex items-center gap-3 px-3 py-2 text-[10px] font-mono uppercase tracking-wider rounded-lg backdrop-blur-md border-b mb-1 ${
        isLight
          ? 'bg-slate-100/90 text-slate-600 border-slate-200'
          : 'bg-slate-950/90 text-slate-400 border-slate-800'
      }`}
    >
      <span className="w-8 flex-none text-center">Play</span>
      <span className="w-5 flex-none text-center">★</span>
      <span className="flex-1 min-w-0">Title</span>
      <span className="w-16 flex-none">Format</span>
      <span className="w-16 flex-none text-right">Size</span>
      <span className="w-24 flex-none hidden sm:block">Category</span>
      <span className="w-8 flex-none text-center">Info</span>
    </div>
  );

  const renderRow = (item: MediaItem) => {
    const isStarred = !!stars[item.id];
    const isBinary = item.mediaType === 'binary';

    return (
      <div
        key={item.id}
        data-row={item.id}
        onClick={() => onSelect(item)}
        className={`group flex items-center gap-3 px-3 py-2 rounded-xl border cursor-pointer transition-all duration-200 ${
          isLight
            ? 'bg-white/70 hover:bg-white border-slate-200/80 shadow-sm hover:shadow-md'
            : 'bg-slate-900/50 hover:bg-slate-900/90 border-slate-800/80 hover:border-slate-700'
        }`}
        style={{ willChange: 'transform, background-color' }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'translateX(4px)';
          e.currentTarget.style.borderColor = palette.primary;
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'translateX(0)';
          e.currentTarget.style.borderColor = '';
        }}
      >
        {/* Preview Thumbnail / Quick Play */}
        <div className="w-8 h-8 flex-none rounded-lg bg-slate-950/40 overflow-hidden relative border border-slate-700/50 flex items-center justify-center">
          {item.poster ? (
            <img src={item.poster} alt={item.title} className="w-full h-full object-cover" />
          ) : null}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              if (isBinary && onInfo) onInfo(item);
              else if (onPlay) onPlay(item);
            }}
            className="absolute inset-0 flex items-center justify-center bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity"
            title={isBinary ? 'View Details' : 'Play'}
          >
            {isBinary ? <Info className="w-3 h-3 text-amber-400" /> : <Play className="w-3 h-3 fill-current" />}
          </button>
        </div>

        {/* Star / Favorite */}
        <button
          type="button"
          onClick={(e) => onToggleStar(item.id, e)}
          className="w-5 flex-none flex items-center justify-center text-slate-500 hover:text-amber-400"
          title={isStarred ? 'Unfavorite' : 'Favorite'}
        >
          <Star
            className="w-3.5 h-3.5"
            style={{
              color: isStarred ? palette.primary : undefined,
              fill: isStarred ? palette.primary : 'none'
            }}
          />
        </button>

        {/* Title */}
        <span className={`flex-1 min-w-0 font-medium text-sm truncate ${isLight ? 'text-slate-900' : 'text-slate-100'}`} title={item.title}>
          {item.title}
        </span>

        {/* Format */}
        <span className="w-16 flex-none text-[10px] font-mono uppercase tracking-wider text-slate-500">
          {item.format || item.mediaType || '—'}
        </span>

        {/* Size */}
        <span className="w-16 flex-none text-[10px] font-mono text-right text-slate-500">
          {item.sizeFormatted || '—'}
        </span>

        {/* Category */}
        <span className="w-24 flex-none text-[10px] font-mono truncate text-slate-500 hidden sm:block">
          {item.category && item.category !== 'Root' ? item.category.split('/').pop() : 'General'}
        </span>

        {/* Info Button */}
        <div className="w-8 flex-none flex items-center justify-center">
          {onInfo && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onInfo(item);
              }}
              className={`p-1 rounded-md transition-colors ${
                isLight ? 'text-slate-500 hover:text-slate-900 hover:bg-slate-200/60' : 'text-slate-400 hover:text-white hover:bg-white/10'
              }`}
              title="DEEP Metadata & Info"
            >
              <Info className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div
      className="w-full pt-4 md:pt-6 pb-16"
      style={{
        display: columns > 1 ? 'grid' : 'flex',
        gridTemplateColumns: columns > 1 ? `repeat(${columns}, minmax(0, 1fr))` : undefined,
        flexDirection: columns === 1 ? 'column' : undefined,
        gap: '12px'
      }}
    >
      {columnGroups.map((group, colIdx) => (
        <div key={`col-${colIdx}`} className="flex flex-col gap-1.5 min-w-0">
          {renderHeader(colIdx + 1)}
          {group.map((item) => renderRow(item))}
        </div>
      ))}
    </div>
  );
};
