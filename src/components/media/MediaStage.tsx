import React, { useRef, useState, useEffect } from 'react';
import gsap from 'gsap';
import type { MediaItem, PrimaryColorKey, ThemeMode } from '../../types';
import type { ViewMode, Density, ListColumns, ListOrder } from '../../types/mediaMotion';
import { MediaCard } from './MediaCard';
import { MediaListView } from './MediaListView';
import { StageWatermark } from './StageWatermark';
import { useCarouselMotion } from '../../motion/useCarouselMotion';
import { computeCarouselTarget } from '../../motion/motionMath';

interface MediaStageProps {
  items: MediaItem[];
  view: ViewMode;
  density?: Density;
  focusIndex: number;
  onFocusChange: (index: number) => void;
  selectedIds?: Record<string, boolean>;
  onToggleSelect?: (id: string, e: React.MouseEvent) => void;
  stars: Record<string, boolean>;
  onToggleStar: (id: string, e: React.MouseEvent) => void;
  theme: ThemeMode;
  accent: PrimaryColorKey;
  motionMultiplier?: number;
  listColumns?: ListColumns;
  listOrder?: ListOrder;
  onSelectMedia: (item: MediaItem) => void;
  onPlayMedia?: (item: MediaItem) => void;
  onInfoMedia?: (item: MediaItem) => void;
}

