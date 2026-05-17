@echo off
REM MindColor — local dev server (Node thuan)
REM Dung: serve.bat          → port 8080
REM       serve.bat 3000     → port 3000

setlocal
set PORT=%1
if "%PORT%"=="" set PORT=8080

cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo [LOI] Khong tim thay Node.js.
  echo Cai tai: https://nodejs.org/
  pause
  exit /b 1
)

REM Mo browser sau 1.5s (de server kip boot)
start "" /b cmd /c "timeout /t 2 /nobreak >nul && start http://localhost:%PORT%"

node "%~dp0server.js" %PORT%

pause
