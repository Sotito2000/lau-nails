/* Lau Nails · acceso de clientas: email + código OTP + invitación personal de un solo uso.
   El contenido privado NO está en los archivos de la web: lo entrega Supabase solo tras el login. */
(function () {
  var C = window.LN_CONFIG || {};
  var $ = function (i) {
    return document.getElementById(i);
  };
  var g = $("gate"),
    f = $("gform"),
    inp = $("gin"),
    lab = $("glabel"),
    btn = $("gbtn"),
    msg = $("gmsg"),
    alt = $("galt"),
    cap = $("cap"),
    main = $("interior"),
    root = document.documentElement;
  var TOK = "ln_session",
    FLASH = "ln_msg",
    step = "email",
    email = "",
    sb = null,
    capToken = null,
    capId = null,
    watching = false;

  if ("scrollRestoration" in history) history.scrollRestoration = "manual";
  scrollTo(0, 0);

  var UI = {
    email: { label: "Email", ph: "tu@email.com", btn: "Enviar código", type: "email", mode: "email", ac: "email" },
    otp: { label: "Código de 8 dígitos", ph: "12345678", btn: "Entrar", type: "text", mode: "numeric", ac: "one-time-code" },
    invite: { label: "Código de invitación", ph: "XXXX-XXXX", btn: "Activar mi acceso", type: "text", mode: "text", ac: "off" },
  };

  function say(t, bad) {
    msg.textContent = t;
    msg.className = "gate-msg" + (bad ? " bad" : "");
  }
  function busy(b) {
    btn.disabled = b;
    btn.textContent = b ? "Un momento…" : UI[step].btn;
  }
  function ask(s) {
    var u = UI[s];
    step = s;
    inp.value = "";
    inp.type = u.type;
    inp.setAttribute("inputmode", u.mode);
    inp.setAttribute("autocomplete", u.ac);
    inp.setAttribute("enterkeyhint", "go");
    inp.setAttribute("maxlength", s === "email" ? "254" : "12");
    inp.setAttribute("autocapitalize", s === "invite" ? "characters" : "none");
    inp.placeholder = u.ph;
    lab.textContent = u.label;
    alt.hidden = s === "email";
    if (cap) cap.hidden = s !== "email" || !C.TURNSTILE_SITEKEY;
    busy(false);
    inp.focus();
  }

  /* ---------- anti-bots opcional (Cloudflare Turnstile) ---------- */
  function setupCaptcha() {
    if (!C.TURNSTILE_SITEKEY || !cap) return;
    function go() {
      capId = turnstile.render(cap, {
        sitekey: C.TURNSTILE_SITEKEY,
        callback: function (t) {
          capToken = t;
        },
        "expired-callback": function () {
          capToken = null;
        },
      });
    }
    if (window.turnstile) return go();
    var s = document.createElement("script");
    s.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
    s.async = true;
    s.onload = go;
    document.head.appendChild(s);
  }
  function resetCaptcha() {
    capToken = null;
    if (capId !== null && window.turnstile) turnstile.reset(capId);
  }

  /* ---------- librería de Supabase ---------- */
  function loadSb(cb) {
    if (window.supabase) return cb();
    var s = document.createElement("script");
    s.src = C.SUPABASE_JS || "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.112.3/dist/umd/supabase.js";
    s.onload = cb;
    s.onerror = function () {
      say("No se pudo cargar el acceso. Revisa tu conexión e inténtalo de nuevo.", 1);
    };
    document.head.appendChild(s);
  }
  function signOutLocal() {
    localStorage.removeItem(TOK);
    return sb ? sb.auth.signOut() : Promise.resolve();
  }
  function flashAndReload(text) {
    try {
      sessionStorage.setItem(FLASH, text);
    } catch (e) {}
    location.reload();
  }
  function nice(e) {
    var m = ((e && e.message) || "").toLowerCase();
    if ((e && e.status === 429) || m.indexOf("rate limit") > -1 || m.indexOf("seconds") > -1)
      return "Has pedido demasiados códigos seguidos. Espera un minuto e inténtalo de nuevo.";
    if (m.indexOf("captcha") > -1) return "No se pudo verificar que no eres un robot. Recarga la página.";
    if (step === "otp") return "Código incorrecto o caducado. Inténtalo de nuevo.";
    return "Algo ha fallado. Inténtalo de nuevo en un momento.";
  }

  /* ---------- contenido privado: se inyecta solo tras el login ---------- */
  function open(html, url) {
    main.innerHTML = html;
    var a = $("cal");
    if (a && /^https:\/\//i.test(url || "")) a.href = url;
    signAssets();
    startWatch();
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

  /* ---------- una sola sesión por clienta: se comprueba cada minuto (solo con la pestaña visible) ---------- */
  async function watch() {
    if (document.hidden) return;
    var t = localStorage.getItem(TOK);
    if (!t) return;
    var r = await sb.rpc("check_session", { p_token: t });
    if (r.data === false) {
      await signOutLocal();
      flashAndReload("Tu acceso se ha abierto en otro dispositivo o ha sido desactivado.");
    }
  }
  function startWatch() {
    if (watching) return;
    watching = true;
    setInterval(watch, 60000);
    document.addEventListener("visibilitychange", watch);
  }

  async function enter() {
    var st = (await sb.rpc("client_status")).data;
    if (st === "needs_invite") {
      say("Introduce el código de invitación que te ha dado Laura. Es personal y de un solo uso.");
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
    if (r && r.ok) open(r.html, r.booking_url);
    else {
      say("No se pudo cargar el contenido.", 1);
      busy(false);
    }
  }

  f.addEventListener("submit", async function (ev) {
    ev.preventDefault();
    var v = inp.value.trim();
    if (!v || !sb) return;
    if (step === "email" && C.TURNSTILE_SITEKEY && !capToken) return say("Confirma que no eres un robot.", 1);
    busy(true);
    try {
      if (step === "email") {
        email = v.toLowerCase();
        var r = await sb.auth.signInWithOtp({
          email: email,
          options: { shouldCreateUser: true, captchaToken: capToken || undefined },
        });
        resetCaptcha();
        if (r.error) throw r.error;
        say("Te he enviado un código de 8 dígitos a " + email + ". Mira también el spam.");
        ask("otp");
      } else if (step === "otp") {
        var r2 = await sb.auth.verifyOtp({ email: email, token: v.replace(/\s/g, ""), type: "email" });
        if (r2.error) throw r2.error;
        await enter();
      } else {
        var r3 = await sb.rpc("claim_invite", { p_code: v });
        if (r3.error) throw r3.error;
        if (r3.data === "ok") await enter();
        else if (r3.data === "locked") {
          await signOutLocal();
          say("Demasiados intentos. Escribe a Laura para pedir otro código.", 1);
          ask("email");
        } else {
          say("Ese código no es válido, ha caducado o ya se ha usado.", 1);
          busy(false);
        }
      }
    } catch (e) {
      console.error("Acceso:", e);
      say(nice(e), 1);
      busy(false);
    }
  });
  alt.addEventListener("click", function (e) {
    e.preventDefault();
    signOutLocal();
    say("Escribe tu email y te enviaré un código para entrar.");
    ask("email");
  });

  /* ---------- arranque ---------- */
  ask("email");
  var flash = null;
  try {
    flash = sessionStorage.getItem(FLASH);
    sessionStorage.removeItem(FLASH);
  } catch (e) {}
  if (flash) say(flash, 1);
  if (!(C.SUPABASE_URL && C.SUPABASE_ANON_KEY)) {
    say("El acceso no está configurado todavía.", 1);
    btn.disabled = true;
    return;
  }
  setupCaptcha();
  loadSb(async function () {
    sb = supabase.createClient(C.SUPABASE_URL, C.SUPABASE_ANON_KEY);
    var s = (await sb.auth.getSession()).data.session;
    if (!s) return;
    var t = localStorage.getItem(TOK);
    if (t) {
      var r = (await sb.rpc("get_private", { p_token: t })).data;
      if (r && r.ok) return open(r.html, r.booking_url);
      if (r && r.reason === "session") {
        await signOutLocal();
        say("Tu acceso se ha abierto en otro dispositivo. Vuelve a entrar.", 1);
        return;
      }
    }
    await enter();
  });
})();
