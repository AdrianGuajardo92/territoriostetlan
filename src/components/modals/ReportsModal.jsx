// CORRECCIÓN: Usar SystemReportsModal que ya está completamente funcional
import SystemReportsModal from './SystemReportsModal';

const ReportsModal = ({ isOpen, onClose }) => {
  return (
    <SystemReportsModal 
      isOpen={isOpen} 
      onClose={onClose} 
      modalId="reports-modal-admin"
    />
  );
};

export default ReportsModal; 