import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  publicDir: 'public',
  
  server: {
    port: 3001,
    strictPort: false,
    open: true,
    host: 'localhost', // Usar localhost para desarrollo local
    hmr: {
      overlay: false,
      port: 3001,
      host: 'localhost',
      protocol: 'ws',
      timeout: 30000,
      clientPort: 3001,
      // Configuraciones adicionales para estabilidad
      reconnect: true,
      maxRetries: 5
    },
    cors: true,
    force: true,
    watch: {
      usePolling: false,
      interval: 1000
    }
  },
  
  esbuild: {
    loader: 'jsx',
    include: /src\/.*\.jsx?$/,
    exclude: []
  },
  
  optimizeDeps: {
    include: [
      'firebase/app', 
      'firebase/firestore', 
      'firebase/auth',
      'react',
      'react-dom'
    ],
    force: true
  },
  
  define: {
    'process.env': {},
    __DEV__: true
  }
}) 