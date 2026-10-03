import React, { useRef, useEffect, useCallback } from 'react';
import gsap from 'gsap';
import type { ViewMode, CarouselGeometry } from '../types/mediaMotion';
import type { MediaItem, PrimaryColorKey, ThemeMode } from '../types';
import { computeCarouselTarget, getCardDepthStyling, CAROUSEL_WINDOW } from './motionMath';

interface UseCarouselMotionProps {
  items: MediaItem[];
  view: ViewMode;
  focusIndex: number;
  onFocusChange: (newFocus: number) => void;
  selectedIds: Record<string, boolean>;
  theme: ThemeMode;
  accent: PrimaryColorKey;
  motionMultiplier?: number;
  stageRef: React.RefObject<HTMLDivElement | null>;
  wrapRef: React.RefObject<HTMLDivElement | null>;
  cardRefs: React.MutableRefObject<Map<string, HTMLDivElement>>;
}

export function useCarouselMotion({
  items,
  view,
  focusIndex,
  onFocusChange,
  selectedIds,
  theme,
  accent,
  motionMultiplier = 1,
  stageRef,
  wrapRef,
  cardRefs
}: UseCarouselMotionProps) {
  const isCarousel = ['coverflow', 'strip', 'radial', 'filmstrip', 'peel'].includes(view);

  const liveFocusRef = useRef(focusIndex);
  const commitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const gestureCommitRef = useRef(false);
  const carouselGeomRef = useRef<CarouselGeometry | null>(null);

  const isPointerDownRef = useRef(false);
  const isDraggingRef = useRef(false);
  const hasMovedRef = useRef(false);
  const dragStartXRef = useRef(0);
  const dragStartYRef = useRef(0);
  const dragStartFocusRef = useRef(0);
  const capturedPointerIdRef = useRef<number | null>(null);

  const wheelAccRef = useRef(0);
  const lastWheelTimeRef = useRef(0);
  const isWheelingRef = useRef(false);
  const wheelTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Live state refs to keep event listeners stable
  const itemsRef = useRef(items);
  itemsRef.current = items;
  const viewRef = useRef(view);
  viewRef.current = view;
  const selectedIdsRef = useRef(selectedIds);
  selectedIdsRef.current = selectedIds;
  const focusIndexRef = useRef(focusIndex);
  focusIndexRef.current = focusIndex;
  const onFocusChangeRef = useRef(onFocusChange);
  onFocusChangeRef.current = onFocusChange;
  const multiplierRef = useRef(motionMultiplier);
  multiplierRef.current = motionMultiplier;
  const themeRef = useRef(theme);
  themeRef.current = theme;
  const accentRef = useRef(accent);
  accentRef.current = accent;

  // Imperative Driver: Tweens cards in CAROUSEL_WINDOW directly
  const moveCarouselTo = useCallback((target: number) => {
    const list = itemsRef.current;
    const maxIdx = list.length - 1;
    const geom = carouselGeomRef.current;
    if (maxIdx < 0 || !geom) return;

    const prev = Math.max(0, Math.min(maxIdx, liveFocusRef.current));
    const next = Math.max(0, Math.min(maxIdx, target));
    if (next === prev) return;
    liveFocusRef.current = next;

    const v = viewRef.current;
    const m = multiplierRef.current;
    const sel = selectedIdsRef.current;
    const th = themeRef.current;
    const ac = accentRef.current;

    const lo = Math.max(0, Math.min(prev, next) - CAROUSEL_WINDOW);
    const hi = Math.min(maxIdx, Math.max(prev, next) + CAROUSEL_WINDOW);

    for (let i = lo; i <= hi; i++) {
      const item = list[i];
      if (!item) continue;
      const el = cardRefs.current.get(item.id);
      if (!el) continue;

      const isSel = !!sel[item.id];
      const selScale = isSel ? 0.94 : 1;

      // Card entering from beyond the window: place correctly at previous focus first
      if (Math.abs(i - prev) > CAROUSEL_WINDOW) {
        const p = computeCarouselTarget(v, i, prev, geom);
        gsap.set(el, {
          x: p.x,
          y: p.y,
          z: p.z,
          rotateY: p.rY,
          rotateX: p.rX,
          rotateZ: p.rZ,
          scale: p.s * selScale,
          opacity: p.o
        });
      }

      const t = computeCarouselTarget(v, i, next, geom);
      el.style.zIndex = String(t.zi);
      el.style.pointerEvents = t.o === 0 ? 'none' : 'auto';
      el.style.willChange = t.o === 0 ? 'auto' : 'transform, opacity';

      const depth = getCardDepthStyling(Math.abs(i - next), isSel, true, th, ac);
      const inner = el.firstElementChild?.firstElementChild as HTMLElement | null;
      if (inner) {
        if (inner.style.border !== depth.border) inner.style.border = depth.border;
        if (inner.style.boxShadow !== depth.boxShadow) inner.style.boxShadow = depth.boxShadow;
      }

      gsap.to(el, {
        x: t.x,
        y: t.y,
        z: t.z,
        rotateY: t.rY,
        rotateX: t.rX,
        rotateZ: t.rZ,
        scale: t.s * selScale,
        opacity: t.o,
        duration: 0.34 * m,
        ease: 'power3.out',
        overwrite: true
      });
    }
  }, [cardRefs]);

  // Commits focusIndex to React tree after gesture ceases
  const scheduleFocusCommit = useCallback(() => {
    if (commitTimerRef.current) clearTimeout(commitTimerRef.current);
    const delay = Math.max(220, 340 * multiplierRef.current + 60);

    commitTimerRef.current = setTimeout(() => {
      commitTimerRef.current = null;
      const f = liveFocusRef.current;
      if (f !== focusIndexRef.current) {
        gestureCommitRef.current = true;
        onFocusChangeRef.current(f);
      }
    }, delay);
  }, []);

  // Pointer drag gestures
  useEffect(() => {
    const st = stageRef.current;
    if (!st || !isCarousel) return;

    const onPointerDown = (e: PointerEvent) => {
      if (e.button !== 0) return;
      isPointerDownRef.current = true;
      isDraggingRef.current = false;
      hasMovedRef.current = false;
      dragStartXRef.current = e.clientX;
      dragStartYRef.current = e.clientY;
      dragStartFocusRef.current = liveFocusRef.current;
      capturedPointerIdRef.current = null;
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!isPointerDownRef.current || e.buttons === 0) {
        isPointerDownRef.current = false;
        isDraggingRef.current = false;
        return;
      }

      const dx = e.clientX - dragStartXRef.current;
      const dy = e.clientY - dragStartYRef.current;
      const dist = Math.hypot(dx, dy);

      // Deadzone threshold (8px) ensures card click events are preserved
      if (!isDraggingRef.current && dist > 8) {
        isDraggingRef.current = true;
        hasMovedRef.current = true;
        try {
          st.setPointerCapture(e.pointerId);
          capturedPointerIdRef.current = e.pointerId;
        } catch {}
      }

      if (!isDraggingRef.current) return;

      const delta = viewRef.current === 'filmstrip'
        ? (dragStartYRef.current - e.clientY) / 80
        : (dragStartXRef.current - e.clientX) / 100;

      const maxIdx = itemsRef.current.length - 1;
      if (maxIdx <= 0) return;

      const newFocus = Math.max(0, Math.min(maxIdx, Math.round(dragStartFocusRef.current + delta)));
      if (newFocus !== liveFocusRef.current) {
        moveCarouselTo(newFocus);
        scheduleFocusCommit();
      } else if (commitTimerRef.current) {
        scheduleFocusCommit();
      }
    };

    const onPointerUp = () => {
      if (!isPointerDownRef.current) return;
      isPointerDownRef.current = false;
      if (capturedPointerIdRef.current !== null) {
        try {
          st.releasePointerCapture(capturedPointerIdRef.current);
        } catch {}
        capturedPointerIdRef.current = null;
      }
      isDraggingRef.current = false;
      setTimeout(() => {
        hasMovedRef.current = false;
      }, 100);
    };

    st.addEventListener('pointerdown', onPointerDown);
    st.addEventListener('pointermove', onPointerMove);
    st.addEventListener('pointerup', onPointerUp);
    st.addEventListener('pointercancel', onPointerUp);
    window.addEventListener('pointerup', onPointerUp);

    return () => {
      st.removeEventListener('pointerdown', onPointerDown);
      st.removeEventListener('pointermove', onPointerMove);
      st.removeEventListener('pointerup', onPointerUp);
      st.removeEventListener('pointercancel', onPointerUp);
      window.removeEventListener('pointerup', onPointerUp);
    };
  }, [isCarousel, moveCarouselTo, scheduleFocusCommit, stageRef]);

  // Normalized Wheel Gestures (DeltaMode Line & Page scaling, notch accumulator)
  useEffect(() => {
    const wr = wrapRef.current;
    if (!wr || !isCarousel) return;

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();

      isWheelingRef.current = true;
      if (wheelTimeoutRef.current) clearTimeout(wheelTimeoutRef.current);
      wheelTimeoutRef.current = setTimeout(() => {
        isWheelingRef.current = false;
      }, 150);

      let dx = e.deltaX;
      let dy = e.deltaY;
      if (e.deltaMode === 1) {
        dx *= 33;
        dy *= 33;
      } else if (e.deltaMode === 2) {
        dx *= 100;
        dy *= 100;
      }

      const delta = Math.abs(dx) > Math.abs(dy) ? dx : dy;
      if (!delta) return;

      const now = performance.now();
      const fresh = now - lastWheelTimeRef.current > 220 || Math.sign(delta) !== Math.sign(wheelAccRef.current || delta);
      if (fresh) wheelAccRef.current = 0;
      lastWheelTimeRef.current = now;

      const isNotch = Math.abs(delta) >= 50;
      const unit = isNotch ? 100 : 40;
      wheelAccRef.current = (wheelAccRef.current || 0) + delta;

      let steps = Math.trunc(wheelAccRef.current / unit);
      if (steps === 0 && fresh && isNotch) steps = Math.sign(delta);
      wheelAccRef.current -= steps * unit;
      if (Math.sign(wheelAccRef.current) === -Math.sign(delta)) wheelAccRef.current = 0;
      steps = Math.max(-6, Math.min(6, steps));

      if (!steps) {
        if (commitTimerRef.current) scheduleFocusCommit();
        return;
      }

      moveCarouselTo(liveFocusRef.current + steps);
      scheduleFocusCommit();
    };

    // Keyboard Arrow Interception (flushes pending commits in capture phase)
    const onKeyDownCapture = () => {
      if (!commitTimerRef.current) return;
      clearTimeout(commitTimerRef.current);
      commitTimerRef.current = null;
      if (liveFocusRef.current !== focusIndexRef.current) {
        onFocusChangeRef.current(liveFocusRef.current);
      }
    };

    wr.addEventListener('wheel', onWheel, { passive: false });
    window.addEventListener('keydown', onKeyDownCapture, true);

    return () => {
      wr.removeEventListener('wheel', onWheel);
      window.removeEventListener('keydown', onKeyDownCapture, true);
    };
  }, [isCarousel, moveCarouselTo, scheduleFocusCommit, wrapRef]);

  return {
    liveFocusRef,
    carouselGeomRef,
    gestureCommitRef,
    moveCarouselTo,
    hasMovedRef,
    isDraggingRef,
    isWheelingRef
  };
}
