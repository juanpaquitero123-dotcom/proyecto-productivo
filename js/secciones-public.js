/* ===== SECCIONES-PUBLIC.JS =========================================
   Renderiza en las páginas públicas el contenido por sección que viene
   de php/secciones.php (tabla Secciones de la base de datos).

   Requisitos en el HTML:
     - <body data-pagina="nosotros|academico|estudiantes|padres|horarios">
     - Cada <section> editable lleva data-panel="<nombre-sección>".

   La estructura interna de cada tarjeta copia EXACTAMENTE las clases CSS
   que ya estilizan las páginas (destacado-card, stat-caja, hito, etc.).
   Al terminar reactiva interactividad.js (SerFelixActivar) y, en "nosotros",
   recarga las imágenes de instalaciones y símbolos (SF_RecargarNosotros).
   ==================================================================== */
(function () {
    'use strict';

    /* ---- Configuración por página: sección → modo + selector del grid ---- */
    var PANELES = {
        nosotros: {
            banner:       { modo: 'banner' },
            'mision-vision': { modo: 'destacado',  grid: '.mision-vision-grid' },
            stats:        { modo: 'stat',    grid: '.stats-grid' },
            historia:     { modo: 'hito',    grid: '.historia-timeline' },
            simbolos:     { modo: 'simbolo', grid: '.simbolos-grid' },
            instalaciones:{ modo: 'instalacion', grid: '.instalaciones-grid' },
            cta:          { modo: 'cta' }
        },
        academico: {
            banner:   { modo: 'banner' },
            niveles:  { modo: 'nivel',    grid: '.niveles-grid' },
            areas:    { modo: 'area',     grid: '.areas-grid' },
            plan:     { modo: 'plan',     grid: '.plan-grid' },
            proyectos:{ modo: 'proyecto', grid: '.proyectos-grid' },
            cifras:   { modo: 'stat',     grid: '.stats-grid' },
            calidad:  { modo: 'calidad',  grid: '.calidad-grid' },
            cta:      { modo: 'cta' }
        },
        estudiantes: {
            banner:     { modo: 'banner' },
            beneficios: { modo: 'beneficio',  grid: '.beneficios-grid' },
            procesos:   { modo: 'proceso',    grid: '.procesos-grid',  clase: 'proceso' },
            documentos: { modo: 'documento',  grid: '.documentos-grid' },
            convivencia:{ modo: 'convivencia', grid: '.convivencia-grid' },
            cta:        { modo: 'cta' }
        },
        padres: {
            banner:    { modo: 'banner' },
            familia:   { modo: 'familia',   grid: '.familia-grid' },
            matricula: { modo: 'matricula', grid: '.matricula-grid', clase: 'matricula' },
            formacion: { modo: 'formacion', grid: '.formacion-grid' },
            cifras:    { modo: 'stat',      grid: '.stats-grid' },
            cta:       { modo: 'cta' }
        },
        horarios: {
            banner:        { modo: 'banner' },
            'horario-clases': { modo: 'timetable', grid: '.horario-clases-marco' },
            avisos:   { modo: 'aviso',   grid: '.avisos-grid' },
            cifras:   { modo: 'stat',    grid: '.stats-grid' },
            cta:      { modo: 'cta' }
        }
    };

    /* ---- Utilidades ---- */
    function escTexto(v) {
        return String(v == null ? '' : v)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }

    function escAttr(v) {
        return escTexto(v).replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }

    function valor(item, clave) {
        var v = item && item[clave];
        return v == null ? '' : String(v);
    }

    function setText(el, v) {
        if (el) el.textContent = v == null ? '' : String(v);
    }

    /* ---- Plantillas de cada tipo de tarjeta ---- */
    function plantilla(modo, item, i) {
        var icono = escAttr(valor(item, 'icono'));
        var titulo = escTexto(valor(item, 'titulo'));
        var texto = escTexto(valor(item, 'texto'));

        switch (modo) {
            case 'destacado': {
                var cl = i % 2 === 0 ? 'mision' : 'vision';
                return '<article class="destacado-card ' + cl + '" data-reveal data-tilt>' +
                    '<div class="destacado-icono"><i class="' + icono + '"></i></div>' +
                    '<span class="destacado-etiqueta">' + escTexto(valor(item, 'etiqueta')) + '</span>' +
                    '<h4>' + titulo + '</h4><p>' + texto + '</p></article>';
            }
            case 'stat': {
                var numero = escAttr(valor(item, 'numero')) || '0';
                var sufijo = escAttr(valor(item, 'sufijo'));
                return '<div class="stat-caja" data-reveal>' +
                    '<i class="' + icono + '"></i>' +
                    '<span class="stat-numero" data-target="' + numero + '" data-sufijo="' + sufijo + '">0</span>' +
                    '<p>' + texto + '</p></div>';
            }
            case 'hito': {
                return '<div class="hito" data-reveal>' +
                    '<span class="hito-anio">' + escTexto(valor(item, 'anio')) + '</span>' +
                    '<div class="hito-contenido"><h4><i class="' + icono + '"></i> ' + titulo + '</h4>' +
                    '<p>' + texto + '</p></div></div>';
            }
            case 'simbolo': {
                var n = (i + 1);
                return '<article class="simbolo-card" data-reveal data-tilt data-simbolo="' + n + '">' +
                    '<div class="simbolo-icono"><i class="' + icono + '"></i>' +
                    '<img class="simbolo-img" alt="' + escAttr(valor(item, 'titulo')) + '" hidden></div>' +
                    '<h4>' + titulo + '</h4><p>' + texto + '</p></article>';
            }
            case 'instalacion': {
                var detalle = valor(item, 'detalle');
                if (detalle) {
                    return '<div class="info-rapida-caja" data-reveal data-instalacion="' + (i + 1) + '">' +
                        '<i class="' + icono + '"></i><h4>' + titulo + '</h4><p>' + texto + '</p>' +
                        '<button type="button" class="info-ver-mas" aria-expanded="false"><span>Ver más</span>' +
                        '<i class="fa-solid fa-chevron-down"></i></button>' +
                        '<div class="info-desplegable"><p class="info-detalle">' + escTexto(detalle) + '</p>' +
                        '<div class="info-imagenes"></div></div></div>';
                }
                return '<div class="info-rapida-caja" data-reveal data-instalacion="' + (i + 1) + '">' +
                    '<i class="' + icono + '"></i><h4>' + titulo + '</h4><p>' + texto + '</p></div>';
            }
            case 'nivel': {
                var lis = (Array.isArray(item.aspectos) ? item.aspectos : []).map(function (a) {
                    return '<li><i class="fa-solid fa-check"></i> ' + escTexto(a) + '</li>';
                }).join('');
                return '<article class="nivel-card" data-reveal data-tilt>' +
                    '<div class="nivel-icono"><i class="' + icono + '"></i></div>' +
                    '<div class="nivel-info"><span class="nivel-etiqueta">' + escTexto(valor(item, 'etiqueta')) + '</span>' +
                    '<h4>' + titulo + '</h4><p>' + texto + '</p>' +
                    '<ul class="nivel-aspectos">' + lis + '</ul></div></article>';
            }
            case 'area':
                return '<div class="area-card" data-reveal>' +
                    '<div class="area-icono"><i class="' + icono + '"></i></div>' +
                    '<h4>' + titulo + '</h4><p>' + texto + '</p></div>';
            case 'plan':
                return '<article class="plan-card" data-reveal data-tilt>' +
                    '<div class="plan-icono"><i class="' + icono + '"></i></div>' +
                    '<h4>' + titulo + '</h4><p>' + texto + '</p></article>';
            case 'proyecto': {
                var tag = escTexto(valor(item, 'tag'));
                return '<article class="proyecto-card" data-reveal data-tilt>' +
                    '<div class="proyecto-header"><i class="' + icono + '"></i>' +
                    (tag ? '<span class="proyecto-tag">' + tag + '</span>' : '') + '</div>' +
                    '<h4>' + titulo + '</h4><p>' + texto + '</p></article>';
            }
            case 'calidad':
                return '<div class="info-rapida-caja" data-reveal>' +
                    '<i class="' + icono + '"></i><h4>' + titulo + '</h4><p>' + texto + '</p></div>';
            case 'documento':
                return '<div class="documento-item" data-reveal>' +
                    '<i class="' + icono + '"></i><div><h4>' + titulo + '</h4><p>' + texto + '</p></div></div>';
            case 'jornada': {
                var filas = (Array.isArray(item.filas) ? item.filas : []).map(function (f) {
                    return '<div class="horario-fila"><span class="hora">' + escTexto(valor(f, 'hora')) + '</span>' +
                        '<span class="actividad">' + escTexto(valor(f, 'actividad')) + '</span></div>';
                }).join('');
                return '<article class="jornada-card" data-reveal data-tilt>' +
                    '<div class="jornada-cabeza"><i class="' + icono + '"></i><h4>' + titulo + '</h4></div>' +
                    '<div class="horario-tabla">' + filas + '</div></article>';
            }
            default:
                return tarjetaGenerica(modo, item);
        }
    }

    /* Tarjetas tipo icono + título + descripción (beneficios, procesos,
       documentos dependientes de página, etcétera). */
    function tarjetaGenerica(modo, item) {
        var icono = escAttr(valor(item, 'icono'));
        var titulo = escTexto(valor(item, 'titulo'));
        var texto = escTexto(valor(item, 'texto'));
        var tilt = (modo !== 'documento') ? ' data-tilt' : '';

        var link = '';
        if (item && item.enlace && item.boton) {
            var claseLink = (modo === 'matricula' || modo === 'proceso') ? (modo + '-link') : 'proceso-link';
            link = '<a href="' + escAttr(valor(item, 'enlace')) + '" class="' + claseLink + '">' +
                escTexto(valor(item, 'boton')) + ' <i class="fa-solid fa-arrow-right"></i></a>';
        }

        return '<article class="' + escAttr(modo) + '-card" data-reveal' + tilt + '>' +
            '<div class="' + escAttr(modo) + '-icono"><i class="' + icono + '"></i></div>' +
            '<h4>' + titulo + '</h4><p>' + texto + '</p>' + link + '</article>';
    }

    /* ---- Horario de clases por grado y por día ----
       Datos: items[0] = { grados[], dias[ {titulo, bloques[]} ] }.
       Cada día (Lunes…Viernes) trae sus bloques (inicio, fin, descanso,
       materias[]), con las materias alineadas al orden de "grados".
       Se muestra UNA tabla semanal por grado: columnas = días y
       filas = bloques de hora. */
    function toDiasHorario(data) {
        if (Array.isArray(data.dias) && data.dias.length) {
            return data.dias;
        }
        // Formato antiguo { bloques, grados }: se muestra como un solo día.
        if (Array.isArray(data.bloques)) {
            return [{ titulo: 'Lunes', bloques: data.bloques }];
        }
        return [];
    }

    // Etiqueta de la columna de hora: une los rangos de tiempo de los días
    // (p. ej. Lunes a jueves de 55 min y viernes de 45 min).
    function etiquetaRangoHorario(dias, indice, descanso) {
        var rangos = {};
        dias.forEach(function (d) {
            var b = d.bloques[indice];
            if (!b || b.inicio == null || b.fin == null) return;
            rangos[b.inicio + '|' + b.fin] = escTexto(b.inicio) + '–' + escTexto(b.fin);
        });
        var texto = Object.keys(rangos).map(function (k) { return rangos[k]; }).join(' / ');
        if (!texto) texto = '--:––--';
        return descanso ? 'Descanso · ' + texto : texto;
    }

    function construirTablaGrado(grado, grados, dias) {
        var gi = grados.indexOf(grado);
        var nBloques = 0;
        dias.forEach(function (d) { nBloques = Math.max(nBloques, d.bloques.length); });

        var cab = '<thead><tr><th class="hct-fija">Hora</th>' +
            dias.map(function (d) { return '<th>' + escTexto(d.titulo || '') + '</th>'; }).join('') +
            '</tr></thead>';

        var cuerpo = '';
        for (var bi = 0; bi < nBloques; bi++) {
            if (dias.some(function (d) { return d.bloques[bi] && d.bloques[bi].descanso; })) {
                cuerpo += '<tr class="hct-descanso">' +
                    '<td class="hct-fija">' + etiquetaRangoHorario(dias, bi, true) + '</td>' +
                    '<td class="hct-descanso-label" colspan="' + dias.length + '">' +
                    '<i class="fa-solid fa-mug-hot"></i> Descanso</td></tr>';
                continue;
            }
            cuerpo += '<tr><td class="hct-fija">' + etiquetaRangoHorario(dias, bi, false) + '</td>' +
                dias.map(function (d) {
                    var b = d.bloques[bi];
                    var m = b && Array.isArray(b.materias) ? b.materias[gi] : '';
                    return '<td>' + escTexto(m) + '</td>';
                }).join('') + '</tr>';
        }

        return '<article class="horario-grado" id="horario-grado-' + gi + '">' +
            '<header class="horario-grado-titulo"><span class="horario-grado-num">G' + (gi + 1) + '</span>' +
            '<span>' + (grado.icono ? '<i class="' + escAttr(grado.icono) + '"></i> ' : '') + escTexto(grado.titulo || '') + '</span></header>' +
            '<div class="horario-clases-scroll">' +
            '<table class="horario-clases-table">' +
            '<caption class="hct-accesible">' + escTexto(grado.titulo || '') + ' · horario semanal por grado</caption>' +
            cab + '<tbody>' + cuerpo + '</tbody></table></div></article>';
    }

    function construirTablaHorario(data) {
        var grados = Array.isArray(data.grados) ? data.grados : [];
        var dias = toDiasHorario(data);
        if (!dias.length || !grados.length) return '';

        var chips = grados.map(function (g, gi) {
            return '<a href="#horario-grado-' + gi + '" class="horario-grado-chip">' + escTexto(g.titulo || '') + '</a>';
        }).join('');

        return '<nav class="horario-grados-nav" aria-label="Elegir grado">' + chips + '</nav>' +
            grados.map(function (g) { return construirTablaGrado(g, grados, dias); }).join('') +
            '<p class="horario-dias-nota"><i class="fa-solid fa-clock"></i> Lunes a jueves: clases de 55 minutos · Viernes: clases de 45 minutos.</p>';
    }

    /* ---- Despliegue del horario al pulsar el botón del grado ----
       Al inicio solo se muestran los botones (chips). Al hacer clic en uno
       se despliega el horario semanal de ese grado y se cierra el anterior. */
    function enlazarHorarioGrados() {
        document.querySelectorAll('.horario-clases-marco').forEach(function (marco) {
            if (marco.dataset.hcEnlazado) return;
            marco.dataset.hcEnlazado = '1';
            marco.addEventListener('click', function (e) {
                var chip = e.target.closest ? e.target.closest('.horario-grado-chip') : null;
                if (!chip) return;
                e.preventDefault();
                var id = (chip.getAttribute('href') || '').replace('#', '');
                var objetivo = id ? document.getElementById(id) : null;
                var abierta = objetivo && objetivo.classList.contains('activo');

                if (marco.querySelectorAll) {
                    marco.querySelectorAll('.horario-grado-chip').forEach(function (c) { c.classList.remove('activo'); });
                    marco.querySelectorAll('.horario-grado').forEach(function (g) { g.classList.remove('activo'); });
                }

                if (objetivo && !abierta) {
                    chip.classList.add('activo');
                    objetivo.classList.add('activo');
                    if (objetivo.scrollIntoView) {
                        objetivo.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }
                }
            });
        });
    }

    /* ---- Render de una sección en su panel ---- */
    function renderizar(panel, seccion, config) {
        var modo = config.modo;

        if (modo === 'banner') {
            setText(panel.querySelector('h2'), seccion.titulo);
            setText(panel.querySelector('p'), seccion.descripcion);
            var tag = panel.querySelector('.banner-tag');
            if (tag) setText(tag, seccion.tag);
            return;
        }

        if (modo === 'cta') {
            var caja = panel.querySelector('.cta-colegio');
            if (!caja) return;
            setText(caja.querySelector('.cta-texto h3'), seccion.items && seccion.items[0] ? seccion.items[0].titulo : seccion.titulo);
            setText(caja.querySelector('.cta-texto p'), seccion.items && seccion.items[0] ? seccion.items[0].texto : seccion.descripcion);
            var btn = caja.querySelector('.btn-conocenos');
            if (btn) {
                var it = seccion.items && seccion.items[0] ? seccion.items[0] : {};
                var icono = btn.querySelector('i');
                btn.textContent = it.boton ? String(it.boton) : '';
                if (icono) btn.appendChild(icono);
                if (it.enlace) btn.setAttribute('href', escAttr(it.enlace));
            }
            return;
        }

        var cab = panel.querySelector('.section-header');
        if (cab) {
            setText(cab.querySelector('.section-kicker'), seccion.kicker);
            setText(cab.querySelector('h3'), seccion.titulo);
            var hp = cab.querySelector('p');
            if (hp) setText(hp, seccion.descripcion);
        }

        if (modo === 'timetable') {
            var marco = panel.querySelector(config.grid);
            if (marco) {
                var datos = seccion.items && seccion.items[0] && typeof seccion.items[0] === 'object'
                    ? seccion.items[0] : {};
                marco.innerHTML = construirTablaHorario(datos);
            }
            return;
        }

        if (config.grid && Array.isArray(seccion.items)) {
            var grid = panel.querySelector(config.grid);
            if (grid) {
                grid.innerHTML = seccion.items.map(function (item, i) {
                    return plantilla(modo, item || {}, i);
                }).join('');
            }
        }
    }

    /* ---- Carga y render de todo el contenido de la página ---- */
    function cargar(pagina) {
        if (!pagina) return;
        var configPagina = PANELES[pagina];
        if (!configPagina) return;

        window.fetch('../php/secciones.php?pagina=' + encodeURIComponent(pagina) + '&t=' + Date.now(),
            { credentials: 'same-origin', cache: 'no-store' })
            .then(function (r) { return r.ok ? r.json() : null; })
            .then(function (d) {
                if (!d || !d.ok || !Array.isArray(d.secciones)) return;

                d.secciones.forEach(function (seccion) {
                    var config = configPagina[seccion.seccion];
                    if (!config) return;
                    var panel = document.querySelector('[data-panel="' + seccion.seccion + '"]');
                    if (!panel) return;
                    renderizar(panel, seccion, config);
                });

                // Re-activa reveal/contadores/tilt sobre los elementos nuevos.
                if (typeof window.SerFelixActivar === 'function') {
                    window.SerFelixActivar();
                }
                // En "Nosotros", recarga imágenes de instalaciones y símbolos.
                if (pagina === 'nosotros' && typeof window.SF_RecargarNosotros === 'function') {
                    window.SF_RecargarNosotros();
                }
            })
            .catch(function () {
                /* Sin respuesta del servidor: queda el contenido estático. */
            });
    }

    var pagina = document.body && document.body.dataset ? document.body.dataset.pagina : '';
    enlazarHorarioGrados();
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function () { cargar(pagina); });
    } else {
        cargar(pagina);
    }
})();