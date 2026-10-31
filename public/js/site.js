(function () {
  'use strict';
  var doc = document.documentElement;
  doc.classList.add('js');
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* Mobile menu */
  var btn = document.querySelector('.menu-btn');
  var menu = document.getElementById('menu');
  if (btn && menu) {
    btn.addEventListener('click', function () {
      var open = menu.classList.toggle('open');
      btn.setAttribute('aria-expanded', String(open));
    });
  }

  /* Header state + floating CTA visibility */
  var header = document.querySelector('.site-header');
  function onScroll() {
    var y = window.scrollY;
    if (header) header.classList.toggle('scrolled', y > 30);
    document.body.classList.toggle('past-hero', y > window.innerHeight * 0.7);
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* Reveal on scroll + number counters */
  function countUp(el) {
    var end = Number(el.dataset.count), suf = el.dataset.suffix || '', t0 = null;
    function step(t) {
      if (!t0) t0 = t;
      var p = Math.min((t - t0) / 1400, 1);
      el.textContent = Math.round(end * (1 - Math.pow(1 - p, 3))) + suf;
      if (p < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }
  if ('IntersectionObserver' in window && !reduce) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        e.target.classList.add('in');
        e.target.querySelectorAll('[data-count]').forEach(countUp);
        io.unobserve(e.target);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    document.querySelectorAll('.reveal').forEach(function (el, i) {
      el.style.transitionDelay = (i % 4) * 70 + 'ms';
      io.observe(el);
    });
  } else {
    document.querySelectorAll('.reveal').forEach(function (el) { el.classList.add('in'); });
  }

  /* 3D tilt on cards (pointer devices only) */
  if (!reduce && window.matchMedia('(hover: hover)').matches) {
    document.querySelectorAll('.tilt').forEach(function (el) {
      el.addEventListener('pointermove', function (e) {
        var r = el.getBoundingClientRect();
        var x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
        el.style.transform = 'perspective(900px) rotateY(' + x * 8 + 'deg) rotateX(' + -y * 8 + 'deg) translateZ(0)';
      });
      el.addEventListener('pointerleave', function () { el.style.transform = ''; });
    });
  }

  /* Product gallery thumbnails */
  var gmain = document.getElementById('gmain');
  document.querySelectorAll('.thumbs button').forEach(function (b) {
    b.addEventListener('click', function () { if (gmain) gmain.src = b.dataset.src; });
  });

  /* First-touch attribution (UTM + referrer) stored for inquiry forms */
  try {
    var params = new URLSearchParams(location.search);
    var stored = JSON.parse(localStorage.getItem('sgs_attr') || 'null');
    if (!stored || params.get('utm_source')) {
      stored = {
        utm_source: params.get('utm_source') || '',
        utm_medium: params.get('utm_medium') || '',
        utm_campaign: params.get('utm_campaign') || '',
        referrer: document.referrer && document.referrer.indexOf(location.host) === -1 ? document.referrer : '',
        landing: location.pathname
      };
      if (!stored.utm_source && stored.referrer) {
        try { stored.utm_source = new URL(stored.referrer).hostname; stored.utm_medium = 'referral'; } catch (e) {}
      }
      localStorage.setItem('sgs_attr', JSON.stringify(stored));
    }
  } catch (e) { stored = {}; }

  document.querySelectorAll('form[data-inquiry]').forEach(function (f) {
    var set = function (n, v) { if (f.elements[n]) f.elements[n].value = v || ''; };
    set('ts', Date.now());
    set('source_page', location.pathname);
    set('referrer', stored && stored.referrer);
    set('utm_source', stored && stored.utm_source);
    set('utm_medium', stored && stored.utm_medium);
    set('utm_campaign', stored && stored.utm_campaign);
    f.addEventListener('submit', function () {
      var b = f.querySelector('button[type=submit]');
      if (b) { b.disabled = true; b.textContent = 'Sending…'; }
    });
  });

  /* Hero: molten glass canvas */
  var canvas = document.getElementById('molten');
  if (!canvas || reduce) return;
  var ctx = canvas.getContext('2d');
  var W, H, dpr = Math.min(window.devicePixelRatio || 1, 1.5);
  var mouse = { x: 0.7, y: 0.4, tx: 0.7, ty: 0.4 };
  var colors = [[255, 158, 61], [255, 95, 126], [62, 224, 255], [255, 207, 138], [120, 90, 255]];
  var blobs = colors.map(function (c, i) {
    return { c: c, a: Math.random() * 6.28, s: 0.0015 + i * 0.0004, r: 0.28 + Math.random() * 0.18, ox: 0.3 + Math.random() * 0.6, oy: 0.25 + Math.random() * 0.5 };
  });
  var sparks = Array.from({ length: 60 }, function () {
    return { x: Math.random(), y: Math.random(), v: 0.0006 + Math.random() * 0.0015, r: Math.random() * 1.8 + 0.4, o: Math.random() };
  });
  function resize() {
    W = canvas.clientWidth; H = canvas.clientHeight;
    canvas.width = W * dpr; canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  window.addEventListener('resize', resize);
  window.addEventListener('pointermove', function (e) { mouse.tx = e.clientX / W; mouse.ty = e.clientY / H; }, { passive: true });
  resize();

  var visible = true, running = false;
  function start() { if (!running && visible && !document.hidden) { running = true; requestAnimationFrame(frame); } }
  new IntersectionObserver(function (e) { visible = e[0].isIntersecting; start(); }).observe(canvas);

  function frame() {
    if (!visible || document.hidden) { running = false; return; }
    mouse.x += (mouse.tx - mouse.x) * 0.04; mouse.y += (mouse.ty - mouse.y) * 0.04;
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = '#05070d'; ctx.fillRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'lighter';
    var m = Math.max(W, H);
    blobs.forEach(function (b, i) {
      b.a += b.s;
      var x = (b.ox + Math.cos(b.a * (1 + i * 0.2)) * 0.18 + (mouse.x - 0.5) * 0.08 * (i + 1)) * W;
      var y = (b.oy + Math.sin(b.a * 1.3) * 0.16 + (mouse.y - 0.5) * 0.06 * (i + 1)) * H;
      var r = b.r * m;
      var g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, 'rgba(' + b.c.join(',') + ',0.30)');
      g.addColorStop(0.5, 'rgba(' + b.c.join(',') + ',0.08)');
      g.addColorStop(1, 'rgba(' + b.c.join(',') + ',0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, 6.283); ctx.fill();
    });
    // Rising embers from the furnace
    sparks.forEach(function (p) {
      p.y -= p.v; p.x += Math.sin(p.y * 20 + p.o * 6) * 0.0004;
      if (p.y < -0.02) { p.y = 1.02; p.x = Math.random(); }
      ctx.fillStyle = 'rgba(255,190,120,' + (0.25 + 0.5 * Math.abs(Math.sin(p.y * 8 + p.o * 6))) + ')';
      ctx.beginPath(); ctx.arc(p.x * W, p.y * H, p.r, 0, 6.283); ctx.fill();
    });
    requestAnimationFrame(frame);
  }
  document.addEventListener('visibilitychange', start);
  start();
})();
