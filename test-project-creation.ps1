#!/usr/bin/env pwsh

# Test project creation and workflow generation
Write-Host "Testing project creation and alert system..." -ForegroundColor Green

try {
    # Login to get token
    $loginUrl = "http://localhost:5000/api/auth/login"
    $loginData = @{
        email = "test@kenstruction.com"
        password = "password123"
    } | ConvertTo-Json

    $loginResponse = Invoke-RestMethod -Uri $loginUrl -Method POST -Body $loginData -ContentType "application/json"
    $token = $loginResponse.token
    
    Write-Host "✅ Logged in successfully" -ForegroundColor Green

    $headers = @{
        "Authorization" = "Bearer $token"
        "Content-Type" = "application/json"
    }

    # 1. Create a customer if needed
    $customerUrl = "http://localhost:5000/api/customers"
    $customerData = @{
        name = "Alert Test Customer"
        email = "alerttest@example.com"
        phone = "555-999-8888"
        address = "456 Alert Street, Test City, TS 54321"
    } | ConvertTo-Json

    $customerResponse = Invoke-RestMethod -Uri $customerUrl -Method POST -Body $customerData -Headers $headers
    $customerId = $customerResponse.data.customer._id
    
    Write-Host "✅ Customer created: $($customerResponse.data.customer.name)" -ForegroundColor Green
    Write-Host "Customer ID: $customerId" -ForegroundColor Yellow

    # 2. Create a project
    $projectUrl = "http://localhost:5000/api/projects"
    $projectData = @{
        projectName = "Alert System Test Project"
        projectType = "Roof Replacement"
        customer = $customerId
        budget = 25000
        startDate = (Get-Date).AddDays(1).ToString("yyyy-MM-dd")
        endDate = (Get-Date).AddDays(30).ToString("yyyy-MM-dd")
        address = "789 Project Avenue, Construction City, CC 99999"
        priority = "High"
        status = "Pending"
        description = "Test project to verify alert system functionality"
    } | ConvertTo-Json

    $projectResponse = Invoke-RestMethod -Uri $projectUrl -Method POST -Body $projectData -Headers $headers
    $projectId = $projectResponse.data.project._id
    
    Write-Host "✅ Project created successfully!" -ForegroundColor Green
    Write-Host "Project ID: $projectId" -ForegroundColor Yellow
    Write-Host "Project Name: $($projectResponse.data.project.projectName)" -ForegroundColor Yellow

    # 3. Check if workflow was created
    Start-Sleep -Seconds 2  # Give it time to create workflow
    
    $workflowUrl = "http://localhost:5000/api/workflows/project/$projectId"
    $workflowResponse = Invoke-RestMethod -Uri $workflowUrl -Method GET -Headers $headers
    
    if ($workflowResponse.data.workflow) {
        Write-Host "✅ Workflow created successfully!" -ForegroundColor Green
        Write-Host "Workflow ID: $($workflowResponse.data.workflow._id)" -ForegroundColor Yellow
        Write-Host "Steps created: $($workflowResponse.data.workflow.steps.Count)" -ForegroundColor Yellow
        Write-Host "Phases: $($workflowResponse.data.workflow.phases.Count)" -ForegroundColor Yellow
    } else {
        Write-Host "❌ No workflow found for project" -ForegroundColor Red
    }

    # 4. Trigger manual alert check
    $alertCheckUrl = "http://localhost:5000/api/alerts/check-workflow"
    $alertCheckResponse = Invoke-RestMethod -Uri $alertCheckUrl -Method POST -Headers $headers
    
    Write-Host "✅ Manual alert check triggered" -ForegroundColor Green
    Write-Host "Alert check result: $($alertCheckResponse.message)" -ForegroundColor Yellow

    # 5. Check alerts for this project
    $alertsUrl = "http://localhost:5000/api/alerts?project=$projectId"
    $alertsResponse = Invoke-RestMethod -Uri $alertsUrl -Method GET -Headers $headers
    
    Write-Host "✅ Project alerts checked" -ForegroundColor Green
    Write-Host "Alerts found: $($alertsResponse.data.Count)" -ForegroundColor Yellow

    # 6. Get alert statistics
    $statsUrl = "http://localhost:5000/api/alerts/stats"
    $statsResponse = Invoke-RestMethod -Uri $statsUrl -Method GET -Headers $headers
    
    Write-Host "✅ Alert statistics retrieved" -ForegroundColor Green
    Write-Host "Total alerts: $($statsResponse.data.totalAlerts)" -ForegroundColor Yellow
    Write-Host "Active alerts: $($statsResponse.data.activeAlerts)" -ForegroundColor Yellow

    Write-Host "`n🎉 Project creation and alert system test completed successfully!" -ForegroundColor Cyan
    Write-Host "You can now:" -ForegroundColor White
    Write-Host "- Go to the Projects page and see your new project" -ForegroundColor White
    Write-Host "- Click the 'Alerts' button to view workflow alerts" -ForegroundColor White
    Write-Host "- Use the 'Add Project' button to create more projects" -ForegroundColor White
    
} catch {
    Write-Host "❌ Error during test: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "Response: $($_.Exception.Response)" -ForegroundColor Red
} 