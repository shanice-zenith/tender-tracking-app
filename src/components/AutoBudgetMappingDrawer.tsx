import React, { useState, useMemo } from 'react';
import { 
  X, 
  CheckCircle2, 
  AlertTriangle, 
  ArrowRight, 
  Coins, 
  Layers, 
  Search, 
  ChevronDown, 
  ChevronUp, 
  HelpCircle,
  FileSpreadsheet,
  Building2,
  Tag
} from 'lucide-react';
import { BudgetMappingResult, MatchedScopeBudget } from '../services/budgetAllocationService';
import { formatCurrency } from '../utils/formatters';

interface AutoBudgetMappingDrawerProps {
  isOpen: boolean;
  mapping: BudgetMappingResult | null;
  onClose: () => void;
  onConfirm: () => void;
  isApplying?: boolean;
}

export const AutoBudgetMappingDrawer: React.FC<AutoBudgetMappingDrawerProps> = ({
  isOpen,
  mapping,
  onClose,
  onConfirm,
  isApplying = false
}) => {
  const [activeTab, setActiveTab] = useState<'all' | 'matched' | 'orphaned' | 'unmatched'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedScopeIds, setExpandedScopeIds] = useState<Set<string>>(new Set());

  // Toggle row expansion for cost code breakdown items
  const toggleExpand = (scopeId: string) => {
    setExpandedScopeIds((prev) => {
      const next = new Set(prev);
      if (next.has(scopeId)) {
        next.delete(scopeId);
      } else {
        next.add(scopeId);
      }
      return next;
    });
  };

  const expandAll = () => {
    if (!mapping) return;
    setExpandedScopeIds(new Set(mapping.matchedScopes.map((s) => s.scopeId)));
  };

  const collapseAll = () => {
    setExpandedScopeIds(new Set());
  };

  // Filtered lists based on search query
  const filteredMatchedScopes = useMemo(() => {
    if (!mapping) return [];
    if (!searchQuery.trim()) return mapping.matchedScopes;
    const q = searchQuery.toLowerCase();
    return mapping.matchedScopes.filter(
      (s) =>
        s.scopeName.toLowerCase().includes(q) ||
        s.phaseId.toLowerCase().includes(q) ||
        s.matchedCostCodes.some((code) => code.toLowerCase().includes(q)) ||
        s.matchedEntries.some((e) => e.description.toLowerCase().includes(q))
    );
  }, [mapping, searchQuery]);

  const filteredOrphanedCodes = useMemo(() => {
    if (!mapping) return [];
    if (!searchQuery.trim()) return mapping.orphanedCostCodes;
    const q = searchQuery.toLowerCase();
    return mapping.orphanedCostCodes.filter(
      (o) =>
        o.costCode.toLowerCase().includes(q) ||
        o.description.toLowerCase().includes(q)
    );
  }, [mapping, searchQuery]);

  const filteredUnmatchedScopes = useMemo(() => {
    if (!mapping) return [];
    if (!searchQuery.trim()) return mapping.unmatchedScopes;
    const q = searchQuery.toLowerCase();
    return mapping.unmatchedScopes.filter(
      (u) =>
        u.scopeName.toLowerCase().includes(q) ||
        u.phaseId.toLowerCase().includes(q) ||
        u.assignedCostCodes.some((c) => c.toLowerCase().includes(q))
    );
  }, [mapping, searchQuery]);

  if (!isOpen || !mapping) return null;

  const hasOrphaned = mapping.orphanedCostCodes.length > 0;
  const matchedCount = mapping.matchedScopes.length;
  const orphanedCount = mapping.orphanedCostCodes.length;
  const projectDelta = mapping.totalNewProjectBudget - mapping.totalOldProjectBudget;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/75 backdrop-blur-xs transition-opacity duration-200">
      {/* Drawer Container */}
      <div 
        className="w-full max-w-4xl bg-white h-full shadow-2xl flex flex-col border-l border-slate-200 animate-in slide-in-from-right duration-200"
        role="dialog"
        aria-modal="true"
        aria-labelledby="budget-mapping-title"
      >
        {/* Header */}
        <div className="px-6 py-5 bg-slate-900 border-b border-slate-800 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
              <Coins className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 id="budget-mapping-title" className="text-lg font-bold text-white tracking-tight">
                  Auto-Budget Mapping Preview
                </h2>
                <span className="px-2 py-0.5 text-[10px] uppercase font-mono font-bold bg-amber-950/70 text-amber-300 border border-amber-800/80 rounded-md">
                  Cost Code Auto-Allocation
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5 flex items-center gap-2">
                <Building2 className="w-3.5 h-3.5 text-slate-400" />
                <span>
                  <strong>{mapping.projectName}</strong> ({mapping.projectCode}) — Review mapped Target Budgets before updating project metrics.
                </span>
              </p>
            </div>
          </div>

          <button
            type="button"
            id="close-budget-mapping-drawer-btn"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
            title="Close Drawer"
            aria-label="Close Drawer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* High-Level Financial Summary Metrics Banner */}
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 shrink-0">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {/* 1. Master Budget In CSV */}
            <div className="p-3 bg-white border border-slate-200 rounded-xl shadow-2xs">
              <div className="text-[11px] font-semibold text-slate-500 flex items-center gap-1.5 uppercase tracking-wider">
                <FileSpreadsheet className="w-3.5 h-3.5 text-slate-400" />
                CSV Master Budget
              </div>
              <div className="text-lg font-extrabold text-slate-900 mt-1">
                {formatCurrency(mapping.totalCsvBudget)}
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">
                Across {mapping.matchedScopes.reduce((sum, s) => sum + s.matchedEntries.length, 0) + mapping.orphanedCostCodes.length} line items
              </div>
            </div>

            {/* 2. Successfully Matched Allocation */}
            <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl shadow-2xs">
              <div className="text-[11px] font-semibold text-emerald-800 flex items-center gap-1.5 uppercase tracking-wider">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                Matched Budgets
              </div>
              <div className="text-lg font-extrabold text-emerald-700 mt-1">
                {formatCurrency(mapping.totalMatchedBudget)}
              </div>
              <div className="text-[10px] text-emerald-700 font-medium mt-0.5">
                Mapped to {matchedCount} Scope Package{matchedCount !== 1 ? 's' : ''}
              </div>
            </div>

            {/* 3. Unmatched / Orphaned Cost Codes */}
            <div className={`p-3 rounded-xl shadow-2xs border ${hasOrphaned ? 'bg-amber-50/80 border-amber-300' : 'bg-white border-slate-200'}`}>
              <div className={`text-[11px] font-semibold flex items-center gap-1.5 uppercase tracking-wider ${hasOrphaned ? 'text-amber-900' : 'text-slate-500'}`}>
                <AlertTriangle className={`w-3.5 h-3.5 ${hasOrphaned ? 'text-amber-600' : 'text-slate-400'}`} />
                Unmatched Cost Codes
              </div>
              <div className={`text-lg font-extrabold mt-1 ${hasOrphaned ? 'text-amber-800' : 'text-slate-900'}`}>
                {formatCurrency(mapping.totalOrphanedBudget)}
              </div>
              <div className={`text-[10px] font-medium mt-0.5 ${hasOrphaned ? 'text-amber-800' : 'text-slate-400'}`}>
                {orphanedCount} orphan code{orphanedCount !== 1 ? 's' : ''} {hasOrphaned ? 'flagged' : ''}
              </div>
            </div>

            {/* 4. Overall Project Target Budget Shift */}
            <div className="p-3 bg-white border border-slate-200 rounded-xl shadow-2xs">
              <div className="text-[11px] font-semibold text-slate-500 flex items-center gap-1.5 uppercase tracking-wider">
                <Coins className="w-3.5 h-3.5 text-blue-500" />
                Project Target Budget
              </div>
              <div className="text-lg font-extrabold text-blue-900 mt-1">
                {formatCurrency(mapping.totalNewProjectBudget)}
              </div>
              <div className="text-[10px] font-semibold mt-0.5 flex items-center gap-1">
                <span className="text-slate-400 font-normal">from {formatCurrency(mapping.totalOldProjectBudget)}</span>
                <span className={projectDelta >= 0 ? 'text-emerald-600 font-bold' : 'text-rose-600 font-bold'}>
                  ({projectDelta >= 0 ? `+${formatCurrency(projectDelta)}` : `-${formatCurrency(Math.abs(projectDelta))}`})
                </span>
              </div>
            </div>
          </div>

          {/* Search and Filter Navigation Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 mt-4 pt-3 border-t border-slate-200/80">
            {/* Tabs */}
            <div className="flex items-center gap-1.5 bg-slate-200/70 p-1 rounded-xl text-xs font-semibold">
              <button
                type="button"
                onClick={() => setActiveTab('all')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  activeTab === 'all'
                    ? 'bg-white text-slate-900 shadow-xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                All Sections
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('matched')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'matched'
                    ? 'bg-white text-emerald-800 shadow-xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Matched Scopes ({matchedCount})</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('orphaned')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'orphaned'
                    ? 'bg-white text-amber-900 shadow-xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <AlertTriangle className={`w-3.5 h-3.5 ${hasOrphaned ? 'text-amber-600' : 'text-slate-400'}`} />
                <span>Unmatched Cost Codes ({orphanedCount})</span>
              </button>
              {mapping.unmatchedScopes.length > 0 && (
                <button
                  type="button"
                  onClick={() => setActiveTab('unmatched')}
                  className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer hidden sm:flex items-center gap-1.5 ${
                    activeTab === 'unmatched'
                      ? 'bg-white text-slate-800 shadow-xs font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <span>Unchanged Scopes ({mapping.unmatchedScopes.length})</span>
                </button>
              )}
            </div>

            {/* Search Input & Collapse controls */}
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search code, scope, or item..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 w-52"
                />
              </div>

              {activeTab !== 'orphaned' && matchedCount > 0 && (
                <div className="flex items-center gap-1 text-[11px] text-slate-500">
                  <button
                    type="button"
                    onClick={expandAll}
                    className="px-2 py-1 hover:bg-slate-200 rounded text-slate-700 cursor-pointer"
                  >
                    Expand All
                  </button>
                  <span>•</span>
                  <button
                    type="button"
                    onClick={collapseAll}
                    className="px-2 py-1 hover:bg-slate-200 rounded text-slate-700 cursor-pointer"
                  >
                    Collapse
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-100/60">
          {/* ========================================================================= */}
          {/* 1. MATCHED BUDGETS SECTION                                                */}
          {/* ========================================================================= */}
          {(activeTab === 'all' || activeTab === 'matched') && (
            <div className="space-y-3" id="matched-budgets-section">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                  <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider">
                    Matched Budgets ({filteredMatchedScopes.length})
                  </h3>
                  <span className="text-xs text-slate-500 font-normal">
                    — Scope Target Budgets automatically recalculated from mapped cost codes
                  </span>
                </div>
                <span className="text-xs font-bold text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-md">
                  Total: {formatCurrency(mapping.totalMatchedBudget)}
                </span>
              </div>

              {filteredMatchedScopes.length === 0 ? (
                <div className="p-8 text-center bg-white border border-slate-200 rounded-xl text-slate-500 text-xs">
                  {searchQuery ? 'No matched scopes match your search query.' : 'No active scopes matched the cost codes in the CSV.'}
                </div>
              ) : (
                <div className="space-y-2.5">
                  {filteredMatchedScopes.map((scope) => {
                    const isExpanded = expandedScopeIds.has(scope.scopeId);
                    const diff = scope.newTargetBudget - scope.oldTargetBudget;

                    return (
                      <div
                        key={scope.scopeId}
                        className="bg-white border border-slate-200 rounded-xl shadow-2xs hover:border-slate-300 transition-colors overflow-hidden"
                      >
                        {/* Scope Header Card */}
                        <div
                          onClick={() => toggleExpand(scope.scopeId)}
                          className="p-4 flex flex-wrap items-center justify-between gap-3 cursor-pointer hover:bg-slate-50/80 transition-colors"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <span className="px-2 py-0.5 text-[10px] font-extrabold bg-slate-800 text-blue-300 rounded font-mono shrink-0">
                              Phase {scope.phaseId}
                            </span>
                            <div className="min-w-0">
                              <h4 className="text-sm font-bold text-slate-900 truncate">
                                {scope.scopeName}
                              </h4>
                              <div className="flex flex-wrap items-center gap-1.5 mt-1">
                                <span className="text-[11px] text-slate-500">Matched Cost Codes:</span>
                                {scope.matchedCostCodes.map((code) => (
                                  <span
                                    key={code}
                                    className="px-1.5 py-0.5 text-[10px] font-mono font-bold bg-blue-50 text-blue-800 border border-blue-200 rounded"
                                  >
                                    #{code}
                                  </span>
                                ))}
                                <span className="text-[11px] text-slate-400">
                                  ({scope.matchedEntries.length} line item{scope.matchedEntries.length !== 1 ? 's' : ''})
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Budget Shift Comparison: Old Target Budget ➔ New Target Budget */}
                          <div className="flex items-center gap-3 shrink-0">
                            <div className="text-right">
                              <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                                Target Budget Shift
                              </div>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-xs font-semibold text-slate-500 line-through">
                                  {formatCurrency(scope.oldTargetBudget)}
                                </span>
                                <ArrowRight className="w-3.5 h-3.5 text-emerald-600" />
                                <span className="text-base font-extrabold text-emerald-700">
                                  {formatCurrency(scope.newTargetBudget)}
                                </span>
                              </div>
                              <div className="text-[10px] font-bold mt-0.5">
                                {diff === 0 ? (
                                  <span className="text-slate-400">No change</span>
                                ) : diff > 0 ? (
                                  <span className="text-emerald-600">+{formatCurrency(diff)}</span>
                                ) : (
                                  <span className="text-rose-600">-{formatCurrency(Math.abs(diff))}</span>
                                )}
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleExpand(scope.scopeId);
                              }}
                              className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                              title={isExpanded ? 'Collapse breakdown' : 'View breakdown'}
                            >
                              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                            </button>
                          </div>
                        </div>

                        {/* Expandable Breakdown of Matching CSV Line Items */}
                        {isExpanded && (
                          <div className="px-4 py-3 bg-slate-50 border-t border-slate-200 text-xs animate-in fade-in duration-150">
                            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-2 flex items-center justify-between">
                              <span>Contributing Master Budget CSV Items</span>
                              <span>Sum: {formatCurrency(scope.newTargetBudget)}</span>
                            </div>
                            <div className="space-y-1.5">
                              {scope.matchedEntries.map((entry, idx) => (
                                <div
                                  key={`${entry.costCode}-${idx}`}
                                  className="flex items-center justify-between bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-700 shadow-2xs"
                                >
                                  <div className="flex items-center gap-2">
                                    <span className="px-1.5 py-0.5 font-mono text-[10px] font-bold bg-slate-100 text-slate-800 rounded border border-slate-200">
                                      {entry.costCode}
                                    </span>
                                    <span className="font-medium text-slate-800">{entry.description}</span>
                                  </div>
                                  <span className="font-bold font-mono text-emerald-700">
                                    {formatCurrency(entry.amount)}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ========================================================================= */}
          {/* 2. UNMATCHED / ORPHANED COST CODES SECTION                                 */}
          {/* ========================================================================= */}
          {(activeTab === 'all' || activeTab === 'orphaned') && (
            <div className="space-y-3 pt-2" id="unmatched-cost-codes-section">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={`w-2.5 h-2.5 rounded-full ${hasOrphaned ? 'bg-amber-500' : 'bg-slate-300'}`}></span>
                  <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider">
                    Unmatched / Orphaned Cost Codes ({filteredOrphanedCodes.length})
                  </h3>
                  <span className="text-xs text-slate-500 font-normal">
                    — Items in Master Budget CSV with no matching scope package in project
                  </span>
                </div>
                {hasOrphaned && (
                  <span className="text-xs font-bold text-amber-900 bg-amber-100 border border-amber-300 px-2.5 py-0.5 rounded-md">
                    Total: {formatCurrency(mapping.totalOrphanedBudget)}
                  </span>
                )}
              </div>

              {hasOrphaned && (
                <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3 text-amber-900 text-xs leading-relaxed">
                  <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-bold text-amber-950">
                      Missing Tender Package Notice
                    </div>
                    <p className="mt-0.5 text-amber-800">
                      The cost codes below exist in your uploaded Master Budget CSV, but do not correspond to any active Scope Package or Itemized Tender Form Line Items in this project. You may need to create a matching tender package or update the cost codes to allocate these funds.
                    </p>
                  </div>
                </div>
              )}

              {filteredOrphanedCodes.length === 0 ? (
                <div className="p-6 text-center bg-white border border-slate-200 rounded-xl text-slate-500 text-xs">
                  {hasOrphaned && searchQuery
                    ? 'No orphaned cost codes match your search query.'
                    : '🎉 Great news! All cost codes in the uploaded Master Budget CSV successfully mapped to active Scope Packages.'}
                </div>
              ) : (
                <div className="bg-white border border-slate-200 rounded-xl shadow-2xs overflow-hidden">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                        <th className="py-2.5 px-4">Cost Code</th>
                        <th className="py-2.5 px-4">Cost Code Description</th>
                        <th className="py-2.5 px-4 text-right">Allocated Budget ($)</th>
                        <th className="py-2.5 px-4 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredOrphanedCodes.map((orphan, idx) => (
                        <tr key={`${orphan.costCode}-${idx}`} className="hover:bg-amber-50/50 transition-colors">
                          <td className="py-2.5 px-4 font-mono font-bold text-slate-800">
                            <span className="px-2 py-0.5 bg-slate-100 rounded border border-slate-200">
                              {orphan.costCode}
                            </span>
                          </td>
                          <td className="py-2.5 px-4 text-slate-700 font-medium">
                            {orphan.description}
                          </td>
                          <td className="py-2.5 px-4 text-right font-mono font-bold text-slate-900">
                            {formatCurrency(orphan.amount)}
                          </td>
                          <td className="py-2.5 px-4 text-center">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-300 rounded-md">
                              <AlertTriangle className="w-3 h-3 text-amber-600" />
                              No matching scope found
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ========================================================================= */}
          {/* 3. UNCHANGED SCOPES (INFORMATIONAL)                                        */}
          {/* ========================================================================= */}
          {(activeTab === 'all' || activeTab === 'unmatched') && mapping.unmatchedScopes.length > 0 && (
            <div className="space-y-3 pt-2" id="unchanged-scopes-section">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-slate-400"></span>
                  <h3 className="text-sm font-extrabold text-slate-700 uppercase tracking-wider">
                    Unchanged Scopes ({filteredUnmatchedScopes.length})
                  </h3>
                  <span className="text-xs text-slate-500 font-normal">
                    — Existing scopes with no matching entries in this CSV (budgets preserved)
                  </span>
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-2xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  {filteredUnmatchedScopes.map((scope) => (
                    <div
                      key={scope.scopeId}
                      className="p-2.5 bg-slate-50 border border-slate-200/80 rounded-lg flex items-center justify-between"
                    >
                      <div>
                        <div className="font-semibold text-slate-800">{scope.scopeName}</div>
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          Phase {scope.phaseId} • Codes: {scope.assignedCostCodes.join(', ') || 'None'}
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="font-mono font-semibold text-slate-600">
                          {formatCurrency(scope.currentBudget)}
                        </span>
                        <div className="text-[10px] text-slate-400">Kept</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Action Bar with "Confirm & Apply Budgets" */}
        <div className="px-6 py-4 bg-white border-t border-slate-200 flex flex-wrap items-center justify-between gap-4 shrink-0 shadow-lg">
          <div>
            <div className="text-xs font-semibold text-slate-700 flex items-center gap-2">
              <span>Ready to update:</span>
              <span className="px-2 py-0.5 font-bold bg-emerald-100 text-emerald-800 rounded">
                {matchedCount} Scope Package{matchedCount !== 1 ? 's' : ''}
              </span>
              <span className="text-slate-400">•</span>
              <span className="font-mono font-bold text-slate-900">
                New Target Total: {formatCurrency(mapping.totalMatchedBudget)}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Updates Target Budgets, recalculates progress bars & project variances, and syncs immediately.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              id="cancel-budget-mapping-btn"
              onClick={onClose}
              disabled={isApplying}
              className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer disabled:opacity-50"
            >
              Cancel
            </button>

            <button
              type="button"
              id="confirm-apply-budgets-btn"
              onClick={onConfirm}
              disabled={isApplying || matchedCount === 0}
              className="px-5 py-2.5 text-xs font-extrabold bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl shadow-md transition-all cursor-pointer inline-flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isApplying ? (
                <span>Applying Budgets & Syncing...</span>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Confirm &amp; Apply Budgets ({formatCurrency(mapping.totalMatchedBudget)})</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
