import React from 'react';
import Modal from '../common/Modal';

const InstallModal = ({ isOpen, onClose }) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Instalar Aplicación"
      size="md"
    >
      <div className="p-6">
        <p className="text-gray-600">Instrucciones de instalación en desarrollo...</p>
      </div>
    </Modal>
  );
};

export default InstallModal; 