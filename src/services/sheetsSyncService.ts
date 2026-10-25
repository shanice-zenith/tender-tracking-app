import { 
  Project, 
  ScopeLineItem, 
  GoogleSheetsConfig, 
  SyncLogEntry, 
  AttachedDoc, 
  TradeEntry, 
  QuoteBreakdownItem,
  PhaseId,
  Contact,
  MasterSheetRow
} from '../types';
import { MASTER_SCOPE_TEMPLATES, generateScopesFromTemplate } from '../data/projectTemplates';
import { getTenderTemplateSpecs, findScopeTemplateByCostCode } from '../data/tenderBreakdownTemplates';
import { storageService } from './storageService';
import { dbService } from './databaseService';
import { masterSyncService, sanitizeCostCode, isValidContractorName, normalizeProjectName } from './masterSyncService';
import { isExampleOrMockTerm, isValidProjectName } from '../utils/projectValidation';

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
  email?: string;
  rawRowIndex?: number;
}

export interface MultiProjectSyncResult {
  updatedProjects: Project[];
  newContacts: Contact[];
  log: SyncLogEntry;
  totalRowsProcessed: number;
  allocatedQuotesCount: number;
  projectBreakdown: {
    projectName: string;
    projectId: string;
    scopesUpdated: number;
    quotesUpdated: number;
    totalAmountQuoted: number;
  }[];
}

// Scope category and keyword matching dictionary to allocate items to the right Phase and Scope
const SCOPE_KEYWORD_MAP: { phaseId: PhaseId; targetScopeName: string; keywords: string[] }[] = [
  // Phase 1A
  {
    phaseId: '1A',
    targetScopeName: 'Demolition',
    keywords: ['demolition', 'demo', 'abatement', 'tear down', 'structure removal', 'asbestos']
  },
  {
    phaseId: '1A',
    targetScopeName: 'Excavation, Other Earthworks & DSSP Install',
    keywords: ['excavation', 'earthworks', 'backfill', 'rough grading', 'dssp install', 'drain rock', 'coring', 'trenching', 'subgrade']
  },
  {
    phaseId: '1A',
    targetScopeName: 'DSSP Materials',
    keywords: ['dssp material', 'hydrovex', 'catch basin', 'storm tank', 'manhole cover', 'area drain', 'sewer pipe', 'emco']
  },
  {
    phaseId: '1A',
    targetScopeName: 'Water & Offsite Services',
    keywords: ['water & offsite', 'underground service', 'offsite', 'water tie-in', 'permission to permit', 'main line', 'sanitary sewer tie-in']
  },
  {
    phaseId: '1A',
    targetScopeName: 'Footing & Foundation',
    keywords: ['foundation', 'footing', 'cribbing', 'rebar', 'ladder package', 'window buckout', 'retaining wall', 'concrete formwork']
  },
  {
    phaseId: '1A',
    targetScopeName: 'Basement Slab/ Garage Slab/ Weeping & Gravel',
    keywords: ['basement slab', 'garage slab', 'weeping tile', 'damp proofing', 'slab gravel', 'underslab poly', 'vapor barrier slab']
  },
  {
    phaseId: '1A',
    targetScopeName: 'Framing Materials',
    keywords: ['framing material', 'lumber', 'truss', 'joist', 'plywood', 'osb', 'studs', 'engineered wood', 'lvl', 'sheathing']
  },
  {
    phaseId: '1A',
    targetScopeName: 'Window Wells',
    keywords: ['window well', 'corrugated well', 'areaway', 'escape well']
  },
  {
    phaseId: '1A',
    targetScopeName: 'Exterior Doors & Windows',
    keywords: ['window', 'exterior door', 'glazing', 'patio door', 'durabuilt', 'triple pane', 'entry door']
  },
  {
    phaseId: '1A',
    targetScopeName: 'Window Sealant',
    keywords: ['window sealant', 'sealant', 'caulking', 'joint sealant', 'weatherproofing sealant']
  },
  {
    phaseId: '1A',
    targetScopeName: 'Plumbing & Gas Rough In and Final',
    keywords: ['plumbing & gas', 'plumbing rough', 'gas rough', 'plumbing permit', 'gas line', 'drain waste vent', 'water line rough']
  },
  {
    phaseId: '1A',
    targetScopeName: 'Electrical Rough-in and Final',
    keywords: ['electrical rough', 'electrical final', 'panel upgrade', '200a', 'wiring', 'conduit', 'service entrance']
  },
  {
    phaseId: '1A',
    targetScopeName: 'HVAC',
    keywords: ['hvac', 'heating', 'furnace', 'air conditioning', 'ductwork', 'ventilation', 'heat pump', 'hrv']
  },
  {
    phaseId: '1A',
    targetScopeName: 'Precast Steps',
    keywords: ['precast steps', 'concrete step', 'precast stair']
  },

  // Phase 1B
  {
    phaseId: '1B',
    targetScopeName: 'Framing Labour',
    keywords: ['framing labour', 'framing labor', 'framer', 'framing crew', '20320', 'wood framing labour', 'carpenter']
  },
  {
    phaseId: '1B',
    targetScopeName: 'Interior Stairs',
    keywords: ['interior stairs', 'stairs', 'staircase', '20330', 'stair install', 'wooden stairs', 'brydon stairs']
  },
  {
    phaseId: '1B',
    targetScopeName: 'Roofing',
    keywords: ['roofing', 'shingles', 'membrane roof', 'torch on', 'flat roof', 'garage roof', 'sloped roof', '20510', '20520', '21820', 'royalz roofing']
  },
  {
    phaseId: '1B',
    targetScopeName: 'Decking',
    keywords: ['decking', 'deck', 'exterior deck', '20530', 'deck boards', 'patio decking']
  },
  {
    phaseId: '1B',
    targetScopeName: 'Rainware',
    keywords: ['rainware', 'gutters', 'downspouts', 'eavestrough', '20540', 'continuous gutters']
  },
  {
    phaseId: '1B',
    targetScopeName: 'Exterior Finishing',
    keywords: ['exterior finishing', 'cladding', 'hardie', 'siding', 'soffit', 'fascia', '20630', '20640', 'board and batten']
  },
  {
    phaseId: '1B',
    targetScopeName: 'Masonry',
    keywords: ['masonry', 'stone veneer', 'brick', 'masonry supply', 'masonry install', '20610', 'stone masonry']
  },
  {
    phaseId: '1B',
    targetScopeName: 'Stucco',
    keywords: ['stucco', 'acrylic stucco', 'stucco main', 'stucco garage', '20620', 'wire mesh stucco']
  },
  {
    phaseId: '1B',
    targetScopeName: 'Sprinkler System',
    keywords: ['sprinkler system', 'fire sprinkler', 'sprinklers', 'fire suppression', '20730', 'nfpa 13d', 'troy life']
  },
  {
    phaseId: '1B',
    targetScopeName: 'Fireplace',
    keywords: ['fireplace', 'gas fireplace', 'linear fireplace', '20740', 'fireplace supply', 'fireplace install']
  },
  {
    phaseId: '1B',
    targetScopeName: 'Drywall & Insulation',
    keywords: ['drywall & insulation', 'drywall', 'sheetrock', 'gypsum', 'taping', 'batt insulation', '21110', 'drywall garage', 'drywall main']
  },
  {
    phaseId: '1B',
    targetScopeName: 'Spray Foam',
    keywords: ['spray foam', 'sprayfoam', 'closed cell spray foam', '21130', 'thermal spray foam', 'polyurethane foam']
  },
  {
    phaseId: '1B',
    targetScopeName: 'Cabinets & Built-Ins',
    keywords: ['cabinets & built-ins', 'cabinets', 'millwork', 'built-ins', 'cabinetry', 'vanities', 'kitchen cabinets', '21420']
  },

  // Phase 2A
  {
    phaseId: '2A',
    targetScopeName: 'Countertops',
    keywords: ['countertop', 'quartz', 'granite', 'island slab', 'waterfall edge', 'sink cutout', 'stone gallery']
  },
  {
    phaseId: '2A',
    targetScopeName: 'Plumbing Fixtures',
    keywords: ['plumbing fixture', 'faucet', 'toilet', 'shower trim', 'undermount sink', 'tub', 'vanity fixture', 'robinson']
  },
  {
    phaseId: '2A',
    targetScopeName: 'Lighting Fixtures',
    keywords: ['lighting fixture', 'potlight', 'pendant', 'chandelier', 'vanity light', 'luminaire', 'led strip', 'dhillon']
  },
  {
    phaseId: '2A',
    targetScopeName: 'Appliances',
    keywords: ['appliance', 'refrigerator', 'fridge', 'range', 'cooktop', 'dishwasher', 'hood fan', 'microwave', 'trail appliance']
  },
  {
    phaseId: '2A',
    targetScopeName: 'Interior Railings',
    keywords: ['interior railing', 'handrail', 'spindle', 'glass railing interior', 'stair guard']
  },
  {
    phaseId: '2A',
    targetScopeName: 'Tile and Flooring Material',
    keywords: ['tile material', 'flooring material', 'lvp material', 'hardwood supply', 'carpet roll', 'underlay', 'porcelain tile']
  },

  // Phase 2B
  {
    phaseId: '2B',
    targetScopeName: 'Finishing Materials',
    keywords: ['finishing material', 'interior door', 'baseboard', 'casing', 'moulding', 'trim', 'lockout', 'door handle', 'deadbolt', 'windsor plywood']
  },
  {
    phaseId: '2B',
    targetScopeName: 'Tile Labour',
    keywords: ['tile labour', 'tile labor', 'tile install', 'shower pan install', 'schluter', 'backsplash install', 'grouting']
  },
  {
    phaseId: '2B',
    targetScopeName: 'Flooring Labour',
    keywords: ['flooring labour', 'flooring labor', 'flooring install', 'lvp install', 'carpet install', 'stair nosing install']
  },
  {
    phaseId: '2B',
    targetScopeName: 'Interior Glass and Mirrors',
    keywords: ['interior glass', 'shower glass', 'mirror', 'wire shelving', 'closet organizer', 'closet shelving', 'gym mirror']
  },
  {
    phaseId: '2B',
    targetScopeName: 'Window Coverings',
    keywords: ['window covering', 'blinds', 'shades', 'roller blind', 'drapes', 'blackout shade']
  },

  // Phase 3
  {
    phaseId: '3',
    targetScopeName: 'Exterior Flatwork (Sidewalk, Aprons, etc.)',
    keywords: ['exterior flatwork', 'driveway', 'sidewalk', 'apron', 'curb', 'walkway', 'patio concrete', 'stoop', 'landing pad']
  },
  {
    phaseId: '3',
    targetScopeName: 'Garage Overhead Door (OHD)',
    keywords: ['overhead door', 'ohd', 'garage door', 'liftmaster', 'sectional door', 'door motor']
  },
  {
    phaseId: '3',
    targetScopeName: 'Garage Exterior Door',
    keywords: ['garage exterior door', 'garage man door', 'garage side door']
  },
  {
    phaseId: '3',
    targetScopeName: 'Exterior Stairs',
    keywords: ['exterior stair', 'exterior steps', 'deck stair', 'metal exterior stairs']
  },
  {
    phaseId: '3',
    targetScopeName: 'Exterior Railings',
    keywords: ['exterior railing', 'deck railing', 'balcony guard', 'aluminum railing exterior']
  },
  {
    phaseId: '3',
    targetScopeName: 'Landscaping & Fencing',
    keywords: ['landscaping', 'fencing', 'sod', 'tree', 'decorative rock', 'irrigation', 'fence panel', 'hydroseed', 'mulch']
  }
];

