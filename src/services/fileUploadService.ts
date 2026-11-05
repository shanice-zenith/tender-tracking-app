import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db } from '../lib/firebase';
import { sanitizePayload } from './databaseService';

export interface AttachedDocRecord {
  id: string;
  name: string;
  url: string;
  type: string;
  uploadedAt: string;
  addedAt?: string;
  size?: number;
}

export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB max for file uploads

/**
 * Dispatch application toast notification
 */
export function showAppToast(message: string) {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('app-toast', { detail: message }));
  }
}

/**
 * Validation rule: Only permanent HTTPS URLs or Base64 Data URLs are allowed.
 * Blocks any attempt to save temporary blob: URLs or expired placeholders.
 */
export function isValidPermanentUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  const trimmed = url.trim();
  const lower = trimmed.toLowerCase();
  if (lower.startsWith('blob:') || lower.includes('expired')) {
    return false;
  }
  return (
    trimmed.startsWith('data:application/') ||
    trimmed.startsWith('data:image/') ||
    trimmed.startsWith('data:text/') ||
    trimmed.startsWith('data:') ||
    trimmed.startsWith('https://') ||
    trimmed.startsWith('http://')
  );
}

/**
 * Correct Expired Detector Logic:
 * - If doc.url.startsWith('data:') OR doc.url.startsWith('http') -> VALID (NOT EXPIRED)
 * - ONLY mark as Expired if doc.url.startsWith('blob:') or if doc.url is missing/contains 'expired'
 */
export function isDocExpired(doc: { url?: string } | null | undefined): boolean {
  if (!doc || !doc.url) return true;
  const url = doc.url.trim().toLowerCase();
  if (url.startsWith('blob:') || url.includes('expired')) {
    return true; // EXPIRED TEMPORARY SESSION LINK
  }
  if (url.startsWith('data:') || url.startsWith('http://') || url.startsWith('https://')) {
    return false; // VALID PERMANENT LINK
  }
  return true;
}

/**
 * Read file as permanent Base64 Data URL using FileReader.readAsDataURL(file).
 * Converts PDF, PNG, JPG, DOCX to full Data URL string (e.g. data:application/pdf;base64,JVBERi0...).
 * Completely bans URL.createObjectURL.
 */
export function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('Failed to read file as Data URL'));
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file locally'));
    reader.readAsDataURL(file);
  });
}


export async function uploadQuoteDocument(
  file: File,
  _quoteId = 'general'
): Promise<AttachedDocRecord> {
  const MAX_STORAGE_SIZE = 25 * 1024 * 1024;
  if (file.size > MAX_STORAGE_SIZE) {
    throw new Error(`File "${file.name}" exceeds the 25MB limit.`);
  }

  // Initialize storage
  const storage = getStorage();
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const storagePath = `quotes/${_quoteId}/${Date.now()}_${safeName}`;
  const fileRef = ref(storage, storagePath);

  // Upload file binary
  const uploadResult = await uploadBytes(fileRef, file);

  // Get download link
  const downloadUrl = await getDownloadURL(uploadResult.ref);
  const now = new Date().toISOString();

  return {
    id: Date.now().toString(),
    name: file.name,
    url: downloadUrl,
    type: file.type || 'application/pdf',
    uploadedAt: now,
    addedAt: now.split('T')[0],
    size: file.size
  };
}
/**
 * Backward compatibility wrapper for callers expecting uploadLocalQuoteFile
 */
export async function uploadLocalQuoteFile(file: File): Promise<{
  url: string;
  name: string;
  type?: string;
  size?: number;
  provider: string;
}> {
  const result = await uploadQuoteDocument(file);
  return {
    url: result.url,
    name: result.name,
    type: result.type,
    size: result.size,
    provider: 'firebase_storage'
  };
}

/**
 * Backward compatibility wrapper for callers expecting processQuoteFileUpload
 */
export async function processQuoteFileUpload(file: File, quoteId = 'general'): Promise<AttachedDocRecord> {
  return uploadQuoteDocument(file, quoteId);
}

