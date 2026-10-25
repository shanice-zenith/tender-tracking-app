import React, { useMemo } from 'react';
import {
  X,
  FileDown,
  Printer,
  ExternalLink,
  FileText,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { Project } from '../types';
import { getApprovedPoEntries, exportApprovedPoListPdf } from '../services/pdfExportService';
import { openDocumentInNewTab } from '../services/fileUploadService';
import { ZenithLogo } from './ZenithLogo';

interface ApprovedPoExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: Project;
}

export const ApprovedPoExportModal: React.FC<ApprovedPoExportModalProps> = ({
  isOpen,
  onClose,
  project
}) => {
  const approvedEntries = useMemo(() => {
    return getApprovedPoEntries(project);
  }, [project]);

  const currentDateDisplay = useMemo(() => {
    return new Date().toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });
  }, []);

  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPdf = () => {
    exportApprovedPoListPdf(project);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6 print:p-0 print:bg-white print:static">
      {/* Container - on screen it is a modal; on print it fills the page */}
      <div className="bg-white w-full max-w-5xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh] print:max-h-none print:shadow-none print:border-none print:rounded-none">
        
        {/* Modal Header Actions Bar (Hidden in Print) */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800 print:hidden shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-1.5 bg-blue-600 rounded-lg text-white">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-white">
                Export Approved PO List (PDF)
              </h2>
              <p className="text-xs text-slate-400">
                {project.name} ({project.code || 'PRJ'}) • {approvedEntries.length} Approved Purchase Orders
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              id="export-modal-download-pdf-btn"
              onClick={handleDownloadPdf}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-extrabold bg-blue-600 hover:bg-blue-500 text-white rounded-xl shadow-xs transition-colors cursor-pointer"
              title="Download PDF document generated via jsPDF"
            >
              <FileDown className="w-4 h-4" />
              <span>Download PDF</span>
            </button>

            <button
              type="button"
              id="export-modal-print-btn"
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 hover:border-slate-600 rounded-xl transition-colors cursor-pointer"
              title="Print directly or Save as PDF via browser print window"
            >
              <Printer className="w-4 h-4 text-slate-300" />
              <span>Print / Save as PDF</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
              aria-label="Close dialog"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Document Preview Area */}
        <div className="overflow-y-auto p-6 sm:p-10 bg-slate-100/60 print:p-8 print:bg-white flex-1">
          <div
            id="approved-po-pdf-document"
            className="bg-white max-w-4xl mx-auto rounded-xl p-8 sm:p-12 shadow-sm border border-slate-200/80 print:border-none print:shadow-none print:p-0"
          >
            {/* 1. Official Zenith Group Header Logo */}
            <div className="border-b border-slate-200 pb-6 mb-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                {/* Brand Logo matching attached graphic */}
                <ZenithLogo size="lg" />

                {/* Export Metadata */}
                <div className="sm:text-right">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Estimating & Procurement Internal Report
                  </div>
                  <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mt-0.5">
                    Export Date: <span className="font-bold text-slate-800">{currentDateDisplay}</span>
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    Project Code: <span className="font-mono font-bold text-slate-800">{project.code || 'PRJ'}</span>
                  </div>
                </div>
              </div>

              {/* Document Title */}
              <div className="mt-6 pt-4 border-t border-slate-100">
                <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
                  {project.name} — Approved Purchase Orders & Scopes
                </h1>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 mt-1.5">
                  <span>Client: <strong className="text-slate-700">{project.client || 'Zenith Developments'}</strong></span>
                  {project.location && (
                    <span>Location: <strong className="text-slate-700">{project.location}</strong></span>
                  )}
                  <span>Status: <strong className="text-slate-700">{project.status}</strong></span>
                  <span className="inline-flex items-center gap-1 text-emerald-600 font-semibold">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    {approvedEntries.length} POs Approved
                  </span>
                </div>
              </div>
            </div>

            {/* 2. Strictly 3-Column Clean Table */}
            {approvedEntries.length === 0 ? (
              <div className="py-12 px-4 text-center border-2 border-dashed border-slate-200 rounded-xl">
                <AlertCircle className="w-10 h-10 text-amber-500 mx-auto mb-2" />
                <h3 className="text-sm font-bold text-slate-800">
                  No Approved Purchase Orders Found
                </h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
                  There are currently no contractor quotes marked with a Purchase Order issued (<code className="bg-slate-100 px-1 py-0.5 rounded text-[11px]">poSent === true</code> or status containing &quot;PO Sent&quot; / &quot;PO Approved&quot;) in this project.
                </p>
              </div>
            ) : (
              <div className="overflow-hidden border border-slate-200 rounded-xl">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-900 text-white text-xs uppercase tracking-wider font-bold">
                      <th className="py-3 px-4 w-1/3 border-b border-slate-800">
                        Company Name
                      </th>
                      <th className="py-3 px-4 w-5/12 border-b border-slate-800">
                        Scope of Work
                      </th>
                      <th className="py-3 px-4 w-1/4 border-b border-slate-800">
                        Attached Documents
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 text-xs">
                    {approvedEntries.map((item, idx) => (
                      <tr
                        key={item.tradeId || idx}
                        className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/70'}
                      >
                        {/* Column 1: Company Name (Subtrade Business Name) */}
                        <td className="py-3.5 px-4 font-bold text-slate-900 align-top">
                          <div className="flex flex-col">
                            <span className="text-sm font-bold text-slate-900">
                              {item.companyName}
                            </span>
                            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600 mt-0.5">
                              <CheckCircle2 className="w-3 h-3" />
                              {item.status}
                            </span>
                          </div>
                        </td>

                        {/* Column 2: Scope of Work (Trade scope title and cost code, e.g. "Demolition - Code 20020") */}
                        <td className="py-3.5 px-4 text-slate-800 align-top font-medium">
                          <div className="text-xs leading-relaxed text-slate-900 font-semibold">
                            {item.scopeOfWork}
                          </div>
                          {item.phaseId && (
                            <span className="inline-block mt-1 px-1.5 py-0.5 text-[10px] font-mono font-bold bg-slate-100 text-slate-600 rounded border border-slate-200">
                              Phase {item.phaseId}
                            </span>
                          )}
                        </td>

                        {/* Column 3: Attached Documents (Clickable document links or file titles) */}
                        <td className="py-3.5 px-4 text-slate-700 align-top">
                          {item.attachedDocs.length === 0 ? (
                            <span className="text-slate-400 italic text-[11px]">
                              No document attached
                            </span>
                          ) : (
                            <div className="space-y-1.5">
                              {item.attachedDocs.map((doc, docIdx) => (
                                <div key={docIdx} className="flex items-center gap-1.5">
                                  <FileText className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                                  {doc.url ? (
                                    <a
                                      href={doc.url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      onClick={(e) => {
                                        e.preventDefault();
                                        openDocumentInNewTab(doc.url, doc.name);
                                      }}
                                      className="text-blue-600 hover:text-blue-800 hover:underline inline-flex items-center gap-1 font-medium break-all"
                                      title={doc.url}
                                    >
                                      <span>{doc.name}</span>
                                      <ExternalLink className="w-2.5 h-2.5 shrink-0 opacity-70 print:hidden" />
                                    </a>
                                  ) : (
                                    <span className="font-medium text-slate-800 break-all">
                                      {doc.name}
                                    </span>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Document Footer */}
            <div className="mt-8 pt-4 border-t border-slate-200 text-slate-400 text-[11px] flex items-center justify-between">
              <div>
                The Zenith Group • Internal Procurement Document
              </div>
              <div>
                Page 1 of 1
              </div>
            </div>
          </div>
        </div>

        {/* Modal Bottom Actions Footer */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between print:hidden shrink-0">
          <span className="text-xs text-slate-500">
            Export generated dynamically from live procurement records.
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
            >
              Close
            </button>
            <button
              type="button"
              onClick={handleDownloadPdf}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              <FileDown className="w-4 h-4 text-emerald-400" />
              <span>Export PDF</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
