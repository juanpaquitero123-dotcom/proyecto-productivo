/* ===== Panel Administrativo: contenido de la página de inicio =====
   - Preguntas frecuentes (tabla PreguntasFrecuentes)
   - Banda CTA final (tabla CtaInicio, fila única)
 */
(function () {
    'use strict';

    // ==== Toast de notificación ====
    var toast = document.getElementById('adminToast');
    var toastMsg = document.getElementById('adminToastMsg');
    var toastTimer = null;

    function mostrarToast(mensaje) {
        if (!toast || !toastMsg) return;
        toastMsg.textContent = mensaje;
        toast.classList.add('visible');
        clearTimeout(toastTimer);
        toastTimer = setTimeout(function () {
            toast.classList.remove('visible');
        }, 3000);
    }

    function esc(s) {
        return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
            return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
        });
    }

    // ==== Estado y carga del contenido ====
    var contenido = { preguntas: [], cta: null };
    var cargandoContenido = false;

    function mostrarErrorCarga(mensaje) {
        var ids = ['preguntasLista'];
        ids.forEach(function (id) {
            var lista = document.getElementById(id);
            if (!lista) return;
            lista.innerHTML =
                '<div class="lista-error">' +
                '<i class="fa-solid fa-triangle-exclamation"></i>' +
                '<p>' + esc(mensaje) + '</p>' +
                '<button type="button" class="btn-reintentar"><i class="fa-solid fa-rotate-right"></i> Reintentar</button>' +
                '</div>';
            var btn = lista.querySelector('.btn-reintentar');
            if (btn) btn.addEventListener('click', function () { refrescarContenido(); });
        });
    }

    async function cargarContenido() {
        if (!window.AuthDB || typeof AuthDB.apiContenido !== 'function') {
            mostrarErrorCarga('El módulo AuthDB está desactualizado en el navegador. Recarga la página con Ctrl+F5 (borra el caché).');
            return false;
        }

        var r = null;
        var detalle = null;
        try {
            r = await AuthDB.apiContenido('leer');
        } catch (err) {
            r = null;
            detalle = (err && err.message) ? err.message : String(err);
        }

        if (!r || !r.ok) {
            var errorCrudo = (r && r.error) || detalle || 'respuesta vacía';
            var mensaje = 'No se pudo cargar el contenido [' + errorCrudo + ']. Verifica que Apache y MySQL estén activos.';
            mostrarToast(mensaje);
            mostrarErrorCarga(mensaje);
            return false;
        }

        contenido.preguntas = r.preguntas || [];
        contenido.cta       = r.cta       || null;
        return true;
    }

    function pintarApartado(fn) {
        try { fn(); }
        catch (e) {
            console.error(e);
            mostrarToast('Ocurrió un error al mostrar un apartado. Reintenta.');
        }
    }

    async function refrescarContenido() {
        if (cargandoContenido) return;
        cargandoContenido = true;
        try {
            if (await cargarContenido()) {
                if (document.getElementById('preguntasLista')) pintarApartado(pintarPreguntas);
                if (document.getElementById('formCta')) pintarApartado(pintarCta);
            }
        } finally {
            cargandoContenido = false;
        }
    }

    (function vigilarCarga() {
        setTimeout(function () {
            var atascado = false;
            ['preguntasLista'].forEach(function (id) {
                var lista = document.getElementById(id);
                if (lista && lista.querySelector('.cargando-txt')) atascado = true;
            });
            if (!atascado) return;
            refrescarContenido();
            if (atascado) setTimeout(vigilarCarga, 4000);
        }, 3000);
    })();

    refrescarContenido();

    // ==== Utilidad: delegación de botones dentro de una lista ====
    function bindLista(lista, claseBoton, accion) {
        lista.querySelectorAll('.' + claseBoton).forEach(function (btn) {
            btn.addEventListener('click', function () {
                var item = btn.closest('[data-id]');
                if (item) accion(item);
            });
        });
    }

    /* ==================================================
       PREGUNTAS FRECUENTES
    ================================================== */
    var formPregunta = document.getElementById('formPregunta');
    var preguntaFormulario = document.getElementById('preguntaFormulario');
    var preguntaEditandoId = 0;

    function pintarPreguntas() {
        var lista = document.getElementById('preguntasLista');
        if (!lista) return;

        if (!contenido.preguntas.length) {
            lista.innerHTML = '<p class="lista-vacia"><i class="fa-solid fa-circle-question"></i> Aún no hay preguntas frecuentes.</p>';
            return;
        }

        lista.innerHTML = '';
        contenido.preguntas.forEach(function (p) {
            var item = document.createElement('div');
            item.className = 'pregunta-item';
            item.dataset.id = p.id;

            item.innerHTML =
                '<div class="pregunta-info">' +
                    '<h4><i class="fa-solid fa-circle-question"></i> ' + esc(p.pregunta) + '</h4>' +
                    '<p>' + esc(p.respuesta || 'Sin respuesta') + '</p>' +
                '</div>' +
                '<div class="pregunta-acciones">' +
                    '<button class="btn-editar-pregunta" title="Editar"><i class="fa-solid fa-pen"></i></button>' +
                    '<button class="btn-eliminar" title="Eliminar"><i class="fa-solid fa-trash"></i></button>' +
                '</div>';

            lista.appendChild(item);
        });

        bindLista(lista, 'btn-editar-pregunta', function (item) { abrirFormPregunta(parseInt(item.dataset.id, 10)); });
        bindLista(lista, 'btn-eliminar', function (item) { borrarPregunta(parseInt(item.dataset.id, 10)); });
    }

    function abrirFormPregunta(id) {
        preguntaEditandoId = id;
        formPregunta.reset();

        var obj = null;
        for (var i = 0; i < contenido.preguntas.length; i++) {
            if (contenido.preguntas[i].id === id) obj = contenido.preguntas[i];
        }

        if (obj) {
            document.getElementById('preguntaPregunta').value  = obj.pregunta || '';
            document.getElementById('preguntaRespuesta').value = obj.respuesta || '';
        }

        preguntaFormulario.style.display = 'block';
        preguntaFormulario.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    async function borrarPregunta(id) {
        if (!confirm('¿Eliminar esta pregunta?')) return;
        var r = await AuthDB.apiContenido('eliminar_pregunta', { id: id });
        if (r && r.ok) { mostrarToast('Pregunta eliminada.'); refrescarContenido(); }
        else mostrarToast((r && r.error) || 'No se pudo eliminar la pregunta.');
    }

    if (document.getElementById('btnAgregarPregunta')) {
        document.getElementById('btnAgregarPregunta').addEventListener('click', function () { abrirFormPregunta(0); });
    }
    if (document.getElementById('btnCancelarPregunta')) {
        document.getElementById('btnCancelarPregunta').addEventListener('click', function () {
            preguntaFormulario.style.display = 'none';
            formPregunta.reset();
        });
    }
    if (formPregunta) {
        formPregunta.addEventListener('submit', async function (e) {
            e.preventDefault();
            var orden = 1;
            contenido.preguntas.forEach(function (p) { if (p.orden >= orden) orden = p.orden + 1; });

            var r = await AuthDB.apiContenido('guardar_pregunta', {
                id: preguntaEditandoId || 0,
                pregunta: document.getElementById('preguntaPregunta').value,
                respuesta: document.getElementById('preguntaRespuesta').value,
                orden: orden
            });

            if (!r || !r.ok) {
                mostrarToast((r && r.error) || 'No se pudo guardar la pregunta.');
                return;
            }

            preguntaFormulario.style.display = 'none';
            formPregunta.reset();
            mostrarToast('Pregunta guardada correctamente.');
            refrescarContenido();
        });
    }

    /* ==================================================
       BANDA CTA FINAL (fila única)
    ================================================== */
    var formCta = document.getElementById('formCta');
    if (formCta) {
        formCta.addEventListener('submit', async function (e) {
            e.preventDefault();
            var r = await AuthDB.apiContenido('guardar_cta', {
                titulo: document.getElementById('ctaTitulo').value,
                texto: document.getElementById('ctaTexto').value,
                btn_texto: document.getElementById('ctaBtnTexto').value,
                btn_enlace: document.getElementById('ctaBtnEnlace').value
            });
            if (r && r.ok) mostrarToast('Sección CTA guardada en MySQL.');
            else mostrarToast((r && r.error) || 'No se pudo guardar.');
        });
    }

    function pintarCta() {
        if (!contenido.cta) return;
        var c = contenido.cta;
        if (c.titulo) document.getElementById('ctaTitulo').value = c.titulo;
        if (c.texto) document.getElementById('ctaTexto').value = c.texto;
        if (c.btn_texto) document.getElementById('ctaBtnTexto').value = c.btn_texto;
        if (c.btn_enlace) document.getElementById('ctaBtnEnlace').value = c.btn_enlace;
    }

    refrescarContenido();

})();