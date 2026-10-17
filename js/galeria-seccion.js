/* ===== Galería por sección (páginas públicas) =====
   Carga las imágenes de una sección desde php/contenido.php
   (campo "paginas") y las muestra en el contenedor #galeriaPagina.
   Requiere que el contenedor tenga el atributo data-seccion="<seccion>".
   Al hacer clic en una foto se abre un lightbox con navegación.
*/
(function () {
    'use strict';

    var seccionEl = document.getElementById('galeriaPagina');
    if (!seccionEl) return;

    var seccion = seccionEl.getAttribute('data-seccion') || '';
    if (!seccion) return;

    var marco = document.getElementById('galeriaMarco');
    if (!marco) return;

    function esc(s) {
        return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
            return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
        });
    }

    /* ---------- Lightbox (se construye una sola vez) ---------- */
    var lightbox = document.createElement('div');
    lightbox.id = 'galeriaLightbox';
    lightbox.className = 'galeria-pagina-lightbox';
    lightbox.hidden = true;
    lightbox.innerHTML =
        '<button type="button" class="galeria-lb-cerrar" title="Cerrar"><i class="fa-solid fa-xmark"></i></button>' +
        '<button type="button" class="galeria-lb-nav galeria-lb-ant" title="Anterior"><i class="fa-solid fa-chevron-left"></i></button>' +
        '<figure class="galeria-lb-foto">' +
            '<img id="galeriaLbImagen" alt="Galería">' +
            '<figcaption id="galeriaLbTexto"></figcaption>' +
        '</figure>' +
        '<button type="button" class="galeria-lb-nav galeria-lb-sig" title="Siguiente"><i class="fa-solid fa-chevron-right"></i></button>';

    document.body.appendChild(lightbox);

    var lbImagen = lightbox.querySelector('#galeriaLbImagen');
    var lbTexto = lightbox.querySelector('#galeriaLbTexto');
    var listaFotos = [];
    var fotosPos = 0;

    lightbox.addEventListener('click', function (e) {
        if (e.target === lightbox) cerrarLightbox();
    });

    lightbox.querySelector('.galeria-lb-cerrar').addEventListener('click', cerrarLightbox);
    lightbox.querySelector('.galeria-lb-ant').addEventListener('click', irAnterior);
    lightbox.querySelector('.galeria-lb-sig').addEventListener('click', irSiguiente);

    document.addEventListener('keydown', function (e) {
        if (lightbox.hidden) return;
        if (e.key === 'Escape') cerrarLightbox();
        if (e.key === 'ArrowLeft') irAnterior();
        if (e.key === 'ArrowRight') irSiguiente();
    });

    function mostrarFoto(pos) {
        if (!listaFotos.length) return;
        pos = (pos + listaFotos.length) % listaFotos.length;
        fotosPos = pos;
        if (lbImagen) lbImagen.src = '../' + listaFotos[pos].ruta;
        if (lbTexto) lbTexto.textContent = (pos + 1) + ' de ' + listaFotos.length;
    }

    function abrirLightbox(pos) {
        mostrarFoto(pos);
        lightbox.hidden = false;
        requestAnimationFrame(function () { lightbox.classList.add('lb-pagina-visible'); });
        document.body.style.overflow = 'hidden';
    }

    function cerrarLightbox() {
        lightbox.classList.remove('lb-pagina-visible');
        document.body.style.overflow = '';
        setTimeout(function () { lightbox.hidden = true; }, 300);
    }

    function irAnterior() { mostrarFoto(fotosPos - 1); }

    function irSiguiente() { mostrarFoto(fotosPos + 1); }

    /* ---------- Carga de imágenes ---------- */
    window.fetch('../php/contenido.php', { credentials: 'same-origin' })
        .then(function (r) { return r.ok ? r.json() : null; })
        .then(function (d) {
            var imagenes = (d && d.ok && d.paginas && Array.isArray(d.paginas[seccion]))
                ? d.paginas[seccion]
                : [];

            if (!imagenes.length) {
                seccionEl.style.display = 'none';
                return;
            }

            listaFotos = imagenes.map(function (i) {
                return { id: i.id, ruta: i.ruta };
            });

            marco.innerHTML = '';
            imagenes.forEach(function (img, i) {
                var d = document.createElement('figure');
                d.className = 'galeria-pagina-item';
                d.innerHTML = '<img src="' + esc('../' + img.ruta) + '" alt="Galería ' + esc(seccion) + '">';

                d.addEventListener('click', function () { abrirLightbox(i); });
                marco.appendChild(d);
            });
        })
        .catch(function () {
            seccionEl.style.display = 'none';
        });
})();