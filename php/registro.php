<?php
/**
 * ══════════════════════════════════════════════════════
 *  REGISTRO.PHP — Creación pública de cuentas
 *  Guarda la contraseña ENCRIPTADA con password_hash (bcrypt).
 *  Solo permite roles: estudiante, docente y padre.
 * ══════════════════════════════════════════════════════
 */

require_once __DIR__ . '/config.php';

iniciarSesionSegura();

$entrada = leerJsonPeticion();

$nombre   = isset($entrada['nombre'])   ? trim((string)$entrada['nombre'])   : '';
$usuario  = isset($entrada['usuario'])  ? trim((string)$entrada['usuario'])  : '';
$email    = isset($entrada['email'])    ? trim((string)$entrada['email'])    : '';
$password = isset($entrada['password']) ? (string)$entrada['password']       : '';
$rol      = isset($entrada['rol'])      ? (string)$entrada['rol']            : '';

if ($nombre === '' || $usuario === '' || $email === '' || $password === '') {
    jsonResp(array('ok' => false, 'error' => 'Todos los campos son obligatorios.'));
}

if (mb_strlen($nombre) < 3) {
    jsonResp(array('ok' => false, 'error' => 'El nombre completo es demasiado corto.'));
}

if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    jsonResp(array('ok' => false, 'error' => 'El correo electrónico no es válido.'));
}

// El registro público nunca puede crear administradores
if (!rolValido($rol, array('estudiante', 'docente', 'padre'))) {
    jsonResp(array(
        'ok'    => false,
        'error' => 'Las cuentas de administrador solo son creadas por un administrador existente.'
    ));
}

if (strlen($password) < 6) {
    jsonResp(array('ok' => false, 'error' => 'La contraseña debe tener al menos 6 caracteres.'));
}

try {
    $pdo = db();

    // La cuenta vive en la tabla correspondiente a su rol
    $tabla = tablaRol($rol);
    if ($tabla === null) {
        jsonResp(array('ok' => false, 'error' => 'Rol inválido.'));
    }

    // Verificar que el usuario no exista en NINGUNA de las tablas por rol
    if (!usuarioUnico($pdo, $usuario)) {
        jsonResp(array('ok' => false, 'error' => 'El nombre de usuario ya existe.'));
    }

    // Verificar que el correo no esté registrado en NINGUNA de las tablas
    if (!emailUnico($pdo, $email)) {
        jsonResp(array('ok' => false, 'error' => 'El correo electrónico ya está registrado.'));
    }

    // Encriptar contraseña con bcrypt antes de guardarla
    $hash = password_hash($password, PASSWORD_BCRYPT);

    $stmt = $pdo->prepare(
        'INSERT INTO `' . $tabla . '` (usuario, nombre, email, estado, fecha_creacion, password_hash)
         VALUES (?, ?, ?, ?, ?, ?)'
    );
    $stmt->execute(array(
        $usuario,
        $nombre,
        $email,
        'activo',
        date('Y-m-d'),
        $hash
    ));

    jsonResp(array('ok' => true, 'id' => (int)$pdo->lastInsertId()));
} catch (Exception $e) {
    jsonResp(array('ok' => false, 'error' => 'Error del servidor al crear la cuenta.'));
}
