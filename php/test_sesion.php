<?php
/**
 * ══════════════════════════════════════════════════════
 *  TEST_SESION.PHP — Prueba de persistencia de sesión
 *
 *  Paso 1:  test_sesion.php?paso=1   (escribe un valor)
 *  Paso 2:  test_sesion.php?paso=2   (lo lee en OTRA petición)
 *
 *  Si el paso 2 muestra el valor 42, las sesiones funcionan.
 * ══════════════════════════════════════════════════════
 */

require_once __DIR__ . '/config.php';

header('Content-Type: text/html; charset=utf-8');

iniciarSesionSegura();

$paso = isset($_GET['paso']) ? $_GET['paso'] : '1';

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

echo '<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><title>Prueba de sesión</title></head>'
   . '<body style="font-family:Segoe UI,Arial,sans-serif;background:#111827;color:#e5e7eb;padding:40px;">'
   . '<div style="max-width:800px;margin:auto;background:#1f2937;border-radius:14px;padding:32px;">'
   . '<h1 style="color:#38bdf8;margin-top:0;">Prueba de sesión PHP</h1>'
   . '<ul style="list-style:none;padding-left:0;line-height:1.5;">';

linea(true, 'ID de sesión actual', session_id() !== '' ? session_id() : '(vacío)');
linea(true, 'Estado de la sesión', session_status() === PHP_SESSION_ACTIVE ? 'ACTIVA' : 'INACTIVA');
linea(true, 'Ruta de guardado', session_save_path());
linea(true, 'Cookie que usa el navegador', session_name());

if ($paso === '1') {
    $_SESSION['prueba_contador'] = 42;

    linea(true, 'PASO 1 completado: escribí el valor 42 en la sesión');

    echo '</ul><p><a href="?paso=2" '
       . 'style="background:#38bdf8;color:#0f172a;padding:10px 18px;border-radius:8px;text-decoration:none;font-weight:bold;">'
       . 'Continuar al PASO 2 →</a></p>';
} else {
    $valor = isset($_SESSION['prueba_contador']) ? $_SESSION['prueba_contador'] : null;

    if ($valor === 42) {
        linea(true, 'PASO 2: la sesión SÍ persiste entre páginas (valor leído: 42)');
        echo '</ul><p style="color:#22c55e;">Las sesiones funcionan correctamente ✔</p>';
    } else {
        linea(false, 'PASO 2: la sesión NO se mantiene entre páginas', 'Valor leído: ' . var_export($valor, true));
        echo '</ul><p style="color:#f87171;">Las sesiones se pierden: revisa la ruta de guardado mostrada arriba.</p>';
    }

    echo '<p><a href="?paso=1">Reiniciar prueba</a></p>';
}

echo '</div></body></html>';
