import { Project, Contact, ScopeLineItem, TradeEntry, GoogleSheetsConfig } from '../types';

/**
 * Robust line-by-line CSV / TSV parser handling commas and escaped quotes
 */
export const parseCsvLine = (line: string, delimiter: ',' | '\t' = ','): string[] => {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"' || char === "'") {
      if (inQuotes && i + 1 < line.length && line[i + 1] === char) {
        current += char;
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === delimiter && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
};

/**
 * Robust full CSV / TSV text parser handling quoted multi-line fields.
 * Ensures newlines inside quoted fields (e.g. Column E Notes / Exclusions) NEVER break into separate rows.
 */
export const parseCsvTextToMatrix = (text: string, delimiter: ',' | '\t' = ','): string[][] => {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentCell = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];

    if (char === '"' || char === "'") {
      if (inQuotes && i + 1 < text.length && text[i + 1] === char) {
        currentCell += char;
        i++; // skip escaped quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === delimiter && !inQuotes) {
      currentRow.push(currentCell.trim());
      currentCell = '';
    } else if ((char === '\r' || char === '\n') && !inQuotes) {
      if (char === '\r' && i + 1 < text.length && text[i + 1] === '\n') {
        i++; // skip \n of \r\n
      }
      currentRow.push(currentCell.trim());
      currentCell = '';
      if (currentRow.some((cell) => cell.length > 0)) {
        rows.push(currentRow);
      }
      currentRow = [];
    } else {
      currentCell += char;
    }
  }

  if (currentCell.length > 0 || currentRow.length > 0) {
    currentRow.push(currentCell.trim());
    if (currentRow.some((cell) => cell.length > 0)) {
      rows.push(currentRow);
    }
  }

  return rows;
};

/**
 * Flexible Project Name Normalization
 * Normalizes project names before matching:
 * - Removes address suffixes (e.g. "Glenbrook 44 - 4503 37 AV SW" -> "glenbrook44")
 * - Strips all non-alphanumeric characters
 * - Converts to lower case
 */
export const normalizeProjectName = (name: unknown): string => {
  if (!name || typeof name !== 'string') return '';
  return name
    .toLowerCase()
    .replace(/\s*-\s*.*$/, '') // Removes address suffixes
    .replace(/[^a-z0-9]/g, '')
    .trim();
};

/**
 * Cost Code Sanitization
 * Extracts only valid 5-digit numeric strings for cost codes.
 * Rejects and drops any cost code string containing JavaScript code (e.g., function(a){return...}).
 * ELIMINATES HARDCODED FALLBACK TO 20020 (Demolition) -> returns 'unassigned'.
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

export interface CompiledSheetRow {
  companyName: string;
  project: string;
  itemDescription: string;
  tenderItemDescription?: string;
  amount: number;
  costCode?: string;
  notes?: string;
  formalQuoteDoc?: string;
  syncStatus?: string;
  phaseCode?: string;
  category?: string;
  contractorName?: string;
  rawRowIndex?: number;
}

export interface MasterTenderSyncRow {
  companyName: string;      // Col A (Index 0 / Company Name)
  projectName: string;      // Col B (Index 1 / Project Name)
  tenderItem: string;       // Col C (Index 2 / Tender Form Item)
  enteredAmount: number;    // Col D (Index 3 / Entered Amount ($))
  notes: string;            // Col E (Index 4 / Notes / Exclusions)
  docUrl: string;           // Col F (Index 5 / Formal Quote Link)
  costCode: string;         // Col G (Index 6 / Cost Code)
  syncStatus?: string;      // Col H (Index 7 / Sync Status)
  rawRowIndex?: number;
}

/**
 * Builds normalized key-to-index mapping for sheet headers
 */
