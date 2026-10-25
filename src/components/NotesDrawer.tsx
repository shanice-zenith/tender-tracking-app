import React, { useState } from 'react';
import { X, MessageSquare, Send, Clock, User, Building } from 'lucide-react';
import { TradeEntry, NoteItem } from '../types';

interface NotesDrawerProps {
  trade: TradeEntry | null;
  scopeName?: string;
  isOpen: boolean;
  onClose: () => void;
  onSaveNotes: (tradeId: string, updatedNotes: NoteItem[]) => void;
}

export const NotesDrawer: React.FC<NotesDrawerProps> = ({
  trade,
  scopeName,
  isOpen,
  onClose,
  onSaveNotes,
}) => {
  const [newNoteText, setNewNoteText] = useState('');
  const [authorName, setAuthorName] = useState('Shanice (PM)');

  if (!isOpen || !trade) return null;

  const handleAddNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNoteText.trim()) return;

    const newNote: NoteItem = {
      id: `n-${Date.now()}`,
      text: newNoteText.trim(),
      author: authorName.trim() || 'Project Coordinator',
      timestamp: new Date().toLocaleString([], {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    };

    const updated = [newNote, ...trade.notes];
    onSaveNotes(trade.id, updated);
    setNewNoteText('');
  };

  const handleDeleteNote = (noteId: string) => {
    const updated = trade.notes.filter((n) => n.id !== noteId);
    onSaveNotes(trade.id, updated);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/50 backdrop-blur-xs flex justify-end animate-in fade-in duration-150">
      <div className="w-full max-w-md bg-white h-full shadow-2xl flex flex-col border-l border-slate-200">
        {/* Header */}
        <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-600 rounded-lg">
              <MessageSquare className="w-4 h-4 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-white">Trade Action Notes</h3>
              <p className="text-xs text-slate-400 truncate max-w-[260px]">
                {trade.companyName} • {scopeName || 'Scope Item'}
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

        {/* Contractor Context Banner */}
        <div className="p-3 bg-slate-50 border-b border-slate-200 text-xs">
          <div className="flex items-center justify-between text-slate-700">
            <span className="font-semibold text-slate-900">{trade.contractorName}</span>
            <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-800 font-bold text-[10px]">
              {trade.actionStatus}
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Append clarifications, revisions, meetings, and PM confirmations without cluttering the main grid.
          </p>
        </div>

        {/* Add New Note Input */}
        <form onSubmit={handleAddNote} className="p-4 border-b border-slate-200 bg-white">
          <div className="mb-2 flex items-center justify-between">
            <label className="text-xs font-bold text-slate-700">Append New Note</label>
            <div className="flex items-center gap-1 text-[11px] text-slate-500">
              <span>Author:</span>
              <input
                type="text"
                value={authorName}
                onChange={(e) => setAuthorName(e.target.value)}
                className="px-1.5 py-0.5 border border-slate-200 rounded text-xs font-semibold text-slate-800 w-28"
                placeholder="Your Name"
              />
            </div>
          </div>
          <textarea
            id="notes-textarea"
            rows={3}
            value={newNoteText}
            onChange={(e) => setNewNoteText(e.target.value)}
            placeholder="Type revision notes, quote conditions, scope inclusions/exclusions..."
            className="w-full p-2.5 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
          <div className="mt-2 flex justify-end">
            <button
              type="submit"
              disabled={!newNoteText.trim()}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white rounded-lg transition-colors shadow-xs cursor-pointer"
            >
              <Send className="w-3 h-3" />
              <span>Append Note</span>
            </button>
          </div>
        </form>

        {/* Notes Timeline List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {trade.notes.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p className="text-xs font-medium">No notes recorded yet for this trade.</p>
              <p className="text-[11px] mt-1">Use the form above to add your first memo.</p>
            </div>
          ) : (
            trade.notes.map((note) => (
              <div
                key={note.id}
                className="p-3 bg-slate-50 rounded-lg border border-slate-200/80 text-xs shadow-2xs group relative"
              >
                <div className="flex items-center justify-between mb-1.5 text-[11px] text-slate-500">
                  <div className="flex items-center gap-1.5 font-semibold text-slate-800">
                    <User className="w-3 h-3 text-blue-600" />
                    <span>{note.author}</span>
                  </div>
                  <div className="flex items-center gap-1 text-slate-400">
                    <Clock className="w-3 h-3" />
                    <span>{note.timestamp}</span>
                  </div>
                </div>

                <p className="text-slate-800 leading-relaxed whitespace-pre-wrap">{note.text}</p>

                <button
                  type="button"
                  onClick={() => handleDeleteNote(note.id)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity absolute right-2 bottom-2 text-slate-400 hover:text-rose-600 p-1"
                  title="Delete this note"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-100 border-t border-slate-200 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer"
          >
            Close Panel
          </button>
        </div>
      </div>
    </div>
  );
};
