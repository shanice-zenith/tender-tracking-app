import React, { useState, useMemo, useEffect } from 'react';
import { 
  X, 
  AlertCircle, 
  CheckCircle2, 
  Trash2, 
  FileSpreadsheet, 
  Layers, 
  FolderPlus, 
  DollarSign, 
  Filter, 
  HelpCircle,
  ArrowRight,
  Info
} from 'lucide-react';
import { 
  ImportType, 
  ProjectImportRow, 
  ScopePackageImportRow, 
  PhaseQuoteImportRow,
  bulkImportExportService 
} from '../services/bulkImportExportService';
import { Project, PhaseId, ActionItemStatus } from '../types';
import { formatCurrency } from '../utils/formatters';

interface ImportValidationDrawerProps {
  isOpen: boolean;
  type: ImportType;
  rawRows: (ProjectImportRow | ScopePackageImportRow | PhaseQuoteImportRow)[];
  activeProject?: Project | null;
  activePhase?: PhaseId;
  targetPhase?: PhaseId;
  onClose: () => void;
  onFinalizeProjects: (rows: ProjectImportRow[]) => void;
  onFinalizeScopes: (rows: ScopePackageImportRow[]) => void;
  onFinalizeQuotes: (rows: PhaseQuoteImportRow[]) => void;
}

