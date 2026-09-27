import path from 'path';
import fs from 'fs';
import type express from 'express';
import type { TorrentItem, TorrentFileItem } from './types';

const VIDEO_EXTENSIONS = [".mp4", ".mkv", ".webm", ".mov", ".avi", ".m4v", ".flv", ".ts", ".wmv"];

function formatBytes(bytes: number): string {
  if (!bytes || bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

interface PersistedTorrent {
  infoHash: string;
  magnetURI: string;
  name: string;
  addedAt: string;
  paused: boolean;
  category?: string;
}

let client: any = null;
let mediaDirectory: string = path.join(process.cwd(), 'media');
let torrentsDirectory: string = path.join(mediaDirectory, 'Torrents');
let stateFilePath: string = path.join(process.cwd(), 'torrents-state.json');
let onCompleteCallback: ((files: string[]) => void) | null = null;

function logTorrent(step: string, message: string, detail?: any) {
  const time = new Date().toISOString().split('T')[1].slice(0, 8);
  if (detail !== undefined) {
    console.log(`[${time}] [TorrentEngine] [${step}] ${message}`, detail);
  } else {
    console.log(`[${time}] [TorrentEngine] [${step}] ${message}`);
  }
}

function loadPersistedState(): PersistedTorrent[] {
  try {
    if (fs.existsSync(stateFilePath)) {
      const data = fs.readFileSync(stateFilePath, 'utf-8');
      const list = JSON.parse(data);
      if (Array.isArray(list)) return list;
    }
  } catch (err: any) {
    logTorrent('StateError', `Failed to load torrents-state.json: ${err.message}`);
  }
  return [];
}

function savePersistedState() {
  if (!client || !client.torrents) return;
  try {
    const list: PersistedTorrent[] = client.torrents.map((t: any) => ({
      infoHash: t.infoHash,
      magnetURI: t.magnetURI || '',
      name: t.name || 'Unnamed Torrent',
      addedAt: t._addedAt || new Date().toISOString(),
      paused: Boolean(t.paused),
      category: t._category || 'Torrents'
    }));
    fs.writeFileSync(stateFilePath, JSON.stringify(list, null, 2), 'utf-8');
  } catch (err: any) {
    logTorrent('StateError', `Failed to save torrents-state.json: ${err.message}`);
  }
}

export function findTorrent(idOrInfoHash: string): any | null {
  if (!client || !client.torrents) return null;
  const clean = String(idOrInfoHash).toLowerCase().trim();
  return client.torrents.find((t: any) => {
    if (!t) return false;
    if (t.infoHash && t.infoHash.toLowerCase() === clean) return true;
    if (t.magnetURI && t.magnetURI.toLowerCase().includes(clean)) return true;
    if (t.name && t.name.toLowerCase() === clean) return true;
    return false;
  }) || null;
}

function formatTorrentModel(t: any): TorrentItem {
  if (!t || typeof t !== 'object') {
    return {
      id: 'unknown',
      name: 'Resolving torrent...',
      infoHash: '',
      magnetURI: '',
      progress: 0,
      downloadSpeed: 0,
      uploadSpeed: 0,
      numPeers: 0,
      downloaded: 0,
      length: 0,
      lengthFormatted: '0 B',
      timeRemaining: 0,
      ratio: 0,
      paused: false,
      isSeeding: false,
      status: 'metadata',
      savePath: torrentsDirectory,
      files: []
    };
  }

  const pieceLength = t.pieceLength || 0;
  const numPieces = t.pieces ? t.pieces.length : 0;
  let downloadedPieces = 0;
  if (t.pieces) {
    for (let i = 0; i < numPieces; i++) {
      const isDownloaded = typeof t.pieces.get === 'function' ? Boolean(t.pieces.get(i)) : Boolean(t.pieces[i]);
      if (isDownloaded) downloadedPieces++;
    }
  }

  const fileList: TorrentFileItem[] = (t.files || []).map((f: any, index: number) => {
    const ext = path.extname(f.name || '').toLowerCase();
    const isVideo = VIDEO_EXTENSIONS.includes(ext);

    return {
      index,
      name: f.name || `file_${index}`,
      path: f.path || f.name || `file_${index}`,
      length: f.length || 0,
      lengthFormatted: formatBytes(f.length || 0),
      downloaded: f.downloaded || (t.done ? f.length : 0),
      progress: f.progress !== undefined ? parseFloat((f.progress * 100).toFixed(1)) : (t.done ? 100 : 0),
      isVideo,
      streamUrl: `/api/torrents/${t.infoHash}/stream/${index}`
    };
  });

  const wireList = (t.wires || []).map((w: any) => ({
    address: w.remoteAddress || 'Swarm Peer',
    client: w.clientName || 'BitTorrent Client',
    downloadSpeed: typeof w.downloadSpeed === 'function' ? w.downloadSpeed() : (w.downloadSpeed || 0),
    uploadSpeed: typeof w.uploadSpeed === 'function' ? w.uploadSpeed() : (w.uploadSpeed || 0)
  }));

  let status: 'downloading' | 'seeding' | 'paused' | 'metadata' | 'error' = 'downloading';
  if (t.paused) {
    status = 'paused';
  } else if (t.done || t.progress === 1) {
    status = 'seeding';
  } else if (!t.files || t.files.length === 0) {
    status = 'metadata';
  }

  return {
    id: t.infoHash || String(Math.random()),
    name: t.name || 'Resolving torrent metadata...',
    infoHash: t.infoHash || '',
    magnetURI: t.magnetURI || '',
    progress: parseFloat(((t.progress || 0) * 100).toFixed(1)),
    downloadSpeed: t.downloadSpeed || 0,
    uploadSpeed: t.uploadSpeed || 0,
    numPeers: t.numPeers || 0,
    downloaded: t.downloaded || 0,
    length: t.length || 0,
    lengthFormatted: formatBytes(t.length || 0),
    timeRemaining: t.timeRemaining || 0,
    ratio: parseFloat((t.ratio || 0).toFixed(2)),
    paused: Boolean(t.paused),
    isSeeding: Boolean(t.done || t.progress === 1),
    status,
    savePath: t.path || torrentsDirectory,
    files: fileList,
    wires: wireList,
    pieceCount: numPieces,
    downloadedPieces,
    addedAt: t._addedAt || new Date().toISOString(),
    category: t._category || 'Torrents'
  };
}

export async function initTorrentManager(
  mediaDir: string,
  onComplete?: (files: string[]) => void
) {
  mediaDirectory = path.resolve(mediaDir);
  torrentsDirectory = path.join(mediaDirectory, 'Torrents');
  onCompleteCallback = onComplete || null;

  if (!fs.existsSync(torrentsDirectory)) {
    fs.mkdirSync(torrentsDirectory, { recursive: true });
    logTorrent('Init', `Created Torrents download folder at: ${torrentsDirectory}`);
  }

  try {
    logTorrent('Init', 'Loading WebTorrent Node engine via dynamic ESM import...');
    const WebTorrentModule = await (new Function('m', 'return import(m)'))('webtorrent');
    const WebTorrent = WebTorrentModule.default || WebTorrentModule;

    client = new WebTorrent({
      maxConns: 60,
      dht: true,
      tracker: true
    });

    logTorrent('Init', 'WebTorrent Node client active with DHT and TCP/UDP swarm enabled.');

    client.on('error', (err: any) => {
      logTorrent('ClientError', err?.message || String(err));
    });

    // Auto-resume persisted torrents
    const persisted = loadPersistedState();
    if (persisted.length > 0) {
      logTorrent('Resume', `Found ${persisted.length} persisted torrent(s) to restore...`);
      for (const item of persisted) {
        try {
          if (item.magnetURI || item.infoHash) {
            const target = item.magnetURI || item.infoHash;
            addTorrentInternal(target, item.category || 'Torrents', item.paused, item.addedAt);
          }
        } catch (e: any) {
          logTorrent('ResumeError', `Failed to restore torrent "${item.name}": ${e.message}`);
        }
      }
    }
  } catch (err: any) {
    logTorrent('InitFatal', `Failed to initialize WebTorrent Node client: ${err.message}`);
  }
}

function attachTorrentListeners(torrent: any) {
  if (!torrent) return;

  torrent.on('ready', () => {
    logTorrent('Ready', `Metadata received for "${torrent.name}" (${(torrent.files || []).length} files, ${formatBytes(torrent.length)})`);
    savePersistedState();
  });

  torrent.on('done', () => {
    logTorrent('Done', `Torrent completed: "${torrent.name}"!`);
    savePersistedState();

    if (onCompleteCallback && torrent.files) {
      const videoFiles = torrent.files
        .filter((f: any) => VIDEO_EXTENSIONS.includes(path.extname(f.name).toLowerCase()))
        .map((f: any) => path.join('media', 'Torrents', f.path || f.name).replace(/\\/g, '/'));

      if (videoFiles.length > 0) {
        onCompleteCallback(videoFiles);
      }
    }
  });

  torrent.on('error', (err: any) => {
    logTorrent('TorrentError', `Error in "${torrent.name || torrent.infoHash}": ${err.message}`);
  });
}

function addTorrentInternal(
  torrentId: string | Buffer,
  category = 'Torrents',
  startPaused = false,
  addedAt?: string
): Promise<any> {
  return new Promise((resolve, reject) => {
    if (!client) {
      return reject(new Error('Torrent client is not initialized'));
    }

    try {
      if (typeof torrentId === 'string') {
        const existing = findTorrent(torrentId);
        if (existing) {
          return resolve(existing);
        }
      }

      const torrent = client.add(torrentId, { path: torrentsDirectory }, (t: any) => {
        t._category = category;
        t._addedAt = addedAt || new Date().toISOString();
        attachTorrentListeners(t);
        if (startPaused) {
          t.pause();
        }
        savePersistedState();
      });

      if (!torrent) {
        return reject(new Error('Failed to create torrent instance'));
      }

      torrent._category = category;
      torrent._addedAt = addedAt || new Date().toISOString();
      attachTorrentListeners(torrent);

      if (torrent.ready) {
        resolve(torrent);
      } else {
        let resolved = false;
        torrent.once('ready', () => {
          if (!resolved) {
            resolved = true;
            resolve(torrent);
          }
        });
        torrent.once('error', (err: any) => {
          if (!resolved) {
            resolved = true;
            reject(err);
          }
        });
        setTimeout(() => {
          if (!resolved) {
            resolved = true;
            resolve(torrent);
          }
        }, 1500);
      }
    } catch (err: any) {
      reject(err);
    }
  });
}

export async function addTorrent(
  torrentInput: string | Buffer,
  category = 'Torrents'
): Promise<TorrentItem> {
  const torrent = await addTorrentInternal(torrentInput, category, false);
  return formatTorrentModel(torrent);
}

export function getAllTorrents(): TorrentItem[] {
  if (!client || !client.torrents) return [];
  return client.torrents.map((t: any) => formatTorrentModel(t));
}

export function getTorrentById(id: string): TorrentItem | null {
  const torrent = findTorrent(id);
  return torrent ? formatTorrentModel(torrent) : null;
}

export function pauseTorrent(id: string): boolean {
  const torrent = findTorrent(id);
  if (torrent && typeof torrent.pause === 'function') {
    torrent.pause();
    savePersistedState();
    logTorrent('Pause', `Paused torrent: "${torrent.name}"`);
    return true;
  }
  return false;
}

export function resumeTorrent(id: string): boolean {
  const torrent = findTorrent(id);
  if (torrent && typeof torrent.resume === 'function') {
    torrent.resume();
    savePersistedState();
    logTorrent('Resume', `Resumed torrent: "${torrent.name}"`);
    return true;
  }
  return false;
}

export function removeTorrent(id: string, deleteFiles = false): Promise<boolean> {
  return new Promise((resolve) => {
    const torrent = findTorrent(id);
    if (!torrent) return resolve(false);

    const torrentName = torrent.name;
    const torrentPath = path.join(torrent.path || torrentsDirectory, torrent.name || '');

    torrent.destroy({ destroyStore: deleteFiles }, (err: any) => {
      savePersistedState();
      logTorrent('Remove', `Removed torrent "${torrentName}" (deleteFiles=${deleteFiles})`);

      if (deleteFiles) {
        try {
          if (fs.existsSync(torrentPath)) {
            const stat = fs.statSync(torrentPath);
            if (stat.isDirectory()) {
              fs.rmSync(torrentPath, { recursive: true, force: true });
            } else {
              fs.unlinkSync(torrentPath);
            }
          }
        } catch (e: any) {
          logTorrent('DeleteWarn', `Could not delete disk path "${torrentPath}": ${e.message}`);
        }
      }

      resolve(!err);
    });
  });
}

export function getTorrentFileResolvedPath(torrentId: string, fileIndex: number): string | null {
  const torrent = findTorrent(torrentId);
  if (!torrent || !torrent.files || !torrent.files[fileIndex]) return null;

  const file = torrent.files[fileIndex];
  const fullPath = path.join(torrent.path || torrentsDirectory, file.path || file.name);
  return fullPath;
}

export function getTorrentFile(torrentId: string, fileIndex: number): any | null {
  const torrent = findTorrent(torrentId);
  if (!torrent || !torrent.files || !torrent.files[fileIndex]) return null;
  return torrent.files[fileIndex];
}

export function streamTorrentFile(
  torrentId: string,
  fileIndex: number,
  req: express.Request,
  res: express.Response
) {
  if (!client) {
    return res.status(503).send('Torrent engine not initialized');
  }

  const torrent = findTorrent(torrentId);
  if (!torrent || !torrent.files || !torrent.files[fileIndex]) {
    return res.status(404).send('Torrent or file not found');
  }

  const file = torrent.files[fileIndex];
  const fileSize = file.length;
  const range = req.headers.range;

  const ext = path.extname(file.name || '').toLowerCase();
  let contentType = 'video/mp4';
  if (ext === '.webm') contentType = 'video/webm';
  else if (ext === '.mkv') contentType = 'video/x-matroska';
  else if (ext === '.mov') contentType = 'video/quicktime';
  else if (ext === '.avi') contentType = 'video/x-msvideo';
  else if (ext === '.m4v') contentType = 'video/mp4';
  else if (ext === '.ts') contentType = 'video/mp2t';
  else if (ext === '.flv') contentType = 'video/x-flv';
  else if (ext === '.wmv') contentType = 'video/x-ms-wmv';

  // Prioritize this file's pieces in the swarm for instant playback
  if (typeof file.select === 'function') {
    file.select();
  }

  if (range) {
    const parts = range.replace(/bytes=/, '').split('-');
    const start = parseInt(parts[0], 10);
    let end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

    if (end >= fileSize) end = fileSize - 1;
    if (start >= fileSize || start > end) {
      res.status(416).setHeader('Content-Range', `bytes */${fileSize}`);
      return res.end();
    }

    const chunksize = end - start + 1;
    const stream = file.createReadStream({ start, end });

    req.on('close', () => {
      try { stream.destroy(); } catch {}
    });

    const head = {
      'Content-Range': `bytes ${start}-${end}/${fileSize}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': chunksize,
      'Content-Type': contentType,
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Keep-Alive': 'timeout=5'
    };
    res.writeHead(206, head);
    stream.pipe(res);
  } else {
    const stream = file.createReadStream();
    req.on('close', () => {
      try { stream.destroy(); } catch {}
    });

    const head = {
      'Content-Length': fileSize,
      'Content-Type': contentType,
      'Accept-Ranges': 'bytes',
      'Connection': 'keep-alive'
    };
    res.writeHead(200, head);
    stream.pipe(res);
  }
}
