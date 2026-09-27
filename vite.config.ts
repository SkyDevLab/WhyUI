/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import fs from 'fs';

// Helper plugin to copy manifest and icons into dist
function copyManifestPlugin() {
  return {
    name: 'copy-manifest-and-public',
    closeBundle() {
      // Ensure dist exists
      if (!fs.existsSync('dist')) {
        fs.mkdirSync('dist', { recursive: true });
      }
      
      // Copy manifest.json
      if (fs.existsSync('manifest.json')) {
        fs.copyFileSync('manifest.json', 'dist/manifest.json');
      }

      // Copy public directory if exists
      if (fs.existsSync('public')) {
        fs.cpSync('public', 'dist', { recursive: true });
      }
    }
  };
}

export default defineConfig({
  plugins: [react(), copyManifestPlugin()],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: process.env.NODE_ENV !== 'production',
    rollupOptions: {
      input: {
        popup: resolve(__dirname, 'src/popup/index.html'),
        background: resolve(__dirname, 'src/background/serviceWorker.ts'),
        contentScript: resolve(__dirname, 'src/content/contentScript.ts'),
      },
      output: {
        entryFileNames: (chunkInfo) => {
          if (chunkInfo.name === 'background') return 'background.js';
          if (chunkInfo.name === 'contentScript') return 'contentScript.js';
          return 'assets/[name].js';
        },
        chunkFileNames: 'assets/[name].js',
        assetFileNames: 'assets/[name].[ext]',
      },
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
  }
});
