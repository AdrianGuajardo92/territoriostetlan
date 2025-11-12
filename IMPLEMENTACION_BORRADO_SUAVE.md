# 📋 GUÍA DE IMPLEMENTACIÓN: Sistema de Borrado Suave (Soft Delete)

## 🎯 Resumen
Sistema que archiva direcciones en lugar de eliminarlas permanentemente, permitiendo a los administradores consultar el historial completo.

---

## ✅ ARCHIVOS YA CREADOS

### 1. **`src/utils/softDelete.js`**
✅ **CREADO** - Contiene todas las utilidades para:
- `archiveAddress()` - Archivar direcciones
- `restoreAddress()` - Restaurar direcciones
- `filterActiveAddresses()` - Filtrar activas
- `getArchivedAddresses()` - Obtener archivadas

### 2. **`src/components/admin/ArchivedAddresses.jsx`**
✅ **CREADO** - Componente completo con:
- Lista de direcciones archivadas
- Búsqueda y filtros
- Restauración de direcciones
- Eliminación permanente
- Estadísticas

---

## 🔧 MODIFICACIONES NECESARIAS

### 1. **AppContext.jsx** - Modificar función de eliminación

**Ubicación:** `src/context/AppContext.jsx`
**Línea:** ~331

**BUSCAR:**
```javascript
const handleDeleteAddress = async (addressId, options = {}) => {
  const { showSuccessToast = true } = options;

  try {
    await deleteDoc(doc(db, 'addresses', addressId));
    if (showSuccessToast) {
      showToast('Dirección eliminada correctamente', 'success');
    }
```

**REEMPLAZAR CON:**
```javascript
const handleDeleteAddress = async (addressId, options = {}) => {
  const {
    showSuccessToast = true,
    deletedBy = null,
    deletedReason = null,
    fromProposal = false
  } = options;

  try {
    // Obtener datos de la dirección antes de "borrar"
    const addressToDelete = addresses.find(addr => addr.id === addressId);

    // En lugar de eliminar, marcar como eliminada (soft delete)
    await updateDoc(doc(db, 'addresses', addressId), {
      deleted: true,
      deletedAt: serverTimestamp(),
      deletedBy: deletedBy || currentUser?.id,
      deletedByName: currentUser?.name || 'Sistema',
      deletedReason: deletedReason || (fromProposal ? 'Aprobado desde propuesta de eliminación' : 'Eliminado por administrador'),
      // Preservar datos originales
      ...(addressToDelete && {
        originalData: {
          address: addressToDelete.address,
          territoryId: addressToDelete.territoryId,
          name: addressToDelete.name || '',
          phone: addressToDelete.phone || '',
          notes: addressToDelete.notes || '',
          gender: addressToDelete.gender || '',
          isVisited: addressToDelete.isVisited || false
        }
      })
    });

    if (showSuccessToast) {
      showToast('Dirección archivada correctamente', 'success');
    }
```

**AGREGAR IMPORT:**
```javascript
import { updateDoc, serverTimestamp } from 'firebase/firestore';
```

---

### 2. **AppContext.jsx** - Filtrar direcciones activas

**Ubicación:** `src/context/AppContext.jsx`
**Línea:** ~1550 (en la suscripción de addresses)

**BUSCAR:**
```javascript
const addressesQuery = query(collection(db, 'addresses'));
const unsubAddresses = onSnapshot(addressesQuery, (snapshot) => {
  const addressesData = snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));
  setAddresses(addressesData);
});
```

**REEMPLAZAR CON:**
```javascript
const addressesQuery = query(collection(db, 'addresses'));
const unsubAddresses = onSnapshot(addressesQuery, (snapshot) => {
  const addressesData = snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));
  // IMPORTANTE: Solo mostrar direcciones NO eliminadas
  const activeAddresses = addressesData.filter(addr => !addr.deleted);
  setAddresses(activeAddresses);

  // Opcional: Guardar todas las direcciones en otro estado si necesitas
  // setAllAddresses(addressesData);
});
```

---

### 3. **AdminModal.jsx** - Agregar opción de Direcciones Archivadas

**Ubicación:** `src/components/modals/AdminModal.jsx`

**PASO 1 - Agregar imports al inicio:**
```javascript
import ArchivedAddresses from '../admin/ArchivedAddresses';
import { Archive } from 'lucide-react';
```

