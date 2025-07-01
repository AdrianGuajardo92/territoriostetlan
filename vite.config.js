import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    strictPort: true,
    open: true,
    host: true  // Permite acceso desde la red local (celular)
    // https: true  // Comentado temporalmente
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    // OPTIMIZACIÓN: Splitting agresivo para móviles ⚡
    rollupOptions: {
      output: {
        manualChunks: {
          // Vendor principal - solo lo crítico
          'vendor-core': ['react', 'react-dom'],
          
          // Firebase en chunk separado (grande pero necesario)
          'vendor-firebase': ['firebase/app', 'firebase/firestore', 'firebase/auth'],
          
          // Utils y helpers
          'utils': ['./src/utils/helpers.js', './src/utils/routeOptimizer.js'],
          
          // Modales pesados - lazy loading
          'modals-heavy': [
            './src/components/modals/StatsModal.jsx',
            './src/components/modals/AdminModal.jsx',
            './src/components/modals/ReportsModal.jsx'
          ],
          
          // Modales ligeros
          'modals-light': [
            './src/components/modals/SearchModal.jsx',
            './src/components/modals/PasswordModal.jsx',
            './src/components/modals/UpdatesModal.jsx',
            './src/components/modals/InstallModal.jsx'
          ]
        },
        
        // Optimizar chunks para carga rápida - nombres seguros
        chunkFileNames: `assets/[name]-[hash].js`,
        entryFileNames: `assets/[name]-[hash].js`,
        assetFileNames: `assets/[name]-[hash].[ext]`
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