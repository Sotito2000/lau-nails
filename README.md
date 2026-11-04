# Lau Nails · web

## Estructura
- `index.html` · contenido de la página
- `css/styles.css` · estilos (colores y tipografías al principio, en `:root`)
- `js/main.js` · animación de la puerta, zoom y entrada de textos al hacer scroll
- `images/` · `door.jpg` (puerta entera), `leaf-left.webp` y `leaf-right.webp` (las dos hojas que se abren), `hand.webp` (mano colgando), `chains.webp`, `padlock-closed.webp` y `padlock-open.webp` (candado y cadenas del login), `nail-video.mp4`, y la carpeta `gallery/` para fotos nuevas

## Tareas habituales
- **Añadir fotos a la galería:** copia la foto a `images/gallery/` y añade una línea en `index.html` (hay un ejemplo en un comentario sobre `<div class="gal">`).
- **Cambiar la mano o el candado:** sustituye los archivos de `images/` por otros con fondo transparente. Si cambia la proporción de la mano, ajusta `aspect-ratio` en `.hand`; el punto donde cuelga del borde es el `translateY(-50%)` de `.hl` / `.hr`. Los dos candados deben tener el mismo tamaño y el cuerpo en el mismo sitio.
- **Cambiar la puerta:** hay que sustituir `door.jpg` y recortar de nuevo `leaf-left.webp` y `leaf-right.webp` (las hojas, con transparencia). Si la puerta no está en el mismo sitio que ahora, ajusta las posiciones en porcentaje de `.lf`, `.rt` y `.opn` en `styles.css` y las constantes `.4628` y `.6667` de `main.js`.
- **Reservas:** el enlace de Cal.com está en `index.html` (`id="cal"`). Cámbialo cuando Laura tenga su cuenta.
- **Contacto:** WhatsApp +34 641 03 72 05 · Instagram @lau_nails013 · TikTok @laury.rodrigz (pie de página y sección de reservas).

## Publicarla
Funciona en cualquier alojamiento estático (Netlify, Vercel, GitHub Pages...): sube la carpeta entera. Para probarla en local, abre `index.html` en el navegador.

## Acceso de clientas (login con invitación personal)
Cada clienta entra con **su email + un código de 8 dígitos que le llega al correo** y, la primera vez, con un **código de invitación personal de un solo uso** que le da Laura. Un código ya usado no sirve para nadie más; solo hay **una sesión activa por clienta** (si entra desde otro dispositivo, el anterior se cierra) y Laura puede **desactivar** o **cerrar la sesión** de cualquiera.
El contenido privado (servicios, galería, enlace de reservas) **no está en los archivos de la web**: sale de la base de datos y solo se entrega tras el login.

### Puesta en marcha (una sola vez)
1. Crea un proyecto en [supabase.com](https://supabase.com) (plan gratuito).
2. **SQL Editor** → pega y ejecuta `supabase/schema.sql` entero.
3. **Authentication → Email**: activa el acceso por código y edita la plantilla *Magic Link* para que incluya el código: `Tu código de acceso: {{ .Token }}`.
4. **Authentication → SMTP**: configura un correo propio (Resend, Brevo...). El correo integrado de Supabase tiene un límite muy bajo y no sirve para clientas reales.
5. **Authentication → Attack protection**: activa CAPTCHA (Turnstile/hCaptcha) para evitar registros masivos.
6. **Project Settings → API**: copia la *Project URL* y la clave *anon* a `js/config.js`.
7. **Storage → gallery**: sube `nail-video.mp4` y las fotos de la galería (el bucket es privado).
8. **SQL Editor**: ejecuta `supabase/seed-content.sql` (contenido privado y enlace de reservas de Laura).
9. Abre `admin.html`, entra con el email de Laura (llega un código) y luego, en el SQL Editor: `insert into public.admins select id from auth.users where email = 'lau.nails013@gmail.com';`
10. **Borra `js/demo-interior.js`** y su línea `<script>` en `index.html` (es solo para el modo demo).
11. Sube la carpeta a un alojamiento estático (Cloudflare Pages, Netlify...) y en Supabase → Authentication → URL Configuration pon la dirección de la web.

### Uso diario
En `admin.html`: escribe el nombre de la clienta → *Crear código* → *Abrir WhatsApp* (el mensaje sale redactado) y se lo envías. Ahí mismo ves quién tiene acceso, su último acceso, y puedes desactivar o cerrar sesión.

### Modo demo
Mientras `js/config.js` tenga `SUPABASE_URL` vacío, la web funciona en modo demo **sin seguridad real**: email cualquiera, código `123456`, invitación `DEMO-1234`. Sirve solo para ver el diseño.
