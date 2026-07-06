import React, { useEffect, useState } from 'react';
import Icon from '../common/Icon';
import { useBackHandler } from '../../hooks/useBackHandler';

const DialogShell = ({
  isOpen,
  onClose,
  backHandlerId,
  children
}) => {
  useBackHandler({ isOpen, onClose, id: backHandlerId });

  if (!isOpen) return null;

  return (
    <div className="absolute inset-0 z-10 flex items-center justify-center bg-white p-6">
      <div className="w-full max-w-sm">
        {children}
      </div>
    </div>
  );
};

export const ArchiveConfirmDialog = ({
  isOpen,
  onClose,
  onConfirm,
  isProcessing = false,
  backHandlerId = 'address-archive-confirm',
  addressLabel = ''
}) => {
  const [reason, setReason] = useState('');

  useEffect(() => {
    if (isOpen) {
      setReason('');
    }
  }, [isOpen]);

  const handleConfirm = () => {
    onConfirm(reason.trim());
  };

  return (
    <DialogShell isOpen={isOpen} onClose={onClose} backHandlerId={backHandlerId}>
      <div className="text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
          <Icon name="trash" size={28} className="text-red-600" />
        </div>
        <h3 className="mb-2 text-lg font-semibold text-slate-800">
          ¿Borrar esta dirección?
        </h3>
        {addressLabel && (
          <p className="mb-2 text-sm font-medium text-slate-700">{addressLabel}</p>
        )}
        <p className="mb-5 text-sm text-slate-600">
          Esta dirección no se borrará por completo. Se archivará en nuestra base de datos
          y podrá consultarse después en{' '}
          <span className="font-semibold">Direcciones Archivadas</span>.
        </p>
      </div>
      <div className="mb-5">
        <label className="mb-2 block text-sm font-medium text-slate-700">
          Razón <span className="font-normal text-slate-500">(obligatorio)</span>
        </label>
        <textarea
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm focus:border-slate-500 focus:outline-none"
          rows={3}
          placeholder="Ej: Falleció, Ya no vive aquí, Se mudó..."
          disabled={isProcessing}
          autoFocus
        />
      </div>
      <div className="flex justify-center gap-3">
        <button
          type="button"
          onClick={onClose}
          disabled={isProcessing}
          className="rounded-lg border-2 border-gray-300 px-4 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50 disabled:opacity-50"
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={handleConfirm}
          disabled={isProcessing || !reason.trim()}
          className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-4 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isProcessing ? (
            <>
              <Icon name="loader" size={14} className="animate-spin" />
              Borrando...
            </>
          ) : (
            <>
              <Icon name="trash" size={14} />
              Borrar dirección
            </>
          )}
        </button>
      </div>
    </DialogShell>
  );
};

export const ArchiveProposalDialog = ({
  isOpen,
  onClose,
  onConfirm,
  isProcessing = false,
  backHandlerId = 'address-archive-proposal',
  addressLabel = ''
}) => {
  const [reason, setReason] = useState('');

  useEffect(() => {
    if (isOpen) {
      setReason('');
    }
  }, [isOpen]);

  return (
    <DialogShell isOpen={isOpen} onClose={onClose} backHandlerId={backHandlerId}>
      <div className="text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
          <Icon name="trash" size={28} className="text-red-600" />
        </div>
        <h3 className="mb-2 text-lg font-semibold text-slate-800">
          Solicitar archivo
        </h3>
        {addressLabel && (
          <p className="mb-2 text-sm font-medium text-slate-700">{addressLabel}</p>
        )}
        <p className="mb-5 text-sm text-slate-600">
          Tu solicitud será revisada por un administrador antes de archivar la dirección.
        </p>
      </div>
      <div className="mb-5">
        <label className="mb-2 block text-sm font-medium text-slate-700">
          Razón <span className="text-red-500">*</span>
        </label>
        <textarea
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm focus:border-red-300 focus:outline-none"
          rows={3}
          placeholder="Ej: Ya no vive aquí, Falleció, Se mudó..."
          disabled={isProcessing}
          autoFocus
        />
      </div>
      <div className="flex justify-center gap-3">
        <button
          type="button"
          onClick={onClose}
          disabled={isProcessing}
          className="rounded-xl border-2 border-gray-300 px-4 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50 disabled:opacity-50"
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={() => onConfirm(reason.trim())}
          disabled={isProcessing || !reason.trim()}
          className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:opacity-50"
        >
          {isProcessing ? (
            <>
              <Icon name="loader" size={16} className="animate-spin" />
              Enviando...
            </>
          ) : (
            'Enviar solicitud'
          )}
        </button>
      </div>
    </DialogShell>
  );
};
