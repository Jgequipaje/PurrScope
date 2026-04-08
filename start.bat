@echo off
title PurrScope
cd /d "%~dp0"

echo.
echo  PurrScope
echo  ==========
echo.

:: Check Node.js
where node >nul 2>&1
if errorlevel 1 (
    echo  ERROR: Node.js not found. Download from https://nodejs.org
    pause
    exit /b 1
)

:: Install dependencies if node_modules is missing
if not exist "node_modules\" (
    echo  Installing dependencies...
    call npm install --omit=dev
    if errorlevel 1 (
        echo  ERROR: npm install failed.
        pause
        exit /b 1
    )
    echo.
)

:: Open browser after server starts
start "" cmd /c "timeout /t 6 /nobreak >nul && start http://localhost:3000"

echo  Starting at http://localhost:3000
echo  Press Ctrl+C to stop.
echo.

set NEXT_PUBLIC_HIDE_QA=true
call npm start

echo.
echo  Server stopped.
pause
