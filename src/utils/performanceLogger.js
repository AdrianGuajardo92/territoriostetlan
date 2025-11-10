// 📊 LOGGER DE RENDIMIENTO - MEDICIÓN BASE
// Solo para medir el estado ANTES de lazy loading

// Medir tiempo de carga inicial
const startTime = performance.now();

// Función para medir apertura de modales (sin logs)
window.measureModalLoad = (modalName) => {
  const modalStartTime = performance.now();

  return () => {
    const modalLoadTime = performance.now() - modalStartTime;
    // Medición silenciosa
  };
};

export default {
  startTime,
  measureModalLoad: window.measureModalLoad
}; 