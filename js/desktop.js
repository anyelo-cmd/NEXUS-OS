/* Escritorio estilo PC: iconos (doble clic para abrir), programas de Windows anclados y menú contextual con clic derecho. */
(function () {
  const N = window.NEXUS, h = N.h;
  const desk = h('div', { id: 'desktop' });
  document.body.append(desk);
  let sel = null;

  function draw() {
    const items = [];
    (N.get('pins') || []).forEach((k) => { const a = N.apps[k]; if (a) items.push({ ic: a.icon, label: a.title, tip: a.desc, color: a.color, open: () => N.createWindow(k) }); });
    (N.myApps?.() || []).filter((e) => e.pinned).forEach((e) => items.push({ ic: e.icon || '🚀', label: e.name, tip: e.kind === 'url' ? e.url : 'Programa de Windows', color: '#ff4fa3', open: () => N.launchMyApp(e) }));
    desk.replaceChildren(...items.map((it) => {
      const el = h('div', { class: 'd-icon', tabindex: '0', style: { '--ac': it.color || 'var(--accent)' }, title: it.tip + ' — doble clic para abrir',
        onclick: (e) => { e.stopPropagation(); if (matchMedia('(pointer:coarse)').matches) return it.open(); sel?.classList.remove('sel'); sel = el; el.classList.add('sel'); },
        ondblclick: it.open, onkeydown: (e) => { if (e.key === 'Enter') it.open(); } },
        h('span', { class: 'd-ic' }, it.ic), h('span', { class: 'd-lbl' }, it.label));
      return el;
    }));
  }

  /* menú contextual del escritorio */
  let menu = null;
  const close = () => { menu?.remove(); menu = null; };
  document.addEventListener('pointerdown', (e) => { if (menu && !e.target.closest('.ctx')) close(); if (!e.target.closest('.d-icon')) { sel?.classList.remove('sel'); sel = null; } }, true);
  addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });
  N.on('desktop', draw);
  N.onReady = () => {
    draw();
    document.getElementById('viewport').addEventListener('contextmenu', (e) => {
      if (e.target.closest('.win')) return;
      e.preventDefault(); close();
      const item = (ic, t, fn) => h('button', { onclick: () => { close(); fn(); } }, h('span', {}, ic), t);
      menu = h('div', { class: 'ctx', style: { left: Math.min(e.clientX, innerWidth - 220) + 'px', top: Math.max(8, Math.min(e.clientY, innerHeight - 470)) + 'px' } },
        h('div', { class: 'ctx-h' }, 'NUEVO'), ...Object.entries(N.apps).map(([k, a]) => item(a.icon, a.title, () => N.createWindow(k))),
        h('hr'), item('⌖', 'Centrar vista', N.home), item('🖥', N.get('icons') ? 'Ocultar iconos' : 'Mostrar iconos', () => N.set({ icons: !N.get('icons') })),
        item('⚙', 'Configuración', () => N.createWindow('settings')), item('🔒', 'Bloquear', () => N.lock()));
      document.body.append(menu);
    });
  };
})();
