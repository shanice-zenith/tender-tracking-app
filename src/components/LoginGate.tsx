import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  ShieldCheck, 
  ShieldAlert, 
  Lock, 
  Loader2, 
  ArrowRight,
  Sparkles,
  FileSpreadsheet,
  CheckCircle2
} from 'lucide-react';
import { googleAuthService, ALLOWED_DOMAIN } from '../services/googleAuthService';
import { GoogleUserProfile } from '../types';

interface LoginGateProps {
  onLoginSuccess: (user: GoogleUserProfile, token?: string) => void;
  initialDeniedEmail?: string | null;
}

export const LoginGate: React.FC<LoginGateProps> = ({
  onLoginSuccess,
  initialDeniedEmail = null
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [accessDeniedEmail, setAccessDeniedEmail] = useState<string | null>(initialDeniedEmail);

  // Listen for access denied events dispatched by auth service
  useEffect(() => {
    const handleAccessDenied = (e: Event) => {
      const customEvent = e as CustomEvent<{ attemptedEmail?: string }>;
      setAccessDeniedEmail(customEvent.detail?.attemptedEmail || 'Unknown Account');
    };

    window.addEventListener('zenith_auth_access_denied', handleAccessDenied);
    return () => {
      window.removeEventListener('zenith_auth_access_denied', handleAccessDenied);
    };
  }, []);

  const handleSignIn = async () => {
    setIsLoading(true);
    setAccessDeniedEmail(null);

    try {
      const result = await googleAuthService.signInWithGoogle();
      
      // If user closed or cancelled popup window, result is null; handled gracefully with no error banner
      if (!result) {
        setIsLoading(false);
        return;
      }

      onLoginSuccess(result.user, result.accessToken);
    } catch (err: any) {
      console.warn('Sign-in caught error:', err);
      // If domain is not authorized
      if (err?.code === 'auth/domain-access-denied' || err?.message?.includes('Access Denied')) {
        const attempted = err?.attemptedEmail || 'external account';
        setAccessDeniedEmail(attempted);
      }
      // Note: popup cancellations (popup-closed-by-user) were caught and handled gracefully in signInWithGoogle
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div 
      id="zenith-login-gate"
      className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between selection:bg-blue-600 selection:text-white relative overflow-hidden"
    >
      {/* Background ambient lighting accents */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-96 bg-gradient-to-b from-blue-900/20 via-slate-950/5 to-transparent blur-3xl pointer-events-none -z-10" />
      <div className="absolute -bottom-32 left-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none -z-10" />

      {/* Top Header Bar */}
      <header className="w-full max-w-6xl mx-auto px-6 py-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-blue-400 shadow-inner">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-black tracking-widest uppercase text-slate-400">
              The Zenith Group
            </div>
            <div className="text-[11px] font-medium text-slate-500">
              Estimating & Procurement
            </div>
          </div>
        </div>

        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900 border border-slate-800 text-[11px] font-semibold text-slate-400">
          <Lock className="w-3 h-3 text-slate-400" />
          <span>Restricted Portal</span>
        </div>
      </header>

      {/* Main Login Card Centered */}
      <main className="w-full max-w-lg mx-auto px-4 py-8 flex flex-col items-center">
        <div className="w-full bg-slate-900/90 backdrop-blur-xl border border-slate-800/90 rounded-2xl p-8 sm:p-10 shadow-2xl relative">
          
          {/* Top Logo / Shield Badge */}
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-b from-blue-600 to-blue-800 p-0.5 shadow-xl shadow-blue-900/30 flex items-center justify-center">
              <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center text-blue-400">
                <Building2 className="w-8 h-8 text-blue-400" />
              </div>
            </div>
          </div>

          {/* Title & Description */}
          <div className="text-center mb-8">
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight leading-snug mb-2">
              Zenith Tender Management - Internal Portal
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 leading-relaxed max-w-sm mx-auto">
              Confidential Estimating, Subtrade Procurement & Tender Package Distribution System
            </p>
          </div>

          {/* Warning Card: Access Denied for Non-@thezenithgroup.ca Accounts */}
          {accessDeniedEmail && (
            <div 
              id="login-access-denied-card"
              role="alert"
              className="mb-6 p-4 rounded-xl bg-rose-950/50 border border-rose-600/60 text-left animate-in fade-in zoom-in-95 duration-200"
            >
              <div className="flex items-start gap-3">
                <div className="p-2 bg-rose-900/60 rounded-lg text-rose-300 shrink-0 mt-0.5">
                  <ShieldAlert className="w-5 h-5 text-rose-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="text-xs sm:text-sm font-bold text-rose-200">
                    Access Denied: Only @thezenithgroup.ca accounts are authorized.
                  </h2>
                  <p className="text-[11px] text-rose-300/90 mt-1 leading-relaxed">
                    This portal contains confidential contractor bidding rates and corporate budget allocations. Access is strictly locked to verified <strong className="text-white">@thezenithgroup.ca</strong> Google Workspace accounts.
                  </p>
                  {accessDeniedEmail && (
                    <div className="mt-2 text-[10px] font-mono bg-rose-900/40 text-rose-200 px-2 py-1 rounded border border-rose-800/60 truncate">
                      Attempted: {accessDeniedEmail}
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={handleSignIn}
                    className="mt-3 inline-flex items-center gap-1.5 text-xs font-bold text-rose-200 hover:text-white bg-rose-800/60 hover:bg-rose-700/80 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
                  >
                    <span>Switch to @thezenithgroup.ca Account</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Prominent Google Sign-In Button */}
          <div className="space-y-4">
            <button
              type="button"
              id="zenith-google-login-btn"
              onClick={handleSignIn}
              disabled={isLoading}
              className="w-full group relative flex items-center justify-center gap-3 px-6 py-3.5 rounded-xl bg-white hover:bg-slate-100 active:bg-slate-200 text-slate-900 font-bold text-sm shadow-lg hover:shadow-xl transition-all duration-150 cursor-pointer disabled:opacity-75 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                  <span>Connecting to Google Workspace...</span>
                </>
              ) : (
                <>
                  {/* Google 4-Color Vector Icon */}
                  <svg className="w-5 h-5 shrink-0" viewBox="0 0 48 48">
                    <path
                      fill="#EA4335"
                      d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
                    />
                    <path
                      fill="#4285F4"
                      d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
                    />
                    <path
                      fill="#34A853"
                      d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
                    />
                  </svg>
                  <span className="truncate">Sign In with Google (@{ALLOWED_DOMAIN})</span>
                </>
              )}
            </button>

            {/* Corporate Authentication Note */}
            <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-400 font-medium">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>Domain locked to official <strong>@{ALLOWED_DOMAIN}</strong> accounts</span>
            </div>
          </div>

          {/* Key Enterprise Safeguards List */}
          <div className="mt-8 pt-6 border-t border-slate-800/80 grid grid-cols-1 gap-2.5 text-left text-xs text-slate-400">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-blue-400 shrink-0" />
              <span>Direct Gmail API dispatch for tender invitations & reminders</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-blue-400 shrink-0" />
              <span>Real-time Google Sheets backend synchronization</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-blue-400 shrink-0" />
              <span>2-hour inactivity automatic session protection</span>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full max-w-6xl mx-auto px-6 py-6 text-center text-xs text-slate-500">
        <p>© 2026 The Zenith Group Inc. All rights reserved. Confidential internal system for authorized estimators only.</p>
      </footer>
    </div>
  );
};
