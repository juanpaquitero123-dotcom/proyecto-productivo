<?php
/**
 * ══════════════════════════════════════════════════════
 *  CONTENIDO.PHP — Contenido público de la página de inicio
 *  Devuelve en JSON: info institucional, contacto, slides,
 *  próximos eventos, noticias, preguntas frecuentes,
 *  banda CTA, documentos y galerías por página, cargados desde MySQL.
 * ══════════════════════════════════════════════════════
 */

require_once __DIR__ . '/config.php';

function primerFila($pdo, $tabla)
{
    $stmt = $pdo->query("SELECT * FROM `{$tabla}` ORDER BY id ASC LIMIT 1");
    $fila = $stmt->fetch();
    return $fila ?: null;
}

/**
 * Adjunta las imágenes activas a cada elemento de una sección.
 */
function adjuntarImagenes(&$elementos, $listaImagenes, $seccion)
{
    foreach ($elementos as &$e) {
        $e['imagenes'] = array();
        foreach ($listaImagenes as $img) {
            if ($img['seccion'] === $seccion && (int)$img['elemento_id'] === (int)$e['id']) {
                $e['imagenes'][] = array('id' => (int)$img['id'], 'ruta' => $img['ruta']);
            }
        }
    }
    unset($e);
}

try {
    $pdo = db();

    $general  = primerFila($pdo, 'InfoGeneral');
    $contacto = primerFila($pdo, 'Contacto');

    $slides = $pdo->query(
        'SELECT id, titulo, subtitulo, pill, descripcion, btn_texto, btn_enlace, btn_texto2, btn_enlace2
         FROM Slides
         WHERE activo = "activo"
         ORDER BY orden ASC, id ASC'
    )->fetchAll();

    $eventos = $pdo->query(
        'SELECT id, nombre, dia, mes, hora_inicio, hora_fin, lugar, fecha
         FROM Eventos
         WHERE activo = "activo"
         ORDER BY orden ASC, fecha ASC'
    )->fetchAll();

    $noticias = $pdo->query(
        'SELECT id, titulo, resumen, fecha
         FROM Noticias
         WHERE activo = "activo"
         ORDER BY fecha DESC, id DESC'
    )->fetchAll();

    $preguntas = $pdo->query(
        'SELECT id, pregunta, respuesta
         FROM PreguntasFrecuentes
         WHERE activo = "activo"
         ORDER BY orden ASC, id ASC'
    )->fetchAll();

    $cta = primerFila($pdo, 'CtaInicio');

    $documentos = $pdo->query(
        'SELECT id, seccion, nombre, ruta, tamano
         FROM Documentos
         WHERE activo = "activo"
         ORDER BY seccion ASC, id ASC'
    )->fetchAll();
    foreach ($documentos as &$doc) {
        $doc['id']     = (int)$doc['id'];
        $doc['tamano'] = $doc['tamano'] !== null ? (int)$doc['tamano'] : null;
    }
    unset($doc);

    $imagenes = $pdo->query(
        'SELECT id, seccion, elemento_id, ruta
         FROM Imagenes
         WHERE activo = "activo"
         ORDER BY seccion ASC, elemento_id ASC, posicion ASC, id ASC'
    )->fetchAll();

    adjuntarImagenes($slides, $imagenes, 'slides');
    adjuntarImagenes($eventos, $imagenes, 'eventos');
    adjuntarImagenes($noticias, $imagenes, 'noticias');

    // Galerías por página: imágenes sueltas asociadas a cada página del sitio
    // (sección = nombre de la página, elemento único con id = 1).
    $paginas = array('academico', 'estudiantes', 'padres', 'horarios', 'contacto');
    $galeriasPagina = array();
    foreach ($paginas as $seccionPagina) {
        $elementoUnico = array(array('id' => 1));
        adjuntarImagenes($elementoUnico, $imagenes, $seccionPagina);
        $galeriasPagina[$seccionPagina] = $elementoUnico[0]['imagenes'];
    }

    // Instalaciones y beneficios: tarjetas estáticas con id 1..9 en "Nuestro Colegio".
    $instalaciones = array();
    for ($i = 1; $i <= 9; $i++) {
        $instalaciones[] = array('id' => $i);
    }
    adjuntarImagenes($instalaciones, $imagenes, 'instalaciones');
    $galeriasPagina['instalaciones'] = $instalaciones;

    // Símbolos institucionales: Escudo (1), Bandera (2), Himno (3).
    $simbolos = array();
    for ($i = 1; $i <= 3; $i++) {
        $simbolos[] = array('id' => $i);
    }
    adjuntarImagenes($simbolos, $imagenes, 'simbolos');
    $galeriasPagina['simbolos'] = $simbolos;

    jsonResp(array(
        'ok'        => true,
        'general'   => $general,
        'contacto'  => $contacto,
        'slides'    => $slides,
        'eventos'   => $eventos,
        'noticias'  => $noticias,
        'preguntas' => $preguntas,
        'cta'       => $cta,
        'documentos' => $documentos,
        'paginas'   => $galeriasPagina
    ));
} catch (Exception $e) {
    jsonResp(array(
        'ok'    => false,
        'error' => 'No se pudo cargar el contenido de la página.'
    ));
}