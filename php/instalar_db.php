<?php
/**
 * ══════════════════════════════════════════════════════
 *  INSTALAR_DB.PHP — Instalador manual de la base de datos
 *
 *  NOTA: ya no es obligatorio ejecutarlo — la base de datos
 *  se crea sola la primera vez que alguien inicia sesión,
 *  y las instalaciones/migrations posteriores solo se ejecutan
 *  cuando cambia la versión del esquema (ESQUEMA_VERSION).
 *  Este archivo queda como alternativa para instalar/verificar
 *  manualmente. Ojo: abrirlo FUERZA una pasada completa del
 *  instalador aunque todo esté al día.
 *
 *      http://localhost/Proyecto_Productivo2026/php/instalar_db.php
 * ══════════════════════════════════════════════════════
 */

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/schema.php';

header('Content-Type: text/html; charset=utf-8');

function paso($ok, $texto)
{
    echo '<li style="margin:6px 0;">' . ($ok ? '✅' : '❌') . ' ' . $texto . '</li>';
}

echo '<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8">'
   . '<title>Instalador — IeSanFelixAlDia</title></head>'
   . '<body style="font-family:Segoe UI,Arial,sans-serif;background:#0f172a;color:#e2e8f0;padding:40px;">'
   . '<div style="max-width:760px;margin:auto;background:#1e293b;border-radius:14px;padding:32px;">'
   . '<h1 style="color:#38bdf8;margin-top:0;">Instalador de la base de datos <code>IeSanFelixAlDia</code></h1>'
   . '<ul style="line-height:1.6;">';

try {
    $pdo = pdoConectarProbando(false);
    paso(true, 'Conexión con MySQL establecida.');

    $insertados = instalarBaseDatos($pdo);

    paso(true, 'Base de datos y tablas por rol verificadas (Administradores, Docentes, Estudiantes, Padres).');
    paso(true, 'Tablas de contenido verificadas (InfoGeneral, Contacto, Slides, Eventos, Noticias).');
    paso(true, 'Contenido de ejemplo cargado para la página de inicio.');
    paso(true, 'Esquema marcado como instalado en la versión ' . ESQUEMA_VERSION . ' (no se volverá a migrar en cada página).');

    if ($insertados > 0) {
        paso(true, "Se insertaron {$insertados} usuarios de ejemplo con contraseñas encriptadas (bcrypt).");
    } else {
        paso(true, 'Las tablas ya contenían usuarios. No se duplicó nada.');
    }

    echo '</ul>';

    // ── Resumen de cuentas (las contraseñas se muestran solo aquí) ──
    echo '<h2 style="color:#38bdf8;">Cuentas disponibles</h2>';
    echo '<table border="1" cellpadding="8" cellspacing="0" style="border-collapse:collapse;width:100%;font-size:14px;background:#0f172a;">'
       . '<tr style="background:#334155;"><th>Usuario</th><th>Contraseña</th><th>Rol</th><th>Estado</th></tr>';
    foreach (usuariosSemilla() as $u) {
        echo '<tr>'
           . '<td><code>' . htmlspecialchars($u[0]) . '</code></td>'
           . '<td><code>' . htmlspecialchars($u[6]) . '</code></td>'
           . '<td>' . htmlspecialchars($u[3]) . '</td>'
           . '<td>' . htmlspecialchars($u[4]) . '</td>'
           . '</tr>';
    }
    echo '</table>';

    echo '<p style="margin-top:24px;"><a href="../html/login.html" '
       . 'style="background:#38bdf8;color:#0f172a;padding:10px 18px;border-radius:8px;text-decoration:none;font-weight:bold;">'
       . 'Ir a la página de login →</a></p>';
} catch (PDOException $e) {
    paso(false, 'Error: ' . htmlspecialchars($e->getMessage()));
    echo '</ul><p style="color:#f87171;">Verifica que MySQL esté activo en el Panel de Control de XAMPP.</p>';
}

echo '</div></body></html>';
