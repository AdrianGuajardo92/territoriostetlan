import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Icon from './Icon';
import { useBackHandler } from '../../hooks/useBackHandler';

const MENU_MIN_WIDTH = 220;
const VIEWPORT_PADDING = 8;

const clampPosition = (x, y, width, height) => {
  const maxX = window.innerWidth - width - VIEWPORT_PADDING;
  const maxY = window.innerHeight - height - VIEWPORT_PADDING;
  return {
    x: Math.max(VIEWPORT_PADDING, Math.min(x, maxX)),
    y: Math.max(VIEWPORT_PADDING, Math.min(y, maxY))
  };
};

/**
 * Menú contextual flotante estilo macOS.
 * @param {Object} props
 * @param {boolean} props.isOpen
 * @param {number} props.x
 * @param {number} props.y
 * @param {() => void} props.onClose
 * @param {string} [props.menuId]
 * @param {Array<{type?: 'separator'|'info'|'action', label?: string, icon?: string, onClick?: () => void, destructive?: boolean, disabled?: boolean}>} props.items
 */
const ContextMenu = ({
  isOpen,
  x,
  y,
  onClose,
  menuId = 'context-menu',
  items = []
}) => {
  const menuRef = useRef(null);
  const suppressHistorySyncRef = useRef(false);
  const [position, setPosition] = useState({ x, y });

  useBackHandler({ isOpen, onClose, id: menuId, suppressHistorySyncRef });

  useLayoutEffect(() => {
    if (!isOpen || !menuRef.current) {
      setPosition({ x, y });
      return;
    }
    const rect = menuRef.current.getBoundingClientRect();
    setPosition(clampPosition(x, y, rect.width || MENU_MIN_WIDTH, rect.height || 120));
  }, [isOpen, x, y, items]);

  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        onClose();
      }
    };

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return createPortal(
    <div
      ref={menuRef}
      role="menu"
      className="fixed z-[10000] min-w-[220px] overflow-hidden rounded-xl border border-gray-200/80 bg-white py-1.5 shadow-2xl"
      style={{ left: position.x, top: position.y }}
      onContextMenu={(event) => event.preventDefault()}
    >
      {items.map((item, index) => {
        if (item.type === 'separator') {
          return <div key={`sep-${index}`} className="my-1 border-t border-gray-200/80" role="separator" />;
        }

        if (item.type === 'info' || item.disabled) {
          return (
            <div
              key={`info-${index}`}
              className="px-3.5 py-2 text-xs text-gray-500 select-none"
              role="presentation"
            >
              {item.label}
            </div>
          );
        }

        return (
          <button
            key={`action-${index}`}
            type="button"
            role="menuitem"
            onClick={() => {
              if (item.opensOverlay) {
                suppressHistorySyncRef.current = true;
              }
              item.onClick?.();
              onClose();
            }}
            className={`flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-sm transition-colors ${
              item.destructive
                ? 'text-red-600 hover:bg-red-50'
                : 'text-gray-800 hover:bg-gray-100'
            }`}
          >
            {item.icon && (
              <Icon
                name={item.icon}
                size={16}
                className={item.destructive ? 'text-red-500' : 'text-gray-500'}
              />
            )}
            <span className="font-medium">{item.label}</span>
          </button>
        );
      })}
    </div>,
    document.body
  );
};

export default ContextMenu;
