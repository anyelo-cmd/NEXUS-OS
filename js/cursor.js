/* NEXUS OS — cursor holográfico: punto de luz exacto + retícula giratoria con inercia, estela de cometa,
   "bloqueo de objetivo" sobre lo que se puede pulsar, cursor de texto, pulso al hacer clic y ondas expansivas.
   Se desactiva en pantallas táctiles, con "reducir movimiento" o desde Configuración. Sobre páginas web
   incrustadas (iframes) vuelve el cursor normal para no estorbar. */
(function () {
  const N = window.NEXUS;
  if (matchMedia('(pointer:coarse)').matches) return;
  const cv = document.createElement('canvas'); cv.id = 'hcur'; document.body.append(cv);
  const ctx = cv.getContext('2d');
  let W = 0, H = 0, on = false, raf = 0, col = [255, 42, 61];
  const dpr = Math.min(devicePixelRatio || 1, 1.5);
  const M = { x: -99, y: -99, rx: -99, ry: -99, vis: false, state: 'idle', down: false, k: 0, ang: 0, tx: 0, ty: 0 };
  const trail = [], ripples = [], sparks = [];
  const HOT = 'a,button,[role=button],[role=switch],.btn,.d-icon,.task,.tb-btn,.tb-start,.tb-search,.tb-clock,select,summary,label,.l-item,.chip,.lrn-opt,.lrn-node,.sv-opt,.sv-dot,.st-sw,.st-theme,.seg button,.win-head button,.resize,.lk-eye,input[type=checkbox],input[type=range],input[type=color]';
  const TXT = 'input:not([type=checkbox]):not([type=range]):not([type=color]):not([type=button]):not([type=submit]),textarea,[contenteditable="true"],.cm-content,.lrn-fill';
  const readCol = () => { const v = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim(); if (/^#[0-9a-f]{6}$/i.test(v)) { const n = parseInt(v.slice(1), 16); col = [(n >> 16) & 255, (n >> 8) & 255, n & 255]; } };
  const A = (a, c = col) => `rgba(${c[0]},${c[1]},${c[2]},${Math.max(0, Math.min(1, a)).toFixed(3)})`;
  const fit = () => { W = innerWidth; H = innerHeight; cv.width = W * dpr; cv.height = H * dpr; cv.style.width = W + 'px'; cv.style.height = H + 'px'; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); };

  function target(el) {
    if (!el || el === document.documentElement) return 'idle';
    if (el.tagName === 'IFRAME') return 'native';
    if (el.closest(TXT)) return 'text';
    const hot = el.closest(HOT);
    if (hot) { const r = hot.getBoundingClientRect(); M.tx = r.left + r.width / 2; M.ty = r.top + r.height / 2; M.tw = Math.min(r.width, 160); M.th = Math.min(r.height, 90); return hot.classList.contains('resize') ? 'resize' : 'hot'; }
    return 'idle';
  }
  addEventListener('pointermove', (e) => {
    if (e.pointerType === 'touch') return;
    M.x = e.clientX; M.y = e.clientY; if (!M.vis) { M.rx = M.x; M.ry = M.y; M.vis = true; }
    const s = target(e.target); if (s !== M.state) { M.state = s; document.documentElement.classList.toggle('cur-native', s === 'native'); }
  }, { passive: true });
  addEventListener('pointerdown', (e) => { if (e.pointerType === 'touch') return; M.down = true; ripples.push({ x: e.clientX, y: e.clientY, r: 6, a: 0.9 }); for (let i = 0; i < 9; i++) { const a = Math.random() * 6.283, v = 1.2 + Math.random() * 2.6; sparks.push({ x: e.clientX, y: e.clientY, vx: Math.cos(a) * v, vy: Math.sin(a) * v, a: 1 }); } }, true);
  addEventListener('pointerup', () => { M.down = false; }, true);
  document.addEventListener('mouseleave', () => { M.vis = false; });
  document.addEventListener('mouseenter', () => { M.vis = true; });
  addEventListener('resize', fit);

  function frame(now) {
    raf = requestAnimationFrame(frame);
    if (document.hidden) return;
    ctx.clearRect(0, 0, W, H);
    if (!M.vis || M.state === 'native') return;
    const lag = M.state === 'hot' ? 0.38 : 0.26;
    M.rx += (M.x - M.rx) * lag; M.ry += (M.y - M.ry) * lag;
    M.ang += M.state === 'hot' ? 0.055 : M.down ? 0.09 : 0.022;
    M.k += (((M.state === 'hot' || M.state === 'resize') ? 1 : 0) - M.k) * 0.2;
    trail.push({ x: M.x, y: M.y, a: 1 }); if (trail.length > 22) trail.shift();
    ctx.globalCompositeOperation = 'lighter';
    // estela de cometa
    if (document.documentElement.dataset.perf !== 'low') for (let i = 1; i < trail.length; i++) { const p = trail[i - 1], q = trail[i], f = i / trail.length; ctx.strokeStyle = A(f * 0.55); ctx.lineWidth = 0.6 + f * 3.4; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(q.x, q.y); ctx.stroke(); }
    if (M.state === 'text') {
      ctx.fillStyle = A(0.95); ctx.fillRect(M.x - 1, M.y - 11, 2, 22); ctx.fillStyle = A(0.5); ctx.fillRect(M.x - 5, M.y - 12, 10, 1.5); ctx.fillRect(M.x - 5, M.y + 10.5, 10, 1.5);
    } else {
      // retícula: seis arcos giratorios
      const R = (M.state === 'hot' ? 17 : 13) * (M.down ? 0.7 : 1) + Math.sin(now / 280) * 0.8, cx = M.rx, cy = M.ry;
      ctx.lineWidth = 1.6; ctx.strokeStyle = A(0.85);
      for (let i = 0; i < 6; i++) { const a0 = M.ang + i * 1.0472; ctx.beginPath(); ctx.arc(cx, cy, R, a0, a0 + 0.62); ctx.stroke(); }
      ctx.strokeStyle = A(0.25); ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(cx, cy, R + 5, -M.ang * 0.6, -M.ang * 0.6 + 4.2); ctx.stroke();
      // bloqueo de objetivo: esquinas del elemento
      if (M.k > 0.02 && M.state !== 'idle' && M.tw) { const w = M.tw / 2 + 5, h = M.th / 2 + 5, x = M.tx, y = M.ty, l = 7, k = M.k; ctx.strokeStyle = A(0.8 * k); ctx.lineWidth = 1.5; ctx.beginPath(); [[-1, -1], [1, -1], [1, 1], [-1, 1]].forEach(([sx, sy]) => { ctx.moveTo(x + sx * w, y + sy * (h - l)); ctx.lineTo(x + sx * w, y + sy * h); ctx.lineTo(x + sx * (w - l), y + sy * h); }); ctx.stroke(); }
      if (M.state === 'resize') { ctx.strokeStyle = A(0.9); ctx.beginPath(); ctx.moveTo(cx - 9, cy - 9); ctx.lineTo(cx + 9, cy + 9); ctx.stroke(); }
      // núcleo: punto exacto con halo
      const g = ctx.createRadialGradient(M.x, M.y, 0, M.x, M.y, 11); g.addColorStop(0, A(0.9, [255, 255, 255])); g.addColorStop(0.3, A(0.55)); g.addColorStop(1, A(0));
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(M.x, M.y, 11, 0, 7); ctx.fill();
    }
    // ondas y chispas del clic
    for (let i = ripples.length - 1; i >= 0; i--) { const r = ripples[i]; r.r += 3.2; r.a -= 0.035; if (r.a <= 0) { ripples.splice(i, 1); continue; } ctx.strokeStyle = A(r.a); ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(r.x, r.y, r.r, 0, 7); ctx.stroke(); }
    for (let i = sparks.length - 1; i >= 0; i--) { const s = sparks[i]; s.x += s.vx; s.y += s.vy; s.vx *= 0.93; s.vy *= 0.93; s.a -= 0.045; if (s.a <= 0) { sparks.splice(i, 1); continue; } ctx.fillStyle = A(s.a, [255, 255, 255]); ctx.fillRect(s.x - 1, s.y - 1, 2.2, 2.2); }
    ctx.globalCompositeOperation = 'source-over';
  }

  function enable(v) {
    if (v === on) return; on = v;
    document.documentElement.classList.toggle('hcur', v);
    cv.style.display = v ? '' : 'none';
    if (v) { readCol(); fit(); if (!raf) raf = requestAnimationFrame(frame); } else { cancelAnimationFrame(raf); raf = 0; }
  }
  const want = () => N.get && N.get('cursor') !== false && !matchMedia('(prefers-reduced-motion: reduce)').matches;
  N.on('settings', () => { readCol(); enable(want()); });
  enable(false); setTimeout(() => enable(want()), 0);
})();
