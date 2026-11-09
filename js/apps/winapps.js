/* Mis programas: añade a NEXUS OS programas, archivos, carpetas y sitios web de tu Windows.
   Los programas se abren con el servidor Python (el navegador no puede ejecutarlos). Se agregan eligiéndolos en el menú Inicio
   de Windows o con un diálogo nativo: la página nunca envía rutas al servidor, así que una web no puede ejecutar nada. */
(function () {
  const N = window.NEXUS, h = N.h, py = N.py;
  const list = () => (N.state.myapps ||= []);
  const ICONS = [[/chrome|edge|firefox|opera|brave/i, '🌐'], [/word|writer|docs/i, '📝'], [/excel|calc|sheet/i, '📊'], [/powerpoint|impress/i, '📽'], [/code|studio|pycharm|idle|python|node|git|terminal|powershell|cmd/i, '💻'], [/spotify|music|vlc|media|player|video/i, '🎵'], [/photo|paint|gimp|figma|canva|adobe|photoshop/i, '🎨'], [/steam|game|epic|xbox/i, '🎮'], [/whatsapp|telegram|discord|teams|zoom|skype|outlook|mail/i, '💬'], [/calc/i, '🧮'], [/notepad|bloc|notes/i, '🗒'], [/explorer|archivos/i, '📁']];
  const iconFor = (name, kind) => (kind === 'folder' ? '📁' : kind === 'url' ? '🌐' : (ICONS.find(([r]) => r.test(name)) || [0, kind === 'file' ? '📄' : '🚀'])[1]);
  const KIND = { app: 'Programa', file: 'Archivo', folder: 'Carpeta', url: 'Sitio web' };
  const isServed = () => location.origin === py.base;

  N.myApps = list;
  N.addMyApp = (e) => { const l = list(); const i = l.findIndex((x) => x.id === e.id); if (i >= 0) l[i] = { ...l[i], ...e }; else l.push({ pinned: true, icon: iconFor(e.name, e.kind), ...e }); N.save(); N.emit('desktop'); };
  N.launchMyApp = async (e) => {
    if (e.kind === 'url') return N.createWindow('browser', { data: Object.assign(N.apps.browser.init(), { url: e.url }) });
    if (!(await py.ping())) return N.toast('El servidor Python está apagado. Ejecuta iniciar.bat para abrir programas de Windows.', 'warn');
    try { await py.call('/api/winapps/launch', { token: py.token, id: e.id }); N.toast('Abriendo ' + e.name + '…', 'ok'); } catch (err) { N.toast(err.message, 'bad'); }
  };

  N.registerApp('winapps', {
    title: 'Mis programas', icon: '🧩', desc: 'Añade programas, carpetas y sitios de Windows', w: 760, h: 600, free: true,
    init: () => ({ tab: 'mine' }),
    mount(root, ctx) {
      const d = ctx.data; root.classList.add('app', 'wa');
      const bar = h('div', { class: 'toolbar' }), body = h('div', { class: 'scroll wa-body' }), status = h('div', { class: 'statusbar' });
      root.append(bar, body, status);
      let scan = null, q = '';

      const call = async (act, extra = {}) => {
        if (!isServed()) throw new Error('Abre NEXUS con iniciar.bat (http://127.0.0.1:8765) para usar esta función');
        if (!(await py.ping())) throw new Error('El servidor Python está apagado (ejecuta iniciar.bat)');
        return py.call('/api/winapps/' + act, { token: py.token, ...extra });
      };
      async function pick(kind) {
        status.textContent = 'Elige el ' + (kind === 'folder' ? 'carpeta' : 'archivo') + ' en la ventana de Windows…';
        try { const r = await call('add', { from: 'pick', kind }); if (!r.cancelled) { N.addMyApp({ id: r.id, name: r.name, kind: r.kind }); N.toast('Añadido: ' + r.name, 'ok'); } } catch (e) { N.toast(e.message, 'bad'); }
        draw();
      }
      async function addScanned(a) { try { const r = await call('add', { from: 'scan', id: a.id }); N.addMyApp({ id: r.id, name: r.name, kind: r.kind }); N.toast('Añadido: ' + r.name, 'ok'); } catch (e) { N.toast(e.message, 'bad'); } draw(); }
      function addUrl() {
        let u = prompt('Dirección del sitio web (ej: https://es.wikipedia.org):'); if (!u) return;
        if (!/^https?:\/\//i.test(u)) u = 'https://' + u;
        try { const x = new URL(u); N.addMyApp({ id: 'u' + Date.now().toString(36), name: (prompt('Nombre del acceso directo:', x.hostname.replace(/^www\./, '')) || x.hostname).slice(0, 40), kind: 'url', url: x.href }); draw(); } catch (e) { N.toast('Dirección no válida', 'bad'); }
      }
      async function loadScan() { status.textContent = 'Buscando programas instalados…'; try { scan = (await call('scan')).apps; } catch (e) { N.toast(e.message, 'bad'); scan = []; } d.tab = 'scan'; draw(); }
      async function remove(e) {
        if (e.kind !== 'url') { try { await call('remove', { id: e.id }); } catch (err) { /* si el servidor no está, se quita solo de la lista visible */ } }
        N.state.myapps = list().filter((x) => x.id !== e.id); N.save(); N.emit('desktop'); draw();
      }

      function card(e) {
        return h('div', { class: 'wa-card' }, h('span', { class: 'wa-ic' }, e.icon || iconFor(e.name, e.kind)), h('div', { class: 'wa-t' }, h('b', {}, e.name), h('small', {}, KIND[e.kind] + (e.url ? ' · ' + e.url.replace(/^https?:\/\//, '') : ''))),
          h('button', { class: 'btn primary', onclick: () => N.launchMyApp(e) }, 'Abrir'),
          h('button', { class: 'btn' + (e.pinned ? ' on' : ''), title: 'Mostrar en el escritorio', onclick: () => { e.pinned = !e.pinned; N.save(); N.emit('desktop'); draw(); } }, e.pinned ? '📌 Anclado' : '📌 Anclar'),
          h('button', { class: 'btn danger', title: 'Quitar de NEXUS (no borra el programa)', onclick: () => remove(e) }, '✕'));
      }
      function draw() {
        bar.replaceChildren(h('div', { class: 'seg' }, [['mine', 'Mis programas'], ['scan', 'Programas de Windows']].map(([k, l]) => h('button', { class: d.tab === k ? 'on' : '', onclick: () => { if (k === 'scan' && !scan) return loadScan(); d.tab = k; draw(); } }, l))), h('span', { style: { flex: 1 } }),
          h('button', { class: 'btn', onclick: () => pick('file') }, '＋ Programa o archivo'), h('button', { class: 'btn', onclick: () => pick('folder') }, '＋ Carpeta'), h('button', { class: 'btn', onclick: addUrl }, '＋ Sitio web'));
        if (d.tab === 'scan') {
          const rows = (scan || []).filter((a) => a.name.toLowerCase().includes(q.toLowerCase()));
          body.replaceChildren(h('input', { class: 'wa-q', placeholder: 'Buscar entre ' + (scan || []).length + ' programas instalados…', value: q, oninput: (e) => { q = e.target.value; const pos = e.target.selectionStart; draw(); const i = body.querySelector('.wa-q'); i.focus(); i.setSelectionRange(pos, pos); } }),
            ...(rows.length ? rows.slice(0, 200).map((a) => { const have = list().some((x) => x.id === a.id); return h('div', { class: 'wa-card' }, h('span', { class: 'wa-ic' }, iconFor(a.name, 'app')), h('div', { class: 'wa-t' }, h('b', {}, a.name), h('small', {}, 'Menú Inicio de Windows')), h('button', { class: 'btn' + (have ? '' : ' primary'), disabled: have, onclick: () => addScanned(a) }, have ? '✓ Añadido' : 'Añadir')); }) : [h('div', { class: 'empty' }, scan && !scan.length ? 'No se encontraron programas (¿servidor apagado o no es Windows?)' : 'Sin resultados')]));
          status.textContent = 'Se añaden eligiéndolos aquí o con un diálogo nativo: NEXUS nunca ejecuta rutas enviadas por una página.';
        } else {
          body.replaceChildren(...(list().length ? list().map(card) : [h('div', { class: 'wa-empty' }, h('div', { class: 'wa-big' }, '🧩'), h('h3', {}, 'Aún no has añadido nada'), h('p', {}, 'Trae a NEXUS OS los programas, carpetas y sitios que usas en Windows. Aparecerán en el escritorio y en el menú Inicio.'), h('button', { class: 'btn primary', onclick: loadScan }, 'Ver programas de Windows'))]));
          status.textContent = list().length + ' elementos · ' + (isServed() ? 'los programas se abren con el servidor Python' : '⚠ abre NEXUS con iniciar.bat para lanzar programas');
        }
      }
      draw();
    },
  });
})();
