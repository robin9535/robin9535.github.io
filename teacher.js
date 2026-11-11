/* Teacher lessons. A lesson is a simulation plus questions that are checked against the simulation itself.
   Teacher.lesson({ key, controls, derive, reads, draw, animate, questions, next })
   controls : [{ id, label, min, max, step, value, unit, dp, fmt }] or [{ id, label, options: [[value, name]], value, text }]
   reads    : [[key, label, function (s) -> text]]
   questions: { type: 'mcq', q, options, answer, why }
              { type: 'num', q, unit, answer: function (s), tol, abs, hint, why, hide: [read keys or 'o_' + control id] }
              { type: 'task', q, check: function (s), hint, why }
   q, hint and why may be text or a function of the live state s. */
window.Teacher = (function () {
  var L = Lab;
  function val(x, s) { return typeof x === 'function' ? x(s) : (x || ''); }
  function lesson(o) {
    var s = {}, t = 0, hide = {}, qi = 0, score = 0, tries = 0, solved = false, Q = o.questions, box = L.$('teacher');
    s.hidden = function (k) { return !!hide[k]; };
    o.controls.forEach(function (c) {
      var lab = document.createElement('label'); lab.className = 'ctl';
      if (c.options) lab.innerHTML = '<span>' + c.label + '</span><select id="c_' + c.id + '">' + c.options.map(function (p) { return '<option value="' + p[0] + '">' + p[1] + '</option>'; }).join('') + '</select>';
      else lab.innerHTML = '<span>' + c.label + ' <output id="o_' + c.id + '"></output></span><input type="range" id="c_' + c.id + '" min="' + c.min + '" max="' + c.max + '" step="' + c.step + '" value="' + c.value + '">';
      L.$('ctls').appendChild(lab);
      var e = L.$('c_' + c.id); if (c.options && c.value != null) e.value = c.value;
      e.addEventListener('input', update); e.addEventListener('change', update);
    });
    L.$('reads').innerHTML = o.reads.map(function (r) { return '<div class="read"><small>' + r[1] + '</small><b id="r_' + r[0] + '"></b></div>'; }).join('');
    var cv = L.canvas(L.$('cv'), function (ctx, w, h, c) { ctx.clearRect(0, 0, w, h); o.draw(ctx, w, h, c, s, t); });
    function update() {
      o.controls.forEach(function (c) { var e = L.$('c_' + c.id); s[c.id] = c.text ? e.value : parseFloat(e.value); if (c.options) s[c.id + 'Name'] = e.options[e.selectedIndex].text; });
      if (o.derive) o.derive(s);
      o.controls.forEach(function (c) { if (!c.options) L.out('o_' + c.id, hide['o_' + c.id] ? '?' : c.fmt ? c.fmt(s[c.id], s) : s[c.id].toFixed(c.dp || 0) + (c.unit || '')); });
      o.reads.forEach(function (r) { L.out('r_' + r[0], hide[r[0]] ? '?' : r[2](s)); });
      cv.redraw();
      var q = Q[qi]; if (!q || solved) return;
      L.$('tq').innerHTML = val(q.q, s);
      if (q.type === 'task' && q.check(s)) done();
    }
    function fb(text, cls) { var f = L.$('tf'); f.className = 't-fb ' + (cls || ''); f.innerHTML = text; }
    function done(shown) {
      var q = Q[qi]; solved = true; if (!shown && tries === 0) score++;
      hide = {}; fb((shown ? '' : 'Correct. ') + val(q.why, s), shown ? '' : 'ok');
      var tt = L.$('tt'); if (tt) { tt.className = 't-task ok'; tt.textContent = 'Done.'; }
      L.$('tn').hidden = false; L.$('th').hidden = true; var ts = L.$('ts'); if (ts) ts.hidden = true;
      update();
    }
    function show() {
      var q = Q[qi]; tries = 0; solved = false; hide = {}; (q.hide || []).forEach(function (k) { hide[k] = 1; });
      var h = '<div class="t-head"><h2>Teacher</h2><span>Question ' + (qi + 1) + ' of ' + Q.length + '</span></div><div class="t-dots" aria-hidden="true">' + Q.map(function (_, i) { return '<i class="' + (i < qi ? 'd' : i === qi ? 'c' : '') + '"></i>'; }).join('') + '</div><p class="t-q" id="tq"></p>';
      if (q.type === 'mcq') h += '<div class="t-opts">' + q.options.map(function (x, i) { return '<button type="button" data-i="' + i + '">' + x + '</button>'; }).join('') + '</div>';
      if (q.type === 'num') h += '<div class="t-num"><input id="ta" type="number" step="any" inputmode="decimal" aria-label="Your answer"><span>' + (q.unit || '') + '</span><button class="go main" type="button" id="tc">Check</button></div>';
      if (q.type === 'task') h += '<p class="t-task" id="tt">Not there yet. Use the controls above.</p>';
      h += '<p class="t-fb" id="tf" role="status"></p><div class="acts"><button class="go" type="button" id="th"' + (q.hint ? '' : ' hidden') + '>Give me a hint</button><button class="go" type="button" id="ts" hidden>Show the answer</button><button class="go main" type="button" id="tn" hidden>' + (qi < Q.length - 1 ? 'Next question' : 'See my result') + '</button></div>';
      box.innerHTML = h; update();
    }
    function check() {
      var q = Q[qi], x = parseFloat(L.$('ta').value), a = q.answer(s);
      if (!isFinite(x)) return fb('Type a number first.', 'no');
      if (isFinite(a) && Math.abs(x - a) <= Math.max(q.abs || 0, (q.tol == null ? 0.02 : q.tol) * Math.abs(a), 1e-9)) return done();
      tries++; fb(!isFinite(a) ? 'There is no answer for the current settings. Change the controls and try again.' : 'Not yet. Your answer is too ' + (x > a ? 'high' : 'low') + '.', 'no');
      if (tries >= 2) L.$('ts').hidden = false;
    }
    function finish() {
      var n = Q.length, msg = score === n ? 'Every one right first time. You have this chapter.' : score >= n - 1 ? 'Nearly perfect. Look again at the one you missed.' : score >= n / 2 ? 'A fair start. Run it again and aim for a clean sheet.' : 'This chapter needs another pass. Play with the controls, then try again.';
      try { var k = 'teach:' + o.key, old = JSON.parse(localStorage.getItem(k) || 'null'); if (!old || score > old.best) localStorage.setItem(k, JSON.stringify({ best: score, n: n })); } catch (e) {}
      box.innerHTML = '<div class="t-head"><h2>Teacher</h2><span>Finished</span></div><p class="t-score">' + score + ' of ' + n + '</p><p class="t-q">right on the first try. ' + msg + '</p><div class="acts"><button class="go" type="button" id="tr">Start again</button>' + (o.next ? '<a class="go main" style="text-decoration:none" href="' + o.next[0] + '">Next: ' + o.next[1] + '</a>' : '') + '</div>';
      qi = Q.length; update();
    }
    box.addEventListener('click', function (e) {
      var b = e.target.closest('button'); if (!b) return; var q = Q[qi];
      if (b.id === 'tr') { qi = 0; score = 0; return show(); }
      if (b.id === 'tn') { qi++; return qi < Q.length ? show() : finish(); }
      if (b.id === 'th') return fb(val(q.hint, s));
      if (b.id === 'tc') return check();
      if (b.id === 'ts') { var a = q.answer(s); return done(true), fb('The answer is ' + (+a.toPrecision(4)) + ' ' + (q.unit || '') + '. ' + val(q.why, s)); }
      if (b.hasAttribute('data-i') && !solved) {
        if (+b.getAttribute('data-i') === q.answer) { b.className = 'ok'; done(); }
        else { b.className = 'no'; b.disabled = true; tries++; fb('Not that one. Think again, or test it on the simulation.', 'no'); }
      }
    });
    box.addEventListener('keydown', function (e) { if (e.key === 'Enter' && e.target.id === 'ta') check(); });
    show();
    if (o.animate && !L.reduce) L.loop(function (dt) { t += dt; cv.redraw(); }).start();
  }
  /* On a course list, show the best score saved for each lesson. */
  function progress() {
    Array.prototype.forEach.call(document.querySelectorAll('[data-prog]'), function (el) {
      try { var p = JSON.parse(localStorage.getItem('teach:' + el.getAttribute('data-prog')) || 'null'); if (p) { el.textContent = p.best + ' of ' + p.n; el.hidden = false; } } catch (e) {}
    });
  }
  return { lesson: lesson, progress: progress };
})();
