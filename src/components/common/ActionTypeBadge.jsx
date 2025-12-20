import React from 'react';
import Icon from './Icon';

const actionTypeConfig = {
  add: {
    label: 'AGREGAR',
    color: 'bg-slate-100 text-slate-700 border-slate-300',
    icon: 'plus'
  },
  modify: {
    label: 'MODIFICAR',
    color: 'bg-slate-100 text-slate-700 border-slate-300',
    icon: 'edit'
  },
  delete: {
    label: 'ELIMINAR',
    color: 'bg-slate-100 text-slate-700 border-slate-300',
    icon: 'trash'
  },
  status: {
    label: 'ACTUALIZAR ESTADO',
    color: 'bg-slate-100 text-slate-700 border-slate-300',
    icon: 'refreshCw'
  }
};

// Función helper para obtener actionType con fallback para propuestas antiguas
export const getActionType = (proposal) => {
  if (proposal.actionType) return proposal.actionType;
  // Fallback para propuestas antiguas sin actionType
  return proposal.type === 'new' ? 'add' : 'modify';
};

const ActionTypeBadge = ({ actionType, size = 'md' }) => {
  const config = actionTypeConfig[actionType] || actionTypeConfig.modify;

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-xs',
    lg: 'px-3 py-1.5 text-sm'
  };

  const iconSizes = {
    sm: 12,
    md: 14,
    lg: 16
  };

  return (
    <span
      className={`inline-flex items-center gap-1 font-semibold rounded-full border ${config.color} ${sizeClasses[size]}`}
    >
      <Icon name={config.icon} size={iconSizes[size]} />
      {config.label}
    </span>
  );
};

export default ActionTypeBadge;
