import { useEffect } from 'react';

/**
 * Ferme un modal/drawer/overlay à l'appui sur Échap.
 * Usage : useEscapeKey(isOpen, onClose)
 */
export function useEscapeKey(isActive, onClose) {
  useEffect(() => {
    if (!isActive) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isActive, onClose]);
}
