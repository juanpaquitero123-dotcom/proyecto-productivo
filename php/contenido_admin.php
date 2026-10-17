<?php
/**
 * ══════════════════════════════════════════════════════
 *  CONTENIDO_ADMIN.PHP — CRUD del contenido (solo administradores)
 *
 *  Administra la información institucional, contacto, slides,
 *  eventos, noticias, preguntas frecuentes, galería y banda CTA
 *  guardados en MySQL. Las imágenes de cada elemento se gestionan
 *  aparte en imagenes.php.
 *
 *  Acciones (JSON en el cuerpo de la petición):
 *    - leer             → devuelve todo el contenido (con imágenes)
 *    - guardar_general  → actualiza/inserta la fila de InfoGeneral
 *    - guardar_contacto → actualiza/inserta la fila de Contacto
 *    - guardar_slide    → inserta o actualiza un slide
 *    - eliminar_slide   → elimina un slide y sus imágenes
 *    - guardar_evento   → inserta o actualiza un evento
 *    - eliminar_evento  → elimina un evento y sus imágenes
 *    - guardar_noticia  → inserta o actualiza una noticia
 *    - eliminar_noticia → elimina una noticia y sus imágenes
 *    - guardar_pregunta → inserta o actualiza una pregunta frecuente
 *    - eliminar_pregunta→ elimina una pregunta frecuente
 *    - guardar_cta      → actualiza/inserta la fila de la banda CTA
 * ══════════════════════════════════════════════════════
 */

require_once __DIR__ . '/config.php';

iniciarSesionSegura();
exigirAdmin();

/**
 * Lee todas las imágenes activas agrupadas por sección y elemento.
 * @return array ['slides'=>[id=>[imgs]], 'eventos'=>[...], 'noticias'=>[...]]
 */
function imagenesAgrupadas($pdo)
{
    $agrupadas = array('slides' => array(), 'eventos' => array(), 'noticias' => array());

    $stmt = $pdo->query(
        'SELECT id, seccion, elemento_id, ruta
         FROM Imagenes
         WHERE activo = "activo"
         ORDER BY seccion ASC, elemento_id ASC, posicion ASC, id ASC'
    );
    while ($f = $stmt->fetch()) {
        if (!isset($agrupadas[$f['seccion']])) continue;
        $idElem = (int)$f['elemento_id'];
        if (!isset($agrupadas[$f['seccion']][$idElem])) {
            $agrupadas[$f['seccion']][$idElem] = array();
        }
        $agrupadas[$f['seccion']][$idElem][] = array(
            'id'   => (int)$f['id'],
            'ruta' => $f['ruta']
        );
    }

    return $agrupadas;
}

/**
 * Adjunta el arreglo de imágenes a cada elemento.
 */
function conImagenes(&$elementos, $imagenesDe, $atributo = 'imagenes')
{
    foreach ($elementos as &$e) {
        $e[$atributo] = isset($imagenesDe[(int)$e['id']]) ? $imagenesDe[(int)$e['id']] : array();
    }
    unset($e);
}

/**
 * Elimina las imágenes (registros y archivos) de un elemento.
 */
function eliminarImagenesDe($pdo, $seccion, $elementoId)
{
    $stmt = $pdo->prepare('SELECT id, ruta FROM Imagenes WHERE seccion = ? AND elemento_id = ?');
    $stmt->execute(array($seccion, $elementoId));
    $raiz = rutaCarpetaSubidas();

    while ($f = $stmt->fetch()) {
        $relativa = str_replace('/', DIRECTORY_SEPARATOR, (string)$f['ruta']);
        $relativa = preg_replace('#^uploads[\\\\/]#', '', $relativa);
        $archivo  = $raiz . DIRECTORY_SEPARATOR . $relativa;
        $realDest = realpath($archivo);
        $completo = realpath($raiz);
        if ($realDest !== false && $completo !== false && strpos($realDest, $completo . DIRECTORY_SEPARATOR) === 0) {
            @unlink($realDest);
        }
    }

    $pdo->prepare('DELETE FROM Imagenes WHERE seccion = ? AND elemento_id = ?')->execute(array($seccion, $elementoId));
}

/**
 * Obtiene un campo de texto de la entrada (con valor por defecto).
 */
function campo($entrada, $clave, $defecto = '')
{
    return isset($entrada[$clave]) ? trim((string)$entrada[$clave]) : $defecto;
}

/** Obtiene un campo opcional (puede quedar null). */
function campoOpcional($entrada, $clave)
{
    $v = campo($entrada, $clave, null);
    return $v === '' ? null : $v;
}

