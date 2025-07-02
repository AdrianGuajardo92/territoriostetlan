# 🚀 DESARROLLO LOCAL - FASE 1

## 📋 **CONFIGURACIÓN INICIAL**

### **1. Iniciar Servidor Local**
```bash
npm run dev
```
- **URL**: http://localhost:3000
- **Hot Reload**: Cambios automáticos sin recargar
- **DevTools**: Acceso completo a herramientas de desarrollo

### **2. Acceso Rápido**
- **Aplicación**: http://localhost:3000
- **Consola**: F12 → Console
- **Network**: F12 → Network (para ver tiempos de carga)
- **Performance**: F12 → Performance (para análisis detallado)

---

## 🧪 **TESTING FASE 1 - LOCALHOST**

### **✅ CRITERIOS DE ÉXITO**

#### **1. LOGIN OPTIMIZADO**
- [ ] **Primera vez**: Login normal (~1000ms)
- [ ] **Cache local**: Login rápido (~50-200ms) 
- [ ] **Sin errores**: Consola limpia

**Cómo probar:**
1. Abre http://localhost:3000
2. Haz login con tu usuario
3. Cierra la pestaña
4. Abre de nuevo y haz login
5. **✅ Debería ser mucho más rápido**

#### **2. DIAGNÓSTICO DE PERFORMANCE**
- [ ] **Panel visible**: "📊 Diagnóstico FASE 1" en menú admin
- [ ] **Métricas**: Tiempos de login < 1000ms
- [ ] **Datos precisos**: Información de sesión correcta

**Cómo probar:**
1. Login como admin
2. Menú ☰ → "📊 Diagnóstico FASE 1"
3. **✅ Verificar métricas de login**

#### **3. BUNDLE OPTIMIZADO**
- [ ] **Carga inicial**: < 3 segundos
- [ ] **Sin errores JS**: Consola limpia
- [ ] **Lazy loading**: Modales cargan bajo demanda

**Cómo probar:**
1. F12 → Network → Reload
2. **✅ Ver tiempo total de carga**
3. **✅ Verificar que modales cargan solo al abrirse**

#### **4. FUNCIONALIDAD OFFLINE**
- [ ] **Navegación**: Funciona sin internet
- [ ] **Datos**: Se mantienen disponibles
- [ ] **Service Worker**: Activo y funcionando

**Cómo probar:**
1. Navega por territorios con internet
2. F12 → Network → Offline
3. **✅ Debería seguir funcionando**

---

## 🔧 **HERRAMIENTAS DE DESARROLLO**

### **Consola de Performance**
```javascript
// Medir tiempo de login manualmente
const start = performance.now();
// [hacer login]
const end = performance.now();
console.log(`Login time: ${end - start}ms`);
```

### **Verificar Cache Local**
```javascript
// Ver usuarios en cache
Object.keys(localStorage).filter(key => key.includes('user_cache_'));

// Ver métricas de performance
localStorage.getItem('performance_metrics');
```

### **Estado del Service Worker**
```javascript
// Verificar registro
navigator.serviceWorker.getRegistration().then(reg => console.log(reg));

// Estado actual
navigator.serviceWorker.controller;
```

---

## 🐛 **DEBUGGING COMÚN**

### **Error: Firebase _databaseId**
- **Causa**: Configuración incorrecta de Firebase
- **Solución**: Ya corregido en firebase.js
- **Verificar**: No debe aparecer en localhost

### **Login Lento**
- **Causa**: Cache no funcionando
- **Verificar**: localStorage debe tener `user_cache_[codigo]`
- **Solución**: Revisar AppContext.jsx línea del cache

### **Modales No Cargan**
- **Causa**: Lazy loading fallando
- **Verificar**: Network tab debe mostrar carga bajo demanda
- **Solución**: Revisar imports dinámicos en App.jsx

---

## 📊 **MÉTRICAS OBJETIVO - LOCALHOST**

| **Métrica** | **Objetivo** | **Cómo Medir** |
|-------------|--------------|-----------------|
| Login inicial | < 1500ms | Panel diagnóstico |
| Login cache | < 500ms | Panel diagnóstico |
| Carga app | < 2000ms | DevTools Network |
| Primer paint | < 1000ms | DevTools Performance |

---

## 🚀 **COMANDOS ÚTILES**

```bash
# Desarrollo normal
npm run dev

# Build para testing
npm run build

# Limpiar cache de npm
npm run dev -- --force

# Ver tamaño de bundles
npm run build -- --analyze
```

---

## 📝 **REPORTE DE TESTING**

**Después de probar en localhost, reporta:**

✅ **FUNCIONA:**
- [ ] Login cache rápido
- [ ] Panel diagnóstico visible
- [ ] Consola sin errores
- [ ] Funcionalidad offline
- [ ] Carga inicial rápida

❌ **PROBLEMAS:**
- [ ] Error específico: ___________
- [ ] Tiempo lento: ___________
- [ ] Funcionalidad rota: ___________

**Una vez que todo funcione en localhost, subiremos a Netlify.** 