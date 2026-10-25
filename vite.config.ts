import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import fs from 'fs';
import {defineConfig, Plugin} from 'vite';

function sheetsApiDevPlugin(): Plugin {
  return {
    name: 'sheets-api-dev-plugin',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = req.url || '';
        const DATA_DIR = path.join(process.cwd(), 'data');
        const STORE_FILE = path.join(DATA_DIR, 'master_sheet_store.json');
        const CSV_FILE = path.join(DATA_DIR, 'master_sheet.csv');

        if (!fs.existsSync(DATA_DIR)) {
          fs.mkdirSync(DATA_DIR, { recursive: true });
        }

        if (url === '/api/health') {
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ status: 'ok', service: 'Zenith Tender Management' }));
          return;
        }

        if (url === '/api/sheets/master' && req.method === 'GET') {
          res.setHeader('Content-Type', 'application/json');
          try {
            if (fs.existsSync(STORE_FILE)) {
              const data = fs.readFileSync(STORE_FILE, 'utf-8');
              res.end(data);
            } else {
              res.end(JSON.stringify({ projects: null, masterRows: [], lastSavedAt: null }));
            }
          } catch {
            res.end(JSON.stringify({ projects: null, masterRows: [], lastSavedAt: null }));
          }
          return;
        }

        if (url === '/api/sheets/save' && req.method === 'POST') {
          let body = '';
          req.on('data', (chunk) => {
            body += chunk;
          });
          req.on('end', () => {
            try {
              const parsed = JSON.parse(body || '{}');
              const now = new Date().toISOString();
              const payload = {
                projects: parsed.projects || [],
                masterRows: parsed.masterRows || [],
                csv: parsed.csv || '',
                lastSavedAt: now
              };
              fs.writeFileSync(STORE_FILE, JSON.stringify(payload, null, 2), 'utf-8');
              if (parsed.csv) {
                fs.writeFileSync(CSV_FILE, parsed.csv, 'utf-8');
              }
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({
                success: true,
                savedAt: now,
                projectsCount: Array.isArray(parsed.projects) ? parsed.projects.length : 0,
                rowsCount: Array.isArray(parsed.masterRows) ? parsed.masterRows.length : 0
              }));
            } catch (err: any) {
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: err.message || 'Save failed' }));
            }
          });
          return;
        }

        if (url.startsWith('/api/sheets/fetch') && req.method === 'GET') {
          const urlObj = new URL(url, 'http://localhost');
          const targetUrl = urlObj.searchParams.get('url');
          if (!targetUrl) {
            res.statusCode = 400;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: 'url param missing' }));
            return;
          }
          fetch(targetUrl)
            .then((r) => r.text())
            .then((csvText) => {
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ csv: csvText }));
            })
            .catch((e) => {
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: e.message }));
            });
          return;
        }

        next();
      });
    }
  };
}

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss(), sheetsApiDevPlugin()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
