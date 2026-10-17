/* ===== Manual de Convivencia (página de inicio) =====
   Diapositivas del carrusel de portada que enlazan al manual.
   - Cuando el manual está publicado (Panel Admin → Documentos), muestra la
     descripción del archivo y el botón DESCARGAR.
   - Si aún no se publica, muestra un aviso de disponibilidad.
   La subida/actualización se hace únicamente desde el panel administrativo.
*/
(function () {
    'use strict';

    var manualTexto = document.getElementById('manualTexto');
    var manualEnlace = document.getElementById('manualDescargar');
    var manualSegundoTexto = document.getElementById('manualSegundoTexto');
    var manualSegundoEnlace = document.getElementById('manualSegundoDescargar');

    function humano(bytes) {
        if (!bytes) return '';
        if (bytes >= 1024 * 1024) {
            return (bytes / (1024 * 1024)).toFixed(1).replace('.', ',') + ' MB';
        }
        return Math.max(1, Math.round(bytes / 1024)) + ' KB';
    }

    window.fetch('../php/contenido.php?t=' + Date.now(), { credentials: 'same-origin', cache: 'no-store' })
        .then(function (r) { return r.ok ? r.json() : null; })
        .then(function (d) {
            var docs = (d && Array.isArray(d.documentos)) ? d.documentos : [];
            var manual = null;
            var manualSegundo = null;
            for (var i = 0; i < docs.length; i++) {
                if (docs[i].seccion === 'manual' && docs[i].ruta) {
                    manual = docs[i];
                }
                if (docs[i].seccion === 'manual_segundo' && docs[i].ruta) {
                    manualSegundo = docs[i];
                }
            }

            if (manual && manualTexto && manualEnlace) {
                var ext = String(manual.ruta.split('.').pop()).toUpperCase();
                var nombre = (manual.nombre || 'manual').replace(/\.[a-z0-9]+$/i, '');
                nombre = nombre.charAt(0).toUpperCase() + nombre.slice(1);
                manualTexto.textContent = nombre + ' · ' + ext + (manual.tamano ? ' · ' + humano(manual.tamano) : '');
                manualEnlace.href = '../' + manual.ruta;
                manualEnlace.hidden = false;
            } else if (manualTexto && manualEnlace) {
                manualTexto.textContent = 'El Manual de Convivencia estará disponible próximamente.';
                manualEnlace.hidden = true;
            }

            if (manualSegundo && manualSegundoTexto && manualSegundoEnlace) {
                var ext2 = String(manualSegundo.ruta.split('.').pop()).toUpperCase();
                var nombre2 = (manualSegundo.nombre || 'manual').replace(/\.[a-z0-9]+$/i, '');
                nombre2 = nombre2.charAt(0).toUpperCase() + nombre2.slice(1);
                manualSegundoTexto.textContent = nombre2 + ' · ' + ext2 + (manualSegundo.tamano ? ' · ' + humano(manualSegundo.tamano) : '');
                manualSegundoEnlace.href = '../' + manualSegundo.ruta;
                manualSegundoEnlace.hidden = false;
            } else if (manualSegundoTexto && manualSegundoEnlace) {
                manualSegundoTexto.textContent = 'El Manual de Convivencia de Segundo estará disponible próximamente.';
                manualSegundoEnlace.hidden = true;
            }
        })
        .catch(function () {
            /* Sin respuesta del servidor: se muestra el estado por defecto. */
        });
})();