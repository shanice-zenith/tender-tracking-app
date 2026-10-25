import express from 'express';
import path from 'path';
import fs from 'fs';
import multer from 'multer';
import { createServer as createViteServer } from 'vite';
import { initializeApp, getApps } from 'firebase/app';
import {
  initializeFirestore,
  getFirestore,
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  collection,
  getDocs,
  writeBatch
} from 'firebase/firestore';
import firebaseConfig from './firebase-applet-config.json';
import {
  resolveCostCodeAndScope,
  normalizeTenderKey
} from './src/data/costCodeMap';
import {
  findScopeTemplateByCostCode,
  getAccurateScopeCostCode
} from './src/data/tenderBreakdownTemplates';
import {
  matchProjectCandidate,
  CANONICAL_ZENITH_PROJECTS
} from './src/data/projectMatcher';
import { isExampleOrMockTerm } from './src/utils/projectValidation';

const sanitizePayload = (obj: any) =>
  JSON.parse(JSON.stringify(obj, (_key, val) => (val === undefined ? null : val)));

// Splits multi-document inputs from Google Forms (comma, newline, or array)
function extractAllDocumentUrls(rawInput: any): string[] {
  if (!rawInput) return [];
  const urls: string[] = [];

  const processItem = (val: any) => {
    if (!val) return;
    if (typeof val === 'string') {
      const parts = val.split(/[\r\n,;]+/).map((s) => s.trim()).filter(Boolean);
      parts.forEach((p) => {
        if (p.startsWith('http://') || p.startsWith('https://') || p.startsWith('data:')) {
          urls.push(p);
        }
      });
    } else if (Array.isArray(val)) {
      val.forEach(processItem);
    } else if (typeof val === 'object') {
      if (val.url) processItem(val.url);
      else Object.values(val).forEach(processItem);
    }
  };

  processItem(rawInput);
  return Array.from(new Set(urls));
}

