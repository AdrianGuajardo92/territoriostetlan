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
    port: 3000,
    strictPort: true,
    open: true,
    host: true  // Permite acceso desde la red local (celular)
    // https: true  // Comentado temporalmente
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    // CORRECCIÓN: Copiar archivos adicionales necesarios
    copyPublicDir: true,
    
    // 🚀 OPTIMIZACIÓN AGRESIVA PARA MÓVILES
    rollupOptions: {
      input: {
        main: './index.html'
      },
      output: {
        format: 'es',
        manualChunks: {
          // 🎯 VENDOR CRÍTICO - Solo React (139KB → 44KB gzipped)
          'vendor-core': ['react', 'react-dom'],
          
          // 🔥 FIREBASE MÍNIMO - Solo Firestore necesario (320KB → 96KB gzipped)
          'vendor-firebase': [
            'firebase/app', 
            'firebase/firestore'
            // ❌ Removido: firebase/auth (no lo usamos)
          ],
          
          // 📊 XLSX LAZY - Solo cargar cuando se necesite
          'xlsx': ['xlsx'],
          
          // 🗺️ MAPAS LAZY - Solo cargar cuando se abra mapa
          'maps': ['leaflet', 'react-leaflet'],
          
          // 🛠️ UTILS PEQUEÑOS
          'utils': [
            './src/utils/helpers.js', 
            './src/utils/routeOptimizer.js',
            './src/utils/offlineDB.js'
          ]
        },
        
        chunkFileNames: `assets/[name]-[hash].js`,
        entryFileNames: `assets/[name]-[hash].js`,
        assetFileNames: (assetInfo) => {
          const ext = assetInfo.name.split('.').pop();
          if (ext === 'jsx') {
            return `assets/[name]-[hash].js`;
          }
          return `assets/[name]-[hash].[ext]`;
        }
      }
    },
    
    // 🎯 CONFIGURACIÓN MÓVIL OPTIMIZADA
    target: 'es2020',
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,        // ❌ Sin console.logs en producción
        drop_debugger: true,       // ❌ Sin debuggers
        pure_funcs: [              // ❌ Eliminar funciones específicas
          'console.log', 
          'console.warn', 
          'console.info',
          'console.debug'
        ],
        passes: 2,                 // 🔥 Doble pasada para mejor compresión
        unsafe: true,              // 🚀 Optimizaciones agresivas
        unsafe_comps: true,        // 🚀 Comparaciones optimizadas
        unsafe_math: true,         // 🚀 Matemáticas optimizadas
        unsafe_proto: true,        // 🚀 Prototipos optimizados
        keep_fargs: false,         // ❌ Remover argumentos no usados
        toplevel: true             // 🔥 Optimizaciones top-level
      },
      format: {
        comments: false            // ❌ Sin comentarios
      },
      mangle: {
        safari10: true,            // 🍎 Compatibilidad Safari
        toplevel: true             // 🔥 Mangle variables top-level
      }
    },
    
    // 📏 LÍMITES OPTIMIZADOS PARA MÓVILES
    chunkSizeWarningLimit: 300,    // ⚠️ Advertir si chunks > 300KB
    
    // 🗜️ COMPRESIÓN ADICIONAL
    assetsInlineLimit: 4096,       // Inline assets < 4KB
    
    // 🎯 OPTIMIZACIONES CSS
    cssCodeSplit: true,            // Split CSS por chunks
    cssMinify: 'esbuild'           // CSS minificado con esbuild
  },
  
  // ⚡ PRE-BUNDLING OPTIMIZADO
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'firebase/app', 
      'firebase/firestore'
    ],
    exclude: [
      'xlsx',                      // 📊 Lazy load
      'leaflet',                   // 🗺️ Lazy load
      'react-leaflet'              // 🗺️ Lazy load
    ],
    force: true
  },
  
  define: {
    'process.env': {},
    __DEV__: false,
    // 🔥 ELIMINAR CÓDIGO DE DESARROLLO
    'process.env.NODE_ENV': '"production"'
  }
}) 