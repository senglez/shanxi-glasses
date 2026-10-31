(function () {
  'use strict';
  // Confirm before destructive actions
  document.querySelectorAll('form[data-confirm]').forEach(function (f) {
    f.addEventListener('submit', function (e) {
      if (!window.confirm(f.dataset.confirm)) e.preventDefault();
    });
  });
  // Character counters for SEO fields
  document.querySelectorAll('[data-max]').forEach(function (el) {
    var max = Number(el.dataset.max);
    var c = document.createElement('small');
    c.className = 'counter';
    el.insertAdjacentElement('afterend', c);
    var upd = function () {
      var n = el.value.length;
      c.textContent = n + ' / ' + max + (n === 0 ? '（留空则自动生成）' : '');
      c.classList.toggle('over', n > max);
    };
    el.addEventListener('input', upd);
    upd();
  });
})();
