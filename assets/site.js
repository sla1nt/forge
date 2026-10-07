/* Матрёшка — общие мелочи: меню на телефоне, «скопировать адрес», ближайший ивент по МСК,
   поиск по командам. Без библиотек. */
(function () {
  // Язык страницы: <html lang="en"> — английские подписи (06.10).
  var EN = document.documentElement.lang === 'en';
  var L = function (ru, en) { return EN ? en : ru; };

  // Выбор языка: ссылки .lang-pick[data-lang] запоминают выбор; на главной без выбора —
  // английская версия для браузеров не на русском (и не на языках соседей).
  document.querySelectorAll('[data-lang]').forEach(function (a) {
    a.addEventListener('click', function () { try { localStorage.setItem('lang', a.getAttribute('data-lang')); } catch (e) { } });
  });
  var home = document.body.classList.contains('home');
  if (home) {
    var pick = null; try { pick = localStorage.getItem('lang'); } catch (e) { }
    var bl = (navigator.language || 'ru').toLowerCase();
    var want = pick || (/^(ru|uk|be|kk)/.test(bl) ? 'ru' : 'en');
    if (want === 'en' && !EN) location.replace('en/');
    else if (want === 'ru' && EN && pick) location.replace('../');
  }

  // меню на телефоне
  var burger = document.querySelector('.burger');
  var nav = document.querySelector('.nav');
  if (burger && nav) burger.addEventListener('click', function () { nav.classList.toggle('open'); });

  // Шапка (07.10): пункты меню не влезли в строку (длинные подписи, крупный шрифт) — прячем
  // их в «бургер», как на узком экране; при прокрутке шапка плотнее.
  var top = document.querySelector('.top');
  if (top && nav) {
    var wide = window.matchMedia('(min-width: 1081px)');
    var bar = top.querySelector('.wrap');
    var fit = function () {
      top.classList.remove('compact');
      if (wide.matches && (bar.scrollWidth > bar.clientWidth + 1 || nav.scrollWidth > nav.clientWidth + 1)) top.classList.add('compact');
    };
    var fitQueued = false;
    window.addEventListener('resize', function () {
      if (fitQueued) return; fitQueued = true;
      requestAnimationFrame(function () { fitQueued = false; fit(); });
    });
    fit();
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(fit);
    var onScroll = function () { top.classList.toggle('scrolled', window.scrollY > 8); };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  // Появление разделов при прокрутке (07.10). Без JS и при «меньше движения» всё видно сразу:
  // прячем только то, что ниже экрана, и только после того, как поставили html.rv.
  var still = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!still && 'IntersectionObserver' in window) {
    var BOX = '.evs, .feat, .pv, .econ, .road, .projects, .grid, .rule-list, .facts, .steps, .yn';
    var items = [];
    document.querySelectorAll('main section:not(.hero):not(.hero2):not(.open-top)').forEach(function (sec) {
      Array.prototype.forEach.call(sec.children, function (el) {
        if (/^(STYLE|SCRIPT)$/.test(el.tagName)) return;
        if (el.matches(BOX)) Array.prototype.push.apply(items, el.children);
        else items.push(el);
      });
    });
    var vh = window.innerHeight;
    items = items.filter(function (el) { return el.getBoundingClientRect().top > vh; });
    if (items.length) {
      document.documentElement.classList.add('rv');
      var done = function (el) { el.classList.remove('rv-i', 'in'); el.style.removeProperty('--i'); };
      var io = new IntersectionObserver(function (entries) {
        var n = 0;
        entries.forEach(function (e) {
          if (!e.isIntersecting) return;
          var el = e.target; io.unobserve(el);
          el.style.setProperty('--i', Math.min(n++, 5));
          el.classList.add('in');
          var end = function (ev) { if (!ev || ev.propertyName === 'opacity') { el.removeEventListener('transitionend', end); done(el); } };
          el.addEventListener('transitionend', end);
          setTimeout(end, 1600);
        });
      }, { rootMargin: '0px 0px -8% 0px', threshold: 0.01 });
      items.forEach(function (el) { el.classList.add('rv-i'); io.observe(el); });
    }
  }

  // скопировать адрес сервера
  document.querySelectorAll('.copy[data-copy]').forEach(function (b) {
    b.addEventListener('click', function () {
      var text = b.getAttribute('data-copy');
      var done = function () { var t = b.textContent; b.textContent = L('Скопировано', 'Copied'); b.classList.add('done');
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

  // Ближайший ивент: блоки с data-times="15:00,21:00" (МСК). До открытия (#countdown data-at)
  // счёт ведётся от момента открытия. #next-cd — крупный отсчёт ЧЧ:ММ:СС.
  var rows = document.querySelectorAll('[data-times]');
  if (rows.length) {
    var cdEl = document.getElementById('countdown');
    var openAt = cdEl ? new Date(cdEl.getAttribute('data-at')).getTime() : 0;
    var two = function (n) { return ('0' + n).slice(-2); };
    var tick = function () {
      var now = mskNow(), clock = document.getElementById('msk-clock');
      if (clock) clock.textContent = two(now.getHours()) + ':' + two(now.getMinutes());
      var wait = Math.max(0, Math.ceil((openAt - Date.now()) / 1000));
      var base = new Date(now.getTime() + wait * 1000);
      var cur = base.getHours() * 3600 + base.getMinutes() * 60 + base.getSeconds();
      var best = null;
      rows.forEach(function (row) {
        row.querySelectorAll('.chip').forEach(function (c) { c.classList.remove('next'); });
        row.getAttribute('data-times').split(',').forEach(function (t, i) {
          var left = (mins(t) * 60 - cur + 86400) % 86400;
          if (left === 0) left = 86400;
          if (!best || left < best.left) best = { left: left, row: row, i: i, t: t };
        });
      });
      if (!best) return;
      var chips = best.row.querySelectorAll('.chip');
      if (chips[best.i]) chips[best.i].classList.add('next');
      var all = best.left + wait;
      var nm = document.getElementById('next-name'), nw = document.getElementById('next-when'), nc = document.getElementById('next-cd');
      if (nm) nm.textContent = best.row.getAttribute('data-name');
      if (nw) nw.textContent = (wait ? L('первый после открытия · ', 'first after launch · ') : '') + L('в ', 'at ') + best.t + L(' МСК', ' MSK (UTC+3)');
      if (nc) { var d = Math.floor(all / 86400), h = Math.floor(all % 86400 / 3600);
        nc.textContent = (d ? d + L('д ', 'd ') : '') + two(h) + ':' + two(Math.floor(all % 3600 / 60)) + ':' + two(all % 60); }
    };
    tick(); setInterval(tick, 1000);
  }

  // Отсчёт до открытия: <div id="countdown" data-at="2026-10-09T19:00:00+03:00">.
  var cd = document.getElementById('countdown');
  if (cd) {
    var at = new Date(cd.getAttribute('data-at')).getTime();
    var upd = function () {
      var s = Math.floor((at - Date.now()) / 1000);
      if (s <= 0) { cd.textContent = L('Сервер открыт — заходи!', 'The server is open — join now!'); return; }
      var d = Math.floor(s / 86400), h = Math.floor(s % 86400 / 3600), m = Math.floor(s % 3600 / 60), ss = s % 60;
      cd.textContent = L('до открытия: ', 'launch in: ') + (d ? d + L(' д ', 'd ') : '') + ('0' + h).slice(-2) + ':' + ('0' + m).slice(-2) + ':' + ('0' + ss).slice(-2);
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
