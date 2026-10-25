import { Project, ScopeLineItem, TradeEntry, Contact, PhaseId, ActionItemStatus, QuoteBreakdownItem } from '../types';
import { MASTER_SCOPE_TEMPLATES } from '../data/projectTemplates';
import { sheetsSyncService } from './sheetsSyncService';
import { getTenderTemplateSpecs } from '../data/tenderBreakdownTemplates';

export interface ProjectImportRow {
  id: string;
  projectName: string;
  projectCode: string;
  location: string;
  phase1aBudget: string;
  phase1bBudget: string;
  phase2aBudget: string;
  phase2bBudget: string;
  phase3Budget: string;
  errors: Record<string, string>;
}

export interface ScopePackageImportRow {
  id: string;
  projectName: string;
  phaseName: string;
  scopeName: string;
  costCode: string;
  lineItemDescription: string;
  targetBudget: string;
  errors: Record<string, string>;
}

export interface PhaseQuoteImportRow {
  id: string;
  projectName: string;
  phaseName: string;
  scopeName: string;
  costCode: string;
  lineItemDescription: string;
  contractorName: string;
  companyName: string;
  contactEmail: string;
  quotedAmount: string;
  inclusionStatus: string;
  notes: string;
  quoteLink: string;
  actionStatus: string;
  errors: Record<string, string>;
}

export type ImportType = 'projects' | 'scopes' | 'quotes';

const VALID_PHASES: PhaseId[] = ['1A', '1B', '2A', '2B', '3'];

const VALID_ACTION_STATUSES: ActionItemStatus[] = [
  'Estimate Requested',
  'Estimate Submitted',
  'Waiting on Response',
  'Follow-up Pending',
  'Request Revised Estimate',
  'Revision Submitted',
  'Confirm w/ ID',
  'Confirm with PM',
  'PO Approved'
];

