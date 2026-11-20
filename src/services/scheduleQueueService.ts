import { Project, ScopeLineItem, TradeEntry, Contact, ScheduledEmailJob, NoteItem } from '../types';
import { appsScriptService } from './appsScriptService';
import { gmailApiService } from './gmailApiService';
import { googleAuthService } from './googleAuthService';
import { doc, setDoc, deleteDoc, updateDoc, runTransaction } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { sanitizePayload } from './databaseService';


const SCHEDULE_STORAGE_KEY = 'tender_tracker_scheduled_email_jobs_v4';

const MONTH_NAMES_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTH_NAMES_FULL = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

/**
 * Format a Date object into a readable pill tag display string like "Oct 12, 9:00 AM"
 */
export function formatScheduleDateDisplay(date: Date): string {
  const month = MONTH_NAMES_SHORT[date.getMonth()];
  const day = date.getDate();
  let hours = date.getHours();
  const minutes = date.getMinutes();
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12; // hour '0' should be '12'
  const minutesStr = minutes < 10 ? `0${minutes}` : `${minutes}`;
  return `${month} ${day}, ${hours}:${minutesStr} ${ampm}`;
}

/**
 * Parse a deadline string like "October 12th - 11:00 PM" or ISO string into a JavaScript Date
 */
export function parseDeadlineStringToDate(deadlineStr: string, fallbackDaysFromNow = 7): Date {
  const now = new Date();
  if (!deadlineStr || typeof deadlineStr !== 'string') {
    const fallback = new Date(now);
    fallback.setDate(fallback.getDate() + fallbackDaysFromNow);
    fallback.setHours(23, 0, 0, 0);
    return fallback;
  }

  // Check if it's already an ISO string
  if (deadlineStr.includes('T') && !isNaN(Date.parse(deadlineStr))) {
    return new Date(deadlineStr);
  }

  const parts = deadlineStr.split(/\s*-\s*/);
  const datePart = parts[0]?.trim() || '';
  const timePart = parts[1]?.trim() || '11:00 PM';

  let targetDate = new Date(now);
  let parsedMonthIndex = -1;
  let parsedDayNumber = -1;

  for (let i = 0; i < MONTH_NAMES_FULL.length; i++) {
    if (datePart.toLowerCase().includes(MONTH_NAMES_FULL[i].toLowerCase()) ||
      datePart.toLowerCase().includes(MONTH_NAMES_SHORT[i].toLowerCase())) {
      parsedMonthIndex = i;
      break;
    }
  }

  const dayMatch = datePart.match(/\b(\d{1,2})(?:st|nd|rd|th)?\b/);
  if (dayMatch) {
    parsedDayNumber = parseInt(dayMatch[1], 10);
  }

  if (parsedMonthIndex !== -1 && parsedDayNumber !== -1 && !isNaN(parsedDayNumber)) {
    targetDate = new Date(now.getFullYear(), parsedMonthIndex, parsedDayNumber);
    // If date has already passed by more than 30 days, assume next year
    if (targetDate.getTime() < now.getTime() - 30 * 24 * 60 * 60 * 1000) {
      targetDate.setFullYear(now.getFullYear() + 1);
    }
  } else {
    targetDate.setDate(now.getDate() + fallbackDaysFromNow);
  }

  // Parse time part
  const timeMatch = timePart.match(/(\d{1,2}):?(\d{2})?\s*(AM|PM)?/i);
  if (timeMatch) {
    let hours = parseInt(timeMatch[1], 10);
    const minutes = timeMatch[2] ? parseInt(timeMatch[2], 10) : 0;
    const meridian = timeMatch[3] ? timeMatch[3].toUpperCase() : 'PM';
    if (meridian === 'PM' && hours < 12) hours += 12;
    if (meridian === 'AM' && hours === 12) hours = 0;
    targetDate.setHours(hours, minutes, 0, 0);
  } else {
    targetDate.setHours(23, 0, 0, 0);
  }

  return targetDate;
}

/**
 * Calculates the automated reminder/launch date and time (e.g. 5 days prior at 8:00 AM)
 */
