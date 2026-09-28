(function () {
  'use strict';
  var SITE_BASE = new URL('../../', document.currentScript.src);
  var root = document.documentElement;
  var translations = window.AmirI18n;
  var motionQuery = matchMedia('(prefers-reduced-motion: reduce)');
  var finePointer = matchMedia('(hover: hover) and (pointer: fine)');
  function t(key) { return translations.t(root.lang, key); }
  function reduced() { return root.dataset.motion === 'reduced' || motionQuery.matches; }
  function $(s, scope) { return (scope || document).querySelector(s); }
  function $$(s, scope) { return Array.from((scope || document).querySelectorAll(s)); }

  var tabs = $$('[data-service]');
  function selectService(tab, focus) {
    tabs.forEach(function (other) {
      var selected = other === tab;
      other.setAttribute('aria-selected', String(selected));
      other.tabIndex = selected ? 0 : -1;
      document.getElementById(other.getAttribute('aria-controls')).hidden = !selected;
    });
    if (focus) tab.focus();
  }
  tabs.forEach(function (tab, index) {
    tab.addEventListener('click', function () { selectService(tab, false); });
    tab.addEventListener('keydown', function (e) {
      var next;
      if (e.key === 'ArrowRight') next = (index + 1) % tabs.length;
      if (e.key === 'ArrowLeft') next = (index - 1 + tabs.length) % tabs.length;
      if (e.key === 'Home') next = 0;
      if (e.key === 'End') next = tabs.length - 1;
      if (next !== undefined) { e.preventDefault(); selectService(tabs[next], true); }
    });
  });

  var form = $('#project-brief');
  var ready = $('#brief-ready');
  var price = $('#brief-price');
  var timeline = $('#brief-timeline');
  var draft = $('#brief-message');
  var whatsapp = $('#brief-whatsapp');
  var formats = {
    basic: { price: 30000, title: 'brief.basic', term: 'brief.daysBasic' },
    business: { price: 60000, title: 'brief.business', term: 'brief.daysBusiness' },
    store: { price: 100000, title: 'brief.store', term: 'brief.daysStore' }
  };
  function formatMoney(value) { return new Intl.NumberFormat(root.lang === 'kk' ? 'kk-KZ' : root.lang === 'en' ? 'en-US' : 'ru-RU').format(value); }
  function selectedFormat() { return formats[$('input[name="format"]:checked', form).value] || formats.basic; }
  function message() {
    var choice = selectedFormat();
    var name = form.elements.namedItem('name').value.trim();
    var details = form.elements.namedItem('details').value.trim();
    var business = form.elements.namedItem('business');
    var lines = [t('brief.message'), '', t('brief.format') + ': ' + t(choice.title), t('brief.field') + ': ' + business.selectedOptions[0].textContent, t('brief.priceLabel') + ': ' + formatMoney(choice.price) + ' ₸'];
    if (name) lines.push(t('brief.name') + ': ' + name);
    if (details) lines.push('', t('brief.details'), details);
    lines.push('', t('brief.exact'));
    return lines.join('\n');
  }
  var estimateReady = false;
  function refreshBrief() {
    var choice = selectedFormat();
    var amount = formatMoney(choice.price), term = t(choice.term);
    var motion = window.AmirTextMotion;
    var changed = price.textContent !== amount || timeline.textContent !== term;
    var update = function () { price.textContent = amount; timeline.textContent = term; };
    if (changed && estimateReady && motion && !motion.active('language')) {
      motion.swap('estimate', [price, timeline], update);
    } else {
      if (motion) motion.cancel('estimate');
      update();
    }
    estimateReady = true;
    if (!ready.hidden) {
      var text = message();
      draft.textContent = text;
      whatsapp.href = 'https://wa.me/77085482453?text=' + encodeURIComponent(text);
    }
  }
  form.addEventListener('input', refreshBrief);
  form.addEventListener('change', refreshBrief);
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (!form.reportValidity()) return;
    ready.hidden = false;
    refreshBrief();
    $('#brief-ready-title').focus({ preventScroll: true });
    ready.scrollIntoView({ behavior: reduced() ? 'instant' : 'smooth', block: 'nearest' });
  });
  $$('[data-business]').forEach(function (link) {
    link.addEventListener('click', function () {
      var business = link.dataset.business;
      form.elements.namedItem('business').value = business;
      var suggested = business === '2' || business === '3' ? 'store' : 'business';
      $('input[value="' + suggested + '"]', form).checked = true;
      refreshBrief();
    });
  });

  var dialog = $('#project-dialog');
  var lastPreview = null;
  var projects = {
    sharyn: { name: 'Sharyn', image: './assets/img/sharyn-screen.webp', url: 'https://sharynmenu.onrender.com' },
    teacher: { name: 'Teacher Temp', image: './assets/img/teacher-screen.webp', url: 'https://teachertemp.onrender.com' }
  };
  function closePreview() { dialog.close(); }
  $$('[data-project]').forEach(function (button) {
    button.addEventListener('click', function () {
      var project = projects[button.dataset.project];
      lastPreview = button;
      $('#project-dialog-title').textContent = project.name;
      $('#project-dialog-image').src = new URL(project.image, SITE_BASE).href;
      $('#project-dialog-image').alt = project.name;
      $('#project-dialog-link').href = project.url;
      dialog.showModal();
      document.body.classList.add('has-project-dialog');
      $('#project-dialog-close').focus();
    });
  });
  $('#project-dialog-close').addEventListener('click', closePreview);
  dialog.addEventListener('click', function (e) {
    var r = dialog.getBoundingClientRect();
    if (e.target === dialog && (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom)) closePreview();
  });
  dialog.addEventListener('close', function () {
    document.body.classList.remove('has-project-dialog');
    if (lastPreview) lastPreview.focus({ preventScroll: true });
  });

  var tilted = $$('[data-tilt], .hero__visual');
  tilted.forEach(function (el) {
    var frame = 0;
    el.addEventListener('pointermove', function (e) {
      if (reduced() || !finePointer.matches) return;
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(function () {
        var r = el.getBoundingClientRect();
        var x = Math.max(-1, Math.min(1, ((e.clientX - r.left) / r.width - .5) * 2));
        var y = Math.max(-1, Math.min(1, ((e.clientY - r.top) / r.height - .5) * 2));
        el.style.setProperty('--tilt-x', (-y * 2.2) + 'deg');
        el.style.setProperty('--tilt-y', (x * 3) + 'deg');
      });
    });
    el.addEventListener('pointerleave', function () {
      cancelAnimationFrame(frame);
      el.style.removeProperty('--tilt-x'); el.style.removeProperty('--tilt-y');
    });
  });

  var progress = $('#reading-progress');
  var toTop = $('#back-to-top');
  var scrollFrame = 0;
  var sections = $$('main > section[id]');
  var navLinks = $$('.nav a');
  function updateScroll() {
    scrollFrame = 0;
    var max = document.documentElement.scrollHeight - innerHeight;
    var ratio = max > 0 ? Math.min(1, Math.max(0, scrollY / max)) : 0;
    progress.style.transform = 'scaleX(' + ratio + ')';
    var show = scrollY > 650;
    toTop.classList.toggle('is-visible', show);
    toTop.tabIndex = show ? 0 : -1;
    toTop.setAttribute('aria-hidden', String(!show));
    var current = '';
    sections.forEach(function (section) { if (section.getBoundingClientRect().top <= innerHeight * .3) current = section.id; });
    navLinks.forEach(function (link) {
      if (link.hash === '#' + current) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    });
  }
  function queueScroll() { if (!scrollFrame) scrollFrame = requestAnimationFrame(updateScroll); }
  window.addEventListener('scroll', queueScroll, { passive: true });
  window.addEventListener('resize', queueScroll, { passive: true });
  function refreshLanguage() {
    refreshBrief();
    $$('[data-project]').forEach(function (button) { button.setAttribute('aria-label', projects[button.dataset.project].name + ' — ' + t('works.preview')); });
  }
  document.addEventListener('amir:language', refreshLanguage);
  refreshLanguage(); updateScroll();
})();
