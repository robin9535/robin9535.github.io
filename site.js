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

/* Live air-quality clock: cycles through Bangladesh's eight divisions.
   Data: CAMS atmospheric model via Open-Meteo (modelled estimate, not a ground monitor). */
(function () {
  var host = document.querySelector('.nav .tools');
  if (!host || !window.fetch) return;
  var DIV = [
    ['Dhaka', 23.8103, 90.4125], ['Chattogram', 22.3569, 91.7832], ['Rajshahi', 24.3745, 88.6042], ['Khulna', 22.8456, 89.5403],
    ['Barishal', 22.7010, 90.3535], ['Sylhet', 24.8949, 91.8687], ['Rangpur', 25.7439, 89.2752], ['Mymensingh', 24.7471, 90.4203]
  ];
  var CAT = [[50, 'Good', '#5fd27a'], [100, 'Moderate', '#f2d04a'], [150, 'Unhealthy for sensitive groups', '#f59b3a'], [200, 'Unhealthy', '#ef5b4c'], [300, 'Very unhealthy', '#b36ad8'], [1e9, 'Hazardous', '#d9476b']];
  var SHORT = ['Good', 'Moderate', 'Sensitive', 'Unhealthy', 'Very unhealthy', 'Hazardous'];
  var STEP = 6000, REFRESH = 600000, KEY = 'aqBD1';
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function cat(v) { for (var i = 0; i < CAT.length; i++) if (v <= CAT[i][0]) return i; return CAT.length - 1; }
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;'); }

  var box = document.createElement('div'); box.className = 'aq';
  box.innerHTML = '<button class="aq-btn" type="button" aria-expanded="false" aria-controls="aqPop" aria-label="Air quality in Bangladesh divisions. Open details">' +
    '<span class="aq-ring" id="aqRing"><b id="aqNum">--</b></span>' +
    '<span class="aq-txt" id="aqTxt"><strong id="aqName">Air quality</strong><small id="aqSub">Loading</small></span></button>' +
    '<div class="aq-pop" id="aqPop" role="dialog" aria-label="Air quality by division"><h3>Air quality by division</h3>' +
    '<p>US AQI and PM2.5 now. Cycles automatically; hover or open this panel to pause.</p><ul id="aqList"></ul>' +
    '<footer id="aqFoot"></footer></div>';
  host.insertBefore(box, host.firstChild);
  var btn = box.querySelector('.aq-btn'), ring = box.querySelector('#aqRing'), num = box.querySelector('#aqNum'),
      nameEl = box.querySelector('#aqName'), sub = box.querySelector('#aqSub'), txt = box.querySelector('#aqTxt'),
      list = box.querySelector('#aqList'), foot = box.querySelector('#aqFoot');

  var rows = null, updated = '', idx = 0, elapsed = 0, paused = false, last = Date.now();

  function show() {
    if (!rows) return;
    var r = rows[idx]; if (!r) return;
    var k = r.aqi == null ? -1 : cat(r.aqi), col = k < 0 ? '#8fa8a5' : CAT[k][2];
    ring.style.setProperty('--c', col);
    num.textContent = r.aqi == null ? '--' : Math.round(r.aqi);
    nameEl.textContent = DIV[idx][0];
    sub.textContent = (k < 0 ? 'No data' : SHORT[k]) + (r.pm == null ? '' : ' · PM2.5 ' + Math.round(r.pm));
    txt.classList.remove('sw'); void txt.offsetWidth; if (!reduce) txt.classList.add('sw');
    var lis = list.children; for (var i = 0; i < lis.length; i++) lis[i].classList.toggle('cur', i === idx);
    btn.setAttribute('aria-label', 'Air quality in ' + DIV[idx][0] + ': AQI ' + (r.aqi == null ? 'not available' : Math.round(r.aqi) + ', ' + (k < 0 ? '' : CAT[k][1])) + '. Open details for all divisions');
  }
  function build() {
    list.innerHTML = rows.map(function (r, i) {
      var k = r.aqi == null ? -1 : cat(r.aqi), col = k < 0 ? '#8fa8a5' : CAT[k][2];
      return '<li style="--c:' + col + '"><i></i><div>' + esc(DIV[i][0]) + '<em>' + (k < 0 ? '' : esc(SHORT[k])) + '</em></div><span>' + (r.aqi == null ? '--' : Math.round(r.aqi)) + (r.pm == null ? '' : ' · ' + Math.round(r.pm)) + '</span></li>';
    }).join('');
    foot.innerHTML = 'Modelled estimate (Copernicus CAMS via <a href="https://open-meteo.com/" target="_blank" rel="noopener noreferrer">Open-Meteo</a>), not a ground monitor. Numbers: US AQI · PM2.5 µg/m³.' + (updated ? ' Model time ' + esc(updated) + ' (Bangladesh time).' : '');
  }
  function parse(j) {
    var arr = Array.isArray(j) ? j : [j];
    if (arr.length !== DIV.length) throw new Error('shape');
    updated = (arr[0].current && arr[0].current.time || '').replace('T', ' ');
    return arr.map(function (o) { var c = o.current || {}; return { aqi: isFinite(c.us_aqi) ? c.us_aqi : null, pm: isFinite(c.pm2_5) ? c.pm2_5 : null }; });
  }
  function apply(j) { rows = parse(j); build(); show(); }
  function load(force) {
    if (!force) { try { var c = JSON.parse(sessionStorage.getItem(KEY) || 'null'); if (c && Date.now() - c.t < REFRESH) { apply(c.d); return; } } catch (e) {} }
    var url = 'https://air-quality-api.open-meteo.com/v1/air-quality?latitude=' + DIV.map(function (d) { return d[1]; }).join(',') +
      '&longitude=' + DIV.map(function (d) { return d[2]; }).join(',') + '&current=us_aqi,pm2_5&timezone=Asia%2FDhaka';
    var ctl = window.AbortController ? new AbortController() : null, to = setTimeout(function () { if (ctl) ctl.abort(); }, 12000);
    fetch(url, ctl ? { signal: ctl.signal } : {}).then(function (r) { clearTimeout(to); if (!r.ok) throw new Error('http'); return r.json(); })
      .then(function (j) { apply(j); try { sessionStorage.setItem(KEY, JSON.stringify({ t: Date.now(), d: j })); } catch (e) {} })
      .catch(function () { clearTimeout(to); if (!rows) { nameEl.textContent = 'Air quality'; sub.textContent = 'Unavailable'; num.textContent = '--'; } });
  }

  function tick() {
    var now = Date.now(), dt = now - last; last = now;
    if (paused || document.hidden || !rows) return;
    elapsed += dt;
    if (elapsed >= STEP) { elapsed = 0; idx = (idx + 1) % DIV.length; show(); }
    ring.style.setProperty('--p', Math.min(100, elapsed / STEP * 100));
  }
  setInterval(tick, reduce ? 1000 : 120);
  setInterval(function () { load(true); }, REFRESH);

  function setOpen(o) { box.classList.toggle('open', o); btn.setAttribute('aria-expanded', o ? 'true' : 'false'); paused = o || box.matches(':hover'); }
  btn.addEventListener('click', function (e) { e.stopPropagation(); setOpen(!box.classList.contains('open')); });
  box.addEventListener('mouseenter', function () { paused = true; });
  box.addEventListener('mouseleave', function () { paused = box.classList.contains('open'); });
  document.addEventListener('click', function (e) { if (!box.contains(e.target)) setOpen(false); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && box.classList.contains('open')) { setOpen(false); btn.focus(); } });
  load(false);
})();
