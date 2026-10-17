<?php
/**
 * ══════════════════════════════════════════════════════
 *  DIAGNOSTICO_SESION.PHP — ¿Llega la cookie de sesión?
 *
 *  Úsalo así:
 *   1. Inicia sesión en login.html normalmente.
 *   2. Abre esta página INMEDIATAMENTE en la misma pestaña.
 *   3. Muestra si el navegador envía la cookie y qué hay en $_SESSION.
 * ══════════════════════════════════════════════════════
 */

require_once __DIR__ . '/config.php';

header('Content-Type: text/html; charset=utf-8');

iniciarSesionSegura();

function linea($titulo, $valor)
{
    echo '<li style="margin:10px 0;"><strong>' . htmlspecialchars($titulo) . ':</strong> '
       . '<code style="background:#0b1220;padding:4px 8px;border-radius:6px;display:inline-block;margin-top:4px;color:#93c5fd;">'
       . htmlspecialchars($valor)
       . '</code></li>';
}

echo '<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><title>Diagnóstico de sesión</title></head>'
   . '<body style="font-family:Segoe UI,Arial,sans-serif;background:#111827;color:#e5e7eb;padding:40px;">'
   . '<div style="max-width:800px;margin:auto;background:#1f2937;border-radius:14px;padding:32px;">'
   . '<h1 style="color:#38bdf8;margin-top:0;">Diagnóstico de sesión</h1>'
   . '<ul style="list-style:none;padding-left:0;line-height:1.5;">';

linea('Cookies que enviaste desde el navegador', implode(', ', array_keys($_COOKIE)) ?: '(NINGUNA — el navegador no está enviando cookies)');
linea('¿Está la cookie ' . session_name() . '?', isset($_COOKIE[session_name()]) ? 'SÍ' : 'NO');
linea('ID de sesión en el servidor', session_id() !== '' ? session_id() : '(vacío)');
linea('Estado de la sesión', session_status() === PHP_SESSION_ACTIVE ? 'ACTIVA' : 'INACTIVA');
linea('session.save_path', (string)ini_get('session.save_path') ?: '(vacío, usa el temporal del sistema)');
linea('Contenido de $_SESSION', json_encode($_SESSION));
linea('¿Sesión iniciada con usuario?', isset($_SESSION['usuario_id']) ? 'SÍ, usuario_id=' . $_SESSION['usuario_id'] : 'NO — aquí está el problema');

echo '</ul>'
   . '<p style="color:#94a3b8;font-size:13px;">Si dice "(NINGUNA)" o "NO" en las dos primeras líneas, '
   . 'el navegador está bloqueando o borrando la cookie de sesión.</p>'
   . '</div></body></html>';
