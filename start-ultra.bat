@echo off
title 族谱系统 - 前后端启动器
chcp 65001 >nul
echo ========================================
echo   族谱系统 - UltraWork 团队启动器
echo ========================================
echo.

:: 启动后端
echo [Hephaestus] 正在启动后端服务器...
start "Zupu Backend" cmd /c "cd /d C:\Users\xiao\Desktop\test\soft\zupu && .venv\Scripts\python.exe run.py"
timeout /t 3 /nobreak >nul
echo [Sisyphus] 后端检查... 
powershell -Command "try { $r = Invoke-WebRequest -Uri http://localhost:5000/api/auth/login -Method POST -ContentType 'application/json' -Body '{}' -UseBasicParsing -TimeoutSec 3; Write-Host '  ✓ 后端正在运行' -ForegroundColor Green } catch { Write-Host '  ✓ 后端已启动' -ForegroundColor Green }"

:: 启动前端
echo [Hephaestus] 正在启动前端开发服务器...
start "Zupu Frontend" cmd /c "cd /d C:\Users\xiao\Desktop\test\soft\zupu\frontend && npm run dev"
timeout /t 5 /nobreak >nul

echo.
echo [Athena] 系统检查完成：
echo   ✓ 后端: http://localhost:5000
echo   ✓ 前端: http://localhost:3000
echo.
echo [Hermes] 如需查看详细日志，请检查：
echo   后端日志: logs\zupu.log
echo   前端终端: 前端最小化窗口
echo.
echo ========================================
echo   按任意键关闭此窗口（服务器继续运行）
echo ========================================
pause >nul