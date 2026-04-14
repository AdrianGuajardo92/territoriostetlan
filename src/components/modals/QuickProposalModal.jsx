import React, { useState, useEffect } from 'react';
import Modal from '../common/Modal';
import { useApp } from '../../context/AppContext';

const QuickProposalModal = ({
  isOpen,
  onClose,
  modalId = 'quick-proposal-modal'
}) => {
  const { handleProposeQuickAddress } = useApp();

  const [formData, setFormData] = useState({
    address: '',
    notes: '',
    entreCalles: '',
    gender: 'Hombre'
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setFormData({
        address: '',
        notes: '',
        entreCalles: '',
        gender: 'Hombre'
      });
    }
  }, [isOpen]);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.address.trim() || !formData.notes.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const payload = {
        address: formData.address.trim(),
        notes: formData.notes.trim(),
        gender: formData.gender
      };
      if (formData.entreCalles.trim()) payload.entreCalles = formData.entreCalles.trim();

      await handleProposeQuickAddress(payload);
      onClose();
    } catch (err) {
      console.error('[QuickProposalModal] submit error', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) onClose();
  };

  const canSubmit = formData.address.trim() && formData.notes.trim() && !isSubmitting;

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title=""
      size="responsive-large"
      showCloseButton={false}
      closeOnBackdrop={!isSubmitting}
      closeOnEscape={!isSubmitting}
      modalId={modalId}
      animation="slide-left"
    >
      <div className="flex flex-col h-full sm:h-[85vh]">
        {/* Header */}
        <div className="px-5 py-4 flex-shrink-0 bg-slate-800">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-white">Propuesta rápida</h2>
            <button
              onClick={handleClose}
              disabled={isSubmitting}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="Cerrar"
            >
              <i className="fas fa-times text-white/80 text-sm"></i>
            </button>
          </div>
        </div>

        {/* Contenido */}
        <div className="flex-1 overflow-y-auto bg-gray-50 min-h-0">
          <form id="quick-proposal-form" onSubmit={handleSubmit} className="px-4 py-4">
            <div className="space-y-4 max-w-2xl mx-auto">
              {/* Info banner */}
              <p className="text-xs text-gray-500 leading-relaxed px-1">
                Tu propuesta se enviará para revisión. Un administrador asignará el territorio correspondiente al aprobarla.
              </p>

              {/* Card única con todas las secciones */}
              <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
                {/* Dirección */}
                <div className="p-5 space-y-4">
                  <h3 className="text-[11px] font-semibold uppercase tracking-wider text-gray-500 flex items-center gap-1.5">
                    <i className="fas fa-location-dot text-slate-600"></i>
                    Nueva dirección
                  </h3>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1.5 flex items-center gap-1.5">
                      <i className="fas fa-map-pin text-slate-500 text-[13px]"></i>
                      Dirección <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.address}
                      onChange={(e) => handleInputChange('address', e.target.value)}
                      className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-slate-400 focus:border-slate-400 text-sm transition-colors"
                      placeholder="Ej: Calle Principal #123"
                      required
                      disabled={isSubmitting}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1.5 flex items-center gap-1.5">
                      <i className="fas fa-road text-slate-500 text-[13px]"></i>
                      Entre calles <span className="text-gray-400 font-normal">(opcional)</span>
                    </label>
                    <input
                      type="text"
                      value={formData.entreCalles}
                      onChange={(e) => handleInputChange('entreCalles', e.target.value)}
                      className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-slate-400 focus:border-slate-400 text-sm transition-colors"
                      placeholder="Ej: Entre Av. Reforma y Calle Juárez"
                      disabled={isSubmitting}
                    />
                  </div>
                </div>

                {/* Nota */}
                <div className="p-5 space-y-3">
                  <h3 className="text-[11px] font-semibold uppercase tracking-wider text-gray-500 flex items-center gap-1.5">
                    <i className="fas fa-pen-to-square text-slate-600"></i>
                    Nota <span className="text-red-500 normal-case tracking-normal">*</span>
                  </h3>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => handleInputChange('notes', e.target.value)}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-slate-400 focus:border-slate-400 text-sm transition-colors resize-none"
                    rows="4"
                    placeholder="Información sobre la persona, horarios, referencia del lugar…"
                    required
                    disabled={isSubmitting}
                  />
                </div>

                {/* Género */}
                <div className="p-5 space-y-3">
                  <h3 className="text-[11px] font-semibold uppercase tracking-wider text-gray-500 flex items-center gap-1.5">
                    <i className="fas fa-user text-slate-600"></i>
                    Género del contacto
                  </h3>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { value: 'Hombre', icon: 'fa-person' },
                      { value: 'Mujer', icon: 'fa-person-dress' }
                    ].map(option => {
                      const isSelected = formData.gender === option.value;
                      return (
                        <label
                          key={option.value}
                          className={`flex items-center justify-center gap-2 py-3 border rounded-lg cursor-pointer transition-all ${
                            isSelected
                              ? 'bg-slate-800 text-white border-slate-800 shadow-sm'
                              : 'bg-white text-gray-700 border-gray-200 hover:border-gray-400'
                          }`}
                        >
                          <input
                            type="radio"
                            name="gender"
                            value={option.value}
                            checked={isSelected}
                            onChange={(e) => handleInputChange('gender', e.target.value)}
                            className="sr-only"
                            disabled={isSubmitting}
                          />
                          <i className={`fas ${option.icon} text-base`}></i>
                          <span className="text-sm font-medium">{option.value}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              </div>

            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-white border-t border-gray-200 flex-shrink-0">
          <div className="flex items-center justify-end gap-2 max-w-2xl mx-auto">
            <button
              type="button"
              onClick={handleClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-medium text-gray-600 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              form="quick-proposal-form"
              disabled={!canSubmit}
              className={`inline-flex items-center gap-1.5 px-5 py-2 text-sm font-semibold text-white rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                canSubmit ? 'bg-slate-800 hover:bg-slate-900' : 'bg-gray-400'
              }`}
            >
              {isSubmitting ? (
                <>
                  <i className="fas fa-spinner fa-spin text-xs"></i>
                  <span>Enviando…</span>
                </>
              ) : (
                <>
                  <i className="fas fa-paper-plane text-xs"></i>
                  <span>Enviar</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default QuickProposalModal;
