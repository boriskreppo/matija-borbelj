// ── Shared site behaviour ──────────────────────────────────────

// photo protection — uncomment before launch
// document.addEventListener('contextmenu', e => e.preventDefault());
// document.addEventListener('keydown', e => {
//   if ((e.ctrlKey || e.metaKey) && ['u', 'U', 's', 'S'].includes(e.key)) e.preventDefault();
//   if (e.key === 'F12') e.preventDefault();
// });

// mobile menu bar toggle
const menuBar = document.querySelector('.menu-bar');
if (menuBar) {
  menuBar.querySelector('.menu-toggle').addEventListener('click', () => {
    menuBar.classList.toggle('expanded');
  });
}
