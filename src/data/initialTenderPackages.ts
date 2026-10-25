import { ScopeLineItem, PhaseInfo, PhaseId, ActionItemStatus } from '../types';
import { getAccurateScopeCostCode } from './tenderBreakdownTemplates';

export const PHASES: PhaseInfo[] = [
  {
    id: '1A',
    name: 'Phase 1A',
    code: 'PKG-1A',
    description: 'Civil, Structural, Building Envelope Rough-ins & Core Infrastructure'
  },
  {
    id: '1B',
    name: 'Phase 1B',
    code: 'PKG-1B',
    description: 'Substructure Waterproofing, Mechanical & Electrical Distribution'
  },
  {
    id: '2A',
    name: 'Phase 2A',
    code: 'PKG-2A',
    description: 'Interior Architecture, Fixtures, Appliances & Major Materials'
  },
  {
    id: '2B',
    name: 'Phase 2B',
    code: 'PKG-2B',
    description: 'Interior Finishing, Specialist Labour, Glass, Mirrors & Coverings'
  },
  {
    id: '3',
    name: 'Phase 3',
    code: 'PKG-3',
    description: 'Exterior Flatwork, Garage Systems, Stairs, Railings & Landscaping'
  }
];

export const INITIAL_SCOPES: ScopeLineItem[] = [
  // ===================== PHASE 1A =====================
  {
    id: 'scope-1a-1',
    phaseId: '1A',
    name: 'Demolition',
    description: 'Total for Demolition (excl. GST)',
    budgetAmount: 48000,
    order: 1,
    isRequired: true,
    createdAt: '2026-08-01T09:00:00Z',
    trades: [
      {
        id: 't-1a-1-1',
        scopeId: 'scope-1a-1',
        contactId: 'c-1',
        contractorName: "John O'Boyle",
        companyName: "Clover Hill Construction",
        category: "Demo / Excavation",
        quotedFigure: 46500,
        currency: 'CAD',
        attachedDocs: [
          {
            id: 'doc-1',
            name: 'CloverHill_Demo_Quote_RevB.pdf',
            url: 'https://docs.google.com/viewer?url=example.com/quotes/CloverHill_Demo.pdf',
            type: 'quote',
            addedAt: '2026-08-10',
            fileSize: '1.4 MB'
          },
          {
            id: 'doc-2',
            name: 'Demo_Safety_Plan_Signed.pdf',
            url: 'https://docs.google.com/viewer?url=example.com/specs/Demo_Safety_Plan.pdf',
            type: 'spec',
            addedAt: '2026-08-11',
            fileSize: '850 KB'
          }
        ],
        actionStatus: 'PO Approved',
        poSent: true,
        isAwarded: true,
        notes: [
          {
            id: 'n-1',
            text: 'Quote confirmed within budget. Includes hazardous materials abatement.',
            author: 'Project Manager',
            timestamp: '2026-08-12 14:30'
          },
          {
            id: 'n-2',
            text: 'PO #PO-10482 issued and emailed to John O\'Boyle.',
            author: 'Shanice (PM)',
            timestamp: '2026-08-15 10:15'
          }
        ],
        lastSyncedAt: '2026-08-26 15:45'
      },
      {
        id: 't-1a-1-2',
        scopeId: 'scope-1a-1',
        contactId: 'c-2',
        contractorName: 'Isaac Malok',
        companyName: 'Solai Contracting',
        category: 'Demo / Excavation',
        quotedFigure: 49200,
        currency: 'CAD',
        attachedDocs: [
          {
            id: 'doc-3',
            name: 'Solai_Demo_Estimate.pdf',
            url: 'https://docs.google.com/viewer?url=example.com/quotes/Solai_Demo.pdf',
            type: 'quote',
            addedAt: '2026-08-08',
            fileSize: '2.1 MB'
          }
        ],
        actionStatus: 'Confirm with PM',
        poSent: false,
        notes: [
          {
            id: 'n-3',
            text: 'Higher rate due to equipment mobilization surcharge.',
            author: 'Estimating Team',
            timestamp: '2026-08-09 11:20'
          }
        ],
        lastSyncedAt: '2026-08-26 15:45'
      },
      {
        id: 't-1a-1-3',
        scopeId: 'scope-1a-1',
        contactId: 'c-4',
        contractorName: 'Dave',
        companyName: "Dave's Digs Excavation Inc",
        category: 'Demo / Excavation',
        quotedFigure: 51000,
        currency: 'CAD',
        attachedDocs: [],
        actionStatus: 'Revision Submitted',
        poSent: false,
        notes: [],
        lastSyncedAt: '2026-08-26 15:45'
      }
    ]
  },
  {
    id: 'scope-1a-2',
    phaseId: '1A',
    name: 'Excavation, Other Earthworks & DSSP Install',
    description: 'Total for Excavation, Backfill, Rough Grading & full DSSP install, gravel, coring, drain rock, inspection (excl. GST)',
    budgetAmount: 92000,
    order: 2,
    isRequired: true,
    createdAt: '2026-08-01T09:00:00Z',
    trades: [
      {
        id: 't-1a-2-1',
        scopeId: 'scope-1a-2',
        contactId: 'c-3',
        contractorName: 'Anmolpreet Singh',
        companyName: 'Foundex Ground Services',
        category: 'Demo / Excavation',
        quotedFigure: 88500,
        currency: 'CAD',
        attachedDocs: [
          {
            id: 'doc-4',
            name: 'Foundex_Full_Earthworks_Tender.pdf',
            url: 'https://docs.google.com/viewer?url=example.com/quotes/Foundex_Tender.pdf',
            type: 'quote',
            addedAt: '2026-08-14',
            fileSize: '3.4 MB'
          }
        ],
        actionStatus: 'PO Approved',
        poSent: true,
        isAwarded: true,
        notes: [
          {
            id: 'n-4',
            text: 'Selected for combined earthworks + DSSP package.',
            author: 'Lead Estimator',
            timestamp: '2026-08-16 16:00'
          }
        ],
        lastSyncedAt: '2026-08-26 15:45'
      },
      {
        id: 't-1a-2-2',
        scopeId: 'scope-1a-2',
        contactId: 'c-4',
        contractorName: 'Dave',
        companyName: "Dave's Digs Excavation Inc",
        category: 'Demo / Excavation',
        quotedFigure: 94000,
        currency: 'CAD',
        attachedDocs: [
          {
            id: 'doc-5',
            name: 'DavesDigs_Earthworks_Quote.pdf',
            url: 'https://docs.google.com/viewer?url=example.com/quotes/DavesDigs.pdf',
            type: 'quote',
            addedAt: '2026-08-12',
            fileSize: '1.2 MB'
          }
        ],
        actionStatus: 'Follow-up Pending',
        poSent: false,
        notes: [],
        lastSyncedAt: '2026-08-26 15:45'
      }
    ]
  },
  {
    id: 'scope-1a-3',
    phaseId: '1A',
    name: 'DSSP Materials',
    description: 'Total for all DSSP Materials as per plans (Catch basins/storm tanks/manhole covers/Area Drains/Pipe/Hydrovex) - excl. GST',
    budgetAmount: 38000,
    order: 3,
    isRequired: true,
    createdAt: '2026-08-02T09:00:00Z',
    trades: [
      {
        id: 't-1a-3-1',
        scopeId: 'scope-1a-3',
        contactId: 'c-9',
        contractorName: 'Budd Hammoud',
        companyName: 'Iconix (Hydrovex)',
        category: 'DSSP Material Supply',
        quotedFigure: 35800,
        currency: 'CAD',
        attachedDocs: [
          {
            id: 'doc-6',
            name: 'Iconix_Hydrovex_Material_Spec.pdf',
            url: 'https://docs.google.com/viewer?url=example.com/specs/Iconix_Hydrovex.pdf',
            type: 'spec',
            addedAt: '2026-08-15',
            fileSize: '1.8 MB'
          }
        ],
        actionStatus: 'Confirm w/ ID',
        poSent: false,
        notes: [
          {
            id: 'n-5',
            text: 'Need ID check on catch basin sizing requirements.',
            author: 'Shanice (PM)',
            timestamp: '2026-08-20 09:30'
          }
        ],
        lastSyncedAt: '2026-08-26 15:45'
      },
      {
        id: 't-1a-3-2',
        scopeId: 'scope-1a-3',
        contactId: 'c-10',
        contractorName: 'Cassie Desautels',
        companyName: 'Emco Waterworks',
        category: 'DSSP Material Supply',
        quotedFigure: 37200,
        currency: 'CAD',
        attachedDocs: [],
        actionStatus: 'Waiting on Response',
        poSent: false,
        notes: [],
        lastSyncedAt: '2026-08-26 15:45'
      }
    ]
  },
  {
    id: 'scope-1a-4',
    phaseId: '1A',
    name: 'Water & Offsite Services',
    description: 'Total for Water & Underground and Permission to Permit (excl. GST)',
    budgetAmount: 55000,
    order: 4,
    isRequired: true,
    createdAt: '2026-08-02T09:00:00Z',
    trades: [
      {
        id: 't-1a-4-1',
        scopeId: 'scope-1a-4',
        contactId: 'c-6',
        contractorName: 'Ferlin Kang',
        companyName: 'Kang Construction Ltd.',
        category: 'Water / Offsite Services',
        quotedFigure: 52400,
        currency: 'CAD',
        attachedDocs: [
          {
            id: 'doc-7',
            name: 'Kang_Underground_Services_Quote.pdf',
            url: 'https://docs.google.com/viewer?url=example.com/quotes/Kang_Services.pdf',
            type: 'quote',
            addedAt: '2026-08-16',
            fileSize: '950 KB'
          }
        ],
        actionStatus: 'Confirm with PM',
        poSent: false,
        notes: [
          {
            id: 'n-6',
            text: 'Awaiting city tie-in permit confirmation before final PO issuance.',
            author: 'PM Team',
            timestamp: '2026-08-22 13:10'
          }
        ],
        lastSyncedAt: '2026-08-26 15:45'
      },
      {
        id: 't-1a-4-2',
        scopeId: 'scope-1a-4',
        contactId: 'c-5',
        contractorName: 'Joanne Slack',
        companyName: 'Precision Underground Services',
        category: 'Water / Offsite Services',
        quotedFigure: 56100,
        currency: 'CAD',
        attachedDocs: [],
        actionStatus: 'Request Revised Estimate',
        poSent: false,
        notes: [],
        lastSyncedAt: '2026-08-26 15:45'
      }
    ]
  },
  {
    id: 'scope-1a-5',
    phaseId: '1A',
    name: 'Footing & Foundation',
    description: 'Total for Foundation and Footing Walls (cribbing, rebar, ladder packages, window buckouts, labor), Garage Foundation & Retaining Wall - excl. GST',
    budgetAmount: 115000,
    order: 5,
    isRequired: true,
    createdAt: '2026-08-03T09:00:00Z',
    trades: [
      {
        id: 't-1a-5-1',
        scopeId: 'scope-1a-5',
        contactId: 'c-23',
        contractorName: 'Emil Timpea',
        companyName: 'Timeless Construction Enterprise Ltd',
        category: 'Foundation / Cribbing',
        quotedFigure: 112000,
        currency: 'CAD',
        attachedDocs: [
          {
            id: 'doc-8',
            name: 'Timeless_Foundation_Scope_Pricing.pdf',
            url: 'https://docs.google.com/viewer?url=example.com/quotes/Timeless_Foundation.pdf',
            type: 'quote',
            addedAt: '2026-08-18',
            fileSize: '4.1 MB'
          }
        ],
        actionStatus: 'PO Approved',
        poSent: true,
        isAwarded: true,
        notes: [
          {
            id: 'n-7',
            text: 'Rebar schedule approved by structural engineer of record.',
            author: 'Structural Lead',
            timestamp: '2026-08-21 15:00'
          }
        ],
        lastSyncedAt: '2026-08-26 15:45'
      },
      {
        id: 't-1a-5-2',
        scopeId: 'scope-1a-5',
        contactId: 'c-24',
        contractorName: 'Luke Fokkens',
        companyName: 'Tri-Form',
        category: 'Foundation / Cribbing',
        quotedFigure: 119500,
        currency: 'CAD',
        attachedDocs: [],
        actionStatus: 'Waiting on Response',
        poSent: false,
        notes: [],
        lastSyncedAt: '2026-08-26 15:45'
      }
    ]
  },
  {
    id: 'scope-1a-6',
    phaseId: '1A',
    name: 'Basement Slab/ Garage Slab/ Weeping & Gravel',
    description: 'Basement Slab, Garage Slab, Weeping Tile, Gravel, Damp Proofing (excl. GST)',
    budgetAmount: 64000,
    order: 6,
    isRequired: true,
    createdAt: '2026-08-03T09:00:00Z',
    trades: [
      {
        id: 't-1a-6-1',
        scopeId: 'scope-1a-6',
        contactId: 'c-28',
        contractorName: 'Cory Edwards',
        companyName: 'Edwards Concrete',
        category: 'Flatwork / Waterproofing',
        quotedFigure: 61800,
        currency: 'CAD',
        attachedDocs: [
          {
            id: 'doc-9',
            name: 'Edwards_Concrete_Slabs_Waterproofing.pdf',
            url: 'https://docs.google.com/viewer?url=example.com/quotes/Edwards_Slabs.pdf',
            type: 'quote',
            addedAt: '2026-08-17',
            fileSize: '1.1 MB'
          }
        ],
        actionStatus: 'PO Approved',
        poSent: true,
        isAwarded: true,
        notes: [],
        lastSyncedAt: '2026-08-26 15:45'
      },
      {
        id: 't-1a-6-2',
        scopeId: 'scope-1a-6',
        contactId: 'c-27',
        contractorName: 'Bali Khangura',
        companyName: 'Edge Gravel & Concrete Ltd.',
        category: 'Flatwork / Waterproofing',
        quotedFigure: 65200,
        currency: 'CAD',
        attachedDocs: [],
        actionStatus: 'Follow-up Pending',
        poSent: false,
        notes: [],
        lastSyncedAt: '2026-08-26 15:45'
      }
    ]
  },
  {
    id: 'scope-1a-7',
    phaseId: '1A',
    name: 'Framing Materials',
    description: 'Total for full framing material package (excl. GST)',
    budgetAmount: 145000,
    order: 7,
    isRequired: true,
    createdAt: '2026-08-04T09:00:00Z',
    trades: [
      {
        id: 't-1a-7-1',
        scopeId: 'scope-1a-7',
        contactId: 'c-45',
        contractorName: 'Michael Henne',
        companyName: "Dick's Lumber",
        category: 'Framing Material',
        quotedFigure: 139000,
        currency: 'CAD',
        attachedDocs: [
          {
            id: 'doc-10',
            name: 'Dicks_Lumber_LumberTakeoff_Final.pdf',
            url: 'https://docs.google.com/viewer?url=example.com/quotes/Dicks_Takeoff.pdf',
            type: 'quote',
            addedAt: '2026-08-19',
            fileSize: '3.2 MB'
          }
        ],
        actionStatus: 'PO Approved',
        poSent: true,
        isAwarded: true,
        notes: [
          {
            id: 'n-8',
            text: 'Locked in 60-day lumber index price guarantee.',
            author: 'Procurement',
            timestamp: '2026-08-20 11:00'
          }
        ],
        lastSyncedAt: '2026-08-26 15:45'
      },
      {
        id: 't-1a-7-2',
        scopeId: 'scope-1a-7',
        contactId: 'c-46',
        contractorName: 'Sidhu Pawan',
        companyName: 'Sunder Lumber',
        category: 'Framing Material',
        quotedFigure: 142500,
        currency: 'CAD',
        attachedDocs: [],
        actionStatus: 'Confirm with PM',
        poSent: false,
        notes: [],
        lastSyncedAt: '2026-08-26 15:45'
      }
    ]
  },
  {
    id: 'scope-1a-8',
    phaseId: '1A',
    name: 'Window Wells',
    description: 'Total for all Window Wells (excl. GST)',
    budgetAmount: 8500,
    order: 8,
    isRequired: true,
    createdAt: '2026-08-04T09:00:00Z',
    trades: [
      {
        id: 't-1a-8-1',
        scopeId: 'scope-1a-8',
        contactId: 'c-10',
        contractorName: 'Cassie Desautels',
        companyName: 'Emco Waterworks',
        category: 'DSSP Material Supply',
        quotedFigure: 7900,
        currency: 'CAD',
        attachedDocs: [],
        actionStatus: 'Confirm with PM',
        poSent: false,
        notes: [],
        lastSyncedAt: '2026-08-26 15:45'
      }
    ]
  },
  {
    id: 'scope-1a-9',
    phaseId: '1A',
    name: 'Exterior Doors & Windows',
    description: 'Total for all Exterior Doors & all Windows (excl. GST)',
    budgetAmount: 78000,
    order: 9,
    isRequired: true,
    createdAt: '2026-08-05T09:00:00Z',
    trades: [
      {
        id: 't-1a-9-1',
        scopeId: 'scope-1a-9',
        contactId: 'c-78',
        contractorName: 'Manish Gopal',
        companyName: 'Durabuilt Windows',
        category: 'Windows / Doors',
        quotedFigure: 74200,
        currency: 'CAD',
        attachedDocs: [
          {
            id: 'doc-11',
            name: 'Durabuilt_Glazing_Schedule.pdf',
            url: 'https://docs.google.com/viewer?url=example.com/specs/Durabuilt_Schedule.pdf',
            type: 'spec',
            addedAt: '2026-08-21',
            fileSize: '5.6 MB'
          }
        ],
        actionStatus: 'Confirm w/ ID',
        poSent: false,
        notes: [
          {
            id: 'n-9',
            text: 'Triple pane low-E spec confirmed. Waiting on frame color sign-off.',
            author: 'Shanice (PM)',
            timestamp: '2026-08-23 16:30'
          }
        ],
        lastSyncedAt: '2026-08-26 15:45'
      },
      {
        id: 't-1a-9-2',
        scopeId: 'scope-1a-9',
        contactId: 'c-77',
        contractorName: 'Vlad Nemchuk',
        companyName: 'Window Seal West',
        category: 'Windows / Doors',
        quotedFigure: 76800,
        currency: 'CAD',
        attachedDocs: [],
        actionStatus: 'Waiting on Response',
        poSent: false,
        notes: [],
        lastSyncedAt: '2026-08-26 15:45'
      }
    ]
  },
  {
    id: 'scope-1a-10',
    phaseId: '1A',
    name: 'Window Sealant',
    description: 'Sealant for all necessary openings (excl. GST)',
    budgetAmount: 6500,
    order: 10,
    isRequired: true,
    createdAt: '2026-08-05T09:00:00Z',
    trades: [
      {
        id: 't-1a-10-1',
        scopeId: 'scope-1a-10',
        contactId: 'c-31',
        contractorName: 'Sam',
        companyName: 'Apex Waterproofing Inc',
        category: 'Flatwork / Waterproofing',
        quotedFigure: 5800,
        currency: 'CAD',
        attachedDocs: [],
        actionStatus: 'Estimate Requested',
        poSent: false,
        notes: [],
        lastSyncedAt: '2026-08-26 15:45'
      }
    ]
  },
  {
    id: 'scope-1a-11',
    phaseId: '1A',
    name: 'Plumbing & Gas Rough In and Final',
    description: 'Plumbing Rough-In & Final, Gas Rough-in & Final, Plumbing & Gas Permits (excl. GST)',
    budgetAmount: 68000,
    order: 11,
    isRequired: true,
    createdAt: '2026-08-06T09:00:00Z',
    trades: [
      {
        id: 't-1a-11-1',
        scopeId: 'scope-1a-11',
        contactId: 'c-89',
        contractorName: 'Dave Nider',
        companyName: 'Zebra Plumbing',
        category: 'Plumbing & Gas',
        quotedFigure: 64500,
        currency: 'CAD',
        attachedDocs: [
          {
            id: 'doc-12',
            name: 'Zebra_Plumbing_Tender_Submission.pdf',
            url: 'https://docs.google.com/viewer?url=example.com/quotes/Zebra_Plumbing.pdf',
            type: 'quote',
            addedAt: '2026-08-20',
            fileSize: '1.9 MB'
          }
        ],
        actionStatus: 'PO Approved',
        poSent: true,
        isAwarded: true,
        notes: [
          {
            id: 'n-10',
            text: 'Includes all permit fees and gas line certification.',
            author: 'PM Team',
            timestamp: '2026-08-22 09:00'
          }
        ],
        lastSyncedAt: '2026-08-26 15:45'
      },
      {
        id: 't-1a-11-2',
        scopeId: 'scope-1a-11',
        contactId: 'c-90',
        contractorName: 'Jon Graham',
        companyName: 'Tank Plumbing',
        category: 'Plumbing & Gas',
        quotedFigure: 69000,
        currency: 'CAD',
        attachedDocs: [],
        actionStatus: 'Waiting on Response',
        poSent: false,
        notes: [],
        lastSyncedAt: '2026-08-26 15:45'
      }
    ]
  },
  {
    id: 'scope-1a-12',
    phaseId: '1A',
    name: 'Electrical Rough-in and Final',
    description: 'Electrical Rough-in & Final (excl. GST)',
    budgetAmount: 62000,
    order: 12,
    isRequired: true,
    createdAt: '2026-08-06T09:00:00Z',
    trades: [
      {
        id: 't-1a-12-1',
        scopeId: 'scope-1a-12',
        contactId: 'c-82',
        contractorName: 'Rikky Prakash',
        companyName: "Rik's Electrical",
        category: 'Electrical',
        quotedFigure: 59800,
        currency: 'CAD',
        attachedDocs: [
          {
            id: 'doc-13',
            name: 'Riks_Electrical_Scope_Breakdown.pdf',
            url: 'https://docs.google.com/viewer?url=example.com/quotes/Riks_Elec.pdf',
            type: 'quote',
            addedAt: '2026-08-22',
            fileSize: '2.0 MB'
          }
        ],
        actionStatus: 'Confirm with PM',
        poSent: false,
        notes: [
          {
            id: 'n-11',
            text: '200A service upgrade included. Ready for PM approval.',
            author: 'Shanice (PM)',
            timestamp: '2026-08-24 14:00'
          }
        ],
        lastSyncedAt: '2026-08-26 15:45'
      },
      {
        id: 't-1a-12-2',
        scopeId: 'scope-1a-12',
        contactId: 'c-84',
        contractorName: 'Kyle Winter',
        companyName: 'Winter Electrical',
        category: 'Electrical',
        quotedFigure: 63500,
        currency: 'CAD',
        attachedDocs: [],
        actionStatus: 'Follow-up Pending',
        poSent: false,
        notes: [],
        lastSyncedAt: '2026-08-26 15:45'
      }
    ]
  },
  {
    id: 'scope-1a-13',
    phaseId: '1A',
    name: 'HVAC',
    description: 'Heating Rough-in & Final, Air Conditioning (Rough-In Only) - (excl. GST)',
    budgetAmount: 42000,
    order: 13,
    isRequired: true,
    createdAt: '2026-08-07T09:00:00Z',
    trades: [
      {
        id: 't-1a-13-1',
        scopeId: 'scope-1a-13',
        contactId: 'c-85',
        contractorName: 'Blaine Andrejcin',
        companyName: 'BA HVAC',
        category: 'HVAC',
        quotedFigure: 39500,
        currency: 'CAD',
        attachedDocs: [
          {
            id: 'doc-14',
            name: 'BA_HVAC_Tender_Proposal.pdf',
            url: 'https://docs.google.com/viewer?url=example.com/quotes/BA_HVAC.pdf',
            type: 'quote',
            addedAt: '2026-08-19',
            fileSize: '1.7 MB'
          }
        ],
        actionStatus: 'PO Approved',
        poSent: true,
        isAwarded: true,
        notes: [],
        lastSyncedAt: '2026-08-26 15:45'
      },
      {
        id: 't-1a-13-2',
        scopeId: 'scope-1a-13',
        contactId: 'c-88',
        contractorName: 'Wesley Esopenko',
        companyName: 'Wesley Esopenko (Air Conditioning)',
        category: 'HVAC',
        quotedFigure: 41200,
        currency: 'CAD',
        attachedDocs: [],
        actionStatus: 'Revision Submitted',
        poSent: false,
        notes: [],
        lastSyncedAt: '2026-08-26 15:45'
      }
    ]
  },
  {
    id: 'scope-1a-14',
    phaseId: '1A',
    name: 'Precast Steps',
    description: 'Total for all Precast Steps (excl. GST)',
    budgetAmount: 9500,
    order: 14,
    isRequired: true,
    createdAt: '2026-08-07T09:00:00Z',
    trades: [
      {
        id: 't-1a-14-1',
        scopeId: 'scope-1a-14',
        contactId: 'c-32',
        contractorName: 'Bob Spence',
        companyName: 'Lafarge Canada Inc. / Amrize Canada Inc.',
        category: 'Concrete Supply',
        quotedFigure: 8700,
        currency: 'CAD',
        attachedDocs: [],
        actionStatus: 'Confirm with PM',
        poSent: false,
        notes: [],
        lastSyncedAt: '2026-08-26 15:45'
      }
    ]
  },

  // ===================== PHASE 1B =====================
  {
    id: 'scope-1b-1',
    phaseId: '1B',
    name: 'Framing Labour',
    description: 'Main Unit Framing Labour total (excl. GST), Basement Framing Labour total (excl. GST), Garage Framing Labour total (excl. GST)',
    budgetAmount: 110000,
    order: 1,
    isRequired: true,
    createdAt: '2026-08-08T09:00:00Z',
    trades: [
      {
        id: 't-1b-1-1',
        scopeId: 'scope-1b-1',
        contactId: 'c-38',
        contractorName: 'Harpreet Singh',
        companyName: 'Star Framing Ltd',
        category: 'Framing Labour',
        quotedFigure: 105000,
        currency: 'CAD',
        attachedDocs: [
          {
            id: 'doc-1b-1',
            name: 'StarFraming_Labor_Scope_Quote.pdf',
            url: 'https://docs.google.com/viewer?url=example.com/quotes/Star_Framing.pdf',
            type: 'quote',
            addedAt: '2026-08-20',
            fileSize: '3.4 MB'
          }
        ],
        actionStatus: 'PO Approved',
        poSent: true,
        isAwarded: true,
        notes: [
          {
            id: 'n-1b-1',
            text: 'Crew size 8 framers, starts upon foundation cure signoff.',
            author: 'Shanice (PM)',
            timestamp: '2026-08-22 09:30'
          }
        ],
        quoteBreakdown: [
          {
            id: 'qb-1b-1-1',
            costCode: '20320',
            itemDescription: 'Main Unit Framing Labour total (excl. GST)',
            amount: 63000,
            unit: 'LS',
            qty: 1,
            inclusionStatus: 'included'
          },
          {
            id: 'qb-1b-1-2',
            costCode: '20320',
            itemDescription: 'Basement Framing Labour total (excl. GST)',
            amount: 26250,
            unit: 'LS',
            qty: 1,
            inclusionStatus: 'included'
          },
          {
            id: 'qb-1b-1-3',
            costCode: '20320',
            itemDescription: 'Garage Framing Labour total (excl. GST)',
            amount: 15750,
            unit: 'LS',
            qty: 1,
            inclusionStatus: 'included'
          }
        ],
        lastSyncedAt: '2026-08-26 15:45'
      },
      {
        id: 't-1b-1-2',
        scopeId: 'scope-1b-1',
        contactId: 'c-39',
        contractorName: 'Manjinder Gill',
        companyName: 'Gill Brothers Framing',
        category: 'Framing Labour',
        quotedFigure: 114000,
        currency: 'CAD',
        attachedDocs: [],
        actionStatus: 'Waiting on Response',
        poSent: false,
        notes: [],
        quoteBreakdown: [
          {
            id: 'qb-1b-1-4',
            costCode: '20320',
            itemDescription: 'Main Unit Framing Labour total (excl. GST)',
            amount: 68400,
            unit: 'LS',
            qty: 1,
            inclusionStatus: 'included'
          },
          {
            id: 'qb-1b-1-5',
            costCode: '20320',
            itemDescription: 'Basement Framing Labour total (excl. GST)',
            amount: 28500,
            unit: 'LS',
            qty: 1,
            inclusionStatus: 'included'
          },
          {
            id: 'qb-1b-1-6',
            costCode: '20320',
            itemDescription: 'Garage Framing Labour total (excl. GST)',
            amount: 17100,
            unit: 'LS',
            qty: 1,
            inclusionStatus: 'included'
          }
        ],
        lastSyncedAt: '2026-08-26 15:45'
      }
    ]
  },
  {
    id: 'scope-1b-2',
    phaseId: '1B',
    name: 'Interior Stairs',
    description: 'Interior Stairs (Excl. GST)',
    budgetAmount: 18000,
    order: 2,
    isRequired: true,
    createdAt: '2026-08-08T09:00:00Z',
    trades: [
      {
        id: 't-1b-2-1',
        scopeId: 'scope-1b-2',
        contactId: 'c-48',
        contractorName: 'Mark Brydon',
        companyName: 'Brydon Stairs',
        category: 'Interior Stairs',
        quotedFigure: 2950.25,
        currency: 'CAD',
        attachedDocs: [
          {
            id: 'doc-1b-2',
            name: 'Brydon_Stairs_ShopDrawings.pdf',
            url: 'https://docs.google.com/viewer?url=example.com/quotes/Brydon_Stairs.pdf',
            type: 'quote',
            addedAt: '2026-08-21',
            fileSize: '2.1 MB'
          }
        ],
        actionStatus: 'PO Approved',
        poSent: true,
        isAwarded: true,
        notes: [],
        quoteBreakdown: [
          {
            id: 'qb-1b-2-1',
            costCode: '20330',
            itemDescription: 'Interior Stairs (Excl. GST)',
            amount: 2950.25,
            unit: 'LS',
            qty: 1,
            inclusionStatus: 'included'
          }
        ],
        lastSyncedAt: '2026-08-26 15:45'
      },
      {
        id: 't-1b-2-2',
        scopeId: 'scope-1b-2',
        contactId: 'c-49',
        contractorName: 'Estimating Dept',
        companyName: 'Artistic Stairs & Railings',
        category: 'Interior Stairs',
        quotedFigure: 17800,
        currency: 'CAD',
        attachedDocs: [],
        actionStatus: 'Revision Submitted',
        poSent: false,
        notes: [],
        quoteBreakdown: [
          {
            id: 'qb-1b-2-2',
            costCode: '20330',
            itemDescription: 'Interior Stairs (Excl. GST)',
            amount: 17800,
            unit: 'LS',
            qty: 1,
            inclusionStatus: 'included'
          }
        ],
        lastSyncedAt: '2026-08-26 15:45'
      }
    ]
  },
  {
    id: 'scope-1b-3',
    phaseId: '1B',
    name: 'Roofing',
    description: 'Total for Roofing (sloped) - excl. GST, Total for Flat Roof (If Applicable) - excl. GST, Total for Garage Roof - excl. GST',
    budgetAmount: 42000,
    order: 3,
    isRequired: true,
    createdAt: '2026-08-08T09:00:00Z',
    trades: [
      {
        id: 't-1b-3-1',
        scopeId: 'scope-1b-3',
        contactId: 'c-51',
        contractorName: 'Baaj Singh',
        companyName: 'Royalz Roofing',
        category: 'Roofing',
        quotedFigure: 39500,
        currency: 'CAD',
        attachedDocs: [
          {
            id: 'doc-1b-3',
            name: 'Royalz_Roofing_Warranty_Quote.pdf',
            url: 'https://docs.google.com/viewer?url=example.com/quotes/Royalz_Roofing.pdf',
            type: 'quote',
            addedAt: '2026-08-18',
            fileSize: '1.6 MB'
          }
        ],
        actionStatus: 'PO Approved',
        poSent: true,
        isAwarded: true,
        notes: [],
        quoteBreakdown: [
          {
            id: 'qb-1b-3-1',
            costCode: '20510',
            itemDescription: 'Total for Roofing (sloped) - excl. GST',
            amount: 23700,
            unit: 'LS',
            qty: 1,
            inclusionStatus: 'included'
          },
          {
            id: 'qb-1b-3-2',
            costCode: '20520',
            itemDescription: 'Total for Flat Roof (If Applicable) - excl. GST',
            amount: 7900,
            unit: 'LS',
            qty: 1,
            inclusionStatus: 'included'
          },
          {
            id: 'qb-1b-3-3',
            costCode: '21820',
            itemDescription: 'Total for Garage Roof - excl. GST',
            amount: 7900,
            unit: 'LS',
            qty: 1,
            inclusionStatus: 'included'
          }
        ],
        lastSyncedAt: '2026-08-26 15:45'
      },
      {
        id: 't-1b-3-2',
        scopeId: 'scope-1b-3',
        contactId: 'c-52',
        contractorName: 'Stan',
        companyName: 'J&S Roofing',
        category: 'Roofing',
        quotedFigure: 43000,
        currency: 'CAD',
        attachedDocs: [],
        actionStatus: 'Waiting on Response',
        poSent: false,
        notes: [],
        quoteBreakdown: [
          {
            id: 'qb-1b-3-4',
            costCode: '20510',
            itemDescription: 'Total for Roofing (sloped) - excl. GST',
            amount: 25800,
            unit: 'LS',
            qty: 1,
            inclusionStatus: 'included'
          },
          {
            id: 'qb-1b-3-5',
            costCode: '20520',
            itemDescription: 'Total for Flat Roof (If Applicable) - excl. GST',
            amount: 8600,
            unit: 'LS',
            qty: 1,
            inclusionStatus: 'included'
          },
          {
            id: 'qb-1b-3-6',
            costCode: '21820',
            itemDescription: 'Total for Garage Roof - excl. GST',
            amount: 8600,
            unit: 'LS',
            qty: 1,
            inclusionStatus: 'included'
          }
        ],
        lastSyncedAt: '2026-08-26 15:45'
      }
    ]
  },
  {
    id: 'scope-1b-4',
    phaseId: '1B',
    name: 'Decking',
    description: 'Total for Decking as per plans (excl. GST)',
    budgetAmount: 14000,
    order: 4,
    isRequired: true,
    createdAt: '2026-08-08T09:00:00Z',
    trades: [
      {
        id: 't-1b-4-1',
        scopeId: 'scope-1b-4',
        contactId: 'c-55',
        contractorName: 'Dave',
        companyName: 'Timber Ridge Decking Ltd',
        category: 'Decking',
        quotedFigure: 1476.75,
        currency: 'CAD',
        attachedDocs: [],
        actionStatus: 'Confirm with PM',
        poSent: false,
        notes: [],
        quoteBreakdown: [
          {
            id: 'qb-1b-4-1',
            costCode: '20530',
            itemDescription: 'Total for Decking as per plans (excl. GST)',
            amount: 1476.75,
            unit: 'LS',
            qty: 1,
            inclusionStatus: 'included'
          }
        ],
        lastSyncedAt: '2026-08-26 15:45'
      }
    ]
  },
  {
    id: 'scope-1b-5',
    phaseId: '1B',
    name: 'Rainware',
    description: 'Total for all Rainware, Downspouts and Gutters (excl. GST)',
    budgetAmount: 8500,
    order: 5,
    isRequired: true,
    createdAt: '2026-08-08T09:00:00Z',
    trades: [
      {
        id: 't-1b-5-1',
        scopeId: 'scope-1b-5',
        contactId: 'c-57',
        contractorName: 'Khoa Tran',
        companyName: 'The Three Brothers Eavestroughing Inc',
        category: 'Rainware',
        quotedFigure: 7600,
        currency: 'CAD',
        attachedDocs: [],
        actionStatus: 'PO Approved',
        poSent: true,
        isAwarded: true,
        notes: [],
        quoteBreakdown: [
          {
            id: 'qb-1b-5-1',
            costCode: '20540',
            itemDescription: 'Total for all Rainware, Downspouts and Gutters (excl. GST)',
            amount: 7600,
            unit: 'LS',
            qty: 1,
            inclusionStatus: 'included'
          }
        ],
        lastSyncedAt: '2026-08-26 15:45'
      },
      {
        id: 't-1b-5-2',
        scopeId: 'scope-1b-5',
        contactId: 'c-58',
        contractorName: 'Alex Smith',
        companyName: 'Apex Gutters Ltd',
        category: 'Rainware',
        quotedFigure: 8400,
        currency: 'CAD',
        attachedDocs: [],
        actionStatus: 'Waiting on Response',
        poSent: false,
        notes: [],
        quoteBreakdown: [
          {
            id: 'qb-1b-5-2',
            costCode: '20540',
            itemDescription: 'Total for all Rainware, Downspouts and Gutters (excl. GST)',
            amount: 8400,
            unit: 'LS',
            qty: 1,
            inclusionStatus: 'included'
          }
        ],
        lastSyncedAt: '2026-08-26 15:45'
      }
    ]
  },
  {
    id: 'scope-1b-6',
    phaseId: '1B',
    name: 'Exterior Finishing',
    description: 'Total for Exterior Finishing & Cladding - Main Building (excl. GST), Total for Exterior Finishing & Cladding - Garage (excl. GST), Total for Soffit & Fascia - Main Building (excl. GST), Total for Soffit & Fascia - Garage (excl. GST)',
    budgetAmount: 56000,
    order: 6,
    isRequired: true,
    createdAt: '2026-08-08T09:00:00Z',
    trades: [
      {
        id: 't-1b-6-1',
        scopeId: 'scope-1b-6',
        contactId: 'c-60',
        contractorName: 'Parminder',
        companyName: 'Pacific Exterior Finishing',
        category: 'Exterior Finishing / Cladding',
        quotedFigure: 52400,
        currency: 'CAD',
        attachedDocs: [
          {
            id: 'doc-1b-6',
            name: 'Pacific_Exterior_Hardie_Quote.pdf',
            url: 'https://docs.google.com/viewer?url=example.com/quotes/Pacific_Exterior.pdf',
            type: 'quote',
            addedAt: '2026-08-21',
            fileSize: '3.1 MB'
          }
        ],
        actionStatus: 'Confirm with PM',
        poSent: false,
        notes: [
          {
            id: 'n-1b-6',
            text: 'Includes color matched aluminum fascia and vented soffit.',
            author: 'Shanice (PM)',
            timestamp: '2026-08-22 14:00'
          }
        ],
        quoteBreakdown: [
          {
            id: 'qb-1b-6-1',
            costCode: '20630',
            itemDescription: 'Total for Exterior Finishing & Cladding - Main Building (excl. GST)',
            amount: 26200,
            unit: 'LS',
            qty: 1,
            inclusionStatus: 'included'
          },
          {
            id: 'qb-1b-6-2',
            costCode: '20630',
            itemDescription: 'Total for Exterior Finishing & Cladding - Garage (excl. GST)',
            amount: 10480,
            unit: 'LS',
            qty: 1,
            inclusionStatus: 'included'
          },
          {
            id: 'qb-1b-6-3',
            costCode: '20640',
            itemDescription: 'Total for Soffit & Fascia - Main Building (excl. GST)',
            amount: 10480,
            unit: 'LS',
            qty: 1,
            inclusionStatus: 'included'
          },
          {
            id: 'qb-1b-6-4',
            costCode: '20640',
            itemDescription: 'Total for Soffit & Fascia - Garage (excl. GST)',
            amount: 5240,
            unit: 'LS',
            qty: 1,
            inclusionStatus: 'included'
          }
        ],
        lastSyncedAt: '2026-08-26 15:45'
      }
    ]
  },
  {
    id: 'scope-1b-7',
    phaseId: '1B',
    name: 'Masonry',
    costCode: '20610',
    description: 'Total for masonry (supply) - excl. GST, Total for masonry (install) - excl. GST',
    budgetAmount: 26000,
    order: 7,
    isRequired: true,
    createdAt: '2026-08-08T09:00:00Z',
    trades: [
      {
        id: 't-1b-7-1',
        scopeId: 'scope-1b-7',
        contactId: 'c-65',
        contractorName: 'Marco Rossi',
        companyName: 'Rossi Stone & Masonry',
        category: 'Masonry',
        quotedFigure: 24000,
        currency: 'CAD',
        attachedDocs: [],
        actionStatus: 'Confirm with PM',
        poSent: false,
        isAwarded: false,
        notes: [],
        quoteBreakdown: [
          {
            id: 'qb-1b-7-1',
            costCode: '20610',
            itemDescription: 'Total for masonry (supply) - excl. GST',
            amount: 12000,
            unit: 'LS',
            qty: 1,
            inclusionStatus: 'included'
          },
          {
            id: 'qb-1b-7-2',
            costCode: '20610',
            itemDescription: 'Total for masonry (install) - excl. GST',
            amount: 12000,
            unit: 'LS',
            qty: 1,
            inclusionStatus: 'included'
          }
        ],
        lastSyncedAt: '2026-08-26 15:45'
      }
    ]
  },
  {
    id: 'scope-1b-8',
    phaseId: '1B',
    name: 'Stucco',
    description: 'Total for Stucco - Main Building (excl. GST), Total for Stucco - Garage (excl. GST)',
    budgetAmount: 34000,
    order: 8,
    isRequired: true,
    createdAt: '2026-08-08T09:00:00Z',
    trades: [
      {
        id: 't-1b-8-1',
        scopeId: 'scope-1b-8',
        contactId: 'c-70',
        contractorName: 'Roberto Gomez',
        companyName: 'Elite Stucco Systems',
        category: 'Stucco',
        quotedFigure: 31800,
        currency: 'CAD',
        attachedDocs: [],
        actionStatus: 'Confirm w/ ID',
        poSent: false,
        notes: [],
        quoteBreakdown: [
          {
            id: 'qb-1b-8-1',
            costCode: '20620',
            itemDescription: 'Total for Stucco - Main Building (excl. GST)',
            amount: 22260,
            unit: 'LS',
            qty: 1,
            inclusionStatus: 'included'
          },
          {
            id: 'qb-1b-8-2',
            costCode: '20620',
            itemDescription: 'Total for Stucco - Garage (excl. GST)',
            amount: 9540,
            unit: 'LS',
            qty: 1,
            inclusionStatus: 'included'
          }
        ],
        lastSyncedAt: '2026-08-26 15:45'
      }
    ]
  },
  {
    id: 'scope-1b-9',
    phaseId: '1B',
    name: 'Sprinkler System',
    description: 'Total for Sprinkler System (supply & install) - excl. GST',
    budgetAmount: 32000,
    order: 9,
    isRequired: true,
    createdAt: '2026-08-09T09:00:00Z',
    trades: [
      {
        id: 't-1b-9-1',
        scopeId: 'scope-1b-9',
        contactId: 'c-96',
        contractorName: 'James Huynh',
        companyName: 'Troy Life & Fire Safety Ltd',
        category: 'Fire Suppression / Sprinklers',
        quotedFigure: 29800,
        currency: 'CAD',
        attachedDocs: [
          {
            id: 'doc-1b-9',
            name: 'TroyLife_NFPA_Compliance_Quote.pdf',
            url: 'https://docs.google.com/viewer?url=example.com/quotes/Troy_Sprinklers.pdf',
            type: 'quote',
            addedAt: '2026-08-20',
            fileSize: '2.5 MB'
          }
        ],
        actionStatus: 'PO Approved',
        poSent: true,
        isAwarded: true,
        notes: [
          {
            id: 'n-1b-9',
            text: 'Hydraulic calculations approved by municipal inspector.',
            author: 'Shanice (PM)',
            timestamp: '2026-08-23 10:00'
          }
        ],
        quoteBreakdown: [
          {
            id: 'qb-1b-9-1',
            costCode: '20730',
            itemDescription: 'Total for Sprinkler System (supply & install) - excl. GST',
            amount: 29800,
            unit: 'LS',
            qty: 1,
            inclusionStatus: 'included'
          }
        ],
        lastSyncedAt: '2026-08-26 15:45'
      },
      {
        id: 't-1b-9-2',
        scopeId: 'scope-1b-9',
        contactId: 'c-97',
        contractorName: 'Rick Pester',
        companyName: 'Viking Fire Protection Inc.',
        category: 'Fire Suppression / Sprinklers',
        quotedFigure: 33400,
        currency: 'CAD',
        attachedDocs: [],
        actionStatus: 'Waiting on Response',
        poSent: false,
        notes: [],
        quoteBreakdown: [
          {
            id: 'qb-1b-9-2',
            costCode: '20730',
            itemDescription: 'Total for Sprinkler System (supply & install) - excl. GST',
            amount: 33400,
            unit: 'LS',
            qty: 1,
            inclusionStatus: 'included'
          }
        ],
        lastSyncedAt: '2026-08-26 15:45'
      }
    ]
  },
  {
    id: 'scope-1b-10',
    phaseId: '1B',
    name: 'Fireplace',
    description: 'Total for Fireplace/s (Supply & Install) - excl. GST',
    budgetAmount: 16000,
    order: 10,
    isRequired: true,
    createdAt: '2026-08-09T09:00:00Z',
    trades: [
      {
        id: 't-1b-10-1',
        scopeId: 'scope-1b-10',
        contactId: 'c-98',
        contractorName: 'Brian Miller',
        companyName: 'Flame Master Fireplaces',
        category: 'Fireplaces',
        quotedFigure: 14500,
        currency: 'CAD',
        attachedDocs: [],
        actionStatus: 'Confirm with PM',
        poSent: false,
        notes: [],
        quoteBreakdown: [
          {
            id: 'qb-1b-10-1',
            costCode: '20740',
            itemDescription: 'Total for Fireplace/s (Supply & Install) - excl. GST',
            amount: 14500,
            unit: 'LS',
            qty: 1,
            inclusionStatus: 'included'
          }
        ],
        lastSyncedAt: '2026-08-26 15:45'
      }
    ]
  },
  {
    id: 'scope-1b-11',
    phaseId: '1B',
    name: 'Drywall & Insulation',
    description: 'Total for Drywall & Insulation - Main building - excl. GST, Total for Drywall & Insulation - Garage - excl. GST',
    budgetAmount: 68000,
    order: 11,
    isRequired: true,
    createdAt: '2026-08-09T09:00:00Z',
    trades: [
      {
        id: 't-1b-11-1',
        scopeId: 'scope-1b-11',
        contactId: 'c-100',
        contractorName: 'Baljit Sidhu',
        companyName: 'Pioneer Drywall & Taping',
        category: 'Drywall & Insulation',
        quotedFigure: 63500,
        currency: 'CAD',
        attachedDocs: [
          {
            id: 'doc-1b-11',
            name: 'Pioneer_Drywall_Scope_Breakdown.pdf',
            url: 'https://docs.google.com/viewer?url=example.com/quotes/Pioneer_Drywall.pdf',
            type: 'quote',
            addedAt: '2026-08-20',
            fileSize: '2.8 MB'
          }
        ],
        actionStatus: 'PO Approved',
        poSent: true,
        isAwarded: true,
        notes: [],
        quoteBreakdown: [
          {
            id: 'qb-1b-11-1',
            costCode: '21110',
            itemDescription: 'Total for Drywall & Insulation - Main building - excl. GST',
            amount: 47625,
            unit: 'LS',
            qty: 1,
            inclusionStatus: 'included'
          },
          {
            id: 'qb-1b-11-2',
            costCode: '21110',
            itemDescription: 'Total for Drywall & Insulation - Garage - excl. GST',
            amount: 15875,
            unit: 'LS',
            qty: 1,
            inclusionStatus: 'included'
          }
        ],
        lastSyncedAt: '2026-08-26 15:45'
      }
    ]
  },
  {
    id: 'scope-1b-12',
    phaseId: '1B',
    name: 'Spray Foam',
    description: 'Total for Spray Foam (excl. GST)',
    budgetAmount: 22000,
    order: 12,
    isRequired: true,
    createdAt: '2026-08-09T09:00:00Z',
    trades: [
      {
        id: 't-1b-12-1',
        scopeId: 'scope-1b-12',
        contactId: 'c-103',
        contractorName: 'Karm Chahal',
        companyName: 'Go Green Sprayfoam',
        category: 'Sprayfoam',
        quotedFigure: 19800,
        currency: 'CAD',
        attachedDocs: [],
        actionStatus: 'PO Approved',
        poSent: true,
        isAwarded: true,
        notes: [],
        quoteBreakdown: [
          {
            id: 'qb-1b-12-1',
            costCode: '21130',
            itemDescription: 'Total for Spray Foam (excl. GST)',
            amount: 19800,
            unit: 'LS',
            qty: 1,
            inclusionStatus: 'included'
          }
        ],
        lastSyncedAt: '2026-08-26 15:45'
      }
    ]
  },
  {
    id: 'scope-1b-13',
    phaseId: '1B',
    name: 'Cabinets & Built-Ins',
    description: 'Total for all Cabinets & Built-ins (excl. GST)',
    budgetAmount: 85000,
    order: 13,
    isRequired: true,
    createdAt: '2026-08-09T09:00:00Z',
    trades: [
      {
        id: 't-1b-13-1',
        scopeId: 'scope-1b-13',
        contactId: 'c-115',
        contractorName: 'David Lee',
        companyName: 'Legacy Custom Millwork',
        category: 'Cabinets & Millwork',
        quotedFigure: 79500,
        currency: 'CAD',
        attachedDocs: [
          {
            id: 'doc-1b-13',
            name: 'LegacyMillwork_Cabinet_Drawings_Quote.pdf',
            url: 'https://docs.google.com/viewer?url=example.com/quotes/Legacy_Millwork.pdf',
            type: 'quote',
            addedAt: '2026-08-21',
            fileSize: '4.2 MB'
          }
        ],
        actionStatus: 'Confirm w/ ID',
        poSent: false,
        notes: [
          {
            id: 'n-1b-13',
            text: 'Finish sample package delivered to interior designer for signoff.',
            author: 'Shanice (PM)',
            timestamp: '2026-08-23 16:20'
          }
        ],
        quoteBreakdown: [
          {
            id: 'qb-1b-13-1',
            costCode: '21420',
            itemDescription: 'Total for all Cabinets & Built-ins (excl. GST)',
            amount: 79500,
            unit: 'LS',
            qty: 1,
            inclusionStatus: 'included'
          }
        ],
        lastSyncedAt: '2026-08-26 15:45'
      }
    ]
  },

  // ===================== PHASE 2A (Interior A) =====================
  {
    id: 'scope-2a-1',
    phaseId: '2A',
    name: 'Countertops',
    description: 'Total for all Countertops as per interior design details and specs & Total for all Sinks (excl. GST)',
    budgetAmount: 38000,
    order: 1,
    isRequired: true,
    createdAt: '2026-08-10T09:00:00Z',
    trades: [
      {
        id: 't-2a-1-1',
        scopeId: 'scope-2a-1',
        contactId: 'c-123',
        contractorName: 'Yin',
        companyName: 'Stone Gallery Ltd',
        category: 'Countertops',
        quotedFigure: 35200,
        currency: 'CAD',
        attachedDocs: [
          {
            id: 'doc-18',
            name: 'StoneGallery_Quartz_SlabSelection.pdf',
            url: 'https://docs.google.com/viewer?url=example.com/specs/StoneGallery_Quartz.pdf',
            type: 'spec',
            addedAt: '2026-08-22',
            fileSize: '4.8 MB'
          }
        ],
        actionStatus: 'PO Approved',
        poSent: true,
        isAwarded: true,
        notes: [
          {
            id: 'n-14',
            text: 'Includes waterfall island edge detail and undermount sink cutouts.',
            author: 'Interior Designer',
            timestamp: '2026-08-23 15:15'
          }
        ],
        lastSyncedAt: '2026-08-26 15:45'
      },
      {
        id: 't-2a-1-2',
        scopeId: 'scope-2a-1',
        contactId: 'c-124',
        contractorName: 'Jeff Crawford',
        companyName: 'Stone & Tile By Hyatt Inc.',
        category: 'Countertops',
        quotedFigure: 37900,
        currency: 'CAD',
        attachedDocs: [],
        actionStatus: 'Follow-up Pending',
        poSent: false,
        notes: [],
        lastSyncedAt: '2026-08-26 15:45'
      },
      {
        id: 't-2a-1-3',
        scopeId: 'scope-2a-1',
        contactId: 'c-126',
        contractorName: 'Grace Nguyen',
        companyName: 'HGB',
        category: 'Countertops',
        quotedFigure: 39100,
        currency: 'CAD',
        attachedDocs: [],
        actionStatus: 'Waiting on Response',
        poSent: false,
        notes: [],
        lastSyncedAt: '2026-08-26 15:45'
      }
    ]
  },
  {
    id: 'scope-2a-2',
    phaseId: '2A',
    name: 'Plumbing Fixtures',
    description: 'Plumbing Fixture total (excluding sinks) - excl. GST',
    budgetAmount: 24000,
    order: 2,
    isRequired: true,
    createdAt: '2026-08-10T09:00:00Z',
    trades: [
      {
        id: 't-2a-2-1',
        scopeId: 'scope-2a-2',
        contactId: 'c-93',
        contractorName: 'Sales Desk',
        companyName: 'Plumbing Gallery / Robinson Supply',
        category: 'Plumbing & Lighting Suppliers',
        quotedFigure: 22600,
        currency: 'CAD',
        attachedDocs: [
          {
            id: 'doc-19',
            name: 'RobinsonSupply_Fixture_Package_List.pdf',
            url: 'https://docs.google.com/viewer?url=example.com/quotes/Robinson_Fixtures.pdf',
            type: 'quote',
            addedAt: '2026-08-21',
            fileSize: '2.3 MB'
          }
        ],
        actionStatus: 'PO Approved',
        poSent: true,
        isAwarded: true,
        notes: [],
        lastSyncedAt: '2026-08-26 15:45'
      },
      {
        id: 't-2a-2-2',
        scopeId: 'scope-2a-2',
        contactId: 'c-94',
        contractorName: 'Amanjot Johal',
        companyName: 'Aqua Touch Plumbing & Lighting Inc',
        category: 'Plumbing & Lighting Suppliers',
        quotedFigure: 23800,
        currency: 'CAD',
        attachedDocs: [],
        actionStatus: 'Confirm with PM',
        poSent: false,
        notes: [],
        lastSyncedAt: '2026-08-26 15:45'
      }
    ]
  },
  {
    id: 'scope-2a-3',
    phaseId: '2A',
    name: 'Lighting Fixtures',
    description: 'Total for all Light Fixtures - excl. GST',
    budgetAmount: 22000,
    order: 3,
    isRequired: true,
    createdAt: '2026-08-11T09:00:00Z',
    trades: [
      {
        id: 't-2a-3-1',
        scopeId: 'scope-2a-3',
        contactId: 'c-95',
        contractorName: 'Gurpeet Sangha',
        companyName: 'Dhillon Lighting',
        category: 'Plumbing & Lighting Suppliers',
        quotedFigure: 20400,
        currency: 'CAD',
        attachedDocs: [
          {
            id: 'doc-20',
            name: 'Dhillon_Lighting_Schedule_Quote.pdf',
            url: 'https://docs.google.com/viewer?url=example.com/quotes/Dhillon_Lights.pdf',
            type: 'quote',
            addedAt: '2026-08-23',
            fileSize: '3.1 MB'
          }
        ],
        actionStatus: 'Confirm w/ ID',
        poSent: false,
        notes: [
          {
            id: 'n-15',
            text: 'Verify recessed potlight color temperature (3000K vs 3500K) with ID.',
            author: 'Shanice (PM)',
            timestamp: '2026-08-24 10:15'
          }
        ],
        lastSyncedAt: '2026-08-26 15:45'
      }
    ]
  },
  {
    id: 'scope-2a-4',
    phaseId: '2A',
    name: 'Appliances',
    description: 'Total for all Appliances (for all units) & Delivery - excl. GST',
    budgetAmount: 36000,
    order: 4,
    isRequired: true,
    createdAt: '2026-08-11T09:00:00Z',
    trades: [
      {
        id: 't-2a-4-1',
        scopeId: 'scope-2a-4',
        contactId: 'c-104',
        contractorName: 'David Maraj',
        companyName: 'Trail Appliances',
        category: 'Appliances',
        quotedFigure: 33900,
        currency: 'CAD',
        attachedDocs: [
          {
            id: 'doc-21',
            name: 'Trail_Appliances_Builder_Package.pdf',
            url: 'https://docs.google.com/viewer?url=example.com/quotes/Trail_Appliances.pdf',
            type: 'quote',
            addedAt: '2026-08-22',
            fileSize: '1.9 MB'
          }
        ],
        actionStatus: 'PO Approved',
        poSent: true,
        isAwarded: true,
        notes: [],
        lastSyncedAt: '2026-08-26 15:45'
      },
      {
        id: 't-2a-4-2',
        scopeId: 'scope-2a-4',
        contactId: 'c-105',
        contractorName: 'Gary Gill',
        companyName: 'Canadian Appliances',
        category: 'Appliances',
        quotedFigure: 35500,
        currency: 'CAD',
        attachedDocs: [],
        actionStatus: 'Waiting on Response',
        poSent: false,
        notes: [],
        lastSyncedAt: '2026-08-26 15:45'
      }
    ]
  },
  {
    id: 'scope-2a-5',
    phaseId: '2A',
    name: 'Interior Railings',
    description: 'Total for interior railings as per spec - excl. GST',
    budgetAmount: 16000,
    order: 5,
    isRequired: true,
    createdAt: '2026-08-12T09:00:00Z',
    trades: [
      {
        id: 't-2a-5-1',
        scopeId: 'scope-2a-5',
        contactId: 'c-116',
        contractorName: 'Daniel Owusu',
        companyName: 'Jaydan Carpentry',
        category: 'Interior Railings',
        quotedFigure: 14800,
        currency: 'CAD',
        attachedDocs: [],
        actionStatus: 'Confirm with PM',
        poSent: false,
        notes: [],
        lastSyncedAt: '2026-08-26 15:45'
      },
      {
        id: 't-2a-5-2',
        scopeId: 'scope-2a-5',
        contactId: 'c-50',
        contractorName: 'Jeff McDonald',
        companyName: 'Artistic Stairs & Railings',
        category: 'Interior Stairs',
        quotedFigure: 16500,
        currency: 'CAD',
        attachedDocs: [],
        actionStatus: 'Follow-up Pending',
        poSent: false,
        notes: [],
        lastSyncedAt: '2026-08-26 15:45'
      }
    ]
  },
  {
    id: 'scope-2a-6',
    phaseId: '2A',
    name: 'Tile and Flooring Material',
    description: 'Total for all tile material as per specs & Total for all flooring material (including lvp, hardwood, carpet) - excl. GST',
    budgetAmount: 52000,
    order: 6,
    isRequired: true,
    createdAt: '2026-08-12T09:00:00Z',
    trades: [
      {
        id: 't-2a-6-1',
        scopeId: 'scope-2a-6',
        contactId: 'c-128',
        contractorName: 'Moe Uran',
        companyName: 'Home Flooring Design Centre',
        category: 'Flooring & Tile Suppliers',
        quotedFigure: 49500,
        currency: 'CAD',
        attachedDocs: [
          {
            id: 'doc-22',
            name: 'HomeFlooring_SpecSheet_Final.pdf',
            url: 'https://docs.google.com/viewer?url=example.com/specs/HomeFlooring.pdf',
            type: 'spec',
            addedAt: '2026-08-23',
            fileSize: '3.9 MB'
          }
        ],
        actionStatus: 'PO Approved',
        poSent: true,
        isAwarded: true,
        notes: [],
        lastSyncedAt: '2026-08-26 15:45'
      },
      {
        id: 't-2a-6-2',
        scopeId: 'scope-2a-6',
        contactId: 'c-129',
        contractorName: 'Nhat Dinh',
        companyName: 'Uptrend Floors',
        category: 'Flooring & Tile Suppliers',
        quotedFigure: 51200,
        currency: 'CAD',
        attachedDocs: [],
        actionStatus: 'Waiting on Response',
        poSent: false,
        notes: [],
        lastSyncedAt: '2026-08-26 15:45'
      }
    ]
  },

  // ===================== PHASE 2B (Interior B) =====================
  {
    id: 'scope-2b-1',
    phaseId: '2B',
    name: 'Finishing Materials',
    description: 'Full Finishing Material Package (Interior doors, baseboards, mouldings, casings) & Full Lockout Package (Knobs/levers, deadbolts, stops, bath hardware) - excl. GST',
    budgetAmount: 42000,
    order: 1,
    isRequired: true,
    createdAt: '2026-08-13T09:00:00Z',
    trades: [
      {
        id: 't-2b-1-1',
        scopeId: 'scope-2b-1',
        contactId: 'c-106',
        contractorName: 'Laurence Hansen',
        companyName: 'Windsor Plywood',
        category: 'Finishing Material Suppliers',
        quotedFigure: 39800,
        currency: 'CAD',
        attachedDocs: [
          {
            id: 'doc-23',
            name: 'WindsorPlywood_Trim_Mouldings_Takeoff.pdf',
            url: 'https://docs.google.com/viewer?url=example.com/quotes/Windsor_Trim.pdf',
            type: 'quote',
            addedAt: '2026-08-24',
            fileSize: '2.8 MB'
          }
        ],
        actionStatus: 'PO Approved',
        poSent: true,
        isAwarded: true,
        notes: [],
        lastSyncedAt: '2026-08-26 15:45'
      },
      {
        id: 't-2b-1-2',
        scopeId: 'scope-2b-1',
        contactId: 'c-107',
        contractorName: 'Gurjit Mahi',
        companyName: 'The Moulding Store',
        category: 'Finishing Material Suppliers',
        quotedFigure: 41500,
        currency: 'CAD',
        attachedDocs: [],
        actionStatus: 'Follow-up Pending',
        poSent: false,
        notes: [],
        lastSyncedAt: '2026-08-26 15:45'
      }
    ]
  },
  {
    id: 'scope-2b-2',
    phaseId: '2B',
    name: 'Tile Labour',
    description: 'Full Tile installation (excl. GST)',
    budgetAmount: 26000,
    order: 2,
    isRequired: true,
    createdAt: '2026-08-13T09:00:00Z',
    trades: [
      {
        id: 't-2b-2-1',
        scopeId: 'scope-2b-2',
        contactId: 'c-134',
        contractorName: 'Chris Yeung',
        companyName: 'Chris Tile',
        category: 'Tile Install',
        quotedFigure: 24500,
        currency: 'CAD',
        attachedDocs: [],
        actionStatus: 'Confirm with PM',
        poSent: false,
        notes: [
          {
            id: 'n-16',
            text: 'Includes Schluter waterproof shower pan installation.',
            author: 'Lead Estimator',
            timestamp: '2026-08-24 16:00'
          }
        ],
        lastSyncedAt: '2026-08-26 15:45'
      },
      {
        id: 't-2b-2-2',
        scopeId: 'scope-2b-2',
        contactId: 'c-135',
        contractorName: 'Sam Deng',
        companyName: 'SD Tile',
        category: 'Tile Install',
        quotedFigure: 25800,
        currency: 'CAD',
        attachedDocs: [],
        actionStatus: 'Waiting on Response',
        poSent: false,
        notes: [],
        lastSyncedAt: '2026-08-26 15:45'
      }
    ]
  },
  {
    id: 'scope-2b-3',
    phaseId: '2B',
    name: 'Flooring Labour',
    description: 'Full Flooring installation & Supply and install Stair Nosings (excl. GST)',
    budgetAmount: 28000,
    order: 3,
    isRequired: true,
    createdAt: '2026-08-14T09:00:00Z',
    trades: [
      {
        id: 't-2b-3-1',
        scopeId: 'scope-2b-3',
        contactId: 'c-131',
        contractorName: 'Kevin',
        companyName: 'Superior Hardwood and Flooring',
        category: 'Flooring Install',
        quotedFigure: 26800,
        currency: 'CAD',
        attachedDocs: [],
        actionStatus: 'PO Approved',
        poSent: true,
        isAwarded: true,
        notes: [],
        lastSyncedAt: '2026-08-26 15:45'
      },
      {
        id: 't-2b-3-2',
        scopeId: 'scope-2b-3',
        contactId: 'c-133',
        contractorName: 'Mike Mesuit',
        companyName: 'Buta-Construction',
        category: 'Flooring Install',
        quotedFigure: 28500,
        currency: 'CAD',
        attachedDocs: [],
        actionStatus: 'Estimate Requested',
        poSent: false,
        notes: [],
        lastSyncedAt: '2026-08-26 15:45'
      }
    ]
  },
  {
    id: 'scope-2b-4',
    phaseId: '2B',
    name: 'Interior Glass and Mirrors',
    description: 'Total for all Interior Glass (supply and install), Total for all Mirrors, Total for all Wire Shelving (excl. GST)',
    budgetAmount: 18000,
    order: 4,
    isRequired: true,
    createdAt: '2026-08-14T09:00:00Z',
    trades: [
      {
        id: 't-2b-4-1',
        scopeId: 'scope-2b-4',
        contactId: 'c-119',
        contractorName: 'Daljit Dhillon',
        companyName: 'Delicate Glass',
        category: 'Mirrors / Glass / Wire Shelving',
        quotedFigure: 16900,
        currency: 'CAD',
        attachedDocs: [
          {
            id: 'doc-24',
            name: 'DelicateGlass_Frameless_Showers_Quote.pdf',
            url: 'https://docs.google.com/viewer?url=example.com/quotes/Delicate_Glass.pdf',
            type: 'quote',
            addedAt: '2026-08-24',
            fileSize: '1.5 MB'
          }
        ],
        actionStatus: 'Confirm w/ ID',
        poSent: false,
        notes: [
          {
            id: 'n-17',
            text: 'Frameless 10mm glass shower enclosures with matte black hardware.',
            author: 'Shanice (PM)',
            timestamp: '2026-08-25 11:45'
          }
        ],
        lastSyncedAt: '2026-08-26 15:45'
      }
    ]
  },
  {
    id: 'scope-2b-5',
    phaseId: '2B',
    name: 'Window Coverings',
    description: 'Total for all Window Coverings (excl. GST)',
    budgetAmount: 14000,
    order: 5,
    isRequired: true,
    createdAt: '2026-08-15T09:00:00Z',
    trades: [
      {
        id: 't-2b-5-1',
        scopeId: 'scope-2b-5',
        contactId: 'c-108',
        contractorName: 'May Tan',
        companyName: 'Creative Windows',
        category: 'Window Coverings',
        quotedFigure: 12800,
        currency: 'CAD',
        attachedDocs: [],
        actionStatus: 'Request Revised Estimate',
        poSent: false,
        notes: [
          {
            id: 'n-18',
            text: 'Requested motorized roller shade alternative for master bedroom.',
            author: 'Shanice (PM)',
            timestamp: '2026-08-25 14:20'
          }
        ],
        lastSyncedAt: '2026-08-26 15:45'
      }
    ]
  },

  // ===================== PHASE 3 (Exterior and Garage) =====================
  {
    id: 'scope-3-1',
    phaseId: '3',
    name: 'Exterior Flatwork (Sidewalk, Aprons, etc.)',
    description: 'Total for all concrete driveways, aprons, curbs, sidewalks, walkways, patios, stoops, landings, and utility equipment pads as per plans (excl. GST)',
    budgetAmount: 48000,
    order: 1,
    isRequired: true,
    createdAt: '2026-08-16T09:00:00Z',
    trades: [
      {
        id: 't-3-1-1',
        scopeId: 'scope-3-1',
        contactId: 'c-27',
        contractorName: 'Bali Khangura',
        companyName: 'Edge Gravel & Concrete Ltd.',
        category: 'Flatwork / Waterproofing',
        quotedFigure: 45000,
        currency: 'CAD',
        attachedDocs: [
          {
            id: 'doc-25',
            name: 'EdgeGravel_Exterior_Flatwork_Tender.pdf',
            url: 'https://docs.google.com/viewer?url=example.com/quotes/EdgeGravel_Flatwork.pdf',
            type: 'quote',
            addedAt: '2026-08-23',
            fileSize: '2.1 MB'
          }
        ],
        actionStatus: 'Confirm with PM',
        poSent: false,
        notes: [],
        lastSyncedAt: '2026-08-26 15:45'
      },
      {
        id: 't-3-1-2',
        scopeId: 'scope-3-1',
        contactId: 'c-30',
        contractorName: 'Sam Cortese',
        companyName: "Johnny's Concrete (Johnvince Holdings)",
        category: 'Flatwork / Waterproofing',
        quotedFigure: 47500,
        currency: 'CAD',
        attachedDocs: [],
        actionStatus: 'Waiting on Response',
        poSent: false,
        notes: [],
        lastSyncedAt: '2026-08-26 15:45'
      }
    ]
  },
  {
    id: 'scope-3-2',
    phaseId: '3',
    name: 'Garage Overhead Door (OHD)',
    description: 'Total for Garage Overhead Door (OHD) - supply and install (excl. GST)',
    budgetAmount: 12000,
    order: 2,
    isRequired: true,
    createdAt: '2026-08-16T09:00:00Z',
    trades: [
      {
        id: 't-3-2-1',
        scopeId: 'scope-3-2',
        contactId: 'c-136',
        contractorName: 'Dave Melsom',
        companyName: 'DC Doors (OHD)',
        category: 'Garage OHD & Exterior Doors',
        quotedFigure: 10800,
        currency: 'CAD',
        attachedDocs: [
          {
            id: 'doc-26',
            name: 'DC_Doors_Insulated_OHD_Spec.pdf',
            url: 'https://docs.google.com/viewer?url=example.com/specs/DCDoors.pdf',
            type: 'spec',
            addedAt: '2026-08-24',
            fileSize: '1.2 MB'
          }
        ],
        actionStatus: 'PO Approved',
        poSent: true,
        isAwarded: true,
        notes: [],
        lastSyncedAt: '2026-08-26 15:45'
      },
      {
        id: 't-3-2-2',
        scopeId: 'scope-3-2',
        contactId: 'c-137',
        contractorName: 'Dan Walkeden',
        companyName: 'Equal Doors',
        category: 'Garage OHD & Exterior Doors',
        quotedFigure: 11900,
        currency: 'CAD',
        attachedDocs: [],
        actionStatus: 'Revision Submitted',
        poSent: false,
        notes: [],
        lastSyncedAt: '2026-08-26 15:45'
      }
    ]
  },
  {
    id: 'scope-3-3',
    phaseId: '3',
    name: 'Garage Exterior Door',
    description: 'Total for all Garage Entry Exterior Doors (excl. GST)',
    budgetAmount: 4500,
    order: 3,
    isRequired: true,
    createdAt: '2026-08-17T09:00:00Z',
    trades: [
      {
        id: 't-3-3-1',
        scopeId: 'scope-3-3',
        contactId: 'c-138',
        contractorName: 'James Ironhall',
        companyName: 'Metro Glass Products Ltd.',
        category: 'Garage OHD & Exterior Doors',
        quotedFigure: 4100,
        currency: 'CAD',
        attachedDocs: [],
        actionStatus: 'Confirm with PM',
        poSent: false,
        notes: [],
        lastSyncedAt: '2026-08-26 15:45'
      }
    ]
  },
  {
    id: 'scope-3-4',
    phaseId: '3',
    name: 'Exterior Stairs',
    description: 'Total for Exterior Stairs (supply and install) - excl. GST',
    budgetAmount: 11000,
    order: 4,
    isRequired: true,
    createdAt: '2026-08-17T09:00:00Z',
    trades: [
      {
        id: 't-3-4-1',
        scopeId: 'scope-3-4',
        contactId: 'c-50',
        contractorName: 'Jeff McDonald',
        companyName: 'Artistic Stairs & Railings',
        category: 'Interior Stairs',
        quotedFigure: 10200,
        currency: 'CAD',
        attachedDocs: [],
        actionStatus: 'PO Approved',
        poSent: true,
        isAwarded: true,
        notes: [],
        lastSyncedAt: '2026-08-26 15:45'
      }
    ]
  },
  {
    id: 'scope-3-5',
    phaseId: '3',
    name: 'Exterior Railings',
    description: 'Total for Exterior Railings (supply and install) - excl. GST',
    budgetAmount: 15000,
    order: 5,
    isRequired: true,
    createdAt: '2026-08-18T09:00:00Z',
    trades: [
      {
        id: 't-3-5-1',
        scopeId: 'scope-3-5',
        contactId: 'c-68',
        contractorName: 'Ruby Foster',
        companyName: "Mclean's Contracting",
        category: 'Exterior Railing',
        quotedFigure: 13900,
        currency: 'CAD',
        attachedDocs: [
          {
            id: 'doc-27',
            name: 'Mcleans_Powdercoated_Aluminum_Railings.pdf',
            url: 'https://docs.google.com/viewer?url=example.com/specs/Mcleans_Railings.pdf',
            type: 'spec',
            addedAt: '2026-08-24',
            fileSize: '1.4 MB'
          }
        ],
        actionStatus: 'Confirm w/ ID',
        poSent: false,
        notes: [],
        lastSyncedAt: '2026-08-26 15:45'
      },
      {
        id: 't-3-5-2',
        scopeId: 'scope-3-5',
        contactId: 'c-69',
        contractorName: 'Travis Hanna',
        companyName: 'Mclean Contracting',
        category: 'Exterior Railing',
        quotedFigure: 14700,
        currency: 'CAD',
        attachedDocs: [],
        actionStatus: 'Waiting on Response',
        poSent: false,
        notes: [],
        lastSyncedAt: '2026-08-26 15:45'
      }
    ]
  },
  {
    id: 'scope-3-6',
    phaseId: '3',
    name: 'Landscaping & Fencing',
    description: 'Total for Trees, Decorative Rock, Sod, Fencing, and Irrigation System (Supply and Install) - excl. GST',
    budgetAmount: 35000,
    order: 6,
    isRequired: true,
    createdAt: '2026-08-18T09:00:00Z',
    trades: [
      {
        id: 't-3-6-1',
        scopeId: 'scope-3-6',
        contactId: 'c-74',
        contractorName: 'Jay Danylenko',
        companyName: 'Solid Roots',
        category: 'Landscaping / Fencing',
        quotedFigure: 33200,
        currency: 'CAD',
        attachedDocs: [
          {
            id: 'doc-28',
            name: 'SolidRoots_Landscaping_Irrigation_Plan.pdf',
            url: 'https://docs.google.com/viewer?url=example.com/quotes/SolidRoots.pdf',
            type: 'quote',
            addedAt: '2026-08-25',
            fileSize: '3.6 MB'
          }
        ],
        actionStatus: 'PO Approved',
        poSent: false,
        isAwarded: true,
        notes: [
          {
            id: 'n-19',
            text: 'Includes automatic 4-zone timer drip irrigation system.',
            author: 'Shanice (PM)',
            timestamp: '2026-08-25 15:30'
          }
        ],
        lastSyncedAt: '2026-08-26 15:45'
      },
      {
        id: 't-3-6-2',
        scopeId: 'scope-3-6',
        contactId: 'c-75',
        contractorName: 'Maciek Opalka',
        companyName: 'MaisonScapes',
        category: 'Landscaping / Fencing',
        quotedFigure: 36400,
        currency: 'CAD',
        attachedDocs: [],
        actionStatus: 'Waiting on Response',
        poSent: false,
        notes: [],
        lastSyncedAt: '2026-08-26 15:45'
      }
    ]
  }
];

// Ensure every initial scope section displays its exact trade cost code
INITIAL_SCOPES.forEach((scope) => {
  if (!scope.costCode || scope.costCode === '20020' && !scope.name.toLowerCase().includes('demolition')) {
    scope.costCode = getAccurateScopeCostCode(scope.name) || scope.costCode;
  }
});

export const ACTION_STATUS_OPTIONS: ActionItemStatus[] = [
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
