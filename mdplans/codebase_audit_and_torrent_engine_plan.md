# OggleBox Codebase Audit & Torrent Engine Architecture Plan

> **Document Version:** 1.0.0  
> **Status:** Comprehensive Codebase Catalog & Blueprint for Torrent Engine Overhaul  
> **Target Directory:** `p:/OggleBox-jules/`  
> **Purpose:** Exhaustive knowledge base for future sessions to understand the entire architecture, backend/frontend wiring, technical debt, and step-by-step roadmap to replace the current client-side torrent viewer with a robust, server-backed BitTorrent streaming engine.

---

## 1. Executive Summary & Architecture Overview

**OggleBox Server** (also styled as **Motion Stream** in UI configurations) is a local, lightweight media streaming server. It pairs a **Node.js/Express backend** (handling file discovery, HTTP-range byte streaming, real-time FFmpeg on-the-fly transcoding, thumbnail extraction, and deep metadata probing) with a **React 19 single-page application** frontend.

### Core Architectural Principles
1. **Single-Process Dual-Mode Runtime:**
   - Both backend and frontend run out of a single process listening on port **3000** (binds to `0.0.0.0` for zero-configuration local area network access).
   - **Dev Mode (`NODE_ENV !== 'production'`):** Express launches a Vite dev server in middleware mode with HMR attached to the Node HTTP server.
   - **Production Mode:** Express serves the pre-compiled `dist/` bundle and falls back to `dist/index.html`.
2. **Virtual, File-Path-Derived Media Library:**
   - No relational database (no SQLite, Postgres, or MongoDB).
   - Media library is synthesized on boot or on scan by traversing `MEDIA_DIR` (`./media`) and `PUBLIC_DIR` (`./public`).
   - Categories are dynamically derived from directory path hierarchies (e.g. `media/Movies/SciFi/movie.mp4` -> category `Movies/SciFi`).
   - Cached to an in-memory variable (`inMemoryLibraryCache`) and persisted to `library-cache.json`.
3. **On-the-Fly Dynamic Transcoding:**
   - Instead of pre-rendering video formats, `server.ts` pipes `fluent-ffmpeg` directly into HTTP response streams (using fragmented MP4: `frag_keyframe+empty_moov+default_base_moof`).
   - Clients that lack native browser decoding for HEVC, MKV, AVI, or DTS/AC3 audio stream directly from the transcoder.
4. **Self-Healing Binary Assets:**
   - Known binary assets (`public/ogglebox.mp4`, `public/ogglebox.jpg`, `public/sample-big-buck-bunny.mp4`) are verified against magic bytes on boot. Corrupted or missing files are automatically restored from `.backups/binaries/` or downloaded from GitHub/MDN.
5. **The Torrenting Pathology:**
   - The current torrenting feature (`src/components/WebTorrentView.tsx`) is implemented **entirely inside the browser** using WebRTC datachannels. It cannot connect to standard BitTorrent TCP/UDP swarms or DHT trackers, dies when the user navigates views, saves data only to ephemeral browser memory blobs instead of the host disk, and bypasses the app's flagship `VideoPlayer`. It is the primary architectural liability of the application ("a dingo nipping at the app's heels").

---

## 2. Technology Stack & Configuration Matrix

