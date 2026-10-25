import React, { useState, useMemo, useEffect } from 'react';
import { 
  X, 
  Mail, 
  Send, 
  Calendar, 
  Clock, 
  Check, 
  CheckSquare, 
  Square, 
  ExternalLink, 
  Copy, 
  Sparkles, 
  FolderOpen, 
  Users, 
  Search, 
  Building2, 
  AlertTriangle, 
  Eye, 
  Code, 
  CheckCircle2,
  FileSpreadsheet,
  Lock,
  ArrowRight,
  RefreshCw,
  Plus,
  UserCheck,
  CalendarClock,
  XCircle
} from 'lucide-react';
import { ScopeLineItem, Project, Contact, TradeEntry, GoogleUserProfile } from '../types';
import { SenderAndCcSelector } from './SenderAndCcSelector';
import { TenderDeadlinePicker } from './TenderDeadlinePicker';
import { ScheduleLaunchPicker } from './ScheduleLaunchPicker';
import { DEFAULT_SENDER_PROFILES, SenderProfile, getStoredSenderProfiles } from '../data/senderProfiles';
import { formatScheduleDateDisplay } from '../services/scheduleQueueService';
import { appsScriptService } from '../services/appsScriptService';
import { googleAuthService } from '../services/googleAuthService';
import { GoogleAuthButton } from './GoogleAuthButton';

interface TenderInviteModalProps {
  isOpen: boolean;
  scope: ScopeLineItem | null;
  project: Project | null;
  contacts: Contact[];
  onClose: () => void;
  onOpenSettings?: () => void;
  onCancelScheduledLaunch?: (scopeId: string) => void;
  onSendInvitations: (params: {
    scopeId: string;
    selectedContactIds: string[];
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
  }) => Promise<{ success: boolean; message?: string } | boolean | void> | { success: boolean; message?: string } | boolean | void;
}

