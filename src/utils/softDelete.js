// Utilidades para manejo de borrado suave (soft delete)
import { updateDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db } from '../config/firebase';

/**
 * Archivar una dirección en lugar de eliminarla permanentemente
 * @param {string} addressId - ID de la dirección a archivar
 * @param {Object} options - Opciones adicionales
 * @returns {Promise<void>}
 */
export const archiveAddress = async (addressId, options = {}) => {
  const {
    currentUser,
    deletedBy = null,
    deletedReason = 'Eliminado por administrador',
    addressData = null
  } = options;

  try {
    const updateData = {
      deleted: true,
      deletedAt: serverTimestamp(),
      deletedBy: deletedBy || currentUser?.id || 'unknown',
      deletedByName: currentUser?.name || 'Sistema',
      deletedReason: deletedReason
    };

    // Si tenemos los datos originales, preservarlos
    if (addressData) {
      updateData.originalData = {
        ...addressData,
        // Asegurar que no perdemos información importante
        address: addressData.address,
        territoryId: addressData.territoryId,
        name: addressData.name || '',
        phone: addressData.phone || '',
        notes: addressData.notes || '',
        gender: addressData.gender || '',
        isVisited: addressData.isVisited || false,
        isRevisita: addressData.isRevisita || false,
        isEstudio: addressData.isEstudio || false,
        coords: addressData.coords || null,
        createdBy: addressData.createdBy || '',
        createdAt: addressData.createdAt || null
      };
    }

    await updateDoc(doc(db, 'addresses', addressId), updateData);
    return { success: true };
  } catch (error) {
    console.error('Error archiving address:', error);
    throw error;
  }
};

/**
 * Restaurar una dirección archivada
 * @param {string} addressId - ID de la dirección a restaurar
 * @returns {Promise<void>}
 */
export const restoreAddress = async (addressId, restoredBy = null) => {
  try {
    await updateDoc(doc(db, 'addresses', addressId), {
      deleted: false,
      deletedAt: null,
      deletedBy: null,
      deletedByName: null,
      deletedReason: null,
      restoredAt: serverTimestamp(),
      restoredBy: restoredBy || 'admin',
      originalData: null
    });
    return { success: true };
  } catch (error) {
    console.error('Error restoring address:', error);
    throw error;
  }
};

/**
 * Filtrar direcciones para excluir las eliminadas
 * @param {Array} addresses - Lista de direcciones
 * @returns {Array} Direcciones activas (no eliminadas)
 */
export const filterActiveAddresses = (addresses) => {
  return addresses.filter(addr => !addr.deleted);
};

/**
 * Obtener solo direcciones archivadas
 * @param {Array} addresses - Lista de direcciones
 * @returns {Array} Direcciones archivadas
 */
export const getArchivedAddresses = (addresses) => {
  return addresses.filter(addr => addr.deleted === true)
    .sort((a, b) => {
      // Ordenar por fecha de eliminación (más recientes primero)
      const dateA = a.deletedAt?.toDate?.() || new Date(0);
      const dateB = b.deletedAt?.toDate?.() || new Date(0);
      return dateB - dateA;
    });
};

/**
 * Formatear información de dirección archivada para mostrar
 * @param {Object} address - Dirección archivada
 * @returns {Object} Datos formateados
 */
export const formatArchivedAddress = (address) => {
  const originalData = address.originalData || address;

  return {
    id: address.id,
    address: originalData.address || address.address || 'Sin dirección',
    territoryId: originalData.territoryId || address.territoryId || 'Sin territorio',
    name: originalData.name || address.name || '',
    phone: originalData.phone || address.phone || '',
    notes: originalData.notes || address.notes || '',
    gender: originalData.gender || address.gender || '',
    deletedAt: address.deletedAt,
    deletedBy: address.deletedBy,
    deletedByName: address.deletedByName || 'Desconocido',
    deletedReason: address.deletedReason || 'Sin razón especificada',
    canRestore: true
  };
};