// Master Breakdown Cost Code & Scope Dictionary
// Contains all 75 canonical line-item description mappings matching Zenith Tender Management specifications

export interface MasterCostCodeItem {
  id: number;
  description: string;
  costCode: string;
  tradeScope: string;
  category: string;
  aliases?: string[];
}

export const MASTER_BREAKDOWN_ITEMS: MasterCostCodeItem[] = [
  // =========================================================================
  // [Demolition]
  // =========================================================================
  {
    id: 1,
    description: "Total for Demolition",
    costCode: "20020",
    tradeScope: "Demolition",
    category: "Demolition",
    aliases: ["demolition", "site abatement", "hazardous abatement", "demolition site clear", "building demo"]
  },

  // =========================================================================
  // [Earthworks & Utilities]
  // =========================================================================
  {
    id: 2,
    description: "Total for Excavation, Backfill and Rough Grading",
    costCode: "20040",
    tradeScope: "Excavation & Earthworks",
    category: "Earthworks & Utilities",
    aliases: ["excavation rough grading", "excavation and backfill", "earthworks and grading", "rough grading"]
  },
  {
    id: 3,
    description: "Total for Excavation, Trenching for Deep Utilities",
    costCode: "20040",
    tradeScope: "Excavation & Earthworks",
    category: "Earthworks & Utilities",
    aliases: ["deep utilities trenching", "utility trenching", "deep sewer trenching", "deep service trenching"]
  },
  {
    id: 4,
    description: "Total for full DSSP install, gravel, coring, drain rock",
    costCode: "20040",
    tradeScope: "Excavation & Earthworks",
    category: "Earthworks & Utilities",
    aliases: ["dssp install", "coring drain rock", "dssp civil installation", "full dssp package"]
  },
  {
    id: 5,
    description: "Total for all DSSP Materials as per plans",
    costCode: "20150",
    tradeScope: "DSSP Materials",
    category: "Earthworks & Utilities",
    aliases: ["dssp materials", "hydrovex", "storm tanks catch basins", "storm pipe fittings", "area drains"]
  },
  {
    id: 6,
    description: "Total for Water & Underground",
    costCode: "20120",
    tradeScope: "Water & Offsite Services",
    category: "Earthworks & Utilities",
    aliases: ["water underground", "offsite water services", "underground services tie in", "water services"]
  },
  {
    id: 7,
    description: "Total for Permission to Permit",
    costCode: "12040",
    tradeScope: "Water & Offsite Services",
    category: "Earthworks & Utilities",
    aliases: ["permission to permit", "street cut permit", "water tie in permit", "municipal permit fees"]
  },

  // =========================================================================
  // [Concrete & Foundations]
  // =========================================================================
  {
    id: 8,
    description: "Total for Foundation and Footing Walls",
    costCode: "20202",
    tradeScope: "Footing & Foundation",
    category: "Concrete & Foundations",
    aliases: ["foundation walls", "footing foundation", "cribbing and rebar", "strip footings", "concrete walls"]
  },
  {
    id: 9,
    description: "Garage Foundation",
    costCode: "20202",
    tradeScope: "Footing & Foundation",
    category: "Concrete & Foundations",
    aliases: ["garage footing", "garage frost wall", "garage cribbing", "detached garage foundation"]
  },
  {
    id: 10,
    description: "Retaining Wall",
    costCode: "20201",
    tradeScope: "Footing & Foundation",
    category: "Concrete & Foundations",
    aliases: ["retaining walls", "concrete retaining wall", "structural retaining wall", "block retaining wall"]
  },
  {
    id: 11,
    description: "Basement Slab",
    costCode: "20206",
    tradeScope: "Concrete Slabs",
    category: "Concrete & Foundations",
    aliases: ["basement floor slab", "interior concrete slab", "basement slab pour"]
  },
  {
    id: 12,
    description: "Garage Slab",
    costCode: "21850",
    tradeScope: "Concrete Slabs",
    category: "Concrete & Foundations",
    aliases: ["garage floor slab", "garage pad", "garage slab pour"]
  },
  {
    id: 13,
    description: "Weeping Tile, Gravel, Damp Proofing",
    costCode: "20204",
    tradeScope: "Concrete Slabs",
    category: "Concrete & Foundations",
    aliases: ["weeping tile", "foundation damp proofing", "foundation drainage gravel", "weeping tile gravel"]
  },
  {
    id: 14,
    description: "Total for all Precast Steps",
    costCode: "20208",
    tradeScope: "Precast Steps",
    category: "Concrete & Foundations",
    aliases: ["precast steps", "precast stairs", "precast concrete steps", "concrete steps"]
  },
  {
    id: 15,
    description: "Total for all concrete driveways, aprons, curbs, sidewalks",
    costCode: "20207",
    tradeScope: "Exterior Flatwork",
    category: "Concrete & Foundations",
    aliases: ["exterior flatwork", "concrete driveways", "sidewalks and aprons", "concrete curbs", "walkways pads"]
  },

  // =========================================================================
  // [Framing]
  // =========================================================================
  {
    id: 16,
    description: "Total for full framing material package",
    costCode: "20310",
    tradeScope: "Framing Materials",
    category: "Framing",
    aliases: ["framing material package", "framing lumber", "trusses joists lumber", "lumber takeoff"]
  },
  {
    id: 17,
    description: "Main Unit Framing Labour total",
    costCode: "20320",
    tradeScope: "Framing Labour",
    category: "Framing",
    aliases: ["main unit framing labour", "framing labour main building", "framing carpentry labour"]
  },
  {
    id: 18,
    description: "Basement Framing Labour total",
    costCode: "20320",
    tradeScope: "Framing Labour",
    category: "Framing",
    aliases: ["basement framing labour", "basement wood framing labour", "basement partition framing"]
  },
  {
    id: 19,
    description: "Garage Framing Labour total",
    costCode: "20320",
    tradeScope: "Framing Labour",
    category: "Framing",
    aliases: ["garage framing labour", "garage framing carpentry", "detached garage framing labour"]
  },
  {
    id: 20,
    description: "Interior Stairs",
    costCode: "20330",
    tradeScope: "Interior Stairs",
    category: "Framing",
    aliases: ["interior stairs", "engineered closed stringer stairs", "rough interior stairs", "stair framing"]
  },

  // =========================================================================
  // [Doors, Windows & Openings]
  // =========================================================================
  {
    id: 21,
    description: "Total for all Window Wells",
    costCode: "20350",
    tradeScope: "Window Wells",
    category: "Doors, Windows & Openings",
    aliases: ["window wells", "galvanized window wells", "basement window wells", "corrugated window wells"]
  },
  {
    id: 22,
    description: "Total for all Exterior Doors",
    costCode: "20410",
    tradeScope: "Exterior Doors & Windows",
    category: "Doors, Windows & Openings",
    aliases: ["exterior doors", "entry doors", "patio doors", "front entry door"]
  },
  {
    id: 23,
    description: "Total for all Windows",
    costCode: "20420",
    tradeScope: "Exterior Doors & Windows",
    category: "Doors, Windows & Openings",
    aliases: ["windows", "pvc windows", "vinyl windows", "exterior glazing package"]
  },
  {
    id: 24,
    description: "Sealant for all necessary openings",
    costCode: "20430",
    tradeScope: "Window Sealant",
    category: "Doors, Windows & Openings",
    aliases: ["window sealant", "caulking and sealant", "door window caulking", "exterior sealant"]
  },
  {
    id: 25,
    description: "Total for Garage Overhead Door (OHD)",
    costCode: "21840",
    tradeScope: "Garage Overhead Door",
    category: "Doors, Windows & Openings",
    aliases: ["garage overhead door", "overhead door ohd", "garage door motor", "sectional overhead door"]
  },
  {
    id: 26,
    description: "Total for all Garage Entry Exterior Doors",
    costCode: "21830",
    tradeScope: "Garage Exterior Door",
    category: "Doors, Windows & Openings",
    aliases: ["garage entry exterior doors", "garage man door", "garage walk through door"]
  },

  // =========================================================================
  // [Roofing, Decking & Exterior Finishes]
  // =========================================================================
  {
    id: 27,
    description: "Total for Roofing (sloped)",
    costCode: "20510",
    tradeScope: "Roofing",
    category: "Roofing, Decking & Exterior Finishes",
    aliases: ["roofing sloped", "asphalt shingles sloped roof", "pitched roof"]
  },
  {
    id: 28,
    description: "Total for Flat Roof",
    costCode: "20520",
    tradeScope: "Roofing",
    category: "Roofing, Decking & Exterior Finishes",
    aliases: ["flat roof", "tpo flat roofing", "sbs flat roof", "low slope roof"]
  },
  {
    id: 29,
    description: "Total for Garage Roof",
    costCode: "21820",
    tradeScope: "Roofing",
    category: "Roofing, Decking & Exterior Finishes",
    aliases: ["garage roof", "garage shingles", "detached garage roof"]
  },
  {
    id: 30,
    description: "Total for Decking as per plans",
    costCode: "20530",
    tradeScope: "Decking",
    category: "Roofing, Decking & Exterior Finishes",
    aliases: ["decking", "exterior deck", "composite decking", "deck vinyl"]
  },
  {
    id: 31,
    description: "Total for all Rainware, Downspouts and Gutters",
    costCode: "20540",
    tradeScope: "Rainware",
    category: "Roofing, Decking & Exterior Finishes",
    aliases: ["rainware downspouts gutters", "eavestrough", "downspouts", "gutters"]
  },
  {
    id: 32,
    description: "Total for Exterior Finishing & Cladding - Main Building",
    costCode: "20630",
    tradeScope: "Exterior Finishing",
    category: "Roofing, Decking & Exterior Finishes",
    aliases: ["exterior finishing cladding main building", "main building siding", "hardie siding cladding"]
  },
  {
    id: 33,
    description: "Total for Exterior Finishing & Cladding - Garage",
    costCode: "20630",
    tradeScope: "Exterior Finishing",
    category: "Roofing, Decking & Exterior Finishes",
    aliases: ["exterior finishing cladding garage", "garage siding", "garage hardie board"]
  },
  {
    id: 34,
    description: "Total for Soffit & Fascia - Main Building",
    costCode: "20640",
    tradeScope: "Exterior Finishing",
    category: "Roofing, Decking & Exterior Finishes",
    aliases: ["soffit fascia main building", "aluminum soffit fascia", "eaves soffit fascia"]
  },
  {
    id: 35,
    description: "Total for Soffit & Fascia - Garage",
    costCode: "20640",
    tradeScope: "Exterior Finishing",
    category: "Roofing, Decking & Exterior Finishes",
    aliases: ["soffit fascia garage", "garage aluminum soffit"]
  },
  {
    id: 36,
    description: "Total for masonry (supply & install)",
    costCode: "20610",
    tradeScope: "Masonry",
    category: "Roofing, Decking & Exterior Finishes",
    aliases: ["masonry supply and install", "brick stone supply and install", "architectural masonry supply install"]
  },
  {
    id: 37,
    description: "Total for masonry (supply)",
    costCode: "20610",
    tradeScope: "Masonry",
    category: "Roofing, Decking & Exterior Finishes",
    aliases: ["masonry supply", "stone veneer supply", "brick supply"]
  },
  {
    id: 38,
    description: "Total for masonry (install)",
    costCode: "20610",
    tradeScope: "Masonry",
    category: "Roofing, Decking & Exterior Finishes",
    aliases: ["masonry install", "masonry labour", "stone veneer install", "scratch coat masonry"]
  },
  {
    id: 39,
    description: "Total for Stucco - Main Building",
    costCode: "20620",
    tradeScope: "Stucco",
    category: "Roofing, Decking & Exterior Finishes",
    aliases: ["stucco main building", "acrylic stucco", "exterior stucco plaster"]
  },
  {
    id: 40,
    description: "Total for Stucco - Garage",
    costCode: "20620",
    tradeScope: "Stucco",
    category: "Roofing, Decking & Exterior Finishes",
    aliases: ["stucco garage", "garage acrylic stucco"]
  },
  {
    id: 41,
    description: "Total for Exterior Stairs",
    costCode: "20660",
    tradeScope: "Exterior Stairs",
    category: "Roofing, Decking & Exterior Finishes",
    aliases: ["exterior stairs", "outside stairs", "metal exterior stairs", "exterior timber stairs"]
  },
  {
    id: 42,
    description: "Total for Exterior Railings",
    costCode: "20650",
    tradeScope: "Exterior Railings",
    category: "Roofing, Decking & Exterior Finishes",
    aliases: ["exterior railings", "aluminum railings", "glass deck railings", "patio railings"]
  },

  // =========================================================================
  // [Mechanical, Electrical & Plumbing]
  // =========================================================================
  {
    id: 43,
    description: "Plumbing Rough-In & Final",
    costCode: "20710",
    tradeScope: "Plumbing & Gas",
    category: "Mechanical, Electrical & Plumbing",
    aliases: ["plumbing rough in final", "sanitary drainage supply lines", "plumbing rough in"]
  },
  {
    id: 44,
    description: "Gas Rough-in & Final",
    costCode: "20710",
    tradeScope: "Plumbing & Gas",
    category: "Mechanical, Electrical & Plumbing",
    aliases: ["gas rough in final", "gas piping lines", "gas test inspection"]
  },
  {
    id: 45,
    description: "Plumbing & Gas Permits",
    costCode: "20710",
    tradeScope: "Plumbing & Gas",
    category: "Mechanical, Electrical & Plumbing",
    aliases: ["plumbing and gas permits", "plumbing permits", "gas permits"]
  },
  {
    id: 46,
    description: "Electrical Rough-in & Final",
    costCode: "20810",
    tradeScope: "Electrical",
    category: "Mechanical, Electrical & Plumbing",
    aliases: ["electrical rough in final", "electrical wiring service panel", "electrical contractor", "200a service"]
  },
  {
    id: 47,
    description: "Heating Rough-in & Final",
    costCode: "20901",
    tradeScope: "HVAC",
    category: "Mechanical, Electrical & Plumbing",
    aliases: ["heating rough in final", "hvac furnace ductwork", "heating system rough in"]
  },
  {
    id: 48,
    description: "Air Conditioning (Rough-In Only)",
    costCode: "20902",
    tradeScope: "HVAC",
    category: "Mechanical, Electrical & Plumbing",
    aliases: ["air conditioning rough in only", "ac rough in", "cooling lines rough in", "a c rough in"]
  },
  {
    id: 49,
    description: "Total for Sprinkler System",
    costCode: "20730",
    tradeScope: "Sprinkler System",
    category: "Mechanical, Electrical & Plumbing",
    aliases: ["sprinkler system", "fire suppression sprinklers", "nfpa 13r sprinklers", "fire sprinkler"]
  },
  {
    id: 50,
    description: "Total for Fireplace/s",
    costCode: "20740",
    tradeScope: "Fireplace",
    category: "Mechanical, Electrical & Plumbing",
    aliases: ["fireplace", "fireplaces", "gas fireplace", "electric fireplace supply install"]
  },

  // =========================================================================
  // [Drywall, Insulation & Finishes]
  // =========================================================================
  {
    id: 51,
    description: "Total for Drywall & Insulation - Main building",
    costCode: "21110",
    tradeScope: "Drywall & Insulation",
    category: "Drywall, Insulation & Finishes",
    aliases: ["drywall insulation main building", "board tape mud", "batt insulation vapour barrier"]
  },
  {
    id: 52,
    description: "Total for Drywall & Insulation - Garage",
    costCode: "21110",
    tradeScope: "Drywall & Insulation",
    category: "Drywall, Insulation & Finishes",
    aliases: ["drywall insulation garage", "garage drywall taping", "garage fire separation drywall"]
  },
  {
    id: 53,
    description: "Total for Spray Foam",
    costCode: "21130",
    tradeScope: "Spray Foam",
    category: "Drywall, Insulation & Finishes",
    aliases: ["spray foam", "polyurethane spray foam", "rim joist spray foam", "spray foam insulation"]
  },
  {
    id: 54,
    description: "Full Finishing Material Package",
    costCode: "21550",
    tradeScope: "Finishing Materials",
    category: "Drywall, Insulation & Finishes",
    aliases: ["finishing material package", "interior doors baseboards mouldings", "trim and casing package"]
  },
  {
    id: 55,
    description: "Full Finishing Lockout Package",
    costCode: "21560",
    tradeScope: "Finishing Materials",
    category: "Drywall, Insulation & Finishes",
    aliases: ["finishing lockout package", "lockouts door knobs levers deadbolts", "hardware lockout"]
  },
  {
    id: 56,
    description: "Full Tile installation",
    costCode: "21220",
    tradeScope: "Tile Labour",
    category: "Drywall, Insulation & Finishes",
    aliases: ["full tile installation", "tile labour", "tile setting grout", "shower tile installation"]
  },
  {
    id: 57,
    description: "Full Flooring installation",
    costCode: "21240",
    tradeScope: "Flooring Labour",
    category: "Drywall, Insulation & Finishes",
    aliases: ["full flooring installation", "flooring labour", "lvp installation labour", "hardwood installation labour"]
  },
  {
    id: 58,
    description: "Supply and install Stair Nosings",
    costCode: "21240",
    tradeScope: "Flooring Labour",
    category: "Drywall, Insulation & Finishes",
    aliases: ["stair nosings", "supply and install stair nosings", "lvp stair nosing", "flush stair nosings"]
  },
  {
    id: 59,
    description: "Total for all tile material as per specs",
    costCode: "21210",
    tradeScope: "Tile and Flooring Material",
    category: "Drywall, Insulation & Finishes",
    aliases: ["tile material", "porcelain tile supply", "ceramic tile material", "bathroom tile specs"]
  },
  {
    id: 60,
    description: "Total for all flooring material",
    costCode: "21230",
    tradeScope: "Tile and Flooring Material",
    category: "Drywall, Insulation & Finishes",
    aliases: ["flooring material", "lvp flooring supply", "hardwood material", "laminate flooring supply"]
  },
  {
    id: 61,
    description: "Total for carpet install",
    costCode: "21240",
    tradeScope: "Tile and Flooring Material",
    category: "Drywall, Insulation & Finishes",
    aliases: ["carpet install", "carpet installation and underlay", "bedroom carpet install"]
  },

  // =========================================================================
  // [Fixtures, Cabinets & Interior Features]
  // =========================================================================
  {
    id: 62,
    description: "Total for all Cabinets & Built-ins",
    costCode: "21420",
    tradeScope: "Cabinets & Built-Ins",
    category: "Fixtures, Cabinets & Interior Features",
    aliases: ["cabinets built ins", "kitchen cabinets vanities", "millwork built ins"]
  },
  {
    id: 63,
    description: "Total for all Countertops",
    costCode: "21570",
    tradeScope: "Countertops",
    category: "Fixtures, Cabinets & Interior Features",
    aliases: ["countertops", "quartz countertops", "island countertops", "granite countertops"]
  },
  {
    id: 64,
    description: "Total for all Sinks",
    costCode: "21510",
    tradeScope: "Countertops",
    category: "Fixtures, Cabinets & Interior Features",
    aliases: ["all sinks", "undermount sinks", "kitchen and vanity sinks"]
  },
  {
    id: 65,
    description: "Plumbing Fixture total (excluding sinks)",
    costCode: "21510",
    tradeScope: "Plumbing Fixtures",
    category: "Fixtures, Cabinets & Interior Features",
    aliases: ["plumbing fixtures excluding sinks", "faucets shower trim toilets", "plumbing fixture package"]
  },
  {
    id: 66,
    description: "Total for all Light Fixtures",
    costCode: "21520",
    tradeScope: "Lighting Fixtures",
    category: "Fixtures, Cabinets & Interior Features",
    aliases: ["light fixtures", "lighting package", "pot lights pendants", "interior lighting"]
  },
  {
    id: 67,
    description: "Total for all Appliances",
    costCode: "21010",
    tradeScope: "Appliances",
    category: "Fixtures, Cabinets & Interior Features",
    aliases: ["appliances", "kitchen appliances", "refrigerator stove dishwasher", "appliance package"]
  },
  {
    id: 68,
    description: "Total for interior railings",
    costCode: "21580",
    tradeScope: "Interior Railings",
    category: "Fixtures, Cabinets & Interior Features",
    aliases: ["interior railings", "stair handrails spindle railing", "glass interior railings"]
  },
  {
    id: 69,
    description: "Total for all Interior Glass",
    costCode: "21530",
    tradeScope: "Interior Glass and Mirrors",
    category: "Fixtures, Cabinets & Interior Features",
    aliases: ["interior glass", "shower glass enclosure", "custom glass partition"]
  },
  {
    id: 70,
    description: "Total for all Mirrors",
    costCode: "21540",
    tradeScope: "Interior Glass and Mirrors",
    category: "Fixtures, Cabinets & Interior Features",
    aliases: ["mirrors", "bathroom vanity mirrors", "plate glass mirrors"]
  },
  {
    id: 71,
    description: "Total for all Wire Shelving",
    costCode: "21560",
    tradeScope: "Interior Glass and Mirrors",
    category: "Fixtures, Cabinets & Interior Features",
    aliases: ["wire shelving", "closet wire shelving", "pantry wire shelving"]
  },
  {
    id: 72,
    description: "Total for all Window Coverings",
    costCode: "21590",
    tradeScope: "Window Coverings",
    category: "Fixtures, Cabinets & Interior Features",
    aliases: ["window coverings", "roller blinds", "window shades", "window treatments"]
  },

  // =========================================================================
  // [Site Work & Landscaping]
  // =========================================================================
  {
    id: 73,
    description: "Total for Trees, Decorative Rock, Sod",
    costCode: "21610",
    tradeScope: "Landscaping & Fencing",
    category: "Site Work & Landscaping",
    aliases: ["trees decorative rock sod", "soft landscaping", "sod and plantings", "landscaping"]
  },
  {
    id: 74,
    description: "Total for Fencing",
    costCode: "21620",
    tradeScope: "Landscaping & Fencing",
    category: "Site Work & Landscaping",
    aliases: ["fencing", "perimeter fence", "chain link fence", "wood fence"]
  },
  {
    id: 75,
    description: "Total for Irrigation System",
    costCode: "21630",
    tradeScope: "Landscaping & Fencing",
    category: "Site Work & Landscaping",
    aliases: ["irrigation system", "sprinkler lawn irrigation", "underground lawn sprinkler"]
  }
];

