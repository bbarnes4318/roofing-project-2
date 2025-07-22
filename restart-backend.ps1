# Restart Backend Server with CORS Fix
Write-Host "Restarting Kenstruction Backend Server..." -ForegroundColor Green

# Kill any existing node processes on port 5000
Write-Host "Stopping existing server..." -ForegroundColor Yellow
try {
    $processes = Get-NetTCPConnection -LocalPort 5000 -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess
    if ($processes) {
        foreach ($pid in $processes) {
            Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue
            Write-Host "Stopped process $pid" -ForegroundColor Cyan
        }
    }
} catch {
    Write-Host "No existing processes found on port 5000" -ForegroundColor Gray
}

# Wait a moment
Start-Sleep -Seconds 2

# Start the backend server
Write-Host "Starting backend server..." -ForegroundColor Green
Set-Location server
npm start 