@echo off
setlocal enabledelayedexpansion
title Reparar la cuenta root de MariaDB (XAMPP)

set "XAMPP=C:\xampp"
set "BIN=%XAMPP%\mysql\bin"
set "DATA=%XAMPP%\mysql\data"
set "MYSQLD=%BIN%\mysqld.exe"
set "MYSQL=%BIN%\mysql.exe"
set "MYSQLADMIN=%BIN%\mysqladmin.exe"
set "MYINI=%BIN%\my.ini"
set "LOG=%DATA%\mysql_error.log"
set "CACHE=C:\xampp\htdocs\Proyecto_Productivo2026\php\.cache\conexion.json"
set "PUERTO=3306"
set "SQL=%~dp0reparar_root.sql"

echo.
echo ==============================================================
echo   REPARAR root DE MARIADB (XAMPP) - tablas de permisos danadas
echo ==============================================================
echo.

if not exist "%MYSQLD%"     goto sin_bin
if not exist "%MYSQL%"       goto sin_bin
if not exist "%MYSQLADMIN%"  goto sin_bin
if not exist "%SQL%"         goto sin_sql

rem ---------------------------------------------------------------
rem  1. Parar MySQL y limpiar rastros del intento anterior
rem ---------------------------------------------------------------
echo [1/7] Deteniendo MySQL...
call :para_mysql
del /F /Q "%DATA%\mysql.pid" >nul 2>&1
del /F /Q "%CACHE%" >nul 2>&1
echo       Hecho.
echo.

rem ---------------------------------------------------------------
rem  2. Modo emergencia: sin tablas de permisos entra cualquiera
rem ---------------------------------------------------------------
echo [2/7] Arrancando MariaDB con --skip-grant-tables...
start "" /B "%MYSQLD%" --defaults-file="%MYINI%" --skip-grant-tables --port=%PUERTO%
call :espera_puerto
if errorlevel 1 goto fallo_emergencia
echo       MariaDB esta escuchando en el puerto %PUERTO%.
echo.

rem ---------------------------------------------------------------
rem  3. REPAIR de las tablas del sistema + recrear root
rem ---------------------------------------------------------------
echo [3/7] Reparando tablas del sistema (puede tardar unos segundos)...
echo --------------------------------------------------------------
rem  --force a proposito: si el REPAIR de una tabla concreta falla, se
rem  sigue con las demas y con la creacion de root en vez de abortar
rem  en el primer error.
"%MYSQL%" --protocol=TCP -P %PUERTO% -u root --force --table < "%SQL%"
echo --------------------------------------------------------------
echo.

rem ---------------------------------------------------------------
rem  4. Comprobar que la reparacion sirvio de algo
rem
rem  La comprobacion NO puede ser un simple "SELECT 1": arrancado con
rem  --skip-grant-tables, CUALQUIER usuario entra aunque las tablas
rem  esten rotas, asi que daria verde siempre. Por eso la consulta
rem  empieza con FLUSH PRIVILEGES (reactiva el control de permisos en
rem  todo el servidor) y despues lee mysql.user. Si algo de eso falla,
rem  es que la tabla sigue inservible.
rem ---------------------------------------------------------------
echo [4/7] Comprobando si la reparacion sirvio...
"%MYSQL%" --protocol=TCP -P %PUERTO% -u root -e "FLUSH PRIVILEGES; SELECT COUNT(*) FROM mysql.user;" >nul 2>&1
if errorlevel 1 goto reset_datos
echo       Tabla de cuentas legible y root autenticado.
echo.
goto reinicio

rem ---------------------------------------------------------------
rem  5. Reset: el REPAIR no alcanzo, se borra la tabla de cuentas para
rem     que MariaDB la recree vacia. Se pierde TODAS las demas cuentas
rem     de MySQL, no solo root.
rem ---------------------------------------------------------------
:reset_datos
echo       La tabla de cuentas sigue ilegible: se borra para recrearla.
echo       Esto elimina TODAS las cuentas de MySQL, no solo root.
echo.

call :para_mysql
del /F /Q "%DATA%\mysql.pid" >nul 2>&1
del /F /Q "%DATA%\mysql\global_priv.MAD" >nul 2>&1
del /F /Q "%DATA%\mysql\global_priv.MAI" >nul 2>&1
del /F /Q "%DATA%\mysql\user.MAD"       >nul 2>&1
del /F /Q "%DATA%\mysql\user.MAI"       >nul 2>&1
del /F /Q "%DATA%\mysql\db.MAD"         >nul 2>&1
del /F /Q "%DATA%\mysql\db.MAI"         >nul 2>&1

start "" /B "%MYSQLD%" --defaults-file="%MYINI%" --skip-grant-tables --port=%PUERTO%
call :espera_puerto
if errorlevel 1 goto fallo_emergencia

echo       Recreando root sobre la tabla nueva...
echo --------------------------------------------------------------
"%MYSQL%" --protocol=TCP -P %PUERTO% -u root --force --table < "%SQL%"
echo --------------------------------------------------------------
echo.

