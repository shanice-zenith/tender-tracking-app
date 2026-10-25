import { Project, ScopeLineItem, PhaseId } from '../types';
import { getTenderTemplateSpecs, TENDER_FORM_TEMPLATES } from '../data/tenderBreakdownTemplates';

export interface ParsedBudgetRow {
  costCode: string;
  description: string;
  amount: number;
  rawLine: number;
}

export interface MatchedScopeBudget {
  scopeId: string;
  scopeName: string;
  phaseId: PhaseId;
  costCode?: string;
  oldTargetBudget: number;
  newTargetBudget: number;
  difference: number;
  matchedCostCodes: string[];
  matchedEntries: ParsedBudgetRow[];
}

export interface OrphanedCostCode {
  costCode: string;
  description: string;
  amount: number;
  reason: string;
  rawLine?: number;
}

export interface UnmatchedScope {
  scopeId: string;
  scopeName: string;
  phaseId: PhaseId;
  currentBudget: number;
  assignedCostCodes: string[];
}

export interface BudgetMappingResult {
  projectName: string;
  projectCode: string;
  matchedScopes: MatchedScopeBudget[];
  orphanedCostCodes: OrphanedCostCode[];
  unmatchedScopes: UnmatchedScope[];
  totalCsvBudget: number;
  totalMatchedBudget: number;
  totalOrphanedBudget: number;
  totalOldProjectBudget: number;
  totalNewProjectBudget: number;
}

/**
 * Extracts all cost codes assigned to a Scope Package across:
 * 1. Registered Itemized Tender Form Line Items (template specs)
 * 2. Any contractor trade quote breakdown line items
 * 3. The scope's direct costCode property
 */
export function getAssignedCostCodesForScope(scope: ScopeLineItem): {
  costCodes: string[];
  lineItems: { costCode: string; description: string }[];
} {
  const codeSet = new Set<string>();
  const lineItems: { costCode: string; description: string }[] = [];

  // 1. Master catalog specs (Source of Truth)
  const templateSpecs = getTenderTemplateSpecs(scope.name, scope.costCode || '20000');
  templateSpecs.forEach((spec) => {
    const code = spec.costCode?.trim();
    if (code && code !== 'unassigned') {
      codeSet.add(code);
      lineItems.push({ costCode: code, description: spec.itemDescription });
    }
  });

  // 2. Direct scope costCode
  if (scope.costCode?.trim() && scope.costCode !== 'unassigned') {
    const directCode = scope.costCode.trim();
    codeSet.add(directCode);
    if (!lineItems.some((li) => li.costCode === directCode)) {
      lineItems.push({ costCode: directCode, description: scope.name });
    }
  }

  // NOTE: trade.quoteBreakdown is removed here to prevent misassigned quotes from poisoning the budget mapper!

  return {
    costCodes: Array.from(codeSet),
    lineItems
  };
}


/**
 * Robust CSV line splitter that handles quotes, escaped quotes, and commas inside cells.
 */
