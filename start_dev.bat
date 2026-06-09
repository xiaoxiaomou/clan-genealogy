@echo off
chcp 65001 >nul
cd /d D:\soft\test\soft\zupu
echo [1/2] Starting Flask backend (port 5000)...
start "zupu-backend" cmd /k ".\.venv\Scripts\python.exe run.py"
timeout /t 3 /nobreak >nul
echo [2/2] Starting Vite dev server (port 3000)...
cd frontend
start "zupu-frontend" cmd /k "npm run dev"
echo Done. Backend: http://localhost:5000  Frontend: http://localhost:3000
pause
