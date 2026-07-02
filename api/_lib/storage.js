// ── Storage adapter ──────────────────────────────────────────
// Production (Vercel): photos + manifest live in Vercel Blob.
// Local dev (no BLOB_READ_WRITE_TOKEN): photos go to uploads/,
// manifest to .dev-data/manifest.json. Same API either way, so
// a later move to an own server only means a new adapter here.
import fs from 'node:fs/promises';
import path from 'node:path';

const useBlob = !!process.env.BLOB_READ_WRITE_TOKEN;
const ROOT = process.cwd();
const LOCAL_UPLOADS = path.join(ROOT, 'uploads');
const LOCAL_MANIFEST = path.join(ROOT, '.dev-data', 'manifest.json');
const MANIFEST_PATH = 'data/manifest.json';

export const EMPTY_MANIFEST = { gallery: [], heroDesktop: [], heroMobile: [] };

async function blob() {
  return import('@vercel/blob'); // lazy — local dev needs no node_modules
}

export async function readManifest() {
  if (useBlob) {
    const { list } = await blob();
    const { blobs } = await list({ prefix: MANIFEST_PATH });
    const entry = blobs.find(b => b.pathname === MANIFEST_PATH);
    if (!entry) return { ...EMPTY_MANIFEST };
    // cache-busting query — blob CDN caches aggressively
    const res = await fetch(`${entry.url}?v=${Date.now()}`);
    if (!res.ok) return { ...EMPTY_MANIFEST };
    return res.json();
  }
  try {
    return JSON.parse(await fs.readFile(LOCAL_MANIFEST, 'utf8'));
  } catch {
    return { ...EMPTY_MANIFEST };
  }
}

export async function writeManifest(manifest) {
  const json = JSON.stringify(manifest, null, 2);
  if (useBlob) {
    const { put } = await blob();
    await put(MANIFEST_PATH, json, {
      access: 'public',
      addRandomSuffix: false,
      allowOverwrite: true,
      contentType: 'application/json',
      cacheControlMaxAge: 60,
    });
    return;
  }
  await fs.mkdir(path.dirname(LOCAL_MANIFEST), { recursive: true });
  await fs.writeFile(LOCAL_MANIFEST, json);
}

// saves an already-processed webp; returns its public URL
export async function savePhoto(relPath, buffer) {
  if (useBlob) {
    const { put } = await blob();
    const res = await put(`photos/${relPath}`, buffer, {
      access: 'public',
      addRandomSuffix: false,
      contentType: 'image/webp',
      cacheControlMaxAge: 31536000, // photos are immutable (unique names)
    });
    return res.url;
  }
  const dest = path.join(LOCAL_UPLOADS, relPath);
  await fs.mkdir(path.dirname(dest), { recursive: true });
  await fs.writeFile(dest, buffer);
  return `/uploads/${relPath}`;
}

export async function deletePhoto(url) {
  if (useBlob) {
    if (!/\.blob\.vercel-storage\.com\//.test(url)) return; // only our blobs
    const { del } = await blob();
    await del(url);
    return;
  }
  // local: only ever delete inside uploads/
  if (!url.startsWith('/uploads/')) return;
  const target = path.normalize(path.join(ROOT, url));
  if (!target.startsWith(LOCAL_UPLOADS + path.sep)) return;
  await fs.rm(target, { force: true });
}
