import { cp, mkdir } from 'node:fs/promises';
import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';

/* The art lives at ./assets and every URL in the app is a runtime string
   (`assets/portraits/${art}.svg`), so nothing gets bundled and Vite's publicDir
   would not cover it. The old server.js served the repo root, so preview worked
   by accident; copy the tree into dist so the built site matches the dev one. */
function copyRootAssets() {
  return {
    name: 'copy-root-assets',
    apply: 'build',
    async closeBundle() {
      await mkdir(fileURLToPath(new URL('./dist/assets', import.meta.url)), { recursive: true });
      await cp(fileURLToPath(new URL('./assets', import.meta.url)),
        fileURLToPath(new URL('./dist/assets', import.meta.url)), { recursive: true });
    },
  };
}

export default defineConfig({
  // The build is served from /heavens-dice/, not the domain root. Relative
  // URLs keep the hashed bundle and favicon under that prefix.
  base: './',
  plugins: [copyRootAssets()],
  // Legacy JS keeps working untouched during Phase 0; three resolves to the
  // vendored ESM copy under src/vendor so behaviour is byte-identical to the
  // old importmap. npm `three` takes over when core/render are ported in Phase 1+.
  resolve: {
    alias: {
      three: fileURLToPath(new URL('./src/vendor/three.module.js', import.meta.url)),
    },
  },
  server: {
    proxy: {
      '/api': { target: 'http://127.0.0.1:8787', changeOrigin: true },
    },
  },
  preview: {
    proxy: {
      '/api': { target: 'http://127.0.0.1:8787', changeOrigin: true },
    },
  },
  build: {
    outDir: 'dist',
    target: 'es2022',
  },
});
