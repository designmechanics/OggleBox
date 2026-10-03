import type { MediaItem, PrimaryColorKey, ThemeMode } from '../types';

export type ViewMode =
  | 'grid'
  | 'list'
  | 'coverflow'
  | 'strip'
  | 'radial'
  | 'filmstrip'
  | 'peel';

export type ListColumns = 1 | 2 | 3 | 4;
export type ListOrder = 'down' | 'across';
export type Density = 2 | 3 | 4 | 5 | 6 | 8;

export interface CardTarget {
  x: number;
  y: number;
  w: number;
  h: number;
  rY: number;
  rX: number;
  rZ: number;
  z: number;
  s: number;
  o: number;
  zi: number;
}

export interface CarouselGeometry {
  cx: number;
  cy: number;
  cw2: number;
  ch2: number;
}
