(function () {
  'use strict';
  var root = document.documentElement;
  var media = matchMedia('(prefers-reduced-motion: reduce)');
  var jobs = new Map();
  function reduced() { return root.dataset.motion === 'reduced' || media.matches; }
  function stop(job) {
    clearTimeout(job.timer);
    job.animations.forEach(function (animation) { animation.cancel(); });
    if (jobs.get(job.key) === job) jobs.delete(job.key);
  }
  function cancel(key) { var job = jobs.get(key); if (job) stop(job); }
  function visible(elements) {
    return Array.from(elements).filter(function (el) {
      if (!el || !el.animate || el.closest('[hidden]') || /^(OPTION|SELECT|INPUT|TEXTAREA)$/.test(el.tagName)) return false;
      var rect = el.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0 && rect.bottom > 0 && rect.top < innerHeight && getComputedStyle(el).visibility !== 'hidden';
    }).filter(function (el, index, all) {
      return !all.some(function (other) { return other !== el && other.contains(el); });
    });
  }
  function swap(key, elements, update) {
    cancel(key);
    var targets = visible(elements);
    if (reduced() || !targets.length) { update(); return; }
    var job = {key:key, animations:[], timer:0, committed:false};
    jobs.set(key, job);
    job.commit = function () {
      if (job.committed || jobs.get(key) !== job) return;
      job.committed = true;
      job.animations.forEach(function (animation) { animation.cancel(); });
      job.animations = [];
      update();
      if (reduced()) { stop(job); return; }
      visible(targets).forEach(function (el, index) {
        job.animations.push(el.animate([
          {opacity:0, transform:'translateY(7px)', filter:'blur(2px)'},
          {opacity:1, transform:'translateY(0)', filter:'blur(0px)'}
        ], {duration:340, delay:Math.min(index * 9,63), easing:'cubic-bezier(.16,1,.3,1)', fill:'backwards'}));
      });
      job.timer = setTimeout(function () { stop(job); },420);
    };
    targets.forEach(function (el) {
      job.animations.push(el.animate([
        {opacity:1, transform:'translateY(0)', filter:'blur(0px)'},
        {opacity:0, transform:'translateY(-4px)', filter:'blur(2px)'}
      ], {duration:110, easing:'ease-in', fill:'forwards'}));
    });
    job.timer = setTimeout(job.commit,115);
  }
  function finishIfReduced() {
    if (!reduced()) return;
    Array.from(jobs.values()).forEach(function (job) { job.commit(); stop(job); });
  }
  media.addEventListener('change',finishIfReduced);
  new MutationObserver(finishIfReduced).observe(root,{attributes:true,attributeFilter:['data-motion']});
  window.AmirTextMotion = {swap:swap,cancel:cancel,active:function (key) { return jobs.has(key); }};
})();
