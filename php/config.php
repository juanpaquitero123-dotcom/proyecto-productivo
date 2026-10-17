<?php
/**
 * ══════════════════════════════════════════════════════
 *  CONFIG.PHP — Conexión MySQL y utilidades comunes
 *  Base de datos: IeSanFelixAlDia
 * ══════════════════════════════════════════════════════
 */

// ── Credenciales de MySQL (XAMPP por defecto) ──
define('DB_HOST', 'localhost');
// Puerto de MySQL. Déjalo en '' para detectarlo solo leyendo el my.ini de
// XAMPP (así el sitio sigue funcionando si MySQL se mueve a 3307/3308
// porque el 3306 ya estaba ocupado). Pon un número para forzarlo.
define('DB_PORT', '');
define('DB_NAME', 'IeSanFelixAlDia');
define('DB_USER', 'root');
define('DB_PASS', '');
define('DB_CHARSET', 'utf8mb4');

// Sello de versión. Si cambia, el texto de los errores lo muestra: sirve para
// confirmar si un cambio de este archivo ya está activo o sigue en la caché
// de OPcache del servidor Apache.
define('CONFIG_BUILD', '2026-09-29-a');

/**
 * MySQL/MariaDB concede los permisos por (usuario, host), y "localhost" NO
 * es lo mismo que "127.0.0.1": son entradas distintas en la tabla de
 * usuarios. Si el servidor tiene el permiso para una de las dos formas pero
 * no para la otra, la conexión falla con el error 1130
 * ("Host '...' is not allowed to connect"). Por eso se prueban las dos
 * spellings antes de rendirse.
 *
 * El primero que conecte se recuerda para el resto de la petición.
 */
if (!defined('DB_HOST_ALTERNATIVOS')) {
    define('DB_HOST_ALTERNATIVOS', array('127.0.0.1', '::1'));
}

/**
 * Rutas donde XAMPP deja el my.ini de MySQL, derivadas de la ubicación de
 * este archivo: ...\Proyecto_Productivo2026\php → ...\htdocs → ...\xampp
 */
function archivosMyIniXampp()
{
    // __DIR__ = ...\xampp\htdocs\Proyecto_Productivo2026\php
    // Tres dirname() para subir a la raíz de XAMPP: con dos se llegaba a
    // ...\xampp\htdocs y el my.ini nunca se encontraba.
    $raizXampp = dirname(dirname(dirname(__DIR__)));

    return array(
        $raizXampp . DIRECTORY_SEPARATOR . 'mysql' . DIRECTORY_SEPARATOR . 'bin' . DIRECTORY_SEPARATOR . 'my.ini',
        $raizXampp . DIRECTORY_SEPARATOR . 'etc' . DIRECTORY_SEPARATOR . 'my.ini',
    );
}

/**
 * Puerto real de MySQL y de dónde salió.
 *
 * Si DB_PORT está vacío, lo busca en los archivos my.ini de XAMPP. Con
 * Apache bajo C:\xampp\htdocs, el my.ini queda en ../../../mysql/bin/my.ini
 * respecto a este archivo, y así el proyecto funciona en cualquier instalación
 * de XAMPP sin editar el código. Si no se encuentra, usa 3306.
 *
 * @return array [puerto, origen]  origen: 'config' | 'my.ini' | 'defecto'
 */
function puertoMySql()
{
    static $resuelto = null;

    if ($resuelto !== null) {
        return $resuelto;
    }

    if (DB_PORT !== '') {
        return $resuelto = array(DB_PORT, 'config');
    }

    foreach (archivosMyIniXampp() as $archivo) {
        if (!is_readable($archivo)) {
            continue;
        }
        $contenido = file_get_contents($archivo);
        if ($contenido === false) {
            continue;
        }
        // Solo cuenta la sección [mysqld] para no tomar el port del cliente,
        // e ignora las líneas comentadas con # o ;.
        if (preg_match('/\[mysqld\](.*?)(\n\s*\[|\z)/s', $contenido, $seccion)
            && preg_match('/^[ \t]*(?![#;])port[ \t]*=[ \t]*(\d+)/mi', $seccion[1], $m)) {
            return $resuelto = array($m[1], 'my.ini');
        }
    }

    return $resuelto = array('3306', 'defecto');
}

