export interface SenderProfile {
  id: string;
  name: string;
  role: string;
  email: string;
  website: string;
  isCustom?: boolean;
}

export const DEFAULT_SENDER_PROFILES: SenderProfile[] = [
  {
    id: 'shanice',
    name: 'Shanice',
    role: 'Zenith Project Estimator',
    email: 'shanice@thezenithgroup.ca',
    website: 'thezenithgroup.ca',
    isCustom: false
  },
  {
    id: 'nadia',
    name: 'Nadia',
    role: 'Zenith Project Estimator',
    email: 'nadia@thezenithgroup.ca',
    website: 'thezenithgroup.ca',
    isCustom: false
  }
];

const STORAGE_KEY = 'zenith_saved_sender_profiles_v2';

export function getStoredSenderProfiles(): SenderProfile[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      // Check legacy key
      const legacyRaw = localStorage.getItem('zenith_saved_sender_profiles');
      if (legacyRaw) {
        const legacyParsed = JSON.parse(legacyRaw);
        if (Array.isArray(legacyParsed) && legacyParsed.length > 0) {
          const cleaned = legacyParsed.filter(
            (p) => p && p.id && p.email !== 'tenders@thezenithgroup.ca' && p.email !== 'info@thezenithgroup.ca'
          );
          if (cleaned.length > 0) {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(cleaned));
            return cleaned;
          }
        }
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_SENDER_PROFILES));
      return DEFAULT_SENDER_PROFILES;
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_SENDER_PROFILES));
      return DEFAULT_SENDER_PROFILES;
    }

    // Filter out any obsolete profiles (like tenders@thezenithgroup.ca)
    const validSaved = parsed.filter(
      (p) => p && p.id && p.email !== 'tenders@thezenithgroup.ca' && p.email !== 'info@thezenithgroup.ca'
    );

    if (validSaved.length === 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_SENDER_PROFILES));
      return DEFAULT_SENDER_PROFILES;
    }

    return validSaved;
  } catch (e) {
    console.warn('Failed to load stored sender profiles', e);
    return DEFAULT_SENDER_PROFILES;
  }
}

export function updateSenderProfile(profile: SenderProfile): SenderProfile[] {
  try {
    const current = getStoredSenderProfiles();
    const index = current.findIndex((p) => p.id === profile.id);
    let updated: SenderProfile[];
    if (index >= 0) {
      updated = [...current];
      updated[index] = { ...profile };
    } else {
      updated = [...current, profile];
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent('zenith_sender_profiles_updated', { detail: updated }));
    return updated;
  } catch (e) {
    console.warn('Failed to update sender profile', e);
    return getStoredSenderProfiles();
  }
}

export function saveCustomSenderProfile(profile: Omit<SenderProfile, 'isCustom'>): { profiles: SenderProfile[]; newProfile: SenderProfile } {
  try {
    const current = getStoredSenderProfiles();
    const newProfile: SenderProfile = {
      ...profile,
      isCustom: true
    };
    const updated = [...current.filter((p) => p.id !== profile.id), newProfile];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent('zenith_sender_profiles_updated', { detail: updated }));
    return { profiles: updated, newProfile };
  } catch (e) {
    console.warn('Failed to save sender profile', e);
    const fallback: SenderProfile = { ...profile, isCustom: true };
    return { profiles: getStoredSenderProfiles(), newProfile: fallback };
  }
}

export function deleteSenderProfile(id: string): SenderProfile[] {
  try {
    const current = getStoredSenderProfiles();
    const updated = current.filter((p) => p.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent('zenith_sender_profiles_updated', { detail: updated }));
    return updated;
  } catch (e) {
    console.warn('Failed to delete sender profile', e);
    return getStoredSenderProfiles();
  }
}
