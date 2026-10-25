import { collection, getDocs, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { ScopeLineItem } from '../types';

const MOCK_CONTRACTORS = new Set(['edwards concrete', 'zebra plumbing']);

/**
 * One-time startup cleanup routine that deletes duplicate "Demo / Excavation"
 * and unassigned sample scope items from Firestore.
 */
export async function cleanupDuplicateAndMockScopesInFirestore(): Promise<{
  projectsCleaned: number;
  duplicateScopesRemoved: number;
  sampleQuotesDeleted: number;
}> {
  if (!db) return { projectsCleaned: 0, duplicateScopesRemoved: 0, sampleQuotesDeleted: 0 };

  let projectsCleaned = 0;
  let duplicateScopesRemoved = 0;
  let sampleQuotesDeleted = 0;

  try {
    // 1. Scan and clean all project scopes in Firestore
    const projectsCol = collection(db, 'projects');
    const projectsSnap = await getDocs(projectsCol);

    for (const projDoc of projectsSnap.docs) {
      const data = projDoc.data();
      const rawScopes: any[] = data.scopes;
      if (!Array.isArray(rawScopes) || rawScopes.length === 0) continue;

      let projectModified = false;
      const seenScopeKeys = new Set<string>();
      const cleanedScopes: ScopeLineItem[] = [];

      for (const scope of rawScopes) {
        if (!scope) continue;

        // Clean trades by removing mock contractors (Edwards Concrete, Zebra Plumbing)
        const trades = Array.isArray(scope.trades) ? scope.trades : [];
        const initialTradeCount = trades.length;
        const validTrades = trades.filter((t: any) => {
          if (!t) return false;
          const comp = String(t.companyName || t.contractorName || '').toLowerCase().trim();
          return !MOCK_CONTRACTORS.has(comp);
        });

        if (validTrades.length !== initialTradeCount) {
          projectModified = true;
        }

        // Identify unassigned sample "Demo / Excavation" scope
        const scopeNameLower = String(scope.name || '').toLowerCase().trim();
        const isDemoExcavation = scopeNameLower === 'demo / excavation' || scopeNameLower === 'demolition & excavation';
        const hasNoRealTrades = validTrades.length === 0;

        // Determine unique key for deduplication
        const key = String(scope.costCode || scope.scopeCode || scope.id || scope.name || '')
          .toLowerCase()
          .trim();

        // If duplicate detected, merge trades into existing scope and drop the duplicate
        if (seenScopeKeys.has(key)) {
          duplicateScopesRemoved++;
          projectModified = true;
          const existingScope = cleanedScopes.find((s) => {
            const sKey = String(s.costCode || (s as any).scopeCode || s.id || s.name || '')
              .toLowerCase()
              .trim();
            return sKey === key;
          });
          if (existingScope && validTrades.length > 0) {
            const existingTradeIds = new Set((existingScope.trades || []).map((t) => t.id));
            for (const t of validTrades) {
              if (!existingTradeIds.has(t.id)) {
                existingScope.trades.push(t);
              }
            }
          }
          continue;
        }

        // If this is an unassigned sample "Demo / Excavation" with no real contractor quotes, drop it
        if (isDemoExcavation && hasNoRealTrades) {
          duplicateScopesRemoved++;
          projectModified = true;
          continue;
        }

        seenScopeKeys.add(key);
        cleanedScopes.push({
          ...scope,
          trades: validTrades
        });
      }

      if (projectModified || cleanedScopes.length !== rawScopes.length) {
        try {
          await updateDoc(doc(db, 'projects', projDoc.id), {
            scopes: cleanedScopes,
            updatedAt: new Date().toISOString()
          });
          projectsCleaned++;
          console.log(`[Firestore Cleanup] Deduplicated scopes for project ${projDoc.id} (${data.name || 'Untitled'})`);
        } catch (err) {
          console.warn(`[Firestore Cleanup] Error updating project ${projDoc.id}:`, err);
        }
      }
    }

    // 2. Scan and clean any sample quotes (Edwards Concrete, Zebra Plumbing) in quotes collection
    const quotesCol = collection(db, 'quotes');
    const quotesSnap = await getDocs(quotesCol);

    for (const qDoc of quotesSnap.docs) {
      const qData = qDoc.data();
      const comp = String(qData.companyName || qData.contractorName || '').toLowerCase().trim();
      if (MOCK_CONTRACTORS.has(comp)) {
        try {
          await deleteDoc(doc(db, 'quotes', qDoc.id));
          sampleQuotesDeleted++;
          console.log(`[Firestore Cleanup] Deleted sample quote ${qDoc.id} (${comp})`);
        } catch (delErr) {
          console.warn(`[Firestore Cleanup] Error deleting sample quote ${qDoc.id}:`, delErr);
        }
      }
    }

    console.log(
      `[Firestore Cleanup] Finished: Cleaned ${projectsCleaned} project(s), removed ${duplicateScopesRemoved} duplicate/sample scope(s), deleted ${sampleQuotesDeleted} sample quote(s).`
    );
  } catch (err) {
    console.warn('[Firestore Cleanup] Error during scope cleanup routine:', err);
  }

  return { projectsCleaned, duplicateScopesRemoved, sampleQuotesDeleted };
}
