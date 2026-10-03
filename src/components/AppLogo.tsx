import React, { useRef, useEffect, useId } from 'react';
import gsap from 'gsap';
import type { PrimaryColorKey, ThemeMode } from '../types';
import { ACCENT_PALETTES } from '../utils/themeTokens';

interface AppLogoProps {
  theme: ThemeMode;
  accent: PrimaryColorKey;
  size?: number;
  className?: string;
  onClick?: () => void;
}

interface AccentGradients {
  primary: string;
  light: string;
  dark: string;
  secondary: string;
}

const ACCENT_COLOR_MAP: Record<PrimaryColorKey, { dark: AccentGradients; light: AccentGradients }> = {
  cyan: {
    dark: {
      primary: '#06b6d4',
      light: '#67e8f9',
      dark: '#083344',
      secondary: '#3b82f6'
    },
    light: {
      primary: '#0891b2',
      light: '#22d3ee',
      dark: '#155e75',
      secondary: '#2563eb'
    }
  },
  pink: {
    dark: {
      primary: '#ec4899',
      light: '#f472b6',
      dark: '#500724',
      secondary: '#f43f5e'
    },
    light: {
      primary: '#db2777',
      light: '#f472b6',
      dark: '#831843',
      secondary: '#e11d48'
    }
  },
  emerald: {
    dark: {
      primary: '#10b981',
      light: '#6ee7b7',
      dark: '#022c22',
      secondary: '#14b8a6'
    },
    light: {
      primary: '#059669',
      light: '#34d399',
      dark: '#064e3b',
      secondary: '#0d9488'
    }
  },
  amber: {
    dark: {
      primary: '#f59e0b',
      light: '#fde68a',
      dark: '#451a03',
      secondary: '#ea580c'
    },
    light: {
      primary: '#d97706',
      light: '#fbbf24',
      dark: '#78350f',
      secondary: '#c2410c'
    }
  }
};

