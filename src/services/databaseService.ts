import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  writeBatch
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Project, Contact, FirestoreQuoteRecord, TradeEntry, ScopeLineItem } from '../types';
import { googleAuthService } from './googleAuthService';

export const sanitizePayload = (obj: any): any =>
  JSON.parse(JSON.stringify(obj, (_key, val) => (val === undefined ? null : val)));

export const isProjectDataChanged = (existing: any, incoming: Project): boolean => {
  if (!existing || !incoming) return true;
  if ((existing.name || '').trim() !== (incoming.name || '').trim()) return true;
  if ((existing.code || '').trim() !== (incoming.code || '').trim()) return true;
  if (Number(existing.targetBudget || 0) !== Number(incoming.targetBudget || 0)) return true;
  if ((incoming.scopes?.length || 0) !== (existing.scopes?.length || 0)) return true;

  const extractComparableData = (scopes: ScopeLineItem[] = []) =>
    scopes.map((s) => ({
      id: s.id,
      name: (s.name || '').trim().toLowerCase(),
      phaseId: s.phaseId,
      budgetAmount: Number(s.budgetAmount || 0),
      costCode: String(s.costCode || '').trim(),
      trades: (s.trades || []).map((t) => ({
        id: t.id,
        companyName: (t.companyName || '').trim().toLowerCase(),
        quotedFigure: Number(t.quotedFigure || 0),
        actionStatus: t.actionStatus,
        poSent: Boolean(t.poSent),
        isAwarded: Boolean(t.isAwarded),
        contactEmail: (t.contactEmail || '').trim().toLowerCase(),
        quoteDocId: t.quoteDocId || '',
        attachedDocsCount: t.attachedDocs?.length || 0,
        attachedDocsUrls: (t.attachedDocs || []).map((d) => d.url).sort().join(','),
        notesCount: t.notes?.length || 0,
        notesText: (t.notes || []).map((n) => n.text).join('|'),
        quoteBreakdown: (t.quoteBreakdown || []).map((b) => ({
          itemDescription: (b.itemDescription || '').trim().toLowerCase(),
          amount: Number(b.amount || 0),
          costCode: String(b.costCode || '').trim(),
          inclusionStatus: b.inclusionStatus
        }))
      }))
    }));

  return JSON.stringify(extractComparableData(existing.scopes)) !== JSON.stringify(extractComparableData(incoming.scopes));
};

