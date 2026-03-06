# 📋 Instrucciones para Corregir Datos Históricos

## 🎯 Propósito
Este script corregirá los territorios completados que muestran "Completado por: no especificado" debido al bug que existía anteriormente.

## 🔧 Preparación

### Opción A: Ejecutar Localmente (Recomendado)

1. **Navegar a la carpeta del script:**
   ```bash
   cd scripts
   ```

2. **Instalar dependencias:**
   ```bash
   npm install
   ```

### Opción B: Usar el Script en Firebase Console
Si prefieres no instalar nada localmente, puedes copiar y pegar el siguiente código directamente en la consola de Firebase:

```javascript
// Código para ejecutar en Firebase Console usando territoryHistory
const territoriesRef = db.collection('territories');
const snapshot = await territoriesRef
  .where('status', 'in', ['Completado', 'Terminado'])
  .get();

let corregidos = 0;
let sinHistorial = 0;

for (const doc of snapshot.docs) {
  const data = doc.data();
  
  if (!data.completedBy && !data.completedById) {
    try {
      // Consultar historial para este territorio
      const historySnapshot = await db.collection('territoryHistory')
        .where('territoryId', '==', doc.id)
        .get();
      
      if (historySnapshot.empty) {
        sinHistorial++;
        console.log(`⚠️ Sin historial: ${data.name}`);
        continue;
      }
      
      // Encontrar la última asignación
      let ultimaAsignacion = null;
      let fechaMasReciente = null;
      
      historySnapshot.forEach(historyDoc => {
        const historyData = historyDoc.data();
        
        if (historyData.assignedTo || historyData.userId) {
          const fecha = historyData.timestamp?.toDate() || 
                       historyData.date?.toDate() ||
                       historyData.createdAt?.toDate();
          
          if (!fechaMasReciente || (fecha && fecha > fechaMasReciente)) {
            fechaMasReciente = fecha;
            ultimaAsignacion = historyData;
          }
        }
      });
      
      if (ultimaAsignacion) {
        const updateData = {
          dataFixedAt: firebase.firestore.FieldValue.serverTimestamp(),
          dataFixedReason: 'Corrección usando territoryHistory - Bug diciembre 2024',
          dataSourceHistory: true
        };
        
        if (ultimaAsignacion.assignedTo || ultimaAsignacion.userName) {
          updateData.completedBy = ultimaAsignacion.assignedTo || ultimaAsignacion.userName;
          updateData.terminadoPor = ultimaAsignacion.assignedTo || ultimaAsignacion.userName;
        }
        
        if (ultimaAsignacion.userId || ultimaAsignacion.assignedToId) {
          updateData.completedById = ultimaAsignacion.userId || ultimaAsignacion.assignedToId;
        }
        
        await doc.ref.update(updateData);
        corregidos++;
        console.log(`✅ Corregido: ${data.name} → ${updateData.completedBy}`);
      } else {
        sinHistorial++;
        console.log(`⚠️ Sin asignación válida en historial: ${data.name}`);
      }
      
    } catch (error) {
      console.error(`❌ Error procesando ${data.name}: ${error.message}`);
    }
  }
}

console.log(`Total corregidos: ${corregidos}`);
console.log(`Sin historial válido: ${sinHistorial}`);
```

## 🚀 Ejecución del Script Local

### Paso 1: Modo Simulación (Ver qué se corregiría)
```bash
npm run simular
```

Este comando:
- NO hace cambios en la base de datos
- Muestra qué territorios necesitan corrección
- Indica si tienen información suficiente para corregir

### Paso 2: Ejecutar la Corrección
```bash
npm run ejecutar
```

Este comando:
- ⚠️ SÍ modifica la base de datos
- Tiene un delay de 5 segundos de seguridad
- Muestra el progreso en tiempo real
- Genera un resumen al final

## 📊 Qué Hace el Script

1. **Busca** todos los territorios con estado "Completado" o "Terminado"
2. **Identifica** los que no tienen el campo `completedBy`
3. **Consulta** la colección `territoryHistory` para cada territorio
4. **Encuentra** la última asignación válida en el historial
5. **Copia** la información del historial → campos del territorio:
   - `ultimaAsignacion.assignedTo` → `completedBy`
   - `ultimaAsignacion.userId` → `completedById`
6. **Agrega** metadata sobre la corrección:
   - `dataFixedAt`: Fecha de la corrección
   - `dataFixedReason`: "Corrección datos históricos usando territoryHistory - Bug diciembre 2024"
   - `dataSourceHistory`: true (indica que se usó el historial)

## ⚠️ Casos Especiales

### Territorios sin historial disponible
Si un territorio completado no tiene registros en `territoryHistory`, el script lo reportará pero NO podrá corregirlo automáticamente. Estos casos requerirán corrección manual.

**Posibles causas:**
- Territorio completado antes de implementar `territoryHistory`
- Registros del historial eliminados accidentalmente
- Errores en la estructura de datos del historial

### Ejemplo de salida:
```
🔍 Territorio T-15 (abc123):
   Estado: Completado
   ⚠️ NO HAY HISTORIAL DISPONIBLE
   
🔍 Territorio T-20 (def456):
   Estado: Completado
   ⚠️ NO SE ENCONTRÓ ASIGNACIÓN EN EL HISTORIAL
```

## 🔒 Seguridad

- El script usa las mismas credenciales de Firebase que la aplicación
- Solo modifica campos específicos, no borra ni altera otros datos
- Agrega metadata para rastrear qué documentos fueron corregidos

## 📝 Verificación Post-Corrección

Después de ejecutar el script:
1. Revisar en la aplicación que los territorios ahora muestren el responsable
2. Verificar en Firebase Console que los campos se agregaron correctamente
3. Los territorios que no se pudieron corregir automáticamente aparecerán en el resumen

## 💡 Alternativa: Corrección Manual

Si prefieres corregir manualmente casos específicos:
1. Ve a Firebase Console → Firestore
2. Navega a la colección `territories`
3. Filtra por `status == "Completado"`
4. Para cada documento sin `completedBy`:
   - Copia el valor de `assignedTo`
   - Crea/edita el campo `completedBy` con ese valor

---

**Nota**: Este script es de uso único para corregir datos históricos. El bug ya fue solucionado en la aplicación, por lo que nuevos territorios completados guardarán la información correctamente. 