/* Small helpers shared by the newer simulations. */
window.Lab = (function () {
  var root = document.documentElement;
  function css(n) { return getComputedStyle(root).getPropertyValue(n).trim(); }
  function palette() {
    return { ink: css('--ink'), soft: css('--ink-soft'), line: css('--line'), card: css('--card'), mist: css('--mist'),
      river: css('--river'), moss: css('--moss'), silt: css('--silt'), good: css('--good'), warn: css('--warn'), bad: css('--bad'),
      sec: css('--sec') || css('--river'), display: css('--display') };
  }
  /* Canvas that stays sharp on phones and redraws on resize or theme change. draw(ctx, w, h, colours) */
  function canvas(el, draw) {
    var ctx = el.getContext('2d'), w = 0, h = 0, c = palette(), ready = false;
    function paint() { if (ready && w > 0) draw(ctx, w, h, c); }
    function redraw() { ready = true; paint(); }   // nothing is drawn until the page asks for the first frame
    function fit() {
      var r = el.getBoundingClientRect(), d = Math.min(window.devicePixelRatio || 1, 2);
      w = r.width; h = r.height;
      el.width = Math.max(1, Math.round(w * d)); el.height = Math.max(1, Math.round(h * d));
      ctx.setTransform(d, 0, 0, d, 0, 0); paint();
    }
    if (window.ResizeObserver) new ResizeObserver(fit).observe(el); else window.addEventListener('resize', fit);
    new MutationObserver(function () { c = palette(); paint(); }).observe(root, { attributes: true, attributeFilter: ['data-theme'] });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(paint);
    fit();
    return { redraw: redraw, el: el };
  }
  function $(id) { return document.getElementById(id); }
  function val(id) { return parseFloat($(id).value); }
  function out(id, text) { var o = $(id); if (o) o.textContent = text; }
  function on(ids, fn) { ids.forEach(function (id) { var e = $(id); e.addEventListener('input', fn); e.addEventListener('change', fn); }); fn(); }
  /* Segmented buttons: <div class="seg" id="x"><button data-v="a" aria-pressed="true">. Returns a getter. */
  function seg(id, fn) {
    var box = $(id), cur = box.querySelector('[aria-pressed=true]').getAttribute('data-v');
    box.addEventListener('click', function (e) {
      var b = e.target.closest('button'); if (!b) return;
      cur = b.getAttribute('data-v');
      Array.prototype.forEach.call(box.querySelectorAll('button'), function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); });
      fn(cur);
    });
    return function () { return cur; };
  }
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  /* Animation loop. step(dt) gets seconds since the last frame, capped so a hidden tab cannot jump. */
  function loop(step) {
    var run = false, last = 0, id = 0;
    function f(t) { if (!run) return; var dt = Math.min(0.05, (t - last) / 1000); last = t; step(dt); id = requestAnimationFrame(f); }
    return {
      start: function () { if (run) return; run = true; last = performance.now(); id = requestAnimationFrame(f); },
      stop: function () { run = false; cancelAnimationFrame(id); },
      running: function () { return run; }
    };
  }
  /* Pointer position inside a canvas, in CSS pixels. */
  function drag(el, fn) {
    var down = false;
    function at(e) { var r = el.getBoundingClientRect(); fn(e.clientX - r.left, e.clientY - r.top, r.width, r.height); }
    el.addEventListener('pointerdown', function (e) { down = true; el.setPointerCapture(e.pointerId); at(e); });
    el.addEventListener('pointermove', function (e) { if (down) at(e); });
    el.addEventListener('pointerup', function () { down = false; });
    el.addEventListener('pointercancel', function () { down = false; });
  }
  function fx(x, d) { return isFinite(x) ? x.toFixed(d == null ? 2 : d) : '--'; }
  function text(ctx, s, x, y, c, size, align, weight) {
    ctx.fillStyle = c; ctx.font = (weight || 600) + ' ' + (size || 12) + 'px "Bricolage Grotesque",system-ui,sans-serif';
    ctx.textAlign = align || 'left'; ctx.fillText(s, x, y);
  }
  return { canvas: canvas, $: $, val: val, out: out, on: on, seg: seg, loop: loop, drag: drag, fx: fx, text: text, reduce: reduce, palette: palette };
})();
