/* ============================================================
   SENDER · ON AIR — app.js
   Sala de control: film con transporte (scroll/play/touch),
   radar CSS, stacks keynote, dial VFO, track pinned.
   GSAP+ScrollTrigger+Lenis CDN. i18n.js autónomo ES/EN.
   ============================================================ */
import './i18n.js?v=23';

const gsap = window.gsap;
const ScrollTrigger = window.ScrollTrigger;
const Lenis = window.Lenis;
if (gsap && ScrollTrigger) gsap.registerPlugin(ScrollTrigger);

const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const $  = (s, c) => (c || document).querySelector(s);
const $$ = (s, c) => [...(c || document).querySelectorAll(s)];

/* ---------- Lenis ---------- */
let lenis = null;
if (Lenis && !reduce) {
  lenis = new Lenis({ lerp: 0.1 });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((t) => lenis.raf(t * 1000));
  gsap.ticker.lagSmoothing(0);
}

/* ---------- split words ---------- */
function splitWords(el) {
  const words = el.textContent.trim().split(/\s+/);
  el.innerHTML = words.map((w) => `<span class="w"><span>${w}</span></span>`).join(' ');
}
function splitAll() { $$('.split').forEach(splitWords); }
splitAll();

/* ---------- loader + intro ---------- */
function finishLoad() {
  document.body.classList.remove('loading');
  if (reduce) { ScrollTrigger.refresh(); return; }
  const tl = gsap.timeline({ defaults: { ease: 'power4.out' }, onComplete: () => ScrollTrigger.refresh() });
  tl.from('.hero-title', { yPercent: 46, opacity: 0, duration: 1.2 }, 0.05)
    .from('.hero .kicker', { y: 14, opacity: 0, duration: 0.7 }, 0.3)
    .from('.hero-sub', { y: 18, opacity: 0, duration: 0.8 }, 0.55)
    .from('.transport', { opacity: 0, y: 12, duration: 0.7 }, 0.75)
    .from('.hero-stats .stat', { y: 22, opacity: 0, stagger: 0.08, duration: 0.7 }, 0.9)
    .from('.rings', { opacity: 0, scale: 0.92, duration: 1.4, ease: 'power2.out' }, 0.4);
}
window.addEventListener('load', () => setTimeout(finishLoad, 850));

/* ---------- reveals ---------- */
$$('.rv').forEach((el) => {
  if (el.closest('#hero') || reduce) return;
  gsap.from(el, { y: 40, opacity: 0, duration: 0.95, ease: 'power3.out', scrollTrigger: { trigger: el, start: 'top 88%', once: true } });
});
$$('.split').forEach((el) => {
  if (el.closest('#hero') || reduce) return;
  ScrollTrigger.create({ trigger: el, start: 'top 88%', once: true,
    onEnter: () => gsap.from(el.querySelectorAll('.w > span'), { yPercent: 112, duration: 0.95, stagger: 0.05, ease: 'power4.out' }) });
});

/* ---------- nav / menú / anclas ---------- */
const nav = $('#nav');
ScrollTrigger.create({ start: 40, onUpdate: (s) => nav.classList.toggle('scrolled', s.scroll() > 40) });
const menu = $('#menu');
function setMenu(open) {
  document.body.classList.toggle('menu-open', open);
  menu.setAttribute('aria-hidden', String(!open));
  $('#burger').setAttribute('aria-expanded', String(open));
  if (lenis) (open ? lenis.stop() : lenis.start());
  if (open) setTimeout(() => { const a = $('#menu a'); a && a.focus(); }, 60);
}
$('#burger').addEventListener('click', () => setMenu(!document.body.classList.contains('menu-open')));
$('#menu-close').addEventListener('click', () => setMenu(false));
$$('#menu a').forEach((a) => a.addEventListener('click', () => setMenu(false)));
window.addEventListener('keydown', (e) => { if (e.key === 'Escape') setMenu(false); });
$$('a[href^="#"]').forEach((a) => {
  a.addEventListener('click', (e) => {
    const t = $(a.getAttribute('href'));
    if (!t) return;
    e.preventDefault();
    if (lenis) lenis.scrollTo(t, { offset: -8 }); else t.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' });
  });
});

/* ---------- i18n re-split ---------- */
window.addEventListener('langchange', () => {
  splitAll();
  $$('.lang [data-lang]').forEach((s) => s.classList.toggle('on', s.dataset.lang === (localStorage.getItem('sender-lang') || 'es')));
});

