# Corrección Modal Mapa de Territorios - 2024

## Problema Reportado
El usuario reportó que al cerrar el modal del mapa de territorios (ya sea con la X o con el botón de volver), la aplicación se salía completamente de la vista de territorios y regresaba a la pantalla principal, en lugar de solo cerrar el modal y permanecer en la vista de las tarjetas de direcciones.

## Análisis del Problema
El problema estaba en el hook `useModalHistory` que se estaba usando en el modal del mapa. Este hook:

1. **Agregaba una entrada al historial** cuando se abría el modal
2. **Navegaba hacia atrás** cuando se cerraba el modal
3. **Interfería con la navegación** de la aplicación principal

Esto causaba que al cerrar el modal, se ejecutara `window.history.back()`, lo que podía sacar al usuario de la vista del territorio.

## Solución Implementada

### Cambios Realizados

1. **Eliminación del hook `useModalHistory`** en `MapModal.jsx`:
   ```javascript
   // ANTES
   import { useModalHistory } from '../../hooks/useModalHistory';
   const { closeModal } = useModalHistory(isOpen, onClose, modalId);
   
   // DESPUÉS
   // Eliminado completamente
   ```

2. **Reemplazo de `closeModal` por `onClose`**:
   ```javascript
   // ANTES
   onClick={closeModal}
   
   // DESPUÉS
   onClick={onClose}
   ```

### Archivos Modificados
- `src/components/modals/MapModal.jsx`

## Resultado
Ahora cuando el usuario:
1. **Abre el modal del mapa** desde la vista de territorios
2. **Cierra el modal** (con X o botón volver)
3. **Permanece en la vista de territorios** con todas las tarjetas de direcciones visibles

## Beneficios
- ✅ **Navegación consistente**: El modal se comporta como un overlay simple
- ✅ **Experiencia de usuario mejorada**: No se pierde el contexto del territorio
- ✅ **Comportamiento predecible**: El usuario sabe exactamente dónde estará después de cerrar el modal

## Notas Técnicas
- El hook `useModalHistory` sigue siendo útil para otros modales que requieren manejo especial del historial
- El modal del mapa ahora usa el cierre directo sin interferir con la navegación de la aplicación
- Se mantiene la funcionalidad completa del mapa (navegación, edición, etc.)

## Fecha de Implementación
- **Fecha**: Diciembre 2024
- **Versión**: 2.29.0
- **Estado**: ✅ Completado y probado 