export function calculateAutoReminderDate(
  deadlineStr: string,
  daysPrior = 5,
  hour = 8,
  minute = 0
): { date: Date; iso: string; display: string } {
  const deadlineDate = parseDeadlineStringToDate(deadlineStr, 7);
  const reminderDate = new Date(deadlineDate);
  reminderDate.setDate(reminderDate.getDate() - daysPrior);
  reminderDate.setHours(hour, minute, 0, 0);

  // If the calculated date is in the past, set to tomorrow at specified hour
  const now = new Date();
  if (reminderDate.getTime() <= now.getTime()) {
    reminderDate.setTime(now.getTime());
    reminderDate.setDate(now.getDate() + 1);
    reminderDate.setHours(hour, minute, 0, 0);
  }

  return {
    date: reminderDate,
    iso: reminderDate.toISOString(),
    display: formatScheduleDateDisplay(reminderDate)
  };
}

/**
 * Strict Target Audience Guard:
 * Reminders must be dispatched ONLY to contractors whose status is:
 * 'Estimate Requested', 'Waiting on Response', or 'Follow-up Pending'.
 * 
 * Contractors who have already submitted a quote (PO Approved, Revision Submitted,
 * Request Revised Estimate, Confirm w/ ID, Confirm with PM, or have quotedFigure > 0)
 * MUST be skipped.
 */
export function isTradeEligibleForReminder(trade: TradeEntry): boolean {
  // If trade is awarded or PO is approved/sent, skip
  if (trade.isAwarded || trade.poSent) return false;

  // If trade has a quoted figure > 0, they have already submitted a quote
  if (trade.quotedFigure && trade.quotedFigure > 0) return false;

  // If trade has quote breakdown items with positive values, skip
  if (trade.quoteBreakdown && trade.quoteBreakdown.some((qb) => qb.amount > 0)) return false;

  // Strict whitelist of permitted status values for reminder dispatch
  const permittedStatuses = [
    'Estimate Requested',
    'Waiting on Response',
    'Follow-up Pending'
  ];

  return permittedStatuses.includes(trade.actionStatus);
}

/**
 * Get all stored scheduled jobs
 */
