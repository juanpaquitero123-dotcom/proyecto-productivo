<?php
/**
 * ══════════════════════════════════════════════════════
 *  IMAGENES.PHP — Imágenes por elemento (slides, eventos, noticias)
 *
 *  Permite adjuntar una o varias imágenes a cada elemento.
 *  Los archivos se guardan en la carpeta /uploads del proyecto y
 *  la ruta se registra en la tabla Imagenes.
 *
 *  Acciones:
 *    - subir    → (admin) multipart: seccion + elemento_id + imagenes[]
 *    - eliminar → (admin) JSON: { id }
 *    - listar   → público: todas las imágenes activas
 * ══════════════════════════════════════════════════════
 */

require_once __DIR__ . '/config.php';

iniciarSesionSegura();

/**
 * Secciones de "galería por página": una única galería de imágenes para
 * cada página del sitio que no tiene elementos propios en la base de datos.
 * Todas usan elemento_id = 1 (la página misma).
 */
function galeriasPorPagina()
{
    return array('academico', 'estudiantes', 'padres', 'horarios', 'contacto');
}

/**
 * Elementos estáticos de "Nuestro Colegio" que admiten imágenes sin tener
 * tabla propia: las tarjetas de Instalaciones y Beneficios (id 1..9).
 */
function seccionesInstalaciones()
{
    return array(1, 2, 3, 4, 5, 6, 7, 8, 9);
}

/**
 * Símbolos institucionales: El Escudo (1), La Bandera (2), El Himno (3).
 */
function seccionesSimbolos()
{
    return array(1, 2, 3);
}

function seccionPermitida($seccion)
{
    return in_array($seccion, array('slides', 'eventos', 'noticias', 'instalaciones', 'simbolos'), true)
        || in_array($seccion, galeriasPorPagina(), true);
}

/**
 * Procesa los campos de archivo subidos y los guarda en /uploads/<seccion>.
 * @return array Lista de rutas guardadas.
 */
function procesarImagenesSubidas($seccion)
{
    $raiz    = rutaCarpetaSubidas() . DIRECTORY_SEPARATOR . $seccion;
    if (!is_dir($raiz)) {
        @mkdir($raiz, 0755, true);
    }

    $permitidos = array(
        'image/jpeg' => 'jpg',
        'image/png'  => 'png',
        'image/gif'  => 'gif',
        'image/webp' => 'webp'
    );

    $guardadas = array();

    foreach (array('imagenes', 'archivo') as $campo) {
        if (empty($_FILES[$campo])) continue;
        $archivos = is_array($_FILES[$campo]['name']) ? $_FILES[$campo]['name'] : array($_FILES[$campo]['name']);
        $tmps     = is_array($_FILES[$campo]['tmp_name']) ? $_FILES[$campo]['tmp_name'] : array($_FILES[$campo]['tmp_name']);
        $errores  = is_array($_FILES[$campo]['error']) ? $_FILES[$campo]['error'] : array($_FILES[$campo]['error']);
        $nombres  = is_array($_FILES[$campo]['name']) ? $_FILES[$campo]['name'] : array();

        foreach ($nombres as $i => $nombre) {
            if (isset($errores[$i]) && $errores[$i] !== UPLOAD_ERR_OK) continue;
            if (!isset($tmps[$i]) || !is_uploaded_file($tmps[$i])) continue;

            $info = @getimagesize($tmps[$i]);
            if ($info === false) continue; // no es una imagen real
            $mime = $info['mime'];
            if (!isset($permitidos[$mime])) continue;

            if (filesize($tmps[$i]) > 5 * 1024 * 1024) continue; // máx 5 MB

            $ext   = $permitidos[$mime];
            $base  = nombreArchivoSeguro(pathinfo((string)$nombre, PATHINFO_FILENAME));
            $nombreNuevo = $seccion . '_' . date('Ymd-His') . '_' . substr(bin2hex(random_bytes(4)), 0, 8) . '.' . $ext;
            $destino = $raiz . DIRECTORY_SEPARATOR . $nombreNuevo;

            if (move_uploaded_file($tmps[$i], $destino)) {
                $guardadas[] = 'uploads/' . $seccion . '/' . $nombreNuevo;
            }
        }
    }

    return $guardadas;
}

$entrada = leerJsonPeticion();
if (!isset($entrada['accion'])) {
    // Peticiones multipart (subida de archivos): PHP las deja en $_POST
    $entrada = array_merge((array)$_POST, $entrada);
}
$accion  = isset($entrada['accion']) ? (string)$entrada['accion'] : 'listar';

