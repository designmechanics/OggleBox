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

export type AppSettings = {
  appTitle: string;
  pageTitle: string;
  primaryColor: PrimaryColorKey;
  theme: ThemeMode;
};

