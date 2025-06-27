import React, { useState, useEffect } from 'react';
import Modal from '../common/Modal';
import Icon from '../common/Icon';
import { useApp } from '../../context/AppContext';

const AddressFormModal = ({ 
  isOpen, 
  onClose, 
  address, 
  territoryId, 
  onSave, 
  onDelete,
  isProcessing 
}) => {
  const { currentUser } = useApp();
  const isEditing = !!address;
  const isPublisher = currentUser?.role !== 'admin';

  const [formData, setFormData] = useState({
    address: '',
    referencia: '',
    phone: '',
    name: '',
    notes: '',
    mapUrl: '',
    isVisited: false,
    isRevisita: false,
    revisitaBy: '',
    isEstudio: false,
    estudioBy: '',
    isPhoneOnly: false
  });

  const [changeReason, setChangeReason] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    if (address) {
      setFormData({
        address: address.address || '',
        referencia: address.referencia || '',
        phone: address.phone || '',
        name: address.name || '',
        notes: address.notes || '',
        mapUrl: address.mapUrl || '',
        isVisited: address.isVisited || false,
        isRevisita: address.isRevisita || false,
        revisitaBy: address.revisitaBy || '',
        isEstudio: address.isEstudio || false,
        estudioBy: address.estudioBy || '',
        isPhoneOnly: address.isPhoneOnly || false
      });
    } else {
      // Reset form for new address
      setFormData({
        address: '',
        referencia: '',
        phone: '',
        name: '',
        notes: '',
        mapUrl: '',
        isVisited: false,
        isRevisita: false,
        revisitaBy: '',
        isEstudio: false,
        estudioBy: '',
        isPhoneOnly: false
      });
    }
    setChangeReason('');
  }, [address, isOpen]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.address.trim()) {
      return;
    }

    onSave(formData, changeReason);
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleDelete = () => {
    if (onDelete) {
      onDelete(address.id);
      setShowDeleteConfirm(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'Editar Dirección' : 'Nueva Dirección'}
      size="lg"
      closeOnBackdrop={!isProcessing}
      closeOnEscape={!isProcessing}
    >
      <form onSubmit={handleSubmit} className="p-6">
        {/* Dirección principal */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Dirección *
          </label>
          <input
            type="text"
            value={formData.address}
            onChange={(e) => handleInputChange('address', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            placeholder="Ej: Calle Principal #123"
            required
            disabled={isProcessing}
          />
        </div>

        {/* Referencia */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Referencia
          </label>
          <input
            type="text"
            value={formData.referencia}
            onChange={(e) => handleInputChange('referencia', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            placeholder="Ej: Casa azul con portón negro"
            disabled={isProcessing}
          />
        </div>

        {/* Teléfono y Nombre */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Teléfono
            </label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => handleInputChange('phone', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              placeholder="Ej: 555-1234"
              disabled={isProcessing}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nombre
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              placeholder="Nombre del contacto"
              disabled={isProcessing}
            />
          </div>
        </div>

        {/* Notas */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Notas
          </label>
          <textarea
            value={formData.notes}
            onChange={(e) => handleInputChange('notes', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            rows="3"
            placeholder="Información adicional..."
            disabled={isProcessing}
          />
        </div>

        {/* URL del mapa */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Enlace de Google Maps
          </label>
          <input
            type="url"
            value={formData.mapUrl}
            onChange={(e) => handleInputChange('mapUrl', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            placeholder="https://maps.google.com/..."
            disabled={isProcessing}
          />
        </div>

        {/* Checkboxes de estado */}
        <div className="space-y-3 mb-4">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={formData.isVisited}
              onChange={(e) => handleInputChange('isVisited', e.target.checked)}
              className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
              disabled={isProcessing}
            />
            <span className="ml-2 text-sm text-gray-700">Marcar como visitada</span>
          </label>

          <div className="flex items-start">
            <input
              type="checkbox"
              checked={formData.isRevisita}
              onChange={(e) => handleInputChange('isRevisita', e.target.checked)}
              className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500 mt-1"
              disabled={isProcessing}
            />
            <div className="ml-2 flex-1">
              <span className="text-sm text-gray-700">Es revisita</span>
              {formData.isRevisita && (
                <input
                  type="text"
                  value={formData.revisitaBy}
                  onChange={(e) => handleInputChange('revisitaBy', e.target.value)}
                  className="mt-2 w-full px-3 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="¿Quién la visita?"
                  disabled={isProcessing}
                />
              )}
            </div>
          </div>

          <div className="flex items-start">
            <input
              type="checkbox"
              checked={formData.isEstudio}
              onChange={(e) => handleInputChange('isEstudio', e.target.checked)}
              className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500 mt-1"
              disabled={isProcessing}
            />
            <div className="ml-2 flex-1">
              <span className="text-sm text-gray-700">Tiene estudio</span>
              {formData.isEstudio && (
                <input
                  type="text"
                  value={formData.estudioBy}
                  onChange={(e) => handleInputChange('estudioBy', e.target.value)}
                  className="mt-2 w-full px-3 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="¿Quién dirige el estudio?"
                  disabled={isProcessing}
                />
              )}
            </div>
          </div>

          <label className="flex items-center">
            <input
              type="checkbox"
              checked={formData.isPhoneOnly}
              onChange={(e) => handleInputChange('isPhoneOnly', e.target.checked)}
              className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
              disabled={isProcessing}
            />
            <span className="ml-2 text-sm text-gray-700">Solo por teléfono</span>
          </label>
        </div>

        {/* Razón del cambio (para publicadores) */}
        {isPublisher && isEditing && (
          <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <label className="block text-sm font-medium text-yellow-800 mb-2">
              <Icon name="info" size={16} className="inline mr-1" />
              Razón del cambio (requerido para revisión)
            </label>
            <textarea
              value={changeReason}
              onChange={(e) => setChangeReason(e.target.value)}
              className="w-full px-3 py-2 border border-yellow-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
              rows="2"
              placeholder="Explica brevemente por qué necesitas hacer este cambio..."
              required
              disabled={isProcessing}
            />
          </div>
        )}

        {/* Acciones */}
        <div className="flex justify-between items-center pt-4 border-t border-gray-200">
          <div>
            {onDelete && isEditing && (
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors font-medium"
                disabled={isProcessing}
              >
                <Icon name="trash" size={16} className="inline mr-2" />
                Eliminar
              </button>
            )}
          </div>
          
          <div className="flex space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
              disabled={isProcessing}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:shadow-lg transform hover:scale-[1.02] transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isProcessing || !formData.address.trim() || (isPublisher && isEditing && !changeReason.trim())}
            >
              {isProcessing ? (
                <span className="flex items-center">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                  Guardando...
                </span>
              ) : (
                isEditing ? 'Guardar cambios' : 'Agregar dirección'
              )}
            </button>
          </div>
        </div>
      </form>

      {/* Confirmación de eliminación */}
      {showDeleteConfirm && (
        <div className="absolute inset-0 bg-white rounded-2xl flex items-center justify-center p-6">
          <div className="text-center">
            <Icon name="alertCircle" size={48} className="mx-auto mb-4 text-red-500" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              ¿Eliminar esta dirección?
            </h3>
            <p className="text-gray-600 mb-6">
              Esta acción no se puede deshacer
            </p>
            <div className="flex justify-center space-x-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
              >
                Cancelar
              </button>
              <button
                onClick={handleDelete}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
              >
                Sí, eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
};

export default AddressFormModal; 