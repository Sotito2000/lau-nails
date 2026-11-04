/* Lau Nails · acceso de clientas (email + código OTP + invitación personal de un solo uso) */
(function () {
  var C = window.LN_CONFIG || {},
    demo = !(C.SUPABASE_URL && C.SUPABASE_ANON_KEY),
    $ = function (i) {
      return document.getElementById(i);
    };
  var g = $("gate"),
    f = $("gform"),
    inp = $("gin"),
    lab = $("glabel"),
    btn = $("gbtn"),
    msg = $("gmsg"),
    alt = $("galt"),
    main = $("interior"),
    root = document.documentElement;
  if ("scrollRestoration" in history) history.scrollRestoration = "manual";
  scrollTo(0, 0);
  var step = "email",
    email = "",
    sb = null,
    TOK = "ln_session";
  function say(t, bad) {
    msg.textContent = t;
    msg.className = "gate-msg" + (bad ? " bad" : "");
  }
  var BT = {
    email: "Enviar código",
    otp: "Entrar",
    invite: "Activar mi acceso",
  };
  function busy(b) {
    btn.disabled = b;
    btn.textContent = b ? "Un momento…" : BT[step];
  }
  function ask(s) {
    step = s;
    inp.value = "";
    inp.type = s === "email" ? "email" : "text";
    inp.setAttribute("inputmode", s === "otp" ? "numeric" : "text");
    inp.setAttribute(
      "autocomplete",
      s === "otp" ? "one-time-code" : s === "email" ? "email" : "off",
    );
    lab.textContent = {
      email: "Email",
      otp: "Código de 8 dígitos",
      invite: "Código de invitación",
    }[s];
    inp.placeholder = {
      email: "tu@email.com",
      otp: demo ? "123456" : "12345678",
      invite: "XXXX-XXXX",
    }[s];
    alt.hidden = s === "email";
    busy(false);
    inp.focus();
  }
  function load(cb) {
    if (window.supabase) return cb();
    var s = document.createElement("script");
    s.src =
      "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.112.3/dist/umd/supabase.js";
    s.onload = cb;
    s.onerror = function () {
      say("No se pudo cargar el acceso. Revisa tu conexión.", 1);
    };
    document.head.appendChild(s);
  }
  function signOutLocal() {
    localStorage.removeItem(TOK);
    return sb ? sb.auth.signOut() : Promise.resolve();
  }
  /* contenido privado: se inyecta solo tras el login */
  function open(html, url, real) {
    main.innerHTML = html;
    var a = $("cal");
    if (a && url) a.href = url;
    if (real) {
      signAssets();
      setInterval(watch, 60000);
    }
    root.classList.remove("locked");
    g.classList.add("out");
    setTimeout(function () {
      g.hidden = true;
    }, 550);
    if (window.lnReveal) window.lnReveal(main);
    scrollTo(0, 0);
    var lk = $("lock");
    if (lk) {
      lk.classList.add("open");
      setTimeout(function () {
        lk.remove();
      }, 2400);
    }
    var col = document.querySelector("footer .f > div:nth-child(2)");
    if (col) {
      var o = document.createElement("a");
      o.href = "#";
      o.textContent = "Cerrar sesión";
      o.onclick = function (e) {
        e.preventDefault();
        signOutLocal().then(function () {
          location.reload();
        });
      };
      col.appendChild(o);
    }
  }
  async function signAssets() {
    var els = [].slice.call(main.querySelectorAll("[data-private]"));
    if (!els.length) return;
    var r = await sb.storage.from("gallery").createSignedUrls(
      els.map(function (e) {
        return e.getAttribute("data-private");
      }),
      3600,
    );
    (r.data || []).forEach(function (o, i) {
      if (!o.signedUrl) return;
      var e = els[i];
      if (e.tagName === "VIDEO" || e.tagName === "IMG") e.src = o.signedUrl;
      else e.style.backgroundImage = 'url("' + o.signedUrl + '")';
    });
  }
  async function watch() {
    var t = localStorage.getItem(TOK);
    if (!t) return;
    var r = await sb.rpc("check_session", { p_token: t });
    if (r.data === false) {
      await signOutLocal();
      alert(
        "Tu acceso se ha abierto en otro dispositivo o ha sido desactivado.",
      );
      location.reload();
    }
  }
  async function enter() {
    var st = (await sb.rpc("client_status")).data;
    if (st === "needs_invite") {
      say(
        "Introduce el código de invitación que te ha dado Laura. Es personal y de un solo uso.",
      );
      ask("invite");
      return;
    }
    if (st === "blocked") {
      await signOutLocal();
      say("Tu acceso está desactivado. Escribe a Laura.", 1);
      ask("email");
      return;
    }
    if (st !== "client") {
      ask("email");
      return;
    }
    var t = (await sb.rpc("open_session")).data;
    if (!t) {
      say("No se pudo abrir la sesión.", 1);
      busy(false);
      return;
    }
    localStorage.setItem(TOK, t);
    var r = (await sb.rpc("get_private", { p_token: t })).data;
    if (r && r.ok) open(r.html, r.booking_url, true);
    else {
      say("No se pudo cargar el contenido.", 1);
      busy(false);
    }
  }
  function demoStep(v) {
    setTimeout(function () {
      if (step === "email") {
        email = v;
        say("Demostración: el código es 123456.");
        ask("otp");
      } else if (step === "otp") {
        if (v === "123456") {
          say("Demostración: tu invitación es DEMO-1234.");
          ask("invite");
        } else {
          say("Código incorrecto (demo: 123456).", 1);
          busy(false);
        }
      } else {
        if (/^DEMO-?1234$/i.test(v))
          open(window.LN_DEMO_HTML, C.DEMO_BOOKING, false);
        else {
          say("Código no válido (demo: DEMO-1234).", 1);
          busy(false);
        }
      }
    }, 350);
  }
  f.addEventListener("submit", async function (ev) {
    ev.preventDefault();
    var v = inp.value.trim();
    if (!v) return;
    busy(true);
    if (demo) return demoStep(v);
    try {
      if (step === "email") {
        email = v.toLowerCase();
        var r = await sb.auth.signInWithOtp({
          email: email,
          options: { shouldCreateUser: true },
        });
        if (r.error) throw r.error;
        say(
          "Te he enviado un código de 8 dígitos a " +
            email +
            ". Mira también el spam.",
        );
        ask("otp");
      } else if (step === "otp") {
        var r2 = await sb.auth.verifyOtp({
          email: email,
          token: v.replace(/\s/g, ""),
          type: "email",
        });
        if (r2.error) throw r2.error;
        await enter();
      } else {
        var r3 = await sb.rpc("claim_invite", { p_code: v });
        if (r3.error) throw r3.error;
        var s = r3.data;
        if (s === "ok") await enter();
        else if (s === "locked") {
          await signOutLocal();
          say(
            "Demasiados intentos. Escribe a Laura para pedir otro código.",
            1,
          );
          ask("email");
        } else {
          say("Ese código no es válido, ha caducado o ya se ha usado.", 1);
          busy(false);
        }
      }
    } catch (e) {
      say(
        step === "otp"
          ? "Código incorrecto o caducado. Inténtalo de nuevo."
          : "Algo ha fallado. Inténtalo de nuevo en un momento.",
        1,
      );
      busy(false);
    }
  });
  alt.addEventListener("click", function (e) {
    e.preventDefault();
    signOutLocal();
    say("Escribe tu email y te enviaré un código para entrar.");
    ask("email");
  });
  ask("email");
  if (demo) {
    var d = document.createElement("p");
    d.className = "gate-demo";
    d.textContent = "Versión de demostración: aún no hay servidor conectado.";
    f.parentNode.insertBefore(d, f);
  } else
    load(async function () {
      sb = supabase.createClient(C.SUPABASE_URL, C.SUPABASE_ANON_KEY);
      var s = (await sb.auth.getSession()).data.session;
      if (!s) return;
      var t = localStorage.getItem(TOK);
      if (t) {
        var r = (await sb.rpc("get_private", { p_token: t })).data;
        if (r && r.ok) {
          open(r.html, r.booking_url, true);
          return;
        }
        if (r && r.reason === "session") {
          await signOutLocal();
          say(
            "Tu acceso se ha abierto en otro dispositivo. Vuelve a entrar.",
            1,
          );
          return;
        }
      }
      await enter();
    });
})();
