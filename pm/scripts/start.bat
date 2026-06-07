@echo off
REM Start the Kanban Studio container
cd /d "%~dp0.."
docker compose up --build