-- ══════════════════════════════════════════════════════════════
--  BASE DE DATOS: IeSanFelixAlDia
--
--  El login está SEPARADO POR ROL: cada tipo de cuenta vive en su
--  propia tabla (sin columna "rol", porque el rol lo define la tabla):
--
--    Administradores  → rol "admin"
--    Docentes         → rol "docente"
--    Estudiantes      → rol "estudiante"
--    Padres           → rol "padre"
--
--  Las contraseñas se almacenan ENCRIPTADAS con bcrypt
--  (generadas desde PHP con password_hash()).
--
--  NOTA: no es necesario importar este archivo manualmente.
--  El sistema crea la base de datos automáticamente (ver
--  php/schema.php) la primera vez que alguien inicia sesión.
--  Si existía la antigua tabla única "Usuarios", el sistema la
--  migra a las 4 tablas y la elimina.
--  Este script queda como respaldo de la estructura por si se
--  desea crearla desde phpMyAdmin.
-- ══════════════════════════════════════════════════════════════

CREATE DATABASE IF NOT EXISTS IeSanFelixAlDia
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

USE IeSanFelixAlDia;

-- Administradores (rol: admin)
CREATE TABLE IF NOT EXISTS Administradores (
    id              INT UNSIGNED     NOT NULL AUTO_INCREMENT,
    usuario         VARCHAR(50)      NOT NULL,
    nombre          VARCHAR(100)     NOT NULL,
    email           VARCHAR(120)     NULL DEFAULT NULL,
    estado          ENUM('activo','inactivo')
                                     NOT NULL DEFAULT 'activo',
    fecha_creacion  DATE             NOT NULL,
    -- Contraseña encriptada con bcrypt (password_hash de PHP).
    -- NUNCA se guarda la contraseña en texto plano.
    password_hash   VARCHAR(255)     NOT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uq_administradores_usuario (usuario),
    UNIQUE KEY uq_administradores_email (email)
) ENGINE = InnoDB
  DEFAULT CHARSET = utf8mb4
  COLLATE = utf8mb4_unicode_ci;

-- Docentes (rol: docente)
CREATE TABLE IF NOT EXISTS Docentes (
    id              INT UNSIGNED     NOT NULL AUTO_INCREMENT,
    usuario         VARCHAR(50)      NOT NULL,
    nombre          VARCHAR(100)     NOT NULL,
    email           VARCHAR(120)     NULL DEFAULT NULL,
    estado          ENUM('activo','inactivo')
                                     NOT NULL DEFAULT 'activo',
    fecha_creacion  DATE             NOT NULL,
    password_hash   VARCHAR(255)     NOT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uq_docentes_usuario (usuario),
    UNIQUE KEY uq_docentes_email (email)
) ENGINE = InnoDB
  DEFAULT CHARSET = utf8mb4
  COLLATE = utf8mb4_unicode_ci;

-- Estudiantes (rol: estudiante)
CREATE TABLE IF NOT EXISTS Estudiantes (
    id              INT UNSIGNED     NOT NULL AUTO_INCREMENT,
    usuario         VARCHAR(50)      NOT NULL,
    nombre          VARCHAR(100)     NOT NULL,
    email           VARCHAR(120)     NULL DEFAULT NULL,
    estado          ENUM('activo','inactivo')
                                     NOT NULL DEFAULT 'activo',
    fecha_creacion  DATE             NOT NULL,
    password_hash   VARCHAR(255)     NOT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uq_estudiantes_usuario (usuario),
    UNIQUE KEY uq_estudiantes_email (email)
) ENGINE = InnoDB
  DEFAULT CHARSET = utf8mb4
  COLLATE = utf8mb4_unicode_ci;

-- Padres (rol: padre)
CREATE TABLE IF NOT EXISTS Padres (
    id              INT UNSIGNED     NOT NULL AUTO_INCREMENT,
    usuario         VARCHAR(50)      NOT NULL,
    nombre          VARCHAR(100)     NOT NULL,
    email           VARCHAR(120)     NULL DEFAULT NULL,
    estado          ENUM('activo','inactivo')
                                     NOT NULL DEFAULT 'activo',
    fecha_creacion  DATE             NOT NULL,
    password_hash   VARCHAR(255)     NOT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uq_padres_usuario (usuario),
    UNIQUE KEY uq_padres_email (email)
) ENGINE = InnoDB
  DEFAULT CHARSET = utf8mb4
  COLLATE = utf8mb4_unicode_ci;

-- ══════════════════════════════════════════════════════════════
--  CONTENIDO DEL SITIO (página de inicio, cargada desde MySQL)
--
--  La página index.html se llena desde php/contenido.php leyendo
--  estas tablas. Las filas de ejemplo se insertan automáticamente
--  desde php/schema.php (semillarContenido) solo si InfoGeneral
--  está vacía, por eso aquí solo se define la estructura.
-- ══════════════════════════════════════════════════════════════

