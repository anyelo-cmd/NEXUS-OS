/* Panel de Configuración: Personalización, Ventanas y escritorio, Sistema, Cuenta y Acerca de. */
(function () {
  const N = window.NEXUS, h = N.h;
  const SECTIONS = [['look', '🎨', 'Personalización'], ['win', '🖥', 'Ventanas y escritorio'], ['sys', '⚙', 'Sistema'], ['acc', '👤', 'Cuenta'], ['about', 'ℹ', 'Acerca de']];

  N.registerApp('settings', {
    title: 'Configuración', icon: '⚙', desc: 'Apariencia, ventanas, sistema y cuenta', w: 860, h: 600, free: true,
    init: () => ({ tab: 'look' }),
    mount(root, ctx) {
      const d = ctx.data; root.classList.add('app', 'st');
      const side = h('nav', { class: 'st-side' }), main = h('div', { class: 'st-main scroll' });
      root.append(side, main);

      const row = (label, desc, ctl) => h('div', { class: 'st-row' }, h('div', {}, h('b', {}, label), desc ? h('small', {}, desc) : ''), h('div', { class: 'st-ctl' }, ctl));
      const seg = (opts, cur, fn) => h('div', { class: 'seg' }, opts.map(([v, l]) => h('button', { class: cur === v ? 'on' : '', onclick: () => fn(v) }, l)));
      const sw = (on, fn) => h('button', { class: 'st-sw' + (on ? ' on' : ''), role: 'switch', 'aria-checked': String(!!on), onclick: () => fn(!on) }, h('i'));
      const title = (t, s) => [h('h2', {}, t), s ? h('p', { class: 'st-sub' }, s) : ''];
      const set = (p) => { N.set(p); draw(); };

      const VIEWS = {
        look: () => [...title('Personalización', 'Los cambios se aplican al instante.'),
          row('Estilo', 'Tema general de la interfaz', h('div', { class: 'st-themes' }, N.THEMES.map(([k, l, , sw2]) => h('button', { class: 'st-theme' + (N.get('theme') === k ? ' on' : ''), onclick: () => set({ theme: k }) }, h('span', { style: { background: `linear-gradient(135deg,${sw2[0]} 55%,${sw2[1]} 55%)` } }), l)))),
          row('Color de acento', 'Botones, bordes y resaltados', h('div', { class: 'st-colors' }, N.ACCENTS.map((c) => h('button', { class: 'sv-dot' + (N.get('accent').toLowerCase() === c ? ' on' : ''), style: { background: c }, title: c, onclick: () => set({ accent: c }) })), h('input', { type: 'color', value: N.get('accent'), title: 'Color personalizado', onchange: (e) => set({ accent: e.target.value }) }))),
          row('Fondo de pantalla', 'El fondo 3D lo genera Python con tu color', seg([['live', 'Holograma vivo'], ['3d', '3D estático'], ['hud', 'HUD plano'], ['solid', 'Color liso']], N.get('wall'), (v) => set({ wall: v }))),
          row('Cursor holográfico', 'Retícula con estela y bloqueo de objetivo (en páginas web incrustadas vuelve el normal)', sw(N.get('cursor') !== false, (v) => set({ cursor: v }))),
          row('Nuevo fondo', 'Genera otra variación (requiere el servidor Python)', h('button', { class: 'btn', onclick: () => { N.set({ seed: Math.floor(Math.random() * 9000) + 1, wall: 'hud' }); N.toast('Generando fondo…'); } }, '🎲 Generar'))],
        win: () => [...title('Ventanas y escritorio'),
          row('Modo de ventanas', 'Fijas: pantalla completa como Windows, sin arrastrar. Libres: lienzo infinito.', seg([['fixed', 'Fijas'], ['free', 'Libres']], N.get('wm'), (v) => set({ wm: v }))),
          row('Iconos del escritorio', '', sw(N.get('icons'), (v) => set({ icons: v }))),
          h('div', { class: 'st-lbl' }, 'Programas en el escritorio'),
          h('div', { class: 'st-pins' }, Object.entries(N.apps).map(([k, a]) => { const on = N.get('pins').includes(k); return h('button', { class: 'chip' + (on ? ' on' : ''), onclick: () => set({ pins: on ? N.get('pins').filter((x) => x !== k) : [...N.get('pins'), k] }) }, a.icon + ' ' + a.title); }))],
        sys: () => [...title('Sistema'),
          row('Rendimiento', 'Menos efectos = más fluidez en equipos modestos', seg([['auto', 'Auto'], ['alto', 'Máximo'], ['medio', 'Medio'], ['bajo', 'Ligero']], N.get('perf'), (v) => set({ perf: v }))),
          row('Bienvenida al abrir', 'Muestra la guía rápida cada vez (F1 la abre cuando quieras)', sw(N.get('welcome'), (v) => set({ welcome: v }))),
          row('Pedir contraseña al abrir', 'Muestra la pantalla de inicio de sesión al iniciar', sw(N.get('askPass'), (v) => set({ askPass: v }))),
          row('Servidor Python', 'Filtros de imagen, fondos, navegador seguro y programas de Windows', h('span', { class: 'badge', id: 'st-py' }, '…')),
          row('Copia de seguridad', 'Exporta o importa tu espacio de trabajo (con cifrado opcional)', h('div', { class: 'st-btns' }, h('button', { class: 'btn', onclick: () => N.exportWorkspace && N.exportWorkspace() }, '⬇ Exportar'), h('button', { class: 'btn', onclick: () => N.importWorkspace && N.importWorkspace() }, '⬆ Importar'))),
          row('Repetir la encuesta', 'Vuelve a personalizar el sistema paso a paso', h('button', { class: 'btn', onclick: async () => { await N.survey(); draw(); } }, 'Abrir encuesta')),
          row('Restablecer NEXUS OS', 'Borra ventanas y ajustes (la cuenta se conserva)', h('button', { class: 'btn danger', onclick: reset }, 'Restablecer'))],
        acc: () => { const u = N.user(); const o = h('input', { class: 'lk-in', type: 'password', placeholder: 'Contraseña actual', autocomplete: 'current-password' }), n1 = h('input', { class: 'lk-in', type: 'password', placeholder: 'Nueva contraseña (mín. 6)', autocomplete: 'new-password' }), n2 = h('input', { class: 'lk-in', type: 'password', placeholder: 'Repite la nueva contraseña', autocomplete: 'new-password' }), msg = h('div', { class: 'st-msg' });
          return [...title('Cuenta'),
            h('div', { class: 'st-user' }, h('div', { class: 'lk-av sm' }, (u.name[0] || 'A').toUpperCase()), h('div', {}, h('b', {}, u.name), h('small', {}, (u.role || 'Usuario') + ' · cuenta local'))),
            row('Nombre para mostrar', 'Se ve en el menú Inicio', h('input', { class: 'lk-in', value: N.get('name'), maxlength: 24, onchange: (e) => N.set({ name: e.target.value.trim() || 'anyelo' }) })),
            h('div', { class: 'st-lbl' }, 'Cambiar contraseña'), h('form', { class: 'st-pw', onsubmit: async (e) => { e.preventDefault(); msg.className = 'st-msg'; try { if (n1.value !== n2.value) throw new Error('Las contraseñas nuevas no coinciden'); await N.changePassword(o.value, n1.value); msg.textContent = '✓ Contraseña actualizada'; msg.className = 'st-msg ok'; o.value = n1.value = n2.value = ''; } catch (err) { msg.textContent = err.message; msg.className = 'st-msg bad'; } } }, o, n1, n2, h('button', { class: 'btn primary', type: 'submit' }, 'Guardar contraseña'), msg),
            row('Sesión', '', h('div', { class: 'st-btns' }, h('button', { class: 'btn', onclick: () => N.lock() }, '🔒 Bloquear'), h('button', { class: 'btn', onclick: () => N.signOut() }, '⏻ Cerrar sesión')))]; },
        about: () => [...title('Acerca de NEXUS OS'),
          h('div', { class: 'st-about' }, h('img', { src: 'assets/logo.svg', alt: '', width: 76 }), h('div', {}, h('b', {}, 'NEXUS OS'), h('small', {}, 'Sistema operativo portátil en el navegador · versión 2.0'))),
          row('Navegador', navigator.userAgent.includes('Chrome/') ? 'Google Chrome / Chromium' : 'Otro (se recomienda Chrome)', h('span', { class: 'badge ' + (navigator.userAgent.includes('Chrome/') ? 'ok' : 'warn') }, navigator.userAgent.includes('Chrome/') ? 'Compatible' : 'Revisar')),
          row('Almacenamiento', 'Tus datos se guardan en este navegador (IndexedDB)', h('span', { class: 'badge', id: 'st-store' }, '…')),
          row('Ventanas abiertas', '', h('b', {}, String(N.state.windows.length))),
          row('Atajos', 'F1 ayuda · Ctrl+0 centrar · Esc cerrar menú · Alt+←/→ navegador', '')],
      };

      function reset() {
        if (!confirm('¿Restablecer NEXUS OS? Se borrarán ventanas, documentos y ajustes de este navegador.')) return;
        try { localStorage.removeItem('workspace'); localStorage.removeItem('nexus-welcome-off'); } catch (e) {}
        try { indexedDB.deleteDatabase('nexus-os'); } catch (e) {}
        setTimeout(() => location.reload(), 300);
      }
      function draw() {
        side.replaceChildren(h('div', { class: 'st-head' }, '⚙ Configuración'), ...SECTIONS.map(([k, ic, l]) => h('button', { class: 'st-nav' + (d.tab === k ? ' on' : ''), onclick: () => { d.tab = k; draw(); } }, h('span', {}, ic), l)));
        main.replaceChildren(...VIEWS[d.tab]());
        const py = main.querySelector('#st-py'); if (py) N.py.ping().then((ok) => { py.textContent = ok ? '● Conectado' : '○ Apagado (ejecuta iniciar.bat)'; py.className = 'badge ' + (ok ? 'ok' : 'bad'); });
        const st = main.querySelector('#st-store'); if (st) (navigator.storage?.estimate?.() || Promise.resolve({})).then((e) => { st.textContent = e.usage != null ? (e.usage / 1048576).toFixed(1) + ' MB usados' : 'Disponible'; });
      }
      draw();
    },
  });
})();
