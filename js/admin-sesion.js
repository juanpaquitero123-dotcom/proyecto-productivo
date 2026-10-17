/* ===== Panel Administrativo: verificación de sesión compartida =====
   Usado en todas las páginas del panel. Verifica que el usuario sea
   administrador, muestra su nombre en el banner y mantiene la sesión viva.
*/
(function () {
    'use strict';

    function iniciar() {
        if (!window.AuthDB || typeof AuthDB.getSesion !== 'function') return;

        AuthDB.getSesion().then(function (sesion) {
            var usuarioSesion = (sesion && sesion.ok && sesion.usuario) ? sesion.usuario : null;
            if (!usuarioSesion || usuarioSesion.rol !== 'admin') {
                window.location.href = 'login.html';
                return;
            }

            // Mostrar el nombre del admin en el banner
            var bannerTag = document.querySelector('.banner-tag');
            if (bannerTag && usuarioSesion.nombre) {
                bannerTag.textContent = usuarioSesion.nombre;
            }

            // Mantener la sesión viva mientras la página esté abierta
            function latidoSesion() {
                AuthDB.mantenerSesion().then(function (r) {
                    if (r && r.ok === false) {
                        window.location.href = 'login.html';
                    }
                });
            }
            setInterval(latidoSesion, 240000);
            document.addEventListener('visibilitychange', function () {
                if (!document.hidden) latidoSesion();
            });
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', iniciar);
    } else {
        iniciar();
    }
})();