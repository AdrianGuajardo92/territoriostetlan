/**
 * Parche para implementar sistema de borrado suave (soft delete)
 * Este archivo contiene todos los cambios necesarios para el sistema
 */

// ========================================
// 1. MODIFICACIÓN EN AppContext.jsx
// ========================================

// Buscar la función handleDeleteAddress (alrededor de línea 331) y reemplazar con:

export const handleDeleteAddressPatch = `
  // Función modificada para borrado suave (soft delete)
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
        // Preservar todos los datos originales
        originalData: addressToDelete ? {
          ...addressToDelete,
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
        } : {}
      });

      if (showSuccessToast) {
        showToast('Dirección archivada correctamente', 'success');
      }
    } catch (error) {
      console.error('Error archiving address:', error);
      showToast('Error al archivar dirección', 'error');
      throw error;
    }
  };
`;

// ========================================
// 2. AGREGAR FILTROS EN AppContext.jsx
// ========================================

// En AppContext, después de las consultas de Firebase (alrededor de línea 1550)
// Modificar la suscripción de addresses para filtrar las eliminadas:

export const addressesSubscriptionPatch = `
  // DIRECCIONES - Actualización en tiempo real (filtrar eliminadas)
  const addressesQuery = query(collection(db, 'addresses'));
  const unsubAddresses = onSnapshot(addressesQuery, (snapshot) => {
    const addressesData = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    // IMPORTANTE: Guardar TODAS las direcciones (incluyendo archivadas) en un estado separado
    setAllAddresses(addressesData);

    // Solo mostrar direcciones NO eliminadas en el estado principal
    const activeAddresses = addressesData.filter(addr => !addr.deleted);
    setAddresses(activeAddresses);
  });
`;

// También agregar nuevo estado en AppContext (alrededor de línea 50):
export const newStatePatch = `
  // Agregar estos estados nuevos
  const [allAddresses, setAllAddresses] = useState([]); // Todas las direcciones incluyendo archivadas
`;

// Y exponerlos en el value del Provider (alrededor de línea 1700):
export const contextValuePatch = `
  // Agregar al value del Provider
  allAddresses, // Nuevo: incluye direcciones archivadas
`;

// ========================================
// 3. MODIFICACIÓN EN AdminModal.jsx
// ========================================

// Importar el componente ArchivedAddresses al inicio del archivo
export const adminModalImportPatch = `
import ArchivedAddresses from '../admin/ArchivedAddresses';
`;

// Agregar nuevo estado para el modal de direcciones archivadas (alrededor de línea 30)
export const adminModalStatePatch = `
  const [showArchivedAddresses, setShowArchivedAddresses] = useState(false);
`;

// Agregar botón en el menú de AdminModal (buscar "Respaldo de Datos" y agregar después)
export const adminModalMenuPatch = `
  {/* Nueva opción: Direcciones Archivadas */}
  <button
    onClick={() => setShowArchivedAddresses(true)}
    className="w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-0"
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
`;

// Agregar el renderizado del modal al final del componente (antes del último </div>)
export const adminModalRenderPatch = `
  {/* Modal de Direcciones Archivadas */}
  {showArchivedAddresses && (
    <ArchivedAddresses onClose={() => setShowArchivedAddresses(false)} />
  )}
`;

// ========================================
// 4. MODIFICACIÓN EN PROPUESTAS
// ========================================

// Para manejar propuestas de eliminación, modificar handleApproveProposal en AdminModal:
export const approveProposalPatch = `
  // En la función handleApproveProposal, agregar caso para tipo 'delete'
  if (proposal.type === 'delete') {
    // Usar borrado suave con información de la propuesta
    await handleDeleteAddress(proposal.addressId, {
      showSuccessToast: true,
      deletedBy: proposal.proposedBy,
      deletedReason: proposal.reason || 'Eliminación aprobada desde propuesta',
      fromProposal: true
    });
  }
`;

// ========================================
// 5. MODIFICAR AddressFormModal.jsx
// ========================================

// Para que los publicadores puedan proponer eliminación:
export const addressFormModalPatch = `
  // En AddressFormModal, modificar el botón de eliminar para publicadores
  {currentUser?.role !== 'admin' && (
    <button
      onClick={() => handleProposeDeleteAddress(address.id)}
      className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
    >
      Proponer Eliminación
    </button>
  )}

  // Agregar función para proponer eliminación
  const handleProposeDeleteAddress = async (addressId) => {
    const reason = prompt('¿Por qué deseas eliminar esta dirección?');
    if (!reason) return;

    try {
      await addDoc(collection(db, 'proposals'), {
        type: 'delete',
        addressId,
        territoryId: address.territoryId,
        reason,
        status: 'pending',
        proposedBy: currentUser?.id,
        proposedByName: currentUser?.name,
        createdAt: serverTimestamp(),
        addressInfo: {
          address: address.address,
          name: address.name || '',
          phone: address.phone || ''
        }
      });

      showToast('Propuesta de eliminación enviada', 'success');
      onClose();
    } catch (error) {
      console.error('Error al proponer eliminación:', error);
      showToast('Error al enviar propuesta', 'error');
    }
  };
`;

// ========================================
// 6. IMPORTS NECESARIOS
// ========================================

export const requiredImports = `
// Asegurarse de importar en AppContext.jsx:
import { updateDoc, serverTimestamp } from 'firebase/firestore';

// Asegurarse de importar en AdminModal.jsx:
import { Archive, ChevronRight } from 'lucide-react';
import ArchivedAddresses from '../admin/ArchivedAddresses';
`;

// ========================================
// INSTRUCCIONES DE IMPLEMENTACIÓN
// ========================================

export const instructions = `
PASOS PARA IMPLEMENTAR EL SISTEMA DE BORRADO SUAVE:

1. CREAR ARCHIVOS NUEVOS:
   ✅ src/utils/softDelete.js (ya creado)
   ✅ src/components/admin/ArchivedAddresses.jsx (ya creado)

2. MODIFICAR AppContext.jsx:
   - Reemplazar función handleDeleteAddress con la versión de borrado suave
   - Agregar estado allAddresses
   - Modificar suscripción de addresses para filtrar eliminadas
   - Exponer allAddresses en el Provider

3. MODIFICAR AdminModal.jsx:
   - Importar ArchivedAddresses
   - Agregar estado showArchivedAddresses
   - Agregar botón en el menú
   - Renderizar modal de ArchivedAddresses

4. MODIFICAR AddressFormModal.jsx (opcional):
   - Agregar función para proponer eliminación
   - Modificar botón de eliminar para publicadores

5. PROBAR:
   - Eliminar una dirección como admin → debe archivarse
   - Ver direcciones archivadas en Centro de Administración
   - Restaurar una dirección archivada
   - Eliminar permanentemente una dirección archivada

NOTAS IMPORTANTES:
- Las direcciones existentes sin campo 'deleted' se consideran activas
- El sistema es retrocompatible
- Se preservan TODOS los datos originales al archivar
- Solo administradores pueden ver direcciones archivadas
- Se puede restaurar cualquier dirección archivada
`;