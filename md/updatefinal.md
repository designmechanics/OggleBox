# GUI3B / Motion Stream Update Final Plan

## Task List & Implementation Roadmap

1. **Settings Modal Integration**
   - Place a Settings Gear Icon button to the right of the existing top header navigation area (where "Scan Folder" was).
   - Move the "Scan Folder" trigger into the Settings Modal.

2. **App Branding & Title Customisation**
   - Add state & UI controls in Settings Modal to edit the app title (default: `MOTION STREAM`).
   - Retain primary theme colour styling on the first word of the app title.
   - Dynamic update of the webpage browser title (`document.title`) based on custom app title setting.

3. **Colour Palette & Theme Selector**
   - Primary colour picker in Settings Modal featuring 4 dark-theme optimized accent colours (e.g. Cyan `#22d3ee`, Pink/Magenta `#ec4899`, Emerald `#10b981`, Amber `#f59e0b`).
   - Theme Selector supporting **Dark Mode** (default) and **Light Mode** styling across the workspace and controls.

4. **Two-Column List View Layout**
   - Re-architect the video playlist / list view from a single-column stack into a responsive 2-column grid layout.
   - Increase internal padding for titles, descriptions, and metadata badges for improved readability and negative space.

5. **"DEEP" Metadata Extraction**
   - Add a "DEEP" meta button on video items / player stats.
   - Extract and display deep file/stream inspection details (audio channels, sample rate, bit rate estimates, color space, framerate, buffer stats, and extended container inspection).
