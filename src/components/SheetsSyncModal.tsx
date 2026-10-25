import React, { useState, useMemo } from 'react';
import { 
  X, 
  FileSpreadsheet, 
  RefreshCw, 
  CheckCircle2, 
  Clock, 
  Download, 
  Sparkles,
  Layers,
  UploadCloud,
  FileText,
  Building,
  DollarSign,
  Paperclip,
  Check,
  Filter,
  Info,
  Mail,
  Send,
  ExternalLink,
  Copy,
  AlertTriangle,
  Settings,
  HelpCircle
} from 'lucide-react';
import { GoogleSheetsConfig, SyncLogEntry, Project } from '../types';
import { sheetsSyncService, CompiledSheetRow } from '../services/sheetsSyncService';
import { storageService, DEFAULT_APPS_SCRIPT_WEBHOOK_URL } from '../services/storageService';
import { appsScriptService } from '../services/appsScriptService';
import { MASTER_COST_CODE_MAP, MASTER_TRADE_SCOPE_MAP, resolveCostCode, resolveCostCodeAndScope } from '../data/costCodeMap';

interface SheetsSyncModalProps {
  isOpen: boolean;
  config: GoogleSheetsConfig;
  syncLogs: SyncLogEntry[];
  isSyncing: boolean;
  projects?: Project[];
  defaultTab?: 'url_sync' | 'apps_script' | 'direct_paste' | 'history' | 'form_webhook';
  onClose: () => void;
  onSaveConfig: (updated: GoogleSheetsConfig) => void;
  onTriggerSync: (manualCsvText?: string) => void;
}

