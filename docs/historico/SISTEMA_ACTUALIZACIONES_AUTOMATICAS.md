# 🔄 Sistema de Actualizaciones Automáticas - Territorios LS

## 📋 Resumen

Este documento describe el **sistema completo de actualizaciones automáticas** implementado en la aplicación Territorios LS, diseñado para solucionar el problema del cache del navegador y asegurar que todos los usuarios reciban las nuevas versiones sin problemas.

## 🎯 Problema Resuelto

### ❌ **Problema Original:**
- Los usuarios no veían las actualizaciones debido al cache del navegador
- Necesitaban borrar cookies manualmente para ver cambios
- No había notificación automática de nuevas versiones
- El Service Worker no manejaba correctamente las actualizaciones

### ✅ **Solución Implementada:**
- **Detección automática** de nuevas versiones cada 5 minutos
- **Cache busting** inteligente para evitar problemas de cache
- **Notificaciones visuales** elegantes cuando hay actualizaciones
- **Actualización forzada** para versiones críticas
- **Botón manual** en el menú para verificar actualizaciones

## 🏗️ Arquitectura del Sistema

### 1. **Hook useAppUpdates** (`src/hooks/useAppUpdates.jsx`)
```javascript
// Funcionalidades principales:
- checkForUpdates() // Verifica nuevas versiones con cache busting
- forceAppUpdate() // Limpia cache y recarga forzadamente
- softUpdate() // Recarga suave con notificación
- Detección automática cada 5 minutos
- Verificación cuando la app vuelve a estar visible
```

### 2. **Componente UpdateNotification** (`src/components/common/UpdateNotification.jsx`)
```javascript
// Características:
- Notificación elegante en esquina superior derecha
- Diferentes estilos para actualizaciones normales vs críticas
- Botones de acción (Actualizar / Más tarde)
- Indicador de progreso para actualizaciones críticas
- Animación de entrada suave
```

### 3. **Service Worker Mejorado** (`public/sw.js`)
```javascript
// Estrategias de cache:
- version.json: Network First (siempre verificar nueva versión)
- Archivos críticos: Cache First con verificación en background
- Otros recursos: Network First con fallback a cache
- Limpieza automática de caches antiguos
```

### 4. **Botón Manual en Menú** (`src/components/common/MobileMenu.jsx`)
```javascript
// Funcionalidad:
- Botón "Verificar Actualizaciones" en el menú móvil
- Indicador de carga durante la verificación
- Integración con el hook useAppUpdates
```

## 🔧 Configuración de Versiones

### **Archivos de Versión:**

1. **`package.json`** - Versión del proyecto
```json
{
  "version": "1.0.3"
}
```

2. **`public/version.json`** - Versión para la app
```json
{
  "version": "1.0.3",
  "timestamp": "2025-01-03T07:30:00.000Z",
  "releaseDate": "2025-01-03",
  "forceUpdate": false,
  "critical": false,
  "description": "Descripción de los cambios",
  "changes": ["Lista de cambios"]
}
```

### **Parámetros de version.json:**
- `version`: Número de versión (debe coincidir con package.json)
- `forceUpdate`: Si es `true`, fuerza la actualización automáticamente
- `critical`: Si es `true`, muestra notificación crítica (no se puede cerrar)
- `description`: Descripción breve de la actualización
- `changes`: Array con lista detallada de cambios

## 🚀 Flujo de Actualización

### **Para Usuarios Nuevos:**
1. Usuario accede a la app por primera vez
2. Se descarga la versión actual
3. Se instala el Service Worker
4. Se cachean los archivos críticos

### **Para Usuarios Existentes:**
1. **Detección automática** cada 5 minutos
2. **Cache busting** en `version.json` para evitar cache
3. **Comparación** de versiones local vs remota
4. **Notificación** si hay nueva versión disponible
5. **Actualización** según el tipo:
   - **Normal**: Usuario puede elegir actualizar o posponer
   - **Crítica**: Actualización automática en 30 segundos

### **Proceso de Actualización:**
1. **Limpieza de cache** del navegador
2. **Limpieza** de localStorage y sessionStorage
3. **Recarga** de la página
4. **Instalación** de nueva versión

## 📱 Experiencia del Usuario

### **Notificación Normal:**
- Aparece en esquina superior derecha
- Color azul con icono de actualización
- Botones: "Actualizar" y "Más tarde"
- Se cierra automáticamente en 5 segundos si no hay interacción

### **Notificación Crítica:**
- Color rojo con icono de alerta
- Solo botón "Actualizar Ahora"
- Barra de progreso que cuenta 30 segundos
- Actualización automática si no se actúa

### **Botón Manual:**
- En el menú móvil
- Muestra "Verificando..." durante el proceso
- Cierra el menú automáticamente después de verificar

## 🔄 Ciclo de Desarrollo

### **1. Desarrollo Local:**
```bash
# Hacer cambios en el código
# Probar en localhost
# Verificar que funciona correctamente
```

