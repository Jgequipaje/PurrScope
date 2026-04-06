@echo off
title PurrScope - Dev Mode
cd /d "%~dp0"

echo.
echo  Starting PurrScope in development mode...
echo  Press Ctrl+C to stop the server.
echo.

:: Check if node_modules exists
if not exist "node_modules\" (
    echo  node_modules not found. Running npm install...
    npm install
    echo.
)

:: Open browser after a short delay (runs in background)
start "" cmd /c "timeout /t 4 /nobreak >nul && start http://localhost:3000"

npm run dev
