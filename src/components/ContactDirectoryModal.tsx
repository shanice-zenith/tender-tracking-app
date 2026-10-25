import React, { useState, useMemo, useRef, useEffect } from 'react';
import { 
  X, 
  Search, 
  Plus, 
  Edit3, 
  Trash2, 
  Phone, 
  Mail, 
  Users, 
  Check, 
  Download, 
  Filter, 
  Save, 
  Tag, 
  CheckSquare, 
  Square, 
  AlertTriangle,
  Layers,
  ChevronDown,
  UserPlus
} from 'lucide-react';
import { Contact } from '../types';
import { BulkAddContactsModal } from './BulkAddContactsModal';

interface ContactDirectoryModalProps {
  isOpen: boolean;
  contacts: Contact[];
  onClose: () => void;
  onSaveContact: (contact: Contact) => void;
  onDeleteContact: (contactId: string) => void;
  onBulkDeleteContacts?: (contactIds: string[]) => void;
  onBulkUpdateCategories?: (contactIds: string[], categories: string[], mode: 'add' | 'replace') => void;
  onBulkAddContacts?: (newContacts: Contact[]) => void;
}

// Helper to normalize and get contact categories
export function getContactCategories(contact: Contact): string[] {
  if (Array.isArray(contact.categories) && contact.categories.length > 0) {
    return contact.categories;
  }
  if (Array.isArray(contact.trade_categories) && contact.trade_categories.length > 0) {
    return contact.trade_categories;
  }
  if (contact.category && typeof contact.category === 'string') {
    // If it's a comma-separated list
    if (contact.category.includes(',')) {
      return contact.category.split(',').map((s) => s.trim()).filter(Boolean);
    }
    return [contact.category.trim()].filter(Boolean);
  }
  return [];
}

// Distinct, high-contrast tag color palettes
const CATEGORY_COLORS: { [key: string]: { bg: string; text: string; border: string } } = {
  'Demo / Excavation': { bg: 'bg-amber-50', text: 'text-amber-800', border: 'border-amber-200' },
  'Water / Offsite Services': { bg: 'bg-sky-50', text: 'text-sky-800', border: 'border-sky-200' },
  'DSSP Material Supply': { bg: 'bg-blue-50', text: 'text-blue-800', border: 'border-blue-200' },
  'Foundation / Concrete': { bg: 'bg-slate-100', text: 'text-slate-800', border: 'border-slate-300' },
  'Framing / Structural': { bg: 'bg-indigo-50', text: 'text-indigo-800', border: 'border-indigo-200' },
  'Roofing / Waterproofing': { bg: 'bg-cyan-50', text: 'text-cyan-800', border: 'border-cyan-200' },
  'Plumbing / HVAC': { bg: 'bg-emerald-50', text: 'text-emerald-800', border: 'border-emerald-200' },
  'Electrical': { bg: 'bg-yellow-50', text: 'text-yellow-800', border: 'border-yellow-200' },
  'Drywall / Insulation': { bg: 'bg-teal-50', text: 'text-teal-800', border: 'border-teal-200' },
  'Millwork / Cabinetry': { bg: 'bg-rose-50', text: 'text-rose-800', border: 'border-rose-200' },
  'Flooring / Tile': { bg: 'bg-purple-50', text: 'text-purple-800', border: 'border-purple-200' },
  'Painting': { bg: 'bg-fuchsia-50', text: 'text-fuchsia-800', border: 'border-fuchsia-200' },
  'Glazing / Windows': { bg: 'bg-blue-50', text: 'text-blue-800', border: 'border-blue-200' },
  'Landscaping / Fencing': { bg: 'bg-emerald-50', text: 'text-emerald-800', border: 'border-emerald-200' },
  'Exterior Railing': { bg: 'bg-slate-100', text: 'text-slate-800', border: 'border-slate-300' },
  'Appliances': { bg: 'bg-orange-50', text: 'text-orange-800', border: 'border-orange-200' },
  'General Contractor': { bg: 'bg-slate-100', text: 'text-slate-800', border: 'border-slate-200' }
};

