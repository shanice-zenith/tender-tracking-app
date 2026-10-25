import React, { useState, useRef, useMemo } from 'react';
import { 
  X, 
  Upload, 
  FileText, 
  Plus, 
  Trash2, 
  Download, 
  Check, 
  AlertCircle, 
  CheckCircle2, 
  Table, 
  Clipboard, 
  Tag, 
  Sparkles,
  HelpCircle
} from 'lucide-react';
import { Contact } from '../types';
import { getCategoryBadgeStyle } from './ContactDirectoryModal';

interface BulkAddContactsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBulkAdd: (newContacts: Contact[]) => void;
  existingContacts: Contact[];
  availableCategories: string[];
}

interface GridRow {
  id: string;
  name: string;
  company: string;
  categories: string[];
  categoryInput: string;
  phone: string;
  email: string;
  notes: string;
}

export const BulkAddContactsModal: React.FC<BulkAddContactsModalProps> = ({
  isOpen,
  onClose,
  onBulkAdd,
  availableCategories
}) => {
  const [activeTab, setActiveTab] = useState<'paste' | 'grid'>('paste');

  // Paste / CSV Upload state
  const [rawText, setRawText] = useState('');
  const [defaultCategory, setDefaultCategory] = useState('General Contractor');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Quick Grid State (start with 3 blank rows)
  const [gridRows, setGridRows] = useState<GridRow[]>([
    { id: 'row-1', name: '', company: '', categories: ['Demo / Excavation'], categoryInput: '', phone: '', email: '', notes: '' },
    { id: 'row-2', name: '', company: '', categories: ['Plumbing / HVAC'], categoryInput: '', phone: '', email: '', notes: '' },
    { id: 'row-3', name: '', company: '', categories: ['Electrical'], categoryInput: '', phone: '', email: '', notes: '' }
  ]);

  // Helper to parse CSV or TSV lines
  const parseDelimitedText = (text: string): Contact[] => {
    const trimmed = text.trim();
    if (!trimmed) return [];

    const lines = trimmed.split(/\r?\n/).filter((l) => l.trim().length > 0);
    if (lines.length === 0) return [];

    const results: Contact[] = [];
    let startIndex = 0;

    // Detect if first row is header
    const firstLineLower = lines[0].toLowerCase();
    const hasHeader =
      firstLineLower.includes('name') ||
      firstLineLower.includes('company') ||
      firstLineLower.includes('trade') ||
      firstLineLower.includes('category') ||
      firstLineLower.includes('phone') ||
      firstLineLower.includes('email');

    if (hasHeader) {
      startIndex = 1;
    }

    for (let i = startIndex; i < lines.length; i++) {
      const line = lines[i];
      if (!line.trim()) continue;

      // Handle either Tab or Comma (respecting quotes for CSV)
      let cols: string[] = [];
      if (line.includes('\t')) {
        cols = line.split('\t').map((c) => c.trim().replace(/^["']|["']$/g, ''));
      } else {
        // Regex for CSV split handling quotes
        const csvRegex = /(?:,|\n|^)("(?:(?:"")*[^"]*)*"|[^",\n]*|(?:\n|$))/g;
        let match;
        const rowCols: string[] = [];
        while ((match = csvRegex.exec(line)) !== null) {
          let val = match[1] || '';
          if (val.startsWith('"') && val.endsWith('"')) {
            val = val.slice(1, -1).replace(/""/g, '"');
          }
          rowCols.push(val.trim());
          if (csvRegex.lastIndex >= line.length) break;
        }
        cols = rowCols.filter((_, idx) => idx < rowCols.length);
        if (cols.length === 0) {
          cols = line.split(',').map((s) => s.trim().replace(/^["']|["']$/g, ''));
        }
      }

      if (cols.length === 0) continue;

      const name = cols[0] || '';
      const company = cols[1] || '';
      const rawCategories = cols[2] || '';
      const phone = cols[3] || '';
      const email = cols[4] || '';
      const notes = cols[5] || '';

      // Skip empty rows without name or company
      if (!name && !company) continue;

      // Parse multi-categories from column (separated by ';' or ',' or '/')
      let parsedCategories: string[] = [];
      if (rawCategories) {
        parsedCategories = rawCategories
          .split(/[;,|/]/)
          .map((c) => c.trim())
          .filter(Boolean);
      }

      if (parsedCategories.length === 0) {
        parsedCategories = [defaultCategory];
      }

      results.push({
        id: `c-bulk-${Date.now()}-${i}-${Math.random().toString(36).substring(2, 6)}`,
        name: name || company || 'Contact Representative',
        company: company || name || 'Trade Contractor',
        category: parsedCategories.join(', '),
        categories: parsedCategories,
        trade_categories: parsedCategories,
        phone: phone || '',
        email: email || '',
        notes: notes || ''
      });
    }

    return results;
  };

  // Live parsed list from rawText
  const parsedPastedContacts = useMemo(() => {
    return parseDelimitedText(rawText);
  }, [rawText, defaultCategory]);

  // Valid rows from Quick Grid
  const validGridContacts = useMemo(() => {
    const list: Contact[] = [];
    gridRows.forEach((row, idx) => {
      if (row.name.trim() || row.company.trim()) {
        const finalCats = row.categories.length > 0 ? row.categories : [defaultCategory];
        list.push({
          id: `c-grid-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 6)}`,
          name: row.name.trim() || row.company.trim() || 'Contact Representative',
          company: row.company.trim() || row.name.trim() || 'Trade Contractor',
          category: finalCats.join(', '),
          categories: finalCats,
          trade_categories: finalCats,
          phone: row.phone.trim(),
          email: row.email.trim(),
          notes: row.notes.trim()
        });
      }
    });
    return list;
  }, [gridRows, defaultCategory]);

  // File upload handler
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        setRawText(content);
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Sample CSV Download Template
  const downloadSampleTemplate = () => {
    const sampleCsv = `Name,Company,Trade Categories,Phone,Email,Notes
John O'Boyle,Clover Hill Construction,Demo / Excavation; Water / Offsite Services,403-404-5080,oboyle1179@hotmail.com,Primary deep services contractor
Mike Campbell,Campbell Construction,Framing / Structural; Drywall / Insulation,403-555-0199,mike@campbellconst.ca,High quality framing crew
Sarah Jenkins,Apex Electrical Solutions,Electrical,403-555-0144,sjenkins@apexelectric.ca,Commercial & residential certified
Dave Miller,Peak Plumbing & HVAC,Plumbing / HVAC,403-555-0177,dave@peakplumbing.ca,Hydronic & forced air specialist`;

    const blob = new Blob([sampleCsv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'Tender_Bulk_Contacts_Template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Quick Grid Handlers
  const handleAddGridRows = (count: number = 1) => {
    const newRows: GridRow[] = Array.from({ length: count }).map((_, i) => ({
      id: `row-${Date.now()}-${i}-${Math.random().toString(36).substring(2, 5)}`,
      name: '',
      company: '',
      categories: [defaultCategory],
      categoryInput: '',
      phone: '',
      email: '',
      notes: ''
    }));
    setGridRows((prev) => [...prev, ...newRows]);
  };

  const handleUpdateGridRow = (id: string, field: keyof GridRow, value: any) => {
    setGridRows((prev) =>
      prev.map((row) => (row.id === id ? { ...row, [field]: value } : row))
    );
  };

  const handleDeleteGridRow = (id: string) => {
    setGridRows((prev) => prev.filter((row) => row.id !== id));
  };

  const handleAddGridTag = (rowId: string, tag: string) => {
    const trimmed = tag.trim();
    if (!trimmed) return;
    setGridRows((prev) =>
      prev.map((row) => {
        if (row.id !== rowId) return row;
        if (!row.categories.includes(trimmed)) {
          return {
            ...row,
            categories: [...row.categories, trimmed],
            categoryInput: ''
          };
        }
        return { ...row, categoryInput: '' };
      })
    );
  };

  const handleRemoveGridTag = (rowId: string, tagToRemove: string) => {
    setGridRows((prev) =>
      prev.map((row) => {
        if (row.id !== rowId) return row;
        return {
          ...row,
          categories: row.categories.filter((t) => t !== tagToRemove)
        };
      })
    );
  };

  // Submit Handler
  const handleExecuteImport = () => {
    const contactsToAdd = activeTab === 'paste' ? parsedPastedContacts : validGridContacts;
    if (contactsToAdd.length === 0) return;

    onBulkAdd(contactsToAdd);
    onClose();
  };

  const currentCount = activeTab === 'paste' ? parsedPastedContacts.length : validGridContacts.length;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-60 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150">
      <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-600 rounded-xl">
              <Upload className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                Bulk Add & Import Contacts
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Paste spreadsheet rows, upload CSV files, or use the rapid multi-row entry grid.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation & Default Category Selector */}
        <div className="px-5 pt-3 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              id="tab-csv-paste-btn"
              onClick={() => setActiveTab('paste')}
              className={`inline-flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-t-lg border-b-2 transition-all cursor-pointer ${
                activeTab === 'paste'
                  ? 'border-blue-600 text-blue-600 bg-white shadow-2xs'
                  : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Clipboard className="w-3.5 h-3.5" />
              <span>Paste or Upload CSV</span>
              {parsedPastedContacts.length > 0 && (
                <span className="px-1.5 py-0.2 bg-blue-100 text-blue-700 rounded-full text-[10px] font-bold">
                  {parsedPastedContacts.length}
                </span>
              )}
            </button>

            <button
              type="button"
              id="tab-quick-grid-btn"
              onClick={() => setActiveTab('grid')}
              className={`inline-flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-t-lg border-b-2 transition-all cursor-pointer ${
                activeTab === 'grid'
                  ? 'border-blue-600 text-blue-600 bg-white shadow-2xs'
                  : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Table className="w-3.5 h-3.5" />
              <span>Multi-Row Quick Grid</span>
              {validGridContacts.length > 0 && (
                <span className="px-1.5 py-0.2 bg-blue-100 text-blue-700 rounded-full text-[10px] font-bold">
                  {validGridContacts.length}
                </span>
              )}
            </button>
          </div>

          <div className="flex items-center gap-2 pb-2">
            <span className="text-[11px] font-semibold text-slate-600">Default Category if empty:</span>
            <select
              value={defaultCategory}
              onChange={(e) => setDefaultCategory(e.target.value)}
              className="text-xs bg-white border border-slate-300 rounded-md px-2 py-1 text-slate-800 font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
            >
              {availableCategories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Tab 1: Paste or Upload CSV */}
        {activeTab === 'paste' && (
          <div className="p-5 flex-1 overflow-y-auto space-y-4 text-xs">
            {/* Top Toolbar Actions for CSV */}
            <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-blue-50/70 border border-blue-200 rounded-xl">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-blue-600 shrink-0" />
                <span className="text-[11px] text-blue-900 font-medium">
                  Supports copy-pasting from Excel, Google Sheets, or standard CSV format:
                  <strong className="ml-1 text-blue-950 font-bold">Name, Company, Trade Categories, Phone, Email, Notes</strong>
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={downloadSampleTemplate}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-md transition-colors shadow-2xs cursor-pointer"
                  title="Download CSV format template"
                >
                  <Download className="w-3.5 h-3.5 text-blue-600" />
                  <span>Download Sample CSV</span>
                </button>

                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  accept=".csv,.txt,.tsv"
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white rounded-md transition-colors shadow-2xs cursor-pointer"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Upload .CSV File</span>
                </button>
              </div>
            </div>

            {/* Paste Area */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Paste Spreadsheet Rows or CSV Text:
              </label>
              <textarea
                rows={5}
                value={rawText}
                onChange={(e) => setRawText(e.target.value)}
                placeholder={`Example:\nJohn O'Boyle\tClover Hill Construction\tDemo / Excavation, Water / Offsite Services\t403-404-5080\toboyle1179@hotmail.com\tPrimary deep services\nMike Campbell\tCampbell Construction\tFraming / Structural\t403-555-0199\tmike@campbellconst.ca\tFraming lead`}
                className="w-full p-3 font-mono text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-slate-400 resize-y"
              />
              {rawText && (
                <div className="flex justify-end mt-1">
                  <button
                    type="button"
                    onClick={() => setRawText('')}
                    className="text-[11px] text-slate-500 hover:text-rose-600 underline font-medium cursor-pointer"
                  >
                    Clear Text
                  </button>
                </div>
              )}
            </div>

            {/* Parsed Live Preview Table */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Live Preview & Verified Rows ({parsedPastedContacts.length})</span>
                </h3>
                {parsedPastedContacts.length > 0 && (
                  <span className="text-[11px] text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                    {parsedPastedContacts.length} valid contacts ready to import
                  </span>
                )}
              </div>

              {parsedPastedContacts.length === 0 ? (
                <div className="p-8 border border-dashed border-slate-300 rounded-xl text-center text-slate-400 bg-slate-50">
                  <FileText className="w-8 h-8 mx-auto mb-2 opacity-40 text-slate-500" />
                  <p className="text-xs font-semibold text-slate-600">No contacts parsed yet</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Paste text above or upload a CSV file to inspect the detected columns.
                  </p>
                </div>
              ) : (
                <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs max-h-56 overflow-y-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead className="sticky top-0 bg-slate-100 border-b border-slate-200 text-[10px] font-bold text-slate-600 uppercase tracking-wider">
                      <tr>
                        <th className="py-2 px-3">#</th>
                        <th className="py-2 px-3">Name</th>
                        <th className="py-2 px-3">Company</th>
                        <th className="py-2 px-3">Trade Categories</th>
                        <th className="py-2 px-3">Phone</th>
                        <th className="py-2 px-3">Email</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {parsedPastedContacts.map((contact, idx) => {
                        const cats = contact.categories || [];
                        return (
                          <tr key={contact.id} className="hover:bg-slate-50">
                            <td className="py-2 px-3 text-slate-400 font-mono text-[11px]">{idx + 1}</td>
                            <td className="py-2 px-3 font-bold text-slate-900">{contact.name}</td>
                            <td className="py-2 px-3 font-semibold text-slate-800">{contact.company}</td>
                            <td className="py-2 px-3">
                              <div className="flex flex-wrap gap-1">
                                {cats.map((cat) => {
                                  const style = getCategoryBadgeStyle(cat);
                                  return (
                                    <span
                                      key={cat}
                                      className={`inline-block px-1.5 py-0.2 text-[10px] font-bold border rounded ${style.bg} ${style.text} ${style.border}`}
                                    >
                                      {cat}
                                    </span>
                                  );
                                })}
                              </div>
                            </td>
                            <td className="py-2 px-3 text-slate-600">{contact.phone || '—'}</td>
                            <td className="py-2 px-3 text-blue-600 truncate max-w-[150px]">{contact.email || '—'}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 2: Quick Multi-Row Grid */}
        {activeTab === 'grid' && (
          <div className="p-5 flex-1 overflow-y-auto space-y-3 text-xs">
            <div className="flex items-center justify-between">
              <p className="text-slate-600 text-[11px]">
                Directly enter contractor details into multiple rows. Rows with a Name or Company will be saved.
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleAddGridRows(1)}
                  className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 rounded-md cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+1 Row</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleAddGridRows(5)}
                  className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-300 rounded-md cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+5 Rows</span>
                </button>
              </div>
            </div>

            {/* Editable Rows Table */}
            <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="bg-slate-100 border-b border-slate-200 text-[10px] font-bold text-slate-600 uppercase tracking-wider">
                  <tr>
                    <th className="py-2.5 px-3 w-8">#</th>
                    <th className="py-2.5 px-3 w-40">Name *</th>
                    <th className="py-2.5 px-3 w-40">Company *</th>
                    <th className="py-2.5 px-3">Trade Categories (Tags)</th>
                    <th className="py-2.5 px-3 w-32">Phone</th>
                    <th className="py-2.5 px-3 w-36">Email</th>
                    <th className="py-2.5 px-2 w-10 text-center"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {gridRows.map((row, index) => (
                    <tr key={row.id} className="hover:bg-slate-50/50">
                      <td className="py-2 px-3 text-slate-400 font-mono text-[11px]">{index + 1}</td>

                      {/* Name */}
                      <td className="py-2 px-3">
                        <input
                          type="text"
                          placeholder="Contact Name"
                          value={row.name}
                          onChange={(e) => handleUpdateGridRow(row.id, 'name', e.target.value)}
                          className="w-full px-2 py-1 text-xs bg-slate-50 border border-slate-200 rounded focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium"
                        />
                      </td>

                      {/* Company */}
                      <td className="py-2 px-3">
                        <input
                          type="text"
                          placeholder="Company Name"
                          value={row.company}
                          onChange={(e) => handleUpdateGridRow(row.id, 'company', e.target.value)}
                          className="w-full px-2 py-1 text-xs bg-slate-50 border border-slate-200 rounded focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium"
                        />
                      </td>

                      {/* Categories Tag Selector */}
                      <td className="py-2 px-3 min-w-[200px]">
                        <div className="space-y-1.5">
                          <div className="flex flex-wrap gap-1">
                            {row.categories.map((cat) => {
                              const style = getCategoryBadgeStyle(cat);
                              return (
                                <span
                                  key={cat}
                                  className={`inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[10px] font-bold border ${style.bg} ${style.text} ${style.border}`}
                                >
                                  <span>{cat}</span>
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveGridTag(row.id, cat)}
                                    className="text-slate-400 hover:text-rose-600 ml-0.5 cursor-pointer"
                                  >
                                    <X className="w-2.5 h-2.5" />
                                  </button>
                                </span>
                              );
                            })}
                          </div>
                          <div className="flex items-center gap-1">
                            <select
                              value=""
                              onChange={(e) => {
                                if (e.target.value) handleAddGridTag(row.id, e.target.value);
                              }}
                              className="text-[11px] bg-slate-50 border border-slate-200 rounded px-1.5 py-0.5 text-slate-600 focus:outline-none"
                            >
                              <option value="">+ Add tag...</option>
                              {availableCategories
                                .filter((c) => !row.categories.includes(c))
                                .map((c) => (
                                  <option key={c} value={c}>
                                    {c}
                                  </option>
                                ))}
                            </select>
                          </div>
                        </div>
                      </td>

                      {/* Phone */}
                      <td className="py-2 px-3">
                        <input
                          type="text"
                          placeholder="Phone"
                          value={row.phone}
                          onChange={(e) => handleUpdateGridRow(row.id, 'phone', e.target.value)}
                          className="w-full px-2 py-1 text-xs bg-slate-50 border border-slate-200 rounded focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      </td>

                      {/* Email */}
                      <td className="py-2 px-3">
                        <input
                          type="email"
                          placeholder="Email"
                          value={row.email}
                          onChange={(e) => handleUpdateGridRow(row.id, 'email', e.target.value)}
                          className="w-full px-2 py-1 text-xs bg-slate-50 border border-slate-200 rounded focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      </td>

                      {/* Delete Row */}
                      <td className="py-2 px-2 text-center">
                        <button
                          type="button"
                          onClick={() => handleDeleteGridRow(row.id)}
                          className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors cursor-pointer"
                          title="Remove Row"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="pt-1 flex justify-start">
              <button
                type="button"
                onClick={() => handleAddGridRows(1)}
                className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-800 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add another contractor row</span>
              </button>
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div className="p-4 bg-slate-100 border-t border-slate-200 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <span className="text-slate-600">
              Ready to import: <strong className="text-slate-900">{currentCount} contacts</strong>
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 font-semibold bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 rounded-lg cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="button"
              id="confirm-bulk-import-btn"
              onClick={handleExecuteImport}
              disabled={currentCount === 0}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 font-semibold bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-lg shadow-xs transition-colors cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>Import {currentCount} Contacts</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
