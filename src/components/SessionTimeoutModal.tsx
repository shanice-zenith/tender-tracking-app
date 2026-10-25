import React, { useState, useEffect } from 'react';
import { Clock, ShieldAlert, CheckCircle2, LogOut } from 'lucide-react';

interface SessionTimeoutModalProps {
  isOpen: boolean;
  secondsRemaining: number;
  onExtend: () => void;
  onLogout: () => void;
}

export const SessionTimeoutModal: React.FC<SessionTimeoutModalProps> = ({
  isOpen,
  secondsRemaining,
  onExtend,
  onLogout
}) => {
  if (!isOpen) return null;

  const minutes = Math.floor(secondsRemaining / 60);
  const seconds = secondsRemaining % 60;
  const formattedTime = `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;

  // Progress percentage (out of 5 minutes = 300 seconds)
  const totalWarningSeconds = 300;
  const progressPercent = Math.max(0, Math.min(100, (secondsRemaining / totalWarningSeconds) * 100));

  return (
    <div
      id="session-timeout-backdrop"
      className="fixed inset-0 z-[100] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
    >
      <div
        id="session-timeout-modal"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="session-timeout-title"
        className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-amber-300 overflow-hidden"
      >
        {/* Header */}
        <div className="bg-amber-500 px-6 py-5 text-slate-950 flex items-center gap-3.5">
          <div className="p-2.5 bg-amber-600/30 rounded-xl shadow-inner shrink-0 text-slate-950">
            <Clock className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-950 block">
              Inactivity Safeguard
            </span>
            <h2 id="session-timeout-title" className="text-base sm:text-lg font-extrabold leading-tight">
              Session Inactivity Warning
            </h2>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          <div className="bg-amber-50/80 border border-amber-200 rounded-xl p-3.5 text-center">
            <p className="text-sm font-bold text-amber-950">
              Session expiring in 5 minutes. Would you like to stay signed in?
            </p>
            <p className="text-xs text-amber-800 mt-1">
              You have been inactive for 1 hour and 55 minutes. For corporate data security, your session will automatically end unless extended.
            </p>
          </div>

          {/* Countdown timer pill */}
          <div className="flex flex-col items-center justify-center p-4 bg-slate-50 border border-slate-200 rounded-xl text-center space-y-1.5">
            <span className="text-3xl font-extrabold font-mono text-slate-900 tracking-tight">
              {formattedTime}
            </span>
            <span className="text-[11px] font-semibold text-slate-600">
              Time remaining until automatic logout
            </span>

            {/* Progress bar */}
            <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden mt-2">
              <div
                className="bg-amber-500 h-full transition-all duration-1000 ease-linear rounded-full"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          {/* Actions */}
          <div className="pt-2 flex flex-col-reverse sm:flex-row items-center justify-end gap-2.5">
            <button
              type="button"
              id="session-timeout-logout-btn"
              onClick={onLogout}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2.5 text-xs font-semibold text-slate-600 hover:text-rose-700 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              <span>Sign Out Now</span>
            </button>
            <button
              type="button"
              id="session-timeout-extend-btn"
              onClick={onExtend}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 text-xs font-extrabold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 rounded-xl shadow-md transition-colors cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Keep Me Signed In</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
