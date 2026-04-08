@echo off
title PurrScope - Dev
cd /d "%~dp0"

echo.
echo  PurrScope - Development Mode
echo  ==============================
echo.

:: Check Node.js
where node >nul 2>&1
if errorlevel 1 (
    echo  ERROR: Node.js not found. Download from https://nodejs.org
    echo.
    pause
    exit /b 1
)

:: Install dependencies only if node_modules is missing
if not exist "node_modules\" (
    echo  Installing dependencies...
    npm install
    if errorlevel 1 (
        echo  ERROR: npm install failed.
        pause
        exit /b 1
    )
    echo.
)

:: Open browser in background after server starts
:: Next.js dev server prints "Ready" — we wait for port 3000 to respond
start "" cmd /c "timeout /t 8 /nobreak >nul && start http://localhost:3000"

echo  Starting dev server at http://localhost:3000
echo  Press Ctrl+C to stop.
echo.

set NEXT_PUBLIC_HIDE_QA=true
npm run dev

:: If we get here, the server exited (error or Ctrl+C)
echo.
echo  Server stopped.
pause
