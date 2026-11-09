/* Herramientas básicas de un sistema operativo: Calculadora, Calendario y Administrador de tareas. */
(function () {
  const N = window.NEXUS, h = N.h;

  /* ---------- Calculadora ---------- */
  N.registerApp('calc', {
    title: 'Calculadora', icon: '🧮', desc: 'Operaciones básicas (admite teclado)', w: 340, h: 520, free: true,
    init: () => ({ hist: [] }),
    mount(root, ctx) {
      const d = ctx.data; root.classList.add('app', 'calc');
      let expr = '', shown = '0';
      const disp = h('div', { class: 'cc-disp' }), sub = h('div', { class: 'cc-sub' }), hist = h('div', { class: 'cc-hist' });
      const fmt = (n) => (Number.isFinite(n) ? String(+n.toPrecision(12)) : 'Error');
      const evaluate = (s) => {
        const t = s.replace(/×/g, '*').replace(/÷/g, '/').replace(/−/g, '-');
        if (!/^[0-9+\-*/().%\s]*$/.test(t)) return NaN;
        try { return Function('"use strict";return (' + (t.replace(/(\d+(?:\.\d+)?)%/g, '($1/100)') || '0') + ')')(); } catch (e) { return NaN; }
      };
      const draw = () => { disp.textContent = shown; sub.textContent = expr; hist.replaceChildren(...d.hist.slice(-4).reverse().map((x) => h('div', { onclick: () => { expr = ''; shown = x.split('=')[1].trim(); draw(); } }, x))); };
      function press(k) {
        if (k === 'C') { expr = ''; shown = '0'; }
        else if (k === '⌫') { shown = shown.length > 1 ? shown.slice(0, -1) : '0'; }
        else if (k === '=') { const full = (expr + shown).trim(), r = evaluate(full); if (full) { d.hist.push(full + ' = ' + fmt(r)); d.hist = d.hist.slice(-20); } shown = fmt(r); expr = ''; ctx.save(); }
        else if (k === '±') { shown = shown.startsWith('-') ? shown.slice(1) : shown === '0' ? '0' : '-' + shown; }
        else if ('+−×÷'.includes(k)) { expr += shown + ' ' + k + ' '; shown = '0'; }
        else if (k === '%') { shown = fmt(parseFloat(shown) / 100); }
        else if (k === '.') { if (!shown.includes('.')) shown += '.'; }
        else { shown = shown === '0' || shown === 'Error' ? k : shown + k; }
        draw();
      }
      const keys = ['C', '±', '%', '÷', '7', '8', '9', '×', '4', '5', '6', '−', '1', '2', '3', '+', '⌫', '0', '.', '='];
      root.append(hist, sub, disp, h('div', { class: 'cc-keys' }, keys.map((k) => h('button', { class: 'cc-k' + ('÷×−+='.includes(k) ? ' op' : '') + (k === '=' ? ' eq' : ''), onclick: () => press(k) }, k))));
      root.tabIndex = 0;
      root.addEventListener('keydown', (e) => {
        const m = { '*': '×', '/': '÷', '-': '−', Enter: '=', Backspace: '⌫', Escape: 'C', ',': '.' }, k = m[e.key] || e.key;
        if (keys.includes(k)) { e.preventDefault(); press(k); }
      });
      draw();
    },
  });

  /* ---------- Calendario ---------- */
  N.registerApp('calendar', {
    title: 'Calendario', icon: '📅', desc: 'Fecha, mes y notas del día', w: 420, h: 560, free: true,
    init: () => ({ notes: {} }),
    mount(root, ctx) {
      const d = ctx.data; d.notes ||= {}; root.classList.add('app', 'cal');
      let cur = new Date(); cur.setDate(1);
      let sel = new Date(); const key = (x) => x.toISOString().slice(0, 10);
      const head = h('div', { class: 'cal-head' }), grid = h('div', { class: 'cal-grid' }), note = h('textarea', { class: 'cal-note', placeholder: 'Nota para este día…', oninput: (e) => { const v = e.target.value; if (v.trim()) d.notes[key(sel)] = v; else delete d.notes[key(sel)]; ctx.save(); draw(); } }), lbl = h('div', { class: 'cal-lbl' });
      function draw() {
        const y = cur.getFullYear(), m = cur.getMonth(), first = (new Date(y, m, 1).getDay() + 6) % 7, days = new Date(y, m + 1, 0).getDate(), today = key(new Date());
        head.replaceChildren(h('button', { class: 'btn', onclick: () => { cur = new Date(y, m - 1, 1); draw(); } }, '◀'), h('b', {}, cur.toLocaleDateString('es-CO', { month: 'long', year: 'numeric' })), h('button', { class: 'btn', onclick: () => { cur = new Date(y, m + 1, 1); draw(); } }, '▶'), h('button', { class: 'btn', onclick: () => { cur = new Date(); cur.setDate(1); sel = new Date(); draw(); } }, 'Hoy'));
        const cells = ['L', 'M', 'X', 'J', 'V', 'S', 'D'].map((x) => h('div', { class: 'cal-dow' }, x));
        for (let i = 0; i < first; i++) cells.push(h('div'));
        for (let dd = 1; dd <= days; dd++) { const dt = new Date(y, m, dd, 12), k = key(dt); cells.push(h('button', { class: 'cal-d' + (k === today ? ' today' : '') + (k === key(sel) ? ' sel' : '') + (d.notes[k] ? ' has' : ''), onclick: () => { sel = dt; draw(); } }, String(dd))); }
        grid.replaceChildren(...cells);
        lbl.textContent = sel.toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }); note.value = d.notes[key(sel)] || '';
      }
      root.append(head, grid, lbl, note); draw();
    },
  });

  /* ---------- Administrador de tareas ---------- */
  N.registerApp('taskman', {
    title: 'Administrador de tareas', icon: '📊', desc: 'Ventanas abiertas, rendimiento y memoria', w: 640, h: 480, free: true,
    mount(root, ctx) {
      root.classList.add('app', 'tm');
      const list = h('div', { class: 'tm-list' }), info = h('div', { class: 'tm-info' });
      root.append(info, h('div', { class: 'tm-th' }, h('span', {}, 'Programa'), h('span', {}, 'Estado'), h('span', {})), list);
      let fps = 0, f = 0, t0 = performance.now(), raf;
      const loop = (n) => { f++; if (n - t0 >= 1000) { fps = f; f = 0; t0 = n; } raf = requestAnimationFrame(loop); }; raf = requestAnimationFrame(loop); ctx.onCleanup(() => cancelAnimationFrame(raf));
      function draw() {
        const mem = performance.memory ? (performance.memory.usedJSHeapSize / 1048576).toFixed(0) + ' MB' : 'n/d', cores = navigator.hardwareConcurrency || '?';
        info.replaceChildren(...[['FPS', fps], ['Memoria JS', mem], ['Núcleos', cores], ['Ventanas', N.state.windows.length], ['Efectos', N.perfMode ? N.perfMode() : '-']].map(([k, v]) => h('div', { class: 'tm-card' }, h('small', {}, k), h('b', {}, String(v)))));
        list.replaceChildren(...(N.state.windows.length ? N.state.windows.filter((w) => w.id !== ctx.win.id).concat(N.state.windows.filter((w) => w.id === ctx.win.id)).map((w) => h('div', { class: 'tm-row' }, h('span', {}, (N.apps[w.type]?.icon || '') + ' ' + w.title), h('span', { class: 'badge' + (w.min ? '' : ' ok') }, w.min ? 'Minimizada' : 'En ejecución'), h('button', { class: 'btn danger', disabled: w.id === ctx.win.id, onclick: () => N.closeWindow(w.id) }, 'Finalizar'))) : [h('div', { class: 'empty' }, 'No hay programas abiertos')]));
      }
      draw(); const iv = setInterval(draw, 1000); ctx.onCleanup(() => clearInterval(iv));
    },
  });

  N.closeAllWindows = () => [...N.state.windows].forEach((w) => N.closeWindow(w.id));
})();
