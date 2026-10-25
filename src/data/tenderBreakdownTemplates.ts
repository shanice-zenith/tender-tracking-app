import { QuoteBreakdownItem, TradeEntry, ScopeLineItem } from '../types';

export interface TenderFormItemSpec {
  costCode: string;
  itemDescription: string;
  unit?: string;
  defaultQty?: number;
  percentageOfTotal: number;
  tenderSpecRef?: string;
  notes?: string;
}

// Master dictionary of official company tender form item requirements per scope line item
// Exactly matched to the official Tender Package Breakdown specification
export const TENDER_FORM_TEMPLATES: Record<string, TenderFormItemSpec[]> = {
  // =========================================================================
  // TENDER PACKAGE 1 A
  // =========================================================================

  // 1. Demolition
  'Demolition': [
    {
      costCode: '20020',
      itemDescription: 'Total for Demolition (excl. GST)',
      unit: 'LS',
      defaultQty: 1,
      percentageOfTotal: 1.0,
      tenderSpecRef: 'Cost Code 20020 - Demolition',
      notes: 'Complete demolition, site clearing & disposal'
    }
  ],

  // 2. Excavation, Other Earthworks & DSSP Install
  'Excavation, Other Earthworks & DSSP Install': [
    {
      costCode: '20040',
      itemDescription: 'Total for Excavation, Backfill and Rough Grading (excl. GST)',
      unit: 'LS',
      defaultQty: 1,
      percentageOfTotal: 0.55,
      tenderSpecRef: 'Cost Code 20040 - Earthworks',
      notes: 'Mass excavation, cut/fill, rough grading & backfill'
    },
    {
      costCode: '20040',
      itemDescription: 'Total for full DSSP install, gravel, coring, drain rock and inspection (excl. GST)',
      unit: 'LS',
      defaultQty: 1,
      percentageOfTotal: 0.45,
      tenderSpecRef: 'Cost Code 20040 - DSSP Civil',
      notes: 'Storm system installation, trenching, coring, drain rock & engineering signoff'
    }
  ],

  // 3. DSSP Materials
  'DSSP Materials': [
    {
      costCode: '20150',
      itemDescription: 'Total for all DSSP Materials as per plans (Catch basins/storm tanks/ manhole covers/Area Drains/Pipe/Hydrovex) - excl. GST',
      unit: 'LS',
      defaultQty: 1,
      percentageOfTotal: 1.0,
      tenderSpecRef: 'Cost Code 20150 - Storm Materials',
      notes: 'Supply of catch basins, storm tanks, manhole covers, area drains, piping, Hydrovex units'
    }
  ],

  // 4. Water & Offsite Services
  'Water & Offsite Services': [
    {
      costCode: '20120',
      itemDescription: 'Total for Water & Underground (excl. GST)',
      unit: 'LS',
      defaultQty: 1,
      percentageOfTotal: 0.75,
      tenderSpecRef: 'Cost Code 20120 - Water Services',
      notes: 'Municipal water main tie-in, copper line, curb stops & underground trenches'
    },
    {
      costCode: '12040',
      itemDescription: 'Total for Permission to Permit (excl. GST)',
      unit: 'LS',
      defaultQty: 1,
      percentageOfTotal: 0.25,
      tenderSpecRef: 'Cost Code 12040 - Permits',
      notes: 'City street cut, right-of-way inspection & road occupancy fees'
    }
  ],

  // 5. Footing & Foundation
  'Footing & Foundation': [
    {
      costCode: '20202',
      itemDescription: 'Total for Foundation and Footing Walls (cribbing, rebar, ladder packages, window buckouts, labor) - excl. GST',
      unit: 'LS',
      defaultQty: 1,
      percentageOfTotal: 0.65,
      tenderSpecRef: 'Cost Code 20202 - Foundation Walls',
      notes: 'Main foundation walls, strip footings, forming/cribbing, rebar, window buckouts'
    },
    {
      costCode: '20202',
      itemDescription: 'Garage Foundation (if applicable) - excl. GST',
      unit: 'LS',
      defaultQty: 1,
      percentageOfTotal: 0.20,
      tenderSpecRef: 'Cost Code 20202 - Garage Foundation',
      notes: 'Garage frost walls, grade beams & thickened edge footings'
    },
    {
      costCode: '20201',
      itemDescription: 'Retaining Wall (if applicable) - excl. GST',
      unit: 'LS',
      defaultQty: 1,
      percentageOfTotal: 0.15,
      tenderSpecRef: 'Cost Code 20201 - Retaining Walls',
      notes: 'Reinforced concrete / block retaining walls per civil/landscape plan'
    }
  ],

  // 6. Basement Slab/ Garage Slab/ Weeping & Gravel
  'Basement Slab/ Garage Slab/ Weeping & Gravel': [
    {
      costCode: '20206',
      itemDescription: 'Basement Slab (excl. GST)',
      unit: 'LS',
      defaultQty: 1,
      percentageOfTotal: 0.40,
      tenderSpecRef: 'Cost Code 20206 - Basement Flatwork',
      notes: 'Cast-in-place concrete basement floor slab, trowel finish & poly vapor barrier'
    },
    {
      costCode: '21850',
      itemDescription: 'Garage Slab (excl. GST)',
      unit: 'LS',
      defaultQty: 1,
      percentageOfTotal: 0.35,
      tenderSpecRef: 'Cost Code 21850 - Garage Flatwork',
      notes: 'Reinforced sloped garage slab with saw cuts & broom finish'
    },
    {
      costCode: '20204',
      itemDescription: 'Weeping Tile, Gravel, Damp Proofing (excl. GST)',
      unit: 'LS',
      defaultQty: 1,
      percentageOfTotal: 0.25,
      tenderSpecRef: 'Cost Code 20204 - Subsurface Drainage',
      notes: 'Perimeter perforated weeping tile, washed clear gravel wrap & bituminous damp proofing'
    }
  ],
  'Basement Slab / Garage Slab / Weeping & Gravel': [
    {
      costCode: '20206',
      itemDescription: 'Basement Slab (excl. GST)',
      unit: 'LS',
      defaultQty: 1,
      percentageOfTotal: 0.40,
      tenderSpecRef: 'Cost Code 20206 - Basement Flatwork',
      notes: 'Cast-in-place concrete basement floor slab, trowel finish & poly vapor barrier'
    },
    {
      costCode: '21850',
      itemDescription: 'Garage Slab (excl. GST)',
      unit: 'LS',
      defaultQty: 1,
      percentageOfTotal: 0.35,
      tenderSpecRef: 'Cost Code 21850 - Garage Flatwork',
      notes: 'Reinforced sloped garage slab with saw cuts & broom finish'
    },
    {
      costCode: '20204',
      itemDescription: 'Weeping Tile & Gravel / Damp Proofing (excl. GST)',
      unit: 'LS',
      defaultQty: 1,
      percentageOfTotal: 0.25,
      tenderSpecRef: 'Cost Code 20204 - Subsurface Drainage',
      notes: 'Perimeter perforated weeping tile, washed clear gravel wrap & bituminous damp proofing'
    }
  ],

  // 7. Framing Materials
  'Framing Materials': [
    {
      costCode: '20310',
      itemDescription: 'Total for full framing material package (excl. GST)',
      unit: 'LS',
      defaultQty: 1,
      percentageOfTotal: 1.0,
      tenderSpecRef: 'Cost Code 20310 - Framing Materials',
      notes: 'Engineered floor joists, LVL beams, studs, OSB subfloor, roof trusses, hardware & fasteners'
    }
  ],

  // 8. Window Wells
  'Window Wells': [
    {
      costCode: '20350',
      itemDescription: 'Total for all Window Wells (excl. GST)',
      unit: 'LS',
      defaultQty: 1,
      percentageOfTotal: 1.0,
      tenderSpecRef: 'Cost Code 20350 - Window Wells',
      notes: 'Corrugated galvanized steel window wells, drainage gravel tie-ins & safety grates'
    }
  ],

  // 9. Exterior Doors & Windows
  'Exterior Doors & Windows': [
    {
      costCode: '20410',
      itemDescription: 'Total for all Exterior Doors (excl. GST)',
      unit: 'LS',
      defaultQty: 1,
      percentageOfTotal: 0.30,
      tenderSpecRef: 'Cost Code 20410 - Exterior Doors',
      notes: 'Insulated entry doors, patio sliding doors, fiberglass frames & factory sill pans'
    },
    {
      costCode: '20420',
      itemDescription: 'Total for all Windows (excl. GST)',
      unit: 'LS',
      defaultQty: 1,
      percentageOfTotal: 0.70,
      tenderSpecRef: 'Cost Code 20420 - Windows',
      notes: 'Energy Star triple pane vinyl window package, low-E argon filled'
    }
  ],

  // 10. Window Sealant
  'Window Sealant': [
    {
      costCode: '20430',
      itemDescription: 'Sealant for all necessary openings (excl. GST)',
      unit: 'LS',
      defaultQty: 1,
      percentageOfTotal: 1.0,
      tenderSpecRef: 'Cost Code 20430 - Openings Sealant',
      notes: 'Polyurethane elastomeric building envelope caulking around all exterior window & door perimeters'
    }
  ],

  // 11. Plumbing & Gas Rough In and Final
  'Plumbing & Gas Rough In and Final': [
    {
      costCode: '20710',
      itemDescription: 'Plumbing Rough-In & Final (excl. GST)',
      unit: 'LS',
      defaultQty: 1,
      percentageOfTotal: 0.60,
      tenderSpecRef: 'Cost Code 20710 - Plumbing',
      notes: 'Rough-in drainage, PEX water supply runs, vents, stack tests & final fixture hookups'
    },
    {
      costCode: '20710',
      itemDescription: 'Gas Rough-in & Final (excl. GST)',
      unit: 'LS',
      defaultQty: 1,
      percentageOfTotal: 0.30,
      tenderSpecRef: 'Cost Code 20710 - Gas Piping',
      notes: 'Black iron gas lines to furnace, hot water tank, kitchen range, BBQ box & fireplace'
    },
    {
      costCode: '20710',
      itemDescription: 'Plumbing & Gas Permits (excl. GST)',
      unit: 'LS',
      defaultQty: 1,
      percentageOfTotal: 0.10,
      tenderSpecRef: 'Cost Code 20710 - Permits',
      notes: 'Municipal trade permits, safety authority filings & inspection certificates'
    }
  ],

  // 12. Electrical Rough-in and Final
  'Electrical Rough-in and Final': [
    {
      costCode: '20810',
      itemDescription: 'Electrical Rough-in & Final (excl. GST)',
      unit: 'LS',
      defaultQty: 1,
      percentageOfTotal: 1.0,
      tenderSpecRef: 'Cost Code 20810 - Electrical',
      notes: '200A main service panel, wiring, pot lights rough-in, switches, plugs, EV rough-in & final device trim'
    }
  ],

  // 13. HVAC
  'HVAC': [
    {
      costCode: '20901',
      itemDescription: 'Heating Rough-in & Final (excl. GST)',
      unit: 'LS',
      defaultQty: 1,
      percentageOfTotal: 0.75,
      tenderSpecRef: 'Cost Code 20901 - Heating',
      notes: 'High-efficiency 2-stage gas furnace, ductwork distribution, HRV/ERV unit, venting & thermostats'
    },
    {
      costCode: '20902',
      itemDescription: 'Air Conditioning (Rough-In Only) - (excl. GST)',
      unit: 'LS',
      defaultQty: 1,
      percentageOfTotal: 0.25,
      tenderSpecRef: 'Cost Code 20902 - AC Rough-In',
      notes: 'Refrigerant line set, condenser electrical whip, pad prep & coil housing rough-in'
    }
  ],

  // 14. Precast Steps
  'Precast Steps': [
    {
      costCode: '20208',
      itemDescription: 'Total for all Precast Steps (excl. GST)',
      unit: 'LS',
      defaultQty: 1,
      percentageOfTotal: 1.0,
      tenderSpecRef: 'Cost Code 20208 - Precast Steps',
      notes: 'Precast concrete front and side entrance steps, non-slip textured treads & setting brackets'
    }
  ],

  // =========================================================================
  // TENDER PACKAGE 1 B
  // =========================================================================

  // 15. Framing Labour
  'Framing Labour': [
    {
      costCode: '20320',
      itemDescription: 'Main Unit Framing Labour total (excl. GST)',
      unit: 'LS',
      defaultQty: 1,
      percentageOfTotal: 0.60,
      tenderSpecRef: 'Cost Code 20320 - Main Framing Labour',
      notes: 'Framing crew labour for floors, exterior load-bearing walls, interior partitions & roof structure'
    },
    {
      costCode: '20320',
      itemDescription: 'Basement Framing Labour total (excl. GST)',
      unit: 'LS',
      defaultQty: 1,
      percentageOfTotal: 0.25,
      tenderSpecRef: 'Cost Code 20320 - Basement Framing',
      notes: 'Basement perimeter frost walls, mechanical room enclosure & interior walls'
    },
    {
      costCode: '20320',
      itemDescription: 'Garage Framing Labour total (excl. GST)',
      unit: 'LS',
      defaultQty: 1,
      percentageOfTotal: 0.15,
      tenderSpecRef: 'Cost Code 20320 - Garage Framing',
      notes: 'Detached / attached garage walls, overhead door portal frame & truss setting'
    }
  ],

  // 16. Interior Stairs
  'Interior Stairs': [
    {
      costCode: '20330',
      itemDescription: 'Interior Stairs (Excl. GST)',
      unit: 'LS',
      defaultQty: 1,
      percentageOfTotal: 1.0,
      tenderSpecRef: 'Cost Code 20330 - Interior Stairs',
      notes: 'Engineered closed-stringer staircase, birch/plywood treads, risers & temporary construction covers'
    }
  ],

  // 17. Roofing
  'Roofing': [
    {
      costCode: '20510',
      itemDescription: 'Total for Roofing (sloped) - excl. GST',
      unit: 'LS',
      defaultQty: 1,
      percentageOfTotal: 0.60,
      tenderSpecRef: 'Cost Code 20510 - Sloped Roof',
      notes: 'Architectural asphalt shingles, ice & water shield, synthetic underlayment, drip edge & ridge caps'
    },
    {
      costCode: '20520',
      itemDescription: 'Total for Flat Roof (If Applicable) - excl. GST',
      unit: 'LS',
      defaultQty: 1,
      percentageOfTotal: 0.20,
      tenderSpecRef: 'Cost Code 20520 - Flat Roof',
      notes: '2-ply SBS modified bitumen torch-on membrane, insulation & flashing at parapets'
    },
    {
      costCode: '21820',
      itemDescription: 'Total for Garage Roof - excl. GST',
      unit: 'LS',
      defaultQty: 1,
      percentageOfTotal: 0.20,
      tenderSpecRef: 'Cost Code 21820 - Garage Roof',
      notes: 'Garage shingle roof assembly matching main dwelling'
    }
  ],

  // 18. Decking
  'Decking': [
    {
      costCode: '20530',
      itemDescription: 'Total for Decking as per plans (excl. GST)',
      unit: 'LS',
      defaultQty: 1,
      percentageOfTotal: 1.0,
      tenderSpecRef: 'Cost Code 20530 - Decking',
      notes: 'Pressure treated / composite exterior deck boards, framing, ledger board fastening & waterproof membrane'
    }
  ],

  // 19. Rainware
  'Rainware': [
    {
      costCode: '20540',
      itemDescription: 'Total for all Rainware, Downspouts and Gutters (excl. GST)',
      unit: 'LS',
      defaultQty: 1,
      percentageOfTotal: 1.0,
      tenderSpecRef: 'Cost Code 20540 - Rainware',
      notes: '5" continuous seamless aluminum gutters, heavy-duty downspouts, elbows & splash pads'
    }
  ],

  // 20. Exterior Finishing
  'Exterior Finishing': [
    {
      costCode: '20630',
      itemDescription: 'Total for Exterior Finishing & Cladding - Main Building (excl. GST)',
      unit: 'LS',
      defaultQty: 1,
      percentageOfTotal: 0.50,
      tenderSpecRef: 'Cost Code 20630 - Main Cladding',
      notes: 'Hardie board lap siding, board & batten, exterior trims & building paper/rainscreen'
    },
    {
      costCode: '20630',
      itemDescription: 'Total for Exterior Finishing & Cladding - Garage (excl. GST)',
      unit: 'LS',
      defaultQty: 1,
      percentageOfTotal: 0.20,
      tenderSpecRef: 'Cost Code 20630 - Garage Cladding',
      notes: 'Garage siding and exterior wall trim details'
    },
    {
      costCode: '20640',
      itemDescription: 'Total for Soffit & Fascia - Main Building (excl. GST)',
      unit: 'LS',
      defaultQty: 1,
      percentageOfTotal: 0.20,
      tenderSpecRef: 'Cost Code 20640 - Main Soffit/Fascia',
      notes: 'Vented aluminum soffit panels, pre-finished aluminum fascia trims'
    },
    {
      costCode: '20640',
      itemDescription: 'Total for Soffit & Fascia - Garage (excl. GST)',
      unit: 'LS',
      defaultQty: 1,
      percentageOfTotal: 0.10,
      tenderSpecRef: 'Cost Code 20640 - Garage Soffit/Fascia',
      notes: 'Garage roofline aluminum soffit and fascia envelope trim'
    }
  ],

  // 21. Masonry
  'Masonry': [
    {
      costCode: '20610',
      itemDescription: 'Total for masonry (supply) - excl. GST',
      unit: 'LS',
      defaultQty: 1,
      percentageOfTotal: 0.50,
      tenderSpecRef: 'Cost Code 20610 - Masonry Supply',
      notes: 'Manufactured architectural stone veneer, brick, corner pieces, sills & mortar mix'
    },
    {
      costCode: '20610',
      itemDescription: 'Total for masonry (install) - excl. GST',
      unit: 'LS',
      defaultQty: 1,
      percentageOfTotal: 0.50,
      tenderSpecRef: 'Cost Code 20610 - Masonry Install',
      notes: 'Mason labour, metal lath, scratch coat, stone layout & clean wash'
    }
  ],

  // 22. Stucco
  'Stucco': [
    {
      costCode: '20620',
      itemDescription: 'Total for Stucco - Main Building (excl. GST)',
      unit: 'LS',
      defaultQty: 1,
      percentageOfTotal: 0.70,
      tenderSpecRef: 'Cost Code 20620 - Main Stucco',
      notes: 'Acrylic/traditional stucco system: tar paper, wire mesh, base coat, mesh & textured finish coat'
    },
    {
      costCode: '20620',
      itemDescription: 'Total for Stucco - Garage (excl. GST)',
      unit: 'LS',
      defaultQty: 1,
      percentageOfTotal: 0.30,
      tenderSpecRef: 'Cost Code 20620 - Garage Stucco',
      notes: 'Garage exterior stucco finish to match main structure'
    }
  ],

  // 23. Sprinkler System
  'Sprinkler System': [
    {
      costCode: '20730',
      itemDescription: 'Total for Sprinkler System (supply & install) - excl. GST',
      unit: 'LS',
      defaultQty: 1,
      percentageOfTotal: 1.0,
      tenderSpecRef: 'Cost Code 20730 - Fire Sprinkler',
      notes: 'NFPA 13D residential fire sprinkler system, CPVC pipe network, heads & backflow valve'
    }
  ],

  // 24. Fireplace
  'Fireplace': [
    {
      costCode: '20740',
      itemDescription: 'Total for Fireplace/s (Supply & Install) - excl. GST',
      unit: 'LS',
      defaultQty: 1,
      percentageOfTotal: 1.0,
      tenderSpecRef: 'Cost Code 20740 - Fireplace',
      notes: 'Direct-vent linear gas fireplace unit, remote thermostat, venting kit, non-combustible framing & hookup'
    }
  ],

  // 25. Drywall & Insulation
  'Drywall & Insulation': [
    {
      costCode: '21110',
      itemDescription: 'Total for Drywall & Insulation - Main building - excl. GST',
      unit: 'LS',
      defaultQty: 1,
      percentageOfTotal: 0.75,
      tenderSpecRef: 'Cost Code 21110 - Main Drywall/Insulation',
      notes: 'R22 batt wall insulation, R50 blow attic, 6mil poly, 1/2" & 5/8" drywall board, Level 4 taped finish'
    },
    {
      costCode: '21110',
      itemDescription: 'Total for Drywall & Insulation - Garage - excl. GST',
      unit: 'LS',
      defaultQty: 1,
      percentageOfTotal: 0.25,
      tenderSpecRef: 'Cost Code 21110 - Garage Drywall',
      notes: 'Fire-rated drywall gas-barrier separation, fire-taping & garage ceiling insulation'
    }
  ],

  // 26. Spray Foam
  'Spray Foam': [
    {
      costCode: '21130',
      itemDescription: 'Total for Spray Foam (excl. GST)',
      unit: 'LS',
      defaultQty: 1,
      percentageOfTotal: 1.0,
      tenderSpecRef: 'Cost Code 21130 - Spray Foam',
      notes: '2-pound closed-cell spray polyurethane foam at cantilever floors, rim joists & roof transitions'
    }
  ],

  // 27. Cabinets & Built-Ins
  'Cabinets & Built-Ins': [
    {
      costCode: '21420',
      itemDescription: 'Total for all Cabinets & Built-ins (excl. GST)',
      unit: 'LS',
      defaultQty: 1,
      percentageOfTotal: 1.0,
      tenderSpecRef: 'Cost Code 21420 - Cabinetry',
      notes: 'Custom kitchen cabinetry, island box, bathroom vanities, laundry uppers, mudroom bench & soft-close slides'
    }
  ],

  // =========================================================================
  // TENDER PACKAGE 2 - INTERIOR A
  // =========================================================================

  // 28. Countertops
  'Countertops': [
    {
      costCode: '21570',
      itemDescription: 'Total for all Countertops as per interior design details and specs (excl. GST)',
      unit: 'LS',
      defaultQty: 1,
      percentageOfTotal: 0.75,
      tenderSpecRef: 'Cost Code 21570 - Quartz Countertops',
      notes: 'Fabrication and installation of engineered quartz slabs with eased polished edges and cutouts'
    },
    {
      costCode: '21510',
      itemDescription: 'Total for all Sinks (excl. GST)',
      unit: 'LS',
      defaultQty: 1,
      percentageOfTotal: 0.25,
      tenderSpecRef: 'Cost Code 21510 - Sinks',
      notes: 'Under-mount stainless steel kitchen sink, composite bar sink & vanity porcelain bowls'
    }
  ],

  // 29. Plumbing Fixtures
  'Plumbing Fixtures': [
    {
      costCode: '21510',
      itemDescription: 'Plumbing Fixture total (excluding sinks) - excl. GST',
      unit: 'LS',
      defaultQty: 1,
      percentageOfTotal: 1.0,
      tenderSpecRef: 'Cost Code 21510 - Fixtures Package',
      notes: 'Supply of all faucets, shower pressure valves, rain heads, hand wands, freestanding tub & dual-flush toilets'
    }
  ],

  // 30. Lighting Fixtures
  'Lighting Fixtures': [
    {
      costCode: '21520',
      itemDescription: 'Total for all Light Fixtures - excl. GST',
      unit: 'LS',
      defaultQty: 1,
      percentageOfTotal: 1.0,
      tenderSpecRef: 'Cost Code 21520 - Lighting Package',
      notes: 'Complete interior & exterior decorative light fixture package: chandeliers, vanity lights, exterior coach lights'
    }
  ],

  // 31. Appliances
  'Appliances': [
    {
      costCode: '21010',
      itemDescription: 'Total for all Appliances (for all units) & Delivery - excl. GST',
      unit: 'LS',
      defaultQty: 1,
      percentageOfTotal: 1.0,
      tenderSpecRef: 'Cost Code 21010 - Appliances',
      notes: 'Stainless kitchen appliances: french door fridge, gas cooktop, wall oven, dishwasher, microwave & front-load laundry'
    }
  ],

  // 32. Interior Railings
  'Interior Railings': [
    {
      costCode: '21580',
      itemDescription: 'Total for interior railings as per spec - excl. GST',
      unit: 'LS',
      defaultQty: 1,
      percentageOfTotal: 1.0,
      tenderSpecRef: 'Cost Code 21580 - Interior Railings',
      notes: 'Custom modern black metal spindled railing with stained solid oak handrail & newel posts'
    }
  ],

  // 33. Tile and Flooring Material
  'Tile and Flooring Material': [
    {
      costCode: '21210',
      itemDescription: 'Total for all tile material as per specs - excl. GST',
      unit: 'LS',
      defaultQty: 1,
      percentageOfTotal: 0.40,
      tenderSpecRef: 'Cost Code 21210 - Tile Material',
      notes: 'Porcelain bathroom floor tiles, subway backsplash tile, shower wall slabs & Schluter edge trims'
    },
    {
      costCode: '21230',
      itemDescription: 'Total for all flooring material (including lvp, hardwood and carpet - if applicable) as per specs - excl. GST',
      unit: 'LS',
      defaultQty: 1,
      percentageOfTotal: 0.45,
      tenderSpecRef: 'Cost Code 21230 - Flooring Material',
      notes: 'Engineered hardwood flooring / premium LVP planks, high-density foam underlayment & premium carpet'
    },
    {
      costCode: '21240',
      itemDescription: 'Total for carpet install (if applicable) - Excl. GST',
      unit: 'LS',
      defaultQty: 1,
      percentageOfTotal: 0.15,
      tenderSpecRef: 'Cost Code 21240 - Carpet Installation',
      notes: 'Carpet pad installation, tack strip stretching & transition seaming'
    }
  ],

  // =========================================================================
  // TENDER PACKAGE 2 - INTERIOR B
  // =========================================================================

  // 34. Finishing Materials
  'Finishing Materials': [
    {
      costCode: '21550',
      itemDescription: 'Full Finishing Material Package as per specs - Interior doors, baseboards, mouldings, door/window casings etc. -  (excl. GST)',
      unit: 'LS',
      defaultQty: 1,
      percentageOfTotal: 0.65,
      tenderSpecRef: 'Cost Code 21550 - Finishing Carpentry',
      notes: 'Solid core interior doors, 5-1/4" contemporary baseboards, 3-1/2" casings, jamb extensions & closet jambs'
    },
    {
      costCode: '21560',
      itemDescription: 'Full Finishing Lockout Package as per specs - Door knobs/levers, deadbolts, door stops, bathroom accessories, closet hardware etc. - (excl. GST)',
      unit: 'LS',
      defaultQty: 1,
      percentageOfTotal: 0.35,
      tenderSpecRef: 'Cost Code 21560 - Hardware Lockout',
      notes: 'Passage/privacy door levers, magnetic door stops, towel bars, paper holders & shelf rods'
    }
  ],

  // 35. Tile Labour
  'Tile Labour': [
    {
      costCode: '21220',
      itemDescription: 'Full Tile installation (excl. GST)',
      unit: 'LS',
      defaultQty: 1,
      percentageOfTotal: 1.0,
      tenderSpecRef: 'Cost Code 21220 - Tile Labour',
      notes: 'Subfloor prep, waterproof membrane installation, mud pan prep, tile setting, epoxy grouting & sealing'
    }
  ],

  // 36. Flooring Labour
  'Flooring Labour': [
    {
      costCode: '21240',
      itemDescription: 'Full Flooring installation (excl. GST)',
      unit: 'LS',
      defaultQty: 1,
      percentageOfTotal: 0.80,
      tenderSpecRef: 'Cost Code 21240 - Flooring Labour',
      notes: 'Main floor hardwood / LVP installation, underlayment rolling, expansion gaps & transitions'
    },
    {
      costCode: '21240',
      itemDescription: 'Supply and install Stair Nosings (excl. GST)',
      unit: 'LS',
      defaultQty: 1,
      percentageOfTotal: 0.20,
      tenderSpecRef: 'Cost Code 21240 - Stair Nosings',
      notes: 'Custom flush-mount matching wood stair nosing supply and precision mitre installation'
    }
  ],

  // 37. Interior Glass and Mirrors
  'Interior Glass and Mirrors': [
    {
      costCode: '21530',
      itemDescription: 'Total for all Interior Glass (supply and install) -  (excl. GST)',
      unit: 'LS',
      defaultQty: 1,
      percentageOfTotal: 0.45,
      tenderSpecRef: 'Cost Code 21530 - Shower Glass',
      notes: '10mm frameless clear tempered glass shower enclosure, pivot hinges, headers & channel clips'
    },
    {
      costCode: '21540',
      itemDescription: 'Total for all Mirrors (supply and install) -  (excl. GST)',
      unit: 'LS',
      defaultQty: 1,
      percentageOfTotal: 0.35,
      tenderSpecRef: 'Cost Code 21540 - Mirrors',
      notes: 'Polished flat edge bathroom vanity mirrors, J-channel mounting & anti-fog backing'
    },
    {
      costCode: '21560',
      itemDescription: 'Total for all Wire Shelving (supply and install)- if applicable -  (excl. GST)',
      unit: 'LS',
      defaultQty: 1,
      percentageOfTotal: 0.20,
      tenderSpecRef: 'Cost Code 21560 - Wire Shelving',
      notes: 'Ventilated heavy-gauge coated steel closet & pantry wire shelving with continuous slide hang rods'
    }
  ],

  // 38. Window Coverings
  'Window Coverings': [
    {
      costCode: '21590',
      itemDescription: 'Total for all Window Coverings (excl. GST)',
      unit: 'LS',
      defaultQty: 1,
      percentageOfTotal: 1.0,
      tenderSpecRef: 'Cost Code 21590 - Window Coverings',
      notes: 'Custom roller solar shades and bedroom blackout blinds with cassette valances'
    }
  ],

  // =========================================================================
  // TENDER PACKAGE 3 - EXTERIOR AND GARAGE
  // =========================================================================

  // 39. Exterior Flatwork (Sidewalk, Aprons, etc.)
  'Exterior Flatwork (Sidewalk, Aprons, etc.)': [
    {
      costCode: '20207',
      itemDescription: 'Total for all concrete driveways, aprons, curbs, sidewalks, walkways, patios, stoops, landings, and utility equipment pads as per plans - excl. GST',
      unit: 'LS',
      defaultQty: 1,
      percentageOfTotal: 1.0,
      tenderSpecRef: 'Cost Code 20207 - Concrete Flatwork',
      notes: 'Broom-finish concrete driveway, curbs, walkways, entry stoop landings & AC equipment pads'
    }
  ],

  // 40. Garage Overhead Door (OHD)
  'Garage Overhead Door (OHD)': [
    {
      costCode: '21840',
      itemDescription: 'Total for Garage Overhead Door (OHD) - supply and install - excl. GST',
      unit: 'LS',
      defaultQty: 1,
      percentageOfTotal: 1.0,
      tenderSpecRef: 'Cost Code 21840 - Overhead Doors',
      notes: 'Insulated steel sectional garage door (R-16), heavy-duty tracks, torsion springs, opener & keypad'
    }
  ],

  // 41. Garage Exterior Door
  'Garage Exterior Door': [
    {
      costCode: '21830',
      itemDescription: 'Total for all Garage Entry Exterior Doors- excl. GST',
      unit: 'LS',
      defaultQty: 1,
      percentageOfTotal: 1.0,
      tenderSpecRef: 'Cost Code 21830 - Garage Entry Door',
      notes: 'Insulated steel garage side man-door with metal frame, deadbolt & threshold'
    }
  ],

  // 42. Exterior Stairs
  'Exterior Stairs': [
    {
      costCode: '20660',
      itemDescription: 'Total for Exterior Stairs (supply and install) - excl. GST',
      unit: 'LS',
      defaultQty: 1,
      percentageOfTotal: 1.0,
      tenderSpecRef: 'Cost Code 20660 - Exterior Stairs',
      notes: 'Pressure treated / metal exterior stair stringers, open/closed treads & structural connections'
    }
  ],

  // 43. Exterior Railings
  'Exterior Railings': [
    {
      costCode: '20650',
      itemDescription: 'Total for Exterior Railings (supply and install) - excl. GST',
      unit: 'LS',
      defaultQty: 1,
      percentageOfTotal: 1.0,
      tenderSpecRef: 'Cost Code 20650 - Exterior Railings',
      notes: 'Powder-coated aluminum deck railings with picket or glass inserts per building code'
    }
  ],

  // 44. Landscaping & Fencing
  'Landscaping & Fencing': [
    {
      costCode: '21610',
      itemDescription: 'Total for Trees, Decorative Rock, Sod - excl. GST',
      unit: 'LS',
      defaultQty: 1,
      percentageOfTotal: 0.50,
      tenderSpecRef: 'Cost Code 21610 - Softscaping & Trees',
      notes: 'Kentucky bluegrass sod, screened topsoil, decorative river rock beds, mulch & ornamental trees'
    },
    {
      costCode: '21620',
      itemDescription: 'Total for Fencing - excl. GST',
      unit: 'LS',
      defaultQty: 1,
      percentageOfTotal: 0.30,
      tenderSpecRef: 'Cost Code 21620 - Fencing',
      notes: '6ft cedar/treated wood perimeter privacy fence with concrete post footings & access gates'
    },
    {
      costCode: '21630',
      itemDescription: 'Total for Irrigation System (Supply and Insall) - excl. GST',
      unit: 'LS',
      defaultQty: 1,
      percentageOfTotal: 0.20,
      tenderSpecRef: 'Cost Code 21630 - Irrigation',
      notes: 'Automated multizone underground sprinkler irrigation, rain sensor & smart wifi controller'
    }
  ]
};

