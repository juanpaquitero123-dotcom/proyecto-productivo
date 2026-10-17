<?php
/**
 * ══════════════════════════════════════════════════════
 *  LOGIN.PHP — Autenticación contra MySQL
 *  Verifica la contraseña con password_verify (bcrypt).
 * ══════════════════════════════════════════════════════
 */

require_once __DIR__ . '/config.php';

iniciarSesionSegura();

$entrada     = leerJsonPeticion();
$usuarioTxt  = isset($entrada['usuario'])  ? trim((string)$entrada['usuario']) : '';
$password    = isset($entrada['password']) ? (string)$entrada['password']       : '';
$rolEsperado = isset($entrada['rol'])      ? (string)$entrada['rol']            : '';

if ($usuarioTxt === '' || $password === '') {
    jsonResp(array('ok' => false, 'error' => 'Ingresa tu usuario y contraseña para continuar.'));
}

if (!rolValido($rolEsperado, array('estudiante', 'docente', 'padre', 'admin'))) {
    jsonResp(array('ok' => false, 'error' => 'Rol inválido.'));
}

try {
    // Buscar por nombre de usuario o correo electrónico en las 4 tablas por rol.
    // Cada SELECT aporta el rol literal correspondiente a la tabla consultada.
    $stmt = db()->prepare(
        'SELECT id, usuario, nombre, email, rol, estado, password_hash
         FROM (
             SELECT "admin"      AS rol, id, usuario, nombre, email, estado, password_hash FROM Administradores
             UNION ALL
             SELECT "docente"    AS rol, id, usuario, nombre, email, estado, password_hash FROM Docentes
             UNION ALL
             SELECT "estudiante" AS rol, id, usuario, nombre, email, estado, password_hash FROM Estudiantes
             UNION ALL
             SELECT "padre"      AS rol, id, usuario, nombre, email, estado, password_hash FROM Padres
         ) AS cuentas
         WHERE usuario = ? OR email = ?
         LIMIT 1'
    );
    $stmt->execute(array($usuarioTxt, $usuarioTxt));
    $user = $stmt->fetch();

    // Mensaje genérico para no revelar si el usuario existe o no
    if (!$user || !password_verify($password, $user['password_hash'])) {
        jsonResp(array('ok' => false, 'error' => 'Usuario o contraseña incorrectos.'));
    }

    if ($user['estado'] !== 'activo') {
        jsonResp(array(
            'ok'    => false,
            'error' => 'Esta cuenta está desactivada. Contacta al administrador.'
        ));
    }

    if ($user['rol'] !== $rolEsperado) {
        jsonResp(array(
            'ok'    => false,
            'error' => 'El rol seleccionado no coincide con este usuario. Este usuario es: ' . $user['rol'] . '.'
        ));
    }

    // Login correcto → renovar id de sesión y guardar datos mínimos
    session_regenerate_id(true);

    $recordar = !empty($entrada['recordar']);
    if ($recordar) {
        // "Recordarme": la cookie sobrevive al cierre del navegador (30 días).
        setcookie(session_name(), session_id(), array(
            'expires'  => time() + 2592000,
            'path'     => '/',
            'domain'   => '',
            'secure'   => (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off'),
            'httponly' => true,
            'samesite' => 'Lax'
        ));
    }

    $_SESSION['usuario_id']  = (int)$user['id'];
    $_SESSION['rol']         = $user['rol'];
    $_SESSION['ultimo_acceso'] = time();

    jsonResp(array(
        'ok' => true,
        'usuario' => array(
            'id'      => (int)$user['id'],
            'usuario' => $user['usuario'],
            'nombre'  => $user['nombre'],
            'rol'     => $user['rol']
        )
    ));
} catch (Exception $e) {
    jsonResp(array('ok' => false, 'error' => 'Error del servidor al procesar la solicitud.'));
}
