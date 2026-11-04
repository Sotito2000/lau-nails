/* Lau Nails · panel de administración (solo para Laura) */
(function () {
  var C = window.LN_CONFIG || {},
    app = document.getElementById("app"),
    sb,
    email = "";
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      }[c];
    });
  }
  function fmt(d) {
    return d
      ? new Date(d).toLocaleString("es-ES", {
          dateStyle: "short",
          timeStyle: "short",
        })
      : "—";
  }
  function $(i) {
    return document.getElementById(i);
  }
  if (!(C.SUPABASE_URL && C.SUPABASE_ANON_KEY)) {
    app.innerHTML =
      '<div class="card"><h1>Falta configurar</h1><p class="m">Rellena js/config.js con los datos de Supabase.</p></div>';
    return;
  }
  var s = document.createElement("script");
  s.src =
    "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.112.3/dist/umd/supabase.js";
  s.onload = function () {
    sb = supabase.createClient(C.SUPABASE_URL, C.SUPABASE_ANON_KEY);
    boot();
  };
  document.head.appendChild(s);
  function login(msg, otp) {
    app.innerHTML =
      '<div class="card"><h1>Panel de Laura</h1><p class="m">' +
      esc(msg || "Escribe tu email para entrar.") +
      '</p><input id="i" ' +
      (otp
        ? 'inputmode="numeric" autocomplete="one-time-code" placeholder="Código de 8 dígitos"'
        : 'type="email" placeholder="tu@email.com"') +
      '><button id="b">' +
      (otp ? "Entrar" : "Enviar código") +
      "</button></div>";
    $("b").onclick = async function () {
      var v = $("i").value.trim();
      var button = $("b");
      if (!v) return login("Escribe tu email para continuar.", otp);
      button.disabled = true;
      button.textContent = otp ? "Verificando…" : "Enviando…";
      try {
        if (!otp) {
          email = v.toLowerCase();
          var r = await sb.auth.signInWithOtp({
            email: email,
            options: { shouldCreateUser: true },
          });
          if (r.error) throw r.error;
          login("Te he enviado un código a " + email, 1);
        } else {
          var r2 = await sb.auth.verifyOtp({
            email: email,
            token: v.replace(/\s/g, ""),
            type: "email",
          });
          if (r2.error) throw r2.error;
          boot();
        }
      } catch (e) {
        console.error("Error de acceso en el panel:", e);
        var detail = e && e.message ? e.message : "Error desconocido.";
        login(
          otp
            ? "No se pudo verificar el código: " + detail
            : "No se pudo enviar el código: " + detail,
          otp,
        );
      }
    };
  }
  async function boot() {
    var ses = (await sb.auth.getSession()).data.session;
    if (!ses) return login();
    var a = (await sb.rpc("is_admin")).data;
    if (!a) {
      app.innerHTML =
        '<div class="card"><h1>Sin permiso</h1><p class="m">Este email no es de administradora.</p><button id="o">Salir</button></div>';
      $("o").onclick = out;
      return;
    }
    panel();
  }
  async function out() {
    await sb.auth.signOut();
    location.reload();
  }
  function panel() {
    app.innerHTML =
      '<div class="top"><h1>Clientas</h1><button class="g" id="o">Salir</button></div>' +
      '<div class="card"><h2>Nueva clienta</h2><input id="n" placeholder="Nombre de la clienta"><button id="c">Crear código de invitación</button><div id="out"></div></div>' +
      '<div class="card"><h2>Clientas con acceso</h2><div id="cl"></div></div><div class="card"><h2>Invitaciones</h2><div id="iv"></div></div>';
    $("o").onclick = out;
    $("c").onclick = create;
    app.onclick = click;
    refresh();
  }
  async function create() {
    var name = $("n").value.trim();
    if (!name) return;
    var r = await sb.rpc("admin_create_invite", { p_name: name });
    if (r.error) return alert("No se pudo crear el código.");
    var code = r.data,
      msg =
        "Hola " +
        name +
        ", este es tu código personal para entrar a mi web: " +
        code +
        ". Solo se puede usar una vez y es solo para ti 💅";
    $("out").innerHTML =
      '<div class="code">' +
      esc(code) +
      '</div><p class="m">Cópialo ahora: por seguridad no se vuelve a mostrar.</p><div class="acts"><button id="cp">Copiar mensaje</button><a class="b g" style="background:#efe6fb;color:#4c1d95" target="_blank" rel="noopener" href="https://wa.me/?text=' +
      encodeURIComponent(msg) +
      '">Abrir WhatsApp</a></div>';
    $("cp").onclick = function () {
      navigator.clipboard.writeText(msg);
      this.textContent = "¡Copiado!";
    };
    $("n").value = "";
    refresh();
  }
  async function refresh() {
    var c = await sb.rpc("admin_list_clients"),
      i = await sb.rpc("admin_list_invites");
    $("cl").innerHTML =
      (c.data || [])
        .map(function (x) {
          return (
            '<div class="row"><div><strong>' +
            esc(x.name) +
            '</strong> <span class="tag' +
            (x.active ? "" : " off") +
            '">' +
            (x.active ? "Activa" : "Desactivada") +
            "</span><small>" +
            esc(x.email) +
            " · último acceso " +
            fmt(x.last_login) +
            '</small></div><div class="acts"><button class="g" data-a="kick" data-id="' +
            x.user_id +
            '">Cerrar sesión</button><button class="' +
            (x.active ? "r" : "g") +
            '" data-a="act" data-v="' +
            !x.active +
            '" data-id="' +
            x.user_id +
            '">' +
            (x.active ? "Desactivar" : "Activar") +
            "</button></div></div>"
          );
        })
        .join("") || '<p class="m">Aún no hay clientas.</p>';
    $("iv").innerHTML =
      (i.data || [])
        .map(function (x) {
          var st = x.used_at
            ? "Usada"
            : x.revoked
              ? "Anulada"
              : new Date(x.expires_at) < new Date()
                ? "Caducada"
                : "Pendiente";
          return (
            '<div class="row"><div><strong>' +
            esc(x.client_name) +
            '</strong> <span class="tag">' +
            st +
            "</span><small>Creada " +
            fmt(x.created_at) +
            "</small></div>" +
            (st === "Pendiente"
              ? '<button class="r" data-a="rev" data-id="' +
                x.id +
                '">Anular</button>'
              : "") +
            "</div>"
          );
        })
        .join("") || '<p class="m">Sin invitaciones.</p>';
  }
  async function click(e) {
    var b = e.target.closest("button[data-a]");
    if (!b) return;
    var a = b.dataset.a,
      id = b.dataset.id;
    if (a === "act") {
      if (
        b.dataset.v === "false" &&
        !confirm("¿Desactivar el acceso de esta clienta?")
      )
        return;
      await sb.rpc("admin_set_active", {
        p_user: id,
        p_active: b.dataset.v === "true",
      });
    }
    if (a === "kick") await sb.rpc("admin_kick", { p_user: id });
    if (a === "rev" && confirm("¿Anular esta invitación?"))
      await sb.rpc("admin_revoke_invite", { p_id: Number(id) });
    refresh();
  }
})();
