@echo off
setlocal
title Arrancar MySQL y comprobar la cuenta root

set "BIN=C:\xampp\mysql\bin"
set "LOG=C:\xampp\mysql\data\mysql_error.log"

echo.
echo ===========================================================
echo   ARRANCAR MYSQL Y COMPROBAR root
echo ===========================================================
echo.

if not exist "%BIN%\mysqld.exe" (
    echo [FALLO] No encuentro MariaDB en %BIN%
    echo.
    pause
    exit /b 1
)

rem Si ya hay un mysqld vivo no se toca nada: matarlo seria tirar el servidor
rem que ya funciona. Solo se arranca si no hay ninguno.
tasklist /FI "IMAGENAME eq mysqld.exe" 2>nul | find /I "mysqld.exe" >nul
if not errorlevel 1 (
    echo [INFO] Ya hay un mysqld.exe corriendo. No se toca nada.
) else (
    echo [1/3] No hay ningun mysqld corriendo. Arrancando...
    start "MySQL" /min "%BIN%\mysqld.exe" --defaults-file="%BIN%\my.ini"
)

echo [2/3] Esperando a que responda en 127.0.0.1:3306...
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
    echo [OK] El servidor ESTA ARRIBA. MariaDB responde.
    echo.
    echo Ahora la otra pregunta: ¿existe la cuenta root?
    echo.
    "%BIN%\mysql.exe" -u root -h 127.0.0.1 --protocol=TCP -e "SELECT user, host FROM mysql.user ORDER BY user, host;" >nul 2>&1
    if errorlevel 1 (
        echo [FALLO] El servidor responde, pero root NO puede entrar.
        echo        La reparacion de la cuenta no llego a aplicarse.
        echo.
        echo Ejecuta ahora, como administrador:
        echo    %~dp0reparar_root.bat
        echo.
    ) else (
        echo [OK] root entra correctamente y estas son sus cuentas:
        echo.
        "%BIN%\mysql.exe" -u root -h 127.0.0.1 --protocol=TCP -e "SELECT user, host FROM mysql.user ORDER BY user, host;"
        echo.
        echo Ya puedes entrar en http://localhost/Proyecto_Productivo2026/
    )
) else (
    echo [FALLO] MySQL NO arranca: sigue sin escuchar en 3306.
    echo.
    echo Ultimas lineas de %LOG%:
    echo ------------------------------------------------------------
    powershell -NoProfile -Command "Get-Content -Tail 20 -LiteralPath '%LOG%'" 2>nul
    echo ------------------------------------------------------------
    echo.
    echo Si el log no dice nada nuevo, el problema es que el puerto 3306
    echo esta ocupado por otro programa. Para verlo:
    echo     netstat -ano ^| findstr :3306
    echo y luego matar ese PID, por ejemplo:
    echo     taskkill /F /PID <numero>
    echo.
    echo Si el log dice "Can't start server: Bind on TCP/IP port",
    echo casi siempre es que hay otro mysqld.exe o un MySQL instalado
    echo aparte ocupando el 3306.
)

echo.
pause
