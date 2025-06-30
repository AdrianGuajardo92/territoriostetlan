/**
 * Script de corrección de datos históricos
 * Propósito: Reparar territorios completados sin el campo "completedBy"
 * Fecha: Diciembre 2024
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
  serverTimestamp 
} from 'firebase/firestore';

// Configuración de Firebase (usar las mismas credenciales de la app)
const firebaseConfig = {
  apiKey: "AIzaSyAyD4lW7uKHw-rcnOqr4YrBLp3oskklO8A",
  authDomain: "gestor-territorios-ls.firebaseapp.com",
  projectId: "gestor-territorios-ls",
  storageBucket: "gestor-territorios-ls.appspot.com",
  messagingSenderId: "930008027118",
  appId: "1:930008027118:web:236a36e1ded5e1555c08ff"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

/**
 * Función principal para corregir los datos usando territoryHistory
 */
async function corregirDatosHistoricos() {
  console.log('🔧 Iniciando corrección de datos históricos usando territoryHistory...\n');
  
  try {
    // 1. Buscar territorios completados sin responsable
    const territoriesRef = collection(db, 'territories');
    const q = query(
      territoriesRef, 
      where('status', 'in', ['Completado', 'Terminado'])
    );
    
    const snapshot = await getDocs(q);
    console.log(`📊 Total de territorios completados encontrados: ${snapshot.size}`);
    
    let territoriosAfectados = 0;
    let territoriosCorregidos = 0;
    let territoriosSinHistorial = 0;
    const errores = [];
    
    // 2. Procesar cada territorio
    for (const docSnap of snapshot.docs) {
      const territorio = docSnap.data();
      const territoryId = docSnap.id;
      
      // Verificar si necesita corrección
      const necesitaCorreccion = !territorio.completedBy && 
                                 !territorio.terminadoPor &&
                                 !territorio.completedById;
      
      if (necesitaCorreccion) {
        territoriosAfectados++;
        console.log(`\n🔍 Territorio ${territorio.name} (${territoryId}):`);
        console.log(`   Estado: ${territorio.status}`);
        
        try {
          // 3. Consultar territoryHistory para este territorio
          const historyRef = collection(db, 'territoryHistory');
          const historyQuery = query(
            historyRef,
            where('territoryId', '==', territoryId)
          );
          
          const historySnapshot = await getDocs(historyQuery);
          
          if (historySnapshot.empty) {
            territoriosSinHistorial++;
            console.log(`   ⚠️  NO HAY HISTORIAL DISPONIBLE`);
            continue;
          }
          
          // 4. Encontrar el último registro de asignación
          let ultimaAsignacion = null;
          let fechaMasReciente = null;
          
          historySnapshot.forEach((historyDoc) => {
            const historyData = historyDoc.data();
            
            // Buscar registros de asignación (no de disponibilidad)
            if (historyData.assignedTo || historyData.userId) {
              const fechaHistorial = historyData.timestamp?.toDate() || 
                                    historyData.date?.toDate() || 
                                    historyData.createdAt?.toDate();
              
              if (!fechaMasReciente || (fechaHistorial && fechaHistorial > fechaMasReciente)) {
                fechaMasReciente = fechaHistorial;
                ultimaAsignacion = historyData;
              }
            }
          });
          
          if (!ultimaAsignacion) {
            territoriosSinHistorial++;
            console.log(`   ⚠️  NO SE ENCONTRÓ ASIGNACIÓN EN EL HISTORIAL`);
            continue;
          }
          
          // 5. Obtener información del usuario desde el historial
          const userIdFromHistory = ultimaAsignacion.userId || ultimaAsignacion.assignedToId;
          const userNameFromHistory = ultimaAsignacion.assignedTo || ultimaAsignacion.userName;
          
          console.log(`   📅 Última asignación: ${userNameFromHistory} (${fechaMasReciente?.toLocaleDateString()})`);
          
          // 6. Buscar información completa del usuario
          let userInfo = { id: userIdFromHistory, name: userNameFromHistory };
          
          if (userIdFromHistory) {
            try {
              const userDoc = await getDocs(query(
                collection(db, 'users'),
                where('__name__', '==', userIdFromHistory)
              ));
              
              if (!userDoc.empty) {
                const userData = userDoc.docs[0].data();
                userInfo.name = userData.name || userInfo.name;
              }
            } catch (userError) {
              console.log(`   ⚠️  Error al obtener datos del usuario: ${userError.message}`);
            }
          }
          
          // 7. Actualizar el territorio con la información correcta
          const updateData = {};
          
          if (userInfo.name) {
            updateData.completedBy = userInfo.name;
            updateData.terminadoPor = userInfo.name; // Compatibilidad
          }
          
          if (userInfo.id) {
            updateData.completedById = userInfo.id;
          }
          
          // Si no hay fecha de completado, usar la fecha actual
          if (!territorio.completedDate && !territorio.terminadoDate) {
            updateData.completedDate = serverTimestamp();
            updateData.terminadoDate = serverTimestamp();
          }
          
          // Agregar metadata de la corrección
          updateData.dataFixedAt = serverTimestamp();
          updateData.dataFixedReason = 'Corrección datos históricos usando territoryHistory - Bug diciembre 2024';
          updateData.dataSourceHistory = true; // Indica que se usó historial
          
          // Actualizar el documento
          await updateDoc(doc(db, 'territories', territoryId), updateData);
          
          territoriosCorregidos++;
          console.log(`   ✅ CORREGIDO - Completado por: ${userInfo.name} (ID: ${userInfo.id})`);
          
        } catch (error) {
          errores.push({ territoryId, error: error.message });
          console.error(`   ❌ ERROR al procesar: ${error.message}`);
        }
      }
    }
    
    // 3. Resumen final
    console.log('\n' + '='.repeat(50));
    console.log('📋 RESUMEN DE LA CORRECCIÓN:');
    console.log('='.repeat(50));
    console.log(`✅ Territorios procesados: ${snapshot.size}`);
    console.log(`🔧 Territorios que necesitaban corrección: ${territoriosAfectados}`);
    console.log(`✅ Territorios corregidos exitosamente: ${territoriosCorregidos}`);
    console.log(`⚠️  Territorios sin historial disponible: ${territoriosSinHistorial}`);
    console.log(`❌ Errores encontrados: ${errores.length}`);
    
    if (errores.length > 0) {
      console.log('\n❌ Detalle de errores:');
      errores.forEach(({ territoryId, error }) => {
        console.log(`   - Territorio ${territoryId}: ${error}`);
      });
    }
    
    if (territoriosSinHistorial > 0) {
      console.log('\n⚠️  NOTA: Los territorios sin historial disponible deberán ser corregidos manualmente.');
      console.log('    Esto puede ocurrir si el territorio fue completado antes de implementar territoryHistory.');
    }
    
  } catch (error) {
    console.error('\n❌ ERROR CRÍTICO:', error);
  }
}

