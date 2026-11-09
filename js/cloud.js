/* NEXUS OS — conexión con Supabase: cuentas en la nube. Cada cuenta que se crea queda registrada
   automáticamente en la base de datos (perfil y registro de actividad se generan por triggers). */
(function () {
  const N = window.NEXUS;
  const URL_ = 'https://hvltjcxjkjluwhjxxvkm.supabase.co', KEY = 'sb_publishable_CAnbKNfDUWJyPfHyLWxCdA_9NgLP72t';
  const LIB = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.min.js';
  let client = null;
  const loadLib = () => window.supabase ? Promise.resolve() : new Promise((res, rej) => {
    const s = document.createElement('script'); s.src = LIB; s.onload = res; s.onerror = () => rej(new Error('Sin conexión con la base de datos (revisa tu internet).'));
    document.head.append(s);
  });
  const emailFor = (u) => (u.includes('@') ? u.trim().toLowerCase() : u.trim().toLowerCase() + '@nexus-os.app');
  const cleanName = (e) => String(e || '').replace(/@nexus-os\.app$/i, '');

  N.cloud = {
    client: async () => { await loadLib(); return (client ||= window.supabase.createClient(URL_, KEY)); },
    emailFor, cleanName,
    async signUp(username, password) {
      const u = username.trim().toLowerCase();
      if (!/^[a-z0-9_.-]{3,24}$/.test(u)) throw new Error('Usuario: 3 a 24 caracteres (letras, números, . _ -).');
      if (u === 'anyelo') throw new Error('Ese nombre está reservado.');
      if (password.length < 6) throw new Error('La contraseña debe tener al menos 6 caracteres.');
      const sb = await N.cloud.client();
      // la función «signup» crea la cuenta ya confirmada (no hace falta correo real)
      let res;
      try { res = await fetch(URL_ + '/functions/v1/signup', { method: 'POST', headers: { 'Content-Type': 'application/json', apikey: KEY, Authorization: 'Bearer ' + KEY }, body: JSON.stringify({ username: u, password }) }); }
      catch (e) { throw new Error('Sin conexión con la base de datos (revisa tu internet).'); }
      const out = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(out.error || 'No se pudo crear la cuenta.');
      const { error } = await sb.auth.signInWithPassword({ email: emailFor(u), password });
      if (error) throw new Error('Cuenta creada, pero no se pudo iniciar sesión: ' + error.message);
      return { name: u, role: 'Usuario', remote: true };
    },
    async signIn(username, password) {
      const sb = await N.cloud.client();
      const { data, error } = await sb.auth.signInWithPassword({ email: emailFor(username), password });
      if (error) throw new Error('Usuario o contraseña incorrectos.');
      const { data: p } = await sb.from('profiles').select('full_name,is_active').eq('id', data.user.id).single();
      if (p && p.is_active === false) { await sb.auth.signOut(); throw new Error('Esta cuenta está suspendida.'); }
      return { name: (p && p.full_name) || cleanName(data.user.email), role: 'Usuario', remote: true };
    },
    async signOut() { try { if (client) await client.auth.signOut(); } catch (e) {} },
  };

  /* ---------- todo lo que se hace en una cuenta se guarda en la base de datos ---------- */
  const hasToken = () => { try { return Object.keys(localStorage).some((k) => /^sb-.*-auth-token$/.test(k)); } catch (e) { return false; } };
  const session = async () => { const sb = await N.cloud.client(), { data } = await sb.auth.getSession(); return data.session ? { sb, user: data.session.user } : null; };
  let ready = false, pending = null, tm = 0, warned = false;

  // al abrir: si la nube tiene una versión más reciente del espacio de trabajo, se usa esa
  N.cloud.pull = async () => {
    if (!hasToken()) return false;
    try {
      const s = await Promise.race([session(), new Promise((r) => setTimeout(() => r('timeout'), 4000))]);
      if (!s || s === 'timeout') return false;
      const { data: row, error } = await s.sb.from('workspaces').select('data').eq('user_id', s.user.id).maybeSingle();
      if (error) return false;
      if (row && row.data && (row.data._savedAt || 0) > (N.state._savedAt || 0)) Object.assign(N.state, row.data);
      ready = true; return true;
    } catch (e) { return false; }
  };
  async function push() {
    clearTimeout(tm); const snap = pending; if (!snap || !ready || !hasToken()) return;
    try {
      const s = await session(); if (!s) return;
      if (JSON.stringify(snap).length > 8e6) { if (!warned) { warned = true; N.toast('El espacio de trabajo es demasiado grande para la nube', 'warn'); } return; }
      const { error } = await s.sb.from('workspaces').upsert({ user_id: s.user.id, data: snap, updated_at: new Date().toISOString() });
      if (!error && pending === snap) pending = null;
    } catch (e) {}
  }
  N.onSaved = (snap) => { pending = snap; clearTimeout(tm); tm = setTimeout(push, 4000); };
  N.cloud.flush = push;
  // registro de actividad de la cuenta (apps que abre, etc.)
  N.cloud.log = async (action, details = {}) => {
    if (!hasToken()) return;
    try { const s = await session(); if (s) await s.sb.from('activity_log').insert({ user_id: s.user.id, action, details }); } catch (e) {}
  };
})();
