// 📱 FASE 2: Optimizador de Performance Móvil

// 🔍 Detección de dispositivo móvil
export const DeviceDetector = {
  // Detectar si es móvil
  isMobile: () => {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  },

  // Detectar si es iOS
  isIOS: () => {
    return /iPad|iPhone|iPod/.test(navigator.userAgent);
  },

  // Detectar si es Android
  isAndroid: () => {
    return /Android/.test(navigator.userAgent);
  },

  // Obtener información del dispositivo
  getDeviceInfo: () => {
    const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    
    return {
      isMobile: DeviceDetector.isMobile(),
      isIOS: DeviceDetector.isIOS(),
      isAndroid: DeviceDetector.isAndroid(),
      deviceMemory: navigator.deviceMemory || 4, // Default a 4GB
      hardwareConcurrency: navigator.hardwareConcurrency || 4,
      connection: connection ? {
        effectiveType: connection.effectiveType,
        downlink: connection.downlink,
        rtt: connection.rtt,
        saveData: connection.saveData
      } : null,
      screenSize: {
        width: window.screen.width,
        height: window.screen.height,
        pixelRatio: window.devicePixelRatio || 1
      },
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight
      }
    };
  }
};

// 🚀 Optimizaciones automáticas para móviles
export const MobileOptimizer = {
  // Configurar viewport meta tag optimizado
  setupViewport: () => {
    let viewport = document.querySelector('meta[name="viewport"]');
    if (!viewport) {
      viewport = document.createElement('meta');
      viewport.name = 'viewport';
      document.head.appendChild(viewport);
    }
    
    // Configuración optimizada para móviles
    viewport.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover';
  },

  // Optimizar touch events
  optimizeTouchEvents: () => {
    // Prevenir zoom en doble tap en iOS
    document.addEventListener('touchstart', (e) => {
      if (e.touches.length > 1) {
        e.preventDefault();
      }
    }, { passive: false });

    // Prevenir scroll bounce en iOS
    document.addEventListener('touchmove', (e) => {
      if (e.touches.length > 1) {
        e.preventDefault();
      }
    }, { passive: false });

    // Mejorar responsividad de tap
    if (DeviceDetector.isIOS()) {
      document.addEventListener('touchstart', () => {}, { passive: true });
    }
  },

  // Optimizar imágenes para móviles
  optimizeImages: () => {
    const images = document.querySelectorAll('img[data-src]');
    const deviceInfo = DeviceDetector.getDeviceInfo();
    
    // Lazy loading más agresivo en móviles
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const img = entry.target;
          const src = img.dataset.src;
          
          // Cargar imagen optimizada según el dispositivo
          if (src) {
            img.src = src;
            img.removeAttribute('data-src');
            observer.unobserve(img);
          }
        }
      });
    }, {
      rootMargin: deviceInfo.isMobile ? '50px' : '100px' // Menor margen en móviles
    });

    images.forEach(img => observer.observe(img));
  },

  // Reducir animaciones en dispositivos lentos
  optimizeAnimations: () => {
    const deviceInfo = DeviceDetector.getDeviceInfo();
    
    // Reducir animaciones si el dispositivo es lento
    if (deviceInfo.deviceMemory < 4 || deviceInfo.hardwareConcurrency < 4) {
      document.documentElement.style.setProperty('--animation-duration', '0.1s');
      document.documentElement.style.setProperty('--transition-duration', '0.1s');
    }

    // Respetar preferencias del usuario
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      document.documentElement.style.setProperty('--animation-duration', '0s');
      document.documentElement.style.setProperty('--transition-duration', '0s');
    }
  },

  // Gestión inteligente de memoria
  optimizeMemory: () => {
    const deviceInfo = DeviceDetector.getDeviceInfo();
    
    // Limpiar cache más frecuentemente en dispositivos con poca memoria
    if (deviceInfo.deviceMemory < 4) {
      setInterval(() => {
        // Limpiar cache de imágenes no visibles
        const images = document.querySelectorAll('img');
        images.forEach(img => {
          const rect = img.getBoundingClientRect();
          const isVisible = rect.top < window.innerHeight && rect.bottom > 0;
          
          if (!isVisible && img.src) {
            img.removeAttribute('src');
            img.dataset.src = img.src;
          }
        });
      }, 30000); // Cada 30 segundos
    }
  },

  // Optimizar scroll performance
  optimizeScroll: () => {
    let ticking = false;
    
    const updateScrollPosition = () => {
      // Actualizar posición de scroll de manera optimizada
      document.documentElement.style.setProperty('--scroll-y', `${window.scrollY}px`);
      ticking = false;
    };

    window.addEventListener('scroll', () => {
      if (!ticking) {
        requestAnimationFrame(updateScrollPosition);
        ticking = true;
      }
    }, { passive: true });
  },

  // Optimizar carga de fuentes con detección inteligente
  optimizeFonts: () => {
    // Solo precargar fuentes que realmente existen
    const criticalFonts = [
      'Inter-Regular.woff2',
      'Inter-Medium.woff2'
    ];

    criticalFonts.forEach(async (font) => {
      try {
        // Verificar si la fuente existe antes de precargarla
        const response = await fetch(`/fonts/${font}`, { method: 'HEAD' });
        if (response.ok) {
          const link = document.createElement('link');
          link.rel = 'preload';
          link.as = 'font';
          link.type = 'font/woff2';
          link.crossOrigin = 'anonymous';
          link.href = `/fonts/${font}`;
          document.head.appendChild(link);
          console.log(`📱 Fuente precargada: ${font}`);
        }
      } catch (error) {
        // Silenciosamente ignorar fuentes que no existen
        console.log(`📱 Fuente no encontrada (normal): ${font}`);
      }
    });
  },

  // Configurar Service Worker para móviles
  setupMobileServiceWorker: () => {
    if ('serviceWorker' in navigator && DeviceDetector.isMobile()) {
      navigator.serviceWorker.register('/sw.js', {
        scope: '/',
        updateViaCache: 'none'
      }).then(registration => {
        console.log('📱 SW móvil registrado:', registration.scope);
        
        // Configuración específica para móviles
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // Notificación más sutil en móviles
              console.log('📱 Nueva versión disponible');
            }
          });
        });
      });
    }
  }
};

