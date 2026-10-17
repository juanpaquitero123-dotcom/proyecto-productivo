<?php
/**
 * ══════════════════════════════════════════════════════
 *  AGENDA.PHP — Agenda institucional interna
 *
 *  Guarda reuniones, recordatorios y actividades internas de
 *  la institución. Solo es visible para docentes y
 *  administrativos (nunca para estudiantes ni padres).
 *
 *  Acciones (JSON en el cuerpo de la petición):
 *    - listar   → (admin/docente) agenda activa, con filtros opcionales
 *                 { desde: 'YYYY-MM-DD', hasta: 'YYYY-MM-DD', tipo }
 *    - guardar  → (admin) crea o actualiza una entrada
 *                 { id?, titulo, descripcion, fecha, hora_inicio, hora_fin,
 *                   lugar, tipo }
 *    - eliminar → (admin) desactiva una entrada { id }
 * ══════════════════════════════════════════════════════
 */

require_once __DIR__ . '/config.php';

iniciarSesionSegura();

/**
 * Tipos de entrada permitidos (deben coincidir con el ENUM de la tabla).
 */
function tiposAgenda()
{
    return array('evento', 'reunion', 'recordatorio', 'academico');
}

/**
 * Exige una sesión activa de administrador o docente y devuelve
 * { id, rol, nombre } del usuario que la tiene. Si no hay sesión válida
 * responde con JSON y termina el script.
 *
 * @return array
 */
function exigirStaffAgenda()
{
    if (empty($_SESSION['usuario_id'])) {
        jsonResp(array('ok' => false, 'error' => 'Debes iniciar sesión.'));
    }

    $idSesion  = (int)$_SESSION['usuario_id'];
    $rolSesion = isset($_SESSION['rol']) ? (string)$_SESSION['rol'] : '';

    if (!in_array($rolSesion, array('admin', 'docente'), true)) {
        jsonResp(array('ok' => false, 'error' => 'Solo docentes y administrativos pueden ver la agenda.'));
    }

    // Liberar el candado de sesión antes de tocar la base de datos
    session_write_close();

    $tabla = tablaRol($rolSesion);
    $stmt  = db()->prepare("SELECT id, nombre, estado FROM `{$tabla}` WHERE id = ? LIMIT 1");
    $stmt->execute(array($idSesion));
    $fila = $stmt->fetch();

    if (!$fila || $fila['estado'] !== 'activo') {
        jsonResp(array('ok' => false, 'error' => 'Tu sesión ya no es válida. Vuelve a iniciar sesión.'));
    }

    return array(
        'id'     => (int)$fila['id'],
        'rol'    => $rolSesion,
        'nombre' => (string)$fila['nombre'],
    );
}

/**
 * Normaliza una hora "H:MM" o "HH:MM" a "HH:MM", o null si no es válida.
 */
function horaAgendaValida($hora)
{
    $hora = trim((string)$hora);
    if ($hora === '') {
        return null;
    }
    if (!preg_match('/^([0-9]{1,2}):([0-9]{2})$/', $hora, $m)) {
        return false;
    }
    $h = (int)$m[1];
    $min = (int)$m[2];
    if ($h > 23 || $min > 59) {
        return false;
    }
    return sprintf('%02d:%02d', $h, $min);
}

/**
 * Comprueba que un texto sea una fecha real en formato YYYY-MM-DD.
 */
function fechaAgendaValida($fecha)
{
    $fecha = trim((string)$fecha);
    if (!preg_match('/^(\d{4})-(\d{2})-(\d{2})$/', $fecha, $m)) {
        return false;
    }
    return checkdate((int)$m[2], (int)$m[3], (int)$m[1]);
}

$entrada = leerJsonPeticion();
$accion  = isset($entrada['accion']) ? (string)$entrada['accion'] : 'listar';

