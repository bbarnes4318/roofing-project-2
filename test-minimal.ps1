#!/usr/bin/env pwsh

# Minimal test with only required fields
Write-Host "Minimal registration test..." -ForegroundColor Green

$baseUrl = "http://localhost:5000/api"
$headers = @{ "Content-Type" = "application/json" }

try {
    # Test 1: Basic user registration
    Write-Host "Creating minimal user..." -ForegroundColor Cyan
    $userData = @{
        firstName = "Test"
        lastName = "User"
        email = "minimal@test.com"
        password = "TestPass123"
    } | ConvertTo-Json -Depth 2

    Write-Host "Sending: $userData" -ForegroundColor Yellow
    
    $userResponse = Invoke-RestMethod -Uri "$baseUrl/auth/register" -Method POST -Body $userData -Headers $headers
    Write-Host "User registration successful!" -ForegroundColor Green
    Write-Host "User ID: $($userResponse.data.user._id)" -ForegroundColor Yellow
    Write-Host "User role: $($userResponse.data.user.role)" -ForegroundColor Yellow

} catch {
    Write-Host "Registration failed: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.Exception.Response) {
        $stream = $_.Exception.Response.GetResponseStream()
        $reader = New-Object System.IO.StreamReader($stream)
        $errorDetails = $reader.ReadToEnd()
        $reader.Close()
        $stream.Close()
        
        Write-Host "Raw error response: $errorDetails" -ForegroundColor Yellow
        
        try {
            $errorJson = $errorDetails | ConvertFrom-Json
            Write-Host "Parsed validation errors:" -ForegroundColor Red
            if ($errorJson.errors) {
                $errorJson.errors | ForEach-Object {
                    Write-Host "  - $($_.field): $($_.message)" -ForegroundColor Red
                }
            }
        } catch {
            Write-Host "Could not parse error as JSON" -ForegroundColor Yellow
        }
    }
} 