/* ===== Interactividad compartida: revelado, contadores, tilt 3D y brillo ===== */
(function () {
    'use strict';

    function inicializarInteractividad() {

        // ==== Revelado al hacer scroll (idempotente) ====
        var observador = new IntersectionObserver(function (entradas) {
            entradas.forEach(function (entrada) {
                if (!entrada.isIntersecting) return;

                var el = entrada.target;
                el.classList.add('visible');
                el.classList.add('reveal-animando');
                el.dataset.revealOk = '1';

                el.addEventListener('transitionend', function limpiar(e) {
                    if (e.propertyName === 'opacity') {
                        el.classList.remove('reveal-animando');
                        el.removeEventListener('transitionend', limpiar);
                    }
                });

                observador.unobserve(el);
            });
        }, { threshold: 0.15 });

        document.querySelectorAll('[data-reveal]').forEach(function (el) {
            if (el.dataset.revealOk) return;
            observador.observe(el);
        });

        // ==== Contadores animados (idempotente) ====
        var contadorObserver = new IntersectionObserver(function (entradas) {
            entradas.forEach(function (entrada) {
                if (!entrada.isIntersecting) return;

                var numero = entrada.target;
                var objetivo = parseInt(numero.dataset.target, 10);
                var sufijo = numero.dataset.sufijo || '';
                var duracion = 1800;
                var inicio = performance.now();

                function animar(ahora) {
                    var progreso = Math.min((ahora - inicio) / duracion, 1);
                    var suavizado = 1 - Math.pow(1 - progreso, 3);
                    numero.textContent = Math.floor(suavizado * objetivo) + sufijo;
                    if (progreso < 1) requestAnimationFrame(animar);
                }

                numero.dataset.contado = '1';
                requestAnimationFrame(animar);
                contadorObserver.unobserve(numero);
            });
        }, { threshold: 0.5 });

        document.querySelectorAll('.stat-numero').forEach(function (el) {
            if (el.dataset.contado) return;
            contadorObserver.observe(el);
        });

        // ==== Efecto tilt 3D (idempotente) ====
        document.querySelectorAll('[data-tilt]').forEach(function (tarjeta) {
            if (tarjeta.dataset.tiltOk) return;
            tarjeta.dataset.tiltOk = '1';

            tarjeta.addEventListener('mousemove', function (e) {
                var rect = tarjeta.getBoundingClientRect();
                var x = (e.clientX - rect.left) / rect.width - 0.5;
                var y = (e.clientY - rect.top) / rect.height - 0.5;
                tarjeta.style.transform =
                    'perspective(900px) rotateX(' + (-y * 8).toFixed(2) + 'deg) rotateY(' +
                    (x * 8).toFixed(2) + 'deg) translateY(-10px) scale(1.02)';
            });

            tarjeta.addEventListener('mouseleave', function () {
                tarjeta.style.transform = '';
            });
        });

        // ==== Brillo que sigue el cursor en el banner (idempotente) ====
        document.querySelectorAll('.banner-pagina, .eventos-banner, .slider').forEach(function (banner) {
            var glow = banner.querySelector('.banner-glow');
            if (!glow) return;
            if (banner.dataset.glowOk) return;
            banner.dataset.glowOk = '1';

            banner.addEventListener('mousemove', function (e) {
                var rect = banner.getBoundingClientRect();
                glow.style.left = (e.clientX - rect.left) + 'px';
                glow.style.top = (e.clientY - rect.top) + 'px';
            });
        });
    }

    // Ejecuta al cargar…
    inicializarInteractividad();

    // …y permite re-activarla cuando el contenido se inyecta dinámicamente
    // (secciones-public.js la invoca tras reconstruir las tarjetas).
    window.SerFelixActivar = inicializarInteractividad;

    // ══════════════════════════════════════════════════════
    // Datos de contacto desde MySQL (tabla Contacto)
    // Todas las páginas muestran teléfono, correo, redes sociales y
    // la frase del footer LEYÉNDOLOS de php/contenido.php. La única
    // manera de editarlos es el módulo "Información de Contacto" del
    // panel admin (html/admin-contacto.html → guardar_contacto).
    // ══════════════════════════════════════════════════════
    (function () {
        'use strict';

        if (!window.fetch) return;

        function esc(s) {
            return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
                return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
            });
        }

        function soloDigitos(s) {
            return String(s == null ? '' : s).replace(/\D/g, '');
        }

        function urlTelefono(s) {
            var d = soloDigitos(s);
            return d ? 'tel:+' + d : '';
        }

        function urlWhatsapp(s) {
            var d = soloDigitos(s);
            if (!d) return '';
            if (d.length === 10) d = '57' + d;
            return 'https://wa.me/' + d;
        }

        function actualizarRedes(c, selector) {
            if (!c.facebook && !c.instagram && !c.youtube) return;
            Array.prototype.forEach.call(document.querySelectorAll(selector), function (a) {
                var icono = a.querySelector('i');
                if (!icono) return;
                if (icono.classList.contains('fa-facebook-f') && c.facebook) a.setAttribute('href', c.facebook);
                else if (icono.classList.contains('fa-instagram') && c.instagram) a.setAttribute('href', c.instagram);
                else if (icono.classList.contains('fa-youtube') && c.youtube) a.setAttribute('href', c.youtube);
            });
        }

        function aplicarContacto(c) {
            if (!c) return;

            // Barra superior: teléfono y correo (si las etiquetas tienen id).
            // Se actualiza también el href: son <a> para que al hacer clic se
            // abra el marcador o el cliente de correo, no solo texto.
            var tel1 = document.getElementById('top-telefono');
            var mail = document.getElementById('top-email');
            if (tel1 && c.tel1) {
                tel1.innerHTML = '<i class="fa-solid fa-phone"></i> ' + esc(c.tel1);
                if (tel1.tagName === 'A') tel1.setAttribute('href', urlTelefono(c.tel1));
            }
            if (mail && c.email1) {
                mail.innerHTML = '<i class="fa-solid fa-envelope"></i> ' + esc(c.email1);
                if (mail.tagName === 'A') mail.setAttribute('href', 'mailto:' + c.email1);
            }

            // Fallback: posicionar teléfono y correo por orden de aparición
            if ((!tel1 || !mail)) {
                var spans = document.querySelectorAll('.top-bar .contacto > span, .top-bar .contacto > a');
                if (spans.length) {
                    if (c.tel1) {
                        spans[0].innerHTML = '<i class="fa-solid fa-phone"></i> ' + esc(c.tel1);
                        if (spans[0].tagName === 'A') spans[0].setAttribute('href', urlTelefono(c.tel1));
                    }
                    if (spans.length > 1 && c.email1) {
                        spans[1].innerHTML = '<i class="fa-solid fa-envelope"></i> ' + esc(c.email1);
                        if (spans[1].tagName === 'A') spans[1].setAttribute('href', 'mailto:' + c.email1);
                    }
                }
            }

            // Redes sociales de la barra superior y del footer
            actualizarRedes(c, '.top-bar .redes a');
            actualizarRedes(c, '.footer-socials a');

            // Frase del footer (simple o con columnas)
            var frase = document.getElementById('footer-frase');
            if (!frase) frase = document.querySelector('.footer-marca > p');
            if (!frase) frase = document.querySelector('.footer-content > p');
            if (frase && c.frase) frase.textContent = '"' + c.frase + '"';

            // Footer con columnas (eventos.html): lista de contacto
            Array.prototype.forEach.call(document.querySelectorAll('.footer-lista li'), function (li) {
                var icono = li.querySelector('i');
                if (!icono) return;
                var iconHtml = icono.outerHTML;
                if (icono.classList.contains('fa-phone') && c.tel1) li.innerHTML = iconHtml + ' ' + esc(c.tel1);
                else if (icono.classList.contains('fa-envelope') && c.email1) li.innerHTML = iconHtml + ' ' + esc(c.email1);
                else if (icono.classList.contains('fa-location-dot') && c.direccion) li.innerHTML = iconHtml + ' ' + esc(c.direccion);
            });

            // Página de contacto: tarjetas de canal y CTA de WhatsApp
            var canales = document.querySelectorAll('.canal-card');
            if (canales.length) {
                Array.prototype.forEach.call(canales, function (tarjeta) {
                    var icono = tarjeta.querySelector('.canal-icono i');
                    var valor = tarjeta.querySelector('a.canal-valor') || tarjeta.querySelector('span.canal-valor');
                    if (!icono || !valor) return;

                    if (icono.classList.contains('fa-phone') && c.tel1) {
                        valor.textContent = c.tel1;
                        valor.setAttribute('href', urlTelefono(c.tel1));
                    } else if (icono.classList.contains('fa-envelope') && c.email1) {
                        valor.textContent = c.email1;
                        valor.setAttribute('href', 'mailto:' + c.email1);
                    } else if (icono.classList.contains('fa-whatsapp') && c.tel1) {
                        valor.setAttribute('href', urlWhatsapp(c.tel1));
                    } else if (icono.classList.contains('fa-share-nodes')) {
                        var r = c.facebook || c.instagram;
                        if (r) valor.setAttribute('href', r);
                    }
                });

                if (c.tel1) {
                    Array.prototype.forEach.call(document.querySelectorAll('.cta-colegio a'), function (a) {
                        a.setAttribute('href', urlWhatsapp(c.tel1));
                    });
                }
            }
        }

        fetch('../php/contenido.php', { credentials: 'same-origin' })
            .then(function (r) { return r.json(); })
            .then(function (d) {
                if (d && d.ok && d.contacto) aplicarContacto(d.contacto);
            })
            .catch(function () {
                /* Si MySQL no responde, se mantienen los valores estáticos del HTML */
            });
    })();

})();