/* ---------- contadores ---------- */
$$('[data-count]').forEach((el) => {
  const end = parseFloat(el.dataset.count); const o = { v: 0 };
  gsap.to(o, { v: end, duration: 2, ease: 'power1.out', scrollTrigger: { trigger: el, start: 'top 92%', once: true },
    onUpdate: () => { el.textContent = Math.round(o.v).toLocaleString('es-CL'); } });
});

/* ---------- FILM HERO: cluster de transporte (scroll + play + foto + fs) ---------- */
(() => {
  const v = $('#film'); if (!v) return;
  const fill = $('#t-fill'), tc = $('#tc'), tdur = $('#tdur');
  const playBtn = $('#t-play'), photoBtn = $('#t-photo'), fsBtn = $('#t-fs');
  const photos = $$('.hero-photo img');
  let ready = false, tgt = 0, cur = 0, auto = false, scrollP = 0, photoIdx = -1, scrub = false, rate = .5;
  const mmss = (t) => `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(Math.floor(t) % 60).padStart(2, '0')}`;
  v.addEventListener('loadedmetadata', () => { ready = true; if (tdur) tdur.textContent = mmss(v.duration); if (!reduce) { v.loop = true; v.playbackRate = .62; v.play().catch(() => {}); v.addEventListener('click',()=>v.play().catch(()=>{})); } }, { once: true });
  ScrollTrigger.create({ trigger: '#hero', start: 'top top', end: 'bottom top', scrub: true, onUpdate: (s) => { scrollP = s.progress; const d = Math.abs(s.progress - (s.oldProgress ?? s.progress)); rate = Math.min(1.9, .5 + d * 55); if (scrub && !auto) tgt = s.progress; } });
  playBtn.addEventListener('click', () => {
    if (photoIdx >= 0) setPhoto(-1);
    auto = !auto;
    document.body.classList.toggle('film-auto', auto);
    if (auto) { v.playbackRate = 1; v.play().catch(() => {}); } else { scrub = false; v.playbackRate = .5; v.play().catch(() => {}); }
  });
  function setPhoto(i) {
    photoIdx = i;
    photos.forEach((p, k) => p.classList.toggle('on', k === i));
    document.body.classList.toggle('photo-mode', i >= 0);
    if (i >= 0) { auto = false; document.body.classList.remove('film-auto'); v.pause(); }
    if (i < 0 && !reduce && !auto) { v.playbackRate = .5; v.play().catch(() => {}); }
    if (i >= 0 && !reduce) gsap.fromTo(photos[i], { scale: 1.06 }, { scale: 1, duration: 4.5, ease: 'power1.out' });
  }
  photoBtn.addEventListener('click', () => setPhoto(photoIdx >= photos.length - 1 ? -1 : photoIdx + 1));
  fsBtn.addEventListener('click', () => {
    if (document.fullscreenElement) document.exitFullscreen();
    else document.documentElement.requestFullscreen().catch(() => {});
  });
  window.addEventListener('keydown', (e) => {
    if (auto || /input|textarea/i.test(document.activeElement.tagName)) return;
    const r = $('#hero').getBoundingClientRect();
    if (r.bottom < 0 || r.top > innerHeight) return;
    if (e.key === 'ArrowRight') { if (!scrub) { scrub = true; v.pause(); cur = v.duration ? v.currentTime / v.duration : 0; tgt = cur; } tgt = Math.min(1, tgt + 0.02); e.preventDefault(); }
    if (e.key === 'ArrowLeft') { if (!scrub) { scrub = true; v.pause(); cur = v.duration ? v.currentTime / v.duration : 0; tgt = cur; } tgt = Math.max(0, tgt - 0.02); e.preventDefault(); }
  });
  (function tick() {
    if (ready && v.duration && isFinite(v.duration)) {
      if (photoIdx < 0) {
        if (scrub && !auto) {
          cur += (tgt - cur) * (reduce ? 1 : 0.12);
          const t = cur * (v.duration - 0.05);
          if (Math.abs(v.currentTime - t) > 0.01) { try { v.currentTime = t; } catch (_) {} }
        } else if (!auto && !reduce) {
          v.playbackRate += (rate - v.playbackRate) * 0.08;
        }
      }
      fill.style.width = (((auto || !scrub) ? v.currentTime / v.duration : scrollP) * 100).toFixed(2) + '%';
      tc.textContent = mmss(v.currentTime);
    }
    requestAnimationFrame(tick);
  })();
  /* parallax de anillos con el puntero (profundidad inmersiva) */
  if (!reduce && matchMedia('(pointer: fine)').matches) {
    const rx = gsap.quickTo('.rings', 'x', { duration: 0.9, ease: 'power3.out' });
    const ry = gsap.quickTo('.rings', 'y', { duration: 0.9, ease: 'power3.out' });
    addEventListener('pointermove', (e) => { rx((e.clientX / innerWidth - 0.5) * -30); ry((e.clientY / innerHeight - 0.5) * -20); }, { passive: true });
  }
})();