### **2. Actualización de Versión:**
```bash
# Actualizar package.json
npm version patch  # o minor/major

# Actualizar public/version.json
# Agregar descripción y cambios
# Configurar forceUpdate si es necesario
```

### **3. Despliegue:**
```bash
# Commit y push a GitHub
git add .
git commit -m "v1.0.3: Descripción de cambios"
git push origin main

# Netlify se despliega automáticamente
```

### **4. Notificación a Usuarios:**
- Los usuarios reciben notificación automática
- Pueden actualizar inmediatamente o más tarde
- La app se actualiza sin perder datos

## 🛠️ Mantenimiento

### **Verificar Estado del Sistema:**
```javascript
// En la consola del navegador:
// Verificar versión actual
console.log('Versión actual:', process.env.npm_package_version);

// Verificar hook de actualizaciones
// (se puede acceder desde React DevTools)
```

### **Debugging:**
```javascript
// Logs del Service Worker:
// - "SW: Eliminando cache antiguo: [nombre]"
// - "SW: Error en activación: [error]"

// Logs del hook:
// - "Error verificando actualizaciones: [error]"
```

### **Monitoreo:**
- Revisar logs de Netlify para errores de despliegue
- Verificar que `version.json` se sirve correctamente
- Monitorear métricas de actualización en Analytics

## 🎨 Personalización

### **Estilos de Notificación:**
```css
/* En src/index.css */
.animate-slideInRight {
    animation: slideInRight 0.3s ease-out;
}

@keyframes slideInRight {
    from { transform: translateX(100%); opacity: 0; }
    to { transform: translateX(0); opacity: 1; }
}
```

### **Configuración de Tiempos:**
```javascript
// En useAppUpdates.jsx
const CHECK_INTERVAL = 5 * 60 * 1000; // 5 minutos
const CRITICAL_TIMEOUT = 30 * 1000; // 30 segundos
```

## 🔒 Seguridad

### **Validaciones:**
- Verificación de integridad del `version.json`
- Timeout en peticiones de actualización
- Manejo de errores sin exponer información sensible
- Cache busting para evitar versiones corruptas

### **Fallbacks:**
- Si falla la verificación, no se muestra error al usuario
- Si falla la actualización, se mantiene la versión actual
- Service Worker offline-first para funcionamiento sin conexión

## 📊 Métricas y Analytics

### **Eventos a Monitorear:**
- Verificaciones de actualización
- Actualizaciones exitosas vs fallidas
- Tiempo de respuesta del `version.json`
- Uso del botón manual de actualización

### **KPIs:**
- Porcentaje de usuarios con versión actualizada
- Tiempo promedio para actualizar
- Tasa de éxito de actualizaciones automáticas

## 🚨 Troubleshooting

### **Problemas Comunes:**

1. **Usuario no ve actualizaciones:**
   - Verificar que `version.json` se actualizó
   - Comprobar que el Service Worker está activo
   - Revisar logs del navegador

2. **Actualización falla:**
   - Verificar conectividad de red
   - Comprobar que Netlify desplegó correctamente
   - Revisar errores en la consola

3. **Cache persistente:**
   - El sistema limpia cache automáticamente
   - Si persiste, usuario puede usar botón manual
   - Como último recurso, borrar cache del navegador

### **Comandos de Debug:**
```javascript
// Forzar verificación de actualizaciones
window.location.reload(true);

// Limpiar cache manualmente
if ('caches' in window) {
    caches.keys().then(names => {
        names.forEach(name => caches.delete(name));
    });
}

// Verificar Service Worker
navigator.serviceWorker.getRegistrations().then(registrations => {
    console.log('SW registrations:', registrations);
});
```

## 🎯 Beneficios del Sistema

### **Para Usuarios:**
- ✅ Actualizaciones automáticas sin intervención
- ✅ Notificaciones claras y elegantes
- ✅ No pérdida de datos durante actualización
- ✅ Funcionamiento offline garantizado

### **Para Desarrolladores:**
- ✅ Despliegue inmediato a todos los usuarios
- ✅ Control granular sobre tipos de actualización
- ✅ Sistema robusto y confiable
- ✅ Fácil mantenimiento y debugging

### **Para el Negocio:**
- ✅ Usuarios siempre con la versión más reciente
- ✅ Correcciones de bugs se aplican inmediatamente
- ✅ Nuevas funcionalidades disponibles al instante
- ✅ Mejor experiencia de usuario

---

## 📞 Soporte

Si tienes problemas con el sistema de actualizaciones:

1. **Revisar logs** del navegador y Service Worker
2. **Verificar** que `version.json` está actualizado
3. **Comprobar** que Netlify desplegó correctamente
4. **Contactar** al equipo de desarrollo si persiste el problema

**Última actualización:** 3 de Enero, 2025  
**Versión del documento:** 1.0 