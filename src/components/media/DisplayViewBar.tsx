import React from 'react';
import {
  LayoutGrid,
  List,
  Layers,
  Columns3,
  Compass,
  Clapperboard,
  FileStack,
  SlidersHorizontal
} from 'lucide-react';
import type { ViewMode, Density, ListColumns, ListOrder } from '../../types/mediaMotion';
import type { PrimaryColorKey, ThemeMode } from '../../types';
import { ACCENT_PALETTES } from '../../utils/themeTokens';

interface DisplayViewBarProps {
  view: ViewMode;
  onViewChange: (view: ViewMode) => void;
  density: Density;
  onDensityChange: (density: Density) => void;
  listColumns: ListColumns;
  onListColumnsChange: (columns: ListColumns) => void;
  listOrder: ListOrder;
  onListOrderChange: (order: ListOrder) => void;
  motionMultiplier: number;
  onMotionMultiplierChange: (mult: number) => void;
  theme: ThemeMode;
  accent: PrimaryColorKey;
}

interface ViewOption {
  id: ViewMode;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
}

const VIEW_OPTIONS: ViewOption[] = [
  { id: 'grid', label: 'Grid', icon: LayoutGrid, description: 'Responsive catalog grid with scroll reveals' },
  { id: 'list', label: 'List', icon: List, description: 'Dense multi-column details list' },
  { id: 'coverflow', label: 'Coverflow', icon: Layers, description: 'Apple-style 3D rotating coverflow' },
  { id: 'strip', label: 'Strip', icon: Columns3, description: 'Fluid horizontal film strip' },
  { id: 'radial', label: 'Radial', icon: Compass, description: 'Circular orbital arc carousel' },
  { id: 'filmstrip', label: 'Filmstrip', icon: Clapperboard, description: 'Vertical 3D perspective scroll' },
  { id: 'peel', label: 'Peel', icon: FileStack, description: 'Deck stack peel-away view' }
];

