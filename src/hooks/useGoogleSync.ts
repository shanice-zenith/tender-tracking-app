import { useState, useCallback, Dispatch, SetStateAction } from 'react';
import { Project, Contact, GoogleSheetsConfig } from '../types';
import {
  masterSyncService,
  sanitizeCostCode,
  isValidContractorName,
  normalizeProjectName,
  mapRowToSubmission,
  buildHeaderMap
} from '../services/masterSyncService';
import { sheetsSyncService, MultiProjectSyncResult } from '../services/sheetsSyncService';
import { storageService } from '../services/storageService';

export interface UseGoogleSyncOptions {
  projects: Project[];
  setProjects: Dispatch<SetStateAction<Project[]>>;
  contacts: Contact[];
  setContacts: Dispatch<SetStateAction<Contact[]>>;
  sheetsConfig: GoogleSheetsConfig;
  setSheetsConfig?: Dispatch<SetStateAction<GoogleSheetsConfig>>;
  onSuccess?: (result: MultiProjectSyncResult) => void;
  onError?: (error: Error) => void;
}

export function useGoogleSync({
  projects,
  setProjects,
  contacts,
  setContacts,
  sheetsConfig,
  setSheetsConfig,
  onSuccess,
  onError
}: UseGoogleSyncOptions) {
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncResult, setLastSyncResult] = useState<MultiProjectSyncResult | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);

  /**
   * Trigger multi-project sync with Google Sheets or manual CSV/TSV input
   */
  const triggerSync = useCallback(
    async (manualCsvText?: string): Promise<MultiProjectSyncResult | null> => {
      setIsSyncing(true);
      setSyncError(null);
      try {
        const result = await sheetsSyncService.syncAllProjectsFromSheet(
          projects,
          contacts,
          sheetsConfig,
          manualCsvText
        );

        // Run contractor auto-purge validation over updated projects and contacts
        const purged = masterSyncService.purgeInvalidContractors(
          result.updatedProjects,
          result.newContacts
        );

        setProjects(purged.purgedProjects);
        storageService.saveProjects(purged.purgedProjects);

        setContacts(purged.purgedContacts);
        storageService.saveContacts(purged.purgedContacts);

        // Persist back to Master Sheet server store
        sheetsSyncService.saveBackToMasterSheet(purged.purgedProjects, sheetsConfig);

        const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        if (setSheetsConfig) {
          setSheetsConfig((prev) => ({ ...prev, lastSyncedAt: now }));
        }

        setLastSyncResult(result);
        onSuccess?.(result);
        return result;
      } catch (err: any) {
        const errorMsg = err?.message || 'Master Tender Sync failed to process rows';
        setSyncError(errorMsg);
        onError?.(err instanceof Error ? err : new Error(errorMsg));
        return null;
      } finally {
        setIsSyncing(false);
      }
    },
    [projects, contacts, sheetsConfig, setProjects, setContacts, setSheetsConfig, onSuccess, onError]
  );

  /**
   * Auto-purge corrupt cards and contacts from current workspace and storage
   */
  const purgeInvalidEntries = useCallback(() => {
    const { purgedProjects, purgedContacts, purgedCardsCount, purgedContactsCount } =
      masterSyncService.purgeInvalidContractors(projects, contacts);

    if (purgedCardsCount > 0) {
      setProjects(purgedProjects);
      storageService.saveProjects(purgedProjects);
    }
    if (purgedContactsCount > 0) {
      setContacts(purgedContacts);
      storageService.saveContacts(purgedContacts);
    }

    return { purgedCardsCount, purgedContactsCount };
  }, [projects, contacts, setProjects, setContacts]);

  return {
    isSyncing,
    lastSyncResult,
    syncError,
    triggerSync,
    purgeInvalidEntries,
    normalizeProjectName,
    sanitizeCostCode,
    isValidContractorName,
    mapRowToSubmission,
    buildHeaderMap
  };
}

export {
  sanitizeCostCode,
  isValidContractorName,
  normalizeProjectName,
  masterSyncService,
  mapRowToSubmission,
  buildHeaderMap
};