const DEFAULT_COLOR_PALETTES = [
  { bg: 'bg-slate-100', text: 'text-slate-800', border: 'border-slate-200' },
  { bg: 'bg-blue-50', text: 'text-blue-800', border: 'border-blue-200' },
  { bg: 'bg-emerald-50', text: 'text-emerald-800', border: 'border-emerald-200' },
  { bg: 'bg-amber-50', text: 'text-amber-800', border: 'border-amber-200' },
  { bg: 'bg-purple-50', text: 'text-purple-800', border: 'border-purple-200' },
  { bg: 'bg-indigo-50', text: 'text-indigo-800', border: 'border-indigo-200' },
  { bg: 'bg-rose-50', text: 'text-rose-800', border: 'border-rose-200' },
  { bg: 'bg-teal-50', text: 'text-teal-800', border: 'border-teal-200' },
  { bg: 'bg-cyan-50', text: 'text-cyan-800', border: 'border-cyan-200' }
];

export function getCategoryBadgeStyle(categoryName: string) {
  if (CATEGORY_COLORS[categoryName]) {
    return CATEGORY_COLORS[categoryName];
  }
  let hash = 0;
  for (let i = 0; i < categoryName.length; i++) {
    hash = categoryName.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % DEFAULT_COLOR_PALETTES.length;
  return DEFAULT_COLOR_PALETTES[index];
}

const COMMON_PRESET_CATEGORIES = [
  'Demo / Excavation',
  'Water / Offsite Services',
  'DSSP Material Supply',
  'Foundation / Concrete',
  'Framing / Structural',
  'Roofing / Waterproofing',
  'Plumbing / HVAC',
  'Electrical',
  'Drywall / Insulation',
  'Millwork / Cabinetry',
  'Flooring / Tile',
  'Painting',
  'Glazing / Windows',
  'Landscaping / Fencing',
  'Exterior Railing',
  'Appliances',
  'General Contractor'
];

export const ContactDirectoryModal: React.FC<ContactDirectoryModalProps> = ({
  isOpen,
  contacts,
  onClose,
  onSaveContact,
  onDeleteContact,
  onBulkDeleteContacts,
  onBulkUpdateCategories,
  onBulkAddContacts,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [isCreatingNew, setIsCreatingNew] = useState(false);

  // Bulk Add Modal State
  const [isBulkAddModalOpen, setIsBulkAddModalOpen] = useState(false);

  // Selected contact IDs for bulk actions
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Bulk Edit Categories Modal State
  const [isBulkEditModalOpen, setIsBulkEditModalOpen] = useState(false);
  const [bulkEditMode, setBulkEditMode] = useState<'add' | 'replace'>('add');
  const [bulkSelectedTags, setBulkSelectedTags] = useState<string[]>([]);
  const [bulkNewTagInput, setBulkNewTagInput] = useState('');

  // Bulk Delete Confirmation Modal State
  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false);

  // Form states for add / edit single contact
  const [formName, setFormName] = useState('');
  const [formCompany, setFormCompany] = useState('');
  const [formCategories, setFormCategories] = useState<string[]>([]);
  const [formNewCategoryInput, setFormNewCategoryInput] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formNotes, setFormNotes] = useState('');

  // Select all checkbox ref for indeterminate state
  const selectAllRef = useRef<HTMLInputElement>(null);

  // Extract all unique categories across all contacts + presets
  const allUniqueCategories = useMemo(() => {
    const set = new Set<string>();
    COMMON_PRESET_CATEGORIES.forEach((c) => set.add(c));
    contacts.forEach((c) => {
      const cats = getContactCategories(c);
      cats.forEach((cat) => {
        if (cat.trim()) set.add(cat.trim());
      });
    });
    return Array.from(set).sort();
  }, [contacts]);

  // Categories currently active in existing contacts for the filter dropdown
  const activeDirectoryCategories = useMemo(() => {
    const map = new Map<string, number>();
    contacts.forEach((c) => {
      const cats = getContactCategories(c);
      cats.forEach((cat) => {
        const trimmed = cat.trim();
        if (trimmed) {
          map.set(trimmed, (map.get(trimmed) || 0) + 1);
        }
      });
    });
    return Array.from(map.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [contacts]);

  // Filter contacts
  const filteredContacts = useMemo(() => {
    return contacts.filter((c) => {
      const cats = getContactCategories(c);
      const matchesCat =
        selectedCategory === 'ALL' ||
        cats.includes(selectedCategory);

      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        c.name.toLowerCase().includes(q) ||
        c.company.toLowerCase().includes(q) ||
        cats.some((cat) => cat.toLowerCase().includes(q)) ||
        c.phone.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q) ||
        (c.notes && c.notes.toLowerCase().includes(q));

      return matchesCat && matchesSearch;
    });
  }, [contacts, selectedCategory, searchQuery]);

  // Checkbox indeterminate / all-selected state sync
  const filteredIds = useMemo(() => filteredContacts.map((c) => c.id), [filteredContacts]);
  const isAllFilteredSelected = filteredIds.length > 0 && filteredIds.every((id) => selectedIds.has(id));
  const isSomeFilteredSelected = filteredIds.some((id) => selectedIds.has(id)) && !isAllFilteredSelected;

  useEffect(() => {
    if (selectAllRef.current) {
      selectAllRef.current.indeterminate = isSomeFilteredSelected;
    }
  }, [isSomeFilteredSelected]);

  if (!isOpen) return null;

  // Toggle single selection
  const toggleSelectOne = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Toggle Select All filtered contacts
  const toggleSelectAll = () => {
    if (isAllFilteredSelected) {
      // Unselect all visible
      setSelectedIds((prev) => {
        const next = new Set(prev);
        filteredIds.forEach((id) => next.delete(id));
        return next;
      });
    } else {
      // Select all visible
      setSelectedIds((prev) => {
        const next = new Set(prev);
        filteredIds.forEach((id) => next.add(id));
        return next;
      });
    }
  };

  const clearSelection = () => {
    setSelectedIds(new Set());
  };

  // Start editing a contact
  const startEdit = (contact: Contact) => {
    setEditingContact(contact);
    setIsCreatingNew(false);
    setFormName(contact.name);
    setFormCompany(contact.company);
    const existingCats = getContactCategories(contact);
    setFormCategories(existingCats.length > 0 ? existingCats : ['General Contractor']);
    setFormNewCategoryInput('');
    setFormPhone(contact.phone);
    setFormEmail(contact.email);
    setFormNotes(contact.notes || '');
  };

  const startNew = () => {
    setEditingContact(null);
    setIsCreatingNew(true);
    setFormName('');
    setFormCompany('');
    setFormCategories(['Demo / Excavation']);
    setFormNewCategoryInput('');
    setFormPhone('');
    setFormEmail('');
    setFormNotes('');
  };

  const cancelEdit = () => {
    setEditingContact(null);
    setIsCreatingNew(false);
  };

  // Tag management in Single Contact Form
  const handleAddFormTag = (tag: string) => {
    const trimmed = tag.trim();
    if (!trimmed) return;
    if (!formCategories.includes(trimmed)) {
      setFormCategories([...formCategories, trimmed]);
    }
    setFormNewCategoryInput('');
  };

  const handleRemoveFormTag = (tagToRemove: string) => {
    setFormCategories(formCategories.filter((t) => t !== tagToRemove));
  };

  const handleSaveForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() && !formCompany.trim()) return;

    const finalCategories = formCategories.length > 0 ? formCategories : ['General Contractor'];

    const contactToSave: Contact = {
      id: editingContact ? editingContact.id : `c-${Date.now()}`,
      name: formName.trim() || 'Contact Representative',
      company: formCompany.trim() || 'Subcontractor Trade',
      category: finalCategories.join(', '),
      categories: finalCategories,
      trade_categories: finalCategories,
      phone: formPhone.trim(),
      email: formEmail.trim(),
      notes: formNotes.trim()
    };

    onSaveContact(contactToSave);
    cancelEdit();
  };

  // Single Contact Delete
  const handleDeleteSingle = (contact: Contact) => {
    onDeleteContact(contact.id);
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.delete(contact.id);
      return next;
    });
  };

  // Bulk Delete Actions
  const handleExecuteBulkDelete = () => {
    const idsToDelete = Array.from(selectedIds);
    if (idsToDelete.length === 0) return;

    if (onBulkDeleteContacts) {
      onBulkDeleteContacts(idsToDelete);
    } else {
      idsToDelete.forEach((id) => onDeleteContact(id));
    }

    setSelectedIds(new Set());
    setIsBulkDeleteModalOpen(false);
  };

  // Bulk Edit Categories Actions
  const handleOpenBulkEdit = () => {
    setBulkSelectedTags([]);
    setBulkNewTagInput('');
    setBulkEditMode('add');
    setIsBulkEditModalOpen(true);
  };

  const handleAddBulkTag = (tag: string) => {
    const trimmed = tag.trim();
    if (!trimmed) return;
    if (!bulkSelectedTags.includes(trimmed)) {
      setBulkSelectedTags([...bulkSelectedTags, trimmed]);
    }
    setBulkNewTagInput('');
  };

  const handleRemoveBulkTag = (tagToRemove: string) => {
    setBulkSelectedTags(bulkSelectedTags.filter((t) => t !== tagToRemove));
  };

  const handleExecuteBulkUpdateCategories = () => {
    const idsToUpdate = Array.from(selectedIds);
    if (idsToUpdate.length === 0 || bulkSelectedTags.length === 0) return;

    if (onBulkUpdateCategories) {
      onBulkUpdateCategories(idsToUpdate, bulkSelectedTags, bulkEditMode);
    } else {
      // Fallback: update individually via onSaveContact
      idsToUpdate.forEach((id) => {
        const contact = contacts.find((c) => c.id === id);
        if (contact) {
          const currentCats = getContactCategories(contact);
          const newCats =
            bulkEditMode === 'replace'
              ? Array.from(new Set(bulkSelectedTags))
              : Array.from(new Set([...currentCats, ...bulkSelectedTags]));

          onSaveContact({
            ...contact,
            category: newCats.join(', '),
            categories: newCats,
            trade_categories: newCats
          });
        }
      });
    }

    setIsBulkEditModalOpen(false);
    clearSelection();
  };

  // Export CSV (either all or selected only)
  const exportCsv = (onlySelected = false) => {
    const targetContacts = onlySelected
      ? contacts.filter((c) => selectedIds.has(c.id))
      : contacts;

    if (targetContacts.length === 0) return;

    const headers = ['Name', 'Company', 'Trade Categories', 'Phone', 'Email', 'Notes'];
    const rows = targetContacts.map((c) => {
      const cats = getContactCategories(c).join('; ');
      return [
        `"${(c.name || '').replace(/"/g, '""')}"`,
        `"${(c.company || '').replace(/"/g, '""')}"`,
        `"${cats.replace(/"/g, '""')}"`,
        `"${(c.phone || '').replace(/"/g, '""')}"`,
        `"${(c.email || '').replace(/"/g, '""')}"`,
        `"${(c.notes || '').replace(/"/g, '""')}"`
      ];
    });

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    const dateStr = new Date().toISOString().split('T')[0];
    const filename = onlySelected
      ? `Tender_Contacts_Selected_${targetContacts.length}_${dateStr}.csv`
      : `Tender_Contact_Directory_${dateStr}.csv`;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="fixed inset-0 z-[9999] overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150">
      <div className="bg-white w-full max-w-5xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Top Header */}
        <div className="p-4 sm:p-5 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-600 rounded-xl">
              <Users className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white">Central Contact & Contractor Directory</h2>
                <span className="px-2 py-0.5 text-xs font-semibold bg-blue-900 text-blue-300 rounded-full border border-blue-700">
                  {contacts.length} Total Contacts
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => exportCsv(false)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg border border-slate-700 transition-colors cursor-pointer"
              title="Download entire directory as CSV"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export All CSV</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Action Controls & Filters Bar */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Search Bar */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by contact name, company, trade tag, phone, email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Category Filter & Add Button */}
          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="flex items-center gap-1.5 bg-white border border-slate-300 rounded-lg px-2.5 py-1 text-xs shadow-2xs">
              <Filter className="w-3.5 h-3.5 text-slate-500 shrink-0" />
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="bg-transparent border-none text-slate-800 text-xs font-semibold focus:outline-none cursor-pointer max-w-[200px]"
              >
                <option value="ALL">All Categories ({contacts.length})</option>
                {activeDirectoryCategories.map((cat) => (
                  <option key={cat.name} value={cat.name}>
                    {cat.name} ({cat.count})
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              id="contact-directory-bulk-add-btn"
              onClick={() => setIsBulkAddModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 rounded-lg transition-colors shadow-2xs cursor-pointer"
              title="Bulk import contacts via CSV paste, file upload, or multi-row grid"
            >
              <UserPlus className="w-3.5 h-3.5 text-blue-600" />
              <span>Bulk Add Contacts</span>
            </button>

            <button
              type="button"
              id="contact-directory-add-btn"
              onClick={startNew}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors shadow-xs cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Single Contact</span>
            </button>
          </div>
        </div>

        {/* Contextual Bulk Action Toolbar (When 1 or more contacts selected) */}
        {selectedIds.size > 0 && (
          <div className="px-4 py-2.5 bg-blue-50 border-b border-blue-200 flex flex-wrap items-center justify-between gap-3 animate-in slide-in-from-top-1 duration-150">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <span className="flex h-2 w-2 rounded-full bg-blue-600 animate-pulse" />
                <span className="text-xs font-bold text-blue-900">
                  {selectedIds.size} {selectedIds.size === 1 ? 'contact' : 'contacts'} selected
                </span>
              </div>
              <button
                type="button"
                onClick={clearSelection}
                className="text-xs text-blue-700 hover:text-blue-900 underline font-medium cursor-pointer"
              >
                Deselect all
              </button>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {/* Bulk Edit Categories Button */}
              <button
                type="button"
                id="bulk-edit-categories-btn"
                onClick={handleOpenBulkEdit}
                className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 rounded-md transition-colors shadow-2xs cursor-pointer"
                title="Add or replace trade categories for all selected contacts"
              >
                <Tag className="w-3.5 h-3.5 text-blue-600" />
                <span>Bulk Edit Categories</span>
              </button>

              {/* Bulk Export Button */}
              <button
                type="button"
                id="bulk-export-contacts-btn"
                onClick={() => exportCsv(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 rounded-md transition-colors shadow-2xs cursor-pointer"
                title="Export selected contacts to CSV"
              >
                <Download className="w-3.5 h-3.5 text-slate-600" />
                <span>Export Selected ({selectedIds.size})</span>
              </button>

              {/* Bulk Delete Button */}
              <button
                type="button"
                id="bulk-delete-contacts-btn"
                onClick={() => setIsBulkDeleteModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white rounded-md transition-colors shadow-2xs cursor-pointer"
                title="Delete all selected contacts"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete ({selectedIds.size})</span>
              </button>
            </div>
          </div>
        )}

        {/* Add / Edit Form Panel (Single Contact) */}
        {(editingContact || isCreatingNew) && (
          <form onSubmit={handleSaveForm} className="p-4 bg-slate-50 border-b border-slate-200 animate-in slide-in-from-top-2 duration-150">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center gap-2">
                <Users className="w-4 h-4 text-blue-600" />
                <span>{isCreatingNew ? 'Create New Trade Contact' : `Editing Contact: ${editingContact?.name}`}</span>
              </h3>
              <button
                type="button"
                onClick={cancelEdit}
                className="text-xs text-slate-500 hover:text-slate-800 font-semibold cursor-pointer"
              >
                Cancel
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Contact Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. John O'Boyle"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Company Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Clover Hill Construction"
                  value={formCompany}
                  onChange={(e) => setFormCompany(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900"
                />
              </div>

              {/* Multi-Trade Category Selector */}
              <div className="sm:col-span-2 md:col-span-1">
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Trade Categories (Multi-select) *
                </label>
                <div className="space-y-2 bg-white p-2.5 border border-slate-300 rounded-md">
                  {/* Selected Tags list */}
                  <div className="flex flex-wrap gap-1.5 min-h-[26px]">
                    {formCategories.length === 0 ? (
                      <span className="text-[11px] text-slate-400 italic">No categories selected</span>
                    ) : (
                      formCategories.map((cat) => {
                        const style = getCategoryBadgeStyle(cat);
                        return (
                          <span
                            key={cat}
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold border ${style.bg} ${style.text} ${style.border}`}
                          >
                            <span>{cat}</span>
                            <button
                              type="button"
                              onClick={() => handleRemoveFormTag(cat)}
                              className="text-slate-400 hover:text-rose-600 ml-0.5 cursor-pointer"
                              title={`Remove ${cat}`}
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </span>
                        );
                      })
                    )}
                  </div>

                  {/* Add Tag Controls */}
                  <div className="flex items-center gap-1.5 pt-1 border-t border-slate-100">
                    <select
                      value=""
                      onChange={(e) => {
                        if (e.target.value) handleAddFormTag(e.target.value);
                      }}
                      className="text-xs bg-slate-50 border border-slate-300 rounded px-2 py-1 text-slate-700 focus:outline-none flex-1"
                    >
                      <option value="">+ Choose preset tag...</option>
                      {allUniqueCategories
                        .filter((c) => !formCategories.includes(c))
                        .map((cat) => (
                          <option key={cat} value={cat}>
                            {cat}
                          </option>
                        ))}
                    </select>

                    <div className="flex items-center gap-1 flex-1">
                      <input
                        type="text"
                        placeholder="Or custom tag..."
                        value={formNewCategoryInput}
                        onChange={(e) => setFormNewCategoryInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddFormTag(formNewCategoryInput);
                          }
                        }}
                        className="w-full text-xs px-2 py-1 bg-white border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                      <button
                        type="button"
                        onClick={() => handleAddFormTag(formNewCategoryInput)}
                        disabled={!formNewCategoryInput.trim()}
                        className="px-2 py-1 text-[11px] font-semibold bg-slate-200 hover:bg-slate-300 disabled:opacity-40 text-slate-700 rounded cursor-pointer shrink-0"
                      >
                        Add
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Phone Number</label>
                <input
                  type="text"
                  placeholder="e.g. 403-404-5080"
                  value={formPhone}
                  onChange={(e) => setFormPhone(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Email Address</label>
                <input
                  type="email"
                  placeholder="e.g. oboyle1179@hotmail.com"
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Specialty Notes</label>
                <input
                  type="text"
                  placeholder="e.g. Primary contractor for deep services"
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900"
                />
              </div>
            </div>

            <div className="mt-3 flex justify-end gap-2">
              <button
                type="button"
                onClick={cancelEdit}
                className="px-3 py-1.5 text-xs font-semibold bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 rounded-lg cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white rounded-lg shadow-xs cursor-pointer"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Save Contact</span>
              </button>
            </div>
          </form>
        )}

        {/* Contacts Table List */}
        <div className="flex-1 overflow-y-auto">
          {filteredContacts.length === 0 ? (
            <div className="p-12 text-center text-slate-400">
              <Users className="w-10 h-10 mx-auto mb-2 opacity-40" />
              <p className="text-sm font-semibold text-slate-700">No contacts match your query.</p>
              <p className="text-xs text-slate-500 mt-1">Try adjusting search keywords or clearing the category filter.</p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse text-xs">
              <thead className="sticky top-0 bg-slate-100 border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase tracking-wider z-10">
                <tr>
                  {/* Select All Checkbox */}
                  <th className="py-2.5 px-3 w-10 text-center">
                    <input
                      type="checkbox"
                      ref={selectAllRef}
                      checked={isAllFilteredSelected}
                      onChange={toggleSelectAll}
                      className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                      title={isAllFilteredSelected ? 'Deselect all visible contacts' : 'Select all visible contacts'}
                    />
                  </th>
                  <th className="py-2.5 px-3">Contact Name</th>
                  <th className="py-2.5 px-3">Company</th>
                  <th className="py-2.5 px-3">Trade Categories</th>
                  <th className="py-2.5 px-3">Phone</th>
                  <th className="py-2.5 px-3">Email</th>
                  <th className="py-2.5 px-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredContacts.map((contact) => {
                  const isSelected = selectedIds.has(contact.id);
                  const contactCats = getContactCategories(contact);

                  return (
                    <tr
                      key={contact.id}
                      id={`contact-row-${contact.id}`}
                      className={`transition-colors ${
                        isSelected ? 'bg-blue-50/50 hover:bg-blue-50/70' : 'hover:bg-slate-50'
                      }`}
                    >
                      {/* Row Checkbox */}
                      <td className="py-2.5 px-3 text-center align-middle">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelectOne(contact.id)}
                          className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                        />
                      </td>

                      <td className="py-2.5 px-3 font-bold text-slate-900 align-middle">
                        {contact.name}
                      </td>

                      <td className="py-2.5 px-3 font-semibold text-slate-800 align-middle">
                        {contact.company}
                      </td>

                      {/* Multi-Trade Categories Stacked Badges */}
                      <td className="py-2.5 px-3 align-middle max-w-xs">
                        <div className="flex flex-wrap gap-1">
                          {contactCats.length === 0 ? (
                            <span className="text-[10px] text-slate-400 italic">No trade category</span>
                          ) : (
                            contactCats.map((cat) => {
                              const style = getCategoryBadgeStyle(cat);
                              return (
                                <span
                                  key={cat}
                                  className={`inline-block px-2 py-0.5 text-[10px] font-bold border rounded-md ${style.bg} ${style.text} ${style.border}`}
                                >
                                  {cat}
                                </span>
                              );
                            })
                          )}
                        </div>
                      </td>

                      <td className="py-2.5 px-3 align-middle">
                        {contact.phone && contact.phone !== '-' ? (
                          <a
                            href={`tel:${contact.phone}`}
                            className="inline-flex items-center gap-1 text-slate-700 hover:text-blue-600 font-medium"
                          >
                            <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                            <span>{contact.phone}</span>
                          </a>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>

                      <td className="py-2.5 px-3 align-middle">
                        {contact.email && contact.email !== '-' ? (
                          <a
                            href={`mailto:${contact.email}`}
                            className="inline-flex items-center gap-1 text-blue-600 hover:underline font-medium truncate max-w-[180px]"
                          >
                            <Mail className="w-3 h-3 text-blue-400 shrink-0" />
                            <span className="truncate">{contact.email}</span>
                          </a>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>

                      <td className="py-2.5 px-2 text-right align-middle">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => startEdit(contact)}
                            className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors cursor-pointer"
                            title="Edit Contact"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteSingle(contact)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors cursor-pointer"
                            title="Delete Contact"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Directory Footer Summary */}
        <div className="p-3.5 bg-slate-100 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600">
          <div className="flex items-center gap-2">
            <span>
              Showing <strong>{filteredContacts.length}</strong> of {contacts.length} total trade contacts
            </span>
            {selectedIds.size > 0 && (
              <span className="font-semibold text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full text-[11px]">
                ({selectedIds.size} selected)
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 font-semibold bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition-colors cursor-pointer"
          >
            Close Directory
          </button>
        </div>
      </div>

      {/* Bulk Category Editor Modal */}
      {isBulkEditModalOpen && (
        <div className="fixed inset-0 z-[10000] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col">
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Tag className="w-5 h-5 text-blue-400" />
                <h3 className="text-sm font-bold text-white">
                  Bulk Edit Categories ({selectedIds.size} Contacts)
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsBulkEditModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              {/* Mode Selection */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-2">Update Strategy:</label>
                <div className="grid grid-cols-2 gap-2">
                  <label
                    className={`flex items-start gap-2.5 p-3 rounded-lg border cursor-pointer transition-colors ${
                      bulkEditMode === 'add'
                        ? 'bg-blue-50 border-blue-300 text-blue-950'
                        : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <input
                      type="radio"
                      name="bulkMode"
                      value="add"
                      checked={bulkEditMode === 'add'}
                      onChange={() => setBulkEditMode('add')}
                      className="mt-0.5 text-blue-600"
                    />
                    <div>
                      <span className="font-bold text-xs block">Add Tags</span>
                      <span className="text-[11px] text-slate-500">
                        Append tags to existing categories without removing old ones.
                      </span>
                    </div>
                  </label>

                  <label
                    className={`flex items-start gap-2.5 p-3 rounded-lg border cursor-pointer transition-colors ${
                      bulkEditMode === 'replace'
                        ? 'bg-amber-50 border-amber-300 text-amber-950'
                        : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <input
                      type="radio"
                      name="bulkMode"
                      value="replace"
                      checked={bulkEditMode === 'replace'}
                      onChange={() => setBulkEditMode('replace')}
                      className="mt-0.5 text-amber-600"
                    />
                    <div>
                      <span className="font-bold text-xs block">Replace All Tags</span>
                      <span className="text-[11px] text-slate-500">
                        Overwrite all existing categories with the new tag selection.
                      </span>
                    </div>
                  </label>
                </div>
              </div>

              {/* Tags to apply */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1.5">
                  Categories to Apply:
                </label>
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-300 space-y-2.5">
                  {/* Selected Tags list */}
                  <div className="flex flex-wrap gap-1.5 min-h-[32px] p-2 bg-white rounded border border-slate-200">
                    {bulkSelectedTags.length === 0 ? (
                      <span className="text-[11px] text-slate-400 italic">
                        Select tags below or type a custom tag...
                      </span>
                    ) : (
                      bulkSelectedTags.map((cat) => {
                        const style = getCategoryBadgeStyle(cat);
                        return (
                          <span
                            key={cat}
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold border ${style.bg} ${style.text} ${style.border}`}
                          >
                            <span>{cat}</span>
                            <button
                              type="button"
                              onClick={() => handleRemoveBulkTag(cat)}
                              className="text-slate-400 hover:text-rose-600 ml-0.5 cursor-pointer"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </span>
                        );
                      })
                    )}
                  </div>

                  {/* Preset Quick Suggestions */}
                  <div>
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                      Quick Pick Presets:
                    </span>
                    <div className="flex flex-wrap gap-1 max-h-28 overflow-y-auto p-1 bg-white rounded border border-slate-200">
                      {allUniqueCategories.map((cat) => {
                        const isAdded = bulkSelectedTags.includes(cat);
                        return (
                          <button
                            key={cat}
                            type="button"
                            onClick={() => (isAdded ? handleRemoveBulkTag(cat) : handleAddBulkTag(cat))}
                            className={`px-2 py-0.5 rounded text-[10px] font-semibold border transition-colors cursor-pointer ${
                              isAdded
                                ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                                : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300'
                            }`}
                          >
                            {isAdded ? `✓ ${cat}` : `+ ${cat}`}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Custom tag input */}
                  <div className="flex items-center gap-1.5 pt-1">
                    <input
                      type="text"
                      placeholder="Type custom category..."
                      value={bulkNewTagInput}
                      onChange={(e) => setBulkNewTagInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddBulkTag(bulkNewTagInput);
                        }
                      }}
                      className="w-full text-xs px-2.5 py-1.5 bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                    <button
                      type="button"
                      onClick={() => handleAddBulkTag(bulkNewTagInput)}
                      disabled={!bulkNewTagInput.trim()}
                      className="px-3 py-1.5 text-xs font-semibold bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-white rounded-md cursor-pointer shrink-0"
                    >
                      Add Tag
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-4 bg-slate-100 border-t border-slate-200 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsBulkEditModalOpen(false)}
                className="px-3.5 py-1.5 text-xs font-semibold bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 rounded-lg cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExecuteBulkUpdateCategories}
                disabled={bulkSelectedTags.length === 0}
                className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-lg shadow-xs cursor-pointer"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Apply to {selectedIds.size} Contacts</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Delete Confirmation Dialog */}
      {isBulkDeleteModalOpen && (
        <div className="fixed inset-0 z-60 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col">
            <div className="p-4 bg-rose-600 text-white flex items-center gap-2.5">
              <AlertTriangle className="w-5 h-5 text-white shrink-0" />
              <h3 className="text-sm font-bold text-white">
                Confirm Bulk Deletion
              </h3>
            </div>

            <div className="p-5 text-xs text-slate-700 space-y-3">
              <p className="font-semibold text-slate-900 text-sm">
                Are you sure you want to permanently delete {selectedIds.size} selected {selectedIds.size === 1 ? 'contact' : 'contacts'} from the central directory?
              </p>
              <p className="text-slate-500">
                This action will remove these trade contractors and cannot be undone. Associated quote records inside existing project line items will retain their snapshot information.
              </p>
            </div>

            <div className="p-4 bg-slate-100 border-t border-slate-200 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsBulkDeleteModalOpen(false)}
                className="px-3.5 py-1.5 text-xs font-semibold bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 rounded-lg cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExecuteBulkDelete}
                className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white rounded-lg shadow-xs cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Permanently Delete {selectedIds.size} Contacts</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Add Contacts Modal */}
      {isBulkAddModalOpen && (
        <BulkAddContactsModal
          isOpen={isBulkAddModalOpen}
          onClose={() => setIsBulkAddModalOpen(false)}
          existingContacts={contacts}
          availableCategories={allUniqueCategories}
          onBulkAdd={(newContacts) => {
            if (onBulkAddContacts) {
              onBulkAddContacts(newContacts);
            } else {
              newContacts.forEach((c) => onSaveContact(c));
            }
            setIsBulkAddModalOpen(false);
          }}
        />
      )}
    </div>
  );
};
