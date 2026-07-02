// ── Home hero slideshow ────────────────────────────────────────
// Photo sets come from the CMS manifest (heroDesktop / heroMobile);
// the hardcoded lists below are only a fallback for local preview
// without the dev server.

const FALLBACK_DESKTOP = [
  'assets/photos/hero-desktop/045-high-01-xxx.webp',
  'assets/photos/hero-desktop/00166-2.webp',
  'assets/photos/hero-desktop/011-high-01-xxx.webp',
  'assets/photos/hero-desktop/dsc-2130.webp',
];

const FALLBACK_MOBILE = [
  'assets/photos/hero-mobile/043-high-01-xxx.webp',
  'assets/photos/hero-mobile/020003810030-3.webp',
  'assets/photos/hero-mobile/012-high-01-xxx-2.webp',
  'assets/photos/hero-mobile/dsc-8849.webp',
];

const INTERVAL = 5000; // ms between slides
const hero = document.querySelector('.hero');
const mq = window.matchMedia('(max-width: 768px)');

let sets = { desktop: FALLBACK_DESKTOP, mobile: FALLBACK_MOBILE };
let slides = [];
let current = 0;
let timer = null;

function buildSlides() {
  clearInterval(timer);
  hero.innerHTML = '';
  const set = mq.matches ? sets.mobile : sets.desktop;

  slides = set.map((src, i) => {
    const img = document.createElement('img');
    img.className = 'hero-slide' + (i === 0 ? ' is-active' : '');
    img.src = src;
    img.alt = '';
    img.draggable = false;
    hero.appendChild(img);
    return img;
  });

  current = 0;
  if (slides.length > 1) {
    timer = setInterval(() => {
      slides[current].classList.remove('is-active');
      current = (current + 1) % slides.length;
      slides[current].classList.add('is-active');
    }, INTERVAL);
  }
}

(async function init() {
  const manifest = await window.loadManifest();
  const desktop = (manifest?.heroDesktop || []).filter(p => !p.hidden).map(p => p.url);
  const mobile = (manifest?.heroMobile || []).filter(p => !p.hidden).map(p => p.url);
  if (desktop.length) sets.desktop = desktop;
  if (mobile.length) sets.mobile = mobile;

  buildSlides();
  mq.addEventListener('change', buildSlides);
})();
