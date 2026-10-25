import { Project, ScopeLineItem, TradeEntry, Contact, ScheduledEmailJob, NoteItem } from '../types';
import { appsScriptService } from './appsScriptService';
import { doc, setDoc, deleteDoc, updateDoc } from 'firebase/firestore';
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

/**
 * Save / Update a scheduled job in persistent storage and Firestore
 */
export function saveScheduledJob(job: ScheduledEmailJob): ScheduledEmailJob[] {
  const existing = getStoredScheduledJobs();
  const filtered = existing.filter((j) => j.id !== job.id);
  const updated = [job, ...filtered];
  try {
    localStorage.setItem(SCHEDULE_STORAGE_KEY, JSON.stringify(updated));
  } catch (e) {
    console.warn('Notice saving scheduled email job to storage:', e);
  }

  // Real-time Firestore write to scheduled_emails collection
  if (db) {
    try {
      const jobRef = doc(db, 'scheduled_emails', job.id);
      setDoc(jobRef, sanitizePayload({
        ...job,
        updatedAt: new Date().toISOString()
      }), { merge: true }).catch((err) => {
        console.warn('Firestore scheduled_emails save notice:', err);
      });
    } catch (err) {
      console.warn('Firestore scheduled_emails save error:', err);
    }
  }

  // Auto-sync into Master Sheet Scheduled_Dispatches tab
  syncScheduledDispatchesToBackend(updated);
  return updated;
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
export function processPendingQueue(
  projects: Project[],
  contacts: Contact[]
): {
  updatedProjects: Project[];
  dispatchedJobs: ScheduledEmailJob[];
  hasChanges: boolean;
} {
  const allJobs = getStoredScheduledJobs();
  const nowTime = new Date().getTime();
  const nowIso = new Date().toISOString();
  const todayFormatted = nowIso.split('T')[0];

  const pendingJobs = allJobs.filter(
    (job) => job.status === 'pending' && new Date(job.scheduledTime).getTime() <= nowTime
  );

  if (pendingJobs.length === 0) {
    return { updatedProjects: projects, dispatchedJobs: [], hasChanges: false };
  }

  let projectsUpdated = false;
  let modifiedProjects = [...projects];
  const newlyDispatchedJobs: ScheduledEmailJob[] = [];
  const updatedAllJobs = [...allJobs];

  pendingJobs.forEach((job) => {
    const targetProjectIndex = modifiedProjects.findIndex((p) => p.id === job.projectId);
    if (targetProjectIndex === -1) {
      // Mark as cancelled or skip
      const jobIdx = updatedAllJobs.findIndex((j) => j.id === job.id);
      if (jobIdx >= 0) updatedAllJobs[jobIdx] = { ...job, status: 'cancelled' };
      return;
    }

    const targetProject = modifiedProjects[targetProjectIndex];
    const targetScopeIndex = targetProject.scopes.findIndex((s) => s.id === job.scopeId);
    if (targetScopeIndex === -1) {
      const jobIdx = updatedAllJobs.findIndex((j) => j.id === job.id);
      if (jobIdx >= 0) updatedAllJobs[jobIdx] = { ...job, status: 'cancelled' };
      return;
    }

    const targetScope = targetProject.scopes[targetScopeIndex];
    const updatedTrades = [...targetScope.trades];

    if (job.type === 'invitation') {
      // 1. Process Scheduled Invitation
      job.selectedRecipientIds.forEach((contactId) => {
        const contact = contacts.find((c) => c.id === contactId);
        if (!contact) return;

        const tradeIndex = updatedTrades.findIndex(
          (t) => (t.contactId && t.contactId === contactId) ||
                 t.companyName.toLowerCase() === contact.company.toLowerCase()
        );

        const dispatchNote: NoteItem = {
          id: `note-sched-inv-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
          text: `[AUTOMATED SCHEDULED LAUNCH] Tender invitation automatically dispatched by scheduler on ${todayFormatted} (Deadline: ${job.tenderDeadline}) from ${job.senderName || 'Zenith Estimating'}. Status set to Estimate Requested.`,
          timestamp: nowIso,
          author: 'Zenith Background Engine'
        };

        if (tradeIndex >= 0) {
          updatedTrades[tradeIndex] = {
            ...updatedTrades[tradeIndex],
            actionStatus: 'Estimate Requested',
            notes: [dispatchNote, ...updatedTrades[tradeIndex].notes]
          };
        } else {
          const newTrade: TradeEntry = {
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
            notes: [dispatchNote]
          };
          updatedTrades.push(newTrade);
        }
      });

      const updatedScope: ScopeLineItem = {
        ...targetScope,
        googleFormUrl: job.formLink || targetScope.googleFormUrl,
        tenderDeadline: job.tenderDeadline || targetScope.tenderDeadline,
        trades: updatedTrades,
        scheduledInvite: {
          ...job,
          status: 'dispatched',
          dispatchedAt: nowIso
        }
      };

      const updatedScopes = [...targetProject.scopes];
      updatedScopes[targetScopeIndex] = updatedScope;
      modifiedProjects[targetProjectIndex] = {
        ...targetProject,
        scopes: updatedScopes,
        updatedAt: nowIso
      };
      projectsUpdated = true;

    } else if (job.type === 'reminder') {
      // 2. Process Scheduled Reminder with Target Audience Guard
      let reminderCount = 0;
      const auditedTrades = updatedTrades.map((trade) => {
        if (!job.selectedRecipientIds.includes(trade.id)) return trade;

        // Apply strict Target Audience Guard at execution time
        if (!isTradeEligibleForReminder(trade)) {
          // Contractor submitted quote in the meantime - skip reminder!
          return trade;
        }

        reminderCount++;
        const reminderNote: NoteItem = {
          id: `note-sched-rem-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
          text: `[AUTOMATED SCHEDULED REMINDER] Follow-up reminder automatically dispatched on ${todayFormatted} (Urgent Deadline: ${job.tenderDeadline}) from ${job.senderName || 'Zenith Estimating'}. Status updated to Follow-up Pending.`,
          timestamp: nowIso,
          author: 'Zenith Background Engine'
        };

        return {
          ...trade,
          actionStatus: 'Follow-up Pending' as const,
          notes: [reminderNote, ...trade.notes]
        };
      });

      const updatedScope: ScopeLineItem = {
        ...targetScope,
        googleFormUrl: job.formLink || targetScope.googleFormUrl,
        tenderDeadline: job.tenderDeadline || targetScope.tenderDeadline,
        trades: auditedTrades,
        scheduledReminder: {
          ...job,
          status: 'dispatched',
          dispatchedAt: nowIso
        }
      };

      const updatedScopes = [...targetProject.scopes];
      updatedScopes[targetScopeIndex] = updatedScope;
      modifiedProjects[targetProjectIndex] = {
        ...targetProject,
        scopes: updatedScopes,
        updatedAt: nowIso
      };
      projectsUpdated = true;
    }

    // Mark job as dispatched in storage
    const jobIdx = updatedAllJobs.findIndex((j) => j.id === job.id);
    const dispatchedJob: ScheduledEmailJob = {
      ...job,
      status: 'dispatched',
      dispatchedAt: nowIso
    };
    if (jobIdx >= 0) {
      updatedAllJobs[jobIdx] = dispatchedJob;
    }
    newlyDispatchedJobs.push(dispatchedJob);
  });

  if (projectsUpdated) {
    try {
      localStorage.setItem(SCHEDULE_STORAGE_KEY, JSON.stringify(updatedAllJobs));
    } catch (e) {
      console.warn('Notice syncing updated jobs to storage:', e);
    }
  }

  return {
    updatedProjects: modifiedProjects,
    dispatchedJobs: newlyDispatchedJobs,
    hasChanges: projectsUpdated
  };
}
