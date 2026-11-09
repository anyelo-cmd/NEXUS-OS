/* Módulo 4 — Estudio multimedia.
   Imagen (vista previa CSS + motor Python), Generador de arte (Python), Paletas y armonías, WCAG con autoajuste,
   CSS (degradados y sombras), Ondas y patrones SVG. */
(function () {
  const N = window.NEXUS, h = N.h;
  const hex2rgb = (x) => { x = x.replace('#', ''); if (x.length === 3) x = [...x].map((c) => c + c).join(''); const n = parseInt(x, 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
  const rgb2hex = (r, g, b) => '#' + [r, g, b].map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
  const lum = ([r, g, b]) => { const f = (v) => ((v /= 255) <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4); return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
  const ratio = (a, b) => { const l1 = lum(hex2rgb(a)), l2 = lum(hex2rgb(b)); return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05); };
  function rgb2hsl([r, g, b]) { r /= 255; g /= 255; b /= 255; const mx = Math.max(r, g, b), mn = Math.min(r, g, b); let H = 0, S = 0; const L = (mx + mn) / 2; if (mx !== mn) { const d = mx - mn; S = L > 0.5 ? d / (2 - mx - mn) : d / (mx + mn); H = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; H *= 60; } return [H, S, L]; }
  function hsl2hex(H, S, L) { H = ((H % 360) + 360) % 360; const k = (n) => (n + H / 30) % 12, a = S * Math.min(L, 1 - L), f = (n) => L - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1))); return rgb2hex(f(0) * 255, f(8) * 255, f(4) * 255); }
  const shift = (hex, dh, ds = 0, dl = 0) => { const [H, S, L] = rgb2hsl(hex2rgb(hex)); return hsl2hex(H + dh, Math.max(0, Math.min(1, S + ds)), Math.max(0, Math.min(1, L + dl))); };
  const dataUrlBytes = (u) => Uint8Array.from(atob(u.split(',')[1]), (c) => c.charCodeAt(0));

  /* Motor Python: servidor local (server.py). Sin él, todo lo demás sigue funcionando. */
  const py = {
    base: /^https?:$/.test(location.protocol) && /^(localhost|127\.0\.0\.1)$/.test(location.hostname) ? location.origin : 'http://127.0.0.1:8765', online: false,
    async call(path, body) {
      const r = await fetch(py.base + path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const j = await r.json().catch(() => ({})); if (!r.ok) throw new Error(j.error || 'HTTP ' + r.status); return j;
    },
    async ping() {
      try { const c = new AbortController(), t = setTimeout(() => c.abort(), 1500), r = await fetch(py.base + '/api/health', { signal: c.signal }); clearTimeout(t); py.online = r.ok; if (r.ok) { const j = await r.json().catch(() => ({})); py.token = j.token || ''; py.local = !!j.local; py.chrome = !!j.chrome; } } catch (e) { py.online = false; }
      return py.online;
    },
  };
  N.py = py;

  function jsPalette(img, n = 6) {
    const c = document.createElement('canvas'), s = 64; c.width = c.height = s; const x = c.getContext('2d'); x.drawImage(img, 0, 0, s, s);
    const px = x.getImageData(0, 0, s, s).data, buckets = {};
    for (let i = 0; i < px.length; i += 4) { if (px[i + 3] < 128) continue; const k = [px[i], px[i + 1], px[i + 2]].map((v) => v >> 5).join(','); const b = (buckets[k] ||= { n: 0, r: 0, g: 0, b: 0 }); b.n++; b.r += px[i]; b.g += px[i + 1]; b.b += px[i + 2]; }
    const out = [];
    for (const b of Object.values(buckets).sort((a, b) => b.n - a.n)) { const col = [b.r / b.n, b.g / b.n, b.b / b.n]; if (out.every((o) => Math.hypot(o[0] - col[0], o[1] - col[1], o[2] - col[2]) > 50)) out.push(col); if (out.length >= n) break; }
    return out.map((c) => rgb2hex(...c));
  }

  const TABS = [['img', '🖼 Imagen'], ['gen', '✨ Generar'], ['pal', '🎨 Paleta'], ['wcag', '♿ WCAG'], ['css', '{ } CSS'], ['svg', '〰 SVG']];
  const FDEF = { brightness: 100, contrast: 100, saturate: 100, blur: 0, sepia: 0, gray: 0, hue: 0 };
  const PYFX = [['Posterizar', { op: 'posterize', bits: 3 }], ['Pixelar', { op: 'pixelate', size: 8 }], ['Viñeta', { op: 'vignette', strength: 0.6 }], ['Bordes', { op: 'edges' }], ['Relieve', { op: 'emboss' }], ['Enfocar', { op: 'sharpen' }], ['Grano', { op: 'grain', amount: 0.06 }], ['Duotono', { op: 'duotone', dark: '#1b1464', light: '#ff9a9e' }], ['Auto-contraste', { op: 'autocontrast' }], ['Invertir', { op: 'invert' }], ['Umbral', { op: 'threshold', level: 128 }], ['↻ 90°', { op: 'rotate', deg: 90 }], ['⇋ Espejo', { op: 'flip', axis: 'h' }]];
  const SHADOWS = { Suave: [0, 8, 24, 0, '#000000', 18], Elevada: [0, 20, 50, -6, '#000000', 35], Neón: [0, 0, 28, 4, '#6c8cff', 70], Neumorfismo: [10, 10, 24, 0, '#000000', 30], Borde: [0, 0, 0, 3, '#6c8cff', 100] };
  const GEN0 = () => ({ kind: 'mesh', w: 1024, h: 640, seed: 7, colors: ['#6c8cff', '#c06bff', '#ff6bcb', '#38d6e8'], text: 'NEXUS', subtitle: 'Diseñado con Python' });
  const PAT0 = () => ({ kind: 'dots', size: 24, color: '#6c8cff', bg: '#0f1220', sw: 2 });

  N.registerApp('media', {
    title: 'Estudio multimedia', icon: '🎨', desc: 'Imagen, arte generativo, paletas, WCAG, CSS y SVG', w: 640, h: 780,
    init: () => ({ tab: 'img', fg: '#1b2030', bg: '#ffffff', g1: '#6c8cff', g2: '#ff6bcb', ang: 135, gt: 'linear', sh: { x: 0, y: 10, b: 30, s: 0, c: '#000000', a: 30, inset: false },
      wave: { amp: 40, freq: 3, layers: 3, color: '#6c8cff' }, pat: PAT0(), svgMode: 'wave', harm: '#6c8cff', f: { ...FDEF }, gen: GEN0() }),
    mount(root, ctx) {
      const d = ctx.data; d.gen ||= GEN0(); d.pat ||= PAT0(); d.svgMode ||= 'wave'; d.harm ||= '#6c8cff'; d.gt ||= 'linear'; d.sh.inset ??= false;
      root.classList.add('app');
      const tabs = h('div', { class: 'tabs' }), body = h('div', { class: 'pad col' });
      root.append(tabs, h('div', { class: 'scroll' }, body));
      const range = (obj, k, label, min, max, on, step = 1) => { const val = h('b', { style: { color: 'var(--text)' } }, obj[k]); return h('label', { class: 'f' }, h('span', { class: 'row', style: { justifyContent: 'space-between', gap: 0 } }, label, val), h('input', { type: 'range', min, max, step, value: obj[k], oninput: (e) => { obj[k] = +e.target.value; val.textContent = obj[k]; on(); ctx.save(); } })); };
      const copy = (t) => { navigator.clipboard?.writeText(t); N.toast('Copiado: ' + (t.length > 40 ? t.slice(0, 40) + '…' : t), 'ok'); };
      const colorIn = (obj, k, on, title) => h('input', { type: 'color', value: obj[k], title, oninput: (e) => { obj[k] = e.target.value; on(); ctx.save(); } });

      /* lienzo base compartido entre pestañas (Imagen, Generar, Paleta) */
      const base = document.createElement('canvas'); base.width = 520; base.height = 300;
      const bc = base.getContext('2d'); bc.fillStyle = '#fff'; bc.fillRect(0, 0, 520, 300);
      const undo = [];
      const toBase = (url) => new Promise((res, rej) => { const i = new Image(); i.onload = () => { base.width = i.width; base.height = i.height; bc.drawImage(i, 0, 0); res(); }; i.onerror = rej; i.src = url; });
      const badge = () => h('span', { class: 'badge' }, '…');
      async function pyStatus(b) { const ok = await py.ping(); b.textContent = ok ? '● Python conectado' : '○ Python apagado'; b.className = 'badge ' + (ok ? 'ok' : 'bad'); b.title = ok ? 'Servidor local activo' : 'Ejecuta iniciar.bat (o: python server.py)'; return ok; }
      async function needPy() { if (py.online || (await py.ping())) return true; N.toast('Servidor Python apagado. Ejecuta iniciar.bat (o: python server.py)', 'warn'); return false; }

      function draw() {
        tabs.replaceChildren(...TABS.map(([k, n]) => h('div', { class: 'tab' + (k === d.tab ? ' on' : ''), onclick: () => { d.tab = k; draw(); ctx.save(); } }, n)));
        ({ img: tImg, gen: tGen, pal: tPal, wcag: tWcag, css: tCss, svg: tSvg })[d.tab]();
      }

      /* ================= IMAGEN ================= */
      function tImg() {
        const cv = h('canvas', { class: 'plot', width: base.width, height: base.height }), c = cv.getContext('2d'); let painting = false, last = null, color = '#ff4d4d', size = 4;
        const info = h('span', { class: 'mono', style: { color: 'var(--muted)' } });
        const filter = () => `brightness(${d.f.brightness}%) contrast(${d.f.contrast}%) saturate(${d.f.saturate}%) blur(${d.f.blur}px) sepia(${d.f.sepia}%) grayscale(${d.f.gray}%) hue-rotate(${d.f.hue}deg)`;
        const paint = () => { if (cv.width !== base.width || cv.height !== base.height) { cv.width = base.width; cv.height = base.height; } c.clearRect(0, 0, cv.width, cv.height); c.filter = filter(); c.drawImage(base, 0, 0); c.filter = 'none'; info.textContent = `${base.width} × ${base.height} px`; };
        const loadFile = (f) => { const i = new Image(); i.onload = () => { const k = Math.min(1, 1600 / Math.max(i.width, i.height)); base.width = Math.round(i.width * k); base.height = Math.round(i.height * k); bc.fillStyle = '#fff'; bc.fillRect(0, 0, base.width, base.height); bc.drawImage(i, 0, 0, base.width, base.height); undo.length = 0; paint(); }; i.src = URL.createObjectURL(f); };
        const pos = (e) => { const r = cv.getBoundingClientRect(); return [((e.clientX - r.left) * cv.width) / r.width, ((e.clientY - r.top) * cv.height) / r.height]; };
        cv.addEventListener('pointerdown', (e) => { painting = true; last = pos(e); cv.setPointerCapture(e.pointerId); undo.push(base.toDataURL()); if (undo.length > 10) undo.shift(); });
        cv.addEventListener('pointermove', (e) => { if (!painting) return; const p = pos(e); bc.beginPath(); bc.moveTo(...last); bc.lineTo(...p); bc.strokeStyle = color; bc.lineWidth = size; bc.lineCap = 'round'; bc.stroke(); last = p; paint(); });
        cv.addEventListener('pointerup', () => (painting = false));
        const pb = badge();
        async function runPy(ops) {
          if (!(await needPy())) return pyStatus(pb);
          undo.push(base.toDataURL()); if (undo.length > 10) undo.shift();
          try { const r = await py.call('/api/image', { image: base.toDataURL('image/png'), ops }); await toBase(r.image); paint(); N.toast(`🐍 ${ops.map((o) => o.op).join(' + ')} · ${r.w}×${r.h} · ${r.ms} ms`, 'ok'); }
          catch (e) { undo.pop(); py.online = false; pyStatus(pb); N.toast('Python: ' + e.message, 'bad'); }
        }
        const slidersToOps = () => { const f = d.f, o = []; if (f.brightness !== 100) o.push({ op: 'brightness', v: f.brightness }); if (f.contrast !== 100) o.push({ op: 'contrast', v: f.contrast }); if (f.saturate !== 100) o.push({ op: 'saturation', v: f.saturate }); if (f.blur > 0) o.push({ op: 'blur', r: f.blur }); if (f.sepia > 0) o.push({ op: 'sepia', amount: f.sepia }); if (f.gray > 0) o.push({ op: 'grayscale', amount: f.gray }); if (f.hue !== 0) o.push({ op: 'hue', deg: f.hue }); return o; };
        const cropTo = (rw, rh) => { const w = base.width, hh = base.height, k = Math.min(w / rw, hh / rh), cw = Math.floor(rw * k), ch = Math.floor(rh * k); return { op: 'crop', x: Math.floor((w - cw) / 2), y: Math.floor((hh - ch) / 2), w: cw, h: ch }; };
        const pyRow = (label, items) => h('div', { class: 'row' }, h('span', { class: 'sec', style: { margin: 0, minWidth: '70px' } }, label), items.map(([n, f]) => h('button', { class: 'chip', onclick: f }, n)));
        pyStatus(pb); paint();
        body.replaceChildren(
          h('div', { class: 'row' }, h('input', { type: 'file', accept: 'image/*', onchange: (e) => e.target.files[0] && loadFile(e.target.files[0]) }), h('input', { type: 'color', value: color, title: 'Color del pincel', oninput: (e) => (color = e.target.value) }), h('input', { type: 'range', min: 1, max: 30, value: size, title: 'Grosor del pincel', oninput: (e) => (size = +e.target.value) }), h('span', { style: { flex: 1 } }), info,
            h('button', { class: 'btn', title: 'Deshacer', onclick: async () => { if (undo.length) { await toBase(undo.pop()); paint(); } } }, '↶'),
            h('button', { class: 'btn', onclick: () => { const o = document.createElement('canvas'); o.width = base.width; o.height = base.height; const x = o.getContext('2d'); x.filter = filter(); x.drawImage(base, 0, 0); o.toBlob((bl) => N.download('nexus.png', bl, 'image/png')); } }, '⬇ PNG')),
          cv,
          h('div', { class: 'card' }, h('div', { class: 'row', style: { justifyContent: 'space-between' } }, h('h4', { style: { margin: 0 } }, '🐍 Motor Python'), h('span', { class: 'row' }, pb, h('button', { class: 'chip', onclick: () => pyStatus(pb) }, '↻'))),
            h('div', { class: 'col', style: { marginTop: '8px' } },
              pyRow('Efectos', PYFX.map(([n, o]) => [n, () => runPy([o])])),
              pyRow('Recortar', [['1:1', () => runPy([cropTo(1, 1)])], ['16:9', () => runPy([cropTo(16, 9)])], ['4:3', () => runPy([cropTo(4, 3)])], ['9:16', () => runPy([cropTo(9, 16)])]]),
              pyRow('Escalar', [['50%', () => runPy([{ op: 'resize', scale: 0.5 }])], ['75%', () => runPy([{ op: 'resize', scale: 0.75 }])], ['150%', () => runPy([{ op: 'resize', scale: 1.5 }])], ['200%', () => runPy([{ op: 'resize', scale: 2 }])]]))),
          h('div', { class: 'card' }, h('h4', {}, 'Ajustes (vista previa en vivo)'), h('div', { class: 'grid2' }, [['brightness', 'Brillo', 0, 200], ['contrast', 'Contraste', 0, 200], ['saturate', 'Saturación', 0, 300], ['blur', 'Desenfoque', 0, 10], ['sepia', 'Sepia', 0, 100], ['gray', 'Grises', 0, 100], ['hue', 'Matiz', 0, 360]].map(([k, l, a, b]) => range(d.f, k, l, a, b, paint))),
            h('div', { class: 'row', style: { marginTop: '8px' } }, h('button', { class: 'btn primary', title: 'Procesa los deslizadores en Python a resolución completa y los reinicia', onclick: async () => { const ops = slidersToOps(); if (!ops.length) return N.toast('Mueve algún deslizador primero'); await runPy(ops); Object.assign(d.f, FDEF); ctx.save(); tImg(); } }, '🐍 Aplicar con Python'), h('button', { class: 'btn', onclick: () => { Object.assign(d.f, FDEF); ctx.save(); tImg(); } }, 'Reiniciar'))),
          h('small', { style: { color: 'var(--muted)' } }, 'Dibuja con el pincel sobre el lienzo. Los deslizadores son previsualización; 🐍 modifica la imagen de verdad.'));
      }

      /* ================= GENERAR (Python) ================= */
      function tGen() {
        const g = d.gen, pb = badge(), prev = h('img', { style: { width: '100%', borderRadius: '10px', border: '1px solid var(--border)', display: 'none' } }), meta = h('span', { class: 'mono', style: { color: 'var(--muted)' } });
        let lastUrl = null;
        const KINDS = [['mesh', 'Malla'], ['plasma', 'Plasma'], ['geo', 'Low-poly'], ['halftone', 'Semitono'], ['poster', 'Póster']];
        const kindSeg = h('div', { class: 'seg' }), textBox = h('div', { class: 'col' });
        const drawKind = () => { kindSeg.replaceChildren(...KINDS.map(([k, n]) => h('button', { class: g.kind === k ? 'on' : '', onclick: () => { g.kind = k; ctx.save(); drawKind(); } }, n))); textBox.style.display = g.kind === 'poster' ? 'flex' : 'none'; };
        async function make() {
          if (!(await needPy())) return pyStatus(pb);
          meta.textContent = 'generando…';
          try { const r = await py.call('/api/generate', { kind: g.kind, w: g.w, h: g.h, seed: g.seed, colors: g.colors, text: g.text, subtitle: g.subtitle }); lastUrl = r.image; prev.src = r.image; prev.style.display = 'block'; meta.textContent = `${r.w}×${r.h} · ${r.ms} ms`; }
          catch (e) { meta.textContent = ''; N.toast('Python: ' + e.message, 'bad'); }
        }
        const seedIn = h('input', { type: 'number', value: g.seed, oninput: (e) => { g.seed = +e.target.value; ctx.save(); } });
        textBox.replaceChildren(h('label', { class: 'f' }, 'Título (Enter para varias líneas)', h('textarea', { rows: 2, oninput: (e) => { g.text = e.target.value; ctx.save(); } }, g.text)), h('label', { class: 'f' }, 'Subtítulo', h('input', { value: g.subtitle, oninput: (e) => { g.subtitle = e.target.value; ctx.save(); } })));
        pyStatus(pb); drawKind();
        body.replaceChildren(
          h('div', { class: 'card' }, h('div', { class: 'row', style: { justifyContent: 'space-between' } }, h('h4', { style: { margin: 0 } }, '✨ Arte generativo con Python'), pb),
            h('div', { class: 'col', style: { marginTop: '8px' } }, kindSeg,
              h('div', { class: 'row' }, h('span', { class: 'sec', style: { margin: 0 } }, 'Colores'), ...g.colors.map((_, i) => colorIn(g.colors, i, () => {}, 'Color ' + (i + 1)))),
              h('div', { class: 'grid2' }, h('label', { class: 'f' }, 'Ancho', h('input', { type: 'number', value: g.w, min: 64, max: 2048, oninput: (e) => { g.w = +e.target.value; ctx.save(); } })), h('label', { class: 'f' }, 'Alto', h('input', { type: 'number', value: g.h, min: 64, max: 2048, oninput: (e) => { g.h = +e.target.value; ctx.save(); } })),
                h('label', { class: 'f' }, 'Semilla', h('div', { class: 'row', style: { flexWrap: 'nowrap', gap: '4px' } }, seedIn, h('button', { class: 'chip', title: 'Semilla aleatoria y generar', onclick: () => { g.seed = Math.floor(Math.random() * 99999); seedIn.value = g.seed; ctx.save(); make(); } }, '🎲')))),
              textBox, h('div', { class: 'row' }, h('button', { class: 'btn primary', onclick: make }, '✨ Generar'), meta))),
          prev,
          h('div', { class: 'row' },
            h('button', { class: 'btn', onclick: async () => { if (!lastUrl) return N.toast('Genera algo primero'); await toBase(lastUrl); undo.length = 0; d.tab = 'img'; draw(); ctx.save(); N.toast('Enviado al editor de imagen', 'ok'); } }, '→ Enviar al editor'),
            h('button', { class: 'btn', onclick: () => (lastUrl ? N.download(`nexus-${g.kind}-${g.seed}.png`, dataUrlBytes(lastUrl), 'image/png') : N.toast('Genera algo primero')) }, '⬇ PNG'),
            h('button', { class: 'btn', onclick: async () => { if (!lastUrl) return N.toast('Genera algo primero'); await toBase(lastUrl); d.tab = 'pal'; draw(); } }, 'Extraer paleta')),
          h('small', { style: { color: 'var(--muted)' } }, 'Misma semilla = mismo resultado: guarda la semilla para reproducir un diseño. Resolución máxima 2048 px.'));
      }

      /* ================= PALETA ================= */
      function tPal() {
        const out = h('div', { class: 'row' }), src = h('small', { style: { color: 'var(--muted)' } }), harm = h('div', { class: 'col' }), exp = h('textarea', { class: 'mono', rows: 5, readonly: true, style: { width: '100%' } });
        let all = {}, pick = [];
        const sw = (hex, label) => h('div', { class: 'sw', style: { background: hex }, title: 'Clic para copiar ' + hex, onclick: () => copy(hex) }, label ? label + ' ' + hex : hex);
        function exportTxt() { pick = Object.values(all).flat().filter((v, i, a) => a.indexOf(v) === i).slice(0, 12); exp.value = ':root{\n' + pick.map((c, i) => `  --color-${i + 1}: ${c};`).join('\n') + '\n}'; }
        async function show(i) {
          const c = document.createElement('canvas'), k = Math.min(1, 512 / Math.max(i.width, i.height)); c.width = Math.max(1, Math.round(i.width * k)); c.height = Math.max(1, Math.round(i.height * k)); c.getContext('2d').drawImage(i, 0, 0, c.width, c.height);
          let cols = null; if (await py.ping()) { try { cols = (await py.call('/api/palette', { image: c.toDataURL('image/png'), n: 6 })).colors; src.textContent = '🐍 Calculada con Python (median cut)'; } catch (e) {} }
          if (!cols) { cols = jsPalette(c).map((x) => ({ hex: x })); src.textContent = 'Calculada en el navegador (enciende Python para mejor calidad)'; }
          out.replaceChildren(...cols.map((o) => sw(o.hex, o.pct != null ? o.pct + '%' : ''))); all = { imagen: cols.map((o) => o.hex), ...all }; exportTxt();
        }
        function harmonies() {
          const b = d.harm, sets = { 'Complementario': [b, shift(b, 180)], 'Análogo': [shift(b, -30), b, shift(b, 30)], 'Triada': [b, shift(b, 120), shift(b, 240)], 'Tetrada': [b, shift(b, 90), shift(b, 180), shift(b, 270)], 'Complemento dividido': [b, shift(b, 150), shift(b, 210)], 'Monocromático': [-0.3, -0.15, 0, 0.15, 0.3].map((l) => shift(b, 0, 0, l)) };
          all = { ...(all.imagen ? { imagen: all.imagen } : {}), ...sets };
          harm.replaceChildren(...Object.entries(sets).map(([n, cols]) => h('div', {}, h('div', { class: 'sec' }, n), h('div', { class: 'row', style: { gap: '4px' } }, cols.map((c) => sw(c))))));
          exportTxt();
        }
        harmonies();
        body.replaceChildren(
          h('div', { class: 'card' }, h('h4', {}, 'Armonías de color'), h('div', { class: 'row' }, h('input', { type: 'color', value: d.harm, oninput: (e) => { d.harm = e.target.value; harmonies(); ctx.save(); } }), h('span', { style: { color: 'var(--muted)', fontSize: '12px' } }, 'Elige un color base; clic en un tono para copiarlo')), harm),
          h('div', { class: 'card' }, h('h4', {}, 'Extraer de una imagen'), h('div', { class: 'row' }, h('input', { type: 'file', accept: 'image/*', onchange: (e) => { const f = e.target.files[0]; if (!f) return; const i = new Image(); i.onload = () => show(i); i.src = URL.createObjectURL(f); } }), h('button', { class: 'btn', onclick: () => show(base) }, 'Usar imagen del editor')), h('div', { style: { marginTop: '8px' } }, out), src),
          h('div', { class: 'card' }, h('h4', {}, 'Exportar'), exp, h('div', { class: 'row', style: { marginTop: '6px' } }, h('button', { class: 'btn', onclick: () => copy(exp.value) }, 'Copiar CSS'), h('button', { class: 'btn', onclick: () => copy(JSON.stringify(Object.fromEntries(pick.map((c, i) => ['color' + (i + 1), c])), null, 2)) }, 'Copiar JSON (Tailwind)'), h('button', { class: 'btn', onclick: () => N.download('paleta.css', exp.value, 'text/css') }, '⬇ .css'))));
      }

      /* ================= WCAG ================= */
      function tWcag() {
        const res = h('div', { class: 'col' }), prev = h('div', { style: { padding: '18px', borderRadius: '12px', border: '1px solid var(--border)' } });
        const fix = (target) => { const [H, S] = rgb2hsl(hex2rgb(d.fg)); let L = rgb2hsl(hex2rgb(d.fg))[2]; const dir = lum(hex2rgb(d.bg)) > 0.4 ? -1 : 1; for (let i = 0; i < 100 && ratio(hsl2hex(H, S, L), d.bg) < target; i++) L = Math.max(0, Math.min(1, L + dir * 0.01)); d.fg = hsl2hex(H, S, L); if (ratio(d.fg, d.bg) < target) d.fg = dir < 0 ? '#000000' : '#ffffff'; tWcag(); ctx.save(); };
        const upd = () => {
          const r = ratio(d.fg, d.bg), P = (ok) => h('span', { class: 'badge ' + (ok ? 'ok' : 'bad') }, ok ? 'Pasa' : 'Falla');
          prev.style.color = d.fg; prev.style.background = d.bg;
          prev.replaceChildren(h('b', { style: { fontSize: '22px', display: 'block' } }, 'Texto grande de ejemplo'), h('div', {}, 'Texto normal para comprobar legibilidad en pantalla.'), h('button', { style: { marginTop: '8px', padding: '6px 14px', borderRadius: '8px', border: '2px solid ' + d.fg, background: 'transparent', color: d.fg } }, 'Botón'));
          const grade = r >= 7 ? ['AAA', 'ok'] : r >= 4.5 ? ['AA', 'ok'] : r >= 3 ? ['AA grande', 'warn'] : ['Insuficiente', 'bad'];
          res.replaceChildren(h('div', { class: 'row' }, h('div', { class: 'kpi', style: { flex: 1 } }, h('span', {}, 'Relación de contraste'), h('b', {}, r.toFixed(2) + ' : 1')), h('div', { class: 'kpi', style: { flex: 1 } }, h('span', {}, 'Nivel'), h('b', {}, h('span', { class: 'badge ' + grade[1] }, grade[0])))),
            h('table', { class: 't' }, [['AA · texto normal (4.5)', r >= 4.5], ['AA · texto grande (3)', r >= 3], ['AAA · texto normal (7)', r >= 7], ['AAA · texto grande (4.5)', r >= 4.5], ['Componentes UI (3)', r >= 3]].map(([l, ok]) => h('tr', {}, h('td', {}, l), h('td', {}, P(ok))))));
          ctx.save();
        };
        body.replaceChildren(h('div', { class: 'card' }, h('div', { class: 'row' }, h('label', { class: 'f' }, 'Texto', h('input', { type: 'color', value: d.fg, oninput: (e) => { d.fg = e.target.value; upd(); } })), h('label', { class: 'f' }, 'Fondo', h('input', { type: 'color', value: d.bg, oninput: (e) => { d.bg = e.target.value; upd(); } })),
          h('button', { class: 'btn', onclick: () => { [d.fg, d.bg] = [d.bg, d.fg]; tWcag(); ctx.save(); } }, '⇄ Intercambiar'), h('button', { class: 'btn primary', title: 'Ajusta la luminosidad del texto hasta lograr 4.5:1', onclick: () => fix(4.5) }, 'Ajustar a AA'), h('button', { class: 'btn', onclick: () => fix(7) }, 'Ajustar a AAA'))), prev, res);
        upd();
      }

      /* ================= CSS ================= */
      function tCss() {
        const gp = h('div', { style: { height: '90px', borderRadius: '12px' } }), gc = h('code', { class: 'mono' }), sp = h('div', { style: { height: '90px', width: '150px', margin: '24px auto', borderRadius: '14px', background: 'var(--panel2)', border: '1px solid var(--border)' } }), sc = h('code', { class: 'mono' });
        const gtSeg = h('div', { class: 'seg' });
        const upd = () => {
          const g = d.gt === 'radial' ? `radial-gradient(circle at 30% 30%, ${d.g1}, ${d.g2})` : d.gt === 'conic' ? `conic-gradient(from ${d.ang}deg, ${d.g1}, ${d.g2}, ${d.g1})` : `linear-gradient(${d.ang}deg, ${d.g1}, ${d.g2})`;
          gp.style.background = g; gc.textContent = `background: ${g};`;
          const [r, gg, b] = hex2rgb(d.sh.c), s = `${d.sh.inset ? 'inset ' : ''}${d.sh.x}px ${d.sh.y}px ${d.sh.b}px ${d.sh.s}px rgba(${r},${gg},${b},${d.sh.a / 100})`; sp.style.boxShadow = s; sc.textContent = `box-shadow: ${s};`;
          gtSeg.replaceChildren(...[['linear', 'Lineal'], ['radial', 'Radial'], ['conic', 'Cónico']].map(([k, l]) => h('button', { class: d.gt === k ? 'on' : '', onclick: () => { d.gt = k; upd(); ctx.save(); } }, l))); ctx.save();
        };
        body.replaceChildren(
          h('div', { class: 'card' }, h('h4', {}, 'Degradado'), gp, h('div', { class: 'row', style: { marginTop: '8px' } }, gtSeg, colorIn(d, 'g1', upd), colorIn(d, 'g2', upd), h('div', { style: { flex: 1, minWidth: '120px' } }, range(d, 'ang', 'Ángulo', 0, 360, upd)), h('button', { class: 'btn', onclick: () => copy(gc.textContent) }, 'Copiar')), gc),
          h('div', { class: 'card' }, h('h4', {}, 'Sombra'), sp, h('div', { class: 'row' }, Object.entries(SHADOWS).map(([n, v]) => h('button', { class: 'chip', onclick: () => { [d.sh.x, d.sh.y, d.sh.b, d.sh.s, d.sh.c, d.sh.a] = v; tCss(); } }, n)), h('label', { class: 'chip' }, h('input', { type: 'checkbox', checked: d.sh.inset || null, onchange: (e) => { d.sh.inset = e.target.checked; upd(); } }), 'interna')),
            h('div', { class: 'grid2', style: { marginTop: '8px' } }, [['x', 'X', -50, 50], ['y', 'Y', -50, 50], ['b', 'Blur', 0, 100], ['s', 'Spread', -30, 50], ['a', 'Opacidad', 0, 100]].map(([k, l, a, b]) => range(d.sh, k, l, a, b, upd)), h('div', { class: 'row' }, colorIn(d.sh, 'c', upd), h('button', { class: 'btn', onclick: () => copy(sc.textContent) }, 'Copiar'))), sc));
        upd();
      }

      /* ================= SVG: ondas y patrones ================= */
      function tSvg() {
        const box = h('div', { style: { border: '1px solid var(--border)', borderRadius: '12px', overflow: 'hidden', minHeight: '140px' } }), code = h('textarea', { class: 'mono', rows: 4, readonly: true, style: { width: '100%' } });
        const modeSeg = h('div', { class: 'seg' }, ...[['wave', '〰 Ondas'], ['pat', '▦ Patrones']].map(([k, l]) => h('button', { class: d.svgMode === k ? 'on' : '', onclick: () => { d.svgMode = k; tSvg(); ctx.save(); } }, l)));
        const waveSvg = () => { const { amp, freq, layers, color } = d.wave, W = 800, H = 200; let s = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none">`; for (let l = 0; l < layers; l++) { const off = H * (0.35 + l * 0.15), ph = l * 1.3; let p = `M0,${H} L0,${off}`; for (let x = 0; x <= W; x += 10) p += ` L${x},${(off + Math.sin((x / W) * Math.PI * 2 * freq + ph) * amp * (1 - l * 0.2)).toFixed(1)}`; s += `<path d="${p} L${W},${H} Z" fill="${color}" fill-opacity="${(0.25 + l * 0.25).toFixed(2)}"/>`; } return s + '</svg>'; };
        const patSvg = () => {
          const { kind, size: z, color, bg, sw } = d.pat; let tile = '';
          if (kind === 'dots') tile = `<circle cx="${z / 2}" cy="${z / 2}" r="${Math.max(1, z / 8)}" fill="${color}"/>`;
          else if (kind === 'grid') tile = `<path d="M${z} 0H0V${z}" fill="none" stroke="${color}" stroke-width="${sw}"/>`;
          else if (kind === 'lines') tile = `<path d="M-${z / 4},${z / 4}l${z / 2},-${z / 2}M0,${z}l${z},-${z}M${(z * 3) / 4},${z + z / 4}l${z / 2},-${z / 2}" stroke="${color}" stroke-width="${sw}"/>`;
          else if (kind === 'zigzag') tile = `<path d="M0 ${z * 0.75}L${z / 2} ${z * 0.25}L${z} ${z * 0.75}" fill="none" stroke="${color}" stroke-width="${sw}"/>`;
          else tile = `<circle cx="${z / 2}" cy="${z / 2}" r="${z / 3}" fill="none" stroke="${color}" stroke-width="${sw}"/>`;
          return `<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%"><defs><pattern id="p" width="${z}" height="${z}" patternUnits="userSpaceOnUse">${tile}</pattern></defs><rect width="100%" height="100%" fill="${bg}"/><rect width="100%" height="100%" fill="url(#p)"/></svg>`;
        };
        const upd = () => { const s = d.svgMode === 'wave' ? waveSvg() : patSvg(); box.innerHTML = s; box.firstChild.style.display = 'block'; if (d.svgMode === 'pat') box.firstChild.style.height = '160px'; code.value = s; ctx.save(); };
        const controls = d.svgMode === 'wave'
          ? h('div', { class: 'grid2' }, range(d.wave, 'amp', 'Amplitud', 5, 80, upd), range(d.wave, 'freq', 'Frecuencia', 1, 10, upd), range(d.wave, 'layers', 'Capas', 1, 5, upd), h('div', {}, colorIn(d.wave, 'color', upd)))
          : h('div', { class: 'col' }, h('div', { class: 'row' }, ['dots', 'grid', 'lines', 'zigzag', 'rings'].map((k) => h('button', { class: 'chip' + (d.pat.kind === k ? ' on' : ''), onclick: () => { d.pat.kind = k; tSvg(); ctx.save(); } }, { dots: 'Puntos', grid: 'Cuadrícula', lines: 'Diagonales', zigzag: 'Zigzag', rings: 'Anillos' }[k])), colorIn(d.pat, 'color', upd, 'Color del trazo'), colorIn(d.pat, 'bg', upd, 'Fondo')), h('div', { class: 'grid2' }, range(d.pat, 'size', 'Tamaño', 8, 80, upd), range(d.pat, 'sw', 'Grosor', 1, 8, upd)));
        body.replaceChildren(modeSeg, box, h('div', { class: 'card' }, controls), h('div', { class: 'row' }, h('button', { class: 'btn', onclick: () => copy(code.value) }, 'Copiar SVG'), h('button', { class: 'btn', title: 'Úsalo en CSS: background-image', onclick: () => copy(`url("data:image/svg+xml,${encodeURIComponent(code.value)}")`) }, 'Copiar como CSS url()'), h('button', { class: 'btn', onclick: () => N.download(d.svgMode === 'wave' ? 'ola.svg' : 'patron.svg', code.value, 'image/svg+xml') }, '⬇ .svg')), code);
        upd();
      }
      draw();
    },
  });
})();
