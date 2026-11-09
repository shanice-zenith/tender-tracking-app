import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  Building2,
  Plus,
  Search,
  MapPin,
  User,
  TrendingUp,
  CheckCircle2,
  Clock,
  Layers,
  Users,
  FileSpreadsheet,
  ArrowRight,
  Edit3,
  Trash2,
  Copy,
  DollarSign,
  AlertCircle,
  BarChart3,
  Calendar,
  RefreshCw,
  Download,
  Upload,
  MoreVertical,
  CalendarClock,
  LogOut,
  FileText
} from 'lucide-react';
import { Project, ProjectStatus, Contact, GoogleSheetsConfig, GoogleUserProfile } from '../types';
import { formatCurrency, calculateMasterProgress, calculatePhaseProgress, isScopePOApproved } from '../utils/formatters';
import { GoogleLoginButton } from './GoogleAuthButton';
import { googleAuthService } from '../services/googleAuthService';
import { HeaderSyncBadge } from './HeaderSyncBadge';

interface ProjectDashboardProps {
  projects: Project[];
  contacts: Contact[];
  sheetsConfig?: GoogleSheetsConfig;
  isSyncing?: boolean;
  pendingScheduledCount?: number;
  onSignOut?: () => void;
  onSelectProject: (projectId: string) => void;
  onOpenCreateProjectModal: () => void;
  onOpenEditProjectModal: (project: Project) => void;
  onDuplicateProject: (project: Project) => void;
  onDeleteProject: (projectId: string) => void;
  onOpenContactDirectory: () => void;
  onOpenScheduledQueue?: () => void;
  onOpenSheetsSyncModal?: () => void;
  onTriggerInstantSync?: () => void;
  onLiveSheetsResync?: () => void;
  onExportProjectTemplate?: () => void;
  onImportProjectsCsv?: (file: File) => void;
  onExportSubmissionsTemplate?: () => void;
  onImportSubmissionsCsv?: (file: File) => void
  onExportApprovedPoPdf?: (project: Project) => void;
  onDeleteDemoProjects?: () => void;
}

