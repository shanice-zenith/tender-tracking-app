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
  googleFormUrl?: string;
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
// All 46 Live Google Form Links from Arkham Place Form Index
export const ARKHAM_GOOGLE_FORM_URLS: Record<string, string> = {
  "Demolition, Excavation, Other Earthworks & DSSP Install": "https://docs.google.com/forms/d/e/1FAIpQLSfwoYG8JsczzXzGHlCKH4ko29118jc0jZK1PpOAkMoe1uJW4g/viewform",
  "Shoring": "https://docs.google.com/forms/d/e/1FAIpQLSf-FDxKBpuEOLZ-XmNlf5oT6kW4YwQCFf4D2CABi-52cEyy9A/viewform",
  "DSSP Materials": "https://docs.google.com/forms/d/e/1FAIpQLSc9VAEl26p4qhqIXceBx8McbNSosI89Jf34DoYnTpE8MkBjnQ/viewform",
  "Water & Offsite Services": "https://docs.google.com/forms/d/e/1FAIpQLSdSuKgq26w7yBigLDd_Xy0vXIVOQOibohUYy4fmvQWezoJs-A/viewform",
  "Foundation & Suspended Slabs": "https://docs.google.com/forms/d/e/1FAIpQLSfAxKmBv1Uubdkf-WQIdlfcq9HGEschy2F_xBRDe0TSpe5Sog/viewform",
  "Basement Slab / Weeping & Gravel": "https://docs.google.com/forms/d/e/1FAIpQLSc6ZmVT_u4dy6l22v2H3Duu-N38w54HFKck1wqfkC5esuOAzg/viewform",
  "Structural Steel": "https://docs.google.com/forms/d/e/1FAIpQLSdGu4FGVldV4gZea4Yrgb-pBJMWbjcAO7_jvdoGkMLeXOYxCg/viewform",
  "Framing Materials": "https://docs.google.com/forms/d/e/1FAIpQLSeIwNftOqStN9DqJBOQCDitexo54nLpT1tuQdnkezjhHZ2zBQ/viewform",
  "Exterior Doors & Windows": "https://docs.google.com/forms/d/e/1FAIpQLSeUIvBI8a6i9rNt6PMztvy9Bjxwy4loMVouS6QKDv5jZf4RLA/viewform",
  "Building Envelope Sealant": "https://docs.google.com/forms/d/e/1FAIpQLSeDoz1F4aCnH3GACN4-5axbEizZ-aGWGpMYGRWuBvT2JrKuJA/viewform",
  "Elevator": "https://docs.google.com/forms/d/e/1FAIpQLSecFqgalUSQdUDdAYG0UgZ-iJRD46UbEB8aqU4gu_aSlFczLw/viewform",
  "Plumbing & Gas Rough-In and Final": "https://docs.google.com/forms/d/e/1FAIpQLSc94NizXCWHlb_hiTCM_vnH-mM52rPi098BQTn1BEZXHA3Nzw/viewform",
  "Fire Protection / Sprinkler System": "https://docs.google.com/forms/d/e/1FAIpQLSeykmaUzjQ4bIAoeerkagt27uCGn8KbsFBgipiP6vgSIgfm7A/viewform",
  "Electrical Rough-in and Final": "https://docs.google.com/forms/d/e/1FAIpQLScer_VlfkiJXxjp0dgQvFGS-BBA9FW__ZRCLEZp4UcUGt-4vg/viewform",
  "HVAC": "https://docs.google.com/forms/d/e/1FAIpQLSfjvLeqRLqs_F_1J8x-U0hJOWfj8sJsNR7RoS8-6IwJELohaA/viewform",
  "Framing Labour": "https://docs.google.com/forms/d/e/1FAIpQLSfkieIJY1XsP1f26k3mD6PBVxoaExf5O8L407fPts_upE-x3A/viewform",
  "Interior Stairs": "https://docs.google.com/forms/d/e/1FAIpQLScGNvimVHPyZEaLx5A4a1kaPmUxh7oJdQkWYNRRETxtt2Fyug/viewform",
  "Roofing": "https://docs.google.com/forms/d/e/1FAIpQLSf1WSKIcPr4HvfSzaagX6PRBw4oEf7lG1TzjkUtAd0xI9fqKg/viewform",
  "Decking": "https://docs.google.com/forms/d/e/1FAIpQLSermn_nmELYqIg-elRlfYbOyWs0SMSdx1exRxgP2FqF7jq8aQ/viewform",
  "Rainware": "https://docs.google.com/forms/d/e/1FAIpQLSdV0uViVqOnEKaiCfnTF1eEhAKNQJVtgIk4IhgUoYRHQiCn6A/viewform",
  "Exterior Finishing": "https://docs.google.com/forms/d/e/1FAIpQLSfsgXUlwe7owB3a7WtA9ayBpeP9Yo49CpQ4XrS5Valy8uCAlw/viewform",
  "Drywall & Insulation": "https://docs.google.com/forms/d/e/1FAIpQLScAcZRFWMzn1aqR8iUSsQDvGX7_u4qiFaAWKh1rfBj-yUWTdg/viewform",
  "Spray Foam": "https://docs.google.com/forms/d/e/1FAIpQLSfDt_PInEcv22g7couOqwBWt3aAE0z2khyVstvL64Bh_F94nw/viewform",
  "Firestopping": "https://docs.google.com/forms/d/e/1FAIpQLSdSOwUpF2R9Lu1jVPyAHw3gYAtScA6g0Xg1GgZM0f9XHqNbpw/viewform",
  "Interior Paint": "https://docs.google.com/forms/d/e/1FAIpQLSc-hM6RubgtLgW17ehO4N-M_n0GdYegt92nOjtk76rpJ9BrEg/viewform",
  "Cabinets & Built-Ins": "https://docs.google.com/forms/d/e/1FAIpQLSeVDGbjxKZfRH57Q3Hnsg0v9zq8_cDHY7YwiW1vrDhL3UhEvg/viewform",
  "Countertops": "https://docs.google.com/forms/d/e/1FAIpQLSesvy8n1mJy40Vfc8aLvr4vZj_s8eFYty-Koy50gZCVao1Onw/viewform",
  "Plumbing Fixtures": "https://docs.google.com/forms/d/e/1FAIpQLSeRVdphdpwYbxBc_aK5twfy8l8NmYmzWC78IAo_UUCa5TIi8g/viewform",
  "Lighting Fixtures": "https://docs.google.com/forms/d/e/1FAIpQLSdUlJDgdg-0U8PGawIXxDFEoh9N-Umg1GkpFPlTExALk6Pr4A/viewform",
  "Appliances": "https://docs.google.com/forms/d/e/1FAIpQLSetYkyrBuiZzMAJjNAOgwRBVaYaSD5ML9H8NykZN6FumwXp4A/viewform",
  "Interior Railings": "https://docs.google.com/forms/d/e/1FAIpQLSc-UepSy3QBIa1FezKxyZRxZq2ao6xpexsM0XcDj4AvGmOBWQ/viewform",
  "Tile Material": "https://docs.google.com/forms/d/e/1FAIpQLSfW_KKx-bQTWrvpwSy3eW6y1oS-w5SSCIOcOcOhlw7wwtmZ0g/viewform",
  "Flooring Material & Labour": "https://docs.google.com/forms/d/e/1FAIpQLSeSYKdGv3uSCTsC1nsdxo2xhabGc0ESM0GvNI8QeUx3qx5aTg/viewform",
  "Specialty Flooring": "https://docs.google.com/forms/d/e/1FAIpQLSexm3gUhdDAQMHKvj4nokj_lu-7ArlnVTQ0sF9iotkOVkMuIg/viewform",
  "Finishing Materials": "https://docs.google.com/forms/d/e/1FAIpQLSc1xY9GKgQKqVEeaHux_XRwKwopKH7TWOfUG_5VLe-eWuh4Cg/viewform",
  "Finishing Labour": "https://docs.google.com/forms/d/e/1FAIpQLSeEvmm3b4vLnBiwRvKbORlFOSKrqHW1ukLvCik7KNhwbiN_fA/viewform",
  "Tile Labour": "https://docs.google.com/forms/d/e/1FAIpQLSdYv1SzhJLaXbbUCltJe1wcl_YASORPGHnDaNgfEIH-HpKz4Q/viewform",
  "Interior Glass and Mirrors": "https://docs.google.com/forms/d/e/1FAIpQLSeTv59wK6LMpXUeFEaMq3xFOX0C6wFouGBVzLfuovPIe2TqZA/viewform",
  "Signage": "https://docs.google.com/forms/d/e/1FAIpQLScnv7gZ99_CCHAhhgI6pj5Kkbat4suTHbucCGaiPD-3BmOyNw/viewform",
  "Accessibility Equipment": "https://docs.google.com/forms/d/e/1FAIpQLScmw2AqUvErvjJN1CPciP_Rv4-BlSbKLykcFjGX-cXR-UOBlA/viewform",
  "Exterior Flatwork (Sidewalk, Aprons, etc.)": "https://docs.google.com/forms/d/e/1FAIpQLSfafLvOYIzrv7pctoUZGys-D1k7NoKyVJVX0o8R7y8kbqqNqA/viewform",
  "Exterior Railings": "https://docs.google.com/forms/d/e/1FAIpQLSf8RJC9H0YP-d7JBGggIPHR2BndnbWyXKCEXVAnrz_l9BoIXg/viewform",
  "Mailbox / House Numbers": "https://docs.google.com/forms/d/e/1FAIpQLSdO8KcYPdsya-EDS6_He40xh3Bda5FKo08ix8fYEeNanxPpKQ/viewform",
  "Bike Storage / Mobility Lockers": "https://docs.google.com/forms/d/e/1FAIpQLSdTc11TWU3qFE6ldYFEysXKX-wzff4NOkksZxEtef2SVWMpIQ/viewform",
  "Landscaping & Fencing": "https://docs.google.com/forms/d/e/1FAIpQLSc4jE0SswQzIajeO_YDi7m4PCuuOeux_Eo1L_8znKyVfnazxA/viewform",
  "Parking Lot Asphalt": "https://docs.google.com/forms/d/e/1FAIpQLSd8sIY4BciOpdBBS9LooL6S28ipcBz4PKmbXGdK0mIVwW9gEQ/viewform"
};