/**
 * Función para hacer un simulacro usando territoryHistory sin cambios reales
 */
async function simularCorreccion() {
  console.log('🔍 MODO SIMULACIÓN usando territoryHistory - No se harán cambios reales\n');
  
  try {
    const territoriesRef = collection(db, 'territories');
    const q = query(
      territoriesRef, 
      where('status', 'in', ['Completado', 'Terminado'])
    );
    
    const snapshot = await getDocs(q);
    console.log(`📊 Total de territorios completados: ${snapshot.size}\n`);
    
    let necesitanCorreccion = 0;
    let conHistorialDisponible = 0;
    let sinHistorialDisponible = 0;
    
    for (const docSnap of snapshot.docs) {
      const territorio = docSnap.data();
      const territoryId = docSnap.id;
      
      if (!territorio.completedBy && !territorio.terminadoPor && !territorio.completedById) {
        necesitanCorreccion++;
        console.log(`🔍 ${territorio.name} (${territoryId}):`);
        
        try {
          // Consultar historial para este territorio
          const historyRef = collection(db, 'territoryHistory');
          const historyQuery = query(
            historyRef,
            where('territoryId', '==', territoryId)
          );
          
          const historySnapshot = await getDocs(historyQuery);
          
          if (historySnapshot.empty) {
            sinHistorialDisponible++;
            console.log(`   - ❌ Sin historial disponible`);
            console.log(`   - Se puede corregir: NO\n`);
            continue;
          }
          
          // Analizar el historial
          let ultimaAsignacion = null;
          let fechaMasReciente = null;
          let totalRegistros = 0;
          
          historySnapshot.forEach((historyDoc) => {
            const historyData = historyDoc.data();
            totalRegistros++;
            
            if (historyData.assignedTo || historyData.userId) {
              const fechaHistorial = historyData.timestamp?.toDate() || 
                                    historyData.date?.toDate() || 
                                    historyData.createdAt?.toDate();
              
              if (!fechaMasReciente || (fechaHistorial && fechaHistorial > fechaMasReciente)) {
                fechaMasReciente = fechaHistorial;
                ultimaAsignacion = historyData;
              }
            }
          });
          
          if (ultimaAsignacion) {
            conHistorialDisponible++;
            const userName = ultimaAsignacion.assignedTo || ultimaAsignacion.userName || 'Sin nombre';
            const userId = ultimaAsignacion.userId || ultimaAsignacion.assignedToId || 'Sin ID';
            
            console.log(`   - ✅ Historial disponible (${totalRegistros} registros)`);
            console.log(`   - Última asignación: ${userName}`);
            console.log(`   - ID del usuario: ${userId}`);
            console.log(`   - Fecha: ${fechaMasReciente?.toLocaleDateString() || 'Sin fecha'}`);
            console.log(`   - Se puede corregir: SÍ\n`);
          } else {
            sinHistorialDisponible++;
            console.log(`   - ⚠️  Historial existe pero sin asignaciones válidas`);
            console.log(`   - Se puede corregir: NO\n`);
          }
          
        } catch (error) {
          sinHistorialDisponible++;
          console.log(`   - ❌ Error al consultar historial: ${error.message}`);
          console.log(`   - Se puede corregir: NO\n`);
        }
      }
    }
    
    console.log('='.repeat(50));
    console.log(`📊 RESUMEN DE SIMULACIÓN:`);
    console.log(`📊 Territorios que necesitan corrección: ${necesitanCorreccion}`);
    console.log(`✅ Con historial disponible (se pueden corregir): ${conHistorialDisponible}`);
    console.log(`❌ Sin historial disponible (corrección manual): ${sinHistorialDisponible}`);
    
  } catch (error) {
    console.error('❌ ERROR:', error);
  }
}

// Ejecutar el script
console.log('SCRIPT DE CORRECCIÓN DE DATOS HISTÓRICOS');
console.log('========================================\n');
console.log('Opciones:');
console.log('1. node corregir-datos-historicos.js simular  - Para ver qué se corregiría');
console.log('2. node corregir-datos-historicos.js ejecutar - Para aplicar las correcciones\n');

const modo = process.argv[2];

if (modo === 'simular') {
  simularCorreccion();
} else if (modo === 'ejecutar') {
  console.log('⚠️  ADVERTENCIA: Esto modificará los datos en Firebase.');
  console.log('¿Estás seguro? Presiona Ctrl+C para cancelar o espera 5 segundos...\n');
  
  setTimeout(() => {
    corregirDatosHistoricos();
  }, 5000);
} else {
  console.log('❌ Por favor especifica un modo: "simular" o "ejecutar"');
} 