try {
    $pdo = db();

    /* ==================================================
       1. LISTAR — agenda activa (admin y docente)
    ================================================== */
    if ($accion === 'listar') {
        exigirStaffAgenda();

        $condiciones = array('activo = "activo"');
        $parametros  = array();

        if (!empty($entrada['desde']) && fechaAgendaValida($entrada['desde'])) {
            $condiciones[] = 'fecha >= ?';
            $parametros[]  = (string)$entrada['desde'];
        }
        if (!empty($entrada['hasta']) && fechaAgendaValida($entrada['hasta'])) {
            $condiciones[] = 'fecha <= ?';
            $parametros[]  = (string)$entrada['hasta'];
        }
        if (!empty($entrada['tipo']) && in_array($entrada['tipo'], tiposAgenda(), true)) {
            $condiciones[] = 'tipo = ?';
            $parametros[]  = (string)$entrada['tipo'];
        }

        $stmt = $pdo->prepare(
            'SELECT id, titulo, descripcion, fecha, hora_inicio, hora_fin, lugar,
                    tipo, autor_id, autor_rol, autor_nombre
             FROM Agenda
             WHERE ' . implode(' AND ', $condiciones) . '
             ORDER BY fecha ASC, hora_inicio ASC, id ASC'
        );
        $stmt->execute($parametros);
        $eventos = $stmt->fetchAll();

        foreach ($eventos as &$e) {
            $e['id']       = (int)$e['id'];
            $e['autor_id'] = $e['autor_id'] !== null ? (int)$e['autor_id'] : null;
        }
        unset($e);

        jsonResp(array('ok' => true, 'eventos' => $eventos));
    }

    /* ==================================================
       2. GUARDAR — crear o actualizar una entrada (solo admin)
    ================================================== */
    if ($accion === 'guardar') {
        $staff = exigirStaffAgenda();
        if ($staff['rol'] !== 'admin') {
            jsonResp(array('ok' => false, 'error' => 'Solo un administrador puede editar la agenda.'));
        }

        $titulo = isset($entrada['titulo']) ? trim((string)$entrada['titulo']) : '';
        if ($titulo === '' || mb_strlen($titulo) > 160) {
            jsonResp(array('ok' => false, 'error' => 'El título es obligatorio (máximo 160 caracteres).'));
        }

        $fecha = isset($entrada['fecha']) ? trim((string)$entrada['fecha']) : '';
        if (!fechaAgendaValida($fecha)) {
            jsonResp(array('ok' => false, 'error' => 'La fecha no es válida.'));
        }

        $tipo = isset($entrada['tipo']) ? (string)$entrada['tipo'] : 'evento';
        if (!in_array($tipo, tiposAgenda(), true)) {
            jsonResp(array('ok' => false, 'error' => 'El tipo de entrada no es válido.'));
        }

        $horaInicio = horaAgendaValida(isset($entrada['hora_inicio']) ? $entrada['hora_inicio'] : '');
        if ($horaInicio === false) {
            jsonResp(array('ok' => false, 'error' => 'La hora de inicio no es válida.'));
        }
        $horaFin = horaAgendaValida(isset($entrada['hora_fin']) ? $entrada['hora_fin'] : '');
        if ($horaFin === false) {
            jsonResp(array('ok' => false, 'error' => 'La hora de fin no es válida.'));
        }

        $descripcion = isset($entrada['descripcion']) ? trim((string)$entrada['descripcion']) : '';
        $lugar       = isset($entrada['lugar'])       ? trim((string)$entrada['lugar'])       : '';
        $id          = isset($entrada['id'])          ? (int)$entrada['id']                    : 0;

        if ($id > 0) {
            // Actualizar una entrada existente
            $stmt = $pdo->prepare('SELECT id FROM Agenda WHERE id = ? LIMIT 1');
            $stmt->execute(array($id));
            if (!$stmt->fetch()) {
                jsonResp(array('ok' => false, 'error' => 'La entrada que intentas editar no existe.'));
            }

            $pdo->prepare(
                'UPDATE Agenda
                 SET titulo = ?, descripcion = ?, fecha = ?, hora_inicio = ?, hora_fin = ?,
                     lugar = ?, tipo = ?
                 WHERE id = ?'
            )->execute(array(
                $titulo,
                $descripcion !== '' ? $descripcion : null,
                $fecha,
                $horaInicio,
                $horaFin,
                $lugar !== '' ? $lugar : null,
                $tipo,
                $id
            ));

            jsonResp(array('ok' => true, 'id' => $id));
        }

        // Crear una entrada nueva
        $pdo->prepare(
            'INSERT INTO Agenda
                (titulo, descripcion, fecha, hora_inicio, hora_fin, lugar, tipo,
                 autor_id, autor_rol, autor_nombre, fecha_creacion, activo)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), "activo")'
        )->execute(array(
            $titulo,
            $descripcion !== '' ? $descripcion : null,
            $fecha,
            $horaInicio,
            $horaFin,
            $lugar !== '' ? $lugar : null,
            $tipo,
            $staff['id'],
            $staff['rol'],
            $staff['nombre']
        ));

        jsonResp(array('ok' => true, 'id' => (int)$pdo->lastInsertId()));
    }

    /* ==================================================
       3. ELIMINAR — desactiva una entrada (solo admin)
    ================================================== */
    if ($accion === 'eliminar') {
        $staff = exigirStaffAgenda();
        if ($staff['rol'] !== 'admin') {
            jsonResp(array('ok' => false, 'error' => 'Solo un administrador puede eliminar de la agenda.'));
        }

        $id = isset($entrada['id']) ? (int)$entrada['id'] : 0;
        if ($id <= 0) {
            jsonResp(array('ok' => false, 'error' => 'Entrada inválida.'));
        }

        $stmt = $pdo->prepare('UPDATE Agenda SET activo = "inactivo" WHERE id = ?');
        $stmt->execute(array($id));

        if ($stmt->rowCount() === 0) {
            jsonResp(array('ok' => false, 'error' => 'La entrada no existe o ya estaba eliminada.'));
        }

        jsonResp(array('ok' => true));
    }

    jsonResp(array('ok' => false, 'error' => 'Acción desconocida.'));
} catch (Exception $e) {
    jsonResp(array('ok' => false, 'error' => 'Error del servidor al procesar la solicitud.'));
}