function parseCsvLine(text: string): string[] {
  const result: string[] = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (char === '"') {
      if (inQuotes && text[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(cur.trim());
      cur = '';
    } else {
      cur += char;
    }
  }
  result.push(cur.trim());
  return result;
}

/**
 * Clean numeric currency string (removes $, commas, handles parentheses for negatives).
 */
function parseCurrencyNumber(val: string): number {
  if (!val) return 0;
  const clean = val.replace(/[\$\s,]/g, '').trim();
  if (!clean) return 0;
  if (clean.startsWith('(') && clean.endsWith(')')) {
    return -parseFloat(clean.slice(1, -1)) || 0;
  }
  return parseFloat(clean) || 0;
}

/**
 * Parses the Master Budget CSV into an array of budget objects.
 * Columns expected: Cost Code, Cost Code Description, Allocated Budget ($)
 */
export function parseMasterBudgetCsv(csvContent: string | unknown): {
  rows: ParsedBudgetRow[];
  errors: string[];
} {
  const errors: string[] = [];
  const rows: ParsedBudgetRow[] = [];

  if (!csvContent || typeof csvContent !== 'string' || !csvContent.trim()) {
    errors.push('The uploaded CSV file is empty.');
    return { rows, errors };
  }

  const lines = csvContent
    .split(/\r\n|\n|\r/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length === 0) {
    errors.push('No lines found in the uploaded CSV file.');
    return { rows, errors };
  }

  // Parse header line
  const headerCells = parseCsvLine(lines[0]).map((h) => h.toLowerCase().replace(/[^a-z0-9]/g, ''));

  let costCodeIdx = -1;
  let descriptionIdx = -1;
  let amountIdx = -1;

  headerCells.forEach((h, idx) => {
    if (h.includes('costcode') || h === 'code' || h.includes('costcodetag') || h.includes('csicode')) {
      if (costCodeIdx === -1) costCodeIdx = idx;
    } else if (h.includes('desc') || h.includes('item') || h.includes('scope') || h.includes('title')) {
      if (descriptionIdx === -1) descriptionIdx = idx;
    } else if (h.includes('budget') || h.includes('amount') || h.includes('allocated') || h.includes('figure') || h.includes('target')) {
      if (amountIdx === -1) amountIdx = idx;
    }
  });

  // Fallback defaults if standard headers weren't explicitly matched
  if (costCodeIdx === -1) costCodeIdx = 0;
  if (descriptionIdx === -1) descriptionIdx = headerCells.length > 2 ? 1 : -1;
  if (amountIdx === -1) amountIdx = headerCells.length > 2 ? 2 : headerCells.length > 1 ? 1 : 1;

  // Process data rows starting from line 1
  for (let i = 1; i < lines.length; i++) {
    const rawLine = i + 1;
    const cells = parseCsvLine(lines[i]);
    if (cells.length === 0 || cells.every((c) => !c)) continue;

    const rawCostCode = (cells[costCodeIdx] || '').trim();
    if (!rawCostCode) continue;

    // Clean cost code (normalize quotes and numeric notation e.g. "20040.0" -> "20040")
    const cleanCostCode = rawCostCode.replace(/['"]/g, '').trim();
    const desc = descriptionIdx !== -1 && cells[descriptionIdx] ? cells[descriptionIdx].trim() : `Cost Code ${cleanCostCode}`;
    const amount = amountIdx !== -1 && cells[amountIdx] ? parseCurrencyNumber(cells[amountIdx]) : 0;

    rows.push({
      costCode: cleanCostCode,
      description: desc,
      amount,
      rawLine
    });
  }

  if (rows.length === 0) {
    errors.push('Could not find any data rows with valid Cost Codes in the CSV.');
  }

  return { rows, errors };
}

/**
 * Core Auto-Mapping Engine:
 * 1. Iterates through every active Scope Package in the project.
 * 2. For each Scope Package, retrieves its Itemized Tender Form Line Items and assigned Cost Code tags.
 * 3. Matches assigned cost codes against the uploaded Master Budget CSV.
 * 4. Sums the Allocated Budget ($) for all matching cost codes to calculate the new Target Budget.
 * 5. Identifies unmatched/orphaned cost codes from the CSV that do not exist in the project.
 */
export function calculateBudgetMapping(
  project: Project,
  csvRows: ParsedBudgetRow[]
): BudgetMappingResult {
  const activeScopes = project.scopes || [];

  // Map of normalized cost code -> set of scope IDs that use it
  const costCodeToScopeIds = new Map<string, Set<string>>();
  // Map of scope ID -> set of its assigned normalized cost codes
  const scopeIdToAssignedCodes = new Map<string, Set<string>>();

  activeScopes.forEach((scope) => {
    const { costCodes } = getAssignedCostCodesForScope(scope);
    const assignedSet = new Set<string>();
    costCodes.forEach((code) => {
      const normalized = code.trim().toLowerCase();
      assignedSet.add(normalized);
      if (!costCodeToScopeIds.has(normalized)) {
        costCodeToScopeIds.set(normalized, new Set());
      }
      costCodeToScopeIds.get(normalized)!.add(scope.id);
    });
    scopeIdToAssignedCodes.set(scope.id, assignedSet);
  });

  // Track which CSV rows matched at least one scope
  const matchedCsvRowIndices = new Set<number>();
  // Map of scopeId -> matched CSV rows
  const scopeIdToMatchedRows = new Map<string, ParsedBudgetRow[]>();

  csvRows.forEach((csvRow, rowIndex) => {
    const normalizedCode = csvRow.costCode.trim().toLowerCase();
    const targetScopeIds = costCodeToScopeIds.get(normalizedCode);

    if (targetScopeIds && targetScopeIds.size > 0) {
      matchedCsvRowIndices.add(rowIndex);
      targetScopeIds.forEach((sId) => {
        if (!scopeIdToMatchedRows.has(sId)) {
          scopeIdToMatchedRows.set(sId, []);
        }
        scopeIdToMatchedRows.get(sId)!.push(csvRow);
      });
    }
  });

  // Build Matched Scopes list
  const matchedScopes: MatchedScopeBudget[] = [];
  const unmatchedScopes: UnmatchedScope[] = [];

  activeScopes.forEach((scope) => {
    const matchedRows = scopeIdToMatchedRows.get(scope.id) || [];
    const oldTargetBudget = scope.budgetAmount || 0;

    if (matchedRows.length > 0) {
      // Sum the Allocated Budget ($) for all matching cost codes
      const newTargetBudget = matchedRows.reduce((sum, r) => sum + r.amount, 0);
      const matchedCodes = Array.from(new Set(matchedRows.map((r) => r.costCode)));

      matchedScopes.push({
        scopeId: scope.id,
        scopeName: scope.name,
        phaseId: scope.phaseId,
        costCode: scope.costCode,
        oldTargetBudget,
        newTargetBudget,
        difference: newTargetBudget - oldTargetBudget,
        matchedCostCodes: matchedCodes,
        matchedEntries: matchedRows
      });
    } else {
      const { costCodes } = getAssignedCostCodesForScope(scope);
      unmatchedScopes.push({
        scopeId: scope.id,
        scopeName: scope.name,
        phaseId: scope.phaseId,
        currentBudget: oldTargetBudget,
        assignedCostCodes: costCodes
      });
    }
  });

  // Find Unmatched / Orphaned Cost Codes (CSV rows with no matching scope in project)
  const orphanedCostCodes: OrphanedCostCode[] = [];
  csvRows.forEach((csvRow, rowIndex) => {
    if (!matchedCsvRowIndices.has(rowIndex)) {
      orphanedCostCodes.push({
        costCode: csvRow.costCode,
        description: csvRow.description,
        amount: csvRow.amount,
        reason: 'No matching scope found',
        rawLine: csvRow.rawLine
      });
    }
  });

  const totalCsvBudget = csvRows.reduce((sum, r) => sum + r.amount, 0);
  const totalMatchedBudget = matchedScopes.reduce((sum, s) => sum + s.newTargetBudget, 0);
  const totalOrphanedBudget = orphanedCostCodes.reduce((sum, r) => sum + r.amount, 0);
  const totalOldProjectBudget = activeScopes.reduce((sum, s) => sum + (s.budgetAmount || 0), 0);

  // Compute new overall projected project budget
  const updatedScopeBudgetMap = new Map<string, number>();
  activeScopes.forEach((s) => updatedScopeBudgetMap.set(s.id, s.budgetAmount || 0));
  matchedScopes.forEach((m) => updatedScopeBudgetMap.set(m.scopeId, m.newTargetBudget));
  const totalNewProjectBudget = Array.from(updatedScopeBudgetMap.values()).reduce((sum, b) => sum + b, 0);

  return {
    projectName: project.name,
    projectCode: project.code,
    matchedScopes,
    orphanedCostCodes,
    unmatchedScopes,
    totalCsvBudget,
    totalMatchedBudget,
    totalOrphanedBudget,
    totalOldProjectBudget,
    totalNewProjectBudget
  };
}

/**
 * Generates the official downloadable Budget Template (.CSV)
 * Columns: Cost Code, Cost Code Description, Allocated Budget ($)
 */
export function generateBudgetTemplateCsv(project?: Project | null): string {
  const headers = ['Cost Code', 'Cost Code Description', 'Allocated Budget ($)'];
  const rows: string[][] = [];

  const registeredSpecs: { costCode: string; description: string; defaultBudget: number }[] = [];
  const seenCodes = new Set<string>();

  // 1. Pre-populate from project scopes if present
  if (project && project.scopes && project.scopes.length > 0) {
    project.scopes.forEach((scope) => {
      const templateSpecs = getTenderTemplateSpecs(scope.name, scope.costCode || '20000');
      if (templateSpecs.length > 0) {
        templateSpecs.forEach((spec) => {
          const key = `${spec.costCode}|${spec.itemDescription}`.toLowerCase();
          if (!seenCodes.has(key)) {
            seenCodes.add(key);
            const proportionalAmount = Math.round((scope.budgetAmount || 0) * (spec.percentageOfTotal || 1));
            registeredSpecs.push({
              costCode: spec.costCode,
              description: spec.itemDescription,
              defaultBudget: proportionalAmount > 0 ? proportionalAmount : 50000
            });
          }
        });
      } else {
        const code = scope.costCode || '20000';
        const key = `${code}|${scope.name}`.toLowerCase();
        if (!seenCodes.has(key)) {
          seenCodes.add(key);
          registeredSpecs.push({
            costCode: code,
            description: scope.name,
            defaultBudget: scope.budgetAmount || 50000
          });
        }
      }
    });
  }

  // 2. If no project scopes or to ensure standard catalogue is covered, add from TENDER_FORM_TEMPLATES
  if (registeredSpecs.length === 0) {
    Object.entries(TENDER_FORM_TEMPLATES).forEach(([scopeName, specs]) => {
      specs.forEach((spec) => {
        const key = `${spec.costCode}|${spec.itemDescription}`.toLowerCase();
        if (!seenCodes.has(key)) {
          seenCodes.add(key);
          registeredSpecs.push({
            costCode: spec.costCode,
            description: `${scopeName} - ${spec.itemDescription}`,
            defaultBudget: 50000
          });
        }
      });
    });
  }

  // Format CSV rows
  registeredSpecs.forEach((item) => {
    rows.push([
      `"${item.costCode.replace(/"/g, '""')}"`,
      `"${item.description.replace(/"/g, '""')}"`,
      `"${item.defaultBudget}"`
    ]);
  });

  return [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
}

/**
 * Triggers a browser download for the generated CSV text.
 */
export function downloadCsv(filename: string, content: string) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Applies the verified budget mapping to the target project,
 * updating each matched Scope's Target Budget (`budgetAmount`),
 * recalculating the project's overall `targetBudget`,
 * and returning the updated projects collection.
 */
export function applyBudgetMappingToProject(
  activeProject: Project,
  mapping: BudgetMappingResult,
  allProjects: Project[]
): Project[] {
  const matchedMap = new Map<string, number>();
  mapping.matchedScopes.forEach((m) => {
    matchedMap.set(m.scopeId, m.newTargetBudget);
  });

  const updatedScopes = activeProject.scopes.map((scope) => {
    if (matchedMap.has(scope.id)) {
      return {
        ...scope,
        budgetAmount: matchedMap.get(scope.id)!
      };
    }
    return scope;
  });

  const newOverallTargetBudget = updatedScopes.reduce((sum, s) => sum + (s.budgetAmount || 0), 0);

  const updatedProject: Project = {
    ...activeProject,
    scopes: updatedScopes,
    targetBudget: newOverallTargetBudget,
    updatedAt: new Date().toISOString()
  };

  return allProjects.map((p) => (p.id === activeProject.id ? updatedProject : p));
}

export const budgetAllocationService = {
  getAssignedCostCodesForScope,
  parseMasterBudgetCsv,
  calculateBudgetMapping,
  generateBudgetTemplateCsv,
  downloadCsv,
  applyBudgetMappingToProject
};
