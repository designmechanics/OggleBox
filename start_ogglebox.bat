@echo off 
TITLE OggleBox Server 
if exist "%cd%\ffmpeg-local\bin\ffmpeg.exe" set "PATH=%cd%\ffmpeg-local\bin;%PATH%" 
npm start 
