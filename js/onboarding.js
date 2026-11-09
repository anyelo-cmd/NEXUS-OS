/* Bienvenida: explica para qué sirve NEXUS OS y da un mini tutorial. Se muestra cada vez que se abre la app
   (se puede desactivar con la casilla y reabrir con el botón ? o la tecla F1). */
(function () {
  const N = window.NEXUS, h = N.h;
  const KEY = 'nexus-welcome-off';
  const get = () => { try { return localStorage.getItem(KEY) === '1'; } catch (e) { return false; } };
  const set = (v) => { try { v ? localStorage.setItem(KEY, '1') : localStorage.removeItem(KEY); } catch (e) {} };

  const STEPS = [
    { ic: 'logo', t: 'Bienvenido a NEXUS OS', p: 'Un escritorio infinito dentro de tu navegador. Aquí abres módulos en ventanas y los acomodas libremente en un lienzo sin bordes: tú decides dónde va cada cosa.',
      list: [['📝', 'Notas', 'documentos con bloques, tablas y tableros kanban'], ['💻', 'Código', 'editor HTML/CSS/JS con vista previa en vivo y consola'], ['🎨', 'Multimedia', 'edición de imagen, paletas y generación con Python'], ['🌐', 'Navegador', 'abre cualquier página web por URL'], ['🎓', 'Academia', 'aprende a programar con lecciones tipo Duolingo']] },
    { ic: '🖱', t: 'Ventanas y movimiento', p: 'Así se comportan las ventanas y el escritorio:',
      list: [['🪟', 'Ventanas fijas', 'cada programa se abre a pantalla completa y no se arrastra (puedes cambiarlo en Configuración)'], ['✋', 'Escritorio libre', 'con el escritorio vacío arrastra el fondo para moverte y usa la rueda para el zoom'], ['—', 'Minimizar / ✕ cerrar', 'desde la cabecera de cada ventana'], ['⌖', 'Ctrl + 0', 'vuelve al centro'], ['⚡', 'Rendimiento', 'ajusta los efectos si tu equipo va lento']] },
    { ic: '◈', t: 'Tu escritorio, estilo PC', p: 'Todo se controla desde la barra inferior y el escritorio:',
      list: [['◈', 'Inicio', 'abre el menú con buscador, tus programas y tu cuenta'], ['🖥', 'Iconos del escritorio', 'doble clic para abrir; clic derecho para más opciones'], ['▭', 'Barra de tareas', 'un botón por ventana: púlsalo para enfocar o minimizar'], ['🧩', 'Mis programas', 'trae programas, carpetas y sitios de tu Windows'], ['⚙', 'Configuración', 'tema, color, ventanas, rendimiento y tu cuenta'], ['🔒', 'Bloquear / cerrar sesión', 'desde el menú Inicio']] },
    { ic: '🐍', t: 'Potenciado por Python', p: 'Si ejecutas iniciar.bat se activa el motor Python local: filtros de imagen, fondos generados, el diseño Ultron y el modo Seguro del navegador. Sin él, todo lo demás sigue funcionando.',
      list: [['🔒', 'Tus datos son tuyos', 'se guardan en tu navegador; el servidor solo escucha en tu equipo'], ['💾', 'Autoguardado', 'tu espacio se conserva al cerrar y volver a abrir'], ['👥', 'Varias pestañas', 'abre NEXUS en dos pestañas y verás los cursores en vivo']] },
  ];

  N.showWelcome = function (opts = {}) {
    if (document.getElementById('welcome')) return;
    let i = 0;
    const off = h('input', { type: 'checkbox', id: 'w-off' }); off.checked = get();
    const card = h('div', { class: 'w-card' }), dots = h('div', { class: 'w-dots' });
    const ov = h('div', { id: 'welcome', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Bienvenida a NEXUS OS' }, h('img', { class: 'w-ring', src: 'assets/ring.svg', alt: '' }), card);
    const close = () => { set(off.checked); ov.classList.add('out'); document.removeEventListener('keydown', onKey, true); setTimeout(() => ov.remove(), 260); if (opts.then) opts.then(); };
    const onKey = (e) => { if (e.key === 'Escape') { e.stopPropagation(); close(); } else if (e.key === 'ArrowRight' || e.key === 'Enter') { e.preventDefault(); go(1); } else if (e.key === 'ArrowLeft') go(-1); };
    const go = (d) => { if (d > 0 && i === STEPS.length - 1) return close(); i = Math.max(0, Math.min(STEPS.length - 1, i + d)); draw(); };
    function draw() {
      const s = STEPS[i], last = i === STEPS.length - 1;
      dots.replaceChildren(...STEPS.map((_, k) => h('i', { class: k === i ? 'on' : '', onclick: () => { i = k; draw(); } })));
      card.replaceChildren(
        h('div', { class: 'w-ic' }, s.ic === 'logo' ? h('img', { src: 'assets/logo.svg', alt: '' }) : s.ic),
        h('div', { class: 'w-step' }, 'PASO ' + (i + 1) + ' / ' + STEPS.length), h('h2', {}, s.t), h('p', {}, s.p),
        h('ul', {}, s.list.map(([ic, b, t]) => h('li', {}, h('span', {}, ic), h('div', {}, h('b', {}, b), ' — ' + t)))),
        dots,
        h('div', { class: 'w-actions' }, h('label', { class: 'w-chk' }, off, ' No mostrar al abrir'), h('span', { style: { flex: 1 } }),
          i > 0 ? h('button', { class: 'btn', onclick: () => go(-1) }, '← Atrás') : h('button', { class: 'btn', onclick: close }, 'Omitir'),
          h('button', { class: 'btn primary', onclick: () => go(1) }, last ? '¡EMPEZAR!' : 'SIGUIENTE →')));
    }
    document.body.append(ov); document.addEventListener('keydown', onKey, true); draw();
  };

  N.initWelcome = () => { if (!get()) N.showWelcome(); };
  addEventListener('keydown', (e) => { if (e.key === 'F1') { e.preventDefault(); N.showWelcome(); } });
})();
