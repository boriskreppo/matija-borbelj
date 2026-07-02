// ── Work gallery ───────────────────────────────────────────────
// Photos come from the CMS manifest (gallery section); the
// hardcoded imgs in work.html stay as fallback for local preview.
// Desktop: wheel → smooth horizontal scroll (lerp).
// Mobile: Lenis smooth vertical scroll.

const gallery = document.querySelector('.gallery');

// ── CMS sync ──
(async function initGallery() {
  const manifest = await window.loadManifest();
  const photos = (manifest?.gallery || []).filter(p => !p.hidden);
  if (!photos.length) return; // keep hardcoded fallback

  gallery.innerHTML = '';
  photos.forEach((p, i) => {
    const img = document.createElement('img');
    img.src = p.url;
    img.alt = '';
    img.draggable = false;
    if (p.w && p.h) {
      img.width = p.w;
      img.height = p.h;
    }
    if (p.scale && p.scale !== 100) {
      img.style.setProperty('--photo-scale', p.scale / 100);
    }
    if (p.customWidth) {
      img.style.setProperty('--custom-width', p.customWidth);
    }
    if (i > 1) img.loading = 'lazy';
    gallery.appendChild(img);
  });
  targetX = 0;
  gallery.scrollLeft = 0;
})();

// ── Mobile: Lenis smooth vertical scroll ──
let lenis = null;

function initLenis() {
  if (lenis) { lenis.destroy(); lenis = null; }
  if (window.innerWidth <= 768) {
    lenis = new Lenis({ duration: 1.2 });
  }
}

function raf(time) {
  if (lenis) lenis.raf(time);
  requestAnimationFrame(raf);
}

initLenis();
requestAnimationFrame(raf);
window.addEventListener('resize', initLenis);

// ── Desktop: smooth horizontal gallery scroll (lerp) ──
let targetX = 0;
let scrollTicking = false;

function stepScroll() {
  const diff = targetX - gallery.scrollLeft;
  if (Math.abs(diff) < 0.5) {
    gallery.scrollLeft = targetX;
    scrollTicking = false;
    return;
  }
  gallery.scrollLeft += diff * 0.09;
  requestAnimationFrame(stepScroll);
}

window.addEventListener('wheel', e => {
  if (window.innerWidth <= 768) return;
  const delta = Math.abs(e.deltaY) > Math.abs(e.deltaX) ? e.deltaY : e.deltaX;
  if (!delta) return;
  e.preventDefault();
  targetX = Math.max(0,
    Math.min(gallery.scrollWidth - gallery.clientWidth, targetX + delta));
  if (!scrollTicking) { scrollTicking = true; requestAnimationFrame(stepScroll); }
}, { passive: false });
