/* ===== ADMIN-SECCIONES.JS =========================================
   Editor genérico de las secciones de cada página pública.
   La página admin (eg. admin-nosotros.html) indica qué sección de la
   tabla Secciones editar mediante <body data-pagina="nosotros">.

   Dependencias:
     - admin-secciones-config.js  (SECCIONES_CONFIG)
     - auth.js                    (AuthDB.leerSecciones / guardarSeccion)
   ==================================================================== */
(function () {
    'use strict';

    var pagina = document.body && document.body.dataset ? (document.body.dataset.pagina || '') : '';
    var config = window.SECCIONES_CONFIG && SECCIONES_CONFIG.paginas ? SECCIONES_CONFIG.paginas[pagina] : null;

    var editor = document.getElementById('editorSecciones');
    var barraTitulo = document.getElementById('editorTitulo');
    var barraDescripcion = document.getElementById('editorDescripcion');

    if (!config || !editor) {
        var cont = editor || document.body;
        var aviso = document.createElement('p');
        aviso.className = 'lista-error';
        aviso.innerHTML = '<i class="fa-solid fa-triangle-exclamation"></i>' +
            '<p>No hay configuración de editor para esta página.</p>';
        cont.appendChild(aviso);
        throw new Error('Editor de secciones sin configuración.');
    }

    if (barraTitulo) barraTitulo.textContent = 'Edición de contenido: ' + config.titulo;
    if (barraDescripcion) barraDescripcion.textContent = config.secciones.length === 1
        ? 'Edita las tablas de horario por grado y guarda los cambios.'
        : 'Cada sección de la página se edita por separado. Guarda los cambios de una o de todas.';

    // ==== Toast ====
    var toast = document.getElementById('adminToast');
    var toastMsg = document.getElementById('adminToastMsg');
    var toastTimer = null;

    function mostrarToast(mensaje) {
        if (!toast || !toastMsg) return;
        toastMsg.textContent = mensaje;
        toast.classList.add('visible');
        clearTimeout(toastTimer);
        toastTimer = setTimeout(function () { toast.classList.remove('visible'); }, 3000);
    }

    function esc(s) {
        return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
            return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
        });
    }

    function valor(obj, clave) {
        var v = obj && obj[clave];
        return v == null ? '' : String(v);
    }

    // Datalist de iconos sugeridos (se crea una sola vez).
    (function crearDatalistIconos() {
        if (document.getElementById('iconosSf')) return;
        var dl = document.createElement('datalist');
        dl.id = 'iconosSf';
        (SECCIONES_CONFIG.iconos || []).forEach(function (ic) {
            var op = document.createElement('option');
            op.value = ic;
            dl.appendChild(op);
        });
        document.body.appendChild(dl);
    })();

    /* ==================================================
       ESTADO
       secciones[id] = { datos: {kicker,titulo,descripcion,tag,activo,orden}, items: [] }
    ================================================== */
    var secciones = {};

    config.secciones.forEach(function (sec, i) {
        var base = {
            seccion: sec.seccion,
            nombre: sec.nombre,
            cabecera: sec.cabecera || [],
            campos: sec.campos || [],
            datos: { kicker: '', titulo: '', descripcion: '', tag: '', activo: 'activo', orden: i + 1 },
            items: []
        };
        secciones[sec.seccion] = base;
    });

    // ==== Construcción de controles según el tipo de campo ====
    function campoHTML(campo, valorInicial) {
        var tipo = campo.tipo || 'texto';
        var anchoClase = (campo.ancho === 'largo') ? ' texto-largo' : '';
        var v = esc(valorInicial);

        var control;
        switch (tipo) {
            case 'numero':
                control = '<input type="number" step="any" data-campo="' + esc(campo.clave) + '" value="' + v + '">';
                break;
            case 'textarea':
                control = '<textarea rows="' + (campo.filas || 3) + '" data-campo="' + esc(campo.clave) + '">' + v + '</textarea>';
                break;
            case 'icono':
                control = '<input type="text" list="iconosSf" data-campo="' + esc(campo.clave) + '" value="' + v + '" placeholder="fa-solid fa-...">' +
                    '<small class="iconos-sugeridos">Sugerencias: ' + esc((SECCIONES_CONFIG.iconos || []).slice(0, 6).join(' · ')) + ' …</small>';
                break;
            default:
                control = '<input type="text" data-campo="' + esc(campo.clave) + '" value="' + v + '">';
        }

        return '<div class="form-grupo' + anchoClase + '">' +
            '<label for="">' + esc(campo.etiqueta || campo.clave) + '</label>' + control +
            '</div>';
    }

    function sublistaHTML(campo, valorInicial) {
        var items = Array.isArray(valorInicial) ? valorInicial : [];
        var tipo = campo.tipo; // 'aspectos' o 'horario'

        var filas = items.map(function (fila, i) {
            if (tipo === 'horario') {
                return '<div class="seccion-sublista-fila" data-fila="' + i + '">' +
                    '<input class="sublista-hora" data-subcampo="hora" value="' + esc(valor(fila, 'hora')) + '" placeholder="Hora (Ej: 7:00 AM)">' +
                    '<input class="sublista-texto" data-subcampo="actividad" value="' + esc(valor(fila, 'actividad')) + '" placeholder="Actividad (Ej: Ingreso)">' +
                    '<button type="button" class="btn-item-op sub-del" title="Quitar"><i class="fa-solid fa-xmark"></i></button>' +
                    '</div>';
            }
            return '<div class="seccion-sublista-fila" data-fila="' + i + '">' +
                '<input class="sublista-texto" data-subcampo="texto" value="' + esc(fila) + '" placeholder="Escribe un aspecto...">' +
                '<button type="button" class="btn-item-op sub-del" title="Quitar"><i class="fa-solid fa-xmark"></i></button>' +
                '</div>';
        }).join('');

        var boton = (tipo === 'horario')
            ? '<button type="button" class="btn-item-op sub-add"><i class="fa-solid fa-plus"></i> Añadir hora</button>'
            : '<button type="button" class="btn-item-op sub-add"><i class="fa-solid fa-plus"></i> Añadir aspecto</button>';

        return '<div class="seccion-sublista">' +
            '<label>' + esc(campo.etiqueta || campo.clave) + '</label>' +
            '<div class="seccion-sublista-filas" data-sublista="' + esc(campo.clave) + '">' + filas + '</div>' +
            boton + '</div>';
    }

    // Título de una tarjeta dentro del editor.
    function tituloItem(item, campos, n) {
        for (var i = 0; i < campos.length; i++) {
            if (campos[i].clave === 'titulo') {
                var v = valor(item, 'titulo');
                if (v) return v;
            }
        }
        return 'Tarjeta ' + (n + 1);
    }

    // Select de estado (activa / inactiva) siempre visible.
    function estadoSelectHTML(activo) {
        var valorEstado = activo === 'inactivo' ? 'inactivo' : 'activo';
        return '<div class="form-grupo">' +
            '<label>Estado de la sección</label>' +
            '<select class="estado-select">' +
                '<option value="activo"' + (valorEstado === 'activo' ? ' selected' : '') + '>Activa (visible)</option>' +
                '<option value="inactivo"' + (valorEstado === 'inactivo' ? ' selected' : '') + '>Inactiva (oculta)</option>' +
            '</select></div>';
    }

    /* ==================================================
       RENDER DE UNA SECCIÓN (acordeón)
    ================================================== */
    function construirPanel(sec) {
        var panel = document.createElement('section');
        panel.className = 'seccion-panel abierto';
        panel.dataset.seccion = sec.seccion;

        var estadoClase = sec.datos.activo === 'inactivo' ? 'inactivo' : 'activo';
        var etiquetaEstado = sec.datos.activo === 'inactivo' ? 'Inactiva' : 'Activa';

        panel.innerHTML =
            '<button type="button" class="seccion-panel-cabecera" data-toggle-seccion>' +
                '<span class="seccion-panel-titulo"><i class="fa-solid fa-sliders"></i>' + esc(sec.nombre) + '</span>' +
                '<span class="seccion-panel-estado ' + estadoClase + '">' + etiquetaEstado + '</span>' +
                '<i class="fa-solid fa-chevron-down seccion-panel-flcha"></i>' +
            '</button>' +
            '<div class="seccion-panel-cuerpo">' +
                '<div class="seccion-cabecera-grid">' +
                    estadoSelectHTML(sec.datos.activo) +
                    sec.cabecera.map(function (campo) {
                        return campoHTML(campo, sec.datos[campo.clave]);
                    }).join('') +
                '</div>' +
                '<div class="seccion-items-titulo">' +
                    '<h5><i class="fa-solid fa-layer-group"></i> Tarjetas de la sección' +
                    (sec.campos.length ? ' (' + sec.campos.length + ' campos cada una)' : '') + '</h5>' +
                    (sec.campos.length ? '<button type="button" class="btn-agregar-item" data-agregar-item><i class="fa-solid fa-plus"></i> Agregar tarjeta</button>' : '') +
                '</div>' +
                '<div class="seccion-items" data-items>' + (sec.campos.length ? '' : '<p class="seccion-panel-vacio">Esta sección no tiene tarjetas; sus campos de cabecera bastan.</p>') + '</div>' +
                '<div class="form-acciones">' +
                    '<button type="button" class="btn-guardar" data-guardar-seccion><i class="fa-solid fa-check"></i> Guardar esta sección</button>' +
                '</div>' +
            '</div>';

        // Cabecera: abrir/cerrar acordeón
        panel.querySelector('[data-toggle-seccion]').addEventListener('click', function (e) {
            if (e.target.closest('select')) return;
            panel.classList.toggle('abierto');
        });

        // Agregar tarjeta
        var btnAgregar = panel.querySelector('[data-agregar-item]');
        if (btnAgregar) btnAgregar.addEventListener('click', function () {
            var nuevo = {};
            sec.campos.forEach(function (campo) {
                if (campo.tipo === 'aspectos') nuevo[campo.clave] = [];
                else if (campo.tipo === 'horario') nuevo[campo.clave] = [];
                else nuevo[campo.clave] = '';
            });
            sec.items.push(nuevo);
            pintarItems(sec, panel);
        });

        // Guardar sección
        panel.querySelector('[data-guardar-seccion]').addEventListener('click', function () {
            guardarSeccion(sec, panel);
        });

        // Select de estado (gestionado con listener delegado al cuerpo)
        var cuerpo = panel.querySelector('.seccion-panel-cuerpo');
        cuerpo.addEventListener('change', function (e) {
            if (e.target.classList.contains('estado-select')) {
                sec.datos.activo = e.target.value;
                var pill = panel.querySelector('.seccion-panel-estado');
                pill.className = 'seccion-panel-estado ' + e.target.value;
                pill.textContent = e.target.value === 'inactivo' ? 'Inactiva' : 'Activa';
            }
        });

        // Sección especial: horario de clases por grado (12 grupos, horas editables)
        if (sec.seccion === 'horario-clases') {
            var tituloItems = panel.querySelector('.seccion-items-titulo');
            if (tituloItems) tituloItems.style.display = 'none';
            var areaItems = panel.querySelector('[data-items]');
            if (areaItems) {
                areaItems.innerHTML = '';
                areaItems.appendChild(construirEditorHorarioClases(sec));
            }
        }

        pintarItems(sec, panel);
        return panel;
    }

    function pintarItems(sec, panel) {
        if (!sec.campos.length) return;
        var contenedor = panel.querySelector('[data-items]');
        if (!contenedor) return;

        contenedor.innerHTML = '';

        sec.items.forEach(function (item, i) {
            var caja = document.createElement('div');
            caja.className = 'seccion-item-editor';
            caja.dataset.indice = i;

            var cabecera = document.createElement('div');
            cabecera.className = 'seccion-item-cabecera';
            cabecera.innerHTML =
                '<span class="seccion-item-titulo"><i class="fa-solid fa-grip-vertical"></i> ' + esc(tituloItem(item, sec.campos, i)) + '</span>' +
                '<div class="seccion-item-opciones">' +
                    '<button type="button" class="btn-item-op" data-btn="up" title="Subir"><i class="fa-solid fa-arrow-up"></i></button>' +
                    '<button type="button" class="btn-item-op" data-btn="down" title="Bajar"><i class="fa-solid fa-arrow-down"></i></button>' +
                    '<button type="button" class="btn-item-op peligro" data-btn="del" title="Eliminar tarjeta"><i class="fa-solid fa-trash"></i></button>' +
                '</div>';

            var campos = document.createElement('div');
            campos.className = 'seccion-item-campos';

            sec.campos.forEach(function (campo) {
                var v = item[campo.clave];
                if (campo.tipo === 'aspectos' || campo.tipo === 'horario') {
                    var div = document.createElement('div');
                    div.className = 'seccion-sublista-wrap';
                    div.innerHTML = sublistaHTML(campo, v);
                    campos.appendChild(div);
                    enlazarSublista(div, campo, item);
                } else {
                    var div2 = document.createElement('div');
                    div2.innerHTML = campoHTML(campo, v);
                    var formGrupo = div2.firstChild;
                    campos.appendChild(formGrupo);
                    bindCampo(formGrupo, sec, item, i, campo.clave, campos);
                }
            });

            caja.appendChild(cabecera);
            caja.appendChild(campos);
            contenedor.appendChild(caja);
        });
    }

    // Llena el objeto del item a medida que el usuario escribe (source of truth).
    function bindCampo(formGrupo, sec, item, indice, clave, contenedor) {
        var control = formGrupo.querySelector('[data-campo]');
        if (!control) return;
        control.addEventListener('input', function () {
            item[clave] = control.value;
            if (clave === 'titulo') {
                var caja = contenedor.parentElement;
                var tit = caja.querySelector('.seccion-item-titulo');
                if (tit) tit.textContent = '☰ ' + (control.value || ('Tarjeta ' + (indice + 1)));
            }
        });
    }

    // Sub-listas (aspectos y horario): añadir / quitar filas.
    function enlazarSublista(div, campo, item) {
        var filas = div.querySelector('.seccion-sublista-filas');
        var esHorario = (campo.tipo === 'horario');

        var actualizarItem = function () {
            var lista = [];
            filas.querySelectorAll('[data-fila]').forEach(function (fila) {
                if (esHorario) {
                    lista.push({
                        hora: (fila.querySelector('.sublista-hora') || {}).value || '',
                        actividad: (fila.querySelector('.sublista-texto') || {}).value || ''
                    });
                } else {
                    lista.push((fila.querySelector('.sublista-texto') || {}).value || '');
                }
            });
            item[clave] = lista;
        };

        filas.querySelectorAll('input').forEach(function (input) {
            input.addEventListener('input', actualizarItem);
        });

        filas.addEventListener('click', function (e) {
            var btn = e.target.closest('.sub-del');
            if (!btn) return;
            btn.closest('.seccion-sublista-fila').remove();
            actualizarItem();
        });

        var btnAdd = div.querySelector('.sub-add');
        if (btnAdd) btnAdd.addEventListener('click', function () {
            var fila = document.createElement('div');
            fila.className = 'seccion-sublista-fila';
            if (esHorario) {
                fila.innerHTML =
                    '<input class="sublista-hora" data-subcampo="hora" placeholder="Hora (Ej: 7:00 AM)">' +
                    '<input class="sublista-texto" data-subcampo="actividad" placeholder="Actividad (Ej: Ingreso)">' +
                    '<button type="button" class="btn-item-op sub-del" title="Quitar"><i class="fa-solid fa-xmark"></i></button>';
            } else {
                fila.innerHTML =
                    '<input class="sublista-texto" data-subcampo="texto" placeholder="Escribe un aspecto...">' +
                    '<button type="button" class="btn-item-op sub-del" title="Quitar"><i class="fa-solid fa-xmark"></i></button>';
            }
            fila.querySelectorAll('input').forEach(function (input) {
                input.addEventListener('input', actualizarItem);
            });
            filas.appendChild(fila);
        });

        // Si no hay filas, mostrar una vacía para facilitar la edición.
        if (!filas.querySelector('[data-fila]')) {
            btnAdd.click();
        }
    }

    /* ==================================================
       EDITOR DEL HORARIO DE CLASES POR GRADO
       Sección "horario-clases" de la página de horarios:
         - grados: preescolar a 11.° (titulo, icono) — compartidos.
         - dias[]: grupos de días (Lunes a Jueves, Viernes…), cada uno
           con sus bloques (inicio, fin, descanso, materias[]).
       Las materias de cada bloque van alineadas al orden de "grados".
       Lunes a jueves: 55 min (8:00 AM – 2:45 PM).
       Viernes: 45 min (8:00 AM – 1:35 PM).
    ================================================== */
    function nuevasMaterias(n) {
        var m = [];
        for (var i = 0; i < n; i++) m.push('');
        return m;
    }

    // Asegura el formato por días { grados, dias[] }; convierte el antiguo
    // { bloques, grados } (un solo grupo "Lunes a Jueves").
    function normalizarHorarioClases(data) {
        if (!Array.isArray(data.grados)) data.grados = [];

        if (!Array.isArray(data.dias)) {
            var legacy = Array.isArray(data.bloques) ? data.bloques : [];
            data.dias = [{ titulo: 'Lunes a Jueves', bloques: legacy }];
            delete data.bloques;
        }
        if (!data.dias.length) {
            data.dias.push({ titulo: 'Lunes a Jueves', bloques: [] });
        }

        var nG = data.grados.length;
        data.dias.forEach(function (d) {
            if (!Array.isArray(d.bloques)) d.bloques = [];
            d.bloques.forEach(function (b) {
                if (!Array.isArray(b.materias)) b.materias = [];
                if (!b.descanso && b.materias.length !== nG) {
                    b.materias = nuevasMaterias(nG).map(function (_, i) {
                        return b.materias[i] || '';
                    });
                }
            });
        });

        return data;
    }

    function htmlDiasHorario(data, diaActivo) {
        var tabs = data.dias.map(function (d, i) {
            return '<button type="button" class="hc-dia-tab' + (i === diaActivo ? ' activo' : '') + '"' +
                ' data-hc-accion="dia" data-dia="' + i + '">' +
                '<i class="fa-solid fa-calendar-day"></i> ' + esc(d.titulo || ('Día ' + (i + 1))) + '</button>';
        }).join('');

        return '<div class="seccion-sublista"><label>Grupos de días</label>' +
            '<div class="horarioclas-dias-tabs">' + tabs + '</div>' +
            '<p class="horarioclas-nota">Lunes a jueves: clases de 55 minutos (8:00 AM a 2:45 PM). ' +
            'Viernes: mismos grados y asignaturas, pero con clases de 45 minutos (8:00 AM a 1:35 PM). ' +
            'Selecciona un grupo para editar sus horas.</p></div>';
    }

    function htmlBloquesHorario(data, dia) {
        var filas = dia.bloques.map(function (b, i) {
            return '<div class="horarioclas-bloque" data-bloque="' + i + '">' +
                '<input class="hc-tiempo" data-campo="inicio" value="' + esc(b.inicio) + '" placeholder="Inicio · 08:00">' +
                '<span class="hc-sep">a</span>' +
                '<input class="hc-tiempo" data-campo="fin" value="' + esc(b.fin) + '" placeholder="Fin · 08:55">' +
                '<label class="hc-descanso-label"><input type="checkbox" class="hc-descanso"' +
                (b.descanso ? ' checked' : '') + '> Descanso</label>' +
                '<button type="button" class="btn-item-op peligro" data-hc-accion="del-bloque" title="Quitar hora"><i class="fa-solid fa-xmark"></i></button>' +
                '</div>';
        }).join('');

        return '<div class="seccion-sublista"><label>Bloques de hora · <span class="hc-dia-activo">' + esc(dia.titulo || '') + '</span></label>' +
            '<div class="horarioclas-dia-nombre">' +
            '<input class="hc-dia-titulo" value="' + esc(dia.titulo || '') + '" placeholder="Día (Ej: Lunes, Martes… Viernes)">' +
            '</div>' +
            '<div class="seccion-sublista-filas">' + filas + '</div>' +
            '<button type="button" class="btn-item-op sub-add" data-hc-accion="add-bloque"><i class="fa-solid fa-plus"></i> Agregar hora</button>' +
            '<p class="horarioclas-nota">Marca "Descanso" para aplicar la pausa a todos los grados de este grupo de días. ' +
            'Los cambios de hora solo afectan al grupo seleccionado.</p></div>';
    }

    function htmlGradosHorario(data) {
        var filas = data.grados.map(function (g, i) {
            return '<div class="seccion-sublista-fila horarioclas-grado" data-grado="' + i + '">' +
                '<input class="hc-grado-icono" value="' + esc(g.icono || '') + '" placeholder="Icono · fa-solid fa-..." title="Icono del grado">' +
                '<input class="hc-grado-nombre" value="' + esc(g.titulo || '') + '" placeholder="Nombre (Ej: Preescolar, Grado 1°...)">' +
                '<button type="button" class="btn-item-op peligro" data-hc-accion="del-grado" title="Quitar grado"><i class="fa-solid fa-xmark"></i></button>' +
                '</div>';
        }).join('');

        return '<div class="seccion-sublista"><label>Grupos: de Preescolar a Grado 11.° (compartidos entre días)</label>' +
            '<div class="seccion-sublista-filas">' + filas + '</div>' +
            '<button type="button" class="btn-item-op sub-add" data-hc-accion="add-grado"><i class="fa-solid fa-plus"></i> Agregar grado</button></div>';
    }

    // Etiqueta de la columna de hora: une los rangos de los días
    // (p. ej. Lunes a jueves de 55 min y viernes de 45 min).
    function etiquetaRangoAdmin(dias, indice, descanso) {
        var rangos = {};
        (dias || []).forEach(function (d) {
            var b = d.bloques && d.bloques[indice];
            if (!b || b.inicio == null || b.fin == null) return;
            rangos[b.inicio + '|' + b.fin] = esc(b.inicio) + '–' + esc(b.fin);
        });
        var texto = Object.keys(rangos).map(function (k) { return rangos[k]; }).join(' / ');
        if (!texto) texto = '--:––--';
        return descanso ? 'Descanso · ' + texto : texto;
    }

    // Chips de selección de grado (uno por cada grupo), como en la página pública.
    function htmlChipsHorario(data, gradoActivo) {
        return '<nav class="horarioclas-chips" aria-label="Elegir grado">' +
            (data.grados || []).map(function (g, i) {
                return '<button type="button" class="horarioclas-chip' + (i === gradoActivo ? ' activo' : '') + '"' +
                    ' data-hc-accion="grado" data-grado="' + i + '">' +
                    (g.icono ? '<i class="' + esc(g.icono) + '"></i> ' : '') + esc(g.titulo || ('Grado ' + (i + 1))) +
                    '</button>';
            }).join('') + '</nav>';
    }

    // Tabla de un solo grado: columnas = días (Lunes…Viernes), filas = bloques.
    function htmlTablaGradoAdmin(data, gradoActivo) {
        var grados = data.grados || [];
        var dias = data.dias || [];
        var gi = gradoActivo;

        var nBloques = 0;
        dias.forEach(function (d) { nBloques = Math.max(nBloques, d.bloques.length); });

        var cab = '<thead><tr><th class="hc-col-fija">Hora</th>' +
            dias.map(function (d) {
                return '<th>' + esc(d.titulo || '') + '</th>';
            }).join('') + '</tr></thead>';

        var cuerpo = '';
        for (var bi = 0; bi < nBloques; bi++) {
            var esDescanso = dias.some(function (d) { return d.bloques[bi] && d.bloques[bi].descanso; });
            var rango = etiquetaRangoAdmin(dias, bi, esDescanso);
            if (esDescanso) {
                cuerpo += '<tr><td class="hc-col-fija">' + rango + '</td>' +
                    '<td class="hc-descanso" colspan="' + dias.length + '">' +
                    '<i class="fa-solid fa-mug-hot"></i> Descanso</td></tr>';
                continue;
            }
            cuerpo += '<tr data-bloque="' + bi + '">' +
                '<td class="hc-col-fija">' + rango + '</td>' +
                dias.map(function (d, di) {
                    var b = d.bloques[bi] || {};
                    var m = Array.isArray(b.materias) ? (b.materias[gi] || '') : '';
                    return '<td><input class="hc-materia" data-dia="' + di + '" value="' + esc(m) + '" placeholder="Asignatura"></td>';
                }).join('') + '</tr>';
        }

        var nombreGrado = (grados[gi] && grados[gi].titulo) || ('Grado ' + (gi + 1));
        return '<div class="seccion-sublista"><label><i class="fa-solid fa-table"></i> Horario de <span class="hc-grado-activo">' + esc(nombreGrado) + '</span></label>' +
            '<div class="horarioclas-scroll"><table class="horarioclas-tabla">' + cab + '<tbody>' + cuerpo + '</tbody></table></div>' +
            '<p class="horarioclas-nota">Escribe la asignatura de cada hora para este grado. Cambia de grado con los botones de arriba.</p></div>';
    }

    // Re-sincroniza las etiquetas de hora de la tabla ACTUAL (sin repintar el árbol).
    function actualizarEtiquetasHorario(wrap, ctx) {
        var dias = (ctx.data && ctx.data.dias) || [];
        var filas = wrap.querySelectorAll('[data-vista="matriz"] .horarioclas-scroll tbody tr[data-bloque]');
        for (var i = 0; i < filas.length; i++) {
            var tr = filas[i];
            var bi = parseInt(tr.getAttribute('data-bloque'), 10);
            var esDescanso = dias.some(function (d) { return d.bloques[bi] && d.bloques[bi].descanso; });
            var td = tr.querySelector('td:first-child');
            if (td) td.innerHTML = etiquetaRangoAdmin(dias, bi, esDescanso);
        }
    }

    // Sincroniza el rótulo del grupo de días activo (pestaña + etiquetas).
    function actualizarTituloDia(wrap, ctx) {
        var d = ctx.dia();
        var i = ctx.indice();
        var tab = wrap.querySelector('.hc-dia-tab[data-dia="' + i + '"]');
        if (tab) tab.innerHTML = '<i class="fa-solid fa-calendar-day"></i> ' + esc(d.titulo || ('Día ' + (i + 1)));
        wrap.querySelectorAll('.hc-dia-activo').forEach(function (el) {
            el.textContent = d.titulo || ('Día ' + (i + 1));
        });
    }

    // Eventos del editor (la delegación vive en el contenedor persistente).
    function enlazarEditorHorarioClases(wrap, ctx) {
        wrap.addEventListener('input', function (e) {
            var t = e.target;
            if (t.classList.contains('hc-tiempo')) {
                var fila = t.closest('[data-bloque]');
                var b = ctx.dia().bloques[parseInt(fila.getAttribute('data-bloque'), 10)];
                if (!b) return;
                if (t.getAttribute('data-campo') === 'inicio') b.inicio = t.value;
                else b.fin = t.value;
                actualizarEtiquetasHorario(wrap, ctx);
            } else if (t.classList.contains('hc-dia-titulo')) {
                ctx.dia().titulo = t.value;
                actualizarTituloDia(wrap, ctx);
            } else if (t.classList.contains('hc-grado-nombre')) {
                var g = parseInt(t.closest('[data-grado]').getAttribute('data-grado'), 10);
                ctx.data.grados[g].titulo = t.value;
            } else if (t.classList.contains('hc-grado-icono')) {
                var gi = parseInt(t.closest('[data-grado]').getAttribute('data-grado'), 10);
                ctx.data.grados[gi].icono = t.value;
            } else if (t.classList.contains('hc-materia')) {
                var fila2 = t.closest('tr[data-bloque]');
                var bi = parseInt(fila2.getAttribute('data-bloque'), 10);
                var di = parseInt(t.getAttribute('data-dia'), 10);
                var dav = ctx.data.dias[di];
                var bb = dav && dav.bloques[bi];
                if (bb && Array.isArray(bb.materias)) bb.materias[ctx.grado()] = t.value;
            }
        });

        wrap.addEventListener('change', function (e) {
            var t = e.target;
            if (!t.classList.contains('hc-descanso')) return;
            var fila = t.closest('[data-bloque]');
            var bi = parseInt(fila.getAttribute('data-bloque'), 10);
            var dia = ctx.dia();
            var b = dia.bloques[bi];
            b.descanso = t.checked;
            if (!b.descanso && (b.materias || []).length !== ctx.data.grados.length) {
                b.materias = nuevasMaterias(ctx.data.grados.length).map(function (_, i) {
                    return (b.materias || [])[i] || '';
                });
            }
            ctx.rerender();
        });

        wrap.addEventListener('click', function (e) {
            var btn = e.target.closest('[data-hc-accion]');
            if (!btn) return;

            var accion = btn.getAttribute('data-hc-accion');
            var data = ctx.data;
            var dia = ctx.dia();

            if (accion === 'dia') {
                ctx.setDia(parseInt(btn.getAttribute('data-dia'), 10) || 0);
            } else if (accion === 'grado') {
                ctx.setGrado(parseInt(btn.getAttribute('data-grado'), 10) || 0);
            } else if (accion === 'add-bloque') {
                dia.bloques.push({ inicio: '', fin: '', descanso: false, materias: nuevasMaterias(data.grados.length) });
            } else if (accion === 'del-bloque') {
                if (!confirm('¿Eliminar esta hora?')) return;
                dia.bloques.splice(parseInt(btn.closest('[data-bloque]').getAttribute('data-bloque'), 10), 1);
            } else if (accion === 'add-grado') {
                data.grados.push({ titulo: '', icono: 'fa-solid fa-school' });
                data.dias.forEach(function (d) {
                    d.bloques.forEach(function (b) { if (!b.descanso) b.materias.push(''); });
                });
            } else if (accion === 'del-grado') {
                if (!confirm('¿Eliminar este grado?')) return;
                var gi = parseInt(btn.closest('[data-grado]').getAttribute('data-grado'), 10);
                data.grados.splice(gi, 1);
                data.dias.forEach(function (d) {
                    d.bloques.forEach(function (b) { if (!b.descanso) b.materias.splice(gi, 1); });
                });
            } else {
                return;
            }
            ctx.rerender();
        });
    }

    function construirEditorHorarioClases(sec) {
        var data = sec.items[0];
        if (!data || typeof data !== 'object') {
            data = { grados: [], dias: [] };
            sec.items.length = 0;
            sec.items.push(data);
        }
        normalizarHorarioClases(data);

        var diaActivo = 0;
        var gradoActivo = 0;

        var wrap = document.createElement('div');
        wrap.className = 'horarioclas-editor';
        wrap.innerHTML =
            '<div class="horarioclas-vista" data-vista="chips"></div>' +
            '<div class="horarioclas-vista" data-vista="matriz"></div>' +
            '<div class="horarioclas-vista" data-vista="bloques"></div>' +
            '<div class="horarioclas-vista" data-vista="grados"></div>' +
            '<div class="horarioclas-vista" data-vista="dias"></div>';

        var ctx = {
            data: data,
            indice: function () { return diaActivo; },
            dia: function () {
                if (diaActivo >= data.dias.length) diaActivo = 0;
                return data.dias[diaActivo];
            },
            setDia: function (i) { diaActivo = i; },
            grado: function () { return gradoActivo; },
            setGrado: function (i) { gradoActivo = i; },
            rerender: function () {
                if (gradoActivo >= data.grados.length) gradoActivo = Math.max(0, data.grados.length - 1);
                wrap.querySelector('[data-vista="chips"]').innerHTML = htmlChipsHorario(data, gradoActivo);
                wrap.querySelector('[data-vista="matriz"]').innerHTML = htmlTablaGradoAdmin(data, gradoActivo);
                wrap.querySelector('[data-vista="bloques"]').innerHTML = htmlBloquesHorario(data, ctx.dia());
                wrap.querySelector('[data-vista="grados"]').innerHTML = htmlGradosHorario(data);
                wrap.querySelector('[data-vista="dias"]').innerHTML = htmlDiasHorario(data, diaActivo);
            }
        };

        enlazarEditorHorarioClases(wrap, ctx);
        ctx.rerender();
        return wrap;
    }

    /* ==================================================
       DELEGACIÓN: mover / eliminar tarjetas
    ================================================== */
    editor.addEventListener('click', function (e) {
        var btn = e.target.closest('[data-btn]');
        if (!btn) return;
        var caja = btn.closest('.seccion-item-editor');
        if (!caja) return;
        var panel = btn.closest('.seccion-panel');
        var sec = secciones[panel.dataset.seccion];
        var i = parseInt(caja.dataset.indice, 10);

        var accion = btn.getAttribute('data-btn');
        if (accion === 'del') {
            if (!confirm('¿Eliminar esta tarjeta?')) return;
            sec.items.splice(i, 1);
        } else if (accion === 'up' && i > 0) {
            sec.items.splice(i - 1, 0, sec.items.splice(i, 1)[0]);
        } else if (accion === 'down' && i < sec.items.length - 1) {
            sec.items.splice(i + 1, 0, sec.items.splice(i, 1)[0]);
        }

        pintarItems(sec, panel);
    });

    /* ==================================================
       GUARDAR
    ================================================== */
    function recogerDatos(sec, panel) {
        var grid = panel.querySelector('.seccion-cabecera-grid');
        if (grid) {
            ['kicker', 'titulo', 'descripcion', 'tag'].forEach(function (clave) {
                var el = grid.querySelector('[data-campo="' + clave + '"]');
                if (el) sec.datos[clave] = el.value;
            });
        }
        // items: la lista ya vive en sec.items (se actualiza en cada input).
        return sec;
    }

    async function guardarSeccion(sec, panel) {
        recogerDatos(sec, panel);

        var r = await AuthDB.guardarSeccion(pagina, sec.seccion, {
            kicker: sec.datos.kicker,
            titulo: sec.datos.titulo,
            descripcion: sec.datos.descripcion,
            tag: sec.datos.tag,
            items: sec.items,
            orden: sec.datos.orden,
            activo: sec.datos.activo
        });

        if (r && r.ok) {
            mostrarToast('Sección "' + sec.nombre + '" guardada.');
        } else {
            mostrarToast((r && r.error) || 'No se pudo guardar la sección.');
        }
        return r && r.ok;
    }

    var barra = document.getElementById('btnGuardarTodo');
    if (barra) {
        barra.addEventListener('click', async function () {
            barra.disabled = true;
            var fallidas = [];
            var paneles = editor.querySelectorAll('.seccion-panel');
            for (var i = 0; i < paneles.length; i++) {
                var panel = paneles[i];
                var sec = secciones[panel.dataset.seccion];
                var ok = await guardarSeccion(sec, panel);
                if (!ok) fallidas.push(sec.nombre);
            }
            barra.disabled = false;
            if (fallidas.length) {
                mostrarToast('Algunas secciones no se guardaron: ' + fallidas.join(', '));
            } else {
                mostrarToast('Todas las secciones de ' + config.titulo + ' fueron guardadas.');
            }
        });
    }

    /* ==================================================
       CARGA INICIAL
    ================================================== */
    async function cargar() {
        var r = await AuthDB.leerSecciones(pagina);
        if (!r || !r.ok) {
            mostrarToast((r && r.error) || 'No se pudo cargar el contenido.');
            return;
        }

        if (Array.isArray(r.secciones)) {
            r.secciones.forEach(function (s) {
                var sec = secciones[s.seccion];
                if (!sec) return;
                sec.datos = {
                    kicker: s.kicker || '',
                    titulo: s.titulo || '',
                    descripcion: s.descripcion || '',
                    tag: s.tag || '',
                    activo: s.activo === 'inactivo' ? 'inactivo' : 'activo',
                    orden: s.orden || sec.datos.orden
                };
                sec.items = Array.isArray(s.items) ? s.items : [];
            });
        }

        editor.innerHTML = '';
        config.secciones.forEach(function (secCfg) {
            editor.appendChild(construirPanel(secciones[secCfg.seccion]));
        });
    }

    cargar();
})();