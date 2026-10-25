import React, { useEffect } from 'react';
import { AlertTriangle, Trash2, X, AlertCircle } from 'lucide-react';

export interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  description?: string;
  details?: React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  confirmVariant?: 'danger' | 'warning' | 'primary';
  onConfirm: () => void;
  onClose: () => void;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  title,
  description,
  details,
  confirmText = 'Delete',
  cancelText = 'Cancel',
  confirmVariant = 'danger',
  onConfirm,
  onClose,
}) => {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const isDanger = confirmVariant === 'danger';
  const isWarning = confirmVariant === 'warning';

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div 
        className="bg-white w-full max-w-md rounded-2xl border border-slate-200 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className={`px-6 py-4 flex items-center justify-between border-b ${
          isDanger ? 'bg-rose-50 border-rose-100 text-rose-950' : isWarning ? 'bg-amber-50 border-amber-100 text-amber-950' : 'bg-slate-50 border-slate-200 text-slate-900'
        }`}>
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-xl shrink-0 ${
              isDanger ? 'bg-rose-600 text-white' : isWarning ? 'bg-amber-500 text-white' : 'bg-blue-600 text-white'
            }`}>
              {isDanger ? <Trash2 className="w-5 h-5" /> : isWarning ? <AlertTriangle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="font-extrabold text-base leading-tight">
                {title}
              </h3>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-white/60 rounded-xl transition-colors cursor-pointer"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4 text-xs text-slate-600">
          {description && (
            <p className="text-sm text-slate-700 leading-relaxed font-medium">
              {description}
            </p>
          )}

          {details && (
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
              {details}
            </div>
          )}

          {isDanger && (
            <p className="text-[11px] text-rose-600 font-semibold flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
              <span>This action is permanent and cannot be undone.</span>
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-200 bg-white border border-slate-300 rounded-xl transition-colors cursor-pointer"
          >
            {cancelText}
          </button>
          <button
            type="button"
            id="confirm-modal-action-btn"
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className={`px-5 py-2 text-xs font-extrabold text-white rounded-xl shadow-xs transition-colors cursor-pointer flex items-center gap-1.5 ${
              isDanger 
                ? 'bg-rose-600 hover:bg-rose-700 focus:ring-2 focus:ring-rose-500' 
                : isWarning 
                ? 'bg-amber-600 hover:bg-amber-700 focus:ring-2 focus:ring-amber-500'
                : 'bg-blue-600 hover:bg-blue-700 focus:ring-2 focus:ring-blue-500'
            }`}
          >
            {isDanger && <Trash2 className="w-3.5 h-3.5" />}
            <span>{confirmText}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