/**
 * Crea una conexión PDO. $conBD = true para seleccionar IeSanFelixAlDia.
 * $host = null usa DB_HOST. $puerto = null usa el configurado.
 * $timeout = segundos máximos esperando a MySQL.
 */
function pdoConexion($conBD, $host = null, $puerto = null, $timeout = 5)
{
    if ($host === null) {
        $host = DB_HOST;
    }
    if ($puerto === null) {
        $puerto = puertoMySql()[0];
    }

    $dsn = 'mysql:host=' . $host . ';charset=' . DB_CHARSET;
    if ($puerto !== '') {
        $dsn .= ';port=' . $puerto;
    }
    if ($conBD) {
        $dsn .= ';dbname=' . DB_NAME;
    }

    return new PDO($dsn, DB_USER, DB_PASS, array(
        PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES   => false,
        PDO::ATTR_TIMEOUT            => $timeout,
    ));
}

/**
 * Archivo donde se recuerda el host:puerto que sí respondió.
 * Solo guarda esa pareja (nunca credenciales) y se crea en php/.cache/,
 * que lleva un .htaccess que impide servirlo por HTTP.
 */
function archivoCacheConexion()
{
    $dir = __DIR__ . DIRECTORY_SEPARATOR . '.cache';

    if (!is_dir($dir)) {
        @mkdir($dir, 0777, true);
    }

    return $dir . DIRECTORY_SEPARATOR . 'conexion.json';
}

/**
 * Lee el host:puerto cacheado, o null si no hay nada guardado.
 */
function leerCacheConexion()
{
    $archivo = archivoCacheConexion();

    if (!is_readable($archivo)) {
        return null;
    }

    $crudo = @file_get_contents($archivo);
    if ($crudo === false) {
        return null;
    }

    $datos = json_decode($crudo, true);
    if (!is_array($datos) || empty($datos['host']) || empty($datos['puerto'])) {
        return null;
    }

    return array((string)$datos['host'], (string)$datos['puerto']);
}

/**
 * Guarda el host:puerto que acaba de funcionar. Si el archivo no se puede
 * escribir se ignora en silencio: es una optimización, no un requisito.
 */
function guardarCacheConexion($host, $puerto)
{
    $archivo = archivoCacheConexion();

    $json = json_encode(array(
        'host'  => $host,
        'puerto' => (string)$puerto,
    ));

    if ($json === false) {
        return;
    }

    @file_put_contents($archivo, $json, LOCK_EX);
}

/**
 * ¿Este código de error significa que nadie contestó en la red, o que el
 * servidor respondió y está rechazando el acceso?
 *
 * 2002/2003/2005 (y el 0 de "could not find driver") son fallos de transporte:
 * no hay nadie escuchando, o ese host no existe. Cualquier otro código lo
 * devolvió el propio servidor, así que demuestra que está vivo. Esa distinción
 * separa "MySQL está apagado" de "MySQL está encendido y no me deja entrar",
 * que son fallos opuestos con arreglos opuestos.
 *
 * @param  int  $codigo Código de error del driver.
 * @return bool true si el error es de transporte (nadie respondió).
 */
function esErrorSinRespuesta($codigo)
{
    return $codigo === 0
        || $codigo === 2002
        || $codigo === 2003
        || $codigo === 2005;
}