| Layer | Technology | Version | Purpose / Notes |
| :--- | :--- | :--- | :--- |
| **Runtime** | Node.js | v18+ (tested on Node 20 / Node 26) | Server runtime |
| **Backend Framework** | Express | `^4.21.2` | Single server file (`server.ts`), HTTP API & static server |
| **Frontend Framework**| React | `^19.0.1` | Single-page UI application (`src/App.tsx`) |
| **DOM Renderer** | React DOM | `^19.0.1` | Client rendering |
| **Build Tooling** | Vite | `^6.2.3` | Bundler & dev middleware HMR |
| **TypeScript Runner** | TSX | `^4.21.0` | Node TypeScript execution for `server.ts` |
| **Production Bundler**| ESBuild | `^0.25.0` | Bundles `server.ts` -> `dist/server.cjs` |
| **Type Checking** | TypeScript | `~5.8.2` | Correctness gate via `npm run lint` (`tsc --noEmit`) |
| **Transcoding Engine**| Fluent-FFmpeg | `^2.1.3` | FFmpeg wrapper for on-the-fly streaming & thumbnails |
| **Static Binaries** | `ffmpeg-static` + `@ffprobe-installer/ffprobe` | `^5.3.0` / `^2.1.2` | Built-in fallback binaries |
| **Animations** | GSAP + `@gsap/react` | `^3.15.0` / `^2.1.2` | UI stagger and mount transitions |
| **Icons** | Lucide React | `^0.546.0` | Iconography suite |
| **Archive Tool** | JSZip | `^3.10.1` | In-memory project export to ZIP (`/api/download-zip`) |
| **Torrent Engine** | WebTorrent | `^3.0.21` | In dependencies; currently misused on frontend |
| **Styling** | Custom CSS3 + Tailwind classes | Handwritten in `src/index.css` | Zero-build-delay Tailwind-compatible utility classes |

### Key NPM Scripts
- `npm run dev`: Runs `tsx server.ts` (Express API + Vite HMR on `http://localhost:3000`).
- `npm run build`: Executes `vite build` (frontend -> `dist/`) followed by `esbuild server.ts --bundle --platform=node --format=cjs --packages=external --sourcemap --outfile=dist/server.cjs`.
- `npm start`: Runs `node dist/server.cjs` (production static server).
- `npm run lint`: Runs `tsc --noEmit` (no unit test runner configured; this is the primary automated correctness check).
- `npm run clean`: Cleans `dist` and `server.js`.

---

## 3. Complete Codebase Catalog & Innards Directory

### Directory Map
```
p:/OggleBox-jules/
├── .backups/
│   └── binaries/                 # Offline backup copies of binary media
├── md/
│   ├── 20featuresrefused.md      # Historical feature log (audio visualizer, color grading, PiP, etc.)
│   ├── 25features.md             # Historical feature log (variable speed, hover tooltip, theater mode)
│   └── updatefinal.md            # Settings modal, branding & theme roadmap
├── mdplans/
│   └── codebase_audit_and_torrent_engine_plan.md  # [THIS DOCUMENT]
├── media/                        # User video storage (defaults to empty or user-configured)
├── public/                       # Static public assets served at root
│   ├── branding/                 # Splash & brand videos
│   ├── ogglebox.jpg              # Default branding background & poster
│   ├── ogglebox.mp4              # Default 4-second splash video
│   ├── sample-big-buck-bunny.jpg # Sample thumbnail
│   ├── sample-big-buck-bunny.mp4 # Sample video
│   └── tailwind.css              # Unreferenced compiled Tailwind v4 CSS asset
├── src/
│   ├── components/
│   │   ├── CategorySidebar.tsx   # Folder hierarchy tree navigation (249 lines)
│   │   ├── DeepMetaModal.tsx     # FFprobe stream & container metadata inspector (298 lines)
│   │   ├── SettingsModal.tsx     # Branding, theme, & library scan controls (248 lines)
│   │   ├── VideoPlayer.tsx       # Flagship video player with visualizer & DSP grading (1,034 lines)
│   │   └── WebTorrentView.tsx    # Current flawed browser-only WebTorrent view (784 lines)
│   ├── App.tsx                   # Central frontend orchestration & state machine (866 lines)
│   ├── index.css                 # Handwritten Tailwind utility stylesheets (522 lines)
│   ├── main.tsx                  # React 19 entry point (11 lines)
│   └── types.ts                  # Frontend TypeScript interface definitions (62 lines)
├── .env.example                  # Environment configuration template
├── .gitattributes                # Git attribute binary filters
├── .gitignore                    # Git ignores (.backups, media, dist, node_modules)
├── AIO_install.bat               # Windows automatic setup script (Node + FFmpeg + build)
├── AIO_install.sh                # Unix/macOS automatic setup script
├── CLAUDE.md                     # Guidance notes for LLM agents
├── docker-compose.yml            # Docker container orchestration
├── Dockerfile                    # Container definition (node:20-slim + ffmpeg)
├── index.html                    # Root HTML document
├── library-cache.json            # Persistent JSON cache for media items
├── metadata.json                 # Project descriptor
├── package.json                  # Dependencies & scripts
├── README.md                     # User documentation
├── server.ts                     # Monolithic Express backend (970 lines)
├── start_ogglebox.bat            # Windows startup script
├── tsconfig.json                 # TypeScript compiler configuration
├── types.ts                      # Backend TypeScript interface definitions (mirrors src/types.ts)
└── vite.config.ts                # Vite config & dev server settings
```

