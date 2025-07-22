#!/usr/bin/env pwsh

# Complete working end-to-end test
Write-Host "=== COMPLETE PROJECT CREATION & ALERT SYSTEM TEST ===" -ForegroundColor Green

$baseUrl = "http://localhost:5000/api"
$headers = @{ "Content-Type" = "application/json" }

try {
    # Step 1: Create admin user
    Write-Host "`n1. Creating admin user..." -ForegroundColor Cyan
    $adminData = @{
        firstName = "Admin"
        lastName = "Test"
        email = "admin.test@example.com"
        password = "AdminTest123"
        role = "admin"
    } | ConvertTo-Json -Depth 2

    $adminResponse = Invoke-RestMethod -Uri "$baseUrl/auth/register" -Method POST -Body $adminData -Headers $headers
    Write-Host "   Admin user created successfully!" -ForegroundColor Green
    Write-Host "   User ID: $($adminResponse.data.user._id)" -ForegroundColor Yellow
    Write-Host "   Role: $($adminResponse.data.user.role)" -ForegroundColor Yellow

    # Step 2: Login as admin
    Write-Host "`n2. Logging in as admin..." -ForegroundColor Cyan
    $loginData = @{
        email = "admin.test@example.com"
        password = "AdminTest123"
    } | ConvertTo-Json -Depth 2

    $loginResponse = Invoke-RestMethod -Uri "$baseUrl/auth/login" -Method POST -Body $loginData -Headers $headers
    $token = $loginResponse.data.token
    Write-Host "   Login successful!" -ForegroundColor Green
    Write-Host "   Role confirmed: $($loginResponse.data.user.role)" -ForegroundColor Yellow

    # Update headers with token
    $authHeaders = @{
        "Content-Type" = "application/json"
        "Authorization" = "Bearer $token"
    }

    # Step 3: Create customer
    Write-Host "`n3. Creating customer..." -ForegroundColor Cyan
    $customerData = @{
        name = "Test Customer for Alerts"
        email = "customer.alerts@example.com"
        phone = "5551234567"
        address = "123 Alert Street, Test City, TC 12345"
    } | ConvertTo-Json -Depth 2

    $customerResponse = Invoke-RestMethod -Uri "$baseUrl/customers" -Method POST -Body $customerData -Headers $authHeaders
    $customerId = $customerResponse.data.customer._id
    Write-Host "   Customer created successfully!" -ForegroundColor Green
    Write-Host "   Customer ID: $customerId" -ForegroundColor Yellow
    Write-Host "   Customer Name: $($customerResponse.data.customer.name)" -ForegroundColor Yellow

    # Step 4: Create project
    Write-Host "`n4. Creating project..." -ForegroundColor Cyan
    $projectData = @{
        projectName = "Alert System Test Project"
        projectType = "Roof Replacement"
        customer = $customerId
        budget = 35000.00
        startDate = (Get-Date).AddDays(1).ToString("yyyy-MM-dd")
        endDate = (Get-Date).AddDays(45).ToString("yyyy-MM-dd")
        address = "456 Project Avenue, Construction City, CC 67890"
        priority = "High"
        status = "Pending"
        description = "Test project to verify complete alert system functionality"
    } | ConvertTo-Json -Depth 2

    $projectResponse = Invoke-RestMethod -Uri "$baseUrl/projects" -Method POST -Body $projectData -Headers $authHeaders
    $projectId = $projectResponse.data.project._id
    Write-Host "   Project created successfully!" -ForegroundColor Green
    Write-Host "   Project ID: $projectId" -ForegroundColor Yellow
    Write-Host "   Project Name: $($projectResponse.data.project.projectName)" -ForegroundColor Yellow

    # Step 5: Wait for workflow creation
    Write-Host "`n5. Waiting for workflow creation..." -ForegroundColor Cyan
    Start-Sleep -Seconds 3
    
    $workflowResponse = Invoke-RestMethod -Uri "$baseUrl/workflows/project/$projectId" -Method GET -Headers $authHeaders
    if ($workflowResponse.data.workflow) {
        Write-Host "   Workflow created successfully!" -ForegroundColor Green
        Write-Host "   Workflow ID: $($workflowResponse.data.workflow._id)" -ForegroundColor Yellow
        Write-Host "   Total steps: $($workflowResponse.data.workflow.steps.Count)" -ForegroundColor Yellow
        Write-Host "   Phases: $($workflowResponse.data.workflow.phases.Count)" -ForegroundColor Yellow
        
        # Show first few steps
        Write-Host "   First 3 workflow steps:" -ForegroundColor Yellow
        for ($i = 0; $i -lt [Math]::Min(3, $workflowResponse.data.workflow.steps.Count); $i++) {
            $step = $workflowResponse.data.workflow.steps[$i]
            Write-Host "     $($i+1). $($step.title) (Due: $($step.dueDate))" -ForegroundColor White
        }
    } else {
        Write-Host "   WARNING: No workflow found for project!" -ForegroundColor Red
    }

    # Step 6: Trigger alert check
    Write-Host "`n6. Triggering alert check..." -ForegroundColor Cyan
    $alertCheckResponse = Invoke-RestMethod -Uri "$baseUrl/alerts/check-workflow" -Method POST -Headers $authHeaders
    Write-Host "   Alert check completed!" -ForegroundColor Green
    Write-Host "   Result: $($alertCheckResponse.message)" -ForegroundColor Yellow

    # Step 7: Check for alerts
    Write-Host "`n7. Checking for alerts..." -ForegroundColor Cyan
    $alertsResponse = Invoke-RestMethod -Uri "$baseUrl/alerts" -Method GET -Headers $authHeaders
    Write-Host "   Total alerts found: $($alertsResponse.data.Count)" -ForegroundColor Yellow

    if ($alertsResponse.data.Count -gt 0) {
        Write-Host "   Sample alerts:" -ForegroundColor Yellow
        for ($i = 0; $i -lt [Math]::Min(3, $alertsResponse.data.Count); $i++) {
            $alert = $alertsResponse.data[$i]
            Write-Host "     - $($alert.message) (Priority: $($alert.priority))" -ForegroundColor White
        }
    }

    # Step 8: Get alert statistics
    Write-Host "`n8. Getting alert statistics..." -ForegroundColor Cyan
    $statsResponse = Invoke-RestMethod -Uri "$baseUrl/alerts/stats" -Method GET -Headers $authHeaders
    Write-Host "   Alert Statistics:" -ForegroundColor Yellow
    Write-Host "     Total alerts: $($statsResponse.data.totalAlerts)" -ForegroundColor White
    Write-Host "     Active alerts: $($statsResponse.data.activeAlerts)" -ForegroundColor White
    Write-Host "     High priority: $($statsResponse.data.highPriority)" -ForegroundColor White

    Write-Host "`n=== TEST COMPLETED SUCCESSFULLY! ===" -ForegroundColor Green
    Write-Host "NEXT STEPS:" -ForegroundColor Cyan
    Write-Host "1. Open the frontend at http://localhost:3000" -ForegroundColor White
    Write-Host "2. Login with: admin.test@example.com / AdminTest123" -ForegroundColor White
    Write-Host "3. Go to Projects page and click '+ Add Project'" -ForegroundColor White
    Write-Host "4. Create new projects using the customer: '$($customerResponse.data.customer.name)'" -ForegroundColor White
    Write-Host "5. View alerts by clicking the 'Alerts' button on project cards" -ForegroundColor White
    Write-Host "6. Test the alert filtering and actions in Tasks & Alerts page" -ForegroundColor White

} catch {
    Write-Host "`nERROR: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.Exception.Response) {
        $stream = $_.Exception.Response.GetResponseStream()
        $reader = New-Object System.IO.StreamReader($stream)
        $errorDetails = $reader.ReadToEnd()
        $reader.Close()
        $stream.Close()
        
        if ($errorDetails) {
            Write-Host "Error details: $errorDetails" -ForegroundColor Yellow
            try {
                $errorJson = $errorDetails | ConvertFrom-Json
                if ($errorJson.errors) {
                    Write-Host "Validation errors:" -ForegroundColor Red
                    $errorJson.errors | ForEach-Object {
                        Write-Host "  - $($_.field): $($_.message)" -ForegroundColor Red
                    }
                }
            } catch { }
        }
    }
} 