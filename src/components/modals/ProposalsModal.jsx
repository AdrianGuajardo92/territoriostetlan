import React from 'react';
import Modal from '../common/Modal';

const ProposalsModal = ({ isOpen, onClose }) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Mis Propuestas"
      size="lg"
    >
      <div className="p-6">
        <p className="text-gray-600">Gestión de propuestas en desarrollo...</p>
      </div>
    </Modal>
  );
};

export default ProposalsModal; 