export async function persistQuoteAttachedDocsToFirestore(
  quoteId: string,
  updatedDocsArray: any[],
  extraFields: Record<string, any> = {}
): Promise<void> {
  if (!db || !quoteId) return;

  // Filter out any invalid items, completely blocking blob: and expired references
  const cleanDocs = (updatedDocsArray || [])
    .filter((doc) => doc && isValidPermanentUrl(doc.url))
    .map((doc) => ({
      id: doc.id ? String(doc.id) : Date.now().toString(),
      name: doc.name || 'Document.pdf',
      url: doc.url,
      type: doc.type || 'application/pdf',
      uploadedAt: doc.uploadedAt || new Date().toISOString(),
      ...(doc.addedAt ? { addedAt: doc.addedAt } : {})
    }));

  const quoteRef = doc(db, 'quotes', quoteId);
  const latestDoc = cleanDocs[cleanDocs.length - 1];
  const payload = sanitizePayload({
    attachedDocs: cleanDocs,
    docUrl: latestDoc?.url || cleanDocs[0]?.url || '',
    updatedAt: new Date().toISOString(),
    ...extraFields
  });

  try {
    await updateDoc(quoteRef, payload);
    console.log(`[Firestore] Successfully executed updateDoc on quotes/${quoteId} with attachedDocs (${cleanDocs.length} file(s))`);
  } catch (err: any) {
    if (
      err?.code === 'not-found' ||
      err?.message?.includes('No document to update') ||
      err?.message?.includes('not found')
    ) {
      try {
        await setDoc(quoteRef, { id: quoteId, ...payload }, { merge: true });
        console.log(`[Firestore] Successfully saved quotes/${quoteId} with attachedDocs via setDoc`);
      } catch (innerErr) {
        console.warn(`[Firestore] Notice saving attachedDocs to quotes/${quoteId}:`, innerErr);
      }
    } else {
      console.warn(`[Firestore] Notice updating attachedDocs on quotes/${quoteId}:`, err);
    }
  }
}

/**
 * Automated database cleanup routine to scan and wipe all expired blob document references
 * across all projects and quotes in Firestore:
 * - Fetches all project documents from Firestore.
 * - Recursively traverses all scopes, trades, and quote entries.
 * - Inspects the attachedDocs array on every row.
 * - Automatically filters out and removes any item where doc.url starts with blob: or contains expired.
 * - Writes the cleaned arrays back to Firestore via updateDoc.
 * - Also sweeps through the quotes collection to wipe any standalone quote blob references.
 */
