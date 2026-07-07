import React, { useState, useEffect, useRef } from 'react';
import Modal from '../common/Modal';
import Icon from '../common/Icon';
import { ArchiveConfirmDialog, ArchiveProposalDialog } from '../addresses/AddressArchiveDialogs';
import { useApp } from '../../context/AppContext';
import { useIsDesktop } from '../../hooks/useMediaQuery';

const AddressFormModal = ({ 
  isOpen, 
  onClose, 
  address = null, 
  territoryId, 
  onSave, 
  onDelete = null,
  isProcessing = false,
  modalId = 'address-form-modal' // ID único para el historial
}) => {
  const { currentUser, publishers } = useApp();
  const isEditing = !!address;
  const isPublisher = currentUser?.role !== 'admin';
  const isAdmin = currentUser?.role === 'admin';

  const [formData, setFormData] = useState({
    address: '',
    phone: '',
    name: '',
    notes: '',
    gender: 'Desconocido',
    mapUrl: '',
    latitude: null,
    longitude: null,
    coords: null,
    isVisited: false,
    isRevisita: false,
    revisitaBy: '',
    isEstudio: false,
    estudioBy: '',
    isPhoneOnly: false
  });

  const [changeReason, setChangeReason] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showDeleteRequest, setShowDeleteRequest] = useState(false);
  const [isSubmitLocked, setIsSubmitLocked] = useState(false);
  const submitInFlightRef = useRef(false);
  const isFormBusy = isProcessing || isSubmitLocked;
  const isDesktop = useIsDesktop();

  // Estado para la sección colapsable de ubicación
  const [isLocationExpanded, setIsLocationExpanded] = useState(false);

  useEffect(() => {
    // Solo ejecutar cuando el modal se abre por primera vez o cambia la dirección
    if (!isOpen) return;
    
    if (address) {
      setFormData({
        address: address.address || '',
        phone: address.phone || '',
        name: address.name || '',
        notes: address.notes || '',
        gender: address.gender || 'Desconocido',
        mapUrl: address.mapUrl || '',
        latitude: address.latitude || null,
        longitude: address.longitude || null,
        coords: address.coords || null,
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
        phone: '',
        name: '',
        notes: '',
        gender: 'Desconocido',
        mapUrl: '',
        latitude: null,
        longitude: null,
        coords: null,
        isVisited: false,
        isRevisita: false,
        revisitaBy: '',
        isEstudio: false,
        estudioBy: '',
        isPhoneOnly: false
      });
    }
    setChangeReason('');
    setShowDeleteConfirm(false);
    setShowDeleteRequest(false);
    submitInFlightRef.current = false;
    setIsSubmitLocked(false);
    // Siempre contraer la ubicación al abrir/cambiar
    setIsLocationExpanded(false);
  }, [address?.id, isOpen]);

  useEffect(() => {
    if (!isOpen || !isDesktop) return;

    const handleKeyDown = (e) => {
      if (e.key !== 'Enter' || !(e.metaKey || e.ctrlKey)) return;
      if (isFormBusy || showDeleteConfirm || showDeleteRequest) return;

      e.preventDefault();
      document.getElementById('address-form')?.requestSubmit();
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isDesktop, isFormBusy, showDeleteConfirm, showDeleteRequest]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitInFlightRef.current || isFormBusy || !formData.address.trim()) {
      return;
    }

    submitInFlightRef.current = true;
    setIsSubmitLocked(true);

    try {
      await onSave({ ...formData, address: formData.address.trim() }, changeReason);
    } finally {
      submitInFlightRef.current = false;
      setIsSubmitLocked(false);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => {
      const newData = { ...prev, [field]: value };
      
      // Lógica exclusiva: Solo se puede marcar Revisita O Estudio, no ambos
      if (field === 'isRevisita' && value) {
        // Si se marca Revisita, desmarcar Estudio
        newData.isEstudio = false;
        newData.estudioBy = '';
        newData.revisitaBy = currentUser?.name || '';

      }
      if (field === 'isEstudio' && value) {
        // Si se marca Estudio, desmarcar Revisita
        newData.isRevisita = false;
        newData.revisitaBy = '';
        newData.estudioBy = currentUser?.name || '';

      }
      
      // Limpiar campos cuando se desmarca
      if (field === 'isRevisita' && !value) {
        newData.revisitaBy = '';
      }
      if (field === 'isEstudio' && !value) {
        newData.estudioBy = '';
      }
      
      return newData;
    });
  };

  const handleArchiveConfirm = (reason) => {
    if (onDelete) {
      onDelete(address.id, reason);
      setShowDeleteConfirm(false);
    }
  };

  const handleArchiveProposal = (reason) => {
    if (onDelete) {
      onDelete(address.id, reason);
      setShowDeleteRequest(false);
    }
  };

  const handleClose = () => {
    if (!isFormBusy) {
      onClose();
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title=""
      size="full"
      showCloseButton={false}
      closeOnBackdrop={!isFormBusy}
      closeOnEscape={!isFormBusy}
      modalId={modalId}
      animation="slide-left"
    >
      <div className="relative flex flex-col h-full">
        {/* Header personalizado */}
        <div className="px-4 py-3 flex-shrink-0" style={{ backgroundColor: '#2C3E50' }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 rounded-lg shadow-md" style={{ backgroundColor: '#34495e' }}>
                <i className="fas fa-home text-white text-sm"></i>
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">
                  {isEditing ? 'Editar Dirección' : 'Nueva Dirección'}
                </h2>
                <p className="text-white/70 text-sm">
                  {isEditing ? 'Modificar información existente' : 'Agregar nueva dirección al territorio'}
                </p>
              </div>
            </div>
            
            {/* Botón cerrar personalizado */}
            <button
              onClick={handleClose}
              disabled={isFormBusy}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="Cerrar"
            >
              <i className="fas fa-times text-white text-sm"></i>
            </button>
          </div>
        </div>

        {/* Contenido con scroll */}
        <div className="flex-1 min-h-0 overflow-y-auto bg-gray-50">
          <form id="address-form" onSubmit={handleSubmit} className="px-4 py-4">
            <div className="space-y-4 max-w-2xl mx-auto">
              
              {/* 1. Información básica */}
              <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
                <div className="flex items-center space-x-2 mb-4">
                  <div className="p-1.5 rounded-lg" style={{ backgroundColor: '#2C3E50' }}>
                    <i className="fas fa-info-circle text-white text-xs"></i>
                  </div>
                  <h3 className="font-semibold" style={{ color: '#2C3E50' }}>Información Básica</h3>
                </div>
                
                {/* Dirección principal */}
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: '#2C3E50' }}>
                    Dirección *
                  </label>
                  <input
                    type="text"
                    value={formData.address}
                    onChange={(e) => handleInputChange('address', e.target.value)}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:border-transparent text-sm"
                    style={{ '--tw-ring-color': '#546E7A' }}
                    placeholder="Ej: Calle Principal #123"
                    required
                    disabled={isFormBusy}
                  />
                </div>
              </div>

              {/* 2. Notas */}
              <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
                <div className="flex items-center space-x-2 mb-4">
                  <div className="p-1.5 rounded-lg" style={{ backgroundColor: '#546E7A' }}>
                    <i className="fas fa-sticky-note text-white text-xs"></i>
                  </div>
                  <h3 className="font-semibold" style={{ color: '#2C3E50' }}>Notas</h3>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: '#2C3E50' }}>
                    Información adicional
                  </label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => handleInputChange('notes', e.target.value)}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:border-transparent text-sm"
                    style={{ '--tw-ring-color': '#546E7A' }}
                    rows="3"
                    placeholder="Información sobre las personas, horarios, observaciones..."
                    disabled={isFormBusy}
                  />
                </div>
              </div>

              {/* 3. Género del contacto */}
              <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
                <div className="flex items-center space-x-2 mb-4">
                  <div className="p-1.5 rounded-lg" style={{ backgroundColor: '#546E7A' }}>
                    <i className="fas fa-user text-white text-xs"></i>
                  </div>
                  <h3 className="font-semibold" style={{ color: '#2C3E50' }}>Género del Contacto</h3>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    { value: 'Hombre', icon: 'fas fa-person', label: 'Hombre' },
                    { value: 'Mujer', icon: 'fas fa-person-dress', label: 'Mujer' },
                    { value: 'Pareja', icon: 'fas fa-user-group', label: 'Pareja' },
                    { value: 'Desconocido', icon: 'fas fa-ban', label: 'Desconocido' }
                  ].map(option => (
                    <label
                      key={option.value}
                      className={`relative flex flex-col items-center p-3 border-2 rounded-lg cursor-pointer transition-all ${
                        formData.gender === option.value
                          ? 'border-gray-400 text-white'
                          : 'border-gray-200 hover:border-gray-300 text-gray-600 hover:bg-gray-50'
                      } ${isFormBusy ? 'cursor-not-allowed opacity-50' : ''}`}
                      style={{
                        backgroundColor: formData.gender === option.value ? '#546E7A' : 'transparent'
                      }}
                    >
                      <input
                        type="radio"
                        name="gender"
                        value={option.value}
                        checked={formData.gender === option.value}
                        onChange={(e) => handleInputChange('gender', e.target.value)}
                        className="sr-only"
                        disabled={isFormBusy}
                      />
                      <i className={`${option.icon} text-lg mb-2`}></i>
                      <span className="text-xs font-medium">{option.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* 4. Actividad */}
              <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
                <div className="flex items-center space-x-2 mb-4">
                  <div className="p-1.5 rounded-lg" style={{ backgroundColor: '#2C3E50' }}>
                    <i className="fas fa-clipboard-list text-white text-xs"></i>
                  </div>
                  <h3 className="font-semibold" style={{ color: '#2C3E50' }}>Actividad</h3>
                </div>

                <div className="space-y-3">
                  {/* Revisita */}
                  <div className="p-3 rounded-lg border border-gray-200">
                    <label className="flex items-start cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.isRevisita}
                        onChange={(e) => handleInputChange('isRevisita', e.target.checked)}
                        className="w-4 h-4 border-2 border-gray-300 rounded focus:ring-2 mt-1"
                        style={{ accentColor: '#546E7A' }}
                        disabled={isFormBusy}
                      />
                      <div className="ml-3 flex-1">
                        <div className="flex items-center mb-2">
                          <i className="fas fa-bookmark text-gray-500 mr-2"></i>
                          <span className="text-sm font-medium" style={{ color: '#2C3E50' }}>Revisita</span>
                        </div>
                        {formData.isRevisita && (
                          <div className="space-y-2">
                            {/* Formato simple y directo */}
                            {formData.revisitaBy && (
                              <div className="px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg">
                                <p className="text-sm text-gray-700">
                                  Revisita de {formData.revisitaBy}
                                </p>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </label>
                  </div>

                  {/* Estudio */}
                  <div className="p-3 rounded-lg border border-gray-200">
                    <label className="flex items-start cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.isEstudio}
                        onChange={(e) => handleInputChange('isEstudio', e.target.checked)}
                        className="w-4 h-4 border-2 border-gray-300 rounded focus:ring-2 mt-1"
                        style={{ accentColor: '#546E7A' }}
                        disabled={isFormBusy}
                      />
                      <div className="ml-3 flex-1">
                        <div className="flex items-center mb-2">
                          <i className="fas fa-book-open text-gray-500 mr-2"></i>
                          <span className="text-sm font-medium" style={{ color: '#2C3E50' }}>Estudio</span>
                        </div>
                        {formData.isEstudio && (
                          <div className="space-y-2">
                            {/* Formato simple y directo */}
                            {formData.estudioBy && (
                              <div className="px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg">
                                <p className="text-sm text-gray-700">
                                  Estudia con {formData.estudioBy}
                                </p>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </label>
                  </div>
                </div>
              </div>

              {/* 5. Ubicación - Colapsable (solo para administradores) */}
              {currentUser?.role === 'admin' && (
                <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                  {/* Header colapsable */}
                  <button
                    type="button"
                    onClick={() => setIsLocationExpanded(!isLocationExpanded)}
                    className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition-colors rounded-lg"
                  >
                    <div className="flex items-center space-x-2">
                      <div className="p-1.5 rounded-lg" style={{ backgroundColor: '#2C3E50' }}>
                        <i className="fas fa-map-marker-alt text-white text-xs"></i>
                      </div>
                      <h3 className="font-semibold" style={{ color: '#2C3E50' }}>Ubicación</h3>
                    </div>
                    <i className={`fas fa-chevron-${isLocationExpanded ? 'up' : 'down'} text-gray-400 transition-transform`}></i>
                  </button>

                  {/* Contenido colapsable */}
                  {isLocationExpanded && (
                    <div className="px-4 pb-4 border-t border-gray-100">
                      <div className="pt-4 space-y-4">
                        {/* URL del mapa */}
                        <div>
                          <label className="block text-sm font-medium mb-2" style={{ color: '#2C3E50' }}>
                            Enlace de Google Maps
                          </label>
                          <input
                            type="url"
                            value={formData.mapUrl}
                            onChange={(e) => handleInputChange('mapUrl', e.target.value)}
                            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:border-transparent text-sm"
                            style={{ '--tw-ring-color': '#546E7A' }}
                            placeholder="https://maps.google.com/..."
                            disabled={isFormBusy}
                          />
                        </div>

                        {/* Coordenadas */}
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium mb-2" style={{ color: '#2C3E50' }}>
                              Latitud
                            </label>
                            <input
                              type="number"
                              step="any"
                              value={formData.latitude || ''}
                              onChange={(e) => handleInputChange('latitude', e.target.value ? parseFloat(e.target.value) : null)}
                              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:border-transparent text-sm"
                              style={{ '--tw-ring-color': '#546E7A' }}
                              placeholder="20.6736"
                              disabled={isFormBusy}
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium mb-2" style={{ color: '#2C3E50' }}>
                              Longitud
                            </label>
                            <input
                              type="number"
                              step="any"
                              value={formData.longitude || ''}
                              onChange={(e) => handleInputChange('longitude', e.target.value ? parseFloat(e.target.value) : null)}
                              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:border-transparent text-sm"
                              style={{ '--tw-ring-color': '#546E7A' }}
                              placeholder="-103.3370"
                              disabled={isFormBusy}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Razón del cambio (para publicadores) */}
              {isPublisher && isEditing && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                  <div className="flex items-center space-x-2 mb-3">
                    <div className="p-1.5 rounded-lg bg-amber-500">
                      <i className="fas fa-exclamation-triangle text-white text-xs"></i>
                    </div>
                    <h3 className="font-semibold text-amber-800">Razón del cambio (requerido)</h3>
                  </div>
                  <textarea
                    value={changeReason}
                    onChange={(e) => setChangeReason(e.target.value)}
                    className="w-full px-3 py-2.5 border border-amber-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent text-sm"
                    rows="2"
                    placeholder="Explica brevemente por qué necesitas hacer este cambio..."
                    required
                    disabled={isFormBusy}
                  />
                </div>
              )}
            </div>
          </form>
        </div>

        {/* Footer con botones - SIEMPRE VISIBLE */}
        <div className="px-4 py-3 bg-white border-t border-gray-100 flex-shrink-0">
          <div className="flex justify-between items-center max-w-2xl mx-auto">
            {/* Botón eliminar / solicitar eliminación */}
            <div>
              {onDelete && isEditing && isAdmin && (
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(true)}
                  className="inline-flex items-center rounded-lg border border-red-200 bg-red-50 px-4 py-1.5 text-xs font-semibold text-red-700 transition-colors hover:bg-red-100 disabled:opacity-50"
                  disabled={isFormBusy}
                >
                  <i className="fas fa-trash mr-1.5 text-[11px]"></i>
                  Borrar dirección
                </button>
              )}
              {onDelete && isEditing && isPublisher && (
                <button
                  type="button"
                  onClick={() => setShowDeleteRequest(true)}
                  className="inline-flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700 transition-colors hover:bg-red-100 disabled:opacity-50"
                  disabled={isFormBusy}
                >
                  <Icon name="trash" size={16} />
                  Solicitar archivo
                </button>
              )}
            </div>

            {/* Botones principales */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleClose}
                className="px-3 py-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-all text-xs font-medium"
                disabled={isFormBusy}
              >
                Cancelar
              </button>
              <button
                type="submit"
                form="address-form"
                className="px-4 py-1.5 text-white rounded-lg text-xs font-semibold transition-all shadow-sm hover:shadow-md active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ backgroundColor: '#2C3E50' }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#34495e'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#2C3E50'}
                disabled={isFormBusy || !formData.address.trim() || (isPublisher && isEditing && !changeReason.trim())}
              >
                {isFormBusy ? (
                  <span className="flex items-center">
                    <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin mr-1.5"></div>
                    Guardando...
                  </span>
                ) : (
                  <span className="flex items-center">
                    <i className={`fas ${isEditing ? 'fa-save' : 'fa-plus'} mr-1.5 text-[11px]`}></i>
                    {isEditing ? 'Guardar' : 'Agregar'}
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      <ArchiveConfirmDialog
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleArchiveConfirm}
        isProcessing={isFormBusy}
        backHandlerId={`${modalId}-archive-confirm`}
        addressLabel={formData.address}
      />

      <ArchiveProposalDialog
        isOpen={showDeleteRequest}
        onClose={() => setShowDeleteRequest(false)}
        onConfirm={handleArchiveProposal}
        isProcessing={isFormBusy}
        backHandlerId={`${modalId}-archive-proposal`}
        addressLabel={formData.address}
      />
    </Modal>
  );
};

export default AddressFormModal;
