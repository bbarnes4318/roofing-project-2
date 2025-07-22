#!/usr/bin/env pwsh

# Test ONLY project creation with existing user
Write-Host "Testing project creation only..." -ForegroundColor Green

$baseUrl = "http://localhost:5000/api"
$headers = @{ "Content-Type" = "application/json" }

try {
    # Login with existing admin user from previous tests
    Write-Host "1. Logging in with existing admin..." -ForegroundColor Cyan
    $loginData = @{
        email = "admin.test@example.com"
        password = "AdminTest123"
    } | ConvertTo-Json -Depth 2

    $loginResponse = Invoke-RestMethod -Uri "$baseUrl/auth/login" -Method POST -Body $loginData -Headers $headers
    $token = $loginResponse.data.token
    Write-Host "   Login successful!" -ForegroundColor Green

    # Auth headers
    $authHeaders = @{
        "Content-Type" = "application/json"
        "Authorization" = "Bearer $token"
    }

    # Get existing customer
    Write-Host "2. Getting existing customers..." -ForegroundColor Cyan
    $customersResponse = Invoke-RestMethod -Uri "$baseUrl/customers?limit=5" -Method GET -Headers $authHeaders
    
    if ($customersResponse.data.Count -eq 0) {
        Write-Host "   No customers found. Creating one..." -ForegroundColor Yellow
        
        $customerData = @{
            name = "Quick Test Customer"
            email = "quicktest@example.com" 
            phone = "5559999999"
            address = "999 Quick Test Street, Test City, TC 99999"
        } | ConvertTo-Json -Depth 2

        $customerResponse = Invoke-RestMethod -Uri "$baseUrl/customers" -Method POST -Body $customerData -Headers $authHeaders
        $customerId = $customerResponse.data.customer._id
        Write-Host "   Customer created: $customerId" -ForegroundColor Green
    } else {
        $customerId = $customersResponse.data[0]._id
        Write-Host "   Using existing customer: $customerId" -ForegroundColor Green
    }

    # TEST PROJECT CREATION
    Write-Host "3. Creating project (THIS IS THE MAIN TEST)..." -ForegroundColor Cyan
    $projectData = @{
        projectName = "Database Fix Test Project"
        projectType = "Roof Replacement"
        customer = $customerId
        budget = 25000.00
        startDate = (Get-Date).AddDays(1).ToString("yyyy-MM-dd")
        endDate = (Get-Date).AddDays(30).ToString("yyyy-MM-dd")
        address = "123 Database Fix Street, Test City, TC 12345"
        priority = "High"
        status = "Pending"
        description = "Testing project creation after database fix"
    } | ConvertTo-Json -Depth 2

    Write-Host "   Sending project data..." -ForegroundColor Yellow
    $projectResponse = Invoke-RestMethod -Uri "$baseUrl/projects" -Method POST -Body $projectData -Headers $authHeaders
    
    Write-Host "   PROJECT CREATED SUCCESSFULLY!" -ForegroundColor Green
    Write-Host "   Project ID: $($projectResponse.data.project._id)" -ForegroundColor Yellow
    Write-Host "   Project Name: $($projectResponse.data.project.projectName)" -ForegroundColor Yellow

    Write-Host "`nSUCCESS! The database fix resolved the 400 error!" -ForegroundColor Green
    Write-Host "You can now create projects in the frontend without the duplicate key error." -ForegroundColor White

} catch {
    Write-Host "ERROR: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.Exception.Response) {
        $stream = $_.Exception.Response.GetResponseStream()
        $reader = New-Object System.IO.StreamReader($stream)
        $errorDetails = $reader.ReadToEnd()
        $reader.Close()
        $stream.Close()
        
        Write-Host "Error details: $errorDetails" -ForegroundColor Yellow
    }
} 