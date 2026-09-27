import { build } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import fs from 'fs';

async function runBuild() {
  console.log('Building WhyUI Edge Extension...');

  // Ensure dist is clean
  if (fs.existsSync('dist')) {
    fs.rmSync('dist', { recursive: true, force: true });
  }
  fs.mkdirSync('dist', { recursive: true });

  // 1. Build Popup (React app) and Background Service Worker (ES module)
  console.log('Phase 1: Building popup and background service worker...');
  await build({
    configFile: false,
    plugins: [react()],
    build: {
      outDir: 'dist',
      emptyOutDir: false,
      rollupOptions: {
        input: {
          popup: resolve('src/popup/index.html'),
          background: resolve('src/background/serviceWorker.ts'),
        },
        output: {
          entryFileNames: (chunkInfo) => {
            if (chunkInfo.name === 'background') return 'background.js';
            return 'assets/[name].js';
          },
          chunkFileNames: 'assets/[name].js',
          assetFileNames: 'assets/[name].[ext]',
        },
      },
    },
  });

  // 2. Build Content Script as a standalone IIFE bundle (no external imports)
  console.log('Phase 2: Building content script (standalone IIFE)...');
  await build({
    configFile: false,
    build: {
      outDir: 'dist',
      emptyOutDir: false,
      lib: {
        entry: resolve('src/content/contentScript.ts'),
        name: 'WhyUIContentScript',
        formats: ['iife'],
        fileName: () => 'contentScript.js',
      },
      rollupOptions: {
        output: {
          extend: true,
          inlineDynamicImports: true,
        },
      },
    },
  });

  // 3. Copy manifest and public assets
  console.log('Phase 3: Copying manifest and icons...');
  fs.copyFileSync('manifest.json', 'dist/manifest.json');
  if (fs.existsSync('public')) {
    fs.cpSync('public', 'dist', { recursive: true });
  }

  console.log('Build complete! Ready for Microsoft Edge.');
}

runBuild().catch((err) => {
  console.error('Build error:', err);
  process.exit(1);
});
