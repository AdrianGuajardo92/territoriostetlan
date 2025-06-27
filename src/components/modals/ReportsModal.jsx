import React from 'react';
import Modal from '../common/Modal';

const ReportsModal = ({ isOpen, onClose }) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Reportes"
      size="lg"
    >
      <div className="p-6">
        <p className="text-gray-600">Módulo de reportes en desarrollo...</p>
      </div>
    </Modal>
  );
};

export default ReportsModal; 