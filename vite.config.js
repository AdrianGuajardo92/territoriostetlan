import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3500,
    strictPort: false,
    open: true,
    host: true,
    hmr: {
      overlay: true
    }
  },
  resolve: {
    extensions: ['.js', '.jsx'],
    dedupe: ['react', 'react-dom']
  },
  optimizeDeps: {
    include: ['react', 'react-dom', 'react/jsx-runtime']
  },
  build: {
    sourcemap: true,
    outDir: 'dist',
    commonjsOptions: {
      transformMixedEsModules: true
    }
  }
})
