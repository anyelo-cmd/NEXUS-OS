/* NEXUS OS — canvas infinito (pan/zoom), motor de ventanas y conectores entre ventanas */
(function () {
  const N = window.NEXUS, h = N.h, S = N.state;
  const vp = document.getElementById('viewport'), world = document.getElementById('world');
  const svg = document.getElementById('links'), tasks = document.getElementById('tasks');
  const els = new Map(); // id -> {el, win, body, ro:[]}
  let connectFrom = null;

  /* ---------- Vista ---------- */
  function applyView() {
    const v = S.view;
    world.style.transform = `translate(${v.x}px,${v.y}px) scale(${v.z})`;
    vp.style.backgroundSize = `${32 * v.z}px ${32 * v.z}px`;
    vp.style.backgroundPosition = `${v.x}px ${v.y}px`;
    document.getElementById('zoomlbl').textContent = Math.round(v.z * 100) + '%';
  }
  const toWorld = (cx, cy) => ({ x: (cx - S.view.x) / S.view.z, y: (cy - vp.getBoundingClientRect().top - S.view.y) / S.view.z });
  N.toWorld = toWorld;
  N.applyView = applyView;

  function zoomAt(cx, cy, factor) {
    const v = S.view, nz = Math.min(3, Math.max(0.1, v.z * factor)), k = nz / v.z;
    v.x = cx - (cx - v.x) * k; v.y = cy - (cy - v.y) * k; v.z = nz;
    applyView(); N.save();
  }

  const locked = () => document.body.classList.contains('has-fix');
  vp.addEventListener('wheel', (e) => {
    if (locked()) return;
    if (document.documentElement.dataset.wm === 'fixed') { if (e.ctrlKey) e.preventDefault(); return; }   // zoom fijo en 100 %
    if (e.target.closest('.win') && !e.ctrlKey) return; // scroll normal dentro de ventanas
    e.preventDefault();
    zoomAt(e.clientX, e.clientY - vp.getBoundingClientRect().top, Math.exp(-e.deltaY * (e.ctrlKey ? 0.01 : 0.0015)));
  }, { passive: false });

  vp.addEventListener('pointerdown', (e) => {
    if (e.target.closest('.win') || locked()) return;
    vp.setPointerCapture(e.pointerId); vp.classList.add('panning');
    let lx = e.clientX, ly = e.clientY;
    const mv = (m) => { S.view.x += m.clientX - lx; S.view.y += m.clientY - ly; lx = m.clientX; ly = m.clientY; applyView(); };
    const up = () => { vp.removeEventListener('pointermove', mv); vp.removeEventListener('pointerup', up); vp.classList.remove('panning'); N.save(); };
    vp.addEventListener('pointermove', mv); vp.addEventListener('pointerup', up);
  });

  vp.addEventListener('dblclick', (e) => { if (!e.target.closest('.win') && !locked()) N.toggleLauncher(true, e.clientX, e.clientY); });

  N.home = () => {
    if (locked()) return;
    if (document.documentElement.dataset.wm === 'fixed') { S.view = { x: 0, y: 0, z: 1 }; applyView(); return N.save(); }
    if (!S.windows.length) { S.view = { x: 0, y: 0, z: 1 }; return applyView(); }
    const xs = S.windows.map((w) => w.x), ys = S.windows.map((w) => w.y);
    const x2 = Math.max(...S.windows.map((w) => w.x + w.w)), y2 = Math.max(...S.windows.map((w) => w.y + w.h));
    const W = vp.clientWidth, H = vp.clientHeight - 150, bw = x2 - Math.min(...xs) + 120, bh = y2 - Math.min(...ys) + 120;
    const z = Math.min(1, W / bw, H / bh);
    S.view = { z, x: -Math.min(...xs) * z + (W - (bw - 120) * z) / 2, y: -Math.min(...ys) * z + (H - (bh - 120) * z) / 2 + 85 };
    applyView(); N.save();
  };

  /* ---------- Ventanas ---------- */
  N.registerApp = (type, def) => (N.apps[type] = def);

  N.createWindow = (type, opts = {}) => {
    const app = N.apps[type]; if (!app) return;
    const c = toWorld(vp.clientWidth / 2, vp.getBoundingClientRect().top + vp.clientHeight / 2);
    const n = S.windows.length % 6 * 24;
    const w = {
      id: N.uid(), type, title: opts.title || app.title, w: app.w, h: app.h, min: false,
      x: opts.x ?? c.x - app.w / 2 + n, y: opts.y ?? c.y - app.h / 2 + n, z: ++S.zTop,
      data: opts.data || (app.init ? app.init() : {}),
    };
    S.windows.push(w); render(w);
    if (wmFixed()) { w.prev = { x: w.x, y: w.y, w: w.w, h: w.h }; w.max = true; w.full = false; w.dlg = !!app.free; fitMax(w); paint(w); syncMax(); }
    focus(w.id); N.save(); N.emit('windows');
    return w;
  };

  N.closeWindow = (id) => {
    const r = els.get(id); if (!r) return;
    r.cleanup.forEach((f) => f()); r.el.remove(); els.delete(id);
    S.windows = S.windows.filter((w) => w.id !== id);
    S.links = S.links.filter((l) => l.from !== id && l.to !== id);
    syncMax(); drawLinks(); renderTasks(); N.save(); N.emit('windows');
  };

  function focus(id) {
    const w = S.windows.find((x) => x.id === id); if (!w) return;
    w.z = ++S.zTop; els.get(id).el.style.zIndex = w.z;
    els.forEach((r) => r.el.classList.toggle('focus', r.win.id === id));
    renderTasks();
  }
  N.focusWindow = (id) => {
    const w = S.windows.find((x) => x.id === id); if (!w) return;
    if (w.min) toggleMin(w);
    if (w.max) { fitMax(w); syncMax(); focus(id); return N.save(); }
    const z = S.view.z; S.view.x = vp.clientWidth / 2 - (w.x + w.w / 2) * z; S.view.y = vp.clientHeight / 2 - (w.y + w.h / 2) * z;
    applyView(); focus(id); N.save();
  };

  const syncMax = () => { const v = S.windows.filter((x) => x.max && !x.min); document.body.classList.toggle('has-max', v.some((x) => !x.dlg)); document.body.classList.toggle('has-fix', v.length > 0); };
  function toggleMin(w) { w.min = !w.min; if (!w.min && w.max) fitMax(w); syncMax(); els.get(w.id).el.classList.toggle('min', w.min); drawLinks(); renderTasks(); N.save(); }

  /* Modo fijo: cada ventana es una "página" de tamaño normal, centrada y sin arrastrar; se puede ajustar su tamaño (tirador) o pasar a pantalla completa (▢).
     Modo libre: ▢ maximiza y restaura. La posición y el tamaño de las ventanas fijas se guardan en píxeles de pantalla (w.scr). */
  const TASKBAR = 48;
  const wmFixed = () => document.documentElement.dataset.wm === 'fixed';
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  function framedRect(w) {
    const vw = vp.clientWidth, vh = vp.clientHeight - TASKBAR, base = N.apps[w.type];
    if (!w.scr || w.scr.v !== 2) {   // por defecto la ventana ocupa el escritorio como en un PC (con un pequeño margen); los diálogos van centrados
      const M = vw < 700 ? 0 : 10, pw = w.dlg ? Math.min(base.w, vw - 40) : vw - 2 * M, ph = w.dlg ? Math.min(base.h, vh - 40) : vh - 2 * M;
      w.scr = { v: 2, x: Math.round((vw - pw) / 2), y: Math.round((vh - ph) / 2), w: pw, h: ph };
    }
    const q = w.scr; q.w = clamp(q.w, Math.min(360, vw), vw); q.h = clamp(q.h, Math.min(240, vh), vh); q.x = clamp(q.x, 0, vw - q.w); q.y = clamp(q.y, 0, vh - q.h);
    return q;
  }
  function paint(w) {
    const r = els.get(w.id); if (!r) return;
    r.el.classList.toggle('max', !!w.max); r.el.classList.toggle('dlg', !!w.dlg); r.el.classList.toggle('fs', !!(w.max && (w.full || !wmFixed())));
  }
  function fitMax(w) {
    const r = els.get(w.id); if (!r) return; const z = S.view.z;
    if (wmFixed() && !w.full) { const q = framedRect(w); w.x = (q.x - S.view.x) / z; w.y = (q.y - S.view.y) / z; w.w = q.w / z; w.h = q.h / z; }
    else { w.x = -S.view.x / z; w.y = -S.view.y / z; w.w = vp.clientWidth / z; w.h = (vp.clientHeight - TASKBAR) / z; }
    r.el.style.left = w.x + 'px'; r.el.style.top = w.y + 'px'; r.el.style.width = w.w + 'px'; r.el.style.height = w.h + 'px';
  }
  function storeScr(w) { if (w.max && !w.full && wmFixed()) { const z = S.view.z; w.scr = { v: 2, x: w.x * z + S.view.x, y: w.y * z + S.view.y, w: w.w * z, h: w.h * z }; fitMax(w); } }
  function toggleMax(w) {
    const r = els.get(w.id); if (!r) return;
    if (w.min) toggleMin(w);
    if (wmFixed()) {
      if (!w.max) { w.prev = { x: w.x, y: w.y, w: w.w, h: w.h }; w.max = true; w.full = false; w.dlg = !!N.apps[w.type].free; }
      else w.full = !w.full;
    } else if (!w.max) { w.prev = { x: w.x, y: w.y, w: w.w, h: w.h }; w.max = true; w.full = true; w.dlg = false; }
    else { Object.assign(w, w.prev || {}); w.max = false; w.full = false; w.dlg = false; delete w.prev; delete w.scr; r.el.style.left = w.x + 'px'; r.el.style.top = w.y + 'px'; r.el.style.width = w.w + 'px'; r.el.style.height = w.h + 'px'; }
    if (w.max) fitMax(w);
    paint(w); syncMax(); focus(w.id); drawLinks(); N.save();
  }
  N.toggleMax = (id) => { const w = S.windows.find((x) => x.id === id); if (w) toggleMax(w); };

  function place(w) {
    const el = els.get(w.id).el;
    el.style.cssText += `;left:${w.x}px;top:${w.y}px;width:${w.w}px;height:${w.h}px;z-index:${w.z}`;
  }

  function render(w) {
    const app = N.apps[w.type];
    const title = h('span', { class: 'win-title', contenteditable: 'false', title: 'Doble clic para renombrar' }, w.title);
    title.addEventListener('dblclick', () => { title.contentEditable = 'true'; title.focus(); });
    title.addEventListener('blur', () => { title.contentEditable = 'false'; w.title = title.textContent.trim() || app.title; renderTasks(); N.save(); });
    title.addEventListener('keydown', (e) => e.key === 'Enter' && (e.preventDefault(), title.blur()));
    const linkBtn = h('button', { title: 'Conectar con otra ventana', onclick: () => connect(w.id, linkBtn) }, '⛓');
    const head = h('div', { class: 'win-head' }, h('span', { class: 'win-ic' }, app.icon), title, h('span', { class: 'win-sub' }, app.desc || ''), linkBtn,
      h('button', { title: 'Minimizar', onclick: () => toggleMin(w) }, '–'),
      h('button', { class: 'max-btn', title: 'Maximizar / restaurar (doble clic en la barra)', onclick: () => toggleMax(w) }, '▢'),
      h('button', { title: 'Cerrar', onclick: () => N.closeWindow(w.id) }, '✕'));
    const body = h('div', { class: 'win-body' });
    const grip = h('div', { class: 'resize' });
    const el = h('div', { class: 'win' + (w.min ? ' min' : ''), 'data-id': w.id }, head, body, grip);
    if (app.color) el.style.setProperty('--ac', app.color);
    world.append(el);
    const rec = { el, win: w, body, cleanup: [] };
    els.set(w.id, rec); place(w);
    if (N.holo && N.holo.shape) {   // icono holográfico 3D en la cabecera + marca de agua 3D detrás del contenido
      const ic = head.querySelector('.win-ic'), mc = h('canvas', { class: 'win-mini' }), mk = h('canvas', { class: 'win-mark' });
      ic.textContent = ''; ic.append(mc); el.insertBefore(mk, body); N.holo.shape(mc, w.type); N.holo.shape(mk, w.type, { mark: true });
    }

    el.addEventListener('pointerdown', () => focus(w.id), true);
    head.addEventListener('dblclick', (e) => { if (document.documentElement.dataset.wm !== 'fixed' && (e.target === head || e.target.classList.contains('win-ic'))) toggleMax(w); });
    drag(head, (dx, dy) => { w.x += dx; w.y += dy; el.style.left = w.x + 'px'; el.style.top = w.y + 'px'; drawLinks(); N.emit('win:move', w); }, (e) => !w.max && e.target.tagName !== 'BUTTON' && title.contentEditable !== 'true');
    drag(grip, (dx, dy) => { w.w = Math.max(220, w.w + dx); w.h = Math.max(120, w.h + dy); el.style.width = w.w + 'px'; el.style.height = w.h + 'px'; drawLinks(); }, null, () => storeScr(w));

    const ctx = {
      win: w, data: w.data, el: body, save: N.save,
      onResize: (cb) => { const ro = new ResizeObserver(() => cb(body.clientWidth, body.clientHeight)); ro.observe(body); rec.cleanup.push(() => ro.disconnect()); },
      onCleanup: (f) => rec.cleanup.push(f),
    };
    app.mount(body, ctx);
    if (w.max) { fitMax(w); paint(w); }
    renderTasks(); drawLinks();
  }
  addEventListener('resize', () => { S.windows.forEach((w) => w.max && fitMax(w)); drawLinks(); });
  // modo de ventanas: fijas = todas maximizadas; libres = restauradas al lienzo
  N.applyWindowMode = () => {
    if (wmFixed()) { S.view.z = 1; applyView(); }   // zoom fijo en 100 %
    S.windows.forEach((w) => { if (wmFixed() ? !w.max : w.max) toggleMax(w); else if (w.max) { fitMax(w); paint(w); } });
    syncMax();
  };

  // arrastre en espacio-mundo (compensa zoom)
  function drag(handle, onMove, filter, onUp) {
    handle.addEventListener('pointerdown', (e) => {
      if (e.button !== 0 || (filter && !filter(e))) return;
      e.preventDefault(); e.stopPropagation(); handle.setPointerCapture(e.pointerId);
      let lx = e.clientX, ly = e.clientY;
      const mv = (m) => { onMove((m.clientX - lx) / S.view.z, (m.clientY - ly) / S.view.z); lx = m.clientX; ly = m.clientY; };
      const up = () => { handle.removeEventListener('pointermove', mv); handle.removeEventListener('pointerup', up); if (onUp) onUp(); N.save(); };
      handle.addEventListener('pointermove', mv); handle.addEventListener('pointerup', up);
    });
  }

  /* ---------- Conectores ---------- */
  function connect(id, btn) {
    if (!connectFrom) { connectFrom = { id, btn }; btn.classList.add('on'); return N.toast('Origen elegido. Pulsa ⛓ en la ventana destino (o de nuevo aquí para cancelar).'); }
    connectFrom.btn.classList.remove('on');
    if (connectFrom.id !== id) {
      const i = S.links.findIndex((l) => l.from === connectFrom.id && l.to === id);
      if (i >= 0) { S.links.splice(i, 1); N.toast('Conector eliminado'); }
      else { S.links.push({ from: connectFrom.id, to: id }); N.toast('Conector creado', 'ok'); N.emit('link', { from: connectFrom.id, to: id }); }
      drawLinks(); N.save();
    }
    connectFrom = null;
  }

  function drawLinks() {
    svg.innerHTML = '';
    for (const l of S.links) {
      const a = S.windows.find((w) => w.id === l.from), b = S.windows.find((w) => w.id === l.to);
      if (!a || !b) continue;
      const ah = a.min ? 34 : a.h, bh = b.min ? 34 : b.h;
      const x1 = a.x + a.w, y1 = a.y + ah / 2, x2 = b.x, y2 = b.y + bh / 2, d = Math.max(60, Math.abs(x2 - x1) / 2);
      const p = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      p.setAttribute('d', `M${x1},${y1} C${x1 + d},${y1} ${x2 - d},${y2} ${x2},${y2}`);
      svg.append(p);
    }
  }

  /* ---------- Barra de tareas ---------- */
  function renderTasks() {
    tasks.replaceChildren(...S.windows.map((w) => h('button', { class: 'task' + (w.min ? ' min' : '') + (!w.min && els.get(w.id)?.el.classList.contains('focus') ? ' act' : ''), style: { '--ac': N.apps[w.type].color || 'var(--accent)' }, onclick: () => { const r = els.get(w.id); if (r && !w.min && r.el.classList.contains('focus')) toggleMin(w); else N.focusWindow(w.id); }, title: 'Clic: abrir/enfocar · clic de nuevo: minimizar' }, N.apps[w.type].icon + ' ' + w.title)));
  }

  N.renderAll = () => {
    els.forEach((r) => { r.cleanup.forEach((f) => f()); r.el.remove(); }); els.clear();
    S.windows.forEach(render); applyView(); drawLinks(); renderTasks(); syncMax();
  };
})();
