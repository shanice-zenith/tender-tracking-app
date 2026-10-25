import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithPopup, 
  signOut as firebaseSignOut, 
  GoogleAuthProvider, 
  onAuthStateChanged, 
  setPersistence,
  browserLocalPersistence,
  User 
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';
import { GoogleUserProfile } from '../types';
import { 
  getStoredSenderProfiles, 
  saveCustomSenderProfile, 
  updateSenderProfile,
  SenderProfile
} from '../data/senderProfiles';

export const GMAIL_SEND_SCOPE = 'https://www.googleapis.com/auth/gmail.send';
export const DRIVE_FILE_SCOPE = 'https://www.googleapis.com/auth/drive.file';
export const ALLOWED_DOMAIN = 'thezenithgroup.ca';

// Initialize Firebase App singleton safely
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Enforce browserLocalPersistence for long-lived Zenith team sessions across reloads
setPersistence(auth, browserLocalPersistence).catch((err) => {
  console.warn('Firebase browserLocalPersistence initialization notice:', err);
});

// Configure Google Auth Provider
const provider = new GoogleAuthProvider();
provider.addScope(GMAIL_SEND_SCOPE);
provider.addScope(DRIVE_FILE_SCOPE);
provider.setCustomParameters({
  hd: ALLOWED_DOMAIN,
  prompt: 'select_account'
});

// Cache the access token and active user strictly in-memory per security requirements
let cachedAccessToken: string | null = null;
let cachedUserProfile: GoogleUserProfile | null = null;
let isSigningIn = false;

const PROFILE_STORAGE_KEY = 'zenith_authenticated_user_profile_v1';
const LEGACY_PROFILE_KEY = 'zenith_user';
const TOKEN_STORAGE_KEY = 'zenith_google_access_token_v1';

export function isDomainAllowed(email: string): boolean {
  if (!email) return false;
  const clean = email.trim().toLowerCase();
  return clean.endsWith(`@${ALLOWED_DOMAIN}`);
}

/**
 * Automatically registers or synchronizes the authenticated user
 * as a selectable sender profile so email signatures and headers
 * match their exact credentials.
 */
export function syncUserWithSenderProfiles(user: GoogleUserProfile): SenderProfile {
  const profiles = getStoredSenderProfiles();
  const existing = profiles.find((p) => p.email.toLowerCase() === user.email.toLowerCase());

  if (existing) {
    if (existing.name !== user.name) {
      const updated: SenderProfile = {
        ...existing,
        name: user.name
      };
      updateSenderProfile(updated);
      return updated;
    }
    return existing;
  } else {
    const newProfile = saveCustomSenderProfile({
      id: `google_${user.email.toLowerCase().replace(/[^a-z0-9]/g, '_')}`,
      name: user.name,
      role: 'Zenith Project Estimator',
      email: user.email,
      website: 'thezenithgroup.ca'
    }).newProfile;
    return newProfile;
  }
}

