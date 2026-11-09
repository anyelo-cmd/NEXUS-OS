/* NEXUS OS — motor holográfico 3D (Canvas 2D, sin librerías).
   Dibuja en tiempo real un núcleo de IA: nube de puntos con red neuronal (geometría calculada en Python con NumPy
   y, sin servidor, generada aquí), plano de escaneo, anillos giroscópicos, ecualizador de voz, proyector con haz de luz
   y suelo de rejilla en perspectiva. Se usa en el arranque, el inicio de sesión y el fondo vivo del escritorio. */
(function () {
  const N = window.NEXUS;
  const mouse = { x: 0, y: 0 };
  const LITE = /[?&]lite/.test(location.search);   // solo para pruebas automáticas
  addEventListener('pointermove', (e) => { mouse.x = (e.clientX / innerWidth) * 2 - 1; mouse.y = (e.clientY / innerHeight) * 2 - 1; }, { passive: true });

  /* ---- geometría ---- */
  const lcg = (s) => () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
  function genGeo(seed, n) {
    const r = lcg(seed || 7), pts = [], ph = [r() * 6.28, r() * 6.28, r() * 6.28, r() * 6.28];
    const shell = (cnt, rad, bump) => { for (let i = 0; i < cnt; i++) { const p = Math.acos(1 - 2 * (i + 0.5) / cnt), t = Math.PI * (1 + Math.sqrt(5)) * (i + 0.5); let x = Math.cos(t) * Math.sin(p), y = Math.cos(p), z = Math.sin(t) * Math.sin(p); const b = bump ? 1 + 0.07 * Math.sin(x * 5 + ph[0]) * Math.sin(y * 4 + ph[1]) + 0.05 * Math.sin(z * 7 + ph[2]) * Math.cos(x * 3 + ph[3]) : 1; pts.push([x * rad * b, y * rad * b, z * rad * b]); } };
    shell(n, 1, true); shell(Math.floor(n / 4), 0.52, false);
    const lim = 2.4 * Math.sqrt(4 * Math.PI / n), edges = [], seen = new Set();
    for (let a = 0; a < pts.length; a++) {
      const ds = [];
      for (let b = 0; b < pts.length; b++) if (a !== b) { const dx = pts[a][0] - pts[b][0], dy = pts[a][1] - pts[b][1], dz = pts[a][2] - pts[b][2]; ds.push([dx * dx + dy * dy + dz * dz, b]); }
      ds.sort((p, q) => p[0] - q[0]);
      for (let k = 0; k < 3; k++) if (Math.sqrt(ds[k][0]) < lim) { const b = ds[k][1], key = Math.min(a, b) * 4096 + Math.max(a, b); if (!seen.has(key)) { seen.add(key); edges.push([Math.min(a, b), Math.max(a, b)]); } }
    }
    return { pts, edges };
  }
  let local = null, pyGeo = null;
  const localGeo = () => (local ||= genGeo(7, 300));
  const geometry = () => pyGeo || localGeo();
  // la versión de Python (más densa y con el seed del usuario) reemplaza a la local en cuanto llega
  N.holoReady = new Promise((r) => setTimeout(r, 0)).then(async () => { try { if (N.py && (await N.py.ping())) { const g = await N.py.call('/api/holo', { seed: N.get ? N.get('seed') : 7, n: 520 }); if (g && g.pts && g.edges) pyGeo = g; } } catch (e) { /* queda la local */ } });

  const rgbOf = () => { const v = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#ff2a3d'; const n = parseInt(v.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
  const rot = (x, y, z, ay, ax) => { const c = Math.cos(ay), s = Math.sin(ay); let X = x * c + z * s, Z = -x * s + z * c; const c2 = Math.cos(ax), s2 = Math.sin(ax); return [X, y * c2 - Z * s2, y * s2 + Z * c2]; };

  /* ---- escena ---- */
  function create(canvas, opt = {}) {
    const ctx = canvas.getContext('2d'), mode = opt.mode || 'core';
    let W = 0, H = 0, raf = 0, run = true, t0 = performance.now(), last = 0, level = 0.15, lvT = 0.15, ry = 0, col = rgbOf();
    const dpr = Math.min(window.devicePixelRatio || 1, opt.dpr || 1.25);
    const stars = Array.from({ length: 90 }, () => [Math.random(), Math.random() * 0.62, Math.random() * 0.8 + 0.2]);
    const off = N.on && N.on('settings', () => { col = rgbOf(); });
    const fit = () => { const r = canvas.getBoundingClientRect(); W = Math.max(2, Math.round(r.width * dpr)); H = Math.max(2, Math.round(r.height * dpr)); if (canvas.width !== W || canvas.height !== H) { canvas.width = W; canvas.height = H; } };
    const A = (a, c = col) => `rgba(${c[0]},${c[1]},${c[2]},${Math.max(0, Math.min(1, a)).toFixed(3)})`;

    function frame(now) {
      raf = requestAnimationFrame(frame);
      if (!canvas.isConnected) return stop();
      if (!run || document.hidden || (opt.visible && !opt.visible())) return;
      const fps = LITE ? 3 : document.documentElement.dataset.perf === 'low' ? 20 : opt.fps || 40;
      if (now - last < 1000 / fps) return; last = now;
      fit();
      const t = Math.max(0, (now - t0) / 1000), g = geometry(), P = g.pts, E = g.edges;
      level += (lvT - level) * 0.12;
      const cx = W * (opt.cx ?? 0.5), cy = H * (opt.cy ?? 0.42), R = Math.min(H * (opt.r ?? 0.3), W * 0.34), D = 3.4;
      const mx = mouse.x * (opt.parallax ?? 1), my = mouse.y * (opt.parallax ?? 1);
      ry += 0.006 + level * 0.01;
      const ay = ry + mx * 0.5, ax = 0.28 + my * 0.22 + Math.sin(t * 0.4) * 0.05;
      ctx.globalCompositeOperation = 'source-over';
      ctx.clearRect(0, 0, W, H);
      if (opt.bg !== false) {
        const bgc = ctx.createLinearGradient(0, 0, 0, H); bgc.addColorStop(0, A(0.0, [4, 5, 10])); bgc.addColorStop(0, 'rgb(3,4,9)'); bgc.addColorStop(0.62, `rgb(${Math.round(col[0] * 0.09 + 5)},${Math.round(col[1] * 0.09 + 5)},${Math.round(col[2] * 0.09 + 8)})`); bgc.addColorStop(1, 'rgb(3,4,8)');
        ctx.fillStyle = bgc; ctx.fillRect(0, 0, W, H);
      }
      ctx.globalCompositeOperation = 'lighter';
      const hor = H * (opt.hor ?? 0.66);
      // estrellas con paralaje
      for (const s of stars) { const x = ((s[0] - mx * 0.012 * s[2]) % 1 + 1) % 1 * W, y = s[1] * H * 0.95 - my * 4 * s[2]; ctx.fillStyle = A(0.25 + 0.5 * s[2] * (0.6 + 0.4 * Math.sin(t * 2 + s[0] * 50))); ctx.fillRect(x, y, dpr * s[2] * 1.6, dpr * s[2] * 1.6); }
      // resplandor del horizonte
      const hg = ctx.createLinearGradient(0, hor - H * 0.16, 0, hor + H * 0.05); hg.addColorStop(0, A(0)); hg.addColorStop(0.75, A(0.22)); hg.addColorStop(1, A(0));
      ctx.fillStyle = hg; ctx.fillRect(0, hor - H * 0.16, W, H * 0.21);
      // suelo de rejilla en perspectiva que avanza
      const vx = cx - mx * W * 0.03;
      ctx.lineWidth = Math.max(1, dpr * 0.9);
      for (let i = 0; i < 18; i++) { const z = ((i + (t * 0.35) % 1) / 18), q = z * z * z * 0.9 + z * 0.1, y = hor + (H - hor) * q; ctx.strokeStyle = A(0.05 + 0.34 * q * (0.6 + level)); ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
      for (let i = -22; i <= 22; i++) { ctx.strokeStyle = A(i % 4 === 0 ? 0.3 : 0.13); ctx.beginPath(); ctx.moveTo(vx + i * W * 0.012, hor); ctx.lineTo(vx + i * W * 0.17, H); ctx.stroke(); }
      // proyector: elipse de la base y haz de luz
      const by = hor + (H - hor) * 0.16, rx = R * 1.5, ryy = R * 0.3;
      const beam = ctx.createLinearGradient(0, cy, 0, by); beam.addColorStop(0, A(0.0)); beam.addColorStop(1, A(0.2 + level * 0.25));
      ctx.fillStyle = beam; for (let q = 0; q < 4; q++) { const k = 1 - q * 0.2; ctx.globalAlpha = 0.3; ctx.beginPath(); ctx.moveTo(cx - R * 0.95 * k, cy + R * 0.2); ctx.lineTo(cx + R * 0.95 * k, cy + R * 0.2); ctx.lineTo(cx + rx * 0.75 * k, by); ctx.lineTo(cx - rx * 0.75 * k, by); ctx.closePath(); ctx.fill(); } ctx.globalAlpha = 1;
      for (let k = 0; k < 4; k++) { ctx.strokeStyle = A(0.5 - k * 0.1); ctx.lineWidth = dpr * (k ? 1 : 2); ctx.beginPath(); ctx.ellipse(cx, by, rx * (1 + k * 0.16), ryy * (1 + k * 0.16), 0, 0, 7); ctx.stroke(); }
      // ecualizador de voz alrededor de la base
      const BARS = 72; ctx.lineWidth = dpr * 2;
      for (let i = 0; i < BARS; i++) { const a = (i / BARS) * 6.2832 + t * 0.3, wv = (Math.sin(a * 5 + t * 6) * 0.5 + 0.5) * (0.35 + level * 1.1) * (0.5 + 0.5 * Math.sin(i * 12.9 + t * 3)), px = cx + Math.cos(a) * rx * 1.28, py = by + Math.sin(a) * ryy * 1.28, front = Math.sin(a) > 0 ? 1 : 0.55; ctx.strokeStyle = A((0.25 + wv * 0.7) * front); ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px, py - (4 + wv * R * 0.22) * dpr); ctx.stroke(); }

      // brújula en el suelo: anillo graduado que gira + puntos cardinales
      { const kr = rx * 1.62, kry = ryy * 1.62; ctx.lineWidth = dpr; for (let i = 0; i < 120; i++) { const a = (i / 120) * 6.2832 + t * 0.12, big = i % 10 === 0, l = big ? 0.06 : 0.025, c1 = Math.cos(a), s1 = Math.sin(a); ctx.strokeStyle = A((big ? 0.7 : 0.28) * (s1 > 0 ? 1 : 0.5)); ctx.beginPath(); ctx.moveTo(cx + c1 * kr, by + s1 * kry); ctx.lineTo(cx + c1 * kr * (1 - l), by + s1 * kry * (1 - l)); ctx.stroke(); }
        if (W > 900) { ctx.font = `${Math.round(9 * dpr)}px ui-monospace,Consolas,monospace`; ctx.textAlign = 'center'; ctx.fillStyle = A(0.8); [['000', 0], ['090', 1.5708], ['180', 3.1416], ['270', 4.7124]].forEach(([lb, a0]) => { const a = a0 + t * 0.12; ctx.fillText(lb, cx + Math.cos(a) * kr * 1.07, by + Math.sin(a) * kry * 1.07 + 3 * dpr); }); } }
      // torres de datos en perspectiva
      for (let i = 0; i < 34; i++) { const a = (i / 34) * 6.2832 + 0.4, c1 = Math.cos(a), s1 = Math.sin(a), px = cx + c1 * rx * 2.15, py = by + s1 * ryy * 2.3, sc = 0.55 + 0.6 * (s1 * 0.5 + 0.5), hh = (0.25 + 0.75 * Math.abs(Math.sin(t * 0.7 + i * 1.7))) * (0.5 + level) * R * 0.34 * sc, ww = dpr * (3 + 3 * sc); ctx.fillStyle = A(0.1 + 0.16 * sc); ctx.fillRect(px - ww / 2, py - hh, ww, hh); ctx.fillStyle = A(0.85); ctx.fillRect(px - ww / 2, py - hh - dpr, ww, dpr * 1.6); }
      // flujo de partículas que sube hacia el núcleo
      for (let i = 0; i < 56; i++) { const u = (t * 0.22 + i / 56) % 1, a = i * 2.4 + u * 9, rr = (1 - u) * rx * 1.15 + u * R * 0.18, px = cx + Math.cos(a) * rr, py = by + (cy - by) * u + Math.sin(a) * rr * 0.2; ctx.fillStyle = A(0.8 * (1 - u * u), u > 0.8 ? [255, 255, 255] : col); const z = dpr * (1 + (1 - u) * 1.6); ctx.fillRect(px, py, z, z); }
      // onda expansiva periódica desde la base
      { const sw = (t % 3.6) / 3.6; ctx.strokeStyle = A((1 - sw) * 0.55); ctx.lineWidth = dpr * (2.4 - sw * 1.6); ctx.beginPath(); ctx.ellipse(cx, by, rx * (0.9 + sw * 2.4), ryy * (0.9 + sw * 2.4), 0, 0, 7); ctx.stroke(); }
      // núcleo: puntos y red neuronal
      const scanY = Math.sin(t * 0.9) * 0.95, jit = (Math.sin(t * 37) > 0.992) ? (Math.random() - 0.5) * 6 * dpr : 0;
      const pr = new Array(P.length), pulse = 1 + level * 0.18 + Math.sin(t * 2.1) * 0.015;
      for (let i = 0; i < P.length; i++) { const p = P[i], r = rot(p[0], p[1], p[2], ay, ax), s = D / (D + r[2]); pr[i] = [cx + r[0] * R * s * pulse + jit, cy + r[1] * R * s * pulse, r[2], r[1], s]; }
      const buckets = [[], [], []];
      for (const [a, b] of E) { const za = (pr[a][2] + pr[b][2]) / 2, k = za < -0.25 ? 2 : za < 0.35 ? 1 : 0; buckets[k].push(a, b); }
      [0.1, 0.22, 0.5].forEach((al, k) => { ctx.strokeStyle = A(al * (0.8 + level * 0.6)); ctx.lineWidth = dpr * (0.6 + k * 0.35); ctx.beginPath(); const bk = buckets[k]; for (let i = 0; i < bk.length; i += 2) { ctx.moveTo(pr[bk[i]][0], pr[bk[i]][1]); ctx.lineTo(pr[bk[i + 1]][0], pr[bk[i + 1]][1]); } ctx.stroke(); });
      // impulsos que viajan por la red
      for (let k = 0; k < 14; k++) { const e = E[(k * 977 + Math.floor(t * 3)) % E.length], f = (t * 1.7 + k * 0.37) % 1, a = pr[e[0]], b = pr[e[1]]; ctx.fillStyle = A(0.9, [255, 255, 255]); const s = dpr * 2.2; ctx.fillRect(a[0] + (b[0] - a[0]) * f - s / 2, a[1] + (b[1] - a[1]) * f - s / 2, s, s); }
      for (let i = 0; i < pr.length; i++) { const q = pr[i], hit = Math.abs(q[3] - scanY) < 0.07, d = (1 - (q[2] + 1) / 2); ctx.fillStyle = hit ? A(0.95, [255, 255, 255]) : A(0.25 + 0.65 * d); const s = dpr * (hit ? 3.4 : 1.2 + d * 1.6); ctx.fillRect(q[0] - s / 2, q[1] - s / 2, s, s); }
      // plano de escaneo
      { const rr = Math.sqrt(Math.max(0.0001, 1 - scanY * scanY)), sy = rot(0, scanY, 0, 0, ax), yy = cy + sy[1] * R; ctx.strokeStyle = A(0.8); ctx.lineWidth = dpr * 1.6; ctx.beginPath(); ctx.ellipse(cx, yy, rr * R, rr * R * Math.sin(ax), 0, 0, 7); ctx.stroke(); const sg = ctx.createRadialGradient(cx, yy, 0, cx, yy, rr * R); sg.addColorStop(0, A(0.0)); sg.addColorStop(1, A(0.14)); ctx.fillStyle = sg; ctx.beginPath(); ctx.ellipse(cx, yy, rr * R, rr * R * Math.sin(ax), 0, 0, 7); ctx.fill(); }
      // halo del corazón
      { const hg2 = ctx.createRadialGradient(cx, cy, 0, cx, cy, R * (0.9 + level * 0.3)); hg2.addColorStop(0, A(0.5 + level * 0.3, [255, 255, 255].map((v, i) => Math.round(v * 0.55 + col[i] * 0.45)))); hg2.addColorStop(0.25, A(0.22)); hg2.addColorStop(1, A(0)); ctx.fillStyle = hg2; ctx.beginPath(); ctx.arc(cx, cy, R * 1.1, 0, 7); ctx.fill(); }
      // cristal interior: octaedro y cubo contrarrotando
      { const cr = [[[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]], [[0, 2], [0, 3], [1, 2], [1, 3], [4, 0], [4, 1], [4, 2], [4, 3], [5, 0], [5, 1], [5, 2], [5, 3]]], q = cr[0].map((p) => { const r = rot(p[0] * 0.3, p[1] * 0.3, p[2] * 0.3, -t * 0.9, t * 0.6), s = D / (D + r[2]); return [cx + r[0] * R * s, cy + r[1] * R * s]; }); ctx.strokeStyle = A(0.9, [255, 255, 255]); ctx.lineWidth = dpr * 1.2; ctx.beginPath(); cr[1].forEach(([a, b]) => { ctx.moveTo(q[a][0], q[a][1]); ctx.lineTo(q[b][0], q[b][1]); }); ctx.stroke(); }
      // anillos giroscópicos
      [[1.38, 1.1, 0.7, 2.2], [1.7, 0.4, -0.5, 1.6], [2.05, 1.5, 0.35, 1.2]].forEach(([rad, tiltX, spd, w], ri) => {
        ctx.lineWidth = dpr * w; const SEG = 96;
        for (let i = 0; i < SEG; i++) { const a0 = (i / SEG) * 6.2832, a1 = ((i + 1) / SEG) * 6.2832; const mk = (a) => { const r = rot(Math.cos(a) * rad, 0, Math.sin(a) * rad, t * spd * 0.4 + ri, tiltX + my * 0.1 + Math.sin(t * 0.5 + ri) * 0.15), s = D / (D + r[2]); return [cx + r[0] * R * s, cy + r[1] * R * s, r[2]]; }, p0 = mk(a0), p1 = mk(a1); ctx.strokeStyle = A(0.1 + 0.55 * (1 - (p0[2] / rad + 1) / 2) * (i % 24 < 17 ? 1 : 0.2)); ctx.beginPath(); ctx.moveTo(p0[0], p0[1]); ctx.lineTo(p1[0], p1[1]); ctx.stroke(); }
        for (let k = 0; k < 3; k++) { const a = t * spd * (1 + k * 0.3) + k * 2.1 + ri, r = rot(Math.cos(a) * rad, 0, Math.sin(a) * rad, t * spd * 0.4 + ri, tiltX + my * 0.1 + Math.sin(t * 0.5 + ri) * 0.15), s = D / (D + r[2]); ctx.fillStyle = A(0.95, [255, 255, 255]); ctx.beginPath(); ctx.arc(cx + r[0] * R * s, cy + r[1] * R * s, dpr * (2 + 2 * s), 0, 7); ctx.fill(); }
      });
      // etiquetas HUD con líneas de llamada
      if (W > 900 && opt.hud !== false) {
        const fs = Math.round(12.5 * dpr); ctx.font = `${fs}px ui-monospace,Consolas,monospace`; ctx.textAlign = 'left';
        const items = [['ENLACE NEURONAL', (96 + Math.sin(t * 0.7) * 2.4).toFixed(1) + '%', -0.9, -0.62], ['TEMP. NÚCLEO', (36 + Math.sin(t * 0.5) * 0.8).toFixed(1) + ' °C', 0.95, -0.35], ['LATENCIA', Math.round(11 + Math.abs(Math.sin(t * 1.3)) * 5) + ' ms', -1.0, 0.45], ['ENTROPÍA', (0.4 + Math.sin(t * 0.9) * 0.08).toFixed(3), 0.9, 0.62]];
        items.forEach(([lb, vl, sx, sy], i) => { const ax = cx + sx * R * 0.82, ay = cy + sy * R * 0.82, ex = cx + sx * R * 1.62, ey = cy + sy * R * 1.12, w1 = Math.max(ctx.measureText(lb).width, ctx.measureText(vl).width) + 10 * dpr; const left = ex < cx; let tx = left ? ex - w1 : ex; if (tx < 6 * dpr || tx + w1 > W - 6 * dpr) return;
          ctx.strokeStyle = A(0.55); ctx.lineWidth = dpr; ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(ex, ey); ctx.lineTo(left ? ex - w1 : ex + w1, ey); ctx.stroke(); ctx.fillStyle = A(0.95, [255, 255, 255]); ctx.fillRect(ax - dpr * 1.5, ay - dpr * 1.5, dpr * 3, dpr * 3);
          ctx.fillStyle = A(0.65); ctx.fillText(lb, tx + 4 * dpr, ey - fs * 1.35); ctx.fillStyle = A(1, [255, 255, 255]); ctx.fillText(vl, tx + 4 * dpr, ey - fs * 0.25); });
      }
      // escáner de línea horizontal del proyector (holograma)
      const ly = ((t * 0.25) % 1) * H; ctx.fillStyle = A(0.05); ctx.fillRect(0, ly, W, dpr * 2);
    }
    function stop() { cancelAnimationFrame(raf); raf = 0; if (off) off(); }
    raf = requestAnimationFrame(frame);
    return { stop, pause: () => { run = false; }, resume: () => { run = true; }, setLevel: (v) => { lvT = v; }, canvas };
  }

  /* fondo vivo del escritorio: se pausa mientras una ventana a pantalla completa lo tapa */
  let wall = null;
  N.holoWall = (on) => {
    const cv = document.getElementById('holo-bg'); if (!cv) return false;
    cv.style.display = on ? '' : 'none'; document.body.classList.toggle('live', !!on);
    if (on && !wall) wall = create(cv, { cx: 0.68, cy: 0.4, r: 0.27, fps: 30, dpr: 1, visible: () => !document.body.classList.contains('has-max') });
    if (!on && wall) { wall.stop(); wall = null; }
    return true;
  };

  /* arranque: núcleo holográfico + mensajes de estado; se omite con un clic o una tecla */
  const boot = document.getElementById('boot');
  if (boot && boot.querySelector('canvas')) {
    const hb = create(boot.querySelector('canvas'), { cx: 0.5, cy: 0.4, r: 0.27, fps: 45 });
    const st = boot.querySelector('.bt-line'), bar = boot.querySelector('.bt-bar i');
    const L = ['Iniciando núcleo cognitivo', 'Sincronizando módulos', 'Calibrando interfaz holográfica', 'Cifrando el espacio de trabajo', 'Núcleo en línea'];
    L.forEach((m, i) => setTimeout(() => { if (!st.isConnected) return; st.textContent = '> ' + m + (i < L.length - 1 ? '…' : ''); hb.setLevel(0.25 + i * 0.14); if (bar) bar.style.width = ((i + 1) / L.length) * 100 + '%'; }, 250 + i * 430));
    N.bootHolo = hb;
  }

  /* ---- formas 3D de las apps: icono holográfico de la ventana y marca de agua ---- */
  const norm = (V) => V.map((p) => { const l = Math.hypot(p[0], p[1], p[2]); return [p[0] / l, p[1] / l, p[2] / l]; });
  const SH = {};
  { const V = []; for (const x of [-1, 1]) for (const y of [-1, 1]) for (const z of [-1, 1]) V.push([x, y, z]); const E = []; for (let i = 0; i < 8; i++) for (let j = i + 1; j < 8; j++) if ((V[i][0] !== V[j][0]) + (V[i][1] !== V[j][1]) + (V[i][2] !== V[j][2]) === 1) E.push([i, j]); SH.cube = { V: norm(V), E }; }
  SH.octa = { V: [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]], E: [[0, 2], [0, 3], [1, 2], [1, 3], [4, 0], [4, 1], [4, 2], [4, 3], [5, 0], [5, 1], [5, 2], [5, 3]] };
  SH.tetra = { V: norm([[1, 1, 1], [1, -1, -1], [-1, 1, -1], [-1, -1, 1]]), E: [[0, 1], [0, 2], [0, 3], [1, 2], [1, 3], [2, 3]] };
  { const f = (1 + Math.sqrt(5)) / 2, V = []; for (const a of [-1, 1]) for (const b of [-f, f]) V.push([0, a, b], [a, b, 0], [b, 0, a]); const nv = norm(V); let dm = 9; for (let k = 1; k < 12; k++) dm = Math.min(dm, Math.hypot(nv[0][0] - nv[k][0], nv[0][1] - nv[k][1], nv[0][2] - nv[k][2])); const E = []; for (let i = 0; i < 12; i++) for (let j = i + 1; j < 12; j++) if (Math.hypot(nv[i][0] - nv[j][0], nv[i][1] - nv[j][1], nv[i][2] - nv[j][2]) < dm * 1.05) E.push([i, j]); SH.icosa = { V: nv, E }; }
  { const L = [], C = (fn) => { const a = []; for (let i = 0; i <= 32; i++) a.push(fn((i / 32) * 6.2832)); L.push(a); }; [-0.55, 0, 0.55].forEach((y) => { const r = Math.sqrt(1 - y * y); C((a) => [Math.cos(a) * r, y, Math.sin(a) * r]); }); [0, 1.0472, 2.0944].forEach((m) => C((a) => [Math.cos(a) * Math.cos(m), Math.sin(a), Math.cos(a) * Math.sin(m)])); SH.globe = { L }; }
  { const L = [], C = (r, fn) => { const a = []; for (let i = 0; i <= 40; i++) a.push(fn((i / 40) * 6.2832, r)); L.push(a); }; C(1, (a, r) => [Math.cos(a) * r, Math.sin(a) * r, 0]); C(0.78, (a, r) => [Math.cos(a) * r, 0, Math.sin(a) * r]); C(0.56, (a, r) => [0, Math.cos(a) * r, Math.sin(a) * r]); SH.gyro = { L }; }
  const KIND = { notes: 'cube', ide: 'octa', media: 'icosa', browser: 'globe', learn: 'tetra', settings: 'gyro', calc: 'cube', calendar: 'octa', taskman: 'icosa', winapps: 'tetra' };
  const items = new Set(); let mraf = 0, mlast = 0;
  const hexOf = (el) => { const v = getComputedStyle(el).getPropertyValue('--ac').trim() || getComputedStyle(document.documentElement).getPropertyValue('--accent').trim(); if (/^#[0-9a-f]{6}$/i.test(v)) { const n = parseInt(v.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; } return rgbOf(); };
  function drawShape(it, t) {
    const cv = it.cv, ctx = it.ctx;
    if (it.mark) { const w = cv.clientWidth, h = cv.clientHeight; if (!w || !h) return; if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; } }
    const W = cv.width, H = cv.height, c = it.col, sh = it.shape, sz = Math.min(W, H) * (it.mark ? 0.3 : 0.36);
    const cx = it.mark ? W * 0.8 : W / 2, cy = it.mark ? H * 0.74 : H / 2, a = (al, k = c) => `rgba(${k[0]},${k[1]},${k[2]},${al})`;
    ctx.clearRect(0, 0, W, H); ctx.globalCompositeOperation = 'lighter'; const al = it.mark ? 0.24 : 1, ay = t * 0.8 + it.ph, ax = 0.5 + Math.sin(t * 0.5 + it.ph) * 0.25;
    const pr = (p) => { const r = rot(p[0], p[1], p[2], ay, ax), s = 3 / (3 + r[2]); return [cx + r[0] * sz * s, cy + r[1] * sz * s, r[2]]; };
    ctx.lineJoin = 'round';
    for (const pass of it.mark ? [1] : [0, 1]) {
      ctx.lineWidth = pass ? (it.mark ? 1.2 : 1.3) : 3.4; const base = pass ? 0.9 : 0.22;
      if (sh.E) { const P = sh.V.map(pr); ctx.beginPath(); ctx.strokeStyle = a(base * al); sh.E.forEach(([i, j]) => { ctx.moveTo(P[i][0], P[i][1]); ctx.lineTo(P[j][0], P[j][1]); }); ctx.stroke(); if (pass) { ctx.fillStyle = a(al, [255, 255, 255]); P.forEach((q) => ctx.fillRect(q[0] - 1, q[1] - 1, 2, 2)); } }
      else { ctx.strokeStyle = a(base * al); sh.L.forEach((ln) => { ctx.beginPath(); ln.forEach((p, i) => { const q = pr(p); i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1]); }); ctx.stroke(); }); }
    }
    if (it.mark) { ctx.strokeStyle = a(0.1); ctx.lineWidth = 1; for (let k = 1; k <= 3; k++) { ctx.beginPath(); ctx.arc(cx, cy, sz * (1.15 + k * 0.38), 0, 7); ctx.stroke(); } }
    ctx.globalCompositeOperation = 'source-over';
  }
  function mloop(now) {
    mraf = requestAnimationFrame(mloop);
    if (document.hidden || now - mlast < (LITE ? 500 : 40)) return; mlast = now;
    for (const it of items) { if (!it.cv.isConnected) { items.delete(it); continue; } if (it.mark && (!it.cv.offsetParent || document.body.classList.contains('hide-marks'))) continue; drawShape(it, now / 1000); }
    if (!items.size) { cancelAnimationFrame(mraf); mraf = 0; }
  }
  function shape(cv, kind, opt = {}) {
    const it = { cv, ctx: cv.getContext('2d'), shape: SH[KIND[kind] || kind] || SH.cube, mark: !!opt.mark, ph: Math.random() * 6, col: hexOf(cv.closest('.win') || cv) };
    if (!it.mark) { cv.width = 64; cv.height = 64; }
    items.add(it); N.on('settings', () => { it.col = hexOf(cv.closest('.win') || cv); });
    if (!mraf) mraf = requestAnimationFrame(mloop);
  }

  N.holo = { create, mouse, geometry, shape };
})();
