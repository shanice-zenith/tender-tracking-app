const { onDocumentWritten } = require("firebase-functions/v2/firestore");
const { initializeApp } = require("firebase-admin/app");

initializeApp();

// Zenith Google Workspace Email Dispatcher Webhook
const APPS_SCRIPT_DISPATCHER =
  "https://script.google.com/a/macros/thezenithgroup.ca/s/AKfycby8WGdj9nbiZ7gILzjXL6FjjJJMbcPMR4OHB9S4oNk42VRfQXSYEBhxpTZ1zp37vjjx/exec";

// Recipients list
const RECIPIENT_EMAILS = "info@thezenithgroup.ca"                                                                                                                 ;

exports.onQuoteSubmitted = onDocumentWritten(
  {
    document: "quotes/{quoteId}",
    database: "ai-studio-tendertrackingap-9f434cfb-0357-4e18-b5cb-149e70c03d8a",
    region: "us-west1"
  },
  async (event) => {
    // Drop execution if the document was deleted
    if (!event.data.after.exists) return;

    const beforeData = event.data.before.exists ? event.data.before.data() : null;
    const quote = event.data.after.data();

    // Deduplication check: only notify if it's a new quote, a revision, or if the figure changed
    if (beforeData) {
      const priceChanged =
        beforeData.quotedFigure !== quote.quotedFigure ||
        beforeData.enteredAmount !== quote.enteredAmount;
      const isRevision =
        quote.actionStatus === "Revision Submitted" &&
        beforeData.actionStatus !== "Revision Submitted";
      const newDocsAdded =
        (quote.attachedDocs?.length || 0) > (beforeData.attachedDocs?.length || 0);

      if (!priceChanged && !isRevision && !newDocsAdded) {
        return;
      }
    }

    const companyName = quote.companyName || quote.contractorName || "Subtrade Contractor";
    const projectName = quote.projectName || "General Project";
    const tradeScope = quote.trade || quote.tenderItem || quote.tradeScope || "General Scope";
    const costCode = quote.costCode || "Unassigned";
    const contractorEmail = quote.email || quote.emailAddress || "Not provided";
    const notes = quote.notes || "None";
    const docUrl = quote.docUrl || (quote.attachedDocs && quote.attachedDocs[0]?.url) || "";
    const isRevision = quote.actionStatus === "Revision Submitted";

    const rawAmount = quote.quotedFigure ?? quote.enteredAmount ?? quote.amount ?? 0;
    const formattedAmount =
      "$" +
      Number(rawAmount).toLocaleString("en-CA", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      });

    const subject = isRevision
      ? `🔄 Revised Quote Submitted: ${companyName} — ${projectName} (${formattedAmount})`
      : `🚨 New Tender Quote: ${companyName} — ${projectName} (${formattedAmount})`;

    const htmlBody = `
<div style="font-family: Arial, sans-serif; max-width: 600px; color: #1e293b; line-height: 1.5;">
  <div style="background-color: #0f172a; padding: 18px 24px; border-radius: 8px 8px 0 0; color: #ffffff;">
    <h2 style="margin: 0; font-size: 16px; font-weight: bold;">
      ${isRevision ? "Revised Quote Submitted" : "New Quote Submission Received"}
    </h2>
    <p style="margin: 4px 0 0 0; font-size: 12px; color: #94a3b8;">
      The Zenith Group Tender Tracker • Automated Notification
    </p>
  </div>

  <div style="border: 1px solid #e2e8f0; border-top: none; padding: 20px 24px; border-radius: 0 0 8px 8px; background-color: #ffffff;">
    <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
      <tr>
        <td style="padding: 8px 0; color: #64748b; width: 140px;"><strong>Project:</strong></td>
        <td style="padding: 8px 0; font-weight: bold; color: #0f172a;">${projectName}</td>
      </tr>
      <tr>
        <td style="padding: 8px 0; color: #64748b;"><strong>Company / Trade:</strong></td>
        <td style="padding: 8px 0; font-weight: bold; color: #0f172a;">${companyName}</td>
      </tr>
      <tr>
        <td style="padding: 8px 0; color: #64748b;"><strong>Scope of Work:</strong></td>
        <td style="padding: 8px 0; color: #0f172a;">${tradeScope} (Cost Code: ${costCode})</td>
      </tr>
      <tr>
        <td style="padding: 8px 0; color: #64748b;"><strong>Quoted Figure:</strong></td>
        <td style="padding: 8px 0; font-size: 16px; font-weight: bold; color: #16a34a;">${formattedAmount}</td>
      </tr>
      <tr>
        <td style="padding: 8px 0; color: #64748b;"><strong>Contractor Email:</strong></td>
        <td style="padding: 8px 0; color: #2563eb;">${contractorEmail}</td>
      </tr>
      <tr>
        <td style="padding: 8px 0; color: #64748b;"><strong>Notes / Scope Memo:</strong></td>
        <td style="padding: 8px 0; color: #475569;">${notes}</td>
      </tr>
    </table>

    ${docUrl
        ? `
    <div style="margin-top: 18px; padding-top: 16px; border-top: 1px solid #e2e8f0;">
      <a href="${docUrl}" target="_blank" style="display: inline-block; background-color: #2563eb; color: #ffffff; text-decoration: none; padding: 10px 18px; border-radius: 6px; font-weight: bold; font-size: 13px;">
        📄 View Attached Quote Document
      </a>
    </div>`
        : ""
      }

    <div style="margin-top: 20px; padding-top: 16px; border-top: 1px solid #e2e8f0; text-align: right;">
      <a href="https://tenders.thezenithgroup.ca/" target="_blank" style="color: #64748b; text-decoration: underline; font-size: 12px;">
        Open Zenith Tender Dashboard →
      </a>
    </div>
  </div>
</div>`;

    try {
      await fetch(APPS_SCRIPT_DISPATCHER, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify({
          to: RECIPIENT_EMAILS,
          subject: subject,
          htmlBody: htmlBody
        })
      });
      console.log(`[Notification Sent] Alert dispatched for quote ${event.params.quoteId}`);
    } catch (err) {
      console.error("[Notification Error] Failed to send email via dispatcher:", err);
    }
  }
);