export const ARKHAM_SCOPE_TEMPLATES: ScopeTemplateItem[] = [
  // Package 1A
  {
    phaseId: '1A',
    name: "Demolition, Excavation, Other Earthworks & DSSP Install",
    description: "Demolish the existing building and paving at 2811 Centre St NW and remove all debris. Excavate for the full basement, elevator pit and footings. Backfill and rough-grade the site. The geotech advises replacing the on-site silt with engineered clay fill where needed. Allow for sump pumping, because groundwater seepage is expected about 2.5 m into native soil. Install all DSSP storm and sanitary piping, manholes, catch basins, the Ecobloc storage tank and the Hydrovex, with gravel, drain rock, coring and City inspections.",
    defaultBudget: 0,
    isRequired: true,
    costCode: "20020"
  },
  {
    phaseId: '1A',
    name: "Shoring",
    description: "Supply and install the temporary cantilever soldier pile and timber lagging shoring system as per the PrairieGEO shoring design (PGE26-07-14): drill min. 880 mm holes, and set W530x66 steel soldier piles at 2.4 m on centre (6.1 m and 9.1 m long), grouted/lean-mix backfilled. Supply and install 75 mm rough-sawn timber lagging in lifts as the excavation (approx. 4 m deep) goes down.",
    defaultBudget: 0,
    isRequired: true,
    costCode: "20050"
  },
  {
    phaseId: '1A',
    name: "DSSP Materials",
    description: "Supply all DSSP materials as per plans: 150/250 mm PVC storm and sanitary pipe, Type 5A sulphate-resistant manholes (MH-03), Type C catch basins with shafts, the Ecobloc Inspect Smart underground storage tank (8 blocks, 1.69 m³), a Hydrovex 50VHV-1 flow regulator, area drains and fittings.",
    defaultBudget: 0,
    isRequired: true,
    costCode: "20150"
  },
  {
    phaseId: '1A',
    name: "Water & Offsite Services",
    description: "Install the new water service (PVC DR18, minimum 3.0 m cover) from the City main to the meter room, with tapping valve/tee, OS&Y valves and the flanged entry detail. Connect the sanitary and storm services at the main, and restore the lane and road. Includes the City Permission to Permit and any offsite work required by the development agreement.",
    defaultBudget: 0,
    isRequired: true,
    costCode: "20120"
  },
  {
    phaseId: '1A',
    name: "Foundation & Suspended Slabs",
    description: "Form, reinforce and pour all 18 footings (F01-F18), 250 mm concrete foundation walls and approx. 11 concrete columns/piers shown on the foundation plan (425x625, 425x500, 400x650 and 400x450 mm), using sulphate-resistant concrete as required by the geotech. Supply and set anchor bolts and base plate grout for the 32 steel HSS columns (C-01 to C-32) that bear on the foundation; the steel columns themselves are by the steel trade. ELEVATOR PIT: excavate and pour the complete pit as part of the foundation: thickened pit slab/footing, reinforced pit walls tied into the foundation walls, waterproofing/damp-proofing to keep the pit dry (groundwater is shallow), and any sump pit, pit ladder inserts, embed plates or sill angles. Pit depth, dimensions and embeds must match the elevator supplier's shop drawings. WINDOW WELLS: form, reinforce and pour the concrete window well walls and bases, doweled into the foundation walls. SUSPENDED SLABS: supply, place and finish concrete for the suspended slabs on levels 2-4 and the roof: Canam P3615 composite steel deck with 150 mm concrete slab and wire mesh. Includes the 3 piles shown as 'by others' if they're carried in this package.",
    defaultBudget: 0,
    isRequired: true,
    costCode: "20202"
  },
  {
    phaseId: '1A',
    name: "Basement Slab / Weeping & Gravel",
    description: "Place the basement slab-on-grade over 4\" rigid insulation, 10 mil poly and compacted gravel. Install weeping tile to a sump with a pump, damp-proofing on the foundation walls, clear gravel backfill, and the radon sub-slab pit and gas-permeable layer.",
    defaultBudget: 0,
    isRequired: true,
    costCode: "20206"
  },
  {
    phaseId: '1A',
    name: "Structural Steel",
    description: "Supply, fabricate and erect all structural steel: HSS columns (C-01 to C-32), beams, joists, the 155C transfer members, stair and penthouse framing, base plates and connections. Includes shop drawings, connection design and misc. metals.",
    defaultBudget: 0,
    isRequired: true,
    costCode: "20340"
  },
  {
    phaseId: '1A',
    name: "Framing Materials",
    description: "Design, engineer and fabricate the prefabricated (panelized) wood framing package offsite, delivered to site ready to set. Includes: panel shop drawings and layout from the architectural and structural drawings, stamped by the panel supplier's engineer where required. Loose lumber is supplied for site-built items such as bulkheads, furring and blocking added after the panels are set.",
    defaultBudget: 0,
    isRequired: true,
    costCode: "20310"
  },
  {
    phaseId: '1A',
    name: "Exterior Doors & Windows",
    description: "Supply and install all windows: LUX Windows 1300 series, wood-combination custom colour, sealed double-glazed argon low-E units, as per the window schedule. Supply and install all exterior doors: insulated hollow-metal and balcony doors with aluminum thresholds, weatherstripping and hardware. Also supply and install the aluminum curtain wall system with glazing, including shop drawings.",
    defaultBudget: 0,
    isRequired: true,
    costCode: "20410"
  },
  {
    phaseId: '1A',
    name: "Building Envelope Sealant",
    description: "Backer rod and sealant at all window, door, curtain wall and penetration perimeters, and at cladding transitions, as per the typical window and section details.",
    defaultBudget: 0,
    isRequired: true,
    costCode: "20430"
  },
  {
    phaseId: '1A',
    name: "Elevator",
    description: "Supply and install one passenger elevator serving the basement to level 4, including cab, controls, rails, door equipment, permits, provincial inspection and commissioning. It must meet the barrier-free requirements of NBC 3.8.3.7. Provide pit and shaft dimensions early so they can go into the foundation and steel design.",
    defaultBudget: 0,
    isRequired: true,
    costCode: "21598"
  },
  {
    phaseId: '1A',
    name: "Plumbing & Gas Rough-In and Final",
    description: "Complete plumbing and gas system: underground and above-ground sanitary, storm and vent; domestic water from the meter with RP backflow preventer; two AO Smith 100-gal gas DHW tanks; fixtures installed; duplex sump pumps; roof drains and RWLs; radon vent pipe; gas piping and meter coordination. Includes the hydronic heating system: gas-fired boiler(s), pumps, expansion tank, and piping to the hydronic coils at the fan coils and unit heaters, plus controls, permits, testing and balancing.",
    defaultBudget: 0,
    isRequired: true,
    costCode: "20710"
  },
  {
    phaseId: '1A',
    name: "Fire Protection / Sprinkler System",
    description: "Design-build NFPA-13 wet sprinkler system throughout (NFPA-13R not accepted), with dry heads/dry systems at exposed areas such as balconies, soffits and canopies. Includes standpipes in the stairs, fire department connection, flow/tamper switches, hydraulic calcs and APEGA-stamped shop drawings, flow testing, and fire extinguishers with semi-recessed cabinets as per NFPA-10.",
    defaultBudget: 0,
    isRequired: true,
    costCode: "20730"
  },
  {
    phaseId: '1A',
    name: "Electrical Rough-in and Final",
    description: "Complete electrical installation: 800A 120/208V 3-phase main distribution, suite and CRU panels, metering, all wiring, devices, lighting installation, exterior soffit and wall lighting, emergency lighting and exit signs, and motion-controlled corridor lighting. Also: power to all mechanical equipment and electric baseboards, elevator power/phone line and pit light, one Level 2 EV charger, a 1\" solar conduit from roof to basement, Telus/Rogers conduits, Mircom intercom with door strike, and security camera/keypad rough-ins. Includes a complete fire alarm system (FACP, detectors, pull stations, horn/strobes), verification, permits and inspections.",
    defaultBudget: 0,
    isRequired: true,
    costCode: "20810"
  },
  {
    phaseId: '1A',
    name: "HVAC",
    description: "Supply and install the HVAC systems: Daikin VRF fan coils (FC series) with hydronic heating coils and outdoor condensing/heat pump units; HRVs for each suite (Reversomatic) and washroom/kitchen exhaust; cabinet and unit heaters; ductwork, grilles, dampers, fire/smoke dampers; and duct insulation. Includes controls, testing, air balancing and a fully commissioned system. The CRU intake is to be capped for future tenant fit-out.",
    defaultBudget: 0,
    isRequired: true,
    costCode: "20901"
  },

  // Package 1B
  {
    phaseId: '1B',
    name: "Framing Labour",
    description: "Receive, set and fasten the prefabricated wall panels on all floors, in the supplier's setting sequence. Includes: layout on each slab; anchoring the treated plates to the concrete with the specified fasteners and sill gasket/acoustic caulking; plumbing, squaring and bracing; connecting panels at corners, intersections and to the structural steel as detailed; and installing site-built bulkheads, furring, extra blocking and any panels or framing not prefabricated. Also seal sheathing joints for the WRB, and fix any damaged or misfit panels.",
    defaultBudget: 0,
    isRequired: true,
    costCode: "20320"
  },
  {
    phaseId: '1B',
    name: "Interior Stairs",
    description: "Supply and install the two exit stairs from basement to roof: wood stringers and treads with painted steel stems, landings, 1-1/2\" steel handrails (black anodized aluminum at exterior) and guards to code, and rated stair enclosure details. The CRU suite stair is 'by tenant' and excluded.",
    defaultBudget: 0,
    isRequired: true,
    costCode: "20330"
  },
  {
    phaseId: '1B',
    name: "Roofing",
    description: "Supply and install the R1 roof system on the main roof, penthouse and stair roofs: 2-ply SBS torch-applied membrane, protection board, tapered insulation to drain (avg. R45), self-adhered A/V membrane, plywood. Includes flashings, emergency scuppers, roof drain tie-ins, curbs and penetrations, and protection membrane under the rooftop terrace deck.",
    defaultBudget: 0,
    isRequired: true,
    costCode: "20520"
  },
  {
    phaseId: '1B',
    name: "Decking",
    description: "Supply and install the rooftop terrace amenity deck: composite/treated wood decking on leveled sleepers with a protection membrane over the roofing, and the 42\" wood fence with a lockable gate at the terrace.",
    defaultBudget: 0,
    isRequired: true,
    costCode: "20530"
  },
  {
    phaseId: '1B',
    name: "Rainware",
    description: "Supply and install all prefinished downspouts with splash pads, scupper boxes and leaders, colour to match the cladding.",
    defaultBudget: 0,
    isRequired: true,
    costCode: "20540"
  },
  {
    phaseId: '1B',
    name: "Exterior Finishing",
    description: "Supply and install all exterior cladding as per elevations: prefinished corrugated vertical metal siding, vertical aluminum siding (wood finish), light bronze ACM metal panels, and EIFS where noted. Includes furring, building wrap/WRB, flashings, trims and closures, the entry canopy cladding, prefinished metal fascia, and black soffit with cut-outs for pot lights.",
    defaultBudget: 0,
    isRequired: true,
    costCode: "20630"
  },
  {
    phaseId: '1B',
    name: "Drywall & Insulation",
    description: "Supply and install insulation (R22 batts, mineral wool and acoustic batts), 6 mil poly, resilient channels, and all gypsum board including Type X and shaftwall assemblies (P6). Install C-stud ceiling framing and gypsum ceilings under the steel joists. Tape, mud and sand to a paint-ready finish. Dens-Shield tile backer at all tubs and showers.",
    defaultBudget: 0,
    isRequired: true,
    costCode: "21110"
  },
  {
    phaseId: '1B',
    name: "Spray Foam",
    description: "Spray foam insulation at rim joists, window and door shim spaces, and other locations shown on the details. Wood moisture content must be below 19% before spraying.",
    defaultBudget: 0,
    isRequired: true,
    costCode: "21130"
  },
  {
    phaseId: '1B',
    name: "Firestopping",
    description: "Supply and install listed firestop systems at all penetrations and joints through rated walls, floors and shafts, as per the fire separations on A002 (45 min to 2 hr). Also supply and apply spray-applied fire resistive material (SFRM, A/D Type 5) to the steel beams, joists and deck to the thickness required by UL D902 for the 1 hr (F4) and 2 hr (F5) floor assemblies and the roof assembly (R1), with a 1\" space allowed above the ceiling framing.",
    defaultBudget: 0,
    isRequired: true,
    costCode: "21160"
  },
  {
    phaseId: '1B',
    name: "Interior Paint",
    description: "Prime and paint all drywall surfaces, ceilings, doors and frames (HM frames included), and exposed stair steel, as per finish schedules.",
    defaultBudget: 0,
    isRequired: true,
    costCode: "21310"
  },
  {
    phaseId: '1B',
    name: "Cabinets & Built-Ins",
    description: "Supply and install all kitchen, bathroom vanity and built-in millwork in the residential suites, as per the ID drawings. Shop drawings must be approved by the designer before fabrication.",
    defaultBudget: 0,
    isRequired: true,
    costCode: "21420"
  },

  // Package 2 - Interior A
  {
    phaseId: '2A',
    name: "Countertops",
    description: "Supply, template and install all countertops in suite kitchens and baths as per ID specs, including sink cut-outs. Supply sinks if carried in this package.",
    defaultBudget: 0,
    isRequired: true,
    costCode: "21570"
  },
  {
    phaseId: '2A',
    name: "Plumbing Fixtures",
    description: "Supply all suite plumbing fixtures and trim (toilets, lavs, faucets, showers, tub fillers) to the mechanical fixture schedule and ID spec. Fixtures are installed by the plumber.",
    defaultBudget: 0,
    isRequired: true,
    costCode: "21510"
  },
  {
    phaseId: '2A',
    name: "Lighting Fixtures",
    description: "Supply all interior and exterior light fixtures as per the electrical luminaire schedule and ID selections. Includes soffit pot lights and exterior wall fixtures. Fixtures are installed by the electrician.",
    defaultBudget: 0,
    isRequired: true,
    costCode: "21520"
  },
  {
    phaseId: '2A',
    name: "Appliances",
    description: "Supply, deliver and install all suite appliances (fridge, range, hood, dishwasher, microwave, washer/dryer) for all residential units, as per the ID appliance spec.",
    defaultBudget: 0,
    isRequired: true,
    costCode: "21010"
  },
  {
    phaseId: '2A',
    name: "Interior Railings",
    description: "Supply and install interior railings, guards and any decorative handrails beyond the stair handrails, as per spec.",
    defaultBudget: 0,
    isRequired: true,
    costCode: "21580"
  },
  {
    phaseId: '2A',
    name: "Tile Material",
    description: "Supply all floor and wall tile, setting materials and grout for suite bathrooms, kitchens and common areas, as per ID specs.",
    defaultBudget: 0,
    isRequired: true,
    costCode: "21210"
  },
  {
    phaseId: '2A',
    name: "Flooring Material & Labour",
    description: "Supply and install all flooring (LVP/hardwood/carpet as specified) in the suites, corridors and common areas, including underlay, the acoustic mat over the concrete slabs, transitions and stair nosings.",
    defaultBudget: 0,
    isRequired: true,
    costCode: "21230"
  },
  {
    phaseId: '2A',
    name: "Specialty Flooring",
    description: "Supply and install specialty flooring as per spec, e.g. sealed concrete or other specified finishes in common areas or the lobby.",
    defaultBudget: 0,
    isRequired: true,
    costCode: "21250"
  },

  // Package 2 - Interior B
  {
    phaseId: '2B',
    name: "Finishing Materials",
    description: "Supply interior doors, frames, baseboards, casings and mouldings. Supply the full hardware/lockout package to the door hardware groups (H1-H16): levers, deadbolts, soft-close sliding closet hardware, balcony door hardware, stops and bath accessories.",
    defaultBudget: 0,
    isRequired: true,
    costCode: "21550"
  },
  {
    phaseId: '2B',
    name: "Finishing Labour",
    description: "Install all interior doors, trim, baseboards, casings, hardware and bath accessories.",
    defaultBudget: 0,
    isRequired: true,
    costCode: "21430"
  },
  {
    phaseId: '2B',
    name: "Tile Labour",
    description: "Install all floor and wall tile, including waterproofing at showers and tub surrounds over Dens-Shield backer, as per ID layouts.",
    defaultBudget: 0,
    isRequired: true,
    costCode: "21220"
  },
  {
    phaseId: '2B',
    name: "Interior Glass and Mirrors",
    description: "Supply and install shower glass/enclosures and all suite and common-area mirrors.",
    defaultBudget: 0,
    isRequired: true,
    costCode: "21530"
  },
  {
    phaseId: '2B',
    name: "Signage",
    description: "Supply and install suite and room numbers, code-required signage (stair/floor identification, elevator signage, barrier-free signage) and any building identification signage.",
    defaultBudget: 0,
    isRequired: true,
    costCode: "21594"
  },
  {
    phaseId: '2B',
    name: "Accessibility Equipment",
    description: "Supply and install barrier-free items as required by NBC 3.8. Include shop drawings and specs.",
    defaultBudget: 0,
    isRequired: true,
    costCode: "21595"
  },

  // Package 3 - Exterior & Garage
  {
    phaseId: '3',
    name: "Exterior Flatwork (Sidewalk, Aprons, etc.)",
    description: "Place all exterior concrete: the 1.2 m concrete walkways, the new 2.0 m City walkway, the driveway apron to City spec, the garbage and recycling enclosure pads (residential and commercial), the transformer pad if required, and curbs including the high curb/max 0.4 m retaining curb along the property line.",
    defaultBudget: 0,
    isRequired: true,
    costCode: "20207"
  },
  {
    phaseId: '3',
    name: "Exterior Railings",
    description: "Supply and install all exterior guards and railings at balconies, the rooftop terrace and exterior stairs/landings to code (1070 mm minimum height, 100 mm maximum openings).",
    defaultBudget: 0,
    isRequired: true,
    costCode: "20650"
  },
  {
    phaseId: '3',
    name: "Mailbox / House Numbers",
    description: "Supply and install Canada Post-approved mailboxes in the lobby (as per the mailbox detail) and building address numbers.",
    defaultBudget: 0,
    isRequired: true,
    costCode: "20680"
  },
  {
    phaseId: '3',
    name: "Bike Storage / Mobility Lockers",
    description: "Supply and install bike racks: 10 Class A residential stalls in the bike storage room and 4 stalls for the CRU, as per the bike rack detail. Includes wheel stops and bollards if carried here.",
    defaultBudget: 0,
    isRequired: true,
    costCode: "21860"
  },
  {
    phaseId: '3',
    name: "Landscaping & Fencing",
    description: "Final grading, topsoil (0.3 m for sod, 0.6 m for beds), sod, alpine currant shrubs in the 3 raised planters, native plantings for the LID requirements, and decorative rock. Supply and install site fencing and garbage enclosure screening as shown.",
    defaultBudget: 0,
    isRequired: true,
    costCode: "21610"
  },
  {
    phaseId: '3',
    name: "Parking Lot Asphalt",
    description: "Supply and place heavy-duty asphalt paving for the 4-stall carport/parking area off the lane, to a depth and class able to carry a loaded collection vehicle or fire truck (38,556 kg) as per the civil notes. Includes subgrade prep and granular base, tie-in to the existing asphalt lane, painted stall lines, and setting the manhole rims before the final lift.",
    defaultBudget: 0,
    isRequired: true,
    costCode: "21850"
  }
];

