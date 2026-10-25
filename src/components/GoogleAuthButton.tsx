import React, { useState, useEffect } from 'react';
import { LogOut, CheckCircle2, ShieldCheck, Mail, Loader2, AlertCircle } from 'lucide-react';
import { googleAuthService } from '../services/googleAuthService';
import { GoogleUserProfile } from '../types';

export interface GoogleAuthButtonProps {
  user?: GoogleUserProfile | null;
  hasToken?: boolean;
  domain?: string;
  onLoginSuccess?: (user: GoogleUserProfile, token?: string) => void;
  setUser?: (user: GoogleUserProfile | null) => void;
  setIsAuthenticated?: (isAuth: boolean) => void;
  onLogout?: () => void;
  variant?: 'header' | 'modal' | 'full';
}

export const GoogleAuthButton: React.FC<GoogleAuthButtonProps> = ({
  user: propUser,
  hasToken: propHasToken,
  domain = 'thezenithgroup.ca',
  onLoginSuccess,
  setUser,
  setIsAuthenticated,
  onLogout,
  variant = 'header'
}) => {
  const [internalUser, setInternalUser] = useState<GoogleUserProfile | null>(() => googleAuthService.getCurrentUser());
  const [internalHasToken, setInternalHasToken] = useState<boolean>(() => googleAuthService.hasActiveToken());
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);

  // Synchronize internal state with global auth events and localStorage across components/tabs
  useEffect(() => {
    const handleAuthSync = () => {
      const current = googleAuthService.getCurrentUser();
      setInternalUser(current);
      setInternalHasToken(googleAuthService.hasActiveToken());
    };

    window.addEventListener('zenith_auth_state_changed', handleAuthSync);
    window.addEventListener('storage', handleAuthSync);
    return () => {
      window.removeEventListener('zenith_auth_state_changed', handleAuthSync);
      window.removeEventListener('storage', handleAuthSync);
    };
  }, []);

  const activeUser = propUser !== undefined ? propUser : internalUser;
  const activeHasToken = propHasToken !== undefined ? propHasToken : internalHasToken;

  const handleSignIn = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const result = await googleAuthService.signInWithGoogle();
      const userProfile = result.user;

      // 3. User Session Persistence: Save into localStorage so user stays logged in across page reloads
      try {
        localStorage.setItem('zenith_user', JSON.stringify(userProfile));
      } catch (e) {
        console.warn('Unable to persist user to localStorage:', e);
      }

      // Update internal state
      setInternalUser(userProfile);
      setInternalHasToken(true);

      // 1. Callback Prop Binding & Safety Guard
      if (typeof onLoginSuccess === 'function') {
        onLoginSuccess(userProfile, result.accessToken);
      } else if (typeof setUser === 'function') {
        setUser(userProfile);
      } else {
        // Safe fallback state update
        localStorage.setItem('zenith_user', JSON.stringify(userProfile));
        window.location.reload();
      }

      if (typeof setIsAuthenticated === 'function') {
        setIsAuthenticated(true);
      }

      // Notify other components of the successful login
      window.dispatchEvent(new CustomEvent('zenith_auth_state_changed'));
    } catch (err: any) {
      console.error('Sign in failed:', err);
      const msg = err?.message || 'Failed to complete Google Sign-In.';
      setErrorMessage(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignOut = async () => {
    setShowDropdown(false);
    await googleAuthService.signOut();
    
    setInternalUser(null);
    setInternalHasToken(false);

    if (typeof onLogout === 'function') {
      onLogout();
    }
    if (typeof setUser === 'function') {
      setUser(null);
    }
    if (typeof setIsAuthenticated === 'function') {
      setIsAuthenticated(false);
    }
    window.dispatchEvent(new CustomEvent('zenith_auth_state_changed'));
  };

  if (activeUser) {
    if (variant === 'modal') {
      return (
        <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-50/80 border border-emerald-200">
          <div className="flex items-center gap-3">
            {activeUser.photoURL ? (
              <img
                src={activeUser.photoURL}
                alt={activeUser.name}
                className="w-8 h-8 rounded-full border border-emerald-300 shadow-xs"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-emerald-700 text-white font-bold flex items-center justify-center text-xs shadow-xs">
                {activeUser.name.charAt(0).toUpperCase()}
              </div>
            )}
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-slate-900">{activeUser.name}</span>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-0.5">
                  <ShieldCheck className="w-3 h-3 text-emerald-600" />
                  @{domain}
                </span>
              </div>
              <div className="flex items-center gap-2 text-[11px] text-slate-600">
                <span>{activeUser.email}</span>
                <span className="text-emerald-700 font-semibold flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                  {activeHasToken ? 'Gmail API Active' : 'Connected'}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!activeHasToken && (
              <button
                type="button"
                onClick={handleSignIn}
                disabled={isLoading}
                className="px-2.5 py-1 text-xs font-semibold text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded-lg cursor-pointer transition-colors"
                title="Refresh Google OAuth Access Token"
              >
                {isLoading ? 'Connecting...' : 'Reconnect Gmail'}
              </button>
            )}
            <button
              type="button"
              onClick={handleSignOut}
              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="relative">
        <button
          type="button"
          onClick={() => setShowDropdown(!showDropdown)}
          className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-800 text-xs font-semibold transition-all cursor-pointer shadow-2xs"
          id="google-user-profile-menu-btn"
        >
          {activeUser.photoURL ? (
            <img
              src={activeUser.photoURL}
              alt={activeUser.name}
              className="w-5 h-5 rounded-full border border-slate-300"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="w-5 h-5 rounded-full bg-emerald-700 text-white font-bold flex items-center justify-center text-[10px]">
              {activeUser.name.charAt(0).toUpperCase()}
            </div>
          )}
          <span className="max-w-[110px] truncate hidden sm:inline">{activeUser.name}</span>
          <span className="w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-emerald-200" title="Active Gmail API"></span>
        </button>

        {showDropdown && (
          <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-xl border border-slate-200 p-3 z-50 animate-in fade-in slide-in-from-top-1 duration-150">
            <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
              {activeUser.photoURL ? (
                <img
                  src={activeUser.photoURL}
                  alt={activeUser.name}
                  className="w-10 h-10 rounded-full border border-slate-200"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-emerald-700 text-white font-bold flex items-center justify-center text-sm">
                  {activeUser.name.charAt(0).toUpperCase()}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-slate-900 truncate">{activeUser.name}</p>
                <p className="text-[11px] text-slate-500 truncate">{activeUser.email}</p>
                <span className="inline-flex items-center gap-1 mt-0.5 px-1.5 py-0.2 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <ShieldCheck className="w-3 h-3 text-emerald-600" />
                  Zenith Corporate Account
                </span>
              </div>
            </div>

            <div className="py-2.5 space-y-1.5 text-xs text-slate-600">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-500">Dispatch Route:</span>
                <span className="font-semibold text-slate-900 flex items-center gap-1">
                  <Mail className="w-3 h-3 text-emerald-600" />
                  Direct Gmail API
                </span>
              </div>
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-500">OAuth Scope:</span>
                <span className="font-mono text-[10px] text-purple-700 bg-purple-50 px-1 py-0.5 rounded">
                  gmail.send
                </span>
              </div>
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-500">Token Status:</span>
                <span className={`font-semibold ${activeHasToken ? 'text-emerald-600' : 'text-amber-600'}`}>
                  {activeHasToken ? '● Token Active' : '○ Requires Refresh'}
                </span>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100 flex flex-col gap-1.5">
              {!activeHasToken && (
                <button
                  type="button"
                  onClick={handleSignIn}
                  disabled={isLoading}
                  className="w-full text-center py-1.5 px-2 bg-purple-50 hover:bg-purple-100 text-purple-800 font-semibold text-xs rounded-lg transition-colors cursor-pointer"
                >
                  {isLoading ? 'Reconnecting...' : 'Refresh Gmail Session'}
                </button>
              )}
              <button
                type="button"
                onClick={handleSignOut}
                className="w-full flex items-center justify-center gap-2 py-1.5 px-2 text-xs font-semibold text-rose-700 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out of Google</span>
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Unauthenticated: Render official Google Sign-In button
  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        id="google-signin-btn"
        onClick={handleSignIn}
        disabled={isLoading}
        className="inline-flex items-center gap-2.5 px-3 py-1.5 rounded-lg bg-white hover:bg-slate-50 active:bg-slate-100 text-slate-700 border border-slate-300 font-semibold text-xs shadow-2xs hover:shadow-xs transition-all cursor-pointer disabled:opacity-60"
        title={`Sign in with your @${domain} Google account`}
      >
        {isLoading ? (
          <Loader2 className="w-4 h-4 animate-spin text-slate-500" />
        ) : (
          <svg className="w-4 h-4 shrink-0" viewBox="0 0 48 48">
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
        )}
        <span className="whitespace-nowrap">Sign in with Google</span>
        <span className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-bold rounded bg-slate-100 text-slate-600 border border-slate-200">
          @{domain}
        </span>
      </button>

      {errorMessage && (
        <div className="flex items-start gap-1.5 text-[11px] text-rose-700 bg-rose-50 border border-rose-200 p-2 rounded-lg mt-1 max-w-sm">
          <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          <span>{errorMessage}</span>
        </div>
      )}
    </div>
  );
};

// Also export GoogleLoginButton as alias as requested
export const GoogleLoginButton = GoogleAuthButton;
