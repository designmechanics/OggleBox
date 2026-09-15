![OggleBox Preview](https://raw.githubusercontent.com/designmechanics/OggleBox/refs/heads/main/public/ogglebox.jpg)

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

---

## 🛠️ LAN Access & Troubleshooting

### Why `SSL_ERROR_RX_RECORD_TOO_LONG` occurs

If you try to access the server from a remote machine (e.g. Windows 11 accessing a Linux server via `192.168.1.39:3000`) and see:

> **Secure Connection Failed**
> `SSL_ERROR_RX_RECORD_TOO_LONG`

**Cause:** Modern web browsers (such as Firefox, Chrome, or Edge) often have **HTTPS-Only Mode** or automatic HTTPS upgrades enabled. When you type `192.168.1.39:3000` or select a auto-completed history entry, the browser sends an **HTTPS** request (`https://192.168.1.39:3000`) to an **HTTP-only** server.
The HTTP server responds with plain text (`HTTP/1.1 200 OK`), but the browser interprets the `HTTP...` bytes as TLS handshake records. Because `'HT'` parses as a TLS record size of 18,484 bytes (exceeding the maximum allowed 16,384 bytes in TLS), the browser aborts with `SSL_ERROR_RX_RECORD_TOO_LONG`.

### How to Fix / Avoid it:

1. **Explicitly use `http://` in the browser URL bar**:
   - Type `http://192.168.1.39:3000` (make sure to include `http://`).
2. **Disable HTTPS-Only Mode for local IP addresses**:
   - In Firefox: `Settings` -> `Privacy & Security` -> `HTTPS-Only Mode` -> select *Don't enable HTTPS-Only Mode* or add an exception for your LAN IP.
   - In Chrome/Edge: `Settings` -> `Privacy & Security` -> `Security` -> turn off *Always use secure connections*.
3. **Enable SSL/TLS Support on OggleBox (Optional)**:
   If you want to serve OggleBox over HTTPS on your local network:
   - Generate or obtain a TLS certificate (e.g. using `mkcert` or self-signed certificates).
   - In your `.env` file, specify the key and cert paths:
     ```env
     SSL_KEY="./certs/server.key"
     SSL_CERT="./certs/server.crt"
     ```
   - Restart the server. OggleBox will now run natively over HTTPS (`https://192.168.1.39:3000`).

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
