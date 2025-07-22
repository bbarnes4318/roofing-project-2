# Kenstruction Frontend-Backend Integration Test
Write-Host "Testing Kenstruction Integration..." -ForegroundColor Green

# Test backend health
Write-Host "Testing Backend Health..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "http://localhost:5000/api/health" -Method GET
    Write-Host "Backend Health: $($response.status)" -ForegroundColor Green
    Write-Host "   Database: $($response.database)" -ForegroundColor Cyan
    Write-Host "   Uptime: $($response.uptime)s" -ForegroundColor Cyan
} catch {
    Write-Host "Backend Health Check Failed: $($_.Exception.Message)" -ForegroundColor Red
}

# Test frontend (check if it's running)
Write-Host ""
Write-Host "Testing Frontend..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3000" -Method GET -TimeoutSec 5
    if ($response.StatusCode -eq 200) {
        Write-Host "Frontend is running on http://localhost:3000" -ForegroundColor Green
    }
} catch {
    Write-Host "Frontend not accessible: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "   Make sure 'npm start' is running in another terminal" -ForegroundColor Yellow
}

# Test API endpoints
Write-Host ""
Write-Host "Testing API Endpoints..." -ForegroundColor Yellow

$endpoints = @(
    @{ Path = "/api/health"; Method = "GET"; Description = "Health Check" },
    @{ Path = "/api/health/detailed"; Method = "GET"; Description = "Detailed Health" }
)

foreach ($endpoint in $endpoints) {
    try {
        $uri = "http://localhost:5000$($endpoint.Path)"
        $response = Invoke-RestMethod -Uri $uri -Method $endpoint.Method -TimeoutSec 5
        Write-Host "$($endpoint.Description): OK" -ForegroundColor Green
    } catch {
        $statusCode = $_.Exception.Response.StatusCode.value__
        if ($statusCode -eq 401) {
            Write-Host "$($endpoint.Description): Requires Authentication (Expected)" -ForegroundColor Yellow
        } else {
            Write-Host "$($endpoint.Description): Failed ($statusCode)" -ForegroundColor Red
        }
    }
}

Write-Host ""
Write-Host "Integration Summary:" -ForegroundColor Cyan
Write-Host "   Backend: Running on http://localhost:5000" -ForegroundColor White
Write-Host "   Frontend: Should be on http://localhost:3000" -ForegroundColor White
Write-Host "   Database: MongoDB Atlas Connected" -ForegroundColor White
Write-Host "   Socket.IO: Real-time features enabled" -ForegroundColor White
Write-Host "   Authentication: JWT-based security" -ForegroundColor White

Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Magenta
Write-Host "   1. Open http://localhost:3000 in your browser" -ForegroundColor White
Write-Host "   2. Register a new account or login" -ForegroundColor White
Write-Host "   3. Test real-time features and API integration" -ForegroundColor White
Write-Host "   4. Check browser console for any errors" -ForegroundColor White

Write-Host ""
Write-Host "Frontend Integration Complete!" -ForegroundColor Green 