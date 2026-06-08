@echo off
REM Test environment setup script for zupu project
cd /d "%~dp0"

echo ========================================
echo Zupu Project Test Environment Setup
echo ========================================

echo [1/4] Installing dependencies in venv...
call venv\Scripts\activate.bat
pip install -r requirements.txt

echo [2/4] Running pytest...
python -m pytest tests/ -v --tb=short

echo ========================================
echo Done
echo ========================================
pause
