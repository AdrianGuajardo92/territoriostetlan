import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
// 📊 MEDICIÓN BASE - Solo para auditoría inicial
import './utils/performanceLogger.js'
import { markBoot, resetBootMetrics } from './utils/bootMetrics'

resetBootMetrics()
markBoot('boot:start')

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
