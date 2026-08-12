# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

OggleBox Server — a local media server: an Express backend (media scanning, HTTP-range video streaming, on-the-fly FFmpeg transcoding, thumbnail generation) paired with a single-page React 19 frontend, served together from one process/port (3000).

## Commands

```bash
npm run dev      # tsx server.ts — runs Express + Vite dev middleware (HMR) together on :3000
npm run build     # vite build (frontend) + esbuild bundles server.ts -> dist/server.cjs
npm start         # node dist/server.cjs — runs the production build
npm run lint      # tsc --noEmit — this repo has no test suite; this is the only "check" command
npm run clean     # rm -rf dist server.js
```

There is no test runner configured — `lint` (type-check) is the correctness gate. Always run `npm run lint` after non-trivial changes to `server.ts` or `src/`.

Docker: `docker-compose up -d` builds via `Dockerfile` (node:20-slim + apt ffmpeg) and runs `npm run build && npm start` inside the container.

## Architecture

**Single-process dual-mode server.** `server.ts` is the entire backend — one file, no router modules. In dev (`NODE_ENV !== "production"`) it creates a Vite dev server in middleware mode and mounts it on the same Express app/HTTP server (so HMR and the API share port 3000). In production it serves the built `dist/` static bundle and falls back to `dist/index.html` for client-side routing. This dual-mode branch lives at the bottom of `startServer()` in `server.ts`.

**Frontend is one big component.** `src/App.tsx` (~830 lines) owns almost all UI state — library data, active category, search, sort, view mode (grid/list), favorites, watch history/resume, splash screen, and the settings object — and passes it down to four presentational components in `src/components/`: `VideoPlayer.tsx` (playback, biggest file at ~970 lines), `CategorySidebar.tsx`, `SettingsModal.tsx`, `DeepMetaModal.tsx` (ffprobe metadata viewer). There is no state management library or router; everything is `useState`/`useEffect`/`localStorage`.

**Media library is file-path-derived, not a database.** There's no DB. The "library" is built by recursively scanning `MEDIA_DIR` (defaults to `./media`, overridable via `MEDIA_DIR` env var) and `PUBLIC_DIR` (`./public`) for video extensions (`scanDirectoryForVideos` in `server.ts`), then synthesizing `MediaItem` objects (id/title/category/poster/etc.) from file paths and `fs.stat`. Category is derived from subdirectory structure. Results are cached to `library-cache.json` at the repo root and held in an in-memory variable (`inMemoryLibraryCache`) as a fast path — `GET /api/library` serves from RAM/disk cache unless `?refresh=true`, and `POST /api/scan` does a full rescan + thumbnail backfill, comparing file counts to skip redundant work.

**Video file path resolution is centralized.** `resolveVideoFilePath()` in `server.ts` is the single place that turns a raw URL path segment into a real filesystem path, trying several candidate locations (relative to cwd, under `media/`, under `MEDIA_DIR`, by basename in `MEDIA_DIR`/`PUBLIC_DIR`). All of `/api/stream`, `/api/transcode`, `/api/probe`, `/api/download`, and thumbnail regeneration route through it — if you add a new file-serving endpoint, reuse this function rather than re-implementing path logic.

**Transcoding is streamed, not pre-rendered.** `GET /api/transcode/*` pipes `fluent-ffmpeg` output directly to the HTTP response (fragmented MP4, `frag_keyframe+empty_moov`) so playback can start before encoding finishes. Quality/speed presets (`netflix`, `smooth`, `standard`, `anime`, `low`) are defined inline in that route and mapped to ffmpeg flag sets — see the `switch(profile)` block. Killing the ffmpeg process on client disconnect (`req.on("close", ...)`) is intentional and required to avoid orphaned encodes.

**Self-healing static assets.** On boot (`healAllKnownBinaries()`) and before zip export, the server verifies known binary assets (splash video/image, sample video) exist and pass a magic-byte check, restoring from `.backups/binaries/` or re-downloading from GitHub/MDN if corrupt/missing. This exists because these binaries are stripped from git via `.gitattributes`/`.gitignore` conventions in this project.

**Types are duplicated, not shared.** `types.ts` (repo root, used by `server.ts`) and `src/types.ts` (used by frontend) define overlapping shapes (`MediaItem`, `AppSettings`, etc.) independently — there's no shared package. Update both if you change a shape that crosses the API boundary.

**Env vars are dual-purpose.** `.env` values (`VITE_*` for branding, `MEDIA_DIR` for the scan root, `GEMINI_API_KEY`/`APP_URL` for AI Studio integration) are read both by Vite (client-exposed `VITE_*` vars via `import.meta.env`) and by the Node server (`MEDIA_DIR` via `process.env`) from the same file.

## Stray files

`server - Copy.ts`, `server.ts.old`, and `src/components/VideoPlayer - Copy.tsx` are backup snapshots left in the working tree, not part of the build — don't edit them expecting effect, and don't treat them as a second source of truth for current behavior.
