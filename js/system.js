/* NEXUS OS — sistema: configuración, cuenta de administrador (inicio de sesión), bloqueo y encuesta de personalización.
   Nota honesta: la cuenta es un bloqueo LOCAL de la interfaz (la contraseña se guarda con hash PBKDF2 en este navegador).
   Impide el uso casual, pero no protege los datos frente a alguien con acceso a tu equipo y al navegador. */
(function () {
  const N = window.NEXUS, h = N.h, S = N.state;
  const DEF_ACCENT = '#ff2a3d';
  const DEFAULTS = { theme: 'ultron', accent: DEF_ACCENT, seed: 7, wall: 'live', cursor: true, wm: 'fixed', icons: true, perf: 'auto', welcome: true, askPass: true, name: 'anyelo', uses: [], pins: ['notes', 'ide', 'media', 'browser', 'learn', 'winapps', 'settings'], surveyDone: false };
  const cfg = () => (S.settings ||= {}), get = (k) => (cfg()[k] ?? DEFAULTS[k]);
  N.cfg = cfg; N.get = get; N.DEFAULTS = DEFAULTS;
  N.set = (patch) => { Object.assign(cfg(), patch); N.applySettings(); N.save(); };

  /* ---------- color ---------- */
  const hex2rgb = (x) => [1, 3, 5].map((i) => parseInt(x.slice(i, i + 2), 16));
  const rgb2hsl = ([r, g, b]) => { r /= 255; g /= 255; b /= 255; const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, d = mx - mn; let hh = 0, s = 0; if (d) { s = d / (1 - Math.abs(2 * l - 1)); hh = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; } return [(hh * 60 + 360) % 360, s, l]; };
  const hsl = (hh, s, l) => { const k = (n) => (n + hh / 30) % 12, a = s * Math.min(l, 1 - l), f = (n) => l - a * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1)); return [f(0) * 255, f(8) * 255, f(4) * 255].map(Math.round); };
  const toHex = (c) => '#' + c.map((v) => Math.max(0, Math.min(255, v)).toString(16).padStart(2, '0')).join('');
  const rgba = (c, a) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;
  function accentVars(hex, surfaces) {
    const [H, S0, L0] = rgb2hsl(hex2rgb(hex)), Sx = Math.max(S0, 0.6), acc = hsl(H, Sx, Math.min(0.62, Math.max(0.5, L0))), acc2 = hsl(H + 24, Sx, 0.55);
    const v = { '--accent': toHex(acc), '--accent2': toHex(acc2), '--border': rgba(acc, 0.32), '--grid': rgba(acc, 0.2), '--star': acc.map((c) => Math.round(c * 0.75 + 64)).join(','), '--mesh1': rgba(acc, 0.16), '--mesh2': rgba(acc2, 0.1), '--mesh3': rgba(acc, 0.08) };
    if (surfaces) Object.assign(v, { '--bg': toHex(hsl(H, 0.35, 0.03)), '--panel': toHex(hsl(H, 0.28, 0.06)), '--panel2': toHex(hsl(H, 0.24, 0.09)), '--glass': rgba(hsl(H, 0.35, 0.045), 0.9), '--text': toHex(hsl(H, 0.2, 0.93)), '--muted': toHex(hsl(H, 0.14, 0.64)) });
    return v;
  }
  N.accentVars = accentVars;
  let applied = [];

  /* ---------- aplicar ajustes a toda la interfaz ---------- */
  N.applySettings = function () {
    const root = document.documentElement, c = { ...DEFAULTS, ...cfg() };
    S.theme = c.theme; root.dataset.theme = c.theme;
    const prevWm = root.dataset.wm; root.dataset.wm = c.wm; root.dataset.icons = c.icons ? 'on' : 'off';
    applied.forEach((k) => root.style.removeProperty(k)); applied = [];
    if (c.accent.toLowerCase() !== DEF_ACCENT || c.theme !== 'ultron') {
      if (c.accent.toLowerCase() !== DEF_ACCENT) { const v = accentVars(c.accent, c.theme === 'ultron'); Object.entries(v).forEach(([k, val]) => { root.style.setProperty(k, val); applied.push(k); }); }
    }
    paintWall(c);
    if (N.setPerfMode && N.perfMode() !== c.perf) N.setPerfMode(c.perf);
    if (prevWm !== c.wm && N.applyWindowMode) N.applyWindowMode();
    N.emit('settings'); N.emit('desktop');
  };
  let wallToken = 0;
  const hueOf = (hex) => { const n = parseInt(hex.slice(1), 16), r = (n >> 16) / 255, g = ((n >> 8) & 255) / 255, b = (n & 255) / 255, mx = Math.max(r, g, b), d = mx - Math.min(r, g, b); if (!d) return 0; const h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; return (h * 60 + 360) % 360; };
  // sin servidor Python: se reutiliza el fondo 3D base girando su tono hacia el color elegido
  function wallFallback(c, on) {
    let el = document.getElementById('wallimg');
    if (!on) { if (el) el.style.display = 'none'; return; }
    if (!el) { el = document.createElement('div'); el.id = 'wallimg'; el.style.cssText = "position:fixed;inset:0;z-index:-1;background:url(assets/ultron-bg.jpg) center/cover no-repeat;pointer-events:none"; document.body.prepend(el); }
    el.style.display = ''; el.style.filter = `hue-rotate(${Math.round(hueOf(c.accent) - hueOf(DEF_ACCENT))}deg)`;
  }
  async function paintWall(c) {
    const b = document.body, tk = ++wallToken;
    wallFallback(c, false);
    const live = c.theme === 'ultron' && c.wall === 'live';
    if (N.holoWall) N.holoWall(live);
    if (live) { b.style.backgroundImage = 'none'; b.style.backgroundColor = 'var(--bg)'; return; }
    if (c.theme !== 'ultron') { b.style.backgroundImage = c.wall === 'solid' ? 'none' : ''; b.style.backgroundColor = ''; return; }
    if (c.wall === 'solid') { b.style.backgroundImage = 'none'; b.style.backgroundColor = 'var(--bg)'; return; }
    if (c.wall === '3d' && c.accent.toLowerCase() === DEF_ACCENT && c.seed === DEFAULTS.seed) { b.style.backgroundImage = ''; b.style.backgroundColor = ''; return; }
    b.style.backgroundColor = 'var(--bg)';
    b.style.backgroundImage = 'radial-gradient(ellipse at 80% 20%,color-mix(in srgb,var(--accent) 24%,transparent),transparent 60%),radial-gradient(ellipse at 10% 100%,color-mix(in srgb,var(--accent2) 14%,transparent),transparent 55%)';
    if (c.wall === '3d') { b.style.backgroundImage = 'none'; wallFallback(c, true); }
    try { if (await N.py.ping()) { const r = await N.py.call('/api/theme', { accent: c.accent, seed: c.seed, style: c.wall === 'hud' ? 'hud' : '3d' }); if (tk === wallToken) { wallFallback(c, false); b.style.backgroundImage = `url(${r.bg})`; } } } catch (e) { /* queda el degradado */ }
  }

  /* ---------- cuenta ---------- */
  const UK = 'nexus-user', enc = new TextEncoder();
  const b64 = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf))), unb64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
  async function kdf(pw, salt) {
    if (!crypto.subtle) { let x = 5381; for (const ch of salt + pw) x = ((x << 5) + x + ch.charCodeAt(0)) >>> 0; return 'x' + x; }
    const k = await crypto.subtle.importKey('raw', enc.encode(pw), 'PBKDF2', false, ['deriveBits']);
    return b64(await crypto.subtle.deriveBits({ name: 'PBKDF2', salt: unb64(salt), iterations: 100000, hash: 'SHA-256' }, k, 256));
  }
  let memUser = null;
  const readUser = () => { let u; try { u = JSON.parse(localStorage.getItem(UK) || 'null'); } catch (e) { u = memUser; } if (u && u.role === 'Administrador') u.role = 'Usuario'; return u; };
  const writeUser = (u) => { memUser = u; try { localStorage.setItem(UK, JSON.stringify(u)); } catch (e) {} };
  async function ensureUser() {
    let u = readUser();
    if (!u || !u.hash) { const salt = b64(crypto.getRandomValues(new Uint8Array(16))); u = { name: 'anyelo', role: 'Usuario', salt, hash: await kdf('123456789', salt) }; writeUser(u); }
    return u;
  }
  N.user = () => readUser() || { name: 'anyelo', role: 'Usuario' };
  N.changePassword = async (oldPw, newPw) => {
    const u = await ensureUser();
    if ((await kdf(oldPw, u.salt)) !== u.hash) throw new Error('La contraseña actual no es correcta');
    if (newPw.length < 6) throw new Error('La nueva contraseña debe tener al menos 6 caracteres');
    const salt = b64(crypto.getRandomValues(new Uint8Array(16))); writeUser({ ...u, salt, hash: await kdf(newPw, salt) });
  };

  /* ---------- la sesión permanece abierta al recargar la página ---------- */
  const SK = 'nexus-session';
  N.restoreSession = async () => {
    let s = null;
    try { s = JSON.parse(localStorage.getItem(SK) || 'null'); } catch (e) {}
    if (!s || !s.name) return false;
    if (s.created) { N.justCreated = true; try { localStorage.setItem(SK, JSON.stringify({ ...s, created: false })); } catch (e) {} }
    if (s.remote) {
      try {
        const sb = await N.cloud.client(), { data } = await sb.auth.getSession();
        if (!data.session) { localStorage.removeItem(SK); return false; }
      } catch (e) { /* sin internet: se conserva la sesión guardada */ }
      N.who = { name: s.name, role: 'Usuario', remote: true };
      N.emit('login', N.who); return true;
    }
    const u = await ensureUser();
    if (u.name.toLowerCase() !== String(s.name).toLowerCase()) { try { localStorage.removeItem(SK); } catch (e) {} return false; }
    N.who = null; N.emit('login', u); return true;
  };

  /* ---------- pantalla de inicio de sesión / bloqueo ---------- */
  let locked = null;
  N.lock = async function (opts = {}) {
    try { localStorage.removeItem(SK); } catch (e) {}
    if (locked) return locked;
    const user = await ensureUser();
    locked = new Promise((resolve) => {
      let fails = 0, until = 0, timer = null;
      const msg = h('div', { class: 'lk-msg', role: 'alert' }), t = h('div', { class: 'lk-time' }), dt = h('div', { class: 'lk-date' });
      const uIn = h('input', { class: 'lk-in', placeholder: 'Usuario', value: '', autocomplete: 'username', spellcheck: 'false' });
      const pIn = h('input', { class: 'lk-in', type: 'password', placeholder: 'Contraseña', autocomplete: 'current-password' });
      const eye = h('button', { type: 'button', class: 'lk-eye', title: 'Mostrar u ocultar', onclick: () => { pIn.type = pIn.type === 'password' ? 'text' : 'password'; } }, '👁');
      const go = h('button', { class: 'btn primary lk-go', type: 'submit' }, 'INICIAR SESIÓN');
      let signup = false;
      const p2 = h('input', { class: 'lk-in', type: 'password', placeholder: 'Repite la contraseña', autocomplete: 'new-password', style: { display: 'none' } });
      const mode = h('button', { type: 'button', class: 'lk-mode', onclick: () => setMode(!signup) }, 'Crear una cuenta');
      const setMode = (v) => { signup = v; p2.style.display = v ? '' : 'none'; go.textContent = v ? 'CREAR CUENTA' : 'INICIAR SESIÓN'; mode.textContent = v ? '← Ya tengo cuenta' : 'Crear una cuenta'; msg.textContent = ''; if (v) { uIn.value = ''; uIn.placeholder = 'Elige un usuario'; } else { uIn.value = ''; uIn.placeholder = 'Usuario'; } pIn.value = ''; p2.value = ''; };
      const card = h('form', { class: 'lk-card', autocomplete: 'on', onsubmit: submit }, h('div', { class: 'lk-av logo' }, h('img', { src: 'assets/logo.svg', alt: '' })), h('div', { class: 'lk-name' }, 'BIENVENIDO A NEXUS OS'), uIn, h('div', { class: 'lk-pw' }, pIn, eye), p2, msg, go, mode);
      const holoCv = h('canvas', { class: 'lk-holo' }), ai = h('div', { class: 'lk-ai' }); let hp = null, typer = null;
      const say = (text) => { clearInterval(typer); let i = 0; ai.textContent = ''; if (hp) hp.setLevel(0.8); typer = setInterval(() => { ai.textContent = text.slice(0, ++i); if (i >= text.length) { clearInterval(typer); if (hp) setTimeout(() => hp.setLevel(0.15), 250); } }, 24); };
      const ov = h('div', { id: 'lock' }, holoCv, h('div', { class: 'lk-clock' }, t, dt), ai, card, h('div', { class: 'lk-foot' }, h('b', {}, 'NEXUS OS'), ' · Las cuentas nuevas se guardan en la nube'));
      const tick = () => { const d = new Date(); t.textContent = d.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', hour12: false }); dt.textContent = d.toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' }); };
      tick(); const clk = setInterval(tick, 1000);
      async function submit(e) {
        e.preventDefault();
        if (Date.now() < until) return;
        const enter = (u, created) => { clearInterval(typer); ai.textContent = 'Acceso concedido. Bienvenido a NEXUS OS.'; if (hp) hp.setLevel(1); clearInterval(clk); clearInterval(timer); ov.classList.add('out'); setTimeout(() => ov.remove(), 700); locked = null; N.who = u.remote ? u : null; N.justCreated = !!created; try { localStorage.setItem(SK, JSON.stringify({ name: u.name, remote: !!u.remote, created: !!created })); } catch (e) {} if (N.keyFor({ name: u.name, remote: u.remote }) !== N.storeKey) { setTimeout(() => location.reload(), 700); return; } N.emit('login', u); resolve(u); };
        const typed = uIn.value.trim();
        if (signup) {
          if (pIn.value !== p2.value) { msg.textContent = 'Las contraseñas no coinciden.'; return; }
          go.disabled = true; msg.textContent = 'Creando cuenta…';
          try { return enter(await N.cloud.signUp(typed, pIn.value), true); } catch (err) { msg.textContent = err.message; return; } finally { go.disabled = false; }
        }
        const isLocal = typed.toLowerCase() === user.name.toLowerCase();
        const ok = isLocal && (await kdf(pIn.value, user.salt)) === user.hash;
        if (ok) return enter(user);
        if (!isLocal && typed && pIn.value) {
          go.disabled = true; msg.textContent = 'Comprobando…';
          try { return enter(await N.cloud.signIn(typed, pIn.value)); } catch (err) { msg.textContent = err.message; return; } finally { go.disabled = false; }
        }
        fails++; say('Credenciales no válidas. Inténtalo de nuevo.'); card.classList.remove('shake'); void card.offsetWidth; card.classList.add('shake'); pIn.value = ''; pIn.focus();
        if (fails >= 5) {
          until = Date.now() + 30000; go.disabled = true;
          timer = setInterval(() => { const s = Math.ceil((until - Date.now()) / 1000); if (s <= 0) { clearInterval(timer); go.disabled = false; fails = 0; msg.textContent = ''; } else msg.textContent = `Demasiados intentos. Espera ${s} s.`; }, 250);
        } else msg.textContent = 'Usuario o contraseña incorrectos' + (fails >= 3 ? ` (${5 - fails} intentos restantes)` : '');
      }
      document.body.append(ov); setTimeout(() => pIn.focus(), 60);
      if (N.holo) hp = N.holo.create(holoCv, { cx: innerWidth >= 1000 ? 0.3 : 0.5, cy: 0.42, r: 0.3, fps: 40 });
      say('Bienvenido a NEXUS OS. Soy tu núcleo cognitivo. Identifícate para continuar.');
    });
    return locked;
  };
  N.signOut = async () => {
    N.closeAllWindows && N.closeAllWindows();
    await N.saveNow(); await N.cloud.flush();            // lo último que hiciste llega a la nube
    const swap = N.storeKey !== 'workspace';
    N.who = null; await N.cloud.signOut();
    if (swap) { try { localStorage.removeItem(SK); } catch (e) {} location.reload(); return; }   // vuelve al espacio de la cuenta local
    return N.lock();
  };

  /* ---------- encuesta única de personalización ---------- */
  const USES = [['study', 'Estudiar y aprender', '🎓', ['learn', 'browser']], ['code', 'Programar', '💻', ['ide', 'learn']], ['design', 'Diseño y multimedia', '🎨', ['media']], ['web', 'Navegar por internet', '🌐', ['browser']], ['write', 'Escribir y organizar', '📝', ['notes']], ['all', 'Un poco de todo', '✨', ['notes', 'ide', 'media', 'browser', 'learn']]];
  const THEMES = [['ultron', 'Ultron', 'Oscuro con acento luminoso', ['#0b0405', '#ff2a3d']], ['dark', 'Oscuro clásico', 'Sobrio y neutro', ['#0b1020', '#7c9cff']], ['light', 'Claro', 'Fondo luminoso', ['#f3f5fa', '#3b6cff']], ['contrast', 'Alto contraste', 'Máxima legibilidad', ['#000', '#ffe600']]];
  const ACCENTS = ['#ff2a3d', '#19d3ff', '#8b5cff', '#35f2a0', '#ffb000', '#ff4fa3', '#3b82f6'];
  N.ACCENTS = ACCENTS; N.THEMES = THEMES;

  N.survey = function () {
    return new Promise((resolve) => {
      const a = { name: get('name'), uses: [], theme: get('theme'), accent: get('accent'), wm: get('wm'), icons: get('icons'), perf: get('perf'), welcome: get('welcome'), wall: get('wall') };
      const preview = () => { Object.assign(cfg(), { theme: a.theme, accent: a.accent, wm: a.wm, icons: a.icons, wall: a.wall }); N.applySettings(); };
      const opt = (ic, title, desc, on, fn, extra) => h('button', { type: 'button', class: 'sv-opt' + (on ? ' on' : ''), onclick: fn }, extra || h('span', { class: 'sv-ic' }, ic), h('div', {}, h('b', {}, title), desc ? h('small', {}, desc) : ''));
      const STEPS = [
        { t: '¿Cómo quieres que te llame?', p: 'Aparecerá en el menú Inicio y en los saludos.', r: () => h('input', { class: 'lk-in sv-in', value: a.name, maxlength: 24, oninput: (e) => { a.name = e.target.value; } }) },
        { t: '¿Para qué vas a usar NEXUS OS?', p: 'Elige todo lo que quieras: colocaré esos programas en tu escritorio.', multi: true, r: (redraw) => h('div', { class: 'sv-grid' }, USES.map(([k, l, ic]) => opt(ic, l, '', a.uses.includes(k), () => { a.uses = a.uses.includes(k) ? a.uses.filter((x) => x !== k) : [...a.uses, k]; redraw(); }))) },
        { t: '¿Qué estilo prefieres?', p: 'Se aplica al instante para que lo veas.', r: (redraw) => h('div', { class: 'sv-grid' }, THEMES.map(([k, l, d, sw]) => opt('', l, d, a.theme === k, () => { a.theme = k; preview(); redraw(); }, h('span', { class: 'sv-sw', style: { background: `linear-gradient(135deg,${sw[0]} 55%,${sw[1]} 55%)` } })))) },
        { t: 'Elige tu color', p: 'Es el color de botones, bordes y resaltados.', r: (redraw) => h('div', { class: 'sv-colors' }, ACCENTS.map((c) => h('button', { type: 'button', class: 'sv-dot' + (a.accent === c ? ' on' : ''), style: { background: c }, title: c, onclick: () => { a.accent = c; preview(); redraw(); } }))) },
        { t: '¿Cómo quieres tus ventanas?', p: 'Puedes cambiarlo después en Configuración.', r: (redraw) => h('div', { class: 'sv-grid one' }, opt('🖥', 'Fijas a pantalla completa', 'Como Windows: cada programa ocupa la pantalla y no se arrastra. Recomendado.', a.wm === 'fixed', () => { a.wm = 'fixed'; preview(); redraw(); }), opt('🗺', 'Libres en el lienzo infinito', 'Arrastra y reorganiza ventanas por un espacio sin límites.', a.wm === 'free', () => { a.wm = 'free'; preview(); redraw(); })) },
        { t: 'Escritorio y rendimiento', p: 'Ajusta cuánto quieres ver y cuánto debe exigirle a tu equipo.', r: (redraw) => h('div', {}, h('div', { class: 'sv-lbl' }, 'Iconos en el escritorio'), h('div', { class: 'sv-row' }, [[true, 'Mostrar'], [false, 'Ocultar']].map(([v, l]) => h('button', { type: 'button', class: 'sv-pill' + (a.icons === v ? ' on' : ''), onclick: () => { a.icons = v; preview(); redraw(); } }, l))), h('div', { class: 'sv-lbl' }, 'Efectos visuales'), h('div', { class: 'sv-row' }, [['auto', 'Automático'], ['alto', 'Máximo'], ['medio', 'Equilibrado'], ['bajo', 'Ligero']].map(([v, l]) => h('button', { type: 'button', class: 'sv-pill' + (a.perf === v ? ' on' : ''), onclick: () => { a.perf = v; redraw(); } }, l))), h('div', { class: 'sv-lbl' }, 'Fondo de pantalla'), h('div', { class: 'sv-row' }, [['hud', 'Diseño HUD (Python)'], ['solid', 'Color liso']].map(([v, l]) => h('button', { type: 'button', class: 'sv-pill' + (a.wall === v ? ' on' : ''), onclick: () => { a.wall = v; preview(); redraw(); } }, l)))) },
        { t: 'Último detalle', p: '¿Quieres ver la guía rápida cada vez que abras NEXUS OS?', r: (redraw) => h('div', { class: 'sv-grid one' }, opt('👋', 'Sí, mostrar la bienvenida', 'Útil mientras te acostumbras.', a.welcome, () => { a.welcome = true; redraw(); }), opt('🚀', 'No, ir directo al escritorio', 'Siempre podrás abrirla con F1.', !a.welcome, () => { a.welcome = false; redraw(); })) },
      ];
      let i = 0;
      const body = h('div', { class: 'sv-body' }), dots = h('div', { class: 'sv-prog' }), back = h('button', { type: 'button', class: 'btn', onclick: () => { i--; draw(); } }, '← Atrás'), next = h('button', { type: 'button', class: 'btn primary', onclick: () => (i === STEPS.length - 1 ? finish() : (i++, draw())) }, 'Siguiente →');
      const ov = h('div', { id: 'survey', role: 'dialog', 'aria-modal': 'true' }, h('div', { class: 'sv-card' }, h('div', { class: 'sv-top' }, h('img', { src: 'assets/logo.svg', alt: '', width: 34 }), h('div', {}, h('b', {}, 'CONFIGURACIÓN INICIAL'), h('small', {}, 'Una sola vez · para dejar NEXUS OS a tu gusto'))), dots, body, h('div', { class: 'sv-act' }, back, h('span', { style: { flex: 1 } }), next)));
      function draw() {
        const s = STEPS[i]; dots.replaceChildren(...STEPS.map((_, k) => h('i', { class: k <= i ? 'on' : '' })));
        const content = s.r(draw);
        body.replaceChildren(h('small', { class: 'sv-step' }, `PREGUNTA ${i + 1} DE ${STEPS.length}`), h('h2', {}, s.t), h('p', {}, s.p), content);
        back.style.visibility = i ? 'visible' : 'hidden'; next.textContent = i === STEPS.length - 1 ? 'Finalizar ✓' : 'Siguiente →';
      }
      function finish() {
        const uses = a.uses.length ? a.uses : ['all'];
        const apps = [...new Set(USES.filter(([k]) => uses.includes(k)).flatMap((u) => u[3]))];
        const ORDER = ['notes', 'ide', 'media', 'browser', 'learn'];
        Object.assign(cfg(), { name: a.name.trim() || 'anyelo', uses, theme: a.theme, accent: a.accent, wm: a.wm, icons: a.icons, perf: a.perf, welcome: a.welcome, wall: a.wall, pins: [...ORDER.filter((k) => apps.includes(k)), 'winapps', 'settings'], surveyDone: true });
        N.applySettings(); N.save(); ov.classList.add('out'); setTimeout(() => ov.remove(), 400); resolve();
      }
      document.body.append(ov); draw();
    });
  };
})();
