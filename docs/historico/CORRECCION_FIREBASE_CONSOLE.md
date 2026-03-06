# 🔥 Corrección Directa en Firebase Console

## 📋 Instrucciones Paso a Paso

### 1. Abrir Firebase Console
1. Ve a https://console.firebase.google.com/
2. Selecciona el proyecto `gestor-territorios-ls`
3. En el menú lateral, ve a **Firestore Database**

### 2. Abrir la Consola de JavaScript
En Firebase Console:
1. Presiona `F12` para abrir herramientas de desarrollador
2. Ve a la pestaña **Console**
3. Copia y pega el siguiente código:

```javascript
// 🔧 CORRECCIÓN ESPECÍFICA - TERRITORIOS COMPLETADOS DICIEMBRE 2024
// Ejecutar directamente en Firebase Console

async function corregirTerritoriosEsteMes() {
  console.log('🔧 INICIANDO CORRECCIÓN DE TERRITORIOS COMPLETADOS');
  console.log('📅 Buscando completaciones de este mes usando territoryHistory...\n');
  
  try {
    // 1. Obtener fecha de inicio del mes actual
    const now = new Date();
    const inicioMes = new Date(now.getFullYear(), now.getMonth(), 1);
    console.log(`📅 Buscando desde: ${inicioMes.toLocaleDateString()}`);
    
    // 2. Consultar territoryHistory para completaciones
    const historySnapshot = await db.collection('territoryHistory')
      .where('status', '==', 'Terminado')
      .orderBy('completedDate', 'desc')
      .get();
    
    if (historySnapshot.empty) {
      console.log('❌ No se encontraron registros en territoryHistory');
      return;
    }
    
    console.log(`📊 Registros en historial: ${historySnapshot.size}`);
    
    // 3. Filtrar completaciones de este mes
    const completacionesEsteMes = new Map();
    
    historySnapshot.forEach((doc) => {
      const data = doc.data();
      const completedDate = data.completedDate?.toDate();
      
      if (completedDate && completedDate >= inicioMes) {
        const territoryId = data.territoryId;
        
        // Guardar la completación más reciente por territorio
        if (!completacionesEsteMes.has(territoryId) || 
            completedDate > completacionesEsteMes.get(territoryId).fecha) {
          
          completacionesEsteMes.set(territoryId, {
            territoryId: territoryId,
            territoryName: data.territoryName,
            completedBy: data.assignedTo,
            fecha: completedDate,
            fechaTexto: completedDate.toLocaleDateString()
          });
        }
      }
    });
    
    console.log(`🎯 Territorios completados este mes: ${completacionesEsteMes.size}`);
    
    if (completacionesEsteMes.size === 0) {
      console.log('ℹ️  No hay territorios completados este mes');
      return;
    }
    
    // 4. Mostrar territorios encontrados
    console.log('\n📋 TERRITORIOS COMPLETADOS ESTE MES:');
    console.log('-'.repeat(50));
    let contador = 0;
    completacionesEsteMes.forEach((comp) => {
      contador++;
      console.log(`${contador}. ${comp.territoryName} - ${comp.completedBy} (${comp.fechaTexto})`);
    });
    
    // 5. Procesar correcciones
    console.log('\n🔍 Verificando cuáles necesitan corrección...');
    let territoriosCorregidos = 0;
    let territoriosYaCorrectos = 0;
    
    for (const [territoryId, completacion] of completacionesEsteMes) {
      try {
        // Consultar el territorio actual
        const territoryDoc = await db.collection('territories').doc(territoryId).get();
        
        if (!territoryDoc.exists) {
          console.log(`⚠️  Territorio ${territoryId} no encontrado`);
          continue;
        }
        
        const territoryData = territoryDoc.data();
        
        // Verificar si necesita corrección
        const tieneResponsable = territoryData.completedBy || 
                                territoryData.terminadoPor ||
                                territoryData.completedById;
        
        if (!tieneResponsable) {
          // Necesita corrección
          console.log(`\n🔧 CORRIGIENDO: ${completacion.territoryName}`);
          console.log(`   Asignando a: ${completacion.completedBy}`);
          
          const updateData = {
            completedBy: completacion.completedBy,
            terminadoPor: completacion.completedBy,
            lastCompletedBy: completacion.completedBy,
            // Metadata de la corrección
            dataFixedAt: firebase.firestore.FieldValue.serverTimestamp(),
            dataFixedSource: 'territoryHistory',
            dataFixedReason: 'Corrección diciembre 2024 - datos históricos'
          };
          
          await db.collection('territories').doc(territoryId).update(updateData);
          territoriosCorregidos++;
          console.log(`   ✅ Corregido exitosamente`);
          
        } else {
          territoriosYaCorrectos++;
          console.log(`ℹ️  ${completacion.territoryName} ya tiene responsable`);
        }
        
      } catch (error) {
        console.error(`❌ Error procesando ${territoryId}:`, error.message);
      }
    }
    
    // 6. Resumen final
    console.log('\n' + '='.repeat(50));
    console.log('📊 RESUMEN DE CORRECCIÓN:');
    console.log('='.repeat(50));
    console.log(`🎯 Territorios completados este mes: ${completacionesEsteMes.size}`);
    console.log(`✅ Territorios corregidos: ${territoriosCorregidos}`);
    console.log(`ℹ️  Territorios ya correctos: ${territoriosYaCorrectos}`);
    console.log('\n🔄 RECARGA TU APLICACIÓN PARA VER LOS CAMBIOS');
    
  } catch (error) {
    console.error('\n❌ ERROR CRÍTICO:', error);
  }
}

// 🚀 EJECUTAR LA CORRECCIÓN
corregirTerritoriosEsteMes();
```

