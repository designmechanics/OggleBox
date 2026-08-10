import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    publicDir: false as const,
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    optimizeDeps: {
      entries: ['src/**/*.{ts,tsx}'],
      exclude: ['fluent-ffmpeg', 'express', 'ffmpeg-static', '@ffmpeg-installer/ffmpeg', '@ffprobe-installer/ffprobe']
    },
    build: {
      assetsInlineLimit: 0,
      copyPublicDir: false,
    },
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {
        ignored: [
          '**/media/**',
          '**/public/**',
          '**/node_modules/**',
          '**/.git/**',
          '**/.backups/**',
          '**/library-cache.json',
          '**/*.{mp4,mkv,webm,mov,avi,m4v,flv,ts,wmv,jpg,jpeg,png,json,bak}'
        ]
      },
      fs: {
        deny: ['**/media/**', '**/public/**']
      }
    },
  };
});
