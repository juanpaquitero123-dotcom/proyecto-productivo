<?php
/**
 * ══════════════════════════════════════════════════════
 *  USUARIOS.PHP — Gestión de usuarios (solo administradores)
 *
 *  La base de datos está SEPARADA POR ROL: cada cuenta vive en
 *  su propia tabla (Administradores, Docentes, Estudiantes, Padres).
 *
 *  Acciones (JSON en el cuerpo de la petición):
 *    - listar   → devuelve todos los usuarios (sin hashes)
 *    - crear    → crea un usuario (permite rol admin) · contraseña encriptada
 *    - eliminar → elimina un usuario por id (se recomienda enviar también "rol")
 *    - estado   → activa/desactiva un usuario (se recomienda enviar también "rol")
 * ══════════════════════════════════════════════════════
 */

require_once __DIR__ . '/config.php';

iniciarSesionSegura();

// La identidad se copia ANTES de llamar a exigirAdmin(), que cierra la
// sesión con session_write_close() para no bloquear la base de datos. A
// partir de ahí $_SESSION está vacío, y comparar contra él nunca coincidiría:
// el admin podría borrarse o desactivarse a sí mismo sin que el código lo
// detectara.
$idSesionActual  = isset($_SESSION['usuario_id']) ? (int)$_SESSION['usuario_id'] : 0;
$rolSesionActual = isset($_SESSION['rol']) ? (string)$_SESSION['rol'] : '';

// exigirAdmin() está definida en config.php

/**
 * Resuelve en qué tabla opera una petición de eliminar/cambiar estado.
 * Si llega un "rol" válido se usa esa tabla; si no, se busca el id
 * recorriendo las 4 tablas (compatibilidad con clientes antiguos).
 *
 * @return string|null Nombre de la tabla, o null si no se encuentra.
 */
function resolverTablaDestino($pdo, $id, $rol)
{
    $tabla = tablaRol($rol);
    if ($tabla !== null) {
        return $tabla;
    }
    return buscarTablaPorId($pdo, $id);
}

$entrada = leerJsonPeticion();
$accion  = isset($entrada['accion']) ? (string)$entrada['accion'] : 'listar';

