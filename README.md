# OggleBox Server

A fluid, lightweight local media server built with Express and React.

## Features
- **Video Streaming**: HTTP Range Requests for efficient video seeking.
- **Zero Config**: Scans the media directory automatically.
- **Transcoding & Probe**: Uses `ffmpeg` and `ffprobe` to gather deep meta and transcode video.
- **Sub-category Support**: Recursively scans `media/` and groups videos.
- **Progress Tracking**: Remembers playback progress in local storage.

## How It Works

- **Server Heavy Lifting**: The host machine running OggleBox performs all the intensive processing—metadata extraction, scanning, and real-time transcoding.
- **Lightweight Clients**: The recipient machine (your browser, phone, or TV) simply receives a lightweight HTTP stream. No processing required.
- **On-the-Fly Transcoding**: Browsers have strict codec limitations (which often cause missing audio or black screens). Using the **Transcode** button in the player forces the server to convert unsupported video or audio into a universally playable format in real-time, bypassing client limitations.

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

### Option 2: Automatic AIO Installer (Windows / macOS / Linux)

If you are **unsure if your OS has FFmpeg or Node.js installed**, we provide All-In-One (AIO) installation scripts that will detect missing requirements, install them automatically, and build the application for you.

**For Windows:**
Double-click the `AIO_install.bat` file in the project folder. It will check for Node.js and FFmpeg, download them if missing, and create a convenient `start_ogglebox.bat` file for you to run the server afterwards.

**For macOS / Linux:**
Open your terminal in the project directory, make the script executable, and run it:
```bash
chmod +x AIO_install.sh
./AIO_install.sh
```
It will use your system's package manager to install Node.js (via NVM) and FFmpeg, build the app, and generate a `start_ogglebox.sh` file to easily run the server.

### Option 3: Manual Native Install (Linux / macOS)

*Use this option if you are **sure** your system already has FFmpeg and Node.js (v18+) installed.*

**1. Configure Environment**
Copy the example environment file and edit it to set your paths:
```bash
cp .env.example .env
```
Inside `.env`, you can set the `MEDIA_DIR` to point to your media folder (e.g., `MEDIA_DIR="/home/user/Videos"`). If left unset, it defaults to the `./media` folder inside the project.

**2. Install Dependencies & Run**
```bash
npm install
npm run build
npm start
```
*(Or use `npm run dev` for the development server).*

### Option 4: Manual Native Install (Windows)

*Use this option if you are **sure** your system already has FFmpeg and Node.js (v18+) installed and configured in your system PATH.*

**1. Configure Environment**
Copy `.env.example` to `.env`.
Inside `.env`, set your media directory path. Note that in Windows, you should use double backslashes or forward slashes for paths in the `.env` file:
```env
MEDIA_DIR="C:/Users/YourName/Videos"
```

**2. Install Dependencies & Run**
```cmd
npm install
npm run build
npm start
```
*(Or use `npm run dev` for the development server).*
