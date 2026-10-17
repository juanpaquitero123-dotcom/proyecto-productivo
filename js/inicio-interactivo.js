/* ===== Elementos interactivos de la página de inicio =====
   - Cuenta regresiva a la Gran Feria Familiar
   - Acordeón de preguntas frecuentes (delegado, compatible con carga dinámica)
 */
(function () {
    'use strict';

    function dosCifras(n) {
        return n < 10 ? '0' + n : '' + n;
    }

    /* ==================== CUENTA REGRESIVA ====================
       La fecha objetivo se lee de .countdown-caja[data-fecha] (YYYY-MM-DD)
       y [data-hora] (HH:MM). Si no se indica, se usa la Gran Feria
       Familiar del 15 de diciembre a las 9:00 am. */
    (function () {
        var dias = document.getElementById('cd-dias');
        var horas = document.getElementById('cd-horas');
        var minutos = document.getElementById('cd-minutos');
        var segundos = document.getElementById('cd-segundos');
        if (!dias || !horas || !minutos || !segundos) return;

        function objetivoCountdown() {
            var caja = document.querySelector('.countdown-caja');
            var base = null;

            if (caja && caja.dataset && caja.dataset.fecha) {
                var f = caja.dataset.fecha.split('-');
                var h = (caja.dataset.hora || '09:00').split(':');
                base = new Date(
                    parseInt(f[0], 10),
                    parseInt(f[1], 10) - 1,
                    parseInt(f[2], 10),
                    parseInt(h[0], 10) || 0,
                    parseInt(h[1], 10) || 0,
                    0, 0
                );
            }

            if (base === null) {
                var ahora = new Date();
                base = new Date(ahora.getFullYear(), 11, 15, 9, 0, 0);
            }

            // Si ya pasó, se cuentan los días para la misma fecha del año siguiente
            if (base <= new Date()) {
                base = new Date(base.getFullYear() + 1, base.getMonth(), base.getDate(),
                    base.getHours(), base.getMinutes(), 0, 0);
            }

            return base;
        }

        function actualizar() {
            var objetivo = objetivoCountdown();
            var ahora = new Date();
            var diff = objetivo - ahora;
            dias.textContent = String(Math.floor(diff / 86400000));
            horas.textContent = dosCifras(Math.floor((diff % 86400000) / 3600000));
            minutos.textContent = dosCifras(Math.floor((diff % 3600000) / 60000));
            segundos.textContent = dosCifras(Math.floor((diff % 60000) / 1000));
        }

        actualizar();
        setInterval(actualizar, 1000);
    })();

    /* ==================== PREGUNTAS FRECUENTES ====================
       Delegado: funciona con contenido cargado dinámicamente después
       de la ejecución de este script. */
    (function () {
        var faqWrap = document.querySelector('.faq-wrap');
        if (!faqWrap) return;

        function cerrar(item) {
            item.classList.remove('abierto');
            item.querySelector('.faq-pregunta').setAttribute('aria-expanded', 'false');

            var resp = item.querySelector('.faq-respuesta');
            // Para que el cierre se anime hace falta la altura actual fija, y
            // devolverla a 0 en el siguiente frame.
            resp.style.maxHeight = resp.scrollHeight + 'px';
            void resp.offsetWidth;
            resp.style.maxHeight = '';
        }

        function abrir(item) {
            item.classList.add('abierto');
            item.querySelector('.faq-pregunta').setAttribute('aria-expanded', 'true');

            var resp = item.querySelector('.faq-respuesta');
            resp.style.maxHeight = resp.scrollHeight + 'px';

            // Al acabar la transición se suelta la altura calculada. Si se
            // deja fija, y más tarde carga una fuente o cambia el ancho, el
            // texto crece, la respuesta se queda cortada y no se nota.
            resp.addEventListener('transitionend', function alAbrir(e) {
                if (e.propertyName !== 'max-height') return;
                resp.removeEventListener('transitionend', alAbrir);
                if (item.classList.contains('abierto')) resp.style.maxHeight = 'none';
            });
        }

        faqWrap.addEventListener('click', function (e) {
            var boton = e.target.closest('.faq-pregunta');
            if (!boton) return;

            var item = boton.closest('.faq-item');
            if (!item) return;

            var items = faqWrap.querySelectorAll('.faq-item');
            var estabaAbierto = item.classList.contains('abierto');
            Array.prototype.forEach.call(items, cerrar);

            if (!estabaAbierto) abrir(item);
        });

        // Abrir la primera pregunta al cargar
        var primero = faqWrap.querySelector('.faq-item');
        if (primero) abrir(primero);
    })();
})();