<?php
/**
 * ══════════════════════════════════════════════════════
 *  SCHEMA.PHP — Definición e instalación de la base de datos
 *  Base de datos: IeSanFelixAlDia
 *
 *  Contiene la estructura de la base de datos IeSanFelixAlDia
 *  y la rutina que la crea automáticamente junto con los
 *  usuarios iniciales (contraseñas encriptadas con bcrypt).
 *
 *  El login está SEPARADO POR ROL: cada tipo de cuenta vive
 *  en su propia tabla (sin columna "rol" porque es implícito):
 *    - Administradores → admin
 *    - Docentes        → docente
 *    - Estudiantes     → estudiante
 *    - Padres          → padre
 *
 *  Si existía la antigua tabla única "Usuarios", se migran sus
 *  filas a la tabla que corresponde y luego se elimina la tabla.
 *
 *  Requiere que config.php esté cargado.
 * ══════════════════════════════════════════════════════
 */

if (!defined('DB_NAME')) {
    exit('Este archivo debe cargarse desde config.php.');
}

/**
 * Versión del esquema que define este código.
 * SÚBELA cada vez que cambies la estructura de una tabla: al subirla,
 * las páginas siguientes detectan la diferencia y ejecutan el instalador
 * una sola vez (crear tablas, migrar columnas y sembrar lo que falte).
 * No hace falta subirla por cambios de contenido o de código PHP.
 *
 * v2: se añadió la tabla Agenda (visible para docentes y administrativos).
 */
define('ESQUEMA_VERSION', '2');

/**
 * ¿Está el esquema instalado y al día?
 * true → hay que ejecutar instalarBaseDatos().
 *
 * Se considera desactualizado si nunca se instaló (no existe la tabla de
 * administradores), si falta la tabla de configuración, si falta la tabla
 * de la agenda o si la versión guardada no coincide con ESQUEMA_VERSION.
 *
 * @param  PDO   $pdo Conexión con la base de datos ya seleccionada.
 * @return bool
 */
function esquemaDesactualizado($pdo)
{
    $tablas = array();
    foreach ($pdo->query('SHOW TABLES')->fetchAll(PDO::FETCH_COLUMN) as $t) {
        $tablas[strtolower($t)] = true;
    }

    if (!isset($tablas['administradores'])) {
        return true; // instalación nueva: nunca se corrió el instalador
    }
    if (!isset($tablas['configuracion'])) {
        return true; // instalación anterior a esta versión
    }
    if (!isset($tablas['agenda'])) {
        return true; // instalación anterior a la agenda
    }

    $stmt = $pdo->prepare('SELECT valor FROM Configuracion WHERE clave = ? LIMIT 1');
    $stmt->execute(array('esquema_version'));
    $guardada = $stmt->fetchColumn();

    return ($guardada === false) || ((string)$guardada !== (string)ESQUEMA_VERSION);
}

/**
 * Registra la versión del esquema que acaba de instalarse.
 *
 * @param PDO $pdo
 */
function guardarEsquemaVersion($pdo)
{
    $pdo->prepare(
        'INSERT INTO Configuracion (clave, valor) VALUES (?, ?)
         ON DUPLICATE KEY UPDATE valor = VALUES(valor)'
    )->execute(array('esquema_version', (string)ESQUEMA_VERSION));
}

/**
 * Usuarios iniciales del sistema.
 * Formato: [usuario, nombre, email|null, rol, estado, fecha, contraseña_plana]
 * La contraseña NUNCA se guarda en claro: se encripta con password_hash().
 */
function usuariosSemilla()
{
    return array(
        array('juanpaquitero123', 'Juan Pablo Quintero',  'juanpaquitero123@gmail.com', 'admin',      'activo',   '2026-01-10', '3126160960'),
        array('admin01',          'María López García',   'maria.lopez@salfelix.edu.co','admin',      'activo',   '2026-01-15', 'Admin@2026'),
        array('admin02',          'Juan Carlos Rojas',    'jcrojas@salfelix.edu.co',    'admin',      'activo',   '2026-01-20', 'Admin#Segura99'),
        array('doc01',            'Carlos Pérez Martínez',null,                         'docente',    'activo',   '2026-02-01', 'Docente2026!'),
        array('doc02',            'Ana Patricia Ruiz',    null,                         'docente',    'activo',   '2026-02-05', 'Profe#Ruiz22'),
        array('doc03',            'Luis Fernando Gómez',  null,                         'docente',    'inactivo', '2026-02-10', 'DocInactivo1'),
        array('est01',            'Andrés Felipe Díaz',   null,                         'estudiante', 'activo',   '2026-03-01', 'Estudiante1!'),
        array('est02',            'Laura Camila Torres',  null,                         'estudiante', 'activo',   '2026-03-03', 'Laura2026#'),
        array('est03',            'Santiago Moreno',      null,                         'estudiante', 'activo',   '2026-03-10', 'Santi@Est'),
        array('pad01',            'Roberto Díaz Herrera', null,                         'padre',      'activo',   '2026-03-15', 'Padre#Diaz1'),
        array('pad02',            'Carmen Lucía Vargas',  null,                         'padre',      'inactivo', '2026-03-20', 'Carmen2026!')
    );
}

/**
 * Estructura común a las 4 tablas por rol.
 * El rol NO es una columna: lo define la propia tabla.
 */
function sqlColumnasComunes()
{
    return '
        id              INT UNSIGNED     NOT NULL AUTO_INCREMENT,
        usuario         VARCHAR(50)      NOT NULL,
        nombre          VARCHAR(100)     NOT NULL,
        email           VARCHAR(120)     NULL DEFAULT NULL,
        estado          ENUM("activo","inactivo") NOT NULL DEFAULT "activo",
        fecha_creacion  DATE             NOT NULL,
        password_hash   VARCHAR(255)     NOT NULL,
        PRIMARY KEY (id),
        UNIQUE KEY uq_usuario (usuario),
        UNIQUE KEY uq_email (email)
    ) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci';
}

/**
 * Sentencias de creación de las tablas por rol.
 */
function sqlCrearTablasPorRol()
{
    $sql = array();
    foreach (rolesTablas() as $rol => $tabla) {
        $sql[$rol] = 'CREATE TABLE IF NOT EXISTS `' . $tabla . '` (' . sqlColumnasComunes();
    }
    return $sql;
}

/**
 * Datos de ejemplo del contenido institucional (página de inicio).
 * Cada entrada es un array ordenado igual que las columnas definidas
 * en semillarContenido().
 */
function contenidoSemilla()
{
    return array (
  'InfoGeneral' => 
  array (
    0 => 
    array (
      0 => 'Institución Educativa San Félix',
      1 => 'Formamos para el futuro',
      2 => 'Somos una institución educativa comprometida con la formación integral de nuestros estudiantes, promoviendo valores, conocimientos y habilidades que les permitan enfrentar los retos del futuro con responsabilidad y excelencia.',
      3 => 'Ser reconocidos como una institución líder en educación, formando ciudadanos comprometidos, innovadores y preparados para contribuir al desarrollo de la sociedad.',
      4 => '2026',
      5 => '324 434 61 91',
      6 => 'iesanfelixaldia@gmail.com',
      7 => 'San Félix, Colombia',
    ),
  ),
  'Contacto' => 
  array (
    0 => 
    array (
      0 => '324 434 61 91',
      1 => NULL,
      2 => 'iesanfelixaldia@gmail.com',
      3 => NULL,
      4 => 'San Félix, Colombia',
      5 => 'https://www.facebook.com/share/1BzNG8ZxmF/',
      6 => 'https://instagram.com',
      7 => 'https://www.youtube.com/@INSTITUCIONEDUCATIVASANFELIX',
      8 => 'Educar es sembrar hoy para cosechar mañana.',
    ),
  ),
  'Slides' => 
  array (
    0 => 
    array (
      0 => 'BIENVENIDOS',
      1 => 'IE SAN FÉLIX',
      2 => 'Año lectivo 2026',
      3 => 'Una comunidad educativa comprometida con la formación integral y sus valores.',
      4 => 'CONÓCENOS',
      5 => 'nosotros.html',
      6 => 'EXPLORAR',
      7 => 'academico.html',
      8 => 1,
    ),
    1 => 
    array (
      0 => 'NUESTRO COLEGIO',
      1 => 'MISIÓN Y VALORES',
      2 => 'Quiénes somos',
      3 => 'Formamos personas íntegras y competentes, comprometidas con su comunidad y su futuro.',
      4 => 'CONÓCENOS',
      5 => 'nosotros.html',
      6 => 'ESCRÍBENOS',
      7 => 'contacto.html',
      8 => 2,
    ),
    2 => 
    array (
      0 => 'ACADÉMICO',
      1 => 'PROYECTOS Y JORNADAS',
      2 => 'Vida académica',
      3 => 'Conoce nuestro plan de estudios, los proyectos pedagógicos y consulta los horarios de clases.',
      4 => 'VER PLAN',
      5 => 'academico.html',
      6 => 'HORARIOS',
      7 => 'horarios.html',
      8 => 3,
    ),
    3 => 
    array (
      0 => 'EVENTOS',
      1 => 'Y ÚLTIMAS NOTICIAS',
      2 => 'Comunidad San Félix',
      3 => 'Día de la Familia, Feria de Ciencias y más: entérate de todo lo que pasa en la institución.',
      4 => 'VER EVENTOS',
      5 => 'eventos.html',
      6 => 'NOTICIAS',
      7 => 'noticias.html',
      8 => 4,
    ),
  ),
  'Eventos' => 
  array (
    0 => 
    array (
      0 => 'Día de la Familia',
      1 => 15,
      2 => 'MAY',
      3 => '09:00',
      4 => '20:00',
      5 => 'Hogar Juvenil',
      6 => '2026-05-15',
      7 => 1,
    ),
    1 => 
    array (
      0 => 'Feria de Ciencias',
      1 => 22,
      2 => 'MAY',
      3 => '07:00',
      4 => '14:00',
      5 => 'Patio Central',
      6 => '2026-05-22',
      7 => 2,
    ),
    2 => 
    array (
      0 => 'Izada de Bandera',
      1 => 5,
      2 => 'JUN',
      3 => '07:00',
      4 => '08:00',
      5 => 'Patio Central',
      6 => '2026-06-05',
      7 => 3,
    ),
    3 => 
    array (
      0 => 'Gran Feria Familiar San Félix',
      1 => 15,
      2 => 'DIC',
      3 => '09:00',
      4 => '18:00',
      5 => 'Hogar Juvenil',
      6 => '2026-12-15',
      7 => 4,
    ),
  ),
  'Noticias' => 
  array (
    0 => 
    array (
      0 => 'Inicio del año escolar 2026',
      1 => 'Conoce las fechas importantes y novedades para este año lectivo.',
      2 => NULL,
      3 => '2026-04-25',
      4 => NULL,
    ),
    1 => 
    array (
      0 => 'Nuestros estudiantes brillan',
      1 => 'Felicitamos a nuestro equipo de robótica por su gran logro regional.',
      2 => NULL,
      3 => '2026-04-20',
      4 => NULL,
    ),
  ),
  'PreguntasFrecuentes' => 
  array (
    0 => 
    array (
      0 => '¿Cómo puedo inscribir a mi hijo/a?',
      1 => 'Debes acercarte a secretaría con documento de identidad del estudiante, carné de vacunas y certificados académicos. El proceso abre en octubre para el siguiente año lectivo.',
      2 => 1,
    ),
    1 => 
    array (
      0 => '¿Cómo puedo inscribir a mi hijo/a?',
      1 => 'Debes acercarte a secretaría con documento de identidad del estudiante, carné de vacunas y certificados académicos. El proceso abre en octubre para el siguiente año lectivo.',
      2 => 1,
    ),
    2 => 
    array (
      0 => '¿Cuáles son los horarios de atención de secretaría?',
      1 => 'Lunes a viernes de 7:30 am a 12:00 m y de 2:00 pm a 5:00 pm. Durante vacaciones se atiende solo en la mañana.',
      2 => 2,
    ),
    3 => 
    array (
      0 => '¿Dónde encuentro los horarios de clases?',
      1 => 'Puedes consultarlos en cualquier momento desde el menú principal en la sección Horarios, ahí publicamos los horarios actualizados por grado y jornada.',
      2 => 3,
    ),
    4 => 
    array (
      0 => '¿El colegio cuenta con restaurante escolar?',
      1 => 'Sí, contamos con restaurante escolar y programa de alimentación. Los menús semanales se publican en la sección de Noticias.',
      2 => 4,
    ),
    5 => 
    array (
      0 => '¿Cuáles son los horarios de atención de secretaría?',
      1 => 'Lunes a viernes de 7:30 am a 12:00 m y de 2:00 pm a 5:00 pm. Durante vacaciones se atiende solo en la mañana.',
      2 => 2,
    ),
    6 => 
    array (
      0 => '¿Cómo me comunico con un docente?',
      1 => 'Escríbenos por el formulario de contacto o solicita una cita en secretaría. Cada grado también tiene un grupo de WhatsApp atendido por el director de grupo.',
      2 => 5,
    ),
    7 => 
    array (
      0 => '¿Dónde encuentro los horarios de clases?',
      1 => 'Puedes consultarlos en cualquier momento desde el menú principal en la sección Horarios, ahí publicamos los horarios actualizados por grado y jornada.',
      2 => 3,
    ),
    8 => 
    array (
      0 => '¿El colegio cuenta con restaurante escolar?',
      1 => 'Sí, contamos con restaurante escolar y programa de alimentación. Los menús semanales se publican en la sección de Noticias.',
      2 => 4,
    ),
    9 => 
    array (
      0 => '¿Cómo me comunico con un docente?',
      1 => 'Escríbenos por el formulario de contacto o solicita una cita en secretaría. Cada grado también tiene un grupo de WhatsApp atendido por el director de grupo.',
      2 => 5,
    ),
  ),
  'Galeria' => 
  array (
    0 => 
    array (
      0 => 'Campeonato Interclases',
      1 => 'Agosto 2026 · Cancha principal',
      2 => 'fa-solid fa-futbol',
      3 => 'deportes',
      4 => 1,
    ),
    1 => 
    array (
      0 => 'Festival de la Canción',
      1 => 'Junio 2026 · Auditorio mayor',
      2 => 'fa-solid fa-music',
      3 => 'cultura',
      4 => 2,
    ),
    2 => 
    array (
      0 => 'Feria de Ciencias',
      1 => 'Mayo 2026 · Polideportivo',
      2 => 'fa-solid fa-flask',
      3 => 'academico',
      4 => 3,
    ),
    3 => 
    array (
      0 => 'Día de la Familia',
      1 => 'Mayo 2026 · Hogar Juvenil',
      2 => 'fa-solid fa-people-group',
      3 => 'comunidad',
      4 => 4,
    ),
    4 => 
    array (
      0 => 'Juegos Municipales',
      1 => 'Septiembre 2026 · Estadio municipal',
      2 => 'fa-solid fa-medal',
      3 => 'deportes',
      4 => 5,
    ),
    5 => 
    array (
      0 => 'Festival de Teatro Escolar',
      1 => 'Octubre 2026 · Plazoleta central',
      2 => 'fa-solid fa-masks-theater',
      3 => 'cultura',
      4 => 6,
    ),
    6 => 
    array (
      0 => 'Olimpiada de Robótica',
      1 => 'Julio 2026 · Sala de informática',
      2 => 'fa-solid fa-robot',
      3 => 'academico',
      4 => 7,
    ),
    7 => 
    array (
      0 => 'Jornada de Reforestación',
      1 => 'Abril 2026 · Zona verde norte',
      2 => 'fa-solid fa-tree',
      3 => 'comunidad',
      4 => 8,
    ),
  ),
  'CtaInicio' => 
  array (
    0 => 
    array (
      0 => '¿Listo para conocer nuestro proyecto educativo?',
      1 => 'Conoce todo lo que hace especial a la comunidad San Félix.',
      2 => 'Conócenos',
      3 => 'nosotros.html',
    ),
  ),
);
}

