# Simple alert test
$token = (Invoke-RestMethod -Uri http://localhost:5000/api/auth/login -Method POST -Body (@{email="admin.test@example.com"; password="AdminTest123"} | ConvertTo-Json) -Headers @{"Content-Type"="application/json"}).data.token

Write-Host "1. Triggering alert check..."
Invoke-RestMethod -Uri http://localhost:5000/api/alerts/check-workflow -Method POST -Headers @{"Authorization"="Bearer $token"; "Content-Type"="application/json"} | Out-Null

Write-Host "2. Checking alerts..."
$alerts = (Invoke-RestMethod -Uri http://localhost:5000/api/alerts -Method GET -Headers @{"Authorization"="Bearer $token"; "Content-Type"="application/json"})
Write-Host "   Total alerts: $($alerts.data.Count)"

if ($alerts.data.Count -gt 0) {
    Write-Host "   First alert: $($alerts.data[0].message)"
} else {
    Write-Host "   No alerts found. Let me check team members..."
    $team = (Invoke-RestMethod -Uri http://localhost:5000/api/users/team-members -Method GET -Headers @{"Authorization"="Bearer $token"; "Content-Type"="application/json"})
    Write-Host "   Team members: $($team.data.teamMembers.Count)"
    
    Write-Host "   Let me try to create a simple project and see if workflow creates alerts..."
    # Get a customer
    $customer = (Invoke-RestMethod -Uri http://localhost:5000/api/customers?limit=1 -Method GET -Headers @{"Authorization"="Bearer $token"; "Content-Type"="application/json"}).data[0]
    
    # Create project
    $projectData = @{
        projectName = "Simple Alert Test $(Get-Date -Format 'HH:mm:ss')"
        projectType = "Roof Replacement"
        customer = $customer._id
        budget = 25000
        startDate = (Get-Date).ToString("yyyy-MM-dd")
        endDate = (Get-Date).AddDays(30).ToString("yyyy-MM-dd")
        address = "123 Test St"
        priority = "High"
        status = "Pending"
        description = "Testing alerts"
    } | ConvertTo-Json
    
    $project = (Invoke-RestMethod -Uri http://localhost:5000/api/projects -Method POST -Body $projectData -Headers @{"Authorization"="Bearer $token"; "Content-Type"="application/json"})
    Write-Host "   Created project: $($project.data.project.projectName)"
    
    Start-Sleep -Seconds 2
    
    # Trigger alert check again
    Write-Host "   Triggering alert check for new project..."
    Invoke-RestMethod -Uri http://localhost:5000/api/alerts/check-workflow -Method POST -Headers @{"Authorization"="Bearer $token"; "Content-Type"="application/json"} | Out-Null
    
    $alerts2 = (Invoke-RestMethod -Uri http://localhost:5000/api/alerts -Method GET -Headers @{"Authorization"="Bearer $token"; "Content-Type"="application/json"})
    Write-Host "   Alerts after new project: $($alerts2.data.Count)"
    
    if ($alerts2.data.Count -gt 0) {
        Write-Host "   SUCCESS! Alert: $($alerts2.data[0].message)"
    }
} 