// 🎯 Configuración adaptativa basada en el dispositivo
export const AdaptiveConfig = {
  // Obtener configuración optimizada para el dispositivo
  getOptimizedConfig: () => {
    const deviceInfo = DeviceDetector.getDeviceInfo();
    
    return {
      // Configuración de lazy loading
      lazyLoading: {
        rootMargin: deviceInfo.isMobile ? '50px' : '100px',
        threshold: deviceInfo.isMobile ? 0.1 : 0.25
      },
      
      // Configuración de animaciones
      animations: {
        duration: deviceInfo.deviceMemory < 4 ? 150 : 300,
        easing: deviceInfo.isMobile ? 'ease-out' : 'ease-in-out'
      },
      
      // Configuración de cache
      cache: {
        maxImages: deviceInfo.deviceMemory < 4 ? 20 : 50,
        cleanupInterval: deviceInfo.deviceMemory < 4 ? 30000 : 60000
      },
      
      // Configuración de red
      network: {
        timeout: deviceInfo.connection?.effectiveType === 'slow-2g' ? 10000 : 5000,
        retries: deviceInfo.connection?.saveData ? 1 : 3
      }
    };
  }
};

// 🔧 Inicialización automática
export const initializeMobileOptimizations = () => {
  console.log('📱 FASE 2: Inicializando optimizaciones móviles...');
  
  const deviceInfo = DeviceDetector.getDeviceInfo();
  console.log('📱 Dispositivo detectado:', deviceInfo);
  
  // Solo aplicar optimizaciones en móviles
  if (deviceInfo.isMobile) {
    MobileOptimizer.setupViewport();
    MobileOptimizer.optimizeTouchEvents();
    MobileOptimizer.optimizeImages();
    MobileOptimizer.optimizeAnimations();
    MobileOptimizer.optimizeMemory();
    MobileOptimizer.optimizeScroll();
    // MobileOptimizer.optimizeFonts(); // Desactivado temporalmente para evitar warnings
    MobileOptimizer.setupMobileServiceWorker();
    
    console.log('✅ Optimizaciones móviles aplicadas');
  } else {
    console.log('💻 Dispositivo desktop detectado, optimizaciones móviles omitidas');
  }
  
  return deviceInfo;
}; 