/**
 * Sentencias de creación de las tablas de contenido del sitio.
 */
function sqlCrearTablasContenido()
{
    return array(
        'InfoGeneral' => 'CREATE TABLE IF NOT EXISTS InfoGeneral (
            id              INT UNSIGNED     NOT NULL AUTO_INCREMENT,
            nombre_institucion VARCHAR(150)  NOT NULL,
            lema            VARCHAR(150)     NULL DEFAULT NULL,
            mision          TEXT             NULL,
            vision          TEXT             NULL,
            anio_lectivo    VARCHAR(10)      NULL DEFAULT NULL,
            telefono        VARCHAR(30)      NULL DEFAULT NULL,
            email           VARCHAR(120)     NULL DEFAULT NULL,
            direccion       VARCHAR(160)     NULL DEFAULT NULL,
            PRIMARY KEY (id)
        ) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci',

        'Contacto' => 'CREATE TABLE IF NOT EXISTS Contacto (
            id              INT UNSIGNED     NOT NULL AUTO_INCREMENT,
            tel1            VARCHAR(30)      NULL DEFAULT NULL,
            tel2            VARCHAR(30)      NULL DEFAULT NULL,
            email1          VARCHAR(120)     NULL DEFAULT NULL,
            email2          VARCHAR(120)     NULL DEFAULT NULL,
            direccion       VARCHAR(160)     NULL DEFAULT NULL,
            facebook        VARCHAR(255)     NULL DEFAULT NULL,
            instagram       VARCHAR(255)     NULL DEFAULT NULL,
            youtube         VARCHAR(255)     NULL DEFAULT NULL,
            frase           VARCHAR(255)     NULL DEFAULT NULL,
            PRIMARY KEY (id)
        ) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci',

        'Slides' => 'CREATE TABLE IF NOT EXISTS Slides (
            id              INT UNSIGNED     NOT NULL AUTO_INCREMENT,
            titulo          VARCHAR(150)     NOT NULL,
            subtitulo       VARCHAR(150)     NULL DEFAULT NULL,
            pill            VARCHAR(150)     NULL DEFAULT NULL,
            descripcion     VARCHAR(255)     NULL DEFAULT NULL,
            btn_texto       VARCHAR(60)      NULL DEFAULT NULL,
            btn_enlace      VARCHAR(160)     NULL DEFAULT NULL,
            btn_texto2      VARCHAR(60)      NULL DEFAULT NULL,
            btn_enlace2     VARCHAR(160)     NULL DEFAULT NULL,
            orden           INT UNSIGNED     NOT NULL DEFAULT 0,
            activo          ENUM("activo","inactivo") NOT NULL DEFAULT "activo",
            PRIMARY KEY (id)
        ) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci',

        'Eventos' => 'CREATE TABLE IF NOT EXISTS Eventos (
            id              INT UNSIGNED     NOT NULL AUTO_INCREMENT,
            nombre          VARCHAR(160)     NOT NULL,
            dia             TINYINT UNSIGNED NULL DEFAULT NULL,
            mes             VARCHAR(3)       NULL DEFAULT NULL,
            hora_inicio     VARCHAR(5)       NULL DEFAULT NULL,
            hora_fin        VARCHAR(5)       NULL DEFAULT NULL,
            lugar           VARCHAR(160)     NULL DEFAULT NULL,
            fecha           DATE             NULL DEFAULT NULL,
            orden           INT UNSIGNED     NOT NULL DEFAULT 0,
            activo          ENUM("activo","inactivo") NOT NULL DEFAULT "activo",
            PRIMARY KEY (id)
        ) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci',

        'Noticias' => 'CREATE TABLE IF NOT EXISTS Noticias (
            id              INT UNSIGNED     NOT NULL AUTO_INCREMENT,
            titulo          VARCHAR(200)     NOT NULL,
            resumen         VARCHAR(300)     NULL DEFAULT NULL,
            contenido       TEXT             NULL,
            fecha           DATE             NULL DEFAULT NULL,
            imagen          VARCHAR(255)     NULL DEFAULT NULL,
            activo          ENUM("activo","inactivo") NOT NULL DEFAULT "activo",
            PRIMARY KEY (id)
        ) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci',

        'PreguntasFrecuentes' => 'CREATE TABLE IF NOT EXISTS PreguntasFrecuentes (
            id              INT UNSIGNED     NOT NULL AUTO_INCREMENT,
            pregunta        VARCHAR(255)     NOT NULL,
            respuesta       TEXT             NULL,
            orden           INT UNSIGNED     NOT NULL DEFAULT 0,
            activo          ENUM("activo","inactivo") NOT NULL DEFAULT "activo",
            PRIMARY KEY (id)
        ) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci',

        'Galeria' => 'CREATE TABLE IF NOT EXISTS Galeria (
            id              INT UNSIGNED     NOT NULL AUTO_INCREMENT,
            titulo          VARCHAR(160)     NOT NULL,
            detalle         VARCHAR(255)     NULL DEFAULT NULL,
            icono           VARCHAR(60)      NULL DEFAULT NULL,
            categoria       ENUM("deportes","cultura","academico","comunidad") NOT NULL DEFAULT "cultura",
            orden           INT UNSIGNED     NOT NULL DEFAULT 0,
            activo          ENUM("activo","inactivo") NOT NULL DEFAULT "activo",
            PRIMARY KEY (id)
        ) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci',

        'CtaInicio' => 'CREATE TABLE IF NOT EXISTS CtaInicio (
            id              INT UNSIGNED     NOT NULL AUTO_INCREMENT,
            titulo          VARCHAR(200)     NOT NULL,
            texto           VARCHAR(255)     NULL DEFAULT NULL,
            btn_texto       VARCHAR(60)      NULL DEFAULT NULL,
            btn_enlace      VARCHAR(160)     NULL DEFAULT NULL,
            PRIMARY KEY (id)
        ) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci',

        'Documentos' => 'CREATE TABLE IF NOT EXISTS Documentos (
            id              INT UNSIGNED     NOT NULL AUTO_INCREMENT,
            seccion         VARCHAR(30)      NOT NULL,
            nombre          VARCHAR(200)     NULL DEFAULT NULL,
            nombre_original VARCHAR(200)     NULL DEFAULT NULL,
            ruta            VARCHAR(255)     NOT NULL,
            tamano          INT UNSIGNED     NULL DEFAULT NULL,
            activo          ENUM("activo","inactivo") NOT NULL DEFAULT "activo",
            PRIMARY KEY (id),
            UNIQUE KEY uq_documentos_seccion (seccion)
        ) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci',

        // Secciones editables de cada página pública (nosotros, académico,
        // estudiantes, padres y horarios). El campo "items" guarda como JSON
        // las tarjetas, cifras, hitos o filas de horarios de la sección.
        'Secciones' => 'CREATE TABLE IF NOT EXISTS Secciones (
            id              INT UNSIGNED     NOT NULL AUTO_INCREMENT,
            pagina          VARCHAR(40)      NOT NULL,
            seccion         VARCHAR(60)      NOT NULL,
            kicker          VARCHAR(150)     NULL DEFAULT NULL,
            titulo          VARCHAR(200)     NULL DEFAULT NULL,
            descripcion     TEXT             NULL,
            tag             VARCHAR(100)     NULL DEFAULT NULL,
            items           LONGTEXT         NULL,
            orden           INT UNSIGNED     NOT NULL DEFAULT 0,
            activo          ENUM("activo","inactivo") NOT NULL DEFAULT "activo",
            PRIMARY KEY (id),
            UNIQUE KEY uq_pagina_seccion (pagina, seccion)
        ) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci',

        // Guarda la versión del esquema instalada para no ejecutar el
        // instalador completo en cada petición (ver esquemaDesactualizado()).
        'Configuracion' => 'CREATE TABLE IF NOT EXISTS Configuracion (
            clave  VARCHAR(60)  NOT NULL,
            valor  VARCHAR(255) NULL DEFAULT NULL,
            PRIMARY KEY (clave)
        ) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci'
    );
}

/**
 * Tabla de imágenes por elemento.
 * Permite adjuntar una o varias imágenes a cada slide, evento o noticia.
 */
function sqlCrearTablaImagenes()
{
    return array(
        'Imagenes' => 'CREATE TABLE IF NOT EXISTS Imagenes (
            id           INT UNSIGNED    NOT NULL AUTO_INCREMENT,
            seccion      VARCHAR(20)     NOT NULL,
            elemento_id  INT UNSIGNED    NOT NULL,
            ruta         VARCHAR(255)    NOT NULL,
            posicion     INT UNSIGNED    NOT NULL DEFAULT 0,
            activo       ENUM("activo","inactivo") NOT NULL DEFAULT "activo",
            PRIMARY KEY (id),
            KEY idx_imagenes_seccion (seccion, elemento_id)
        ) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci'
    );
}

/**
 * Tabla de la Agenda institucional.
 * Solo es visible para docentes y administrativos: guarda reuniones,
 * recordatorios y actividades internas de la institución.
 */
function sqlCrearTablaAgenda()
{
    return array(
        'Agenda' => 'CREATE TABLE IF NOT EXISTS Agenda (
            id              INT UNSIGNED    NOT NULL AUTO_INCREMENT,
            titulo          VARCHAR(160)    NOT NULL,
            descripcion     TEXT            NULL,
            fecha           DATE            NOT NULL,
            hora_inicio     VARCHAR(5)      NULL DEFAULT NULL,
            hora_fin        VARCHAR(5)      NULL DEFAULT NULL,
            lugar           VARCHAR(160)    NULL DEFAULT NULL,
            tipo            ENUM("evento","reunion","recordatorio","academico") NOT NULL DEFAULT "evento",
            autor_id        INT UNSIGNED    NULL DEFAULT NULL,
            autor_rol       VARCHAR(20)     NULL DEFAULT NULL,
            autor_nombre    VARCHAR(120)    NULL DEFAULT NULL,
            fecha_creacion  DATETIME        NOT NULL,
            activo          ENUM("activo","inactivo") NOT NULL DEFAULT "activo",
            PRIMARY KEY (id),
            KEY idx_agenda_fecha (fecha)
        ) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci'
    );
}

/**
 * ¿Existe una tabla con ese nombre (comparación sin distinguir mayúsculas)?
 */
function existeTabla($pdo, $nombre)
{
    $filas = $pdo->query('SHOW TABLES')->fetchAll(PDO::FETCH_COLUMN);
    foreach ($filas as $f) {
        if (strcasecmp($f, $nombre) === 0) {
            return true;
        }
    }
    return false;
}

/**
 * Columnas que deben existir en cada tabla de contenido.
 * Si la tabla se creó con un esquema anterior y le faltan columnas,
 * CREATE TABLE IF NOT EXISTS no las agrega → se añaden aquí.
 */
function columnasEsperadasContenido()
{
    return array(
        'InfoGeneral' => array(
            'nombre_institucion' => 'VARCHAR(150) NULL DEFAULT NULL',
            'lema'               => 'VARCHAR(150) NULL DEFAULT NULL',
            'mision'             => 'TEXT NULL DEFAULT NULL',
            'vision'             => 'TEXT NULL DEFAULT NULL',
            'anio_lectivo'       => 'VARCHAR(10) NULL DEFAULT NULL',
            'telefono'           => 'VARCHAR(30) NULL DEFAULT NULL',
            'email'              => 'VARCHAR(120) NULL DEFAULT NULL',
            'direccion'          => 'VARCHAR(160) NULL DEFAULT NULL'
        ),
        'Contacto' => array(
            'tel1'       => 'VARCHAR(30) NULL DEFAULT NULL',
            'tel2'       => 'VARCHAR(30) NULL DEFAULT NULL',
            'email1'     => 'VARCHAR(120) NULL DEFAULT NULL',
            'email2'     => 'VARCHAR(120) NULL DEFAULT NULL',
            'direccion'  => 'VARCHAR(160) NULL DEFAULT NULL',
            'facebook'   => 'VARCHAR(255) NULL DEFAULT NULL',
            'instagram'  => 'VARCHAR(255) NULL DEFAULT NULL',
            'youtube'    => 'VARCHAR(255) NULL DEFAULT NULL',
            'frase'      => 'VARCHAR(255) NULL DEFAULT NULL'
        ),
        'Slides' => array(
            'titulo'       => 'VARCHAR(150) NULL DEFAULT NULL',
            'subtitulo'    => 'VARCHAR(150) NULL DEFAULT NULL',
            'pill'         => 'VARCHAR(150) NULL DEFAULT NULL',
            'descripcion'  => 'VARCHAR(255) NULL DEFAULT NULL',
            'btn_texto'    => 'VARCHAR(60) NULL DEFAULT NULL',
            'btn_enlace'   => 'VARCHAR(160) NULL DEFAULT NULL',
            'btn_texto2'   => 'VARCHAR(60) NULL DEFAULT NULL',
            'btn_enlace2'  => 'VARCHAR(160) NULL DEFAULT NULL',
            'orden'        => 'INT UNSIGNED NOT NULL DEFAULT 0',
            'activo'       => 'ENUM("activo","inactivo") NOT NULL DEFAULT "activo"'
        ),
        'Eventos' => array(
            'nombre'      => 'VARCHAR(160) NULL DEFAULT NULL',
            'dia'         => 'TINYINT UNSIGNED NULL DEFAULT NULL',
            'mes'         => 'VARCHAR(3) NULL DEFAULT NULL',
            'hora_inicio' => 'VARCHAR(5) NULL DEFAULT NULL',
            'hora_fin'    => 'VARCHAR(5) NULL DEFAULT NULL',
            'lugar'       => 'VARCHAR(160) NULL DEFAULT NULL',
            'fecha'       => 'DATE NULL DEFAULT NULL',
            'orden'       => 'INT UNSIGNED NOT NULL DEFAULT 0',
            'activo'      => 'ENUM("activo","inactivo") NOT NULL DEFAULT "activo"'
        ),
        'Noticias' => array(
            'titulo'    => 'VARCHAR(200) NULL DEFAULT NULL',
            'resumen'   => 'VARCHAR(300) NULL DEFAULT NULL',
            'contenido' => 'TEXT NULL DEFAULT NULL',
            'fecha'     => 'DATE NULL DEFAULT NULL',
            'imagen'    => 'VARCHAR(255) NULL DEFAULT NULL',
            'activo'    => 'ENUM("activo","inactivo") NOT NULL DEFAULT "activo"'
        ),
        'PreguntasFrecuentes' => array(
            'pregunta'  => 'VARCHAR(255) NULL DEFAULT NULL',
            'respuesta' => 'TEXT NULL DEFAULT NULL',
            'orden'     => 'INT UNSIGNED NOT NULL DEFAULT 0',
            'activo'    => 'ENUM("activo","inactivo") NOT NULL DEFAULT "activo"'
        ),
        'Galeria' => array(
            'titulo'    => 'VARCHAR(160) NULL DEFAULT NULL',
            'detalle'   => 'VARCHAR(255) NULL DEFAULT NULL',
            'icono'     => 'VARCHAR(60) NULL DEFAULT NULL',
            'categoria' => 'ENUM("deportes","cultura","academico","comunidad") NOT NULL DEFAULT "cultura"',
            'orden'     => 'INT UNSIGNED NOT NULL DEFAULT 0',
            'activo'    => 'ENUM("activo","inactivo") NOT NULL DEFAULT "activo"'
        ),
        'CtaInicio' => array(
            'titulo'    => 'VARCHAR(200) NULL DEFAULT NULL',
            'texto'     => 'VARCHAR(255) NULL DEFAULT NULL',
            'btn_texto' => 'VARCHAR(60) NULL DEFAULT NULL',
            'btn_enlace'=> 'VARCHAR(160) NULL DEFAULT NULL'
        ),
        'Documentos' => array(
            'seccion'         => 'VARCHAR(30) NULL DEFAULT NULL',
            'nombre'          => 'VARCHAR(200) NULL DEFAULT NULL',
            'nombre_original' => 'VARCHAR(200) NULL DEFAULT NULL',
            'ruta'            => 'VARCHAR(255) NULL DEFAULT NULL',
            'tamano'          => 'INT UNSIGNED NULL DEFAULT NULL',
            'activo'          => 'ENUM("activo","inactivo") NOT NULL DEFAULT "activo"'
        )
    );
}

