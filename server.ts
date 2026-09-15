import express from "express";
import path from "path";
import fs from "fs";
import os from "os";
import https from "https";
import http from "http";
import { createServer as createViteServer } from "vite";
import ffmpeg from "fluent-ffmpeg";
import ffmpegStatic from "ffmpeg-static";
import ffprobeInstaller from "@ffprobe-installer/ffprobe";

ffmpeg.setFfmpegPath(ffmpegStatic as string);
ffmpeg.setFfprobePath(ffprobeInstaller.path);

const PORT = 3000;
const MEDIA_DIR = process.env.MEDIA_DIR ? path.resolve(process.env.MEDIA_DIR) : path.join(process.cwd(), "media");
const PUBLIC_DIR = path.join(process.cwd(), "public");
const CACHE_FILE = path.join(process.cwd(), "library-cache.json");

function logStep(moduleName: string, step: string, message: string, detail?: any) {
  const time = new Date().toISOString().split('T')[1].slice(0, 8);
  if (detail !== undefined) {
    console.log(`[${time}] [${moduleName}] [${step}] ${message}`, detail);
  } else {
    console.log(`[${time}] [${moduleName}] [${step}] ${message}`);
  }
}

logStep("Boot", "Step 1/5", "Checking system directories...");
[MEDIA_DIR, PUBLIC_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    logStep("Boot", "DirInit", `Created directory: ${dir}`);
  }
});

const sampleVideoPath = path.join(PUBLIC_DIR, "sample-big-buck-bunny.mp4");

function downloadSampleVideo(url: string, destPath: string, maxRedirects = 5): Promise<boolean> {
  return new Promise((resolve) => {
    if (maxRedirects <= 0 || !url) return resolve(false);
    logStep("Boot", "SampleDownload", `Downloading sample binary from ${url}...`);
    const tempPath = `${destPath}.tmp.${Date.now()}`;
    const client = url.startsWith("https") ? https : http;

    const req = client.get(url, (res) => {
      if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        let redirectUrl = res.headers.location;
        if (!redirectUrl.startsWith("http")) {
          const parsed = new URL(url);
          redirectUrl = `${parsed.protocol}//${parsed.host}${redirectUrl}`;
        }
        return downloadSampleVideo(redirectUrl, destPath, maxRedirects - 1).then(resolve);
      }
      if (res.statusCode !== 200) {
        logStep("Boot", "SampleDownloadError", `Failed to download binary, HTTP ${res.statusCode}`);
        return resolve(false);
      }
      const file = fs.createWriteStream(tempPath);
      res.pipe(file);
      file.on("finish", () => {
        file.close(() => {
          try {
            if (fs.existsSync(destPath)) fs.unlinkSync(destPath);
            fs.renameSync(tempPath, destPath);
            logStep("Boot", "SampleDownloadOK", `Binary download completed for ${path.basename(destPath)}`);
            resolve(true);
          } catch (e) {
            logStep("Boot", "SampleDownloadError", `Failed to finalize downloaded binary: ${e}`);
            if (fs.existsSync(tempPath)) { try { fs.unlinkSync(tempPath); } catch {} }
            resolve(false);
          }
        });
      });
    });

    req.on("error", (err) => {
      logStep("Boot", "SampleDownloadError", err.message);
      if (fs.existsSync(tempPath)) { try { fs.unlinkSync(tempPath); } catch {} }
      resolve(false);
    });
  });
}

async function verifyAndFixBinary(fileName: string, backupName: string, remoteUrl: string, minSize: number, magicCheck: (buf: Buffer) => boolean): Promise<boolean> {
  const targetPath = path.join(PUBLIC_DIR, fileName);
  const backupPath = path.join(process.cwd(), ".backups", "binaries", backupName);

  let isValid = false;
  if (fs.existsSync(targetPath) && fs.statSync(targetPath).size >= minSize) {
    try {
      const fd = fs.openSync(targetPath, 'r');
      const buf = Buffer.alloc(32);
      fs.readSync(fd, buf, 0, 32, 0);
      fs.closeSync(fd);
      if (magicCheck(buf)) {
        isValid = true;
      }
    } catch (e) {
      isValid = false;
    }
  }

  if (isValid) {
    logStep("Boot", "BinaryCheck", `Verified ${fileName} binary on disk (${formatBytes(fs.statSync(targetPath).size)}).`);
    return true;
  }

  logStep("Boot", "BinaryCheck", `Corrupted or missing ${fileName} detected! Restoring...`);

  // Try backup first
  if (fs.existsSync(backupPath) && fs.statSync(backupPath).size >= minSize) {
    try {
      fs.copyFileSync(backupPath, targetPath);
      logStep("Boot", "BinaryCheck", `Restored ${fileName} from local backup (${formatBytes(fs.statSync(targetPath).size)}).`);
      return true;
    } catch (e) {
      logStep("Boot", "BinaryCheck", `Backup restore failed for ${fileName}: ${e}`);
    }
  }

  // Otherwise download from remote URL
  if (remoteUrl) {
    const downloaded = await downloadSampleVideo(remoteUrl, targetPath);
    if (downloaded) {
      // Backup new clean copy
      try {
        const backupDir = path.dirname(backupPath);
        if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });
        fs.copyFileSync(targetPath, backupPath);
      } catch {}
      return true;
    }
  }
  return false;
}

