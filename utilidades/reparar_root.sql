-- ==========================================================================
--  REPARAR root CUANDO LAS TABLAS DE PERMISOS ESTAN CORRUPTAS
--  MariaDB 10.4 (el "MySQL" de XAMPP)
-- ==========================================================================
--  El sintoma es este:
--     ERROR 1030 (HY000): Got error 176 "Read page with wrong checksum"
--     from storage engine Aria
--  MariaDB guarda las cuentas en mysql.global_priv, que es una tabla ARIA.
--  Si esa tabla tiene una pagina con el checksum roto, el servidor NO la puede
--  leer: no encuentra ninguna cuenta que case y devuelve 1130 para CUALQUIER
--  host. Por eso ni la consola ni phpMyAdmin sirven: para entrar hay que
--  pasar por la tabla danada.
--  La salida es REPAIR TABLE, o borrar el archivo de la tabla para que MariaDB
--  la recree vacia.
--
--  Se ejecuta con el servidor en modo --skip-grant-tables. Por eso la PRIMERA
--  instruccion es obligatoria: FLUSH PRIVILEGES vuelve a activar el sistema de
--  permisos y, sin ella, los DROP/CREATE USER de abajo se rechazan.
--
--  EJECUTAR: doble clic en reparar_root.bat (el .bat reinicia MySQL, esto solo
--  no se puede hacer a mano).
--
--  El .bat lo invoca con mysql.exe --force a proposito: si un REPAIR de una
--  tabla concreta falla, se sigue con las demas y con la creacion de root.
-- ==========================================================================

FLUSH PRIVILEGES;

-- --------------------------------------------------------------------------
--  PASO 1 - Reparar las tablas del sistema que estan en ARIA
-- --------------------------------------------------------------------------
-- REPAIR de Aria reconstruye los indices. Si la pagina danada todavia se
-- puede leer, esto basta y RECUPERA las cuentas que ya existian.
REPAIR TABLE mysql.global_priv;
REPAIR TABLE mysql.db;
REPAIR TABLE mysql.tables_priv;
REPAIR TABLE mysql.columns_priv;
REPAIR TABLE mysql.procs_priv;
REPAIR TABLE mysql.event;
REPAIR TABLE mysql.func;
REPAIR TABLE mysql.plugin;
REPAIR TABLE mysql.proxies_priv;
REPAIR TABLE mysql.roles_mapping;
REPAIR TABLE mysql.column_stats;
REPAIR TABLE mysql.index_stats;
REPAIR TABLE mysql.table_stats;
REPAIR TABLE mysql.servers;

-- Si REPAIR no alcanzo (la pagina esta tan danada que ni se puede leer),
-- esto reescribe la tabla entera. Cuesta unos segundos mas, pero es la
-- segunda via antes de borrar el archivo.
ALTER TABLE mysql.global_priv ENGINE=Aria;

-- --------------------------------------------------------------------------
--  PASO 2 - Diagnostico
-- --------------------------------------------------------------------------
-- Con --force, si alguna de estas consultas falla por corrupcion, el script
-- continua y aun así intenta el PASO 3.
SELECT @@version AS version, @@datadir AS datadir, @@port AS puerto;
SELECT COUNT(*) AS total_cuentas FROM mysql.user;
SELECT user, host, plugin FROM mysql.user ORDER BY user, host;

-- --------------------------------------------------------------------------
--  PASO 3 - Recrear la cuenta root
-- --------------------------------------------------------------------------
-- DROP + CREATE (y no CREATE IF NOT EXISTS) a proposito: si la cuenta
-- sobrevive al REPAIR pero con otro plugin (por ejemplo unix_socket, que no
-- acepta conexiones por TCP) CREATE IF NOT EXISTS no la tocaría y el sitio
-- seguiria sin poder entrar. Asi el plugin queda SIEMPRE en
-- mysql_native_password y la contrasena vacia, que es lo unico que acepta
-- php/config.php (DB_PASS vacio).
--
-- MariaDB concede los permisos por la pareja (usuario, host) y no los hereda
-- de un host a otro: 'root'@'localhost', 'root'@'127.0.0.1' y 'root'@'::1' son
-- tres cuentas distintas. En Windows "localhost" resuelve a '::1' antes que a
-- '127.0.0.1', y ademas el servidor hace DNS inverso, asi que una conexion
-- por cualquiera de los dos puede presentarse como 'localhost': hacen falta
-- las tres. La de '%' cubre el caso de que el servidor vea el nombre del
-- equipo en vez de una direccion de loopback.

DROP USER IF EXISTS 'root'@'localhost';
CREATE USER 'root'@'localhost' IDENTIFIED VIA mysql_native_password USING PASSWORD('');
GRANT ALL PRIVILEGES ON *.* TO 'root'@'localhost' WITH GRANT OPTION;

DROP USER IF EXISTS 'root'@'127.0.0.1';
CREATE USER 'root'@'127.0.0.1' IDENTIFIED VIA mysql_native_password USING PASSWORD('');
GRANT ALL PRIVILEGES ON *.* TO 'root'@'127.0.0.1' WITH GRANT OPTION;

DROP USER IF EXISTS 'root'@'::1';
CREATE USER 'root'@'::1' IDENTIFIED VIA mysql_native_password USING PASSWORD('');
GRANT ALL PRIVILEGES ON *.* TO 'root'@'::1' WITH GRANT OPTION;

DROP USER IF EXISTS 'root'@'%';
CREATE USER 'root'@'%' IDENTIFIED VIA mysql_native_password USING PASSWORD('');
GRANT ALL PRIVILEGES ON *.* TO 'root'@'%' WITH GRANT OPTION;

FLUSH PRIVILEGES;

-- --------------------------------------------------------------------------
--  PASO 4 - Verificacion
-- --------------------------------------------------------------------------
-- Debe salir root en localhost, 127.0.0.1, ::1 y %, los cuatro con plugin
-- mysql_native_password. Si total_cuentas sale mayor que 4, el REPAIR recupero
-- las cuentas que ya existian: mejor, no se perdio nada.
SELECT COUNT(*) AS total_cuentas FROM mysql.user;
SELECT user, host, plugin FROM mysql.user ORDER BY user, host;

-- Tablas de la base del proyecto. Si sale 0 no pasa nada: php/config.php la
-- crea sola en la siguiente peticion (error 1049).
SELECT COUNT(*) AS tablas_iesanfelixaldia
  FROM information_schema.tables
 WHERE table_schema = 'IeSanFelixAlDia';
