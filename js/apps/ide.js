/* Módulo 3a — Estudio de código: HTML/CSS/JS/C++ con números de línea, resaltado, consola integrada,
   vista responsive, fragmentos, exportación y verificación de sketches Arduino.
   (Siguiente hito: reemplazar el textarea por Monaco.) */
(function () {
  const N = window.NEXUS, h = N.h;
  const esc = (s) => s.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
  const KW_JS = 'const|let|var|function|return|if|else|for|while|do|switch|case|break|continue|new|class|extends|this|async|await|try|catch|throw|import|export|from|true|false|null|undefined|typeof|of|in';
  const KW_CPP = 'int|long|float|double|char|bool|byte|void|const|unsigned|if|else|for|while|do|switch|case|break|continue|return|true|false|HIGH|LOW|INPUT|OUTPUT|INPUT_PULLUP|String|struct|enum|class|static|define|include';
  const LANGS = {
    html: [['c', '<!--[\\s\\S]*?-->'], ['t', '<\\/?[a-zA-Z][\\w-]*'], ['s', '"[^"]*"|\'[^\']*\''], ['k', '\\/?>']],
    css: [['c', '\\/\\*[\\s\\S]*?\\*\\/'], ['s', '"[^"]*"|\'[^\']*\''], ['n', '#[0-9a-fA-F]{3,8}\\b|-?\\d+\\.?\\d*(?:px|em|rem|%|vh|vw|s|ms|deg)?'], ['t', '[.#]?[a-zA-Z_-][\\w-]*(?=\\s*[{,:])'], ['k', '@[\\w-]+']],
    js: [['c', '\\/\\/.*|\\/\\*[\\s\\S]*?\\*\\/'], ['s', '`[^`]*`|"(?:\\\\.|[^"])*"|\'(?:\\\\.|[^\'])*\''], ['n', '\\b\\d+\\.?\\d*\\b'], ['k', '\\b(?:' + KW_JS + ')\\b']],
    cpp: [['c', '\\/\\/.*|\\/\\*[\\s\\S]*?\\*\\/'], ['s', '"(?:\\\\.|[^"])*"'], ['n', '\\b\\d+\\.?\\d*\\b'], ['k', '#\\w+|\\b(?:' + KW_CPP + ')\\b']],
  };
  const rx = {}; for (const k in LANGS) rx[k] = new RegExp(LANGS[k].map(([, p]) => '(' + p + ')').join('|'), 'g');
  function highlight(code, lang) {
    let out = '', last = 0, m; const re = rx[lang]; re.lastIndex = 0;
    while ((m = re.exec(code))) {
      if (!m[0]) { re.lastIndex++; continue; }
      out += esc(code.slice(last, m.index));
      out += `<span class="tk-${LANGS[lang][m.findIndex((x, i) => i && x !== undefined) - 1][0]}">${esc(m[0])}</span>`; last = m.index + m[0].length;
    }
    return out + esc(code.slice(last)) + '\n';
  }

  const SNIPPETS = {
    html: { 'Estructura HTML5': '<main class="wrap">\n  <h1>Título</h1>\n  <p>Contenido…</p>\n</main>\n', 'Tarjeta': '<article class="card">\n  <h2>Título</h2>\n  <p>Descripción breve.</p>\n  <button>Acción</button>\n</article>\n', 'Formulario': '<form onsubmit="event.preventDefault();console.log(Object.fromEntries(new FormData(this)))">\n  <input name="nombre" placeholder="Nombre" required>\n  <input name="correo" type="email" placeholder="Correo" required>\n  <button>Enviar</button>\n</form>\n' },
    css: { 'Centrar con flexbox': '.center{display:flex;align-items:center;justify-content:center;min-height:100vh}\n', 'Grid responsive': '.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:16px}\n', 'Glassmorphism': '.glass{background:rgba(255,255,255,.12);backdrop-filter:blur(12px);border:1px solid rgba(255,255,255,.25);border-radius:16px;padding:20px}\n', 'Animación pulso': '@keyframes pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.08)}}\n.pulse{animation:pulse 1.6s ease-in-out infinite}\n' },
    js: { 'fetch JSON': "fetch('https://jsonplaceholder.typicode.com/todos/1')\n  .then(r => r.json())\n  .then(d => console.log(d))\n  .catch(e => console.error(e));\n", 'Animación en canvas': "const c = document.createElement('canvas'); c.width = 300; c.height = 150; document.body.append(c);\nconst x = c.getContext('2d'); let t = 0;\n(function loop(){ x.clearRect(0,0,300,150); x.fillStyle='#6c8cff'; x.beginPath(); x.arc(150+Math.sin(t)*100,75,14,0,7); x.fill(); t+=.05; requestAnimationFrame(loop); })();\n", 'Contador con log': "let n = 0;\nsetInterval(() => console.log('tick', ++n), 1000);\n" },
    cpp: { 'Blink': 'void setup() {\n  pinMode(LED_BUILTIN, OUTPUT);\n}\nvoid loop() {\n  digitalWrite(LED_BUILTIN, HIGH); delay(500);\n  digitalWrite(LED_BUILTIN, LOW);  delay(500);\n}\n', 'Botón con antirrebote': 'const int BTN = 4, LED = 13;\nbool estado = false; unsigned long t0 = 0;\nvoid setup() { pinMode(BTN, INPUT_PULLUP); pinMode(LED, OUTPUT); }\nvoid loop() {\n  if (digitalRead(BTN) == LOW && millis() - t0 > 200) { estado = !estado; t0 = millis(); digitalWrite(LED, estado); }\n}\n', 'Ultrasónico HC-SR04': 'const int TRIG = 5, ECHO = 18;\nvoid setup() { Serial.begin(115200); pinMode(TRIG, OUTPUT); pinMode(ECHO, INPUT); }\nvoid loop() {\n  digitalWrite(TRIG, LOW); delayMicroseconds(2);\n  digitalWrite(TRIG, HIGH); delayMicroseconds(10); digitalWrite(TRIG, LOW);\n  long cm = pulseIn(ECHO, HIGH, 30000UL) / 58;\n  Serial.println(cm);\n  delay(60);\n}\n' },
  };

  function lintCpp(src) {
    const res = [], code = src.replace(/\/\/.*|\/\*[\s\S]*?\*\//g, '');
    const has = (re) => re.test(code), ok = (c, t) => res.push([c, t]);
    ok(has(/void\s+setup\s*\(/), 'Función setup() presente'); ok(has(/void\s+loop\s*\(/), 'Función loop() presente');
    const o = (code.match(/\{/g) || []).length, c = (code.match(/\}/g) || []).length; ok(o === c, o === c ? 'Llaves balanceadas' : `Llaves desbalanceadas ({ ${o} · } ${c})`);
    const op = (code.match(/\(/g) || []).length, cp = (code.match(/\)/g) || []).length; ok(op === cp, op === cp ? 'Paréntesis balanceados' : `Paréntesis desbalanceados (( ${op} · ) ${cp})`);
    const missing = code.split('\n').filter((l) => /^\s*(digitalWrite|pinMode|delay|Serial\.\w+)\(.*\)\s*$/.test(l)).length;
    ok(missing === 0, missing ? `${missing} línea(s) sin punto y coma` : 'Sentencias terminadas con ;');
    if (has(/Serial\.(print|println)/) && !has(/Serial\.begin/)) ok(false, 'Usas Serial sin Serial.begin()');
    const pins = [...new Set([...code.matchAll(/pinMode\(\s*(\w+)\s*,\s*(\w+)\s*\)/g)].map((m) => m[1] + ' → ' + m[2]))];
    return { res, pins };
  }

  N.registerApp('ide', {
    title: 'Código', icon: '⌨', desc: 'HTML · CSS · JS · C++ con consola y vista responsive', w: 920, h: 620,
    init: () => ({ tab: 'html', dev: 'full', layout: 'row', auto: true,
      html: '<main class="wrap">\n  <h1>Hola NEXUS</h1>\n  <button id="b">Contar</button>\n  <p id="o">0</p>\n</main>',
      css: 'body{font-family:system-ui;margin:0;background:#0f1220;color:#eaedff}\n.wrap{padding:24px}\nh1{color:#7b8cff}\nbutton{padding:8px 16px;border-radius:8px;border:0;background:#7b8cff;color:#fff;cursor:pointer}',
      js: "let n = 0;\nb.onclick = () => { o.textContent = ++n; console.log('clic', n); };",
      cpp: '// Sketch Arduino\nconst int LED = 13;\n\nvoid setup() {\n  pinMode(LED, OUTPUT);\n}\n\nvoid loop() {\n  digitalWrite(LED, HIGH);\n  delay(500);\n  digitalWrite(LED, LOW);\n  delay(500);\n}\n' }),
    mount(root, ctx) {
      const d = ctx.data; d.dev ||= 'full'; d.layout ||= 'row'; d.auto ??= true;
      root.classList.add('app');
      const gutter = h('div', { style: { position: 'absolute', left: 0, top: 0, bottom: 0, width: '42px', overflow: 'hidden', background: 'color-mix(in srgb,var(--panel2) 60%,transparent)', borderRight: '1px solid var(--border)', color: 'var(--muted)', font: '12.5px/1.55 ui-monospace,Consolas,monospace', textAlign: 'right', padding: '12px 8px 0 0', whiteSpace: 'pre', userSelect: 'none' } });
      const pre = h('pre', { style: { left: '42px' } }), ta = h('textarea', { spellcheck: 'false', style: { left: '42px' } });
      const ed = h('div', { class: 'ed' }, gutter, pre, ta);
      const tabs = h('div', { class: 'tabs' }), status = h('div', { class: 'statusbar' });
      const frame = h('iframe', { sandbox: 'allow-scripts', style: { border: 0, width: '100%', height: '100%', background: '#fff', borderRadius: '0' } });
      const stage = h('div', { style: { flex: 1, minHeight: 0, display: 'flex', justifyContent: 'center', alignItems: 'stretch', background: 'repeating-conic-gradient(color-mix(in srgb,var(--panel2) 70%,transparent) 0 25%,transparent 0 50%) 0 0/16px 16px', overflow: 'auto' } }, h('div', { style: { height: '100%', transition: '.25s' } }, frame));
      const cons = h('div', { class: 'mono', style: { flex: 1, overflow: 'auto', padding: '6px 10px', background: '#05070b' } });
      const consBadge = h('span', { class: 'badge' }, '0');
      const consHead = h('div', { class: 'toolbar', style: { padding: '3px 10px' } }, h('b', {}, 'Consola'), consBadge, h('span', { style: { flex: 1 } }), h('button', { class: 'chip', onclick: () => { cons.replaceChildren(); consBadge.textContent = '0'; consBadge.className = 'badge'; } }, 'Limpiar'));
      const consWrap = h('div', { style: { height: '120px', display: 'flex', flexDirection: 'column', borderTop: '1px solid var(--border)' } }, consHead, cons);
      const lintBox = h('div', { class: 'pad col', style: { flex: 1, overflow: 'auto' } });
      const previewCol = h('div', { style: { flex: 1, minWidth: 0, minHeight: 0, display: 'flex', flexDirection: 'column', borderLeft: '1px solid var(--border)' } }, stage, consWrap);
      const split = h('div', { style: { display: 'flex', flex: 1, minHeight: 0 } }, h('div', { style: { flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 } }, tabs, ed), previewCol, lintBox);

      /* barra de herramientas */
      const snipSel = h('select', { title: 'Insertar fragmento', onchange: (e) => { const s = SNIPPETS[d.tab]?.[e.target.value]; e.target.value = ''; if (!s) return; ta.focus(); ta.setRangeText(s, ta.selectionStart, ta.selectionEnd, 'end'); ta.dispatchEvent(new Event('input')); } });
      const devSeg = h('div', { class: 'seg', title: 'Tamaño de la vista previa' }), layoutSeg = h('div', { class: 'seg' });
      const toolbar = h('div', { class: 'toolbar' },
        h('button', { class: 'btn primary', title: 'Ejecutar (Ctrl+Enter)', onclick: () => run() }, '▶ Ejecutar'),
        h('label', { class: 'row', style: { gap: '4px', fontSize: '12px' }, title: 'Ejecutar automáticamente al escribir' }, h('input', { type: 'checkbox', checked: d.auto || null, onchange: (e) => { d.auto = e.target.checked; ctx.save(); } }), 'Auto'),
        h('span', { class: 'sep' }), snipSel, h('span', { style: { flex: 1 } }), devSeg, layoutSeg, h('span', { class: 'sep' }),
        h('button', { class: 'btn', title: 'Exportar como una página HTML independiente', onclick: () => N.download('pagina.html', page(true), 'text/html') }, '⬇ HTML'));
      root.append(toolbar, split, status);

      function drawToolbar() {
        devSeg.replaceChildren(...[['mobile', '📱', '375 px'], ['tablet', '📟', '768 px'], ['full', '🖥', 'ancho completo']].map(([k, i, t]) => h('button', { class: d.dev === k ? 'on' : '', title: t, onclick: () => { d.dev = k; drawToolbar(); ctx.save(); } }, i)));
        layoutSeg.replaceChildren(...[['row', '◫', 'Editor y vista lado a lado'], ['col', '⬒', 'Editor arriba, vista abajo']].map(([k, i, t]) => h('button', { class: d.layout === k ? 'on' : '', title: t, onclick: () => { d.layout = k; drawToolbar(); ctx.save(); } }, i)));
        const w = { mobile: '375px', tablet: '768px', full: '100%' }[d.dev]; stage.firstChild.style.width = w; stage.firstChild.style.boxShadow = d.dev === 'full' ? 'none' : '0 0 0 1px var(--border),0 10px 30px rgba(0,0,0,.4)';
        split.style.flexDirection = d.layout; previewCol.style.borderLeft = d.layout === 'row' ? '1px solid var(--border)' : '0'; previewCol.style.borderTop = d.layout === 'col' ? '1px solid var(--border)' : '0';
        snipSel.replaceChildren(h('option', { value: '' }, '＋ Fragmentos…'), ...Object.keys(SNIPPETS[d.tab] || {}).map((k) => h('option', { value: k }, k)));
        snipSel.style.display = SNIPPETS[d.tab] ? '' : 'none';
      }

      const BRIDGE = "<script>(function(){var s=function(l,a){try{parent.postMessage({nx:1,l:l,a:a.map(function(x){try{return typeof x==='object'?JSON.stringify(x):String(x)}catch(e){return String(x)}})},'*')}catch(e){}};['log','info','warn','error'].forEach(function(k){var o=console[k];console[k]=function(){s(k,[].slice.call(arguments));o.apply(console,arguments)}});addEventListener('error',function(e){s('error',[e.message+' (línea '+e.lineno+')'])});addEventListener('unhandledrejection',function(e){s('error',[String(e.reason)])})})()<\/script>";
      const page = (clean) => `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>NEXUS</title><style>${d.css}</style></head><body>${d.html}${clean ? '' : BRIDGE}<script>${d.js.replace(/<\/script>/gi, '<\\/script>')}<\/script></body></html>`;
      const run = () => { cons.replaceChildren(); consBadge.textContent = '0'; consBadge.className = 'badge'; frame.srcdoc = page(false); };
      let errs = 0;
      const onMsg = (e) => {
        if (e.source !== frame.contentWindow || !e.data?.nx) return;
        const col = { error: 'var(--bad)', warn: 'var(--warn)', info: 'var(--accent)', log: '#7CFC9a' }[e.data.l] || '#ccc';
        cons.append(h('div', { style: { color: col, borderBottom: '1px solid #ffffff10', padding: '1px 0' } }, (e.data.l === 'error' ? '✖ ' : e.data.l === 'warn' ? '⚠ ' : '› ') + e.data.a.join(' ')));
        while (cons.children.length > 200) cons.firstChild.remove(); cons.scrollTop = 1e9;
        consBadge.textContent = cons.children.length; if (e.data.l === 'error') { consBadge.className = 'badge bad'; } else if (!consBadge.className.includes('bad')) consBadge.className = 'badge ok';
      };
      addEventListener('message', onMsg); ctx.onCleanup(() => removeEventListener('message', onMsg));

      function lines() { const n = ta.value.split('\n').length; gutter.textContent = Array.from({ length: n }, (_, i) => i + 1).join('\n'); return n; }
      function drawStatus() {
        const pos = ta.value.slice(0, ta.selectionStart).split('\n'), n = ta.value.split('\n').length;
        status.replaceChildren(h('span', {}, 'Ln ', h('b', {}, pos.length), ', Col ', h('b', {}, pos[pos.length - 1].length + 1)), h('span', {}, h('b', {}, n), ' líneas'), h('span', {}, h('b', {}, ta.value.length), ' caracteres'), h('span', {}, { html: 'HTML', css: 'CSS', js: 'JavaScript', cpp: 'C++ (Arduino)' }[d.tab]), h('span', { style: { marginLeft: 'auto' } }, h('span', { class: 'kbd' }, 'Ctrl'), '+', h('span', { class: 'kbd' }, 'Enter'), ' ejecutar'));
      }
      function drawLint() {
        const L = lintCpp(d.cpp);
        lintBox.replaceChildren(h('h4', { class: 'sec' }, 'Verificación del sketch'), ...L.res.map(([ok, t]) => h('div', { class: 'row' }, h('span', { class: 'badge ' + (ok ? 'ok' : 'bad') }, ok ? '✓' : '✖'), t)),
          h('h4', { class: 'sec' }, 'Pines configurados'), L.pins.length ? h('table', { class: 't' }, L.pins.map((p) => h('tr', {}, h('td', { class: 'mono' }, p)))) : h('div', { class: 'empty' }, 'Sin pinMode() detectados'),
          h('div', { class: 'row' }, h('button', { class: 'btn', onclick: () => N.download('sketch.ino', d.cpp, 'text/plain') }, '⬇ .ino'), h('button', { class: 'btn', onclick: () => { navigator.clipboard?.writeText(d.cpp); N.toast('Sketch copiado', 'ok'); } }, 'Copiar')),
          h('small', { style: { color: 'var(--muted)' } }, 'Verificación estática básica; no sustituye al compilador de Arduino IDE.'));
      }

      function sync() { pre.innerHTML = highlight(ta.value, d.tab); lines(); drawStatus(); }
      function setTab(k) {
        d.tab = k; ta.value = d[k]; sync();
        tabs.replaceChildren(...[['html', 'HTML', '#e8683b'], ['css', 'CSS', '#4aa3ff'], ['js', 'JS', '#f0d94a'], ['cpp', 'C++', '#2ec4b6']].map(([id, n, c]) => h('div', { class: 'tab' + (id === k ? ' on' : ''), onclick: () => setTab(id) }, h('span', { style: { color: c } }, '● '), n)));
        const cpp = k === 'cpp'; previewCol.style.display = cpp ? 'none' : 'flex'; lintBox.style.display = cpp ? 'flex' : 'none'; if (cpp) drawLint();
        drawToolbar();
      }
      let t;
      ta.addEventListener('input', () => { d[d.tab] = ta.value; sync(); ctx.save(); if (d.tab === 'cpp') drawLint(); else if (d.auto) { clearTimeout(t); t = setTimeout(run, 450); } });
      ta.addEventListener('scroll', () => { pre.scrollTop = ta.scrollTop; pre.scrollLeft = ta.scrollLeft; gutter.scrollTop = ta.scrollTop; });
      ['keyup', 'click'].forEach((ev) => ta.addEventListener(ev, drawStatus));
      ta.addEventListener('keydown', (e) => {
        if (e.key === 'Tab') { e.preventDefault(); ta.setRangeText('  ', ta.selectionStart, ta.selectionEnd, 'end'); ta.dispatchEvent(new Event('input')); }
        else if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); if (d.tab !== 'cpp') run(); }
        else if (e.key === 'Enter') { // autoindentado
          const s = ta.selectionStart, line = ta.value.slice(0, s).split('\n').pop(), ind = line.match(/^\s*/)[0] + (/[{(\[]\s*$/.test(line) ? '  ' : '');
          e.preventDefault(); ta.setRangeText('\n' + ind, s, ta.selectionEnd, 'end'); ta.dispatchEvent(new Event('input'));
        } else if ([')', ']', '}', '"'].includes(e.key) && ta.selectionStart === ta.selectionEnd && ta.value[ta.selectionStart] === e.key) {
          e.preventDefault(); ta.selectionStart = ta.selectionEnd = ta.selectionStart + 1; // saltar el cierre ya escrito
        } else if (['{', '(', '[', '"'].includes(e.key) && ta.selectionStart === ta.selectionEnd) { // cierre automático
          const close = { '{': '}', '(': ')', '[': ']', '"': '"' }[e.key]; e.preventDefault(); const s = ta.selectionStart; ta.setRangeText(e.key + close, s, s, 'start'); ta.selectionStart = ta.selectionEnd = s + 1; ta.dispatchEvent(new Event('input'));
        }
      });
      N.on('ide:load', (o) => { if (o.id === ctx.win.id) { d.cpp = o.cpp; setTab('cpp'); ctx.save(); } });
      setTab(d.tab); run();
    },
  });
})();