/* ---------- cover film del catálogo (scrub) ---------- */
(() => {
  const v = $('#cover-film'); if (!v) return;
  let ready = false, tgt = 0, cur = 0;
  v.addEventListener('loadedmetadata', () => { ready = true; v.pause(); }, { once: true });
  ScrollTrigger.create({ trigger: '.cat-cover', start: 'top bottom', end: 'bottom top', scrub: true, onUpdate: (s) => { tgt = s.progress; } });
  (function tick() {
    if (ready && v.duration && isFinite(v.duration)) {
      cur += (tgt - cur) * 0.12;
      const t = cur * (v.duration - 0.05);
      if (Math.abs(v.currentTime - t) > 0.02) { try { v.currentTime = t; } catch (_) {} }
    }
    requestAnimationFrame(tick);
  })();
})();

/* ---------- stacks keynote ---------- */
$$('.prod').forEach((prod) => {
  const imgs = $$('.pstack img', prod);
  const cnt = $('.pstack-count b', prod);
  let last = -1;
  const set = (p) => {
    const i = Math.min(imgs.length - 1, Math.max(0, Math.floor(p * imgs.length)));
    if (i === last) return;
    last = i;
    imgs.forEach((im, k) => im.classList.toggle('on', k === i));
    if (cnt) cnt.textContent = String(i + 1);
  };
  ScrollTrigger.create({ trigger: prod, start: 'top 78%', end: 'bottom 62%', scrub: true, onUpdate: (s) => set(s.progress) });
  set(0);
  if (!reduce) {
    gsap.fromTo($('.pstack', prod), { rotationX: 9, scale: 0.95 }, { rotationX: 0, scale: 1, transformPerspective: 1100, ease: 'none',
      scrollTrigger: { trigger: prod, start: 'top 88%', end: 'top 38%', scrub: 0.6 } });
  }
});

/* ---------- espectro: dial VFO ---------- */
(() => {
  const BANDS = [
    { name: 'NAVTEX', min: 490e3, max: 518e3 },
    { name: 'AM', min: 530e3, max: 1.7e6 },
    { name: 'HF', min: 2e6, max: 30e6 },
    { name: 'FM', min: 88e6, max: 108e6 },
  ];
  const knob = $('#knob'), freq = $('#freq'), unit = $('#unit'), bandEl = $('#band-name');
  const needle = $('#needle'), segs = $$('.seg'), panels = $$('.panel');
  if (!knob) return;
  let n = 0, lastBand = -1, dragging = false;
  const fmt = (f) => f >= 1e6
    ? [(f / 1e6).toLocaleString('es-CL', { minimumFractionDigits: 1, maximumFractionDigits: 2 }), 'MHz']
    : [(f / 1e3).toLocaleString('es-CL', { minimumFractionDigits: 1, maximumFractionDigits: 1 }), 'kHz'];
  function set(x) {
    n = Math.min(0.99999, Math.max(0, x));
    const bi = Math.min(3, Math.floor(n * 4));
    const r = n * 4 - bi; const b = BANDS[bi];
    const f = Math.exp(Math.log(b.min) + r * (Math.log(b.max) - Math.log(b.min)));
    const [val, un] = fmt(f);
    freq.textContent = val; unit.textContent = un; bandEl.textContent = b.name;
    needle.style.left = (n * 100).toFixed(2) + '%';
    knob.style.transform = `rotate(${(n * 720).toFixed(1)}deg)`;
    knob.setAttribute('aria-valuenow', Math.round(n * 100));
    knob.setAttribute('aria-valuetext', `${val} ${un} — ${b.name}`);
    if (bi !== lastBand) { lastBand = bi; segs.forEach((s, i) => s.classList.toggle('active', i === bi)); panels.forEach((p, i) => p.classList.toggle('active', i === bi)); }
  }
  ScrollTrigger.create({ trigger: '#espectro', start: 'top 72%', end: 'bottom 58%', scrub: 0.4, onUpdate: (s) => { if (!dragging) set(s.progress); } });
  let y0 = 0, n0 = 0;
  knob.addEventListener('pointerdown', (e) => { dragging = true; y0 = e.clientY; n0 = n; knob.setPointerCapture(e.pointerId); });
  knob.addEventListener('pointermove', (e) => { if (dragging) set(n0 + (y0 - e.clientY) * 0.0022); });
  const up = () => { dragging = false; };
  knob.addEventListener('pointerup', up); knob.addEventListener('pointercancel', up);
  knob.addEventListener('keydown', (e) => {
    const st = e.shiftKey ? 0.08 : 0.02;
    if (e.key === 'ArrowUp' || e.key === 'ArrowRight') { set(n + st); e.preventDefault(); }
    if (e.key === 'ArrowDown' || e.key === 'ArrowLeft') { set(n - st); e.preventDefault(); }
    if (e.key === 'Home') { set(0); e.preventDefault(); }
    if (e.key === 'End') { set(0.999); e.preventDefault(); }
  });
  set(0);
})();

