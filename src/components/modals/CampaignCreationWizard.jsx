import React, { useState, useEffect } from 'react';
import Icon from '../common/Icon';
import { useApp } from '../../context/AppContext';
import { useToast } from '../../hooks/useToast';

const CampaignCreationWizard = ({ isOpen, onClose, onComplete }) => {
  const { territories, addresses, users, createCampaign, currentUser } = useApp();
  const { showToast } = useToast();
  
  const [step, setStep] = useState(1); // 1: Info básica, 2: Reglas, 3: Confirmación
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Datos de la campaña
  const [campaignData, setCampaignData] = useState({
    name: '',
    description: '',
    selectedTerritories: [], // Se llenará automáticamente con todos los territorios
    defaultAddressCount: 2,
    exceptions: [], // Array de {userId, addressCount}
    startDate: new Date().toISOString().split('T')[0],
    endDate: ''
  });

  // Estado para búsqueda de usuarios en excepciones
  const [userSearch, setUserSearch] = useState('');
  const [showUserDropdown, setShowUserDropdown] = useState(false);

  // Al montar el componente, seleccionar todos los territorios automáticamente
  useEffect(() => {
    if (territories.length > 0 && campaignData.selectedTerritories.length === 0) {
      setCampaignData(prev => ({
        ...prev,
        selectedTerritories: territories.map(t => t.id)
      }));
    }
  }, [territories]);

  // Calcular totales con distribución equitativa
  const calculateTotals = () => {
    // Usar todos los territorios siempre
    const allTerritoryIds = territories.map(t => t.id);
    const totalAddresses = addresses.filter(addr => 
      allTerritoryIds.includes(addr.territoryId)
    ).length;

    // Publicadores (excluir administradores)
    const publishers = users.filter(u => u.role !== 'admin');
    
    // Calcular distribución equitativa
    const exceptionsCount = campaignData.exceptions.length;
    const regularPublishers = publishers.length - exceptionsCount;
    
    // Direcciones después de asignar 1 a cada excepción
    const addressesAfterExceptions = totalAddresses - exceptionsCount;
    
    // Calcular cuántas direcciones recibirá cada publicador regular
    const addressesPerRegular = regularPublishers > 0 
      ? Math.floor(addressesAfterExceptions / regularPublishers)
      : 0;
    
    // Direcciones sobrantes que se distribuirán
    const remainingAddresses = regularPublishers > 0
      ? addressesAfterExceptions % regularPublishers
      : 0;

    return {
      totalAddresses,
      totalPublishers: publishers.length,
      exceptionsCount,
      regularPublishers,
      addressesPerRegular,
      remainingAddresses,
      isViable: totalAddresses >= publishers.length // Al menos 1 dirección por publicador
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

      if (!totals.isViable) {
        showToast('No hay suficientes direcciones para completar las asignaciones', 'error');
        setIsProcessing(false);
        return;
      }

      // Obtener TODAS las direcciones de TODOS los territorios
      const allTerritoryIds = territories.map(t => t.id);
      let availableAddresses = addresses.filter(addr => 
        allTerritoryIds.includes(addr.territoryId)
      );
      
      // ALEATORIZAR COMPLETAMENTE todas las direcciones disponibles
      availableAddresses = availableAddresses.sort(() => Math.random() - 0.5);

      // Agrupar direcciones por territorio (solo para referencia, no para ordenar)
      const addressesByTerritory = {};
      availableAddresses.forEach(addr => {
        if (!addressesByTerritory[addr.territoryId]) {
          addressesByTerritory[addr.territoryId] = [];
        }
        addressesByTerritory[addr.territoryId].push(addr);
      });

      // Obtener TODOS los usuarios (publicadores + administradores)
      const allUsers = users; // Usar TODOS los usuarios para las campañas

      // Separar usuarios con excepción y regulares
      const exceptionUsers = allUsers.filter(u => 
        campaignData.exceptions.some(e => e.userId === u.id)
      );
      let regularUsers = allUsers.filter(u => 
        !campaignData.exceptions.some(e => e.userId === u.id)
      );
      
      // ALEATORIZAR completamente el orden de los usuarios regulares
      regularUsers = regularUsers.sort(() => Math.random() - 0.5);

      // Crear asignaciones
      const assignments = [];
      const usedAddresses = new Set();

      // PASO 1: Asignar 1 dirección a cada usuario con excepción
      let addressIndex = 0;
      for (const user of exceptionUsers) {
        const assignedAddress = [];
        
        // Tomar la siguiente dirección disponible del array aleatorizado
        if (addressIndex < availableAddresses.length) {
          assignedAddress.push(availableAddresses[addressIndex].id);
          usedAddresses.add(availableAddresses[addressIndex].id);
          addressIndex++;
        }

        assignments.push({
          userId: user.id,
          userName: user.name,
          addressCount: assignedAddress.length,
          addressIds: assignedAddress,
          completed: false,
          completedCount: 0
        });
      }

      // PASO 2: Distribución equitativa para usuarios regulares
      const remainingAddresses = availableAddresses.slice(addressIndex); // Continuar desde donde quedamos
      const addressesPerRegular = Math.floor(remainingAddresses.length / regularUsers.length);
      const extraAddresses = remainingAddresses.length % regularUsers.length;
      
      // ALEATORIZAR qué usuarios reciben direcciones extras
      const usersReceivingExtra = new Set();
      const randomIndexes = [...Array(regularUsers.length).keys()].sort(() => Math.random() - 0.5);
      for (let i = 0; i < extraAddresses; i++) {
        usersReceivingExtra.add(randomIndexes[i]);
      }

      // Asignar direcciones a usuarios regulares de forma COMPLETAMENTE ALEATORIA
      let currentAddressIndex = 0;
      regularUsers.forEach((user, index) => {
        const baseCount = addressesPerRegular;
        const extraCount = usersReceivingExtra.has(index) ? 1 : 0;
        const totalCount = baseCount + extraCount;
        
        const assignedAddresses = [];
        
        // Simplemente tomar las siguientes N direcciones del array aleatorizado
        for (let i = 0; i < totalCount && currentAddressIndex < remainingAddresses.length; i++) {
          assignedAddresses.push(remainingAddresses[currentAddressIndex].id);
          currentAddressIndex++;
        }

        assignments.push({
          userId: user.id,
          userName: user.name,
          addressCount: assignedAddresses.length,
          addressIds: assignedAddresses,
          completed: false,
          completedCount: 0
        });
      });

      // Crear objeto de campaña
      const newCampaign = {
        name: campaignData.name,
        description: campaignData.description,
        territories: allTerritoryIds, // Usar todos los territorios
        totalAddresses: availableAddresses.length,
        assignments,
        status: 'active',
        createdAt: new Date().toISOString(),
        createdBy: currentUser?.id,
        startDate: campaignData.startDate,
        endDate: campaignData.endDate,
        rules: {
          distributionType: 'equitable', // Distribución equitativa automática
          exceptions: campaignData.exceptions
        }
      };

      // Llamar a la función del contexto
      await createCampaign(newCampaign);
      
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
                <p className="text-white/80 text-sm">Paso {step} de 3</p>
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
            {[1, 2, 3].map(s => (
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

        {/* Paso 2: Reglas de asignación */}
        {step === 2 && (
          <div className="max-w-3xl mx-auto">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Reglas de Asignación</h2>

            {/* Información sobre territorios */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
              <p className="text-sm text-blue-800">
                <Icon name="info" className="inline mr-2" />
                Se utilizarán <span className="font-bold">todos los {territories.length} territorios</span> disponibles 
                con un total de <span className="font-bold">{totals.totalAddresses} direcciones</span> para esta campaña.
              </p>
            </div>

            {/* Sistema de Asignación Automática */}
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl shadow-lg p-6 mb-6 border border-green-200">
              <h3 className="text-lg font-bold text-gray-900 mb-3">Sistema de Asignación Automática</h3>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-white font-bold text-sm">1</span>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Distribución Equitativa y Aleatoria</p>
                    <p className="text-sm text-gray-600">
                      El sistema distribuirá automáticamente las direcciones de manera equitativa y completamente aleatoria entre TODOS los usuarios (publicadores y administradores).
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-white font-bold text-sm">2</span>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Asignación Completamente Aleatoria</p>
                    <p className="text-sm text-gray-600">
                      Las direcciones se asignarán de forma totalmente aleatoria para garantizar la máxima equidad en la distribución.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Icon name="info" className="text-white text-sm" />
                  </div>
                  <div>
                    <p className="text-sm text-blue-800 bg-blue-50 rounded-lg p-2">
                      La mayoría recibirá aproximadamente 2 direcciones, pero el número exacto dependerá del total disponible.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Excepciones */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Excepciones Especiales</h3>
              <p className="text-sm text-gray-600 mb-4">
                Publicadores que recibirán <span className="font-semibold">solo 1 dirección</span> debido a circunstancias especiales
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
                    <div key={exception.userId} className="flex items-center justify-between p-3 bg-orange-50 rounded-lg border border-orange-200">
                      <div className="flex items-center gap-3">
                        <Icon name="user" className="text-orange-500" />
                        <span className="font-medium text-gray-900">{exception.userName}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="inline-flex items-center px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-sm font-medium">
                          1 dirección
                        </span>
                        <button
                          onClick={() => removeException(exception.userId)}
                          className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                          title="Eliminar excepción"
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
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-gray-700">Resumen de Distribución</p>
                  <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                    totals.isViable ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                  }`}>
                    {totals.isViable ? '✓ Viable' : '✗ No viable'}
                  </span>
                </div>
                
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-600">Total de direcciones:</p>
                    <p className="font-bold text-gray-900">{totals.totalAddresses}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Total de publicadores:</p>
                    <p className="font-bold text-gray-900">{totals.totalPublishers}</p>
                  </div>
                  {totals.exceptionsCount > 0 && (
                    <div>
                      <p className="text-gray-600">Con excepción (1 dir.):</p>
                      <p className="font-bold text-orange-700">{totals.exceptionsCount}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-gray-600">Publicadores regulares:</p>
                    <p className="font-bold text-gray-900">{totals.regularPublishers}</p>
                  </div>
                </div>
                
                {totals.isViable && totals.regularPublishers > 0 && (
                  <div className="pt-3 border-t border-green-200">
                    <p className="text-sm text-green-800">
                      <Icon name="checkCircle" className="inline mr-1" />
                      Cada publicador regular recibirá aproximadamente <span className="font-bold">{totals.addressesPerRegular}</span> direcciones
                      {totals.remainingAddresses > 0 && (
                        <span className="block mt-1 text-xs">
                          ({totals.remainingAddresses} publicadores recibirán 1 dirección adicional)
                        </span>
                      )}
                    </p>
                  </div>
                )}
                
                {!totals.isViable && (
                  <p className="text-sm text-red-700">
                    ⚠️ No hay suficientes direcciones. Se necesita al menos 1 dirección por publicador.
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Paso 3: Confirmación */}
        {step === 3 && (
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
                    {territories.length} (Todos)
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

          {step < 3 ? (
            <button
              onClick={() => setStep(step + 1)}
              disabled={
                (step === 1 && !campaignData.name.trim()) ||
                (step === 2 && !totals.isViable)
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