---

## 4. Backend Anatomy & Wiring (`server.ts`)

`server.ts` is a 970-line monolithic server file housing all backend logic.

### 4.1. Boot Sequence & Self-Healing
1. **Directory Initializations:** Ensures `MEDIA_DIR` (overridable via `process.env.MEDIA_DIR`, defaults to `./media`) and `PUBLIC_DIR` (`./public`) exist.
2. **Binary Self-Healing (`healAllKnownBinaries()`):**
   - Inspects `ogglebox.jpg`, `ogglebox.mp4`, and `sample-big-buck-bunny.mp4`.
   - Checks file size (`>= 100,000` bytes) and magic byte signatures (e.g. `0xFF 0xD8 0xFF` for JPEG; `ftyp`, `moov`, `isom` for MP4).
   - If corrupted or missing, restores from `.backups/binaries/` or downloads from MDN/GitHub.
3. **RAM Cache Preloading (`loadLibraryCache()`):**
   - Synchronously reads `library-cache.json` on startup into `inMemoryLibraryCache`.

### 4.2. Path Resolution Engine (`resolveVideoFilePath()`)
Every endpoint requesting a video file (`/api/stream`, `/api/transcode`, `/api/probe`, `/api/download`, `/api/thumbnail/regenerate`) calls `resolveVideoFilePath(rawInputPath)`. It strips URL prefixes (`api/stream/`, `api/transcode/`), decodes URI components, normalizes Windows backslashes, and checks five candidate locations in priority order:
1. `path.resolve(process.cwd(), clean)`
2. `path.resolve(process.cwd(), decoded.substring(mediaIdx))` (if path contains `media/`)
3. `path.resolve(MEDIA_DIR, clean.replace(/^media\//, ''))`
4. `path.resolve(MEDIA_DIR, path.basename(clean))`
5. `path.resolve(PUBLIC_DIR, path.basename(clean))`

### 4.3. Thumbnail Generation Engine
- **`generateThumbnail(videoPath, thumbnailPath, filename, targetSeconds = 30)`**:
  - Probes video duration using `ffmpeg.ffprobe`.
  - Determines seek timestamp: target 30s, or half duration if `< 30s`.
  - Extracts single JPEG frame via `ffmpeg`: `-vframes 1 -q:v 2 -f image2 -update 1`.
  - Writes to a `.tmp.<timestamp>.jpg` file and atomically renames to prevent partial reads.
  - Multi-tier fallback: if seek at target fails, retries at `1.0s`, then `0.1s`.

### 4.4. Complete Server API Route Catalog