/**
 * Conecta probando cada host × puerto hasta dar con uno que responda.
 *
 * Se prueban hosts alternativos (127.0.0.1, ::1) y puertos habituales
 * (3306/3307/3308/33060) porque en Windows "localhost" resuelve primero a
 * ::1 y, si MySQL solo escucha en IPv4, la conexión se rechaza aunque el
 * servidor esté encendido: mismo síntoma que si estuviera apagado. MySQL en
 * XAMPP además cambia de puerto si el anterior está ocupado, y el my.ini
 * que lee este proyecto puede no ser el que usa el servidor.
 *
 * El host:puerto que funciona se guarda en disco, así las siguientes
 * peticiones conectan en un solo intento en vez de repetir el barrido
 * completo (12 combinaciones) cada vez.
 *
 * Solo se corta antes si el fallo es de usuario/contraseña (1045/1044), que
 * no depende del host ni del puerto: seguir probando no aportaría nada.
 *
 * @param  bool   $conBD
 * @param  string $hostQueSirve Host con el que se logró conectar.
 * @return PDO
 * @throws PDOException Si ninguna combinación funciona.
 */
function pdoConectarProbando($conBD, &$hostQueSirve = null)
{
    $hosts  = array_merge(array(DB_HOST), DB_HOST_ALTERNATIVOS);
    $puerto = puertoMySql()[0];

    // MySQL en XAMPP se mueve de puerto si el anterior está ocupado (3307,
    // 3308…), y el my.ini que lee este proyecto puede no ser el que usa el
    // servidor. Por eso se barren los puertos habituales, no solo el
    // configurado.
    $puertos = array_unique(array_merge(
        array($puerto),
        array('3306', '3307', '3308', '33060')
    ));

    $ultimoError = null;
    // El último error del barrido suele ser el de "::1", que solo dice que esa
    // dirección no contestó. Si algún intento sí recibió respuesta del
    // servidor (1130, 1049…), ese error es mucho más informativo, porque
    // prueba que MySQL está encendido. Sin esto el resumen final diría que el
    // servidor está apagado cuando en realidad respondió y lo que falta es la
    // cuenta de usuario o la base de datos.
    $mejorError = null;

    // 0) Punto cacheado de la petición anterior: un solo intento y listo.
    // Si falla, NO se devuelve el error aquí: se cae al barrido completo,
    // porque el fallo puede ser justo el caso de ::1 rechazado en un puerto
    // donde 127.0.0.1 sí funciona.
    $cache = leerCacheConexion();
    if ($cache !== null) {
        try {
            $pdo = pdoConexion($conBD, $cache[0], $cache[1], 3);
            $hostQueSirve = $cache[0];
            return $pdo;
        } catch (PDOException $e) {
            $ultimoError = $e;
            $codigo = isset($e->errorInfo[1]) ? (int)$e->errorInfo[1] : 0;
            if ($codigo === 1045 || $codigo === 1044) {
                throw $e; // usuario o contraseña: cambiar host/puerto no ayuda
            }
            if (!esErrorSinRespuesta($codigo)) {
                $mejorError = $e;
            }
        }
    }

    // 1) Barrido puerto por puerto, con todos los hosts de cada uno.
    //
    // El puerto configurado va primero (es el caso normal) y con un timeout
    // algo mayor; los alternativos usan timeout corto porque un puerto
    // cerrado se rechaza de inmediato: solo tardaría si el firewall
    // descartara el paquete.
    //
    // No se salta el resto de hosts de un puerto cuando uno falla: en Windows
    // "localhost" resuelve primero a ::1 y, si MySQL solo escucha en IPv4, se
    // rechaza aunque el servidor esté encendido en 127.0.0.1.
    foreach ($puertos as $puertoProbado) {
        $timeout = ($puertoProbado === $puerto) ? 4 : 2;

        foreach ($hosts as $host) {
            try {
                $pdo = pdoConexion($conBD, $host, $puertoProbado, $timeout);
                $hostQueSirve = $host;
                guardarCacheConexion($host, $puertoProbado);
                return $pdo;
            } catch (PDOException $e) {
                $ultimoError = $e;
                $codigo = isset($e->errorInfo[1]) ? (int)$e->errorInfo[1] : 0;
                if ($codigo === 1045 || $codigo === 1044) {
                    throw $e;
                }
                if (!esErrorSinRespuesta($codigo)) {
                    $mejorError = $e;
                }
            }
        }
    }

    throw ($mejorError !== null ? $mejorError : $ultimoError);
}

