// 📊 LOGGER DE RENDIMIENTO - MEDICIÓN BASE
// Solo para medir el estado ANTES de lazy loading

// Medir tiempo de carga inicial
const startTime = performance.now();

// Log del bundle size estimado
console.log('🔍 MEDICIÓN BASE - ANTES DE LAZY LOADING');
console.log('📦 Bundle estimado: ~1.2MB');
console.log('⏱️ Tiempo inicio:', startTime);

// Medir cuando la app esté lista
window.addEventListener('load', () => {
  const loadTime = performance.now() - startTime;
  console.log('✅ Tiempo carga completa:', Math.round(loadTime), 'ms');
  
  // Medir memoria aproximada
  if (performance.memory) {
    console.log('💾 Memoria usada:', Math.round(performance.memory.usedJSHeapSize / 1024 / 1024), 'MB');
  }
});

// Función para medir apertura de modales
window.measureModalLoad = (modalName) => {
  const modalStartTime = performance.now();
  console.log(`🔍 Abriendo ${modalName}...`);
  
  return () => {
    const modalLoadTime = performance.now() - modalStartTime;
    console.log(`✅ ${modalName} cargado en:`, Math.round(modalLoadTime), 'ms');
  };
};

export default {
  startTime,
  measureModalLoad: window.measureModalLoad
}; 