@echo off
echo ===================================================
echo Starting SIH26067 Ocean Digital Twin Backend API
echo Target: http://127.0.0.1:8000
echo Documentation: http://127.0.0.1:8000/docs
echo ===================================================
cd /d "%~dp0backend"
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
pause
