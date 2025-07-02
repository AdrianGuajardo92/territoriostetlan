// 🧪 SCRIPT DE TESTING FASE 1 - LOCALHOST
// Copia y pega este código en la consola del navegador (F12)

console.log('🚀 INICIANDO TESTING FASE 1...');

// 📊 Función para verificar métricas de performance
function verificarPerformance() {
  console.log('\n📊 VERIFICANDO PERFORMANCE...');
  
  // Verificar cache de usuarios
  const userCaches = Object.keys(localStorage).filter(key => key.includes('user_cache_'));
  console.log(`✅ Usuarios en cache: ${userCaches.length}`);
  userCaches.forEach(cache => {
    const userData = JSON.parse(localStorage.getItem(cache) || '{}');
    console.log(`   - ${cache}: ${userData.name || 'Unknown'} (${userData.lastLogin ? new Date(userData.lastLogin).toLocaleString() : 'No timestamp'})`);
  });
  
  // Verificar métricas de performance
  const metrics = localStorage.getItem('performance_metrics');
  if (metrics) {
    const data = JSON.parse(metrics);
    const loginTimes = data.filter(m => m.type === 'login').map(m => m.time);
    if (loginTimes.length > 0) {
      const avgTime = loginTimes.reduce((a, b) => a + b, 0) / loginTimes.length;
      const fastestTime = Math.min(...loginTimes);
      console.log(`✅ Promedio login: ${avgTime.toFixed(2)}ms`);
      console.log(`✅ Login más rápido: ${fastestTime.toFixed(2)}ms`);
      console.log(`✅ Total logins: ${loginTimes.length}`);
      
      // Verificar criterios de éxito
      if (avgTime < 1000) {
        console.log('🎯 ✅ CRITERIO CUMPLIDO: Login promedio < 1000ms');
      } else {
        console.log('🎯 ❌ CRITERIO NO CUMPLIDO: Login promedio >= 1000ms');
      }
      
      if (fastestTime < 500) {
        console.log('🎯 ✅ CRITERIO CUMPLIDO: Login cache < 500ms');
      } else {
        console.log('🎯 ❌ CRITERIO NO CUMPLIDO: Login cache >= 500ms');
      }
    } else {
      console.log('⚠️ No hay métricas de login aún');
    }
  } else {
    console.log('⚠️ No hay métricas de performance guardadas');
  }
}

// 🔧 Función para verificar Service Worker
function verificarServiceWorker() {
  console.log('\n🔧 VERIFICANDO SERVICE WORKER...');
  
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistration().then(registration => {
      if (registration) {
        console.log('✅ Service Worker registrado');
        console.log(`   - Scope: ${registration.scope}`);
        console.log(`   - Estado: ${registration.active ? 'Activo' : 'Inactivo'}`);
        
        if (navigator.serviceWorker.controller) {
          console.log('✅ Service Worker controlando la página');
        } else {
          console.log('⚠️ Service Worker no está controlando la página');
        }
      } else {
        console.log('❌ Service Worker no registrado');
      }
    });
  } else {
    console.log('❌ Service Worker no soportado');
  }
}

// 📦 Función para verificar bundles cargados
function verificarBundles() {
  console.log('\n📦 VERIFICANDO BUNDLES CARGADOS...');
  
  const scripts = Array.from(document.querySelectorAll('script[src]'));
  const bundles = scripts.filter(script => script.src.includes('/assets/'));
  
  console.log(`✅ Total bundles cargados: ${bundles.length}`);
  bundles.forEach(bundle => {
    const url = new URL(bundle.src);
    const filename = url.pathname.split('/').pop();
    console.log(`   - ${filename}`);
  });
  
  // Verificar si hay bundles de Firebase optimizados
  const firebaseBundle = bundles.find(b => b.src.includes('vendor-firebase'));
  if (firebaseBundle) {
    console.log('✅ Bundle Firebase optimizado cargado');
  } else {
    console.log('⚠️ Bundle Firebase no encontrado');
  }
}

// 🌐 Función para verificar conectividad
function verificarConectividad() {
  console.log('\n🌐 VERIFICANDO CONECTIVIDAD...');
  
  console.log(`✅ Navigator online: ${navigator.onLine}`);
  
  if (navigator.connection) {
    console.log(`✅ Tipo de conexión: ${navigator.connection.effectiveType}`);
    console.log(`✅ Velocidad estimada: ${navigator.connection.downlink} Mbps`);
  }
  
  // Test de conectividad con Firebase
  console.log('🔥 Probando conexión Firebase...');
  fetch('/version.json')
    .then(response => response.ok ? console.log('✅ Conectividad OK') : console.log('❌ Conectividad FALLA'))
    .catch(() => console.log('❌ Error de conectividad'));
}

// 🎯 Función principal de testing
function testearFase1() {
  console.log('🎯 EJECUTANDO TESTING COMPLETO FASE 1...\n');
  
  verificarPerformance();
  verificarServiceWorker();
  verificarBundles();
  verificarConectividad();
  
  console.log('\n🏁 TESTING COMPLETADO. Revisa los resultados arriba.');
  console.log('\n📝 PRÓXIMOS PASOS:');
  console.log('1. Si ves ❌, reporta los problemas encontrados');
  console.log('2. Si todo está ✅, procede a probar funcionalidad offline');
  console.log('3. Usa F12 → Network → Offline para probar sin internet');
}

// 🚀 Ejecutar testing automáticamente
testearFase1();

// 💡 Funciones disponibles para uso manual:
console.log('\n💡 FUNCIONES DISPONIBLES:');
console.log('- testearFase1() - Testing completo');
console.log('- verificarPerformance() - Solo métricas');
console.log('- verificarServiceWorker() - Solo SW');
console.log('- verificarBundles() - Solo bundles');
console.log('- verificarConectividad() - Solo conectividad'); 