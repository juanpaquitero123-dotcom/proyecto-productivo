/* ===== Panel Administrativo: gestión de usuarios =====
   Solo se incluye en admin-usuarios.html . Maneja la tabla de usuarios,
   filtros por rol, modal de creación, estado y eliminación.
*/
(function () {
    'use strict';

    var modal = document.getElementById('modalCrearUsuario');
    if (!modal) return;

    var modalCrear = modal;
    var btnAbrir = document.getElementById('btnAgregarUsuario');
    var btnCerrar = document.getElementById('btnCerrarModal');
    var btnCancelar = document.getElementById('btnCancelarModal');
    var formCrear = document.getElementById('formCrearUsuario');
    var modalMsg = document.getElementById('modalMsg');
    var btnCerrarSesion = document.getElementById('btnCerrarSesion');

    // ── Abrir modal ──
    if (btnAbrir) {
        btnAbrir.addEventListener('click', function () {
            formCrear.reset();
            modalMsg.className = 'login-msg';
            modalMsg.textContent = '';
            modalCrear.style.display = 'flex';
            setTimeout(function () { modalCrear.classList.add('visible'); }, 10);
        });
    }

    // ── Cerrar modal ──
    function cerrarModal() {
        modalCrear.classList.remove('visible');
        setTimeout(function () { modalCrear.style.display = 'none'; }, 300);
    }

    if (btnCerrar) btnCerrar.addEventListener('click', cerrarModal);
    if (btnCancelar) btnCancelar.addEventListener('click', cerrarModal);

    modalCrear.addEventListener('click', function (e) {
        if (e.target === modalCrear) cerrarModal();
    });

    // ── Crear usuario desde el modal ──
    if (formCrear) {
        formCrear.addEventListener('submit', async function (e) {
            e.preventDefault();

            var rol = document.getElementById('modalRol').value;
            var nombre = document.getElementById('modalNombre').value.trim();
            var usuario = document.getElementById('modalUsuario').value.trim();
            var email = document.getElementById('modalEmail').value.trim();
            var password = document.getElementById('modalPassword').value.trim();
            var password2 = document.getElementById('modalPassword2').value.trim();

            modalMsg.className = 'login-msg';

            if (password !== password2) {
                modalMsg.className = 'login-msg error';
                modalMsg.textContent = 'Las contraseñas no coinciden.';
                return;
            }

            if (password.length < 6) {
                modalMsg.className = 'login-msg error';
                modalMsg.textContent = 'La contraseña debe tener al menos 6 caracteres.';
                return;
            }

            var btnSubmit = formCrear.querySelector('.btn-guardar');
            btnSubmit.disabled = true;
            btnSubmit.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Creando...';

            try {
                var res = await AuthDB.crearUsuarioAdmin({
                    nombre: nombre,
                    usuario: usuario,
                    email: email,
                    password: password,
                    rol: rol
                });

                if (!res.ok) {
                    modalMsg.className = 'login-msg error';
                    modalMsg.textContent = res.error;
                    btnSubmit.disabled = false;
                    btnSubmit.innerHTML = '<i class="fa-solid fa-user-plus"></i> Crear Usuario';
                    return;
                }

                modalMsg.className = 'login-msg ok';
                modalMsg.textContent = 'Usuario "' + usuario + '" creado correctamente.';
                formCrear.reset();
                btnSubmit.disabled = false;
                btnSubmit.innerHTML = '<i class="fa-solid fa-user-plus"></i> Crear Usuario';
                cargarUsuarios();

                setTimeout(cerrarModal, 1500);

            } catch (err) {
                modalMsg.className = 'login-msg error';
                modalMsg.textContent = 'Error al crear el usuario.';
                btnSubmit.disabled = false;
                btnSubmit.innerHTML = '<i class="fa-solid fa-user-plus"></i> Crear Usuario';
            }
        });
    }

    // Botón cerrar sesión
    if (btnCerrarSesion) {
        btnCerrarSesion.addEventListener('click', function () {
            AuthDB.logout().then(function () {
                window.location.href = 'login.html';
            });
        });
    }

    // Cargar usuarios desde MySQL
    cargarUsuarios();

    // ── Filtro por rol ──
    var filtroRol = '';
    var todosUsuarios = [];
    var botonesFiltro = document.querySelectorAll('#usuariosFiltros .filtro-btn');

    if (botonesFiltro.length) {
        botonesFiltro.forEach(function (btn) {
            btn.addEventListener('click', function () {
                filtroRol = btn.dataset.filtro || '';
                botonesFiltro.forEach(function (b) { b.classList.remove('activo'); });
                btn.classList.add('activo');
                pintarUsuarios();
            });
        });
    }

    var rolLabels = {
        'admin': { text: 'Administrativo', css: 'admin' },
        'docente': { text: 'Docente', css: 'docente' },
        'estudiante': { text: 'Estudiante', css: 'estudiante' },
        'padre': { text: 'Padre', css: 'padre' }
    };

    function pintarUsuarios() {
        var tbody = document.querySelector('#tablaUsuarios tbody');
        if (!tbody) return;
        tbody.innerHTML = '';

        // Contadores por rol
        ['', 'admin', 'docente', 'estudiante', 'padre'].forEach(function (rol) {
            var total = todosUsuarios.filter(function (u) { return !rol || u.rol === rol; }).length;
            var btn = document.querySelector('#usuariosFiltros .filtro-btn[data-filtro="' + rol + '"]');
            var contador = btn ? btn.querySelector('.filtro-contador') : null;
            if (contador) contador.textContent = total;
        });

        var lista = todosUsuarios.filter(function (u) {
            return !filtroRol || u.rol === filtroRol;
        });

        if (!lista.length) {
            var trVacio = document.createElement('tr');
            trVacio.innerHTML = '<td colspan="6" class="fila-vacia">No hay usuarios registrados en este rol.</td>';
            tbody.appendChild(trVacio);
            return;
        }

        for (var i = 0; i < lista.length; i++) {
            var u = lista[i];
            var r = rolLabels[u.rol] || { text: u.rol, css: 'docente' };
            var tr = document.createElement('tr');
            // data-label: en móvil la tabla se ve como fichas y cada
            // campo necesita su propio rótulo.
            tr.innerHTML =
                '<td data-label="Usuario"><code>' + u.usuario + '</code></td>' +
                '<td data-label="Correo">' + (u.email || '-') + '</td>' +
                '<td data-label="Nombre">' + u.nombre + '</td>' +
                '<td data-label="Rol"><span class="rol-badge ' + r.css + '">' + r.text + '</span></td>' +
                '<td data-label="Estado"><span class="estado-badge ' + u.estado + '">' + (u.estado === 'activo' ? 'Activo' : 'Inactivo') + '</span></td>' +
                '<td data-label="Acciones">' +
                    '<div class="acciones-td">' +
                        '<button class="btn-icono btn-toggle-user" data-id="' + u.id + '" data-rol="' + u.rol + '" data-estado="' + u.estado + '" title="Cambiar estado"><i class="fa-solid fa-toggle-on"></i></button>' +
                        '<button class="btn-icono btn-eliminar-icon btn-delete-user" data-id="' + u.id + '" data-rol="' + u.rol + '" data-nombre="' + u.usuario + '" title="Eliminar"><i class="fa-solid fa-trash"></i></button>' +
                    '</div>' +
                '</td>';
            tbody.appendChild(tr);
        }

        tbody.querySelectorAll('.btn-delete-user').forEach(function (btn) {
            btn.addEventListener('click', async function () {
                var uid = btn.dataset.id;
                var urol = btn.dataset.rol;
                var uname = btn.dataset.nombre;
                if (confirm('Eliminar al usuario "' + uname + '"? Esta acción no se puede deshacer.')) {
                    await AuthDB.removeUser(uid, urol);
                    mostrarToast('Usuario "' + uname + '" eliminado.');
                    cargarUsuarios();
                }
            });
        });

        tbody.querySelectorAll('.btn-toggle-user').forEach(function (btn) {
            btn.addEventListener('click', async function () {
                var uid = btn.dataset.id;
                var urol = btn.dataset.rol;
                var estadoActual = btn.dataset.estado;
                var nuevoEstado = (estadoActual === 'activo') ? 'inactivo' : 'activo';
                await AuthDB.toggleUser(uid, nuevoEstado, urol);
                mostrarToast('Estado actualizado a ' + nuevoEstado + '.');
                cargarUsuarios();
            });
        });
    }

    async function cargarUsuarios() {
        todosUsuarios = await AuthDB.getAllUsers();
        pintarUsuarios();
    }

    function mostrarToast(msg) {
        var toast = document.getElementById('adminToast');
        var toastMsg = document.getElementById('adminToastMsg');
        if (!toast || !toastMsg) return;
        toastMsg.textContent = msg;
        toast.classList.add('visible');
        setTimeout(function () { toast.classList.remove('visible'); }, 3000);
    }

})();