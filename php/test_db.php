<?php
/**
 * ══════════════════════════════════════════════════════
 *  TEST_DB.PHP — Diagnóstico de conexión a MySQL
 *  Abre en el navegador:
 *      http://localhost/Proyecto_Productivo2026/php/test_db.php
 * ══════════════════════════════════════════════════════
 */

require_once __DIR__ . '/config.php';

header('Content-Type: text/html; charset=utf-8');

function linea($ok, $titulo, $detalle = '')
{
    $color = $ok ? '#22c55e' : '#ef4444';
    echo '<li style="margin:10px 0;">'
       . '<span style="color:' . $color . ';font-weight:bold;">' . ($ok ? '[ OK ]' : '[FALLO]') . '</span> '
       . '<strong>' . htmlspecialchars($titulo) . '</strong>'
       . ($detalle !== '' ? '<br><code style="background:#0b1220;padding:4px 8px;border-radius:6px;display:inline-block;margin-top:4px;color:#fca5a5;">'
           . htmlspecialchars($detalle) . '</code>' : '')
       . '</li>';
}

echo '<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><title>Diagnóstico MySQL</title></head>'
   . '<body style="font-family:Segoe UI,Arial,sans-serif;background:#111827;color:#e5e7eb;padding:40px;">'
   . '<div style="max-width:800px;margin:auto;background:#1f2937;border-radius:14px;padding:32px;">'
   . '<h1 style="color:#38bdf8;margin-top:0;">Diagnóstico de conexión — <code>' . DB_NAME . '</code></h1>'
   . '<ul style="list-style:none;padding-left:0;line-height:1.5;">';

linea(true, 'Versión de PHP', PHP_VERSION);
linea(true, 'Versión del config.php', CONFIG_BUILD . ' — si no coincide con la última edición, Apache está sirviendo una copia en caché (reinicia Apache)');

linea(true, 'Rutas de my.ini revisadas', implode(' | ', array_map(function ($ruta) {
    return $ruta . (is_readable($ruta) ? ' [legible]' : ' [NO existe o ilegible]');
}, archivosMyIniXampp())));

$puertoYOrigen = puertoMySql();
linea(true, 'Puerto que usa el sitio', $puertoYOrigen[0]
    . ' (origen: ' . $puertoYOrigen[1] . (($puertoYOrigen[1] === 'defecto')
        ? ' — no se pudo leer mysql/bin/my.ini, se asumió 3306' : '') . ')');

if (extension_loaded('pdo_mysql')) {
    linea(true, 'Extensión pdo_mysql cargada');
} else {
    linea(false, 'Extensión pdo_mysql NO está cargada',
        'Actívala en C:\\xampp\\php\\php.ini quitando el ; de la línea: extension=pdo_mysql');
}

$pdoSinBD = null;
foreach (array_merge(array(DB_HOST), DB_HOST_ALTERNATIVOS) as $hostProbado) {
    try {
        $pdoSinBD = pdoConexion(false, $hostProbado);
        $version = $pdoSinBD->getAttribute(PDO::ATTR_SERVER_VERSION);
        linea(true, 'Conexión con MySQL vía ' . $hostProbado, 'Servidor MySQL versión ' . $version);
        break;
    } catch (PDOException $e) {
        $codigo = isset($e->errorInfo[1]) ? (int)$e->errorInfo[1] : 0;
        linea(false, 'Conexión con MySQL vía ' . $hostProbado . ' FALLÓ (código ' . $codigo . ')',
            pdoConexionDiagnostico($e, $hostProbado));
    }
}

if ($pdoSinBD !== null) {
    try {
        $bases = $pdoSinBD->query('SHOW DATABASES')->fetchAll(PDO::FETCH_COLUMN);
        linea(true, 'Bases de datos existentes en este servidor', implode(' | ', $bases));

        $existe = false;
        foreach ($bases as $b) {
            if (strcasecmp($b, DB_NAME) === 0) { $existe = true; break; }
        }

        if ($existe) {
            linea(true, 'La base de datos "' . DB_NAME . '" EXISTE');
        } else {
            linea(false, 'La base de datos "' . DB_NAME . '" NO existe',
                'Abre antes: http://localhost/Proyecto_Productivo2026/php/instalar_db.php');
        }
    } catch (PDOException $e) {
        linea(false, 'No se pudieron listar las bases de datos', $e->getMessage());
    }
}

// No se usa db() a propósito: si falla, db() responde JSON y termina el
// script, y esta página se quedaría a medio mostrar.
try {
    $pdoBd = pdoConectarProbando(true);
    linea(true, 'Conexión con la base "' . DB_NAME . '"', 'OK');

    // Las cuentas están repartidas en las 4 tablas por rol
    $total = 0;
    $faltan = array();
    foreach (rolesTablas() as $tabla) {
        try {
            $total += (int)$pdoBd->query("SELECT COUNT(*) FROM `{$tabla}`")->fetchColumn();
        } catch (PDOException $e) {
            $faltan[] = $tabla;
        }
    }

    if ($faltan) {
        linea(false, 'Faltan tablas: ' . implode(', ', $faltan),
            'Abre instalar_db.php para crearlas.');
    } else {
        linea(true, 'Tablas por rol accesibles', "$total usuario(s) registrados en total (Administradores, Docentes, Estudiantes, Padres)");
        linea(true, 'TODO CORRECTO. Ya puedes usar el login.');
    }
} catch (PDOException $e) {
    linea(false, 'No se pudo conectar con la base "' . DB_NAME . '"',
        pdoConexionDiagnostico($e));
}

echo '</ul></div></body></html>';
