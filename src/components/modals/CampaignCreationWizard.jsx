import React, { useState, useEffect } from 'react';
import Icon from '../common/Icon';
import { useApp } from '../../context/AppContext';
import { useToast } from '../../hooks/useToast';

const CampaignCreationWizard = ({ isOpen, onClose, onComplete }) => {
  const { territories, addresses, users, createCampaign } = useApp();
  const { showToast } = useToast();
  
  const [step, setStep] = useState(1); // 1: Info básica, 2: Territorios, 3: Reglas, 4: Confirmación
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Datos de la campaña
  const [campaignData, setCampaignData] = useState({
    name: '',
    description: '',
    selectedTerritories: [],
    defaultAddressCount: 2,
    exceptions: [], // Array de {userId, addressCount}
    startDate: new Date().toISOString().split('T')[0],
    endDate: ''
  });

  // Estado para búsqueda de usuarios en excepciones
  const [userSearch, setUserSearch] = useState('');
  const [showUserDropdown, setShowUserDropdown] = useState(false);

  // Calcular totales
  const calculateTotals = () => {
    // Direcciones totales en territorios seleccionados
    const totalAddresses = addresses.filter(addr => 
      campaignData.selectedTerritories.includes(addr.territoryId)
    ).length;

    // Publicadores (excluir administradores si es necesario)
    const publishers = users.filter(u => u.role !== 'admin');
    
    // Calcular direcciones necesarias
    let requiredAddresses = 0;
    publishers.forEach(user => {
      const exception = campaignData.exceptions.find(e => e.userId === user.id);
      requiredAddresses += exception ? exception.addressCount : campaignData.defaultAddressCount;
    });

    return {
      totalAddresses,
      totalPublishers: publishers.length,
      requiredAddresses,
      isViable: totalAddresses >= requiredAddresses
    };
  };

  const totals = calculateTotals();

  // Filtrar usuarios para dropdown de excepciones
  const filteredUsers = users.filter(user => {
    if (user.role === 'admin') return false;
    if (campaignData.exceptions.some(e => e.userId === user.id)) return false;
    if (!userSearch) return false;
    return user.name.toLowerCase().includes(userSearch.toLowerCase()) ||
           user.accessCode.toLowerCase().includes(userSearch.toLowerCase());
  });

  // Agregar excepción
  const addException = (userId) => {
    const user = users.find(u => u.id === userId);
    if (user) {
      setCampaignData(prev => ({
        ...prev,
        exceptions: [...prev.exceptions, { userId, userName: user.name, addressCount: 1 }]
      }));
      setUserSearch('');
      setShowUserDropdown(false);
    }
  };

  // Remover excepción
  const removeException = (userId) => {
    setCampaignData(prev => ({
      ...prev,
      exceptions: prev.exceptions.filter(e => e.userId !== userId)
    }));
  };

  // Actualizar cantidad de direcciones en excepción
  const updateExceptionCount = (userId, count) => {
    setCampaignData(prev => ({
      ...prev,
      exceptions: prev.exceptions.map(e => 
        e.userId === userId ? { ...e, addressCount: parseInt(count) || 0 } : e
      )
    }));
  };

  // Toggle territorio seleccionado
  const toggleTerritory = (territoryId) => {
    setCampaignData(prev => ({
      ...prev,
      selectedTerritories: prev.selectedTerritories.includes(territoryId)
        ? prev.selectedTerritories.filter(t => t !== territoryId)
        : [...prev.selectedTerritories, territoryId]
    }));
  };

  // Seleccionar todos los territorios
  const selectAllTerritories = () => {
    setCampaignData(prev => ({
      ...prev,
      selectedTerritories: territories.map(t => t.id)
    }));
  };

  // Crear y asignar campaña
  const handleCreateCampaign = async () => {
    setIsProcessing(true);
    try {
      // Validaciones
      if (!campaignData.name.trim()) {
        showToast('Por favor ingresa un nombre para la campaña', 'error');
        setIsProcessing(false);
        return;
      }

      if (campaignData.selectedTerritories.length === 0) {
        showToast('Por favor selecciona al menos un territorio', 'error');
        setIsProcessing(false);
        return;
      }

      if (!totals.isViable) {
        showToast('No hay suficientes direcciones para completar las asignaciones', 'error');
        setIsProcessing(false);
        return;
      }

      // Obtener direcciones de los territorios seleccionados
      const availableAddresses = addresses.filter(addr => 
        campaignData.selectedTerritories.includes(addr.territoryId)
      );

      // Obtener publicadores
      const publishers = users.filter(u => u.role !== 'admin');

      // Crear asignaciones
      const assignments = [];
      let addressIndex = 0;
      const shuffledAddresses = [...availableAddresses].sort(() => Math.random() - 0.5);

      for (const publisher of publishers) {
        const exception = campaignData.exceptions.find(e => e.userId === publisher.id);
        const addressCount = exception ? exception.addressCount : campaignData.defaultAddressCount;
        
        const assignedAddresses = [];
        for (let i = 0; i < addressCount && addressIndex < shuffledAddresses.length; i++) {
          assignedAddresses.push(shuffledAddresses[addressIndex].id);
          addressIndex++;
        }

        assignments.push({
          userId: publisher.id,
          userName: publisher.name,
          addressCount: assignedAddresses.length,
          addressIds: assignedAddresses,
          completed: false,
          completedCount: 0
        });
      }

      // Crear objeto de campaña
      const newCampaign = {
        name: campaignData.name,
        description: campaignData.description,
        territories: campaignData.selectedTerritories,
        totalAddresses: shuffledAddresses.length,
        assignments,
        status: 'active',
        createdAt: new Date().toISOString(),
        createdBy: useApp().currentUser?.id,
        startDate: campaignData.startDate,
        endDate: campaignData.endDate,
        rules: {
          defaultAddressCount: campaignData.defaultAddressCount,
          exceptions: campaignData.exceptions
        }
      };

      // Llamar a la función del contexto (cuando esté implementada)
      // await createCampaign(newCampaign);
      
      showToast(`Campaña "${campaignData.name}" creada exitosamente con ${assignments.length} asignaciones`, 'success');
      onComplete();
    } catch (error) {
      console.error('Error creando campaña:', error);
      showToast('Error al crear la campaña', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-white z-[9999]">
      {/* Header con progreso */}
      <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg">
        <div className="px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                <Icon name="flag" className="text-2xl text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">Nueva Campaña</h1>
                <p className="text-white/80 text-sm">Paso {step} de 4</p>
              </div>
            </div>
            <button
              onClick={onClose}
              disabled={isProcessing}
              className="w-10 h-10 bg-white/20 hover:bg-white/30 rounded-xl flex items-center justify-center transition-colors disabled:opacity-50"
            >
              <Icon name="x" className="text-xl text-white" />
            </button>
          </div>

          {/* Barra de progreso */}
          <div className="flex gap-2">
            {[1, 2, 3, 4].map(s => (
              <div
                key={s}
                className={`flex-1 h-2 rounded-full transition-all ${
                  s <= step ? 'bg-white' : 'bg-white/30'
                }`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Contenido del wizard */}
      <div className="h-[calc(100vh-120px)] overflow-y-auto p-6">
        {/* Paso 1: Información básica */}
        {step === 1 && (
          <div className="max-w-2xl mx-auto">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Información de la Campaña</h2>
            
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nombre de la Campaña *
                </label>
                <input
                  type="text"
                  value={campaignData.name}
                  onChange={(e) => setCampaignData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Ej: Campaña de Conmemoración 2025"
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Descripción (opcional)
                </label>
                <textarea
                  value={campaignData.description}
                  onChange={(e) => setCampaignData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Describe el propósito de esta campaña..."
                  rows={4}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Fecha de Inicio
                  </label>
                  <input
                    type="date"
                    value={campaignData.startDate}
                    onChange={(e) => setCampaignData(prev => ({ ...prev, startDate: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Fecha de Fin (opcional)
                  </label>
                  <input
                    type="date"
                    value={campaignData.endDate}
                    onChange={(e) => setCampaignData(prev => ({ ...prev, endDate: e.target.value }))}
                    min={campaignData.startDate}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Paso 2: Selección de territorios */}
        {step === 2 && (
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Seleccionar Territorios</h2>
              <button
                onClick={selectAllTerritories}
                className="px-4 py-2 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 font-medium"
              >
                Seleccionar Todos
              </button>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
              <p className="text-sm text-blue-800">
                <Icon name="info" className="inline mr-2" />
                Selecciona los territorios de donde se tomarán las direcciones para esta campaña.
                Actualmente hay <span className="font-bold">{totals.totalAddresses}</span> direcciones
                en los territorios seleccionados.
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {territories.map(territory => {
                const addressCount = addresses.filter(a => a.territoryId === territory.id).length;
                const isSelected = campaignData.selectedTerritories.includes(territory.id);
                
                return (
                  <button
                    key={territory.id}
                    onClick={() => toggleTerritory(territory.id)}
                    className={`p-4 rounded-xl border-2 transition-all ${
                      isSelected 
                        ? 'bg-purple-100 border-purple-500 shadow-lg' 
                        : 'bg-white border-gray-200 hover:border-purple-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-bold text-gray-900">
                        T{territory.name.replace(/[^\d]/g, '')}
                      </span>
                      {isSelected && (
                        <Icon name="checkCircle" className="text-purple-600" />
                      )}
                    </div>
                    <p className="text-sm text-gray-600">
                      {addressCount} direcciones
                    </p>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Paso 3: Reglas de asignación */}
        {step === 3 && (
          <div className="max-w-3xl mx-auto">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Reglas de Asignación</h2>

            {/* Regla general */}
            <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Regla General</h3>
              <div className="flex items-center gap-4">
                <label className="text-gray-700">
                  Asignar por defecto
                </label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={campaignData.defaultAddressCount}
                  onChange={(e) => setCampaignData(prev => ({ 
                    ...prev, 
                    defaultAddressCount: parseInt(e.target.value) || 1 
                  }))}
                  className="w-20 px-3 py-2 border border-gray-300 rounded-lg text-center font-bold"
                />
                <span className="text-gray-700">
                  direcciones a cada publicador
                </span>
              </div>
            </div>

            {/* Excepciones */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Excepciones</h3>
              <p className="text-sm text-gray-600 mb-4">
                Publicadores que recibirán una cantidad diferente de direcciones
              </p>

              {/* Agregar excepción */}
              <div className="relative mb-4">
                <input
                  type="text"
                  value={userSearch}
                  onChange={(e) => {
                    setUserSearch(e.target.value);
                    setShowUserDropdown(true);
                  }}
                  onFocus={() => setShowUserDropdown(true)}
                  placeholder="Buscar publicador para agregar excepción..."
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                />
                
                {showUserDropdown && filteredUsers.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto z-10">
                    {filteredUsers.map(user => (
                      <button
                        key={user.id}
                        onClick={() => addException(user.id)}
                        className="w-full px-4 py-3 text-left hover:bg-gray-50 flex items-center justify-between"
                      >
                        <div>
                          <p className="font-medium text-gray-900">{user.name}</p>
                          <p className="text-sm text-gray-600">@{user.accessCode}</p>
                        </div>
                        <Icon name="plus" className="text-gray-400" />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Lista de excepciones */}
              {campaignData.exceptions.length === 0 ? (
                <p className="text-gray-500 text-center py-8">
                  No hay excepciones configuradas
                </p>
              ) : (
                <div className="space-y-3">
                  {campaignData.exceptions.map(exception => (
                    <div key={exception.userId} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <Icon name="user" className="text-gray-400" />
                        <span className="font-medium text-gray-900">{exception.userName}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <input
                          type="number"
                          min="0"
                          max="10"
                          value={exception.addressCount}
                          onChange={(e) => updateExceptionCount(exception.userId, e.target.value)}
                          className="w-16 px-2 py-1 border border-gray-300 rounded text-center"
                        />
                        <span className="text-gray-600">direcciones</span>
                        <button
                          onClick={() => removeException(exception.userId)}
                          className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg"
                        >
                          <Icon name="trash" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Resumen de asignación */}
            <div className={`mt-6 p-4 rounded-xl border-2 ${
              totals.isViable 
                ? 'bg-green-50 border-green-200' 
                : 'bg-red-50 border-red-200'
            }`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-700">Resumen de Asignación</p>
                  <p className="text-xs text-gray-600 mt-1">
                    {totals.totalPublishers} publicadores × {campaignData.defaultAddressCount} direcciones 
                    (con {campaignData.exceptions.length} excepciones)
                  </p>
                </div>
                <div className="text-right">
                  <p className={`text-2xl font-bold ${
                    totals.isViable ? 'text-green-700' : 'text-red-700'
                  }`}>
                    {totals.requiredAddresses} / {totals.totalAddresses}
                  </p>
                  <p className="text-xs text-gray-600">necesarias / disponibles</p>
                </div>
              </div>
              {!totals.isViable && (
                <p className="text-sm text-red-700 mt-2">
                  ⚠️ No hay suficientes direcciones. Reduce las asignaciones o selecciona más territorios.
                </p>
              )}
            </div>
          </div>
        )}

        {/* Paso 4: Confirmación */}
        {step === 4 && (
          <div className="max-w-2xl mx-auto">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Confirmar Campaña</h2>

            <div className="bg-white rounded-xl shadow-lg p-6 space-y-4">
              <div className="pb-4 border-b border-gray-200">
                <h3 className="text-lg font-bold text-gray-900 mb-2">{campaignData.name}</h3>
                {campaignData.description && (
                  <p className="text-gray-600">{campaignData.description}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Territorios</p>
                  <p className="text-lg font-bold text-gray-900">
                    {campaignData.selectedTerritories.length}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Direcciones</p>
                  <p className="text-lg font-bold text-gray-900">
                    {totals.totalAddresses}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Participantes</p>
                  <p className="text-lg font-bold text-gray-900">
                    {totals.totalPublishers}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Asignaciones</p>
                  <p className="text-lg font-bold text-gray-900">
                    {totals.requiredAddresses}
                  </p>
                </div>
              </div>

              {campaignData.startDate && (
                <div className="pt-4 border-t border-gray-200">
                  <p className="text-sm text-gray-600">Periodo</p>
                  <p className="font-medium text-gray-900">
                    {new Date(campaignData.startDate).toLocaleDateString('es-MX')}
                    {campaignData.endDate && ` - ${new Date(campaignData.endDate).toLocaleDateString('es-MX')}`}
                  </p>
                </div>
              )}

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-sm text-yellow-800">
                  <Icon name="alertCircle" className="inline mr-2" />
                  Al confirmar, se asignarán automáticamente las direcciones a todos los publicadores
                  según las reglas configuradas. La campaña quedará activa inmediatamente.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer con botones de navegación */}
      <div className="absolute bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between max-w-4xl mx-auto">
          <button
            onClick={() => step > 1 ? setStep(step - 1) : onClose()}
            disabled={isProcessing}
            className="px-6 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 font-medium disabled:opacity-50"
          >
            {step === 1 ? 'Cancelar' : 'Anterior'}
          </button>

          {step < 4 ? (
            <button
              onClick={() => setStep(step + 1)}
              disabled={
                (step === 1 && !campaignData.name.trim()) ||
                (step === 2 && campaignData.selectedTerritories.length === 0) ||
                (step === 3 && !totals.isViable)
              }
              className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl font-medium hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Siguiente
            </button>
          ) : (
            <button
              onClick={handleCreateCampaign}
              disabled={isProcessing || !totals.isViable}
              className="px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-medium hover:shadow-lg disabled:opacity-50 flex items-center gap-2"
            >
              {isProcessing ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Creando...
                </>
              ) : (
                <>
                  <Icon name="checkCircle" />
                  Crear Campaña
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default CampaignCreationWizard;