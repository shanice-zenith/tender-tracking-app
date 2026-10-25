import React, { useState, useRef, useEffect } from 'react';
import { MoreVertical, Trash2, Archive, CheckCircle2 } from 'lucide-react';
import { PhaseId, ScopeLineItem } from '../types';
import { PHASES } from '../data/initialTenderPackages';
import { calculatePhaseProgress, calculatePhaseBudget, formatCurrency } from '../utils/formatters';

interface PhaseNavigationProps {
  activePhase: PhaseId;
  scopes: ScopeLineItem[];
  archivedPhaseIds?: PhaseId[];
  deletedPhaseIds?: PhaseId[];
  onSelectPhase: (phaseId: PhaseId) => void;
  onDeletePhase?: (phaseId: PhaseId) => void;
  onToggleArchivePhase?: (phaseId: PhaseId) => void;
}

export const PhaseNavigation: React.FC<PhaseNavigationProps> = ({
  activePhase,
  scopes,
  archivedPhaseIds = [],
  deletedPhaseIds = [],
  onSelectPhase,
  onDeletePhase,
  onToggleArchivePhase,
}) => {
  const [openMenuPhaseId, setOpenMenuPhaseId] = useState<PhaseId | null>(null);
  const menuContainerRef = useRef<HTMLDivElement>(null);

  // Close tab menu when clicking outside
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (menuContainerRef.current && !menuContainerRef.current.contains(e.target as Node)) {
        setOpenMenuPhaseId(null);
      }
    };
    if (openMenuPhaseId) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [openMenuPhaseId]);

  const visiblePhases = PHASES.filter((phase) => !deletedPhaseIds.includes(phase.id));

  return (
    <div className="bg-white border-b border-slate-200 shadow-xs relative" ref={menuContainerRef}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex overflow-x-auto no-scrollbar gap-2 py-3">
          {visiblePhases.map((phase) => {
            const isActive = activePhase === phase.id;
            const isArchived = archivedPhaseIds.includes(phase.id);
            const progress = calculatePhaseProgress(scopes, phase.id);
            const budgetInfo = calculatePhaseBudget(scopes, phase.id);
            const isMenuOpen = openMenuPhaseId === phase.id;

            return (
              <div
                key={phase.id}
                className="relative flex-1 min-w-[210px]"
              >
                <div
                  id={`phase-tab-${phase.id}`}
                  onClick={() => onSelectPhase(phase.id)}
                  className={`w-full text-left p-3.5 rounded-xl border transition-all cursor-pointer relative select-none ${
                    isActive
                      ? isArchived
                        ? 'bg-amber-50/70 border-amber-300 ring-2 ring-amber-500/20 shadow-xs'
                        : 'bg-blue-50/70 border-blue-300 ring-2 ring-blue-500/20 shadow-xs'
                      : isArchived
                      ? 'bg-slate-100/80 border-slate-300 hover:bg-slate-200/70 opacity-80'
                      : 'bg-slate-50/70 border-slate-200 hover:bg-slate-100 hover:border-slate-300'
                  }`}
                >
                  {/* Active Indicator Top Line */}
                  {isActive && (
                    <span 
                      className={`absolute top-0 left-4 right-4 h-0.5 rounded-b-full ${
                        isArchived ? 'bg-amber-600' : 'bg-blue-600'
                      }`} 
                    />
                  )}

                  <div className="flex items-center justify-between gap-1.5 mb-1.5">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span
                        className={`text-xs font-bold px-2 py-0.5 rounded-md shrink-0 ${
                          isActive
                            ? isArchived
                              ? 'bg-amber-600 text-white'
                              : 'bg-blue-600 text-white'
                            : isArchived
                            ? 'bg-slate-300 text-slate-700'
                            : 'bg-slate-200 text-slate-700'
                        }`}
                      >
                        {phase.code}
                      </span>
                      <span className="font-semibold text-sm text-slate-900 truncate">
                        {phase.name}
                      </span>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      {isArchived ? (
                        <span className="inline-flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-300">
                          <Archive className="w-2.5 h-2.5" />
                          Archived
                        </span>
                      ) : (
                        <span
                          className={`text-xs font-bold ${
                            progress >= 80
                              ? 'text-emerald-700'
                              : progress >= 40
                              ? 'text-blue-700'
                              : 'text-slate-600'
                          }`}
                        >
                          {progress}%
                        </span>
                      )}

                      {/* Three-Dot Phase Options Menu Button on Tab */}
                      {(onDeletePhase || onToggleArchivePhase) && (
                        <button
                          type="button"
                          id={`phase-tab-menu-btn-${phase.id}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenMenuPhaseId(isMenuOpen ? null : phase.id);
                          }}
                          className="p-1 rounded-md text-slate-400 hover:text-slate-800 hover:bg-slate-200/70 transition-colors cursor-pointer ml-0.5"
                          title={`${phase.name} Options`}
                          aria-label={`${phase.name} Options`}
                        >
                          <MoreVertical className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Individual Progress Bar */}
                  <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden mb-2">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        isArchived
                          ? 'bg-amber-500'
                          : progress >= 80
                          ? 'bg-emerald-500'
                          : progress >= 40
                          ? 'bg-blue-600'
                          : 'bg-slate-400'
                      }`}
                      style={{ width: `${progress}%` }}
                    />
                  </div>

                  {/* Micro Stats */}
                  <div className="flex items-center justify-between text-[11px] text-slate-500">
                    <span>{budgetInfo.poApprovedCount}/{budgetInfo.totalScopesCount} POs</span>
                    <span className="font-medium text-slate-700 font-mono">
                      {formatCurrency(budgetInfo.totalBudget)}
                    </span>
                  </div>
                </div>

                {/* Dropdown Menu anchored to tab */}
                {isMenuOpen && (
                  <div 
                    className="absolute right-0 top-full mt-1 w-64 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl py-1.5 z-50 animate-in fade-in zoom-in-95 duration-100 divide-y divide-slate-800 text-xs"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="px-3.5 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono">
                      {phase.name} Options
                    </div>

                    <div className="py-1">
                      {onToggleArchivePhase && (
                        <button
                          type="button"
                          id={`tab-menu-archive-btn-${phase.id}`}
                          onClick={() => {
                            setOpenMenuPhaseId(null);
                            onToggleArchivePhase(phase.id);
                          }}
                          className="w-full text-left flex items-center gap-2.5 px-3.5 py-2 font-semibold text-slate-200 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                        >
                          <Archive className="w-4 h-4 text-amber-400 shrink-0" />
                          <span>
                            {isArchived
                              ? '📦 Mark Phase as Active (Unarchive)'
                              : '📦 Archive / Mark as Completed'}
                          </span>
                        </button>
                      )}

                      {onDeletePhase && (
                        <button
                          type="button"
                          id={`tab-menu-delete-btn-${phase.id}`}
                          onClick={() => {
                            setOpenMenuPhaseId(null);
                            onDeletePhase(phase.id);
                          }}
                          className="w-full text-left flex items-center gap-2.5 px-3.5 py-2 font-semibold text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4 text-rose-400 shrink-0" />
                          <span>🗑️ Delete Phase</span>
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
