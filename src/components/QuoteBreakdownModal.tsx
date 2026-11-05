import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  DollarSign,
  TrendingDown,
  TrendingUp,
  CheckCircle2,
  Plus,
  Trash2,
  Edit2,
  Check,
  RotateCcw,
  Download,
  FileSpreadsheet,
  Award,
  Info,
  Building2,
  Ban,
  AlertTriangle,
  Sparkles,
  RefreshCw
} from 'lucide-react';
import { TradeEntry, ScopeLineItem, QuoteBreakdownItem } from '../types';
import { generateDefaultBreakdownItems } from '../data/tenderBreakdownTemplates';
import { formatCurrency, getStatusBadgeClasses } from '../utils/formatters';
import { dbService } from '../services/databaseService';
import { googleAuthService } from '../services/googleAuthService';
import { sheetsSyncService } from '../services/sheetsSyncService';
import { storageService } from '../services/storageService';

interface QuoteBreakdownModalProps {
  isOpen: boolean;
  trade: TradeEntry | null;
  scope: ScopeLineItem | null;
  projectName?: string;
  projectCode?: string;
  onClose: () => void;
  onSaveTrade: (updatedTrade: TradeEntry) => void;
}

export const QuoteBreakdownModal: React.FC<QuoteBreakdownModalProps> = ({
  isOpen,
  trade,
  scope,
  projectName,
  projectCode,
  onClose,
  onSaveTrade,
}) => {
  // Local state for editing the items
  const [items, setItems] = useState<QuoteBreakdownItem[]>([]);
  const [activeViewers, setActiveViewers] = useState<any[]>([]);
  const [localDirtyItemIds, setLocalDirtyItemIds] = useState<Set<string>>(new Set());

  // Auto-save feedback state
  const [autoSaveIndicator, setAutoSaveIndicator] = useState<{
    status: 'idle' | 'saving' | 'saved';
    message: string;
    time?: string;
    user?: string;
  }>({ status: 'idle', message: '' });

  // Conflict prevention state
  const [conflictAlert, setConflictAlert] = useState<{
    remoteUser: string;
    message: string;
    remoteItems: QuoteBreakdownItem[];
    hasConflict: boolean;
  } | null>(null);

  // Adding new item state
  const [isAddingItem, setIsAddingItem] = useState(false);
  const [newItemData, setNewItemData] = useState<Partial<QuoteBreakdownItem>>({
    costCode: scope?.costCode || '20000',
    itemDescription: '',
    amount: 0,
    inclusionStatus: 'included',
    notes: '',
    tenderSpecRef: ''
  });

  // Track active viewers for optimistic locking visibility
  useEffect(() => {
    if (isOpen && scope && trade) {
      const uniqueId = `${scope.id}_${trade.id}`;
      dbService.registerViewer(uniqueId);

      const unsubscribe = dbService.listenToViewers(uniqueId, (viewers) => {
        const currentUser = googleAuthService.getCurrentUser();
        const otherViewers = viewers.filter(v => v.email !== currentUser?.email);
        setActiveViewers(otherViewers);
      });

      return () => {
        unsubscribe();
        dbService.unregisterViewer(uniqueId);
      };
    }
  }, [isOpen, scope, trade]);

  // Load existing quote breakdown or generate standard tender form breakdown
  useEffect(() => {
    if (trade && scope && isOpen) {
      if (trade.quoteBreakdown && trade.quoteBreakdown.length > 0) {
        setItems(trade.quoteBreakdown);
      } else {
        const defaults = generateDefaultBreakdownItems(scope.name, trade.quotedFigure, scope.budgetAmount);
        setItems(defaults);
      }
      setIsAddingItem(false);
      setLocalDirtyItemIds(new Set());
      setConflictAlert(null);
    }
  }, [trade, scope, isOpen]);

  // Subscribe to real-time remote updates for Conflict Prevention Alert
  useEffect(() => {
    if (!isOpen || !scope || !trade) return;
    const recordKey = `${scope.id}_${trade.id}`;
    const currentUserEmail = dbService.getActiveUserEmail();

    const unsubscribe = dbService.subscribeToRecord(recordKey, (remoteData) => {
      if (!remoteData) return;
      const remoteUser = remoteData.lastModifiedBy;

      // Check if update came from another user session (e.g., Nadia or Shanice)
      if (remoteUser && remoteUser !== currentUserEmail) {
        const remoteBreakdown: QuoteBreakdownItem[] = remoteData.quoteBreakdown || [];
        if (remoteBreakdown.length > 0) {
          let hasConflict = false;
          let mergedCount = 0;

          // Merge non-conflicting edits automatically
          const merged = items.map((localItem) => {
            const remoteItem = remoteBreakdown.find(
              (r) => r.id === localItem.id || r.itemDescription === localItem.itemDescription
            );
            if (!remoteItem) return localItem;

            const isLocallyEdited = localDirtyItemIds.has(localItem.id);
            if (!isLocallyEdited) {
              // Not modified locally in current session -> merge seamlessly
              if (
                localItem.amount !== remoteItem.amount ||
                localItem.notes !== remoteItem.notes ||
                localItem.inclusionStatus !== remoteItem.inclusionStatus
              ) {
                mergedCount++;
              }
              return { ...localItem, ...remoteItem };
            } else {
              // Local user edited this item concurrently
              if (
                localItem.amount !== remoteItem.amount ||
                localItem.notes !== remoteItem.notes
              ) {
                hasConflict = true;
              }
              return localItem; // preserve local user's draft
            }
          });

          // Check if remote added line items
          remoteBreakdown.forEach((r) => {
            if (!merged.some((m) => m.id === r.id || m.itemDescription === r.itemDescription)) {
              merged.push(r);
              mergedCount++;
            }
          });

          if (mergedCount > 0) {
            setItems(merged);
          }

          setConflictAlert({
            remoteUser,
            message: hasConflict
              ? `${remoteUser} updated items in this quote concurrently. Your uncommitted edits were preserved, and non-conflicting fields were merged.`
              : `${remoteUser} updated this record. Non-conflicting changes were merged automatically.`,
            remoteItems: remoteBreakdown,
            hasConflict
          });
        }
      }
    });

    return () => unsubscribe();
  }, [isOpen, scope, trade, localDirtyItemIds, items]);

  // Handle ESC key to close
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Direct Summation: Live Quoted Total = Sum of all line item Amounts (Exclude any line items where INCLUSION STATUS is 'excluded')
  const liveQuotedTotal = useMemo(() => {
    return items
      .filter((it) => it.inclusionStatus !== 'excluded')
      .reduce((sum, it) => sum + (Number(it.amount) || 0), 0);
  }, [items]);

  const excludedCount = useMemo(() => {
    return items.filter((it) => it.inclusionStatus === 'excluded').length;
  }, [items]);

  const includedCount = useMemo(() => {
    return items.filter((it) => it.inclusionStatus !== 'excluded').length;
  }, [items]);

  // Early return after all hooks have been declared
  if (!isOpen || !trade || !scope) return null;

  // Real-time calculations for Budget Variance: (Live Quoted Total − Scope Target Budget)
  const scopeBudget = scope.budgetAmount;
  const budgetVariance = liveQuotedTotal - scopeBudget;
  const isUnderBudget = budgetVariance <= 0;
  const variancePercent = scopeBudget > 0 ? (budgetVariance / scopeBudget) * 100 : 0;

  // Helper for controlled typing updates
  const handleItemLocalChange = (itemId: string, field: keyof QuoteBreakdownItem, val: any) => {
    setItems((prev) =>
      prev.map((it) => (it.id === itemId ? { ...it, [field]: val } : it))
    );
  };

  // Central Auto-Save Method on Blur or Selection Change
  const handleAutoSaveItemField = async (itemId: string, field: keyof QuoteBreakdownItem, val: any) => {
    const updatedItems = items.map((it) => {
      if (it.id === itemId) {
        return {
          ...it,
          [field]: field === 'amount' ? (parseFloat(val) || 0) : val
        };
      }
      return it;
    });

    setItems(updatedItems);
    setLocalDirtyItemIds((prev) => new Set(prev).add(itemId));

    const updatedItem = updatedItems.find((it) => it.id === itemId);
    if (!updatedItem) return;

    // Direct Summation
    const newQuotedTotal = updatedItems
      .filter((it) => it.inclusionStatus !== 'excluded')
      .reduce((sum, it) => sum + (Number(it.amount) || 0), 0);

    const userEmail = dbService.getActiveUserEmail();
    const nowIso = new Date().toISOString();
    const nowDisplay = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    const updatedTrade: TradeEntry = {
      ...trade,
      quotedFigure: newQuotedTotal,
      quoteBreakdown: updatedItems,
      lastModifiedBy: userEmail,
      updatedAt: nowIso,
      lastSyncedAt: nowDisplay
    };

    setAutoSaveIndicator({
      status: 'saving',
      message: 'Saving to Firestore & syncing Google Sheet row...',
      time: nowDisplay,
      user: userEmail
    });

    // 1. Notify parent view state
    onSaveTrade(updatedTrade);

    // 2. Persist to Firestore with active session attribution
    try {
      await dbService.updateTrade(scope.projectId || '', scope.id, updatedTrade);
    } catch (err) {
      console.warn('Firestore auto-save error:', err);
    }

    // 3. Bi-Directional Google Sheets Webhook Sync for this single row
    try {
      const sheetsConfig = storageService.getSheetsConfig();
      await sheetsSyncService.syncSingleRow({
        projectId: scope.projectId,
        project: projectName || 'Glenbrook 44',
        projectCode: projectCode || 'GL44',
        phaseCode: scope.phaseId,
        scopeId: scope.id,
        scopeName: scope.name,
        tradeId: trade.id,
        companyName: trade.companyName,
        contractorName: trade.contractorName,
        itemDescription: updatedItem.itemDescription,
        amount: updatedItem.amount,
        costCode: updatedItem.costCode,
        notes: updatedItem.notes,
        actionStatus: trade.actionStatus,
        poSent: trade.poSent,
        isAwarded: trade.isAwarded,
        inclusionStatus: updatedItem.inclusionStatus,
        lastModifiedBy: userEmail,
        updatedAt: nowIso
      }, sheetsConfig);

      setAutoSaveIndicator({
        status: 'saved',
        message: `Auto-saved & Google Sheet row synced at ${nowDisplay} (${(userEmail || 'User').split('@')[0]})`,
        time: nowDisplay,
        user: userEmail
      });
    } catch (err) {
      setAutoSaveIndicator({
        status: 'saved',
        message: `Saved to Firestore at ${nowDisplay}`,
        time: nowDisplay,
        user: userEmail
      });
    }
  };

  // Delete an item
  const handleDeleteItem = async (id: string) => {
    const updatedItems = items.filter((it) => it.id !== id);
    setItems(updatedItems);

    const newQuotedTotal = updatedItems
      .filter((it) => it.inclusionStatus !== 'excluded')
      .reduce((sum, it) => sum + (Number(it.amount) || 0), 0);

    const userEmail = dbService.getActiveUserEmail();
    const nowIso = new Date().toISOString();

    const updatedTrade: TradeEntry = {
      ...trade,
      quotedFigure: newQuotedTotal,
      quoteBreakdown: updatedItems,
      lastModifiedBy: userEmail,
      updatedAt: nowIso
    };

    onSaveTrade(updatedTrade);
    await dbService.updateTrade(scope.projectId || '', scope.id, updatedTrade);
  };

  // Handle adding new item
  const handleAddNewItem = async () => {
    if (!newItemData.itemDescription?.trim()) return;
    const amt = Number(newItemData.amount) || 0;

    const newItem: QuoteBreakdownItem = {
      id: `item-${Date.now()}`,
      costCode: newItemData.costCode || scope.costCode || '20000',
      itemDescription: newItemData.itemDescription.trim(),
      amount: amt,
      inclusionStatus: newItemData.inclusionStatus || 'included',
      notes: newItemData.notes || '',
      tenderSpecRef: newItemData.tenderSpecRef || `Cost Code ${newItemData.costCode || '20000'}`
    };

    const updatedItems = [...items, newItem];
    setItems(updatedItems);
    setIsAddingItem(false);
    setNewItemData({
      costCode: scope.costCode || '20000',
      itemDescription: '',
      amount: 0,
      inclusionStatus: 'included',
      notes: '',
      tenderSpecRef: ''
    });

    const newQuotedTotal = updatedItems
      .filter((it) => it.inclusionStatus !== 'excluded')
      .reduce((sum, it) => sum + (Number(it.amount) || 0), 0);

    const userEmail = dbService.getActiveUserEmail();
    const nowIso = new Date().toISOString();

    const updatedTrade: TradeEntry = {
      ...trade,
      quotedFigure: newQuotedTotal,
      quoteBreakdown: updatedItems,
      lastModifiedBy: userEmail,
      updatedAt: nowIso
    };

    onSaveTrade(updatedTrade);
    await dbService.updateTrade(scope.projectId || '', scope.id, updatedTrade);

    const sheetsConfig = storageService.getSheetsConfig();
    await sheetsSyncService.syncSingleRow({
      projectId: scope.projectId,
      project: projectName || 'Glenbrook 44',
      projectCode: projectCode || 'GL44',
      phaseCode: scope.phaseId,
      scopeId: scope.id,
      scopeName: scope.name,
      tradeId: trade.id,
      companyName: trade.companyName,
      contractorName: trade.contractorName,
      itemDescription: newItem.itemDescription,
      amount: newItem.amount,
      costCode: newItem.costCode,
      notes: newItem.notes,
      actionStatus: trade.actionStatus,
      poSent: trade.poSent,
      isAwarded: trade.isAwarded,
      inclusionStatus: newItem.inclusionStatus,
      lastModifiedBy: userEmail,
      updatedAt: nowIso
    }, sheetsConfig);
  };

  // Reset to default tender form items
  const handleResetToStandard = async () => {
    const defaults = generateDefaultBreakdownItems(scope.name, trade.quotedFigure, scope.budgetAmount);
    setItems(defaults);

    const newQuotedTotal = defaults
      .filter((it) => it.inclusionStatus !== 'excluded')
      .reduce((sum, it) => sum + (Number(it.amount) || 0), 0);

    const userEmail = dbService.getActiveUserEmail();
    const nowIso = new Date().toISOString();

    const updatedTrade: TradeEntry = {
      ...trade,
      quotedFigure: newQuotedTotal,
      quoteBreakdown: defaults,
      lastModifiedBy: userEmail,
      updatedAt: nowIso
    };

    onSaveTrade(updatedTrade);
    await dbService.updateTrade(scope.projectId || '', scope.id, updatedTrade);
  };

  // Save changes & close
  const handleSaveAndClose = () => {
    const userEmail = dbService.getActiveUserEmail();
    const nowIso = new Date().toISOString();

    const updatedTrade: TradeEntry = {
      ...trade,
      quotedFigure: liveQuotedTotal,
      quoteBreakdown: items,
      lastModifiedBy: userEmail,
      updatedAt: nowIso
    };

    onSaveTrade(updatedTrade);
    dbService.updateTrade(scope.projectId || '', scope.id, updatedTrade);
    onClose();
  };

  // Simulate remote edit by Nadia (for testing Conflict Prevention Alert)
  const handleSimulateRemoteNadiaEdit = () => {
    const recordKey = `${scope.id}_${trade.id}`;
    const modifiedBreakdown = items.map((it, idx) => {
      if (idx === 0) {
        return {
          ...it,
          amount: it.amount + 2500,
          notes: (it.notes ? `${it.notes} | ` : '') + 'Nadia adjusted item scope'
        };
      }
      return it;
    });

    dbService.simulateRemoteUpdate(
      scope.projectId || '',
      scope.id,
      trade,
      {
        quotedFigure: liveQuotedTotal + 2500,
        quoteBreakdown: modifiedBreakdown
      },
      'nadia@thezenithgroup.ca'
    );
  };

  // Export to CSV
  const handleExportCsv = () => {
    const headers = ['#', 'Cost Code', 'Tender Form Item Description', 'Inclusion Status', 'Amount (CAD)', 'Vendor Scope Notes'];
    const rows = items.map((it, idx) => [
      `"${idx + 1}"`,
      `"${it.costCode || ''}"`,
      `"${it.itemDescription.replace(/"/g, '""')}"`,
      `"${it.inclusionStatus}"`,
      `"${it.amount}"`,
      `"${(it.notes || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Tender_Breakdown_${scope.name.replace(/\s+/g, '_')}_${trade.companyName.replace(/\s+/g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const statusBadge = getStatusBadgeClasses(trade.actionStatus);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 md:p-6 animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-5xl overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-200">

        {/* ================= MODAL HEADER ================= */}
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/80 flex flex-col gap-3 shrink-0">
          {activeViewers.length > 0 && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 border border-blue-200 rounded-lg text-blue-800 text-xs font-semibold animate-in slide-in-from-top-2">
              <Info className="w-4 h-4 text-blue-600" />
              <span>
                {activeViewers.map(v => (v?.email || 'User').split('@')[0]).join(', ')} {activeViewers.length === 1 ? 'is' : 'are'} currently viewing this scope package.
              </span>
            </div>
          )}

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-blue-600 text-white rounded-xl shadow-xs">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 text-[11px] font-bold bg-blue-100 text-blue-800 rounded-md">
                    Phase {scope.phaseId}
                  </span>
                  <span className="text-xs font-semibold text-slate-500">
                    Tender Package Scope
                  </span>
                </div>
                <h2 className="text-lg font-extrabold text-slate-900 leading-tight">
                  {scope.name} — Itemized Tender Form Breakdown
                </h2>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleExportCsv}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg shadow-xs transition-colors"
                title="Download itemized tender breakdown as CSV"
              >
                <Download className="w-3.5 h-3.5 text-slate-500" />
                <span className="hidden sm:inline">Export CSV</span>
              </button>
              <button
                type="button"
                onClick={onClose}
                className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
                title="Close modal (Esc)"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Auto-Save & Webhook Status Indicator Banner */}
          {autoSaveIndicator.status !== 'idle' && (
            <div className="flex items-center gap-2 text-xs font-medium text-slate-600 bg-white border border-slate-200 rounded-lg px-3 py-1.5 shadow-2xs animate-in fade-in">
              {autoSaveIndicator.status === 'saving' ? (
                <div className="w-3 h-3 border-2 border-blue-600 border-t-transparent rounded-full animate-spin shrink-0" />
              ) : (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              )}
              <span className="text-slate-700 font-semibold">{autoSaveIndicator.message}</span>
            </div>
          )}
        </div>

        {/* ================= CONTRACTOR & STATUS STRIP ================= */}
        <div className="px-6 py-2.5 bg-slate-100/60 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs shrink-0">
          <div className="flex items-center gap-2 text-slate-700">
            <Building2 className="w-4 h-4 text-slate-400" />
            <span className="font-bold text-slate-900">{trade.contractorName}</span>
            <span className="text-slate-400">•</span>
            <span className="font-semibold text-slate-600">{trade.companyName}</span>
            <span className="text-slate-400">•</span>
            <span className="text-slate-500">{trade.category}</span>
          </div>

          <div className="flex items-center gap-2">
            {trade.lastModifiedBy && (
              <span className="text-[11px] text-slate-500 font-medium flex items-center gap-1 mr-2" title={`Last updated by ${trade.lastModifiedBy}`}>
                <Sparkles className="w-3 h-3 text-blue-500" />
                <span>By {(trade?.lastModifiedBy || 'Estimator').split('@')[0]}</span>
              </span>
            )}

            {trade.isAwarded && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                <Award className="w-3.5 h-3.5 text-amber-600" />
                Awarded Contractor
              </span>
            )}

            {trade.poSent ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                PO Sent
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-slate-200 text-slate-700">
                PO Pending
              </span>
            )}

            <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${statusBadge.bg} ${statusBadge.border} ${statusBadge.text}`}>
              {trade.actionStatus}
            </span>
          </div>
        </div>

        {/* ================= TOP METRICS: REAL-TIME SCOPE BUDGET VS LIVE QUOTED TOTAL ================= */}
        <div className="p-6 bg-gradient-to-b from-white to-slate-50/50 border-b border-slate-200 shrink-0">
          {/* Conflict Prevention Alert Banner */}
          {conflictAlert && (
            <div className="mb-4 p-3 bg-amber-50 border border-amber-300 rounded-xl flex items-start justify-between gap-3 text-xs text-amber-900 shadow-xs animate-in slide-in-from-top-2">
              <div className="flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                <div>
                  <span className="font-bold text-amber-950">Multi-User Sync Alert:</span> {conflictAlert.message}
                  <div className="text-[11px] text-amber-800 mt-0.5 font-medium">
                    Attribution: <span className="font-bold">{conflictAlert.remoteUser}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setItems(conflictAlert.remoteItems);
                    setLocalDirtyItemIds(new Set());
                    setConflictAlert(null);
                  }}
                  className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded text-[11px] font-bold cursor-pointer"
                >
                  Accept Remote
                </button>
                <button
                  type="button"
                  onClick={() => setConflictAlert(null)}
                  className="px-2.5 py-1 bg-white hover:bg-amber-100 text-amber-800 border border-amber-300 rounded text-[11px] font-semibold cursor-pointer"
                >
                  Keep Mine
                </button>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            {/* Card 1: Scope Target Budget */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-col justify-between">
              <div className="flex items-center justify-between text-slate-500 mb-1">
                <span className="text-[11px] uppercase font-extrabold tracking-wider text-slate-400">
                  Scope Target Budget
                </span>
                <DollarSign className="w-4 h-4 text-blue-500" />
              </div>
              <div className="text-2xl font-black text-slate-900 tracking-tight">
                {formatCurrency(scopeBudget)}
              </div>
              <div className="text-[11px] text-slate-500 mt-1">
                Phase {scope.phaseId} baseline allocation
              </div>
            </div>

            {/* Card 2: Live Quoted Total (Real-time direct summation) */}
            <div className="bg-white p-4 rounded-xl border border-blue-200 ring-2 ring-blue-500/10 shadow-2xs flex flex-col justify-between">
              <div className="flex items-center justify-between text-slate-500 mb-1">
                <span className="text-[11px] uppercase font-extrabold tracking-wider text-blue-600 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
                  Live Quoted Total
                </span>
                <span className="text-[11px] font-semibold text-slate-400">
                  Sum of Line Items
                </span>
              </div>

              <div
                className={`text-2xl font-black tracking-tight ${liveQuotedTotal > scopeBudget ? 'text-rose-600' : 'text-emerald-600'
                  }`}
                title="Calculated in real-time as the sum of all included breakdown line items"
              >
                {formatCurrency(liveQuotedTotal)}
              </div>

              <div className="text-[11px] text-slate-500 mt-1 flex items-center justify-between">
                <span>
                  {includedCount} active {includedCount === 1 ? 'item' : 'items'} included
                  {excludedCount > 0 && <span className="text-slate-400"> ({excludedCount} excluded)</span>}
                </span>
                <span className="text-[10px] text-emerald-600 font-semibold flex items-center gap-1">
                  <Sparkles className="w-2.5 h-2.5" />
                  Auto-Save Active
                </span>
              </div>
            </div>

            {/* Card 3: Budget Variance & % Difference */}
            <div className={`p-4 rounded-xl border shadow-2xs flex flex-col justify-between ${isUnderBudget ? 'bg-emerald-50/50 border-emerald-200' : 'bg-rose-50/50 border-rose-200'
              }`}>
              <div className="flex items-center justify-between mb-1">
                <span className={`text-[11px] uppercase font-extrabold tracking-wider ${isUnderBudget ? 'text-emerald-700' : 'text-rose-700'
                  }`}>
                  Budget Variance
                </span>
                {isUnderBudget ? (
                  <TrendingDown className="w-4 h-4 text-emerald-600" />
                ) : (
                  <TrendingUp className="w-4 h-4 text-rose-600" />
                )}
              </div>
              <div className={`text-2xl font-black tracking-tight ${isUnderBudget ? 'text-emerald-800' : 'text-rose-800'
                }`}>
                {budgetVariance > 0
                  ? `+$${Math.abs(budgetVariance).toLocaleString()}`
                  : budgetVariance < 0
                    ? `-$${Math.abs(budgetVariance).toLocaleString()}`
                    : '$0'}
              </div>
              <div className="text-[11px] font-semibold mt-1">
                {isUnderBudget ? (
                  <span className="text-emerald-700">
                    {Math.abs(variancePercent).toFixed(1)}% savings below target
                  </span>
                ) : (
                  <span className="text-rose-700">
                    +{variancePercent.toFixed(1)}% over allocated budget
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ================= TENDER FORM BREAKDOWN ITEMS SECTION ================= */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
            <div>
              <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                <span>Itemized Tender Form Line Items</span>
                <span className="text-xs px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full font-semibold">
                  {items.length} items
                </span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Inputs auto-save on blur / selection change to Firestore with session attribution and Google Sheets sync.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleResetToStandard}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                title="Reset to official company tender package template items"
              >
                <RotateCcw className="w-3 h-3 text-slate-500" />
                <span>Reset to Standard</span>
              </button>

              {!isAddingItem && (
                <button
                  type="button"
                  onClick={() => setIsAddingItem(true)}
                  className="inline-flex items-center gap-1 px-3 py-1 text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors cursor-pointer shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Line Item</span>
                </button>
              )}
            </div>
          </div>

          {/* Add Item Inline Panel */}
          {isAddingItem && (
            <div className="p-4 mb-4 bg-blue-50/60 border border-blue-200 rounded-xl animate-in fade-in slide-in-from-top-2">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-extrabold text-blue-900">Add New Tender Form Breakdown Item</span>
                <button
                  type="button"
                  onClick={() => setIsAddingItem(false)}
                  className="text-slate-400 hover:text-slate-600 p-1 rounded"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
                <div className="sm:col-span-2">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-0.5">Cost Code</label>
                  <input
                    type="text"
                    placeholder="e.g. 20110"
                    value={newItemData.costCode || ''}
                    onChange={(e) => setNewItemData({ ...newItemData, costCode: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded-lg px-2 py-1.5 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono font-bold"
                  />
                </div>

                <div className="sm:col-span-4">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-0.5">Tender Form Description</label>
                  <input
                    type="text"
                    placeholder="e.g. Cast-in-Place Slab Supply"
                    value={newItemData.itemDescription || ''}
                    onChange={(e) => setNewItemData({ ...newItemData, itemDescription: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500 font-semibold"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-0.5">Inclusion Status</label>
                  <select
                    value={newItemData.inclusionStatus || 'included'}
                    onChange={(e) => setNewItemData({ ...newItemData, inclusionStatus: e.target.value as any })}
                    className="w-full bg-white border border-slate-300 rounded-lg px-2 py-1.5 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500 font-semibold"
                  >
                    <option value="included">Included</option>
                    <option value="excluded">Excluded</option>
                    <option value="allowance">Allowance</option>
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-0.5">Amount (CAD)</label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    placeholder="0.00"
                    value={newItemData.amount || ''}
                    onChange={(e) => setNewItemData({ ...newItemData, amount: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500 font-bold font-mono"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-0.5">Vendor Notes</label>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="text"
                      placeholder="Notes"
                      value={newItemData.notes || ''}
                      onChange={(e) => setNewItemData({ ...newItemData, notes: e.target.value })}
                      className="w-full bg-white border border-slate-300 rounded-lg px-2 py-1.5 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                    <button
                      type="button"
                      onClick={handleAddNewItem}
                      className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold text-xs shrink-0 cursor-pointer"
                    >
                      Add
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Line Item Grid with Direct Inline Auto-Save */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-100/90 border-b border-slate-200 text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">
                    <th className="py-2.5 px-3 w-8">#</th>
                    <th className="py-2.5 px-3 min-w-[95px]">COST CODE</th>
                    <th className="py-2.5 px-3 min-w-[280px]">TENDER FORM ITEM DESCRIPTION</th>
                    <th className="py-2.5 px-3 text-center min-w-[130px]">INCLUSION STATUS</th>
                    <th className="py-2.5 px-3.5 text-right min-w-[140px]">AMOUNT (CAD)</th>
                    <th className="py-2.5 px-3 min-w-[200px]">VENDOR SCOPE NOTES</th>
                    <th className="py-2.5 px-2 text-right w-12">ACTION</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {items.map((item, index) => {
                    const isExcluded = item.inclusionStatus === 'excluded';

                    return (
                      <tr
                        key={item.id}
                        className={`transition-colors ${isExcluded
                          ? 'bg-slate-50/70 text-slate-400'
                          : item.inclusionStatus === 'allowance'
                            ? 'bg-blue-50/20'
                            : 'hover:bg-slate-50/60'
                          }`}
                      >
                        {/* 1. Column: # (Item Number) */}
                        <td className="py-2 px-3 text-slate-400 font-mono text-[11px]">
                          {index + 1}
                        </td>

                        {/* 2. Column: COST CODE (Inline onBlur Auto-Save) */}
                        <td className="py-2 px-3 align-middle">
                          <input
                            type="text"
                            value={item.costCode || ''}
                            onChange={(e) => handleItemLocalChange(item.id, 'costCode', e.target.value)}
                            onBlur={(e) => handleAutoSaveItemField(item.id, 'costCode', e.target.value)}
                            placeholder="Cost Code"
                            className="w-20 bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 focus:border-blue-500 rounded px-1.5 py-1 text-xs font-mono font-bold text-slate-800 transition-colors focus:outline-none"
                            title="Auto-saves on blur to Firestore & Google Sheet"
                          />
                        </td>

                        {/* 3. Column: TENDER FORM ITEM DESCRIPTION (Inline onBlur Auto-Save) */}
                        <td className="py-2 px-3">
                          <input
                            type="text"
                            value={item.itemDescription || ''}
                            onChange={(e) => handleItemLocalChange(item.id, 'itemDescription', e.target.value)}
                            onBlur={(e) => handleAutoSaveItemField(item.id, 'itemDescription', e.target.value)}
                            placeholder="Tender Form Item Description"
                            className={`w-full bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 focus:border-blue-500 rounded px-2 py-1 text-xs font-bold transition-colors focus:outline-none ${isExcluded ? 'text-slate-400 line-through' : 'text-slate-900'
                              }`}
                            title="Auto-saves on blur to Firestore & Google Sheet"
                          />
                        </td>

                        {/* 4. Column: INCLUSION STATUS (Dropdown onChange Auto-Save) */}
                        <td className="py-2 px-3 text-center align-middle">
                          <div className="flex items-center justify-center gap-1">
                            <select
                              value={item.inclusionStatus || 'included'}
                              onChange={(e) => {
                                handleItemLocalChange(item.id, 'inclusionStatus', e.target.value);
                                handleAutoSaveItemField(item.id, 'inclusionStatus', e.target.value);
                              }}
                              className={`px-2 py-1 rounded text-[11px] font-bold border transition-colors cursor-pointer focus:outline-none ${item.inclusionStatus === 'included'
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                                : item.inclusionStatus === 'allowance'
                                  ? 'bg-blue-50 text-blue-800 border-blue-300'
                                  : 'bg-slate-100 text-slate-500 border-slate-300'
                                }`}
                              title="Auto-saves on selection change"
                            >
                              <option value="included">Included</option>
                              <option value="excluded">Excluded</option>
                              <option value="allowance">Allowance</option>
                            </select>
                          </div>
                        </td>

                        {/* 5. Column: AMOUNT (CAD) (Inline onBlur Auto-Save) */}
                        <td className="py-2 px-3.5 text-right align-middle">
                          <div className="relative inline-block w-full max-w-[130px]">
                            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 font-bold">$</span>
                            <input
                              type="number"
                              step="any"
                              min="0"
                              value={item.amount !== undefined ? item.amount : 0}
                              onChange={(e) => {
                                const val = parseFloat(e.target.value) || 0;
                                handleItemLocalChange(item.id, 'amount', val);
                              }}
                              onBlur={(e) => {
                                const val = parseFloat(e.target.value) || 0;
                                handleAutoSaveItemField(item.id, 'amount', val);
                              }}
                              className="w-full pl-5 pr-2 py-1 bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 focus:border-blue-500 rounded text-right text-xs font-bold font-mono text-slate-900 focus:outline-none transition-colors"
                              title="Auto-saves on blur to Firestore & Google Sheet"
                            />
                          </div>
                        </td>

                        {/* 6. Column: VENDOR SCOPE NOTES (Inline onBlur Auto-Save) */}
                        <td className="py-2 px-3 align-top">
                          <textarea
                            rows={2}
                            value={item.notes || ''}
                            onChange={(e) => handleItemLocalChange(item.id, 'notes', e.target.value)}
                            onBlur={(e) => handleAutoSaveItemField(item.id, 'notes', e.target.value)}
                            placeholder="Vendor scope notes & allowances..."
                            className="w-full min-w-[220px] bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 focus:border-blue-500 rounded px-2 py-1.5 text-[11px] text-slate-700 focus:outline-none whitespace-normal break-words resize-y leading-relaxed"
                            title="Auto-saves on blur to Firestore & Google Sheet"
                          />
                        </td>

                        {/* Column: ACTIONS */}
                        <td className="py-2 px-2 text-right align-middle">
                          <button
                            type="button"
                            onClick={() => handleDeleteItem(item.id)}
                            className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded cursor-pointer transition-colors"
                            title="Delete line item"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                {/* Direct Subtotal Summation Row */}
                <tfoot>
                  <tr className="bg-slate-100 border-t-2 border-slate-300 font-extrabold text-xs">
                    <td colSpan={4} className="py-3 px-4 text-right text-slate-700">
                      Tender Form Breakdown Subtotal (excl. GST):
                    </td>
                    <td className="py-3 px-3.5 text-right font-black text-slate-900 font-mono text-sm">
                      {formatCurrency(liveQuotedTotal)}
                    </td>
                    <td colSpan={2} className="py-3 px-3 text-[11px]">
                      <span className="text-emerald-700 font-semibold flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span>Live Sum ({includedCount} active items{excludedCount > 0 ? `, ${excludedCount} excluded` : ''})</span>
                      </span>
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>

        {/* ================= MODAL FOOTER ================= */}
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Info className="w-4 h-4 text-slate-400 shrink-0" />
            <span>
              All edits auto-save on blur &amp; selection change to Firestore with user session attribution.
            </span>
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-xl transition-colors cursor-pointer"
            >
              Close
            </button>
            <button
              type="button"
              id="save-quote-breakdown-btn"
              onClick={handleSaveAndClose}
              className="px-5 py-2 text-xs font-extrabold bg-blue-600 hover:bg-blue-500 text-white rounded-xl shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              <span>Done</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
