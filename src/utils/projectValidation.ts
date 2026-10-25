import { getAccurateScopeCostCode } from '../data/tenderBreakdownTemplates';

/**
 * Strict entity validation to prevent code injection, HTML markup, and corrupted entities.
 */
export const isValidProjectName = (name: unknown): boolean => {
  if (!name || typeof name !== 'string') return false;
  const clean = name.trim();

  // Reject JS code injection, short junk names, and URLs
  if (clean.length < 3 || clean.length > 80) return false;
  if (/window\.|ppConfig|Object\.seal|document\.|<script|function\(/i.test(clean)) return false;
  if (/^\.[a-zA-Z_0-9]+$/i.test(clean)) return false; // e.g., .gb_B
  if (clean.startsWith('http://') || clean.startsWith('https://')) return false;
  if (/<[a-z][\s\S]*>/i.test(clean)) return false;
  if (/^deleteIsEnforced/i.test(clean)) return false;
  if (/\{createHTML/i.test(clean)) return false;
  if (/=|\{|\}|;|\(|\)/.test(clean)) return false;

  const JUNK_NAMES = new Set([
    'active project',
    'project name',
    'project',
    'project code',
    'scope name',
    'company name',
    'cost code',
    'entered amount',
    'item description'
  ]);
  if (JUNK_NAMES.has(clean.toLowerCase())) return false;
  if (isExampleOrMockTerm(clean)) return false;

  return true;
};

/**
 * Filter Example/Demo/Test/Sample/Template/Mock Entities
 * Strictly rejects any Project Name, Tab, Scope, Trade, or Submission containing
 * terms such as "Demo", "Example", "Test", "Sample", "Template", or "Mock".
 * Carefully protects valid Demolition scopes and trades (Cost Code 20020).
 */
export const isExampleOrMockTerm = (text: unknown): boolean => {
  if (!text || typeof text !== 'string') return false;
  const clean = text.trim();
  if (!clean) return false;
  const lower = clean.toLowerCase();

  // Safely protect valid Demolition trade scopes (e.g. Demolition, Demolition & Site Clearance)
  const isDemolition = /\bdemolition\b/i.test(lower);

  // Check terms: "Example", "Test", "Sample", "Template", or "Mock"
  const mockKeywords = /\b(example|test|sample|template|mock)\b/i;
  if (mockKeywords.test(lower)) return true;

  // For "demo", match if it's standalone or distinct word, but NOT "demolition"
  if (/\bdemo\b/i.test(lower) && !isDemolition) return true;

  // Known sample/mock project names and test identifiers
  if (
    lower.includes('general portfolio') ||
    lower.includes('crestview') ||
    lower.includes('oakridge') ||
    lower.includes('7th avenue') ||
    lower.includes('kensington') ||
    lower.includes('test_connection') ||
    lower.includes('test connection') ||
    lower.includes('sample project') ||
    lower.includes('template project') ||
    lower.includes('demo project') ||
    lower.startsWith('prj-auto-')
  ) {
    return true;
  }

  return false;
};

/**
 * Cost Code Sanitization
 * Extracts only valid 5-digit numeric strings for cost codes.
 * Rejects and drops any cost code string containing JavaScript code (e.g., function(a){return...}).
 * Eliminates hardcoded fallback to 20020 (Demolition) -> returns 'unassigned'.
 */
export const sanitizeCostCode = (rawCode: unknown): string => {
  const str = String(rawCode || '').trim();
  if (!str || /function\(|return\s|window\.|<script|Object\.|prototype|constructor/i.test(str)) {
    return 'unassigned';
  }
  const match = str.match(/\d{5}/);
  if (match) {
    return match[0];
  }
  if (str.toLowerCase() === 'unassigned') {
    return 'unassigned';
  }
  return 'unassigned';
};

/**
 * Contractor Name Validation
 * Strict validation rule before creating any contractor card or saving to the Contact Directory:
 * - Contractor names must ONLY originate from Column A (Company Name).
 * - Column E (Index 4) contains Notes / Exclusions. NEVER parse, split by newline, or extract contractor names from this field.
 * - If a row value contains newline characters or keywords like thermostats, grilles, inclusions:, or exclusions:, reject it as a company name.
 * - Minimum 2 chars, maximum 60 chars.
 * - Must not contain http or drive.google.com links.
 * - Must not contain JavaScript code (function(, return, window.).
 */
export const isValidContractorName = (name: unknown): boolean => {
  if (!name || typeof name !== 'string') return false;

  // Reject newline characters immediately
  if (/[\r\n]/.test(name)) return false;

  const clean = name.trim();
  if (clean.length < 2 || clean.length > 60) return false;
  if (clean.includes('http') || clean.includes('drive.google.com')) return false;
  if (/function\(|return\s|window\./i.test(clean)) return false;

  // Reject keywords like thermostats, grilles, inclusions:, exclusions:, registers, interlock
  const rejectedKeywords = [
    'thermostat',
    'thermostats',
    'grille',
    'grilles',
    'inclusions:',
    'exclusions:',
    'inclusion',
    'exclusion',
    'registers',
    'register',
    'interlock',
    'ventilation interlock',
    'smart thermostat',
    'floor registers'
  ];

  const lower = clean.toLowerCase();
  for (const kw of rejectedKeywords) {
    if (lower.includes(kw)) return false;
  }

  if (/^(notes:|comments:|exclusions:|inclusions:|specs:)/i.test(clean)) return false;

  return true;
};

export const isValidCompanyName = isValidContractorName;

export const sanitizeProject = (project: any): any => {
  if (!project || typeof project !== 'object') return project;
  const cleanScopes = (project.scopes || []).map((scope: any) => {
    const accurateCode = getAccurateScopeCostCode(scope.name);
    const rawCostCode = scope.costCode ? sanitizeCostCode(scope.costCode) : 'unassigned';
    const isDemolition = (scope.name || '').toLowerCase().includes('demolition');

    // Automatically replace "20020" fallback entries or unassigned codes with their true cost codes
    let finalScopeCostCode = rawCostCode;
    if ((rawCostCode === '20020' && !isDemolition) || rawCostCode === 'unassigned') {
      if (accurateCode) {
        finalScopeCostCode = accurateCode;
      }
    } else if (isDemolition) {
      finalScopeCostCode = '20020';
    } else if (accurateCode && rawCostCode !== accurateCode) {
      finalScopeCostCode = accurateCode;
    }

    // Auto-Purge: Delete all existing cards where companyName fails isValidContractorName(companyName)
    const cleanTrades = (scope.trades || [])
      .filter((trade: any) => {
        if (!trade || typeof trade !== 'object') return false;
        return isValidContractorName(trade.companyName) && isValidContractorName(trade.contractorName);
      })
      .map((trade: any) => {
        const cleanContractor = isValidContractorName(trade.contractorName) 
          ? trade.contractorName.trim() 
          : trade.companyName.trim();
        return {
          ...trade,
          companyName: trade.companyName.trim(),
          contractorName: cleanContractor,
          costCode: trade.costCode ? sanitizeCostCode(trade.costCode) : undefined,
          quoteBreakdown: Array.isArray(trade.quoteBreakdown)
            ? trade.quoteBreakdown.map((item: any) => {
                let itemCode = item.costCode ? sanitizeCostCode(item.costCode) : 'unassigned';
                if (!isDemolition && itemCode === '20020') {
                  itemCode = finalScopeCostCode;
                }
                return {
                  ...item,
                  costCode: itemCode
                };
              })
            : trade.quoteBreakdown
        };
      });

    return {
      ...scope,
      costCode: finalScopeCostCode,
      trades: cleanTrades
    };
  });

  return {
    ...project,
    scopes: cleanScopes
  };
};



