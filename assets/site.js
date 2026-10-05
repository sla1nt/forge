/* Матрёшка — общие мелочи: меню на телефоне, «скопировать адрес», ближайший ивент по МСК,
   поиск по командам. Без библиотек. */
(function () {
  // меню на телефоне
  var burger = document.querySelector('.burger');
  var nav = document.querySelector('.nav');
  if (burger && nav) burger.addEventListener('click', function () { nav.classList.toggle('open'); });

  // скопировать адрес сервера
  document.querySelectorAll('.copy[data-copy]').forEach(function (b) {
    b.addEventListener('click', function () {
      var text = b.getAttribute('data-copy');
      var done = function () { var t = b.textContent; b.textContent = 'Скопировано'; b.classList.add('done');
        setTimeout(function () { b.textContent = t; b.classList.remove('done'); }, 1600); };
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done, function () { fallback(text); done(); });
      else { fallback(text); done(); }
    });
  });
  function fallback(text) {
    var t = document.createElement('textarea'); t.value = text; document.body.appendChild(t); t.select();
    try { document.execCommand('copy'); } catch (e) {} document.body.removeChild(t);
  }

  // Время по Москве (UTC+3, без перехода на летнее) — сервер живёт по нему.
  function mskNow() { var d = new Date(); return new Date(d.getTime() + d.getTimezoneOffset() * 60000 + 3 * 3600000); }
  function mins(hhmm) { var p = hhmm.split(':'); return (+p[0]) * 60 + (+p[1]); }
  function fmtLeft(m) { var h = Math.floor(m / 60), r = m % 60; return (h ? h + ' ч ' : '') + r + ' мин'; }

  // Ближайший ивент: строки таблицы с data-times="15:00,21:00".
  var rows = document.querySelectorAll('[data-times]');
  if (rows.length) {
    var tick = function () {
      var now = mskNow(), cur = now.getHours() * 60 + now.getMinutes();
      var best = null;
      rows.forEach(function (row) {
        var times = row.getAttribute('data-times').split(',');
        row.querySelectorAll('.chip').forEach(function (c) { c.classList.remove('next'); });
        times.forEach(function (t, i) {
          var left = (mins(t) - cur + 1440) % 1440;
          if (left === 0) left = 1440;
          if (!best || left < best.left) best = { left: left, row: row, i: i, t: t };
        });
      });
      var clock = document.getElementById('msk-clock');
      if (clock) clock.textContent = ('0' + now.getHours()).slice(-2) + ':' + ('0' + now.getMinutes()).slice(-2);
      if (best) {
        var chips = best.row.querySelectorAll('.chip');
        if (chips[best.i]) chips[best.i].classList.add('next');
        var nm = document.getElementById('next-name'), nw = document.getElementById('next-when');
        if (nm) nm.textContent = best.row.getAttribute('data-name');
        if (nw) nw.textContent = best.t + ' МСК — через ' + fmtLeft(best.left);
      }
    };
    tick(); setInterval(tick, 20000);
  }

  // Отсчёт до открытия: <div id="countdown" data-at="2026-10-09T19:00:00+03:00">.
  var cd = document.getElementById('countdown');
  if (cd) {
    var at = new Date(cd.getAttribute('data-at')).getTime();
    var upd = function () {
      var s = Math.floor((at - Date.now()) / 1000);
      if (s <= 0) { cd.textContent = 'Сервер открыт — заходи!'; return; }
      var d = Math.floor(s / 86400), h = Math.floor(s % 86400 / 3600), m = Math.floor(s % 3600 / 60), ss = s % 60;
      cd.textContent = 'до открытия: ' + (d ? d + ' д ' : '') + ('0' + h).slice(-2) + ':' + ('0' + m).slice(-2) + ':' + ('0' + ss).slice(-2);
    };
    upd(); setInterval(upd, 1000);
  }

  // Поиск по командам и фильтр по группам.
  var search = document.querySelector('.search');
  var cmds = document.querySelectorAll('.cmd');
  var filters = document.querySelectorAll('.filter');
  var empty = document.querySelector('.cmd-empty');
  var group = 'all';
  function apply() {
    var q = (search ? search.value : '').trim().toLowerCase();
    var shown = 0;
    cmds.forEach(function (c) {
      var ok = (group === 'all' || c.getAttribute('data-g') === group) && (!q || c.textContent.toLowerCase().indexOf(q) >= 0);
      c.style.display = ok ? '' : 'none'; if (ok) shown++;
    });
    document.querySelectorAll('.cmd-group').forEach(function (g) {
      var any = Array.prototype.some.call(g.querySelectorAll('.cmd'), function (c) { return c.style.display !== 'none'; });
      g.style.display = any ? '' : 'none';
    });
    if (empty) empty.style.display = shown ? 'none' : 'block';
  }
  if (search) search.addEventListener('input', apply);
  filters.forEach(function (f) {
    f.addEventListener('click', function () {
      filters.forEach(function (x) { x.classList.remove('on'); }); f.classList.add('on');
      group = f.getAttribute('data-g'); apply();
    });
  });
})();
