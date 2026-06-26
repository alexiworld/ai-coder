@echo off
REM Start the Kanban Studio container
cd /d "%~dp0.."

docker info >nul 2>&1
if %ERRORLEVEL% EQU 0 goto :compose

REM Find Docker Desktop using environment variables (no hardcoded paths)
set "DOCKER_DESKTOP="
if exist "%ProgramFiles%\Docker\Docker\Docker Desktop.exe" set "DOCKER_DESKTOP=%ProgramFiles%\Docker\Docker\Docker Desktop.exe"
if not defined DOCKER_DESKTOP if exist "%ProgramFiles(x86)%\Docker\Docker\Docker Desktop.exe" set "DOCKER_DESKTOP=%ProgramFiles(x86)%\Docker\Docker\Docker Desktop.exe"
if not defined DOCKER_DESKTOP if exist "%LOCALAPPDATA%\Docker\Docker Desktop.exe" set "DOCKER_DESKTOP=%LOCALAPPDATA%\Docker\Docker Desktop.exe"

if not defined DOCKER_DESKTOP (
    echo ERROR: Docker Desktop not found. Please install Docker Desktop.
    exit /b 1
)

echo Docker not running - starting Docker Desktop...
start "" "%DOCKER_DESKTOP%"

set ELAPSED=0
:waitloop
if %ELAPSED% GEQ 120 (
    echo ERROR: Docker did not start within 120 seconds. Aborting.
    exit /b 1
)
timeout /t 5 /nobreak >nul
set /a ELAPSED=%ELAPSED%+5
docker info >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo Waiting for Docker... %ELAPSED%s
    goto :waitloop
)
echo Docker ready after %ELAPSED%s

:compose
docker compose up --build
