@echo off
title PurrScope
cd /d "%~dp0"

echo.
echo  =========================================
echo   PurrScope - Production Launcher
echo  =========================================
echo.

:: Check Node is installed
where node >nul 2>&1
if errorlevel 1 (
    echo  ERROR: Node.js is not installed or not in PATH.
    echo  Download it from https://nodejs.org
    echo.
    pause
    exit /b 1
)

:: Check if node_modules exists
if not exist "node_modules\" (
    echo  node_modules not found. Running npm install...
    echo.
    npm install
    if errorlevel 1 (
        echo.
        echo  ERROR: npm install failed.
        pause
        exit /b 1
    )
    echo.
)

:: Build if .next folder doesn't exist
if not exist ".next\" (
    echo  No build found. Building now, this may take a minute...
    echo.
    npm run build
    if errorlevel 1 (
        echo.
        echo  ERROR: Build failed. See above for details.
        pause
        exit /b 1
    )
    echo.
)

echo  Starting server on http://localhost:3000
echo  Waiting for server to be ready...
echo  Press Ctrl+C to stop.
echo.

:: Start the server in the background
start "" cmd /c "npm start"

:: Poll until the server responds, then open browser
:waitloop
timeout /t 2 /nobreak >nul
curl -s http://localhost:3000 >nul 2>&1
if errorlevel 1 goto waitloop

echo  Server is ready. Opening browser...
start http://localhost:3000

:: Keep this window open so user can see it's running
echo.
echo  PurrScope is running at http://localhost:3000
echo  Close this window to stop the server.
echo.
pause