/**
 * Returns the template item specs for a given scope name from the master dataset.
 */
export function getTenderTemplateSpecs(scopeName: string, fallbackCostCode: string = '20000'): TenderFormItemSpec[] {
  const normalizedKey = Object.keys(TENDER_FORM_TEMPLATES).find(
    (k) => k.toLowerCase().trim() === scopeName.toLowerCase().trim()
  );

  if (normalizedKey && TENDER_FORM_TEMPLATES[normalizedKey]) {
    return TENDER_FORM_TEMPLATES[normalizedKey];
  }

  // Fallback for custom or unmatched scope names
  return [
    {
      costCode: fallbackCostCode || '20000',
      itemDescription: `Total for ${scopeName} (excl. GST)`,
      percentageOfTotal: 1.0,
      tenderSpecRef: `Cost Code ${fallbackCostCode || '20000'} - Scope Execution`,
      notes: 'Comprehensive scope execution per tender specifications'
    }
  ];
}

/**
 * Look up the corresponding Scope Package name and template spec by Cost Code (Column D).
 */
export function findScopeTemplateByCostCode(costCode: string): {
  scopeName: string;
  spec: TenderFormItemSpec;
} | null {
  if (!costCode) return null;
  const cleanCode = costCode.trim().toLowerCase();

  for (const [scopeName, specs] of Object.entries(TENDER_FORM_TEMPLATES)) {
    const matchedSpec = specs.find(
      (s) => s.costCode.trim().toLowerCase() === cleanCode
    );
    if (matchedSpec) {
      return { scopeName, spec: matchedSpec };
    }
  }
  return null;
}

