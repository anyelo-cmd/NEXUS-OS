/* NEXUS OS — efectos vivos: campo de estrellas con paralaje, foco de luz del cursor, minimapa, reloj */
(function () {
  const N = window.NEXUS, S = N.state;
  const bg = document.getElementById('bg'), bx = bg.getContext('2d');
  const mm = document.getElementById('minimap'), mx = mm.getContext('2d');
  const spot = document.getElementById('spot');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const css = (v) => getComputedStyle(document.documentElement).getPropertyValue(v).trim();

  /* Partículas: cada una tiene profundidad (paralaje respecto al pan) y deriva lenta */
  const TILE = 1600, stars = Array.from({ length: 90 }, () => ({ x: Math.random() * TILE, y: Math.random() * TILE, d: 0.05 + Math.random() * 0.4, r: Math.random() * 1.6 + 0.4, p: Math.random() * 6.28, s: 0.4 + Math.random() }));
  let mouse = { x: innerWidth / 2, y: innerHeight / 2 }, t0 = performance.now();

  addEventListener('pointermove', (e) => { mouse = { x: e.clientX, y: e.clientY }; spot.style.setProperty('--mx', e.clientX + 'px'); spot.style.setProperty('--my', e.clientY + 'px'); });

  const wrap = (v, m) => ((v % m) + m) % m;
  function drawBg(t) {
    const dpr = Math.min(devicePixelRatio || 1, 1.5), W = innerWidth, H = innerHeight;
    if (bg.width !== Math.round(W * dpr)) { bg.width = W * dpr; bg.height = H * dpr; }
    bx.setTransform(dpr, 0, 0, dpr, 0, 0); bx.clearRect(0, 0, W, H);
    if (level === 0) { bx.clearRect(0, 0, W, H); return; }
    const col = css('--star') || '200,210,255', v = S.view;
    const pts = [];
    for (const s of (level === 2 ? stars : stars.slice(0, 40))) {
      const x = wrap(s.x + v.x * s.d + t * 0.004 * s.s, TILE) * (W / TILE * 1.2) % W, y = wrap(s.y + v.y * s.d - t * 0.003 * s.s, TILE) * (H / TILE * 1.2) % H;
      const a = 0.35 + 0.45 * Math.sin(t * 0.0015 * s.s + s.p);
      bx.fillStyle = `rgba(${col},${Math.max(0.08, a) * (0.4 + s.d)})`;
      bx.beginPath(); bx.arc(x, y, s.r * (0.6 + s.d), 0, 6.283); bx.fill();
      pts.push([x, y]);
    }
    // constelaciones: líneas entre partículas cercanas y al cursor
    bx.lineWidth = 1;
    for (let i = 0; level === 2 && i < pts.length; i++) {
      for (let j = i + 1; j < pts.length; j++) {
        const dx = pts[i][0] - pts[j][0], dy = pts[i][1] - pts[j][1], d2 = dx * dx + dy * dy;
        if (d2 < 9000) { bx.strokeStyle = `rgba(${col},${0.14 * (1 - d2 / 9000)})`; bx.beginPath(); bx.moveTo(...pts[i]); bx.lineTo(...pts[j]); bx.stroke(); }
      }
      const dx = pts[i][0] - mouse.x, dy = pts[i][1] - mouse.y, d2 = dx * dx + dy * dy;
      if (d2 < 22000) { bx.strokeStyle = `rgba(${col},${0.35 * (1 - d2 / 22000)})`; bx.beginPath(); bx.moveTo(...pts[i]); bx.lineTo(mouse.x, mouse.y); bx.stroke(); }
    }
  }

  /* Minimapa */
  const COLORS = () => N.apps;
  function drawMap() {
    const W = mm.width, H = mm.height; mx.clearRect(0, 0, W, H);
    const ws = S.windows, vw = innerWidth / S.view.z, vh = innerHeight / S.view.z, vx = -S.view.x / S.view.z, vy = -S.view.y / S.view.z;
    let x1 = vx, y1 = vy, x2 = vx + vw, y2 = vy + vh;
    ws.forEach((w) => { x1 = Math.min(x1, w.x); y1 = Math.min(y1, w.y); x2 = Math.max(x2, w.x + w.w); y2 = Math.max(y2, w.y + w.h); });
    const pad = 80, k = Math.min(W / (x2 - x1 + pad * 2), H / (y2 - y1 + pad * 2));
    const ox = (W - (x2 - x1) * k) / 2 - x1 * k, oy = (H - (y2 - y1) * k) / 2 - y1 * k;
    mm._map = { k, ox, oy };
    ws.forEach((w) => { mx.fillStyle = (COLORS()[w.type]?.color || '#7b8cff') + 'cc'; mx.fillRect(w.x * k + ox, w.y * k + oy, Math.max(4, w.w * k), Math.max(3, (w.min ? 30 : w.h) * k)); });
    mx.strokeStyle = css('--text') || '#fff'; mx.lineWidth = 2; mx.strokeRect(vx * k + ox, vy * k + oy, vw * k, vh * k);
  }
  mm.addEventListener('pointerdown', (e) => {
    const m = mm._map; if (!m || document.body.classList.contains('has-fix')) return; const r = mm.getBoundingClientRect();
    const wx = ((e.clientX - r.left) * (mm.width / r.width) - m.ox) / m.k, wy = ((e.clientY - r.top) * (mm.height / r.height) - m.oy) / m.k;
    S.view.x = innerWidth / 2 - wx * S.view.z; S.view.y = innerHeight / 2 - wy * S.view.z; N.applyView(); N.save();
  });

  /* Reloj y contador */
  const clock = document.getElementById('clock'), cnt = document.getElementById('wincount');
  const dateEl = document.getElementById('date');
  const tick = () => { const d = new Date(); clock.textContent = d.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', hour12: false }); if (dateEl) dateEl.textContent = d.toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' }); if (cnt) cnt.textContent = S.windows.length; };
  setInterval(tick, 1000); N.on('windows', tick); tick();

  /* Calibración de rendimiento: 2=alto, 1=medio (sin cristal ni líneas), 0=bajo (sin fondo animado ni efectos) */
  const NAMES = ['bajo', 'medio', 'alto'], MODES = ['auto', 'alto', 'medio', 'bajo'];
  let mode = 'auto', level = 2, fps = 60, frames = 0, tMark = performance.now(), born = tMark;
  try { mode = localStorage.getItem('nexus-perf') || 'auto'; } catch (e) {}
  const btn = document.getElementById('btn-perf');
  function setLevel(l) { level = l; document.documentElement.dataset.perf = NAMES[l]; }
  function applyMode() {
    if (mode !== 'auto') setLevel({ alto: 2, medio: 1, bajo: 0 }[mode]);
    btn.title = `Rendimiento: ${mode}${mode === 'auto' ? ' (' + NAMES[level] + ')' : ''} · ${Math.round(fps)} FPS — clic para cambiar`;
  }
  btn.onclick = () => {
    mode = MODES[(MODES.indexOf(mode) + 1) % 4]; if (mode === 'auto') setLevel(2);
    try { localStorage.setItem('nexus-perf', mode); } catch (e) {}
    tMark = performance.now(); frames = 0; applyMode(); N.toast('⚡ Rendimiento: ' + mode + (mode === 'auto' ? ' (se ajusta solo)' : ''));
  };
  if (mode === 'auto') setLevel(2); applyMode();
  N.perfMode = () => mode;
  N.setPerfMode = (m) => { if (!MODES.includes(m)) return; mode = m; if (mode === 'auto') setLevel(2); try { localStorage.setItem('nexus-perf', mode); } catch (e) {} tMark = performance.now(); frames = 0; applyMode(); };

  function calibrate(now) {
    frames++;
    if (now - tMark < 2000) return;
    fps = (frames * 1000) / (now - tMark); frames = 0; tMark = now;
    if (mode === 'auto' && now - born > 4000 && fps < 40 && level > 0) { setLevel(level - 1); N.toast(`⚡ ${Math.round(fps)} FPS: bajé los efectos a nivel ${NAMES[level]}`, 'warn'); }
    applyMode();
  }

  let lastMap = 0;
  (function loop(now) {
    if (!document.hidden) {
      drawBg(reduce ? 0 : now - t0); calibrate(now);
      if (now - lastMap > (level === 2 ? 60 : 200)) { drawMap(); lastMap = now; }
    } else { tMark = now; frames = 0; }
    requestAnimationFrame(loop);
  })(performance.now());
})();
