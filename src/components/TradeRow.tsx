import React, { useState, useMemo, useRef } from 'react';
import {
  FileText,
  MessageSquare,
  Check,
  ExternalLink,
  Trash2,
  Phone,
  Mail,
  Award,
  Info,
  CheckSquare,
  Square,
  Sparkles,
  Paperclip,
  Plus,
  Layers,
  Edit3,
  Tag,
  Loader2,
  X,
  Globe
} from 'lucide-react';
import { TradeEntry, Contact, ActionItemStatus, AttachedDoc } from '../types';
import { ACTION_STATUS_OPTIONS } from '../data/initialTenderPackages';
import { formatCurrency, getStatusBadgeClasses } from '../utils/formatters';
import {
  uploadQuoteDocument,
  uploadLocalQuoteFile,
  processQuoteFileUpload,
  persistQuoteAttachedDocsToFirestore,
  openDocumentInNewTab,
  showAppToast,
  isDocExpired,
  isValidPermanentUrl,
  MAX_FILE_SIZE_BYTES
} from '../services/fileUploadService';
import { doc, deleteDoc, updateDoc, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { sanitizePayload } from '../services/databaseService';

interface TradeRowProps {
  trade: TradeEntry;
  contacts: Contact[];
  scopeBudget: number;
  isSelected?: boolean;
  onToggleSelect?: (quoteId: string) => void;
  quoteDocId?: string;
  onUpdateTrade: (updated: TradeEntry) => void;
  onDeleteTrade: (trade: TradeEntry) => void;
  onOpenNotes: (trade: TradeEntry) => void;
  onOpenDocViewer: (trade: TradeEntry) => void;
  onOpenQuoteBreakdown: (trade: TradeEntry) => void;
  isLowestQuote?: boolean;
}

export const TradeRow: React.FC<TradeRowProps> = ({
  trade,
  contacts,
  scopeBudget,
  isSelected = false,
  onToggleSelect,
  quoteDocId,
  onUpdateTrade,
  onDeleteTrade,
  onOpenNotes,
  onOpenDocViewer,
  onOpenQuoteBreakdown,
  isLowestQuote = false,
}) => {
  const quote = trade;
  const [showContactInfo, setShowContactInfo] = useState(false);
  const [isEditingFigure, setIsEditingFigure] = useState(false);
  const [tempFigure, setTempFigure] = useState(trade.quotedFigure.toString());
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Direct Firestore document deletion
  const handleDeleteDoc = async (docToDelete: AttachedDoc, e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    const updatedDocs = (trade.attachedDocs || []).filter(
      (d) => d.id !== docToDelete.id && d.url !== docToDelete.url
    );
    const newDocUrl = updatedDocs.length > 0 ? updatedDocs[0].url : '';

    // Immediately update in-memory trade state without page refresh
    onUpdateTrade({
      ...trade,
      docUrl: newDocUrl,
      attachedDoc: newDocUrl,
      attachedDocs: updatedDocs
    });

    // Update Firestore immediately:
    // const updatedDocs = quote.attachedDocs.filter(d => d.id !== docToDelete.id);
    // await updateDoc(doc(db, "quotes", quote.id), { attachedDocs: updatedDocs });
    const targetQuoteId = quote.id || quoteDocId || (quote as any).quoteDocId || trade.id;
    if (targetQuoteId && db) {
      try {
        await updateDoc(doc(db, "quotes", targetQuoteId), {
          attachedDocs: updatedDocs,
          docUrl: newDocUrl,
          updatedAt: new Date().toISOString()
        });
        console.log(`[Firestore] Deleted document ${docToDelete.name} from quotes/${targetQuoteId}`);
      } catch (err: any) {
        console.warn(`[Firestore] Notice updating attachedDocs on quotes/${targetQuoteId}:`, err);
        await persistQuoteAttachedDocsToFirestore(targetQuoteId, updatedDocs, {
          docUrl: newDocUrl
        });
      }

      if ((quote as any).quoteDocId && (quote as any).quoteDocId !== targetQuoteId) {
        try {
          await updateDoc(doc(db, "quotes", (quote as any).quoteDocId), {
            attachedDocs: updatedDocs,
            docUrl: newDocUrl,
            updatedAt: new Date().toISOString()
          });
        } catch (_) { }
      }
    }

    showAppToast(`Removed "${docToDelete.name}".`);
  };

  // Click handler with auto-purge of expired session blob URLs and direct web link opening
  const handleDocClick = async (docItem: AttachedDoc, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // Auto-purge expired session blob URLs
    if (docItem.url && docItem.url.startsWith('blob:')) {
      const confirmRemove = window.confirm('This file reference has expired. Would you like to remove it?');
      if (confirmRemove) {
        await handleDeleteDoc(docItem);
      }
      return;
    }

    // External Web Links open directly in a new window
    if (docItem.isExternalLink || docItem.url.startsWith('http://') || docItem.url.startsWith('https://')) {
      window.open(docItem.url, '_blank', 'noopener,noreferrer');
      return;
    }

    openDocumentInNewTab(docItem.url, docItem.name);
  };

  // One-time cleanup for all expired links in this quote row
  const handleCleanAllExpiredLinks = async (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    const expiredCount = (trade.attachedDocs || []).filter((d) => isDocExpired(d)).length;
    const cleanDocs = (trade.attachedDocs || []).filter((d) => isValidPermanentUrl(d.url));
    const cleanDocUrl = cleanDocs.length > 0 ? cleanDocs[0].url : '';

    onUpdateTrade({
      ...trade,
      docUrl: cleanDocUrl,
      attachedDoc: cleanDocUrl,
      attachedDocs: cleanDocs
    });

    const targetQuoteId = quote.id || quoteDocId || (quote as any).quoteDocId || trade.id;
    if (targetQuoteId && db) {
      try {
        await updateDoc(doc(db, "quotes", targetQuoteId), {
          attachedDocs: cleanDocs,
          docUrl: cleanDocUrl,
          updatedAt: new Date().toISOString()
        });
        console.log(`[Firestore] Cleaned all expired links on quotes/${targetQuoteId}`);
      } catch (err) {
        console.warn('Cleanup expired links error:', err);
      }
    }

    showAppToast(expiredCount > 0 ? `Cleaned ${expiredCount} expired link(s).` : 'All attached links are valid permanent references.');
  };

  // Compute all attached docs including direct docUrl/attachedDoc (strictly permanent URLs only)
  const allDocs = useMemo(() => {
    const list = (trade.attachedDocs || []).filter((d) => isValidPermanentUrl(d.url));
    const directDoc = trade.docUrl || trade.attachedDoc;
    if (directDoc && isValidPermanentUrl(directDoc) && !list.some((d) => d.url === directDoc)) {
      const fileName = directDoc.split('/').pop()?.split('?')[0] || 'open.pdf';
      list.unshift({
        id: `doc-${trade.id}-direct`,
        name: fileName.includes('.') ? fileName : `${fileName}.pdf`,
        url: directDoc,
        type: 'quote',
        addedAt: new Date().toISOString().split('T')[0]
      });
    }
    return list;
  }, [trade.attachedDocs, trade.docUrl, trade.attachedDoc, trade.id]);

  const [isUploadingDoc, setIsUploadingDoc] = useState(false);

  const handleRowFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploadingDoc(true);
      showAppToast('Uploading document...');

      const targetQuoteId = quote.quoteDocId || quote.id || effectiveQuoteDocId;
      const persistentDoc = await uploadQuoteDocument(file, targetQuoteId);

      const previousClean = (trade.attachedDocs || []).filter((d) => isValidPermanentUrl(d.url));
      const updatedDocs = [...previousClean, persistentDoc];

      const updatedTrade: TradeEntry = {
        ...trade,
        docUrl: persistentDoc.url,
        attachedDoc: persistentDoc.url,
        attachedDocs: updatedDocs,
        updatedAt: new Date().toISOString()
      };

      onUpdateTrade(updatedTrade);

      if (targetQuoteId && db) {
        await persistQuoteAttachedDocsToFirestore(targetQuoteId, updatedDocs, {
          companyName: trade.companyName,
          contractorName: trade.contractorName
        });
      }

      showAppToast(`Attached "${file.name}" to ${trade.companyName}`);
    } catch (err: any) {
      showAppToast(`Upload failed: ${err.message}`);
    } finally {
      setIsUploadingDoc(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };
  // Unique companies list for dropdown options
  const uniqueCompanies = useMemo(() => {
    const seen = new Set<string>();
    const list: { company: string; contact?: Contact }[] = [];
    contacts.forEach((c) => {
      const trimmed = (c.company || '').trim();
      if (trimmed && !seen.has(trimmed.toLowerCase())) {
        seen.add(trimmed.toLowerCase());
        list.push({ company: trimmed, contact: c });
      }
    });
    const currentComp = (trade.companyName || '').trim();
    if (currentComp && !seen.has(currentComp.toLowerCase())) {
      seen.add(currentComp.toLowerCase());
      list.push({ company: currentComp });
    }
    return list;
  }, [contacts, trade.companyName]);

  // Find linked contact for info popover
  const linkedContact = contacts.find(
    (c) =>
      (trade.contactId && c.id === trade.contactId) ||
      (trade.companyName && c.company.toLowerCase() === trade.companyName.toLowerCase()) ||
      (trade.contractorName && c.name.toLowerCase() === trade.contractorName.toLowerCase())
  );

  const statusBadge = getStatusBadgeClasses(trade.actionStatus);
  const variance = scopeBudget - trade.quotedFigure;
  const isOverBudget = trade.quotedFigure > scopeBudget;

  // Extract Cost Code tag (from quoteBreakdown or trade level, corresponding to row[3])
  const costCodeTag = useMemo(() => {
    const specificItem = trade.quoteBreakdown?.find(
      (b) => b.costCode && !['0', '00000', '20000', 'general', 'none'].includes(b.costCode.trim().toLowerCase())
    );
    if (specificItem?.costCode) return specificItem.costCode;

    const anyItem = trade.quoteBreakdown?.find((b) => Boolean(b.costCode && b.costCode.trim().length > 0));
    if (anyItem?.costCode) return anyItem.costCode;

    if ((trade as unknown as Record<string, unknown>).costCode) {
      return String((trade as unknown as Record<string, unknown>).costCode);
    }

    return null;
  }, [trade.quoteBreakdown, (trade as unknown as Record<string, unknown>).costCode]);

  const handleStatusChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    e.stopPropagation();
    const newStatus = e.target.value as ActionItemStatus;
    const updatedTrade: TradeEntry = {
      ...trade,
      actionStatus: newStatus,
      poSent: newStatus === 'PO Approved' ? true : trade.poSent,
      isAwarded: newStatus === 'PO Approved' ? true : trade.isAwarded,
      updatedAt: new Date().toISOString()
    };

    onUpdateTrade(updatedTrade);

    const targetQuoteId = quote.quoteDocId || quote.id || effectiveQuoteDocId;
    if (targetQuoteId && db) {
      try {
        await setDoc(doc(db, 'quotes', targetQuoteId), sanitizePayload({
          actionStatus: newStatus,
          actionItemStatus: newStatus,
          poSent: updatedTrade.poSent,
          isAwarded: updatedTrade.isAwarded,
          updatedAt: new Date().toISOString()
        }), { merge: true });
      } catch (err) {
        console.warn('Status update notice:', err);
      }
    }
  };

  const handleDeleteQuote = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (onDeleteTrade) {
      onDeleteTrade(trade || (quote as any));
    }
  };

  const handlePoToggle = () => {
    const nextPo = !trade.poSent;
    onUpdateTrade({
      ...trade,
      poSent: nextPo,
      // If PO is sent, ensure status is at least PO Approved
      actionStatus: nextPo && trade.actionStatus !== 'PO Approved' ? 'PO Approved' : trade.actionStatus
    });
  };

  const handleAwardToggle = () => {
    onUpdateTrade({
      ...trade,
      isAwarded: !trade.isAwarded
    });
  };

  const handleSaveFigure = async () => {
    const val = parseFloat(tempFigure);
    if (!isNaN(val) && val >= 0) {
      try {
        if (!db) throw new Error("Firestore database is not initialized");
        await updateDoc(doc(db, "quotes", quote.id), {
          quotedFigure: val,
          enteredAmount: val,
          amount: val,
          updatedAt: new Date().toISOString()
        });
        if ((quote as any).quoteDocId && (quote as any).quoteDocId !== quote.id) {
          try {
            await updateDoc(doc(db, "quotes", (quote as any).quoteDocId), {
              quotedFigure: val,
              enteredAmount: val,
              amount: val,
              updatedAt: new Date().toISOString()
            });
          } catch (_) { }
        }
      } catch (error: any) {
        if (error?.code === 'not-found' || error?.message?.includes('No document to update') || error?.message?.includes('not found')) {
          try {
            await setDoc(doc(db, "quotes", quote.id), {
              id: quote.id,
              quoteDocId: (quote as any).quoteDocId || quote.id,
              companyName: quote.companyName || quote.contractorName,
              contractorName: quote.contractorName || quote.companyName,
              quotedFigure: val,
              enteredAmount: val,
              amount: val,
              updatedAt: new Date().toISOString()
            }, { merge: true });
          } catch (innerErr: any) {
            alert("Error updating: " + innerErr.message);
          }
        } else {
          alert("Error updating: " + error.message);
        }
      }
    }
    setIsEditingFigure(false);
  };

  const handleCompanySelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedCompany = e.target.value;
    const matchingContact = contacts.find(
      (c) => (c.company || '').trim().toLowerCase() === selectedCompany.trim().toLowerCase()
    );
    if (matchingContact) {
      onUpdateTrade({
        ...trade,
        contactId: matchingContact.id,
        contractorName: matchingContact.name,
        companyName: matchingContact.company,
        category: matchingContact.category
      });
    } else {
      onUpdateTrade({
        ...trade,
        companyName: selectedCompany
      });
    }
  };

  const priceColorClass = trade.quotedFigure > 0
    ? isOverBudget
      ? 'text-rose-600 hover:text-rose-700'
      : 'text-emerald-600 hover:text-emerald-700'
    : 'text-slate-500 hover:text-slate-700';

  const effectiveQuoteDocId = quoteDocId || trade.quoteDocId || trade.id;

  return (
    <tr
      id={`trade-row-${trade.id}`}
      className={`border-b border-slate-200 transition-colors text-xs ${isSelected
        ? 'bg-blue-50/80 hover:bg-blue-50 text-slate-900 border-blue-200'
        : trade.isAwarded
          ? 'bg-emerald-50/20 hover:bg-emerald-50/40'
          : isLowestQuote && trade.quotedFigure > 0
            ? 'bg-slate-50/40 hover:bg-slate-50/70'
            : 'bg-white hover:bg-slate-50/70'
        }`}
    >
      {/* Col 0: Selection Checkbox */}
      <td className="py-2.5 px-3 w-10 text-center align-middle">
        <input
          type="checkbox"
          id={`quote-select-${trade.id}`}
          aria-label={`Select quote from ${trade.companyName || trade.contractorName}`}
          checked={Boolean(isSelected)}
          onChange={() => onToggleSelect && onToggleSelect(effectiveQuoteDocId)}
          className="w-4 h-4 text-blue-600 bg-white border-slate-300 rounded focus:ring-blue-500 cursor-pointer"
        />
      </td>

      {/* Col 1: Awarded / Preferred Marker & Contractor */}
      <td className="py-2.5 px-3 align-middle">
        <div className="flex items-center gap-2">
          {/* Award quote button */}
          <button
            type="button"
            onClick={handleAwardToggle}
            className={`p-1 rounded-md transition-colors cursor-pointer ${trade.isAwarded
              ? 'text-amber-500 bg-amber-50 hover:bg-amber-100'
              : 'text-slate-300 hover:text-amber-500 hover:bg-slate-100'
              }`}
            title={trade.isAwarded ? 'Awarded Quote (Selected Contractor)' : 'Mark as Awarded / Preferred Quote'}
          >
            <Award className="w-4 h-4" fill={trade.isAwarded ? 'currentColor' : 'none'} />
          </button>

          {/* Contractor & Company searchable / selectable dropdown */}
          <div className="flex-1 min-w-[170px] relative">
            <div className="flex items-center gap-1.5">
              <select
                id={`trade-contractor-select-${trade.id}`}
                value={trade.companyName || ''}
                onChange={handleCompanySelect}
                className="w-full bg-slate-50 hover:bg-white border border-slate-200 hover:border-slate-300 rounded-md px-2 py-1 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
              >
                {!trade.companyName && (
                  <option value="">Select Company...</option>
                )}
                {uniqueCompanies.map((item) => (
                  <option key={item.company} value={item.company}>
                    {item.company}
                  </option>
                ))}
              </select>

              {/* Quick Contact info tooltip/popover trigger */}
              <button
                type="button"
                onClick={() => setShowContactInfo(!showContactInfo)}
                className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-md transition-colors cursor-pointer"
                title="View contractor contact info"
              >
                <Info className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Contact popover */}
            {showContactInfo && linkedContact && (
              <div className="absolute left-0 top-full mt-1 z-30 w-64 p-3 bg-white rounded-lg shadow-lg border border-slate-200 text-xs text-slate-800 animate-in fade-in zoom-in-95 duration-100">
                <div className="flex items-center justify-between border-b border-slate-100 pb-1.5 mb-2">
                  <span className="font-bold text-slate-900">{linkedContact.name}</span>
                  <span className="text-[10px] font-semibold bg-slate-100 px-1.5 py-0.5 rounded text-slate-600">
                    {linkedContact.category}
                  </span>
                </div>
                <div className="font-medium text-slate-700 mb-1.5">{linkedContact.company}</div>
                <div className="space-y-1 text-slate-600">
                  {linkedContact.phone && (
                    <a
                      href={`tel:${linkedContact.phone}`}
                      className="flex items-center gap-1.5 text-blue-600 hover:underline"
                    >
                      <Phone className="w-3 h-3" />
                      {linkedContact.phone}
                    </a>
                  )}
                  {linkedContact.email && (
                    <a
                      href={`mailto:${linkedContact.email}`}
                      className="flex items-center gap-1.5 text-blue-600 hover:underline truncate"
                    >
                      <Mail className="w-3 h-3" />
                      {linkedContact.email}
                    </a>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setShowContactInfo(false)}
                  className="mt-2.5 w-full py-1 text-center text-[10px] font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded cursor-pointer"
                >
                  Close
                </button>
              </div>
            )}
          </div>
        </div>
      </td>

      {/* Col 2: Quoted Figure (Live Price Data) */}
      <td className="py-2.5 px-3 align-middle" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center">
          {isEditingFigure ? (
            <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
              <span className="text-slate-400 font-medium">$</span>
              <input
                type="number"
                value={tempFigure}
                onClick={(e) => e.stopPropagation()}
                onChange={(e) => {
                  e.stopPropagation();
                  setTempFigure(e.target.value);
                }}
                onBlur={handleSaveFigure}
                onKeyDown={(e) => {
                  e.stopPropagation();
                  if (e.key === 'Enter') handleSaveFigure();
                  if (e.key === 'Escape') setIsEditingFigure(false);
                }}
                className="w-24 px-1.5 py-0.5 text-xs font-bold border border-blue-500 rounded bg-white focus:outline-none"
                autoFocus
              />
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleSaveFigure();
                }}
                className="p-1 text-emerald-600 hover:bg-emerald-50 rounded cursor-pointer"
              >
                <Check className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 group/quote">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenQuoteBreakdown(trade);
                }}
                className={`inline-flex items-center gap-1 font-bold text-sm tracking-tight cursor-pointer hover:underline transition-colors text-left ${priceColorClass}`}
                title="Click to view scope budget comparison & tender form breakdown"
              >
                <span>{formatCurrency(trade.quotedFigure)}</span>
                <Layers className="w-3 h-3 text-slate-400 opacity-0 group-hover/quote:opacity-100 transition-opacity" />
              </button>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setTempFigure(trade.quotedFigure.toString());
                  setIsEditingFigure(true);
                }}
                className="opacity-0 group-hover/quote:opacity-100 p-0.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded transition-all cursor-pointer"
                title="Quick edit figure"
              >
                <Edit3 className="w-2.5 h-2.5" />
              </button>

              {isLowestQuote && trade.quotedFigure > 0 && (
                <span className="px-1.5 py-0.5 text-[9px] font-bold bg-emerald-100 text-emerald-800 rounded uppercase">
                  Lowest
                </span>
              )}

              {/* Info icon (i) with detailed breakdown stats on hover */}
              <div className="relative group/info inline-flex items-center">
                <button
                  type="button"
                  className="p-0.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded transition-colors cursor-help"
                  aria-label="View quote breakdown & metadata"
                >
                  <Info className="w-3.5 h-3.5" />
                </button>
                <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2 z-50 hidden group-hover/info:flex flex-col w-56 p-2.5 bg-slate-900 text-white rounded-lg shadow-xl border border-slate-700 text-[11px] pointer-events-none whitespace-normal leading-normal">
                  <div className="font-bold text-slate-200 border-b border-slate-800 pb-1 mb-1.5 flex items-center justify-between">
                    <span>Quote Details</span>
                    <span className="font-mono text-emerald-400 font-bold">{formatCurrency(trade.quotedFigure)}</span>
                  </div>

                  {/* Budget Variance */}
                  <div className="flex justify-between items-center py-0.5">
                    <span className="text-slate-400">Budget Variance:</span>
                    <span className={`font-semibold ${variance >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {variance >= 0 ? `-${formatCurrency(Math.abs(variance))}` : `+${formatCurrency(Math.abs(variance))}`}
                      {' '}({Math.round((trade.quotedFigure / (scopeBudget || 1)) * 100)}% of budg)
                    </span>
                  </div>

                  {/* Cost Code Badge */}
                  {costCodeTag && (
                    <div className="flex justify-between items-center py-0.5">
                      <span className="text-slate-400">Cost Code:</span>
                      <span className="font-mono text-slate-200 font-semibold">{costCodeTag}</span>
                    </div>
                  )}

                  {/* Auto-synced Google Sheet indicator */}
                  {trade.lastSyncedAt && (
                    <div className="flex justify-between items-center py-0.5">
                      <span className="text-slate-400">Last Synced:</span>
                      <span className="text-slate-300">{trade.lastSyncedAt}</span>
                    </div>
                  )}

                  {/* Active user session attribution */}
                  {trade.lastModifiedBy && (
                    <div className="flex justify-between items-center py-0.5">
                      <span className="text-slate-400">User:</span>
                      <span className="text-blue-300 font-medium truncate max-w-[120px]" title={trade.lastModifiedBy}>
                        {trade.lastModifiedBy.split('@')[0]}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </td>

      {/* Col 3: Attached Docs (Local file uploads with instant badge preview) */}
      <td className="py-2.5 px-3 align-middle">
        <input
          type="file"
          ref={fileInputRef}
          id={`row-file-input-${trade.id}`}
          onChange={handleRowFileUpload}
          accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
          className="hidden"
          disabled={isUploadingDoc}
        />
        {isUploadingDoc ? (
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200 shadow-2xs">
            <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-600 shrink-0" />
            <span>Uploading document...</span>
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-1.5 max-w-[280px]">
            {allDocs.length === 0 ? (
              <div className="flex items-center gap-1">
                <label
                  htmlFor={`row-file-input-${trade.id}`}
                  className="inline-flex items-center gap-1 text-[11px] font-medium py-0.5 px-2 rounded border border-dashed bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-900 border-slate-300 transition-colors cursor-pointer"
                  title="Select document under 10MB (PDF, DOC, DOCX, Images)"
                >
                  <Paperclip className="w-3 h-3 text-slate-400 shrink-0" />
                  <span>+ Attach Doc</span>
                </label>

                <button
                  type="button"
                  onClick={() => onOpenDocViewer(trade)}
                  className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded cursor-pointer transition-colors"
                  title="Manage documents"
                >
                  <Plus className="w-3 h-3" />
                </button>
              </div>
            ) : (
              <>
                {allDocs.map((doc) => {
                  const expired = isDocExpired(doc);
                  const isWebLink = doc.isExternalLink || doc.url.startsWith('http://') || doc.url.startsWith('https://');

                  return (
                    <div
                      key={doc.id}
                      className={`inline-flex items-center gap-1 pl-2 pr-1 py-0.5 rounded text-[11px] font-medium border transition-colors truncate max-w-[190px] group/doc ${expired
                        ? 'bg-amber-50 text-amber-900 border-amber-300 hover:bg-amber-100'
                        : isWebLink
                          ? 'bg-indigo-50/80 hover:bg-indigo-100/80 text-indigo-900 hover:text-indigo-950 border-indigo-200'
                          : 'bg-slate-50 hover:bg-slate-100 text-slate-700 hover:text-slate-900 border-slate-300'
                        }`}
                      title={
                        expired
                          ? `${doc.name} (Expired temporary session link - click to remove)`
                          : isWebLink
                            ? `${doc.name} (Shared Web Link - click to open)`
                            : `${doc.name || 'open.pdf'} (Click to preview document)`
                      }
                    >
                      <button
                        type="button"
                        onClick={(e) => handleDocClick(doc, e)}
                        className="inline-flex items-center gap-1 truncate cursor-pointer text-left focus:outline-none"
                      >
                        {isWebLink ? (
                          <Globe className="w-3 h-3 text-indigo-600 shrink-0" />
                        ) : (
                          <FileText
                            className={`w-3 h-3 shrink-0 ${expired ? 'text-amber-600' : 'text-slate-500 group-hover/doc:text-blue-600'
                              }`}
                          />
                        )}
                        <span className="truncate max-w-[95px]">{doc.name || 'open.pdf'}</span>
                        {expired ? (
                          <span className="text-[9px] px-1 bg-amber-200 text-amber-900 rounded font-semibold shrink-0">
                            Expired
                          </span>
                        ) : (
                          <ExternalLink className="w-2.5 h-2.5 text-slate-400 shrink-0 group-hover/doc:text-blue-500" />
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={(e) => handleDeleteDoc(doc, e)}
                        className="p-0.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors cursor-pointer shrink-0 ml-0.5"
                        title={`Remove "${doc.name}" from quote`}
                        aria-label={`Remove ${doc.name}`}
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  );
                })}

                {allDocs.some((d) => isDocExpired(d)) && (
                  <button
                    type="button"
                    onClick={handleCleanAllExpiredLinks}
                    className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300 transition-colors cursor-pointer shrink-0"
                    title="One-time cleanup: remove all expired session links from quote"
                  >
                    <span>Clean Expired</span>
                  </button>
                )}

                <label
                  htmlFor={`row-file-input-${trade.id}`}
                  className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded cursor-pointer transition-colors"
                  title="Upload & attach another file"
                >
                  <Paperclip className="w-3 h-3" />
                </label>

                <button
                  type="button"
                  onClick={() => onOpenDocViewer(trade)}
                  className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded cursor-pointer transition-colors"
                  title="Manage attached docs"
                >
                  <Plus className="w-3 h-3" />
                </button>
              </>
            )}
          </div>
        )}
      </td>

      {/* Col 4: Action Item Status (Fully editable dropdown menu) */}
      <td className="py-2.5 px-3 align-middle" onClick={(e) => e.stopPropagation()}>
        <div className="relative inline-block" onClick={(e) => e.stopPropagation()}>
          <select
            id={`trade-status-select-${quote.id}`}
            value={quote.actionStatus || (quote as any).actionItemStatus}
            onClick={(e) => e.stopPropagation()}
            onChange={handleStatusChange}
            className={`text-xs font-semibold py-1 px-2.5 pr-6 rounded-md border appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500/20 ${statusBadge.bg} ${statusBadge.border} ${statusBadge.text}`}
          >
            {ACTION_STATUS_OPTIONS.map((status) => (
              <option key={status} value={status} className="bg-white text-slate-800 font-normal">
                {status}
              </option>
            ))}
          </select>
          {/* Custom status dot */}
          <span
            className={`absolute right-2 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full ${statusBadge.dot} pointer-events-none`}
          />
        </div>
      </td>

      {/* Col 5: PO Sent (Checkbox toggle indicating Purchase Order delivery) */}
      <td className="py-2.5 px-3 align-middle text-center" onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          id={`trade-po-toggle-${trade.id}`}
          onClick={(e) => {
            e.stopPropagation();
            handlePoToggle();
          }}
          className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-semibold border transition-all cursor-pointer ${trade.poSent
            ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
            : 'bg-slate-50 text-slate-600 border-slate-300 hover:bg-slate-100 hover:border-slate-400'
            }`}
          title={trade.poSent ? 'Purchase Order Delivered & Confirmed' : 'Toggle Purchase Order delivery'}
        >
          {trade.poSent ? (
            <>
              <CheckSquare className="w-3.5 h-3.5 text-white" />
              <span>PO Sent</span>
            </>
          ) : (
            <>
              <Square className="w-3.5 h-3.5 text-slate-400" />
              <span>Pending</span>
            </>
          )}
        </button>
      </td>

      {/* Col 6: Notes (Neutral outline style, no blue fill) */}
      <td className="py-2.5 px-3 align-middle" onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          id={`trade-notes-btn-${trade.id}`}
          onClick={(e) => {
            e.stopPropagation();
            onOpenNotes(trade);
          }}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 hover:text-slate-900 transition-colors cursor-pointer"
          title="Open notes panel"
        >
          <MessageSquare className="w-3.5 h-3.5 text-slate-400" />
          <span>{trade.notes.length > 0 ? `${trade.notes.length} Notes` : 'Add Note'}</span>
        </button>
      </td>

      {/* Col 7: Actions */}
      <td className="py-2.5 px-2 align-middle text-right" onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          id={`delete-quote-btn-${quote.id}`}
          onClick={handleDeleteQuote}
          className="p-1 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors cursor-pointer"
          title={`Delete quote from ${quote.companyName || quote.contractorName}`}
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </td>
    </tr>
  );
};
