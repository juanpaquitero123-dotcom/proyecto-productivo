/* ===== Nuestro Colegio =====
   Carga desde php/contenido.php las imágenes de las tarjetas de Instalaciones
   y Beneficios (sección "instalaciones", id 1..9) y de los Símbolos
   Institucionales (sección "simbolos", id 1..3) para mostrarlas al expandir
   cada tarjeta.
   Las tarjetas se despliegan al hacer clic (acordeón: una abierta a la vez).
*/
(function () {
    'use strict';

    /* ---------- Lightbox (se construye una sola vez) ---------- */
    var lightbox = document.createElement('div');
    lightbox.id = 'nosotrosLightbox';
    lightbox.className = 'galeria-pagina-lightbox';
    lightbox.hidden = true;
    lightbox.innerHTML =
        '<button type="button" class="galeria-lb-cerrar" title="Cerrar"><i class="fa-solid fa-xmark"></i></button>' +
        '<button type="button" class="galeria-lb-nav galeria-lb-ant" title="Anterior"><i class="fa-solid fa-chevron-left"></i></button>' +
        '<figure class="galeria-lb-foto">' +
            '<img id="nosotrosLbImagen" alt="Imagen">' +
            '<figcaption id="nosotrosLbTexto"></figcaption>' +
        '</figure>' +
        '<button type="button" class="galeria-lb-nav galeria-lb-sig" title="Siguiente"><i class="fa-solid fa-chevron-right"></i></button>';

    document.body.appendChild(lightbox);

    var lbImagen = lightbox.querySelector('#nosotrosLbImagen');
    var lbTexto = lightbox.querySelector('#nosotrosLbTexto');
    var listaFotos = [];
    var fotosPos = 0;

    lightbox.addEventListener('click', function (e) {
        if (e.target === lightbox) cerrarLightbox();
    });

    lightbox.querySelector('.galeria-lb-cerrar').addEventListener('click', cerrarLightbox);
    lightbox.querySelector('.galeria-lb-ant').addEventListener('click', function () { mostrarFoto(fotosPos - 1); });
    lightbox.querySelector('.galeria-lb-sig').addEventListener('click', function () { mostrarFoto(fotosPos + 1); });

    document.addEventListener('keydown', function (e) {
        if (lightbox.hidden) return;
        if (e.key === 'Escape') cerrarLightbox();
        if (e.key === 'ArrowLeft') mostrarFoto(fotosPos - 1);
        if (e.key === 'ArrowRight') mostrarFoto(fotosPos + 1);
    });

    function mostrarFoto(pos) {
        if (!listaFotos.length) return;
        pos = (pos + listaFotos.length) % listaFotos.length;
        fotosPos = pos;
        if (lbImagen) lbImagen.src = '../' + listaFotos[pos].ruta;
        if (lbTexto) lbTexto.textContent = (pos + 1) + ' de ' + listaFotos.length;
    }

    function abrirLightbox(fotos, pos) {
        if (!fotos || !fotos.length) return;
        listaFotos = fotos.slice();
        mostrarFoto(pos == null ? 0 : pos);
        lightbox.hidden = false;
        requestAnimationFrame(function () { lightbox.classList.add('lb-pagina-visible'); });
        document.body.style.overflow = 'hidden';
    }

    function cerrarLightbox() {
        lightbox.classList.remove('lb-pagina-visible');
        document.body.style.overflow = '';
        setTimeout(function () { lightbox.hidden = true; }, 300);
    }

    /* Pinta las miniaturas de una tarjeta; clic abre el lightbox. */
    function enlazarImagenes(contenedor, imagenes) {
        contenedor.innerHTML = '';
        var fotos = imagenes.map(function (i) { return { ruta: i.ruta }; });

        imagenes.forEach(function (img, i) {
            var d = document.createElement('button');
            d.type = 'button';
            d.className = 'info-miniatura';
            d.title = 'Ver imagen';
            var im = document.createElement('img');
            im.src = '../' + img.ruta;
            im.alt = 'Imagen';
            im.loading = 'lazy';
            d.appendChild(im);
            d.addEventListener('click', function (e) {
                e.stopPropagation();
                abrirLightbox(fotos, i);
            });
            contenedor.appendChild(d);
        });
    }

    /* Busca las imágenes de un elemento dentro de paginas[<seccion>]. */
    function imagenesDe(datos, seccion, id) {
        var lista = (datos && datos.paginas && Array.isArray(datos.paginas[seccion])) ? datos.paginas[seccion] : [];
        for (var i = 0; i < lista.length; i++) {
            if (parseInt(lista[i].id, 10) === parseInt(id, 10)) {
                return (Array.isArray(lista[i].imagenes) && lista[i].imagenes.length) ? lista[i].imagenes : [];
            }
        }
        return [];
    }

    function cargarInstalaciones(d) {
        document.querySelectorAll('.info-rapida-caja[data-instalacion]').forEach(function (card) {
            var n = parseInt(card.getAttribute('data-instalacion'), 10) || 0;
            if (!n) return;
            var imgs = imagenesDe(d, 'instalaciones', n);
            var cont = card.querySelector('.info-imagenes');
            if (cont && imgs.length) {
                enlazarImagenes(cont, imgs);
                var badge = document.createElement('span');
                badge.className = 'info-fotos-badge';
                badge.title = (imgs.length === 1 ? '1 foto' : imgs.length + ' fotos');
                badge.innerHTML = '<i class="fa-solid fa-camera"></i> ' + imgs.length;
                card.appendChild(badge);
            } else if (cont) {
                cont.remove();
            }
        });
    }

    function cargarSimbolos(d) {
        document.querySelectorAll('.simbolo-card[data-simbolo]').forEach(function (card) {
            var n = parseInt(card.getAttribute('data-simbolo'), 10) || 0;
            if (!n) return;
            var imgs = imagenesDe(d, 'simbolos', n);
            if (!imgs.length) return;

            var imgEl = card.querySelector('.simbolo-img');
            if (imgEl) {
                imgEl.src = '../' + imgs[0].ruta;
                imgEl.hidden = false;
                card.classList.add('has-img');
                var fotos = imgs.map(function (i) { return { ruta: i.ruta }; });
                imgEl.addEventListener('click', function () { abrirLightbox(fotos, 0); });
            }
        });
    }

    /* ---------- Acordeón de las tarjetas (delegado, funciona también
       con tarjetas inyectadas después por secciones-public.js) ---------- */
    document.addEventListener('click', function (e) {
        var tarjeta = e.target.closest('.info-rapida-caja[data-instalacion]');
        if (!tarjeta) return;

        var abierta = tarjeta.classList.contains('abierto');

        document.querySelectorAll('.info-rapida-caja[data-instalacion].abierto').forEach(function (c) {
            c.classList.remove('abierto');
            var b = c.querySelector('.info-ver-mas');
            if (b) b.setAttribute('aria-expanded', 'false');
        });

        if (!abierta) {
            tarjeta.classList.add('abierto');
            var btn = tarjeta.querySelector('.info-ver-mas');
            if (btn) btn.setAttribute('aria-expanded', 'true');
        }
    });

    /* ---------- Carga inicial ---------- */
    function cargarTodo(d) {
        cargarInstalaciones(d);
        cargarSimbolos(d);
    }

    window.fetch('../php/contenido.php?t=' + Date.now(), { credentials: 'same-origin', cache: 'no-store' })
        .then(function (r) { return r.ok ? r.json() : null; })
        .then(function (d) {
            if (!d) return;
            window.__sfContenido = d;
            cargarTodo(d);
        })
        .catch(function () {
            /* Sin respuesta del servidor: solo queda la información estática. */
        });

    // Permite recargar imágenes y simbologías después de que secciones-public.js
    // reconstruya las tarjetas de "Nosotros".
    window.SF_RecargarNosotros = function () {
        if (window.__sfContenido) {
            cargarTodo(window.__sfContenido);
        }
    };
})();