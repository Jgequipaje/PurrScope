@echo off
title PurrScope
cd /d "%~dp0"

echo.
echo  PurrScope - Production
echo  ========================
echo  Working directory: %CD%
echo.

:: Check Node.js
where node >nul 2>&1
if errorlevel 1 (
    echo  ERROR: Node.js not found. Download from https://nodejs.org
    pause
    exit /b 1
)
for /f "tokens=*" %%v in ('node -v') do echo  Node.js: %%v

:: Install dependencies only if node_modules is missing
if not exist "node_modules\" (
    echo.
    echo  Installing dependencies...
    call npm install
    if errorlevel 1 (
        echo  ERROR: npm install failed.
        pause
        exit /b 1
    )
)

:: Build
echo.
echo  Building app...
set NEXT_PUBLIC_HIDE_QA=true
call npm run build
if errorlevel 1 (
    echo.
    echo  ERROR: Build failed. Check output above.
    pause
    exit /b 1
)

:: Open browser after delay
start "" cmd /c "timeout /t 6 /nobreak >nul && start http://localhost:3000"

echo.
echo  Starting server at http://localhost:3000
echo  Press Ctrl+C to stop.
echo.

set NEXT_PUBLIC_HIDE_QA=true
call npm start

echo.
echo  Server stopped.
pause
