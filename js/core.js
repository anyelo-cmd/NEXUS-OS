/* NEXUS OS — núcleo: bus de eventos, estado, persistencia offline-first (IndexedDB + localStorage) */
(function () {
  const NEXUS = (window.NEXUS = { apps: {}, _l: {} });

  NEXUS.on = (e, f) => ((NEXUS._l[e] ||= []).push(f), () => (NEXUS._l[e] = NEXUS._l[e].filter((x) => x !== f)));
  NEXUS.emit = (e, d) => (NEXUS._l[e] || []).slice().forEach((f) => f(d));
  NEXUS.uid = () => Math.random().toString(36).slice(2, 9);

  // helper DOM: h('div',{class:'x',onclick:fn},'texto',hijo)
  NEXUS.h = function (tag, attrs, ...kids) {
    const el = document.createElement(tag);
    for (const k in attrs || {}) {
      const v = attrs[k];
      if (k === 'class') el.className = v;
      else if (k === 'style' && typeof v === 'object') { for (const p in v) { if (p.startsWith('--')) el.style.setProperty(p, v[p]); else el.style[p] = v[p]; } }
      else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
      else if (k === 'value') el.value = v;
      else if (v !== false && v != null) el.setAttribute(k, v === true ? '' : v);
    }
    kids.flat(9).forEach((c) => c != null && c !== false && el.append(c.nodeType ? c : document.createTextNode(c)));
    return el;
  };

  NEXUS.toast = (msg, kind = '') => {
    const t = NEXUS.h('div', { class: 'toast ' + kind }, msg);
    document.getElementById('toasts').append(t);
    setTimeout(() => t.remove(), 4500);
  };

  NEXUS.download = (name, content, mime = 'application/json') => {
    const a = NEXUS.h('a', { href: URL.createObjectURL(new Blob([content], { type: mime })), download: name });
    document.body.append(a); a.click(); a.remove();
  };

  /* ---------- Estado ---------- */
  NEXUS.state = { v: 1, theme: 'ultron', view: { x: 0, y: 0, z: 1 }, windows: [], links: [], zTop: 1 };

  /* ---------- Persistencia ---------- */
  const DB = 'nexus-os';
  // cada cuenta de la nube tiene su propio espacio local; la cuenta local usa 'workspace'
  const keyFor = (s) => (s && s.remote && s.name ? 'workspace:' + s.name : 'workspace');
  let sess = null; try { sess = JSON.parse(localStorage.getItem('nexus-session') || 'null'); } catch (e) {}
  const KEY = keyFor(sess);
  NEXUS.keyFor = keyFor; NEXUS.storeKey = KEY;
  const idb = () => new Promise((res, rej) => {
    const r = indexedDB.open(DB, 1);
    r.onupgradeneeded = () => r.result.createObjectStore('kv');
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
  async function idbGet() {
    const db = await idb();
    return new Promise((res, rej) => { const q = db.transaction('kv').objectStore('kv').get(KEY); q.onsuccess = () => res(q.result); q.onerror = () => rej(q.error); });
  }
  async function idbSet(val) {
    const db = await idb();
    return new Promise((res, rej) => { const tx = db.transaction('kv', 'readwrite'); tx.objectStore('kv').put(val, KEY); tx.oncomplete = res; tx.onerror = () => rej(tx.error); });
  }

  NEXUS.load = async () => {
    let data = null;
    // IndexedDB puede bloquearse o no existir (file://, modo privado): nunca debe frenar el arranque
    try { data = await Promise.race([idbGet(), new Promise((r) => setTimeout(r, 500))]); } catch (e) {}
    if (!data) { try { data = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) {} }
    if (data) Object.assign(NEXUS.state, data);
    return !!data;
  };

  let timer;
  async function persist() {
    NEXUS.state._savedAt = Date.now();
    const snap = JSON.parse(JSON.stringify(NEXUS.state));
    try { await idbSet(snap); } catch (e) {}
    try { localStorage.setItem(KEY, JSON.stringify(snap)); } catch (e) { /* cuota llena: IndexedDB es la fuente principal */ }
    if (NEXUS.onSaved) NEXUS.onSaved(snap);   // la nube se entera de cada guardado
  }
  NEXUS.save = () => { clearTimeout(timer); timer = setTimeout(persist, 300); };
  NEXUS.saveNow = () => { clearTimeout(timer); return persist(); };

  /* ---------- Exportar / importar (JSON plano y respaldo cifrado AES-GCM) ---------- */
  const b64 = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf)));
  const unb64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
  async function keyFrom(pass, salt) {
    const base = await crypto.subtle.importKey('raw', new TextEncoder().encode(pass), 'PBKDF2', false, ['deriveKey']);
    return crypto.subtle.deriveKey({ name: 'PBKDF2', salt, iterations: 200000, hash: 'SHA-256' }, base, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
  }
  NEXUS.encrypt = async (text, pass) => {
    const salt = crypto.getRandomValues(new Uint8Array(16)), iv = crypto.getRandomValues(new Uint8Array(12));
    const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, await keyFrom(pass, salt), new TextEncoder().encode(text));
    return JSON.stringify({ nexusEncrypted: 1, salt: b64(salt), iv: b64(iv), data: b64(ct) });
  };
  NEXUS.decrypt = async (obj, pass) => {
    const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: unb64(obj.iv) }, await keyFrom(pass, unb64(obj.salt)), unb64(obj.data));
    return new TextDecoder().decode(pt);
  };
})();