export const SheetsSyncModal: React.FC<SheetsSyncModalProps> = ({
  isOpen,
  config,
  syncLogs,
  isSyncing,
  projects = [],
  defaultTab = 'url_sync',
  onClose,
  onSaveConfig,
  onTriggerSync,
}) => {
  const [activeTab, setActiveTab] = useState<'url_sync' | 'apps_script' | 'direct_paste' | 'history' | 'form_webhook'>(defaultTab);
  const [sheetUrl, setSheetUrl] = useState(config.sheetUrl);
  const [sheetName, setSheetName] = useState(config.sheetName);
  const [appsScriptUrl, setAppsScriptUrl] = useState(config.appsScriptUrl || storageService.getAppsScriptUrl() || DEFAULT_APPS_SCRIPT_WEBHOOK_URL);
  const [isTestingEndpoint, setIsTestingEndpoint] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [copiedScript, setCopiedScript] = useState(false);
  const [endpointSaveStatus, setEndpointSaveStatus] = useState<string | null>(null);

  // Form Webhook State & Ingestion Tester
  const [testCompany, setTestCompany] = useState('Apex Foundation Contractors');
  const [testEmail, setTestEmail] = useState('bids@apexfoundation.ca');
  const [testProject, setTestProject] = useState(projects[0]?.name || '1198 Falcon');
  const [testTenderItem, setTestTenderItem] = useState('total for foundation and footing walls (cribbing, rebar, ladder packages, window buckouts, labor) - excl. gst');
  const [testAmount, setTestAmount] = useState('68500');
  const [testNotes, setTestNotes] = useState('Complete cribbing package, 32MPa concrete and engineering inspections included');
  const [testDocUrl, setTestDocUrl] = useState('https://drive.google.com/file/d/sample-apex-quote.pdf');
  const [isSubmittingWebhook, setIsSubmittingWebhook] = useState(false);
  const [webhookTestResult, setWebhookTestResult] = useState<{ success: boolean; data?: any; error?: string } | null>(null);
  const [costCodeSearch, setCostCodeSearch] = useState('');
  const [copiedWebhookUrl, setCopiedWebhookUrl] = useState(false);
  const [copiedFormScript, setCopiedFormScript] = useState(false);

  const webhookEndpointUrl = typeof window !== 'undefined' ? `${window.location.origin}/api/webhooks/form-submit` : '/api/webhooks/form-submit';

  // Direct paste & file upload state
  const [pastedText, setPastedText] = useState('');
  const [pasteError, setPasteError] = useState<string | null>(null);

  // Live parsed preview of pasted text
  const parsedRows: CompiledSheetRow[] = useMemo(() => {
    if (!pastedText.trim()) return [];
    try {
      return sheetsSyncService.parseCompiledSheet(pastedText);
    } catch (e) {
      return [];
    }
  }, [pastedText]);

  // Summary statistics of parsed rows
  const parsedSummary = useMemo(() => {
    if (parsedRows.length === 0) return null;
    const uniqueProjects = new Set(parsedRows.map((r) => r.project.trim()).filter(Boolean));
    const uniqueCompanies = new Set(parsedRows.map((r) => r.companyName.trim()).filter(Boolean));
    const totalAmount = parsedRows.reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
    const docsCount = parsedRows.filter((r) => Boolean(r.formalQuoteDoc)).length;

    return {
      projectsCount: uniqueProjects.size,
      companiesCount: uniqueCompanies.size,
      totalAmount,
      docsCount,
      rowsCount: parsedRows.length
    };
  }, [parsedRows]);

  if (!isOpen) return null;

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanUrl = appsScriptUrl.trim();
    storageService.saveAppsScriptUrl(cleanUrl);
    onSaveConfig({
      ...config,
      sheetUrl: sheetUrl.trim(),
      sheetName: sheetName.trim() || 'Central Multi-Project Tender Pricing Feed',
      autoSyncIntervalMinutes: 0,
      autoSyncEnabled: false,
      appsScriptUrl: cleanUrl
    });
    setEndpointSaveStatus('Configuration saved successfully.');
    setTimeout(() => setEndpointSaveStatus(null), 3000);
  };

  const handleSaveAppsScriptUrlOnly = () => {
    const cleanUrl = appsScriptUrl.trim();
    storageService.saveAppsScriptUrl(cleanUrl);
    onSaveConfig({
      ...config,
      appsScriptUrl: cleanUrl
    });
    setEndpointSaveStatus('Google Apps Script Endpoint URL saved successfully.');
    setTimeout(() => setEndpointSaveStatus(null), 3000);
  };

  const handleTestEndpoint = async () => {
    if (!appsScriptUrl.trim()) {
      setTestResult({
        success: false,
        message: 'Please enter a Google Apps Script Web App URL first.'
      });
      return;
    }
    setIsTestingEndpoint(true);
    setTestResult(null);
    const result = await appsScriptService.testConnection(appsScriptUrl.trim());
    setTestResult(result);
    setIsTestingEndpoint(false);
  };

  const copyScriptTemplate = () => {
    const code = `/**
 * The Zenith Group Tender Tracker - Master Tender Sync & Dispatcher
 * Web App Endpoint for Direct Estimate Requests, Reminders & Tender Data Ingestion
 */
function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);

    // 1. Master Tender Sync Row Ingestion
    if (data.rows && Array.isArray(data.rows)) {
      var processed = data.rows.map(function(row) {
        // Explicit Column Index Assignments (0-based indexing)
        var companyName = String(row[0] || "").trim(); // Column A
        var projectName = String(row[1] || "").trim(); // Column B
        var tenderItem = String(row[2] || "").trim();  // Column C
        
        // Ensure row[4] (Column E) is parsed as the dollar figure, NOT row[3] (Cost Code)
        var costCode = String(row[3] || "").trim();    // Column D (e.g., "20330", "20530")
        var rawAmountString = String(row[4] || "0").replace(/[^0-9.-]+/g, ""); // Column E
        var quotedAmount = parseFloat(rawAmountString) || 0;
        
        var notes = String(row[5] || "").trim();       // Column F
        var quoteLink = String(row[6] || "").trim();   // Column G
        var synced = String(row[7] || "").trim();      // Column H

        return {
          companyName: companyName,
          projectName: projectName,
          tenderItem: tenderItem,
          costCode: costCode,
          quotedAmount: quotedAmount,
          notes: notes,
          quoteLink: quoteLink,
          synced: synced
        };
      });

      return ContentService.createTextOutput(JSON.stringify({
        status: "success",
        processedCount: processed.length,
        rows: processed
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // 2. Gmail Dispatch (Invitations and Reminders)
    if (data.to) {
      GmailApp.sendEmail(data.to, data.subject, "", {
        htmlBody: data.htmlBody,
        cc: data.cc || "",
        bcc: data.bcc || "",
        name: "The Zenith Group Estimating"
      });
      return ContentService.createTextOutput(JSON.stringify({ status: "success" }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    return ContentService.createTextOutput(JSON.stringify({ status: "success", message: "Acknowledged" }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ status: "error", message: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}`;
    navigator.clipboard.writeText(code);
    setCopiedScript(true);
    setTimeout(() => setCopiedScript(false), 2500);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (text) {
        setPastedText(text);
        setActiveTab('direct_paste');
      }
    };
    reader.readAsText(file);
  };

  const handleApplyDirectSync = () => {
    if (parsedRows.length === 0) {
      setPasteError('Please provide valid spreadsheet data with Company, Project, Item Description, and Amount.');
      return;
    }
    setPasteError(null);
    onTriggerSync(pastedText);
    onClose();
  };

  const handleLoadSampleData = () => {
    const sample = sheetsSyncService.getSampleCompiledCsv();
    setPastedText(sample);
    setPasteError(null);
  };

  const downloadSampleCsv = () => {
    const csvContent = 'data:text/csv;charset=utf-8,' + encodeURIComponent(sheetsSyncService.getSampleCompiledCsv());
    const link = document.createElement('a');
    link.setAttribute('href', csvContent);
    link.setAttribute('download', 'Compiled_Multi_Project_Tender_Pricing.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleSendTestWebhook = async () => {
    setIsSubmittingWebhook(true);
    setWebhookTestResult(null);
    try {
      const payload = {
        companyName: testCompany.trim(),
        email: testEmail.trim(),
        projectName: testProject.trim(),
        tenderItem: testTenderItem.trim(),
        enteredAmount: Number(testAmount) || 0,
        notes: testNotes.trim(),
        docUrl: testDocUrl.trim(),
        submittedAt: new Date().toISOString()
      };

      const res = await fetch('/api/webhooks/form-submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      setWebhookTestResult({ success: res.ok, data, error: !res.ok ? (data.error || 'Request failed') : undefined });
    } catch (err: any) {
      setWebhookTestResult({ success: false, error: err.message || 'Failed to submit to webhook receiver' });
    } finally {
      setIsSubmittingWebhook(false);
    }
  };

  const formatCurrency = (val: number | string) => {
    const num = typeof val === 'string' ? parseFloat(val) : (val || 0);
    return new Intl.NumberFormat('en-CA', {
      style: 'currency',
      currency: 'CAD',
      minimumFractionDigits: num % 1 === 0 ? 0 : 2,
      maximumFractionDigits: 2
    }).format(num);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150">
      <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="p-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-purple-600 rounded-xl shadow-md">
              <Settings className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm sm:text-base text-white">App Settings & Cloud Integrations</h3>
                <span className="px-2 py-0.5 text-[10px] font-bold bg-purple-950 text-purple-300 rounded-full border border-purple-700/80">
                  Google Sheets & Gmail Web App
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Configure central Google Sheets synchronization and Google Apps Script Web App endpoints for direct Gmail dispatch.
              </p>
            </div>
          </div>
          <button
            type="button"
            id="close-sheets-sync-modal-btn"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center justify-between px-5 pt-3 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center gap-2 overflow-x-auto">
            <button
              type="button"
              id="tab-form-webhook"
              onClick={() => setActiveTab('form_webhook')}
              className={`px-3.5 py-2 text-xs font-bold rounded-t-lg transition-all border-b-2 cursor-pointer flex items-center gap-1.5 shrink-0 ${
                activeTab === 'form_webhook'
                  ? 'border-indigo-600 text-indigo-900 bg-white shadow-xs'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
              <span>Google Form Webhook & Cost Codes</span>
              <span className="px-1.5 py-0.2 bg-indigo-100 text-indigo-800 rounded-full text-[10px] font-mono font-bold">
                LIVE
              </span>
            </button>

            <button
              type="button"
              id="tab-apps-script"
              onClick={() => setActiveTab('apps_script')}
              className={`px-3.5 py-2 text-xs font-bold rounded-t-lg transition-all border-b-2 cursor-pointer flex items-center gap-1.5 shrink-0 ${
                activeTab === 'apps_script'
                  ? 'border-purple-600 text-purple-900 bg-white shadow-xs'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Mail className="w-3.5 h-3.5 text-purple-600" />
              <span>Gmail Dispatcher (Apps Script)</span>
              {appsScriptUrl ? (
                <span className="w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-emerald-200" title="Endpoint Configured"></span>
              ) : (
                <span className="w-2 h-2 rounded-full bg-amber-400" title="Endpoint Not Configured"></span>
              )}
            </button>

            <button
              type="button"
              id="tab-url-sync"
              onClick={() => setActiveTab('url_sync')}
              className={`px-3.5 py-2 text-xs font-bold rounded-t-lg transition-all border-b-2 cursor-pointer flex items-center gap-1.5 shrink-0 ${
                activeTab === 'url_sync'
                  ? 'border-emerald-600 text-emerald-900 bg-white shadow-xs'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <RefreshCw className="w-3.5 h-3.5 text-emerald-600" />
              <span>Live Google Sheet URL</span>
            </button>

            <button
              type="button"
              id="tab-direct-paste"
              onClick={() => setActiveTab('direct_paste')}
              className={`px-3.5 py-2 text-xs font-bold rounded-t-lg transition-all border-b-2 cursor-pointer flex items-center gap-1.5 shrink-0 ${
                activeTab === 'direct_paste'
                  ? 'border-blue-600 text-blue-900 bg-white shadow-xs'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <UploadCloud className="w-3.5 h-3.5 text-blue-600" />
              <span>Paste / Upload CSV</span>
              {parsedRows.length > 0 && (
                <span className="px-1.5 py-0.2 bg-blue-100 text-blue-800 rounded-full text-[10px] font-mono">
                  {parsedRows.length}
                </span>
              )}
            </button>

            <button
              type="button"
              id="tab-sync-history"
              onClick={() => setActiveTab('history')}
              className={`px-3.5 py-2 text-xs font-bold rounded-t-lg transition-all border-b-2 cursor-pointer flex items-center gap-1.5 shrink-0 ${
                activeTab === 'history'
                  ? 'border-slate-800 text-slate-900 bg-white shadow-xs'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Clock className="w-3.5 h-3.5 text-slate-500" />
              <span>Activity Log ({syncLogs.length})</span>
            </button>
          </div>

          <div className="flex items-center gap-3 pb-2">
            <button
              type="button"
              onClick={() => {
                const csvContent = 'data:text/csv;charset=utf-8,' + encodeURIComponent(sheetsSyncService.generateMasterSheetCsv(projects));
                const link = document.createElement('a');
                link.setAttribute('href', csvContent);
                link.setAttribute('download', 'Master_Sheet_Export.csv');
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
              }}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 hover:text-emerald-800 transition-colors cursor-pointer"
              title="Download full project workspace formatted for Master Sheet"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Export Master Sheet CSV</span>
            </button>
            <button
              type="button"
              onClick={downloadSampleCsv}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-700 hover:text-blue-600 transition-colors cursor-pointer"
              title="Download formatted multi-project CSV template"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Download Sample Template</span>
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-5 text-xs flex-1">
          {/* Deduplication & Sync Architecture Status */}
          <div className="p-3 bg-slate-900 text-white rounded-xl flex flex-wrap items-center justify-between gap-2 shadow-sm">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span className="font-semibold text-slate-200">Sync Deduplication & Persistent Storage:</span>
            </div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="px-2 py-0.5 text-[10px] font-mono bg-slate-800 text-emerald-300 border border-emerald-500/30 rounded">
                Attachment URL Deduplication: ON
              </span>
              <span className="px-2 py-0.5 text-[10px] font-mono bg-slate-800 text-blue-300 border border-blue-500/30 rounded">
                Force Overwrite & Re-Sync: ACTIVE
              </span>
              <span className="px-2 py-0.5 text-[10px] font-mono bg-slate-800 text-amber-300 border border-amber-500/30 rounded">
                Persistent Re-hydration: ACTIVE
              </span>
            </div>
          </div>

          {/* Schema Guide Alert */}
          <div className="p-3.5 bg-blue-50/70 border border-blue-200/90 rounded-xl flex items-start gap-3">
            <div className="p-1.5 bg-blue-600 text-white rounded-lg shrink-0 mt-0.5">
              <Info className="w-4 h-4" />
            </div>
            <div className="space-y-1">
              <div className="font-bold text-blue-950 text-xs flex items-center gap-2">
                <span>Compiled Multi-Project Column Structure</span>
                <span className="text-[10px] bg-blue-200/80 text-blue-900 px-2 py-0.5 rounded font-mono font-semibold">
                  8 Columns (Col A–H)
                </span>
              </div>
              <p className="text-[11px] text-blue-800 leading-relaxed">
                The centralized spreadsheet supports compiled rows for all projects together. The ingestion engine parses:
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 font-mono text-[11px]">
                <div className="bg-white/80 border border-blue-200 px-2 py-1 rounded text-slate-800">
                  <span className="font-bold text-blue-700">A.</span> Company Name
                </div>
                <div className="bg-white/80 border border-blue-200 px-2 py-1 rounded text-slate-800">
                  <span className="font-bold text-blue-700">B.</span> Project Name
                </div>
                <div className="bg-white/80 border border-blue-200 px-2 py-1 rounded text-slate-800">
                  <span className="font-bold text-blue-700">C.</span> Tender Form Item
                </div>
                <div className="bg-white/80 border border-purple-300 px-2 py-1 rounded text-slate-800 font-semibold bg-purple-50/50">
                  <span className="font-bold text-purple-700">D.</span> Cost Code
                </div>
                <div className="bg-white/80 border border-blue-200 px-2 py-1 rounded text-slate-800">
                  <span className="font-bold text-blue-700">E.</span> Entered Amount ($)
                </div>
                <div className="bg-white/80 border border-blue-200 px-2 py-1 rounded text-slate-800">
                  <span className="font-bold text-blue-700">F.</span> Notes / Exclusions
                </div>
                <div className="bg-white/80 border border-blue-200 px-2 py-1 rounded text-slate-800">
                  <span className="font-bold text-blue-700">G.</span> Formal Quote Link
                </div>
                <div className="bg-white/80 border border-blue-200 px-2 py-1 rounded text-slate-800">
                  <span className="font-bold text-blue-700">H.</span> Sync Status
                </div>
              </div>
            </div>
          </div>

          {/* TAB: GOOGLE FORM WEBHOOK & EXACT COST CODE AUTO-MAPPER */}
          {activeTab === 'form_webhook' && (
            <div className="space-y-4">
              {/* Endpoint Banner */}
              <div className="p-4 bg-indigo-50/80 border border-indigo-200 rounded-xl shadow-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 text-[10px] font-bold bg-indigo-600 text-white rounded font-mono">
                        POST RECEIVER
                      </span>
                      <span className="font-bold text-indigo-950 text-sm">
                        Direct Google Form & External Webhook Endpoint
                      </span>
                    </div>
                    <p className="text-xs text-indigo-900/80 mt-1">
                      Accepts direct JSON payloads from Google Forms, Google Apps Script, or third-party estimating feeds. Automatically resolves exact 5-digit Cost Codes and pushes real-time updates to contractor cards.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(webhookEndpointUrl);
                      setCopiedWebhookUrl(true);
                      setTimeout(() => setCopiedWebhookUrl(false), 2500);
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg transition-colors cursor-pointer text-xs shrink-0 self-start sm:self-center"
                  >
                    {copiedWebhookUrl ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedWebhookUrl ? 'Copied URL!' : 'Copy Endpoint URL'}</span>
                  </button>
                </div>

                <div className="mt-3 p-2 bg-slate-900 rounded-lg text-emerald-400 font-mono text-[11px] flex items-center justify-between overflow-x-auto">
                  <span>{webhookEndpointUrl}</span>
                  <span className="text-[10px] text-slate-400 font-sans ml-2 shrink-0">Content-Type: application/json</span>
                </div>
              </div>

              {/* Interactive Ingestion Simulator */}
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-indigo-600" />
                    <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider">
                      Live Webhook Ingestion Simulator
                    </h4>
                  </div>
                  <div className="flex items-center gap-1.5 text-[11px]">
                    <span className="text-slate-500">Auto-Mapped:</span>
                    <span className="px-2 py-0.5 bg-indigo-100 text-indigo-900 font-mono font-bold rounded">
                      {resolveCostCodeAndScope(testTenderItem).costCode}
                    </span>
                    <span className="px-2 py-0.5 bg-purple-100 text-purple-900 font-sans font-semibold rounded">
                      {resolveCostCodeAndScope(testTenderItem).tradeScope}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Company / Contractor Name</label>
                    <input
                      type="text"
                      value={testCompany}
                      onChange={(e) => setTestCompany(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs"
                      placeholder="e.g. Apex Foundation Contractors"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Contractor Email</label>
                    <input
                      type="email"
                      value={testEmail}
                      onChange={(e) => setTestEmail(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs"
                      placeholder="e.g. bids@apexfoundation.ca"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Target Project Name</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={testProject}
                        onChange={(e) => setTestProject(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold"
                        placeholder="e.g. 1198 Falcon"
                      />
                      {projects.length > 0 && (
                        <select
                          onChange={(e) => setTestProject(e.target.value)}
                          value=""
                          className="px-2 py-1.5 bg-slate-100 border border-slate-300 rounded-lg text-xs cursor-pointer text-slate-700"
                        >
                          <option value="" disabled>Select...</option>
                          {projects.map((p) => (
                            <option key={p.id} value={p.name}>{p.name}</option>
                          ))}
                        </select>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Entered Amount ($ CAD)</label>
                    <input
                      type="number"
                      value={testAmount}
                      onChange={(e) => setTestAmount(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono font-bold text-slate-900"
                      placeholder="e.g. 68500"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-[11px] font-bold text-slate-700">Tender Item Description</label>
                      <select
                        onChange={(e) => setTestTenderItem(e.target.value)}
                        value=""
                        className="text-[10px] text-indigo-700 bg-indigo-50 border border-indigo-200 rounded px-1.5 py-0.5 cursor-pointer font-medium"
                      >
                        <option value="" disabled>Choose Preset Item from Master Dictionary...</option>
                        {Object.keys(MASTER_COST_CODE_MAP).slice(0, 15).map((item) => (
                          <option key={item} value={item}>{item} ({MASTER_COST_CODE_MAP[item]})</option>
                        ))}
                      </select>
                    </div>
                    <input
                      type="text"
                      value={testTenderItem}
                      onChange={(e) => setTestTenderItem(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs"
                      placeholder="e.g. total for demolition (excl. gst)"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Quote Inclusions & Notes</label>
                    <input
                      type="text"
                      value={testNotes}
                      onChange={(e) => setTestNotes(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs"
                      placeholder="e.g. Includes mobilization, testing, and engineering permits"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Formal PDF / Drive Doc URL</label>
                    <input
                      type="url"
                      value={testDocUrl}
                      onChange={(e) => setTestDocUrl(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs"
                      placeholder="https://drive.google.com/..."
                    />
                  </div>
                </div>

                <div className="pt-2 flex items-center justify-between">
                  <span className="text-[11px] text-slate-500">
                    Triggers Firestore ingestion & immediate client broadcast.
                  </span>
                  <button
                    type="button"
                    onClick={handleSendTestWebhook}
                    disabled={isSubmittingWebhook}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold rounded-lg transition-colors cursor-pointer text-xs shadow-xs"
                  >
                    <Send className={`w-3.5 h-3.5 ${isSubmittingWebhook ? 'animate-pulse' : ''}`} />
                    <span>{isSubmittingWebhook ? 'Ingesting Payload...' : 'Send Test Ingest Webhook'}</span>
                  </button>
                </div>

                {webhookTestResult && (
                  <div className={`p-3 rounded-lg border text-xs ${
                    webhookTestResult.success ? 'bg-emerald-50 border-emerald-200 text-emerald-950' : 'bg-red-50 border-red-200 text-red-950'
                  }`}>
                    <div className="flex items-center gap-2 font-bold mb-1">
                      {webhookTestResult.success ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <AlertTriangle className="w-4 h-4 text-red-600" />}
                      <span>{webhookTestResult.success ? 'Webhook Ingestion Successful' : 'Ingestion Error'}</span>
                    </div>
                    {webhookTestResult.data && (
                      <div className="space-y-1 font-mono text-[11px] mt-1 pl-6">
                        <div><span className="text-slate-500 font-sans">Resolved Cost Code:</span> <strong className="text-indigo-700 font-bold">{webhookTestResult.data.costCode}</strong></div>
                        <div><span className="text-slate-500 font-sans">Matched Scope:</span> {webhookTestResult.data.matchedScope}</div>
                        <div><span className="text-slate-500 font-sans">Firestore Doc ID:</span> {webhookTestResult.data.docId}</div>
                        <div className="text-emerald-700 font-sans text-[11px] font-semibold mt-1">
                          Contractor card synchronized across all browser tabs via real-time listeners.
                        </div>
                      </div>
                    )}
                    {webhookTestResult.error && (
                      <p className="text-red-700 pl-6">{webhookTestResult.error}</p>
                    )}
                  </div>
                )}
              </div>

              {/* Master Cost Code Dictionary Explorer */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-2">
                  <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-slate-600" />
                    <span>Master Cost Code & Scope Lookup Dictionary ({Object.keys(MASTER_COST_CODE_MAP).length} Mappings)</span>
                  </h4>
                  <input
                    type="text"
                    value={costCodeSearch}
                    onChange={(e) => setCostCodeSearch(e.target.value)}
                    placeholder="Search tender items, scopes, or cost codes..."
                    className="px-2.5 py-1 bg-white border border-slate-300 rounded-lg text-xs w-full sm:w-64"
                  />
                </div>

                <div className="max-h-48 overflow-y-auto divide-y divide-slate-200/70 border border-slate-200 rounded-lg bg-white">
                  {Object.entries(MASTER_COST_CODE_MAP)
                    .filter(([item, code]) => {
                      if (!costCodeSearch.trim()) return true;
                      const q = costCodeSearch.toLowerCase();
                      const scope = (MASTER_TRADE_SCOPE_MAP[item] || '').toLowerCase();
                      return item.toLowerCase().includes(q) || code.includes(q) || scope.includes(q);
                    })
                    .map(([item, code]) => (
                      <div key={item} className="p-2 text-xs flex items-center justify-between hover:bg-slate-50 gap-2">
                        <div className="flex flex-col min-w-0">
                          <span className="text-slate-800 font-medium truncate">{item}</span>
                          <span className="text-[10px] text-slate-500 font-medium">{MASTER_TRADE_SCOPE_MAP[item] || 'General Scope'}</span>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className="px-1.5 py-0.5 bg-purple-50 text-purple-800 text-[10px] font-semibold rounded border border-purple-200">
                            {MASTER_TRADE_SCOPE_MAP[item]}
                          </span>
                          <span className="px-2 py-0.5 bg-slate-100 text-indigo-700 font-mono font-bold rounded border border-slate-200">
                            {code}
                          </span>
                        </div>
                      </div>
                    ))}
                </div>
              </div>

              {/* Google Apps Script Integration Guide */}
              <div className="bg-slate-900 text-white p-4 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-purple-400" />
                    <h4 className="font-bold text-sm">Google Form Apps Script Trigger</h4>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const script = `// Paste into Extensions > Apps Script in your Google Form
function onFormSubmit(e) {
  var responses = e.response.getItemResponses();
  var payload = {
    companyName: responses[0].getResponse(),
    email: e.response.getRespondentEmail() || (responses[1] ? responses[1].getResponse() : ""),
    projectName: responses[2] ? responses[2].getResponse() : "1198 Falcon",
    tenderItem: responses[3] ? responses[3].getResponse() : "",
    enteredAmount: parseFloat(responses[4] ? responses[4].getResponse().toString().replace(/[^0-9.]/g, "") : "0"),
    notes: responses[5] ? responses[5].getResponse() : "",
    docUrl: responses[6] ? responses[6].getResponse() : "",
    submittedAt: new Date().toISOString()
  };

  UrlFetchApp.fetch("${webhookEndpointUrl}", {
    method: "post",
    contentType: "application/json",
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  });
}`;
                      navigator.clipboard.writeText(script);
                      setCopiedFormScript(true);
                      setTimeout(() => setCopiedFormScript(false), 2500);
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-lg text-xs cursor-pointer transition-colors"
                  >
                    {copiedFormScript ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedFormScript ? 'Copied Script!' : 'Copy Form Script'}</span>
                  </button>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Attach an <strong>On form submit</strong> installable trigger in your Google Form's Apps Script project. When subtrades complete the form, their quotation figure, tender item, and PDF link are dispatched directly to our receiver and mapped to the right cost code in seconds.
                </p>
              </div>
            </div>
          )}

          {/* TAB 1: LIVE URL SYNC */}
          {activeTab === 'url_sync' && (
            <div className="space-y-4">
              {/* Quick Sync Action Card */}
              <div className="p-4 bg-emerald-50/80 border border-emerald-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
                <div>
                  <div className="flex items-center gap-2 font-bold text-emerald-950 text-sm">
                    <Sparkles className="w-4 h-4 text-emerald-600" />
                    <span>Central Feed: {config.sheetName || 'Central Multi-Project Tender Pricing Feed'}</span>
                  </div>
                  <p className="text-xs text-emerald-800 mt-1">
                    {config.lastSyncedAt
                      ? `Last synchronized with multi-project repository at ${config.lastSyncedAt}`
                      : 'Ready to synchronize multi-project quotes across all scopes and phases.'}
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-[11px] font-bold text-emerald-900">Registered Projects Target:</span>
                    <span className="text-[11px] font-mono px-2 py-0.5 bg-emerald-200/80 text-emerald-950 rounded">
                      {projects.length} Workspace Projects
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  id="modal-trigger-live-sync-btn"
                  onClick={() => onTriggerSync()}
                  disabled={isSyncing}
                  className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold rounded-xl transition-colors shadow-sm cursor-pointer text-xs shrink-0"
                >
                  <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
                  <span>{isSyncing ? 'Allocating & Calculating...' : 'Sync Master Tender Sheet'}</span>
                </button>
              </div>

              {/* URL & Polling Settings Form */}
              <form onSubmit={handleSaveSettings} className="space-y-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
                <h4 className="font-bold text-slate-800 uppercase tracking-wider text-[11px] flex items-center gap-2">
                  <Building className="w-3.5 h-3.5 text-slate-600" />
                  <span>Google Sheets Connection Settings</span>
                </h4>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Central Google Sheet URL / Published CSV Link
                  </label>
                  <input
                    type="url"
                    placeholder="https://docs.google.com/spreadsheets/d/.../edit"
                    value={sheetUrl}
                    onChange={(e) => setSheetUrl(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-xs font-mono"
                  />
                  <p className="text-[11px] text-slate-500 mt-1">
                    Direct share link or published CSV URL to your central compiled sheet containing quotes for all projects.
                  </p>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-slate-700">
                      Google Apps Script Endpoint URL (Gmail Dispatcher)
                    </label>
                    <button
                      type="button"
                      onClick={() => setActiveTab('apps_script')}
                      className="text-[11px] font-bold text-purple-700 hover:text-purple-900 cursor-pointer"
                    >
                      Open Apps Script Guide &rarr;
                    </button>
                  </div>
                  <input
                    type="url"
                    id="settings-apps-script-url-input"
                    placeholder="https://script.google.com/a/macros/thezenithgroup.ca/s/.../exec"
                    value={appsScriptUrl}
                    onChange={(e) => setAppsScriptUrl(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500 text-xs font-mono"
                  />
                  <p className="text-[11px] text-slate-500 mt-1">
                    Enables direct "Send Invitations Now" and "Send Reminders Now" Gmail dispatch with recipient privacy protection.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Central Feed Name</label>
                    <input
                      type="text"
                      placeholder="e.g. Master Compiled Tender Feed"
                      value={sheetName}
                      onChange={(e) => setSheetName(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-xs"
                    />
                  </div>

                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-900">
                    <div className="font-bold flex items-center gap-1.5 text-amber-800 mb-1">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      Client-Side Background Auto-Polling Disabled
                    </div>
                    <p className="text-amber-700 leading-relaxed">
                      To preserve the daily Firestore write quota, background auto-polling loops have been disabled. 
                      Spreadsheets sync on-demand when you click <strong className="font-semibold text-slate-900">Sync Sheets Data</strong>.
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-end pt-2 border-t border-slate-200">
                  <button
                    type="submit"
                    className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-lg transition-colors cursor-pointer text-xs"
                  >
                    Save Configuration
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* TAB: GMAIL DISPATCHER (APPS SCRIPT) */}
          {activeTab === 'apps_script' && (
            <div className="space-y-4">
              {/* Endpoint Status Banner */}
              <div className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                appsScriptUrl.trim()
                  ? 'bg-emerald-50/70 border-emerald-200'
                  : 'bg-amber-50/70 border-amber-200'
              }`}>
                <div className="flex items-start sm:items-center gap-3">
                  <div className={`p-2.5 rounded-xl shrink-0 ${
                    appsScriptUrl.trim() ? 'bg-emerald-600 text-white' : 'bg-amber-500 text-white'
                  }`}>
                    <Mail className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-slate-900 text-xs sm:text-sm">
                        Direct Apps Script Gmail Dispatcher
                      </h4>
                      <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full border ${
                        appsScriptUrl.trim()
                          ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                          : 'bg-amber-100 text-amber-800 border-amber-300'
                      }`}>
                        {appsScriptUrl.trim() ? 'Ready for Dispatch' : 'Configuration Required'}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600 mt-0.5">
                      Powers "Send Invitations Now" and "Send Reminders Now" via Google Apps Script Web App with individualized recipient privacy.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    id="test-apps-script-endpoint-btn"
                    onClick={handleTestEndpoint}
                    disabled={isTestingEndpoint || !appsScriptUrl.trim()}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded-lg transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isTestingEndpoint ? 'animate-spin' : ''}`} />
                    <span>{isTestingEndpoint ? 'Testing...' : 'Test Connection'}</span>
                  </button>
                </div>
              </div>

              {/* Endpoint Test Feedback */}
              {testResult && (
                <div className={`p-3 rounded-lg text-xs border flex items-start gap-2 ${
                  testResult.success 
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
                    : 'bg-rose-50 border-rose-200 text-rose-800'
                }`}>
                  {testResult.success ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1 font-medium leading-relaxed">
                    {testResult.message}
                  </div>
                </div>
              )}

              {endpointSaveStatus && (
                <div className="p-3 rounded-lg text-xs bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{endpointSaveStatus}</span>
                </div>
              )}

              {/* URL Configuration Box */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <label className="block text-xs font-bold text-slate-800">
                        Webhook Endpoint URL
                      </label>
                      {appsScriptUrl.trim() === DEFAULT_APPS_SCRIPT_WEBHOOK_URL && (
                        <span className="px-2 py-0.5 bg-purple-100 text-purple-800 border border-purple-200 text-[10px] font-bold rounded-full">
                          Zenith Live Production
                        </span>
                      )}
                    </div>
                    {appsScriptUrl.trim() !== DEFAULT_APPS_SCRIPT_WEBHOOK_URL && (
                      <button
                        type="button"
                        onClick={() => setAppsScriptUrl(DEFAULT_APPS_SCRIPT_WEBHOOK_URL)}
                        className="text-[11px] font-bold text-purple-700 hover:text-purple-900 cursor-pointer"
                      >
                        Reset to Zenith Default URL
                      </button>
                    )}
                  </div>
                  <input
                    type="url"
                    id="apps-script-endpoint-url-input"
                    placeholder="https://script.google.com/a/macros/thezenithgroup.ca/s/.../exec"
                    value={appsScriptUrl}
                    onChange={(e) => setAppsScriptUrl(e.target.value)}
                    className="w-full px-3 py-2.5 bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500 text-xs font-mono"
                  />
                  <p className="text-[11px] text-slate-500 mt-1">
                    Permanent production webhook URL ending in <code className="font-mono text-purple-700 bg-purple-50 px-1 py-0.5 rounded">/exec</code>.
                  </p>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-200">
                  <div className="text-[11px] text-slate-500">
                    Dispatches each recipient as a private POST request with custom HTML and BCC protection.
                  </div>
                  <button
                    type="button"
                    id="save-apps-script-endpoint-btn"
                    onClick={handleSaveAppsScriptUrlOnly}
                    className="px-4 py-1.5 bg-purple-700 hover:bg-purple-800 text-white font-semibold rounded-lg transition-colors cursor-pointer text-xs"
                  >
                    Save Endpoint URL
                  </button>
                </div>
              </div>

              {/* 60-Second Setup Instructions */}
              <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                    <span>Quick 60-Second Web App Deployment Guide</span>
                  </h4>
                  <button
                    type="button"
                    onClick={copyScriptTemplate}
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-purple-700 hover:text-purple-900 cursor-pointer"
                  >
                    {copiedScript ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedScript ? 'Copied to Clipboard!' : 'Copy Script Code'}</span>
                  </button>
                </div>

                <ol className="text-xs text-slate-600 space-y-1.5 list-decimal pl-4">
                  <li>
                    Open <a href="https://script.google.com" target="_blank" rel="noopener noreferrer" className="text-purple-700 underline font-semibold inline-flex items-center gap-0.5">script.google.com <ExternalLink className="w-2.5 h-2.5" /></a> (or Google Sheet &gt; Extensions &gt; Apps Script).
                  </li>
                  <li>Paste the code snippet below into <code>Code.gs</code>.</li>
                  <li>Click <strong>Deploy &gt; New deployment</strong> and choose <strong>Web app</strong>.</li>
                  <li>Set <strong>Execute as:</strong> "Me (your account)" and <strong>Who has access:</strong> "Anyone".</li>
                  <li>Click <strong>Deploy</strong>, grant Gmail permissions, and paste the resulting Web App URL above.</li>
                </ol>

                <div className="relative">
                  <pre className="p-3 bg-slate-900 text-slate-100 rounded-lg text-[11px] font-mono overflow-x-auto leading-relaxed max-h-44 border border-slate-800">
{`function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);

    // 1. Master Tender Sync Row Ingestion
    if (data.rows && Array.isArray(data.rows)) {
      var processed = data.rows.map(function(row) {
        // Explicit Column Index Assignments (0-based indexing)
        var companyName = String(row[0] || "").trim(); // Column A
        var projectName = String(row[1] || "").trim(); // Column B
        var tenderItem = String(row[2] || "").trim();  // Column C
        
        // Ensure row[4] (Column E) is parsed as the dollar figure, NOT row[3] (Cost Code)
        var costCode = String(row[3] || "").trim();    // Column D (e.g., "20330", "20530")
        var rawAmountString = String(row[4] || "0").replace(/[^0-9.-]+/g, ""); // Column E
        var quotedAmount = parseFloat(rawAmountString) || 0;
        
        var notes = String(row[5] || "").trim();       // Column F
        var quoteLink = String(row[6] || "").trim();   // Column G
        var synced = String(row[7] || "").trim();      // Column H

        return {
          companyName: companyName,
          projectName: projectName,
          tenderItem: tenderItem,
          costCode: costCode,
          quotedAmount: quotedAmount,
          notes: notes,
          quoteLink: quoteLink,
          synced: synced
        };
      });

      return ContentService.createTextOutput(JSON.stringify({
        status: "success",
        processedCount: processed.length,
        rows: processed
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // 2. Gmail Dispatch (Invitations and Reminders)
    if (data.to) {
      GmailApp.sendEmail(data.to, data.subject, "", {
        htmlBody: data.htmlBody,
        cc: data.cc || "",
        bcc: data.bcc || "",
        name: "The Zenith Group Estimating"
      });
      return ContentService.createTextOutput(JSON.stringify({ status: "success" }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    return ContentService.createTextOutput(JSON.stringify({ status: "success", message: "Acknowledged" }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ status: "error", message: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}`}
                  </pre>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: DIRECT PASTE & FILE UPLOAD */}
          {activeTab === 'direct_paste' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h4 className="font-bold text-slate-900 text-xs">Direct Sheet Paste & File Upload</h4>
                  <p className="text-[11px] text-slate-500">
                    Copy and paste rows straight from Google Sheets / Excel, or upload your compiled CSV.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleLoadSampleData}
                    className="px-3 py-1.5 text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors cursor-pointer"
                  >
                    Load Sample Compiled Data
                  </button>

                  <label className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-lg transition-colors cursor-pointer">
                    <UploadCloud className="w-3.5 h-3.5" />
                    <span>Upload CSV</span>
                    <input
                      type="file"
                      accept=".csv,.tsv,.txt"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              {/* Paste Text Area */}
              <div>
                <textarea
                  rows={5}
                  value={pastedText}
                  onChange={(e) => setPastedText(e.target.value)}
                  placeholder="Paste compiled spreadsheet rows here...&#10;Company Name&#9;Project&#9;Tender Form Item Description&#9;Entered Amount&#9;Notes&#9;Attach Formal Quote (PDF, DOC, or Image)"
                  className="w-full p-3 font-mono text-[11px] bg-slate-900 text-emerald-400 border border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-y"
                />
                {pasteError && (
                  <p className="text-xs text-rose-600 font-bold mt-1">{pasteError}</p>
                )}
              </div>

              {/* Parsed Live Table Preview & Metrics */}
              {parsedRows.length > 0 && parsedSummary && (
                <div className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 font-bold rounded-lg text-xs flex items-center gap-1.5">
                        <Check className="w-3.5 h-3.5" />
                        <span>{parsedSummary.rowsCount} Rows Ready</span>
                      </span>
                      <span className="px-2.5 py-1 bg-blue-100 text-blue-800 font-bold rounded-lg text-xs flex items-center gap-1.5">
                        <Building className="w-3.5 h-3.5" />
                        <span>{parsedSummary.projectsCount} Projects</span>
                      </span>
                      <span className="px-2.5 py-1 bg-purple-100 text-purple-800 font-bold rounded-lg text-xs flex items-center gap-1.5">
                        <DollarSign className="w-3.5 h-3.5" />
                        <span>{formatCurrency(parsedSummary.totalAmount)} Quoted Total</span>
                      </span>
                      {parsedSummary.docsCount > 0 && (
                        <span className="px-2.5 py-1 bg-amber-100 text-amber-800 font-bold rounded-lg text-xs flex items-center gap-1.5">
                          <Paperclip className="w-3.5 h-3.5" />
                          <span>{parsedSummary.docsCount} Formal Docs</span>
                        </span>
                      )}
                    </div>

                    <button
                      type="button"
                      id="apply-direct-sync-btn"
                      onClick={handleApplyDirectSync}
                      disabled={isSyncing}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold rounded-lg shadow-sm transition-colors cursor-pointer text-xs flex items-center gap-1.5"
                    >
                      <Sparkles className="w-4 h-4" />
                      <span>Allocate & Calculate Quoted Totals</span>
                    </button>
                  </div>

                  {/* Table Preview */}
                  <div className="border border-slate-200 rounded-lg overflow-x-auto max-h-56 bg-white">
                    <table className="w-full text-left text-[11px]">
                      <thead className="bg-slate-100 text-slate-700 font-bold sticky top-0 border-b border-slate-200">
                        <tr>
                          <th className="p-2">#</th>
                          <th className="p-2">Company</th>
                          <th className="p-2">Target Project</th>
                          <th className="p-2">Tender Form Item</th>
                          <th className="p-2 text-right">Entered Amount</th>
                          <th className="p-2">Notes</th>
                          <th className="p-2">Formal Quote Attached</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {parsedRows.slice(0, 15).map((row, idx) => (
                          <tr key={idx} className="hover:bg-slate-50">
                            <td className="p-2 font-mono text-slate-400">{idx + 1}</td>
                            <td className="p-2 font-bold text-slate-900">{row.companyName}</td>
                            <td className="p-2 font-semibold text-blue-700">{row.project}</td>
                            <td className="p-2 text-slate-800">{row.itemDescription}</td>
                            <td className="p-2 text-right font-mono font-bold text-emerald-700">
                              {formatCurrency(row.amount)}
                            </td>
                            <td className="p-2 text-slate-500 max-w-[160px] truncate">{row.notes || '—'}</td>
                            <td className="p-2 text-slate-500">
                              {row.formalQuoteDoc ? (
                                <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold truncate max-w-[140px]">
                                  <Paperclip className="w-3 h-3 shrink-0" />
                                  <span className="truncate">{row.formalQuoteDoc}</span>
                                </span>
                              ) : (
                                '—'
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {parsedRows.length > 15 && (
                      <div className="p-2 bg-slate-50 text-center text-slate-500 text-[10px] font-semibold border-t border-slate-200">
                        + {parsedRows.length - 15} additional rows ready for allocation
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: SYNC ACTIVITY HISTORY */}
          {activeTab === 'history' && (
            <div>
              <h4 className="font-bold text-slate-800 uppercase tracking-wider text-[11px] mb-2 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-slate-500" />
                <span>Multi-Project Synchronization Audit Trail</span>
              </h4>

              <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100 max-h-64 overflow-y-auto">
                {syncLogs.length === 0 ? (
                  <div className="p-6 text-center text-slate-400">No synchronization events recorded yet.</div>
                ) : (
                  syncLogs.map((log) => (
                    <div key={log.id} className="p-3.5 bg-white hover:bg-slate-50 text-xs">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2 font-bold text-slate-900">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                          <span>{log.message}</span>
                        </div>
                        <span className="text-[10px] text-slate-400 font-mono">{log.timestamp}</span>
                      </div>
                      {log.details && (
                        <p className="text-[11px] text-slate-600 pl-6 leading-relaxed font-sans">{log.details}</p>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-3.5 bg-slate-100 border-t border-slate-200 flex items-center justify-between">
          <div className="text-[11px] text-slate-500">
            {activeTab === 'direct_paste' && parsedRows.length > 0 ? (
              <span>
                Ready to ingest <strong className="text-slate-800">{parsedRows.length}</strong> compiled line-item records.
              </span>
            ) : (
              <span>Synchronizes across all active project workspaces & phases simultaneously.</span>
            )}
          </div>

          <button
            type="button"
            id="modal-done-btn"
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white rounded-lg transition-colors cursor-pointer shadow-xs"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