export const ProjectDashboard: React.FC<ProjectDashboardProps> = ({
  projects,
  contacts,
  sheetsConfig,
  isSyncing = false,
  pendingScheduledCount = 0,
  onSignOut,
  onSelectProject,
  onOpenCreateProjectModal,
  onOpenEditProjectModal,
  onDuplicateProject,
  onDeleteProject,
  onOpenContactDirectory,
  onOpenScheduledQueue,
  onOpenSheetsSyncModal,
  onTriggerInstantSync,
  onLiveSheetsResync,
  onExportProjectTemplate,
  onImportProjectsCsv,
  onExportSubmissionsTemplate,
  onImportSubmissionsCsv,
  onExportApprovedPoPdf,
  onDeleteDemoProjects,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [isActionsMenuOpen, setIsActionsMenuOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<GoogleUserProfile | null>(() => googleAuthService.getCurrentUser());
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => googleAuthService.isLoggedIn());
  const actionsMenuRef = useRef<HTMLDivElement>(null);
  const projectFileInputRef = useRef<HTMLInputElement>(null);
  const submissionsFileInputRef = useRef<HTMLInputElement>(null);

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
      if (actionsMenuRef.current && !actionsMenuRef.current.contains(event.target as Node)) {
        setIsActionsMenuOpen(false);
      }
    };
    if (isActionsMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isActionsMenuOpen]);

  // Filtered projects
  const filteredProjects = useMemo(() => {
    return projects.filter((p) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        p.name.toLowerCase().includes(q) ||
        (p.code && p.code.toLowerCase().includes(q)) ||
        (p.client && p.client.toLowerCase().includes(q)) ||
        (p.location && p.location.toLowerCase().includes(q)) ||
        (p.description && p.description.toLowerCase().includes(q));

      const matchesStatus = statusFilter === 'ALL' || p.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [projects, searchQuery, statusFilter]);

  // Overall Portfolio Statistics
  const portfolioStats = useMemo(() => {
    let totalTargetBudget = 0;
    let totalCommitted = 0;
    let totalScopes = 0;
    let totalPOsSent = 0;
    let totalTradesCount = 0;

    projects.forEach((proj) => {
      totalTargetBudget += proj.targetBudget || 0;
      totalScopes += proj.scopes.length;

      proj.scopes.forEach((scope) => {
        totalTradesCount += scope.trades.length;
        const awarded = scope.trades.find((t) => t.isAwarded) ||
          (scope.trades.length > 0 ? scope.trades.reduce((min, t) => (t.quotedFigure < min.quotedFigure && t.quotedFigure > 0 ? t : min), scope.trades[0]) : null);
        if (awarded && awarded.quotedFigure > 0) {
          totalCommitted += awarded.quotedFigure;
        }
        if (isScopePOApproved(scope)) {
          totalPOsSent++;
        }
      });
    });

    const avgProgress = projects.length > 0
      ? Math.round(
        projects.reduce((acc, p) => acc + calculateMasterProgress(p.scopes), 0) / projects.length
      )
      : 0;

    return {
      totalProjects: projects.length,
      totalTargetBudget,
      totalCommitted,
      totalVariance: totalTargetBudget - totalCommitted,
      totalScopes,
      totalPOsSent,
      totalTradesCount,
      avgProgress
    };
  }, [projects]);

  const getStatusBadge = (status: ProjectStatus) => {
    switch (status) {
      case 'Tender Active':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'In Progress':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'Planning':
        return 'bg-amber-50 text-amber-800 border-amber-200';
      case 'Under Review':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'Completed':
        return 'bg-slate-100 text-slate-700 border-slate-300';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans antialiased">
      {/* Executive Portfolio Header */}
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
          {/* Left Section: Branding & Title */}
          <button
            type="button"
            id="dashboard-zenith-logo-btn"
            onClick={() => {
              setSearchQuery('');
              setStatusFilter('ALL');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className="flex items-center gap-2.5 text-left group cursor-pointer focus:outline-none shrink-0"
            title="Zenith Tender Management - Multi-Project Portal"
          >
            <div className="p-2 bg-blue-600 group-hover:bg-blue-500 rounded-xl shadow-inner transition-colors shrink-0">
              <Building2 className="w-5 h-5 text-white" />
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <h1 className="text-sm sm:text-base font-extrabold tracking-tight text-white group-hover:text-blue-200 transition-colors whitespace-nowrap">
                  Zenith Tender Management
                </h1>
                <span className="hidden sm:inline-flex px-1.5 py-0.5 text-[9px] font-extrabold bg-blue-500/20 text-blue-300 border border-blue-400/30 rounded group-hover:bg-blue-500/30 transition-colors shrink-0">
                  Portal
                </span>
              </div>
            </div>
          </button>

          {/* Middle Section: Action Controls */}
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
            {/* + New Project (Primary action button) */}
            <button
              type="button"
              id="home-add-project-btn"
              onClick={onOpenCreateProjectModal}
              className="inline-flex items-center gap-1.5 py-1.5 px-3 text-xs font-bold bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white rounded-lg transition-all shadow-sm cursor-pointer shrink-0 whitespace-nowrap focus:outline-none focus:ring-1 focus:ring-blue-400"
              title="Create New Project Workspace"
            >
              <Plus className="w-3.5 h-3.5 shrink-0" />
              <span>+ New Project</span>
            </button>

            {/* Contact Directory [COUNT] */}
            <button
              type="button"
              id="home-contact-directory-btn"
              onClick={onOpenContactDirectory}
              className="inline-flex items-center gap-1.5 py-1.5 px-3 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg transition-colors cursor-pointer shadow-xs shrink-0 whitespace-nowrap"
              title="Open Central Contractor & Subtrade Directory"
            >
              <Users className="w-3.5 h-3.5 text-blue-400 shrink-0" />
              <span>📇 Contact Directory</span>
              <span className="px-1.5 py-0.5 text-[10px] font-bold bg-slate-700 text-slate-300 rounded-md shrink-0">
                {contacts.length}
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
            {/* User Profile Avatar & Sign Out badge */}
            {currentUser && (
              <div className="flex items-center gap-1.5 sm:gap-2 bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 shrink-0 shadow-xs whitespace-nowrap">
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
                  id="dashboard-signout-btn"
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
                id="home-actions-menu-btn"
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
                  className="absolute right-0 mt-2 w-72 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl py-1.5 z-[9999] animate-in fade-in zoom-in-95 duration-100 divide-y divide-slate-800"
                  style={{ position: 'absolute', zIndex: 9999 }}
                >
                  {/* Admin & Sync Utilities */}
                  <div className="py-1">
                    <div className="px-3.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono">
                      Admin & Sync Utilities
                    </div>

                    {/* ⚡ Live Webhook Sync Status */}
                    <HeaderSyncBadge
                      masterSheetUrl={
                        sheetsConfig?.sheetUrl
                          ? sheetsConfig.sheetUrl.replace(/\/export.*$/, '/edit')
                          : 'https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit'
                      }
                      totalProjectsCount={projects.length || 10}
                      totalFormsCount={44}
                      trigger={(openDiagnostics) => (
                        <button
                          type="button"
                          id="home-menu-webhook-sync-status-btn"
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
                            44 Forms
                          </span>
                        </button>
                      )}
                    />

                    {/* 🔄 Sync Sheets Data */}
                    <button
                      type="button"
                      id="home-menu-sync-sheets-btn"
                      onClick={() => {
                        setIsActionsMenuOpen(false);
                        if (onLiveSheetsResync) onLiveSheetsResync();
                        else if (onTriggerInstantSync) onTriggerInstantSync();
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
                        id="home-menu-scheduled-queue-btn"
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
                        id="home-menu-delete-demo-projects-btn"
                        onClick={() => {
                          setIsActionsMenuOpen(false);
                          onDeleteDemoProjects();
                        }}
                        className="w-full text-left flex items-center gap-2.5 px-3.5 py-2 text-xs font-semibold text-rose-300 hover:text-rose-200 hover:bg-slate-800 transition-colors cursor-pointer"
                        title="Remove all default seed/example project documents and their associated quotes from Firestore"
                      >
                        <Trash2 className="w-4 h-4 text-rose-400 shrink-0" />
                        <span>🧹 Delete Example/Demo Projects</span>
                      </button>
                    )}
                  </div>
                  {/* CSV Template & Import Tools */}
                  {(onExportProjectTemplate || onImportProjectsCsv || onExportSubmissionsTemplate || onImportSubmissionsCsv) && (
                    <div className="py-1">
                      <div className="px-3.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono">
                        Templates & Import
                      </div>
                      {onExportProjectTemplate && (
                        <button
                          type="button"
                          id="home-menu-export-project-template-btn"
                          onClick={() => {
                            setIsActionsMenuOpen(false);
                            onExportProjectTemplate();
                          }}
                          className="w-full text-left flex items-center gap-2.5 px-3.5 py-2 text-xs font-semibold text-slate-200 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                        >
                          <Download className="w-4 h-4 text-blue-400 shrink-0" />
                          <span>Export Project Template (.CSV)</span>
                        </button>
                      )}

                      {onImportProjectsCsv && (
                        <button
                          type="button"
                          id="home-menu-import-projects-btn"
                          onClick={() => {
                            setIsActionsMenuOpen(false);
                            projectFileInputRef.current?.click();
                          }}
                          className="w-full text-left flex items-center gap-2.5 px-3.5 py-2 text-xs font-semibold text-emerald-300 hover:text-emerald-200 hover:bg-slate-800 transition-colors cursor-pointer"
                        >
                          <Upload className="w-4 h-4 text-emerald-400 shrink-0" />
                          <span>Import Projects (.CSV)</span>
                        </button>
                      )}

                      {onExportSubmissionsTemplate && (
                        <button
                          type="button"
                          id="home-menu-export-submissions-template-btn"
                          onClick={() => {
                            setIsActionsMenuOpen(false);
                            onExportSubmissionsTemplate();
                          }}
                          className="w-full text-left flex items-center gap-2.5 px-3.5 py-2 text-xs font-semibold text-slate-200 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                        >
                          <Download className="w-4 h-4 text-amber-400 shrink-0" />
                          <span>Export Submissions Template (.CSV)</span>
                        </button>
                      )}

                      {onImportSubmissionsCsv && (
                        <button
                          type="button"
                          id="home-menu-import-submissions-btn"
                          onClick={() => {
                            setIsActionsMenuOpen(false);
                            submissionsFileInputRef.current?.click();
                          }}
                          className="w-full text-left flex items-center gap-2.5 px-3.5 py-2 text-xs font-semibold text-emerald-300 hover:text-emerald-200 hover:bg-slate-800 transition-colors cursor-pointer"
                        >
                          <Upload className="w-4 h-4 text-emerald-400 shrink-0" />
                          <span>Import Submissions (.CSV)</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}

              {onImportProjectsCsv && (
                <input
                  ref={projectFileInputRef}
                  id="home-import-projects-input"
                  type="file"
                  accept=".csv,text/csv,text/plain"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      onImportProjectsCsv(file);
                      e.target.value = '';
                    }
                  }}
                />
              )}

              {onImportSubmissionsCsv && (
                <input
                  ref={submissionsFileInputRef}
                  id="home-import-submissions-input"
                  type="file"
                  accept=".csv,text/csv,text/plain"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      onImportSubmissionsCsv(file);
                      e.target.value = '';
                    }
                  }}
                />
              )}
            </div>
          </div>
        </div>

        {/* Portfolio Metric Overview Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-4 border-t border-slate-800 px-4 sm:px-6 lg:px-8 pb-3">
          <div className="bg-slate-800/80 border border-slate-700/80 p-3 rounded-xl">
            <span className="block text-[10px] uppercase font-bold text-slate-400 tracking-wider">
              Active Projects
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-xl font-extrabold text-white">{portfolioStats.totalProjects}</span>
              <span className="text-[11px] text-slate-400 font-medium">Workspaces</span>
            </div>
          </div>

          <div className="bg-slate-800/80 border border-slate-700/80 p-3 rounded-xl">
            <span className="block text-[10px] uppercase font-bold text-slate-400 tracking-wider">
              Total Allocated Budget
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-xl font-extrabold text-white">
                {formatCurrency(portfolioStats.totalTargetBudget)}
              </span>
            </div>
          </div>

          <div className="bg-slate-800/80 border border-slate-700/80 p-3 rounded-xl">
            <span className="block text-[10px] uppercase font-bold text-slate-400 tracking-wider">
              Committed / Best Quotes
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-xl font-extrabold text-emerald-400">
                {formatCurrency(portfolioStats.totalCommitted)}
              </span>
              <span className="text-[10px] font-bold text-slate-400">
                ({portfolioStats.totalPOsSent} POs)
              </span>
            </div>
          </div>

          <div className="bg-slate-800/80 border border-slate-700/80 p-3 rounded-xl">
            <span className="block text-[10px] uppercase font-bold text-slate-400 tracking-wider">
              Avg Procurement Progress
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-xl font-extrabold text-blue-400">{portfolioStats.avgProgress}%</span>
              <span className="text-[11px] text-slate-400 font-medium">Overall Complete</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Search and Filters Bar */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs mb-6 flex flex-col md:flex-row items-center justify-between gap-4">
          {/* Search Input */}
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
            <input
              type="text"
              placeholder="Search projects by name, client, site location, or project code..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent font-medium"
            />
          </div>

          {/* Status Filters */}
          <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
            <span className="text-xs font-bold text-slate-500 whitespace-nowrap">Status:</span>
            <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
              {['ALL', 'Tender Active', 'Planning', 'In Progress', 'Completed'].map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setStatusFilter(st)}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer whitespace-nowrap ${statusFilter === st
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                    }`}
                >
                  {st === 'ALL' ? 'All Projects' : st}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Project Cards Grid */}
        {filteredProjects.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-xs">
            <Building2 className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-base font-bold text-slate-800">No construction projects found</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
              No projects matched your search criteria or filter settings. Create your first project using the 5-phase master template.
            </p>
            <div className="mt-5 flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setStatusFilter('ALL');
                }}
                className="px-4 py-2 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl cursor-pointer"
              >
                Reset Search
              </button>
              <button
                type="button"
                onClick={onOpenCreateProjectModal}
                className="px-4 py-2 text-xs font-extrabold bg-blue-600 hover:bg-blue-500 text-white rounded-xl shadow-xs cursor-pointer flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>Add Project from Template</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {filteredProjects.map((project) => {
              const masterProgress = calculateMasterProgress(project.scopes);

              // Calculate Project Budget and Committed
              let projectBudget = 0;
              let projectCommitted = 0;
              let poSentCount = 0;
              let totalTrades = 0;

              project.scopes.forEach((s) => {
                projectBudget += s.budgetAmount || 0;
                totalTrades += s.trades.length;
                const awarded = s.trades.find((t) => t.isAwarded) ||
                  (s.trades.length > 0 ? s.trades.reduce((min, t) => (t.quotedFigure < min.quotedFigure && t.quotedFigure > 0 ? t : min), s.trades[0]) : null);
                if (awarded && awarded.quotedFigure > 0) {
                  projectCommitted += awarded.quotedFigure;
                }
                if (isScopePOApproved(s)) {
                  poSentCount++;
                }
              });

              const targetBudget = project.targetBudget || projectBudget;
              const variance = targetBudget - projectCommitted;

              // Phase progress badges
              const phases = ['1A', '1B', '2A', '2B', '3'] as const;

              return (
                <div
                  key={project.id}
                  id={`project-card-${project.id}`}
                  className="bg-white rounded-2xl border border-slate-200 shadow-xs hover:shadow-md transition-all flex flex-col justify-between overflow-hidden"
                >
                  {/* Project Card Header */}
                  <div className="p-5 border-b border-slate-100">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 text-[10px] font-mono font-bold bg-slate-100 text-slate-700 border border-slate-200 rounded">
                            {project.code || 'PRJ'}
                          </span>
                          <span className={`px-2.5 py-0.5 text-[10px] font-bold border rounded-md uppercase tracking-wider ${getStatusBadge(project.status)}`}>
                            {project.status}
                          </span>
                        </div>
                        <h3 className="text-base font-extrabold text-slate-900 tracking-tight mt-1.5">
                          {project.name}
                        </h3>
                      </div>

                      {/* Controls Menu */}
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          id={`edit-project-btn-${project.id}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            onOpenEditProjectModal(project);
                          }}
                          className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                          title="Edit Project Details"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          id={`duplicate-project-btn-${project.id}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            onDuplicateProject(project);
                          }}
                          className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                          title="Duplicate Project & Scopes"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          id={`delete-project-btn-${project.id}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteProject(project.id);
                          }}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                          title="Delete Project"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Metadata items */}
                    <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-slate-600">
                      {project.client && (
                        <span className="flex items-center gap-1">
                          <User className="w-3.5 h-3.5 text-slate-400" />
                          <span className="font-medium">{project.client}</span>
                        </span>
                      )}
                      {project.location && (
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-slate-400" />
                          <span>{project.location}</span>
                        </span>
                      )}
                    </div>

                    {project.description && (
                      <p className="text-xs text-slate-500 mt-2 line-clamp-2 leading-relaxed">
                        {project.description}
                      </p>
                    )}
                  </div>

                  {/* Financial & Scope Metrics */}
                  <div className="p-5 bg-slate-50/50 flex-1 flex flex-col justify-between">
                    <div className="grid grid-cols-3 gap-3 mb-4">
                      <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                        <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                          Target Budget
                        </span>
                        <span className="text-sm font-bold text-slate-900">
                          {formatCurrency(targetBudget)}
                        </span>
                      </div>

                      <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                        <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                          Committed / Quotes
                        </span>
                        <span className="text-sm font-bold text-blue-700">
                          {formatCurrency(projectCommitted)}
                        </span>
                      </div>

                      <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                        <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                          Budget Variance
                        </span>
                        <span className={`text-sm font-bold ${variance >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {variance >= 0 ? `+${formatCurrency(variance)}` : `-${formatCurrency(Math.abs(variance))}`}
                        </span>
                      </div>
                    </div>

                    {/* Progress Bar & Scopes / PO ratio */}
                    <div className="space-y-1.5 mb-4">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-slate-700">Procurement Progress</span>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-slate-900">{masterProgress}%</span>
                          <span className="text-[11px] text-slate-500 font-medium">
                            ({poSentCount}/{project.scopes.length} POs Approved)
                          </span>
                        </div>
                      </div>
                      <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-600 rounded-full transition-all duration-300"
                          style={{ width: `${masterProgress}%` }}
                        />
                      </div>
                    </div>

                    {/* 5-Phase Mini Pills */}
                    <div className="flex items-center justify-between gap-1.5 pt-2 border-t border-slate-200/80 mb-4">
                      {phases.map((ph) => {
                        const phProg = calculatePhaseProgress(project.scopes, ph);
                        const phScopesCount = project.scopes.filter((s) => s.phaseId === ph).length;
                        return (
                          <div
                            key={ph}
                            className="flex-1 bg-white border border-slate-200 rounded-lg p-1.5 text-center shadow-2xs"
                            title={`Phase ${ph}: ${phProg}% complete (${phScopesCount} scopes)`}
                          >
                            <span className="block text-[10px] font-bold text-slate-600">
                              {ph}
                            </span>
                            <span className="block text-[10px] font-mono font-extrabold text-blue-600">
                              {phProg}%
                            </span>
                          </div>
                        );
                      })}
                    </div>

                    {/* Card Footer: Open Tender Packages & Export PO List Buttons */}
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        id={`open-project-btn-${project.id}`}
                        onClick={() => onSelectProject(project.id)}
                        className="flex-1 py-2.5 px-3 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs group"
                      >
                        <span className="truncate">Open Scopes ({project.scopes.length})</span>
                        <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform text-blue-400 shrink-0" />
                      </button>

                      {onExportApprovedPoPdf && (
                        <button
                          type="button"
                          id={`export-po-pdf-btn-${project.id}`}
                          onClick={() => onExportApprovedPoPdf(project)}
                          className="py-2.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300/80 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs shrink-0 whitespace-nowrap"
                          title="Export Approved PO List as PDF"
                        >
                          <FileText className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <span>📄 Export PO List (PDF)</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
};
