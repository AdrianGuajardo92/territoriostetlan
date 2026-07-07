import React, { useEffect, useMemo, useState } from 'react';
import Modal from '../common/Modal';
import Icon from '../common/Icon';
import { useApp } from '../../context/AppContext';

const normalizeText = (text) =>
  text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

const AssignRevisitaModal = ({
  isOpen,
  onClose,
  onConfirm,
  addressLabel = '',
  currentRevisitaBy = '',
  isProcessing = false,
  modalId = 'assign-revisita-modal'
}) => {
  const { publishers } = useApp();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedName, setSelectedName] = useState('');

  const publisherList = useMemo(
    () => [...publishers].filter((user) => user.role !== 'admin').sort((a, b) => a.name.localeCompare(b.name)),
    [publishers]
  );

  const filteredPublishers = useMemo(() => {
    if (!searchTerm.trim()) return publisherList;
    const query = normalizeText(searchTerm.trim());
    return publisherList.filter((publisher) => normalizeText(publisher.name).includes(query));
  }, [publisherList, searchTerm]);

  useEffect(() => {
    if (isOpen) {
      setSearchTerm('');
      setSelectedName(currentRevisitaBy || '');
    }
  }, [isOpen, currentRevisitaBy]);

  const handleConfirm = () => {
    if (!selectedName.trim()) return;
    onConfirm(selectedName.trim());
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
      size="md"
      showCloseButton={false}
      closeOnBackdrop={!isProcessing}
      closeOnEscape={!isProcessing}
      modalId={modalId}
    >
      <div className="flex flex-col max-h-[80vh]">
        <div className="px-5 py-4 border-b border-gray-100" style={{ backgroundColor: '#2C3E50' }}>
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/20">
                <Icon name="bookmark" size={20} className="text-purple-200" />
              </div>
              <div className="min-w-0">
                <h2 className="text-base font-bold text-white">Asignar revisita</h2>
                {addressLabel && (
                  <p className="truncate text-xs text-white/70">{addressLabel}</p>
                )}
              </div>
            </div>
            <button
              type="button"
              onClick={handleClose}
              disabled={isProcessing}
              className="rounded-lg p-2 transition-colors hover:bg-white/10 disabled:opacity-50"
              aria-label="Cerrar"
            >
              <Icon name="x" size={18} className="text-white" />
            </button>
          </div>
        </div>

        <div className="border-b border-gray-100 px-4 py-3">
          <div className="relative">
            <Icon
              name="search"
              size={16}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              type="text"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Buscar hermano..."
              disabled={isProcessing}
              className="w-full rounded-xl border border-gray-200 py-2.5 pl-9 pr-3 text-sm focus:border-slate-500 focus:outline-none"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-2 py-2">
          {filteredPublishers.length === 0 ? (
            <p className="px-3 py-6 text-center text-sm text-gray-500">No se encontraron publicadores</p>
          ) : (
            <ul className="space-y-1">
              {filteredPublishers.map((publisher) => {
                const isSelected = selectedName === publisher.name;
                return (
                  <li key={publisher.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedName(publisher.name)}
                      disabled={isProcessing}
                      className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors ${
                        isSelected
                          ? 'bg-purple-50 text-purple-900 ring-1 ring-purple-200'
                          : 'hover:bg-gray-50 text-gray-800'
                      }`}
                    >
                      <span
                        className={`flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border-2 ${
                          isSelected ? 'border-purple-600 bg-purple-600' : 'border-gray-300'
                        }`}
                      >
                        {isSelected && <span className="h-2 w-2 rounded-full bg-white" />}
                      </span>
                      <span className="text-sm font-medium">{publisher.name}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="flex justify-end gap-2 border-t border-gray-100 px-4 py-3">
          <button
            type="button"
            onClick={handleClose}
            disabled={isProcessing}
            className="rounded-lg border-2 border-gray-300 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isProcessing || !selectedName.trim()}
            className="inline-flex items-center gap-2 rounded-lg bg-purple-600 px-4 py-2 text-sm font-semibold text-white hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isProcessing ? (
              <>
                <Icon name="loader" size={16} className="animate-spin" />
                Guardando...
              </>
            ) : (
              <>
                <Icon name="bookmark" size={16} />
                Asignar revisita
              </>
            )}
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default AssignRevisitaModal;
