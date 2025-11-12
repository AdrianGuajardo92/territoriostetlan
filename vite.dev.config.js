import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  publicDir: 'public',

  server: {
    port: 3000,
    strictPort: false,
    open: true,
    host: 'localhost',
    hmr: {
      overlay: false,
      port: 3000,
      host: 'localhost',
      protocol: 'ws',
      timeout: 30000,
      clientPort: 3000
    },
    cors: true,
    force: true,
    watch: {
      usePolling: false,
      interval: 1000
    }
  },

  optimizeDeps: {
    include: [
      'firebase/app',
      'firebase/firestore',
      'firebase/auth',
      'react',
      'react-dom',
      'react-leaflet',
      'leaflet'
    ],
    force: true
  },

  define: {
    'process.env': {},
    __DEV__: true
  }
})