### 3. Después de Ejecutar
1. **Espera** a que termine el script (verás el resumen al final)
2. **Recarga** tu aplicación en `http://localhost:3000`
3. **Verifica** que ahora aparezcan los nombres correctos

## 🎯 ¿Qué Hace Este Script?

1. **Busca** en `territoryHistory` todos los territorios terminados este mes
2. **Identifica** quién completó cada territorio según el historial
3. **Actualiza** solo los territorios que no tienen responsable asignado
4. **Mantiene** intactos los que ya están correctos
5. **Añade** metadata para rastrear la corrección

## ⚠️ Importante

- Este script **solo afecta** territorios completados **este mes**
- **No modifica** territorios que ya tienen responsable asignado
- **Es seguro** ejecutar múltiples veces
- **Mantiene** el flujo de trabajo actual funcionando

## 🔍 Si Quieres Solo Simular

Para ver qué haría el script **sin hacer cambios reales**, usa este código más simple:

```javascript
// MODO SIMULACIÓN - Solo muestra qué se haría
async function simularCorreccion() {
  console.log('🔍 MODO SIMULACIÓN - No se harán cambios reales\n');
  
  const now = new Date();
  const inicioMes = new Date(now.getFullYear(), now.getMonth(), 1);
  
  const historySnapshot = await db.collection('territoryHistory')
    .where('status', '==', 'Terminado')
    .orderBy('completedDate', 'desc')
    .get();
  
  const completacionesEsteMes = new Map();
  
  historySnapshot.forEach((doc) => {
    const data = doc.data();
    const completedDate = data.completedDate?.toDate();
    
    if (completedDate && completedDate >= inicioMes) {
      completacionesEsteMes.set(data.territoryId, {
        territoryName: data.territoryName,
        completedBy: data.assignedTo,
        fecha: completedDate.toLocaleDateString()
      });
    }
  });
  
  console.log(`📊 Se encontraron ${completacionesEsteMes.size} territorios completados este mes:`);
  completacionesEsteMes.forEach((comp, territoryId) => {
    console.log(`   - ${comp.territoryName}: ${comp.completedBy} (${comp.fecha})`);
  });
}

// Ejecutar simulación
simularCorreccion();