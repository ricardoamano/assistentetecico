import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// O carimbo de build do sw.js é feito por scripts/stamp-sw.mjs (pós-build),
// porque o Vite copia o public/ depois dos hooks de plugin.
export default defineConfig({
  plugins: [react()],
  build: {
    target: 'es2019',
    chunkSizeWarningLimit: 2000,
  },
});
