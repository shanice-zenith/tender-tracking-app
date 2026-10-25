import React, { useState, useEffect } from 'react';
import { 
  X, 
  Building2, 
  FolderPlus, 
  DollarSign, 
  Layers, 
  FileSpreadsheet, 
  Sparkles, 
  MapPin, 
  User, 
  Tag, 
  AlignLeft,
  Check,
  FolderOpen,
  Trash2
} from 'lucide-react';
import { Project, ProjectStatus, ProjectTemplateType } from '../types';
import { generateScopesFromTemplate, MASTER_SCOPE_TEMPLATES } from '../data/projectTemplates';

interface ProjectModalProps {
  isOpen: boolean;
  projectToEdit: Project | null;
  onClose: () => void;
  onSaveProject: (projectData: Partial<Project>, templateType?: ProjectTemplateType) => void;
  onDeleteProject?: (projectId: string) => void;
}

export const ProjectModal: React.FC<ProjectModalProps> = ({
  isOpen,
  projectToEdit,
  onClose,
  onSaveProject,
  onDeleteProject
}) => {
  const isEditing = !!projectToEdit;

  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [client, setClient] = useState('');
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [targetBudget, setTargetBudget] = useState<string>('');
  const [status, setStatus] = useState<ProjectStatus>('Tender Active');
  const [driveLink, setDriveLink] = useState('');
  const [templateType, setTemplateType] = useState<ProjectTemplateType>('master_5phase');

  useEffect(() => {
    if (projectToEdit) {
      setName(projectToEdit.name);
      setCode(projectToEdit.code || '');
      setClient(projectToEdit.client || '');
      setLocation(projectToEdit.location || '');
      setDescription(projectToEdit.description || '');
      setTargetBudget(projectToEdit.targetBudget ? String(projectToEdit.targetBudget) : '');
      setStatus(projectToEdit.status);
      setDriveLink(projectToEdit.driveLink || '');
    } else {
      setName('');
      setCode(`PRJ-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 900) + 100)}`);
      setClient('');
      setLocation('');
      setDescription('');
      setTargetBudget('1200000');
      setStatus('Tender Active');
      setDriveLink('');
      setTemplateType('master_5phase');
    }
  }, [projectToEdit, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    onSaveProject(
      {
        name: name.trim(),
        code: code.trim() || `PRJ-${Date.now().toString().slice(-4)}`,
        client: client.trim(),
        location: location.trim(),
        description: description.trim(),
        targetBudget: targetBudget ? parseFloat(targetBudget) : 0,
        status,
        driveLink: driveLink.trim()
      },
      isEditing ? undefined : templateType
    );
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
      <div 
        id="project-modal"
        className="bg-white w-full max-w-2xl rounded-2xl border border-slate-200 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150"
      >
        {/* Modal Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-600 rounded-xl">
              {isEditing ? <Building2 className="w-5 h-5 text-white" /> : <FolderPlus className="w-5 h-5 text-white" />}
            </div>
            <div>
              <h2 className="text-base font-extrabold tracking-tight">
                {isEditing ? 'Edit Construction Project' : 'Create New Construction Project'}
              </h2>
              <p className="text-xs text-slate-400">
                {isEditing 
                  ? 'Update project credentials, client specifications, and target budget.' 
                  : 'Initialize a tender package workspace with custom or master templates.'}
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

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Project Name & Code */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Project Name <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Building2 className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                <input
                  type="text"
                  required
                  placeholder="e.g. Glenbrook 44"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent font-medium"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Project Code / ID
              </label>
              <div className="relative">
                <Tag className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                <input
                  type="text"
                  placeholder="e.g. PRJ-2026-001"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent font-mono"
                />
              </div>
            </div>
          </div>

          {/* Client & Location */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Client / Developer Name
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                <input
                  type="text"
                  placeholder="e.g. The Zenith Group Developments"
                  value={client}
                  onChange={(e) => setClient(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Site Location / Address
              </label>
              <div className="relative">
                <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                <input
                  type="text"
                  placeholder="e.g. 450 7th Ave SW, Calgary, AB"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent"
                />
              </div>
            </div>
          </div>

          {/* Target Budget & Status */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Target Overall Budget (CAD)
              </label>
              <div className="relative">
                <DollarSign className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                <input
                  type="number"
                  min="0"
                  step="1000"
                  placeholder="e.g. 1250000"
                  value={targetBudget}
                  onChange={(e) => setTargetBudget(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent font-semibold"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Project Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as ProjectStatus)}
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 font-medium"
              >
                <option value="Planning">Planning (Pre-Tender)</option>
                <option value="Tender Active">Tender Active (Receiving Quotes)</option>
                <option value="In Progress">In Progress (Under Construction)</option>
                <option value="Under Review">Under Review (Budget & Scope Audit)</option>
                <option value="Completed">Completed (All POs Awarded)</option>
              </select>
            </div>
          </div>

          {/* Template Selection (Only when creating new project) */}
          {!isEditing && (
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Scope Template Setup <span className="text-slate-400 font-normal lowercase">(you can freely edit, add, or remove scopes after)</span>
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Master 5-Phase Template */}
                <div
                  onClick={() => setTemplateType('master_5phase')}
                  className={`p-3.5 rounded-xl border-2 cursor-pointer transition-all ${
                    templateType === 'master_5phase'
                      ? 'border-blue-600 bg-blue-50/50 shadow-xs'
                      : 'border-slate-200 bg-slate-50/70 hover:border-slate-300 hover:bg-slate-100/50'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 bg-blue-100 text-blue-700 rounded-lg">
                        <Sparkles className="w-4 h-4" />
                      </div>
                      <span className="text-xs font-extrabold text-slate-900">Standard 5-Phase Master Template</span>
                    </div>
                    {templateType === 'master_5phase' && (
                      <div className="w-4 h-4 bg-blue-600 text-white rounded-full flex items-center justify-center">
                        <Check className="w-3 h-3" />
                      </div>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-600 mt-2 leading-relaxed">
                    Pre-loads all <strong>{MASTER_SCOPE_TEMPLATES.length} exact scope line items</strong> across Phase 1A, 1B, 2A, 2B, & 3 (Demolition, Earthworks, DSSP, Steel, Framing, HVAC, Drywall, Countertops, Appliances, etc.).
                  </p>
                  <span className="inline-block mt-2 text-[10px] font-bold text-blue-700 bg-blue-100/70 px-2 py-0.5 rounded">
                    Recommended • Fully Editable & Removable
                  </span>
                </div>

                {/* Blank Template */}
                <div
                  onClick={() => setTemplateType('blank')}
                  className={`p-3.5 rounded-xl border-2 cursor-pointer transition-all ${
                    templateType === 'blank'
                      ? 'border-blue-600 bg-blue-50/50 shadow-xs'
                      : 'border-slate-200 bg-slate-50/70 hover:border-slate-300 hover:bg-slate-100/50'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 bg-slate-200 text-slate-700 rounded-lg">
                        <Layers className="w-4 h-4" />
                      </div>
                      <span className="text-xs font-extrabold text-slate-900">Blank Project (Empty Scopes)</span>
                    </div>
                    {templateType === 'blank' && (
                      <div className="w-4 h-4 bg-blue-600 text-white rounded-full flex items-center justify-center">
                        <Check className="w-3 h-3" />
                      </div>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-600 mt-2 leading-relaxed">
                    Starts with an empty project without predefined scope items. You can create custom scopes per phase manually.
                  </p>
                  <span className="inline-block mt-2 text-[10px] font-bold text-slate-600 bg-slate-200 px-2 py-0.5 rounded">
                    Start from Scratch
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Project Google Drive Link */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Project Google Drive Link (Plans & Specifications Folder)
            </label>
            <div className="relative">
              <FolderOpen className="w-4 h-4 text-blue-600 absolute left-3 top-3 pointer-events-none" />
              <input
                type="url"
                placeholder="https://drive.google.com/drive/folders/..."
                value={driveLink}
                onChange={(e) => setDriveLink(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent font-mono text-slate-800"
              />
            </div>
            <p className="text-[10px] text-slate-500 mt-1">
              Global link automatically inserted into all Tender Invitation emails sent across this project.
            </p>
          </div>

          {/* Description & Scope Notes */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Project Description & Scope Notes
            </label>
            <div className="relative">
              <AlignLeft className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
              <textarea
                rows={2}
                placeholder="Key specifications, milestones, target groundbreaking date, or tender instructions..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent leading-relaxed"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="pt-3 border-t border-slate-200 flex items-center justify-between gap-3">
            {isEditing && onDeleteProject && projectToEdit ? (
              <button
                type="button"
                id="delete-project-from-modal-btn"
                onClick={() => {
                  onClose();
                  onDeleteProject(projectToEdit.id);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer border border-transparent hover:border-rose-200"
              >
                <Trash2 className="w-4 h-4" />
                <span>Delete Project</span>
              </button>
            ) : (
              <div />
            )}

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                id="save-project-submit-btn"
                className="px-5 py-2.5 text-xs font-extrabold bg-blue-600 hover:bg-blue-500 text-white rounded-xl shadow-md transition-all cursor-pointer flex items-center gap-1.5"
              >
                {isEditing ? <Check className="w-4 h-4" /> : <FolderPlus className="w-4 h-4" />}
                <span>{isEditing ? 'Save Changes' : 'Create Project'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
