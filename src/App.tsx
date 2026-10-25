import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  Building2,
  Plus,
  Download,
  Upload,
  FileSpreadsheet,
  Layers,
  RotateCcw,
  Users,
  CheckCircle2,
  AlertCircle,
  FileCheck,
  TrendingUp,
  SlidersHorizontal,
  FolderKanban,
  MoreVertical,
  BarChart3,
  Archive,
  Trash2,
  Eye,
  EyeOff,
  Loader2,
  CheckSquare,
  AlertTriangle,
  X
} from 'lucide-react';
import {
  PhaseId,
  ScopeLineItem,
  Contact,
  GoogleSheetsConfig,
  SyncLogEntry,
  TradeEntry,
  NoteItem,
  AttachedDoc,
  Project,
  ProjectTemplateType,
  ScheduledEmailJob,
  FirestoreQuoteRecord,
  QuoteBreakdownItem,
  GoogleUserProfile,
  ActionItemStatus
} from './types';
import { storageService } from './services/storageService';
import { sheetsSyncService } from './services/sheetsSyncService';
import { masterSyncService } from './services/masterSyncService';
import { dbService } from './services/databaseService';
import { collection, onSnapshot, doc, setDoc } from 'firebase/firestore';
import { db } from './lib/firebase';
import { persistQuoteAttachedDocsToFirestore, cleanupAllExpiredBlobDocumentsInFirestore, isDocExpired } from './services/fileUploadService';
import { cleanupDuplicateAndMockScopesInFirestore } from './services/scopeCleanupService';
import { findScopeTemplateByCostCode, getAccurateScopeCostCode, isQuoteMisassigned } from './data/tenderBreakdownTemplates';
import { appsScriptService } from './services/appsScriptService';
import { googleAuthService } from './services/googleAuthService';
import { gmailApiService } from './services/gmailApiService';
import {
  bulkImportExportService,
  ImportType,
  ProjectImportRow,
  ScopePackageImportRow,
  PhaseQuoteImportRow
} from './services/bulkImportExportService';
import { generateScopesFromTemplate } from './data/projectTemplates';
import { matchProjectCandidate } from './data/projectMatcher';
import { CANONICAL_ZENITH_PROJECT_IDS } from './data/realZenithProjects';
import { isExampleOrMockTerm } from './utils/projectValidation';
import { Header } from './components/Header';
import { ProjectDashboard } from './components/ProjectDashboard';
import { ProjectModal } from './components/ProjectModal';
import { PhaseNavigation } from './components/PhaseNavigation';
import { FilterBar } from './components/FilterBar';
import { ScopeItemCard } from './components/ScopeItemCard';
import { ContactDirectoryModal, getContactCategories } from './components/ContactDirectoryModal';
import { ScopeModal } from './components/ScopeModal';
import { TradeModal } from './components/TradeModal';
import { SheetsSyncModal } from './components/SheetsSyncModal';
import { NotesDrawer } from './components/NotesDrawer';
import { DocViewerModal } from './components/DocViewerModal';
import { QuoteBreakdownModal } from './components/QuoteBreakdownModal';
import { TenderInviteModal } from './components/TenderInviteModal';
import { TenderReminderModal } from './components/TenderReminderModal';
import { TenderRevisedEstimateModal } from './components/TenderRevisedEstimateModal';
import { ConfirmModal } from './components/ConfirmModal';
import { ImportValidationDrawer } from './components/ImportValidationDrawer';
import { AutoBudgetMappingDrawer } from './components/AutoBudgetMappingDrawer';
import { BudgetUploadModal } from './components/BudgetUploadModal';
import { ImportedBudgetReviewDrawer } from './components/ImportedBudgetReviewDrawer';
import { ScheduledEmailQueueDrawer } from './components/ScheduledEmailQueueDrawer';
import { ApprovedPoExportModal } from './components/ApprovedPoExportModal';
import { LoginGate } from './components/LoginGate';
import { useIdleTimeout } from './hooks/useIdleTimeout';
import { SessionTimeoutModal } from './components/SessionTimeoutModal';
import {
  BudgetMappingResult,
  generateBudgetTemplateCsv,
  downloadCsv as downloadBudgetCsv,
  parseMasterBudgetCsv,
  calculateBudgetMapping,
  applyBudgetMappingToProject
} from './services/budgetAllocationService';
import {
  BudgetExtractionResult,
  parseBudgetFile,
  applyExtractedBudgetsToProject
} from './services/budgetExtractionService';
import { PHASES } from './data/initialTenderPackages';
import { calculatePhaseBudget, calculatePhaseProgress, formatCurrency } from './utils/formatters';
import {
  saveScheduledJob,
  cancelScheduledJob,
  processPendingQueue,
  getStoredScheduledJobs,
  deleteScheduledJob,
  syncScheduledDispatchesToBackend
} from './services/scheduleQueueService';

