import type { CardTarget, CarouselGeometry, ViewMode } from '../types/mediaMotion';
import type { PrimaryColorKey, ThemeMode } from '../types';
import { ACCENT_PALETTES } from '../utils/themeTokens';

export const CAROUSEL_WINDOW = 7;

/**
 * Pure 3D Carousel Coordinate Function.
 * Translates item index `i` relative to active focus into x, y, z, rotation and opacity coordinates.
 */
export function computeCarouselTarget(
  view: ViewMode,
  i: number,
  focus: number,
  g: CarouselGeometry
): CardTarget {
  const { cx, cy, cw2, ch2 } = g;
  const d = i - focus;
  const ad = Math.abs(d);

  const t: CardTarget = {
    x: cx,
    y: cy,
    w: cw2,
    h: ch2,
    rY: 0,
    rX: 0,
    rZ: 0,
    z: 0,
    s: 1,
    o: 1,
    zi: 200 - ad * 2
  };

  switch (view) {
    case 'coverflow':
      t.x = cx + d * (cw2 * 0.52);
      t.z = -ad * 190;
      t.rY = -Math.max(-46, Math.min(46, d * 30));
      t.s = 1 - Math.min(ad * 0.06, 0.4);
      t.o = ad > 5 ? 0 : 1;
      t.y = cy + ad * 10;
      break;

    case 'strip':
      t.x = cx + d * (cw2 + 26);
      t.s = d === 0 ? 1.06 : 0.93;
      t.o = ad > 4 ? 0 : 1;
      t.y = cy + (d === 0 ? -10 : 8);
      break;

    case 'radial': {
      const R = 1150;
      const a = d * 0.115;
      t.x = cx + R * Math.sin(a);
      t.y = cy + R * (1 - Math.cos(a)) * 0.9 - 40;
      t.rZ = d * 6.6;
      t.z = -ad * 60;
      t.s = 1 - Math.min(ad * 0.045, 0.35);
      t.o = ad > 6 ? 0 : 1;
      break;
    }

    case 'filmstrip':
      t.y = cy + d * (ch2 * 0.34);
      t.x = cx + ad * 14;
      t.rX = -Math.max(-40, Math.min(40, d * 13));
      t.z = -ad * 120;
      t.s = 1 - Math.min(ad * 0.05, 0.35);
      t.o = ad > 4 ? 0 : 1;
      break;

    case 'peel':
      if (d < 0) {
        const k = Math.min(3, -d);
        t.y = cy - 460;
        t.x = cx - 160 * k;
        t.rZ = -16 * k;
        t.o = 0;
        t.s = 0.9;
      } else {
        t.y = cy + d * 13;
        t.x = cx + d * 5;
        t.s = 1 - d * 0.035;
        t.o = d > 5 ? 0 : 1;
        t.rZ = d * 1.4;
        t.zi = 300 - d;
      }
      break;

    default:
      break;
  }

  return t;
}

/**
 * Computes 3D elevation shadows, borders, and accent halos according to distance from focus.
 */
export function getCardDepthStyling(
  ad: number,
  isSelected: boolean,
  isCarousel: boolean,
  theme: ThemeMode,
  accent: PrimaryColorKey
) {
  const isLight = theme === 'light';
  const palette = ACCENT_PALETTES[accent]?.[theme] || ACCENT_PALETTES.cyan[theme];

  if (!isCarousel) {
    return {
      border: isSelected ? `2px solid ${palette.primary}` : (isLight ? '1px solid rgba(15, 23, 42, 0.08)' : '1px solid rgba(255, 255, 255, 0.12)'),
      borderColor: isSelected ? palette.primary : (isLight ? 'rgba(15, 23, 42, 0.08)' : 'rgba(255, 255, 255, 0.12)'),
      boxShadow: isSelected
        ? `${palette.focusHalo}, 0 8px 24px rgba(0, 0, 0, 0.3)`
        : (isLight ? '0 2px 10px rgba(15, 23, 42, 0.06)' : '0 4px 14px rgba(0, 0, 0, 0.4)')
    };
  }

  let borderColor: string;
  let boxShadow: string;

  if (ad === 0) {
    // Focused Center Card
    borderColor = isSelected ? palette.primary : (isLight ? palette.primary : 'rgba(255, 255, 255, 0.7)');
    boxShadow = isSelected
      ? `0 0 0 2px ${palette.primary}, ${palette.focusHalo}, 0 12px 36px rgba(0, 0, 0, 0.5)`
      : (isLight
        ? `0 8px 28px rgba(0, 0, 0, 0.12), inset 0 1px 0 rgba(255, 255, 255, 0.9), 0 0 18px ${palette.badgeBorder}`
        : `0 10px 32px rgba(0, 0, 0, 0.75), inset 0 1px 0 rgba(255, 255, 255, 0.3), 0 0 22px ${palette.badgeBorder}`);
  } else {
    // Distant / Background Cards
    borderColor = isSelected ? palette.primary : (isLight ? 'rgba(15, 23, 42, 0.08)' : 'rgba(255, 255, 255, 0.14)');
    boxShadow = isSelected
      ? `${palette.focusHalo}, 0 8px 24px rgba(0, 0, 0, 0.4)`
      : (isLight ? '0 4px 16px rgba(15, 23, 42, 0.06)' : '0 10px 28px rgba(0, 0, 0, 0.6)');
  }

  return {
    border: `${isSelected ? 2 : 1}px solid ${borderColor}`,
    borderColor,
    boxShadow
  };
}