export function getStoredScheduledJobs(): ScheduledEmailJob[] {
  try {
    const raw = localStorage.getItem(SCHEDULE_STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to load scheduled email jobs:', e);
    return [];
  }
}
export function syncRemoteScheduledJobs(remoteJobs: ScheduledEmailJob[]): ScheduledEmailJob[] {
  const remoteIds = new Set(remoteJobs.map((j) => j.id));
  const twoMinutesAgo = Date.now() - 2 * 60 * 1000;

  // Keep freshly created local pending jobs until Firestore snapshot confirms them
  const unconfirmedLocalPending = getStoredScheduledJobs().filter(
    (localJob) =>
      localJob.status === 'pending' &&
      !remoteIds.has(localJob.id) &&
      new Date(localJob.createdAt || 0).getTime() >= twoMinutesAgo
  );

  const merged = [...unconfirmedLocalPending, ...remoteJobs].sort(
    (a, b) => new Date(b.createdAt || b.scheduledTime).getTime() - new Date(a.createdAt || a.scheduledTime).getTime()
  );

  try {
    localStorage.setItem(SCHEDULE_STORAGE_KEY, JSON.stringify(merged));
  } catch (e) {
    console.warn('Notice syncing remote scheduled jobs to storage:', e);
  }
  return merged;
}

/**
 * Save / Update a scheduled job in persistent storage and await Firestore write
 */
export async function saveScheduledJob(
  job: ScheduledEmailJob
): Promise<{ success: boolean; jobs: ScheduledEmailJob[]; error?: string }> {
  const existing = getStoredScheduledJobs();
  const filtered = existing.filter((j) => j.id !== job.id);
  const updated = [job, ...filtered];
  try {
    localStorage.setItem(SCHEDULE_STORAGE_KEY, JSON.stringify(updated));
  } catch (e) {
    console.warn('Notice saving scheduled email job to storage:', e);
  }

  if (db) {
    try {
      const jobRef = doc(db, 'scheduled_emails', job.id);
      await setDoc(
        jobRef,
        sanitizePayload({
          ...job,
          updatedAt: new Date().toISOString()
        }),
        { merge: true }
      );
    } catch (err: any) {
      console.error('Firestore scheduled_emails save error:', err);
      return {
        success: false,
        jobs: updated,
        error: err?.message || 'Failed to save scheduled email to Firestore.'
      };
    }
  }

  syncScheduledDispatchesToBackend(updated);
  return { success: true, jobs: updated };
}

/**
 * Generate CSV representation of Scheduled Dispatches for Master Sheet 'Scheduled_Dispatches' tab
 */
export function generateScheduledDispatchesCsv(jobs: ScheduledEmailJob[]): string {
  const headers = [
    'Job_ID',
    'Project_Name',
    'Scope_Package',
    'Dispatch_Type',
    'Scheduled_Time',
    'Scheduled_Display',
    'BCC_Count',
    'Recipient_Emails',
    'Status',
    'Created_At',
    'Sender_Name',
    'Sender_Email',
    'Tender_Deadline'
  ];

  const rows = jobs.map((j) => {
    const emailsStr = (j.recipientEmails || []).join('; ');
    const bccCount = (j.recipientEmails || []).length || (j.selectedRecipientIds || []).length || 1;
    return [
      `"${j.id}"`,
      `"${(j.projectName || '').replace(/"/g, '""')}"`,
      `"${(j.scopeName || '').replace(/"/g, '""')}"`,
      `"${j.type.toUpperCase()}"`,
      `"${j.scheduledTime}"`,
      `"${j.scheduledTimeDisplay}"`,
      bccCount,
      `"${emailsStr.replace(/"/g, '""')}"`,
      `"${j.status.toUpperCase()}"`,
      `"${j.createdAt}"`,
      `"${(j.senderName || '').replace(/"/g, '""')}"`,
      `"${(j.senderEmail || '').replace(/"/g, '""')}"`,
      `"${(j.tenderDeadline || '').replace(/"/g, '""')}"`
    ].join(',');
  });

  return [headers.join(','), ...rows].join('\n');
}

/**
 * Persist scheduled jobs and synchronize with Google Sheets 'Scheduled_Dispatches' tab
 */
export async function syncScheduledDispatchesToBackend(jobs?: ScheduledEmailJob[]): Promise<{ success: boolean; message: string }> {
  const currentJobs = jobs || getStoredScheduledJobs();
  const csv = generateScheduledDispatchesCsv(currentJobs);

  try {
    return await appsScriptService.syncScheduledDispatchesToSheet(currentJobs, csv);
  } catch (e: any) {
    console.warn('Sync scheduled dispatches to backend warning:', e);
    return { success: false, message: e.message || 'Failed to sync scheduled dispatches' };
  }
}

/**
 * Cancel a scheduled email job and revoke execution trigger in Google Apps Script / backend queue
 */
export function cancelScheduledJob(jobIdOrScopeId: string): ScheduledEmailJob[] {
  const existing = getStoredScheduledJobs();
  let cancelledJob: ScheduledEmailJob | undefined;

  const updated = existing.map((j) => {
    if (j.id === jobIdOrScopeId || j.scopeId === jobIdOrScopeId) {
      cancelledJob = j;
      return { ...j, status: 'cancelled' as const };
    }
    return j;
  });

  try {
    localStorage.setItem(SCHEDULE_STORAGE_KEY, JSON.stringify(updated));
  } catch (e) {
    console.warn('Notice updating scheduled email job in storage:', e);
  }

  // Update status in Firestore scheduled_emails collection
  if (db) {
    const targetId = cancelledJob?.id || jobIdOrScopeId;
    try {
      const jobRef = doc(db, 'scheduled_emails', targetId);
      updateDoc(jobRef, sanitizePayload({
        status: 'cancelled',
        updatedAt: new Date().toISOString()
      })).catch((err) => {
        console.warn('Firestore scheduled_emails update error:', err);
      });
    } catch (err) {
      console.warn('Firestore scheduled_emails update error:', err);
    }
  }

  // Revoke trigger in Google Apps Script and Express server
  if (cancelledJob) {
    appsScriptService.cancelScheduledExecution(cancelledJob.id, cancelledJob.scopeId);
  } else {
    appsScriptService.cancelScheduledExecution(jobIdOrScopeId, jobIdOrScopeId);
  }

  // Auto-sync updated status into Master Sheet Scheduled_Dispatches tab
  syncScheduledDispatchesToBackend(updated);

  return updated;
}

/**
 * Delete a scheduled email job completely
 */
export function deleteScheduledJob(jobId: string): ScheduledEmailJob[] {
  const existing = getStoredScheduledJobs();
  const updated = existing.filter((j) => j.id !== jobId);
  try {
    localStorage.setItem(SCHEDULE_STORAGE_KEY, JSON.stringify(updated));
  } catch (e) {
    console.warn('Notice deleting scheduled email job:', e);
  }

  // Delete from Firestore scheduled_emails collection
  if (db) {
    try {
      const jobRef = doc(db, 'scheduled_emails', jobId);
      deleteDoc(jobRef).catch((err) => {
        console.warn('Firestore scheduled_emails delete error:', err);
      });
    } catch (err) {
      console.warn('Firestore scheduled_emails delete error:', err);
    }
  }

  return updated;
}

/**
 * Background Queue Engine:
 * Scans all pending jobs. If the scheduled time has arrived (<= now):
 * 1. Checks Target Audience Guard (for reminders)
 * 2. Updates trade statuses (Estimate Requested for invites, Follow-up Pending for reminders)
 * 3. Appends audit notes
 * 4. Marks job as dispatched
 * 5. Returns updated projects and list of newly dispatched jobs
 */
let isQueueProcessing = false;

export async function processPendingQueue(
  projects: Project[],
  contacts: Contact[],
  forceDeployAll = false
): Promise<{
  updatedProjects: Project[];
  dispatchedJobs: ScheduledEmailJob[];
  hasChanges: boolean;
  errorMessage?: string;
}> {
  if (isQueueProcessing) {
    return { updatedProjects: projects, dispatchedJobs: [], hasChanges: false };
  }

  isQueueProcessing = true;
  try {
    const allJobs = getStoredScheduledJobs();
    const nowTime = Date.now();
    const nowIso = new Date(nowTime).toISOString();
    const todayFormatted = nowIso.split('T')[0];
    const staleDispatchCutoff = nowTime - 2 * 60 * 1000;

    // Include 'pending' jobs plus any stale 'dispatching' jobs stuck > 2 minutes
    const dueJobs = allJobs.filter((job) => {
      const statusStr = String(job.status || '');
      const isStaleDispatching =
        statusStr === 'dispatching' &&
        new Date((job as any).updatedAt || job.createdAt || 0).getTime() <= staleDispatchCutoff;

      if (statusStr !== 'pending' && !isStaleDispatching) return false;
      return forceDeployAll || new Date(job.scheduledTime).getTime() <= nowTime;
    });

    if (dueJobs.length === 0) {
      return { updatedProjects: projects, dispatchedJobs: [], hasChanges: false };
    }

    let projectsUpdated = false;
    let modifiedProjects = [...projects];
    const newlyDispatchedJobs: ScheduledEmailJob[] = [];
    const updatedAllJobs = [...allJobs];
    let lastErrorMessage = '';

    const googleAccessToken = googleAuthService.getAccessToken();
    const currentGoogleUser = googleAuthService.getCurrentUser();

    for (const job of dueJobs) {
      // Atomically claim the Firestore job so browser + background trigger never send twice
      if (db) {
        try {
          const jobRef = doc(db, 'scheduled_emails', job.id);
          const claimed = await runTransaction(db, async (tx) => {
            const snap = await tx.get(jobRef);
            if (!snap.exists()) return true;
            const data = snap.data();
            const st = String(data.status || '');
            const isStale =
              st === 'dispatching' &&
              new Date(data.updatedAt || data.createdAt || 0).getTime() <= staleDispatchCutoff;
            if (st !== 'pending' && !isStale) return false;
            tx.update(jobRef, { status: 'dispatching', updatedAt: nowIso });
            return true;
          });
          if (!claimed) continue;
        } catch (claimErr) {
          console.warn('Scheduled job claim notice:', claimErr);
        }
      }

      // Resolve BCC email addresses from stored recipientEmails or contact lookup
      const resolvedEmails = new Set<string>(
        (job.recipientEmails || []).map((e) => e.trim()).filter((e) => e.includes('@'))
      );
      if (resolvedEmails.size === 0) {
        (job.selectedRecipientIds || []).forEach((id) => {
          const custom = job.customEmails?.[id]?.trim();
          if (custom && custom.includes('@')) {
            resolvedEmails.add(custom);
            return;
          }
          const contact = contacts.find((c) => c.id === id);
          if (contact?.email && contact.email.includes('@')) {
            resolvedEmails.add(contact.email.trim());
          }
        });
      }

      const bccRecipients = Array.from(resolvedEmails).filter(
        (e) => e.toLowerCase() !== 'info@thezenithgroup.ca'
      );

      if (bccRecipients.length === 0) {
        if (db) {
          updateDoc(doc(db, 'scheduled_emails', job.id), {
            status: 'cancelled',
            updatedAt: new Date().toISOString()
          }).catch(() => { });
        }
        continue;
      }

      const subject =
        (job as any).subject ||
        (job.type === 'reminder'
          ? `Tender Follow-up: ${job.projectName || 'Project'} - ${job.scopeName || 'Scope'} Estimate Reminder`
          : `Estimate Request: ${job.projectName || 'Project'} - ${job.scopeName || 'Scope'}`);

      const htmlBody =
        job.generatedHtml ||
        `<p>Hello,</p><p>Please review the tender package for <strong>${job.projectName || 'Project'} — ${job.scopeName || 'Scope'}</strong> (Deadline: ${job.tenderDeadline || 'TBD'}).</p><p><a href="${job.driveLink || '#'}">View Plans &amp; Specifications</a> | <a href="${job.formLink || '#'}">Submit Estimate</a></p>`;

      let dispatchRes: { success: boolean; dispatchedCount: number; message?: string; errorMessage?: string };

      // 1. Prefer Google Gmail API when user has an active Google OAuth token (same engine as Send Immediately)
      if (googleAccessToken) {
        dispatchRes = await gmailApiService.dispatchSingleBccBatch({
          accessToken: googleAccessToken,
          senderName: job.senderName || currentGoogleUser?.name || 'Shanice',
          senderEmail: job.senderEmail || currentGoogleUser?.email || 'shanice@thezenithgroup.ca',
          to: 'info@thezenithgroup.ca',
          bccRecipients,
          subject,
          htmlBody,
          cc: job.ccEmails || []
        });

        // If OAuth token expired (401), clear stale token and fall back to Apps Script
        if (!dispatchRes.success && (dispatchRes.errorMessage || '').includes('401')) {
          googleAuthService.setAccessToken(null);
          const endpointUrl = appsScriptService.getEndpointUrl();
          if (endpointUrl) {
            dispatchRes = await appsScriptService.dispatchSingleBccBatch({
              endpointUrl,
              to: 'info@thezenithgroup.ca',
              bccRecipients,
              subject,
              htmlBody,
              cc: job.ccEmails || []
            });
          }
        }
      } else {
        // 2. Fallback to Apps Script endpoint
        const endpointUrl = appsScriptService.getEndpointUrl();
        dispatchRes = await appsScriptService.dispatchSingleBccBatch({
          endpointUrl,
          to: 'info@thezenithgroup.ca',
          bccRecipients,
          subject,
          htmlBody,
          cc: job.ccEmails || []
        });
      }

      if (!dispatchRes.success && dispatchRes.dispatchedCount === 0) {
        lastErrorMessage =
          dispatchRes.errorMessage ||
          'Email dispatch failed. Please re-sign in with your @thezenithgroup.ca Google account.';
        if (db) {
          updateDoc(doc(db, 'scheduled_emails', job.id), {
            status: 'pending',
            updatedAt: new Date().toISOString()
          }).catch(() => { });
        }
        continue;
      }

      const targetProjectIndex = modifiedProjects.findIndex((p) => p.id === job.projectId);
      if (targetProjectIndex >= 0) {
        const targetProject = modifiedProjects[targetProjectIndex];
        const targetScopeIndex = targetProject.scopes.findIndex((s) => s.id === job.scopeId);

        if (targetScopeIndex >= 0) {
          const targetScope = targetProject.scopes[targetScopeIndex];
          const updatedTrades = [...targetScope.trades];

          if (job.type === 'invitation') {
            job.selectedRecipientIds.forEach((contactId) => {
              const contact = contacts.find((c) => c.id === contactId);
              if (!contact) return;

              const tradeIndex = updatedTrades.findIndex(
                (t) =>
                  (t.contactId && t.contactId === contactId) ||
                  t.companyName.toLowerCase() === contact.company.toLowerCase()
              );

              const dispatchNote: NoteItem = {
                id: `note-sched-inv-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
                text: `[AUTOMATED SCHEDULED LAUNCH] Tender invitation dispatched on ${todayFormatted} (Deadline: ${job.tenderDeadline}) from ${job.senderName || 'Zenith Estimating'}.`,
                timestamp: nowIso,
                author: 'Zenith Background Engine'
              };

              if (tradeIndex >= 0) {
                updatedTrades[tradeIndex] = {
                  ...updatedTrades[tradeIndex],
                  actionStatus: 'Estimate Requested',
                  hasBeenInvited: true,
                  notes: [dispatchNote, ...updatedTrades[tradeIndex].notes]
                };
              } else {
                updatedTrades.push({
                  id: `t-${targetScope.id}-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
                  scopeId: targetScope.id,
                  contactId: contact.id,
                  contractorName: contact.name,
                  companyName: contact.company,
                  category: contact.category || (contact.trade_categories && contact.trade_categories[0]) || targetScope.name,
                  quotedFigure: 0,
                  currency: 'CAD',
                  attachedDocs: [],
                  actionStatus: 'Estimate Requested',
                  poSent: false,
                  isAwarded: false,
                  hasBeenInvited: true,
                  notes: [dispatchNote]
                });
              }
            });

            const updatedScopes = [...targetProject.scopes];
            updatedScopes[targetScopeIndex] = {
              ...targetScope,
              googleFormUrl: job.formLink || targetScope.googleFormUrl,
              tenderDeadline: job.tenderDeadline || targetScope.tenderDeadline,
              trades: updatedTrades,
              scheduledInvite: { ...job, status: 'dispatched', dispatchedAt: nowIso }
            };
            modifiedProjects[targetProjectIndex] = {
              ...targetProject,
              scopes: updatedScopes,
              updatedAt: nowIso
            };
            projectsUpdated = true;
          } else if (job.type === 'reminder') {
            const auditedTrades = updatedTrades.map((trade) => {
              if (!job.selectedRecipientIds.includes(trade.id) || !isTradeEligibleForReminder(trade)) {
                return trade;
              }
              const reminderNote: NoteItem = {
                id: `note-sched-rem-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
                text: `[AUTOMATED SCHEDULED REMINDER] Follow-up reminder dispatched on ${todayFormatted} (Deadline: ${job.tenderDeadline}) from ${job.senderName || 'Zenith Estimating'}.`,
                timestamp: nowIso,
                author: 'Zenith Background Engine'
              };
              return {
                ...trade,
                actionStatus: 'Follow-up Pending' as const,
                notes: [reminderNote, ...trade.notes]
              };
            });

            const updatedScopes = [...targetProject.scopes];
            updatedScopes[targetScopeIndex] = {
              ...targetScope,
              googleFormUrl: job.formLink || targetScope.googleFormUrl,
              tenderDeadline: job.tenderDeadline || targetScope.tenderDeadline,
              trades: auditedTrades,
              scheduledReminder: { ...job, status: 'dispatched', dispatchedAt: nowIso }
            };
            modifiedProjects[targetProjectIndex] = {
              ...targetProject,
              scopes: updatedScopes,
              updatedAt: nowIso
            };
            projectsUpdated = true;
          }
        }
      }

      const dispatchedJob: ScheduledEmailJob = {
        ...job,
        status: 'dispatched',
        dispatchedAt: nowIso
      };

      const jobIdx = updatedAllJobs.findIndex((j) => j.id === job.id);
      if (jobIdx >= 0) updatedAllJobs[jobIdx] = dispatchedJob;
      newlyDispatchedJobs.push(dispatchedJob);

      if (db) {
        setDoc(
          doc(db, 'scheduled_emails', job.id),
          sanitizePayload({ ...dispatchedJob, updatedAt: nowIso }),
          { merge: true }
        ).catch(() => { });
      }
    }

    if (newlyDispatchedJobs.length > 0) {
      try {
        localStorage.setItem(SCHEDULE_STORAGE_KEY, JSON.stringify(updatedAllJobs));
      } catch (_) { }
      syncScheduledDispatchesToBackend(updatedAllJobs);
    }

    return {
      updatedProjects: modifiedProjects,
      dispatchedJobs: newlyDispatchedJobs,
      hasChanges: projectsUpdated || newlyDispatchedJobs.length > 0,
      errorMessage: newlyDispatchedJobs.length === 0 ? lastErrorMessage : undefined
    };
  } finally {
    isQueueProcessing = false;
  }
}