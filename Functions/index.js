const { onDocumentWritten } = require("firebase-functions/v2/firestore");
const { onSchedule } = require("firebase-functions/v2/scheduler");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");

initializeApp();

const DATABASE_ID = "ai-studio-tendertrackingap-9f434cfb-0357-4e18-b5cb-149e70c03d8a";
const db = getFirestore(DATABASE_ID);

// Zenith Google Workspace Email Dispatcher Webhook
const APPS_SCRIPT_DISPATCHER =
  "https://script.google.com/a/macros/thezenithgroup.ca/s/AKfycby8WGdj9nbiZ7gILzjXL6FjjJJMbcPMR4OHB9S4oNk42VRfQXSYEBhxpTZ1zp37vjjx/exec";

// Recipients list
const RECIPIENT_EMAILS = "info@thezenithgroup.ca";

exports.onQuoteSubmitted = onDocumentWritten(
  {
    document: "quotes/{quoteId}",
    database: DATABASE_ID,
    region: "us-west1"
  },
  async (event) => {
    if (!event.data.after.exists) return;

    const beforeData = event.data.before.exists ? event.data.before.data() : null;
    const quote = event.data.after.data();

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

// Automated 1-minute scheduler for queued tender invitations and follow-up reminders
exports.processScheduledEmails = onSchedule(
  {
    schedule: "every 1 minutes",
    region: "us-west1",
    timeZone: "America/Edmonton"
  },
  async () => {
    const nowMs = Date.now();
    const nowIso = new Date(nowMs).toISOString();
    const snapshot = await db
      .collection("scheduled_emails")
      .where("status", "==", "pending")
      .get();

    if (snapshot.empty) return;

    for (const docSnap of snapshot.docs) {
      const job = docSnap.data();
      const scheduledMs = Date.parse(job.scheduledTime || "");
      if (isNaN(scheduledMs) || scheduledMs > nowMs) continue;

      // Atomically claim the job so neither another run nor an open browser can double-send
      const claimed = await db.runTransaction(async (tx) => {
        const fresh = await tx.get(docSnap.ref);
        if (!fresh.exists || fresh.data().status !== "pending") return false;
        tx.update(docSnap.ref, { status: "dispatching", updatedAt: nowIso });
        return true;
      });
      if (!claimed) continue;

      try {
        const rawEmails = Array.isArray(job.recipientEmails) ? job.recipientEmails : [];
        const cleanedBcc = Array.from(
          new Set(
            rawEmails
              .map((e) => String(e || "").trim())
              .filter((e) => e.includes("@") && e.toLowerCase() !== "info@thezenithgroup.ca")
          )
        );

        if (cleanedBcc.length === 0) {
          await docSnap.ref.update({
            status: "cancelled",
            errorMessage: "No valid contractor email addresses stored on scheduled job.",
            updatedAt: new Date().toISOString()
          });
          continue;
        }

        const subject =
          job.subject ||
          (job.type === "reminder"
            ? `Tender Follow-up: ${job.projectName || "Project"} - ${job.scopeName || "Scope"} Estimate Reminder`
            : `Estimate Request: ${job.projectName || "Project"} - ${job.scopeName || "Scope"}`);

        const htmlBody =
          job.generatedHtml ||
          `<p>Hello,</p><p>Please review the tender package for <strong>${job.projectName || "Project"} — ${job.scopeName || "Scope"}</strong> (Deadline: ${job.tenderDeadline || "TBD"}).</p><p><a href="${job.driveLink || "#"}">View Plans &amp; Specifications</a> | <a href="${job.formLink || "#"}">Submit Estimate</a></p>`;

        const ccString = Array.isArray(job.ccEmails)
          ? job.ccEmails.filter(Boolean).join(", ")
          : String(job.ccEmails || "").trim();

        const response = await fetch(APPS_SCRIPT_DISPATCHER, {
          method: "POST",
          headers: { "Content-Type": "text/plain;charset=utf-8" },
          body: JSON.stringify({
            to: "info@thezenithgroup.ca",
            subject,
            htmlBody,
            cc: ccString,
            bcc: cleanedBcc,
            bccArray: cleanedBcc
          })
        });

        const respText = await response.text();
        let parsed = {};
        try {
          parsed = JSON.parse(respText);
        } catch (_) { }

        const isSuccess =
          response.ok &&
          (parsed.status === "success" ||
            parsed.result === "success" ||
            parsed.status === "ok" ||
            parsed.success === true ||
            !parsed.error);

        if (!isSuccess) {
          throw new Error(parsed.message || parsed.error || respText || `HTTP ${response.status}`);
        }

        const dispatchedAt = new Date().toISOString();
        await docSnap.ref.update({
          status: "dispatched",
          dispatchedAt,
          updatedAt: dispatchedAt
        });

        // Update the scope pill on the project document so the UI badge clears automatically
        if (job.projectId && job.scopeId) {
          const projRef = db.collection("projects").doc(job.projectId);
          const projSnap = await projRef.get();
          if (projSnap.exists) {
            const projData = projSnap.data();
            const updatedScopes = (projData.scopes || []).map((s) => {
              if (s.id !== job.scopeId) return s;
              if (job.type === "reminder") {
                return {
                  ...s,
                  scheduledReminder: { ...(s.scheduledReminder || job), status: "dispatched", dispatchedAt }
                };
              }
              return {
                ...s,
                scheduledInvite: { ...(s.scheduledInvite || job), status: "dispatched", dispatchedAt }
              };
            });
            await projRef.update({ scopes: updatedScopes, updatedAt: dispatchedAt });
          }
        }

        console.log(`[Scheduled Dispatch] Sent ${job.type} job ${docSnap.id} to ${cleanedBcc.length} BCC recipients.`);
      } catch (err) {
        console.error(`[Scheduled Dispatch Error] Job ${docSnap.id}:`, err);
        await docSnap.ref.update({
          status: "pending",
          lastError: String(err.message || err),
          updatedAt: new Date().toISOString()
        });
      }
    }
  }
);