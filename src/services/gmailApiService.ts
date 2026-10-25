import { BatchDispatchResponse, DispatchResultItem } from './appsScriptService';

export interface GmailApiPayload {
  to: string;
  senderName: string;
  senderEmail: string;
  subject: string;
  htmlBody: string;
  cc?: string | string[];
  bcc?: string | string[];
}

/**
 * Builds an RFC 2822 compliant MIME email string formatted in UTF-8 HTML
 */
function buildRfc2822Email(payload: GmailApiPayload): string {
  const { to, senderName, senderEmail, subject, htmlBody, cc, bcc } = payload;
  
  // Encode subject in Base64 according to RFC 2047 for full UTF-8 character fidelity
  const utf8Subject = `=?utf-8?B?${btoa(unescape(encodeURIComponent(subject)))}?=`;
  const fromHeader = senderName ? `"${senderName.replace(/"/g, '')}" <${senderEmail}>` : senderEmail;

  const lines: string[] = [
    `From: ${fromHeader}`,
    `To: ${to}`
  ];

  const ccString = Array.isArray(cc) ? cc.filter(Boolean).join(', ') : (cc || '').trim();
  if (ccString.length > 0) {
    lines.push(`Cc: ${ccString}`);
  }

  const bccString = Array.isArray(bcc) ? bcc.filter(Boolean).join(', ') : (bcc || '').trim();
  if (bccString.length > 0) {
    lines.push(`Bcc: ${bccString}`);
  }

  lines.push(`Subject: ${utf8Subject}`);
  lines.push('MIME-Version: 1.0');
  lines.push('Content-Type: text/html; charset=UTF-8');
  lines.push('Content-Transfer-Encoding: 8bit');
  lines.push('');
  lines.push(htmlBody);

  return lines.join('\r\n');
}

/**
 * Converts a UTF-8 string to a URL-safe Base64 string required by Gmail API "raw" parameter
 */
function toBase64UrlSafe(str: string): string {
  const bytes = new TextEncoder().encode(str);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  const base64 = btoa(binary);
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export const gmailApiService = {
  /**
   * Sends a single email directly via the official Google Gmail API:
   * POST https://gmail.googleapis.com/gmail/v1/users/me/messages/send
   */
  async sendSingleEmail(
    accessToken: string,
    payload: GmailApiPayload
  ): Promise<{ status: 'success' | 'error'; messageId?: string; message?: string }> {
    if (!accessToken || !accessToken.trim()) {
      return {
        status: 'error',
        message: 'Missing Google OAuth Access Token. Please sign in with your @thezenithgroup.ca Google Account.'
      };
    }

    try {
      const mimeString = buildRfc2822Email(payload);
      const raw = toBase64UrlSafe(mimeString);

      const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken.trim()}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ raw })
      });

      if (response.status === 401) {
        return {
          status: 'error',
          message: 'Google OAuth session expired (401). Please sign in with your Google account again.'
        };
      }

      if (response.status === 403) {
        return {
          status: 'error',
          message: 'Gmail API permission denied (403). Ensure the account granted "https://www.googleapis.com/auth/gmail.send" permission.'
        };
      }

      const responseData = await response.json();

      if (response.ok && responseData.id) {
        return {
          status: 'success',
          messageId: responseData.id,
          message: `Email dispatched via Gmail API (Message ID: ${responseData.id})`
        };
      } else {
        const errorMsg = responseData?.error?.message || response.statusText || 'Gmail API request failed.';
        return {
          status: 'error',
          message: errorMsg
        };
      }
    } catch (err: any) {
      console.error('Gmail API send error:', err);
      return {
        status: 'error',
        message: err?.message || 'Network error while calling Google Gmail API.'
      };
    }
  },

  /**
   * Dispatches individual emails to each contractor recipient via Gmail API,
   * guaranteeing absolute recipient address privacy (1-to-1 direct TO dispatch).
   */
  async dispatchBatch({
    accessToken,
    senderName,
    senderEmail,
    recipients,
    subject,
    htmlBody,
    cc = '',
    bcc = ''
  }: {
    accessToken: string;
    senderName: string;
    senderEmail: string;
    recipients: Array<string | { email: string; name?: string; htmlBody?: string }>;
    subject: string;
    htmlBody: string;
    cc?: string;
    bcc?: string;
  }): Promise<BatchDispatchResponse> {
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
        errorMessage: 'No valid recipient email addresses provided.'
      };
    }

    const results: DispatchResultItem[] = [];
    let failureCount = 0;
    let firstErrorMessage = '';

    // 1-to-1 Email Loop: Send a completely separate email payload per contractor
    // Direct TO Address: recipient.email (e.g. "john@smithframing.com")
    // Remove Group Lists: Never place contractor emails in CC or group TO
    for (const recipient of uniqueRecipients) {
      const res = await this.sendSingleEmail(accessToken, {
        to: recipient.email,
        senderName,
        senderEmail,
        subject: subject.trim(),
        htmlBody: recipient.htmlBody,
        cc: cc.trim(),
        bcc: bcc.trim()
      });

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
          firstErrorMessage = res.message || 'Gmail API dispatch failure';
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
   * Single Batch Dispatch Execution via Gmail API:
   * Eliminates loop, sending a single email payload:
   * To: senderEmail (or specified direct address)
   * BCC: Selected contractor email addresses (strictly excluding info@thezenithgroup.ca from BCC)
   * Subject: Estimate Request: [Project Name] - [Scope Name]
   */
  async dispatchSingleBccBatch({
    accessToken,
    senderName,
    senderEmail,
    to,
    bccRecipients,
    subject,
    htmlBody,
    cc = ''
  }: {
    accessToken: string;
    senderName: string;
    senderEmail: string;
    to?: string;
    bccRecipients: string[];
    subject: string;
    htmlBody: string;
    cc?: string | string[];
  }): Promise<{ success: boolean; dispatchedCount: number; message?: string; errorMessage?: string }> {
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

    const res = await this.sendSingleEmail(accessToken, {
      to: to?.trim() || senderEmail,
      senderName,
      senderEmail,
      subject: subject.trim(),
      htmlBody,
      cc,
      bcc: cleanedBcc
    });

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
        errorMessage: res.message || 'Gmail API single batch BCC dispatch failed.'
      };
    }
  }
};