/**
 * Mapa de rol → tabla de la base de datos.
 * El login está SEPARADO por rol: cada tipo de cuenta vive en su propia tabla.
 *
 *   Administradores → rol "admin"
 *   Docentes        → rol "docente"
 *   Estudiantes     → rol "estudiante"
 *   Padres          → rol "padre"
 */
function rolesTablas()
{
    return array(
        'admin'      => 'Administradores',
        'docente'    => 'Docentes',
        'estudiante' => 'Estudiantes',
        'padre'      => 'Padres'
    );
}

/**
 * Devuelve la tabla asociada a un rol, o null si el rol no es válido.
 */
function tablaRol($rol)
{
    $mapa = rolesTablas();
    return isset($mapa[$rol]) ? $mapa[$rol] : null;
}

/**
 * ¿El usuario ya existe en ALGUNA de las tablas por rol?
 */
function usuarioUnico($pdo, $usuario)
{
    foreach (rolesTablas() as $tabla) {
        $stmt = $pdo->prepare("SELECT id FROM `{$tabla}` WHERE usuario = ? LIMIT 1");
        $stmt->execute(array($usuario));
        if ($stmt->fetch()) {
            return false;
        }
    }
    return true;
}

/**
 * ¿El correo ya existe en ALGUNA de las tablas por rol?
 */
function emailUnico($pdo, $email)
{
    if ($email === '' || $email === null) {
        return true;
    }

    foreach (rolesTablas() as $tabla) {
        $stmt = $pdo->prepare("SELECT id FROM `{$tabla}` WHERE email = ? LIMIT 1");
        $stmt->execute(array($email));
        if ($stmt->fetch()) {
            return false;
        }
    }
    return true;
}

/**
 * Busca en cuál de las tablas por rol vive un id.
 * Devuelve el nombre de la tabla o null si no se encuentra.
 */
function buscarTablaPorId($pdo, $id)
{
    foreach (rolesTablas() as $tabla) {
        $stmt = $pdo->prepare("SELECT id FROM `{$tabla}` WHERE id = ? LIMIT 1");
        $stmt->execute(array($id));
        if ($stmt->fetch()) {
            return $tabla;
        }
    }
    return null;
}

/**
 * Traduce un error de conexión de MySQL a un mensaje que dice qué corregir.
 * El mensaje nativo de PDO ("SQLSTATE[HY000] [2002] ...") no le sirve
 * de nada a quien está intentando arreglarlo.
 *
 * @param Exception $e
 * @param string|null $host Host que se estaba probando, si se conoce.
 * @return string Mensaje accionable en español.
 */
