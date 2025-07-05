import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // CORRECCIÓN: Configurar directorio público para archivos estáticos
  publicDir: 'public',
  esbuild: {
    // Configuración correcta para JSX
    loader: 'jsx'
  },
  server: {
    port: 3001,
    strictPort: false, // Cambiar a false para permitir puertos alternativos
    open: true,
    host: 'localhost',  // Cambiar a localhost para evitar problemas de red
    // CONFIGURACIÓN HMR SIMPLIFICADA Y ESTABLE
    hmr: {
      overlay: false,
      port: 3001
    },
    // Configuraciones básicas para estabilidad
    cors: true,
    // Configuración de watch simplificada
    watch: {
      usePolling: false,
      interval: 1000,
      ignored: ['**/node_modules/**', '**/.git/**']
    }
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
        drop_console: false, // MANTENER console.logs en desarrollo con debug
        drop_debugger: true,
        pure_funcs: ['console.warn'], // Solo eliminar warnings
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
    force: false // Cambiar a false para evitar re-optimizaciones constantes
  },
  
  define: {
    'process.env': {},
    // OPTIMIZACIÓN: Eliminar código de desarrollo
    __DEV__: true // Cambiar a true para desarrollo
  }
}) 