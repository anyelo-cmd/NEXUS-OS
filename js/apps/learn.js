/* SYNAPSE — la academia de código de NEXUS OS.
   Mapa de aprendizaje con nodos (estilo Duolingo) + lecciones con teoría, editor de código y consola (estilo Coddy).
   4 rutas (Python, JavaScript, C++/Arduino, HTML y CSS) × 10 etapas × 50 niveles × 5 ejercicios.
   Corazones, XP, rangos, racha, meta diaria, insignias, pistas de Nexo y certificados por etapa. El progreso se guarda en el espacio de trabajo. */
(function () {
  const N = window.NEXUS, h = N.h;
  const norm = (s) => String(s).replace(/\s+/g, '').replace(/['"]/g, '"').toLowerCase();
  const shuffle = (a) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const day = () => new Date().toISOString().slice(0, 10);
  const daysBetween = (a, b) => Math.round((new Date(b) - new Date(a)) / 864e5);
  const LEVELS = [0, 50, 150, 300, 500, 800, 1200, 1800, 2600, 3600, 5000, 7000, 10000, 15000, 22000, 32000, 48000];
  const RANKS = ['Aprendiz', 'Curioso', 'Explorador', 'Practicante', 'Programador', 'Constructor', 'Depurador', 'Arquitecto', 'Ingeniero', 'Experto', 'Maestro', 'Sabio', 'Leyenda', 'Titán', 'Oráculo', 'Singularidad', 'Nexo'];
  const levelOf = (xp) => { let l = 0; while (l + 1 < LEVELS.length && xp >= LEVELS[l + 1]) l++; return l; };
  const MSG_OK = ['¡Correcto!', '¡Muy bien!', '¡Exacto!', '¡Genial!', '¡Así se hace!', '¡Brillante!'];
  const PER = 50, GOAL = 30;
  const COURSES = [
    { id: 'py', pre: 'ruta', name: 'Python', icon: '🐍', color: '#ffd43b', lang: 'py', file: 'main.py', cmd: 'python main.py', blurb: 'El lenguaje más amigable', track: () => window.NEXUS_PATH },
    { id: 'js', pre: 'js', name: 'JavaScript', icon: '🟨', color: '#f7df1e', lang: 'js', file: 'index.js', cmd: 'node index.js', blurb: 'El lenguaje de la web', track: () => window.NEXUS_JS },
    { id: 'cpp', pre: 'cpp', name: 'C++ / Arduino', icon: '⚙', color: '#38d6e8', lang: 'cpp', file: 'main.cpp', cmd: 'g++ main.cpp && ./a.out', blurb: 'Rendimiento y microcontroladores', track: () => window.NEXUS_CPP },
    { id: 'web', pre: 'web', name: 'HTML y CSS', icon: '🎨', color: '#ff7a59', lang: 'web', file: 'index.html', cmd: '', blurb: 'Estructura y estilo de páginas', track: () => window.NEXUS_WEB },
  ];

  /* ---------- resaltado de sintaxis (ligero) ---------- */
  const KW = {
    py: 'def return if elif else for while in range import from as class try except finally with lambda and or not is None True False print pass break continue len int str float list dict set',
    js: 'const let var function return if else for while of in new class try catch finally throw switch case break continue default true false null undefined typeof async await console',
    cpp: 'int double float char bool string void return if else for while do switch case break continue class struct public private include using namespace new delete nullptr true false const static auto vector cout cin endl main',
  };
  const RULES = {
    py: [['#.*', 'c'], ['"[^"]*"|\'[^\']*\'', 's'], ['\\b\\d+(?:\\.\\d+)?\\b', 'n'], ['\\b(?:' + KW.py.split(' ').join('|') + ')\\b', 'k']],
    js: [['\\/\\/.*', 'c'], ['"[^"]*"|\'[^\']*\'|`[^`]*`', 's'], ['\\b\\d+(?:\\.\\d+)?\\b', 'n'], ['\\b(?:' + KW.js.split(' ').join('|') + ')\\b', 'k']],
    cpp: [['\\/\\/.*|^\\s*#.*', 'c'], ['"[^"]*"|\'[^\']*\'', 's'], ['\\b\\d+(?:\\.\\d+)?\\b', 'n'], ['\\b(?:' + KW.cpp.split(' ').join('|') + ')\\b', 'k']],
    web: [['<!--.*?-->|\\/\\*.*?\\*\\/', 'c'], ['"[^"]*"|\'[^\']*\'', 's'], ['<\\/?[A-Za-z][\\w-]*|\\/?>', 'k'], ['[#.@]?[\\w-]+(?=\\s*[:{])', 'n'], ['\\b\\d+(?:\\.\\d+)?(?:px|rem|em|%|vw|vh|s|deg)?\\b', 'n']],
  };
  const RX = {};
  function hl(text, lang) {
    const rules = RULES[lang] || [];
    if (!RX[lang]) RX[lang] = new RegExp(rules.map((r) => '(' + r[0] + ')').join('|') || '$^', 'g');
    const rx = RX[lang]; rx.lastIndex = 0;
    const out = []; let last = 0, m;
    while ((m = rx.exec(text)) && m[0] !== '') {
      if (m.index > last) out.push(text.slice(last, m.index));
      const g = m.findIndex((v, i) => i > 0 && v !== undefined) - 1;
      out.push(h('span', { class: 'hl-' + rules[g][1] }, m[0])); last = m.index + m[0].length;
    }
    if (last < text.length) out.push(text.slice(last));
    return out;
  }
  function editor(code, c, blank, fileName) {
    const lines = String(code).split('\n');
    return h('div', { class: 'sy-ed' },
      h('div', { class: 'sy-tab' }, h('i', {}), h('i', {}), h('i', {}), h('span', {}, fileName || c.file)),
      h('div', { class: 'sy-lines' }, lines.map((ln, k) => {
        const parts = ln.split('___'), kids = [];
        parts.forEach((p, j) => { kids.push(...hl(p, c.lang)); if (j < parts.length - 1) kids.push(blank || h('b', { class: 'sy-blank' }, '___')); });
        return h('div', { class: 'sy-ln' }, h('span', { class: 'sy-n' }, String(k + 1)), h('code', {}, kids.length ? kids : ' '));
      })));
  }
  const termBox = (c) => h('div', { class: 'sy-term' }, h('div', { class: 'sy-th' }, h('span', {}, 'CONSOLA'), h('small', {}, c.cmd || 'vista previa')), h('div', { class: 'sy-tb' }, h('span', { class: 'sy-dim' }, '$ esperando tu respuesta…')));

  N.registerApp('learn', {
    title: 'SYNAPSE', icon: '🧠', desc: 'Academia de código · Python, JS, C++ y web', w: 760, h: 720,
    init: () => ({ xp: 0, streak: 0, last: '', course: 'py', stg: {}, done: {}, daily: { day: '', xp: 0 }, hist: [], certs: [], seen: {} }),
    mount(root, ctx) {
      const d = ctx.data;
      d.done ||= {}; d.daily ||= { day: '', xp: 0 }; d.stg ||= {}; d.hist ||= []; d.certs ||= []; d.seen ||= {};
      if (d.course === 'ruta' || !COURSES.some((x) => x.id === d.course)) d.course = 'py';
      if (d.stage != null) { d.stg.py = d.stg.py ?? d.stage; delete d.stage; }
      const K = (c, s, i) => `${c.pre}${s}:${i}`;
      const stars = (c, s, i) => d.done[K(c, s, i)] || 0;
      const stageN = (c, s) => { let n = 0; for (let i = 0; i < PER; i++) if (stars(c, s, i)) n++; return n; };
      const stageOpen = (c, s) => s === 0 || stageN(c, s - 1) >= PER;
      const courseN = (c) => { let n = 0; for (let s = 0; s < 10; s++) n += stageN(c, s); return n; };
      const curStage = (c) => Math.min(9, Math.max(0, d.stg[c.id] || 0));
      const course = () => COURSES.find((x) => x.id === d.course) || COURSES[0];
      const unlocked = (c, s, i) => stageOpen(c, s) && (i === 0 || stars(c, s, i - 1) > 0);
      root.classList.add('app', 'sy');
      const wrap = h('div', { class: 'sy-wrap' });
      root.replaceChildren(wrap);
      let openIdx = -1, scrollTo = null;

      function touchStreak() {
        const t = day();
        if (d.daily.day !== t) d.daily = { day: t, xp: 0 };
        if (d.last !== t) { d.streak = d.last && daysBetween(d.last, t) === 1 ? d.streak + 1 : 1; d.last = t; }
        if (!d.hist.includes(t)) { d.hist.push(t); d.hist = d.hist.slice(-60); }
      }
      const liveStreak = () => (d.last && daysBetween(d.last, day()) <= 1 ? d.streak : 0);
      const totals = () => {
        let done = 0, perfect = 0, cleared = 0, started = 0;
        COURSES.forEach((c) => { const n = courseN(c); if (n) started++; done += n; for (let s = 0; s < 10; s++) { for (let i = 0; i < PER; i++) if (stars(c, s, i) === 3) perfect++; if (stageN(c, s) >= PER) cleared++; } });
        return { done, perfect, cleared, started };
      };
      const BADGES = [
        ['🌱', 'Primer paso', 'Completa tu primer nivel', (t) => t.done >= 1], ['🔥', 'En racha', 'Racha de 3 días', () => d.streak >= 3 || liveStreak() >= 3],
        ['⚡', 'Imparable', 'Racha de 7 días', () => liveStreak() >= 7 || d.streak >= 7], ['💎', 'Perfeccionista', '10 niveles con 3 estrellas', (t) => t.perfect >= 10],
        ['🏅', 'Constante', 'Completa 50 niveles', (t) => t.done >= 50], ['🏆', 'Etapa superada', 'Completa una etapa entera', (t) => t.cleared >= 1],
        ['🌐', 'Políglota', 'Empieza 2 rutas distintas', (t) => t.started >= 2], ['👑', 'Centurión', 'Completa 200 niveles', (t) => t.done >= 200],
      ];

      /* ---------- mapa ---------- */
      function map() {
        const c = course(), s = curStage(c), tr = c.track(), st = tr.stages[s], lv = levelOf(d.xp), nxt = LEVELS[lv + 1] ?? d.xp, base = LEVELS[lv];
        const today = d.daily.day === day() ? d.daily.xp : 0, tot = totals(), n = stageN(c, s), open = stageOpen(c, s);
        const side = h('aside', { class: 'sy-side' },
          h('div', { class: 'sy-brand' }, h('canvas', { class: 'sy-logo', width: 80, height: 80 }), h('div', {}, h('b', {}, 'SYNAPSE'), h('small', {}, 'Academia de código'))),
          h('div', { class: 'sy-rank' }, h('div', {}, h('b', {}, 'Nv. ' + (lv + 1) + ' · ' + RANKS[Math.min(lv, RANKS.length - 1)]), h('small', {}, d.xp + ' XP' + (nxt > base ? ' · faltan ' + (nxt - d.xp) : ''))), h('div', { class: 'sy-bar' }, h('i', { style: { width: (nxt > base ? Math.min(100, ((d.xp - base) / (nxt - base)) * 100) : 100) + '%' } }))),
          h('div', { class: 'sy-lbl' }, 'RUTAS'),
          COURSES.map((x) => { const k = courseN(x), pct = Math.round((k / (PER * 10)) * 100); return h('button', { class: 'sy-co' + (x.id === c.id ? ' on' : ''), style: { '--cc': x.color }, onclick: () => { d.course = x.id; openIdx = -1; scrollTo = 'cur'; ctx.save(); map(); } }, h('span', { class: 'sy-ci' }, x.icon), h('div', {}, h('b', {}, x.name), h('small', {}, x.blurb)), h('em', {}, pct + '%'), h('i', { class: 'sy-cb', style: { width: pct + '%' } })); }),
          h('div', { class: 'sy-lbl' }, 'ETAPAS · ' + c.name.toUpperCase()),
          h('div', { class: 'sy-stg' }, tr.stages.map((x, si) => { const ok = stageOpen(c, si), k = stageN(c, si); return h('button', { class: 'sy-sg' + (si === s ? ' on' : '') + (ok ? '' : ' lock') + (k >= PER ? ' full' : ''), style: { '--cc': x.color }, title: ok ? x.name + ' · ' + k + '/' + PER : 'Completa los 50 niveles de la etapa anterior', onclick: () => { if (!ok) return N.toast('Completa los 50 niveles de la etapa anterior'); d.stg[c.id] = si; openIdx = -1; scrollTo = 'cur'; ctx.save(); map(); } }, h('span', {}, ok ? x.icon : '🔒'), h('b', {}, String(x.n)), h('small', {}, k >= PER ? '✓' : k + '/' + PER)); })));
        // zona principal: camino de nodos
        const mainEl = h('main', { class: 'sy-main' });
        const hero = h('div', { class: 'sy-hero', style: { '--cc': st.color } },
          h('div', { class: 'sy-hico' }, st.icon),
          h('div', { class: 'sy-ht' }, h('small', {}, c.name.toUpperCase() + ' · ETAPA ' + st.n + ' DE 10'), h('b', {}, st.name), h('span', {}, st.desc + ' · ' + n + '/' + PER + ' niveles')),
          h('button', { class: 'btn sy-guide', onclick: () => intro(c, s, Math.min(PER - 1, firstOpen(c, s)), true) }, '📖 Teoría'));
        const path = h('div', { class: 'sy-path', style: { '--cc': st.color } });
        const cur = firstOpen(c, s);
        for (let i = 0; i < PER; i++) {
          if (i % 10 === 0) path.append(h('div', { class: 'sy-unit', style: { '--cc': st.color } }, h('span', {}, 'UNIDAD ' + (i / 10 + 1)), h('b', {}, 'Niveles ' + (i + 1) + ' – ' + (i + 10))));
          const sc = stars(c, s, i), ok = unlocked(c, s, i), isCur = ok && !sc && i === cur, boss = i % 10 === 9;
          const off = Math.round(Math.sin(i * 0.85) * 74);
          const node = h('div', { class: 'sy-nw', style: { transform: `translateX(${off}px)` } },
            h('button', { class: 'sy-nd' + (ok ? '' : ' lock') + (isCur ? ' cur' : '') + (sc ? ' done' : '') + (boss ? ' boss' : ''), 'data-i': i, title: ok ? 'Nivel ' + (i + 1) : 'Bloqueado', onclick: () => { if (!ok) return N.toast(open ? 'Completa el nivel anterior para desbloquearlo' : 'Completa antes la etapa anterior'); openIdx = openIdx === i ? -1 : i; scrollTo = 'keep'; map(); } },
              h('span', {}, !ok ? '🔒' : sc ? (boss ? '👑' : '✓') : boss ? '👑' : String(i + 1))),
            sc ? h('div', { class: 'sy-ns' }, '★'.repeat(sc) + '☆'.repeat(3 - sc)) : isCur ? h('div', { class: 'sy-start' }, 'EMPEZAR') : '');
          if (openIdx === i && ok) node.append(h('div', { class: 'sy-pop' }, h('b', {}, (boss ? '👑 Jefe · ' : '') + 'Nivel ' + (i + 1)), h('small', {}, 'Dificultad ' + '★'.repeat(tr.stars(s, i)) + ' · 5 ejercicios · +' + (15 + 10) + ' XP'), h('button', { class: 'btn primary', onclick: (e) => { e.stopPropagation(); start(c, s, i); } }, sc ? 'REPETIR' : 'EMPEZAR')));
          path.append(node);
        }
        path.append(h('div', { class: 'sy-end', style: { '--cc': st.color } }, n >= PER ? h('div', {}, h('b', {}, '🏆 ¡Etapa completada!'), h('button', { class: 'btn primary', onclick: () => certificate(c, s) }, '🎓 Ver certificado')) : h('small', {}, 'Completa los 50 niveles para obtener el certificado de la etapa ' + st.n)));
        mainEl.append(hero, path);
        // columna derecha
        const ring = (v, max, col) => { const R = 30, L = 2 * Math.PI * R, p = Math.min(1, v / max); const el = h('div', { class: 'sy-ring' }, h('b', {}, Math.min(v, max) + '/' + max)); el.insertAdjacentHTML('afterbegin', `<svg viewBox="0 0 80 80"><circle cx="40" cy="40" r="${R}" fill="none" stroke="rgba(255,255,255,.1)" stroke-width="8"/><circle cx="40" cy="40" r="${R}" fill="none" stroke="${col}" stroke-width="8" stroke-linecap="round" stroke-dasharray="${L * p} ${L}" transform="rotate(-90 40 40)"/></svg>`); return el; };
        const week = []; for (let k = 6; k >= 0; k--) { const dt = new Date(Date.now() - k * 864e5), key = dt.toISOString().slice(0, 10); week.push(h('div', { class: 'sy-wd' + (d.hist.includes(key) ? ' on' : '') + (k === 0 ? ' today' : '') }, h('i', {}, d.hist.includes(key) ? '🔥' : ''), h('small', {}, 'DLMXJVS'[dt.getDay()]))); }
        const right = h('aside', { class: 'sy-right' },
          h('div', { class: 'sy-card sy-streak' }, h('div', { class: 'sy-big' }, '🔥 ' + liveStreak()), h('small', {}, 'días de racha'), h('div', { class: 'sy-week' }, week)),
          h('div', { class: 'sy-card sy-goal' }, ring(today, GOAL, 'var(--ok,#3ee0a0)'), h('div', {}, h('b', {}, 'Meta diaria'), h('small', {}, today >= GOAL ? '¡Cumplida! 🎯' : 'Gana ' + GOAL + ' XP hoy'))),
          h('div', { class: 'sy-card' }, h('b', { class: 'sy-ct' }, 'Insignias · ' + BADGES.filter((b) => b[3](tot)).length + '/' + BADGES.length), h('div', { class: 'sy-badges' }, BADGES.map((b) => { const on = b[3](tot); return h('div', { class: 'sy-bd' + (on ? ' on' : ''), title: b[1] + ': ' + b[2] }, h('span', {}, on ? b[0] : '🔒'), h('small', {}, b[1])); }))),
          h('div', { class: 'sy-card sy-nexo' }, h('canvas', { class: 'sy-mascot', width: 96, height: 96 }), h('div', {}, h('b', {}, 'Nexo'), h('small', {}, nexoTip(c, s, n)))),
          d.certs.length ? h('div', { class: 'sy-card' }, h('b', { class: 'sy-ct' }, 'Certificados'), d.certs.slice(-4).map((x) => h('button', { class: 'sy-cert', onclick: () => certificate(COURSES.find((k) => k.id === x.course), x.stage) }, '🎓 ' + COURSES.find((k) => k.id === x.course).name + ' · Etapa ' + (x.stage + 1)))) : '');
        const prev = wrap.querySelector('.sy-main');
        wrap.replaceChildren(side, mainEl, right);
        wrap.className = 'sy-wrap sy-mapv';
        if (N.holo && N.holo.shape) { N.holo.shape(side.querySelector('.sy-logo'), 'globe'); N.holo.shape(right.querySelector('.sy-mascot'), 'icosa'); }
        requestAnimationFrame(() => {
          if (scrollTo === 'keep' && prev) mainEl.scrollTop = prev._st || 0;
          else { const el = mainEl.querySelector('.sy-nd.cur') || mainEl.querySelector('.sy-nd.done:last-of-type'); if (el) mainEl.scrollTop = Math.max(0, el.offsetTop - 260); }
          scrollTo = null;
        });
        mainEl.addEventListener('scroll', () => { mainEl._st = mainEl.scrollTop; }, { passive: true });
        if (scrollTo === 'keep' && prev) mainEl._st = prev._st;
      }
      function firstOpen(c, s) { for (let i = 0; i < PER; i++) if (!stars(c, s, i)) return i; return PER - 1; }
      function nexoTip(c, s, n) {
        const tips = ['Practica un poco cada día: la constancia vale más que las maratones.', 'Si fallas, lee la explicación: ahí está lo que más aprendes.', 'Usa las pistas cuando te atasques; son gratis.', 'Intenta predecir la salida antes de elegir respuesta.', 'Los niveles jefe 👑 cierran cada unidad: ¡a por las 3 estrellas!'];
        return n === 0 ? 'Empieza por el nivel 1 de ' + c.track().stages[s].name + '. ¡Yo te acompaño!' : tips[(n + s) % tips.length];
      }
      const start = (c, s, i) => (d.seen[c.id + s] ? play(c, s, i) : intro(c, s, i));

      /* ---------- teoría ---------- */
      function intro(c, s, i, fromMap) {
        const st = c.track().stages[s];
        d.seen[c.id + s] = true; ctx.save();
        wrap.className = 'sy-wrap sy-introv';
        wrap.replaceChildren(h('div', { class: 'sy-intro', style: { '--cc': st.color } },
          h('button', { class: 'btn', onclick: map }, '← Volver al mapa'),
          h('div', { class: 'sy-split' },
            h('div', { class: 'sy-l' }, h('div', { class: 'sy-kind' }, 'TEORÍA · ETAPA ' + st.n), h('h2', {}, st.icon + ' ' + st.name), h('p', { class: 'sy-lead' }, st.desc), h('div', { class: 'sy-theory' }, h('b', {}, '💡 Antes de empezar'), h('p', {}, st.tip)),
              h('button', { class: 'btn primary sy-go', onclick: () => play(c, s, i) }, fromMap ? 'IR AL NIVEL ' + (i + 1) : 'COMENZAR NIVEL ' + (i + 1) + ' · 5 ejercicios')),
            h('div', { class: 'sy-r' }, st.demo ? editor(st.demo, c) : '', termBox(c)))));
      }

      /* ---------- lección ---------- */
      function play(c, s, i) {
        const tr = c.track(), st = tr.stages[s], lvl = tr.level(s, i), queue = lvl.ex.map((e, k) => ({ e, k })), total = queue.length;
        let hearts = 5, correct = 0, mistakes = 0, hints = 2;
        const mistakesFor = new Set();
        const segs = h('div', { class: 'sy-segs' }, queue.map(() => h('i', {}))), heartsEl = h('span', { class: 'sy-hearts' });
        const stage = h('div', { class: 'sy-stage' }), foot = h('div', { class: 'sy-footbar' });
        wrap.className = 'sy-wrap sy-playv';
        wrap.replaceChildren(h('div', { class: 'sy-play', style: { '--cc': st.color } },
          h('div', { class: 'sy-top' }, h('button', { class: 'btn', title: 'Salir', onclick: () => { if (confirm('¿Salir del nivel? Perderás el progreso de este intento.')) map(); } }, '✕'), h('div', { class: 'sy-prog' }, h('small', {}, c.icon + ' ' + c.name + ' · Etapa ' + st.n + ' · Nivel ' + (i + 1)), segs), heartsEl,
            h('button', { class: 'btn', title: 'Ver la teoría de la etapa', onclick: (e) => { const p = wrap.querySelector('.sy-drawer'); if (p) p.remove(); else wrap.querySelector('.sy-play').append(h('div', { class: 'sy-drawer' }, h('b', {}, '📖 ' + st.name), h('p', {}, st.tip), st.demo ? editor(st.demo, c) : '')); } }, '📖')),
          stage, foot));
        const draw = () => { heartsEl.textContent = '❤'.repeat(hearts) + '🖤'.repeat(5 - hearts); [...segs.children].forEach((x, k) => x.className = k < correct ? 'on' : k === correct ? 'cur' : ''); };

        function next() {
          draw();
          if (!queue.length) return finish();
          const { e, k } = queue[0];
          let answer = null, locked = false;
          const check = h('button', { class: 'btn primary sy-check', disabled: true }, 'COMPROBAR');
          const setAnswer = (v, ready) => { answer = v; check.disabled = !ready; };
          const R = RENDER[e.t](e, setAnswer, () => locked, c);
          const term = termBox(c);
          const kind = e.t === 'tf' ? '¿Verdadero o falso?' : e.t === 'order' ? 'Ordena las líneas' : e.t === 'pairs' ? 'Relaciona' : e.t === 'fill' ? 'Completa el código' : 'Elige la respuesta';
          const rightKids = [];
          if (R.right) rightKids.push(R.right); else if (e.code) rightKids.push(editor(e.code, c));
          else rightKids.push(h('div', { class: 'sy-theory' }, h('b', {}, '💡 Recuerda · ' + st.name), h('p', {}, st.tip)), st.demo ? editor(st.demo, c, null, 'ejemplo') : '');
          if (e.chk || (c.cmd && e.code)) rightKids.push(term);
          stage.replaceChildren(h('div', { class: 'sy-split sy-in' }, h('div', { class: 'sy-l' }, h('div', { class: 'sy-kind' }, kind.toUpperCase()), h('h3', {}, e.q), R.left), h('div', { class: 'sy-r' }, rightKids)));
          const hintBtn = h('button', { class: 'btn sy-hint', title: 'Nexo te da una pista', onclick: () => { if (locked) return; if (hints <= 0) return N.toast('Sin pistas en este nivel'); hints--; hintBtn.textContent = '💡 Pista · ' + hints; R.hint ? R.hint() : N.toast('Nexo: ' + st.tip.split('. ')[0] + '.'); } }, '💡 Pista · ' + hints);
          check.onclick = () => {
            if (locked) return; locked = true;
            const ok = JUDGE[e.t](e, answer);
            if (ok) { correct++; queue.shift(); } else { hearts--; mistakes++; mistakesFor.add(k); queue.push(queue.shift()); }
            draw(); stage.classList.toggle('ok', ok); stage.classList.toggle('bad', !ok);
            if (R.reveal) R.reveal(ok);
            if (e.chk) { const tb = term.querySelector('.sy-tb'); tb.replaceChildren(h('div', { class: 'sy-cmd' }, '$ ' + (c.cmd || 'ejecutar')), e.chk.err ? h('div', { class: 'sy-err' }, '✖ ' + e.chk.out) : h('pre', { class: 'sy-out' }, e.chk.out === '' ? '(sin salida)' : e.chk.out)); }
            const explain = ok ? e.why : (e.why ? e.why + '\n' : '') + 'Respuesta: ' + SOLUTION[e.t](e);
            foot.replaceChildren(h('div', { class: 'sy-fb ' + (ok ? 'ok' : 'bad') }, h('div', { class: 'sy-fi' }, ok ? '✔' : '✖'), h('div', { class: 'sy-ft' }, h('b', {}, ok ? MSG_OK[Math.floor(Math.random() * MSG_OK.length)] : 'Casi…'), explain ? h('p', {}, explain) : ''),
              h('button', { class: 'btn primary', onclick: () => { stage.classList.remove('ok', 'bad'); foot.replaceChildren(); if (hearts <= 0) return fail(); next(); } }, hearts <= 0 ? 'CONTINUAR' : 'SIGUIENTE')));
            foot.querySelector('.btn.primary').focus();
          };
          foot.replaceChildren(h('div', { class: 'sy-fa' }, hintBtn, check));
        }
        function fail() {
          wrap.className = 'sy-wrap sy-introv';
          wrap.replaceChildren(h('div', { class: 'sy-intro sy-center', style: { '--cc': st.color } }, h('div', { class: 'sy-bigico' }, '💔'), h('h2', {}, 'Te quedaste sin corazones'), h('p', { class: 'sy-lead' }, 'No pasa nada: equivocarse es parte de aprender. Repasa la teoría y vuelve a intentarlo.'),
            h('button', { class: 'btn primary sy-go', onclick: () => intro(c, s, i, true) }, 'REVISAR LA TEORÍA'), h('button', { class: 'btn', onclick: () => play(c, s, i) }, 'Reintentar ya'), h('button', { class: 'btn', onclick: map }, 'Volver al mapa')));
        }
        function finish() {
          touchStreak();
          const perfect = mistakes === 0, sr = perfect ? 3 : mistakes <= 2 ? 2 : 1, boss = i % 10 === 9, gain = 10 + sr * 5 + (perfect ? 10 : 0) + (boss ? 15 : 0);
          const beforeBadges = BADGES.filter((b) => b[3](totals())).map((b) => b[1]), before = levelOf(d.xp);
          d.xp += gain; d.daily.xp += gain; d.done[K(c, s, i)] = Math.max(stars(c, s, i), sr);
          const lvUp = levelOf(d.xp) > before, goalHit = d.daily.xp >= GOAL && d.daily.xp - gain < GOAL;
          const stageDone = stageN(c, s) >= PER, newCert = stageDone && !d.certs.some((x) => x.course === c.id && x.stage === s);
          if (newCert) d.certs.push({ course: c.id, stage: s, date: day() });
          const newBadges = BADGES.filter((b) => b[3](totals()) && !beforeBadges.includes(b[1]));
          ctx.save();
          const last = i + 1 >= PER, nextStage = last && s < 9;
          wrap.className = 'sy-wrap sy-introv';
          wrap.replaceChildren(h('div', { class: 'sy-intro sy-center sy-win', style: { '--cc': st.color } },
            h('div', { class: 'sy-bigico pop' }, perfect ? '🏆' : '🎉'), h('h2', {}, last ? '¡Etapa ' + st.n + ' completada!' : boss ? '¡Jefe derrotado!' : '¡Nivel completado!'),
            h('div', { class: 'sy-stars' }, '★'.repeat(sr) + '☆'.repeat(3 - sr)),
            h('div', { class: 'sy-sum' }, h('div', {}, h('b', {}, '+' + gain), h('small', {}, 'XP')), h('div', {}, h('b', {}, (total - mistakes) + '/' + total), h('small', {}, 'a la primera')), h('div', {}, h('b', {}, '🔥 ' + d.streak), h('small', {}, 'racha'))),
            lvUp ? h('div', { class: 'sy-note' }, '🆙 ¡Subiste al nivel ' + (levelOf(d.xp) + 1) + ' · ' + RANKS[Math.min(levelOf(d.xp), RANKS.length - 1)] + '!') : '', goalHit ? h('div', { class: 'sy-note' }, '🎯 ¡Meta diaria cumplida!') : '',
            newBadges.map((b) => h('div', { class: 'sy-note' }, b[0] + ' Insignia desbloqueada: ' + b[1])),
            newCert ? h('button', { class: 'btn primary sy-go', onclick: () => certificate(c, s) }, '🎓 VER TU CERTIFICADO') : '',
            h('button', { class: 'btn primary sy-go', onclick: () => { if (last) { if (nextStage) d.stg[c.id] = s + 1; ctx.save(); scrollTo = 'cur'; map(); } else play(c, s, i + 1); } }, nextStage ? 'SIGUIENTE ETAPA' : last ? 'VER MAPA' : 'SIGUIENTE NIVEL'),
            h('button', { class: 'btn', onclick: () => { scrollTo = 'cur'; map(); } }, 'Volver al mapa')));
          confetti();
        }
        next();
      }

      function confetti() {
        if (document.documentElement.dataset.perf === 'low') return;
        const cs = ['var(--accent)', '#ffd43b', '#35f2a0', '#19d3ff', '#fff'];
        const layer = h('div', { class: 'sy-conf' }, Array.from({ length: 40 }, (_, k) => h('i', { style: { left: Math.random() * 100 + '%', background: cs[k % cs.length], animationDelay: Math.random() * 0.4 + 's', animationDuration: 1.4 + Math.random() * 1.2 + 's' } })));
        root.append(layer); setTimeout(() => layer.remove(), 3000);
      }

      /* ---------- certificado (se dibuja en un canvas y se puede descargar) ---------- */
      function certificate(c, s) {
        const st = c.track().stages[s], W = 1200, H = 800, cv = h('canvas', { width: W, height: H, class: 'sy-certcv' }), g = cv.getContext('2d');
        const acc = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#ff3d5a', name = (N.user && N.user().name) || 'Estudiante';
        const rec = d.certs.find((x) => x.course === c.id && x.stage === s) || { date: day() }, id = 'SYN-' + c.id.toUpperCase() + '-' + (s + 1) + '-' + String(rec.date).replace(/-/g, '');
        g.fillStyle = '#05070d'; g.fillRect(0, 0, W, H);
        const gr = g.createRadialGradient(W / 2, H / 2, 40, W / 2, H / 2, 720); gr.addColorStop(0, acc + '33'); gr.addColorStop(1, '#05070d00'); g.fillStyle = gr; g.fillRect(0, 0, W, H);
        g.strokeStyle = acc; g.lineWidth = 3; g.strokeRect(36, 36, W - 72, H - 72); g.lineWidth = 1; g.strokeRect(52, 52, W - 104, H - 104);
        g.textAlign = 'center'; g.fillStyle = acc; g.font = '600 22px monospace'; g.fillText('S Y N A P S E  ·  A C A D E M I A   D E   C Ó D I G O', W / 2, 130);
        g.fillStyle = '#fff'; g.font = '300 64px sans-serif'; g.fillText('CERTIFICADO DE ETAPA', W / 2, 230);
        g.fillStyle = '#9aa3c4'; g.font = '24px sans-serif'; g.fillText('Se otorga a', W / 2, 310);
        g.fillStyle = '#fff'; g.font = '700 72px sans-serif'; g.fillText(name, W / 2, 400);
        g.fillStyle = '#9aa3c4'; g.font = '24px sans-serif'; g.fillText('por completar los 50 niveles de', W / 2, 466);
        g.fillStyle = st.color; g.font = '700 50px sans-serif'; g.fillText(c.name + ' · Etapa ' + st.n + ': ' + st.name, W / 2, 540);
        g.fillStyle = '#9aa3c4'; g.font = '22px sans-serif'; g.fillText(st.desc, W / 2, 586);
        g.font = '20px monospace'; g.fillText('Fecha: ' + rec.date + '   ·   ID: ' + id, W / 2, 706); g.font = '16px sans-serif'; g.fillStyle = '#5f6788'; g.fillText('Certificado local de NEXUS OS: no es una acreditación oficial.', W / 2, 740);
        g.fillStyle = acc; g.font = '60px sans-serif'; g.fillText(c.icon, W / 2, 656);
        const ov = h('div', { class: 'sy-modal', onclick: (e) => { if (e.target === ov) ov.remove(); } }, h('div', { class: 'sy-mbox' }, cv, h('div', { class: 'sy-mact' }, h('button', { class: 'btn primary', onclick: () => cv.toBlob((b) => { const a = h('a', { href: URL.createObjectURL(b), download: id + '.png' }); a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000); }) }, '⬇ Descargar PNG'), h('button', { class: 'btn', onclick: () => ov.remove() }, 'Cerrar'))));
        root.append(ov);
      }

      map();
    },
  });

  /* ---------- renderizadores por tipo: devuelven { left, right?, hint?, reveal? } ---------- */
  const RENDER = {
    choice(e, set, locked) {
      let ops = [];
      ops = e.opts.map((o, i) => h('button', { class: 'sy-opt', onclick: () => { if (locked()) return; ops.forEach((b, j) => b.classList.toggle('sel', j === i)); set(i, true); } }, h('kbd', {}, String(i + 1)), h('span', {}, o)));
      const onkey = (ev) => { if (!ops[0] || !ops[0].isConnected) return document.removeEventListener('keydown', onkey); const n = +ev.key; if (n >= 1 && n <= ops.length && !/input|textarea/i.test(ev.target.tagName)) ops[n - 1].click(); };
      document.addEventListener('keydown', onkey);
      return { left: h('div', { class: 'sy-opts' }, ops),
        hint() { const wrong = ops.map((b, i) => i).filter((i) => i !== e.a && !ops[i].classList.contains('gone')); if (wrong.length > 1) { const i = wrong[Math.floor(Math.random() * wrong.length)]; ops[i].classList.add('gone'); ops[i].disabled = true; } },
        reveal(ok) { ops[e.a].classList.add('right'); } };
    },
    tf(e, set, locked) {
      const b = [true, false].map((v) => h('button', { class: 'sy-opt tf', onclick: () => { if (locked()) return; b.forEach((x, j) => x.classList.toggle('sel', (j === 0) === v)); set(v, true); } }, v ? '✔ Verdadero' : '✘ Falso'));
      return { left: h('div', { class: 'sy-opts row' }, b), hint() { b[e.a ? 1 : 0].classList.add('gone'); b[e.a ? 1 : 0].disabled = true; }, reveal() { b[e.a ? 0 : 1].classList.add('right'); } };
    },
    fill(e, set, locked, c) {
      const parts = e.code.split('___');
      const input = h('input', { class: 'sy-fill', spellcheck: 'false', autocomplete: 'off', placeholder: '…', size: 6, oninput: (ev) => { set(ev.target.value, !!ev.target.value.trim()); ev.target.size = Math.max(6, ev.target.value.length + 1); }, onkeydown: (ev) => { if (ev.key === 'Enter') ev.target.closest('.sy-play')?.querySelector('.sy-check:not([disabled])')?.click(); } });
      setTimeout(() => input.focus(), 40);
      return { left: h('p', { class: 'sy-help' }, 'Escribe lo que falta en el editor de la derecha y pulsa COMPROBAR.'), right: editor(e.code, c, input), hint() { input.placeholder = String(e.a[0])[0] + '…'; input.focus(); }, reveal(ok) { if (!ok) input.classList.add('wrong'); } };
    },
    order(e, set, locked, c) {
      const bank = shuffle(e.lines.map((t, i) => ({ t, i }))), chosen = [];
      const out = h('div', { class: 'sy-slots' }), pool = h('div', { class: 'sy-pool' });
      const draw = () => {
        out.replaceChildren(...chosen.map((x, p) => h('button', { class: 'sy-line', onclick: () => { if (locked()) return; chosen.splice(p, 1); bank.push(x); draw(); } }, h('code', {}, x.t))), chosen.length ? '' : h('small', { class: 'sy-ph' }, 'Toca las líneas en el orden correcto'));
        pool.replaceChildren(...bank.map((x) => h('button', { class: 'sy-line pool', onclick: () => { if (locked()) return; bank.splice(bank.indexOf(x), 1); chosen.push(x); draw(); } }, h('code', {}, x.t))));
        set(chosen.map((x) => x.i), bank.length === 0);
      };
      draw(); return { left: h('div', {}, out, pool) };
    },
    pairs(e, set, locked) {
      const L = shuffle(e.pairs.map((p, i) => ({ t: p[0], i }))), R = shuffle(e.pairs.map((p, i) => ({ t: p[1], i })));
      let pickL = null; const done = new Set(); let tries = 0;
      const wrap = h('div', { class: 'sy-pairs' });
      const col = (arr, side) => arr.map((x) => h('button', { class: 'sy-opt pr', 'data-side': side, 'data-i': x.i, onclick: (ev) => {
        if (locked() || done.has(x.i)) return; const b = ev.currentTarget;
        if (side === 'L') { wrap.querySelectorAll('[data-side=L]').forEach((n) => n.classList.remove('sel')); b.classList.add('sel'); pickL = x.i; return; }
        if (pickL === null) return N.toast('Elige primero un elemento de la izquierda');
        tries++;
        if (pickL === x.i) { done.add(x.i); wrap.querySelectorAll(`[data-i="${x.i}"]`).forEach((n) => { n.classList.remove('sel'); n.classList.add('matched'); }); }
        else { b.classList.add('shake'); setTimeout(() => b.classList.remove('shake'), 400); wrap.querySelectorAll('[data-side=L]').forEach((n) => n.classList.remove('sel')); }
        pickL = null; set({ done: done.size, tries, n: e.pairs.length }, done.size === e.pairs.length);
      } }, x.t));
      wrap.append(h('div', {}, col(L, 'L')), h('div', {}, col(R, 'R')));
      return { left: wrap };
    },
  };
  const JUDGE = {
    choice: (e, a) => a === e.a,
    tf: (e, a) => a === e.a,
    fill: (e, a) => e.a.some((x) => norm(x) === norm(a)),
    order: (e, a) => a.every((v, i) => v === i),
    pairs: (e, a) => a.tries <= a.n + 1,   // se permite como máximo un fallo
  };
  const SOLUTION = {
    choice: (e) => e.opts[e.a], tf: (e) => (e.a ? 'Verdadero' : 'Falso'), fill: (e) => e.a[0],
    order: (e) => '\n' + e.lines.join('\n'), pairs: (e) => e.pairs.map((p) => p[0] + ' → ' + p[1]).join(' · '),
  };
})();
