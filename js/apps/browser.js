/* Módulo — Navegador: abre cualquier URL dentro de una ventana de NEXUS OS.
   Modo "Seguro" (por defecto): las páginas pasan por el proxy de server.py, que quita los bloqueos de incrustación
   y las aísla en un origen separado (no pueden leer tus datos de NEXUS). Modo "Directo": iframe normal, solo
   funciona con sitios que permiten ser incrustados. Navegación, historial, marcadores y búsqueda incluidos. */
(function () {
  const N = window.NEXUS, h = N.h;
  const SITES = [
    ['Wikipedia', '📚', 'https://es.wikipedia.org/', 'Enciclopedia libre'], ['MDN Web Docs', '🦊', 'https://developer.mozilla.org/es/', 'HTML, CSS y JavaScript'],
    ['Python Docs', '🐍', 'https://docs.python.org/es/3/', 'Documentación oficial'], ['cppreference', '⚙', 'https://en.cppreference.com/w/', 'Referencia de C++'],
    ['Arduino Docs', '🔌', 'https://docs.arduino.cc/', 'Guías y referencia'], ['W3Schools', '🎓', 'https://www.w3schools.com/', 'Tutoriales web'],
    ['freeCodeCamp', '🔥', 'https://www.freecodecamp.org/espanol/news/', 'Artículos de programación'], ['Hacker News', '📰', 'https://news.ycombinator.com/', 'Noticias tecnológicas'],
    ['Página de prueba', '🧪', 'https://example.com/', 'Para verificar el proxy'],
  ];
  const isHttp = (u) => /^https?:\/\//i.test(u);
  function toUrl(s) {
    s = s.trim(); if (!s) return '';
    if (isHttp(s)) return s;
    if (/^(\d{1,3}\.){3}\d{1,3}(:\d+)?([/?#].*)?$/.test(s) || /^localhost(:\d+)?([/?#].*)?$/i.test(s) || /^\[[0-9a-f:]+\](:\d+)?([/?#].*)?$/i.test(s)) return 'http://' + s;   // IP o localhost: http por defecto
    if (!/\s/.test(s) && /^[\w-]+(\.[\w-]+)+(:\d+)?([/?#].*)?$/.test(s)) return 'https://' + s;
    return 'https://www.bing.com/search?q=' + encodeURIComponent(s);
  }
  const hostOf = (u) => { try { return new URL(u).hostname; } catch (e) { return ''; } };

  N.registerApp('browser', {
    title: 'Navegador', icon: '🌐', desc: 'Abre cualquier URL dentro de NEXUS', w: 980, h: 660,
    init: () => ({ url: '', hist: [], idx: -1, mode: 'proxy', marks: [{ title: 'MDN', url: 'https://developer.mozilla.org/es/' }, { title: 'Python', url: 'https://docs.python.org/es/3/' }] }),
    mount(root, ctx) {
      const d = ctx.data, py = N.py; d.marks ||= []; d.hist ||= []; d.mode ||= 'proxy';
      d.log ||= d.hist.map((u) => ({ url: u, title: '', t: Date.now() })); d.hv ||= { x: 40, y: 40, z: 1 };
      root.classList.add('app');
      let frame = null, title = '', loadTimer = null, online = false;

      const urlIn = h('input', { class: 'br-url', placeholder: 'Escribe una URL o busca en la web…', spellcheck: 'false', onkeydown: (e) => { if (e.key === 'Enter') go(toUrl(e.target.value)); if (e.key === 'Escape') e.target.value = d.url; }, onfocus: (e) => e.target.select() });
      const bar = h('i'), prog = h('div', { class: 'br-prog' }, bar);
      const back = h('button', { class: 'btn', title: 'Atrás (Alt+←)', onclick: () => step(-1) }, '◀'), fwd = h('button', { class: 'btn', title: 'Adelante', onclick: () => step(1) }, '▶');
      const star = h('button', { class: 'btn', title: 'Añadir a marcadores', onclick: toggleMark }, '☆');
      const modeSeg = h('div', { class: 'seg', title: 'Seguro: usa el proxy de Python · Directo: iframe normal' });
      const marksBar = h('div', { class: 'br-marks' });
      const notice = h('div', { class: 'br-notice', hidden: true });
      const stage = h('div', { class: 'br-stage' });
      const status = h('div', { class: 'statusbar' });

      const localBtn = h('button', { class: 'btn', title: 'Acceso a direcciones IP de tu red local (192.168.x.x, localhost…)', onclick: toggleLocal }, '🏠');
      const histEl = h('div', { class: 'br-hist', hidden: true });
      root.append(h('div', { class: 'toolbar' }, back, fwd, h('button', { class: 'btn', title: 'Recargar', onclick: () => d.url && go(d.url, false) }, '⟳'), h('button', { class: 'btn', title: 'Inicio', onclick: home }, '⌂'), urlIn, star, modeSeg,
        h('button', { class: 'btn', title: 'Historial en lienzo infinito', onclick: () => (histEl.hidden ? openHist() : closeHist()) }, '🕘'),
        h('button', { class: 'btn', title: 'Abrir esta página en una ventana nueva de NEXUS (también: Ctrl+clic en un enlace)', onclick: () => d.url && newWin(d.url) }, '⧉'),
        h('button', { class: 'btn', title: 'Borrar las cookies del navegador (cierra tus sesiones)', onclick: clearCookies }, '🍪'),
        localBtn, h('button', { class: 'btn', title: 'Abrir esta URL en Google Chrome', onclick: openExternal }, '↗')), prog, marksBar, notice, h('div', { class: 'br-wrap' }, stage, histEl), status);

      /* ---------- historial: lienzo infinito de tarjetas (arrastrar fondo = mover, rueda = zoom, tarjeta = abrir) ---------- */
      const NS = 'http://www.w3.org/2000/svg', hv = d.hv, CW = 210, CH = 104;
      const bhView = h('div', { class: 'bh-view' }), bhWorld = h('div', { class: 'bh-world' }), bhSvg = document.createElementNS(NS, 'svg');
      bhSvg.setAttribute('class', 'bh-svg');
      bhSvg.innerHTML = '<defs><marker id="bha" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0L10,5L0,10z" fill="currentColor"/></marker></defs>';
      bhWorld.append(bhSvg); bhView.append(bhWorld);
      const bhQ = h('input', { class: 'bh-q', placeholder: 'Filtrar historial…', oninput: () => drawHist() }), bhCount = h('small', {});
      histEl.append(bhView, h('div', { class: 'bh-bar' }, h('b', {}, '🕘 HISTORIAL'), bhQ, bhCount,
        h('button', { class: 'btn', title: 'Ordenar en serpiente y encuadrar', onclick: () => { d.log.forEach((e, i) => Object.assign(e, autoPos(i))); drawHist(); fit(); ctx.save(); } }, 'Ordenar'),
        h('button', { class: 'btn', onclick: fit }, 'Encuadrar'),
        h('button', { class: 'btn', onclick: () => { if (d.log.length && confirm('¿Borrar todo el historial?')) { d.log = []; drawHist(); ctx.save(); } } }, 'Borrar'),
        h('button', { class: 'btn', onclick: closeHist }, '✕')));
      let cards = new Map();
      const hue = (s) => { let n = 0; for (const c of s) n = (n * 31 + c.charCodeAt(0)) >>> 0; return 'hsl(' + (n % 360) + ',70%,55%)'; };
      const ago = (t) => { const m = Math.round((Date.now() - t) / 6e4); return m < 1 ? 'ahora' : m < 60 ? 'hace ' + m + ' min' : m < 1440 ? 'hace ' + Math.round(m / 60) + ' h' : 'hace ' + Math.round(m / 1440) + ' d'; };
      const autoPos = (i) => { const col = i % 4, row = Math.floor(i / 4); return { x: (row % 2 ? 3 - col : col) * 260, y: row * 170 }; };
      const bhApply = () => { bhWorld.style.transform = `translate(${hv.x}px,${hv.y}px) scale(${hv.z})`; bhView.style.backgroundSize = 28 * hv.z + 'px ' + 28 * hv.z + 'px'; bhView.style.backgroundPosition = hv.x + 'px ' + hv.y + 'px'; };
      function fit() {
        if (!d.log.length) { Object.assign(hv, { x: 40, y: 40, z: 1 }); return bhApply(); }
        const x0 = Math.min(...d.log.map((e) => e.x)), y0 = Math.min(...d.log.map((e) => e.y)), x1 = Math.max(...d.log.map((e) => e.x)) + CW, y1 = Math.max(...d.log.map((e) => e.y)) + CH;
        const W = bhView.clientWidth || 700, H = bhView.clientHeight || 400, z = Math.max(0.25, Math.min(1.2, Math.min((W - 80) / (x1 - x0), (H - 120) / (y1 - y0))));
        Object.assign(hv, { z, x: (W - (x1 - x0) * z) / 2 - x0 * z, y: (H - (y1 - y0) * z) / 2 - y0 * z + 20 }); bhApply(); ctx.save();
      }
      function links() {
        bhSvg.querySelectorAll('path.l').forEach((p) => p.remove());
        for (let i = 0; i < d.log.length - 1; i++) {
          const a = d.log[i], b = d.log[i + 1]; if (!cards.has(a) || !cards.has(b)) continue;
          const dx = b.x - a.x, dy = b.y - a.y; let p1, p2, c1, c2;
          if (Math.abs(dx) >= Math.abs(dy)) { const s = dx >= 0 ? 1 : -1; p1 = [a.x + (s > 0 ? CW : 0), a.y + CH / 2]; p2 = [b.x + (s > 0 ? 0 : CW), b.y + CH / 2]; const k = Math.max(40, Math.abs(p2[0] - p1[0]) / 2); c1 = [p1[0] + s * k, p1[1]]; c2 = [p2[0] - s * k, p2[1]]; }
          else { const s = dy >= 0 ? 1 : -1; p1 = [a.x + CW / 2, a.y + (s > 0 ? CH : 0)]; p2 = [b.x + CW / 2, b.y + (s > 0 ? 0 : CH)]; const k = Math.max(40, Math.abs(p2[1] - p1[1]) / 2); c1 = [p1[0], p1[1] + s * k]; c2 = [p2[0], p2[1] - s * k]; }
          const p = document.createElementNS(NS, 'path'); p.setAttribute('class', 'l'); p.setAttribute('d', `M${p1} C${c1} ${c2} ${p2}`); p.setAttribute('marker-end', 'url(#bha)'); bhSvg.append(p);
        }
      }
      function cardDrag(c, e) {
        c.addEventListener('pointerdown', (ev) => {
          if (ev.button !== 0 || ev.target.closest('button')) return;
          ev.stopPropagation(); c.setPointerCapture(ev.pointerId); let lx = ev.clientX, ly = ev.clientY, moved = 0;
          const mv = (m) => { moved += Math.abs(m.clientX - lx) + Math.abs(m.clientY - ly); if (moved > 6) { e.x += (m.clientX - lx) / (hv.z * N.state.view.z); e.y += (m.clientY - ly) / (hv.z * N.state.view.z); c.style.left = e.x + 'px'; c.style.top = e.y + 'px'; links(); } lx = m.clientX; ly = m.clientY; };
          const up = () => { c.removeEventListener('pointermove', mv); c.removeEventListener('pointerup', up); if (moved <= 6) { closeHist(); go(e.url); } else ctx.save(); };
          c.addEventListener('pointermove', mv); c.addEventListener('pointerup', up);
        });
      }
      function drawHist() {
        const q = bhQ.value.trim().toLowerCase(); cards = new Map(); bhWorld.querySelectorAll('.bh-card,.bh-empty').forEach((n) => n.remove());
        d.log.forEach((e, i) => {
          if (e.x === undefined) Object.assign(e, autoPos(i));
          const hit = !q || (e.url + ' ' + e.title).toLowerCase().includes(q), host = hostOf(e.url);
          const c = h('div', { class: 'bh-card' + (e.url === d.url ? ' cur' : '') + (hit ? '' : ' dim'), style: { left: e.x + 'px', top: e.y + 'px' } },
            h('div', { class: 'bh-top' }, h('span', { class: 'bh-fav', style: { background: hue(host) } }, (host.replace(/^www\./, '')[0] || '?').toUpperCase()), h('b', {}, e.title || host),
              h('button', { class: 'bh-x', title: 'Quitar del historial', onclick: (ev) => { ev.stopPropagation(); d.log.splice(i, 1); drawHist(); ctx.save(); } }, '✕')),
            h('small', { class: 'bh-url' }, e.url.replace(/^https?:\/\//, '')), h('small', { class: 'bh-t' }, '#' + (i + 1) + ' · ' + ago(e.t)));
          cardDrag(c, e); bhWorld.append(c); cards.set(e, c);
        });
        if (!d.log.length) bhWorld.append(h('div', { class: 'bh-empty' }, 'Aún no has visitado páginas. Ábrelas y aparecerán aquí como tarjetas.'));
        links(); bhCount.textContent = d.log.length + ' páginas'; bhApply();
      }
      bhView.addEventListener('pointerdown', (ev) => {
        if (ev.button !== 0 || ev.target.closest('.bh-card')) return; ev.stopPropagation(); bhView.setPointerCapture(ev.pointerId); let lx = ev.clientX, ly = ev.clientY;
        const mv = (m) => { hv.x += (m.clientX - lx) / N.state.view.z; hv.y += (m.clientY - ly) / N.state.view.z; lx = m.clientX; ly = m.clientY; bhApply(); };
        const up = () => { bhView.removeEventListener('pointermove', mv); bhView.removeEventListener('pointerup', up); ctx.save(); };
        bhView.addEventListener('pointermove', mv); bhView.addEventListener('pointerup', up);
      });
      bhView.addEventListener('wheel', (ev) => {
        ev.preventDefault(); ev.stopPropagation(); const r = bhView.getBoundingClientRect(), k0 = N.state.view.z, px = (ev.clientX - r.left) / k0, py = (ev.clientY - r.top) / k0;
        const z = Math.max(0.25, Math.min(2, hv.z * Math.exp(-ev.deltaY * 0.0015))), k = z / hv.z; hv.x = px - (px - hv.x) * k; hv.y = py - (py - hv.y) * k; hv.z = z; bhApply(); ctx.save();
      }, { passive: false });
      function openHist() { histEl.hidden = false; bhQ.value = ''; drawHist(); }
      function closeHist() { histEl.hidden = true; }

      /* ---------- estado y dibujo ---------- */
      function drawMode() { modeSeg.replaceChildren(...[['proxy', '🔒 Seguro'], ['direct', 'Directo']].map(([k, l]) => h('button', { class: d.mode === k ? 'on' : '', onclick: () => { d.mode = k; ctx.save(); drawMode(); if (d.url) go(d.url, false); } }, l))); }
      function drawMarks() {
        marksBar.replaceChildren(...d.marks.map((m, i) => h('span', { class: 'chip', title: m.url, onclick: () => go(m.url), oncontextmenu: (e) => { e.preventDefault(); d.marks.splice(i, 1); drawMarks(); ctx.save(); N.toast('Marcador eliminado'); } }, '★ ' + m.title)), d.marks.length ? h('small', { style: { color: 'var(--muted)' } }, 'clic derecho = quitar') : h('small', { style: { color: 'var(--muted)' } }, 'Sin marcadores: pulsa ☆'));
        star.textContent = d.marks.some((m) => m.url === d.url) ? '★' : '☆';
      }
      function drawStatus() {
        status.replaceChildren(h('span', {}, d.url ? h('b', {}, title || hostOf(d.url)) : 'Inicio'), d.url ? h('span', {}, hostOf(d.url)) : '', h('span', { style: { marginLeft: 'auto' } }, d.mode === 'proxy' ? ((isChrome ? '' : '⚠ No es Chrome · ') + (online ? (py.local ? '🔓 Proxy activo · red local permitida' : '🔒 Proxy Python activo · páginas aisladas · cookies y formularios') : '○ Proxy apagado')) : 'Modo directo (solo sitios que permiten incrustarse)'));
        back.disabled = d.idx <= 0; fwd.disabled = d.idx >= d.hist.length - 1; back.style.opacity = back.disabled ? 0.4 : 1; fwd.style.opacity = fwd.disabled ? 0.4 : 1;
      }
      function progress(on) { clearTimeout(loadTimer); bar.style.transition = 'none'; if (on) { bar.style.width = '8%'; requestAnimationFrame(() => { bar.style.transition = 'width 8s cubic-bezier(.1,.7,.2,1)'; bar.style.width = '88%'; }); } else { bar.style.transition = 'width .25s'; bar.style.width = '100%'; loadTimer = setTimeout(() => { bar.style.transition = 'none'; bar.style.width = '0'; }, 400); } }

      function home() {
        d.url = ''; urlIn.value = ''; title = ''; frame = null; progress(false);
        const search = h('input', { class: 'br-search', placeholder: 'Busca en la web o escribe una dirección…', onkeydown: (e) => { if (e.key === 'Enter' && e.target.value.trim()) go(toUrl(e.target.value)); } });
        stage.replaceChildren(h('div', { class: 'br-start' }, h('img', { src: 'assets/logo.svg', width: 72, height: 72, alt: '' }), h('h2', {}, 'NAVEGADOR NEXUS'), h('p', {}, 'Cualquier página, dentro de tu escritorio. Escribe una URL arriba o busca aquí.'), search,
          h('div', { class: 'br-grid' }, SITES.map(([n, ic, u, desc]) => h('div', { class: 'br-card', onclick: () => go(u) }, h('span', { class: 'br-ic' }, ic), h('div', {}, h('b', {}, n), h('small', {}, desc)))))));
        drawStatus(); drawMarks(); ctx.save();
      }

      function makeFrame() {
        const f = h('iframe', { class: 'br-frame', referrerpolicy: 'no-referrer', allow: 'fullscreen', sandbox: d.mode === 'proxy' ? 'allow-scripts allow-forms allow-popups' : 'allow-scripts allow-forms allow-popups allow-same-origin' });
        f.addEventListener('load', () => progress(false)); return f;
      }
      async function go(url, push = true) {
        if (!url) return;
        if (!isHttp(url)) return N.toast('Solo se pueden abrir direcciones http:// o https://', 'warn');
        online = await py.ping();
        if (d.mode === 'proxy' && !online) {
          notice.hidden = false; notice.textContent = '⚠ El servidor Python está apagado, así que el modo Seguro no está disponible. Ejecuta iniciar.bat. Mientras tanto se intenta el modo directo: muchos sitios lo bloquean.';
        } else notice.hidden = true;
        const direct = d.mode === 'direct' || !online;
        if (push) { d.hist = d.hist.slice(0, d.idx + 1); if (d.hist[d.hist.length - 1] !== url) d.hist.push(url); if (d.hist.length > 60) d.hist.shift(); d.idx = d.hist.length - 1; d.log.push({ url, title: '', t: Date.now() }); if (d.log.length > 200) d.log.shift(); }
        d.url = url; urlIn.value = url; title = ''; progress(true);
        if (!frame || !frame.isConnected || frame.getAttribute('sandbox').includes('same-origin') !== direct) { frame = makeFrame(); frame.setAttribute('sandbox', direct ? 'allow-scripts allow-forms allow-popups allow-same-origin' : 'allow-scripts allow-forms allow-popups'); stage.replaceChildren(frame); }
        frame.src = direct ? url : py.base + '/proxy?k=' + encodeURIComponent(py.token || '') + '&u=' + encodeURIComponent(url);
        drawStatus(); drawMarks(); ctx.save();
      }
      const isChrome = !!navigator.userAgentData?.brands?.some((x) => /Chrome|Chromium/.test(x.brand)) || /Chrome\//.test(navigator.userAgent);
      function drawLocal() { localBtn.classList.toggle('on', !!py.local); localBtn.textContent = py.local ? '🏠 ON' : '🏠'; }
      async function toggleLocal() {
        if (!(await py.ping())) return N.toast('Se necesita el servidor Python (iniciar.bat)', 'warn');
        if (!py.local && !confirm('¿Permitir que el navegador de NEXUS abra direcciones IP de tu red local (router, 192.168.x.x, servidores en localhost)?\n\nActívalo solo si confías en las páginas que vas a visitar. Se desactiva al cerrar el servidor.')) return;
        try { py.local = (await py.call('/api/local', { token: py.token, enabled: !py.local })).local; N.toast(py.local ? 'Red local permitida' : 'Red local bloqueada', py.local ? 'warn' : 'ok'); } catch (e) { N.toast('No se pudo cambiar', 'bad'); }
        drawLocal(); drawStatus();
      }
      async function openExternal() {
        if (!d.url) return N.toast('Abre una página primero');
        if (await py.ping()) { try { const r = await py.call('/api/open-chrome', { token: py.token, url: d.url }); return N.toast(r.chrome ? 'Abierta en Google Chrome' : 'Chrome no encontrado: abierta en tu navegador', r.chrome ? 'ok' : 'warn'); } catch (e) {} }
        window.open(d.url, '_blank', 'noopener');
      }
      function newWin(url) {
        const w = N.state.windows.find((x) => x.id === ctx.win.id) || ctx.win;
        N.createWindow('browser', { x: w.x + 40, y: w.y + 40, data: Object.assign(N.apps.browser.init(), { url, mode: d.mode, marks: d.marks }) });
      }
      async function clearCookies() {
        if (!(await py.ping())) return N.toast('El servidor Python está apagado', 'warn');
        try { const r = await py.call('/api/cookies', { token: py.token }); N.toast(r.cleared + ' cookies borradas', 'ok'); } catch (e) { N.toast('No se pudieron borrar las cookies', 'bad'); }
      }
      function step(dir) { const i = d.idx + dir; if (i < 0 || i >= d.hist.length) return; d.idx = i; go(d.hist[i], false); }
      function toggleMark() {
        if (!d.url) return N.toast('Abre una página primero');
        const i = d.marks.findIndex((m) => m.url === d.url);
        if (i >= 0) d.marks.splice(i, 1); else d.marks.push({ title: (title || hostOf(d.url)).slice(0, 22), url: d.url });
        drawMarks(); ctx.save();
      }

      /* mensajes desde la página proxeada (clics en enlaces, título, redirecciones) */
      const onMsg = (e) => {
        if (!frame || e.source !== frame.contentWindow || !e.data?.nxb) return;
        const m = e.data;
        if (m.t === 'nav' && typeof m.url === 'string') go(m.url);
        else if (m.t === 'new' && typeof m.url === 'string' && isHttp(m.url)) newWin(m.url);
        else if (m.t === 'warn') N.toast(String(m.msg || '').slice(0, 120), 'warn');
        else if (m.t === 'loaded') {
          title = String(m.title || '').slice(0, 80);
          if (m.post && isHttp(m.url) && m.url !== d.url) { d.hist = d.hist.slice(0, d.idx + 1); d.hist.push(m.url); d.idx = d.hist.length - 1; d.log.push({ url: m.url, title: '', t: Date.now() }); d.url = m.url; urlIn.value = m.url; }
          const ent = [...d.log].reverse().find((x) => x.url === d.url); if (ent && title) ent.title = title;
          if (typeof m.url === 'string' && isHttp(m.url) && m.url !== d.url) { if (ent) ent.url = m.url; d.url = m.url; d.hist[d.idx] = m.url; urlIn.value = m.url; ctx.save(); }
          drawStatus(); drawMarks();
        }
      };
      addEventListener('message', onMsg); ctx.onCleanup(() => removeEventListener('message', onMsg));
      root.addEventListener('keydown', (e) => { if (e.altKey && e.key === 'ArrowLeft') step(-1); if (e.altKey && e.key === 'ArrowRight') step(1); if (e.ctrlKey && e.key.toLowerCase() === 'l') { e.preventDefault(); urlIn.focus(); } });

      drawMode(); drawMarks(); py.ping().then((ok) => { online = ok; drawLocal(); drawStatus(); });
      if (d.url) go(d.url, false); else home();
    },
  });
})();
