# 20 Features Injected

1. **View Mode Toggling**: Grid and List dynamic layouts for the media library.
2. **Multi-parameter Sorting**: Sort media by Title, Date Added, or File Size.
3. **Bidirectional Ordering**: Ascending and Descending sort order toggles.
4. **Favorites Engine**: Bookmark favourite media, store in local state, and filter the main view by favourites.
5. **Watch History Persistence**: Automatically tracks progress percentages for all media locally.
6. ~~Resume Playback Modal~~ (Redundant / Scrapped for lack of complexity)
7. ~~Custom Bookmarking System~~ (Redundant / Scrapped for lack of complexity)
8. **Persistent Volume State**: Saves and restores volume and mute preferences across sessions.
9. **Picture-in-Picture (PiP)**: Native PiP integration bound to `P` and a dedicated UI control.
10. **A/B Looping**: Set custom 'A' and 'B' points to loop specific sections of a video.
11. **Playlist Loop Modes**: Toggle between Loop Off, Loop Single, and Loop All.
12. **AutoPlay Next**: Seamlessly transitions to the next video in the filtered playlist upon completion.
13. **Playlist Transport Controls**: UI buttons for skipping to the Previous or Next media item in the current view.
14. **Frame-by-Frame Stepping**: Precision scrubbing forward and backward using `,` and `.`.
15. **Stats for Nerds HUD**: Real-time overlay showing resolution, transcoder status, dropped frames, and buffer health (Toggle with `S`).
16. **Sleep Timer**: 30-minute countdown that automatically pauses playback when the timer expires.
17. **FFprobe Metadata API**: Dedicated `/api/probe` endpoint for deep video metadata extraction.
18. **Dynamic Media Badges**: UI overlays on cards displaying container format and human-readable file sizes.
19. **Expanded Keybind Matrix**: Comprehensive keyboard shortcuts for all new transport and HUD toggles without conflicting with default browser behaviour.
20. **Throttled State Engine**: Highly optimised 250ms/2000ms state update loop to prevent React reconciliation from thrashing the main thread during playback.
21. **Real-Time Web Audio API Visualiser**: intercepts the HTMLMediaElement's audio source, routes it through an `AnalyserNode`, and renders a hardware-accelerated 64-band frequency spectrum via Canvas API overlaid on the player.
22. **Real-Time Video Color Grading Engine**: A custom DSP-like UI matrix providing absolute control over video Brightness, Contrast, Saturation, Sepia, and Hue Phase rotation, applied instantly to the hardware-accelerated compositor.
