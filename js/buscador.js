/* ===== Buscador global del sitio =====
   Indexa todas las páginas (vía fetch) y permite buscar cualquier contenido:
   - Sugerencias en vivo mientras se escribe
   - Navegación con teclado (flechas, Enter, Escape)
   - Al elegir un resultado lleva a la página y resalta + desplaza hasta el texto
   - Si fetch no está disponible (file://) usa un índice básico de respaldo
*/
(function () {
    'use strict';

    // ==== Páginas del sitio que se indexan ====
    var PAGINAS = [
        { url: 'index.html', titulo: 'Inicio' },
        { url: 'nosotros.html', titulo: 'Nuestro Colegio' },
        { url: 'academico.html', titulo: 'Académico' },
        { url: 'estudiantes.html', titulo: 'Estudiantes' },
        { url: 'padres.html', titulo: 'Padres' },
        { url: 'eventos.html', titulo: 'Eventos' },
        { url: 'noticias.html', titulo: 'Noticias' },
        { url: 'horarios.html', titulo: 'Horarios' },
        { url: 'contacto.html', titulo: 'Contacto' },
        { url: 'login.html', titulo: 'Ingresar' },
        { url: 'admin.html', titulo: 'Panel Administrativo' }
    ];

    // ==== Respaldo por si fetch falla (archivo abierto sin servidor) ====
    var RESPALDO = {
        'index.html': 'inicio bienvenida institución educativa san félix eventos horarios noticias día de la familia feria de ciencias izada de bandera robótica año escolar',
        'nosotros.html': 'nuestro colegio misión visión historia valores formación integral comunidad educativa quiénes somos símbolos himno escudo',
        'academico.html': 'académico plan de estudios áreas asignaturas materias proyectos jornadas evaluación calendario escolar sedes preescolar primaria secundaria media niveles básica educación media robótica ecoescuela lectura crítica inglés convivencia calidad educativa galería momentos académicos fotos imágenes',
        'estudiantes.html': 'estudiantes actividades consejería uniforme manual de convivencia representantes monitores refuerzos estímulos beneficios biblioteca orientación escolar certificados matrícula documentos gobierno escolar clubes semilleros galería momentos estudiantiles fotos imágenes',
        'padres.html': 'padres de familia citaciones asambleas pago comunicación encargados escuela de padres acuerdos talleres crianza matrícula fechas documentos reuniones boletín comité orientación galería vida escolar fotos imágenes',
        'eventos.html': 'eventos calendario actividades día de la familia feria de ciencias izada de bandera fechas celebraciones',
        'noticias.html': 'noticias anuncios novedades inicio del año escolar estudiantes brillan logros comunicados boletín feria ciencia deportes día de la familia matrículas informes historias',
        'horarios.html': 'horarios clases jornada mañana tarde grados salones docentes descansos preescolar primaria secundaria media avisos cambios secretaría acompañamiento galería institucional fotos imágenes',
        'contacto.html': 'contacto teléfono correo whatsapp redes sociales atención secretaría sede dirección horario ubicación mapa galería momentos san félix fotos imágenes',
    };

    // ==== Utilidades ====
    function normalizar(texto) {
        return (texto || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    }

    function escaparHTML(s) {
        return String(s).replace(/[&<>"']/g, function (c) {
            return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
        });
    }

    function escaparRegex(s) {
        return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    function palabrasDe(consulta) {
        return normalizar(consulta).split(/[^a-z0-9]+/).filter(function (p) {
            return p.length > 0;
        });
    }

    function paginaActual() {
        return location.pathname.split('/').pop() || 'index.html';
    }

    // ==== Construcción del índice ====
    var indice = null;          // lista de entradas
    var promesaIndice = null;   // construcción en curso

    function indexarDocumento(html, pagina) {
        var doc = new DOMParser().parseFromString(html, 'text/html');
        doc.querySelectorAll('script, style, noscript').forEach(function (el) { el.remove(); });

        var raiz = doc.querySelector('main') || doc.body;
        raiz.querySelectorAll('header, footer, nav, .buscador, form').forEach(function (el) { el.remove(); });

        var entradas = [];
        var actual = { pagina: pagina.titulo, url: pagina.url, seccion: pagina.titulo, texto: '' };
        entradas.push(actual);

        (function recorrer(nodo) {
            Array.prototype.forEach.call(nodo.childNodes, function (hijo) {
                if (hijo.nodeType === 3) {
                    var t = hijo.textContent.replace(/\s+/g, ' ').trim();
                    if (t) actual.texto += (actual.texto ? ' ' : '') + t;
                } else if (hijo.nodeType === 1) {
                    var tag = hijo.tagName.toLowerCase();
                    if (/^h[1-6]$/.test(tag)) {
                        var titulo = hijo.textContent.replace(/\s+/g, ' ').trim();
                        actual = { pagina: pagina.titulo, url: pagina.url, seccion: titulo || pagina.titulo, texto: '' };
                        entradas.push(actual);
                    } else {
                        recorrer(hijo);
                    }
                }
            });
        })(raiz);

        // Si la primera entrada quedó igual al título de la página, se elimina
        if (entradas.length > 1 && entradas[0].texto.trim() === '') entradas.shift();

        return entradas.filter(function (e) { return e.texto.replace(/\s/g, '').length > 1; });
    }

    function indiceRespaldo() {
        var entradas = [];
        PAGINAS.forEach(function (p) {
            entradas.push({
                pagina: p.titulo,
                url: p.url,
                seccion: p.titulo,
                texto: RESPALDO[p.url] || p.titulo
            });
        });
        return entradas;
    }

    function construirIndice() {
        if (indice) return Promise.resolve(indice);
        if (promesaIndice) return promesaIndice;

        promesaIndice = Promise.all(PAGINAS.map(function (p) {
            return fetch(p.url)
                .then(function (r) {
                    if (!r.ok) throw new Error('HTTP ' + r.status);
                    return r.text();
                })
                .then(function (html) { return indexarDocumento(html, p); })
                .catch(function () {
                    // Sin servidor: solo la entrada general de esa página
                    return indiceRespaldo().filter(function (e) { return e.url === p.url; });
                });
        })).then(function (grupos) {
            indice = grupos.reduce(function (todo, g) { return todo.concat(g); }, []);
            return indice;
        }).catch(function () {
            indice = indiceRespaldo();
            return indice;
        });

        return promesaIndice;
    }

    // ==== Búsqueda y puntaje ====
    var MAX_RESULTADOS = 5;    // total mostrado en el panel
    var MAX_POR_PAGINA = 2;    // evita repetir la misma página muchas veces
    var PUNTAJE_MINIMO = 15;   // descarta coincidencias muy débiles

    var PALABRAS_VACIAS = [
        'de', 'la', 'el', 'los', 'las', 'un', 'una', 'unos', 'unas', 'y', 'o', 'u',
        'en', 'con', 'para', 'por', 'del', 'al', 'que', 'se', 'su', 'sus', 'es', 'son'
    ];

    function filtrarPalabras(consulta) {
        var todas = palabrasDe(consulta);
        var utiles = todas.filter(function (p) {
            return p.length >= 2 && PALABRAS_VACIAS.indexOf(p) === -1;
        });
        if (utiles.length) return utiles;
        var cortas = todas.filter(function (p) { return p.length >= 2; });
        return cortas.length ? cortas : todas;
    }

    function buscar(entradas, consulta) {
        var palabras = filtrarPalabras(consulta);
        if (!palabras.length) return [];

        var frase = normalizar(consulta).trim().replace(/\s+/g, ' ');

        var resultados = [];
        entradas.forEach(function (e) {
            var sec = normalizar(e.seccion);
            var tex = normalizar(e.texto);
            var puntaje = 0;
            var encontradas = 0;

            palabras.forEach(function (p) {
                var enSec = sec.indexOf(p) !== -1;
                var enTex = tex.indexOf(p) !== -1;
                if (enSec || enTex) encontradas++;
                if (enSec) puntaje += 30;
                if (enTex) puntaje += 10;
                // Palabra completa suma extra
                var rx = new RegExp('(^|[^a-z0-9])' + escaparRegex(p) + '([^a-z0-9]|$)');
                if (rx.test(sec)) puntaje += 12;
                if (rx.test(tex)) puntaje += 4;
            });

            if (!encontradas) return;
            if (encontradas === palabras.length) puntaje += 20;

            if (palabras.length > 1 && frase) {
                if (sec.indexOf(frase) !== -1) puntaje += 40;
                else if (tex.indexOf(frase) !== -1) puntaje += 25;
            }

            resultados.push({ entrada: e, puntaje: puntaje });
        });

        if (!resultados.length) return [];

        resultados.sort(function (a, b) { return b.puntaje - a.puntaje; });

        // Solo resultados relevantes; si ninguno alcanza el mínimo, muestra los 3 mejores
        var fuertes = resultados.filter(function (r) { return r.puntaje >= PUNTAJE_MINIMO; });
        var candidatas = fuertes.length ? fuertes : resultados.slice(0, 3);

        // Limita el total y evita saturar con varias entradas de una misma página
        var finales = [];
        var porPagina = {};
        for (var i = 0; i < candidatas.length && finales.length < MAX_RESULTADOS; i++) {
            var url = candidatas[i].entrada.url;
            porPagina[url] = (porPagina[url] || 0) + 1;
            if (porPagina[url] > MAX_POR_PAGINA) continue;
            finales.push(candidatas[i].entrada);
        }
        return finales;
    }

    function recorte(texto, consulta, max) {
        max = max || 110;
        var palabras = filtrarPalabras(consulta);
        var norm = normalizar(texto);
        var pos = -1;
        for (var i = 0; i < palabras.length && pos === -1; i++) {
            pos = norm.indexOf(palabras[i]);
        }
        if (pos === -1) pos = 0;

        var inicio = Math.max(0, pos - 40);
        var fin = Math.min(texto.length, inicio + max);
        inicio = Math.max(0, Math.min(inicio, fin - 30));

        var fragmento = texto.slice(inicio, fin).replace(/\s+/g, ' ').trim();
        if (inicio > 0) fragmento = '…' + fragmento;
        if (fin < texto.length) fragmento = fragmento + '…';

        // Resalta las palabras dentro del fragmento (una sola pasada, sin romper HTML)
        var seguro = escaparHTML(fragmento);
        var utiles = filtrarPalabras(consulta);
        if (utiles.length) {
            var rx = new RegExp('(' + utiles.map(escaparRegex).join('|') + ')', 'gi');
            seguro = seguro.replace(rx, '<mark>$1</mark>');
        }
        return seguro;
    }

    // ==== Interfaz del panel de resultados ====
    var contadorPaneles = 0;

    function crearPanel(formulario) {
        var panel = document.createElement('div');
        panel.className = 'sfx-panel';
        panel.setAttribute('role', 'listbox');
        panel.setAttribute('aria-label', 'Resultados de la búsqueda');
        // Id propio por panel: puede haber más de un buscador en la misma
        // página (el panel admin), y un id repetido haría que aria-controls
        // apuntara al panel equivocado.
        panel.id = 'sfx-panel-' + (++contadorPaneles);
        panel._formulario = formulario;
        formulario.parentNode.appendChild(panel);
        return panel;
    }

    function renderPanel(panel, resultados, consulta, activo, cargando) {
        if (cargando) {
            panel.innerHTML = '<div class="sfx-vacio">Buscando…</div>';
        } else if (!resultados.length) {
            panel.innerHTML = '<div class="sfx-vacio">Sin resultados para «' +
                escaparHTML(consulta) + '».<br><small>Prueba con otra palabra.</small></div>';
        } else {
            var html = '';
            resultados.forEach(function (r, i) {
                html +=
                    '<button type="button" id="' + panel.id + '-op' + i + '" class="sfx-item' + (i === activo ? ' activo' : '') + '" data-indice="' + i + '" role="option" aria-selected="false">' +
                    '<span class="sfx-ruta"><i class="fa-regular fa-file-lines" aria-hidden="true"></i> ' + escaparHTML(r.pagina) +
                    (r.seccion && r.seccion !== r.pagina ? ' · ' + escaparHTML(r.seccion) : '') + '</span>' +
                    '<span class="sfx-fragmento">' + recorte(r.texto, consulta) + '</span>' +
                    '</button>';
            });
            html += '<div class="sfx-pie">Enter para ir al primer resultado</div>';
            panel.innerHTML = html;

            Array.prototype.forEach.call(panel.querySelectorAll('.sfx-item'), function (btn) {
                btn.addEventListener('mousedown', function (e) {
                    e.preventDefault(); // evita perder el foco antes de navegar
                    irAResultado(resultados[parseInt(btn.dataset.indice, 10)], panel._formulario);
                });
            });
        }
        panel.classList.add('abierto');
        // El input es role="combobox": sin aria-expanded el lector de pantalla
        // no avisa de que la lista de sugerencias se ha abierto.
        if (panel._formulario) {
            var campo = panel._formulario.querySelector('input');
            if (campo) campo.setAttribute('aria-expanded', 'true');
        }
    }

    function cerrarPanel(panel) {
        panel.classList.remove('abierto');
        panel.innerHTML = '';
        if (panel._formulario) {
            var campo = panel._formulario.querySelector('input');
            if (campo) {
                campo.setAttribute('aria-expanded', 'false');
                campo.removeAttribute('aria-activedescendant');
            }
        }
    }

    // ==== Resaltado en la página destino ====
    var marcasActuales = [];

    function limpiarResaltado() {
        marcasActuales.forEach(function (m) {
            var padre = m.parentNode;
            while (m.firstChild) padre.insertBefore(m.firstChild, m);
            padre.removeChild(m);
            padre.normalize();
        });
        marcasActuales = [];
    }

    function resaltarYIrA(raiz, termino) {
        limpiarResaltado();
        var objetivo = normalizar(termino).replace(/\s+/g, ' ');
        if (!objetivo) return false;

        var palabras = palabrasDe(termino);
        var walker = document.createTreeWalker(raiz, NodeFilter.SHOW_TEXT, {
            acceptNode: function (nodo) {
                if (!nodo.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
                var p = nodo.parentNode.nodeName;
                if (p === 'SCRIPT' || p === 'STYLE' || p === 'MARK') return NodeFilter.FILTER_REJECT;
                return NodeFilter.FILTER_ACCEPT;
            }
        });

        var nodos = [];
        while (walker.nextNode()) nodos.push(walker.currentNode);

        var primeraMarca = null;

        nodos.forEach(function (nodo) {
            var texto = nodo.nodeValue;

            // Mapa: índice normalizado -> índice original
            var normStr = '';
            var mapa = [];
            for (var i = 0; i < texto.length; i++) {
                var trozo = normalizar(texto[i]);
                for (var j = 0; j < trozo.length; j++) mapa.push(i);
                normStr += trozo;
            }
            mapa.push(texto.length);

            var rangos = [];
            [objetivo].concat(palabras).forEach(function (t) {
                if (!t) return;
                var desde = 0, pos;
                while ((pos = normStr.indexOf(t, desde)) !== -1) {
                    rangos.push([mapa[pos], mapa[pos + t.length]]);
                    desde = pos + t.length;
                }
            });
            if (!rangos.length) return;

            rangos.sort(function (a, b) { return a[0] - b[0]; });
            var unidos = [rangos[0]];
            for (var k = 1; k < rangos.length; k++) {
                var ultimo = unidos[unidos.length - 1];
                if (rangos[k][0] <= ultimo[1]) ultimo[1] = Math.max(ultimo[1], rangos[k][1]);
                else unidos.push(rangos[k]);
            }

            var frag = document.createDocumentFragment();
            var cursor = 0;
            unidos.forEach(function (r) {
                if (r[0] > cursor) frag.appendChild(document.createTextNode(texto.slice(cursor, r[0])));
                var marca = document.createElement('mark');
                marca.className = 'sfx-marca';
                marca.textContent = texto.slice(r[0], r[1]);
                frag.appendChild(marca);
                if (!primeraMarca) primeraMarca = marca;
                marcasActuales.push(marca);
                cursor = r[1];
            });
            if (cursor < texto.length) frag.appendChild(document.createTextNode(texto.slice(cursor)));
            nodo.parentNode.replaceChild(frag, nodo);
        });

        if (primeraMarca) {
            primeraMarca.scrollIntoView({ behavior: 'smooth', block: 'center' });
            return true;
        }
        return false;
    }

    function contenidoPrincipal() {
        return document.querySelector('main') || document.body;
    }

    function irAResultado(resultado, formulario) {
        cerrarPanel(formulario._panelSfx);
        var consulta = formulario.querySelector('input').value.trim();
        var mismaPagina = resultado.url === paginaActual();

        if (mismaPagina) {
            resaltarYIrA(contenidoPrincipal(), consulta || resultado.texto.slice(0, 30));
        } else {
            location.href = resultado.url + '#q=' + encodeURIComponent(consulta);
        }
    }

    function procesarHashEntrante() {
        if (location.hash.indexOf('#q=') !== 0) return false;
        var m = /^#q=(.*)$/.exec(location.hash);
        var consulta = '';
        try { consulta = decodeURIComponent(m ? m[1] : '').replace(/\+/g, ' '); } catch (e) { consulta = ''; }
        history.replaceState(null, '', location.pathname);

        var campo = document.querySelector('.buscador input');
        if (campo && consulta) campo.value = consulta;

        if (consulta) {
            // Espera breve para que el layout esté estable
            setTimeout(function () {
                if (!resaltarYIrA(contenidoPrincipal(), consulta)) {
                    construirIndice().then(function () {
                        var r = buscar(indice, consulta);
                        if (r.length) {
                            var primero = r[0];
                            if (primero.url === paginaActual()) {
                                resaltarYIrA(contenidoPrincipal(), consulta);
                            } else {
                                location.href = primero.url + '#q=' + encodeURIComponent(consulta);
                            }
                        }
                    });
                }
            }, 250);
        }
        return true;
    }

    // ==== Conexión del buscador ====
    function conectarBuscador(formulario) {
        var campo = formulario.querySelector('input');
        var panel = crearPanel(formulario);
        formulario._panelSfx = panel;
        formulario._resultados = [];
        formulario._activo = -1;

        // El input y el panel quedan enlazados para el lector de pantalla.
        campo.setAttribute('aria-controls', panel.id);
        campo.setAttribute('aria-expanded', 'false');

        function actualizar() {
            var consulta = campo.value.trim();
            formulario._activo = -1;
            if (consulta.length < 2) { cerrarPanel(panel); return; }
            renderPanel(panel, [], consulta, -1, true);
            construirIndice().then(function () {
                // Ignora respuestas viejas
                if (campo.value.trim() !== consulta) return;
                var r = buscar(indice, consulta);
                formulario._resultados = r;
                renderPanel(panel, r, consulta, -1, false);
            });
        }

        var temporizador = null;
        campo.addEventListener('input', function () {
            clearTimeout(temporizador);
            temporizador = setTimeout(actualizar, 180);
        });

        campo.addEventListener('focus', function () {
            if (campo.value.trim().length >= 2) actualizar();
        });

        campo.addEventListener('keydown', function (e) {
            var total = formulario._resultados.length;
            if (e.key === 'ArrowDown' && total) {
                e.preventDefault();
                formulario._activo = (formulario._activo + 1) % total;
                marcarActivo();
            } else if (e.key === 'ArrowUp' && total) {
                e.preventDefault();
                formulario._activo = (formulario._activo - 1 + total) % total;
                marcarActivo();
            } else if (e.key === 'Enter') {
                e.preventDefault();
                if (total) {
                    irAResultado(formulario._resultados[Math.max(formulario._activo, 0)], formulario);
                }
            } else if (e.key === 'Escape') {
                cerrarPanel(panel);
                campo.blur();
            }
        });

        function marcarActivo() {
            var items = panel.querySelectorAll('.sfx-item');
            Array.prototype.forEach.call(items, function (el, i) {
                var esActivo = i === formulario._activo;
                el.classList.toggle('activo', esActivo);
                el.setAttribute('aria-selected', esActivo ? 'true' : 'false');
                if (esActivo) el.scrollIntoView({ block: 'nearest' });
            });
            // aria-activedescendant es la forma de que el lector de pantalla
            // sepa cuál de las sugerencias está seleccionada: el foco real
            // sigue en el input, y sin esto las flechas no se anunciaban.
            if (formulario._activo >= 0 && items[formulario._activo]) {
                campo.setAttribute('aria-activedescendant', items[formulario._activo].id);
            } else {
                campo.removeAttribute('aria-activedescendant');
            }
        }

        formulario.addEventListener('submit', function (e) {
            e.preventDefault();
            if (formulario._resultados.length) {
                irAResultado(formulario._resultados[Math.max(formulario._activo, 0)], formulario);
            } else {
                actualizar();
            }
        });

        document.addEventListener('click', function (e) {
            if (!formulario.contains(e.target) && !panel.contains(e.target)) cerrarPanel(panel);
        });
    }

    // ==== Inicio ====
    function iniciar() {
        var formulario = document.querySelector('.buscador form');
        if (formulario) conectarBuscador(formulario);

        procesarHashEntrante();

        window.addEventListener('hashchange', procesarHashEntrante);

        // Precarga del índice en segundo plano
        setTimeout(construirIndice, 1200);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', iniciar);
    } else {
        iniciar();
    }
})();
