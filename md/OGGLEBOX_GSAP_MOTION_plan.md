# OggleBox GSAP Motion & Listing Integration Plan

## Executive Summary

This plan outlines the architecture and execution steps for integrating the **GSAP Listing & 3D Motion System** (from `md/OGGLEBOX_GSAP_MOTION_HANDOVER.md`) into **OggleBox Media Server**.

The primary directive is **zero functional regression**:
1. **Preserve splash video & boot sequence**: The 4-second splash video (`/ogglebox.mp4`), fade-out transition, and smooth reveal of the main interface remain completely untouched.
2. **Preserve media actions & business logic**: Video streaming, HEVC/audio codec detection & auto-transcoding, resume playback prompts (watch progress percentage), audio track handling, binary/ISO file cards, and deep metadata modals will work exactly as they do today.
3. **Preserve navigation, sidebar & controls**: Category sidebar, search bar, sort dropdowns (title, size, date, duration), favorites toggle, recent history, torrent engine toggle, and the settings modal (themes & accent colors) will drive the new listing system seamlessly.
4. **Architectural modularity**: Rather than bloating `src/App.tsx` (~980 lines), the motion engine and listing views will be factored into dedicated, clean modules under `src/motion/` and `src/components/media/`.

---

## 1. System Comparison & Gap Analysis

| Feature / Area | Current State in OggleBox (`App.tsx`) | Target Handover State (`OGGLEBOX_GSAP_MOTION_HANDOVER.md`) | Integration Strategy |
| :--- | :--- | :--- | :--- |
| **View Modes** | Only `grid` and `list` (2-column). | `grid`, `list` (1–4 columns), `coverflow`, `strip`, `radial`, `filmstrip`, `peel`. | Add 3D carousel modes to view mode switcher while retaining `grid` and `list` as primary options. |
| **Grid Motion** | Simple `gsap.fromTo` stagger (first 18 cards) on filter/category change. | Staggered reveals + `IntersectionObserver` scroll-driven perspective reveals (`rotateX`, `y`, `opacity`). | Implement `IntersectionObserver` scroll engine in `MediaStage.tsx` for buttery smooth infinite scroll. |
| **Carousel / 3D Motion** | None. | Imperative GSAP driver with windowed culling (`CAROUSEL_WINDOW = 7`), normalized wheel physics, and pointer drag with 8px click deadzone. | Drop in `useCarouselMotion.ts` and `motionMath.ts`. Zero React re-renders during active drag/wheel. |
| **Card Micro-Interactions** | CSS hover scale (`group-hover:scale-105`) and border transition. | 3D depth elevations, `translateY(-3px)`, dynamic hover glow halos matching accent colors (`cyan`, `pink`, `emerald`, `amber`). | Integrate `getCardDepthStyling` and `ACCENT_PALETTES` directly into `MediaCard.tsx`. |
| **Card Functional Elements** | - Watch progress bar (localStorage)<br>- Audio card badge & icon<br>- Binary ISO badge & icon<br>- "File Info" button (`setSelectedDetailMedia`)<br>- Play click -> check resume -> `openPlayer`<br>- Category pill | - Media poster / thumbnail<br>- Format badge<br>- Favorite star button<br>- Quick title copy button<br>- Play overlay button | **Merge both**: Retain ALL OggleBox functional triggers (progress bar, audio/binary variants, resume check, file info button) within the new 3D card layout. |
| **Catalog Backdrop** | Static/darkened background wallpaper. | Directional 3D Typography Watermark (`StageWatermark.tsx`) rotating on X/Y/Z matching the active item. | Layer `StageWatermark` behind cards as a subtle architectural accent without interfering with wallpaper. |
| **View Transitions** | Instant state swap (`viewMode === 'grid' ? ... : ...`). | Staggered 3D tilt exit animation before state commit (`executeViewTransition`). | Wrap view toggle clicks in `executeViewTransition` for seamless morphing. |

---

## 2. Target File Structure

```
src/
├── types/
│   └── mediaMotion.ts         # ViewMode, Density, CarouselGeometry, CardTarget, etc.
├── utils/
│   └── themeTokens.ts         # Accent palettes (cyan, pink, emerald, amber) for dark & light mode
├── motion/
│   ├── motionMath.ts          # Pure 3D perspective & coordinate math (Coverflow, Strip, Radial, etc.)
│   ├── useCarouselMotion.ts   # Imperative GSAP wheel/drag motion hook (React 19 + GSAP 3.15)
│   └── transitionChoreography.ts # Smooth exit & view-switching transitions
└── components/
    └── media/
        ├── MediaCard.tsx      # 3D Card with OggleBox progress bar, audio/binary slots, & info modal
        ├── MediaListView.tsx  # Multi-column dense list view (1-4 cols, sticky headers, quick play)
        ├── StageWatermark.tsx # 3D rotating typography backdrop
        └── MediaStage.tsx     # Central orchestrator (Grid, List, and 3D Carousels)
```

---

## 3. Step-by-Step Implementation Roadmap

### Phase 1: Foundation & Mathematical Core
- [ ] Create `src/types/mediaMotion.ts`:
  - Define `ViewMode` (`'grid' | 'list' | 'coverflow' | 'strip' | 'radial' | 'filmstrip' | 'peel'`).
  - Define geometry, card target, and list density types.
- [ ] Create `src/utils/themeTokens.ts`:
  - Map OggleBox's 4 accent colors (`cyan`, `pink`, `emerald`, `amber`) to glow shadows, halos, and badge colors for both dark and light mode.