**PASO 2 - Agregar estado (línea ~30):**
```javascript
const [showArchivedAddresses, setShowArchivedAddresses] = useState(false);
```

**PASO 3 - Agregar botón en el menú (buscar "Respaldo de Datos" y agregar después):**
```javascript
{/* Direcciones Archivadas */}
<button
  onClick={() => setShowArchivedAddresses(true)}
  className="w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors border-b border-gray-100"
>
  <div className="flex items-center justify-between">
    <div className="flex items-center space-x-3">
      <Archive className="w-5 h-5 text-gray-600" />
      <div>
        <p className="font-medium text-gray-900">Direcciones Archivadas</p>
        <p className="text-sm text-gray-500">Ver historial de direcciones eliminadas</p>
      </div>
    </div>
    <ChevronRight className="w-5 h-5 text-gray-400" />
  </div>
</button>
```

**PASO 4 - Renderizar modal (antes del último </div> del componente):**
```javascript
{/* Modal de Direcciones Archivadas */}
{showArchivedAddresses && (
  <ArchivedAddresses onClose={() => setShowArchivedAddresses(false)} />
)}
```

---

## 🚀 PASOS DE IMPLEMENTACIÓN

### Orden Recomendado:

1. **Modificar AppContext.jsx**
   - Cambiar función `handleDeleteAddress`
   - Modificar suscripción de addresses

2. **Modificar AdminModal.jsx**
   - Agregar imports
   - Agregar estado
   - Agregar botón en menú
   - Renderizar modal

3. **Probar**
   - Eliminar una dirección como admin
   - Verificar en Centro de Administración → Direcciones Archivadas
   - Probar restaurar
   - Probar eliminar permanentemente

---

## 🧪 CASOS DE PRUEBA

### Test 1: Archivar Dirección
1. Login como admin
2. Eliminar cualquier dirección
3. Verificar mensaje "Dirección archivada correctamente"
4. La dirección NO debe aparecer en el mapa

### Test 2: Ver Archivadas
1. Centro de Administración → Direcciones Archivadas
2. Debe mostrar la dirección eliminada
3. Debe mostrar: fecha, quién la eliminó, razón

### Test 3: Restaurar
1. En Direcciones Archivadas, click en "Restaurar"
2. Confirmar
3. La dirección debe volver al mapa

### Test 4: Eliminar Permanentemente
1. En Direcciones Archivadas, click en "Eliminar"
2. Confirmar
3. La dirección desaparece permanentemente

---

## 📝 NOTAS IMPORTANTES

1. **Retrocompatibilidad**: Las direcciones existentes sin campo `deleted` funcionan normalmente

2. **Permisos**: Solo administradores pueden ver direcciones archivadas

3. **Datos Preservados**: Se guardan TODOS los datos originales

4. **Propuestas**: Si implementas propuestas de eliminación, usar:
   ```javascript
   handleDeleteAddress(addressId, {
     fromProposal: true,
     deletedBy: proposal.proposedBy,
     deletedReason: proposal.reason
   })
   ```

---

## ✅ CHECKLIST

- [ ] Modificar `handleDeleteAddress` en AppContext
- [ ] Filtrar direcciones activas en suscripción
- [ ] Agregar imports en AdminModal
- [ ] Agregar estado `showArchivedAddresses`
- [ ] Agregar botón en menú de admin
- [ ] Renderizar modal de ArchivedAddresses
- [ ] Probar archivar dirección
- [ ] Probar ver archivadas
- [ ] Probar restaurar
- [ ] Probar eliminar permanentemente

---

## 🆘 SOLUCIÓN DE PROBLEMAS

### Error: "updateDoc is not defined"
**Solución:** Agregar import en AppContext:
```javascript
import { updateDoc, serverTimestamp } from 'firebase/firestore';
```

### Las direcciones archivadas siguen apareciendo
**Solución:** Verificar filtro en suscripción:
```javascript
const activeAddresses = addressesData.filter(addr => !addr.deleted);
```

### No aparece la opción en Admin
**Solución:** Verificar que agregaste el botón Y el modal en AdminModal

---

## 📞 SOPORTE

Si tienes problemas con la implementación:
1. Revisa que todos los archivos estén creados
2. Verifica los imports
3. Revisa la consola del navegador
4. Los archivos creados están en:
   - `src/utils/softDelete.js`
   - `src/components/admin/ArchivedAddresses.jsx`

¡El sistema está listo para implementar! Solo necesitas hacer las modificaciones indicadas arriba.