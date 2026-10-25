import React, { useState, useMemo } from 'react';
import { 
  CalendarClock, 
  X, 
  Search, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  XCircle, 
  Ban, 
  Download, 
  RefreshCw, 
  ExternalLink, 
  Mail, 
  Users, 
  Building2, 
  FileSpreadsheet, 
  Calendar, 
  Eye, 
  Trash2, 
  Filter
} from 'lucide-react';
import { ScheduledEmailJob } from '../types';
import { 
  generateScheduledDispatchesCsv, 
  syncScheduledDispatchesToBackend 
} from '../services/scheduleQueueService';

interface ScheduledEmailQueueDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  scheduledJobs: ScheduledEmailJob[];
  onCancelScheduledJob: (jobId: string, scopeId?: string) => void;
  onDeleteScheduledJob?: (jobId: string) => void;
  onSyncWithSheet?: () => Promise<void> | void;
  isSyncing?: boolean;
}

export const ScheduledEmailQueueDrawer: React.FC<ScheduledEmailQueueDrawerProps> = ({
  isOpen,
  onClose,
  scheduledJobs,
  onCancelScheduledJob,
  onDeleteScheduledJob,
  onSyncWithSheet,
  isSyncing = false
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'dispatched' | 'cancelled'>('all');
  const [previewJob, setPreviewJob] = useState<ScheduledEmailJob | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  // Counts
  const counts = useMemo(() => {
    return {
      all: scheduledJobs.length,
      pending: scheduledJobs.filter((j) => j.status === 'pending').length,
      dispatched: scheduledJobs.filter((j) => j.status === 'dispatched').length,
      cancelled: scheduledJobs.filter((j) => j.status === 'cancelled').length
    };
  }, [scheduledJobs]);

  // Filtered list
  const filteredJobs = useMemo(() => {
    return scheduledJobs.filter((job) => {
      // Status Filter
      if (statusFilter !== 'all' && job.status !== statusFilter) {
        return false;
      }

      // Search Query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const projectMatch = (job.projectName || '').toLowerCase().includes(query);
        const scopeMatch = (job.scopeName || '').toLowerCase().includes(query);
        const typeMatch = (job.type || '').toLowerCase().includes(query);
        const emailMatch = (job.recipientEmails || []).some((e) => e.toLowerCase().includes(query));
        const senderMatch = (job.senderName || '').toLowerCase().includes(query) || (job.senderEmail || '').toLowerCase().includes(query);
        if (!projectMatch && !scopeMatch && !typeMatch && !emailMatch && !senderMatch) {
          return false;
        }
      }

      return true;
    });
  }, [scheduledJobs, statusFilter, searchQuery]);

  // Handle Export CSV
  const handleExportCsv = () => {
    try {
      setIsExporting(true);
      const csv = generateScheduledDispatchesCsv(scheduledJobs);
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `Scheduled_Dispatches_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } finally {
      setIsExporting(false);
    }
  };

  // Format relative time helper
  const getRelativeTimeBadge = (isoDate: string) => {
    const target = new Date(isoDate).getTime();
    const now = new Date().getTime();
    const diffMs = target - now;
    
    if (diffMs < 0) {
      const pastHours = Math.round(Math.abs(diffMs) / (1000 * 60 * 60));
      return pastHours === 0 ? 'Just now' : `${pastHours}h ago`;
    }
    
    const diffMinutes = Math.round(diffMs / (1000 * 60));
    if (diffMinutes < 60) {
      return `in ${diffMinutes}m`;
    }
    const diffHours = Math.round(diffMs / (1000 * 60 * 60));
    if (diffHours < 24) {
      return `in ${diffHours}h`;
    }
    const diffDays = Math.round(diffHours / 24);
    return `in ${diffDays}d`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-950/70 backdrop-blur-xs flex justify-end animate-in fade-in duration-200">
      <div 
        id="scheduled-email-queue-drawer"
        className="w-full max-w-5xl bg-white h-full shadow-2xl flex flex-col border-l border-slate-200 overflow-hidden"
      >
        {/* ================= DRAWER HEADER ================= */}
        <div className="p-5 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-600 rounded-xl shadow-md">
              <CalendarClock className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="font-extrabold text-base sm:text-lg text-white">
                  Scheduled Email Queue & Dispatch Engine
                </h2>
                <span className="px-2.5 py-0.5 text-xs font-black rounded-full bg-amber-500/20 text-amber-300 border border-amber-400/30">
                  {counts.pending} Pending
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Manage upcoming automated tender invitations & reminders. Synced with Master Sheet (Scheduled_Dispatches tab).
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onSyncWithSheet && (
              <button
                type="button"
                onClick={() => onSyncWithSheet()}
                disabled={isSyncing}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-lg border border-slate-700 transition-colors cursor-pointer flex items-center gap-1.5"
                title="Sync queue with Google Sheets Scheduled_Dispatches tab"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-blue-400' : ''}`} />
                <span className="hidden sm:inline">Sync Master Sheet</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleExportCsv}
              disabled={isExporting || scheduledJobs.length === 0}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-lg border border-slate-700 transition-colors cursor-pointer flex items-center gap-1.5"
              title="Download Scheduled_Dispatches.csv"
            >
              <Download className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden sm:inline">Export CSV</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
              title="Close Drawer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ================= CONTROLS & FILTERS ================= */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
          {/* Search bar */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by project, scope package, or contractor email..."
              className="w-full pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Status Filter Tabs */}
          <div className="flex items-center gap-1 bg-slate-200/80 p-1 rounded-xl border border-slate-300/80">
            <button
              type="button"
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                statusFilter === 'all'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>All</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-100 font-mono">
                {counts.all}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setStatusFilter('pending')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                statusFilter === 'pending'
                  ? 'bg-amber-600 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Pending</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-amber-700/60 text-white font-mono">
                {counts.pending}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setStatusFilter('dispatched')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                statusFilter === 'dispatched'
                  ? 'bg-emerald-600 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Dispatched</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-emerald-700/60 text-white font-mono">
                {counts.dispatched}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setStatusFilter('cancelled')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                statusFilter === 'cancelled'
                  ? 'bg-rose-600 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <XCircle className="w-3.5 h-3.5" />
              <span>Cancelled</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-rose-700/60 text-white font-mono">
                {counts.cancelled}
              </span>
            </button>
          </div>
        </div>

        {/* ================= SCHEDULED ITEMS TABLE ================= */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          {filteredJobs.length === 0 ? (
            <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl p-12 text-center flex flex-col items-center justify-center max-w-lg mx-auto mt-8">
              <div className="w-14 h-14 bg-white rounded-2xl border border-slate-200 shadow-sm flex items-center justify-center text-slate-400 mb-3">
                <CalendarClock className="w-7 h-7 text-blue-500" />
              </div>
              <h3 className="font-extrabold text-slate-800 text-sm sm:text-base">
                No Scheduled Dispatches Found
              </h3>
              <p className="text-xs text-slate-500 mt-1 max-w-xs">
                {searchQuery || statusFilter !== 'all'
                  ? 'No scheduled jobs match your current search and filter criteria.'
                  : 'No emails are currently queued. You can schedule tender invitations or reminders directly from any scope card.'}
              </p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-900 text-white text-[11px] font-extrabold uppercase tracking-wider border-b border-slate-800">
                      <th className="py-3 px-4">Project</th>
                      <th className="py-3 px-4">Scope Package</th>
                      <th className="py-3 px-4">Recipients (BCC)</th>
                      <th className="py-3 px-4">Scheduled Date/Time</th>
                      <th className="py-3 px-3">Status</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 text-xs">
                    {filteredJobs.map((job) => {
                      const isPending = job.status === 'pending';
                      const isDispatched = job.status === 'dispatched';
                      const isCancelled = job.status === 'cancelled';
                      const bccCount = (job.recipientEmails || []).length || (job.selectedRecipientIds || []).length || 1;

                      return (
                        <tr 
                          key={job.id} 
                          className={`hover:bg-slate-50/80 transition-colors ${
                            isPending ? 'bg-amber-50/20' : ''
                          }`}
                        >
                          {/* 1. Project Column */}
                          <td className="py-3.5 px-4 align-middle">
                            <div className="font-bold text-slate-900 flex items-center gap-1.5">
                              <Building2 className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                              <span className="truncate max-w-[180px]" title={job.projectName}>
                                {job.projectName || 'Active Project'}
                              </span>
                            </div>
                            <span className="text-[10px] text-slate-400 font-mono">
                              ID: {job.projectId.slice(0, 8)}
                            </span>
                          </td>

                          {/* 2. Scope Package Column */}
                          <td className="py-3.5 px-4 align-middle">
                            <div className="font-extrabold text-slate-900">
                              {job.scopeName || 'Scope Package'}
                            </div>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className={`px-2 py-0.5 text-[9px] font-extrabold rounded-md uppercase tracking-wider border ${
                                job.type === 'invitation'
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                  : 'bg-amber-50 text-amber-700 border-amber-200'
                              }`}>
                                {job.type === 'invitation' ? 'Invitation' : 'Follow-up Reminder'}
                              </span>
                              {job.tenderDeadline && (
                                <span className="text-[10px] text-slate-400 truncate max-w-[120px]">
                                  Due: {job.tenderDeadline}
                                </span>
                              )}
                            </div>
                          </td>

                          {/* 3. Recipients (BCC Count) Column */}
                          <td className="py-3.5 px-4 align-middle">
                            <div className="flex items-center gap-1.5">
                              <span className="px-2 py-0.5 text-xs font-black rounded-lg bg-blue-50 text-blue-700 border border-blue-200 font-mono">
                                {bccCount}
                              </span>
                              <span className="font-semibold text-slate-700 text-xs">
                                {bccCount === 1 ? 'Contractor' : 'Contractors'} via BCC
                              </span>
                            </div>
                            {job.recipientEmails && job.recipientEmails.length > 0 && (
                              <p className="text-[10px] text-slate-400 truncate max-w-[200px] mt-0.5" title={job.recipientEmails.join(', ')}>
                                {job.recipientEmails.slice(0, 2).join(', ')}
                                {job.recipientEmails.length > 2 ? ` +${job.recipientEmails.length - 2} more` : ''}
                              </p>
                            )}
                          </td>

                          {/* 4. Scheduled Date/Time Column */}
                          <td className="py-3.5 px-4 align-middle">
                            <div className="font-bold text-slate-900 flex items-center gap-1.5">
                              <Calendar className="w-3.5 h-3.5 text-slate-500" />
                              <span>{job.scheduledTimeDisplay || job.scheduledTime}</span>
                            </div>
                            <div className="flex items-center gap-1 mt-0.5">
                              <span className={`px-1.5 py-0.2 text-[10px] font-mono font-bold rounded ${
                                isPending
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-slate-100 text-slate-600'
                              }`}>
                                {getRelativeTimeBadge(job.scheduledTime)}
                              </span>
                              {job.autoRule && (
                                <span className="text-[10px] text-slate-400">
                                  ({job.autoRule})
                                </span>
                              )}
                            </div>
                          </td>

                          {/* 5. Status Column */}
                          <td className="py-3.5 px-3 align-middle">
                            {isPending && (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
                                <span>Pending</span>
                              </span>
                            )}
                            {isDispatched && (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                <span>Dispatched</span>
                              </span>
                            )}
                            {isCancelled && (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800 border border-rose-300">
                                <Ban className="w-3 h-3 text-rose-600" />
                                <span>Cancelled</span>
                              </span>
                            )}
                          </td>

                          {/* 6. Actions Column */}
                          <td className="py-3.5 px-4 align-middle text-right">
                            <div className="flex items-center justify-end gap-2">
                              {/* Preview Email Content */}
                              <button
                                type="button"
                                onClick={() => setPreviewJob(job)}
                                className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                                title="View Email Payload & BCC List"
                              >
                                <Eye className="w-4 h-4" />
                              </button>

                              {/* Prominent Cancel Button for Pending Dispatches */}
                              {isPending && (
                                <button
                                  type="button"
                                  id={`cancel-scheduled-job-${job.id}`}
                                  onClick={() => {
                                    if (window.confirm(`Are you sure you want to cancel and revoke the scheduled ${job.type} dispatch for "${job.scopeName}"?`)) {
                                      onCancelScheduledJob(job.id, job.scopeId);
                                    }
                                  }}
                                  className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs rounded-xl shadow-xs hover:shadow transition-all cursor-pointer flex items-center gap-1.5 active:scale-95"
                                  title="Revoke execution trigger and cancel scheduled dispatch"
                                >
                                  <Ban className="w-3.5 h-3.5 text-white" />
                                  <span>Cancel Scheduled Email</span>
                                </button>
                              )}

                              {/* Delete Job History */}
                              {!isPending && onDeleteScheduledJob && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (window.confirm('Remove this historic dispatch entry from queue log?')) {
                                      onDeleteScheduledJob(job.id);
                                    }
                                  }}
                                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                  title="Delete entry from log"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* ================= DRAWER FOOTER ================= */}
        <div className="p-4 bg-slate-100 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2 text-xs text-slate-600">
            <FileSpreadsheet className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>
              <strong>Master Sheet Tab:</strong> <code className="bg-white px-1.5 py-0.5 rounded border border-slate-300 font-mono text-[11px]">Scheduled_Dispatches</code> • Accessible by Shanice & Nadia
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 font-bold border border-slate-300 rounded-xl text-xs transition-colors cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </div>

      {/* ================= PREVIEW JOB MODAL ================= */}
      {previewJob && (
        <div className="fixed inset-0 z-60 overflow-y-auto bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[85vh]">
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <Mail className="w-4 h-4 text-blue-400" />
                <h3 className="font-bold text-sm text-white">
                  Scheduled Email Details: {previewJob.scopeName}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setPreviewJob(null)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 overflow-y-auto flex-1 text-xs">
              <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Project</span>
                  <span className="font-bold text-slate-900">{previewJob.projectName}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Scope Package</span>
                  <span className="font-bold text-slate-900">{previewJob.scopeName}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Scheduled Execution</span>
                  <span className="font-bold text-slate-900">{previewJob.scheduledTimeDisplay}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Status</span>
                  <span className={`inline-block font-extrabold uppercase text-[10px] ${
                    previewJob.status === 'pending' ? 'text-amber-600' : previewJob.status === 'dispatched' ? 'text-emerald-600' : 'text-rose-600'
                  }`}>
                    {previewJob.status}
                  </span>
                </div>
              </div>

              <div>
                <span className="text-slate-500 block text-[11px] font-extrabold mb-1">
                  BCC Recipient Array ({previewJob.recipientEmails?.length || 0}):
                </span>
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 font-mono text-[11px] text-slate-800 break-all max-h-24 overflow-y-auto">
                  {(previewJob.recipientEmails || []).join(', ') || 'No recipients'}
                </div>
              </div>

              {previewJob.generatedHtml && (
                <div>
                  <span className="text-slate-500 block text-[11px] font-extrabold mb-1">
                    Email HTML Body Preview:
                  </span>
                  <div 
                    className="p-4 bg-white border border-slate-200 rounded-xl max-h-56 overflow-y-auto prose prose-xs"
                    dangerouslySetInnerHTML={{ __html: previewJob.generatedHtml }}
                  />
                </div>
              )}
            </div>

            <div className="p-3.5 bg-slate-100 border-t border-slate-200 flex justify-end">
              <button
                type="button"
                onClick={() => setPreviewJob(null)}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs cursor-pointer"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
