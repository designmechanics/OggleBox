# OggleBox - Pro Features Roadmap & Analysis

## 1. Recently Implemented "Pro" Features
The following advanced features have been successfully implemented to bridge the gap between OggleBox and enterprise streaming solutions (like Plex, Jellyfin, and Emby):

- **Timeline Preview Thumbnails (Scrubber Hover)**
  - **How it works**: Just like YouTube or Netflix, hovering over the progress bar extracts and renders a preview thumbnail for that specific timestamp.
  - **Backend Efficiency**: FFmpeg extracts the frame on-the-fly via the `/api/thumb` endpoint, utilizing `mjpeg` scaling for sub-100ms response times. The result is cached persistently with MD5 hashing on the server, meaning subsequent hovers instantly return the cached image without spawning FFmpeg again. Time requests are bucketed to 10-second intervals to maximize cache hits.

- **Dynamic Subtitle Extraction (CC)**
  - **How it works**: Extracts internal subtitle tracks (SRT, ASS, VobSub, etc.) natively embedded inside MKV and MP4 files directly to WebVTT on the fly.
  - **Integration**: The player UI probes the media for available subtitle streams and renders a native CC menu, allowing users to toggle tracks instantly via the HTML5 `<track>` API.

- **Stream Chunk Bounding (10MB Micro-Chunking)**
  - **How it works**: Limits open-ended HTTP streaming range requests to 10MB chunks.
  - **Benefit**: Vastly reduces disk I/O thrashing and memory overhead when scrubbing, allowing the browser to natively queue and pull sequential buffers.

## 2. Identified Gaps & Missing Critical Pro Features
While OggleBox is fast and robust, the following features would elevate it to a fully-featured, production-ready media server:

### A. Advanced Subtitle Rendering (ASS / PGS)
- **The Gap**: Currently, complex anime subtitles (ASS) with custom fonts, colors, and positioning, or image-based subtitles (PGS/VobSub) are either stripped of formatting or fail to render cleanly in native WebVTT.
- **The Solution**: Implement `SubtitlesOctopus` (libass compiled to WebAssembly) or `JASSUB` in the frontend to render broadcast-quality ASS subtitles directly over the `<video>` canvas. For image-based subtitles, implement on-the-fly server-side subtitle burn-in via FFmpeg transcode mode (`-vf subtitles=file.mkv`).

### B. Background Sprite-Sheet Generation (BIF / VTT)
- **The Gap**: Currently, preview thumbnails are generated JIT (Just-In-Time) when the user hovers. If they hover rapidly over unseen parts of a massive 4K movie, there is a slight 100-200ms delay.
- **The Solution**: Implement a background worker (e.g., bullmq or a native Node background interval) that scans new media and generates a `.bif` (Roku Base Index Frame) or a master `.jpg` sprite-sheet + WebVTT map. The frontend would download this single sprite-sheet and use CSS `background-position` to render instantly with zero latency.

### C. Hardware-Accelerated Transcoding (NVENC / QuickSync)
- **The Gap**: The `/api/transcode` route currently relies on CPU encoding (`libx264`). This is fine for 1080p but will choke the CPU when burning subtitles into a 4K HEVC stream.
- **The Solution**: Probe the host OS for hardware accelerators and dynamically inject FFmpeg flags (`h264_nvenc` for NVIDIA, `h264_qsv` for Intel QuickSync, or `h264_videotoolbox` for macOS).

### D. Multi-User Authentication & Watch State Sync (Trakt.tv)
- **The Gap**: Local storage currently saves playback progress. This doesn't sync across devices or multiple users.
- **The Solution**: Move watch states and resume points to a local SQLite database on the server, tied to user profiles. Add a Trakt.tv integration hook to automatically scrobble watched media to the cloud.

### E. Chapter Parsing & Skip Intro
- **The Gap**: MKV chapters are ignored.
- **The Solution**: Extract chapter metadata via `ffprobe` and render chapter markers on the progress bar. Combine this with acoustic fingerprinting (or user-submitted timestamps like SponsorBlock) to render a "Skip Intro" button during TV show theme songs.

### F. Gapless Audio & ReplayGain for Music
- **The Gap**: The audio player is beautiful (with its Web Audio API visualizer) but lacks audio normalization and gapless playback between tracks.
- **The Solution**: Implement ReplayGain metadata parsing to normalize volume across albums, and preload the next audio track in memory 5 seconds before the current one ends.
