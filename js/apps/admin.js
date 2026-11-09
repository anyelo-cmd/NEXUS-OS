/* Panel de administración (Supabase). Solo se registra y se muestra para la cuenta local del propietario.
   Usa el mismo lenguaje visual que Configuración. Los permisos reales los aplica la base de datos (RLS). */
(function () {
  const N = window.NEXUS, h = N.h;
  const TABS = [['sum', '📊', 'Resumen'], ['users', '👥', 'Usuarios'], ['log', '📜', 'Actividad'], ['me', '👤', 'Mi cuenta']];
  const fmt = (d) => (d ? new Date(d).toLocaleString('es-CO') : '—');
  const getClient = () => N.cloud.client();

  function register() {
    if (N.apps.admin) return;
    N.registerApp('admin', {
      title: 'Administración', icon: '🛡', desc: 'Usuarios, roles y actividad (Supabase)', w: 960, h: 640, color: '#ff4fa3',
      init: () => ({ tab: 'sum' }),
      mount(root, ctx) {
        const d = ctx.data; root.classList.add('app', 'st', 'adm');
        const side = h('nav', { class: 'st-side' }), main = h('div', { class: 'st-main scroll' });
        root.append(side, main);
        let sb = null, me = null, busy = false;

        const title = (t, s) => [h('h2', {}, t), s ? h('p', { class: 'st-sub' }, s) : ''];
        const row = (label, desc, ctl) => h('div', { class: 'st-row' }, h('div', {}, h('b', {}, label), desc ? h('small', {}, desc) : ''), h('div', { class: 'st-ctl' }, ctl));
        const empty = (t) => h('div', { class: 'empty' }, t);
        const rpc = async (name, args) => { const { error } = await sb.rpc(name, args); if (error) N.toast(error.message, 'bad'); else N.toast('Hecho', 'ok'); draw(); };

        /* ---------- acceso ---------- */
        function loginView(msg = '') {
          side.replaceChildren(h('div', { class: 'st-head' }, '🛡 Administración'));
          const em = h('input', { class: 'lk-in', type: 'email', placeholder: 'Correo', value: 'anyeloq62@gmail.com', autocomplete: 'email' });
          const pw = h('input', { class: 'lk-in', type: 'password', placeholder: 'Contraseña (mín. 6)', autocomplete: 'current-password' });
          const out = h('div', { class: 'st-msg bad' }, msg);
          const run = async (kind) => {
            out.className = 'st-msg bad'; out.textContent = '';
            if (!em.value.trim() || pw.value.length < 6) { out.textContent = 'Escribe el correo y una contraseña de al menos 6 caracteres.'; return; }
            try {
              sb = await getClient();
              const cred = { email: em.value.trim(), password: pw.value };
              const { data, error } = kind === 'in' ? await sb.auth.signInWithPassword(cred) : await sb.auth.signUp(cred);
              if (error) { out.textContent = error.message; return; }
              if (!data.session) { out.className = 'st-msg ok'; out.textContent = 'Cuenta creada. Si pide confirmar el correo, revísalo.'; return; }
              start();
            } catch (e) { out.textContent = e.message; }
          };
          main.replaceChildren(...title('Acceso a Supabase', 'Entra con la cuenta de la base de datos. El rol de administrador lo decide la base de datos, no esta pantalla.'),
            h('div', { class: 'st-pw' }, em, pw, out,
              h('div', { class: 'st-btns' }, h('button', { class: 'btn primary', onclick: () => run('in') }, 'Entrar'), h('button', { class: 'btn', onclick: () => run('up') }, 'Crear cuenta normal'))));
        }

        async function start() {
          sb = await getClient();
          const { data: s } = await sb.auth.getSession();
          if (!s.session) return loginView();
          const { data: p } = await sb.from('profiles').select('*').eq('id', s.session.user.id).single();
          me = p || { email: s.session.user.email, role: 'user' };
          draw();
        }

        /* ---------- vistas ---------- */
        const VIEWS = {
          sum: async () => {
            const { data: s, error } = await sb.rpc('admin_stats');
            if (error) return [...title('Resumen'), empty(error.message)];
            const L = [['total_users', 'Usuarios'], ['active_users', 'Activos'], ['suspended_users', 'Suspendidos'], ['admins', 'Administradores'], ['signups_7d', 'Registros (7 días)'], ['logins_24h', 'Accesos (24 h)']];
            return [...title('Resumen', 'Estado general de la base de datos de usuarios.'),
              h('div', { class: 'adm-stats' }, L.map(([k, l]) => h('div', { class: 'adm-stat' }, h('b', {}, s[k]), h('small', {}, l))))];
          },
          users: async () => {
            const { data, error } = await sb.from('profiles').select('*').order('created_at', { ascending: false });
            if (error) return [...title('Usuarios'), empty(error.message)];
            const del = (u) => { if (confirm('¿Eliminar definitivamente a ' + (u.full_name || u.email) + '?')) rpc('admin_delete_user', { target: u.id }); };
            return [...title('Usuarios', 'Hacer o quitar admin, suspender y eliminar cuentas.'),
              h('div', { class: 'adm-th' }, h('span', {}, 'Correo'), h('span', {}, 'Rol'), h('span', {}, 'Estado'), h('span', {}, 'Último acceso'), h('span', {}, '')),
              ...(data || []).map((u) => {
                const self = u.id === me.id;
                return h('div', { class: 'adm-row' },
                  h('span', { class: 'adm-em', title: u.email }, (u.full_name || u.email) + (self ? ' (tú)' : '')),
                  h('span', {}, h('i', { class: 'adm-tag' + (u.role === 'admin' ? ' on' : '') }, u.role)),
                  h('span', {}, h('i', { class: 'adm-tag' + (u.is_active ? '' : ' off') }, u.is_active ? 'activo' : 'suspendido')),
                  h('span', { class: 'adm-dt' }, fmt(u.last_sign_in_at)),
                  h('span', { class: 'st-btns' }, self ? '' : [
                    h('button', { class: 'btn', onclick: () => rpc('admin_set_role', { target: u.id, new_role: u.role === 'admin' ? 'user' : 'admin' }) }, u.role === 'admin' ? 'Quitar admin' : 'Hacer admin'),
                    h('button', { class: 'btn', onclick: () => rpc('admin_set_active', { target: u.id, active: !u.is_active }) }, u.is_active ? 'Suspender' : 'Reactivar'),
                    h('button', { class: 'btn danger', onclick: () => del(u) }, 'Eliminar')]));
              })];
          },
          log: async () => {
            const { data, error } = await sb.from('activity_log').select('*, profiles(email)').order('created_at', { ascending: false }).limit(100);
            if (error) return [...title('Actividad'), empty(error.message)];
            return [...title('Actividad', 'Últimos 100 eventos: registros, accesos y cambios de rol.'),
              ...(data || []).map((r) => h('div', { class: 'adm-log' }, h('span', { class: 'adm-dt' }, fmt(r.created_at)), h('b', {}, r.action), h('span', {}, r.profiles?.email || r.details?.email || '—'), h('small', {}, JSON.stringify(r.details))))];
          },
          me: async () => [...title('Mi cuenta', 'Sesión en Supabase.'),
            row('Correo', '', me.email), row('Rol', me.role === 'admin' ? 'Tienes permisos de administrador.' : 'Tu cuenta no tiene permisos de administrador.', h('i', { class: 'adm-tag' + (me.role === 'admin' ? ' on' : '') }, me.role)),
            row('Sesión', '', h('button', { class: 'btn', onclick: async () => { await sb.auth.signOut(); me = null; loginView(); } }, '⏻ Cerrar sesión de Supabase'))],
        };

        async function draw() {
          if (!me) return;
          const isAdmin = me.role === 'admin';
          const tabs = isAdmin ? TABS : TABS.filter((t) => t[0] === 'me');
          if (!tabs.some((t) => t[0] === d.tab)) d.tab = tabs[0][0];
          side.replaceChildren(h('div', { class: 'st-head' }, '🛡 Administración'),
            ...tabs.map(([k, ic, l]) => h('button', { class: 'st-nav' + (d.tab === k ? ' on' : ''), onclick: () => { d.tab = k; ctx.save && ctx.save(); draw(); } }, h('span', {}, ic), l)));
          const mine = ++drawId;
          main.replaceChildren(empty('Cargando…'));
          const view = await VIEWS[d.tab]();
          if (mine === drawId) main.replaceChildren(...view);
        }
        let drawId = 0;

        loginView();
        start().catch((e) => loginView(e.message));
      },
    });
  }

  /* El panel solo existe para la cuenta local del propietario (los permisos reales los pone la base de datos) */
  const btn = () => document.getElementById('btn-admin');
  const show = (u) => {
    const ok = !!u && !u.remote && String(u.name || '').toLowerCase() === 'anyelo';
    if (ok) register();
    const b = btn(); if (b) b.hidden = !ok;
  };
  N.on('login', show);
  const _lock = N.lock;
  if (_lock) N.lock = function () { const b = btn(); if (b) b.hidden = true; return _lock.apply(this, arguments); };
  const b0 = btn(); if (b0) { b0.hidden = true; b0.addEventListener('click', () => N.apps.admin && N.createWindow('admin')); }
})();