| Endpoint | Method | Params / Payload | Description & Internal Wiring |
| :--- | :--- | :--- | :--- |
| `/api/library` | `GET` | `?refresh=true` (optional) | Returns `MediaItem[]`. Fast-path returns `inMemoryLibraryCache` immediately. If cache miss or `?refresh=true`, scans `MEDIA_DIR` and `PUBLIC_DIR`, compares disk count to skip redundant scans, or builds fresh library and updates `library-cache.json`. |
| `/api/scan` | `POST` | None | Triggers full directory rescan and thumbnail backfill. Updates global `currentScanProgress`. Loops over files and generates missing `.jpg` thumbnails. Returns `{ status, message, added, errors, total }`. |
| `/api/scan/progress`| `GET` | None | Returns `{ inProgress, current, total, currentFile, added, errors }` for frontend polling during folder scans. |
| `/api/categories` | `GET` | None | Scans or loads cache, aggregates item counts per directory hierarchy, returns `[{ name, count }]`. |
| `/api/thumbnail/regenerate` | `POST` | `{ path: string, timestamp: number }` | Re-extracts video frame at specified timestamp, writes JPEG, updates RAM/disk cache, and returns `{ status, poster }`. |
| `/api/stream/*` | `GET` | Wildcard relative video path | Handles standard HTTP 206 Partial Content range requests for seekable video playback. Reads stream in 512KB chunks for ranges, or 2MB chunks for full file requests. |
| `/api/transcode/*` | `GET` | Wildcard path, `?profile=...`, `?start=...`, `?codec=...` | Live FFmpeg transcoding pipeline. Pipes transcoded fragmented MP4 directly to HTTP response socket. Kills FFmpeg child process (`SIGKILL`) on client socket disconnect (`req.on('close')`). Profiles: `netflix`, `smooth`, `anime`, `low`, `standard`. |
| `/api/probe/*` | `GET` | Wildcard relative video path | Runs `ffmpeg.ffprobe` and returns comprehensive metadata: duration, format, bitrate, streams count, video codec/profile/dimensions/aspectRatio/fps/color space, and audio channels/sampleRate. |
| `/api/download/*` | `GET` | Wildcard relative video path | Forces browser attachment download (`Content-Disposition: attachment`) with 5MB stream chunks. |
| `/api/download-zip` | `GET` | None | Compresses entire project repository (excluding `node_modules`, `.backups`, `dist`, `.git`) on-the-fly into a ZIP archive using JSZip and streams it to client. |

---

## 5. Frontend Anatomy & Wiring (`src/`)

### 5.1. Entry & Global Styling
- `src/main.tsx` mounts `<App />` into `#root` with `React.StrictMode` and imports `./index.css`.
- `src/index.css` provides 522 lines of handwritten CSS3 utilities mimicking Tailwind syntax. It supports:
  - Responsive breakpoints (`sm:`, `md:`, `lg:`, `xl:`, `2xl:`).
  - Four accent theme color systems:
    - **Electric Cyan:** `text-cyan-400`, `bg-cyan-500`, `from-cyan-400 to-indigo-600`
    - **Neon Pink:** `text-pink-400`, `bg-pink-500`, `from-pink-400 to-rose-600`
    - **Emerald Green:** `text-emerald-400`, `bg-emerald-500`, `from-emerald-400 to-teal-600`
    - **Golden Amber:** `text-amber-400`, `bg-amber-500`, `from-amber-400 to-orange-600`
  - Two global theme modes: **Dark Mode** (`bg-[#020617] text-white`) and **Light Mode** (`bg-slate-100 text-slate-900`).

### 5.2. Orchestration State Machine (`src/App.tsx`)
`App.tsx` (~866 lines) acts as the central state hub:
- **Navigation Tabs:** `activeTab` toggles between `'library'` and `'webtorrent'`.
- **View Modes:** `viewMode` toggles between `'grid'` (responsive card grid) and `'list'` (2-column playlist layout).
- **Sorting Engine:** `sortBy` (`'title'`, `'date'`, `'size'`) and `sortOrder` (`'asc'`, `'desc'`).
- **Category Filter:** Derived from `item.category`, supporting hierarchical drill-down (`CategorySidebar.tsx`).
- **Favorites & Watch History:** Stored in `localStorage`:
  - `motionstream_favorites`: `string[]` of item IDs.
  - `motionstream_progress_percent_<id>`: numeric float (0-100).