$pdo = db();
$entrada = leerJsonPeticion();
$accion  = isset($entrada['accion']) ? (string)$entrada['accion'] : 'leer';

try {

    /* ==================================================
       1. LEER — todo el contenido (con imágenes)
    ================================================== */
    if ($accion === 'leer') {
        $general  = $pdo->query('SELECT * FROM InfoGeneral ORDER BY id ASC LIMIT 1')->fetch() ?: null;
        $contacto = $pdo->query('SELECT * FROM Contacto ORDER BY id ASC LIMIT 1')->fetch() ?: null;

        $slides = $pdo->query('SELECT id, titulo, subtitulo, pill, descripcion, btn_texto, btn_enlace, btn_texto2, btn_enlace2, orden, activo FROM Slides ORDER BY orden ASC, id ASC')->fetchAll();
        $eventos = $pdo->query('SELECT id, nombre, dia, mes, hora_inicio, hora_fin, lugar, fecha, orden, activo FROM Eventos ORDER BY orden ASC, fecha ASC')->fetchAll();
        $noticias = $pdo->query('SELECT id, titulo, resumen, contenido, fecha, activo FROM Noticias ORDER BY fecha DESC, id DESC')->fetchAll();
        $preguntas = $pdo->query('SELECT id, pregunta, respuesta, orden, activo FROM PreguntasFrecuentes ORDER BY orden ASC, id ASC')->fetchAll();
        $cta = $pdo->query('SELECT * FROM CtaInicio ORDER BY id ASC LIMIT 1')->fetch() ?: null;

        $imgs = imagenesAgrupadas($pdo);
        conImagenes($slides, $imgs['slides']);
        conImagenes($eventos, $imgs['eventos']);
        conImagenes($noticias, $imgs['noticias']);

        jsonResp(array(
            'ok'        => true,
            'general'   => $general,
            'contacto'  => $contacto,
            'slides'    => $slides,
            'eventos'   => $eventos,
            'noticias'  => $noticias,
            'preguntas' => $preguntas,
            'cta'       => $cta
        ));
    }

    /* ==================================================
       2. GUARDAR GENERAL / CONTACTO (fila única)
    ================================================== */
    if ($accion === 'guardar_general') {
        $datos = array(
            'nombre_institucion' => campo($entrada, 'nombre_institucion', 'Institución Educativa San Félix'),
            'lema'               => campoOpcional($entrada, 'lema'),
            'mision'             => campoOpcional($entrada, 'mision'),
            'vision'             => campoOpcional($entrada, 'vision'),
            'anio_lectivo'       => campoOpcional($entrada, 'anio_lectivo'),
            'telefono'           => campoOpcional($entrada, 'telefono'),
            'email'              => campoOpcional($entrada, 'email'),
            'direccion'          => campoOpcional($entrada, 'direccion')
        );

        $existe = $pdo->query('SELECT id FROM InfoGeneral ORDER BY id ASC LIMIT 1')->fetch();
        if ($existe) {
            $pdo->prepare(
                'UPDATE InfoGeneral SET nombre_institucion=?, lema=?, mision=?, vision=?, anio_lectivo=?, telefono=?, email=?, direccion=? WHERE id=?'
            )->execute(array($datos['nombre_institucion'], $datos['lema'], $datos['mision'], $datos['vision'], $datos['anio_lectivo'], $datos['telefono'], $datos['email'], $datos['direccion'], (int)$existe['id']));
        } else {
            $pdo->prepare(
                'INSERT INTO InfoGeneral (nombre_institucion, lema, mision, vision, anio_lectivo, telefono, email, direccion) VALUES (?,?,?,?,?,?,?,?)'
            )->execute(array_values($datos));
        }

        jsonResp(array('ok' => true));
    }

    if ($accion === 'guardar_contacto') {
        $datos = array(
            'tel1'      => campoOpcional($entrada, 'tel1'),
            'tel2'      => campoOpcional($entrada, 'tel2'),
            'email1'    => campoOpcional($entrada, 'email1'),
            'email2'    => campoOpcional($entrada, 'email2'),
            'direccion' => campoOpcional($entrada, 'direccion'),
            'facebook'  => campoOpcional($entrada, 'facebook'),
            'instagram' => campoOpcional($entrada, 'instagram'),
            'youtube'   => campoOpcional($entrada, 'youtube'),
            'frase'     => campoOpcional($entrada, 'frase')
        );

        $existe = $pdo->query('SELECT id FROM Contacto ORDER BY id ASC LIMIT 1')->fetch();
        if ($existe) {
            $pdo->prepare(
                'UPDATE Contacto SET tel1=?, tel2=?, email1=?, email2=?, direccion=?, facebook=?, instagram=?, youtube=?, frase=? WHERE id=?'
            )->execute(array($datos['tel1'], $datos['tel2'], $datos['email1'], $datos['email2'], $datos['direccion'], $datos['facebook'], $datos['instagram'], $datos['youtube'], $datos['frase'], (int)$existe['id']));
        } else {
            $pdo->prepare(
                'INSERT INTO Contacto (tel1, tel2, email1, email2, direccion, facebook, instagram, youtube, frase) VALUES (?,?,?,?,?,?,?,?,?)'
            )->execute(array_values($datos));
        }

        jsonResp(array('ok' => true));
    }

    /* ==================================================
       3. SLIDES
    ================================================== */
    if ($accion === 'guardar_slide') {
        $titulo = campo($entrada, 'titulo');
        if ($titulo === '') {
            jsonResp(array('ok' => false, 'error' => 'El título del slide es obligatorio.'));
        }

        $id = isset($entrada['id']) ? (int)$entrada['id'] : 0;

        $datos = array(
            campo($entrada, 'titulo'),
            campoOpcional($entrada, 'subtitulo'),
            campoOpcional($entrada, 'pill'),
            campoOpcional($entrada, 'descripcion'),
            campoOpcional($entrada, 'btn_texto'),
            campoOpcional($entrada, 'btn_enlace'),
            campoOpcional($entrada, 'btn_texto2'),
            campoOpcional($entrada, 'btn_enlace2'),
            (int)campo($entrada, 'orden', 0),
            fieldActivo($entrada)
        );

        if ($id > 0) {
            $pdo->prepare(
                'UPDATE Slides SET titulo=?, subtitulo=?, pill=?, descripcion=?, btn_texto=?, btn_enlace=?, btn_texto2=?, btn_enlace2=?, orden=?, activo=? WHERE id=?'
            )->execute(array_merge($datos, array($id)));
        } else {
            $pdo->prepare(
                'INSERT INTO Slides (titulo, subtitulo, pill, descripcion, btn_texto, btn_enlace, btn_texto2, btn_enlace2, orden, activo) VALUES (?,?,?,?,?,?,?,?,?,?)'
            )->execute($datos);
            $id = (int)$pdo->lastInsertId();
        }

        jsonResp(array('ok' => true, 'id' => $id));
    }

    if ($accion === 'eliminar_slide') {
        $id = isset($entrada['id']) ? (int)$entrada['id'] : 0;
        if ($id <= 0) jsonResp(array('ok' => false, 'error' => 'Slide inválido.'));

        eliminarImagenesDe($pdo, 'slides', $id);
        $pdo->prepare('DELETE FROM Slides WHERE id = ?')->execute(array($id));
        jsonResp(array('ok' => true));
    }

    /* ==================================================
       4. EVENTOS
    ================================================== */
    if ($accion === 'guardar_evento') {
        $nombre = campo($entrada, 'nombre');
        if ($nombre === '') {
            jsonResp(array('ok' => false, 'error' => 'El nombre del evento es obligatorio.'));
        }

        $id = isset($entrada['id']) ? (int)$entrada['id'] : 0;
        $fecha = campoOpcional($entrada, 'fecha');

        // Si se da una fecha completa, se deriva día y mes de ella (salvo que ya vengan)
        $dia = campoOpcional($entrada, 'dia');
        $mes = campoOpcional($entrada, 'mes');
        if ($fecha !== null) {
            $partes = explode('-', $fecha);
            if (isset($partes[2])) $dia = (string)(int)$partes[2];
            if (isset($partes[1])) $mes = strtoupper(substr('ENE FEB MAR ABR MAY JUN JUL AGO SEP OCT NOV DIC', (int)$partes[1] * 4 - 4, 3));
        }

        $datos = array(
            $nombre,
            $dia !== null ? (int)$dia : null,
            $mes,
            campoOpcional($entrada, 'hora_inicio'),
            campoOpcional($entrada, 'hora_fin'),
            campoOpcional($entrada, 'lugar'),
            $fecha,
            (int)campo($entrada, 'orden', 0),
            fieldActivo($entrada)
        );

        if ($id > 0) {
            $pdo->prepare(
                'UPDATE Eventos SET nombre=?, dia=?, mes=?, hora_inicio=?, hora_fin=?, lugar=?, fecha=?, orden=?, activo=? WHERE id=?'
            )->execute(array_merge($datos, array($id)));
        } else {
            $pdo->prepare(
                'INSERT INTO Eventos (nombre, dia, mes, hora_inicio, hora_fin, lugar, fecha, orden, activo) VALUES (?,?,?,?,?,?,?,?,?)'
            )->execute($datos);
            $id = (int)$pdo->lastInsertId();
        }

        jsonResp(array('ok' => true, 'id' => $id));
    }

    if ($accion === 'eliminar_evento') {
        $id = isset($entrada['id']) ? (int)$entrada['id'] : 0;
        if ($id <= 0) jsonResp(array('ok' => false, 'error' => 'Evento inválido.'));

        eliminarImagenesDe($pdo, 'eventos', $id);
        $pdo->prepare('DELETE FROM Eventos WHERE id = ?')->execute(array($id));
        jsonResp(array('ok' => true));
    }

    /* ==================================================
       5. NOTICIAS
    ================================================== */
    if ($accion === 'guardar_noticia') {
        $titulo = campo($entrada, 'titulo');
        if ($titulo === '') {
            jsonResp(array('ok' => false, 'error' => 'El título de la noticia es obligatorio.'));
        }

        $id = isset($entrada['id']) ? (int)$entrada['id'] : 0;

        $datos = array(
            $titulo,
            campoOpcional($entrada, 'resumen'),
            campoOpcional($entrada, 'contenido'),
            campoOpcional($entrada, 'fecha'),
            fieldActivo($entrada)
        );

        if ($id > 0) {
            $pdo->prepare(
                'UPDATE Noticias SET titulo=?, resumen=?, contenido=?, fecha=?, activo=? WHERE id=?'
            )->execute(array_merge($datos, array($id)));
        } else {
            $pdo->prepare(
                'INSERT INTO Noticias (titulo, resumen, contenido, fecha, activo) VALUES (?,?,?,?,?)'
            )->execute($datos);
            $id = (int)$pdo->lastInsertId();
        }

        jsonResp(array('ok' => true, 'id' => $id));
    }

    if ($accion === 'eliminar_noticia') {
        $id = isset($entrada['id']) ? (int)$entrada['id'] : 0;
        if ($id <= 0) jsonResp(array('ok' => false, 'error' => 'Noticia inválida.'));

        eliminarImagenesDe($pdo, 'noticias', $id);
        $pdo->prepare('DELETE FROM Noticias WHERE id = ?')->execute(array($id));
        jsonResp(array('ok' => true));
    }

    /* ==================================================
       6. PREGUNTAS FRECUENTES
    ================================================== */
    if ($accion === 'guardar_pregunta') {
        $pregunta = campo($entrada, 'pregunta');
        if ($pregunta === '') {
            jsonResp(array('ok' => false, 'error' => 'La pregunta es obligatoria.'));
        }

        $id = isset($entrada['id']) ? (int)$entrada['id'] : 0;

        $datos = array(
            $pregunta,
            campoOpcional($entrada, 'respuesta'),
            (int)campo($entrada, 'orden', 0),
            fieldActivo($entrada)
        );

        if ($id > 0) {
            $pdo->prepare(
                'UPDATE PreguntasFrecuentes SET pregunta=?, respuesta=?, orden=?, activo=? WHERE id=?'
            )->execute(array_merge($datos, array($id)));
        } else {
            $pdo->prepare(
                'INSERT INTO PreguntasFrecuentes (pregunta, respuesta, orden, activo) VALUES (?,?,?,?)'
            )->execute($datos);
            $id = (int)$pdo->lastInsertId();
        }

        jsonResp(array('ok' => true, 'id' => $id));
    }

    if ($accion === 'eliminar_pregunta') {
        $id = isset($entrada['id']) ? (int)$entrada['id'] : 0;
        if ($id <= 0) jsonResp(array('ok' => false, 'error' => 'Pregunta inválida.'));
        $pdo->prepare('DELETE FROM PreguntasFrecuentes WHERE id = ?')->execute(array($id));
        jsonResp(array('ok' => true));
    }

    /* ==================================================
       7. BANDA CTA DEL INICIO (fila única)
    ================================================== */
    if ($accion === 'guardar_cta') {
        $datos = array(
            campo($entrada, 'titulo', '¿Listo para conocer nuestro proyecto educativo?'),
            campoOpcional($entrada, 'texto'),
            campoOpcional($entrada, 'btn_texto'),
            campoOpcional($entrada, 'btn_enlace')
        );

        $existe = $pdo->query('SELECT id FROM CtaInicio ORDER BY id ASC LIMIT 1')->fetch();
        if ($existe) {
            $pdo->prepare(
                'UPDATE CtaInicio SET titulo=?, texto=?, btn_texto=?, btn_enlace=? WHERE id=?'
            )->execute(array($datos[0], $datos[1], $datos[2], $datos[3], (int)$existe['id']));
        } else {
            $pdo->prepare(
                'INSERT INTO CtaInicio (titulo, texto, btn_texto, btn_enlace) VALUES (?,?,?,?)'
            )->execute($datos);
        }

        jsonResp(array('ok' => true));
    }

    /* ==================================================
        8. SECCIONES POR PÁGINA (nosotros, académico, ...)
    ================================================== */
    $paginasValidas = array('nosotros', 'academico', 'estudiantes', 'padres', 'horarios');

    if ($accion === 'leer_secciones') {
        $pagina = isset($entrada['pagina']) ? (string)$entrada['pagina'] : '';
        if (!in_array($pagina, $paginasValidas, true)) {
            jsonResp(array('ok' => false, 'error' => 'Página no válida.'));
        }

        $stmt = $pdo->prepare(
            'SELECT id, seccion, kicker, titulo, descripcion, tag, items, orden, activo
             FROM Secciones
             WHERE pagina = ?
             ORDER BY orden ASC, id ASC'
        );
        $stmt->execute(array($pagina));
        $filas = $stmt->fetchAll();

        $secciones = array();
        foreach ($filas as $fila) {
            $items = $fila['items'];
            if ($items !== null && $items !== '') {
                $items = json_decode($items, true);
                if (!is_array($items)) $items = array();
            } else {
                $items = array();
            }

            $secciones[] = array(
                'id'          => (int)$fila['id'],
                'seccion'     => $fila['seccion'],
                'kicker'      => $fila['kicker'],
                'titulo'      => $fila['titulo'],
                'descripcion' => $fila['descripcion'],
                'tag'         => $fila['tag'],
                'items'       => $items,
                'orden'       => (int)$fila['orden'],
                'activo'      => $fila['activo']
            );
        }

        jsonResp(array('ok' => true, 'pagina' => $pagina, 'secciones' => $secciones));
    }

    if ($accion === 'guardar_seccion') {
        $pagina  = isset($entrada['pagina']) ? (string)$entrada['pagina'] : '';
        $seccion = isset($entrada['seccion']) ? (string)$entrada['seccion'] : '';

        if (!in_array($pagina, $paginasValidas, true) || $seccion === '') {
            jsonResp(array('ok' => false, 'error' => 'Página o sección no válida.'));
        }

        $kicker      = campoOpcional($entrada, 'kicker');
        $titulo      = campoOpcional($entrada, 'titulo');
        $descripcion = campoOpcional($entrada, 'descripcion');
        $tag         = campoOpcional($entrada, 'tag');

        // items: se espera un arreglo de tarjetas; se guarda como JSON.
        $items = isset($entrada['items']) && is_array($entrada['items'])
            ? $entrada['items']
            : array();
        $itemsJson = json_encode($items, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);

        $orden  = (int)campo($entrada, 'orden', 0);
        $activo = fieldActivo($entrada);

        $pdo->prepare(
            'INSERT INTO Secciones (pagina, seccion, kicker, titulo, descripcion, tag, items, orden, activo)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE
               kicker = VALUES(kicker), titulo = VALUES(titulo),
               descripcion = VALUES(descripcion), tag = VALUES(tag),
               items = VALUES(items), orden = VALUES(orden), activo = VALUES(activo)'
        )->execute(array($pagina, $seccion, $kicker, $titulo, $descripcion, $tag, $itemsJson, $orden, $activo));

        jsonResp(array('ok' => true));
    }

    jsonResp(array('ok' => false, 'error' => 'Acción desconocida.'));
} catch (Exception $e) {
    jsonResp(array('ok' => false, 'error' => 'Error del servidor al procesar la solicitud.'));
}

/**
 * Devuelve "activo"/"inactivo" desde la entrada (con valor por defecto).
 */
function fieldActivo($entrada)
{
    $v = isset($entrada['activo']) ? (string)$entrada['activo'] : 'activo';
    return in_array($v, array('activo', 'inactivo'), true) ? $v : 'activo';
}