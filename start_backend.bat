@echo off
chcp 65001 >nul
cd /d D:\soft\test\soft\zupu
echo Starting Flask backend on port 5000...
.\.venv\Scripts\python.exe run.py
pause