export function generateDefaultBreakdownItems(
  scopeName: string,
  quotedTotal: number,
  fallbackBudget: number = 0
): QuoteBreakdownItem[] {
  // Normalize lookup
  const normalizedKey = Object.keys(TENDER_FORM_TEMPLATES).find(
    (k) => k.toLowerCase().trim() === scopeName.toLowerCase().trim()
  );

  const specs = normalizedKey ? TENDER_FORM_TEMPLATES[normalizedKey] : null;
  const baseAmount = quotedTotal > 0 ? quotedTotal : fallbackBudget > 0 ? fallbackBudget : 10000;

  if (specs && specs.length > 0) {
    let runningSum = 0;
    return specs.map((spec, index) => {
      const isLast = index === specs.length - 1;
      let lineAmount = Math.round(baseAmount * spec.percentageOfTotal);
      
      // Ensure sum matches baseAmount precisely
      if (isLast && quotedTotal > 0) {
        lineAmount = Math.max(0, baseAmount - runningSum);
      } else {
        runningSum += lineAmount;
      }

      return {
        id: `brk-${Date.now()}-${index}`,
        costCode: spec.costCode,
        itemDescription: spec.itemDescription,
        amount: lineAmount,
        inclusionStatus: 'included',
        notes: spec.notes || '',
        tenderSpecRef: spec.tenderSpecRef || `Cost Code ${spec.costCode}`
      };
    });
  }

  // Fallback if custom scope name without matching template
  return [
    {
      id: `brk-${Date.now()}-0`,
      costCode: '20000',
      itemDescription: `Total for ${scopeName} scope execution (excl. GST)`,
      amount: baseAmount,
      inclusionStatus: 'included',
      notes: 'Comprehensive scope execution per tender specifications',
      tenderSpecRef: 'General Scope Specification'
    }
  ];
}