- [ ] Create `src/motion/motionMath.ts`:
  - Implement `computeCarouselTarget` (pure math for Coverflow, Strip, Radial, Filmstrip, Peel).
  - Implement `getCardDepthStyling` for dynamic borders and elevation.

### Phase 2: Imperative GSAP Drivers
- [ ] Create `src/motion/useCarouselMotion.ts`:
  - Dual-driver pipeline: direct `gsap.to` manipulation during wheel/drag; debounced React commit.
  - 8px pointer deadzone so clicking cards to play video or open info is never swallowed by drag gestures.
  - Keyboard arrow capture listener to keep focus in sync.
- [ ] Create `src/motion/transitionChoreography.ts`:
  - Staggered downward tilt exit animation when changing views or switching filters.

### Phase 3: Merged UI Components (Preserving All OggleBox Slots)
- [ ] Create `src/components/media/MediaCard.tsx`:
  - Combine the 3D perspective wrapper and hover physics with OggleBox's critical UI slots:
    1. **Playback Trigger**: On click, check `localStorage` watch progress (`motionstream_progress_percent_${item.id}`); trigger resume modal if 5%–95%, or launch `VideoPlayer`.
    2. **Binary / ISO Files**: Display disc icon and amber gradient; click opens `DeepMetaModal`.
    3. **Audio Tracks**: Display waveform/music icon and indigo gradient; play launches audio player.
    4. **Watch Progress Bar**: Red/accent progress overlay at bottom of card.
    5. **"File Info" Button**: Independent info button to open `DeepMetaModal` without triggering playback.
    6. **Favorites Star**: Toggle favorite status in `localStorage` (`motionstream_favorites`).
    7. **Category Pill**: Display category badge.
- [ ] Create `src/components/media/MediaListView.tsx`:
  - Multi-column list layout supporting 1 to 4 responsive columns with sticky headers, format chips, and direct play/star buttons.
- [ ] Create `src/components/media/StageWatermark.tsx`:
  - 3D directional glyph reflecting active item initial with smooth perspective flips.
- [ ] Create `src/components/media/MediaStage.tsx`:
  - Main listing viewport: mounts `MediaListView` when in `list` mode, or the 3D stage (`grid`, `coverflow`, `strip`, `radial`, `filmstrip`, `peel`).
  - Includes `IntersectionObserver` scroll reveal for Grid view.

### Phase 4: Integration into `App.tsx`
- [ ] **Preserve boot sequence**:
  - Keep `showSplash`, `splashFading`, and `triggerFade()` untouched. The splash video will continue to play and fade seamlessly into the interface.
- [ ] **Update View Mode Controls**:
  - Enhance the view mode switcher in `App.tsx` header:
    - Retain primary `Grid` and `List` buttons.
    - Add a sleek dropdown or selector button group for 3D modes: `Coverflow`, `Strip`, `Radial`, `Filmstrip`, `Peel`.
- [ ] **Wire `<MediaStage />`**:
  - Replace the existing inline grid/list JSX mapping in `App.tsx` with `<MediaStage />`.
  - Pass `filteredLibrary`, `openPlayer`, `setSelectedDetailMedia`, `favorites`, `toggleFavorite`, `settings.theme`, and `settings.primaryColor`.
- [ ] **Ensure Modal & Overlay Isolation**:
  - When `activeMedia` is non-null, `VideoPlayer` mounts over the screen as usual.
  - When `showResumeModal`, `selectedDetailMedia`, `showSettings`, or `showTorrentView` are active, they display on top without z-index collisions with 3D perspective layers.

### Phase 5: Verification & Correctness Gate
- [ ] Run `npm run lint` (`tsc --noEmit`) to verify zero TypeScript errors.
- [ ] Test the entire user flow:
  1. Boot up -> Splash screen video plays -> Fades smoothly into the catalog.
  2. Switch between Grid, List, Coverflow, Strip, Radial, Filmstrip, Peel.
  3. Verify mouse wheel and pointer dragging in 3D views (60fps, zero stutter).
  4. Click video card -> Verify resume modal triggers for partially-watched videos.
  5. Click audio card -> Verify audio playback and visualizer.
  6. Click binary file / Info button -> Verify `DeepMetaModal` displays metadata.
  7. Search and category sidebar filtering -> Verify smooth card restaggering.
  8. Switch themes (Dark/Light) and accent colors -> Verify card glow and borders update dynamically.

---

## 4. Discussion & Decision Points for You

Before implementing, please review these UX design choices:

1. **View Mode Switcher Placement**:
   - Would you like the new 3D views (`Coverflow`, `Strip`, `Radial`, etc.) accessible via:
     - **Option A**: A segmented pill/icon bar in the header (e.g. `[Grid] [List] [3D ▼]`).
     - **Option B**: Individual icons in the header alongside Grid/List.
     - **Option C**: A settings toggle to choose your preferred default view mode.
2. **Backdrop Watermark**:
   - The handover includes `StageWatermark` (large subtle 3D letter rotating in the background behind the cards). Do you want this enabled, or do you prefer keeping only the OggleBox background image wallpaper?
3. **Card Density in Grid Mode**:
   - The handover supports selectable density (e.g., 4, 5, 6 cards per row). Should we keep OggleBox's responsive auto-grid, or add a density selector?

---

*This plan is ready for review. Once confirmed or adjusted, implementation can proceed phase-by-phase with verification at each step.*
