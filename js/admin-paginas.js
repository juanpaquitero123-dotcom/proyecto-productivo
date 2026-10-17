/* ===== Panel Administrativo: Galerías por Página =====
   Administra las imágenes de las páginas Académico, Estudiantes,
   Padres, Horarios y Contacto (sección en Imagenes + elemento_id = 1),
   las tarjetas de Instalaciones y Beneficios del colegio (id 1..9)
   y los Símbolos Institucionales (Escudo 1, Bandera 2, Himno 3):
   subir archivos y eliminarlos.
*/
(function () {
    'use strict';

    var CONF = [];

    // Galerías por página (sección + elemento único id = 1)
    [
        ['academico', 'Académico'],
        ['estudiantes', 'Estudiantes'],
        ['padres', 'Padres'],
        ['horarios', 'Horarios'],
        ['contacto', 'Contacto']
    ].forEach(function (p) {
        CONF.push({
            seccion: p[0],
            elementoId: 1,
            lista: 'galeriaLista-' + p[0],
            entrada: 'inputGaleria-' + p[0],
            etiqueta: p[1],
            vacio: 'Aún no hay imágenes en esta galería.'
        });
    });

    // Tarjetas de Instalaciones y Beneficios Estudiantiles (id 1..9)
    [
        'Aulas Amplias',
        'Biblioteca',
        'Sala de Informática',
        'Laboratorio',
        'Zonas Deportivas',
        'Zonas Verdes',
        'Servicio de Alimentación',
        'Bienestar y Salud',
        'Orientación Escolar'
    ].forEach(function (nombre, i) {
        var n = i + 1;
        CONF.push({
            seccion: 'instalaciones',
            elementoId: n,
            lista: 'instalacionLista-' + n,
            entrada: 'inputInstalacion-' + n,
            etiqueta: nombre,
            vacio: 'Aún no hay imágenes para esta tarjeta.'
        });
    });

    // Símbolos Institucionales (id 1..3)
    [
        'El Escudo',
        'La Bandera',
        'El Himno'
    ].forEach(function (nombre, i) {
        var n = i + 1;
        CONF.push({
            seccion: 'simbolos',
            elementoId: n,
            lista: 'simboloLista-' + n,
            entrada: 'inputSimbolo-' + n,
            etiqueta: nombre,
            vacio: 'Aún no hay imágenes para este símbolo.'
        });
    });

    /* ---- Toast ---- */
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

    /* ---- Botones "Agregar imágenes" → input file oculto ---- */
    document.querySelectorAll('.btn-agregar-imagen[data-input]').forEach(function (btn) {
        btn.addEventListener('click', function () {
            var objetivo = document.getElementById(btn.getAttribute('data-input'));
            if (objetivo) objetivo.click();
        });
    });

    /* ---- Una galería por elemento configurado ---- */
    CONF.forEach(function (cfg) {
        var lista = document.getElementById(cfg.lista);
        var entrada = document.getElementById(cfg.entrada);
        if (!lista || !entrada) return;

        var existentes = []; // [{ id, ruta }]

        function pintar() {
            lista.innerHTML = '';

            if (!existentes.length) {
                var vacia = document.createElement('p');
                vacia.className = 'lista-vacia';
                vacia.innerHTML = '<i class="fa-regular fa-image"></i> ' + esc(cfg.vacio);
                lista.appendChild(vacia);
                return;
            }

            existentes.forEach(function (img) {
                var d = document.createElement('div');
                d.className = 'img-thumb img-existente';
                d.title = 'Eliminar imagen';
                d.innerHTML =
                    '<img src="' + esc(AuthDB.imagenRuta(img.ruta)) + '" alt="Imagen guardada">' +
                    '<button type="button" class="img-quitar" title="Eliminar imagen"><i class="fa-solid fa-xmark"></i></button>';

                d.querySelector('.img-quitar').addEventListener('click', function () {
                    var idEliminar = img.id;
                    if (!confirm('¿Eliminar esta imagen de ' + cfg.etiqueta + '?')) return;

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

                lista.appendChild(d);
            });
        }

        function cargar() {
            fetch('../php/imagenes.php?t=' + Date.now(), { credentials: 'same-origin', cache: 'no-store' })
                .then(function (r) { return r.ok ? r.json() : null; })
                .then(function (d) {
                    if (d && d.ok && Array.isArray(d.imagenes)) {
                        existentes = d.imagenes
                            .filter(function (im) {
                                return im.seccion === cfg.seccion &&
                                    im.elemento_id === cfg.elementoId &&
                                    im.ruta;
                            })
                            .map(function (im) { return { id: im.id, ruta: im.ruta }; });
                        pintar();
                    }
                })
                .catch(function () {
                    lista.innerHTML = '<p class="lista-vacia"><i class="fa-solid fa-triangle-exclamation"></i> No se pudo conectar con el servidor.</p>';
                });
        }

        /* Elegir imágenes → se suben de una vez al elemento */
        entrada.addEventListener('change', function () {
            var archivos = Array.prototype.slice.call(entrada.files || []);
            entrada.value = '';
            if (!archivos.length) return;

            AuthDB.subirImagenes(cfg.seccion, cfg.elementoId, archivos).then(function (r) {
                if (r && r.ok) {
                    var nuevas = (r.imagenes || []).map(function (im) {
                        return { id: im.id, ruta: im.ruta };
                    });
                    existentes = existentes.concat(nuevas);
                    pintar();
                    mostrarToast('Imágenes agregadas a ' + cfg.etiqueta + '.');
                } else {
                    mostrarToast((r && r.error) || 'No se pudieron subir las imágenes.');
                }
            });
        });

        cargar();
    });
})();