try {
    $pdo = db();

    // ── Listar imágenes (uso público, para pintar el sitio) ──
    if ($accion === 'listar') {
        $imagenes = $pdo->query(
            'SELECT id, seccion, elemento_id, ruta
             FROM Imagenes
             WHERE activo = "activo"
             ORDER BY seccion ASC, elemento_id ASC, posicion ASC, id ASC'
        )->fetchAll();

        foreach ($imagenes as &$img) {
            $img['id']          = (int)$img['id'];
            $img['elemento_id'] = (int)$img['elemento_id'];
        }
        unset($img);

        jsonResp(array('ok' => true, 'imagenes' => $imagenes));
    }

    // A partir de aquí todo requiere administrador
    exigirAdmin();

    // ── Subir una o varias imágenes a un elemento ──
    if ($accion === 'subir') {
        $seccion    = isset($entrada['seccion'])    ? (string)$entrada['seccion']    : '';
        $elementoId = isset($entrada['elemento_id']) ? (int)$entrada['elemento_id']   : 0;

        if (!seccionPermitida($seccion)) {
            jsonResp(array('ok' => false, 'error' => 'Sección o elemento inválido.'));
        }

        // Las galerías por página no tienen tabla ni elementos: la página hace
        // las veces de elemento único (id = 1). Las demás secciones sí validan
        // que el elemento exista en su tabla.
        if (in_array($seccion, galeriasPorPagina(), true)) {
            $elementoId = 1;
        } elseif ($seccion === 'instalaciones') {
            if (!in_array($elementoId, seccionesInstalaciones(), true)) {
                jsonResp(array('ok' => false, 'error' => 'Sección o elemento inválido.'));
            }
        } elseif ($seccion === 'simbolos') {
            if (!in_array($elementoId, seccionesSimbolos(), true)) {
                jsonResp(array('ok' => false, 'error' => 'Sección o elemento inválido.'));
            }
        } else {
            if ($elementoId <= 0) {
                jsonResp(array('ok' => false, 'error' => 'Sección o elemento inválido.'));
            }

            $tablas = array('slides' => 'Slides', 'eventos' => 'Eventos', 'noticias' => 'Noticias');
            $stmt = $pdo->prepare('SELECT id FROM `' . $tablas[$seccion] . '` WHERE id = ? LIMIT 1');
            $stmt->execute(array($elementoId));
            if (!$stmt->fetch()) {
                // Si el elemento no existe, no tiene sentido adjuntar imágenes
                jsonResp(array('ok' => false, 'error' => 'El elemento no existe.'));
            }
        }

        $rutas = procesarImagenesSubidas($seccion);
        if (!$rutas) {
            jsonResp(array('ok' => false, 'error' => 'No se recibieron imágenes válidas (JPG, PNG, GIF o WEBP, máx. 5 MB).'));
        }

        // Posición inicial: al final de las imágenes existentes del elemento
        $stmtPos = $pdo->prepare('SELECT COALESCE(MAX(posicion), 0) FROM Imagenes WHERE seccion = ? AND elemento_id = ?');
        $stmtPos->execute(array($seccion, $elementoId));
        $pos = (int)$stmtPos->fetchColumn();

        $stmtIns = $pdo->prepare(
            'INSERT INTO Imagenes (seccion, elemento_id, ruta, posicion, activo) VALUES (?, ?, ?, ?, "activo")'
        );
        $nuevas = array();
        foreach ($rutas as $ruta) {
            $pos++;
            $stmtIns->execute(array($seccion, $elementoId, $ruta, $pos));
            $nuevas[] = array(
                'id'          => (int)$pdo->lastInsertId(),
                'seccion'     => $seccion,
                'elemento_id' => $elementoId,
                'ruta'        => $ruta
            );
        }

        jsonResp(array('ok' => true, 'imagenes' => $nuevas));
    }

    // ── Eliminar una imagen (registro + archivo) ──
    if ($accion === 'eliminar') {
        $id = isset($entrada['id']) ? (int)$entrada['id'] : 0;
        if ($id <= 0) {
            jsonResp(array('ok' => false, 'error' => 'Imagen inválida.'));
        }

        $stmt = $pdo->prepare('SELECT ruta FROM Imagenes WHERE id = ? LIMIT 1');
        $stmt->execute(array($id));
        $fila = $stmt->fetch();

        if ($fila) {
            $relativa = str_replace('/', DIRECTORY_SEPARATOR, (string)$fila['ruta']);
            $relativa = preg_replace('#^uploads[\\\\/]#', '', $relativa); // quita el prefijo "uploads/"
            $archivo  = rutaCarpetaSubidas() . DIRECTORY_SEPARATOR . $relativa;

            // Solo se borra si el archivo queda dentro de la carpeta de subidas (sin "..")
            $completo = realpath(rutaCarpetaSubidas());
            $realDest = realpath($archivo);
            if ($realDest !== false && $completo !== false && strpos($realDest, $completo . DIRECTORY_SEPARATOR) === 0) {
                @unlink($realDest);
            }

            $pdo->prepare('DELETE FROM Imagenes WHERE id = ?')->execute(array($id));
        }

        jsonResp(array('ok' => true));
    }

    jsonResp(array('ok' => false, 'error' => 'Acción desconocida.'));
} catch (Exception $e) {
    jsonResp(array('ok' => false, 'error' => 'Error del servidor al procesar la solicitud: ' . $e->getMessage()));
}