/**
 * Añade a cada tabla de contenido existente las columnas que le falten.
 * Idempotente: si la tabla no existe la crea sqlCrearTablasContenido();
 * si ya existe con el esquema correcto no hace nada.
 */
function migrarTablasContenido($pdo)
{
    $filas = $pdo->query(
        'SELECT TABLE_NAME, COLUMN_NAME FROM information_schema.COLUMNS
         WHERE TABLE_SCHEMA = ' . $pdo->quote(DB_NAME)
    )->fetchAll();

    $existentes = array();
    foreach ($filas as $f) {
        $existentes[$f['TABLE_NAME']][] = $f['COLUMN_NAME'];
    }

    foreach (columnasEsperadasContenido() as $tabla => $cols) {
        if (!isset($existentes[$tabla])) {
            continue; // la crea sqlCrearTablasContenido()
        }
        $actuales = array_flip($existentes[$tabla]);
        foreach ($cols as $col => $tipo) {
            if (isset($actuales[$col])) {
                continue;
            }
            $pdo->exec('ALTER TABLE `' . $tabla . '` ADD COLUMN `' . $col . '` ' . $tipo);
        }
    }
}

/**
 * Actualiza los enlaces de redes de la tabla Contacto que aún tengan
 * los valores de ejemplo ("https://facebook.com", "https://youtube.com").
 * Se reemplazan por los enlaces reales de la institución SOLO cuando el
 * valor guardado es exactamente el marcador de posición, para no pisar
 * enlaces que el administrador haya cambiado desde el panel.
 *
 * @return int Cantidad de celdas actualizadas (0 después de la primera vez).
 */
function actualizarContactoRedes($pdo)
{
    $cambios = array(
        array('facebook', 'https://facebook.com', 'https://www.facebook.com/share/1BzNG8ZxmF/'),
        array('youtube',  'https://youtube.com',  'https://www.youtube.com/@INSTITUCIONEDUCATIVASANFELIX')
    );

    $actualizados = 0;
    foreach ($cambios as $c) {
        $stmt = $pdo->prepare('UPDATE Contacto SET `' . $c[0] . '` = ? WHERE `' . $c[0] . '` = ?');
        $stmt->execute(array($c[2], $c[1]));
        $actualizados += $stmt->rowCount();
    }

    return $actualizados;
}

/**
 * Inserta el contenido de ejemplo solo si InfoGeneral está vacía.
 * @return int Cantidad de filas sembradas.
 */
function semillarContenido($pdo)
{
    $existentes = (int)$pdo->query('SELECT COUNT(*) FROM InfoGeneral')->fetchColumn();
    if ($existentes > 0) {
        return 0;
    }

    $columnas = array(
        'InfoGeneral' => array('nombre_institucion', 'lema', 'mision', 'vision', 'anio_lectivo', 'telefono', 'email', 'direccion'),
        'Contacto'    => array('tel1', 'tel2', 'email1', 'email2', 'direccion', 'facebook', 'instagram', 'youtube', 'frase'),
        'Slides'      => array('titulo', 'subtitulo', 'pill', 'descripcion', 'btn_texto', 'btn_enlace', 'btn_texto2', 'btn_enlace2', 'orden'),
        'Eventos'     => array('nombre', 'dia', 'mes', 'hora_inicio', 'hora_fin', 'lugar', 'fecha', 'orden'),
        'Noticias'    => array('titulo', 'resumen', 'contenido', 'fecha', 'imagen'),
        'PreguntasFrecuentes' => array('pregunta', 'respuesta', 'orden'),
        'Galeria'     => array('titulo', 'detalle', 'icono', 'categoria', 'orden'),
        'CtaInicio'   => array('titulo', 'texto', 'btn_texto', 'btn_enlace')
    );

    $sembrado = 0;
    foreach (contenidoSemilla() as $tabla => $filas) {
        $cols   = $columnas[$tabla];
        $marcas = implode(', ', array_fill(0, count($cols), '?'));
        $stmt   = $pdo->prepare(
            'INSERT IGNORE INTO `' . $tabla . '` (`' . implode('`, `', $cols) . '`) VALUES (' . $marcas . ')'
        );
        foreach ($filas as $fila) {
            $stmt->execute($fila);
            $sembrado++;
        }
    }

    return $sembrado;
}

/**
 * Sembrado específico de las secciones de la página de inicio
 * (FAQ, galería y banda CTA) para instalaciones existentes:
 * solo se siembra si la tabla correspondiente está vacía, así se
 * conservan las ediciones que ya haya hecho un administrador.
 * @return int Cantidad de filas sembradas.
 */
function semillarContenidoInicioSiVacio($pdo)
{
    $sembrado = 0;
    $columnas = array(
        'PreguntasFrecuentes' => array('pregunta', 'respuesta', 'orden'),
        'Galeria'             => array('titulo', 'detalle', 'icono', 'categoria', 'orden'),
        'CtaInicio'           => array('titulo', 'texto', 'btn_texto', 'btn_enlace')
    );

    $semilla = contenidoSemilla();

    foreach ($columnas as $tabla => $cols) {
        $total = (int)$pdo->query("SELECT COUNT(*) FROM `{$tabla}`")->fetchColumn();
        if ($total > 0) {
            continue;
        }

        $marcas = implode(', ', array_fill(0, count($cols), '?'));
        $stmt = $pdo->prepare(
            'INSERT IGNORE INTO `' . $tabla . '` (`' . implode('`, `', $cols) . '`) VALUES (' . $marcas . ')'
        );

        if (!isset($semilla[$tabla])) {
            continue;
        }
        foreach ($semilla[$tabla] as $fila) {
            $stmt->execute($fila);
            $sembrado++;
        }
    }

    return $sembrado;
}

/**
 * Genera los bloques de una jornada asignando materias de ejemplo por grado.
 * Cada bloque de clase rota el pool de asignaturas según la posición k
 * (índice de hora de clase; los descansos no cuentan). Los descansos no
 * llevan materias.
 *
 * @param array $horas Pares [inicio, fin, esDescanso] de la jornada.
 * @param array $pool  Lista de asignaturas de ejemplo.
 * @param int   $n     Cantidad de grados.
 * @return array Bloques [inicio, fin, descanso, materias[]].
 */
function bloquesHorarioConMaterias(array $horas, array $pool, $n)
{
    $plen    = count($pool);
    $k       = 0; // índice de bloque de clase (los descansos no cuentan)
    $bloques = array();

    foreach ($horas as $h) {
        if ($h[2]) {
            $bloques[] = array('inicio' => $h[0], 'fin' => $h[1], 'descanso' => true, 'materias' => array());
            continue;
        }
        $materias = array();
        for ($g = 0; $g < $n; $g++) {
            $materias[] = $pool[($g + $k * 5) % $plen];
        }
        $bloques[] = array('inicio' => $h[0], 'fin' => $h[1], 'descanso' => false, 'materias' => $materias);
        $k++;
    }

    return $bloques;
}

/**
 * Datos por defecto del horario de clases por grado.
 * Estructura guardada en items[0] de la sección "horario-clases":
 *   { grados: [ { titulo, icono } ],
 *     dias:   [ { titulo, bloques[] } ] }
 * "materias" de cada bloque de clase va alineado al orden de "grados".
 * Cada día de la semana (Lunes a Viernes) tiene su propio horario.
 * Lunes a jueves: jornada estándar de 7 horas de 55 minutos (8:00 AM a
 * 2:45 PM) con un descanso de 20 minutos (10:45 a 11:05 AM) y la MISMA
 * distribución de materias.
 * Viernes: la misma estructura, pero cada hora de clase dura 45 minutos
 * (8:00 AM a 1:35 PM), con descanso de 10:15 a 10:35 AM.
 * Las asignaturas son de ejemplo y el administrador las puede modificar
 * desde el panel.
 */
function datosHorarioClasesSemilla()
{
    $grados = array(
        array('titulo' => 'Preescolar', 'icono' => 'fa-solid fa-child-reaching'),
        array('titulo' => 'Grado 1°',   'icono' => 'fa-solid fa-book-open'),
        array('titulo' => 'Grado 2°',   'icono' => 'fa-solid fa-book'),
        array('titulo' => 'Grado 3°',   'icono' => 'fa-solid fa-book-open-reader'),
        array('titulo' => 'Grado 4°',   'icono' => 'fa-solid fa-book'),
        array('titulo' => 'Grado 5°',   'icono' => 'fa-solid fa-award'),
        array('titulo' => 'Grado 6°',   'icono' => 'fa-solid fa-school'),
        array('titulo' => 'Grado 7°',   'icono' => 'fa-solid fa-building-columns'),
        array('titulo' => 'Grado 8°',   'icono' => 'fa-solid fa-flask'),
        array('titulo' => 'Grado 9°',   'icono' => 'fa-solid fa-laptop-code'),
        array('titulo' => 'Grado 10°',  'icono' => 'fa-solid fa-graduation-cap'),
        array('titulo' => 'Grado 11°',  'icono' => 'fa-solid fa-user-graduate')
    );

    $pool = array(
        'Matemáticas', 'Lengua Castellana', 'Ciencias Naturales', 'Ciencias Sociales',
        'Inglés', 'Tecnología', 'Educación Física', 'Artística',
        'Ética y Valores', 'Religión', 'Emprendimiento', 'Lectura Crítica'
    );

    $horasLunesJueves = array(
        array('08:00', '08:55', false),
        array('08:55', '09:50', false),
        array('09:50', '10:45', false),
        array('10:45', '11:05', true), // descanso
        array('11:05', '12:00', false),
        array('12:00', '12:55', false),
        array('12:55', '13:50', false),
        array('13:50', '14:45', false)
    );

    $horasViernes = array(
        array('08:00', '08:45', false),
        array('08:45', '09:30', false),
        array('09:30', '10:15', false),
        array('10:15', '10:35', true), // descanso
        array('10:35', '11:20', false),
        array('11:20', '12:05', false),
        array('12:05', '12:50', false),
        array('12:50', '13:35', false)
    );

    $n = count($grados);

    $bloquesLunesJueves = bloquesHorarioConMaterias($horasLunesJueves, $pool, $n);
    $bloquesViernes     = bloquesHorarioConMaterias($horasViernes, $pool, $n);

    return array(array(
        'grados' => $grados,
        'dias'   => array(
            array('titulo' => 'Lunes',     'bloques' => $bloquesLunesJueves),
            array('titulo' => 'Martes',    'bloques' => $bloquesLunesJueves),
            array('titulo' => 'Miércoles', 'bloques' => $bloquesLunesJueves),
            array('titulo' => 'Jueves',    'bloques' => $bloquesLunesJueves),
            array('titulo' => 'Viernes',   'bloques' => $bloquesViernes)
        )
    ));
}

/**
 * Contenido por defecto de la tabla Secciones (todas las páginas públicas).
 * Cada entrada: [pagina, seccion, kicker, titulo, descripcion, tag, items(JSON), orden]
 * La tabla "items" guarda como JSON la lista de tarjetas/cifras/hitos de la sección.
 */
