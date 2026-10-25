import React from 'react';
import { ShieldAlert, LogOut, ArrowRight, Lock } from 'lucide-react';

interface AccessDeniedModalProps {
  isOpen: boolean;
  attemptedEmail?: string | null;
  onClose: () => void;
  onRetry: () => void;
}

export const AccessDeniedModal: React.FC<AccessDeniedModalProps> = ({
  isOpen,
  attemptedEmail,
  onClose,
  onRetry
}) => {
  if (!isOpen) return null;

  return (
    <div
      id="access-denied-backdrop"
      className="fixed inset-0 z-[100] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
    >
      <div
        id="access-denied-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="access-denied-title"
        className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-rose-200 overflow-hidden"
      >
        {/* Header with high contrast warning */}
        <div className="bg-rose-600 px-6 py-5 text-white flex items-center gap-3.5">
          <div className="p-2.5 bg-rose-700/80 rounded-xl shadow-inner shrink-0">
            <ShieldAlert className="w-6 h-6 text-rose-100" />
          </div>
          <div>
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-rose-200 block">
              Security Restriction
            </span>
            <h2 id="access-denied-title" className="text-base sm:text-lg font-extrabold leading-tight">
              Access Denied
            </h2>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 text-rose-900 space-y-2">
            <p className="font-bold text-sm">
              Only @thezenithgroup.ca accounts are authorized.
            </p>
            <p className="text-xs text-rose-700 leading-relaxed">
              This tender portal and estimating database contains confidential company pricing and bid specifications.
              {attemptedEmail && (
                <span className="block mt-1 font-mono text-[11px] text-rose-900 bg-rose-100/80 px-2 py-1 rounded">
                  Attempted: {attemptedEmail}
                </span>
              )}
            </p>
          </div>

          <div className="flex items-start gap-2.5 text-xs text-slate-600">
            <Lock className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
            <p>
              Your session was immediately logged out to protect project privacy. Please switch to your official Zenith Group corporate Google account to continue.
            </p>
          </div>

          {/* Action buttons */}
          <div className="pt-2 flex flex-col-reverse sm:flex-row items-center justify-end gap-2.5">
            <button
              type="button"
              id="access-denied-dismiss-btn"
              onClick={onClose}
              className="w-full sm:w-auto px-4 py-2.5 text-xs font-semibold text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            >
              Dismiss
            </button>
            <button
              type="button"
              id="access-denied-retry-btn"
              onClick={onRetry}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 text-xs font-extrabold text-white bg-rose-600 hover:bg-rose-700 active:bg-rose-800 rounded-xl shadow-md transition-colors cursor-pointer"
            >
              <span>Sign In with @thezenithgroup.ca</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