export const dbService = {
  getActiveUserEmail(): string {
    const user = googleAuthService.getCurrentUser();
    return user?.email || 'admin@thezenithgroup.ca';
  },

  // Projects
  async fetchProjects(): Promise<Project[]> {
    if (!db) return [];
    try {
      const snap = await getDocs(collection(db, 'projects'));
      return snap.docs.map((d) => d.data() as Project);
    } catch (err) {
      console.warn('[dbService] fetchProjects notice:', err);
      return [];
    }
  },

  subscribeToProjects(callback: (projects: Project[]) => void): () => void {
    if (!db) return () => { };
    const colRef = collection(db, 'projects');
    return onSnapshot(
      colRef,
      (snapshot) => {
        const list = snapshot.docs.map((d) => d.data() as Project);
        callback(list);
      },
      (err) => console.warn('[dbService] subscribeToProjects notice:', err)
    );
  },

  async saveProjects(projects: Project[]): Promise<void> {
    if (!db || !projects || projects.length === 0) return;
    try {
      for (const project of projects) {
        if (!project.id) continue;
        const ref = doc(db, 'projects', project.id);
        await setDoc(ref, sanitizePayload(project), { merge: true });
      }
    } catch (err) {
      console.warn('[dbService] saveProjects notice:', err);
    }
  },

  // Contacts
  async fetchContacts(): Promise<Contact[]> {
    if (!db) return [];
    try {
      const snap = await getDocs(collection(db, 'contacts'));
      return snap.docs.map((d) => d.data() as Contact);
    } catch (err) {
      console.warn('[dbService] fetchContacts notice:', err);
      return [];
    }
  },

  subscribeToContacts(callback: (contacts: Contact[]) => void): () => void {
    if (!db) return () => { };
    const colRef = collection(db, 'contacts');
    return onSnapshot(
      colRef,
      (snapshot) => {
        const list = snapshot.docs.map((d) => d.data() as Contact);
        callback(list);
      },
      (err) => console.warn('[dbService] subscribeToContacts notice:', err)
    );
  },

  async saveContact(contact: Contact): Promise<void> {
    if (!db || !contact.id) return;
    try {
      await setDoc(doc(db, 'contacts', contact.id), sanitizePayload(contact), { merge: true });
    } catch (err) {
      console.warn('[dbService] saveContact notice:', err);
    }
  },

  async saveContacts(contacts: Contact[]): Promise<void> {
    if (!db || !contacts || contacts.length === 0) return;
    try {
      for (const contact of contacts) {
        if (!contact.id) continue;
        await setDoc(doc(db, 'contacts', contact.id), sanitizePayload(contact), { merge: true });
      }
    } catch (err) {
      console.warn('[dbService] saveContacts notice:', err);
    }
  },

  async deleteContact(contactId: string): Promise<void> {
    if (!db || !contactId) return;
    try {
      await deleteDoc(doc(db, 'contacts', contactId));
    } catch (err) {
      console.warn('[dbService] deleteContact notice:', err);
    }
  },

  async deleteContacts(contactIds: string[]): Promise<void> {
    if (!db || !contactIds || contactIds.length === 0) return;
    try {
      const batch = writeBatch(db);
      for (const id of contactIds) {
        batch.delete(doc(db, 'contacts', id));
      }
      await batch.commit();
    } catch (err) {
      console.warn('[dbService] deleteContacts notice:', err);
    }
  },

  // Quotes
  async fetchQuotes(): Promise<FirestoreQuoteRecord[]> {
    if (!db) return [];
    try {
      const snap = await getDocs(collection(db, 'quotes'));
      return snap.docs.map((d) => ({ ...d.data(), id: d.id } as FirestoreQuoteRecord));
    } catch (err) {
      console.warn('[dbService] fetchQuotes notice:', err);
      return [];
    }
  },

  async deleteQuote(quoteId: string, _companyName?: string, _projectId?: string): Promise<void> {
    if (!db || !quoteId) return;
    try {
      await deleteDoc(doc(db, 'quotes', quoteId));
    } catch (err) {
      console.warn('[dbService] deleteQuote notice:', err);
    }
  },

  async batchDeleteQuotes(ids: string[], _metadata?: any[]): Promise<void> {
    if (!db || !ids || ids.length === 0) return;
    try {
      const batch = writeBatch(db);
      for (const id of ids) {
        batch.delete(doc(db, 'quotes', id));
      }
      await batch.commit();
    } catch (err) {
      console.warn('[dbService] batchDeleteQuotes notice:', err);
    }
  },

  async wipeMisassignedDemolitionQuotes(): Promise<{ wipedCount: number }> {
    if (!db) return { wipedCount: 0 };
    try {
      const snap = await getDocs(collection(db, 'quotes'));
      let count = 0;
      const batch = writeBatch(db);
      snap.docs.forEach((d) => {
        const data = d.data();
        if (data.costCode === '20020' && !(data.trade || '').toLowerCase().includes('demolition')) {
          batch.delete(d.ref);
          count++;
        }
      });
      if (count > 0) {
        await batch.commit();
      }
      return { wipedCount: count };
    } catch (err) {
      console.warn('[dbService] wipeMisassignedDemolitionQuotes notice:', err);
      return { wipedCount: 0 };
    }
  },

  async purgeExampleAndDemoData(): Promise<{ deletedProjects: number; deletedQuotes: number }> {
    if (!db) return { deletedProjects: 0, deletedQuotes: 0 };
    let deletedProjects = 0;
    let deletedQuotes = 0;
    try {
      const pSnap = await getDocs(collection(db, 'projects'));
      for (const d of pSnap.docs) {
        const name = (d.data()?.name || '').toLowerCase();
        if (name.includes('demo') || name.includes('example') || name.includes('sample')) {
          await deleteDoc(d.ref);
          deletedProjects++;
        }
      }
      const qSnap = await getDocs(collection(db, 'quotes'));
      for (const d of qSnap.docs) {
        const comp = (d.data()?.companyName || '').toLowerCase();
        if (comp.includes('demo') || comp.includes('example') || comp.includes('sample')) {
          await deleteDoc(d.ref);
          deletedQuotes++;
        }
      }
    } catch (err) {
      console.warn('[dbService] purgeExampleAndDemoData notice:', err);
    }
    return { deletedProjects, deletedQuotes };
  },

  // Active Viewers & Collaboration
  registerViewer(scopeId: string): void {
    if (!db || !scopeId) return;
    const email = this.getActiveUserEmail();
    const ref = doc(db, 'active_viewers', scopeId);
    setDoc(ref, { viewers: [email], updatedAt: new Date().toISOString() }, { merge: true }).catch(() => { });
  },

  unregisterViewer(scopeId: string): void {
    if (!db || !scopeId) return;
    const ref = doc(db, 'active_viewers', scopeId);
    deleteDoc(ref).catch(() => { });
  },

  listenToViewers(scopeId: string, callback: (viewers: string[]) => void): () => void {
    if (!db || !scopeId) return () => { };
    const ref = doc(db, 'active_viewers', scopeId);
    return onSnapshot(
      ref,
      (snap) => {
        if (snap.exists()) {
          callback(snap.data()?.viewers || []);
        } else {
          callback([]);
        }
      },
      () => callback([])
    );
  },

  // Records & Real-Time Syncing
  subscribeToRecord(recordKey: string, callback: (data: any) => void): () => void {
    if (!db || !recordKey) return () => { };
    const ref = doc(db, 'records', recordKey);
    return onSnapshot(
      ref,
      (snap) => {
        if (snap.exists()) callback(snap.data());
      },
      (err) => console.warn('[dbService] subscribeToRecord notice:', err)
    );
  },

  async updateTrade(projectId: string, scopeId: string, trade: TradeEntry): Promise<void> {
    if (!db || !projectId) return;
    try {
      const projRef = doc(db, 'projects', projectId);
      const projSnap = await getDoc(projRef);
      if (!projSnap.exists()) return;
      const proj = projSnap.data() as Project;
      const scopes = (proj.scopes || []).map((s) => {
        if (s.id !== scopeId) return s;
        const trades = (s.trades || []).map((t) => (t.id === trade.id ? trade : t));
        return { ...s, trades };
      });
      await updateDoc(projRef, { scopes, updatedAt: new Date().toISOString() });
    } catch (err) {
      console.warn('[dbService] updateTrade notice:', err);
    }
  },

  simulateRemoteUpdate(recordKey: string, payload: any): void {
    if (!db || !recordKey) return;
    const ref = doc(db, 'records', recordKey);
    setDoc(ref, sanitizePayload(payload), { merge: true }).catch(() => { });
  }
};