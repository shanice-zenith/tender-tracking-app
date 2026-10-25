import React, { useState, useRef, useEffect } from 'react';
import { Search, ChevronDown, Check, Building2 } from 'lucide-react';
import { Contact } from '../types';
import { getContactCategories } from './ContactDirectoryModal';

interface ContractorComboboxProps {
  contacts: Contact[];
  onSelect: (contact: Contact | null) => void;
  selectedContactId: string;
}

export const ContractorCombobox: React.FC<ContractorComboboxProps> = ({ contacts, onSelect, selectedContactId }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Close on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredContacts = contacts.filter((c) => {
    const term = search.toLowerCase();
    const categories = getContactCategories(c);
    const catStr = categories.join(' ').toLowerCase();
    
    return (
      c.company.toLowerCase().includes(term) ||
      c.name.toLowerCase().includes(term) ||
      catStr.includes(term) ||
      (c.category || '').toLowerCase().includes(term)
    );
  }).sort((a, b) => a.company.localeCompare(b.company)); // Sort by company first

  const selectedContact = contacts.find((c) => c.id === selectedContactId);
  const selectedCats = selectedContact ? getContactCategories(selectedContact) : [];
  const selectedCatStr = selectedCats.length > 0 ? selectedCats.join(', ') : selectedContact?.category;
  const selectedLabel = selectedContact 
    ? `${selectedContact.company} — ${selectedContact.name} (${selectedCatStr})` 
    : '';

  return (
    <div className="relative" ref={wrapperRef}>
      <div 
        className="flex items-center justify-between w-full px-3 py-2 bg-white border border-slate-300 rounded-lg cursor-pointer hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs transition-colors"
        onClick={() => {
          setIsOpen(!isOpen);
          if (!isOpen) setSearch('');
        }}
      >
        <span className={`text-xs font-semibold truncate ${selectedContact ? 'text-slate-900' : 'text-slate-500'}`}>
          {selectedContact ? selectedLabel : '— Select a contractor from the directory —'}
        </span>
        <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </div>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-100">
          <div className="flex items-center px-3 border-b border-slate-100 bg-slate-50">
            <Search className="w-4 h-4 text-slate-400" />
            <input
              type="text"
              className="w-full px-2 py-2.5 text-xs bg-transparent border-none focus:outline-none text-slate-900 placeholder-slate-400"
              placeholder="Search company name or contractor..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              autoFocus
            />
          </div>
          
          <div className="max-h-64 overflow-y-auto p-1">
            {filteredContacts.length === 0 ? (
              <div className="px-3 py-4 text-center text-xs text-slate-500 font-medium">
                No contractors found.
              </div>
            ) : (
              filteredContacts.map((c) => {
                const isSelected = c.id === selectedContactId;
                const cats = getContactCategories(c);
                const catStr = cats.length > 0 ? cats.join(', ') : c.category;
                
                return (
                  <div
                    key={c.id}
                    className={`flex flex-col px-3 py-2 cursor-pointer rounded-md transition-colors ${
                      isSelected ? 'bg-blue-50' : 'hover:bg-slate-100'
                    }`}
                    onClick={() => {
                      onSelect(c);
                      setIsOpen(false);
                      setSearch('');
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="text-xs flex items-center gap-1.5 flex-wrap">
                        <Building2 className="w-3 h-3 text-slate-400 shrink-0" />
                        <span className="font-bold text-slate-800">{c.company}</span>
                        <span className="text-slate-400 font-medium">—</span>
                        <span className="text-slate-600 font-medium">{c.name}</span>
                        <span className="text-blue-600/80 font-semibold">({catStr})</span>
                      </div>
                      {isSelected && <Check className="w-3.5 h-3.5 text-blue-600 shrink-0 ml-2" />}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};
