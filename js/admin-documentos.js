/* ===== Panel Administrativo: Documentos Institucionales =====
   Administra el Manual de Convivencia (y futuras secciones).
   Se sube un archivo PDF/DOC/DOCX por sección: al subir uno nuevo
   el anterior se reemplaza, y siempre se puede eliminar.
*/
(function () {
    'use strict';

    var SECCIONES = [
        { seccion: 'manual', etiqueta: 'Manual de Convivencia', nombre: 'Manual de Convivencia' },
        { seccion: 'manual_segundo', etiqueta: 'Manual de Convivencia - Segundo', nombre: 'Manual de Convivencia - Grado Segundo' }
    ];

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

    function humano(bytes) {
        if (!bytes) return '';
        if (bytes >= 1024 * 1024) {
            return (bytes / (1024 * 1024)).toFixed(1).replace('.', ',') + ' MB';
        }
        return Math.max(1, Math.round(bytes / 1024)) + ' KB';
    }

    function cargarDocumentos() {
        return window.fetch('../php/documentos.php', { credentials: 'same-origin' })
            .then(function (r) { return r.ok ? r.json() : null; })
            .then(function (d) {
                if (d && d.ok && Array.isArray(d.documentos)) {
                    return d.documentos;
                }
                return [];
            })
            .catch(function () {
                return null;
            });
    }

    SECCIONES.forEach(function (cfg) {
        var seccion = cfg.seccion;
        var actual = document.getElementById('documentoActual-' + seccion);
        var entrada = document.getElementById('inputDocumento-' + seccion);
        var botonSubir = document.querySelector('[data-input="inputDocumento-' + seccion + '"]');

        if (!actual || !entrada || !botonSubir) return;

        function estadoVacio() {
            actual.innerHTML =
                '<p class="lista-vacia"><i class="fa-regular fa-file-lines"></i> Aún no hay ' +
                esc(cfg.nombre.toLowerCase()) + ' publicado.</p>';
        }

        function estadoError() {
            actual.innerHTML =
                '<p class="lista-vacia"><i class="fa-solid fa-triangle-exclamation"></i> No se pudo conectar con el servidor.</p>';
        }

        function pintar(doc) {
            if (!doc || !doc.ruta) {
                estadoVacio();
                return;
            }

            var nombre = doc.nombre || cfg.nombre;
            var ext = String(doc.ruta.split('.').pop()).toUpperCase();
            var tam = doc.tamano ? humano(doc.tamano) : '';
            var ruta = '../' + doc.ruta;

            actual.innerHTML =
                '<div class="doc-actual">' +
                    '<div class="doc-actual-icono"><i class="fa-solid fa-file-contract"></i></div>' +
                    '<div class="doc-actual-info">' +
                        '<strong>' + esc(nombre) + '</strong>' +
                        '<span>' + esc(ext) + (tam ? ' · ' + tam : '') + '</span>' +
                    '</div>' +
                    '<div class="doc-actual-acciones">' +
                        '<a class="btn-icono" href="' + esc(ruta) + '" target="_blank" title="Ver documento"><i class="fa-solid fa-eye"></i></a>' +
                        '<a class="btn-icono" href="' + esc(ruta) + '" download title="Descargar documento"><i class="fa-solid fa-download"></i></a>' +
                        '<button type="button" class="btn-icono btn-eliminar-icon" title="Eliminar documento"><i class="fa-solid fa-trash"></i></button>' +
                    '</div>' +
                '</div>';

            actual.querySelector('.btn-eliminar-icon').addEventListener('click', function () {
                if (!confirm('¿Eliminar el ' + cfg.nombre.toLowerCase() + ' publicado?')) return;

                AuthDB.eliminarDocumento(seccion).then(function (r) {
                    if (r && r.ok) {
                        estadoVacio();
                        mostrarToast(cfg.nombre + ' eliminado.');
                    } else {
                        mostrarToast((r && r.error) || 'No se pudo eliminar el documento.');
                    }
                });
            });
        }

        botonSubir.addEventListener('click', function () {
            entrada.click();
        });

        entrada.addEventListener('change', function () {
            var archivos = Array.prototype.slice.call(entrada.files || []);
            entrada.value = '';
            if (!archivos.length) return;

            var archivo = archivos[0];
            if (!/\.(pdf|docx?)$/i.test(archivo.name)) {
                mostrarToast('Selecciona un archivo PDF, DOC o DOCX.');
                return;
            }

            AuthDB.subirDocumento(seccion, archivo).then(function (r) {
                if (r && r.ok) {
                    cargarDocumentos().then(function (lista) {
                        var doc = null;
                        if (lista) {
                            for (var i = 0; i < lista.length; i++) {
                                if (lista[i].seccion === seccion) {
                                    doc = lista[i];
                                    break;
                                }
                            }
                        }
                        pintar(doc);
                        mostrarToast(cfg.nombre + ' publicado correctamente.');
                    });
                } else {
                    mostrarToast((r && r.error) || 'No se pudo subir el documento.');
                }
            });
        });

        cargarDocumentos().then(function (lista) {
            if (lista === null) {
                estadoError();
                return;
            }

            var doc = null;
            for (var i = 0; i < lista.length; i++) {
                if (lista[i].seccion === seccion) {
                    doc = lista[i];
                    break;
                }
            }
            pintar(doc);
        });
    });
})();