/**
 * Master dictionary of accurate scope header cost codes for all trade scope sections.
 * Exactly maps every trade scope to its specified 5-digit construction cost code.
 */
export const CANONICAL_TRADE_SCOPE_COST_CODES: Record<string, string> = {
  'Demolition': '20020',
  'Excavation, Other Earthworks & DSSP Install': '20040',
  'DSSP Materials': '20150',
  'Water & Offsite Services': '20120',
  'Footing & Foundation': '20202',
  'Basement Slab / Garage Slab / Weeping & Gravel': '20206',
  'Basement Slab/ Garage Slab/ Weeping & Gravel': '20206',
  'Framing Materials': '20310',
  'Framing Labour': '20320',
  'Interior Stairs': '20330',
  'Window Wells': '20350',
  'Exterior Doors & Windows': '20410',
  'Window Sealant': '20430',
  'Roofing': '20510',
  'Decking': '20530',
  'Rainware': '20540',
  'Masonry': '20610',
  'Stucco': '20620',
  'Exterior Finishing': '20630',
  'Plumbing & Gas Rough In and Final': '20710',
  'Electrical Rough-in and Final': '20810',
  'HVAC': '20901',
  'Drywall & Insulation': '21110',
  'Cabinets & Built-Ins': '21420',
  'Countertops': '21570',
  'Plumbing Fixtures': '21510',
  'Lighting Fixtures': '21520',
  'Tile and Flooring Material': '21210',
  'Finishing Materials': '21550',
  // Additional canonical scopes in Zenith portfolio:
  'Precast Steps': '20208',
  'Sprinkler System': '20730',
  'Fireplace': '20740',
  'Spray Foam': '21130',
  'Appliances': '21010',
  'Interior Railings': '21580',
  'Tile Labour': '21220',
  'Flooring Labour': '21240',
  'Interior Glass and Mirrors': '21530',
  'Window Coverings': '21590',
  'Exterior Flatwork (Sidewalk, Aprons, etc.)': '20207',
  'Garage Overhead Door (OHD)': '21840',
  'Garage Exterior Door': '21830',
  'Exterior Stairs': '20660',
  'Exterior Railings': '20650',
  'Landscaping & Fencing': '21610'
};

