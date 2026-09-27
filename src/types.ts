export type MediaItem = {
  id: string;
  filename: string;
  path?: string;
  category?: string;
  url: string;
  title: string;
  year: number;
  size?: number;
  sizeFormatted?: string;
  modifiedAt?: string;
  format?: string;
  description: string;
  poster: string;
  mediaType?: 'video' | 'audio' | 'binary';
};

export type DeepMeta = {
  duration?: number;
  format?: string;
  formatLong?: string;
  bitrate?: number | string;
  size?: number;
  modified?: string;
  streamsCount?: number;
  video?: {
    codec?: string;
    codecLong?: string;
    profile?: string;
    width?: number;
    height?: number;
    aspectRatio?: string;
    fps?: string | number;
    pixFmt?: string;
    colorSpace?: string;
    colorTransfer?: string;
    colorPrimaries?: string;
    bitrate?: number | string;
  };
  audio?: {
    codec?: string;
    codecLong?: string;
    channels?: number;
    channelLayout?: string;
    sampleRate?: number | string;
    bitrate?: number | string;
  };
  tags?: Record<string, any>;
};

export type PrimaryColorKey = 'cyan' | 'pink' | 'emerald' | 'amber';
export type ThemeMode = 'dark' | 'light';
export type TranscodeProfile = 'netflix' | 'smooth' | 'standard' | 'anime' | 'low';

export type AppSettings = {
  appTitle: string;
  pageTitle: string;
  primaryColor: PrimaryColorKey;
  theme: ThemeMode;
  transcodeProfile: TranscodeProfile;
};

export type TorrentFileItem = {
  index: number;
  name: string;
  path: string;
  length: number;
  lengthFormatted: string;
  downloaded: number;
  progress: number;
  isVideo: boolean;
  isAudio?: boolean;
  fileType?: 'video' | 'audio' | 'binary' | 'other';
  streamUrl: string;
};

export type TorrentItem = {
  id: string;
  name: string;
  infoHash: string;
  magnetURI: string;
  progress: number;
  downloadSpeed: number;
  uploadSpeed: number;
  numPeers: number;
  downloaded: number;
  length: number;
  lengthFormatted: string;
  timeRemaining: number;
  ratio: number;
  paused: boolean;
  isSeeding: boolean;
  status: 'downloading' | 'seeding' | 'paused' | 'stopped' | 'metadata' | 'error';
  savePath: string;
  files: TorrentFileItem[];
  wires?: { address: string; client: string; downloadSpeed: number; uploadSpeed: number }[];
  pieceCount?: number;
  downloadedPieces?: number;
  addedAt?: string;
  category?: string;
};

