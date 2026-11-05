import React, { useState, useMemo } from 'react';
import {
  ChevronDown,
  ChevronUp,
  Plus,
  Edit3,
  Trash2,
  DollarSign,
  CheckCircle2,
  AlertCircle,
  FileText,
  Users,
  Mail,
  Bell,
  ExternalLink,
  CalendarClock,
  Clock,
  Tag,
  X,
  XCircle
} from 'lucide-react';
import { ScopeLineItem, TradeEntry, Contact } from '../types';
import { TradeRow } from './TradeRow';
import { ConfirmModal } from './ConfirmModal';
import { formatCurrency } from '../utils/formatters';
import { dbService } from '../services/databaseService';
import { getAccurateScopeCostCode } from '../data/tenderBreakdownTemplates';
import { doc, deleteDoc, updateDoc, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';

interface ScopeItemCardProps {
  scope: ScopeLineItem;
  contacts: Contact[];
  projectName?: string;
  selectedQuoteIds?: string[];
  onToggleSelectQuote?: (quoteId: string) => void;
  onSelectMultipleQuotes?: (quoteIds: string[], select: boolean) => void;
  statusFilter?: string;
  searchQuery?: string;
  poSentFilter?: 'all' | 'sent' | 'pending';
  isExpanded?: boolean;
  onToggleExpand?: () => void;
  onUpdateScope: (updated: ScopeLineItem) => void;
  onDeleteScope: (scopeId: string) => void;
  onEditScope: (scope: ScopeLineItem) => void;
  onAddTradeToScope: (scope: ScopeLineItem) => void;
  onOpenNotes: (trade: TradeEntry) => void;
  onOpenDocViewer: (trade: TradeEntry) => void;
  onOpenQuoteBreakdown: (trade: TradeEntry, scope: ScopeLineItem) => void;
  onOpenTenderInvite?: (scope: ScopeLineItem) => void;
  onOpenTenderReminder?: (scope: ScopeLineItem) => void;
  onOpenRevisedEstimate?: (scope: ScopeLineItem) => void;
  onCancelScheduledEmail?: (scopeId: string, type: 'invitation' | 'reminder') => void;
}

export const ScopeItemCard: React.FC<ScopeItemCardProps> = ({
  scope,
  contacts,
  projectName = '',
  selectedQuoteIds = [],
  onToggleSelectQuote,
  onSelectMultipleQuotes,
  statusFilter = 'ALL',
  searchQuery = '',
  poSentFilter = 'all',
  isExpanded: controlledExpanded,
  onToggleExpand,
  onUpdateScope,
  onDeleteScope,
  onEditScope,
  onAddTradeToScope,
  onOpenNotes,
  onOpenDocViewer,
  onOpenQuoteBreakdown,
  onOpenTenderInvite,
  onOpenTenderReminder,
  onOpenRevisedEstimate,
  onCancelScheduledEmail,
}) => {
  const [internalExpanded, setInternalExpanded] = useState(true);
  const isExpanded = controlledExpanded !== undefined ? controlledExpanded : internalExpanded;
  const [isSendDropdownOpen, setIsSendDropdownOpen] = useState(false);

  const handleToggleExpand = () => {
    if (onToggleExpand) {
      onToggleExpand();
    } else {
      setInternalExpanded(!internalExpanded);
    }
  };

  // Filter trades based on active status filter, PO filter, and search query
  const displayedTrades = scope.trades.filter((t) => {
    // Status filter
    if (statusFilter && statusFilter !== 'ALL' && t.actionStatus !== statusFilter) {
      return false;
    }
    // PO Sent filter
    if (poSentFilter === 'sent' && !t.poSent) {
      return false;
    }
    if (poSentFilter === 'pending' && t.poSent) {
      return false;
    }
    // Search query
    if (searchQuery) {
      const q = searchQuery.toLowerCase().trim();
      const matchTrade =
        t.contractorName.toLowerCase().includes(q) ||
        t.companyName.toLowerCase().includes(q) ||
        t.category.toLowerCase().includes(q) ||
        t.notes.some((n) => n.text.toLowerCase().includes(q)) ||
        scope.name.toLowerCase().includes(q);
      if (!matchTrade) return false;
    }
    return true;
  });

  const isFiltered = (statusFilter !== 'ALL' || poSentFilter !== 'all') && displayedTrades.length < scope.trades.length;

  // Find lowest quote
  const validQuotes = scope.trades.filter((t) => t.quotedFigure > 0);
  const lowestQuoteAmount = validQuotes.length > 0
    ? Math.min(...validQuotes.map((t) => t.quotedFigure))
    : 0;

  // Selected or awarded trade
  const awardedTrade = scope.trades.find((t) => t.isAwarded) ||
    (validQuotes.length > 0 ? validQuotes.find((t) => t.quotedFigure === lowestQuoteAmount) : null);

  const poSentTrade = scope.trades.find((t) => t.poSent);
  const variance = scope.budgetAmount - (awardedTrade ? awardedTrade.quotedFigure : 0);

  // Quote Document ID derivation and batch selection calculations
  const getTradeQuoteDocId = (trade: TradeEntry) => {
    return trade.quoteDocId || (projectName && trade.companyName ? `${projectName}_${trade.companyName}_${trade.costCode || scope.costCode || '20000'}` : trade.id);
  };

  const visibleQuoteIds = useMemo(() => {
    return displayedTrades.map(getTradeQuoteDocId);
  }, [displayedTrades, projectName, scope.costCode]);

  const selectedVisibleCount = useMemo(() => {
    if (!selectedQuoteIds || selectedQuoteIds.length === 0) return 0;
    return displayedTrades.filter((t, idx) => {
      const docId = visibleQuoteIds[idx];
      return selectedQuoteIds.includes(docId) || selectedQuoteIds.includes(t.id) || (t.quoteDocId && selectedQuoteIds.includes(t.quoteDocId));
    }).length;
  }, [displayedTrades, visibleQuoteIds, selectedQuoteIds]);

  const isAllVisibleSelected = displayedTrades.length > 0 && selectedVisibleCount === displayedTrades.length;
  const isSomeVisibleSelected = selectedVisibleCount > 0 && selectedVisibleCount < displayedTrades.length;

  const handleToggleSelectAllSection = () => {
    if (!onSelectMultipleQuotes) return;
    if (isAllVisibleSelected) {
      const idsToRemove: string[] = [];
      displayedTrades.forEach((t, idx) => {
        idsToRemove.push(visibleQuoteIds[idx]);
        idsToRemove.push(t.id);
        if (t.quoteDocId) idsToRemove.push(t.quoteDocId);
      });
      onSelectMultipleQuotes(idsToRemove, false);
    } else {
      onSelectMultipleQuotes(visibleQuoteIds, true);
    }
  };

  const [quoteToDelete, setQuoteToDelete] = useState<TradeEntry | null>(null);
  const [isDeletingQuote, setIsDeletingQuote] = useState(false);

  const handleUpdateTrade = async (updatedTrade: TradeEntry) => {
    const quote = updatedTrade;
    const newStatus = updatedTrade.actionStatus;
    try {
      if (!db) throw new Error("Firestore database is not initialized");
      await updateDoc(doc(db, "quotes", quote.id), { actionItemStatus: newStatus });
      if (quote.quoteDocId && quote.quoteDocId !== quote.id) {
        try {
          await updateDoc(doc(db, "quotes", quote.quoteDocId), { actionItemStatus: newStatus });
        } catch (_) { }
      }
    } catch (error: any) {
      if (error?.code === 'not-found' || error?.message?.includes('No document to update') || error?.message?.includes('not found')) {
        try {
          await setDoc(doc(db, "quotes", quote.id), {
            id: quote.id,
            quoteDocId: quote.quoteDocId || quote.id,
            companyName: quote.companyName || quote.contractorName,
            contractorName: quote.contractorName || quote.companyName,
            actionItemStatus: newStatus,
            actionStatus: newStatus,
            quotedFigure: quote.quotedFigure || 0,
            amount: quote.quotedFigure || 0,
            enteredAmount: quote.quotedFigure || 0,
            updatedAt: new Date().toISOString()
          }, { merge: true });
        } catch (innerErr: any) {
          alert("Error updating: " + innerErr.message);
          return;
        }
      } else {
        alert("Error updating: " + error.message);
        return;
      }
    }
    // Also notify scope for non-quote field syncs (e.g. poSent, isAwarded)
    const updatedTrades = scope.trades.map((t) => (t.id === updatedTrade.id ? updatedTrade : t));
    onUpdateScope({
      ...scope,
      trades: updatedTrades
    });
  };

  const handleDeleteTradeClick = async (trade: TradeEntry) => {
    const tradeName = trade.companyName || trade.contractorName || 'this quote';
    const isConfirmed = window.confirm(`Are you sure you want to permanently delete the quote from ${tradeName}?`);
    if (!isConfirmed) return;

    const targetDocId = (trade as any).quoteDocId || trade.id;

    try {
      if (!db) throw new Error("Firestore database is not initialized");

      // 1. Delete from Firestore 'quotes' collection (both IDs if aliased)
      if (trade.id) {
        await deleteDoc(doc(db, "quotes", trade.id)).catch(() => { });
      }
      if ((trade as any).quoteDocId && (trade as any).quoteDocId !== trade.id) {
        await deleteDoc(doc(db, "quotes", (trade as any).quoteDocId)).catch(() => { });
      }

      // 2. Remove from the scope's local trades array
      const remainingTrades = (scope.trades || []).filter(
        (t) => t.id !== trade.id && (t as any).quoteDocId !== targetDocId
      );

      const updatedScope = {
        ...scope,
        trades: remainingTrades
      };

      // 3. Persist the updated scope to Firestore project & state
      if ((props as any).onUpdateScope) {
        (props as any).onUpdateScope(updatedScope);
      } else if (typeof onUpdateScope === 'function') {
        onUpdateScope(updatedScope);
      }

      console.log(`[Delete Success] Permanently removed quote: ${tradeName}`);
    } catch (error: any) {
      console.error("[ScopeItemCard] Delete error:", error);
      alert("Failed to delete quote: " + error.message);
    }
  };

  const handleConfirmDeleteQuote = async () => {
    if (!quoteToDelete) return;
    setIsDeletingQuote(true);

    const quote = quoteToDelete;
    const quoteId = quoteToDelete.quoteDocId || quoteToDelete.id;
    const companyName = quoteToDelete.companyName || quoteToDelete.contractorName;

    try {
      if (!db) throw new Error("Firestore database is not initialized");
      await deleteDoc(doc(db, "quotes", quote.id));
      if (quote.quoteDocId && quote.quoteDocId !== quote.id) {
        try {
          await deleteDoc(doc(db, "quotes", quote.quoteDocId));
        } catch (_) { }
      }
      // Scan and delete matching quote documents & synchronize backend
      await dbService.deleteQuote(quoteId, companyName, scope.projectId);
    } catch (dbErr: any) {
      alert("Error updating: " + dbErr.message);
    }

    setIsDeletingQuote(false);
    setQuoteToDelete(null);
  };

  return (
    <div
      id={`scope-card-${scope.id}`}
      className={`bg-white rounded-xl border border-slate-200 shadow-xs hover:shadow-md transition-shadow mb-4 ${isSendDropdownOpen ? 'overflow-visible' : 'overflow-hidden'}`}
    >
      {/* Scope Header Bar */}
      <div className={`p-4 bg-slate-50/90 flex flex-col lg:flex-row lg:items-center justify-between gap-4 ${isExpanded ? 'border-b border-slate-200' : ''}`}>
        {/* Scope Title & Description */}
        <div className="flex items-start gap-3 flex-1">
          <button
            type="button"
            onClick={handleToggleExpand}
            className="p-1 text-slate-500 hover:text-slate-900 hover:bg-slate-200/60 rounded-md transition-colors mt-0.5 cursor-pointer"
            title={isExpanded ? 'Collapse Trade Quotes' : 'Expand Trade Quotes'}
          >
            {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </button>

          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-base font-bold text-slate-900 tracking-tight">
                {scope.name}
              </h3>
              {(scope.costCode || getAccurateScopeCostCode(scope.name)) && (
                <span
                  className="px-2 py-0.5 text-[10px] font-mono font-bold bg-slate-100 text-slate-700 border border-slate-300 rounded flex items-center gap-1 shadow-2xs"
                  title={`Cost Code: ${scope.costCode || getAccurateScopeCostCode(scope.name)}`}
                >
                  <Tag className="w-2.5 h-2.5 text-slate-500" />
                  <span>Code {scope.costCode || getAccurateScopeCostCode(scope.name)}</span>
                </span>
              )}
              {poSentTrade && (
                <span className="px-2 py-0.5 text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 rounded flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  PO Sent: {poSentTrade.companyName}
                </span>
              )}
              {scope.googleFormUrl && (
                <a
                  href={scope.googleFormUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="px-2 py-0.5 text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200 rounded flex items-center gap-1 hover:bg-blue-100 transition-colors"
                  title={`Scope Google Form Link: ${scope.googleFormUrl}`}
                >
                  <FileText className="w-3 h-3 text-blue-500" />
                  <span>Form Attached</span>
                  <ExternalLink className="w-2.5 h-2.5" />
                </a>
              )}
              {scope.tenderDeadline && (
                <span className="px-2 py-0.5 text-[10px] font-medium bg-slate-100 text-slate-700 border border-slate-200 rounded flex items-center gap-1">
                  Deadline: {scope.tenderDeadline}
                </span>
              )}
              {scope.scheduledInvite && scope.scheduledInvite.status === 'pending' && (
                <span
                  className="px-2.5 py-0.5 text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-full inline-flex items-center gap-1.5 shadow-2xs"
                  title={`Invitation launch scheduled for ${scope.scheduledInvite.scheduledTimeDisplay || scope.scheduledInvite.scheduledTime}`}
                >
                  <CalendarClock className="w-3 h-3 text-emerald-600 animate-pulse" />
                  <span>Scheduled ({scope.scheduledInvite.scheduledTimeDisplay || 'Pending Launch'})</span>
                  {onCancelScheduledEmail && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onCancelScheduledEmail(scope.id, 'invitation');
                      }}
                      className="text-emerald-700 hover:text-rose-700 hover:bg-emerald-200 rounded p-0.5 transition-colors cursor-pointer ml-0.5"
                      title="Cancel this scheduled invitation launch"
                    >
                      <X className="w-2.5 h-2.5" />
                    </button>
                  )}
                </span>
              )}
              {scope.scheduledReminder && scope.scheduledReminder.status === 'pending' && (
                <span
                  className="px-2.5 py-0.5 text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300 rounded-full inline-flex items-center gap-1.5 shadow-2xs"
                  title={`Follow-up reminder scheduled for ${scope.scheduledReminder.scheduledTimeDisplay || scope.scheduledReminder.scheduledTime}`}
                >
                  <Clock className="w-3 h-3 text-amber-600" />
                  <span>Reminder: {scope.scheduledReminder.scheduledTimeDisplay || 'Scheduled'}</span>
                  {onCancelScheduledEmail && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onCancelScheduledEmail(scope.id, 'reminder');
                      }}
                      className="text-amber-800 hover:text-rose-700 hover:bg-amber-200 rounded p-0.5 transition-colors cursor-pointer ml-0.5"
                      title="Cancel this scheduled reminder"
                    >
                      <X className="w-2.5 h-2.5" />
                    </button>
                  )}
                </span>
              )}
            </div>

            {/* Scope Description Field */}
            <p className="text-xs text-slate-600 mt-1 leading-relaxed max-w-3xl">
              {scope.description || 'No detailed line-item specification provided.'}
            </p>
          </div>
        </div>

        {/* Financial Metrics & Scope Controls */}
        <div className="flex flex-wrap items-center gap-4 lg:self-center">
          {/* Target Allocated Budget Amount */}
          <div className="bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-2xs text-right">
            <span className="block text-[10px] uppercase font-bold text-slate-400 tracking-wider">
              Allocated Budget
            </span>
            <span className="text-sm font-bold text-slate-900 tracking-tight">
              {formatCurrency(scope.budgetAmount)}
            </span>
          </div>

          {/* Committed / Best Quote */}
          {awardedTrade && (
            <div className="bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-2xs text-right">
              <span className="block text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                {awardedTrade.isAwarded ? 'Awarded Quote' : 'Best Quote'}
              </span>
              <div className="flex items-center gap-1">
                <span
                  className={`text-sm font-bold tracking-tight ${awardedTrade.quotedFigure > scope.budgetAmount
                      ? 'text-rose-600'
                      : 'text-emerald-600'
                    }`}
                >
                  {formatCurrency(awardedTrade.quotedFigure)}
                </span>
                <span className={`text-[10px] font-bold ${variance >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                  ({variance >= 0 ? `-${formatCurrency(Math.abs(variance))}` : `+${formatCurrency(Math.abs(variance))}`})
                </span>
              </div>
            </div>
          )}

          {/* Scope Controls */}
          <div className="flex items-center gap-1.5 border-l border-slate-200 pl-3">
            <button
              type="button"
              id={`scope-add-trade-btn-${scope.id}`}
              onClick={() => onAddTradeToScope(scope)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-white hover:bg-slate-50 text-slate-700 hover:text-slate-900 border border-slate-300 rounded-lg transition-colors cursor-pointer shadow-2xs"
              title="Add a competing contractor trade quote to this scope"
            >
              <Plus className="w-3.5 h-3.5 text-slate-500" />
              <span>Add Quote</span>
            </button>

            {(onOpenTenderInvite || onOpenTenderReminder || onOpenRevisedEstimate) && (
              <div className="relative">
                <button
                  type="button"
                  id={`scope-send-correspondence-btn-${scope.id}`}
                  onClick={() => setIsSendDropdownOpen(!isSendDropdownOpen)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition-colors cursor-pointer shadow-2xs"
                  title="Send correspondence to trades"
                >
                  <Mail className="w-3.5 h-3.5 text-slate-300" />
                  <span>Send Correspondence</span>
                  <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${isSendDropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                {isSendDropdownOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setIsSendDropdownOpen(false)}
                    />
                    <div className="absolute right-0 mt-2 w-72 bg-white border border-slate-200 rounded-lg shadow-xl z-50 overflow-hidden flex flex-col py-1">
                      {onOpenTenderInvite && (
                        <button
                          type="button"
                          onClick={() => {
                            setIsSendDropdownOpen(false);
                            onOpenTenderInvite(scope);
                          }}
                          className="flex items-center gap-3 w-full text-left px-4 py-2.5 hover:bg-slate-50 transition-colors"
                        >
                          <div className="bg-emerald-100 p-1.5 rounded-md shrink-0">
                            <Mail className="w-4 h-4 text-emerald-700" />
                          </div>
                          <div className="flex flex-col">
                            <span className="text-sm font-bold text-slate-800">Send Initial Tender Invites</span>
                            <span className="text-[10px] text-slate-500 font-medium">Opens standard Invitation Dispatcher</span>
                          </div>
                        </button>
                      )}

                      {onOpenTenderReminder && (
                        <button
                          type="button"
                          onClick={() => {
                            setIsSendDropdownOpen(false);
                            onOpenTenderReminder(scope);
                          }}
                          className="flex items-center gap-3 w-full text-left px-4 py-2.5 hover:bg-slate-50 transition-colors"
                        >
                          <div className="bg-amber-100 p-1.5 rounded-md shrink-0">
                            <Bell className="w-4 h-4 text-amber-700" />
                          </div>
                          <div className="flex flex-col">
                            <span className="text-sm font-bold text-slate-800">Send Tender Deadline Reminders</span>
                            <span className="text-[10px] text-slate-500 font-medium">Filter to trades with pending estimates</span>
                          </div>
                        </button>
                      )}

                      {onOpenRevisedEstimate && (
                        <button
                          type="button"
                          onClick={() => {
                            setIsSendDropdownOpen(false);
                            onOpenRevisedEstimate(scope);
                          }}
                          className="flex items-center gap-3 w-full text-left px-4 py-2.5 hover:bg-slate-50 transition-colors"
                        >
                          <div className="bg-blue-100 p-1.5 rounded-md shrink-0">
                            <Clock className="w-4 h-4 text-blue-700" />
                          </div>
                          <div className="flex flex-col">
                            <span className="text-sm font-bold text-slate-800">Request Revised Estimate</span>
                            <span className="text-[10px] text-slate-500 font-medium">For previously invited or active quotes</span>
                          </div>
                        </button>
                      )}
                    </div>
                  </>
                )}
              </div>
            )}

            {scope.scheduledInvite && scope.scheduledInvite.status === 'pending' && onCancelScheduledEmail && (
              <button
                type="button"
                id={`scope-cancel-invite-btn-${scope.id}`}
                onClick={() => onCancelScheduledEmail(scope.id, 'invitation')}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg transition-colors cursor-pointer shadow-2xs"
                title="Cancel pending scheduled invitation launch"
              >
                <XCircle className="w-3.5 h-3.5 text-rose-600" />
                <span>Cancel Scheduled Email</span>
              </button>
            )}

            {scope.scheduledReminder && scope.scheduledReminder.status === 'pending' && onCancelScheduledEmail && (
              <button
                type="button"
                id={`scope-cancel-reminder-btn-${scope.id}`}
                onClick={() => onCancelScheduledEmail(scope.id, 'reminder')}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg transition-colors cursor-pointer shadow-2xs"
                title="Cancel pending scheduled reminder"
              >
                <XCircle className="w-3.5 h-3.5 text-rose-600" />
                <span>Cancel Reminder</span>
              </button>
            )}

            <button
              type="button"
              id={`scope-edit-btn-${scope.id}`}
              onClick={() => onEditScope(scope)}
              className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              title="Edit Scope Line Item"
            >
              <Edit3 className="w-4 h-4" />
            </button>

            <button
              type="button"
              id={`scope-delete-btn-${scope.id}`}
              onClick={() => onDeleteScope(scope.id)}
              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
              title="Delete Scope Line Item"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Multi-Trade Table (1-to-many relationship) */}
      {isExpanded && (
        <div className="overflow-x-auto">
          {/* Status Filter Indicator banner if trades are filtered */}
          {isFiltered && (
            <div className="px-4 py-2 bg-slate-100 border-b border-slate-200 flex items-center justify-between text-xs text-slate-700">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-slate-500" />
                <span className="font-semibold text-slate-800">
                  Filtered by Status ({statusFilter}): Showing {displayedTrades.length} of {scope.trades.length} trade {scope.trades.length === 1 ? 'quote' : 'quotes'}
                </span>
              </div>
              <span className="text-[11px] text-slate-500 font-medium">
                {scope.trades.length - displayedTrades.length} other {scope.trades.length - displayedTrades.length === 1 ? 'trade' : 'trades'} hidden by active status filter
              </span>
            </div>
          )}

          {scope.trades.length === 0 ? (
            <div className="p-6 text-center bg-slate-50/50">
              <Users className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-xs font-semibold text-slate-700">No contractor quotes submitted for this scope item yet.</p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Add trade submissions to compare competing pricing, sync from Google Sheet, and assign PO delivery.
              </p>
              <button
                type="button"
                onClick={() => onAddTradeToScope(scope)}
                className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors cursor-pointer shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add First Contractor Quote</span>
              </button>
            </div>
          ) : displayedTrades.length === 0 ? (
            <div className="p-5 text-center bg-slate-50/70">
              <p className="text-xs text-slate-600 font-medium">
                No trades in this scope match the active filter (<span className="font-bold text-slate-800">{statusFilter}</span>).
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                {scope.trades.length} trade quotes exist with other statuses.
              </p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-100/75 border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-2.5 px-3 w-10 text-center">
                    <input
                      type="checkbox"
                      id={`scope-select-all-${scope.id}`}
                      aria-label={`Select all visible quotes in ${scope.name}`}
                      checked={isAllVisibleSelected}
                      ref={(el) => {
                        if (el) el.indeterminate = isSomeVisibleSelected;
                      }}
                      onChange={handleToggleSelectAllSection}
                      className="w-4 h-4 text-blue-600 bg-white border-slate-300 rounded focus:ring-blue-500 cursor-pointer"
                      title={isAllVisibleSelected ? "Deselect all quotes in this scope" : "Select all visible quotes in this scope"}
                    />
                  </th>
                  <th className="py-2.5 px-3">Trade / Contractor</th>
                  <th className="py-2.5 px-3">Quoted Figure (Live)</th>
                  <th className="py-2.5 px-3">Attached Docs</th>
                  <th className="py-2.5 px-3">Action Item Status</th>
                  <th className="py-2.5 px-3 text-center">PO Sent</th>
                  <th className="py-2.5 px-3">Notes</th>
                  <th className="py-2.5 px-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {displayedTrades.map((trade, idx) => {
                  const quoteDocId = visibleQuoteIds[idx];
                  const isSelected = Boolean(
                    selectedQuoteIds && (
                      selectedQuoteIds.includes(quoteDocId) ||
                      selectedQuoteIds.includes(trade.id) ||
                      (trade.quoteDocId && selectedQuoteIds.includes(trade.quoteDocId))
                    )
                  );

                  return (
                    <TradeRow
                      key={trade.id}
                      trade={trade}
                      contacts={contacts}
                      scopeBudget={scope.budgetAmount}
                      isSelected={isSelected}
                      quoteDocId={quoteDocId}
                      onToggleSelect={onToggleSelectQuote}
                      onUpdateTrade={handleUpdateTrade}
                      onDeleteTrade={handleDeleteTradeClick}
                      onOpenNotes={onOpenNotes}
                      onOpenDocViewer={onOpenDocViewer}
                      onOpenQuoteBreakdown={(t) => onOpenQuoteBreakdown(t, scope)}
                      isLowestQuote={trade.quotedFigure === lowestQuoteAmount && validQuotes.length > 1}
                    />
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Delete Quote Confirmation Modal */}
      {quoteToDelete && (
        <ConfirmModal
          isOpen={!!quoteToDelete}
          title="Delete Quote?"
          description={`Are you sure you want to delete this quote from ${quoteToDelete.companyName || quoteToDelete.contractorName || 'this contractor'}?`}
          confirmText={isDeletingQuote ? 'Deleting...' : 'Delete Quote'}
          cancelText="Cancel"
          confirmVariant="danger"
          onConfirm={handleConfirmDeleteQuote}
          onClose={() => setQuoteToDelete(null)}
        />
      )}
    </div>
  );
};
