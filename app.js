// app.js - interactions for the birthday page
(function () {
  'use strict';

  // Constants
  const START_ISO = '2025-02-04T20:05:00+08:00'; // Beijing time
  const NICKNAMES = ['小晴宝宝', '妈咪', '乖乖'];
  const ONE_MIN_MS = 60 * 1000;
  const ONE_DAY_MS = 24 * 60 * 60 * 1000;

  // Performance presets for hearts effect
  const PERF_PRESET = {
    high:   { throttleMs: 120, count: [10, 16], maxHearts: 120, dur: [1100, 2000] },
    medium: { throttleMs: 200, count: [ 6, 10], maxHearts:  80, dur: [ 900, 1600] },
    low:    { throttleMs: 280, count: [ 4,  6], maxHearts:  50, dur: [ 700, 1200] },
  };
  let PERF_TIER = 'high';
  let HEARTS_CONF = PERF_PRESET.high;
  let MAX_HEARTS = HEARTS_CONF.maxHearts; // dynamic limit in DOM

  let heartsAlive = 0;
  const reducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Utilities
  function throttle(fn, limitMs) {
    let last = 0; let timer = null;
    return function (...args) {
      const now = Date.now();
      const remaining = limitMs - (now - last);
      if (remaining <= 0) {
        last = now;
        fn.apply(this, args);
      } else if (!timer) {
        timer = setTimeout(() => {
          last = Date.now();
          timer = null;
          fn.apply(this, args);
        }, remaining);
      }
    };
  }

  function randomBetween(min, max) {
    const lo = Math.min(min, max); const hi = Math.max(min, max);
    return Math.floor(lo + Math.random() * (hi - lo + 1));
  }

  function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

  function safeText(el, text) {
    if (!el) return;
    el.textContent = String(text);
  }

  function parseStart(iso) {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return null;
    return d;
  }

  function computeElapsedMs(start, nowMs) {
    const now = typeof nowMs === 'number' ? nowMs : Date.now();
    return Math.max(0, now - start.getTime());
  }

  function getElapsedDays(ms) {
    return Math.floor(ms / ONE_DAY_MS);
  }

  // Timer (D/H/M)
  const START_DATE = parseStart(START_ISO) || new Date('2025-02-04T12:05:00Z'); // fallback

  function getElapsedDHM(ms) {
    if (ms <= 0) return { days: 0, hours: 0, minutes: 0 };
    const totalMinutes = Math.floor(ms / ONE_MIN_MS);
    const days = Math.floor(totalMinutes / (24 * 60));
    const hours = Math.floor((totalMinutes % (24 * 60)) / 60);
    const minutes = totalMinutes % 60;
    return { days, hours, minutes };
  }

  function updateTimerDHM() {
    const dEl = document.getElementById('days');
    const hEl = document.getElementById('hours');
    const mEl = document.getElementById('mins');
    if (!dEl || !hEl || !mEl) return;
    const ms = computeElapsedMs(START_DATE);
    const { days, hours, minutes } = getElapsedDHM(ms);
    safeText(dEl, days);
    safeText(hEl, hours);
    safeText(mEl, minutes);
  }

  // Nickname rotation
  function startNicknameRotation(names, intervalMs) {
    const el = document.getElementById('nickname');
    if (!el || !Array.isArray(names) || !names.length) return;
    let i = 0;
    setInterval(() => {
      i = (i + 1) % names.length;
      // simple fade effect
      el.style.opacity = '0';
      setTimeout(() => { safeText(el, names[i]); el.style.opacity = '1'; }, 200);
    }, Math.max(1200, intervalMs || 2800));
  }

  // Typewriter
  function readTypewriterLines() {
    const tpl = document.getElementById('tw-lines');
    if (!tpl || !tpl.content) return [];
    const ps = Array.from(tpl.content.querySelectorAll('p'));
    return ps.map(p => (p.textContent || '').trim()).filter(Boolean);
  }

  async function typewriterPlay(lines, target, opts) {
    const conf = Object.assign({ charMin: 28, charMax: 60, pauseLine: 800, loop: false }, opts || {});
    if (!target || !Array.isArray(lines) || !lines.length) return;
    const rm = reducedMotion;
    do {
      for (const line of lines) {
        if (rm) {
          target.textContent = line;
          await sleep(200);
        } else {
          target.textContent = '';
          for (const ch of line) {
            target.textContent += ch;
            await sleep(randomBetween(conf.charMin, conf.charMax));
          }
        }
        await sleep(conf.pauseLine);
      }
    } while (conf.loop);
  }

  function startTypewriter() {
    const el = document.getElementById('typewriter');
    if (!el) return;
    const lines = readTypewriterLines();
    if (!lines.length) { el.textContent = '今天的风也很温柔，刚好适合说一句：生日快乐。'; return; }
    typewriterPlay(lines, el, {});
  }

  // Click hearts effect
  const spawnHearts = (x, y, count) => {
    const layer = document.getElementById('fx-layer');
    if (!layer) return;
    const batch = Math.max(1, Math.min(16, count | 0));
    for (let i = 0; i < batch; i++) {
      if (heartsAlive >= MAX_HEARTS) break;
      const s = document.createElement('span');
      s.className = 'heart';
      s.setAttribute('aria-hidden', 'true');
      s.textContent = '❤';
      const hue = 330 + Math.floor(Math.random() * 40); // pink-ish hues
      const sat = 85 + Math.floor(Math.random() * 10);
      const lig = 58 + Math.floor(Math.random() * 10);
      const size = 16 + Math.random() * 14; // px
      const dx = (Math.random() - 0.5) * 40; // drift
      const dur = randomBetween(HEARTS_CONF.dur[0], HEARTS_CONF.dur[1]); // ms

      s.style.color = `hsl(${hue} ${sat}% ${lig}%)`;
      s.style.left = `${x - size / 2}px`;
      s.style.top = `${y - size / 2}px`;
      s.style.fontSize = `${size}px`;
      s.style.setProperty('--dx', `${dx}px`);
      s.style.setProperty('--dy', `0px`);
      s.style.setProperty('--s', `${1 + Math.random() * 0.4}`);
      s.style.animationDuration = `${dur}ms`;

      const cleanup = () => { if (s && s.parentNode) { s.removeEventListener('animationend', cleanup); s.parentNode.removeChild(s); heartsAlive--; } };
      s.addEventListener('animationend', cleanup);

      heartsAlive++;
      layer.appendChild(s);
    }
  };

  // Dynamic pointer handler with tier-aware throttle and counts
  let pointerHandler = null;
  function buildPointerHandler() {
    return throttle((evt) => {
      if (reducedMotion) return; // respect user preference
      const x = evt.clientX; const y = evt.clientY;
      const count = randomBetween(HEARTS_CONF.count[0], HEARTS_CONF.count[1]);
      spawnHearts(x, y, count);
    }, HEARTS_CONF.throttleMs);
  }

  function rebindPointerHandler() {
    if (pointerHandler) document.removeEventListener('pointerdown', pointerHandler);
    pointerHandler = buildPointerHandler();
    document.addEventListener('pointerdown', pointerHandler);
  }

  function setupEventListeners() {
    // Use pointer events for better mobile responsiveness
    rebindPointerHandler();
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) updateTimerDHM();
    });
    window.addEventListener('focus', updateTimerDHM);
    window.addEventListener('resize', throttle(updateTimerDHM, 500));
  }

  function determinePerfTier() {
    try {
      const saved = localStorage.getItem('perfTier');
      if (saved === 'high' || saved === 'medium' || saved === 'low') return saved;
    } catch(_) {}
    if (reducedMotion) return 'low';
    let tier = 'high';
    try {
      const conn = navigator.connection;
      if (conn && (conn.saveData || (conn.effectiveType && /2g/.test(conn.effectiveType)))) tier = 'medium';
      const dm = navigator.deviceMemory || 0;
      const hc = navigator.hardwareConcurrency || 0;
      if ((dm && dm <= 4) || (hc && hc <= 4)) tier = (tier === 'medium') ? 'low' : 'medium';
    } catch(_) {}
    return tier;
  }

  function applyPerfTier(tier) {
    if (!PERF_PRESET[tier]) return;
    PERF_TIER = tier;
    HEARTS_CONF = PERF_PRESET[tier];
    MAX_HEARTS = HEARTS_CONF.maxHearts;
    try { localStorage.setItem('perfTier', tier); } catch(_) {}
    const btn = document.getElementById('perfToggle');
    if (btn) btn.title = '性能档位：' + tier;
    rebindPointerHandler();
  }

  function setupPerfToggle() {
    const btn = document.getElementById('perfToggle');
    if (!btn) return;
    btn.addEventListener('click', () => {
      const next = (PERF_TIER === 'high') ? 'medium' : (PERF_TIER === 'medium') ? 'low' : 'high';
      applyPerfTier(next);
    });
  }

  function setupPerfReveal() {
    const btn = document.getElementById('perfToggle');
    if (!btn) return;
    let timer = null; let sx = 0, sy = 0; let down = false;
    const corner = (x, y) => (x > window.innerWidth - 96) && (y > window.innerHeight - 96);
    function clearTimer() { if (timer) { clearTimeout(timer); timer = null; } down = false; }
    document.addEventListener('pointerdown', (e) => {
      if (!corner(e.clientX, e.clientY)) return;
      down = true; sx = e.clientX; sy = e.clientY;
      timer = setTimeout(() => {
        btn.classList.add('revealed');
        try { localStorage.setItem('perfToggleShown', '1'); } catch(_) {}
      }, 800);
    });
    document.addEventListener('pointermove', (e) => {
      if (!down || !timer) return;
      if (Math.hypot(e.clientX - sx, e.clientY - sy) > 20) clearTimer();
    });
    document.addEventListener('pointerup', clearTimer);
    document.addEventListener('pointercancel', clearTimer);
    try { if (localStorage.getItem('perfToggleShown') === '1') btn.classList.add('revealed'); } catch(_) {}
  }

  async function finishLoading() {
    const loader = document.getElementById('loader');
    if (!loader) return;
    const img = document.getElementById('cake-img');
    const timeout = new Promise(r => setTimeout(r, 1200));
    try {
      if (img && img.decode) {
        await Promise.race([img.decode().catch(() => {}), timeout]);
      } else {
        await timeout;
      }
    } catch(_) {}
    loader.classList.add('fade-out');
    setTimeout(() => { if (loader && loader.parentNode) loader.parentNode.removeChild(loader); }, 600);
  }

  function initApp() {
    applyPerfTier(determinePerfTier());
    updateTimerDHM();
    setInterval(updateTimerDHM, 15 * 1000);
    startNicknameRotation(NICKNAMES, 2800);
    setupEventListeners();
    setupPerfToggle();
    setupPerfReveal();
    startTypewriter();
    finishLoading();
  }

  // Bootstrap
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
  } else {
    initApp();
  }
})();
