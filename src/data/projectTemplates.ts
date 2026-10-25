import { ScopeLineItem, PhaseId, Project, ProjectStatus, GoogleSheetsConfig } from '../types';
import { INITIAL_SCOPES } from './initialTenderPackages';
import { REAL_ZENITH_PROJECTS } from './realZenithProjects';
import { getAccurateScopeCostCode } from './tenderBreakdownTemplates';

export interface ScopeTemplateItem {
  phaseId: PhaseId;
  name: string;
  description: string;
  defaultBudget: number;
  isRequired: boolean;
  costCode?: string;
}

// Master list of all exact scope line items across 5 phases as defined in specifications
export const MASTER_SCOPE_TEMPLATES: ScopeTemplateItem[] = [
  // Phase 1A
  {
    phaseId: '1A',
    name: 'Demolition',
    description: 'Total for Demolition (excl. GST)',
    defaultBudget: 48000,
    isRequired: true
  },
  {
    phaseId: '1A',
    name: 'Excavation, Other Earthworks & DSSP Install',
    description: 'Total for Excavation, Backfill, Rough Grading & full DSSP install, gravel, coring, drain rock, inspection (excl. GST)',
    defaultBudget: 92000,
    isRequired: true
  },
  {
    phaseId: '1A',
    name: 'DSSP Materials',
    description: 'Total for all DSSP Materials as per plans (Catch basins/storm tanks/manhole covers/Area Drains/Pipe/Hydrovex) - excl. GST',
    defaultBudget: 38000,
    isRequired: true
  },
  {
    phaseId: '1A',
    name: 'Water & Offsite Services',
    description: 'Total for Water & Underground and Permission to Permit (excl. GST)',
    defaultBudget: 55000,
    isRequired: true
  },
  {
    phaseId: '1A',
    name: 'Footing & Foundation',
    description: 'Total for Foundation and Footing Walls (cribbing, rebar, ladder packages, window buckouts, labor), Garage Foundation & Retaining Wall - excl. GST',
    defaultBudget: 115000,
    isRequired: true
  },
  {
    phaseId: '1A',
    name: 'Basement Slab/ Garage Slab/ Weeping & Gravel',
    description: 'Basement Slab, Garage Slab, Weeping Tile, Gravel, Damp Proofing (excl. GST)',
    defaultBudget: 64000,
    isRequired: true
  },
  {
    phaseId: '1A',
    name: 'Framing Materials',
    description: 'Total for full framing material package (excl. GST)',
    defaultBudget: 145000,
    isRequired: true
  },
  {
    phaseId: '1A',
    name: 'Window Wells',
    description: 'Total for all Window Wells (excl. GST)',
    defaultBudget: 8500,
    isRequired: true
  },
  {
    phaseId: '1A',
    name: 'Exterior Doors & Windows',
    description: 'Total for all Exterior Doors & all Windows (excl. GST)',
    defaultBudget: 78000,
    isRequired: true
  },
  {
    phaseId: '1A',
    name: 'Window Sealant',
    description: 'Sealant for all necessary openings (excl. GST)',
    defaultBudget: 6500,
    isRequired: true
  },
  {
    phaseId: '1A',
    name: 'Plumbing & Gas Rough In and Final',
    description: 'Plumbing Rough-In & Final, Gas Rough-in & Final, Plumbing & Gas Permits (excl. GST)',
    defaultBudget: 68000,
    isRequired: true
  },
  {
    phaseId: '1A',
    name: 'Electrical Rough-in and Final',
    description: 'Electrical Rough-in & Final (excl. GST)',
    defaultBudget: 62000,
    isRequired: true
  },
  {
    phaseId: '1A',
    name: 'HVAC',
    description: 'Heating Rough-in & Final, Air Conditioning (Rough-In Only) - (excl. GST)',
    defaultBudget: 42000,
    isRequired: true
  },
  {
    phaseId: '1A',
    name: 'Precast Steps',
    description: 'Total for all Precast Steps (excl. GST)',
    defaultBudget: 9500,
    isRequired: true
  },

  // Phase 1B
  {
    phaseId: '1B',
    name: 'Framing Labour',
    description: 'Main Unit Framing Labour total (excl. GST), Basement Framing Labour total (excl. GST), Garage Framing Labour total (excl. GST)',
    defaultBudget: 110000,
    isRequired: true
  },
  {
    phaseId: '1B',
    name: 'Interior Stairs',
    description: 'Interior Stairs (Excl. GST)',
    defaultBudget: 18000,
    isRequired: true
  },
  {
    phaseId: '1B',
    name: 'Roofing',
    description: 'Total for Roofing (sloped) - excl. GST, Total for Flat Roof (If Applicable) - excl. GST, Total for Garage Roof - excl. GST',
    defaultBudget: 42000,
    isRequired: true
  },
  {
    phaseId: '1B',
    name: 'Decking',
    description: 'Total for Decking as per plans (excl. GST)',
    defaultBudget: 14000,
    isRequired: true
  },
  {
    phaseId: '1B',
    name: 'Rainware',
    description: 'Total for all Rainware, Downspouts and Gutters (excl. GST)',
    defaultBudget: 8500,
    isRequired: true
  },
  {
    phaseId: '1B',
    name: 'Exterior Finishing',
    description: 'Total for Exterior Finishing & Cladding - Main Building (excl. GST), Total for Exterior Finishing & Cladding - Garage (excl. GST), Total for Soffit & Fascia - Main Building (excl. GST), Total for Soffit & Fascia - Garage (excl. GST)',
    defaultBudget: 56000,
    isRequired: true
  },
  {
    phaseId: '1B',
    name: 'Masonry',
    description: 'Total for masonry (supply) - excl. GST, Total for masonry (install) - excl. GST',
    defaultBudget: 26000,
    isRequired: true
  },
  {
    phaseId: '1B',
    name: 'Stucco',
    description: 'Total for Stucco - Main Building (excl. GST), Total for Stucco - Garage (excl. GST)',
    defaultBudget: 34000,
    isRequired: true
  },
  {
    phaseId: '1B',
    name: 'Sprinkler System',
    description: 'Total for Sprinkler System (supply & install) - excl. GST',
    defaultBudget: 32000,
    isRequired: true
  },
  {
    phaseId: '1B',
    name: 'Fireplace',
    description: 'Total for Fireplace/s (Supply & Install) - excl. GST',
    defaultBudget: 16000,
    isRequired: true
  },
  {
    phaseId: '1B',
    name: 'Drywall & Insulation',
    description: 'Total for Drywall & Insulation - Main building - excl. GST, Total for Drywall & Insulation - Garage - excl. GST',
    defaultBudget: 68000,
    isRequired: true
  },
  {
    phaseId: '1B',
    name: 'Spray Foam',
    description: 'Total for Spray Foam (excl. GST)',
    defaultBudget: 22000,
    isRequired: true
  },
  {
    phaseId: '1B',
    name: 'Cabinets & Built-Ins',
    description: 'Total for all Cabinets & Built-ins (excl. GST)',
    defaultBudget: 85000,
    isRequired: true
  },

  // Phase 2A
  {
    phaseId: '2A',
    name: 'Countertops',
    description: 'Total for all Countertops as per interior design details and specs & Total for all Sinks (excl. GST)',
    defaultBudget: 38000,
    isRequired: true
  },
  {
    phaseId: '2A',
    name: 'Plumbing Fixtures',
    description: 'Plumbing Fixture total (excluding sinks) - excl. GST',
    defaultBudget: 24000,
    isRequired: true
  },
  {
    phaseId: '2A',
    name: 'Lighting Fixtures',
    description: 'Total for all Light Fixtures - excl. GST',
    defaultBudget: 22000,
    isRequired: true
  },
  {
    phaseId: '2A',
    name: 'Appliances',
    description: 'Total for all Appliances (for all units) & Delivery - excl. GST',
    defaultBudget: 36000,
    isRequired: true
  },
  {
    phaseId: '2A',
    name: 'Interior Railings',
    description: 'Total for interior railings as per spec - excl. GST',
    defaultBudget: 16000,
    isRequired: true
  },
  {
    phaseId: '2A',
    name: 'Tile and Flooring Material',
    description: 'Total for all tile material as per specs & Total for all flooring material (including lvp, hardwood, carpet) - excl. GST',
    defaultBudget: 52000,
    isRequired: true
  },

  // Phase 2B
  {
    phaseId: '2B',
    name: 'Finishing Materials',
    description: 'Full Finishing Material Package (Interior doors, baseboards, mouldings, casings) & Full Lockout Package (Knobs/levers, deadbolts, stops, bath hardware) - excl. GST',
    defaultBudget: 42000,
    isRequired: true
  },
  {
    phaseId: '2B',
    name: 'Tile Labour',
    description: 'Full Tile installation (excl. GST)',
    defaultBudget: 26000,
    isRequired: true
  },
  {
    phaseId: '2B',
    name: 'Flooring Labour',
    description: 'Full Flooring installation & Supply and install Stair Nosings (excl. GST)',
    defaultBudget: 28000,
    isRequired: true
  },
  {
    phaseId: '2B',
    name: 'Interior Glass and Mirrors',
    description: 'Total for all Interior Glass (supply and install), Total for all Mirrors, Total for all Wire Shelving (excl. GST)',
    defaultBudget: 18000,
    isRequired: true
  },
  {
    phaseId: '2B',
    name: 'Window Coverings',
    description: 'Total for all Window Coverings (excl. GST)',
    defaultBudget: 14000,
    isRequired: true
  },

  // Phase 3
  {
    phaseId: '3',
    name: 'Exterior Flatwork (Sidewalk, Aprons, etc.)',
    description: 'Total for all concrete driveways, aprons, curbs, sidewalks, walkways, patios, stoops, landings, and utility equipment pads as per plans (excl. GST)',
    defaultBudget: 48000,
    isRequired: true
  },
  {
    phaseId: '3',
    name: 'Garage Overhead Door (OHD)',
    description: 'Total for Garage Overhead Door (OHD) - supply and install (excl. GST)',
    defaultBudget: 12000,
    isRequired: true
  },
  {
    phaseId: '3',
    name: 'Garage Exterior Door',
    description: 'Total for all Garage Entry Exterior Doors (excl. GST)',
    defaultBudget: 4500,
    isRequired: true
  },
  {
    phaseId: '3',
    name: 'Exterior Stairs',
    description: 'Total for Exterior Stairs (supply and install) - excl. GST',
    defaultBudget: 11000,
    isRequired: true
  },
  {
    phaseId: '3',
    name: 'Exterior Railings',
    description: 'Total for Exterior Railings (supply and install) - excl. GST',
    defaultBudget: 15000,
    isRequired: true
  },
  {
    phaseId: '3',
    name: 'Landscaping & Fencing',
    description: 'Total for Trees, Decorative Rock, Sod, Fencing, and Irrigation System (Supply and Install) - excl. GST',
    defaultBudget: 35000,
    isRequired: true
  }
];

export function generateScopesFromTemplate(_includeSampleTrades = false): ScopeLineItem[] {
  // Always create clean scopes with empty trades based on exact specifications
  const now = new Date().toISOString();
  return MASTER_SCOPE_TEMPLATES.map((tmpl, idx) => ({
    id: `scope-${tmpl.phaseId.toLowerCase()}-${idx + 1}-${Date.now()}`,
    phaseId: tmpl.phaseId,
    name: tmpl.name,
    description: tmpl.description,
    budgetAmount: tmpl.defaultBudget,
    isRequired: tmpl.isRequired,
    order: idx + 1,
    costCode: tmpl.costCode || getAccurateScopeCostCode(tmpl.name),
    createdAt: now,
    trades: []
  }));
}

export const INITIAL_PROJECTS: Project[] = REAL_ZENITH_PROJECTS;

