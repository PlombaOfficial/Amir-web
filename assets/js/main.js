/* =========================================================
   Amir Web — скрипты сайта

   Блоки: настройки → тема → язык → панель настроек → шапка →
   меню → вопросы → появление блоков → нижняя кнопка → мелочи.

   Всё необязательное: если скрипт не загрузится, сайт остаётся
   читаемым и рабочим — тексты в разметке, ссылки настоящие.
   ========================================================= */
(function () {
  'use strict';

  var STORE_KEY = 'amirweb:settings';
  var DEFAULTS = { theme: 'system', lang: 'ru', motion: 'auto' };
  var root = document.documentElement;
  var i18n = window.AmirI18n;

  /* ---------- Настройки: чтение и запись ---------- */
  var settings = (function () {
    var saved = {};
    try { saved = JSON.parse(localStorage.getItem(STORE_KEY) || '{}'); } catch (e) { saved = {}; }
    var s = {};
    for (var k in DEFAULTS) s[k] = saved[k] || DEFAULTS[k];
    return s;
  })();

  function save() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(settings)); } catch (e) { /* приватный режим */ }
  }

  var darkQuery = window.matchMedia('(prefers-color-scheme: dark)');
  var motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

  function motionOff() {
    return settings.motion === 'reduced' || motionQuery.matches;
  }

  /* ---------- Тема ---------- */
  function applyTheme(animated) {
    var dark = settings.theme === 'dark' ||
               (settings.theme === 'system' && darkQuery.matches);

    // Плавный переход цвета включаем только на время самой смены,
    // иначе каждое наведение мыши тянуло бы за собой лишние пересчёты.
    if (animated && !motionOff()) {
      root.classList.add('is-theming');
      window.setTimeout(function () { root.classList.remove('is-theming'); }, 360);
    }
    root.setAttribute('data-theme', dark ? 'dark' : 'light');

    // Цвет системной панели на телефоне. Статические теги в <head>
    // завязаны на настройку системы — когда человек выбрал тему сам,
    // они врут, поэтому заменяем их одним точным.
    var metas = document.querySelectorAll('meta[name="theme-color"]');
    Array.prototype.forEach.call(metas, function (m) { m.remove(); });
    var meta = document.createElement('meta');
    meta.name = 'theme-color';
    meta.content = dark ? '#0A181F' : '#FCFBF8';
    document.head.appendChild(meta);
  }

  darkQuery.addEventListener('change', function () {
    if (settings.theme === 'system') applyTheme(true);
  });

  /* ---------- Бережный режим ---------- */
  function applyMotion() {
    if (settings.motion === 'reduced') root.setAttribute('data-motion', 'reduced');
    else root.removeAttribute('data-motion');
    syncLoops();
  }

  /* ---------- Язык ---------- */
  function applyLang(lang, updateUrl) {
    if (!i18n || i18n.langs.indexOf(lang) === -1) lang = 'ru';
    settings.lang = lang;
    root.setAttribute('lang', lang);

    // Текст
    each('[data-i18n]', function (el) {
      var val = i18n.t(lang, el.getAttribute('data-i18n'));
      if (val) el.textContent = val;
    });
    // Значения с разметкой внутри (переносы строки, выделения)
    each('[data-i18n-html]', function (el) {
      var val = i18n.t(lang, el.getAttribute('data-i18n-html'));
      if (val) el.innerHTML = val;
    });
    // Атрибуты: data-i18n-attr="aria-label:ключ"
    each('[data-i18n-attr]', function (el) {
      el.getAttribute('data-i18n-attr').split(',').forEach(function (pair) {
        var bits = pair.split(':');
        if (bits.length === 2) {
          var val = i18n.t(lang, bits[1].trim());
          if (val) el.setAttribute(bits[0].trim(), val);
        }
      });
    });

    document.title = i18n.t(lang, 'meta.title');
    var desc = document.querySelector('meta[name="description"]');
    if (desc) desc.setAttribute('content', i18n.t(lang, 'meta.description'));

    var code = document.getElementById('prefs-code');
    if (code) code.textContent = lang.toUpperCase();

    // Бургер и кнопка настроек показывают состояние текстом — обновляем
    if (burger) {
      burger.setAttribute('aria-label', i18n.t(lang,
        burger.getAttribute('aria-expanded') === 'true' ? 'a11y.closeMenu' : 'a11y.openMenu'));
    }

    // Адрес страницы: русский — корень, остальные — ?lang=
    if (updateUrl && window.history && history.replaceState) {
      var url = new URL(window.location.href);
      if (lang === 'ru') url.searchParams.delete('lang');
      else url.searchParams.set('lang', lang);
      history.replaceState(null, '', url.pathname + url.search + url.hash);
    }

    var canonical = document.querySelector('link[rel="canonical"]');
    if (canonical) {
      canonical.setAttribute('href',
        lang === 'ru' ? 'https://amir-web.kz/' : 'https://amir-web.kz/?lang=' + lang);
    }
  }

  function each(sel, fn) {
    Array.prototype.forEach.call(document.querySelectorAll(sel), fn);
  }

  /* Перевод всегда другой длины: английский короче русского, и страница
     после переключения становится ниже. Если человек читал середину,
     текст уехал бы у него из-под глаз. Поэтому запоминаем секцию,
     которая сейчас вверху экрана, и после подстановки возвращаем её
     на то же место — переключение выглядит неподвижным. */
  function keepingPlace(fn) {
    var sections = document.querySelectorAll('main section[id]');
    var ref = null, refTop = 0;

    for (var i = 0; i < sections.length; i++) {
      var top = sections[i].getBoundingClientRect().top;
      if (top <= 140) { ref = sections[i]; refTop = top; }
    }

    fn();

    if (!ref || window.scrollY <= 0) return;
    var delta = ref.getBoundingClientRect().top - refTop;
    if (!delta) return;
    try { window.scrollBy({ top: delta, behavior: 'instant' }); }
    catch (e) { window.scrollBy(0, delta); }
  }

  /* ---------- Панель настроек ---------- */
  var prefsBtn = document.getElementById('prefs-btn');
  var prefs = document.getElementById('prefs');
  var prefsClose = document.getElementById('prefs-close');
  var prefsReset = document.getElementById('prefs-reset');
  var lastFocused = null;

  function syncControls() {
    each('.segmented[data-pref] button', function (btn) {
      var group = btn.parentNode.getAttribute('data-pref');
      var on = settings[group] === btn.getAttribute('data-value');
      btn.setAttribute('aria-checked', on ? 'true' : 'false');
      btn.tabIndex = on ? 0 : -1;
    });
    var sw = document.querySelector('.switch[data-pref="motion"]');
    if (sw) sw.setAttribute('aria-checked', settings.motion === 'reduced' ? 'true' : 'false');
  }

  function openPrefs() {
    lastFocused = document.activeElement;
    prefs.hidden = false;
    prefsBtn.setAttribute('aria-expanded', 'true');
    requestAnimationFrame(function () { prefs.classList.add('is-open'); });
    var checked = prefs.querySelector('[aria-checked="true"]');
    (checked || prefsClose).focus();
  }

  function closePrefs() {
    prefs.classList.remove('is-open');
    prefsBtn.setAttribute('aria-expanded', 'false');
    window.setTimeout(function () {
      if (prefsBtn.getAttribute('aria-expanded') === 'false') prefs.hidden = true;
    }, motionOff() ? 0 : 280);
    if (lastFocused) lastFocused.focus();
  }

  function prefsOpen() { return prefsBtn && prefsBtn.getAttribute('aria-expanded') === 'true'; }

  if (prefsBtn && prefs) {
    prefsBtn.addEventListener('click', function () {
      prefsOpen() ? closePrefs() : openPrefs();
    });
    prefsClose.addEventListener('click', closePrefs);

    // щелчок мимо панели закрывает её
    prefs.addEventListener('mousedown', function (e) {
      if (e.target === prefs) closePrefs();
    });

    // выбор варианта: язык или тема
    each('.segmented[data-pref]', function (group) {
      var name = group.getAttribute('data-pref');
      var buttons = Array.prototype.slice.call(group.querySelectorAll('button'));

      group.addEventListener('click', function (e) {
        var btn = e.target.closest('button');
        if (!btn) return;
        settings[name] = btn.getAttribute('data-value');
        save();
        syncControls();
        if (name === 'theme') applyTheme(true);
        if (name === 'lang') keepingPlace(function () { applyLang(settings.lang, true); });
      });

      // стрелками — как в настоящей группе переключателей
      group.addEventListener('keydown', function (e) {
        var i = buttons.indexOf(document.activeElement);
        if (i === -1) return;
        var next = null;
        if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next = buttons[(i + 1) % buttons.length];
        if (e.key === 'ArrowLeft'  || e.key === 'ArrowUp')   next = buttons[(i - 1 + buttons.length) % buttons.length];
        if (e.key === 'Home') next = buttons[0];
        if (e.key === 'End')  next = buttons[buttons.length - 1];
        if (!next) return;
        e.preventDefault();
        next.focus();
        next.click();
      });
    });

    // тумблер «меньше движения»
    var motionSwitch = document.querySelector('.switch[data-pref="motion"]');
    if (motionSwitch) {
      motionSwitch.addEventListener('click', function () {
        settings.motion = settings.motion === 'reduced' ? 'auto' : 'reduced';
        save();
        syncControls();
        applyMotion();
      });
    }

    prefsReset.addEventListener('click', function () {
      try { localStorage.removeItem(STORE_KEY); } catch (e) { /* ничего */ }
      for (var k in DEFAULTS) settings[k] = DEFAULTS[k];
      syncControls();
      applyTheme(true);
      applyMotion();
      applyLang(settings.lang, true);
    });

    // фокус не уходит из открытой панели
    prefs.addEventListener('keydown', function (e) {
      if (e.key !== 'Tab') return;
      var items = prefs.querySelectorAll('button:not([tabindex="-1"])');
      if (!items.length) return;
      var first = items[0], last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    });
  }

  /* ---------- Шапка: тень при прокрутке ---------- */
  /* Раньше это был обработчик scroll, срабатывавший на каждый пиксель.
     Наблюдатель за меткой в начале страницы делает то же самое, но
     будит браузер лишь дважды: когда метка ушла и когда вернулась. */
  var header = document.getElementById('header');
  if (header) {
    var sentinel = document.createElement('div');
    sentinel.setAttribute('aria-hidden', 'true');
    sentinel.style.cssText = 'position:absolute;top:0;left:0;width:1px;height:8px;pointer-events:none;';
    document.body.prepend(sentinel);

    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) {
        header.classList.toggle('is-stuck', !entries[0].isIntersecting);
      }).observe(sentinel);
    }
  }

  /* ---------- Меню на телефоне ---------- */
  var burger = document.getElementById('burger');
  var menu = document.getElementById('mobile-menu');

  function openMenu() {
    menu.hidden = false;
    document.body.classList.add('is-locked');
    burger.setAttribute('aria-expanded', 'true');
    burger.setAttribute('aria-label', i18n ? i18n.t(settings.lang, 'a11y.closeMenu') : 'Закрыть меню');
    requestAnimationFrame(function () { menu.classList.add('is-open'); });
  }

  function closeMenu() {
    menu.classList.remove('is-open');
    document.body.classList.remove('is-locked');
    burger.setAttribute('aria-expanded', 'false');
    burger.setAttribute('aria-label', i18n ? i18n.t(settings.lang, 'a11y.openMenu') : 'Открыть меню');
    window.setTimeout(function () {
      if (burger.getAttribute('aria-expanded') === 'false') menu.hidden = true;
    }, motionOff() ? 0 : 280);
  }

  if (burger && menu) {
    burger.addEventListener('click', function () {
      burger.getAttribute('aria-expanded') === 'true' ? closeMenu() : openMenu();
    });

    menu.addEventListener('click', function (e) {
      if (e.target.closest('a')) closeMenu();
    });

    window.addEventListener('resize', function () {
      if (window.innerWidth >= 900 && burger.getAttribute('aria-expanded') === 'true') closeMenu();
    });
  }

  /* Esc закрывает то, что открыто сейчас */
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    if (prefsOpen()) { closePrefs(); return; }
    if (burger && burger.getAttribute('aria-expanded') === 'true') {
      closeMenu();
      burger.focus();
    }
  });

  /* ---------- Вопросы и ответы ---------- */
  var faqItems = document.querySelectorAll('.faq__item');

  Array.prototype.forEach.call(faqItems, function (item) {
    var btn = item.querySelector('.faq__q');

    btn.addEventListener('click', function () {
      var willOpen = !item.classList.contains('is-open');

      // открыт всегда только один вопрос — так список остаётся коротким
      Array.prototype.forEach.call(faqItems, function (other) {
        other.classList.remove('is-open');
        other.querySelector('.faq__q').setAttribute('aria-expanded', 'false');
      });

      if (willOpen) {
        item.classList.add('is-open');
        btn.setAttribute('aria-expanded', 'true');
      }
    });
  });

  /* ---------- Плавное появление блоков ---------- */
  var revealables = document.querySelectorAll('.reveal');

  Array.prototype.forEach.call(revealables, function (el) {
    if (el.dataset.d) el.style.setProperty('--d', el.dataset.d);
  });

  function showAll() {
    Array.prototype.forEach.call(revealables, function (el) { el.classList.add('is-in'); });
  }

  if (motionOff() || !('IntersectionObserver' in window)) {
    showAll();
  } else {
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-in');
        observer.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });

    Array.prototype.forEach.call(revealables, function (el) { observer.observe(el); });

    // страховка: что бы ни случилось, текст не должен остаться невидимым
    window.setTimeout(function () {
      if (!document.querySelector('.reveal.is-in')) showAll();
    }, 2500);
  }

  /* ---------- Бесконечные анимации только на видимых блоках ---------- */
  /* Лучи и бегущая строка крутятся вечно. Пока они за экраном, браузер
     всё равно перерисовывал бы кадры — на телефоне это лишний расход
     батареи. Ушли из виду — поставили на паузу. */
  var loops = document.querySelectorAll('[data-motion-loop]');

  /* Причин для паузы две: блок ушёл за экран или человек попросил
     меньше движения. Держим их порознь и каждый раз пересчитываем обе,
     иначе выключенный тумблер уже не смог бы вернуть анимацию. */
  function syncLoops() {
    Array.prototype.forEach.call(loops, function (el) {
      var offscreen = el.getAttribute('data-offscreen') === '1';
      el.classList.toggle('is-paused', offscreen || settings.motion === 'reduced');
    });
  }

  if (loops.length && 'IntersectionObserver' in window) {
    var loopWatcher = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        entry.target.setAttribute('data-offscreen', entry.isIntersecting ? '0' : '1');
      });
      syncLoops();
    }, { rootMargin: '120px' });
    Array.prototype.forEach.call(loops, function (el) { loopWatcher.observe(el); });
  }

  /* ---------- Кнопка связи внизу экрана ---------- */
  var mobileCta = document.getElementById('mobile-cta');
  var ctaSection = document.getElementById('contacts');

  /* Место под кнопку рассчитано в стилях из её составляющих. Здесь уточняем
     по фактической высоте: на узком экране надпись может перенестись. */
  if (mobileCta && 'ResizeObserver' in window) {
    new ResizeObserver(function () {
      var visible = getComputedStyle(mobileCta).display !== 'none';
      root.style.setProperty('--bar-h', visible ? mobileCta.offsetHeight + 'px' : '0px');
    }).observe(mobileCta);
  }

  if (mobileCta && ctaSection && 'IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) {
      mobileCta.classList.toggle('is-hidden', entries[0].isIntersecting);
    }, { threshold: 0.15 }).observe(ctaSection);
  }

  /* ---------- Год в подвале ---------- */
  var year = document.getElementById('year');
  if (year) year.textContent = new Date().getFullYear();

  /* ---------- Запуск ---------- */
  // Язык из адреса важнее сохранённого: по ссылке ?lang=en человек
  // должен попасть на английскую версию, что бы он ни выбирал раньше.
  var urlLang = new URLSearchParams(window.location.search).get('lang');
  if (urlLang && i18n && i18n.langs.indexOf(urlLang) !== -1) {
    settings.lang = urlLang;
    save();
  }

  applyTheme(false);
  applyMotion();
  if (i18n) applyLang(settings.lang, false);
  syncControls();

  /* ---------- Ускорение повторных заходов ---------- */
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('/sw.js').catch(function () { /* не критично */ });
    });
  }
})();