/**
 * Returns the exact 5-digit cost code for a given trade scope name.
 */
export function getAccurateScopeCostCode(scopeName: string): string {
  if (!scopeName || typeof scopeName !== 'string') return '';
  const trimmed = scopeName.trim();
  if (CANONICAL_TRADE_SCOPE_COST_CODES[trimmed]) {
    return CANONICAL_TRADE_SCOPE_COST_CODES[trimmed];
  }

  const normalized = trimmed.toLowerCase();
  for (const [key, code] of Object.entries(CANONICAL_TRADE_SCOPE_COST_CODES)) {
    if (key.toLowerCase() === normalized) {
      return code;
    }
  }

  // Check with slash spacing normalized
  const slashNormalized = normalized.replace(/\s*\/\s*/g, ' / ');
  for (const [key, code] of Object.entries(CANONICAL_TRADE_SCOPE_COST_CODES)) {
    if (key.toLowerCase().replace(/\s*\/\s*/g, ' / ') === slashNormalized) {
      return code;
    }
  }

  // Fallback to template specs
  const templateSpecs = TENDER_FORM_TEMPLATES[trimmed] || TENDER_FORM_TEMPLATES[slashNormalized];
  if (templateSpecs && templateSpecs.length > 0 && templateSpecs[0].costCode) {
    return templateSpecs[0].costCode;
  }

  return '';
}

