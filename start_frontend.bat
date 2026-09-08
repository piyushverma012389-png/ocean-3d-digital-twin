@echo off
echo ===================================================
echo Starting SIH26067 Ocean Digital Twin Frontend UI
echo Target: http://localhost:5173
echo ===================================================
cd /d "%~dp0frontend"
call npm run dev
pause
