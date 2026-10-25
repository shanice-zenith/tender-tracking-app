import { Project, ScopeLineItem, PhaseId } from '../types';
import { getAssignedCostCodesForScope } from './budgetAllocationService';
import { extractTextFromPdf } from './pdfTextExtractor';

export interface ExtractedBudgetReviewItem {
  id: string;
  costCode: string;
  description: string;
  amount: number;
  mappedScopeId?: string;
  mappedScopeName?: string;
  mappedPhaseId?: PhaseId;
  status: 'Mapped' | 'Unmapped';
  rawText?: string;
  rawLine?: number;
}

export interface ScopeBudgetAggregation {
  scopeId: string;
  scopeName: string;
  phaseId: PhaseId;
  oldTargetBudget: number;
  newTargetBudget: number;
  difference: number;
  matchedCostCodes: string[];
  matchedItems: ExtractedBudgetReviewItem[];
}

export interface BudgetExtractionResult {
  projectName: string;
  projectCode: string;
  sourceFileName: string;
  sourceFileType: 'PDF' | 'CSV' | 'TEXT';
  items: ExtractedBudgetReviewItem[];
  scopeAggregations: ScopeBudgetAggregation[];
  totalExtractedBudget: number;
  totalMappedBudget: number;
  totalUnmappedBudget: number;
  oldProjectTargetBudget: number;
  newProjectTargetBudget: number;
  mappedCount: number;
  unmappedCount: number;
}

/**
 * Clean currency string to number ($42,000.00 -> 42000, ($15,000) -> -15000)
 */
export function parseCurrencyAmount(str: string): number {
  if (!str) return 0;
  const clean = str.replace(/[\$\s,]/g, '').trim();
  if (!clean) return 0;
  if (clean.startsWith('(') && clean.endsWith(')')) {
    return -parseFloat(clean.slice(1, -1)) || 0;
  }
  return parseFloat(clean) || 0;
}

/**
 * Regex extraction rule:
 * Parses text lines to identify 5-digit construction cost codes (/\b\d{5}\b/)
 * and pair each code with its corresponding dollar figure.
 */
