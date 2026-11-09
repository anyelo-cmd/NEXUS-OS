/* NEXUS OS — arranque: sesión, encuesta, barra de tareas, menú Inicio, import/export, colaboración multi-pestaña y PWA */
(async function () {
  const N = window.NEXUS, h = N.h, S = N.state;
  const $ = (id) => document.getElementById(id);

  // color de identidad por módulo (ventanas, barra de tareas y minimapa)
  Object.entries({ notes: '#7c9cff', ide: '#c586f0', media: '#ff6bcb', browser: '#38d6e8', learn: '#ffd43b', settings: '#9aa4b8', calc: '#35f2a0', calendar: '#ffb000', taskman: '#19d3ff', winapps: '#ff4fa3' })
    .forEach(([k, c]) => N.apps[k] && (N.apps[k].color = c));

  await N.load();
  await N.cloud.pull();   // si hay sesión en la nube, trae la versión más reciente de tu espacio
  const cfg = (S.settings ||= {});
  if (cfg.wall === 'hud' && !cfg.wall2) { cfg.wall = '3d'; cfg.wall2 = 1; }
  if (cfg.wall === '3d' && !cfg.wall3) { cfg.wall = 'live'; cfg.wall3 = 1; }   // nuevo fondo vivo por defecto   // el fondo por defecto ahora es el 3D
  if (cfg.theme === undefined && ['ultron', 'dark', 'light', 'contrast'].includes(S.theme)) cfg.theme = S.theme;
  S.windows = (S.windows || []).filter((w) => N.apps[w.type]);
  S.links = (S.links || []).filter((l) => S.windows.some((w) => w.id === l.from) && S.windows.some((w) => w.id === l.to));
  N.applySettings();
  N.renderAll();
  { const cw = N.createWindow; N.createWindow = (type, o) => { N.cloud.log('open_app', { app: type }); return cw(type, o); }; }
  N.onReady && N.onReady();

  // arranque holográfico (~2,7 s); un clic o una tecla lo omite
  const bootEl = $('boot');
  const bootDone = new Promise((res) => {
    let fin = false;
    const end = () => { if (fin) return; fin = true; bootEl.classList.add('gone'); setTimeout(() => { bootEl.remove(); N.bootHolo && N.bootHolo.stop(); }, 500); res(); };
    setTimeout(end, 2700); bootEl.addEventListener('pointerdown', end); addEventListener('keydown', end, { once: true });
  });

  /* ---------- Menú Inicio ---------- */
  const launcher = $('launcher');
  N.toggleLauncher = (show) => {
    const open = show ?? launcher.hidden; launcher.hidden = !open;
    if (!open) return;
    const u = N.who || N.user(), name = N.who ? N.who.name : (N.get('name') || u.name);
    const run = (fn) => () => { launcher.hidden = true; fn(); };
    const item = (ic, title, desc, fn, color) => h('div', { class: 'l-item', style: { '--ac': color || 'var(--accent)' }, onclick: run(fn) }, h('span', { class: 'ic' }, ic), h('div', {}, h('b', {}, title), desc ? h('small', {}, desc) : ''));
    const list = h('div', { class: 'l-list' }), draw = (q = '') => {
      const ql = q.toLowerCase(), apps = Object.entries(N.apps).filter(([, a]) => (a.title + ' ' + a.desc).toLowerCase().includes(ql)), mine = (N.myApps?.() || []).filter((e) => e.name.toLowerCase().includes(ql));
      list.replaceChildren(...apps.map(([k, a]) => item(a.icon, a.title, a.desc, () => N.createWindow(k), a.color)),
        ...(mine.length ? [h('div', { class: 'l-sec' }, 'MIS PROGRAMAS')] : []), ...mine.map((e) => item(e.icon || '🚀', e.name, e.kind === 'url' ? 'Sitio web' : 'Windows', () => N.launchMyApp(e), '#ff4fa3')),
        ...(apps.length || mine.length ? [] : [h('div', { class: 'empty' }, 'Sin resultados')]));
    };
    const search = h('input', { class: 'l-search', placeholder: 'Escribe para buscar…', oninput: (e) => draw(e.target.value), onkeydown: (e) => { if (e.key === 'Enter') list.querySelector('.l-item')?.click(); } });
    launcher.replaceChildren(search, list, h('div', { class: 'l-user' }, h('div', { class: 'lk-av sm' }, (name[0] || 'A').toUpperCase()), h('div', {}, h('b', {}, name), h('small', {}, u.role || 'Usuario')), h('span', { style: { flex: 1 } }),
      h('button', { class: 'btn', title: 'Configuración', onclick: run(() => N.createWindow('settings')) }, '⚙'), h('button', { class: 'btn', title: 'Bloquear', onclick: run(() => N.lock()) }, '🔒'), h('button', { class: 'btn', title: 'Cerrar sesión', onclick: run(() => N.signOut()) }, '⏻')));
    draw(); setTimeout(() => search.focus(), 30);
  };
  $('btn-launch').onclick = (e) => { e.stopPropagation(); N.toggleLauncher(); };
  $('btn-search').onclick = (e) => { e.stopPropagation(); N.toggleLauncher(true); };
  $('btn-settings').onclick = () => N.createWindow('settings');
  $('btn-clock').onclick = () => N.createWindow('calendar');
  $('btn-help').onclick = () => N.showWelcome();
  document.addEventListener('pointerdown', (e) => { if (!e.target.closest('#launcher,#btn-launch,#btn-search')) launcher.hidden = true; });

  /* ---------- Exportar / importar ---------- */
  N.exportWorkspace = async () => {
    const pass = prompt('Exportar espacio de trabajo.\nEscribe una contraseña para cifrarlo (AES-GCM), o déjalo vacío para JSON plano.');
    if (pass === null) return;
    const json = JSON.stringify(S, null, 1);
    if (pass) N.download('nexus-backup.nexus', await N.encrypt(json, pass)); else N.download('nexus-workspace.json', json);
  };
  N.importWorkspace = () => $('file-import').click();
  $('file-import').onchange = async (e) => {
    const f = e.target.files[0]; e.target.value = ''; if (!f) return;
    try {
      let obj = JSON.parse(await f.text());
      if (obj.nexusEncrypted) { const p = prompt('Contraseña del respaldo:'); if (p == null) return; obj = JSON.parse(await N.decrypt(obj, p)); }
      if (!Array.isArray(obj.windows)) throw new Error('formato');
      Object.assign(S, { windows: [], links: [] }, obj); N.applySettings(); N.renderAll(); N.save(); N.toast('Espacio importado', 'ok');
    } catch (err) { N.toast('No se pudo importar (archivo inválido o contraseña incorrecta)', 'bad'); }
  };

  /* ---------- Colaboración en vivo entre pestañas (BroadcastChannel) ---------- */
  if ('BroadcastChannel' in window) {
    const ch = new BroadcastChannel('nexus-os'), me = { id: N.uid(), name: 'Usuario ' + Math.floor(Math.random() * 900 + 100), color: `hsl(${Math.random() * 360},80%,65%)` };
    const peers = new Map(), layer = $('cursors');
    const refresh = () => ($('peers').textContent = '● ' + (peers.size + 1));
    ch.onmessage = ({ data: m }) => {
      if (m.t === 'cur') {
        let p = peers.get(m.id);
        if (!p) { p = { el: h('div', { class: 'cursor', style: { background: m.color } }, m.name) }; layer.append(p.el); peers.set(m.id, p); refresh(); }
        p.seen = Date.now(); p.el.style.left = m.x * S.view.z + S.view.x + 'px'; p.el.style.top = m.y * S.view.z + S.view.y + 'px';
      } else if (m.t === 'win') {
        const w = S.windows.find((x) => x.id === m.id); if (w && !w.max) { w.x = m.x; w.y = m.y; const el = document.querySelector(`[data-id="${m.id}"]`); if (el) { el.style.left = m.x + 'px'; el.style.top = m.y + 'px'; } }
      }
    };
    let last = 0;
    $('viewport').addEventListener('pointermove', (e) => { const n = performance.now(); if (n - last < 40) return; last = n; const w = N.toWorld(e.clientX, e.clientY); ch.postMessage({ t: 'cur', ...me, x: w.x, y: w.y }); });
    N.on('win:move', (w) => ch.postMessage({ t: 'win', id: w.id, x: w.x, y: w.y }));
    setInterval(() => { peers.forEach((p, id) => { if (Date.now() - p.seen > 5000) { p.el.remove(); peers.delete(id); refresh(); } }); }, 2000);
  }

  /* Atajos: Ctrl+0 centra, Esc cierra el menú Inicio */
  addEventListener('keydown', (e) => { if (e.ctrlKey && e.key === '0') { e.preventDefault(); N.home(); } if (e.key === 'Escape') launcher.hidden = true; });

  /* PWA / offline total (solo bajo http/https) */
  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) navigator.serviceWorker.register('sw.js').catch(() => {});

  /* ---------- Sesión → encuesta única → bienvenida ---------- */
  await bootDone;
  const restored = await N.restoreSession();   // si ya habías entrado, no se vuelve a pedir el acceso
  if (!restored) { if (N.get('askPass')) await N.lock(); else N.emit('login', N.user()); }
  if (!N.get('surveyDone')) await N.survey();
  if (!restored) N.toast('BIENVENIDO A NEXUS OS', 'ok');
  if (N.justCreated) { N.justCreated = false; N.showWelcome(); }   // el mensaje informativo solo sale al crear una cuenta
})();
