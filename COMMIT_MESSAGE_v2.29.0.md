feat: implementar botón físico de volver como cancelar en modal editar dirección

## 🚀 Nueva Funcionalidad - v2.29.0

### 📱 Botón Físico de Volver Mejorado

Se ha implementado una mejora significativa en la experiencia móvil que permite que el **botón físico de volver del celular** funcione como un botón de **cancelar** cuando está abierto el modal de editar dirección.

### 🎯 Cambios Principales

#### 1. Nueva Prioridad en Manejo del Botón Físico de Volver
- **Archivo**: `src/App.jsx`
- **Cambio**: Agregada PRIORIDAD 6 para modal de editar dirección
- **Funcionalidad**: Detecta cuando el modal de editar dirección está abierto y lo cierra al presionar botón físico

#### 2. Event Listener para Cierre del Modal
- **Archivo**: `src/pages/TerritoryDetailView.jsx`
- **Cambio**: Agregado event listener para `closeAddressFormModal`
- **Funcionalidad**: Maneja el cierre del modal desde el botón físico de volver

#### 3. Gestión Mejorada del Historial
- **Archivo**: `src/pages/TerritoryDetailView.jsx`
- **Cambio**: Actualización del historial con `modalType: 'edit-address-modal'`
- **Funcionalidad**: Limpieza automática del historial al cerrar el modal

### 🔧 Detalles Técnicos

#### Jerarquía de Prioridades Actualizada:
1. Vista de revisitas y estudios
2. Vista de propuestas  
3. Territorio seleccionado
4. Modal activo
5. Menú abierto
6. **Modal de editar dirección** ⭐ NUEVO
7. Verificar historial
8. Navegación normal
9. Confirmación de salida

#### Eventos Personalizados:
- **Evento**: `closeAddressFormModal`
- **Propósito**: Comunicación entre componentes para cierre del modal
- **Implementación**: `CustomEvent` con `window.dispatchEvent()`

### ✅ Beneficios

#### Para el Usuario:
- **Experiencia más intuitiva**: Botón físico funciona como esperado
- **No pérdida de contexto**: Permanece en vista del territorio
- **Acceso rápido**: Cancelar edición con un solo toque
- **Consistencia móvil**: Comportamiento natural en dispositivos móviles

#### Para la Aplicación:
- **Prevención de errores**: Evita salidas accidentales del territorio
- **Usabilidad mejorada**: Mejor experiencia en dispositivos móviles
- **Compatibilidad**: Funciona con sistemas existentes (lazy loading, useModalHistory)

### 🧪 Testing

#### Casos Verificados:
- ✅ Botón físico cierra modal correctamente
- ✅ Usuario permanece en vista del territorio
- ✅ Historial se limpia automáticamente
- ✅ No afecta otros modales
- ✅ Funciona en edición y creación de direcciones
- ✅ Compatible con lazy loading

#### Dispositivos Probados:
- ✅ Android (botón físico de volver)
- ✅ iOS (gesto de deslizar hacia atrás)
- ✅ Navegador desktop (botón atrás)
- ✅ PWA (modo app)

### 📝 Archivos Modificados

#### Archivos de Código:
- `src/App.jsx` - Nueva prioridad en manejo del botón físico
- `src/pages/TerritoryDetailView.jsx` - Event listener y gestión del historial

#### Archivos de Versión:
- `package.json` - Versión actualizada a 2.29.0
- `version.json` - Versión actualizada a 2.29.0
- `public/version.json` - Versión actualizada a 2.29.0

#### Documentación:
- `BOTON_FISICO_VOLVER_MODAL_EDITAR_2024.md` - Documentación técnica
- `RELEASE_v2.29.0_BOTON_FISICO_MODAL_EDITAR.md` - Notas de release

### 🚀 Impacto

**Tipo**: Mejora de UX  
**Alcance**: Experiencia móvil  
**Riesgo**: Bajo - No afecta funcionalidad existente  
**Compatibilidad**: Total - Compatible con todos los sistemas existentes  

---

**Resumen**: Implementación exitosa de funcionalidad para que el botón físico de volver del celular funcione como cancelar en el modal de editar dirección, mejorando significativamente la experiencia móvil de los usuarios. 