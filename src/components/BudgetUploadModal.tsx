import React, { useState, useRef } from 'react';
import { 
  X, 
  Upload, 
  FileText, 
  FileSpreadsheet, 
  Sparkles, 
  AlertCircle, 
  CheckCircle2, 
  Loader2, 
  ArrowRight,
  HelpCircle
} from 'lucide-react';
import { Project } from '../types';
import { 
  parseBudgetFile, 
  getSampleBudgetExtraction, 
  BudgetExtractionResult 
} from '../services/budgetExtractionService';

interface BudgetUploadModalProps {
  isOpen: boolean;
  activeProject: Project | null;
  onClose: () => void;
  onExtractionComplete: (result: BudgetExtractionResult) => void;
}

export const BudgetUploadModal: React.FC<BudgetUploadModalProps> = ({
  isOpen,
  activeProject,
  onClose,
  onExtractionComplete
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showSyntaxGuide, setShowSyntaxGuide] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen || !activeProject) return null;

  const handleFileChange = async (file: File) => {
    setSelectedFile(file);
    setErrorMessage(null);
    setIsProcessing(true);

    try {
      const result = await parseBudgetFile(file, activeProject);
      setIsProcessing(false);
      onExtractionComplete(result);
      onClose();
    } catch (err: any) {
      setIsProcessing(false);
      setErrorMessage(
        err.message || 'Failed to extract cost codes and amounts from file. Please ensure it contains 5-digit codes (e.g. 20020) and dollar amounts.'
      );
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      handleFileChange(file);
    }
  };

  const handleUseSample = () => {
    setIsProcessing(true);
    setErrorMessage(null);
    setTimeout(() => {
      try {
        const result = getSampleBudgetExtraction(activeProject);
        setIsProcessing(false);
        onExtractionComplete(result);
        onClose();
      } catch (err: any) {
        setIsProcessing(false);
        setErrorMessage(err.message || 'Failed to load sample budget.');
      }
    }, 400);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="bg-slate-900 border border-slate-800 rounded-2xl max-w-xl w-full shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white">
                Upload Project Budget
              </h2>
              <p className="text-xs text-slate-400">
                Automated 5-digit cost code extraction &amp; target budget allocation
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5">
          {/* Project Target Banner */}
          <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-3.5 flex items-center justify-between text-xs">
            <div>
              <span className="text-slate-400 font-medium">Target Project: </span>
              <span className="text-white font-semibold">{activeProject.name}</span>
              <span className="ml-1.5 px-2 py-0.5 rounded-md bg-slate-700 text-slate-300 font-mono text-[10px]">
                {activeProject.code}
              </span>
            </div>
            <div className="text-right">
              <span className="text-slate-400">Active Scopes: </span>
              <span className="text-amber-400 font-bold font-mono">{activeProject.scopes.length}</span>
            </div>
          </div>

          {/* Hidden File Input */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.csv,.txt"
            className="hidden"
            onChange={(e) => {
              if (e.target.files && e.target.files.length > 0) {
                handleFileChange(e.target.files[0]);
              }
            }}
          />

          {/* Drag and Drop Zone */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => !isProcessing && fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${
              isDragging
                ? 'border-amber-400 bg-amber-500/10 scale-[0.99]'
                : 'border-slate-700 hover:border-slate-500 hover:bg-slate-800/40 bg-slate-900/40'
            } ${isProcessing ? 'pointer-events-none opacity-60' : ''}`}
          >
            <div className="flex flex-col items-center justify-center gap-3">
              <div className="w-14 h-14 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300 group-hover:scale-105 transition-transform shadow-inner">
                {isProcessing ? (
                  <Loader2 className="w-7 h-7 text-amber-400 animate-spin" />
                ) : (
                  <div className="flex items-center gap-1">
                    <FileText className="w-6 h-6 text-rose-400" />
                    <span className="text-xs font-bold text-slate-500">/</span>
                    <FileSpreadsheet className="w-6 h-6 text-emerald-400" />
                  </div>
                )}
              </div>

              {isProcessing ? (
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-white">
                    Parsing Document &amp; Extracting Cost Codes...
                  </p>
                  <p className="text-xs text-slate-400">
                    Applying regex <code className="text-amber-300 bg-slate-800 px-1 py-0.5 rounded font-mono text-[11px]">\b\d&#123;5&#125;\b</code> to match budget amounts
                  </p>
                </div>
              ) : (
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-white">
                    Drag &amp; drop budget file here, or <span className="text-amber-400 underline underline-offset-2">browse</span>
                  </p>
                  <p className="text-xs text-slate-400">
                    Supports <span className="font-semibold text-slate-300">PDF (.pdf)</span>, <span className="font-semibold text-slate-300">CSV (.csv)</span>, or Plaintext schedules
                  </p>
                </div>
              )}

              <div className="flex items-center gap-2 mt-1">
                <span className="px-2 py-0.5 text-[10px] font-semibold bg-rose-500/10 text-rose-300 border border-rose-500/20 rounded-md">
                  PDF Schedules
                </span>
                <span className="px-2 py-0.5 text-[10px] font-semibold bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 rounded-md">
                  Master Budget CSV
                </span>
                <span className="px-2 py-0.5 text-[10px] font-semibold bg-blue-500/10 text-blue-300 border border-blue-500/20 rounded-md">
                  Regex Extractor
                </span>
              </div>
            </div>
          </div>

          {/* Error Message */}
          {errorMessage && (
            <div className="p-3.5 bg-rose-500/10 border border-rose-500/20 rounded-xl flex items-start gap-2.5 text-xs text-rose-300">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-semibold">Extraction Incomplete</p>
                <p className="text-rose-300/90 mt-0.5">{errorMessage}</p>
              </div>
            </div>
          )}

          {/* Instant 1-Click Sample Test Action */}
          <div className="bg-slate-800/40 border border-slate-700/60 rounded-xl p-4 flex items-center justify-between">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-white">Want to test with sample data?</span>
                <span className="px-1.5 py-0.5 text-[10px] font-bold bg-amber-500/20 text-amber-300 rounded">
                  Demo Ready
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Load 20020 ($42k), 20040 ($95k), 20320 ($200k), and multi-code DSSP items.
              </p>
            </div>
            <button
              type="button"
              onClick={handleUseSample}
              disabled={isProcessing}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-lg transition-colors cursor-pointer shadow-xs disabled:opacity-50"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Load Sample</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Syntax / Format Guidelines Collapsible */}
          <div className="border border-slate-800 rounded-xl overflow-hidden text-xs">
            <button
              type="button"
              onClick={() => setShowSyntaxGuide(!showSyntaxGuide)}
              className="w-full px-4 py-2.5 bg-slate-800/30 flex items-center justify-between text-slate-300 hover:text-white transition-colors cursor-pointer"
            >
              <span className="flex items-center gap-2 font-medium">
                <HelpCircle className="w-3.5 h-3.5 text-slate-400" />
                How Cost Code Extraction Works
              </span>
              <span className="text-[11px] text-slate-500">
                {showSyntaxGuide ? 'Hide details' : 'View pattern rules'}
              </span>
            </button>

            {showSyntaxGuide && (
              <div className="p-4 bg-slate-900/50 space-y-3 text-slate-300 border-t border-slate-800/80 font-sans">
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  The parser uses regular expressions to find 5-digit construction cost codes (<code className="text-amber-300 bg-slate-800 px-1 py-0.5 rounded font-mono text-[10px]">\b\d&#123;5&#125;\b</code>) and pairs them with adjacent dollar amounts.
                </p>
                <div className="bg-slate-950 p-3 rounded-lg space-y-1.5 font-mono text-[11px] border border-slate-800 text-slate-300">
                  <div className="flex items-center justify-between text-emerald-400">
                    <span>20020 Demolition $42,000.00</span>
                    <span className="text-[10px] text-slate-500 font-sans">➔ Scope Target: $42k</span>
                  </div>
                  <div className="flex items-center justify-between text-emerald-400">
                    <span>20040 Excavation &amp; Backfill $95,000.00</span>
                    <span className="text-[10px] text-slate-500 font-sans">➔ Scope Target: $95k</span>
                  </div>
                  <div className="flex items-center justify-between text-emerald-400">
                    <span>20320 Framing Labour $200,000.00</span>
                    <span className="text-[10px] text-slate-500 font-sans">➔ Scope Target: $200k</span>
                  </div>
                  <div className="text-[10px] text-amber-300/90 pt-1 border-t border-slate-800 font-sans">
                    Multi-code scopes (e.g. 20120, 20140, 20150) automatically sum matching amounts into one combined target.
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-slate-800 bg-slate-900/60 flex items-center justify-between">
          <span className="text-[11px] text-slate-500">
            Preview &amp; reconcile items before saving
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors cursor-pointer"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};
