/* ===== Menú del encabezado del sitio público =====
    En pantallas grandes el menú es una fila horizontal dentro del
    encabezado. En tablet y móvil se convierte en un cajón lateral que se
    abre con el botón de hamburguesa.

    Antes, en móvil el menú era una tira horizontal deslizable: de los 10
    enlaces, 8 quedaban fuera de la pantalla y no había ningún aviso de que
    se pudiera arrastrar, así que "Contacto" e "Ingresar" parecían no
    existir. Con el cajón, los 10 se ven de una vez y ninguno se recorta.

    El botón y el velo se crean desde aquí para no tener que repetir el
    marcado en cada página del sitio.
*/
(function () {
    'use strict';

    var ANCHO_MOBILE = 900;

    function cabecera() { return document.querySelector('header'); }
    function menu() { return document.querySelector('header nav.menu'); }

    // ── Botón de hamburguesa ─────────────────────────────────
    function construirBoton() {
        var cab = cabecera();
        if (!cab || document.getElementById('menuBurger')) return;

        var boton = document.createElement('button');
        boton.type = 'button';
        boton.className = 'menu-burger';
        boton.id = 'menuBurger';
        boton.setAttribute('aria-label', 'Abrir el menú');
        boton.setAttribute('aria-expanded', 'false');
        boton.innerHTML = '<i class="fa-solid fa-bars" aria-hidden="true"></i>';

        // Va dentro de .header-principal para que en móvil quede en la misma
        // fila que el logo; el buscador pasa a ocupar todo el ancho debajo.
        var principal = document.querySelector('.header-principal');
        (principal || cab).appendChild(boton);
    }

    // ── Botón de cerrar (dentro del cajón) ───────────────────
    function construirCerrar() {
        var nav = menu();
        if (!nav || document.getElementById('menuCerrar')) return;

        var boton = document.createElement('button');
        boton.type = 'button';
        boton.className = 'menu-cerrar';
        boton.id = 'menuCerrar';
        boton.setAttribute('aria-label', 'Cerrar el menú');
        boton.innerHTML = '<i class="fa-solid fa-xmark" aria-hidden="true"></i>';

        nav.insertBefore(boton, nav.firstChild);
    }

    // ── Velo oscurecido detrás del cajón ─────────────────────
    function construirVelo() {
        var cab = cabecera();
        // Se cuelga de <header> y no de <body> a propósito: el encabezado
        // tiene su propio contexto de apilamiento (z-index), y así el velo
        // queda por debajo del cajón en vez de taparlo.
        if (!cab || document.getElementById('menuVelo')) return;

        var velo = document.createElement('div');
        velo.className = 'menu-velo';
        velo.id = 'menuVelo';
        velo.setAttribute('aria-hidden', 'true');
        cab.appendChild(velo);
    }

    function estaAbierto() {
        return document.body.classList.contains('menu-abierto');
    }

    function abrir() {
        document.body.classList.add('menu-abierto');
        var burger = document.getElementById('menuBurger');
        if (burger) {
            burger.setAttribute('aria-expanded', 'true');
            burger.setAttribute('aria-label', 'Cerrar el menú');
        }
        var cerrar = document.getElementById('menuCerrar');
        if (cerrar) cerrar.focus();
    }

    function cerrar(devolverFoco) {
        if (!estaAbierto()) return;
        document.body.classList.remove('menu-abierto');
        var burger = document.getElementById('menuBurger');
        if (burger) {
            burger.setAttribute('aria-expanded', 'false');
            burger.setAttribute('aria-label', 'Abrir el menú');
        }
        if (devolverFoco && burger) burger.focus();
    }

    function alternar() {
        if (estaAbierto()) cerrar(false);
        else abrir();
    }

    function conectar() {
        var burger = document.getElementById('menuBurger');
        var botonCerrar = document.getElementById('menuCerrar');
        var velo = document.getElementById('menuVelo');
        var nav = menu();

        if (nav && !nav.id) nav.id = 'menuPrincipal';
        if (burger && nav && nav.id) burger.setAttribute('aria-controls', nav.id);

        if (burger) burger.addEventListener('click', alternar);
        if (botonCerrar) botonCerrar.addEventListener('click', function () { cerrar(true); });
        if (velo) velo.addEventListener('click', function () { cerrar(true); });

        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape') cerrar(true);
        });

        // Al girar el teléfono o ampliar la ventana el cajón deja de hacer falta
        window.addEventListener('resize', function () {
            if (window.innerWidth > ANCHO_MOBILE) cerrar(false);
        });
    }

    // ── Sesión sin depender de AuthDB ─────────────────────────
    // Las páginas públicas cargan gate.js + menu-publico.js, pero NO
    // auth.js, así que AuthDB no está definido ahí. Para conocer el rol
    // hay que preguntarle a sesion.php; si AuthDB sí está disponible
    // (páginas que cargan auth.js) se usa su método.
    function obtenerSesion() {
        if (window.AuthDB && typeof AuthDB.getSesion === 'function') {
            return AuthDB.getSesion();
        }
        return fetch('../php/sesion.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'same-origin',
            body: JSON.stringify({ accion: 'estado' })
        }).then(function (r) {
            return r.json();
        }).catch(function () {
            return { ok: false };
        });
    }

    function cerrarSesionMenu() {
        if (window.AuthDB && typeof AuthDB.logout === 'function') {
            return AuthDB.logout();
        }
        return fetch('../php/sesion.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'same-origin',
            body: JSON.stringify({ accion: 'logout' })
        }).then(function (r) {
            return r.json();
        }).catch(function () {
            return { ok: false };
        });
    }

    // ── Enlaces que dependen del rol ──────────────────────────
    // El enlace "Agenda" y el nombre del usuario no vienen en el
    // marcado de cada página: se crean aquí una sola vez y luego se
    // muestran u ocultan según la sesión. Así no hay que repetir el
    // mismo bloque en las 10 páginas del sitio.
    function construirItemsRol() {
        var nav = menu();
        if (!nav) return;
        var ul = nav.querySelector('ul');
        if (!ul) return;

        // Marcar el enlace "Ingresar" para poder ocultarlo con sesión.
        if (!document.getElementById('navLogin')) {
            var enlaces = ul.querySelectorAll('li a');
            for (var i = 0; i < enlaces.length; i++) {
                var href = enlaces[i].getAttribute('href') || '';
                if (/(^|\/)login\.html(\?|#|$)/.test(href)) {
                    enlaces[i].parentNode.id = 'navLogin';
                    break;
                }
            }
        }

        // Enlace al Panel (solo administradores). Permite volver al panel
        // administrativo desde el sitio público o desde la propia agenda.
        if (!document.getElementById('navPanel')) {
            var liPanel = document.createElement('li');
            liPanel.id = 'navPanel';
            liPanel.style.display = 'none';
            liPanel.innerHTML =
                '<a href="admin.html">' +
                    '<i class="fa-solid fa-gauge-high"></i>' +
                    'Panel' +
                '</a>';
            var refPanel = document.getElementById('navLogin');
            if (refPanel) ul.insertBefore(liPanel, refPanel);
            else ul.appendChild(liPanel);
        }

        // Enlace a la Agenda (oculto hasta confirmar sesión de staff).
        // Se inserta después del Panel y antes de "Ingresar".
        if (!document.getElementById('navAgenda')) {
            var liAgenda = document.createElement('li');
            liAgenda.id = 'navAgenda';
            liAgenda.style.display = 'none';
            liAgenda.innerHTML =
                '<a href="agenda.html">' +
                    '<i class="fa-regular fa-calendar-check"></i>' +
                    'Agenda' +
                '</a>';
            var refAgenda = document.getElementById('navLogin');
            if (refAgenda) ul.insertBefore(liAgenda, refAgenda);
            else ul.appendChild(liAgenda);
        }

        // Nombre del usuario + botón de cerrar sesión (oculto por defecto).
        if (!document.getElementById('navUsuario')) {
            var liUsr = document.createElement('li');
            liUsr.id = 'navUsuario';
            liUsr.style.display = 'none';
            liUsr.innerHTML =
                '<a href="#" id="btnCerrarSesionMenu" title="Cerrar sesión">' +
                    '<i class="fa-solid fa-right-from-bracket"></i>' +
                    '<span id="txtUsuarioMenu">Salir</span>' +
                '</a>';
            ul.appendChild(liUsr);
        }
    }

    async function actualizarMenuPorRol() {
        try {
            construirItemsRol();

            var ses = await obtenerSesion();
            var usr = (ses && ses.ok && ses.usuario) ? ses.usuario : null;

            var navPanel   = document.getElementById('navPanel');
            var navAgenda  = document.getElementById('navAgenda');
            var navLogin   = document.getElementById('navLogin');
            var navUsuario = document.getElementById('navUsuario');
            var txtUsr     = document.getElementById('txtUsuarioMenu');

            // Docentes y administrativos pueden ver la agenda; solo los
            // administradores tienen panel administrativo.
            var esStaff = !!(usr && (usr.rol === 'docente' || usr.rol === 'admin'));
            var esAdmin = !!(usr && usr.rol === 'admin');

            if (navAgenda) navAgenda.style.display = esStaff ? '' : 'none';
            if (navPanel)  navPanel.style.display  = esAdmin ? '' : 'none';

            if (usr) {
                if (navLogin) navLogin.style.display = 'none';
                if (navUsuario) navUsuario.style.display = '';
                if (txtUsr) txtUsr.textContent = usr.nombre || 'Salir';

                var btnSalir = document.getElementById('btnCerrarSesionMenu');
                if (btnSalir) {
                    btnSalir.onclick = async function (e) {
                        e.preventDefault();
                        try {
                            await cerrarSesionMenu();
                        } catch (err) {}
                        window.location.href = 'login.html';
                    };
                }
            } else {
                if (navLogin) navLogin.style.display = '';
                if (navUsuario) navUsuario.style.display = 'none';
                if (navAgenda) navAgenda.style.display = 'none';
                if (navPanel) navPanel.style.display = 'none';
            }
        } catch (e) {
            // Silenciar errores al verificar sesión
        }
    }

    function iniciar() {
        if (!cabecera() || !menu()) return;
        construirBoton();
        construirCerrar();
        construirVelo();
        conectar();
        actualizarMenuPorRol();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', iniciar);
    } else {
        iniciar();
    }
})();