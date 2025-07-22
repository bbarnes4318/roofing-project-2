# Create Test User for Kenstruction
Write-Host "Creating test user for Kenstruction..." -ForegroundColor Green

$testUser = @{
    name = "Test User"
    email = "test@kenstruction.com"
    password = "password123"
    role = "admin"
    phoneNumber = "(555) 123-4567"
    company = "Kenstruction"
}

try {
    $response = Invoke-RestMethod -Uri "http://localhost:5000/api/auth/register" -Method POST -Body ($testUser | ConvertTo-Json) -ContentType "application/json"
    Write-Host "Test user created successfully!" -ForegroundColor Green
    Write-Host "Email: test@kenstruction.com" -ForegroundColor Cyan
    Write-Host "Password: password123" -ForegroundColor Cyan
    Write-Host "Role: admin" -ForegroundColor Cyan
} catch {
    Write-Host "Error creating test user: $($_.Exception.Message)" -ForegroundColor Red
    $errorResponse = $_.Exception.Response
    if ($errorResponse) {
        $reader = New-Object System.IO.StreamReader($errorResponse.GetResponseStream())
        $errorBody = $reader.ReadToEnd()
        Write-Host "Error details: $errorBody" -ForegroundColor Yellow
    }
}

Write-Host "`nYou can now use these credentials to login at http://localhost:3000" -ForegroundColor White 