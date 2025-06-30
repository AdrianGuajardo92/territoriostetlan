/**
 * CORRECCIÓN ESPECÍFICA - DICIEMBRE 2024
 * Corrige territorios completados este mes usando territoryHistory
 */

import { initializeApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  query, 
  where, 
  getDocs, 
  updateDoc, 
  doc,
  serverTimestamp,
  orderBy,
  limit
} from 'firebase/firestore';

// Configuración Firebase (usando credenciales de producción)
const firebaseConfig = {
  apiKey: "AIzaSyAyD4lW7uKHw-rcnOqr4YrBLp3oskklO8A",
  authDomain: "gestor-territorios-ls.firebaseapp.com",
  projectId: "gestor-territorios-ls",
  storageBucket: "gestor-territorios-ls.appspot.com",
  messagingSenderId: "930008027118",
  appId: "1:930008027118:web:236a36e1ded5e1555c08ff"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

/**
 * Función principal - Corrección específica para este mes
 */
async function corregirTerritoriosEsteMes() {
  console.log('🔧 CORRECCIÓN ESPECÍFICA - TERRITORIOS COMPLETADOS DICIEMBRE 2024');
  console.log('📅 Usando territoryHistory para encontrar responsables...\n');
  
  try {
    // 1. Obtener fecha de inicio del mes actual
    const now = new Date();
    const inicioMes = new Date(now.getFullYear(), now.getMonth(), 1);
    
    console.log(`📅 Buscando completaciones desde: ${inicioMes.toLocaleDateString()}`);
    
    // 2. Consultar territoryHistory para completaciones de este mes
    const historyRef = collection(db, 'territoryHistory');
    const historyQuery = query(
      historyRef,
      where('status', '==', 'Terminado'),
      orderBy('completedDate', 'desc')
    );
    
    console.log('🔍 Consultando territoryHistory...');
    const historySnapshot = await getDocs(historyQuery);
    
    if (historySnapshot.empty) {
      console.log('❌ No se encontraron registros en territoryHistory');
      return;
    }
    
    console.log(`📊 Registros encontrados en historial: ${historySnapshot.size}\n`);
    
    // 3. Filtrar completaciones de este mes y agrupar por territorio
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
      console.log('ℹ️  No hay territorios completados este mes según el historial');
      return;
    }
    
    // 4. Listar las completaciones encontradas
    console.log('\n📋 TERRITORIOS COMPLETADOS ESTE MES:');
    console.log('-'.repeat(60));
    completacionesEsteMes.forEach((comp, idx) => {
      console.log(`${idx + 1}. ${comp.territoryName} - ${comp.completedBy} (${comp.fechaTexto})`);
    });
    
    // 5. Verificar cuáles necesitan actualización
    console.log('\n🔍 Verificando cuáles necesitan corrección...');
    let territoriosCorregidos = 0;
    let territoriosYaCorrectos = 0;
    
    for (const [territoryId, completacion] of completacionesEsteMes) {
      try {
        // Consultar el territorio actual
        const territoriesRef = collection(db, 'territories');
        const territoryQuery = query(
          territoriesRef,
          where('__name__', '==', territoryId)
        );
        
        const territorySnapshot = await getDocs(territoryQuery);
        
        if (territorySnapshot.empty) {
          console.log(`⚠️  Territorio ${territoryId} no encontrado`);
          continue;
        }
        
        const territoryDoc = territorySnapshot.docs[0];
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
            dataFixedAt: serverTimestamp(),
            dataFixedSource: 'territoryHistory',
            dataFixedReason: 'Corrección diciembre 2024 - datos históricos'
          };
          
          await updateDoc(doc(db, 'territories', territoryId), updateData);
          territoriosCorregidos++;
          console.log(`   ✅ Corregido exitosamente`);
          
        } else {
          territoriosYaCorrectos++;
          console.log(`ℹ️  ${completacion.territoryName} ya tiene responsable: ${tieneResponsable}`);
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
    console.log('\n🔄 Recarga la aplicación para ver los cambios');
    
  } catch (error) {
    console.error('\n❌ ERROR CRÍTICO:', error);
  }
}

/**
 * Función de simulación - Solo muestra qué se haría
 */
async function simularCorreccion() {
  console.log('🔍 MODO SIMULACIÓN - No se harán cambios reales\n');
  
  try {
    const now = new Date();
    const inicioMes = new Date(now.getFullYear(), now.getMonth(), 1);
    
    const historyRef = collection(db, 'territoryHistory');
    const historyQuery = query(
      historyRef,
      where('status', '==', 'Terminado'),
      orderBy('completedDate', 'desc')
    );
    
    const historySnapshot = await getDocs(historyQuery);
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
    
  } catch (error) {
    console.error('❌ Error en simulación:', error);
  }
}

// Ejecutar según argumentos de línea de comandos
const args = process.argv.slice(2);
if (args.includes('--simular')) {
  simularCorreccion();
} else {
  corregirTerritoriosEsteMes();
} 