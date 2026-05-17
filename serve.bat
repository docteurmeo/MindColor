@echo off
REM MindColor — local dev server
REM Double-click hoac chay tu cmd: serve.bat
REM Mac dinh port 8080. Override bang: serve.bat 3000

setlocal
set PORT=%1
if "%PORT%"=="" set PORT=8080

cd /d "%~dp0"

echo.
echo ============================================
echo  MindColor local server
echo  URL: http://localhost:%PORT%
echo  Bam Ctrl+C de dung
echo ============================================
echo.

REM Mo trinh duyet sau 1s
start "" /b cmd /c "timeout /t 1 /nobreak >nul && start http://localhost:%PORT%"

REM Thu Python 3 truoc, roi Python 2, roi py launcher
where python >nul 2>nul
if %ERRORLEVEL%==0 (
  python -m http.server %PORT%
  goto :eof
)

where py >nul 2>nul
if %ERRORLEVEL%==0 (
  py -3 -m http.server %PORT%
  goto :eof
)

where node >nul 2>nul
if %ERRORLEVEL%==0 (
  npx --yes http-server -p %PORT% -c-1
  goto :eof
)

echo [LOI] Khong tim thay Python hoac Node.
echo Cai dat 1 trong 2:
echo   - Python: https://www.python.org/downloads/
echo   - Node.js: https://nodejs.org/
pause