export const bulkImportExportService = {
  // ================= CSV Download Helper =================
  downloadCsv(filename: string, csvContent: string) {
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  },

  // ================= 1. Bulk Project Setup Templates & Parsing =================
  generateProjectsTemplate(includeSamples = true): string {
    const headers = [
      'Project Name',
      'Project Code',
      'Location',
      'Phase 1A Budget',
      'Phase 1B Budget',
      'Phase 2A Budget',
      'Phase 2B Budget',
      'Phase 3 Budget'
    ];

    const sampleRows = includeSamples
      ? [
          [
            '"Bridgeland Urban Residences & Townhomes"',
            '"PRJ-2026-003"',
            '"850 1st Ave NE, Calgary, AB"',
            '"480000"',
            '"350000"',
            '"650000"',
            '"520000"',
            '"280000"'
          ],
          [
            '"Marda Loop Mixed-Use Commercial Complex"',
            '"PRJ-2026-004"',
            '"2034 33rd Ave SW, Calgary, AB"',
            '"520000"',
            '"410000"',
            '"740000"',
            '"580000"',
            '"310000"'
          ]
        ]
      : [];

    return [headers.join(','), ...sampleRows.map((r) => r.join(','))].join('\n');
  },

  parseProjectsCsv(rawText: string | unknown): ProjectImportRow[] {
    if (!rawText || typeof rawText !== 'string' || !rawText.trim()) return [];

    const lines = rawText
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    if (lines.length <= 1) return [];

    const delimiter = lines[0].includes('\t') ? '\t' : ',';
    const headers = sheetsSyncService.parseCsvLine(lines[0], delimiter).map((h) =>
      h.toLowerCase().replace(/['"]/g, '').trim()
    );

    const nameIdx = headers.findIndex((h) => h.includes('project name') || h === 'name' || h === 'project');
    const codeIdx = headers.findIndex((h) => h.includes('code') || h.includes('number') || h.includes('id'));
    const locIdx = headers.findIndex((h) => h.includes('location') || h.includes('address') || h.includes('site'));
    const p1aIdx = headers.findIndex((h) => h.includes('1a') || (h.includes('phase 1') && !h.includes('1b')));
    const p1bIdx = headers.findIndex((h) => h.includes('1b'));
    const p2aIdx = headers.findIndex((h) => h.includes('2a') || (h.includes('phase 2') && !h.includes('2b')));
    const p2bIdx = headers.findIndex((h) => h.includes('2b'));
    const p3Idx = headers.findIndex((h) => h.includes('3') || h.includes('phase 3'));

    const rows: ProjectImportRow[] = [];

    for (let i = 1; i < lines.length; i++) {
      const cols = sheetsSyncService.parseCsvLine(lines[i], delimiter);
      if (cols.length === 0 || cols.every((c) => !c)) continue;

      const projectName = (nameIdx >= 0 ? cols[nameIdx] : cols[0] || '').replace(/['"]/g, '').trim();
      const projectCode = (codeIdx >= 0 ? cols[codeIdx] : cols[1] || '').replace(/['"]/g, '').trim();
      const location = (locIdx >= 0 ? cols[locIdx] : cols[2] || '').replace(/['"]/g, '').trim();
      const phase1aBudget = (p1aIdx >= 0 ? cols[p1aIdx] : cols[3] || '0').replace(/['"$,]/g, '').trim();
      const phase1bBudget = (p1bIdx >= 0 ? cols[p1bIdx] : cols[4] || '0').replace(/['"$,]/g, '').trim();
      const phase2aBudget = (p2aIdx >= 0 ? cols[p2aIdx] : cols[5] || '0').replace(/['"$,]/g, '').trim();
      const phase2bBudget = (p2bIdx >= 0 ? cols[p2bIdx] : cols[6] || '0').replace(/['"$,]/g, '').trim();
      const phase3Budget = (p3Idx >= 0 ? cols[p3Idx] : cols[7] || '0').replace(/['"$,]/g, '').trim();

      const row: ProjectImportRow = {
        id: `import-prj-${Date.now()}-${i}`,
        projectName,
        projectCode,
        location,
        phase1aBudget,
        phase1bBudget,
        phase2aBudget,
        phase2bBudget,
        phase3Budget,
        errors: {}
      };

      this.validateProjectRow(row);
      rows.push(row);
    }

    return rows;
  },

  validateProjectRow(row: ProjectImportRow) {
    row.errors = {};
    if (!row.projectName.trim()) {
      row.errors.projectName = 'Project Name is required';
    }

    const budgets = [
      { key: 'phase1aBudget', val: row.phase1aBudget, name: 'Phase 1A' },
      { key: 'phase1bBudget', val: row.phase1bBudget, name: 'Phase 1B' },
      { key: 'phase2aBudget', val: row.phase2aBudget, name: 'Phase 2A' },
      { key: 'phase2bBudget', val: row.phase2bBudget, name: 'Phase 2B' },
      { key: 'phase3Budget', val: row.phase3Budget, name: 'Phase 3' }
    ];

    budgets.forEach((b) => {
      const num = parseFloat(b.val);
      if (b.val.trim() !== '' && (isNaN(num) || num < 0)) {
        row.errors[b.key] = `${b.name} Budget must be a positive number`;
      }
    });
  },

  applyBulkProjects(rows: ProjectImportRow[], existingProjects: Project[]): Project[] {
    const now = new Date().toISOString();
    const createdProjects: Project[] = [];

    rows.forEach((row, idx) => {
      const p1a = parseFloat(row.phase1aBudget) || 0;
      const p1b = parseFloat(row.phase1bBudget) || 0;
      const p2a = parseFloat(row.phase2aBudget) || 0;
      const p2b = parseFloat(row.phase2bBudget) || 0;
      const p3 = parseFloat(row.phase3Budget) || 0;
      const totalBudget = p1a + p1b + p2a + p2b + p3;

      const phaseBudgets: Record<PhaseId, number> = {
        '1A': p1a,
        '1B': p1b,
        '2A': p2a,
        '2B': p2b,
        '3': p3
      };

      // Generate 5-phase scopes using MASTER_SCOPE_TEMPLATES and allocate phase budget proportionally
      const scopes: ScopeLineItem[] = [];
      VALID_PHASES.forEach((phaseId) => {
        const templatesInPhase = MASTER_SCOPE_TEMPLATES.filter((t) => t.phaseId === phaseId);
        const allocatedPhaseBudget = phaseBudgets[phaseId];
        const defaultTotalPhaseBudget = templatesInPhase.reduce((sum, t) => sum + t.defaultBudget, 0);

        templatesInPhase.forEach((tmpl, sIdx) => {
          let itemBudget = tmpl.defaultBudget;
          if (allocatedPhaseBudget > 0 && defaultTotalPhaseBudget > 0) {
            // Scale proportionally to meet user's phase baseline budget
            itemBudget = Math.round((tmpl.defaultBudget / defaultTotalPhaseBudget) * allocatedPhaseBudget);
          } else if (allocatedPhaseBudget > 0) {
            itemBudget = Math.round(allocatedPhaseBudget / templatesInPhase.length);
          }

          scopes.push({
            id: `scope-${phaseId.toLowerCase()}-${sIdx + 1}-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
            phaseId,
            name: tmpl.name,
            description: tmpl.description,
            budgetAmount: itemBudget,
            trades: [],
            isRequired: tmpl.isRequired,
            order: sIdx + 1,
            createdAt: now
          });
        });
      });

      const newProjId = `prj-${Date.now()}-${idx + 1}`;
      const code = row.projectCode.trim() || `PRJ-2026-${String(existingProjects.length + idx + 1).padStart(3, '0')}`;

      createdProjects.push({
        id: newProjId,
        name: row.projectName.trim(),
        code,
        client: 'The Zenith Group Developments',
        location: row.location.trim() || 'Calgary, AB',
        description: `Imported multi-phase procurement workspace with baseline budgets across 5 phases.`,
        targetBudget: totalBudget > 0 ? totalBudget : scopes.reduce((sum, s) => sum + s.budgetAmount, 0),
        status: 'Planning',
        createdAt: now,
        updatedAt: now,
        scopes,
        driveLink: '',
        sheetsConfig: {
          sheetUrl: '',
          sheetName: `${row.projectName.trim()} Tender Feed`,
          autoSyncIntervalMinutes: 0,
          isEnabled: false,
          autoSyncEnabled: false
        }
      });
    });

    return [...createdProjects, ...existingProjects];
  },

  // ================= 2. Scope Packages & Tender Line Item Setup =================
  generateScopePackagesTemplate(project: Project): string {
    const headers = [
      'Project Name',
      'Phase Name (1A-3)',
      'Scope Name',
      'Cost Code',
      'Line Item Description',
      'Target Budget'
    ];

    // If project has existing scopes, provide a rich starter template
    let rows: string[][] = [];
    if (project.scopes.length > 0) {
      rows = project.scopes.slice(0, 10).map((s) => [
        `"${project.name}"`,
        `"${s.phaseId}"`,
        `"${s.name}"`,
        `"${s.costCode || '200' + s.phaseId}"`,
        `"${(s.description || s.name).replace(/"/g, '""')}"`,
        `"${s.budgetAmount}"`
      ]);
    } else {
      rows = [
        [`"${project.name}"`, '"1A"', '"Demolition"', '"20020"', '"Total for Demolition (excl. GST)"', '"48000"'],
        [`"${project.name}"`, '"1A"', '"Excavation, Other Earthworks & DSSP Install"', '"20040"', '"Total for Excavation, Backfill & Rough Grading"', '"55000"'],
        [`"${project.name}"`, '"1B"', '"Framing Labor"', '"20320"', '"Complete Framing Labor Package"', '"85000"'],
        [`"${project.name}"`, '"2A"', '"Plumbing Rough-In"', '"20500"', '"Complete Plumbing Rough-In & DWV"', '"95000"'],
        [`"${project.name}"`, '"2B"', '"Finishing Carpentry"', '"20820"', '"Doors, Casings, Baseboards & Hardware install"', '"62000"'],
        [`"${project.name}"`, '"3"', '"Exterior Flatwork"', '"21020"', '"Sidewalks, Concrete Aprons & Curbs"', '"38000"']
      ];
    }

    return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  },

  parseScopePackagesCsv(rawText: string | unknown, defaultProjectName: string): ScopePackageImportRow[] {
    if (!rawText || typeof rawText !== 'string' || !rawText.trim()) return [];

    const lines = rawText
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    if (lines.length <= 1) return [];

    const delimiter = lines[0].includes('\t') ? '\t' : ',';
    const headers = sheetsSyncService.parseCsvLine(lines[0], delimiter).map((h) =>
      h.toLowerCase().replace(/['"]/g, '').trim()
    );

    const projectIdx = headers.findIndex((h) => h.includes('project'));
    const phaseIdx = headers.findIndex((h) => h.includes('phase'));
    const scopeIdx = headers.findIndex((h) => h.includes('scope'));
    const costCodeIdx = headers.findIndex((h) => h.includes('code'));
    const descIdx = headers.findIndex((h) => h.includes('description') || h.includes('line item') || h.includes('item'));
    const budgetIdx = headers.findIndex((h) => h.includes('budget') || h.includes('amount') || h.includes('target'));

    const rows: ScopePackageImportRow[] = [];

    for (let i = 1; i < lines.length; i++) {
      const cols = sheetsSyncService.parseCsvLine(lines[i], delimiter);
      if (cols.length === 0 || cols.every((c) => !c)) continue;

      const projectName = (projectIdx >= 0 ? cols[projectIdx] : defaultProjectName).replace(/['"]/g, '').trim() || defaultProjectName;
      let phaseName = (phaseIdx >= 0 ? cols[phaseIdx] : cols[1] || '1A').replace(/['"]/g, '').trim().toUpperCase();
      // Normalize phase name like 'Phase 1A' -> '1A'
      phaseName = phaseName.replace(/PHASE\s*/i, '').trim();

      const scopeName = (scopeIdx >= 0 ? cols[scopeIdx] : cols[2] || '').replace(/['"]/g, '').trim();
      const costCode = (costCodeIdx >= 0 ? cols[costCodeIdx] : cols[3] || '').replace(/['"]/g, '').trim();
      const lineItemDescription = (descIdx >= 0 ? cols[descIdx] : cols[4] || scopeName).replace(/['"]/g, '').trim() || scopeName;
      const targetBudget = (budgetIdx >= 0 ? cols[budgetIdx] : cols[5] || '0').replace(/['"$,]/g, '').trim();

      const row: ScopePackageImportRow = {
        id: `import-scope-${Date.now()}-${i}`,
        projectName,
        phaseName,
        scopeName,
        costCode,
        lineItemDescription,
        targetBudget,
        errors: {}
      };

      this.validateScopePackageRow(row);
      rows.push(row);
    }

    return rows;
  },

  validateScopePackageRow(row: ScopePackageImportRow) {
    row.errors = {};
    if (!row.scopeName.trim()) {
      row.errors.scopeName = 'Scope Name is required';
    }

    const normPhase = row.phaseName.replace(/PHASE\s*/i, '').trim().toUpperCase();
    if (!VALID_PHASES.includes(normPhase as PhaseId)) {
      row.errors.phaseName = `Phase must be one of: 1A, 1B, 2A, 2B, 3 (got "${row.phaseName}")`;
    }

    const num = parseFloat(row.targetBudget);
    if (row.targetBudget.trim() !== '' && (isNaN(num) || num < 0)) {
      row.errors.targetBudget = 'Target Budget must be a valid non-negative number';
    }
  },

  applyBulkScopes(
    rows: ScopePackageImportRow[],
    activeProject: Project,
    allProjects: Project[]
  ): Project[] {
    const updatedScopes: ScopeLineItem[] = [...activeProject.scopes];
    const now = new Date().toISOString();

    rows.forEach((row) => {
      const phaseId = (row.phaseName.replace(/PHASE\s*/i, '').trim().toUpperCase() as PhaseId) || '1A';
      const budgetAmount = parseFloat(row.targetBudget) || 0;
      const trimmedScopeName = row.scopeName.trim();

      // Check if scope already exists in this phase
      const existingScope = updatedScopes.find(
        (s) => s.phaseId === phaseId && s.name.toLowerCase() === trimmedScopeName.toLowerCase()
      );

      const breakdownItem: QuoteBreakdownItem = {
        id: `item-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        costCode: row.costCode.trim() || undefined,
        itemDescription: row.lineItemDescription.trim() || trimmedScopeName,
        amount: budgetAmount,
        inclusionStatus: 'included'
      };

      if (existingScope) {
        // Update existing scope
        if (row.costCode.trim() && !existingScope.costCode) {
          existingScope.costCode = row.costCode.trim();
        }
        if (budgetAmount > 0) {
          existingScope.budgetAmount = (existingScope.budgetAmount || 0) + budgetAmount;
        }
        if (row.lineItemDescription.trim() && !existingScope.description.includes(row.lineItemDescription.trim())) {
          existingScope.description = existingScope.description
            ? `${existingScope.description}; ${row.lineItemDescription.trim()}`
            : row.lineItemDescription.trim();
        }
      } else {
        // Create new scope item
        const newScope: ScopeLineItem = {
          id: `scope-${phaseId.toLowerCase()}-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
          phaseId,
          name: trimmedScopeName,
          costCode: row.costCode.trim() || undefined,
          description: row.lineItemDescription.trim() || trimmedScopeName,
          budgetAmount,
          trades: [],
          isRequired: true,
          order: updatedScopes.filter((s) => s.phaseId === phaseId).length + 1,
          createdAt: now
        };
        updatedScopes.push(newScope);
      }
    });

    const updatedProjects = allProjects.map((p) =>
      p.id === activeProject.id
        ? {
            ...p,
            scopes: updatedScopes,
            targetBudget: updatedScopes.reduce((sum, s) => sum + s.budgetAmount, 0),
            updatedAt: now
          }
        : p
    );

    return updatedProjects;
  },

  // ================= 3. Phase-Level Bulk Quote Import =================
  generatePhaseQuoteTemplate(project: Project, phaseId: PhaseId): string {
    const headers = [
      'Project Name',
      'Phase Name',
      'Scope Name',
      'Cost Code',
      'Tender Form Line Item Description',
      'Contractor Name',
      'Company Name',
      'Contact Email',
      'Line Item Amount ($)',
      'Inclusion Status',
      'Vendor Scope Notes',
      'Formal Quote Link'
    ];

    const phaseScopes = project.scopes.filter((s) => s.phaseId === phaseId);
    const rows: string[][] = [];

    if (phaseScopes.length > 0) {
      phaseScopes.forEach((s) => {
        // Collect all registered Itemized Tender Form Line Items
        const registeredSpecs: { costCode: string; description: string }[] = [];

        // 1. Check if any trade entries under this scope already have itemized breakdown items
        const existingBreakdowns = s.trades.flatMap((t) => t.quoteBreakdown || []);
        if (existingBreakdowns.length > 0) {
          const seen = new Set<string>();
          existingBreakdowns.forEach((item) => {
            const desc = item.itemDescription?.trim();
            if (desc) {
              const code = item.costCode?.trim() || s.costCode?.trim() || '20000';
              const key = `${code}|${desc}`.toLowerCase();
              if (!seen.has(key)) {
                seen.add(key);
                registeredSpecs.push({ costCode: code, description: desc });
              }
            }
          });
        }

        // 2. If no breakdown items on trades yet, fetch registered Itemized Tender Form Line Items from template catalog
        if (registeredSpecs.length === 0) {
          const specs = getTenderTemplateSpecs(s.name, s.costCode || '20000');
          specs.forEach((spec) => {
            registeredSpecs.push({
              costCode: spec.costCode || s.costCode || '20000',
              description: spec.itemDescription
            });
          });
        }

        // 3. Pre-populate Project Name, Phase Name, Scope Name, Cost Code, Tender Form Line Item Description
        // Leave Contractor Name, Company Name, Contact Email, Line Item Amount ($), Inclusion Status, Vendor Scope Notes, Formal Quote Link blank
        registeredSpecs.forEach((item) => {
          rows.push([
            `"${(project.name || '').replace(/"/g, '""')}"`,
            `"Phase ${phaseId}"`,
            `"${(s.name || '').replace(/"/g, '""')}"`,
            `"${(item.costCode || s.costCode || '20000').replace(/"/g, '""')}"`,
            `"${(item.description || '').replace(/"/g, '""')}"`,
            '""', // Contractor Name
            '""', // Company Name
            '""', // Contact Email
            '""', // Line Item Amount ($)
            '""', // Inclusion Status
            '""', // Vendor Scope Notes
            '""'  // Formal Quote Link
          ]);
        });
      });
    } else {
      // Fallback sample row if phase has no scopes yet
      rows.push([
        `"${(project.name || '').replace(/"/g, '""')}"`,
        `"Phase ${phaseId}"`,
        '"Demolition"',
        '"20020"',
        '"Total for Demolition (excl. GST)"',
        '""',
        '""',
        '""',
        '""',
        '""',
        '""',
        '""'
      ]);
    }

    return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  },

  parsePhaseQuotesCsv(
    rawText: string | unknown,
    defaultProjectName: string,
    defaultPhase: PhaseId
  ): PhaseQuoteImportRow[] {
    if (!rawText || typeof rawText !== 'string' || !rawText.trim()) return [];

    const lines = rawText
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    if (lines.length <= 1) return [];

    const delimiter = lines[0].includes('\t') ? '\t' : ',';
    const headers = sheetsSyncService.parseCsvLine(lines[0], delimiter).map((h) =>
      h.toLowerCase().replace(/['"]/g, '').trim()
    );

    const projectIdx = headers.findIndex((h) => h.includes('project'));
    const phaseIdx = headers.findIndex((h) => h.includes('phase'));
    const scopeIdx = headers.findIndex((h) => h.includes('scope name') || (h.includes('scope') && !h.includes('notes')));
    const costCodeIdx = headers.findIndex((h) => h.includes('cost code') || h.includes('costcode') || h === 'code');
    const itemDescIdx = headers.findIndex((h) =>
      h.includes('tender form line item') ||
      h.includes('line item description') ||
      h.includes('item description') ||
      h.includes('tender form') ||
      h.includes('description')
    );
    const contractorIdx = headers.findIndex((h) => h.includes('contractor') || h.includes('contact name') || h === 'contact');
    const companyIdx = headers.findIndex((h) => h.includes('company') || h.includes('vendor') || h.includes('trade'));
    const emailIdx = headers.findIndex((h) => h.includes('email') || h.includes('mail'));
    const amountIdx = headers.findIndex((h) =>
      h.includes('line item amount') ||
      h.includes('quoted amount') ||
      h.includes('quoted figure') ||
      h.includes('amount') ||
      h.includes('figure') ||
      h.includes('price') ||
      h.includes('cost')
    );
    const inclusionIdx = headers.findIndex((h) => h.includes('inclusion') || h.includes('included'));
    const notesIdx = headers.findIndex((h) =>
      h.includes('vendor scope notes') ||
      h.includes('scope notes') ||
      h.includes('notes') ||
      h.includes('comment')
    );
    const linkIdx = headers.findIndex((h) =>
      h.includes('formal quote link') ||
      h.includes('quote link') ||
      h.includes('link') ||
      h.includes('url') ||
      h.includes('doc') ||
      h.includes('pdf')
    );
    const statusIdx = headers.findIndex((h) => h.includes('action status') || h.includes('status'));

    const rows: PhaseQuoteImportRow[] = [];

    for (let i = 1; i < lines.length; i++) {
      const cols = sheetsSyncService.parseCsvLine(lines[i], delimiter);
      if (cols.length === 0 || cols.every((c) => !c)) continue;

      const projectName = (projectIdx >= 0 ? cols[projectIdx] : defaultProjectName).replace(/['"]/g, '').trim() || defaultProjectName;
      let phaseName = (phaseIdx >= 0 ? cols[phaseIdx] : defaultPhase).replace(/['"]/g, '').trim().toUpperCase();
      phaseName = phaseName.replace(/PHASE\s*/i, '').trim() || defaultPhase;

      const scopeName = (scopeIdx >= 0 ? cols[scopeIdx] : cols[2] || '').replace(/['"]/g, '').trim();
      const costCode = (costCodeIdx >= 0 ? cols[costCodeIdx] : '').replace(/['"]/g, '').trim();
      const lineItemDescription = (itemDescIdx >= 0 ? cols[itemDescIdx] : '').replace(/['"]/g, '').trim();
      const contractorName = (contractorIdx >= 0 ? cols[contractorIdx] : '').replace(/['"]/g, '').trim();
      const companyName = (companyIdx >= 0 ? cols[companyIdx] : '').replace(/['"]/g, '').trim();
      const contactEmail = (emailIdx >= 0 ? cols[emailIdx] : '').replace(/['"]/g, '').trim();
      const quotedAmount = (amountIdx >= 0 ? cols[amountIdx] : '').replace(/['"$,]/g, '').trim();
      const inclusionStatus = (inclusionIdx >= 0 ? cols[inclusionIdx] : 'INCLUDED').replace(/['"]/g, '').trim().toUpperCase() || 'INCLUDED';
      const notes = (notesIdx >= 0 ? cols[notesIdx] : '').replace(/['"]/g, '').trim();
      const quoteLink = (linkIdx >= 0 ? cols[linkIdx] : '').replace(/['"]/g, '').trim();
      const actionStatus = (statusIdx >= 0 ? cols[statusIdx] : 'Estimate Requested').replace(/['"]/g, '').trim() || 'Estimate Requested';

      // Skip row if it's completely unpopulated (i.e. untouched template row without vendor name and without amount)
      const hasVendor = Boolean(companyName || contractorName);
      const hasAmt = Boolean(quotedAmount && quotedAmount !== '0' && quotedAmount !== '');
      if (!hasVendor && !hasAmt) {
        continue;
      }

      const row: PhaseQuoteImportRow = {
        id: `import-quote-${Date.now()}-${i}`,
        projectName,
        phaseName,
        scopeName,
        costCode,
        lineItemDescription,
        contractorName: contractorName || companyName,
        companyName: companyName || contractorName,
        contactEmail,
        quotedAmount,
        inclusionStatus,
        notes,
        quoteLink,
        actionStatus,
        errors: {}
      };

      this.validatePhaseQuoteRow(row);
      rows.push(row);
    }

    return rows;
  },

  validatePhaseQuoteRow(row: PhaseQuoteImportRow, validScopeNames?: string[]) {
    row.errors = {};
    if (!row.scopeName.trim()) {
      row.errors.scopeName = 'Scope Name is required';
    } else if (validScopeNames && validScopeNames.length > 0) {
      const match = validScopeNames.some(
        (sn) => sn.toLowerCase().trim() === row.scopeName.toLowerCase().trim()
      );
      if (!match) {
        row.errors.scopeName = `Unassigned Scope Name (must match an active scope)`;
      }
    }

    if (!row.companyName.trim() && !row.contractorName.trim()) {
      row.errors.companyName = 'Company or Contractor Name is required';
    }

    if (row.quotedAmount.trim() !== '') {
      const num = parseFloat(row.quotedAmount);
      if (isNaN(num) || num < 0) {
        row.errors.quotedAmount = 'Line Item Amount must be a valid positive number';
      }
    }

    if (row.contactEmail.trim() && !row.contactEmail.includes('@')) {
      row.errors.contactEmail = 'Please enter a valid email address';
    }
  },

  applyBulkQuotes(
    rows: PhaseQuoteImportRow[],
    activeProject: Project,
    allProjects: Project[],
    existingContacts: Contact[]
  ): { updatedProjects: Project[]; newContacts: Contact[]; addedCount: number } {
    const updatedScopes: ScopeLineItem[] = [...activeProject.scopes];
    const newContacts: Contact[] = [...existingContacts];
    let addedCount = 0;
    const now = new Date().toISOString();

    // Group incoming rows by Scope Name and Company Name (or Contractor Name if company is missing)
    interface GroupedBid {
      scopeName: string;
      companyName: string;
      contractorName: string;
      contactEmail: string;
      actionStatus: ActionItemStatus;
      quoteLinks: string[];
      vendorNotes: string[];
      items: {
        costCode: string;
        description: string;
        amount: number;
        inclusionStatus: 'included' | 'excluded' | 'allowance' | 'optional';
        notes?: string;
      }[];
    }

    const groupedMap = new Map<string, GroupedBid>();

    rows.forEach((row) => {
      const scopeName = row.scopeName.trim();
      const companyName = row.companyName.trim() || row.contractorName.trim();
      const contractorName = row.contractorName.trim() || companyName;

      if (!scopeName || !companyName) return;

      const groupKey = `${scopeName.toLowerCase()}:::${companyName.toLowerCase()}`;

      const amt = parseFloat(row.quotedAmount) || 0;
      const rawInclusion = (row.inclusionStatus || 'INCLUDED').toLowerCase().trim();
      const inclusionStatus: 'included' | 'excluded' | 'allowance' | 'optional' =
        rawInclusion === 'excluded' ? 'excluded' :
        rawInclusion === 'allowance' ? 'allowance' :
        rawInclusion === 'optional' ? 'optional' : 'included';

      // Normalize status
      let actionStatus: ActionItemStatus = 'Estimate Requested';
      const matchedStatus = VALID_ACTION_STATUSES.find(
        (s) => s.toLowerCase() === (row.actionStatus || '').trim().toLowerCase()
      );
      if (matchedStatus) {
        actionStatus = matchedStatus;
      } else if ((row.actionStatus || '').toLowerCase().includes('po approved')) {
        actionStatus = 'PO Approved';
      } else if ((row.actionStatus || '').toLowerCase().includes('waiting')) {
        actionStatus = 'Waiting on Response';
      }

      if (!groupedMap.has(groupKey)) {
        groupedMap.set(groupKey, {
          scopeName,
          companyName,
          contractorName,
          contactEmail: row.contactEmail.trim(),
          actionStatus,
          quoteLinks: row.quoteLink.trim() ? [row.quoteLink.trim()] : [],
          vendorNotes: row.notes.trim() ? [row.notes.trim()] : [],
          items: []
        });
      }

      const grp = groupedMap.get(groupKey)!;
      if (row.contactEmail.trim() && !grp.contactEmail) {
        grp.contactEmail = row.contactEmail.trim();
      }
      if (row.quoteLink.trim() && !grp.quoteLinks.includes(row.quoteLink.trim())) {
        grp.quoteLinks.push(row.quoteLink.trim());
      }
      if (row.notes.trim() && !grp.vendorNotes.includes(row.notes.trim())) {
        grp.vendorNotes.push(row.notes.trim());
      }
      if (row.actionStatus && row.actionStatus !== 'Estimate Requested') {
        grp.actionStatus = actionStatus;
      }

      grp.items.push({
        costCode: row.costCode.trim(),
        description: row.lineItemDescription.trim() || `${scopeName} Line Item`,
        amount: amt,
        inclusionStatus,
        notes: row.notes.trim() || undefined
      });
    });

    // Now apply each grouped bid to target scopes
    groupedMap.forEach((grp) => {
      const targetScopeIndex = updatedScopes.findIndex(
        (s) => s.name.toLowerCase().trim() === grp.scopeName.toLowerCase().trim()
      );
      if (targetScopeIndex < 0) return;

      const targetScope = { ...updatedScopes[targetScopeIndex], trades: [...updatedScopes[targetScopeIndex].trades] };

      // Map each line item amount directly into the contractor's Itemized Tender Form Breakdown
      const breakdownItems: QuoteBreakdownItem[] = grp.items.map((it, idx) => ({
        id: `brk-${Date.now()}-${idx}-${Math.random().toString(36).substr(2, 4)}`,
        costCode: it.costCode || targetScope.costCode || '20000',
        itemDescription: it.description,
        amount: it.amount,
        inclusionStatus: it.inclusionStatus,
        notes: it.notes || '',
        tenderSpecRef: `Cost Code ${it.costCode || targetScope.costCode || '20000'}`
      }));

      // Auto-sum individual line item amounts to calculate overall Quoted Figure (Live)
      // Excludes items marked as 'excluded' (consistent with QuoteBreakdownModal)
      const overallQuotedFigure = breakdownItems
        .filter((it) => it.inclusionStatus !== 'excluded')
        .reduce((sum, it) => sum + (it.amount || 0), 0);

      // Contact lookup or creation in directory
      let contact = newContacts.find(
        (c) =>
          c.company.toLowerCase() === grp.companyName.toLowerCase() ||
          (grp.contactEmail && c.email.toLowerCase() === grp.contactEmail.toLowerCase())
      );
      if (!contact) {
        contact = {
          id: `contact-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
          name: grp.contractorName,
          company: grp.companyName,
          category: targetScope.name,
          phone: '',
          email: grp.contactEmail,
          notes: grp.vendorNotes.join('; '),
          createdAt: now
        };
        newContacts.push(contact);
      } else if (grp.contactEmail && !contact.email) {
        contact.email = grp.contactEmail;
      }

      // Attached formal quote PDF / link if provided
      const attachedDocs = grp.quoteLinks.map((link, lIdx) => ({
        id: `doc-${Date.now()}-${lIdx}-${Math.random().toString(36).substr(2, 4)}`,
        name: `${grp.companyName} - Formal Quote.pdf`,
        url: link,
        type: 'quote' as const,
        addedAt: now.split('T')[0]
      }));

      // Notes if provided
      const notes = grp.vendorNotes.map((noteText, nIdx) => ({
        id: `note-${Date.now()}-${nIdx}`,
        text: noteText,
        author: 'Vendor Tender Submission',
        timestamp: new Date().toLocaleDateString([], {
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        })
      }));

      // Check if contractor already quoted on this scope
      const existingTradeIndex = targetScope.trades.findIndex(
        (t) =>
          t.companyName.toLowerCase().trim() === grp.companyName.toLowerCase().trim() ||
          t.contractorName.toLowerCase().trim() === grp.contractorName.toLowerCase().trim()
      );

      if (existingTradeIndex >= 0) {
        const existingTrade = targetScope.trades[existingTradeIndex];
        targetScope.trades[existingTradeIndex] = {
          ...existingTrade,
          quotedFigure: overallQuotedFigure,
          quoteBreakdown: breakdownItems,
          actionStatus: grp.actionStatus || existingTrade.actionStatus,
          poSent: grp.actionStatus === 'PO Approved' ? true : existingTrade.poSent,
          isAwarded: grp.actionStatus === 'PO Approved' ? true : existingTrade.isAwarded,
          attachedDocs: [
            ...existingTrade.attachedDocs,
            ...attachedDocs.filter((ad) => !existingTrade.attachedDocs.some((d) => d.url === ad.url))
          ],
          notes: [...existingTrade.notes, ...notes],
          lastSyncedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
      } else {
        const newTrade: TradeEntry = {
          id: `trade-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
          scopeId: targetScope.id,
          contactId: contact.id,
          contractorName: grp.contractorName,
          companyName: grp.companyName,
          category: targetScope.name,
          quotedFigure: overallQuotedFigure,
          quoteBreakdown: breakdownItems,
          currency: 'CAD',
          attachedDocs,
          actionStatus: grp.actionStatus,
          poSent: grp.actionStatus === 'PO Approved',
          isAwarded: grp.actionStatus === 'PO Approved',
          notes,
          lastSyncedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
        targetScope.trades.push(newTrade);
      }

      updatedScopes[targetScopeIndex] = targetScope;
      addedCount++;
    });

    const updatedProjects = allProjects.map((p) =>
      p.id === activeProject.id
        ? {
            ...p,
            scopes: updatedScopes,
            updatedAt: now
          }
        : p
    );

    return {
      updatedProjects,
      newContacts,
      addedCount
    };
  }
};
