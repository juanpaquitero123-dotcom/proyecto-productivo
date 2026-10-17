<?php
/**
 * ══════════════════════════════════════════════════════
 *  SESION.PHP — Estado de la sesión y cierre de sesión
 *
 *  Acciones (JSON en el cuerpo de la petición):
 *    - estado (por defecto) → { ok: true|false, usuario: {...} }
 *    - logout               → destruye la sesión del servidor
 * ══════════════════════════════════════════════════════
 */

require_once __DIR__ . '/config.php';

iniciarSesionSegura();

$entrada = leerJsonPeticion();
$accion  = isset($entrada['accion']) ? (string)$entrada['accion'] : 'estado';

// ── Cerrar sesión ──
if ($accion === 'logout') {
    invalidarSesion();
    jsonResp(array('ok' => true));
}

// ── Mantener la sesión viva (latido del panel admin) ──
if ($accion === 'mantener') {
    if (empty($_SESSION['usuario_id'])) {
        jsonResp(array('ok' => false));
    }
    $_SESSION['ultimo_acceso'] = time();
    jsonResp(array('ok' => true));
}

// ── Consultar estado ──
if (empty($_SESSION['usuario_id'])) {
    jsonResp(array('ok' => false));
}

/**
 * Cierra la sesión en el servidor y borra su cookie.
 *
 * Si la sesión está cerrada (es lo normal aquí, para no tener el candado
 * bloqueado mientras se consulta la base) hay que volver a abrirla: con
 * $_SESSION ya vacío, session_destroy() no destruye nada y la sesión vieja
 * sobrevive, de modo que el visitante seguiría entrando como si nada.
 */
function invalidarSesion()
{
    if (session_status() === PHP_SESSION_NONE) {
        session_start();
    }

    $_SESSION = array();

    if (ini_get('session.use_cookies')) {
        $p = session_get_cookie_params();
        setcookie(session_name(), '', time() - 42000, $p['path'], $p['domain'], $p['secure'], $p['httponly']);
    }

    session_destroy();
}

$idUsuario = $_SESSION['usuario_id'];
$rolSesion = isset($_SESSION['rol']) ? (string)$_SESSION['rol'] : '';

// Se suelta el candado antes de tocar la base de datos para no bloquear
// otras peticiones del mismo usuario. Solo se vuelve a abrir en el caso
// raro en que haya que invalidar la sesión.
session_write_close();

try {
    // El usuario vive en la tabla de su propio rol
    $tabla = tablaRol($rolSesion);
    if ($tabla === null) {
        // Sesión con rol inválido → invalidarla
        invalidarSesion();
        jsonResp(array('ok' => false));
    }

    $stmt = db()->prepare(
        "SELECT id, usuario, nombre, '{$rolSesion}' AS rol FROM `{$tabla}` WHERE id = ? AND estado = ? LIMIT 1"
    );
    $stmt->execute(array($idUsuario, 'activo'));
    $user = $stmt->fetch();

    if (!$user) {
        // La cuenta ya no existe o fue desactivada → invalidar sesión
        invalidarSesion();
        jsonResp(array('ok' => false));
    }

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
    jsonResp(array('ok' => false, 'error' => 'Error del servidor al consultar la sesión.'));
}
