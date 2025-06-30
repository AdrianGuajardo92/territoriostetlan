import React, { useState, useEffect, useMemo } from 'react';
import Modal from '../common/Modal';
import Icon from '../common/Icon';
import { useApp } from '../../context/AppContext';

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
  
  // Estados para búsqueda de publicadores (solo admin)
  const [revisitaSearch, setRevisitaSearch] = useState('');
  const [estudioSearch, setEstudioSearch] = useState('');
  const [showRevisitaDropdown, setShowRevisitaDropdown] = useState(false);
  const [showEstudioDropdown, setShowEstudioDropdown] = useState(false);

  // Estado para la sección colapsable de ubicación
  const [isLocationExpanded, setIsLocationExpanded] = useState(false);

  // Función para normalizar texto (quitar acentos)
  const normalizeText = (text) => {
    return text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, ''); // Quita acentos
  };

  // Filtrar publicadores para revisita
  const filteredRevisitaPublishers = useMemo(() => {
    if (!isAdmin) return [];
    const normalizedSearch = normalizeText(revisitaSearch);
    
    return publishers
      .filter(publisher => {
        if (!publisher.name) return false;
        const normalizedName = normalizeText(publisher.name);
        return normalizedName.includes(normalizedSearch);
      })
      .sort((a, b) => a.name.localeCompare(b.name, 'es', { 
        sensitivity: 'base',
        numeric: true 
      }));
  }, [publishers, revisitaSearch, isAdmin]);

  // Filtrar publicadores para estudio
  const filteredEstudioPublishers = useMemo(() => {
    if (!isAdmin) return [];
    const normalizedSearch = normalizeText(estudioSearch);
    
    return publishers
      .filter(publisher => {
        if (!publisher.name) return false;
        const normalizedName = normalizeText(publisher.name);
        return normalizedName.includes(normalizedSearch);
      })
      .sort((a, b) => a.name.localeCompare(b.name, 'es', { 
        sensitivity: 'base',
        numeric: true 
      }));
  }, [publishers, estudioSearch, isAdmin]);

  useEffect(() => {
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
      // Inicializar campos de búsqueda con valores existentes
      setRevisitaSearch(address.revisitaBy || '');
      setEstudioSearch(address.estudioBy || '');
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
      setRevisitaSearch('');
      setEstudioSearch('');
    }
    setChangeReason('');
    setShowRevisitaDropdown(false);
    setShowEstudioDropdown(false);
    // Siempre contraer la ubicación al abrir/cambiar
    setIsLocationExpanded(false);
  }, [address, isOpen]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.address.trim()) {
      return;
    }

    onSave(formData, changeReason);
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => {
      const newData = { ...prev, [field]: value };
      
      // Limpiar campos relacionados cuando se desmarca
      if (field === 'isRevisita' && !value) {
        newData.revisitaBy = '';
        setRevisitaSearch('');
        setShowRevisitaDropdown(false);
      }
      if (field === 'isEstudio' && !value) {
        newData.estudioBy = '';
        setEstudioSearch('');
        setShowEstudioDropdown(false);
      }
      
      // Auto-llenar con el nombre del usuario actual cuando se marca (solo para no-admin)
      if (field === 'isRevisita' && value && currentUser?.name) {
        if (isPublisher) {
          newData.revisitaBy = currentUser.name;
          setRevisitaSearch(currentUser.name);
        } else {
          // Para admin, mostrar dropdown
          setShowRevisitaDropdown(true);
        }
      }
      if (field === 'isEstudio' && value && currentUser?.name) {
        if (isPublisher) {
          newData.estudioBy = currentUser.name;
          setEstudioSearch(currentUser.name);
        } else {
          // Para admin, mostrar dropdown
          setShowEstudioDropdown(true);
        }
      }
      
      return newData;
    });
  };

  // Manejar selección de publicador para revisita
  const handleRevisitaSelect = (publisherName) => {
    setFormData(prev => ({ ...prev, revisitaBy: publisherName }));
    setRevisitaSearch(publisherName);
    setShowRevisitaDropdown(false);
  };

  // Manejar selección de publicador para estudio
  const handleEstudioSelect = (publisherName) => {
    setFormData(prev => ({ ...prev, estudioBy: publisherName }));
    setEstudioSearch(publisherName);
    setShowEstudioDropdown(false);
  };

  // Manejar cambio en campo de búsqueda revisita
  const handleRevisitaSearchChange = (value) => {
    setRevisitaSearch(value);
    setFormData(prev => ({ ...prev, revisitaBy: value }));
  };

  // Manejar cambio en campo de búsqueda estudio
  const handleEstudioSearchChange = (value) => {
    setEstudioSearch(value);
    setFormData(prev => ({ ...prev, estudioBy: value }));
  };

  const handleDelete = () => {
    if (onDelete) {
      onDelete(address.id);
      setShowDeleteConfirm(false);
    }
  };

  const handleClose = () => {
    if (!isProcessing) {
      onClose();
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title=""
      size="lg"
      showCloseButton={false}
      closeOnBackdrop={!isProcessing}
      closeOnEscape={!isProcessing}
      modalId={modalId}
    >
      <div className="flex flex-col" style={{ height: '85vh' }}>
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
              disabled={isProcessing}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="Cerrar"
            >
              <i className="fas fa-times text-white text-sm"></i>
            </button>
          </div>
        </div>

        {/* Contenido con scroll garantizado */}
        <div className="flex-1 overflow-y-auto bg-gray-50" style={{ maxHeight: 'calc(85vh - 140px)' }}>
          <form onSubmit={handleSubmit} className="px-4 py-4">
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
                    disabled={isProcessing}
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
                    disabled={isProcessing}
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
                      } ${isProcessing ? 'cursor-not-allowed opacity-50' : ''}`}
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
                        disabled={isProcessing}
                      />
                      <i className={`${option.icon} text-lg mb-2`}></i>
                      <span className="text-xs font-medium">{option.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* 4. Estados especiales */}
              <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
                <div className="flex items-center space-x-2 mb-4">
                  <div className="p-1.5 rounded-lg" style={{ backgroundColor: '#2C3E50' }}>
                    <i className="fas fa-star text-white text-xs"></i>
                  </div>
                  <h3 className="font-semibold" style={{ color: '#2C3E50' }}>Estados Especiales</h3>
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
                        disabled={isProcessing}
                      />
                      <div className="ml-3 flex-1">
                        <div className="flex items-center mb-2">
                          <i className="fas fa-bookmark text-gray-500 mr-2"></i>
                          <span className="text-sm font-medium" style={{ color: '#2C3E50' }}>Revisita</span>
                        </div>
                        {formData.isRevisita && (
                          <div className="relative">
                            {isAdmin ? (
                              // Campo con búsqueda para administradores
                              <div>
                                <input
                                  type="text"
                                  value={revisitaSearch}
                                  onChange={(e) => {
                                    handleRevisitaSearchChange(e.target.value);
                                    setShowRevisitaDropdown(true);
                                  }}
                                  onFocus={() => setShowRevisitaDropdown(true)}
                                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:border-transparent"
                                  style={{ '--tw-ring-color': '#546E7A' }}
                                  placeholder="Buscar publicador..."
                                  disabled={isProcessing}
                                />
                                
                                {/* Dropdown de publicadores */}
                                {showRevisitaDropdown && (
                                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-40 overflow-y-auto">
                                    {filteredRevisitaPublishers.length > 0 ? (
                                      filteredRevisitaPublishers.map((publisher) => (
                                        <button
                                          key={publisher.id}
                                          type="button"
                                          onClick={() => handleRevisitaSelect(publisher.name)}
                                          className="w-full text-left px-3 py-2 hover:bg-gray-100 text-sm transition-colors"
                                          style={{ color: '#2C3E50' }}
                                        >
                                          {publisher.name}
                                        </button>
                                      ))
                                    ) : (
                                      <div className="px-3 py-2 text-sm text-gray-500">
                                        No se encontraron publicadores
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            ) : (
                              // Campo simple para publicadores
                              <input
                                type="text"
                                value={formData.revisitaBy}
                                onChange={(e) => handleInputChange('revisitaBy', e.target.value)}
                                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:border-transparent"
                                style={{ '--tw-ring-color': '#546E7A' }}
                                placeholder="¿Quién la visita?"
                                disabled={isProcessing}
                                readOnly
                              />
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
                        disabled={isProcessing}
                      />
                      <div className="ml-3 flex-1">
                        <div className="flex items-center mb-2">
                          <i className="fas fa-book-open text-gray-500 mr-2"></i>
                          <span className="text-sm font-medium" style={{ color: '#2C3E50' }}>Estudio</span>
                        </div>
                        {formData.isEstudio && (
                          <div className="relative">
                            {isAdmin ? (
                              // Campo con búsqueda para administradores
                              <div>
                                <input
                                  type="text"
                                  value={estudioSearch}
                                  onChange={(e) => {
                                    handleEstudioSearchChange(e.target.value);
                                    setShowEstudioDropdown(true);
                                  }}
                                  onFocus={() => setShowEstudioDropdown(true)}
                                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:border-transparent"
                                  style={{ '--tw-ring-color': '#546E7A' }}
                                  placeholder="Buscar publicador..."
                                  disabled={isProcessing}
                                />
                                
                                {/* Dropdown de publicadores */}
                                {showEstudioDropdown && (
                                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-40 overflow-y-auto">
                                    {filteredEstudioPublishers.length > 0 ? (
                                      filteredEstudioPublishers.map((publisher) => (
                                        <button
                                          key={publisher.id}
                                          type="button"
                                          onClick={() => handleEstudioSelect(publisher.name)}
                                          className="w-full text-left px-3 py-2 hover:bg-gray-100 text-sm transition-colors"
                                          style={{ color: '#2C3E50' }}
                                        >
                                          {publisher.name}
                                        </button>
                                      ))
                                    ) : (
                                      <div className="px-3 py-2 text-sm text-gray-500">
                                        No se encontraron publicadores
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            ) : (
                              // Campo simple para publicadores
                              <input
                                type="text"
                                value={formData.estudioBy}
                                onChange={(e) => handleInputChange('estudioBy', e.target.value)}
                                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:border-transparent"
                                style={{ '--tw-ring-color': '#546E7A' }}
                                placeholder="¿Quién dirige el estudio?"
                                disabled={isProcessing}
                                readOnly
                              />
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
                            disabled={isProcessing}
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
                              disabled={isProcessing}
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
                              disabled={isProcessing}
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
                    disabled={isProcessing}
                  />
                </div>
              )}
              
              {/* Espacio adicional al final para scroll completo */}
              <div className="h-20"></div>
            </div>
          </form>
        </div>

        {/* Footer con botones - SIEMPRE VISIBLE */}
        <div className="px-4 py-4 bg-white border-t border-gray-200 flex-shrink-0">
          <div className="flex justify-between items-center max-w-2xl mx-auto">
            {/* Botón eliminar */}
            <div>
              {onDelete && isEditing && (
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(true)}
                  className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors font-medium text-sm"
                  disabled={isProcessing}
                >
                  <i className="fas fa-trash mr-2"></i>
                  Eliminar
                </button>
              )}
            </div>
            
            {/* Botones principales */}
            <div className="flex space-x-3">
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2.5 border-2 border-gray-300 text-gray-600 rounded-lg hover:bg-gray-50 hover:border-gray-400 transition-all font-medium text-sm"
                disabled={isProcessing}
              >
                Cancelar
              </button>
              <button
                type="submit"
                form="address-form"
                className="px-6 py-2.5 text-white rounded-lg font-medium text-sm transition-all shadow-md hover:shadow-lg active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ backgroundColor: '#2C3E50' }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#34495e'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#2C3E50'}
                disabled={isProcessing || !formData.address.trim() || (isPublisher && isEditing && !changeReason.trim())}
                onClick={(e) => {
                  e.preventDefault();
                  handleSubmit(e);
                }}
              >
                {isProcessing ? (
                  <span className="flex items-center">
                    <div className="relative mr-2">
                      <div className="w-4 h-4 border-2 border-white/30 rounded-full animate-spin"></div>
                      <div className="absolute top-0 left-0 w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    </div>
                    Guardando...
                  </span>
                ) : (
                  <span className="flex items-center">
                    <i className={`fas ${isEditing ? 'fa-save' : 'fa-plus'} mr-2 text-sm`}></i>
                    {isEditing ? 'Guardar cambios' : 'Agregar dirección'}
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Confirmación de eliminación */}
      {showDeleteConfirm && (
        <div className="absolute inset-0 bg-white rounded-2xl flex items-center justify-center p-6">
          <div className="text-center max-w-sm">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-100 flex items-center justify-center">
              <i className="fas fa-exclamation-triangle text-red-600 text-2xl"></i>
            </div>
            <h3 className="text-lg font-semibold mb-2" style={{ color: '#2C3E50' }}>
              ¿Eliminar esta dirección?
            </h3>
            <p className="text-gray-600 mb-6 text-sm">
              Esta acción no se puede deshacer y se eliminará permanentemente de la base de datos.
            </p>
            <div className="flex justify-center space-x-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 border-2 border-gray-300 text-gray-600 rounded-lg hover:bg-gray-50 transition-colors font-medium text-sm"
              >
                Cancelar
              </button>
              <button
                onClick={handleDelete}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium text-sm"
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