function pdoConexionDiagnostico($e, $host = null)
{
    // 1045 = acceso denegado · 1049 = BD inexistente · 2002/2003/2005 = no
    // conecta · 1044 = sin permisos sobre la BD · 2006/2013 = se cayó.
    $codigo = 0;
    if ($e instanceof PDOException && isset($e->errorInfo[1])) {
        $codigo = (int)$e->errorInfo[1];
    }
    $mensaje = $e->getMessage();

    // El texto crudo del servidor es el único sitio donde aparece el dato que
    // PHP no muestra y que decide la solución: en un 1130 dice el host LITERAL
    // que el servidor cree que eres, que no siempre es "localhost" (puede ser
    // el nombre de la máquina), y eso determina qué cuenta hay que crear.
    $crudo = $mensaje;
    if (preg_match('/\[\d+\]\s*(.+)$/s', $mensaje, $m)) {
        $crudo = trim(preg_replace('/\s+/', ' ', $m[1]));
    }

    // "could not find driver" no siempre llega como código IM001: según la
    // versión de PHP llega en el mensaje o en errorInfo[0], así que se
    // comprueban los tres sitios antes de culpar a la extensión.
    $esSinDriver = ($e instanceof PDOException)
        && ($e->getCode() === 'IM001'
            || stripos($e->getMessage(), 'could not find driver') !== false
            || (isset($e->errorInfo[0]) && $e->errorInfo[0] === 'IM001'));

    if ($esSinDriver) {
        return 'La extensión pdo_mysql no está activa. Habilítala en '
             . 'C:\\xampp\\php\\php.ini quitando el ";" de: extension=pdo_mysql';
    }

    switch ($codigo) {
        case 1130:
            // Este error NO es de contraseña (eso sería 1045): MySQL respondió
            // y lo que hizo fue rechazar el origen. Es decir, el servidor está
            // vivo y escuchando; simplemente no existe una cuenta root@<host>.
            $cabecera = $host !== null
                ? 'MySQL no autoriza al usuario "' . DB_USER . '" desde el host "' . $host . '".'
                : 'MySQL no autoriza al usuario "' . DB_USER . '" desde ninguno de los hosts probados ('
                  . implode(', ', array_merge(array(DB_HOST), DB_HOST_ALTERNATIVOS)) . ').';

            // MySQL concede los permisos por (usuario, host) y NO los hereda
            // entre hosts: hay que crear una cuenta para cada host. Por eso un
            // GRANT a 127.0.0.1 sin un CREATE USER previo falla. Se añade "%"
            // al final porque el host que el servidor ve puede ser el nombre de
            // la máquina y no ninguno de los que prueba el sitio.
            $sql = ' ';
            foreach (array_merge(array(DB_HOST), DB_HOST_ALTERNATIVOS, array('%')) as $h) {
                $sql .= "CREATE USER IF NOT EXISTS '" . DB_USER . "'@'" . $h . "' IDENTIFIED BY '"
                      . DB_PASS . "'; GRANT ALL PRIVILEGES ON *.* TO '" . DB_USER . "'@'" . $h
                      . "' WITH GRANT OPTION; ";
            }
            $sql .= 'FLUSH PRIVILEGES;';

            return $cabecera
                 . ' El servidor SÍ está encendido y escuchando (si estuviera apagado el error sería'
                 . ' 2002, no 1130): la tabla de permisos de MySQL no tiene ninguna cuenta que case'
                 . ' con "' . DB_USER . '@' . ($host !== null ? $host : DB_HOST) . '".'
                 . ' Mensaje literal del servidor: "' . $crudo . '".'
                 . ' ATENCIÓN: por consola NO se puede arreglar, porque entrar a la consola'
                 . ' MySQL/phpMyAdmin ya requiere esa misma cuenta: es un pez que se muerde la cola.'
                 . ' La forma de salir es arrancar el servidor sin tablas de permisos y recrear la'
                 . ' cuenta. Para eso está el reparador de un clic, que además reinicia MySQL'
                 . ' normal y comprueba el resultado: doble clic en la carpeta "utilidades" del'
                 . ' proyecto, archivo reparar_root.bat'
                 . ' (o http://localhost/Proyecto_Productivo2026/utilidades/reparar_root.bat).'
                 . ' Si lo que salió fue este mismo SQL, el contenido es: ' . $sql;

        case 2002:
        case 2003:
        case 2005:
            $p = puertoMySql();
            $notaOrigen = $p[1] === 'defecto'
                ? 'No se pudo leer ningún my.ini, así que 3306 es un valor supuesto, no el puerto real.'
                : 'El puerto ' . $p[0] . ' sí se leyó de ' . $p[1] . '.';

            $log = dirname(dirname(dirname(__DIR__)))
                 . DIRECTORY_SEPARATOR . 'mysql' . DIRECTORY_SEPARATOR . 'data'
                 . DIRECTORY_SEPARATOR . 'mysql_error.log';

            // Cuidado: 2002 en un host concreto NO significa que el servidor esté
            // caído, solo que ese host no contestó. Con IPv6 desactivado en
            // Windows, "::1" siempre da 2002 aunque MariaDB esté perfectamente
            // vivo escuchando en 127.0.0.1. Por eso el mensaje cambia según si
            // se está mirando un host suelto o el barrido completo.
            if ($host !== null) {
                return 'La conexión al host "' . $host . '":' . $p[0] . ' fue rechazada:'
                     . ' nadie está escuchando en ese puerto.'
                     . ' Mensaje literal: "' . $crudo . '".'
                     . ' Cuidado con la interpretación: esto es inofensivo solo si el host es'
                     . ' secundario, como "::1" cuando Windows no tiene IPv6, y el sitio sí'
                     . ' consiguió conectar por "localhost" o "127.0.0.1". Si fallan también'
                     . ' esos dos, MySQL está apagado y hay que arrancarlo'
                     . ' (Panel de Control de XAMPP → Start).'
                     . ' [config ' . CONFIG_BUILD . ']';
            }

            return 'MySQL no respondió en ningún host ('
                 . implode(', ', array_merge(array(DB_HOST), DB_HOST_ALTERNATIVOS))
                 . ') ni en ningún puerto ('
                 . implode(', ', array_unique(array_merge(array($p[0]), array('3306', '3307', '3308', '33060'))))
                 . ').' . $notaOrigen
                 . ' Aquí sí significa que nadie está escuchando: el servidor está apagado o'
                 . ' alguien más ocupa el puerto. En el Panel de Control de XAMPP pulsa Start en'
                 . ' MySQL; si no arranca, el motivo está en ' . $log
                 . ' y las últimas líneas lo dicen. Cierra también cualquier consola donde'
                 . ' dejaste "mysqld.exe --skip-grant-tables" corriendo, porque esa instancia'
                 . ' ocupa el puerto. [config ' . CONFIG_BUILD . ']';

        case 1045:
            return 'MySQL rechazó al usuario "' . DB_USER . '". Revisa DB_USER y DB_PASS en php/config.php.';

        case 1044:
            return 'El usuario "' . DB_USER . '" no tiene permiso sobre la base de datos "' . DB_NAME . '".';

        case 1049:
            return 'La base de datos "' . DB_NAME . '" no existe y no se pudo crear automáticamente.';

        case 2006:
        case 2013:
            return 'Se perdió la conexión con MySQL durante la petición. Vuelve a cargar la página.';
    }

    return $mensaje;
}

