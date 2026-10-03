import type { PrimaryColorKey, ThemeMode } from '../types';

export interface AccentThemeConfig {
  primary: string;
  hoverGlow: string;
  focusHalo: string;
  badgeBg: string;
  badgeBorder: string;
  badgeText: string;
}

export const ACCENT_PALETTES: Record<PrimaryColorKey, { dark: AccentThemeConfig; light: AccentThemeConfig }> = {
  cyan: {
    dark: {
      primary: '#06b6d4',
      hoverGlow: '0 20px 48px rgba(6, 182, 212, 0.45)',
      focusHalo: '0 0 24px rgba(6, 182, 212, 0.5)',
      badgeBg: 'rgba(6, 182, 212, 0.15)',
      badgeBorder: 'rgba(6, 182, 212, 0.35)',
      badgeText: '#22d3ee'
    },
    light: {
      primary: '#0891b2',
      hoverGlow: '0 16px 36px rgba(8, 145, 178, 0.25)',
      focusHalo: '0 0 20px rgba(8, 145, 178, 0.3)',
      badgeBg: 'rgba(8, 145, 178, 0.12)',
      badgeBorder: 'rgba(8, 145, 178, 0.3)',
      badgeText: '#0e7490'
    }
  },
  pink: {
    dark: {
      primary: '#ec4899',
      hoverGlow: '0 20px 48px rgba(236, 72, 153, 0.45)',
      focusHalo: '0 0 24px rgba(236, 72, 153, 0.5)',
      badgeBg: 'rgba(236, 72, 153, 0.15)',
      badgeBorder: 'rgba(236, 72, 153, 0.35)',
      badgeText: '#f472b6'
    },
    light: {
      primary: '#db2777',
      hoverGlow: '0 16px 36px rgba(219, 39, 119, 0.25)',
      focusHalo: '0 0 20px rgba(219, 39, 119, 0.3)',
      badgeBg: 'rgba(219, 39, 119, 0.12)',
      badgeBorder: 'rgba(219, 39, 119, 0.3)',
      badgeText: '#be185d'
    }
  },
  emerald: {
    dark: {
      primary: '#10b981',
      hoverGlow: '0 20px 48px rgba(16, 185, 129, 0.45)',
      focusHalo: '0 0 24px rgba(16, 185, 129, 0.5)',
      badgeBg: 'rgba(16, 185, 129, 0.15)',
      badgeBorder: 'rgba(16, 185, 129, 0.35)',
      badgeText: '#34d399'
    },
    light: {
      primary: '#059669',
      hoverGlow: '0 16px 36px rgba(5, 150, 105, 0.25)',
      focusHalo: '0 0 20px rgba(5, 150, 105, 0.3)',
      badgeBg: 'rgba(5, 150, 105, 0.12)',
      badgeBorder: 'rgba(5, 150, 105, 0.3)',
      badgeText: '#047857'
    }
  },
  amber: {
    dark: {
      primary: '#f59e0b',
      hoverGlow: '0 20px 48px rgba(245, 158, 11, 0.45)',
      focusHalo: '0 0 24px rgba(245, 158, 11, 0.5)',
      badgeBg: 'rgba(245, 158, 11, 0.15)',
      badgeBorder: 'rgba(245, 158, 11, 0.35)',
      badgeText: '#fbbf24'
    },
    light: {
      primary: '#d97706',
      hoverGlow: '0 16px 36px rgba(217, 119, 6, 0.25)',
      focusHalo: '0 0 20px rgba(217, 119, 6, 0.3)',
      badgeBg: 'rgba(217, 119, 6, 0.12)',
      badgeBorder: 'rgba(217, 119, 6, 0.3)',
      badgeText: '#b45309'
    }
  }
};
