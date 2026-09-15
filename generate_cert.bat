@echo off
set CERT_DIR=%~dp0certs
set KEY_FILE=%CERT_DIR%\server.key
set CRT_FILE=%CERT_DIR%\server.crt

if not exist "%CERT_DIR%" mkdir "%CERT_DIR%"

if exist "%KEY_FILE%" if exist "%CRT_FILE%" (
    echo [OK] SSL certificates already exist in %CERT_DIR%
    exit /b 0
)

echo Generating self-signed SSL certificate for LAN access...
openssl req -x509 -nodes -days 3650 -newkey rsa:2048 -keyout "%KEY_FILE%" -out "%CRT_FILE%" -subj "/CN=OggleBox LAN Server" -addext "subjectAltName=DNS:localhost,IP:127.0.0.1"

if %ERRORLEVEL% EQU 0 (
    echo [OK] Self-signed certificate generated successfully!
    echo   Private Key: %KEY_FILE%
    echo   Certificate: %CRT_FILE%
) else (
    echo [!] OpenSSL not found or failed. Please install OpenSSL or copy server.key and server.crt into certs folder.
)