// Normalized helper satisfying Ingestion & Parsing Rule 1:
// Strip leading/trailing whitespace, punctuation, and case formatting before checking keys
export function normalizeTenderKey(raw: string): string {
  if (!raw || typeof raw !== 'string') return '';
  return raw
    .trim()
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ') // Strip all punctuation characters
    .replace(/\s+/g, ' ') // Collapse multiple whitespace runs to a single space
    .trim();
}

// Remove recurring tender boilerplate noise (e.g. "excl gst", "as per plans", "if applicable", etc.)
export function stripTenderNoise(normalized: string): string {
  return normalized
    .replace(/\b(excl|incl|including|excluding)\s+(gst|tax)\b/g, '')
    .replace(/\b(as\s+per\s+plans|as\s+per\s+specs|if\s+applicable)\b/g, '')
    .replace(/\b(supply\s+and\s+install|supply\s+install)\b/g, 'supply install')
    .replace(/\b(total\s+for\s+all|total\s+for|total)\b/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// Pre-computed index for O(1) exact normalized lookups
const EXACT_LOOKUP_MAP = new Map<string, MasterCostCodeItem>();
const NOISE_STRIPPED_MAP = new Map<string, MasterCostCodeItem>();

MASTER_BREAKDOWN_ITEMS.forEach((item) => {
  const normDesc = normalizeTenderKey(item.description);
  EXACT_LOOKUP_MAP.set(normDesc, item);

  const strippedDesc = stripTenderNoise(normDesc);
  if (strippedDesc) {
    NOISE_STRIPPED_MAP.set(strippedDesc, item);
  }

  // Also index cost code directly
  EXACT_LOOKUP_MAP.set(item.costCode, item);

  // Index aliases
  if (item.aliases) {
    item.aliases.forEach((alias) => {
      const normAlias = normalizeTenderKey(alias);
      EXACT_LOOKUP_MAP.set(normAlias, item);
      const strippedAlias = stripTenderNoise(normAlias);
      if (strippedAlias) {
        NOISE_STRIPPED_MAP.set(strippedAlias, item);
      }
    });
  }
});

export interface MatchResult {
  costCode: string;
  tradeScope: string;
  matchedDescription: string;
  category: string;
  confidence: number;
}

/**
 * Master Cost Code and Trade Scope Resolver.
 * Uses exact, substring, and fuzzy/token matching against the 75 line-item dictionary.
 * Complies with Ingestion & Parsing Rule 1 (strip whitespace, punctuation, case formatting).
 */
export function resolveCostCodeAndScope(itemDescription: string): MatchResult {
  if (!itemDescription || typeof itemDescription !== 'string') {
    return {
      costCode: '99999',
      tradeScope: 'Unassigned Scope',
      matchedDescription: 'Unassigned Scope',
      category: 'Unassigned',
      confidence: 0
    };
  }

  const rawTrimmed = itemDescription.trim();
  const normalized = normalizeTenderKey(rawTrimmed);

  if (!normalized) {
    return {
      costCode: '99999',
      tradeScope: 'Unassigned Scope',
      matchedDescription: 'Unassigned Scope',
      category: 'Unassigned',
      confidence: 0
    };
  }

  // 1. Direct Exact Normalized Match
  if (EXACT_LOOKUP_MAP.has(normalized)) {
    const found = EXACT_LOOKUP_MAP.get(normalized)!;
    // Strict Demolition guard: only return Demolition if input explicitly includes demolition
    if (found.costCode === '20020' && !normalized.includes('demolition')) {
      // do not allow
    } else {
      return {
        costCode: found.costCode,
        tradeScope: found.tradeScope,
        matchedDescription: found.description,
        category: found.category,
        confidence: 1.0
      };
    }
  }

  // 2. Direct Noise-Stripped Exact Match
  const stripped = stripTenderNoise(normalized);
  if (stripped && NOISE_STRIPPED_MAP.has(stripped)) {
    const found = NOISE_STRIPPED_MAP.get(stripped)!;
    if (found.costCode === '20020' && !normalized.includes('demolition')) {
      // do not allow
    } else {
      return {
        costCode: found.costCode,
        tradeScope: found.tradeScope,
        matchedDescription: found.description,
        category: found.category,
        confidence: 0.98
      };
    }
  }

  // 3. Direct Cost Code in String (e.g. "Code 20040" or "20040")
  const costCodeMatch = normalized.match(/\b(12040|20020|20040|20120|20150|20201|20202|20204|20206|20207|20208|20310|20320|20330|20350|20410|20420|20430|20510|20520|20530|20540|20610|20620|20630|20640|20650|20660|20710|20730|20740|20810|20901|20902|21010|21110|21130|21210|21220|21230|21240|21420|21510|21520|21530|21540|21550|21560|21570|21580|21590|21610|21620|21630|21820|21830|21840|21850)\b/);
  if (costCodeMatch) {
    const code = costCodeMatch[1];
    if (code === '20020' && !normalized.includes('demolition')) {
      // Skip if 20020 is found by coincidence in another string without word "demolition"
    } else {
      const found = MASTER_BREAKDOWN_ITEMS.find((it) => it.costCode === code);
      if (found) {
        return {
          costCode: found.costCode,
          tradeScope: found.tradeScope,
          matchedDescription: found.description,
          category: found.category,
          confidence: 0.95
        };
      }
    }
  }

  // 4. Strict Keyword Rules for Core Construction Scopes
  // Demolition: NEVER match unless explicitly containing 'demolition'
  const isDemolitionExplicit = normalized.includes('demolition');
  if (isDemolitionExplicit) {
    return {
      costCode: '20020',
      tradeScope: 'Demolition',
      matchedDescription: 'Total for Demolition',
      category: 'Demolition',
      confidence: 0.99
    };
  }

  // Masonry
  if (normalized.includes('masonry') || normalized.includes('brick') || normalized.includes('stone veneer')) {
    if (normalized.includes('supply') && !normalized.includes('install')) {
      return {
        costCode: '20610',
        tradeScope: 'Masonry',
        matchedDescription: 'Total for masonry (supply)',
        category: 'Roofing, Decking & Exterior Finishes',
        confidence: 0.95
      };
    }
    if (normalized.includes('install') || normalized.includes('labour') || normalized.includes('labor')) {
      return {
        costCode: '20610',
        tradeScope: 'Masonry',
        matchedDescription: 'Total for masonry (install)',
        category: 'Roofing, Decking & Exterior Finishes',
        confidence: 0.95
      };
    }
    return {
      costCode: '20610',
      tradeScope: 'Masonry',
      matchedDescription: 'Total for masonry (supply & install)',
      category: 'Roofing, Decking & Exterior Finishes',
      confidence: 0.96
    };
  }

  // Decking
  if (normalized.includes('decking') || (normalized.includes('deck') && !normalized.includes('railing') && !normalized.includes('railings'))) {
    return {
      costCode: '20530',
      tradeScope: 'Decking',
      matchedDescription: 'Total for Decking as per plans',
      category: 'Roofing, Decking & Exterior Finishes',
      confidence: 0.95
    };
  }

  // Windows
  if (normalized.includes('window') || normalized.includes('glazing')) {
    if (normalized.includes('well')) {
      return {
        costCode: '20350',
        tradeScope: 'Window Wells',
        matchedDescription: 'Total for all Window Wells',
        category: 'Doors, Windows & Openings',
        confidence: 0.95
      };
    }
    if (normalized.includes('sealant') || normalized.includes('caulk')) {
      return {
        costCode: '20430',
        tradeScope: 'Window Sealant',
        matchedDescription: 'Sealant for all necessary openings',
        category: 'Doors, Windows & Openings',
        confidence: 0.95
      };
    }
    if (normalized.includes('covering') || normalized.includes('blind') || normalized.includes('shade') || normalized.includes('treatment')) {
      return {
        costCode: '21590',
        tradeScope: 'Window Coverings',
        matchedDescription: 'Total for all Window Coverings',
        category: 'Fixtures, Cabinets & Interior Features',
        confidence: 0.95
      };
    }
    return {
      costCode: '20420',
      tradeScope: 'Exterior Doors & Windows',
      matchedDescription: 'Total for all Windows',
      category: 'Doors, Windows & Openings',
      confidence: 0.95
    };
  }

  // Doors
  if (normalized.includes('door')) {
    if (normalized.includes('garage overhead') || normalized.includes('overhead door') || normalized.includes('ohd')) {
      return {
        costCode: '21840',
        tradeScope: 'Garage Overhead Door',
        matchedDescription: 'Total for Garage Overhead Door (OHD)',
        category: 'Doors, Windows & Openings',
        confidence: 0.95
      };
    }
    if (normalized.includes('garage entry') || normalized.includes('garage exterior') || normalized.includes('garage man door') || normalized.includes('walk through')) {
      return {
        costCode: '21830',
        tradeScope: 'Garage Exterior Door',
        matchedDescription: 'Total for all Garage Entry Exterior Doors',
        category: 'Doors, Windows & Openings',
        confidence: 0.95
      };
    }
    if (normalized.includes('interior door') || normalized.includes('lockout') || normalized.includes('hardware lockout')) {
      return {
        costCode: '21550',
        tradeScope: 'Finishing Materials',
        matchedDescription: 'Full Finishing Material Package',
        category: 'Drywall, Insulation & Finishes',
        confidence: 0.95
      };
    }
    return {
      costCode: '20410',
      tradeScope: 'Exterior Doors & Windows',
      matchedDescription: 'Total for all Exterior Doors',
      category: 'Doors, Windows & Openings',
      confidence: 0.95
    };
  }

  // Drywall & Insulation
  if (normalized.includes('drywall') || normalized.includes('sheetrock') || normalized.includes('gypsum') || normalized.includes('board tape') || normalized.includes('taping') || normalized.includes('insulation')) {
    if (normalized.includes('spray foam')) {
      return {
        costCode: '21130',
        tradeScope: 'Spray Foam',
        matchedDescription: 'Total for Spray Foam',
        category: 'Drywall, Insulation & Finishes',
        confidence: 0.95
      };
    }
    if (normalized.includes('garage')) {
      return {
        costCode: '21110',
        tradeScope: 'Drywall & Insulation',
        matchedDescription: 'Total for Drywall & Insulation - Garage',
        category: 'Drywall, Insulation & Finishes',
        confidence: 0.95
      };
    }
    return {
      costCode: '21110',
      tradeScope: 'Drywall & Insulation',
      matchedDescription: 'Total for Drywall & Insulation - Main building',
      category: 'Drywall, Insulation & Finishes',
      confidence: 0.95
    };
  }

  // HVAC / Heating / AC
  if (normalized.includes('hvac') || normalized.includes('heating') || normalized.includes('furnace') || normalized.includes('ductwork') || normalized.includes('air conditioning') || normalized.includes('cooling')) {
    if (normalized.includes('air conditioning') || normalized.includes('ac rough') || normalized.includes('a c rough') || normalized.includes('cooling')) {
      return {
        costCode: '20902',
        tradeScope: 'HVAC',
        matchedDescription: 'Air Conditioning (Rough-In Only)',
        category: 'Mechanical, Electrical & Plumbing',
        confidence: 0.95
      };
    }
    return {
      costCode: '20901',
      tradeScope: 'HVAC',
      matchedDescription: 'Heating Rough-in & Final',
      category: 'Mechanical, Electrical & Plumbing',
      confidence: 0.95
    };
  }

  // 4. Fuzzy / Substring / Token Scoring Match
  let bestItem: MasterCostCodeItem | null = null;
  let highestScore = -1;

  const inputTokens = new Set(normalized.split(' ').filter((w) => w.length > 2));
  const hasGarage = normalized.includes('garage');
  const hasBasement = normalized.includes('basement');
  const hasMain = normalized.includes('main');
  const hasSloped = normalized.includes('sloped') || normalized.includes('pitch');
  const hasFlat = normalized.includes('flat');
  const hasInstall = normalized.includes('install');
  const hasSupply = normalized.includes('supply');
  const hasLabour = normalized.includes('labour') || normalized.includes('labor');
  const hasMaterial = normalized.includes('material');
  const hasSink = normalized.includes('sink');
  const hasExcludingSinks = normalized.includes('excluding sinks') || normalized.includes('excl sinks');

  for (const item of MASTER_BREAKDOWN_ITEMS) {
    const itemNorm = normalizeTenderKey(item.description);
    const itemStripped = stripTenderNoise(itemNorm);
    let score = 0;

    // Substring inclusion
    if (normalized.includes(itemNorm) || itemNorm.includes(normalized)) {
      score += 40;
    }
    if (itemStripped && (stripped.includes(itemStripped) || itemStripped.includes(stripped))) {
      score += 35;
    }

    // Token overlap
    const itemTokens = itemNorm.split(' ').filter((w) => w.length > 2);
    let matches = 0;
    for (const t of itemTokens) {
      if (inputTokens.has(t)) matches++;
    }
    score += matches * 8;

    // Aliases substring matching
    if (item.aliases) {
      for (const alias of item.aliases) {
        const normAlias = normalizeTenderKey(alias);
        if (normalized.includes(normAlias) || normAlias.includes(normalized)) {
          score += 25;
          break;
        }
      }
    }

    // Contextual boosters & disambiguations:
    const itemHasGarage = itemNorm.includes('garage');
    const itemHasBasement = itemNorm.includes('basement');
    const itemHasMain = itemNorm.includes('main');

    if (hasGarage && itemHasGarage) score += 30;
    if (hasGarage && !itemHasGarage) score -= 25;
    if (!hasGarage && itemHasGarage) score -= 25;

    if (hasBasement && itemHasBasement) score += 30;
    if (hasBasement && !itemHasBasement) score -= 20;

    if (hasMain && itemHasMain) score += 25;

    if (hasSloped && itemNorm.includes('sloped')) score += 30;
    if (hasFlat && itemNorm.includes('flat')) score += 30;

    // Sinks vs Plumbing Fixtures
    if (hasExcludingSinks) {
      if (item.description.includes('excluding sinks')) score += 50;
      else if (item.description.includes('Sinks')) score -= 50;
    } else if (hasSink) {
      if (item.description.includes('Sinks') && !item.description.includes('excluding')) score += 40;
    }

    // Masonry supply vs install
    if (itemNorm.includes('masonry')) {
      if (hasSupply && hasInstall && itemNorm.includes('supply & install')) score += 30;
      else if (hasSupply && !hasInstall && itemNorm.includes('(supply)') && !itemNorm.includes('install')) score += 30;
      else if (hasInstall && !hasSupply && itemNorm.includes('(install)')) score += 30;
    }

    // Framing: labour vs material
    if (itemNorm.includes('framing')) {
      if ((hasLabour || hasInstall) && itemNorm.includes('labour')) score += 25;
      if (hasMaterial && itemNorm.includes('material')) score += 25;
    }

    // Tile / Flooring: labour vs material
    if (itemNorm.includes('tile') || itemNorm.includes('flooring')) {
      if ((hasLabour || hasInstall) && (itemNorm.includes('installation') || itemNorm.includes('labour'))) score += 25;
      if (hasMaterial && itemNorm.includes('material')) score += 25;
    }

    if (score > highestScore) {
      highestScore = score;
      bestItem = item;
    }
  }

  if (bestItem && highestScore > 10) {
    return {
      costCode: bestItem.costCode,
      tradeScope: bestItem.tradeScope,
      matchedDescription: bestItem.description,
      category: bestItem.category,
      confidence: Math.min(0.92, 0.5 + highestScore / 100)
    };
  }

  // Final fallback: NEVER return Demolition unless explicitly stated in input
  if (normalized.includes('demolition')) {
    return {
      costCode: '20020',
      tradeScope: 'Demolition',
      matchedDescription: 'Total for Demolition',
      category: 'Demolition',
      confidence: 0.9
    };
  }

  return {
    costCode: '99999',
    tradeScope: 'Unassigned Scope',
    matchedDescription: itemDescription || 'Unassigned Scope',
    category: 'Unassigned',
    confidence: 0
  };
}

// Backward-compatible resolver for cost code
export const resolveCostCode = (itemDescription: string): string => {
  return resolveCostCodeAndScope(itemDescription).costCode;
};

// Direct resolver for trade scope
export const resolveTradeScope = (itemDescription: string): string => {
  return resolveCostCodeAndScope(itemDescription).tradeScope;
};

// Master cost code map for backward compatibility and modal dictionaries
export const MASTER_COST_CODE_MAP: Record<string, string> = {};
export const MASTER_TRADE_SCOPE_MAP: Record<string, string> = {};

// Populate maps with both original case descriptions and lowercase normalized keys
MASTER_BREAKDOWN_ITEMS.forEach((item) => {
  MASTER_COST_CODE_MAP[item.description] = item.costCode;
  MASTER_TRADE_SCOPE_MAP[item.description] = item.tradeScope;

  const clean = item.description.toLowerCase().trim();
  MASTER_COST_CODE_MAP[clean] = item.costCode;
  MASTER_TRADE_SCOPE_MAP[clean] = item.tradeScope;

  if (item.aliases) {
    item.aliases.forEach((alias) => {
      MASTER_COST_CODE_MAP[alias.toLowerCase().trim()] = item.costCode;
      MASTER_TRADE_SCOPE_MAP[alias.toLowerCase().trim()] = item.tradeScope;
    });
  }
});