const ACTION_STATUS_OPTIONS: ActionItemStatus[] = [
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

const PHASE_OPTIONS: PhaseId[] = ['1A', '1B', '2A', '2B', '3'];

export const ImportValidationDrawer: React.FC<ImportValidationDrawerProps> = ({
  isOpen,
  type,
  rawRows,
  activeProject,
  activePhase = '1A',
  targetPhase,
  onClose,
  onFinalizeProjects,
  onFinalizeScopes,
  onFinalizeQuotes
}) => {
  const [rows, setRows] = useState<(ProjectImportRow | ScopePackageImportRow | PhaseQuoteImportRow)[]>([]);
  const [filterMode, setFilterMode] = useState<'all' | 'errors'>('all');

  const effectivePhase = targetPhase || activePhase || '1A';

  // List of active scope names for Phase Quote matching
  const availableScopeNames = useMemo(() => {
    if (!activeProject) return [];
    return activeProject.scopes
      .filter((s) => !effectivePhase || s.phaseId === effectivePhase)
      .map((s) => s.name);
  }, [activeProject, effectivePhase]);

  // Sync internal state with incoming raw rows
  useEffect(() => {
    if (isOpen && rawRows) {
      // Re-validate to ensure latest context
      const validated = rawRows.map((r) => {
        const cloned = { ...r };
        if (type === 'projects') {
          bulkImportExportService.validateProjectRow(cloned as ProjectImportRow);
        } else if (type === 'scopes') {
          bulkImportExportService.validateScopePackageRow(cloned as ScopePackageImportRow);
        } else if (type === 'quotes') {
          bulkImportExportService.validatePhaseQuoteRow(cloned as PhaseQuoteImportRow, availableScopeNames);
        }
        return cloned;
      });
      setRows(validated);
      setFilterMode('all');
    }
  }, [isOpen, rawRows, type, availableScopeNames]);

  // Derived metrics
  const totalCount = rows.length;
  const errorCount = useMemo(() => {
    return rows.filter((r) => Object.keys(r.errors).length > 0).length;
  }, [rows]);
  const validCount = totalCount - errorCount;

  // Filtered rows for the table
  const displayedRows = useMemo(() => {
    if (filterMode === 'errors') {
      return rows.filter((r) => Object.keys(r.errors).length > 0);
    }
    return rows;
  }, [rows, filterMode]);

  if (!isOpen) return null;

  // Handlers for cell editing
  const handleUpdateProjectCell = (id: string, field: keyof ProjectImportRow, value: string) => {
    setRows((prev) =>
      prev.map((r) => {
        if (r.id !== id) return r;
        const updated = { ...r, [field]: value } as ProjectImportRow;
        bulkImportExportService.validateProjectRow(updated);
        return updated;
      })
    );
  };

  const handleUpdateScopeCell = (id: string, field: keyof ScopePackageImportRow, value: string) => {
    setRows((prev) =>
      prev.map((r) => {
        if (r.id !== id) return r;
        const updated = { ...r, [field]: value } as ScopePackageImportRow;
        bulkImportExportService.validateScopePackageRow(updated);
        return updated;
      })
    );
  };

  const handleUpdateQuoteCell = (id: string, field: keyof PhaseQuoteImportRow, value: string) => {
    setRows((prev) =>
      prev.map((r) => {
        if (r.id !== id) return r;
        const updated = { ...r, [field]: value } as PhaseQuoteImportRow;
        bulkImportExportService.validatePhaseQuoteRow(updated, availableScopeNames);
        return updated;
      })
    );
  };

  const handleDeleteRow = (id: string) => {
    setRows((prev) => prev.filter((r) => r.id !== id));
  };

  const handleFinalize = () => {
    // Only import rows that have zero validation errors
    const validRows = rows.filter((r) => Object.keys(r.errors).length === 0);
    if (validRows.length === 0) return;

    if (type === 'projects') {
      onFinalizeProjects(validRows as ProjectImportRow[]);
    } else if (type === 'scopes') {
      onFinalizeScopes(validRows as ScopePackageImportRow[]);
    } else if (type === 'quotes') {
      onFinalizeQuotes(validRows as PhaseQuoteImportRow[]);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-950/60 backdrop-blur-xs flex justify-end animate-in fade-in duration-200">
      <div 
        className="w-full max-w-6xl bg-white h-full shadow-2xl flex flex-col border-l border-slate-200 animate-in slide-in-from-right duration-300"
        role="dialog"
        aria-modal="true"
      >
        {/* Drawer Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-600/30 text-blue-400 rounded-xl border border-blue-500/30">
              {type === 'projects' && <FolderPlus className="w-5 h-5" />}
              {type === 'scopes' && <Layers className="w-5 h-5" />}
              {type === 'quotes' && <DollarSign className="w-5 h-5" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white tracking-tight">
                  Import Preview & Validation
                </h2>
                <span className="px-2 py-0.5 text-[10px] uppercase font-mono font-bold bg-slate-800 text-blue-300 border border-slate-700 rounded-md">
                  {type === 'projects' && 'Projects Setup'}
                  {type === 'scopes' && 'Scope Packages'}
                  {type === 'quotes' && `Phase ${activePhase} Quotes`}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {type === 'projects' && 'Verify baseline phase budgets and project names before bulk workspace creation.'}
                {type === 'scopes' && `Auto-generating scope cards and itemized line items across 5 phases for ${activeProject?.name || 'Project'}.`}
                {type === 'quotes' && `Matching contractor quote figures to active scopes in Phase ${activePhase}.`}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
            title="Close Drawer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Validation Status & Filter Bar */}
        <div className="px-6 py-3 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
          {/* Metrics Overview */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 px-3 py-1 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-700">
              <FileSpreadsheet className="w-4 h-4 text-slate-400" />
              <span>{totalCount} Total Rows</span>
            </div>

            <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-50 border border-emerald-200 rounded-lg text-xs font-semibold text-emerald-800">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>{validCount} Valid</span>
            </div>

            {errorCount > 0 ? (
              <div className="flex items-center gap-1.5 px-3 py-1 bg-rose-50 border border-rose-200 rounded-lg text-xs font-semibold text-rose-800 animate-pulse">
                <AlertCircle className="w-4 h-4 text-rose-600" />
                <span>{errorCount} With Issues</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-50 border border-emerald-200 rounded-lg text-xs font-semibold text-emerald-700">
                <span>All Rows Ready to Import</span>
              </div>
            )}
          </div>

          {/* Filter Tabs & Guidance */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 font-medium hidden sm:inline">Filter:</span>
            <button
              type="button"
              onClick={() => setFilterMode('all')}
              className={`px-3 py-1 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                filterMode === 'all'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              All Rows ({totalCount})
            </button>
            <button
              type="button"
              onClick={() => setFilterMode('errors')}
              disabled={errorCount === 0}
              className={`px-3 py-1 text-xs font-bold rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
                filterMode === 'errors'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : errorCount > 0
                  ? 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200'
                  : 'bg-slate-100 text-slate-400 cursor-not-allowed border border-transparent'
              }`}
            >
              <AlertCircle className="w-3.5 h-3.5" />
              <span>Issues Only ({errorCount})</span>
            </button>
          </div>
        </div>

        {/* Guidance Alert */}
        <div className="px-6 py-2.5 bg-amber-50/70 border-b border-amber-200/80 text-amber-900 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              <strong>Inline Validation Active:</strong> Fields outlined in red have missing required values or format issues. You can edit cells directly in the table below to correct them before importing.
            </span>
          </div>
          {type === 'quotes' && (
            <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200 shrink-0">
              ⚡ Itemized Line Items Auto-Summed into Quoted Figure (Live)
            </span>
          )}
        </div>

        {/* Data Grid Content Area */}
        <div className="flex-1 overflow-auto p-6 bg-slate-50/50">
          {displayedRows.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center text-center p-8 bg-white rounded-2xl border border-slate-200 shadow-xs">
              <CheckCircle2 className="w-12 h-12 text-emerald-500 mb-2" />
              <h3 className="text-sm font-bold text-slate-800">No issues found in this filter view</h3>
              <p className="text-xs text-slate-500 mt-1">
                {filterMode === 'errors' ? 'All remaining rows are validated and ready to import.' : 'No rows were found in the uploaded file.'}
              </p>
              {filterMode === 'errors' && (
                <button
                  type="button"
                  onClick={() => setFilterMode('all')}
                  className="mt-3 text-xs font-bold text-blue-600 hover:text-blue-700 underline"
                >
                  Return to All Rows
                </button>
              )}
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-700 border-collapse">
                  <thead className="bg-slate-100/90 text-slate-800 font-extrabold uppercase tracking-wider text-[10px] border-b border-slate-200 select-none">
                    <tr>
                      <th className="py-3 px-3 w-10 text-center">#</th>
                      <th className="py-3 px-2 w-10 text-center">Status</th>

                      {/* 1. Projects Columns */}
                      {type === 'projects' && (
                        <>
                          <th className="py-3 px-3 min-w-[200px]">Project Name *</th>
                          <th className="py-3 px-3 min-w-[120px]">Project Code</th>
                          <th className="py-3 px-3 min-w-[160px]">Location</th>
                          <th className="py-3 px-3 min-w-[110px]">Phase 1A ($)</th>
                          <th className="py-3 px-3 min-w-[110px]">Phase 1B ($)</th>
                          <th className="py-3 px-3 min-w-[110px]">Phase 2A ($)</th>
                          <th className="py-3 px-3 min-w-[110px]">Phase 2B ($)</th>
                          <th className="py-3 px-3 min-w-[110px]">Phase 3 ($)</th>
                        </>
                      )}

                      {/* 2. Scope Packages Columns */}
                      {type === 'scopes' && (
                        <>
                          <th className="py-3 px-3 min-w-[90px]">Phase *</th>
                          <th className="py-3 px-3 min-w-[220px]">Scope Name *</th>
                          <th className="py-3 px-3 min-w-[110px]">Cost Code</th>
                          <th className="py-3 px-3 min-w-[240px]">Line Item Description</th>
                          <th className="py-3 px-3 min-w-[120px]">Target Budget ($)</th>
                        </>
                      )}

                      {/* 3. Phase Quotes Columns */}
                      {type === 'quotes' && (
                        <>
                          <th className="py-3 px-3 min-w-[190px]">Scope Name *</th>
                          <th className="py-3 px-2 min-w-[90px]">Cost Code</th>
                          <th className="py-3 px-3 min-w-[240px]">Tender Form Line Item Description</th>
                          <th className="py-3 px-3 min-w-[150px]">Contractor Name</th>
                          <th className="py-3 px-3 min-w-[160px]">Company Name *</th>
                          <th className="py-3 px-3 min-w-[160px]">Contact Email</th>
                          <th className="py-3 px-3 min-w-[130px] text-right">Line Item ($) *</th>
                          <th className="py-3 px-2 min-w-[120px]">Inclusion Status</th>
                          <th className="py-3 px-3 min-w-[150px]">Action Status</th>
                          <th className="py-3 px-3 min-w-[160px]">Vendor Scope Notes</th>
                          <th className="py-3 px-3 min-w-[160px]">Formal Quote Link</th>
                        </>
                      )}

                      <th className="py-3 px-3 w-12 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {displayedRows.map((r, idx) => {
                      const hasErrors = Object.keys(r.errors).length > 0;

                      return (
                        <tr 
                          key={r.id}
                          className={`transition-colors ${hasErrors ? 'bg-rose-50/30 hover:bg-rose-50/50' : 'hover:bg-slate-50/80'}`}
                        >
                          <td className="py-3 px-3 text-center text-[11px] font-mono text-slate-400">
                            {idx + 1}
                          </td>
                          <td className="py-3 px-2 text-center">
                            {hasErrors ? (
                              <div title={Object.values(r.errors).join(', ')}>
                                <AlertCircle className="w-4 h-4 text-rose-600 mx-auto" />
                              </div>
                            ) : (
                              <CheckCircle2 className="w-4 h-4 text-emerald-600 mx-auto" />
                            )}
                          </td>

                          {/* ================= PROJECT FIELDS ================= */}
                          {type === 'projects' && (() => {
                            const prj = r as ProjectImportRow;
                            return (
                              <>
                                <td className="py-2.5 px-3">
                                  <input
                                    type="text"
                                    value={prj.projectName}
                                    onChange={(e) => handleUpdateProjectCell(prj.id, 'projectName', e.target.value)}
                                    placeholder="Enter project name..."
                                    className={`w-full px-2.5 py-1.5 text-xs font-semibold rounded-lg border transition-all ${
                                      prj.errors.projectName
                                        ? 'border-rose-500 bg-rose-50 text-rose-950 focus:ring-2 focus:ring-rose-500'
                                        : 'border-slate-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500'
                                    }`}
                                  />
                                  {prj.errors.projectName && (
                                    <span className="text-[10px] text-rose-600 font-semibold mt-0.5 block">
                                      {prj.errors.projectName}
                                    </span>
                                  )}
                                </td>

                                <td className="py-2.5 px-3">
                                  <input
                                    type="text"
                                    value={prj.projectCode}
                                    onChange={(e) => handleUpdateProjectCell(prj.id, 'projectCode', e.target.value)}
                                    placeholder="e.g. PRJ-001"
                                    className="w-full px-2 py-1.5 text-xs rounded-lg border border-slate-300 font-mono focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                  />
                                </td>

                                <td className="py-2.5 px-3">
                                  <input
                                    type="text"
                                    value={prj.location}
                                    onChange={(e) => handleUpdateProjectCell(prj.id, 'location', e.target.value)}
                                    placeholder="e.g. Calgary, AB"
                                    className="w-full px-2 py-1.5 text-xs rounded-lg border border-slate-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                  />
                                </td>

                                {(['phase1aBudget', 'phase1bBudget', 'phase2aBudget', 'phase2bBudget', 'phase3Budget'] as const).map((bKey) => (
                                  <td key={bKey} className="py-2.5 px-3">
                                    <div className="relative">
                                      <span className="absolute left-2 top-1.5 text-slate-400 text-xs">$</span>
                                      <input
                                        type="text"
                                        value={prj[bKey]}
                                        onChange={(e) => handleUpdateProjectCell(prj.id, bKey, e.target.value)}
                                        placeholder="0"
                                        className={`w-full pl-5 pr-2 py-1.5 text-xs text-right font-mono rounded-lg border transition-all ${
                                          prj.errors[bKey]
                                            ? 'border-rose-500 bg-rose-50 text-rose-950 focus:ring-2 focus:ring-rose-500'
                                            : 'border-slate-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500'
                                        }`}
                                      />
                                    </div>
                                    {prj.errors[bKey] && (
                                      <span className="text-[10px] text-rose-600 font-semibold mt-0.5 block">
                                        {prj.errors[bKey]}
                                      </span>
                                    )}
                                  </td>
                                ))}
                              </>
                            );
                          })()}

                          {/* ================= SCOPE PACKAGE FIELDS ================= */}
                          {type === 'scopes' && (() => {
                            const scp = r as ScopePackageImportRow;
                            return (
                              <>
                                <td className="py-2.5 px-3">
                                  <select
                                    value={scp.phaseName}
                                    onChange={(e) => handleUpdateScopeCell(scp.id, 'phaseName', e.target.value)}
                                    className={`w-full px-2 py-1.5 text-xs font-bold rounded-lg border transition-all ${
                                      scp.errors.phaseName
                                        ? 'border-rose-500 bg-rose-50 text-rose-950'
                                        : 'border-slate-300 focus:border-blue-500'
                                    }`}
                                  >
                                    {PHASE_OPTIONS.map((p) => (
                                      <option key={p} value={p}>Phase {p}</option>
                                    ))}
                                  </select>
                                  {scp.errors.phaseName && (
                                    <span className="text-[10px] text-rose-600 font-semibold mt-0.5 block">
                                      {scp.errors.phaseName}
                                    </span>
                                  )}
                                </td>

                                <td className="py-2.5 px-3">
                                  <input
                                    type="text"
                                    value={scp.scopeName}
                                    onChange={(e) => handleUpdateScopeCell(scp.id, 'scopeName', e.target.value)}
                                    placeholder="Scope Package Name..."
                                    className={`w-full px-2.5 py-1.5 text-xs font-semibold rounded-lg border transition-all ${
                                      scp.errors.scopeName
                                        ? 'border-rose-500 bg-rose-50 text-rose-950 focus:ring-2 focus:ring-rose-500'
                                        : 'border-slate-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500'
                                    }`}
                                  />
                                  {scp.errors.scopeName && (
                                    <span className="text-[10px] text-rose-600 font-semibold mt-0.5 block">
                                      {scp.errors.scopeName}
                                    </span>
                                  )}
                                </td>

                                <td className="py-2.5 px-3">
                                  <input
                                    type="text"
                                    value={scp.costCode}
                                    onChange={(e) => handleUpdateScopeCell(scp.id, 'costCode', e.target.value)}
                                    placeholder="e.g. 20020"
                                    className="w-full px-2 py-1.5 text-xs rounded-lg border border-slate-300 font-mono focus:border-blue-500"
                                  />
                                </td>

                                <td className="py-2.5 px-3">
                                  <input
                                    type="text"
                                    value={scp.lineItemDescription}
                                    onChange={(e) => handleUpdateScopeCell(scp.id, 'lineItemDescription', e.target.value)}
                                    placeholder="Detailed line item spec..."
                                    className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 focus:border-blue-500"
                                  />
                                </td>

                                <td className="py-2.5 px-3">
                                  <div className="relative">
                                    <span className="absolute left-2 top-1.5 text-slate-400 text-xs">$</span>
                                    <input
                                      type="text"
                                      value={scp.targetBudget}
                                      onChange={(e) => handleUpdateScopeCell(scp.id, 'targetBudget', e.target.value)}
                                      placeholder="0"
                                      className={`w-full pl-5 pr-2 py-1.5 text-xs text-right font-mono rounded-lg border transition-all ${
                                        scp.errors.targetBudget
                                          ? 'border-rose-500 bg-rose-50 text-rose-950 focus:ring-2 focus:ring-rose-500'
                                          : 'border-slate-300 focus:border-blue-500'
                                      }`}
                                    />
                                  </div>
                                  {scp.errors.targetBudget && (
                                    <span className="text-[10px] text-rose-600 font-semibold mt-0.5 block">
                                      {scp.errors.targetBudget}
                                    </span>
                                  )}
                                </td>
                              </>
                            );
                          })()}

                          {/* ================= PHASE QUOTES FIELDS ================= */}
                          {type === 'quotes' && (() => {
                            const qte = r as PhaseQuoteImportRow;
                            return (
                              <>
                                <td className="py-2.5 px-3">
                                  <div className="relative">
                                    {availableScopeNames.length > 0 ? (
                                      <select
                                        value={qte.scopeName}
                                        onChange={(e) => handleUpdateQuoteCell(qte.id, 'scopeName', e.target.value)}
                                        className={`w-full px-2 py-1.5 text-xs font-semibold rounded-lg border transition-all ${
                                          qte.errors.scopeName
                                            ? 'border-rose-500 bg-rose-50 text-rose-950'
                                            : 'border-slate-300 focus:border-blue-500'
                                        }`}
                                      >
                                        <option value="">-- Select Active Scope --</option>
                                        {availableScopeNames.map((sn) => (
                                          <option key={sn} value={sn}>{sn}</option>
                                        ))}
                                      </select>
                                    ) : (
                                      <input
                                        type="text"
                                        value={qte.scopeName}
                                        onChange={(e) => handleUpdateQuoteCell(qte.id, 'scopeName', e.target.value)}
                                        placeholder="Target Scope Name..."
                                        className={`w-full px-2.5 py-1.5 text-xs font-semibold rounded-lg border transition-all ${
                                          qte.errors.scopeName
                                            ? 'border-rose-500 bg-rose-50 text-rose-950 focus:ring-2 focus:ring-rose-500'
                                            : 'border-slate-300 focus:border-blue-500'
                                        }`}
                                      />
                                    )}
                                  </div>
                                  {qte.errors.scopeName && (
                                    <span className="text-[10px] text-rose-600 font-semibold mt-0.5 block">
                                      {qte.errors.scopeName}
                                    </span>
                                  )}
                                </td>

                                <td className="py-2.5 px-2">
                                  <input
                                    type="text"
                                    value={qte.costCode || ''}
                                    onChange={(e) => handleUpdateQuoteCell(qte.id, 'costCode', e.target.value)}
                                    placeholder="20020"
                                    className="w-full px-2 py-1.5 text-xs rounded-lg border border-slate-300 font-mono text-slate-700 focus:border-blue-500"
                                  />
                                </td>

                                <td className="py-2.5 px-3">
                                  <input
                                    type="text"
                                    value={qte.lineItemDescription || ''}
                                    onChange={(e) => handleUpdateQuoteCell(qte.id, 'lineItemDescription', e.target.value)}
                                    placeholder="Tender line item description..."
                                    className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 text-slate-800 focus:border-blue-500"
                                  />
                                </td>

                                <td className="py-2.5 px-3">
                                  <input
                                    type="text"
                                    value={qte.contractorName}
                                    onChange={(e) => handleUpdateQuoteCell(qte.id, 'contractorName', e.target.value)}
                                    placeholder="Contractor Name..."
                                    className={`w-full px-2.5 py-1.5 text-xs rounded-lg border transition-all ${
                                      qte.errors.companyName
                                        ? 'border-rose-500 bg-rose-50 text-rose-950'
                                        : 'border-slate-300 focus:border-blue-500'
                                    }`}
                                  />
                                </td>

                                <td className="py-2.5 px-3">
                                  <input
                                    type="text"
                                    value={qte.companyName}
                                    onChange={(e) => handleUpdateQuoteCell(qte.id, 'companyName', e.target.value)}
                                    placeholder="Company / Vendor..."
                                    className={`w-full px-2.5 py-1.5 text-xs font-semibold rounded-lg border transition-all ${
                                      qte.errors.companyName
                                        ? 'border-rose-500 bg-rose-50 text-rose-950'
                                        : 'border-slate-300 focus:border-blue-500'
                                    }`}
                                  />
                                  {qte.errors.companyName && (
                                    <span className="text-[10px] text-rose-600 font-semibold mt-0.5 block">
                                      {qte.errors.companyName}
                                    </span>
                                  )}
                                </td>

                                <td className="py-2.5 px-3">
                                  <input
                                    type="email"
                                    value={qte.contactEmail}
                                    onChange={(e) => handleUpdateQuoteCell(qte.id, 'contactEmail', e.target.value)}
                                    placeholder="email@company.ca"
                                    className={`w-full px-2 py-1.5 text-xs rounded-lg border transition-all ${
                                      qte.errors.contactEmail
                                        ? 'border-rose-500 bg-rose-50 text-rose-950'
                                        : 'border-slate-300 focus:border-blue-500'
                                    }`}
                                  />
                                  {qte.errors.contactEmail && (
                                    <span className="text-[10px] text-rose-600 font-semibold mt-0.5 block">
                                      {qte.errors.contactEmail}
                                    </span>
                                  )}
                                </td>

                                <td className="py-2.5 px-3">
                                  <div className="relative">
                                    <span className="absolute left-2 top-1.5 text-slate-400 text-xs">$</span>
                                    <input
                                      type="text"
                                      value={qte.quotedAmount}
                                      onChange={(e) => handleUpdateQuoteCell(qte.id, 'quotedAmount', e.target.value)}
                                      placeholder="0"
                                      className={`w-full pl-5 pr-2 py-1.5 text-xs text-right font-mono font-bold rounded-lg border transition-all ${
                                        qte.errors.quotedAmount
                                          ? 'border-rose-500 bg-rose-50 text-rose-950 focus:ring-2 focus:ring-rose-500'
                                          : 'border-slate-300 focus:border-blue-500'
                                      }`}
                                    />
                                  </div>
                                  {qte.errors.quotedAmount && (
                                    <span className="text-[10px] text-rose-600 font-semibold mt-0.5 block">
                                      {qte.errors.quotedAmount}
                                    </span>
                                  )}
                                </td>

                                <td className="py-2.5 px-2">
                                  <select
                                    value={(qte.inclusionStatus || 'INCLUDED').toUpperCase()}
                                    onChange={(e) => handleUpdateQuoteCell(qte.id, 'inclusionStatus', e.target.value)}
                                    className="w-full px-2 py-1.5 text-xs rounded-lg border border-slate-300 font-semibold text-slate-700 focus:border-blue-500"
                                  >
                                    <option value="INCLUDED">INCLUDED</option>
                                    <option value="EXCLUDED">EXCLUDED</option>
                                    <option value="ALLOWANCE">ALLOWANCE</option>
                                    <option value="OPTIONAL">OPTIONAL</option>
                                  </select>
                                </td>

                                <td className="py-2.5 px-3">
                                  <select
                                    value={qte.actionStatus || 'Estimate Requested'}
                                    onChange={(e) => handleUpdateQuoteCell(qte.id, 'actionStatus', e.target.value)}
                                    className="w-full px-2 py-1.5 text-xs rounded-lg border border-slate-300 font-medium focus:border-blue-500"
                                  >
                                    {ACTION_STATUS_OPTIONS.map((st) => (
                                      <option key={st} value={st}>{st}</option>
                                    ))}
                                  </select>
                                </td>

                                <td className="py-2.5 px-3">
                                  <input
                                    type="text"
                                    value={qte.notes}
                                    onChange={(e) => handleUpdateQuoteCell(qte.id, 'notes', e.target.value)}
                                    placeholder="Vendor scope notes..."
                                    className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 focus:border-blue-500"
                                  />
                                </td>

                                <td className="py-2.5 px-3">
                                  <input
                                    type="url"
                                    value={qte.quoteLink}
                                    onChange={(e) => handleUpdateQuoteCell(qte.id, 'quoteLink', e.target.value)}
                                    placeholder="https://drive.google.com/..."
                                    className="w-full px-2 py-1.5 text-xs rounded-lg border border-slate-300 focus:border-blue-500 text-blue-600 underline"
                                  />
                                </td>
                              </>
                            );
                          })()}

                          {/* Row Delete Action */}
                          <td className="py-2.5 px-3 text-center">
                            <button
                              type="button"
                              onClick={() => handleDeleteRow(r.id)}
                              className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors cursor-pointer"
                              title="Delete Row from Import"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Drawer Footer Actions */}
        <div className="px-6 py-4 bg-white border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-xs text-slate-500">
            {errorCount > 0 ? (
              <span className="text-rose-700 font-medium">
                {errorCount} rows contain issues. You can correct them inline above or proceed with the {validCount} valid rows.
              </span>
            ) : (
              <span className="text-emerald-700 font-medium flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" />
                All {validCount} rows are verified and ready to be imported into the application.
              </span>
            )}
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="button"
              id="finalize-bulk-import-btn"
              onClick={handleFinalize}
              disabled={validCount === 0}
              className={`inline-flex items-center gap-2 px-5 py-2.5 text-xs font-bold rounded-xl shadow-md transition-all cursor-pointer ${
                validCount === 0
                  ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-500 text-white'
              }`}
            >
              <span>Finalize & Import {validCount} Valid {type === 'projects' ? 'Projects' : type === 'scopes' ? 'Scopes' : 'Quotes'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
