import React, { useRef, useEffect, useState } from 'react';
import gsap from 'gsap';
import type { MediaItem, ThemeMode } from '../../types';
import type { ViewMode } from '../../types/mediaMotion';

interface StageWatermarkProps {
  items: MediaItem[];
  focusIndex: number;
  view: ViewMode;
  theme: ThemeMode;
  motionMultiplier?: number;
}

export const StageWatermark: React.FC<StageWatermarkProps> = React.memo(({
  items,
  focusIndex,
  view,
  theme,
  motionMultiplier = 1
}) => {
  const isLight = theme === 'light';
  const prevFocusRef = useRef(focusIndex);
  const lastDirRef = useRef<number>(1);
  const currentRef = useRef<HTMLDivElement>(null);
  const exitRef = useRef<HTMLDivElement>(null);

  const activeItem = items[focusIndex] || items[0];
  const watermarkText = activeItem?.title?.trim().charAt(0).toUpperCase() || '';

  const [state, setState] = useState<{
    current: string;
    exiting: string | null;
    dir: number;
    animKey: number;
  }>({
    current: watermarkText,
    exiting: null,
    dir: 1,
    animKey: 0
  });

  useEffect(() => {
    if (focusIndex > prevFocusRef.current) lastDirRef.current = 1;
    else if (focusIndex < prevFocusRef.current) lastDirRef.current = -1;
    prevFocusRef.current = focusIndex;
  }, [focusIndex]);

  useEffect(() => {
    if (watermarkText === state.current) return;
    setState((prev) => ({
      current: watermarkText,
      exiting: prev.current,
      dir: lastDirRef.current,
      animKey: prev.animKey + 1
    }));
  }, [watermarkText, state.current]);

  // Directional GSAP Perspective Choreography
  useEffect(() => {
    if (!state.animKey) return;
    const curEl = currentRef.current;
    const exEl = exitRef.current;
    const m = motionMultiplier;
    const dir = state.dir;

    if (exEl && state.exiting) {
      if (view === 'coverflow') {
        gsap.fromTo(exEl, { opacity: 1, x: 0, rotateY: 0 }, {
          opacity: 0,
          x: -dir * 160,
          rotateY: dir * 42,
          duration: 0.44 * m,
          ease: 'power3.inOut'
        });
      } else if (view === 'filmstrip') {
        gsap.fromTo(exEl, { opacity: 1, y: 0, rotateX: 0 }, {
          opacity: 0,
          y: -dir * 130,
          rotateX: dir * 32,
          duration: 0.44 * m,
          ease: 'power3.inOut'
        });
      } else {
        gsap.fromTo(exEl, { opacity: 1, scale: 1 }, {
          opacity: 0,
          scale: 0.92,
          duration: 0.4 * m,
          ease: 'power3.inOut'
        });
      }
    }

    if (curEl && state.current) {
      if (view === 'coverflow') {
        gsap.fromTo(curEl, { opacity: 0, x: dir * 160, rotateY: -dir * 42 }, {
          opacity: 1,
          x: 0,
          rotateY: 0,
          duration: 0.52 * m,
          ease: 'power3.out'
        });
      } else if (view === 'filmstrip') {
        gsap.fromTo(curEl, { opacity: 0, y: dir * 130, rotateX: -dir * 32 }, {
          opacity: 1,
          y: 0,
          rotateX: 0,
          duration: 0.52 * m,
          ease: 'power3.out'
        });
      } else {
        gsap.fromTo(curEl, { opacity: 0, scale: 0.94 }, {
          opacity: 1,
          scale: 1,
          duration: 0.5 * m,
          ease: 'power3.out'
        });
      }
    }
  }, [state.animKey, motionMultiplier, view]);

  if (!state.current && !state.exiting) return null;

  return (
    <div aria-hidden="true" className="absolute inset-0 pointer-events-none overflow-hidden flex items-center justify-center z-0">
      {state.exiting && (
        <div
          ref={exitRef}
          key={`exit-${state.animKey}`}
          className="absolute font-title font-black text-[60vh] leading-none select-none"
          style={{
            color: isLight ? 'rgba(15, 23, 42, 0.04)' : 'rgba(255, 255, 255, 0.035)',
            transformStyle: 'preserve-3d'
          }}
        >
          {state.exiting}
        </div>
      )}
      {state.current && (
        <div
          ref={currentRef}
          key={`current-${state.animKey}`}
          className="absolute font-title font-black text-[60vh] leading-none select-none"
          style={{
            color: isLight ? 'rgba(15, 23, 42, 0.04)' : 'rgba(255, 255, 255, 0.035)',
            transformStyle: 'preserve-3d'
          }}
        >
          {state.current}
        </div>
      )}
    </div>
  );
});
