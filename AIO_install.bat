@echo off
TITLE OggleBox Server - AIO Installer
echo =======================================================
echo  OggleBox Server - AIO Install (Windows)
echo =======================================================
echo.

:: 1. Check Node.js
where node >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo [!] Node.js not found.
    echo Attempting to install Node.js via winget...
    winget install OpenJS.NodeJS -e --id OpenJS.NodeJS
    echo.
    echo [!] Please RESTART this installer (close this window and run again) after Node.js finishes installing.
    pause
    exit /b 1
) else (
    echo [OK] Node.js is installed.
)

:: 2. Check FFmpeg
where ffmpeg >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo [!] FFmpeg not found in global PATH.
    if exist "%cd%\ffmpeg-local\bin\ffmpeg.exe" (
        echo [OK] Local FFmpeg found in %cd%\ffmpeg-local
        set "PATH=%cd%\ffmpeg-local\bin;%PATH%"
    ) else (
        echo Downloading FFmpeg locally to the app folder...
        powershell -Command "[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; Invoke-WebRequest -Uri 'https://github.com/BtbN/FFmpeg-Builds/releases/download/latest/ffmpeg-master-latest-win64-gpl.zip' -OutFile 'ffmpeg.zip'"
        echo Extracting FFmpeg (this might take a minute)...
        powershell -Command "Expand-Archive -Path 'ffmpeg.zip' -DestinationPath '.' -Force"
        powershell -Command "Rename-Item -Path 'ffmpeg-master-latest-win64-gpl' -NewName 'ffmpeg-local' -ErrorAction SilentlyContinue"
        del ffmpeg.zip
        echo [OK] FFmpeg downloaded and extracted.
        set "PATH=%cd%\ffmpeg-local\bin;%PATH%"
    )
) else (
    echo [OK] FFmpeg is installed globally.
)

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
pause
