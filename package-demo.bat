@echo off
title PurrScope - Package Demo
cd /d "%~dp0"

echo.
echo  =========================================
echo   PurrScope - Build Demo Package
echo  =========================================
echo.

:: Step 1: Check Node.js
where node >nul 2>&1
if errorlevel 1 (
    echo  ERROR: Node.js not found. Download from https://nodejs.org
    pause
    exit /b 1
)
echo  [1/5] Node.js found.

:: Step 2: Install dependencies
if not exist "node_modules\" (
    echo  [2/5] Installing dependencies...
    call npm install
    if errorlevel 1 ( echo  ERROR: npm install failed. & pause & exit /b 1 )
) else (
    echo  [2/5] Dependencies already installed.
)

:: Step 3: Production build
echo.
echo  [3/5] Building production app...
set NEXT_PUBLIC_HIDE_QA=true
call npm run build
if errorlevel 1 (
    echo.
    echo  ERROR: Build failed. See above for details.
    pause
    exit /b 1
)
echo  Build complete.

:: Step 4: Remove source maps from .next
echo.
echo  [4/5] Removing source maps...
for /r ".next" %%f in (*.map) do del "%%f" >nul 2>&1
echo  Source maps removed.

:: Step 5: Create lean demo folder
echo.
echo  [5/5] Creating demo package in "purrscope-demo\"...

if exist "purrscope-demo\" rmdir /s /q "purrscope-demo\"
mkdir "purrscope-demo"

:: Copy .next but EXCLUDE node_modules inside it (Playwright cache etc.)
xcopy ".next" "purrscope-demo\.next" /e /i /q /exclude:package-demo-exclude.txt

:: Copy other required files
xcopy "public" "purrscope-demo\public" /e /i /q
xcopy "data" "purrscope-demo\data" /e /i /q
copy "start.bat" "purrscope-demo\start.bat" >nul
copy "README.md" "purrscope-demo\README.md" >nul

:: Write minimal package.json (start only, no build script, no devDeps)
(
echo {
echo   "name": "purrscope",
echo   "version": "1.0.0",
echo   "private": true,
echo   "scripts": { "start": "next start" },
echo   "dependencies": {
echo     "next": "^16.2.2",
echo     "react": "^19",
echo     "react-dom": "^19",
echo     "styled-components": "^6.3.12",
echo     "zustand": "^5.0.12"
echo   }
echo }
) > "purrscope-demo\package.json"

:: Report final size
echo.
for /f "tokens=*" %%s in ('powershell -command "(Get-ChildItem purrscope-demo -Recurse | Measure-Object -Property Length -Sum).Sum / 1MB | [math]::Round($_,1)"') do set SIZE=%%s
echo  =========================================
echo   Done! Demo package: purrscope-demo\
echo   Approx size: %SIZE% MB
echo.
echo   Ship: the purrscope-demo\ folder (zip it)
echo   Run:  start.bat (requires Node.js 18+)
echo.
echo   NOT included: source code, .map files, devDeps
echo  =========================================
echo.
pause