export const AppLogo: React.FC<AppLogoProps> = ({
  theme,
  accent,
  size = 40,
  className = '',
  onClick
}) => {
  const isLight = theme === 'light';
  const palette = ACCENT_PALETTES[accent]?.[theme] || ACCENT_PALETTES.cyan[theme];
  const colors = ACCENT_COLOR_MAP[accent]?.[theme] || ACCENT_COLOR_MAP.cyan[theme];

  const rawId = useId();
  const id = rawId.replace(/[^a-zA-Z0-9_-]/g, '_');

  // Element Refs for GSAP
  const containerRef = useRef<HTMLDivElement>(null);
  const orbitGroupRef = useRef<SVGGElement>(null);
  const irisGroupRef = useRef<SVGGElement>(null);
  const prismGroupRef = useRef<SVGGElement>(null);
  const shimmerRef = useRef<SVGRectElement>(null);
  const auraRef = useRef<SVGRectElement>(null);
  const rippleRef = useRef<SVGCircleElement>(null);

  // Animation Tween References
  const orbitTweenRef = useRef<gsap.core.Tween | null>(null);
  const irisTweenRef = useRef<gsap.core.Tween | null>(null);

  // Unique SVG element IDs
  const glowGradId = `logo-glow-${id}`;
  const chassisGradId = `logo-chassis-${id}`;
  const borderGradId = `logo-border-${id}`;
  const orbitGradId = `logo-orbit-${id}`;
  const shimmerGradId = `logo-shimmer-${id}`;
  const facetTopGradId = `logo-top-facet-${id}`;
  const facetBotGradId = `logo-bot-facet-${id}`;
  const facetLeftGradId = `logo-left-facet-${id}`;
  const prismClipId = `logo-prism-clip-${id}`;
  const blurFilterId = `logo-blur-${id}`;
  const beaconGlowId = `logo-beacon-glow-${id}`;

  useEffect(() => {
    const ctx = gsap.context(() => {
      // 1. Orbital Comet Beacon Continuous 360 Spin
      if (orbitGroupRef.current) {
        orbitTweenRef.current = gsap.to(orbitGroupRef.current, {
          rotation: 360,
          transformOrigin: '60px 60px',
          duration: 4.8,
          repeat: -1,
          ease: 'none'
        });
      }

      // 2. Iris Aperture Ring Counter-Spin
      if (irisGroupRef.current) {
        irisTweenRef.current = gsap.to(irisGroupRef.current, {
          rotation: -360,
          transformOrigin: '60px 60px',
          duration: 14,
          repeat: -1,
          ease: 'none'
        });
      }

      // 3. Ambient Aura Breathing Pulse
      if (auraRef.current) {
        gsap.to(auraRef.current, {
          scale: 1.15,
          opacity: isLight ? 0.45 : 0.65,
          transformOrigin: '60px 60px',
          duration: 2.4,
          repeat: -1,
          yoyo: true,
          ease: 'sine.inOut'
        });
      }

      // 4. Harmonic Float / Micro-Bobbing on Play Prism
      if (prismGroupRef.current) {
        gsap.to(prismGroupRef.current, {
          y: -1.5,
          scale: 1.03,
          transformOrigin: '60px 60px',
          duration: 2.1,
          repeat: -1,
          yoyo: true,
          ease: 'sine.inOut'
        });
      }

      // 5. Periodic Prismatic Specular Shimmer Sweep
      if (shimmerRef.current) {
        gsap.timeline({ repeat: -1, repeatDelay: 3.0 })
          .fromTo(
            shimmerRef.current,
            { x: -55, opacity: 0 },
            { x: 55, opacity: 0.9, duration: 0.85, ease: 'power2.inOut' }
          )
          .to(shimmerRef.current, { opacity: 0, duration: 0.2 });
      }
    }, containerRef);

    return () => ctx.revert();
  }, [theme, accent, isLight]);

  // Interactive Hover Choreography
  const handleMouseEnter = () => {
    if (!containerRef.current) return;
    gsap.to(containerRef.current, {
      scale: 1.08,
      duration: 0.35,
      ease: 'back.out(2.2)',
      overwrite: 'auto'
    });

    // Accelerate orbital energy
    orbitTweenRef.current?.timeScale(2.6);
    irisTweenRef.current?.timeScale(2.6);

    if (prismGroupRef.current) {
      gsap.to(prismGroupRef.current, {
        scale: 1.12,
        duration: 0.3,
        ease: 'power2.out',
        overwrite: 'auto'
      });
    }
  };

  const handleMouseLeave = () => {
    if (!containerRef.current) return;
    gsap.to(containerRef.current, {
      scale: 1.0,
      duration: 0.4,
      ease: 'power2.out',
      overwrite: 'auto'
    });

    // Restore ambient pace
    orbitTweenRef.current?.timeScale(1.0);
    irisTweenRef.current?.timeScale(1.0);

    if (prismGroupRef.current) {
      gsap.to(prismGroupRef.current, {
        scale: 1.0,
        duration: 0.4,
        ease: 'power2.out',
        overwrite: 'auto'
      });
    }
  };

  // Interactive Click / Tap Reaction (Elastic shockwave & snap spin)
  const handleClick = (e: React.MouseEvent) => {
    if (onClick) onClick();

    // Trigger radiating optical shockwave
    if (rippleRef.current) {
      gsap.fromTo(
        rippleRef.current,
        { r: 16, opacity: 0.95, strokeWidth: 3 },
        { r: 56, opacity: 0, strokeWidth: 0.5, duration: 0.65, ease: 'power2.out' }
      );
    }

    // Elastic recoil bounce
    if (containerRef.current) {
      gsap.timeline()
        .to(containerRef.current, { scale: 0.88, duration: 0.1, ease: 'power2.in' })
        .to(containerRef.current, { scale: 1.08, duration: 0.55, ease: 'elastic.out(1.2, 0.35)' });
    }

    // Play prism celebratory 360-spin
    if (prismGroupRef.current) {
      gsap.fromTo(
        prismGroupRef.current,
        { rotate: 0 },
        { rotate: 360, transformOrigin: '60px 60px', duration: 0.75, ease: 'back.out(1.8)' }
      );
    }
  };

  return (
    <div
      ref={containerRef}
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={`relative inline-flex items-center justify-center select-none cursor-pointer ${className}`}
      style={{
        width: `${size}px`,
        height: `${size}px`,
        filter: isLight
          ? `drop-shadow(0 4px 12px ${colors.primary}33)`
          : `drop-shadow(0 4px 16px ${colors.primary}55)`
      }}
      title="OggleBox Cinema Core"
      role="img"
      aria-label="OggleBox Animated Logo"
    >
      <svg
        viewBox="0 0 120 120"
        className="w-full h-full overflow-visible"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          {/* Blur filter for glowing aura */}
          <filter id={blurFilterId} x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="9" result="blur" />
          </filter>

          {/* Beacon Glow */}
          <filter id={beaconGlowId} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="2.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Aura Gradient */}
          <radialGradient id={glowGradId} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={colors.primary} stopOpacity={isLight ? 0.7 : 0.85} />
            <stop offset="65%" stopColor={colors.secondary} stopOpacity={isLight ? 0.25 : 0.4} />
            <stop offset="100%" stopColor={colors.primary} stopOpacity="0" />
          </radialGradient>

          {/* Chassis Body Gradient */}
          <linearGradient id={chassisGradId} x1="20" y1="20" x2="100" y2="100" gradientUnits="userSpaceOnUse">
            {isLight ? (
              <>
                <stop offset="0%" stopColor="#ffffff" stopOpacity="0.98" />
                <stop offset="50%" stopColor="#f8fafc" stopOpacity="0.95" />
                <stop offset="100%" stopColor="#e2e8f0" stopOpacity="0.92" />
              </>
            ) : (
              <>
                <stop offset="0%" stopColor="#0f172a" stopOpacity="0.95" />
                <stop offset="45%" stopColor="#090d16" stopOpacity="0.98" />
                <stop offset="100%" stopColor="#020617" stopOpacity="1" />
              </>
            )}
          </linearGradient>

          {/* Chassis Neon Border Gradient */}
          <linearGradient id={borderGradId} x1="20" y1="20" x2="100" y2="100" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor={colors.light} stopOpacity="0.9" />
            <stop offset="40%" stopColor={colors.primary} stopOpacity="0.7" />
            <stop offset="100%" stopColor={colors.secondary} stopOpacity="0.3" />
          </linearGradient>

          {/* Orbital Arc Gradient */}
          <linearGradient id={orbitGradId} x1="20" y1="20" x2="100" y2="100" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor={colors.light} stopOpacity="1" />
            <stop offset="50%" stopColor={colors.primary} stopOpacity="0.5" />
            <stop offset="100%" stopColor={colors.primary} stopOpacity="0" />
          </linearGradient>

          {/* Facet 1: Top Bevel Gradient (Specular Bright) */}
          <linearGradient id={facetTopGradId} x1="47" y1="43" x2="77" y2="60" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.95" />
            <stop offset="45%" stopColor={colors.light} stopOpacity="0.9" />
            <stop offset="100%" stopColor={colors.primary} stopOpacity="0.85" />
          </linearGradient>

          {/* Facet 2: Bottom Bevel Gradient (Deep Optical Shadow) */}
          <linearGradient id={facetBotGradId} x1="47" y1="77" x2="77" y2="60" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor={colors.secondary} stopOpacity="0.9" />
            <stop offset="60%" stopColor={colors.primary} stopOpacity="0.85" />
            <stop offset="100%" stopColor={colors.dark} stopOpacity="0.95" />
          </linearGradient>

          {/* Facet 3: Left Spine Gradient */}
          <linearGradient id={facetLeftGradId} x1="47" y1="43" x2="57" y2="60" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor={colors.light} stopOpacity="0.85" />
            <stop offset="100%" stopColor={colors.primary} stopOpacity="0.95" />
          </linearGradient>

          {/* Shimmer Specular Light Beam */}
          <linearGradient id={shimmerGradId} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0" />
            <stop offset="50%" stopColor="#ffffff" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
          </linearGradient>

          {/* Play Prism Clip Path for Shimmer */}
          <clipPath id={prismClipId}>
            <polygon points="47,42 79,60 47,78" />
          </clipPath>
        </defs>

        {/* 1. Pulsing Ambient Aura Bloom */}
        <rect
          ref={auraRef}
          x="16"
          y="16"
          width="88"
          height="88"
          rx="26"
          fill={`url(#${glowGradId})`}
          filter={`url(#${blurFilterId})`}
          opacity={isLight ? 0.35 : 0.55}
        />

        {/* 2. Interactive Shockwave Ripple Ring */}
        <circle
          ref={rippleRef}
          cx="60"
          cy="60"
          r="16"
          fill="none"
          stroke={colors.light}
          strokeWidth="3"
          opacity="0"
        />

        {/* 3. The "OggleBox" Cinema Chassis Box */}
        <g>
          {/* Chassis Background */}
          <rect
            x="22"
            y="22"
            width="76"
            height="76"
            rx="22"
            fill={`url(#${chassisGradId})`}
            stroke={`url(#${borderGradId})`}
            strokeWidth="2"
          />

          {/* Subtle Inner Glass Bevel Stroke */}
          <rect
            x="24"
            y="24"
            width="72"
            height="72"
            rx="20"
            fill="none"
            stroke={isLight ? 'rgba(255, 255, 255, 0.7)' : 'rgba(255, 255, 255, 0.08)'}
            strokeWidth="1"
          />
        </g>

        {/* 4. Viewfinder / Camera Reticle Corner Brackets */}
        <g stroke={isLight ? 'rgba(15, 23, 42, 0.22)' : 'rgba(255, 255, 255, 0.25)'} strokeWidth="1.5" strokeLinecap="round">
          {/* Top-Left */}
          <path d="M 33 39 L 33 33 L 39 33" />
          {/* Top-Right */}
          <path d="M 87 39 L 87 33 L 81 33" />
          {/* Bottom-Left */}
          <path d="M 33 81 L 33 87 L 39 87" />
          {/* Bottom-Right */}
          <path d="M 87 81 L 87 87 L 81 87" />
        </g>

        {/* 5. Iris Aperture Reticle Ring (Counter-rotates) */}
        <g ref={irisGroupRef}>
          <circle
            cx="60"
            cy="60"
            r="26"
            fill="none"
            stroke={colors.primary}
            strokeWidth="1"
            strokeDasharray="4 6"
            opacity={isLight ? 0.35 : 0.45}
          />
        </g>

        {/* 6. Orbital Energy Ring & Traveling Beacon (Infinite 360 Spin) */}
        <g ref={orbitGroupRef}>
          {/* Glowing Orbital Trail */}
          <circle
            cx="60"
            cy="60"
            r="44"
            fill="none"
            stroke={`url(#${orbitGradId})`}
            strokeWidth="2"
            strokeDasharray="36 90"
            strokeLinecap="round"
          />
          {/* Traveling Comet Beacon Head */}
          <circle
            cx="104"
            cy="60"
            r="3.2"
            fill="#ffffff"
            filter={`url(#${beaconGlowId})`}
          />
          <circle
            cx="104"
            cy="60"
            r="1.8"
            fill={colors.light}
          />
        </g>

        {/* 7. The Core 3D Faceted Cinema Play Prism */}
        <g ref={prismGroupRef}>
          {/* Drop shadow underneath play prism */}
          <polygon
            points="48,45 80,62 48,79"
            fill={isLight ? 'rgba(0, 0, 0, 0.12)' : 'rgba(0, 0, 0, 0.4)'}
          />

          {/* Facet 1: Top Bevel (Glinting Highlight) */}
          <polygon
            points="47,43 78,60 58,60"
            fill={`url(#${facetTopGradId})`}
          />

          {/* Facet 2: Bottom Bevel (Rich Optical Depth) */}
          <polygon
            points="47,77 78,60 58,60"
            fill={`url(#${facetBotGradId})`}
          />

          {/* Facet 3: Left Spine Bevel */}
          <polygon
            points="47,43 47,77 58,60"
            fill={`url(#${facetLeftGradId})`}
          />

          {/* Facet Seam Strokes for Crystal Precision */}
          <line x1="58" y1="60" x2="78" y2="60" stroke="#ffffff" strokeWidth="0.75" opacity="0.6" />
          <line x1="47" y1="43" x2="58" y2="60" stroke="#ffffff" strokeWidth="0.75" opacity="0.4" />
          <line x1="47" y1="77" x2="58" y2="60" stroke={colors.dark} strokeWidth="0.75" opacity="0.5" />

          {/* Central Optic Iris Core */}
          <circle cx="58" cy="60" r="3.2" fill={isLight ? '#ffffff' : '#020617'} opacity="0.85" />
          <circle cx="58" cy="60" r="1.8" fill={colors.light} />

          {/* Specular Shimmer Sweep Across Prism */}
          <g clipPath={`url(#${prismClipId})`}>
            <rect
              ref={shimmerRef}
              x="30"
              y="35"
              width="24"
              height="50"
              fill={`url(#${shimmerGradId})`}
              transform="rotate(25 60 60)"
              opacity="0"
            />
          </g>
        </g>
      </svg>
    </div>
  );
};

export default AppLogo;
