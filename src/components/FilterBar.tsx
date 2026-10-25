import React, { useState, useRef, useEffect } from 'react';
import { Search, Filter, CheckSquare, X, ChevronUp, ChevronDown, Check } from 'lucide-react';
import { ActionItemStatus } from '../types';
import { ACTION_STATUS_OPTIONS } from '../data/initialTenderPackages';

interface FilterBarProps {
  searchQuery: string;
  onSearchChange: (val: string) => void;
  statusFilter: string;
  onStatusFilterChange: (val: string) => void;
  poSentFilter: 'all' | 'sent' | 'pending';
  onPoSentFilterChange: (val: 'all' | 'sent' | 'pending') => void;
  totalFilteredCount: number;
  totalPhaseScopeCount: number;
  onClearFilters: () => void;
  isAllCollapsed?: boolean;
  onToggleCollapseAll?: () => void;
}

export const FilterBar: React.FC<FilterBarProps> = ({
  searchQuery,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  poSentFilter,
  onPoSentFilterChange,
  totalFilteredCount,
  totalPhaseScopeCount,
  onClearFilters,
  isAllCollapsed = false,
  onToggleCollapseAll,
}) => {
  const isFiltered = searchQuery.trim() !== '' || statusFilter !== 'ALL' || poSentFilter !== 'all';
  const [isStatusOpen, setIsStatusOpen] = useState(false);
  const [isPoOpen, setIsPoOpen] = useState(false);
  const statusMenuRef = useRef<HTMLDivElement>(null);
  const poMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (statusMenuRef.current && !statusMenuRef.current.contains(target)) {
        setIsStatusOpen(false);
      }
      if (poMenuRef.current && !poMenuRef.current.contains(target)) {
        setIsPoOpen(false);
      }
    };
    if (isStatusOpen || isPoOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isStatusOpen, isPoOpen]);

  return (
    <div className="bg-slate-50 border-b border-slate-200 py-3 relative z-30 overflow-visible">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 overflow-visible">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 overflow-visible">
          {/* Left: Search input */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              id="filter-search-input"
              type="text"
              placeholder="Search scope line items, contractors, notes..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full pl-9 pr-8 py-1.5 text-xs bg-white border border-slate-300 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-2xs"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => onSearchChange('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Right: Filters & Controls */}
          <div className="flex flex-wrap items-center gap-2.5 overflow-visible">
            {/* Action Status Filter Dropdown */}
            <div className="relative" ref={statusMenuRef}>
              <button
                type="button"
                id="filter-status-dropdown-btn"
                onClick={() => setIsStatusOpen(!isStatusOpen)}
                className="flex items-center gap-1.5 bg-white hover:bg-slate-50 active:bg-slate-100 border border-[#cbd5e1] rounded-lg px-2.5 py-1 text-xs shadow-2xs cursor-pointer transition-colors"
                title="Filter by action status"
                aria-expanded={isStatusOpen}
              >
                <Filter className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                <span className="text-[11px] font-medium text-slate-500">Status:</span>
                <span className="text-[#334155] font-semibold truncate max-w-[140px]">
                  {statusFilter === 'ALL' ? 'All Action Statuses' : statusFilter}
                </span>
                <ChevronDown className={`w-3.5 h-3.5 text-slate-400 shrink-0 transition-transform duration-150 ${isStatusOpen ? 'rotate-180 text-blue-500' : ''}`} />
              </button>

              {/* Elevated Action Status Menu */}
              {isStatusOpen && (
                <div 
                  className="absolute left-0 top-full mt-1.5 w-60 bg-white border border-slate-200 rounded-xl shadow-2xl py-1 z-[9999] animate-in fade-in zoom-in-95 duration-100 max-h-72 overflow-y-auto"
                  style={{ position: 'absolute', zIndex: 9999 }}
                >
                  <button
                    type="button"
                    id="filter-status-opt-all"
                    onClick={() => {
                      onStatusFilterChange('ALL');
                      setIsStatusOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-slate-50 transition-colors cursor-pointer ${
                      statusFilter === 'ALL' ? 'font-bold text-blue-600 bg-blue-50/50' : 'text-slate-700'
                    }`}
                  >
                    <span>All Action Statuses</span>
                    {statusFilter === 'ALL' && <Check className="w-3.5 h-3.5 text-blue-600" />}
                  </button>
                  <div className="h-px bg-slate-100 my-0.5" />
                  {ACTION_STATUS_OPTIONS.map((st) => (
                    <button
                      key={st}
                      type="button"
                      id={`filter-status-opt-${st.replace(/\s+/g, '-').toLowerCase()}`}
                      onClick={() => {
                        onStatusFilterChange(st);
                        setIsStatusOpen(false);
                      }}
                      className={`w-full text-left px-3 py-1.5 text-xs flex items-center justify-between hover:bg-slate-50 transition-colors cursor-pointer ${
                        statusFilter === st ? 'font-bold text-blue-600 bg-blue-50/50' : 'text-slate-700'
                      }`}
                    >
                      <span>{st}</span>
                      {statusFilter === st && <Check className="w-3.5 h-3.5 text-blue-600" />}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* PO Sent Filter Dropdown */}
            <div className="relative" ref={poMenuRef}>
              <button
                type="button"
                id="filter-po-dropdown-btn"
                onClick={() => setIsPoOpen(!isPoOpen)}
                className="flex items-center gap-1.5 bg-white hover:bg-slate-50 active:bg-slate-100 border border-[#cbd5e1] rounded-lg px-2.5 py-1 text-xs shadow-2xs cursor-pointer transition-colors"
                title="Filter by Purchase Order state"
                aria-expanded={isPoOpen}
              >
                <CheckSquare className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                <span className="text-[11px] font-medium text-slate-500">PO:</span>
                <span className="text-[#334155] font-semibold truncate">
                  {poSentFilter === 'all' ? 'All PO States' : poSentFilter === 'sent' ? 'PO Sent' : 'PO Pending'}
                </span>
                <ChevronDown className={`w-3.5 h-3.5 text-slate-400 shrink-0 transition-transform duration-150 ${isPoOpen ? 'rotate-180 text-blue-500' : ''}`} />
              </button>

              {/* Elevated PO Filter Menu */}
              {isPoOpen && (
                <div 
                  className="absolute left-0 top-full mt-1.5 w-52 bg-white border border-slate-200 rounded-xl shadow-2xl py-1 z-[9999] animate-in fade-in zoom-in-95 duration-100"
                  style={{ position: 'absolute', zIndex: 9999 }}
                >
                  {[
                    { id: 'all', label: 'All PO States' },
                    { id: 'sent', label: 'PO Sent (Delivered)' },
                    { id: 'pending', label: 'PO Pending' },
                  ].map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      id={`filter-po-opt-${item.id}`}
                      onClick={() => {
                        onPoSentFilterChange(item.id as 'all' | 'sent' | 'pending');
                        setIsPoOpen(false);
                      }}
                      className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-slate-50 transition-colors cursor-pointer ${
                        poSentFilter === item.id ? 'font-bold text-blue-600 bg-blue-50/50' : 'text-slate-700'
                      }`}
                    >
                      <span>{item.label}</span>
                      {poSentFilter === item.id && <Check className="w-3.5 h-3.5 text-blue-600" />}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Global Collapse All / Expand All Toggle Button */}
            {onToggleCollapseAll && (
              <button
                type="button"
                id="scope-collapse-expand-all-btn"
                onClick={onToggleCollapseAll}
                disabled={totalFilteredCount === 0}
                className="inline-flex items-center gap-1.5 bg-white hover:bg-slate-100/90 active:bg-slate-200/80 border border-[#cbd5e1] text-[#334155] hover:text-slate-900 px-2.5 py-1 text-xs font-semibold rounded-lg shadow-2xs transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                title={isAllCollapsed ? 'Expand all scope cards in active phase tab' : 'Collapse all scope cards in active phase tab'}
              >
                {isAllCollapsed ? (
                  <>
                    <ChevronDown className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                    <span>Expand All</span>
                  </>
                ) : (
                  <>
                    <ChevronUp className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                    <span>Collapse All</span>
                  </>
                )}
              </button>
            )}

            {/* Scope Counter & Reset Filter */}
            <div className="flex items-center gap-2 pl-0.5">
              <span className="text-xs text-slate-500 font-medium">
                Showing <strong className="text-slate-800">{totalFilteredCount}</strong> of {totalPhaseScopeCount} scopes
              </span>
              {isFiltered && (
                <button
                  id="filter-clear-btn"
                  onClick={onClearFilters}
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
                >
                  <X className="w-3 h-3" />
                  Clear Filters
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
