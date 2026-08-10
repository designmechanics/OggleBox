# OggleBox Server

A fluid, lightweight local media server built with Express and React.

## Features
- **Video Streaming**: HTTP Range Requests for efficient video seeking.
- **Zero Config**: Scans the media directory automatically.
- **Transcoding & Probe**: Uses `ffmpeg` and `ffprobe` to gather deep meta and transcode video.
- **Sub-category Support**: Recursively scans `media/` and groups videos.
- **Progress Tracking**: Remembers playback progress in local storage.

---

## ⚠️ Critical System Requirement: FFmpeg

**FFmpeg is a hard system dependency.** While this project uses `ffmpeg-static` and `@ffprobe-installer/ffprobe` to attempt automatic binary resolution, relying purely on the static binaries can fail depending on your OS architecture or if you need hardware acceleration (NVENC, QuickSync, etc). 

If you want absolute stability, you **must** install FFmpeg globally on your system and ensure it is available in your system's `PATH`.

Alternatively, use the provided **Docker** setup which bundles Node and FFmpeg into an identical environment everywhere.

---

## Installation & Setup

### Option 1: Docker (Recommended for all platforms)

We provide a `Dockerfile` and `docker-compose.yml` that bundles Node.js and FFmpeg together so it runs identically everywhere without host-system pollution.

1. Ensure [Docker](https://docs.docker.com/get-docker/) and Docker Compose are installed.
2. Run the application:
   ```bash
   docker-compose up -d
   ```
3. Access the app at `http://localhost:3000`. Place your media in the `./media` directory.

### Option 2: Native Install (Linux / macOS)

**1. Install Node.js**
Ensure you have Node.js (v18 or higher) installed.

**2. Install FFmpeg**
- **Ubuntu/Debian**:
  ```bash
  sudo apt update
  sudo apt install ffmpeg
  ```
- **macOS (Homebrew)**:
  ```bash
  brew install ffmpeg
  ```

**3. Configure Environment**
Copy the example environment file and edit it to set your paths:
```bash
cp .env.example .env
```
Inside `.env`, you can set the `MEDIA_DIR` to point to your media folder (e.g., `MEDIA_DIR="/home/user/Videos"`). If left unset, it defaults to the `./media` folder inside the project.

**4. Install Dependencies & Run**
```bash
npm install
npm run build
npm start
```
*(Or use `npm run dev` for the development server).*

### Option 3: Native Install (Windows)

**1. Install Node.js**
Download and install Node.js (v18 or higher) from [nodejs.org](https://nodejs.org/).

**2. Install FFmpeg**
Windows does not come with FFmpeg by default, and `ffmpeg-static` can sometimes fail on Windows depending on execution policies.

- Download the latest Windows build of FFmpeg from [gyan.dev](https://www.gyan.dev/ffmpeg/builds/) or [BtbN](https://github.com/BtbN/FFmpeg-Builds/releases).
- Extract the zip file (e.g., to `C:\ffmpeg`).
- **Add FFmpeg to your PATH**:
  1. Open the Start Search, type in "env", and select **Edit the system environment variables**.
  2. Click the **Environment Variables...** button.
  3. Under **System variables**, find and select the `Path` variable, then click **Edit...**.
  4. Click **New** and add the path to the FFmpeg `bin` folder (e.g., `C:\ffmpeg\bin`).
  5. Click **OK** to save and apply.
- Open a new Command Prompt or PowerShell and type `ffmpeg -version` to verify.

**3. Configure Environment**
Copy `.env.example` to `.env`.
Inside `.env`, set your media directory path. Note that in Windows, you should use double backslashes or forward slashes for paths in the `.env` file:
```env
MEDIA_DIR="C:/Users/YourName/Videos"
```

**4. Install Dependencies & Run**
```cmd
npm install
npm run build
npm start
```
*(Or use `npm run dev` for the development server).*