export async function cleanupAllExpiredBlobDocumentsInFirestore(): Promise<{
  projectsUpdated: number;
  quotesUpdated: number;
  totalPurgedRefs: number;
}> {
  if (!db) {
    console.warn('[Cleanup] Firestore db is not initialized, skipping cleanup');
    return { projectsUpdated: 0, quotesUpdated: 0, totalPurgedRefs: 0 };
  }

  let projectsUpdated = 0;
  let quotesUpdated = 0;
  let totalPurgedRefs = 0;

  try {
    // 1. Scan and clean all project documents in 'projects' collection
    const projectsCol = collection(db, 'projects');
    const projectsSnap = await getDocs(projectsCol);

    for (const projDoc of projectsSnap.docs) {
      const data = projDoc.data();
      const scopes = data.scopes;
      if (!Array.isArray(scopes)) continue;

      let projectModified = false;
      const cleanedScopes = scopes.map((scope: any) => {
        const trades = scope.trades;
        if (!Array.isArray(trades)) return scope;

        let scopeModified = false;
        const cleanedTrades = trades.map((trade: any) => {
          let tradeModified = false;
          let attachedDocs = trade.attachedDocs;

          if (Array.isArray(attachedDocs)) {
            const initialLen = attachedDocs.length;
            const validDocs = attachedDocs.filter((d: any) => {
              if (!d || !d.url) return false;
              if (isDocExpired(d)) {
                totalPurgedRefs++;
                return false;
              }
              return true;
            });

            if (validDocs.length !== initialLen) {
              attachedDocs = validDocs;
              tradeModified = true;
            }
          }

          let docUrl = trade.docUrl;
          if (docUrl && typeof docUrl === 'string') {
            if (isDocExpired({ url: docUrl })) {
              docUrl = (attachedDocs && attachedDocs[0]?.url) || '';
              tradeModified = true;
            }
          }

          let attachedDoc = trade.attachedDoc;
          if (attachedDoc && typeof attachedDoc === 'string') {
            if (isDocExpired({ url: attachedDoc })) {
              attachedDoc = (attachedDocs && attachedDocs[0]?.url) || '';
              tradeModified = true;
            }
          }

          if (tradeModified) {
            scopeModified = true;
            return {
              ...trade,
              attachedDocs: attachedDocs || [],
              docUrl: docUrl || '',
              attachedDoc: attachedDoc || ''
            };
          }
          return trade;
        });

        if (scopeModified) {
          projectModified = true;
          return {
            ...scope,
            trades: cleanedTrades
          };
        }
        return scope;
      });

      if (projectModified) {
        try {
          await updateDoc(doc(db, 'projects', projDoc.id), {
            scopes: cleanedScopes,
            updatedAt: new Date().toISOString()
          });
          projectsUpdated++;
          console.log(`[Cleanup] Wiped expired blob references from project ${projDoc.id} (${data.name || 'Untitled'})`);
        } catch (updateErr) {
          console.warn(`[Cleanup] Failed to update project ${projDoc.id}:`, updateErr);
        }
      }
    }

    // 2. Scan and clean all quote documents in 'quotes' collection
    const quotesCol = collection(db, 'quotes');
    const quotesSnap = await getDocs(quotesCol);

    for (const qDoc of quotesSnap.docs) {
      const qData = qDoc.data();
      let quoteModified = false;
      let attachedDocs = qData.attachedDocs;

      if (Array.isArray(attachedDocs)) {
        const initialLen = attachedDocs.length;
        const validDocs = attachedDocs.filter((d: any) => {
          if (!d || !d.url) return false;
          if (isDocExpired(d)) {
            totalPurgedRefs++;
            return false;
          }
          return true;
        });

        if (validDocs.length !== initialLen) {
          attachedDocs = validDocs;
          quoteModified = true;
        }
      }

      let docUrl = qData.docUrl;
      if (docUrl && typeof docUrl === 'string') {
        if (isDocExpired({ url: docUrl })) {
          docUrl = (attachedDocs && attachedDocs[0]?.url) || '';
          quoteModified = true;
        }
      }

      let attachmentUrl = qData.attachmentUrl;
      if (attachmentUrl && typeof attachmentUrl === 'string') {
        if (isDocExpired({ url: attachmentUrl })) {
          attachmentUrl = (attachedDocs && attachedDocs[0]?.url) || '';
          quoteModified = true;
        }
      }

      if (quoteModified) {
        try {
          await updateDoc(doc(db, 'quotes', qDoc.id), {
            attachedDocs: attachedDocs || [],
            docUrl: docUrl || '',
            attachmentUrl: attachmentUrl || '',
            updatedAt: new Date().toISOString()
          });
          quotesUpdated++;
          console.log(`[Cleanup] Wiped expired blob references from quote ${qDoc.id} (${qData.companyName || 'Contractor'})`);
        } catch (quoteErr) {
          console.warn(`[Cleanup] Failed to update quote ${qDoc.id}:`, quoteErr);
        }
      }
    }

    console.log(
      `[Cleanup] Finished: Wiped ${totalPurgedRefs} expired blob reference(s). Updated ${projectsUpdated} project(s) and ${quotesUpdated} quote(s) in Firestore.`
    );
  } catch (err) {
    console.warn('[Cleanup] Error during automated expired blob cleanup routine:', err);
  }

  return { projectsUpdated, quotesUpdated, totalPurgedRefs };
}

/**
 * Safe Document Opening:
 * - If it is a Base64 data: URL, open in a new window using an embedded iframe previewer:
 *   const win = window.open(''); win.document.write('<iframe src="' + doc.url + '" style="width:100%; height:100vh; border:none;"></iframe>');
 * - Completely avoids URL.createObjectURL.
 */
export function openDocumentInNewTab(
  url: string,
  filename?: string,
  onRemoveExpired?: () => void
) {
  if (!url) return;

  // Handle expired temporary blob URLs
  if (url.startsWith('blob:') || url.toLowerCase().includes('expired')) {
    const confirmRemove = window.confirm('This file reference has expired. Would you like to remove it?');
    if (confirmRemove && onRemoveExpired) {
      onRemoveExpired();
    }
    return;
  }

  // Safe opening for Base64 Data URLs via embedded preview iframe
  if (url.startsWith('data:')) {
    const safeTitle = (filename || 'Document Preview').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const win = window.open('');
    if (win) {
      win.document.write(
        '<!DOCTYPE html><html><head><title>' +
        safeTitle +
        '</title><style>html,body{margin:0;padding:0;height:100%;overflow:hidden;background:#525659;}</style></head><body><iframe src="' +
        url +
        '" style="width:100%; height:100vh; border:none;"></iframe></body></html>'
      );
      win.document.close();
      return;
    }
  }

  // Standard HTTPS URL
  window.open(url, '_blank', 'noopener,noreferrer');
}
