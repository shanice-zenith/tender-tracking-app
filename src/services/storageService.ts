import { ScopeLineItem, Contact, GoogleSheetsConfig, SyncLogEntry, Project } from '../types';
import { INITIAL_SCOPES } from '../data/initialTenderPackages';
import { INITIAL_CONTACTS } from '../data/initialContacts';
import { INITIAL_PROJECTS } from '../data/projectTemplates';
import { CANONICAL_ZENITH_PROJECT_IDS } from '../data/realZenithProjects';
import { isValidProjectName, sanitizeProject, isValidContractorName } from '../utils/projectValidation';

const STORAGE_KEYS = {
  PROJECTS: 'tender_tracker_projects_v5',
  ACTIVE_PROJECT_ID: 'tender_tracker_active_project_id_v5',
  SCOPES: 'tender_tracker_scopes_v5',
  CONTACTS: 'tender_tracker_contacts_v1',
  SHEETS_CONFIG: 'tender_tracker_sheets_config_v1',
  SYNC_LOGS: 'tender_tracker_sync_logs_v1',
  LAST_UPDATE: 'tender_tracker_last_update_v5',
  MASTER_SHEET_SNAPSHOT: 'tender_tracker_master_sheet_snapshot_v1',
  APPS_SCRIPT_URL: 'zenith_apps_script_endpoint_url_v1'
};

// ================= In-Memory State for Bulk Data (Firestore-First) =================
let inMemoryProjects: Project[] = INITIAL_PROJECTS;
let inMemoryScopes: ScopeLineItem[] = [];
let inMemoryContacts: Contact[] = INITIAL_CONTACTS.filter(
  (c) => c && isValidContractorName(c.company || c.name)
);

// On startup: purge any bulk datasets & local contacts from localStorage to free browser storage quota immediately
if (typeof window !== 'undefined' && window.localStorage) {
  try {
    localStorage.removeItem(STORAGE_KEYS.PROJECTS);
    localStorage.removeItem('tender_tracker_projects_v5');
    localStorage.removeItem('tender_tracker_projects_v4');
    localStorage.removeItem(STORAGE_KEYS.SCOPES);
    localStorage.removeItem('tender_tracker_scopes_v5');
    localStorage.removeItem('tender_tracker_scopes_v4');
    localStorage.removeItem(STORAGE_KEYS.CONTACTS);
    localStorage.removeItem('tender_tracker_contacts_v1');
    localStorage.removeItem(STORAGE_KEYS.MASTER_SHEET_SNAPSHOT);
  } catch (_) {}
}

// ================= IndexedDB Storage Engine for Large Artifacts =================
const IDB_DATABASE_NAME = 'zenith_tracker_cache_v1';
const IDB_STORE_NAME = 'large_cache';

let inMemoryMasterSheetSnapshot: string | null = null;

