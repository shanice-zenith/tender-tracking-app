import React, { useState, useMemo } from 'react';
import { 
  X, 
  CheckCircle2, 
  AlertCircle, 
  Sparkles, 
  Search, 
  ArrowRight, 
  Loader2, 
  Layers, 
  FileSpreadsheet, 
  TrendingUp, 
  TrendingDown, 
  FileText,
  DollarSign,
  Filter,
  Check
} from 'lucide-react';
import { Project, PhaseId } from '../types';
import { 
  BudgetExtractionResult, 
  ExtractedBudgetReviewItem, 
  ScopeBudgetAggregation 
} from '../services/budgetExtractionService';
import { formatCurrency } from '../utils/formatters';

interface ImportedBudgetReviewDrawerProps {
  isOpen: boolean;
  extraction: BudgetExtractionResult | null;
  activeProject: Project | null;
  onClose: () => void;
  onConfirm: (finalExtraction: BudgetExtractionResult) => void;
  isApplying: boolean;
}

export const ImportedBudgetReviewDrawer: React.FC<ImportedBudgetReviewDrawerProps> = ({
  isOpen,
  extraction,
  activeProject,
  onClose,
  onConfirm,
  isApplying
}) => {
  if (!isOpen || !extraction || !activeProject) return null;

  // Local state to allow re-assigning scopes or adjusting items in review
  const [items, setItems] = useState<ExtractedBudgetReviewItem[]>(extraction.items);
  const [activeTab, setActiveTab] = useState<'table' | 'scopes'>('table');
  const [statusFilter, setStatusFilter] = useState<'all' | 'mapped' | 'unmapped'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Handle manual scope reassignment from table dropdown
  const handleScopeChange = (itemId: string, newScopeId: string) => {
    setItems((prev) =>
      prev.map((it) => {
        if (it.id !== itemId) return it;
        if (!newScopeId) {
          return {
            ...it,
            mappedScopeId: undefined,
            mappedScopeName: undefined,
            mappedPhaseId: undefined,
            status: 'Unmapped'
          };
        }
        const targetScope = activeProject.scopes.find((s) => s.id === newScopeId);
        return {
          ...it,
          mappedScopeId: targetScope?.id,
          mappedScopeName: targetScope?.name,
          mappedPhaseId: targetScope?.phaseId,
          status: targetScope ? 'Mapped' : 'Unmapped'
        };
      })
    );
  };

  // Recompute scope aggregations and totals dynamically based on items state
  const { 
    scopeAggregations, 
    totalExtracted, 
    totalMapped, 
    totalUnmapped, 
    mappedCount, 
    unmappedCount,
    newProjectTotal
  } = useMemo(() => {
    const scopeToItems = new Map<string, ExtractedBudgetReviewItem[]>();
    items.forEach((it) => {
      if (it.mappedScopeId) {
        if (!scopeToItems.has(it.mappedScopeId)) {
          scopeToItems.set(it.mappedScopeId, []);
        }
        scopeToItems.get(it.mappedScopeId)!.push(it);
      }
    });

    const aggs: ScopeBudgetAggregation[] = [];
    const scopeMap = new Map<string, number>();
    activeProject.scopes.forEach((s) => scopeMap.set(s.id, s.budgetAmount || 0));

    activeProject.scopes.forEach((scope) => {
      const matched = scopeToItems.get(scope.id);
      if (matched && matched.length > 0) {
        const newTarget = matched.reduce((sum, i) => sum + i.amount, 0);
        const oldTarget = scope.budgetAmount || 0;
        const codes = Array.from(new Set(matched.map((m) => m.costCode)));
        aggs.push({
          scopeId: scope.id,
          scopeName: scope.name,
          phaseId: scope.phaseId,
          oldTargetBudget: oldTarget,
          newTargetBudget: newTarget,
          difference: newTarget - oldTarget,
          matchedCostCodes: codes,
          matchedItems: matched
        });
        scopeMap.set(scope.id, newTarget);
      }
    });

    const totalExtracted = items.reduce((sum, i) => sum + i.amount, 0);
    const totalMapped = items
      .filter((i) => i.status === 'Mapped')
      .reduce((sum, i) => sum + i.amount, 0);
    const totalUnmapped = totalExtracted - totalMapped;
    const mappedCount = items.filter((i) => i.status === 'Mapped').length;
    const unmappedCount = items.filter((i) => i.status === 'Unmapped').length;
    const newProjectTotal = Array.from(scopeMap.values()).reduce((sum, val) => sum + val, 0);

    return {
      scopeAggregations: aggs,
      totalExtracted,
      totalMapped,
      totalUnmapped,
      mappedCount,
      unmappedCount,
      newProjectTotal
    };
  }, [items, activeProject]);

  // Filter items for review table
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      if (statusFilter === 'mapped' && item.status !== 'Mapped') return false;
      if (statusFilter === 'unmapped' && item.status !== 'Unmapped') return false;
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const codeMatch = item.costCode.toLowerCase().includes(q);
        const descMatch = item.description.toLowerCase().includes(q);
        const scopeMatch = item.mappedScopeName?.toLowerCase().includes(q) || false;
        return codeMatch || descMatch || scopeMatch;
      }
      return true;
    });
  }, [items, statusFilter, searchTerm]);

  const handleConfirmClick = () => {
    const finalResult: BudgetExtractionResult = {
      ...extraction,
      items,
      scopeAggregations,
      totalExtractedBudget: totalExtracted,
      totalMappedBudget: totalMapped,
      totalUnmappedBudget: totalUnmapped,
      newProjectTargetBudget: newProjectTotal,
      mappedCount,
      unmappedCount
    };
    onConfirm(finalResult);
  };

  const projectOldBudget = activeProject.scopes.reduce((sum, s) => sum + (s.budgetAmount || 0), 0);
  const netProjectDiff = newProjectTotal - projectOldBudget;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="bg-slate-900 border-l border-slate-800 w-full max-w-5xl h-full flex flex-col shadow-2xl animate-in slide-in-from-right duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drawer Header */}
        <div className="px-6 py-4 border-b border-slate-800 bg-slate-900/90 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-semibold text-white">
                  Imported Budget Review
                </h2>
                <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-slate-800 border border-slate-700 text-slate-300 font-mono">
                  {extraction.sourceFileType}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Source: <span className="text-slate-200 font-medium">{extraction.sourceFileName}</span> • Project: {activeProject.name}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
            title="Close review"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Top KPI Metrics Bar */}
        <div className="px-6 py-3.5 bg-slate-950/50 border-b border-slate-800 grid grid-cols-2 sm:grid-cols-4 gap-3 shrink-0">
          <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-3">
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
              Total Extracted Budget
            </span>
            <span className="text-base font-bold text-white font-mono mt-0.5 block">
              {formatCurrency(totalExtracted)}
            </span>
            <span className="text-[11px] text-slate-500 font-mono">
              {items.length} cost code rows
            </span>
          </div>

          <div className="bg-slate-900/60 border border-emerald-500/20 rounded-xl p-3">
            <span className="text-[10px] font-semibold text-emerald-400 uppercase tracking-wider block">
              Mapped to Scopes
            </span>
            <span className="text-base font-bold text-emerald-300 font-mono mt-0.5 block">
              {formatCurrency(totalMapped)}
            </span>
            <span className="text-[11px] text-emerald-400/80 font-mono">
              {mappedCount} items ({scopeAggregations.length} packages)
            </span>
          </div>

          <div className="bg-slate-900/60 border border-amber-500/20 rounded-xl p-3">
            <span className="text-[10px] font-semibold text-amber-400 uppercase tracking-wider block">
              Unmapped / Orphaned
            </span>
            <span className="text-base font-bold text-amber-300 font-mono mt-0.5 block">
              {formatCurrency(totalUnmapped)}
            </span>
            <span className="text-[11px] text-amber-400/80 font-mono">
              {unmappedCount} items unassigned
            </span>
          </div>

          <div className="bg-slate-900/60 border border-blue-500/20 rounded-xl p-3">
            <span className="text-[10px] font-semibold text-blue-400 uppercase tracking-wider block">
              Project Target Budget
            </span>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="text-xs text-slate-400 line-through font-mono">
                {formatCurrency(projectOldBudget)}
              </span>
              <ArrowRight className="w-3 h-3 text-slate-500" />
              <span className="text-base font-bold text-white font-mono">
                {formatCurrency(newProjectTotal)}
              </span>
            </div>
            <span className={`text-[11px] font-mono font-semibold ${netProjectDiff >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {netProjectDiff >= 0 ? `+${formatCurrency(netProjectDiff)}` : formatCurrency(netProjectDiff)} net shift
            </span>
          </div>
        </div>

        {/* View Tabs & Filters Bar */}
        <div className="px-6 py-3 border-b border-slate-800 bg-slate-900 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-1 bg-slate-800/80 p-1 rounded-xl border border-slate-700/60 text-xs">
            <button
              type="button"
              onClick={() => setActiveTab('table')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
                activeTab === 'table'
                  ? 'bg-amber-500 text-slate-950 shadow-xs'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              Imported Budget Review ({items.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('scopes')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
                activeTab === 'scopes'
                  ? 'bg-amber-500 text-slate-950 shadow-xs'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              Scope Package Targets ({scopeAggregations.length})
            </button>
          </div>

          {activeTab === 'table' && (
            <div className="flex items-center gap-2">
              {/* Status Filter Tabs */}
              <div className="flex items-center gap-1 text-xs">
                <button
                  type="button"
                  onClick={() => setStatusFilter('all')}
                  className={`px-2.5 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
                    statusFilter === 'all'
                      ? 'bg-slate-700 text-white font-semibold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  All ({items.length})
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter('mapped')}
                  className={`px-2.5 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
                    statusFilter === 'mapped'
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-semibold'
                      : 'text-emerald-400/70 hover:text-emerald-300'
                  }`}
                >
                  Mapped ({mappedCount})
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter('unmapped')}
                  className={`px-2.5 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
                    statusFilter === 'unmapped'
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30 font-semibold'
                      : 'text-amber-400/70 hover:text-amber-300'
                  }`}
                >
                  Unmapped ({unmappedCount})
                </button>
              </div>

              {/* Search Bar */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Filter codes or scopes..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8 pr-3 py-1 bg-slate-800/80 border border-slate-700/60 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-500 w-44"
                />
              </div>
            </div>
          )}
        </div>

        {/* Drawer Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {activeTab === 'table' ? (
            /* ============================================================ */
            /* 1. REQUIRED TABLE: Cost Code | Description | Extracted Amount | Mapped Scope Package | Status */
            /* ============================================================ */
            <div className="space-y-3">
              <div className="border border-slate-800 rounded-xl overflow-hidden shadow-xs bg-slate-900/50">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-950/80 border-b border-slate-800 text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
                        <th className="py-3 px-4 w-28">Cost Code</th>
                        <th className="py-3 px-4 min-w-[180px]">Description</th>
                        <th className="py-3 px-4 text-right w-36">Extracted Amount</th>
                        <th className="py-3 px-4 min-w-[240px]">Mapped Scope Package</th>
                        <th className="py-3 px-4 text-center w-28">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {filteredItems.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="py-12 text-center text-slate-500">
                            No extracted budget rows match the selected filter.
                          </td>
                        </tr>
                      ) : (
                        filteredItems.map((item) => {
                          const isMapped = item.status === 'Mapped';
                          return (
                            <tr 
                              key={item.id}
                              className={`hover:bg-slate-800/40 transition-colors ${
                                !isMapped ? 'bg-amber-500/[0.02]' : ''
                              }`}
                            >
                              {/* 1. Cost Code */}
                              <td className="py-3 px-4 font-mono font-bold text-amber-400">
                                <span className="px-2 py-0.5 rounded-md bg-slate-800 border border-slate-700/80 inline-block">
                                  {item.costCode}
                                </span>
                              </td>

                              {/* 2. Description */}
                              <td className="py-3 px-4 text-slate-200 font-medium">
                                <div>{item.description}</div>
                                {item.rawLine && (
                                  <span className="text-[10px] text-slate-500">
                                    Line {item.rawLine}
                                  </span>
                                )}
                              </td>

                              {/* 3. Extracted Amount */}
                              <td className="py-3 px-4 text-right font-mono font-bold text-white">
                                {formatCurrency(item.amount)}
                              </td>

                              {/* 4. Mapped Scope Package (with quick interactive re-assignment selector) */}
                              <td className="py-3 px-4">
                                <select
                                  value={item.mappedScopeId || ''}
                                  onChange={(e) => handleScopeChange(item.id, e.target.value)}
                                  className={`w-full text-xs rounded-lg px-2.5 py-1.5 border transition-colors cursor-pointer focus:outline-none focus:ring-1 ${
                                    isMapped
                                      ? 'bg-slate-800/80 border-slate-700 text-slate-200 focus:ring-emerald-500'
                                      : 'bg-amber-950/30 border-amber-500/40 text-amber-200 focus:ring-amber-500'
                                  }`}
                                >
                                  <option value="">-- Unassigned (Orphaned) --</option>
                                  {activeProject.scopes.map((scope) => (
                                    <option key={scope.id} value={scope.id}>
                                      [{scope.phaseId}] {scope.name} {scope.costCode ? `(${scope.costCode})` : ''}
                                    </option>
                                  ))}
                                </select>
                              </td>

                              {/* 5. Status */}
                              <td className="py-3 px-4 text-center">
                                {isMapped ? (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                    <CheckCircle2 className="w-3 h-3" />
                                    Mapped
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20" title="No matching scope in project">
                                    <AlertCircle className="w-3 h-3" />
                                    Unmapped
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Multi-Code Aggregation Insight Banner */}
              <div className="bg-slate-800/30 border border-slate-800 rounded-xl p-3 flex items-center justify-between text-xs text-slate-400">
                <span>
                  Tip: If multiple cost codes are assigned to the same scope (e.g. 20120, 20140, 20150), they are automatically aggregated into a single Scope Package Target Budget.
                </span>
                <button
                  type="button"
                  onClick={() => setActiveTab('scopes')}
                  className="text-amber-400 hover:text-amber-300 font-semibold shrink-0 ml-3 underline underline-offset-2 cursor-pointer"
                >
                  View Scope Aggregations ➔
                </button>
              </div>
            </div>
          ) : (
            /* ============================================================ */
            /* 2. SCOPE PACKAGES AGGREGATION VIEW (Multi-Code Totals)       */
            /* ============================================================ */
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Calculated Target Budgets per Scope Package ({scopeAggregations.length})
                </h3>
                <span className="text-[11px] text-slate-500">
                  Aggregated sum of extracted line items matching assigned cost codes
                </span>
              </div>

              <div className="grid grid-cols-1 gap-3">
                {scopeAggregations.map((agg) => {
                  const isShift = agg.difference !== 0;
                  return (
                    <div
                      key={agg.scopeId}
                      className="bg-slate-800/40 border border-slate-700/70 rounded-xl p-4 space-y-3 hover:border-slate-600 transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded-md bg-slate-700 text-slate-300 text-[10px] font-mono font-bold">
                              {agg.phaseId}
                            </span>
                            <h4 className="text-sm font-semibold text-white">
                              {agg.scopeName}
                            </h4>
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs text-slate-400">
                              Matched Cost Codes ({agg.matchedCostCodes.length}):
                            </span>
                            <div className="flex flex-wrap gap-1">
                              {agg.matchedCostCodes.map((c) => (
                                <span 
                                  key={c}
                                  className="px-1.5 py-0.5 text-[10px] font-mono font-bold bg-amber-500/10 text-amber-300 border border-amber-500/20 rounded"
                                >
                                  {c}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>

                        {/* Budget Shift Metric */}
                        <div className="text-right">
                          <span className="text-[10px] uppercase font-semibold text-slate-400 block">
                            Target Budget
                          </span>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-xs text-slate-400 line-through font-mono">
                              {formatCurrency(agg.oldTargetBudget)}
                            </span>
                            <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
                            <span className="text-base font-bold font-mono text-emerald-400">
                              {formatCurrency(agg.newTargetBudget)}
                            </span>
                          </div>
                          <span className={`text-[11px] font-mono font-semibold ${agg.difference >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {agg.difference >= 0 ? `+${formatCurrency(agg.difference)}` : formatCurrency(agg.difference)} variance
                          </span>
                        </div>
                      </div>

                      {/* Contributing Line Items Breakdown */}
                      <div className="bg-slate-950/60 rounded-lg p-2.5 border border-slate-800 space-y-1">
                        <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                          Contributing Cost Code Items:
                        </span>
                        {agg.matchedItems.map((item, idx) => (
                          <div key={item.id} className="flex items-center justify-between text-xs font-mono py-0.5">
                            <div className="flex items-center gap-2">
                              <span className="text-amber-400 font-bold">{item.costCode}</span>
                              <span className="text-slate-300 font-sans">{item.description}</span>
                            </div>
                            <span className="text-white font-bold">{formatCurrency(item.amount)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Sticky Drawer Footer with Confirm & Apply Action Button */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-900/90 flex items-center justify-between shrink-0">
          <div className="text-xs text-slate-400">
            <span>Applying budgets updates </span>
            <span className="text-white font-semibold">{scopeAggregations.length} Scope Package(s)</span>
            <span> and re-hydrates the master spreadsheet.</span>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={isApplying}
              className="px-4 py-2 text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors cursor-pointer disabled:opacity-50"
            >
              Cancel
            </button>

            <button
              type="button"
              id="confirm-apply-budgets-btn"
              onClick={handleConfirmClick}
              disabled={isApplying || scopeAggregations.length === 0}
              className="inline-flex items-center gap-2 px-5 py-2 text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-xl transition-all cursor-pointer shadow-lg shadow-emerald-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isApplying ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Writing to Database &amp; Syncing...</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4 stroke-[3]" />
                  <span>Confirm &amp; Apply Budgets</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