/**
 * Devuelve la conexión PDO a la base de datos (singleton).
 * Si la base de datos no existe todavía, se crea automáticamente
 * junto con las 4 tablas por rol (Administradores, Docentes,
 * Estudiantes, Padres) y los usuarios iniciales.
 * Si aún existe la antigua tabla única "Usuarios", se migra y se elimina.
 */
function db()
{
    static $pdo = null;

    if ($pdo !== null) {
        return $pdo;
    }

    try {
        $pdo = pdoConectarProbando(true);
    } catch (PDOException $e) {
        $codigo = isset($e->errorInfo[1]) ? (int)$e->errorInfo[1] : 0;

        // Error 1049 = la base de datos aún no existe → crearla ahora.
        if ($codigo === 1049 || stripos($e->getMessage(), 'Unknown database') !== false) {
            try {
                $temporal = pdoConectarProbando(false);
                require_once __DIR__ . '/schema.php';
                instalarBaseDatos($temporal);
                $pdo = pdoConectarProbando(true);
            } catch (Exception $e2) {
                jsonResp(array(
                    'ok'    => false,
                    'error' => 'No se pudo crear la base de datos "' . DB_NAME . '". '
                             . pdoConexionDiagnostico($e2)
                ));
            }
        } else {
            jsonResp(array(
                'ok'    => false,
                'error' => 'No se pudo conectar con la base de datos "' . DB_NAME . '". '
                         . pdoConexionDiagnostico($e)
            ));
        }
    }

    // El instalador (crear tablas + migrar + sembrar) solo corre cuando el
    // esquema no está al día. Antes se ejecutaba en cada petición, lo que
    // hacía lentas todas las páginas y convertía cualquier fallo puntual
    // de una migración en un "error de conexión" en todo el sitio.
    require_once __DIR__ . '/schema.php';
    try {
        if (esquemaDesactualizado($pdo)) {
            instalarBaseDatos($pdo);
        }
    } catch (Exception $e) {
        jsonResp(array(
            'ok'    => false,
            'error' => 'No se pudo actualizar el esquema de la base de datos. ' . $e->getMessage()
        ));
    }

    return $pdo;
}

