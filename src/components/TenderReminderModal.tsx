import React, { useState, useMemo, useEffect } from 'react';
import { 
  X, 
  Bell, 
  Send, 
  Calendar, 
  ExternalLink, 
  Copy, 
  FolderOpen, 
  Users, 
  Search, 
  AlertTriangle, 
  Eye, 
  Code, 
  FileSpreadsheet, 
  Lock, 
  CheckSquare, 
  Square, 
  Clock, 
  ShieldCheck, 
  Building2, 
  Mail,
  UserCheck,
  CalendarClock,
  XCircle
} from 'lucide-react';
import { ScopeLineItem, Project, Contact, TradeEntry, GoogleUserProfile } from '../types';
import { SenderAndCcSelector } from './SenderAndCcSelector';
import { TenderDeadlinePicker } from './TenderDeadlinePicker';
import { ScheduleLaunchPicker } from './ScheduleLaunchPicker';
import { formatScheduleDateDisplay } from '../services/scheduleQueueService';
import { DEFAULT_SENDER_PROFILES, SenderProfile, getStoredSenderProfiles } from '../data/senderProfiles';
import { appsScriptService } from '../services/appsScriptService';
import { googleAuthService } from '../services/googleAuthService';
import { GoogleAuthButton } from './GoogleAuthButton';

interface TenderReminderModalProps {
  isOpen: boolean;
  scope: ScopeLineItem | null;
  project: Project | null;
  contacts: Contact[];
  onClose: () => void;
  onOpenSettings?: () => void;
  onCancelScheduledReminder?: (scopeId: string) => void;
  onSendReminders: (params: {
    scopeId: string;
    selectedTradeIds: string[];
    customEmails: Record<string, string>;
    driveLink: string;
    formLink: string;
    tenderDeadline: string;
    generatedHtml: string;
    generatedPlainText: string;
    recipientEmails: string[];
    senderName?: string;
    senderEmail?: string;
    ccEmails?: string[];
    isScheduled?: boolean;
    scheduledIso?: string;
    scheduledDisplay?: string;
  }) => Promise<boolean | void | { success: boolean; message?: string }> | boolean | void | { success: boolean; message?: string };
}