async function startServer() {
  const app = express();
  const PORT = process.env.PORT || 3000;
  const DATA_DIR = path.join(process.cwd(), 'data');
  const STORE_FILE = path.join(DATA_DIR, 'master_sheet_store.json');
  const CSV_FILE = path.join(DATA_DIR, 'master_sheet.csv');
  const QUOTES_STORE_FILE = path.join(DATA_DIR, 'quotes_store.json');
  const UPLOADS_DIR = path.join(process.cwd(), 'uploads');

  let firestoreDb: any = null;

  try {
    const firebaseApp = getApps().length > 0 ? getApps()[0] : initializeApp(firebaseConfig);
    const databaseId = (firebaseConfig as any).firestoreDatabaseId;
    try {
      firestoreDb = initializeFirestore(firebaseApp, { ignoreUndefinedProperties: true }, databaseId);
    } catch {
      firestoreDb = databaseId ? getFirestore(firebaseApp, databaseId) : getFirestore(firebaseApp);
    }
  } catch (err) {
    console.warn('Server Firebase initialization notice:', err);
  }

  const sseClients = new Set<express.Response>();
  const broadcastSSE = (data: any) => {
    const payload = `data: ${JSON.stringify(data)}\n\n`;
    for (const client of sseClients) {
      try {
        client.write(payload);
      } catch {
        sseClients.delete(client);
      }
    }
  };

  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

  const uploadStorage = multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, UPLOADS_DIR),
    filename: (_req, file, cb) => {
      const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
      cb(null, `${Date.now()}_${safeName}`);
    }
  });

  const uploadMiddleware = multer({
    storage: uploadStorage,
    limits: { fileSize: 50 * 1024 * 1024 }
  });

  app.use('/uploads', express.static(UPLOADS_DIR));
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  app.post('/api/upload', (req, res) => {
    const contentType = req.headers['content-type'] || '';
    if (contentType.includes('multipart/form-data')) {
      return uploadMiddleware.single('file')(req, res, (err) => {
        if (err) return res.status(400).json({ error: err.message });
        if (req.file) {
          return res.json({
            success: true,
            url: `/uploads/${req.file.filename}`,
            name: req.file.originalname,
            filename: req.file.filename,
            size: req.file.size,
            mimetype: req.file.mimetype
          });
        }
        return res.status(400).json({ error: 'No file received' });
      });
    }

    try {
      const { fileName, fileData, mimeType } = req.body || {};
      if (!fileData) return res.status(400).json({ error: 'fileData is required' });
      const safeName = (fileName || `quote_doc_${Date.now()}.pdf`).replace(/[^a-zA-Z0-9._-]/g, '_');
      const filename = `${Date.now()}_${safeName}`;
      const filePath = path.join(UPLOADS_DIR, filename);
      const base64Data = fileData.replace(/^data:[^;]+;base64,/, '');
      fs.writeFileSync(filePath, Buffer.from(base64Data, 'base64'));
      return res.json({
        success: true,
        url: `/uploads/${filename}`,
        name: fileName || safeName,
        filename,
        mimetype: mimeType || 'application/octet-stream'
      });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/webhooks/events', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    if (typeof (res as any).flushHeaders === 'function') (res as any).flushHeaders();
    res.write(`data: ${JSON.stringify({ type: 'connected', timestamp: new Date().toISOString() })}\n\n`);
    sseClients.add(res);

    const timer = setInterval(() => {
      try { res.write(`: heartbeat\n\n`); } catch { clearInterval(timer); sseClients.delete(res); }
    }, 25000);

    req.on('close', () => { clearInterval(timer); sseClients.delete(res); });
  });

  // Main Google Form Webhook Receiver with Revisions & Multi-Doc Support
  app.post('/api/webhooks/form-submit', async (req, res) => {
    try {
      const body = req.body || {};

      let company = body.companyName || body['Company Name'] || body.company || body.contractorName;
      if (body.responses && typeof body.responses === 'object') {
        company = company || body.responses['Company Name'] || body.responses['Company'];
      }
      if (Array.isArray(company)) company = company[0];
      const companyName = String(company || '').trim() || 'Unassigned Subtrade';

      let rawProject = body.projectName || body.project || body['Project'] || body["Select the Project you've been invited to quote for:"];
      if (body.responses && typeof body.responses === 'object') {
        rawProject = rawProject || body.responses['Project'] || body.responses["Select the Project you've been invited to quote for:"];
      }
      if (Array.isArray(rawProject)) rawProject = rawProject[0];
      const matched = matchProjectCandidate(String(rawProject || '1915 Ramsay St. SE'));
      const projectName = matched.projectName;
      const projectId = matched.projectId;

      let rawTrade = body.tradeName || body.trade || body.tenderItem || body['Tender Item'] || body['Scope'];
      if (body.responses && typeof body.responses === 'object') {
        rawTrade = rawTrade || body.responses['Trade Name'] || body.responses['Tender Item'];
      }
      if (Array.isArray(rawTrade)) rawTrade = rawTrade[0];
      const explicitTrade = String(rawTrade || '').trim();

      const parseAmount = (val: any): number => {
        if (typeof val === 'number') return isNaN(val) ? 0 : val;
        if (Array.isArray(val) && val.length > 0) return parseAmount(val[0]);
        const cleaned = String(val || '0').replace(/[^0-9.-]/g, '');
        const num = parseFloat(cleaned);
        return isNaN(num) ? 0 : num;
      };

      let amount = parseAmount(body.quotedFigure ?? body.enteredAmount ?? body.amount ?? body['Amount']);

      // Collect all document URLs
      const collectedUrls: string[] = [];
      ['docUrl', 'File Upload', 'Upload Quote', 'Attach Formal Quote', 'attachment', 'attachments', 'file', 'files'].forEach((key) => {
        collectedUrls.push(...extractAllDocumentUrls(body[key]));
        if (body.responses && typeof body.responses === 'object') {
          collectedUrls.push(...extractAllDocumentUrls(body.responses[key]));
        }
      });
      const uniqueUrls = Array.from(new Set(collectedUrls));
      const submissionDate = body.submittedAt ? String(body.submittedAt) : new Date().toISOString();

      const attachedDocs = uniqueUrls.map((url, i) => {
        const fileName = url.split('/').pop()?.split('?')[0] || `Quote_Doc_${i + 1}.pdf`;
        return {
          id: `doc-${Date.now()}-${i}`,
          name: fileName.includes('.') ? fileName : `${fileName}.pdf`,
          url,
          type: 'quote',
          addedAt: submissionDate.split('T')[0],
          uploadedAt: submissionDate
        };
      });

      const resolved = resolveCostCodeAndScope(explicitTrade);
      let costCode = resolved.costCode !== '99999' ? resolved.costCode : '20000';
      let tradeScope = resolved.costCode !== '99999' ? resolved.tradeScope : (explicitTrade || 'General Scope');

      if (costCode === '20020' && !normalizeTenderKey(explicitTrade).includes('demolition')) {
        costCode = '20000';
        tradeScope = 'General Scope';
      }

      // Route to correct phase based on master breakdown templates (fixes Phase 1A hardcoding)
      const templateInfo = findScopeTemplateByCostCode(costCode);
      const targetPhaseId = (templateInfo as any)?.phaseId || '1A';

      // Detect Revision
      let isRevision = false;
      let existingQuoteDoc: any = null;
      const docId = `${projectName}_${companyName}_${costCode}`.replace(/\//g, '-');

      if (firestoreDb) {
        try {
          const snap = await getDoc(doc(firestoreDb, 'quotes', docId));
          if (snap.exists()) {
            isRevision = true;
            existingQuoteDoc = snap.data();
          }
        } catch (_) { }
      }

      let finalDocs = attachedDocs;
      if (isRevision && existingQuoteDoc && Array.isArray(existingQuoteDoc.attachedDocs)) {
        const oldDocs = existingQuoteDoc.attachedDocs.filter((d: any) => !uniqueUrls.includes(d.url));
        finalDocs = [...attachedDocs, ...oldDocs];
      }

      const quoteDoc = {
        id: docId,
        companyName,
        contractorName: companyName,
        email: body.email || body['Email Address'] || '',
        projectName,
        projectId,
        trade: tradeScope,
        tradeScope,
        tenderItem: explicitTrade || tradeScope,
        costCode,
        phaseId: targetPhaseId,
        quotedFigure: amount,
        enteredAmount: amount,
        amount,
        notes: body.notes || body['Notes'] || '',
        docUrl: uniqueUrls[0] || '',
        attachmentUrl: uniqueUrls[0] || '',
        attachedDocs: finalDocs,
        submittedAt: submissionDate,
        actionStatus: isRevision ? 'Revision Submitted' : 'Estimate Submitted',
        actionItemStatus: isRevision ? 'Revision Submitted' : 'Estimate Submitted',
        lastModifiedBy: body.email || companyName,
        updatedAt: new Date().toISOString()
      };

      if (firestoreDb) {
        try {
          await setDoc(doc(firestoreDb, 'quotes', docId), sanitizePayload(quoteDoc), { merge: true });
        } catch (fErr) {
          console.warn('[Webhook] Firestore write error:', fErr);
        }
      }

      broadcastSSE({ type: 'quote_ingested', quote: quoteDoc });

      return res.json({
        success: true,
        isRevision,
        docId,
        quote: quoteDoc
      });
    } catch (e: any) {
      console.error('[Webhook] Error:', e);
      return res.status(500).json({ error: e.message || 'Webhook parsing error' });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => res.sendFile(path.join(distPath, 'index.html')));
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Zenith Tender Management server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
