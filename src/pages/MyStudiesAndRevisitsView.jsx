import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { useToast } from '../hooks/useToast';
import AddressCard from '../components/addresses/AddressCard';
import Icon from '../components/common/Icon';
import ConfirmDialog from '../components/common/ConfirmDialog';

const MyStudiesAndRevisitsView = ({ onBack }) => {
  const { currentUser, addresses, territories, handleUpdateAddress } = useApp();
  const { showToast } = useToast();
  const [filter, setFilter] = useState('studies'); // 'studies', 'revisits'
  const [confirmDialog, setConfirmDialog] = useState({ isOpen: false, address: null, type: null });

  // Filtrar y procesar las direcciones confirmadas del usuario
  const { studies, revisits, totalItems } = useMemo(() => {
    if (!currentUser) return { studies: [], revisits: [], totalItems: 0 };

    const myStudies = [];
    const myRevisitsMap = new Map();

    addresses.forEach(addr => {
      const isMyStudy = addr.isEstudio && addr.estudioBy === currentUser.name;
      const isMyRevisit = addr.isRevisita && addr.revisitaBy === currentUser.name;

      if (isMyStudy) {
        myStudies.push(addr);
        // Si también es revisita del mismo usuario, no la agregamos a revisitas
        if (myRevisitsMap.has(addr.id)) {
          myRevisitsMap.delete(addr.id);
        }
      } else if (isMyRevisit) {
        // Solo agregar a revisitas si no está ya en estudios
        if (!myStudies.some(s => s.id === addr.id)) {
          myRevisitsMap.set(addr.id, addr);
        }
      }
    });

    // Agregar información del territorio
    const addTerritoryInfo = (addrList) => addrList.map(addr => ({
      ...addr,
      territoryName: territories.find(t => t.id === addr.territoryId)?.name || 'N/D'
    }));

    const sortedStudies = addTerritoryInfo(myStudies)
      .sort((a, b) => a.address.localeCompare(b.address, 'es', { numeric: true }));
    
    const sortedRevisits = addTerritoryInfo(Array.from(myRevisitsMap.values()))
      .sort((a, b) => a.address.localeCompare(b.address, 'es', { numeric: true }));

    return {
      studies: sortedStudies,
      revisits: sortedRevisits,
      totalItems: sortedStudies.length + sortedRevisits.length
    };
  }, [addresses, territories, currentUser]);

  // Configuración de filtros elegantes
  const filterOptions = [
    { 
      id: 'studies', 
      label: 'Estudios', 
      count: studies.length,
      colors: {
        inactive: 'bg-blue-50 text-blue-600 border-blue-200 hover:bg-blue-100',
        active: 'bg-blue-600 text-white border-blue-600 shadow-lg shadow-blue-200'
      }
    },
    { 
      id: 'revisits', 
      label: 'Revisitas', 
      count: revisits.length,
      colors: {
        inactive: 'bg-purple-50 text-purple-600 border-purple-200 hover:bg-purple-100',
        active: 'bg-purple-600 text-white border-purple-600 shadow-lg shadow-purple-200'
      }
    }
  ];

  // Obtener direcciones según el filtro seleccionado
  const getFilteredAddresses = () => {
    switch (filter) {
      case 'studies':
        return studies;
      case 'revisits':
        return revisits;
      default:
        return studies; // Por defecto mostrar estudios
    }
  };

  const filteredAddresses = getFilteredAddresses();

  // Funciones para liberar direcciones
  const handleReleaseClick = (addressId) => {
    const address = filteredAddresses.find(addr => addr.id === addressId);
    if (!address) return;

    const isStudy = address.isEstudio && address.estudioBy === currentUser.name;
    const isRevisit = address.isRevisita && address.revisitaBy === currentUser.name;
    
    const type = isStudy ? 'study' : 'revisit';
    setConfirmDialog({
      isOpen: true,
      address: address,
      type: type
    });
  };

  const executeRelease = async () => {
    const { address, type } = confirmDialog;
    if (!address || !type) return;

    try {
      const updateData = type === 'study'
        ? { isEstudio: false, estudioBy: '' }
        : { isRevisita: false, revisitaBy: '' };

      // Usar showSuccessToast: false para evitar notificación duplicada
      await handleUpdateAddress(address.id, updateData, { showSuccessToast: false });
      showToast(`Has liberado esta ${type === 'study' ? 'estudio' : 'revisita'} exitosamente.`, 'success');
      setConfirmDialog({ isOpen: false, address: null, type: null });
    } catch (error) {
      console.error('Error al liberar dirección:', error);
      showToast('Error al liberar la dirección.', 'error');
    }
  };

  const cancelRelease = () => {
    setConfirmDialog({ isOpen: false, address: null, type: null });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header más compacto */}
      <div className="shadow-xl px-4 py-3 flex-shrink-0" style={{ backgroundColor: '#2C3E50' }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center backdrop-blur-sm hover:bg-white/20 transition-all"
            >
              <Icon name="arrowLeft" size={16} className="text-white" />
            </button>
            <div>
              <h1 className="text-lg font-bold text-white">Mis Revisitas y Estudios</h1>
              <p className="text-white/70 text-xs">
                {totalItems} asignación{totalItems !== 1 ? 'es' : ''} activa{totalItems !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
          <div className="w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center">
            <Icon name="bookmark" size={18} className="text-white" />
          </div>
        </div>
      </div>

      <div className="max-w-md mx-auto p-4 space-y-4">
        {/* Filtros elegantes (donde estaba el buscador) */}
        <div className="bg-white rounded-2xl p-4 shadow-lg border border-gray-200">
          <div className="grid grid-cols-2 gap-4">
            {filterOptions.map(option => {
              const isActive = filter === option.id;
              const colorClass = isActive ? option.colors.active : option.colors.inactive;
              
              return (
                <button
                  key={option.id}
                  onClick={() => setFilter(option.id)}
                  className={`
                    px-6 py-4 rounded-xl text-center transition-all duration-300 transform hover:scale-[1.02] 
                    font-semibold text-sm border-2 ${colorClass}
                  `}
                >
                  <div className="flex flex-col items-center gap-1">
                    <span className="font-bold text-lg">
                      {option.count || 0}
                    </span>
                    <span className="font-medium">
                      {option.label}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Lista de direcciones o estado vacío */}
        {filteredAddresses.length === 0 ? (
          <div className="flex items-center justify-center py-16">
            <div className="text-center max-w-md">
              <div className={`w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl ${
                filter === 'studies' ? 'bg-gradient-to-br from-blue-100 to-blue-200' : 'bg-gradient-to-br from-purple-100 to-purple-200'
              }`}>
                <span className="text-4xl">
                  {filter === 'studies' ? '📖' : '🔖'}
                </span>
              </div>
              <h4 className="text-2xl font-bold text-gray-800 mb-3">
                {filter === 'studies' ? 'Sin estudios asignados' : 'Sin revisitas asignadas'}
              </h4>
                              <p className="text-gray-600 leading-relaxed">
                  Las direcciones aparecerán aquí una vez que el administrador apruebe tus propuestas de {filter === 'studies' ? 'estudios' : 'revisitas'}.
                </p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredAddresses.map(address => (
              <AddressCard 
                key={address.id} 
                address={address} 
                viewMode="navigation-only"
                showActions={false}
                onUnmark={handleReleaseClick}
              />
            ))}
          </div>
        )}
      </div>

      {/* Modal de confirmación para liberar */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        onConfirm={executeRelease}
        onClose={cancelRelease}
        title={`¿Liberar ${confirmDialog.type === 'study' ? 'Estudio' : 'Revisita'}?`}
        message={`¿Estás seguro de que quieres liberar esta dirección de tu lista de ${confirmDialog.type === 'study' ? 'estudios' : 'revisitas'}? La dirección quedará disponible para otros usuarios.`}
        confirmText="Sí, liberar"
        cancelText="Cancelar"
        type="warning"
      />
    </div>
  );
};

export default MyStudiesAndRevisitsView; 