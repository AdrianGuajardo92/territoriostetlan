import React from 'react';
import Modal from '../common/Modal';

const UpdatesModal = ({ isOpen, onClose }) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Actualizaciones"
      size="md"
    >
      <div className="p-6">
        <p className="text-gray-600">Verificación de actualizaciones en desarrollo...</p>
      </div>
    </Modal>
  );
};

export default UpdatesModal; 