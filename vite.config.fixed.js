import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [
    react({
      jsxRuntime: 'automatic'
    })
  ],
  server: {
    port: 3000,
    strictPort: false,
    open: true,
    host: 'localhost'
  },
  resolve: {
    extensions: ['.js', '.jsx']
  },
  optimizeDeps: {
    include: ['react', 'react-dom'],
    esbuildOptions: {
      target: 'esnext',
      loader: {
        '.js': 'jsx',
        '.jsx': 'jsx'
      }
    }
  },
  esbuild: {
    loader: 'jsx',
    include: /\.(jsx?|tsx?)$/,
    exclude: [],
    jsxFactory: 'React.createElement',
    jsxFragment: 'React.Fragment'
  },
  build: {
    sourcemap: true,
    outDir: 'dist',
    rollupOptions: {
      input: {
        main: './index.html'
      }
    }
  }
})