export const MediaStage: React.FC<MediaStageProps> = ({
  items,
  view,
  density = 4,
  focusIndex,
  onFocusChange,
  selectedIds = {},
  onToggleSelect = (_id: string, _e: React.MouseEvent) => {},
  stars,
  onToggleStar,
  theme,
  accent,
  motionMultiplier = 1,
  listColumns = 2,
  listOrder = 'down',
  onSelectMedia,
  onPlayMedia,
  onInfoMedia
}) => {
  const rootRef = useRef<HTMLDivElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const ioRef = useRef<IntersectionObserver | null>(null);

  const [stageWidth, setStageWidth] = useState<number>(1200);
  const isCarousel = ['coverflow', 'strip', 'radial', 'filmstrip', 'peel'].includes(view);

  // Resize handler
  useEffect(() => {
    const handleResize = () => {
      if (stageRef.current) setStageWidth(stageRef.current.clientWidth);
      else if (wrapRef.current) setStageWidth(wrapRef.current.clientWidth);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Wire high-performance imperative carousel motion
  const {
    liveFocusRef,
    carouselGeomRef,
    gestureCommitRef,
    hasMovedRef,
    isDraggingRef,
    moveCarouselTo
  } = useCarouselMotion({
    items,
    view,
    focusIndex,
    onFocusChange,
    selectedIds,
    theme,
    accent,
    motionMultiplier,
    stageRef,
    wrapRef,
    cardRefs
  });

  // Card click dispatcher
  const handleCardClick = (item: MediaItem, e: React.MouseEvent) => {
    if (hasMovedRef.current || isDraggingRef.current) return;

    if (e.metaKey || e.ctrlKey || e.shiftKey) {
      onToggleSelect(item.id, e);
      return;
    }

    const idx = items.findIndex((x) => x.id === item.id);
    if (idx >= 0) {
      if (isCarousel) {
        moveCarouselTo(idx);
        gestureCommitRef.current = true;
      }
      onFocusChange(idx);
    }

    onSelectMedia(item);
  };

  // GSAP Layout Orchestration (Grid & Carousel placement)
  useEffect(() => {
    const st = stageRef.current;
    const wr = wrapRef.current;
    if (!st || !wr || view === 'list') return;

    const displayH = wr.clientHeight || 800;
    const m = motionMultiplier;
    const focus = Math.max(0, Math.min(items.length - 1, liveFocusRef.current));

    if (view === 'grid') {
      wr.style.overflowY = 'auto';
      // Dynamically calculate responsive columns based on container width
      let cols: number = density;
      if (stageWidth < 640) cols = 2;
      else if (stageWidth < 900) cols = 3;
      else if (stageWidth < 1200) cols = Math.min(density, 4);
      else if (stageWidth < 1600) cols = Math.min(density, 5);
      else cols = density;

      const gap = 20;
      const cw = Math.max(150, Math.floor((stageWidth - gap * (cols - 1)) / cols));
      const ch = Math.round(cw * 0.75 + 130);

      items.forEach((item, i) => {
        const el = cardRefs.current.get(item.id);
        if (!el) return;
        const r = Math.floor(i / cols);
        const c = i % cols;
        const tx = c * (cw + gap);
        const ty = r * (ch + gap);

        el.style.width = `${cw}px`;
        el.style.height = `${ch}px`;
        el.style.zIndex = '10';

        gsap.to(el, {
          x: tx,
          y: ty,
          z: 0,
          rotateY: 0,
          rotateX: 0,
          rotateZ: 0,
          scale: selectedIds[item.id] ? 0.94 : 1,
          opacity: 1,
          duration: 0.65 * m,
          ease: 'expo.out',
          overwrite: true
        });
      });

      const totalHeight = Math.ceil(items.length / cols) * (ch + gap) + 40;
      st.style.height = `${totalHeight}px`;

      // IntersectionObserver Staggered Scroll for Grid
      if (ioRef.current) ioRef.current.disconnect();
      ioRef.current = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            const revealEl = entry.target.querySelector('[data-reveal]') as HTMLElement;
            if (!revealEl) return;
            if (entry.isIntersecting) {
              gsap.to(revealEl, {
                opacity: 1,
                y: 0,
                rotateX: 0,
                duration: 0.55 * m,
                ease: 'power3.out',
                overwrite: true
              });
            } else {
              gsap.to(revealEl, {
                opacity: 0.15,
                y: 20,
                rotateX: -6,
                duration: 0.4 * m,
                ease: 'power2.in',
                overwrite: true
              });
            }
          });
        },
        { root: wr, rootMargin: '16% 0px 16% 0px', threshold: 0.01 }
      );

      cardRefs.current.forEach((el) => ioRef.current?.observe(el));
    } else {
      // 3D Carousel views
      wr.style.overflow = 'hidden';
      const cw2 = Math.min(320, Math.max(220, stageWidth * 0.23));
      const ch2 = Math.round(cw2 * 1.3);
      const cx = stageWidth / 2 - cw2 / 2;
      const cy = Math.max(10, (displayH - ch2) / 2);
      const geom = { cx, cy, cw2, ch2 };
      carouselGeomRef.current = geom;

      st.style.height = `${displayH}px`;

      items.forEach((item, i) => {
        const el = cardRefs.current.get(item.id);
        if (!el) return;
        const t = computeCarouselTarget(view, i, focus, geom);

        el.style.width = `${t.w}px`;
        el.style.height = `${t.h}px`;
        el.style.zIndex = String(t.zi);
        el.style.pointerEvents = t.o === 0 ? 'none' : 'auto';

        gsap.to(el, {
          x: t.x,
          y: t.y,
          z: t.z,
          rotateY: t.rY,
          rotateX: t.rX,
          rotateZ: t.rZ,
          scale: t.s * (selectedIds[item.id] ? 0.94 : 1),
          opacity: t.o,
          duration: 0.72 * m,
          ease: view === 'strip' ? 'elastic.out(0.55, 0.72)' : 'expo.out',
          overwrite: true
        });
      });
    }
  }, [items, view, density, stageWidth, motionMultiplier, selectedIds]);

  return (
    <div ref={rootRef} className="relative flex-1 min-h-0 flex flex-col overflow-hidden">
      {/* 3D Directional Catalog Backdrop Watermark */}
      {isCarousel && (
        <StageWatermark
          items={items}
          focusIndex={focusIndex}
          view={view}
          theme={theme}
          motionMultiplier={motionMultiplier}
        />
      )}

      {/* Main Scroll / Viewport Wrapper */}
      <div
        ref={wrapRef}
        className={`relative z-10 flex-1 min-h-0 px-4 md:px-6 custom-scrollbar ${
          view === 'list' || view === 'grid' ? 'overflow-y-auto' : 'overflow-hidden'
        }`}
      >
        {view === 'list' ? (
          <MediaListView
            items={items}
            theme={theme}
            accent={accent}
            stars={stars}
            onToggleStar={onToggleStar}
            onSelect={onSelectMedia}
            onPlay={onPlayMedia}
            onInfo={onInfoMedia}
            columns={listColumns}
            order={listOrder}
          />
        ) : (
          <div
            ref={stageRef}
            className="relative w-full select-none"
            style={{
              perspective: '1200px',
              perspectiveOrigin: view === 'filmstrip' ? '33% 50%' : '50% 50%'
            }}
          >
            {items.map((item, idx) => (
              <MediaCard
                key={item.id}
                item={item}
                index={idx}
                focusIndex={focusIndex}
                isSelected={!!selectedIds[item.id]}
                isStarred={!!stars[item.id]}
                isCarousel={isCarousel}
                theme={theme}
                accent={accent}
                onSelect={handleCardClick}
                onToggleStar={onToggleStar}
                onPlay={onPlayMedia}
                onInfo={onInfoMedia}
                cardRefCallback={(el) => {
                  if (el) cardRefs.current.set(item.id, el);
                  else cardRefs.current.delete(item.id);
                }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