-- Información institucional (lema, misión, visión, contacto)
CREATE TABLE IF NOT EXISTS InfoGeneral (
    id                  INT UNSIGNED    NOT NULL AUTO_INCREMENT,
    nombre_institucion  VARCHAR(150)    NOT NULL,
    lema                VARCHAR(150)    NULL DEFAULT NULL,
    mision              TEXT            NULL,
    vision              TEXT            NULL,
    anio_lectivo        VARCHAR(10)     NULL DEFAULT NULL,
    telefono            VARCHAR(30)     NULL DEFAULT NULL,
    email               VARCHAR(120)    NULL DEFAULT NULL,
    direccion           VARCHAR(160)    NULL DEFAULT NULL,
    PRIMARY KEY (id)
) ENGINE = InnoDB
  DEFAULT CHARSET = utf8mb4
  COLLATE = utf8mb4_unicode_ci;

-- Datos de contacto (barra superior, redes sociales y frase del footer)
CREATE TABLE IF NOT EXISTS Contacto (
    id              INT UNSIGNED    NOT NULL AUTO_INCREMENT,
    tel1            VARCHAR(30)     NULL DEFAULT NULL,
    tel2            VARCHAR(30)     NULL DEFAULT NULL,
    email1          VARCHAR(120)    NULL DEFAULT NULL,
    email2          VARCHAR(120)    NULL DEFAULT NULL,
    direccion       VARCHAR(160)    NULL DEFAULT NULL,
    facebook        VARCHAR(255)    NULL DEFAULT NULL,
    instagram       VARCHAR(255)    NULL DEFAULT NULL,
    youtube         VARCHAR(255)    NULL DEFAULT NULL,
    frase           VARCHAR(255)    NULL DEFAULT NULL,
    PRIMARY KEY (id)
) ENGINE = InnoDB
  DEFAULT CHARSET = utf8mb4
  COLLATE = utf8mb4_unicode_ci;

-- Diapositivas del banner principal
CREATE TABLE IF NOT EXISTS Slides (
    id              INT UNSIGNED    NOT NULL AUTO_INCREMENT,
    titulo          VARCHAR(150)    NOT NULL,
    subtitulo       VARCHAR(150)    NULL DEFAULT NULL,
    pill            VARCHAR(150)    NULL DEFAULT NULL,
    descripcion     VARCHAR(255)    NULL DEFAULT NULL,
    btn_texto       VARCHAR(60)     NULL DEFAULT NULL,
    btn_enlace      VARCHAR(160)    NULL DEFAULT NULL,
    btn_texto2      VARCHAR(60)     NULL DEFAULT NULL,
    btn_enlace2     VARCHAR(160)    NULL DEFAULT NULL,
    orden           INT UNSIGNED    NOT NULL DEFAULT 0,
    activo          ENUM('activo','inactivo') NOT NULL DEFAULT 'activo',
    PRIMARY KEY (id)
) ENGINE = InnoDB
  DEFAULT CHARSET = utf8mb4
  COLLATE = utf8mb4_unicode_ci;

-- Eventos (tarjeta "Próximos eventos" y cuenta regresiva)
CREATE TABLE IF NOT EXISTS Eventos (
    id              INT UNSIGNED    NOT NULL AUTO_INCREMENT,
    nombre          VARCHAR(160)    NOT NULL,
    dia             TINYINT UNSIGNED NULL DEFAULT NULL,
    mes             VARCHAR(3)      NULL DEFAULT NULL,
    hora_inicio     VARCHAR(5)      NULL DEFAULT NULL,
    hora_fin        VARCHAR(5)      NULL DEFAULT NULL,
    lugar           VARCHAR(160)    NULL DEFAULT NULL,
    fecha           DATE            NULL DEFAULT NULL,
    orden           INT UNSIGNED    NOT NULL DEFAULT 0,
    activo          ENUM('activo','inactivo') NOT NULL DEFAULT 'activo',
    PRIMARY KEY (id)
) ENGINE = InnoDB
  DEFAULT CHARSET = utf8mb4
  COLLATE = utf8mb4_unicode_ci;

-- Noticias (tarjeta "Últimas noticias")
CREATE TABLE IF NOT EXISTS Noticias (
    id              INT UNSIGNED    NOT NULL AUTO_INCREMENT,
    titulo          VARCHAR(200)    NOT NULL,
    resumen         VARCHAR(300)    NULL DEFAULT NULL,
    contenido       TEXT            NULL,
    fecha           DATE            NULL DEFAULT NULL,
    imagen          VARCHAR(255)    NULL DEFAULT NULL,
    activo          ENUM('activo','inactivo') NOT NULL DEFAULT 'activo',
    PRIMARY KEY (id)
) ENGINE = InnoDB
  DEFAULT CHARSET = utf8mb4
  COLLATE = utf8mb4_unicode_ci;

