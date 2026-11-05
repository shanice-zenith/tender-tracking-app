warning: in the working copy of 'src/components/ScopeModal.tsx', LF will be replaced by CRLF the next time Git touches it
[1mdiff --git a/src/components/ScopeModal.tsx b/src/components/ScopeModal.tsx[m
[1mindex eae8b17..c7fffc6 100644[m
[1m--- a/src/components/ScopeModal.tsx[m
[1m+++ b/src/components/ScopeModal.tsx[m
[36m@@ -2,6 +2,7 @@[m [mimport React, { useState, useEffect } from 'react';[m
 import { X, Save, Layers, DollarSign, FileText } from 'lucide-react';[m
 import { ScopeLineItem, PhaseId } from '../types';[m
 import { PHASES } from '../data/initialTenderPackages';[m
[32m+[m[32mimport { X, Trash2 } from 'lucide-react';[m
 [m
 interface ScopeModalProps {[m
   isOpen: boolean;[m
[36m@@ -25,7 +26,9 @@[m [mexport const ScopeModal: React.FC<ScopeModalProps> = ({[m
   const [isRequired, setIsRequired] = useState(true);[m
   const [googleFormUrl, setGoogleFormUrl] = useState('');[m
   const [tenderDeadline, setTenderDeadline] = useState('');[m
[31m-[m
[32m+[m[32m  const [lineItems, setLineItems] = useState<{ id: string; costCode: string; description: string }[]>([[m
[32m+[m[32m    { id: 'spec-0', costCode: '', description: '' }[m
[32m+[m[32m  ]);[m
   useEffect(() => {[m
     if (scopeToEdit) {[m
       setName(scopeToEdit.name);[m
[36m@@ -35,7 +38,36 @@[m [mexport const ScopeModal: React.FC<ScopeModalProps> = ({[m
       setIsRequired(scopeToEdit.isRequired !== false);[m
       setGoogleFormUrl(scopeToEdit.googleFormUrl || '');[m
       setTenderDeadline(scopeToEdit.tenderDeadline || '');[m
[32m+[m
[32m+[m[32m      // 1. Load existing structured lineItems if present[m
[32m+[m[32m      if ((scopeToEdit as any).lineItems && Array.isArray((scopeToEdit as any).lineItems) && (scopeToEdit as any).lineItems.length > 0) {[m
[32m+[m[32m        setLineItems([m
[32m+[m[32m          (scopeToEdit as any).lineItems.map((item: any, idx: number) => ({[m
[32m+[m[32m            id: item.id || `spec-${Date.now()}-${idx}`,[m
[32m+[m[32m            costCode: item.costCode || (scopeToEdit as any).costCode || '',[m
[32m+[m[32m            description: item.description || ''[m
[32m+[m[32m          }))[m
[32m+[m[32m        );[m
[32m+[m[32m      }[m
[32m+[m[32m      // 2. Fallback: Parse existing multi-line description text into individual rows[m
[32m+[m[32m      else if (scopeToEdit.description) {[m
[32m+[m[32m        const lines = scopeToEdit.description.split('\n').map((l: string) => l.trim()).filter(Boolean);[m
[32m+[m[32m        if (lines.length > 0) {[m
[32m+[m[32m          setLineItems([m
[32m+[m[32m            lines.map((line: string, idx: number) => ({[m
[32m+[m[32m              id: `spec-${Date.now()}-${idx}`,[m
[32m+[m[32m              costCode: (scopeToEdit as any).costCode || '',[m
[32m+[m[32m              description: line[m
[32m+[m[32m            }))[m
[32m+[m[32m          );[m
[32m+[m[32m        } else {[m
[32m+[m[32m          setLineItems([{ id: `spec-${Date.now()}-0`, costCode: (scopeToEdit as any).costCode || '', description: '' }]);[m
[32m+[m[32m        }[m
[32m+[m[32m      } else {[m
[32m+[m[32m        setLineItems([{ id: `spec-${Date.now()}-0`, costCode: (scopeToEdit as any).costCode || '', description: '' }]);[m
[32m+[m[32m      }[m
     } else {[m
[32m+[m[32m      // Clean slate for creating a NEW scope[m
       setName('');[m
       setDescription('');[m
       setBudgetAmount('25000');[m
[36m@@ -43,185 +75,261 @@[m [mexport const ScopeModal: React.FC<ScopeModalProps> = ({[m
       setIsRequired(true);[m
       setGoogleFormUrl('');[m
       setTenderDeadline('');[m
[32m+[m[32m      setLineItems([{ id: `spec-${Date.now()}-0`, costCode: '', description: '' }]);[m
     }[m
   }, [scopeToEdit, activePhase, isOpen]);[m
 [m
[31m-  if (!isOpen) return null;[m
[32m+[m[32m  const handleAddLineItem = () => {[m
[32m+[m[32m    setLineItems(prev => [[m
[32m+[m[32m      ...prev,[m
[32m+[m[32m      { id: `spec-${Date.now()}-${prev.length}`, costCode: '', description: '' }[m
[32m+[m[32m    ]);[m
[32m+[m[32m  };[m
 [m
[32m+[m[32m  const handleUpdateLineItem = (id: string, field: 'costCode' | 'description', value: string) => {[m
[32m+[m[32m    setLineItems(prev => prev.map(item => item.id === id ? { ...item, [field]: value } : item));[m
[32m+[m[32m  };[m
[32m+[m
[32m+[m[32m  const handleRemoveLineItem = (id: string) => {[m
[32m+[m[32m    setLineItems(prev => prev.filter(item => item.id !== id));[m
[32m+[m[32m  };[m
[32m+[m
[32m+[m[32m  if (!isOpen) return null;[m
   const handleSubmit = (e: React.FormEvent) => {[m
     e.preventDefault();[m
[31m-    if (!name.trim()) return;[m
 [m
[31m-    onSaveScope({[m
[31m-      name: name.trim(),[m
[31m-      description: description.trim(),[m
[32m+[m[32m    // 1. Filter out empty linesSelect-String -Path src\components\TradeModal.tsx -Pattern "handleSubmit|onSave|onSubmit" -Context 2, 20[m
[32m+[m[32m    const validItems = lineItems.filter((i) => i.description.trim().length > 0);[m
[32m+[m
[32m+[m[32m    // 2. Compile lines into a newline-separated string for backwards compatibility[m
[32m+[m[32m    const compiledDescription = validItems.map((i) => i.description.trim()).join('\n');[m
[32m+[m
[32m+[m[32m    // 3. Pick the primary cost code (first line item's code or scope-level)[m
[32m+[m[32m    const primaryCostCode = validItems[0]?.costCode || (scopeToEdit as any)?.costCode || '';[m
[32m+[m
[32m+[m[32m    const payload = {[m
[32m+[m[32m      ...(scopeToEdit || {}),[m
[32m+[m[32m      id: scopeToEdit?.id || `scope-${Date.now()}`,[m
[32m+[m[32m      name,[m
[32m+[m[32m      costCode: primaryCostCode,[m
[32m+[m[32m      description: compiledDescription,[m
[32m+[m[32m      lineItems: validItems,[m
       budgetAmount: parseFloat(budgetAmount) || 0,[m
       phaseId,[m
       isRequired,[m
[31m-      googleFormUrl: googleFormUrl.trim(),[m
[31m-      tenderDeadline: tenderDeadline.trim()[m
[31m-    });[m
[32m+[m[32m      googleFormUrl,[m
[32m+[m[32m      tenderDeadline[m
[32m+[m[32m    };[m
[32m+[m
[32m+[m[32m    onSaveScope(payload);[m
     onClose();[m
[31m-  };[m
 [m
[31m-  return ([m
[31m-    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">[m
[31m-      <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">[m
[31m-        {/* Modal Header */}[m
[31m-        <div className="p-4 bg-slate-900 text-white flex items-center justify-between">[m
[31m-          <div className="flex items-center gap-2.5">[m
[31m-            <div className="p-2 bg-blue-600 rounded-lg">[m
[31m-              <Layers className="w-5 h-5 text-white" />[m
[31m-            </div>[m
[31m-            <div>[m
[31m-              <h3 className="font-bold text-sm text-white">[m
[31m-                {scopeToEdit ? 'Edit Scope Line Item' : 'Add New Scope Line Item'}[m
[31m-              </h3>[m
[31m-              <p className="text-xs text-slate-400">[m
[31m-                Define the scope name, specification details, and target allocated budget.[m
[31m-              </p>[m
[32m+[m[32m    return ([m
[32m+[m[32m      <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">[m
[32m+[m[32m        <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">[m
[32m+[m[32m          {/* Modal Header */}[m
[32m+[m[32m          <div className="p-4 bg-slate-900 text-white flex items-center justify-between">[m
[32m+[m[32m            <div className="flex items-center gap-2.5">[m
[32m+[m[32m              <div className="p-2 bg-blue-600 rounded-lg">[m
[32m+[m[32m                <Layers className="w-5 h-5 text-white" />[m
[32m+[m[32m              </div>[m
[32m+[m[32m   