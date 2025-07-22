# Test to verify alerts are working after fixes
Write-Host "=== TESTING ALERT GENERATION AFTER FIXES ===" -ForegroundColor Green

$baseUrl = "http://localhost:5000/api"
$headers = @{ "Content-Type" = "application/json" }

try {
    # Login with existing admin user
    Write-Host "`n1. Logging in..." -ForegroundColor Cyan
    $loginData = @{
        email = "admin.test@example.com"
        password = "AdminTest123"
    } | ConvertTo-Json -Depth 2

    $loginResponse = Invoke-RestMethod -Uri "$baseUrl/auth/login" -Method POST -Body $loginData -Headers $headers
    $token = $loginResponse.data.token
    Write-Host "   ✅ Login successful" -ForegroundColor Green

    $authHeaders = @{
        "Content-Type" = "application/json"
        "Authorization" = "Bearer $token"
    }

    # Get existing customer
    Write-Host "`n2. Getting customers..." -ForegroundColor Cyan
    $customersResponse = Invoke-RestMethod -Uri "$baseUrl/customers?limit=5" -Method GET -Headers $authHeaders
    
    if ($customersResponse.data.Count -eq 0) {
        Write-Host "   No customers found - creating one..." -ForegroundColor Yellow
        $customerData = @{
            name = "Alert Test Customer New"
            email = "alerttestnew@example.com"
            phone = "5551112222"
            address = "123 New Alert Street"
        } | ConvertTo-Json
        $customerResponse = Invoke-RestMethod -Uri "$baseUrl/customers" -Method POST -Body $customerData -Headers $authHeaders
        $customerId = $customerResponse.data.customer._id
    } else {
        $customerId = $customersResponse.data[0]._id
    }
    Write-Host "   ✅ Using customer: $customerId" -ForegroundColor Green

    # Create a new project
    Write-Host "`n3. Creating new project..." -ForegroundColor Cyan
    $projectData = @{
        projectName = "Alert Test - $(Get-Date -Format 'yyyy-MM-dd HH:mm')"
        projectType = "Roof Replacement"
        customer = $customerId
        budget = 30000.00
        startDate = (Get-Date).ToString("yyyy-MM-dd")
        endDate = (Get-Date).AddDays(30).ToString("yyyy-MM-dd")
        address = "456 Alert Test Avenue"
        priority = "High"
        status = "Pending"
        description = "Testing alert generation"
    } | ConvertTo-Json -Depth 2

    $projectResponse = Invoke-RestMethod -Uri "$baseUrl/projects" -Method POST -Body $projectData -Headers $authHeaders
    $projectId = $projectResponse.data.project._id
    Write-Host "   ✅ Project created: $($projectResponse.data.project.projectName)" -ForegroundColor Green
    Write-Host "   Project ID: $projectId" -ForegroundColor Yellow

    # Wait a moment for workflow creation
    Write-Host "`n4. Waiting for workflow creation..." -ForegroundColor Cyan
    Start-Sleep -Seconds 3

    # Check workflow exists
    $workflowResponse = Invoke-RestMethod -Uri "$baseUrl/workflows/project/$projectId" -Method GET -Headers $authHeaders
    if ($workflowResponse.data.workflow) {
        Write-Host "   ✅ Workflow created with $($workflowResponse.data.workflow.steps.Count) steps" -ForegroundColor Green
    } else {
        Write-Host "   ❌ No workflow found!" -ForegroundColor Red
        return
    }

    # Manually trigger alert check
    Write-Host "`n5. Triggering alert check..." -ForegroundColor Cyan
    $alertCheckResponse = Invoke-RestMethod -Uri "$baseUrl/alerts/check-workflow" -Method POST -Headers $authHeaders
    Write-Host "   ✅ Alert check triggered" -ForegroundColor Green

    # Check for alerts
    Write-Host "`n6. Checking for alerts..." -ForegroundColor Cyan
    $alertsResponse = Invoke-RestMethod -Uri "$baseUrl/alerts" -Method GET -Headers $authHeaders
    Write-Host "   📊 Total alerts in system: $($alertsResponse.data.Count)" -ForegroundColor Yellow

    # Test the team-members endpoint
    Write-Host "`n7. Testing team-members endpoint..." -ForegroundColor Cyan
    try {
        $teamResponse = Invoke-RestMethod -Uri "$baseUrl/users/team-members" -Method GET -Headers $authHeaders
        Write-Host "   ✅ Team members endpoint working: $($teamResponse.data.teamMembers.Count) members found" -ForegroundColor Green
    } catch {
        Write-Host "   ❌ Team members endpoint failed: $($_.Exception.Message)" -ForegroundColor Red
    }

    # Get alert stats
    Write-Host "`n8. Getting alert statistics..." -ForegroundColor Cyan
    $statsResponse = Invoke-RestMethod -Uri "$baseUrl/alerts/stats" -Method GET -Headers $authHeaders
    Write-Host "   📈 Alert Stats:" -ForegroundColor Yellow
    Write-Host "      Total: $($statsResponse.data.totalAlerts)" -ForegroundColor White
    Write-Host "      Active: $($statsResponse.data.activeAlerts)" -ForegroundColor White

    if ($alertsResponse.data.Count -gt 0) {
        Write-Host "`n🎉 SUCCESS! Alerts are being generated!" -ForegroundColor Green
        Write-Host "Sample alerts:" -ForegroundColor Yellow
        for ($i = 0; $i -lt [Math]::Min(3, $alertsResponse.data.Count); $i++) {
            $alert = $alertsResponse.data[$i]
            Write-Host "   - $($alert.message)" -ForegroundColor White
        }
    } else {
        Write-Host "`n⚠️ No alerts found. This could be normal for very new projects." -ForegroundColor Yellow
        Write-Host "Check the server console for alert generation logs." -ForegroundColor White
    }

    Write-Host "`n✅ Test completed!" -ForegroundColor Green

} catch {
    Write-Host "`n❌ Error: $($_.Exception.Message)" -ForegroundColor Red
} 