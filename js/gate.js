/**
 * ══════════════════════════════════════════════════════
 *  GATE.JS — Portón de acceso del sitio
 *  Si NO hay una sesión activa, cualquier página redirige
 *  primero a login.html (?dest=... vuelve a la página que se quería abrir).
 *  Si ya hay sesión, la página se muestra normal.
 * ══════════════════════════════════════════════════════
 */
(function () {
    'use strict';

    // La página NO se oculta mientras se verifica (eso era lo que la dejaba
    // en blanco). Solo hace falta un tope de tiempo para que, si MySQL está
    // caído y sesion.php tarda, la redirección no se quede colgada.
    var TIEMPO_LIMITE_MS = 8000;

    function nombrePagina() {
        var p = window.location.pathname.split('/').pop() || 'index.html';
        return (/^[a-zA-Z0-9_.-]+\.html$/.test(p)) ? p : 'index.html';
    }

    (async function () {
        var controlador = new AbortController();
        var temporizador = setTimeout(function () {
            controlador.abort();
        }, TIEMPO_LIMITE_MS);

        try {
            var respuesta = await fetch('../php/sesion.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'same-origin',
                signal: controlador.signal,
                body: JSON.stringify({ accion: 'estado' })
            });
            var datos = await respuesta.json();

            if (!datos) return;

            // Hay sesión: la página se muestra tal cual.
            if (datos.ok === true) return;

            // Fallo de MySQL: NO es que el visitante esté deslogueado, así que
            // redirigirlo al login lo mandaría a una pantalla donde tampoco
            // podrá entrar. Se deja ver la página con su contenido estático.
            if (datos.error) return;

            // Sin sesión y sin error: ahí sí toca pedir el login.
            var destino = 'login.html?dest=' + encodeURIComponent(nombrePagina());
            if (window.location.pathname.split('/').pop() !== 'login.html') {
                window.location.replace(destino);
            }
        } catch (e) {
            // Sin respuesta del servidor: mostrar la página para no bloquearla.
        } finally {
            clearTimeout(temporizador);
        }
    })();

})();
