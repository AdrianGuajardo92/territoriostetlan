import React, { useState, useMemo, useEffect, useCallback } from 'react';
import Modal from '../common/Modal';
import { useApp } from '../../context/AppContext';
import { useToast } from '../../hooks/useToast';

const AssignTerritoryModal = ({
  isOpen,
  onClose,
  onAssign,
  currentAssignee = '',
  territoryName = '',
  modalId = 'assign-territory-modal'
}) => {
  const { publishers, territories } = useApp();
  const { showToast } = useToast();
  const [selectedPublishers, setSelectedPublishers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [showAdvancedWarnings, setShowAdvancedWarnings] = useState(true);
  const [pendingWarnings, setPendingWarnings] = useState([]);



  // 🔄 PASO 7: Logging y debugging (DESACTIVADO EN PRODUCCIÓN)
  const logAssignmentAttempt = (data) => {
    // console.log('🎯 ASSIGNMENT ATTEMPT:', {
    //   territory: territoryName,
    //   selectedPublishers: data.selectedPublishers,
    //   assigneeData: data.assigneeData,
    //   currentAssignee: data.currentAssignee,
    //   timestamp: new Date().toISOString()
    // });
  };

  // 🔄 PASO 5: Función para normalizar texto (quitar acentos)
  const normalizeText = (text) => {
    return text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
  };

  // 🔄 PASO 5: Normalizar currentAssignee para mostrar equipos actuales
  const getCurrentAssigneeDisplay = () => {
    if (!currentAssignee) return '';
    
    // Si es un array, formatear como equipo
    if (Array.isArray(currentAssignee)) {
      if (currentAssignee.length === 0) return '';
      if (currentAssignee.length === 1) return currentAssignee[0];
      if (currentAssignee.length === 2) return `${currentAssignee[0]} y ${currentAssignee[1]}`;
      return `${currentAssignee.slice(0, -1).join(', ')} y ${currentAssignee[currentAssignee.length - 1]}`;
    }
    
    // Si es string, retornar tal como está
    return currentAssignee;
  };

  // 🔄 PASO 6: Calcular estadísticas de publicadores
  const publishersWithStats = useMemo(() => {
    return publishers.map(publisher => {
      const assignedTerritories = territories.filter(t => {
        if (!t.assignedTo) return false;
        
        // Verificar si está asignado individualmente o en equipo
        if (Array.isArray(t.assignedTo)) {
          return t.assignedTo.includes(publisher.name);
        }
        return t.assignedTo === publisher.name;
      });
      
      return {
        ...publisher,
        assignedTerritories: assignedTerritories.length,
        hasActiveTerritory: assignedTerritories.length > 0,
        isOverloaded: assignedTerritories.length >= 3 // Más de 3 territorios es mucho
      };
    });
  }, [publishers, territories]);

  // 🔄 PASO 16: Función para aplicar ordenamiento (filtros eliminados)
  const applyAdvancedFilters = useCallback((publishers) => {
    let filtered = [...publishers];

    // Ordenamiento por nombre (simplificado)
    filtered.sort((a, b) => a.name.localeCompare(b.name));

    return filtered;
  }, []);

  // 🔄 PASO 5: Filtrar y ordenar publicadores (MEJORADO con filtros avanzados)
  const filteredAndSortedPublishers = useMemo(() => {
    const normalizedSearch = normalizeText(searchTerm);
    
    return applyAdvancedFilters(publishersWithStats)
      .filter(publisher => {
        if (!publisher.name) return false;
        
        // 🔄 PASO 16: Búsqueda avanzada por múltiples criterios
        if (!normalizedSearch) return true; // Si no hay búsqueda, mostrar todos
        
        // Buscar en nombre
        const normalizedName = normalizeText(publisher.name);
        if (normalizedName.includes(normalizedSearch)) return true;
        
        // Buscar en teléfono
        if (publisher.phone) {
          const normalizedPhone = publisher.phone.replace(/\D/g, ''); // Solo números
          const searchNumbers = normalizedSearch.replace(/\D/g, '');
          if (normalizedPhone.includes(searchNumbers)) return true;
        }
        
        // Buscar por iniciales (ej: "JM" para "Juan Martínez")
        if (normalizedSearch.length >= 2) {
          const nameWords = publisher.name.split(' ').filter(word => word.length > 0);
          const initials = nameWords.map(word => word.charAt(0).toLowerCase()).join('');
          if (initials.includes(normalizedSearch)) return true;
        }
        
        return false;
      });
  }, [publishersWithStats, searchTerm, applyAdvancedFilters]);

  // 🔄 PASO 6: Manejar selección/deselección con validaciones avanzadas
  const handlePublisherToggle = (publisherName) => {
    setSelectedPublishers(prev => {
      const isSelected = prev.includes(publisherName);
      
      if (isSelected) {
        // Deseleccionar
        return prev.filter(name => name !== publisherName);
      } else {
        // Validar máximo 3 personas
        if (prev.length >= 3) {
          // Programar advertencia para después del renderizado
          setPendingWarnings(warnings => [...warnings, {
            id: Date.now(),
            message: 'Máximo 3 personas por territorio',
            type: 'warning'
          }]);
          return prev;
        }
        
        // 🔄 PASO 6: Programar validaciones adicionales para después del renderizado
        const publisher = publishersWithStats.find(p => p.name === publisherName);
        const newWarnings = [];
        
        // Advertir solo si está sobrecargado (3+ territorios)
        if (publisher?.isOverloaded && showAdvancedWarnings) {
          newWarnings.push({
            id: Date.now() + 2,
            message: `🚨 ${publisherName} tiene ${publisher.assignedTerritories} territorios. ¿Está seguro?`,
            type: 'warning',
            duration: 5000
          });
        }
        
        // Programar advertencias si hay alguna
        if (newWarnings.length > 0) {
          setPendingWarnings(warnings => [...warnings, ...newWarnings]);
        }
        
        return [...prev, publisherName];
      }
    });
  };

  // 🔄 PASO 5: Formatear nombres del equipo para mostrar
  const formatTeamNames = (names) => {
    if (names.length === 0) return '';
    if (names.length === 1) return names[0];
    if (names.length === 2) return `${names[0]} y ${names[1]}`;
    return `${names.slice(0, -1).join(', ')} y ${names[names.length - 1]}`;
  };

  // 🔄 PASO 7: Manejar envío del formulario con validaciones finales y casos edge
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // 🔄 PASO 7: Validaciones básicas mejoradas
    if (selectedPublishers.length === 0) {
      showToast('Selecciona al menos una persona', 'warning');
      return;
    }

    // 🔄 PASO 7: Validar que los publicadores seleccionados aún existen
    const validPublishers = selectedPublishers.filter(name => {
      return publishersWithStats.some(p => p.name === name);
    });

    if (validPublishers.length !== selectedPublishers.length) {
      const invalidCount = selectedPublishers.length - validPublishers.length;
      showToast(
        `⚠️ ${invalidCount} persona(s) seleccionada(s) ya no está(n) disponible(s)`, 
        'warning'
      );
      setSelectedPublishers(validPublishers);
      return;
    }

    // 🔄 PASO 6: Validaciones finales antes del envío
    const overloadedPublishers = selectedPublishers.filter(name => {
      const publisher = publishersWithStats.find(p => p.name === name);
      return publisher?.isOverloaded;
    });

    if (overloadedPublishers.length > 0 && showAdvancedWarnings) {
      const names = overloadedPublishers.join(', ');
      showToast(
        `⚠️ Advertencia: ${names} ${overloadedPublishers.length === 1 ? 'tiene' : 'tienen'} muchos territorios asignados`, 
        'warning', 
        4000
      );
    }

    // 🔄 PASO 7: Preparar datos para envío
    const assigneeData = selectedPublishers.length === 1 
      ? selectedPublishers[0] 
      : selectedPublishers;

    // 🔄 PASO 7: Logging antes del envío
    logAssignmentAttempt({
      selectedPublishers,
      assigneeData,
      currentAssignee,
      overloadedCount: overloadedPublishers.length
    });

    setIsProcessing(true);
    try {
      await onAssign(assigneeData);
      
      // 🔄 PASO 7: Logging exitoso (DESACTIVADO EN PRODUCCIÓN)
      // console.log('✅ ASSIGNMENT SUCCESS:', {
      //   territory: territoryName,
      //   assignedTo: assigneeData,
      //   type: selectedPublishers.length === 1 ? 'individual' : 'team'
      // });
      
      // Limpiar y cerrar modal
      setSelectedPublishers([]);
      setSearchTerm('');
      onClose();
    } catch (error) {
      // 🔄 PASO 7: Logging de errores mejorado (DESACTIVADO EN PRODUCCIÓN)
      // console.error('❌ ASSIGNMENT ERROR:', {
      //   territory: territoryName,
      //   assigneeData,
      //   error: error.message,
      //   stack: error.stack
      // });
      
      // Mostrar error específico si está disponible
      const errorMessage = error.message || 'Error al asignar el territorio. Intenta nuevamente.';
      showToast(errorMessage, 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  // 🔄 PASO 7: Manejar cierre del modal con limpieza completa
  const handleClose = () => {
    if (!isProcessing) {
      // 🔄 PASO 7: Logging de cierre (DESACTIVADO EN PRODUCCIÓN)
      // console.log('🚪 MODAL CLOSED:', {
      //   territory: territoryName,
      //   hadSelections: selectedPublishers.length > 0,
      //   hadSearch: searchTerm.length > 0
      // });
      
      setSelectedPublishers([]);
      setSearchTerm('');
      setShowAdvancedWarnings(true); // Reset a estado por defecto
      setPendingWarnings([]); // Limpiar advertencias pendientes
      onClose();
    }
  };

  // 🔄 PASO 7: Seleccionar todos los publicadores filtrados (máximo 3) - Optimizado
  const handleSelectAll = useCallback(() => {
    const availablePublishers = filteredAndSortedPublishers
      .filter(p => !p.isOverloaded) // Priorizar no sobrecargados
      .map(p => p.name)
      .slice(0, 3);
    
    // Si no hay suficientes disponibles, completar con sobrecargados
    if (availablePublishers.length < 3) {
      const overloadedPublishers = filteredAndSortedPublishers
        .filter(p => p.isOverloaded)
        .map(p => p.name)
        .slice(0, 3 - availablePublishers.length);
      
      availablePublishers.push(...overloadedPublishers);
    }
    
    // console.log('🎯 SELECT ALL:', {
    //   available: availablePublishers,
    //   filtered: filteredAndSortedPublishers.length
    // });
    
    setSelectedPublishers(availablePublishers);
  }, [filteredAndSortedPublishers]);

  // 🔄 PASO 5: Limpiar todas las selecciones
  const handleClearAll = useCallback(() => {
    setSelectedPublishers([]);
  }, []);

  // 🔄 PASO 7: Efectos de optimización y logging
  useEffect(() => {
    if (isOpen) {
      // console.log('🔄 MODAL OPENED:', {
      //   territory: territoryName,
      //   currentAssignee: currentAssignee,
      //   publishersCount: publishers.length,
      //   territoriesCount: territories.length
      // });
    }
  }, [isOpen, territoryName, currentAssignee, publishers.length, territories.length]);

  // 🔄 PASO 7: Efecto para limpiar selecciones cuando cambia el territorio
  useEffect(() => {
    if (isOpen && selectedPublishers.length > 0) {
              // console.log('🔄 TERRITORY CHANGED - Clearing selections');
      setSelectedPublishers([]);
    }
  }, [territoryName, isOpen]); // Limpiar cuando cambia el territorio

  // 🔄 PASO 7: Efecto para validar selecciones cuando cambian los datos
  useEffect(() => {
    if (selectedPublishers.length > 0) {
      const stillValid = selectedPublishers.filter(name => 
        publishersWithStats.some(p => p.name === name)
      );
      
      if (stillValid.length !== selectedPublishers.length) {
        // console.log('⚠️ INVALID SELECTIONS DETECTED - Cleaning up');
        setSelectedPublishers(stillValid);
      }
    }
  }, [publishersWithStats, selectedPublishers]);

  // 🔄 NUEVO: Efecto para procesar advertencias pendientes después del renderizado
  useEffect(() => {
    if (pendingWarnings.length > 0) {
      // Procesar todas las advertencias pendientes
      pendingWarnings.forEach(warning => {
        showToast(warning.message, warning.type, warning.duration);
      });
      
      // Limpiar advertencias procesadas
      setPendingWarnings([]);
    }
  }, [pendingWarnings, showToast]);

  // 🔄 PASO 14: Manejo de teclas para navegación mejorada
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!isOpen) return;
      
      // Escape para cerrar (ya manejado por Modal)
      if (e.key === 'Escape' && !isProcessing) {
        handleClose();
        return;
      }
      
      // Enter para confirmar si hay selecciones
      if (e.key === 'Enter' && e.target.tagName !== 'INPUT' && selectedPublishers.length > 0 && !isProcessing) {
        e.preventDefault();
        handleSubmit(e);
        return;
      }
      
      // Ctrl/Cmd + A para seleccionar todos (máximo 3)
      if ((e.ctrlKey || e.metaKey) && e.key === 'a' && e.target.tagName !== 'INPUT') {
        e.preventDefault();
        const availablePublishers = filteredAndSortedPublishers
          .filter(p => !p.isOverloaded)
          .map(p => p.name)
          .slice(0, 3);
        setSelectedPublishers(availablePublishers);
        return;
      }
      
      // Ctrl/Cmd + D para limpiar selecciones
      if ((e.ctrlKey || e.metaKey) && e.key === 'd' && selectedPublishers.length > 0) {
        e.preventDefault();
        setSelectedPublishers([]);
        return;
      }
    };
    
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isProcessing, selectedPublishers, filteredAndSortedPublishers, handleSubmit, handleClose]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title=""
      size="responsive-large"
      showCloseButton={false}
      closeOnBackdrop={!isProcessing}
      closeOnEscape={!isProcessing}
      modalId={modalId}
    >
      <div className="flex flex-col h-full">
        {/* 🔄 PASO 5: Header mejorado para asignaciones múltiples */}
        <div className="px-4 py-2.5 flex-shrink-0" style={{ backgroundColor: '#2C3E50' }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              <div className="p-1.5 rounded-lg shadow-md" style={{ backgroundColor: '#34495e' }}>
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                  <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
              </div>
              <div>
                <h2 className="text-base font-bold text-white">Asignar Territorio</h2>
                <p className="text-white/70 text-xs">{territoryName}</p>
              </div>
            </div>
            
            <button
              onClick={handleClose}
              disabled={isProcessing}
              className="p-1.5 hover:bg-white/10 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="Cerrar"
            >
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          {/* 🔄 PASO 5: Mostrar asignación actual (individual o equipo) */}
          {currentAssignee && (
            <div className="mt-2 p-2 rounded-lg" style={{ backgroundColor: '#34495e' }}>
              <div className="flex items-center space-x-2">
                <div className="bg-yellow-500 p-0.5 rounded-full">
                  <svg className="w-2.5 h-2.5 text-yellow-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <p className="text-xs text-white/80">
                    Actualmente asignado a:
                  </p>
                  <p className="text-white font-semibold text-xs">{getCurrentAssigneeDisplay()}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 🔄 PASO 5: Barra de búsqueda y controles */}
        <div className="px-4 py-2 flex-shrink-0" style={{ backgroundColor: '#546E7A' }}>
          <div className="space-y-2">
            {/* Búsqueda */}
          <div className="relative">
            <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
              <svg className="w-3.5 h-3.5 text-white/70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-9 py-2 bg-white/90 border-0 rounded-lg focus:bg-white focus:ring-2 focus:ring-white/50 transition-all placeholder-gray-500 text-gray-700 text-sm"
                placeholder="Buscar por nombre"
              disabled={isProcessing}
                aria-label="Buscar publicador por nombre"
                aria-describedby="search-help"
            />
              <div id="search-help" className="sr-only">
                Busca por nombre, teléfono o iniciales (ej: "JM" para Juan Martínez)
              </div>
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
              )}
            </div>

            {/* 🔄 PASO 5: Controles de selección rápida */}
            <div className="flex items-center justify-between">
              <div className="flex space-x-2">
                <button
                  type="button"
                  onClick={handleClearAll}
                  disabled={isProcessing || selectedPublishers.length === 0}
                  className="px-2 py-1 text-xs text-white/80 hover:text-white hover:bg-white/10 rounded transition-colors disabled:opacity-50"
                  aria-label="Limpiar todas las selecciones"
                >
                  Limpiar todo
                </button>
              </div>
              
              {/* 🔄 PASO 6: Contador de selecciones */}
              <div className="flex items-center">
                <div className={`text-xs font-medium px-2 py-1 rounded-full transition-colors ${
                  selectedPublishers.length === 0 
                    ? 'text-white/60 bg-white/10'
                    : selectedPublishers.length >= 3
                    ? 'text-green-200 bg-green-500/20'
                    : 'text-white/80 bg-white/10'
                }`}>
                  <span className="flex items-center space-x-1">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                      <circle cx="9" cy="7" r="4" />
                      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                    </svg>
                    <span>{selectedPublishers.length}/3</span>
                  </span>
                </div>
              </div>
            </div>

            {/* 🔄 PASO 16: Indicador de resultados */}
            {searchTerm && (
              <div className="text-xs text-white/60 mt-2">
                <span className="flex items-center space-x-1">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>
                    Mostrando {filteredAndSortedPublishers.length} de {publishersWithStats.length} publicadores (búsqueda: "{searchTerm}")
                  </span>
                </span>
              </div>
            )}
          </div>
        </div>

        {/* 🔄 PASO 6: Vista previa del equipo seleccionado con validaciones */}
        {selectedPublishers.length > 0 && (
          <div className="px-4 py-2 bg-blue-50 border-b border-blue-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="bg-blue-500 p-1 rounded-full">
                  <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                  </svg>
                </div>
                <div>
                  <p className="text-xs text-blue-600 font-medium">
                    Asignar a:
                  </p>
                  <p className="text-sm text-blue-800 font-semibold">
                    {formatTeamNames(selectedPublishers)}
                  </p>
                </div>
              </div>
              

            </div>
          </div>
        )}

        {/* 🔄 PASO 5: Lista de publicadores con checkboxes */}
        <div className="flex-1 flex flex-col min-h-0 bg-gray-50">
          <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0">
            <div className="px-4 py-2 flex-1 flex flex-col min-h-0">
              <div className="bg-white rounded-lg border border-gray-200 overflow-hidden flex-1 flex flex-col">
                <div className="overflow-y-auto flex-1">
                  {filteredAndSortedPublishers.length === 0 ? (
                    <div className="text-center py-6" role="status" aria-live="polite">
                      <div className="bg-gray-100 w-10 h-10 rounded-full flex items-center justify-center mx-auto mb-2">
                        <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                      </div>
                      <p className="text-gray-500 font-medium text-sm">No se encontraron publicadores</p>
                      <p className="text-xs text-gray-400 mt-1">Intenta con otro término</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-100" role="group" aria-label="Lista de publicadores disponibles">
                      {filteredAndSortedPublishers.map((publisher, index) => {
                        const isSelected = selectedPublishers.includes(publisher.name);
                        const isDisabled = !isSelected && selectedPublishers.length >= 3;
                        
                        return (
                        <label
                          key={publisher.id}
                          className={`flex items-center p-2.5 cursor-pointer transition-all duration-200 ${
                              isSelected 
                                ? 'bg-blue-50 border-l-4 border-blue-500' 
                                : isDisabled
                                ? 'bg-gray-50 opacity-50 cursor-not-allowed'
                              : 'hover:bg-gray-50'
                          }`}
                            aria-label={`${publisher.name}`}
                        >
                          <div className="relative">
                            <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => handlePublisherToggle(publisher.name)}
                                className="w-4 h-4 border-2 border-gray-300 focus:ring-2 focus:ring-blue-200 transition-all rounded"
                              style={{ 
                                  accentColor: isSelected ? '#3B82F6' : undefined 
                              }}
                                disabled={isProcessing || isDisabled}
                                aria-describedby={`publisher-${publisher.id}-info`}
                            />
                          </div>
                          
                          <div className="ml-2.5 flex-1 min-w-0">
                            <div className="flex items-center space-x-2.5">
                              <div 
                                  className={`w-7 h-7 rounded-full flex items-center justify-center text-white font-bold text-xs ${
                                    isSelected ? 'bg-blue-500' : 'bg-gray-400'
                                  }`}
                                  aria-hidden="true"
                              >
                                {publisher.name?.charAt(0)?.toUpperCase()}
                              </div>
                                <div className="flex-1 min-w-0" id={`publisher-${publisher.id}-info`}>
                                  <p className={`font-semibold text-sm truncate ${
                                    isSelected ? 'text-blue-700' : 'text-gray-700'
                                  }`}>
                                  {publisher.name}
                                </p>
                                {publisher.phone && (
                                  <div className="flex items-center space-x-1 mt-0.5">
                                      <svg className="w-2.5 h-2.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                    </svg>
                                    <span className="text-xs text-gray-500 truncate">{publisher.phone}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                          
                          <div className="ml-2 flex flex-col items-end space-y-1">

                              

                              
                              {isSelected && (
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 border border-blue-200">
                                <svg className="w-2 h-2 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                                Seleccionado
                              </span>
                            )}
                          </div>
                        </label>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* 🔄 PASO 5: Botones de acción mejorados */}
            <div className="px-4 py-2.5 bg-white border-t border-gray-200 flex-shrink-0">
              <div className="flex flex-col space-y-2">
                <button
                  type="submit"
                  className={`w-full py-2.5 px-4 rounded-lg font-semibold text-sm transition-all ${
                    selectedPublishers.length > 0 && !isProcessing
                      ? 'bg-blue-600 text-white shadow-md hover:bg-blue-700 hover:shadow-lg active:scale-95'
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  }`}
                  disabled={selectedPublishers.length === 0 || isProcessing}
                  aria-label={`Asignar territorio a ${selectedPublishers.length > 0 ? formatTeamNames(selectedPublishers) : 'publicador seleccionado'}`}
                  aria-describedby="assign-button-help"
                >
                  {isProcessing ? (
                    <span className="flex items-center justify-center">
                      <div className="relative" aria-hidden="true">
                        <div className="w-5 h-5 border-3 border-white/30 rounded-full animate-spin"></div>
                        <div className="absolute top-0 left-0 w-5 h-5 border-3 border-white border-t-transparent rounded-full animate-spin"></div>
                      </div>
                      <span className="ml-2">Asignando territorio...</span>
                    </span>
                  ) : (
                    <span className="flex items-center justify-center">
                      <svg className="w-3.5 h-3.5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Asignar
                    </span>
                  )}
                </button>
                <div id="assign-button-help" className="sr-only">
                  {selectedPublishers.length === 0 
                    ? 'Selecciona al menos un publicador para asignar el territorio'
                    : `Confirmar asignación del territorio ${territoryName} a ${formatTeamNames(selectedPublishers)}`
                  }
                </div>
                
                <button
                  type="button"
                  onClick={handleClose}
                  className="w-full py-2.5 px-4 border-2 border-gray-300 text-gray-600 rounded-lg hover:bg-gray-50 hover:border-gray-400 transition-all font-semibold text-sm active:scale-95"
                  disabled={isProcessing}
                  aria-label="Cancelar y cerrar modal"
                >
                  Cancelar
                </button>
                

              </div>
            </div>
          </form>
        </div>
      </div>
    </Modal>
  );
};

export default AssignTerritoryModal; 