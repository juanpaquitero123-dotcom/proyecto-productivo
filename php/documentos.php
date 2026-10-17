<?php
/**
 * ══════════════════════════════════════════════════════
 *  DOCUMENTOS.PHP — Documentos institucionales (Manual de Convivencia)
 *
 *  Permite publicar documentos PDF / DOC / DOCX desde el panel
 *  administrativo. Cada sección tiene un único documento vigente:
 *  al subir uno nuevo se reemplaza el archivo anterior (se elimina).
 *
 *  Los archivos se guardan en /uploads/documentos y la ruta se
 *  registra en la tabla Documentos.
 *
 *  Acciones:
 *    - listar   → público: documentos activos
 *    - subir    → (admin) multipart: seccion + archivo (PDF, DOC, DOCX)
 *    - eliminar → (admin) JSON: { seccion }
 * ══════════════════════════════════════════════════════
 */

require_once __DIR__ . '/config.php';

iniciarSesionSegura();

/**
 * Secciones de documentos del sitio. Cada sección admite un solo archivo.
 */
function seccionesDocumento()
{
    return array('manual', 'manual_segundo');
}

/**
 * Tipos de archivo permitidos (MIME → extensión).
 */
function tiposDocumentoPermitidos()
{
    return array(
        'application/pdf'                                                     => 'pdf',
        'application/msword'                                                  => 'doc',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document' => 'docx'
    );
}

/**
 * MIME real del archivo usando finfo (con respaldo por extensión).
 */
function mimeArchivo($rutaTemporal, $nombreOriginal, $permitidos)
{
    $mime = '';
    if (class_exists('finfo')) {
        $finfo = new finfo(FILEINFO_MIME_TYPE);
        $mime  = @$finfo->file($rutaTemporal);
    }

    if (isset($permitidos[$mime])) {
        return $mime;
    }

    // Respaldo: la extensión del nombre original
    $ext = strtolower((string)pathinfo((string)$nombreOriginal, PATHINFO_EXTENSION));
    foreach ($permitidos as $m => $e) {
        if ($e === $ext) {
            return $m;
        }
    }

    return null;
}

/**
 * Elimina del disco el archivo de un documento (validando que no salga de /uploads).
 */
function borrarArchivoDocumento($pdo, $id)
{
    $stmt = $pdo->prepare('SELECT ruta FROM Documentos WHERE id = ? LIMIT 1');
    $stmt->execute(array($id));
    $fila = $stmt->fetch();
    if (!$fila) {
        return;
    }

    $relativa = str_replace('/', DIRECTORY_SEPARATOR, (string)$fila['ruta']);
    $relativa = preg_replace('#^uploads[\\\\/]#', '', $relativa);
    $archivo  = rutaCarpetaSubidas() . DIRECTORY_SEPARATOR . $relativa;

    $completo = realpath(rutaCarpetaSubidas());
    $realDest = realpath($archivo);
    if ($realDest !== false && $completo !== false && strpos($realDest, $completo . DIRECTORY_SEPARATOR) === 0) {
        @unlink($realDest);
    }
}

$entrada = leerJsonPeticion();
if (!isset($entrada['accion'])) {
    // Peticiones multipart (subida de archivos): PHP las deja en $_POST
    $entrada = array_merge((array)$_POST, $entrada);
}
$accion  = isset($entrada['accion']) ? (string)$entrada['accion'] : 'listar';

