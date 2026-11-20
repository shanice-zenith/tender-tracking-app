import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Project, Contact } from '../types';
import { INITIAL_CONTACTS } from '../data/initialContacts';
import { findMatchingContact } from '../utils/ContactMatcher';

export type ExportPhaseGroup = 'Phase 1' | 'Phase 2' | 'Phase 3';

export interface ApprovedPoEntry {
  tradeId: string;
  scopeId: string;
  phaseId: string;
  phaseGroup: ExportPhaseGroup;
  companyName: string;
  contractorName: string;
  phone: string;
  email: string;
  scopeOfWork: string;
  quotedFigure: number;
  status: string;
  poSent: boolean;
  attachedDocs: Array<{ name: string; url: string }>;
  attachedDocsDisplay: string;
  primaryDocUrl?: string;
}

const KNOWN_INDIVIDUAL_NAMES = new Set<string>([
  'isaac malok',
  'tyrell scott',
  "john o'boyle",
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

INITIAL_CONTACTS.forEach((c) => {
  if (c.name && typeof c.name === 'string') {
    KNOWN_INDIVIDUAL_NAMES.add(c.name.trim().toLowerCase());
  }
});

export function getExportPhaseGroup(phaseId: string): ExportPhaseGroup {
  const clean = String(phaseId || '').trim().toUpperCase();
  if (clean.startsWith('2')) return 'Phase 2';
  if (clean.startsWith('3')) return 'Phase 3';
  return 'Phase 1';
}

export function resolveSubtradeBusinessName(
  quoteOrTrade: Record<string, unknown> | null | undefined,
  contacts: Contact[] = []
): string {
  if (!quoteOrTrade || typeof quoteOrTrade !== 'object') {
    return 'Business Name Pending';
  }

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

    if (KNOWN_INDIVIDUAL_NAMES.has(lower)) return false;
    if (excludedPersonValues.has(lower)) return false;

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

  if (isValidBusinessName(quoteOrTrade.companyName)) {
    return (quoteOrTrade.companyName as string).trim();
  }

  const responses = (quoteOrTrade.responses || quoteOrTrade.response) as Record<string, unknown> | undefined;
  if (responses && typeof responses === 'object') {
    for (const key of ['Company Name', 'Company', 'company_name', 'company']) {
      if (isValidBusinessName(responses[key])) {
        return (responses[key] as string).trim();
      }
    }
    for (const [key, val] of Object.entries(responses)) {
      if (/company/i.test(key) && isValidBusinessName(val)) {
        return (val as string).trim();
      }
    }
  }

  const allContacts = [...contacts, ...INITIAL_CONTACTS];
  if (quoteOrTrade.contactId && typeof quoteOrTrade.contactId === 'string') {
    const matchedContact = allContacts.find((c) => c.id === quoteOrTrade.contactId);
    if (matchedContact && isValidBusinessName(matchedContact.company)) {
      return matchedContact.company.trim();
    }
  }

  return 'Business Name Pending';
}

function resolveContractorContactDetails(
  trade: Record<string, unknown>,
  businessName: string,
  contacts: Contact[] = []
): { phone: string; email: string } {
  const allContacts = [...contacts, ...INITIAL_CONTACTS];

  const directPhone = String(trade.contactPhone || trade.phone || '').trim();
  const directEmail = String(trade.contactEmail || trade.email || '').trim();

  const byId =
    typeof trade.contactId === 'string' && trade.contactId
      ? allContacts.find((c) => c.id === trade.contactId)
      : null;

  const byMatch =
    byId ||
    findMatchingContact(
      allContacts,
      businessName !== 'Business Name Pending' ? businessName : String(trade.contractorName || ''),
      directEmail
    );

  return {
    phone: directPhone || byMatch?.phone?.trim() || '—',
    email: directEmail || byMatch?.email?.trim() || '—'
  };
}

/**
 * Filter the current project's quotes to include ONLY entries where a Purchase Order has been issued.
 * Strips cost codes and sub-packages, grouping cleanly into Phase 1, Phase 2, and Phase 3.
 */
export function getApprovedPoEntries(project: Project, contacts: Contact[] = []): ApprovedPoEntry[] {
  const results: ApprovedPoEntry[] = [];
  if (!project || !Array.isArray(project.scopes)) return results;

  project.scopes.forEach((scope) => {
    if (!Array.isArray(scope.trades)) return;

    scope.trades.forEach((trade) => {
      const tradeAny = trade as unknown as Record<string, unknown>;
      const statusStr = String(
        trade.actionStatus ||
        tradeAny.actionItemStatus ||
        tradeAny.status ||
        ''
      );

      const isPoIssued =
        trade.poSent === true ||
        statusStr.toLowerCase().includes('po sent') ||
        statusStr.toLowerCase().includes('po approved');

      if (isPoIssued) {
        // Clean scope title without cost codes or sub-package labels
        const scopeOfWork = (scope.name || 'General Scope')
          .replace(/\s*[-–]\s*(?:cost\s*)?code\s*:?\s*\d+\s*$/i, '')
          .trim();

        // Attached Estimates
        const docs: Array<{ name: string; url: string }> = [];
        if (Array.isArray(trade.attachedDocs)) {
          trade.attachedDocs.forEach((doc) => {
            if (doc && (doc.name || doc.url)) {
              docs.push({
                name: doc.name || 'Estimate_Document.pdf',
                url: doc.url || ''
              });
            }
          });
        }

        if (trade.docUrl && !docs.some((d) => d.url === trade.docUrl)) {
          docs.push({
            name:
              trade.docName ||
              (tradeAny.attachedDoc as string) ||
              trade.docUrl.split('/').pop()?.split('?')[0] ||
              'Approved_Estimate.pdf',
            url: trade.docUrl
          });
        } else if (trade.docName && docs.length === 0) {
          docs.push({ name: trade.docName, url: '' });
        } else if (tradeAny.attachedDoc && docs.length === 0) {
          docs.push({ name: tradeAny.attachedDoc as string, url: '' });
        }

        const businessName = resolveSubtradeBusinessName(tradeAny, contacts);
        const { phone, email } = resolveContractorContactDetails(tradeAny, businessName, contacts);

        results.push({
          tradeId: trade.id,
          scopeId: scope.id,
          phaseId: scope.phaseId,
          phaseGroup: getExportPhaseGroup(scope.phaseId),
          companyName: businessName,
          contractorName: businessName,
          phone,
          email,
          scopeOfWork,
          quotedFigure: trade.quotedFigure || 0,
          status: statusStr || (trade.poSent ? 'PO Sent' : 'PO Approved'),
          poSent: trade.poSent,
          attachedDocs: docs,
          attachedDocsDisplay: docs.length > 0 ? docs.map((d) => d.name).join(', ') : 'No estimate attached',
          primaryDocUrl: docs.length > 0 && docs[0].url ? docs[0].url : undefined
        });
      }
    });
  });

  return results;
}

export function groupApprovedEntriesByPhase(entries: ApprovedPoEntry[]): Array<{
  phaseTitle: ExportPhaseGroup;
  entries: ApprovedPoEntry[];
}> {
  const phases: ExportPhaseGroup[] = ['Phase 1', 'Phase 2', 'Phase 3'];
  return phases.map((phaseTitle) => ({
    phaseTitle,
    entries: entries.filter((item) => item.phaseGroup === phaseTitle)
  }));
}

/**
 * Generate and download a clean PDF report split into Phase 1, Phase 2, and Phase 3.
 * Columns per line item:
 * 1. Scope of Work
 * 2. Contractor / Supplier Name
 * 3. Phone Number
 * 4. Email
 * 5. Attached Estimate
 */
export function exportApprovedPoListPdf(project: Project, contacts: Contact[] = []): void {
  const entries = getApprovedPoEntries(project, contacts);
  const groupedPhases = groupApprovedEntriesByPhase(entries);

  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();

  // Clean Project Title Header (no logo, client, internal report label, export date, or project code)
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.text(`${project.name} — Approved Purchase Orders & Scopes`, 14, 16);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105);
  const subtitleParts: string[] = [];
  if (project.location) subtitleParts.push(`Location: ${project.location}`);
  subtitleParts.push(`Approved POs: ${entries.length}`);
  doc.text(subtitleParts.join('   |   '), 14, 22);

  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.4);
  doc.line(14, 26, pageWidth - 14, 26);

  let currentY = 32;

  groupedPhases.forEach(({ phaseTitle, entries: phaseEntries }) => {
    if (currentY > doc.internal.pageSize.getHeight() - 35) {
      doc.addPage();
      currentY = 16;
    }

    // Phase Section Header (Phase 1 / Phase 2 / Phase 3)
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text(`${phaseTitle} (${phaseEntries.length})`, 14, currentY);
    currentY += 3;

    const tableRows =
      phaseEntries.length > 0
        ? phaseEntries.map((item) => [
          item.scopeOfWork,
          item.companyName,
          item.phone,
          item.email,
          item.attachedDocsDisplay
        ])
        : [['No approved purchase orders in this phase', '—', '—', '—', '—']];

    autoTable(doc, {
      startY: currentY,
      head: [['Scope of Work', 'Contractor / Supplier Name', 'Phone Number', 'Email', 'Attached Estimate']],
      body: tableRows,
      theme: 'grid',
      headStyles: {
        fillColor: [15, 23, 42],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 8.5,
        cellPadding: 3
      },
      styles: {
        font: 'helvetica',
        fontSize: 8,
        textColor: [30, 41, 59],
        cellPadding: 3,
        lineColor: [226, 232, 240],
        lineWidth: 0.2,
        valign: 'middle'
      },
      columnStyles: {
        0: { cellWidth: 62, fontStyle: 'bold' },
        1: { cellWidth: 56, fontStyle: 'bold' },
        2: { cellWidth: 34 },
        3: { cellWidth: 56 },
        4: { cellWidth: 'auto', textColor: [37, 99, 235] }
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252]
      },
      didDrawCell: (data) => {
        if (data.section === 'body' && data.column.index === 4 && phaseEntries.length > 0) {
          const entry = phaseEntries[data.row.index];
          if (entry && entry.primaryDocUrl) {
            doc.link(data.cell.x, data.cell.y, data.cell.width, data.cell.height, {
              url: entry.primaryDocUrl
            });
          }
        }
      },
      margin: { left: 14, right: 14 }
    });

    const finalY = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY;
    currentY = (finalY || currentY + 20) + 9;
  });

  // Clean Page Footer
  const pageCount = (doc as unknown as { internal: { getNumberOfPages: () => number } }).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(148, 163, 184);
    doc.text(`${project.name}  •  Approved Purchase Orders`, 14, doc.internal.pageSize.getHeight() - 8);
    doc.text(`Page ${i} of ${pageCount}`, pageWidth - 29, doc.internal.pageSize.getHeight() - 8);
  }

  const cleanName = (project.name || 'Project').replace(/[^a-zA-Z0-9_-]/g, '_');
  doc.save(`${cleanName}_Approved_PO_List.pdf`);
}