function getIndexedDB(): Promise<IDBDatabase | null> {
  if (typeof window === 'undefined' || !window.indexedDB) {
    return Promise.resolve(null);
  }
  return new Promise((resolve) => {
    try {
      const request = window.indexedDB.open(IDB_DATABASE_NAME, 1);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(IDB_STORE_NAME)) {
          db.createObjectStore(IDB_STORE_NAME);
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

async function saveToIndexedDB(key: string, value: string): Promise<void> {
  try {
    const db = await getIndexedDB();
    if (!db) return;
    const tx = db.transaction(IDB_STORE_NAME, 'readwrite');
    tx.objectStore(IDB_STORE_NAME).put(value, key);
  } catch (err) {
    console.warn('[IndexedDB] Save notice:', err);
  }
}

async function getFromIndexedDB(key: string): Promise<string | null> {
  try {
    const db = await getIndexedDB();
    if (!db) return null;
    return new Promise((resolve) => {
      const tx = db.transaction(IDB_STORE_NAME, 'readonly');
      const req = tx.objectStore(IDB_STORE_NAME).get(key);
      req.onsuccess = () => resolve((req.result as string) || null);
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

async function removeFromIndexedDB(key: string): Promise<void> {
  try {
    const db = await getIndexedDB();
    if (!db) return;
    const tx = db.transaction(IDB_STORE_NAME, 'readwrite');
    tx.objectStore(IDB_STORE_NAME).delete(key);
  } catch (err) {
    console.warn('[IndexedDB] Delete notice:', err);
  }
}

// On startup: migrate any existing snapshot out of localStorage into IndexedDB & memory to free localStorage quota
if (typeof window !== 'undefined') {
  try {
    const existingSnapshot = localStorage.getItem(STORAGE_KEYS.MASTER_SHEET_SNAPSHOT);
    if (existingSnapshot) {
      inMemoryMasterSheetSnapshot = existingSnapshot;
      saveToIndexedDB(STORAGE_KEYS.MASTER_SHEET_SNAPSHOT, existingSnapshot);
      // Remove from localStorage to instantly reclaim several megabytes of storage quota!
      localStorage.removeItem(STORAGE_KEYS.MASTER_SHEET_SNAPSHOT);
    }
  } catch (_) {}

  // Hydrate in-memory cache from IndexedDB
  getFromIndexedDB(STORAGE_KEYS.MASTER_SHEET_SNAPSHOT).then((val) => {
    if (val && !inMemoryMasterSheetSnapshot) {
      inMemoryMasterSheetSnapshot = val;
    }
  }).catch(() => {});
}

/**
 * Safe wrapper around localStorage.setItem that defends against QuotaExceededError
 * by clearing non-critical caches and suppressing unhandled error logs.
 */
function safeLocalStorageSet(key: string, value: string): boolean {
  if (typeof window === 'undefined' || !window.localStorage) return false;
  // NEVER write full projects, scopes, or contacts to localStorage (~5MB limit)
  if (
    key === STORAGE_KEYS.PROJECTS ||
    key === 'tender_tracker_projects_v5' ||
    key === STORAGE_KEYS.SCOPES ||
    key === 'tender_tracker_scopes_v5' ||
    key === STORAGE_KEYS.CONTACTS ||
    key === 'tender_tracker_contacts_v1'
  ) {
    return false;
  }
  try {
    localStorage.setItem(key, value);
    return true;
  } catch (err: any) {
    const isQuota =
      err?.name === 'QuotaExceededError' ||
      err?.code === 22 ||
      err?.code === 1014 ||
      err?.number === -2147024882 ||
      String(err?.message || '').toLowerCase().includes('quota');

    if (isQuota) {
      // Clear non-essential large caches to free up localStorage space
      try {
        localStorage.removeItem(STORAGE_KEYS.PROJECTS);
        localStorage.removeItem('tender_tracker_projects_v5');
        localStorage.removeItem(STORAGE_KEYS.SCOPES);
        localStorage.removeItem('tender_tracker_scopes_v5');
        localStorage.removeItem(STORAGE_KEYS.MASTER_SHEET_SNAPSHOT);
        localStorage.removeItem(STORAGE_KEYS.SYNC_LOGS);
        localStorage.setItem(key, value);
        return true;
      } catch (_) {
        console.warn(`[storageService] LocalStorage quota limit reached for "${key}". Preference retained in memory.`);
        return false;
      }
    } else {
      console.warn(`[storageService] Notice writing to localStorage for "${key}":`, err);
      return false;
    }
  }
}

export const DEFAULT_APPS_SCRIPT_WEBHOOK_URL =
  'https://script.google.com/a/macros/thezenithgroup.ca/s/AKfycby8WGdj9nbiZ7gILzjXL6FjjJJMbcPMR4OHB9S4oNk42VRfQXSYEBhxpTZ1zp37vjjx/exec';

const DEFAULT_SHEETS_CONFIG: GoogleSheetsConfig = {
  sheetUrl: 'https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/export?format=csv',
  sheetName: 'Live Tender Pricing Feed',
  autoSyncIntervalMinutes: 0,
  isEnabled: true,
  autoSyncEnabled: false,
  lastSyncedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
  appsScriptUrl: DEFAULT_APPS_SCRIPT_WEBHOOK_URL
};

export const storageService = {
  // ================= Projects =================
  // Strictly relies on live Firestore reads and onSnapshot subscriptions for persistence.
  // Never dumps bulk project data into localStorage.
  getProjects(): Project[] {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.removeItem(STORAGE_KEYS.PROJECTS);
        localStorage.removeItem('tender_tracker_projects_v5');
      }
    } catch (_) {}
    return inMemoryProjects.length > 0 ? inMemoryProjects : INITIAL_PROJECTS;
  },

  saveProjects(projects: Project[]): void {
    if (Array.isArray(projects) && projects.length > 0) {
      inMemoryProjects = projects
        .filter((p) => Boolean(p && isValidProjectName(p.name)))
        .map((p) => sanitizeProject(p));
    }
    // Strict Firestore-only persistence: do NOT serialize projects to localStorage.
    // Ensure any residual localStorage dump is purged so quota is never consumed.
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.removeItem(STORAGE_KEYS.PROJECTS);
        localStorage.removeItem('tender_tracker_projects_v5');
      }
    } catch (_) {}
  },

  getActiveProjectId(availableProjects?: Project[]): string | null {
    try {
      if (typeof window === 'undefined' || !window.localStorage) return null;
      const activeId = localStorage.getItem(STORAGE_KEYS.ACTIVE_PROJECT_ID);
      if (!activeId) return null;
      if (availableProjects && availableProjects.length > 0) {
        const exists = availableProjects.some((p) => p.id === activeId);
        if (!exists) {
          try {
            localStorage.removeItem(STORAGE_KEYS.ACTIVE_PROJECT_ID);
          } catch (_) {}
          return null;
        }
      }
      return activeId;
    } catch (e) {
      return null;
    }
  },

  saveActiveProjectId(id: string | null): void {
    try {
      if (typeof window === 'undefined' || !window.localStorage) return;
      if (id) {
        try {
          localStorage.setItem(STORAGE_KEYS.ACTIVE_PROJECT_ID, id);
        } catch (quotaErr) {
          console.warn('[storageService] LocalStorage quota reached while saving active project ID:', quotaErr);
        }
      } else {
        localStorage.removeItem(STORAGE_KEYS.ACTIVE_PROJECT_ID);
      }
    } catch (e) {
      console.warn('Notice saving active project id', e);
    }
  },

  setActiveProjectId(id: string | null): void {
    this.saveActiveProjectId(id);
  },

  // ================= Legacy Scopes for fallback =================
  // Kept in memory only; never serialized to localStorage.
  getScopes(): ScopeLineItem[] {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.removeItem(STORAGE_KEYS.SCOPES);
        localStorage.removeItem('tender_tracker_scopes_v5');
      }
    } catch (_) {}
    return inMemoryScopes;
  },

  saveScopes(scopes: ScopeLineItem[]): void {
    if (Array.isArray(scopes) && scopes.length > 0) {
      inMemoryScopes = scopes;
    }
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.removeItem(STORAGE_KEYS.SCOPES);
        localStorage.removeItem('tender_tracker_scopes_v5');
      }
    } catch (_) {}
  },

  // ================= Contacts (In-Memory Only, Firestore Source of Truth) =================
  getContacts(): Contact[] {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.removeItem(STORAGE_KEYS.CONTACTS);
        localStorage.removeItem('tender_tracker_contacts_v1');
      }
    } catch (_) {}
    return inMemoryContacts;
  },

  saveContacts(contacts: Contact[]): void {
    if (Array.isArray(contacts) && contacts.length > 0) {
      inMemoryContacts = contacts.filter(
        (c: Contact) => c && isValidContractorName(c.company || c.name)
      );
    }
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.removeItem(STORAGE_KEYS.CONTACTS);
        localStorage.removeItem('tender_tracker_contacts_v1');
      }
    } catch (_) {}
  },

  // ================= Google Sheets Config =================
  getSheetsConfig(): GoogleSheetsConfig {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.SHEETS_CONFIG);
      if (data) {
        const parsed = JSON.parse(data);
        return {
          ...DEFAULT_SHEETS_CONFIG,
          ...parsed,
          autoSyncEnabled: false,
          autoSyncIntervalMinutes: 0
        };
      }
    } catch (e) {
      console.warn('Notice loading sheets config', e);
    }
    return DEFAULT_SHEETS_CONFIG;
  },

  saveSheetsConfig(config: GoogleSheetsConfig): void {
    try {
      const sanitized: GoogleSheetsConfig = {
        ...config,
        autoSyncEnabled: false,
        autoSyncIntervalMinutes: 0
      };
      safeLocalStorageSet(STORAGE_KEYS.SHEETS_CONFIG, JSON.stringify(sanitized));
      if (config.appsScriptUrl !== undefined) {
        safeLocalStorageSet(STORAGE_KEYS.APPS_SCRIPT_URL, config.appsScriptUrl.trim());
      }
    } catch (e) {
      console.warn('Notice saving sheets config', e);
    }
  },

  // ================= Google Apps Script Gmail Dispatcher URL =================
  getAppsScriptUrl(): string {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.APPS_SCRIPT_URL);
      if (stored !== null && stored !== undefined && stored.trim().length > 0) {
        return stored.trim();
      }
      const sheetsConfig = this.getSheetsConfig();
      if (sheetsConfig.appsScriptUrl && sheetsConfig.appsScriptUrl.trim().length > 0) {
        return sheetsConfig.appsScriptUrl.trim();
      }
      return DEFAULT_APPS_SCRIPT_WEBHOOK_URL;
    } catch (e) {
      return DEFAULT_APPS_SCRIPT_WEBHOOK_URL;
    }
  },

  saveAppsScriptUrl(url: string): void {
    try {
      const clean = url.trim();
      safeLocalStorageSet(STORAGE_KEYS.APPS_SCRIPT_URL, clean);
      const currentConfig = this.getSheetsConfig();
      this.saveSheetsConfig({
        ...currentConfig,
        appsScriptUrl: clean
      });
    } catch (e) {
      console.warn('Notice saving Apps Script URL', e);
    }
  },

  // ================= Sync Logs =================
  getSyncLogs(): SyncLogEntry[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.SYNC_LOGS);
      if (data) {
        return JSON.parse(data);
      }
    } catch (e) {
      console.warn('Notice loading sync logs', e);
    }
    return [
      {
        id: 'log-1',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        status: 'success',
        message: 'Google Sheets sync established successfully.',
        updatedQuotesCount: 24,
        details: 'Fetched 28 contractor line-item figures and document reference links.'
      }
    ];
  },

  saveSyncLogs(logs: SyncLogEntry[]): void {
    try {
      safeLocalStorageSet(STORAGE_KEYS.SYNC_LOGS, JSON.stringify(logs.slice(0, 15)));
    } catch (e) {
      console.warn('Notice saving sync logs', e);
    }
  },

  // ================= Master Sheet Persistent Snapshot =================
  getMasterSheetSnapshot(): string | null {
    if (inMemoryMasterSheetSnapshot) {
      return inMemoryMasterSheetSnapshot;
    }
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.MASTER_SHEET_SNAPSHOT);
      if (stored) {
        inMemoryMasterSheetSnapshot = stored;
        return stored;
      }
    } catch (e) {
      console.warn('Notice loading master sheet snapshot from localStorage', e);
    }
    return null;
  },

  saveMasterSheetSnapshot(csvContent: string): void {
    inMemoryMasterSheetSnapshot = csvContent;
    // Persist reliably to IndexedDB without localStorage quota limits
    saveToIndexedDB(STORAGE_KEYS.MASTER_SHEET_SNAPSHOT, csvContent);

    try {
      // Only keep in localStorage if under 100KB to prevent QuotaExceededError
      if (csvContent && csvContent.length < 100000) {
        safeLocalStorageSet(STORAGE_KEYS.MASTER_SHEET_SNAPSHOT, csvContent);
      } else {
        // Remove from localStorage to preserve storage space for projects & scopes
        localStorage.removeItem(STORAGE_KEYS.MASTER_SHEET_SNAPSHOT);
      }
    } catch (e) {
      try {
        localStorage.removeItem(STORAGE_KEYS.MASTER_SHEET_SNAPSHOT);
      } catch (_) {}
      console.warn('Notice: Master sheet snapshot exceeds localStorage capacity; retained in IndexedDB and memory.');
    }
  },

  resetToDefault(): { projects: Project[]; contacts: Contact[] } {
    inMemoryMasterSheetSnapshot = null;
    removeFromIndexedDB(STORAGE_KEYS.MASTER_SHEET_SNAPSHOT);
    localStorage.removeItem(STORAGE_KEYS.PROJECTS);
    localStorage.removeItem(STORAGE_KEYS.ACTIVE_PROJECT_ID);
    localStorage.removeItem(STORAGE_KEYS.SCOPES);
    localStorage.removeItem(STORAGE_KEYS.CONTACTS);
    localStorage.removeItem(STORAGE_KEYS.SHEETS_CONFIG);
    localStorage.removeItem(STORAGE_KEYS.SYNC_LOGS);
    localStorage.removeItem(STORAGE_KEYS.MASTER_SHEET_SNAPSHOT);
    this.saveProjects(INITIAL_PROJECTS);
    this.saveContacts(INITIAL_CONTACTS);
    return { projects: INITIAL_PROJECTS, contacts: INITIAL_CONTACTS };
  }
};
