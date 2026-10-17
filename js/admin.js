/* ===== Panel Administrativo: layout de página normal + contenido MySQL e imágenes por elemento =====
   - Información general y contacto (guardados en InfoGeneral / Contacto)
   - Slides, Eventos y Noticias (guardados en sus tablas; una o varias imágenes por elemento)
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

    var MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
        'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];

    function fechaLarga(iso) {
        if (!iso) return 'Sin fecha';
        var p = String(iso).split('-');
        var m = parseInt(p[1], 10) - 1;
        return MESES[(m >= 0 && m < 12) ? m : 0] + ' ' + parseInt(p[2], 10) + ', ' + p[0];
    }

    function fechaISO(dia, mes) {
        // Convierte día + mes (MAY) en una fecha de ejemplo del año con esa fecha real
        if (!dia || !mes) return null;
        var indice = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC'].indexOf(mes);
        if (indice < 0) return null;
        var dd = String(parseInt(dia, 10) || 1);
        if (dd.length < 2) dd = '0' + dd;
        return '2026-' + ('0' + (indice + 1)).slice(-2) + '-' + dd;
    }

    // ==== Gestor de imágenes por formulario (una o varias por elemento) ====
    function GestorImagenes(entradaId, galeriaId) {
        var entrada = document.getElementById(entradaId);
        var galeria = document.getElementById(galeriaId);
        var pendientes = [];   // archivos elegidos pero aún no subidos
        var existentes = [];   // imágenes ya guardadas {id, ruta}

        if (!entrada || !galeria) return;

        function pintar() {
            galeria.innerHTML = '';

            existentes.forEach(function (img) {
                var d = document.createElement('div');
                d.className = 'img-thumb img-existente';
                d.innerHTML =
                    '<img src="' + esc(AuthDB.imagenRuta(img.ruta)) + '" alt="Imagen guardada">' +
                    '<button type="button" class="img-quitar" title="Eliminar imagen"><i class="fa-solid fa-xmark"></i></button>';

                d.querySelector('.img-quitar').addEventListener('click', function () {
                    var idEliminar = img.id;
                    AuthDB.eliminarImagen(idEliminar).then(function (r) {
                        if (r && r.ok) {
                            existentes = existentes.filter(function (x) { return x.id !== idEliminar; });
                            pintar();
                            mostrarToast('Imagen eliminada.');
                        } else {
                            mostrarToast((r && r.error) || 'No se pudo eliminar la imagen.');
                        }
                    });
                });

                galeria.appendChild(d);
            });

            pendientes.forEach(function (archivo, i) {
                var d = document.createElement('div');
                d.className = 'img-thumb';
                d.innerHTML =
                    '<img src="' + URL.createObjectURL(archivo) + '" alt="Nueva imagen">' +
                    '<button type="button" class="img-quitar" title="Quitar"><i class="fa-solid fa-xmark"></i></button>';

                d.querySelector('.img-quitar').addEventListener('click', function () {
                    pendientes.splice(i, 1);
                    pintar();
                });

                galeria.appendChild(d);
            });
        }

        entrada.addEventListener('change', function () {
            for (var i = 0; i < entrada.files.length; i++) {
                pendientes.push(entrada.files[i]);
            }
            entrada.value = '';
            pintar();
        });

        this.setExistentes = function (lista) {
            existentes = lista || [];
            pintar();
        };

        this.limpiar = function () {
            pendientes = [];
            existentes = [];
            pintar();
        };

        this.getPendientes = function () {
            var copia = [];
            for (var i = 0; i < pendientes.length; i++) copia.push(pendientes[i]);
            return copia;
        };

        this.tieneExistentes = function () { return existentes.length > 0; };
    }

    var gestores = {
        slides:   new GestorImagenes('slideImagenInput', 'slideImagenes'),
        eventos:  new GestorImagenes('eventoImagenInput', 'eventoImagenes'),
        noticias: new GestorImagenes('noticiaImagenInput', 'noticiaImagenes')
    };

    // Botones "Elegir imágenes" → disparan el input file oculto
    document.querySelectorAll('.btn-agregar-imagen').forEach(function (btn) {
        btn.addEventListener('click', function () {
            var objetivo = document.getElementById(btn.dataset.input);
            if (objetivo) objetivo.click();
        });
    });

    // ==== Estado y carga del contenido ====
    var contenido = { general: null, contacto: null, slides: [], eventos: [], noticias: [] };
    var cargandoContenido = false;

    function mostrarErrorCarga(mensaje) {
        var ids = ['slidesLista', 'eventosLista', 'noticiasLista'];
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
            if (btn) btn.addEventListener('click', function () { refrescarTodo(); });
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

        contenido.general  = r.general  || null;
        contenido.contacto = r.contacto || null;
        contenido.slides   = r.slides   || [];
        contenido.eventos  = r.eventos  || [];
        contenido.noticias = r.noticias || [];
        return true;
    }

    function pintarApartado(fn) {
        try { fn(); }
        catch (e) {
            console.error(e);
            mostrarToast('Ocurrió un error al mostrar un apartado. Reintenta.');
        }
    }

    async function refrescarTodo() {
        if (cargandoContenido) return;
        cargandoContenido = true;
        try {
            if (await cargarContenido()) {
                if (document.getElementById('slidesLista')) pintarApartado(pintarSlides);
                if (document.getElementById('eventosLista')) pintarApartado(pintarEventos);
                if (document.getElementById('noticiasLista')) pintarApartado(pintarNoticias);
                if (document.getElementById('formGeneral')) pintarApartado(pintarGeneral);
                if (document.getElementById('formContacto')) pintarApartado(pintarContacto);
            }
        } finally {
            cargandoContenido = false;
        }
    }

    // Vigila que las listas dejen de mostrar "Cargando…". Si se quedan
    // atascadas (petición interrumpida o error de arranque), reintenta la carga.
    function listasAtascadas() {
        var ids = ['slidesLista', 'eventosLista', 'noticiasLista'];
        for (var i = 0; i < ids.length; i++) {
            var lista = document.getElementById(ids[i]);
            if (lista && lista.querySelector('.cargando-txt')) return true;
        }
        return false;
    }

    (function vigilarCarga() {
        setTimeout(function () {
            if (!listasAtascadas()) return;
            refrescarTodo();
            if (listasAtascadas()) setTimeout(vigilarCarga, 4000);
        }, 3000);
    })();

    // Arranca la carga del contenido de inmediato, aunque otra rutina
    // del panel falle durante la inicialización.
    refrescarTodo();

    // ==== SLIDES ====
    var formSlide = document.getElementById('formSlide');
    var slideFormulario = document.getElementById('slideFormulario');
    var slideEditandoId = 0;

    function pintarSlides() {
        var lista = document.getElementById('slidesLista');
        if (!lista) return;

        if (!contenido.slides.length) {
            lista.innerHTML = '<p class="lista-vacia"><i class="fa-regular fa-images"></i> Aún no hay slides.</p>';
            return;
        }

        var degradados = [
            'linear-gradient(135deg, #1e3a8a, #2563eb, #0d9488, #f59e0b)',
            'linear-gradient(135deg, #0f766e, #14b8a6, #fbbf24)',
            'linear-gradient(135deg, #7c3aed, #6366f1, #0ea5e9)',
            'linear-gradient(135deg, #b45309, #f59e0b, #f97316)'
        ];

        lista.innerHTML = '';
        contenido.slides.forEach(function (s, i) {
            var item = document.createElement('div');
            item.className = 'slide-item';
            item.dataset.id = s.id;

            var previo;
            if (s.imagenes && s.imagenes.length) {
                previo = '<div class="slide-preview"><img src="' + esc(AuthDB.imagenRuta(s.imagenes[0].ruta)) + '" alt="Slide"></div>';
            } else {
                previo = '<div class="slide-preview"><div class="slide-preview-color" style="background:' + degradados[i % degradados.length] + ';"></div><span class="slide-num">' + (i + 1) + '</span></div>';
            }

            var nImg = (s.imagenes && s.imagenes.length) || 0;

            item.innerHTML =
                previo +
                '<div class="slide-info">' +
                    '<h4>' + esc(s.titulo) + '</h4>' +
                    '<p>' + esc(s.pill || '') + ' · ' + esc(s.subtitulo || '') + '</p>' +
                    (nImg ? '<span class="img-badge"><i class="fa-regular fa-image"></i> ' + nImg + '</span>' : '') +
                '</div>' +
                '<div class="slide-acciones">' +
                    '<button class="btn-editar-slide" title="Editar"><i class="fa-solid fa-pen"></i></button>' +
                    '<button class="btn-eliminar" title="Eliminar"><i class="fa-solid fa-trash"></i></button>' +
                '</div>';

            lista.appendChild(item);
        });

        bindLista(lista, 'btn-editar-slide', function (item) { abrirFormSlide(parseInt(item.dataset.id, 10)); });
        bindLista(lista, 'btn-eliminar', function (item) { borrarSlide(parseInt(item.dataset.id, 10)); });
    }

    function abrirFormSlide(id) {
        slideEditandoId = id;
        formSlide.reset();

        var obj = null;
        for (var i = 0; i < contenido.slides.length; i++) {
            if (contenido.slides[i].id === id) obj = contenido.slides[i];
        }

        if (obj) {
            document.getElementById('slideTitulo').value      = obj.titulo || '';
            document.getElementById('slideSubtitulo').value   = obj.subtitulo || '';
            document.getElementById('slidePill').value        = obj.pill || '';
            document.getElementById('slideDescripcion').value = obj.descripcion || '';
            document.getElementById('slideBtnTexto').value    = obj.btn_texto || '';
            document.getElementById('slideBtnEnlace').value   = obj.btn_enlace || '';
            gestores.slides.setExistentes(obj.imagenes || []);
        } else {
            gestores.slides.limpiar();
        }

        slideFormulario.style.display = 'block';
        slideFormulario.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    async function borrarSlide(id) {
        if (!confirm('¿Eliminar este slide? También se borrarán sus imágenes.')) return;
        var r = await AuthDB.apiContenido('eliminar_slide', { id: id });
        if (r && r.ok) { mostrarToast('Slide eliminado.'); refrescarTodo(); }
        else mostrarToast((r && r.error) || 'No se pudo eliminar el slide.');
    }

    if (document.getElementById('btnAgregarSlide')) {
        document.getElementById('btnAgregarSlide').addEventListener('click', function () { abrirFormSlide(0); });
    }
    if (document.getElementById('btnCancelarSlide')) {
        document.getElementById('btnCancelarSlide').addEventListener('click', function () {
            slideFormulario.style.display = 'none';
            formSlide.reset();
            gestores.slides.limpiar();
        });
    }
    if (formSlide) {
        formSlide.addEventListener('submit', async function (e) {
            e.preventDefault();
            var orden = 1;
            contenido.slides.forEach(function (s) { if (s.orden >= orden) orden = s.orden + 1; });

            var r = await AuthDB.apiContenido('guardar_slide', {
                id: slideEditandoId || 0,
                titulo: document.getElementById('slideTitulo').value,
                subtitulo: document.getElementById('slideSubtitulo').value,
                pill: document.getElementById('slidePill').value,
                descripcion: document.getElementById('slideDescripcion').value,
                btn_texto: document.getElementById('slideBtnTexto').value,
                btn_enlace: document.getElementById('slideBtnEnlace').value,
                orden: orden
            });

            if (!r || !r.ok) {
                mostrarToast((r && r.error) || 'No se pudo guardar el slide.');
                return;
            }

            var pendientes = gestores.slides.getPendientes();
            if (pendientes.length) {
                var sub = await AuthDB.subirImagenes('slides', r.id, pendientes);
                if (!sub || !sub.ok) mostrarToast('Slide guardado, pero no se pudieron subir las imágenes.');
            }

            slideFormulario.style.display = 'none';
            formSlide.reset();
            gestores.slides.limpiar();
            mostrarToast('Slide guardado correctamente.');
            refrescarTodo();
        });
    }

    // ==== EVENTOS ====
    var formEvento = document.getElementById('formEvento');
    var eventoFormulario = document.getElementById('eventoFormulario');
    var eventoEditandoId = 0;

    function pintarEventos() {
        var lista = document.getElementById('eventosLista');
        if (!lista) return;

        // Refresca el calendario del panel primero
        if (document.getElementById('adminCalCeldas')) pintarApartado(renderCalendarioAdmin);

        if (!contenido.eventos.length) {
            lista.innerHTML = '<p class="lista-vacia"><i class="fa-regular fa-calendar-days"></i> Aún no hay eventos.</p>';
            return;
        }

        lista.innerHTML = '';
        contenido.eventos.forEach(function (ev) {
            var item = document.createElement('div');
            item.className = 'evento-item';
            item.dataset.id = ev.id;

            var portada = '';
            if (ev.imagenes && ev.imagenes.length) {
                portada = '<img class="evento-thumb" src="' + esc(AuthDB.imagenRuta(ev.imagenes[0].ruta)) + '" alt="Evento">';
            }
            var nImg = (ev.imagenes && ev.imagenes.length) || 0;

            item.innerHTML =
                portada +
                '<div class="evento-fecha-box">' +
                    '<span class="evento-dia">' + esc(ev.dia || '--') + '</span>' +
                    '<span class="evento-mes">' + esc(ev.mes || 'MES') + '</span>' +
                '</div>' +
                '<div class="evento-info">' +
                    '<h4>' + esc(ev.nombre) + '</h4>' +
                    '<p><i class="fa-regular fa-clock"></i> ' + esc(ev.hora_inicio || '00:00') + ' - ' + esc(ev.hora_fin || '00:00') + '</p>' +
                    '<p><i class="fa-solid fa-location-dot"></i> ' + esc(ev.lugar || 'Por definir') + '</p>' +
                    (nImg ? '<span class="img-badge"><i class="fa-regular fa-image"></i> ' + nImg + '</span>' : '') +
                '</div>' +
                '<div class="evento-acciones">' +
                    '<button class="btn-editar-evento" title="Editar"><i class="fa-solid fa-pen"></i></button>' +
                    '<button class="btn-eliminar" title="Eliminar"><i class="fa-solid fa-trash"></i></button>' +
                '</div>';

            lista.appendChild(item);
        });

        bindLista(lista, 'btn-editar-evento', function (item) { abrirFormEvento(parseInt(item.dataset.id, 10)); });
        bindLista(lista, 'btn-eliminar', function (item) { borrarEvento(parseInt(item.dataset.id, 10)); });
    }

    // ==== Calendario del panel admin ====
    var calAdminAnio = new Date().getFullYear();
    var calAdminMes = new Date().getMonth(); // 0 = Enero
    var calAdminDiaSeleccionado = null;
    var MESES_CAL_ADMIN = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
        'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

    function dosCifrasCal(n) {
        return (n < 10 ? '0' : '') + n;
    }

    function isoFechaCal(y, m, d) {
        return y + '-' + dosCifrasCal(m + 1) + '-' + dosCifrasCal(d);
    }

    function eventosDelDiaCal(fechaClave) {
        return contenido.eventos.filter(function (ev) { return ev.fecha === fechaClave; });
    }

    function renderCalendarioAdmin() {
        var titulo = document.getElementById('adminCalMes');
        var celdas = document.getElementById('adminCalCeldas');
        if (!titulo || !celdas) return;

        titulo.textContent = MESES_CAL_ADMIN[calAdminMes] + ' ' + calAdminAnio;

        // Celdas vacías antes del día 1
        celdas.innerHTML = '';
        var primerDia = new Date(calAdminAnio, calAdminMes, 1).getDay();
        var offset = (primerDia === 0) ? 6 : primerDia - 1;
        var totalDias = new Date(calAdminAnio, calAdminMes + 1, 0).getDate();
        var hoy = new Date();

        for (var i = 0; i < offset; i++) {
            var v = document.createElement('span');
            v.className = 'cal-vacio';
            celdas.appendChild(v);
        }

        for (var d = 1; d <= totalDias; d++) {
            var el = document.createElement('span');
            el.className = 'cal-dia';
            el.textContent = d;
            el.dataset.anio = calAdminAnio;
            el.dataset.mes = calAdminMes;
            el.dataset.dia = d;

            var clave = isoFechaCal(calAdminAnio, calAdminMes, d);
            var eventosDia = eventosDelDiaCal(clave);

            if (eventosDia.length) el.classList.add('con-evento');

            if (calAdminAnio === hoy.getFullYear() && calAdminMes === hoy.getMonth() && d === hoy.getDate()) {
                el.classList.add('hoy');
            }

            if (calAdminDiaSeleccionado === clave) el.classList.add('activo');

            el.addEventListener('click', (function (cl) {
                return function () {
                    calAdminDiaSeleccionado = (calAdminDiaSeleccionado === cl) ? null : cl;
                    renderCalendarioAdmin();
                    pintarEventosDelDia(cl);
                };
            })(clave));

            celdas.appendChild(el);
        }

        // Celdas vacías al final para completar la semana
        var resto = (7 - ((offset + totalDias) % 7)) % 7;
        for (var j = 0; j < resto; j++) {
            var v2 = document.createElement('span');
            v2.className = 'cal-vacio';
            celdas.appendChild(v2);
        }

        // Lista lateral del día seleccionado
        pintarEventosDelDia(calAdminDiaSeleccionado);
    }

    function pintarEventosDelDia(fechaClave) {
        var contenedor = document.getElementById('adminCalEventos');
        if (!contenedor) return;

        if (!fechaClave) {
            contenedor.innerHTML = '<p class="lista-vacia">Selecciona un día marcado en el calendario para ver y gestionar sus eventos.</p>';
            return;
        }

        var eventosDia = eventosDelDiaCal(fechaClave);

        if (!eventosDia.length) {
            contenedor.innerHTML = '<p class="lista-vacia">Este día no tiene eventos. Agrégalo con el botón de más abajo.</p>';
            return;
        }

        contenedor.innerHTML = '';
        var ul = document.createElement('ul');

        eventosDia.forEach(function (ev) {
            var li = document.createElement('li');
            var strong = document.createElement('strong');
            strong.textContent = ev.nombre || 'Evento';

            var span = document.createElement('span');
            span.innerHTML =
                '<i class="fa-regular fa-clock"></i> ' + esc(ev.hora_inicio || '--') + ' - ' + esc(ev.hora_fin || '--') +
                ' · <i class="fa-solid fa-location-dot"></i> ' + esc(ev.lugar || 'Por definir');

            var acciones = document.createElement('div');
            acciones.className = 'cal-evento-acciones';

            var btnEdit = document.createElement('button');
            btnEdit.type = 'button';
            btnEdit.className = 'cal-btn-editar';
            btnEdit.innerHTML = '<i class="fa-solid fa-pen"></i> Editar';
            btnEdit.addEventListener('click', function () { abrirFormEvento(parseInt(ev.id, 10)); });

            var btnDel = document.createElement('button');
            btnDel.type = 'button';
            btnDel.className = 'cal-btn-eliminar';
            btnDel.innerHTML = '<i class="fa-solid fa-trash"></i> Eliminar';
            btnDel.addEventListener('click', function () { borrarEvento(parseInt(ev.id, 10)); });

            acciones.appendChild(btnEdit);
            acciones.appendChild(btnDel);
            li.appendChild(strong);
            li.appendChild(span);
            li.appendChild(acciones);
            ul.appendChild(li);
        });

        contenedor.appendChild(ul);
    }

    if (document.getElementById('adminCalAnterior')) {
        document.getElementById('adminCalAnterior').addEventListener('click', function () {
            calAdminMes--;
            if (calAdminMes < 0) { calAdminMes = 11; calAdminAnio--; }
            calAdminDiaSeleccionado = null;
            renderCalendarioAdmin();
        });
    }

    if (document.getElementById('adminCalSiguiente')) {
        document.getElementById('adminCalSiguiente').addEventListener('click', function () {
            calAdminMes++;
            if (calAdminMes > 11) { calAdminMes = 0; calAdminAnio++; }
            calAdminDiaSeleccionado = null;
            renderCalendarioAdmin();
        });
    }

    function abrirFormEvento(id) {
        eventoEditandoId = id;
        formEvento.reset();

        var obj = null;
        for (var i = 0; i < contenido.eventos.length; i++) {
            if (contenido.eventos[i].id === id) obj = contenido.eventos[i];
        }

        if (obj) {
            document.getElementById('eventoNombre').value      = obj.nombre || '';
            document.getElementById('eventoFecha').value       = obj.fecha || '';
            document.getElementById('eventoDia').value         = obj.dia || '';
            document.getElementById('eventoLugar').value       = obj.lugar || '';
            if (obj.mes) document.getElementById('eventoMes').value = obj.mes;
            document.getElementById('eventoHoraInicio').value  = obj.hora_inicio || '07:00';
            document.getElementById('eventoHoraFin').value     = obj.hora_fin || '14:00';
            gestores.eventos.setExistentes(obj.imagenes || []);
        } else {
            // Nuevo evento: precarga la fecha del día seleccionado en el calendario
            if (calAdminDiaSeleccionado) {
                document.getElementById('eventoFecha').value = calAdminDiaSeleccionado;
                var partes = calAdminDiaSeleccionado.split('-');
                document.getElementById('eventoDia').value = parseInt(partes[2], 10) || '';
                var indiceMes = (parseInt(partes[1], 10) || 1) - 1;
                document.getElementById('eventoMes').value = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC'][(indiceMes >= 0 && indiceMes < 12) ? indiceMes : 0];
            }
            gestores.eventos.limpiar();
        }

        eventoFormulario.style.display = 'block';
        eventoFormulario.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    async function borrarEvento(id) {
        if (!confirm('¿Eliminar este evento? También se borrarán sus imágenes.')) return;
        var r = await AuthDB.apiContenido('eliminar_evento', { id: id });
        if (r && r.ok) { mostrarToast('Evento eliminado.'); refrescarTodo(); }
        else mostrarToast((r && r.error) || 'No se pudo eliminar el evento.');
    }

    if (document.getElementById('btnAgregarEvento')) {
        document.getElementById('btnAgregarEvento').addEventListener('click', function () { abrirFormEvento(0); });
    }
    if (document.getElementById('btnCancelarEvento')) {
        document.getElementById('btnCancelarEvento').addEventListener('click', function () {
            eventoFormulario.style.display = 'none';
            formEvento.reset();
            gestores.eventos.limpiar();
        });
    }
    if (formEvento) {
        formEvento.addEventListener('submit', async function (e) {
            e.preventDefault();
            var orden = 1;
            contenido.eventos.forEach(function (ev) { if (ev.orden >= orden) orden = ev.orden + 1; });

            var r = await AuthDB.apiContenido('guardar_evento', {
                id: eventoEditandoId || 0,
                nombre: document.getElementById('eventoNombre').value,
                fecha: document.getElementById('eventoFecha').value,
                dia: document.getElementById('eventoDia').value,
                mes: document.getElementById('eventoMes').value,
                hora_inicio: document.getElementById('eventoHoraInicio').value,
                hora_fin: document.getElementById('eventoHoraFin').value,
                lugar: document.getElementById('eventoLugar').value,
                orden: orden
            });

            if (!r || !r.ok) {
                mostrarToast((r && r.error) || 'No se pudo guardar el evento.');
                return;
            }

            var pendientes = gestores.eventos.getPendientes();
            if (pendientes.length) {
                var sub = await AuthDB.subirImagenes('eventos', r.id, pendientes);
                if (!sub || !sub.ok) mostrarToast('Evento guardado, pero no se pudieron subir las imágenes.');
            }

            eventoFormulario.style.display = 'none';
            formEvento.reset();
            gestores.eventos.limpiar();
            mostrarToast('Evento "' + document.getElementById('eventoNombre').value + '" guardado correctamente.');
            refrescarTodo();
        });
    }

    // ==== NOTICIAS ====
    var formNoticia = document.getElementById('formNoticia');
    var noticiaFormulario = document.getElementById('noticiaFormulario');
    var noticiaEditandoId = 0;

    function pintarNoticias() {
        var lista = document.getElementById('noticiasLista');
        if (!lista) return;

        if (!contenido.noticias.length) {
            lista.innerHTML = '<p class="lista-vacia"><i class="fa-solid fa-bullhorn"></i> Aún no hay noticias.</p>';
            return;
        }

        lista.innerHTML = '';
        contenido.noticias.forEach(function (n) {
            var item = document.createElement('div');
            item.className = 'noticia-item';
            item.dataset.id = n.id;

            var preview = '<div class="noticia-img-preview"><i class="fa-regular fa-image"></i></div>';
            if (n.imagenes && n.imagenes.length) {
                preview = '<div class="noticia-img-preview"><img src="' + esc(AuthDB.imagenRuta(n.imagenes[0].ruta)) + '" alt="Noticia"></div>';
            }
            var nImg = (n.imagenes && n.imagenes.length) || 0;

            item.innerHTML =
                preview +
                '<div class="noticia-info">' +
                    '<h4>' + esc(n.titulo) + '</h4>' +
                    '<p>' + esc(n.resumen || 'Sin resumen') + '</p>' +
                    '<span class="noticia-fecha"><i class="fa-regular fa-calendar"></i> ' + esc(fechaLarga(n.fecha)) + '</span>' +
                    (nImg ? ' &nbsp; <span class="img-badge"><i class="fa-regular fa-image"></i> ' + nImg + '</span>' : '') +
                '</div>' +
                '<div class="noticia-acciones">' +
                    '<button class="btn-editar-noticia" title="Editar"><i class="fa-solid fa-pen"></i></button>' +
                    '<button class="btn-eliminar" title="Eliminar"><i class="fa-solid fa-trash"></i></button>' +
                '</div>';

            lista.appendChild(item);
        });

        bindLista(lista, 'btn-editar-noticia', function (item) { abrirFormNoticia(parseInt(item.dataset.id, 10)); });
        bindLista(lista, 'btn-eliminar', function (item) { borrarNoticia(parseInt(item.dataset.id, 10)); });
    }

    function abrirFormNoticia(id) {
        noticiaEditandoId = id;
        formNoticia.reset();

        var obj = null;
        for (var i = 0; i < contenido.noticias.length; i++) {
            if (contenido.noticias[i].id === id) obj = contenido.noticias[i];
        }

        if (obj) {
            document.getElementById('noticiaTitulo').value    = obj.titulo || '';
            document.getElementById('noticiaResumen').value   = obj.resumen || '';
            document.getElementById('noticiaContenido').value = obj.contenido || '';
            document.getElementById('noticiaFecha').value     = obj.fecha || '';
            gestores.noticias.setExistentes(obj.imagenes || []);
        } else {
            gestores.noticias.limpiar();
        }

        noticiaFormulario.style.display = 'block';
        noticiaFormulario.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    async function borrarNoticia(id) {
        if (!confirm('¿Eliminar esta noticia? También se borrarán sus imágenes.')) return;
        var r = await AuthDB.apiContenido('eliminar_noticia', { id: id });
        if (r && r.ok) { mostrarToast('Noticia eliminada.'); refrescarTodo(); }
        else mostrarToast((r && r.error) || 'No se pudo eliminar la noticia.');
    }

    if (document.getElementById('btnAgregarNoticia')) {
        document.getElementById('btnAgregarNoticia').addEventListener('click', function () { abrirFormNoticia(0); });
    }
    if (document.getElementById('btnCancelarNoticia')) {
        document.getElementById('btnCancelarNoticia').addEventListener('click', function () {
            noticiaFormulario.style.display = 'none';
            formNoticia.reset();
            gestores.noticias.limpiar();
        });
    }
    if (formNoticia) {
        formNoticia.addEventListener('submit', async function (e) {
            e.preventDefault();

            var r = await AuthDB.apiContenido('guardar_noticia', {
                id: noticiaEditandoId || 0,
                titulo: document.getElementById('noticiaTitulo').value,
                resumen: document.getElementById('noticiaResumen').value,
                contenido: document.getElementById('noticiaContenido').value,
                fecha: document.getElementById('noticiaFecha').value
            });

            if (!r || !r.ok) {
                mostrarToast((r && r.error) || 'No se pudo guardar la noticia.');
                return;
            }

            var pendientes = gestores.noticias.getPendientes();
            if (pendientes.length) {
                var sub = await AuthDB.subirImagenes('noticias', r.id, pendientes);
                if (!sub || !sub.ok) mostrarToast('Noticia guardada, pero no se pudieron subir las imágenes.');
            }

            noticiaFormulario.style.display = 'none';
            formNoticia.reset();
            gestores.noticias.limpiar();
            mostrarToast('Noticia publicada correctamente.');
            refrescarTodo();
        });
    }

    // ==== Información General ====
    var formGeneral = document.getElementById('formGeneral');
    if (formGeneral) {
        formGeneral.addEventListener('submit', async function (e) {
            e.preventDefault();
            var r = await AuthDB.apiContenido('guardar_general', {
                nombre_institucion: document.getElementById('nombreInstitucion').value,
                lema: document.getElementById('lemaInstitucion').value,
                mision: document.getElementById('mision').value,
                vision: document.getElementById('vision').value,
                anio_lectivo: document.getElementById('anioLectivo').value,
                telefono: document.getElementById('telefonoGeneral').value,
                email: document.getElementById('emailGeneral').value,
                direccion: document.getElementById('direccionGeneral').value
            });
            if (r && r.ok) mostrarToast('Información general guardada en MySQL.');
            else mostrarToast((r && r.error) || 'No se pudo guardar.');
        });
    }

    function pintarGeneral() {
        if (!contenido.general) return;
        var g = contenido.general;
        if (g.nombre_institucion) document.getElementById('nombreInstitucion').value = g.nombre_institucion;
        if (g.lema) document.getElementById('lemaInstitucion').value = g.lema;
        if (g.mision) document.getElementById('mision').value = g.mision;
        if (g.vision) document.getElementById('vision').value = g.vision;
        if (g.anio_lectivo) document.getElementById('anioLectivo').value = g.anio_lectivo;
        if (g.telefono) document.getElementById('telefonoGeneral').value = g.telefono;
        if (g.email) document.getElementById('emailGeneral').value = g.email;
        if (g.direccion) document.getElementById('direccionGeneral').value = g.direccion;
    }

    // ==== Contacto ====
    var formContacto = document.getElementById('formContacto');
    if (formContacto) {
        formContacto.addEventListener('submit', async function (e) {
            e.preventDefault();
            var r = await AuthDB.apiContenido('guardar_contacto', {
                tel1: document.getElementById('contactoTel1').value,
                tel2: document.getElementById('contactoTel2').value,
                email1: document.getElementById('contactoEmail1').value,
                email2: document.getElementById('contactoEmail2').value,
                direccion: document.getElementById('contactoDireccion').value,
                facebook: document.getElementById('contactoFacebook').value,
                instagram: document.getElementById('contactoInstagram').value,
                youtube: document.getElementById('contactoYoutube').value,
                frase: document.getElementById('contactoFrase').value
            });
            if (r && r.ok) mostrarToast('Información de contacto guardada en MySQL.');
            else mostrarToast((r && r.error) || 'No se pudo guardar.');
        });
    }

    function pintarContacto() {
        if (!contenido.contacto) return;
        var c = contenido.contacto;
        if (c.tel1) document.getElementById('contactoTel1').value = c.tel1;
        if (c.tel2) document.getElementById('contactoTel2').value = c.tel2;
        if (c.email1) document.getElementById('contactoEmail1').value = c.email1;
        if (c.email2) document.getElementById('contactoEmail2').value = c.email2;
        if (c.direccion) document.getElementById('contactoDireccion').value = c.direccion;
        if (c.facebook) document.getElementById('contactoFacebook').value = c.facebook;
        if (c.instagram) document.getElementById('contactoInstagram').value = c.instagram;
        if (c.youtube) document.getElementById('contactoYoutube').value = c.youtube;
        if (c.frase) document.getElementById('contactoFrase').value = c.frase;
    }

    // ==== Utilidad: delegación de botones dentro de una lista ====
    function bindLista(lista, claseBoton, accion) {
        lista.querySelectorAll('.' + claseBoton).forEach(function (btn) {
            btn.addEventListener('click', function () {
                var item = btn.closest('[data-id]');
                if (item) accion(item);
            });
        });
    }

    refrescarTodo();

})();