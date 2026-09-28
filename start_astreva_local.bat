@echo off
REM ========================================================
REM ASTREVA: 1-Click Production Local Runner (Offline Demo)
REM ========================================================
echo [ASTREVA] Initializing Air-Gapped Satellite Defense Intelligence Enclave...

cd /d "%~dp0"

REM Activate python virtualenv if present
if exist "..\.venv\Scripts\activate.bat" (
    call "..\.venv\Scripts\activate.bat"
) else if exist ".venv\Scripts\activate.bat" (
    call ".venv\Scripts\activate.bat"
)

REM Start FastAPI Backend
echo [ASTREVA] Starting FastAPI Backend on http://localhost:8000 ...
start "ASTREVA-Backend" cmd /k "python -m uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload"

REM Start Vite Frontend
echo [ASTREVA] Starting React Frontend on http://localhost:5173 ...
cd frontend
start "ASTREVA-Frontend" cmd /k "npm run dev"

echo [ASTREVA] Both services initiated successfully!
echo [ASTREVA] Dashboard: http://localhost:5173
echo [ASTREVA] API Docs:  http://localhost:8000/docs