export const buildHeaderMap = (headers: string[]): Record<string, number> => {
  const headerMap: Record<string, number> = {};
  headers.forEach((rawHeader, idx) => {
    const clean = String(rawHeader || '').toLowerCase().trim().replace(/['"]/g, '');
    headerMap[clean] = idx;

    // Fuzzy & canonical key assignments
    if (clean.includes('company') || clean.includes('contractor') || clean.includes('vendor')) {
      if (headerMap['company name'] === undefined) headerMap['company name'] = idx;
    }
    if (clean.includes('project') || clean.includes('job')) {
      if (headerMap['project name'] === undefined) headerMap['project name'] = idx;
    }
    if (
      clean.includes('tender form item') ||
      clean.includes('tender item') ||
      clean.includes('form item') ||
      clean.includes('item description') ||
      clean.includes('scope item') ||
      (clean.includes('item') && !clean.includes('cost'))
    ) {
      if (headerMap['tender form item'] === undefined) headerMap['tender form item'] = idx;
    }
    if (
      clean.includes('entered amount') ||
      clean.includes('amount ($)') ||
      (clean.includes('amount') && !clean.includes('budget')) ||
      clean.includes('price') ||
      clean.includes('figure')
    ) {
      if (headerMap['entered amount ($)'] === undefined) headerMap['entered amount ($)'] = idx;
    }
    if (clean.includes('notes') || clean.includes('exclusions') || clean.includes('exclusion') || clean.includes('remarks')) {
      if (headerMap['notes / exclusions'] === undefined) headerMap['notes / exclusions'] = idx;
    }
    if (
      clean.includes('formal quote link') ||
      clean.includes('formal quote') ||
      clean.includes('quote link') ||
      clean.includes('link') ||
      clean.includes('pdf') ||
      clean.includes('url') ||
      clean.includes('doc')
    ) {
      if (headerMap['formal quote link'] === undefined) headerMap['formal quote link'] = idx;
    }
    if (clean.includes('cost code') || clean.includes('costcode') || clean === 'code' || clean === 'csi') {
      if (headerMap['cost code'] === undefined) headerMap['cost code'] = idx;
    }
    if (clean.includes('sync status') || clean.includes('status')) {
      if (headerMap['sync status'] === undefined) headerMap['sync status'] = idx;
    }
  });
  return headerMap;
};

/**
 * Header-Based & Fallback Mapping Implementation
 * Supports the sheet layout:
 * Col A (Index 0 / Company Name): companyName - ONLY valid source for contractor entries
 * Col B (Index 1 / Project Name): projectName
 * Col C (Index 2 / Tender Form Item): tenderItem
 * Col D (Index 3 / Entered Amount ($)): enteredAmount
 * Col E (Index 4 / Notes / Exclusions): notes - NEVER parsed or split to create contractors
 * Col F (Index 5 / Formal Quote Link): docUrl
 * Col G (Index 6 / Cost Code): costCode - No fallback to 20020
 */
export const mapRowToSubmission = (
  row: (string | number | undefined | null)[],
  headerMap?: Record<string, number>
): MasterTenderSyncRow => {
  const getCol = (key: string, defaultIndex: number) => {
    if (headerMap && headerMap[key] !== undefined) {
      return row[headerMap[key]];
    }
    return row[defaultIndex];
  };

  const rawCostCode = getCol('cost code', 6);
  // Cost code extraction: valid 5-digit string or sanitize to 'unassigned' (never default to 20020)
  const costCodeClean = sanitizeCostCode(rawCostCode);

  return {
    companyName: String(getCol('company name', 0) || '').trim(),
    projectName: String(getCol('project name', 1) || '').trim(),
    tenderItem:  String(getCol('tender form item', 2) || '').trim(),
    enteredAmount: parseFloat(String(getCol('entered amount ($)', 3) || '0').replace(/[^0-9.-]+/g, '')) || 0,
    notes:       String(getCol('notes / exclusions', 4) || '').trim(),
    docUrl:      String(getCol('formal quote link', 5) || '').trim(),
    costCode:    costCodeClean,
    syncStatus:  String(getCol('sync status', 7) || 'PENDING').trim()
  };
};

export const masterSyncService = {
  sanitizeCostCode,
  isValidContractorName,
  normalizeProjectName,
  mapRowToSubmission,
  buildHeaderMap,

  /**
   * 1. Strict Index-Based Column Ingestion & Header-Based Mapping
   * When processing rows from Master Tender Sync, map fields strictly by headerMap or explicit array index:
   * Col A (Index 0 / Company Name): companyName
   * Col B (Index 1 / Project Name): projectName
   * Col C (Index 2 / Tender Form Item): tenderItem
   * Col D (Index 3 / Entered Amount ($)): enteredAmount
   * Col E (Index 4 / Notes / Exclusions): notes
   * Col F (Index 5 / Formal Quote Link): docUrl
   * Col G (Index 6 / Cost Code): costCode
   * 
   * CRITICAL: Do NOT map Index 4 (notes) or Index 5 (docUrl) into contractor name fields under any circumstances.
   */
  parseRowByIndex(
    row: (string | number | undefined | null)[],
    rowIndex = 0,
    headerMap?: Record<string, number>
  ): MasterTenderSyncRow | null {
    if (!row || !Array.isArray(row) || row.length === 0) return null;

    const submission = mapRowToSubmission(row, headerMap);
    submission.rawRowIndex = rowIndex;

    // STRICT SAFEGUARD: Contractor names must ONLY originate from Column A (Company Name).
    // Never allow notes (Index 4) or docUrl (Index 5) to leak into contractor name.
    // If a row value contains newline characters or keywords like thermostats, grilles, inclusions:, or exclusions:, reject it.
    const companyName = submission.companyName;
    if (
      !companyName ||
      !isValidContractorName(companyName) ||
      companyName === submission.notes ||
      companyName === submission.docUrl
    ) {
      return null;
    }

    return submission;
  },

  /**
   * Parse full Master Tender Sync CSV or TSV text with header-based & fallback index mapping.
   * Handles multi-line quoted fields properly without splitting notes across rows.
   */
  parseSyncRows(rawInput: unknown[][] | string): CompiledSheetRow[] {
    if (!rawInput) return [];

    let matrix: unknown[][] = [];
    let headerMap: Record<string, number> | undefined = undefined;

    if (typeof rawInput === 'string') {
      const delimiter = rawInput.includes('\t') ? '\t' : ',';
      const matrixRows = parseCsvTextToMatrix(rawInput, delimiter);
      if (matrixRows.length === 0) return [];

      const firstRowTokens = matrixRows[0];
      const headerTokens = firstRowTokens.map((c) =>
        c.toLowerCase().replace(/['"]/g, '').trim()
      );

      // Detect if row 0 is a header row
      const isHeaderRow = headerTokens.some((h) =>
        h.includes('company') ||
        h.includes('contractor') ||
        h.includes('project') ||
        h.includes('item') ||
        h.includes('cost code') ||
        h.includes('costcode') ||
        h.includes('amount') ||
        h.includes('notes') ||
        h.includes('quote')
      );

      if (isHeaderRow) {
        headerMap = buildHeaderMap(firstRowTokens);
        matrix = matrixRows.slice(1);
      } else {
        matrix = matrixRows;
      }
    } else if (Array.isArray(rawInput)) {
      if (rawInput.length > 0) {
        const firstRow = rawInput[0];
        if (Array.isArray(firstRow)) {
          const firstRowTokens = firstRow.map((c) => String(c || '').toLowerCase().trim());
          const isHeaderRow = firstRowTokens.some((h) =>
            h.includes('company') ||
            h.includes('contractor') ||
            h.includes('project') ||
            h.includes('item') ||
            h.includes('cost code') ||
            h.includes('costcode') ||
            h.includes('amount') ||
            h.includes('notes') ||
            h.includes('quote')
          );
          if (isHeaderRow) {
            headerMap = buildHeaderMap(firstRow.map((c) => String(c || '')));
            matrix = rawInput.slice(1);
          } else {
            matrix = rawInput;
          }
        } else {
          matrix = rawInput;
        }
      }
    }

    const compiledRows: CompiledSheetRow[] = [];

    for (let i = 0; i < matrix.length; i++) {
      const row = matrix[i] as (string | number | undefined | null)[];
      const parsedRow = this.parseRowByIndex(row, i + 1, headerMap);
      if (!parsedRow) continue;

      // 3. Contractor Validation: Apply strict validation before creating contractor row
      if (!isValidContractorName(parsedRow.companyName)) {
        continue; // Drop row if companyName fails validation
      }

      compiledRows.push({
        companyName: parsedRow.companyName,
        project: parsedRow.projectName || 'Active Project',
        itemDescription: parsedRow.tenderItem || (parsedRow.costCode && parsedRow.costCode !== 'unassigned' ? `Cost Code ${parsedRow.costCode}` : 'Tender Package Item'),
        tenderItemDescription: parsedRow.tenderItem || (parsedRow.costCode && parsedRow.costCode !== 'unassigned' ? `Cost Code ${parsedRow.costCode}` : 'Tender Package Item'),
        costCode: parsedRow.costCode,
        amount: parsedRow.enteredAmount,
        notes: parsedRow.notes || undefined,
        formalQuoteDoc: parsedRow.docUrl || undefined,
        syncStatus: parsedRow.syncStatus || 'PENDING',
        rawRowIndex: i + 1
      });
    }

    return compiledRows;
  },

  /**
   * Auto-Purge: Delete all existing cards and contacts where companyName or contractorName
   * fails isValidContractorName, matches newline items, or contains newline characters.
   * Also sanitizes cost codes away from 20020 fallback.
   */
  purgeInvalidContractors(
    projects: Project[],
    contacts: Contact[]
  ): {
    purgedProjects: Project[];
    purgedContacts: Contact[];
    purgedCardsCount: number;
    purgedContactsCount: number;
  } {
    let purgedCardsCount = 0;
    let purgedContactsCount = 0;

    // Purge cards (TradeEntry items in scopes)
    const purgedProjects = (projects || []).map((project) => {
      const cleanScopes = (project.scopes || []).map((scope: ScopeLineItem) => {
        const validTrades = (scope.trades || []).filter((trade: TradeEntry) => {
          const validCompany = isValidContractorName(trade.companyName);
          const validContractor = isValidContractorName(trade.contractorName);
          const isValid = validCompany && validContractor;

          if (!isValid) {
            purgedCardsCount++;
            return false;
          }
          return true;
        }).map((trade: TradeEntry) => {
          const cleanContractor = isValidContractorName(trade.contractorName)
            ? trade.contractorName.trim()
            : trade.companyName.trim();

          const sanitizedTradeCode = trade.costCode ? sanitizeCostCode(trade.costCode) : undefined;

          const sanitizedBreakdown = Array.isArray(trade.quoteBreakdown)
            ? trade.quoteBreakdown.map((item) => ({
                ...item,
                costCode: item.costCode ? sanitizeCostCode(item.costCode) : 'unassigned'
              }))
            : trade.quoteBreakdown;

          return {
            ...trade,
            companyName: trade.companyName.trim(),
            contractorName: cleanContractor,
            costCode: sanitizedTradeCode,
            quoteBreakdown: sanitizedBreakdown
          };
        });

        const sanitizedScopeCode = scope.costCode ? sanitizeCostCode(scope.costCode) : 'unassigned';

        return {
          ...scope,
          costCode: sanitizedScopeCode,
          trades: validTrades
        };
      });

      return {
        ...project,
        scopes: cleanScopes
      };
    });

    // Purge contacts
    const purgedContacts = (contacts || []).filter((contact) => {
      const validCompany = isValidContractorName(contact.company);
      const validName = isValidContractorName(contact.name);
      const isValid = validCompany || validName;
      if (!isValid) {
        purgedContactsCount++;
        return false;
      }
      return true;
    });

    return {
      purgedProjects,
      purgedContacts,
      purgedCardsCount,
      purgedContactsCount
    };
  },

  /**
   * Legacy inbound sheet polling disabled - Firestore-First Architecture active.
   * All quote updates stream via /api/webhooks/form-submit and real-time listeners.
   */
  async fetchSheetData() {
    console.info('[masterSyncService] Inbound sheet polling disabled. Using real-time Firestore webhook sync.');
    return { rows: [], rawText: '' };
  }
};