export const TenderInviteModal: React.FC<TenderInviteModalProps> = ({
  isOpen,
  scope,
  project,
  contacts,
  onClose,
  onOpenSettings,
  onCancelScheduledLaunch,
  onSendInvitations,
}) => {
  // Configuration links state
  const defaultDriveLink = project?.driveLink || (project?.code ? `https://drive.google.com/drive/folders/plans-and-specs-${project.code.toLowerCase().replace(/[^a-z0-9]/g, '-')}` : '');
  const defaultFormLink = scope?.googleFormUrl || (scope?.id ? `https://docs.google.com/forms/d/e/tender-submit-${scope.id}/viewform` : '');
  
  const [driveLink, setDriveLink] = useState(defaultDriveLink);
  const [formLink, setFormLink] = useState(defaultFormLink);

  // Google OAuth User State
  const [currentUser, setCurrentUser] = useState<GoogleUserProfile | null>(() => googleAuthService.getCurrentUser());
  const [hasGoogleToken, setHasGoogleToken] = useState<boolean>(() => googleAuthService.hasActiveToken());

  // Sender choice & CC recipients
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

  // Deadline state
  const getInitialDeadline = () => {
    if (scope?.tenderDeadline) return scope.tenderDeadline;
    const d = new Date();
    d.setDate(d.getDate() + 7);
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    const day = d.getDate();
    const suffix = day % 10 === 1 && day !== 11 ? 'st' : day % 10 === 2 && day !== 12 ? 'nd' : day % 10 === 3 && day !== 13 ? 'rd' : 'th';
    return `${months[d.getMonth()]} ${day}${suffix} - 11:00 PM`;
  };

  const [tenderDeadline, setTenderDeadline] = useState(getInitialDeadline());
  const [activeViewMode, setActiveViewMode] = useState<'configure' | 'preview_visual' | 'preview_html'>('configure');
  const [contactSearchQuery, setContactSearchQuery] = useState('');
  const [showOnlyMatchingTrades, setShowOnlyMatchingTrades] = useState(true);
  
  // Dispatch Mode: "send_now" vs "schedule"
  const [dispatchMode, setDispatchMode] = useState<'send_now' | 'schedule'>('send_now');
  
  // Scheduled launch date state
  const getInitialScheduledDate = () => {
    if (scope?.scheduledInvite?.scheduledTime) {
      return {
        iso: scope.scheduledInvite.scheduledTime,
        display: scope.scheduledInvite.scheduledTimeDisplay || formatScheduleDateDisplay(new Date(scope.scheduledInvite.scheduledTime))
      };
    }
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(8, 0, 0, 0);
    return {
      iso: tomorrow.toISOString(),
      display: formatScheduleDateDisplay(tomorrow)
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
      if (scope.scheduledInvite && scope.scheduledInvite.status === 'pending') {
        setDispatchMode('schedule');
      } else {
        setDispatchMode('send_now');
      }
    }
  }, [isOpen, project?.id, scope?.id]);

  // Derive matching trade keywords for intelligent contact pre-filtering
  const scopeKeywords = useMemo(() => {
    if (!scope) return [];
    const sName = scope.name.toLowerCase();
    const words = sName.split(/[\s,&/]+/).filter((w) => w.length > 2 && !['and', 'for', 'the', 'other'].includes(w));
    return [sName, ...words];
  }, [scope?.name]);

  // Check if contact matches the scope
  const isMatchingContact = (contact: Contact) => {
    const contactCategories = [
      contact.category || '',
      ...(contact.categories || []),
      ...(contact.trade_categories || []),
      contact.company || '',
      contact.name || ''
    ].map((c) => c.toLowerCase());

    return scopeKeywords.some((kw) =>
      contactCategories.some((cat) => cat.includes(kw) || kw.includes(cat))
    );
  };

  // Filtered contacts list
  const filteredContacts = useMemo(() => {
    return contacts.filter((c) => {
      // Trade filter
      if (showOnlyMatchingTrades && !isMatchingContact(c)) {
        return false;
      }
      // Search filter
      if (contactSearchQuery.trim()) {
        const q = contactSearchQuery.toLowerCase();
        const matchesName = c.name.toLowerCase().includes(q);
        const matchesCompany = c.company.toLowerCase().includes(q);
        const matchesEmail = c.email.toLowerCase().includes(q);
        const matchesCat = (c.categories || [c.category]).some((cat) => cat.toLowerCase().includes(q));
        if (!matchesName && !matchesCompany && !matchesEmail && !matchesCat) {
          return false;
        }
      }
      return true;
    });
  }, [contacts, showOnlyMatchingTrades, contactSearchQuery, scopeKeywords]);

  // Selected contact IDs (default to matching contacts who already have trades or are matched)
  const [selectedContactIds, setSelectedContactIds] = useState<string[]>(() => {
    if (!scope) return [];
    const existingContactIdsInScope = scope.trades
      .map((t) => t.contactId)
      .filter((id): id is string => Boolean(id));

    if (existingContactIdsInScope.length > 0) {
      return existingContactIdsInScope;
    }

    const matching = contacts.filter((c) => isMatchingContact(c)).map((c) => c.id);
    return matching.slice(0, 5);
  });

  // Sync selected contact IDs when scope changes or modal opens
  useEffect(() => {
    if (isOpen && scope) {
      const existingContactIdsInScope = scope.trades
        .map((t) => t.contactId)
        .filter((id): id is string => Boolean(id));

      if (existingContactIdsInScope.length > 0) {
        setSelectedContactIds(existingContactIdsInScope);
      } else {
        const matching = contacts.filter((c) => isMatchingContact(c)).map((c) => c.id);
        setSelectedContactIds(matching.slice(0, 5));
      }
    }
  }, [isOpen, scope?.id]);

  // Toggle single contact selection
  const handleToggleContact = (id: string) => {
    setSelectedContactIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Selected count
  const selectedCount = selectedContactIds.length;
  const isAnySelected = selectedCount > 0;

  // Bulk Control:
  // If any contractors are selected ➔ Clears all checkboxes to 0.
  // If no contractors are selected ➔ Checks all visible trades.
  const handleBulkToggle = () => {
    if (isAnySelected) {
      setSelectedContactIds([]);
    } else {
      const filteredIds = filteredContacts.map((c) => c.id);
      setSelectedContactIds(filteredIds);
    }
  };

  // Preset deadline buttons
  const setDeadlinePreset = (daysFromNow: number) => {
    const d = new Date();
    d.setDate(d.getDate() + daysFromNow);
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    const day = d.getDate();
    const suffix = day % 10 === 1 && day !== 11 ? 'st' : day % 10 === 2 && day !== 12 ? 'nd' : day % 10 === 3 && day !== 13 ? 'rd' : 'th';
    setTenderDeadline(`${months[d.getMonth()]} ${day}${suffix} - 11:00 PM`);
  };

  // Extract recipient emails with BCC protection
  const recipientList = useMemo(() => {
    return selectedContactIds
      .map((id) => {
        const contact = contacts.find((c) => c.id === id);
        if (!contact) return null;
        const email = (customEmails[id] || contact.email || '').trim();
        return {
          id: contact.id,
          name: contact.name,
          company: contact.company,
          email,
          hasEmail: Boolean(email && email.includes('@'))
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null);
  }, [selectedContactIds, contacts, customEmails]);

  const validEmails = useMemo(() => {
    return recipientList.filter((r) => r.hasEmail).map((r) => r.email);
  }, [recipientList]);

  // 1. Static Universal Greeting
  // Hardcoded "Hello," with no personalized contact name interpolations
  const previewGreeting = 'Hello,';

  // Exact HTML Email Template matching user specification with chosen Sender & CC
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

    return `<p>Hello,</p>

<p>We are pleased to invite you to submit an estimate for this upcoming project.</p>

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

<h3 style="color: #3f512b;">Project Documents & Submission Form</h3>
<ul>
  <li>Please click on “View Plans & Specifications” to view and download all relevant project plans, drawings, and specifications available in the project folder linked below.</li>
  <li>To submit your quote, please click on “Submit Estimate”. This link takes you to our estimate submission form, please review the instructions prior to submitting your quote.</li>
</ul>

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

<h3 style="color: #3f512b;">Questions & Support</h3>
<p>If you have any questions, require clarifications regarding the scope, or if you encounter any issues accessing the project plans or the submission form, please reply directly to this email.</p>

<p>We look forward to receiving your bid and the potential opportunity to work together.</p>

<p>Best Regards,</p>
<br>
<strong>${senderHeader}</strong><br>
${senderRoleHtml}e. ${senderEmail}<br>
w. ${senderWebsite}`;
  }, [project, scope, tenderDeadline, driveLink, formLink, activeSender]);

  // Plain Text Version
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

    return `Hello,

We are pleased to invite you to submit an estimate for this upcoming project.

Project Overview & Deadline:
- Project Name: ${projectName} (${projectAbbreviation})
- Location: ${projectLocation}
- Scope of Work: ${scopeName}

--------------------------------------------------
⚠️ SUBMISSION DEADLINE: ${finalDeadline}
Please note: To maintain a fair procurement process, NO quotes or proposals will be accepted past this deadline under any circumstances.
--------------------------------------------------

Project Documents & Submission Form:
- Please click on “View Plans & Specifications” to view and download all relevant project plans, drawings, and specifications:
  ${finalDriveLink}

- To submit your quote, please click on “Submit Estimate” to access our estimate submission form:
  ${finalFormLink}

Questions & Support:
If you have any questions, require clarifications regarding the scope, or if you encounter any issues accessing the project plans or the submission form, please reply directly to this email.

We look forward to receiving your bid and the potential opportunity to work together.

Best Regards,

${senderHeader}
${senderRoleText}e. ${senderEmail}
w. ${senderWebsite}`;
  }, [project, scope, tenderDeadline, driveLink, formLink, activeSender]);

  // Email subject line matching user requirement: Estimate Request: [Project Name] - [Scope Name]
  const emailSubject = project && scope ? `Estimate Request: ${project.name} - ${scope.name}` : '';

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

  // Launch Default Email Client with From, CC, and batched BCC protection
  const handleOpenMailClient = () => {
    const bccList = Array.from(new Set(validEmails.filter((e) => e.toLowerCase() !== 'info@thezenithgroup.ca'))).join(',');
    const ccList = parsedCcEmails.join(',');
    let mailtoUrl = `mailto:info@thezenithgroup.ca?bcc=${encodeURIComponent(bccList)}&subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(generatedPlainText)}`;
    if (ccList) {
      mailtoUrl += `&cc=${encodeURIComponent(ccList)}`;
    }
    window.open(mailtoUrl, '_blank');
  };

  // Post-dispatch status message
  const [postDispatchStatus, setPostDispatchStatus] = useState<string | null>(null);

  // Cancel Scheduled Launch handler
  const handleCancelScheduled = () => {
    if (scope && onCancelScheduledLaunch) {
      if (window.confirm('Are you sure you want to cancel this scheduled tender email launch?')) {
        onCancelScheduledLaunch(scope.id);
        setDispatchMode('send_now');
        setPostDispatchStatus('Scheduled email launch cancelled.');
        setTimeout(() => {
          onClose();
        }, 1200);
      }
    }
  };

  // Final Dispatch & Automation Trigger
  const handleDispatch = async () => {
    if (!scope || !project) return;
    if (selectedContactIds.length === 0) {
      alert('Please select at least one contractor from the directory to dispatch tender invitations.');
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
      const result = await onSendInvitations({
        scopeId: scope.id,
        selectedContactIds,
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
        const msg = typeof result === 'object' && result?.message 
          ? result.message 
          : isScheduled
            ? `Tender invitations scheduled for launch on ${scheduledDisplay || 'scheduled date'}`
            : `1 email dispatched to ${validEmails.length} contractors via BCC`;
        setPostDispatchStatus(msg);
        setTimeout(() => {
          onClose();
        }, 1800);
      }
    } catch (err) {
      console.error('Failed to dispatch invitations:', err);
    } finally {
      setIsDispatching(false);
    }
  };

  // Early return after all hooks are executed
  if (!isOpen || !scope || !project) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150">
      <div 
        id="tender-invite-modal"
        className="bg-white w-full max-w-5xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[94vh]"
      >
        {/* Header */}
        <div className="p-4 sm:p-5 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-600 rounded-xl shadow-md">
              <Mail className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="font-extrabold text-sm sm:text-base text-white">
                  Tender Invitation Dispatcher
                </h2>
                <span className="px-2 py-0.5 text-[10px] font-bold bg-emerald-950 text-emerald-300 rounded-full border border-emerald-700/80">
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
            id="close-tender-invite-modal-btn"
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
                  ? 'border-emerald-500 text-emerald-700 bg-white shadow-xs'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Users className="w-3.5 h-3.5 text-emerald-600" />
              <span>Configure & Select Contractors</span>
              <span className="px-1.5 py-0.2 bg-emerald-100 text-emerald-800 rounded-full text-[10px] font-mono">
                {selectedContactIds.length} Selected
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveViewMode('preview_visual')}
              className={`px-3.5 py-2 text-xs font-bold rounded-t-lg transition-all border-b-2 cursor-pointer flex items-center gap-1.5 ${
                activeViewMode === 'preview_visual'
                  ? 'border-emerald-500 text-emerald-700 bg-white shadow-xs'
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
                  ? 'border-emerald-500 text-emerald-700 bg-white shadow-xs'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Code className="w-3.5 h-3.5 text-purple-600" />
              <span>HTML Source Template</span>
            </button>
          </div>

          <div className="hidden sm:flex items-center gap-2 pb-2">
            <span className="text-[11px] font-semibold text-slate-500 flex items-center gap-1">
              <Lock className="w-3 h-3 text-emerald-600" />
              <span>BCC Batch Protection Active</span>
            </span>
          </div>
        </div>

        {/* Post-Dispatch Status Banner */}
        {postDispatchStatus && (
          <div className="mx-5 mt-4 p-3.5 bg-emerald-50 border border-emerald-300 rounded-xl flex items-center justify-between animate-in fade-in shadow-xs">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-600 text-white rounded-lg shadow-2xs">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-bold text-emerald-950">
                  {postDispatchStatus}
                </p>
                <p className="text-xs text-emerald-700">
                  All selected contractor rows marked as invited with action status &quot;Estimate Requested&quot;.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors cursor-pointer"
            >
              Done
            </button>
          </div>
        )}

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-5 text-xs flex-1">
          {/* TAB 1: CONFIGURE & SELECT TRADES */}
          {activeViewMode === 'configure' && (
            <div className="space-y-5">
              {/* GOOGLE ACCOUNT AUTHENTICATION & GMAIL DISPATCH STATUS */}
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Mail className="w-4 h-4 text-emerald-600" />
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
                      Emails will be sent directly from <strong className="text-slate-700">{currentUser?.email}</strong> via the official Google Gmail API. Your name and corporate email automatically populate the signature block.
                    </span>
                  ) : (
                    <span>
                      Connect your <strong className="text-slate-700">@thezenithgroup.ca</strong> Google Account to send tender invitations directly from your company Gmail inbox.
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
                accentColor="emerald"
              />

              {/* DISPATCH MODE SELECTOR: "Send Now" vs "Schedule Launch" */}
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-3">
                {/* If there is already a pending scheduled launch, highlight it with quick cancel option */}
                {scope.scheduledInvite && scope.scheduledInvite.status === 'pending' && (
                  <div className="p-3 bg-amber-50 border border-amber-300 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                    <div className="flex items-center gap-2.5">
                      <CalendarClock className="w-5 h-5 text-amber-700 shrink-0 animate-pulse" />
                      <div>
                        <p className="text-xs font-bold text-amber-950">
                          Active Scheduled Launch: {scope.scheduledInvite.scheduledTimeDisplay || scope.scheduledInvite.scheduledTime}
                        </p>
                        <p className="text-[11px] text-amber-800">
                          Single BCC batch email is queued to launch to {scope.scheduledInvite.selectedRecipientIds?.length || selectedCount} contractors.
                        </p>
                      </div>
                    </div>
                    {onCancelScheduledLaunch && (
                      <button
                        type="button"
                        id="cancel-scheduled-launch-modal-btn"
                        onClick={handleCancelScheduled}
                        className="px-3 py-1.5 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-1.5 shadow-2xs shrink-0"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        <span>Cancel Scheduled Launch</span>
                      </button>
                    )}
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <CalendarClock className="w-4 h-4 text-emerald-600" />
                    <span>Dispatch Timing</span>
                  </span>
                  <div className="flex items-center gap-1 bg-slate-200/90 p-1 rounded-xl border border-slate-300">
                    <label 
                      className={`flex items-center gap-1.5 px-3 py-1 rounded-lg cursor-pointer transition-all text-xs ${
                        dispatchMode === 'send_now'
                          ? 'bg-white text-emerald-800 font-extrabold shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900 font-medium'
                      }`}
                    >
                      <input
                        type="radio"
                        name="invite-timing-top-radio"
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
                          ? 'bg-emerald-700 text-white font-extrabold shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900 font-medium'
                      }`}
                    >
                      <input
                        type="radio"
                        name="invite-timing-top-radio"
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
                  <div id="invite-schedule-picker-container" className="animate-in fade-in slide-in-from-top-2 duration-150">
                    <ScheduleLaunchPicker
                      scheduledIso={scheduledIso}
                      onScheduleChange={(iso, display) => {
                        setScheduledIso(iso);
                        setScheduledDisplay(display);
                      }}
                      accentColor="emerald"
                      tenderDeadline={tenderDeadline}
                      type="invitation"
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
                    accentColor="emerald"
                    initialDaysOffset={7}
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
                      Shared folder containing drawings and specs. Saved to Project.
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
                      Google Form for contractor estimate submissions. Saved to Scope.
                    </p>
                  </div>
                </div>
              </div>

              {/* Contractor Selection Section */}
              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900 text-white p-3.5 rounded-xl">
                  <div className="flex items-center gap-2.5">
                    <Users className="w-4 h-4 text-emerald-400" />
                    <div>
                      <h4 className="font-bold text-xs">Select Recipient Subtrades & Contractors</h4>
                      <p className="text-[10px] text-slate-400">
                        {selectedCount} contractors selected ({validEmails.length} with verified email address)
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setShowOnlyMatchingTrades(!showOnlyMatchingTrades)}
                      className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-colors cursor-pointer ${
                        showOnlyMatchingTrades
                          ? 'bg-emerald-700 text-white border border-emerald-500'
                          : 'bg-slate-800 text-slate-300 border border-slate-700'
                      }`}
                    >
                      {showOnlyMatchingTrades ? `✓ Matching Trades Only` : `Show All Directory (${contacts.length})`}
                    </button>

                    <button
                      type="button"
                      id="bulk-toggle-recipients-btn"
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
                    value={contactSearchQuery}
                    onChange={(e) => setContactSearchQuery(e.target.value)}
                    placeholder="Search contractors by name, trade category, company, or email..."
                    className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-800"
                  />
                </div>

                {/* Directory Selection List */}
                <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100 max-h-72 overflow-y-auto bg-white">
                  {filteredContacts.length === 0 ? (
                    <div className="p-8 text-center text-slate-400">
                      <Users className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                      <p className="font-semibold text-xs text-slate-600">No matching contractors found.</p>
                      <p className="text-[11px] text-slate-400 mt-1">
                        Try clearing search filters or switch to 'Show All Directory'.
                      </p>
                    </div>
                  ) : (
                    filteredContacts.map((contact) => {
                      const isSelected = selectedContactIds.includes(contact.id);
                      const currentEmail = (customEmails[contact.id] !== undefined ? customEmails[contact.id] : contact.email) || '';
                      const isEmailMissing = !currentEmail.trim() || !currentEmail.includes('@');
                      const isTradeMatch = isMatchingContact(contact);

                      return (
                        <div
                          key={contact.id}
                          id={`contractor-card-${contact.id}`}
                          onClick={() => handleToggleContact(contact.id)}
                          className={`p-3 transition-all cursor-pointer select-none flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                            isSelected
                              ? 'bg-emerald-50/70 border-l-4 border-l-emerald-600 ring-1 ring-emerald-500/20'
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
                                  {contact.company || contact.name}
                                </span>
                                {contact.company && contact.name && contact.company !== contact.name && (
                                  <span className="text-slate-500 text-[11px]">({contact.name})</span>
                                )}
                                {isTradeMatch && (
                                  <span className="px-1.5 py-0.2 text-[9px] font-bold bg-emerald-100 text-emerald-800 rounded border border-emerald-200">
                                    Trade Match
                                  </span>
                                )}
                              </div>

                              <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
                                <span>{contact.category || 'Trade Contractor'}</span>
                                {contact.phone && <span>&bull; {contact.phone}</span>}
                                {contact.rating && (
                                  <span className="text-amber-700 font-bold">
                                    &bull; ★ {contact.rating} ({contact.review_count || 0})
                                  </span>
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
                                      [contact.id]: e.target.value
                                    }));
                                  }}
                                  className="w-full px-2.5 py-1 text-xs bg-amber-50 border border-amber-300 rounded text-slate-900 placeholder:text-amber-700/60 focus:bg-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                                />
                              </div>
                            ) : (
                              <div className="w-full flex items-center justify-between gap-1 text-[11px] font-mono text-slate-600 bg-slate-100 px-2.5 py-1 rounded border border-slate-200">
                                <span className="truncate">{currentEmail}</span>
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
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
                  <span className="px-2 py-0.5 bg-emerald-900 text-emerald-300 text-[10px] font-bold rounded border border-emerald-700">
                    BCC Protected ({validEmails.length} recipients)
                  </span>
                </div>

                <div className="space-y-1.5 text-xs text-slate-300">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-bold text-slate-400">From:</span> 
                    <span className="text-white font-bold">{activeSender.name}</span>
                    <span className="font-mono text-emerald-400">&lt;{activeSender.email}&gt;</span>
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
                      <span className="font-mono text-[11px] text-emerald-400">
                        {validEmails.slice(0, 3).join(', ')}
                        {validEmails.length > 3 ? ` + ${validEmails.length - 3} more` : ''}
                      </span>
                    ) : (
                      <span className="text-rose-400 font-bold">No valid emails selected</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Exact HTML Rendering Card */}
              <div className="p-6 bg-white border border-slate-200 rounded-xl shadow-xs space-y-4 text-slate-800 leading-relaxed font-sans max-w-3xl mx-auto">
                <p>{previewGreeting}</p>

                <p>We are pleased to invite you to submit an estimate for this upcoming project.</p>

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

                <h3 className="font-bold text-sm tracking-tight pt-1" style={{ color: '#3f512b' }}>
                  Project Documents & Submission Form
                </h3>
                <ul className="list-disc pl-5 space-y-1 text-xs">
                  <li>
                    Please click on “View Plans & Specifications” to view and download all relevant project plans,
                    drawings, and specifications available in the project folder linked below.
                  </li>
                  <li>
                    To submit your quote, please click on “Submit Estimate”. This link takes you to our estimate
                    submission form, please review the instructions prior to submitting your quote.
                  </li>
                </ul>

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

                <h3 className="font-bold text-sm tracking-tight pt-1" style={{ color: '#3f512b' }}>
                  Questions & Support
                </h3>
                <p className="text-xs">
                  If you have any questions, require clarifications regarding the scope, or if you encounter any issues
                  accessing the project plans or the submission form, please reply directly to this email.
                </p>

                <p className="text-xs">
                  We look forward to receiving your bid and the potential opportunity to work together.
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
                  Raw HTML Email Template (Ready for Direct Mail Dispatches or Webhooks)
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
                className="w-full p-4 font-mono text-[11px] bg-slate-950 text-emerald-400 rounded-xl border border-slate-800 focus:outline-none select-all"
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
            {scope?.scheduledInvite && scope.scheduledInvite.status === 'pending' && onCancelScheduledLaunch && (
              <button
                type="button"
                onClick={handleCancelScheduled}
                className="px-3.5 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 border border-rose-200 rounded-xl transition-colors cursor-pointer flex items-center gap-1.5"
                title="Cancel pending scheduled email launch"
              >
                <XCircle className="w-3.5 h-3.5 text-rose-600" />
                <span>Cancel Scheduled Launch</span>
              </button>
            )}

            {/* Dispatch Timing Selector: Radio 1 vs Radio 2 */}
            <div className="flex items-center gap-1 bg-slate-200/90 p-1 rounded-xl border border-slate-300">
              <label 
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg cursor-pointer transition-all text-xs ${
                  dispatchMode === 'send_now'
                    ? 'bg-white text-emerald-800 font-extrabold shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900 font-medium'
                }`}
                title="Send invitations immediately"
              >
                <input
                  type="radio"
                  name="tender-invite-timing-radio"
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
                    ? 'bg-emerald-700 text-white font-extrabold shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900 font-medium'
                }`}
                title="Schedule for future execution date & time"
              >
                <input
                  type="radio"
                  name="tender-invite-timing-radio"
                  value="schedule"
                  checked={dispatchMode === 'schedule'}
                  onChange={() => {
                    setDispatchMode('schedule');
                    // Scroll to schedule picker if needed
                    const el = document.getElementById('invite-schedule-picker-container');
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
              id="send-tender-invitations-btn"
              onClick={handleDispatch}
              disabled={isDispatching || selectedCount === 0}
              className={`px-5 py-2.5 disabled:opacity-50 text-white font-extrabold rounded-xl shadow-md transition-all cursor-pointer text-xs flex items-center gap-2 ${
                dispatchMode === 'schedule'
                  ? 'bg-emerald-800 hover:bg-emerald-900 border border-emerald-600'
                  : 'bg-emerald-600 hover:bg-emerald-700'
              }`}
            >
              {dispatchMode === 'schedule' ? (
                <CalendarClock className={`w-4 h-4 text-emerald-200 ${isDispatching ? 'animate-spin' : ''}`} />
              ) : (
                <Send className={`w-4 h-4 ${isDispatching ? 'animate-spin' : ''}`} />
              )}
              <span>
                {isDispatching
                  ? dispatchMode === 'schedule'
                    ? 'Scheduling Launch...'
                    : hasGoogleToken
                      ? 'Sending via Gmail API...'
                      : 'Sending Invitations...'
                  : dispatchMode === 'schedule'
                    ? `Schedule Launch (${scheduledDisplay || 'Scheduled'}) • ${selectedCount} Trades`
                    : hasGoogleToken
                      ? `Send via Gmail API (${selectedCount} Contractors)`
                      : `Send Invitations Now (${selectedCount} Contractors)`}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