"%MYSQL%" --protocol=TCP -P %PUERTO% -u root -e "FLUSH PRIVILEGES; SELECT COUNT(*) FROM mysql.user;" >nul 2>&1
if errorlevel 1 goto fallo_root

rem ---------------------------------------------------------------
rem  6. Reinicio en modo normal
rem ---------------------------------------------------------------
:reinicio
echo [5/7] Cerrando el modo de emergencia...
call :para_mysql
del /F /Q "%DATA%\mysql.pid" >nul 2>&1

echo [6/7] Reiniciando MySQL en modo normal...
start "" "%MYSQLD%" --defaults-file="%MYINI%"
call :espera_puerto
if errorlevel 1 goto fallo_normal

rem ---------------------------------------------------------------
rem  7. Verificacion final con el control de permisos ya activo
rem ---------------------------------------------------------------
echo [7/7] Verificando la conexion real (root sin contrasena)...
echo --------------------------------------------------------------
"%MYSQL%" --protocol=TCP -P %PUERTO% -u root --table -e "SELECT user, host, plugin FROM mysql.user ORDER BY user, host; SELECT COUNT(*) AS tablas_del_proyecto FROM information_schema.tables WHERE table_schema='IeSanFelixAlDia';"
if errorlevel 1 goto fallo_root
echo --------------------------------------------------------------
echo.

echo ==============================================================
echo   LISTO
echo ==============================================================
echo   Recarga el sitio: el error 1130 debe desaparecer.
echo   Si "tablas_del_proyecto" salio en 0, abre una vez:
echo     http://localhost/Proyecto_Productivo2026/php/instalar_db.php
echo   o cualquier pagina del sitio, que las crea sola.
echo.
echo   MySQL quedo corriendo en su propia ventana: minimizala.
echo   Si cierras esa ventana, MySQL se detiene.
echo ==============================================================
echo.
goto fin

rem ---------------------------------------------------------------
rem  Etiquetas de error
rem ---------------------------------------------------------------
:fallo_emergencia
echo [FALLO] MariaDB no respondio en el puerto %PUERTO%.
call :cola_log
goto fin

:fallo_normal
echo [FALLO] MariaDB arranco pero no esta escuchando en el puerto %PUERTO%.
call :cola_log
goto fin

:fallo_root
echo ==============================================================
echo   SIGUE FALLANDO
echo ==============================================================
echo   El servidor levanta y la tabla de cuentas ya no esta corrupta,
echo   pero root todavia no entra. Copia aqui el error que salio
echo   arriba y las ultimas lineas de mysql_error.log.
echo.
call :cola_log
goto fin

:sin_bin
echo [FALLO] No se encontro MySQL en "%BIN%".
echo         Revisa que XAMPP siga instalado en C:\xampp.
goto fin

:sin_sql
echo [FALLO] No se encontro "%SQL%".
echo         Mantiene reparar_root.bat y reparar_root.sql juntos.
goto fin

rem ---------------------------------------------------------------
rem  Cola del log de MariaDB
rem ---------------------------------------------------------------
:cola_log
echo --------------------------------------------------------------
echo Ultimas lineas de %LOG%:
echo --------------------------------------------------------------
powershell -NoProfile -Command "if (Test-Path -LiteralPath '%LOG%') { Get-Content -LiteralPath '%LOG%' -Tail 25 } else { Write-Output 'No existe el archivo de log.' }"
goto :eof

rem ---------------------------------------------------------------
rem  Sonda de disponibilidad: abre un socket TCP al puerto.
rem  NO usa "mysql -u root" a proposito: con 1130 esa consulta falla
rem  aunque el servidor este arriba, y eso daba un falso "MySQL no arranco".
rem ---------------------------------------------------------------
:espera_puerto
set /a ESPERA=0
:sonda
powershell -NoProfile -Command "$c=New-Object System.Net.Sockets.TcpClient; try { $c.Connect('127.0.0.1',%PUERTO%); exit 0 } catch { exit 1 } finally { $c.Close() }" >nul 2>&1
if not errorlevel 1 exit /b 0
set /a ESPERA+=1
if !ESPERA! geq 45 exit /b 1
timeout /t 1 /nobreak >nul
goto sonda

rem ---------------------------------------------------------------
rem  Parar MySQL. Primero con mysqladmin (cierre limpio: InnoDB no
rem  queda pendiente de recuperacion), y si no se puede porque root
rem  no entra, se fuerza. Un cierre forzado repetido es lo que deja
rem  InnoDB con el "log sequence number does not match" del log.
rem ---------------------------------------------------------------
:para_mysql
"%MYSQLADMIN%" --protocol=TCP -P %PUERTO% -u root shutdown >nul 2>&1
if not errorlevel 1 goto :pm_espera
taskkill /F /IM mysqld.exe /T >nul 2>&1
:pm_espera
set /a ESPERA=0
:pm_sonda
tasklist /FI "IMAGENAME eq mysqld.exe" 2>nul | find /I "mysqld.exe" >nul
if errorlevel 1 goto :eof
set /a ESPERA+=1
if !ESPERA! geq 20 goto :eof
timeout /t 1 /nobreak >nul
goto pm_sonda

:fin
echo.
pause
endlocal
