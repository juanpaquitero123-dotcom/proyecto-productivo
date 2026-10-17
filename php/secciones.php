<?php
/**
 * ══════════════════════════════════════════════════════
 *  SECCIONES.PHP — Contenido por sección de cada página
 *  Endpoint público: secciones.php?pagina=academico
 *  Devuelve en JSON las secciones editables de una página:
 *  kicker, titulo, descripcion, tag e items (lista de tarjetas).
 * ══════════════════════════════════════════════════════
 */

require_once __DIR__ . '/config.php';

$paginas = array('nosotros', 'academico', 'estudiantes', 'padres', 'horarios');

try {
    $pdo = db();

    $pagina = isset($_GET['pagina']) ? trim($_GET['pagina']) : '';
    if (!in_array($pagina, $paginas, true)) {
        jsonResp(array(
            'ok'      => false,
            'error'   => 'Página no válida.',
            'paginas' => array_keys($paginas)
        ));
        exit;
    }

    $stmt = $pdo->prepare(
        'SELECT seccion, kicker, titulo, descripcion, tag, items
         FROM Secciones
         WHERE pagina = ? AND activo = "activo"
         ORDER BY orden ASC, id ASC'
    );
    $stmt->execute(array($pagina));
    $filas = $stmt->fetchAll();

    $secciones = array();
    foreach ($filas as $fila) {
        $items = $fila['items'];
        if ($items !== null && $items !== '') {
            $items = json_decode($items, true);
            if (!is_array($items)) {
                $items = array();
            }
        } else {
            $items = array();
        }

        $secciones[] = array(
            'seccion'     => $fila['seccion'],
            'kicker'      => $fila['kicker'],
            'titulo'      => $fila['titulo'],
            'descripcion' => $fila['descripcion'],
            'tag'         => $fila['tag'],
            'items'       => $items
        );
    }

    jsonResp(array(
        'ok'       => true,
        'pagina'   => $pagina,
        'secciones' => $secciones
    ));
} catch (Exception $e) {
    jsonResp(array(
        'ok'    => false,
        'error' => 'No se pudieron cargar las secciones de la página.'
    ));
}