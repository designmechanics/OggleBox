import gsap from 'gsap';
import type { ViewMode } from '../types/mediaMotion';

export function executeViewTransition(
  _newView: ViewMode,
  motionMultiplier: number = 1,
  onCommitSwitch: () => void
) {
  const cards = Array.from(document.querySelectorAll('[data-card]')) as HTMLElement[];
  const activeCards = cards.filter((c) => c.style.pointerEvents !== 'none');
  const rows = Array.from(document.querySelectorAll('[data-row]')) as HTMLElement[];

  if (rows.length > 0) {
    gsap.to(rows, {
      x: 26,
      opacity: 0,
      duration: 0.24 * motionMultiplier,
      stagger: 0.008,
      ease: 'power2.in'
    });
  }

  if (activeCards.length > 0) {
    gsap.to(activeCards, {
      y: '+=54',
      opacity: 0,
      rotateX: -14,
      scale: 0.9,
      duration: 0.3 * motionMultiplier,
      stagger: { each: 0.011 * motionMultiplier, from: 'center' },
      ease: 'power2.in',
      onComplete: onCommitSwitch
    });
  } else {
    onCommitSwitch();
  }
}
