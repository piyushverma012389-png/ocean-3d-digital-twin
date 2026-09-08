@echo off
echo ===================================================
echo Running SIH26067 Complete Unified Backend Test Suite
echo ===================================================
cd /d "%~dp0"
python backend/tests/run_all_tests.py
pause
