@echo off
setlocal
title Liberar el puerto 3306 y arrancar MySQL

set "BIN=C:\xampp\mysql\bin"
set "LOG=C:\xampp\mysql\data\mysql_error.log"

echo.
echo ===========================================================
echo   LIBERAR EL PUERTO 3306 Y ARRANCAR MYSQL
echo ===========================================================
echo.

net session >nul 2>&1
if errorlevel 1 (
    echo [AVISO] No tienes permisos de administrador. Podras ver quien
    echo         ocupa el puerto, pero quizá no puedas matarlo.
    echo         Si al final te dice que lo cierre, vuelve a ejecutar
    echo         este archivo como administrador.
    echo.
)

echo === 1. Procesos mysqld.exe ahora mismo ===
tasklist /FI "IMAGENAME eq mysqld.exe" /NH 2>nul | find /I "mysqld" >nul
if errorlevel 1 (echo     (ninguno) ) else (tasklist /FI "IMAGENAME eq mysqld.exe" /NH 2>nul)
echo.

echo === 2. Servicios de Windows con "mysql" ===
sc query type= service state= all 2>nul | find /I "SERVICE_NAME: MYSQL"
if errorlevel 1 (echo     (ninguno) )
echo.

echo === 3. Todo lo que aparece en el puerto 3306 ===
netstat -ano | findstr ":3306"
if errorlevel 1 (echo     (el puerto esta libre) )
echo.

echo === 4. Que proceso es cada uno ===
set "HAY="
for /f "tokens=1-5" %%a in ('netstat -ano ^| findstr ":3306"') do (
    echo     %%a %%b %%c %%d   PID=%%e
    tasklist /FI "PID eq %%e" /NH 2>nul
    set "HAY=si"
)
if not defined HAY (echo     (nada) )
echo.

echo === 5. Cerrando cualquier mysqld.exe ===
taskkill /F /IM mysqld.exe >nul 2>&1
if errorlevel 1 (echo     No habia ninguno.) else (echo     Cerrados.)
timeout /t 3 /nobreak >nul
echo.

echo === 6. Comprobando si el puerto quedo libre ===
set "OCUPADO="
set "PIDAJENO="
for /f "tokens=1-5" %%a in ('netstat -ano ^| findstr ":3306"') do (
    set "HAY=si"
    tasklist /FI "PID eq %%e" /NH 2>nul | find /I "mysqld" >nul
    if errorlevel 1 (
        set "OCUPADO=si"
        echo     PID %%e sigue ocupando el puerto y NO es un mysqld:
        tasklist /FI "PID eq %%e" /NH 2>nul
    ) else (
        taskkill /F /PID %%e >nul 2>&1
    )
)
if defined OCUPADO (
    echo.
    echo [FALLO] Hay un proceso ajeno al MySQL de XAMPP con el puerto 3306.
    echo        Yese es el culpable del "Port 3306 in use" del Panel.
    echo        Opciones, en este orden:
    echo          1. Si es otro MySQL instalado aparte, detén ese servicio:
    echo             sc query type= service state= all ^| findstr /I MYSQL
    echo             net stop <nombre_del_servicio>
    echo          2. O mata el proceso directamente (como administrador):
    echo             taskkill /F /PID <numero>
    echo          3. Si no se deja matar, reinicia Windows y vuelve a intentar.
    echo.
    pause
    exit /b 1
)
if defined HAY (
    echo     El puerto sigue reservado por un proceso mysqld que no ha
    echo     podido cerrarse. Reinicia Windows y vuelve a ejecutar esto.
    echo.
    pause
    exit /b 1
)
echo     Puerto 3306 LIBRE.
echo.

echo === 7. Arrancando MariaDB ===
start "MySQL" /min "%BIN%\mysqld.exe" --defaults-file="%BIN%\my.ini"

set "VIVO="
for /l %%i in (1,1,12) do (
    if not defined VIVO (
        "%BIN%\mysqladmin.exe" -u root -h 127.0.0.1 --protocol=TCP ping >nul 2>&1
        if not errorlevel 1 set "VIVO=si"
        if not defined VIVO timeout /t 2 /nobreak >nul
    )
)

echo.
if defined VIVO (
    echo [OK] MySQL esta ARRIBA.
    echo.
    "%BIN%\mysql.exe" -u root -h 127.0.0.1 --protocol=TCP -e "SELECT user, host FROM mysql.user ORDER BY user, host;" >nul 2>&1
    if errorlevel 1 (
        echo     Pero root NO puede entrar: la cuenta sigue sin crearse.
        echo     Ejecuta como administrador:  %~dp0reparar_root.bat
    ) else (
        echo     Y root entra correctamente. Cuentas existentes:
        "%BIN%\mysql.exe" -u root -h 127.0.0.1 --protocol=TCP -e "SELECT user, host FROM mysql.user ORDER BY user, host;"
    )
) else (
    echo [FALLO] MySQL sigue sin arrancar. Ultimas lineas del log:
    echo ------------------------------------------------------------
    powershell -NoProfile -Command "Get-Content -Tail 20 -LiteralPath '%LOG%'" 2>nul
    echo ------------------------------------------------------------
)

echo.
pause