/**
 * Normalizes a cost code to a clean 5-digit string or returns null if not valid.
 */
function cleanCostCode(rawCode: unknown): string | null {
  const str = String(rawCode || '').trim();
  if (!str || /function\(|return\s|window\.|<script/i.test(str)) return null;
  const match = str.match(/\d{5}/);
  return match ? match[0] : null;
}

/**
 * Checks whether a quote's cost code does not match its parent scope section's cost code.
 * Used to trigger the misassigned quotes warning banner.
 */
export function isQuoteMisassigned(trade: TradeEntry, scope: ScopeLineItem): boolean {
  if (!trade || !scope) return false;

  const parentCode = cleanCostCode(scope.costCode) || cleanCostCode(getAccurateScopeCostCode(scope.name));
  if (!parentCode) return false;

  // Build the set of allowed cost codes for this scope section:
  // includes the primary scope cost code plus any sub-item breakdown codes defined in the scope template
  const allowedCodes = new Set<string>([parentCode]);
  const templateSpecs =
    TENDER_FORM_TEMPLATES[scope.name] ||
    TENDER_FORM_TEMPLATES[scope.name.replace(/\s*\/\s*/g, ' / ')] ||
    TENDER_FORM_TEMPLATES[scope.name.replace(/\s*\/\s*/g, '/')];

  if (templateSpecs) {
    templateSpecs.forEach((spec) => {
      const c = cleanCostCode(spec.costCode);
      if (c) allowedCodes.add(c);
    });
  }

  // Check direct trade costCode
  const tradeCostCode = cleanCostCode(trade.costCode);
  if (tradeCostCode) {
    return !allowedCodes.has(tradeCostCode);
  }

  // Check quote breakdown items if present
  const breakdownCodes = (trade.quoteBreakdown || [])
    .map((b) => cleanCostCode(b.costCode))
    .filter((c): c is string => Boolean(c));

  if (breakdownCodes.length > 0) {
    // If quote has breakdown items, it is misassigned if none of the breakdown items match the scope's allowed codes
    return !breakdownCodes.some((code) => allowedCodes.has(code));
  }

  return false;
}