export const googleAuthService = {
  getAccessToken(): string | null {
    if (cachedAccessToken) return cachedAccessToken;
    try {
      const storedToken = localStorage.getItem(TOKEN_STORAGE_KEY) || sessionStorage.getItem(TOKEN_STORAGE_KEY);
      if (storedToken) {
        cachedAccessToken = storedToken;
        return storedToken;
      }
    } catch (e) {
      console.warn('Failed to retrieve stored access token', e);
    }
    return null;
  },

  setAccessToken(token: string | null): void {
    cachedAccessToken = token;
    try {
      if (token) {
        localStorage.setItem(TOKEN_STORAGE_KEY, token);
        sessionStorage.setItem(TOKEN_STORAGE_KEY, token);
      } else {
        localStorage.removeItem(TOKEN_STORAGE_KEY);
        sessionStorage.removeItem(TOKEN_STORAGE_KEY);
      }
    } catch (e) {}
  },

  getCurrentUser(): GoogleUserProfile | null {
    if (cachedUserProfile) return cachedUserProfile;
    try {
      const stored = localStorage.getItem(LEGACY_PROFILE_KEY) || localStorage.getItem(PROFILE_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && parsed.email && isDomainAllowed(parsed.email)) {
          cachedUserProfile = parsed;
          return parsed;
        }
      }
    } catch (e) {
      console.warn('Failed to parse cached user profile', e);
    }
    return null;
  },

  isLoggedIn(): boolean {
    return Boolean(this.getCurrentUser());
  },

  hasActiveToken(): boolean {
    return Boolean(this.getAccessToken());
  },

  /**
   * Initializes the Firebase Auth state listener.
   */
  initAuth(
    onAuthSuccess?: (user: GoogleUserProfile, token: string | null) => void,
    onAuthFailure?: (rejectedEmail?: string) => void
  ) {
    return onAuthStateChanged(auth, async (firebaseUser: User | null) => {
      if (firebaseUser && firebaseUser.email) {
        if (!isDomainAllowed(firebaseUser.email)) {
          console.warn(`User ${firebaseUser.email} rejected: Not from @${ALLOWED_DOMAIN}`);
          const rejectedEmail = firebaseUser.email;
          await firebaseSignOut(auth);
          cachedAccessToken = null;
          cachedUserProfile = null;
          localStorage.removeItem(PROFILE_STORAGE_KEY);
          localStorage.removeItem(LEGACY_PROFILE_KEY);
          localStorage.removeItem(TOKEN_STORAGE_KEY);
          if (typeof window !== 'undefined') {
            window.dispatchEvent(
              new CustomEvent('zenith_auth_access_denied', {
                detail: { attemptedEmail: rejectedEmail }
              })
            );
          }
          if (onAuthFailure) onAuthFailure(rejectedEmail);
          return;
        }

        const profile: GoogleUserProfile = {
          uid: firebaseUser.uid,
          name: firebaseUser.displayName || firebaseUser.email.split('@')[0],
          email: firebaseUser.email,
          photoURL: firebaseUser.photoURL || undefined,
          domain: ALLOWED_DOMAIN
        };

        cachedUserProfile = profile;
        localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(profile));
        localStorage.setItem(LEGACY_PROFILE_KEY, JSON.stringify(profile));
        syncUserWithSenderProfiles(profile);

        if (onAuthSuccess) {
          onAuthSuccess(profile, this.getAccessToken());
        }
      } else {
        // Only clear if not in the middle of active sign in or if user already logged out
        if (!isSigningIn) {
          // If there is an existing persisted user session in localStorage, keep it
          const existing = this.getCurrentUser();
          if (!existing) {
            cachedAccessToken = null;
            cachedUserProfile = null;
            localStorage.removeItem(PROFILE_STORAGE_KEY);
            localStorage.removeItem(LEGACY_PROFILE_KEY);
            localStorage.removeItem(TOKEN_STORAGE_KEY);
            if (onAuthFailure) onAuthFailure();
          }
        }
      }
    });
  },

  /**
   * Executes Google OAuth popup login restricted to @thezenithgroup.ca
   */
  async signInWithGoogle(): Promise<{ user: GoogleUserProfile; accessToken: string } | null> {
    try {
      isSigningIn = true;
      try {
        await setPersistence(auth, browserLocalPersistence);
      } catch (persistenceErr) {
        console.warn('Firebase setPersistence notice:', persistenceErr);
      }
      const result = await signInWithPopup(auth, provider);
      const email = result.user.email || '';

      // Validate corporate domain restriction
      if (!isDomainAllowed(email)) {
        await firebaseSignOut(auth);
        cachedAccessToken = null;
        cachedUserProfile = null;
        localStorage.removeItem(PROFILE_STORAGE_KEY);
        localStorage.removeItem(LEGACY_PROFILE_KEY);
        localStorage.removeItem(TOKEN_STORAGE_KEY);
        sessionStorage.removeItem(TOKEN_STORAGE_KEY);
        // Broadcast rejection event so access denied UI can display immediately
        if (typeof window !== 'undefined') {
          window.dispatchEvent(
            new CustomEvent('zenith_auth_access_denied', {
              detail: { attemptedEmail: email }
            })
          );
        }
        const domainErr = new Error(`Access Denied: Only @${ALLOWED_DOMAIN} accounts are authorized.`);
        (domainErr as any).code = 'auth/domain-access-denied';
        (domainErr as any).attemptedEmail = email;
        throw domainErr;
      }

      const credential = GoogleAuthProvider.credentialFromResult(result);
      const token = credential?.accessToken || null;
      if (token) {
        cachedAccessToken = token;
        this.setAccessToken(token);
      }

      const profile: GoogleUserProfile = {
        uid: result.user.uid,
        name: result.user.displayName || email.split('@')[0],
        email: email,
        photoURL: result.user.photoURL || undefined,
        domain: ALLOWED_DOMAIN
      };

      cachedUserProfile = profile;
      localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(profile));
      localStorage.setItem(LEGACY_PROFILE_KEY, JSON.stringify(profile));
      localStorage.setItem('zenith_last_activity_timestamp', Date.now().toString());
      
      // Auto-sync into sender profiles so signature updates instantly
      syncUserWithSenderProfiles(profile);
      window.dispatchEvent(new CustomEvent('zenith_auth_state_changed'));

      return { user: profile, accessToken: cachedAccessToken || '' };
    } catch (error: any) {
      // Gracefully catch popup closed or cancellation errors so red error banners do NOT render
      if (
        error?.code === 'auth/popup-closed-by-user' ||
        error?.code === 'auth/cancelled-popup-request' ||
        error?.code === 'auth/popup-blocked'
      ) {
        console.info('Google sign-in popup dismissed cleanly by user.');
        return null;
      }
      console.error('Google Sign-In Error:', error);
      throw error;
    } finally {
      isSigningIn = false;
    }
  },

  /**
   * Signs the user out, clearing cached tokens and profiles
   */
  async signOut(): Promise<void> {
    try {
      await firebaseSignOut(auth);
    } catch (e) {
      console.error('Sign-out error:', e);
    } finally {
      cachedAccessToken = null;
      cachedUserProfile = null;
      localStorage.removeItem(PROFILE_STORAGE_KEY);
      localStorage.removeItem(LEGACY_PROFILE_KEY);
      localStorage.removeItem(TOKEN_STORAGE_KEY);
      sessionStorage.removeItem(TOKEN_STORAGE_KEY);
      localStorage.removeItem('zenith_last_activity_timestamp');
      window.dispatchEvent(new CustomEvent('zenith_auth_state_changed'));
    }
  }
};
