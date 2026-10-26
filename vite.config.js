import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  // Legacy JS keeps working untouched during Phase 0; three resolves to the
  // vendored ESM copy under src/vendor so behaviour is byte-identical to the
  // old importmap. npm `three` takes over when core/render are ported in Phase 1+.
  resolve: {
    alias: {
      three: fileURLToPath(new URL('./src/vendor/three.module.js', import.meta.url)),
    },
  },
  build: {
    outDir: 'dist',
    target: 'es2022',
  },
});
