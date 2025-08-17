const axios = require('axios');

const API_BASE_URL = 'http://127.0.0.1:5000/api';

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

async function testDashboardAPIs() {
  console.log(`${colors.bright}${colors.blue}=== Testing Dashboard API Endpoints ===${colors.reset}\n`);
  
  const results = {
    passed: [],
    failed: [],
    warnings: []
  };

  // 1. Test Alerts API
  console.log(`${colors.cyan}1. Testing /api/alerts endpoint...${colors.reset}`);
  try {
    const alertsResponse = await axios.get(`${API_BASE_URL}/alerts`, {
      params: { status: 'ACTIVE', limit: 10 }
    });
    
    if (alertsResponse.data.success) {
      const alerts = alertsResponse.data.data || [];
      console.log(`   ✓ Alerts API: ${alerts.length} alerts found`);
      
      // Check field structure
      if (alerts.length > 0) {
        const alert = alerts[0];
        const requiredFields = ['id', 'title', 'message', 'priority', 'status', 'projectId'];
        const missingFields = requiredFields.filter(field => !(field in alert));
        
        if (missingFields.length > 0) {
          results.warnings.push(`Alerts missing fields: ${missingFields.join(', ')}`);
          console.log(`   ${colors.yellow}⚠ Missing fields: ${missingFields.join(', ')}${colors.reset}`);
        } else {
          console.log(`   ✓ All required fields present`);
        }
        
        // Show sample alert structure
        console.log(`   Sample alert fields:`, Object.keys(alert).slice(0, 10).join(', '));
      }
      
      results.passed.push('Alerts API');
    } else {
      results.failed.push('Alerts API - success: false');
    }
  } catch (error) {
    results.failed.push(`Alerts API - ${error.message}`);
    console.log(`   ${colors.red}✗ Error: ${error.message}${colors.reset}`);
  }

  // 2. Test Projects API
  console.log(`\n${colors.cyan}2. Testing /api/projects endpoint...${colors.reset}`);
  try {
    const projectsResponse = await axios.get(`${API_BASE_URL}/projects`, {
      params: { limit: 10 }
    });
    
    if (projectsResponse.data.success) {
      const projects = projectsResponse.data.data || [];
      console.log(`   ✓ Projects API: ${projects.length} projects found`);
      
      // Check field structure
      if (projects.length > 0) {
        const project = projects[0];
        const requiredFields = ['id', 'projectName', 'projectNumber', 'status', 'customerId'];
        const missingFields = requiredFields.filter(field => !(field in project));
        
        if (missingFields.length > 0) {
          results.warnings.push(`Projects missing fields: ${missingFields.join(', ')}`);
          console.log(`   ${colors.yellow}⚠ Missing fields: ${missingFields.join(', ')}${colors.reset}`);
        } else {
          console.log(`   ✓ All required fields present`);
        }
        
        // Check for customer data
        if (project.customer) {
          console.log(`   ✓ Customer data included`);
        } else {
          console.log(`   ${colors.yellow}⚠ No customer data included${colors.reset}`);
        }
        
        // Show sample project structure
        console.log(`   Sample project fields:`, Object.keys(project).slice(0, 10).join(', '));
      }
      
      results.passed.push('Projects API');
    } else {
      results.failed.push('Projects API - success: false');
    }
  } catch (error) {
    results.failed.push(`Projects API - ${error.message}`);
    console.log(`   ${colors.red}✗ Error: ${error.message}${colors.reset}`);
  }

  // 3. Test Project Messages API
  console.log(`\n${colors.cyan}3. Testing /api/project-messages endpoint...${colors.reset}`);
  try {
    const messagesResponse = await axios.get(`${API_BASE_URL}/project-messages`, {
      params: { limit: 10 }
    });
    
    if (messagesResponse.data.success) {
      const messages = messagesResponse.data.data || [];
      console.log(`   ✓ Project Messages API: ${messages.length} messages found`);
      
      // Check field structure
      if (messages.length > 0) {
        const message = messages[0];
        const requiredFields = ['id', 'subject', 'body', 'projectId', 'createdAt'];
        const missingFields = requiredFields.filter(field => !(field in message));
        
        if (missingFields.length > 0) {
          results.warnings.push(`Messages missing fields: ${missingFields.join(', ')}`);
          console.log(`   ${colors.yellow}⚠ Missing fields: ${missingFields.join(', ')}${colors.reset}`);
        } else {
          console.log(`   ✓ All required fields present`);
        }
        
        // Show sample message structure
        console.log(`   Sample message fields:`, Object.keys(message).slice(0, 10).join(', '));
      }
      
      results.passed.push('Project Messages API');
    } else {
      results.failed.push('Project Messages API - success: false');
    }
  } catch (error) {
    results.failed.push(`Project Messages API - ${error.message}`);
    console.log(`   ${colors.red}✗ Error: ${error.message}${colors.reset}`);
  }

  // 4. Test Workflow Data API
  console.log(`\n${colors.cyan}4. Testing /api/workflow-data endpoint...${colors.reset}`);
  try {
    const workflowResponse = await axios.get(`${API_BASE_URL}/workflow-data/phases`);
    
    if (workflowResponse.data.success) {
      const phases = workflowResponse.data.data || [];
      console.log(`   ✓ Workflow Phases API: ${phases.length} phases found`);
      
      // Check phase structure
      if (phases.length > 0) {
        const phase = phases[0];
        console.log(`   Sample phase:`, phase.phaseName || phase.name);
        
        // Check for sections
        if (phase.sections && phase.sections.length > 0) {
          console.log(`   ✓ Phase has ${phase.sections.length} sections`);
          
          // Check for line items
          const section = phase.sections[0];
          if (section.lineItems && section.lineItems.length > 0) {
            console.log(`   ✓ Section has ${section.lineItems.length} line items`);
          }
        }
      }
      
      results.passed.push('Workflow Data API');
    } else {
      results.failed.push('Workflow Data API - success: false');
    }
  } catch (error) {
    results.failed.push(`Workflow Data API - ${error.message}`);
    console.log(`   ${colors.red}✗ Error: ${error.message}${colors.reset}`);
  }

  // 5. Test Users/Team Members API
  console.log(`\n${colors.cyan}5. Testing /api/users/team-members endpoint...${colors.reset}`);
  try {
    const usersResponse = await axios.get(`${API_BASE_URL}/users/team-members`);
    
    if (usersResponse.data.success) {
      const users = usersResponse.data.data?.teamMembers || [];
      console.log(`   ✓ Users API: ${users.length} users found`);
      
      // Check user structure
      if (users.length > 0) {
        const user = users[0];
        const requiredFields = ['id', 'firstName', 'lastName', 'role'];
        const missingFields = requiredFields.filter(field => !(field in user));
        
        if (missingFields.length > 0) {
          results.warnings.push(`Users missing fields: ${missingFields.join(', ')}`);
          console.log(`   ${colors.yellow}⚠ Missing fields: ${missingFields.join(', ')}${colors.reset}`);
        } else {
          console.log(`   ✓ All required fields present`);
        }
        
        // Show sample user
        console.log(`   Sample user: ${user.firstName} ${user.lastName} (${user.role})`);
      }
      
      results.passed.push('Users API');
    } else {
      results.failed.push('Users API - success: false');
    }
  } catch (error) {
    results.failed.push(`Users API - ${error.message}`);
    console.log(`   ${colors.red}✗ Error: ${error.message}${colors.reset}`);
  }

  // 6. Test Project Stats API
  console.log(`\n${colors.cyan}6. Testing /api/projects/stats endpoint...${colors.reset}`);
  try {
    const statsResponse = await axios.get(`${API_BASE_URL}/projects/stats`);
    
    if (statsResponse.data.success) {
      const stats = statsResponse.data.data || {};
      console.log(`   ✓ Project Stats API: Data received`);
      console.log(`   Total Projects: ${stats.totalProjects || 0}`);
      console.log(`   Active Projects: ${stats.activeProjects || 0}`);
      console.log(`   Completed Projects: ${stats.completedProjects || 0}`);
      
      // Check for phase breakdown
      if (stats.projectsByPhase) {
        console.log(`   Projects by Phase:`, stats.projectsByPhase);
      }
      
      results.passed.push('Project Stats API');
    } else {
      results.failed.push('Project Stats API - success: false');
    }
  } catch (error) {
    results.failed.push(`Project Stats API - ${error.message}`);
    console.log(`   ${colors.red}✗ Error: ${error.message}${colors.reset}`);
  }

  // Summary
  console.log(`\n${colors.bright}${colors.blue}=== Test Summary ===${colors.reset}`);
  console.log(`${colors.green}Passed: ${results.passed.length}${colors.reset}`);
  console.log(`${colors.red}Failed: ${results.failed.length}${colors.reset}`);
  console.log(`${colors.yellow}Warnings: ${results.warnings.length}${colors.reset}`);
  
  if (results.passed.length > 0) {
    console.log(`\n${colors.green}✓ Passed Tests:${colors.reset}`);
    results.passed.forEach(test => console.log(`  - ${test}`));
  }
  
  if (results.failed.length > 0) {
    console.log(`\n${colors.red}✗ Failed Tests:${colors.reset}`);
    results.failed.forEach(test => console.log(`  - ${test}`));
  }
  
  if (results.warnings.length > 0) {
    console.log(`\n${colors.yellow}⚠ Warnings:${colors.reset}`);
    results.warnings.forEach(warning => console.log(`  - ${warning}`));
  }

  // Overall status
  const allPassed = results.failed.length === 0;
  console.log(`\n${colors.bright}Overall Status: ${allPassed ? `${colors.green}✓ ALL TESTS PASSED` : `${colors.red}✗ SOME TESTS FAILED`}${colors.reset}`);
  
  return allPassed;
}

// Run the tests
testDashboardAPIs()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error(`${colors.red}Fatal error:${colors.reset}`, error);
    process.exit(1);
  });