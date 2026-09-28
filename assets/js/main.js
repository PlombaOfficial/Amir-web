
(function () {
  'use strict';

  var SITE_BASE = new URL('../../', document.currentScript.src);
  var PAGE_LANGUAGE = document.documentElement.getAttribute('data-page-lang') || 'ru';
  var STORE_KEY = 'amirweb:settings';
  var DEFAULTS = { theme: 'light', lang: 'ru', motion: 'auto' };
  var root = document.documentElement;
  var i18n = window.AmirI18n;

  
  var settings = (function () {
    var saved = {};
    try { saved = JSON.parse(localStorage.getItem(STORE_KEY) || '{}'); } catch (e) { saved = {}; }
    var s = {};
    for (var k in DEFAULTS) s[k] = saved[k] || DEFAULTS[k];
    s.lang = PAGE_LANGUAGE;
    return s;
  })();

  function save() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(settings)); } catch (e) {}
  }

  var darkQuery = window.matchMedia('(prefers-color-scheme: dark)');
  var motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

  function motionOff() {
    return settings.motion === 'reduced' || motionQuery.matches;
  }

  
  function applyTheme(animated) {
    var dark = settings.theme === 'dark' ||
               (settings.theme === 'system' && darkQuery.matches);

    if (animated && !motionOff()) {
      root.classList.add('is-theming');
      window.setTimeout(function () { root.classList.remove('is-theming'); }, 360);
    }
    root.setAttribute('data-theme', dark ? 'dark' : 'light');

    var metas = document.querySelectorAll('meta[name="theme-color"]');
    Array.prototype.forEach.call(metas, function (m) { m.remove(); });
    var meta = document.createElement('meta');
    meta.name = 'theme-color';
    meta.content = dark ? '#101714' : '#F7F9F8';
    document.head.appendChild(meta);
  }

  darkQuery.addEventListener('change', function () {
    if (settings.theme === 'system') applyTheme(true);
  });

  
  function applyMotion() {
    if (settings.motion === 'reduced') root.setAttribute('data-motion', 'reduced');
    else root.removeAttribute('data-motion');
    syncLoops();
  }

  
  function applyLang(lang, updateUrl) {
    if (!i18n || i18n.langs.indexOf(lang) === -1) lang = 'ru';
    settings.lang = lang;
    root.setAttribute('lang', lang);

    each('[data-i18n]', function (el) {
      var val = i18n.t(lang, el.getAttribute('data-i18n'));
      if (val) el.textContent = val;
    });

    each('[data-i18n-html]', function (el) {
      var val = i18n.t(lang, el.getAttribute('data-i18n-html'));
      if (val) el.innerHTML = val;
    });

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

    var pageUrl = 'https://amir-web.kz/' + (lang === 'ru' ? '' : lang + '/');
    [['property','og:title','meta.title'],['property','og:description','meta.description'],['name','twitter:title','meta.title'],['name','twitter:description','meta.description']].forEach(function (item) {
      var meta = document.querySelector('meta[' + item[0] + '="' + item[1] + '"]');
      if (meta) meta.content = i18n.t(lang,item[2]);
    });
    document.querySelector('meta[property="og:url"]').content = pageUrl;
    document.querySelector('meta[property="og:locale"]').content = {ru:'ru_KZ',kk:'kk_KZ',en:'en_US'}[lang];
    var otherLocales = ['ru','kk','en'].filter(function (code) { return code !== lang; });
    each('meta[property="og:locale:alternate"]', function (meta) {
      meta.content = {ru:'ru_KZ',kk:'kk_KZ',en:'en_US'}[otherLocales.shift()];
    });
    document.querySelector('meta[property="og:image:alt"]').content = i18n.t(lang,'meta.title');
    if (window.AmirSEO) document.getElementById('site-schema').textContent = JSON.stringify(window.AmirSEO[lang]);
    each('[data-language]', function (link) {
      if (link.dataset.language === lang) link.setAttribute('aria-current','page');
      else link.removeAttribute('aria-current');
    });
    var code = document.getElementById('prefs-code');
    if (code) code.textContent = lang.toUpperCase();

    if (burger) {
      burger.setAttribute('aria-label', i18n.t(lang,
        burger.getAttribute('aria-expanded') === 'true' ? 'a11y.closeMenu' : 'a11y.openMenu'));
    }

    if (updateUrl && window.history && history.replaceState) {
      var url = new URL(window.location.href);
      if (lang === PAGE_LANGUAGE) url.searchParams.delete('lang');
      else url.searchParams.set('lang', lang);
      history.replaceState(null, '', url.pathname + url.search + url.hash);
    }

    document.dispatchEvent(new CustomEvent('amir:language', {detail:{lang:lang}}));
    var canonical = document.querySelector('link[rel="canonical"]');
    if (canonical) {
      canonical.setAttribute('href',
        lang === 'ru' ? 'https://amir-web.kz/' : 'https://amir-web.kz/' + lang + '/');
    }
  }

  function each(sel, fn) {
    Array.prototype.forEach.call(document.querySelectorAll(sel), fn);
  }

  function changeLanguage(lang) {
    var motion = window.AmirTextMotion;
    if (lang === root.lang) { if (motion) motion.cancel('language'); return; }
    var update = function () { keepingPlace(function () { applyLang(lang, true); }); };
    if (!motion) { update(); return; }
    motion.swap('language', document.querySelectorAll('[data-i18n], [data-i18n-html], #brief-price, #brief-timeline, #prefs-code'), update);
  }

  each('a[data-language]', function (link) {
    link.addEventListener('click', function (event) {
      if (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      settings.lang = link.dataset.language;
      save(); syncControls(); changeLanguage(settings.lang);
    });
  });

  
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

    prefs.addEventListener('mousedown', function (e) {
      if (e.target === prefs) closePrefs();
    });

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
        if (name === 'lang') changeLanguage(settings.lang);
      });

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
      try { localStorage.removeItem(STORE_KEY); } catch (e) {}
      for (var k in DEFAULTS) settings[k] = DEFAULTS[k];
      syncControls();
      applyTheme(true);
      applyMotion();
      changeLanguage(settings.lang);
    });

    prefs.addEventListener('keydown', function (e) {
      if (e.key !== 'Tab') return;
      var items = prefs.querySelectorAll('button:not([tabindex="-1"])');
      if (!items.length) return;
      var first = items[0], last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    });
  }

  
  
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

  
  var burger = document.getElementById('burger');
  var menu = document.getElementById('mobile-menu');

  function openMenu() {
    menu.hidden = false;
    document.body.classList.add('is-locked');
    burger.setAttribute('aria-expanded', 'true');
    burger.setAttribute('aria-label', i18n ? i18n.t(settings.lang, 'a11y.closeMenu') : 'Закрыть меню');
    requestAnimationFrame(function () { menu.classList.add('is-open'); });
    document.getElementById('main').inert = true;
    document.querySelector('.footer').inert = true;
    var firstLink = menu.querySelector('a');
    if (firstLink) firstLink.focus();
  }

  function closeMenu() {
    menu.classList.remove('is-open');
    document.getElementById('main').inert = false;
    document.querySelector('.footer').inert = false;
    if (menu.contains(document.activeElement)) burger.focus();
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

    menu.addEventListener('keydown', function (e) {
      if (e.key !== 'Tab') return;
      var links = menu.querySelectorAll('a');
      if (e.shiftKey && document.activeElement === links[0]) { e.preventDefault(); links[links.length - 1].focus(); }
      else if (!e.shiftKey && document.activeElement === links[links.length - 1]) { e.preventDefault(); links[0].focus(); }
    });

    menu.addEventListener('click', function (e) {
      if (e.target.closest('a')) closeMenu();
    });

    window.addEventListener('resize', function () {
      if (window.innerWidth >= 900 && burger.getAttribute('aria-expanded') === 'true') closeMenu();
    });
  }

  
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    if (prefsOpen()) { closePrefs(); return; }
    if (burger && burger.getAttribute('aria-expanded') === 'true') {
      closeMenu();
      burger.focus();
    }
  });

  
  var faqItems = document.querySelectorAll('.faq__item');

  Array.prototype.forEach.call(faqItems, function (item) {
    var btn = item.querySelector('.faq__q');

    btn.addEventListener('click', function () {
      var willOpen = !item.classList.contains('is-open');

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

    window.setTimeout(function () {
      if (!document.querySelector('.reveal.is-in')) showAll();
    }, 2500);
  }

  
  
  var loops = document.querySelectorAll('[data-motion-loop]');

  
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

  
  var mobileCta = document.getElementById('mobile-cta');
  var ctaSection = document.getElementById('contacts');

  
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

  
  var year = document.getElementById('year');
  if (year) year.textContent = new Date().getFullYear();

  

  var urlLang = new URLSearchParams(window.location.search).get('lang');
  if (urlLang && i18n && i18n.langs.indexOf(urlLang) !== -1) {
    settings.lang = urlLang;
    save();
  }

  applyTheme(false);
  applyMotion();
  if (i18n) applyLang(settings.lang, false);
  syncControls();

  
  if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) {
    window.addEventListener('load', function () {
      navigator.serviceWorker.register(new URL('sw.js', SITE_BASE).href).catch(function () {  });
    });
  }
})();