async function healAllKnownBinaries() {
  await verifyAndFixBinary(
    "ogglebox.jpg",
    "ogglebox.jpg",
    "https://raw.githubusercontent.com/designmechanics/OggleBox/main/public/ogglebox.jpg",
    100000,
    (buf) => buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff
  );

  await verifyAndFixBinary(
    "ogglebox.mp4",
    "ogglebox.mp4",
    "https://raw.githubusercontent.com/designmechanics/OggleBox/main/public/ogglebox.mp4",
    100000,
    (buf) => buf.toString('binary').includes('ftyp') || buf.toString('binary').includes('moov') || buf.toString('binary').includes('isom')
  );

  await verifyAndFixBinary(
    "sample-big-buck-bunny.mp4",
    "sample-big-buck-bunny.mp4",
    "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4",
    100000,
    (buf) => buf.toString('binary').includes('ftyp') || buf.toString('binary').includes('moov') || buf.toString('binary').includes('isom')
  );
}

// Initial binary heal on boot
healAllKnownBinaries();

function resolveVideoFilePath(rawInputPath: string): { filePath: string | null; searched: string[] } {
  const searched: string[] = [];
  if (!rawInputPath) return { filePath: null, searched };

  let decoded = decodeURIComponent(rawInputPath);
  decoded = decoded.replace(/\\/g, '/');
  decoded = decoded.replace(/^[A-Za-z]:\//, '');

  let clean = decoded
    .replace(/^api\/stream\//, '')
    .replace(/^api\/transcode\//, '')
    .replace(/^transcode\//, '')
    .replace(/^\/+/, '');

  let try1 = path.resolve(process.cwd(), clean);
  searched.push(try1);
  if (fs.existsSync(try1) && fs.statSync(try1).isFile()) {
    return { filePath: try1, searched };
  }

  const mediaIdx = decoded.indexOf('media/');
  if (mediaIdx !== -1) {
    let try2 = path.resolve(process.cwd(), decoded.substring(mediaIdx));
    searched.push(try2);
    if (fs.existsSync(try2) && fs.statSync(try2).isFile()) {
      return { filePath: try2, searched };
    }
  }

  let try3 = path.resolve(MEDIA_DIR, clean.replace(/^media\//, ''));
  searched.push(try3);
  if (fs.existsSync(try3) && fs.statSync(try3).isFile()) {
    return { filePath: try3, searched };
  }

  let baseName = path.basename(clean);
  let try4 = path.resolve(MEDIA_DIR, baseName);
  searched.push(try4);
  if (fs.existsSync(try4) && fs.statSync(try4).isFile()) {
    return { filePath: try4, searched };
  }

  let try5 = path.resolve(PUBLIC_DIR, baseName);
  searched.push(try5);
  if (fs.existsSync(try5) && fs.statSync(try5).isFile()) {
    return { filePath: try5, searched };
  }

  return { filePath: null, searched };
}

function generateThumbnailAtTimestamp(videoPath: string, thumbnailPath: string, filename: string, timestamp: number): Promise<boolean> {
  return new Promise((resolve) => {
    const thumbDir = path.dirname(thumbnailPath);
    if (!fs.existsSync(thumbDir)) {
      fs.mkdirSync(thumbDir, { recursive: true });
    }

    // Temp name must keep a .jpg extension — ffmpeg picks the muxer from the
    // output extension, and a trailing ".tmp.<epoch>" makes it bail with
    // "Unable to choose an output format". -f image2 is belt-and-braces.
    const tempPath = `${thumbnailPath}.tmp.${Date.now()}.jpg`;
    logStep("Thumbnail", "FFmpeg", `Extracting frame for "${filename}" at ${timestamp}s...`);

    ffmpeg(videoPath)
      .seekInput(timestamp)
      .outputOptions(['-vframes 1', '-q:v 2', '-f image2', '-update 1'])
      .output(tempPath)
      .on("end", () => {
        if (fs.existsSync(tempPath) && fs.statSync(tempPath).size > 100) {
          try {
            if (fs.existsSync(thumbnailPath)) {
              fs.unlinkSync(thumbnailPath);
            }
            fs.renameSync(tempPath, thumbnailPath);
            logStep("Thumbnail", "OK", `Created thumbnail for "${filename}"`);
            resolve(true);
            return;
          } catch (e) {
            logStep("Thumbnail", "Warn", `Failed to rename temp thumbnail: ${e}`);
          }
        }
        if (fs.existsSync(tempPath)) {
          try { fs.unlinkSync(tempPath); } catch {}
        }
        resolve(false);
      })
      .on("error", (err) => {
        logStep("Thumbnail", "Warn", `FFmpeg frame extraction failed at ${timestamp}s for "${filename}": ${err.message}`);
        if (fs.existsSync(tempPath)) {
          try { fs.unlinkSync(tempPath); } catch {}
        }
        resolve(false);
      })
      .run();
  });
}

async function generateThumbnail(videoPath: string, thumbnailPath: string, filename: string, targetSeconds: number = 30): Promise<boolean> {
  const thumbDir = path.dirname(thumbnailPath);
  if (!fs.existsSync(thumbDir)) {
    fs.mkdirSync(thumbDir, { recursive: true });
  }

  let seekTime = targetSeconds;
  try {
    const metadata: any = await new Promise((resolve) => {
      const timer = setTimeout(() => resolve(null), 2500);
      ffmpeg.ffprobe(videoPath, (err, meta) => {
        clearTimeout(timer);
        resolve(err ? null : meta);
      });
    });

    const duration = metadata?.format?.duration || 0;
    if (duration > 0) {
      if (duration <= targetSeconds) {
        seekTime = Math.max(0.5, Math.floor(duration / 2));
      } else {
        seekTime = targetSeconds;
      }
    } else {
      seekTime = 1;
    }
  } catch {
    seekTime = 1;
  }

  let success = await generateThumbnailAtTimestamp(videoPath, thumbnailPath, filename, seekTime);
  if (success) return true;

  if (seekTime !== 1) {
    logStep("Thumbnail", "Retry", `Retrying "${filename}" at 1.0s fallback...`);
    success = await generateThumbnailAtTimestamp(videoPath, thumbnailPath, filename, 1.0);
    if (success) return true;
  }

  if (seekTime !== 0.1) {
    logStep("Thumbnail", "Retry", `Retrying "${filename}" at 0.1s fallback...`);
    success = await generateThumbnailAtTimestamp(videoPath, thumbnailPath, filename, 0.1);
  }
  return success;
}

const VIDEO_EXTENSIONS = [".mp4", ".mkv", ".webm", ".mov", ".avi", ".m4v", ".flv", ".ts", ".wmv"];

async function scanDirectoryForVideos(dirPath: string): Promise<string[]> {
  let results: string[] = [];
  try {
    const list = await fs.promises.readdir(dirPath, { withFileTypes: true });
    for (const dirent of list) {
      if (dirent.name === "node_modules" || dirent.name === "dist" || dirent.name === ".git" || dirent.name === ".cache" || dirent.name.startsWith(".")) {
        continue;
      }
      const fullPath = path.join(dirPath, dirent.name);
      if (dirent.isDirectory()) {
        const subResults = await scanDirectoryForVideos(fullPath);
        results = results.concat(subResults);
      } else {
        const ext = path.extname(dirent.name).toLowerCase();
        if (VIDEO_EXTENSIONS.includes(ext)) {
          const relPath = path.relative(process.cwd(), fullPath).replace(/\\/g, '/');
          results.push(relPath);
        }
      }
    }
  } catch (err) {}
  return results;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

async function buildLibraryFromFiles(files: string[]): Promise<any[]> {
  const results = [];
  const batchSize = 100;
  for (let i = 0; i < files.length; i += batchSize) {
    const batch = files.slice(i, i + batchSize);
    const batchResults = await Promise.all(batch.map(async (file) => {
      const fullPath = path.join(process.cwd(), file);
      const baseName = path.basename(file, path.extname(file));
      const ext = path.extname(file).replace('.', '').toUpperCase();
      const relParts = file.split('/');
      
      const thumbnailRelPath = file.replace(/\.[^/.]+$/, ".jpg");
      const thumbnailFullPath = path.join(process.cwd(), thumbnailRelPath);
      
      let hasThumbnail = false;
      try {
        await fs.promises.access(thumbnailFullPath);
        hasThumbnail = true;
      } catch {}

      let category = "Root";
      if (relParts.length > 2) {
        category = relParts.slice(1, -1).join('/');
      }
      
      let stats = { size: 0, mtime: new Date() };
      try {
        stats = await fs.promises.stat(fullPath) as any;
      } catch {}
      
      return {
        id: file,
        filename: path.basename(file),
        path: file,
        category: category,
        url: `/api/stream/${file.split('/').map(encodeURIComponent).join('/')}`,
        title: baseName,
        year: new Date(stats.mtime).getFullYear(),
        size: stats.size,
        sizeFormatted: formatBytes(stats.size),
        modifiedAt: new Date(stats.mtime).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }),
        format: ext,
        description: "",
        poster: hasThumbnail ? `/${thumbnailRelPath}` : "/placeholder.jpg"
      };
    }));
    results.push(...batchResults);
  }
  return results;
}

let inMemoryLibraryCache: any[] | null = null;

function saveLibraryCache(videos: any[]) {
  inMemoryLibraryCache = videos;
  logStep("Cache", "Save", `Updating RAM cache with ${videos.length} items and writing to disk...`);
  fs.promises.writeFile(CACHE_FILE, JSON.stringify(videos, null, 2), "utf-8")
    .then(() => logStep("Cache", "DiskOK", `Successfully wrote ${videos.length} items to library-cache.json`))
    .catch((err) => logStep("Cache", "DiskError", `Failed to save library cache: ${err.message}`));
}

function getLocalNetworkAddresses(): string[] {
  const addresses: string[] = [];
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name] || []) {
      if (iface.family === "IPv4" && !iface.internal) {
        addresses.push(iface.address);
      }
    }
  }
  return addresses;
}

function loadLibraryCache(): any[] | null {
  if (inMemoryLibraryCache !== null) {
    return inMemoryLibraryCache;
  }
  try {
    if (fs.existsSync(CACHE_FILE)) {
      const data = fs.readFileSync(CACHE_FILE, "utf-8");
      const videos = JSON.parse(data);
      if (Array.isArray(videos)) {
        inMemoryLibraryCache = videos;
        logStep("Cache", "RAMLoaded", `Loaded ${videos.length} items from library-cache.json into RAM.`);
        return inMemoryLibraryCache;
      }
    }
  } catch (err) {
    logStep("Cache", "ReadError", `Failed to read library cache: ${err.message}`);
  }
  return null;
}

async function startServer() {
  logStep("Boot", "Step 3/5", "Preloading RAM cache from library-cache.json...");
  const preloaded = loadLibraryCache();

  const app = express();

  const defaultKeyPath = path.join(process.cwd(), "certs", "server.key");
  const defaultCertPath = path.join(process.cwd(), "certs", "server.crt");

  const sslKeyPath = process.env.SSL_KEY || (fs.existsSync(defaultKeyPath) ? defaultKeyPath : null);
  const sslCertPath = process.env.SSL_CERT || (fs.existsSync(defaultCertPath) ? defaultCertPath : null);
  const isHttps = Boolean(sslKeyPath && sslCertPath && fs.existsSync(sslKeyPath) && fs.existsSync(sslCertPath));

  let httpServer: http.Server | https.Server;
  if (isHttps) {
    const options = {
      key: fs.readFileSync(sslKeyPath!),
      cert: fs.readFileSync(sslCertPath!)
    };
    httpServer = https.createServer(options, app);
    logStep("Boot", "Security", "SSL/TLS enabled via environment certificates.");
  } else {
    httpServer = http.createServer(app);
    // Detect HTTPS clients connecting to HTTP port (which triggers SSL_ERROR_RX_RECORD_TOO_LONG)
    httpServer.on("connection", (socket) => {
      socket.once("data", (buffer) => {
        // TLS ClientHello starts with byte 0x16 (22) and major version 0x03 (3)
        if (buffer.length >= 3 && buffer[0] === 0x16 && buffer[1] === 0x03) {
          logStep(
            "SecurityWarn",
            "SSL_Mismatch",
            `Client from ${socket.remoteAddress} attempted HTTPS connection to HTTP port ${PORT}. ` +
            `This causes 'SSL_ERROR_RX_RECORD_TOO_LONG'. Access the server using http:// explicitly.`
          );
        }
      });
    });
  }

  app.use((req, res, next) => {
    const start = Date.now();
    const reqTime = new Date().toISOString().split('T')[1].slice(0, 8);
    res.on('finish', () => {
      const duration = Date.now() - start;
      console.log(`[${reqTime}] [HTTP ${res.statusCode}] ${req.method} ${req.originalUrl} (${duration}ms)`);
    });
    next();
  });

  logStep("Boot", "Step 4/5", "Registering Express routes and static mounts...");
  app.use(express.json());
  
  app.use("/media", express.static(MEDIA_DIR));
  app.use("/public", express.static(PUBLIC_DIR));
  app.use(express.static(PUBLIC_DIR));
  
  let currentScanProgress = {
    inProgress: false,
    current: 0,
    total: 0,
    currentFile: "",
    added: 0,
    errors: 0
  };

  app.get("/api/library", async (req, res) => {
    const forceRefresh = req.query.refresh === "true";
    logStep("LibraryAPI", "Step 1/3", `Library endpoint hit (forceRefresh=${forceRefresh})`);

    if (!forceRefresh) {
      const cached = loadLibraryCache();
      if (cached !== null) {
        logStep("LibraryAPI", "Step 2/3", `RAM Cache HIT: Returning ${cached.length} items immediately (0ms)`);
        return res.json(cached);
      }
    }

    logStep("LibraryAPI", "Step 2/3", "Cache MISS or forced refresh: Scanning media directories...");
    const t0 = Date.now();
    const mediaFiles = await scanDirectoryForVideos(MEDIA_DIR);
    const publicFiles = await scanDirectoryForVideos(PUBLIC_DIR);
    const files = Array.from(new Set([...mediaFiles, ...publicFiles]));
      
    const currentCache = loadLibraryCache();
    if (currentCache && currentCache.length === files.length) {
       logStep("LibraryAPI", "Fast Check", `Cache matches disk count (${files.length}). Returning cached items.`);
       return res.json(currentCache);
    }
    logStep("LibraryAPI", "Step 3/3", `Disk scan found ${files.length} video files in ${Date.now() - t0}ms`);

    const videos = await buildLibraryFromFiles(files);
    saveLibraryCache(videos);
    res.json(videos);
  });

  app.get("/api/scan/progress", (req, res) => {
    res.json(currentScanProgress);
  });

  app.get("/api/categories", async (req, res) => {
    try {
      let videos = loadLibraryCache();
      if (!videos) {
        const mediaFiles = await scanDirectoryForVideos(MEDIA_DIR);
        const publicFiles = await scanDirectoryForVideos(PUBLIC_DIR);
        const files = Array.from(new Set([...mediaFiles, ...publicFiles]));
        videos = await buildLibraryFromFiles(files);
      }

      const categoriesMap: Record<string, number> = {};
      videos.forEach(v => {
        const cat = v.category || 'Root';
        categoriesMap[cat] = (categoriesMap[cat] || 0) + 1;
      });

      const categories = Object.keys(categoriesMap).map(cat => ({
        name: cat,
        count: categoriesMap[cat]
      }));

      res.json(categories);
    } catch (err) {
      logStep("Categories", "Error", err);
      res.status(500).json({ error: "Failed to fetch categories" });
    }
  });

  app.post("/api/thumbnail/regenerate", async (req, res) => {
    try {
      const { path: relativePath, timestamp = 30 } = req.body;
      logStep("Regenerate", "Step 1/3", `Manual thumbnail regeneration requested for "${relativePath}"`);

      if (!relativePath) {
        return res.status(400).json({ error: "Path is required" });
      }

      const { filePath } = resolveVideoFilePath(relativePath);
      if (!filePath) {
        logStep("Regenerate", "Error 404", `Video file not found for path: "${relativePath}"`);
        return res.status(404).json({ error: "Video file not found" });
      }

      const thumbnailRelPath = relativePath.replace(/\.[^/.]+$/, ".jpg");
      const thumbnailFullPath = path.join(process.cwd(), thumbnailRelPath);

      logStep("Regenerate", "Step 2/3", `Generating frame at ${timestamp}s...`);
      const ok = await generateThumbnail(filePath, thumbnailFullPath, relativePath, timestamp);

      const cached = loadLibraryCache() || [];
      const updated = cached.map(v => {
        if (v.path === relativePath || v.id === relativePath) {
          return {
            ...v,
            poster: ok ? `/${thumbnailRelPath}?t=${Date.now()}` : "/placeholder.jpg"
          };
        }
        return v;
      });
      saveLibraryCache(updated);

      logStep("Regenerate", "Step 3/3", ok ? "Thumbnail regenerated successfully." : "Thumbnail extraction failed.");

      if (ok) {
        res.json({ 
          status: "success", 
          message: "Thumbnail regenerated successfully",
          poster: `/${thumbnailRelPath}?t=${Date.now()}` 
        });
      } else {
        res.status(500).json({
          status: "error",
          message: "Could not extract video frame for thumbnail"
        });
      }
    } catch (err) {
      logStep("Regenerate", "Error", err);
      res.status(500).json({ error: "Failed to regenerate thumbnail" });
    }
  });

  app.post("/api/scan", async (req, res) => {
    if (currentScanProgress.inProgress) {
      return res.status(409).json({ status: "busy", message: "Scan already in progress", progress: currentScanProgress });
    }

    try {
      currentScanProgress = { inProgress: true, current: 0, total: 0, currentFile: "Scanning media folder...", added: 0, errors: 0 };

      logStep("FolderScan", "Start", "=========================================");
      logStep("FolderScan", "Step 1/3", "Scanning media & public directory structures...");
      const mediaFiles = await scanDirectoryForVideos(MEDIA_DIR);
      const publicFiles = await scanDirectoryForVideos(PUBLIC_DIR);
      const files = Array.from(new Set([...mediaFiles, ...publicFiles]));

      const currentCache = loadLibraryCache();
      if (currentCache && currentCache.length === files.length) {
         logStep("FolderScan", "Fast Check", `Cache matches disk count (${files.length}). Skipping heavy scan.`);
         currentScanProgress.inProgress = false;
         return res.json({ status: "success", message: "Scan skipped: no changes detected", added: 0, errors: 0, total: files.length });
      }
      
      currentScanProgress.total = files.length;
      logStep("FolderScan", "Step 2/3", `Discovered ${files.length} video files. Checking thumbnails...`);

      let added = 0;
      let errors = 0;

      for (let i = 0; i < files.length; i++) {
        const videoRelPath = files[i];
        currentScanProgress.current = i + 1;
        currentScanProgress.currentFile = videoRelPath;

        const thumbnailRelPath = videoRelPath.replace(/\.[^/.]+$/, ".jpg");
        const thumbnailFullPath = path.join(process.cwd(), thumbnailRelPath);
        
        if (!fs.existsSync(thumbnailFullPath) || fs.statSync(thumbnailFullPath).size < 100) {
          logStep("FolderScan", `Progress [${i + 1}/${files.length}]`, `Generating missing thumbnail: "${videoRelPath}"`);
          const videoFullPath = path.join(process.cwd(), videoRelPath);
          const ok = await generateThumbnail(videoFullPath, thumbnailFullPath, videoRelPath);
          if (ok) {
            added++;
          } else {
            errors++;
          }
        } else {
          logStep("FolderScan", `Progress [${i + 1}/${files.length}]`, `Verified existing thumbnail: "${videoRelPath}"`);
        }
        currentScanProgress.added = added;
        currentScanProgress.errors = errors;
      }
      
      logStep("FolderScan", "Step 3/3", `Scan Complete: Processed ${files.length} videos (${added} new thumbnails, ${errors} errors)`);
      logStep("FolderScan", "End", "=========================================");

      const videos = await buildLibraryFromFiles(files);
      saveLibraryCache(videos);

      currentScanProgress.inProgress = false;
      currentScanProgress.currentFile = "Complete";

      res.json({
        status: "success",
        message: `Scan complete: ${files.length} videos processed (${added} new thumbnails, ${errors} errors)`,
        added,
        errors,
        total: videos.length
      });
    } catch (err: any) {
      logStep("FolderScan", "Error", err.message || err);
      currentScanProgress.inProgress = false;
      res.status(500).json({ status: "error", message: `Scan failed: ${err.message || 'Unknown error'}` });
    }
  });

  app.get("/api/transcode/*", (req, res) => {
    let rawPath = req.params[0] || req.url.replace(/^\/api\/transcode\//, "").split('?')[0];
    logStep("Transcode", "Step 1/5", `Transcode request received for raw path: "${rawPath}"`);

    const { filePath, searched } = resolveVideoFilePath(rawPath);

    if (!filePath) {
      logStep("Transcode", "ERROR 404", `File not found for "${rawPath}". Searched locations:`, searched);
      return res.status(404).send(`Transcode file not found: ${rawPath}`);
    }

    logStep("Transcode", "Step 2/5", `Resolved target video file: "${filePath}"`);
    const stat = fs.statSync(filePath);
    logStep("Transcode", "Step 3/5", `Source file size: ${formatBytes(stat.size)}`);

    const startTime = req.query.start ? parseFloat(req.query.start as string) : 0;
    const targetCodec = req.query.codec === 'libx265' ? 'libx265' : 'libx264';
    logStep("Transcode", "Step 4/5", `Spawning FFmpeg pipeline (${targetCodec}/AAC MP4) seeking to t=${startTime}s...`);

    res.contentType('video/mp4');

    let logCounter = 0;
    const profile = req.query.profile as string || 'netflix';
    let ffmpegOptions = [
      '-pix_fmt yuv420p',
      '-ac 2',
      '-movflags frag_keyframe+empty_moov+default_base_moof',
      '-threads 0'
    ];

    if (targetCodec === 'libx265') {
      ffmpegOptions.push('-tag:v hvc1'); // Required for Apple devices to play HEVC mp4 streams natively
    }

    switch(profile) {
      case 'netflix':
        // Netflix-Tier LAN (Pristine): High bandwidth, forced keyframes every 2s
        ffmpegOptions.push('-preset fast', '-crf 18', '-tune film', '-g 60', '-bufsize 10M', '-maxrate 15M', '-profile:v high', '-b:a 192k');
        break;
      case 'smooth':
        // Smooth Action (Zero Latency): Low buffer, zerolatency tuning
        ffmpegOptions.push('-preset veryfast', '-crf 20', '-tune zerolatency', '-g 30', '-bufsize 5M', '-maxrate 8M', '-b:a 192k');
        break;
      case 'anime':
        // Anime / Animation: Tuned for flat colours and longer GOP
        ffmpegOptions.push('-preset fast', '-crf 20', '-tune animation', '-g 120', '-b:a 192k');
        break;
      case 'low':
        // Bandwidth Saver: Fast compression, lower bitrate constraint
        ffmpegOptions.push('-preset superfast', '-crf 28', '-g 60', '-maxrate 3M', '-bufsize 3M', '-b:a 128k');
        break;
      case 'standard':
      default:
        // Standard Balance
        ffmpegOptions.push('-preset veryfast', '-crf 23', '-g 60', '-b:a 192k');
        break;
    }

    const command = ffmpeg(filePath)
      .seekInput(startTime)
      .videoCodec(targetCodec)
      .audioCodec('aac')
      .format('mp4')
      .outputOptions(ffmpegOptions)
      .on('progress', (progress) => {
        logCounter++;
        if (logCounter % 15 === 1) {
          logStep("Transcode", "FFmpegProgress", `Frames: ${progress.frames || 0}, Timemark: ${progress.timemark || '00:00:00'}`);
        }
      })
      .on('error', (err) => {
        if (!err.message.includes('Output stream closed')) {
           logStep("Transcode", "FFmpegError", err.message);
        } else {
           logStep("Transcode", "Closed", "Client stream socket closed.");
        }
      })
      .on('end', () => {
        logStep("Transcode", "Step 5/5", "Transcoding stream completed successfully.");
      });

    command.pipe(res, { end: true });

    req.on("close", () => {
      logStep("Transcode", "ClientDisconnect", "HTTP request connection closed by client, terminating FFmpeg instance.");
      command.kill("SIGKILL");
    });
  });

  app.get("/api/download-zip", async (req, res) => {
    try {
      healAllKnownBinaries();
      logStep("DownloadZip", "Start", "Generating project zip archive via raw stream...");

      const JSZip = (await import("jszip")).default;
      const zip = new JSZip();

      // Recursive directory walker for zip archive
      const addDirToZip = (dirPath: string, zipFolder: any) => {
        const entries = fs.readdirSync(dirPath, { withFileTypes: true });
        for (const entry of entries) {
          const fullPath = path.join(dirPath, entry.name);
          // Skip node_modules, .backups, dist, .git
          if (entry.name === "node_modules" || entry.name === ".backups" || entry.name === "dist" || entry.name === ".git") {
            continue;
          }
          if (entry.isDirectory()) {
            const newZipFolder = zipFolder.folder(entry.name);
            addDirToZip(fullPath, newZipFolder);
          } else if (entry.isFile()) {
            const content = fs.readFileSync(fullPath);
            zipFolder.file(entry.name, content, { binary: true });
          }
        }
      };

      addDirToZip(process.cwd(), zip);

      const zipBuffer = await zip.generateAsync({
        type: "nodebuffer",
        compression: "DEFLATE",
        compressionOptions: { level: 6 }
      });

      logStep("DownloadZip", "Complete", `Zip generated successfully (${formatBytes(zipBuffer.length)}). Streaming to client...`);

      res.setHeader("Content-Type", "application/zip");
      res.setHeader("Content-Disposition", 'attachment; filename="ogglebox-project.zip"');
      res.setHeader("Content-Length", zipBuffer.length);
      res.end(zipBuffer);
    } catch (err: any) {
      logStep("DownloadZip", "Error", err?.message || err);
      res.status(500).json({ error: "Failed to generate uncorrupted ZIP file" });
    }
  });

  app.get("/api/probe/*", (req, res) => {
    let rawPath = req.params[0] || req.url.replace(/^\/api\/probe\//, "").split('?')[0];
    const { filePath } = resolveVideoFilePath(rawPath);
    if (!filePath) {
      return res.status(404).json({ error: "File not found" });
    }
    ffmpeg.ffprobe(filePath, (err, metadata) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      const stat = fs.existsSync(filePath) ? fs.statSync(filePath) : null;
      const videoStream: any = metadata.streams?.find((s: any) => s.codec_type === 'video') || {};
      const audioStream: any = metadata.streams?.find((s: any) => s.codec_type === 'audio') || {};
      res.json({
        duration: metadata.format.duration || 0,
        format: metadata.format.format_name,
        formatLong: metadata.format.format_long_name,
        bitrate: metadata.format.bit_rate,
        size: stat?.size || metadata.format.size,
        modified: stat?.mtime,
        streamsCount: metadata.format.nb_streams,
        video: {
          codec: videoStream.codec_name,
          codecLong: videoStream.codec_long_name,
          profile: videoStream.profile,
          width: videoStream.width,
          height: videoStream.height,
          aspectRatio: videoStream.display_aspect_ratio || (videoStream.width && videoStream.height ? `${videoStream.width}:${videoStream.height}` : undefined),
          fps: videoStream.r_frame_rate || videoStream.avg_frame_rate,
          pixFmt: videoStream.pix_fmt,
          colorSpace: videoStream.color_space,
          colorTransfer: videoStream.color_transfer,
          colorPrimaries: videoStream.color_primaries,
          bitrate: videoStream.bit_rate
        },
        audio: {
          codec: audioStream.codec_name,
          codecLong: audioStream.codec_long_name,
          channels: audioStream.channels,
          channelLayout: audioStream.channel_layout,
          sampleRate: audioStream.sample_rate,
          bitrate: audioStream.bit_rate
        },
        tags: metadata.format.tags || {}
      });
    });
  });

  app.get("/api/stream/*", (req, res) => {
    let rawPath = req.params[0] || req.url.replace(/^\/api\/stream\//, "").split('?')[0];

    const { filePath } = resolveVideoFilePath(rawPath);

    if (!filePath) {
      return res.status(404).send(`Stream file not found: ${rawPath}`);
    }

    const stat = fs.statSync(filePath);
    const fileSize = stat.size;
    const range = req.headers.range;

    const ext = path.extname(filePath).toLowerCase();
    let contentType = "video/mp4";
    if (ext === ".webm") contentType = "video/webm";
    else if (ext === ".mkv") contentType = "video/x-matroska";
    else if (ext === ".mov") contentType = "video/quicktime";
    else if (ext === ".avi") contentType = "video/x-msvideo";
    else if (ext === ".m4v") contentType = "video/mp4";
    else if (ext === ".ts") contentType = "video/mp2t";
    else if (ext === ".flv") contentType = "video/x-flv";
    else if (ext === ".wmv") contentType = "video/x-ms-wmv";

    if (range) {
      const parts = range.replace(/bytes=/, "").split("-");
      const start = parseInt(parts[0], 10);
      let end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

      if (end >= fileSize) {
        end = fileSize - 1;
      }

      if (start >= fileSize || start > end) {
        res.status(416).setHeader("Content-Range", `bytes */${fileSize}`);
        return res.end();
      }

      const chunksize = (end - start) + 1;
      const file = fs.createReadStream(filePath, { start, end, highWaterMark: 1024 * 512 });

      req.on("close", () => {
        file.destroy();
      });

      const head = {
        "Content-Range": `bytes ${start}-${end}/${fileSize}`,
        "Accept-Ranges": "bytes",
        "Content-Length": chunksize,
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=86400",
        "Connection": "keep-alive",
        "Keep-Alive": "timeout=5"
      };
      res.writeHead(206, head);
      file.pipe(res);
    } else {
      const file = fs.createReadStream(filePath, { highWaterMark: 1024 * 1024 * 2 }); // bumped to 2MB for large files

      req.on("close", () => {
        file.destroy();
      });

      const head = {
        "Content-Length": fileSize,
        "Content-Type": contentType,
        "Accept-Ranges": "bytes",
        "Connection": "keep-alive"
      };
      res.writeHead(200, head);
      file.pipe(res);
    }
  });

  app.get("/api/download/*", (req, res) => {
    let rawPath = req.params[0] || req.url.replace(/^\/api\/download\//, "").split('?')[0];
    const { filePath } = resolveVideoFilePath(rawPath);

    if (!filePath) {
      return res.status(404).send(`File not found: ${rawPath}`);
    }

    const filename = path.basename(filePath);
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
    res.setHeader('Content-Type', 'application/octet-stream');
    
    const file = fs.createReadStream(filePath, { highWaterMark: 1024 * 1024 * 5 }); // Fast 5MB chunks for downloading
    file.pipe(res);
  });
  logStep("Boot", "Step 5/5", "Mounting Vite dev server middleware...");
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { 
        middlewareMode: true,
        hmr: { server: httpServer }
      },
      appType: "spa",
    });
    app.use(vite.middlewares);
    logStep("Boot", "Step 5/5", "Vite middleware mounted.");
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
    logStep("Boot", "Step 5/5", "Production static server configured.");
  }

  httpServer.listen(PORT, "0.0.0.0", () => {
    const protocol = isHttps ? "https" : "http";
    const localIps = getLocalNetworkAddresses();

    logStep("Boot", "READY", `=======================================================`);
    logStep("Boot", "READY", `>>> Media server active & listening on 0.0.0.0:${PORT} <<<`);
    logStep("Boot", "READY", `Local access:     ${protocol}://localhost:${PORT}`);
    if (localIps.length > 0) {
      localIps.forEach((ip) => {
        logStep("Boot", "READY", `LAN access:       ${protocol}://${ip}:${PORT}`);
      });
    }
    if (!isHttps) {
      logStep("Boot", "NOTE", `Ensure you type '${protocol}://' in your browser (not https://)`);
      logStep("Boot", "NOTE", `To enable HTTPS, set SSL_KEY and SSL_CERT in your .env file.`);
    }
    logStep("Boot", "READY", `=======================================================`);
  });
}

startServer();
