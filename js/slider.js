/* ===== Slider de portada (página de inicio) =====
   Flechas, indicadores, autoplay (pausa al interactuar),
   teclado y deslizamiento táctil.
*/
(function () {
    'use strict';

    var slider = document.querySelector('.slider');
    if (!slider) return;

    var diapositivas = Array.prototype.slice.call(slider.querySelectorAll('.slider-slide'));
    // Los indicadores son <button> en las páginas adaptadas y <span> en las
    // que aún no lo están: se consultan ambos para no romper ninguna.
    var puntos = Array.prototype.slice.call(
        slider.querySelectorAll('.slider-indicadores button, .slider-indicadores span')
    );
    var btnIzq = slider.querySelector('.slider-btn.izquierda');
    var btnDer = slider.querySelector('.slider-btn.derecha');

    if (diapositivas.length < 2) return;

    /* Un indicador de más rompe el carrusel: al pulsarlo se pedía una
       diapositiva que no existe, el índice se ajustaba al total y saltaba a
       la primera (el "error de la última pestaña"). Aquí se borran los
       sobrantes para que el número de puntos y de diapositivas case siempre,
       venga como venga el HTML. */
    puntos.slice(diapositivas.length).forEach(function (sobrante) {
        if (sobrante.parentNode) sobrante.parentNode.removeChild(sobrante);
    });
    puntos = puntos.slice(0, diapositivas.length);

    var indiceActual = Math.max(0, diapositivas.findIndex(function (d) {
        return d.classList.contains('activo');
    }));
    var temporizador = null;
    var INTERVALO = 6500;
    var movimientoReducido = window.matchMedia &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    function tituloDe(indice) {
        var h = diapositivas[indice] && diapositivas[indice].querySelector('h2, h3');
        var t = h ? h.textContent.replace(/\s+/g, ' ').trim() : '';
        return t || 'la diapositiva ' + (indice + 1);
    }

    function actualizarPuntos() {
        puntos.forEach(function (punto, i) {
            punto.classList.toggle('activo', i === indiceActual);
            // Solo el punto de la diapositiva visible se anuncia como actual;
            // el resto se anuncia como pulsable. Sin esto, todos se leen
            // idénticos y el lector de pantalla no dice cuál se está viendo.
            if (i === indiceActual) punto.setAttribute('aria-current', 'true');
            else punto.removeAttribute('aria-current');
            punto.setAttribute('aria-label', 'Ir a ' + tituloDe(i));
        });

        // Las diapositivas inactivas siguen en el DOM: sin esto, un lector de
        // pantalla recorre todos los textos del banner como si fueran
        // visibles a la vez. El "X de Y" permite saber en cuál se está sin
        // tener que contar los puntos.
        var total = diapositivas.length;
        diapositivas.forEach(function (d, i) {
            d.setAttribute('role', 'group');
            d.setAttribute('aria-roledescription', 'diapositiva');
            d.setAttribute('aria-label', 'Diapositiva ' + (i + 1) + ' de ' + total);
            if (i === indiceActual) d.removeAttribute('aria-hidden');
            else d.setAttribute('aria-hidden', 'true');
        });
    }

    function irA(indice, direccion) {
        var total = diapositivas.length;
        indice = ((indice % total) + total) % total;
        if (indice === indiceActual) return;

        var salida = diapositivas[indiceActual];
        var entrada = diapositivas[indice];

        // Coloca la diapositiva entrante en el lado correcto antes de animar
        entrada.classList.toggle('anterior', direccion < 0);
        void entrada.offsetWidth; // reflow para reiniciar la transición

        salida.classList.remove('activo');
        salida.classList.toggle('anterior', direccion > 0);
        entrada.classList.add('activo');

        indiceActual = indice;
        actualizarPuntos();
        iniciarAuto();
    }

    function iniciarAuto() {
        detenerAuto();
        if (movimientoReducido || document.hidden) return;
        temporizador = setInterval(function () {
            irA(indiceActual + 1, 1);
        }, INTERVALO);
    }

    function detenerAuto() {
        if (temporizador) {
            clearInterval(temporizador);
            temporizador = null;
        }
    }

    // ==== Flechas ====
    if (btnIzq) btnIzq.addEventListener('click', function () { irA(indiceActual - 1, -1); });
    if (btnDer) btnDer.addEventListener('click', function () { irA(indiceActual + 1, 1); });

    // ==== Indicadores ====
    puntos.forEach(function (punto, i) {
        punto.addEventListener('click', function () {
            if (i !== indiceActual) irA(i, i > indiceActual ? 1 : -1);
        });
    });

    // ==== Pausa el autoplay al interactuar ====
    // focusout se dispara en CADA cambio de foco dentro del carrusel, no solo
    // al salir: sin mirar relatedTarget, el autoplay se reiniciaba al tabular
    // de la flecha izquierda a la derecha, es decir, justo mientras se usa.
    slider.addEventListener('mouseenter', detenerAuto);
    slider.addEventListener('mouseleave', iniciarAuto);
    slider.addEventListener('focusin', detenerAuto);
    slider.addEventListener('focusout', function (e) {
        if (!slider.contains(e.relatedTarget)) iniciarAuto();
    });

    // ==== Teclado ====
    slider.addEventListener('keydown', function (e) {
        if (e.key === 'ArrowLeft') {
            e.preventDefault();
            irA(indiceActual - 1, -1);
        } else if (e.key === 'ArrowRight') {
            e.preventDefault();
            irA(indiceActual + 1, 1);
        }
    });

    // ==== Deslizamiento táctil ====
    var toqueInicioX = null;
    var toqueInicioY = null;

    slider.addEventListener('touchstart', function (e) {
        toqueInicioX = e.changedTouches[0].clientX;
        toqueInicioY = e.changedTouches[0].clientY;
        detenerAuto();
    }, { passive: true });

    slider.addEventListener('touchend', function (e) {
        if (toqueInicioX === null) return;
        var dx = e.changedTouches[0].clientX - toqueInicioX;
        var dy = e.changedTouches[0].clientY - toqueInicioY;
        if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy)) {
            if (dx < 0) irA(indiceActual + 1, 1);
            else irA(indiceActual - 1, -1);
        }
        toqueInicioX = toqueInicioY = null;
        iniciarAuto();
    }, { passive: true });

    // ==== Pausa cuando la pestaña está en segundo plano ====
    document.addEventListener('visibilitychange', function () {
        if (document.hidden) detenerAuto();
        else iniciarAuto();
    });

    /* ==== Brillo que sigue al cursor ====
       El .banner-glow ya estaba en el CSS y se encendía al pasar el ratón,
       pero nunca se posicionaba: se quedaba en la esquina superior
       izquierda (fuera de la pantalla) y no se veía nunca. */
    (function brilloQueSigueAlCursor() {
        var glow = slider.querySelector('.banner-glow');
        if (!glow || movimientoReducido) return;
        if (!window.requestAnimationFrame) return;
        if (!window.matchMedia || !window.matchMedia('(hover: hover)').matches) return;

        var caja = null;
        var pendiente = null;

        function medir() {
            caja = slider.getBoundingClientRect();
        }

        function invalidar() {
            caja = null;
        }

        slider.addEventListener('pointerenter', medir);
        window.addEventListener('scroll', invalidar, { passive: true });
        window.addEventListener('resize', invalidar);

        slider.addEventListener('pointermove', function (e) {
            if (e.pointerType === 'touch') return;
            if (!caja) medir();
            if (!caja) return;

            var x = e.clientX - caja.left;
            var y = e.clientY - caja.top;

            if (pendiente !== null) return;
            pendiente = requestAnimationFrame(function () {
                pendiente = null;
                glow.style.left = x + 'px';
                glow.style.top = y + 'px';
            });
        }, { passive: true });
    })();

    actualizarPuntos();
    iniciarAuto();
})();
