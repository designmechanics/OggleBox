# OggleBox Server — Core System Guidelines & Memory

This file serves as persistent memory and architectural guidance for any AI agent or model working in this repository.

---

## 0. ABSOLUTE MANDATE: SURGICAL EDITS ONLY — ZERO SCOPE CREEP & NO ADDITIVE MUTATIONS
**CRITICAL DEVELOPER DIRECTIVE — MUST BE FOLLOWED WITHOUT EXCEPTION:**
1. **NO ALTERING CODE UNRELATED TO THE PROMPTED TASK**:
   - Touch ONLY the exact lines and files directly required to fulfill the user's specific instruction.
   - Do NOT touch, re-style, re-theme, or "improve" adjacent components, wrapper bars, navigation menus, headers, sidebars, or overlays.
   - NEVER "anticipate" or "proactively fix" side effects in neighboring files. If a card needs spacing, change only the card/stage spacing; NEVER alter the menu bar behind/above it.
2. **SURGICAL STRIKES ONLY — NO DIVERSION, NO DEVIATION**:
   - Implement the minimal, cleanest change necessary.
   - Do NOT add unsolicited visual enhancements, extra utility classes, extra borders, shadows, or backdrop blurs.
   - When fixing an issue (fixing B), NEVER introduce new changes to C.
   - When the user asks for A, deliver ONLY A. Never A+B.
3. **CONTEXT AWARENESS & FILE DISCIPLINE**:
   - Read and respect `CLAUDE.md`, `GEMINI.md`, `MODELS.md`, and any related task documentation before proposing or making changes.
   - Preserve existing visual aesthetics, themes, backgrounds, and styling constants unless an explicit aesthetic change is commanded by the user.

---

## 1. Project Overview & Architecture
OggleBox Server is a local media streaming and BitTorrent management system:
- **Backend**: Express + TypeScript in `server.ts` with HTTP-range streaming, on-the-fly FFmpeg transcoding, and WebTorrent daemon.
- **Frontend**: Single-page React 19 application in `src/` bundled with Vite.
- **Styling**: Handwritten static CSS3 in `src/index.css` (Zero Build Delay). **There is NO Tailwind JIT compiler.**
- **Correctness Gate**: `npm run lint` (`tsc --noEmit`).

---

## 2. Global Theming Architecture & Consistency

### 2.1 Modes & Accent Palettes
The application supports:
1. **Appearance Modes**:
   - **Dark Mode**: `bg-[#020617]` / `text-white`
   - **Light Mode**: `bg-slate-100` / `text-slate-900`
2. **Primary Accent Palettes**:
   - 4 selectable colors (`cyan`, `pink`, `emerald`, `amber`) mapped via `src/utils/themeTokens.ts` (`ACCENT_PALETTES`).

### 2.2 Critical Styling Rules (Static CSS)
- **Do NOT use Tailwind arbitrary variant classes** like `dark:bg-*`, `dark:text-*`, or arbitrary JIT classes like `z-[99999]`. They are not compiled by Vite because Tailwind is not in dependencies; `src/index.css` is handwritten static CSS.
- **Component Theming Pattern**:
  Always use explicit boolean checks based on `theme === 'light'` (e.g., `const isLight = theme === 'light';`) with ternary conditionals for classes or inline styles:
  ```tsx
  className={isLight ? 'bg-white border-slate-200 text-slate-800' : 'bg-slate-900 border-white/10 text-white'}
  ```
- **WebTorrent Suite Theming**:
  `WebTorrentView` uses dedicated `.wt-*` classes. The container must have `.wt-container.light` in light mode, which activates light theme rules in `src/index.css`. All inline styles in `WebTorrentView.tsx` must respect `isLight`.

---

## 3. 3D GSAP Viewing System & Modal Elevation Rules

### 3.1 3D Perspective Stacking Contexts
- In GSAP viewing modes (`coverflow`, `strip`, `radial`, `filmstrip`, `peel`), media cards have `transformStyle: 'preserve-3d'`, 3D perspective transforms, and dynamic z-indexes (up to `z-index: 300`).
- In WebKit/Blink, 3D transformed elements establish their own rendering contexts and can render on top of lower fixed overlays (`z-50`).

### 3.2 Modal Portaling & Z-Index Mandate
**ALL modals, dialogs, drawers, and full-screen players MUST:**
1. Render into `document.body` via `createPortal(..., document.body)` so they escape the main DOM hierarchy and 3D transform contexts.
2. Have explicit inline styles with high z-index and pointer events:
   - Modals (`SettingsModal`, `ResumeModal`, `DeepMetaModal`, `selectedDetailMedia`): `style={{ zIndex: 99999 }}` and `.pointer-events-auto`.
   - Fullscreen Player (`VideoPlayer.tsx`): `style={{ zIndex: 99990 }}` and `.pointer-events-auto`.
   - Splash Video: `style={{ zIndex: 999999 }}`.

---

## 4. Business Logic Preservation
Never break or overwrite:
- Session splash video intro, branding wallpaper, and audio playback.
- HTTP-range video streaming and real-time transcode fallbacks.
- WebTorrent sequential piece streaming and post-download directory organization (`media/new`).
- The 7-display view toggle bar (`Grid`, `List`, `Coverflow`, `Strip`, `Radial`, `Filmstrip`, `Peel`).
- Metadata probe and resume playback features.
- Animated AppLogo (`src/components/AppLogo.tsx`) with GSAP loops, 3D faceted play prism, orbital energy beacon, and interactive reactions.