/* ---------- proyectos track ---------- */
(() => {
  const mm = gsap.matchMedia();
  mm.add('(min-width: 1001px)', () => {
    const track = $('#htrack');
    const dist = () => track.scrollWidth - window.innerWidth;
    const tw = gsap.to(track, { x: () => -dist(), ease: 'none',
      scrollTrigger: { trigger: '#proyectos', start: 'top top', end: () => '+=' + dist(), pin: '.proj-pin', scrub: 1, anticipatePin: 1, invalidateOnRefresh: true,
        onUpdate: (s) => { $('#proj-now').textContent = String(Math.min(4, Math.floor(s.progress * 4) + 1)).padStart(2, '0'); } } });
    $$('.slide').forEach((s) => {
      const m = $('.slide-media img', s);
      if (m) gsap.fromTo(m, { xPercent: -6, scale: 1.12 }, { xPercent: 6, ease: 'none',
        scrollTrigger: { trigger: s, containerAnimation: tw, start: 'left right', end: 'right left', scrub: true } });
    });
  });
  const vid = $('.slide-media video');
  if (vid) new IntersectionObserver((es) => { es[0].isIntersecting ? vid.play().catch(() => {}) : vid.pause(); }, { threshold: 0.4 }).observe(vid);
})();

/* ---------- caps parallax + cta video + tilt + magnético ---------- */
if (!reduce) {
  $$('.cap-media img').forEach((img) => gsap.fromTo(img, { yPercent: -5 }, { yPercent: 5, ease: 'none', scrollTrigger: { trigger: img, start: 'top bottom', end: 'bottom top', scrub: 0.7 } }));
}
(() => {
  const band = $('.cta-band'); if (!band) return;
  const v = document.createElement('video');
  v.src = './assets/videos/cta-loop.mp4'; v.muted = true; v.loop = true; v.playsInline = true; v.preload = 'metadata'; v.setAttribute('aria-hidden', 'true');
  band.prepend(v);
  new IntersectionObserver((es) => { es[0].isIntersecting ? v.play().catch(() => {}) : v.pause(); }, { threshold: 0.3 }).observe(band);
})();
if (!reduce && matchMedia('(pointer: fine)').matches) {
  $$('[data-tilt]').forEach((el) => {
    el.addEventListener('pointermove', (e) => {
      const r = el.getBoundingClientRect();
      gsap.to(el, { rotationY: ((e.clientX - r.left) / r.width - 0.5) * 8, rotationX: -((e.clientY - r.top) / r.height - 0.5) * 8, transformPerspective: 1000, duration: 0.6, ease: 'power2.out' });
    });
    el.addEventListener('pointerleave', () => gsap.to(el, { rotationX: 0, rotationY: 0, duration: 1.1, ease: 'elastic.out(1, 0.45)' }));
  });
  $$('.btn').forEach((b) => {
    b.addEventListener('pointermove', (e) => {
      const r = b.getBoundingClientRect();
      gsap.to(b, { x: (e.clientX - r.left - r.width / 2) * 0.25, y: (e.clientY - r.top - r.height / 2) * 0.3, duration: 0.4, ease: 'power2.out' });
    });
    b.addEventListener('pointerleave', () => gsap.to(b, { x: 0, y: 0, duration: 0.8, ease: 'elastic.out(1, 0.4)' }));
  });
}