-- Imágenes de los elementos (una o varias por cada slide, evento o noticia).
-- "ruta" guarda una ruta relativa al proyecto, p. ej. uploads/eventos/123.jpg
CREATE TABLE IF NOT EXISTS Imagenes (
    id              INT UNSIGNED    NOT NULL AUTO_INCREMENT,
    seccion         VARCHAR(20)     NOT NULL,
    elemento_id     INT UNSIGNED    NOT NULL,
    ruta            VARCHAR(255)    NOT NULL,
    posicion        INT UNSIGNED    NOT NULL DEFAULT 0,
    activo          ENUM('activo','inactivo') NOT NULL DEFAULT 'activo',
    PRIMARY KEY (id),
    KEY idx_imagenes_seccion (seccion, elemento_id)
) ENGINE = InnoDB
  DEFAULT CHARSET = utf8mb4
  COLLATE = utf8mb4_unicode_ci;

-- Documentos institucionales (Manual de Convivencia).
-- Un solo documento vigente por sección; "ruta" es relativa al proyecto,
-- p. ej. uploads/documentos/manual_20260101-100000_ab12cd34.pdf
CREATE TABLE IF NOT EXISTS Documentos (
    id              INT UNSIGNED    NOT NULL AUTO_INCREMENT,
    seccion         VARCHAR(30)     NOT NULL,
    nombre          VARCHAR(200)    NULL DEFAULT NULL,
    nombre_original VARCHAR(200)    NULL DEFAULT NULL,
    ruta            VARCHAR(255)    NOT NULL,
    tamano          INT UNSIGNED    NULL DEFAULT NULL,
    activo          ENUM('activo','inactivo') NOT NULL DEFAULT 'activo',
    PRIMARY KEY (id),
    UNIQUE KEY uq_documentos_seccion (seccion)
) ENGINE = InnoDB
  DEFAULT CHARSET = utf8mb4
  COLLATE = utf8mb4_unicode_ci;

-- Secciones editables de las páginas públicas (Nosotros, Académico, Estudiantes,
-- Padres y Horarios). Cada fila corresponde a una <section data-panel="..."> de
-- la página; "items" guarda como JSON las tarjetas, cifras, hitos o filas de
-- horarios. Se siembra automáticamente desde php/schema.php (seccionesSemilla)
-- solo si la tabla está vacía, para conservar las ediciones del panel admin.
CREATE TABLE IF NOT EXISTS Secciones (
    id              INT UNSIGNED    NOT NULL AUTO_INCREMENT,
    pagina          VARCHAR(40)     NOT NULL,
    seccion         VARCHAR(60)     NOT NULL,
    kicker          VARCHAR(150)    NULL DEFAULT NULL,
    titulo          VARCHAR(200)    NULL DEFAULT NULL,
    descripcion     TEXT            NULL,
    tag             VARCHAR(100)    NULL DEFAULT NULL,
    items           LONGTEXT        NULL,
    orden           INT UNSIGNED    NOT NULL DEFAULT 0,
    activo          ENUM('activo','inactivo') NOT NULL DEFAULT 'activo',
    PRIMARY KEY (id),
    UNIQUE KEY uq_pagina_seccion (pagina, seccion)
) ENGINE = InnoDB
  DEFAULT CHARSET = utf8mb4
  COLLATE = utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- Configuracion — ajustes internos de la aplicación.
-- Guarda la versión del esquema ya instalada (ESQUEMA_VERSION en
-- php/schema.php) para que php/config.php NO vuelva a ejecutar el
-- instalador completo (crear tablas, migrar, sembrar) en cada petición.
-- SÚBELA si más adelante se modifica la estructura de una tabla.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS Configuracion (
    clave  VARCHAR(60)  NOT NULL,
    valor  VARCHAR(255) NULL DEFAULT NULL,
    PRIMARY KEY (clave)
) ENGINE = InnoDB
  DEFAULT CHARSET = utf8mb4
  COLLATE = utf8mb4_unicode_ci;

-- Marca el esquema como instalado. Si importas este dump y el código no
-- encuentra esta fila, php/config.php correrá el instalador una vez para
-- sincronizar el esquema; a partir de ahí ya no lo repetirá.
INSERT INTO Configuracion (clave, valor) VALUES ('esquema_version', '1')
  ON DUPLICATE KEY UPDATE valor = VALUES(valor);