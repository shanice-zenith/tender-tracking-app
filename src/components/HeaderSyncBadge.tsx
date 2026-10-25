import React, { useState } from 'react';
import { 
  CheckCircle2, 
  Copy, 
  Check, 
  ExternalLink, 
  Server, 
  Database, 
  Layers, 
  FileSpreadsheet, 
  X, 
  Activity,
  ArrowUpRight,
  ShieldCheck,
  Zap,
  Trash2,
  AlertTriangle
} from 'lucide-react';
import { dbService } from '../services/databaseService';

interface HeaderSyncBadgeProps {
  masterSheetUrl: string;
  totalProjectsCount?: number;
  totalFormsCount?: number;
  className?: string;
  trigger?: (openModal: () => void) => React.ReactNode;
}

export const HeaderSyncBadge: React.FC<HeaderSyncBadgeProps> = ({
  masterSheetUrl,
  totalProjectsCount = 10,
  totalFormsCount = 44,
  className = '',
  trigger
}) => {
  const [openDiagnosticsModal, setOpenDiagnosticsModal] = useState(false);
  const [copiedEndpoint, setCopiedEndpoint] = useState(false);
  const [isWipingQuotes, setIsWipingQuotes] = useState(false);
  const [wipeResult, setWipeResult] = useState<string | null>(null);

  // Canonical Cloud Run production endpoint requested by user
  const apiReceiverEndpoint = 'https://tender-tracking-app-710292044344.us-west1.run.app/api/webhooks/form-submit';

  const handleCopyEndpoint = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(apiReceiverEndpoint);
    setCopiedEndpoint(true);
    setTimeout(() => setCopiedEndpoint(false), 2000);
  };

  const handleWipeMisassignedQuotes = async () => {
    if (!window.confirm('Are you sure you want to delete all quotes in Firestore where Cost Code is "20020" or where trade was incorrectly assigned to "Demolition"?')) {
      return;
    }
    setIsWipingQuotes(true);
    setWipeResult(null);
    try {
      const res = await dbService.wipeMisassignedDemolitionQuotes();
      setWipeResult(`Successfully wiped ${res.count} misassigned Demolition quote document(s) from Firestore.`);
    } catch (err: any) {
      console.error('Error wiping misassigned quotes:', err);
      setWipeResult(`Error: ${err?.message || 'Failed to wipe misassigned quotes'}`);
    } finally {
      setIsWipingQuotes(false);
    }
  };

  return (
    <>
      {trigger ? (
        trigger(() => setOpenDiagnosticsModal(true))
      ) : (
        /* Split Badge Container */
        <div 
          id="header-sync-badge-container"
          className={`flex items-center rounded-lg bg-slate-800/80 border border-emerald-500/30 px-3 py-1.5 shadow-sm whitespace-nowrap shrink-0 ${className}`}
        >
          {/* Left: Status Pill (Click opens diagnostics modal) */}
          <button 
            type="button"
            id="header-webhook-diagnostics-btn"
            onClick={() => setOpenDiagnosticsModal(true)}
            className="flex items-center gap-2 pr-3 border-r border-slate-700 hover:text-emerald-400 transition cursor-pointer text-left group"
            title="Click to view real-time webhook sync diagnostics & endpoint status"
          >
            <span className="relative flex h-2.5 w-2.5 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
            <div className="text-left">
              <div className="text-xs font-semibold text-white group-hover:text-emerald-300 flex items-center gap-1 transition-colors">
                <span>⚡ Live Webhook Sync</span>
              </div>
              <div className="text-[10px] text-emerald-400 font-mono leading-tight">
                {totalFormsCount} Forms ➔ Firestore
              </div>
            </div>
          </button>

          {/* Right: Quick-Link to Master Sheet Log */}
          <a 
            id="header-master-sheet-log-link"
            href={masterSheetUrl} 
            target="_blank" 
            rel="noreferrer"
            className="pl-3 text-slate-400 hover:text-white transition-colors p-1 cursor-pointer flex items-center justify-center group"
            title="Open Read-Only Master Sheet Log"
          >
            <ExternalLink className="w-4 h-4 group-hover:text-emerald-300 transition-colors" />
          </a>
        </div>
      )}

      {/* Sync Diagnostics Modal */}
      {openDiagnosticsModal && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150"
          onClick={() => setOpenDiagnosticsModal(false)}
        >
          <div 
            className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden text-slate-100 animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-800 bg-slate-950/50">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400">
                  <Activity className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    Sync Diagnostics & Webhook Status
                  </h3>
                  <p className="text-xs text-slate-400">
                    Real-time ingestion pipeline from Google Forms directly to Firestore
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setOpenDiagnosticsModal(false)}
                className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4">
              {/* Receiver Endpoint Card */}
              <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3.5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Server className="w-3.5 h-3.5 text-indigo-400" />
                    API Receiver Endpoint
                  </span>
                  <button
                    type="button"
                    onClick={handleCopyEndpoint}
                    className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-400 hover:text-emerald-300 transition-colors cursor-pointer"
                  >
                    {copiedEndpoint ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedEndpoint ? 'Copied' : 'Copy Endpoint'}</span>
                  </button>
                </div>
                <div className="p-2.5 bg-slate-900 border border-slate-800 rounded-lg font-mono text-[11px] text-emerald-400 break-all select-all flex items-center justify-between gap-2">
                  <span>{apiReceiverEndpoint}</span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Accepts direct JSON POST payloads from Google Apps Script <code className="text-slate-300 font-mono text-[10px]">onFormSubmit(e)</code> triggers.
                </p>
              </div>

              {/* Status Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Status Indicator */}
                <div className="p-3.5 bg-slate-950/60 border border-slate-800 rounded-xl space-y-1">
                  <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5 text-emerald-400" />
                    Endpoint Status
                  </div>
                  <div className="flex items-center gap-2 pt-1">
                    <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
                    <span className="text-sm font-bold text-emerald-400">🟢 200 OK</span>
                  </div>
                  <p className="text-[10px] text-slate-400">
                    Listening for Google Form submissions
                  </p>
                </div>

                {/* Primary Database */}
                <div className="p-3.5 bg-slate-950/60 border border-slate-800 rounded-xl space-y-1">
                  <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Database className="w-3.5 h-3.5 text-amber-400" />
                    Primary Database
                  </div>
                  <div className="text-sm font-bold text-amber-300 pt-1">
                    Firebase Firestore
                  </div>
                  <p className="text-[10px] text-slate-400 flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3 text-emerald-400" />
                    Realtime onSnapshot Streaming
                  </p>
                </div>
              </div>

              {/* Connected Forms Metrics */}
              <div className="p-3.5 bg-slate-950/60 border border-slate-800 rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-blue-500/10 text-blue-400 rounded-lg">
                    <Layers className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-200">Connected Forms</div>
                    <div className="text-[11px] text-slate-400">
                      {totalFormsCount} Google Forms mapped across {totalProjectsCount} Portfolio Projects
                    </div>
                  </div>
                </div>
                <span className="px-2 py-0.5 bg-blue-500/20 text-blue-300 font-mono font-bold text-xs rounded border border-blue-500/30">
                  {totalFormsCount} Forms
                </span>
              </div>

              {/* Master Sheet Quick Action Card */}
              <div className="p-3.5 bg-slate-950/60 border border-slate-800 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg shrink-0">
                    <FileSpreadsheet className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-200">Master Sheet Backup</div>
                    <div className="text-[11px] text-slate-400">
                      View read-only Google Sheet audit log and historical records
                    </div>
                  </div>
                </div>
                <a
                  href={masterSheetUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs rounded-lg transition-colors cursor-pointer shrink-0 shadow-xs"
                >
                  <span>Open Read-Only Sheet</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </a>
              </div>

              {/* Wipe & Clear Misassigned Quotes (Cost Code 20020 / Demolition) */}
              <div className="p-3.5 bg-rose-950/40 border border-rose-800/60 rounded-xl space-y-2.5">
                <div className="flex items-start gap-2.5">
                  <div className="p-2 bg-rose-500/20 border border-rose-500/30 text-rose-400 rounded-lg shrink-0 mt-0.5">
                    <Trash2 className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-rose-200">
                      Misassigned Quote Purge Tool
                    </div>
                    <p className="text-[11px] text-rose-300/80 leading-relaxed">
                      Deletes all documents in the <code className="font-mono bg-rose-950 px-1 py-0.5 rounded text-rose-200">quotes</code> Firestore collection where <span className="font-mono text-rose-200 font-semibold">costCode</span> is "20020" or where <span className="font-mono text-rose-200 font-semibold">trade</span> was incorrectly assigned to "Demolition".
                    </p>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1 border-t border-rose-900/60">
                  <button
                    type="button"
                    id="wipe-clear-misassigned-quotes-btn"
                    onClick={handleWipeMisassignedQuotes}
                    disabled={isWipingQuotes}
                    className="inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 bg-rose-600 hover:bg-rose-500 active:bg-rose-700 disabled:bg-rose-900/50 disabled:cursor-not-allowed text-white font-semibold text-xs rounded-lg transition-colors cursor-pointer shadow-xs"
                  >
                    <Trash2 className={`w-3.5 h-3.5 ${isWipingQuotes ? 'animate-spin' : ''}`} />
                    <span>{isWipingQuotes ? 'Wiping Misassigned Quotes...' : 'Wipe & Clear Misassigned Quotes'}</span>
                  </button>

                  {wipeResult && (
                    <span className="text-[11px] font-medium text-rose-300 animate-in fade-in">
                      {wipeResult}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-950 border-t border-slate-800 flex justify-end">
              <button
                type="button"
                onClick={() => setOpenDiagnosticsModal(false)}
                className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