export function extractCostCodeAndAmountFromLine(
  line: string,
  lineNumber: number = 1
): { costCode: string; description: string; amount: number } | null {
  if (!line || !line.trim()) return null;

  // 1. Identify 5-digit cost code: /\b\d{5}\b/
  const costCodeRegex = /\b([1-9]\d{4})\b/;
  const codeMatch = line.match(costCodeRegex);
  if (!codeMatch) return null;

  const costCode = codeMatch[1];
  const codeStartIndex = codeMatch.index ?? 0;
  const codeEndIndex = codeStartIndex + costCode.length;

  // 2. Identify candidate dollar figure(s) on the same line
  // We prefer explicit dollar amounts first: $42,000.00 or $42,000
  const dollarRegex = /\$\s*\(?([0-9]{1,3}(?:,[0-9]{3})*(?:\.[0-9]{1,2})?|[0-9]+(?:\.[0-9]{1,2})?)\)?/g;
  let amountMatch: RegExpExecArray | null;
  let amount = 0;
  let amountMatchedStr = '';

  while ((amountMatch = dollarRegex.exec(line)) !== null) {
    const val = parseCurrencyAmount(amountMatch[0]);
    if (val !== 0) {
      amount = val;
      amountMatchedStr = amountMatch[0];
      break;
    }
  }

  // If no explicit $ found, look for standard formatted numbers: 42,000.00 or 42,000 or 42000.00
  if (amount === 0) {
    // Look for comma-formatted number: 42,000 or 95,000.00
    const commaNumRegex = /\b\(?([0-9]{1,3}(?:,[0-9]{3})+(?:\.[0-9]{1,2})?)\)?\b/g;
    let commaMatch: RegExpExecArray | null;
    while ((commaMatch = commaNumRegex.exec(line)) !== null) {
      // Ensure we don't accidentally match the cost code itself
      if (commaMatch[0] !== costCode) {
        amount = parseCurrencyAmount(commaMatch[0]);
        amountMatchedStr = commaMatch[0];
        break;
      }
    }
  }

  // If still no amount, look for decimal numbers (e.g. 42000.00) or trailing numeric column
  if (amount === 0) {
    const decimalNumRegex = /\b([0-9]+\.[0-9]{2})\b/g;
    let decMatch: RegExpExecArray | null;
    while ((decMatch = decimalNumRegex.exec(line)) !== null) {
      if (decMatch[0] !== costCode) {
        amount = parseCurrencyAmount(decMatch[0]);
        amountMatchedStr = decMatch[0];
        break;
      }
    }
  }

  // If line has CSV delimiters (e.g. 20020,Demolition,42000), check cell values
  if (amount === 0 && line.includes(',')) {
    const cells = line.split(',').map((c) => c.trim().replace(/^"|"$/g, ''));
    for (let i = cells.length - 1; i >= 0; i--) {
      const cell = cells[i];
      if (cell !== costCode && !cell.match(/^[1-9]\d{4}$/)) {
        const val = parseCurrencyAmount(cell);
        if (val > 0) {
          amount = val;
          amountMatchedStr = cell;
          break;
        }
      }
    }
  }

  // 3. Extract description: clean line of the cost code and amount
  let desc = line;
  // Remove the cost code
  desc = desc.replace(new RegExp(`\\b${costCode}\\b`, 'g'), ' ');
  // Remove the amount string
  if (amountMatchedStr) {
    desc = desc.replace(amountMatchedStr, ' ');
  }

  // Clean remaining text of delimiters and symbols: |, -, —, :, ,, quotes, tabs
  desc = desc
    .replace(/[|—\-_:,"'#\t]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  // Strip generic prefixes like "Cost Code", "Code", "Scope", "Account"
  desc = desc.replace(/^(cost\s*code|code|csi|item\s*#?)\s*/i, '').trim();

  // Fallback description based on well-known standard CSI construction divisions if empty
  if (!desc || desc.length < 2) {
    desc = getDefaultDescriptionForCostCode(costCode);
  }

  return {
    costCode,
    description: desc,
    amount
  };
}

/**
 * Standard industry CSI dictionary fallback for 5-digit construction codes
 */
export function getDefaultDescriptionForCostCode(costCode: string): string {
  const dictionary: Record<string, string> = {
    '20020': 'Demolition Work',
    '20040': 'Excavation & Backfill',
    '20120': 'Water & Underground Services',
    '20140': 'DSSP Trenching & Site Works',
    '20150': 'DSSP Materials & Infrastructure',
    '20202': 'Footing & Foundation Concrete',
    '20300': 'Structural Steel & Metal Fabrication',
    '20320': 'Framing Labour & Carpentry',
    '20330': 'Framing Materials & Trusses',
    '20340': 'Doors, Windows & Glazing',
    '20360': 'Roofing & Waterproofing',
    '20400': 'Plumbing, Drainage & Fixtures',
    '20420': 'HVAC & Mechanical Systems',
    '20440': 'Electrical, Low Voltage & Fire Alarm',
    '20500': 'Drywall, Taping & Insulation',
    '20600': 'Interior Finishes & Flooring',
    '20700': 'Exterior Cladding & Stucco',
    '20800': 'Landscaping, Paving & Flatwork'
  };

  return dictionary[costCode] || `Cost Code ${costCode}`;
}

/**
 * Builds a fast lookup table linking cost codes to scope packages in the active project.
 */
export function buildScopeCostCodeMap(project: Project): {
  codeToScopeId: Map<string, string>;
  scopeIdToAssignedCodes: Map<string, Set<string>>;
} {
  const codeToScopeId = new Map<string, string>();
  const scopeIdToAssignedCodes = new Map<string, Set<string>>();

  const scopes = project.scopes || [];

  // Pass 1: Direct costCode property and Itemized Tender Form specs
  scopes.forEach((scope) => {
    const assignedSet = new Set<string>();
    const { costCodes } = getAssignedCostCodesForScope(scope);

    costCodes.forEach((code) => {
      const normalized = code.trim();
      assignedSet.add(normalized);
      if (!codeToScopeId.has(normalized)) {
        codeToScopeId.set(normalized, scope.id);
      }
    });

    if (scope.costCode?.trim()) {
      const directCode = scope.costCode.trim();
      assignedSet.add(directCode);
      if (!codeToScopeId.has(directCode)) {
        codeToScopeId.set(directCode, scope.id);
      }
    }

    scopeIdToAssignedCodes.set(scope.id, assignedSet);
  });

  // Pass 2: Fuzzy keyword/name matching for well-known construction trades
  scopes.forEach((scope) => {
    const lowerName = scope.name.toLowerCase();

    if (lowerName.includes('demolition') && !codeToScopeId.has('20020')) {
      codeToScopeId.set('20020', scope.id);
    }
    if ((lowerName.includes('excavation') || lowerName.includes('earthwork') || lowerName.includes('backfill')) && !codeToScopeId.has('20040')) {
      codeToScopeId.set('20040', scope.id);
    }
    if ((lowerName.includes('water') || lowerName.includes('offsite')) && !codeToScopeId.has('20120')) {
      codeToScopeId.set('20120', scope.id);
    }
    if ((lowerName.includes('dssp') || lowerName.includes('civil') || lowerName.includes('site work')) && !codeToScopeId.has('20140')) {
      codeToScopeId.set('20140', scope.id);
    }
    if ((lowerName.includes('dssp') || lowerName.includes('material')) && !codeToScopeId.has('20150')) {
      codeToScopeId.set('20150', scope.id);
    }
    if ((lowerName.includes('framing labour') || (lowerName.includes('framing') && lowerName.includes('labour'))) && !codeToScopeId.has('20320')) {
      codeToScopeId.set('20320', scope.id);
    }
  });

  return { codeToScopeId, scopeIdToAssignedCodes };
}

/**
 * Maps raw extracted cost code items against active Scope Packages in the project,
 * aggregates multi-code targets, and prepares the visual reconciliation review data.
 */
export function processExtractedBudgetItems(
  rawRows: { costCode: string; description: string; amount: number; rawLine?: number; rawText?: string }[],
  project: Project,
  sourceFileName: string,
  sourceFileType: 'PDF' | 'CSV' | 'TEXT'
): BudgetExtractionResult {
  const scopes = project.scopes || [];
  const scopeMap = new Map<string, ScopeLineItem>();
  scopes.forEach((s) => scopeMap.set(s.id, s));

  const { codeToScopeId } = buildScopeCostCodeMap(project);

  // Group raw rows by unique 5-digit code or treat each row as an item
  const items: ExtractedBudgetReviewItem[] = [];

  rawRows.forEach((r, idx) => {
    const mappedScopeId = codeToScopeId.get(r.costCode);
    const mappedScope = mappedScopeId ? scopeMap.get(mappedScopeId) : undefined;

    items.push({
      id: `extracted-${idx}-${r.costCode}`,
      costCode: r.costCode,
      description: r.description || getDefaultDescriptionForCostCode(r.costCode),
      amount: r.amount,
      mappedScopeId: mappedScope?.id,
      mappedScopeName: mappedScope?.name,
      mappedPhaseId: mappedScope?.phaseId,
      status: mappedScope ? 'Mapped' : 'Unmapped',
      rawText: r.rawText,
      rawLine: r.rawLine ?? idx + 1
    });
  });

  // Aggregate multi-code budget amounts per Scope Package
  const scopeToItemsMap = new Map<string, ExtractedBudgetReviewItem[]>();
  items.forEach((item) => {
    if (item.mappedScopeId) {
      if (!scopeToItemsMap.has(item.mappedScopeId)) {
        scopeToItemsMap.set(item.mappedScopeId, []);
      }
      scopeToItemsMap.get(item.mappedScopeId)!.push(item);
    }
  });

  const scopeAggregations: ScopeBudgetAggregation[] = [];

  scopes.forEach((scope) => {
    const matched = scopeToItemsMap.get(scope.id);
    if (matched && matched.length > 0) {
      // Sum all matching extracted amounts (Multi-Code Aggregation)
      const newTarget = matched.reduce((sum, item) => sum + item.amount, 0);
      const oldTarget = scope.budgetAmount || 0;
      const codes = Array.from(new Set(matched.map((m) => m.costCode)));

      scopeAggregations.push({
        scopeId: scope.id,
        scopeName: scope.name,
        phaseId: scope.phaseId,
        oldTargetBudget: oldTarget,
        newTargetBudget: newTarget,
        difference: newTarget - oldTarget,
        matchedCostCodes: codes,
        matchedItems: matched
      });
    }
  });

  const totalExtractedBudget = items.reduce((sum, item) => sum + item.amount, 0);
  const totalMappedBudget = items
    .filter((item) => item.status === 'Mapped')
    .reduce((sum, item) => sum + item.amount, 0);
  const totalUnmappedBudget = totalExtractedBudget - totalMappedBudget;

  const oldProjectTargetBudget = scopes.reduce((sum, s) => sum + (s.budgetAmount || 0), 0);
  
  // Calculate new project target budget: existing budgets for untouched scopes + new target budgets for mapped scopes
  const updatedScopeBudgets = new Map<string, number>();
  scopes.forEach((s) => updatedScopeBudgets.set(s.id, s.budgetAmount || 0));
  scopeAggregations.forEach((sa) => updatedScopeBudgets.set(sa.scopeId, sa.newTargetBudget));
  const newProjectTargetBudget = Array.from(updatedScopeBudgets.values()).reduce((sum, val) => sum + val, 0);

  return {
    projectName: project.name,
    projectCode: project.code,
    sourceFileName,
    sourceFileType,
    items,
    scopeAggregations,
    totalExtractedBudget,
    totalMappedBudget,
    totalUnmappedBudget,
    oldProjectTargetBudget,
    newProjectTargetBudget,
    mappedCount: items.filter((i) => i.status === 'Mapped').length,
    unmappedCount: items.filter((i) => i.status === 'Unmapped').length
  };
}

/**
 * Main entry point: Parses an uploaded PDF or CSV/text file, runs regex cost code extraction,
 * and produces the Visual Reconciliation Preview data.
 */
export async function parseBudgetFile(
  file: File,
  project: Project
): Promise<BudgetExtractionResult> {
  const fileName = file.name;
  const isPdf = fileName.toLowerCase().endsWith('.pdf') || file.type === 'application/pdf';
  const isCsv = fileName.toLowerCase().endsWith('.csv') || file.type === 'text/csv';

  let rawText = '';
  let fileType: 'PDF' | 'CSV' | 'TEXT' = isPdf ? 'PDF' : isCsv ? 'CSV' : 'TEXT';

  if (isPdf) {
    const arrayBuffer = await file.arrayBuffer();
    rawText = await extractTextFromPdf(arrayBuffer);
  } else {
    rawText = await file.text();
  }

  return parseBudgetText(rawText, project, fileName, fileType);
}

/**
 * Parses raw text lines using regex /\b\d{5}\b/ and pairs with amounts.
 */
export function parseBudgetText(
  rawText: string,
  project: Project,
  sourceFileName: string = 'Budget_Schedule.txt',
  sourceFileType: 'PDF' | 'CSV' | 'TEXT' = 'TEXT'
): BudgetExtractionResult {
  const lines = rawText.split(/\r\n|\n|\r/);
  const rawRows: { costCode: string; description: string; amount: number; rawLine?: number; rawText?: string }[] = [];

  lines.forEach((line, idx) => {
    const extracted = extractCostCodeAndAmountFromLine(line, idx + 1);
    if (extracted && extracted.amount > 0) {
      rawRows.push({
        ...extracted,
        rawLine: idx + 1,
        rawText: line
      });
    }
  });

  if (rawRows.length === 0) {
    throw new Error(
      `No 5-digit construction cost codes (e.g. 20020, 20040, 20320) with dollar amounts found in "${sourceFileName}".`
    );
  }

  return processExtractedBudgetItems(rawRows, project, sourceFileName, sourceFileType);
}

/**
 * Generates sample budget data matching the user prompt specifications:
 * - 20020 ➔ $42,000.00 (Demolition)
 * - 20040 ➔ $95,000.00 (Excavation & Backfill)
 * - 20320 ➔ $200,000.00 (Framing Labour)
 * - Multi-Code Aggregation: 20120 ($98,000), 20140 ($25,000), 20150 ($60,000) under DSSP & Site Works ($183,000)
 * - Unmapped sample: 99999 ➔ $15,000.00 (Specialty Engineering Consultant)
 */
export function getSampleBudgetExtraction(project: Project): BudgetExtractionResult {
  const sampleText = `
ZENITH MASTER CONSTRUCTION BUDGET SCHEDULE - 2026
Project: ${project.name} (${project.code})

CSI Cost Code | Description | Allocated Target ($)
20020 | Demolition | $42,000.00
20040 | Excavation & Backfill | $95,000.00
20320 | Framing Labour | $200,000.00
20120 | Water & Underground Services | $98,000.00
20140 | DSSP Trenching & Site Works | $25,000.00
20150 | DSSP Materials & Infrastructure | $60,000.00
20202 | Footing & Foundation Concrete | $145,000.00
20300 | Structural Steel Supply & Erect | $110,000.00
20360 | Roofing & Waterproofing Membrane | $85,000.00
99999 | Specialty Geo-Engineering Consultation | $15,000.00
`;

  return parseBudgetText(sampleText, project, 'Zenith_Master_Budget_Sample.pdf', 'PDF');
}

/**
 * Applies the reconciled budget results to the project scopes and returns updated projects.
 */
export function applyExtractedBudgetsToProject(
  project: Project,
  extraction: BudgetExtractionResult,
  allProjects: Project[]
): Project[] {
  const targetMap = new Map<string, number>();
  extraction.scopeAggregations.forEach((sa) => {
    targetMap.set(sa.scopeId, sa.newTargetBudget);
  });

  const updatedScopes = project.scopes.map((scope) => {
    if (targetMap.has(scope.id)) {
      const newTarget = targetMap.get(scope.id)!;
      return {
        ...scope,
        budgetAmount: newTarget
      };
    }
    return scope;
  });

  const newProjectTargetBudget = updatedScopes.reduce(
    (sum, s) => sum + (s.budgetAmount || 0),
    0
  );

  const updatedProject: Project = {
    ...project,
    scopes: updatedScopes,
    targetBudget: newProjectTargetBudget,
    updatedAt: new Date().toISOString()
  };

  return allProjects.map((p) => (p.id === project.id ? updatedProject : p));
}
