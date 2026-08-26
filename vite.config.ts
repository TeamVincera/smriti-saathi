import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

import { reticle } from '@reticlehq/vite-plugin';
export default defineConfig({
  plugins: [reticle({ captureNetworkBodies: true }),react()],
  base: './',
  build: {
    outDir: 'dist',
    target: 'es2018',
    cssCodeSplit: true,
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom']
        }
      }
    }
  },
  server: { port: 5173, host: true }
})
