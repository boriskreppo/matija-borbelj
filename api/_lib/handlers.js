// ── Route handlers, shared by Vercel functions and dev-server ──
import { checkPassword, isAuthed, sessionCookie } from './auth.js';
import { readManifest, writeManifest, savePhoto, deletePhoto, EMPTY_MANIFEST } from './storage.js';

const SECTIONS = ['gallery', 'heroDesktop', 'heroMobile'];
const MAX_UPLOAD = 8 * 1024 * 1024; // 8MB safety cap (photos arrive pre-compressed)

// body helpers — Vercel pre-parses req.body, plain node doesn't
async function bufferBody(req) {
  if (req.body !== undefined && req.body !== null) {
    if (Buffer.isBuffer(req.body)) return req.body;
    if (typeof req.body === 'string') return Buffer.from(req.body);
    return Buffer.from(JSON.stringify(req.body));
  }
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > MAX_UPLOAD) throw Object.assign(new Error('Payload too large'), { status: 413 });
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

async function jsonBody(req) {
  if (req.body !== undefined && req.body !== null && typeof req.body === 'object' && !Buffer.isBuffer(req.body)) {
    return req.body;
  }
  const buf = await bufferBody(req);
  try {
    return JSON.parse(buf.toString('utf8'));
  } catch {
    throw Object.assign(new Error('Invalid JSON'), { status: 400 });
  }
}

function send(res, status, data, headers = {}) {
  res.statusCode = status;
  for (const [k, v] of Object.entries(headers)) res.setHeader(k, v);
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(data));
}

function requireAuth(req, res) {
  if (isAuthed(req)) return true;
  send(res, 401, { error: 'Unauthorized' });
  return false;
}

// ── POST /api/auth {password} · GET /api/auth (session check) ──
export async function handleAuth(req, res) {
  if (req.method === 'GET') {
    return send(res, 200, { authed: isAuthed(req) }, { 'Cache-Control': 'no-store' });
  }
  if (req.method !== 'POST') return send(res, 405, { error: 'Method not allowed' });

  const { password } = await jsonBody(req);
  if (!checkPassword(password)) {
    return send(res, 401, { error: 'Incorrect password' });
  }
  send(res, 200, { ok: true }, { 'Set-Cookie': sessionCookie(req) });
}

// ── GET /api/manifest (public) · PUT (admin) ──────────────────
export async function handleManifest(req, res) {
  if (req.method === 'GET') {
    const manifest = await readManifest();
    return send(res, 200, manifest, { 'Cache-Control': 'no-store' });
  }
  if (req.method !== 'PUT') return send(res, 405, { error: 'Method not allowed' });
  if (!requireAuth(req, res)) return;

  const body = await jsonBody(req);
  // validate shape — only known sections, only known photo fields
  const manifest = { ...EMPTY_MANIFEST };
  for (const section of SECTIONS) {
    if (!Array.isArray(body[section])) continue;
    manifest[section] = body[section].map(p => ({
      id: String(p.id || ''),
      url: String(p.url || ''),
      name: String(p.name || ''),
      date: String(p.date || ''),
      w: Number(p.w) || null,
      h: Number(p.h) || null,
      hidden: !!p.hidden,
    })).filter(p => p.id && p.url);
  }
  await writeManifest(manifest);
  send(res, 200, { ok: true });
}

// ── POST /api/upload?section=gallery&name=foo.jpg (admin) ─────
export async function handleUpload(req, res) {
  if (req.method !== 'POST') return send(res, 405, { error: 'Method not allowed' });
  if (!requireAuth(req, res)) return;

  const url = new URL(req.url, 'http://x');
  const section = url.searchParams.get('section');
  const rawName = url.searchParams.get('name') || 'photo';
  if (!SECTIONS.includes(section)) return send(res, 400, { error: 'Invalid section' });

  const buffer = await bufferBody(req);
  if (!buffer.length) return send(res, 400, { error: 'Empty upload' });

  const slug = rawName.toLowerCase()
    .replace(/\.[a-z0-9]+$/, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60) || 'photo';
  const id = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
  const publicUrl = await savePhoto(`${section}/${id}-${slug}.webp`, buffer);

  send(res, 200, { ok: true, id, url: publicUrl });
}

// ── POST /api/delete {urls:[...]} (admin) ─────────────────────
export async function handleDelete(req, res) {
  if (req.method !== 'POST') return send(res, 405, { error: 'Method not allowed' });
  if (!requireAuth(req, res)) return;

  const { urls } = await jsonBody(req);
  if (!Array.isArray(urls)) return send(res, 400, { error: 'urls must be an array' });
  for (const u of urls) await deletePhoto(String(u));
  send(res, 200, { ok: true });
}

// wraps a handler with uniform error reporting
export function withErrors(handler) {
  return async (req, res) => {
    try {
      await handler(req, res);
    } catch (err) {
      console.error(err);
      send(res, err.status || 500, { 
        error: err.message || 'Server error',
        stack: err.stack,
        envKeys: Object.keys(process.env).filter(k => k.startsWith('BLOB_') || k.startsWith('VERCEL_'))
      });
    }
  };
}
