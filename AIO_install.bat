@echo off
TITLE OggleBox Server - AIO Installer
echo =======================================================
echo  OggleBox Server - AIO Install (Windows)
echo =======================================================
echo.

:: 1. Check Node.js
where node >nul 2>nul
if %ERRORLEVEL% equ 0 goto node_installed

echo [!] Node.js not found.
echo Attempting to install Node.js via winget...
winget install OpenJS.NodeJS -e --id OpenJS.NodeJS
echo.
echo [!] Please RESTART this installer (close this window and run again) after Node.js finishes installing.
pause
exit /b 1

:node_installed
echo [OK] Node.js is installed.

:: 2. Check FFmpeg
where ffmpeg >nul 2>nul
if %ERRORLEVEL% equ 0 goto ffmpeg_installed

echo [!] FFmpeg not found in global PATH.
if exist "%cd%\ffmpeg-local\bin\ffmpeg.exe" goto ffmpeg_local_found

echo Downloading FFmpeg locally to the app folder...
powershell -Command "[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; Invoke-WebRequest -Uri 'https://github.com/BtbN/FFmpeg-Builds/releases/download/latest/ffmpeg-master-latest-win64-gpl.zip' -OutFile 'ffmpeg.zip'"
echo Extracting FFmpeg (this might take a minute)...
powershell -Command "Expand-Archive -Path 'ffmpeg.zip' -DestinationPath '.' -Force"
powershell -Command "Rename-Item -Path 'ffmpeg-master-latest-win64-gpl' -NewName 'ffmpeg-local' -ErrorAction SilentlyContinue"
del ffmpeg.zip
echo [OK] FFmpeg downloaded and extracted.

:ffmpeg_local_found
echo [OK] Local FFmpeg found in %cd%\ffmpeg-local
set "PATH=%cd%\ffmpeg-local\bin;%PATH%"
goto install_deps

:ffmpeg_installed
echo [OK] FFmpeg is installed globally.

:install_deps
:: 3. Install Dependencies
echo.
echo =======================================================
echo  Installing Node Dependencies (npm install)
echo =======================================================
call npm install

:: 4. Build App
echo.
echo =======================================================
echo  Building OggleBox (npm run build)
echo =======================================================
call npm run build

:: 5. Create start script for convenience
echo @echo off > start_ogglebox.bat
echo TITLE OggleBox Server >> start_ogglebox.bat
echo if exist "%%cd%%\ffmpeg-local\bin\ffmpeg.exe" set "PATH=%%cd%%\ffmpeg-local\bin;%%PATH%%" >> start_ogglebox.bat
echo npm start >> start_ogglebox.bat

echo.
echo =======================================================
echo  INSTALLATION COMPLETE!
echo =======================================================
echo A convenient 'start_ogglebox.bat' file has been created.
echo Double-click 'start_ogglebox.bat' to run your server anytime.
echo.
echo Once started, open http://^<LAN_IP^>:3000 from any device on your network.
echo No SSL certificates or trust setup required!
echo.
pause
