-- Contenido privado de la web (se entrega solo a clientas con sesión). Ejecuta esto en el SQL Editor de Supabase.
-- Cambia la URL de reservas por la de Laura. Para editar el contenido más tarde, vuelve a ejecutar con el HTML nuevo.
insert into public.site_content(key,html,booking_url) values (
'interior',
$ln$<section class="s" id="servicios"><div class="wrap rv">
<p class="eyebrow">Servicios</p><h2>Elige tu momento</h2><p class="sub">Precios orientativos. El nail art se presupuesta según el diseño.</p>
<div class="cards">
<div class="card"><div class="art a1">Foto aquí</div><h3>Manicura en gel</h3><p>Esmaltado semipermanente · 60 min</p><div class="price">20 €</div></div>
<div class="card"><div class="art a2">Foto aquí</div><h3>Uñas nuevas</h3><p>Construcción completa · 120 min</p><div class="price">35 €</div></div>
<div class="card"><div class="art a3">Foto aquí</div><h3>Relleno</h3><p>Mantenimiento · 90 min</p><div class="price">28 €</div></div>
<div class="card"><div class="art a4">Foto aquí</div><h3>Nail art</h3><p>Diseño personalizado · +30 min</p><div class="price">desde 5 €</div></div>
</div></div></section>

<section class="s alt" id="trabajos"><div class="wrap rv">
<p class="eyebrow">Portfolio</p><h2>Mis trabajos</h2><p class="sub">Aquí irán sus fotos y vídeos reales.</p>
<!-- GALERÍA: para añadir una foto, copia el archivo a images/gallery/ y añade una línea como esta:
<div class="g ph" style="background-image:url(images/gallery/mi-foto.jpg)"><span>Título</span></div> -->
<div class="gal"><div class="g"><video data-private="nail-video.mp4" autoplay muted loop playsinline></video><span class="play">▶</span></div><div class="g">Próximamente</div><div class="g">Próximamente</div><div class="g">Próximamente</div><div class="g">Próximamente</div><div class="g">Próximamente</div></div>
</div></section>

<section class="s book" id="reservar"><div class="wrap rv">
<p class="eyebrow">Reservas</p><h2>Tu cita, a un toque</h2>
<p class="sub">Elige servicio, día y hora. Solo verás huecos libres y tu cita se guarda al instante en la agenda de Laura.</p>
<div class="row"><a class="btn" id="cal" target="_blank" rel="noopener" href="https://cal.com/lau-nails">Ver horarios disponibles</a><a class="btn ghost" target="_blank" rel="noopener" href="https://wa.me/34641037205?text=Hola%20Laura%2C%20quiero%20reservar%20una%20cita">Escríbeme por WhatsApp</a></div>
<p class="fine">Lunes a sábado · Pobla de Vallbona, Valencia</p>
</div></section>$ln$,
'https://cal.com/lau-nails')
on conflict (key) do update set html=excluded.html, booking_url=excluded.booking_url;