export const sheetsSyncService = {
  // Convert standard Google Sheet edit link to CSV export link if needed
  formatCsvUrl(url: string): string {
    if (!url) return '';
    const cleanUrl = url.trim();
    if (cleanUrl.includes('/edit')) {
      return cleanUrl.replace(/\/edit.*$/, '/export?format=csv');
    }
    return cleanUrl;
  },

  // Robust line-by-line CSV / TSV parser handling commas inside quotes
  parseCsvLine(line: string, delimiter: ',' | '\t' = ','): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"' || char === "'") {
        if (inQuotes && i + 1 < line.length && line[i + 1] === char) {
          // Escaped quote
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
  },

  /**
   * parseSyncRows: Master Tender Sync row parsing logic with explicit 0-based column index mapping
   * 
   * Explicit Column Index Assignments (0-based indexing):
   * companyName  ➔ row[0] (Column A)
   * projectName  ➔ row[1] (Column B)
   * tenderItem   ➔ row[2] (Column C)
   * costCode     ➔ row[3] (Column D — e.g., "20330", "20530")
   * quotedAmount ➔ row[4] (Column E — e.g., 2,950.25, 1,476.75)
   * notes        ➔ row[5] (Column F)
   * quoteLink    ➔ row[6] (Column G)
   * synced       ➔ row[7] (Column H)
   */
  parseSyncRows(rawInput: unknown[][] | string): CompiledSheetRow[] {
    return masterSyncService.parseSyncRows(rawInput);
  },

  // Parse multi-project compiled sheet CSV / TSV text with explicit column index mapping & numeric safeguard
  parseCompiledSheet(rawText: string | unknown): CompiledSheetRow[] {
    if (!rawText || typeof rawText !== 'string' || !rawText.trim()) return [];
    return masterSyncService.parseSyncRows(rawText);
  },

  // Normalize document URL for exact attachment deduplication
  normalizeDocUrl(url?: string): string {
    if (!url) return '';
    let clean = url.trim();
    if (clean.includes('docs.google.com/viewer') && clean.includes('url=')) {
      try {
        const idx = clean.indexOf('url=');
        if (idx !== -1) {
          clean = decodeURIComponent(clean.substring(idx + 4).split('&')[0]);
        }
      } catch {
        // fallback
      }
    }
    return clean.replace(/\/+$/, '').toLowerCase();
  },

  // Match a row to the right project in the workspace
  matchProject(rowProjectStr: string, existingProjects: Project[]): Project | null {
    if (!rowProjectStr || existingProjects.length === 0) {
      return null;
    }

    // Ignore and bypass any project string containing mock/demo/sample terms
    if (isExampleOrMockTerm(rowProjectStr)) {
      return null;
    }

    const normInput = normalizeProjectName(rowProjectStr);
    const cleanInput = rowProjectStr.trim().toLowerCase();

    // 1. Normalized match (flexible project name normalization: removes address suffixes and special chars)
    if (normInput) {
      const normalizedMatch = existingProjects.find((p) => {
        const normName = normalizeProjectName(p.name);
        const normCode = normalizeProjectName(p.code);
        return normName === normInput || normCode === normInput;
      });
      if (normalizedMatch) return normalizedMatch;
    }

    // 2. Exact match on name or code or id
    const exact = existingProjects.find(
      (p) =>
        p.name.toLowerCase() === cleanInput ||
        p.code.toLowerCase() === cleanInput ||
        p.id.toLowerCase() === cleanInput
    );
    if (exact) return exact;

    // 3. Substring matching on normalized strings (e.g. "glenbrook44" matches "glenbrook444503")
    if (normInput.length >= 3) {
      const normSubMatch = existingProjects.find((p) => {
        const normName = normalizeProjectName(p.name);
        const normCode = normalizeProjectName(p.code);
        return (
          (normName.length >= 3 && (normName.includes(normInput) || normInput.includes(normName))) ||
          (normCode.length >= 3 && (normCode.includes(normInput) || normInput.includes(normCode)))
        );
      });
      if (normSubMatch) return normSubMatch;
    }

    // 4. Substring matching on clean raw string
    const substring = existingProjects.find(
      (p) =>
        p.name.toLowerCase().includes(cleanInput) ||
        cleanInput.includes(p.name.toLowerCase()) ||
        p.code.toLowerCase().includes(cleanInput)
    );
    if (substring) return substring;

    // 5. Keyword matching on project name tokens
    const words = cleanInput.split(/[\s,.-]+/).filter((w) => w.length > 2);
    for (const project of existingProjects) {
      const pNameLower = project.name.toLowerCase();
      if (words.some((w) => pNameLower.includes(w))) {
        return project;
      }
    }

    // Do NOT default to existingProjects[0] - strictly return null if unverified/unmatched
    return null;
  },

  // Match an item description and/or cost code to the right Scope and Phase
  matchScopeAndPhase(
    itemDesc: string,
    existingScopes: ScopeLineItem[],
    explicitPhaseCode?: string,
    costCode?: string
  ): { targetScope: ScopeLineItem | null; targetPhaseId: PhaseId; suggestedScopeName: string } {
    const cleanDesc = (itemDesc || '').toLowerCase().trim();
    const cleanCostCode = (costCode || '').trim();

    // 1. Direct Cost Code Routing: If Cost Code is provided from Column G, route directly to matching scope
    if (cleanCostCode && cleanCostCode !== 'unassigned' && cleanCostCode !== '20020') {
      // 1a. Check if an existing scope already has this cost code explicitly assigned
      const scopeByCode = existingScopes.find(
        (s) => s.costCode && s.costCode.trim().toLowerCase() === cleanCostCode.toLowerCase()
      );
      if (scopeByCode) {
        return {
          targetScope: scopeByCode,
          targetPhaseId: scopeByCode.phaseId,
          suggestedScopeName: scopeByCode.name
        };
      }

      // 1b. Look up canonical scope package mapping in TENDER_FORM_TEMPLATES
      const templateMatch = findScopeTemplateByCostCode(cleanCostCode);
      if (templateMatch) {
        const matchingScope = existingScopes.find(
          (s) => s.name.toLowerCase().trim() === templateMatch.scopeName.toLowerCase().trim()
        );
        if (matchingScope) {
          return {
            targetScope: matchingScope,
            targetPhaseId: matchingScope.phaseId,
            suggestedScopeName: matchingScope.name
          };
        }
      }

      // 1c. Check if any scope has a trade whose quote breakdown contains this cost code
      const scopeWithBreakdownCode = existingScopes.find((s) =>
        s.trades && s.trades.some((t) =>
          t.quoteBreakdown && t.quoteBreakdown.some((b) => b.costCode && b.costCode.trim().toLowerCase() === cleanCostCode.toLowerCase())
        )
      );
      if (scopeWithBreakdownCode) {
        return {
          targetScope: scopeWithBreakdownCode,
          targetPhaseId: scopeWithBreakdownCode.phaseId,
          suggestedScopeName: scopeWithBreakdownCode.name
        };
      }
    }

    // 2. If explicit phase code provided (1A, 1B, 2A, 2B, 3)
    let explicitPhase: PhaseId | null = null;
    if (explicitPhaseCode) {
      const match = explicitPhaseCode.toUpperCase().match(/(1A|1B|2A|2B|3)/);
      if (match) {
        explicitPhase = match[1] as PhaseId;
      }
    }

    // 3. Exact or substring match on existing scopes in current project
    if (cleanDesc) {
      const exactScope = existingScopes.find((s) => {
        const sNameLower = s.name.toLowerCase();
        const sDescLower = s.description.toLowerCase();
        const matchesPhase = !explicitPhase || s.phaseId === explicitPhase;
        return (
          matchesPhase &&
          (sNameLower === cleanDesc ||
            sNameLower.includes(cleanDesc) ||
            cleanDesc.includes(sNameLower) ||
            sDescLower.includes(cleanDesc))
        );
      });

      if (exactScope) {
        return {
          targetScope: exactScope,
          targetPhaseId: exactScope.phaseId,
          suggestedScopeName: exactScope.name
        };
      }

      // 4. Match against Master Keyword Map
      for (const rule of SCOPE_KEYWORD_MAP) {
        if (explicitPhase && rule.phaseId !== explicitPhase) continue;

        const hasKeyword = rule.keywords.some((kw) => cleanDesc.includes(kw));
        if (hasKeyword) {
          // Find existing scope with that target name
          const matchedScope = existingScopes.find(
            (s) => s.phaseId === rule.phaseId && s.name.toLowerCase() === rule.targetScopeName.toLowerCase()
          );
          if (matchedScope) {
            return {
              targetScope: matchedScope,
              targetPhaseId: rule.phaseId,
              suggestedScopeName: rule.targetScopeName
            };
          }
          return {
            targetScope: null,
            targetPhaseId: rule.phaseId,
            suggestedScopeName: rule.targetScopeName
          };
        }
      }
    }

    // 5. If template matched by cost code, use suggested scope name
    if (cleanCostCode && cleanCostCode !== 'unassigned' && cleanCostCode !== '20020') {
      const templateMatch = findScopeTemplateByCostCode(cleanCostCode);
      if (templateMatch) {
        const matchingScope = existingScopes.find(
          (s) => s.name.toLowerCase().trim() === templateMatch.scopeName.toLowerCase().trim()
        );
        if (matchingScope) {
          return {
            targetScope: matchingScope,
            targetPhaseId: matchingScope.phaseId,
            suggestedScopeName: matchingScope.name
          };
        }
        const templatePhase = MASTER_SCOPE_TEMPLATES.find(
          (t) => t.name.toLowerCase().trim() === templateMatch.scopeName.toLowerCase().trim()
        )?.phaseId || explicitPhase || '1A';
        return {
          targetScope: null,
          targetPhaseId: templatePhase,
          suggestedScopeName: templateMatch.scopeName
        };
      }
    }

    // 6. ELIMINATE DEFAULT DEMOLITION / 20020 FALLBACK:
    // If a quote submission does not have an exact matching cost code or item description,
    // mark it as unassigned rather than dumping it into Demolition or Cost Code 20020.
    const fallbackPhase: PhaseId = explicitPhase || '1A';
    const unassignedScope = existingScopes.find(
      (s) =>
        s.name.toLowerCase() === 'unassigned quotes' ||
        s.name.toLowerCase() === 'unassigned' ||
        s.costCode === 'unassigned'
    );

    if (unassignedScope) {
      return {
        targetScope: unassignedScope,
        targetPhaseId: unassignedScope.phaseId,
        suggestedScopeName: unassignedScope.name
      };
    }

    return {
      targetScope: null,
      targetPhaseId: fallbackPhase,
      suggestedScopeName: 'Unassigned Quotes'
    };
  },

  // Allocate all compiled rows across all projects, calculate totals, and link formal quotes
  processCompiledRows(
    rows: CompiledSheetRow[],
    currentProjects: Project[],
    existingContacts: Contact[]
  ): MultiProjectSyncResult {
    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const nowTimeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const todayIsoDate = new Date().toISOString().split('T')[0];

    // Deep clone active, real projects (filter out any mock/example projects)
    const clonedProjects: Project[] = JSON.parse(JSON.stringify(currentProjects || []))
      .filter((p: Project) => p && !isExampleOrMockTerm(p.name) && !isExampleOrMockTerm(p.id) && !isExampleOrMockTerm(p.code) && isValidProjectName(p.name));
    const newContactsList: Contact[] = [...existingContacts];

    let totalAllocatedQuotes = 0;
    const projectStatsMap = new Map<
      string,
      { projectName: string; projectId: string; scopesUpdated: Set<string>; quotesUpdated: number; totalAmount: number }
    >();

    // Initialize stats map for each project
    clonedProjects.forEach((p) => {
      projectStatsMap.set(p.id, {
        projectName: p.name,
        projectId: p.id,
        scopesUpdated: new Set<string>(),
        quotesUpdated: 0,
        totalAmount: 0
      });
    });

    // Group rows by [Project, Scope/Phase, Company]
    for (const row of rows) {
      if (!row.companyName && !row.project) continue;
      if (!isValidContractorName(row.companyName)) continue;

      // STRICT FILTER: Ignore and bypass any sheet row where Project Name, Trade, or Description
      // contains terms such as "Demo", "Example", "Test", "Sample", "Template", or "Mock"
      if (
        isExampleOrMockTerm(row.project) ||
        isExampleOrMockTerm(row.companyName) ||
        isExampleOrMockTerm(row.contractorName) ||
        isExampleOrMockTerm(row.itemDescription) ||
        isExampleOrMockTerm(row.tenderItemDescription) ||
        isExampleOrMockTerm(row.category)
      ) {
        continue;
      }

      if (row.costCode) {
        row.costCode = sanitizeCostCode(row.costCode);
      }

      // 1. Allocate to Project: Strictly match active, real projects created by Shanice or Nadia.
      // Do NOT create template or example project records in Firestore from spreadsheet rows.
      const targetProject = this.matchProject(row.project, clonedProjects);
      if (!targetProject || isExampleOrMockTerm(targetProject.name) || isExampleOrMockTerm(targetProject.id)) {
        continue;
      }

      const pStats = projectStatsMap.get(targetProject.id);
      if (!pStats) continue;

      // 2. Allocate to Scope & Phase with Direct Cost Code Routing
      const { targetScope, targetPhaseId, suggestedScopeName } = this.matchScopeAndPhase(
        row.itemDescription,
        targetProject.scopes,
        row.phaseCode,
        row.costCode
      );

      let actualScope = targetScope;
      if (!actualScope) {
        // Create new scope line item if missing in that phase
        const isUnassignedScope = suggestedScopeName === 'Unassigned Quotes' || suggestedScopeName === 'Unassigned';
        const finalScopeCode = (!row.costCode || row.costCode === '20020' || isUnassignedScope)
          ? 'unassigned'
          : row.costCode;
        const newScopeId = `scope-${targetPhaseId.toLowerCase()}-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
        const newScope: ScopeLineItem = {
          id: newScopeId,
          phaseId: targetPhaseId,
          name: suggestedScopeName,
          costCode: finalScopeCode,
          description: isUnassignedScope
            ? 'Unassigned quotes and items without an exact matching cost code'
            : `Total for ${suggestedScopeName} (excl. GST)`,
          budgetAmount: Math.max(row.amount * 1.05, 25000),
          trades: [],
          isRequired: true,
          order: targetProject.scopes.filter((s) => s.phaseId === targetPhaseId).length + 1,
          createdAt: new Date().toISOString()
        };
        targetProject.scopes.push(newScope);
        actualScope = newScope;
      }

      if (!actualScope.costCode || actualScope.costCode === '20020') {
        actualScope.costCode = (row.costCode && row.costCode !== '20020') ? row.costCode : 'unassigned';
      }

      pStats.scopesUpdated.add(actualScope.id);

      // 3. Ensure Contact exists in central contacts list (Deduplicate by email or company name)
      const cleanCompany = row.companyName.trim();
      const cleanEmail = (row.email || '').trim().toLowerCase();
      const cleanContractorName = isValidContractorName(row.contractorName) && row.contractorName !== cleanCompany
        ? row.contractorName!.trim()
        : cleanCompany;

      let contact = newContactsList.find((c) => {
        const matchEmail = Boolean(cleanEmail && c.email && c.email.toLowerCase().trim() === cleanEmail);
        const matchCompany = Boolean(c.company && c.company.toLowerCase().trim() === cleanCompany.toLowerCase());
        const matchName = Boolean(c.name && c.name.toLowerCase().trim() === cleanCompany.toLowerCase());
        return matchEmail || matchCompany || matchName;
      });

      if (!contact) {
        const contactId = cleanEmail && cleanEmail.includes('@')
          ? `cnt-em-${cleanEmail.replace(/[^a-z0-9]/g, '_').slice(0, 48)}`
          : `cnt-co-${cleanCompany.toLowerCase().replace(/[^a-z0-9]/g, '_').slice(0, 48)}`;

        const newContact: Contact = {
          id: contactId,
          name: cleanContractorName,
          company: cleanCompany,
          category: row.category || actualScope.name,
          categories: [row.category || actualScope.name],
          trade_categories: [row.category || actualScope.name],
          phone: '',
          email: cleanEmail || '',
          notes: `Auto-registered via Google Sheets compiled sync (${targetProject.name})`,
          createdAt: new Date().toISOString()
        };
        newContactsList.push(newContact);
        contact = newContact;
      } else {
        // Update existing record rather than inserting duplicate entries
        if (cleanEmail && !contact.email) {
          contact.email = cleanEmail;
        }
        if (cleanContractorName && (!contact.name || contact.name === contact.company)) {
          contact.name = cleanContractorName;
        }
      }

      // Normalize incoming formal quote doc link for deduplication
      const rawDoc = row.formalQuoteDoc ? row.formalQuoteDoc.trim() : '';
      const isUrl = rawDoc.startsWith('http://') || rawDoc.startsWith('https://');
      const finalDocUrl = rawDoc ? (isUrl ? rawDoc : `https://docs.google.com/viewer?url=${encodeURIComponent(rawDoc)}`) : '';
      const normalizedIncomingDocUrl = finalDocUrl ? this.normalizeDocUrl(finalDocUrl) : '';

      // 4. Find or create TradeEntry under the matched scope
      // "Before adding an incoming quote attachment to a scope item, check if the Formal Quote Link already exists for that contractor under that scope.
      // If the attachment URL matches an existing entry, update the existing quote record instead of creating a duplicate row."
      // Allow a single contractor (e.g., Artisan Masonry, FOXSTONE Exteriors) to receive multiple imported rows from Master Tender Sync.
      const cleanCompanyLower = cleanCompany.toLowerCase();
      const normCleanComp = cleanCompanyLower.replace(/[^a-z0-9]/g, '');

      let trade = actualScope.trades.find((t) => {
        const tCompLower = t.companyName.trim().toLowerCase();
        const tContLower = t.contractorName.trim().toLowerCase();
        const normTComp = tCompLower.replace(/[^a-z0-9]/g, '');
        const normTCont = tContLower.replace(/[^a-z0-9]/g, '');

        const isExactMatch =
          tCompLower === cleanCompanyLower ||
          tContLower === cleanCompanyLower ||
          (row.contractorName && tContLower === row.contractorName.trim().toLowerCase());

        const isNormMatch = normCleanComp.length >= 6 && (
          normTComp === normCleanComp ||
          normTComp.includes(normCleanComp) ||
          normCleanComp.includes(normTComp) ||
          normTCont.includes(normCleanComp) ||
          normCleanComp.includes(normTCont)
        );

        // Check if the Formal Quote Link already exists for that contractor under that scope
        const hasMatchingAttachment = normalizedIncomingDocUrl
          ? t.attachedDocs.some((d) => this.normalizeDocUrl(d.url) === normalizedIncomingDocUrl)
          : false;

        if (normalizedIncomingDocUrl && hasMatchingAttachment) {
          return true; // Match found by Formal Quote Link!
        }

        return isExactMatch || isNormMatch;
      });

      if (!trade) {
        const newTradeId = `t-${actualScope.id}-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
        trade = {
          id: newTradeId,
          scopeId: actualScope.id,
          contactId: contact?.id,
          contractorName: cleanContractorName,
          companyName: cleanCompany,
          category: row.category || contact?.category || actualScope.name,
          quotedFigure: 0,
          currency: 'CAD',
          attachedDocs: [],
          actionStatus: 'Confirm with PM',
          poSent: false,
          notes: [],
          quoteBreakdown: [],
          lastSyncedAt: nowTimeStr
        };
        actualScope.trades.push(trade);
      } else {
        if (isValidContractorName(row.contractorName) && (!trade.contractorName || trade.contractorName === trade.companyName)) {
          trade.contractorName = row.contractorName.trim();
        }
        // If cleanCompany has a full corporate designation (e.g. FOXSTONE Exteriors vs Fox Stone), preserve it
        if (cleanCompany.length > trade.companyName.length && cleanCompanyLower.includes(trade.companyName.toLowerCase())) {
          trade.companyName = cleanCompany;
        }
      }

      // Clean string comparison helper
      const clean = (str: unknown) => String(str || '').toLowerCase().trim().replace(/\s+/g, ' ');
      const cleanNorm = (str: unknown) => String(str || '').toLowerCase().replace(/[^a-z0-9]/g, '');

      const getItemDesc = (item: QuoteBreakdownItem) =>
        String(item.itemDescription || (item as unknown as { description?: string }).description || '');
      const getRowDesc = (r: CompiledSheetRow) =>
        String(r.tenderItemDescription || r.itemDescription || '');

      const rowDesc = getRowDesc(row);
      const cleanRowDesc = clean(rowDesc);
      const normRowDesc = cleanNorm(rowDesc);
      const cleanRowCode = clean(row.costCode);

      // 5. Add / Update line item in quoteBreakdown
      // Ensure trade.quoteBreakdown is initialized with official template specs if currently empty
      const templateSpecs = (actualScope.costCode && actualScope.costCode !== 'unassigned' && actualScope.costCode !== '20020')
        ? getTenderTemplateSpecs(actualScope.name, row.costCode || actualScope.costCode)
        : [];
      if (!trade.quoteBreakdown || trade.quoteBreakdown.length === 0) {
        trade.quoteBreakdown = templateSpecs.map((spec, idx) => ({
          id: `brk-${Date.now()}-${idx}-${Math.random().toString(36).substr(2, 4)}`,
          costCode: spec.costCode || row.costCode || actualScope.costCode || 'unassigned',
          itemDescription: spec.itemDescription,
          amount: 0,
          inclusionStatus: 'included' as const,
          notes: spec.notes || '',
          tenderSpecRef: spec.tenderSpecRef || `Cost Code ${spec.costCode}`
        }));
      } else if (templateSpecs.length > 1) {
        // If template has multiple specifications (e.g. Masonry Supply + Install sharing Cost Code 20610),
        // ensure all specs exist in trade's breakdown so they can be mapped to without collision
        templateSpecs.forEach((spec) => {
          const exists = trade!.quoteBreakdown.some((b) => {
            const codeMatches = clean(b.costCode) === clean(spec.costCode);
            const descMatches = clean(getItemDesc(b)) === clean(spec.itemDescription);
            return codeMatches && descMatches;
          });
          if (!exists) {
            trade!.quoteBreakdown.push({
              id: `brk-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
              costCode: spec.costCode || row.costCode || actualScope.costCode || 'unassigned',
              itemDescription: spec.itemDescription,
              amount: 0,
              inclusionStatus: 'included' as const,
              notes: spec.notes || '',
              tenderSpecRef: spec.tenderSpecRef || `Cost Code ${spec.costCode}`
            });
          }
        });
      }

      // 1. Re-Sync & Overwrite Logic
      // When Sync Master Tender Sheet is triggered, do not skip rows marked SYNCED if their target line item in the app has an amount of $0 or an incorrect cost code.
      // Update existing quote records matching Company Name + Scope Name + Cost Code + Exact Description with the new Entered Amount ($) (Column E) and Notes (Column F).
      const isMarkedSynced = Boolean(row.syncStatus && row.syncStatus.trim().toUpperCase() === 'SYNCED');
      if (isMarkedSynced) {
        const cleanCostCodeLower = clean(row.costCode);
        const isGenericCostCode = !cleanCostCodeLower || 
          ['0', '00000', '20000', '20020', 'n/a', 'none', 'tbd', 'general', 'null', 'undefined', 'unassigned'].includes(cleanCostCodeLower);

        // Match using Composite Key
        const matchingItem = trade.quoteBreakdown.find((item) => {
          const itemDesc = getItemDesc(item);
          const codeMatches = clean(item.costCode) === cleanCostCodeLower;
          const descMatches = clean(itemDesc) === cleanRowDesc;
          return codeMatches && descMatches;
        }) || trade.quoteBreakdown.find((item) => {
          const itemDesc = getItemDesc(item);
          const codeMatches = clean(item.costCode) === cleanCostCodeLower;
          const cItemDesc = clean(itemDesc);
          return codeMatches && cleanRowDesc.length > 0 && (cItemDesc.includes(cleanRowDesc) || cleanRowDesc.includes(cItemDesc));
        });

        const targetHasZeroOrMissing = !matchingItem || !matchingItem.amount || Number(matchingItem.amount) === 0;
        const targetHasIncorrectCostCode = matchingItem && cleanCostCodeLower && !isGenericCostCode && matchingItem.costCode && clean(matchingItem.costCode) !== cleanCostCodeLower;

        // Do not skip if target line item has $0 or an incorrect cost code
        const shouldForceSync = targetHasZeroOrMissing || targetHasIncorrectCostCode || trade.quotedFigure === 0;

        if (!shouldForceSync) {
          // If sheet row has 0 amount and app already has a positive quoted figure, skip to avoid wiping
          if (row.amount === 0 && trade.quotedFigure > 0) {
            continue;
          }

          if (
            matchingItem &&
            Math.abs(Number(matchingItem.amount) - Number(row.amount)) < 0.001 &&
            (matchingItem.notes || '').trim() === (row.notes || '').trim()
          ) {
            // Already perfectly in sync
            continue;
          }
        }
      }

      // 2. Composite Key Line-Item Matcher (Exact Description + Cost Code Matching)
      // Do NOT match line items using Cost Code alone. Match incoming rows using a Composite Key (Cost Code + Exact Description):
      const cleanCostCode = (row.costCode || '').trim();
      const isGenericCostCode = !cleanCostCode || 
        ['0', '00000', '20000', 'n/a', 'none', 'tbd', 'general', 'null', 'undefined'].includes(cleanCostCode.toLowerCase());

      // 2a. Find target breakdown line item using Composite Key (Cost Code + Exact Description)
      const matchedLineItem = trade.quoteBreakdown.find((item) => {
        const itemDesc = getItemDesc(item);
        const codeMatches = clean(item.costCode) === clean(row.costCode); // e.g. "20610"
        const descMatches = clean(itemDesc) === clean(rowDesc); // e.g. "total for masonry (supply) - excl. gst"
        return codeMatches && descMatches;
      });

      // Fallback: If description doesn't match exactly, find by description substring
      const fallbackLineItem = matchedLineItem || trade.quoteBreakdown.find((item) => {
        const itemDesc = getItemDesc(item);
        const codeMatches = clean(item.costCode) === clean(row.costCode);
        const cItemDesc = clean(itemDesc);
        const descMatches =
          cleanRowDesc.length > 0 &&
          (cItemDesc.includes(cleanRowDesc) || cleanRowDesc.includes(cItemDesc));
        return codeMatches && descMatches;
      });

      // Fallback: Normalized alphanumeric comparison (handles punctuation, parentheses, brackets, hyphens)
      const normalizedFallbackItem = fallbackLineItem || (cleanRowCode ? trade.quoteBreakdown.find((item) => {
        const itemDesc = getItemDesc(item);
        const codeMatches = clean(item.costCode) === cleanRowCode;
        const nItem = cleanNorm(itemDesc);
        const normMatches = normRowDesc.length >= 4 && (nItem.includes(normRowDesc) || normRowDesc.includes(nItem));
        return codeMatches && normMatches;
      }) : undefined);

      // Fallback: Semantic differentiation for Supply vs Install / Labour under same Cost Code
      let semanticFallbackItem = normalizedFallbackItem;
      if (!semanticFallbackItem && cleanRowCode) {
        const isInstallOrLabour = cleanRowDesc.includes('install') || cleanRowDesc.includes('labour') || cleanRowDesc.includes('labor');
        const isSupplyOrMaterials = cleanRowDesc.includes('supply') || cleanRowDesc.includes('material');

        if (isInstallOrLabour || isSupplyOrMaterials) {
          semanticFallbackItem = trade.quoteBreakdown.find((item) => {
            const codeMatches = clean(item.costCode) === cleanRowCode;
            if (!codeMatches) return false;
            const cItemDesc = clean(getItemDesc(item));
            if (isInstallOrLabour && (cItemDesc.includes('install') || cItemDesc.includes('labour') || cItemDesc.includes('labor'))) {
              return true;
            }
            if (isSupplyOrMaterials && (cItemDesc.includes('supply') || cItemDesc.includes('material'))) {
              return true;
            }
            return false;
          });
        }
      }

      // Single line-item fallback: If there is only ONE line item under this cost code, match it
      let targetBreakdownItem = semanticFallbackItem;
      if (!targetBreakdownItem && cleanCostCode && !isGenericCostCode) {
        const codeItems = trade.quoteBreakdown.filter((item) => clean(item.costCode) === cleanCostCode.toLowerCase());
        if (codeItems.length === 1) {
          targetBreakdownItem = codeItems[0];
        }
      }

      // Secondary Key: If Cost Code is empty or generic, match by description alone
      if (!targetBreakdownItem && cleanRowDesc) {
        targetBreakdownItem = trade.quoteBreakdown.find((item) => {
          const cItemDesc = clean(getItemDesc(item));
          return cItemDesc === cleanRowDesc || cItemDesc.includes(cleanRowDesc) || cleanRowDesc.includes(cItemDesc);
        });
      }

      // 2b. Identify and remove solitary generic dummy $0 slots (e.g. generic 20000)
      // IMPORTANT: Never remove defined sibling line items sharing the same cost code!
      const oldZeroSlots = trade.quoteBreakdown.filter((b) => {
        const isZero = !b.amount || Number(b.amount) === 0;
        if (!isZero) return false;

        // Never remove the target item if it's the one matching the updated cost code + description
        if (targetBreakdownItem && b.id === targetBreakdownItem.id) return false;

        const bCode = clean(b.costCode);
        const incomingCode = clean(cleanCostCode);

        // Never remove if it shares the same cost code as the incoming row (could be sibling line item like Supply/Install!)
        if (cleanCostCode && !isGenericCostCode && bCode === incomingCode) {
          return false;
        }

        const isGenericSlot = !b.costCode || ['0', '00000', '20000', 'general', 'none', 'tbd'].includes(bCode);
        const isPlaceholderDesc = b.itemDescription === 'Tender Package Item' || b.itemDescription.startsWith('Cost Code 20000');

        return isGenericSlot && isPlaceholderDesc;
      });

      if (oldZeroSlots.length > 0) {
        const removeIds = new Set(oldZeroSlots.map((s) => s.id));
        trade.quoteBreakdown = trade.quoteBreakdown.filter((b) => !removeIds.has(b.id));
      }

      // 2c. Multi-Row Aggregation: Insert or Update line item matching the Composite Key
      if (targetBreakdownItem) {
        // Map row amount into line item & set inclusion status to INCLUDED
        targetBreakdownItem.amount = row.amount;
        targetBreakdownItem.inclusionStatus = 'included';
        if (cleanCostCode && !isGenericCostCode) {
          targetBreakdownItem.costCode = cleanCostCode;
        }
        if (row.notes) {
          targetBreakdownItem.notes = row.notes;
        }
        if (rowDesc && (!targetBreakdownItem.itemDescription || targetBreakdownItem.itemDescription.startsWith('Cost Code') || targetBreakdownItem.itemDescription.startsWith('Item '))) {
          targetBreakdownItem.itemDescription = rowDesc;
        }
      } else {
        // Insert parsed amount into new line item matching updated Cost Code + Description
        const templateMatch = (cleanCostCode && cleanCostCode !== 'unassigned' && cleanCostCode !== '20020')
          ? findScopeTemplateByCostCode(cleanCostCode)
          : null;
        const finalCostCode = (!isGenericCostCode && cleanCostCode && cleanCostCode !== '20020') ? cleanCostCode : (actualScope.costCode || 'unassigned');
        const finalDesc = rowDesc || templateMatch?.spec.itemDescription || actualScope.name;

        const newBreakdownItem: QuoteBreakdownItem = {
          id: `brk-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
          costCode: finalCostCode,
          itemDescription: finalDesc,
          amount: row.amount,
          inclusionStatus: 'included',
          notes: row.notes || templateMatch?.spec.notes || '',
          tenderSpecRef: templateMatch?.spec.tenderSpecRef || (finalCostCode !== 'unassigned' ? `Cost Code ${finalCostCode}` : 'Unassigned Item')
        };
        trade.quoteBreakdown.push(newBreakdownItem);
        targetBreakdownItem = newBreakdownItem;
      }

      // If scope's cost code was generic, update it to specific cost code
      if ((!actualScope.costCode || actualScope.costCode === '20000' || actualScope.costCode === '20020' || actualScope.costCode === '0' || actualScope.costCode === 'unassigned') && cleanCostCode && !isGenericCostCode) {
        actualScope.costCode = cleanCostCode;
      }

      // If row has vendor scope notes (Column F), ensure logged in trade notes
      if (row.notes && row.notes.trim()) {
        const cleanNote = row.notes.trim();
        const hasExistingNote = trade.notes.some((n) => n.text === cleanNote);
        if (!hasExistingNote) {
          trade.notes.push({
            id: `n-sync-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
            text: cleanNote,
            author: 'Master Tender Sync Engine',
            timestamp: `${todayIsoDate} ${nowTimeStr}`
          });
        }
      }

      // 3. Total Quote Auto-Summation
      // Automatically sum all active sub-line items for the contractor card:
      // Artisan Masonry: $9,510.00 + $21,630.00 = $31,140.00
      // FOXSTONE Exteriors: $8,480.17 + $8,480.18 = $16,960.35
      // Update the contractor's top-level QUOTED FIGURE (LIVE) and recalculate the package's BEST QUOTE and BUDGET VARIANCE indicators.
      const liveQuotedTotal = trade.quoteBreakdown.reduce((sum, item) => {
        if (item.inclusionStatus === 'included') {
          return sum + (Number(item.amount) || 0);
        }
        return sum;
      }, 0);

      // Round to 2 decimal places to avoid floating point imprecision
      trade.quotedFigure = Math.round(liveQuotedTotal * 100) / 100;
      trade.lastSyncedAt = nowTimeStr;

      // 7. Attach Formal Quote (PDF, DOC, or Image) with deduplication
      if (rawDoc) {
        const docName = rawDoc.includes('/') ? rawDoc.split('/').pop()?.split('?')[0] || `${cleanCompany}_Formal_Quote.pdf` : rawDoc;

        // Check if attachment URL matches an existing entry
        const existingDoc = trade.attachedDocs.find(
          (d) =>
            (normalizedIncomingDocUrl && this.normalizeDocUrl(d.url) === normalizedIncomingDocUrl) ||
            d.name.toLowerCase() === docName.toLowerCase()
        );

        if (existingDoc) {
          // If attachment matches existing entry, update record instead of duplicate
          existingDoc.url = finalDocUrl;
          existingDoc.addedAt = todayIsoDate;
          existingDoc.fileSize = 'Formal Tender Attachment (Synced)';
        } else {
          const newDoc: AttachedDoc = {
            id: `doc-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
            name: docName.endsWith('.pdf') || docName.endsWith('.doc') || docName.endsWith('.docx') || docName.endsWith('.png') || docName.endsWith('.jpg')
              ? docName
              : `${docName}.pdf`,
            url: finalDocUrl,
            type: 'quote',
            addedAt: todayIsoDate,
            fileSize: 'Formal Tender Attachment'
          };
          trade.attachedDocs.push(newDoc);
        }
      }

      // 8. Append Notes if provided
      if (row.notes && row.notes.trim()) {
        const hasExistingNote = trade.notes.some((n) => n.text === row.notes?.trim());
        if (!hasExistingNote) {
          trade.notes.push({
            id: `n-sync-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
            text: row.notes.trim(),
            author: 'Google Sheets Compiled Sync',
            timestamp: `${todayIsoDate} ${nowTimeStr}`
          });
        }
      }

      totalAllocatedQuotes++;
      pStats.quotesUpdated++;
      pStats.totalAmount += row.amount;
    }

    // Format breakdown for log
    const projectBreakdown = Array.from(projectStatsMap.values()).map((p) => ({
      projectName: p.projectName,
      projectId: p.projectId,
      scopesUpdated: p.scopesUpdated.size,
      quotesUpdated: p.quotesUpdated,
      totalAmountQuoted: p.totalAmount
    }));

    const activeProjectSummary = projectBreakdown
      .filter((p) => p.quotesUpdated > 0)
      .map((p) => `${p.projectName}: ${p.quotesUpdated} quotes ($${p.totalAmountQuoted.toLocaleString()})`)
      .join(' | ');

    const log: SyncLogEntry = {
      id: `log-${Date.now()}`,
      timestamp,
      status: 'success',
      message: `Master Tender Sync completed: ${totalAllocatedQuotes} quotes re-synced & overwritten with instant Live Quoted Total & Budget Variance recalculation across ${projectBreakdown.filter((p) => p.quotesUpdated > 0).length} projects`,
      updatedQuotesCount: totalAllocatedQuotes,
      details: activeProjectSummary || `Processed ${rows.length} spreadsheet rows with line item relocation and variance recalculation.`
    };

    return {
      updatedProjects: clonedProjects,
      newContacts: newContactsList.filter(
        (c) => isValidContractorName(c.company) && isValidContractorName(c.name)
      ),
      log,
      totalRowsProcessed: rows.length,
      allocatedQuotesCount: totalAllocatedQuotes,
      projectBreakdown
    };
  },

  // Fetch Google Sheet data and parse using explicit 0-based column mapping & safeguards
  async fetchSheetData(configOrUrl: GoogleSheetsConfig | string): Promise<{ rows: CompiledSheetRow[]; rawText: string }> {
    const url = typeof configOrUrl === 'string' ? configOrUrl : configOrUrl?.sheetUrl;
    let rawCsvText = '';

    if (url && (url.startsWith('http://') || url.startsWith('https://'))) {
      const formattedUrl = this.formatCsvUrl(url);
      try {
        const response = await fetch(formattedUrl, { method: 'GET', mode: 'cors' });
        if (response.ok) {
          const fetchedText = await response.text();
          if (typeof fetchedText === 'string' && fetchedText.trim().length > 0) {
            rawCsvText = fetchedText;
          }
        }
      } catch (err) {
        console.warn('Direct live Google Sheets fetch hit CORS/network restriction, using proxy or sample data.', err);
      }

      if (!rawCsvText) {
        try {
          const proxyRes = await fetch(`/api/sheets/fetch?url=${encodeURIComponent(url)}`);
          if (proxyRes.ok) {
            const data = await proxyRes.json();
            if (data.csv) {
              rawCsvText = data.csv;
            } else if (data.csvText) {
              rawCsvText = data.csvText;
            }
          }
        } catch {
          // Fallback to sample data
        }
      }
    }

    // If sheet name or tab has mock terms, skip syncing
    const sheetName = typeof configOrUrl === 'object' ? configOrUrl.sheetName : '';
    if (isExampleOrMockTerm(sheetName)) {
      console.warn(`[sheetsSyncService] Ignored mock/example sheet tab "${sheetName}"`);
      return { rows: [], rawText: '' };
    }

    if (!rawCsvText || typeof rawCsvText !== 'string' || !rawCsvText.trim()) {
      return { rows: [], rawText: '' };
    }

    const rows = this.parseSyncRows(rawCsvText);
    return { rows, rawText: rawCsvText };
  },

  // Perform full sync on all projects via Google Sheets URL or provided CSV
  async syncAllProjectsFromSheet(
    projects: Project[],
    contacts: Contact[],
    config: GoogleSheetsConfig,
    manualCsvText?: string | unknown
  ): Promise<MultiProjectSyncResult> {
    let rows: CompiledSheetRow[] = [];

    if (typeof manualCsvText === 'string' && manualCsvText.trim().length > 0) {
      rows = this.parseSyncRows(manualCsvText);
    } else {
      const fetched = await this.fetchSheetData(config);
      rows = fetched.rows;
    }

    return this.processCompiledRows(rows, projects, contacts);
  },

  // ================= Persistent Master Sheet Architecture =================

  // Convert full workspace projects and scopes into Master Sheet rows
  exportProjectsToMasterSheetRows(projects: Project[]): MasterSheetRow[] {
    const rows: MasterSheetRow[] = [];
    const nowStr = new Date().toISOString();

    projects.forEach((project) => {
      // Do not export example or demo projects
      if (isExampleOrMockTerm(project.name) || isExampleOrMockTerm(project.id)) return;

      project.scopes.forEach((scope) => {
        if (isExampleOrMockTerm(scope.name)) return;
        if (!scope.trades || scope.trades.length === 0) {
          // Scope with no active quote records yet
          rows.push({
            companyName: '',
            contractorName: '',
            project: project.name,
            projectCode: project.code,
            phaseCode: scope.phaseId,
            scopeName: scope.name,
            itemDescription: scope.description || scope.name,
            amount: scope.budgetAmount || 0,
            costCode: (scope.costCode && scope.costCode !== '20020') ? scope.costCode : 'unassigned',
            notes: scope.notes || '',
            formalQuoteDoc: '',
            syncStatus: 'SYNCED',
            actionStatus: 'Pending Quotes',
            poSent: 'No',
            isAwarded: 'No',
            inclusionStatus: 'included',
            lastUpdated: nowStr
          });
        } else {
          scope.trades.forEach((trade) => {
            // Strictly reject corrupt contractor names originating from notes or exclusions
            if (!isValidContractorName(trade.companyName)) return;

            const primaryDoc = trade.attachedDocs && trade.attachedDocs.length > 0 ? trade.attachedDocs[0].url : '';
            const tradeNotes = trade.notes && trade.notes.length > 0 ? trade.notes.map((n) => n.text).join('; ') : '';

            if (trade.quoteBreakdown && trade.quoteBreakdown.length > 0) {
              trade.quoteBreakdown.forEach((item) => {
                rows.push({
                  companyName: trade.companyName,
                  contractorName: isValidContractorName(trade.contractorName) ? trade.contractorName : trade.companyName,
                  project: project.name,
                  projectCode: project.code,
                  phaseCode: scope.phaseId,
                  scopeName: scope.name,
                  itemDescription: item.itemDescription,
                  amount: item.amount,
                  costCode: item.costCode && item.costCode !== '20020' ? item.costCode : (scope.costCode && scope.costCode !== '20020' ? scope.costCode : 'unassigned'),
                  notes: item.notes || tradeNotes,
                  formalQuoteDoc: primaryDoc,
                  syncStatus: 'SYNCED',
                  actionStatus: trade.actionStatus,
                  poSent: trade.poSent ? 'Yes' : 'No',
                  isAwarded: trade.isAwarded ? 'Yes' : 'No',
                  inclusionStatus: item.inclusionStatus,
                  lastUpdated: nowStr
                });
              });
            } else {
              rows.push({
                companyName: trade.companyName,
                contractorName: isValidContractorName(trade.contractorName) ? trade.contractorName : trade.companyName,
                project: project.name,
                projectCode: project.code,
                phaseCode: scope.phaseId,
                scopeName: scope.name,
                itemDescription: scope.name,
                amount: trade.quotedFigure,
                costCode: scope.costCode && scope.costCode !== '20020' ? scope.costCode : 'unassigned',
                notes: tradeNotes,
                formalQuoteDoc: primaryDoc,
                syncStatus: 'SYNCED',
                actionStatus: trade.actionStatus,
                poSent: trade.poSent ? 'Yes' : 'No',
                isAwarded: trade.isAwarded ? 'Yes' : 'No',
                inclusionStatus: 'included',
                lastUpdated: nowStr
              });
            }
          });
        }
      });
    });

    return rows;
  },

  // Generate valid CSV representing the Master Sheet backend
  generateMasterSheetCsv(projects: Project[]): string {
    const rows = this.exportProjectsToMasterSheetRows(projects);
    const headers = [
      'Company Name',
      'Contractor Contact',
      'Project',
      'Project Code',
      'Phase',
      'Scope Item',
      'Tender Form Item Description',
      'Entered Amount',
      'Cost Code',
      'Notes',
      'Attach Formal Quote (PDF, DOC, or Image)',
      'Sync Status',
      'Action Status',
      'PO Sent',
      'Awarded',
      'Inclusion Status',
      'Last Updated'
    ];

    const csvLines = [headers.join(',')];
    rows.forEach((r) => {
      const line = [
        `"${(r.companyName || '').replace(/"/g, '""')}"`,
        `"${(r.contractorName || '').replace(/"/g, '""')}"`,
        `"${(r.project || '').replace(/"/g, '""')}"`,
        `"${(r.projectCode || '').replace(/"/g, '""')}"`,
        `"${(r.phaseCode || '').replace(/"/g, '""')}"`,
        `"${(r.scopeName || '').replace(/"/g, '""')}"`,
        `"${(r.itemDescription || '').replace(/"/g, '""')}"`,
        `"${r.amount}"`,
        `"${(r.costCode || '').replace(/"/g, '""')}"`,
        `"${(r.notes || '').replace(/"/g, '""')}"`,
        `"${(r.formalQuoteDoc || '').replace(/"/g, '""')}"`,
        `"${r.syncStatus}"`,
        `"${(r.actionStatus || '').replace(/"/g, '""')}"`,
        `"${(r.poSent || '').replace(/"/g, '""')}"`,
        `"${(r.isAwarded || '').replace(/"/g, '""')}"`,
        `"${(r.inclusionStatus || 'included').replace(/"/g, '""')}"`,
        `"${r.lastUpdated || ''}"`
      ];
      csvLines.push(line.join(','));
    });

    return csvLines.join('\n');
  },

  // Save full workspace project creation, scope edits, and contractor quotes back to Sheet backend
  async saveBackToMasterSheet(
    projects: Project[],
    config: GoogleSheetsConfig
  ): Promise<{ success: boolean; rowsSaved: number; timestamp: string }> {
    const now = new Date().toISOString();
    const masterRows = this.exportProjectsToMasterSheetRows(projects);
    const csv = this.generateMasterSheetCsv(projects);

    // 1. Immediately update persistent snapshot locally
    storageService.saveMasterSheetSnapshot(csv);
    storageService.saveProjects(projects);

    // 2. Dispatch to server backend (/api/sheets/save)
    try {
      await fetch('/api/sheets/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projects,
          masterRows,
          csv,
          timestamp: now
        })
      });
    } catch {
      // Backend may be static or booting; local storage snapshot already guarantees persistence
    }

    // 3. Optional write back to custom Google Apps Script or webhook if specified
    if (config.backendSaveUrl && config.backendSaveUrl.startsWith('http')) {
      try {
        await fetch(config.backendSaveUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            projects,
            masterRows,
            csv,
            timestamp: now
          }),
          mode: 'no-cors'
        });
      } catch (e) {
        console.warn('Could not dispatch to custom backendSaveUrl', e);
      }
    }

    return {
      success: true,
      rowsSaved: masterRows.length,
      timestamp: now
    };
  },

  // Bi-directional granular webhook sync for an individual auto-saved row
  async syncSingleRow(
    payload: {
      projectId?: string;
      project: string;
      projectCode?: string;
      phaseCode?: string;
      scopeId?: string;
      scopeName: string;
      tradeId?: string;
      companyName: string;
      contractorName?: string;
      itemDescription?: string;
      amount: number;
      costCode?: string;
      notes?: string;
      actionStatus?: string;
      poSent?: boolean | string;
      isAwarded?: boolean | string;
      inclusionStatus?: string;
      lastModifiedBy?: string;
      updatedAt?: string;
    },
    config: GoogleSheetsConfig
  ): Promise<{ success: boolean; timestamp: string }> {
    const now = payload.updatedAt || new Date().toISOString();

    // 1. Asynchronous background call to server backend /api/sheets/sync-row
    try {
      fetch('/api/sheets/sync-row', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...payload, updatedAt: now })
      }).catch((err) => {
        console.warn('Background sync-row fetch error:', err);
      });
    } catch {
      // Non-blocking
    }

    // 2. Fire background webhook call to Master Tender Sync Google Sheet (Apps Script webhook or custom URL)
    const webhookUrl = config.appsScriptUrl || config.backendSaveUrl;
    if (webhookUrl && webhookUrl.startsWith('http')) {
      try {
        fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'update_master_tender_row',
            ...payload,
            updatedAt: now
          }),
          mode: 'no-cors'
        }).catch((e) => console.warn('Could not dispatch single row to webhookUrl', e));
      } catch (e) {
        console.warn('Webhook dispatch exception', e);
      }
    }

    return {
      success: true,
      timestamp: now
    };
  },

  // On application load: dynamically re-hydrate all project workspaces and scope breakdown cards from master spreadsheet
  async rehydrateFromMasterSheet(
    fallbackProjects: Project[],
    config: GoogleSheetsConfig
  ): Promise<{ rehydratedProjects: Project[]; rehydratedCount: number; source: string }> {
    const currentContacts = storageService.getContacts();

    // 1. Try server backend /api/sheets/master
    try {
      const res = await fetch('/api/sheets/master');
      if (res.ok) {
        const data = await res.json();
        if (data && Array.isArray(data.projects) && data.projects.length > 0) {
          const { purgedProjects, purgedContacts } = masterSyncService.purgeInvalidContractors(
            data.projects,
            currentContacts
          );
          storageService.saveProjects(purgedProjects);
          storageService.saveContacts(purgedContacts);
          dbService.saveContacts(purgedContacts).catch(() => {});
          return {
            rehydratedProjects: purgedProjects,
            rehydratedCount: purgedProjects.length,
            source: 'Master Sheet Server Store'
          };
        }
      }
    } catch {
      // Continue to next persistence tier
    }

    // 2. Try live Google Sheet if sheetUrl is provided
    if (config.sheetUrl && (config.sheetUrl.startsWith('http://') || config.sheetUrl.startsWith('https://'))) {
      try {
        let csvText = '';
        try {
          const proxyRes = await fetch(`/api/sheets/fetch?url=${encodeURIComponent(config.sheetUrl)}`);
          if (proxyRes.ok) {
            const proxyJson = await proxyRes.json();
            csvText = proxyJson.csv || '';
          }
        } catch {
          // Direct fallback
        }

        if (!csvText) {
          const formatted = this.formatCsvUrl(config.sheetUrl);
          const directRes = await fetch(formatted, { mode: 'cors' });
          if (directRes.ok) {
            csvText = await directRes.text();
          }
        }

        if (csvText) {
          const syncResult = await this.syncAllProjectsFromSheet(fallbackProjects, currentContacts, config, csvText);
          if (syncResult.updatedProjects && syncResult.updatedProjects.length > 0) {
            const { purgedProjects, purgedContacts } = masterSyncService.purgeInvalidContractors(
              syncResult.updatedProjects,
              syncResult.newContacts || currentContacts
            );
            storageService.saveProjects(purgedProjects);
            storageService.saveContacts(purgedContacts);
            dbService.saveContacts(purgedContacts).catch(() => {});
            return {
              rehydratedProjects: purgedProjects,
              rehydratedCount: purgedProjects.length,
              source: 'Live Master Google Sheet'
            };
          }
        }
      } catch (e) {
        console.warn('Live Google Sheet re-hydration fell back to persistent cache', e);
      }
    }

    // 3. Try Local Master Sheet Snapshot
    const snapshotCsv = storageService.getMasterSheetSnapshot();
    if (snapshotCsv) {
      try {
        const syncResult = await this.syncAllProjectsFromSheet(fallbackProjects, currentContacts, config, snapshotCsv);
        if (syncResult.updatedProjects && syncResult.updatedProjects.length > 0) {
          const { purgedProjects, purgedContacts } = masterSyncService.purgeInvalidContractors(
            syncResult.updatedProjects,
            syncResult.newContacts || currentContacts
          );
          storageService.saveProjects(purgedProjects);
          storageService.saveContacts(purgedContacts);
          dbService.saveContacts(purgedContacts).catch(() => {});
          return {
            rehydratedProjects: purgedProjects,
            rehydratedCount: purgedProjects.length,
            source: 'Master Sheet Persistent Cache'
          };
        }
      } catch (e) {
        console.warn('Snapshot re-hydration error', e);
      }
    }

    // 4. Default to current fallback projects with purge cleanup
    const { purgedProjects, purgedContacts } = masterSyncService.purgeInvalidContractors(
      fallbackProjects,
      currentContacts
    );
    storageService.saveProjects(purgedProjects);
    storageService.saveContacts(purgedContacts);
    dbService.saveContacts(purgedContacts).catch(() => {});
    return {
      rehydratedProjects: purgedProjects,
      rehydratedCount: purgedProjects.length,
      source: 'Active Workspace'
    };
  },

  // Disabled mock data seeding routine - returns empty header row only
  getSampleCompiledCsv(): string {
    return `Company Name,Project Name,Tender Form Item,Entered Amount ($),Notes / Exclusions,Formal Quote Link,Cost Code,Sync Status\n`;
  }
};