- **Resume Playback Modal:** Intercepts clicks on media items with `5% < progress < 95%`, offering the user a choice to resume or start from beginning.
- **Splash Screen:** 4-second video intro (`/ogglebox.mp4`) that fades out on completion; remembered in `sessionStorage` (`ogglebox_splash_seen_v2`).
- **Settings Store (`motionstream_settings` in localStorage):**
  ```ts
  interface AppSettings {
    appTitle: string;         // Default: 'OggleBox Server' (1st word styled with primary color)
    pageTitle: string;        // Dynamic document.title sync
    primaryColor: 'cyan' | 'pink' | 'emerald' | 'amber';
    theme: 'dark' | 'light';
    transcodeProfile: 'netflix' | 'smooth' | 'standard' | 'anime' | 'low';
  }
  ```
- **GSAP Stagger Animations:** Animates the first 18 `.gsap-card` elements on library loads or filter changes using `@gsap/react`.

### 5.3. Flagship Video Player (`src/components/VideoPlayer.tsx`)
A 1,034-line feature-rich player component:
- **Direct Play vs Transcode Capability Gate:** Gated by `canPlayType` probe before mounting `<video>` to avoid failed direct-play attempts. Automatically switches to `/api/transcode/*` if direct play fails.
- **High-Performance Non-React Progress Loop:** Playback position (`currentTime`, progress percentage) is intentionally NOT stored in React state. Doing so previously caused 4Hz re-render stutter. Instead, DOM refs (`progressBarRef`, `currentTimeRef`, `progressDotRef`) are mutated directly in `requestAnimationFrame` and throttled `localStorage` writes (every 2 seconds).
- **Web Audio API Frequency Visualizer:** Intercepts `<video>` audio source via `AudioContext` and `AnalyserNode` (64 frequency bins), rendering a 60fps hardware-accelerated spectrum onto a `<canvas>` element.
- **Hardware-Accelerated Video Color Grading Matrix:** Real-time CSS filter matrix applied to the video element: Brightness, Contrast, Saturation, Sepia, and Hue Phase rotation.
- **Transport Controls:** Play/Pause, 10s Skip Forward/Backward, Frame-by-Frame stepping (bound to `,` and `.`), Variable Speed menu (0.25x to 4x), A/B Section Looping, Autoplay Next, and Playlist Loop modes (Off, Single, All).
- **HUD & Tools:** Stats for Nerds overlay (`S` key: resolution, dropped frames, buffer health, transcoder status), Picture-in-Picture (`P` key), 30-minute Sleep Timer, and Theater Mode (85vh container).

---

## 6. Codebase Disarray & Technical Debt Audit

While the primary media library, player, and settings workflows function well, several structural anti-patterns and areas of disarray exist:

1. **Type Definition Fragmentation:**
   - `types.ts` at the root and `src/types.ts` are separate duplicate files with identical definitions. Changes to one must be manually mirrored to the other.
2. **Stray Backup Snapshots in Working Tree:**
   - `server - Copy.ts`, `server.ts.old`, and `src/components/VideoPlayer - Copy.tsx` were left in the project. They clutter searches and could confuse future contributors.
3. **Unreferenced CSS Asset:**
   - `public/tailwind.css` exists as a compiled 39KB Tailwind v4 stylesheet, but is never linked in `index.html` or imported in `src/main.tsx`. The app actually runs on handwritten classes in `src/index.css`.
4. **Monolithic Backend Design:**
   - `server.ts` combines routing, static serving, FFmpeg process spawning, directory scanning, self-healing HTTP downloads, and Vite middleware in a single 970-line file without modular sub-routers.
5. **Global Scan State Race Condition:**
   - `currentScanProgress` is a single shared module-level object. Multiple simultaneous client scans would corrupt progress reporting.
6. **No Automated Test Harness:**
   - Correctness relies strictly on `npm run lint` (`tsc --noEmit`). There are no integration tests for streaming range requests, transcoding pipelines, or scanner routines.

---

## 7. Deep Audit of the Torrenting Section ("The Dingo Nipping at the App's Heels")

