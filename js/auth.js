(function () {
    'use strict';

    var API_BASE = '../php';

    function llamarAPI(endpoint, datos, msLimite) {
        if (endpoint === undefined || endpoint === null) {
            endpoint = '';
        }
        var url = endpoint;
        if (url.indexOf('http://') !== 0 && url.indexOf('https://') !== 0) {
            if (url.charAt(0) === '/') {
                // mantener absoluto
            } else {
                url = API_BASE + '/' + url;
            }
        }
        return llamadaGenerica(url, 'POST', datos, msLimite);
    }

    function llamadaGenerica(url, metodo, datos, msLimite) {
        var opciones = {
            method: metodo,
            headers: { 'Content-Type': 'application/json' },
            credentials: 'same-origin'
        };

        if (datos !== undefined && datos !== null) {
            opciones.body = JSON.stringify(datos);
        }

        var controlador = null;
        var promesaFetch;
        if (msLimite && msLimite > 0) {
            controlador = new AbortController();
            var t = setTimeout(function () {
                controlador.abort();
            }, msLimite);
            opciones.signal = controlador.signal;
            promesaFetch = fetch(url, opciones).finally(function () {
                clearTimeout(t);
            });
        } else {
            promesaFetch = fetch(url, opciones);
        }

        return promesaFetch
            .then(function (r) {
                return r.json().catch(function () {
                    return { ok: false, error: 'Respuesta no válida del servidor.' };
                });
            })
            .catch(function (e) {
                if (e && e.name === 'AbortError') {
                    return { ok: false, error: 'Tiempo de espera agotado al conectar con el servidor.' };
                }
                return { ok: false, error: 'No se pudo conectar con el servidor.' };
            });
    }

    function login(usuario, password, rol) {
        return llamarAPI('login.php', {
            usuario: usuario,
            password: password,
            rol: rol
        }, 10000);
    }

    function cerrarSesion() {
        return llamarAPI('sesion.php', { accion: 'logout' }, 5000);
    }

    function obtenerSesion() {
        return llamarAPI('sesion.php', { accion: 'estado' }, 5000);
    }

    function mantenerSesion() {
        return llamarAPI('sesion.php', { accion: 'mantener' }, 5000);
    }

    async function obtenerTodosUsuarios() {
        var r = await llamarAPI('usuarios.php', { accion: 'listar' }, 10000);
        if (r && r.ok && Array.isArray(r.usuarios)) {
            return r.usuarios;
        }
        throw new Error((r && r.error) || 'No se pudo cargar la lista de usuarios.');
    }

    function agregarUsuario(datos) {
        datos.accion = 'crear';
        return llamarAPI('usuarios.php', datos, 10000);
    }

    function crearUsuarioAdmin(datos) {
        datos.accion = 'crear_admin';
        return llamarAPI('usuarios.php', datos, 10000);
    }

    function eliminarUsuario(id) {
        return llamarAPI('usuarios.php', { accion: 'eliminar', id: id }, 10000);
    }

    function cambiarEstado(id, estado) {
        return llamarAPI('usuarios.php', { accion: 'estado', id: id, estado: estado }, 10000);
    }

    function apiContenido(accion, datos) {
        if (datos === undefined) datos = {};
        datos.accion = accion;
        return llamarAPI('contenido_admin.php', datos, 12000);
    }

    function leerSecciones(pagina) {
        return llamarAPI('secciones.php', { accion: 'leer', pagina: pagina }, 10000);
    }

    function guardarSeccion(datos) {
        if (datos === undefined) datos = {};
        datos.accion = 'guardar';
        return llamarAPI('secciones.php', datos, 10000);
    }

    function subirImagenes(seccion, elementoId, archivos) {
        return new Promise(function (resolver) {
            if (!archivos || !archivos.length) {
                resolver({ ok: true, subidas: 0 });
                return;
            }

            var formData = new FormData();
            formData.append('seccion', seccion);
            formData.append('elemento_id', elementoId);
            for (var i = 0; i < archivos.length; i++) {
                formData.append('imagenes[]', archivos[i]);
            }

            var opciones = {
                method: 'POST',
                credentials: 'same-origin',
                body: formData
            };

            fetch(API_BASE + '/imagenes.php', opciones)
                .then(function (r) {
                    return r.json().catch(function () {
                        return { ok: false, error: 'Respuesta no válida del servidor.' };
                    });
                })
                .then(function (res) {
                    resolver(res);
                })
                .catch(function () {
                    resolver({ ok: false, error: 'No se pudo conectar con el servidor.' });
                });
        });
    }

    function eliminarImagen(id) {
        return llamarAPI('imagenes.php', { accion: 'eliminar', id: id }, 10000);
    }

    function subirDocumento(seccion, archivos) {
        return new Promise(function (resolver) {
            if (!archivos || !archivos.length) {
                resolver({ ok: true, subidos: 0 });
                return;
            }
            var formData = new FormData();
            formData.append('seccion', seccion);
            for (var i = 0; i < archivos.length; i++) {
                formData.append('documento', archivos[i]);
            }
            var opciones = {
                method: 'POST',
                credentials: 'same-origin',
                body: formData
            };
            fetch(API_BASE + '/documentos.php', opciones)
                .then(function (r) {
                    return r.json().catch(function () {
                        return { ok: false, error: 'Respuesta no válida del servidor.' };
                    });
                })
                .then(function (res) {
                    resolver(res);
                })
                .catch(function () {
                    resolver({ ok: false, error: 'No se pudo conectar con el servidor.' });
                });
        });
    }

    function eliminarDocumento(id) {
        return llamarAPI('documentos.php', { accion: 'eliminar', id: id }, 10000);
    }

    function imagenRuta(ruta) {
        if (!ruta) return '';
        if (ruta.indexOf('http://') === 0 || ruta.indexOf('https://') === 0) return ruta;
        if (ruta.charAt(0) === '/') return ruta;
        if (ruta.indexOf('../') === 0) return ruta;
        return '../uploads/' + ruta.replace(/\\/g, '/');
    }

    window.AuthDB = {
        login: login,
        logout: cerrarSesion,
        getSesion: obtenerSesion,
        mantenerSesion: mantenerSesion,
        getAllUsers: obtenerTodosUsuarios,
        addUser: agregarUsuario,
        crearUsuarioAdmin: crearUsuarioAdmin,
        removeUser: eliminarUsuario,
        toggleUser: cambiarEstado,
        apiContenido: apiContenido,
        leerSecciones: leerSecciones,
        guardarSeccion: guardarSeccion,
        subirImagenes: subirImagenes,
        eliminarImagen: eliminarImagen,
        subirDocumento: subirDocumento,
        eliminarDocumento: eliminarDocumento,
        imagenRuta: imagenRuta,
        llamarAPI: llamarAPI
    };
})();