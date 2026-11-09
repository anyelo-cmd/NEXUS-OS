/* Módulo 2a — Documento: editor por bloques estilo Notion.
   Menú "/", formato en línea (Ctrl+B/I/U), atajos Markdown, plantillas, callouts, tablas, Kanban, estadísticas y exportación. */
(function () {
  const N = window.NEXUS, h = N.h;
  const TYPES = {
    p: ['Texto', '¶', 'Párrafo normal'], h1: ['Título 1', 'H1', 'Sección grande'], h2: ['Título 2', 'H2', 'Subsección'], h3: ['Título 3', 'H3', 'Encabezado menor'],
    bullet: ['Lista', '•', 'Viñetas'], numbered: ['Lista numerada', '1.', 'Pasos ordenados'], todo: ['Tarea', '☑', 'Casilla de verificación'],
    quote: ['Cita', '❝', 'Texto destacado'], callout: ['Llamada', '💡', 'Aviso resaltado'], code: ['Código', '</>', 'Bloque monoespaciado'],
    divider: ['Divisor', '—', 'Línea separadora'], table: ['Tabla', '▦', 'Filas y columnas'], kanban: ['Kanban', '▥', 'Tablero de tarjetas'],
  };
  const TEXTUAL = new Set(['p', 'h1', 'h2', 'h3', 'bullet', 'numbered', 'todo', 'quote', 'callout', 'code']);
  const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  /* Solo se permiten etiquetas de formato en línea: protege contra HTML malicioso en archivos importados */
  const ALLOWED = new Set(['B', 'STRONG', 'I', 'EM', 'U', 'S', 'STRIKE', 'CODE', 'BR']);
  function clean(html) {
    const t = document.createElement('template'); t.innerHTML = html;
    (function walk(n) {
      [...n.childNodes].forEach((c) => {
        if (c.nodeType === 3) return;
        if (c.nodeType !== 1) return c.remove();
        if (!ALLOWED.has(c.tagName)) { walk(c); c.replaceWith(...c.childNodes); return; }
        [...c.attributes].forEach((a) => c.removeAttribute(a.name)); walk(c);
      });
    })(t.content);
    return t.innerHTML;
  }
  const htmlOf = (b) => (b.html != null ? clean(b.html) : esc(b.text || ''));
  const plain = (html) => { const d = document.createElement('div'); d.innerHTML = html; return d.textContent; };

  const newBlock = (t = 'p', text = '') => {
    const b = { id: N.uid(), t, text, html: esc(text) };
    if (t === 'table') b.rows = [['Concepto', 'Valor'], ['', '']];
    if (t === 'kanban') b.cols = [{ name: 'Por hacer', cards: [] }, { name: 'En curso', cards: [] }, { name: 'Hecho', cards: [] }];
    if (t === 'callout') b.icon = '💡';
    return b;
  };
  const B = (t, text) => newBlock(t, text);

  const TEMPLATES = {
    blank: ['En blanco', () => [B('h1', 'Documento sin título'), B('p', '')]],
    acta: ['Acta de reunión', () => [B('h1', 'Acta de reunión'), B('callout', 'Fecha, lugar y asistentes'), B('h2', 'Orden del día'), B('numbered', 'Tema 1'), B('numbered', 'Tema 2'), B('h2', 'Decisiones'), B('bullet', ''), B('h2', 'Compromisos'), Object.assign(B('table'), { rows: [['Responsable', 'Tarea', 'Fecha'], ['', '', '']] })]],
    propuesta: ['Propuesta comercial', () => [B('h1', 'Propuesta comercial'), B('quote', 'Una frase que resuma el valor de la propuesta.'), B('h2', 'Contexto'), B('p', ''), B('h2', 'Alcance'), B('todo', 'Entregable 1'), B('todo', 'Entregable 2'), B('h2', 'Inversión'), Object.assign(B('table'), { rows: [['Concepto', 'Cantidad', 'Valor'], ['', '', '']] }), B('divider'), B('p', 'Vigencia de la oferta: 15 días.')]],
    informe: ['Informe semanal', () => [B('h1', 'Informe semanal'), B('callout', 'Resumen ejecutivo en tres líneas.'), B('h2', 'Logros'), B('bullet', ''), B('h2', 'Bloqueos'), B('bullet', ''), B('h2', 'Tablero'), B('kanban')]],
  };

  /* ---------- Exportación ---------- */
  const inlineMd = (html) => plain(html.replace(/<(b|strong)>/gi, '**').replace(/<\/(b|strong)>/gi, '**').replace(/<(i|em)>/gi, '*').replace(/<\/(i|em)>/gi, '*').replace(/<code>|<\/code>/gi, '`').replace(/<br>/gi, ' '));
  function toMarkdown(blocks, title) {
    const out = ['# ' + title, '']; let n = 0;
    for (const b of blocks) {
      const t = inlineMd(htmlOf(b)); n = b.t === 'numbered' ? n + 1 : 0;
      if (b.t === 'h1') out.push('# ' + t); else if (b.t === 'h2') out.push('## ' + t); else if (b.t === 'h3') out.push('### ' + t);
      else if (b.t === 'bullet') out.push('- ' + t); else if (b.t === 'numbered') out.push(`${n}. ${t}`); else if (b.t === 'todo') out.push(`- [${b.done ? 'x' : ' '}] ${t}`);
      else if (b.t === 'quote') out.push('> ' + t); else if (b.t === 'callout') out.push(`> ${b.icon || '💡'} ${t}`); else if (b.t === 'code') out.push('```\n' + plain(htmlOf(b)) + '\n```');
      else if (b.t === 'divider') out.push('---');
      else if (b.t === 'table') b.rows.forEach((r, i) => { out.push('| ' + r.join(' | ') + ' |'); if (!i) out.push('|' + r.map(() => '---').join('|') + '|'); });
      else if (b.t === 'kanban') b.cols.forEach((c) => { out.push('**' + c.name + '**'); c.cards.forEach((k) => out.push('- ' + k)); });
      else out.push(t);
      out.push('');
    }
    return out.join('\n');
  }
  function toHTML(blocks, title) {
    let n = 0;
    const body = blocks.map((b) => {
      const t = htmlOf(b); n = b.t === 'numbered' ? n + 1 : 0;
      const m = { h1: `<h1>${t}</h1>`, h2: `<h2>${t}</h2>`, h3: `<h3>${t}</h3>`, bullet: `<p>• ${t}</p>`, numbered: `<p>${n}. ${t}</p>`, todo: `<p>${b.done ? '☑' : '☐'} ${t}</p>`, quote: `<blockquote>${t}</blockquote>`, callout: `<div class="co">${esc(b.icon || '💡')} ${t}</div>`, code: `<pre>${t}</pre>`, divider: '<hr>' };
      if (m[b.t]) return m[b.t];
      if (b.t === 'table') return `<table>${b.rows.map((r, i) => '<tr>' + r.map((c) => `<${i ? 'td' : 'th'}>${esc(c)}</${i ? 'td' : 'th'}>`).join('') + '</tr>').join('')}</table>`;
      if (b.t === 'kanban') return b.cols.map((c) => `<h3>${esc(c.name)}</h3><ul>${c.cards.map((k) => `<li>${esc(k)}</li>`).join('')}</ul>`).join('');
      return `<p>${t}</p>`;
    }).join('\n');
    return `<!doctype html><html><head><meta charset="utf-8"><title>${esc(title)}</title><style>
      body{font-family:Calibri,Arial,sans-serif;max-width:780px;margin:40px auto;color:#1b2030;line-height:1.55}h1{border-bottom:2px solid #6c8cff;padding-bottom:6px}
      table{border-collapse:collapse;width:100%}td,th{border:1px solid #bbb;padding:5px 8px;text-align:left}th{background:#eef1ff}pre{background:#f1f1f5;padding:10px;border-radius:6px}
      blockquote{border-left:3px solid #6c8cff;margin-left:0;padding-left:12px;color:#555}.co{background:#fff7e0;border:1px solid #f0d78a;border-radius:6px;padding:8px 12px}</style></head><body>${body}</body></html>`;
  }

  N.registerApp('notes', {
    title: 'Documento', icon: '📝', desc: 'Editor por bloques · plantillas · Kanban · exportar', w: 560, h: 640,
    init: () => ({ blocks: TEMPLATES.blank[1]() }),
    mount(root, ctx) {
      const d = ctx.data;
      d.blocks.forEach((b) => { if (b.html == null) b.html = esc(b.text || ''); });
      root.classList.add('app'); root.style.position = 'relative';
      const sheet = h('div', { style: { maxWidth: '720px', margin: '0 auto', padding: '22px 26px 80px' } });
      const scroll = h('div', { class: 'scroll' }, sheet);
      const stat = h('div', { class: 'statusbar' });
      let menu = null, menuIdx = 0, menuBlock = null, focusId = null;

      const fmt = (cmd) => (e) => { e.preventDefault(); document.execCommand(cmd); };
      const tbtn = (label, title, cmd, style) => h('button', { class: 'btn', title, style, onmousedown: fmt(cmd) }, label);
      const tpl = h('select', { title: 'Plantillas', onchange: (e) => { const k = e.target.value; e.target.value = ''; if (k && confirm('Reemplazar el contenido actual por la plantilla "' + TEMPLATES[k][0] + '"?')) { d.blocks = TEMPLATES[k][1](); draw(); } } },
        h('option', { value: '' }, '▤ Plantillas…'), Object.entries(TEMPLATES).map(([k, v]) => h('option', { value: k }, v[0])));
      const exp = (name, label, fn) => h('button', { class: 'btn', onclick: fn }, label);
      root.append(h('div', { class: 'toolbar' }, tpl, h('span', { class: 'sep' }),
        tbtn('B', 'Negrita (Ctrl+B)', 'bold', { fontWeight: '800' }), tbtn('I', 'Cursiva (Ctrl+I)', 'italic', { fontStyle: 'italic' }), tbtn('U', 'Subrayado (Ctrl+U)', 'underline', { textDecoration: 'underline' }), tbtn('S', 'Tachado', 'strikeThrough', { textDecoration: 'line-through' }),
        h('span', { class: 'sep' }), h('button', { class: 'btn', title: 'Añadir bloque al final', onclick: () => { const b = newBlock(); d.blocks.push(b); focusId = b.id; draw(); } }, '+ Bloque'),
        h('span', { style: { flex: 1 } }),
        exp('md', '.md', () => N.download(ctx.win.title + '.md', toMarkdown(d.blocks, ctx.win.title), 'text/markdown')),
        h('button', { class: 'btn', title: 'Word abre este HTML como documento', onclick: () => N.download(ctx.win.title + '.doc', toHTML(d.blocks, ctx.win.title), 'application/msword') }, 'Word'),
        h('button', { class: 'btn', title: 'Abre impresión: elige "Guardar como PDF"', onclick: () => { const f = window.open('', '_blank'); if (!f) return N.toast('Permite ventanas emergentes para exportar PDF', 'warn'); f.document.write(toHTML(d.blocks, ctx.win.title)); f.document.close(); f.focus(); setTimeout(() => f.print(), 300); } }, 'PDF')),
        scroll, stat);

      function updateStats() {
        const text = d.blocks.map((b) => (b.t === 'table' ? b.rows.flat().join(' ') : b.t === 'kanban' ? b.cols.flatMap((c) => c.cards).join(' ') : plain(htmlOf(b)))).join(' ');
        const words = (text.match(/\S+/g) || []).length, tasks = d.blocks.filter((b) => b.t === 'todo'), done = tasks.filter((b) => b.done).length;
        stat.replaceChildren(h('span', {}, h('b', {}, words), ' palabras'), h('span', {}, h('b', {}, text.length), ' caracteres'), h('span', {}, '≈ ', h('b', {}, Math.max(1, Math.round(words / 200))), ' min lectura'), h('span', {}, h('b', {}, d.blocks.length), ' bloques'),
          tasks.length ? h('span', {}, 'Tareas ', h('b', {}, `${done}/${tasks.length}`)) : '', h('span', { style: { marginLeft: 'auto' } }, 'Escribe ', h('span', { class: 'kbd' }, '/'), ' para insertar'));
      }

      /* ----- menú "/" ----- */
      function closeMenu() { menu?.remove(); menu = null; }
      function openMenu(b, tx, q) {
        const items = Object.entries(TYPES).filter(([k, v]) => !q || (v[0] + k).toLowerCase().includes(q.toLowerCase()));
        if (!items.length) return closeMenu();
        menuBlock = b; menuIdx = Math.min(menuIdx, items.length - 1);
        menu?.remove();
        const r = tx.getBoundingClientRect(), rr = root.getBoundingClientRect();
        menu = h('div', { class: 'menu', style: { left: Math.max(6, r.left - rr.left) + 'px', top: Math.min(r.bottom - rr.top + 4, rr.height - 270) + 'px' } },
          items.map(([k, v], i) => h('div', { class: 'mi' + (i === menuIdx ? ' sel' : ''), onmousedown: (e) => { e.preventDefault(); pick(k); } }, h('span', { style: { width: '26px', textAlign: 'center', fontWeight: '700' } }, v[1]), h('div', {}, v[0], h('br'), h('small', {}, v[2])))));
        menu._items = items.map(([k]) => k); root.append(menu);
      }
      function pick(type) { const b = menuBlock; closeMenu(); setType(b, type, true); }
      function setType(b, t, clear) {
        const keep = b.t === 'table' || b.t === 'kanban';
        const nb = newBlock(t); b.t = t; if (clear || keep) { b.text = ''; b.html = ''; } if (t === 'table') b.rows = nb.rows; if (t === 'kanban') b.cols = nb.cols; if (t === 'callout') b.icon ||= '💡';
        if (t === 'divider') { const idx = d.blocks.indexOf(b), n = newBlock(); d.blocks.splice(idx + 1, 0, n); focusId = n.id; } else focusId = b.id;
        draw();
      }

      /* ----- bloque de texto ----- */
      function textBlock(b, num) {
        const tx = h('div', { class: 'tx', contenteditable: 'true', spellcheck: 'true', 'data-ph': b.t === 'p' ? "Escribe '/' para ver los comandos…" : TYPES[b.t][0] });
        tx.innerHTML = htmlOf(b);
        tx.dataset.id = b.id;
        const sync = () => { b.html = tx.innerHTML; b.text = tx.textContent; ctx.save(); updateStats(); };
        tx.addEventListener('input', () => {
          // atajos Markdown al inicio del bloque
          const t = tx.textContent, rules = [['# ', 'h1'], ['## ', 'h2'], ['### ', 'h3'], ['- ', 'bullet'], ['* ', 'bullet'], ['1. ', 'numbered'], ['[] ', 'todo'], ['> ', 'quote'], ['```', 'code']];
          const hit = b.t === 'p' && rules.find(([k]) => t === k);
          if (hit) { b.t = hit[1]; b.text = ''; b.html = ''; focusId = b.id; return draw(); }
          if (b.t === 'p' && t === '---') { b.t = 'divider'; const n = newBlock(); d.blocks.splice(d.blocks.indexOf(b) + 1, 0, n); focusId = n.id; return draw(); }
          sync();
          if (t.startsWith('/') && TEXTUAL.has(b.t)) openMenu(b, tx, t.slice(1)); else closeMenu();
        });
        tx.addEventListener('blur', () => setTimeout(closeMenu, 120));
        tx.addEventListener('keydown', (e) => {
          if (menu) {
            const n = menu._items.length;
            if (e.key === 'ArrowDown') { e.preventDefault(); menuIdx = (menuIdx + 1) % n; return openMenu(b, tx, tx.textContent.slice(1)); }
            if (e.key === 'ArrowUp') { e.preventDefault(); menuIdx = (menuIdx - 1 + n) % n; return openMenu(b, tx, tx.textContent.slice(1)); }
            if (e.key === 'Enter') { e.preventDefault(); return pick(menu._items[menuIdx]); }
            if (e.key === 'Escape') { e.preventDefault(); return closeMenu(); }
          }
          const mod = e.ctrlKey || e.metaKey;
          if (mod && ['b', 'i', 'u'].includes(e.key.toLowerCase())) { e.preventDefault(); document.execCommand({ b: 'bold', i: 'italic', u: 'underline' }[e.key.toLowerCase()]); return; }
          const caretAtStart = () => { const s = getSelection(); if (!s.rangeCount || !s.isCollapsed) return false; const r = document.createRange(); r.selectNodeContents(tx); r.setEnd(s.anchorNode, s.anchorOffset); return r.toString().length === 0; };
          if (e.key === 'Enter' && !e.shiftKey && b.t !== 'code') {
            e.preventDefault();
            const list = ['bullet', 'numbered', 'todo'].includes(b.t);
            if (list && !tx.textContent.trim()) { b.t = 'p'; focusId = b.id; return draw(); } // Enter en lista vacía = salir de la lista
            const s = getSelection(), r = s.getRangeAt(0), tail = document.createRange(); tail.selectNodeContents(tx); tail.setStart(r.endContainer, r.endOffset);
            const box = document.createElement('div'); box.append(tail.extractContents());
            sync(); const nb = newBlock(list ? b.t : 'p'); nb.html = clean(box.innerHTML); nb.text = plain(nb.html);
            d.blocks.splice(d.blocks.indexOf(b) + 1, 0, nb); focusId = nb.id; draw();
          } else if (e.key === 'Backspace' && caretAtStart()) {
            if (b.t !== 'p') { e.preventDefault(); b.t = 'p'; focusId = b.id; return draw(); }
            const i = d.blocks.indexOf(b), prev = d.blocks[i - 1];
            if (prev && TEXTUAL.has(prev.t)) { e.preventDefault(); prev.html = htmlOf(prev) + htmlOf(b); prev.text = plain(prev.html); d.blocks.splice(i, 1); focusId = prev.id; draw(); }
            else if (prev && !tx.textContent) { e.preventDefault(); d.blocks.splice(i, 1); focusId = prev.id; draw(); }
          }
        });
        const inner = h('div', { class: 'tx-wrap', style: { flex: 1, minWidth: 0, display: 'flex', gap: '6px' } });
        if (b.t === 'todo') inner.append(h('input', { type: 'checkbox', checked: b.done || null, style: { marginTop: '5px' }, onchange: (e) => { b.done = e.target.checked; tx.style.textDecoration = b.done ? 'line-through' : ''; tx.style.opacity = b.done ? '.55' : ''; ctx.save(); updateStats(); } }));
        if (b.t === 'bullet') inner.append(h('span', { style: { width: '14px', textAlign: 'center', lineHeight: '1.9' } }, '•'));
        if (b.t === 'numbered') inner.append(h('span', { style: { minWidth: '22px', color: 'var(--muted)', lineHeight: '1.9' } }, num + '.'));
        if (b.t === 'callout') inner.append(h('span', { title: 'Cambiar icono', style: { cursor: 'pointer', fontSize: '18px' }, onclick: () => { const ic = prompt('Icono (emoji):', b.icon || '💡'); if (ic) { b.icon = ic.slice(0, 4); draw(); } } }, b.icon || '💡'));
        if (b.t === 'todo' && b.done) { tx.style.textDecoration = 'line-through'; tx.style.opacity = '.55'; }
        inner.append(tx);
        return inner;
      }

      function tableEl(b) {
        const t = h('table', { class: 't' }, b.rows.map((r, ri) => h('tr', {}, r.map((c, ci) => h('td', {}, h('input', { value: c, style: ri === 0 ? { fontWeight: '700' } : {}, oninput: (e) => { b.rows[ri][ci] = e.target.value; ctx.save(); updateStats(); } }))))));
        return h('div', { style: { flex: 1, minWidth: 0 } }, t, h('div', { class: 'row', style: { marginTop: '6px' } },
          h('button', { class: 'chip', onclick: () => { b.rows.push(b.rows[0].map(() => '')); draw(); } }, '+ fila'), h('button', { class: 'chip', onclick: () => { b.rows.forEach((r) => r.push('')); draw(); } }, '+ columna'),
          h('button', { class: 'chip', onclick: () => { if (b.rows.length > 1) { b.rows.pop(); draw(); } } }, '− fila'), h('button', { class: 'chip', onclick: () => { if (b.rows[0].length > 1) { b.rows.forEach((r) => r.pop()); draw(); } } }, '− columna')));
      }
      function kanbanEl(b) {
        let dragging = null;
        return h('div', { class: 'kanban', style: { flex: 1, minWidth: 0 } }, b.cols.map((c, ci) => {
          const col = h('div', { class: 'kcol' }, h('div', { class: 'row', style: { justifyContent: 'space-between' } }, h('b', {}, c.name), h('span', { class: 'chip' }, c.cards.length)));
          col.addEventListener('dragover', (e) => e.preventDefault());
          col.addEventListener('drop', () => { if (!dragging) return; b.cols[dragging.ci].cards.splice(dragging.i, 1); c.cards.push(dragging.text); draw(); });
          c.cards.forEach((txt, i) => {
            const k = h('div', { class: 'kcard', draggable: 'true', title: 'Arrastra para mover · doble clic para eliminar' }, txt);
            k.addEventListener('dragstart', () => (dragging = { ci, i, text: txt }));
            k.addEventListener('dblclick', () => { c.cards.splice(i, 1); draw(); });
            col.append(k);
          });
          col.append(h('button', { class: 'chip', onclick: () => { const t = prompt('Nueva tarjeta'); if (t) { c.cards.push(t); draw(); } } }, '+ tarjeta'));
          return col;
        }));
      }

      function blockEl(b, i, num) {
        const ctl = h('div', { class: 'blk-ctl', style: { display: 'flex', flexDirection: 'column', opacity: 0, transition: '.15s' } },
          h('span', { style: { cursor: 'pointer', fontSize: '10px', color: 'var(--muted)' }, title: 'Subir', onclick: () => { if (i) { [d.blocks[i - 1], d.blocks[i]] = [d.blocks[i], d.blocks[i - 1]]; draw(); } } }, '▲'),
          h('span', { style: { cursor: 'pointer', fontSize: '10px', color: 'var(--muted)' }, title: 'Eliminar', onclick: () => { d.blocks.splice(i, 1); if (!d.blocks.length) d.blocks.push(newBlock()); draw(); } }, '✕'),
          h('span', { style: { cursor: 'pointer', fontSize: '10px', color: 'var(--muted)' }, title: 'Bajar', onclick: () => { if (i < d.blocks.length - 1) { [d.blocks[i + 1], d.blocks[i]] = [d.blocks[i], d.blocks[i + 1]]; draw(); } } }, '▼'));
        const row = h('div', { class: 'blk ' + b.t, style: { alignItems: 'flex-start', padding: b.t === 'h1' ? '10px 0 2px' : '1px 0' } }, ctl);
        row.addEventListener('mouseenter', () => (ctl.style.opacity = 1)); row.addEventListener('mouseleave', () => (ctl.style.opacity = 0));
        if (b.t === 'divider') row.append(h('hr', { style: { flex: 1, margin: '12px 0' } }));
        else if (b.t === 'table') row.append(tableEl(b));
        else if (b.t === 'kanban') row.append(kanbanEl(b));
        else { const inner = textBlock(b, num); if (b.t === 'callout') { row.classList.add('callout'); } row.append(inner); }
        return row;
      }

      function draw() {
        let n = 0;
        sheet.replaceChildren(...d.blocks.map((b, i) => { n = b.t === 'numbered' ? n + 1 : 0; return blockEl(b, i, n); }));
        if (focusId) { const el = sheet.querySelector(`.tx[data-id="${focusId}"]`); if (el) { el.focus(); const r = document.createRange(); r.selectNodeContents(el); r.collapse(false); const s = getSelection(); s.removeAllRanges(); s.addRange(r); } focusId = null; }
        ctx.save(); updateStats();
      }
      draw();
    },
  });

  N.createReportDoc = (title, lines) => N.createWindow('notes', { title, data: { blocks: [newBlock('h1', title), ...lines.map((l) => newBlock('p', l))] } });
})();