function seccionesSemilla()
{
    return array (
  'academico' => 
  array (
    0 => 
    array (
      0 => 'academico',
      1 => 'banner',
      2 => NULL,
      3 => 'Académico',
      4 => 'Niveles educativos y modelos de formación para nuestros estudiantes.',
      5 => 'Modelo educativo',
      6 => 
      array (
      ),
      7 => 1,
    ),
    1 => 
    array (
      0 => 'academico',
      1 => 'niveles',
      2 => 'Niveles',
      3 => 'Preescolar, Básica y Media',
      4 => 'Una propuesta académica que acompaña cada etapa del desarrollo.',
      5 => NULL,
      6 => 
      array (
        0 => 
        array (
          'icono' => 'fa-solid fa-baby',
          'etiqueta' => 'Nivel Inicial',
          'titulo' => 'Preescolar',
          'texto' => 'Niños de 3 a 5 años. Habilidades motoras, cognitivas y socioemocionales a través del juego.',
          'aspectos' => 
          array (
            0 => 'Pensamiento creativo',
            1 => 'Motricidad fina y gruesa',
            2 => 'Socialización temprana',
            3 => 'Iniciación a la lectoescritura',
          ),
        ),
        1 => 
        array (
          'icono' => 'fa-solid fa-book-open',
          'etiqueta' => 'Nivel Básico',
          'titulo' => 'Educación Básica',
          'texto' => 'De 1.° a 9.° grado. Currículo flexible orientado al pensamiento crítico y la resolución de problemas.',
          'aspectos' => 
          array (
            0 => 'Formación integral en áreas fundamentales',
            1 => 'Proyectos de aula y de aula-escuela',
            2 => 'Programas de inglés y tecnología',
            3 => 'Formación en valores y ciudadanía',
          ),
        ),
        2 => 
        array (
          'icono' => 'fa-solid fa-graduation-cap',
          'etiqueta' => 'Nivel Superior',
          'titulo' => 'Educación Media',
          'texto' => 'De 10.° a 11.° grado. Preparación para la educación superior y el mundo laboral con acompañamiento personalizado.',
          'aspectos' => 
          array (
            0 => 'Bachillerato académico',
            1 => 'Orientación vocacional y profesional',
            2 => 'Investigación y pensamiento crítico',
            3 => 'Preparación para pruebas Saber 11',
          ),
        ),
      ),
      7 => 2,
    ),
    2 => 
    array (
      0 => 'academico',
      1 => 'areas',
      2 => 'Áreas',
      3 => 'Formación por Competencias',
      4 => 'Aprendizajes significativos orientados al proyecto de vida.',
      5 => NULL,
      6 => 
      array (
        0 => 
        array (
          'icono' => 'fa-solid fa-calculator',
          'titulo' => 'Matemáticas',
          'texto' => 'Razonamiento lógico y pensamiento analítico para resolver problemas reales.',
        ),
        1 => 
        array (
          'icono' => 'fa-solid fa-language',
          'titulo' => 'Lengua Castellana',
          'texto' => 'Lectura crítica, escritura creativa y comunicación oral efectiva.',
        ),
        2 => 
        array (
          'icono' => 'fa-solid fa-flask',
          'titulo' => 'Ciencias Naturales',
          'texto' => 'Exploración del mundo natural y cuidado del medio ambiente.',
        ),
        3 => 
        array (
          'icono' => 'fa-solid fa-globe-americas',
          'titulo' => 'Ciencias Sociales',
          'texto' => 'Historia, geografía, cultura y participación ciudadana activa.',
        ),
        4 => 
        array (
          'icono' => 'fa-solid fa-language',
          'titulo' => 'Inglés',
          'texto' => 'Dominio progresivo del inglés para la comunicación global.',
        ),
        5 => 
        array (
          'icono' => 'fa-solid fa-desktop',
          'titulo' => 'Tecnología e Informática',
          'texto' => 'Habilidades digitales, robótica y uso responsable de las TIC.',
        ),
        6 => 
        array (
          'icono' => 'fa-solid fa-palette',
          'titulo' => 'Educación Artística',
          'texto' => 'Plástica, música y teatro para desarrollar la creatividad.',
        ),
        7 => 
        array (
          'icono' => 'fa-solid fa-person-running',
          'titulo' => 'Educación Física',
          'texto' => 'Hábitos saludables, valores deportivos y recreación.',
        ),
        8 => 
        array (
          'icono' => 'fa-solid fa-book-bible',
          'titulo' => 'Ethos / Religión',
          'texto' => 'Valores, ética y espiritualidad que fortalecen la identidad.',
        ),
      ),
      7 => 3,
    ),
    3 => 
    array (
      0 => 'academico',
      1 => 'plan',
      2 => 'Estructura',
      3 => 'Plan de Estudios',
      4 => 'Un modelo pedagógico flexible, contextualizado y centrado en el estudiante.',
      5 => NULL,
      6 => 
      array (
        0 => 
        array (
          'icono' => 'fa-solid fa-chalkboard-user',
          'titulo' => 'Ejes Transversales',
          'texto' => 'Valores, ambiente, tecnología, paz y derechos humanos en todas las áreas.',
        ),
        1 => 
        array (
          'icono' => 'fa-solid fa-diagram-project',
          'titulo' => 'Proyectos de Aula',
          'texto' => 'Aprendizaje que conecta las áreas con la comunidad y el entorno.',
        ),
        2 => 
        array (
          'icono' => 'fa-solid fa-book-open-reader',
          'titulo' => 'Plataforma Virtual',
          'texto' => 'Contenidos digitales, tareas en línea y seguimiento académico virtual.',
        ),
        3 => 
        array (
          'icono' => 'fa-solid fa-users',
          'titulo' => 'Acompañamiento Tutorial',
          'texto' => 'Acompañamiento académico, emocional y vocacional en cada curso.',
        ),
      ),
      7 => 4,
    ),
    4 => 
    array (
      0 => 'academico',
      1 => 'proyectos',
      2 => 'Innovación',
      3 => 'Proyectos Pedagógicos',
      4 => 'Iniciativas que enriquecen la experiencia educativa más allá del aula.',
      5 => NULL,
      6 => 
      array (
        0 => 
        array (
          'icono' => 'fa-solid fa-robot',
          'tag' => 'STEAM',
          'titulo' => 'Robótica y Programación',
          'texto' => 'Pensamiento computacional, prototipos y programación desde los primeros grados.',
        ),
        1 => 
        array (
          'icono' => 'fa-solid fa-seedling',
          'tag' => 'Ambiental',
          'titulo' => 'Ecoescuela',
          'texto' => 'Huerta, reciclaje, ahorro de agua y energía. Ciudadanos comprometidos con el planeta.',
        ),
        2 => 
        array (
          'icono' => 'fa-solid fa-book-open',
          'tag' => 'Cultural',
          'titulo' => 'Lectura Crítica',
          'texto' => 'Plan lector con bibliotecas de aula, clubes de lectura y festivales literarios.',
        ),
        3 => 
        array (
          'icono' => 'fa-solid fa-globe',
          'tag' => 'Global',
          'titulo' => 'Proyecto de Inglés',
          'texto' => 'Clases dinámicas, eventos y talleres conversacionales en inglés.',
        ),
        4 => 
        array (
          'icono' => 'fa-solid fa-heart',
          'tag' => 'Bienestar',
          'titulo' => 'Convivencia Escolar',
          'texto' => 'Prevención del acoso, inteligencia emocional, mediación y valores.',
        ),
        5 => 
        array (
          'icono' => 'fa-solid fa-trophy',
          'tag' => 'Deportivo',
          'titulo' => 'Formación Deportiva',
          'texto' => 'Fútbol, baloncesto, atletismo y recreación intercolegiados.',
        ),
      ),
      7 => 5,
    ),
    5 => 
    array (
      0 => 'academico',
      1 => 'cifras',
      2 => 'Cifras',
      3 => 'Lo que nos define',
      4 => 'Resultados que reflejan nuestro compromiso con la calidad educativa.',
      5 => NULL,
      6 => 
      array (
        0 => 
        array (
          'icono' => 'fa-solid fa-user-graduate',
          'numero' => '850',
          'sufijo' => '+',
          'texto' => 'Estudiantes en formación',
        ),
        1 => 
        array (
          'icono' => 'fa-solid fa-chalkboard-user',
          'numero' => '45',
          'sufijo' => '',
          'texto' => 'Docentes calificados',
        ),
        2 => 
        array (
          'icono' => 'fa-solid fa-book',
          'numero' => '9',
          'sufijo' => '',
          'texto' => 'Áreas del conocimiento',
        ),
        3 => 
        array (
          'icono' => 'fa-solid fa-school',
          'numero' => '3',
          'sufijo' => '',
          'texto' => 'Niveles educativos',
        ),
      ),
      7 => 6,
    ),
    6 => 
    array (
      0 => 'academico',
      1 => 'calidad',
      2 => 'Compromiso',
      3 => 'Calidad Educativa',
      4 => 'Estrategias que aseguran el aprendizaje y la formación integral.',
      5 => NULL,
      6 => 
      array (
        0 => 
        array (
          'icono' => 'fa-solid fa-chart-line',
          'titulo' => 'Evaluación Formativa',
          'texto' => 'Seguimiento continuo del progreso de cada estudiante.',
        ),
        1 => 
        array (
          'icono' => 'fa-solid fa-laptop',
          'titulo' => 'Aula Virtual',
          'texto' => 'Recursos interactivos para complementar el aprendizaje.',
        ),
        2 => 
        array (
          'icono' => 'fa-solid fa-people-group',
          'titulo' => 'Grupos Reducidos',
          'texto' => 'Grupos pequeños que favorecen la atención personalizada.',
        ),
        3 => 
        array (
          'icono' => 'fa-solid fa-certificate',
          'titulo' => 'Acreditación',
          'texto' => 'Estándares de calidad del Ministerio de Educación Nacional.',
        ),
        4 => 
        array (
          'icono' => 'fa-solid fa-comments',
          'titulo' => 'Retroalimentación',
          'texto' => 'Diálogo permanente entre docentes, estudiantes y familias.',
        ),
        5 => 
        array (
          'icono' => 'fa-solid fa-person-chalkboard',
          'titulo' => 'Capacitación Docente',
          'texto' => 'Actualización pedagógica y tecnológica continua.',
        ),
      ),
      7 => 7,
    ),
    7 => 
    array (
      0 => 'academico',
      1 => 'cta',
      2 => NULL,
      3 => NULL,
      4 => NULL,
      5 => NULL,
      6 => 
      array (
        0 => 
        array (
          'titulo' => '¿Quieres conocer nuestra propuesta académica?',
          'texto' => 'Agenda una visita y descubre todo lo que ofrecemos para el desarrollo integral de tu hijo.',
          'boton' => 'CONTÁCTANOS',
          'enlace' => 'contacto.html',
        ),
      ),
      7 => 8,
    ),
  ),
  'estudiantes' => 
  array (
    0 => 
    array (
      0 => 'estudiantes',
      1 => 'banner',
      2 => NULL,
      3 => 'Estudiantes',
      4 => 'Servicios, beneficios y procesos pensados para ti.',
      5 => 'Portal estudiantil',
      6 => 
      array (
      ),
      7 => 1,
    ),
    1 => 
    array (
      0 => 'estudiantes',
      1 => 'beneficios',
      2 => 'Servicios',
      3 => 'Beneficios Estudiantiles',
      4 => 'Apoyo académico, bienestar y espacios para tu desarrollo.',
      5 => NULL,
      6 => 
      array (
        0 => 
        array (
          'icono' => 'fa-solid fa-book-open-reader',
          'titulo' => 'Biblioteca Escolar',
          'texto' => 'Textos, zonas de lectura y acompañamiento en tus investigaciones.',
        ),
        1 => 
        array (
          'icono' => 'fa-solid fa-computer',
          'titulo' => 'Sala de Informática',
          'texto' => 'Equipos modernos, internet y recursos digitales.',
        ),
        2 => 
        array (
          'icono' => 'fa-solid fa-utensils',
          'titulo' => 'Servicio de Alimentación',
          'texto' => 'Complemento nutricional y refrigerios durante la jornada.',
        ),
        3 => 
        array (
          'icono' => 'fa-solid fa-heart-pulse',
          'titulo' => 'Bienestar y Salud',
          'texto' => 'Primeros auxilios, jornadas de salud y hábitos saludables.',
        ),
        4 => 
        array (
          'icono' => 'fa-solid fa-face-smile',
          'titulo' => 'Orientación Escolar',
          'texto' => 'Acompañamiento psicosocial para tu desarrollo personal y académico.',
        ),
        5 => 
        array (
          'icono' => 'fa-solid fa-futbol',
          'titulo' => 'Escenarios Deportivos',
          'texto' => 'Canchas y espacios para el deporte y la recreación.',
        ),
      ),
      7 => 2,
    ),
    2 => 
    array (
      0 => 'estudiantes',
      1 => 'procesos',
      2 => 'Procesos',
      3 => 'Calendario y Documentos',
      4 => 'Información sobre matrículas, horarios y certificados.',
      5 => NULL,
      6 => 
      array (
        0 => 
        array (
          'icono' => 'fa-solid fa-calendar-days',
          'titulo' => 'Calendario Escolar',
          'texto' => 'Jornadas, períodos y fechas de evaluación publicadas al inicio del año.',
        ),
        1 => 
        array (
          'icono' => 'fa-solid fa-file-pen',
          'titulo' => 'Matrícula',
          'texto' => 'Inscripción y matrícula con acompañamiento en las fechas oficiales.',
        ),
        2 => 
        array (
          'icono' => 'fa-solid fa-clipboard-list',
          'titulo' => 'Certificados y Constancias',
          'texto' => 'Certificados de estudio, constancias y boletines en secretaría.',
        ),
        3 => 
        array (
          'icono' => 'fa-solid fa-clock',
          'titulo' => 'Horarios de Clase',
          'texto' => 'Consulta los horarios por grado y jornada en la página de horarios del sitio.',
          'enlace' => 'horarios.html',
          'boton' => 'Ver horarios',
        ),
      ),
      7 => 3,
    ),
    3 => 
    array (
      0 => 'estudiantes',
      1 => 'documentos',
      2 => 'Requisitos',
      3 => 'Documentos para Matrícula',
      4 => 'Reúne estos documentos para formalizar la matrícula de manera ágil.',
      5 => NULL,
      6 => 
      array (
        0 => 
        array (
          'icono' => 'fa-solid fa-id-card',
          'titulo' => 'Registro Civil',
          'texto' => 'O tarjeta de identidad para estudiantes de mayor edad.',
        ),
        1 => 
        array (
          'icono' => 'fa-solid fa-folder-open',
          'titulo' => 'Boletín o constancia',
          'texto' => 'De la institución anterior (para estudiantes nuevos).',
        ),
        2 => 
        array (
          'icono' => 'fa-solid fa-file-image',
          'titulo' => 'Fotografías',
          'texto' => 'Dos fotos recientes tamaño documento para el registro.',
        ),
        3 => 
        array (
          'icono' => 'fa-solid fa-syringe',
          'titulo' => 'Carné de vacunación',
          'texto' => 'Esquema de vacunación actualizado al día.',
        ),
        4 => 
        array (
          'icono' => 'fa-solid fa-house-chimney',
          'titulo' => 'Datos de contacto',
          'texto' => 'De padres o acudientes, direcciones y números de emergencia.',
        ),
        5 => 
        array (
          'icono' => 'fa-solid fa-stethoscope',
          'titulo' => 'Certificado médico',
          'texto' => 'Antecedentes o recomendaciones de salud relevantes.',
        ),
      ),
      7 => 4,
    ),
    4 => 
    array (
      0 => 'estudiantes',
      1 => 'convivencia',
      2 => 'Marco normativo',
      3 => 'Manual de Convivencia',
      4 => 'Normas y compromisos que fortalecen la sana convivencia escolar.',
      5 => NULL,
      6 => 
      array (
        0 => 
        array (
          'icono' => 'fa-solid fa-handshake',
          'titulo' => 'Derechos y Deberes',
          'texto' => 'Los derechos y deberes que nos permiten vivir en armonía.',
        ),
        1 => 
        array (
          'icono' => 'fa-solid fa-shirt',
          'titulo' => 'Uniforme Escolar',
          'texto' => 'Reglamento del uniforme de diario y educación física.',
        ),
        2 => 
        array (
          'icono' => 'fa-solid fa-scale-balanced',
          'titulo' => 'Ruta de Atención',
          'texto' => 'Pasos claros para atender situaciones de convivencia o acoso.',
        ),
        3 => 
        array (
          'icono' => 'fa-solid fa-heart-circle-check',
          'titulo' => 'Acciones Pedagógicas',
          'texto' => 'Faltas y sanciones que priorizan el aprendizaje y el diálogo.',
        ),
      ),
      7 => 5,
    ),
    5 => 
    array (
      0 => 'estudiantes',
      1 => 'cta',
      2 => NULL,
      3 => NULL,
      4 => NULL,
      5 => NULL,
      6 => 
      array (
        0 => 
        array (
          'titulo' => '¿Tienes dudas sobre tus procesos escolares?',
          'texto' => 'Acércate a la secretaría o escríbenos, estaremos felices de ayudarte.',
          'boton' => 'CONTÁCTANOS',
          'enlace' => 'contacto.html',
        ),
      ),
      7 => 6,
    ),
  ),
  'horarios' => 
  array (
    0 => 
    array (
      0 => 'horarios',
      1 => 'banner',
      2 => NULL,
      3 => 'Horarios',
      4 => 'Consulta las jornadas escolares y sus cambios.',
      5 => 'Jornada escolar',
      6 => 
      array (
      ),
      7 => 1,
    ),
    1 => 
    array (
      0 => 'horarios',
      1 => 'jornadas',
      2 => 'Jornadas',
      3 => 'Horarios de Clases',
      4 => 'Distribución de la jornada para todos los niveles.',
      5 => NULL,
      6 => 
      array (
        0 => 
        array (
          'icono' => 'fa-solid fa-child-reaching',
          'titulo' => 'Preescolar',
          'filas' => 
          array (
            0 => 
            array (
              'hora' => '7:00 AM',
              'actividad' => 'Ingreso y bienvenida',
            ),
            1 => 
            array (
              'hora' => '7:15 AM',
              'actividad' => 'Actividades pedagógicas',
            ),
            2 => 
            array (
              'hora' => '9:30 AM',
              'actividad' => 'Refrigerio escolar',
            ),
            3 => 
            array (
              'hora' => '10:00 AM',
              'actividad' => 'Lúdica y descanso',
            ),
            4 => 
            array (
              'hora' => '11:30 AM',
              'actividad' => 'Salida',
            ),
          ),
        ),
        1 => 
        array (
          'icono' => 'fa-solid fa-book',
          'titulo' => 'Básica Primaria',
          'filas' => 
          array (
            0 => 
            array (
              'hora' => '6:30 AM',
              'actividad' => 'Ingreso y formación',
            ),
            1 => 
            array (
              'hora' => '6:45 AM',
              'actividad' => 'Clases de la mañana',
            ),
            2 => 
            array (
              'hora' => '10:00 AM',
              'actividad' => 'Recreo',
            ),
            3 => 
            array (
              'hora' => '10:30 AM',
              'actividad' => 'Continuación de clases',
            ),
            4 => 
            array (
              'hora' => '12:20 PM',
              'actividad' => 'Salida',
            ),
          ),
        ),
        2 => 
        array (
          'icono' => 'fa-solid fa-graduation-cap',
          'titulo' => 'Secundaria y Media',
          'filas' => 
          array (
            0 => 
            array (
              'hora' => '6:30 AM',
              'actividad' => 'Ingreso y formación',
            ),
            1 => 
            array (
              'hora' => '6:45 AM',
              'actividad' => 'Clases de la mañana',
            ),
            2 => 
            array (
              'hora' => '10:00 AM',
              'actividad' => 'Descanso',
            ),
            3 => 
            array (
              'hora' => '10:30 AM',
              'actividad' => 'Continuación de clases',
            ),
            4 => 
            array (
              'hora' => '12:30 PM',
              'actividad' => 'Refrigerio y media técnica',
            ),
            5 => 
            array (
              'hora' => '3:00 PM',
              'actividad' => 'Salida',
            ),
          ),
        ),
      ),
      7 => 2,
    ),
    2 => 
    array (
      0 => 'horarios',
      1 => 'horario-clases',
      2 => 'Jornada escolar',
      3 => 'Horarios de Clases por Grado',
      4 => 'De preescolar a grado 11.°. Lunes a jueves: clases de 55 min; viernes: clases de 45 min.',
      5 => 'Jornada escolar',
      6 => 
      array (
        0 => 
        array (
          'grados' => 
          array (
            0 => 
            array (
              'titulo' => 'Preescolar',
              'icono' => 'fa-solid fa-child-reaching',
            ),
            1 => 
            array (
              'titulo' => 'Grado 1°',
              'icono' => 'fa-solid fa-book-open',
            ),
            2 => 
            array (
              'titulo' => 'Grado 2°',
              'icono' => 'fa-solid fa-book',
            ),
            3 => 
            array (
              'titulo' => 'Grado 3°',
              'icono' => 'fa-solid fa-book-open-reader',
            ),
            4 => 
            array (
              'titulo' => 'Grado 4°',
              'icono' => 'fa-solid fa-book',
            ),
            5 => 
            array (
              'titulo' => 'Grado 5°',
              'icono' => 'fa-solid fa-award',
            ),
            6 => 
            array (
              'titulo' => 'Grado 6°',
              'icono' => 'fa-solid fa-school',
            ),
            7 => 
            array (
              'titulo' => 'Grado 7°',
              'icono' => 'fa-solid fa-building-columns',
            ),
            8 => 
            array (
              'titulo' => 'Grado 8°',
              'icono' => 'fa-solid fa-flask',
            ),
            9 => 
            array (
              'titulo' => 'Grado 9°',
              'icono' => 'fa-solid fa-laptop-code',
            ),
            10 => 
            array (
              'titulo' => 'Grado 10°',
              'icono' => 'fa-solid fa-graduation-cap',
            ),
            11 => 
            array (
              'titulo' => 'Grado 11°',
              'icono' => 'fa-solid fa-user-graduate',
            ),
          ),
          'dias' => 
          array (
            0 => 
            array (
              'titulo' => 'Lunes',
              'bloques' => 
              array (
                0 => 
                array (
                  'inicio' => '08:00',
                  'fin' => '08:55',
                  'descanso' => false,
                  'materias' => 
                  array (
                    0 => 'Matemáticas',
                    1 => 'Lengua Castellana',
                    2 => 'Ciencias Naturales',
                    3 => 'Ciencias Sociales',
                    4 => 'Inglés',
                    5 => 'Tecnología',
                    6 => 'Educación Física',
                    7 => 'Sociales',
                    8 => 'Ética y Valores',
                    9 => 'Religión',
                    10 => 'Emprendimiento',
                    11 => 'Lectura Crítica',
                  ),
                ),
                1 => 
                array (
                  'inicio' => '08:55',
                  'fin' => '09:50',
                  'descanso' => false,
                  'materias' => 
                  array (
                    0 => 'Tecnología',
                    1 => 'Educación Física',
                    2 => 'Artística',
                    3 => 'Ética y Valores',
                    4 => 'Religión',
                    5 => 'Emprendimiento',
                    6 => 'Lectura Crítica',
                    7 => 'Matemáticas',
                    8 => 'Lengua Castellana',
                    9 => 'Ciencias Naturales',
                    10 => 'Ciencias Sociales',
                    11 => 'Inglés',
                  ),
                ),
                2 => 
                array (
                  'inicio' => '09:50',
                  'fin' => '10:45',
                  'descanso' => false,
                  'materias' => 
                  array (
                    0 => 'Emprendimiento',
                    1 => 'Lectura Crítica',
                    2 => 'Matemáticas',
                    3 => 'Lengua Castellana',
                    4 => 'Ciencias Naturales',
                    5 => 'Ciencias Sociales',
                    6 => 'Inglés',
                    7 => 'Tecnología',
                    8 => 'Educación Física',
                    9 => 'Artística',
                    10 => 'Ética y Valores',
                    11 => 'Religión',
                  ),
                ),
                3 => 
                array (
                  'inicio' => '10:45',
                  'fin' => '11:05',
                  'descanso' => true,
                  'materias' => 
                  array (
                  ),
                ),
                4 => 
                array (
                  'inicio' => '11:05',
                  'fin' => '12:00',
                  'descanso' => false,
                  'materias' => 
                  array (
                    0 => 'Ciencias Sociales',
                    1 => 'Inglés',
                    2 => 'Tecnología',
                    3 => 'Educación Física',
                    4 => 'Artística',
                    5 => 'Ética y Valores',
                    6 => 'Religión',
                    7 => 'Emprendimiento',
                    8 => 'Lectura Crítica',
                    9 => 'Matemáticas',
                    10 => 'Lengua Castellana',
                    11 => 'Ciencias Naturales',
                  ),
                ),
                5 => 
                array (
                  'inicio' => '12:00',
                  'fin' => '12:55',
                  'descanso' => false,
                  'materias' => 
                  array (
                    0 => 'Ética y Valores',
                    1 => 'Religión',
                    2 => 'Emprendimiento',
                    3 => 'Lectura Crítica',
                    4 => 'Matemáticas',
                    5 => 'Lengua Castellana',
                    6 => 'Ciencias Naturales',
                    7 => 'Ciencias Sociales',
                    8 => 'Inglés',
                    9 => 'Tecnología',
                    10 => 'Educación Física',
                    11 => 'Artística',
                  ),
                ),
                6 => 
                array (
                  'inicio' => '12:55',
                  'fin' => '13:50',
                  'descanso' => false,
                  'materias' => 
                  array (
                    0 => 'Lengua Castellana',
                    1 => 'Ciencias Naturales',
                    2 => 'Ciencias Sociales',
                    3 => 'Inglés',
                    4 => 'Tecnología',
                    5 => 'Educación Física',
                    6 => 'Artística',
                    7 => 'Ética y Valores',
                    8 => 'Religión',
                    9 => 'Emprendimiento',
                    10 => 'Lectura Crítica',
                    11 => 'Matemáticas',
                  ),
                ),
                7 => 
                array (
                  'inicio' => '13:50',
                  'fin' => '14:45',
                  'descanso' => false,
                  'materias' => 
                  array (
                    0 => 'Educación Física',
                    1 => 'Artística',
                    2 => 'Ética y Valores',
                    3 => 'Religión',
                    4 => 'Emprendimiento',
                    5 => 'Lectura Crítica',
                    6 => 'Matemáticas',
                    7 => 'Lengua Castellana',
                    8 => 'Ciencias Naturales',
                    9 => 'Ciencias Sociales',
                    10 => 'Inglés',
                    11 => 'Tecnología',
                  ),
                ),
              ),
            ),
            1 => 
            array (
              'titulo' => 'Martes',
              'bloques' => 
              array (
                0 => 
                array (
                  'inicio' => '08:00',
                  'fin' => '08:55',
                  'descanso' => false,
                  'materias' => 
                  array (
                    0 => 'Matemáticas',
                    1 => 'Lengua Castellana',
                    2 => 'Ciencias Naturales',
                    3 => 'Ciencias Sociales',
                    4 => 'Inglés',
                    5 => 'Tecnología',
                    6 => 'Educación Física',
                    7 => 'Artística',
                    8 => 'Ética y Valores',
                    9 => 'Religión',
                    10 => 'Emprendimiento',
                    11 => 'Lectura Crítica',
                  ),
                ),
                1 => 
                array (
                  'inicio' => '08:55',
                  'fin' => '09:50',
                  'descanso' => false,
                  'materias' => 
                  array (
                    0 => 'Tecnología',
                    1 => 'Educación Física',
                    2 => 'Artística',
                    3 => 'Ética y Valores',
                    4 => 'Religión',
                    5 => 'Emprendimiento',
                    6 => 'Lectura Crítica',
                    7 => 'Matemáticas',
                    8 => 'Lengua Castellana',
                    9 => 'Ciencias Naturales',
                    10 => 'Ciencias Sociales',
                    11 => 'Inglés',
                  ),
                ),
                2 => 
                array (
                  'inicio' => '09:50',
                  'fin' => '10:45',
                  'descanso' => false,
                  'materias' => 
                  array (
                    0 => 'Emprendimiento',
                    1 => 'Lectura Crítica',
                    2 => 'Matemáticas',
                    3 => 'Lengua Castellana',
                    4 => 'Ciencias Naturales',
                    5 => 'Ciencias Sociales',
                    6 => 'Inglés',
                    7 => 'Tecnología',
                    8 => 'Educación Física',
                    9 => 'Artística',
                    10 => 'Ética y Valores',
                    11 => 'Religión',
                  ),
                ),
                3 => 
                array (
                  'inicio' => '10:45',
                  'fin' => '11:05',
                  'descanso' => true,
                  'materias' => 
                  array (
                  ),
                ),
                4 => 
                array (
                  'inicio' => '11:05',
                  'fin' => '12:00',
                  'descanso' => false,
                  'materias' => 
                  array (
                    0 => 'Ciencias Sociales',
                    1 => 'Inglés',
                    2 => 'Tecnología',
                    3 => 'Educación Física',
                    4 => 'Artística',
                    5 => 'Ética y Valores',
                    6 => 'Religión',
                    7 => 'Emprendimiento',
                    8 => 'Lectura Crítica',
                    9 => 'Matemáticas',
                    10 => 'Lengua Castellana',
                    11 => 'Ciencias Naturales',
                  ),
                ),
                5 => 
                array (
                  'inicio' => '12:00',
                  'fin' => '12:55',
                  'descanso' => false,
                  'materias' => 
                  array (
                    0 => 'Ética y Valores',
                    1 => 'Religión',
                    2 => 'Emprendimiento',
                    3 => 'Lectura Crítica',
                    4 => 'Matemáticas',
                    5 => 'Lengua Castellana',
                    6 => 'Ciencias Naturales',
                    7 => 'Ciencias Sociales',
                    8 => 'Inglés',
                    9 => 'Tecnología',
                    10 => 'Educación Física',
                    11 => 'Artística',
                  ),
                ),
                6 => 
                array (
                  'inicio' => '12:55',
                  'fin' => '13:50',
                  'descanso' => false,
                  'materias' => 
                  array (
                    0 => 'Lengua Castellana',
                    1 => 'Ciencias Naturales',
                    2 => 'Ciencias Sociales',
                    3 => 'Inglés',
                    4 => 'Tecnología',
                    5 => 'Educación Física',
                    6 => 'Artística',
                    7 => 'Ética y Valores',
                    8 => 'Religión',
                    9 => 'Emprendimiento',
                    10 => 'Lectura Crítica',
                    11 => 'Matemáticas',
                  ),
                ),
                7 => 
                array (
                  'inicio' => '13:50',
                  'fin' => '14:45',
                  'descanso' => false,
                  'materias' => 
                  array (
                    0 => 'Educación Física',
                    1 => 'Artística',
                    2 => 'Ética y Valores',
                    3 => 'Religión',
                    4 => 'Emprendimiento',
                    5 => 'Lectura Crítica',
                    6 => 'Matemáticas',
                    7 => 'Lengua Castellana',
                    8 => 'Ciencias Naturales',
                    9 => 'Ciencias Sociales',
                    10 => 'Inglés',
                    11 => 'Tecnología',
                  ),
                ),
              ),
            ),
            2 => 
            array (
              'titulo' => 'Miércoles',
              'bloques' => 
              array (
                0 => 
                array (
                  'inicio' => '08:00',
                  'fin' => '08:55',
                  'descanso' => false,
                  'materias' => 
                  array (
                    0 => 'Matemáticas',
                    1 => 'Lengua Castellana',
                    2 => 'Ciencias Naturales',
                    3 => 'Ciencias Sociales',
                    4 => 'Inglés',
                    5 => 'Tecnología',
                    6 => 'Educación Física',
                    7 => 'Artística',
                    8 => 'Ética y Valores',
                    9 => 'Religión',
                    10 => 'Emprendimiento',
                    11 => 'Lectura Crítica',
                  ),
                ),
                1 => 
                array (
                  'inicio' => '08:55',
                  'fin' => '09:50',
                  'descanso' => false,
                  'materias' => 
                  array (
                    0 => 'Tecnología',
                    1 => 'Educación Física',
                    2 => 'Artística',
                    3 => 'Ética y Valores',
                    4 => 'Religión',
                    5 => 'Emprendimiento',
                    6 => 'Lectura Crítica',
                    7 => 'Matemáticas',
                    8 => 'Lengua Castellana',
                    9 => 'Ciencias Naturales',
                    10 => 'Ciencias Sociales',
                    11 => 'Inglés',
                  ),
                ),
                2 => 
                array (
                  'inicio' => '09:50',
                  'fin' => '10:45',
                  'descanso' => false,
                  'materias' => 
                  array (
                    0 => 'Emprendimiento',
                    1 => 'Lectura Crítica',
                    2 => 'Matemáticas',
                    3 => 'Lengua Castellana',
                    4 => 'Ciencias Naturales',
                    5 => 'Ciencias Sociales',
                    6 => 'Inglés',
                    7 => 'Tecnología',
                    8 => 'Educación Física',
                    9 => 'Artística',
                    10 => 'Ética y Valores',
                    11 => 'Religión',
                  ),
                ),
                3 => 
                array (
                  'inicio' => '10:45',
                  'fin' => '11:05',
                  'descanso' => true,
                  'materias' => 
                  array (
                  ),
                ),
                4 => 
                array (
                  'inicio' => '11:05',
                  'fin' => '12:00',
                  'descanso' => false,
                  'materias' => 
                  array (
                    0 => 'Ciencias Sociales',
                    1 => 'Inglés',
                    2 => 'Tecnología',
                    3 => 'Educación Física',
                    4 => 'Artística',
                    5 => 'Ética y Valores',
                    6 => 'Religión',
                    7 => 'Emprendimiento',
                    8 => 'Lectura Crítica',
                    9 => 'Matemáticas',
                    10 => 'Lengua Castellana',
                    11 => 'Ciencias Naturales',
                  ),
                ),
                5 => 
                array (
                  'inicio' => '12:00',
                  'fin' => '12:55',
                  'descanso' => false,
                  'materias' => 
                  array (
                    0 => 'Ética y Valores',
                    1 => 'Religión',
                    2 => 'Emprendimiento',
                    3 => 'Lectura Crítica',
                    4 => 'Matemáticas',
                    5 => 'Lengua Castellana',
                    6 => 'Ciencias Naturales',
                    7 => 'Ciencias Sociales',
                    8 => 'Inglés',
                    9 => 'Tecnología',
                    10 => 'Educación Física',
                    11 => 'Artística',
                  ),
                ),
                6 => 
                array (
                  'inicio' => '12:55',
                  'fin' => '13:50',
                  'descanso' => false,
                  'materias' => 
                  array (
                    0 => 'Lengua Castellana',
                    1 => 'Ciencias Naturales',
                    2 => 'Ciencias Sociales',
                    3 => 'Inglés',
                    4 => 'Tecnología',
                    5 => 'Educación Física',
                    6 => 'Artística',
                    7 => 'Ética y Valores',
                    8 => 'Religión',
                    9 => 'Emprendimiento',
                    10 => 'Lectura Crítica',
                    11 => 'Matemáticas',
                  ),
                ),
                7 => 
                array (
                  'inicio' => '13:50',
                  'fin' => '14:45',
                  'descanso' => false,
                  'materias' => 
                  array (
                    0 => 'Educación Física',
                    1 => 'Artística',
                    2 => 'Ética y Valores',
                    3 => 'Religión',
                    4 => 'Emprendimiento',
                    5 => 'Lectura Crítica',
                    6 => 'Matemáticas',
                    7 => 'Lengua Castellana',
                    8 => 'Ciencias Naturales',
                    9 => 'Ciencias Sociales',
                    10 => 'Inglés',
                    11 => 'Tecnología',
                  ),
                ),
              ),
            ),
            3 => 
            array (
              'titulo' => 'Jueves',
              'bloques' => 
              array (
                0 => 
                array (
                  'inicio' => '08:00',
                  'fin' => '08:55',
                  'descanso' => false,
                  'materias' => 
                  array (
                    0 => 'Matemáticas',
                    1 => 'Lengua Castellana',
                    2 => 'Ciencias Naturales',
                    3 => 'Ciencias Sociales',
                    4 => 'Inglés',
                    5 => 'Tecnología',
                    6 => 'Educación Física',
                    7 => 'Artística',
                    8 => 'Ética y Valores',
                    9 => 'Religión',
                    10 => 'Emprendimiento',
                    11 => 'Lectura Crítica',
                  ),
                ),
                1 => 
                array (
                  'inicio' => '08:55',
                  'fin' => '09:50',
                  'descanso' => false,
                  'materias' => 
                  array (
                    0 => 'Tecnología',
                    1 => 'Educación Física',
                    2 => 'Artística',
                    3 => 'Ética y Valores',
                    4 => 'Religión',
                    5 => 'Emprendimiento',
                    6 => 'Lectura Crítica',
                    7 => 'Matemáticas',
                    8 => 'Lengua Castellana',
                    9 => 'Ciencias Naturales',
                    10 => 'Ciencias Sociales',
                    11 => 'Inglés',
                  ),
                ),
                2 => 
                array (
                  'inicio' => '09:50',
                  'fin' => '10:45',
                  'descanso' => false,
                  'materias' => 
                  array (
                    0 => 'Emprendimiento',
                    1 => 'Lectura Crítica',
                    2 => 'Matemáticas',
                    3 => 'Lengua Castellana',
                    4 => 'Ciencias Naturales',
                    5 => 'Ciencias Sociales',
                    6 => 'Inglés',
                    7 => 'Tecnología',
                    8 => 'Educación Física',
                    9 => 'Artística',
                    10 => 'Ética y Valores',
                    11 => 'Religión',
                  ),
                ),
                3 => 
                array (
                  'inicio' => '10:45',
                  'fin' => '11:05',
                  'descanso' => true,
                  'materias' => 
                  array (
                  ),
                ),
                4 => 
                array (
                  'inicio' => '11:05',
                  'fin' => '12:00',
                  'descanso' => false,
                  'materias' => 
                  array (
                    0 => 'Ciencias Sociales',
                    1 => 'Inglés',
                    2 => 'Tecnología',
                    3 => 'Educación Física',
                    4 => 'Artística',
                    5 => 'Ética y Valores',
                    6 => 'Religión',
                    7 => 'Emprendimiento',
                    8 => 'Lectura Crítica',
                    9 => 'Matemáticas',
                    10 => 'Lengua Castellana',
                    11 => 'Ciencias Naturales',
                  ),
                ),
                5 => 
                array (
                  'inicio' => '12:00',
                  'fin' => '12:55',
                  'descanso' => false,
                  'materias' => 
                  array (
                    0 => 'Ética y Valores',
                    1 => 'Religión',
                    2 => 'Emprendimiento',
                    3 => 'Lectura Crítica',
                    4 => 'Matemáticas',
                    5 => 'Lengua Castellana',
                    6 => 'Ciencias Naturales',
                    7 => 'Ciencias Sociales',
                    8 => 'Inglés',
                    9 => 'Tecnología',
                    10 => 'Educación Física',
                    11 => 'Artística',
                  ),
                ),
                6 => 
                array (
                  'inicio' => '12:55',
                  'fin' => '13:50',
                  'descanso' => false,
                  'materias' => 
                  array (
                    0 => 'Lengua Castellana',
                    1 => 'Ciencias Naturales',
                    2 => 'Ciencias Sociales',
                    3 => 'Inglés',
                    4 => 'Tecnología',
                    5 => 'Educación Física',
                    6 => 'Artística',
                    7 => 'Ética y Valores',
                    8 => 'Religión',
                    9 => 'Emprendimiento',
                    10 => 'Lectura Crítica',
                    11 => 'Matemáticas',
                  ),
                ),
                7 => 
                array (
                  'inicio' => '13:50',
                  'fin' => '14:45',
                  'descanso' => false,
                  'materias' => 
                  array (
                    0 => 'Educación Física',
                    1 => 'Artística',
                    2 => 'Ética y Valores',
                    3 => 'Religión',
                    4 => 'Emprendimiento',
                    5 => 'Lectura Crítica',
                    6 => 'Matemáticas',
                    7 => 'Lengua Castellana',
                    8 => 'Ciencias Naturales',
                    9 => 'Ciencias Sociales',
                    10 => 'Inglés',
                    11 => 'Tecnología',
                  ),
                ),
              ),
            ),
            4 => 
            array (
              'titulo' => 'Viernes',
              'bloques' => 
              array (
                0 => 
                array (
                  'inicio' => '08:00',
                  'fin' => '08:45',
                  'descanso' => false,
                  'materias' => 
                  array (
                    0 => 'Matemáticas',
                    1 => 'Lengua Castellana',
                    2 => 'Ciencias Naturales',
                    3 => 'Ciencias Sociales',
                    4 => 'Inglés',
                    5 => 'Tecnología',
                    6 => 'Educación Física',
                    7 => 'Artística',
                    8 => 'Ética y Valores',
                    9 => 'Religión',
                    10 => 'Emprendimiento',
                    11 => 'Lectura Crítica',
                  ),
                ),
                1 => 
                array (
                  'inicio' => '08:45',
                  'fin' => '09:30',
                  'descanso' => false,
                  'materias' => 
                  array (
                    0 => 'Tecnología',
                    1 => 'Educación Física',
                    2 => 'Artística',
                    3 => 'Ética y Valores',
                    4 => 'Religión',
                    5 => 'Emprendimiento',
                    6 => 'Lectura Crítica',
                    7 => 'Matemáticas',
                    8 => 'Lengua Castellana',
                    9 => 'Ciencias Naturales',
                    10 => 'Ciencias Sociales',
                    11 => 'Inglés',
                  ),
                ),
                2 => 
                array (
                  'inicio' => '09:30',
                  'fin' => '10:15',
                  'descanso' => false,
                  'materias' => 
                  array (
                    0 => 'Emprendimiento',
                    1 => 'Lectura Crítica',
                    2 => 'Matemáticas',
                    3 => 'Lengua Castellana',
                    4 => 'Ciencias Naturales',
                    5 => 'Ciencias Sociales',
                    6 => 'Inglés',
                    7 => 'Tecnología',
                    8 => 'Educación Física',
                    9 => 'Artística',
                    10 => 'Ética y Valores',
                    11 => 'Religión',
                  ),
                ),
                3 => 
                array (
                  'inicio' => '10:15',
                  'fin' => '10:35',
                  'descanso' => true,
                  'materias' => 
                  array (
                  ),
                ),
                4 => 
                array (
                  'inicio' => '10:35',
                  'fin' => '11:20',
                  'descanso' => false,
                  'materias' => 
                  array (
                    0 => 'Ciencias Sociales',
                    1 => 'Inglés',
                    2 => 'Tecnología',
                    3 => 'Educación Física',
                    4 => 'Artística',
                    5 => 'Ética y Valores',
                    6 => 'Religión',
                    7 => 'Emprendimiento',
                    8 => 'Lectura Crítica',
                    9 => 'Matemáticas',
                    10 => 'Lengua Castellana',
                    11 => 'Ciencias Naturales',
                  ),
                ),
                5 => 
                array (
                  'inicio' => '11:20',
                  'fin' => '12:05',
                  'descanso' => false,
                  'materias' => 
                  array (
                    0 => 'Ética y Valores',
                    1 => 'Religión',
                    2 => 'Emprendimiento',
                    3 => 'Lectura Crítica',
                    4 => 'Matemáticas',
                    5 => 'Lengua Castellana',
                    6 => 'Ciencias Naturales',
                    7 => 'Ciencias Sociales',
                    8 => 'Inglés',
                    9 => 'Tecnología',
                    10 => 'Educación Física',
                    11 => 'Artística',
                  ),
                ),
                6 => 
                array (
                  'inicio' => '12:05',
                  'fin' => '12:50',
                  'descanso' => false,
                  'materias' => 
                  array (
                    0 => 'Lengua Castellana',
                    1 => 'Ciencias Naturales',
                    2 => 'Ciencias Sociales',
                    3 => 'Inglés',
                    4 => 'Tecnología',
                    5 => 'Educación Física',
                    6 => 'Artística',
                    7 => 'Ética y Valores',
                    8 => 'Religión',
                    9 => 'Emprendimiento',
                    10 => 'Lectura Crítica',
                    11 => 'Matemáticas',
                  ),
                ),
                7 => 
                array (
                  'inicio' => '12:50',
                  'fin' => '13:35',
                  'descanso' => false,
                  'materias' => 
                  array (
                    0 => 'Educación Física',
                    1 => 'Artística',
                    2 => 'Ética y Valores',
                    3 => 'Religión',
                    4 => 'Emprendimiento',
                    5 => 'Lectura Crítica',
                    6 => 'Matemáticas',
                    7 => 'Lengua Castellana',
                    8 => 'Ciencias Naturales',
                    9 => 'Ciencias Sociales',
                    10 => 'Inglés',
                    11 => 'Tecnología',
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
      7 => 2,
    ),
    3 => 
    array (
      0 => 'horarios',
      1 => 'avisos',
      2 => 'Actualizaciones',
      3 => 'Cambios y Avisos',
      4 => 'Te informamos sobre modificaciones en los horarios.',
      5 => NULL,
      6 => 
      array (
        0 => 
        array (
          'icono' => 'fa-solid fa-tower-broadcast',
          'titulo' => 'Avisos de Última Hora',
          'texto' => 'Cambios imprevistos en la cartelera y grupos oficiales de cada grado.',
        ),
        1 => 
        array (
          'icono' => 'fa-solid fa-bell',
          'titulo' => 'Alertas Tempranas',
          'texto' => 'Se avisa con anticipación sobre jornadas pedagógicas o salidas.',
        ),
        2 => 
        array (
          'icono' => 'fa-solid fa-user-check',
          'titulo' => 'Canal Oficial',
          'texto' => 'La agenda escolar y la secretaría confirman los cambios.',
        ),
        3 => 
        array (
          'icono' => 'fa-solid fa-hourglass-half',
          'titulo' => 'Llegadas y Salidas',
          'texto' => 'El registro de llegadas y salidas se entrega a los acudientes.',
        ),
      ),
      7 => 3,
    ),
    4 => 
    array (
      0 => 'horarios',
      1 => 'cifras',
      2 => 'Nuestra jornada',
      3 => 'Así es nuestro día',
      4 => 'Una jornada pensada para el aprendizaje y el bienestar.',
      5 => NULL,
      6 => 
      array (
        0 => 
        array (
          'icono' => 'fa-solid fa-baseball',
          'numero' => '2',
          'sufijo' => '',
          'texto' => 'Jornadas escolares',
        ),
        1 => 
        array (
          'icono' => 'fa-solid fa-clock',
          'numero' => '45',
          'sufijo' => ' min',
          'texto' => 'Duración de cada clase',
        ),
        2 => 
        array (
          'icono' => 'fa-solid fa-calendar-week',
          'numero' => '5',
          'sufijo' => '',
          'texto' => 'Días de clase a la semana',
        ),
        3 => 
        array (
          'icono' => 'fa-solid fa-stopwatch',
          'numero' => '200',
          'sufijo' => ' min',
          'texto' => 'Acompañamiento diario',
        ),
      ),
      7 => 4,
    ),
    5 => 
    array (
      0 => 'horarios',
      1 => 'cta',
      2 => NULL,
      3 => NULL,
      4 => NULL,
      5 => NULL,
      6 => 
      array (
        0 => 
        array (
          'titulo' => '¿Necesitas tu horario detallado?',
          'texto' => 'Consulta en secretaría el horario de tu grado y jornada.',
          'boton' => 'CONTÁCTANOS',
          'enlace' => 'contacto.html',
        ),
      ),
      7 => 5,
    ),
  ),
  'nosotros' => 
  array (
    0 => 
    array (
      0 => 'nosotros',
      1 => 'banner',
      2 => NULL,
      3 => 'Nuestro Colegio',
      4 => 'Conoce la identidad y los valores de nuestra comunidad educativa.',
      5 => 'Quiénes somos',
      6 => 
      array (
      ),
      7 => 1,
    ),
    1 => 
    array (
      0 => 'nosotros',
      1 => 'mision-vision',
      2 => 'Misión y Visión',
      3 => 'Nuestra Comunidad Educativa',
      4 => 'Una institución comprometida con la formación integral y humana de nuestros estudiantes.',
      5 => NULL,
      6 => 
      array (
        0 => 
        array (
          'icono' => 'fa-solid fa-bullseye',
          'etiqueta' => 'Misión',
          'titulo' => 'Formación Integral',
          'texto' => 'Formar personas íntegras, competentes y comprometidas con su comunidad y su futuro.',
        ),
        1 => 
        array (
          'icono' => 'fa-solid fa-eye',
          'etiqueta' => 'Visión',
          'titulo' => 'Ser Referentes',
          'texto' => 'Ser una institución líder en formación humana y académica, reconocida por su calidad y sus valores.',
        ),
      ),
      7 => 2,
    ),
    2 => 
    array (
      0 => 'nosotros',
      1 => 'stats',
      2 => NULL,
      3 => NULL,
      4 => NULL,
      5 => NULL,
      6 => 
      array (
        0 => 
        array (
          'icono' => 'fa-solid fa-award',
          'numero' => '35',
          'sufijo' => '+',
          'texto' => 'Años de trayectoria',
        ),
        1 => 
        array (
          'icono' => 'fa-solid fa-user-graduate',
          'numero' => '850',
          'sufijo' => '+',
          'texto' => 'Estudiantes activos',
        ),
        2 => 
        array (
          'icono' => 'fa-solid fa-chalkboard-user',
          'numero' => '45',
          'sufijo' => '',
          'texto' => 'Docentes calificados',
        ),
        3 => 
        array (
          'icono' => 'fa-solid fa-trophy',
          'numero' => '60',
          'sufijo' => '+',
          'texto' => 'Logros y distinciones',
        ),
      ),
      7 => 3,
    ),
    3 => 
    array (
      0 => 'nosotros',
      1 => 'historia',
      2 => 'Trayectoria',
      3 => 'Nuestra Historia',
      4 => 'Más de tres décadas formando generaciones de líderes.',
      5 => NULL,
      6 => 
      array (
        0 => 
        array (
          'anio' => '1990',
          'icono' => 'fa-solid fa-seedling',
          'titulo' => 'Fundación',
          'texto' => 'Nace la Institución Educativa San Félix con el propósito de llevar educación de calidad a la comunidad.',
        ),
        1 => 
        array (
          'anio' => '2005',
          'icono' => 'fa-solid fa-building-columns',
          'titulo' => 'Crecimiento',
          'texto' => 'Ampliamos nuestras instalaciones y egresa la primera promoción de bachilleres.',
        ),
        2 => 
        array (
          'anio' => '2018',
          'icono' => 'fa-solid fa-laptop-code',
          'titulo' => 'Transformación Digital',
          'texto' => 'Integramos la tecnología al aula con sala de informática y proyectos de robótica.',
        ),
        3 => 
        array (
          'anio' => '2026',
          'icono' => 'fa-solid fa-award',
          'titulo' => 'Reconocimientos',
          'texto' => 'Nuestros estudiantes destacan en competencias académicas, culturales y deportivas de la región.',
        ),
      ),
      7 => 4,
    ),
    4 => 
    array (
      0 => 'nosotros',
      1 => 'simbolos',
      2 => 'Identidad',
      3 => 'Símbolos Institucionales',
      4 => 'Los emblemas que representan nuestro espíritu y nuestra historia.',
      5 => NULL,
      6 => 
      array (
        0 => 
        array (
          'icono' => 'fa-solid fa-shield-halved',
          'titulo' => 'El Escudo',
          'texto' => 'Símbolo de identidad que refleja la sabiduría, la disciplina y los valores de la comunidad sanfelina.',
        ),
        1 => 
        array (
          'icono' => 'fa-solid fa-flag',
          'titulo' => 'La Bandera',
          'texto' => 'Con los colores institucionales, ondea con orgullo en cada acto cívico y celebración.',
        ),
        2 => 
        array (
          'icono' => 'fa-solid fa-music',
          'titulo' => 'El Himno',
          'texto' => 'Entonado con fervor, recuerda a todos el compromiso con la institución y su legado.',
        ),
      ),
      7 => 5,
    ),
    5 => 
    array (
      0 => 'nosotros',
      1 => 'instalaciones',
      2 => 'Nuestro espacio',
      3 => 'Instalaciones y Beneficios Estudiantiles',
      4 => 'Ambientes adecuados para el aprendizaje, el deporte y la convivencia, con beneficios que acompañan a nuestros estudiantes.',
      5 => NULL,
      6 => 
      array (
        0 => 
        array (
          'icono' => 'fa-solid fa-chalkboard-user',
          'titulo' => 'Aulas Amplias',
          'texto' => 'Espacios cómodos y dotados para el aprendizaje.',
          'detalle' => 'Salones amplios, iluminados y bien ventilados, con mobiliario cómodo y recursos didácticos para las diferentes áreas del conocimiento.',
        ),
        1 => 
        array (
          'icono' => 'fa-solid fa-book-open-reader',
          'titulo' => 'Biblioteca',
          'texto' => 'Miles de libros y zonas de lectura silenciosa.',
          'detalle' => 'Un espacio para la lectura y la investigación, con libros de todas las materias, zonas de estudio y acompañamiento docente.',
        ),
        2 => 
        array (
          'icono' => 'fa-solid fa-computer',
          'titulo' => 'Sala de Informática',
          'texto' => 'Tecnología al servicio de las clases y proyectos.',
          'detalle' => 'Computadores conectados a internet para el desarrollo de competencias digitales, clases de tecnología y proyectos transversales.',
        ),
        3 => 
        array (
          'icono' => 'fa-solid fa-flask-vial',
          'titulo' => 'Laboratorio',
          'texto' => 'Experimentación científica para todas las edades.',
          'detalle' => 'Ambientes equipados para experimentos de ciencias naturales y el desarrollo del pensamiento científico en todas las edades.',
        ),
        4 => 
        array (
          'icono' => 'fa-solid fa-futbol',
          'titulo' => 'Zonas Deportivas',
          'texto' => 'Canchas y espacios para la actividad física sana.',
          'detalle' => 'Canchas para fútbol, baloncesto y vóleibol, donde se fomenta el trabajo en equipo, la disciplina y la vida saludable.',
        ),
        5 => 
        array (
          'icono' => 'fa-solid fa-tree',
          'titulo' => 'Zonas Verdes',
          'texto' => 'Jardines para descansar y compartir en comunidad.',
          'detalle' => 'Jardines y espacios al aire libre para descansar, convivir y desarrollar actividades recreativas en contacto con la naturaleza.',
        ),
        6 => 
        array (
          'icono' => 'fa-solid fa-utensils',
          'titulo' => 'Servicio de Alimentación',
          'texto' => 'Complemento nutricional y refrigerios durante la jornada escolar.',
          'detalle' => 'Complemento nutricional y refrigerios balanceados que acompañan la jornada escolar y el bienestar de los estudiantes.',
        ),
        7 => 
        array (
          'icono' => 'fa-solid fa-heart-pulse',
          'titulo' => 'Bienestar y Salud',
          'texto' => 'Primeros auxilios, jornadas de salud y hábitos saludables.',
          'detalle' => 'Primeros auxilios, jornadas de salud, vacunación y campañas para promover hábitos de vida saludable.',
        ),
        8 => 
        array (
          'icono' => 'fa-solid fa-face-smile',
          'titulo' => 'Orientación Escolar',
          'texto' => 'Acompañamiento psicosocial para el desarrollo personal y académico.',
          'detalle' => 'Acompañamiento psicosocial y académico para el desarrollo personal, la convivencia y el proyecto de vida de cada estudiante.',
        ),
      ),
      7 => 6,
    ),
    6 => 
    array (
      0 => 'nosotros',
      1 => 'cta',
      2 => NULL,
      3 => NULL,
      4 => NULL,
      5 => NULL,
      6 => 
      array (
        0 => 
        array (
          'titulo' => '¿Quieres ser parte de nuestra comunidad?',
          'texto' => 'Ven y conoce todo lo que hace especial al Colegio San Félix.',
          'boton' => 'CONTÁCTANOS',
          'enlace' => 'contacto.html',
        ),
      ),
      7 => 7,
    ),
  ),
  'padres' => 
  array (
    0 => 
    array (
      0 => 'padres',
      1 => 'banner',
      2 => NULL,
      3 => 'Padres',
      4 => 'Acompaña la formación de tus hijos de cerca.',
      5 => 'Comunidad de familias',
      6 => 
      array (
      ),
      7 => 1,
    ),
    1 => 
    array (
      0 => 'padres',
      1 => 'familia',
      2 => 'Comunidad',
      3 => 'Acompañamiento Familiar',
      4 => 'Canales abiertos para la comunicación con la institución.',
      5 => NULL,
      6 => 
      array (
        0 => 
        array (
          'icono' => 'fa-solid fa-comments',
          'titulo' => 'Comunicación Directa',
          'texto' => 'Teléfono, WhatsApp y agenda para dudas ágiles.',
        ),
        1 => 
        array (
          'icono' => 'fa-solid fa-people-roof',
          'titulo' => 'Reuniones de Acudientes',
          'texto' => 'Jornadas de entrega de informes y seguimiento académico todo el año.',
        ),
        2 => 
        array (
          'icono' => 'fa-solid fa-envelope-open-text',
          'titulo' => 'Boletín Informativo',
          'texto' => 'Circulares y comunicados por correo y cuaderno de notas.',
        ),
        3 => 
        array (
          'icono' => 'fa-solid fa-hands-holding-heart',
          'titulo' => 'Orientación Familiar',
          'texto' => 'Citas de orientación psicosocial para la familia.',
        ),
        4 => 
        array (
          'icono' => 'fa-solid fa-chalkboard-user',
          'titulo' => 'Escuela de Padres',
          'texto' => 'Talleres de pautas de crianza, buen trato y proyecto de vida.',
        ),
        5 => 
        array (
          'icono' => 'fa-solid fa-handshake',
          'titulo' => 'Comité de Familias',
          'texto' => 'Participación en el gobierno escolar y los comités institucionales.',
        ),
      ),
      7 => 2,
    ),
    2 => 
    array (
      0 => 'padres',
      1 => 'matricula',
      2 => 'Trámites',
      3 => 'Matrículas y Comunicados',
      4 => 'Toda la información que las familias necesitan durante el año.',
      5 => NULL,
      6 => 
      array (
        0 => 
        array (
          'icono' => 'fa-solid fa-calendar-check',
          'titulo' => 'Fechas de Matrícula',
          'texto' => 'Calendario de matrícula, renovaciones y cambios de jornada.',
        ),
        1 => 
        array (
          'icono' => 'fa-solid fa-folder-open',
          'titulo' => 'Documentos Requeridos',
          'texto' => 'Lista de documentos para formalizar o renovar la matrícula.',
          'enlace' => 'estudiantes.html',
          'boton' => 'Ver requisitos',
        ),
        2 => 
        array (
          'icono' => 'fa-solid fa-bullhorn',
          'titulo' => 'Comunicados Oficiales',
          'texto' => 'Circulares, resoluciones y avisos institucionales.',
        ),
        3 => 
        array (
          'icono' => 'fa-solid fa-calendar-day',
          'titulo' => 'Calendario de Reuniones',
          'texto' => 'Asambleas generales, entrega de informes y citaciones.',
        ),
      ),
      7 => 3,
    ),
    3 => 
    array (
      0 => 'padres',
      1 => 'formacion',
      2 => 'Formación',
      3 => 'Escuela de Padres',
      4 => 'Espacios de formación y encuentro para las familias.',
      5 => NULL,
      6 => 
      array (
        0 => 
        array (
          'icono' => 'fa-solid fa-heart',
          'titulo' => 'Crianza Respetuosa',
          'texto' => 'Talleres de buen trato, límites amorosos y comunicación asertiva.',
        ),
        1 => 
        array (
          'icono' => 'fa-solid fa-chess-knight',
          'titulo' => 'Acompañamiento Escolar',
          'texto' => 'Claves para apoyar tareas, hábitos de estudio y lectura en casa.',
        ),
        2 => 
        array (
          'icono' => 'fa-solid fa-shield-heart',
          'titulo' => 'Ciberseguridad',
          'texto' => 'Uso responsable de la tecnología y prevención de riesgos en línea.',
        ),
        3 => 
        array (
          'icono' => 'fa-solid fa-stairs',
          'titulo' => 'Proyecto de Vida',
          'texto' => 'Orientación para acompañar la vocación y decisiones de tus hijos.',
        ),
        4 => 
        array (
          'icono' => 'fa-solid fa-apple-whole',
          'titulo' => 'Bienestar y Salud',
          'texto' => 'Charlas sobre alimentación, salud mental y vida saludable.',
        ),
        5 => 
        array (
          'icono' => 'fa-solid fa-people-arrows',
          'titulo' => 'Convivencia Familiar',
          'texto' => 'Estrategias para fortalecer vínculos y resolver conflictos en familia.',
        ),
      ),
      7 => 4,
    ),
    4 => 
    array (
      0 => 'padres',
      1 => 'cifras',
      2 => 'Nuestra comunidad',
      3 => 'Las familias en cifras',
      4 => 'Una comunidad comprometida con la formación integral.',
      5 => NULL,
      6 => 
      array (
        0 => 
        array (
          'icono' => 'fa-solid fa-house-circle-check',
          'numero' => '650',
          'sufijo' => '+',
          'texto' => 'Familias vinculadas',
        ),
        1 => 
        array (
          'icono' => 'fa-solid fa-calendar-check',
          'numero' => '4',
          'sufijo' => '',
          'texto' => 'Asambleas al año',
        ),
        2 => 
        array (
          'icono' => 'fa-solid fa-user-graduate',
          'numero' => '98',
          'sufijo' => '%',
          'texto' => 'Permanencia escolar',
        ),
        3 => 
        array (
          'icono' => 'fa-solid fa-chalkboard-user',
          'numero' => '12',
          'sufijo' => '+',
          'texto' => 'Talleres formativos',
        ),
      ),
      7 => 5,
    ),
    5 => 
    array (
      0 => 'padres',
      1 => 'cta',
      2 => NULL,
      3 => NULL,
      4 => NULL,
      5 => NULL,
      6 => 
      array (
        0 => 
        array (
          'titulo' => '¿Necesitas información sobre el proceso de tu hijo?',
          'texto' => 'Escríbenos o acércate a la institución, estaremos felices de atenderte.',
          'boton' => 'HABLA CON NOSOTROS',
          'enlace' => 'contacto.html',
        ),
      ),
      7 => 6,
    ),
  ),
);
}

/**
 * Sembrado de la tabla Secciones (contenido por sección de cada página).
 * Solo siembra si la tabla está vacía, para conservar las ediciones existentes.
 * @return int Cantidad de secciones sembradas.
 */
function semillarSecciones($pdo)
{
    $total = (int)$pdo->query('SELECT COUNT(*) FROM Secciones')->fetchColumn();
    if ($total > 0) {
        return 0;
    }

    $stmt = $pdo->prepare(
        'INSERT INTO Secciones (pagina, seccion, kicker, titulo, descripcion, tag, items, orden)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
    );

    $sembrado = 0;
    foreach (seccionesSemilla() as $pagina => $secciones) {
        foreach ($secciones as $s) {
            $stmt->execute(array($s[0], $s[1], $s[2], $s[3], $s[4], $s[5], json_encode($s[6], JSON_UNESCAPED_UNICODE), $s[7]));
            $sembrado++;
        }
    }

    return $sembrado;
}

/**
 * Migración idempotente: crea la sección "horario-clases" de la página de
 * horarios en instalaciones que ya existían (no se pisa ninguna edición del
 * administrador; solo inserta si la sección todavía no existe).
 *
 * @return int 1 si se insertó, 0 si ya existía.
 */
function migrarSeccionHorarioClases($pdo)
{
    $stmt = $pdo->prepare('SELECT COUNT(*) FROM Secciones WHERE pagina = ? AND seccion = ?');
    $stmt->execute(array('horarios', 'horario-clases'));
    if ((int)$stmt->fetchColumn() > 0) {
        return 0;
    }

    $itemsJson = json_encode(datosHorarioClasesSemilla(), JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);

    $pdo->prepare(
        'INSERT INTO Secciones (pagina, seccion, kicker, titulo, descripcion, tag, items, orden, activo)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
    )->execute(array(
        'horarios', 'horario-clases',
        'Jornada escolar',
        'Horarios de Clases por Grado',
        'De preescolar a grado 11°. Lunes a jueves: clases de 55 min; viernes: clases de 45 min.',
        'Jornada escolar',
        $itemsJson,
        2,
        'activo'
    ));

    return 1;
}

/**
 * Busca los "bloques" del primer día cuyo título contenga alguno de los
 * patrones indicados (comparación insensible a mayúsculas).
 */
function buscarDiaHorario($dias, $patrones)
{
    foreach ($dias as $d) {
        if (!isset($d['titulo'])) {
            continue;
        }
        foreach ($patrones as $p) {
            if (stripos($d['titulo'], $p) !== false) {
                return isset($d['bloques']) ? $d['bloques'] : array();
            }
        }
    }
    return null;
}

/**
 * ¿El arreglo de días ya tiene los 5 días de la semana (Lunes–Viernes)?
 */
function diasCompletosHorario($dias)
{
    if (empty($dias)) {
        return false;
    }
    $encontrados = 0;
    foreach (array('Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes') as $nombre) {
        foreach ($dias as $d) {
            if (isset($d['titulo']) && stripos($d['titulo'], $nombre) !== false) {
                $encontrados++;
                break;
            }
        }
    }
    return $encontrados >= 5;
}

/**
 * Migración idempotente: convierte la sección "horario-clases" al formato
 * por días { grados, dias[Lunes–Viernes] }.
 * - Formato antiguo { bloques, grados } → se expande a los 5 días, usando
 *   los bloques existentes para Lunes–Jueves y generando el Viernes con
 *   clases de 45 minutos.
 * - Formato con grupos combinados ("Lunes a Jueves" / "Viernes") → se
 *   separa cada día, conservando los bloques de cada grupo.
 * - Si ya existen los 5 días individuales no se pisa ninguna edición.
 * También actualiza la descripción por defecto antigua si no fue
 * personalizada.
 *
 * @return int 1 si se migró, 0 si no hizo falta.
 */
function migrarHorarioClasesPorDias($pdo)
{
    $fila = $pdo->query(
        "SELECT id, items, descripcion FROM Secciones WHERE pagina = 'horarios' AND seccion = 'horario-clases'"
    )->fetch(PDO::FETCH_ASSOC);
    if (!$fila) {
        return 0;
    }

    // Descripción por defecto antigua → nueva (solo si no fue personalizada).
    $descVieja  = 'De preescolar a grado 11°, con todas las asignaturas de la jornada.';
    $descNueva  = 'De preescolar a grado 11°. Lunes a jueves: clases de 55 min; viernes: clases de 45 min.';
    $migrado    = 0;

    if ($fila['descripcion'] === $descVieja) {
        $pdo->prepare('UPDATE Secciones SET descripcion = ? WHERE id = ?')
            ->execute(array($descNueva, $fila['id']));
        $migrado = 1;
    }

    $items = json_decode($fila['items'], true);
    if (!is_array($items) || !isset($items[0]) || !is_array($items[0])) {
        return $migrado;
    }
    $actual = $items[0];
    $dias   = (isset($actual['dias']) && is_array($actual['dias'])) ? $actual['dias'] : null;

    // Ya separado en los 5 días → solo queda la descripción por corregir.
    if (diasCompletosHorario($dias)) {
        return $migrado;
    }

    $semilla  = datosHorarioClasesSemilla()[0];
    $grados   = (isset($actual['grados']) && is_array($actual['grados']) && count($actual['grados']) > 0)
        ? $actual['grados']
        : $semilla['grados'];
    $n        = count($grados);

    $pool = array(
        'Matemáticas', 'Lengua Castellana', 'Ciencias Naturales', 'Ciencias Sociales',
        'Inglés', 'Tecnología', 'Educación Física', 'Artística',
        'Ética y Valores', 'Religión', 'Emprendimiento', 'Lectura Crítica'
    );

    $horasViernes = array(
        array('08:00', '08:45', false),
        array('08:45', '09:30', false),
        array('09:30', '10:15', false),
        array('10:15', '10:35', true),
        array('10:35', '11:20', false),
        array('11:20', '12:05', false),
        array('12:05', '12:50', false),
        array('12:50', '13:35', false)
    );

    $bloquesLunesJueves = array();
    $bloquesViernes     = array();

    if (!empty($dias)) {
        // Grupo combinado ("Lunes a Jueves" / "Lunes a viernes") o día suelto.
        $combinadoLJ = buscarDiaHorario($dias, array('Lunes a Jue', 'Lunes a Vier', 'L-J', 'Lunes - Jue'));
        $lunes       = buscarDiaHorario($dias, array('Lunes'));
        $viernes     = buscarDiaHorario($dias, array('Viernes'));

        if ($combinadoLJ !== null) {
            $bloquesLunesJueves = $combinadoLJ;
        } elseif ($lunes !== null) {
            $bloquesLunesJueves = $lunes;
        } elseif ($viernes !== null) {
            $bloquesLunesJueves = $viernes;
        } else {
            $bloquesLunesJueves = (isset($dias[0]['bloques']) && is_array($dias[0]['bloques']))
                ? $dias[0]['bloques']
                : array();
        }

        if ($viernes !== null) {
            $bloquesViernes = $viernes;
        } else {
            $bloquesViernes = $bloquesLunesJueves;
        }
    } else {
        // Formato antiguo sin día definido.
        $bloquesLunesJueves = (isset($actual['bloques']) && is_array($actual['bloques']))
            ? $actual['bloques']
            : array();

        $bloquesViernes = bloquesHorarioConMaterias($horasViernes, $pool, $n);
    }

    // Si aún así no hay bloques, tomar la semilla (nunca dejar el horario vacío).
    if (empty($bloquesLunesJueves)) {
        $bloquesLunesJueves = $semilla['dias'][0]['bloques'];
    }
    if (empty($bloquesViernes) || $bloquesViernes === $bloquesLunesJueves) {
        // Fallback: Viernes de 45 minutos con la misma rotación de materias.
        $bloquesViernes = bloquesHorarioConMaterias($horasViernes, $pool, $n);
    }

    $items[0] = array(
        'grados' => $grados,
        'dias'   => array(
            array('titulo' => 'Lunes',     'bloques' => $bloquesLunesJueves),
            array('titulo' => 'Martes',    'bloques' => $bloquesLunesJueves),
            array('titulo' => 'Miércoles', 'bloques' => $bloquesLunesJueves),
            array('titulo' => 'Jueves',    'bloques' => $bloquesLunesJueves),
            array('titulo' => 'Viernes',   'bloques' => $bloquesViernes)
        )
    );

    $json = json_encode($items, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    $pdo->prepare('UPDATE Secciones SET items = ? WHERE id = ?')
        ->execute(array($json, $fila['id']));

    return 1;
}

/**
 * Migra la antigua tabla única "Usuarios" hacia las 4 tablas por rol.
 * Las contraseñas ya vienen encriptadas (bcrypt) → se copian tal cual.
 * Al terminar, la tabla única se elimina.
 *
 * @return int Cantidad de usuarios migrados.
 */
function migrarUsuariosLegacy($pdo)
{
    if (!existeTabla($pdo, 'Usuarios')) {
        return 0;
    }

    $filas = $pdo->query(
        'SELECT usuario, nombre, email, rol, estado, fecha_creacion, password_hash
         FROM Usuarios'
    )->fetchAll();

    $migrados = 0;
    foreach ($filas as $f) {
        $tabla = tablaRol($f['rol']);
        if ($tabla === null) {
            continue; // rol desconocido → se ignora
        }

        $stmt = $pdo->prepare(
            'INSERT IGNORE INTO `' . $tabla . '`
             (usuario, nombre, email, estado, fecha_creacion, password_hash)
             VALUES (?, ?, ?, ?, ?, ?)'
        );
        $stmt->execute(array(
            $f['usuario'],
            $f['nombre'],
            $f['email'],
            $f['estado'],
            $f['fecha_creacion'],
            $f['password_hash']
        ));
        $migrados++;
    }

    // La información quedó repartida en las 4 tablas: la tabla única ya no se usa.
    $pdo->exec('DROP TABLE IF EXISTS Usuarios');

    return $migrados;
}

/**
 * Crea la base de datos, las 4 tablas por rol, el contenido del sitio y los usuarios semilla.
 *
 * @param  PDO $pdo  Conexión (con o sin base de datos seleccionada).
 * @return int        Cantidad de usuarios semilla insertados.
 */
function instalarBaseDatos($pdo)
{
    // 1. Crear la base de datos si no existe
    $pdo->exec(
        'CREATE DATABASE IF NOT EXISTS `' . DB_NAME . '`
         CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci'
    );

    // 2. Seleccionarla y crear las tablas por rol
    $pdo->exec('USE `' . DB_NAME . '`');

    foreach (sqlCrearTablasPorRol() as $sql) {
        $pdo->exec($sql);
    }

    // 3. Tablas de contenido del sitio (info, contacto, slides, eventos, noticias)
    foreach (sqlCrearTablasContenido() as $sql) {
        $pdo->exec($sql);
    }

    // 3b. Tabla de imágenes por elemento (slides, eventos, noticias)
    foreach (sqlCrearTablaImagenes() as $sql) {
        $pdo->exec($sql);
    }

    // 3c. Tabla de Agenda (solo visible para docentes y administrativos)
    foreach (sqlCrearTablaAgenda() as $sql) {
        $pdo->exec($sql);
    }

    // 3d. Añadir columnas que falten en tablas de contenido creadas con esquemas anteriores
    migrarTablasContenido($pdo);

    // 3e. Reemplazar los enlaces de redes de ejemplo por los reales (solo placeholders)
    actualizarContactoRedes($pdo);

    // 4. Sembrar el contenido de ejemplo (solo la primera vez)
    semillarContenido($pdo);

    // 4b. Sembrar FAQ, galería y banda CTA si están vacías (instalaciones existentes)
    semillarContenidoInicioSiVacio($pdo);

    // 4c. Sembrar las secciones por página (nosotros, académico, estudiantes, padres, horarios)
    semillarSecciones($pdo);

    // 4d. Crear la sección "horario-clases" (horarios por grado) en instalaciones existentes
    migrarSeccionHorarioClases($pdo);

    // 4e. Migrar "horario-clases" al formato por días (Lunes a Jueves / Viernes de 45 min)
    migrarHorarioClasesPorDias($pdo);

    // 5. Migrar la antigua tabla única Usuarios si aún existe
    migrarUsuariosLegacy($pdo);

    // 6. Insertar usuarios iniciales solo si TODAS las tablas están vacías
    $total = 0;
    foreach (rolesTablas() as $tabla) {
        $total += (int)$pdo->query("SELECT COUNT(*) FROM `{$tabla}`")->fetchColumn();
    }

    $insertados = 0;
    if ($total === 0) {
        foreach (usuariosSemilla() as $u) {
            $tabla = tablaRol($u[3]);

            // Encriptar contraseña con bcrypt antes de guardarla
            $hash = password_hash($u[6], PASSWORD_BCRYPT);

            $stmt = $pdo->prepare(
                'INSERT IGNORE INTO `' . $tabla . '`
                 (usuario, nombre, email, estado, fecha_creacion, password_hash)
                 VALUES (?, ?, ?, ?, ?, ?)'
            );
            $stmt->execute(array($u[0], $u[1], $u[2], $u[4], $u[5], $hash));
            $insertados++;
        }
    }

    // 7. Marcar el esquema como instalado para no repetir estos pasos
    //    en cada petición (ver esquemaDesactualizado()).
    guardarEsquemaVersion($pdo);

    return $insertados;
}
