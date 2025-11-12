/**
 * Script para aplicar automáticamente el sistema de borrado suave
 * Ejecutar con: node applySoftDelete.js
 */

const fs = require('fs');
const path = require('path');

console.log('🚀 Aplicando sistema de borrado suave...\n');

// ========================================
// 1. MODIFICAR AppContext.jsx
// ========================================
console.log('📝 Modificando AppContext.jsx...');

const appContextPath = path.join(__dirname, 'src/context/AppContext.jsx');
let appContextContent = fs.readFileSync(appContextPath, 'utf8');

// Verificar si ya tiene los imports necesarios
if (!appContextContent.includes('updateDoc') || !appContextContent.includes('serverTimestamp')) {
  // Agregar imports si no existen
  const firebaseImportPattern = /from ['"]firebase\/firestore['"];/;
  const firebaseImportMatch = appContextContent.match(firebaseImportPattern);

  if (firebaseImportMatch) {
    // Encontrar la línea de import de firestore y agregar updateDoc y serverTimestamp
    const currentImport = firebaseImportMatch[0];
    const beforeClosing = currentImport.substring(0, currentImport.length - 2);

    // Verificar qué necesitamos agregar
    let toAdd = [];
    if (!appContextContent.includes('updateDoc')) toAdd.push('updateDoc');
    if (!appContextContent.includes('serverTimestamp')) toAdd.push('serverTimestamp');

    if (toAdd.length > 0) {
      const newImport = beforeClosing + ', ' + toAdd.join(', ') + "';";
      appContextContent = appContextContent.replace(currentImport, newImport);
      console.log('  ✅ Agregados imports: ' + toAdd.join(', '));
    }
  }
}

// Reemplazar función handleDeleteAddress
const oldDeleteFunction = `const handleDeleteAddress = async (addressId, options = {}) => {
    const { showSuccessToast = true } = options;

    try {
      await deleteDoc(doc(db, 'addresses', addressId));
      if (showSuccessToast) {
        showToast('Dirección eliminada correctamente', 'success');
      }
    } catch (error) {
      console.error('Error deleting address:', error);
      showToast('Error al eliminar dirección', 'error');
      throw error;
    }
  };`;

const newDeleteFunction = `const handleDeleteAddress = async (addressId, options = {}) => {
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
        // Preservar todos los datos originales
        ...(addressToDelete && {
          originalData: {
            address: addressToDelete.address,
            territoryId: addressToDelete.territoryId,
            name: addressToDelete.name || '',
            phone: addressToDelete.phone || '',
            notes: addressToDelete.notes || '',
            gender: addressToDelete.gender || '',
            isVisited: addressToDelete.isVisited || false,
            isRevisita: addressToDelete.isRevisita || false,
            isEstudio: addressToDelete.isEstudio || false,
            coords: addressToDelete.coords || null,
            createdBy: addressToDelete.createdBy || '',
            createdAt: addressToDelete.createdAt || null
          }
        })
      });

      if (showSuccessToast) {
        showToast('Dirección archivada correctamente', 'success');
      }
    } catch (error) {
      console.error('Error archiving address:', error);
      showToast('Error al archivar dirección', 'error');
      throw error;
    }
  };`;

if (appContextContent.includes(oldDeleteFunction)) {
  appContextContent = appContextContent.replace(oldDeleteFunction, newDeleteFunction);
  console.log('  ✅ Función handleDeleteAddress actualizada a borrado suave');
} else {
  console.log('  ⚠️  No se encontró la función handleDeleteAddress exacta, puede necesitar actualización manual');
}

// Modificar la suscripción de addresses
const oldSubscription = `const addressesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setAddresses(addressesData);`;

const newSubscription = `const addressesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      // IMPORTANTE: Solo mostrar direcciones NO eliminadas
      const activeAddresses = addressesData.filter(addr => !addr.deleted);
      setAddresses(activeAddresses);`;

if (appContextContent.includes(oldSubscription)) {
  appContextContent = appContextContent.replace(oldSubscription, newSubscription);
  console.log('  ✅ Suscripción de addresses actualizada para filtrar eliminadas');
} else {
  console.log('  ⚠️  No se encontró la suscripción exacta, puede necesitar actualización manual');
}

// Guardar AppContext modificado
fs.writeFileSync(appContextPath, appContextContent);
console.log('  ✅ AppContext.jsx guardado\n');

// ========================================
// 2. MODIFICAR AdminModal.jsx
// ========================================
console.log('📝 Modificando AdminModal.jsx...');

const adminModalPath = path.join(__dirname, 'src/components/modals/AdminModal.jsx');
let adminModalContent = fs.readFileSync(adminModalPath, 'utf8');

// Agregar imports
if (!adminModalContent.includes("import ArchivedAddresses from '../admin/ArchivedAddresses'")) {
  // Buscar el último import y agregar después
  const lastImportIndex = adminModalContent.lastIndexOf('import');
  const lineEnd = adminModalContent.indexOf('\n', lastImportIndex);

  const newImports = `
import ArchivedAddresses from '../admin/ArchivedAddresses';`;

  adminModalContent = adminModalContent.slice(0, lineEnd) + newImports + adminModalContent.slice(lineEnd);
  console.log('  ✅ Import de ArchivedAddresses agregado');
}

// Verificar si Archive está importado de lucide-react
if (!adminModalContent.includes('Archive')) {
  const lucideImport = adminModalContent.match(/from ['"]lucide-react['"];/);
  if (lucideImport) {
    const importLine = adminModalContent.substring(
      adminModalContent.lastIndexOf('import', adminModalContent.indexOf(lucideImport[0])),
      adminModalContent.indexOf(';', adminModalContent.indexOf(lucideImport[0])) + 1
    );

    if (!importLine.includes('Archive')) {
      const newImportLine = importLine.replace('} from', ', Archive } from');
      adminModalContent = adminModalContent.replace(importLine, newImportLine);
      console.log('  ✅ Import de Archive agregado');
    }
  }
}

// Agregar estado showArchivedAddresses
if (!adminModalContent.includes('showArchivedAddresses')) {
  // Buscar donde están los otros useState
  const useStatePattern = /const \[.*?, set.*?\] = useState\(/;
  const firstUseState = adminModalContent.match(useStatePattern);

  if (firstUseState) {
    const lineEnd = adminModalContent.indexOf('\n', adminModalContent.indexOf(firstUseState[0]));
    const newState = `
  const [showArchivedAddresses, setShowArchivedAddresses] = useState(false);`;

    adminModalContent = adminModalContent.slice(0, lineEnd) + newState + adminModalContent.slice(lineEnd);
    console.log('  ✅ Estado showArchivedAddresses agregado');
  }
}

// Agregar botón en el menú (esto es más complejo y puede requerir ajuste manual)
const menuButton = `
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
          </button>`;

// Buscar donde insertar el botón (después de "Respaldo de Datos" o similar)
if (!adminModalContent.includes('Direcciones Archivadas')) {
  const backupIndex = adminModalContent.indexOf('Respaldo de Datos');
  if (backupIndex > -1) {
    // Buscar el cierre del botón
    let buttonEnd = adminModalContent.indexOf('</button>', backupIndex);
    buttonEnd = adminModalContent.indexOf('\n', buttonEnd);

    adminModalContent = adminModalContent.slice(0, buttonEnd) + menuButton + adminModalContent.slice(buttonEnd);
    console.log('  ✅ Botón de Direcciones Archivadas agregado al menú');
  } else {
    console.log('  ⚠️  No se pudo agregar el botón automáticamente, agregar manualmente');
  }
}

// Agregar renderizado del modal
const modalRender = `
      {/* Modal de Direcciones Archivadas */}
      {showArchivedAddresses && (
        <ArchivedAddresses onClose={() => setShowArchivedAddresses(false)} />
      )}`;

if (!adminModalContent.includes('showArchivedAddresses && (')) {
  // Buscar el último cierre de div antes del export
  const lastDivIndex = adminModalContent.lastIndexOf('</div>');
  adminModalContent = adminModalContent.slice(0, lastDivIndex) + modalRender + '\n    ' + adminModalContent.slice(lastDivIndex);
  console.log('  ✅ Renderizado del modal ArchivedAddresses agregado');
}

// Guardar AdminModal modificado
fs.writeFileSync(adminModalPath, adminModalContent);
console.log('  ✅ AdminModal.jsx guardado\n');

console.log('✨ ¡Sistema de borrado suave aplicado exitosamente!');
console.log('\n📌 Próximos pasos:');
console.log('  1. Revisar los cambios en los archivos');
console.log('  2. Reiniciar el servidor de desarrollo');
console.log('  3. Probar eliminando una dirección');
console.log('  4. Verificar en Centro de Administración → Direcciones Archivadas');

console.log('\n⚠️  Si algo no funciona correctamente:');
console.log('  - Revisa los archivos AppContextSoftDelete.jsx y AdminModalSoftDelete.jsx');
console.log('  - Contienen el código exacto que debe estar en cada archivo');