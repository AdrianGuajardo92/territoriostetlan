import React from 'react';
import ReactDOM from 'react-dom';
import ArchivedAddresses from './ArchivedAddresses';

const ArchivedAddressesPortal = ({ onClose }) => {
  // Crear el portal que renderiza directamente en el body
  return ReactDOM.createPortal(
    <ArchivedAddresses onClose={onClose} />,
    document.body
  );
};

export default ArchivedAddressesPortal;