/* ---------- v1.2: film de fondo scrubbed en toda la pagina ---------- */
(() => {
  const v = document.getElementById('back-film-v');
  if (!v) return;
  let ready = false, tgt = 0, cur = 0;
  v.addEventListener('loadedmetadata', () => { ready = true; v.loop = true; v.playbackRate = 0.42; v.play().catch(()=>{}); }, { once: true });
  ScrollTrigger.create({ start: 0, end: 'max', scrub: true, onUpdate: (s) => { tgt = s.progress; } });
  document.addEventListener('visibilitychange', () => { if (document.hidden) v.pause(); });
  (function tick() {
    if (ready && v.duration && isFinite(v.duration) && !reduce) {
      // scrub + ambient drift — video nunca queda quieto
      cur += (tgt - cur) * 0.06;
      if (Math.abs(tgt - cur) < 0.001) cur += 0.00018; // drift lento
      if (cur > 0.98) cur = 0; // loop scrub
      const t = (cur % 1) * (v.duration - 0.05);
      if (Math.abs(v.currentTime - t) > 0.02) { try { v.currentTime = t; } catch (_) {} }
      // mantener playbackRate vivo por si el navegador lo pausa
      if (v.paused && !document.hidden) v.play().catch(()=>{});
    }
    requestAnimationFrame(tick);
  })();
})();

/* ---------- v1.5: parallax editorial de medios + skew del marquee por velocidad ---------- */
(() => {
  if (reduce) return;
  gsap.utils.toArray('.cap-media, .slide-media').forEach((box) => {
    const img = box.querySelector('img'); if (!img) return;
    gsap.set(img, { scale: 1.14 });
    gsap.fromTo(img, { yPercent: -7 }, { yPercent: 7, ease: 'none', scrollTrigger: { trigger: box, start: 'top bottom', end: 'bottom top', scrub: true } });
  });
  const track = document.querySelector('.marq-in');
  if (track && lenis) {
    const sk = gsap.quickTo(track, 'skewX', { duration: .5, ease: 'power2.out' });
    lenis.on('scroll', ({ velocity }) => sk(Math.max(-6, Math.min(6, velocity * .06))));
  }
})();

/* ---------- v1.7-prep: inercia de capas del hero + pulso del needle VFO ---------- */
(() => {
  if (reduce) return;
  const st = { trigger: '#hero', start: 'top top', end: 'bottom top', scrub: true };
  gsap.to('#film', { yPercent: 6, scale: 1.1, ease: 'none', scrollTrigger: st });
  gsap.to('.hero-ghost', { yPercent: -30, ease: 'none', scrollTrigger: st });
  gsap.to('.hero-in', { yPercent: -16, autoAlpha: .3, ease: 'none', scrollTrigger: st });
  gsap.to('.hud', { y: -46, ease: 'none', scrollTrigger: st });
  gsap.to('.hero-float', { yPercent: -34, scale: .88, rotationY: 6, ease: 'none', scrollTrigger: st });
  gsap.to('.hero-cue', { autoAlpha: 0, y: -12, ease: 'none', scrollTrigger: st });
  const needle = document.querySelector('.needle');
  document.querySelectorAll('.segs button, .segs [role="button"], .segs li').forEach((el) => {
    el.addEventListener('click', () => {
      if (!needle) return;
      needle.classList.add('pulse');
      setTimeout(() => needle.classList.remove('pulse'), 620);
    });
  });
})();

/* ---------- v1.7 — hero Apple pin + transmitter desarme sync ---------- */
(() => {
  if (reduce) return;
  // Pin sutil del hero para lectura Apple (sin bloquear scroll)
  ScrollTrigger.create({
    trigger: '#hero',
    start: 'top top',
    end: '+=68%',
    pin: true,
    pinSpacing: true,
    scrub: false,
    // fallback para mobile: pinType auto
  });
  // El film del hero hace scrub de su tiempo con el scroll (desarme conectado)
  const film = document.getElementById('film');
  if (film) {
    const st2 = { trigger: '#hero', start: 'top top', end: 'bottom top', scrub: true };
    ScrollTrigger.create({ ...st2, onUpdate: (s) => {
      // ligera sincronia: el fondo global y el hero comparten progreso
      const bv = document.getElementById('back-film-v');
      if (bv && bv.duration) {
        // no forzamos currentTime si el video esta en autoplay loop (evita freeze), solo modulamos playbackRate ya hecho en v1.5
      }
    }});
  }
})();
