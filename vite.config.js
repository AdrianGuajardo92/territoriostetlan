import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // CORRECCIÓN: Configurar directorio público para archivos estáticos
  publicDir: 'public',
  esbuild: {
    // Forzar que todos los archivos JSX se transpilen a JS
    loader: 'jsx',
    include: /src\/.*\.jsx?$/,
    exclude: []
  },
  server: {
    port: 3001,
    strictPort: true,
    open: true,
    host: true,  // Permite acceso desde la red local (celular)
    // SOLUCIÓN: Configuración HMR para evitar problemas de WebSocket
    hmr: {
      overlay: false,
      port: 3001
    }
    // https: true  // Comentado temporalmente
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    // CORRECCIÓN: Copiar archivos adicionales necesarios
    copyPublicDir: true,
    // OPTIMIZACIÓN: Splitting agresivo para móviles ⚡
    rollupOptions: {
      // CORRECCIÓN: Copiar sw.js desde el root
      input: {
        main: './index.html'
      },
      output: {
        // Forzar extensión .js para todos los archivos
        format: 'es',
        manualChunks: {
          // Vendor principal - solo lo crítico
          'vendor-core': ['react', 'react-dom'],
          
          // Firebase en chunk separado (grande pero necesario)
          'vendor-firebase': ['firebase/app', 'firebase/firestore', 'firebase/auth'],
          
          // Utils y helpers
          'utils': ['./src/utils/helpers.js', './src/utils/routeOptimizer.js']
        },
        
        // CRÍTICO: Forzar nombres de archivo con extensión .js
        chunkFileNames: `assets/[name]-[hash].js`,
        entryFileNames: `assets/[name]-[hash].js`,
        assetFileNames: (assetInfo) => {
          // Asegurar que ningún archivo tenga extensión .jsx
          const ext = assetInfo.name.split('.').pop();
          if (ext === 'jsx') {
            return `assets/[name]-[hash].js`;
          }
          return `assets/[name]-[hash].[ext]`;
        }
      }
    },
    
    // CRÍTICO: Configuraciones para móviles
    target: 'es2020', // Soporte móviles modernos
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true, // Eliminar console.logs en producción
        drop_debugger: true,
        pure_funcs: ['console.log', 'console.warn'], // Eliminar funciones específicas
      },
      format: {
        comments: false // Sin comentarios en producción
      }
    },
    
    // Límites de chunk optimizados para móviles
    chunkSizeWarningLimit: 500, // Advertir si chunks > 500KB
  },
  
  optimizeDeps: {
    include: [
      'firebase/app', 
      'firebase/firestore', 
      'firebase/auth',
      'react',
      'react-dom'
    ],
    // Pre-bundle dependencias pesadas
    force: true
  },
  
  define: {
    'process.env': {},
    // OPTIMIZACIÓN: Eliminar código de desarrollo
    __DEV__: false
  }
}) 