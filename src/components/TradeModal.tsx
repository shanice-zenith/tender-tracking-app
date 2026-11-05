import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  X,
  Plus,
  DollarSign,
  Users,
  Paperclip,
  Building2,
  Trash2,
  RotateCcw,
  Calculator,
  Layers,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Ban,
  UploadCloud,
  Link as LinkIcon,
  Loader2
} from 'lucide-react';
import { ScopeLineItem, TradeEntry, Contact, ActionItemStatus, AttachedDoc, NoteItem, QuoteBreakdownItem } from '../types';
import { ACTION_STATUS_OPTIONS } from '../data/initialTenderPackages';
import { getTenderTemplateSpecs } from '../data/tenderBreakdownTemplates';
import { formatCurrency } from '../utils/formatters';
import { getContactCategories } from './ContactDirectoryModal';
import { ContractorCombobox } from './ContractorCombobox';
import { collection, addDoc, doc, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { dbService } from '../services/databaseService';
import { getFirestore, collection, getDocs, deleteDoc, doc } from 'firebase/firestore';
import {
  uploadQuoteDocument,
  uploadLocalQuoteFile,
  openDocumentInNewTab,
  showAppToast,
  isValidPermanentUrl,
  MAX_FILE_SIZE_BYTES
} from '../services/fileUploadService';

const sanitizePayload = (obj: any) => JSON.parse(JSON.stringify(obj, (_key, val) => (val === undefined ? null : val)));

interface TradeModalProps {
  isOpen: boolean;
  scope: ScopeLineItem;
  contacts: Contact[];
  projectName?: string;
  projectId?: string;
  trade?: TradeEntry | null;       // <--- Add this
  tradeToEdit?: TradeEntry | null; // <--- Add this
  onClose: () => void;
  onSaveTrade?: (trade: TradeEntry) => void;
}

interface EditableLineItemInput {
  id: string;
  costCode: string;
  itemDescription: string;
  amount: number | string;
  inclusionStatus: 'included' | 'excluded' | 'allowance';
  notes?: string;
  tenderSpecRef?: string;
}
export const TradeModal: React.FC<TradeModalProps> = ({
  isOpen,
  scope,
  contacts,
  projectName,
  projectId,
  trade: propTrade,
  tradeToEdit,
  onClose,
  onSaveTrade,
}) => {
  const trade = propTrade || tradeToEdit || null;

  const [selectedContactId, setSelectedContactId] = useState<string>('');
  const [customName, setCustomName] = useState('');
  const [customCompany, setCustomCompany] = useState('');
  const [customEmail, setCustomEmail] = useState('');
  const [customPhone, setCustomPhone] = useState('');
  const [customCategory, setCustomCategory] = useState('');
  const [actionStatus, setActionStatus] = useState<ActionItemStatus>('Estimate Submitted');
  const [poSent, setPoSent] = useState(false);
  const [isAwarded, setIsAwarded] = useState(false);
  const [docName, setDocName] = useState('');
  const [docUrl, setDocUrl] = useState('');
  const [uploadError, setUploadError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [initialNote, setInitialNote] = useState('');

  // Line items state dynamically populated from Master Tender Breakdown templates
  const [lineItems, setLineItems] = useState<EditableLineItemInput[]>([]);
  const [isAddingCustomItem, setIsAddingCustomItem] = useState(false);
  const [newCustomItem, setNewCustomItem] = useState<{
    costCode: string;
    itemDescription: string;
    amount: number | string;
  }>({
    costCode: '',
    itemDescription: '',
    amount: '',
  });

  // Dynamic Line Item Lookup & Initialization whenever modal opens or scope changes
  useEffect(() => {
    if (isOpen && scope) {
      const specs = getTenderTemplateSpecs(scope.name, scope.costCode);
      const initialItems: EditableLineItemInput[] = specs.map((spec, idx) => ({
        id: `spec-item-${Date.now()}-${idx}`,
        costCode: spec.costCode || scope.costCode || '20000',
        itemDescription: spec.itemDescription,
        amount: '', // Ready for user entry
        inclusionStatus: 'included',
        notes: spec.notes || '',
        tenderSpecRef: spec.tenderSpecRef || `Cost Code ${spec.costCode}`
      }));
      setLineItems(initialItems);
      setIsAddingCustomItem(false);
      setSelectedContactId('');
      setCustomName('');
      setCustomCompany('');
      setCustomEmail('');
      setCustomPhone('');
      setCustomCategory(scope.name || 'General Trade');
      setActionStatus('Estimate Submitted');
      setPoSent(false);
      setIsAwarded(false);
      setDocName('');
      setDocUrl('');
      setUploadError('');
      setInitialNote('');
    }
  }, [isOpen, scope?.id, scope?.name]);

  const [isProcessingFile, setIsProcessingFile] = useState(false);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadError('');

    // 1. Strict size limit validation
    if (file.size > MAX_FILE_SIZE_BYTES) {
      const msg = `File too large (${(file.size / (1024 * 1024)).toFixed(1)}MB). Please select a document under 10MB.`;
      setUploadError(msg);
      showAppToast(msg);
      alert("Attachment upload failed: " + msg);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      return;
    }

    try {
      setIsProcessingFile(true);
      showAppToast('Uploading document...');

      // Upload directly to Firebase Storage ref(storage, `quotes/${quoteId}/${file.name}`) or fallback to /api/upload
      const result = await uploadQuoteDocument(file, scope?.id || 'new_quote');
      setDocUrl(result.url);
      setDocName(result.name || file.name);
      showAppToast('Document ready to attach.');
    } catch (err: any) {
      console.error('File conversion error in TradeModal:', err);
      const errorMessage = err?.message || 'Failed to process document file.';
      setUploadError(errorMessage);
      showAppToast(`Upload failed: ${errorMessage}`);
      alert("Attachment upload failed: " + errorMessage);
    } finally {
      setIsProcessingFile(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Live Auto-Summation Formula: Live Quoted Total = Sum of all included line item Amounts
  const liveQuotedTotal = useMemo(() => {
    return lineItems
      .filter((item) => item.inclusionStatus !== 'excluded')
      .reduce((sum, item) => {
        const val = typeof item.amount === 'number' ? item.amount : parseFloat(item.amount) || 0;
        return sum + val;
      }, 0);
  }, [lineItems]);

  const activeLineItemCount = useMemo(() => {
    return lineItems.filter((it) => it.inclusionStatus !== 'excluded').length;
  }, [lineItems]);

  const excludedLineItemCount = useMemo(() => {
    return lineItems.filter((it) => it.inclusionStatus === 'excluded').length;
  }, [lineItems]);

  // Handle contact combobox change
  const handleContactSelect = (contact: Contact | null) => {
    if (contact) {
      setSelectedContactId(contact.id);
      setCustomName(contact.name);
      setCustomCompany(contact.company);
      setCustomEmail(contact.email);
      setCustomPhone(contact.phone);
      const cats = getContactCategories(contact);
      setCustomCategory(cats.join(', ') || contact.category || '');
    } else {
      setSelectedContactId('');
      setCustomName('');
      setCustomCompany('');
      setCustomEmail('');
      setCustomPhone('');
    }
  };

  const handleCustomFieldChange = () => {
    if (selectedContactId) {
      setSelectedContactId('');
    }
  };

  // Line item direct amount change handler
  const handleLineItemAmountChange = (id: string, value: string) => {
    setLineItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, amount: value } : item))
    );
  };

  // Line item inclusion status toggle
  const handleToggleInclusion = (id: string) => {
    setLineItems((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          const nextStatus = item.inclusionStatus === 'included' ? 'excluded' : 'included';
          return { ...item, inclusionStatus: nextStatus };
        }
        return item;
      })
    );
  };

  // Delete line item
  const handleDeleteLineItem = (id: string) => {
    setLineItems((prev) => prev.filter((item) => item.id !== id));
  };

  // Reset to default template specs
  const handleResetToScopeSpecs = () => {
    if (!scope) return;
    const specs = getTenderTemplateSpecs(scope.name, scope.costCode);
    const initialItems: EditableLineItemInput[] = specs.map((spec, idx) => ({
      id: `spec-item-${Date.now()}-${idx}`,
      costCode: spec.costCode || scope.costCode || '20000',
      itemDescription: spec.itemDescription,
      amount: '',
      inclusionStatus: 'included',
      notes: spec.notes || '',
      tenderSpecRef: spec.tenderSpecRef || `Cost Code ${spec.costCode}`
    }));
    setLineItems(initialItems);
  };

  // Add custom line item
  const handleAddCustomLineItem = () => {
    if (!newCustomItem.itemDescription.trim() || !scope) return;
    const item: EditableLineItemInput = {
      id: `custom-item-${Date.now()}`,
      costCode: newCustomItem.costCode.trim() || scope.costCode || '20000',
      itemDescription: newCustomItem.itemDescription.trim(),
      amount: newCustomItem.amount,
      inclusionStatus: 'included',
      notes: 'Custom contractor line item',
      tenderSpecRef: `Cost Code ${newCustomItem.costCode.trim() || scope.costCode || '20000'}`
    };
    setLineItems((prev) => [...prev, item]);
    setNewCustomItem({
      costCode: scope.costCode || '20000',
      itemDescription: '',
      amount: '',
    });
    setIsAddingCustomItem(false);
  };

  // Early return after hooks
  if (!isOpen || !scope) return null;

  // Real-time variance vs. scope budget
  const scopeBudget = scope.budgetAmount;
  const variance = scopeBudget - liveQuotedTotal;
  const isUnderBudget = variance >= 0;
  const variancePercent = scopeBudget > 0 ? ((liveQuotedTotal - scopeBudget) / scopeBudget) * 100 : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    let contractorName = customName.trim();
    let companyName = customCompany.trim();
    let contactEmail = customEmail.trim();
    let contactPhone = customPhone.trim();
    let category = customCategory.trim();

    if (selectedContactId) {
      const contact = contacts.find((c) => c.id === selectedContactId);
      if (contact) {
        contractorName = contact.name;
        companyName = contact.company;
        contactEmail = contact.email;
        contactPhone = contact.phone;
        const cats = getContactCategories(contact);
        category = cats.join(', ') || contact.category || 'General Trade';
      }
    }

    if (!contractorName && !companyName) {
      companyName = 'Trade Subcontractor';
      contractorName = 'Estimator';
    }

    const nowIso = new Date().toISOString();
    const attachedDocs: AttachedDoc[] = [];
    const trimmedUrl = docUrl.trim();
    if (trimmedUrl && isValidPermanentUrl(trimmedUrl)) {
      attachedDocs.push({
        id: `doc-${Date.now()}`,
        name: docName.trim() || `${companyName || 'Quote'}_Document.pdf`,
        url: trimmedUrl,
        type: 'quote',
        addedAt: nowIso.split('T')[0],
        uploadedAt: nowIso
      });
    }

    const notes: NoteItem[] = trade?.notes ? [...trade.notes] : [];
    if (initialNote.trim()) {
      notes.push({
        id: `n-${Date.now()}`,
        text: initialNote.trim(),
        author: 'Shanice (PM)',
        timestamp: new Date().toLocaleString([], {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        })
      });
    }

    // 3. Save & Data Storage Engine:
    // Convert line items into permanent QuoteBreakdownItem[] structure
    const quoteBreakdownItems: QuoteBreakdownItem[] = lineItems.map((item) => {
      const numAmt = typeof item.amount === 'number' ? item.amount : parseFloat(item.amount) || 0;
      return {
        id: item.id,
        costCode: item.costCode || scope.costCode || '20000',
        itemDescription: item.itemDescription,
        amount: numAmt,
        inclusionStatus: item.inclusionStatus,
        notes: item.notes || '',
        tenderSpecRef: item.tenderSpecRef || `Cost Code ${item.costCode || scope.costCode || '20000'}`
      };
    });

    const finalDocUrl = docUrl.trim() || (attachedDocs[0]?.url || '');
    const finalCostCode = scope.costCode || (quoteBreakdownItems[0]?.costCode || '20000');
    const finalTrade = scope.name || category || 'General Scope';
    const submittedTime = new Date().toISOString();
    const effectiveProjectId = projectId || scope.projectId || '';
    const effectiveProjectName = projectName || '';
    const activeUserEmail = dbService.getActiveUserEmail();

    const newQuote = {
      id: trade?.id || undefined, // Reuses existing trade/quote ID for revisions
      scopeId: scope?.id || '',   // <-- CRITICAL: Permanently binds quote to this exact scope
      projectId: effectiveProjectId,
      projectName: effectiveProjectName,
      trade: finalTrade,
      tradeScope: finalTrade,
      tenderItem: finalTrade,
      costCode: finalCostCode,
      companyName: companyName || 'Specialist Subcontractor',
      contractorName: contractorName || 'Estimator',
      email: contactEmail || '',
      emailAddress: contactEmail || '',
      phone: contactPhone || '',
      quotedFigure: liveQuotedTotal,
      enteredAmount: liveQuotedTotal,
      amount: liveQuotedTotal,
      submittedAt: trade?.submittedAt || submittedTime,
      revisionNumber: ((trade as any)?.revisionNumber || 1) + (trade ? 1 : 0),
      docUrl: finalDocUrl || null,
      attachedDocs: attachedDocs,
      notes: initialNote.trim() || '',
      status: trade?.status || 'Pending Review',
      actionItemStatus: actionStatus || 'Estimate Submitted',
      actionStatus: actionStatus || 'Estimate Submitted',
      quoteBreakdown: quoteBreakdownItems,
      lastModifiedBy: activeUserEmail,
      updatedAt: submittedTime
    };

    try {
      // 1. Determine if this is a quote revision or a brand new submission
      let finalDocId = (trade as any)?.quoteDocId || trade?.id;

      if (finalDocId) {
        // REVISION: Overwrite existing quote in Firestore using merge
        await setDoc(doc(db, 'quotes', finalDocId), sanitizePayload(newQuote), { merge: true });
        showAppToast(`Quote updated live in Firestore: ${companyName} ($${liveQuotedTotal.toLocaleString()})`);
      } else {
        // NEW QUOTE: Create new document in Firestore
        const docRef = await addDoc(collection(db, 'quotes'), sanitizePayload(newQuote));
        finalDocId = docRef.id;
        showAppToast(`Quote saved live to Firestore: ${companyName} ($${liveQuotedTotal.toLocaleString()})`);
      }

      // 2. Sync to parent state with the confirmed document ID
      if (onSaveTrade) {
        onSaveTrade({
          id: finalDocId,
          quoteDocId: finalDocId,
          scopeId: scope?.id || '',
          contactId: selectedContactId || undefined,
          contractorName: contractorName || companyName,
          companyName: companyName,
          contactEmail: contactEmail || undefined,
          contactPhone: contactPhone || undefined,
          category: finalTrade,
          quotedFigure: liveQuotedTotal,
          currency: 'CAD',
          attachedDocs: attachedDocs,
          docUrl: finalDocUrl || undefined,
          actionStatus: actionStatus || 'Estimate Submitted',
          posent: poSent,
          isAwarded: isAwarded,
          notes: notes,
          quoteBreakdown: quoteBreakdownItems,
          costCode: finalCostCode
        });
      }
    } catch (err: any) {
      console.error('[Firestore] Error saving quote:', err);
      showAppToast(`Notice saving quote: ${err?.message || String(err)}`);
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 md:p-6 animate-in fade-in duration-150">
      <div className="bg-white w-full max-w-3xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-200">

        {/* ================= MODAL HEADER ================= */}
        <div className="p-4 sm:p-5 bg-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-600 rounded-xl shadow-xs">
              <Users className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 text-[10px] font-bold bg-blue-500/30 text-blue-200 border border-blue-400/40 rounded-md">
                  Phase {scope.phaseId}
                </span>
                <span className="text-xs text-slate-400">Target Budget: {formatCurrency(scope.budgetAmount)}</span>
              </div>
              <h3 className="font-extrabold text-base text-white mt-0.5 leading-tight">
                Add Trade / Contractor Quote — {scope.name}
              </h3>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
            title="Close modal (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ================= FORM BODY ================= */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-5 overflow-y-auto flex-1 text-xs">

          {/* Section: Contractor Selection */}
          <div className="space-y-3 p-4 bg-slate-50 rounded-xl border border-slate-200">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-extrabold text-slate-800 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-blue-600" />
                <span>Contractor Information</span>
              </label>
              <span className="text-[11px] text-slate-500 font-medium">Select existing or enter new</span>
            </div>

            <div>
              <ContractorCombobox
                contacts={contacts}
                onSelect={handleContactSelect}
                selectedContactId={selectedContactId}
              />
            </div>

            {/* Custom Contact Details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div>
                <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">Company Name</label>
                <input
                  type="text"
                  placeholder="e.g. Clover Hill Construction"
                  value={customCompany}
                  onChange={(e) => {
                    setCustomCompany(e.target.value);
                    handleCustomFieldChange();
                  }}
                  className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">Contact Person</label>
                <input
                  type="text"
                  placeholder="e.g. John O'Boyle"
                  value={customName}
                  onChange={(e) => {
                    setCustomName(e.target.value);
                    handleCustomFieldChange();
                  }}
                  className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">Email Address</label>
                <input
                  type="email"
                  placeholder="e.g. john@cloverhill.ca"
                  value={customEmail}
                  onChange={(e) => {
                    setCustomEmail(e.target.value);
                    handleCustomFieldChange();
                  }}
                  className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">Phone Number</label>
                <input
                  type="text"
                  placeholder="e.g. 555-0199"
                  value={customPhone}
                  onChange={(e) => {
                    setCustomPhone(e.target.value);
                    handleCustomFieldChange();
                  }}
                  className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs"
                />
              </div>
            </div>
          </div>

          {/* ================= 1. DYNAMIC LINE ITEM SECTION ================= */}
          <div className="space-y-3 p-4 bg-blue-50/40 rounded-xl border border-blue-200/80 shadow-2xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-blue-600" />
                  <h4 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider">
                    Itemized Scope Breakdown Inputs
                  </h4>
                  <span className="px-2 py-0.5 bg-blue-100 text-blue-800 font-bold text-[10px] rounded-full">
                    {lineItems.length} {lineItems.length === 1 ? 'line item' : 'line items'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Dynamic line items pulled from master tender breakdown for <strong className="text-slate-800">{scope.name}</strong>.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleResetToScopeSpecs}
                  className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-slate-600 hover:text-slate-900 bg-white border border-slate-200 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer shadow-2xs"
                  title="Reset lines to master tender breakdown items"
                >
                  <RotateCcw className="w-3 h-3 text-slate-500" />
                  <span>Reset Specs</span>
                </button>

                {!isAddingCustomItem && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsAddingCustomItem(true);
                      setNewCustomItem({
                        costCode: scope.costCode || '20000',
                        itemDescription: '',
                        amount: '',
                      });
                    }}
                    className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors cursor-pointer shadow-xs"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Add Sub-Item</span>
                  </button>
                )}
              </div>
            </div>

            {/* Custom line item input sub-form */}
            {isAddingCustomItem && (
              <div className="p-3 bg-white border border-blue-300 rounded-xl space-y-2 animate-in fade-in duration-150">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-extrabold text-blue-900">Add Custom Scope Line Item</span>
                  <button
                    type="button"
                    onClick={() => setIsAddingCustomItem(false)}
                    className="text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                  <div className="sm:col-span-3">
                    <input
                      type="text"
                      placeholder="Cost Code (e.g. 20040)"
                      value={newCustomItem.costCode}
                      onChange={(e) => setNewCustomItem({ ...newCustomItem, costCode: e.target.value })}
                      className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono font-bold"
                    />
                  </div>
                  <div className="sm:col-span-6">
                    <input
                      type="text"
                      placeholder="Line Item Description"
                      value={newCustomItem.itemDescription}
                      onChange={(e) => setNewCustomItem({ ...newCustomItem, itemDescription: e.target.value })}
                      className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-medium"
                    />
                  </div>
                  <div className="sm:col-span-3 flex items-center gap-1.5">
                    <div className="relative flex-1">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold">$</span>
                      <input
                        type="number"
                        step="any"
                        min="0"
                        placeholder="0.00"
                        value={newCustomItem.amount}
                        onChange={(e) => setNewCustomItem({ ...newCustomItem, amount: e.target.value })}
                        className="w-full pl-6 pr-2 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold font-mono"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={handleAddCustomLineItem}
                      className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg shrink-0 cursor-pointer"
                    >
                      Add
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Itemized Input Fields Table */}
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
              <div className="divide-y divide-slate-100">
                {lineItems.map((item, index) => {
                  const isExcluded = item.inclusionStatus === 'excluded';

                  return (
                    <div
                      key={item.id}
                      className={`p-3 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${isExcluded ? 'bg-slate-50/70 opacity-60' : 'hover:bg-slate-50/50'
                        }`}
                    >
                      {/* Left: Item # + Cost Code Badge + Item Description */}
                      <div className="flex items-start gap-2.5 flex-1 min-w-0">
                        <span className="text-[11px] font-mono text-slate-400 pt-1 shrink-0 w-4">
                          {index + 1}.
                        </span>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                            <span className="px-2 py-0.5 rounded font-mono text-[10px] font-bold bg-slate-100 text-slate-800 border border-slate-200 shrink-0">
                              {item.costCode || '20000'}
                            </span>
                            {item.notes && (
                              <span className="text-[10px] text-slate-400 italic truncate max-w-[200px]">
                                {item.notes}
                              </span>
                            )}
                          </div>
                          <p className={`font-semibold text-xs leading-snug ${isExcluded ? 'line-through text-slate-400' : 'text-slate-900'}`}>
                            {item.itemDescription}
                          </p>
                        </div>
                      </div>

                      {/* Right: Inclusion Status Button + Amount Numeric Input + Delete */}
                      <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                        <button
                          type="button"
                          onClick={() => handleToggleInclusion(item.id)}
                          className={`px-2 py-1 rounded text-[10px] font-bold uppercase transition-colors cursor-pointer border ${item.inclusionStatus === 'included'
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100'
                            : 'bg-slate-100 text-slate-500 border-slate-300 hover:bg-slate-200 line-through'
                            }`}
                          title="Click to toggle Included / Excluded from live sum"
                        >
                          {item.inclusionStatus === 'excluded' && <Ban className="w-2.5 h-2.5 inline mr-1" />}
                          {item.inclusionStatus}
                        </button>

                        <div className="relative w-36">
                          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">$</span>
                          <input
                            type="number"
                            min="0"
                            step="any"
                            placeholder="0.00"
                            value={item.amount}
                            onChange={(e) => handleLineItemAmountChange(item.id, e.target.value)}
                            disabled={isExcluded}
                            className={`w-full pl-6 pr-2.5 py-1.5 rounded-lg text-right font-mono font-bold text-xs border focus:outline-none transition-all shadow-2xs ${isExcluded
                              ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed'
                              : 'bg-white border-slate-300 text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20'
                              }`}
                          />
                        </div>

                        <button
                          type="button"
                          onClick={() => handleDeleteLineItem(item.id)}
                          className="p-1 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                          title="Remove line item"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* ================= 2. AUTO-CALCULATED TOTAL & LIVE VARIANCE ================= */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 p-4 bg-slate-900 text-white rounded-xl shadow-xs">
            {/* Live Quoted Total Card (Read-Only / Calculated) */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-[11px] uppercase font-extrabold tracking-wider text-blue-400 flex items-center gap-1.5">
                  <Calculator className="w-3.5 h-3.5 text-blue-400" />
                  Quoted Figure ($ CAD, excl. GST)
                </span>
                <span className="text-[10px] font-semibold text-slate-400">Auto-Calculated</span>
              </div>

              <div className="relative">
                <div className="w-full px-3.5 py-2.5 bg-slate-800/90 border border-slate-700 rounded-xl flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xl font-black text-white font-mono tracking-tight">
                      {formatCurrency(liveQuotedTotal)}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-400/30">
                      Live Sum
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-400">
                    {activeLineItemCount} active {activeLineItemCount === 1 ? 'item' : 'items'}
                    {excludedLineItemCount > 0 && ` (${excludedLineItemCount} excluded)`}
                  </span>
                </div>
              </div>
              <p className="text-[10px] text-slate-400 italic">
                Automatically calculated as the live sum of all active line items above.
              </p>
            </div>

            {/* Scope Budget vs Variance Card */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-[11px] uppercase font-extrabold tracking-wider">
                  Target Budget Variance
                </span>
                <span className="text-[10px] text-slate-400">Budget: {formatCurrency(scopeBudget)}</span>
              </div>

              <div className={`w-full px-3.5 py-2.5 rounded-xl border flex items-center justify-between ${isUnderBudget
                ? 'bg-emerald-950/50 border-emerald-600/40 text-emerald-300'
                : 'bg-rose-950/50 border-rose-600/40 text-rose-300'
                }`}>
                <div className="flex items-center gap-2">
                  {isUnderBudget ? (
                    <TrendingDown className="w-4 h-4 text-emerald-400 shrink-0" />
                  ) : (
                    <TrendingUp className="w-4 h-4 text-rose-400 shrink-0" />
                  )}
                  <span className="text-xl font-black font-mono tracking-tight">
                    {isUnderBudget ? `-${formatCurrency(Math.abs(variance))}` : `+${formatCurrency(Math.abs(variance))}`}
                  </span>
                </div>
                <span className="text-xs font-extrabold">
                  {isUnderBudget
                    ? `${Math.abs(variancePercent).toFixed(1)}% savings`
                    : `+${variancePercent.toFixed(1)}% over budget`}
                </span>
              </div>

              <p className="text-[10px] text-slate-400">
                Real-time variance calculated against baseline target budget.
              </p>
            </div>
          </div>

          {/* Section: Action Item Status & Workflow Checks */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 bg-slate-50 rounded-xl border border-slate-200">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Action Item Status *
              </label>
              <select
                value={actionStatus}
                onChange={(e) => setActionStatus(e.target.value as ActionItemStatus)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer shadow-2xs"
              >
                {ACTION_STATUS_OPTIONS.map((st) => (
                  <option key={st} value={st}>
                    {st}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col justify-center space-y-2 pt-2 sm:pt-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={poSent}
                  onChange={(e) => setPoSent(e.target.checked)}
                  className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500 cursor-pointer"
                />
                <span className="text-xs font-bold text-slate-800">PO Sent (Delivered)</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isAwarded}
                  onChange={(e) => setIsAwarded(e.target.checked)}
                  className="w-4 h-4 text-amber-500 rounded border-slate-300 focus:ring-amber-500 cursor-pointer"
                />
                <span className="text-xs font-bold text-slate-800">Awarded / Preferred Quote</span>
              </label>
            </div>
          </div>

          {/* Section: Attached Document Reference */}
          <div className="space-y-3 p-4 bg-slate-50 rounded-xl border border-slate-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 font-bold text-slate-700 text-xs">
                <Paperclip className="w-3.5 h-3.5 text-blue-600" />
                <span>Attached Document (Local File)</span>
              </div>
              <span className="text-[10px] text-slate-400 font-mono">Max 10MB • PDF, DOC, DOCX, PNG, JPG</span>
            </div>

            {uploadError && (
              <div className="p-2 bg-red-50 border border-red-200 rounded-md text-red-600 text-xs flex items-center gap-2">
                <Ban className="w-3.5 h-3.5 shrink-0" />
                <span>{uploadError}</span>
              </div>
            )}

            {docUrl && docName ? (
              <div className="flex items-center justify-between p-3 bg-blue-50/50 border border-blue-100 rounded-lg">
                <div className="flex items-center gap-2">
                  <Paperclip className="w-4 h-4 text-blue-600 shrink-0" />
                  <a
                    href={docUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => {
                      e.preventDefault();
                      openDocumentInNewTab(docUrl, docName);
                    }}
                    className="text-xs font-semibold text-blue-700 hover:underline break-all"
                  >
                    {docName}
                  </a>
                  <span className="text-[10px] font-medium text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded-md whitespace-nowrap">Attached</span>
                </div>
                <button
                  type="button"
                  onClick={() => { setDocUrl(''); setDocName(''); }}
                  className="text-[10px] text-slate-500 hover:text-red-600 font-bold uppercase transition-colors shrink-0 ml-2"
                >
                  Remove
                </button>
              </div>
            ) : (
              <div className="relative border-2 border-dashed border-slate-300 rounded-lg p-5 bg-white hover:bg-slate-50 transition-colors flex flex-col items-center justify-center cursor-pointer group">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
                />
                <UploadCloud className="w-6 h-6 text-slate-400 group-hover:text-blue-500 transition-colors mb-2" />
                <span className="text-xs font-medium text-slate-600 text-center leading-relaxed">
                  <span className="font-bold text-blue-600">Drag & drop</span> quote document here<br />or click to select from your device
                </span>
                <span className="text-[10px] text-slate-400 mt-1.5 font-mono bg-slate-100 px-2 py-0.5 rounded-md">Instant preview enabled</span>
              </div>
            )}
          </div>

          {/* Section: Initial Note */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Initial Note / Clarification Memo
            </label>
            <textarea
              rows={2}
              placeholder="e.g. Scope includes full excavation, backfill, rough grading and DSSP install per engineer review..."
              value={initialNote}
              onChange={(e) => setInitialNote(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
            />
          </div>

          {/* ================= MODAL ACTIONS ================= */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-between">
            <div className="text-[11px] text-slate-500">
              Line items &amp; sum will be saved to the trade record.
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                id="add-trade-quote-submit-btn"
                className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-extrabold bg-blue-600 hover:bg-blue-500 text-white rounded-xl transition-colors shadow-xs cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Add Trade Quote ({formatCurrency(liveQuotedTotal)})</span>
              </button>
            </div>
          </div>

        </form>
      </div>
    </div>
  );
};
