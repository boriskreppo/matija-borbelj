// ── Local dev server ───────────────────────────────────────────
// Serves static files + the same /api handlers Vercel runs, with
// local-disk storage (uploads/ + .dev-data/manifest.json).
//
//   node dev-server.js          → http://localhost:3000
//   ADMIN_PASSWORD=xyz node dev-server.js   (default dev pw: matija123)
import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { handleAuth, handleManifest, handleUpload, handleDelete, withErrors } from './api/_lib/handlers.js';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3000;

const ROUTES = {
  '/api/auth': withErrors(handleAuth),
  '/api/manifest': withErrors(handleManifest),
  '/api/upload': withErrors(handleUpload),
  '/api/delete': withErrors(handleDelete),
};

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
};

http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const route = ROUTES[url.pathname];
  if (route) return route(req, res);

  // static files
  let filePath = decodeURIComponent(url.pathname);
  if (filePath === '/') filePath = '/index.html';
  if (filePath.includes('..') || path.basename(filePath).startsWith('.')) {
    res.writeHead(403); return res.end('Forbidden');
  }
  const abs = path.join(ROOT, filePath);
  try {
    const data = await fs.readFile(abs);
    res.writeHead(200, {
      'Content-Type': MIME[path.extname(abs).toLowerCase()] || 'application/octet-stream',
      'Cache-Control': 'no-store',
    });
    res.end(data);
  } catch {
    res.writeHead(404); res.end('Not found');
  }
}).listen(PORT, () => {
  console.log(`Dev server → http://localhost:${PORT}`);
  console.log(`Admin      → http://localhost:${PORT}/admin.html (password: ${process.env.ADMIN_PASSWORD ? '[from env]' : 'matija123'})`);
});