The user noted: *"The torrenting section is shocking, the other parts of the site are working and styled and orchestrated as intended. So yeah, flesh out the torrenting section properly, atm its a dingo nipping at the apps heels."*

Here is the exact technical diagnosis of why the current torrent implementation is broken:

### 7.1. Seven Fatal Flaws in `WebTorrentView.tsx`

| # | Flaw | Detailed Technical Impact |
| :- | :--- | :--- |
| **1** | **Client-Side WebRTC Sandboxing** | `WebTorrentView.tsx` imports `webtorrent/dist/webtorrent.min.js` directly into the browser. Browser JavaScript **cannot open raw TCP or UDP sockets**, which means it **cannot communicate with standard BitTorrent peers, standard trackers, or the DHT network**. It can only connect to rare WebRTC peers via WebSocket trackers. **Pasting 99.9% of real-world magnet links results in 0 peers and 0 B/s indefinitely.** |
| **2** | **Lifecycle Destruction on Navigation** | In `WebTorrentView.tsx` (line 187), the `useEffect` cleanup hook calls `wtClient.destroy()`. The instant the user clicks the "Library" tab, switches views, or opens a video, **the entire client is destroyed, all swarm connections are severed, and in-progress downloads are aborted.** |
| **3** | **Zero Host Storage / Memory Blob Isolation** | In the browser, pieces are buffered in browser RAM or IndexedDB blobs. **Files are never written to the server's `./media` directory.** Even if a file finishes downloading, it does not exist on disk, cannot be indexed into the OggleBox library, cannot be transcoded by FFmpeg, and cannot be accessed by other LAN clients. |
| **4** | **Bypassing the Flagship Video Player** | `WebTorrentView` renders videos into a bare `<video controls>` tag using `selectedFile.renderTo(videoRef.current)`. It completely bypasses `VideoPlayer.tsx` — losing the audio visualizer, color grading, Stats for Nerds, A/B loop, frame stepping, and theater mode. |
| **5** | **Codec Incompatibility & Black Screens** | Standard BitTorrent video files frequently use MKV containers, HEVC/H.265, 10-bit color, AC3, or DTS audio. Browser `<video>` elements cannot decode these natively. Because `WebTorrentView` plays directly in the browser, these files fail to play or have no audio. OggleBox's backend FFmpeg transcoding engine is never utilized. |
| **6** | **Severe DOM Thrashing & Memory Leaks** | For every active torrent, every second the code maps over `selectedTorrent.pieces` (which can contain 5,000 to 50,000 piece blocks for typical video files) and generates individual React DOM `<div>` nodes for the bitfield visualizer, causing massive CPU spikes, garbage collection pauses, and browser freezing. |
| **7** | **No Download Persistence Across Restarts** | There is no database or metadata file storing active torrent hashes, download folders, or progress. Refreshing the browser or restarting the server wipes everything. |

---

## 8. Master Plan: Modern Server-Backed Torrent Engine Architecture

To transform the torrent section from a "dingo" into a first-class feature of OggleBox, the torrent engine must be **migrated from the browser frontend into the Node.js backend (`server.ts`)**.

```
                        ┌────────────────────────────────────────────────────────┐
                        │                   OGGLEBOX SERVER                      │
                        │                                                        │
┌─────────────────┐     │  ┌────────────────────┐      ┌──────────────────────┐  │
│  BROWSER CLIENT │     │  │  Express API       │      │  Backend Torrent     │  │
│                 │     │  │  Routes:           │      │  Engine (Node.js)    │  │
│  Torrent UI     │◄───┼──┤  • /api/torrents   │◄────►│  • Full TCP/UDP/uTP  │  │
│  (Management,   │     │  │  • /api/torrents/* │      │  • DHT & PEX swarm   │  │
│   Swarm Stats,  │     │  │  • /api/stream     │      │  • Background daemon │  │
│   File Pickers) │     │  │  • /api/transcode  │      │  • Sequential piece  │  │
│                 │     │  └─────────┬──────────┘      │    prioritization    │  │
│                 │     │            │                 └──────────┬───────────┘  │
│  Flagship       │     │            ▼                            ▼              │
│  VideoPlayer    │◄────┼────────────┴─────────────────────► [Disk: ./media/]    │
│  (HTTP Range /  │     │                                  • Direct .mp4/.mkv    │
│   FFmpeg Stream)│     │                                  • Instant indexing    │
└─────────────────┘     │                                  • Auto thumbnails     │
                        └────────────────────────────────────────────────────────┘
```

