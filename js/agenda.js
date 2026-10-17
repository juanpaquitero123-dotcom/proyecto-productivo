/* ==================== AGENDA INSTITUCIONAL ====================
   Página interna para docentes y administrativos.
   - Docentes: consultan el calendario y las actividades.
   - Administradores: además crean, editan y eliminan entradas.

   Se apoya en AuthDB (js/auth.js) para hablar con php/agenda.php.
   ============================================================== */
(function () {
    'use strict';

    var MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
        'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

    var DIAS_CORTOS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

    var TIPOS = {
        evento:       { texto: 'Evento',       icono: 'fa-solid fa-calendar-day' },
        reunion:      { texto: 'Reunión',      icono: 'fa-solid fa-users' },
        recordatorio: { texto: 'Recordatorio', icono: 'fa-solid fa-bell' },
        academico:    { texto: 'Académico',    icono: 'fa-solid fa-graduation-cap' }
    };

    var sesion = null;
    var esAdmin = false;
    var eventos = [];
    var filtroTipo = '';
    var vista = { anio: 0, mes: 0 };      // mes: 0-11
    var diaSeleccionado = null;           // 'YYYY-MM-DD' o null
    var semanaRef = null;                 // Date: lunes de la semana mostrada

    // ── Utilidades ───────────────────────────────────────────
    function esc(s) {
        return String(s == null ? '' : s)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }

    function dos(n) { return (n < 10 ? '0' : '') + n; }

    function isoDeFecha(d) {
        return d.getFullYear() + '-' + dos(d.getMonth() + 1) + '-' + dos(d.getDate());
    }

    function parseIsoFecha(iso) {
        var p = String(iso || '').split('-');
        if (p.length !== 3) return null;
        return new Date(parseInt(p[0], 10), parseInt(p[1], 10) - 1, parseInt(p[2], 10));
    }

    function hoyIso() { return isoDeFecha(new Date()); }

    function lunesDe(d) {
        var x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
        var desplazamiento = (x.getDay() + 6) % 7; // lunes = 0
        x.setDate(x.getDate() - desplazamiento);
        return x;
    }

    function sumarDias(d, n) {
        return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
    }

    function tituloSemana(lunes, domingo) {
        var m1 = MESES[lunes.getMonth()];
        var m2 = MESES[domingo.getMonth()];
        if (lunes.getMonth() === domingo.getMonth()) {
            return lunes.getDate() + ' – ' + domingo.getDate() + ' de ' + m1 + ' de ' + domingo.getFullYear();
        }
        if (lunes.getFullYear() === domingo.getFullYear()) {
            return lunes.getDate() + ' ' + m1 + ' – ' + domingo.getDate() + ' ' + m2 + ' de ' + domingo.getFullYear();
        }
        return lunes.getDate() + ' ' + m1 + ' ' + lunes.getFullYear() + ' – ' +
            domingo.getDate() + ' ' + m2 + ' ' + domingo.getFullYear();
    }

    function tipoInfo(tipo) {
        return TIPOS[tipo] || { texto: tipo || 'Actividad', icono: 'fa-solid fa-calendar-day' };
    }

    function api(accion, datos) {
        datos = datos || {};
        datos.accion = accion;
        return AuthDB.llamarAPI('agenda.php', datos, 12000);
    }

    function $(id) { return document.getElementById(id); }

    // ── Sesión ───────────────────────────────────────────────
    async function verificarSesion() {
        try {
            var r = await AuthDB.getSesion();
            if (!r || !r.ok || !r.usuario) {
                window.location.replace('login.html?dest=agenda.html');
                return false;
            }
            var rol = r.usuario.rol;
            if (rol !== 'admin' && rol !== 'docente') {
                // Estudiantes y padres no tienen acceso a la agenda interna.
                window.location.replace('index.html');
                return false;
            }
            sesion = r.usuario;
            esAdmin = (rol === 'admin');
            return true;
        } catch (e) {
            window.location.replace('login.html?dest=agenda.html');
            return false;
        }
    }

    // ── Carga de datos ───────────────────────────────────────
    async function cargar() {
        var r = await api('listar', filtroTipo ? { tipo: filtroTipo } : {});
        if (!r || !r.ok) {
            eventos = [];
            var msg = (r && r.error) || 'No se pudo cargar la agenda.';
            $('agendaCeldas').innerHTML = '<p class="agenda-cargando">' + esc(msg) + '</p>';
            $('agendaLista').innerHTML = '<p class="agenda-vacio">' + esc(msg) + '</p>';
            var grillaError = $('semanaGrid');
            if (grillaError) grillaError.innerHTML = '<p class="agenda-vacio">' + esc(msg) + '</p>';
            return;
        }
        eventos = Array.isArray(r.eventos) ? r.eventos : [];
        pintarCalendario();
        pintarLista();
        pintarSemana();
    }

    // ── Eventos por día ──────────────────────────────────────
    function eventosDe(iso) {
        return eventos.filter(function (e) { return e.fecha === iso; })
            .sort(function (a, b) {
                return String(a.hora_inicio || '').localeCompare(String(b.hora_inicio || ''));
            });
    }

    // ── Calendario ───────────────────────────────────────────
    function pintarCalendario() {
        var cont = $('agendaCeldas');
        if (!cont) return;

        var anio = vista.anio;
        var mes = vista.mes;
        $('agendaMesTitulo').textContent = MESES[mes] + ' ' + anio;

        var primerDia = new Date(anio, mes, 1);
        var inicioSemana = (primerDia.getDay() + 6) % 7; // Lunes = 0
        var diasMes = new Date(anio, mes + 1, 0).getDate();
        var hoy = hoyIso();

        var celdaInicio = new Date(anio, mes, 1 - inicioSemana);

        // 6 semanas = 42 celdas (cubre cualquier mes)
        var html = '';
        for (var i = 0; i < 42; i++) {
            var d = new Date(celdaInicio.getFullYear(), celdaInicio.getMonth(), celdaInicio.getDate() + i);
            var iso = isoDeFecha(d);
            var otroMes = (d.getMonth() !== mes);
            var lista = eventosDe(iso);

            var clases = 'agenda-celda';
            if (otroMes) clases += ' otro-mes';
            if (iso === hoy) clases += ' hoy';
            if (iso === diaSeleccionado) clases += ' activo';

            var chips = '';
            if (lista.length) {
                var max = 2;
                for (var j = 0; j < Math.min(max, lista.length); j++) {
                    var ev = lista[j];
                    var info = tipoInfo(ev.tipo);
                    chips += '<span class="agenda-chip tipo-' + esc(ev.tipo) + '" title="' + esc(ev.titulo) + '">' +
                        '<i class="' + info.icono + '"></i>' + esc(ev.titulo) + '</span>';
                }
                if (lista.length > max) {
                    chips += '<span class="agenda-chip-mas">+' + (lista.length - max) +
                        '<span class="agenda-chip-mas-txt"> más</span></span>';
                }
            }

            html += '<button type="button" class="' + clases + '" data-fecha="' + iso + '">' +
                '<span class="agenda-num-dia">' + d.getDate() + '</span>' +
                '<span class="agenda-chips">' + chips + '</span>' +
                '</button>';
        }

        cont.innerHTML = html;
    }

    // ── Lista lateral ────────────────────────────────────────
    function pintarLista() {
        var cont = $('agendaLista');
        if (!cont) return;

        var lista;
        var titulo;

        if (diaSeleccionado) {
            lista = eventosDe(diaSeleccionado);
            var f = parseIsoFecha(diaSeleccionado);
            titulo = f ? ('Actividades del ' + f.getDate() + ' de ' + MESES[f.getMonth()]) : 'Actividades del día';
        } else {
            var hoy = hoyIso();
            lista = eventos.filter(function (e) { return e.fecha >= hoy; })
                .sort(function (a, b) {
                    if (a.fecha !== b.fecha) return a.fecha < b.fecha ? -1 : 1;
                    return String(a.hora_inicio || '').localeCompare(String(b.hora_inicio || ''));
                })
                .slice(0, 12);
            titulo = 'Próximas actividades';
        }

        $('agendaListaTitulo').textContent = titulo;

        if (!lista.length) {
            cont.innerHTML = '<p class="agenda-vacio">' +
                (diaSeleccionado ? 'No hay actividades programadas para este día.'
                                 : 'No hay actividades próximas en la agenda.') +
                '</p>';
            return;
        }

        var html = '';
        lista.forEach(function (ev) { html += itemHtml(ev); });
        cont.innerHTML = html;
    }

    function itemHtml(ev) {
        var info = tipoInfo(ev.tipo);
        var f = parseIsoFecha(ev.fecha);
        var fechaTxt = f ? (f.getDate() + ' de ' + MESES[f.getMonth()] + ' de ' + f.getFullYear()) : ev.fecha;

        var meta = '<span><i class="fa-regular fa-calendar"></i>' + esc(fechaTxt) + '</span>';
        if (ev.hora_inicio) {
            var hora = esc(ev.hora_inicio) + (ev.hora_fin ? ' – ' + esc(ev.hora_fin) : '');
            meta += '<span><i class="fa-regular fa-clock"></i>' + hora + '</span>';
        }
        if (ev.lugar) {
            meta += '<span><i class="fa-solid fa-location-dot"></i>' + esc(ev.lugar) + '</span>';
        }

        var acciones = '';
        if (esAdmin) {
            acciones = '<div class="agenda-item-acciones">' +
                '<button type="button" class="agenda-btn-editar" data-editar="' + ev.id + '">' +
                    '<i class="fa-solid fa-pen"></i> Editar</button>' +
                '<button type="button" class="agenda-btn-eliminar" data-eliminar="' + ev.id + '">' +
                    '<i class="fa-solid fa-trash"></i> Eliminar</button>' +
                '</div>';
        }

        var desc = ev.descripcion ? '<p class="agenda-item-desc">' + esc(ev.descripcion) + '</p>' : '';

        return '<article class="agenda-item tipo-' + esc(ev.tipo) + '">' +
            '<div class="agenda-item-top">' +
                '<span class="agenda-item-tipo"><i class="' + info.icono + '"></i> ' + esc(info.texto) + '</span>' +
            '</div>' +
            '<h5>' + esc(ev.titulo) + '</h5>' +
            '<div class="agenda-item-meta">' + meta + '</div>' +
            desc +
            acciones +
            '</article>';
    }

    // ── Vista semanal ────────────────────────────────────────
    function itemSemanaHtml(ev) {
        var info = tipoInfo(ev.tipo);

        var hora = '';
        if (ev.hora_inicio) {
            hora = esc(ev.hora_inicio) + (ev.hora_fin ? ' – ' + esc(ev.hora_fin) : '');
        }

        var lugar = ev.lugar
            ? '<span class="agenda-mini-lugar"><i class="fa-solid fa-location-dot"></i>' + esc(ev.lugar) + '</span>'
            : '';

        var acciones = '';
        if (esAdmin) {
            acciones = '<div class="agenda-mini-acciones">' +
                '<button type="button" class="agenda-mini-btn" data-editar="' + ev.id + '" title="Editar" aria-label="Editar">' +
                    '<i class="fa-solid fa-pen"></i></button>' +
                '<button type="button" class="agenda-mini-btn" data-eliminar="' + ev.id + '" title="Eliminar" aria-label="Eliminar">' +
                    '<i class="fa-solid fa-trash"></i></button>' +
                '</div>';
        }

        return '<article class="agenda-mini tipo-' + esc(ev.tipo) + '" title="' + esc(ev.titulo) + '">' +
            '<span class="agenda-mini-tipo"><i class="' + info.icono + '"></i></span>' +
            '<div class="agenda-mini-cuerpo">' +
                (hora ? '<span class="agenda-mini-hora">' + hora + '</span>' : '') +
                '<span class="agenda-mini-titulo">' + esc(ev.titulo) + '</span>' +
                lugar +
            '</div>' +
            acciones +
            '</article>';
    }

    function pintarSemana() {
        var cont = $('semanaGrid');
        if (!cont) return;

        if (!semanaRef) semanaRef = lunesDe(new Date());

        var lunes = semanaRef;
        var domingo = sumarDias(lunes, 6);

        var titulo = $('semanaTitulo');
        if (titulo) titulo.textContent = tituloSemana(lunes, domingo);

        var hoy = hoyIso();
        var html = '';

        for (var i = 0; i < 7; i++) {
            var d = sumarDias(lunes, i);
            var iso = isoDeFecha(d);
            var lista = eventosDe(iso);

            var clases = 'agenda-dia-col';
            if (iso === hoy) clases += ' hoy';
            if (iso === diaSeleccionado) clases += ' activo';

            html += '<div class="' + clases + '" data-fecha="' + iso + '">' +
                '<div class="agenda-dia-cabecera">' +
                    '<span class="agenda-dia-nombre">' + DIAS_CORTOS[i] + '</span>' +
                    '<span class="agenda-dia-num">' + d.getDate() + '</span>' +
                '</div>' +
                '<div class="agenda-dia-eventos">';

            if (lista.length) {
                lista.forEach(function (ev) { html += itemSemanaHtml(ev); });
            } else {
                html += '<p class="agenda-dia-vacio">Sin actividades</p>';
            }

            html += '</div></div>';
        }

        cont.innerHTML = html;
    }

    // ── Modal de formulario ──────────────────────────────────
    var modal = null;
    var form = null;

    function abrirModal(ev) {
        var editando = !!ev;
        $('agendaModalTitulo').textContent = editando ? 'Editar entrada' : 'Nueva entrada';
        $('agendaFormError').hidden = true;
        $('agendaFormError').textContent = '';

        $('agendaId').value = editando ? ev.id : '';
        $('agendaTitulo').value = editando ? (ev.titulo || '') : '';
        $('agendaDescripcion').value = editando ? (ev.descripcion || '') : '';
        $('agendaFecha').value = editando ? ev.fecha : (diaSeleccionado || hoyIso());
        $('agendaTipoCampo').value = editando ? (ev.tipo || 'evento') : 'evento';
        $('agendaHoraInicio').value = editando ? (ev.hora_inicio || '') : '';
        $('agendaHoraFin').value = editando ? (ev.hora_fin || '') : '';
        $('agendaLugar').value = editando ? (ev.lugar || '') : '';

        modal.hidden = false;
        setTimeout(function () { modal.classList.add('visible'); }, 10);
        setTimeout(function () { $('agendaTitulo').focus(); }, 120);
    }

    function cerrarModal() {
        modal.classList.remove('visible');
        setTimeout(function () { modal.hidden = true; }, 250);
    }

    function mostrarError(msg) {
        var caja = $('agendaFormError');
        caja.textContent = msg;
        caja.hidden = false;
    }

    async function guardarFormulario(e) {
        e.preventDefault();

        var datos = {
            id: parseInt($('agendaId').value, 10) || 0,
            titulo: $('agendaTitulo').value.trim(),
            descripcion: $('agendaDescripcion').value.trim(),
            fecha: $('agendaFecha').value,
            tipo: $('agendaTipoCampo').value,
            hora_inicio: $('agendaHoraInicio').value,
            hora_fin: $('agendaHoraFin').value,
            lugar: $('agendaLugar').value.trim()
        };

        if (!datos.titulo) { mostrarError('El título es obligatorio.'); return; }
        if (!datos.fecha) { mostrarError('La fecha es obligatoria.'); return; }

        var boton = $('agendaGuardar');
        boton.disabled = true;

        try {
            var r = await api('guardar', datos);
            if (!r || !r.ok) {
                mostrarError((r && r.error) || 'No se pudo guardar la entrada.');
                return;
            }
            cerrarModal();
            mostrarToast(datos.id ? 'Entrada actualizada.' : 'Entrada creada.');
            if (!datos.id) {
                // Ir al mes de la nueva entrada y seleccionarla
                var f = parseIsoFecha(datos.fecha);
                if (f) { vista = { anio: f.getFullYear(), mes: f.getMonth() }; }
                diaSeleccionado = datos.fecha;
            }
            await cargar();
        } finally {
            boton.disabled = false;
        }
    }

    async function eliminarEntrada(id) {
        if (!window.confirm('¿Eliminar esta entrada de la agenda?')) return;

        var r = await api('eliminar', { id: id });
        if (!r || !r.ok) {
            mostrarToast((r && r.error) || 'No se pudo eliminar.', true);
            return;
        }
        mostrarToast('Entrada eliminada.');
        await cargar();
    }

    // ── Toast ────────────────────────────────────────────────
    var toastTimer = null;
    function mostrarToast(msg, esError) {
        var t = $('agendaToast');
        $('agendaToastMsg').textContent = msg;
        t.classList.toggle('error', !!esError);
        t.classList.add('visible');
        clearTimeout(toastTimer);
        toastTimer = setTimeout(function () { t.classList.remove('visible'); }, 2800);
    }

    // ── Eventos de la interfaz ───────────────────────────────
    function conectar() {
        $('agendaMesAnterior').addEventListener('click', function () {
            vista.mes--;
            if (vista.mes < 0) { vista.mes = 11; vista.anio--; }
            pintarCalendario();
        });

        $('agendaMesSiguiente').addEventListener('click', function () {
            vista.mes++;
            if (vista.mes > 11) { vista.mes = 0; vista.anio++; }
            pintarCalendario();
        });

        $('agendaHoy').addEventListener('click', function () {
            var d = new Date();
            vista = { anio: d.getFullYear(), mes: d.getMonth() };
            diaSeleccionado = hoyIso();
            semanaRef = lunesDe(d);
            pintarCalendario();
            pintarLista();
            pintarSemana();
        });

        $('agendaFiltroTipo').addEventListener('change', function () {
            filtroTipo = this.value;
            cargar();
        });

        // Clic en un día del calendario
        $('agendaCeldas').addEventListener('click', function (e) {
            var celda = e.target.closest('.agenda-celda');
            if (!celda) return;
            diaSeleccionado = celda.getAttribute('data-fecha');
            // Si el día pertenece a otro mes, navegar a ese mes
            var f = parseIsoFecha(diaSeleccionado);
            if (f && (f.getMonth() !== vista.mes || f.getFullYear() !== vista.anio)) {
                vista = { anio: f.getFullYear(), mes: f.getMonth() };
            }
            // La vista semanal sigue al día elegido
            if (f) semanaRef = lunesDe(f);
            pintarCalendario();
            pintarLista();
            pintarSemana();
        });

        // Acciones de cada entrada (solo admin)
        $('agendaLista').addEventListener('click', function (e) {
            var editar = e.target.closest('[data-editar]');
            if (editar) {
                var id = parseInt(editar.getAttribute('data-editar'), 10);
                var ev = eventos.filter(function (x) { return x.id === id; })[0];
                if (ev) abrirModal(ev);
                return;
            }
            var eliminar = e.target.closest('[data-eliminar]');
            if (eliminar) {
                eliminarEntrada(parseInt(eliminar.getAttribute('data-eliminar'), 10));
            }
        });

        // ── Vista semanal: navegación y acciones ─────────────
        var btnSemAnterior = $('semanaAnterior');
        var btnSemSiguiente = $('semanaSiguiente');
        var btnSemActual = $('semanaActual');
        var grillaSemana = $('semanaGrid');

        if (btnSemAnterior) {
            btnSemAnterior.addEventListener('click', function () {
                semanaRef = sumarDias(semanaRef || lunesDe(new Date()), -7);
                pintarSemana();
            });
        }
        if (btnSemSiguiente) {
            btnSemSiguiente.addEventListener('click', function () {
                semanaRef = sumarDias(semanaRef || lunesDe(new Date()), 7);
                pintarSemana();
            });
        }
        if (btnSemActual) {
            btnSemActual.addEventListener('click', function () {
                semanaRef = lunesDe(new Date());
                pintarSemana();
            });
        }
        if (grillaSemana) {
            grillaSemana.addEventListener('click', function (e) {
                var editar = e.target.closest('[data-editar]');
                if (editar) {
                    var id = parseInt(editar.getAttribute('data-editar'), 10);
                    var ev = eventos.filter(function (x) { return x.id === id; })[0];
                    if (ev) abrirModal(ev);
                    return;
                }
                var eliminar = e.target.closest('[data-eliminar]');
                if (eliminar) {
                    eliminarEntrada(parseInt(eliminar.getAttribute('data-eliminar'), 10));
                    return;
                }
                // Seleccionar el día de la columna pulsada
                var col = e.target.closest('.agenda-dia-col');
                if (!col) return;
                var iso = col.getAttribute('data-fecha');
                diaSeleccionado = iso;
                var f = parseIsoFecha(iso);
                if (f) {
                    vista = { anio: f.getFullYear(), mes: f.getMonth() };
                    semanaRef = lunesDe(f);
                }
                pintarCalendario();
                pintarLista();
                pintarSemana();
            });
        }

        if (esAdmin) {
            $('agendaBtnNueva').hidden = false;
            $('agendaBtnNueva').addEventListener('click', function () { abrirModal(null); });
            form.addEventListener('submit', guardarFormulario);
            $('agendaCancelar').addEventListener('click', cerrarModal);
            $('agendaModalCerrar').addEventListener('click', cerrarModal);
            modal.addEventListener('click', function (e) { if (e.target === modal) cerrarModal(); });
            document.addEventListener('keydown', function (e) {
                if (e.key === 'Escape' && !modal.hidden) cerrarModal();
            });
        }
    }

    // ── Arranque ─────────────────────────────────────────────
    async function iniciar() {
        if (typeof AuthDB === 'undefined' || typeof AuthDB.llamarAPI !== 'function') return;

        modal = $('agendaModal');
        form = $('agendaForm');

        var ok = await verificarSesion();
        if (!ok) return;

        var d = new Date();
        vista = { anio: d.getFullYear(), mes: d.getMonth() };
        diaSeleccionado = null;
        semanaRef = lunesDe(d);

        conectar();
        await cargar();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', iniciar);
    } else {
        iniciar();
    }
})();
