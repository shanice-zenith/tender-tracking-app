export type PhaseId = '1A' | '1B' | '2A' | '2B' | '3';

export interface PhaseInfo {
  id: PhaseId;
  name: string;
  code: string;
  description: string;
}

export type ActionItemStatus =
  | 'Estimate Requested'
  | 'Estimate Submitted'
  | 'Waiting on Response'
  | 'Follow-up Pending'
  | 'Request Revised Estimate'
  | 'Revision Submitted'
  | 'Confirm w/ ID'
  | 'Confirm with PM'
  | 'PO Approved';

export type ProjectStatus =
  | 'Planning'
  | 'Tender Active'
  | 'In Progress'
  | 'Under Review'
  | 'Completed';

export type ProjectTemplateType = 'master_5phase' | 'blank';

export interface Project {
  id: string;
  name: string;
  code: string;
  client?: string;
  location?: string;
  description?: string;
  targetBudget?: number;
  status: ProjectStatus;
  createdAt: string;
  updatedAt: string;
  scopes: ScopeLineItem[];
  driveLink?: string;
  sheetsConfig?: GoogleSheetsConfig;
  archivedPhaseIds?: PhaseId[];
  deletedPhaseIds?: PhaseId[];
  createdBy?: string;
  lastModifiedBy?: string;
}

export interface Contact {
  id: string;
  name: string;
  company: string;
  category: string;
  categories?: string[];
  trade_categories?: string[];
  phone: string;
  email: string;
  notes?: string;
  createdAt?: string;
  rating?: number;
  review_count?: number;
}

export interface AttachedDoc {
  id: string;
  name: string;
  url: string;
  type: 'quote' | 'drawing' | 'spec' | 'submittal' | 'other' | string;
  addedAt: string;
  uploadedAt?: string;
  fileSize?: string;
  size?: number;
  isExternalLink?: boolean;
}

export interface NoteItem {
  id: string;
  text: string;
  author: string;
  timestamp: string;
}

export interface QuoteBreakdownItem {
  id: string;
  costCode?: string;
  itemDescription: string;
  amount: number;
  unit?: string;
  qty?: number;
  inclusionStatus: 'included' | 'excluded' | 'allowance' | 'optional';
  notes?: string;
  tenderSpecRef?: string;
  lastModifiedBy?: string;
  updatedAt?: string;
}

export interface TradeEntry {
  id: string;
  scopeId: string;
  quoteDocId?: string;
  contactId?: string;
  contractorName: string;
  companyName: string;
  contactEmail?: string;
  contactPhone?: string;
  category: string;
  quotedFigure: number;
  currency: string;
  attachedDocs: AttachedDoc[];
  docUrl?: string;
  docName?: string;
  attachedDoc?: string;
  actionStatus: ActionItemStatus;
  poSent: boolean;
  isAwarded?: boolean;
  hasBeenInvited?: boolean;
  notes: NoteItem[];
  quoteBreakdown?: QuoteBreakdownItem[];
  costCode?: string;
  lastSyncedAt?: string;
  sheetRowId?: string;
  leadTimeWeeks?: number;
  lastModifiedBy?: string;
  updatedAt?: string;
}

export interface ScheduledEmailJob {
  id: string;
  type: 'invitation' | 'reminder';
  scopeId: string;
  scopeName?: string;
  projectId: string;
  projectName?: string;
  scheduledTime: string; // ISO 8601 string
  scheduledTimeDisplay: string; // e.g. "Oct 12, 9:00 AM"
  status: 'pending' | 'dispatched' | 'cancelled';
  selectedRecipientIds: string[]; // contactIds for invites, tradeIds for reminders
  recipientEmails?: string[];
  customEmails: Record<string, string>;
  driveLink: string;
  formLink: string;
  tenderDeadline: string;
  generatedHtml?: string;
  generatedPlainText?: string;
  senderName?: string;
  senderEmail?: string;
  ccEmails?: string[];
  autoRule?: string; // e.g. "5_days_prior" or "custom"
  createdAt: string;
  dispatchedAt?: string;
}

export interface ScopeLineItem {
  id: string;
  projectId?: string;
  phaseId: PhaseId;
  name: string;
  costCode?: string;
  description: string;
  budgetAmount: number;
  trades: TradeEntry[];
  isRequired?: boolean;
  notes?: string;
  order: number;
  googleFormUrl?: string;
  tenderDeadline?: string;
  createdAt: string;
  scheduledInvite?: ScheduledEmailJob;
  scheduledReminder?: ScheduledEmailJob;
  autoReminderEnabled?: boolean;
  autoReminderRule?: '5_days_prior' | '3_days_prior' | '1_day_prior' | 'custom';
  autoReminderCustomDate?: string;
  lastModifiedBy?: string;
  updatedAt?: string;
}

export interface GoogleSheetsConfig {
  sheetUrl: string;
  sheetName: string;
  autoSyncIntervalMinutes: number; // 0 for manual only
  lastSyncedAt?: string;
  lastSavedAt?: string;
  backendSaveUrl?: string;
  isEnabled: boolean;
  autoSyncEnabled: boolean;
  appsScriptUrl?: string;
}

export interface MasterSheetRow {
  companyName: string;
  contractorName?: string;
  project: string;
  projectCode?: string;
  phaseCode: string;
  scopeName: string;
  itemDescription: string;
  amount: number;
  costCode?: string;
  notes?: string;
  formalQuoteDoc?: string;
  syncStatus: string;
  actionStatus?: string;
  poSent?: string;
  isAwarded?: string;
  inclusionStatus?: string;
  lastUpdated?: string;
}

export interface SyncLogEntry {
  id: string;
  timestamp: string;
  status: 'success' | 'error' | 'warning';
  message: string;
  updatedQuotesCount: number;
  details?: string;
}

export interface GoogleUserProfile {
  uid: string;
  name: string;
  email: string;
  photoURL?: string;
  domain?: string;
}

export interface FormSubmitPayload {
  companyName: string;
  email: string;
  projectName: string;
  tenderItem: string;
  enteredAmount: number | string;
  notes?: string;
  docUrl?: string;
  submittedAt?: string;
}

export interface FirestoreQuoteRecord {
  id: string; // ${projectName}_${companyName}_${costCode}
  companyName: string;
  contractorName?: string;
  email: string;
  emailAddress?: string;
  projectName: string;
  projectId?: string;
  trade?: string;
  tradeName?: string;
  tradeScope?: string;
  tenderItem: string;
  quotedFigure?: number;
  enteredAmount: number;
  amount?: number;
  costCode: string;
  notes: string;
  docUrl: string;
  attachedDocs?: AttachedDoc[];
  submittedAt: string;
  scopeName?: string;
  phaseId?: string;
  scopeId?: string;
  status?: string;
  actionItemStatus?: ActionItemStatus | string;
  actionStatus?: ActionItemStatus | string;
  quoteBreakdown?: QuoteBreakdownItem[];
  lastModifiedBy?: string;
  updatedAt?: string;
}
