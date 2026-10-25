import React, { useState, useRef, useEffect } from 'react';
import { 
  Building2, 
  FileSpreadsheet, 
  Users, 
  Plus, 
  RefreshCw, 
  TrendingUp, 
  DollarSign, 
  CheckCircle2, 
  Layers, 
  ArrowLeft, 
  Edit3, 
  ChevronDown, 
  MapPin, 
  Download, 
  Upload,
  MoreVertical,
  Sparkles,
  CalendarClock,
  ExternalLink,
  LogOut,
  FileText,
  Trash2
} from 'lucide-react';
import { ScopeLineItem, GoogleSheetsConfig, Project, GoogleUserProfile } from '../types';
import { calculateMasterProgress, calculatePhaseBudget, formatCurrency } from '../utils/formatters';
import { GoogleLoginButton } from './GoogleAuthButton';
import { googleAuthService } from '../services/googleAuthService';
import { HeaderSyncBadge } from './HeaderSyncBadge';

interface HeaderProps {
  project: Project;
  projects: Project[];
  sheetsConfig: GoogleSheetsConfig;
  contactCount: number;
  isSyncing: boolean;
  pendingScheduledCount?: number;
  onSignOut?: () => void;
  onNavigateHome: () => void;
  onSelectProject: (projectId: string) => void;
  onOpenEditProjectModal: () => void;
  onOpenSyncModal: () => void;
  onOpenContactDirectory: () => void;
  onOpenScheduledQueue?: () => void;
  onOpenAddScopeModal: () => void;
  onTriggerSync: () => void;
  onLiveSheetsResync?: () => void;
  onExportScopeTemplate?: () => void;
  onImportScopesCsv?: (file: File) => void;
  onExportBudgetTemplate?: () => void;
  onImportBudgetCsv?: (file: File) => void;
  onOpenBudgetUploadModal?: () => void;
  onExportApprovedPoPdf?: () => void;
  onDeleteDemoProjects?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  project,
  projects,
  sheetsConfig,
  contactCount,
  isSyncing,
  pendingScheduledCount = 0,
  onSignOut,
  onNavigateHome,
  onSelectProject,
  onOpenEditProjectModal,
  onOpenSyncModal,
  onOpenContactDirectory,
  onOpenScheduledQueue,
  onOpenAddScopeModal,
  onTriggerSync,
  onLiveSheetsResync,
  onExportScopeTemplate,
  onImportScopesCsv,
  onExportBudgetTemplate,
  onImportBudgetCsv,
  onOpenBudgetUploadModal,
  onExportApprovedPoPdf,
  onDeleteDemoProjects,
}) => {
  const masterProgress = calculateMasterProgress(project.scopes);
  const totalMetrics = calculatePhaseBudget(project.scopes);
  const [isActionsMenuOpen, setIsActionsMenuOpen] = useState(false);
  const [isProjectMenuOpen, setIsProjectMenuOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<GoogleUserProfile | null>(() => googleAuthService.getCurrentUser());
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => googleAuthService.isLoggedIn());
  const actionsMenuRef = useRef<HTMLDivElement>(null);
  const projectMenuRef = useRef<HTMLDivElement>(null);
  const scopeFileInputRef = useRef<HTMLInputElement>(null);
  const budgetFileInputRef = useRef<HTMLInputElement>(null);

  // Link to master Google Sheet workbook (converted to interactive edit URL for browser viewing)
  const masterSheetWebUrl = React.useMemo(() => {
    const raw = sheetsConfig?.sheetUrl || 'https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit';
    if (raw.includes('/export')) {
      return raw.replace(/\/export.*$/, '/edit');
    }
    return raw;
  }, [sheetsConfig?.sheetUrl]);

  useEffect(() => {
    const handleAuthSync = () => {
      setCurrentUser(googleAuthService.getCurrentUser());
      setIsAuthenticated(googleAuthService.isLoggedIn());
    };
    window.addEventListener('zenith_auth_state_changed', handleAuthSync);
    window.addEventListener('storage', handleAuthSync);
    return () => {
      window.removeEventListener('zenith_auth_state_changed', handleAuthSync);
      window.removeEventListener('storage', handleAuthSync);
    };
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (actionsMenuRef.current && !actionsMenuRef.current.contains(target)) {
        setIsActionsMenuOpen(false);
      }
      if (projectMenuRef.current && !projectMenuRef.current.contains(target)) {
        setIsProjectMenuOpen(false);
      }
    };
    if (isActionsMenuOpen || isProjectMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isActionsMenuOpen, isProjectMenuOpen]);

  return (
    <header className="w-full max-w-full bg-slate-900 text-white border-b border-slate-800 shadow-md relative z-50 overflow-visible">
      {/* Main Top Navigation Container */}
      <div 
        className="w-full max-w-[100vw] box-border flex items-center justify-between overflow-visible px-4 py-2 relative z-50"
        style={{
          width: '100%',
          maxWidth: '100vw',
          boxSizing: 'border-box',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          overflow: 'visible',
          padding: '0.5rem 1rem',
          gap: '8px'
        }}
      >
        {/* Left Section: App Branding & Project Selectors */}
        <div className="flex items-center gap-2 shrink-0 min-w-0" style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0, minWidth: 0 }}>
          {/* Zenith Tender Management Logo */}
          <button
            type="button"
            id="header-zenith-logo-btn"
            onClick={onNavigateHome}
            className="flex items-center gap-2 text-left group transition-all hover:opacity-95 cursor-pointer shrink-0"
            title="Zenith Tender Management - Return to Main Portfolio Dashboard"
          >
            <div className="p-1.5 bg-blue-600 rounded-xl shadow-inner group-hover:bg-blue-500 transition-colors shrink-0">
              <Building2 className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
            </div>
            <div className="hidden xl:flex flex-col">
              <span className="text-xs font-extrabold tracking-tight text-white group-hover:text-blue-200 transition-colors whitespace-nowrap">
                Zenith Tender Management
              </span>
              <span className="text-[10px] text-slate-400 font-medium leading-none">
                Portfolio Hub
              </span>
            </div>
          </button>

          {/* Multi-Project Portal Return Button */}
          <button
            type="button"
            id="header-multi-project-portal-btn"
            onClick={onNavigateHome}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-blue-300 hover:text-white rounded-lg border border-slate-700 hover:border-slate-600 transition-colors cursor-pointer text-xs font-bold shrink-0 shadow-xs whitespace-nowrap"
            title="Return to Main Multi-Project Dashboard"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-blue-400 shrink-0" />
            <span className="hidden sm:inline">Portal</span>
          </button>

          <div className="h-5 w-px bg-slate-700 hidden sm:block shrink-0" />

          {/* Project Switcher Dropdown with Elevated Floating Menu */}
          <div className="relative flex items-center gap-1.5 shrink-0 min-w-0" ref={projectMenuRef}>
            <span className="px-1.5 py-0.5 text-[10px] font-mono font-bold bg-blue-900/80 text-blue-300 border border-blue-700/50 rounded shrink-0">
              {project.code || 'PRJ'}
            </span>
            
            <button
              type="button"
              id="header-project-selector-btn"
              onClick={() => setIsProjectMenuOpen(!isProjectMenuOpen)}
              className="flex items-center gap-1.5 bg-slate-800/80 hover:bg-slate-700 text-white hover:text-blue-200 px-2.5 py-1 rounded-lg border border-slate-700/80 font-bold text-xs sm:text-sm focus:outline-none focus:ring-1 focus:ring-blue-400 cursor-pointer transition-colors max-w-[180px] shrink-0"
              title={`Switch active project (Current: ${project.name})`}
              aria-expanded={isProjectMenuOpen}
            >
              <span className="truncate max-w-[140px] text-left">{project.name}</span>
              <ChevronDown className={`w-3.5 h-3.5 text-slate-400 shrink-0 transition-transform duration-150 ${isProjectMenuOpen ? 'rotate-180 text-blue-400' : ''}`} />
            </button>

            {/* Elevated Project Selector Dropdown Menu */}
            {isProjectMenuOpen && (
              <div 
                className="absolute left-0 top-full mt-1.5 w-72 max-h-80 overflow-y-auto bg-slate-900 border border-slate-700 rounded-xl shadow-2xl py-1.5 z-[9999] animate-in fade-in zoom-in-95 duration-100 divide-y divide-slate-800"
                style={{ position: 'absolute', zIndex: 9999 }}
              >
                <div className="px-3.5 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono flex items-center justify-between">
                  <span>Switch Project Workspace</span>
                  <span className="text-[9px] text-blue-400 font-normal">{projects.length} available</span>
                </div>
                <div className="py-1">
                  {projects.map((p) => {
                    const isCurrent = p.id === project.id;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        id={`header-project-opt-${p.id}`}
                        onClick={() => {
                          setIsProjectMenuOpen(false);
                          onSelectProject(p.id);
                        }}
                        className={`w-full text-left px-3.5 py-2 text-xs flex items-center justify-between hover:bg-slate-800 transition-colors cursor-pointer group ${
                          isCurrent ? 'bg-blue-900/40 text-blue-200 font-bold' : 'text-slate-200'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0 pr-2">
                          <span className="px-1.5 py-0.5 text-[9px] font-mono font-bold bg-slate-800 group-hover:bg-slate-700 text-slate-300 border border-slate-700 rounded shrink-0">
                            {p.code || 'PRJ'}
                          </span>
                          <span className="truncate text-xs">{p.name}</span>
                        </div>
                        {isCurrent && (
                          <CheckCircle2 className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <button
              type="button"
              id="header-edit-project-btn"
              onClick={onOpenEditProjectModal}
              className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors cursor-pointer shrink-0"
              title="Edit Project Details"
            >
              <Edit3 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Middle Section: Main Visible Header Action Controls */}
        <div 
          className="flex items-center gap-2 shrink-0"
          style={{
            display: 'flex',
            flexDirection: 'row',
            flexWrap: 'nowrap',
            alignItems: 'center',
            gap: '8px',
            flexShrink: 0
          }}
        >
          {/* 1. Add Scope Item (Primary action button) */}
          <button
            id="header-add-scope-btn"
            onClick={onOpenAddScopeModal}
            className="inline-flex items-center gap-1.5 py-1.5 px-3 text-xs font-bold bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white rounded-lg transition-all shadow-sm cursor-pointer shrink-0 whitespace-nowrap focus:outline-none focus:ring-1 focus:ring-blue-400"
            title="Add New Scope Item"
          >
            <Plus className="w-3.5 h-3.5 shrink-0" />
            <span>+ Add Scope Item</span>
          </button>

          {/* 2. Export PO List (PDF) */}
          {onExportApprovedPoPdf && (
            <button
              type="button"
              id="header-top-export-po-pdf-btn"
              onClick={onExportApprovedPoPdf}
              className="inline-flex items-center gap-1.5 py-1.5 px-3 text-xs font-bold bg-slate-800 hover:bg-slate-700 text-emerald-300 hover:text-emerald-200 border border-emerald-500/40 hover:border-emerald-500/70 rounded-lg transition-all shadow-xs cursor-pointer shrink-0 whitespace-nowrap"
              title="Export approved purchase orders and scopes report as PDF"
            >
              <FileText className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>📄 Export PO List (PDF)</span>
            </button>
          )}

          {/* 3. Contact Directory [COUNT] */}
          <button
            id="header-contact-directory-btn"
            onClick={onOpenContactDirectory}
            className="inline-flex items-center gap-1.5 py-1.5 px-3 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg transition-colors cursor-pointer shadow-xs shrink-0 whitespace-nowrap"
            title="Central Contractor Directory"
          >
            <Users className="w-3.5 h-3.5 text-blue-400 shrink-0" />
            <span>📇 Contact Directory</span>
            <span className="px-1.5 py-0.5 text-[10px] font-bold bg-slate-700 text-slate-300 rounded-md shrink-0">
              {contactCount}
            </span>
          </button>
        </div>

        {/* Right Section: User Profile & Sign Out anchored to right margin + Overflow Menu */}
        <div 
          className="flex items-center gap-2 shrink-0 ml-auto"
          style={{
            flexShrink: 0,
            marginLeft: 'auto',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          {/* 4. User Profile Avatar & Sign Out badge */}
          {currentUser && (
            <div className="flex items-center gap-1.5 sm:gap-2 bg-slate-800/90 border border-slate-700/80 rounded-lg px-2 py-1 shrink-0 shadow-xs whitespace-nowrap">
              {currentUser.photoURL ? (
                <img
                  src={currentUser.photoURL}
                  alt={currentUser.name}
                  className="w-5 h-5 sm:w-6 sm:h-6 rounded-full border border-slate-600 object-cover shrink-0"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-[10px] shrink-0">
                  {currentUser.name?.charAt(0).toUpperCase() || 'U'}
                </div>
              )}
              <div className="hidden lg:flex flex-col text-left leading-tight">
                <span className="text-xs font-bold text-slate-200 truncate max-w-[100px]">{currentUser.name}</span>
                <span className="text-[9px] text-slate-400 font-mono truncate max-w-[100px]">@{currentUser.domain || 'thezenithgroup.ca'}</span>
              </div>
              <button
                type="button"
                id="header-signout-btn"
                onClick={() => {
                  if (onSignOut) {
                    onSignOut();
                  } else {
                    googleAuthService.signOut();
                    setCurrentUser(null);
                    setIsAuthenticated(false);
                  }
                }}
                className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold text-slate-300 hover:text-white bg-slate-700/80 hover:bg-rose-900/40 hover:text-rose-300 border border-slate-600/70 hover:border-rose-700/50 rounded transition-colors cursor-pointer shrink-0"
                title={`Sign Out (${currentUser.email})`}
              >
                <LogOut className="w-3 h-3" />
                <span className="hidden sm:inline">Sign Out</span>
              </button>
            </div>
          )}

          {/* Consolidated Overflow Menu (⋮) Next to User Profile */}
          <div className="relative shrink-0" ref={actionsMenuRef}>
            <button
              type="button"
              id="header-actions-menu-btn"
              onClick={() => setIsActionsMenuOpen(!isActionsMenuOpen)}
              className="p-1.5 sm:p-2 text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors cursor-pointer shadow-xs focus:outline-none focus:ring-1 focus:ring-blue-500 shrink-0"
              title="Administrative Utilities, Sync & Project Tools"
              aria-label="More actions"
              aria-expanded={isActionsMenuOpen}
            >
              <MoreVertical className="w-4 h-4" />
            </button>

              {isActionsMenuOpen && (
                <div 
                  className="absolute right-0 mt-2 w-80 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl py-1.5 z-[9999] animate-in fade-in zoom-in-95 duration-100 divide-y divide-slate-800"
                  style={{ position: 'absolute', zIndex: 9999 }}
                >
                  {/* Consolidated Admin & Sync Tools */}
                  <div className="py-1">
                    <div className="px-3.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono">
                      Admin & Sync Utilities
                    </div>

                    {/* ⚡ Live Webhook Sync Status */}
                    <HeaderSyncBadge
                      masterSheetUrl={masterSheetWebUrl}
                      totalProjectsCount={projects.length || 10}
                      totalFormsCount={44}
                      trigger={(openDiagnostics) => (
                        <button
                          type="button"
                          id="header-menu-webhook-sync-status-btn"
                          onClick={() => {
                            setIsActionsMenuOpen(false);
                            openDiagnostics();
                          }}
                          className="w-full text-left flex items-center justify-between px-3.5 py-2 text-xs font-semibold text-emerald-300 hover:text-emerald-200 hover:bg-slate-800 transition-colors cursor-pointer group"
                          title="Open live webhook synchronization diagnostics & connection logs"
                        >
                          <div className="flex items-center gap-2.5">
                            <span className="relative flex h-2 w-2 shrink-0">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                            </span>
                            <span>⚡ Live Webhook Sync Status</span>
                          </div>
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                            44 Forms • 🟢 Live
                          </span>
                        </button>
                      )}
                    />

                    {/* 🔄 Sync Sheets Data */}
                    <button
                      type="button"
                      id="header-menu-sync-sheets-btn"
                      onClick={() => {
                        setIsActionsMenuOpen(false);
                        if (onLiveSheetsResync) onLiveSheetsResync();
                        else onTriggerSync();
                      }}
                      disabled={isSyncing}
                      className="w-full text-left flex items-center justify-between px-3.5 py-2 text-xs font-semibold text-blue-300 hover:text-blue-200 hover:bg-slate-800 transition-colors cursor-pointer disabled:opacity-50"
                      title="Sync latest quotes and submissions from Google Sheets in real time"
                    >
                      <div className="flex items-center gap-2.5">
                        <RefreshCw className={`w-4 h-4 text-blue-400 shrink-0 ${isSyncing ? 'animate-spin' : ''}`} />
                        <span>🔄 Sync Sheets Data</span>
                      </div>
                      {isSyncing && (
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300">
                          Syncing...
                        </span>
                      )}
                    </button>

                    {/* 📅 Scheduled Queue */}
                    {onOpenScheduledQueue && (
                      <button
                        type="button"
                        id="header-menu-scheduled-queue-btn"
                        onClick={() => {
                          setIsActionsMenuOpen(false);
                          onOpenScheduledQueue();
                        }}
                        className="w-full text-left flex items-center justify-between px-3.5 py-2 text-xs font-semibold text-amber-300 hover:text-amber-200 hover:bg-slate-800 transition-colors cursor-pointer group"
                        title="View & manage scheduled email dispatches"
                      >
                        <div className="flex items-center gap-2.5">
                          <CalendarClock className="w-4 h-4 text-amber-400 shrink-0 group-hover:scale-110 transition-transform" />
                          <span>📅 Scheduled Queue</span>
                        </div>
                        {pendingScheduledCount > 0 && (
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                            {pendingScheduledCount} Pending
                          </span>
                        )}
                      </button>
                    )}

                    {/* 🧹 Delete Example/Demo Projects */}
                    {onDeleteDemoProjects && (
                      <button
                        type="button"
                        id="header-menu-delete-demo-projects-btn"
                        onClick={() => {
                          setIsActionsMenuOpen(false);
                          onDeleteDemoProjects();
                        }}
                        className="w-full text-left flex items-center gap-2.5 px-3.5 py-2 text-xs font-semibold text-rose-300 hover:text-rose-200 hover:bg-slate-800 transition-colors cursor-pointer"
                        title="Delete all default seed/example project documents and associated quotes from Firestore"
                      >
                        <Trash2 className="w-4 h-4 text-rose-400 shrink-0" />
                        <span>🧹 Delete Example/Demo Projects</span>
                      </button>
                    )}
                  </div>

                  {/* Master Budget Section */}
                  {(onOpenBudgetUploadModal || onImportBudgetCsv || onExportBudgetTemplate) && (
                    <div className="py-1">
                      <div className="px-3.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono flex items-center justify-between">
                        <span>Master Budget Extraction</span>
                        <span className="text-[9px] text-amber-400 font-normal">PDF / CSV</span>
                      </div>
                      {onOpenBudgetUploadModal && (
                        <button
                          type="button"
                          id="header-menu-upload-budget-modal-btn"
                          onClick={() => {
                            setIsActionsMenuOpen(false);
                            onOpenBudgetUploadModal();
                          }}
                          className="w-full text-left flex items-center justify-between px-3.5 py-2 text-xs font-semibold text-amber-300 hover:text-amber-200 hover:bg-slate-800 transition-colors cursor-pointer group"
                        >
                          <div className="flex items-center gap-2.5">
                            <Sparkles className="w-4 h-4 text-amber-400 shrink-0 group-hover:scale-110 transition-transform" />
                            <span>Upload Project Budget (PDF/CSV)</span>
                          </div>
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300">
                            Auto-Map
                          </span>
                        </button>
                      )}

                      {onImportBudgetCsv && (
                        <button
                          type="button"
                          id="header-menu-import-budget-btn"
                          onClick={() => {
                            setIsActionsMenuOpen(false);
                            budgetFileInputRef.current?.click();
                          }}
                          className="w-full text-left flex items-center gap-2.5 px-3.5 py-2 text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                        >
                          <span className="text-sm shrink-0">📄</span>
                          <span>Quick Import Budget (.CSV)</span>
                        </button>
                      )}

                      {onExportBudgetTemplate && (
                        <button
                          type="button"
                          id="header-menu-export-budget-template-btn"
                          onClick={() => {
                            setIsActionsMenuOpen(false);
                            onExportBudgetTemplate();
                          }}
                          className="w-full text-left flex items-center gap-2.5 px-3.5 py-2 text-xs font-semibold text-slate-200 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                        >
                          <span className="text-sm shrink-0">📥</span>
                          <span>Export Budget Template (.CSV)</span>
                        </button>
                      )}
                    </div>
                  )}

                  {/* Scope Packages Section */}
                  {(onExportScopeTemplate || onImportScopesCsv) && (
                    <div className="py-1">
                      <div className="px-3.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono">
                        Scope Packages
                      </div>
                      {onExportScopeTemplate && (
                        <button
                          type="button"
                          id="header-menu-export-scopes-template-btn"
                          onClick={() => {
                            setIsActionsMenuOpen(false);
                            onExportScopeTemplate();
                          }}
                          className="w-full text-left flex items-center gap-2.5 px-3.5 py-2 text-xs font-semibold text-slate-200 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                        >
                          <Download className="w-4 h-4 text-blue-400 shrink-0" />
                          <span>Export Scope Packages Template (.CSV)</span>
                        </button>
                      )}

                      {onImportScopesCsv && (
                        <button
                          type="button"
                          id="header-menu-import-scopes-btn"
                          onClick={() => {
                            setIsActionsMenuOpen(false);
                            scopeFileInputRef.current?.click();
                          }}
                          className="w-full text-left flex items-center gap-2.5 px-3.5 py-2 text-xs font-semibold text-emerald-300 hover:text-emerald-200 hover:bg-slate-800 transition-colors cursor-pointer"
                        >
                          <Upload className="w-4 h-4 text-emerald-400 shrink-0" />
                          <span>Import Scope Packages (.CSV)</span>
                        </button>
                      )}
                    </div>
                  )}

                  {/* PO PDF Export Quick Access */}
                  {onExportApprovedPoPdf && (
                    <div className="py-1">
                      <button
                        type="button"
                        id="header-menu-export-po-pdf-btn"
                        onClick={() => {
                          setIsActionsMenuOpen(false);
                          onExportApprovedPoPdf();
                        }}
                        className="w-full text-left flex items-center gap-2.5 px-3.5 py-2 text-xs font-semibold text-emerald-300 hover:text-emerald-200 hover:bg-slate-800 transition-colors cursor-pointer"
                      >
                        <FileText className="w-4 h-4 text-emerald-400 shrink-0" />
                        <span>📄 Export PO List (PDF)</span>
                      </button>
                    </div>
                  )}
                </div>
              )}

              {onImportScopesCsv && (
                <input
                  ref={scopeFileInputRef}
                  id="header-import-scopes-input"
                  type="file"
                  accept=".csv,text/csv,text/plain"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      onImportScopesCsv(file);
                      e.target.value = '';
                    }
                  }}
                />
              )}

              {onImportBudgetCsv && (
                <input
                  ref={budgetFileInputRef}
                  id="header-import-budget-input"
                  type="file"
                  accept=".csv,text/csv,text/plain"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      onImportBudgetCsv(file);
                      e.target.value = '';
                    }
                  }}
                />
              )}
            </div>
          </div>
        </div>

        {/* Master Progress Bar & Overall Project Status Section */}
        <div className="mt-2 pt-3 border-t border-slate-800 space-y-3 px-4 sm:px-6 lg:px-8 pb-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-blue-400" />
              <span className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                Project Statistics & Procurement Overview
              </span>
            </div>

            {/* Export PO List (PDF) next to project statistics */}
            {onExportApprovedPoPdf && (
              <button
                type="button"
                id="header-export-po-pdf-btn"
                onClick={onExportApprovedPoPdf}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-slate-800/90 hover:bg-slate-700 text-emerald-300 hover:text-emerald-200 border border-emerald-500/40 hover:border-emerald-500/70 rounded-xl transition-all shadow-xs cursor-pointer shrink-0"
                title="Export approved purchase orders and scopes report as PDF"
              >
                <span>📄 Export PO List (PDF)</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-center">
            {/* Master Progress Bar */}
          <div className="lg:col-span-6 bg-slate-800/80 rounded-xl p-3.5 border border-slate-700/60 shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-blue-400" />
                <span className="text-xs font-semibold text-slate-200 uppercase tracking-wider">
                  Master Project Procurement Progress
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-base font-bold text-white tracking-tight">
                  {masterProgress}%
                </span>
                <span className="text-[11px] text-slate-400">
                  across {Math.max(1, 5 - (project.deletedPhaseIds?.length || 0))} phase{Math.max(1, 5 - (project.deletedPhaseIds?.length || 0)) === 1 ? '' : 's'}
                </span>
              </div>
            </div>

            {/* Main Progress Track */}
            <div className="w-full bg-slate-900 rounded-full h-3 overflow-hidden p-0.5 border border-slate-700/80">
              <div
                className="h-full rounded-full transition-all duration-500 ease-out bg-linear-to-r from-blue-500 via-indigo-500 to-emerald-500"
                style={{ width: `${masterProgress}%` }}
              />
            </div>

            <div className="flex items-center justify-between text-[11px] text-slate-400 mt-2">
              <span>{totalMetrics.poApprovedCount} of {totalMetrics.totalScopesCount} scopes PO Approved</span>
              <span>{totalMetrics.totalQuotesCount} total contractor quote submissions</span>
            </div>
          </div>

          {/* Master Budget Snapshot */}
          <div className="lg:col-span-6 grid grid-cols-3 gap-2.5">
            {/* Total Budget */}
            <div className="bg-slate-800/60 rounded-xl p-3 border border-slate-700/50">
              <div className="flex items-center gap-1.5 text-slate-400 mb-1">
                <DollarSign className="w-3.5 h-3.5 text-blue-400" />
                <span className="text-[11px] font-medium uppercase tracking-wider">Target Budget</span>
              </div>
              <p className="text-sm sm:text-base font-bold text-slate-100 tracking-tight">
                {formatCurrency(project.targetBudget || totalMetrics.totalBudget)}
              </p>
              <p className="text-[10px] text-slate-400 mt-0.5">{totalMetrics.totalScopesCount} total scope lines</p>
            </div>

            {/* Quoted / Committed */}
            <div className="bg-slate-800/60 rounded-xl p-3 border border-slate-700/50">
              <div className="flex items-center gap-1.5 text-slate-400 mb-1">
                <Layers className="w-3.5 h-3.5 text-indigo-400" />
                <span className="text-[11px] font-medium uppercase tracking-wider">Quoted / Committed</span>
              </div>
              <p className="text-sm sm:text-base font-bold text-slate-100 tracking-tight">
                {formatCurrency(totalMetrics.totalQuotedCommitted)}
              </p>
              <p className="text-[10px] text-slate-400 mt-0.5">Best submitted quotes</p>
            </div>

            {/* Variance */}
            <div className="bg-slate-800/60 rounded-xl p-3 border border-slate-700/50">
              <div className="flex items-center gap-1.5 text-slate-400 mb-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-[11px] font-medium uppercase tracking-wider">Budget Variance</span>
              </div>
              <p className={`text-sm sm:text-base font-bold tracking-tight ${((project.targetBudget || totalMetrics.totalBudget) - totalMetrics.totalQuotedCommitted) >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {((project.targetBudget || totalMetrics.totalBudget) - totalMetrics.totalQuotedCommitted) >= 0 ? '+' : ''}
                {formatCurrency((project.targetBudget || totalMetrics.totalBudget) - totalMetrics.totalQuotedCommitted)}
              </p>
              <p className="text-[10px] text-slate-400 mt-0.5">
                {((project.targetBudget || totalMetrics.totalBudget) - totalMetrics.totalQuotedCommitted) >= 0 ? 'Under target budget' : 'Exceeds budget'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

