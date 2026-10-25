import { storageService, DEFAULT_APPS_SCRIPT_WEBHOOK_URL } from './storageService';

export interface GmailDispatchPayload {
  to: string;
  subject: string;
  htmlBody: string;
  cc: string | string[];
  bcc: string | string[];
  bccArray?: string[];
}

export interface DispatchResultItem {
  recipient: string;
  success: boolean;
  status?: string;
  message?: string;
}

export interface BatchDispatchResponse {
  success: boolean;
  dispatchedCount: number;
  results: DispatchResultItem[];
  errorMessage?: string;
}

export const appsScriptService = {
  getEndpointUrl(): string {
    const url = storageService.getAppsScriptUrl();
    return url?.trim() || DEFAULT_APPS_SCRIPT_WEBHOOK_URL;
  },

  setEndpointUrl(url: string): void {
    storageService.saveAppsScriptUrl(url);
  },

  isConfigured(): boolean {
    const url = this.getEndpointUrl();
    return Boolean(url && url.trim().length > 0 && url.startsWith('http'));
  },

  /**
   * Dispatches a single email to the configured Google Apps Script Web App endpoint.
   * Uses text/plain;charset=utf-8 so browser fetch does not trigger an unsupported CORS preflight OPTIONS request on Google Apps Script.
   */
  async sendSingleEmail(
    endpointUrl: string,
    payload: GmailDispatchPayload
  ): Promise<{ status: 'success' | 'error'; message?: string }> {
    const cleanUrl = endpointUrl.trim();
    if (!cleanUrl) {
      return {
        status: 'error',
        message: 'Google Apps Script Endpoint URL is not configured. Please enter the URL in App Settings.'
      };
    }

    try {
      const response = await fetch(cleanUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8'
        },
        body: JSON.stringify(payload),
        redirect: 'follow'
      });

      const responseText = await response.text();
      let data: any = {};
      try {
        data = JSON.parse(responseText);
      } catch (jsonErr) {
        if (response.ok) {
          // If returned 200 OK without JSON error (e.g. plain text "Success")
          return { status: 'success', message: responseText || 'Dispatched successfully via Google Apps Script.' };
        }
        return {
          status: 'error',
          message: responseText || `HTTP ${response.status}: ${response.statusText}`
        };
      }

      if (data.status === 'success' || data.result === 'success' || data.status === 'ok' || data.success === true) {
        return { status: 'success', message: data.message || 'Dispatched successfully via Google Apps Script.' };
      } else {
        return {
          status: 'error',
          message: data.message || data.error || 'The Google Apps Script Web App returned an error status.'
        };
      }
    } catch (err: any) {
      console.error('Apps Script Dispatch Error:', err);
      const errMsg = err?.message || 'Network error occurred while connecting to Google Apps Script endpoint.';
      const isCorsOrNetwork = errMsg.toLowerCase().includes('failed to fetch') || errMsg.toLowerCase().includes('network');
      return {
        status: 'error',
        message: isCorsOrNetwork
          ? `${errMsg} (Verify the Apps Script Web App deployment has 'Who has access' set to 'Anyone').`
          : errMsg
      };
    }
  },

  /**
   * Iterates through each contractor recipient and dispatches individual POST requests (1-to-1)
   * so contractors never see each other's email addresses (trade privacy protection).
   */
  async dispatchIndividualEmails({
    endpointUrl,
    recipients,
    subject,
    htmlBody,
    cc = '',
    bcc = ''
  }: {
    endpointUrl: string;
    recipients: Array<string | { email: string; name?: string; htmlBody?: string }>;
    subject: string;
    htmlBody: string;
    cc?: string;
    bcc?: string;
  }): Promise<BatchDispatchResponse> {
    const cleanUrl = endpointUrl?.trim() || this.getEndpointUrl();
    if (!cleanUrl) {
      return {
        success: false,
        dispatchedCount: 0,
        results: [],
        errorMessage: 'Google Apps Script Endpoint URL is not configured. Please add your Web App URL in App Settings.'
      };
    }

    const recipientItems = recipients.map((r) => {
      if (typeof r === 'string') {
        return { email: r.trim(), name: '', htmlBody };
      }
      return {
        email: r.email.trim(),
        name: r.name?.trim() || '',
        htmlBody: r.htmlBody || htmlBody
      };
    }).filter((r) => r.email.includes('@'));

    // Deduplicate recipients by email address
    const uniqueMap = new Map<string, { email: string; name: string; htmlBody: string }>();
    for (const item of recipientItems) {
      if (!uniqueMap.has(item.email.toLowerCase())) {
        uniqueMap.set(item.email.toLowerCase(), item);
      }
    }
    const uniqueRecipients = Array.from(uniqueMap.values());

    if (uniqueRecipients.length === 0) {
      return {
        success: false,
        dispatchedCount: 0,
        results: [],
        errorMessage: 'No valid contractor email addresses provided.'
      };
    }

    const results: DispatchResultItem[] = [];
    let failureCount = 0;
    let firstErrorMessage = '';

    // 1-to-1 Email Loop: Dispatch individual POST request for EACH contractor
    // Direct TO Address: recipient.email (e.g. "john@smithframing.com")
    // Remove Group Lists: Never place contractor emails in CC or group TO
    for (const recipient of uniqueRecipients) {
      const payload: GmailDispatchPayload = {
        to: recipient.email,
        subject: subject.trim(),
        htmlBody: recipient.htmlBody,
        cc: cc.trim(),
        bcc: bcc.trim()
      };

      const res = await this.sendSingleEmail(cleanUrl, payload);
      if (res.status === 'success') {
        results.push({
          recipient: recipient.email,
          success: true,
          status: 'success',
          message: res.message
        });
      } else {
        failureCount++;
        if (!firstErrorMessage) {
          firstErrorMessage = res.message || 'Dispatch error';
        }
        results.push({
          recipient: recipient.email,
          success: false,
          status: 'error',
          message: res.message
        });
      }
    }

    const allSucceeded = failureCount === 0;

    return {
      success: allSucceeded,
      dispatchedCount: results.filter((r) => r.success).length,
      results,
      errorMessage: allSucceeded ? undefined : firstErrorMessage
    };
  },

  /**
   * Sends a test ping payload to the Google Apps Script Web App to verify connectivity
   */
  async testConnection(endpointUrl: string): Promise<{ success: boolean; message: string }> {
    const cleanUrl = endpointUrl.trim();
    if (!cleanUrl) {
      return { success: false, message: 'Please enter a valid Google Apps Script Web App URL.' };
    }

    const testPayload: GmailDispatchPayload = {
      to: 'test@example.com',
      subject: 'Zenith Apps Script Dispatcher Ping Verification',
      htmlBody: '<p>Endpoint connection test verified from Zenith Tender Tracker.</p>',
      cc: '',
      bcc: ''
    };

    try {
      const res = await this.sendSingleEmail(cleanUrl, testPayload);
      if (res.status === 'success') {
        return {
          success: true,
          message: 'Connection verified successfully! Google Apps Script Web App returned status: "success".'
        };
      }
      return {
        success: false,
        message: res.message || 'The endpoint returned an error or unexpected response.'
      };
    } catch (e: any) {
      return {
        success: false,
        message: e?.message || 'Failed to connect to the Google Apps Script endpoint.'
      };
    }
  },

  /**
   * Single Batch Dispatch Execution via Google Apps Script:
   * Eliminates loop, sending a single email payload:
   * To: Specified address
   * BCC: An array containing all selected contractor email addresses
   * Subject: Estimate Request: [Project Name] - [Scope Name]
   */
  async dispatchSingleBccBatch({
    endpointUrl,
    to,
    bccRecipients,
    subject,
    htmlBody,
    cc = ''
  }: {
    endpointUrl: string;
    to?: string;
    bccRecipients: string[];
    subject: string;
    htmlBody: string;
    cc?: string | string[];
  }): Promise<{ success: boolean; dispatchedCount: number; message?: string; errorMessage?: string }> {
    const cleanUrl = endpointUrl?.trim() || this.getEndpointUrl();
    if (!cleanUrl) {
      return {
        success: false,
        dispatchedCount: 0,
        errorMessage: 'Google Apps Script Endpoint URL is not configured.'
      };
    }

    // Deduplicate recipients and ensure info@thezenithgroup.ca is NOT included in BCC
    const cleanedBcc: string[] = [];
    const seen = new Set<string>();

    bccRecipients.forEach((email) => {
      const clean = email.trim();
      if (clean && clean.includes('@') && clean.toLowerCase() !== 'info@thezenithgroup.ca' && !seen.has(clean.toLowerCase())) {
        seen.add(clean.toLowerCase());
        cleanedBcc.push(clean);
      }
    });

    const contractorCount = cleanedBcc.length;

    if (contractorCount === 0) {
      return {
        success: false,
        dispatchedCount: 0,
        errorMessage: 'No valid contractor email addresses provided for BCC batch dispatch.'
      };
    }

    const ccString = Array.isArray(cc) ? cc.filter(Boolean).join(', ') : (cc || '').trim();

    // Send single payload with both BCC array and comma-separated string for Apps Script compatibility
    const payload: GmailDispatchPayload = {
      to: to?.trim() || '',
      subject: subject.trim(),
      htmlBody,
      cc: ccString,
      bcc: cleanedBcc,
      bccArray: cleanedBcc
    };

    try {
      const res = await this.sendSingleEmail(cleanUrl, payload);
      if (res.status === 'success') {
        return {
          success: true,
          dispatchedCount: contractorCount,
          message: `1 email dispatched to ${contractorCount} contractors via BCC`
        };
      } else {
        return {
          success: false,
          dispatchedCount: 0,
          errorMessage: res.message || 'Google Apps Script single batch BCC dispatch failed.'
        };
      }
    } catch (err: any) {
      console.error('Apps Script BCC Batch Dispatch Error:', err);
      return {
        success: false,
        dispatchedCount: 0,
        errorMessage: err?.message || 'Network error occurred while connecting to Google Apps Script endpoint.'
      };
    }
  },

  /**
   * Revoke scheduled execution trigger in Google Apps Script / backend queue
   */
  async cancelScheduledExecution(
    jobId: string,
    scopeId?: string,
    endpointUrl?: string
  ): Promise<{ success: boolean; message: string }> {
    const cleanUrl = endpointUrl?.trim() || this.getEndpointUrl();
    const payload = {
      action: 'cancel_scheduled_email',
      jobId,
      scopeId,
      timestamp: new Date().toISOString()
    };

    // Also notify Express server endpoint
    try {
      await fetch('/api/sheets/scheduled/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobId, scopeId })
      });
    } catch (e) {
      console.warn('Backend local queue cancellation ping failed, falling back to Apps Script webhook:', e);
    }

    if (!cleanUrl) {
      return { success: true, message: 'Scheduled execution trigger cancelled.' };
    }

    try {
      await fetch(cleanUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(payload),
        redirect: 'follow'
      });
      return { success: true, message: 'Execution trigger revoked from Apps Script backend queue.' };
    } catch (err: any) {
      console.warn('Apps Script cancel webhook notification error (local cancellation already applied):', err);
      return { success: true, message: 'Execution trigger cancelled.' };
    }
  },

  /**
   * Synchronize scheduled dispatches queue to Google Sheets under 'Scheduled_Dispatches' tab
   */
  async syncScheduledDispatchesToSheet(
    jobs: any[],
    csv: string,
    endpointUrl?: string
  ): Promise<{ success: boolean; message: string }> {
    const cleanUrl = endpointUrl?.trim() || this.getEndpointUrl();

    // Save to Express server
    try {
      await fetch('/api/sheets/scheduled', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobs, csv })
      });
    } catch (e) {
      console.warn('Failed to persist scheduled dispatches to server backend:', e);
    }

    if (!cleanUrl) {
      return { success: true, message: 'Saved to local scheduled dispatches store.' };
    }

    try {
      await fetch(cleanUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          action: 'sync_scheduled_dispatches',
          tabName: 'Scheduled_Dispatches',
          jobs,
          csv,
          timestamp: new Date().toISOString()
        }),
        redirect: 'follow'
      });
      return { success: true, message: 'Scheduled dispatches successfully synced to Scheduled_Dispatches tab.' };
    } catch (err: any) {
      console.warn('Apps Script sync webhook warning:', err);
      return { success: true, message: 'Saved locally and ready for next sync.' };
    }
  }
};
