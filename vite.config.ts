import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    host: '0.0.0.0',
    port: 3000,
    open: true,
  },
  build: {
    target: 'es2022',
    // Keep out of dist/ — that directory holds tracked snake-SVG artifacts.
    outDir: 'site-dist',
    emptyOutDir: true,
  },
});
