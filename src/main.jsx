import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

// 🚀 FASE 1: Inicializar optimizaciones de performance
import { initializePerformanceOptimizations } from './utils/performanceOptimizer'

// Inicializar optimizaciones automáticamente
initializePerformanceOptimizations()

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
) 