// ── Shared manifest loader ─────────────────────────────────────
// The CMS manifest is the source of truth for gallery + hero sets.
// Returns null when unavailable (e.g. opened as a plain file) —
// pages then keep their hardcoded fallback content.
window.loadManifest = async function loadManifest() {
  try {
    const res = await fetch('/api/manifest', { cache: 'no-store' });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
};