### 8.1. Backend Torrent Manager (`torrentEngine.ts` or integrated in `server.ts`)
- **Native Node.js WebTorrent:** In Node.js, `webtorrent` is a hybrid client that supports TCP, UDP, uTP, DHT, PEX, and WebRTC. It can download from any BitTorrent swarm.
- **Dynamic ESM Import:** Since WebTorrent v3 is pure ESM with top-level await, import it asynchronously:
  ```ts
  const WebTorrent = (await import('webtorrent')).default;
  const torrentClient = new WebTorrent({ maxConns: 55 });
  ```
- **Direct Disk Persistence:** Downloads are saved directly into `path.join(MEDIA_DIR, "downloads")` or a designated torrents folder.
- **State Persistence (`torrents-state.json`):** On torrent add, pause, or remove, serialize the list of active torrents (magnet URI, save path, added date, name) to disk so downloads resume on server restart.
- **Sequential Piece Streaming:** When a client streams an in-progress torrent file, set `file.select()` with piece priorities or use `file.createReadStream()` with sequential piece selection, allowing video playback to begin within seconds of adding a magnet.
- **Unified Video Streaming & Transcoding:** Expose torrent files to the existing `/api/stream/*` and `/api/transcode/*` pipelines, enabling full browser playback of MKV/HEVC/AC3 media via FFmpeg on-the-fly conversion!

### 8.2. Backend API Endpoint Specifications

#### 1. `GET /api/torrents`
Returns status of all torrents currently managed by the server.
```json
[
  {
    "id": "08ada5a7a6183aae1e09d831df6748d566095a10",
    "name": "Sintel",
    "infoHash": "08ada5a7a6183aae1e09d831df6748d566095a10",
    "magnetURI": "magnet:?xt=urn:btih:...",
    "progress": 0.45,
    "downloadSpeed": 2540120,
    "uploadSpeed": 142000,
    "numPeers": 34,
    "downloaded": 584000000,
    "total": 1290000000,
    "timeRemaining": 298000,
    "ratio": 0.24,
    "status": "downloading",
    "savePath": "media/downloads/Sintel",
    "files": [
      {
        "index": 0,
        "name": "sintel.mp4",
        "length": 1290000000,
        "downloaded": 584000000,
        "progress": 0.45,
        "isVideo": true,
        "streamUrl": "/api/torrents/08ada5a7a6183aae1e09d831df6748d566095a10/stream/0"
      }
    ]
  }
]
```

#### 2. `POST /api/torrents/add`
Adds a torrent to the backend daemon.
- **Request Body:** `{ magnetURI?: string, torrentFileBase64?: string, category?: string }`
- **Behavior:** Adds torrent to Node `webtorrent`, writes to `torrents-state.json`, sets destination directory, returns torrent summary.

#### 3. `POST /api/torrents/:id/pause` & `POST /api/torrents/:id/resume`
Pauses or resumes swarm transfers for a specific torrent.

#### 4. `DELETE /api/torrents/:id`
Removes a torrent. Query parameter `?deleteFiles=true` optionally deletes the downloaded files from disk.

#### 5. `GET /api/torrents/:id/stream/:fileIndex`
Streams the specified file using HTTP 206 range requests directly from the in-progress or completed file on disk, with automatic sequential piece prioritization.

#### 6. `POST /api/torrents/:id/import-to-library`
Moves or indexes the downloaded video file into the main media library, triggers thumbnail extraction, and updates `library-cache.json`.

