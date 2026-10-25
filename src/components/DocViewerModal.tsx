import React, { useState, useRef } from 'react';
import { X, FileText, ExternalLink, Trash2, UploadCloud, Link as LinkIcon, Loader2, Globe } from 'lucide-react';
import { TradeEntry, AttachedDoc } from '../types';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { 
  uploadQuoteDocument,
  openDocumentInNewTab, 
  showAppToast, 
  isDocExpired,
  isValidPermanentUrl,
  MAX_FILE_SIZE_BYTES 
} from '../services/fileUploadService';

interface DocViewerModalProps {
  isOpen: boolean;
  trade: TradeEntry | null;
  scopeName?: string;
  onClose: () => void;
  onSaveDocs: (tradeId: string, updatedDocs: AttachedDoc[]) => void;
}

export const DocViewerModal: React.FC<DocViewerModalProps> = ({
  isOpen,
  trade,
  scopeName,
  onClose,
  onSaveDocs,
}) => {
  const [activeTab, setActiveTab] = useState<'upload' | 'link'>('upload');
  const [linkTitle, setLinkTitle] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [docType, setDocType] = useState<'quote' | 'drawing' | 'spec' | 'submittal' | 'other'>('quote');
  const [uploadError, setUploadError] = useState('');
  const [isProcessingFile, setIsProcessingFile] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen || !trade) return null;

  // TAB A: Upload File Handler (Accepts PDFs/Images, converts to Base64/Storage, max 5MB)
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadError('');

    if (file.size > MAX_FILE_SIZE_BYTES) {
      const msg = `File too large (${(file.size / (1024 * 1024)).toFixed(1)}MB). Please select a file under 5MB.`;
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
      showAppToast('Converting document...');

      const targetQuoteId = trade.quoteDocId || trade.id || 'general';
      const result = await uploadQuoteDocument(file, targetQuoteId);

      const previousCleanDocs = (trade.attachedDocs || []).filter((d) => d.url && !d.url.startsWith('blob:'));
      const now = new Date().toISOString();
      const newDoc: AttachedDoc = {
        id: result.id || Date.now().toString(),
        name: result.name || file.name,
        url: result.url,
        type: docType || 'quote',
        addedAt: now.split('T')[0],
        uploadedAt: now,
        size: result.size || file.size,
        isExternalLink: false
      };

      const updated = [...previousCleanDocs, newDoc];
      onSaveDocs(trade.id, updated);

      if (targetQuoteId && db) {
        try {
          await updateDoc(doc(db, "quotes", targetQuoteId), {
            attachedDocs: updated,
            docUrl: newDoc.url,
            updatedAt: new Date().toISOString()
          });
        } catch (_) {}
      }

      showAppToast(`Attached "${file.name}" to quote.`);
      onClose();
    } catch (err: any) {
      console.error('File conversion error:', err);
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

  // TAB B: Insert Web Link Handler (Google Drive, Dropbox, SharePoint, OneDrive, etc.)
  const handleSaveWebLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setUploadError('');
    const trimmedUrl = linkUrl.trim();
    if (!trimmedUrl) {
      setUploadError('Please enter a valid shareable web link.');
      return;
    }

    if (!trimmedUrl.startsWith('http://') && !trimmedUrl.startsWith('https://')) {
      const msg = 'Invalid URL. Please enter a valid web link starting with https:// or http://';
      setUploadError(msg);
      showAppToast(msg);
      return;
    }

    const now = new Date().toISOString();
    // Save to Firestore as:
    // { id: Date.now().toString(), name: linkTitle || "Shared Document Link", url: linkUrl, isExternalLink: true, uploadedAt: new Date().toISOString() }
    const newDoc: AttachedDoc = {
      id: Date.now().toString(),
      name: linkTitle.trim() || 'Shared Document Link',
      url: trimmedUrl,
      isExternalLink: true,
      type: docType || 'quote',
      addedAt: now.split('T')[0],
      uploadedAt: now
    };

    const previousClean = (trade.attachedDocs || []).filter((d) => isValidPermanentUrl(d.url));
    const updated = [...previousClean, newDoc];
    onSaveDocs(trade.id, updated);

    const targetQuoteId = trade.quoteDocId || trade.id;
    if (targetQuoteId && db) {
      try {
        await updateDoc(doc(db, "quotes", targetQuoteId), {
          attachedDocs: updated,
          docUrl: newDoc.url,
          updatedAt: now
        });
      } catch (err) {
        console.warn('Error saving web link to Firestore:', err);
      }
    }

    setLinkTitle('');
    setLinkUrl('');
    showAppToast('Saved web link to quote.');
    onClose();
  };

  const handleDeleteDoc = async (docId: string) => {
    const docToDelete = trade.attachedDocs.find((d) => d.id === docId);
    const updated = trade.attachedDocs.filter((d) => d.id !== docId);
    onSaveDocs(trade.id, updated);

    const targetQuoteId = trade.quoteDocId || trade.id;
    if (targetQuoteId && db) {
      try {
        await updateDoc(doc(db, "quotes", targetQuoteId), {
          attachedDocs: updated,
          docUrl: updated.length > 0 ? updated[0].url : '',
          updatedAt: new Date().toISOString()
        });
      } catch (err: any) {
        console.warn(`[Firestore] Notice updating attachedDocs on quotes/${targetQuoteId}:`, err);
      }
    }

    if (docToDelete) {
      showAppToast(`Removed "${docToDelete.name}".`);
    }
  };

  const handleCleanAllExpiredLinks = async () => {
    const expiredCount = trade.attachedDocs.filter((d) => isDocExpired(d)).length;
    const cleanDocs = trade.attachedDocs.filter((d) => !isDocExpired(d));
    onSaveDocs(trade.id, cleanDocs);

    const targetQuoteId = trade.quoteDocId || trade.id;
    if (targetQuoteId && db) {
      try {
        await updateDoc(doc(db, "quotes", targetQuoteId), {
          attachedDocs: cleanDocs,
          docUrl: cleanDocs.length > 0 ? cleanDocs[0].url : '',
          updatedAt: new Date().toISOString()
        });
      } catch (err) {
        console.warn('Cleanup error in modal:', err);
      }
    }
    showAppToast(expiredCount > 0 ? `Cleaned ${expiredCount} expired session link(s).` : 'All attached links are valid permanent references.');
  };

  // Safe document opening handler
  const handleDocClick = (docItem: AttachedDoc, e: React.MouseEvent) => {
    e.preventDefault();
    if (isDocExpired(docItem)) {
      const confirmRemove = window.confirm('This file reference has expired. Would you like to remove it?');
      if (confirmRemove) {
        handleDeleteDoc(docItem.id);
      }
      return;
    }

    // External Web Links open directly in a new window: window.open(linkUrl, '_blank')
    if (docItem.isExternalLink || docItem.url.startsWith('http://') || docItem.url.startsWith('https://')) {
      window.open(docItem.url, '_blank', 'noopener,noreferrer');
      return;
    }

    openDocumentInNewTab(docItem.url, docItem.name);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600/30 flex items-center justify-center text-blue-400 border border-blue-500/30">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm tracking-tight">Manage Attachments</h3>
              <p className="text-[11px] text-slate-400">
                {trade.companyName} • {scopeName || 'Scope Item'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-5 max-h-[80vh] overflow-y-auto">
          {/* Dual Attachment Mode Selector Tabs */}
          <div className="flex items-center gap-2 p-1 bg-slate-100 rounded-xl border border-slate-200">
            <button
              type="button"
              onClick={() => {
                setActiveTab('upload');
                setUploadError('');
              }}
              className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'upload'
                  ? 'bg-white text-blue-700 shadow-xs border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>📁 Upload File</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab('link');
                setUploadError('');
              }}
              className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'link'
                  ? 'bg-white text-blue-700 shadow-xs border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>🔗 Insert Web Link</span>
            </button>
          </div>

          {uploadError && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg flex items-center gap-2">
              <X className="w-4 h-4 shrink-0" />
              <span>{uploadError}</span>
            </div>
          )}

          {/* TAB A: 📁 Upload File */}
          {activeTab === 'upload' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                  File Document Upload (Max 5MB)
                </label>
                <div className="flex items-center gap-1.5">
                  <label className="text-[10px] text-slate-500 font-medium">Type:</label>
                  <select
                    value={docType}
                    onChange={(e: any) => setDocType(e.target.value)}
                    className="text-xs bg-slate-50 border border-slate-200 rounded px-2 py-1 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                  >
                    <option value="quote">Quote</option>
                    <option value="drawing">Drawing</option>
                    <option value="spec">Spec</option>
                    <option value="submittal">Submittal</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>

              {isProcessingFile ? (
                <div className="border-2 border-dashed border-blue-200 rounded-lg p-6 bg-blue-50/50 flex flex-col items-center justify-center">
                  <Loader2 className="w-6 h-6 text-blue-600 animate-spin mb-1.5" />
                  <span className="text-xs font-semibold text-blue-700">Converting and attaching file...</span>
                  <span className="text-[10px] text-blue-500 mt-0.5">Permanent Base64 encoding</span>
                </div>
              ) : (
                <div className="relative border-2 border-dashed border-slate-300 rounded-lg p-6 bg-white hover:bg-slate-50 transition-colors flex flex-col items-center justify-center cursor-pointer group">
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
                  />
                  <UploadCloud className="w-6 h-6 text-slate-400 group-hover:text-blue-500 transition-colors mb-2" />
                  <span className="text-xs font-medium text-slate-700 text-center">
                    <span className="font-bold text-blue-600">Drag & drop</span> document here or click to browse
                  </span>
                  <span className="text-[10px] text-slate-400 mt-1 font-mono">Max 5MB • PDF, PNG, JPG, DOC, DOCX</span>
                </div>
              )}
            </div>
          )}

          {/* TAB B: 🔗 Insert Web Link */}
          {activeTab === 'link' && (
            <form onSubmit={handleSaveWebLink} className="space-y-3 bg-slate-50/70 p-4 rounded-xl border border-slate-200">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Document / Link Title
                </label>
                <input
                  type="text"
                  placeholder="e.g. Google Drive Subcontractor Quote / SharePoint Spec"
                  value={linkTitle}
                  onChange={(e) => setLinkTitle(e.target.value)}
                  className="w-full text-xs px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none placeholder:text-slate-400"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Shareable Web Link URL <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Globe className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="url"
                    required
                    placeholder="https://drive.google.com/... or https://dropbox.com/..."
                    value={linkUrl}
                    onChange={(e) => setLinkUrl(e.target.value)}
                    className="w-full text-xs pl-8 pr-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none placeholder:text-slate-400"
                  />
                </div>
                <p className="text-[10px] text-slate-500 mt-1">
                  Supports Google Drive, Dropbox, SharePoint, OneDrive, Box, or any secure HTTPS link.
                </p>
              </div>

              <div className="flex items-center justify-between pt-1">
                <div className="flex items-center gap-2">
                  <label className="text-[11px] text-slate-600 font-medium">Category:</label>
                  <select
                    value={docType}
                    onChange={(e: any) => setDocType(e.target.value)}
                    className="text-xs bg-white border border-slate-200 rounded px-2 py-1 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                  >
                    <option value="quote">Quote</option>
                    <option value="drawing">Drawing</option>
                    <option value="spec">Spec</option>
                    <option value="submittal">Submittal</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <button
                  type="submit"
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold transition-colors shadow-2xs cursor-pointer"
                >
                  <LinkIcon className="w-3.5 h-3.5" />
                  <span>Attach Web Link</span>
                </button>
              </div>
            </form>
          )}

          {/* Current Attached Documents List */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-bold text-slate-800 uppercase tracking-wider text-[11px]">
                Attached References ({trade.attachedDocs.length})
              </h4>
              {trade.attachedDocs.some((d) => isDocExpired(d)) && (
                <button
                  type="button"
                  onClick={handleCleanAllExpiredLinks}
                  className="text-[10px] px-2 py-0.5 bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300 rounded font-semibold transition-colors cursor-pointer"
                  title="Purge all expired session blob links from quote"
                >
                  Clean Expired Links
                </button>
              )}
            </div>

            {trade.attachedDocs.length === 0 ? (
              <div className="p-6 text-center text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                <FileText className="w-8 h-8 mx-auto mb-1 opacity-40" />
                <p className="text-xs">No attached files or web links linked to this quote yet.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {trade.attachedDocs.map((doc) => {
                  const expired = isDocExpired(doc);
                  const isWebLink = doc.isExternalLink || doc.url.startsWith('http://') || doc.url.startsWith('https://');

                  return (
                    <div
                      key={doc.id}
                      className={`p-3 bg-white border rounded-xl flex items-center justify-between gap-3 shadow-2xs transition-colors ${
                        expired ? 'border-amber-300 bg-amber-50/40' : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 truncate">
                        <div className={`p-2 rounded-lg shrink-0 ${
                          expired 
                            ? 'bg-amber-100 text-amber-700' 
                            : isWebLink 
                              ? 'bg-indigo-50 text-indigo-600' 
                              : 'bg-blue-50 text-blue-600'
                        }`}>
                          {isWebLink ? <Globe className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
                        </div>
                        <div className="truncate">
                          <button
                            type="button"
                            onClick={(e) => handleDocClick(doc, e)}
                            className={`font-bold hover:underline inline-flex items-center gap-1.5 truncate text-xs text-left cursor-pointer ${
                              expired
                                ? 'text-amber-700 hover:text-amber-900'
                                : isWebLink
                                  ? 'text-indigo-900 hover:text-indigo-600'
                                  : 'text-slate-900 hover:text-blue-600'
                            }`}
                          >
                            <span className="truncate">{doc.name}</span>
                            {expired ? (
                              <span className="text-[9px] px-1.5 py-0.5 bg-amber-100 text-amber-900 border border-amber-300 rounded font-semibold shrink-0">
                                Expired Session Link
                              </span>
                            ) : isWebLink ? (
                              <span className="text-[9px] px-1.5 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded font-semibold shrink-0 flex items-center gap-1">
                                <ExternalLink className="w-2.5 h-2.5" />
                                <span>Web Link</span>
                              </span>
                            ) : (
                              <ExternalLink className="w-3 h-3 text-slate-400 shrink-0" />
                            )}
                          </button>
                          <div className="flex items-center gap-2 text-[10px] text-slate-500 mt-0.5">
                            <span className="uppercase font-semibold text-slate-600">{doc.type || 'quote'}</span>
                            <span>•</span>
                            <span>Added {doc.addedAt || 'today'}</span>
                            {doc.fileSize && (
                              <>
                                <span>•</span>
                                <span>{doc.fileSize}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleDeleteDoc(doc.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer shrink-0"
                        title="Remove attachment"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-800 bg-white border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
