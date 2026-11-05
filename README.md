# Lau Nails · web con acceso privado

## Estructura
- `public/` → **lo único que se publica** (`index.html`, `admin.html`, `css/`, `js/`, `images/`). Vercel lo sirve gracias a `vercel.json` (`outputDirectory`).
- `supabase/` → SQL de la base de datos (**no se publica**): `schema.sql`, `seed-content.sql`, `patch-02-hardening.sql`.
- `private-assets/` → vídeo y fotos de trabajos antes de subirlos a Supabase Storage (**no se publica**).
- `vercel.json` → cabeceras de seguridad (CSP, anti-clickjacking…) y caché.

## Tras desplegar, comprueba que esto da 404
`/supabase/seed-content.sql` · `/private-assets/nail-video.mp4` · `/README.md` · `/js/demo-interior.js`. Si alguno se descarga, algo está publicado de más.

## Ajustes en Supabase (checklist de seguridad)
1. **SQL Editor**: ejecuta `supabase/patch-02-hardening.sql` (una vez).
2. **Authentication → Providers → Email**: caducidad del código (*OTP expiry*) a **600** segundos (10 min).
3. **Authentication → URL Configuration**: *Site URL* = `https://lau-nails.vercel.app` y la misma en *Redirect URLs*. No añadas comodines (`*`).
4. **Authentication → SMTP**: correo propio (Brevo/Resend) con un dominio que tengas. Sin esto el correo no llega a clientas reales y puede caer en spam.
5. **Authentication → Attack Protection → CAPTCHA** (recomendado): ver abajo.
6. **Storage → gallery**: sube `private-assets/nail-video.mp4` y las fotos de los trabajos (bucket privado).
7. En la cuenta de Gmail de Lau (`lau.nails013@gmail.com`) activa la **verificación en dos pasos**: quien controle ese correo controla el panel.

### Activar el CAPTCHA (Cloudflare Turnstile, gratis)
1. En [dash.cloudflare.com](https://dash.cloudflare.com) → *Turnstile* → *Add widget* con el dominio `lau-nails.vercel.app`. Te da una **site key** (pública) y una **secret key** (privada).
2. Supabase → *Authentication → Attack Protection* → activa CAPTCHA, elige *Turnstile* y pega la **secret key**.
3. Pega la **site key** en `public/js/config.js` (`TURNSTILE_SITEKEY`) y vuelve a desplegar. Hay que hacer **los dos pasos a la vez**: si solo activas uno, nadie podrá entrar.

### (Opcional) Librería de Supabase en tu propio dominio
Descarga `https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.112.3/dist/umd/supabase.js`, guárdala como `public/js/vendor/supabase.js`, pon `SUPABASE_JS: "js/vendor/supabase.js"` en `config.js` y quita `https://cdn.jsdelivr.net` del `script-src` de `vercel.json`.

## Uso diario
`/admin` → entra con el email de Lau (llega un código) → nombre de la clienta → *Crear código* → *Abrir WhatsApp*. Desde ahí ves quién tiene acceso y puedes desactivar o cerrar sesión.

## Tareas habituales
- **Fotos o vídeos de la galería:** súbelos a Supabase → Storage → `gallery` y añade el tile en el HTML de `supabase/seed-content.sql` con `data-private="nombre.jpg"` (fotos: `<div class="g ph" data-private="foto1.jpg"><span>Título</span></div>`); vuelve a ejecutar ese SQL.
- **Precios, textos o enlace de Cal.com:** edita `supabase/seed-content.sql` y vuelve a ejecutarlo (el enlace va en `booking_url`).
- **Mano o candado:** sustituye los archivos de `public/images/` por otros con fondo transparente (mismo nombre). Si cambia la proporción de la mano, ajusta `aspect-ratio` en `.hand`.
- **Puerta:** hay que cambiar `door.jpg`, `leaf-left.webp` y `leaf-right.webp` y reajustar los porcentajes de `.lf`, `.rt`, `.opn` y las constantes `.4628` y `.6667` de `main.js`.
