import React, { useState, useEffect } from 'react';
import { X, Save, Trash2, Plus } from 'lucide-react';
import { ScopeLineItem, PhaseId } from '../types';

interface ScopeModalProps {
  isOpen: boolean;
  activePhase: PhaseId;
  scopeToEdit: ScopeLineItem | null;
  onClose: () => void;
  onSaveScope: (scopeData: Partial<ScopeLineItem>) => void;
}

const PHASES: { id: PhaseId; label: string }[] = [
  { id: '1A', label: 'Phase 1A — Civil, Structure, Foundation & Envelope' },
  { id: '1B', label: 'Phase 1B — Mechanical & Electrical Infrastructure' },
  { id: '2A', label: 'Phase 2A — Interior Architecture, Fixtures, Appliances & Major Materials' },
  { id: '2B', label: 'Phase 2B — Millwork, Specialty Finishing & Landscaping' },
];

export const ScopeModal: React.FC<ScopeModalProps> = ({
  isOpen,
  activePhase,
  scopeToEdit,
  onClose,
  onSaveScope,
}) => {
  const [phaseId, setPhaseId] = useState<PhaseId>(activePhase);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [budgetAmount, setBudgetAmount] = useState('25000');
  const [googleFormUrl, setGoogleFormUrl] = useState('');
  const [tenderDeadline, setTenderDeadline] = useState('');
  const [isRequired, setIsRequired] = useState(true);

  const [lineItems, setLineItems] = useState<{ id: string; costCode: string; description: string }[]>([
    { id: 'spec-0', costCode: '', description: '' },
  ]);

  useEffect(() => {
    if (scopeToEdit) {
      setName(scopeToEdit.name || '');
      setDescription(scopeToEdit.description || '');
      setBudgetAmount(scopeToEdit.budgetAmount ? scopeToEdit.budgetAmount.toString() : '25000');
      setPhaseId(scopeToEdit.phaseId || activePhase);
      setIsRequired(scopeToEdit.isRequired !== false);
      setGoogleFormUrl(scopeToEdit.googleFormUrl || '');
      setTenderDeadline(scopeToEdit.tenderDeadline || '');

      // Load existing structured lineItems or parse description lines
      if ((scopeToEdit as any).lineItems && Array.isArray((scopeToEdit as any).lineItems) && (scopeToEdit as any).lineItems.length > 0) {
        setLineItems(
          (scopeToEdit as any).lineItems.map((item: any, idx: number) => ({
            id: item.id || `spec-${Date.now()}-${idx}`,
            costCode: item.costCode || (scopeToEdit as any).costCode || '',
            description: item.description || '',
          }))
        );
      } else if (scopeToEdit.description) {
        const lines = scopeToEdit.description.split('\n').map((l: string) => l.trim()).filter(Boolean);
        if (lines.length > 0) {
          setLineItems(
            lines.map((line: string, idx: number) => ({
              id: `spec-${Date.now()}-${idx}`,
              costCode: (scopeToEdit as any).costCode || '',
              description: line,
            }))
          );
        } else {
          setLineItems([{ id: `spec-${Date.now()}-0`, costCode: (scopeToEdit as any).costCode || '', description: '' }]);
        }
      } else {
        setLineItems([{ id: `spec-${Date.now()}-0`, costCode: (scopeToEdit as any).costCode || '', description: '' }]);
      }
    } else {
      setName('');
      setDescription('');
      setBudgetAmount('25000');
      setPhaseId(activePhase);
      setIsRequired(true);
      setGoogleFormUrl('');
      setTenderDeadline('');
      setLineItems([{ id: `spec-${Date.now()}-0`, costCode: '', description: '' }]);
    }
  }, [scopeToEdit, activePhase, isOpen]);

  const handleAddLineItem = () => {
    setLineItems((prev) => [
      ...prev,
      { id: `spec-${Date.now()}-${prev.length}`, costCode: '', description: '' },
    ]);
  };

  const handleUpdateLineItem = (id: string, field: 'costCode' | 'description', value: string) => {
    setLineItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    );
  };

  const handleRemoveLineItem = (id: string) => {
    setLineItems((prev) => prev.filter((item) => item.id !== id));
  };

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      alert('Please enter a Scope Name.');
      return;
    }

    const validItems = lineItems.filter((i) => i.description.trim().length > 0);
    const compiledDescription = validItems.map((i) => i.description.trim()).join('\n');
    const primaryCostCode = validItems[0]?.costCode || (scopeToEdit as any)?.costCode || '20000';

    const payload: Partial<ScopeLineItem> = {
      ...(scopeToEdit || {}),
      id: scopeToEdit?.id || `scope-${Date.now()}`,
      name: name.trim(),
      costCode: primaryCostCode,
      description: compiledDescription || description.trim(),
      lineItems: validItems,
      budgetAmount: parseFloat(budgetAmount) || 0,
      phaseId,
      isRequired,
      googleFormUrl: googleFormUrl.trim(),
      tenderDeadline: tenderDeadline.trim(),
      trades: scopeToEdit?.trades || [],
    };

    onSaveScope(payload);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="relative w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-900 text-white">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
              <Save className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">
                {scopeToEdit ? 'Edit Scope Line Item' : 'Add New Scope Line Item'}
              </h2>
              <p className="text-[11px] text-slate-400">
                Define the scope name, specification details, and target allocated budget.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1 text-xs">
          {/* Phase */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Project Phase *</label>
            <select
              value={phaseId}
              onChange={(e) => setPhaseId(e.target.value as PhaseId)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
            >
              {PHASES.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>

          {/* Scope Name */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Scope Name (Tender Form Name) *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Flooring Material & Labour"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
            />
          </div>

          {/* Line-Item Specifications */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-slate-700">
                Line-Item Specifications (Tender Questions & Cost Codes) *
              </label>
              <button
                type="button"
                onClick={handleAddLineItem}
                className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" /> Add Line Item
              </button>
            </div>

            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {lineItems.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg p-2"
                >
                  <div className="w-24 shrink-0">
                    <input
                      type="text"
                      value={item.costCode}
                      onChange={(e) => handleUpdateLineItem(item.id, 'costCode', e.target.value)}
                      placeholder="Cost Code"
                      className="w-full bg-white border border-slate-200 rounded px-2 py-1 text-xs text-slate-700 font-mono focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div className="flex-1">
                    <input
                      type="text"
                      value={item.description}
                      onChange={(e) => handleUpdateLineItem(item.id, 'description', e.target.value)}
                      placeholder="e.g. Total for all flooring material (excl. GST)"
                      className="w-full bg-white border border-slate-200 rounded px-2 py-1 text-xs text-slate-800 focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => handleRemoveLineItem(item.id)}
                    disabled={lineItems.length === 1}
                    className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                    title="Remove item"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
            <p className="text-[11px] text-slate-400">
              Each line item will map directly to a question column on your Google Form.
            </p>
          </div>

          {/* Budget */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Target Allocated Budget Amount ($ CAD, excl. GST) *
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2 text-slate-400 font-bold">$</span>
              <input
                type="number"
                required
                value={budgetAmount}
                onChange={(e) => setBudgetAmount(e.target.value)}
                placeholder="25000"
                className="w-full pl-7 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-800 font-bold focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Google Form Submission Link */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Scope Google Form Submission Link (Estimate Form)
            </label>
            <input
              type="url"
              value={googleFormUrl}
              onChange={(e) => setGoogleFormUrl(e.target.value)}
              placeholder="https://docs.google.com/forms/d/e/.../viewform"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-800 font-mono text-[11px] focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Tender Deadline */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Default Tender Deadline
            </label>
            <input
              type="text"
              value={tenderDeadline}
              onChange={(e) => setTenderDeadline(e.target.value)}
              placeholder="e.g. September 2nd - 11:00 PM"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
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

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg text-xs font-semibold hover:bg-slate-50 cursor-pointer"
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