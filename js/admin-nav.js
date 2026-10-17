/* ===== Panel Administrativo: barra lateral de navegación =====
   Construye el sidebar con enlaces a cada panel individual según la
   página actual (body[data-pagina]).

   En pantallas grandes el menú vive fijo a la izquierda. En tablets y
   móviles se convierte en un cajón lateral que se abre con el botón de
   la barra superior (clase .admin-menu-abierto en <body>), de modo que el
   contenido de cada módulo usa todo el ancho de la pantalla.
*/
(function () {
    'use strict';

    var SECCIONES = {
        'inicio': { icono: 'fa-solid fa-gauge-high', texto: 'Inicio del Panel', href: 'admin.html', tono: 'tone-1' },
        'inicio-contenido': { icono: 'fa-solid fa-house', texto: 'Inicio del Sitio', href: 'admin-inicio.html', tono: 'tone-1' },
        'general': { icono: 'fa-solid fa-building-columns', texto: 'Información General', href: 'admin-general.html', tono: 'tone-5' },
        'slides': { icono: 'fa-solid fa-images', texto: 'Slides del Inicio', href: 'admin-slides.html', tono: 'tone-7' },
        'eventos': { icono: 'fa-regular fa-calendar', texto: 'Eventos', href: 'admin-eventos.html', tono: 'tone-2' },
        'noticias': { icono: 'fa-regular fa-newspaper', texto: 'Noticias', href: 'admin-noticias.html', tono: 'tone-5' },
        'contacto': { icono: 'fa-solid fa-phone', texto: 'Contacto', href: 'admin-contacto.html', tono: 'tone-6' },
        'paginas': { icono: 'fa-regular fa-images', texto: 'Galerías por Página', href: 'admin-paginas.html', tono: 'tone-3' },
        'nosotros': { icono: 'fa-solid fa-school', texto: 'Nuestro Colegio', href: 'admin-nosotros.html', tono: 'tone-8' },
        'academico': { icono: 'fa-solid fa-book-open', texto: 'Académico', href: 'admin-academico.html', tono: 'tone-4' },
        'estudiantes': { icono: 'fa-solid fa-graduation-cap', texto: 'Estudiantes', href: 'admin-estudiantes.html', tono: 'tone-3' },
        'padres': { icono: 'fa-solid fa-users', texto: 'Padres', href: 'admin-padres.html', tono: 'tone-4' },
        'horarios': { icono: 'fa-solid fa-clock', texto: 'Horarios', href: 'admin-horarios.html', tono: 'tone-6' },
        'documentos': { icono: 'fa-solid fa-file-lines', texto: 'Documentos', href: 'admin-documentos.html', tono: 'tone-2' },
        'agenda': { icono: 'fa-regular fa-calendar-check', texto: 'Agenda', href: 'agenda.html', tono: 'tone-6' },
        'usuarios': { icono: 'fa-solid fa-user-gear', texto: 'Usuarios', href: 'admin-usuarios.html', tono: 'tone-1' }
    };

    var GRUPOS = [
        { titulo: 'Panel', icono: 'fa-solid fa-gauge-high', secciones: ['inicio'] },
        { titulo: 'Sitio', icono: 'fa-solid fa-globe', secciones: ['general', 'inicio-contenido', 'slides', 'paginas', 'contacto', 'documentos'] },
        { titulo: 'Páginas', icono: 'fa-solid fa-school', secciones: ['nosotros', 'academico', 'estudiantes', 'padres', 'horarios'] },
        { titulo: 'Publicaciones', icono: 'fa-solid fa-bullhorn', secciones: ['eventos', 'noticias'] },
        { titulo: 'Organización', icono: 'fa-regular fa-calendar-check', secciones: ['agenda'] },
        { titulo: 'Sistema', icono: 'fa-solid fa-sliders', secciones: ['usuarios'] }
    ];

    var ANCHO_MOBILE = 1024;

    function seccionActual() {
        var id = document.body.getAttribute('data-pagina') || '';
        return SECCIONES[id] ? id : '';
    }

    function grupoDe(id) {
        for (var i = 0; i < GRUPOS.length; i++) {
            if (GRUPOS[i].secciones.indexOf(id) !== -1) return GRUPOS[i];
        }
        return null;
    }

    // ── Sidebar ──────────────────────────────────────────────
    function construirSidebar() {
        var contenedor = document.getElementById('adminSidebar');
        if (!contenedor) return;

        var actual = seccionActual();

        var html =
            '<div class="admin-sidebar-titulo">' +
                '<i class="fa-solid fa-user-shield"></i>' +
                '<span>Panel de Control</span>' +
                '<button type="button" class="admin-sidebar-cerrar" id="adminSidebarCerrarMenu" aria-label="Cerrar el menú">' +
                    '<i class="fa-solid fa-xmark"></i>' +
                '</button>' +
            '</div>' +
            '<nav class="admin-sidebar-nav">';

        GRUPOS.forEach(function (g) {
            html +=
                '<div class="admin-sidebar-grupo">' +
                    '<span class="admin-sidebar-grupo-titulo">' +
                        '<i class="' + g.icono + '"></i> ' + g.titulo +
                    '</span>' +
                    '<ul>';

            g.secciones.forEach(function (id) {
                var s = SECCIONES[id];
                if (!s) return;
                var activo = (id === actual);
                html +=
                    '<li>' +
                        '<a href="' + s.href + '"' +
                            (activo ? ' class="activo" aria-current="page"' : '') +
                            ' title="' + s.texto + '">' +
                            '<i class="' + s.icono + '"></i>' +
                            '<span>' + s.texto + '</span>' +
                        '</a>' +
                    '</li>';
            });

            html += '</ul></div>';
        });

        html +=
            '</nav>' +
            '<div class="admin-sidebar-footer">' +
                '<a href="index.html" class="btn-sidebar-volver"><i class="fa-solid fa-globe"></i> Ver el sitio</a>' +
                '<button type="button" class="btn-sidebar-salir" id="btnSidebarCerrar"><i class="fa-solid fa-right-from-bracket"></i> Cerrar sesión</button>' +
            '</div>';

        contenedor.innerHTML = html;
    }

    // ── Barra superior del panel (solo móvil/tablet) ─────────
    function construirBarraSuperior() {
        var layout = document.querySelector('.admin-layout');
        if (!layout || document.getElementById('adminTopbar')) return;

        var actual = seccionActual();
        var grupo = actual ? grupoDe(actual) : null;
        var seccion = actual ? SECCIONES[actual] : null;

        var barra = document.createElement('div');
        barra.className = 'admin-topbar';
        barra.id = 'adminTopbar';
        barra.innerHTML =
            '<button type="button" class="admin-topbar-burger" id="adminBurger" aria-label="Abrir el menú del panel" aria-expanded="false" aria-controls="adminSidebar">' +
                '<i class="fa-solid fa-bars"></i>' +
            '</button>' +
            '<div class="admin-topbar-info">' +
                '<span class="admin-topbar-kicker">' + (grupo ? grupo.titulo : 'Panel') + '</span>' +
                '<strong class="admin-topbar-titulo">' + (seccion ? seccion.texto : 'Panel de Control') + '</strong>' +
            '</div>' +
            '<div class="admin-topbar-acciones">' +
                '<a href="index.html" class="admin-topbar-btn" title="Ver el sitio público"><i class="fa-solid fa-globe"></i><span>Ver sitio</span></a>' +
                '<button type="button" class="admin-topbar-btn admin-topbar-salir" id="adminTopbarSalir" title="Cerrar sesión"><i class="fa-solid fa-right-from-bracket"></i><span>Salir</span></button>' +
            '</div>';

        layout.insertBefore(barra, layout.firstChild);
    }

    // ── Cajón lateral en móvil ───────────────────────────────
    function construirOverlay() {
        if (document.getElementById('adminSidebarOverlay')) return;

        var overlay = document.createElement('div');
        overlay.className = 'admin-sidebar-overlay';
        overlay.id = 'adminSidebarOverlay';
        overlay.setAttribute('aria-hidden', 'true');
        document.body.appendChild(overlay);
    }

    function estaAbierto() {
        return document.body.classList.contains('admin-menu-abierto');
    }

    function abrirMenu() {
        document.body.classList.add('admin-menu-abierto');
        var burger = document.getElementById('adminBurger');
        if (burger) burger.setAttribute('aria-expanded', 'true');
        var cerrar = document.getElementById('adminSidebarCerrarMenu');
        if (cerrar) cerrar.focus();
    }

    function cerrarMenu(devolverFoco) {
        if (!estaAbierto()) return;
        document.body.classList.remove('admin-menu-abierto');
        var burger = document.getElementById('adminBurger');
        if (burger) burger.setAttribute('aria-expanded', 'false');
        if (devolverFoco && burger) burger.focus();
    }

    function alternarMenu() {
        if (estaAbierto()) cerrarMenu(false);
        else abrirMenu();
    }

    function conectarMenu() {
        var burger = document.getElementById('adminBurger');
        var cerrar = document.getElementById('adminSidebarCerrarMenu');
        var overlay = document.getElementById('adminSidebarOverlay');

        if (burger) burger.addEventListener('click', alternarMenu);
        if (cerrar) cerrar.addEventListener('click', function () { cerrarMenu(true); });
        if (overlay) overlay.addEventListener('click', function () { cerrarMenu(true); });

        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape') cerrarMenu(true);
        });

        // Al girar el teléfono o ampliar la ventana el cajón deja de hacer falta
        window.addEventListener('resize', function () {
            if (window.innerWidth > ANCHO_MOBILE) cerrarMenu(false);
        });
    }

    function cerrarSesion() {
        if (!window.AuthDB || typeof AuthDB.logout !== 'function') return;
        AuthDB.logout().then(function () {
            window.location.href = 'login.html';
        });
    }

    function conectarSesion() {
        var btnSalir = document.getElementById('btnSidebarCerrar');
        var btnSalirBarra = document.getElementById('adminTopbarSalir');
        if (btnSalir) btnSalir.addEventListener('click', cerrarSesion);
        if (btnSalirBarra) btnSalirBarra.addEventListener('click', cerrarSesion);
    }

    // ── Accesos directos en el inicio del panel ──────────────
    function pintarAccesosDirectos() {
        var panel = document.getElementById('panel-inicio');
        if (!panel || seccionActual() !== 'inicio') return;

        var html = '<div class="admin-dashboard-grid">';

        GRUPOS.forEach(function (g) {
            html +=
                '<h4 class="admin-dash-grupo-titulo">' +
                    '<i class="' + g.icono + '"></i> ' + g.titulo +
                '</h4>';

            g.secciones.forEach(function (id) {
                var s = SECCIONES[id];
                if (!s) return;
                html +=
                    '<a class="admin-dash-card" href="' + s.href + '">' +
                        '<span class="admin-dash-icono ' + s.tono + '"><i class="' + s.icono + '"></i></span>' +
                        '<h3>' + s.texto + '</h3>' +
                        '<span class="admin-dash-enlace">Abrir módulo <i class="fa-solid fa-arrow-right"></i></span>' +
                    '</a>';
            });
        });

        html += '</div>';

        panel.insertAdjacentHTML('beforeend', html);
    }

    function construir() {
        construirSidebar();
        construirBarraSuperior();
        construirOverlay();
        conectarMenu();
        conectarSesion();
        pintarAccesosDirectos();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', construir);
    } else {
        construir();
    }
})();
