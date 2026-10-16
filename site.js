/* Shared behaviour: nav, Tools menu, theme toggle, scroll progress bar */
(function () {
  var $ = function (id) { return document.getElementById(id); };
  var nav = $('nav'), links = $('links'), burger = $('burger'), themeBtn = $('theme');

  // always-solid nav on tool pages
  var alwaysSolid = nav && nav.hasAttribute('data-solid');
  function onScroll() {
    if (nav) nav.classList.toggle('solid', alwaysSolid || window.scrollY > 40);
    var bar = $('progress');
    if (bar) {
      var max = document.documentElement.scrollHeight - window.innerHeight;
      bar.style.transform = 'scaleX(' + (max > 0 ? Math.min(1, window.scrollY / max) : 0) + ')';
    }
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  onScroll();

  // mobile menu
  if (burger && links) {
    burger.addEventListener('click', function () {
      var open = !links.classList.contains('open');
      links.classList.toggle('open', open);
      burger.setAttribute('aria-expanded', open);
      burger.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    });
    links.addEventListener('click', function (e) {
      if (e.target.closest && e.target.closest('a')) { links.classList.remove('open'); burger.setAttribute('aria-expanded', 'false'); }
    });
  }

  // Tools dropdown (desktop). On small screens the list is always shown inside the mobile menu.
  var dd = document.querySelector('.dd'), ddBtn = dd && dd.querySelector('.dd-btn');
  if (dd && ddBtn) {
    var setDd = function (open) { dd.classList.toggle('open', open); ddBtn.setAttribute('aria-expanded', open ? 'true' : 'false'); };
    ddBtn.addEventListener('click', function (e) { e.stopPropagation(); setDd(!dd.classList.contains('open')); });
    document.addEventListener('click', function (e) { if (!dd.contains(e.target)) setDd(false); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && dd.classList.contains('open')) { setDd(false); ddBtn.focus(); } });
    dd.addEventListener('focusout', function (e) { if (e.relatedTarget && !dd.contains(e.relatedTarget)) setDd(false); });
  }

  // theme
  function setTheme(t) {
    document.documentElement.setAttribute('data-theme', t);
    if (themeBtn) {
      themeBtn.innerHTML = t === 'dark' ? '<i class="fa-solid fa-sun"></i>' : '<i class="fa-solid fa-moon"></i>';
      themeBtn.setAttribute('aria-label', t === 'dark' ? 'Switch to light theme' : 'Switch to dark theme');
    }
    try { localStorage.setItem('theme', t); } catch (e) {}
  }
  if (themeBtn) {
    var saved = null;
    try { saved = localStorage.getItem('theme'); } catch (e) {}
    if (!saved && window.matchMedia('(prefers-color-scheme: dark)').matches) saved = 'dark';
    if (saved) setTheme(saved);
    themeBtn.addEventListener('click', function () {
      setTheme(document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark');
    });
  }
})();
