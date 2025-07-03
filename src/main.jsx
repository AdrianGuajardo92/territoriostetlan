import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
// 📊 MEDICIÓN BASE - Solo para auditoría inicial
import './utils/performanceLogger.js'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
) 