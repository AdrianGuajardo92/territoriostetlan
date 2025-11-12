// NUEVA FUNCIÓN handleDeleteAddress CON BORRADO SUAVE
// Reemplazar la función handleDeleteAddress existente (línea ~331) con esta versión:

import { updateDoc, serverTimestamp } from 'firebase/firestore'; // AGREGAR ESTOS IMPORTS

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
};

// ========================================
// TAMBIÉN MODIFICAR LA SUSCRIPCIÓN DE ADDRESSES (línea ~1550)
// ========================================

// BUSCAR ESTE CÓDIGO:
/*
const addressesQuery = query(collection(db, 'addresses'));
const unsubAddresses = onSnapshot(addressesQuery, (snapshot) => {
  const addressesData = snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));
  setAddresses(addressesData);
});
*/

// Y REEMPLAZAR CON:
const addressesQuery = query(collection(db, 'addresses'));
const unsubAddresses = onSnapshot(addressesQuery, (snapshot) => {
  const addressesData = snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));

  // IMPORTANTE: Solo mostrar direcciones NO eliminadas
  const activeAddresses = addressesData.filter(addr => !addr.deleted);
  setAddresses(activeAddresses);

  // Opcional: Si quieres guardar todas las direcciones (incluyendo archivadas)
  // puedes crear un estado adicional:
  // setAllAddresses(addressesData);
});