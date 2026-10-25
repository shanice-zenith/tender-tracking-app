import { ActionItemStatus, ScopeLineItem, PhaseId } from '../types';

export function formatCurrency(amount: number | string | null | undefined): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : (amount || 0);
  if (num === null || num === undefined || isNaN(num)) return '$0';
  return new Intl.NumberFormat('en-CA', {
    style: 'currency',
    currency: 'CAD',
    minimumFractionDigits: num % 1 === 0 ? 0 : 2, // Shows $21,399.51 with cents, $25,000 clean
    maximumFractionDigits: 2
  }).format(num);
}

export function getStatusBadgeClasses(status: ActionItemStatus): {
  bg: string;
  text: string;
  border: string;
  dot: string;
} {
  switch (status) {
    case 'PO Approved':
      return {
        bg: 'bg-slate-100 hover:bg-slate-200/70',
        text: 'text-slate-800',
        border: 'border-slate-200',
        dot: 'bg-emerald-500'
      };
    case 'Estimate Submitted':
      return {
        bg: 'bg-slate-100 hover:bg-slate-200/70',
        text: 'text-slate-800',
        border: 'border-slate-200',
        dot: 'bg-blue-500'
      };
    case 'Revision Submitted':
      return {
        bg: 'bg-slate-100 hover:bg-slate-200/70',
        text: 'text-slate-800',
        border: 'border-slate-200',
        dot: 'bg-teal-500'
      };
    case 'Confirm with PM':
      return {
        bg: 'bg-slate-100 hover:bg-slate-200/70',
        text: 'text-slate-800',
        border: 'border-slate-200',
        dot: 'bg-indigo-500'
      };
    case 'Confirm w/ ID':
      return {
        bg: 'bg-slate-100 hover:bg-slate-200/70',
        text: 'text-slate-800',
        border: 'border-slate-200',
        dot: 'bg-purple-500'
      };
    case 'Follow-up Pending':
      return {
        bg: 'bg-slate-100 hover:bg-slate-200/70',
        text: 'text-slate-800',
        border: 'border-slate-200',
        dot: 'bg-amber-500'
      };
    case 'Waiting on Response':
      return {
        bg: 'bg-slate-100 hover:bg-slate-200/70',
        text: 'text-slate-800',
        border: 'border-slate-200',
        dot: 'bg-blue-500'
      };
    case 'Request Revised Estimate':
      return {
        bg: 'bg-slate-100 hover:bg-slate-200/70',
        text: 'text-slate-800',
        border: 'border-slate-200',
        dot: 'bg-rose-500'
      };
    case 'Estimate Requested':
    default:
      return {
        bg: 'bg-slate-100 hover:bg-slate-200/70',
        text: 'text-slate-800',
        border: 'border-slate-200',
        dot: 'bg-slate-400'
      };
  }
}

// Check if a scope item is considered PO Approved (status is 'PO Approved' or poSent is true)
export function isScopePOApproved(scope: ScopeLineItem): boolean {
  return scope.trades.some((t) => t.actionStatus === 'PO Approved' || Boolean(t.poSent));
}

// Calculate individual phase progress percentage: (Count of Scope Items with "PO Approved" in the Phase / Total Scope Items in the Phase) * 100
export function calculatePhaseProgress(scopes: ScopeLineItem[], phaseId: PhaseId): number {
  const phaseScopes = scopes.filter((s) => s.phaseId === phaseId);
  if (phaseScopes.length === 0) return 0;

  const approvedCount = phaseScopes.filter(isScopePOApproved).length;
  return Math.round((approvedCount / phaseScopes.length) * 100);
}

// Calculate overall master project completion percentage across all 5 phases: (Total "PO Approved" Scope Items across all 5 phases / Total Scope Items across all 5 phases) * 100
export function calculateMasterProgress(scopes: ScopeLineItem[]): number {
  if (scopes.length === 0) return 0;
  const approvedCount = scopes.filter(isScopePOApproved).length;
  return Math.round((approvedCount / scopes.length) * 100);
}

// Calculate phase budget metrics
export function calculatePhaseBudget(scopes: ScopeLineItem[], phaseId?: PhaseId): {
  totalBudget: number;
  totalQuotedCommitted: number;
  totalVariance: number;
  poSentCount: number;
  poApprovedCount: number;
  totalScopesCount: number;
  totalQuotesCount: number;
} {
  const targetScopes = phaseId ? scopes.filter((s) => s.phaseId === phaseId) : scopes;
  let totalBudget = 0;
  let totalQuotedCommitted = 0;
  let poApprovedCount = 0;
  let totalQuotesCount = 0;

  targetScopes.forEach((scope) => {
    totalBudget += scope.budgetAmount || 0;
    totalQuotesCount += scope.trades.length;

    // Best / Awarded quote
    const awardedTrade =
      scope.trades.find((t) => t.isAwarded) ||
      (scope.trades.length > 0
        ? scope.trades.reduce(
            (min, t) => (t.quotedFigure < min.quotedFigure && t.quotedFigure > 0 ? t : min),
            scope.trades[0]
          )
        : null);

    if (awardedTrade && awardedTrade.quotedFigure > 0) {
      totalQuotedCommitted += awardedTrade.quotedFigure;
    }

    if (isScopePOApproved(scope)) {
      poApprovedCount++;
    }
  });

  return {
    totalBudget,
    totalQuotedCommitted,
    totalVariance: totalBudget - totalQuotedCommitted,
    poSentCount: poApprovedCount,
    poApprovedCount,
    totalScopesCount: targetScopes.length,
    totalQuotesCount
  };
}
