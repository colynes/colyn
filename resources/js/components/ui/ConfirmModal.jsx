import React from 'react';
import Button from './Button';
import { AlertTriangle, X } from 'lucide-react';

export default function ConfirmModal({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title = "Confirm Action", 
  message = "Are you sure you want to proceed?",
  confirmText = "Confirm",
  cancelText = "Cancel",
  type = "danger" // danger, warning, primary
}) {
  if (!isOpen) return null;

  const iconColors = {
    danger: 'text-[var(--color-status-danger)] bg-red-100',
    warning: 'text-[var(--color-status-warning)] bg-amber-100',
    primary: 'text-[var(--color-brand-emerald)] bg-[var(--color-brand-light)]'
  };

  const buttonVariants = {
    danger: 'danger',
    warning: 'primary',
    primary: 'emerald'
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity" 
        onClick={onClose}
      />

      {/* Modal panel */}
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden transform transition-all p-6">
        <div className="absolute top-4 right-4">
          <button onClick={onClose} className="text-gray-400 hover:text-gray-500 focus:outline-none">
            <X size={20} />
          </button>
        </div>

        <div className="sm:flex sm:items-start">
          <div className={`mx-auto flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full sm:mx-0 sm:h-10 sm:w-10 ${iconColors[type]}`}>
            <AlertTriangle className="h-6 w-6" aria-hidden="true" />
          </div>
          <div className="mt-3 text-center sm:ml-4 sm:mt-0 sm:text-left">
            <h3 className="text-lg font-semibold leading-6 text-gray-900" id="modal-title">
              {title}
            </h3>
            <div className="mt-2">
              <p className="text-sm text-gray-500">
                {message}
              </p>
            </div>
          </div>
        </div>

        <div className="mt-6 sm:mt-5 sm:flex sm:flex-row-reverse sm:gap-3">
          <Button 
            variant={buttonVariants[type]} 
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className="w-full sm:w-auto"
          >
            {confirmText}
          </Button>
          <Button 
            variant="outline" 
            onClick={onClose}
            className="mt-3 w-full sm:mt-0 sm:w-auto"
          >
            {cancelText}
          </Button>
        </div>
      </div>
    </div>
  );
}
