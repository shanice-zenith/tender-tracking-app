import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Project } from '../types';
import { INITIAL_CONTACTS } from '../data/initialContacts';

export interface ApprovedPoEntry {
  tradeId: string;
  scopeId: string;
  phaseId: string;
  companyName: string;
  contractorName: string; // Kept for backwards compatibility
  scopeOfWork: string;
  costCode?: string;
  quotedFigure: number;
  status: string;
  poSent: boolean;
  attachedDocs: Array<{ name: string; url: string }>;
  attachedDocsDisplay: string;
  primaryDocUrl?: string;
}

// Known individual person contact names to strictly exclude from Company Name column
const KNOWN_INDIVIDUAL_NAMES = new Set<string>([
  'isaac malok',
  'tyrell scott',
  'john o\'boyle',
  'anmolpreet singh',
  'dave',
  'joanne slack',
  'ferlin kang',
  'khaing khaing oo',
  'adam dahl',
  'mitch mcdonald',
  'shanice',
  'john doe',
  'jane doe'
]);

// Dynamically register all individual person names from INITIAL_CONTACTS
INITIAL_CONTACTS.forEach((c) => {
  if (c.name && typeof c.name === 'string') {
    KNOWN_INDIVIDUAL_NAMES.add(c.name.trim().toLowerCase());
  }
});

/**
 * Strict Subtrade Business Name Field Resolution:
 * Priority Order:
 *  1. quote.companyName (or trade.companyName)
 *  2. quote.responses['Company Name'] or quote.responses['Company']
 *  3. Search quote.responses keys for any key containing "Company" (case-insensitive)
 *
 * Explicitly EXCLUDE individual person fields:
 *  - Do NOT display quote.contactName, quote.submittedBy, or individual person names (e.g. "Isaac Malok", "Tyrell Scott").
 *  - If no company name is found, fall back to "Business Name Pending" rather than showing a contact person's name.
 */
export function resolveSubtradeBusinessName(quoteOrTrade: Record<string, unknown> | null | undefined): string {
  if (!quoteOrTrade || typeof quoteOrTrade !== 'object') {
    return 'Business Name Pending';
  }

  // Gather individual person fields from this record to strictly exclude
  const excludedPersonValues = new Set<string>();
  const addExclusion = (val: unknown) => {
    if (typeof val === 'string' && val.trim()) {
      excludedPersonValues.add(val.trim().toLowerCase());
    }
  };

  addExclusion(quoteOrTrade.contactName);
  addExclusion(quoteOrTrade.submittedBy);
  addExclusion(quoteOrTrade.contactPerson);
  addExclusion(quoteOrTrade.author);
  addExclusion(quoteOrTrade.contact);

  const isValidBusinessName = (val: unknown): val is string => {
    if (typeof val !== 'string') return false;
    const trimmed = val.trim();
    if (!trimmed) return false;
    const lower = trimmed.toLowerCase();

    // Explicitly reject known contact persons and individual person fields
    if (KNOWN_INDIVIDUAL_NAMES.has(lower)) return false;
    if (excludedPersonValues.has(lower)) return false;

    // Reject generic placeholders
    if (
      lower === 'unassigned subtrade' ||
      lower === 'unnamed contractor' ||
      lower === 'n/a' ||
      lower === 'none' ||
      lower === 'tbd' ||
      lower === 'pending'
    ) {
      return false;
    }
    return true;
  };

  // 1. Check quote.companyName
  if (isValidBusinessName(quoteOrTrade.companyName)) {
    return (quoteOrTrade.companyName as string).trim();
  }

  // Responses object from form submissions / webhooks
  const responses = (quoteOrTrade.responses || quoteOrTrade.response) as Record<string, unknown> | undefined;

  if (responses && typeof responses === 'object') {
    // 2. quote.responses['Company Name'] or quote.responses['Company']
    if (isValidBusinessName(responses['Company Name'])) {
      return (responses['Company Name'] as string).trim();
    }
    if (isValidBusinessName(responses['Company'])) {
      return (responses['Company'] as string).trim();
    }
    if (isValidBusinessName(responses['company_name'])) {
      return (responses['company_name'] as string).trim();
    }
    if (isValidBusinessName(responses['company'])) {
      return (responses['company'] as string).trim();
    }

    // 3. Search quote.responses keys for any key containing "Company" (case-insensitive)
    for (const [key, val] of Object.entries(responses)) {
      if (/company/i.test(key) && isValidBusinessName(val)) {
        return (val as string).trim();
      }
    }
  }

  // Supplementary: Check if trade.contactId links to a contact record with a valid company
  if (quoteOrTrade.contactId && typeof quoteOrTrade.contactId === 'string') {
    const matchedContact = INITIAL_CONTACTS.find((c) => c.id === quoteOrTrade.contactId);
    if (matchedContact && isValidBusinessName(matchedContact.company)) {
      return matchedContact.company.trim();
    }
  }

  // Fallback: If no company name is found, fall back to "Business Name Pending"
  return 'Business Name Pending';
}

