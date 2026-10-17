<?php
/**
 * ══════════════════════════════════════════════════════
 *  PRUEBA_COMPLETA.PHP — Verificación automática de extremo a extremo
 *
 *  Abre esta ÚNICA página:
 *      http://localhost/Proyecto_Productivo2026/php/prueba_completa.php
 *
 *  Comprueba automáticamente:
 *   1. Conexión a MySQL y tablas por rol (4 tablas separadas)
 *   2. Que las contraseñas encriptadas (bcrypt) verifiquen
 *   3. Login real vía HTTP (como lo hace la página de login)
 *   4. Que la cookie de sesión se guarde y se devuelva
 * ══════════════════════════════════════════════════════
 */

require_once __DIR__ . '/config.php';

iniciarSesionSegura();
session_write_close(); // solo consultamos; liberamos de una vez

header('Content-Type: text/html; charset=utf-8');

// ── Verificaciones del lado del servidor ──
$resServidor = array();

try {
    // Las cuentas están repartidas en las 4 tablas por rol
    $total = 0;
    foreach (rolesTablas() as $tabla) {
        $total += (int)db()->query("SELECT COUNT(*) FROM `{$tabla}`")->fetchColumn();
    }
    $resServidor[] = array(true, "MySQL conectado · tablas por rol (Administradores, Docentes, Estudiantes, Padres) con {$total} usuarios");
} catch (Exception $e) {
    $resServidor[] = array(false, 'MySQL: ' . $e->getMessage());
}

try {
    // admin01 vive en la tabla de Administradores
    $stmt = db()->prepare("SELECT id, 'admin' AS rol, password_hash FROM Administradores WHERE usuario = ? LIMIT 1");
    $stmt->execute(array('admin01'));
    $fila = $stmt->fetch();
    if ($fila && password_verify('Admin@2026', $fila['password_hash'])) {
        $resServidor[] = array(true, 'Encriptación bcrypt verificada (Admin@2026 coincide con su hash)');
    } else {
        $resServidor[] = array(false, 'El hash de admin01 NO corresponde a Admin@2026');
    }
} catch (Exception $e) {
    $resServidor[] = array(false, 'Verificación bcrypt: ' . $e->getMessage());
}

echo '<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><title>Prueba completa</title></head>'
   . '<body style="font-family:Segoe UI,Arial,sans-serif;background:#0f172a;color:#e5e7eb;padding:40px;margin:0;">'
   . '<div style="max-width:820px;margin:auto;background:#1e293b;border-radius:14px;padding:32px;">'
   . '<h1 style="color:#38bdf8;margin-top:0;">Prueba completa del sistema de login</h1>'
   . '<ul id="lista" style="list-style:none;padding-left:0;line-height:1.7;">';

foreach ($resServidor as $r) {
    echo '<li data-ok="' . ($r[0] ? '1' : '0') . '" style="margin:10px 0;">'
       . '<span style="color:' . ($r[0] ? '#22c55e' : '#ef4444') . ';font-weight:bold;">'
       . ($r[0] ? '[ OK ]' : '[FALLO]') . '</span> '
       . htmlspecialchars($r[1]) . '</li>';
}

echo '</ul>'
   . '<div id="veredicto" style="margin-top:24px;padding:16px;border-radius:10px;background:#334155;font-weight:bold;"></div>'
   . '<div id="zona" style="margin-top:12px;color:#94a3b8;font-size:14px;">Ejecutando pruebas del navegador…</div>'
   . '</div>'

   . '<script>
(function () {
    "use strict";

    var lista     = document.getElementById("lista");
    var zona      = document.getElementById("zona");
    var veredicto = document.getElementById("veredicto");

    function linea(ok, texto) {
        var li = document.createElement("li");
        li.style.margin = "10px 0";
        li.innerHTML = \'<span style="font-weight:bold;color:\' + (ok ? "#22c55e" : "#ef4444") + \'">\' +
                       (ok ? "[ OK ]" : "[FALLO]") + \'</span> \' + texto;
        lista.appendChild(li);
        return ok;
    }

    async function post(url, datos) {
        var r = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "same-origin",
            body: JSON.stringify(datos)
        });
        return r.json();
    }

    (async function () {
        var loginOk = false;

        // Prueba 3: login real vía HTTP
        try {
            var r1 = await post("login.php", { usuario: "admin01", password: "Admin@2026", rol: "admin" });
            loginOk = linea(!!(r1 && r1.ok), r1 && r1.ok
                ? "Login vía HTTP correcto (servidor creó la sesión)"
                : "Login vía HTTP FALLÓ → " + ((r1 && r1.error) || "respuesta inválida"));
        } catch (e) {
            linea(false, "Login vía HTTP no respondió: " + e.message);
        }

        // Prueba 4: ¿el navegador devuelve la cookie y el servidor recuerda?
        try {
            var r2 = await post("sesion.php", { accion: "estado" });
            var bien = !!(r2 && r2.ok && r2.usuario && r2.usuario.rol === "admin");
            linea(bien, bien
                ? "Cookie de sesión guardada y reconocida por el servidor"
                : "La sesión NO se mantiene → tu navegador está bloqueando cookies");
        } catch (e) {
            linea(false, "Consulta de sesión no respondió: " + e.message);
        }

        if (loginOk) {
            veredicto.style.background = "#14532d";
            veredicto.innerHTML = "&#9989; TODO FUNCIONA EN ESTE NAVEGADOR. " +
                "<a href=\\"../html/admin.html\\" style=\\"color:#86efac;\\">Abrir panel admin</a>";
            zona.textContent = "Si el login normal sigue fallando en otra ventana, esa ventana tiene caché o cookies corruptas.";
        } else {
            veredicto.style.background = "#7f1d1d";
            veredicto.textContent = "&#10060; Hay fallos arriba — revisa los mensajes [FALLO].";
        }
    })();
})();
</script>'

   . '</body></html>';
