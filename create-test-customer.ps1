#!/usr/bin/env pwsh

# Create test customer for project creation
Write-Host "Creating test customer..." -ForegroundColor Green

$testCustomerUrl = "http://localhost:5000/api/customers"
$testCustomerData = @{
    name = "Test Customer"
    email = "test@example.com"
    phone = "555-123-4567"
    address = "123 Test Street, Test City, TS 12345"
} | ConvertTo-Json

try {
    # Login first to get token
    $loginUrl = "http://localhost:5000/api/auth/login"
    $loginData = @{
        email = "admin@kenstruction.com"
        password = "admin123"
    } | ConvertTo-Json

    $loginResponse = Invoke-RestMethod -Uri $loginUrl -Method POST -Body $loginData -ContentType "application/json"
    $token = $loginResponse.token
    
    Write-Host "✅ Logged in successfully" -ForegroundColor Green
    
    # Create customer
    $headers = @{
        "Authorization" = "Bearer $token"
        "Content-Type" = "application/json"
    }
    
    $customerResponse = Invoke-RestMethod -Uri $testCustomerUrl -Method POST -Body $testCustomerData -Headers $headers
    
    Write-Host "✅ Test customer created successfully!" -ForegroundColor Green
    Write-Host "Customer ID: $($customerResponse.data.customer._id)" -ForegroundColor Yellow
    Write-Host "Customer Name: $($customerResponse.data.customer.name)" -ForegroundColor Yellow
    Write-Host "Customer Email: $($customerResponse.data.customer.email)" -ForegroundColor Yellow
    
} catch {
    Write-Host "❌ Error creating test customer: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`nYou can now create projects using the 'Test Customer' in the project form!" -ForegroundColor Cyan 