/**
 * Filter the current project's quotes to include ONLY entries where a Purchase Order has been issued
 * (poSent === true or status contains "PO Sent" / "PO Approved").
 */
export function getApprovedPoEntries(project: Project): ApprovedPoEntry[] {
  const results: ApprovedPoEntry[] = [];
  if (!project || !Array.isArray(project.scopes)) return results;

  project.scopes.forEach((scope) => {
    if (!Array.isArray(scope.trades)) return;

    scope.trades.forEach((trade) => {
      const statusStr = String(
        trade.actionStatus ||
        (trade as unknown as Record<string, unknown>).actionItemStatus ||
        (trade as unknown as Record<string, unknown>).status ||
        ''
      );

      const isPoIssued =
        trade.poSent === true ||
        statusStr.toLowerCase().includes('po sent') ||
        statusStr.toLowerCase().includes('po approved');

      if (isPoIssued) {
        // Format Scope of Work: e.g. "Demolition - Code 20020" or "Demolition"
        const rawCostCode = scope.costCode || trade.costCode || '';
        const cleanCode = rawCostCode
          ? rawCostCode.replace(/^(cost\s*code|code)\s*:?\s*/i, '').trim()
          : '';
        const scopeTitle = scope.name || 'General Scope';
        const scopeOfWork = cleanCode
          ? `${scopeTitle} - Code ${cleanCode}`
          : scopeTitle;

        // Attached Documents
        const docs: Array<{ name: string; url: string }> = [];

        if (Array.isArray(trade.attachedDocs)) {
          trade.attachedDocs.forEach((doc) => {
            if (doc && (doc.name || doc.url)) {
              docs.push({
                name: doc.name || 'Quote_Document.pdf',
                url: doc.url || ''
              });
            }
          });
        }

        const tradeAny = trade as unknown as Record<string, unknown>;
        if (trade.docUrl && !docs.some((d) => d.url === trade.docUrl)) {
          docs.push({
            name: trade.docName || (tradeAny.attachedDoc as string) || trade.docUrl.split('/').pop()?.split('?')[0] || 'Approved_PO_Quote.pdf',
            url: trade.docUrl
          });
        } else if (trade.docName && docs.length === 0) {
          docs.push({
            name: trade.docName,
            url: ''
          });
        } else if (tradeAny.attachedDoc && docs.length === 0) {
          docs.push({
            name: tradeAny.attachedDoc as string,
            url: ''
          });
        }

        // Strictly resolve Subtrade Business Name (excluding contact persons)
        const businessName = resolveSubtradeBusinessName(tradeAny);

        results.push({
          tradeId: trade.id,
          scopeId: scope.id,
          phaseId: scope.phaseId,
          companyName: businessName,
          contractorName: businessName, // Sync for backwards compatibility
          scopeOfWork: scopeOfWork,
          costCode: cleanCode,
          quotedFigure: trade.quotedFigure || 0,
          status: statusStr || (trade.poSent ? 'PO Sent' : 'PO Approved'),
          poSent: trade.poSent,
          attachedDocs: docs,
          attachedDocsDisplay: docs.length > 0 ? docs.map((d) => d.name).join(', ') : 'No document attached',
          primaryDocUrl: docs.length > 0 && docs[0].url ? docs[0].url : undefined
        });
      }
    });
  });

  return results;
}

/**
 * Draw the official Zenith Group Header Logo onto the jsPDF document.
 * Matches ZenithLogoArtboard 1@4x.png:
 * Bold Roman serif wordmark "Z E N I T H" with tracked "G R O U P" underneath.
 */
function drawZenithGroupLogo(doc: jsPDF, originX: number, originY: number): void {
  // Wordmark: Z E N I T H (Classical bold serif)
  doc.setTextColor(10, 10, 10);
  doc.setFont('times', 'bold');
  doc.setFontSize(24);
  doc.text('Z E N I T H', originX, originY + 8);

  // Subtitle: G R O U P (Clean architectural wide-tracked sans-serif)
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(23, 23, 23);
  doc.text('G   R   O   U   P', originX + 11.5, originY + 14.5);
}

