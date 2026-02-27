/**
 * Modal - Composant modal réutilisable
 * Palette picpec-* respectée
 */
import type { ReactNode } from 'react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  footer?: ReactNode;
}

export default function Modal({ isOpen, onClose, title, children, footer }: ModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/50 transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div
          className="relative bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {title && (
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-picpec-dark">{title}</h2>
              <button
                type="button"
                onClick={onClose}
                className="px-2 py-1 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
                aria-label="Fermer"
              >
                ✕
              </button>
            </div>
          )}
          <div className="px-6 py-4 overflow-y-auto max-h-[60vh]">{children}</div>
          {footer && (
            <div className="px-6 py-4 border-t border-gray-100 bg-gray-50">
              {footer}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