export const DisplayViewBar: React.FC<DisplayViewBarProps> = ({
  view,
  onViewChange,
  density,
  onDensityChange,
  listColumns,
  onListColumnsChange,
  listOrder,
  onListOrderChange,
  motionMultiplier,
  onMotionMultiplierChange,
  theme,
  accent
}) => {
  const isLight = theme === 'light';
  const palette = ACCENT_PALETTES[accent]?.[theme] || ACCENT_PALETTES.cyan[theme];

  return (
    <div
      className={`w-full px-4 py-2 flex flex-wrap items-center justify-between gap-3 border-b text-xs transition-colors z-20 ${
        isLight
          ? 'bg-slate-100/80 border-slate-200/80 text-slate-700'
          : 'bg-black/30 border-white/5 text-slate-300'
      }`}
    >
      {/* 7 Display View Toggles */}
      <div className="flex items-center gap-1 overflow-x-auto max-w-full py-0.5 custom-scrollbar">
        <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 mr-1.5 hidden sm:inline-block">
          View:
        </span>
        <div
          className={`flex items-center gap-1 p-1 rounded-2xl border ${
            isLight ? 'bg-white/80 border-slate-200 shadow-sm' : 'bg-white/5 border-white/10'
          }`}
        >
          {VIEW_OPTIONS.map((opt) => {
            const Icon = opt.icon;
            const isActive = view === opt.id;

            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => onViewChange(opt.id)}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl font-medium text-xs transition-all duration-200 select-none ${
                  isActive
                    ? 'shadow-md scale-[1.02] font-semibold text-white'
                    : isLight
                    ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    : 'text-white/60 hover:text-white hover:bg-white/5'
                }`}
                style={
                  isActive
                    ? {
                        backgroundColor: palette.primary,
                        boxShadow: palette.hoverGlow
                      }
                    : undefined
                }
                title={opt.description}
              >
                <Icon className="w-3.5 h-3.5 flex-none" />
                <span className="hidden md:inline">{opt.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Sub-controls matching active view mode */}
      <div className="flex items-center gap-3 ml-auto">
        {/* Grid View Sub-controls: Density */}
        {view === 'grid' && (
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-mono uppercase text-slate-400">Cols:</span>
            <div
              className={`flex items-center gap-0.5 p-0.5 rounded-lg border ${
                isLight ? 'bg-white border-slate-200' : 'bg-white/5 border-white/10'
              }`}
            >
              {([3, 4, 5, 6] as Density[]).map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => onDensityChange(d)}
                  className={`w-6 h-6 rounded-md text-[11px] font-mono font-bold transition-all ${
                    density === d
                      ? (isLight ? 'bg-slate-200 text-slate-900 shadow-sm' : 'bg-white/20 text-white shadow-sm')
                      : (isLight ? 'text-slate-500 hover:text-slate-900' : 'text-slate-400 hover:text-white')
                  }`}
                  style={density === d ? { color: palette.primary } : undefined}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* List View Sub-controls: Columns & Distribution */}
        {view === 'list' && (
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              <span className="text-[10px] font-mono uppercase text-slate-400">Cols:</span>
              <div
                className={`flex items-center gap-0.5 p-0.5 rounded-lg border ${
                  isLight ? 'bg-white border-slate-200' : 'bg-white/5 border-white/10'
                }`}
              >
                {([1, 2, 3, 4] as ListColumns[]).map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => onListColumnsChange(c)}
                    className={`w-6 h-6 rounded-md text-[11px] font-mono font-bold transition-all ${
                      listColumns === c
                        ? (isLight ? 'bg-slate-200 text-slate-900 shadow-sm' : 'bg-white/20 text-white shadow-sm')
                        : (isLight ? 'text-slate-500 hover:text-slate-900' : 'text-slate-400 hover:text-white')
                    }`}
                    style={listColumns === c ? { color: palette.primary } : undefined}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-1">
              <span className="text-[10px] font-mono uppercase text-slate-400">Order:</span>
              <button
                type="button"
                onClick={() => onListOrderChange(listOrder === 'down' ? 'across' : 'down')}
                className={`px-2 py-0.5 rounded-md font-mono text-[10px] uppercase font-bold border transition-colors ${
                  isLight ? 'bg-white border-slate-200 hover:bg-slate-50' : 'bg-white/5 border-white/10 hover:bg-white/10'
                }`}
                title="Switch column item distribution"
              >
                {listOrder}
              </button>
            </div>
          </div>
        )}

        {/* Motion Multiplier Tuning for 3D Carousel views */}
        {['coverflow', 'strip', 'radial', 'filmstrip', 'peel'].includes(view) && (
          <div className="flex items-center gap-1.5">
            <SlidersHorizontal className="w-3 h-3 text-slate-400" />
            <span className="text-[10px] font-mono uppercase text-slate-400 hidden sm:inline">Speed:</span>
            <div
              className={`flex items-center gap-0.5 p-0.5 rounded-lg border ${
                isLight ? 'bg-white border-slate-200' : 'bg-white/5 border-white/10'
              }`}
            >
              {[
                { label: '0.8x', val: 0.8 },
                { label: '1.0x', val: 1.0 },
                { label: '1.3x', val: 1.3 }
              ].map((m) => (
                <button
                  key={m.label}
                  type="button"
                  onClick={() => onMotionMultiplierChange(m.val)}
                  className={`px-1.5 h-6 rounded-md text-[10px] font-mono font-bold transition-all ${
                    motionMultiplier === m.val
                      ? (isLight ? 'bg-slate-200 text-slate-900 shadow-sm' : 'bg-white/20 text-white shadow-sm')
                      : (isLight ? 'text-slate-500 hover:text-slate-900' : 'text-slate-400 hover:text-white')
                  }`}
                  style={motionMultiplier === m.val ? { color: palette.primary } : undefined}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