/**
 * Generate and download a PDF report containing the approved PO list.
 * Formats strictly into 3 columns:
 * 1. Company Name (Subtrade Business Name)
 * 2. Scope of Work (Scope title and cost code)
 * 3. Attached Documents (Direct link or filename)
 */
export function exportApprovedPoListPdf(project: Project): void {
  const entries = getApprovedPoEntries(project);
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const today = new Date().toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });

  // Top Page Header: Official Zenith Group Logo
  drawZenithGroupLogo(doc, 14, 12);

  // Header Right Metadata: Date & Confidential internal tag
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139); // slate-500
  doc.text('ESTIMATING & PROCUREMENT • INTERNAL REPORT', pageWidth - 14, 14, { align: 'right' });
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(30, 41, 59); // slate-800
  doc.text(`EXPORT DATE: ${today.toUpperCase()}`, pageWidth - 14, 19, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text(`PROJECT: ${project.code || 'PRJ'}`, pageWidth - 14, 23.5, { align: 'right' });

  // Elegant divider line below brand header
  doc.setDrawColor(226, 232, 240); // slate-200
  doc.setLineWidth(0.4);
  doc.line(14, 30, pageWidth - 14, 30);

  // Document Title Section
  doc.setTextColor(15, 23, 42); // slate-900
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  const title = `${project.name} — Approved Purchase Orders & Scopes`;
  doc.text(title, 14, 39);

  // Subtitle / Scope details
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105); // slate-600
  doc.text(
    `Client: ${project.client || 'Zenith Developments'}   |   Location: ${project.location || 'Active Site'}   |   Approved POs: ${entries.length}`,
    14,
    45
  );

  // Strictly 3 Columns:
  // Column 1: Company Name -> Subtrade Business Name (e.g. "Solai Contracting", "Precision Underground Services")
  // Column 2: Scope of Work -> Scope title and cost code (e.g. "Demolition - Code 20020")
  // Column 3: Attached Documents -> Document filename / links (e.g. "2026_06_16_Solai_Quote.pdf")
  const tableRows = entries.map((item) => {
    return [
      item.companyName,
      item.scopeOfWork,
      item.attachedDocsDisplay
    ];
  });

  if (tableRows.length === 0) {
    tableRows.push([
      'No approved Purchase Orders found',
      'Ensure quotes have poSent=true or status "PO Sent / PO Approved"',
      '—'
    ]);
  }

  // Draw Strictly 3-Column Table
  autoTable(doc, {
    startY: 50,
    head: [['Company Name', 'Scope of Work', 'Attached Documents']],
    body: tableRows,
    theme: 'grid',
    headStyles: {
      fillColor: [15, 23, 42], // slate-900
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 9,
      cellPadding: 3.5
    },
    styles: {
      font: 'helvetica',
      fontSize: 8.5,
      textColor: [30, 41, 59],
      cellPadding: 3.5,
      lineColor: [226, 232, 240],
      lineWidth: 0.2,
      valign: 'middle'
    },
    columnStyles: {
      0: { cellWidth: 55, fontStyle: 'bold' }, // Column 1: Company Name
      1: { cellWidth: 68 },                   // Column 2: Scope of Work
      2: { cellWidth: 'auto', textColor: [37, 99, 235] } // Column 3: Attached Documents
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252] // slate-50
    },
    didDrawCell: (data) => {
      // Add direct clickable PDF link if document URL is present
      if (data.section === 'body' && data.column.index === 2) {
        const rowIndex = data.row.index;
        const entry = entries[rowIndex];
        if (entry && entry.primaryDocUrl) {
          doc.link(data.cell.x, data.cell.y, data.cell.width, data.cell.height, {
            url: entry.primaryDocUrl
          });
        }
      }
    },
    margin: { left: 14, right: 14 }
  });

  // Footer on all pages
  const pageCount = (doc as unknown as { internal: { getNumberOfPages: () => number } }).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(148, 163, 184);
    doc.text(
      `The Zenith Group  •  ${project.name}  •  Approved Purchase Orders Report`,
      14,
      doc.internal.pageSize.getHeight() - 8
    );
    doc.text(
      `Page ${i} of ${pageCount}`,
      pageWidth - 14 - 15,
      doc.internal.pageSize.getHeight() - 8
    );
  }

  // Sanitize filename and save
  const cleanCode = (project.code || project.name || 'Project').replace(/[^a-zA-Z0-9_-]/g, '_');
  const dateStr = new Date().toISOString().split('T')[0];
  doc.save(`${cleanCode}_Approved_PO_List_${dateStr}.pdf`);
}