try {
    $pdo = db();

    /* ==================================================
       1. LISTAR — documentos activos (público)
    ================================================== */
    if ($accion === 'listar') {
        $docs = $pdo->query(
            'SELECT id, seccion, nombre, nombre_original, ruta, tamano
             FROM Documentos
             WHERE activo = "activo"
             ORDER BY seccion ASC, id ASC'
        )->fetchAll();

        foreach ($docs as &$d) {
            $d['id']     = (int)$d['id'];
            $d['tamano'] = $d['tamano'] !== null ? (int)$d['tamano'] : null;
        }
        unset($d);

        jsonResp(array('ok' => true, 'documentos' => $docs));
    }

    // A partir de aquí todo requiere administrador
    exigirAdmin();

    /* ==================================================
       2. SUBIR — reemplaza el documento vigente de la sección
    ================================================== */
    if ($accion === 'subir') {
        $seccion = isset($entrada['seccion']) ? (string)$entrada['seccion'] : '';
        if (!in_array($seccion, seccionesDocumento(), true)) {
            jsonResp(array('ok' => false, 'error' => 'Sección inválida.'));
        }

        if (empty($_FILES['archivo'])) {
            jsonResp(array('ok' => false, 'error' => 'No se recibió ningún archivo.'));
        }

        $permitidos = tiposDocumentoPermitidos();
        $nombres    = is_array($_FILES['archivo']['name']) ? $_FILES['archivo']['name'] : array($_FILES['archivo']['name']);
        $tmps       = is_array($_FILES['archivo']['tmp_name']) ? $_FILES['archivo']['tmp_name'] : array($_FILES['archivo']['tmp_name']);
        $errores    = is_array($_FILES['archivo']['error']) ? $_FILES['archivo']['error'] : array($_FILES['archivo']['error']);

        $subido = null;
        foreach ($nombres as $i => $nombreOriginal) {
            if ($subido !== null) {
                break; // solo se toma el primer archivo válido
            }
            if (isset($errores[$i]) && $errores[$i] !== UPLOAD_ERR_OK) {
                continue;
            }
            if (!isset($tmps[$i]) || !is_uploaded_file($tmps[$i])) {
                continue;
            }
            if (filesize($tmps[$i]) > 20 * 1024 * 1024) {
                continue; // máx 20 MB
            }

            $mime = mimeArchivo($tmps[$i], $nombreOriginal, $permitidos);
            if ($mime === null || !isset($permitidos[$mime])) {
                continue;
            }

            $raiz = rutaCarpetaSubidas() . DIRECTORY_SEPARATOR . 'documentos';
            if (!is_dir($raiz)) {
                @mkdir($raiz, 0755, true);
            }

            $extArchivo = $permitidos[$mime];
            $nombreNuevo = $seccion . '_' . date('Ymd-His') . '_' . substr(bin2hex(random_bytes(4)), 0, 8) . '.' . $extArchivo;
            $destino = $raiz . DIRECTORY_SEPARATOR . $nombreNuevo;

            if (move_uploaded_file($tmps[$i], $destino)) {
                $nombreSeccion = 'Manual de Convivencia';
            if ($seccion === 'manual_segundo') {
                $nombreSeccion = 'Manual de Convivencia - Grado Segundo';
            }
            $subido = array(
                'seccion'         => $seccion,
                'nombre'          => $nombreSeccion,
                'nombre_original' => nombreArchivoSeguro(pathinfo((string)$nombreOriginal, PATHINFO_FILENAME)) . '.' . $extArchivo,
                'ruta'            => 'uploads/documentos/' . $nombreNuevo,
                'tamano'          => filesize($destino)
            );
            }
        }

        if ($subido === null) {
            jsonResp(array('ok' => false, 'error' => 'Archivo inválido: usa PDF, DOC o DOCX (máx. 20 MB).'));
        }

        // Reemplazar: borrar el archivo anterior de la sección y su registro
        $stmt = $pdo->prepare('SELECT id FROM Documentos WHERE seccion = ?');
        $stmt->execute(array($seccion));
        while ($antiguo = $stmt->fetch()) {
            borrarArchivoDocumento($pdo, (int)$antiguo['id']);
        }
        $pdo->prepare('DELETE FROM Documentos WHERE seccion = ?')->execute(array($seccion));

        $pdo->prepare(
            'INSERT INTO Documentos (seccion, nombre, nombre_original, ruta, tamano, activo)
             VALUES (?, ?, ?, ?, ?, "activo")'
        )->execute(array($subido['seccion'], $subido['nombre'], $subido['nombre_original'], $subido['ruta'], $subido['tamano']));

        jsonResp(array('ok' => true, 'id' => (int)$pdo->lastInsertId()));
    }

    /* ==================================================
       3. ELIMINAR — quita el documento de la sección
    ================================================== */
    if ($accion === 'eliminar') {
        $seccion = isset($entrada['seccion']) ? (string)$entrada['seccion'] : '';
        if (!in_array($seccion, seccionesDocumento(), true)) {
            jsonResp(array('ok' => false, 'error' => 'Sección inválida.'));
        }

        $stmt = $pdo->prepare('SELECT id FROM Documentos WHERE seccion = ?');
        $stmt->execute(array($seccion));
        while ($doc = $stmt->fetch()) {
            borrarArchivoDocumento($pdo, (int)$doc['id']);
            $pdo->prepare('DELETE FROM Documentos WHERE id = ?')->execute(array((int)$doc['id']));
        }

        jsonResp(array('ok' => true));
    }

    jsonResp(array('ok' => false, 'error' => 'Acción desconocida.'));
} catch (Exception $e) {
    jsonResp(array('ok' => false, 'error' => 'Error del servidor al procesar la solicitud.'));
}