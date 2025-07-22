#!/usr/bin/env pwsh

# Simple project creation test
Write-Host "🚀 Starting simple project creation test..." -ForegroundColor Green

$baseUrl = "http://localhost:5000/api"
$headers = @{ "Content-Type" = "application/json" }

try {
    # Step 1: Create a user
    Write-Host "1. Creating test user..." -ForegroundColor Cyan
    $userData = @{
        firstName = "Test"
        lastName = "User"
        email = "testuser@example.com"
        password = "TestPass123"
        role = "admin"
        phoneNumber = "555-0123"
        company = "Test Company"
    } | ConvertTo-Json -Depth 2

    $userResponse = Invoke-RestMethod -Uri "$baseUrl/auth/register" -Method POST -Body $userData -Headers $headers
    Write-Host "✅ User created successfully" -ForegroundColor Green

    # Step 2: Login to get token
    Write-Host "2. Logging in..." -ForegroundColor Cyan
    $loginData = @{
        email = "testuser@example.com"
        password = "TestPass123"
    } | ConvertTo-Json -Depth 2

    $loginResponse = Invoke-RestMethod -Uri "$baseUrl/auth/login" -Method POST -Body $loginData -Headers $headers
    $token = $loginResponse.token
    Write-Host "✅ Login successful" -ForegroundColor Green

    # Update headers with token
    $authHeaders = @{
        "Content-Type" = "application/json"
        "Authorization" = "Bearer $token"
    }

    # Step 3: Create a customer
    Write-Host "3. Creating test customer..." -ForegroundColor Cyan
    $customerData = @{
        name = "Test Customer"
        email = "customer@example.com"
        phone = "555-9876"
        address = "123 Test Street, Test City, TC 12345"
    } | ConvertTo-Json -Depth 2

    $customerResponse = Invoke-RestMethod -Uri "$baseUrl/customers" -Method POST -Body $customerData -Headers $authHeaders
    $customerId = $customerResponse.data.customer._id
    Write-Host "✅ Customer created: $customerId" -ForegroundColor Green

    # Step 4: Create a project
    Write-Host "4. Creating test project..." -ForegroundColor Cyan
    $projectData = @{
        projectName = "Test Project for Alerts"
        projectType = "Roof Replacement"
        customer = $customerId
        budget = 30000.00
        startDate = (Get-Date).AddDays(1).ToString("yyyy-MM-dd")
        endDate = (Get-Date).AddDays(60).ToString("yyyy-MM-dd")
        address = "456 Project Avenue, Project City, PC 67890"
        priority = "High"
        status = "Pending"
        description = "Test project to verify alert system"
    } | ConvertTo-Json -Depth 2

    $projectResponse = Invoke-RestMethod -Uri "$baseUrl/projects" -Method POST -Body $projectData -Headers $authHeaders
    $projectId = $projectResponse.data.project._id
    Write-Host "✅ Project created: $projectId" -ForegroundColor Green

    # Step 5: Verify workflow was created
    Write-Host "5. Checking workflow creation..." -ForegroundColor Cyan
    Start-Sleep -Seconds 2
    
    $workflowResponse = Invoke-RestMethod -Uri "$baseUrl/workflows/project/$projectId" -Method GET -Headers $authHeaders
    if ($workflowResponse.data.workflow) {
        Write-Host "✅ Workflow created with $($workflowResponse.data.workflow.steps.Count) steps" -ForegroundColor Green
    } else {
        Write-Host "❌ No workflow found" -ForegroundColor Red
    }

    # Step 6: Trigger alert check
    Write-Host "6. Triggering alert check..." -ForegroundColor Cyan
    $alertResponse = Invoke-RestMethod -Uri "$baseUrl/alerts/check-workflow" -Method POST -Headers $authHeaders
    Write-Host "✅ Alert check completed" -ForegroundColor Green

    # Step 7: Check for alerts
    Write-Host "7. Checking for alerts..." -ForegroundColor Cyan
    $alertsResponse = Invoke-RestMethod -Uri "$baseUrl/alerts" -Method GET -Headers $authHeaders
    Write-Host "✅ Found $($alertsResponse.data.Count) alerts" -ForegroundColor Green

    Write-Host "`n🎉 Test completed successfully!" -ForegroundColor Green
    Write-Host "Project ID: $projectId" -ForegroundColor Yellow
    Write-Host "Customer ID: $customerId" -ForegroundColor Yellow
    Write-Host "You can now test the frontend with these IDs" -ForegroundColor White

} catch {
    Write-Host "❌ Error: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $errorDetails = $reader.ReadToEnd()
        Write-Host "Error details: $errorDetails" -ForegroundColor Yellow
    }
} 