export const TenderReminderModal: React.FC<TenderReminderModalProps> = ({
  isOpen,
  scope,
  project,
  contacts,
  onClose,
  onOpenSettings,
  onCancelScheduledReminder,
  onSendReminders,
}) => {
  // Configuration links state
  const defaultDriveLink = project?.driveLink || (project?.code ? `https://drive.google.com/drive/folders/plans-and-specs-${project.code.toLowerCase().replace(/[^a-z0-9]/g, '-')}` : '');
  const defaultFormLink = scope?.googleFormUrl || (scope?.id ? `https://docs.google.com/forms/d/e/tender-submit-${scope.id}/viewform` : '');
  
  const [driveLink, setDriveLink] = useState(defaultDriveLink);
  const [formLink, setFormLink] = useState(defaultFormLink);

  // Google OAuth User State
  const [currentUser, setCurrentUser] = useState<GoogleUserProfile | null>(() => googleAuthService.getCurrentUser());
  const [hasGoogleToken, setHasGoogleToken] = useState<boolean>(() => googleAuthService.hasActiveToken());

  // Sender selection & CC configuration
  const [senderProfiles, setSenderProfiles] = useState<SenderProfile[]>(() => getStoredSenderProfiles());
  const [selectedSenderId, setSelectedSenderId] = useState<string>(() => {
    const user = googleAuthService.getCurrentUser();
    if (user?.email) {
      const profiles = getStoredSenderProfiles();
      const match = profiles.find((p) => p.email.toLowerCase() === user.email.toLowerCase());
      if (match) return match.id;
    }
    return 'shanice';
  });
  const [ccEmails, setCcEmails] = useState<string>('');

  // Listen for profile and auth changes
  useEffect(() => {
    const handleSync = () => {
      const profiles = getStoredSenderProfiles();
      setSenderProfiles(profiles);
      const user = googleAuthService.getCurrentUser();
      setCurrentUser(user);
      setHasGoogleToken(googleAuthService.hasActiveToken());
      if (user?.email) {
        const match = profiles.find((p) => p.email.toLowerCase() === user.email.toLowerCase());
        if (match) {
          setSelectedSenderId(match.id);
        }
      }
    };

    window.addEventListener('zenith_sender_profiles_updated', handleSync);
    window.addEventListener('zenith_auth_state_changed', handleSync);
    window.addEventListener('storage', handleSync);
    return () => {
      window.removeEventListener('zenith_sender_profiles_updated', handleSync);
      window.removeEventListener('zenith_auth_state_changed', handleSync);
      window.removeEventListener('storage', handleSync);
    };
  }, []);

  // When currentUser changes, ensure their sender profile is selected
  useEffect(() => {
    if (currentUser?.email && senderProfiles.length > 0) {
      const match = senderProfiles.find((p) => p.email.toLowerCase() === currentUser.email.toLowerCase());
      if (match) {
        setSelectedSenderId(match.id);
      }
    }
  }, [currentUser, senderProfiles]);

  // Resolved active sender profile
  const activeSender = useMemo<SenderProfile>(() => {
    const found = senderProfiles.find((p) => p.id === selectedSenderId);
    return found || senderProfiles[0] || DEFAULT_SENDER_PROFILES[0];
  }, [selectedSenderId, senderProfiles]);

  // Cleaned list of CC emails
  const parsedCcEmails = useMemo(() => {
    return ccEmails
      .split(/[,;]+/)
      .map((e) => e.trim())
      .filter((e) => e.includes('@'));
  }, [ccEmails]);

  // Tender Deadline
  const getInitialDeadline = () => {
    if (scope?.tenderDeadline) return scope.tenderDeadline;
    const d = new Date();
    d.setDate(d.getDate() + 3);
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    const day = d.getDate();
    const suffix = day % 10 === 1 && day !== 11 ? 'st' : day % 10 === 2 && day !== 12 ? 'nd' : day % 10 === 3 && day !== 13 ? 'rd' : 'th';
    return `${months[d.getMonth()]} ${day}${suffix} - 11:00 PM`;
  };

  const [tenderDeadline, setTenderDeadline] = useState(getInitialDeadline());
  const [activeViewMode, setActiveViewMode] = useState<'configure' | 'preview_visual' | 'preview_html'>('configure');
  const [tradeSearchQuery, setTradeSearchQuery] = useState('');

  // Dispatch Mode: "send_now" vs "schedule"
  const [dispatchMode, setDispatchMode] = useState<'send_now' | 'schedule'>('send_now');

  // Scheduled date state
  const getInitialScheduledDate = () => {
    if (scope?.scheduledReminder?.scheduledTime) {
      return {
        iso: scope.scheduledReminder.scheduledTime,
        display: scope.scheduledReminder.scheduledTimeDisplay || formatScheduleDateDisplay(new Date(scope.scheduledReminder.scheduledTime))
      };
    }
    // Default 5 days prior to deadline or 2 days from now at 8:00 AM
    const target = new Date();
    target.setDate(target.getDate() + 2);
    target.setHours(8, 0, 0, 0);
    return {
      iso: target.toISOString(),
      display: formatScheduleDateDisplay(target)
    };
  };

  const [scheduledIso, setScheduledIso] = useState<string>(() => getInitialScheduledDate().iso);
  const [scheduledDisplay, setScheduledDisplay] = useState<string>(() => getInitialScheduledDate().display);
  
  // Custom/Inline email updates for contacts missing email
  const [customEmails, setCustomEmails] = useState<Record<string, string>>({});
  const [copiedStatus, setCopiedStatus] = useState<'html' | 'text' | 'bcc' | null>(null);
  const [isDispatching, setIsDispatching] = useState(false);

  // Sync links and initial values when modal opens or scope/project changes
  useEffect(() => {
    if (isOpen && project && scope) {
      setDriveLink(project.driveLink || `https://drive.google.com/drive/folders/plans-and-specs-${project.code.toLowerCase().replace(/[^a-z0-9]/g, '-')}`);
      setFormLink(scope.googleFormUrl || `https://docs.google.com/forms/d/e/tender-submit-${scope.id}/viewform`);
      setTenderDeadline(getInitialDeadline());
      const sched = getInitialScheduledDate();
      setScheduledIso(sched.iso);
      setScheduledDisplay(sched.display);
      if (scope.scheduledReminder && scope.scheduledReminder.status === 'pending') {
        setDispatchMode('schedule');
      } else {
        setDispatchMode('send_now');
      }
    }
  }, [isOpen, project?.id, scope?.id]);

  // Statuses that qualify for automatic reminder pre-selection:
  // "Estimate Requested", "Waiting on Response", "Follow-up Pending"
  const REMINDER_ELIGIBLE_STATUSES = useMemo(() => [
    'Estimate Requested',
    'Waiting on Response',
    'Follow-up Pending'
  ], []);

  // Filter trades under this scope
  const allScopeTrades = useMemo(() => {
    if (!scope) return [];
    return scope.trades.map((trade) => {
      // Find corresponding contact record if present
      const matchedContact = contacts.find(
        (c) => (trade.contactId && c.id === trade.contactId) || c.company.toLowerCase() === trade.companyName.toLowerCase()
      );
      const email = (matchedContact?.email || '').trim();

      const isEligible = REMINDER_ELIGIBLE_STATUSES.includes(trade.actionStatus);

      return {
        ...trade,
        contact: matchedContact,
        email,
        isEligible
      };
    });
  }, [scope?.trades, contacts, REMINDER_ELIGIBLE_STATUSES]);

  // Pre-select trades whose Action Item Status is currently set to "Estimate Requested", "Waiting on Response", or "Follow-up Pending"
  const [selectedTradeIds, setSelectedTradeIds] = useState<string[]>(() => {
    return allScopeTrades
      .filter((t) => t.isEligible)
      .map((t) => t.id);
  });

  // Sync selected trades when modal opens or scope changes
  useEffect(() => {
    if (isOpen && allScopeTrades.length > 0) {
      setSelectedTradeIds(
        allScopeTrades
          .filter((t) => t.isEligible)
          .map((t) => t.id)
      );
    }
  }, [isOpen, scope?.id]);

  // Filtered trades based on search query
  const filteredTrades = useMemo(() => {
    if (!tradeSearchQuery.trim()) return allScopeTrades;
    const q = tradeSearchQuery.toLowerCase();
    return allScopeTrades.filter((t) => {
      const matchComp = t.companyName.toLowerCase().includes(q);
      const matchName = t.contractorName.toLowerCase().includes(q);
      const matchStatus = t.actionStatus.toLowerCase().includes(q);
      const matchEmail = t.email.toLowerCase().includes(q);
      return matchComp || matchName || matchStatus || matchEmail;
    });
  }, [allScopeTrades, tradeSearchQuery]);

  // Toggle single trade selection
  const handleToggleTrade = (tradeId: string) => {
    setSelectedTradeIds((prev) =>
      prev.includes(tradeId) ? prev.filter((id) => id !== tradeId) : [...prev, tradeId]
    );
  };

  // Selected count
  const selectedCount = selectedTradeIds.length;
  const isAnySelected = selectedCount > 0;

  // Bulk Control:
  // If any contractors are selected ➔ Clears all checkboxes to 0.
  // If no contractors are selected ➔ Checks all visible trades.
  const handleBulkToggle = () => {
    if (isAnySelected) {
      setSelectedTradeIds([]);
    } else {
      const visibleIds = filteredTrades.map((t) => t.id);
      setSelectedTradeIds(visibleIds);
    }
  };

  // Quick Preset deadline adjustments
  const setDeadlinePreset = (daysFromNow: number) => {
    const d = new Date();
    d.setDate(d.getDate() + daysFromNow);
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    const day = d.getDate();
    const suffix = day % 10 === 1 && day !== 11 ? 'st' : day % 10 === 2 && day !== 12 ? 'nd' : day % 10 === 3 && day !== 13 ? 'rd' : 'th';
    setTenderDeadline(`${months[d.getMonth()]} ${day}${suffix} - 11:00 PM`);
  };

  // Recipient resolution with privacy and email checks
  const recipientList = useMemo(() => {
    return selectedTradeIds
      .map((tradeId) => {
        const trade = allScopeTrades.find((t) => t.id === tradeId);
        if (!trade) return null;
        const email = (customEmails[trade.id] || trade.email || '').trim();
        return {
          tradeId: trade.id,
          companyName: trade.companyName,
          contractorName: trade.contractorName,
          actionStatus: trade.actionStatus,
          email,
          hasEmail: Boolean(email && email.includes('@'))
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null);
  }, [selectedTradeIds, allScopeTrades, customEmails]);

  const validEmails = useMemo(() => {
    return recipientList.filter((r) => r.hasEmail).map((r) => r.email);
  }, [recipientList]);

  // Universal Time-Neutral Greeting: Static "Hello,"
  const previewGreeting = 'Hello,';

  // Exact HTML Follow-Up Reminder Email Template matching user specification
  const generatedHtml = useMemo(() => {
    if (!project || !scope) return '';
    const projectName = project.name || 'Construction Project';
    const projectAbbreviation = project.code || 'PRJ';
    const projectLocation = project.location || 'Calgary, AB';
    const scopeName = scope.name;
    const finalDeadline = tenderDeadline || 'TBD';
    const finalDriveLink = driveLink.trim() || '#';
    const finalFormLink = formLink.trim() || '#';

    const senderHeader = activeSender.name.toUpperCase();
    const senderRoleHtml = activeSender.role ? `${activeSender.role}<br>` : '';
    const senderEmail = activeSender.email;
    const senderWebsite = activeSender.website || 'thezenithgroup.ca';

    return `<p>${previewGreeting}</p>

<p>This is a gentle reminder regarding our estimate request for the upcoming <strong>${projectName}</strong> project.</p>

<h3 style="color: #3f512b;">Project Overview & Deadline</h3>
<ul>
  <li><strong>Project Name:</strong> ${projectName} (${projectAbbreviation})</li>
  <li><strong>Location:</strong> ${projectLocation}</li>
  <li><strong>Scope of Work:</strong> ${scopeName}</li>
</ul>

<!-- Deadline Callout Box -->
<div style="background-color: #fef2f2; border-left: 4px solid #dc2626; padding: 12px 16px; margin: 20px 0; border-radius: 4px;">
  <p style="color: #991b1b; font-weight: bold; margin: 0; font-size: 14px;">
    ⚠️ Submission Deadline: ${finalDeadline}
  </p>
  <p style="color: #7f1d1d; margin: 4px 0 0 0; font-size: 13px;">
    Please note: To maintain a fair procurement process, <strong>no quotes or proposals will be accepted past this deadline</strong> under any circumstances.
  </p>
</div>

<p>We are finalizing our bid comparisons soon and would love to include your proposal. You can review the project drawings and submit your quote using the links below:</p>

<table role="presentation" border="0" cellpadding="0" cellspacing="0" style="margin: 20px 0;">
  <tr>
    <td style="padding-right: 16px;">
      <a href="${finalDriveLink}" style="background-color: #374131; color: #ffffff; padding: 12px 20px; text-decoration: none; border-radius: 4px; display: inline-block; font-weight: bold; font-size: 14px;">
        📁 View Plans &amp; Specifications
      </a>
    </td>
    <td>
      <a href="${finalFormLink}" style="background-color: #374131; color: #ffffff; padding: 12px 20px; text-decoration: none; border-radius: 4px; display: inline-block; font-weight: bold; font-size: 14px;">
        📝 Submit Estimate
      </a>
    </td>
  </tr>
</table>

<p>If you have already submitted your bid, or if you are unable to quote this scope, please reply directly to this email to let us know.</p>

<p>Best Regards,</p>
<br>
<strong>${senderHeader}</strong><br>
${senderRoleHtml}e. ${senderEmail}<br>
w. ${senderWebsite}`;
  }, [project, scope, tenderDeadline, driveLink, formLink, activeSender, previewGreeting]);

  // Plain text fallback
  const generatedPlainText = useMemo(() => {
    if (!project || !scope) return '';
    const projectName = project.name || 'Construction Project';
    const projectAbbreviation = project.code || 'PRJ';
    const projectLocation = project.location || 'Calgary, AB';
    const scopeName = scope.name;
    const finalDeadline = tenderDeadline || 'TBD';
    const finalDriveLink = driveLink.trim() || '#';
    const finalFormLink = formLink.trim() || '#';

    const senderHeader = activeSender.name.toUpperCase();
    const senderRoleText = activeSender.role ? `${activeSender.role}\n` : '';
    const senderEmail = activeSender.email;
    const senderWebsite = activeSender.website || 'thezenithgroup.ca';

    return `${previewGreeting}

This is a gentle reminder regarding our estimate request for the upcoming ${projectName} project.

Project Overview & Deadline:
- Project Name: ${projectName} (${projectAbbreviation})
- Location: ${projectLocation}
- Scope of Work: ${scopeName}

--------------------------------------------------
⚠️ SUBMISSION DEADLINE: ${finalDeadline}
Please note: To maintain a fair procurement process, NO quotes or proposals will be accepted past this deadline under any circumstances.
--------------------------------------------------

We are finalizing our bid comparisons soon and would love to include your proposal. You can review the project drawings and submit your quote using the links below:

View Plans & Specifications:
${finalDriveLink}

Submit Estimate:
${finalFormLink}

If you have already submitted your bid, or if you are unable to quote this scope, please reply directly to this email to let us know.

Best Regards,

${senderHeader}
${senderRoleText}e. ${senderEmail}
w. ${senderWebsite}`;
  }, [project, scope, tenderDeadline, driveLink, formLink, activeSender, previewGreeting]);

  // Email subject line
  const emailSubject = project && scope ? `Tender Follow-up: ${project.name} (${project.code}) - ${scope.name} Estimate Reminder` : '';

  // Copy helper
  const handleCopy = async (type: 'html' | 'text' | 'bcc') => {
    try {
      if (type === 'html') {
        await navigator.clipboard.writeText(generatedHtml);
      } else if (type === 'text') {
        await navigator.clipboard.writeText(generatedPlainText);
      } else if (type === 'bcc') {
        await navigator.clipboard.writeText(validEmails.join('; '));
      }
      setCopiedStatus(type);
      setTimeout(() => setCopiedStatus(null), 2500);
    } catch (e) {
      console.warn('Clipboard write failed', e);
    }
  };

  // Launch Default Email Client with From, CC, and BCC protection
  const handleOpenMailClient = () => {
    const bccList = validEmails.join(',');
    const ccList = parsedCcEmails.join(',');
    let mailtoUrl = `mailto:info@thezenithgroup.ca?bcc=${encodeURIComponent(bccList)}&subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(generatedPlainText)}`;
    if (ccList) {
      mailtoUrl += `&cc=${encodeURIComponent(ccList)}`;
    }
    window.open(mailtoUrl, '_blank');
  };

  // Cancel Scheduled Reminder handler
  const handleCancelScheduled = () => {
    if (scope && onCancelScheduledReminder) {
      if (window.confirm('Are you sure you want to cancel this scheduled follow-up reminder?')) {
        onCancelScheduledReminder(scope.id);
        setDispatchMode('send_now');
        onClose();
      }
    }
  };

  // Final Dispatch & Automation Trigger
  const handleDispatch = async () => {
    if (!scope || !project) return;
    if (selectedTradeIds.length === 0) {
      alert('Please select at least one trade contractor to dispatch tender reminder emails.');
      return;
    }

    const isScheduled = dispatchMode === 'schedule';

    if (!isScheduled && !appsScriptService.isConfigured()) {
      const proceedToSettings = window.confirm(
        'Google Apps Script Endpoint URL is not configured yet.\n\nWould you like to open App Settings now to configure your Web App endpoint URL?'
      );
      if (proceedToSettings && onOpenSettings) {
        onOpenSettings();
      }
      return;
    }

    setIsDispatching(true);

    try {
      const result = await onSendReminders({
        scopeId: scope.id,
        selectedTradeIds,
        customEmails,
        driveLink: driveLink.trim(),
        formLink: formLink.trim(),
        tenderDeadline: tenderDeadline.trim(),
        generatedHtml,
        generatedPlainText,
        recipientEmails: validEmails,
        senderName: activeSender.name,
        senderEmail: activeSender.email,
        ccEmails: parsedCcEmails,
        isScheduled,
        scheduledIso: isScheduled ? scheduledIso : undefined,
        scheduledDisplay: isScheduled ? scheduledDisplay : undefined
      });

      if (result !== false) {
        onClose();
      }
    } catch (err) {
      console.error('Failed to dispatch reminders:', err);
    } finally {
      setIsDispatching(false);
    }
  };

  // Early return after all hooks are executed
  if (!isOpen || !scope || !project) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150">
      <div 
        id="tender-reminder-modal"
        className="bg-white w-full max-w-5xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[94vh]"
      >
        {/* Header */}
        <div className="p-4 sm:p-5 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-500 rounded-xl shadow-md">
              <Bell className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="font-extrabold text-sm sm:text-base text-white">
                  Tender Follow-up & Reminder Dispatcher
                </h2>
                <span className="px-2 py-0.5 text-[10px] font-bold bg-amber-950 text-amber-300 rounded-full border border-amber-700/80">
                  {project.code} • Phase {scope.phaseId}
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Scope: <strong className="text-white">{scope.name}</strong> &bull; Target Project: <span className="text-slate-300">{project.name}</span>
              </p>
            </div>
          </div>

          <button
            type="button"
            id="close-tender-reminder-modal-btn"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center justify-between px-5 pt-3 border-b border-slate-200 bg-slate-50 shrink-0">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveViewMode('configure')}
              className={`px-3.5 py-2 text-xs font-bold rounded-t-lg transition-all border-b-2 cursor-pointer flex items-center gap-1.5 ${
                activeViewMode === 'configure'
                  ? 'border-amber-500 text-amber-700 bg-white shadow-xs'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Users className="w-3.5 h-3.5 text-amber-600" />
              <span>Configure & Select Contractors</span>
              <span className="px-1.5 py-0.2 bg-amber-100 text-amber-900 rounded-full text-[10px] font-mono font-bold">
                {selectedCount} Selected
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveViewMode('preview_visual')}
              className={`px-3.5 py-2 text-xs font-bold rounded-t-lg transition-all border-b-2 cursor-pointer flex items-center gap-1.5 ${
                activeViewMode === 'preview_visual'
                  ? 'border-amber-500 text-amber-700 bg-white shadow-xs'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Eye className="w-3.5 h-3.5 text-blue-600" />
              <span>Live Email Preview</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveViewMode('preview_html')}
              className={`px-3.5 py-2 text-xs font-bold rounded-t-lg transition-all border-b-2 cursor-pointer flex items-center gap-1.5 ${
                activeViewMode === 'preview_html'
                  ? 'border-amber-500 text-amber-700 bg-white shadow-xs'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Code className="w-3.5 h-3.5 text-purple-600" />
              <span>HTML Source Template</span>
            </button>
          </div>

          <div className="hidden sm:flex items-center gap-2 pb-2">
            <span className="text-[11px] font-semibold text-slate-500 flex items-center gap-1">
              <Lock className="w-3 h-3 text-amber-600" />
              <span>BCC Privacy Protection Active</span>
            </span>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-5 text-xs flex-1">
          {/* TAB 1: CONFIGURE & SELECT TRADES */}
          {activeViewMode === 'configure' && (
            <div className="space-y-5">
              {/* GOOGLE ACCOUNT AUTHENTICATION & GMAIL DISPATCH STATUS */}
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Mail className="w-4 h-4 text-amber-600" />
                    <span className="text-xs font-bold text-slate-800">
                      Email Dispatch Engine: Google Gmail API
                    </span>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                    hasGoogleToken
                      ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                      : 'bg-amber-100 text-amber-900 border-amber-300'
                  }`}>
                    {hasGoogleToken ? 'Gmail API Active' : 'Sign-In Required'}
                  </span>
                </div>

                <GoogleAuthButton
                  domain="thezenithgroup.ca"
                  user={currentUser}
                  hasToken={hasGoogleToken}
                  onLoginSuccess={(user, token) => {
                    setCurrentUser(user);
                    setHasGoogleToken(true);
                    const profiles = getStoredSenderProfiles();
                    const match = profiles.find((p) => p.email.toLowerCase() === user.email.toLowerCase());
                    if (match) {
                      setSelectedSenderId(match.id);
                    }
                  }}
                  onLogout={() => {
                    setCurrentUser(null);
                    setHasGoogleToken(false);
                  }}
                  variant="modal"
                />

                <p className="text-[11px] text-slate-500">
                  {hasGoogleToken ? (
                    <span>
                      Reminders will be sent directly from <strong className="text-slate-700">{currentUser?.email}</strong> via the official Google Gmail API. Your name and corporate email automatically populate the signature block.
                    </span>
                  ) : (
                    <span>
                      Connect your <strong className="text-slate-700">@thezenithgroup.ca</strong> Google Account to send reminders directly from your company Gmail inbox.
                    </span>
                  )}
                </p>
              </div>

              {/* SENDER & CC SELECTOR COMPONENT */}
              <SenderAndCcSelector
                selectedSenderId={selectedSenderId}
                onSelectSenderId={setSelectedSenderId}
                ccEmails={ccEmails}
                onChangeCcEmails={setCcEmails}
                accentColor="amber"
              />

              {/* DISPATCH MODE SELECTOR: "Send Now" vs "Schedule Reminder" */}
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-3">
                {/* If there is already a pending scheduled reminder, highlight it with quick cancel option */}
                {scope?.scheduledReminder && scope.scheduledReminder.status === 'pending' && (
                  <div className="p-3 bg-amber-50 border border-amber-300 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                    <div className="flex items-center gap-2.5">
                      <CalendarClock className="w-5 h-5 text-amber-700 shrink-0 animate-pulse" />
                      <div>
                        <p className="text-xs font-bold text-amber-950">
                          Active Scheduled Reminder: {scope.scheduledReminder.scheduledTimeDisplay || scope.scheduledReminder.scheduledTime}
                        </p>
                        <p className="text-[11px] text-amber-800">
                          Follow-up reminder email is queued to dispatch to contractors awaiting response.
                        </p>
                      </div>
                    </div>
                    {onCancelScheduledReminder && (
                      <button
                        type="button"
                        id="cancel-scheduled-reminder-modal-btn"
                        onClick={handleCancelScheduled}
                        className="px-3 py-1.5 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-1.5 shadow-2xs shrink-0"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        <span>Cancel Scheduled Reminder</span>
                      </button>
                    )}
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <CalendarClock className="w-4 h-4 text-amber-600" />
                    <span>Dispatch Timing</span>
                  </span>
                  <div className="flex items-center gap-1 bg-slate-200/90 p-1 rounded-xl border border-slate-300">
                    <label 
                      className={`flex items-center gap-1.5 px-3 py-1 rounded-lg cursor-pointer transition-all text-xs ${
                        dispatchMode === 'send_now'
                          ? 'bg-white text-amber-900 font-extrabold shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900 font-medium'
                      }`}
                    >
                      <input
                        type="radio"
                        name="reminder-timing-top-radio"
                        value="send_now"
                        checked={dispatchMode === 'send_now'}
                        onChange={() => setDispatchMode('send_now')}
                        className="sr-only"
                      />
                      <span className="text-amber-500 font-bold">⚡</span>
                      <span>Send Immediately</span>
                    </label>

                    <label 
                      className={`flex items-center gap-1.5 px-3 py-1 rounded-lg cursor-pointer transition-all text-xs ${
                        dispatchMode === 'schedule'
                          ? 'bg-amber-700 text-white font-extrabold shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900 font-medium'
                      }`}
                    >
                      <input
                        type="radio"
                        name="reminder-timing-top-radio"
                        value="schedule"
                        checked={dispatchMode === 'schedule'}
                        onChange={() => setDispatchMode('schedule')}
                        className="sr-only"
                      />
                      <span>📅</span>
                      <span>Schedule for Later</span>
                    </label>
                  </div>
                </div>

                {dispatchMode === 'schedule' && (
                  <div id="reminder-schedule-picker-container" className="animate-in fade-in slide-in-from-top-2 duration-150">
                    <ScheduleLaunchPicker
                      scheduledIso={scheduledIso}
                      onScheduleChange={(iso, display) => {
                        setScheduledIso(iso);
                        setScheduledDisplay(display);
                      }}
                      accentColor="amber"
                      tenderDeadline={tenderDeadline}
                      type="reminder"
                    />
                  </div>
                )}
              </div>

              {/* Top Configuration Grid: Deadline Picker & Drive/Form Links */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                {/* Enhanced Tender Deadline Picker */}
                <div className="lg:col-span-7">
                  <TenderDeadlinePicker
                    value={tenderDeadline}
                    onChange={setTenderDeadline}
                    accentColor="amber"
                    initialDaysOffset={3}
                  />
                </div>

                {/* Project Drive & Scope Form Links */}
                <div className="lg:col-span-5 flex flex-col gap-3">
                  {/* Google Drive Project Link */}
                  <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2 flex-1">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                        <FolderOpen className="w-4 h-4 text-blue-600" />
                        <span>Project Google Drive Link</span>
                      </label>
                      {driveLink && (
                        <a
                          href={driveLink}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[10px] text-blue-600 font-bold hover:underline inline-flex items-center gap-0.5"
                        >
                          <span>Test</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                    <input
                      type="url"
                      value={driveLink}
                      onChange={(e) => setDriveLink(e.target.value)}
                      placeholder="https://drive.google.com/drive/folders/..."
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <p className="text-[10px] text-slate-500">
                      Folder containing plans and specs for review.
                    </p>
                  </div>

                  {/* Scope Google Form Link */}
                  <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2 flex-1">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                        <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                        <span>Scope Google Form Link</span>
                      </label>
                      {formLink && (
                        <a
                          href={formLink}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[10px] text-emerald-600 font-bold hover:underline inline-flex items-center gap-0.5"
                        >
                          <span>Test</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                    <input
                      type="url"
                      value={formLink}
                      onChange={(e) => setFormLink(e.target.value)}
                      placeholder="https://docs.google.com/forms/d/e/.../viewform"
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                    <p className="text-[10px] text-slate-500">
                      Submission form link for contractor quotes.
                    </p>
                  </div>
                </div>
              </div>

              {/* Subcontractors Selection Section */}
              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900 text-white p-3.5 rounded-xl">
                  <div className="flex items-center gap-2.5">
                    <Users className="w-4 h-4 text-amber-400" />
                    <div>
                      <h4 className="font-bold text-xs">Select Subcontractors to Remind</h4>
                      <p className="text-[10px] text-slate-400">
                        {selectedCount} contractors selected ({validEmails.length} with verified email address)
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        const eligibleIds = allScopeTrades.filter((t) => t.isEligible).map((t) => t.id);
                        setSelectedTradeIds(eligibleIds);
                      }}
                      className="px-2.5 py-1 text-[11px] font-bold bg-amber-950 text-amber-300 border border-amber-700/80 rounded-lg transition-colors cursor-pointer hover:bg-amber-900"
                    >
                      Pre-select Pending ({allScopeTrades.filter((t) => t.isEligible).length})
                    </button>

                    <button
                      type="button"
                      id="bulk-toggle-reminder-recipients-btn"
                      onClick={handleBulkToggle}
                      className="px-2.5 py-1 text-[11px] font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg transition-colors cursor-pointer"
                    >
                      {isAnySelected ? 'Deselect All' : 'Select All Filtered'}
                    </button>
                  </div>
                </div>

                {/* Filter Search Bar */}
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={tradeSearchQuery}
                    onChange={(e) => setTradeSearchQuery(e.target.value)}
                    placeholder="Search trade contractors by company, contact name, or status..."
                    className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 text-slate-800"
                  />
                </div>

                {/* Scope Trades Selection List */}
                <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100 max-h-72 overflow-y-auto bg-white">
                  {filteredTrades.length === 0 ? (
                    <div className="p-8 text-center text-slate-400">
                      <Users className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                      <p className="font-semibold text-xs text-slate-600">No trade contractors found in this scope.</p>
                    </div>
                  ) : (
                    filteredTrades.map((trade) => {
                      const isSelected = selectedTradeIds.includes(trade.id);
                      const currentEmail = (customEmails[trade.id] !== undefined ? customEmails[trade.id] : trade.email) || '';
                      const isEmailMissing = !currentEmail.trim() || !currentEmail.includes('@');

                      return (
                        <div
                          key={trade.id}
                          id={`trade-reminder-card-${trade.id}`}
                          onClick={() => handleToggleTrade(trade.id)}
                          className={`p-3 transition-all cursor-pointer select-none flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                            isSelected
                              ? 'bg-amber-50/70 border-l-4 border-l-amber-600 ring-1 ring-amber-500/20'
                              : 'bg-slate-50/50 opacity-60 hover:opacity-85 hover:bg-slate-100/60'
                          }`}
                        >
                          <div className="flex items-start gap-3 flex-1 min-w-0">
                            <div className="pt-0.5 shrink-0">
                              {isSelected ? (
                                <CheckSquare className="w-4 h-4 text-emerald-600" />
                              ) : (
                                <Square className="w-4 h-4 text-slate-400" />
                              )}
                            </div>

                            <div className="space-y-0.5 min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className={`font-extrabold text-xs ${isSelected ? 'text-slate-900' : 'text-slate-600'}`}>
                                  {trade.companyName}
                                </span>
                                {trade.contractorName && (
                                  <span className="text-slate-500 text-[11px]">({trade.contractorName})</span>
                                )}
                                <span className={`px-2 py-0.5 text-[9px] font-bold rounded-full border ${
                                  trade.actionStatus === 'Estimate Requested'
                                    ? 'bg-amber-100 text-amber-800 border-amber-300'
                                    : trade.actionStatus === 'Waiting on Response'
                                    ? 'bg-purple-100 text-purple-800 border-purple-300'
                                    : trade.actionStatus === 'Follow-up Pending'
                                    ? 'bg-orange-100 text-orange-800 border-orange-300'
                                    : 'bg-slate-100 text-slate-700 border-slate-300'
                                }`}>
                                  {trade.actionStatus}
                                </span>
                              </div>

                              <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
                                <span>{trade.category || 'Subcontractor'}</span>
                                {trade.quotedFigure ? (
                                  <span className="text-emerald-700 font-bold">
                                    &bull; Current Quote: ${trade.quotedFigure.toLocaleString()} {trade.currency}
                                  </span>
                                ) : (
                                  <span className="text-slate-400 italic">&bull; No quote submitted yet</span>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Email Field with inline edit */}
                          <div 
                            className="flex items-center gap-2 sm:w-72 shrink-0"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {isEmailMissing ? (
                              <div className="flex items-center gap-1.5 w-full">
                                <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
                                <input
                                  type="email"
                                  placeholder="Enter contractor email..."
                                  value={currentEmail}
                                  onChange={(e) => {
                                    setCustomEmails((prev) => ({
                                      ...prev,
                                      [trade.id]: e.target.value
                                    }));
                                  }}
                                  className="w-full px-2.5 py-1 text-xs bg-amber-50 border border-amber-300 rounded text-slate-900 placeholder:text-amber-700/60 focus:bg-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                                />
                              </div>
                            ) : (
                              <div className="w-full flex items-center justify-between gap-1 text-[11px] font-mono text-slate-600 bg-slate-100 px-2.5 py-1 rounded border border-slate-200">
                                <span className="truncate">{currentEmail}</span>
                                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: LIVE EMAIL PREVIEW */}
          {activeViewMode === 'preview_visual' && (
            <div className="space-y-4">
              {/* Preview Metadata Bar */}
              <div className="bg-slate-900 text-white p-4 rounded-xl space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-2.5">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Subject:</span>
                    <span className="font-bold text-xs text-white">{emailSubject}</span>
                  </div>
                  <span className="px-2 py-0.5 bg-amber-950 text-amber-300 text-[10px] font-bold rounded border border-amber-700">
                    BCC Protected ({validEmails.length} recipients)
                  </span>
                </div>

                <div className="space-y-1.5 text-xs text-slate-300">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-bold text-slate-400">From:</span>
                    <span className="text-white font-bold">{activeSender.name}</span>
                    <span className="font-mono text-amber-400">&lt;{activeSender.email}&gt;</span>
                  </div>

                  {parsedCcEmails.length > 0 && (
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-bold text-slate-400">CC:</span>
                      <span className="font-mono text-blue-300">{parsedCcEmails.join(', ')}</span>
                    </div>
                  )}

                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-bold text-slate-400">BCC:</span>{' '}
                    {validEmails.length > 0 ? (
                      <span className="font-mono text-[11px] text-amber-400">
                        {validEmails.slice(0, 3).join(', ')}
                        {validEmails.length > 3 ? ` + ${validEmails.length - 3} more` : ''}
                      </span>
                    ) : (
                      <span className="text-rose-400 font-bold">No valid emails selected</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Exact HTML Follow-Up Rendering Card */}
              <div className="p-6 bg-white border border-slate-200 rounded-xl shadow-xs space-y-4 text-slate-800 leading-relaxed font-sans max-w-3xl mx-auto">
                <p>{previewGreeting}</p>

                <p>
                  This is a gentle reminder regarding our estimate request for the upcoming{' '}
                  <strong>{project.name}</strong> project.
                </p>

                <h3 className="font-bold text-sm tracking-tight pt-1" style={{ color: '#3f512b' }}>
                  Project Overview & Deadline
                </h3>
                <ul className="list-disc pl-5 space-y-1 text-xs">
                  <li>
                    <strong>Project Name:</strong> {project.name} ({project.code})
                  </li>
                  <li>
                    <strong>Location:</strong> {project.location || 'Calgary, AB'}
                  </li>
                  <li>
                    <strong>Scope of Work:</strong> {scope.name}
                  </li>
                </ul>

                {/* Deadline Callout Box */}
                <div style={{ backgroundColor: '#fef2f2', borderLeft: '4px solid #dc2626', padding: '12px 16px', margin: '16px 0', borderRadius: '4px' }}>
                  <p style={{ color: '#991b1b', fontWeight: 'bold', margin: 0, fontSize: '14px' }}>
                    ⚠️ Submission Deadline: {tenderDeadline || 'TBD'}
                  </p>
                  <p style={{ color: '#7f1d1d', margin: '4px 0 0 0', fontSize: '13px' }}>
                    Please note: To maintain a fair procurement process, <strong>no quotes or proposals will be accepted past this deadline</strong> under any circumstances.
                  </p>
                </div>

                <p className="text-xs">
                  We are finalizing our bid comparisons soon and would love to include your proposal. You can review the project drawings and submit your quote using the links below:
                </p>

                <table role="presentation" border={0} cellPadding={0} cellSpacing={0} style={{ margin: '20px 0' }}>
                  <tbody>
                    <tr>
                      <td style={{ paddingRight: '16px' }}>
                        <a
                          href={driveLink}
                          target="_blank"
                          rel="noreferrer"
                          style={{
                            backgroundColor: '#374131',
                            color: '#ffffff',
                            padding: '12px 20px',
                            textDecoration: 'none',
                            borderRadius: '4px',
                            display: 'inline-block',
                            fontWeight: 'bold',
                            fontSize: '14px'
                          }}
                          className="transition-opacity hover:opacity-90 inline-flex items-center gap-1.5 shadow-xs"
                        >
                          📁 View Plans &amp; Specifications
                        </a>
                      </td>
                      <td>
                        <a
                          href={formLink}
                          target="_blank"
                          rel="noreferrer"
                          style={{
                            backgroundColor: '#374131',
                            color: '#ffffff',
                            padding: '12px 20px',
                            textDecoration: 'none',
                            borderRadius: '4px',
                            display: 'inline-block',
                            fontWeight: 'bold',
                            fontSize: '14px'
                          }}
                          className="transition-opacity hover:opacity-90 inline-flex items-center gap-1.5 shadow-xs"
                        >
                          📝 Submit Estimate
                        </a>
                      </td>
                    </tr>
                  </tbody>
                </table>

                <p className="text-xs">
                  If you have already submitted your bid, or if you are unable to quote this scope, please reply directly to this email to let us know.
                </p>

                <div className="pt-2 text-xs">
                  <p>Best Regards,</p>
                  <br />
                  <strong className="tracking-wide uppercase">{activeSender.name}</strong>
                  {activeSender.role && <div className="text-slate-600 font-medium">{activeSender.role}</div>}
                  <div>e. {activeSender.email}</div>
                  <div>w. {activeSender.website || 'thezenithgroup.ca'}</div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: HTML CODE SOURCE */}
          {activeViewMode === 'preview_html' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-800 text-xs">
                  Raw Follow-Up HTML Template (Ready for Direct Mail Dispatches or Webhooks)
                </span>
                <button
                  type="button"
                  onClick={() => handleCopy('html')}
                  className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-bold text-xs transition-colors cursor-pointer"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>{copiedStatus === 'html' ? 'Copied HTML!' : 'Copy HTML'}</span>
                </button>
              </div>

              <textarea
                readOnly
                rows={14}
                value={generatedHtml}
                className="w-full p-4 font-mono text-[11px] bg-slate-950 text-amber-300 rounded-xl border border-slate-800 focus:outline-none select-all"
              />
            </div>
          )}
        </div>

        {/* Modal Footer Controls */}
        <div className="p-4 bg-slate-100 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => handleCopy('html')}
              className="px-3 py-1.5 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 font-bold rounded-lg transition-colors cursor-pointer text-xs flex items-center gap-1.5"
              title="Copy HTML to clipboard"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>{copiedStatus === 'html' ? 'Copied HTML' : 'Copy HTML'}</span>
            </button>

            <button
              type="button"
              onClick={() => handleCopy('text')}
              className="px-3 py-1.5 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 font-bold rounded-lg transition-colors cursor-pointer text-xs flex items-center gap-1.5"
              title="Copy plain text to clipboard"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>{copiedStatus === 'text' ? 'Copied Text' : 'Copy Text'}</span>
            </button>

            <button
              type="button"
              onClick={handleOpenMailClient}
              className="px-3 py-1.5 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 font-bold rounded-lg transition-colors cursor-pointer text-xs flex items-center gap-1.5"
              title="Open email client with From, CC, and BCC list"
            >
              <ExternalLink className="w-3.5 h-3.5 text-blue-600" />
              <span>Open Mail Client</span>
            </button>
          </div>

          <div className="flex items-center gap-2.5">
            {scope?.scheduledReminder && scope.scheduledReminder.status === 'pending' && onCancelScheduledReminder && (
              <button
                type="button"
                onClick={handleCancelScheduled}
                className="px-3.5 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 border border-rose-200 rounded-xl transition-colors cursor-pointer flex items-center gap-1.5"
                title="Cancel pending scheduled reminder"
              >
                <XCircle className="w-3.5 h-3.5 text-rose-600" />
                <span>Cancel Scheduled Reminder</span>
              </button>
            )}

            {/* Dispatch Timing Selector: Radio 1 vs Radio 2 */}
            <div className="flex items-center gap-1 bg-slate-200/90 p-1 rounded-xl border border-slate-300">
              <label 
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg cursor-pointer transition-all text-xs ${
                  dispatchMode === 'send_now'
                    ? 'bg-white text-amber-900 font-extrabold shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900 font-medium'
                }`}
                title="Send reminders immediately"
              >
                <input
                  type="radio"
                  name="tender-reminder-timing-radio"
                  value="send_now"
                  checked={dispatchMode === 'send_now'}
                  onChange={() => setDispatchMode('send_now')}
                  className="sr-only"
                />
                <span className="text-amber-500 font-bold">⚡</span>
                <span>Send Immediately</span>
              </label>

              <label 
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg cursor-pointer transition-all text-xs ${
                  dispatchMode === 'schedule'
                    ? 'bg-amber-700 text-white font-extrabold shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900 font-medium'
                }`}
                title="Schedule for future execution date & time"
              >
                <input
                  type="radio"
                  name="tender-reminder-timing-radio"
                  value="schedule"
                  checked={dispatchMode === 'schedule'}
                  onChange={() => {
                    setDispatchMode('schedule');
                    const el = document.getElementById('reminder-schedule-picker-container');
                    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                  }}
                  className="sr-only"
                />
                <span>📅</span>
                <span>Schedule for Later</span>
              </label>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="button"
              id="send-tender-reminders-btn"
              onClick={handleDispatch}
              disabled={isDispatching || selectedCount === 0}
              className={`px-5 py-2.5 disabled:opacity-50 text-white font-extrabold rounded-xl shadow-md transition-all cursor-pointer text-xs flex items-center gap-2 ${
                dispatchMode === 'schedule'
                  ? 'bg-amber-800 hover:bg-amber-900 border border-amber-600'
                  : 'bg-amber-500 hover:bg-amber-600'
              }`}
            >
              {dispatchMode === 'schedule' ? (
                <CalendarClock className={`w-4 h-4 text-amber-200 ${isDispatching ? 'animate-spin' : ''}`} />
              ) : (
                <Send className={`w-4 h-4 ${isDispatching ? 'animate-spin' : ''}`} />
              )}
              <span>
                {isDispatching
                  ? dispatchMode === 'schedule'
                    ? 'Scheduling Reminder...'
                    : hasGoogleToken
                      ? 'Sending via Gmail API...'
                      : 'Sending Reminders...'
                  : dispatchMode === 'schedule'
                    ? `Schedule Reminder (${scheduledDisplay || 'Scheduled'}) • ${selectedCount} Trades`
                    : hasGoogleToken
                      ? `Send via Gmail API (${selectedCount} Contractors)`
                      : `Send Reminders Now (${selectedCount} Contractors)`}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