export function generateArkhamScopesFromTemplate(): ScopeLineItem[] {
  const now = new Date().toISOString();
  const normalizedUrlMap = new Map<string, string>();
  Object.entries(ARKHAM_GOOGLE_FORM_URLS).forEach(([k, v]) => {
    if (v && v.trim()) {
      normalizedUrlMap.set(k.toLowerCase().replace(/[^a-z0-9]/g, ''), v.trim());
    }
  });

  return ARKHAM_SCOPE_TEMPLATES.map((tmpl, idx) => {
    const key = tmpl.name.toLowerCase().replace(/[^a-z0-9]/g, '');
    const preloadedUrl =
      tmpl.googleFormUrl ||
      ARKHAM_GOOGLE_FORM_URLS[tmpl.name] ||
      normalizedUrlMap.get(key) ||
      '';
    return {
      id: `scope-arkham-${tmpl.phaseId.toLowerCase()}-${idx + 1}-${Date.now()}`,
      phaseId: tmpl.phaseId,
      name: tmpl.name,
      description: tmpl.description,
      budgetAmount: tmpl.defaultBudget,
      isRequired: tmpl.isRequired,
      order: idx + 1,
      costCode: tmpl.costCode || getAccurateScopeCostCode(tmpl.name),
      googleFormUrl: preloadedUrl,
      createdAt: now,
      trades: []
    };
  });
}
export const INITIAL_PROJECTS: Project[] = REAL_ZENITH_PROJECTS;