try {
    $pdo = db();

    // ── Listar usuarios (todas las tablas por rol) ──
    if ($accion === 'listar') {
        exigirAdmin();

        $stmt = $pdo->query(
            'SELECT id, usuario, nombre, email, rol, estado, fecha_creacion
             FROM (
                 SELECT "admin"      AS rol, id, usuario, nombre, email, estado, fecha_creacion FROM Administradores
                 UNION ALL
                 SELECT "docente"    AS rol, id, usuario, nombre, email, estado, fecha_creacion FROM Docentes
                 UNION ALL
                 SELECT "estudiante" AS rol, id, usuario, nombre, email, estado, fecha_creacion FROM Estudiantes
                 UNION ALL
                 SELECT "padre"      AS rol, id, usuario, nombre, email, estado, fecha_creacion FROM Padres
             ) AS cuentas
             ORDER BY id ASC'
        );

        $usuarios = array();
        while ($fila = $stmt->fetch()) {
            $usuarios[] = array(
                'id'            => (int)$fila['id'],
                'usuario'       => $fila['usuario'],
                'nombre'        => $fila['nombre'],
                'email'         => $fila['email'] !== null ? $fila['email'] : '',
                'rol'           => $fila['rol'],
                'estado'        => $fila['estado'],
                'fechaCreacion' => $fila['fecha_creacion']
            );
        }

        jsonResp(array('ok' => true, 'usuarios' => $usuarios));
    }

    // A partir de aquí todo requiere administrador
    exigirAdmin();

    // ── Crear usuario (desde el panel admin, permite cualquier rol) ──
    if ($accion === 'crear') {
        $datos    = isset($entrada['datos']) && is_array($entrada['datos']) ? $entrada['datos'] : array();
        $nombre   = isset($datos['nombre'])   ? trim((string)$datos['nombre'])   : '';
        $usuario  = isset($datos['usuario'])  ? trim((string)$datos['usuario'])  : '';
        $email    = isset($datos['email'])    ? trim((string)$datos['email'])    : '';
        $password = isset($datos['password']) ? (string)$datos['password']       : '';
        $rol      = isset($datos['rol'])      ? (string)$datos['rol']            : '';

        if ($nombre === '' || $usuario === '' || $password === '') {
            jsonResp(array('ok' => false, 'error' => 'Nombre, usuario y contraseña son obligatorios.'));
        }

        if (!rolValido($rol, array('estudiante', 'docente', 'padre', 'admin'))) {
            jsonResp(array('ok' => false, 'error' => 'Rol inválido.'));
        }

        if ($email !== '' && !filter_var($email, FILTER_VALIDATE_EMAIL)) {
            jsonResp(array('ok' => false, 'error' => 'El correo electrónico no es válido.'));
        }

        if (strlen($password) < 6) {
            jsonResp(array('ok' => false, 'error' => 'La contraseña debe tener al menos 6 caracteres.'));
        }

        // El usuario no debe existir en NINGUNA de las tablas por rol
        if (!usuarioUnico($pdo, $usuario)) {
            jsonResp(array('ok' => false, 'error' => 'El nombre de usuario ya existe.'));
        }

        if (!emailUnico($pdo, $email)) {
            jsonResp(array('ok' => false, 'error' => 'El correo electrónico ya está registrado.'));
        }

        $hash  = password_hash($password, PASSWORD_BCRYPT);
        $tabla = tablaRol($rol);

        $stmt = $pdo->prepare(
            'INSERT INTO `' . $tabla . '` (usuario, nombre, email, estado, fecha_creacion, password_hash)
             VALUES (?, ?, ?, ?, ?, ?)'
        );
        $stmt->execute(array(
            $usuario,
            $nombre,
            $email !== '' ? $email : null,
            'activo',
            date('Y-m-d'),
            $hash
        ));

        jsonResp(array('ok' => true, 'id' => (int)$pdo->lastInsertId()));
    }

    // ── Eliminar usuario ──
    if ($accion === 'eliminar') {
        $id  = isset($entrada['id'])  ? (int)$entrada['id']  : 0;
        $rol = isset($entrada['rol']) ? (string)$entrada['rol'] : '';

        if ($id <= 0) {
            jsonResp(array('ok' => false, 'error' => 'Usuario inválido.'));
        }

        $tabla = resolverTablaDestino($pdo, $id, $rol);
        if ($tabla === null) {
            jsonResp(array('ok' => false, 'error' => 'Usuario no encontrado.'));
        }

        if ($rol !== '' && $rol === $rolSesionActual && $id === $idSesionActual) {
            jsonResp(array('ok' => false, 'error' => 'No puedes eliminar tu propia cuenta.'));
        }

        $stmt = $pdo->prepare('DELETE FROM `' . $tabla . '` WHERE id = ?');
        $stmt->execute(array($id));

        jsonResp(array('ok' => true));
    }

    // ── Cambiar estado (activo / inactivo) ──
    if ($accion === 'estado') {
        $id     = isset($entrada['id'])     ? (int)$entrada['id']     : 0;
        $estado = isset($entrada['estado']) ? (string)$entrada['estado'] : '';
        $rol    = isset($entrada['rol'])    ? (string)$entrada['rol'] : '';

        if ($id <= 0 || !in_array($estado, array('activo', 'inactivo'), true)) {
            jsonResp(array('ok' => false, 'error' => 'Datos inválidos.'));
        }

        $tabla = resolverTablaDestino($pdo, $id, $rol);
        if ($tabla === null) {
            jsonResp(array('ok' => false, 'error' => 'Usuario no encontrado.'));
        }

        if ($rol !== '' && $rol === $rolSesionActual && $id === $idSesionActual) {
            jsonResp(array('ok' => false, 'error' => 'No puedes cambiar el estado de tu propia cuenta.'));
        }

        $stmt = $pdo->prepare('UPDATE `' . $tabla . '` SET estado = ? WHERE id = ?');
        $stmt->execute(array($estado, $id));

        jsonResp(array('ok' => true));
    }

    jsonResp(array('ok' => false, 'error' => 'Acción desconocida.'));
} catch (Exception $e) {
    jsonResp(array('ok' => false, 'error' => 'Error del servidor al procesar la solicitud.'));
}