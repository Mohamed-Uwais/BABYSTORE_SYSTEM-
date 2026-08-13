@echo off
REM Start BABYSTORE-POS Development Environment

echo.
echo ================================================
echo  BABYSTORE-POS Development Server Startup
echo ================================================
echo.

REM Check if MySQL is running
echo [1/3] Checking MySQL connection...
node -e "const mysql = require('mysql2/promise'); mysql.createConnection({host:'localhost',user:'root',password:'MU@mhd2836',database:'babystore_db'}).then(conn => {console.log('✓ MySQL Connected'); conn.end()}).catch(e => {console.error('✗ MySQL Connection Failed:',e.message); process.exit(1)})" || (
    echo ERROR: Cannot connect to MySQL
    echo Make sure MySQL is running with credentials:
    echo   Host: localhost
    echo   User: root
    echo   Password: MU@mhd2836
    echo   Database: babystore_db
    pause
    exit /b 1
)

REM Start Backend
echo.
echo [2/3] Starting Backend Server (port 5001)...
echo.
start "BABYSTORE-POS Backend" cmd /k "cd backend && npm install --quiet && npm start"

REM Wait for backend to start
echo.
echo Waiting for backend to start...
timeout /t 3 /nobreak

REM Verify backend is running
echo.
echo [3/3] Verifying backend connection...
for /L %%i in (1,1,10) do (
    powershell -Command "try {Invoke-WebRequest -Uri 'http://localhost:5001/api/health' -ErrorAction Stop | Out-Null; Write-Host '✓ Backend running on http://localhost:5001'} catch {exit 1}"
    if !errorlevel! equ 0 goto backend_ok
    timeout /t 1 /nobreak
)
echo WARNING: Backend may not be running. Check the terminal window.

:backend_ok
echo.
echo ================================================
echo  Frontend Development Server
echo ================================================
echo Starting on http://localhost:5173
echo.
cd frontend && npm install --quiet && npm run dev

pause
