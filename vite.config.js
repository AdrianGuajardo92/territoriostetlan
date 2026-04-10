import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [
    react({
      jsxRuntime: 'automatic',
      babel: {
        plugins: [],
      }
    })
  ],
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
    alias: {
      'react': path.resolve('./node_modules/react'),
      'react-dom': path.resolve('./node_modules/react-dom')
    },
    extensions: ['.js', '.jsx']
  },
  optimizeDeps: {
    include: ['react', 'react-dom', 'firebase/app', 'firebase/firestore'],
    exclude: []
  },
  esbuild: {
    loader: 'jsx',
    include: /\.(jsx?|tsx?)$/,
    exclude: []
  },
  build: {
    sourcemap: true,
    outDir: 'dist',
    commonjsOptions: {
      include: [/node_modules/],
      transformMixedEsModules: true
    }
  }
})
