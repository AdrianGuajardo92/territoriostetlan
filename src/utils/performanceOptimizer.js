// 🚀 SISTEMA DE OPTIMIZACIÓN Y MONITOREO DE PERFORMANCE

// 📊 MÉTRICAS DE PERFORMANCE
export const PerformanceMonitor = {
  // ⏱️ Medir tiempo de login
  measureLoginTime: (startTime) => {
    const endTime = performance.now();
    const loginTime = endTime - startTime;
    
    console.log(`⚡ Tiempo de login: ${loginTime.toFixed(2)}ms`);
    
    // Guardar métricas para análisis
    const metrics = JSON.parse(localStorage.getItem('performance_metrics') || '[]');
    metrics.push({
      type: 'login',
      time: loginTime,
      timestamp: Date.now()
    });
    
    // Mantener solo las últimas 50 métricas
    if (metrics.length > 50) {
      metrics.splice(0, metrics.length - 50);
    }
    
    localStorage.setItem('performance_metrics', JSON.stringify(metrics));
    
    return loginTime;
  },

  // 📱 Medir tiempo de carga de datos
  measureDataLoad: (dataType, startTime) => {
    const endTime = performance.now();
    const loadTime = endTime - startTime;
    
    console.log(`📊 Tiempo de carga ${dataType}: ${loadTime.toFixed(2)}ms`);
    
    return loadTime;
  },

  // 🎯 Obtener métricas de la sesión actual
  getSessionMetrics: () => {
    const navigation = performance.getEntriesByType('navigation')[0];
    const paint = performance.getEntriesByType('paint');
    
    return {
      // Tiempo total de carga de la página
      pageLoad: navigation ? Math.round(navigation.loadEventEnd - navigation.loadEventStart) : 0,
      
      // Tiempo hasta el primer pintado
      firstPaint: paint.find(p => p.name === 'first-paint')?.startTime || 0,
      
      // Tiempo hasta el primer pintado con contenido
      firstContentfulPaint: paint.find(p => p.name === 'first-contentful-paint')?.startTime || 0,
      
      // Memoria disponible (si está soportado)
      deviceMemory: navigator.deviceMemory || 'Desconocido',
      
      // Información de conexión
      connection: navigator.connection ? {
        effectiveType: navigator.connection.effectiveType,
        downlink: navigator.connection.downlink,
        rtt: navigator.connection.rtt
      } : null
    };
  },

  // 📈 Obtener estadísticas históricas
  getHistoricalMetrics: () => {
    const metrics = JSON.parse(localStorage.getItem('performance_metrics') || '[]');
    
    if (metrics.length === 0) return null;
    
    const loginTimes = metrics.filter(m => m.type === 'login').map(m => m.time);
    
    if (loginTimes.length === 0) return null;
    
    return {
      totalLogins: loginTimes.length,
      averageLoginTime: loginTimes.reduce((a, b) => a + b, 0) / loginTimes.length,
      fastestLogin: Math.min(...loginTimes),
      slowestLogin: Math.max(...loginTimes),
      last10Average: loginTimes.slice(-10).reduce((a, b) => a + b, 0) / Math.min(10, loginTimes.length)
    };
  }
};

// 🎯 OPTIMIZACIONES AUTOMÁTICAS
export const AutoOptimizer = {
  // 🧹 Limpiar cache viejo automáticamente
  cleanOldCache: () => {
    try {
      // Limpiar métricas viejas (más de 7 días)
      const metrics = JSON.parse(localStorage.getItem('performance_metrics') || '[]');
      const weekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
      const recentMetrics = metrics.filter(m => m.timestamp > weekAgo);
      
      if (recentMetrics.length !== metrics.length) {
        localStorage.setItem('performance_metrics', JSON.stringify(recentMetrics));
        console.log('🧹 Cache de métricas limpiado');
      }
      
      // Limpiar cache de usuarios viejos (más de 30 días)
      const keys = Object.keys(localStorage);
      const userCacheKeys = keys.filter(key => key.startsWith('user_cache_'));
      
      userCacheKeys.forEach(key => {
        try {
          const userData = JSON.parse(localStorage.getItem(key));
          if (userData.lastLogin && Date.now() - userData.lastLogin > 30 * 24 * 60 * 60 * 1000) {
            localStorage.removeItem(key);
            console.log(`🧹 Cache de usuario limpiado: ${key}`);
          }
        } catch (e) {
          // Si hay error parseando, eliminar la entrada corrupta
          localStorage.removeItem(key);
        }
      });
      
    } catch (error) {
      console.warn('⚠️ Error limpiando cache:', error);
    }
  },

  // 🚀 Precargar recursos críticos
  preloadCriticalResources: () => {
    // Precargar fuentes críticas
    const link = document.createElement('link');
    link.rel = 'preload';
    link.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap';
    link.as = 'style';
    document.head.appendChild(link);
    
    // Precargar iconos críticos
    const iconLink = document.createElement('link');
    iconLink.rel = 'prefetch';
    iconLink.href = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css';
    document.head.appendChild(iconLink);
  },

  // 📱 Optimizar para móviles
  optimizeForMobile: () => {
    // Detectar dispositivo móvil
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    if (isMobile) {
      // Reducir calidad de imágenes en móviles
      document.documentElement.style.setProperty('--image-quality', '0.8');
      
      // Habilitar smooth scrolling
      document.documentElement.style.scrollBehavior = 'smooth';
      
      // Optimizar viewport
      const viewport = document.querySelector('meta[name="viewport"]');
      if (viewport) {
        viewport.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no';
      }
    }
  }
};

// 🔧 INICIALIZACIÓN AUTOMÁTICA
export const initializePerformanceOptimizations = () => {
  console.log('🚀 Inicializando optimizaciones de performance...');
  
  // Limpiar cache viejo
  AutoOptimizer.cleanOldCache();
  
  // Precargar recursos críticos
  AutoOptimizer.preloadCriticalResources();
  
  // Optimizar para móviles
  AutoOptimizer.optimizeForMobile();
  
  // Programar limpieza automática cada hora
  setInterval(() => {
    AutoOptimizer.cleanOldCache();
  }, 60 * 60 * 1000);
  
  console.log('✅ Optimizaciones de performance inicializadas');
};

export default { PerformanceMonitor, AutoOptimizer, initializePerformanceOptimizations }; 