export default function App() {
  const [currentUser, setCurrentUser] = useState<GoogleUserProfile | null>(() => googleAuthService.getCurrentUser());
  const [isAuthChecking, setIsAuthChecking] = useState<boolean>(() => !googleAuthService.getCurrentUser());
  const [accessDeniedEmail, setAccessDeniedEmail] = useState<string | null>(null);

  const [projects, setProjects] = useState<Project[]>(() => storageService.getProjects());
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [contacts, setContacts] = useState<Contact[]>(() => storageService.getContacts());
  const [sheetsConfig, setSheetsConfig] = useState<GoogleSheetsConfig>(() => storageService.getSheetsConfig());
  const [syncLogs, setSyncLogs] = useState<SyncLogEntry[]>(() => storageService.getSyncLogs());

  const [quotes, setQuotes] = useState<FirestoreQuoteRecord[]>([]);

  const [activePhase, setActivePhase] = useState<PhaseId>('1A');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [poSentFilter, setPoSentFilter] = useState<'all' | 'sent' | 'pending'>('all');
  const [collapsedScopeIds, setCollapsedScopeIds] = useState<Set<string>>(new Set());

  const [isSyncing, setIsSyncing] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const [selectedQuoteIds, setSelectedQuoteIds] = useState<string[]>([]);
  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);

  useEffect(() => {
    storageService.saveActiveProjectId(null);
  }, []);

  useEffect(() => {
    setSelectedQuoteIds([]);
  }, [activeProjectId]);

  const handleSignOut = useCallback(async () => {
    await googleAuthService.signOut();
    setCurrentUser(null);
    setActiveProjectId(null);
    storageService.saveActiveProjectId(null);
    setToastMessage('Signed out of Zenith Portal.');
  }, []);

  const {
    isWarningOpen: isSessionWarningOpen,
    secondsRemaining: sessionSecondsRemaining,
    extendSession: handleExtendSession
  } = useIdleTimeout({
    enabled: Boolean(currentUser),
    onLogout: handleSignOut
  });

  useEffect(() => {
    const unsubscribe = googleAuthService.initAuth(
      (user) => {
        setCurrentUser(user);
        setIsAuthChecking(false);
        setAccessDeniedEmail(null);
      },
      (rejectedEmail) => {
        setCurrentUser(null);
        setIsAuthChecking(false);
        if (rejectedEmail) {
          setAccessDeniedEmail(rejectedEmail);
        }
      }
    );

    const handleAuthEvent = () => {
      const user = googleAuthService.getCurrentUser();
      setCurrentUser(user);
    };

    const handleAccessDeniedEvent = (e: Event) => {
      const customEvent = e as CustomEvent<{ attemptedEmail?: string }>;
      setCurrentUser(null);
      setAccessDeniedEmail(customEvent.detail?.attemptedEmail || null);
    };

    window.addEventListener('zenith_auth_state_changed', handleAuthEvent);
    window.addEventListener('zenith_auth_access_denied', handleAccessDeniedEvent);

    return () => {
      if (unsubscribe) unsubscribe();
      window.removeEventListener('zenith_auth_state_changed', handleAuthEvent);
      window.removeEventListener('zenith_auth_access_denied', handleAccessDeniedEvent);
    };
  }, []);

  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [projectToEdit, setProjectToEdit] = useState<Project | null>(null);
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);
  const [scopeToDelete, setScopeToDelete] = useState<ScopeLineItem | null>(null);
  const [contactToDelete, setContactToDelete] = useState<Contact | null>(null);
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);
  const [isPurgeDemoConfirmOpen, setIsPurgeDemoConfirmOpen] = useState(false);
  const [isPurgingDemo, setIsPurgingDemo] = useState(false);
  const [isContactDirectoryOpen, setIsContactDirectoryOpen] = useState(false);
  const [isSheetsSyncOpen, setIsSheetsSyncOpen] = useState(false);
  const [isScopeModalOpen, setIsScopeModalOpen] = useState(false);
  const [scopeToEdit, setScopeToEdit] = useState<ScopeLineItem | null>(null);
  const [isTradeModalOpen, setIsTradeModalOpen] = useState(false);
  const [activeScopeForTrade, setActiveScopeForTrade] = useState<ScopeLineItem | null>(null);
  const [activeTradeForNotes, setActiveTradeForNotes] = useState<TradeEntry | null>(null);
  const [activeTradeForDocs, setActiveTradeForDocs] = useState<TradeEntry | null>(null);
  const [activeTradeForBreakdown, setActiveTradeForBreakdown] = useState<TradeEntry | null>(null);
  const [activeScopeForBreakdown, setActiveScopeForBreakdown] = useState<ScopeLineItem | null>(null);
  const [activeScopeForInvite, setActiveScopeForInvite] = useState<ScopeLineItem | null>(null);
  const [activeScopeForReminder, setActiveScopeForReminder] = useState<ScopeLineItem | null>(null);
  const [activeScopeForRevisedEstimate, setActiveScopeForRevisedEstimate] = useState<ScopeLineItem | null>(null);

  const [isExportPoModalOpen, setIsExportPoModalOpen] = useState(false);
  const [exportPoTargetProject, setExportPoTargetProject] = useState<Project | null>(null);

  const [isScheduledQueueOpen, setIsScheduledQueueOpen] = useState(false);
  const [scheduledJobsList, setScheduledJobsList] = useState<ScheduledEmailJob[]>(() => getStoredScheduledJobs());

  const refreshScheduledJobs = useCallback(() => {
    setScheduledJobsList(getStoredScheduledJobs());
  }, []);

  const pendingScheduledCount = useMemo(() => {
    return scheduledJobsList.filter((j) => j.status === 'pending').length;
  }, [scheduledJobsList]);

  const activeProject = useMemo(() => {
    if (!activeProjectId) return null;
    return projects.find((p) => p.id === activeProjectId) || null;
  }, [projects, activeProjectId]);

  const handleOpenExportPoModal = useCallback((targetProj?: Project | null) => {
    const proj = targetProj || activeProject;
    if (proj) {
      setExportPoTargetProject(proj);
      setIsExportPoModalOpen(true);
    }
  }, [activeProject]);

  const currentProjectScopes = useMemo(() => {
    return activeProject ? activeProject.scopes : [];
  }, [activeProject]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  useEffect(() => {
    const handleCustomToast = (e: any) => {
      if (e?.detail) {
        showToast(e.detail);
      }
    };
    window.addEventListener('app-toast', handleCustomToast);
    return () => window.removeEventListener('app-toast', handleCustomToast);
  }, []);

  const handleSelectProject = (projectId: string) => {
    setActiveProjectId(projectId);
    storageService.saveActiveProjectId(projectId);
    setSearchQuery('');
    setStatusFilter('ALL');
    setPoSentFilter('all');
    setCollapsedScopeIds(new Set());
    setActivePhase('1A');
  };

  const handleNavigateHome = () => {
    setActiveProjectId(null);
    storageService.saveActiveProjectId(null);
    setSearchQuery('');
    setStatusFilter('ALL');
  };

  const persistProjectsAndSync = useCallback((updatedProjects: Project[], message?: string) => {
    setProjects(updatedProjects);
    storageService.saveProjects(updatedProjects);
    dbService.saveProjects(updatedProjects);
    sheetsSyncService.saveBackToMasterSheet(updatedProjects, sheetsConfig);
    if (message) {
      showToast(message);
    }
  }, [sheetsConfig]);

  const [isImportDrawerOpen, setIsImportDrawerOpen] = useState(false);
  const [importType, setImportType] = useState<ImportType>('projects');
  const [importRawRows, setImportRawRows] = useState<(ProjectImportRow | ScopePackageImportRow | PhaseQuoteImportRow)[]>([]);
  const [importTargetPhase, setImportTargetPhase] = useState<PhaseId>('1A');

  const handleExportProjectsTemplate = () => {
    const csv = bulkImportExportService.generateProjectsTemplate(true);
    bulkImportExportService.downloadCsv(`Zenith_Projects_Template_${new Date().toISOString().split('T')[0]}.csv`, csv);
    showToast('Project Setup CSV Template (.CSV) downloaded.');
  };

  const handleImportProjectsFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = (evt.target?.result as string) || '';
      if (text) {
        const parsed = bulkImportExportService.parseProjectsCsv(text);
        if (parsed.length === 0) {
          showToast('No valid project rows detected in the uploaded CSV.');
          return;
        }
        setImportType('projects');
        setImportRawRows(parsed);
        setIsImportDrawerOpen(true);
      }
    };
    reader.readAsText(file, 'utf-8');
  };

  const handleFinalizeProjectsImport = (validRows: ProjectImportRow[]) => {
    const updated = bulkImportExportService.applyBulkProjects(validRows, projects);
    persistProjectsAndSync(
      updated,
      `Successfully created ${validRows.length} project workspace(s) with 5-phase baseline budgets.`
    );
  };

  const handleExportScopePackagesTemplate = () => {
    if (!activeProject) return;
    const csv = bulkImportExportService.generateScopePackagesTemplate(activeProject);
    bulkImportExportService.downloadCsv(
      `Zenith_Scope_Packages_${activeProject.code || 'PRJ'}_Template.csv`,
      csv
    );
    showToast('Scope Packages & Tender Line Item Template downloaded.');
  };

  const handleImportScopesFile = (file: File) => {
    if (!activeProject) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = (evt.target?.result as string) || '';
      if (text) {
        const parsed = bulkImportExportService.parseScopePackagesCsv(text, activeProject.name);
        if (parsed.length === 0) {
          showToast('No valid scope package rows detected in the uploaded CSV.');
          return;
        }
        setImportType('scopes');
        setImportRawRows(parsed);
        setIsImportDrawerOpen(true);
      }
    };
    reader.readAsText(file, 'utf-8');
  };

  const handleFinalizeScopesImport = (validRows: ScopePackageImportRow[]) => {
    if (!activeProject) return;
    const updated = bulkImportExportService.applyBulkScopes(validRows, activeProject, projects);
    persistProjectsAndSync(
      updated,
      `Successfully generated ${validRows.length} scope card(s) and tender schedules across 5 phases.`
    );
  };

  const handleExportPhaseQuoteTemplate = () => {
    if (!activeProject) return;
    const csv = bulkImportExportService.generatePhaseQuoteTemplate(activeProject, activePhase);
    bulkImportExportService.downloadCsv(
      `Zenith_Phase_${activePhase}_Quote_Template_${activeProject.code || 'PRJ'}.csv`,
      csv
    );
    showToast(`Phase ${activePhase} Granular Quote Template downloaded (pre-filled with all itemized tender line items).`);
  };

  const handleImportQuotesFile = (file: File) => {
    if (!activeProject) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = (evt.target?.result as string) || '';
      if (text) {
        const parsed = bulkImportExportService.parsePhaseQuotesCsv(text, activeProject.name, activePhase);
        if (parsed.length === 0) {
          showToast('No contractor quote rows detected in the uploaded CSV.');
          return;
        }
        setImportType('quotes');
        setImportTargetPhase(activePhase);
        setImportRawRows(parsed);
        setIsImportDrawerOpen(true);
      }
    };
    reader.readAsText(file, 'utf-8');
  };

  const handleFinalizeQuotesImport = (validRows: PhaseQuoteImportRow[]) => {
    if (!activeProject) return;
    const result = bulkImportExportService.applyBulkQuotes(validRows, activeProject, projects, contacts);
    if (result.newContacts.length > contacts.length) {
      setContacts(result.newContacts);
      storageService.saveContacts(result.newContacts);
      dbService.saveContacts(result.newContacts);
    }
    persistProjectsAndSync(
      result.updatedProjects,
      `Successfully imported ${result.addedCount} trade quote(s) into Phase ${activePhase}. Live scope totals updated.`
    );
  };

  const [isBudgetUploadModalOpen, setIsBudgetUploadModalOpen] = useState(false);
  const [budgetExtractionResult, setBudgetExtractionResult] = useState<BudgetExtractionResult | null>(null);
  const [isBudgetReviewDrawerOpen, setIsBudgetReviewDrawerOpen] = useState(false);
  const [isBudgetMappingDrawerOpen, setIsBudgetMappingDrawerOpen] = useState(false);
  const [budgetMappingResult, setBudgetMappingResult] = useState<BudgetMappingResult | null>(null);
  const [isApplyingBudgets, setIsApplyingBudgets] = useState(false);

  const handleExportBudgetTemplate = () => {
    if (!activeProject) return;
    const csv = generateBudgetTemplateCsv(activeProject);
    downloadBudgetCsv(
      `Zenith_Master_Budget_Template_${activeProject.code || 'PRJ'}.csv`,
      csv
    );
    showToast('Master Budget CSV Template downloaded (Columns: Cost Code, Description, Allocated Budget).');
  };

  const handleImportBudgetCsvFile = async (file: File) => {
    if (!activeProject) return;
    try {
      const result = await parseBudgetFile(file, activeProject);
      setBudgetExtractionResult(result);
      setIsBudgetReviewDrawerOpen(true);
    } catch (err: any) {
      showToast(err.message || 'Failed to parse budget file.');
    }
  };

  const handleConfirmBudgetReview = async (finalExtraction: BudgetExtractionResult) => {
    if (!activeProject) return;
    setIsApplyingBudgets(true);
    try {
      const updated = applyExtractedBudgetsToProject(activeProject, finalExtraction, projects);
      storageService.saveProjects(updated);
      dbService.saveProjects(updated);
      setProjects(updated);
      await sheetsSyncService.saveBackToMasterSheet(updated, sheetsConfig);
      showToast(
        `Master Budget allocated: updated Target Budgets across ${finalExtraction.scopeAggregations.length} scope package(s) and re-hydrated Master Spreadsheet.`
      );
      setIsBudgetReviewDrawerOpen(false);
      setBudgetExtractionResult(null);
    } catch (err: any) {
      showToast(`Error applying budgets: ${err.message || 'Unknown error'}`);
    } finally {
      setIsApplyingBudgets(false);
    }
  };

  const handleConfirmBudgetMapping = () => {
    if (!activeProject || !budgetMappingResult) return;
    setIsApplyingBudgets(true);
    try {
      const updated = applyBudgetMappingToProject(activeProject, budgetMappingResult, projects);
      persistProjectsAndSync(
        updated,
        `Master Budget allocated: updated Target Budgets across ${budgetMappingResult.matchedScopes.length} scope package(s).`
      );
      setIsBudgetMappingDrawerOpen(false);
      setBudgetMappingResult(null);
    } finally {
      setIsApplyingBudgets(false);
    }
  };

  const [isPhaseActionsMenuOpen, setIsPhaseActionsMenuOpen] = useState(false);
  const phaseActionsMenuRef = useRef<HTMLDivElement>(null);
  const phaseFileInputRef = useRef<HTMLInputElement>(null);

  const [phaseToDelete, setPhaseToDelete] = useState<{
    id: PhaseId;
    name: string;
    code: string;
    scopeCount: number;
    budget: number;
  } | null>(null);

  const [isArchivedCardsCollapsed, setIsArchivedCardsCollapsed] = useState(true);

  const isCurrentPhaseArchived = useMemo(() => {
    return (activeProject?.archivedPhaseIds || []).includes(activePhase);
  }, [activeProject?.archivedPhaseIds, activePhase]);

  const handleRequestDeletePhase = (phaseId: PhaseId) => {
    const phaseInfo = PHASES.find((p) => p.id === phaseId);
    const phaseScopes = currentProjectScopes.filter((s) => s.phaseId === phaseId);
    const phaseBudget = phaseScopes.reduce((sum, s) => sum + (s.budgetAmount || 0), 0);
    setPhaseToDelete({
      id: phaseId,
      name: phaseInfo?.name || `Phase ${phaseId}`,
      code: phaseInfo?.code || `PKG-${phaseId}`,
      scopeCount: phaseScopes.length,
      budget: phaseBudget
    });
  };

  const handleConfirmDeletePhase = async () => {
    if (!activeProject || !phaseToDelete) return;
    const phaseId = phaseToDelete.id;
    const phaseName = phaseToDelete.name;
    const currentDeleted = activeProject.deletedPhaseIds || [];
    const updatedDeleted = Array.from(new Set([...currentDeleted, phaseId]));

    const updatedScopes = (activeProject.scopes || []).filter((s) => s.phaseId !== phaseId);
    const updatedProject: Project = {
      ...activeProject,
      deletedPhaseIds: updatedDeleted,
      scopes: updatedScopes,
      updatedAt: new Date().toISOString()
    };
    const updatedProjects = projects.map((p) => (p.id === activeProject.id ? updatedProject : p));

    setProjects(updatedProjects);
    storageService.saveProjects(updatedProjects);
    dbService.saveProjects(updatedProjects);

    await sheetsSyncService.saveBackToMasterSheet(updatedProjects, sheetsConfig);

    const remainingPhases = PHASES.filter((p) => !updatedDeleted.includes(p.id));
    if (remainingPhases.length > 0) {
      if (activePhase === phaseId) {
        setActivePhase(remainingPhases[0].id);
      }
    }

    showToast(`Phase ${phaseName} deleted and removed from Google Sheet backend.`);
    setPhaseToDelete(null);
  };

  const handleToggleArchivePhase = (phaseId: PhaseId) => {
    if (!activeProject) return;
    const currentArchived = activeProject.archivedPhaseIds || [];
    const isCurrentlyArchived = currentArchived.includes(phaseId);
    const phaseInfo = PHASES.find((p) => p.id === phaseId);
    const phaseName = phaseInfo?.name || `Phase ${phaseId}`;
    const updatedArchived = isCurrentlyArchived
      ? currentArchived.filter((id) => id !== phaseId)
      : [...currentArchived, phaseId];

    const updatedProject: Project = {
      ...activeProject,
      archivedPhaseIds: updatedArchived,
      updatedAt: new Date().toISOString()
    };
    const updatedProjects = projects.map((p) => (p.id === activeProject.id ? updatedProject : p));

    setProjects(updatedProjects);
    storageService.saveProjects(updatedProjects);
    dbService.saveProjects(updatedProjects);

    sheetsSyncService.saveBackToMasterSheet(updatedProjects, sheetsConfig);

    if (!isCurrentlyArchived) {
      setIsArchivedCardsCollapsed(true);
      showToast(`Phase ${phaseName} archived and marked as completed. Tender dispatcher cards collapsed.`);
    } else {
      showToast(`Phase ${phaseName} marked as active (unarchived).`);
    }
  };

  useEffect(() => {
    const deleted = activeProject?.deletedPhaseIds || [];
    if (deleted.includes(activePhase)) {
      const remaining = PHASES.filter((p) => !deleted.includes(p.id));
      if (remaining.length > 0) {
        setActivePhase(remaining[0].id);
      }
    }
  }, [activeProject?.deletedPhaseIds, activePhase]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (phaseActionsMenuRef.current && !phaseActionsMenuRef.current.contains(event.target as Node)) {
        setIsPhaseActionsMenuOpen(false);
      }
    };
    if (isPhaseActionsMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isPhaseActionsMenuOpen]);

  useEffect(() => {
    cleanupAllExpiredBlobDocumentsInFirestore()
      .then(({ totalPurgedRefs, projectsUpdated, quotesUpdated }) => {
        if (totalPurgedRefs > 0) {
          console.log(`[App] Automated cleanup routine purged ${totalPurgedRefs} expired blob reference(s).`);
        }
      })
      .catch((err) => console.warn('[App] Automated cleanup routine notice:', err));

    cleanupDuplicateAndMockScopesInFirestore()
      .then(({ duplicateScopesRemoved, sampleQuotesDeleted }) => {
        if (duplicateScopesRemoved > 0 || sampleQuotesDeleted > 0) {
          console.log(`[App] Cleaned ${duplicateScopesRemoved} duplicate scope(s) and ${sampleQuotesDeleted} sample quote(s).`);
        }
      })
      .catch((err) => console.warn('[App] Scope cleanup notice:', err));
  }, []);

  useEffect(() => {
    if (!currentUser) return;
    const unsubscribe = dbService.subscribeToProjects((remoteProjects) => {
      if (remoteProjects && remoteProjects.length > 0) {
        const sanitizedProjects = remoteProjects.map((p) => ({
          ...p,
          scopes: (p.scopes || []).map((s) => ({
            ...s,
            trades: (s.trades || []).map((t) => ({
              ...t,
              attachedDocs: (t.attachedDocs || []).filter((d) => !isDocExpired(d)),
              docUrl: isDocExpired({ url: t.docUrl }) ? '' : t.docUrl,
              attachedDoc: isDocExpired({ url: t.attachedDoc }) ? '' : t.attachedDoc
            }))
          }))
        }));
        setProjects(sanitizedProjects);
        storageService.saveProjects(sanitizedProjects);
        setActiveProjectId((currentId) => {
          if (!currentId) return null;
          if (!remoteProjects.some((p) => p.id === currentId)) {
            storageService.saveActiveProjectId(null);
            return null;
          }
          return currentId;
        });
      }
    });
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [currentUser]);

  useEffect(() => {
    if (!currentUser) return;
    const unsubscribe = dbService.subscribeToContacts((remoteContacts) => {
      setContacts(remoteContacts);
      storageService.saveContacts(remoteContacts);
    });
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [currentUser]);

  // Core Quote Synchronization Engine
  const applyQuotesListToProjects = useCallback((
    incomingQuotes: FirestoreQuoteRecord[],
    currentProjects: Project[]
  ): { updatedProjects: Project[]; hasChanges: boolean; lastQuote: FirestoreQuoteRecord | null } => {
    if (incomingQuotes.length === 0) {
      return { updatedProjects: currentProjects, hasChanges: false, lastQuote: null };
    }

    let hasOverallChanges = false;
    let lastIngestedQuote: FirestoreQuoteRecord | null = null;

    const updatedProjects = currentProjects.map((project) => {
      const matchingQuotes = incomingQuotes.filter((q) => {
        if (q.projectId && q.projectId === project.id) return true;
        if (q.projectName && project.name) {
          const matched = matchProjectCandidate(q.projectName);
          return (
            matched.projectId === project.id ||
            matched.projectName.toLowerCase().trim() === project.name.toLowerCase().trim()
          );
        }
        return false;
      });

      if (matchingQuotes.length === 0) return project;

      let projectScopesChanged = false;
      const updatedScopes = [...(project.scopes || [])];

      matchingQuotes.forEach((quote) => {
        const tenderItemClean = (quote.trade || quote.tradeName || quote.tradeScope || quote.tenderItem || '').trim();
        const costCode = quote.costCode;
        const enteredAmount = Number(
          quote.quotedFigure !== undefined
            ? quote.quotedFigure
            : (quote.enteredAmount !== undefined
              ? quote.enteredAmount
              : quote.amount || 0)
        ) || 0;
        const companyName = (quote.companyName || quote.contractorName || 'Subtrade Contractor').trim();
        const compLower = companyName.toLowerCase();

        const templateInfo = findScopeTemplateByCostCode(costCode);
        const expectedScopeName = templateInfo ? templateInfo.scopeName : (quote.trade || quote.tenderItem || '');

        let scopeIdx = updatedScopes.findIndex((s) => {
          const sCode = String(s.costCode || getAccurateScopeCostCode(s.name) || '').trim();
          if (costCode && costCode !== '20000' && costCode !== 'unassigned') {
            return sCode === costCode;
          }
          return s.name.toLowerCase().trim() === expectedScopeName.toLowerCase().trim();
        });

        if (scopeIdx === -1) {
          const targetPhase: PhaseId = (templateInfo as any)?.phaseId || '1A';
          const newScope: ScopeLineItem = {
            id: `scp-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            projectId: project.id,
            name: expectedScopeName || 'General Scope',
            costCode: costCode || '20000',
            phaseId: targetPhase,
            budgetAmount: enteredAmount,
            description: `Tender package for ${expectedScopeName}`,
            trades: [],
            order: updatedScopes.length + 1,
            createdAt: new Date().toISOString()
          };
          updatedScopes.push(newScope);
          scopeIdx = updatedScopes.length - 1;
          projectScopesChanged = true;
          hasOverallChanges = true;
        }

        const targetScope = updatedScopes[scopeIdx];
        const currentTrades = [...(targetScope.trades || [])];
        const tradeIdx = currentTrades.findIndex(
          (t) => (t.companyName || '').trim().toLowerCase() === compLower
        );

        const newBreakdownItem: QuoteBreakdownItem = {
          id: `brk-${quote.id || Date.now()}`,
          costCode,
          itemDescription: tenderItemClean || expectedScopeName,
          amount: enteredAmount,
          inclusionStatus: 'included',
          notes: quote.notes || '',
          tenderSpecRef: `Cost Code ${costCode}`
        };

        if (tradeIdx >= 0) {
          const curTrade = currentTrades[tradeIdx];
          const existingBreakdowns = curTrade.quoteBreakdown || [];
          const quoteStatus = (quote.actionItemStatus || quote.actionStatus || curTrade.actionStatus || 'Estimate Submitted') as ActionItemStatus;
          const isDifferent =
            curTrade.quotedFigure !== enteredAmount ||
            curTrade.actionStatus !== quoteStatus ||
            !existingBreakdowns.some((b) => b.costCode === costCode);

          if (isDifferent) {
            projectScopesChanged = true;
            hasOverallChanges = true;
            lastIngestedQuote = quote;

            const filteredBreakdowns = existingBreakdowns.filter(
              (b) => b.costCode !== costCode && b.itemDescription.toLowerCase() !== (tenderItemClean || expectedScopeName).toLowerCase()
            );
            filteredBreakdowns.push(newBreakdownItem);

            const docs = [...(curTrade.attachedDocs || [])];
            if (Array.isArray(quote.attachedDocs) && quote.attachedDocs.length > 0) {
              quote.attachedDocs.forEach((qd) => {
                if (qd && qd.url && !docs.some((d) => d.url === qd.url)) {
                  docs.push({
                    id: qd.id || `doc-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
                    name: qd.name || `${companyName} Quote Document`,
                    url: qd.url,
                    type: qd.type || 'quote',
                    addedAt: qd.addedAt || (quote.submittedAt || new Date().toISOString()).split('T')[0],
                    uploadedAt: qd.uploadedAt || quote.submittedAt || new Date().toISOString()
                  });
                }
              });
            }

            if (quote.docUrl && !docs.some((d) => d.url === quote.docUrl)) {
              docs.push({
                id: `doc-${Date.now()}`,
                name: `${companyName} Quote Form Submission`,
                url: quote.docUrl,
                type: 'quote',
                addedAt: (quote.submittedAt || new Date().toISOString()).split('T')[0],
                uploadedAt: quote.submittedAt || new Date().toISOString()
              });
            }

            const tradeNotes = [...(curTrade.notes || [])];
            if (quote.notes && !tradeNotes.some((n) => n.text === quote.notes)) {
              tradeNotes.push({
                id: `note-${Date.now()}`,
                author: companyName,
                timestamp: quote.submittedAt || new Date().toISOString(),
                text: quote.notes
              });
            }

            currentTrades[tradeIdx] = {
              ...curTrade,
              actionStatus: quoteStatus,
              quoteDocId: quote.id || curTrade.quoteDocId,
              quotedFigure: enteredAmount,
              contactEmail: quote.emailAddress || quote.email || curTrade.contactEmail,
              quoteBreakdown: (Array.isArray(quote.quoteBreakdown) && quote.quoteBreakdown.length > 0)
                ? quote.quoteBreakdown
                : filteredBreakdowns,
              attachedDocs: docs,
              notes: tradeNotes,
              lastModifiedBy: quote.lastModifiedBy || quote.emailAddress || quote.email || companyName,
              updatedAt: quote.updatedAt || quote.submittedAt || new Date().toISOString()
            };

            updatedScopes[scopeIdx] = {
              ...targetScope,
              trades: currentTrades
            };
          }
        } else {
          projectScopesChanged = true;
          hasOverallChanges = true;
          lastIngestedQuote = quote;

          const newTrade: TradeEntry = {
            id: quote.id || `tr-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
            quoteDocId: quote.id,
            scopeId: targetScope.id,
            companyName,
            contractorName: quote.contractorName || companyName,
            contactEmail: quote.emailAddress || quote.email || '',
            category: targetScope.name,
            currency: 'CAD',
            quotedFigure: enteredAmount,
            actionStatus: (quote.actionItemStatus || quote.actionStatus || 'Estimate Submitted') as ActionItemStatus,
            poSent: false,
            isAwarded: false,
            notes: quote.notes ? [{
              id: `note-${Date.now()}`,
              author: companyName,
              timestamp: quote.submittedAt || new Date().toISOString(),
              text: quote.notes
            }] : [],
            attachedDocs: (Array.isArray(quote.attachedDocs) && quote.attachedDocs.length > 0)
              ? quote.attachedDocs
              : (quote.docUrl ? [{
                id: `doc-${Date.now()}`,
                name: `${companyName} Quote Form Submission`,
                url: quote.docUrl,
                type: 'quote',
                addedAt: (quote.submittedAt || new Date().toISOString()).split('T')[0],
                uploadedAt: quote.submittedAt || new Date().toISOString()
              }] : []),
            quoteBreakdown: (Array.isArray(quote.quoteBreakdown) && quote.quoteBreakdown.length > 0)
              ? quote.quoteBreakdown
              : [newBreakdownItem],
            lastModifiedBy: quote.lastModifiedBy || quote.emailAddress || quote.email || companyName,
            updatedAt: quote.updatedAt || quote.submittedAt || new Date().toISOString()
          };

          currentTrades.push(newTrade);
          updatedScopes[scopeIdx] = {
            ...targetScope,
            trades: currentTrades
          };
        }
      });

      if (projectScopesChanged) {
        return {
          ...project,
          scopes: updatedScopes,
          updatedAt: new Date().toISOString()
        };
      }
      return project;
    });

    return { updatedProjects, hasChanges: hasOverallChanges, lastQuote: lastIngestedQuote };
  }, []);

  useEffect(() => {
    if (!db) return;
    const quotesCol = collection(db, 'quotes');
    const unsubscribe = onSnapshot(quotesCol, (snapshot) => {
      const incomingQuotes: FirestoreQuoteRecord[] = [];
      const removedQuoteIds = new Set<string>();
      const removedQuoteCompanies = new Set<string>();

      snapshot.docChanges().forEach((change) => {
        if (change.type === 'removed') {
          removedQuoteIds.add(change.doc.id);
          const data = change.doc.data() as any;
          if (data?.companyName) {
            removedQuoteCompanies.add(String(data.companyName).trim().toLowerCase());
          }
          if (data?.contractorName) {
            removedQuoteCompanies.add(String(data.contractorName).trim().toLowerCase());
          }
        }
      });

      snapshot.docs.forEach((docSnap) => {
        const data = docSnap.data() as any;
        if (data) {
          const docId = data.id || docSnap.id;
          const quotedFig = Number(
            data.quotedFigure !== undefined
              ? data.quotedFigure
              : (data.enteredAmount !== undefined
                ? data.enteredAmount
                : data.amount || 0)
          ) || 0;
          const rec: FirestoreQuoteRecord = {
            ...data,
            id: docId,
            companyName: (data.companyName || data.contractorName || 'Subtrade Contractor').trim(),
            contractorName: (data.contractorName || data.companyName || 'Subtrade Contractor').trim(),
            emailAddress: data.emailAddress || data.email || '',
            email: data.emailAddress || data.email || '',
            projectName: data.projectName || '',
            projectId: data.projectId,
            trade: data.trade || data.tradeScope || data.tradeName || data.tenderItem || 'General Scope',
            tradeName: data.tradeName || data.trade || data.tradeScope || data.tenderItem || 'General Scope',
            tradeScope: data.tradeScope || data.trade || 'General Scope',
            tenderItem: data.tenderItem || data.trade || 'General Scope',
            costCode: String(data.costCode || '20000'),
            quotedFigure: quotedFig,
            enteredAmount: quotedFig,
            amount: quotedFig,
            notes: data.notes || '',
            submittedAt: data.submittedAt || new Date().toISOString(),
            docUrl: data.docUrl || data.attachmentUrl || '',
            actionItemStatus: data.actionItemStatus || data.actionStatus || 'Estimate Submitted',
            actionStatus: data.actionStatus || data.actionItemStatus || 'Estimate Submitted',
            quoteBreakdown: Array.isArray(data.quoteBreakdown) ? data.quoteBreakdown : undefined,
            lastModifiedBy: data.lastModifiedBy,
            updatedAt: data.updatedAt
          };
          incomingQuotes.push(rec);
        }
      });

      setQuotes(incomingQuotes);

      setProjects((prevProjects) => {
        let currentWorkingProjects = prevProjects;
        let didRemove = false;

        if (removedQuoteIds.size > 0) {
          currentWorkingProjects = currentWorkingProjects.map((p) => {
            let scopesChanged = false;
            const updatedScopes = p.scopes.map((s) => {
              const prevLen = s.trades.length;
              const filteredTrades = s.trades.filter((t) => {
                const isRemoved =
                  removedQuoteIds.has(t.id) ||
                  (t.quoteDocId && removedQuoteIds.has(t.quoteDocId)) ||
                  (removedQuoteCompanies.has((t.companyName || '').trim().toLowerCase()) &&
                    (removedQuoteIds.has(t.quoteDocId || '') || removedQuoteIds.has(t.id)));
                return !isRemoved;
              });
              if (filteredTrades.length !== prevLen) {
                scopesChanged = true;
              }
              return scopesChanged ? { ...s, trades: filteredTrades } : s;
            });
            if (scopesChanged) {
              didRemove = true;
              return { ...p, scopes: updatedScopes, updatedAt: new Date().toISOString() };
            }
            return p;
          });
        }

        const { updatedProjects, hasChanges, lastQuote } = applyQuotesListToProjects(incomingQuotes, currentWorkingProjects);
        if (hasChanges || didRemove) {
          storageService.saveProjects(updatedProjects);
          if (lastQuote) {
            const q = lastQuote as FirestoreQuoteRecord;
            showToast(`Live Quote Updated: ${q.companyName} ($${Number(q.enteredAmount || q.quotedFigure).toLocaleString()}) for ${q.tenderItem || q.trade}`);
          }
          return updatedProjects;
        }
        return currentWorkingProjects;
      });
    }, (err) => {
      console.warn('[Firestore] Live quotes onSnapshot subscription notice:', err);
    });

    return () => {
      unsubscribe();
    };
  }, [applyQuotesListToProjects]);

  const handleLiveSheetsResync = useCallback(async () => {
    setIsSyncing(true);
    showToast('Fetching latest quotes from Google Sheets...');

    try {
      let webhookQuotes: FirestoreQuoteRecord[] = [];
      try {
        const res = await fetch('/api/webhooks/resync', { method: 'POST' });
        if (res.ok) {
          const resData = await res.json();
          if (Array.isArray(resData.quotes)) {
            webhookQuotes = resData.quotes;
          }
        }
      } catch (apiErr) {
        console.warn('Notice from /api/webhooks/resync:', apiErr);
      }

      const firestoreQuotes = await dbService.fetchQuotes();

      let baseProjects = projects;
      try {
        const sheetResult = await sheetsSyncService.syncAllProjectsFromSheet(
          projects,
          contacts,
          sheetsConfig
        );
        if (sheetResult && sheetResult.updatedProjects && sheetResult.updatedProjects.length > 0) {
          baseProjects = sheetResult.updatedProjects;
        }
      } catch (sheetErr) {
        console.warn('Sheets proxy sync notice during live resync:', sheetErr);
      }

      const quoteMap = new Map<string, FirestoreQuoteRecord>();
      webhookQuotes.forEach((q) => { if (q && q.id) quoteMap.set(q.id, q); });
      firestoreQuotes.forEach((q) => { if (q && q.id) quoteMap.set(q.id, q); });
      const combinedQuotes = Array.from(quoteMap.values());

      let finalProjects = baseProjects;
      if (combinedQuotes.length > 0) {
        const result = applyQuotesListToProjects(combinedQuotes, baseProjects);
        finalProjects = result.updatedProjects;
      }

      const purged = masterSyncService.purgeInvalidContractors(finalProjects, contacts);
      setProjects(purged.purgedProjects);
      storageService.saveProjects(purged.purgedProjects);
      dbService.saveProjects(purged.purgedProjects);
      setContacts(purged.purgedContacts);
      storageService.saveContacts(purged.purgedContacts);
      dbService.saveContacts(purged.purgedContacts);

      const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const updatedConfig = { ...sheetsConfig, lastSyncedAt: now };
      setSheetsConfig(updatedConfig);
      storageService.saveSheetsConfig(updatedConfig);

      if (activeTradeForBreakdown && activeScopeForBreakdown) {
        for (const p of purged.purgedProjects) {
          const freshScope = p.scopes.find(
            (s) => s.id === activeScopeForBreakdown.id || s.name.toLowerCase().trim() === activeScopeForBreakdown.name.toLowerCase().trim()
          );
          if (freshScope) {
            const freshTrade = freshScope.trades.find(
              (t) => t.id === activeTradeForBreakdown.id || t.companyName.toLowerCase().trim() === activeTradeForBreakdown.companyName.toLowerCase().trim()
            );
            if (freshTrade) {
              setActiveScopeForBreakdown({ ...freshScope });
              setActiveTradeForBreakdown({ ...freshTrade });
              break;
            }
          }
        }
      }

      showToast('Dashboard updated with latest sheet submissions.');
    } catch (err) {
      console.error('Live sheets resync error:', err);
      showToast('Dashboard updated with latest sheet submissions.');
    } finally {
      setIsSyncing(false);
    }
  }, [projects, contacts, sheetsConfig, activeTradeForBreakdown, activeScopeForBreakdown, applyQuotesListToProjects]);

  const handleTriggerSync = useCallback(async (manualCsvText?: string | unknown) => {
    const validCsvText = typeof manualCsvText === 'string' && manualCsvText.trim().length > 0 ? manualCsvText : undefined;
    setIsSyncing(true);
    try {
      const result = await sheetsSyncService.syncAllProjectsFromSheet(
        projects,
        contacts,
        sheetsConfig,
        validCsvText
      );

      const purged = masterSyncService.purgeInvalidContractors(
        result.updatedProjects,
        result.newContacts || contacts
      );

      setProjects(purged.purgedProjects);
      storageService.saveProjects(purged.purgedProjects);
      dbService.saveProjects(purged.purgedProjects);
      sheetsSyncService.saveBackToMasterSheet(purged.purgedProjects, sheetsConfig);

      setContacts(purged.purgedContacts);
      storageService.saveContacts(purged.purgedContacts);
      dbService.saveContacts(purged.purgedContacts);

      const updatedLogs = [result.log, ...syncLogs].slice(0, 25);
      setSyncLogs(updatedLogs);
      storageService.saveSyncLogs(updatedLogs);

      const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const updatedConfig = { ...sheetsConfig, lastSyncedAt: now };
      setSheetsConfig(updatedConfig);
      storageService.saveSheetsConfig(updatedConfig);

      if (activeTradeForBreakdown && activeScopeForBreakdown) {
        for (const p of result.updatedProjects) {
          const freshScope = p.scopes.find(
            (s) => s.id === activeScopeForBreakdown.id || s.name.toLowerCase().trim() === activeScopeForBreakdown.name.toLowerCase().trim()
          );
          if (freshScope) {
            const freshTrade = freshScope.trades.find(
              (t) => t.id === activeTradeForBreakdown.id || t.companyName.toLowerCase().trim() === activeTradeForBreakdown.companyName.toLowerCase().trim()
            );
            if (freshTrade) {
              setActiveScopeForBreakdown({ ...freshScope });
              setActiveTradeForBreakdown({ ...freshTrade });
              break;
            }
          }
        }
      }

      showToast(`Sync completed: ${result.allocatedQuotesCount} quotes re-synced & overwritten.`);
    } catch (e) {
      console.error('Multi-Project Sync failed', e);
      showToast('Sync encountered an issue parsing compiled spreadsheet.');
    } finally {
      setIsSyncing(false);
    }
  }, [projects, contacts, sheetsConfig, syncLogs, activeTradeForBreakdown, activeScopeForBreakdown]);

  useEffect(() => {
    if (!currentUser) return;
    const queueInterval = setInterval(() => {
      const result = processPendingQueue(projects, contacts);
      if (result.hasChanges) {
        setProjects(result.updatedProjects);
        storageService.saveProjects(result.updatedProjects);
        if (result.dispatchedJobs.length > 0) {
          const firstJob = result.dispatchedJobs[0];
          const jobLabel = firstJob.type === 'invitation' ? 'Tender Invitations' : 'Follow-up Reminders';
          showToast(`Scheduled ${jobLabel} automatically dispatched for ${firstJob.scopeName}`);
        }
      }
    }, 4000);
    return () => clearInterval(queueInterval);
  }, [projects, contacts]);

  const currentPhaseInfo = useMemo(() => {
    return PHASES.find((p) => p.id === activePhase) || PHASES[0];
  }, [activePhase]);

  const currentPhaseScopes = useMemo(() => {
    return currentProjectScopes.filter((s) => s.phaseId === activePhase);
  }, [currentProjectScopes, activePhase]);

  const filteredScopes = useMemo(() => {
    return currentPhaseScopes.filter((scope) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        scope.name.toLowerCase().includes(q) ||
        scope.description.toLowerCase().includes(q) ||
        scope.trades.some(
          (t) =>
            t.contractorName.toLowerCase().includes(q) ||
            t.companyName.toLowerCase().includes(q) ||
            t.category.toLowerCase().includes(q) ||
            t.notes.some((n) => n.text.toLowerCase().includes(q))
        );

      const matchesStatus =
        statusFilter === 'ALL' ||
        scope.trades.some((t) => t.actionStatus === statusFilter);

      let matchesPo = true;
      if (poSentFilter === 'sent') {
        matchesPo = scope.trades.some((t) => t.poSent);
      } else if (poSentFilter === 'pending') {
        matchesPo = scope.trades.length === 0 || scope.trades.some((t) => !t.poSent);
      }

      return matchesSearch && matchesStatus && matchesPo;
    });
  }, [currentPhaseScopes, searchQuery, statusFilter, poSentFilter]);

  const deduplicatedScopes = useMemo(() => {
    const seen = new Set<string>();
    const result: ScopeLineItem[] = [];
    for (const scope of filteredScopes) {
      const key = String(scope.costCode || (scope as any).scopeCode || scope.id || scope.name || '')
        .toLowerCase()
        .trim();
      if (key) {
        if (!seen.has(key)) {
          seen.add(key);
          result.push(scope);
        }
      } else if (!seen.has(scope.id)) {
        seen.add(scope.id);
        result.push(scope);
      }
    }
    return result;
  }, [filteredScopes]);

  const phaseBudgetMetrics = useMemo(() => {
    return calculatePhaseBudget(currentProjectScopes, activePhase);
  }, [currentProjectScopes, activePhase]);

  const phaseProgress = useMemo(() => {
    return calculatePhaseProgress(currentProjectScopes, activePhase);
  }, [currentProjectScopes, activePhase]);

  const areAllScopesCollapsed = useMemo(() => {
    if (deduplicatedScopes.length === 0) return false;
    return deduplicatedScopes.every((s) => collapsedScopeIds.has(s.id));
  }, [deduplicatedScopes, collapsedScopeIds]);

  const handleToggleCollapseAllScopes = () => {
    if (areAllScopesCollapsed) {
      setCollapsedScopeIds((prev) => {
        const next = new Set(prev);
        deduplicatedScopes.forEach((s) => next.delete(s.id));
        return next;
      });
    } else {
      setCollapsedScopeIds((prev) => {
        const next = new Set(prev);
        deduplicatedScopes.forEach((s) => next.add(s.id));
        return next;
      });
    }
  };

  const handleToggleScopeExpand = (scopeId: string) => {
    setCollapsedScopeIds((prev) => {
      const next = new Set(prev);
      if (next.has(scopeId)) {
        next.delete(scopeId);
      } else {
        next.add(scopeId);
      }
      return next;
    });
  };

  const handleSaveProject = (projectData: Partial<Project>, templateType?: ProjectTemplateType) => {
    const now = new Date().toISOString();
    if (projectToEdit) {
      const updatedProjects = projects.map((p) =>
        p.id === projectToEdit.id ? { ...p, ...projectData, updatedAt: now } : p
      );
      persistProjectsAndSync(updatedProjects, `Updated project "${projectData.name}"`);
    } else {
      const newScopes = templateType === 'blank'
        ? []
        : generateScopesFromTemplate(false);

      const newProjId = `prj-${Date.now()}`;
      const newProject: Project = {
        id: newProjId,
        name: projectData.name || 'New Construction Project',
        code: projectData.code || `PRJ-${Date.now().toString().slice(-4)}`,
        client: projectData.client || '',
        location: projectData.location || '',
        description: projectData.description || '',
        targetBudget: projectData.targetBudget || 1000000,
        status: projectData.status || 'Tender Active',
        createdAt: now,
        updatedAt: now,
        createdBy: currentUser?.name || 'Shanice',
        lastModifiedBy: currentUser?.name || 'Shanice',
        scopes: newScopes
      };
      const updatedProjects = [newProject, ...projects];
      persistProjectsAndSync(updatedProjects, `Created project "${newProject.name}" with ${newScopes.length} master scopes`);
      handleSelectProject(newProjId);
    }
    setIsProjectModalOpen(false);
    setProjectToEdit(null);
  };

  const handleDuplicateProject = (project: Project) => {
    const now = new Date().toISOString();
    const clonedScopes: ScopeLineItem[] = project.scopes.map((s, idx) => ({
      ...s,
      id: `scope-${Date.now()}-${idx}`,
      trades: s.trades.map((t, tIdx) => ({
        ...t,
        id: `trade-${Date.now()}-${idx}-${tIdx}`
      }))
    }));
    const clonedProj: Project = {
      ...project,
      id: `prj-${Date.now()}`,
      name: `${project.name} (Copy)`,
      code: `${project.code}-COPY`,
      createdAt: now,
      updatedAt: now,
      scopes: clonedScopes
    };
    const updated = [clonedProj, ...projects];
    persistProjectsAndSync(updated, `Duplicated "${project.name}" successfully`);
  };

  const handleDeleteProject = (projectId: string) => {
    const target = projects.find((p) => p.id === projectId);
    if (target) {
      setProjectToDelete(target);
    }
  };

  const executeDeleteProject = () => {
    if (!projectToDelete) return;
    const targetId = projectToDelete.id;
    const targetName = projectToDelete.name;
    const updated = projects.filter((p) => p.id !== targetId);
    persistProjectsAndSync(updated, `Project "${targetName}" deleted.`);
    if (activeProjectId === targetId) {
      handleNavigateHome();
    }
    setProjectToDelete(null);
  };

  const handleSaveScope = (scopeData: Partial<ScopeLineItem>) => {
    if (!activeProject) return;
    let updatedScopes: ScopeLineItem[];
    if (scopeToEdit) {
      updatedScopes = currentProjectScopes.map((s) =>
        s.id === scopeToEdit.id ? { ...s, ...scopeData } : s
      );
      showToast(`Updated scope "${scopeData.name}"`);
    } else {
      const newScope: ScopeLineItem = {
        id: `scope-${Date.now()}`,
        phaseId: scopeData.phaseId || activePhase,
        name: scopeData.name || 'New Scope Item',
        description: scopeData.description || '',
        budgetAmount: scopeData.budgetAmount || 0,
        trades: [],
        isRequired: scopeData.isRequired !== false,
        order: currentPhaseScopes.length + 1,
        createdAt: new Date().toISOString()
      };
      updatedScopes = [...currentProjectScopes, newScope];
      showToast(`Added new scope "${newScope.name}" to Phase ${newScope.phaseId}`);
    }

    const updatedProjects = projects.map((p) =>
      p.id === activeProject.id ? { ...p, scopes: updatedScopes, updatedAt: new Date().toISOString() } : p
    );
    persistProjectsAndSync(updatedProjects);
    setScopeToEdit(null);
  };

  const handleUpdateScope = (updatedScope: ScopeLineItem) => {
    if (!activeProject) return;
    const updatedScopes = currentProjectScopes.map((s) => (s.id === updatedScope.id ? updatedScope : s));
    const updatedProjects = projects.map((p) =>
      p.id === activeProject.id ? { ...p, scopes: updatedScopes, updatedAt: new Date().toISOString() } : p
    );
    persistProjectsAndSync(updatedProjects);
  };

  const handleDeleteScope = (scopeId: string) => {
    if (!activeProject) return;
    const target = currentProjectScopes.find((s) => s.id === scopeId);
    if (target) {
      setScopeToDelete(target);
    }
  };

  const executeDeleteScope = () => {
    if (!activeProject || !scopeToDelete) return;
    const targetId = scopeToDelete.id;
    const targetName = scopeToDelete.name;
    const updatedScopes = currentProjectScopes.filter((s) => s.id !== targetId);
    const updatedProjects = projects.map((p) =>
      p.id === activeProject.id ? { ...p, scopes: updatedScopes, updatedAt: new Date().toISOString() } : p
    );
    persistProjectsAndSync(updatedProjects, `Removed scope "${targetName}".`);
    setScopeToDelete(null);
  };

  const handleSaveTrade = (newTrade: TradeEntry) => {
    if (!activeProject) return;
    const targetScope = currentProjectScopes.find((s) => s.id === newTrade.scopeId);
    if (!targetScope) return;

    const newDocUrl = newTrade.attachedDocs && newTrade.attachedDocs.length > 0
      ? sheetsSyncService.normalizeDocUrl(newTrade.attachedDocs[0].url)
      : '';

    const existingIndex = targetScope.trades.findIndex((t) => {
      if (t.id === newTrade.id) return true;
      const contractorMatches =
        t.companyName.trim().toLowerCase() === newTrade.companyName.trim().toLowerCase() ||
        t.contractorName.trim().toLowerCase() === newTrade.contractorName.trim().toLowerCase();
      const hasMatchingDoc = newDocUrl
        ? t.attachedDocs.some((d) => sheetsSyncService.normalizeDocUrl(d.url) === newDocUrl)
        : false;
      return (newDocUrl && hasMatchingDoc) || contractorMatches;
    });

    let updatedTrades: TradeEntry[];
    if (existingIndex >= 0) {
      updatedTrades = targetScope.trades.map((t, idx) => {
        if (idx === existingIndex) {
          const mergedDocs = [...t.attachedDocs];
          newTrade.attachedDocs.forEach((incomingDoc) => {
            const norm = sheetsSyncService.normalizeDocUrl(incomingDoc.url);
            const docExists = mergedDocs.find(
              (d) => sheetsSyncService.normalizeDocUrl(d.url) === norm || d.name === incomingDoc.name
            );
            if (docExists) {
              docExists.url = incomingDoc.url;
              docExists.addedAt = new Date().toISOString().split('T')[0];
            } else {
              mergedDocs.push(incomingDoc);
            }
          });
          return {
            ...t,
            ...newTrade,
            id: t.id,
            quotedFigure: newTrade.quotedFigure > 0 ? newTrade.quotedFigure : t.quotedFigure,
            actionStatus: newTrade.actionStatus || t.actionStatus,
            attachedDocs: mergedDocs,
            quoteBreakdown:
              newTrade.quoteBreakdown && newTrade.quoteBreakdown.length > 0
                ? newTrade.quoteBreakdown
                : t.quoteBreakdown,
            lastSyncedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          };
        }
        return t;
      });
      showToast(`Updated existing quote record for ${newTrade.companyName}`);
    } else {
      updatedTrades = [...targetScope.trades, newTrade];
      showToast(`Added quote from ${newTrade.companyName}`);
    }

    const updatedScopes = currentProjectScopes.map((s) =>
      s.id === newTrade.scopeId ? { ...s, trades: updatedTrades } : s
    );
    const updatedProjects = projects.map((p) =>
      p.id === activeProject.id ? { ...p, scopes: updatedScopes, updatedAt: new Date().toISOString() } : p
    );
    persistProjectsAndSync(updatedProjects);

    const quoteDocId = newTrade.quoteDocId || newTrade.id || `${activeProject.name}_${newTrade.companyName}_${newTrade.costCode || targetScope.costCode || '20000'}`.replace(/\//g, '-');
    const quotePayload = {
      id: quoteDocId,
      projectId: activeProject.id,
      projectName: activeProject.name,
      trade: targetScope.name,
      tradeScope: targetScope.name,
      tenderItem: targetScope.name,
      costCode: newTrade.costCode || targetScope.costCode || '20000',
      companyName: newTrade.companyName,
      contractorName: newTrade.contractorName || newTrade.companyName,
      email: newTrade.contactEmail || '',
      emailAddress: newTrade.contactEmail || '',
      phone: newTrade.contactPhone || '',
      quotedFigure: newTrade.quotedFigure,
      enteredAmount: newTrade.quotedFigure,
      amount: newTrade.quotedFigure,
      submittedAt: new Date().toISOString(),
      docUrl: newTrade.docUrl || (newTrade.attachedDocs?.[0]?.url || ''),
      attachedDocs: newTrade.attachedDocs || [],
      notes: newTrade.notes?.[0]?.text || '',
      status: 'Pending Review',
      quoteBreakdown: newTrade.quoteBreakdown || [],
      lastModifiedBy: currentUser?.email || dbService.getActiveUserEmail(),
      updatedAt: new Date().toISOString()
    };
    const sanitizedQuote = JSON.parse(JSON.stringify(quotePayload, (_key, val) => (val === undefined ? null : val)));
    if (db) {
      setDoc(doc(db, 'quotes', quoteDocId), sanitizedQuote, { merge: true }).catch((err) =>
        console.warn('handleSaveTrade direct quote persistence notice:', err)
      );
    }
  };

  const handleSaveNotes = (tradeId: string, updatedNotes: NoteItem[]) => {
    if (!activeProject) return;
    const updatedScopes = currentProjectScopes.map((s) => ({
      ...s,
      trades: s.trades.map((t) => (t.id === tradeId ? { ...t, notes: updatedNotes } : t))
    }));
    const updatedProjects = projects.map((p) =>
      p.id === activeProject.id ? { ...p, scopes: updatedScopes, updatedAt: new Date().toISOString() } : p
    );
    persistProjectsAndSync(updatedProjects);
    if (activeTradeForNotes && activeTradeForNotes.id === tradeId) {
      setActiveTradeForNotes({ ...activeTradeForNotes, notes: updatedNotes });
    }
  };

  const handleSaveDocs = async (tradeId: string, updatedDocs: AttachedDoc[]) => {
    if (!activeProject) return;
    const cleanDocs = (updatedDocs || []).filter((d) => d.url && !d.url.startsWith('blob:'));
    const updatedScopes = currentProjectScopes.map((s) => ({
      ...s,
      trades: s.trades.map((t) => (t.id === tradeId ? { ...t, attachedDocs: cleanDocs } : t))
    }));
    const updatedProjects = projects.map((p) =>
      p.id === activeProject.id ? { ...p, scopes: updatedScopes, updatedAt: new Date().toISOString() } : p
    );
    persistProjectsAndSync(updatedProjects);
    if (activeTradeForDocs && activeTradeForDocs.id === tradeId) {
      setActiveTradeForDocs({ ...activeTradeForDocs, attachedDocs: cleanDocs });
    }

    const targetTrade = currentProjectScopes
      .flatMap((s) => s.trades)
      .find((t) => t.id === tradeId);
    const targetQuoteId = targetTrade?.quoteDocId || targetTrade?.id || tradeId;

    if (targetQuoteId) {
      persistQuoteAttachedDocsToFirestore(targetQuoteId, cleanDocs, {
        companyName: targetTrade?.companyName || targetTrade?.contractorName,
        contractorName: targetTrade?.contractorName || targetTrade?.companyName
      }).catch((err) => console.warn('Notice saving attachedDocs in handleSaveDocs:', err));

      if (targetTrade?.quoteDocId && targetTrade.quoteDocId !== targetQuoteId) {
        persistQuoteAttachedDocsToFirestore(targetTrade.quoteDocId, cleanDocs).catch(() => { });
      }
    }
  };

  const handleOpenQuoteBreakdown = (trade: TradeEntry, scope: ScopeLineItem) => {
    setActiveTradeForBreakdown(trade);
    setActiveScopeForBreakdown(scope);
  };

  const handleSaveTradeFromBreakdown = (updatedTrade: TradeEntry) => {
    if (!activeProject) return;
    const updatedScopes = currentProjectScopes.map((s) => {
      if (s.id === updatedTrade.scopeId) {
        return {
          ...s,
          trades: s.trades.map((t) => (t.id === updatedTrade.id ? updatedTrade : t))
        };
      }
      return s;
    });
    const updatedProjects = projects.map((p) =>
      p.id === activeProject.id ? { ...p, scopes: updatedScopes, updatedAt: new Date().toISOString() } : p
    );
    persistProjectsAndSync(updatedProjects, `Updated quote & tender breakdown for ${updatedTrade.companyName}`);
  };

  const handleToggleSelectQuote = useCallback((quoteId: string) => {
    setSelectedQuoteIds((prev) =>
      prev.includes(quoteId) ? prev.filter((id) => id !== quoteId) : [...prev, quoteId]
    );
  }, []);

  const handleSelectMultipleQuotes = useCallback((quoteIds: string[], select: boolean) => {
    setSelectedQuoteIds((prev) => {
      if (select) {
        const next = new Set(prev);
        quoteIds.forEach((id) => next.add(id));
        return Array.from(next);
      } else {
        const removeSet = new Set(quoteIds);
        return prev.filter((id) => !removeSet.has(id));
      }
    });
  }, []);

  const handleClearSelection = useCallback(() => {
    setSelectedQuoteIds([]);
  }, []);

  const handleSelectAllMisassigned = useCallback(() => {
    if (!activeProject) return;
    const misassignedIds: string[] = [];
    activeProject.scopes.forEach((s) => {
      (s.trades || []).forEach((t) => {
        if (isQuoteMisassigned(t, s)) {
          const docId = t.quoteDocId || `${activeProject.name}_${t.companyName || t.contractorName}_${t.costCode || s.costCode || '20000'}` || t.id;
          misassignedIds.push(docId);
          if (t.id) misassignedIds.push(t.id);
        }
      });
    });

    if (misassignedIds.length === 0) {
      showToast('No misassigned quotes found in active project.');
      return;
    }
    const uniqueIds = Array.from(new Set(misassignedIds));
    setSelectedQuoteIds((prev) => Array.from(new Set([...prev, ...uniqueIds])));
    showToast(`Selected ${uniqueIds.length} misassigned quote items.`);
  }, [activeProject]);

  const selectedQuoteCount = useMemo(() => {
    if (!activeProject || selectedQuoteIds.length === 0) return 0;
    const selectedSet = new Set(selectedQuoteIds);
    let count = 0;
    activeProject.scopes.forEach((s) => {
      (s.trades || []).forEach((t) => {
        const docId = t.quoteDocId || `${activeProject.name}_${t.companyName || t.contractorName}_${t.costCode || s.costCode || '20000'}` || t.id;
        if (selectedSet.has(t.id) || selectedSet.has(docId) || (t.quoteDocId && selectedSet.has(t.quoteDocId))) {
          count++;
        }
      });
    });
    return count > 0 ? count : selectedQuoteIds.length;
  }, [activeProject, selectedQuoteIds]);

  const misassignedCount = useMemo(() => {
    if (!activeProject) return 0;
    let count = 0;
    activeProject.scopes.forEach((s) => {
      (s.trades || []).forEach((t) => {
        if (isQuoteMisassigned(t, s)) {
          count++;
        }
      });
    });
    return count;
  }, [activeProject]);

  const handleExecuteBulkDelete = async () => {
    if (selectedQuoteIds.length === 0) return;
    setIsBulkDeleting(true);
    const idsToDelete = [...selectedQuoteIds];
    const uniqueIdsSet = new Set(idsToDelete);

    const metadataList: { id: string; companyName?: string; projectId?: string }[] = [];
    activeProject?.scopes.forEach((s) => {
      s.trades.forEach((t) => {
        const docId = t.quoteDocId || `${activeProject.name}_${t.companyName || t.contractorName}_${t.costCode || s.costCode || '20000'}` || t.id;
        if (uniqueIdsSet.has(docId) || uniqueIdsSet.has(t.id) || (t.quoteDocId && uniqueIdsSet.has(t.quoteDocId))) {
          metadataList.push({
            id: docId,
            companyName: t.companyName || t.contractorName,
            projectId: activeProject.id
          });
        }
      });
    });

    try {
      await dbService.batchDeleteQuotes(idsToDelete, metadataList);
    } catch (batchErr) {
      console.warn('Batch delete error notice:', batchErr);
    }

    const countToDelete = selectedQuoteCount || idsToDelete.length;
    setProjects((prevProjects) => {
      const updated = prevProjects.map((proj) => {
        const updatedScopes = (proj.scopes || []).map((scope) => {
          const remainingTrades = (scope.trades || []).filter((trade) => {
            const docId = trade.quoteDocId || `${proj.name}_${trade.companyName || trade.contractorName}_${trade.costCode || scope.costCode || '20000'}` || trade.id;
            const isMatch = uniqueIdsSet.has(trade.id) || uniqueIdsSet.has(docId) || (trade.quoteDocId && uniqueIdsSet.has(trade.quoteDocId));
            return !isMatch;
          });
          return {
            ...scope,
            trades: remainingTrades
          };
        });
        return {
          ...proj,
          scopes: updatedScopes
        };
      });
      dbService.saveProjects(updated).catch((err) => console.warn('saveProjects notice:', err));
      return updated;
    });

    setSelectedQuoteIds([]);
    setIsBulkDeleting(false);
    setIsBulkDeleteModalOpen(false);
    showToast(`Permanently deleted ${countToDelete} selected quote${countToDelete === 1 ? '' : 's'}.`);
  };

  const handleSendTenderInvitations = async ({
    scopeId,
    selectedContactIds,
    customEmails,
    driveLink,
    formLink,
    tenderDeadline,
    generatedHtml,
    senderName = 'Shanice',
    senderEmail = 'shanice@thezenithgroup.ca',
    ccEmails = [],
    isScheduled = false,
    scheduledIso,
    scheduledDisplay
  }: {
    scopeId: string;
    selectedContactIds: string[];
    customEmails: Record<string, string>;
    driveLink: string;
    formLink: string;
    tenderDeadline: string;
    generatedHtml: string;
    generatedPlainText: string;
    recipientEmails: string[];
    senderName?: string;
    senderEmail?: string;
    ccEmails?: string[];
    isScheduled?: boolean;
    scheduledIso?: string;
    scheduledDisplay?: string;
  }): Promise<boolean | { success: boolean; message?: string }> => {
    if (!activeProject) return false;
    const now = new Date().toISOString();
    const formattedDate = new Date().toISOString().split('T')[0];

    let updatedContacts = [...contacts];
    let contactsModified = false;
    Object.entries(customEmails).forEach(([contactId, newEmail]) => {
      const trimmed = newEmail.trim();
      if (trimmed && trimmed.includes('@')) {
        updatedContacts = updatedContacts.map((c) =>
          c.id === contactId && (!c.email || c.email !== trimmed)
            ? { ...c, email: trimmed }
            : c
        );
        contactsModified = true;
      }
    });

    if (contactsModified) {
      setContacts(updatedContacts);
      storageService.saveContacts(updatedContacts);
      dbService.saveContacts(updatedContacts);
    }

    const ccSummary = ccEmails.length > 0 ? ` (CC: ${ccEmails.join(', ')})` : '';

    if (isScheduled && scheduledIso) {
      const targetScope = currentProjectScopes.find((s) => s.id === scopeId);
      const scheduledJob: ScheduledEmailJob = {
        id: `job-inv-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        projectId: activeProject.id,
        projectName: activeProject.name,
        scopeId: scopeId,
        scopeName: targetScope?.name || 'Tender Scope',
        type: 'invitation',
        scheduledTime: scheduledIso,
        scheduledTimeDisplay: scheduledDisplay || scheduledIso,
        status: 'pending',
        selectedRecipientIds: selectedContactIds,
        customEmails: customEmails,
        driveLink: driveLink,
        formLink: formLink,
        tenderDeadline: tenderDeadline,
        senderName: senderName,
        senderEmail: senderEmail,
        ccEmails: ccEmails,
        createdAt: now
      };

      saveScheduledJob(scheduledJob);
      refreshScheduledJobs();

      const updatedScopes = currentProjectScopes.map((scope) => {
        if (scope.id !== scopeId) return scope;
        const existingTrades = [...scope.trades];
        selectedContactIds.forEach((contactId) => {
          const contact = updatedContacts.find((c) => c.id === contactId);
          if (!contact) return;
          const existingTradeIndex = existingTrades.findIndex(
            (t) => (t.contactId && t.contactId === contactId) || t.companyName.toLowerCase() === contact.company.toLowerCase()
          );

          const scheduleNote: NoteItem = {
            id: `note-sched-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
            text: `Tender invitation scheduled for launch on ${scheduledDisplay || scheduledIso} by ${senderName} <${senderEmail}> (Deadline: ${tenderDeadline})${ccSummary}.`,
            timestamp: now,
            author: senderName || 'Zenith Admin Team'
          };

          if (existingTradeIndex >= 0) {
            const existingTrade = existingTrades[existingTradeIndex];
            existingTrades[existingTradeIndex] = {
              ...existingTrade,
              notes: [scheduleNote, ...existingTrade.notes]
            };
          } else {
            const newTrade: TradeEntry = {
              id: `t-${scope.id}-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
              scopeId: scope.id,
              contactId: contact.id,
              contractorName: contact.name,
              companyName: contact.company,
              category: contact.category || (contact.trade_categories && contact.trade_categories[0]) || scope.name,
              quotedFigure: 0,
              currency: 'CAD',
              attachedDocs: [],
              actionStatus: 'Estimate Requested',
              poSent: false,
              isAwarded: false,
              notes: [scheduleNote]
            };
            existingTrades.push(newTrade);
          }
        });

        return {
          ...scope,
          googleFormUrl: formLink,
          tenderDeadline: tenderDeadline,
          trades: existingTrades,
          scheduledInvite: { ...scheduledJob }
        };
      });

      const updatedProjects = projects.map((p) =>
        p.id === activeProject.id
          ? { ...p, driveLink, scopes: updatedScopes, updatedAt: now }
          : p
      );
      persistProjectsAndSync(updatedProjects, `Tender invitations scheduled for launch on ${scheduledDisplay || 'scheduled date'}`);
      return true;
    }

    const targetScope = currentProjectScopes.find((s) => s.id === scopeId);
    const resolvedRecipients: { contactId: string; email: string; name: string; company: string }[] = [];
    selectedContactIds.forEach((contactId) => {
      const contact = updatedContacts.find((c) => c.id === contactId);
      const email = (customEmails[contactId] || contact?.email || '').trim();
      if (email && email.includes('@')) {
        resolvedRecipients.push({
          contactId,
          email,
          name: contact?.name || '',
          company: contact?.company || ''
        });
      }
    });

    if (resolvedRecipients.length === 0) {
      showToast('No valid recipient email addresses found for selected contractors.');
      return false;
    }

    const bccRecipients = Array.from(
      new Set(
        resolvedRecipients
          .map((r) => r.email)
          .filter((e) => e && e.toLowerCase() !== 'info@thezenithgroup.ca')
      )
    );

    const subject = `Estimate Request: ${activeProject.name} - ${targetScope?.name || 'Scope'}`;
    const googleAccessToken = googleAuthService.getAccessToken();
    const currentGoogleUser = googleAuthService.getCurrentUser();
    let dispatchResult: { success: boolean; dispatchedCount: number; errors?: string[]; errorMessage?: string };
    let engineLabel = 'Gmail API';

    if (googleAccessToken) {
      dispatchResult = await gmailApiService.dispatchSingleBccBatch({
        accessToken: googleAccessToken,
        senderName: senderName || currentGoogleUser?.name || 'Shanice',
        senderEmail: senderEmail || currentGoogleUser?.email || 'shanice@thezenithgroup.ca',
        to: 'info@thezenithgroup.ca',
        bccRecipients,
        subject,
        htmlBody: generatedHtml,
        cc: ccEmails
      });
      engineLabel = 'Google Gmail API';
    } else {
      const endpointUrl = appsScriptService.getEndpointUrl();
      if (!endpointUrl) {
        showToast('Please sign in with your @thezenithgroup.ca Google Account or configure a Webhook endpoint in Settings.');
        setIsSheetsSyncOpen(true);
        return false;
      }
      dispatchResult = await appsScriptService.dispatchSingleBccBatch({
        endpointUrl,
        to: 'info@thezenithgroup.ca',
        bccRecipients,
        subject,
        htmlBody: generatedHtml,
        cc: ccEmails
      });
      engineLabel = 'Google Apps Script';
    }

    if (!dispatchResult.success && dispatchResult.dispatchedCount === 0) {
      showToast(`Dispatch failed: ${dispatchResult.errorMessage || 'Unable to complete email dispatch.'}`);
      return false;
    }

    const inviteTimestamp = `1 email dispatched via ${engineLabel} to ${resolvedRecipients.length} contractors via BCC on ${formattedDate}`;
    const updatedScopes = currentProjectScopes.map((scope) => {
      if (scope.id !== scopeId) return scope;
      const existingTrades = [...scope.trades];
      resolvedRecipients.forEach((recipient) => {
        const existingTradeIndex = existingTrades.findIndex(
          (t) => (t.contactId && t.contactId === recipient.contactId) || t.companyName.toLowerCase() === recipient.company.toLowerCase()
        );
        const dispatchNote: NoteItem = {
          id: `note-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
          text: `Invite sent via ${engineLabel} on ${formattedDate} to ${recipient.email} by ${senderName} <${senderEmail}> (Deadline: ${tenderDeadline})${ccSummary}. Action Status: Estimate Requested. Single BCC Batch.`,
          timestamp: now,
          author: senderName || 'Zenith Estimating Team'
        };

        if (existingTradeIndex >= 0) {
          const existingTrade = existingTrades[existingTradeIndex];
          existingTrades[existingTradeIndex] = {
            ...existingTrade,
            actionStatus: 'Estimate Requested',
            hasBeenInvited: true,
            notes: [dispatchNote, ...existingTrade.notes]
          };
        } else {
          const newTrade: TradeEntry = {
            id: `t-${scope.id}-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
            scopeId: scope.id,
            contactId: recipient.contactId,
            contractorName: recipient.name,
            companyName: recipient.company,
            category: scope.name,
            quotedFigure: 0,
            currency: 'CAD',
            attachedDocs: [],
            actionStatus: 'Estimate Requested',
            poSent: false,
            isAwarded: false,
            hasBeenInvited: true,
            notes: [dispatchNote]
          };
          existingTrades.push(newTrade);
        }
      });

      const existingNotes = (scope.notes || '').trim();
      const updatedScopeNotes = existingNotes ? `${existingNotes}\n${inviteTimestamp}` : inviteTimestamp;

      return {
        ...scope,
        notes: updatedScopeNotes,
        googleFormUrl: formLink,
        tenderDeadline: tenderDeadline,
        trades: existingTrades,
        scheduledInvite: undefined
      };
    });

    const updatedProjects = projects.map((p) =>
      p.id === activeProject.id
        ? {
          ...p,
          driveLink: driveLink,
          scopes: updatedScopes,
          updatedAt: now
        }
        : p
    );
    const postDispatchMsg = `1 email dispatched to ${resolvedRecipients.length} contractors via BCC`;
    persistProjectsAndSync(updatedProjects, postDispatchMsg);
    showToast(postDispatchMsg);
    return { success: true, message: postDispatchMsg };
  };

  const handleCancelScheduledEmail = (scopeId: string, type: 'invitation' | 'reminder') => {
    if (!activeProject) return;
    const currentScopes = activeProject.scopes || [];
    const targetScope = currentScopes.find((s) => s.id === scopeId);
    if (!targetScope) return;

    const jobToCancel = type === 'invitation' ? targetScope.scheduledInvite : targetScope.scheduledReminder;
    if (jobToCancel?.id) {
      cancelScheduledJob(jobToCancel.id);
    }
    cancelScheduledJob(scopeId);

    const now = new Date().toISOString();
    const typeLabel = type === 'invitation' ? 'tender email launch' : 'follow-up reminder';
    const cancelNote: NoteItem = {
      id: `note-cancel-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      text: `Scheduled ${typeLabel} was cancelled on ${new Date().toLocaleDateString()}.`,
      timestamp: now,
      author: 'Zenith Admin Team'
    };

    const updatedScopes = currentScopes.map((s) => {
      if (s.id !== scopeId) return s;
      const updatedTrades = s.trades.map((t) => ({
        ...t,
        notes: [cancelNote, ...t.notes]
      }));
      return {
        ...s,
        trades: updatedTrades,
        scheduledInvite: type === 'invitation' ? undefined : s.scheduledInvite,
        scheduledReminder: type === 'reminder' ? undefined : s.scheduledReminder
      };
    });

    const updatedProjects = projects.map((p) =>
      p.id === activeProject.id ? { ...p, scopes: updatedScopes, updatedAt: now } : p
    );
    persistProjectsAndSync(updatedProjects, `Cancelled scheduled ${typeLabel} for "${targetScope.name}".`);
    refreshScheduledJobs();
    showToast(`Cancelled scheduled ${typeLabel} for ${targetScope.name}.`);
  };

  const handleCancelFromQueue = useCallback((jobId: string, scopeId?: string) => {
    cancelScheduledJob(jobId);
    if (scopeId) {
      cancelScheduledJob(scopeId);
    }
    const now = new Date().toISOString();
    const updatedProjects = projects.map((p) => {
      const hasScope = scopeId
        ? p.scopes.some((s) => s.id === scopeId)
        : p.scopes.some((s) => s.scheduledInvite?.id === jobId || s.scheduledReminder?.id === jobId);
      if (!hasScope) return p;

      return {
        ...p,
        scopes: p.scopes.map((s) => {
          const matchScope = (scopeId && s.id === scopeId) || s.scheduledInvite?.id === jobId || s.scheduledReminder?.id === jobId;
          if (!matchScope) return s;
          const cancelNote: NoteItem = {
            id: `note-cancel-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
            text: `Scheduled email dispatch was cancelled and revoked via Scheduled Email Queue.`,
            timestamp: now,
            author: 'Queue Manager'
          };
          return {
            ...s,
            scheduledInvite: (s.scheduledInvite?.id === jobId || (scopeId && s.id === scopeId && s.scheduledInvite?.status === 'pending'))
              ? undefined
              : s.scheduledInvite,
            scheduledReminder: (s.scheduledReminder?.id === jobId || (scopeId && s.id === scopeId && s.scheduledReminder?.status === 'pending'))
              ? undefined
              : s.scheduledReminder,
            trades: s.trades.map((t) => ({ ...t, notes: [cancelNote, ...t.notes] }))
          };
        }),
        updatedAt: now
      };
    });

    persistProjectsAndSync(updatedProjects, 'Scheduled email trigger revoked & job cancelled.');
    refreshScheduledJobs();
    showToast('Scheduled email trigger revoked & job cancelled.');
  }, [projects, persistProjectsAndSync, refreshScheduledJobs]);

  const handleDeleteJobFromQueue = useCallback((jobId: string) => {
    deleteScheduledJob(jobId);
    refreshScheduledJobs();
    showToast('Removed entry from queue log.');
  }, [refreshScheduledJobs]);

  const handleSyncQueueWithSheet = useCallback(async () => {
    setIsSyncing(true);
    try {
      const result = await syncScheduledDispatchesToBackend(scheduledJobsList);
      showToast(result.message || 'Scheduled Dispatches synced with Master Google Sheet.');
    } catch (err: any) {
      showToast(`Sync error: ${err?.message || 'Failed'}`);
    } finally {
      setIsSyncing(false);
    }
  }, [scheduledJobsList]);

  const handleSendTenderReminders = async ({
    scopeId,
    selectedTradeIds,
    customEmails,
    driveLink,
    formLink,
    tenderDeadline,
    generatedHtml,
    senderName = 'Shanice',
    senderEmail = 'shanice@thezenithgroup.ca',
    ccEmails = [],
    isScheduled = false,
    scheduledIso,
    scheduledDisplay
  }: {
    scopeId: string;
    selectedTradeIds: string[];
    customEmails: Record<string, string>;
    driveLink: string;
    formLink: string;
    tenderDeadline: string;
    generatedHtml: string;
    generatedPlainText: string;
    recipientEmails: string[];
    senderName?: string;
    senderEmail?: string;
    ccEmails?: string[];
    isScheduled?: boolean;
    scheduledIso?: string;
    scheduledDisplay?: string;
  }): Promise<boolean | { success: boolean; message?: string }> => {
    if (!activeProject) return false;
    const now = new Date().toISOString();
    const formattedDate = new Date().toISOString().split('T')[0];

    let updatedContacts = [...contacts];
    let contactsModified = false;
    Object.entries(customEmails).forEach(([tradeId, newEmail]) => {
      const trimmed = newEmail.trim();
      if (trimmed && trimmed.includes('@')) {
        const targetTrade = currentProjectScopes
          .find((s) => s.id === scopeId)
          ?.trades.find((t) => t.id === tradeId);
        if (targetTrade) {
          updatedContacts = updatedContacts.map((c) =>
            (targetTrade.contactId && c.id === targetTrade.contactId) ||
              c.company.toLowerCase() === targetTrade.companyName.toLowerCase()
              ? { ...c, email: trimmed }
              : c
          );
          contactsModified = true;
        }
      }
    });

    if (contactsModified) {
      setContacts(updatedContacts);
      storageService.saveContacts(updatedContacts);
      dbService.saveContacts(updatedContacts);
    }

    const ccSummary = ccEmails.length > 0 ? ` (CC: ${ccEmails.join(', ')})` : '';

    if (isScheduled && scheduledIso) {
      const targetScope = currentProjectScopes.find((s) => s.id === scopeId);
      const scheduledJob: ScheduledEmailJob = {
        id: `job-rem-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        projectId: activeProject.id,
        projectName: activeProject.name,
        scopeId: scopeId,
        scopeName: targetScope?.name || 'Tender Scope',
        type: 'reminder',
        scheduledTime: scheduledIso,
        scheduledTimeDisplay: scheduledDisplay || scheduledIso,
        status: 'pending',
        selectedRecipientIds: selectedTradeIds,
        customEmails: customEmails,
        driveLink: driveLink,
        formLink: formLink,
        tenderDeadline: tenderDeadline,
        senderName: senderName,
        senderEmail: senderEmail,
        ccEmails: ccEmails,
        createdAt: now
      };

      saveScheduledJob(scheduledJob);
      refreshScheduledJobs();

      const updatedScopes = currentProjectScopes.map((scope) => {
        if (scope.id !== scopeId) return scope;
        const updatedTrades = scope.trades.map((trade) => {
          if (!selectedTradeIds.includes(trade.id)) return trade;
          const schedNote: NoteItem = {
            id: `note-sched-rem-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
            text: `Follow-up reminder scheduled for dispatch on ${scheduledDisplay || scheduledIso} by ${senderName} <${senderEmail}> (Deadline: ${tenderDeadline})${ccSummary}.`,
            timestamp: now,
            author: senderName || 'Zenith Admin Team'
          };
          return {
            ...trade,
            notes: [schedNote, ...trade.notes]
          };
        });
        return {
          ...scope,
          googleFormUrl: formLink,
          tenderDeadline: tenderDeadline,
          trades: updatedTrades,
          scheduledReminder: { ...scheduledJob }
        };
      });

      const updatedProjects = projects.map((p) =>
        p.id === activeProject.id
          ? {
            ...p,
            driveLink: driveLink,
            scopes: updatedScopes,
            updatedAt: now
          }
          : p
      );
      persistProjectsAndSync(updatedProjects, `Follow-up reminder scheduled for ${scheduledDisplay || 'scheduled date'}`);
      return true;
    }

    const targetScope = currentProjectScopes.find((s) => s.id === scopeId);
    const resolvedRecipients: { tradeId: string; email: string; name: string; company: string }[] = [];
    selectedTradeIds.forEach((tradeId) => {
      const trade = targetScope?.trades.find((t) => t.id === tradeId);
      const contact = trade?.contactId ? contacts.find((c) => c.id === trade.contactId) : undefined;
      const email = (customEmails[tradeId] || contact?.email || '').trim();
      if (email && email.includes('@')) {
        resolvedRecipients.push({
          tradeId,
          email,
          name: trade?.contractorName || contact?.name || '',
          company: trade?.companyName || contact?.company || ''
        });
      }
    });

    if (resolvedRecipients.length === 0) {
      showToast('No valid recipient emails found for selected contractors.');
      return false;
    }

    const bccRecipients = Array.from(
      new Set(
        resolvedRecipients
          .map((r) => r.email)
          .filter((e) => e && e.toLowerCase() !== 'info@thezenithgroup.ca')
      )
    );

    const subject = `Tender Follow-up: ${activeProject.name} (${activeProject.code || 'PRJ'}) - ${targetScope?.name || 'Scope'} Estimate Reminder`;
    const googleAccessToken = googleAuthService.getAccessToken();
    const currentGoogleUser = googleAuthService.getCurrentUser();
    let dispatchResult: { success: boolean; dispatchedCount: number; errors?: string[]; errorMessage?: string };
    let engineLabel = 'Gmail API';

    if (googleAccessToken) {
      dispatchResult = await gmailApiService.dispatchSingleBccBatch({
        accessToken: googleAccessToken,
        senderName: senderName || currentGoogleUser?.name || 'Shanice',
        senderEmail: senderEmail || currentGoogleUser?.email || 'shanice@thezenithgroup.ca',
        to: 'info@thezenithgroup.ca',
        bccRecipients,
        subject,
        htmlBody: generatedHtml,
        cc: ccEmails
      });
      engineLabel = 'Google Gmail API';
    } else {
      const endpointUrl = appsScriptService.getEndpointUrl();
      if (!endpointUrl) {
        showToast('Please sign in with your @thezenithgroup.ca Google Account or configure a Webhook endpoint in Settings.');
        setIsSheetsSyncOpen(true);
        return false;
      }
      dispatchResult = await appsScriptService.dispatchSingleBccBatch({
        endpointUrl,
        to: 'info@thezenithgroup.ca',
        bccRecipients,
        subject,
        htmlBody: generatedHtml,
        cc: ccEmails
      });
      engineLabel = 'Google Apps Script';
    }

    if (!dispatchResult.success && dispatchResult.dispatchedCount === 0) {
      showToast(`Dispatch failed: ${dispatchResult.errorMessage || 'Unable to complete reminder dispatch.'}`);
      return false;
    }

    const reminderTimestamp = `1 reminder email dispatched via ${engineLabel} to ${resolvedRecipients.length} contractors via BCC on ${formattedDate}`;
    const updatedScopes = currentProjectScopes.map((scope) => {
      if (scope.id !== scopeId) return scope;
      const updatedTrades = scope.trades.map((trade) => {
        if (!selectedTradeIds.includes(trade.id)) return trade;
        const recipientItem = resolvedRecipients.find((r) => r.tradeId === trade.id);
        const recipientEmail = recipientItem ? recipientItem.email : (trade.contractorName || trade.companyName);
        const reminderNote: NoteItem = {
          id: `note-reminder-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
          text: `Follow-up reminder sent via ${engineLabel} on ${formattedDate} to ${recipientEmail} by ${senderName} <${senderEmail}> (Deadline: ${tenderDeadline})${ccSummary}. Status: Estimate Requested. Single BCC Batch.`,
          timestamp: now,
          author: senderName || 'Zenith Estimating Team'
        };
        return {
          ...trade,
          actionStatus: 'Estimate Requested' as const,
          notes: [reminderNote, ...trade.notes]
        };
      });

      const existingNotes = (scope.notes || '').trim();
      const updatedScopeNotes = existingNotes ? `${existingNotes}\n${reminderTimestamp}` : reminderTimestamp;

      return {
        ...scope,
        notes: updatedScopeNotes,
        googleFormUrl: formLink,
        tenderDeadline: tenderDeadline,
        trades: updatedTrades,
        scheduledReminder: undefined
      };
    });

    const updatedProjects = projects.map((p) =>
      p.id === activeProject.id
        ? {
          ...p,
          driveLink: driveLink,
          scopes: updatedScopes,
          updatedAt: now
        }
        : p
    );
    const postDispatchMsg = `1 reminder email dispatched to ${resolvedRecipients.length} contractors via BCC`;
    persistProjectsAndSync(updatedProjects, postDispatchMsg);
    showToast(postDispatchMsg);
    return { success: true, message: postDispatchMsg };
  };

  const handleSaveContact = async (contact: Contact) => {
    const exists = contacts.some((c) => c.id === contact.id);
    let updatedContacts: Contact[];
    if (exists) {
      updatedContacts = contacts.map((c) => (c.id === contact.id ? contact : c));
      showToast(`Updated contact "${contact.name}"`);
    } else {
      updatedContacts = [contact, ...contacts];
      showToast(`Added contact "${contact.name}" to directory`);
    }
    setContacts(updatedContacts);
    storageService.saveContacts(updatedContacts);
    await dbService.saveContact(contact);
  };

  const handleDeleteContact = (contactId: string) => {
    const target = contacts.find((c) => c.id === contactId);
    if (target) {
      setContactToDelete(target);
    }
  };

  const executeDeleteContact = async () => {
    if (!contactToDelete) return;
    const targetId = contactToDelete.id;
    const targetName = contactToDelete.name;
    const updated = contacts.filter((c) => c.id !== targetId);
    setContacts(updated);
    storageService.saveContacts(updated);
    showToast(`Contact "${targetName}" deleted from directory.`);
    setContactToDelete(null);
    await dbService.deleteContact(targetId);
  };

  const handleBulkDeleteContacts = async (contactIds: string[]) => {
    if (contactIds.length === 0) return;
    const updated = contacts.filter((c) => !contactIds.includes(c.id));
    setContacts(updated);
    storageService.saveContacts(updated);
    showToast(`Permanently deleted ${contactIds.length} contact${contactIds.length === 1 ? '' : 's'}.`);
    await dbService.deleteContacts(contactIds);
  };

  const handleBulkAddContacts = async (newContacts: Contact[]) => {
    if (newContacts.length === 0) return;
    const updated = [...contacts, ...newContacts];
    setContacts(updated);
    storageService.saveContacts(updated);
    showToast(`Successfully added ${newContacts.length} new contact${newContacts.length === 1 ? '' : 's'} to directory.`);
    await dbService.saveContacts(newContacts);
  };

  const handleBulkUpdateCategories = async (
    contactIds: string[],
    categoriesToApply: string[],
    mode: 'add' | 'replace'
  ) => {
    if (contactIds.length === 0 || categoriesToApply.length === 0) return;
    const updated = contacts.map((c) => {
      if (!contactIds.includes(c.id)) return c;
      const currentCats = getContactCategories(c);
      const newCats =
        mode === 'replace'
          ? Array.from(new Set(categoriesToApply))
          : Array.from(new Set([...currentCats, ...categoriesToApply]));
      return {
        ...c,
        category: newCats.join(', '),
        categories: newCats,
        trade_categories: newCats
      };
    });
    setContacts(updated);
    storageService.saveContacts(updated);
    showToast(`Updated categories for ${contactIds.length} contact${contactIds.length === 1 ? '' : 's'}.`);
    const modifiedContacts = updated.filter((c) => contactIds.includes(c.id));
    await dbService.saveContacts(modifiedContacts);
  };

  const handleSaveSheetsConfig = (newConfig: GoogleSheetsConfig) => {
    setSheetsConfig(newConfig);
    storageService.saveSheetsConfig(newConfig);
    showToast('Google Sheet configuration saved.');
  };

  const handleResetToDefault = () => {
    setIsResetConfirmOpen(true);
  };

  const executeResetToDefault = async () => {
    storageService.resetToDefault();
    try {
      const liveProjects = await dbService.fetchProjects();
      if (liveProjects && liveProjects.length > 0) {
        setProjects(liveProjects);
      }
    } catch {
      // Fallback
    }
    setActiveProjectId(null);
    showToast('Reset local view to default.');
    setIsResetConfirmOpen(false);
  };

  const handleDeleteDemoProjects = () => {
    setIsPurgeDemoConfirmOpen(true);
  };

  const executePurgeDemoProjects = async () => {
    try {
      setIsPurgingDemo(true);
      const res = await dbService.purgeExampleAndDemoData();
      const liveProjects = await dbService.fetchProjects();
      const cleanProjects = (liveProjects && liveProjects.length > 0 ? liveProjects : projects).filter(
        (p) =>
          !isExampleOrMockTerm(p.name) &&
          !isExampleOrMockTerm(p.id) &&
          !isExampleOrMockTerm(p.code)
      );
      setProjects(cleanProjects);
      if (activeProjectId && !cleanProjects.some((p) => p.id === activeProjectId)) {
        setActiveProjectId(cleanProjects[0]?.id || null);
      }
      showToast(
        `Cleanup Complete: Deleted ${res.deletedProjects} demo/example project(s) and ${res.deletedQuotes} quote(s) from Firestore.`
      );
    } catch (err: any) {
      console.warn('Error during purgeDemoProjects:', err);
      showToast(`Notice during cleanup: ${err?.message || 'Purge failed'}`);
    } finally {
      setIsPurgingDemo(false);
      setIsPurgeDemoConfirmOpen(false);
    }
  };

  const handleExportPhaseCsv = () => {
    const headers = [
      'Project',
      'Phase',
      'Scope Item',
      'Description',
      'Target Budget',
      'Contractor',
      'Company',
      'Category',
      'Quoted Figure',
      'Action Status',
      'PO Sent',
      'Awarded',
      'Notes Count'
    ];
    const rows: string[][] = [];
    currentPhaseScopes.forEach((s) => {
      if (s.trades.length === 0) {
        rows.push([
          `"${activeProject?.name || ''}"`,
          `"${s.phaseId}"`,
          `"${s.name}"`,
          `"${s.description.replace(/"/g, '""')}"`,
          `"${s.budgetAmount}"`,
          '""',
          '""',
          '""',
          '""',
          '"No Quotes"',
          '"No"',
          '"No"',
          '"0"'
        ]);
      } else {
        s.trades.forEach((t) => {
          rows.push([
            `"${activeProject?.name || ''}"`,
            `"${s.phaseId}"`,
            `"${s.name}"`,
            `"${s.description.replace(/"/g, '""')}"`,
            `"${s.budgetAmount}"`,
            `"${t.contractorName}"`,
            `"${t.companyName}"`,
            `"${t.category}"`,
            `"${t.quotedFigure}"`,
            `"${t.actionStatus}"`,
            `"${t.poSent ? 'Yes' : 'No'}"`,
            `"${t.isAwarded ? 'Yes' : 'No'}"`,
            `"${t.notes.length}"`
          ]);
        });
      }
    });
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Tender_Package_${activeProject?.code || 'PRJ'}_Phase_${activePhase}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (isAuthChecking) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-100 selection:bg-blue-600 selection:text-white">
        <div className="flex flex-col items-center gap-4 animate-in fade-in duration-300">
          <div className="w-14 h-14 rounded-2xl bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-blue-400">
            <Building2 className="w-7 h-7" />
          </div>
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-400">
            <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
            <span>Verifying Zenith Workspace session...</span>
          </div>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <LoginGate
        initialDeniedEmail={accessDeniedEmail}
        onLoginSuccess={(user) => {
          setCurrentUser(user);
          setAccessDeniedEmail(null);
          setActiveProjectId(null);
          storageService.saveActiveProjectId(null);
          setToastMessage(`Welcome back, ${user.name}`);
        }}
      />
    );
  }

  if (!activeProject) {
    return (
      <>
        <ProjectDashboard
          projects={projects}
          contacts={contacts}
          sheetsConfig={sheetsConfig}
          isSyncing={isSyncing}
          pendingScheduledCount={pendingScheduledCount}
          onSignOut={handleSignOut}
          onSelectProject={handleSelectProject}
          onOpenCreateProjectModal={() => {
            setProjectToEdit(null);
            setIsProjectModalOpen(true);
          }}
          onOpenEditProjectModal={(proj) => {
            setProjectToEdit(proj);
            setIsProjectModalOpen(true);
          }}
          onDuplicateProject={handleDuplicateProject}
          onDeleteProject={handleDeleteProject}
          onDeleteDemoProjects={handleDeleteDemoProjects}
          onOpenContactDirectory={() => setIsContactDirectoryOpen(true)}
          onOpenScheduledQueue={() => setIsScheduledQueueOpen(true)}
          onOpenSheetsSyncModal={() => setIsSheetsSyncOpen(true)}
          onTriggerInstantSync={handleLiveSheetsResync}
          onLiveSheetsResync={handleLiveSheetsResync}
          onExportProjectTemplate={handleExportProjectsTemplate}
          onImportProjectsCsv={handleImportProjectsFile}
          onExportApprovedPoPdf={(proj) => handleOpenExportPoModal(proj)}
        />
        {isExportPoModalOpen && exportPoTargetProject && (
          <ApprovedPoExportModal
            isOpen={isExportPoModalOpen}
            onClose={() => {
              setIsExportPoModalOpen(false);
              setExportPoTargetProject(null);
            }}
            project={exportPoTargetProject}
          />
        )}
        <ProjectModal
          isOpen={isProjectModalOpen}
          projectToEdit={projectToEdit}
          onClose={() => {
            setIsProjectModalOpen(false);
            setProjectToEdit(null);
          }}
          onSaveProject={handleSaveProject}
          onDeleteProject={handleDeleteProject}
        />
        <ContactDirectoryModal
          isOpen={isContactDirectoryOpen}
          contacts={contacts}
          onClose={() => setIsContactDirectoryOpen(false)}
          onSaveContact={handleSaveContact}
          onDeleteContact={handleDeleteContact}
          onBulkDeleteContacts={handleBulkDeleteContacts}
          onBulkUpdateCategories={handleBulkUpdateCategories}
          onBulkAddContacts={handleBulkAddContacts}
        />
        <SheetsSyncModal
          isOpen={isSheetsSyncOpen}
          config={sheetsConfig}
          syncLogs={syncLogs}
          isSyncing={isSyncing}
          projects={projects}
          onClose={() => setIsSheetsSyncOpen(false)}
          onSaveConfig={handleSaveSheetsConfig}
          onTriggerSync={handleTriggerSync}
        />
        <ConfirmModal
          isOpen={!!projectToDelete}
          title="Delete Project"
          description={`Are you sure you want to permanently delete "${projectToDelete?.name}"?`}
          details={projectToDelete ? (
            <div className="space-y-1.5 font-mono text-[11px]">
              <div className="flex justify-between"><span className="text-slate-500">Project Code:</span><span className="font-bold text-slate-800">{projectToDelete.code || 'N/A'}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Client:</span><span className="text-slate-800">{projectToDelete.client || 'N/A'}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Total Scopes:</span><span className="text-slate-800">{projectToDelete.scopes.length} scope items</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Total Quotes:</span><span className="text-slate-800">{projectToDelete.scopes.reduce((sum, s) => sum + s.trades.length, 0)} contractor quotes</span></div>
            </div>
          ) : null}
          confirmText="Delete Project"
          confirmVariant="danger"
          onConfirm={executeDeleteProject}
          onClose={() => setProjectToDelete(null)}
        />
        <ConfirmModal
          isOpen={!!contactToDelete}
          title="Delete Directory Contact"
          description={`Are you sure you want to permanently delete "${contactToDelete?.name}" (${contactToDelete?.company || 'Contractor'}) from the central directory?`}
          confirmText="Delete Contact"
          confirmVariant="danger"
          onConfirm={executeDeleteContact}
          onClose={() => setContactToDelete(null)}
        />
        <ConfirmModal
          isOpen={isPurgeDemoConfirmOpen}
          title="Delete Example/Demo Projects"
          description="Are you sure you want to permanently remove all default seed, template, test, and example project documents and their associated quotes from live Firestore? Real projects will not be affected."
          confirmText={isPurgingDemo ? "Cleaning up..." : "Delete Example Projects"}
          confirmVariant="danger"
          onConfirm={executePurgeDemoProjects}
          onClose={() => {
            if (!isPurgingDemo) setIsPurgeDemoConfirmOpen(false);
          }}
        />
        <ConfirmModal
          isOpen={isResetConfirmOpen}
          title="Reset Application Data"
          description="Reset all projects, scopes, quotes, and directory contacts back to initial specifications? Any custom projects and modifications will be restored to default seeds."
          confirmText="Reset Everything"
          confirmVariant="warning"
          onConfirm={executeResetToDefault}
          onClose={() => setIsResetConfirmOpen(false)}
        />
        <ImportValidationDrawer
          isOpen={isImportDrawerOpen}
          type={importType}
          rawRows={importRawRows}
          activeProject={activeProject}
          activePhase={activePhase}
          targetPhase={importTargetPhase}
          onClose={() => setIsImportDrawerOpen(false)}
          onFinalizeProjects={handleFinalizeProjectsImport}
          onFinalizeScopes={handleFinalizeScopesImport}
          onFinalizeQuotes={handleFinalizeQuotesImport}
        />
        <ScheduledEmailQueueDrawer
          isOpen={isScheduledQueueOpen}
          onClose={() => setIsScheduledQueueOpen(false)}
          scheduledJobs={scheduledJobsList}
          onCancelScheduledJob={handleCancelFromQueue}
          onDeleteScheduledJob={handleDeleteJobFromQueue}
          onSyncWithSheet={handleSyncQueueWithSheet}
          isSyncing={isSyncing}
        />
        <SessionTimeoutModal
          isOpen={isSessionWarningOpen}
          secondsRemaining={sessionSecondsRemaining}
          onExtend={handleExtendSession}
          onLogout={handleSignOut}
        />
        {toastMessage && (
          <div className="fixed bottom-5 right-5 z-50 bg-slate-900 text-white px-4 py-2.5 rounded-xl shadow-xl border border-slate-800 text-xs font-semibold flex items-center gap-2 animate-in slide-in-from-bottom-3 duration-200">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>{toastMessage}</span>
          </div>
        )}
      </>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans antialiased selection:bg-blue-600 selection:text-white">
      <Header
        project={activeProject}
        projects={projects}
        sheetsConfig={sheetsConfig}
        contactCount={contacts.length}
        isSyncing={isSyncing}
        onSignOut={handleSignOut}
        onNavigateHome={handleNavigateHome}
        onSelectProject={handleSelectProject}
        onOpenEditProjectModal={() => {
          setProjectToEdit(activeProject);
          setIsProjectModalOpen(true);
        }}
        onDeleteDemoProjects={handleDeleteDemoProjects}
        onOpenSyncModal={() => setIsSheetsSyncOpen(true)}
        onOpenContactDirectory={() => setIsContactDirectoryOpen(true)}
        onOpenAddScopeModal={() => {
          setScopeToEdit(null);
          setIsScopeModalOpen(true);
        }}
        onTriggerSync={handleLiveSheetsResync}
        onLiveSheetsResync={handleLiveSheetsResync}
        onExportScopeTemplate={handleExportScopePackagesTemplate}
        onImportScopesCsv={handleImportScopesFile}
        onExportBudgetTemplate={handleExportBudgetTemplate}
        onImportBudgetCsv={handleImportBudgetCsvFile}
        onOpenBudgetUploadModal={() => setIsBudgetUploadModalOpen(true)}
        onOpenScheduledQueue={() => setIsScheduledQueueOpen(true)}
        onExportApprovedPoPdf={() => handleOpenExportPoModal(activeProject)}
        pendingScheduledCount={pendingScheduledCount}
      />
      <PhaseNavigation
        activePhase={activePhase}
        scopes={currentProjectScopes}
        archivedPhaseIds={activeProject?.archivedPhaseIds}
        deletedPhaseIds={activeProject?.deletedPhaseIds}
        onSelectPhase={(phaseId) => {
          setActivePhase(phaseId);
          setSearchQuery('');
          setStatusFilter('ALL');
          setPoSentFilter('all');
          setCollapsedScopeIds(new Set());
          setIsArchivedCardsCollapsed(true);
        }}
        onDeletePhase={handleRequestDeletePhase}
        onToggleArchivePhase={handleToggleArchivePhase}
      />
      <FilterBar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        poSentFilter={poSentFilter}
        onPoSentFilterChange={setPoSentFilter}
        totalFilteredCount={deduplicatedScopes.length}
        totalPhaseScopeCount={currentPhaseScopes.length}
        onClearFilters={() => {
          setSearchQuery('');
          setStatusFilter('ALL');
          setPoSentFilter('all');
        }}
        isAllCollapsed={areAllScopesCollapsed}
        onToggleCollapseAll={handleToggleCollapseAllScopes}
      />
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="mb-6 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <span className={`px-2.5 py-1 text-xs font-extrabold text-white rounded-lg ${isCurrentPhaseArchived ? 'bg-amber-600' : 'bg-blue-600'}`}>
                {currentPhaseInfo.code}
              </span>
              <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">
                {currentPhaseInfo.name} Scope &amp; Tender Packages
              </h2>
              {isCurrentPhaseArchived && (
                <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 border border-amber-300">
                  <Archive className="w-3 h-3 text-amber-700" />
                  Archived / Completed
                </span>
              )}
            </div>
            <p className="text-xs text-slate-600 mt-1 max-w-2xl">
              {currentPhaseInfo.description}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-right">
              <span className="block text-[10px] uppercase font-bold text-slate-400">Phase Progress</span>
              <div className="flex items-center gap-2">
                <span className="text-base font-extrabold text-slate-900">{phaseProgress}%</span>
                <span className="text-[11px] text-slate-500">
                  ({phaseBudgetMetrics.poSentCount}/{phaseBudgetMetrics.totalScopesCount} POs)
                </span>
              </div>
            </div>
            <div className="px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-right">
              <span className="block text-[10px] uppercase font-bold text-slate-400">Allocated Budget</span>
              <span className="text-base font-extrabold text-slate-900 font-mono">
                {formatCurrency(phaseBudgetMetrics.totalBudget)}
              </span>
            </div>
            <div className="relative" ref={phaseActionsMenuRef}>
              <button
                type="button"
                id="phase-actions-menu-btn"
                onClick={() => setIsPhaseActionsMenuOpen(!isPhaseActionsMenuOpen)}
                className="p-2.5 text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl transition-colors cursor-pointer shadow-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                title="Phase Actions &amp; CSV Tools"
                aria-label="More phase actions"
                aria-expanded={isPhaseActionsMenuOpen}
              >
                <MoreVertical className="w-4 h-4" />
              </button>
              {isPhaseActionsMenuOpen && (
                <div className="absolute right-0 mt-2 w-72 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl py-1.5 z-40 animate-in fade-in zoom-in-95 duration-100 divide-y divide-slate-800">
                  <div className="py-1">
                    <div className="px-3.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono">
                      Phase Management ({currentPhaseInfo.code})
                    </div>
                    <button
                      type="button"
                      id="phase-menu-archive-btn"
                      onClick={() => {
                        setIsPhaseActionsMenuOpen(false);
                        handleToggleArchivePhase(activePhase);
                      }}
                      className="w-full text-left flex items-center gap-2.5 px-3.5 py-2.5 text-xs font-semibold text-slate-200 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                    >
                      <Archive className="w-4 h-4 text-amber-400 shrink-0" />
                      <span>
                        {isCurrentPhaseArchived
                          ? 'Mark Phase as Active (Unarchive)'
                          : 'Archive / Mark as Completed'}
                      </span>
                    </button>
                    <button
                      type="button"
                      id="phase-menu-delete-btn"
                      onClick={() => {
                        setIsPhaseActionsMenuOpen(false);
                        handleRequestDeletePhase(activePhase);
                      }}
                      className="w-full text-left flex items-center gap-2.5 px-3.5 py-2.5 text-xs font-semibold text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4 text-rose-400 shrink-0" />
                      <span>Delete Phase</span>
                    </button>
                  </div>
                  <div className="py-1">
                    <button
                      type="button"
                      id="phase-menu-export-quote-template-btn"
                      onClick={() => {
                        setIsPhaseActionsMenuOpen(false);
                        handleExportPhaseQuoteTemplate();
                      }}
                      className="w-full text-left flex items-center gap-2.5 px-3.5 py-2.5 text-xs font-semibold text-slate-200 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                    >
                      <Download className="w-4 h-4 text-blue-400 shrink-0" />
                      <span>Export Phase Quote Template (.CSV)</span>
                    </button>
                    <button
                      type="button"
                      id="phase-menu-import-quotes-btn"
                      onClick={() => {
                        setIsPhaseActionsMenuOpen(false);
                        phaseFileInputRef.current?.click();
                      }}
                      className="w-full text-left flex items-center gap-2.5 px-3.5 py-2.5 text-xs font-semibold text-emerald-300 hover:text-emerald-200 hover:bg-slate-800 transition-colors cursor-pointer"
                    >
                      <Upload className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>Import Phase Quotes (.CSV)</span>
                    </button>
                  </div>
                  <div className="py-1">
                    <button
                      type="button"
                      id="phase-menu-export-summary-csv-btn"
                      onClick={() => {
                        setIsPhaseActionsMenuOpen(false);
                        handleExportPhaseCsv();
                      }}
                      className="w-full text-left flex items-center gap-2.5 px-3.5 py-2.5 text-xs font-semibold text-slate-200 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                    >
                      <BarChart3 className="w-4 h-4 text-amber-400 shrink-0" />
                      <span>Export Current Phase Summary (.CSV)</span>
                    </button>
                  </div>
                </div>
              )}
              <input
                ref={phaseFileInputRef}
                id="phase-import-quotes-input"
                type="file"
                accept=".csv,text/csv,text/plain"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    handleImportQuotesFile(file);
                    e.target.value = '';
                  }
                }}
              />
            </div>
          </div>
        </div>

        {isCurrentPhaseArchived && (
          <div className="mb-6 bg-amber-500/10 border border-amber-500/30 rounded-2xl p-5 shadow-xs animate-in fade-in duration-200">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-600 shrink-0">
                  <Archive className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-extrabold text-slate-900">
                      {currentPhaseInfo.name} is Archived &amp; Marked as Completed
                    </h3>
                    <span className="px-2 py-0.5 text-[10px] font-bold bg-amber-200 text-amber-900 rounded-md border border-amber-300 font-mono">
                      COMPLETED
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 mt-1 max-w-2xl leading-relaxed">
                    Active tender dispatcher cards are collapsed to de-clutter your active workspace. Final committed totals ({formatCurrency(phaseBudgetMetrics.totalBudget)}) and awarded purchase orders remain preserved in master project budget metrics.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  id="toggle-archived-cards-btn"
                  onClick={() => setIsArchivedCardsCollapsed(!isArchivedCardsCollapsed)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl border border-amber-300 bg-white text-slate-800 hover:bg-amber-50 transition-colors cursor-pointer shadow-xs"
                >
                  {isArchivedCardsCollapsed ? (
                    <>
                      <Eye className="w-3.5 h-3.5 text-amber-600" />
                      <span>Expand Tender Dispatcher Cards ({filteredScopes.length})</span>
                    </>
                  ) : (
                    <>
                      <EyeOff className="w-3.5 h-3.5 text-amber-600" />
                      <span>Collapse Tender Dispatcher Cards</span>
                    </>
                  )}
                </button>
                <button
                  type="button"
                  id="unarchive-phase-btn"
                  onClick={() => handleToggleArchivePhase(activePhase)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl bg-slate-800 text-slate-200 hover:bg-slate-700 hover:text-white transition-colors cursor-pointer shadow-xs"
                >
                  <span>Mark as Active</span>
                </button>
              </div>
            </div>
            <div className="mt-4 pt-3.5 border-t border-amber-200/60 grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-white/80 p-2.5 rounded-xl border border-amber-200/60">
                <span className="text-[10px] font-bold uppercase text-slate-500 tracking-wider block">Target Budget</span>
                <span className="text-sm font-extrabold text-slate-900 font-mono block mt-0.5">{formatCurrency(phaseBudgetMetrics.totalBudget)}</span>
              </div>
              <div className="bg-white/80 p-2.5 rounded-xl border border-amber-200/60">
                <span className="text-[10px] font-bold uppercase text-slate-500 tracking-wider block">Committed / Quoted</span>
                <span className="text-sm font-extrabold text-slate-900 font-mono block mt-0.5">{formatCurrency(phaseBudgetMetrics.totalQuotedCommitted)}</span>
              </div>
              <div className="bg-white/80 p-2.5 rounded-xl border border-amber-200/60">
                <span className="text-[10px] font-bold uppercase text-slate-500 tracking-wider block">Awarded POs</span>
                <span className="text-sm font-extrabold text-emerald-700 font-mono block mt-0.5">{phaseBudgetMetrics.poApprovedCount} of {phaseBudgetMetrics.totalScopesCount} scopes</span>
              </div>
              <div className="bg-white/80 p-2.5 rounded-xl border border-amber-200/60">
                <span className="text-[10px] font-bold uppercase text-slate-500 tracking-wider block">Procurement Status</span>
                <span className="text-sm font-extrabold text-amber-700 block mt-0.5">Completed (Historical)</span>
              </div>
            </div>
          </div>
        )}

        {isCurrentPhaseArchived && isArchivedCardsCollapsed ? (
          <div className="bg-white rounded-2xl border border-dashed border-amber-300 p-8 text-center shadow-xs">
            <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center mx-auto mb-2.5">
              <Archive className="w-5 h-5" />
            </div>
            <h4 className="text-sm font-bold text-slate-900">
              Active Tender Dispatcher Cards Collapsed
            </h4>
            <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
              {currentPhaseInfo.name} is archived and completed. Active procurement tender cards are collapsed to keep your workspace decluttered.
            </p>
            <div className="mt-4 flex items-center justify-center gap-3">
              <button
                type="button"
                id="expand-collapsed-archived-cards-btn"
                onClick={() => setIsArchivedCardsCollapsed(false)}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold bg-amber-600 hover:bg-amber-500 text-white rounded-xl shadow-xs transition-colors cursor-pointer"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Expand All {deduplicatedScopes.length} Tender Cards</span>
              </button>
              <button
                type="button"
                onClick={() => handleToggleArchivePhase(activePhase)}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-colors cursor-pointer"
              >
                <span>Mark Phase as Active</span>
              </button>
            </div>
          </div>
        ) : currentProjectScopes.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-xs">
            <Layers className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-base font-bold text-slate-800">No scopes found for this project.</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
              This project does not have any scope line items yet.
            </p>
            <div className="mt-4 flex items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setScopeToEdit(null);
                  setIsScopeModalOpen(true);
                }}
                className="px-4 py-2 text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white rounded-lg cursor-pointer shadow-2xs"
              >
                + Add Scope Item to {currentPhaseInfo.name}
              </button>
            </div>
          </div>
        ) : deduplicatedScopes.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-xs">
            <Layers className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-base font-bold text-slate-800">No scope line items found</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
              No scope items matched your active search query or status filter ({statusFilter}) in {currentPhaseInfo.name}.
            </p>
            <div className="mt-4 flex items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setStatusFilter('ALL');
                  setPoSentFilter('all');
                }}
                className="px-4 py-2 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg cursor-pointer"
              >
                Reset Filters
              </button>
              <button
                type="button"
                onClick={() => {
                  setScopeToEdit(null);
                  setIsScopeModalOpen(true);
                }}
                className="px-4 py-2 text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white rounded-lg cursor-pointer"
              >
                + Add Scope Item to {currentPhaseInfo.name}
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {misassignedCount > 0 && selectedQuoteIds.length === 0 && (
              <div
                id="misassigned-detected-banner"
                className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-amber-900 shadow-2xs animate-in fade-in duration-150"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-amber-100 border border-amber-300 flex items-center justify-center text-amber-700 shrink-0">
                    <AlertTriangle className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-bold">Detected {misassignedCount} Misassigned Quote{misassignedCount === 1 ? '' : 's'}</span>
                    <p className="text-[11px] text-amber-700">
                      Quotes whose cost codes do not match their parent scope section's cost code.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  id="select-misassigned-banner-btn"
                  onClick={handleSelectAllMisassigned}
                  className="px-3 py-1.5 font-bold text-xs bg-amber-600 hover:bg-amber-500 text-white rounded-lg transition-colors cursor-pointer shrink-0 flex items-center gap-1.5 shadow-2xs"
                >
                  <CheckSquare className="w-3.5 h-3.5" />
                  <span>Select All Misassigned Quotes</span>
                </button>
              </div>
            )}
            {deduplicatedScopes.map((scope) => (
              <ScopeItemCard
                key={scope.id}
                scope={scope}
                contacts={contacts}
                projectName={activeProject?.name}
                selectedQuoteIds={selectedQuoteIds}
                onToggleSelectQuote={handleToggleSelectQuote}
                onSelectMultipleQuotes={handleSelectMultipleQuotes}
                statusFilter={statusFilter}
                searchQuery={searchQuery}
                poSentFilter={poSentFilter}
                isExpanded={!collapsedScopeIds.has(scope.id)}
                onToggleExpand={() => handleToggleScopeExpand(scope.id)}
                onUpdateScope={handleUpdateScope}
                onDeleteScope={handleDeleteScope}
                onEditScope={(s) => {
                  setScopeToEdit(s);
                  setIsScopeModalOpen(true);
                }}
                onAddTradeToScope={(s) => {
                  setActiveScopeForTrade(s);
                  setIsTradeModalOpen(true);
                }}
                onOpenNotes={(trade) => {
                  setActiveTradeForNotes(trade);
                }}
                onOpenDocViewer={(trade) => {
                  setActiveTradeForDocs(trade);
                }}
                onOpenQuoteBreakdown={(trade, scope) => {
                  handleOpenQuoteBreakdown(trade, scope);
                }}
                onOpenTenderInvite={(scope) => {
                  setActiveScopeForInvite(scope);
                }}
                onOpenTenderReminder={(scope) => {
                  setActiveScopeForReminder(scope);
                }}
                onOpenRevisedEstimate={(scope) => {
                  setActiveScopeForRevisedEstimate(scope);
                }}
                onCancelScheduledEmail={handleCancelScheduledEmail}
              />
            ))}
          </div>
        )}

        <div className="mt-8 pt-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-3">
          <div className="flex items-center gap-2">
            <span>Zenith Tender Management — 5-Phase Procurement Engine</span>
            <span>•</span>
            <button
              type="button"
              onClick={handleResetToDefault}
              className="text-slate-400 hover:text-slate-700 underline inline-flex items-center gap-1 cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              Reset All to Default Seed
            </button>
          </div>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1 text-slate-500 font-medium">
              <CheckCircle2 className="w-3.5 h-3.5 text-slate-400" />
              Manual Sheets Sync Only (Auto-Sync Disabled)
            </span>
          </div>
        </div>
      </main>

      {/* Modals & Drawers */}
      <ProjectModal
        isOpen={isProjectModalOpen}
        projectToEdit={projectToEdit}
        onClose={() => {
          setIsProjectModalOpen(false);
          setProjectToEdit(null);
        }}
        onSaveProject={handleSaveProject}
        onDeleteProject={handleDeleteProject}
      />
      <ContactDirectoryModal
        isOpen={isContactDirectoryOpen}
        contacts={contacts}
        onClose={() => setIsContactDirectoryOpen(false)}
        onSaveContact={handleSaveContact}
        onDeleteContact={handleDeleteContact}
        onBulkDeleteContacts={handleBulkDeleteContacts}
        onBulkUpdateCategories={handleBulkUpdateCategories}
        onBulkAddContacts={handleBulkAddContacts}
      />
      <ScopeModal
        isOpen={isScopeModalOpen}
        activePhase={activePhase}
        scopeToEdit={scopeToEdit}
        onClose={() => {
          setIsScopeModalOpen(false);
          setScopeToEdit(null);
        }}
        onSaveScope={handleSaveScope}
      />
      <TradeModal
        isOpen={isTradeModalOpen}
        scope={activeScopeForTrade}
        contacts={contacts}
        projectName={activeProject?.name}
        projectId={activeProject?.id}
        onClose={() => {
          setIsTradeModalOpen(false);
          setActiveScopeForTrade(null);
        }}
        onSaveTrade={handleSaveTrade}
      />
      <SheetsSyncModal
        isOpen={isSheetsSyncOpen}
        config={sheetsConfig}
        syncLogs={syncLogs}
        isSyncing={isSyncing}
        projects={projects}
        onClose={() => setIsSheetsSyncOpen(false)}
        onSaveConfig={handleSaveSheetsConfig}
        onTriggerSync={handleTriggerSync}
      />
      <NotesDrawer
        isOpen={!!activeTradeForNotes}
        trade={activeTradeForNotes}
        scopeName={
          activeTradeForNotes
            ? currentProjectScopes.find((s) => s.id === activeTradeForNotes.scopeId)?.name
            : undefined
        }
        onClose={() => setActiveTradeForNotes(null)}
        onSaveNotes={handleSaveNotes}
      />
      <DocViewerModal
        isOpen={!!activeTradeForDocs}
        trade={activeTradeForDocs}
        scopeName={
          activeTradeForDocs
            ? currentProjectScopes.find((s) => s.id === activeTradeForDocs.scopeId)?.name
            : undefined
        }
        onClose={() => setActiveTradeForDocs(null)}
        onSaveDocs={handleSaveDocs}
      />
      <QuoteBreakdownModal
        isOpen={!!activeTradeForBreakdown && !!activeScopeForBreakdown}
        trade={activeTradeForBreakdown}
        scope={activeScopeForBreakdown}
        projectName={activeProject?.name}
        projectCode={activeProject?.code}
        onClose={() => {
          setActiveTradeForBreakdown(null);
          setActiveScopeForBreakdown(null);
        }}
        onSaveTrade={handleSaveTradeFromBreakdown}
      />
      <TenderInviteModal
        isOpen={!!activeScopeForInvite}
        scope={activeScopeForInvite}
        project={activeProject}
        contacts={contacts}
        onClose={() => setActiveScopeForInvite(null)}
        onOpenSettings={() => setIsSheetsSyncOpen(true)}
        onSendInvitations={handleSendTenderInvitations}
        onCancelScheduledLaunch={(scopeId) => handleCancelScheduledEmail(scopeId, 'invitation')}
      />
      <TenderReminderModal
        isOpen={!!activeScopeForReminder}
        scope={activeScopeForReminder}
        project={activeProject}
        contacts={contacts}
        onClose={() => setActiveScopeForReminder(null)}
        onOpenSettings={() => setIsSheetsSyncOpen(true)}
        onSendReminders={handleSendTenderReminders}
        onCancelScheduledReminder={(scopeId) => handleCancelScheduledEmail(scopeId, 'reminder')}
      />
      <TenderRevisedEstimateModal
        isOpen={!!activeScopeForRevisedEstimate}
        scope={activeScopeForRevisedEstimate}
        project={activeProject}
        contacts={contacts}
        onClose={() => setActiveScopeForRevisedEstimate(null)}
        onOpenSettings={() => setIsSheetsSyncOpen(true)}
        onSendReminders={handleSendTenderReminders}
        onCancelScheduledReminder={(scopeId) => handleCancelScheduledEmail(scopeId, 'reminder')}
      />
      <ConfirmModal
        isOpen={!!projectToDelete}
        title="Delete Project"
        description={`Are you sure you want to permanently delete "${projectToDelete?.name}"?`}
        details={projectToDelete ? (
          <div className="space-y-1.5 font-mono text-[11px]">
            <div className="flex justify-between"><span className="text-slate-500">Project Code:</span><span className="font-bold text-slate-800">{projectToDelete.code || 'N/A'}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Client:</span><span className="text-slate-800">{projectToDelete.client || 'N/A'}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Total Scopes:</span><span className="text-slate-800">{projectToDelete.scopes.length} scope items</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Total Quotes:</span><span className="text-slate-800">{projectToDelete.scopes.reduce((sum, s) => sum + s.trades.length, 0)} contractor quotes</span></div>
          </div>
        ) : null}
        confirmText="Delete Project"
        confirmVariant="danger"
        onConfirm={executeDeleteProject}
        onClose={() => setProjectToDelete(null)}
      />
      <ConfirmModal
        isOpen={!!scopeToDelete}
        title="Remove Scope Item"
        description={`Are you sure you want to remove scope "${scopeToDelete?.name}" from Phase ${scopeToDelete?.phaseId}?`}
        details={scopeToDelete ? (
          <div className="space-y-1.5 font-mono text-[11px]">
            <div className="flex justify-between"><span className="text-slate-500">Scope Name:</span><span className="font-bold text-slate-800">{scopeToDelete.name}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Phase:</span><span className="text-slate-800">Phase {scopeToDelete.phaseId}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Target Budget:</span><span className="text-slate-800">{formatCurrency(scopeToDelete.budgetAmount)}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Attached Quotes:</span><span className="text-slate-800">{scopeToDelete.trades.length} trade quotes</span></div>
          </div>
        ) : null}
        confirmText="Remove Scope"
        confirmVariant="danger"
        onConfirm={executeDeleteScope}
        onClose={() => setScopeToDelete(null)}
      />
      <ConfirmModal
        isOpen={!!phaseToDelete}
        title={`Delete ${phaseToDelete?.name}`}
        description={`Are you sure you want to delete ${phaseToDelete?.name}? This will permanently remove all unassigned scope packages within this phase.`}
        details={phaseToDelete ? (
          <div className="space-y-1.5 font-mono text-[11px]">
            <div className="flex justify-between">
              <span className="text-slate-500">Phase Code:</span>
              <span className="font-bold text-slate-800">{phaseToDelete.code}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Scope Packages to Remove:</span>
              <span className="font-bold text-rose-600">{phaseToDelete.scopeCount} scope package(s)</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Allocated Budget:</span>
              <span className="font-bold text-slate-800">{formatCurrency(phaseToDelete.budget)}</span>
            </div>
            <div className="pt-2 border-t border-slate-200 text-[11px] font-sans text-slate-500">
              Upon confirmation, this phase tab will be removed from your workspace and its corresponding rows will be deleted from the Google Sheet backend.
            </div>
          </div>
        ) : null}
        confirmText="Delete Phase"
        confirmVariant="danger"
        onConfirm={handleConfirmDeletePhase}
        onClose={() => setPhaseToDelete(null)}
      />
      <ConfirmModal
        isOpen={!!contactToDelete}
        title="Delete Directory Contact"
        description={`Are you sure you want to permanently delete "${contactToDelete?.name}" (${contactToDelete?.company || 'Contractor'}) from the central directory?`}
        confirmText="Delete Contact"
        confirmVariant="danger"
        onConfirm={executeDeleteContact}
        onClose={() => setContactToDelete(null)}
      />
      <ConfirmModal
        isOpen={isPurgeDemoConfirmOpen}
        title="Delete Example/Demo Projects"
        description="Are you sure you want to permanently remove all default seed, template, test, and example project documents and their associated quotes from live Firestore? Real projects will not be affected."
        confirmText={isPurgingDemo ? "Cleaning up..." : "Delete Example Projects"}
        confirmVariant="danger"
        onConfirm={executePurgeDemoProjects}
        onClose={() => {
          if (!isPurgingDemo) setIsPurgeDemoConfirmOpen(false);
        }}
      />
      <ConfirmModal
        isOpen={isResetConfirmOpen}
        title="Reset Application Data"
        description="Reset all projects, scopes, quotes, and directory contacts back to initial specifications? Any custom projects and modifications will be restored to default seeds."
        confirmText="Reset Everything"
        confirmVariant="warning"
        onConfirm={executeResetToDefault}
        onClose={() => setIsResetConfirmOpen(false)}
      />
      <ImportValidationDrawer
        isOpen={isImportDrawerOpen}
        type={importType}
        rawRows={importRawRows}
        activeProject={activeProject}
        activePhase={activePhase}
        targetPhase={importTargetPhase}
        onClose={() => setIsImportDrawerOpen(false)}
        onFinalizeProjects={handleFinalizeProjectsImport}
        onFinalizeScopes={handleFinalizeScopesImport}
        onFinalizeQuotes={handleFinalizeQuotesImport}
      />
      <AutoBudgetMappingDrawer
        isOpen={isBudgetMappingDrawerOpen}
        mapping={budgetMappingResult}
        onClose={() => {
          setIsBudgetMappingDrawerOpen(false);
          setBudgetMappingResult(null);
        }}
        onConfirm={handleConfirmBudgetMapping}
        isApplying={isApplyingBudgets}
      />
      <BudgetUploadModal
        isOpen={isBudgetUploadModalOpen}
        activeProject={activeProject}
        onClose={() => setIsBudgetUploadModalOpen(false)}
        onExtractionComplete={(result) => {
          setBudgetExtractionResult(result);
          setIsBudgetReviewDrawerOpen(true);
        }}
      />
      <ImportedBudgetReviewDrawer
        isOpen={isBudgetReviewDrawerOpen}
        extraction={budgetExtractionResult}
        activeProject={activeProject}
        onClose={() => {
          setIsBudgetReviewDrawerOpen(false);
          setBudgetExtractionResult(null);
        }}
        onConfirm={handleConfirmBudgetReview}
        isApplying={isApplyingBudgets}
      />
      <ScheduledEmailQueueDrawer
        isOpen={isScheduledQueueOpen}
        onClose={() => setIsScheduledQueueOpen(false)}
        scheduledJobs={scheduledJobsList}
        onCancelScheduledJob={handleCancelFromQueue}
        onDeleteScheduledJob={handleDeleteJobFromQueue}
        onSyncWithSheet={handleSyncQueueWithSheet}
        isSyncing={isSyncing}
      />
      <SessionTimeoutModal
        isOpen={isSessionWarningOpen}
        secondsRemaining={sessionSecondsRemaining}
        onExtend={handleExtendSession}
        onLogout={handleSignOut}
      />

      {/* Bulk Delete Floating Action Bar */}
      {selectedQuoteIds.length > 0 && (
        <div
          id="bulk-delete-action-bar"
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-[95%] max-w-3xl bg-slate-900/95 backdrop-blur-md text-white rounded-2xl border border-slate-700 shadow-2xl px-5 py-3.5 flex flex-col sm:flex-row items-center justify-between gap-3 animate-in fade-in slide-in-from-bottom-5 duration-200"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-blue-400 shrink-0">
              <CheckSquare className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-sm text-white tracking-tight">
                  {selectedQuoteCount} {selectedQuoteCount === 1 ? 'Quote' : 'Quotes'} Selected
                </span>
                <span className="text-[10px] font-bold bg-slate-800 text-slate-300 border border-slate-700 px-2 py-0.5 rounded-full">
                  Batch Action
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Manage selection across trade scopes in {activeProject?.name || 'project'}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto justify-end">
            <button
              type="button"
              id="bulk-bar-select-misassigned-btn"
              onClick={handleSelectAllMisassigned}
              className="px-3 py-1.5 text-xs font-semibold text-amber-300 bg-amber-950/60 hover:bg-amber-900/80 border border-amber-500/40 rounded-xl transition-colors cursor-pointer flex items-center gap-1.5 shadow-2xs"
              title="Select all quotes whose cost code does not match their parent scope section"
            >
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
              <span>Select All Misassigned Quotes</span>
            </button>
            <button
              type="button"
              id="bulk-bar-clear-selection-btn"
              onClick={handleClearSelection}
              className="px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl transition-colors cursor-pointer flex items-center gap-1"
            >
              <X className="w-3.5 h-3.5" />
              <span>Clear Selection</span>
            </button>
            <button
              type="button"
              id="bulk-bar-delete-selected-btn"
              onClick={() => setIsBulkDeleteModalOpen(true)}
              className="px-4 py-1.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 active:bg-rose-700 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shadow-md shadow-rose-900/30 active:scale-95"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete Selected ({selectedQuoteCount})</span>
            </button>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={isBulkDeleteModalOpen}
        title="Permanently Delete Selected Quotes?"
        description={`Permanently delete ${selectedQuoteCount} selected quote${selectedQuoteCount === 1 ? '' : 's'}? This action cannot be undone.`}
        confirmText={isBulkDeleting ? 'Deleting...' : `Delete Selected (${selectedQuoteCount})`}
        cancelText="Cancel"
        confirmVariant="danger"
        onConfirm={handleExecuteBulkDelete}
        onClose={() => !isBulkDeleting && setIsBulkDeleteModalOpen(false)}
      />

      {isExportPoModalOpen && exportPoTargetProject && (
        <ApprovedPoExportModal
          isOpen={isExportPoModalOpen}
          onClose={() => {
            setIsExportPoModalOpen(false);
            setExportPoTargetProject(null);
          }}
          project={exportPoTargetProject}
        />
      )}

      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 bg-slate-900 text-white px-4 py-2.5 rounded-xl shadow-xl border border-slate-800 text-xs font-semibold flex items-center gap-2 animate-in slide-in-from-bottom-3 duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}