#!/usr/bin/env pwsh

# Debug authentication test
Write-Host "Debug authentication test..." -ForegroundColor Green

$baseUrl = "http://localhost:5000/api"
$headers = @{ "Content-Type" = "application/json" }

try {
    # Step 1: Create admin user
    Write-Host "1. Creating admin user..." -ForegroundColor Cyan
    $userData = @{
        firstName = "Admin"
        lastName = "User"
        email = "admin@debug.com"
        password = "AdminPass123"
        role = "admin"
        phone = "5550000"
    } | ConvertTo-Json -Depth 2

    Write-Host "User data: $userData" -ForegroundColor Yellow
    
    $userResponse = Invoke-RestMethod -Uri "$baseUrl/auth/register" -Method POST -Body $userData -Headers $headers
    Write-Host "User created successfully" -ForegroundColor Green
    Write-Host "User role: $($userResponse.data.user.role)" -ForegroundColor Yellow
    Write-Host "User ID: $($userResponse.data.user._id)" -ForegroundColor Yellow

    # Step 2: Login to get token
    Write-Host "2. Logging in..." -ForegroundColor Cyan
    $loginData = @{
        email = "admin@debug.com"
        password = "AdminPass123"
    } | ConvertTo-Json -Depth 2

    $loginResponse = Invoke-RestMethod -Uri "$baseUrl/auth/login" -Method POST -Body $loginData -Headers $headers
    $token = $loginResponse.data.token
    Write-Host "Login successful" -ForegroundColor Green
    Write-Host "Token: $($token.Substring(0, 20))..." -ForegroundColor Yellow
    Write-Host "User role from login: $($loginResponse.data.user.role)" -ForegroundColor Yellow

    # Step 3: Test /auth/me endpoint
    Write-Host "3. Testing /auth/me endpoint..." -ForegroundColor Cyan
    $authHeaders = @{
        "Content-Type" = "application/json"
        "Authorization" = "Bearer $token"
    }

    $meResponse = Invoke-RestMethod -Uri "$baseUrl/auth/me" -Method GET -Headers $authHeaders
    Write-Host "/auth/me successful" -ForegroundColor Green
    Write-Host "Me role: $($meResponse.data.user.role)" -ForegroundColor Yellow
    Write-Host "Me isActive: $($meResponse.data.user.isActive)" -ForegroundColor Yellow

    # Step 4: Test customer creation
    Write-Host "4. Testing customer creation..." -ForegroundColor Cyan
    $customerData = @{
        name = "Debug Customer"
        email = "debug@example.com"
        phone = "555-9999"
        address = "123 Debug Street, Debug City, DC 12345"
    } | ConvertTo-Json -Depth 2

    Write-Host "Customer data: $customerData" -ForegroundColor Yellow
    Write-Host "Using Authorization header: Bearer $($token.Substring(0, 20))..." -ForegroundColor Yellow

    $customerResponse = Invoke-RestMethod -Uri "$baseUrl/customers" -Method POST -Body $customerData -Headers $authHeaders
    Write-Host "Customer created successfully!" -ForegroundColor Green
    Write-Host "Customer ID: $($customerResponse.data.customer._id)" -ForegroundColor Yellow

} catch {
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.Exception.Response) {
        $stream = $_.Exception.Response.GetResponseStream()
        $reader = New-Object System.IO.StreamReader($stream)
        $errorDetails = $reader.ReadToEnd()
        $reader.Close()
        $stream.Close()
        Write-Host "Error details: $errorDetails" -ForegroundColor Yellow
        
        # Also try to parse as JSON for better formatting
        try {
            $errorJson = $errorDetails | ConvertFrom-Json
            Write-Host "Parsed error:" -ForegroundColor Yellow
            $errorJson | ConvertTo-Json -Depth 3 | Write-Host -ForegroundColor Yellow
        } catch {
            Write-Host "Could not parse error as JSON" -ForegroundColor Yellow
        }
    }
} 