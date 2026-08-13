# Start BABYSTORE-POS Development Environment (PowerShell)

Write-Host "`n================================================" -ForegroundColor Cyan
Write-Host "  BABYSTORE-POS Development Server Startup" -ForegroundColor Cyan
Write-Host "================================================`n" -ForegroundColor Cyan

# Check if MySQL is running
Write-Host "[1/3] Checking MySQL connection..." -ForegroundColor Yellow
try {
    $connection = New-Object System.Data.SqlClient.SqlConnection
    node -e "const mysql = require('mysql2/promise'); mysql.createConnection({host:'localhost',user:'root',password:'MU@mhd2836',database:'babystore_db'}).then(conn => {console.log('✓ MySQL Connected'); conn.end()}).catch(e => {console.error('✗ MySQL Connection Failed:',e.message); process.exit(1)})"
    if ($LASTEXITCODE -ne 0) {
        Write-Host "ERROR: Cannot connect to MySQL" -ForegroundColor Red
        Write-Host "Make sure MySQL is running with credentials:" -ForegroundColor Yellow
        Write-Host "  Host: localhost" -ForegroundColor Yellow
        Write-Host "  User: root" -ForegroundColor Yellow
        Write-Host "  Database: babystore_db" -ForegroundColor Yellow
        Read-Host "Press Enter to exit"
        exit
    }
}
catch {
    Write-Host "ERROR: MySQL connection check failed" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit
}

# Start Backend in a new window
Write-Host "[2/3] Starting Backend Server (port 5001)..." -ForegroundColor Yellow
Write-Host ""

$backendPath = Join-Path $PSScriptRoot "backend"
$backendStartScript = @"
cd "$backendPath"
npm install --silent
npm start
"@

$backendProcess = Start-Process powershell -ArgumentList "-NoExit", "-Command", $backendStartScript -PassThru -WindowStyle Normal
Write-Host "✓ Backend process started (PID: $($backendProcess.Id))" -ForegroundColor Green

# Wait for backend to start
Write-Host "Waiting for backend to start..." -ForegroundColor Yellow
Start-Sleep -Seconds 3

# Verify backend is running
Write-Host "[3/3] Verifying backend connection..." -ForegroundColor Yellow
$backendReady = $false
for ($i = 0; $i -lt 10; $i++) {
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:5001/api/health" -ErrorAction Stop
        Write-Host "✓ Backend running on http://localhost:5001" -ForegroundColor Green
        $backendReady = $true
        break
    }
    catch {
        Start-Sleep -Seconds 1
    }
}

if (-not $backendReady) {
    Write-Host "WARNING: Backend may not be running. Check the terminal window." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "================================================" -ForegroundColor Cyan
Write-Host "  Frontend Development Server" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host "Starting on http://localhost:5173`n" -ForegroundColor Cyan

$frontendPath = Join-Path $PSScriptRoot "frontend"
Set-Location $frontendPath
npm install --silent
npm run dev