/**
 * Inicia la sesión PHP con cookie protegida (HttpOnly).
 * Fuerza una ruta de guardado siempre escribible para evitar
 * que las sesiones se pierdan entre páginas.
 */
function iniciarSesionSegura()
{
    if (session_status() === PHP_SESSION_NONE) {
        // Las sesiones viven 30 días en el servidor: la sesión no se pierde
        // por inactividad y el login se recuerda aunque se cierre el navegador.
        ini_set('session.gc_maxlifetime', 2592000); // 30 días
        ini_set('session.cookie_lifetime', 0);

        session_set_cookie_params(array(
            'lifetime' => 0,
            'path'     => '/',
            'httponly' => true,
            'samesite' => 'Lax',
        ));
        session_name('IESANFELIX_SESSID');
        session_start();
    }
}

/**
 * Envía una respuesta JSON y termina el script.
 */
function jsonResp($datos)
{
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($datos, JSON_UNESCAPED_UNICODE);
    exit;
}

/**
 * Lee y decodifica el cuerpo JSON de la petición.
 */
function leerJsonPeticion()
{
    $raw   = (string)file_get_contents('php://input');
    $datos = json_decode($raw, true);
    return is_array($datos) ? $datos : array();
}

/**
 * Valida que un rol sea permitido.
 */
function rolValido($rol, $permitidos)
{
    return is_string($rol) && in_array($rol, $permitidos, true);
}

/**
 * Verifica que haya una sesión activa de administrador.
 * Los administradores viven SOLO en la tabla Administradores.
 */
function exigirAdmin()
{
    if (empty($_SESSION['usuario_id'])) {
        jsonResp(array('ok' => false, 'error' => 'Debes iniciar sesión.'));
    }

    $idSesion = (int)$_SESSION['usuario_id'];

    // Liberar el candado de sesión antes de tocar la base de datos
    session_write_close();

    $stmt = db()->prepare(
        "SELECT 'admin' AS rol, estado FROM Administradores WHERE id = ? LIMIT 1"
    );
    $stmt->execute(array($idSesion));
    $fila = $stmt->fetch();

    if (!$fila || $fila['estado'] !== 'activo' || $fila['rol'] !== 'admin') {
        jsonResp(array('ok' => false, 'error' => 'Solo un administrador puede realizar esta acción.'));
    }
}

/**
 * Ruta absoluta de la carpeta donde se guardan las imágenes subidas.
 * Ejemplo: C:\xampp\htdocs\Proyecto_Productivo2026\uploads
 */
function rutaCarpetaSubidas()
{
    return rtrim(dirname(__DIR__), '/\\') . DIRECTORY_SEPARATOR . 'uploads';
}

/**
 * Convierte un texto en un nombre de archivo seguro (solo letras/números/._-).
 */
function nombreArchivoSeguro($texto)
{
    $texto = strtolower(trim($texto));
    $texto = preg_replace('/[^a-z0-9._-]+/', '_', $texto);
    return $texto !== '' ? $texto : 'archivo';
}
