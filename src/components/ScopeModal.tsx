import React, { useState, useEffect } from 'react';
import { X, Save, Layers, DollarSign, FileText } from 'lucide-react';
import { ScopeLineItem, PhaseId } from '../types';
import { PHASES } from '../data/initialTenderPackages';

interface ScopeModalProps {
  isOpen: boolean;
  activePhase: PhaseId;
  scopeToEdit: ScopeLineItem | null;
  onClose: () => void;
  onSaveScope: (scopeData: Partial<ScopeLineItem>) => void;
}

export const ScopeModal: React.FC<ScopeModalProps> = ({
  isOpen,
  activePhase,
  scopeToEdit,
  onClose,
  onSaveScope,
}) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [budgetAmount, setBudgetAmount] = useState('25000');
  const [phaseId, setPhaseId] = useState<PhaseId>(activePhase);
  const [isRequired, setIsRequired] = useState(true);
  const [googleFormUrl, setGoogleFormUrl] = useState('');
  const [tenderDeadline, setTenderDeadline] = useState('');

  useEffect(() => {
    if (scopeToEdit) {
      setName(scopeToEdit.name);
      setDescription(scopeToEdit.description);
      setBudgetAmount(scopeToEdit.budgetAmount.toString());
      setPhaseId(scopeToEdit.phaseId);
      setIsRequired(scopeToEdit.isRequired !== false);
      setGoogleFormUrl(scopeToEdit.googleFormUrl || '');
      setTenderDeadline(scopeToEdit.tenderDeadline || '');
    } else {
      setName('');
      setDescription('');
      setBudgetAmount('25000');
      setPhaseId(activePhase);
      setIsRequired(true);
      setGoogleFormUrl('');
      setTenderDeadline('');
    }
  }, [scopeToEdit, activePhase, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    onSaveScope({
      name: name.trim(),
      description: description.trim(),
      budgetAmount: parseFloat(budgetAmount) || 0,
      phaseId,
      isRequired,
      googleFormUrl: googleFormUrl.trim(),
      tenderDeadline: tenderDeadline.trim()
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
        {/* Modal Header */}
        <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-600 rounded-lg">
              <Layers className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-white">
                {scopeToEdit ? 'Edit Scope Line Item' : 'Add New Scope Line Item'}
              </h3>
              <p className="text-xs text-slate-400">
                Define the scope name, specification details, and target allocated budget.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-md transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
          {/* Phase Selection */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Project Phase *</label>
            <select
              value={phaseId}
              onChange={(e) => setPhaseId(e.target.value as PhaseId)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white cursor-pointer"
            >
              {PHASES.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} — {p.description}
                </option>
              ))}
            </select>
          </div>

          {/* Scope Name (Tender Form Name) */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Scope Name (Tender Form Name) *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Footing & Foundation, HVAC, Countertops..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white text-xs"
            />
          </div>

          {/* Detailed Line-Item Specification */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Description (Line-Item Specification)
            </label>
            <textarea
              rows={3}
              placeholder="e.g. Total for Foundation and Footing Walls (cribbing, rebar, window buckouts, labor) - excl. GST"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg font-normal text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white text-xs"
            />
          </div>

          {/* Budget Amount */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Target Allocated Budget Amount ($ CAD, excl. GST) *
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">$</span>
              <input
                type="number"
                required
                min="0"
                step="100"
                placeholder="25000"
                value={budgetAmount}
                onChange={(e) => setBudgetAmount(e.target.value)}
                className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-lg font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white text-xs"
              />
            </div>
          </div>

          {/* Scope Google Form Submission Link */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Scope Google Form Submission Link (Estimate Form)
            </label>
            <input
              type="url"
              placeholder="https://docs.google.com/forms/d/e/.../viewform"
              value={googleFormUrl}
              onChange={(e) => setGoogleFormUrl(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white text-xs"
            />
            <p className="text-[10px] text-slate-400 mt-1">
              Dynamic submission URL sent to contractors when dispatching invitations for this scope item.
            </p>
          </div>

          {/* Tender Deadline */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Default Tender Deadline
            </label>
            <input
              type="text"
              placeholder="e.g. September 2nd - 11:00 PM"
              value={tenderDeadline}
              onChange={(e) => setTenderDeadline(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white text-xs"
            />
          </div>

          {/* Required Scope Toggle */}
          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="scope-required-checkbox"
              checked={isRequired}
              onChange={(e) => setIsRequired(e.target.checked)}
              className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer"
            />
            <label htmlFor="scope-required-checkbox" className="text-xs font-semibold text-slate-700 cursor-pointer">
              Mark as Required Package Scope Item
            </label>
          </div>

          {/* Buttons */}
          <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors shadow-xs cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{scopeToEdit ? 'Update Scope Item' : 'Create Scope Item'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
