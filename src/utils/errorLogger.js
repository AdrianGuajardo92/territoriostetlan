// Sistema de captura de errores para reportes del sistema
class ErrorLogger {
  constructor() {
    this.maxErrors = 50; // Máximo número de errores a almacenar
    this.init();
  }

  init() {
    // Capturar errores JavaScript
    window.addEventListener('error', (event) => {
      this.logError({
        type: 'JavaScript Error',
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        stack: event.error?.stack,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        url: window.location.href
      });
    });

    // Capturar promesas rechazadas
    window.addEventListener('unhandledrejection', (event) => {
      this.logError({
        type: 'Unhandled Promise Rejection',
        message: event.reason?.message || String(event.reason),
        stack: event.reason?.stack,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        url: window.location.href
      });
    });

    // Capturar errores de recursos (imágenes, scripts, etc.)
    window.addEventListener('error', (event) => {
      if (event.target !== window) {
        this.logError({
          type: 'Resource Error',
          message: `Failed to load resource: ${event.target.src || event.target.href}`,
          element: event.target.tagName,
          timestamp: new Date().toISOString(),
          userAgent: navigator.userAgent,
          url: window.location.href
        });
      }
    }, true);

    // Capturar errores de red (fetch)
    this.interceptFetch();
  }

  interceptFetch() {
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      try {
        const response = await originalFetch(...args);
        
        // Log errores HTTP
        if (!response.ok) {
          this.logError({
            type: 'Network Error',
            message: `HTTP ${response.status}: ${response.statusText}`,
            url: args[0],
            status: response.status,
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent,
            currentUrl: window.location.href
          });
        }
        
        return response;
      } catch (error) {
        this.logError({
          type: 'Fetch Error',
          message: error.message,
          url: args[0],
          stack: error.stack,
          timestamp: new Date().toISOString(),
          userAgent: navigator.userAgent,
          currentUrl: window.location.href
        });
        throw error;
      }
    };
  }

  logError(errorData) {
    try {
      const errors = this.getErrors();
      errors.unshift(errorData);
      
      // Mantener solo los últimos errores
      if (errors.length > this.maxErrors) {
        errors.splice(this.maxErrors);
      }
      
      localStorage.setItem('app_errors', JSON.stringify(errors));
      
      // Log en consola para desarrollo
      console.error('[ErrorLogger]', errorData);
    } catch (e) {
      console.error('[ErrorLogger] Failed to log error:', e);
    }
  }

  getErrors() {
    try {
      return JSON.parse(localStorage.getItem('app_errors') || '[]');
    } catch (e) {
      return [];
    }
  }

  clearErrors() {
    localStorage.removeItem('app_errors');
  }

  // Método para log manual de errores
  logCustomError(type, message, additionalData = {}) {
    this.logError({
      type,
      message,
      ...additionalData,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href
    });
  }

  // Obtener estadísticas de errores
  getErrorStats() {
    const errors = this.getErrors();
    const stats = {
      total: errors.length,
      byType: {},
      last24Hours: 0,
      mostCommon: null
    };

    const now = Date.now();
    const day = 24 * 60 * 60 * 1000;

    errors.forEach(error => {
      // Contar por tipo
      stats.byType[error.type] = (stats.byType[error.type] || 0) + 1;
      
      // Contar últimas 24 horas
      const errorTime = new Date(error.timestamp).getTime();
      if (now - errorTime < day) {
        stats.last24Hours++;
      }
    });

    // Encontrar el tipo más común
    let maxCount = 0;
    Object.entries(stats.byType).forEach(([type, count]) => {
      if (count > maxCount) {
        maxCount = count;
        stats.mostCommon = { type, count };
      }
    });

    return stats;
  }
}

// Crear instancia global
const errorLogger = new ErrorLogger();

export default errorLogger; 