### 8.3. Frontend Redesign (`WebTorrentView.tsx` / `TorrentManager.tsx`)
- **Polls or Streams Telemetry:** Fetches `/api/torrents` every 1-2 seconds (or uses Server-Sent Events).
- **Navigation Safety:** User can leave the torrent tab, browse the library, play videos, or close the browser — downloads continue uninterrupted on the server.
- **Direct Playback via Flagship Player:** Clicking "Play" or "Stream" on any torrent video file constructs a `MediaItem` and opens `VideoPlayer.tsx`. The video plays with full audio visualizer, color grading, Stats for Nerds, and automatic FFmpeg transcoding fallback if needed.
- **Optimized UI Components:**
  - Active Downloads, Seeding, and Completed tabs.
  - Multi-file explorer with checkboxes to select which files to download or prioritize.
  - High-performance Canvas-based piece visualizer (rendering blocks to an HTML5 canvas instead of thousands of DOM divs).
  - Drag-and-drop `.torrent` file uploader and magnet input with instant clipboard paste detection.
  - Cyberpunk theme accents matching the rest of OggleBox (Cyan, Pink, Emerald, Amber).

---

## 9. Step-by-Step Implementation Roadmap

### Phase 1: Backend Torrent Daemon & Persistence
- [x] Create `torrentManager.ts` at repository root.
- [x] Implement asynchronous initialization using dynamic ESM import of `webtorrent`.
- [x] Implement `torrents-state.json` storage to persist magnets across restarts.
- [x] Add auto-resume on server boot.

### Phase 2: REST API Endpoints
- [x] Implement `GET /api/torrents` (live swarm telemetry).
- [x] Implement `POST /api/torrents/add` (magnet URI and infohash support).
- [x] Implement `POST /api/torrents/upload` (.torrent raw binary file upload).
- [x] Implement `POST /api/torrents/:id/pause`, `resume`, and `DELETE`.
- [x] Implement `GET /api/torrents/:id/stream/:fileIndex` with sequential piece prioritization and HTTP 206 Range seeking.
- [x] Implement `GET /api/torrents/:id/transcode/:fileIndex` on-the-fly FFmpeg transcoding for torrents.

### Phase 3: Transcoder & Media Library Integration
- [x] Connect torrent stream paths to `resolveVideoFilePath()` so `/api/transcode/*` and `/api/probe/*` can inspect and transcode torrent files.
- [x] Add auto-import trigger: when a torrent completes, automatically run thumbnail generation and add items to `library-cache.json`.

### Phase 4: Frontend UI Overhaul
- [x] Rewrite `WebTorrentView.tsx` into a high-performance dashboard that communicates with the backend daemon.
- [x] Remove fragile client-side WebRTC engine and eliminate lifecycle destruction on view navigation.
- [x] Connect the "Stream" action directly to `setActiveMedia()` in `App.tsx` so torrents play in the flagship `VideoPlayer.tsx`.
- [x] Wire all 4 theme colors (Cyan, Pink, Emerald, Amber) in both Dark and Light modes.

### Phase 5: Codebase Cleanup & Verification
- [x] Verify absence of stray snapshot files.
- [x] Unify types between `types.ts` and `src/types.ts` (`TorrentItem`, `TorrentFileItem`).
- [x] Run `npm run lint` (`tsc --noEmit`) to verify zero TypeScript errors.
- [x] Verify full production build (`npm run build`) and clean server boot.

---

## 10. Quick Reference for Future Sessions

- **Run Dev Server:** `npm run dev` (starts on port 3000)
- **Check Type Errors:** `npm run lint` (`tsc --noEmit`)
- **Build Production:** `npm run build`
- **Main Server File:** `server.ts`
- **Main Frontend File:** `src/App.tsx`
- **Video Player:** `src/components/VideoPlayer.tsx`
- **Torrent View:** `src/components/WebTorrentView.tsx`
- **Styles:** `src/index.css`
- **Persistent Cache:** `library-cache.json`
- **Media Directory:** `./media/` (or configured via `MEDIA_DIR` in `.env`)
