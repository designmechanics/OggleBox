import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
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
    },
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {
        ignored: [
          '**/media/**',
          '**/node_modules/**',
          '**/.git/**',
          '**/.backups/**',
          '**/library-cache.json',
        ]
      },
      fs: {
        deny: ['**/media/**']
      }
    },
  };
});
